# Component Guidelines

## Purpose

How to structure React components in this repo.

## Scope

`components/**`. Coding norms → [CODING_STANDARDS.md](./CODING_STANDARDS.md).

## Table of contents

1. [Current Status](#current-status)
2. [Organization](#organization)
3. [Reuse rules](#reuse-rules)
4. [Client vs server](#client-vs-server)
5. [Props & state](#props--state)
6. [References](#references)
7. [Future notes](#future-notes)

## Current Status

Domain folders exist: `dashboard`, `rfq`, `quotation`, `admin`, `settings`, `marketplace`, `ui`, etc.

## Organization

| Folder | Use |
|--------|-----|
| `components/ui` | Primitives (button, dialog, input) |
| `components/<domain>` | Feature compositions |
| `components/layout` | Navbar/Footer |

## Reuse rules

- Never create duplicate components for the same job
- Prefer composing `DashboardShell` / `DashboardPanel` for app pages
- Keep files small and modular

## Client vs server

- Default server-friendly; add `"use client"` only for hooks/events/browser APIs
- Data fetching for dashboards often client+service today — match existing domain patterns when extending

## Props & state

- Lift busy/error state as in RFQ/quotation details
- Prefer typed props; avoid `any`

## References

- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)
- [UI_UX_GUIDELINES.md](./UI_UX_GUIDELINES.md)

## Future notes

Introduce Storybook only if the team commits to maintaining it. **Not implemented.**

---

**Last Updated:** 2026-07-18
