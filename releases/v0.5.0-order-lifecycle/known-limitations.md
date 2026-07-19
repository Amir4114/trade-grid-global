# Known Limitations

1. Migration `023` is applied in the verified release environment; every other target environment must apply it before deploying Phase B.
2. Fulfillment document metadata and private storage foundations exist, but upload registration, uploader ownership, retention, and replacement policy remain deferred.
3. Shipment carriers, legs, tracking feeds, ports, and customs workflows remain Logistics Module 3.3.
4. Claims resolution, returns, payments, invoices, escrow, AI, and Analytics are not part of Module 3.2.
5. No external event bus is implemented. Future publication requires schema versioning, ordering, idempotency, delivery, and privacy contracts.
6. Automated browser E2E is not yet in CI; Phase B currently uses live verification scripts and manual browser checks.
7. Service-role-dependent notification/storage assertions skip when `SUPABASE_SERVICE_ROLE_KEY` is unavailable.
8. Concurrency/load testing for racing transitions is not yet a dedicated suite; row locks and expected-state guards are implemented.
9. The connected verification environment is still missing Trust migration `020`; this blocks the global all-domain release gate but not the verified Fulfillment contract.
