# 0011: AG-UI 1.0 with hand-built events

## Status
Accepted

## Date
2026-11-04

## Context
The assistant streams to the frontend and now pauses for questions ([0010](0010-confirm-gate-and-ask-user.md)). The earlier plan used a home-made SSE format (`text`, `tool`, `ask`, `done`, `error`) with a separate `/resume` endpoint. AG-UI is an open protocol for agent-to-UI streams with a ready client (`@ag-ui/client` `HttpAgent`). Version 1.0 has interrupts built in: a paused run ends with `RUN_FINISHED` carrying `outcome: {type: "interrupt", interrupts}`, and the next run answers it with `resume: [{interruptId, status, payload}]`.

## Decision
Use AG-UI 1.0 (`ag-ui-protocol==1.0.0`, pinned) for `POST /api/assistant`. **[Owner]**
- Events are built by hand from `ag_ui.core` types, mapped from `agent.astream`, and encoded with `EventEncoder`.
- One endpoint takes `RunAgentInput`; a resume is the same request with `resume[]` set.
- `today` travels in `forwardedProps`.
- The server ignores the client's message history except the last user message ([0009](0009-server-side-conversations.md)).
- `status: "cancelled"` dismisses a question.

## Alternatives Considered

### Home-made SSE events
- Rejected: needs a custom client in the frontend, and interrupts and resume would be our own invention.

### `ag-ui-langgraph` adapter (0.0.47)
- Pros: a ready FastAPI endpoint and LangGraph mapping, aware of deepagents.
- Rejected: our design would need four workarounds:
  - it sends multiple resume answers as one `__agui_resume_map__` value instead of `{interrupt_id: value}`;
  - it passes run context as a plain dict, not our `JournalContext`;
  - it streams `str(exc)` in `RUN_ERROR`, breaking the "no internal details" rule;
  - it rewinds threads when client message ids differ from the checkpoint, which server-owned history doesn't want.

  It is also a 0.0.x package of about 7k lines with an extra dependency.

## Consequences
- The backend owns the mapper: text start/content/end, tool-call events only for journal tools and `ask_user`, one `RUN_FINISHED` collecting all interrupts, and `RUN_ERROR` with a fixed message.
- The frontend can use `@ag-ui/client` and must be on a version that supports 1.0 interrupt outcomes and `resume[]`. Older AG-UI clients use a LangGraph-specific resume.
- Thread history (`GET /api/assistant/threads/{id}`) returns AG-UI `Message`s and `Interrupt`s, so a reload can preload the client.
- The 409/422 rules for pending questions are ours; the protocol does not define them.
