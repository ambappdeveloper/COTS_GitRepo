# The execution plan is gone from the model, not only from the screens

**Date:** 8 September 2026
**Instruction:** *"remove it in all places it's no longer need and remove the executionPlanId
from all records that contains it — Shipment, CargoReadiness …etc"*

Follows the screen removal earlier the same day (`_patches\2026-09-08-execution-plan-removed`).
That one took the two screens; this one takes the record.

## Where this belongs

Every file is in the **Export prototype**:

    D:\CIMEgypt\COTS_Claude\COTS_Export_Mockup_v2.4\export-process-mockup\src\

then re-run `vendorize.ps1 -Go -Refresh`. All of it is already applied to
`MergedMockup\vendor\export\`, and `CHANGES.md` at `D:\CIMEgypt\COTS_30Aug26\` carries the entry.

## What was deleted

`ExecutionPlan` in full — the interface, `ExecutionPlanStatus`, `EXECUTION_PLAN_TRANSITIONS`,
the seven seeded plans, `store.executionPlans`, `api.listExecutionPlans` and
`api.createExecutionPlan`.

## The four records that carried the key

Three already carried `contractId` and simply lost a field. The fourth is the only real decision.

| Record | Was | Now |
| --- | --- | --- |
| `Shipment` | `contractId` + `executionPlanId` | `contractId` |
| `ExportContract` | `contractId` + `executionPlanId` | `contractId` |
| `AdvancePayment` | `contractId` + `executionPlanId?` | `contractId` |
| `CargoReadiness` | **`executionPlanId` and nothing else** | **`shipmentId`** |

### Cargo readiness re-parents onto the shipment

It had no contract field and no shipment field; the plan was its only link to anything. The
shipment keeps the granularity the plan gave — a contract shipped in four splits gets four
readiness records, not one covering all of them.

The seven seeded rows were re-keyed by the shipment each plan carried:

| Readiness | Was | Now |
| --- | --- | --- |
| cr-1 | ep-1 | sh-1 (PC-2041.1) |
| cr-2 | ep-2 | sh-2 (PC-2041.2) |
| cr-3 | ep-3 | sh-3 (PC-2044.1) |
| cr-4 | ep-4 | sh-4 (PC-2049.1) |
| cr-5 | ep-5 | sh-5 (PC-2052.1) |
| cr-6 | ep-6 | sh-6 (PC-2055.1) |
| cr-7 | ep-7 | sh-7 (PC-2058-LV.1) |

**One judgement to know about.** `ep-1` carried **two** shipments — PC-2041.1 and PC-2041.3 —
and one readiness record. It is attached to the first. There was no second readiness record to
give PC-2041.3, and inventing one would have been inventing cargo. A test walks every readiness
row and fails if its `shipmentId` does not resolve to a real shipment.

## What each screen lost

| Screen | Change |
| --- | --- |
| **New shipment** | The Execution plan field, its validation, and the prefill that filled it where the contract had exactly one plan. A shipment is raised against the contract. |
| **Shipment detail** | The *Planning* tab is now **Cargo readiness**: the execution-plan block above it is gone, and *Remaining to ready* is measured against the shipment's own quantity rather than the plan's. |
| **New export contract request** | Raised against the **contract**. Request number `<contract no>-R<n>`; quantity defaults to what is still unrequested on the contract. |
| **Contract summary** | *Planned across lots* removed — with no plan there is nothing between the contract and its shipments to plan a quantity, so the figure is not reported rather than reported as zero. Readiness reaches the contract through its shipments. |
| **Advance payment detail** | The execution-plan field, and the plans table inside *Execution readiness*. |
| **Stock allocation** | The readiness table is keyed by shipment; the *Planning number* column becomes *Shipment*. |
| **`createShipment`** | No plan to look up. The new shipment's `assignedTo` reads the contract's `assignedDubaiExecution`, which is where the plan's came from in the first place. |

## Two things kept deliberately

**Captured request numbers.** New requests are `PC-2041-R1`; the seeded ones stay
`PC-2041.1-R1`. A request number is on a record the business issued, and renumbering history to
match a new rule would be inventing a past. The sequence counts the requests already on the
contract rather than parsing their numbers, which is what lets the two formats coexist.

**The payment-instrument list, now an orphan.** The plan's `exportContractPaymentTerms` was the
only field anywhere carrying an **instrument** on its own, so nothing reads that level of the
payment-terms master now. The list stays: it is the parent of the term list, every term's
`instrument` joins to it, and it is a governed C03 domain that a screen removal does not undo.
If the split shipment carries the export contract's terms, this is the list it should read. The
reasoning is recorded in `data/master.ts` beside the list, and the test that used to walk every
plan's instrument says why it went.

## Verified

- `tsc` over `vendor\export` — clean apart from the two long-standing errors
  (`import.meta.env` in `App.tsx`, the `inert` prop in `Shell.tsx`).
- `tsc` with `noUnusedLocals` — no new unused symbols; the four it reports are pre-existing in
  `planning.tsx`, `planning-forms.tsx` and `sourcing-forms.tsx`.
- `vitest run` over `routes.test.tsx` — **195 passed.** Three tests added: no seeded record
  carries an `executionPlanId`; every readiness row resolves to a real shipment; and the
  shipment screen still reaches its cargo readiness. Four existing tests were rewritten where
  they asserted the plan field on the shipment and pre-clearance forms.

## Still open

1. **Where do the plan's own fields go?** Shipper and its address, bank and branch, cargo source,
   seasonality, urgency, raw/finished/needs-processing quantities and *receiving at facility* were
   held on the plan and are now held nowhere. They were not moved, because that is the
   split-shipment design and it is yours to describe.
2. **The export contract's payment terms** — see the orphan above.
3. **Phase 13 in `exportProcess.ts` and §6.13 in the workflow document** still describe execution
   planning as a step of the business process. Neither is changed here: the source documents say
   the step exists, and re-writing them is a documentation decision, not a side-effect of a model
   change.
