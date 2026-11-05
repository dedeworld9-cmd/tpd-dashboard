-- Phase 6: immutable independent-patrol decisions and roster-change proposals.
-- Google Sheets remains authoritative for rank, assignment, district and status.
create table if not exists tpd.independent_patrol_decisions (
 id uuid primary key default gen_random_uuid(),
 trainee_id uuid not null references tpd.personnel(id) on delete restrict,
 decision text not null check(decision in ('approved','revoked')),
 reason text not null check(length(btrim(reason)) between 15 and 2000),
 decided_by uuid not null references tpd.personnel(id) on delete restrict,
 decided_at timestamptz not null default now()
);
create index if not exists clearance_latest on tpd.independent_patrol_decisions(trainee_id,decided_at desc,id desc);
alter table tpd.independent_patrol_decisions enable row level security;
revoke all on tpd.independent_patrol_decisions from public,anon,authenticated;
grant select on tpd.independent_patrol_decisions to authenticated;
drop policy if exists clearance_read on tpd.independent_patrol_decisions;
create policy clearance_read on tpd.independent_patrol_decisions for select to authenticated using (
 trainee_id=(select p.id from tpd.personnel p where p.discord_id=tpd.current_discord_id() and p.status='active')
 or tpd.is_training_authority()
);

create or replace function tpd.has_independent_clearance(p_personnel_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((
   select d.decision='approved'
   from tpd.independent_patrol_decisions d
   where d.trainee_id=p_personnel_id
   order by d.decided_at desc,d.id desc limit 1
 ),false)
$$;
-- Internal helper: browsers must not enumerate other users' clearances.
revoke all on function tpd.has_independent_clearance(uuid) from public,anon,authenticated;
grant execute on function tpd.has_independent_clearance(uuid) to service_role;

create or replace function tpd.record_independent_clearance(p_trainee_id uuid,p_approve boolean,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor_id uuid; trainee tpd.personnel%rowtype; prior text; record_id uuid;
begin
 if auth.uid() is null or not tpd.is_training_authority() then
  raise exception 'Office of the Chiefs authorization required' using errcode='42501';
 end if;
 select id into actor_id from tpd.personnel where discord_id=tpd.current_discord_id() and status='active';
 if actor_id is null or actor_id=p_trainee_id then raise exception 'Self-approval prohibited' using errcode='42501'; end if;
 if p_reason is null or length(btrim(p_reason)) not between 15 and 2000 then
  raise exception 'Record a detailed justification' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_trainee_id::text, 93245));
 select * into trainee from tpd.personnel where id=p_trainee_id for update;
 if not found or trainee.status<>'active' then raise exception 'Active trainee required' using errcode='22023'; end if;
 select d.decision into prior from tpd.independent_patrol_decisions d
 where d.trainee_id=p_trainee_id order by d.decided_at desc,d.id desc limit 1;
 if p_approve then
  if trainee.rank<>'Probationary Officer' then
   raise exception 'Only probationary officers require initial clearance' using errcode='22023';
  end if;
  if (select count(distinct module_key) from tpd.training_signoffs where trainee_id=p_trainee_id) <> 6 then
   raise exception 'All six training modules must be signed off first' using errcode='22023';
  end if;
  if prior='approved' then raise exception 'Clearance already active' using errcode='22023'; end if;
 else
  if prior is distinct from 'approved' then raise exception 'No active clearance to revoke' using errcode='22023'; end if;
 end if;
 insert into tpd.independent_patrol_decisions(trainee_id,decision,reason,decided_by)
 values(p_trainee_id,case when p_approve then 'approved' else 'revoked' end,btrim(p_reason),actor_id)
 returning id into record_id;
 insert into tpd.audit_log(actor,action,target,detail)
 values(tpd.current_discord_id(),case when p_approve then 'training.independent_approved' else 'training.independent_revoked' end,
 record_id::text,jsonb_build_object('trainee_id',p_trainee_id));
 return record_id;
end $$;
revoke all on function tpd.record_independent_clearance(uuid,boolean,text) from public,anon;
grant execute on function tpd.record_independent_clearance(uuid,boolean,text) to authenticated;

