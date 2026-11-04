-- TPD HQ: personnel identity, roster sync and integration status.
--
-- Authority model
--   * The official Google Sheet roster is the source of truth. Rows here are
--     written ONLY by the roster-sync Edge Function (service role) through
--     apply_roster_snapshot(). Signed-in users have no insert/update/delete
--     rights on any table in this file.
--   * A signed-in user is matched to personnel by the Discord user ID that
--     Supabase Auth stored in auth.identities (provider 'discord'). That value
--     comes from Discord's OAuth response and cannot be edited by the user,
--     unlike auth.users.raw_user_meta_data, which is never trusted here.
--   * Command access (interim rule PC-08: Captain and above) is decided by
--     the verified roster rank, never by a Discord role or client state.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- ranks

create table public.ranks (
  name text primary key,
  seniority int not null unique -- lower = more senior; Reserve Officer handled in rank_at_least()
);

insert into public.ranks (name, seniority) values
  ('Chief of Police', 0), ('Deputy Chief', 1), ('Assistant Chief', 2), ('Major', 3), ('Captain', 4),
  ('Lieutenant', 5), ('Sergeant', 6), ('Corporal', 7), ('Senior Officer', 8), ('Officer', 9),
  ('Reserve Officer', 10), ('Probationary Officer', 11);

-- ------------------------------------------------------------ personnel

create table public.personnel (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null unique check (discord_id ~ '^[0-9]{17,20}$'), -- text: snowflakes exceed float precision
  name text not null,
  callsign text unique,
  rank text not null references public.ranks (name),
  appointment text not null default '',
  tier text not null,
  district text check (district in ('North', 'South')),
  timezone text,
  -- active: on the current roster. former: was on the roster, no longer listed.
  -- suspended / inactive: reserved for statuses the roster does not carry yet.
  status text not null default 'active' check (status in ('active', 'suspended', 'inactive', 'former')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every authorized position, filled or vacant. Vacant slots never create personnel.
create table public.positions (
  ord int primary key,
  callsign text unique,
  rank text not null references public.ranks (name),
  appointment text not null,
  tier text not null,
  district text check (district in ('North', 'South')),
  personnel_id uuid references public.personnel (id) on delete set null
);

create table public.division_slots (
  callsign text primary key,
  division_slug text not null,
  role text not null,
  title text not null,
  personnel_id uuid references public.personnel (id) on delete set null
);

-- --------------------------------------------------------- sync + audit

create table public.roster_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger text not null check (trigger in ('scheduled', 'manual', 'preview')),
  actor_discord_id text,
  status text not null default 'running' check (status in ('running', 'applied', 'no_changes', 'preview', 'rejected', 'failed')),
  source_hash text,
  counts jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  changes jsonb not null default '[]'::jsonb
);
create index on public.roster_sync_runs (started_at desc);

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null, -- 'system:roster-sync', or 'discord:<id>'
  action text not null,
  target text,
  detail jsonb not null default '{}'::jsonb
);
create index on public.audit_log (at desc);

-- Explicit Discord role mapping. A role grants nothing on its own: it is used
-- only to compare against the roster (supporting verification).
create table public.discord_role_map (
  role_id text primary key check (role_id ~ '^[0-9]{17,20}$'),
  role_name text not null,
  maps_to_kind text not null check (maps_to_kind in ('member', 'rank', 'division', 'ignore')),
  maps_to_value text,
  confirmed_by text, -- who confirmed the mapping; unconfirmed rows are reported, not enforced
  confirmed_at timestamptz
);

create table public.discord_verifications (
  personnel_id uuid primary key references public.personnel (id) on delete cascade,
  checked_at timestamptz not null default now(),
  in_guild boolean,
  role_ids text[] not null default '{}',
  findings jsonb not null default '[]'::jsonb
);

create table public.integration_status (
  integration text primary key check (integration in ('discord_oauth', 'discord_bot', 'google_sheets', 'anchorcad')),
  status text not null check (status in ('connected', 'not_configured', 'verification_required', 'degraded', 'failed', 'unsupported')),
  detail jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_error text,
  last_error_at timestamptz
);

-- --------------------------------------------------------------- helpers

