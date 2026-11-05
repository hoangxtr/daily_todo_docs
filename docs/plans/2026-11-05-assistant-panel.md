# Assistant panel over AG-UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Dispatch `journal-frontend` for FE tasks and `journal-backend` for 9A.

Replaces Task 9 of `2026-10-22-frontend.md`. That plan's Global Constraints still apply.

**Goal:** Connect the assistant panel to the real assistant: streamed replies, inline questions (confirm, choices, free text), and server-side conversations you can reopen.

**Architecture:** `src/lib/assistant.ts` wraps `@ag-ui/client`'s `HttpAgent` in one function, `runTurn`, which returns a small result union. `AssistantPanel` is the container: it owns the agent, the thread id (in `localStorage`) and the view (chat or history). Two new presentational components render the question card and the thread list. The server owns history: on open, after Stop, and after a 409, the panel reloads the thread from `GET /api/assistant/threads/{id}`.

**Tech Stack (new):** `@ag-ui/client@1.0.3`, `@ag-ui/core@1.0.3` (exact pins).

**Spec:** `docs/design.md` §6, §7 and §7a (Task 9-0 adds the panel design there). Backend: `backend/app/assistant/routes.py`.

## Global Constraints

- Pin exactly `@ag-ui/client@1.0.3` and `@ag-ui/core@1.0.3` (`npm i -E`).
- Request: `POST ${BASE}/api/assistant` through `HttpAgent`. Each run sends `forwardedProps: { today: todayLocal() }`. A resume is `runAgent({ resume, forwardedProps })` with no new message.
- Thread id: `crypto.randomUUID()`, kept in `localStorage` under `assistant-thread`; every storage access is in `try/catch`, as in `DayPage.tsx`.
- Copy (sentence case, no exclamation marks):
  - `Assistant not configured`
  - `The assistant hit a problem. Try again.`
  - `Checking your tasks…` (`list_day`, `search_journal`); `Updating tasks…` (`add_task`, `set_task_status`); nothing for `ask_user`
  - `Answer the question above` (input placeholder while a question is open)
  - Question buttons `Yes`, `No`, `Send answer`, `Skip`; the choice option `Other`, with its text box labelled `Other answer`
  - Answered lines `Yes`, `No`, `Skipped`, or the answers joined with `; `
  - Header `History`, `New chat`; list label `Waiting`; empty list `No conversations yet`; list error `Couldn't load conversations.` with `Retry`
- Limits (same as the backend): message 1–4000 characters, with a counter `N/4000` shown past 3500; answers 1–500 characters; multi_choice 1–7 picks, where the `Other` text counts as one.
- `HttpAgent` HTTP errors throw an `Error` carrying `.status` and `.payload` (checked on 1.0.3). `RUN_ERROR` does not throw; it arrives through `onRunErrorEvent`.
- After any run with `changed: true`, invalidate `["day"]`, `["review"]` and `["search"]`.
- Tokens only (no raw hex). 2px accent focus ring. Every control is a real button, radio, checkbox or labelled input. State is never shown by colour alone.

## Review Focus

1. A reload, or reopening the panel, while a question is pending: the question card comes back from `GET /threads/{id}`, and answering it works. Test in 9D (`restores pending card from history`).
2. Stop during a reply: the run aborts, the panel reloads the thread from the server, and no half reply stays behind as if it were final. Test in 9C.
3. Two pending questions: `Send answer` stays disabled until both are answered, and both go in one resume. Test in 9D.
4. A 409, for example because another tab answered first: the panel reloads the thread and shows the server's state, with no error text. Test in 9C.
5. The stored thread id is unknown to the server (404, e.g. the DB was reset): the panel quietly starts a new chat and clears the stored id. Test in 9C.

---

### Task 9-0: Record the panel design (main session, docs repo)

- [x] **Step 1:** In `design.md` §7 item 5, describe the panel under **[Owner, 2026-11-05]**:
  - inline question card holding all pending questions with one `Send answer` / `Skip` row; a single confirm shows only `Yes` / `No`;
  - input disabled with `Answer the question above` while a question is open;
  - a History view and `New chat` in the header; reopening goes to the last thread;
  - Stop reloads the thread from the server.
  Copy comes from Global Constraints.
- [x] **Step 2:** In `2026-10-22-frontend.md`, add a line under Task 9: `**Superseded on 2026-11-05 by [2026-11-05-assistant-panel.md](2026-11-05-assistant-panel.md).** Do not implement this task.`
- [x] **Step 3:** `STATUS.md`: add this plan to "Plans:" and set FE 9 to "Plan ready: 9A (BE copy), 9B–9F". Commit and push the docs repo: `docs: assistant panel design and plan`.

