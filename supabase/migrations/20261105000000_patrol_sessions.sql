-- Phase 2: persistent patrol sessions (development migration; not yet applied).
-- Officer identity is always derived from Supabase Auth, never supplied by the browser.
create table if not exists tpd.patrol_sessions (
  id uuid primary key default gen_random_uuid(),
  personnel_id uuid not null references tpd.personnel(id) on delete restrict,
  district text not null check (district in ('North','South')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  review_required boolean not null default false,
  constraint patrol_end_after_start check (ended_at is null or ended_at >= started_at)
);
create unique index if not exists patrol_one_open_per_member
  on tpd.patrol_sessions(personnel_id) where ended_at is null;
create index if not exists patrol_member_recent
  on tpd.patrol_sessions(personnel_id, started_at desc);

alter table tpd.patrol_sessions enable row level security;
revoke all on tpd.patrol_sessions from public, anon, authenticated;
grant select on tpd.patrol_sessions to authenticated;
drop policy if exists patrol_read_own on tpd.patrol_sessions;
create policy patrol_read_own on tpd.patrol_sessions for select
  to authenticated using (
    personnel_id = (select p.id from tpd.personnel p
      where p.discord_id = (select tpd.current_discord_id())
      and p.status = 'active')
  );

-- All mutations are SECURITY DEFINER RPCs with a locked search path.
-- REVOKE/GRANT is mandatory because Postgres grants function EXECUTE to PUBLIC by default.
create or replace function tpd.start_patrol(p_district text)
returns jsonb language plpgsql security definer
set search_path = ''
as $$
declare
  v_member tpd.personnel%rowtype;
  v_session tpd.patrol_sessions%rowtype;
begin
  if auth.uid() is null or tpd.current_discord_id() is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  select * into v_member from tpd.personnel
  where discord_id=tpd.current_discord_id() and status='active';
  if not found then
    raise exception 'Active roster membership required' using errcode='42501';
  end if;
  -- Independent patrol clearance for probationary officers requires an
  -- explicit training record; Phase 2 does not create that grant.
  if v_member.rank = 'Probationary Officer' then
    raise exception 'Independent patrol approval required' using errcode='42501';
  end if;
  if p_district is null or p_district not in ('North','South') then
    raise exception 'Select North or South district' using errcode='22023';
  end if;

  -- Serialize starts for this member. Independent of browser tabs/devices.
  perform pg_advisory_xact_lock(hashtextextended(v_member.id::text, 89321));
  select * into v_session from tpd.patrol_sessions
  where personnel_id=v_member.id and ended_at is null for update;
  if found then
    return jsonb_build_object('id',v_session.id,'district',v_session.district,
      'started_at',v_session.started_at,'ended_at',v_session.ended_at,
      'review_required',v_session.review_required,'reused',true);
  end if;
  insert into tpd.patrol_sessions(personnel_id,district)
    values(v_member.id,p_district) returning * into v_session;
  insert into tpd.audit_log(actor,action,target,detail)
    values(tpd.current_discord_id(),'patrol.started',v_session.id::text,
      jsonb_build_object('district',v_session.district));
  return jsonb_build_object('id',v_session.id,'district',v_session.district,
    'started_at',v_session.started_at,'ended_at',v_session.ended_at,
    'review_required',v_session.review_required,'reused',false);
end $$;
revoke all on function tpd.start_patrol(text) from public, anon;
grant execute on function tpd.start_patrol(text) to authenticated;

create or replace function tpd.end_patrol(p_session_id uuid)
returns jsonb language plpgsql security definer
set search_path = ''
as $$
declare
  v_member tpd.personnel%rowtype;
  v_session tpd.patrol_sessions%rowtype;
begin
  if auth.uid() is null or tpd.current_discord_id() is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  select * into v_member from tpd.personnel
  where discord_id=tpd.current_discord_id() and status='active';
  if not found then
    raise exception 'Active roster membership required' using errcode='42501';
  end if;
  select * into v_session from tpd.patrol_sessions
  where id=p_session_id and personnel_id=v_member.id for update;
  if not found then
    raise exception 'Patrol session not found' using errcode='42501';
  end if;
  if v_session.ended_at is null then
    update tpd.patrol_sessions
    set ended_at=now(),
        review_required=(now()-started_at > interval '12 hours')
    where id=v_session.id returning * into v_session;
    insert into tpd.audit_log(actor,action,target,detail)
    values(tpd.current_discord_id(),'patrol.ended',v_session.id::text,
      jsonb_build_object('review_required',v_session.review_required));
  end if;
  return jsonb_build_object('id',v_session.id,'district',v_session.district,
    'started_at',v_session.started_at,'ended_at',v_session.ended_at,
    'review_required',v_session.review_required);
end $$;
revoke all on function tpd.end_patrol(uuid) from public, anon;
grant execute on function tpd.end_patrol(uuid) to authenticated;

-- Subsequent migration: correction requests and supervisor approval with
-- immutable originals. No automatic quota compliance before PC-14 is resolved.
