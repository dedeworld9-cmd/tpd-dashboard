-- Roster apply hardening and member id.
--   * apply_roster_snapshot: unqualified DELETEs get "WHERE true" (PostgREST sessions run pg-safeupdate, which
--     rejects them even inside a function, so the first real sync would have failed), and a snapshot with
--     no members, or the same Discord ID twice, is refused. The rest of the function is unchanged.
--   * my_membership returns the member's own record id so the website can mark "you" in the directory.
-- Apply after 20261104000000. Safe to re-run (create or replace).

create or replace function tpd.apply_roster_snapshot(snapshot jsonb, run_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb;
  pos jsonb;
  slot jsonb;
  seen text[] := '{}';
  removed int := 0;
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

  with gone as (
    update tpd.personnel set status = 'former', updated_at = now()
    where status <> 'former' and not (discord_id = any (seen)) returning 1
  ) select count(*) into removed from gone;

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
  values ('system:roster-sync', 'roster.applied', run_id::text, jsonb_build_object('members', upserted, 'markedFormer', removed));

  return jsonb_build_object('members', upserted, 'markedFormer', removed);
end
$$;

revoke all on function tpd.apply_roster_snapshot(jsonb, uuid) from public, anon, authenticated;
grant execute on function tpd.apply_roster_snapshot(jsonb, uuid) to service_role;

create or replace function tpd.my_membership() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  did text := tpd.current_discord_id();
  me tpd.personnel;
  last_sync timestamptz;
begin
  select max(finished_at) into last_sync from tpd.roster_sync_runs where status in ('applied', 'no_changes');
  if auth.uid() is null then
    return jsonb_build_object('state', 'signed_out');
  end if;
  if did is null then
    return jsonb_build_object('state', 'pending_verification', 'reason', 'no_discord_identity');
  end if;
  if last_sync is null then
    return jsonb_build_object('state', 'unavailable', 'reason', 'roster_not_imported');
  end if;
  select * into me from tpd.personnel where discord_id = did;
  if not found then
    return jsonb_build_object('state', 'unrecognized', 'last_sync_at', last_sync);
  end if;
  return jsonb_build_object(
    'state', case me.status when 'active' then 'verified' when 'former' then 'former' else 'inactive' end,
    'last_sync_at', last_sync,
    'member', jsonb_build_object(
      'id', me.id, 'name', me.name, 'callsign', me.callsign, 'rank', me.rank, 'appointment', me.appointment,
      'tier', me.tier, 'district', me.district, 'timezone', me.timezone, 'status', me.status,
      'divisions', coalesce((
        select jsonb_agg(jsonb_build_object('division', s.division_slug, 'callsign', s.callsign, 'role', s.role, 'title', s.title) order by s.callsign)
        from tpd.division_slots s where s.personnel_id = me.id
      ), '[]'::jsonb)
    )
  );
end
$$;

