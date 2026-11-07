# UX audit and plan (2026-11-07)

Method: production static build, headless Chromium, 16 routes x desktop (1440x900) and mobile (390x844), preview persona "command", axe-core (WCAG 2.0/2.1/2.2 A and AA rules).

## Baseline (before)
- 0 console errors, 0 horizontal overflow, 15 to 560 ms route loads on a local static server.
- axe: 8 pages with serious findings. Causes, all single-source: success-green pill text at 4.49:1 (needs 4.5:1); star-tier `aria-label` on a bare span (public home); scrollable table wrappers not keyboard-focusable (Structure, Resources, Division); small hit areas on table sort headers and row checkboxes.

## Done in this pass
- `--green` darkened to #1a7048 (contrast now above 4.5:1 on its soft background).
- Star tiers get `role="img"`; scrollable table regions are focusable and labelled; table sort headers and row checkboxes have larger hit areas.
- After: 32 page-views, 0 axe violations, 0 console errors, 0 overflow. 188 unit tests and 31 default e2e tests pass.

## Findings that are not UI polish
- The shell, palette, DataTable, mobile tab bar, tokens and motion rules already exist and are consistent (docs/DESIGN_SYSTEM.md). A rebuild would risk working behavior for little gain.
- In live mode Patrol, Activity, Training, Requests and Supervisor are closed because no server-side records exist. Making them interactive needs new tables, RLS and functions: that is the next backend phase and is blocked until Phase 1 is activated and a real member has signed in.

## Next increments (UI only, safe now)
1. Live-mode Overview: replace empty preview cards with only real data (identity, divisions, roster size, last sync time).
2. Skeleton and error states for the live directory load; retry button.
3. Personnel table: saved filters and a mobile card layout instead of horizontal scroll.
4. Measure bundle size per route (largest: /hq 220 kB first load) and split the command palette.

## Advanced product experience pass (2026-11-07)

Branch `redesign-black-gold` (PR #3). Frontend only: no migrations, no RLS changes, no deploy, no new backend surface.

### Done
- **Overview (live):** `components/auth/live-overview.tsx`. Role group derived from `can()` (command, supervisor, new member, member). Suggested next step only points at pages that exist in live mode. Record, team counts from the synced directory, resources, "Not connected yet" list, roster sync age. No patrol hours, request counts or other invented figures.
- **Command palette:** scoring, aliases and highlighting in `lib/ux/palette-search.ts` (deterministic, unit tested). Recents are per member (`tpd-recents:<member id>`), page paths only, validated against known pages. Live mode offers no patrol or request actions; closed areas are shown disabled. Choosing a person opens their sheet through an in-memory handoff, so no id reaches the URL. Result count announced, `aria-expanded` follows results, listbox role only when options exist (axe finding fixed).
- **Personnel (live):** rank, district and division filters (division only if present in data), search, result count, reset, mobile card list with paging, accessible detail sheet showing roster fields only.
- **Performance:** palette and new-request dialog load on first use.

### Performance (static export, `npm run build`, shared 102 kB both before and after)
| Route | Baseline 73f79a2 | Now |
|---|---|---|
| /hq | 220 kB | 222 kB |
| /hq/roster | 214 kB | 219 kB |
| /hq/command | 218 kB | 223 kB |
| /hq/patrol | 146 kB | 146 kB |

First-load JS rose slightly because the Overview and Personnel views gained features. Lazy-loading the palette and dialog saved about 1 kB on /hq (223 to 222 in an A/B build). Making the preview-only workspaces dynamic imports changed nothing (they are prerendered, so still counted) and was reverted. Remaining finding: the preview Dashboard, personnel workspace and supabase client ship in every build because the live/preview switch is at runtime; splitting that by build flag is the next real saving. Runtime LCP/CLS were not measured.

### Verification
`npm run typecheck`, `npm run lint` (0 errors, 2 pre-existing warnings), `npm test` (200 passed), `npx playwright test` (31 passed), fake-backend e2e (`E2E_FAKE_BACKEND=1`, 19 passed), static export build ok. axe (wcag2a/aa, 2.1, 2.2) on live Overview, Personnel, filtered, sheet and palette states at 1440 and 390 widths: 0 violations, no horizontal overflow, no console errors. Screenshots: `/mnt/project-files/screenshots/ux-after/`.

### Not done / next
- Patrol, Activity, Training, Requests, Supervisor stay closed until Phase 1 activation and a real member sign-in.
- Overview "Access" row truncates on narrow cards.
- Build-flag split of preview code; runtime perf metrics.
