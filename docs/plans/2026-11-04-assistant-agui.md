# Assistant: stateful deep agent over AG-UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. In this repo, dispatch the `journal-backend` agent (`backend/.claude/agents/journal-backend.md`).

Replaces Task 8 of `2026-10-22-backend.md` (Tasks 1–7 there are done). That plan's Global Constraints also apply here.

**Goal:** The assistant keeps conversations on the server, asks before every journal write, can ask the user questions, and speaks the AG-UI 1.0 protocol to the frontend.

**Architecture:** `create_deep_agent` (deepagents) with the 4 journal tools plus `ask_user`, a confirm-gate middleware, a per-run dynamic prompt and a model-call cap. Conversations live in a LangGraph `MongoDBSaver` checkpointer (agent state) plus an `assistant_threads` collection (list rows). Confirm and `ask_user` pause the run with LangGraph `interrupt()`. One `POST /api/assistant` endpoint takes an AG-UI `RunAgentInput`, streams AG-UI events built by hand from `agent.astream`, and resumes paused runs from `RunAgentInput.resume[]`.

**Tech Stack (new):** `deepagents==0.7.32`, `langgraph-checkpoint-mongodb==0.5.1` (sync `pymongo.MongoClient` underneath), `ag-ui-protocol==1.0.0`.

**Spec:** the decision record `/Users/hoangt@backbase.com/.claude/plans/i-think-we-can-nifty-widget.md` (Decisions, interrupt table, API contract), copied into `docs/design.md` §6 and §7a by Task 8-0. Read it before 8A.

## Global Constraints

- Pin exactly: `deepagents==0.7.32`, `ag-ui-protocol==1.0.0`, `langgraph-checkpoint-mongodb==0.5.1`.
- Do not use the `ag-ui-langgraph` adapter. Build events from `ag_ui.core` and encode with `ag_ui.encoder.EventEncoder`.
- The model never gets a `task` tool. Subagents are off through a harness profile (Task 8B).
- Fixed copy:
  - decline: `User declined this change. Do not retry unless asked.`
  - skipped question: `User skipped the question.`
  - run error: `The assistant hit a problem. Try again.`
  - not configured: `503 {"detail": "Assistant not configured"}`.
- Limits:
  - user message 1–4000 chars; thread title = first 60 chars of the first message, not stripped;
  - `ask_user` choice types take 2–6 options of 1–200 chars each; `free_text` takes none;
  - resume answers: confirm `"yes"`/`"no"` only; strings non-empty, ≤500 chars; multi_choice 1–7 non-empty strings of ≤500 chars;
  - model calls per run: 8.
- Logs never contain the request body, message text, or API keys.
- The 409/422 checks read `agent.aget_state`, never the thread row's `pending` flag.

## Review Focus

1. The client disconnects right after the interrupt `RUN_FINISHED`: the thread row still ends up `pending: true` and the resume works. Test in 8C (`test_closed_stream_still_records_pending`).
2. Two parallel writes: one `RUN_FINISHED` carries both interrupts; answering only one is 422 and nothing is written. Test in 8C.
3. A confirm for a task id that is malformed or unknown: no question is asked, and the tool returns its error. Test in 8B.
4. A wrong-shaped answer (`"maybe"` for confirm, `[]` or 8 items for multi, a 501-char string): 422, and nothing is written. Test in 8C.
5. A new message while a question is pending: 409, and the pending question is unchanged. Test in 8C.

---

### Task 8-0: Record the design (main session, docs repo, no code)

**Files:**
- Modify: `docs/design.md` §6 (endpoint table) and §7a, `docs/project-description.md`, `docs/STATUS.md`

- [x] **Step 1:** In `design.md` §7a, replace "kept in the browser tab only … nothing stored in MongoDB" with the server-side threads design from the spec: checkpointer plus `assistant_threads`, the hard confirm gate, `ask_user` and its interrupt table, AG-UI 1.0 events, `resume[]`, and dismissing with `cancelled`. In §6, replace the assistant row with `POST /api/assistant`, `GET /api/assistant/threads` and `GET /api/assistant/threads/{id}`. Mark the reversal **[Owner, 2026-11-04]**.
- [x] **Step 2:** In `project-description.md`, record the decision (conversations stored server-side; AG-UI protocol) with the date.
- [x] **Step 3:** In `STATUS.md`, add `plans/2026-11-04-assistant-agui.md` to the "Plans:" line, change BE 8 to "8A/8B/8C, plan ready" and FE 9 to "Blocked on BE 8C; re-plan against AG-UI (`@ag-ui/client` `HttpAgent` with 1.0 interrupt outcomes and `resume[]`)". Commit and push the docs repo: `docs: assistant threads and AG-UI design`.

