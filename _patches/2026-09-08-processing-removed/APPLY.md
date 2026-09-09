# Processing removed from the cross-functional contract review

**Date:** 8 September 2026
**Instruction:** *"Remove Processing from this screen."* — Phase 04, `/contracts/:id/review`

## Where this belongs

Every file here is in the **Export prototype**, which reaches the merged mock-up through
`MergedMockup\vendor\`. That folder is written by `vendorize.ps1` and the next
`-Go -Refresh` overwrites it, so copy these over

    D:\CIMEgypt\COTS_Claude\COTS_Export_Mockup_v2.4\export-process-mockup\src\

and re-run

    powershell -ExecutionPolicy Bypass -File .\vendorize.ps1 -Go -Refresh

They have also been applied to `vendor\` so the mock-up shows the change today.
`CHANGES.md` at `D:\CIMEgypt\COTS_30Aug26\` already carries the entry.

## What changed

The review asked four functions to confirm they had the set-up in place to fulfil a contract.
It now asks three: **Quality**, **Partner / Country Execution** and **Finance (FP&A)**.

| | From | To |
| --- | --- | --- |
| Reviewing functions | 4 | 3 |
| Intro prose | "Quality, the Execution team, the Processing team and FP&A … Four confirmations" | "Quality, the Execution team and FP&A … One confirmation per function" |
| Section title | The four fulfilment confirmations | The fulfilment confirmations |
| Confirmations donut tone | `confirmed === 4` | `confirmed === c.reviewFeedback.length` |
| Decision D-10 line | Execution, Quality, Processing, FP&A | Execution, Quality, FP&A |
| Notification card | "Same four teams in every country?" | "The same teams in every country?" |
| Open item | "Are the same four teams notified in every country?" | "Are the same teams notified in every country?" |
| Summary-tab banner | "quality, execution, processing and FP&A are alerted" | "quality, execution and FP&A are alerted" |

The hard-coded `4` is gone rather than changed to `3`: the donut now reads the row count, so
adding or removing a function again is a data change and not a code change.

## The captured Processing confirmations go with the row

Five of the six seeded contracts carried one from Selim Aziz — PC-2041's read *"Cleaning line
capacity reserved for weeks 28–33."* They are deleted. A function that no longer reviews does
not have confirmations, and leaving them in the data behind a filtered screen is how orphaned
fields happen. `createContract` now seeds three pending rows instead of four.

| Contract | Deleted |
| --- | --- |
| PC-2041 | Selim Aziz, 04 Jun 2026, confirmed — "Cleaning line capacity reserved for weeks 28–33." |
| PC-2044 | pending, no response |
| PC-2049 | Selim Aziz, 06 Jul 2026, confirmed |
| PC-2052 | Selim Aziz, 13 Jul 2026, confirmed |
| PC-2055 | Selim Aziz, 24 Jul 2026, confirmed |
| PC-2058-LV | Selim Aziz, 16 May 2026, confirmed |

## What is deliberately *not* changed

**The `processing` role stays in the model.** Processing still gives the Execution team
readiness feedback at Phase 13 (allocation) — a different activity on a different screen. A test
asserts `ROLE_LABEL.processing` still exists, so a change to one screen cannot quietly reach the
other.

**Phase 11 in `src/integration/exportProcess.ts` is untouched.** Its field list, its C05 / C02 /
S10 capability lines and its two open questions still say four teams. The instruction was about
this screen; re-pointing the process documentation is a separate call and is listed below.

## File by file

| File | Change |
| --- | --- |
| `pages\contracts.tsx` | The prose, section title, donut tone, D-10 line, notification card, open item and summary-tab banner, plus an *AMENDED 8 September* note in the Phase 04 section header. |
| `data\seed.ts` | Six `role: "processing"` entries removed from `reviewFeedback`. |
| `services\store.ts` | `createContract` seeds three pending rows. |
| `__tests__\routes.test.tsx` | Three tests, in a new `describe`. |

## Verified

- `tsc` over `vendor\export` — no new errors; the only two are the pre-existing `import.meta.env`
  and `inert` ones.
- `vitest run` over `routes.test.tsx` — **196 passed**, the existing 193 plus three new: the
  review tab shows exactly Quality / Partner / Country Execution / Finance and no Processing row;
  the prose and section title no longer count to four while the table shows three; and no
  captured contract carries Processing feedback.

## Open

1. **Should Phase 11 in the process model follow?** `exportProcess.ts` still describes four
   confirmations and names Processing in three capability lines.
2. **Should the workflow documents follow?** §6.4 in
   `COTS_Export_End_to_End_Workflow` names the Processing team as one of the four alerted.
