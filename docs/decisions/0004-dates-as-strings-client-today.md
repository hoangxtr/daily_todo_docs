# 0004: Dates as strings; the client decides "today"

## Status
Accepted

## Date
2026-10-22 (written 2026-11-04)

## Context
Everything in the app is keyed by calendar day: tasks, notes, carry-over, review periods. "Today" is the owner's local day, which is not necessarily the server's.

## Decision
Days are calendar dates `YYYY-MM-DD`, stored and sent as strings, never timestamps. "Today" comes from the browser's local date and is sent by the client (`?today=`, and `forwardedProps.today` for the assistant). The server never decides what today is. **[Call]**

## Alternatives Considered

### Timestamps
- Rejected: a timezone conversion can move a task to another day.

### Server-side "today"
- Rejected: the server's clock and timezone need not match the owner's day, and the carry-over sync runs on "today" ([0005](0005-carry-over-copy-chains.md)).

## Consequences
- Every endpoint that depends on today takes it as input and validates it like any other date (bad value → 422).
- Tests can pin any day without faking the clock.
- The assistant's prompt shows the request's today, filled in on every run ([0009](0009-server-side-conversations.md)), so a conversation can span days.
