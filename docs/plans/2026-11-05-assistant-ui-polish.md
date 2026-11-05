# Assistant panel polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Dispatch `journal-frontend` with `model: "sonnet"` for every task. All tasks edit `AssistantPanel.tsx` and its CSS, so run them in order on one branch, `feat/assistant-ui-polish`, branched from `main`, with one commit per task and a single PR for the whole plan (owner decision, 2026-11-05).

Follows `2026-11-05-assistant-panel.md` (Task 9). That plan's Global Constraints still apply, in particular tokens only, the 2px accent focus ring, and every existing copy string.

**Goal:** Make the assistant panel look modern and feel smooth: animated open and close, a real empty state with suggestions, clearer messages and progress, and a better input.

**Architecture:** Plain CSS and small presentational components; no new dependencies. `AssistantPanel` stays the container and keeps all state and run logic. New pieces are leaf components (`Message`, `Progress`, `Suggestions`, `Composer`), one hook (`useStickToBottom`) and one tiny helper (`reducedMotion`). Motion uses only `transform` and `opacity`, and every animation is off under `prefers-reduced-motion: reduce`.

**Tech Stack:** React 18, TypeScript, Vitest + Testing Library, CSS with the tokens in `src/styles/tokens.css`. Nothing new to install.

**Spec:** `docs/design.md` §7 item 5 (Task 10-0 adds the polish decisions there). Visual reference: the live demo, saved by Task 10-0 as `docs/design-assets/assistant-panel-demo.html` (open it in a browser; it has the current panel on the left and the proposed one, clickable, on the right).

## Global Constraints

- No new packages. Icons are inline SVG, `viewBox="0 0 20 20"`, `strokeWidth="1.5"`, `aria-hidden="true"`, as in the current FAB.
- Tokens only, no raw hex. Add to `tokens.css` in Task 10A: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1);` and `--radius-xl: 16px;`. Pop shadows keep `--shadow-pop`.
- Motion: only `transform` and `opacity`. Panel open 320ms, panel close 180ms, message rise 360ms from `translateY(8px)`, suggestion stagger 60ms, all with `--ease-out`. Every `animation` and `transition` lives inside `@media (prefers-reduced-motion: no-preference)`.
- Keep these accessible names and roles unchanged, because existing tests use them: button `Open assistant`, `Close assistant`, `History` (with `aria-pressed`), `New chat`, `Send`, `Stop`; textbox label `Message the assistant`; region `Assistant`; `role="log"` on the message list; placeholders `Message the assistant` and `Answer the question above`.
- New copy (sentence case, no exclamation marks, no emoji):
  - Header subtitle `New conversation`, or the first user message cut to 36 characters plus `…`
  - Tooltips `History`, `New chat`, `Close (Esc)`
  - Empty state heading `What should we sort out today?`; line `Ask about your tasks, add one, or look back at the week.`; suggestions `What's left today?`, `Add a task to today`, `Summarize this week`
  - `Thinking` (status label for the dots), `Copy reply` (button label), visible text `Copy`, `Copied`, `Couldn't copy`
  - `Jump to latest`
  - Composer hint `Enter to send, Shift+Enter for a new line`
- The message limit, counter (`N/4000` past 3500) and all run logic in `AssistantPanel` do not change.
- Tests: `npm test`, `npm run typecheck` and `npm run lint` must pass before each commit. jsdom applies no CSS, so tests assert DOM, attributes, class names and calls, not looks. The look is checked in Task 10E.

## Review Focus

1. Closing takes 180ms, so the panel stays mounted briefly. Reopening inside that window must cancel the close, and closing during a run must still abort the run immediately. Test in 10A.
2. Reduced motion: the panel must unmount at once, with no timer and no wait for `animationend`. Test in 10A.
3. Enter must not send while an IME composition is active, and Shift+Enter must insert a newline. Test in 10D.
4. Copy must not throw when the clipboard API is missing or rejects. Test in 10B.
5. A suggestion tapped while the thread is still loading, or while a question is open, must do nothing; the suggestions are hidden in both cases. Test in 10C.
6. Scrolling up during a streamed reply must not be pulled back to the bottom. Test in 10B.

---

### Task 10-0: Record the design (main session, docs repo)

