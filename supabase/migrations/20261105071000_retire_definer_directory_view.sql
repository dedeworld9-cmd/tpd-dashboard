-- Phase 8, step 2. APPLY ONLY AFTER Phase 8 frontend deployment has
-- been verified to use tpd.list_member_directory().
-- The old view is no longer used and should never bypass personnel RLS.
alter view tpd.personnel_directory set (security_invoker = true);
revoke all on tpd.personnel_directory from public,anon,authenticated;
-- Do not broaden personnel table RLS. Access to the safe directory is
-- provided exclusively by the audited list_member_directory RPC.
