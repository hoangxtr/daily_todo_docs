# Carry-over sync endpoint — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make carry-over impossible to break with a bad `today`, and stop `GET /api/days/{day}` from writing to the database.

**Architecture:** A new `POST /api/sync` runs the existing `chains.sync_today`. Every `today` that reaches `sync_today` (from `POST /api/sync` and from the assistant's `forwardedProps.today`) passes through one validator that rejects dates more than one day ahead of the server's UTC date. `GET /api/days/{day}` becomes a pure read. The frontend syncs once per page load, before it first reads today.

**Tech Stack:** FastAPI + pymongo async (BE); React + TanStack Query (FE). No new dependencies.

**Spec:** `docs/design.md` §4 ("When copies are made") and §6 (API table). Task BE-2 edits both.

**Why:** On 2026-11-04 a call with `today=2099-01-05` copied 5 open tasks onto 2099-01-05. Their chains' latest copy was then in the future, so `sync_today` skipped them and nothing carried to Thursday 2026-11-05. The rows were deleted by hand; the cause call was never found. Today the server trusts any client `today`, and a GET writes to the database (on every page load, tab refocus and mutation refetch).

## Global Constraints

- Dates are `YYYY-MM-DD` strings. The server never decides what today is; the client still sends it.
- Accepted `today`: `today <= datetime.now(UTC).date() + 1 day`. The one-day margin covers clients up to UTC+14. There is no lower bound.
- A rejected `today` returns 422 and writes nothing.
- `sync_today` itself does not change.
- `GET /api/review` keeps its read-only `today` parameter.
- Response of `POST /api/sync`: `{"inserted": <int>}`.
- Branch per task (`feat/<name>`, `fix/<name>`), one PR per task in that repo. BE checks: `uv run pytest`, `uv run ruff check .`, `uv run ruff format --check .`. FE checks: `npm test`, `npm run typecheck`, `npm run lint`.
- Ship order: BE-1 can merge alone (additive). **BE-2 and FE-1 must be deployed together**, because after BE-2 an old frontend no longer triggers carry-over.

## Review Focus

1. A future `today` (`2099-01-05`) sent to `POST /api/sync` is rejected and no row is written. Test in BE-1.
2. `today` = the server's UTC date + 1 day is accepted (a user in UTC+14), and + 2 days is rejected. Test in BE-1.
3. The assistant's `forwardedProps.today = "2099-01-05"` is rejected with 422 before any tool runs, and writes nothing. Test in BE-1.
4. Five concurrent `POST /api/sync` calls still insert exactly one copy. Test in BE-2 (the existing concurrency test, moved to POST).
5. `GET /api/days/{today}` inserts nothing, even when an open chain is waiting to carry. Test in BE-2.
6. The frontend never shows today's tasks as final when the sync failed: it shows the error state, and Retry runs the sync again. Test in FE-1.

---

### Task BE-1: Validate `today`, add `POST /api/sync`

**Files:**
- Create: `backend/app/today.py`
- Modify: `backend/app/schemas.py`, `backend/app/days.py`, `backend/app/assistant/routes.py:182-185`
- Test: `backend/tests/test_sync.py` (new), `backend/tests/test_assistant_route.py`

**Interfaces:**
- Produces: `check_today(today: date) -> str` in `app/today.py`. It returns `today.isoformat()`, or raises `HTTPException(422, "today is too far in the future")`.
- Produces: `class SyncIn(BaseModel): today: date` in `schemas.py`.
- Produces: `POST /api/sync` body `SyncIn`, returns `{"inserted": int}`, status 200.

- [x] **Step 1: Write the failing tests** in `backend/tests/test_sync.py`, using the `client` and `db` fixtures like `test_chains.py`:
  - `test_sync_carries_open_task`: add a task on `D21`, `POST /api/sync {"today": D22}` returns `{"inserted": 1}`; a second call returns `{"inserted": 0}`.
  - `test_sync_rejects_far_future`: `POST /api/sync {"today": "2099-01-05"}` is 422 and `db.tasks.count_documents({"day": "2099-01-05"}) == 0`, with one open task present.
  - `test_sync_bound_is_utc_plus_one_day`: with `base = datetime.now(UTC).date()`, `base + 1 day` is 200 and `base + 2 days` is 422.
- [x] **Step 2: Add to `backend/tests/test_assistant_route.py`** a test `test_run_rejects_future_today`, copying the request helper of the existing 422 test for a bad `forwardedProps.today`, with `"2099-01-05"`. Assert 422 and no `2099-01-05` rows.
- [x] **Step 3: Run `uv run pytest backend/tests/test_sync.py backend/tests/test_assistant_route.py -v`.** Expected: the new tests FAIL (404 on `/api/sync`, 200 on the assistant call).
- [x] **Step 4: Implement `check_today(today: date) -> str` in `app/today.py`** and `SyncIn` in `schemas.py`.
- [x] **Step 5: Add `@router.post("/sync")` in `days.py`** with the signature `async def sync(body: SyncIn, db: DB) -> dict`. It calls `check_today`, then `sync_today(db, today)`, and returns `{"inserted": n}`.
- [x] **Step 6: In `assistant/routes.py`**, after the existing `date.fromisoformat(...)` parse, pass the parsed date through `check_today` so a future date gives the same 422 before `build_agent`.
- [x] **Step 7: Run the BE checks.** Expected: all pass.
- [x] **Step 8: Commit** (`feat/sync-endpoint`).

> **Done 2026-11-05, with changes:** BE-1 and BE-2 shipped in one PR (daily_todo_be#9, `feat/sync-endpoint`, from `main`). Only one new test (`test_sync_rejects_far_future`): the owner wants no redundant tests, so the carry, idempotence and UTC+1 cases are covered by `test_chains.py` pointed at `POST /api/sync`. Steps 2 and 6 (assistant) stay open: the AG-UI route exists only on PR #7, so do them on top of #7 (or on `main` once it merges).

### Task BE-2: Make `GET /api/days/{day}` read-only

**Files:**
- Modify: `backend/app/days.py:77-80`, `backend/tests/test_chains.py`, other tests found by `grep -rn '"today"' backend/tests`
- Modify (docs): `docs/design.md` §4 and §6, `backend/README.md`

**Interfaces:**
- Consumes: `POST /api/sync` from BE-1.
- Produces: `GET /api/days/{day}` with no `today` parameter and no writes. Signature: `async def get_day(day: date, db: DB) -> DayOut`.

- [x] **Step 1: Write the failing tests** in `test_chains.py`:
  - `test_get_today_does_not_sync`: add a task on `D21`, `GET /api/days/{D22}`; assert `db.tasks.count_documents({"day": D22}) == 0` and the response has no tasks.
  - Change the `view` helper so that when `day == today` it first calls `POST /api/sync {"today": today}`, then GETs the day without `params`. Keep the other tests' assertions unchanged.
  - Change `test_concurrent_sync_no_duplicates` to gather five `POST /api/sync` calls; still assert one copy in `D22`.
- [x] **Step 2: Run `uv run pytest -v`.** Expected: `test_get_today_does_not_sync` FAILS (GET still syncs when given `today`; with no `today` it is a 422 today).
- [x] **Step 3: Remove the `today` parameter and the `sync_today` call from `get_day`.** Delete the `sync_today` import if it is unused. `load_day` is unchanged.
- [x] **Step 4: Fix every other test that relied on GET syncing** (grep for `"today"` in `backend/tests`; `test_days.py`, `test_review.py` and `test_assistant_tools.py` are the likely ones). The assistant's `list_day` keeps syncing; `test_list_day_syncs_today` should still pass unchanged.
- [x] **Step 5: Update docs.**
  - design.md §4, "When copies are made": the sync is `POST /api/sync`, called by the client once per page load for its today, and never by a GET. State the `today` bound. Mark it `**[Owner, 2026-11-05]**`.
  - design.md §6 API table: add `POST /api/sync`, and remove `?today=` and "Runs the carry-over sync…" from the `GET /api/days/{date}` row.
  - `backend/README.md`: the same two table changes.
- [x] **Step 6: Run the BE checks.** Expected: all pass.
- [x] **Step 7: Commit** (`fix/get-day-read-only`).

### Task FE-1: Sync once per page load, then read

**Files:**
- Modify: `frontend/src/lib/api.ts:29-30`, `frontend/src/hooks/useDay.ts:17-18`
- Test: `frontend/src/pages/DayPage.test.tsx`, and the `vi.mock("./lib/api", …)` factories in `App.test.tsx`, `SearchOverlay.test.tsx`, `MorningHandover.test.tsx`, `ReviewPage.test.tsx`
- Modify (close-out): `docs/STATUS.md`, `docs/CHANGELOG.md`; move this plan to `docs/plans/done/`

**Interfaces:**
- Consumes: `POST /api/sync` (BE-1) and the read-only `GET /api/days/{day}` (BE-2).
- Produces: `sync(today: string): Promise<{ inserted: number }>` and `getDay(date: string): Promise<Day>` in `api.ts`.
- Produces: `useDay(date)` keeps returning what `DayPage` reads today (`data`, `isError`, `refetch`). For today's date, `data` stays undefined until the sync has succeeded; `isError` is true if the sync or the read failed; `refetch` re-runs whichever failed.

- [x] **Step 1: Write the failing tests** in `DayPage.test.tsx`, next to the existing `getDay` tests (add `sync: vi.fn()` to the api mock):
  - `syncs before reading today`: render today's route; assert `api.sync` is called with today's date and `api.getDay` is called only after it resolved (use a deferred promise for `sync`).
  - `does not sync a past day`: render a past date; `api.sync` is not called.
  - `syncs once, not on refetch`: add a task (which invalidates `["day"]`); `api.getDay` is called again, `api.sync` has exactly 1 call.
  - `shows the error state when the sync fails`: `sync` rejects; the existing error UI shows and `getDay` is never called; clicking Retry calls `sync` again and then renders the tasks.
- [x] **Step 2: Run `npm test -- DayPage`.** Expected: the new tests FAIL.
- [x] **Step 3: In `api.ts`**, add `sync` (POST `/api/sync`, body `{ today }`, written like `addTask`) and drop `today` from `getDay` and its URL.
- [x] **Step 4: In `useDay.ts`**, for `date === todayLocal()` add a query keyed `["sync", today]` with `staleTime: Infinity` that calls `api.sync(today)`, and enable the day query only once it has succeeded. For any other date the day query is enabled immediately and no sync runs. Because the key includes `today`, a re-render after midnight syncs again. The mutation `onSettled` invalidations stay as they are (they must not invalidate `["sync"]`).
- [x] **Step 5: Add `sync` to the api mock factories** in the other test files named above, so they still pass.
- [x] **Step 6: Run the FE checks.** Expected: all pass.
- [ ] **Step 7: Manual check** with BE and FE running: open today with an open task on an earlier day; it appears. Refresh; no duplicate. Do not try future dates against the real database.
- [ ] **Step 8: Close-out.** Update `STATUS.md`, add a line to `CHANGELOG.md`, and move this plan to `docs/plans/done/` (WORKING.md "Close").
- [x] **Step 9: Commit** (`fix/sync-on-load`).

> **Done 2026-11-05 except steps 7 and 8:** daily_todo_fe#14 (`fix/sync-on-load`, from `main`). Only 2 new tests (`syncs_today_once_before_reading`, `sync_error_retry`) plus a not-called assertion in `renders_day`; `api.test.ts` and `MorningHandover.test.tsx` updated for the new `getDay(date)` signature. Step 7 (manual check with both servers) is for the owner after deploying #9 and #14 together. Step 8: the plan stays here, not in `done/`, until the assistant `today` check (BE-1 steps 2 and 6) lands and the CHANGELOG line is added.

> **Assistant steps (BE-1 steps 2 and 6) done 2026-11-05:** daily_todo_be#10 (`fix/assistant-future-today`, based on `feat/assistant-agui`). The test is one new case in `test_validation_422`, not a separate test. Still open for the close-out: merge #7, #9, #10, #14, check carry-over by hand (FE-1 step 7), then add the CHANGELOG line and move this plan to `done/`.
