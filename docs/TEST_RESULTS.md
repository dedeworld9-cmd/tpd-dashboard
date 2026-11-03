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
