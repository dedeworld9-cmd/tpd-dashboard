-- Phase 5 development: documented module sign-offs, not independent-patrol clearance.
-- The Office of the Chiefs controls sign-offs until PTO assignment authority (PC-06) is resolved.
create table if not exists tpd.training_signoffs (
 id uuid primary key default gen_random_uuid(),
 trainee_id uuid not null references tpd.personnel(id) on delete restrict,
 module_key text not null check (module_key in ('onboarding','policy','anchorcad','radio','patrol','pto')),
 evidence text not null check (length(btrim(evidence)) between 10 and 2000),
 signed_by uuid not null references tpd.personnel(id) on delete restrict,
 signed_at timestamptz not null default now(),
 unique(trainee_id,module_key)
);
create index if not exists training_signoffs_by_trainee on tpd.training_signoffs(trainee_id,signed_at desc);
alter table tpd.training_signoffs enable row level security;
revoke all on tpd.training_signoffs from public,anon,authenticated;
grant select on tpd.training_signoffs to authenticated;

create or replace function tpd.is_training_authority()
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((
   select p.status='active' and p.rank in ('Chief of Police','Deputy Chief','Assistant Chief')
   from tpd.personnel p where p.discord_id=tpd.current_discord_id()
 ),false) and auth.uid() is not null
$$;
revoke all on function tpd.is_training_authority() from public,anon;
grant execute on function tpd.is_training_authority() to authenticated;

drop policy if exists training_signoffs_read on tpd.training_signoffs;
create policy training_signoffs_read on tpd.training_signoffs for select to authenticated using (
 trainee_id=(select p.id from tpd.personnel p where p.discord_id=tpd.current_discord_id() and p.status='active')
 or tpd.is_training_authority()
);

create or replace function tpd.signoff_training_module(p_trainee_id uuid,p_module_key text,p_evidence text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor_id uuid; trainee tpd.personnel%rowtype; result_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if not tpd.is_training_authority() then raise exception 'Office of the Chiefs authorization required' using errcode='42501'; end if;
 select p.id into actor_id from tpd.personnel p where p.discord_id=tpd.current_discord_id() and p.status='active';
 select * into trainee from tpd.personnel where id=p_trainee_id;
 if not found or trainee.status<>'active' or trainee.rank<>'Probationary Officer' then
  raise exception 'Active probationary trainee required' using errcode='22023';
 end if;
 if actor_id=p_trainee_id then raise exception 'Self-signoff prohibited' using errcode='42501'; end if;
 if p_module_key is null or p_module_key not in ('onboarding','policy','anchorcad','radio','patrol','pto') then
  raise exception 'Unknown training module' using errcode='22023';
 end if;
 if p_evidence is null or length(btrim(p_evidence)) not between 10 and 2000 then
  raise exception 'Evidence description or record reference required (10–2000 characters)' using errcode='22023';
 end if;
 if exists(select 1 from tpd.training_signoffs where trainee_id=p_trainee_id and module_key=p_module_key) then
  raise exception 'This module has already been signed off' using errcode='22023';
 end if;
 insert into tpd.training_signoffs(trainee_id,module_key,evidence,signed_by)
 values(p_trainee_id,p_module_key,btrim(p_evidence),actor_id) returning id into result_id;
 insert into tpd.audit_log(actor,action,target,detail)
 values(tpd.current_discord_id(),'training.module_signed_off',result_id::text,
 jsonb_build_object('trainee_id',p_trainee_id,'module_key',p_module_key));
 return result_id;
end $$;
revoke all on function tpd.signoff_training_module(uuid,text,text) from public,anon;
grant execute on function tpd.signoff_training_module(uuid,text,text) to authenticated;

-- Module completion does not confer PTO qualification, independent patrol,
-- remove probationary status or bypass training. Final OOTC clearance is separate.
