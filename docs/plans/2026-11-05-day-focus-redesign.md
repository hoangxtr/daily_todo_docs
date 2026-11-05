# Day page focus redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Dispatch `journal-frontend` with `model: "sonnet"` for every task except 11-0. Tasks 11A to 11E run in order on one branch, `feat/day-focus-redesign`, branched from `main`, with one commit per task and a single PR for the whole plan (same shape as `2026-11-05-assistant-ui-polish.md`).

**Goal:** Restyle the Day page to the "B: Focus & depth" demo: a progress ring beside the date, a "Now" card for the first open task, quieter rows below, tasks and notes side by side, and tactile motion when a task is finished.

**Architecture:** Plain CSS and small presentational components; no new dependencies. `DayPage` stays the container and keeps all state, shortcuts and mutations. Pure list logic (which task is "Now", how reordering maps onto the stored order) goes into one tested module, `lib/focus.ts`. New leaf components: `ProgressRing` (replaces `ProgressMeter`), `NowCard`, `DayEmpty`, `TaskMenu` (extracted from `TaskItem`). Motion uses `transform`, `opacity` and two documented exceptions, and is off under `prefers-reduced-motion: reduce`.

**Tech Stack:** React 18, TypeScript, Vitest + Testing Library, CSS with the tokens in `src/styles/tokens.css`. Nothing new to install.

**Spec:** `docs/design.md` §2 and §7 item 1 (Task 11-0 updates them) and ADR 0012. Visual reference: `docs/design-assets/day-focus-demo.html`, tab **B** (open it in a browser; it is clickable, supports drag and Alt+↑/↓, and has `Dark` and `Empty day` toggles). Where this plan and the demo differ, this plan wins.

## Global Constraints

- No new packages. Icons are inline SVG, `aria-hidden="true"`.
- Tokens only, no raw hex and no `rgba()` outside `tokens.css`. Add to `tokens.css` in Task 11A, with dark values in the existing `prefers-color-scheme: dark` block:
  - `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);` and `--radius-2xl: 24px;`
  - `--shadow-lift: 0 24px 48px -24px rgba(70, 55, 20, 0.32);` (dark: `rgba(0, 0, 0, 0.6)`)
  - `--shadow-row: 0 14px 28px -20px rgba(70, 55, 20, 0.4);` (dark: `rgba(0, 0, 0, 0.6)`)
  - Shadows are tinted to the paper hue, never pure black in light mode.
- Motion durations (all inside `@media (prefers-reduced-motion: no-preference)`; the static, unanimated state is always the finished state):
  - check tick draws in 320ms after an 80ms delay, `--ease-out`
  - strikethrough sweeps across in 400ms, `--ease-out`
  - row rise-in 360ms from `translateY(10px)`, stagger 50ms, index capped at 8
  - Now card pop 400ms from `scale(0.97)` and `opacity: 0.6`, `--ease-spring`
  - progress ring fill 700ms, `--ease-out` (not the spring: an overshoot would wrap the ring)
  - hover lift `translateY(-1px)` 200ms; `Mark done` `:active` is `translateY(1px) scale(0.97)`
  - one infinite animation only: the 8px dot on the Now card, a 2.4s opacity and scale "breathe"
- Only `transform` and `opacity` animate, with two exceptions on single small elements: `stroke-dashoffset` (tick and ring) and `background-size` (the strikethrough line).
- Keep these accessible names and roles, because existing tests use them: checkbox `Mark done: <text>` / `Mark not done: <text>` on list rows, `Reorder: <text>`, `More actions for <text>`, textbox `Add a task`, textbox and region `Comments` / `Edit comments`, button `Previous day`, `Next day`, `Try again`, progressbar `Tasks done`, text `N of M done`, `No tasks yet`, `Couldn't save. Try again.`, `Couldn't load this day.`. The Now card's button is a **button** (not a checkbox) named `Mark done: <text>`.
- New copy (sentence case, no exclamation marks, no emoji, no praise):
  - Day summary under the date: `A clean day` (no tasks), `All done`, `N left`, `N left, M carried in`
  - Now card: kicker `Now`; button `Mark done`; line `N more after this` (hidden when N is 0); `stuck` after the carry marker at 5 or more days
  - Section titles `Up next`, `Done`, `Dropped`, each with a count; a section with no tasks is not rendered
  - Empty day: title `Nothing planned yet`, line `Press N and type the first task. Open ones carry over by themselves.`
  - All done: title `Everything is done`, line `Nothing left today. Add something for later or close the laptop.`
