# COTS — change log

## 2026-09-16 · mock-up v2.20 · and the four workflow documents re-issued

### Price Amount is the value of the whole agreement

Confirmed by the business on 16 September 2026. The instruction that added the field named it
*Price Amount (in local currency)* and stated no unit, and the mock-up carried the question on the
Procurement list rather than burying it. It is answered: the Procurement grid's **Total price
amount** is a contract value and the banner now says so instead of asking. The doc comments on
`PurchaseAgreement.priceAmount` and `purchaseOrderPriceTotals` record the confirmation and its
date. No calculation changed — a straight sum per currency was already the right one.

**1,145 tests passing, 1 skipped.** Typecheck at the 6-error baseline.

### The four workflow documents brought up to v2.19

Each is a new version file; the originals are untouched, as every version in this folder has been.

**COTS_Export_End_to_End_Workflow_v2.7.docx** — the field-level document, so it takes the most.
Amendment blocks at §6.2 (budget currency default, the Issued Payment card removed, the country
stamp), §6.3 (the fund's payment card read only, entry moved to the order, the prefill), §6.4 (the
five new agreement fields, with Price Amount confirmed as a contract value) and §6.24 (the order's
own commodity and supplier, the payment off the line, the header-driven fund list, the split view,
the eight list columns). Three questions this document has carried are marked **[CLOSED]** where
they were raised — the PO-versus-fund payment, the price on the agreement, and whether sourcing is
held per country — and nine are added. §14.1 gains three master-data sets: the delivery-location
register, two value lists, and rates for XAF and MZN. New §16.3 summarises the version.

**COTS_Export_Documentation_Workflow_Integrated_v2.4.docx** — the same changes at the resolution
this document works at, which is which capability answers which step. C08 now has one consumer for
the fund payment where it had two that could disagree; C07's payment slip moves to the order
screen; C03's exchange rate loses the budget as a consumer and keeps the fund; C10 supplies the
budget's currency default and, at a far larger scale than the v2.3 example, the operating country
across seven sourcing records. New *What changed in v2.4* section at §1.

**COTS_MMS_Process_Review_MeetingPack_16Sep2026.docx** — re-issued, because yesterday's pack said
the sourcing side had not moved since v2.6 and twelve releases have now landed on it. New *What has
changed since 15 September* section listing v2.14–v2.19 and what each moves in the pack. Six of the
ten rows of *What the workbook records as built* rewritten. Four open questions marked answered by
the build, two added (the order's season, the rate source for XAF and MZN). The country-scoping
decision moved from *requested* to *decided and built*, and the re-issue request now names v2.19.

**COTS_Export_Process_Review_MeetingPack_v2.1_16Sep2026.docx** — the light one. No status moves:
the six releases since v2.13 are all sourcing, and none touches a step of the execution diagram.
Re-checked at v2.19, with one row added to its change table saying exactly that, so the two packs
can be read as having been checked at the same version.

## 2026-09-15 · mock-up v2.19 — four revisions

### The funds no longer wait for an agreement

*"The funds should no longer [be] dependent [on] the selected purchase agreement. Funds will
automatically populate according to the selected commodity and supplier."*

The Add and Edit PO screens now carry **one fund list**, driven by the header, where they carried
one table per ticked agreement. It is populated before anything is ticked at all, which is closer
to how the money moves: a fund is raised for an agent and a commodity, and which agreements it
ends up covering is settled afterwards.

**The season stopped being a filter**, because the season came from the agreement and there is no
agreement in the join any more. Each fund's own season is a column instead — a fund raised for
another year is visible and labelled rather than quietly offered as though it were not. Everything
else is unchanged: only funds with no issued amount are offered, funds this order already pays
stay on the list, and ticking one fills in its issued amount from the value requested.

The "matches / different agent and commodity" chips are gone with the join. There is no longer an
agreement for a fund to differ from.

### The view screen separates what an order covers from what it paid

*"Separate the purchase agreement and funds when the PO is selected for viewing."*

One table was answering two questions, and the columns showed it — an agreement row whose every
column after the first belonged to a payment. Now:

**Purchase agreement list** — reference, commodity and supplier, agreed quantity, **price
amount**, flow status, with the price total per currency in the footer.

**Funds paid** — fund, agent and commodity, season, value requested, issued payment amount, USD
conversion, actual payment date, with the three totals in the footer. Every fund carrying the
order's number is here, including any the agreement attribution could not place, which used to
appear as an odd row at the bottom of the agreement table.

**The disagreement is still reported**, and now as a banner over the fund list rather than a note
inside a cell: where the order's own line and the funds matched to it hold different figures, both
are named. Neither is derived from the other, so neither is chosen.

### Price amount is on the agreement list wherever it appears

*"Add in the purchase agreement list add the column price amount for Add, View and Edit screen."*

The agreement tick list on Add and Edit carries it, and so does the view screen's list, so the
three read alike. An agreement with no price says *no price recorded* rather than showing a zero —
every agreement captured before today has none.

### The budget's Issued payment card is gone

*"In the Budget screen remove the Issued Payment card."*

It held the issued amount, its payment date, its currency and the read-only USD conversion. The
payment is recorded against the fund, from the purchase order, and has been since 14 September;
this card was the last place a second version of it could be typed.

**What was recorded is not removed.** The four fields are still on the budget record, and the form
still hydrates and writes them back untouched — bg-1 keeps its 4,200,000,000 SDG issued on
20 August 2026, and everything derived from it goes on reading it. A test saves the form with
nothing touched and reads the record back, because the real risk in removing a card is that the
save quietly starts writing blanks.

### Four tests that recorded the superseded behaviour

Each is replaced rather than relaxed, and each says what changed. The view screen's five-column
table is now two tables asserted by their own headers. The edit screen counted the same fund twice
— once under each of the order's two agreements — and now counts it once. The new-order case
asserted an empty fund list until an agreement was ticked, and now asserts a populated one before
anything is; its companion asserted the "differs from the agreement" labelling, which no longer
exists, and is replaced by a case proving that ticking an agreement leaves the fund list alone.
The budget's payment-date case is replaced by the two above.

### Verification

**1,145 tests passing, 1 skipped, 0 failing.** Typecheck at the 6-error baseline. No route change.

## 2026-09-15 · mock-up v2.18 — batch 4 of 4

### The Procurement grid says what an order asked for and what it paid

*"Modify the columns: PO NUMBER, PURCHASE AGREEMENTS, TOTAL PRICE AMOUNT (total price amount
under purchase agreement linked to that PO), Funds PAID, Total Fund value, Total Amount Paid,
Latest Payment, Created."*

All eight are there, in that order. Three are new or changed.

**Total price amount** adds the `Price Amount` recorded on each agreement beneath the order, per
currency — the field added in batch 2 this morning. An agreement carrying no price contributes
nothing and is counted, because a missing price is not a zero: every agreement captured before
today has none, and an order of them must not read as an order worth 0 SDG.

**Total fund value** is what the funds on the order *requested*, beside **Total amount paid**,
which is what was *issued* against them. The captured data is the argument for showing both:
fund `431_205511220` requested 750,000 SDG and was issued 720,000, and neither figure can stand
for the other.

**Latest payment now reads the funds**, as the totals beside it have since v2.17. A payment
belongs to a fund, so the latest payment on an order is the latest payment date among the funds
carrying its number. Where no fund names the order, the order's own lines still hold dates and
those are shown, labelled *from the order's own line*, rather than the column reading "no
payment" for an order that plainly paid something.

**Total issued in USD** is not one of the eight, so it became the one column that can be switched
off in the column chooser. It is kept rather than deleted: it is the only figure on this screen
that can be added across currencies. **Created** is no longer optional, because the instruction
names it.

### One question this grid cannot answer

The instruction that added `Price Amount` calls it *Price Amount (in local currency)* and states
no unit. Whether it is a price **per tonne** or the **whole agreement's value** decides whether
the new column is a contract value or a meaningless sum of unit prices, and the two readings are
nowhere near each other. The column adds what is recorded, which is what was asked for, and the
screen carries a banner saying which reading it took and that the question is open — better on
the screen than buried in a change log. **Worth settling before anyone acts on the number.**

### Verification

**1,145 tests passing, 1 skipped, 0 failing** — 6 new: five on the totals themselves (price
summed per currency, currencies never mixed, requested against issued, a requested value counted
where nothing was issued, the latest payment read from the funds) and one that renders the tab
and checks all eight headers are present. Typecheck at the 6-error baseline. No route change.

### What this change set covered

Batch 1 — Sourcing Intake scoped to the country. Batch 2 — the budget's local-currency default
and the five new purchase agreement fields. Batch 3 — commodity and supplier on the PO screens,
with the agreement and fund lists following them. Batch 4 — these columns.

## 2026-09-15 · mock-up v2.18 — batch 3 of 4

### The purchase order says what it is for

*"Aside from existing PO Number add the fields commodities (dropdown), supplier dropdown list."*

The Add and Edit PO screens gained both, beside the PO number, and the order stores them. They
are the order's scope, and their job is the next two sentences of the instruction.

**The drop-downs are built from the agreements actually held**, not from the commodity and
counterparty masters. Their only purpose is to narrow the list below, so an option behind which
there is no agreement narrows it to nothing and tells the user only that they chose badly. They
read the scoped agreement list, so a Sudan session offers Sudan's commodities and Sudan's
suppliers.

### The agreement list and the fund list follow them

*"Modify the select purchase agreement list it will now populate according to commodities and
supplier selected. The funds will also populate according to commodities and supplier for that
season which the fund is not yet issued an amount."*

**The agreement tick list is filtered**, and says how many rows it held back rather than just
looking shorter. If the pair matches nothing, the screen names the commodity and the supplier it
found nothing for instead of showing an empty table.

**The funds are filtered twice over**: by the header, and — this is the new rule — to those that
have not yet had an amount issued. A fund carrying an issued amount has been paid from somewhere,
and offering it again on another order is how one payment gets recorded twice. That is the
question `COTS_MMS_Processes_Steps_v2.6.xlsx` left open at row 6.5, now closed from the other
side.

**Two things are kept whatever the filters say.** A fund already stamped with this order's PO
number — otherwise an order that has paid three funds would open on an empty list and its figures
could never be corrected. And a fund the team has already ticked in this sitting — otherwise
typing an amount into a fund makes it vanish under the cursor.

**A ticked agreement is never dropped by the header.** The header is often answered after a row
is ticked; a filter that silently un-ticked what it no longer matched would take an agreement off
the order without saying so. The row stays, flagged *outside the header's commodity or supplier*,
and the person who ticked it can untick it.

