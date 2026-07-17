# Code Review Checklist

## Purpose

PR review prompts for Trade Grid Global.

## Scope

Human checklist. Security depth → [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md).

## Table of contents

1. [Current Status](#current-status)
2. [Architecture](#architecture)
3. [Security](#security)
4. [Performance](#performance)
5. [Accessibility](#accessibility)
6. [Documentation](#documentation)
7. [Testing](#testing)
8. [Database](#database)
9. [API](#api)
10. [References](#references)
11. [Future notes](#future-notes)

## Current Status

Documented checklist — Implemented. Automated review bots — **Not implemented.**

## Architecture

- [ ] Fits existing domains (no redesign of RFQ/quote/award tables without decision)
- [ ] No duplicate components/services
- [ ] Server vs client component choice justified
- [ ] Food/FMCG scope preserved

## Security

- [ ] Auth/role gates preserved
- [ ] RLS / RPC ownership checks intact
- [ ] No secrets committed; no service role client-side
- [ ] Notification forging paths not introduced

## Performance

- [ ] No obvious N+1 client fetches without need
- [ ] Lists consider pagination where data can grow
- [ ] Images/storage paths reasonable

## Accessibility

- [ ] Interactive controls are keyboard reachable
- [ ] Dialogs/labels present for new UI ([ACCESSIBILITY.md](./ACCESSIBILITY.md))

## Documentation

- [ ] `docs/` updated for behavior/schema changes
- [ ] **Not implemented** marked honestly

## Testing

- [ ] `typecheck` / `lint` / `build`
- [ ] Relevant verify scripts run or justified skip

## Database

- [ ] Additive migration only
- [ ] Qualified ambiguous columns; `search_path` on DEFINER
- [ ] Indexes considered for new filters

## API

- [ ] RPC params/returns documented if public
- [ ] Failure modes explicit
- [ ] Matches [API_DESIGN_GUIDELINES.md](./API_DESIGN_GUIDELINES.md)

## References

- [../../CONTRIBUTING.md](../../CONTRIBUTING.md)
- [../deployment/RELEASE_CHECKLIST.md](../deployment/RELEASE_CHECKLIST.md)

## Future notes

Add Bugbot/security-review agent steps when the team standardizes them.

---

**Last Updated:** 2026-07-18
