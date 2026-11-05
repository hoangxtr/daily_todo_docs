# Architecture decisions

One file per decision: why it was made, what else was considered, and what follows from it. **How** the system works lives in `../design.md`; the one-line list of product decisions lives in `../project-description.md` §11.

ADRs 0002–0007 were written on 2026-11-04 from `design.md` and `project-description.md`, after the decisions were made. Where those docs record no alternatives, the ADR says so instead of inventing them.

Rules:
- Number new ADRs in sequence (`NNNN-short-title.md`), using the headings of the existing ones.
- Don't edit an accepted ADR's decision. If it changes, write a new ADR, set the old one's status to "Superseded by NNNN", and link the two.
- **[Owner]** = decided by the owner; **[Call]** = chosen by the writer and not yet confirmed (same legend as `design.md`).

| # | Decision | Status |
|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-mongodb-atlas.md) | MongoDB Atlas as the database | Accepted |
| [0003](0003-separate-repos-http-only.md) | Separate repos, linked only by the HTTP API | Accepted |
| [0004](0004-dates-as-strings-client-today.md) | Dates as strings; the client decides "today" | Accepted |
| [0005](0005-carry-over-copy-chains.md) | Carry-over as copy chains with a lazy, idempotent sync | Accepted |
| [0006](0006-no-login-for-now.md) | No login for now | Accepted |
| [0007](0007-langchain-swappable-model.md) | LangChain with a provider-swappable model factory | Accepted |
| [0008](0008-deep-agent-without-subagents.md) | Deep agent with subagents turned off | Accepted |
| [0009](0009-server-side-conversations.md) | Assistant conversations stored on the server | Accepted |
| [0010](0010-confirm-gate-and-ask-user.md) | Hard confirm gate and `ask_user`, both via `interrupt()` | Accepted |
| [0011](0011-ag-ui-protocol.md) | AG-UI 1.0 with hand-built events | Accepted |
| [0012](0012-day-page-focus-layout.md) | Day page "Focus & depth" layout | Accepted |
