# 0002: MongoDB Atlas as the database

## Status
Accepted

## Date
2026-10-22 (written 2026-11-04)

## Context
The app stores days, tasks with carry-over chains, one note per day, and (since [0009](0009-server-side-conversations.md)) assistant conversations. It is single-user, with roughly 150 days of history and 3–6 tasks a day. Hosting of the app itself is not decided; it runs on the owner's laptop.

## Decision
MongoDB, hosted on MongoDB Atlas (cloud), accessed with PyMongo's async client (`AsyncMongoClient`). **[Owner]** for MongoDB Atlas; **[Call]** for the driver.

## Alternatives Considered
Not recorded at the time. This was the owner's choice.

## Consequences
- The data survives laptop changes and is reachable from wherever the backend runs later.
- Atlas Network Access must allow the machine running the backend; SSL handshake or timeout errors usually mean the IP is missing.
- Correctness rules use unique indexes, e.g. `(origin_id, day)` makes the carry-over sync idempotent ([0005](0005-carry-over-copy-chains.md)).
- Tests run against Atlas in a throwaway `journal_test_<hex>` database that is dropped afterwards.
- The connection string is a secret: only in `backend/.env`. The password was shared in chat on 2026-10-22 and must be rotated.
- The LangGraph checkpointer (`langgraph-checkpoint-mongodb` 0.5.1) needs a sync `MongoClient`, so the backend holds a second client for it ([0009](0009-server-side-conversations.md)).
