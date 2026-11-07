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
