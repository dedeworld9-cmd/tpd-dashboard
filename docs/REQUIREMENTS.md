# Requirements

Each business rule cites its source. Rules marked ⚠ depend on an open item in
[POLICY_CONFLICTS.md](POLICY_CONFLICTS.md) and ship with a configurable interim default.
TPD is a fictional department in the Florida State Roleplay (Roblox ER:LC) community;
every public page states this.

## 1. Business rules (policy → application logic)

### Activity & patrol
| ID | Rule | Source | Enforcement |
|----|------|--------|-------------|
| R-ACT-1 | Minimum 3 h documented patrol per week, department-wide | HB §3.2 | Weekly compliance = sum of closed, approved session minutes in the week ≥ 180 |
| R-ACT-2 | Divisions may not set their own activity quotas | HB §3.2 | No per-division quota setting exists in the data model |
| R-ACT-3 | Approved LOA exempts the member for its duration | HB §5.4 | Exemption derived from approved LOA dates; prorated weeks ⚠ PC-14 |
| R-ACT-4 | Probationary officers in PTO are exempt until approved for independent patrol | HB §3.2 | Exempt while `independent_patrol_approved_at` is null |
| R-ACT-5 | Other exemptions only when approved by command / chain of command | HB §3.2 | Manual exemption record with approver, reason, range; never automatic |
| R-ACT-6 | Non-compliance may lead to review, loss of assignment eligibility, promotion restriction, corrective action | HB §3.2 | Flag only. **No automatic consequence.** |
| R-ACT-7 | Week boundary and timezone | — | ⚠ PC-14 (interim: Monday 00:00 America/New_York) |
| R-SHIFT-1 | Shift start and end must be logged accurately | HB §6 | Server timestamps only; client time never trusted |
| R-SHIFT-2 | No retroactive correction without justification | HB §6 | Correction request with reason, reviewer and decision; original record immutable |

### Leave
| ID | Rule | Source | Enforcement |
|----|------|--------|-------------|
| R-LOA-1 | LOA ≤ 2 consecutive weeks | HB §5.4 | Form rejects > 14 days unless filed as an extension |
| R-LOA-2 | Extensions require Chief of Police or designee | HB §5.4 | Extension reviewer must hold `loa.extend.approve` (OOTC by default) |
| R-LOA-3 | Extension should be requested before current LOA expires | HB §5.4 | Warning (not a block) when filed after expiry |
| R-LOA-4 | Ordinary LOA approver | — | ⚠ PC-16 |
| R-LOA-5 | Resigning while on LOA uses the normal separation process | HB §5.4 | Resignation request available during LOA |

### Training
| ID | Rule | Source | Enforcement |
|----|------|--------|-------------|
| R-TRN-1 | New hires enter as Probationary Patrol Officers | HB §3.1 | Hiring sets rank = Probationary Officer |
| R-TRN-2 | Required modules: onboarding, policy review, AnchorCAD, radio, patrol procedures, PTO mentorship | HB §3.1 | Seeded training program with these six modules |
| R-TRN-3 | OOTC oversees probationary training; may train directly or assign a PTO | HB §3.1 | Trainee ↔ PTO assignment requires `training.assign_pto` |
| R-TRN-4 | PTOs are selected and approved by OOTC | HB §3.1 | `PTO` qualification grantable only by OOTC |
| R-TRN-5 | Independent patrol approval by OOTC | HB §3.1 | `training.approve_independent` (OOTC by default) ⚠ PC-06 |
| R-TRN-6 | Qualifications never auto-granted | Prompt §12 | Grant requires an authorized human action with evidence reference |

### Divisions & assignments
| ID | Rule | Source | Enforcement |
|----|------|--------|-------------|
| R-DIV-1 | Max 3 concurrent subdivisions, any rank | HB §9.3 | DB-level check on active memberships + server validation |
| R-DIV-2 | CIB is exclusive | HB §9.3 | Configurable exclusivity rule; dormant (no CIB) ⚠ PC-01 |
| R-DIV-3 | VCAT and Traffic Unit incompatible | HB §9.3 | Configurable incompatibility pair; dormant ⚠ PC-01 |
| R-DIV-4 | Command+ may hold only one operational branch (Administrative / Patrol / Special Ops) | HB §9.4 | Enforced once branch mapping and Command+ are defined ⚠ PC-07, PC-08 |
| R-DIV-5 | Chief of Police may approve exceptions to R-DIV-4 | HB §9.4 | Exception record (approver, reason, date) overrides the check |
| R-DIV-6 | Only divisions confirmed on the roster are created | Prompt §11 | Seed: Waterfront, Traffic Interdiction, OPA, IA, Strategic Ops, SWAT, Field Training |

