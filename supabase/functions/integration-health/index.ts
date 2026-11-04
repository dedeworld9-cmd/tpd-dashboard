/**
 * POST /functions/v1/integration-health   (command only)
 *
 * Runs a real, authenticated check of each integration and stores the result.
 * "connected" is recorded only after a successful authenticated round trip.
 * Secret values are never returned; only whether each one is configured.
 */

import { checkApi, checkPanelUrl } from "../_shared/anchorcad.ts";
import { botIdentity, guildInfo, guildRoles } from "../_shared/discord.ts";
import { accessToken, parseServiceAccount, spreadsheetTitle } from "../_shared/google.ts";
import { client, handler, recordStatus, requireCommand } from "../_shared/supabase.ts";

const env = { get: (k: string) => Deno.env.get(k) };

Deno.serve(
  handler(env, async (req) => {
    const db = client(env);
    await requireCommand(db, req);
    const svc = db.service();
    const out: Record<string, { status: string; detail: Record<string, unknown>; error?: string }> = {};

    // Discord sign-in: provider enabled in Supabase Auth, and at least one real Discord sign-in completed.
    const settings = await db.authSettings();
    const enabled = settings?.external?.discord === true;
    const signIns = enabled ? await svc("rpc/discord_identity_count", { method: "POST", body: "{}" }) : 0;
    out.discord_oauth = { status: !enabled ? "not_configured" : signIns > 0 ? "connected" : "verification_required", detail: { providerEnabled: enabled, completedSignIns: signIns } };

    // Discord bot: token valid and bot present in the configured guild.
    const token = env.get("DISCORD_BOT_TOKEN");
    const guildId = env.get("DISCORD_GUILD_ID");
    if (!token || !guildId) out.discord_bot = { status: "not_configured", detail: { tokenConfigured: !!token, guildConfigured: !!guildId } };
    else
      try {
        const bot = await botIdentity(token);
        const guild = await guildInfo(guildId, token);
        const roles = await guildRoles(guildId, token);
        const map = await svc("discord_role_map?select=role_id,confirmed_at");
        const confirmed = map.filter((m: { confirmed_at: string | null }) => m.confirmed_at).length;
        out.discord_bot = {
          status: confirmed ? "connected" : "verification_required",
          detail: { bot: bot.username, guild: guild.name, guildRoles: roles.length, mappedRoles: map.length, confirmedRoles: confirmed, roleWrites: "disabled" },
        };
      } catch (e) {
        out.discord_bot = { status: "failed", detail: {}, error: (e as Error).message };
      }

    // Google Sheets: service account can open the roster.
    const sheetId = env.get("GOOGLE_SHEETS_ID");
    const sa = parseServiceAccount(env.get("GOOGLE_SERVICE_ACCOUNT_CREDENTIALS"));
    if (!sheetId || !sa) out.google_sheets = { status: "not_configured", detail: { sheetConfigured: !!sheetId, credentialsConfigured: !!sa } };
    else
      try {
        const title = await spreadsheetTitle(sheetId, await accessToken(sa));
        out.google_sheets = { status: "connected", detail: { title, serviceAccount: sa.client_email } };
      } catch (e) {
        out.google_sheets = { status: "failed", detail: {}, error: (e as Error).message };
      }

    // AnchorCAD: launch URL on an official domain; API key verified with GET /server.
    const panel = checkPanelUrl(env.get("ANCHORCAD_PANEL_URL"));
    const api = await checkApi(env.get("ANCHORCAD_API_KEY"));
    const status = api.status === "connected" ? (panel.status === "connected" ? "connected" : "degraded") : api.status === "not_configured" ? panel.status : api.status;
    out.anchorcad = { status, detail: { panel: panel.note, panelUrl: panel.url, api: api.note, scopes: api.scopes } };

    for (const [k, v] of Object.entries(out)) await recordStatus(db, k, v.status, v.detail, v.error);
    return { body: out };
  }),
);