- [x] **Step 1:** Copy `/private/tmp/claude-502/-Users-hoangt-backbase-com-Desktop-code-sideproject/974ef4e9-22b9-4db5-9d50-513bb644f3b1/scratchpad/assistant-demo.html` to `docs/design-assets/assistant-panel-demo.html`.
- [x] **Step 2:** In `design.md` §7 item 5, add under **[Owner, 2026-11-05]**: animated open/close from the corner button; header with a mark, thread subtitle and icon buttons with tooltips; empty state with three suggestions; assistant replies without a bubble, user messages as soft accent bubbles; thinking dots, then a status pill while a tool runs; copy button on replies; "Jump to latest" when scrolled up; pill-shaped auto-growing input with Enter to send and a round send/stop button; question card slides up above the input.
- [x] **Step 3:** Commit and push the docs repo: `docs: plan and design for assistant panel polish`.

---

### Task 10A: Open and close motion, header

**Files:**
- Create: `src/lib/motion.ts`, `src/lib/motion.test.ts`
- Modify: `src/styles/tokens.css`, `src/pages/AssistantPanel.tsx`, `src/pages/AssistantPanel.css`, `src/pages/AssistantPanel.test.tsx` (tests at lines 67-77 and 161-166 must `await waitFor(...)` for the panel to disappear)

**Interfaces:**
- Produces: `reducedMotion(): boolean` and `CLOSE_MS = 180` in `src/lib/motion.ts`. `reducedMotion` returns `false` when `window.matchMedia` is missing (jsdom).

- [ ] **Step 1: Write the failing tests.** In `motion.test.ts`: `reducedMotion()` is `false` with no `matchMedia`; `true` when `matchMedia("(prefers-reduced-motion: reduce)").matches` is true. In `AssistantPanel.test.tsx`:
  - `close keeps the panel mounted with is-closing, then unmounts and returns focus`: click `Close assistant`; at once `region "Assistant"` has class `is-closing`; then `await waitFor` it is gone and `Open assistant` has focus.
  - `reopening during the exit cancels the close`: close, then press `mod+j` before it ends; after 300ms the region is still present and has no `is-closing`.
  - `closing during a run aborts at once`: start a run, press Esc, `abortRun` was called before the panel is gone.
  - `reduced motion unmounts at once`: stub `matchMedia` to match; after clicking close the region is gone with no `waitFor`.
  - `header buttons carry tooltips`: `History`, `New chat` and `Close assistant` have `data-tip` of `History`, `New chat`, `Close (Esc)`; no element with text `Esc` is rendered.
  - `subtitle shows the first message`: starts `New conversation`; after sending a 50-character message it shows the first 36 characters plus `…`.
- [ ] **Step 2: Run them to see them fail.** `npm test -- motion AssistantPanel`; expect FAIL for the new tests only.
- [ ] **Step 3: Implement.**
  - `motion.ts` as above. `tokens.css`: the two new tokens.
  - In `AssistantPanel`, add `closing` state and a timer ref. `toggle` when open: abort the run as now; if `reducedMotion()` call `setOpen(false)`; else `setClosing(true)` and a timer of `CLOSE_MS` that calls `setOpen(false); setClosing(false)`. `toggle` when closing clears the timer and `setClosing(false)`. Clear the timer on unmount.
  - The section gets `is-closing` while `closing`. The open animation is a CSS keyframe on `.dj-assistant` (scale `0.82` and `translateY(14px)` to none, `transform-origin: bottom right`).
  - Header: a 28px `dj-mark` (sparkle SVG) on an `--accent-soft` rounded square; title block with `h2 Assistant` and a one-line ellipsised subtitle; `History`, `New chat` and `Close assistant` become 32px icon buttons (`dj-iconbtn`) with `data-tip` shown by CSS on hover and `:focus-visible`. Remove `Kbd` and `Button` imports if now unused. Panel radius becomes `--radius-xl`; add a 14px gradient fade under the header (`::after`, `pointer-events: none`).
  - FAB: hover lifts 2px, active scales to 0.96, and a slow `::after` ring pulse (2.8s, infinite, `transform` and `opacity` only).
- [ ] **Step 4: Run the full suite, typecheck and lint.** Expect all PASS.
- [ ] **Step 5: Commit** `feat: animate the assistant panel and tidy its header`.

---

### Task 10B: Messages, progress, copy, jump to latest

**Files:**
- Create: `src/components/Message/Message.tsx`, `Message.css`, `Message.test.tsx`; `src/components/Progress/Progress.tsx`, `Progress.css`, `Progress.test.tsx`; `src/lib/useStickToBottom.ts`, `src/lib/useStickToBottom.test.tsx`
- Modify: `src/pages/AssistantPanel.tsx`, `AssistantPanel.css`, `AssistantPanel.test.tsx`

