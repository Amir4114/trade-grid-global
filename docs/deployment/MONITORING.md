# Monitoring

## Purpose

Define monitoring expectations for Trade Grid Global.

## Scope

What exists today vs planned observability. Detail ops → [../operations/OBSERVABILITY.md](../operations/OBSERVABILITY.md).

## Table of contents

1. [Current Status](#current-status)
2. [What is monitored today](#what-is-monitored-today)
3. [Recommended signals](#recommended-signals)
4. [Alerting](#alerting)
5. [References](#references)
6. [Future notes](#future-notes)

## Current Status

| Capability | Status |
|------------|--------|
| Sentry / APM integration | **Not implemented.** (`SENTRY_DSN` placeholder only) |
| Custom metrics pipeline | **Not implemented.** |
| Supabase dashboard metrics | Available in vendor UI |
| Vercel deployment logs | Available in vendor UI |

## What is monitored today

- Host platform dashboards (Vercel, Supabase) — configure per environment.
- Application does not emit a first-party metrics/events bus beyond DB audit tables and notifications.

## Recommended signals (planned)

| Signal | Why |
|--------|-----|
| Auth error rate | Login/onboarding health |
| RPC error rates (`award_supplier`, `submit_quotation`, …) | Procurement health |
| Verification SLA breaches | Trust ops |
| 5xx / edge latency | App health |

**Not implemented** as automated monitors in-repo.

## Alerting

**Not implemented** in application code. Use vendor alerts until Module observability lands.

## References

- [ENVIRONMENT.md](./ENVIRONMENT.md)
- [../operations/OBSERVABILITY.md](../operations/OBSERVABILITY.md)
- [../operations/INCIDENT_RESPONSE.md](../operations/INCIDENT_RESPONSE.md)

## Future notes

Wire `SENTRY_DSN` when error monitoring is approved.

---

**Last Updated:** 2026-07-18
