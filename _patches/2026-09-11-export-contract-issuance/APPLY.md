# Export contract — the issuance screen, and EX form issue

**Date:** 11 September 2026
**Instruction:** *"Review the Export Contract screen and the process for all countries. Create a
screen for Add and Edit Export contract screen in the mockup. Check the Issuance info card the
fields related to export contract."*

**Applied to `MergedMockup\vendor\export\` and to `MergedMockup\src\App.tsx`.** For the durable
copy, the same files go to `…\COTS_Export_Mockup_v2.4\export-process-mockup\src\`, except
`merged-src\App.tsx`, which is the merged application's own.

| File | Change |
| --- | --- |
| `services\store.ts` | `issueExportContract`, `addExportForm`, `removeExportForm`. |
| `pages\preclearance-form.tsx` | New `ExportContractIssuanceForm` — the Edit screen. |
| `pages\preclearance.tsx` | Header action into it; the Issuance card says when nothing is issued. |
| `App.tsx` · `merged-src\App.tsx` | `/pre-clearance/:id/edit`, in **both** route tables. |
| `__tests__\routes.test.tsx` | Twelve tests. |

## The review first — what the Issuance card was

Every one of its eight fields has rendered since v1.0 and **none of them could be written.**
`api` had `requestExportContract` (added 6 Sep), `consumeExportForm` (marks a form Used) and
nothing in between. The seeded records showed an issuance; a record raised in the mock-up could
never get one. This is gap 1 of the five in the 7 September meeting pack, and it is the gap that
strands Visio steps **3.5, 3.6, 6.1 and 8.2** — the whole middle of the pre-clearance chain.

## The process for all countries

Read from the country profiles, which agree with §6.14:

| Country | Export contract | EX forms | Also | Load port |
| --- | :---: | :---: | --- | --- |
| **Sudan** | yes | **yes** | service request to logistics (Sudan only) | Port Sudan |
| **Ethiopia** | yes | no | export permit; advance-payment chain | Djibouti |
| **Chad** | yes | no | no advance payment | Douala |
| **Tanzania** | **no** | no | export permit | Dar es Salaam |
| **Mozambique** | **no** | no | starts from a **commercial invoice** | Beira |

Both new screens branch on these two flags and nothing else — no country code appears in a
condition. A twelfth test pins the whole matrix, because three screens now read it.

**Two things this review turned up, neither of them fixed here:**

1. **§6.14 and the profiles disagree about Chad.** The workflow says *"applicable in Sudan and
   Ethiopia, not applicable in Tanzania… Chad via Renatus"* and the workshop is silent on Chad.
   The Chad profile says `usesExportContract: true`, and the seeded **ec-3 is a Chad record**
   (PC-2049). This is the same disagreement already recorded on 9 September between C10's step
   configuration and the Export profile. The screens follow the profile; the question stands.
2. **No seeded export contract exists on a Tanzania or Mozambique contract** — correctly, since
   `requestExportContract` refuses those countries. So the issuance refusal for those two is
   defence in depth that seeded data cannot reach. Kept anyway, and the reason is written on it.

## Add and Edit — why it came out as one new screen, not two

Confirmed in review on 11 September. **Add already exists**: `/pre-clearance/new`, added 6
September, and it deliberately captures only the *request*. The record carries two stages
belonging to two parties, and the second one is the gap:

| | Who produces it | Where |
| --- | --- | --- |
| **Request** — request no, purchase contract, requested quantity, exporting entity, unit price | the business | `/pre-clearance/new` (existing) |
| **Issuance** — contract no, issuance and expiry dates, actual exporter, bank, branch, quantity, scanned file; and in Sudan the EX forms | the Ministry of Trade | **`/pre-clearance/:id/edit` (new)** |

**The request is shown read-only and cannot be edited.** Your call, and the reasoning is on the
screen: a request is the record of what the business *sent*, so correcting it after the ministry
has answered rewrites the thing that was answered. It is rendered at the top of the Edit screen
because someone recording an issuance needs to see what was asked for — most obviously to notice
that PC-2041 requested **630 MT** and was issued **620 MT**.

## The four decisions inside it

**Status follows the action.** Recording the number and the issuance date *is* the issuance, so
`issued` is derived in the service layer and never offered as a control. This is the rule the tag
specification moved to on 9 September, where a selectable state let a record say `agreed` with
nobody having agreed.

**The expiry is required — the one invented-looking rule, and it is sourced.** §6.14: *"Export
contract: Requested → Under process → Issued, with an expiry. [AS-IS]"*. Rule R13 (the validity
banner here, and the shipment's own export-contract expiry check) has nothing to measure without
one. Required on the transition to Issued, not on the record.

**Bank and branch become master dropdowns**, as on the shipment two changes ago. The captured
values resolve exactly — `bankByName("Unity Commercial Bank")` → `cp-bank-unity`, branch *Head
office* — so nothing captured is lost, and a test asserts the hydration. The legacy note stays on
the branch field: it was written into the column named *Goods Desc* (defect D14).

**EX forms are issued on the same screen, Sudan only.** `addExportForm` creates the form at
**Issued**, not *Under processing*: the bank has produced it, and a form created as under
processing would be a form nobody had issued. A **used** form cannot be removed — consumption is
recorded against its number on two other records, which is rule R7's reasoning applied to
deletion. The R5 total check stays a **warning, not a gate** (decision D-10); the legacy estate
saved three different totals for one shipment and this reports the mismatch rather than refusing.

## Not done, and why

- **The four Ministry-of-Trade dates** (sent to MoT, received from MoT, sent to trade finance,
  chamber of exporters) get **no controls**. Decision D7: the columns exist in the legacy system
  with no form controls at all and are blank on recent records. Adding controls would be
  designing a process no source describes. They stay display-only.
- **`under_process` has no action.** You chose the derived-status option, so the only transition
  this screen performs is → Issued. Requested and Under process are still what the record shows
  beforehand.
- **Nothing is blocked.** No new gate anywhere; D-10 holds.
- **Who may record an issuance is not checked** — the position every screen in the module takes.
- **The workflow documents are not regenerated.** Now four rounds behind.

## Open for the business

1. **Does the export contract apply in Chad?** Two answers in the workspace, and the seeded Chad
   record makes it live rather than theoretical.
2. **Is the exporting-entity list country-specific?** Still the three Sudan names (Invictus,
   Sayga, Green Zone) from the 6 September screen — but the actual exporter on the issuance is
   free text, and Chad's would be Renatus. Worth settling together.
3. **May the issued quantity exceed the requested?** Not refused, and reported on screen when it
   happens — no source makes the request a ceiling.
4. **Should an issuance be amendable after the fact, and should the previous value be kept?** The
   screen overwrites and keeps no history, same as the shipment's bank card.

## Verification

**Not run.** All six files parse clean as TypeScript/TSX. The twelve new tests are written to the
suite's conventions (`renderRoute`, `resetStore`, `afterEach`) and **have not been executed** —
the toolchain is not reachable from this session.

```
npm run typecheck
npm test
```

The block is `describe("the export contract issuance can now be recorded")`. It mutates the store
(issuing contracts, adding and removing EX forms) and has its own `afterEach(resetStore)`.

`route-tables.test.ts` compares the two route tables in both directions — the new route was added
to both, so it should stay green. That test exists because the Procurement routes were added to
only one table on 3 September and the screens were unreachable inside COTS.

## Try it

| | |
| --- | --- |
| Never issued, Chad | `/#/pre-clearance/ec-3` → **Record the issuance** |
| Issued, Sudan, two EX forms | `/#/pre-clearance/ec-1/edit` |
| Issued, Ethiopia — EX forms state the rule | `/#/pre-clearance/ec-4/edit` |
