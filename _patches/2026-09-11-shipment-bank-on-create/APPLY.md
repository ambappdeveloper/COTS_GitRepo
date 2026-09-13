# Bank details on the New shipment screen — name and branch, from master data

**Date:** 11 September 2026
**Instruction:** *"In the attached screen shot, add the bank details, Bank Name and Bank Address
details. The Bank Name field is a dropdown list from the Master Data, and the bank address
details is auto populated based on the bank selected."* — the **New shipment** form,
`/shipments/new`.

**Confirmed in review, and it changed the shape of the change:** the second field is the **bank
branch**, not the bank address. The record already holds a branch, the branch list is already
governed and already keyed by the bank, and the master's address on both seeded banks reads
only *Khartoum* — a field that would have said the same thing on every shipment. So the screen
asks for the two things the record holds: **Bank** and **Bank branch**.

## Where this belongs

    D:\CIMEgypt\COTS_Claude\COTS_Export_Mockup_v2.4\export-process-mockup\src\

then `vendorize.ps1 -Go -Refresh` to carry it into `MergedMockup\vendor\export\`.

> **Read this before applying.** The Export prototype's own source tree is not in
> `COTS_GitRepo` — only `vendor\` (two files) and these `_patches` copies are. The four files
> here were edited from the newest copy of each in `_patches`:
> `2026-09-09-country-scope` for `pages\shipments.tsx`, `services\store.ts` and
> `__tests__\routes.test.tsx`, and `2026-09-09-review-price-per-country` for `domain\types.ts`.
> **Diff before overwriting.** If anything landed on those files after 9 September that is not
> in a patch folder, this would silently revert it.

| File | Change |
| --- | --- |
| `services\store.ts` | New `resolveShipmentBankDetails`; `createShipment` accepts and records the bank; `setShipmentBankDetails` rewired onto the same resolver. |
| `pages\shipments.tsx` | The two fields on the create form; the Bank details card's doc comment corrected. |
| `domain\types.ts` | `ShipmentBankDetails` doc comment corrected — comment only, the record is unchanged. |
| `__tests__\routes.test.tsx` | Nine tests. |

## What was decided, and what was deliberately not

### The 9 September design is not withdrawn — the fields are optional

The bank was put on the shipment **Summary** card on 9 September for a stated reason: Finance
answers it, Dubai Execution raises the split, so the create form would ask the wrong function at
the wrong moment. Raising a Sudan split leaves the `shipment_bank_details` milestone unanswered,
and an unanswered milestone owned by Finance *is* the row in the one Actions Inbox.

That still happens. Both fields are optional; leaving them blank is the 9 September path
unchanged, and the form says so rather than letting it be discovered by saving:

> **The bank can be left to Finance.** Saving without one raises this split with *Bank and branch
> recorded for the split* outstanding, which puts a row in the Actions Inbox addressed to
> Finance. Nothing is blocked by its absence.

What is new is that a raiser who already knows the bank is no longer required to leave a task for
a fact they were holding. Supplying it writes the details **and completes the milestone in the
same operation**, so no Finance row is ever raised for a question that arrived answered.

### One function decides, because there are now two ways in

`resolveShipmentBankDetails(country, draft)` in the service layer is read by `createShipment`
**and** by `setShipmentBankDetails`. Two entry points validating one field their own way is how
two screens come to disagree about what is allowed — the defect `reviewPriceLegsFor` was written
to prevent on the review dialog, one screen over. The create form therefore cannot file a value
the Summary card would refuse, and a test asserts the two refusals are the *same string*.

### The country is read from the contract's origin, not from the session

`createShipment` sets `country: contract.origin`, and the service layer checks that country's
profile. A form reading the session's country instead could offer a bank the save then refuses.
The fields are hidden outside the countries configured for it — Sudan today — **and** guarded
again at submit, because the contract can be changed after a bank is picked and a value the
screen no longer shows must not be filed behind the user's back.

### Three refusals rather than three silent corrections

| Sent | Answer |
| --- | --- |
| A bank for Tanzania | *"Tanzania does not require bank details on a shipment…"* — refused, not dropped. Discarding a value somebody typed is worse than saying it does not apply. |
| A branch the bank does not hold | *"Unity Commercial Bank has no branch called 'Trade centre' in master data."* |
| A branch with no bank | *"Select the bank before its branch."* The list is keyed by the bank, so a branch alone names nothing. |

### The edit form does not carry the fields

The Summary card already has **Change bank details**, pre-filled, with Cancel beside Save. Two
editors for one field is how a screen and a card come to disagree about what was recorded. A test
holds this.

### `providedBy` is now the only way to tell the two routes apart

Dubai Execution on a split recorded at creation, Finance on one answered from the card. The audit
trail gets its own second line on create for the same reason — the bank is a separate fact from
the shipment, recorded by a different function, and one merged note would hide that.

### A defect avoided worth naming

`createShipment` builds the new record by spreading `clone(template)`, and the template is
another shipment on the same contract — on Sudan, very likely one that already has bank details.
`bankDetails:` is set **after** the spread, so a split raised without a bank gets `undefined`
rather than silently inheriting the previous split's bank. That would have been invisible and
wrong in exactly the country the feature is for.

## Not done, and why

- **No bank address field.** Superseded in review by the branch. If the address is wanted as well,
  it is `Counterparty.address` and read-only beneath the bank — a small addition, not a rework.
- **Nothing is blocked.** No source makes the bank a precondition; decision D-10 is the standing
  rule against inventing a gate.
- **Who may record it is not enforced.** Anyone who can raise a split can record a bank here. That
  is the position every screen in the prototype takes — who may act is a C01 permission question,
  and settling it one screen at a time is how two screens come to disagree.
- **The workflow documents are not regenerated.** They stand at v2.6 / integrated v2.3 / steps
  v2.6 and were already three rounds behind before this change. §6.15 does not mention bank
  details on the shipment at all.

## Open for the business

1. **Is the branch the right second field, or is the address wanted too?** Settled in review as
   the branch; recorded here because the instruction said address.
2. **Should the bank be asked for outside Sudan?** Unchanged and still open from 9 September:
   every captured execution plan named a bank, including the Chad, Ethiopian and Tanzanian ones,
   which is evidence the bank is *known* outside Sudan even if it is not *asked for* there.
3. **Should recording a bank at creation be attributed to Finance anyway?** It is attributed to
   the raiser, which is truthful but means the Finance milestone is completed by someone else.

## Verification

**Not run.** The Export source tree is not reachable from this session, so `tsc` and the test
suite could not be executed against it. All four files parse clean as TypeScript/TSX. The nine
new tests are written against the suite's existing conventions (`renderRoute`, `withScope`,
`resetStore`) but have not been executed.

Run before trusting:

```
npm run typecheck
npm test
```

The nine tests are in `describe("the bank can be recorded with the split, or left to Finance")`.
They create shipments, so the block has an `afterEach(resetStore)` — without it the new rows
leak into the quantity-left assertions in the describe above.
