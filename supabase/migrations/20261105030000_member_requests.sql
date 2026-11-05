-- Phase 4 (development): secure member requests.
-- All writes are RPC-only. This migration does not change existing patrol records.
create table if not exists tpd.member_requests (
 id uuid primary key default gen_random_uuid(),
 requester_id uuid not null references tpd.personnel(id) on delete restrict,
 kind text not null check (kind in ('Leave of absence','Transfer','Division application','Training enrollment')),
 summary text not null check (length(btrim(summary)) between 8 and 100),
 detail text not null check (length(btrim(detail)) between 20 and 4000),
 leave_start date,
 leave_end date,
 status text not null default 'submitted' check (status in ('submitted','under_review','approved','denied','withdrawn')),
 reviewer_id uuid references tpd.personnel(id) on delete restrict,
 decision_reason text,
 created_at timestamptz not null default now(),
 decided_at timestamptz,
 updated_at timestamptz not null default now(),
 constraint request_leave_dates check (
   (kind <> 'Leave of absence' and leave_start is null and leave_end is null)
   or (kind = 'Leave of absence' and leave_start is not null and leave_end is not null
   and leave_end >= leave_start and leave_end - leave_start < 14)
 ),
 constraint request_decision_consistency check (
   (status in ('submitted','under_review','withdrawn') and reviewer_id is null and decided_at is null)
   or (status in ('approved','denied') and reviewer_id is not null
       and decided_at is not null and length(btrim(decision_reason)) >= 10)
 )
);
create index if not exists member_requests_owner_recent on tpd.member_requests(requester_id,created_at desc);
create index if not exists member_requests_pending on tpd.member_requests(created_at desc)
  where status in ('submitted','under_review');
alter table tpd.member_requests enable row level security;
revoke all on tpd.member_requests from public,anon,authenticated;
grant select on tpd.member_requests to authenticated;

create or replace function tpd.can_review_member_request(p_kind text)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((
  select p.status='active' and case p_kind
   when 'Leave of absence' then tpd.rank_at_least(p.rank,'Lieutenant')
   when 'Transfer' then tpd.rank_at_least(p.rank,'Captain')
   when 'Division application' then tpd.rank_at_least(p.rank,'Lieutenant')
   when 'Training enrollment' then tpd.rank_at_least(p.rank,'Sergeant')
   else false end
  from tpd.personnel p where p.discord_id=tpd.current_discord_id()
 ),false) and auth.uid() is not null
$$;
revoke all on function tpd.can_review_member_request(text) from public,anon;
grant execute on function tpd.can_review_member_request(text) to authenticated;

drop policy if exists requests_read_authorized on tpd.member_requests;
create policy requests_read_authorized on tpd.member_requests for select to authenticated using (
 requester_id = (select p.id from tpd.personnel p where p.discord_id=tpd.current_discord_id() and p.status='active')
 or (tpd.can_review_member_request(kind) and requester_id <> coalesce(
   (select p.id from tpd.personnel p where p.discord_id=tpd.current_discord_id() and p.status='active'),
   '00000000-0000-0000-0000-000000000000'::uuid))
);