---

### Task 8A: Thread rows and list endpoint

8A–8C share one branch, `feat/assistant-agui`, and one PR, opened at the end of 8C **[Owner, 2026-11-04]**: an exception to WORKING.md's one-PR-per-task rule. Each task still ends with its own commit and passing checks. No agent or LLM yet in 8A.

**Files:**
- Create: `app/assistant/threads.py`, `tests/test_assistant_threads.py`
- Modify: `app/db.py` (index), `app/main.py` (include router), `tests/conftest.py` (clean `assistant_threads`), `CLAUDE.md` (layout)

**Interfaces:**
- Produces, in `app/assistant/threads.py`:
  - Collection `assistant_threads`, document `{_id: str (thread id), title: str, created_at: datetime, updated_at: datetime, pending: bool}`; index `[("updated_at", -1)]` in `ensure_indexes`.
  - `async create_thread(db, thread_id: str, first_message: str) -> None`: `update_one(..., {"$setOnInsert": {...}}, upsert=True)` with `title = first_message[:60]`, `pending = False`; calling it again for the same id changes nothing.
  - `async touch_thread(db, thread_id: str, pending: bool) -> None`: sets `updated_at = datetime.now(UTC)` and `pending`.
  - `async thread_exists(db, thread_id: str) -> bool`.
  - `ThreadOut(BaseModel)`: `id: str, title: str, updated_at: datetime, pending: bool`.
  - `router = APIRouter(prefix="/assistant")` with `GET /threads` → `list[ThreadOut]`, newest `updated_at` first. `# ponytail: no paging; one user's thread count stays small.`

- [x] **Step 1: Write the failing tests** in `tests/test_assistant_threads.py` (call the functions with the `db` fixture and read through `client`):
  - `test_empty_list`: `GET /api/assistant/threads` → 200, `[]`.
  - `test_title_is_first_60_chars_unstripped`: `create_thread(db, "t1", "  " + "x" * 70)` → the list item's `title == ("  " + "x" * 70)[:60]`, `pending is False`.
  - `test_create_is_idempotent`: create `"t1"` with `"first"`, then again with `"second"` → one row, `title == "first"`.
  - `test_newest_first`: create `t1` then `t2`, then `touch_thread(db, "t1", False)` → ids in order `["t1", "t2"]`.
  - `test_pending_round_trip`: `touch_thread(db, "t1", True)` → `pending is True`; then `False` → `False`.
  - `test_thread_exists`: `False` before create, `True` after.
- [x] **Step 2:** Run `uv run pytest tests/test_assistant_threads.py -v`. Expected: FAIL (import error).
- [x] **Step 3:** Implement `threads.py`, the index, the router include in `main.py` (`api.include_router(threads.router)`), and the `assistant_threads` cleanup in `conftest.clean`.
- [x] **Step 4:** Run `uv run pytest -v`, `uv run ruff check .`, `uv run ruff format --check .`. Expected: all PASS, clean.
- [x] **Step 5:** Add `threads.py` to the `CLAUDE.md` layout. Commit `feat: assistant thread rows and list endpoint` and push the branch (no PR yet).

---

### Task 8B: Deep agent, confirm gate and `ask_user`

Same branch, `feat/assistant-agui`. Agent-level tests only, no HTTP.

**Files:**
- Create: `app/assistant/ask.py`, `app/assistant/agent.py`, `tests/test_assistant_agent.py`
- Modify: `app/assistant/tools.py`, `app/assistant/prompt.py`, `tests/fakes.py`, `tests/test_assistant_tools.py`, `pyproject.toml` (`uv add deepagents==0.7.32`), `CLAUDE.md` (layout; tools now read `runtime.context`)