### Task 9A (BE): date and cap copy

On the open BE branch `feat/assistant-agui` (PR #7), as one more commit. Task 8B's agent tests already cover these files.

**Files:** Modify `app/assistant/middleware.py` (or wherever `describe` lives now), `app/assistant/routes.py`, and their tests.

**Interfaces:**
- `describe` formats the date as `formatShort` does on the FE: `Thu 5 Nov`, built with `"%a %-d %b"` or an equivalent with no leading zero.
- `CAP_TEXT = "I stopped after 8 steps. Ask again to continue."` replaces the call-cap middleware's own message wherever the client sees it: the stream and the history route. One helper serves both.

- [x] **Step 1: Failing tests:**
  - the confirm message for `add_task("2026-11-05", "Call Minh")` is `Add "Call Minh" to Thu 5 Nov?`;
  - `set_task_status` confirms read `Mark "<text>" as done?` (no date, unchanged);
  - the call-cap stream test's text equals `CAP_TEXT`, and `GET /threads/{id}` shows `CAP_TEXT` as the last assistant message.
- [x] **Step 2:** Run them. Expected: FAIL. Implement. Run `uv run pytest -v` and ruff. Expected: PASS, clean.
- [x] **Step 3:** Commit `fix: assistant copy uses word dates and a plain call-cap message`, then push.

### Task 9B: Assistant client library

FE branch `feat/assistant-panel` from `main`, used for 9B–9F. One PR at the end of 9F (the same as BE 8, by the owner's choice); each task ends with its own commit and passing checks.

**Files:**
- Create: `src/lib/assistant.ts`, `src/lib/assistant.test.ts`
- Modify: `src/lib/api.ts` (export `BASE`; add the two thread getters), `src/lib/types.ts`, `package.json`

**Interfaces (produces):**
- `types.ts`:
  - `ThreadRow { id: string; title: string; updated_at: string; pending: boolean }`;
  - `ThreadHistory { messages: Message[]; pending: Interrupt[] | null }`, with `Message` and `Interrupt` from `@ag-ui/core` (`import type`);
  - `Answer = { status: "resolved"; payload: string | string[] } | { status: "cancelled" }`.
- `api.ts`: `getThreads() => req<ThreadRow[]>("/api/assistant/threads")`; `getThread(id) => req<ThreadHistory>(\`/api/assistant/threads/${encodeURIComponent(id)}\`)`.
- `assistant.ts`:
  - `makeAgent(threadId: string, history?: ThreadHistory): HttpAgent`: url `${BASE}/api/assistant`, `initialMessages = history?.messages ?? []`, then `agent.pendingInterrupts = history?.pending ?? []`.
  - `type TurnResult = { kind: "done"; changed: boolean } | { kind: "ask"; interrupts: Interrupt[] } | { kind: "error"; message: string } | { kind: "conflict" } | { kind: "aborted" }`.
  - `runTurn(agent, input: { text: string } | { answers: Record<string, Answer> }, on: { text(messageId: string, delta: string): void; tool(name: string): void }): Promise<TurnResult>`:
    - `text` → `agent.addMessage({ id: crypto.randomUUID(), role: "user", content: text })`, then `runAgent`;
    - `answers` → `runAgent({ resume: buildResumeArray(agent.pendingInterrupts, answers) })`;
    - always pass `forwardedProps: { today: todayLocal() }`.
  - Mapping: `onRunFinishedEvent` with `outcome: "interrupt"` → `ask`; success → `done` with `result?.changed === true`; `onRunErrorEvent` → `error` with `The assistant hit a problem. Try again.`; a thrown `.status === 503` → `error` with `Assistant not configured`; `.status === 409` → `conflict`; any other throw → the generic `error`; `agent.abortRun()` during the run → `aborted`.
  - `answerProblem(i: Interrupt, a: Answer | undefined): boolean`: true when the answer is missing or breaks the limits. A `cancelled` answer is always valid. confirm accepts only `"yes"`/`"no"`; multi_choice takes 1–7 strings; each string is 1–500 characters.
  - `storedThread(): string | null`, `storeThread(id: string | null): void`, and `newThreadId(): string`.

- [x] **Step 1:** `npm i -E @ag-ui/client@1.0.3 @ag-ui/core@1.0.3`.
- [x] **Step 2: Failing tests** in `assistant.test.ts`. Use a fake `fetch` (passed to `HttpAgent` through `vi.stubGlobal("fetch", …)`) that returns `new Response(sse([...events]))`, where `sse` joins `data: <json>\n\n`.
  - `text run streams and ends done`: `on.text` receives `"Hi"` and `" there"` for one message id; the result is `{ kind: "done", changed: false }`; the request body has `forwardedProps.today === todayLocal()` and the user message last.
  - `changed comes from result`: `RUN_FINISHED result {changed: true}` → `changed: true`.
  - `interrupt outcome becomes ask`: the result has `kind: "ask"` and the interrupt ids; `on.tool` received `"add_task"`.
  - `answers resume by id`: after an ask, `runTurn(agent, { answers: { i1: { status: "resolved", payload: "yes" } } })` → the body's `resume` equals `[{ interruptId: "i1", status: "resolved", payload: "yes" }]` and it adds no new message.
  - `errors map` (table): 503 → `Assistant not configured`; 409 → `conflict`; 500 → the generic text; a `RUN_ERROR` event → the generic text.
  - `abort gives aborted`: the fetch never resolves until its signal fires; calling `agent.abortRun()` → `aborted`.
  - `answerProblem` (table): confirm `"maybe"` → true; `"yes"` → false; single `""` → true; `"x".repeat(501)` → true; multi `[]` → true; 8 items → true; `["a", ""]` → true; `undefined` → true; `{ status: "cancelled" }` → false.
  - `makeAgent seeds history`: messages and `pendingInterrupts` come from the history.
  - `thread storage survives a throwing localStorage`.
- [x] **Step 3:** Run `npm test -- assistant`. Expected: FAIL. Implement. Run `npm test && npm run typecheck && npm run lint`. Expected: PASS.
- [x] **Step 4:** Commit `feat: AG-UI assistant client`.

### Task 9C: Panel chat over the real assistant

**Files:** Modify `src/pages/AssistantPanel.tsx`, `AssistantPanel.css`, `AssistantPanel.test.tsx`.

**Interfaces:**
- Consumes 9B: `makeAgent`, `runTurn`, `TurnResult`, `getThread`, `storedThread`, `storeThread`, `newThreadId`.
- Behaviour:
  - **First open:** if a thread id is stored, `getThread(id)`. On success, `makeAgent(id, history)`; on 404, `storeThread(null)` and start a new one. With nothing stored, `makeAgent(newThreadId())`, stored once the first message is sent.
  - **Messages:** rendered from `agent.messages`, user and assistant text only. The streaming reply bubble fills from `on.text`. Assistant text goes through `RichText`.
  - **Running:**
    - Send becomes `Stop`, and the input is disabled;
    - a muted line shows the latest tool's copy;
    - `Stop` calls `agent.abortRun()`, and an `aborted` result reloads the thread;
    - closing the panel also aborts.
  - **After a result:** `done` with `changed` invalidates the three query keys. `error` shows the message as a muted line, not as an assistant bubble. `conflict` reloads the thread. `ask` hands over to 9D: for now, render the interrupt messages as plain text.
  - **Counter:** `N/4000` past 3500; Send is disabled over 4000.
- Tests: render inside a `QueryClientProvider`. Mock `../lib/assistant` (keep `answerProblem` real) and `../lib/api` `getThread`.

- [x] **Step 1: Failing tests** (delete the stub-reply tests, keep the open/close/focus/mod+j tests):
  - `streams a reply`: `runTurn` calls `on.text` twice → the log shows the joined text;
  - `shows tool progress copy` for `list_day` and `add_task`;
  - `invalidates day, review and search when changed` (spy on `invalidateQueries`);
  - `Stop aborts and reloads the thread`;
  - `503 shows Assistant not configured`;
  - `conflict reloads the thread without error text`;
  - `unknown stored thread starts a new chat` (`getThread` rejects 404 → `storeThread(null)`);
  - `reopens the stored thread with its messages`;
  - `counter appears past 3500 and blocks over 4000`.
- [x] **Step 2:** Run. Expected: FAIL. Implement. Run all three checks. Expected: PASS.
- [x] **Step 3:** Commit `feat: assistant panel streams from the real assistant`.

### Task 9D: Question card

**Files:**
- Create: `src/components/QuestionCard/QuestionCard.tsx`, `QuestionCard.css`, `QuestionCard.test.tsx`
- Modify: `src/pages/AssistantPanel.tsx`, `AssistantPanel.test.tsx`

**Interfaces:**
- `QuestionCard({ interrupts, busy, onAnswer }: { interrupts: Interrupt[]; busy: boolean; onAnswer(answers: Record<string, Answer>): void })`. It renders `<form aria-label="Assistant question">` on `paper-raised` with `radius-lg`, one `fieldset` per interrupt, and the `message` as its `legend`. Options come from `metadata.options`.
  - **Only one interrupt, a confirm:** `Yes` and `No` buttons, which answer immediately.
  - **Otherwise:**
    - confirm → Yes/No radios; single_choice → radios plus `Other`; multi_choice → checkboxes plus `Other`; free_text → a textarea;
    - `Other` reveals a text input labelled `Other answer`;
    - footer: `Send answer` (primary; disabled while any `answerProblem` is true, or when `busy`) and `Skip`, which answers every interrupt with `{ status: "cancelled" }`.
  - Focus moves to the first control when the card mounts.
- **Panel:**
  - while `agent.pendingInterrupts` is non-empty, it renders the card below the log, disables the input with the placeholder `Answer the question above`, and disables Send;
  - `onAnswer` → `runTurn(agent, { answers })`;
  - before the run starts, append the answered line(s) to the log, using the copy in Global Constraints. `// ponytail: answered lines are client-only; history from the server shows only user/assistant text.`

- [x] **Step 1: Failing tests:**
  - `QuestionCard.test.tsx`:
    - `single confirm answers on Yes` (`onAnswer({ i1: { status: "resolved", payload: "yes" } })`);
    - `single choice with Other`: picking `Other` with empty text keeps Send disabled; typing `Friday` sends `"Friday"`;
    - `multi choice joins picks and Other` → payload `["a", "c", "Later"]`;
    - `free text`;
    - `two questions need both answers` (Send stays disabled until the second is answered; the answers object has both ids);
    - `Skip cancels all`;
    - `first control is focused`.
  - Panel:
    - `ask result shows the card and locks the input`;
    - `answering resumes and logs the answer line` (`Yes`, or `a; c`);
    - `restores pending card from history` (from `getThread` with `pending`).
- [x] **Step 2:** Run. Expected: FAIL. Implement. Run all three checks. Expected: PASS.
- [x] **Step 3:** Commit `feat: assistant question card`.

### Task 9E: History view and New chat

**Files:**
- Create: `src/components/ThreadList/ThreadList.tsx`, `ThreadList.css`, `ThreadList.test.tsx`
- Modify: `src/pages/AssistantPanel.tsx`, `AssistantPanel.test.tsx`, `src/lib/dates.ts`, `src/lib/dates.test.ts`

**Interfaces:**
- `ThreadList({ threads, currentId, onPick }: { threads: ThreadRow[]; currentId: string | null; onPick(id: string): void })`:
  - a `<ul aria-label="Conversations">` of buttons, each showing the title, `formatShort(localDate(updated_at))` (add `localDate(iso: string): string` to `dates.ts`, returning the local `YYYY-MM-DD`; the server sends UTC, and slicing would show the wrong day near midnight; test `localDate("2026-11-04T20:00:00Z")` under `TZ=Asia/Ho_Chi_Minh` gives `2026-11-05`) and, when pending, the text label `Waiting`;
  - the current thread has `aria-current="true"`;
  - an empty list shows `No conversations yet`.
- **Panel:**
  - header buttons `History` (`aria-pressed` toggles the view) and `New chat`;
  - History runs `useQuery({ queryKey: ["assistant-threads"], queryFn: getThreads })` with loading, error (`Couldn't load conversations.` plus `Retry`) and empty states;
  - picking a thread → abort any run, `getThread`, `makeAgent`, `storeThread`, back to chat;
  - `New chat` → abort, a new agent with `newThreadId()`, `storeThread(null)` until the first send;
  - every finished run invalidates `["assistant-threads"]`.

- [ ] **Step 1: Failing tests:**
  - ThreadList: `shows title, short date and Waiting`; `marks the current thread`; `empty state`.
  - Panel:
    - `History lists threads and picking one loads it`;
    - `New chat clears the log and the next send uses a new thread id`;
    - `list error shows Retry`.
- [ ] **Step 2:** Run. Expected: FAIL. Implement. Run all three checks. Expected: PASS.
- [ ] **Step 3:** Update `frontend/CLAUDE.md` (drop the stub gotcha; mention `lib/assistant.ts`) and `README.md` (the assistant needs the backend key). Commit `feat: assistant history and new chat`.

### Task 9F: Real run and PR (owner or browser tool)

- [ ] **Step 1:** Run both servers with a real key. Check each of these:
  - `what's still open today?` streams;
  - `mark <task> done` → a confirm card → `Yes` → the day list updates without a reload;
  - a question that triggers `ask_user`;
  - reload the page while a question is pending: the card is back;
  - `History` shows the thread, and `New chat` works;
  - the panel at 320 px width, dark mode, keyboard only.

  Report what you saw.
- [ ] **Step 2:** Push and open the one PR for 9B–9E (contract consumer of BE PR #7; it needs 9A's copy). Never merge.