### The issued amount arrives filled in

*"The Issued Payment Amount field will inherit automatically the value of the value requested
once selected and can be modified as well."*

Ticking a fund copies its **value requested** into the issued payment amount, and the field stays
a plain input — the whole of *"and can be modified as well"* is that nothing locks it. It fills
an **empty** field only: a fund that already carries an issued amount, or one that has been typed
into, keeps what it has. A default that overwrites an answer is anti-pattern A6, and here it
would silently restate a short payment as a full one.

### Nothing is refused by any of it

The service layer accepts an order whose agreements disagree with its own header, because no
source says the agreements beneath one order must share a commodity or a supplier — and a
captured order exists whose two agreements share neither. The two fields decide what is
*offered*; what is *saved* is the tick list. That is decision D-10 applied for the fourth time
this week.

### Two tests that recorded the old behaviour

Both concern funds that are now filtered out, and neither is quietly flipped — each records what
changed and why. The new-order case asserted that all four funds of the 2025-2026 season are
offered against agreement `pa-1`; it now asserts two, and reads the tick boxes rather than the
prose, because the explanatory banner still names the exact-match example by reference. The edit
case asserted that PO 1123's screen lists fund `431_205511220`; that fund carries an issued
amount made under purchase order 431, so it is no longer offered there — while `1123_204620341`,
this order's own, still is.

### Verification

**1,139 tests passing, 1 skipped, 0 failing** — 7 new. Typecheck at the 6-error baseline. No
route change.

### Still to come in this change set

Batch 4 — the Procurement grid columns: PO Number, Purchase Agreements, Total Price Amount, Funds
Paid, Total Fund Value, Total Amount Paid, Latest Payment, Created.

## 2026-09-15 · mock-up v2.18 — batch 2 of 4

### Money is counted in the money of the country counting it

*"The default value of Currency field is the local currency of the Country, example: Sudan is
SDG."*

Every country profile now names its own currency — Sudan SDG, Ethiopia ETB, Chad XAF, Tanzania
TZS, Mozambique MZN — and `CurrencyCode` gained XAF and MZN to hold the last two. The budget's
Add screen opens each new line in the session unit's currency instead of USD, and the Edit
screen's issued-amount line does the same.

It is a **default, not a lock**. The dropdown still offers every currency, because a Sudanese
budget line quoted in dollars is a real thing and the field existed to allow it. What changes is
which way the field points when nobody touches it, and until today it pointed at a currency no
Sudanese budget in the captured data was ever held in — every seeded amount is SDG, and every
new line still had to be switched by hand.

Neither XAF nor MZN has an FX rate in the table yet. A line in one converts to nothing, and the
screen says so rather than showing a silent zero; the rates are a master-data question, recorded
as `[OPEN]`.

### Five fields on the purchase agreement

*"Price Amount (in local currency), Sourcing Location (free text), Delivery terms dropdown,
Delivery Location dropdown (master data, areas dependent on Country), Quality terms dropdown."*

**Price Amount closes a question this project has been carrying.** Two of the six columns of the
CIM weekly purchase report — Agreed Purchases and Value Received — need a price on the
agreement, and there was none: the agent balance has been reading it back off that agreement's
own receipts and reporting how many agreements had nothing to read. That was the open question
against row 1.10 of `COTS_MMS_Processes_Steps_v2.6.xlsx`. An agreement that now carries its own
price is read from directly; the reconstruction stays for the captured ones, which all predate
the field.

**Delivery terms decide whether a delivery location is asked for.** *Delivered at place* names
where, and the service refuses the agreement without it. *Supplier location* is collection at the
agent's own place, so it names none, and the form clears the location when the terms change. The
alternative — an optional location on both — is how an agreement ends up saying it is collected
from the supplier *and* delivered to Port Sudan, which are not both true.

**A zero price is refused**, for the reason above: on the agent account a zero is
indistinguishable from "no price recorded", which is the defect the reconstruction exists to work
around. A blank price is fine and means the old behaviour.

**Delivery locations are their own register**, 22 areas across all five countries, filtered to
the session's unit. Deliberately *not* the receiving-location master: a receiving location is a
facility or store the crop is booked into, and a delivery location is a town or port an agreement
names. Sharing one list would have meant every agreement offering a store it will never deliver
to, and every new delivery town appearing as somewhere receipts can be booked. The location is
held as its **label**, like the receiving plan's, so a location renamed in master data does not
rewrite what a struck agreement said it was.

**Quality terms** hold one of the three named values and gate nothing — as with the agreement
type, the instruction names the field and states no effect, so nothing downstream reads it.
Recording which of the three applies is the whole of what was asked for.

### Verification

**1,132 tests passing, 1 skipped, 0 failing** — 9 new. Typecheck at the 6-error baseline
(`import.meta.env`, `import.meta.glob`, `?raw`, the `inert` prop in `Shell.tsx`). No route change.

### Still to come in this change set

Batch 3 — commodity and supplier on the New PO screen, with the agreement and fund lists
filtered by them. Batch 4 — the Procurement grid columns.

## 2026-09-15 · mock-up v2.18 — batch 1 of 4

### Sourcing Intake now belongs to a country

*"The sourcing intake data must be dependent or inherited to each Country ex: Sudan (all related
data of Sudan only)."*

This is the finding the MMS process review raised on 15 September and the reason it was worth
raising: the header's country selector has scoped every Export list since 9 September, and
scoped **no** sourcing list. A Sudan session read every country's seasonal plans, budgets, funds,
purchase agreements, purchase orders, intake receipts and agent balances — and nothing on screen
said so. The lists simply looked longer than they should.

**Seven records gained a country**, and seven accessors now read it: `SeasonalPurchasePlan`,
`Budget`, `PurchaseAgreement`, `PurchaseOrder`, `IntakeReceipt`, `Fund`, `AgentBalance`. The
receiving-location plan already had one and was already scoped.

**Stamped from the session, never asked for.** A form has no country field; `createBudget`,
`createFund`, `createPurchaseAgreement` and the rest read it from the session the way the
purchase contract's origin and the shipment's country are read. This is what *inherited* means
in the instruction.

**A record with no country is shown everywhere.** The field is optional and `scoped` treats an
absent country as belonging to every unit — the same rule the Export accessors have always
used. When the alternative is data silently disappearing, the permissive reading is the safer
one, and the mock-up's standalone build and its tests run with no scope set at all.

**The captured data is seeded `SD`**, because all of it is Sudanese: Gabani, Abakar, Mahaseelna
and Sahel Seeds are Sudanese agents, every amount is in SDG, and every receiving location on a
plan is a Sudanese facility or store. 31 seeded rows stamped.

### A test that recorded the opposite rule

`routes.test.tsx` carried a case named *"leaves reference data and the sourcing records
unscoped, and says which they are"*, which asserted the old behaviour as deliberate — *"the
sourcing and procurement records carry no country at all, so a country filter could only empty
those screens"*. That was true when it was written and is not any more. It is replaced by two
cases: Sudan still sees all seven seeded collections, Mozambique now sees none of them, and the
reference data that genuinely belongs to no operating unit — vessel calls, freight rates, the
production plan — is still returned everywhere. A second case proves a record created under an
Ethiopian session is stamped `ET` and appears only there.

### Verification

**1,123 tests passing, 1 skipped, 0 failing** — 1 new. `npm run typecheck` clean apart from the
long-standing `inert` prop warning in `Shell.tsx`. No route change.

### Still to come in this change set

Batch 2 — the budget's currency default and the five new purchase agreement fields. Batch 3 —
commodity and supplier on the New PO screen. Batch 4 — the Procurement grid columns.

## 2026-09-15 · mock-up v2.17

### The purchase order shows what its funds paid

*"Update the Purchase Agreement list, add the fund linked to this PO and the payment amount,
should be based on the payment amount in the fund. In the Procurement tab, on the gridview list,
add the selected funds related to the purchase agreement and total payment should be based on
the payment issued per fund."*

**The view screen's agreement list gains a Fund paid column**, between the agreement and the
money. The payment amount is now the issued amount on those funds, the USD conversion is read
at each fund's own payment date, and the date column shows the fund's. A fund carrying the
order's number that no agreement row claims gets a row of its own — *paid on this order, matched
to no agreement above* — so nothing in the total is invisible.

**The Procurement list gains a Funds paid column**, and both totals now read the funds:
*Total issued in local currency* and *Total issued in USD*.

**A fund is on an order when it carries the order's number.** That is the link the payment flow
writes, and the same one the view screen's *elsewhere in COTS* panel has always used.
Attribution to a row is by season, exact three-way matches claiming their row first, so a fund is
counted once and under the agreement it most plausibly paid.

**A fund with no issued amount is counted as unrecorded, never as zero.** The two are different
statements and the footer says which.

### The captured data holds two versions of this payment, and they disagree

Switching the totals to the funds makes it visible, so the screens report it rather than quietly
picking a number:

| Order · agreement | The line says | The fund says |
| --- | --- | --- |
| 1123 · `1123_220822514` | 1,000,000 SDG on 18 Jun | `1123_204620341`, issued 1,000,000 on 18 Jun — **agree** |
| 1123 · `431_223244094` | 720,000 SDG on 4 Jul | the fund carrying that figure is stamped **PO 431**, not 1123 |
| 1204 · `1204_226610033` | 512,000 **USD** on 14 Aug | `1204_207740012` — 420,000 **SDG**, no issued amount at all |

So order 1123 now totals 1,000,000 SDG where its lines say 1,720,000, and order 1204 totals
nothing where its line says 512,000 USD. **Neither figure is wrong and neither is derived from
the other** — that is the point. Where a row's two records differ, the row carries *"the line
says …"* beneath the fund figure, and the list carries the same note against the total. The
comparison is only made where it means something: one currency on each side, and the same one.

This is the open half of row 6.5 of `COTS_MMS_Processes_Steps_v2.6.xlsx`, now visible on the
screen instead of in a spreadsheet's remarks column. The decision it needs is whether the line's
copy is corrected, derived, or dropped.

### Verification

**1,122 tests passing, 1 skipped, 0 failing** — 6 new, and they pin the disagreement rather than
a preference: 1123 reading 1,000,000 against its lines' 1,720,000, 1204 reading nothing against
512,000 USD, a row that genuinely agrees not being flagged, each fund claimed exactly once, and a
payment made through the new flow totalling end to end. `npm run typecheck` clean apart from the
long-standing `inert` prop warning in `Shell.tsx`. No route change.

## 2026-09-15 · mock-up v2.16

### The procurement team selects the fund, rather than being handed a match

