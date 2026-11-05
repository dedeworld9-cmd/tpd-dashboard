-- Phase 3: corrections and manual reviews. Originals remain immutable.
create table if not exists tpd.patrol_corrections (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references tpd.patrol_sessions(id) on delete restrict,
 requester_id uuid not null references tpd.personnel(id) on delete restrict,
 proposed_started_at timestamptz not null,
 proposed_ended_at timestamptz not null,
 reason text not null check (length(btrim(reason)) between 15 and 2000),
 status text not null default 'pending' check(status in ('pending','approved','denied')),
 reviewer_id uuid references tpd.personnel(id),
 reviewer_reason text,
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 check (proposed_ended_at > proposed_started_at),
 check (proposed_ended_at - proposed_started_at <= interval '12 hours'),
 check ((status = 'pending' and reviewer_id is null and reviewed_at is null)
     or (status in ('approved','denied') and reviewer_id is not null and reviewed_at is not null and length(btrim(reviewer_reason)) >= 10))
);
create unique index if not exists patrol_one_pending_correction on tpd.patrol_corrections(session_id) where status='pending';
create index if not exists patrol_corrections_requester on tpd.patrol_corrections(requester_id,created_at desc);
alter table tpd.patrol_corrections enable row level security;
revoke all on tpd.patrol_corrections from public,anon,authenticated;
grant select on tpd.patrol_corrections to authenticated;
drop policy if exists patrol_corrections_read on tpd.patrol_corrections;
create policy patrol_corrections_read on tpd.patrol_corrections for select to authenticated using (
 requester_id = (select id from tpd.personnel where discord_id = tpd.current_discord_id() and status = 'active')
 or (tpd.is_active_member() and exists (
   select 1 from tpd.personnel p where p.discord_id = tpd.current_discord_id()
   and p.status='active' and tpd.rank_at_least(p.rank,'Sergeant')
 ))
);

create or replace function tpd.request_patrol_correction(p_session_id uuid,p_started_at timestamptz,p_ended_at timestamptz,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor_id uuid; result_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select id into actor_id from tpd.personnel where discord_id=tpd.current_discord_id() and status='active';
 if actor_id is null then raise exception 'Active TPD membership required' using errcode='42501'; end if;
 if not exists (select 1 from tpd.patrol_sessions where id=p_session_id and personnel_id=actor_id and ended_at is not null) then
  raise exception 'Only your completed patrols can be corrected' using errcode='42501';
 end if;
 if p_started_at is null or p_ended_at is null or p_started_at > now() or p_ended_at > now() or
    p_ended_at <= p_started_at or p_ended_at - p_started_at > interval '12 hours' then
  raise exception 'Invalid proposed times' using errcode='22023';
 end if;
 if p_reason is null or length(btrim(p_reason)) not between 15 and 2000 then
  raise exception 'A detailed reason is required' using errcode='22023';
 end if;
 insert into tpd.patrol_corrections(session_id,requester_id,proposed_started_at,proposed_ended_at,reason)
 values(p_session_id,actor_id,p_started_at,p_ended_at,btrim(p_reason)) returning id into result_id;
 insert into tpd.audit_log(actor,action,target,detail)
 values(tpd.current_discord_id(),'patrol.correction_requested',result_id::text,jsonb_build_object('session_id',p_session_id));
 return result_id;
end $$;
revoke all on function tpd.request_patrol_correction(uuid,timestamptz,timestamptz,text) from public,anon;
grant execute on function tpd.request_patrol_correction(uuid,timestamptz,timestamptz,text) to authenticated;

create or replace function tpd.review_patrol_correction(p_correction_id uuid,p_approve boolean,p_reason text)
returns text language plpgsql security definer set search_path='' as $$
declare actor_id uuid; member_rank text; req tpd.patrol_corrections%rowtype; verdict text;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select id,rank into actor_id,member_rank from tpd.personnel
 where discord_id=tpd.current_discord_id() and status='active';
 if actor_id is null or not tpd.rank_at_least(member_rank,'Sergeant') then
  raise exception 'Supervisor rank required' using errcode='42501';
 end if;
 if p_reason is null or length(btrim(p_reason)) < 10 then
  raise exception 'Review justification required' using errcode='22023';
 end if;
 select * into req from tpd.patrol_corrections where id=p_correction_id for update;
 if not found then raise exception 'Correction not found' using errcode='22023'; end if;
 if req.requester_id=actor_id then raise exception 'Self-approval is not permitted' using errcode='42501'; end if;
 if req.status<>'pending' then raise exception 'Already reviewed' using errcode='22023'; end if;
 verdict := case when p_approve then 'approved' else 'denied' end;
 update tpd.patrol_corrections set status=verdict,reviewer_id=actor_id,reviewer_reason=btrim(p_reason),reviewed_at=now()
 where id=p_correction_id;
 insert into tpd.audit_log(actor,action,target,detail)
 values(tpd.current_discord_id(),'patrol.correction_'||verdict,p_correction_id::text,jsonb_build_object('session_id',req.session_id));
 return verdict;
end $$;
revoke all on function tpd.review_patrol_correction(uuid,boolean,text) from public,anon;
grant execute on function tpd.review_patrol_correction(uuid,boolean,text) to authenticated;
-- Approval never edits the original patrol record. Reporting must explicitly
-- choose approved correction timestamps, excluding sessions awaiting review.
-- Stale sessions remain active until the owner/command closes them; no scheduler enabled.