**Interfaces:**
- Produces:
  - `Message({ role, text, streaming }: { role: "user" | "assistant"; text: string; streaming?: boolean }): JSX.Element`. Assistant: a 24px mark, the text through `RichText`, and a `Copy` button (`aria-label="Copy reply"`) revealed on hover or focus. User: a soft accent bubble with `white-space: pre-wrap` and the bottom-right corner squared to 4px. `streaming` adds a blinking caret class to the assistant text.
  - `Thinking(): JSX.Element` (three bobbing dots, `role="status"`, `aria-label="Thinking"`) and `ToolPill({ label }: { label: string }): JSX.Element` (pulsing dot plus label, `role="status"`), both exported from `Progress.tsx`.
  - `useStickToBottom(dep: unknown): { ref: RefObject<HTMLDivElement>; stuck: boolean; jump(): void }`. `stuck` is true while within 60px of the bottom; when `dep` changes and `stuck`, it scrolls to the bottom; when not stuck it does nothing. `jump()` scrolls to the bottom and sets `stuck`. Uses `scrollTo?.(...)` as the panel does today.
- Consumes: `RichText` from `src/lib/rich.tsx`.

- [ ] **Step 1: Write the failing tests.**
  - `Message`: user text renders plain; assistant text renders markdown (reuse the sample used by the existing `renders a markdown reply` test); `streaming` adds the caret class; clicking `Copy reply` calls `navigator.clipboard.writeText(text)` and the button shows `Copied`; a rejecting `writeText` shows `Couldn't copy` and does not throw; with `navigator.clipboard` undefined the same.
  - `Progress`: `Thinking` has role status named `Thinking`; `ToolPill` shows its label.
  - `useStickToBottom` (a test component; set `scrollHeight`, `clientHeight`, `scrollTop` with `Object.defineProperty`): at the bottom, a `dep` change calls `scrollTo` with `top: scrollHeight`; with `scrollTop` 200 short of the bottom and a `scroll` event fired, `stuck` is false and a `dep` change does not call `scrollTo`; `jump()` calls it and makes `stuck` true.
  - Panel: `Thinking` is shown between send and the first token (pending `runTurn`) and gone once the `text` callback fires; the tool label appears as a status pill and the existing tool-copy tests still pass; `Jump to latest` appears after the log is scrolled up and clicking it scrolls to the bottom; a new message while scrolled up does not call `scrollTo`.
- [ ] **Step 2: Run them to see them fail.** Expect FAIL (modules missing).
- [ ] **Step 3: Implement** the three units to the interfaces above, then wire the panel: render each message with `Message` (`streaming` only for the last assistant message while `running`); show `Thinking` when `running && !tool && !pending.length && msgs.at(-1)?.role !== "assistant"`; render `tool` as `ToolPill` (the `note` line for errors stays a `dj-assistant-note`); replace the manual scroll `useEffect` and `list` ref with `useStickToBottom([msgs, note, tool])`; render `Jump to latest` (a pill button, hidden unless `!stuck`) over the bottom of the log. New messages animate with the 360ms rise; the log gets `scroll-behavior: smooth`.
- [ ] **Step 4: Run the full suite, typecheck and lint.** Expect all PASS.
- [ ] **Step 5: Commit** `feat: clearer assistant messages, thinking state and copy`.

---

### Task 10C: Empty state with suggestions

**Files:**
- Create: `src/components/Suggestions/Suggestions.tsx`, `Suggestions.css`, `Suggestions.test.tsx`
- Modify: `src/pages/AssistantPanel.tsx`, `AssistantPanel.css`, `AssistantPanel.test.tsx`

**Interfaces:**
- Produces: `Suggestions({ onPick }: { onPick(text: string): void }): JSX.Element`. It renders the mark, the heading and line from Global Constraints, and three buttons whose names are the three suggestion strings; a click calls `onPick` with that exact string. Buttons rise in with a 60ms stagger.
- Consumes: the existing `send` logic in `AssistantPanel`, refactored to `submit(text: string): Promise<void>` (trim, guard on `over`, `running`, missing agent, then the current body). The form handler becomes `(e) => { e.preventDefault(); void submit(draft); }`.

