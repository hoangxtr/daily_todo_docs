# 0008: Deep agent with subagents turned off

## Status
Accepted

## Date
2026-11-04

## Context
The first plan ran the assistant on LangChain's `create_agent`, stateless. The redesign needs server-side threads ([0009](0009-server-side-conversations.md)), a hard confirm gate and `ask_user` ([0010](0010-confirm-gate-and-ask-user.md)). By default, deepagents' `create_deep_agent` adds a general-purpose subagent behind a `task` tool. That subagent inherits the journal tools but not custom middleware, so it could call `add_task` without passing the confirm gate.

## Decision
Use `create_deep_agent` (`deepagents==0.7.32`, pinned), with the general-purpose subagent disabled. **[Owner]** for the deep agent.
- Disabling the subagent means registering a harness profile with `GeneralPurposeSubagentProfile(enabled=False)` for the model's provider, and passing no `subagents=`.
- `subagents=[]` alone does not remove `task` (checked on 0.7.32).
- The agent then has the 4 journal tools, `ask_user`, and the sandbox file tools.

## Alternatives Considered

### `create_agent` + checkpointer + `HumanInTheLoopMiddleware`
- Pros: gives threads, the gate and `ask_user` with fewer tokens, fewer tools for the model, and one less dependency.
- Not chosen: the owner preferred the deep agent. With subagents off and `write_todos` absent, what it adds here is mainly summarisation of long threads and the sandbox file tools.

### Deep agent with subagents on, gate via built-in `interrupt_on`
- `interrupt_on` does apply to subagents.
- Not chosen: the owner chose a custom gate ([0010](0010-confirm-gate-and-ask-user.md)), which is only safe with subagents off.

## Consequences
- The profile is keyed by provider through `deepagents._models.get_model_provider`, a private helper that must be re-checked on every deepagents upgrade. Pin the version.
- Profiles are a beta API and differ per model. In 0.7.32 Gemini gets no profile and no `write_todos`, while OpenAI Codex models get `write_todos`. Changing `ASSISTANT_MODEL` can change the tool set; a test asserts that `task` is absent.
- In 0.7.32, deepagents adds no system prompt of its own for Gemini. The extra token cost is the file-tool descriptions.
- The sandbox file tools (including one named `delete`) only touch a virtual filesystem stored in the checkpoint, never the journal.