create or replace function tpd.submit_member_request(
 p_kind text,p_summary text,p_detail text,p_leave_start date default null,p_leave_end date default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor_id uuid; new_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select id into actor_id from tpd.personnel
  where discord_id=tpd.current_discord_id() and status='active';
 if actor_id is null then raise exception 'Active roster membership required' using errcode='42501'; end if;
 if p_kind not in ('Leave of absence','Transfer','Division application','Training enrollment') then
  raise exception 'This request type is not yet supported' using errcode='22023';
 end if;
 if p_summary is null or length(btrim(p_summary)) not between 8 and 100
  or p_detail is null or length(btrim(p_detail)) not between 20 and 4000 then
  raise exception 'Please include a descriptive summary and details' using errcode='22023';
 end if;
 if p_kind='Leave of absence' then
  if p_leave_start is null or p_leave_end is null or p_leave_start < current_date
   or p_leave_end < p_leave_start or p_leave_end - p_leave_start >=14 then
   raise exception 'Select a future leave period of at most 14 calendar days' using errcode='22023';
  end if;
 elsif p_leave_start is not null or p_leave_end is not null then
  raise exception 'Leave dates are only for leave requests' using errcode='22023';
 end if;
 insert into tpd.member_requests(requester_id,kind,summary,detail,leave_start,leave_end)
 values(actor_id,p_kind,btrim(p_summary),btrim(p_detail),p_leave_start,p_leave_end)
 returning id into new_id;
 insert into tpd.audit_log(actor,action,target,detail)
 values(tpd.current_discord_id(),'request.submitted',new_id::text,jsonb_build_object('kind',p_kind));
 return new_id;
end $$;
revoke all on function tpd.submit_member_request(text,text,text,date,date) from public,anon;
grant execute on function tpd.submit_member_request(text,text,text,date,date) to authenticated;

create or replace function tpd.withdraw_member_request(p_request_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare actor_id uuid; old_row tpd.member_requests%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select id into actor_id from tpd.personnel where discord_id=tpd.current_discord_id() and status='active';
 if actor_id is null then raise exception 'Active roster membership required' using errcode='42501'; end if;
 select * into old_row from tpd.member_requests where id=p_request_id and requester_id=actor_id for update;
 if not found then raise exception 'Request unavailable' using errcode='42501'; end if;
 if old_row.status not in ('submitted','under_review') then
  raise exception 'This request cannot be withdrawn' using errcode='22023';
 end if;
 update tpd.member_requests set status='withdrawn',updated_at=now() where id=p_request_id;
 insert into tpd.audit_log(actor,action,target,detail)
 values(tpd.current_discord_id(),'request.withdrawn',p_request_id::text,jsonb_build_object('kind',old_row.kind));
 return true;
end $$;
revoke all on function tpd.withdraw_member_request(uuid) from public,anon;
grant execute on function tpd.withdraw_member_request(uuid) to authenticated;

create or replace function tpd.review_member_request(p_request_id uuid,p_approve boolean,p_reason text)
returns text language plpgsql security definer set search_path='' as $$
declare actor_id uuid; req tpd.member_requests%rowtype; verdict text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select id into actor_id from tpd.personnel where discord_id=tpd.current_discord_id() and status='active';
 if actor_id is null then raise exception 'Active roster membership required' using errcode='42501'; end if;
 select * into req from tpd.member_requests where id=p_request_id for update;
 if not found then raise exception 'Request unavailable' using errcode='22023'; end if;
 if actor_id=req.requester_id then raise exception 'Self-approval is prohibited' using errcode='42501'; end if;
 if not tpd.can_review_member_request(req.kind) then
  raise exception 'Review authority required for this request type' using errcode='42501';
 end if;
 if req.status not in ('submitted','under_review') then raise exception 'Request already closed' using errcode='22023'; end if;
 if p_reason is null or length(btrim(p_reason)) not between 10 and 2000 then
  raise exception 'A review explanation is required' using errcode='22023';
 end if;
 verdict:=case when p_approve then 'approved' else 'denied' end;
 update tpd.member_requests set status=verdict,reviewer_id=actor_id,decision_reason=btrim(p_reason),
 decided_at=now(),updated_at=now() where id=p_request_id;
 insert into tpd.audit_log(actor,action,target,detail)
 values(tpd.current_discord_id(),'request.'||verdict,p_request_id::text,jsonb_build_object('kind',req.kind));
 return verdict;
end $$;
revoke all on function tpd.review_member_request(uuid,boolean,text) from public,anon;
grant execute on function tpd.review_member_request(uuid,boolean,text) to authenticated;
-- A decision records the human outcome only; it does NOT automatically alter
-- staffing, time exemptions, training approval, division assignments or the roster.
