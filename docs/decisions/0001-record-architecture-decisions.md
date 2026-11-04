# 0001: Record architecture decisions

## Status
Accepted

## Date
2026-11-04

## Context
Decisions so far live as one-line rows in `project-description.md` §11 and as **[Owner]**/**[Call]** marks in `design.md`. Those say *what* was decided but rarely *why*, or what was rejected. The assistant work of 2026-11-04 reversed an earlier decision (browser-held conversations) and rejected several options after testing them; without a record, an agent or the owner later could re-propose them. `WORKING.md` requires each fact to have one home.

## Decision
Keep Architecture Decision Records in `docs/decisions/`, one Markdown file per decision. Split the homes:
- `docs/decisions/`: why, alternatives, consequences.
- `design.md`: how the system works now.
- `project-description.md` §11: the one-line product decision.

**[Owner, 2026-11-04]**

## Alternatives Considered

### Expand `project-description.md` §11 into ADR-style entries
- Pros: no new folder.
- Rejected: the file would grow far beyond a product description.

### Keep decisions only in `design.md` marks
- Rejected: no place for rejected options, so they get re-proposed.

## Consequences
- `WORKING.md`'s "Where things live" table gains a row for decisions.
- A significant new decision gets an ADR in the same sitting it is made, next to the `design.md` update.
- The ADRs written after the fact (0002–0007) only record reasons the docs already had.
