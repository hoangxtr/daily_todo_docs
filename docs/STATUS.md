# Status

Updated 2026-10-23. A snapshot of now; see `../WORKING.md` for how to keep it.

## Now

First release + assistant. Plans: `plans/2026-10-22-backend.md`, `plans/2026-10-22-frontend.md`.

| Repo | Task | State |
|---|---|---|
| BE | 1–6 Core API (day, carry-over, status, review, search) | Merged |
| BE | 7 Assistant tools and model | Not started |
| BE | 8 Assistant streaming endpoint | Not started |
| FE | 1–7 Core screens and assistant panel (stub) | Merged |
| FE | 8 End-to-end check | In progress: API checks pass; browser walk-through pending (branch `docs/task-8-api-check`) |
| FE | 9 Connect assistant panel | Blocked on BE 8 |

## Next up

- FE 8 browser walk-through: keyboard flow, widths 320/768/1024/1440, dark mode, focus rings (needs the owner or a browser tool).
- Rotate the Atlas password and the Gemini key (both were shared in chat).
- Update both repos' `CLAUDE.md` to point here and to `../WORKING.md`; remove the README status table in the frontend.

## Known issues (deferred)

- FE: a failed add doesn't restore the typed text.
- FE: rolling back one optimistic change can briefly undo a concurrent one.

## Open questions

- Import the old history file?
- Copy/export of the weekly summary?
- Hosting, and with it login?
