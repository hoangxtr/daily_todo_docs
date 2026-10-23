# Way of working

How we build Daily Journal. Applies to people and AI sessions alike. Change this file only when we change the process.

## Repos and layout

Three repos, cloned side by side:

```
todo_app/                 daily_todo_docs  (this repo: docs, process, status)
  backend/                daily_todo_be    (FastAPI + MongoDB Atlas)
  frontend/               daily_todo_fe    (Vite + React + TypeScript)
```

```
git clone git@github.com:hoangxtr/daily_todo_docs.git todo_app
cd todo_app
git clone git@github.com:hoangxtr/daily_todo_be.git backend
git clone git@github.com:hoangxtr/daily_todo_fe.git frontend
```

The code repos refer to `../docs/...`, so keep this layout.

## Where things live

Each fact has one home. If you find it in two places, delete one.

| What | Where | Update when |
|---|---|---|
| What and why: goals, decisions, open questions | `docs/project-description.md` | A product decision is made |
| How it works: behaviour, data, API, screens | `docs/design.md` | The same day any behaviour or API changes, including during review |
| Visual reference | `docs/design-assets/` | The design changes |
| Work to do | `docs/plans/<YYYY-MM-DD>-<feature>.md` | Created when a feature is approved; boxes ticked as tasks finish |
| Finished plans | `docs/plans/done/` | The feature's last task merges |
| Where things stand right now | `docs/STATUS.md` | End of every task or PR step |
| What shipped, one line per feature | `docs/CHANGELOG.md` | A feature is finished |
| How to run a repo | `backend/README.md`, `frontend/README.md` | Setup or commands change |
| AI context for a repo | `backend/CLAUDE.md`, `frontend/CLAUDE.md`, `.claude/agents/` | Commands, conventions or gotchas change |

Rules:
- `STATUS.md` is a snapshot, not a log: only what is true now. Keep it to about one screen (~60 lines). Finished features leave it for `CHANGELOG.md`; more than ~10 deferred issues move to GitHub Issues in the right repo.
- `design.md` describes the current system in plain present tense, not the change history. Mark who decided: **[Owner]** for the owner's decisions, **[Call]** for choices not yet confirmed.
- Plans are append-only once work has started: add tasks at the end, never rewrite a task that is done or in progress.
- Secrets never go in any doc, commit, issue or PR. They live only in each repo's git-ignored `.env`.

## How a piece of work flows

1. **Capture.** A new idea or request goes into "Next up" in `STATUS.md`.
2. **Decide.** Talk it through (brainstorm). Record decisions in `project-description.md` and update `design.md`; set its status line to approved with the date.
3. **Plan.** Write a new plan file with tasks labelled BE or FE. When the API changes, the BE tasks come first and define the contract.
4. **Build.** One task = one branch (`feat/<name>`, `fix/<name>`, `docs/<name>`) = one PR in that repo. Test first. Use the repo's agent. All checks pass before a commit (BE: `uv run pytest`, `ruff check`, `ruff format --check`; FE: `npm test`, `npm run typecheck`, `npm run lint`).
5. **Review.** The Claude bot reviews every PR. Fix what is worth fixing, test first. The owner merges.
6. **Close.** In the same sitting: tick the plan's boxes, update `STATUS.md`, and update `design.md` if anything ended up different from it. When a feature's last task merges, add its line to `CHANGELOG.md`, move the plan to `plans/done/`, and remove it from `STATUS.md`.

### Push and merge **[Owner, 2026-10-23]**

When a task's checks pass, the AI pushes its branch and opens the PR. It never merges and never pushes to `main`. Merging is the owner's step.

## Every session

Start:
1. `gh auth switch --user hoangxtr` (the repos belong to this account).
2. Read `docs/STATUS.md`.
3. In the repo you will work in: `git status -sb` (the IDE can switch branches outside the session) and `git pull`.

End:
1. Update `docs/STATUS.md` and commit it in this repo.
2. `gh auth switch --user hoangt_backbase` (back to the work account).

Git over SSH uses each repo's own key (`core.sshCommand`); the `gh` switch only affects `gh` commands.

## Done means

- The task's tests and checks pass, and the behaviour was seen working (a test, a curl, or the browser).
- Edge cases and errors are handled, not only the happy path.
- `design.md`, the README and `STATUS.md` match what was built.
- Commits end with the `Co-Authored-By` line of the session's model.
