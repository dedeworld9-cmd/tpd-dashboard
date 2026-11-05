-- Phase 8, step 1. Create a narrowly scoped roster-directory RPC.
-- Keep the existing view available until the frontend cutover is verified.
-- Only non-sensitive display columns are returned. Discord IDs, timezones,
-- hire dates, and internal identifiers other than personnel UUID stay private.
create or replace function tpd.list_member_directory()
returns table(
 id uuid, name text, callsign text, rank text,
 appointment text, tier text, district text, status text
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
 if auth.uid() is null or tpd.current_discord_id() is null or not tpd.is_active_member() then
  raise exception 'Active TPD membership required' using errcode='42501';
 end if;
 return query
 select p.id,p.name,p.callsign,p.rank,p.appointment,p.tier,p.district,p.status
 from tpd.personnel p
 where p.status='active'
 order by p.name,p.id;
end $$;
revoke all on function tpd.list_member_directory() from public,anon;
grant execute on function tpd.list_member_directory() to authenticated;