*"Once the purchase agreement is selected, the fund related to this purchase agreement will
populate at the below and the procurement team will select the fund that they will add payment
and issued date it should be editable. Currently it is not happening."*

Two things were wrong, and only the second was a defect.

**The data was not a match, and the screen was right to say so.** `PA-2026-0006` is sorghum for
Mohamed Hamid Abakar; fund `fd-7` is sorghum for Gabani Agro Trading. Same commodity, same
season, different agent — so the three-way match built yesterday found nothing, correctly.

**The defect was that there was nothing to select.** *Select* is the word the instruction uses,
and v2.15 offered no selection: an exact match appeared with its fields open, and anything short
of one produced an empty list and a payment that could not be recorded anywhere. A pair of
records that differ on one axis is not an error — it is the ordinary case — and the screen left
the team with no way to say so.

**The season is now the boundary and the match is the ordering.** Every fund in the agreement's
season is offered. Exact matches lead, labelled **matches**; the rest carry what differs —
*different agent*, *different commodity*, or both. Nothing is refused by the difference: no
source says a payment may only go to an exactly matching fund, so the screen states the
difference and the person decides. Decision D-10.

**Selecting is what opens the fields.** A fund is ticked to pay from it, and only then do the
issued payment amount, actual payment date and payment slip become editable on it. An unselected
fund shows what it already holds, read-only. Unticking closes the fields again.

**An order's own funds arrive selected.** A fund already carrying this order's number is one this
order pays, so opening an existing order shows what it paid rather than an empty list. Nothing
else is selected — the selection is the team's.

### Why the boundary is the season and not something wider

The instruction names it: *"list down the fund related to this purchase agreement **and
season**"*. Offering every fund regardless would make the exact match meaningless on a list of
any size; offering only exact matches is what just failed. The season is the line the business
drew, and the labels carry the judgement inside it.

### Verification

**1,116 tests passing, 1 skipped, 0 failing** — 6 new on top of yesterday's, covering that the
season's funds are all offered with matches first, that the difference is named precisely on one
axis or two, that selecting opens exactly one set of fields and unticking closes them, and that
a differing fund is payable. `npm run typecheck` clean apart from the long-standing `inert` prop
warning in `Shell.tsx`. No route change, and the Procurement list, view screen and USD totals are
untouched.

## 2026-09-15 · mock-up v2.15

### The fund is paid from the purchase order

*"Once the purchase agreement is check, list down the fund related to this purchase agreement
and season. From this screen we could issue the issued payment, actual payment date, payment
slip — the one we made readonly in the fund screen."*

The other half of v2.14. Ticking a purchase agreement on the New PO screen now lists the funds
that agreement draws on, and the three fields the fund's own card gave up are entered here.

**The join is agent + commodity + season**, and it is the only relationship the two records
carry: a fund names an agent, a commodity and a seasonality; an agreement names a supplier, a
commodity and a seasonality, and the fund's agent and the agreement's supplier are the same
counterparty under two column names.

**The captured data is what says the join is right.** Run over the seed it reproduces MMP's own
grouping exactly, because MMP built both references from the same purchase order:

| Purchase agreement | Fund |
| --- | --- |
| `1123_220822514` | `1123_204620341` |
| `431_223244094` | `431_205511220` |
| `1204_226610033` | `1204_207740012`, and `FND-2026-0005` |

Nothing in the join reads a reference — if it did it would be matching a naming convention
rather than a relationship — but that the two agree on every captured row is the evidence.

**Neither zero nor two is an error.** The gum hashab agreement has no fund and says so in place
of a table; the 2024-2025 white sesame agreement has two, both captured under purchase order
`45643123` — the duplicate this screen's own banner has always warned about.

**On both screens.** An order is usually raised before the payment is made, so the Edit screen
is where most payments will be entered; but a payment made the day the order is raised should
not have to wait for a second visit.

**Saving stamps the PO number onto each fund it pays**, which is what fills in the read-only PO
number the fund screen has shown since yesterday. A fund learns its purchase order by being paid
from one — the relationship MMP's reference convention implied and never enforced.

### The purchase order line no longer collects a payment

The Edit screen's *Payment against each agreement* section is gone. `COTS_MMS_Processes_Steps_v2.6.xlsx`
left the question open at row 6.5 — *"whether the payment recorded on the order is the same
payment the fund records, and if so which of the two is the record"* — and it is one payment. It
is recorded once, against the fund.

**The stored line figures are untouched.** `PurchaseOrderLine.paymentAmount` and
`actualPaymentDate` stay on the record and are written straight back on every save, so the
procurement list, the view screen and the USD totals go on reading what the captured orders
carry. What has gone is the input, not the data — the same move the fund card made, in the
opposite direction.

### Rules move with the fields

Two checks came across from the fund screen rather than being invented here: the issued amount
must be above zero, and a payment date must have an exchange rate behind it. The second is
`checkFund` itself, which the new operation runs — so it did not move at all, it simply now
runs from a different caller. The USD conversion beside each fund is read, never typed.

**All or none.** `api.recordFundPayments` checks every entry before writing any, so a batch
cannot half-apply and leave one fund paid and the next refused. The order is saved first,
because a new order has no PO number until it is — and if the payments are then refused, the
message says the order stands and nothing was recorded against any fund, rather than implying
the whole save came back.

**A blank clears.** An entry that omits a value writes nothing deliberately: correcting a
payment recorded in error is only possible here now, and the PO number stays, because the fund
still belongs to that order.

### Fixed — two shipments raised in the same millisecond took the same id

`createShipment` built its id as `sh-new-${Date.now()}`. Two shipments created inside one
millisecond therefore shared an id, and everything that resolves a shipment by id found the
first of them: `pushAudit` wrote both records' trail onto one, and `getShipment` returned one
for both. Found by a full-suite run — two `createShipment` calls in a row with latency at zero —
and a user clicking Save twice is the same race at human speed. The id now carries a counter,
which cannot collide with itself.

### Verification

**1,110 tests passing, 1 skipped, 0 failing** — 10 new, and the suite run three times over to
confirm the id fix removed the order-dependence rather than hiding it. `npm run typecheck` clean
apart from the long-standing `inert` prop warning in `Shell.tsx`. No route change.

### Open

The fund's payment and the purchase order line's payment are now one figure with one input, but
two fields still exist on two records. Whether the line's copy should be removed, or derived
from the funds the order pays, is the remaining half of row 6.5.

## 2026-09-15 · mock-up v2.14

### The fund's Payment card is read only

*"Modify the screen /sourcing/funds/fd-7/edit — the Payment card should be read only. The fund
payment will be done in the screen of Procurement tab. Do not modify the procurement tab yet."*

Four fields move out of the fund's hands: **PO number**, **Issued payment amount**, **Actual
payment date** and **Payment slip**. They are still on the card, because the fund is where a
person looks for the payment and the four derived rows beneath them — the exchange rate, the
value in USD, the variance against the value requested and the delay against the required date —
all read from them. But none of them can be typed here any more.

**This settles a question the workbook had already raised.** `COTS_MMS_Processes_Steps_v2.6.xlsx`
left row 6.5 open with *"whether the payment recorded on the order is the same payment the fund
records, and if so which of the two is the record"*. It is one payment, and **the order is the
record**. Until today it could be written from either screen, with nothing reconciling the two.

**Read only means the screen cannot write it, not that the inputs are disabled.** The four
values are held in no form state at all — they are read straight off the record — and they are
not in the `updateFund` call. Disabling the inputs would have left this screen still able to
send them, which is the difference between a field a user cannot type in and a field the screen
cannot write. Because `updateFund` takes a partial and assigns only the keys it is given,
leaving them out also means this screen cannot *blank* them, which a full-object save would have
done the moment someone edited the note.

**Two validations went with the inputs.** The issued amount must be a number above zero, and the
actual payment date must have an exchange rate behind it. Neither can be typed here now, so a
message on this screen would be telling the user to fix something they cannot reach — the
missing-rate case is stated on the read-only Exchange rate row instead. Both rules still belong
with the fields, which means they belong on the Procurement screen when it takes the payment.

**A banner says where the payment lives**, and links to the purchase order when one has been
issued, so the card is a signpost rather than a dead end.

### Not touched, on instruction

`api.updateFund` still accepts all four fields — the Procurement screen will need it — and the
Procurement tab itself is unchanged. The payment is therefore currently writable from the
purchase-order edit screen only where that screen already reaches these fields; wiring the fund's
payment into it is the next step and was explicitly deferred.

### Verification

**1,100 tests passing, 1 skipped, 0 failing** — 3 new, covering that the card renders as text
rather than inputs, that the banner and its link appear, and that saving the rest of the fund
leaves the payment untouched. `npm run typecheck` clean apart from the long-standing `inert`
prop warning in `Shell.tsx`. No route change.

### Open

The fund's payment and the purchase order's payment are still two records of one event. This
change names which is authoritative; it does not yet make the fund's copy derive from the
order's. Whether it should — or whether the fund should stop holding the payment at all — is a
question for the business.

## 2026-09-14 · mock-up v2.13

*"Is the OBL Process.pdf process flow available or found in the mockup? … advice what is
missing and need to add."*

The flow was there and about a third of it was recordable. `OBL Process.pdf` — *"Documents
Process (OBL) – Export – Sudan"*, three swimlanes and thirteen steps — was audited step by
step against the mock-up. Almost every field it needs was already on the record and rendered
on a screen; almost none of them could be written. The two ends of the chain are now closed.

### The Final SI is a document, and can be written

It was the only document in the OBL flow with no place in the document workspace. The
`ShippingInstruction` record held all fourteen of its fields, the Booking & SI tab rendered
every one, **and no operation anywhere wrote any of them** — the record could only show what
the seed put there. The banner beside it about *"eleven recovered milestone fields"* was
describing its own neighbour.

`final_si` is now a `ShipmentDocumentKey`, so the Final SI has the state machine, the SLA, the
attachment and the comment thread every other document in the flow already had. It is
**required wherever a bill of lading is**, derived rather than listed per shipment because the
dependency runs one way: `OBL Process.pdf` sends the line the SI *in order to* draw the B/L, so
a shipment needing a B/L needed an SI first, and a B/L with no SI is not a state the flow can
produce.

**One form, two states.** An SI with no issue date is a draft the Dubai team is still settling
with the customer — *"Sending to Dubai team to prepare Final SI after checking with the
customer"*. Filling the date in **is** the act of issuing it, so `shipping_instruction_issued`
completes from the act rather than being ticked separately — the rule `setShipmentBankDetails`
already follows, and the first time any milestone in the mock-up has been completable by a
user. Issuing also writes the document row's reference, so the tab and the workspace cannot
disagree about which SI the line was sent.