**Interfaces:**
- Consumes: `TOOLS`, `JournalContext(db, today, changed=False)`, `ERRORS`, `_err` from `tools.py`; `SYSTEM_PROMPT` from `prompt.py`.
- Changes in `tools.py`: every tool takes `runtime: ToolRuntime[JournalContext]` (`from langchain.tools import ToolRuntime`) instead of `config: RunnableConfig`, and reads `runtime.context`. Delete `_ctx`. `TOOLS` stays these 4 tools; `ask_user` lives in `ask.py`.
- Produces, in `app/assistant/ask.py`:
  - `CANCELLED = "__agui_cancelled__"` (a string, so it survives checkpoint serialisation), `DECLINED`, `SKIPPED` (copy from Global Constraints), `GATED = {"add_task", "set_task_status"}`.
  - `async describe(call: dict, db) -> str | None`. For `add_task`: `Add "<text>" to <date>?`. For `set_task_status`: `Mark "<task text>" as <status>?`, looking the task up by `ObjectId(task_id)`. Returns `None` when the id is malformed or unknown.
  - `class AskConfirmMiddleware(AgentMiddleware)` with `async awrap_tool_call(self, request, handler)`:
    - not in `GATED`, or `describe` returns `None` → `await handler(request)`;
    - otherwise `answer = interrupt({"reason": "confirm", "message": question, "tool_call_id": request.tool_call["id"]})`;
    - `answer == "yes"` → `await handler(request)`;
    - anything else (`"no"`, `CANCELLED`) → `ToolMessage(DECLINED, tool_call_id=..., name=...)`.
  - `@tool async ask_user(question: str, type: Literal["single_choice", "multi_choice", "free_text"], options: list[str] = []) -> str`:
    - invalid combination → an `Error: …` string, and no interrupt;
    - otherwise `answer = interrupt({"reason": type, "message": question, "metadata": {"options": options}})`;
    - returns `SKIPPED` if `answer == CANCELLED`, `"; ".join(answer)` for a list, else `answer`.
    - Docstring (the model reads it): use only for information the user must decide; never to confirm a change.
- Produces, in `app/assistant/agent.py`:
  - `@dynamic_prompt def journal_prompt(request: ModelRequest) -> str`: `SYSTEM_PROMPT.format(today=ctx.today, weekday=date.fromisoformat(ctx.today).strftime("%A"))`, where `ctx = request.runtime.context`.
  - `build_agent(model: BaseChatModel, checkpointer: BaseCheckpointSaver) -> CompiledStateGraph`. It first calls `register_harness_profile(get_model_provider(model), HarnessProfile(general_purpose_subagent=GeneralPurposeSubagentProfile(enabled=False)))`. `get_model_provider` comes from `deepagents._models`; mark it `# ponytail: private helper, the only way to key the profile by the model's provider; re-check on deepagents upgrades`. Then it returns `create_deep_agent(model, tools=[*TOOLS, ask_user], middleware=[journal_prompt, AskConfirmMiddleware(), ModelCallLimitMiddleware(run_limit=8)], context_schema=JournalContext, checkpointer=checkpointer)`. Pass no `subagents=` argument.
- `prompt.py`, `SYSTEM_PROMPT` rules:
  - delete the line starting "Before you add, finish (done), drop or reopen tasks";
  - add `- Changes need the user's OK; the app asks them for you. After changing, say which tasks you changed.`;
  - add `- Use ask_user only for information the user must decide, never to confirm a change. Ask one question at a time: single_choice for one of a few likely answers, multi_choice when several can apply, free_text otherwise.`;
  - keep the `{today}`/`{weekday}` placeholders and the other rules.
- `tests/fakes.py`: `FakeToolModel` also overrides `_stream` (and `_astream` calling it) to yield one `ChatGenerationChunk(message=AIMessageChunk(content=m.content, tool_calls=m.tool_calls, id=m.id))` per scripted message. `GenericFakeChatModel`'s own streaming fails with "No generations found in stream" on empty-text tool-call messages.

