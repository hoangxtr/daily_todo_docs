# Daily Journal

Single-user web app replacing a plain-text daily work note. Three repos side by side: this one (docs), `backend/` (FastAPI + MongoDB Atlas), `frontend/` (Vite + React + TypeScript). Each code repo has its own `CLAUDE.md` with commands; this file applies to all of them.

## Start of every session

1. Run `gh auth switch --user hoangxtr`.
2. Read `docs/STATUS.md` (where things stand) and `WORKING.md` (how we work). Tell the user in one or two lines what is in progress and what is next.
3. Before editing a code repo: `git status -sb` and `git pull` there.

## While working

- Follow the flow in `WORKING.md`: decide → plan → one task per branch and PR, test first → close.
- Each fact has one home (table in `WORKING.md`). Behaviour or API changes update `docs/design.md` the same day; product decisions go in `docs/project-description.md`.
- Plans are append-only once work has started.
- When the task's checks pass, push the branch and open the PR. Never merge, never push to `main` in the code repos.
- Never write secrets into any file other than a git-ignored `.env`.

## End of every task (do not skip)

1. Tick the task's boxes in its plan.
2. Update `docs/STATUS.md` (keep it a one-screen snapshot; a finished feature moves to `docs/CHANGELOG.md` and its plan to `docs/plans/done/`).
3. Update `docs/design.md` if what was built differs from it.
4. Commit and push this docs repo (`docs: update status …`). Direct commits to `main` are fine here.

## End of session

Make sure `docs/STATUS.md` is current, then `gh auth switch --user hoangt_backbase`.

If a code repo's `CLAUDE.md` disagrees with this file or `WORKING.md` (for example a README status table or `handbook.md`), this file wins; mention the mismatch to the user.
