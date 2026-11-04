# 0009: Assistant conversations stored on the server

## Status
Accepted. Reverses the first design in `design.md` §7a ("kept in the browser tab only … nothing stored in MongoDB"), which predates these ADRs.

## Date
2026-11-04

## Context
In the first design the browser held the conversation and resent it on every message. The assistant can now pause a run to ask the user something ([0010](0010-confirm-gate-and-ask-user.md)). A paused run has to survive a reload and a server restart, and the owner wants a thread list and history.

## Decision
The server owns conversations. **[Owner]**
- Agent state, messages and pending questions live in a LangGraph `MongoDBSaver` checkpointer (`langgraph-checkpoint-mongodb==0.5.1`) in the main database.
- An `assistant_threads` collection holds the list rows `{_id, title, created_at, updated_at, pending}`.
- The client creates the thread id and sends only its new message.
- Per-run objects (`db`, `today`, `changed`) go in LangGraph's runtime `context`, not in `config["configurable"]`.
- The prompt's date is filled in on every run, because a thread can span days.

## Alternatives Considered

### Keep the history in the browser
- Rejected: a pause and its resume would have to be rebuilt from client-held data, and a reload would lose them. There would also be no thread list.

### Our own messages collection without a checkpointer
- Not chosen: LangGraph's `interrupt()` and resume need checkpointed graph state anyway.

## Consequences
- The `pending` flag on the row is only a copy, for the list. The 409/422 checks read the checkpointer (`aget_state`). After a stream ends, including when it is cut off, the row is updated in a shielded `finally`.
- The checkpointer needs a sync `MongoClient` alongside the app's async one; its async methods run in a thread pool.
- Agent state (including sandbox files) is stored in the main database; tests use the throwaway test database.
- Renaming and deleting threads are not built. A thread with a pending question accepts only an answer or a dismissal.
- In rare cases a write can be saved to the journal before LangGraph saves that step. The thread then shows the call as cancelled although the task was written.