- [ ] **Step 1:** `uv add deepagents==0.7.32`. Change the `Tools` helper in `tests/test_assistant_tools.py` to call `tool.ainvoke({**args, "runtime": ToolRuntime(state={}, context=self.ctx, config={}, stream_writer=None, tool_call_id="t", store=None)})`, and update `test_system_prompt_has_date_and_weekday` to assert the new rule text. Run `uv run pytest tests/test_assistant_tools.py -v`. Expected: FAIL (tools still read `config`).
- [ ] **Step 2:** Switch `tools.py` to `ToolRuntime` and update `prompt.py`. Run the same file. Expected: PASS.
- [ ] **Step 3: Write the failing tests** in `tests/test_assistant_agent.py`. Use `InMemorySaver`. Helpers:
  - `run(agent, input, ctx, thread="t1") -> (interrupts, state)`: iterates `agent.astream(input, {"configurable": {"thread_id": thread}}, context=ctx, stream_mode=["messages", "updates"])` and collects every `__interrupt__` update;
  - `tool_msgs(state)`: the ToolMessage contents.

  Tests:
  - `test_write_pauses_with_confirm`: script `add_task("2026-11-04", "Call Minh")` with call id `c1` → exactly one interrupt with value `{"reason": "confirm", "message": 'Add "Call Minh" to 2026-11-04?', "tool_call_id": "c1"}`; no task stored; `ctx.changed is False`.
  - `test_confirm_yes_writes`: resume `Command(resume={id: "yes"})`, then script `AIMessage("Added.")` → the task is stored; the new run's `ctx.changed is True`.
  - `test_confirm_no_and_cancelled_decline` (parametrized `"no"`, `CANCELLED`) → nothing stored; a ToolMessage equals `DECLINED`; the final AI message is the scripted reply.
  - `test_set_status_question_uses_task_text`: seed "Write report" through `client` → the interrupt message is `'Mark "Write report" as done?'`.
  - `test_unknown_task_skips_confirm` (parametrized `"nope"`, `str(ObjectId())`) → no interrupt; the ToolMessage starts with `Error` or `No task`.
  - `test_parallel_writes_resume_by_id`: one AIMessage with `add_task` A and B → 2 interrupts; resume `{id_of_A: "no", id_of_B: "yes"}` (match ids by `message`) → only B stored.
  - `test_ask_user_round_trip` (parametrized `("single_choice", ["Today", "Tomorrow"], "Tomorrow", "Tomorrow")`, `("multi_choice", ["a", "b", "c"], ["a", "c"], "a; c")`, `("free_text", [], "Call at 3", "Call at 3")`) → interrupt value `{"reason": type, "message": "Which?", "metadata": {"options": options}}`; after the resume the ToolMessage equals the expected text.
  - `test_ask_user_cancelled` → ToolMessage `SKIPPED`.
  - `test_ask_user_bad_args` (parametrized: single with 1 option, single with 7, an option of 201 chars, an empty option, free_text with options) → no interrupt; the ToolMessage starts with `Error`.
  - `test_read_tools_do_not_pause`: `list_day("2026-11-04")` → no interrupt.
  - `test_no_task_tool`: a `FakeToolModel` subclass that records the tool names in `bind_tools` → contains the 4 journal tools and `ask_user`; `"task"` is absent.
  - `test_prompt_uses_run_today`: a recording fake captures the system message. A run with `today="2026-11-04"` contains `Today is 2026-11-04, Wednesday.`; a second run on the same thread with `"2026-11-05"` contains `Thursday`.
  - `test_call_cap`: script 20 `list_day` calls → the fake is called exactly 8 times; no exception; the last message content contains `run limit`.
- [ ] **Step 4:** Run `uv run pytest tests/test_assistant_agent.py -v`. Expected: FAIL (no `ask.py`/`agent.py`).
- [ ] **Step 5:** Patch `fakes.py` (streaming, see Interfaces), then implement `ask.py` and `agent.py` per Interfaces.
- [ ] **Step 6:** Run `uv run pytest -v` and ruff. Expected: all PASS, clean.
- [ ] **Step 7:** Update the `CLAUDE.md` layout (`ask.py`, `agent.py`, tools read `runtime.context`). Commit `feat: deep agent with confirm gate and ask_user` and push the branch (no PR yet).

---

### Task 8C: AG-UI endpoint and thread history

Same branch, `feat/assistant-agui`. Contract change: say so in the PR.

