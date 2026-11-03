# Policy Conflicts & Open Questions

Items where the official TPD sources disagree, are incomplete, or leave a rule the
software must enforce undefined. **None of these are resolved by the application.**
Where the app needs a working value before leadership answers, it uses a
*configurable* default (marked **Interim default**) that can be changed without a
code change, and the UI labels it as pending confirmation.

Sources (read 2026-11-03):

- **HB** — Personnel Policy & Procedures Handbook, effective 2026-10-30, approved by Chief of Police J. Quinellope.
- **UoF** — Use of Force Policy, 2026-10-30.
- **RS** — "Tampa Police Department Roster" spreadsheet (tabs: TPD Roster, TPD | Divisions, TPD | Vehicles, TPD | Hire Logs, TPD | Records, TPD - Numbers by Rank).
- **GF** — Google Form "Tampa Police Department" (recruitment application).

Severity: **Blocking** = a feature cannot be finalized without an answer. **High** = the
app would otherwise have to guess at authority. **Low** = cosmetic or data hygiene.

---

## A. Organization & divisions

### PC-01 · Subdivisions named in policy do not exist on the roster — High
HB §9.3 restricts **CIB** (standalone, no other subdivision) and **VCAT + Traffic Unit**.
RS lists none of CIB, VCAT, or "Traffic Unit". RS has *Traffic Interdiction Unit* ("Tango").
**Question:** Is the Traffic Interdiction Unit the "Traffic Unit" in §9.3? Are CIB and VCAT planned units?
**Interim default:** Rules are stored as configuration keyed to division IDs. The CIB and
VCAT rules stay dormant until those divisions exist. The VCAT/Traffic rule is **not**
applied to the Traffic Interdiction Unit until confirmed.

### PC-02 · Subdivision call sign table is unfinished — Low
HB §9.1 lists only SWAT = "A (Adam)". The other rows read "TBD / Callsign Phoenic".
RS already uses W (Whiskey, Waterfront), T (Tango, Traffic Interdiction), PA, IA,
D (Delta, Strategic Operations), A (Adam, SWAT).
**Question:** Should HB §9.1 be updated to match the roster prefixes?
**Interim default:** Roster prefixes are used for display.

### PC-03 · Strategic Operations Division prefix mismatch — Low
RS Divisions tab: "Strategic Operations Division 'Delta'" with call signs D-01…D-10.
RS Numbers by Rank tab: "Strategic Operations Division (K)".
**Question:** D or K?

### PC-04 · Division totals formulas report 0 / 0 — Low
RS Numbers by Rank shows Internal Affairs Division 0/0 and Strategic Operations 0/0,
although the Divisions tab has 6 IA and 10 SOD slots. The "TPD Divisions 5 / 51" total
therefore under-counts. Likely a formula range error. The app will compute its own
totals and will not import these cells.

### PC-05 · "TBD Commander" slot — Low
RS TPD Roster has a Captain row "TBD Commander" with no call sign. No division is
attached. **The app will not create a division for it.**

### PC-06 · Field Training Division vs. Office of the Chiefs authority — High
HB §3.1: the **Office of the Chiefs (OOTC)** oversees all probationary training, selects
and approves every PTO, and grants independent-patrol approval.
RS: a **Field Training Division** Commander (X-319, Captain) and Assistant Commander
(X-320, Lieutenant), and probationary officers are assigned to "Field Training Program".
**Question:** What can FTD command do — assign trainees to PTOs, record evaluations,
recommend completion? Is final independent-patrol approval OOTC-only, or delegated?
**Interim default:** FTD command may manage training records and *recommend*;
only OOTC can approve PTOs and grant independent patrol (HB text).

### PC-07 · Operational branches vs. roster appointments — Blocking (for §9.4 enforcement)
HB §9.4 defines three branches: **Administrative Operations, Patrol Operations, Special Operations**.
RS uses **Administrative Operations, Divisional/Division Operations, Patrol Operations**
(Assistant Chief "Divisional Operations", Major X-202 "Division Operations").
**Question:** Is "Division Operations" the same branch as "Special Operations"? Which
branch does each division (OPA, IA, TIU, SWAT, Waterfront, SOD, FTD) belong to?
Major X-201 is "Administrative Operations (IA | OPA)", which suggests IA and OPA are
Administrative; the rest are unassigned.

### PC-08 · "Command+" is undefined — Blocking (for §9.4 enforcement)
HB §9.4 applies only to "Command+ personnel". Neither HB nor RS defines the term.
RS groups "Command Staff" (Majors, district Captains) separately from "Division
Command" (Captains, Lieutenants) and "Office of the Chiefs".
**Question:** Which ranks are Command+ (Captain and above? Lieutenant and above? Command Staff section only)?

### PC-09 · Division role titles differ between tabs — Low
TPD Roster: "Internal Affairs Division Commander / Assist. Com." and "Office of Public
Affairs Commander / Assist. Com."
TPD | Divisions: "Director / Deputy Director of Internal Affairs Operations" and
"Director / Deputy Director of Public Affairs Operations".
**Interim default:** The app separates **department rank** (Captain) from **division
role** (Director), so both can be shown. Please confirm the preferred titles.

### PC-10 · Office of Professional Standards referenced but absent — Low
HB §15 directs policy questions to "the Office of Professional Standards". No such unit
is on RS. **Question:** Is this Internal Affairs, or a planned unit?

