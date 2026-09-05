# COTS — change log

## 2026-09-05 · mock-up v2.7

One business instruction of 5 September 2026, in two parts. They are the same correction
twice, and it is the correction this project keeps making: **a screen asking for something
the system already holds, and a button placed where it had nothing to read from.**

### Purchase contract (phase 10) — the trader is read, not asked for

*"Under Add screen, remove the trader name field in this screen."*

The Trader name drop-down is gone from **New purchase contract**. The trader is now read
from one of exactly three places, shown read-only with its source named on the row:

1. the **agreed deal** the contract is raised from — §6.2 activity 2 already passes it, and
   origination requires it, so on this path it is always present;
2. the contract copied by **Retrieve PC No.**, which carries its terms including its trader;
3. the **session**, but only where the signed-in user *is* a trader.

The third is deliberately narrow. Unlike the purchaser at Phase 04, the person filling this
form is usually not the person the field names — the legacy form's own *Communicated from*
offers Dubai Execution, Country Execution and Customer beside Trader — so defaulting to the
signed-in user would put an execution clerk's name in a trader's field.

**Why the removed control was worse than redundant.** Its list of four names was a constant
in the page, not master data, and it did not contain *Tomás Ferreira* — the trader on
OPP-2026-014 and on all six seeded contracts. So the field rendered as *inherited*, because
the deal had supplied a trader, and simultaneously **empty and blocking the save**, because
the supplied name was not on the list. The only way past it was to overwrite the real trader
with a name that was not the trader. That is what the screenshot shows.

**Open for the business.** Where none of the three sources applies — a blank contract raised
by someone who is not a trader — the contract has no trader and **the save is refused**, with
the reason and the three sources stated on screen. The alternative was to record whoever
filled the form in, which is the thing the removed control invited. If a coordinator must be
able to raise a contract for a named trader, that needs a source this instruction does not
provide.

### Contract list (phase 10) and new shipment (phase 15) — the action moves to the row

*"Under Contract List view screen, remove the header button New shipment from a contract,
instead add an action button in the list view to automatically capture the details needed in
the new shipment screen."*

The same correction the business made to the budget list on 3 September, for the same reason.
The header button's own label said *from a contract*, on a header that belongs to no
contract, so it could only open an empty screen with the contract still to be chosen — the
one thing it named.

Raised from a row, the New shipment screen now arrives with what the contract already
determines, each value labelled with where it came from:

| Captured | From |
| --- | --- |
| Contract | the row |
| Execution plan | the contract's, **only where it has exactly one** |
| Shipment type | the contract's |
| Quantity | the ceiling (quantity + tolerance) less what other live shipments commit |
| Last shipping date | the end of the contracted shipment period |

Nothing is locked and nothing is a rule: the quantity is still checked against the ceiling on
save, and every prefilled value stays editable. Where the contract has **several** execution
plans none is chosen and the screen says so — picking one would be the action inventing
rather than reading. The action is not offered on a cancelled contract, or on one whose
quantity plus tolerance is already fully committed, because neither has a shipment left to
raise. (No seeded contract is in either state, so the disabled form is not visible in the
demo data.)

**Follow-up of the same date.** The action moves to the **last column** — it is an action
rather than a fact about the contract, so it belongs at the end of the row rather than in the
middle of the record's own attributes — and the page header gains a **New contract** button.
The two buttons make the distinction plain: creating a contract reads nothing from any row,
so it belongs to the page; raising a shipment needs a contract to read, so it belongs to the
row. The list had been left with no add action of its own when the shipment button came off
the header. The Shipment column is also kept in every saved view's prescribed column set, so
that switching view cannot quietly take the action away.

### Verification

974 tests in the Export suite, 973 passing and 1 skipped. Six are new: the trader read from
the deal with no control to overwrite it, the refusal when no source applies, the contract
list's row actions with no header button and nothing linking to the bare New shipment screen,
and the capture with one plan, with several, and with no contract at all. Typecheck
unchanged — the one long-standing `inert` prop warning in `Shell.tsx`.

### Documents