**Files:**
- Create: `app/assistant/routes.py`, `tests/test_assistant_route.py`
- Modify: `app/assistant/threads.py` (history route), `app/main.py` (lifespan saver, router), `tests/conftest.py` (checkpointer fixture and override, clean checkpoint collections), `pyproject.toml` (`uv add ag-ui-protocol==1.0.0 langgraph-checkpoint-mongodb==0.5.1`), `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: 8A `create_thread`, `touch_thread`, `thread_exists`, `router`; 8B `build_agent`, `CANCELLED`; `LLMFactory`, `AssistantNotConfigured`; `JournalContext`; `TOOLS`, `ask_user`.
- Produces:
  - `main.py` lifespan: `app.state.checkpointer = MongoDBSaver(MongoClient(settings.mongodb_uri), db_name=settings.mongodb_db)` (`from langgraph.checkpoint.mongodb import MongoDBSaver`). Close that client on shutdown. `# ponytail: a second, sync client; 0.5.1 ships no async saver (its a-methods run in a thread pool)`.
  - Dependencies in `routes.py`:
    - `get_checkpointer(request) -> BaseCheckpointSaver`: returns `request.app.state.checkpointer`;
    - `get_chat_model() -> BaseChatModel`: uses an `lru_cache`d `LLMFactory(get_settings())` and raises `HTTPException(503, "Assistant not configured")` on `AssistantNotConfigured`.
  - `ERROR_TEXT` (copy from Global Constraints); `SHOWN = {t.name for t in TOOLS} | {"ask_user"}`.
  - `check_answer(reason: str, payload: object) -> bool`, a pure function implementing the resume limits in Global Constraints.
  - `async run_events(agent, db, thread_id: str, run_id: str, stream_input, ctx: JournalContext) -> AsyncIterator[BaseEvent]`, the stream mapper:
    1. Yield `RunStartedEvent`.
    2. Iterate `agent.astream(stream_input, config, context=ctx, stream_mode=["messages", "updates"])`:
       - `messages` items whose `meta["langgraph_node"] == "model"` and whose chunk has non-empty `.text`: start a text message on a new chunk id (end the previous one), then `TextMessageContentEvent`;
       - `updates` from node `model`: for each tool call whose name is in `SHOWN`, yield `ToolCallStart` (with `parent_message_id`), `ToolCallArgs` (`json.dumps(args)`) and `ToolCallEnd`;
       - `updates` from node `tools`: for each ToolMessage whose name is in `SHOWN`, yield `ToolCallResultEvent`. Print one real update in a test first: parallel calls can arrive as a list of updates;
       - `__interrupt__`: collect, don't yield.
    3. End any open text message. If interrupts were collected, yield one `RunFinishedEvent(outcome={"type": "interrupt", "interrupts": [Interrupt(id=i.id, **i.value)]})`; otherwise yield `RunFinishedEvent(result={"changed": ctx.changed})`.
    4. On `Exception`: `logger.exception("assistant run failed")` (no body), then yield `RunErrorEvent(message=ERROR_TEXT)`.
    5. `finally`, inside `anyio.CancelScope(shield=True)`: read `aget_state` and call `touch_thread(db, thread_id, pending=<any task has interrupts>)`.
  - `POST /api/assistant`, body `RunAgentInput`. Before streaming:
    - `today = date.fromisoformat((forwarded_props or {})["today"])`, else 422;
    - build the agent; `pending = [i for t in state.tasks for i in t.interrupts]` from `aget_state`;
    - with `resume`: no pending → 409; the set of entry ids ≠ the set of pending ids → 422; any `resolved` entry fails `check_answer(pending reason, payload)` → 422; `stream_input = Command(resume={e.interrupt_id: e.payload if e.status == "resolved" else CANCELLED})`;
    - without `resume`: pending → 409; the last message must be a `user` message with string content of 1–4000 chars, else 422; `create_thread(db, thread_id, text)`; `stream_input = {"messages": [{"role": "user", "content": text}]}`.
    - Return `StreamingResponse(encoder.encode(e) for each event, media_type=encoder.get_content_type())`.
  - `GET /api/assistant/threads/{thread_id}` (in `threads.py`, using `get_chat_model` and `get_checkpointer`; without a key it returns 503):
    - unknown row → 404;
    - otherwise `{"messages": [...], "pending": [...] | null}`, dumped with `model_dump(mode="json", by_alias=True, exclude_none=True)`;
    - messages: `UserMessage(id, content)` for each HumanMessage, `AssistantMessage(id, content=text)` for each AIMessage with non-empty text; skip tool messages;
    - pending: the AG-UI `Interrupt`s, or `null`.
- `conftest.py`: a session fixture `checkpointer` = `MongoDBSaver(MongoClient(<test uri>), db_name=db.name)`. `clean` also empties `checkpoints` and `checkpoint_writes`. `client` also overrides `get_checkpointer`.