- Rows and the Now card keep an accent focus ring, 2px with 2px offset. State is never colour alone: done keeps the tick and the strikethrough, stuck keeps the `stuck` / carry text.
- Tests: `npm test`, `npm run typecheck` and `npm run lint` must pass before each commit. jsdom applies no CSS, so tests assert DOM, attributes, class names and calls; for CSS rules, read the file and match it, as `TaskItem.test.tsx` already does. The look is checked in Task 11F.

## Review Focus

1. Reordering with done and dropped tasks interleaved: the ids sent to the API must contain every task exactly once, and done and dropped tasks must keep their own slots. Test in 11A.
2. A carried task whose chain was finished on a later day (own `status` open, `chain_status` done) belongs in Done, is not draggable, and still shows its `done <date>` label. Test in 11A and 11B.
3. Zero tasks and all done: the ring must not show `NaN` or `Infinity`, the Now card is replaced by the right empty state, and the add input still works. Test in 11C, 11D and 11E.
4. Optimistic `tmp-` tasks: not draggable, `Mark done` does nothing until saved, and they are never the target of a keyboard move. Test in 11E.
5. After the Now task is marked done, keyboard focus stays on a valid row (the new Now), nothing throws when the last open task is finished, and Space with no tasks does nothing. Test in 11E.
6. Reduced motion: with animations off, a done row still shows the full tick and the full strikethrough. Test in 11B.

---

### Task 11-0: Record the design (main session, docs repo)

- [x] **Step 1:** Demo saved as `docs/design-assets/day-focus-demo.html` (copied from the session scratchpad, 2026-11-05).
- [x] **Step 2:** Write `docs/decisions/0012-day-page-focus-layout.md` with the headings of the existing ADRs. Decision **[Owner, 2026-11-05]**: the Day page moves to the "Focus & depth" layout, and the anti-goal "no motion beyond a 120 ms fill or tint" is relaxed for the Day page to the motions listed in this plan. Still banned: praise text, confetti, emoji, sound. Alternatives recorded: A (current layout, more motion) and C (bento grid), both rejected by the owner after the demos. Consequences: the "Now" card makes the first open task the focus, so the stored order is also the work order; only open tasks can be reordered. Add the row to the table in `docs/decisions/README.md`.
- [x] **Step 3:** In `design.md`: in §2 replace the motion clause of the anti-goals with a pointer to ADR 0012; rewrite §7 item 1 as: header with Search and Look back; date header with a progress ring and a one-line summary; a "Now" card for the first open task, then Up next, Done and Dropped; the note sheet beside the tasks at ≥980 px and below them otherwise; shortcut legend. Add the new components to the conventions list (`ProgressRing` replaces `ProgressMeter`; `NowCard`, `DayEmpty`, `TaskMenu`). Keep the keyboard map and state that Alt+↑/↓ and dragging reorder open tasks only.
- [x] **Step 4:** In `frontend/.claude/agents/journal-frontend.md`: replace the line "Rows are separated by hairlines, not cards. Nothing pill-shaped. Motion is 120ms ease-out fills and tints only." with "Day page: rounded rows and cards with tinted shadows (ADR 0012); other screens keep hairlines. Motion is limited to the durations in `docs/plans/2026-11-05-day-focus-redesign.md` and always sits inside `prefers-reduced-motion: no-preference`." Change "side by side from 1120px" to "from 980px" and the component list entry `ProgressMeter` to `ProgressRing`. Add `--ease-spring`, `--radius-2xl`, `--shadow-lift`, `--shadow-row` to the token list. (The agent reads this file, so this must land before Task 11A.)
- [x] **Step 5:** Commit and push the docs repo: `docs: ADR and design for the Day page focus layout`. Branch the frontend repo: `git checkout -b feat/day-focus-redesign` from an up-to-date `main`.

