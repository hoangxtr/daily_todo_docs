# `ask_user` in conversation history — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Dispatch `journal-backend` for Task 2 and `journal-frontend` for Task 3, both with `model: "sonnet"`.

**Goal:** A finished `ask_user` question shows in the conversation as an assistant message and the user's answer as a user message, live and after a reload.

**Architecture:** `GET /api/assistant/threads/{id}` already maps the checkpoint's messages to `{messages, pending}`. It will also read each answered `ask_user` tool call: the call's `question` becomes an `AssistantMessage`, the matching `ToolMessage` becomes a `UserMessage`. The agent's state is untouched, so the model sees no extra user turn. The panel appends the question as an assistant line when the user answers, so the live view equals the reloaded one.

**Tech Stack:** FastAPI, LangGraph/deepagents, `ag_ui.core` message types (backend); React 18, TypeScript, Vitest (frontend). No new dependencies.

**Spec:** `docs/design.md` §6 (API table) and §7a (assistant panel); `docs/plans/2026-11-05-assistant-panel.md` for the existing panel behaviour. Code: `backend/app/assistant/routes.py` (`thread_history`), `backend/app/assistant/tools.py` (`ask_user`, `SKIPPED`), `frontend/src/pages/AssistantPanel.tsx` (`answer`, `toMsgs`).

## Global Constraints

- Contract change on `GET /api/assistant/threads/{id}` only: same `{messages, pending}` shape, more messages. `POST /api/assistant`, the checkpoint and what the model sees do not change.
- Scope is `ask_user`. The confirm gate (`add_task`, `update_task`) is out: its `Yes`/`No` line stays client-only.
- Order in `messages`: the `AIMessage`'s own text (if any), then for each of its `ask_user` calls in call order, the question then the answer.
- Message ids: `<tool_call_id>:q` and `<tool_call_id>:a`.
- Answer text is the `ToolMessage` content; `SKIPPED` ("User skipped the question.") becomes `Skipped`, the word the panel already shows. Multi-choice answers arrive joined with `; `.
- A call with no `ToolMessage` yet (still pending) or whose `ToolMessage` starts with `Error` (invalid arguments, no question asked) adds no messages.
- Checks: BE `uv run pytest`, `uv run ruff check .`, `uv run ruff format --check .`; FE `npm test`, `npm run typecheck`, `npm run lint`. **One PR per repo for the whole feature [Owner, 2026-11-07]:** backend gets one branch and one PR (Task 2), frontend gets one branch and one PR (Task 3); everything else for that repo (README, tests, fixes from review) goes into the same PR as extra commits, never a second PR. The docs repo (Tasks 1 and 4) commits straight to `main` as usual. Never merge.

## Review Focus

1. A paused thread returns the open question only in `pending`, never also in `messages` (Task 2, `test_history_ask_user_pending`).
2. Two `ask_user` calls in one `AIMessage` pair each answer with its question by `tool_call_id`, in call order (Task 2, `test_history_two_ask_user_calls`).
3. A dismissed question reads `Skipped` (Task 2, the skipped case of `test_history_ask_user_answered`).
4. A failed resume removes the question and answer lines it added, and a retry adds them once (Task 3, `failed resume removes both lines`).
5. A call rejected for bad arguments shows no question and no answer: the `Error` skip in Step 3 is a one-line guard, left untested on purpose.

---

### Task 1: Design docs (main session, docs repo)

**Files:**
- Modify: `docs/design.md` (§6 `GET /api/assistant/threads/{id}` row; §7a panel text)
- Modify: `docs/STATUS.md`

- [x] **Step 1:** In `design.md` §6, change the `GET /api/assistant/threads/{id}` row to say `messages` holds user and assistant text plus each answered `ask_user` question (assistant) and answer (user).
- [x] **Step 2:** In `design.md` §7a, say answered questions stay in the conversation as an assistant line and a user line, and the confirm gate's `Yes`/`No` line is client-only. Mark **[Owner, 2026-11-07]**.
- [x] **Step 3:** In `STATUS.md`, add this plan under "Next up" and update the date.
- [x] **Step 4:** Commit and push the docs repo.

```bash
git add docs/design.md docs/STATUS.md docs/plans/2026-11-07-ask-user-history.md
git commit -m "docs: ask_user in history design and plan"
git push
```

### Task 2 (BE): history includes answered questions

**Files:**
- Modify: `backend/app/assistant/routes.py` (`thread_history`, lines 233-256)
- Test: `backend/tests/test_assistant_route.py` (next to `test_history`)

