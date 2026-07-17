# Observability

## Purpose

How the system should be observed (logs, metrics, traces, audits).

## Scope

Current reality vs target. Vendor dashboards are primary today.

## Table of contents

1. [Current Status](#current-status)
2. [Pillars](#pillars)
3. [Domain observability](#domain-observability)
4. [References](#references)
5. [Future notes](#future-notes)

## Current Status

| Pillar | Status |
|--------|--------|
| Metrics/APM | **Not implemented.** |
| Distributed tracing | **Not implemented.** |
| Error tracking (Sentry) | **Not implemented.** |
| Business audit tables | Implemented |
| Host logs | Vercel / Supabase |

## Pillars

| Pillar | Today |
|--------|-------|
| Logs | Platform logs + selective `console` |
| Metrics | Platform only |
| Traces | **Not implemented.** |
| Audits | `rfq_events`, `quotation_events`, `award_events`, `verification_case_events` |

## Domain observability

Use SQL audits and notification types for procurement/trust forensics. See [../architecture/DATA_FLOW.md](../architecture/DATA_FLOW.md).

## References

- [../deployment/MONITORING.md](../deployment/MONITORING.md)
- [../development/LOGGING_GUIDELINES.md](../development/LOGGING_GUIDELINES.md)

## Future notes

Enable OpenTelemetry when workers appear.

---

**Last Updated:** 2026-07-18