---

### Task 11A: Tokens and focus logic

**Files:**
- Modify: `frontend/src/styles/tokens.css`
- Create: `frontend/src/lib/focus.ts`, `frontend/src/lib/focus.test.ts`
- Create: `frontend/src/test/motionCss.ts` (test helper, no component imports it)

**Interfaces:**
- Produces, all exported from `lib/focus.ts` (`Task`, `Day`, `Status` come from `lib/types.ts`):
  - `visualStatus(t: Task): Status` — `t.status` unless it is `open`, then `t.chain_status`. This is the rule already duplicated as `visual` in `DayPage.tsx` and `visualStatus` in `TaskItem.tsx`; both switch to this one.
  - `type Split = { now: Task | null; next: Task[]; done: Task[]; dropped: Task[] }`
  - `splitTasks(tasks: Task[]): Split` — keeps the given order; `now` is the first task whose visual status is `open`, `next` is the other open ones.
  - `orderedTasks(s: Split): Task[]` — `now` (if any), `next`, `done`, `dropped`. This is the on-screen order and the keyboard order.
  - `moveOpen(tasks: Task[], id: string, dir: -1 | 1): string[] | null` — new full id order after moving an open task one step among the open tasks, or `null` if `id` is not open or has no neighbour in that direction.
  - `dropOpen(tasks: Task[], fromId: string, toId: string, after: boolean): string[] | null` — new full id order after moving open task `fromId` before (or, if `after`, after) open task `toId`; `null` if either is not open or they are the same.
  - `daySummary(d: Pick<Day, "total" | "done" | "carried_in">): string` — the summary copy from Global Constraints.
- In `test/motionCss.ts`: `expectMotionGuarded(css: string): void` — fails unless the file contains `@media (prefers-reduced-motion: no-preference)` and no `@keyframes` or `animation:` appears before the first occurrence of it.

- [x] **Step 1: Write the failing tests** in `focus.test.ts`, with a `task(o)` factory like the one in `TaskItem.test.tsx`:
  - `splitTasks` on `[done A, open B, open C, dropped D, open-but-chain-done E]` gives `now = B`, `next = [C]`, `done = [A, E]`, `dropped = [D]`; `orderedTasks` gives `[B, C, A, E, D]`. All-done input gives `now = null`. Empty input gives all-empty.
  - `moveOpen` with ids `[A done, B open, C dropped, D open, E open]`: `moveOpen(tasks, "D", -1)` equals `["A","D","C","B","E"]` (B and D swap slots; A and C stay put); `moveOpen(tasks, "B", -1)` is `null`; `moveOpen(tasks, "E", 1)` is `null`; `moveOpen(tasks, "A", 1)` is `null` (not open).
  - `dropOpen(tasks, "E", "B", false)` equals `["A","E","C","B","D"]`; `dropOpen(tasks, "B", "E", true)` equals `["A","D","C","E","B"]`; `dropOpen(tasks, "B", "B", false)` is `null`. In every case the result is a permutation of the input ids.
  - `daySummary`: `{total:0,done:0,carried_in:0}` is `"A clean day"`; `{total:4,done:4,carried_in:2}` is `"All done"`; `{total:6,done:2,carried_in:3}` is `"4 left, 3 carried in"`; `{total:3,done:1,carried_in:0}` is `"2 left"`.
- [x] **Step 2: Run** `npx vitest run src/lib/focus.test.ts`. Expected: FAIL, module not found.
- [x] **Step 3: Implement** `lib/focus.ts` as above. For `moveOpen` and `dropOpen`, compute the new order of the open tasks only, then refill the slots the open tasks occupy in `tasks` with it, so non-open tasks never move. Replace the two duplicate status helpers in `DayPage.tsx` and `TaskItem.tsx` with imports (behaviour unchanged).
- [x] **Step 4: Add the tokens** listed in Global Constraints to `tokens.css`, and write `test/motionCss.ts`.
- [x] **Step 5: Run** `npm test && npm run typecheck && npm run lint`. Expected: all pass, with no change to existing tests.
- [x] **Step 6: Commit** `feat(fe): focus logic and tokens for the Day page redesign`.

