Daily Journal is a one-person tool that replaces a plain-text work note. Every rule below serves one test: **it must feel faster than typing into the note.** If a screen looks like a form, a dashboard or a project-management tool, it is wrong. It should look like a well-kept notebook page that happens to count for you.

## Principles

- **The page, not the app.** Today opens straight onto the date, the task list and the comments. No sidebar, no welcome, no empty-state illustrations.
- **Typing is the interface.** Every action has a key. The mouse is a fallback, never the only path.
- **Honest history.** A past day shows what was left undone. Carry-over copies a task forward; it never rewrites yesterday.
- **Counting is quiet.** Progress is a line of text and a thin bar, not a chart. Numbers get big only on the review screen, where counting is the point.
- **Notes stay free.** Comments are a text surface with a ruled feel, not fields.

## Content fundamentals

- The user writes the content; the app's own words are few. Sentence case everywhere: "Look back", "Add a task", "Open 4 days".
- Address nobody. Labels are nouns or verbs ("Done", "Remaining", "Jump to date"), never "Your tasks" or "Let's plan your day!".
- No exclamation marks, no emoji, no praise ("Great job!"). Finishing all tasks shows "5 of 5 done" and the bar full. That is the reward.
- Numbers are digits: "3 of 5 done", "open 4 days", "↻ 2d". Durations count calendar days.
- Dates read as words on day pages ("Friday, 17 October") and as short forms in lists ("Fri 17 Oct"). Never numeric-only dates, which read differently by locale.
- Task and comment text is shown exactly as typed, including mixed-language text. Never title-case, truncate mid-word or auto-correct it. Long task text wraps; it is never clipped.
- Ticket IDs (pattern `[A-Z][A-Z0-9]+-\d+`, e.g. `SAAM-2134`) are detected in task and comment text and set as a `TicketChip`. URLs render as links in `accent`, shortened to their host and path.

## Colour

Paper, ink, one action colour and one warning-ish colour. Nothing else carries meaning.

- Pages sit on `paper`. The comments sheet, stat tiles and popovers sit on `paper-raised`. Inputs and wells use `paper-sunken`.
- Text is `ink`. Secondary text is `ink-muted`. A done task is `ink-done` with a strikethrough of the same colour: dimmed, still readable.
- `accent` (a deep ink-green; light mint in dark) is the only action colour: the checked box, the progress fill, the primary button, links, focus, and the **Done** count. Text on an accent fill is `on-accent`, never literal white.
- `carry` (ochre) means "still open from before": the carry marker, the **Remaining** count, "open N days". It is not an error. Do not use `danger` for overdue or carried work.
- `danger` is for destructive actions only, always with a word ("Delete task").
- Done and Remaining are told apart by word and position first, colour second. The two hues sit on different sides of the wheel (green vs ochre) so they also hold up for red–green colour blindness.
- `rule` lines are decoration. Any edge that carries meaning (checkbox, input) uses `rule-strong`.

## Type

Three families, each with one job.

- **Source Serif 4** for the things that make it feel like a notebook: `date-display` for the day's date, `stat-numeral` for review counts, `section-title` for TODO / Comments.
- **IBM Plex Sans** for everything the user reads and writes: `task`, `body`, `ui`, `meta`, `label`.
- **IBM Plex Mono** for machine-shaped text: `ticket` for ticket IDs and `kbd` for keyboard hints.
- Task and body share a 15/24 size so the task list and comments line up on one ruled rhythm.
- Fonts load from Google Fonts (Source Serif 4: 500, 600; IBM Plex Sans: 400, 500, 600; IBM Plex Mono: 500). The stacks in `tokens.json` fall back to Georgia, system UI and the platform mono.

## Space, shape and layout

- 4px base: `space-1` … `space-12`. A task row is `space-3` top and bottom; sections are `space-6` apart; the date header sits `space-8` above the first section.
- Corners are small: `radius-sm` on the checkbox, chips and kbd; `radius-md` on buttons and inputs; `radius-lg` on the comment sheet, tiles and popovers. Nothing is pill-shaped.
- Flat by default. Rows are separated by `rule` hairlines, not cards. `shadow-pop` is only for floating layers (date picker, search).
- Day page: one column, max `measure-day` (720px), tasks above comments. At 1120px and wider, tasks and comments may sit side by side inside `measure-split`, tasks on the left at about 40%.
- Desktop first; at phone width the layout is the same single column with a `space-6` gutter.

## States and interaction

- **Focus** is a solid 2px `accent` outline with a 2px offset, on every interactive element. It is never removed.
- **Hover** on a task row tints the row `paper-sunken`. Hover never reveals essential actions that have no key.
- **Check** toggles instantly, no animation beyond the box filling. Unchecking restores the row.
- **Carried** tasks show a `CarryMarker` ("↻ 2d") after the text. After 5 days the row ground turns `carry-soft` so stuck work is visible without being alarming.
- **Dropped** (proposed third status, pending the owner's decision) reads as `ink-muted` text, no strikethrough, with a "dropped" label. It stops carrying and counts in neither Done nor Remaining.
- Motion: 120ms ease-out for fills and tints. Nothing slides, bounces or celebrates.

## Keyboard

Every screen documents its keys with `Kbd`. Defaults:

| Key | Action |
| --- | --- |
| `N` or `/` on Today | Focus the task input |
| `Enter` in the task input | Add the task, keep focus for the next one |
| `↑` `↓` | Move between tasks |
| `Space` or `X` | Toggle done on the focused task |
| `[` `]` | Previous / next day |
| `T` | Jump to today |
| `G` | Jump to date |
| `C` | Focus comments |
| `R` | Open review (look back) |
| `⌘K` / `Ctrl K` | Search tasks and comments |

## Iconography

Almost none. The interface uses typographic glyphs: `↻` for carry-over, `‹` `›` for day navigation, `✓` inside a checked box (drawn as an inline 2px-stroke SVG path so it inherits `on-accent`). No icon font, no illustrations, no emoji. If an icon is ever needed it is a 16px, 1.5px-stroke inline SVG drawn in `currentColor`.

## Components

Built with React 18, exported on `window.Journal`, styled by `components/bundle.css` with `dj-` class names that read only tokens.

- Today screen: `DayHeader`, `ProgressMeter`, `TaskInput`, `TaskItem` (with `CarryMarker` and `TicketChip`), `CommentSheet`.
- Review screen: `PeriodSwitch`, `StatTile`, `ReviewItem`.
- Shared: `Button`, `Kbd`.
