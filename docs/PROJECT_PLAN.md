# Project Plan

Production deploys require dede's explicit approval. Preview deploys only otherwise.

| # | Milestone | Acceptance criteria | Depends on |
|---|-----------|---------------------|------------|
| 0 | Discovery | Sources read and cited; requirements, source-of-truth matrix, conflicts and architecture written; reference sites reviewed in a browser | — |
| 1 | Design system & shell | Tokens (light/dark), type scale, core components; public layout and HQ shell; 8 representative screens (home, dashboard, patrol, roster, training, division, command, requests) reviewed at 1440/1024/768/390 px with screenshots; no horizontal overflow; keyboard navigable; axe shows no serious violations | 0 |
| 2 | Auth & personnel | Discord sign-in end to end; pending/active/suspended states; capability engine with unit tests incl. escalation attempts; RLS tests; personnel schema; roster import with preview, dry run and conflict report; searchable roster | 1, Discord app credentials, Supabase project |
| 3 | Officer experience | One-click patrol with DB-enforced single session; refresh/multi-tab/double-click tests; stale-session job; weekly totals with configurable week; corrections workflow; AnchorCAD launch | 2, PC-14, PC-15 |
| 4 | Administration | Request center + LOA rules; personnel actions (hire, promote, transfer, separate) with audit; approval center; division workspaces with assignment rules; command dashboard from real data | 3, PC-16, PC-07/08 for §9.4 |
| 5 | Training & public services | Probationary pathway; PTO workspace; qualifications; recruitment (link or native per PC-24); commendations/complaints; ride-along requests | 4, PC-06 |
| 6 | Integrations | Discord bot (if authorized); Sheets sync monitoring; notifications outbox; failure recovery tests | 5, bot token |
| 7 | Release hardening | All gates in the master prompt §31 verified and recorded in TEST_RESULTS.md / SECURITY_REVIEW.md | 6, deploy approval |

Work on M1 can proceed now. M2 onward needs the external items listed in
IMPLEMENTATION_STATUS.md.
