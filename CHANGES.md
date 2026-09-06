# COTS — change log

## 2026-09-06 · mock-up v2.7 (continued)

### Pre-clearance (phase 16) — the export contract request can now be raised

*"Under Pre-clearance: review all needed fields to be able to produce a new Add/Create form
for EX contract or pre-clearance. Add New button on the header right side."*

**The review found the same shape as the execution plan the day before.** The list has
rendered export contracts since v1.0, and every mutator in the store *advanced* a record that
already existed — issue it, add EX forms, consume them. Nothing started one.

**A New request action** now sits in the list header. It belongs there rather than on a row:
a request is raised against an execution *plan*, which this list is not scoped to, so the
screen it opens chooses the plan and reads the contract from it.

**The field set is deliberately smaller than the record.** `ExportContract` carries two stages
in one row:

| Stage | Fields | Captured here? |
| --- | --- | --- |
| **Request** | request no., plan, purchase contract, quantity, exporting entity, unit price, large volume, notes | yes |
| **Issuance** | export contract no., issuance and expiry dates, actual exporter, bank, branch, quantity, the four ministry dates, the scan, the EX forms | **no** |

Everything in the second group is what the Ministry of Trade *returns*. A create screen asking
for it would be asking the user to invent the answer, and the record would then assert an
issuance that never happened. Status is always **Requested** and moves on by transition — the
same rule that makes a new contract New PC and a new plan Draft.

