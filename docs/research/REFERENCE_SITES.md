# Reference Site Review

Reviewed 2026-11-03 in a real browser (Playwright, 1440×900 and 390×844) plus page
fetches. Private areas were **not** accessed; each redirects to a Discord sign-in gate,
so portal features below are what the public pages claim, not what was observed.
No design or code was copied.

| | Pinellas County SO (cwpcso.com) | Florida Highway Patrol (cwfhp.xyz) | Hillsborough County SO (hcsowebsite.vercel.app) |
|---|---|---|---|
| Look | Dark, photo hero, condensed all-caps display type, silver/grey | Dark, warm gold accent, condensed italic display type, stat strip | Dark navy, photo hero, gold + green accents, stat cards |
| Public IA | Home, Ride Along, About ▾, Divisions ▾, Services ▾, Careers | Home, About, Divisions, Organization, Apply (external) | Home, Team, Divisions |
| Notable public features | Quick-access service bar, interactive district map, commendation/complaint intake, records requests | Division cards with hiring status (accepting / closed / on hold), dated announcements | Chain of command with callsign scheme, SOP summaries, "mass shift" explainer |
| Sign-in | Discord, requires ToS + Privacy checkbox, "must be in the Discord server" | Discord, returns to `/me` | Discord, returns to `next` |
| Portal (claimed) | Not described | Dashboard, roster, LOA | Clock in/out, shift logs, reports, SOP acknowledgement, division applications |
| Disclaimer | Red banner: roleplay, call 911 | Thin top bar: not affiliated with State of Florida | Footer; asks visitors not to enter real personal info |
| Mobile | Sign-in page clean at 390 px | Hamburger menu, readable at 390 px | Mobile menu toggle present |

## What works
- Discord as the only sign-in, gated on server membership (all three).
- Division cards that show hiring status (FHP) — useful and cheap to maintain.
- A visible roleplay disclaimer (all three; PCSO's is the clearest).
- Clear separation of public vs. "personnel only" with a friendly gate page (FHP).
- Self-service SOP acknowledgement and clock-in (HCSO, claimed).

## Weaknesses to beat
- **Visual sameness:** all three are dark, photo-heavy hero pages with oversized condensed type. A calm, light-first, typographically refined design will stand out and read as more "official".
- **Vanity stats:** stat strips (ranks, divisions, SOP count) carry little meaning; FHP's headcount is useful but unexplained. TPD will show only live, meaningful figures (staffing vs. capacity, open divisions).
- **Content errors:** FHP's announcement gives a reopening date of "November 31st". Dates in TPD should be machine-generated and validated.
- **External application:** FHP sends applicants to a third-party form; status is invisible to the applicant.
- **Thin public utility:** few sites explain *how* a member's week works (activity requirement, LOA, training path). TPD's public "Join" page can lay out the real pathway from HB §3.1.
- **Unknown portal quality:** none of the portals could be evaluated. TPD should not assume parity; it should define its own bar (see REQUIREMENTS.md).

## Direction for TPD
- Light warm-neutral default with a true dark theme, navy text, restrained police blue, gold only for rank/insignia.
- Public site organised around three audiences: the public (services, complaints, commendations), applicants (pathway, requirements, apply), members (sign in).
- One shared design system between public site and HQ so the hand-off feels continuous.
- Private HQ built like a productivity app (sidebar, command palette, tables), not a marketing site with a login.
