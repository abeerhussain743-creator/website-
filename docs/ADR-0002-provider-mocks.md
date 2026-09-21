# ADR 0002 — Provider interfaces with mocks

## Status

Accepted (Phase 0)

## Context

WhatsApp, AI, TTS, voice calls, and payments are required, but local development and CI must run with zero external accounts.

## Decision

All external services live behind interfaces in `@maxtrone/providers` with mock implementations. `createProviders()` returns mocks by default. Live adapters are added in later phases behind the same interfaces.

## Consequences

- Domain and worker code never imports vendor SDKs directly.
- Webhooks verify signatures, store raw payloads, then enqueue jobs (PRD §4.5).
