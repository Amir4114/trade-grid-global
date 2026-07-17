# Maintenance

## Purpose

Routine maintenance windows and safe practices.

## Scope

Operational maintenance. Feature work follows normal release process.

## Table of contents

1. [Current Status](#current-status)
2. [Maintenance types](#maintenance-types)
3. [Safe practices](#safe-practices)
4. [References](#references)
5. [Future notes](#future-notes)

## Current Status

No in-app maintenance mode flag — **Not implemented.**

## Maintenance types

| Type | Examples |
|------|----------|
| Platform | Supabase/Vercel upgrades |
| Database | Index builds, migration applies |
| App | Dependency bumps |

## Safe practices

1. Prefer staging first
2. Announce window to stakeholders
3. Apply migrations during low traffic when possible
4. Run verification scripts after
5. Keep rollback plan ready

## References

- [../deployment/DEPLOYMENT.md](../deployment/DEPLOYMENT.md)
- [../development/MIGRATION_GUIDELINES.md](../development/MIGRATION_GUIDELINES.md)
- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md)

## Future notes

Add `maintenance_mode` edge flag if long migrations require it.

---

**Last Updated:** 2026-07-18
