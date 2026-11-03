# Implementation Status

## Milestone 0 — Discovery · complete (2026-11-03)

Done
- Repository audit: `dedeworld9-cmd/tampaPD` was empty; **public** visibility.
- Read HB (full), UoF (full), all six RS tabs, GF (all 29 questions, public view).
- Reviewed three reference sites in a browser at desktop and mobile widths; confirmed each portal is Discord-gated.
- Wrote REQUIREMENTS, DATA_SOURCES, POLICY_CONFLICTS (25 items), ARCHITECTURE, PROJECT_PLAN, research/REFERENCE_SITES.

Not done / limits
- Rank Structure & Responsibilities document not available (PC-12).
- Google Form responses not accessible (only the public form).
- Reference portals not evaluated beyond their sign-in gates.
- AnchorCAD: no API documentation available; link-only.
- No code, tests or builds yet, so no test results to report.

## External blockers (needed from dede / leadership)
| Needed for | Item |
|------------|------|
| M2 | Discord application (client ID + secret) and the Discord server (guild) ID |
| M2 | Supabase project (or approval for me to use a local Supabase for development only) |
| M2 import | Google service account with Viewer access to the roster sheet, or approval to use a manual CSV export |
| M3 | Answers to PC-14 (week/timezone) and PC-15 (is the website the official patrol log) |
| M4 | PC-07, PC-08, PC-16 |
| M5 | PC-06, PC-24 |
| Assets | Official TPD badge/patch artwork, if any, and permission to use it |

## Milestone 1 — Design system & shell · design complete, awaiting review (2026-11-03)

Done
- Next.js 15 (App Router, strict TS), Tailwind v4 tokens, light/dark themes, self-hosted Public Sans.
- Public layout + homepage (join pathway from HB §3.1, divisions, districts, policy links, roleplay disclaimer).
- HQ shell: collapsible sidebar, mobile drawer, top bar, universal search (Ctrl/⌘ K), theme toggle, duty chip.
- Screens: Overview, Patrol, Personnel, Training, Division (6 routes), Command Center, Requests. Activity, Resources, Supervisor and Settings are labelled placeholders.
- Browser QA: 8 routes × 1440/1024/768/390 px (light) + 1440/390 (dark); no horizontal overflow, no console errors. 13 interaction checks pass. See TEST_RESULTS.md.

Deliberate limits
- All HQ data is fictional (`src/lib/sample-data.ts`) and every HQ page shows a "design preview" banner.
- The patrol timer runs in the browser only and records nothing; request decisions are disabled.
- No authentication: `/hq` is open in this preview. Do not deploy publicly until Milestone 2 adds sign-in.
- AnchorCAD link not configured (`NEXT_PUBLIC_ANCHORCAD_URL`); the button is disabled and says so.
- No automated test suite in the repo yet (Vitest/Playwright arrive with M2 logic).

## Next
Milestone 2: Discord sign-in, account linking, capability engine, personnel schema and roster import.
Blocked on the external items above.

## Redesign — black-and-gold system and reference screens · in progress (2026-11-03)

dede rejected the Milestone 1 look and issued two directives (design reformation; advanced UI/UX and interaction). Work so far:

Done
- Brand: department badge cut out to a transparent PNG without altering it (`public/brand/tpd-badge.png`, 207×265 source); favicon and touch icon from it. In-game Charger photo and Tampa skyline banner added as WebP.
- Tokens: Obsidian / Graphite / Heritage gold / Warm ivory palette in light and dark, Archivo variable type (wide display cuts), gold-ink for AA text on light surfaces.
- Component library (`src/components/ui`): buttons, fields, pills, cards, dialogs and sheets on native `<dialog>`, popovers and menus with keyboard support, tooltips, toasts, skeletons, tabs, segmented controls, hour meter, bar/stack/capacity charts, data table (sort, column visibility, selection, row menus, sticky header, pagination, CSV export).
- Authorization moved to `src/lib/authz` (`can()`, `canDecide()`), with handbook citations and interim rules marked.
- Design-preview data layer (`src/lib/preview/store.ts`): browser-local sample state that mirrors the planned server contracts (idempotent start, one open session, 12 h cap with review flag, authz on every decision, mandatory reasons, append-only history, double-submit guard). M2+ swaps it for server actions.
- Shell: collapsible obsidian sidebar (persisted), workspace switcher, role-filtered nav, live duty status, account menu with "Preview as" personas, theme, shortcuts, reset; top bar with breadcrumbs, quick actions, notification center; Ctrl/⌘K command palette; g-letter shortcuts; mobile tab bar and drawer.
- Reference screens: Member Dashboard (adapts to off duty, on duty, probationary, supervisor, command), Active Patrol workspace (start, recover, end with confirmation, weekly progress, six-week trend, history with corrections, supervisors on duty, fleet, policy refs), Command Center (KPIs, staffing, compliance, division capacity, decision queue with saved views and filters, approval panel). Requests workspace rebuilt on the same table and panel.
- Tests: 22 unit (authz, week math incl. DST, store operations) and 16 Playwright end-to-end. See TEST_RESULTS.md.

Remaining
- Public homepage rebuild; Personnel (side panel + admin flows), Training, Divisions, Activity, Supervisor, Resources and Settings on the new system.
- Not deployed. Awaiting dede's review.
