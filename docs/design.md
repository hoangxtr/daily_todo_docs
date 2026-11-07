# Daily Journal: Design

Date: 2026-10-22
Status: approved by owner, 2026-10-22
Companion docs: `project-description.md` (the problem and the owner's rules) and the visual design (Claude design artifact `4fe0d013-588d-4220-b538-d7d6f9b13b7b`: five screens plus a design system named "journal").

Legend: **[Owner]** = decided by the owner. **[Call]** = chosen by the writer, not yet confirmed by the owner. Unmarked = taken from the project description or the visual design. Why each major choice was made, and what was rejected: `decisions/` (ADRs 0001–0011).

## 1. Intent

A single-user web app that replaces a plain-text daily work note. Each day has a TODO list and free-form comments. Unfinished tasks carry to the next day automatically. A review view counts what was finished or left over a week or month and lets the owner drill into the detail.

The test every decision serves: it must feel faster than typing into the note. If it is slower to use than the note, it has failed even if every feature works.

## 2. Goals, non-goals, anti-goals

Goals
1. Planning a day takes under a minute.
2. At a glance: today's tasks and how far along they are.
3. Nothing unfinished is silently lost between days.
4. "How did my week/month go?" answered in one click, with drill-down.
5. Notes stay free-form; writing a comment never feels like filling in a form.

Non-goals: team features and sharing; priorities, estimates, sprints; Jira sync; reminders and notifications; authentication **[Owner]**; importing the old text history (see 10).

Anti-goals: a screen that looks like a form, dashboard or project-management tool; anything that makes daily use slower than the note; celebratory UI (no praise, no emoji, no confetti, no sound; motion on the Day page is limited as set out in [ADR 0012](decisions/0012-day-page-focus-layout.md), elsewhere a 120 ms fill or tint).

## 3. Tech stack

| Layer | Choice | Who |
|---|---|---|
| Backend | Python 3.12+, FastAPI, Pydantic v2 | **[Owner]** FastAPI; versions **[Call]** |
| Database | MongoDB on MongoDB Atlas (cloud) | **[Owner]** |
| Auth | None for now. The API is open to anyone with its URL; revisit before exposing it beyond the owner's machine. | **[Owner]** |
| Repos | Two independent folders, each to become its own GitHub repo: `todo_app/backend`, `todo_app/frontend`. No shared code. The HTTP API is the only link. | **[Owner]** |
| Mongo driver | PyMongo async client (`AsyncMongoClient`) | **[Call]** |
| Backend tests | pytest, httpx `AsyncClient`, a separate test database | **[Call]** |
| Backend tooling | uv for deps, ruff for lint/format | **[Call]** |
| Frontend | Vite, React 18, TypeScript (strict) | **[Call]** |
| Server state | TanStack Query, optimistic updates for task changes | **[Call]** |
| Routing | React Router; the day is in the URL (`/day/2026-10-22`, `/review`, `/search?q=`) | **[Call]** |
| Styling | Plain CSS with the design's tokens as CSS custom properties; CSS Modules or one stylesheet per component. No Tailwind, no UI kit. | **[Call]** |
| Frontend tests | Vitest, Testing Library | **[Call]** |
| Assistant | LangChain with Google Gemini (`langchain-google-genai`), model name from config | **[Owner]** LangChain + Gemini; model config **[Call]** |
| Config | Backend `.env` (git-ignored): `MONGODB_URI`, `MONGODB_DB`, `CORS_ORIGINS`, `GOOGLE_API_KEY`, `OPENAI_API_KEY`, `ASSISTANT_MODEL`. Frontend `.env`: `VITE_API_URL`. Each repo ships a `.env.example` with no secrets. | **[Call]** |

Secrets: the Atlas connection string lives only in `backend/.env`, never in code, docs or commits. The password was shared in chat on 2026-10-22, so rotate it in Atlas once the app runs. Atlas Network Access must allow the machine running the backend.

Hosting is out of scope for the first build. Development runs on the owner's laptop against Atlas.

## 4. Domain rules

Day, Task, Comment, Carry-over and Period are as defined in the project description.

- **Dates** are calendar dates `YYYY-MM-DD`, stored as strings, never timestamps, so timezones cannot move a task to another day. "Today" comes from the browser's local date, sent by the client; the server never decides what today is. **[Call]**
- **Carry-over [Owner]:** an unfinished task stays on its day, still open. A copy is created on the next day. The original day keeps an honest record.
- **Chains [Call]:** every copy stores `prev_id` (the task it was copied from) and `origin_id` (the first task in the chain). `carried_days` = days since the origin's day.
- **When copies are made [Owner, 2026-11-05]:** lazily, by a sync the client triggers with `POST /api/sync` once per page load (the client's today, never a past or future day). `GET /api/days/{date}` never writes. The server rejects a `today` more than 1 day ahead of its UTC date (422), so a bad client date cannot copy tasks into the far future. The sync gives every chain that is still open and whose latest copy is dated before today one new copy on today. It is idempotent: a unique index on `(origin_id, day)` makes a second or concurrent sync a no-op. Because it looks at open chains rather than at "the previous day", a task added or reopened on a past day after today was opened still reaches today on the next load (goal 3). Days in between (a weekend, a holiday) are skipped, not filled.
- **Next day [Call]:** follows from the rule above: tasks land on the next day the owner opens. A Friday task opened on Monday lands on Monday; Saturday and Sunday stay empty unless opened. This answers open question 2 of the project description without a weekend setting.
- **Status [Owner]:** `open`, `done`, `dropped`. A dropped task stops carrying, counts as neither Done nor Remaining, and can be reopened. Dropping or finishing any task in a chain closes the whole chain for carry-over.
- **Counting [Call]:** a chain counts once. A chain finished on day D counts one Done on D. A chain still open counts one Remaining, shown with its origin day and "open N days". Earlier copies of a finished chain stay `open` on their days (honest history) and are excluded from Remaining. Per-day "left open at end of day" marks in the review are the raw open tasks of that day.
- **Review over a range [Call]:** Done = chains whose `closed_on` (as done) falls in the range. Remaining = chains with any copy dated in the range that were still open at the end of the range (`closed_on` null or after the range end). "Open N days" counts from the origin day to the range end, or to today for the current period.
- **Edit text [Owner, 2026-11-05]:** the task menu's Edit turns the text into an input (Enter or blur saves, Esc cancels; blank or unchanged closes). The new text applies to the whole chain, past days included, like status and delete. Not offered on the Morning handover. The assistant can do it too (`update_task`, no confirmation).
- **Delete [Call]:** deleting a task deletes its whole chain (every copy), because delete means "this was a mistake". Giving up on real work is Drop, which keeps history. The UI says so in the confirmation ("Delete this task from all 3 days").
- **Past days** are viewable and editable. Checking an old copy done when a later copy exists marks the chain done as of that old day; the later copies show as done-elsewhere (struck, muted, "done Tue"). **[Call]**
- **Comments:** one free-text note per day **[Owner]**, replacing the description's "several per day". Stored as typed (raw text), autosaved (debounced ~600 ms) **[Call]**. Rendered as GitHub-flavoured markdown when the note is not focused, with raw HTML never rendered and the textarea shown while editing **[Owner, 2026-10-23]**. Ticket IDs (`[A-Z][A-Z0-9]+-\d+`) and URLs are detected at render time only.
- **Stuck:** a task carried 5 or more days gets the "stuck" row ground.
- **Order:** tasks keep their insertion order within a day; carried-in tasks come first, in their previous order. The owner can reorder a day's tasks by dragging or with Alt+↑/↓; the order is stored per day and is not carried forward. **[Owner, 2026-11-03]**

## 5. Data model (MongoDB) [Call]

`_id` is an ObjectId, exposed to clients as string `id`.

- `tasks`: `day` (str), `text` (str, 1–500 chars), `status` (`open|done|dropped`), `origin_id`, `prev_id` (or null), `origin_day` (str), `closed_on` (day the chain was finished or dropped, or null), `position` (int), `created_at`, `updated_at`.
- `comments`: `day` (unique), `text` (≤ 50 000 chars), `updated_at`.
Indexes: `tasks.day + position`, unique `tasks.origin_id + day`, `tasks.status`, a text index over `tasks.text`, a text index over `comments.text` (or a case-insensitive regex for ticket IDs if the text index tokenises them badly; builder verifies), unique on `comments.day`.

## 6. API [Call]

JSON over HTTP under `/api`. Exact shapes are the builder's; these behaviours must exist. Errors return `{ "detail": ... }` (FastAPI default).

| Method & path | Behaviour |
|---|---|
| `POST /api/sync` | Body `{today}`. Runs the carry-over sync (§4) and returns `{inserted}`. 422 if `today` is more than 1 day ahead of the server's UTC date. |
| `GET /api/days/{date}` | Day's tasks (with carried_days, chain status), its note, `{done, total}`, `carried_in` count. Read-only. |
| `POST /api/days/{date}/tasks` | Add a task `{text}`; returns it. |
| `PATCH /api/tasks/{id}` | Change `text` or `status`. Both apply to the whole chain: every copy gets the new text or status. **[Owner, 2026-11-05]** |
| `DELETE /api/tasks/{id}` | Delete the task's whole chain (a mistake, not a drop). |
| `PUT /api/days/{date}/order` | Reorder the day's tasks `{ids}`: exactly the day's task ids in the new order, else 409. Returns 204. |
| `PUT /api/days/{date}/comment` | Save the note `{text}`. |
| `GET /api/review?start=&end=` | Done count, Remaining count, per-day `{date, done, left}`, Done list and Remaining list (oldest first, with origin day and open days). The client computes ranges for this week, last week, this month. Weeks start Monday. |
| `GET /api/search?q=` | Matching tasks and notes grouped by day, newest first, each with a snippet. Capped at 50 days of results. |
| `GET /api/health` | Liveness plus a database ping. |
| `POST /api/assistant` | Body: AG-UI `RunAgentInput` `{threadId, runId, messages, resume?, forwardedProps: {today}}`. Streams AG-UI events as server-sent events; a resume is the same request with `resume[]`. See §7a. |
| `GET /api/assistant/threads` | Conversations `[{id, title, updated_at, pending}]`, newest first. |
| `GET /api/assistant/threads/{id}` | `{messages, pending}`: user and assistant text, each answered `ask_user` question (assistant) and its answer (user; `Skipped` if dismissed), and the open questions (or `null`). 404 if unknown. |

CORS allows only `CORS_ORIGINS`. Validate dates, lengths and enum values. Store text exactly as typed.

## 7. Frontend

Screens, in order of importance:
1. **Today / any day** (design board 1; layout per [ADR 0012](decisions/0012-day-page-focus-layout.md)): header with Search and Look back; date header with a progress ring and a one-line summary (`A clean day`, `All done`, `N left`, `N left, M carried in`); a "Now" card for the first open task, then Up next, Done and Dropped; the note sheet beside the tasks at ≥980 px and below them otherwise; shortcut legend. Alt+↑/↓ and dragging reorder open tasks only. The loading skeleton pulses (opacity, infinite) in addition to the Now card's breathing dot; all motion sits inside `prefers-reduced-motion: no-preference`.
2. **Morning handover** (board 2): shown for today when carried-in tasks exist and none has been touched yet. Each carried task with a ticket ID shows the last sentence mentioning that ID from the most recent note (exact ticket-ID match only, no fuzzy matching **[Call]**); tasks without a ticket ID show no line; focus starts on the oldest; X done, D drop, ↓ next, N skip to new tasks.
3. **Look back** (board 3): period switch (this week / last week / this month), Done and Remaining tiles (clicking switches the list), day-by-day marks, list items that link to their day.
4. **Search** (board 4): a ⌘K overlay; results grouped by day, ↑↓ move, Enter opens the day.
5. **Assistant panel** (board 5): first built as UI with a stub reply, then connected to the real assistant (§7a). **[Owner]**
   Panel design **[Owner, 2026-11-05]**:
   - Questions appear as an inline card below the log, holding all pending questions with one `Send answer` / `Skip` row; a single confirm shows only `Yes` / `No`.
   - The input is disabled, with the placeholder `Answer the question above`, while a question is open.
   - The header has a `History` view (list of conversations, `Waiting` marks one with a pending question) and `New chat`; reopening the panel goes to the last thread.
   - Stop aborts the run and reloads the thread from the server, so no half reply stays behind.
   - Copy: tool progress `Checking your tasks…` / `Updating tasks…`; errors `Assistant not configured` and `The assistant hit a problem. Try again.`; answered lines `Yes`, `No`, `Skipped`, or the answers joined with `; `.
   Polish **[Owner, 2026-11-05]** (visual reference: `design-assets/assistant-panel-demo.html`):
   - Animated open and close from the corner button.
   - Header with a mark, a thread subtitle and icon buttons with tooltips.
   - Empty state with three suggestions.
   - Assistant replies without a bubble; user messages as soft accent bubbles.
   - Thinking dots, then a status pill while a tool runs.
   - Copy button on replies; `Jump to latest` when scrolled up.
   - Pill-shaped auto-growing input: Enter sends, Shift+Enter adds a line, round send/stop button.
   - The question card slides up above the input.

Conventions:
- The design's tokens (`journal-tokens.css`) become CSS custom properties on `:root`; components use only tokens. A dark theme from the design system's dark values, following the OS setting. **[Call]**
- Components rebuilt as TypeScript, one folder each with its test: Button, Kbd, DayHeader, ProgressRing, NowCard, DayEmpty, TaskInput, TaskItem (CarryMarker, TicketChip), TaskMenu, CommentSheet, PeriodSwitch, StatTile, ReviewItem. The design's `bundle.js`/`bundle.css` are the reference for markup, class names and behaviour, not a dependency.
- Fonts: Source Serif 4 (500, 600), IBM Plex Sans (400, 500, 600), IBM Plex Mono (500), from Google Fonts.
- Containers fetch; presentational components render. Every screen has loading skeleton, empty and error states.
- Keyboard map from the design system: N or `/` focus input; Enter adds and keeps focus; ↑↓ move; Alt+↑↓ reorder the focused task; Space or X toggle; D drop; `[` `]` previous/next day; T today; G jump to date; C note; R look back; ⌘/Ctrl K search; ⌘/Ctrl J assistant; Esc closes overlays. Shortcuts never fire while typing in an input or the note.
- WCAG 2.1 AA: real buttons, inputs and labels; visible 2 px accent focus ring; state never by colour alone; checked at 320, 768, 1024, 1440 px.

## 7a. Assistant

Decided by the owner: a real assistant in the first build, built with LangChain, starting with Gemini. Everything else here is **[Call]**.

- **Provider-swappable:** `LLMFactory` builds and caches the chat model from `ASSISTANT_MODEL` (`provider:model`, default `google:gemini-3.8-flash`; Google and OpenAI registered). Each provider is one builder function, so adding another is a one-place change.
- **Tools**, reading the database and the client's today from the run context, and reusing the backend's own functions so carry-over and counting rules hold:
  - `list_day(date)`: the day's tasks with ids, status and carried days.
  - `search(query)`: same as the search endpoint.
  - `add_task(date, text)`.
  - `update_task(task_id, status?, text?, delete?)`: `status` is `done`, `dropped` or `open`; `text` is 1–500 characters; at least one of status, text or `delete=true` is required, and `delete` cannot be combined with the others. All apply to the task's whole chain (delete removes every copy, like the REST delete). `status` is a literal in the tool schema, so the model can only send the three values.
- **Limits:** it never reads or edits notes beyond what search returns. The assistant is a deep agent (`create_deep_agent`) with subagents turned off, so it has no `task` tool. A hard gate pauses only a delete (`update_task` with `delete=true`) and asks the user first; adding a task and changing a status or text run without asking, so the user is not interrupted. **[Owner, 2026-11-07]**
- **System prompt:** today's date and long weekday (filled per request), the design system's voice (short, no praise, no emoji, digits for numbers), and an instruction to say which tasks it changed.
- **Conversation:** stored on the server. **[Owner, 2026-11-04]** This reverses the first design (history kept in the browser tab). Agent state lives in a LangGraph MongoDB checkpointer (`BatchedMongoDBSaver`, which reads the message history in two queries however long the thread is); an `assistant_threads` collection holds the list rows `{_id, title, created_at, updated_at, pending}`. The title is the first 60 characters of the first message. The client creates the `threadId`; the server uses only the last user message (1–4 000 characters). Renaming and deleting threads are not built.
- **Questions:** the confirm gate and the `ask_user` tool (`single_choice`, `multi_choice`, `free_text`) pause the run with a LangGraph `interrupt()`. Each is an AG-UI `Interrupt` `{id, reason, message, tool_call_id?, metadata?}`:

  | `reason` | Raised by | Answer (`payload`) |
  |---|---|---|
  | `confirm` | the gate | `"yes"` or `"no"` |
  | `single_choice` | `ask_user` | a string (1–500 characters) |
  | `multi_choice` | `ask_user` | 1–7 strings (1–500 characters each) |
  | `free_text` | `ask_user` | a string (1–500 characters) |

  Choice options are in `metadata.options` (2–6 options). Dismissing a question (`status: "cancelled"`) counts as "no" for `confirm`; `ask_user` then tells the agent the user skipped it. An answered `ask_user` question stays in the conversation as an assistant line and its answer as a user line, live and in the thread history; the confirm gate's `Yes`/`No` line is shown live only. **[Owner, 2026-11-07]**
- **Protocol:** AG-UI 1.0 (`ag-ui-protocol`), events built by hand from the LangGraph stream. `RUN_STARTED`; `TEXT_MESSAGE_*`; `TOOL_CALL_*` only for the journal tools and `ask_user`; then `RUN_FINISHED` with `result: {changed}` or, when paused, `outcome: {type: "interrupt", interrupts: [...]}` (all pending questions in one event). Failure: `RUN_ERROR` with "The assistant hit a problem. Try again."
- **Resume:** `resume[]` entries `{interruptId, status: "resolved" | "cancelled", payload?}`, matched to pending questions by id. A new message while a question is pending → 409; a resume with nothing pending → 409; ids that don't match the pending set, or a wrongly shaped answer → 422. These read the real state, not the row's `pending` flag.
- **Input checks:** every tool validates its inputs and returns a corrective message the model can act on (what is wrong, the rule, where to get the right value). The confirm gate never asks about a call that would fail those checks.
- **Failure:** no API key → `503 {"detail": "Assistant not configured"}`; provider errors → `RUN_ERROR`, never a stack trace. At most 8 model calls per run.

## 8. Repo layout [Call]

```
todo_app/
  docs/              design.md, project-description.md (not part of either repo)
  backend/           FastAPI app, tests, pyproject.toml, .env.example, README, .claude/agents/
  frontend/          Vite app, src/components/*, tests, package.json, .env.example, README, .claude/agents/
```

## 9. Constraints

- Two repos, no shared code, no monorepo tooling.
- Secrets only in git-ignored env files.
- Each repo installs, runs and tests from its own folder with commands in its README.

## 10. Left to the builder / still open

Left to the builder: exact request/response shapes, internal module layout, build order within the plan.

Open, not blocking the first release:
- Importing the old history file (done status is lost in it).
- Copy/export of the weekly summary for reports.
- Deployment, and with it authentication.

## 11. Done for the first release

In a browser, against Atlas: open today and see carried-in tasks via the morning handover; add, check, uncheck, drop and delete tasks; write a note; move between days and jump to a date; open Look back for this week, last week and this month and click through Done and Remaining to the day; search a ticket ID and open its days; do all of it from the keyboard. Backend and frontend each pass their own tests from their own folder.