Three values are read rather than asked for — the **request number** (`<planning no>-R<n>`,
the plan's own sequence, the format every captured request uses), the **purchase contract**
(a plan belongs to one), and **large volume** (it describes one export contract consumed
across several shipments, which is exactly this record). The **quantity** defaults from the
plan and stays editable: PC-2041.1 plans 600 MT and requested 630, so it is a default and not
a rule.

**Country applicability is enforced, not just described.** The banner on that screen has said
since v1.0 that the export contract does not apply in Tanzania or Mozambique. A request
against a plan on such a contract is now refused, naming the country and the reason — and for
Mozambique, that its process starts from a commercial invoice instead. The module's existing
rule is that an inapplicable step is marked *Not applicable*, never left pending; this is the
first place that rule blocks something rather than labelling it.

**Open:** are the three exporting entities — Invictus, Sayga, Green Zone — Sudan's, or every
country's? Sudan's country profile names exactly these three, which is why they are the list;
no other country's profile names any.

### New shipment — container type from master, defaulted from the contract

*"Change the Container type to dropdown list and data will come from masterdata and the
default container type inherited from the Purchase Contract."*

It was free text whose placeholder — *e.g. 20 FT standard* — was the only thing telling anyone
what the value should look like. It is now a list from a new container-type master, with the
two values every captured shipment carries held verbatim.

**The inheritance turned up a third dropped field.** The contract's nearest equivalent is its
**Loading container size** (20 ft / 40 ft / both), which the contract form has collected since
v1.1 and `createContract` **dropped on save** — `Contract` had no such property. That is the
same defect as *Actual PC*, removed yesterday, and the artwork attachment before it: three
fields in one week that a form asked for and the record could not hold. It is stored now, and
it is what the container type defaults from.

**A contract permitting both sizes settles no default**, deliberately — guessing one of them
would be an invention, and the screen says so instead. A captured value the master does not
offer is kept and marked rather than blanked, which is the trader-drop-down lesson applied on
the edit path.

### Execution planning (phase 13) — a plan can now be created

*"Review the existing execution plan details inside the mock then add new button in the header
of execution planning to create new execution plan."*

**What the review found first.** The planning tab has rendered plans since v1.0 and had no way
to make one — the service layer exposed `listExecutionPlans` and nothing else. So a contract
raised in the mock-up reached *No execution plan yet* and stopped there permanently, which is
what the PC-2059 screenshot shows.

**That mattered further downstream than the tab.** A shipment cannot be raised without an
execution plan, so a newly created contract could not reach Phase 15 at all. The chain
contract → plan → shipment was broken at its middle link, and only for records created in the
mock-up — every seeded contract has plans, which is why it had gone unnoticed. There is now a
store test that creates a plan and then raises a shipment against it, because that is the
sequence the change exists to restore.

**New execution plan** sits in the tab's header. That is the opposite placement from the
contract list's New shipment action, for the opposite reason: a planning lot is raised against
the contract the whole tab is already scoped to, so the header has everything it needs to
capture from. A row action would have to read from a sibling lot, which is not where a new
lot's values come from.

Three values are issued or read rather than asked for — the **planning number**
(`<contract no>.<n>`, the contract's own sequence, rule R1), the **status** (always Draft; a
plan moves on by transition), and **large volume** (a property of the contract, not of a lot).
Three more are *defaulted* from the contract and stay editable, each row saying so: port of
loading, ship-before date, and the quantity, which starts at what the contract still has
unplanned. (The assigned owner was a fourth until the second pass below made it read-only.)

**Open for the business:** *must a contract's plans sum to its quantity?* Rule R1 says a
contract may carry several planning lots and states no total, so the screen warns when a plan
would take the total past the contract quantity and does not block — the same posture as the
Phase 11 review under D-10. A store test asserts the permissive path is permitted, so a rule
invented later cannot slip in unnoticed.

**The New shipment screen can now reach it.** A shipment cannot be raised without an execution
plan, and that screen cannot create one — so a contract with no plan was a dead end there: leave,
find the contract, open its planning tab, create the plan, come back, and nothing on the screen
said so. A link beside its execution-plan field now opens the create screen and returns to the
shipment with the new plan already selected; Cancel returns there too. It is a **link and not a
second create form**: the plan belongs to the contract, not to the shipment, and putting a create
screen on a record this one does not own is how two screens end up disagreeing about what a plan is.

**Fixed the same day it shipped: the button was invisible.** It was built with `ActionBar`,
which renders `btn--on-brand` — white text on a translucent fill, styled for the dark blue
page-header band. On the white tab body that is very nearly unreadable, which is what the
PC-2059 screenshot shows. It is now a plain primary button. `ActionBar` belongs in
`PageHeader`'s `actions` and nowhere else; every other use of it in the module is there, and
this one was the exception. The test now asserts the class, since jsdom loads no stylesheet
and the class is the only observable that carries the contrast.

**And the empty state carries the action too**, as the Shipments tab's already did — on a page
whose entire body says *nothing here*, a header button is the easiest thing on it to miss. It
also now says why it matters: *a shipment cannot be raised against this contract until it has
one.* A test creates a contract through the store and renders its planning tab, which
reproduces the PC-2059 dead end exactly; every seeded contract has plans, which is why it was
invisible until a real contract was raised.

**Second pass, same day — four more values read rather than asked for.**

- **Shipper** is chosen from the counterparty master, and the **shipper address** follows it.
  The address stays editable, exactly as the contract's buyer address does, because a one-off
  address is a real case and the master value is the default rather than the only answer.
- **Bank** is chosen from the master, and **Bank branch** from a new branch master keyed by
  bank — dependent in the same way the commodity types are. Changing the bank drops a branch
  the new one has not got and keeps one it has, so *Head office* survives the change.
- **Assigned to** is removed and read from the contract's assigned Dubai Execution owner,
  which was already this field's default. Removing the control makes it what it always was.
- **Seasonality** is removed and derived.

**The seasonality derivation is the one inferred value in this round, and it needs your
confirmation.** The instruction says it is *"already inherited based on the purchase
contract"* — which is right about where it should come from and wrong about the data: **the
contract record carries no season.** Nothing in COTS does. So it is derived from the one thing
the contract does carry that bears on it, the shipment period, under this convention:

> the crop is harvested late in the year, so a shipment period beginning **before October**
> draws on the previous crop and is labelled `(Y-1)-Y`; October or later is labelled `Y-(Y+1)`.

That reproduces **all seven** captured plans — every contract starts June–August 2026 and
every plan reads `2025-2026`. But that is evidence the boundary is *late in the year*, not
that it is October. Any boundary from September onwards fits the same data. A test pins the
boundary so changing it is deliberate and not a quiet edit, and the row on screen states the
assumption rather than presenting a derived value as a fact.

**Open, and the better answer:** should a purchase contract carry its own season, rather than
have one inferred from its dates?

One thing the tests found rather than I did: a captured plan carries the branch **Trade
centre** on Savannah Trade Bank, which my first draft of the branch master had left out. The
test walks every captured plan and fails if the master has lost a branch one of them names —
the same guard that caught the trader drop-down, applied before shipping this time.

**The route-table drift guard is widened.** It compared only `/sourcing`, because that is the
prefix September's Procurement defect happened on — which made it a guard against one
recurrence rather than against the failure. `/contracts/:id/planning/new` is the same mistake
on a different prefix and the narrow version would have let it through. It now checks that
every Export route exists in the merged application, and that every merged route *under a
prefix Export owns* exists in Export, with the owned prefixes read from Export's own table so a
new module surface is covered the day it appears. One legitimate divergence is named with its
reason rather than papered over: `/login/external` is Core's screen, not Export's. Verified by
deleting the new route from the merged table — the guard failed with the exact symptom.

### Purchase contract (phase 10) — a third master, and Retrieve PC No. removed

**Commodity type is now a drop-down read from master data, filtered by the commodity.** It was
free text with the placeholder *Grade or variety*. The new master is a third of its kind, and
the only **dependent** one: a grade belongs to a commodity, so one flat list would offer cotton
grades against sesame. Changing the commodity drops a grade the new one doesn't hold — but
keeps one it does, since several sesames share *Non-GDP*, and clearing a value a change didn't
affect is a value lost for nothing.

An **empty list is a real answer**, not an error: not every commodity is graded. The control
says which case it is — *select the commodity first*, or *the master holds no grades for X* —
rather than showing an unexplained empty drop-down. And as with the other two masters, one
value is held verbatim: **Non-GDP**, the type PC-2041 already carries, so no captured contract
names a grade the master lacks.

**Retrieve PC No. is removed** — and this one has a consequence worth stating, because it is
not visible on the screen it changes.

**It was one of the trader's three sources.** Since 5 September the trader has been read, not
typed: from the agreed deal, from the contract copied by Retrieve PC No., or from the session
when a trader is signed in. That is now **two**. A contract *not* raised from a deal needs a
trader to be signed in, and there is no longer any way to borrow one from an existing contract.
The screen's refusal message and its explanatory banner both say so. If Dubai Execution
routinely raised blank contracts by copying an old one, that path has closed — worth checking
before this reaches users.

It also makes the packing-size fallback unreachable *from this screen*: Retrieve PC No. was the
only thing that put a captured 175 kg or 0 into this draft. I kept the mechanism rather than
deleting it — the values it protects still exist on the records, an Edit screen or any future
prefill meets them immediately, and deleting exactly this kind of guard is how the trader
defect happened — but the code now says it is dormant rather than pretending it is load-bearing.

### Cross-functional review (phase 11) — the responder is read from the session

*"In the cross function review > Record feedback screen: remove the responded by field (it is
automatically captured by the system, the current user logged in)."*

