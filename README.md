# Tampa Police Department — Digital Headquarters

Public website and private operations platform for the **Tampa Police Department (TPD)**, a
fictional department in the Florida State Roleplay community on Roblox *Emergency Response:
Liberty County*. TPD is not a real government agency. For real emergencies call 911.

## Status
Milestone 1 (design system and representative screens) in review. The headquarters uses fictional sample data and has no sign-in yet. See [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).

## Development
```bash
npm install
npm run dev        # http://localhost:3000 (public) and /hq (headquarters preview)
npm run typecheck && npm run lint && npm run build
```

## Documentation
| Doc | Purpose |
|-----|---------|
| [PROJECT_PLAN](docs/PROJECT_PLAN.md) | Milestones and acceptance criteria |
| [REQUIREMENTS](docs/REQUIREMENTS.md) | Policy rules mapped to application logic |
| [DATA_SOURCES](docs/DATA_SOURCES.md) | Source inventory and source-of-truth matrix |
| [POLICY_CONFLICTS](docs/POLICY_CONFLICTS.md) | Questions for leadership |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Stack, auth, permissions, schema |
| [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) | Tokens, type, layout, components |
| [TEST_RESULTS](docs/TEST_RESULTS.md) | What was tested and how |
| [research/REFERENCE_SITES](docs/research/REFERENCE_SITES.md) | Review of peer department sites |

## Data handling
This repository is public. Never commit roster data (Discord IDs, Roblox usernames) or
secrets. Seed data uses fictional placeholder members.