---

### Task 11B: Task rows and the shared menu

**Files:**
- Create: `frontend/src/components/TaskMenu/TaskMenu.tsx`, `TaskMenu.test.tsx`
- Modify: `frontend/src/components/TaskItem/TaskItem.tsx`, `TaskItem.css`, `TaskItem.test.tsx`; `CarryMarker.css` if the pill needs a `stuck` colour (CSS only)

**Interfaces:**
- Produces: `TaskMenu({ task, onDrop, onDelete }: { task: Task; onDrop: () => void; onDelete: () => void })` — the `⋯` button, its popup with `Drop` / `Reopen` and `Delete`, and the existing delete confirmation (`Delete this task from all N days?` / `Delete this task?`). A straight extraction from `TaskItem`: same names, same behaviour.
- `TaskItem` props are unchanged. Its tick path is now always rendered, and the text is wrapped in `<span className="dj-task-label">`.

- [x] **Step 1: Write the failing tests.**
  - `TaskMenu.test.tsx`: opening shows `Drop`; for a dropped task it shows `Reopen`; `Delete` calls `window.confirm` with `Delete this task from all 3 days?` for `chain_length: 3`, and calls `onDelete` only when confirmed. (Move the equivalent assertions out of `TaskItem.test.tsx` if they exist there, so each lives once.)
  - `TaskItem.test.tsx`: an open task renders `.dj-check path` (the tick exists before it is checked) and the text sits inside `.dj-task-label`; a done task still has `aria-checked="true"` and class `dj-task-done`; a task with `status: "open"`, `chain_status: "done"` and `chain_closed_on: "2026-10-23"` shows a `done` label with the date and has no `Reorder:` button when `dnd` is not passed.
  - CSS (read `TaskItem.css`): `expectMotionGuarded(css)`; a rule `.dj-task-done .dj-check path` sets `stroke-dashoffset: 0` and `.dj-task-done .dj-task-label` sets `background-size: 100% 1px`, both **outside** the `no-preference` block (Review Focus 6); `.dj-task-text` keeps `overflow-wrap: anywhere` and `min-width: 0` (existing test).
- [x] **Step 2: Run** `npx vitest run src/components/TaskItem src/components/TaskMenu`. Expected: FAIL.
- [x] **Step 3: Extract** `TaskMenu` and use it in `TaskItem`; always render the tick path with `pathLength="1"`; add the label wrapper.
- [x] **Step 4: Restyle `TaskItem.css`** to the demo's B rows: no row hairlines, 4px gap between rows (set on `.dj-list` rows via `.dj-task + .dj-task` margin so `MorningHandover` still works), radius `--radius-xl` (16px), padding 14px 18px, round 22px checkbox, hover lifts to `--paper-raised` with a `--rule` border and `--shadow-row`. The strikethrough is the `.dj-task-label` background line (replace `text-decoration: line-through`). Stuck rows: `--carry-soft` ground at about 55% via `color-mix`, plus a 3px `--carry` rail drawn with a `::before` pseudo-element so it can coexist with the focus and drop-marker `box-shadow`s; the carry pill uses `--carry` on `--carry-soft` when stuck. Put all `@keyframes` and `animation` (tick draw, strike sweep, row rise via `style="--i"` set by the caller) inside one `no-preference` block at the end of the file.
- [x] **Step 5: Run** `npm test && npm run typecheck && npm run lint`. Expected: all pass (existing `DayPage` and `MorningHandover` tests still find `checkbox` names).
- [x] **Step 6: Commit** `feat(fe): rounded animated task rows, extract TaskMenu`.

---

### Task 11C: Progress ring and date header

