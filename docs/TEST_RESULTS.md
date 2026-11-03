# Test Results

## Milestone 1 · 2026-11-03 · branch `milestone-1-design-system`

| Check | Result |
|-------|--------|
| `npm run typecheck` (tsc, strict) | Pass |
| `npm run lint` (eslint, next config) | Pass, 0 warnings |
| `npm run build` (production) | Pass, 18 routes, ~105 kB first-load JS |
| Responsive sweep: `/`, `/hq`, `/hq/patrol`, `/hq/roster`, `/hq/training`, `/hq/divisions/waterfront`, `/hq/command`, `/hq/requests` at 1440/1024/768/390 px light and 1440/390 px dark (48 page loads) | No horizontal overflow, no console or page errors |

Interaction checks (Playwright, headless Chromium, production build):

| Check | Result |
|-------|--------|
| Patrol: choose South, start, timer advances, end returns to start | Pass |
| Search palette: Ctrl K → "x-525" → Enter opens roster filtered to that member | Pass |
| Roster: query filter, clear filters, empty state on no match | Pass |
| Requests: Closed tab selects its first request | Pass |
| Sidebar collapse persists across reload | Pass |
| Theme choice persists across reload | Pass |
| Mobile drawer opens, navigates, closes | Pass |
| Public mobile menu shows sign-in | Pass |
| Skip link appears on first Tab | Pass |

Not yet tested: automated accessibility scan (axe), screen readers, Safari/Firefox, real data, authentication, server logic (none exists yet).
Known limit: Ctrl K pressed before the page finishes hydrating is ignored.

## Redesign (black and gold) · 2026-11-03 · branch `redesign-black-gold`

Run against a production build (`next build && next start`), headless Chromium.

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (strict) | Pass |
| `npm run lint` | Pass, 0 warnings |
| `npm run build` | Pass (member profiles prerendered via `generateStaticParams`) |
| `npm test` (Vitest): activity/week maths incl. DST, `can()` and `canDecide()`, preview store operations incl. personnel changes | 24 / 24 pass |
| `npm run test:e2e` (Playwright, desktop 1440 + Pixel 7) | 23 / 23 pass |

End-to-end coverage:
- Shell: palette searches personnel and navigates; palette hides Command Center from officers; go-to shortcuts and shortcut sheet; sidebar collapse persists; new request submitted and opened; notifications marked read.
- Patrol: start, recover after reload, end with confirmation; probationary officers cannot start (HB §3.2); palette start asks first; activity correction from history.
- Command Center: officers see access denied; decision with reason updates the queue; filters, saved views, sorting; supervisors cannot decide LOA extensions (HB §5.4).
- Personnel: promotion shows consequences, requires a reason and lands in history; no self-edit, no admin menu for officers; roster filters; division application respects membership; supervisor desk gated; every HQ page renders an h1 with no console errors.
- Public: disclaimer, badge and real handbook/application links.
- Mobile: tab bar and drawer; no horizontal overflow on key screens.

Bugs found by these tests and fixed: patrol recovery state never cleared; clock showed milliseconds as seconds; a nested admin dialog closing also closed the personnel sheet (React propagates `close`); member profile had no page heading.

Not yet tested: axe scan, screen readers, Safari and Firefox, real data, sign-in and server logic (not built yet).