- [ ] **Step 1:** `uv add ag-ui-protocol==1.0.0 langgraph-checkpoint-mongodb==0.5.1`; add the conftest fixture and cleanup.
- [ ] **Step 2: Write the failing tests** in `tests/test_assistant_route.py`. Helpers:
  - `script(client_app, *messages)` overrides `get_chat_model` with a `FakeToolModel`;
  - `body(thread="t1", text="hi", today="2026-11-04", resume=None)` builds camelCase `RunAgentInput` JSON with a fresh `runId`;
  - `events(resp)` parses the `data: ` lines.

  Tests:
  - `test_text_run`: event types are exactly `RUN_STARTED, TEXT_MESSAGE_START, TEXT_MESSAGE_CONTENT…, TEXT_MESSAGE_END, RUN_FINISHED`; the joined deltas equal the reply; `result == {"changed": False}`; `GET /threads` lists `t1` with title `hi`.
  - `test_write_pauses`: scripted `add_task` → `TOOL_CALL_START` named `add_task`, then a final `RUN_FINISHED` whose `outcome.interrupts[0]` has `reason == "confirm"`, `message == 'Add "Call Minh" to 2026-11-04?'` and a `toolCallId`; no task stored; the list shows `pending: true`.
  - `test_resume_yes_changes`: resume `[{"interruptId": id, "status": "resolved", "payload": "yes"}]` → a `TOOL_CALL_RESULT`; `result.changed is True`; the task is stored; `pending: false`.
  - `test_resume_no_and_cancelled` (parametrized) → nothing stored; `changed is False`.
  - `test_ask_user_round_trip` (the three types from 8B) → the interrupt has `reason == type` and `metadata.options`; after the resume, the `TOOL_CALL_RESULT` content equals the expected text.
  - `test_parallel_writes_one_finish`: two `add_task` calls → exactly one `RUN_FINISHED` with 2 interrupts; resume with only one id → 422 and nothing stored; resume with both → 200.
  - `test_new_message_while_pending_409`: after a pause, `POST` without `resume` → 409; `GET /threads/t1` still shows the same pending interrupt.
  - `test_resume_with_nothing_pending_409`.
  - `test_bad_answers_422` (parametrized: confirm `"maybe"`; single `""`; single `"x" * 501`; multi `[]`; multi 8 items; multi `["a", ""]`; unknown interrupt id) → 422; nothing stored.
  - `test_validation_422` (parametrized: last content `""`; 4001 chars; no `forwardedProps`; `today: "yesterday"`; last message role `assistant`).
  - `test_not_configured_503`: `get_chat_model` raises the 503 → `{"detail": "Assistant not configured"}`.
  - `test_model_error_is_run_error`: the fake raises `RuntimeError("secret detail")` → status 200; the last event is `RUN_ERROR` with `ERROR_TEXT`; `"secret detail"` is not in the body.
  - `test_builtin_tools_hidden`: scripted `ls` call, then text → no `TOOL_CALL_*` event names `ls`.
  - `test_history`: after a pause, `GET /api/assistant/threads/t1` → `messages == [{"id": …, "role": "user", "content": "hi"}]`, and `pending` has 1 interrupt; after resume yes plus a scripted reply → the last message is the assistant text and `pending is None`; `GET` an unknown id → 404.
  - `test_closed_stream_still_records_pending`: drive `run_events` directly. Stop at the interrupt `RUN_FINISHED`, then `await gen.aclose()` → the thread row has `pending is True`, and a resume `POST` returns 200.
- [ ] **Step 3:** Run `uv run pytest tests/test_assistant_route.py -v`. Expected: FAIL.
- [ ] **Step 4:** Implement the lifespan saver, `routes.py`, the history route, and `api.include_router(routes.router)`.
- [ ] **Step 5:** Run `uv run pytest -v` and ruff. Expected: all PASS, clean.
- [ ] **Step 6 (real run; the owner puts `GOOGLE_API_KEY` in `.env`):** Start uvicorn. Using `curl -N`, send a read question, then a write question; answer the confirm with a `resume` request after **restarting the server** between the pause and the resume. Expected: `RUN_FINISHED` with an interrupt outcome, then after the restart the resume stream ends with `result.changed: true`. Report the output without the key.
- [ ] **Step 7:** README: the three endpoints, the AG-UI note, `GOOGLE_API_KEY`/`ASSISTANT_MODEL`, and that each message costs model calls. `CLAUDE.md` layout: `routes.py`. Commit `feat: AG-UI assistant endpoint with server-side threads`, push, and open the one PR for 8A–8C (flag the contract change; list the three task commits).
