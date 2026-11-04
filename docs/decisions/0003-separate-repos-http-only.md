# 0003: Separate repos, linked only by the HTTP API

## Status
Accepted

## Date
2026-10-22 (written 2026-11-04)

## Context
The app has a Python backend and a TypeScript frontend, built mostly by AI agents working one task at a time.

## Decision
Two independent repos, `todo_app/backend` (daily_todo_be) and `todo_app/frontend` (daily_todo_fe), with no shared code and no monorepo tooling. The HTTP API is the only link. Docs, plans and status live in a third repo, `todo_app` (daily_todo_docs). **[Owner]**

## Alternatives Considered
Not recorded at the time. This was the owner's choice.

## Consequences
- Each repo installs, runs and tests from its own folder, with its own `CLAUDE.md`, agent and CI.
- API shapes are written twice (Pydantic and TypeScript). Any request or response change is a contract change: backend tasks come first in a plan and define it.
- Code repos refer to `../docs/...`, so the three must be cloned side by side.
- One feature can mean PRs in two or three repos.
