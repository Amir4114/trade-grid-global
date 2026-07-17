# UI / UX Guidelines

## Purpose

Visual and interaction standards for Trade Grid Global.

## Scope

Aligns with project design system (premium enterprise). Screenshots — placeholder in root README.

## Table of contents

1. [Current Status](#current-status)
2. [Design language](#design-language)
3. [Dashboard UX](#dashboard-ux)
4. [Forms & confirmation](#forms--confirmation)
5. [Empty & error states](#empty--error-states)
6. [References](#references)
7. [Future notes](#future-notes)

## Current Status

| Item | Status |
|------|--------|
| Dashboard shell + domain panels | Implemented |
| Formal design tokens package | Partial (Tailwind / shadcn) |

## Design language

- Premium, enterprise: black / white / gold accents; minimal; professional
- Avoid cartoon UI, bright consumer ecommerce patterns, purple/glow clichés on new surfaces
- Mobile-first responsive layouts

## Dashboard UX

- One clear job per panel/section
- Operational density OK (Bloomberg/Stripe-like), not consumer clutter
- Mock data pages should be labeled or removed (known debt)

## Forms & confirmation

- Destructive/commercial actions (award, cancel RFQ) use confirmation dialogs — follow existing award pattern
- Disable buttons while `busy`; surface RPC errors in-page + toast where used

## Empty & error states

Prefer clear empty copy over blank tables; show recoverable error messages from services.

## References

- [COMPONENT_GUIDELINES.md](./COMPONENT_GUIDELINES.md)
- [ACCESSIBILITY.md](./ACCESSIBILITY.md)
- [CODING_STANDARDS.md](./CODING_STANDARDS.md)

## Future notes

Add Figma/token links when a design system file is published. **Not implemented.**

---

**Last Updated:** 2026-07-18