- [ ] **Step 1: Write the failing tests.** `Suggestions`: three buttons with the exact names; clicking each calls `onPick` with that text. Panel:
  - `fresh open shows the suggestions`.
  - `tapping a suggestion sends it`: `runTurn` is called with `{ text: "What's left today?" }`, the user line appears in the log, and the suggestions are gone.
  - `suggestions are hidden when the thread has history`.
  - `suggestions are hidden while a question is pending`.
  - `suggestions are hidden while a History pick is loading` (pending `getThread`), and a tap cannot reach the old agent.
  - `New chat brings the suggestions back`.
- [ ] **Step 2: Run them to see them fail.** Expect FAIL.
- [ ] **Step 3: Implement** `Suggestions`, the `submit` refactor, and a `loading` state set true at the start of `pick` and false when its `reload` settles. Show `Suggestions` inside the log area when `view === "chat" && !msgs.length && !running && !pending.length && !loading`.
- [ ] **Step 4: Run the full suite, typecheck and lint.** Expect all PASS.
- [ ] **Step 5: Commit** `feat: assistant empty state with suggestions`.

---

### Task 10D: Composer and question card motion

**Files:**
- Create: `src/components/Composer/Composer.tsx`, `Composer.css`, `Composer.test.tsx`
- Modify: `src/pages/AssistantPanel.tsx`, `AssistantPanel.css`, `src/components/QuestionCard/QuestionCard.css`

**Interfaces:**
- Produces: `Composer(props: { draft: string; max: number; running: boolean; locked: boolean; placeholder: string; inputRef: Ref<HTMLTextAreaElement>; onChange(v: string): void; onSend(): void; onStop(): void }): JSX.Element`. It renders the `<form>`, a pill containing a `textarea` (label `Message the assistant`, `rows=1`, grows to a 120px maximum by setting `style.height` from `scrollHeight`) and a round 32px button, the hint line, and the `N/4000` counter past 3500. The button is `Send` (icon, disabled when blank, over `max`, or `locked`) and turns accent-filled when it can send; while `running` it is `Stop` (square icon, `autoFocus`, keyed apart from Send as today). The textarea is disabled while `running` or `locked`.
- Consumes: `submit` from 10C via `onSend`; `agent.current?.abortRun()` via `onStop`.

- [ ] **Step 1: Write the failing tests** (`Composer.test.tsx`):
  - `Enter calls onSend`.
  - `Shift+Enter inserts a newline and does not send`.
  - `Enter during IME composition does not send` (`fireEvent.keyDown` with `isComposing: true`).
  - `Send is disabled when blank or whitespace`.
  - `over max disables Send and shows the counter`; no counter at 3500 or fewer.
  - `running shows Stop with focus and calls onStop`.
  - `locked disables the textarea and Send`.
  The existing panel tests (counter, Stop focus, placeholders, locked input) are the regression check and must pass unchanged apart from any `HTMLInputElement` type use.
- [ ] **Step 2: Run them to see them fail.** Expect FAIL (module missing).
- [ ] **Step 3: Implement** `Composer` to the interface, then replace the form in `AssistantPanel` with it (`inputRef` becomes `useRef<HTMLTextAreaElement>`; `locked` is `pending.length > 0`; draft is trimmed on send but keeps inner newlines). The pill gets a 3px `--accent-soft` focus halo plus the 2px accent focus ring on the textarea's container. In `QuestionCard.css`, the card slides up (`translateY(18px)` to none, 380ms) when it mounts.
- [ ] **Step 4: Run the full suite, typecheck and lint.** Expect all PASS.
- [ ] **Step 5: Commit** `feat: pill composer and animated question card`.

---

### Task 10E: Browser check and close-out (owner, then main session)

- [ ] **Step 1 (owner, in a browser, `npm run dev`):** compare against `docs/design-assets/assistant-panel-demo.html` at widths 320, 768, 1024 and 1440, in light and dark mode. Check: open and close feel smooth; the 400px panel fits at 320; focus rings are visible on every new control; Tab reaches Copy and Jump to latest; with "Reduce motion" on, nothing animates and the panel still opens and closes; a real reply streams without jitter; a confirm question slides up above the input.
- [ ] **Step 2:** Fix anything the check finds as further commits on `feat/assistant-ui-polish`, with a test first where the bug is in logic.
- [ ] **Step 3:** Tick the boxes in this plan. Update `docs/STATUS.md`. Add a line to `docs/CHANGELOG.md`. Move this plan to `docs/plans/done/`. Update `design.md` where what was built differs from it. Commit and push the docs repo.
