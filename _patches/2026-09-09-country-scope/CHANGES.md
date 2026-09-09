# COTS — change log

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
