# Status

Updated 2026-11-05 (Day page redesign PR open). A snapshot of now; see `../WORKING.md` for how to keep it.

## Now

First release + assistant. Plans: `plans/2026-10-22-backend.md`, `plans/2026-10-22-frontend.md`, `plans/2026-11-04-assistant-agui.md`, `plans/2026-11-05-assistant-panel.md`, `plans/2026-11-05-assistant-ui-polish.md`.

| Repo | Task | State |
|---|---|---|
| BE | 1–6 Core API (day, carry-over, status, review, search) | Merged |
| BE | 7 Assistant tools and model | Merged (PR #5) |
| BE | 8 Assistant (deep agent, AG-UI) | Merged (PR #7, with the sync endpoint #9 and the assistant `today` check #10). Real run checked with `gemini-3.5-flash-lite`. |
| BE | Faster tests | Merged (PR #8). Remaining time is real Atlas calls in `test_chains`/`test_days`; a local Mongo (`MONGODB_TEST_URI`) would cut it further. |
| FE | 1–7 Core screens and assistant panel (stub) | Merged |
| FE | 8 End-to-end check | In progress: API checks pass; browser walk-through pending (branch `docs/task-8-api-check`) |
| FE | 9 Connect assistant panel | 9A-9E merged (PR #13). Next: 9F real run in a browser (owner). |
| FE+BE | Assistant replies render as Markdown | Merged (BE #11, FE #15): bubble uses `MarkdownView`, shared `.dj-md` styles, prompt asks for Markdown. Not yet seen in a browser (light/dark, long list, table). |
| FE | 10A-10D Assistant panel polish | Merged (PR #16). 10E browser check waiting on the owner. |
| FE | 11-0 to 11E Day page focus redesign | PR open: https://github.com/hoangxtr/daily_todo_fe/pull/18 (tests, typecheck, lint pass). 11F browser check waiting on the owner. |

## Next up

- FE Day page redesign: built in PR #18 (above); `plans/2026-11-05-day-focus-redesign.md`, demo `design-assets/day-focus-demo.html`. Skeleton shimmer is a second infinite animation (plan says one); see PR notes.

- FE 8 browser walk-through: keyboard flow, widths 320/768/1024/1440, dark mode, focus rings (needs the owner or a browser tool).
- `ASSISTANT_MODEL` in `backend/.env` names `gemini-2.5-flash`, which Google no longer serves to new keys; set it to a current model (e.g. `google:gemini-3.5-flash-lite`). `gemini-3.8-flash` returned 503 high-demand during testing.
- BE: thread history was slow (1 s for 2 messages, 7 s for 22; `MongoDBSaver` walks parent checkpoints one Atlas round trip each). Fixed by `BatchedMongoDBSaver` (2 queries, flat ~290 ms on the real threads): PR open https://github.com/hoangxtr/daily_todo_be/pull/13, plan `plans/2026-11-05-thread-history-speed.md`. Waiting for review and merge (owner). Delete the subclass once `langgraph-checkpoint-mongodb` ships its own override (0.5.1 does not).
- Smoke-test thread rows `real1`-`real3` remain in the real DB (no thread delete yet).
- Add `OPENAI_API_KEY` to `.env` to try OpenAI.
- BE: LangSmith traces didn't show because `Settings` doesn't export `.env` to `os.environ`; fixed with `load_dotenv()` in `app/main.py`, tests forced to `LANGSMITH_TRACING=false` (PR open, see backend repo). Trace check in the LangSmith `default` project pending (owner).
- Rotate the Atlas password and the Gemini key (both were shared in chat).
- FE #11 (`vercel.json` SPA rewrite) is merged: check that a direct load and a refresh of `/day/<date>` work on Vercel, and that the Vercel Root Directory is `frontend`.

## Known issues (deferred)

- FE: a failed add doesn't restore the typed text.
- FE: rolling back one optimistic change can briefly undo a concurrent one.
- FE: keyboard users can't tab to links inside a rendered note.

## Open questions

- Import the old history file?
- Copy/export of the weekly summary?
- Hosting, and with it login?
