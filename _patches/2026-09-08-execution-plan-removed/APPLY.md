# Execution planning removed from the mock-up

**Date:** 8 September 2026
**Instruction:** *"Remove execution plan screen from the project in all places"* — *"because I
have split shipments no need for execution plan screen."*

## Where this belongs

| Folder here | Goes to |
| --- | --- |
| `src\` | `D:\CIMEgypt\COTS_Claude\COTS_Export_Mockup_v2.4\export-process-mockup\src\` |
| `merged-src\` | `D:\CIMEgypt\COTS_30Aug26\COTS_Export_Merged_Mockup\MergedMockup\src\` — the merged project's own source, not vendored; **already applied** |

Then re-run

    powershell -ExecutionPolicy Bypass -File .\vendorize.ps1 -Go -Refresh

**One deletion is not a file in this folder.** `src\pages\execution-plan-form.tsx` must be
**deleted** from the Export prototype. It has already been deleted from
`MergedMockup\vendor\export\pages\`.

## What was removed

Two screens, and everything that reached them.

| Removed | Was |
| --- | --- |
| `pages\execution-plan-form.tsx` | The create form at `/contracts/:id/planning/new` |
| The contract's `planning` tab | `/contracts/:id/planning` — the plan list, its field grid and its cargo-readiness and stock-allocation block |
| Two routes | `vendor\export\App.tsx` and the merged `src\App.tsx`, which re-declares every Export route |
| Two links in the planning tab | *New execution plan* in the header, *Create an execution plan* in the empty state |
| The shipment screen's link | *Create an execution plan — you will come back here with it selected* |
| Two Phase 13 `screens` entries | *Execution planning — PC-2041*, *New execution plan* |
| Seven tests | Two whole describes, plus the payment-terms test that rendered the create form |

## What was deliberately *not* removed

**The record.** `ExecutionPlan` still exists, the seeded plans are still there, and `Shipment`,
`ExportContract` and `CargoReadiness` still carry `executionPlanId`. Removing a screen and
re-pointing three records at the contract are different changes, and the second rewrites rules
the workflow documents state — it waits for the split-shipment and bank-details instructions
still to come.

**Phase 13 in `exportProcess.ts`** keeps its fields, capabilities and open questions about
execution planning; only the two screen links are gone. §6.13 in the workflow document is
untouched.

## The consequence, stated rather than left to be discovered

A shipment still requires an execution plan, and **there is now no way to create one.**

- The six seeded contracts keep their plans, so the demonstration path works end to end.
- A contract raised *inside* the mock-up reaches the New shipment screen, finds an empty plan
  list, and stops.

The shipment screen's plan field says exactly that — *"This contract has no execution plan, and
a shipment cannot be raised without one. Execution planning is no longer a screen in the mock-up,
so there is no way to add one here"* — rather than offering an action that no longer exists.

That dead end is the thing to fix with the split-shipment change, not with a patch here.

## Verified

- `tsc` over `vendor\export` — no new errors; only the pre-existing `import.meta.env` and
  `inert` ones remain.
- `vitest run` over `routes.test.tsx` — **192 passed**. Seven tests removed with the screens,
  three added: no Execution planning tab on the contract; no link anywhere — contract detail,
  contract list, shipment form — whose href contains `/planning`; and the shipment screen no
  longer offers *Create an execution plan*.
- The route tables in `vendor\export\App.tsx` and the merged `src\App.tsx` were changed together,
  so the route-table guard that compares them stays satisfied.

## Open, waiting on the split-shipment instruction

1. **Where do the plan's fields go?** Planned quantity per lot, the date to be shipped before,
   the shipper and its address, the bank and branch, the export contract payment terms, cargo
   source and seasonality are held on the plan and on nothing else.
2. **What does a shipment attach to?** Today `executionPlanId`; the contract and the split
   shipment are the candidates.
3. **What happens to `CargoReadiness`?** It hangs off the plan, and the allocation module reads
   it that way.
4. **Phase 13 and §6.13** still describe execution planning as a step.
