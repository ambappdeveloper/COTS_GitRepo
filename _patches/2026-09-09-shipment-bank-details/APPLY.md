# Bank details per split shipment — Finance notified, Sudan only

**Date:** 9 September 2026
**Instruction:** *"Request bank details only for Sudan, after split shipment ask bank details for
each split, there should be notification to finance once split so they enter bank details (bank
name, branch name)."*

## Where this belongs

    D:\CIMEgypt\COTS_Claude\COTS_Export_Mockup_v2.4\export-process-mockup\src\

then `vendorize.ps1 -Go -Refresh`. Already applied to `MergedMockup\vendor\export\`;
`CHANGES.md` at `D:\CIMEgypt\COTS_30Aug26\` carries the entry.

| File | Change |
| --- | --- |
| `domain\types.ts` | `ShipmentBankDetails`, `Shipment.bankDetails?`, and `CountryProfile.requiresShipmentBankDetails`. |
| `domain\variants.ts` | The flag on all five profiles — Sudan true, the rest false, with the open question recorded on Sudan. |
| `domain\milestones.ts` | The new `shipment_bank_details` milestone; the `execution_plan_created` clean-up (below). |
| `data\seed.ts` | The captured banks re-seeded onto the Sudan splits; eight stale milestone entries removed. |
| `services\store.ts` | `api.setShipmentBankDetails`. |
| `pages\shipments.tsx` | The *Bank details* card on the shipment Summary. |
| `__tests__\routes.test.tsx` | Six tests. |

## The notification is a milestone, not new machinery

Export deliberately keeps no task queue of its own — `src/integration/exportTasks.ts` says so at
length, and derives Export's rows for the one Actions Inbox from shipment milestones. A milestone
already carries the two things this needed: an owning **role**, and an `appliesTo` **country
predicate**.

So raising a Sudan split leaves `shipment_bank_details` unanswered, owned by **Finance**, and
that unanswered milestone *is* the row that appears in front of them. `setShipmentBankDetails`
writes the details and completes the milestone in the same operation, so the task cannot outlive
the answer.

Placing it: `ready` as soon as the contract is issued, not waiting on cargo or planning — the
bank is a fact about the split, and Finance can answer the moment the split exists, which is when
they are asked.

## Per split, not per contract

`Shipment.bankDetails` holds the bank id, **the bank name as it read when it was recorded**, the
branch, and who recorded it and when. One contract shipped in four splits may route them through
four different banks; that is the point of the instruction and something a contract-level field
cannot express. Storing the name alongside the id means a bank renamed in master data does not
silently rewrite what a shipped record says it went through.

## Sudan only, as configuration

`requiresShipmentBankDetails` on the country profile — true for Sudan, false for Ethiopia,
Tanzania, Mozambique and Chad. Same shape as the existing `usesLogisticsServiceRequest`, which
the workshop notes also record as Sudan-only. The next country that needs it is a configuration
change rather than a code change.

**Outside Sudan the card still renders** and explains that the details are not requested there,
rather than vanishing — a reviewer comparing a Sudan shipment with a Tanzanian one should see the
rule, not wonder where the field went.

**Nothing is blocked** by missing details. No source makes the bank a precondition, and decision
D-10 is the standing rule against inventing a gate.

## Where Finance enters it

A **Bank details** card on the shipment Summary — not the New shipment form. Finance answers
this; Dubai Execution raises the split. Putting the fields on the create form would ask the wrong
function at the wrong moment.

Bank comes from the counterparty master; the branch is a dependent list from that bank's own
branches — the same two lists the execution plan used before it was removed, and the same
dependent-master pattern as commodity type and bank branch.

## The captured banks are not lost

The execution plans named a bank and a branch, and planning was removed on 8 September. Each
Sudan split is re-seeded with the bank its plan carried:

| Shipment | Bank | Branch | From |
| --- | --- | --- | --- |
| sh-1 (PC-2041.1) | Unity Commercial Bank | Head office | ep-1 |
| sh-2 (PC-2041.2) | Unity Commercial Bank | — | ep-2 |
| sh-3 (PC-2044.1) | Savannah Trade Bank | Trade centre | ep-3 |
| sh-7 (PC-2058-LV.1) | Savannah Trade Bank | Head office | ep-7 |
| **sh-8 (PC-2041.3)** | **outstanding** | | left deliberately, so the Finance task is visible in the demo |

## Also fixed — a milestone naming a record that no longer exists

Removing execution planning yesterday left `execution_plan_created` in `EXECUTION_FLOW`, and that
was **not cosmetic**: `export_contract_requested` listed it as a prerequisite, and a prerequisite
naming a milestone the flow does not define is never met. The export-contract step would have sat
at not-started for ever. It now waits on `contract_issued`, which is what the plan waited on.

Also removed: the milestone, its eight seeded entries, and the two lifecycle steps that rolled it
up — *Planned* on the shipment stepper and *Execution planned* on the contract stepper. A step
whose only source is gone renders as not-applicable for ever, which reads as a gap in the process
rather than a step that was retired.

A test now walks every prerequisite in the flow and fails if one names a milestone that does not
exist, so this cannot recur silently.

## Verified

- `tsc` over `vendor\export` — clean apart from the two long-standing errors; `noUnusedLocals`
  reports nothing new.
- `vitest run` — **202 passed**, six new: the form appears on an outstanding Sudan split and says
  nothing is blocked; a split that holds details shows them and no form; Tanzania says why it does
  not ask; the requirement comes from the profile and not a country code in the screen; the
  milestone is Finance-owned and actionable on Sudan but not-applicable elsewhere; and the
  prerequisite-integrity check above.

## Open

1. **Is it really Sudan only?** Every captured execution plan named a bank — including the Chad,
   Ethiopian and Tanzanian ones. The bank is evidently *known* outside Sudan even if it is not
   *asked for* there. Recorded on the Sudan profile rather than resolved.
2. **Does the bank submittal at Phase 14 read this?** It has its own bank fields
   (`actualBank`, `actualBankBranch` on the export contract) and does not yet read the split's.
   Wiring them is a separate call.
3. **The plan's other fields** — shipper and address, cargo source, seasonality, urgency, the
   raw/finished/processing quantities — are still held nowhere, waiting on the split-shipment
   design.
