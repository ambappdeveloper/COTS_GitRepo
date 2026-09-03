# COTS — change log

## 2026-09-03 · mock-up v2.5, workflow v2.5

One business instruction of 3 September 2026 and two follow-ups of the same date. Four
phases changed, one screen group added, and one integration defect fixed. The
twenty-three-phase sequence is unchanged.

### Budget (phase 02)

- **One plan per budget**, chosen above the budget period. The Plan and *Planned on the
  plan* columns leave the Budget information card as a consequence; the planned figure is
  stated once on the Plan card and the per-commodity comparison is unchanged.
- **Issued Payment Amount** in local currency on the Edit screen, with a **Payment Date**
  and a read-only USD conversion read from the FX master on that date. The budget stores
  the amount and the date, never the rate or the conversion.
- **New fund** action on each row of the list — not in the page header — which opens the
  Phase 03 create screen with the agent, commodity, value and season taken from that
  budget line.

### Funds (phase 03)

- **New Fund button removed** from the tab. A fund starts from the Budget list.
- **Seasonality removed** from the create screen: read from the budget's plan, or from the
  budget period where a captured budget names no plan, and shown read-only.
- **Issued Payment Amount** before the actual payment date, and the USD conversion is now
  calculated on it rather than on the value requested.
- **Payment slip** attachment, held separately from the fund document.

### Purchase agreement (phase 04)

- **Agreement Type** (Fixed | Collection), Fixed by default: on the Add screen, the list
  view (filterable), the view and the Edit screen.
- **Purchaser removed** as a field: the signed-in user on Add, the captured name on Edit.
  An update sends no purchaser, so editing an agreement cannot rewrite who struck it.
- **Quality Inspection** card on the Edit screen — several inspections per agreement, with
  commodity type, supplier location, estimated quantity in MT or bags, actual test date and
  a result of Approved, Rejected or Re-Test.
- **For Quality Inspection** added to the flow-status list.
- View screen: *Allocation* → **Receiving Plan**; the two receipt cards → **Facility** and
  **Warehouse Material Receipts**; and a new **Delivery Updates** card showing the total of
  each and what remains to be delivered.

### Receiving location (phase 05)

- The plan line selects **Warehouse or Facility**, and the location list is read from a new
  **receiving-location master** filtered by that choice and by country.
- **Country removed** as a field: read from the Core session, shown read-only. Recorded as
  outstanding master data in the workflow document.

### Procurement — new tab after Purchase agreement

The purchase order as a record of its own: one PO number, the purchase agreements beneath
it, and the payment against each. Four screens — list, add, view and edit. The USD
conversion is read-only and calculated **per line**, on the rate in force on that line's own
payment date, because two payments under one order can fall in different months.

Documented as a screen group rather than a phase: the instruction adds a tab, and numbering
it would renumber every phase after it. **Open question for the business.**

### Fixed

- **The Procurement view and edit screens were unreachable inside COTS.** The merged
  application re-declares every Export route in `src/App.tsx` rather than mounting Export's
  router, and the three Procurement routes had been added only to
  `vendor/export/App.tsx`. The list worked (it matches the existing `/sourcing/:tab`) while
  a PO number opened *"That address is not part of the demonstration"*. Routes added, and a
  test now compares both route tables in both directions so this cannot recur unnoticed.

### Documents

New versions in `COTs_Export_Merged_Docs/WorkFlows`, all additive — no validated statement
of v2.3 is withdrawn:

| File | Contents |
| --- | --- |
| `COTS_Export_End_to_End_Workflow_v2.5.docx` | *Amendment at v2.5* blocks in §6.2–§6.5, new §6.24 for Procurement, §16.2 change summary. Two questions marked **[CLOSED]** where they were raised. |
| `COTS_Export_Documentation_Workflow_Integrated_v2.2.docx` | The capability injections: C03 receiving-location master, C03 exchange rate, C10 value lists, C10 the session's country, C01 the purchaser, C07 the payment slip. One binding deliberately **not** written — the agreement's quality inspection to S03 Quality, since no source says they are the same artefact. |
| `Workflow Steps/COTS_MMS_Processes_Steps_v2.5.xlsx` | Eleven rows re-pointed, plus a *Changes at v2.5* sheet. Step descriptions, swimlanes and next-step references are untouched — verbatim from Visio. |

`Execution_Operation_Processes_Steps.xlsx` is unchanged: none of its rows references a
budget, fund, agreement, purchase order or receiving location.

### Verification

961 tests in the Export suite, 960 passing and 1 skipped (a standalone-only branch of the
route-table guard). `npm run typecheck` clean apart from one long-standing `inert` prop
warning in `Shell.tsx`.

### Open for the business

1. **Is Procurement a phase or a screen group?** Kept as a screen group; the phase count
   stays at 23.
2. **Where is a payment recorded?** The budget's issued payment, the fund's, and the
   purchase order's are three records of arguably one event, and none is derived from
   another.
3. **Is a fund ever raised outside a budget?** Without the Seasonality field such a fund has
   no season and cannot be saved.
4. **May an agreement be recorded on behalf of another purchaser?** The purchaser is now the
   signed-in user; a coordinator recording for a trader would need two names.
5. **Does a quality-inspection result, or an agreement type, change anything?** Both are held
   and read by nothing, because both instructions state no effect.
