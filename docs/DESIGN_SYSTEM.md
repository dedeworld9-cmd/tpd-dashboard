# Design System

One system for the public site and the private headquarters. Tokens live in
`src/app/globals.css`; components in `src/components/ui`.

## Principles
1. **Calm by default.** Light warm-neutral canvas, navy ink, one police blue for action. Gold is reserved for rank and leadership.
2. **Real units, real data.** Activity is shown in hours and 15-minute blocks (the hour meter), never as an abstract percentage. No decorative statistics.
3. **One primary action per view.** Start patrol on Overview and Patrol; New request in Requests.
4. **Policy is cited, not paraphrased into rules.** Guidance text names its handbook section.
5. **Hiding is not authorizing.** Navigation is filtered for clarity; the server always re-checks.

## Color tokens
| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `canvas` | #F6F5F2 | #0D131D | Page background |
| `surface` | #FFFFFF | #141B27 | Panels, header |
| `sunken` | #EFEEEA | #0A0F17 | Inputs, empty meter cells, table hover |
| `ink` / `ink-2` / `muted` | #142033 / #3A4658 / #646D7B | #E9EDF3 / #C3CAD5 / #8D97A6 | Text hierarchy |
| `line` / `line-strong` | #E2E0DA / #CFCCC4 | #232C3A / #323D4E | Borders |
| `blue` | #1D4F9C | #6B9BE6 | Primary action, active nav, progress |
| `gold` | #A07A2C | #D2AE63 | Rank, command, exemptions |
| `green` / `amber` / `red` | status | status | Approved/on duty, pending/due, denied/end patrol |

Each status color has a `-soft` background pair for badges. Theme follows the OS and can be overridden with the toggle (stored in `localStorage` as `tpd-theme`).

## Typography
Public Sans (variable, self-hosted via `@fontsource-variable`) for everything; tabular numerals (`.tabular`) for times, call signs and counts.
Scale: 12 · 13 · 14 · 16 · 18 · 22 · 28 · 40 px. Page titles 28 px semibold, panel titles 14 px semibold, body 14–16 px. Sentence case throughout; no all-caps labels.

## Layout
- Public: 1152 px max width, 16/24 px gutters, sections separated by full-bleed rules.
- HQ: 240 px collapsible sidebar (64 px collapsed, remembered), 56 px sticky top bar, 1200 px content max width, two-column pages collapse to one below 1024 px.
- Radius: 6 (controls), 8 (buttons), 12 (panels). Shadows: `shadow-sm` on panels, `shadow-md` only on overlays and the join card.

## Components (Milestone 1)
`Button`/`ButtonLink` (primary, secondary, ghost, danger; sm/md/lg) · `Badge` · `StatusDot` · `Panel` + `PanelHeader` · `Avatar` · `Meter` · `EmptyState` · `HourMeter` · `PageHeader` (with breadcrumbs) · `Sidebar` + `MobileNav` · `CommandPalette` (Ctrl/⌘ K or `/`) · `ThemeToggle` · `RosterTable` (filters, table on tablet+, list on phone) · `RequestCenter` (tabs, list, detail, state progress).

## Interaction
- Visible focus ring (`--focus`) on every control; skip link on both layouts.
- Motion limited to state changes (sidebar width, the on-patrol pulse); all motion is disabled under `prefers-reduced-motion`.
- Overlays (drawer, palette) close on Escape and backdrop click.
- Disabled actions explain why in a tooltip or inline note.
