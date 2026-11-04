/**
 * POST /functions/v1/discord-verify   body: { "all"?: boolean }
 *
 * Read-only check of Discord server membership and roles against the roster.
 *   - any verified member: checks themself;
 *   - command (Captain+ on the roster) with all=true: checks every active member.
 * Findings are stored for review. Nothing here changes access or Discord roles.
 */

import { evaluateRoles, guildInfo, memberRoles, planRoleSync, type RoleMapping } from "../_shared/discord.ts";
import { audit, bearer, client, handler, HttpError, recordStatus, requireCommand } from "../_shared/supabase.ts";

const env = { get: (k: string) => Deno.env.get(k) };

Deno.serve(
  handler(env, async (req) => {
    const db = client(env);
    const body = await req.json().catch(() => ({}));
    const token = env.get("DISCORD_BOT_TOKEN");
    const guildId = env.get("DISCORD_GUILD_ID");
    if (!token || !guildId) {
      await recordStatus(db, "discord_bot", "not_configured", { tokenConfigured: !!token, guildConfigured: !!guildId });
      throw new HttpError(503, "The Discord bot is not configured (DISCORD_BOT_TOKEN and DISCORD_GUILD_ID).");
    }

    const svc = db.service();
    let targets: { id: string; discord_id: string; rank: string }[];
    if (body.all === true) {
      await requireCommand(db, req);
      targets = await svc("personnel?select=id,discord_id,rank&status=eq.active");
    } else {
      const jwt = bearer(req);
      await db.user(jwt);
      const me = await db.asUser(jwt!)("personnel?select=id,discord_id,rank,status");
      if (!me.length || me[0].status !== "active") throw new HttpError(403, "Only verified members can be checked");
      targets = me;
    }

    try {
      await guildInfo(guildId, token);
    } catch (e) {
      await recordStatus(db, "discord_bot", "failed", {}, (e as Error).message);
      throw new HttpError(502, (e as Error).message);
    }

    const map: RoleMapping[] = await svc("discord_role_map?select=role_id,role_name,maps_to_kind,maps_to_value,confirmed_at");
    const slots: { personnel_id: string; division_slug: string }[] = await svc("division_slots?select=personnel_id,division_slug&personnel_id=not.is.null");
    const results = [];
    for (const t of targets) {
      const roles = await memberRoles(guildId, t.discord_id, token); // throws on outage: nothing is recorded as "not in guild"
      const facts = { rank: t.rank, divisions: slots.filter((s) => s.personnel_id === t.id).map((s) => s.division_slug) };
      const findings = evaluateRoles(facts, roles, map);
      const plan = planRoleSync(findings, map, facts);
      await svc("discord_verifications?on_conflict=personnel_id", {
        method: "POST",
        headers: { prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ personnel_id: t.id, checked_at: new Date().toISOString(), in_guild: roles !== null, role_ids: roles ?? [], findings: { findings, dryRun: plan } }),
      });
      results.push({ personnelId: t.id, inGuild: roles !== null, findings, dryRun: plan });
    }
    const confirmed = map.filter((m) => m.confirmed_at).length;
    await recordStatus(db, "discord_bot", confirmed ? "connected" : "verification_required", { checked: results.length, mappedRoles: map.length, confirmedRoles: confirmed, roleWrites: "disabled" });
    if (body.all === true) await audit(db, "command", "discord.verify.all", null, { checked: results.length });
    return { body: { checked: results.length, results } };
  }),
);
