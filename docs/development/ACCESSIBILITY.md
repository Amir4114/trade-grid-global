# Accessibility

## Purpose

Baseline a11y expectations for dashboards and public pages.

## Scope

WCAG-oriented practical rules. Formal audit program — **Not implemented.**

## Table of contents

1. [Current Status](#current-status)
2. [Requirements](#requirements)
3. [Components](#components)
4. [Testing](#testing)
5. [References](#references)
6. [Future notes](#future-notes)

## Current Status

| Item | Status |
|------|--------|
| shadcn/Radix primitives (focus, dialog) | In use |
| Documented a11y audit CI | **Not implemented.** |

## Requirements

- Keyboard access for buttons, dialogs, forms
- Visible focus states
- Labels for inputs; dialog title/description for modals
- Do not rely on color alone for award/win/lose meaning (include text)

## Components

Prefer `components/ui` primitives that already wire ARIA via Radix.

## Testing

Manual keyboard pass on new flows; automate later ([TESTING.md](./TESTING.md)).

## References

- [UI_UX_GUIDELINES.md](./UI_UX_GUIDELINES.md)
- [CODE_REVIEW_CHECKLIST.md](./CODE_REVIEW_CHECKLIST.md)

## Future notes

Target WCAG 2.2 AA for primary dashboard flows when staffing allows.

---

**Last Updated:** 2026-07-18
