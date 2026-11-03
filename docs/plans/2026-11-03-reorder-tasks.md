# Reorder Tasks Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Dispatch `journal-backend` for BE tasks, `journal-frontend` for FE tasks.

**Goal:** The owner can change the order of a day's tasks by dragging, or from the keyboard, and the order persists.

**Status:** Approved by owner, 2026-11-03. Decisions marked **[Call]** are the writer's choices; **[Owner]** are confirmed.

**Spec change:** `design.md` §4 "Order" says manual reorder is not in the first release; this feature reverses that. Update §4, §6 and §7 in Task 3.

## Decisions

- **Scope [Owner, 2026-11-03]:** order is per day. Reordering on day D changes only D's `position`s. Copies already made on other days keep their own order; copies made later still go to the end of the new day (existing carry-over rule), so a reorder is not carried forward.
- **Storage [Call]:** reuse `tasks.position` (already indexed with `day`). The client sends the full ordered id list for the day; the server rewrites `position` 0..n-1. No fractional ranks, no new field.
- **API [Call]:** `PUT /api/days/{date}/order` with `{ "ids": [str] }`, returns 204. `ids` must be exactly the set of that day's task ids, else 409 and nothing is written. Full-list replace is idempotent and a stale client can't half-apply a move. Ceiling: a concurrent add from another tab makes the PUT fail with 409; the client then refetches. Fine for a single user.
- **Dragging [Call]:** owner left the choice open ("switch if you need"). Native HTML5 drag and drop on a grip handle; no new dependency. Ceiling: HTML5 DnD does not work on most touch browsers. Upgrade path: `@dnd-kit` if touch matters. Switch to it in Task 2 only if native DnD proves unusable.
- **Keyboard [Call]:** with a task focused, `Alt+↑` / `Alt+↓` moves it one place. This is required, not optional: the app is keyboard-first and WCAG 2.1 AA forbids a drag-only action. Existing `↑↓` still moves focus; the shortcut doesn't fire while typing.
- **Optimistic [Call]:** same wrapper as the other task mutations (`useOptimistic`): reorder the cache at once, roll back on error, invalidate on settle.
- **Rows [Owner, 2026-11-03]:** every row is draggable, including done and dropped.
- **Not in scope:** reordering across days, sorting by status, reordering in Look back or Search, undo.

## Review Focus

1. A PUT with a missing, extra, duplicated or malformed id returns an error and leaves the order unchanged (Task 1).
2. Dropping on the same spot sends no request (Task 2).
3. The API fails: the list snaps back and a quiet error shows (Task 2).
4. `Alt+↑` on the first task and `Alt+↓` on the last do nothing, and focus stays on the moved task after a move (Task 2).
5. Dragging never starts from the task text, so selecting text and following links still work (Task 2).

---

## Task 1 (BE): order endpoint

Branch `feat/reorder-tasks` in `backend/`. PR daily_todo_be#6.

**Files:** `app/schemas.py` (`OrderIn`), `app/days.py` (route), `tests/test_days.py`.

- [x] Test: reorder persists and `GET /api/days/{date}` returns the new order.
- [x] Test: wrong id sets (missing, extra, duplicate, unknown, non-ObjectId) return 409 or 422 and leave the order unchanged. *(Both tests are already written, uncommitted, on the branch.)*
- [x] See both fail for the right reason (404, no route).
- [x] Implement `PUT /days/{day}/order`: load the day's ids, compare as sets and lengths, `bulk_write` of `UpdateOne` setting `position`.
- [x] A non-ObjectId id returns 409 (the set comparison fails before any ObjectId is built).
- [x] `uv run pytest`, `ruff check .`, `ruff format --check .` pass; push; open PR.

**Contract change (say so in the PR):** new endpoint only; no existing shape changes.

## Task 2 (FE): drag and keyboard reorder

Branch `feat/reorder-tasks` in `frontend/`. PR daily_todo_fe#12. Depends on Task 1 being merged or running locally.

**Files:** `src/lib/api.ts` (+ test), `src/hooks/useDay.ts` (`useReorderTasks`), `src/components/TaskItem/` (handle, drag props, CSS, test), `src/pages/DayPage.tsx` (+ test, keyboard), `README.md` shortcut table.

- [x] Test: `api.reorderDay(date, ids)` sends `PUT /api/days/{date}/order` with `{ids}`.
- [x] Test: `useReorderTasks` moves a task in the cached day and rolls back on error.
- [x] Test: dropping task C above A calls the API with `[C, A, B]`; dropping in place makes no call.
- [x] Test: `Alt+↓` / `Alt+↑` move the focused task and keep focus on it; no-op at the ends; ignored while typing.
- [x] Implement. The `li` is `draggable` only while the grip handle is pressed. The handle is a real `button` with an accessible label ("Reorder: <text>") and the 2 px focus ring. Drop target shows a 2 px accent line, no animation beyond the existing 120 ms tint. Tokens only, no hex.
- [x] Drag state is local to `DayPage`; `TaskItem` stays presentational (props `onDragStart/onDragOver/onDrop`).
- [x] `npm test`, `npm run typecheck`, `npm run lint` pass.
- [ ] See it working in the browser: drag, `Alt+↑↓`, reload keeps the order, a carried-in day keeps its order after a reload.
- [x] Push; open PR.

## Task 3 (docs): close

In this repo, `main` directly.

- [ ] `design.md`: §4 Order rule (manual reorder per day; carried-in tasks start first in their previous order, then the owner's order sticks for that day); §6 API row; §7 keyboard map (`Alt+↑↓`) and the `TaskItem` note. Mark **[Owner, date]** once confirmed.
- [ ] `STATUS.md`: add the feature to "Now" while open; remove it when merged.
- [ ] When both PRs merge: `CHANGELOG.md` line, move this plan to `plans/done/`.
