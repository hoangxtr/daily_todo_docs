# 0005: Carry-over as copy chains with a lazy, idempotent sync

## Status
Accepted

## Date
2026-10-22 (written 2026-11-04)

## Context
Unfinished tasks must reach the next working day without retyping (goal: nothing unfinished is silently lost). The owner also wants each day to keep an honest record of what was left undone, and a carried task to count once in reviews.

## Decision
- **Copies [Owner]:** an unfinished task stays on its day, still open, and a copy is made on the next day the owner opens. Days in between are skipped.
- **Chains [Call]:** each copy stores `prev_id` and `origin_id`. Status changes (done, dropped, reopen) apply to the whole chain, and the chain counts once.
- **Sync [Call]:** copies are made lazily, whenever the client loads today. The sync gives every open chain whose latest copy is before today one copy on today. A unique index on `(origin_id, day)` makes repeated or concurrent syncs a no-op.

## Alternatives Considered

### Move the task to the next day
- Rejected **[Owner]**: the original day would lose its record of what was left undone.

### Copy only from the previous day
- Rejected: a task added or reopened on a past day after today was opened would never reach today. Looking at open chains handles that case.

### A scheduled job that fills every calendar day
- Not recorded as considered. The lazy sync needs no scheduler, and weekends stay empty without a setting.

## Consequences
- History is honest, but reviews must count chains, not rows ("counts once").
- Delete removes the whole chain (a mistake); Drop keeps history (giving up).
- Correctness depends on the unique index, so `ensure_indexes` is part of startup and of the test setup.
- The assistant's tools reuse the same functions (`sync_today`, `set_status`), so carry-over and counting rules hold for assistant changes too.
