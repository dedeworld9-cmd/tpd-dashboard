-- Phase 6 follow-up hardening: an OOTC revocation must terminate active duty
-- immediately, with historical timestamps preserved and session flagged for review.
create or replace function tpd.record_independent_clearance(p_trainee_id uuid,p_approve boolean,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor_id uuid; trainee tpd.personnel%rowtype; prior text; record_id uuid; closed_count integer;
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
 if not p_approve then
  -- Revoke active duty immediately. The historical record is retained,
  -- but review_required=true keeps the interrupted session out of auto totals.
  update tpd.patrol_sessions set ended_at=now(),review_required=true
   where personnel_id=p_trainee_id and ended_at is null;
  get diagnostics closed_count = row_count;
  if closed_count > 0 then
   insert into tpd.audit_log(actor,action,target,detail)
   values(tpd.current_discord_id(),'patrol.clearance_revocation_closed',
    p_trainee_id::text,jsonb_build_object('sessions_closed',closed_count));
  end if;
 end if;
 return record_id;
end $$;
revoke all on function tpd.record_independent_clearance(uuid,boolean,text) from public,anon;
grant execute on function tpd.record_independent_clearance(uuid,boolean,text) to authenticated;