### Field operations
| ID | Rule | Source | Enforcement |
|----|------|--------|-------------|
| R-OPS-1 | All field reporting in AnchorCAD exclusively | HB §10 | No report-writing feature. AnchorCAD launch link + guidance only |
| R-OPS-2 | Pursuits need Sergeant+ authorization and an on-duty supervisor | HB §7 | Shown as reference + "supervisor on duty" indicator from live patrol sessions. The app does not authorize pursuits. |
| R-OPS-3 | Bodycam footage retained 7 days when available, attached in AnchorCAD | HB §10.1 | Reference only |
| R-OPS-4 | Ride-alongs need the assigned officer's Sergeant+ approval | HB §12.1 | Ride-along request workflow, reviewer Sergeant+ |

### Fleet
| ID | Rule | Source | Enforcement |
|----|------|--------|-------------|
| R-FLT-1 | 2015 Charger: Probationary Officer & above | RS Vehicles | Rank × vehicle matrix |
| R-FLT-2 | 2019 FPIU: Senior Officer & above (incl. Corporal) | RS Vehicles | Matrix |
| R-FLT-3 | 2024 FPIU: Sergeant & above | RS Vehicles | Matrix |
| R-FLT-4 | Reserve Officer: Charger only | RS Vehicles | Matrix |
| R-FLT-5 | Fleet matrix maintained by command staff | HB §11 | Edit requires `fleet.manage`; every change audited |

### Discipline
| ID | Rule | Source | Enforcement |
|----|------|--------|-------------|
| R-DSC-1 | Infraction/Warning 1 pt, Strike 3, Blackmark 5; Suspension, Demotion, Termination | HB §13 | Action types with fixed points |
| R-DSC-2 | Only Lieutenant+ issue formal discipline | HB §13.1 | `discipline.issue` granted to Lt+ |
| R-DSC-3 | Sergeants document and escalate only, unless authorized by the Chief | HB §13.1 | Sergeants get `discipline.report`; exception grant recorded with approver |
| R-DSC-4 | Unauthorized pursuit ladder: Strike → 2-day suspension → termination | HB §7 | Shown as guidance to the issuer; never auto-applied |
| R-DSC-5 | Point thresholds / standing bands | — | ⚠ PC-19 — raw total only |
| R-DSC-6 | Members under investigation must surrender records when directed | HB §13.2 | IA can suspend a member's elevated capabilities, audited |

### Promotion
| ID | Rule | Source | Enforcement |
|----|------|--------|-------------|
| R-PRO-1 | Eligibility considers 3 h/week activity, report quality, leadership, discipline, performance | HB §9.2 | Shown to reviewers as context. **Not** an automatic gate. |

### Conduct & communications
| ID | Rule | Source | Enforcement |
|----|------|--------|-------------|
| R-COM-1 | Public communications managed by OPA | HB §14.1 | Public news/announcements publishable only with `news.publish` (OPA + OOTC) |
| R-COM-2 | Dual affiliation needs written Chief approval | HB §4.1 | Reference only; optional field on profile |
| R-COM-3 | Transfers out need 2 weeks of service after training and Chief approval | HB §5.1–5.2 | Transfer request workflow; eligibility shown, decision human |

## 2. Product requirements (summary)

- **Public site:** home, about, leadership, organization & ranks, districts, divisions, recruitment, policies (linked to official docs), news, events, commendations & complaints, contact, member sign-in. Roleplay disclaimer in header and footer; no real-world emergency claims.
- **Private HQ:** Overview, Patrol, Activity, Training, Department Hub, Personnel, Divisions, Resources, Requests, Supervisor Workspace, Command Center, Internal Affairs (restricted), Settings. Navigation filtered by capability; every server action re-checks authorization.
- **Identity:** Discord OAuth only. A Discord account gains access only after it is linked to a personnel record by an authorized user or by a verified roster import matched on Discord ID.
- **Patrol:** one-click start, server-authoritative timer, one active session per member (DB-enforced), stale-session policy, end patrol, weekly totals, correction requests.
- **Requests:** Draft → Submitted → Under Review → Approved / Denied / Withdrawn, with comments, history, assigned reviewer. No auto-approval.
- **Statistics:** only real data. Empty states, not fake numbers.

## 3. Non-functional requirements
- WCAG 2.2 AA contrast and keyboard access; respects `prefers-reduced-motion`.
- Works at 360 px through 1920 px.
- Light and dark themes.
- Free-tier infrastructure (Vercel Hobby, Supabase Free) where practical.
- No secrets in client bundles; service-role key server-only.
- Audit log is append-only at the database level.
