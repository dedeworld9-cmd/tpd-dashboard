# Integrations: Discord, Google Sheets roster, AnchorCAD

Status as of 2026-11-04: **code complete and tested; not activated.** No Supabase project,
Discord application, bot, Google service account or AnchorCAD key exists yet, so nothing
is connected. The site says so everywhere ("Not configured"); nothing claims to be live.

## Architecture

```
GitHub Pages (static site, public config only)
   │  supabase-js: Discord sign-in (PKCE), RPC my_membership(), reads under RLS
   ▼
Supabase
   ├─ Auth: Discord provider (identity = Discord user ID in auth.identities)
   ├─ Postgres + RLS (supabase/migrations): personnel, positions, division_slots,
   │    roster_sync_runs, audit_log, discord_role_map, discord_verifications, integration_status
   └─ Edge Functions (supabase/functions), secrets server-side only:
        roster-sync         Google Sheets → validate → preview / apply (atomic)
        discord-verify      read-only guild membership + role comparison
        integration-health  authenticated checks of all four integrations
```

The frontend stays on GitHub Pages. Every write happens in an Edge Function after a
server-side check; signed-in users have no write grants on any table.

### Identity and access
1. "Sign in with Discord" → Supabase Auth → Discord (authorization code + PKCE, state handled by Supabase Auth, redirect limited to Supabase's allow list).
2. The Discord user ID comes from `auth.identities` (written by Supabase from Discord's response). User-editable metadata is never trusted.
3. `my_membership()` matches that ID to `personnel.discord_id` (from the roster sheet) and returns one of: verified, unrecognized, former, inactive, pending_verification, unavailable.
4. Command access (`is_command()`, interim PC-08: Captain and above) comes only from the roster rank. Discord roles never grant access.

### Roster sync
- Reads whole columns of `TPD Roster` and `TPD | Divisions` with a read-only service account (`spreadsheets.readonly`).
- Finds the header row by its labels and maps columns by header text, so inserted rows or columns do not break it. Section headings set the tier. The POINTS column is never read; Hire Logs and Records are never read.
- Validates: Discord ID format and uniqueness, call-sign uniqueness, known ranks, district, division holders on the roster, names without IDs (warning), empty or headerless reads.
- Any error rejects the run and the previous snapshot stays. Removing more than max(3, 25%) of active members is treated as a broken read and needs a command user's explicit confirmation.
- Apply is one transaction (`apply_roster_snapshot`). Members no longer listed become `former` (never deleted). Every run is logged in `roster_sync_runs` and `audit_log`.
- Direction is Sheets → website only. Nothing writes to Google.
- Scheduled every 10 minutes once `supabase/sql/schedule-roster-sync.sql` is run; command users can preview and apply manually from Command Center → Integrations.

### Discord bot
- Read-only: `GET /users/@me`, `/guilds/{id}`, `/guilds/{id}/roles`, `/guilds/{id}/members/{user}`.
- Roles are compared with the roster only through **confirmed** rows in `discord_role_map`. Findings and a dry-run plan are stored; `ROLE_WRITES_ENABLED = false`. Planned role removals are always manual.
- An outage is reported as a failure. It is never recorded as "not in the server".

### AnchorCAD
- Official Open Developer API exists: `https://anchorcad.xyz/api/v1`, header `x-api-key`, keys `ank_v1.<serverId>.<secret>` bound to one panel, scopes, about 120 requests/min ([docs](https://docs.anchr.gg/api-reference/index)).
- Implemented: launch link (dashboard, Patrol, Resources, top bar, palette), only when the URL is https on anchorcad.xyz or anchr.gg; and a server-side `GET /server` key check.
- Not implemented, because the response fields are undocumented or importing them needs approval: member matching, report references, and CAD duty or patrol sync. Website patrols and AnchorCAD stay separate systems.

## Activation (what dede or an admin must do)

| # | Item | Where |
|---|------|-------|
| 1 | Create a Supabase project. Run `supabase link`, `supabase db push` (migrations), then `supabase functions deploy roster-sync discord-verify integration-health`. | supabase.com |
| 2 | Create a Discord application. Add the redirect `https://<project-ref>.supabase.co/auth/v1/callback`. In Supabase Auth → Providers → Discord, paste the client ID and secret. In Auth → URL configuration, add `https://dedeworld9-cmd.github.io/tpd-dashboard/hq/auth/callback/` to the redirect allow list. | discord.com/developers, Supabase |
| 3 | Add a bot to that application and invite it to the TPD server with **no permissions beyond View Channels** (read-only REST lookups). Set `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` as function secrets. | Discord |
| 4 | Create a Google Cloud service account with the Sheets API enabled. Share the roster sheet with its email as **Viewer**. Set `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` (the JSON) and `GOOGLE_SHEETS_ID`. | Google Cloud |
| 5 | Set `ROSTER_SYNC_SECRET` and `ALLOWED_ORIGINS=https://dedeworld9-cmd.github.io`. Then run `supabase/sql/schedule-roster-sync.sql`. | Supabase |
| 6 | Optional: create an AnchorCAD API key with `server:read` only (Dashboard → Config → Developer API). Set `ANCHORCAD_API_KEY` and `ANCHORCAD_PANEL_URL`. | AnchorCAD |
| 7 | Build the site with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_ANCHORCAD_URL`. All three are public by design. Deploying needs dede's approval. | build env |
| 8 | First run: a Captain+ member signs in. Then open Command Center → Integrations, click **Run health checks**, then **Preview sync**, then **Apply**. | the site |
| 9 | Role mapping: after the bot works, list the roles (Discord → Server Settings → Roles, or the health check). Insert rows in `discord_role_map`, and set `confirmed_by`/`confirmed_at` only after leadership confirms each mapping. | SQL editor |

Use `.env.example` for the variable list. Secrets go only into `supabase secrets set`; never into `NEXT_PUBLIC_*`, the repository or chat.

## Bootstrap note
The first sync must be done by someone who is already Captain+ on the roster. That is impossible before the first import, so run the first sync once from the Supabase dashboard, by invoking `roster-sync` with the `x-sync-secret` header, or wait for the scheduler. After that, command users manage it from the site.

## Tests
- `npm test`: parser, validation, change detection, sync failure paths, Google JWT signing, Discord and AnchorCAD adapters (mocked HTTP), and secret hygiene.
- `supabase/tests/run-as-nonroot.sh` (or `run-local.sh` as a non-root user): applies the migration to a throwaway PostgreSQL with a stub auth schema and checks RLS, membership states and snapshot safety.
- `deno check` on the three functions (`supabase/functions/deno.json`).
- E2E: `tests/e2e/integrations.spec.ts`. The default build checks the "not configured" states. A build with a fake `NEXT_PUBLIC_SUPABASE_URL=https://fakeproj.supabase.co` and `E2E_FAKE_BACKEND=1` checks Discord PKCE redirect parameters and every membership state against stubbed responses.

None of these tests talks to the real Discord, Google, Supabase or AnchorCAD; those checks need the credentials above.
