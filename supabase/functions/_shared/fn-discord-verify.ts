/**
 * POST /functions/v1/discord-verify   body: { "discordToken": string }
 *
 * No bot. Called once by the browser right after Discord sign-in, with the
 * member's own short-lived Discord token (scopes identify + guilds.members.read).
 *   1. The Supabase session is validated, and its Discord identity is read from auth.identities.
 *   2. GET /users/@me must return that same Discord ID, so a token for another account is refused.
 *   3. GET /users/@me/guilds/{DISCORD_GUILD_ID}/member gives server membership and role IDs.
 * The result is compared with the roster and stored for review. The token is not stored or logged.
 * Nothing here changes website access or Discord roles.
 */

import { evaluateRoles, ownGuildMember, planRoleSync, SNOWFLAKE, tokenOwner, type RoleMapping } from "./discord.ts";
import { UpstreamError } from "./http.ts";
import { bearer, client, type Env, handler, HttpError, readJsonBody, recordStatus } from "./supabase.ts";

export function discordVerifyHandler(env: Env) {
  return handler(env, async (req) => {
    const db = client(env);
    // Authenticate before anything else: the gateway's JWT check is off for this function (the project signs tokens with an
    // asymmetric key the legacy check cannot verify), so this Auth round trip is the access control.
    const jwt = bearer(req);
    await db.user(jwt);
    const body = await readJsonBody(req);
    const guildId = env.get("DISCORD_GUILD_ID");
    if (!guildId) {
      await recordStatus(db, "discord_guild", "not_configured", { guildConfigured: false });
      throw new HttpError(503, "The Discord server check is not configured (DISCORD_GUILD_ID).");
    }
    const discordToken = typeof body.discordToken === "string" && body.discordToken.length < 512 ? body.discordToken : null;
    if (!discordToken) throw new HttpError(400, "A Discord sign-in token is required. Sign in with Discord again.");

    const asUser = db.asUser(jwt!);
    const expected: string | null = await asUser("rpc/current_discord_id", { method: "POST", body: "{}" });
    if (!expected || !SNOWFLAKE.test(expected)) throw new HttpError(403, "This account did not sign in with Discord");

    let roles: string[] | null;
    try {
      const owner = await tokenOwner(discordToken);
      if (owner.id !== expected) throw new HttpError(403, "The Discord token belongs to a different account");
      roles = (await ownGuildMember(guildId, discordToken))?.roles ?? null;
    } catch (e) {
      if (e instanceof HttpError) throw e;
      const msg = e instanceof UpstreamError ? e.message : "Discord could not be reached";
      await recordStatus(db, "discord_guild", "failed", { guild: "configured" }, msg);
      throw new HttpError(502, msg); // an outage is never recorded as "not in the server"
    }

    const svc = db.service();
    const me: { id: string; rank: string; status: string }[] = await asUser(`personnel?select=id,rank,status&discord_id=eq.${expected}`);
    const map: RoleMapping[] = await svc("discord_role_map?select=role_id,role_name,maps_to_kind,maps_to_value,confirmed_at");
    const confirmed = map.filter((m) => m.confirmed_at).length;
    await recordStatus(db, "discord_guild", confirmed ? "connected" : "verification_required", { guild: "configured", mappedRoles: map.length, confirmedRoles: confirmed, roleWrites: "disabled", method: "member token" });

    if (!me.length) return { body: { inGuild: roles !== null, onRoster: false } };
    const t = me[0];
    const slots: { division_slug: string }[] = await svc(`division_slots?select=division_slug&personnel_id=eq.${t.id}`);
    const facts = { rank: t.rank, divisions: slots.map((s) => s.division_slug) };
    const findings = evaluateRoles(facts, roles, map);
    const plan = planRoleSync(findings, map, facts);
    await svc("discord_verifications?on_conflict=personnel_id", {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ personnel_id: t.id, checked_at: new Date().toISOString(), in_guild: roles !== null, role_ids: roles ?? [], findings: { findings, dryRun: plan } }),
    });
    return { body: { inGuild: roles !== null, onRoster: true, findings, dryRun: plan } };
  });
}
