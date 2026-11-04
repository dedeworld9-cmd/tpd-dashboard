/**
 * POST /functions/v1/roster-sync   body: { "mode": "preview" | "apply", "confirmRemovals"?: boolean }
 *
 * Callers:
 *   - a command user (Captain+ on the roster), with their Supabase session token;
 *   - the scheduler / first-import caller, with header x-sync-secret = ROSTER_SYNC_SECRET (apply by default; "preview" is honored).
 * Reads the roster with a read-only Google service account. Never writes to Google.
 */

import { accessToken, parseServiceAccount, readTabs, ROSTER_RANGES } from "../_shared/google.ts";
import { publicChanges, runRosterSync, selectMode } from "../_shared/roster-sync.ts";
import type { CurrentMember } from "../_shared/roster.ts";
import { audit, client, handler, HttpError, recordStatus, requireCommand, sha256 } from "../_shared/supabase.ts";

const env = { get: (k: string) => Deno.env.get(k) };

Deno.serve(
  handler(env, async (req) => {
    const db = client(env);
    const body = await req.json().catch(() => ({}));
    const secret = env.get("ROSTER_SYNC_SECRET");
    const scheduled = !!secret && req.headers.get("x-sync-secret") === secret;
    let actor = "system:roster-sync";
    if (!scheduled) {
      const jwt = await requireCommand(db, req);
      const me = await db.asUser(jwt)("rpc/my_membership", { method: "POST", body: "{}" });
      actor = `roster:${me?.member?.callsign ?? "command"}`;
    }
    const mode = selectMode(scheduled, body.mode);

    const sheetId = env.get("GOOGLE_SHEETS_ID");
    const sa = parseServiceAccount(env.get("GOOGLE_SERVICE_ACCOUNT_CREDENTIALS"));
    if (!sheetId || !sa) {
      await recordStatus(db, "google_sheets", "not_configured", { sheetConfigured: !!sheetId, credentialsConfigured: !!sa });
      throw new HttpError(503, "Google Sheets is not configured (GOOGLE_SHEETS_ID and GOOGLE_SERVICE_ACCOUNT_CREDENTIALS).");
    }

    const svc = db.service();
    const [run] = await svc("roster_sync_runs", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({ trigger: mode === "preview" ? "preview" : scheduled ? "scheduled" : "manual" }),
    });

    const result = await runRosterSync(
      {
        async readSheets() {
          const token = await accessToken(sa);
          const tabs = await readTabs(sheetId, [...ROSTER_RANGES], token);
          return { roster: tabs[ROSTER_RANGES[0]], divisions: tabs[ROSTER_RANGES[1]] };
        },
        async loadCurrent() {
          const rows = await svc("personnel?select=discord_id,name,callsign,rank,appointment,district,status");
          return rows.map((r: Record<string, string>) => ({
            discordId: r.discord_id,
            name: r.name,
            callsign: r.callsign,
            rank: r.rank,
            appointment: r.appointment,
            district: r.district,
            status: r.status,
          })) as CurrentMember[];
        },
        async lastAppliedHash() {
          const rows = await svc("roster_sync_runs?select=source_hash&status=in.(applied,no_changes)&order=finished_at.desc&limit=1");
          return rows[0]?.source_hash ?? null;
        },
        async lastPositionCount() {
          const rows = await svc("roster_sync_runs?select=counts&status=in.(applied,no_changes)&order=finished_at.desc&limit=1");
          const n = rows[0]?.counts?.positions;
          return typeof n === "number" ? n : null;
        },
        apply: (snapshot) => svc("rpc/apply_roster_snapshot", { method: "POST", body: JSON.stringify({ snapshot, run_id: run.id }) }),
        hash: sha256,
      },
      mode,
      { confirmRemovals: !scheduled && body.confirmRemovals === true },
    );

    await svc(`roster_sync_runs?id=eq.${run.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        finished_at: new Date().toISOString(),
        status: result.status,
        source_hash: result.hash,
        counts: result.counts,
        warnings: result.issues.filter((i) => i.severity === "warning"),
        errors: [...result.issues.filter((i) => i.severity === "error"), ...(result.error ? [{ code: "upstream", message: result.error }] : [])],
        changes: publicChanges(result.changes),
        actor_discord_id: null,
      }),
    });
    if (result.status === "failed") await recordStatus(db, "google_sheets", "failed", { runId: run.id }, result.error);
    else await recordStatus(db, "google_sheets", result.status === "rejected" ? "degraded" : "connected", { runId: run.id, members: result.counts.members, positions: result.counts.positions });
    if (mode === "apply") await audit(db, actor, `roster.sync.${result.status}`, run.id, { counts: result.counts });

    return { body: { runId: run.id, status: result.status, counts: result.counts, issues: result.issues, changes: publicChanges(result.changes), error: result.error ?? null } };
  }),
);