**Files:**
- Create: `frontend/src/components/ProgressRing/ProgressRing.tsx`, `ProgressRing.css`, `ProgressRing.test.tsx`
- Delete: `frontend/src/components/ProgressMeter/` (its only user is `DayPage`)
- Modify: `frontend/src/components/DayHeader/DayHeader.tsx`, `DayHeader.css`, `DayHeader.test.tsx`; `frontend/src/styles/base.css` (add `.dj-sr-only`)

**Interfaces:**
- Produces: `ProgressRing({ done, total }: { done: number; total: number })`, and `ringOffset(done: number, total: number): number` exported from the same file (the `stroke-dashoffset` for a circle of radius 48: `2π·48 · (1 − done/total)`, and the full circumference when `total` is 0). Markup: a `role="progressbar"` element with `aria-label="Tasks done"`, `aria-valuemin=0`, `aria-valuemax={total}`, `aria-valuenow={done}`; an SVG ring `viewBox="0 0 112 112"`, stroke 8, rotated so it starts at 12 o'clock; centre text `done/total` in `--font-mono` 22px (a dash when `total` is 0) marked `aria-hidden`; a `.dj-sr-only` span with `N of M done` or `No tasks yet`.
- `DayHeader` gains two optional props: `lead?: ReactNode` (rendered before the titles) and `sub?: string` (a muted 14px line under the date). `h1` becomes 38/44 `--font-serif` with `letter-spacing: -0.015em`.

- [x] **Step 1: Write the failing tests.**
  - `ringOffset(0, 4)` equals the circumference (`2*Math.PI*48`); `ringOffset(4, 4)` equals `0`; `ringOffset(1, 2)` is half; `ringOffset(0, 0)` is the circumference and `Number.isFinite` holds.
  - `<ProgressRing done={3} total={5}/>` has a progressbar with `aria-valuenow="3"`, `aria-valuemax="5"` and text `3 of 5 done`; `done={0} total={0}` shows `No tasks yet` and the document text does not contain `NaN` (Review Focus 3).
  - `DayHeader`: with `lead={<i data-testid="lead"/>}` and `sub="2 left"` both render, the lead before the `h1`; without them the existing assertions still hold.
  - CSS: `expectMotionGuarded(ProgressRing.css)`; the fill circle has its `transition` for `stroke-dashoffset` inside the `no-preference` block.
- [x] **Step 2: Run** `npx vitest run src/components/ProgressRing src/components/DayHeader`. Expected: FAIL.
- [x] **Step 3: Implement** the component, the header props and `.dj-sr-only` (the standard visually-hidden rule). Delete `ProgressMeter`.
- [x] **Step 4: Run** `npm test && npm run typecheck && npm run lint`. Expected: `DayPage` tests fail only on the removed import; fix the import by temporarily rendering `ProgressRing` in place of `ProgressMeter` in `DayPage.tsx` (Task 11E finishes the layout). All pass.
- [x] **Step 5: Commit** `feat(fe): progress ring and header lead and summary`.

---

### Task 11D: Now card and empty states

**Files:**
- Create: `frontend/src/components/NowCard/NowCard.tsx`, `NowCard.css`, `NowCard.test.tsx`
- Create: `frontend/src/components/DayEmpty/DayEmpty.tsx`, `DayEmpty.css`, `DayEmpty.test.tsx`

**Interfaces:**
- Consumes: `TaskMenu` (11B), `CarryMarker`, `RichText` from `lib/rich`, `visualStatus` (11A).
- Produces:
  - `NowCard({ task, more, focused, note, onDone, onDrop, onDelete, dnd }: { task: Task; more: number; focused?: boolean; note?: string; onDone: () => void; onDrop: () => void; onDelete: () => void; dnd?: { mark?: "before"; onOver: () => void; onDrop: () => void } })` — a `<section aria-label="Now" tabIndex={-1}>` that focuses itself when `focused` (like `TaskItem`), is a drop target only (not draggable), shows the kicker `Now` with a breathing dot, the carry marker plus `stuck` when `carried_days >= 5`, the task text as an `h2` (`RichText`), the optional note, the `Mark done` button (`aria-label="Mark done: <text>"`), `N more after this` when `more > 0`, and the `TaskMenu`. It is keyed by task id by the caller so a new Now task replays the pop animation.
  - `DayEmpty({ kind }: { kind: "empty" | "cleared" })` — line-drawn SVG (a checklist outline, `viewBox="0 0 72 72"`, stroke 1.5), the title and line from Global Constraints; the `empty` line shows `N` inside `Kbd`.