**Amending an issued SI is allowed and says so.** The flow has an amendment loop on the B/L
the SI produces; an SI that could never be corrected would force the correction off-system.
The screen warns that the corrected SI still has to be re-sent to the line — recording it here
tells the line nothing.

**Three refusals, all of them the record's own shape.** A consignee is required because a bill
of lading cannot be drawn without one (*"To order"* is the answer where the buyer is not yet
named); B/L originals and copies must be whole numbers, zero or more; and an SI cannot be
issued without its number, which is what the line quotes back. The dangerous-goods block —
flash point, UN and IMCO numbers, temperature and ventilation — is deliberately **not** on the
form: no source says who fills it in or when, and a form that asks for a flash point without
knowing whether the cargo is hazardous invites a wrong answer.

### The OBL now has a custody chain instead of a boolean

`src/integration/exportProcess.ts` has carried the workflow's own AS-IS statuses since v1.0 —
*"Original bill of lading (OBL): Not issued → Issued → Sent to bank → Delivered"* and *"Telex
release: Requested → Released"*. The mock-up collapsed the first into the generic six-state
`DocumentState` on the `obl` document row and the second into `BankSubmittal.telexRelease`, a
seeded boolean with no control. Four steps of the flow had nowhere to go at all: the line
delivering the OBL to a Sudan commercial bank, the team collecting it, the retention branch
when a telex release is expected, and the courier to Dubai.

`Shipment.oblCustody` now holds both lifecycles, and every move on the post-shipment screen is
a guarded transition through the service layer:

| | |
| --- | --- |
| **Custody** | Not issued → Issued → Delivered to the bank → Collected from the bank → **Couriered to Dubai** *or* **Retained at origin** |
| **Telex release** | Not expected ⇄ Expected → Requested → Released |

**`Delivered` is split in two**, because the flow draws two hand-offs where the status list has
one word: the line delivers to the bank, and *then* the team collects. They are days apart,
done by different parties, and the second is the step the audit found had no field whatsoever.

**The payment gate is the flow's own.** The diagram puts a decision before issuance —
*"Invoices Paid or agreement with line to print OBL before payment"* — so the move to Issued
requires the freight and local charge invoices to be settled, **or** the agreement with the
line to be recorded. This is the rare guard decision D-10 permits, because the source states
it in as many words. The refusal names which invoice is outstanding, so the way past it is the
agreement rather than a workaround, and an OBL printed early is marked as such on the record.

**The telex answer settles the fork.** Retaining the OBL is refused until an expectation is
recorded; couriering is refused once one is. They are the two answers to one question, and the
flow draws them that way. A release cannot be requested before the OBL has been collected —
*"return to line for T/R once requested"*: the return **is** the request, so there is nothing
to return until the team has it. And the expectation cannot be withdrawn once the OBL is
already being held for it.

**Both ends are terminal.** A retained OBL that is couriered after all would be a third edge,
and the diagram does not draw one.

### Fixed — one number was doing two jobs

`BankSubmittal.awb` is the courier AWB for the **documents sent to the bank**. The
post-shipment screen relabelled it *"Courier AWB"* in the OBL section, which read as though
one number covered the OBL's own leg to Dubai as well; `src/integration/documentChain.ts` had
already flagged the conflation. The OBL's courier AWB is now `OblCustody.courierAwb`, and both
grids say which leg they mean. On PC-2058-LV.1 the two happen to carry the same number, which
is exactly how the conflation went unnoticed.

### Seed data

PC-2058-LV.1 is the one captured shipment whose OBL completed its journey, and its custody
record is reconstructed from the booking columns the legacy screen could never write: original
B/L 11 August, delivered to the bank 13 August, dispatched the same day under AWB-8841-2201.
Every other shipment starts Not issued with no answer on the telex — which makes PC-2041.1,
whose freight invoice is still awaited, the shipment to walk the whole flow on, payment gate
included.

The Final SI document rows on PC-2041.1 and PC-2058-LV.1 are seeded Confirmed with the SI
numbers those records already carried, so the row and the `shippingInstruction` record agree.

### Verification

**1,097 tests passing, 1 skipped, 0 failing** — 15 new. `npm run typecheck` clean apart from
the long-standing `inert` prop warning in `Shell.tsx`. No route change: neither `App.tsx` was
touched.

### Still missing from `OBL Process.pdf`, and deliberately so for now

1. **Is the shipping line on an online website?** (step 2). Nothing on the counterparty,
   booking or freight offer carries a portal flag, so the flow's first branch cannot be
   answered. A one-field change to the counterparty master when the business confirms it.
2. **Charge recording** (step 8). The `Charge` model is complete and has no writer, so the
   invoices the new payment gate reads can only arrive by seed. This is the next thing to
   build — the gate works, but today it can only be satisfied by the agreement branch.
3. **"Check invoices and send to Finance to pay"** (step 9) has no field of any kind.
4. **Every other milestone is still uncompletable.** `setShippingInstruction` is the first
   operation to complete one from a user action; `dbl_received`, `obl_issued`,
   `charges_settled` and `obl_dispatched` still move only by seed. This is larger than the OBL
   flow and probably the single biggest gap left in execution.

## 2026-09-14 · mock-up v2.12

### The shipment's export contract — a link that nothing wrote

*"It says here in this screen No Export contract link to this shipment, but in the second
screen shot here the same purchase contract I have created the Export Contract. Is there a
missing link process here?"*

Yes. `Shipment.exportContractId` was **read** by three places — the shipment's Pre-clearance
tab, the export contract workspace's own *linked shipments* list, and the validity check
(rule R13) — and **written** by nothing but the seed. `createShipment` set it to `undefined`
and no operation ever filled it, so every shipment raised inside the mock-up reported *"No
export contract linked to this shipment"* however many contracts had been issued against its
purchase contract, and the export contract showed no shipments in return. Ten seeded
shipments carried the field; nothing made an eleventh.

The link went implicit when execution planning was removed on 8 September — the same seam
that moved the request number from `<planning no>-R<n>` to `<contract no>-R<n>` — and was
never re-made.

**Inherited on create, the way the container type is.** `createShipment` now resolves the
link from the export contracts on the chosen purchase contract. A sole candidate is the
answer whatever its stage: a shipment can be raised while the request is still with the
ministry, and the tab shows the status chip, so linking a request that is not yet issued
hides nothing. Where more than one exists — a re-raised request, or a second contract on a
large-volume PC — the answer is taken only when exactly one of them is *live* (issued or
expiring soon); otherwise nothing is inferred, because a guess presented as a record is worse
than an empty field. The New shipment screen states which of the three it is before you save.

**Editable afterwards, from the tab that reported the gap.** The Pre-clearance tab's empty
state now carries **Link export contract** when candidates exist and a link to raise one when
they do not; a linked tab carries **Change export contract**. Both open one dialog that also
offers *Not linked*, so a link made in error is undone rather than edited around. Every link
and unlink is written to the shipment's audit trail.

**Two warnings, no refusals.** The tab reports the quantity the linked shipments come to
against what the ministry issued, and the existing expiry check reports a last shipping date
past the contract's validity. Neither refuses the link. Decision D-10 — a guard exists only
where a source states a rule — and rule R6 states the opposite of a ceiling: *"one EX contract
may be consumed across many PCs"*. The captured data settles it: **EC-2026-004118 was issued
for 620 MT and PC-2041.1 (600 MT, sailed) and PC-2041.3 (60 MT, stuffed) both draw on it —
660 MT against 620.** A guard here would have refused history.

**What is refused** is only what would make the record untrue: an export contract raised
against a different purchase contract, and a shipment or contract that is not there.

**No route change.** Neither `App.tsx` was touched.

### Fixed — the test suite had been red since 8 September

The removals of 8 and 9 September updated the source and left the tests behind. The suite was
failing **33 tests across 6 files** and the typecheck reported **69 errors**, every one of
them residue rather than new work. This was found by re-staging the folder into a working
copy and running it — the v2.11 note that *"the seven new tests follow the suite's conventions
and have not been executed"* was the warning.

| File | What was stale |
| --- | --- |
| `store.test.ts`, `store-v2.test.ts`, `store-v25.test.ts`, `calc.test.ts` | `api.listExecutionPlans()` and `executionPlanId` on `createShipment` — 29 failures |
| `route-tables.test.ts` | still guarded `/contracts/:id/planning/new`, a route deleted on 8 September |
| `milestones.test.ts` | expected 10 shipment / 9 contract stepper steps; the real sets are **9** and **8** (`execution_planned` is gone) |
| `purchase-contract.test.ts` | expected 4 `reviewFeedback` rows; Processing was removed from cross-function review, so it is **3** (`quality`, `finance`, `dubai_execution`) |

Tests for behaviour that no longer exists were **deleted**, not rewritten into assertions that
are trivially true. Where a count changed, the list beside it was corrected too rather than
the number flipped on its own. One further piece of staleness surfaced on the way:
`store-v2.test.ts` was still calling `api.setTagSpecification(contractId, wholeSpec)`, replaced
on 9 September by `api.recordTagSpecificationAction`, with a changed state vocabulary — that
block was rewritten against the real transition table.

**Orphan removed.** `vendor/export/pages/execution-plan-form.tsx` (26 KB) was referenced by
neither route table and contributed 6 of the typecheck errors — dead code left by the v2.8
removal.

### Verification

**1,082 tests passing, 1 skipped, 0 failing.** `npm run typecheck` clean apart from the
long-standing `inert` prop warning in `Shell.tsx` (and, under the export-only tsconfig, the
`import.meta` and `?raw` resolutions that only Vite supplies).

### Open for the business

1. **The seeded reviewer sets disagree with the created one.** `createContract` seeds
   `quality`, `finance`, `dubai_execution`; `seed.ts` gives ct-2 and others a
   `partner_execution` row instead. `recordReviewFeedback` therefore accepts different roles
   depending on whether the contract was seeded or made in the mock-up. If three fixed
   reviewers is the rule, the seeds have drifted.
2. **`cropYearOf` now has no caller.** Its only production consumer was the orphan execution
   plan form. It is still tested and still correct; it is simply unused.
3. **Should the mock-up hold a shipment above the issued quantity?** It does, and warns —
   see above. The captured data does the same, so the answer is probably yes, but it has not
   been put to the business.

## 2026-09-13 · mock-up v2.11

### A request can be raised from the contract's own Export contract tab

*"In this screen tab Export Contract screen shot, add a button new request for Export contract
related to the Purchase Contract, in the new Export Contract screen form, it will inherit the
Purchase Contract no."*