### PC-11 · North District header missing on roster — Low
TPD Roster has a "★ | South District | ★" header above X-501…X-552 but the X-401…X-452
block has no district header. Appointments ("North District Supervisor") and the
Numbers by Rank tab imply X-4xx = North. **Interim default:** X-4xx = North, X-5xx = South.

## B. Ranks

### PC-12 · Rank Structure & Responsibilities document not provided — High
HB §9 names it the primary reference for rank duties. It was not supplied and could not
be located. The app's rank list comes from RS: Chief of Police, Deputy Chief, Assistant
Chief, Major, Captain, Lieutenant, Sergeant, Corporal, Senior Officer, Officer,
Reserve Officer, Probationary Officer.
**Request:** Share the document (or confirm RS is complete).

### PC-13 · Rank ordering of Reserve Officer — High
RS lists Reserve Officer after Probationary Officer (Roster and Vehicles), yet grants
Reserves the same vehicles as Officers, and Numbers by Rank counts Reserves inside the
Patrol Bureau but Probationary Officers outside "Active Duty". Seniority between the two
affects every "X and above" rule.
**Question:** Where does Reserve Officer sit, and does the 3-hour weekly requirement apply to Reserves?
**Interim default:** Reserve is a separate track, treated like Officer for vehicles
(as RS states) and subject to the 3-hour requirement (HB §3.2 says "all TPD personnel").

## C. Activity, leave, timekeeping

### PC-14 · Week boundary and timezone undefined — Blocking (for compliance math)
HB §3.2 requires 3 hours "per week" but defines neither the start day nor the timezone.
Members are in PST, MST, CST and EST (RS).
**Question:** Which day does the activity week start, and in which timezone?
**Interim default:** Monday 00:00 America/New_York (Tampa local time), configurable.

### PC-15 · What counts as "documented patrol activity" — High
HB §3.2 / §6 require accurate shift start and end logging but do not say where. If the
website's patrol clock becomes the system of record, leadership should say so, and say
whether time logged elsewhere (e.g. AnchorCAD, Discord) still counts.
**Question:** Is the website patrol log the official record of patrol hours?

### PC-16 · Who approves LOA requests and activity corrections — High
HB §5.4 says *extensions* beyond 2 weeks require the Chief of Police or designee, but
does not say who approves an ordinary LOA of ≤ 2 weeks. HB §6 says shift errors are not
corrected "without justification" but does not name the reviewer.
**Interim default:** Requests route to the member's chain of command
(Sergeant → Lieutenant → district Captain); no request auto-approves. Extensions route to
OOTC.

### PC-17 · Exemption types beyond LOA and probation — Low
HB §3.2 lists exemptions for "department assignments", "training requirements",
"personal circumstances approved by command staff", and "other circumstances".
**Interim default:** The app records an exemption with its type, approver, reason, and
date range; it never creates one automatically except for probationary status and
approved LOA, which HB grants explicitly.

### PC-18 · "Pay deductions" — Low
HB §6 mentions "pay deductions". There is no pay system on RS. The app will not model pay.

## D. Discipline

### PC-19 · Disciplinary point thresholds undefined — High
HB §13 assigns points (Warning 1, Strike 3, Blackmark 5). RS shows "0 Points (Safe)" for
every member, implying status bands ("Safe", …) that are not documented anywhere.
**Question:** What are the bands and point thresholds, and do points expire?
**Interim default:** The app totals points and shows the raw number only. It applies no
automatic consequence (no auto-termination, no auto promotion lock).

### PC-20 · Naming: "Infraction" vs "Warning" — Low
HB §13 lists "Infraction: Warning (1 Point)". The master prompt calls it "Warning".
The app will use HB wording.

### PC-21 · Who may discipline Lieutenants and above — High
HB §13.1: Lieutenant+ may issue formal discipline. It does not say whether a
Lieutenant may discipline another Lieutenant or a superior.
**Interim default:** An issuer must outrank the subject, or be OOTC/IA. Sergeants may
only document and escalate unless the Chief grants a recorded exception.

## E. Fleet

### PC-22 · Fleet tab and the "Vehicle Database" — Low
HB §11 refers to an official "Vehicle Database maintained by command staff".
The RS "TPD | Vehicles" tab appears to be it. Its two tables agree (Charger:
Probationary+, 2019 FPIU: Senior Officer+, 2024 FPIU: Sergeant+), and Corporal is
authorized for the 2019 FPIU per the matrix. **Question:** Confirm RS Vehicles is the
Vehicle Database, and whether division vehicles (Waterfront boats, SWAT, TIU) exist.

## F. Recruitment form

### PC-23 · Google Form defects — Low
The recruitment form has two required questions with placeholder choices
("How old are you?" and "What qualities do you believe make someone an effective
supervisor?" each show only "Option 1"). Q18 ("If yes, what positions…") is required even
when Q17 is "No". These should be fixed in the form itself; the app will not alter it.

### PC-24 · Form collects data the website would also collect — High
The form collects email, Discord username/ID, Roblox username, age and timezone.
**Question:** Should the website keep linking to the Google Form (simplest, nothing
changes), or replace it with a native application tied to Discord sign-in (verified
Discord ID, status tracking, reviewer workspace)? A native form should not ask for age
in a numeric form or for email unless leadership needs them.
**Interim default:** Link to the existing form; build the native flow only if approved.

## G. Records & privacy

### PC-25 · Discord IDs and Roblox usernames in a public repository — High
The tampaPD GitHub repository is **public**. Roster data (Discord IDs, Roblox usernames,
hire dates) must not be committed. The app will import roster data into the database at
runtime only; seed files will use fictional placeholder members.
