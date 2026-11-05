# 0012: Day page "Focus & depth" layout

## Status
Accepted

## Date
2026-11-05

## Context
The Day page was a plain list under a thin progress meter. The owner wanted the first open task to stand out and finishing a task to feel tactile, and compared three demos (`design-assets/day-focus-demo.html`). The original anti-goal ruled out motion beyond a 120 ms fill or tint.

## Decision
The Day page moves to the "Focus & depth" layout (demo tab B). **[Owner]**
- A progress ring beside the date, a one-line summary, a "Now" card for the first open task, then Up next, Done and Dropped; notes sit beside the tasks from 980 px.
- The anti-goal "no motion beyond a 120 ms fill or tint" is relaxed for the Day page to the motions listed in `plans/2026-11-05-day-focus-redesign.md`, all inside `prefers-reduced-motion: no-preference`.
- Still banned: praise text, confetti, emoji, sound.
- Rounded rows and cards with tinted shadows apply to the Day page; other screens keep hairlines.

## Alternatives Considered

### A: current layout with more motion
- Rejected by the owner after the demos: no clear focus on the next task.

### C: bento grid
- Rejected by the owner after the demos.

## Consequences
- The Now card makes the first open task the focus, so the stored order is also the work order.
- Only open tasks can be reordered (drag, Alt+↑/↓); done and dropped tasks keep their slots.
- New components: `ProgressRing` (replaces `ProgressMeter`), `NowCard`, `DayEmpty`, `TaskMenu`.
- New tokens: `--ease-spring`, `--radius-2xl`, `--shadow-lift`, `--shadow-row`.
