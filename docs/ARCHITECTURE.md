# Architecture (proposed, Milestone 0)

Status: proposal. Nothing below is built yet.

## Stack
| Layer | Choice | Why |
|-------|--------|-----|
| App | Next.js (App Router), TypeScript strict | Server Components + Server Actions keep authorization on the server; one deployable |
| Styling | Tailwind CSS + CSS custom-property tokens | Tokens drive light/dark themes; no component-library lock-in |
| Primitives | Radix UI (dialog, dropdown, popover, tooltip, tabs) | Accessible behaviour without imposing visuals |
| Data | Supabase Postgres + Row Level Security | Free tier, real constraints, RLS as a second line of defence |
| Auth | Discord OAuth via Supabase Auth | Discord is the community's identity; Supabase handles token exchange and refresh |
| Validation | Zod at every server boundary | Shared schemas for forms and actions |
| Tests | Vitest (unit), pgTAP or SQL tests via Supabase CLI (RLS), Playwright (E2E + visual) | |
| Hosting | Vercel (preview deploys only until approved) | |

No ORM: typed queries via `supabase gen types`, plus SQL functions for transactional
operations (start/end patrol, approve request, promote).

## Identity & access

```
auth.users (Supabase, Discord provider)
   └─ 1:1 ─ accounts (discord_id UNIQUE, status: pending|active|suspended)
               └─ 0..1 ─ personnel (callsign UNIQUE, rank_id, district_id, status)
```

- A Discord sign-in creates an `accounts` row in **pending**. It gets no HQ access until
  it is linked to a `personnel` row whose `discord_id` matches (from a verified roster
  import) or an authorized user links it. Display names are never used to match.
- Suspended accounts are rejected in middleware **and** in every server action.
- Sessions: Supabase HTTP-only cookies, validated server-side on each request
  (`getUser()`, not the unverified session). Post-login redirects accept only relative,
  allow-listed paths.

### Capability model
Rank, appointment, and division role are separate. Capabilities come from **grants**:

```
capability (e.g. patrol.start, roster.view, personnel.promote, discipline.issue,
            loa.approve, loa.extend.approve, training.approve_independent,
            fleet.manage, ia.case.view, news.publish, import.run)
grant: (subject: rank | appointment | division_role | personnel, capability,
        scope: self | district | division | department, granted_by, reason, expires_at)
```

- One function `can(actor, capability, target?)` in `lib/authz` used by every page,
  action and route handler. The same rules are mirrored in Postgres as
  `auth_can(capability, scope_id)` used by RLS policies.
- Per-person exceptions (e.g. HB §13.1 Sergeant authorised by the Chief) are grants with
  `subject = personnel`, a required reason and approver, and are audited.
- Navigation is filtered with the same function, but hiding a link is never the check.

## Core schema (first cut)
`ranks` (ordered) · `districts` · `branches` · `divisions` (branch_id, prefix) ·
`division_roles` · `personnel` · `division_memberships` (active range) ·
`appointments` · `callsign_history` · `personnel_events` (hire, promote, demote,
transfer, separate — append-only) · `patrol_sessions` · `activity_weeks` (view) ·
`exemptions` · `requests` + `request_events` + `request_comments` · `training_programs` ·
`training_modules` · `training_progress` · `training_evaluations` · `qualifications` ·
`vehicles` · `vehicle_authorizations` · `discipline_actions` · `ia_cases` (restricted) ·
`documents` · `acknowledgements` · `announcements` · `notifications` · `audit_events`
(append-only, no UPDATE/DELETE grants) · `integration_jobs` · `import_runs`.

Key constraints:
- `patrol_sessions`: partial unique index `ON (personnel_id) WHERE ended_at IS NULL` →
  one active session per member, even across tabs and double-clicks.
- `personnel.callsign` unique among active personnel.
- Division limit (HB §9.3) and incompatibilities enforced in a `BEFORE INSERT` trigger
  reading rule configuration, plus the same check in the server action for a clean error.
- History tables are insert-only; corrections create new rows referencing the original.

## Patrol design
- `start_patrol(district_id)` SQL function: checks account active, personnel eligible,
  no open session (unique index guarantees it), inserts with `now()`. Idempotent: a second
  call returns the existing open session.
- Client timer renders `now − started_at` from the server value; refresh, new tabs and
  reconnects simply re-read the open session. No client-side start times.
- `end_patrol()` closes with `now()`. Sessions open longer than a configurable limit
  (interim 12 h) are auto-closed by a scheduled job at the limit and flagged
  `needs_review`; flagged time does not count until a supervisor confirms or the member
  files a correction.
- Weekly totals come from a view over closed sessions clipped to week boundaries
  (configurable start day and timezone, PC-14), so a session spanning midnight Sunday is
  split correctly.

## Integrations
| Integration | Plan | Status |
|-------------|------|--------|
| Discord OAuth | Supabase Auth provider (`identify` scope; `guilds.members.read` to check server membership) | Needs a Discord application + client secret from dede |
| Discord bot (roles, notifications) | Optional, Milestone 6, separate token, outbox table + retrying worker | Not authorized yet |
| Google Sheets roster | Read-only import via service account with Viewer access; preview → confirm | Needs a service account shared on the sheet |
| Google Docs policies | Link + version metadata; no scraping | Works today with links |
| AnchorCAD | Launch link and guidance only | No API documented |

External calls go through an `integration_jobs` outbox so a Discord/Google outage never
blocks a patrol start or a request decision.

## Directory layout (planned)
```
app/(public)/…        public site
app/(hq)/hq/…         private HQ (layout enforces session)
app/auth/…            OAuth callback
components/ui/…       design-system primitives
components/hq/…       HQ composites (sidebar, command palette, tables)
lib/authz/            capability engine
lib/db/               typed queries
lib/validation/       Zod schemas
supabase/migrations/  SQL migrations (+ RLS)
supabase/tests/       RLS / constraint tests
tests/e2e/            Playwright
docs/                 project docs
```
