# New request, raised from the contract's own Export contract tab

**Date:** 13 September 2026
**Instruction:** *"In this screen tab Export Contract screen shot, add a button new request for
Export contract related to the Purchase Contract, in the new Export Contract screen form, it will
inherit the Purchase Contract no."*

**Applied to `MergedMockup\vendor\export\`.** For the durable copy the same three files go to
`…\COTS_Export_Mockup_v2.4\export-process-mockup\src\`. **No route change** — `/pre-clearance/new`
is already in both route tables, so neither `App.tsx` was touched this round.

| File | Change |
| --- | --- |
| `pages\contracts.tsx` | **New request** on the Export contract tab — header and empty state. |
| `pages\preclearance-form.tsx` | Reads `?contract=`, inherits and locks the purchase contract. |
| `__tests__\routes.test.tsx` | Seven tests. |

## What it does

The action existed only on the Pre-clearance list header, where the screen it opens asks which
contract the request is for. Reached from a contract's own tab that is already settled, so it
travels in the query string — `/pre-clearance/new?contract=ct-1` — and the screen **states** the
contract instead of asking again.

Inheriting the contract also settles the three things that already derive from it on that screen:

| | |
| --- | --- |
| **Request number** | `PC-2041-R2` — counts the requests already on the contract; issued on save |
| **Requested quantity** | what is still unrequested — 1,300 MT contracted less ec-1's 630 = **670 MT** |
| **Large volume** | read from the contract |

## The two decisions

**Locked, not merely prefilled.** Confirmed in review. The tab is scoped to one contract, so a
request raised from it belongs to that contract; a live drop-down would let someone file a request
that never appears on the tab they started from, and nothing on screen would show the mistake.
This is the call the new purchase contract already makes with its origin — read from the session,
stated rather than asked for. The drop-down is **not removed**: it is what the screen still shows
on the path that has existed since 6 September, Pre-clearance → New request with no contract in
the address. A test holds both halves.

**After saving it still goes to the new export contract record**, unchanged — that is where the
next action lives, since recording the issuance is done there.

## Two things decided without asking, and stated on the screens

**No button in Tanzania or Mozambique.** Neither uses an export contract, the tab's empty state
already says so, and `requestExportContract` refuses one. A button leading to a screen that
refuses is worse than no button — the rule the pre-clearance record's own issuance action follows.

**The button shows even when a request already exists.** A second request against one contract is
allowed and numbers itself `-R2`, which is what your own screenshot showed.

## A stale link is not a locked screen

An id in the address that resolves to nothing falls back to the drop-down and says why, rather
than locking the screen to a contract it cannot show. This is reachable with a *real* id, not only
a bogus one: the Export lists have been country-scoped since 9 September, so a link to a Sudan
contract opened in an Ethiopia session names a contract the session cannot see.

## One fix taken while in the file

The **Large volume** field's placeholder read *"– select an execution plan"*. Execution planning
was removed on 8 September and this screen has read the contract ever since, so the string had
been wrong for five days. Now *"– select a purchase contract"*. Unrelated to the instruction, one
line, and left in place it would have been read as a field still wanting a plan.

## Not covered by the tests, and said rather than left to be found

**The empty-state copy of the button.** No seeded contract can reach it: every applicable contract
already has an export contract (ec-1→ct-1, ec-2→ct-2, ec-3→ct-3, ec-4→ct-4, ec-5→ct-6), and the
only one without — ct-5, Tanzania — is a country the action is withheld from. The branch is
exercised by raising a contract inside the mock-up. The test that covers this area asserts the
header action renders exactly once, and says the above in a comment.

## Verification

**Not run.** All three files parse clean as TSX. The seven new tests follow the suite's
conventions and **have not been executed**.

```
npm run typecheck
npm test
```

The block is `describe("a request can be raised from the contract's own Export contract tab")`.

## Try it

| | |
| --- | --- |
| Sudan, one request already | `/#/contracts/ct-1/export-contract` → **New request** → inherits PC-2041, R2, 670 MT |
| Ethiopia | `/#/contracts/ct-4/export-contract` |
| Tanzania — no button, and the tab says why | `/#/contracts/ct-5/export-contract` |
| The drop-down path, unchanged | `/#/pre-clearance/new` |
