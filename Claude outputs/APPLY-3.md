# Finance records a price per country of the route

**Date:** 9 September 2026
**Instruction:** *"The pop-up needs to be updated: if country is Sudan user can add price for
Sudan only; for other countries user can add price between one or two countries; this should be
entered by finance."* — the *Record feedback* dialog on the cross-functional contract review.

> **Not yet written to your disk.** The bridge to your computer dropped before I could commit
> this one. Everything below is in this folder; copy `src\` over
> `MergedMockup\vendor\export\` to see it in the mock-up, and over
> `COTS_Export_Mockup_v2.4\export-process-mockup\src\` for the durable copy. `CHANGES.md`
> replaces `D:\CIMEgypt\COTS_30Aug26\CHANGES.md`.

## One or two countries is the route, not a choice

The country profiles already carried `hasInlandTransitLeg` and an `inlandLegLabel` for exactly
two countries, so the second country is derivable:

| Contract origin | Priced in |
| --- | --- |
| Sudan | Sudan — loads at Port Sudan and never leaves |
| Tanzania, Mozambique | their own country, same reason |
| Ethiopia | Ethiopia **and Djibouti** |
| Chad | Chad **and Cameroon** — overland to Douala |

`CountryProfile.transitCountry` is new and names the second country. A **name, not a
`CountryUnit`**: Djibouti and Cameroon are transit countries, not operating units, and the unit
list must not grow to hold them.

## One function decides which countries may be priced

`reviewPriceLegsFor(contract)` in `domain\variants.ts` is read by the dialog **and** by the
service layer, so the form cannot offer a country the save would refuse — and the save refuses a
price against a leg the route does not have. A figure filed under a country the cargo never
enters is worse than no figure.

## Finance only

The price rows render on the Finance row of the dialog and nowhere else. `recordReviewFeedback`
refuses prices sent for any other role, so a second screen cannot file one under Quality.

Who may *sign in* as Finance is still not checked — the position the whole screen already takes,
and states.

## Optional, and not a gate

No source makes a price mandatory to the review, so none is asserted. Recorded prices appear
under the Finance row's comment rather than in a column of their own: only one of three rows can
ever carry one, and an almost-always-empty column reads as missing data rather than a field that
does not apply.

## Files

| File | Change |
| --- | --- |
| `domain\types.ts` | `ReviewFeedbackPrice`, `ReviewFeedback.prices?`, `CountryProfile.transitCountry?`. |
| `domain\variants.ts` | `transitCountry` on Ethiopia and Chad; `reviewPriceLegsFor`. |
| `services\store.ts` | `recordReviewFeedback` takes `prices`, validates leg / country / amount, refuses non-Finance. |
| `pages\contracts.tsx` | The dialog's Finance-only price block and currency; prices shown on the review table. |
| `__tests__\routes.test.tsx` | Five tests. |

## Verified

`tsc` clean (including `noUnusedLocals`); **210 tests pass** — five new: the leg derivation for
all five countries; Sudan asks Finance for one price and asks the other functions for none; Chad
asks for two; prices store for Finance and are refused for Quality; and a leg the route does not
have is refused.

## Open

1. **What the figure is** — cost, transfer price, quoted rate? Neither source says, so the field
   is labelled with the country and nothing more. Currencies are USD and SDG, the two the costing
   screens offer.
2. **Why the review dialog?** Phase 04 is each function confirming it has the *set-up in place* to
   fulfil the contract; a price is not obviously part of that. Costing (Phase 08) and advance
   payments (Phase 07) already hold money. Built where you pointed — worth a second look.