**Interfaces:**
- Consumes: `SKIPPED` from `app.assistant.tools`; `ToolMessage` from `langchain_core.messages`; the test helpers `script`, `call`, `pause`, `interrupts`, `yes`, `body`, `URL` already in that test file.
- Produces: `GET /api/assistant/threads/{id}` → `messages` containing, per answered `ask_user` call, `{id: "<call id>:q", role: "assistant", content: <question>}` then `{id: "<call id>:a", role: "user", content: <answer>}`. Task 3 relies on these ids and roles.

- [x] **Step 1: Write the failing tests**, all `@pytest.mark.mongo_saver`, three in total (the major paths only):
  - `test_history_ask_user_answered`, parametrized `("single_choice", answer "Tomorrow")` and `("single_choice", cancelled → "Skipped")`: run, resume, GET → `[first user message, assistant question (id ends :q), user answer (id ends :a), final assistant reply]`.
  - `test_history_ask_user_pending`: paused → `messages` is only the first user message and `pending` has one entry.
  - `test_history_two_ask_user_calls`: one `AIMessage` with two `ask_user` calls (ids `c1`, `c2`), answered together → `c1:q, c1:a, c2:q, c2:a` in that order, each answer matching its call.
- [x] **Step 2: Run to verify they fail**

Run: `cd backend && uv run pytest tests/test_assistant_route.py -k history_ask_user -v`
Expected: the answered and two-call tests FAIL (no `:q`/`:a` messages); the pending test may pass already and stays as a regression check.

- [x] **Step 3: Implement** in `thread_history`: first build `answers = {m.tool_call_id: m.content for m in messages if isinstance(m, ToolMessage)}`. For every `AIMessage`, after its existing text message, loop over `m.tool_calls` where `name == "ask_user"`, skip when `c["id"]` is not in `answers` or the answer starts with `Error` (`# ponytail: the tool returns errors as text; check status if it starts raising`), else append `AssistantMessage(id=f"{c['id']}:q", content=c["args"]["question"])` and `UserMessage(id=f"{c['id']}:a", content="Skipped" if answer == SKIPPED else answer)`. The existing `m.text` guard applies to the text message only, not to this loop.
- [x] **Step 4: Run to verify they pass**

Run: `cd backend && uv run pytest && uv run ruff check . && uv run ruff format --check .`
Expected: all green.

- [x] **Step 5: Commit** on branch `feat/ask-user-history`, push, open the PR; the report says "contract change".

```bash
git add app/assistant/routes.py tests/test_assistant_route.py
git commit -m "feat: show answered ask_user questions in thread history"
git push -u origin feat/ask-user-history
```

### Task 3 (FE): the question joins the conversation

**Files:**
- Modify: `frontend/src/pages/AssistantPanel.tsx` (`answer`, lines 147-154, and its `ponytail` comment)
- Test: `frontend/src/pages/AssistantPanel.test.tsx` (next to the existing ask/answer tests)

**Interfaces:**
- Consumes: `pending: Interrupt[]` state, where `Interrupt` has `id`, `reason`, `message`; Task 2's `:q`/`:a` messages (only for the history test, which uses a mocked `GET /threads/{id}`).
- Produces: nothing later tasks use.

- [x] **Step 1: Write the failing tests**, following the existing ask tests in that file, two new and one regression guard:
  - `answered question stays as an assistant line`: answer a `single_choice` question → the list shows the question as an assistant line, then the answer as a user line, then the reply.
  - `failed resume removes both lines`: the resume errors → neither the question nor the answer line remains and the card is back; a retry then adds each once.
  - `confirm adds no question line`: answering a confirm shows only the `Yes`/`No` line, as today (passes already; guards the `reason !== "confirm"` rule).
- [x] **Step 2: Run to verify they fail**

Run: `cd frontend && npx vitest run src/pages/AssistantPanel.test.tsx -t "question"`
Expected: the first two FAIL because no question line is added; the confirm test passes already.

- [x] **Step 3: Implement** in `answer()`: for each pending interrupt whose `reason !== "confirm"`, add `{ id: crypto.randomUUID(), role: "assistant", text: i.message }` before its answer line, and include its id in the `lineIds` passed to `turn` so the error path removes it. Update the `ponytail` comment: only confirm lines are client-only now.
- [x] **Step 4: Run to verify they pass** (browser check still pending, owner)

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: all green. Then check in a browser: trigger a question, answer it, reload, reopen the thread from History; the lines match.

- [x] **Step 5: Commit** on branch `feat/ask-user-history`, push, open the PR (note: needs Task 2 merged for the reload case).

```bash
git add src/pages/AssistantPanel.tsx src/pages/AssistantPanel.test.tsx
git commit -m "feat: keep answered ask_user questions in the conversation"
git push -u origin feat/ask-user-history
```

- [ ] **Step 6: Close** (Task 4, main session, docs repo): tick this plan's boxes, update `STATUS.md`; when both PRs are merged add the `CHANGELOG.md` line and move this plan to `plans/done/`.
