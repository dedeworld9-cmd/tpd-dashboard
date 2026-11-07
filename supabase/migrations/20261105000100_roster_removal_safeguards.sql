-- Roster removal safeguards.
-- A roster read that is incomplete (truncated sheet, partial API response, someone mid-edit) must never be able to
-- mark real members as "former". From here on a member who is missing from a snapshot stays active and is only
-- tracked as a removal candidate, until ONE of these happens:
--   (a) explicit approval: a command user applies with the removals approved (the function receives their Discord IDs
--       in approved_removals; the edge function only does that after a preview of the same snapshot), or
--   (b) the member has been absent from 3 separate applied snapshots, each at least 6 hours after the previous one.
--       Only snapshots that passed every validation guard are applied, so previews, rejected and failed runs never count.
-- A member who reappears in any snapshot loses their candidate record. Additions and ordinary updates are unchanged.
-- Apply after 20261105000000. Safe to re-run.

create table if not exists tpd.removal_candidates (
  discord_id text primary key check (discord_id ~ '^[0-9]{17,20}$'),
  first_absent_at timestamptz not null default now(),
  last_absent_at timestamptz not null default now(),
  observations int not null default 1 check (observations >= 1),
  last_run_id uuid
);
alter table tpd.removal_candidates enable row level security;
revoke all on tpd.removal_candidates from public, anon, authenticated;
grant select on tpd.removal_candidates to authenticated;
grant all on tpd.removal_candidates to service_role;
drop policy if exists removal_candidates_command on tpd.removal_candidates;
create policy removal_candidates_command on tpd.removal_candidates for select to authenticated using (tpd.is_command());

-- The two-argument version is replaced (not overloaded) so PostgREST can never resolve to the old behaviour.
drop function if exists tpd.apply_roster_snapshot(jsonb, uuid);

create or replace function tpd.apply_roster_snapshot(
  snapshot jsonb,
  run_id uuid,
  approved_removals text[] default '{}',
  min_observations int default 3,
  min_gap interval default interval '6 hours'
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb;
  pos jsonb;
  slot jsonb;
  gone record;
  obs int;
  seen text[] := '{}';
  removed int := 0;
  pending int := 0;
  upserted int := 0;
begin
  if jsonb_typeof(snapshot -> 'members') <> 'array' or jsonb_typeof(snapshot -> 'positions') <> 'array' then
    raise exception 'malformed snapshot';
  end if;
  if jsonb_array_length(snapshot -> 'positions') = 0 then
    raise exception 'snapshot has no positions; refusing to apply';
  end if;
  if jsonb_array_length(snapshot -> 'members') = 0 then
    raise exception 'snapshot has no members; refusing to apply';
  end if;
  if min_observations < 2 then
    raise exception 'min_observations must be at least 2';
  end if;

  -- Call signs move between members (promotions, transfers): release them all,
  -- then reassign from the snapshot, so a swap never trips the unique constraint.
  update tpd.personnel set callsign = null where callsign is not null;

  for m in select * from jsonb_array_elements(snapshot -> 'members') loop
    if (m ->> 'discordId') = any (seen) then
      raise exception 'duplicate Discord ID in snapshot; refusing to apply';
    end if;
    insert into tpd.personnel (discord_id, name, callsign, rank, appointment, tier, district, timezone, status, last_seen_at, updated_at)
    values (m ->> 'discordId', m ->> 'name', nullif(m ->> 'callsign', ''), m ->> 'rank', coalesce(m ->> 'appointment', ''), m ->> 'tier', m ->> 'district', m ->> 'timezone', 'active', now(), now())
    on conflict (discord_id) do update set
      name = excluded.name, callsign = excluded.callsign, rank = excluded.rank, appointment = excluded.appointment,
      tier = excluded.tier, district = excluded.district, timezone = excluded.timezone,
      -- a suspension recorded here is not lifted by the roster; only 'former' returns to active
      status = case when tpd.personnel.status in ('former', 'active') then 'active' else tpd.personnel.status end,
      last_seen_at = now(),
      updated_at = case when (tpd.personnel.name, tpd.personnel.rank, tpd.personnel.appointment, tpd.personnel.district)
        is distinct from (excluded.name, excluded.rank, excluded.appointment, excluded.district) then now() else tpd.personnel.updated_at end;
    seen := seen || (m ->> 'discordId');
    upserted := upserted + 1;
  end loop;

  -- Anyone listed again is no longer a removal candidate (the streak must be consecutive).
  delete from tpd.removal_candidates where discord_id = any (seen);

  -- Members missing from this snapshot.
  for gone in select discord_id from tpd.personnel where status <> 'former' and not (discord_id = any (seen)) loop
    if gone.discord_id = any (coalesce(approved_removals, '{}')) then
      obs := min_observations; -- explicit approval by a command user
    else
      insert into tpd.removal_candidates as rc (discord_id, first_absent_at, last_absent_at, observations, last_run_id)
      values (gone.discord_id, now(), now(), 1, run_id)
      on conflict (discord_id) do update set
        observations = case when rc.last_run_id is distinct from run_id and now() - rc.last_absent_at >= min_gap then rc.observations + 1 else rc.observations end,
        last_absent_at = case when rc.last_run_id is distinct from run_id and now() - rc.last_absent_at >= min_gap then now() else rc.last_absent_at end,
        last_run_id = run_id
      returning rc.observations into obs;
    end if;
    if obs >= min_observations then
      update tpd.personnel set status = 'former', updated_at = now() where discord_id = gone.discord_id;
      delete from tpd.removal_candidates where discord_id = gone.discord_id;
      removed := removed + 1;
    else
      pending := pending + 1;
    end if;
  end loop;
  -- Candidates that are no longer active members (already former, or deleted by hand) are cleaned up.
  delete from tpd.removal_candidates c where not exists (select 1 from tpd.personnel p where p.discord_id = c.discord_id and p.status <> 'former');

  -- WHERE true: PostgREST sessions run with pg-safeupdate, which rejects unqualified DELETE even inside a function.
  delete from tpd.positions where true;
  for pos in select * from jsonb_array_elements(snapshot -> 'positions') loop
    insert into tpd.positions (ord, callsign, rank, appointment, tier, district, personnel_id)
    values ((pos ->> 'ord')::int, nullif(pos ->> 'callsign', ''), pos ->> 'rank', pos ->> 'appointment', pos ->> 'tier', pos ->> 'district',
      (select id from tpd.personnel where discord_id = pos ->> 'discordId'));
  end loop;

  delete from tpd.division_slots where true;
  for slot in select * from jsonb_array_elements(coalesce(snapshot -> 'divisionSlots', '[]'::jsonb)) loop
    insert into tpd.division_slots (callsign, division_slug, role, title, personnel_id)
    values (slot ->> 'callsign', slot ->> 'division', slot ->> 'role', slot ->> 'title',
      (select id from tpd.personnel where discord_id = slot ->> 'discordId'));
  end loop;

  insert into tpd.audit_log (actor, action, target, detail)
  values ('system:roster-sync', 'roster.applied', run_id::text, jsonb_build_object('members', upserted, 'markedFormer', removed, 'pendingRemoval', pending));

  return jsonb_build_object('members', upserted, 'markedFormer', removed, 'pendingRemoval', pending);
end
$$;

revoke all on function tpd.apply_roster_snapshot(jsonb, uuid, text[], int, interval) from public, anon, authenticated;
grant execute on function tpd.apply_roster_snapshot(jsonb, uuid, text[], int, interval) to service_role;