**New request** now sits at the top right of *Export contracts against this contract*, and in the
tab's empty state so an empty tab is not a dead end. It opens the request screen with the contract
already settled — `/pre-clearance/new?contract=<id>` — which also settles the three values that
derive from it: the request number preview (`PC-2041-R2`, counted from the requests already on the
contract), the quantity still unrequested (1,300 contracted less 630 = **670 MT**), and Large
volume.

**The inherited contract is locked, not merely prefilled.** The tab is scoped to one contract, so a
request raised from it belongs to that contract. A live drop-down would let someone file a request
that never appears on the tab they started from, and nothing on screen would show the mistake. This
is the call the new purchase contract already makes with its origin — read from the session and
stated rather than asked for. The drop-down is **not removed**: it is still what the screen shows
on the path that has existed since 6 September, Pre-clearance → New request with no contract in the
address, and a test holds both halves.

**No button in Tanzania or Mozambique.** Neither uses an export contract, the empty state already
says so, and `requestExportContract` refuses one — a button leading to a screen that refuses is
worse than no button, which is the rule the issuance action already follows. **The button does show
when a request already exists**, because a second request against one contract is allowed and
numbers itself `-R2`.

**A stale link is not a locked screen.** An id in the address that resolves to nothing falls back to
the drop-down and says why. That is reachable with a *real* id and not only a bogus one: the Export
lists have been country-scoped since 9 September, so a link to a Sudan contract opened in an
Ethiopia session names a contract the session cannot see.

**No route change** — `/pre-clearance/new` was already in both route tables, so neither `App.tsx`
was touched.

### Fixed — a placeholder that had been wrong for five days

The **Large volume** field on the request screen read *"– select an execution plan"*. Execution
planning was removed on 8 September and the screen has read the purchase contract ever since, so
the field was inviting the user to pick something that no longer exists. Now *"– select a purchase
contract"*.

### Not covered by the tests, and stated rather than left to be found

**The empty-state copy of the button.** No seeded contract can reach it — every applicable contract
already has an export contract (ec-1→ct-1, ec-2→ct-2, ec-3→ct-3, ec-4→ct-4, ec-5→ct-6), and the only
one without is ct-5, Tanzania, which is a country the action is withheld from. The branch is
exercised by raising a contract inside the mock-up.

**Not verified.** All three files parse clean; the seven new tests follow the suite's conventions
and have not been executed. `npm run typecheck` and `npm test` before trusting.

## 2026-09-11 · mock-up v2.10

### The export contract issuance can be recorded, and EX forms issued

*"Review the Export Contract screen and the process for all countries. Create a screen for Add and
Edit Export contract screen in the mockup. Check the Issuance info card the fields related to
export contract."*

**What the review found, and it is the finding rather than the change.** Every one of the eight
fields on the Issuance card has rendered since v1.0 and **none of them could be written.** The
service layer had `requestExportContract` (6 September) and `consumeExportForm`, which marks a
form *Used*, and nothing in between. A seeded record showed an issuance; a record raised inside
the mock-up could never get one. That is gap 1 of the five in the 7 September meeting pack, and
it is the one that strands Visio steps **3.5, 3.6, 6.1 and 8.2** — the whole middle of the
pre-clearance chain.

**Add already existed; what was missing was Edit.** The record carries two stages belonging to
two parties, and `/pre-clearance/new` deliberately captures only the first. So the new screen is
`/pre-clearance/:id/edit`, and it records what the Ministry of Trade returns: the contract number,
the issuance and expiry dates, the actual exporter, bank, branch and quantity, the scanned
document, and — in Sudan — the EX forms issued against it.

**The request is shown and not editable.** A request is the record of what the business *sent*, so
correcting it after the ministry has answered rewrites the thing that was answered. It is rendered
read-only at the top because someone recording an issuance needs to see what was asked for — most
obviously that PC-2041 requested 630 MT and was issued 620 MT.

**The status follows the action.** Recording the number and the issuance date *is* the issuance,
so `issued` is derived in the service layer and never offered as a control — the rule the tag
specification moved to on 9 September, where a selectable state let a record say *agreed* with
nobody having agreed.

