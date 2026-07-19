# Fulfillment Security

Security contract for Fulfillment Phase A.

## Trust boundaries

- Browser clients use the Supabase anon key and authenticated session.
- PostgreSQL RLS controls reads.
- Lifecycle writes occur only through trusted `SECURITY DEFINER` RPCs.
- Service-role credentials never enter browser bundles.
- Storage objects remain private.

## Authorization

| Actor | Read | Mutate |
|---|---|---|
| Buyer company | Own Fulfillment, events, documents | Pre-ship cancel, delivery, completion, dispute per state |
| Supplier company | Own Fulfillment, events, documents | Production/QC/packing/shipping/delivery, limited cancel/fail; cannot impose dispute hold |
| Admin | All rows for support | No force transition in Module 3.2 |
| Other company | No rows | No actions |

Authorization derives from stable company IDs on the Fulfillment and accepted PO chain. UI visibility is not an authorization control.

## RLS and grants

- RLS is enabled on `fulfillment_orders`, `fulfillment_order_events`, and `fulfillment_order_documents`.
- Authenticated clients receive scoped SELECT only.
- Direct INSERT, UPDATE, and DELETE privileges are not granted for lifecycle tables.
- Child-row visibility is established through authorized access to the parent Fulfillment.
- Admin read access uses the hardened `is_admin()` helper.

## Trusted RPC requirements

Fulfillment functions:

1. Set `search_path = public`.
2. Check `auth.uid()`.
3. Verify expected role and company ownership.
4. Lock/validate current state before mutation.
5. Reject cross-company and invalid-state requests without leaking protected data.
6. Append immutable events and trusted notifications transactionally.
7. Keep internal helpers revoked from `anon` and `authenticated`.

## Audit integrity

`fulfillment_order_events` is append-only for direct mutation: a trigger rejects UPDATE and DELETE. Fulfillment records use terminal states rather than product hard deletion. The event foreign key uses cascade delete, so a privileged/service-role deletion of a Fulfillment header would also remove its events; normal clients have no header delete path, but privileged operational deletion must remain prohibited.

## Document storage

- Bucket: `fulfillment-docs`.
- Visibility: private.
- Path: `fulfillment/<buyer_company_id>/<fulfillment_id>/…`.
- Access is party-scoped through storage path helpers/policies.
- Either trade party can currently insert, update, or delete any object under the shared authorized Fulfillment path; policies are not uploader-scoped.
- Clients currently have no supported INSERT path for `fulfillment_order_documents` metadata, so an uploaded object cannot be registered through the domain contract.
- Signed/authenticated access should be short-lived; public object URLs are inappropriate.

Rich upload UI and category-specific mandatory-document gates are deferred. Their absence must not be misrepresented as document compliance.

## Threats and controls

| Threat | Control |
|---|---|
| Competitor reads an order | Buyer/supplier company RLS and negative verification |
| Buyer advances supplier production | Role checks in transition RPCs |
| Supplier self-completes | Buyer-only completion RPC guard |
| Client skips mandatory QC | Ordered state guards; direct update denied |
| Client forges operational notification | Trusted notification helper only |
| Event history tampering | Append-only trigger and no client mutation grants |
| PO repricing through execution | Separate entity and no commercial fields on Fulfillment |
| Admin privilege misuse | Read-only admin support; no force RPCs |
| Public document leakage | Private bucket and path-scoped policies |
| Counterparty overwrites/deletes evidence | Known Phase A limitation: shared party-level object mutation; define uploader/retention policy in Phase B |
| Privileged header deletion removes events | Operational prohibition; future hardening should prevent header delete/cascade audit loss |

## Verification evidence

`verify-order-fulfillment-system.mjs` checks cross-company read denial, actor restrictions, mandatory QC, direct insert denial, append-only events when service role is available, aggregate access, and selected notifications.

Known coverage gaps:

- Service-role-dependent assertions skip without `SUPABASE_SERVICE_ROLE_KEY`.
- No automated browser/E2E Fulfillment UI exists because Phase B UI is not implemented.
- Storage upload/read edge cases need deeper verification with the Phase B document workflow.
- Dispute actor/hold, supplier cancellation, pause/resume, and terminal failure paths lack explicit automated coverage.
- Concurrency/race load testing is not yet a dedicated suite.

## Security review trigger

A new ADR and focused security review are required before admin force actions, external webhooks, public document access, payment actions, automated completion, or third-party carrier writes are introduced.

## References

- [Platform security model](../../architecture/SECURITY_MODEL.md)
- [RPC reference](./RPC_REFERENCE.md)
- [Events](./EVENTS.md)
- [Security checklist](../../development/SECURITY_CHECKLIST.md)

---

**Last Updated:** 2026-07-18
