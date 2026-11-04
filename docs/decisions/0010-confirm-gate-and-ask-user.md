# 0010: Hard confirm gate and `ask_user`, both via `interrupt()`

## Status
Accepted

## Date
2026-11-04

## Context
Task 7 enforced confirmation only through the prompt: the model was told to say what it would change and wait. Nothing stopped a model from writing anyway. The agent also needs a way to ask the user a question with structured answers.

## Decision
**[Owner]**
- `AskConfirmMiddleware` (custom, `awrap_tool_call`) pauses every `add_task` and `set_task_status` with LangGraph `interrupt({"reason": "confirm", "message", "tool_call_id"})`. The question is written from the call's arguments; for a status change it uses the task's text.
  - Only `"yes"` runs the tool. `"no"` or a dismissal returns "User declined this change. Do not retry unless asked."
  - If the task id is malformed or unknown, no question is asked, and the tool returns its error.
- `ask_user(question, type, options)` with types `single_choice`, `multi_choice` and `free_text` pauses the same way. A dismissal returns "User skipped the question."
- The prompt no longer asks the model to confirm in text.
- Several pending questions are answered together, matched by interrupt id: `Command(resume={id: value})`, checked on deepagents 0.7.32.

## Alternatives Considered

### Prompt-only confirmation (Task 7)
- Rejected: it isn't enforced.

### Built-in `interrupt_on` / `HumanInTheLoopMiddleware`
- Pros: ready-made, and applies to subagents.
- Not chosen **[Owner]**: its payload (`action_requests`/`review_configs`, `decisions`) would need converting to our flat interrupt shape. A custom gate is safe because subagents are off ([0008](0008-deep-agent-without-subagents.md)).

## Consequences
- No journal write happens without a "yes", whatever the model does.
- Resuming re-runs the paused tool node from the start, and `interrupt()` then returns the answer. Code before `interrupt()` must be safe to run twice.
- Parallel tool calls produce separate pauses. They arrive as separate stream updates, not in call order, so clients match answers by id, never by position.
- The interrupt values already have the AG-UI `Interrupt` shape ([0011](0011-ag-ui-protocol.md)).