- [x] **Step 1: Write the failing tests.**
  - `NowCard`: renders region `Now`; heading text equals the task text; clicking the button named `Mark done: Fix retries` calls `onDone` once; `more={3}` shows `3 more after this` and `more={0}` renders no such text; `carried_days: 6` shows `↻ 6d` and `stuck`, `carried_days: 2` shows no `stuck`; with `focused` the section has focus; `dnd.onOver` fires on dragover and `dnd.onDrop` on drop; a ticket ID in the text renders as a ticket chip.
  - `DayEmpty`: `kind="empty"` shows `Nothing planned yet` and the `Press` line with a `Kbd` `N`; `kind="cleared"` shows `Everything is done`.
  - CSS: `expectMotionGuarded(NowCard.css)`; the `.dj-now-done:active` rule is `translateY(1px) scale(0.97)`; the breathing animation is the only `infinite` animation in the file.
- [x] **Step 2: Run** `npx vitest run src/components/NowCard src/components/DayEmpty`. Expected: FAIL.
- [x] **Step 3: Implement** both components and CSS to the demo's B: Now card on `--paper-raised`, `--radius-2xl`, padding 28px 32px, `--shadow-lift` plus `inset 0 1px 0` highlight, title `--font-serif` 26/34 with `max-width: 30ch`, `Mark done` an accent pill with a tinted shadow; stuck cards get a 4px `--carry` left rail (`::before`). Title wraps with `overflow-wrap: anywhere`.
- [x] **Step 4: Run** `npm test && npm run typecheck && npm run lint`. Expected: all pass.
- [x] **Step 5: Commit** `feat(fe): Now card and empty states`.

---

### Task 11E: Day page layout and wiring

**Files:**
- Modify: `frontend/src/pages/DayPage.tsx`, `DayPage.css`, `DayPage.test.tsx`
- Modify: `frontend/src/components/CommentSheet/CommentSheet.tsx`, `CommentSheet.css`, `CommentSheet.test.tsx`
- Modify: `frontend/src/pages/MorningHandover.tsx` only if its imports changed (it should not need edits)

**Interfaces:**
- Consumes: everything from 11A to 11D.
- `CommentSheet` keeps its props; its textarea and read view get `style={{ minHeight: rows * 24 }}` so both match the `rows` prop (the Day page passes `rows={14}`).

- [x] **Step 1: Write the failing tests** in `DayPage.test.tsx` (it already mocks the API; reuse its helpers):
  - Day with tasks `Reply to Minh` (open), `Write the note` (done): the page has region `Now` with heading `Reply to Minh`, a section title `Done` with the done task under it, no `TODO` heading, text `1 of 2 done` and the summary `1 left`.
  - Marking via the Now button (`button`, name `Mark done: Reply to Minh`) sends the same patch the checkbox did; update the existing tests that clicked `checkbox` `Mark done: Reply to Minh` to use `button` for the Now task and keep `checkbox` for list rows.
  - Two open tasks: `Alt+ArrowDown` on the focused Now task calls the reorder API with `moveOpen`'s ids and focus moves to index 1; `ArrowDown` then `Space` toggles the second task. Keyboard order follows the screen order (Now, Up next, Done, Dropped), not insertion order (Review Focus 5).
  - A tmp (optimistic) task: while the add is pending the Now `Mark done` does nothing and the row has no `Reorder` button (Review Focus 4).
  - Empty day: shows `Nothing planned yet`, typing in `Add a task` and Enter still adds (Review Focus 3). Day where every task is done: shows `Everything is done` and summary `All done`.
  - A chain-done carried task renders under `Done`, not `Up next` (Review Focus 2).
  - Loading state renders the new skeleton (`aria-label="Loading"` kept); error state unchanged.
  - CSS (read `DayPage.css`): `.dj-daypage-cols` becomes two columns `minmax(0, 5fr) minmax(0, 4fr)` at `min-width: 980px`, one column below; the note column is `position: sticky` only at that width; `.dj-daypage` max-width is `1160px`; `expectMotionGuarded(css)`.
  - `CommentSheet`: title `Comments` still renders and the textbox name `Comments` is unchanged; the ruled-line `background-image` is gone from `CommentSheet.css`.
