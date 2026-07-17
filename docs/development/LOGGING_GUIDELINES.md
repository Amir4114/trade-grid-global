# Logging Guidelines

## Purpose

What to log and what not to log.

## Scope

Application and operational logging. Full observability stack → [../operations/OBSERVABILITY.md](../operations/OBSERVABILITY.md).

## Table of contents

1. [Current Status](#current-status)
2. [Principles](#principles)
3. [Audit vs application logs](#audit-vs-application-logs)
4. [PII & secrets](#pii--secrets)
5. [References](#references)
6. [Future notes](#future-notes)

## Current Status

| Capability | Status |
|------------|--------|
| DB audit event tables | Implemented |
| Structured app logger / log drain | **Not implemented.** |
| Sentry | **Not implemented.** |

## Principles

- Prefer durable **audit events** for commercial/trust actions over ephemeral console logs
- Host logs (Vercel/Supabase) are the default runtime trail today

## Audit vs application logs

| Kind | Where |
|------|-------|
| RFQ / quotation / award / verification | `*_events` tables |
| User-visible alerts | `notifications` |
| Debug | Local `console` only in development; do not log secrets |

## PII & secrets

Never log passwords, service role keys, full document contents, or unnecessary PII.

## References

- [../architecture/SECURITY_MODEL.md](../architecture/SECURITY_MODEL.md)
- [../deployment/MONITORING.md](../deployment/MONITORING.md)

## Future notes

Adopt structured JSON logging when workers/queues appear (Module 3+).

---

**Last Updated:** 2026-07-18
