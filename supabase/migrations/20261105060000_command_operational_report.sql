-- Phase 7: read-only command reporting. No access to District Five tables.
-- Every metric comes from persisted TPD records. No inferred compliance verdicts.
create or replace function tpd.command_operational_report()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare result jsonb;
begin
 if auth.uid() is null or tpd.current_discord_id() is null or not tpd.is_command() then
  raise exception 'Command authorization required' using errcode='42501';
 end if;
 with
 staffing as (
   select count(*)::int as authorized,
     count(*) filter(where personnel_id is not null)::int as filled,
     count(*) filter(where personnel_id is null)::int as vacant
   from tpd.positions
 ),
 active_members as (
   select count(*)::int as total,
     count(*) filter(where district='North')::int as north,
     count(*) filter(where district='South')::int as south,
     count(*) filter(where district is null or district not in ('North','South'))::int as other,
     count(*) filter(where rank='Probationary Officer')::int as probationary
   from tpd.personnel where status='active'
 ),
 duty as (
   select count(*)::int as active_sessions,
     count(*) filter(where started_at < now()-interval '12 hours')::int as over_12h,
     count(*) filter(where district='North')::int as north,
     count(*) filter(where district='South')::int as south
   from tpd.patrol_sessions where ended_at is null
 ),
 duty_people as (
   select coalesce(jsonb_agg(jsonb_build_object(
     'id',s.id,'member_id',p.id,'name',p.name,'callsign',p.callsign,
     'district',s.district,'started_at',s.started_at,
     'needs_attention',s.started_at<now()-interval '12 hours'
   ) order by s.started_at asc),'[]'::jsonb) as rows
   from tpd.patrol_sessions s join tpd.personnel p on p.id=s.personnel_id
   where s.ended_at is null and p.status='active'
 ),
 -- Reporting window uses rolling 7 days; no ambiguous weekly compliance.
 recent_patrol as (
   select count(*)::int as completed_sessions,
     count(*) filter(where review_required)::int as flagged_sessions,
     coalesce(round(sum(extract(epoch from
       least(ended_at,now())-greatest(started_at,now()-interval '7 days')
     )/60) filter(where not review_required
       and ended_at>now()-interval '7 days'
       and started_at<now())::numeric),0)::bigint as unflagged_minutes
   from tpd.patrol_sessions
   where ended_at is not null and ended_at>now()-interval '7 days'
 ),
 pending_requests as (
   select count(*)::int as total,
     count(*) filter(where kind='Leave of absence')::int as leave,
     count(*) filter(where kind='Transfer')::int as transfer,
     count(*) filter(where kind='Division application')::int as division,
     count(*) filter(where kind='Training enrollment')::int as training
   from tpd.member_requests where status in ('submitted','under_review')
 ),
 reviews as (
   select count(*)::int as patrol_corrections
   from tpd.patrol_corrections where status='pending'
 ),
 proposals as (
   select count(*)::int as personnel_proposals
   from tpd.personnel_change_proposals where status='pending'
 ),
 trainee_progress as (
   select p.id,p.name,p.callsign,count(distinct t.module_key)::int as modules
   from tpd.personnel p left join tpd.training_signoffs t on t.trainee_id=p.id
   where p.status='active' and p.rank='Probationary Officer'
   group by p.id,p.name,p.callsign
 ),
 training as (
   select coalesce(jsonb_agg(jsonb_build_object(
     'member_id',tp.id,'name',tp.name,'callsign',tp.callsign,
     'signed_modules',tp.modules,'required_modules',6,
     'independent_clearance',tpd.has_independent_clearance(tp.id)
   ) order by tp.modules desc,tp.name),'[]'::jsonb) as rows
   from trainee_progress tp
 )
 select jsonb_build_object(
   'generated_at',now(),
   'window',jsonb_build_object('type','rolling_7_days','timezone','UTC',
     'description','Completed sessions only; provisional unflagged minutes, not compliance'),
   'staffing',(select to_jsonb(x) from staffing x),
   'personnel',(select to_jsonb(x) from active_members x),
   'on_duty',(select to_jsonb(x) from duty x),
   'duty_members',(select rows from duty_people),
   'patrol_7d',(select to_jsonb(x) from recent_patrol x),
   'pending_requests',(select to_jsonb(x) from pending_requests x),
   'pending_corrections',(select patrol_corrections from reviews),
   'pending_personnel_proposals',(select personnel_proposals from proposals),
   'trainees',(select rows from training)
 ) into result;
 return result;
end $$;
revoke all on function tpd.command_operational_report() from public,anon;
grant execute on function tpd.command_operational_report() to authenticated;
