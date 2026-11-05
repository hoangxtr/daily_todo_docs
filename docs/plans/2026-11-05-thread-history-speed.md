# Faster thread history — Implementation Plan

> Dispatch `journal-backend` with `model: "sonnet"`. One branch, `fix/thread-history-batched-delta` (BE repo), one PR.

**Problem.** `GET /api/assistant/threads/{id}` takes ~1.2 s for a 2-message thread. `aget_state` rebuilds the `messages` delta channel by walking parent checkpoints with the default `BaseCheckpointSaver.aget_delta_channel_history`: one sequential Atlas `get_tuple` (~115 ms) per ancestor, so the cost grows with thread length. `langgraph-checkpoint-mongodb` 0.5.1 (latest) has no override; the Postgres saver does.

**Goal.** History cost is a fixed 2-3 queries, whatever the thread length. Response shape unchanged (no contract change).

**Design.** `app/assistant/saver.py`: `BatchedMongoDBSaver(MongoDBSaver)` overriding `get_delta_channel_history` (sync) and `aget_delta_channel_history` (async, via `asyncio.to_thread` of the sync one, as the parent's a-methods do). Same return contract as the base method (`DeltaChannelHistory`: `{"writes": [...], "seed": ...}` per channel; read the base implementation in `langgraph/checkpoint/base/__init__.py` and the Postgres override as reference). Approach: one query for the thread/namespace's checkpoints (`checkpoint_id`, `parent_checkpoint_id`, and the requested channels' values only, via projection), walk the parent chain in Python until every channel has a seed, then one query for `checkpoint_writes` filtered to the chain's checkpoint ids and the requested channels, ordered like `get_tuple` returns them (`writes_sort_key`). `main.py` builds `BatchedMongoDBSaver` instead of `MongoDBSaver`.

## Task 1 (BE): batched delta history

- [x] Test first (`tests/test_assistant_saver.py`, throwaway test db from `conftest.py`): build a thread of several runs with the fake model, then assert `BatchedMongoDBSaver.get_delta_channel_history` equals `BaseCheckpointSaver.get_delta_channel_history(saver, ...)` (the slow default) for the `messages` channel, at the tip and at an older `checkpoint_id`.
- [x] Test: the number of `find` calls on the checkpoint and writes collections is constant (<= 3) for a 2-run and a 6-run thread.
- [x] Test: unknown thread gives empty writes and no seed; empty `channels` gives `{}`.
- [x] Implement `app/assistant/saver.py`; wire it in `main.py`.
- [x] Existing tests, `ruff check`, `ruff format --check` pass.
- [x] Measure on the real DB (read-only): `aget_state` before ~1.2 s, after expected under 0.4 s. Report both numbers in the PR.
- [x] Update `backend/CLAUDE.md` layout (new file) and `docs/design.md` if it describes the saver. Add a `ponytail:` comment that this relies on LangGraph's beta delta-channel API and that the subclass can go once upstream ships an override.

**Built (2026-11-05).** PR https://github.com/hoangxtr/daily_todo_be/pull/13. Differs from the design above: the checkpoint query reads whole documents (no projection) and stops as soon as every channel has a seed; the plain walk needs the deserialized `channel_values` to find the seed, so there is nothing cheaper to project. Measured on 10 real threads: 1.0-7.4 s before, ~290 ms flat after.