**The expiry is required, and it is the one judgement here.** §6.14: *"Requested → Under process →
Issued, with an expiry. [AS-IS]"* — the source states an issued contract has one, and rule R13
(the validity banner, and the shipment's own export-contract expiry check) has nothing to measure
without it. Required on the transition, not on the record.

**Bank and branch become master dropdowns**, as on the shipment earlier the same day. The captured
values resolve exactly — *Unity Commercial Bank* → `cp-bank-unity`, *Head office* — so nothing
captured is lost, and a test asserts the hydration. The D14 note stays on the branch: the legacy
system wrote it into the column named *Goods Desc*.

**EX forms are issued, not only consumed — Sudan only.** A new form is created at **Issued**, not
*Under processing*: the bank has produced it, and a form created as under processing would be a
form nobody had issued. A **used** form cannot be removed, because consumption is recorded against
its number on two other records — rule R7's reasoning applied to deletion. The R5 total stays a
**warning and not a gate** (decision D-10); the legacy estate saved three different totals for one
shipment, and this reports the mismatch rather than refusing it.

#### The process for all countries

| Country | Export contract | EX forms | Also |
| --- | :---: | :---: | --- |
| Sudan | yes | **yes** | service request to logistics, Sudan only |
| Ethiopia | yes | no | export permit; the advance-payment chain |
| Chad | yes | no | no advance payment |
| Tanzania | **no** | no | export permit |
| Mozambique | **no** | no | starts from a commercial invoice |

Both screens branch on these two flags and nothing else — no country code appears in a condition,
and a test pins the whole matrix because three screens now read it.

**[OPEN] §6.14 and the profiles still disagree about Chad,** and the seeded data makes it live
rather than theoretical: the workflow says the export contract is *"applicable in Sudan and
Ethiopia"* with Chad only *"via Renatus"*, the Chad profile says it applies, and **ec-3 is a Chad
record**. The same disagreement was recorded on 9 September between C10's step configuration and
the Export profile. The screens follow the profile; the question is not resolved.

**One consequence worth stating:** because `requestExportContract` refuses Tanzania and
Mozambique, no export contract can exist on a contract from either, so the issuance refusal for
those two is defence in depth that seeded data cannot reach. Kept, with the reason written on it.

**Not built, deliberately.** The four Ministry-of-Trade dates get no controls — decision D7 records
that the columns exist in the legacy system with no form controls at all and are blank on recent
records, so adding them would be designing a process no source describes. `under_process` gets no
action either; the only transition this screen performs is → Issued.

**Not verified.** All six files parse clean; the twelve new tests follow the suite's conventions
and have not been executed. `npm run typecheck` and `npm test` before trusting. The new route was
added to **both** route tables — `route-tables.test.ts` compares them in both directions, and that
guard exists because the Procurement routes were added to only one on 3 September.

#### Open for the business

1. **Does the export contract apply in Chad?** Two answers in the workspace, one seeded Chad record.
2. **Is the exporting-entity list country-specific?** Still the three Sudan names; the actual
   exporter is free text, and Chad's would be Renatus.
3. **May the issued quantity exceed the requested?** Not refused, reported on screen when it happens.
4. **Should an issuance be amendable, and the previous value kept?** It overwrites and keeps no
   history, the same as the shipment's bank card.

### The bank can be recorded with the split, or still left to Finance

*"Add the bank details, Bank Name and Bank Address details. The Bank Name field is a dropdown
list from the Master Data, and the bank address details is auto populated based on the bank
selected."* — the New shipment form.

**The second field is the branch, and that was settled in review rather than assumed.** The
instruction says address. The record holds a *branch*, the branch list is already governed and
already keyed by the bank, and the counterparty master's address on both seeded banks reads only
`Khartoum` — a field that would have said the same thing on every shipment in the country. So the
screen asks **Bank** and **Bank branch**. The instruction's word is recorded as an open question
rather than quietly re-interpreted.

**This does not withdraw the design of two days ago, and that is the whole of it.** The bank was
put on the shipment Summary on 9 September for a stated reason: Finance answers it, Dubai
Execution raises the split, so the create form asks the wrong function at the wrong moment. Both
new fields are therefore **optional**. Left blank, the split is raised exactly as before with
`shipment_bank_details` unanswered and the Finance row in the Actions Inbox. Filled, the details
and the completed milestone are written in the same operation, so no task is ever raised for a
question that arrived answered. The form states this rather than letting it be found by saving.

**One function decides, because there are now two ways in.** `resolveShipmentBankDetails` is read
by `createShipment` *and* by `setShipmentBankDetails`. Two entry points validating one field their
own way is how two screens come to disagree about what is allowed — the defect
`reviewPriceLegsFor` exists to prevent on the review dialog, one screen over. A test asserts the
two routes refuse the same value with the *same string*.

**The country comes from the contract's origin, not from the session.** `createShipment` sets
`country: contract.origin` and the service layer checks that profile, so a form reading the
session could offer a bank the save then refuses. The fields are hidden outside the configured
countries — Sudan today — and guarded again at submit, because the contract can be changed after a
bank is picked and a value the screen no longer shows must not be filed behind the user's back.

**Three refusals rather than three silent corrections:** a bank sent for a country that does not
request one, a branch the bank does not hold, and a branch with no bank. Discarding a value
somebody typed is worse than telling them it does not apply.

**The edit form does not carry the fields.** The Summary card already has *Change bank details*,
pre-filled, with Cancel beside Save. Two editors for one field is how a screen and a card come to
disagree about what was recorded.

**A defect avoided, worth naming because it would have been invisible.** `createShipment` builds
the new record by spreading `clone(template)`, and the template is another shipment on the same
contract — on Sudan, very likely one that already carries bank details. `bankDetails:` is set
*after* the spread, so a split raised without a bank gets nothing rather than silently inheriting
the previous split's. Wrong in exactly the country the feature is for, and it would never have
shown on screen as an error.

**`providedBy` is now the only thing that distinguishes the two routes** — Dubai Execution on a
split recorded at creation, Finance on one answered from the card. The audit trail takes a second
line on create for the same reason: the bank is a separate fact, answered by a different function,
and one merged note would hide that.

**Not verified.** The Export source tree was not reachable when this was written, so `tsc` and the
suite were not run against it. All four files parse clean; the nine new tests follow the suite's
conventions and have not been executed. `npm run typecheck` and `npm test` before trusting.

### Open for the business

1. **Branch or address — or both?** Settled as the branch in review; the instruction said address.
   Adding the address is `Counterparty.address`, read-only beneath the bank.
2. **Is it really Sudan only?** Unchanged and still open from 9 September — every captured
   execution plan named a bank, including the Chad, Ethiopian and Tanzanian ones.
3. **Should a bank recorded at creation be attributed to Finance anyway?** It is attributed to the
   raiser, which is truthful, but it means the Finance milestone is completed by someone else.

### Documents

Not regenerated. They stand at v2.6 / integrated v2.3 / steps v2.6 and were already three rounds
behind before this change — §6.15 does not mention bank details on the shipment at all.

## 2026-09-09 · mock-up v2.9

### The Export screens follow the country in the header

*"Export should connect to the country in the header. If country is Tanzania, the user should
view only Tanzania contracts; when they switch country the contract list should update. This
should applied to any screen affected by country."* — and, before it: *"user should be able to
switch countries as s/he has access to it."*

**What was wrong.** The header's country drove Core and the Shared modules and stopped there.
Switching it to Tanzania left the Contracts list holding every country's contracts, let a Sudan
contract open with a Sudan-only price field on its review dialog, and left the header saying one
country while the record said another. `CountrySync` was written in v1.4 to remove exactly that
defect between Core and Shared; Export had never been joined up.

**One filter, in the service layer.** Every list in the Export module goes through an `api.list*`
accessor — twenty-nine of them, read from some sixty places across the pages, the home counters,
the dashboard and the merged application's Actions Inbox. The scope is applied there rather than
on the screens: a filter written on a screen is a filter the next screen forgets, and the failure
is silent. A list added later is scoped before anyone thinks about it.

**Switching re-runs the lists with no page code.** Setting the scope notifies the store, and
Export's `useAsync` already re-fetches on a notification. That is the whole of "the contract list
should update" — no screen was changed to make it happen.

**How each record answers "which country?"** Three shapes, and the third is the one that matters:

| | |
| --- | --- |
| **The record says so** | contract origin, shipment, opportunity, stock lot, warehouse request, advance payment, movement leg, receiving-location plan |
| **A parent says so** | cargo readiness, stuffing and transport requests, claims, feedback, insurance and risks read their shipment; export contracts read their contract; pre-clearance packs read their export contract's |
| **Nothing says so** | vessel calls and freight rates are shared reference data; the sourcing and procurement records carry no country at all |

**[OPEN] Sourcing records carry no operating country.** Seasonal plans, budgets, purchase
agreements and orders, intake receipts, funds, agent balances and the production plan have no
country on the record or on any parent. They are left unscoped and the reason is written on the
accessor, because the only other thing a filter could do is empty those screens. Every seeded row
is Sudan's, so the gap is invisible today and will not be once a second country is loaded.
Whether those records should carry a country is a modelling decision for the sourcing design.

**A link still opens, and says where it lands.** The `get*` readers are deliberately not filtered.
A link that answers "not found" because the reader happens to be in another country teaches people
that COTS links cannot be shared. So the record opens and the screen states it: *"This is a Sudan
record and you are working in Tanzania."* It does not offer to switch — the country belongs to the
session, and a screen that re-scoped the session from a record it happened to open is the defect
again, one level down.

**Every Export screen says what it is scoped to.** One line in the frame that wraps them —
`Shell` standalone, `ExportPageFrame` in the merged application — rather than a sentence added
list by list, which is a sentence the next list is missing. Without it a filtered empty screen and
an empty data set look identical.

**The new contract's origin is read, not asked.** The drop-down is gone: a contract is raised in
the country the session is in, and the screen states it. `createContract` refuses a mismatch as
well, and refuses it *before* field validation, because answering a wrong country with "Buyer is
required" names the wrong problem.

**Chad was added to the Core configuration.** Export operates in five countries and Core's country
list held four. Harmless while the header drove only Core and Shared; not harmless once it scopes
the Export lists, because the header could never be set to Chad and PC-2049 — the Chad contract,
and one of the two that show the two-country price — could not be reached from any session. Chad
is now a country context (`c2.ts`), a C10 country configuration and a member of `COUNTRIES`, and
the system administrator's country scope was widened to all five so that the switch can be
demonstrated. The other demo accounts keep their narrow scopes on purpose: a single-country
account is what makes the header's selector read-only, which is the C1 rule the shell exists to
show.

**[OPEN] Chad's configuration values.** Currency (XAF), season window and holidays are stated from
the CEMAC zone and from Ethiopia's window, because no Chad configuration exists in the workspace.
Business confirmation required.

**[OPEN] Does the export contract apply in Chad?** C10's step configuration said the Ex-contract
applies in Sudan and Ethiopia only; the Export module's Chad profile says it applies. Two answers
to one question, and the workshop notes give only a negative list ("not applicable in
Tanzania…"). C10 has been aligned to the Export profile so the two agree, and the disagreement is
recorded rather than treated as settled.

**Verified.** `tsc` clean at the standing baseline, `noUnusedLocals` clean, **222 tests pass** —
twelve new, covering the filter on each shape of record, the unscoped lists as a recorded rule, a
derivability guard over every seeded row, the out-of-scope notice, the live re-run on a switch,
and the fixed origin on the new contract screen.


### Finance records a price per country of the route, on the review dialog

*"The pop-up needs to be updated: if country is Sudan user can add price for Sudan only; for
other countries user can add price between one or two countries; this should be entered by
finance."*

**One or two countries is the route, not a choice.** The country profiles already carry
`hasInlandTransitLeg` and an `inlandLegLabel` for exactly two countries, so the second country
is derivable rather than something the user picks:

| Contract origin | Priced in |
| --- | --- |
| Sudan | Sudan — loads at Port Sudan and never leaves |
| Tanzania, Mozambique | their own country, same reason |
| Ethiopia | Ethiopia **and Djibouti** — the inland leg |
| Chad | Chad **and Cameroon** — overland to Douala |

`CountryProfile.transitCountry` is new and names the second country. It is a **name, not a
`CountryUnit`**: Djibouti and Cameroon are transit countries, not operating units, and the unit
list must not grow to hold them.

**One function decides which countries may be priced.** `reviewPriceLegsFor(contract)` is read by
the dialog *and* by the service layer, so the form cannot offer a country the save would refuse —
and the service refuses a price against a leg the route does not have, because a figure filed
under a country the cargo never enters is worse than no figure.

**Finance only.** The price rows appear on the Finance row of *Record feedback* and nowhere else;
Quality and Partner / Country Execution keep the dialog they had. The service layer refuses a
price sent for any other role, so a second screen cannot file one under Quality either. Who may
*sign in* as Finance is still not checked — that is the position the whole screen takes, and it
says so.

**Optional, and not a gate.** No source makes a price mandatory to the review, so none is
asserted. Recorded prices show under the Finance row's comment rather than in a column of their
own — only one of the three rows can ever carry one, and an almost-always-empty column reads as a
gap in the data rather than a field that does not apply.

**[OPEN] What the figure is.** Cost, transfer price, quoted rate — neither source says, so the
field is labelled with the country and nothing more. The currency list is USD and SDG, the two
the costing screens already offer; widening it is a one-line change once the business names one.

**[OPEN] Why the review dialog.** Phase 04 is each function confirming it has the set-up in place
to fulfil the contract, and a price is not obviously part of that confirmation — costing (Phase
08) and advance payments (Phase 07) are the two places that already hold money. Built where the
instruction pointed; worth a second look.


### The tag specification becomes a two-party workflow

*"Origin execution will send tag and Dubai execution will confirm or add amendment; there is a
workflow."*

**What it was.** One form on the contract's Quality & tags tab — an Option, a **State**
drop-down, a custom-tags box and an *Agreed by* field — filled in by whoever had the screen
open. Nothing recorded who had said what, and because the state was *selected* rather than
performed, the record could say **agreed** with nobody having agreed anything.

**The states now name the hand-off:**

    not_started → sent ⇄ amended
                   ↓
               confirmed → reissued → sent

| State | Meaning | With |
| --- | --- | --- |
| `sent` | Origin Execution has sent the tag | Dubai Execution |
| `amended` | Dubai returned it with an amendment | Origin Execution |
| `confirmed` | Dubai accepted it | Nobody, until reprocessing |
| `reissued` | Reprocessing changed the tag (§6.5 exception) | Origin Execution |

`specified` and `agreed` were **renamed** rather than kept alongside: no captured record carries
either, so there is no history to preserve, and two vocabularies for one state is the worse
outcome. A re-issued specification now goes round the loop again rather than being confirmed on
the spot — the tag has changed, so Origin sends the new one and Dubai answers it.

**The State drop-down is gone.** Each party's move is a button that says what it does — *Send tag
specification*, *Confirm the tag*, *Return with an amendment*, *Re-issue after reprocessing* — and
the state follows from the action. `api.setTagSpecification` is replaced by
`api.recordTagSpecificationAction`, which takes the action and derives the state, so the record
cannot hold a state nobody performed.

**Every leg is kept.** `TagSpecification.exchange` is a list: each send, amendment and
confirmation records the action, the party, the person, the date, the note and the attachment it
carried. The screen shows the thread. A single note field would hold only the newest amendment,
and a tag amended twice for different reasons is exactly the case that matters — the second
reviewer needs to see what the first one asked for.

**And that answers yesterday's open question about the attachment.** It was added as one field
with the worry that a re-issue would overwrite it. Each send now carries its own attachment on
its own leg; the record's `attachmentFileName` is the latest, and the earlier ones are still
readable in the thread.

**An amendment must say what is to change** — the service layer refuses one with no note. A
buyer option still cannot be sent with no custom tags listed (§6.5 activity 3).

**Who may press which is shown, not enforced.** Each action names its party and the exchange
records which party each leg came from, but nothing checks that the signed-in user belongs to it.
That is the same position the cross-functional review takes, and for the same reason: who may act
is a C01 permission question, and settling it one screen at a time is how two screens come to
disagree.

One detail worth knowing: the shared status-tone map is keyed by the bare state string across
every domain, and a *document* is already `confirmed` there. Rather than a second key overwriting
it, the tag card passes its own tone for that state.


### Bank details per split shipment, requested of Finance, Sudan only

*"Request bank details only for Sudan, after split shipment ask bank details for each split,
there should be notification to finance once split so they enter bank details (bank name,
branch name)."*

**The notification is a milestone, not new machinery.** Export deliberately keeps no task queue
of its own — `src/integration/exportTasks.ts` derives Export's rows for the one Actions Inbox
from shipment milestones, and a milestone already carries an owning role and a country
predicate. So raising a Sudan split now leaves `shipment_bank_details` unanswered, owned by
**Finance**, and that is the row that appears in front of them. Recording the details completes
the milestone in the same operation, so the task cannot outlive the answer.

**Per split, not per contract.** One contract shipped in four splits may route them through four
different banks — which is the point of the instruction, and something a single field on the
contract cannot say. `Shipment.bankDetails` holds the bank id, the bank name *as it read when it
was recorded*, the branch, and who recorded it and when.

**Sudan only, as configuration.** A new `requiresShipmentBankDetails` flag on the country
profile, true for Sudan and false for the other four — the same shape as the existing
`usesLogisticsServiceRequest`, which the workshop notes also record as Sudan-only. The next
country that needs it is a configuration change, not a code change.

**Where it is entered.** A *Bank details* card on the shipment Summary. Not the New shipment
form: Finance answers this and Dubai Execution raises the split, so the create form would be
asking the wrong function at the wrong moment. Bank comes from the counterparty master and the
branch from that bank's own branch list — the dependent-master pattern, and the same two lists
the execution plan used before it was removed.

**Outside Sudan the card still renders** and says the details are not requested there, rather
than vanishing: a reviewer comparing a Sudan shipment with a Tanzanian one should be able to see
the rule rather than wonder where the field went.

**Nothing is blocked.** No source makes the bank a precondition for anything, and decision D-10
is the standing rule against inventing a gate.

**Recorded is not final.** The first version of this card rendered the form only while the
details were missing, which meant that on every split that had them there was no way in at all:
a bank recorded wrongly was recorded for good, and a reviewer opening a seeded split saw values
and no control. The recorded state now carries a **Change bank details** action that opens the
same form pre-filled, with Cancel beside Save. Replacing the value keeps no history of the
previous one, and the card says so — whether an audit of the change is needed is a question for
the business, and the shipment's audit trail already records that it happened and by whom.

**The captured banks are not lost.** The execution plans named a bank and a branch, and planning
was removed yesterday. Each Sudan split is re-seeded with the bank its plan carried — sh-1 and
sh-2 Unity Commercial Bank, sh-3 and sh-7 Savannah Trade Bank. sh-8 is left outstanding, so the
Finance task is visible in the demonstration data.

**[OPEN] Is it really Sudan only?** Every captured execution plan named a bank, including the
Chad, Ethiopian and Tanzanian ones. That is evidence the bank is *known* outside Sudan even if it
is not *asked for* there. The instruction says Sudan, so Sudan is what is configured, and the
question is recorded on the profile rather than resolved.

### Fixed — a milestone left naming a record that no longer exists

Removing execution planning on 8 September left `execution_plan_created` in `EXECUTION_FLOW`, and
that was not cosmetic: `export_contract_requested` listed it as a prerequisite, and a prerequisite
naming a milestone the flow does not define is never met — the export-contract step would have
sat at not-started for ever. It now waits on `contract_issued`, which is what the plan waited on.

Also removed: the milestone itself, its eight seeded entries, and the two lifecycle steps that
rolled it up — *Planned* on the shipment stepper and *Execution planned* on the contract stepper.
A step whose only source is gone renders as not-applicable for ever, which reads as a gap in the
process rather than as a step that was retired. A test now walks every prerequisite in the flow
and fails if one names a milestone that does not exist.


## 2026-09-08 · mock-up v2.8

### Tags specification — an attachment

*"Attachment should be added under Tag specification section."*

`Tags specification flow (activity 3)` on the contract's Quality & tags tab gains an
**Attachment** field, after the batch-code control and above *Save tags specification*, so it
saves with the specification rather than with the quality terms above it. It is also shown on the
read-only summary beside *Agreed by*.

**A file name, not a file** — the same statement `Artwork design` on the contract form makes, and
the field says so. This prototype stores names.

**Optional.** §6.5 activity 3 describes the buyer's tag options in words and names no document,
so a required attachment would be a rule invented here.

**Open, and recorded on the field rather than left to be found:** one attachment or several. A
specification can be re-issued after reprocessing — `reissuedAfterReprocessingOn` exists for
exactly that — and a single field is overwritten when it is, losing the artwork the buyer
originally agreed. Modelled as one because the instruction says *attachment*, and because a
version history would assert a rule no source states. It becomes a collection the day the
business says the earlier file is kept.


### New shipment — the two date fields removed

*"Remove the two selected fields from this screen."* — **Cargo readiness date** and **Last
shipping date**, on the New shipment form.

Both are still on the `Shipment` record and still shown on the shipment detail; only the create
and edit form stops asking for them. Three things followed, and each is a decision rather than a
deletion:

- **The last shipping date is still recorded on create**, read from the contract's shipment
  period rather than typed. It was already prefilled from there, so nothing is invented — and a
  shipment without one loses the export-contract expiry check on its own detail screen, which is
  a working rule and not a display nicety.
- **On edit, neither date is sent at all** — not even as `undefined`. `api.updateShipment` does
  an `Object.assign`, so a key present and undefined would erase a captured date that this screen
  no longer shows and therefore cannot have been asked to change.
- **The readiness-before-last-shipping check** was validated on this form and in the service
  layer. The form copy is gone with the fields; the service-layer copy stays, which is where it
  has to live now.

The *Captured from* banner no longer claims to have filled the last shipping date, since it no
longer fills a control. The contract-list *New shipment* action still captures the contract, the
shipment type, the container type and the quantity still to ship.


### Execution planning is gone — the screens, and then the record

*"Remove execution plan screen from the project in all places."* — *"because I have split
shipments no need for execution plan screen."* — *"remove the executionPlanId from all records
that contains it."*

#### The record

`ExecutionPlan` is deleted: the type, `ExecutionPlanStatus`, `EXECUTION_PLAN_TRANSITIONS`, the
seven seeded plans, `store.executionPlans`, `api.listExecutionPlans` and `api.createExecutionPlan`.

Four records carried the foreign key. Three of them already carried `contractId`, so they simply
lost a field. The fourth did not, and is the only real decision in the change:

| Record | Was | Now |
| --- | --- | --- |
| `Shipment` | `contractId` + `executionPlanId` | `contractId` |
| `ExportContract` | `contractId` + `executionPlanId` | `contractId` |
| `AdvancePayment` | `contractId` + `executionPlanId?` | `contractId` |
| `CargoReadiness` | **`executionPlanId` and nothing else** | **`shipmentId`** |

**Cargo readiness re-parents onto the shipment.** It had no contract field and no shipment
field — the plan was its only link to anything. The shipment is what keeps the granularity the
plan gave: a contract shipped in four splits has four readiness records, not one covering all of
them. The seven seeded rows were re-keyed by the shipment each plan carried, and a test walks
every one of them and fails if a `shipmentId` does not resolve.

One judgement inside that: `ep-1` carried **two** shipments (PC-2041.1 and PC-2041.3) and one
readiness record. It is attached to the first. There was no second readiness record to give the
second shipment, and inventing one would have been inventing cargo.

#### What each screen lost, and what replaced it

| Screen | Change |
| --- | --- |
| New shipment | The Execution plan field, its validation, and the prefill that filled it where the contract had exactly one plan. A shipment is raised against the contract. |
| Shipment detail | The *Planning* tab is now *Cargo readiness* — the plan block above it is gone, and *Remaining to ready* is measured against the shipment's own quantity rather than the plan's. |
| New export contract request | Raised against the **contract**, not the plan. The request number becomes `<contract no>-R<n>`; the quantity defaults to what is still unrequested on the contract rather than to the plan's planned quantity. |
| Contract summary | *Planned across lots* is gone — with no plan there is nothing between the contract and its shipments to plan a quantity, so the figure is not reported rather than reported as zero. Readiness reaches the contract through its shipments. |
| Advance payment detail | The execution-plan field and the plans table inside *Execution readiness*. |
| Stock allocation | The readiness table is keyed by shipment; *Planning number* becomes *Shipment*. |
| `createShipment` | No plan to look up; the new shipment's `assignedTo` is read from the contract's Dubai Execution owner, which is where the plan's came from anyway. |

**Captured request numbers are left as captured.** New requests are `PC-2041-R1`; the seeded ones
stay `PC-2041.1-R1`. A request number is on a record the business issued, and renumbering history
to match a new rule would be inventing a past. The sequence therefore counts the requests already
on the contract instead of parsing their numbers, which is what lets the two formats coexist.

**An orphan worth naming.** The payment-terms master has two levels, and the plan's
`exportContractPaymentTerms` was the only field anywhere that carried an **instrument** on its
own. Nothing reads that level now. The list is kept — it is the parent of the term list, every
term's `instrument` joins to it, and it is a governed C03 domain that a screen removal does not
undo — but if the split shipment carries the export contract's terms, this is the list it should
read. Recorded in `data/master.ts` beside the list.

### Execution planning is no longer a screen

*"Remove execution plan screen from the project in all places."* — *"because I have split
shipments no need for execution plan screen."*

Two screens are gone: the contract's **Execution planning** tab, and the **New execution plan**
form added two days earlier. With them go both routes, every link that pointed at them, the
Phase 13 screen entries in the process model, and their tests.

| Removed | Was |
| --- | --- |
| `pages\execution-plan-form.tsx` | The create form, `/contracts/:id/planning/new` |
| The `planning` tab | `/contracts/:id/planning` — the plan list, its field grid and its cargo-readiness block |
| Two routes | In `vendor\export\App.tsx` and in the merged `src\App.tsx`, which re-declares them |
| The contract-list and empty-state links | *New execution plan*, *Create an execution plan* |
| The shipment screen's link | *Create an execution plan — you will come back here with it selected* |
| Two `screens` entries on Phase 13 | *Execution planning — PC-2041*, *New execution plan* |
| Seven tests | The two execution-plan describes, and the payment-terms test that rendered the form |

**The record is deliberately untouched.** `ExecutionPlan` still exists, the seeded plans are
still there, and `Shipment`, `ExportContract` and `CargoReadiness` still carry
`executionPlanId`. Removing a screen and re-pointing three records at the contract are different
changes, and the second one rewrites rules the workflow documents state. It waits for the
split-shipment and bank-details instructions still to come.

**What that costs today, stated rather than discovered.** A shipment still requires an execution
plan, and there is no longer any way to create one. The six seeded contracts keep their plans, so
the demonstration path works end to end; a contract raised inside the mock-up reaches the New
shipment screen, finds an empty plan list, and stops. The shipment screen's hint says exactly
that instead of offering an action that no longer exists.

**Still describing four things that are gone:** Phase 13 in `exportProcess.ts` keeps its fields,
capabilities and open questions about execution planning, and §6.13 in the workflow document is
unchanged. Both wait for the same instruction as the record change.


### Cross-functional contract review — Processing removed

*"Remove Processing from this screen."*

Phase 04's review asked four functions to confirm they had the set-up in place to fulfil a
contract. It now asks three: **Quality**, **Partner / Country Execution** and **Finance
(FP&A)**.

| Changed | From | To |
| --- | --- | --- |
| Reviewing functions | 4 | 3 |
| Intro prose | "Quality, the Execution team, the Processing team and FP&A … Four confirmations" | "Quality, the Execution team and FP&A … One confirmation per function" |
| Section title | The four fulfilment confirmations | The fulfilment confirmations |
| Confirmations donut | `confirmed === 4` | `confirmed === c.reviewFeedback.length` |
| Decision D-10 line | Execution, Quality, Processing, FP&A | Execution, Quality, FP&A |
| Notification card | "Same four teams in every country?" | "The same teams in every country?" |

**The captured Processing confirmations go with the row.** Five of the six seeded contracts
carried one from Selim Aziz, including PC-2041's *"Cleaning line capacity reserved for weeks
28–33"*. A function that no longer reviews does not have confirmations, and leaving them in the
data behind a filtered screen is how orphaned fields happen. They are deleted, and `createContract`
now seeds three pending rows rather than four.

**The `processing` role itself is untouched.** Processing still gives the Execution team
readiness feedback at Phase 13 (allocation) — a different activity on a different screen. A test
asserts the role still exists, so that a change to one screen cannot quietly reach the other.

Three tests added: the review tab shows exactly those three functions and no Processing row; the
prose and section title no longer count to four while the table shows three; and no captured
contract carries Processing feedback.


### Payment terms come from master data on all three screens that ask for them

*"In the project Merged_Mockup all payment terms should be a dropdown list, come from master
data."*

**Three screens asked for payment terms as free text** — the deal agreement (§6.9), the new
purchase contract (§6.10), and the new execution plan, whose field is the *export* contract's
terms and not the sales contract's. All three now read a new master. Nothing else in the
mock-up captures payment terms; the shipment, the bank submittal and the contract detail all
display the contract's and are unchanged.

**This is the field that most needed a master, and not because of tidiness.** The bank
submittal maturity date derives from it (§6.14) — which is why Phase 10 already proposed
making it mandatory, and why it is the one field where a typed string has a downstream
consequence. A date cannot be derived from prose, and the captured data shows exactly that:
865 legacy contracts hold nothing at all, and the eight records that do hold something spell
it four different ways.

| Captured on | Value |
| --- | --- |
| contract PC-2041 | `DA 60 days` |
| contract PC-2044 | `LC at sight` |
| contracts PC-2049 / PC-2055 | `CAD`, `DP` |
| contracts PC-2052 / PC-2058-LV | `TT 30 days`, `LC 90 days` |
| deal OPP-2026-014 | `60 days from B/L date, D/A` |
| deal OPP-2026-011 | `At sight, D/P` |

**Two levels, one domain.** A term is an instrument plus a tenor, and the two ends of the
chain want different halves of it. The contract and the deal carry the whole term, because
that is what a maturity date is computed from. Every captured execution plan carries the
instrument alone — `DA`, `LC`, `CAD`, `TT`, `DP` — because the export contract's terms are
agreed with the bank and not with the buyer. So the instrument list is the governed parent
and a term is an instrument carrying a tenor; the plan reads the first, the contract
and the deal the second. A test asserts the join, so the plan's short form is provably a
projection of the same domain rather than a second vocabulary that happens to look similar.

**Every value the captured records carry is held verbatim** and marked as such in the master.
The remaining tenors are invented (A31); no instrument is. The two long spellings are
deliberately **not** added — a master holding two spellings of one term is the problem it was
created to solve. They are kept on their records and offered as an extra option marked *not in
the master*, which is the packing-size rule of 6 September. That path is live rather than
defensive: OPP-2026-014 is the deal the create screen prefills from, so raising a contract
from it shows the marked option on the first render.

**The substantive finding, which no screen could have caught while both fields were free
text.** OPP-2026-011 is the deal PC-2041 was raised from. The deal says `At sight, D/P`; the
contract says `DA 60 days`. Different instrument, different tenor — not two spellings of one
term. Recorded, not corrected: which is right is a commercial question for the trader and
Dubai Execution, and a governed list is the first thing that makes it answerable at all.

**Not done here.** The bank submittal still *asks* for the maturity date and only says it
derives from the terms. With a governed tenor it could be derived — `tenorDays` is held on
every term against that day — but deriving it changes a Phase 14 rule, not a Phase 10 list.

**Open:** whether the two long spellings are corrected on those two deals or kept as captured;
and which of PC-2041's two terms is right. The question of *where the master itself belongs* is
answered in the next section — it was left open in this one, and should not have been.

### Second pass, same day — the master belongs in C03, not in Export

**The first pass was answered with a fair question: why is this not in Core's master data?** It
should have been, and the reason it was not is that the five masters added on 6 September are
not either. Packing sizes, B/L consignees, commodity types, bank branches and container types
all sit inside the Export prototype, each carrying an open question reading *which governed
domain in C03 does this belong to, and who maintains it*. Adding payment terms the same way made
six unclosed questions instead of closing one.

C03's own domain browser already states the rule, in these words:

> Nothing is entered as free text anywhere in COTS where a master record exists.

A list held inside one module is not a master. It is a second copy — the same failure
`CountrySync` exists to prevent one level up, where Core and Shared each kept a private answer
to a question only one of them owns.

**Two new C03 domains,** in the Financial group beside `incoterm`, which is what they are: the
other half of a contract's commercial terms.

| Domain | Records | Governance | Why |
| --- | --- | --- | --- |
| `paymentinstrument` | 5 — LC, DA, DP, CAD, TT | Immediate activation | A closed list; adding one carries no risk. The same call `currency` makes. |
| `paymentterm` | 11 — the instrument plus a tenor | **Approval required** | Its tenor moves a payment date. The same call `fxrate` makes. |

Modelled as a parent list and a child list, which is the shape `commodity` and `grade` already
use — not one flat list, which would make every reader parse a string. Each of the six terms a
captured contract carries shows that contract in its `dependencies`, which is what a real C03
record would show before anyone tried to deactivate one.

**Export subscribes; it is not patched.** The Export prototype builds and runs on its own, where
`@core/*` does not resolve, so it cannot import C03 and should not be made to depend on Core for
a list it must be able to show alone. Its list becomes the *default*, and `setPaymentTermsSource`
lets an integrator replace it. `src/integration/MasterDataSync.tsx` reads the **active** C03
records from the Core store and pushes them in — the direction `CountrySync` established, mounted
beside it in `main.tsx`. Only Active records cross, which is the whole point of governing the
domain: approve a term in C3 and it appears in the contract's drop-down without a reload; leave
it in Draft and it does not.

Each of the three screens now names the master it is reading — *the Export prototype's own list*
standalone, *C03 master data — the payment-term domain* integrated — so the wiring is visible to
a reviewer rather than being something they have to be told.

An empty C03 result is deliberately **not** pushed. A renamed domain would otherwise blank every
payment-terms field with no explanation and make a contract unsaveable; falling back to the
Export default degrades to the pre-integration behaviour, which is wrong visibly instead of
invisibly.

**The two lists are identical, and that is checked.** The C03 records map to exactly Export's
eleven terms and five instruments, so switching the source changes nothing on screen except the
name of the master. The change is where the data lives, not what it says.

**Two more shadow lists turned up in C03 itself** while the domain was being added, and neither
is touched here — re-pointing an attribute at a domain is a modelling decision, not a side-effect:

- `supplier` carries a *Payment terms* attribute as a select with four options of its own —
  *Cash against documents, Documents against acceptance, 30 days net, 60 days net*.
- `warehouse` carries a *Payment terms* attribute as free text.

**And one finding that is not an open question.** C03 already holds a **`grade`** domain
(Commodity group, owner Group Quality, coding `GRD-000`). The `COMMODITY_TYPES` master added to
Export on 6 September duplicates it. That is not a domain waiting to be agreed — it is a governed
domain being shadowed, and it should be re-pointed the way payment terms now are.

**Still open:** the owner of both new domains. Payment terms are arguably a treasury matter
rather than a commercial one, and no source names an owner; `Group Commercial` is shown because
that is what `incoterm` carries, and the domain browser already says the owners are placeholders.

### Where this change lives

`MergedMockup\vendor\` is written by `vendorize.ps1` and is overwritten by the next
`-Go -Refresh`. The edits below therefore belong in the Export prototype's own source,
`COTS_Export_Mockup_v2.4\export-process-mockup\src`, and are applied to `vendor\` as well so
the merged mock-up shows them today.

| File | Change |
| --- | --- |
| `data/master.ts` | New payment-terms section: `DEFAULT_PAYMENT_INSTRUMENTS`, `DEFAULT_PAYMENT_TERMS`, the `paymentInstruments()` / `paymentTerms()` / `paymentTermsSourceName()` accessors, the `setPaymentTermsSource` seam, and `paymentTermByLabel`, `isMasterPaymentTerm`, `paymentInstrumentByCode`, `isMasterPaymentInstrument`. |
| `pages/purchase-contract-new.tsx` | `pc-payment-terms` becomes a `SelectInput` over the term master, with the extra-option rule for a term the master does not hold. |
| `pages/origination.tsx` | `deal-payment` becomes a `SelectInput` over the same list, so the deal and the contract it is raised into speak one vocabulary. |
| `pages/execution-plan-form.tsx` | `ep-payment-terms` becomes a `SelectInput` over the instruments. |
| `__tests__/routes.test.tsx` | Seven tests: a list not a text box on each of the three screens, the marked out-of-master option on the prefilled contract, a guard that walks every captured contract and plan and fails if the master ever loses a value one of them holds, and the two covering the C03 seam — an injected list replacing the default and being named on screen, and the standalone fallback. |

And in the merged mock-up and in Core:

| File | Change |
| --- | --- |
| `@core/mockData/c3.ts` | Two `DOMAINS` entries beside `incoterm`; `paymentMasterRecords`, sixteen records spread into `seedMasterRecords`; `DOMAIN_ATTRS` for both. |
| `@core/mockData/c2.ts` | Two shortcut chips in `SUB_MODULES.C3`, so the domains appear under Master Data in the menu and not only inside the Domains table. |
| `src/integration/MasterDataSync.tsx` | New. Reads the active C03 payment records from the Core store and pushes them into Export. |
| `src/main.tsx` | Mounts it inside `CountrySync`, above the routes. |

`vendor\core\` is a generated copy too — the C03 change belongs in
`COTS_CoreModules_Mockups_Walkthroughs\CoreModules\react\src`.

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