The **Responded by** box is gone from the Record feedback dialog; the signed-in user's display
name shows read-only in its place.

The third field of this kind in two days, and the most clear-cut of them. Unlike a trader on a
contract, the person responding on behalf of a function **is** whoever is signed in and
pressing the button — a typed name could name somebody who was never there.

**What it makes visible, without changing it.** Nothing checks that the signed-in user belongs
to the function whose row is being answered — anyone may record for any of the four. That was
already true; the typed box hid it, because a Dubai Execution user could type a Quality
reviewer's name. Now the name recorded is whoever actually recorded it, whichever row it is,
which is more truthful and more visibly incomplete. §6.4 states no rule tying a responder to a
function, so none is invented — it is added to *What this phase does not settle* on the screen
and to the phase's open items. **Open for the business.**

### Purchase contract (phase 10) — two masters, one attachment, one field removed

Four changes to the **New purchase contract** screen.

**Packing size (kg per unit) is now a list from master data** — 50, 25, 10, 5, 1 — instead of
a typed number. **B/L consignee likewise** — CIM, Sayga, DFI, Others.

Both carry the same hazard, and it is the one that produced the trader defect the day before:
*a list that does not contain the value the record already holds*. **Retrieve PC No.** copies
the terms of an existing contract, and the captured contracts hold three values these masters
do not:

