# Daily Work Journal: Project Description

Status: updated 2026-10-23 after design kickoff. The technical design is in `design.md` (approved 2026-10-22); the visual design is in `design-assets/`.
Items marked **[Assumption]** are still unconfirmed by the owner. Items under "Open questions" need a decision.

## 1. Summary

A personal web app for planning and reviewing a working day. Each day has a TODO list and a free-form note. Unfinished tasks carry over to the next day automatically. A review view shows how many tasks were finished or remain over a week or month, and lets the user open the detail behind each number. Search finds every mention of a ticket across days.

It replaces a plain-text note the owner keeps today.

## 2. Problem

Today the owner opens a note every day and types a date, a TODO list and a Comments section. Done tasks are struck through. The format is fast, but it has these problems:

- **Carry-over is manual.** Unfinished tasks must be retyped or copied into the next day. Forgotten ones are lost.
- **Progress is only visible by eye.** Nothing counts what is done or what is left.
- **Looking back is slow.** The existing history is a single file of about 330 lines covering several months. Answering "what happened with ticket X?" or "how much did I finish this week?" means reading it all.
- **Tasks and notes are mixed together.** The history contains TODOs, long write-ups, questions for colleagues, draft replies, ticket IDs and links. Done/not-done is not preserved once the text is exported.

## 3. Who it is for

A single user: a software/AI engineer who works across many tickets (IDs like `SAAM-2134`) and writes notes in English, sometimes mixed with another language. Desktop browser is the main device; the layout must still work at phone width. There is no sharing or collaboration, and no login for now.

## 4. Goals

1. Planning a day takes less effort than the plain note does today.
2. At a glance, the user knows today's goals and how far along they are.
3. Nothing unfinished is silently lost between days.
4. The user can answer "how did my week/month go?" in one click, then drill into the detail.
5. Notes stay free-form. The app must not make writing notes feel like filling in a form.

## 5. Non-goals

- Team features: assignment, sharing, comments from others.
- Full project management: priorities, estimates, sprints, Jira sync.
- Reminders and notifications.
- Login and accounts (for now; revisit before the app is reachable by anyone else).

Anti-goal: if it ends up slower to use than the plain note, it has failed, even if every feature works.

## 6. Core concepts

| Concept | Meaning |
|---|---|
| **Day** | One calendar date, with its task list and its note. |
| **Task** | One line of text with a status: **open**, **done** or **dropped**. Status can be changed either way. |
| **Note** | One free-text note per day (the old "Comments" section). It can be long and can contain links and ticket IDs. |
| **Carry-over** | An unfinished task appears again on the next day the owner opens. |
| **Chain** | A task and all its carried copies; it counts as one task in totals. |
| **Period** | A week (Monday to Sunday) or month used by the review view. |

### Carry-over rules (decided)

- An unfinished task stays on its original day, still shown as not done, and a copy is created on the next day. The original day keeps an honest record of what was left undone, and the next day starts with the work that still has to be done.
- Copies go to the next day the owner actually opens, not to every calendar day. A task left open on Friday appears on Monday; Saturday and Sunday stay empty.
- A task added or reopened on a past day still reaches today.
- Each copy shows how many days it has been carried ("↻ 2d"). After 5 days the row is tinted so stuck work stands out.
- A carried task counts **once** in totals: as Done on the day it is finished, or as one Remaining item while still open.
- **Drop** is how the owner gives up on a task: it stops carrying over and counts as neither Done nor Remaining. It can be undone.
- **Delete** is for mistakes: it removes the task from every day it was carried to.

## 7. Key experiences

### 7.1 Today (the main screen, used every day)
- Today's date, TODO list and the day's note side by side on a wide screen, stacked on a narrow one.
- Add a task quickly: one input, Enter to add, no form.
- Tick a task done in one click. Done tasks look struck through, as in the owner's current note.
- A small progress indicator, e.g. "3 of 5 done", plus how many tasks were carried in.
- Carried-over tasks are visible and distinguishable from new ones.

### 7.2 Morning handover
- When today starts with carried-in tasks, the app first walks through them, oldest first: mark done, drop or keep each one, with the last note line that mentions its ticket.
- Then the owner adds new tasks for today. The handover can be skipped with one key.

### 7.3 Browsing other days
- Move to previous and next day. Jump to a date.
- Past days are viewable and editable.

### 7.4 Look back (review)
- A button opens a summary for this week, last week or this month.
- It shows **Done** and **Remaining** counts and a day-by-day view.
- Clicking **Done** lists the finished tasks. Clicking **Remaining** lists the unresolved ones, oldest first, each with how long it has been open.
- For a past period, Remaining means tasks still open at the end of that period.
- From a listed task, the user can jump to that day and its note.

### 7.5 Search
- Search across tasks and notes, mainly for ticket IDs such as `SAAM-2134`, showing the ticket's thread day by day.

### 7.6 Assistant
- A chat panel that answers questions like "what's still open today?" and can act on tasks ("mark the SAAM-2161 one done").
- It is connected to a real AI model and is part of the first build, added after the core app works.

### 7.7 Keyboard
- Keyboard-first use matters because the replaced tool is a text note. Every action has a key (for example N add, Space done, `[` `]` day, R look back, ⌘K search).

## 8. Content and usage notes for design

- Task text is short (one line, sometimes with a ticket ID or link). Notes can run to many paragraphs.
- A day usually has 3 to 6 tasks. A day can have none.
- Roughly 150 days of history already exist, so the review and navigation screens must still work with months of data.
- Light and dark theme, following the operating system setting.

## 9. How it is built (summary)

Details and the reasons behind them are in `design.md`.

- Backend: Python and FastAPI, in its own repo (`todo_app/backend`).
- Database: MongoDB, hosted on MongoDB Atlas.
- Frontend: React, in its own repo (`todo_app/frontend`).
- Where the app itself is hosted is not decided; it runs on the owner's laptop for now.

## 10. Success looks like

- The owner uses it every working day instead of the note.
- Planning the day takes less than a minute.
- The owner can answer "what did I finish this week and what is stuck?" without reading any raw notes.

## 11. Decisions made

| Question | Decision |
|---|---|
| Counting a task carried over several days | Counts once, on the day it is finished. |
| Weekends and days off | Tasks carry to the next day the owner opens. |
| Stopping carry-over | "Dropped" is a third status. |
| Comments per day | One free-text note per day. |
| Device | Desktop browser first, working at phone width. |
| Data storage | MongoDB Atlas (cloud). |
| Login | None for now. |
| Assistant | Built for real in the first build, after the core app. |

## 12. Open questions

1. **Old history:** should the existing text file be imported? If so, the strikethrough information is not in the file, so imported tasks would have no done status.
2. **Weekly summary use:** is it only for the owner, or will it be pasted into reports or messages (which would affect export/copy features)?
3. **Hosting:** where will the app run beyond the owner's laptop? Once it is reachable by others, login is no longer optional.
