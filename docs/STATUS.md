# Status

Updated 2026-11-05. A snapshot of now; see `../WORKING.md` for how to keep it.

## Now

First release + assistant. Plans: `plans/2026-10-22-backend.md`, `plans/2026-10-22-frontend.md`, `plans/2026-11-04-assistant-agui.md`, `plans/2026-11-05-assistant-panel.md`.

| Repo | Task | State |
|---|---|---|
| BE | 1–6 Core API (day, carry-over, status, review, search) | Merged |
| BE | 7 Assistant tools and model | PR #5 open (daily_todo_be), waiting for owner review and merge. Rebased on `main` and extended: `LLMFactory` (provider registry, Google + OpenAI, `ASSISTANT_MODEL=provider:model`, default `google:gemini-3.8-flash`), prompts in `assistant/prompt.py` (`SYSTEM_PROMPT` is a template: call sites use `.format(today=, weekday=)`, no `system_prompt()` function). Tools are module-level `TOOLS` reading `db`/`today` from a `JournalContext` in the run config (no `build_tools`). Pushed; origin is current. |
| BE | 8 Assistant (deep agent, AG-UI) | 8-0 and 8A-8C done. PR #7 open (daily_todo_be, `feat/assistant-agui`), waiting for owner review and merge. Real run checked with `gemini-3.5-flash-lite`. ab37112 drops the ignored Gemini `temperature` (silences the warning). |
| BE | Faster tests | PR #8 open (daily_todo_be, `chore/faster-tests`, base `feat/assistant-agui`), waiting for owner review. Suite ~170s -> ~82s: route tests use `InMemorySaver` (only `test_history`, marked `mongo_saver`, uses the real saver), concurrent cleanup. Remaining time is real Atlas calls in `test_chains`/`test_days`; a local Mongo (`MONGODB_TEST_URI`) would cut it further. |
| FE | 1–7 Core screens and assistant panel (stub) | Merged |
| FE | 8 End-to-end check | In progress: API checks pass; browser walk-through pending (branch `docs/task-8-api-check`) |
| FE | 9 Connect assistant panel | 9A done (BE commit 5688219 on PR #7). 9B done (FE 8b333ce on `feat/assistant-panel`). 9C done (2f83ebd, fix d6576e8). 9D done (36568d5, fix c3766c1). 9E done (012a7f9, fixes 6e6072b, 97ba42f). Final review fixes 938ec37. PR daily_todo_fe#13 open (`feat/assistant-panel`). Next: 9F real run in a browser (owner), then review and merge PR #7 (BE) first, then #13. |

## Next up

- Carry-over fix, plan `plans/2026-11-05-sync-endpoint.md` (written, not started; BE-1, BE-2, FE-1). Cause: a call with `today=2099-01-05` (origin never found) copied 5 open tasks to 2099, so `sync_today` skipped their chains and nothing carried to 2026-11-05. The 5 rows were deleted from the real DB on 2026-11-05. The plan adds a `today` bound, `POST /api/sync`, and a read-only `GET /api/days/{day}`.

- FE 8 browser walk-through: keyboard flow, widths 320/768/1024/1440, dark mode, focus rings (needs the owner or a browser tool).
- `ASSISTANT_MODEL` in `backend/.env` names `gemini-2.5-flash`, which Google no longer serves to new keys; set it to a current model (e.g. `google:gemini-3.5-flash-lite`). `gemini-3.8-flash` returned 503 high-demand during testing.
- Smoke-test thread rows `real1`-`real3` remain in the real DB (no thread delete yet).
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