- [x] **Step 2: Run** `npx vitest run src/pages/DayPage.test.tsx src/components/CommentSheet`. Expected: FAIL.
- [x] **Step 3: Rewrite the body of `DayPage`:**
  - `const split = splitTasks(tasks)`, `const ordered = orderedTasks(split)`; `cur`, `onTask` and arrow keys index `ordered` instead of `tasks`.
  - Render, in order: `NowCard` (keyed by `split.now.id`) or `DayEmpty` (`empty` when there are no tasks, `cleared` when none is open); then a section each for `next`, `done`, `dropped` with an `h2` title and count, rows via `TaskItem` with `style={{ "--i": Math.min(index, 8) }}`; only `next` rows get `dnd`; then the `TaskInput` and the error line.
  - Drag state holds task ids (`{ from: string; over: string }`); a drop calls `dropOpen(tasks, from, over, after)` and Alt+↑/↓ calls `moveOpen(tasks, id, dir)`; either returning `null`, or any task id starting with `tmp-` in `tasks`, does nothing (as `move` does today). `after` is true when the dragged task sits above the target in the open order. The Now card's `dnd.mark` is `"before"` when it is the drag target.
  - `DayHeader` gets `lead={<ProgressRing …/>}` and `sub={handover ? carriedLabel(carriedOf(data)) : daySummary(data)}`; remove the `.dj-daypage-stats` row and the `TODO` heading.
  - Layout per the CSS test; the note column renders `NoteEditor` with `rows={14}`; stack under 980px.
  - Skeleton: one 160px block with `--radius-2xl` followed by three row-height blocks; shimmer inside `no-preference` only.
- [x] **Step 4: Restyle `CommentSheet.css`:** `--radius-2xl`, padding 24px 28px, `--shadow-lift`, no ruled lines; the title is a 12/16 uppercase, `0.06em` tracked, `--accent` kicker in `--font-sans` (text unchanged); `.dj-sheet-meta` stays muted.
- [x] **Step 5: Run** `npm test && npm run typecheck && npm run lint`. Expected: all pass. Fix any `MorningHandover` test that fails only because of restyled markup, without changing its behaviour.
- [x] **Step 6: Commit** `feat(fe): Day page focus layout, Now card, side-by-side notes`, then push the branch and open the PR (never merge).

---

### Task 11F: Check in a browser, then close (owner, with a browser tool if available)

- [ ] **Step 1:** Run `npm run dev` against the real API and walk through `/day/<today>` at 320, 768, 980, 1024 and 1440 px, light and dark: ring, Now card, stuck task, long ticket text and a long URL in the Now card (it must wrap, no horizontal scroll), empty day, all-done day, notes sticky beside the list and stacked below 980px.
- [ ] **Step 2:** Keyboard: N, ↑↓, Space/X, D, Alt+↑/↓ (the Now card moves down and the next task takes over), drag a row onto the Now card, Tab order, focus rings visible on rows, Now card and `Mark done`.
- [ ] **Step 3:** Turn on reduced motion in the OS or devtools: no animation runs, done rows still show the whole tick and strikethrough, the ring shows its final fill. Check the morning handover screen and the Review page for regressions from the shared row and sheet styles.
- [ ] **Step 4:** Close per `WORKING.md`: tick this plan's boxes, update `docs/STATUS.md` (remove the Now line when merged and add the PR link while open), add the CHANGELOG line and move this plan to `plans/done/` when the PR merges, and update `design.md` where anything differs.
