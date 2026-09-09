# New shipment — Cargo readiness date and Last shipping date removed

**Date:** 8 September 2026
**Instruction:** *"Remove the two selected fields from this screen."* — the New shipment form,
`/shipments/new` and `/shipments/:id/edit`.

## Where this belongs

    D:\CIMEgypt\COTS_Claude\COTS_Export_Mockup_v2.4\export-process-mockup\src\

then `vendorize.ps1 -Go -Refresh`. Already applied to `MergedMockup\vendor\export\`, and
`CHANGES.md` at `D:\CIMEgypt\COTS_30Aug26\` carries the entry.

| File | Change |
| --- | --- |
| `pages\shipments.tsx` | Both `FormRow`s, their state, the edit-mode hydration, the prefill, the *Captured from* banner line, and the form-side validation. |
| `__tests__\routes.test.tsx` | The prefill test now asserts both controls are absent rather than asserting the date they held. |

## Screen only — the record keeps both fields

`commodityReadinessDate` and `lastShippingDate` are still on `Shipment`, still seeded, and still
shown on the shipment detail and in the shipping instruction. Only the form stops asking.

Three consequences followed, and each is a decision rather than a deletion.

**The last shipping date is still recorded when a shipment is created.** It is read from the
contract's shipment period instead of typed — which is where the form was prefilling it from
anyway, so nothing is invented. Dropping it would have been worse than cosmetic: the shipment
detail runs an export-contract expiry check against it (`exportContractExpiryRisk`), and a
shipment with no last shipping date silently loses that check.

**On edit, neither date is sent at all — not even as `undefined`.** `api.updateShipment` applies
its patch with `Object.assign`, so a key present and undefined would erase a captured date. This
screen no longer displays either field, so it cannot have been asked to change them, and it must
not touch them.

**The readiness-before-last-shipping rule keeps its service-layer copy.** It was checked twice:
on this form, and in `updateShipment`. The form copy has gone with the fields; the service-layer
one stays, which is where it has to live now that no screen collects the pair.

## Verified

- `tsc` over `vendor\export` — clean apart from the two long-standing errors; `noUnusedLocals`
  reports no new unused symbols.
- `vitest run` over `routes.test.tsx` — **195 passed**, unchanged in count.

## Worth deciding

Neither date can now be set anywhere in the mock-up. The cargo readiness date in particular has
no other screen that writes it, so it is captured-only: seeded shipments have one, and nothing
created from here ever will. If it should be captured somewhere else — the cargo readiness tab is
the obvious candidate, since that is where the rest of the readiness record lives — say so and it
can go there.