-- The Discord user ID of the signed-in user, from Supabase Auth's identity record.
create or replace function public.current_discord_id() returns text
language sql stable security definer set search_path = '' as $$
  select i.provider_id from auth.identities i
  where i.user_id = auth.uid() and i.provider = 'discord'
  order by i.created_at limit 1
$$;

create or replace function public.rank_at_least(r text, min_rank text) returns boolean
language sql immutable set search_path = '' as $$
  select case
    when r = 'Reserve Officer' then min_rank in ('Reserve Officer', 'Probationary Officer')
    else (select seniority from public.ranks where name = r) <= (select seniority from public.ranks where name = min_rank)
  end
$$;

create or replace function public.current_personnel() returns public.personnel
language sql stable security definer set search_path = '' as $$
  select p.* from public.personnel p where p.discord_id = public.current_discord_id()
$$;

create or replace function public.is_active_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.status = 'active' from public.personnel p where p.discord_id = public.current_discord_id()), false)
$$;

-- INTERIM (PC-08): Command Center and integrations for Captain and above. Mirrors src/lib/authz "command.view".
create or replace function public.is_command() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select p.status = 'active' and public.rank_at_least(p.rank, 'Captain')
    from public.personnel p where p.discord_id = public.current_discord_id()
  ), false)
$$;

-- What the website shows a signed-in user about themself.
create or replace function public.my_membership() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  did text := public.current_discord_id();
  me public.personnel;
  last_sync timestamptz;
begin
  select max(finished_at) into last_sync from public.roster_sync_runs where status in ('applied', 'no_changes');
  if auth.uid() is null then
    return jsonb_build_object('state', 'signed_out');
  end if;
  if did is null then
    return jsonb_build_object('state', 'pending_verification', 'reason', 'no_discord_identity');
  end if;
  if last_sync is null then
    return jsonb_build_object('state', 'unavailable', 'reason', 'roster_not_imported');
  end if;
  select * into me from public.personnel where discord_id = did;
  if not found then
    return jsonb_build_object('state', 'unrecognized', 'last_sync_at', last_sync);
  end if;
  return jsonb_build_object(
    'state', case me.status when 'active' then 'verified' when 'former' then 'former' else 'inactive' end,
    'last_sync_at', last_sync,
    'member', jsonb_build_object(
      'name', me.name, 'callsign', me.callsign, 'rank', me.rank, 'appointment', me.appointment,
      'tier', me.tier, 'district', me.district, 'timezone', me.timezone, 'status', me.status,
      'divisions', coalesce((
        select jsonb_agg(jsonb_build_object('division', s.division_slug, 'callsign', s.callsign, 'role', s.role, 'title', s.title) order by s.callsign)
        from public.division_slots s where s.personnel_id = me.id
      ), '[]'::jsonb)
    )
  );
end
$$;

-- Directory for verified members: no Discord IDs, no timezones.
create view public.personnel_directory with (security_barrier) as
  select p.id, p.name, p.callsign, p.rank, p.appointment, p.tier, p.district, p.status
  from public.personnel p
  where p.status = 'active' and public.is_active_member();

-- ------------------------------------------------- snapshot application

