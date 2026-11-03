# Working on this repo

- Read docs/IMPLEMENTATION_STATUS.md first; it records what is done and what is blocked.
- Never commit roster data (Discord IDs, Roblox usernames) or secrets: the repo is public.
- Never invent TPD policy. Cite HB/UoF/RS sections; open questions go in docs/POLICY_CONFLICTS.md.
- No production deploys without dede's explicit approval.
- Authorization lives in lib/authz `can()`; hiding UI is never the check.