Not regenerated this round: the instruction asked for the mock-up only. The phase registry
(`src/integration/exportProcess.ts`) carries both changes at phases 10 and 15 under a new
`changedAtV27`, so the *Phase context* panel states them on the screens themselves. The
workflow documents stand at v2.6 / integrated v2.3 / steps v2.6 and are one round behind.

## 2026-09-03 · mock-up v2.6, workflow v2.6

One business instruction of 3 September 2026 and two follow-ups of the same date, plus one
change taken from a workshop reference spreadsheet. Four phases changed, one screen group
added, one screen rebuilt on the business's own weekly report, and one integration defect
fixed. The twenty-three-phase sequence is unchanged.

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

### Agent balance list — rebuilt on the CIM weekly purchase report

Source: `Funding - CIM Weekly Purchase Report.xlsx`, sheet **Agents Accounts**, columns P–W.
A reference spreadsheet rather than a business instruction — the only change of this kind.

The list now carries the six figures the business already reconciles on, under the report's
own names and formulas: **Payments SDG**, **Agreed Purchases SDG**, **Balance Basis Agreement
SDG** (payments less agreed), **Value Received SDG**, **Balance Basis Delivery SDG** (payments
less received) and **Cargo not Delivered** (the difference between the two bases, which reduces
to agreed less received). It replaces the funding, drawdown and residual the screen showed
before — one basis and a half of the two the business uses.

Why two bases: the agent is funded before the goods arrive, so *what does this agent owe us*
has two answers. Against the **agreement** — have we paid more than we agreed to buy? Against
the **delivery** — have we paid more than has actually arrived? The gap is cargo agreed and not
yet delivered.

Four things the sheet does are reproduced **and stated**, not copied silently:

- **Barter is not a payment.** Its Payments column reads only the Cash/Transfer pivot; a barter
  pivot sits beside it that no column reads. On the seeded data that moves one agent by
  2,400,000 SDG, and the excluded amount is shown beside the payment.
- **The Balance Basis Delivery annotation is reversed** against its own formula. The formula is
  followed, because it produced every figure in the report.
- **Cargo not Delivered is filled in on three rows of forty-nine**, and not on the Total row.
  Computed for every row here.
- **A negative basis is a real state** — one captured agent has received more than was paid — so
  neither basis is floored at zero, and no sign convention is asserted.

**Open, and the substantive finding:** a purchase agreement holds **no price**. In the source it
does — the Purchase Details Master carries `Price SDG/MT`, `Total Cost SDG` and `Value Delivered
SDG` on the agreement row — and two of the six columns derive from it. Here a price exists only
on a receipt, so the agreement basis is reconstructed by reading the price back from that
agreement's own priced receipts, and the screen reports how many agreements have no price to
read. Until the agreement carries a price, the business's weekly figure is reconstructed rather
than reproduced.

It also **partly answers** a question the workflow has carried since v2.3: MMP shows no posting
from a fund to an agent balance — but the business posts one every week, and this report is it.

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
| `COTS_Export_End_to_End_Workflow_v2.6.docx` | *Amendment at v2.5* blocks in §6.2–§6.5, new §6.24 for Procurement, the v2.6 agent-account section in §6.4, §16.2 change summary. Two questions marked **[CLOSED]** and one **[PARTLY ANSWERED]** where they were raised. |
| `COTS_Export_Documentation_Workflow_Integrated_v2.3.docx` | The capability injections: C03 receiving-location master, C03 exchange rate, C10 value lists, C10 the session's country, C01 the purchaser, C07 the payment slip, and C11 Reporting **inverted** — the CIM report now specifies a screen rather than only consuming one. One binding deliberately **not** written: the agreement's quality inspection to S03 Quality, since no source says they are the same artefact. |
| `Workflow Steps/COTS_MMS_Processes_Steps_v2.6.xlsx` | Seventeen rows re-pointed, plus a *Changes at v2.6* sheet. Step descriptions, swimlanes and next-step references are untouched — verbatim from Visio. |

`Execution_Operation_Processes_Steps.xlsx` is unchanged: none of its rows references a
budget, fund, agreement, purchase order, receiving location or agent balance.

### Verification

968 tests in the Export suite, 967 passing and 1 skipped (a standalone-only branch of the
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
6. **Should a purchase agreement carry its agreed price?** Two columns of the agent account need
   one; it is reconstructed from receipts today.
