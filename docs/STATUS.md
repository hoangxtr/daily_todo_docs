# Status

Updated 2026-11-04. A snapshot of now; see `../WORKING.md` for how to keep it.

## Now

First release + assistant. Plans: `plans/2026-10-22-backend.md`, `plans/2026-10-22-frontend.md`, `plans/2026-11-04-assistant-agui.md`.

| Repo | Task | State |
|---|---|---|
| BE | 1–6 Core API (day, carry-over, status, review, search) | Merged |
| BE | 7 Assistant tools and model | PR #5 open (daily_todo_be), waiting for owner review and merge. Rebased on `main` and extended: `LLMFactory` (provider registry, Google + OpenAI, `ASSISTANT_MODEL=provider:model`, default `google:gemini-3.8-flash`), prompts in `assistant/prompt.py` (`SYSTEM_PROMPT` is a template: call sites use `.format(today=, weekday=)`, no `system_prompt()` function). Tools are module-level `TOOLS` reading `db`/`today` from a `JournalContext` in the run config (no `build_tools`). Pushed; origin is current. |
| BE | 8 Assistant (deep agent, AG-UI) | 8-0 and 8A done (pushed, no PR yet). 8B/8C next; one branch `feat/assistant-agui`, one PR at the end of 8C. |
| FE | 1–7 Core screens and assistant panel (stub) | Merged |
| FE | 8 End-to-end check | In progress: API checks pass; browser walk-through pending (branch `docs/task-8-api-check`) |
| FE | 9 Connect assistant panel | Blocked on BE 8C; re-plan against AG-UI (`@ag-ui/client` `HttpAgent` with 1.0 interrupt outcomes and `resume[]`) |

## Next up

- FE 8 browser walk-through: keyboard flow, widths 320/768/1024/1440, dark mode, focus rings (needs the owner or a browser tool).
- Add `OPENAI_API_KEY` to `.env` to try OpenAI.
- Rotate the Atlas password and the Gemini key (both were shared in chat).
- Merge FE #11 (`vercel.json` SPA rewrite: refreshing `/day/<date>` on Vercel returned 404). After the deploy, check a direct load and refresh, and that the Vercel Root Directory is `frontend`.
- Merge BE #4 and FE #10 (CLAUDE.md now points here). Merge BE #4 before the assistant PR: `feat/assistant-tools` was branched on top of its commit. Then delete `handbook.md` from this repo.

## Known issues (deferred)

- FE: a failed add doesn't restore the typed text.
- FE: rolling back one optimistic change can briefly undo a concurrent one.
- FE: keyboard users can't tab to links inside a rendered note.

## Open questions

- Import the old history file?
- Copy/export of the weekly summary?
- Hosting, and with it login?