-- Applies a validated roster snapshot atomically. Called only by the
-- roster-sync Edge Function with the service role. If anything fails, the
-- whole transaction rolls back and the previous snapshot stays in place.
create or replace function public.apply_roster_snapshot(snapshot jsonb, run_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb;
  pos jsonb;
  slot jsonb;
  seen text[] := '{}';
  removed int := 0;
  upserted int := 0;
begin
  if jsonb_typeof(snapshot -> 'members') <> 'array' or jsonb_typeof(snapshot -> 'positions') <> 'array' then
    raise exception 'malformed snapshot';
  end if;
  if jsonb_array_length(snapshot -> 'positions') = 0 then
    raise exception 'snapshot has no positions; refusing to apply';
  end if;

  -- Call signs move between members (promotions, transfers): release them all,
  -- then reassign from the snapshot, so a swap never trips the unique constraint.
  update public.personnel set callsign = null where callsign is not null;

  for m in select * from jsonb_array_elements(snapshot -> 'members') loop
    insert into public.personnel (discord_id, name, callsign, rank, appointment, tier, district, timezone, status, last_seen_at, updated_at)
    values (m ->> 'discordId', m ->> 'name', nullif(m ->> 'callsign', ''), m ->> 'rank', coalesce(m ->> 'appointment', ''), m ->> 'tier', m ->> 'district', m ->> 'timezone', 'active', now(), now())
    on conflict (discord_id) do update set
      name = excluded.name, callsign = excluded.callsign, rank = excluded.rank, appointment = excluded.appointment,
      tier = excluded.tier, district = excluded.district, timezone = excluded.timezone,
      -- a suspension recorded here is not lifted by the roster; only 'former' returns to active
      status = case when public.personnel.status in ('former', 'active') then 'active' else public.personnel.status end,
      last_seen_at = now(),
      updated_at = case when (public.personnel.name, public.personnel.rank, public.personnel.appointment, public.personnel.district)
        is distinct from (excluded.name, excluded.rank, excluded.appointment, excluded.district) then now() else public.personnel.updated_at end;
    seen := seen || (m ->> 'discordId');
    upserted := upserted + 1;
  end loop;

  with gone as (
    update public.personnel set status = 'former', updated_at = now()
    where status <> 'former' and not (discord_id = any (seen)) returning 1
  ) select count(*) into removed from gone;

  delete from public.positions;
  for pos in select * from jsonb_array_elements(snapshot -> 'positions') loop
    insert into public.positions (ord, callsign, rank, appointment, tier, district, personnel_id)
    values ((pos ->> 'ord')::int, nullif(pos ->> 'callsign', ''), pos ->> 'rank', pos ->> 'appointment', pos ->> 'tier', pos ->> 'district',
      (select id from public.personnel where discord_id = pos ->> 'discordId'));
  end loop;

  delete from public.division_slots;
  for slot in select * from jsonb_array_elements(coalesce(snapshot -> 'divisionSlots', '[]'::jsonb)) loop
    insert into public.division_slots (callsign, division_slug, role, title, personnel_id)
    values (slot ->> 'callsign', slot ->> 'division', slot ->> 'role', slot ->> 'title',
      (select id from public.personnel where discord_id = slot ->> 'discordId'));
  end loop;

  insert into public.audit_log (actor, action, target, detail)
  values ('system:roster-sync', 'roster.applied', run_id::text, jsonb_build_object('members', upserted, 'markedFormer', removed));

  return jsonb_build_object('members', upserted, 'markedFormer', removed);
end
$$;

revoke all on function public.apply_roster_snapshot(jsonb, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- RLS

alter table public.ranks enable row level security;
alter table public.personnel enable row level security;
alter table public.positions enable row level security;
alter table public.division_slots enable row level security;
alter table public.roster_sync_runs enable row level security;
alter table public.audit_log enable row level security;
alter table public.discord_role_map enable row level security;
alter table public.discord_verifications enable row level security;
alter table public.integration_status enable row level security;

create policy ranks_read on public.ranks for select to authenticated using (true);

-- Own record always; full records (including Discord IDs) only for command.
create policy personnel_self on public.personnel for select to authenticated using (discord_id = public.current_discord_id());
create policy personnel_command on public.personnel for select to authenticated using (public.is_command());

create policy positions_members on public.positions for select to authenticated using (public.is_active_member());
create policy division_slots_members on public.division_slots for select to authenticated using (public.is_active_member());

create policy sync_runs_command on public.roster_sync_runs for select to authenticated using (public.is_command());
create policy audit_command on public.audit_log for select to authenticated using (public.is_command());
create policy role_map_command on public.discord_role_map for select to authenticated using (public.is_command());
create policy verifications_self on public.discord_verifications for select to authenticated
  using (personnel_id = (select id from public.personnel where discord_id = public.current_discord_id()));
create policy verifications_command on public.discord_verifications for select to authenticated using (public.is_command());
create policy integration_status_command on public.integration_status for select to authenticated using (public.is_command());

-- No write policies exist for anon or authenticated: every write goes through
-- the service role inside Edge Functions after a server-side permission check.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on all tables in schema public from anon;
grant select on public.personnel_directory to authenticated;
grant execute on function public.my_membership(), public.is_command(), public.is_active_member() to authenticated;

-- Number of completed Discord sign-ins (for the integration panel). Service role only.
create or replace function public.discord_identity_count() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from auth.identities where provider = 'discord'
$$;
revoke all on function public.discord_identity_count() from public, anon, authenticated;
