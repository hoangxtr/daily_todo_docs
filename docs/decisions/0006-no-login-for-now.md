# 0006: No login for now

## Status
Accepted

## Date
2026-10-22 (written 2026-11-04)

## Context
The app is for one user and runs on the owner's laptop. Hosting is not decided.

## Decision
No authentication and no accounts. **[Owner]**

## Alternatives Considered
Not recorded at the time. Login is listed as a non-goal "for now".

## Consequences
- The API is open to anyone who can reach its URL. CORS (`CORS_ORIGINS`) limits browsers, not other clients.
- The assistant endpoint spends the owner's model budget on every call, so an exposed backend could be used to spend it.
- Revisit before the app is reachable by anyone else: hosting and login are one open question (`project-description.md` §12). That will need a new ADR that supersedes this one.