| Value | Where | Why it is not an error |
| --- | --- | --- |
| 175 kg | PC-2044 | cotton lint in **bales**, not bags |
| 0 | PC-2058-LV | **bulk** cargo has no packing size |
| "To order" | five contracts | a standard shipping term, not a party |

So neither list blanks such a value. Packing size keeps it as an extra option labelled *not in
the master*; consignee reads it as **Others** with the captured string kept as the name.
Nothing is invented and nothing is lost.

**"Others" is not a consignee.** Choosing it asks for the party to be named, because a bill of
lading cannot be made out to the word *others*. The legacy default "To order" therefore opens
as Others with that term as the name — which is exactly what it is.

**A gap this makes visible.** Bulk cargo has no packing size and the master offers none, while
the size is still required, so a bulk contract cannot be raised on this form. It never could —
PC-2058-LV was seeded, not entered — but a free-text box hid it and a list does not. The screen
says so when Packing type is Bulk. **Open for the business:** does the master need a "not
applicable" entry, or should bulk exempt the field?

**Actual PC is removed.** Worth knowing why it cost nothing: the field was captured on this
form and then **dropped on save** — `Contract` has no such property and `createContract` never
read it. Anyone who filled it in was typing into a field that discarded the value.

**One artwork design attachment** is added under Artwork, following the module's convention (a
file name; the prototype stores names, not files). It is saved onto the contract and shown on
the contract's own Artwork line and its tags/artwork card — an attachment nobody can see on the
record is an attachment nobody knows is missing. Whether it is the same artefact as the §6.5
tags/artwork specification is **[OPEN]**; no source says it is, so no link is asserted.

### Opportunity (phase 08) — the trader is read from the session

*"Remove the trader field in add new opportunity as the trader will be automatically captured
by the system (the trader/user who is currently login in COTS)."*

The Trader text box is gone from **New opportunity**; the signed-in user's display name is
shown read-only in its place.

This is the clean case of the pattern, and cleaner than the purchase contract's trader removed
the day before. Phase 08 has exactly one participant, and this screen's own hint has always
said so — *owner of Phase 08 — trader (commercial); no other participant is stated in either
source*. The person raising the opportunity **is** the trader, so the session is not a fallback
here, it is the source. There is nothing to inherit from and nothing to copy, because an
opportunity is where the chain starts.

**It also completes yesterday's change.** The trader captured here is what §6.2 activity 2
later carries onto the purchase contract, which as of yesterday no longer asks for one either.
The name is now entered **nowhere** and read everywhere, from a single point of capture — the
sign-in — instead of being typed at Phase 08 and typed again at Phase 10, with two chances to
disagree. That was the actual defect behind the screenshot that started this: the deal said
*Tomás Ferreira* and the contract form offered four other names.

Where the session carries no display name the save is refused with that stated as the reason.
It cannot happen from these screens; the check is there because the record still requires a
trader.

### Opportunity (phase 08) — the screen now saves

*"Add save function in the Add Opportunity screen."*

The screen had validated and previewed since v1.0 and written nothing, and said so on itself,
because the service layer had no create-opportunity operation. It has one now —
`api.createOpportunity` — which re-checks the same rules the screen applies, issues the next
`OPP-<year>-<nnn>` reference in the year, and hands back a record the screen navigates to.

**What a save writes, and what it does not.** The opportunity and nothing else:

- **no costing**, because §6.1 activity 6 makes the estimate a separate step taken against a
  saved opportunity;
- **no deal**, because §6.2 is a separate gate that cannot be passed without a locked snapshot
  — a test asserts that agreeing a deal on a freshly saved opportunity is refused;
- **no status**, because neither source defines a status model for an opportunity; the list
  derives a stage from which artefacts exist.

So a saved opportunity is *identified* and no more, which is what Phase 01 produces. A save
that quietly created an empty costing would let the deal gate be passed by an artefact nobody
took.

**Checking without saving is kept** as its own button rather than dropped to make room. It is
the only screen in the module that previews what a record would hold before writing it, and a
trader sizing up an opportunity has a use for that.

The buyer stays optional — the trader may be looking for an offer before a buyer is named —
but a named one must be a real, buyer-type counterparty. Seven store tests cover the rules and
the three deliberate omissions.

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
