# AI Roadmap

## Purpose

Clarify AI scope vs current mock surfaces.

## Scope

Product AI. Decision to defer → [../architecture/DECISION_LOG.md](../architecture/DECISION_LOG.md) D008.

## Table of contents

1. [Current Status](#current-status)
2. [Today](#today)
3. [Module 5 targets](#module-5-targets)
4. [Guardrails](#guardrails)
5. [References](#references)
6. [Future notes](#future-notes)

## Current Status

| Item | Status |
|------|--------|
| `/ai-sourcing` mock recommendations | Mock UI only |
| Production model integration | **Not implemented.** |
| AI notification emitters | **Not implemented.** (types reserved) |

## Today

`mockSourcingResponse` powers demo UX. Do not treat as live matching.

## Module 5 targets

- Supplier matching grounded in verified catalog + RFQ specs
- Assistive RFQ drafting
- Risk flags (with human admin override)

## Guardrails

- No silent auto-award or auto-verify
- Prefer auditability; store assessment rows if used (`verification_assessments` exists for cases)

## References

- [../planning/FUTURE_FEATURES.md](../planning/FUTURE_FEATURES.md)
- [../planning/ROADMAP.md](../planning/ROADMAP.md)
- [../deployment/ENVIRONMENT.md](../deployment/ENVIRONMENT.md) (`OPENAI_API_KEY` reserved)

## Future notes

Ship Module 3 before investing heavily in AI conversion claims.

---

**Last Updated:** 2026-07-18
