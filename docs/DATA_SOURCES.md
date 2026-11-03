# Data Sources & Source-of-Truth Matrix

Last verified: 2026-11-03. All sources were read through authenticated Google APIs
(Sheets, Docs) and a public fetch (Form). Nothing was modified.

> The repository is public. Personal identifiers from the roster (Discord IDs, Roblox
> usernames) are **not** reproduced here or anywhere in the repo. See POLICY_CONFLICTS PC-25.

## 1. Inventory

| ID | Source | Owner / approver | Version | Access |
|----|--------|------------------|---------|--------|
| HB | [Personnel Policy & Procedures Handbook](https://docs.google.com/document/d/1SaGo6T7H6BoyFa7jof6S6HMxsmxq8Gh2Q0QUc5FlpkE/edit) | Chief of Police (signature line blank) | Effective 2026-10-30, single tab | Readable via Docs API |
| UoF | [Use of Force Policy](https://docs.google.com/document/d/1OYbv_Wvv9s_eLT9Vndtg4v6o3K9StBtLNdG4ROvB2FE/edit) | Chief of Police | 2026-10-30, Ch. 1–2 | Readable via Docs API |
| RS | [TPD Roster spreadsheet](https://docs.google.com/spreadsheets/d/1uWDH1g8BBlHDzzGaAvNH4FmQllbBtnjLPl-NtzdU0Zk/edit) | Command staff (assumed) | Read 2026-11-03 | Readable via Sheets API |
| GF | [Recruitment application form](https://forms.gle/EG78MZdQdgMdLoYX8) | Recruitment team (assumed) | Read 2026-11-03 | Public, no sign-in; responses not accessible |
| RSR | Rank Structure & Responsibilities document (HB §9) | OOTC | — | **Not provided** |
| AC | AnchorCAD | External | — | No API documentation or credentials available |

### RS tabs

| Tab | Size | Contents | Notes |
|-----|------|----------|-------|
| TPD Roster | 162×17 | Call sign, name, Discord ID, position (rank), appointment, timezone, points | Grouped by OOTC, Command Staff, Division Command, Field Supervisory, North (X-4xx), South (X-5xx). Vacant slots are rows with a call sign and no name. |
| TPD \| Divisions | 96×16 | Division slots with division call signs and division roles | Waterfront (W, 12), Traffic Interdiction (T, 12), OPA (PA, 5), IA (IA, 6), Strategic Ops (D, 10), SWAT (A, 22) |
| TPD \| Vehicles | 33×14 | Fleet list and rank × vehicle matrix | 3 patrol vehicles, 12 ranks |
| TPD \| Hire Logs | 114×14 | Discord name, Discord ID, Roblox username, hire date, resign date, longevity | 12 active entries, earliest 2026-10-30 |
| TPD \| Records | 114×16 | Disciplinary records: member, action, date, description, issued by | **Empty** (header only) |
| TPD - Numbers by Rank | 39×6 | Formula-driven filled/total counts | Two formula errors (PC-04) |

### Current headcount (from RS, 2026-11-03)
12 filled roster slots out of 134 sworn slots; 5 filled division slots. Every filled
member shows "0 Points (Safe)". These are real figures and the only ones the app may show
until it holds its own data.

## 2. Source-of-truth matrix

**Recommendation:** Phase in the database as the system of record per domain. The
spreadsheet stays authoritative for personnel until leadership approves a cut-over; the
app imports from it read-only with a preview and dry run. No automatic write-back to the
sheet.

| Domain | Authoritative today | Proposed (after M2) | Sync direction | Notes |
|--------|--------------------|---------------------|----------------|-------|
| Ranks & rank order | RS + RSR (missing) | DB config, seeded from RS | One-time seed | PC-12, PC-13 |
| Personnel identity (name, Discord ID, Roblox) | RS Roster + Hire Logs | DB, after verified Discord sign-in | Sheet → DB import (preview, dry run) | Discord ID is the stable key; names are not trusted for matching |
| Call signs | RS Roster | DB (unique constraint) | Sheet → DB | Department X-### and division prefixes are stored separately |
| Appointments / chain of command | RS Roster | DB | Sheet → DB | Appointment ≠ rank |
| Districts | RS (North X-4xx, South X-5xx) | DB | Seed | PC-11 |
| Divisions & division roles | RS Divisions | DB | Sheet → DB | Only the 6 units on RS, plus Field Training (RS Roster) |
| Fleet authorizations | RS Vehicles | DB, edited by authorized admins with audit | One-time seed | PC-22 |
| Hire / separation dates | RS Hire Logs | DB | Sheet → DB | |
| Disciplinary records | RS Records (empty) | DB, restricted | None needed (empty) | PC-19, PC-21 |
| Patrol hours | **No system identified** | DB (server timestamps) | — | PC-15 needs confirmation |
| LOA / requests | Not tracked in provided sources | DB | — | PC-16 |
| Training progress & PTO | Not tracked in provided sources | DB | — | PC-06 |
| Policies (text) | HB, UoF (Google Docs) | **Google Docs stay authoritative** | Link + version metadata | The app shows summaries clearly labelled as summaries |
| Incident reports | AnchorCAD | AnchorCAD | None | No competing report system; link only |
| Recruitment applications | Google Form | Undecided | — | PC-24 |

## 3. Import rules (for Milestone 2)

1. Match rows on **Discord user ID** only. Name-only rows import as *unlinked* and need manual reconciliation.
2. A call sign present on two rows is a conflict; the import stops for that row and reports it.
3. Every run produces a preview (create / update / unchanged / conflict) and requires an explicit confirm by an authorized user.
4. Each run records source revision ID, timestamp, actor and per-row outcome.
5. Imports never delete. Members missing from the sheet are flagged for review.
6. The sheet's formulas and formatting are never touched (read-only scope).
