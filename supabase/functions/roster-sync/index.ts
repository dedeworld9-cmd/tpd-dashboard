/**
 * POST /functions/v1/roster-sync   body: { "mode": "preview" | "apply", "confirmRemovals"?: boolean }
 *
 * Callers:
 *   - a command user (Captain+ on the roster), with their Supabase session token;
 *   - the scheduler / first-import caller, with header x-sync-secret = ROSTER_SYNC_SECRET (apply by default; "preview" is honored).
 * Reads the roster with a read-only Google service account. Never writes to Google.
 */

import { rosterSyncHandler } from "../_shared/fn-roster-sync.ts";

Deno.serve(rosterSyncHandler({ get: (k) => Deno.env.get(k) }));