-- Replace the existing patrol start function so an explicit OOTC-approved
-- probationary trainee may patrol; browser cannot supply the clearance.
create or replace function tpd.start_patrol(p_district text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_member tpd.personnel%rowtype; v_session tpd.patrol_sessions%rowtype;
begin
 if auth.uid() is null or tpd.current_discord_id() is null then
  raise exception 'Authentication required' using errcode='42501';
 end if;
 select * into v_member from tpd.personnel
 where discord_id=tpd.current_discord_id() and status='active';
 if not found then raise exception 'Active roster membership required' using errcode='42501'; end if;
 if v_member.rank='Probationary Officer' and not tpd.has_independent_clearance(v_member.id) then
  raise exception 'Independent patrol approval required' using errcode='42501';
 end if;
 if p_district is null or p_district not in ('North','South') then
  raise exception 'Select North or South district' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(v_member.id::text,89321));
 select * into v_session from tpd.patrol_sessions
 where personnel_id=v_member.id and ended_at is null for update;
 if found then return jsonb_build_object('id',v_session.id,'district',v_session.district,
  'started_at',v_session.started_at,'ended_at',v_session.ended_at,'review_required',v_session.review_required,'reused',true); end if;
 insert into tpd.patrol_sessions(personnel_id,district) values(v_member.id,p_district)
 returning * into v_session;
 insert into tpd.audit_log(actor,action,target,detail)
 values(tpd.current_discord_id(),'patrol.started',v_session.id::text,jsonb_build_object('district',v_session.district));
 return jsonb_build_object('id',v_session.id,'district',v_session.district,
  'started_at',v_session.started_at,'ended_at',v_session.ended_at,'review_required',v_session.review_required,'reused',false);
end $$;
revoke all on function tpd.start_patrol(text) from public,anon;
grant execute on function tpd.start_patrol(text) to authenticated;

create table if not exists tpd.personnel_change_proposals (
 id uuid primary key default gen_random_uuid(),
 target_id uuid not null references tpd.personnel(id) on delete restrict,
 field text not null check(field in ('rank','appointment','district','status')),
 old_value text,
 requested_value text not null check(length(btrim(requested_value)) between 1 and 140),
 reason text not null check(length(btrim(reason)) between 15 and 2000),
 requested_by uuid not null references tpd.personnel(id) on delete restrict,
 requested_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','approved_for_sheet','rejected')),
 reviewed_by uuid references tpd.personnel(id) on delete restrict,
 reviewed_at timestamptz,
 review_reason text,
 constraint personnel_proposal_decision check (
 (status='pending' and reviewed_by is null and reviewed_at is null)
 or (status<>'pending' and reviewed_by is not null and reviewed_at is not null and length(btrim(review_reason))>=10))
);
create index if not exists personnel_proposals_status on tpd.personnel_change_proposals(status,requested_at desc);
alter table tpd.personnel_change_proposals enable row level security;
revoke all on tpd.personnel_change_proposals from public,anon,authenticated;
grant select on tpd.personnel_change_proposals to authenticated;
drop policy if exists proposal_read on tpd.personnel_change_proposals;
create policy proposal_read on tpd.personnel_change_proposals for select to authenticated using (
 requested_by=(select p.id from tpd.personnel p where p.discord_id=tpd.current_discord_id() and p.status='active')
 or (tpd.is_command() and exists(select 1 from tpd.personnel p where p.discord_id=tpd.current_discord_id() and p.status='active'))
);

