# 0007: LangChain with a provider-swappable model factory

## Status
Accepted

## Date
2026-10-22 (LangChain and Gemini); 2026-11-04 (`LLMFactory`). Written 2026-11-04.

## Context
The owner wanted a real assistant in the first build, starting with Google Gemini, and the option to try other providers (OpenAI) without rewriting the assistant.

## Decision
- Build the assistant with LangChain, starting with Gemini (`langchain-google-genai`). **[Owner]**
- `LLMFactory` in `app/assistant/model.py` is the only place that names a provider. It keeps a registry of `build_<provider>` functions and builds and caches the model from `ASSISTANT_MODEL` (`provider:model`, default `google:gemini-3.8-flash`). Google and OpenAI are registered. A missing key raises `AssistantNotConfigured`, which the API turns into 503. **[Call]**

## Alternatives Considered
Not recorded at the time. LangChain and Gemini were the owner's choice.

## Consequences
- Adding a provider is one builder function plus a `Settings` field and `.env` entry.
- Switching `ASSISTANT_MODEL` can change more than the model: deepagents applies per-provider "harness profiles" that can change tools and prompt ([0008](0008-deep-agent-without-subagents.md)).
- Tests use a scripted fake model (`tests/fakes.py`), never a real provider.