create or replace function tpd.propose_personnel_change(p_target_id uuid,p_field text,p_new_value text,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor_id uuid; actor_rank text; target tpd.personnel%rowtype; prior text; new_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select id,rank into actor_id,actor_rank from tpd.personnel where discord_id=tpd.current_discord_id() and status='active';
 if actor_id is null or not tpd.rank_at_least(actor_rank,'Captain') then
  raise exception 'Command authorization required' using errcode='42501';
 end if;
 select * into target from tpd.personnel where id=p_target_id;
 if not found or target.status<>'active' then raise exception 'Active personnel record required' using errcode='22023'; end if;
 if actor_id=p_target_id then raise exception 'Self changes are not permitted' using errcode='42501'; end if;
 if p_field not in ('rank','appointment','district','status') or p_new_value is null or length(btrim(p_new_value)) not between 1 and 140 then
  raise exception 'Invalid personnel change' using errcode='22023';
 end if;
 if p_field='rank' and not exists(select 1 from tpd.ranks where name=p_new_value) then
  raise exception 'Unknown rank' using errcode='22023';
 end if;
 if p_field='district' and p_new_value not in ('North','South','Department') then
  raise exception 'Invalid district' using errcode='22023';
 end if;
 if p_field='status' and p_new_value not in ('active','inactive','former') then
  raise exception 'Invalid status' using errcode='22023';
 end if;
 if p_reason is null or length(btrim(p_reason)) not between 15 and 2000 then
  raise exception 'A detailed reason is required' using errcode='22023';
 end if;
 prior:=case p_field when 'rank' then target.rank when 'district' then target.district
 when 'appointment' then target.appointment when 'status' then target.status end;
 if prior is not distinct from btrim(p_new_value) then raise exception 'No change requested' using errcode='22023'; end if;
 insert into tpd.personnel_change_proposals(target_id,field,old_value,requested_value,reason,requested_by)
 values(p_target_id,p_field,prior,btrim(p_new_value),btrim(p_reason),actor_id) returning id into new_id;
 insert into tpd.audit_log(actor,action,target,detail) values(tpd.current_discord_id(),
  'personnel.change_proposed',new_id::text,jsonb_build_object('field',p_field,'target_id',p_target_id));
 return new_id;
end $$;
revoke all on function tpd.propose_personnel_change(uuid,text,text,text) from public,anon;
grant execute on function tpd.propose_personnel_change(uuid,text,text,text) to authenticated;

create or replace function tpd.review_personnel_change(p_proposal_id uuid,p_approve boolean,p_reason text)
returns text language plpgsql security definer set search_path='' as $$
declare actor_id uuid; actor_rank text; r tpd.personnel_change_proposals%rowtype; result text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select id,rank into actor_id,actor_rank from tpd.personnel where discord_id=tpd.current_discord_id() and status='active';
 if actor_id is null or actor_rank not in ('Chief of Police','Deputy Chief','Assistant Chief') then
  raise exception 'Office of the Chiefs authorization required' using errcode='42501';
 end if;
 if p_reason is null or length(btrim(p_reason)) not between 10 and 2000 then
  raise exception 'Review explanation required' using errcode='22023';
 end if;
 select * into r from tpd.personnel_change_proposals where id=p_proposal_id for update;
 if not found then raise exception 'Proposal not found' using errcode='22023'; end if;
 if r.requested_by=actor_id or r.target_id=actor_id then raise exception 'Conflicted reviewer' using errcode='42501'; end if;
 if r.status<>'pending' then raise exception 'Proposal already reviewed' using errcode='22023'; end if;
 result:=case when p_approve then 'approved_for_sheet' else 'rejected' end;
 update tpd.personnel_change_proposals set status=result,reviewed_by=actor_id,
 reviewed_at=now(),review_reason=btrim(p_reason) where id=p_proposal_id;
 insert into tpd.audit_log(actor,action,target,detail) values(tpd.current_discord_id(),
  'personnel.'||result,p_proposal_id::text,jsonb_build_object('field',r.field,'target_id',r.target_id));
 return result;
end $$;
revoke all on function tpd.review_personnel_change(uuid,boolean,text) from public,anon;
grant execute on function tpd.review_personnel_change(uuid,boolean,text) to authenticated;
-- Approved proposals are instructions for manual Google Sheets reconciliation,
-- NOT database updates. The roster sync remains the only roster writer.

-- A narrow self-check lets the Patrol UI honor OOTC clearance without
-- revealing or trusting other members' training data.
create or replace function tpd.my_independent_clearance()
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((
  select tpd.has_independent_clearance(p.id) from tpd.personnel p
  where p.discord_id=tpd.current_discord_id() and p.status='active'
 ),false) and auth.uid() is not null
$$;
revoke all on function tpd.my_independent_clearance() from public,anon;
grant execute on function tpd.my_independent_clearance() to authenticated;
