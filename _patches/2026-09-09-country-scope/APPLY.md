# The Export screens follow the country in the header — how to apply this patch

**Date:** 9 September 2026
**Instruction:** *"Export should connect to the country in the header. If country is Tanzania, the
user should view only Tanzania contracts; when they switch country the contract list should
updated. This should applied to any screen affected by country."*
**And before it:** *"User should be able to switch countries as s/he has access to it."*

## Where each folder goes

This change touches all three prototypes, two of which are vendored copies that
`vendorize.ps1 -Go -Refresh` overwrites. Everything here has **also** been applied to
`MergedMockup\vendor\` and `MergedMockup\src\`, so the merged mock-up shows it today.

| Folder here | Goes to |
| --- | --- |
| `src\` | `D:\CIMEgypt\COTS_Claude\COTS_Export_Mockup_v2.4\export-process-mockup\src\` |
| `core-src\` | `D:\CIMEgypt\COTS_Claude\COTS_CoreModules_Mockups_Walkthroughs\CoreModules\react\src\` |
| `merged-src\` | `D:\CIMEgypt\COTS_30Aug26\COTS_Export_Merged_Mockup\MergedMockup\src\` — **already applied**; the merged project's own source is not vendored |

Then, in `MergedMockup`:

    powershell -ExecutionPolicy Bypass -File .\vendorize.ps1 -Go -Refresh

`CHANGES.md` here is the merged repo's log with the 2026-09-09 entry at the top; it has already
been written to `D:\CIMEgypt\COTS_30Aug26\CHANGES.md`.

**Every file is a whole-file replacement.** If either prototype's own source has moved on since it
was last vendorised, diff before overwriting rather than copying blind.

---

## 1. What was wrong

The header's country drove Core and the Shared modules and stopped there. `CountrySync` was
written in v1.4 to stop Core and Shared holding two answers to one question; Export was never
joined up to it. So the header could be switched to Tanzania and:

- the Contracts list still held every country's contracts;
- a Sudan contract still opened, with a Sudan-only price field on its review dialog;
- the header said one country and the record said another, with nothing on screen to say which
  one the list was obeying.

That last point is the one that matters. A wrong list is visible; a list that is quietly the wrong
scope is not.

## 2. One filter, in the service layer

Every list in the Export module goes through an `api.list*` accessor in `services\store.ts` —
twenty-nine of them, read from some sixty call sites across the pages, the home counters, the
dashboard and the merged application's Actions Inbox. The scope is applied **there**, not on the
screens:

- a filter written on a screen is a filter the next screen forgets, and the failure is silent;
- a list added later is scoped before anyone thinks about it;
- no page file needed changing to make the filtering work.

`setCountryScope(code)` sets it. `activeCountryScope()` reads it. `null` means unscoped.

**Switching re-runs what is on screen, with no page code.** `setCountryScope` calls the store's
`notify()`, and `useAsync` in `pages\hooks.ts` already re-fetches on a notification. That is the
whole of *"when they switch country the contract list should update"*.

### How each record answers "which country is this?"

| Shape | Records |
| --- | --- |
| **The record says so** | `Contract.origin`, `Shipment.country`, `Opportunity.origin`, `StockLot.origin`, `WarehouseRequest.country`, `AdvancePayment.country`, `MovementLeg.originCountry`, `ReceivingLocationPlan.country` |
| **A parent says so** | cargo readiness, stuffing requests, transport requests, buyer claims, customer feedback, insurance policies and incidents, and risks read their **shipment**; export contracts read their **purchase contract**; pre-clearance packs read their **export contract's** contract |
| **Nothing says so** | vessel calls, freight rates, and every sourcing and procurement record |

Two traps avoided, both recorded on the accessors:

- **`MaterialPurchase.origin` and `TransportRequest.origin` are places, not countries** —
  "Gedaref", "Kosti", "Dodoma". Neither is read as a country.
- **`Shipment.country` is read in preference to its contract's origin**, even though the two agree
  on every seeded row and a test holds them so. The country is on the record; deriving it from a
  parent when the record states it would be inventing a derivation and would put every shipment
  behind a contract lookup.

### A row whose country cannot be worked out is kept, not dropped

An underivable country means a broken link — a shipment naming a contract that is not there — and
that is a defect in the data, not a country. Dropping such a row hides the defect behind the
filter and the shorter list reads as correct. A test walks every seeded shipment, readiness row,
export contract and advance payment and fails if one cannot be resolved, so the branch never fires
in practice; it exists so that when it does, the row is visible.

### [OPEN] The sourcing records carry no operating country

Seasonal purchase plans, budgets, purchase agreements, purchase orders, intake receipts, funds,
agent balances and the production plan have no country on the record and no parent that has one.
They are left **unscoped**, with the reason written on the accessor, because the only other thing
a country filter can do to a record with no country is empty the screen.

Every seeded row of these is Sudan's, so the gap is invisible today and will not be the moment a
second country is loaded. Whether those records should carry a country is a modelling decision for
the sourcing design, not something a filter should settle. A test asserts they are unscoped, so
changing that is deliberate rather than accidental.

Vessel calls and freight rates are unscoped for a different and permanent reason: a vessel call is
a ship at a port and carries more than one country's cargo, and a freight rate is quoted per
loading port — filtering rates by country would hide the rate for a transit port that sits in the
neighbouring country, which is precisely the Djibouti and Douala routes this module has.

## 3. A link still opens, and the screen says where it landed

The `get*` readers are deliberately **not** filtered. A link that answers "not found" because the
reader happens to be in another country is a broken link, and it teaches people that COTS links
cannot be shared.

So the record opens, and `CountryScopeNotice` states it:

> **This is a Sudan record and you are working in Tanzania** — Contract PC-2044 belongs to Sudan.
> It has opened because a link to a record works whoever follows it, but every list, counter and
> task on the other screens is filtered to Tanzania, so this record does not appear in them.

It does **not** offer to switch. The country belongs to the session and is set from the countries
the account is scoped to (C1 / WF-C1-03); a screen that re-scoped the whole session from a record
it happened to open is the original defect one level down. The notice says where to change it, and
says that a country missing from the header is an access question for an administrator.

On the contract and the shipment the notice sits above everything else on the page, because it
changes how the rest should be read: the shipment, readiness and transport panels below it are
themselves filtered to the session's country and will be empty.

## 4. Every Export screen says what it is scoped to

One line, rendered by the frame that wraps every Export screen — `components\Shell.tsx` standalone
and `ExportPageFrame.tsx` in the merged application:

> Scoped to **Sudan** — every list, counter and task on the Export screens shows Sudan records
> only. The country comes from the session; change it in the header.

In the frame rather than on each list, for the same reason the filter is in the service layer: a
sentence added list by list is a sentence the next list is missing. Without it, a filtered empty
screen and an empty data set look identical. It renders nothing when there is no scope — a line
saying "not filtered" on every screen is noise.

## 5. The new contract's origin is read, not asked

The Origin drop-down on `contracts/new` is replaced by the country, stated. A contract is raised in
the country the person is working in; asking for it makes a second answer possible, and a contract
raised with the wrong one would be invisible to the person who raised it — the list it belongs in
is scoped to a country they are not in.

`createContract` refuses the mismatch as well, and refuses it **before** field validation:
answering a wrong country with "Buyer is required" names the wrong problem and points at a field
that is not the one at fault.

Unscoped — no country on the session — the drop-down is offered exactly as before, because then
there is nothing to read and asking is the only honest option.

## 6. Where the country is pushed in from

| Host | Component | Reads |
| --- | --- | --- |
| Export standalone | `auth\CountryScopeSync.tsx`, mounted in `App.tsx` | `useAuth()` → `activeCountryOf(user)` |
| Merged application | `src\integration\ExportCountryScope.tsx`, mounted in `main.tsx` | Core's `activeCountry` → `countryUnitByName` |

**Why the merged one is at the root and not in the Export frame.** Export data is read outside the
Export screens: `useExportTasks` turns unanswered shipment milestones into rows in the integrated
Actions Inbox, and the inbox is a Core route with no Export frame around it. Mounted inside
`ExportPageFrame` the scope would be set on an Export screen and cleared the moment the user
navigated to the inbox, which would then show every country's tasks under a header naming one.

**Why an unresolved country clears the scope rather than defaulting.** `activeCountryOf` returns
`resolved: false` where neither the session nor the account named a country, and falls back to the
first configured one. Scoping to a fallback hides four countries' records behind a country nobody
chose, and the empty screen is indistinguishable from there being nothing to show. Unscoped is the
honest state, and the scope line says so by being absent.

## 7. Chad, and why Core changed

Export operates in five countries. Core's `COUNTRIES` held four — Sudan, Ethiopia, Tanzania,
Mozambique. Harmless while the header drove only Core and Shared. Not harmless once it scopes the
Export lists: the header could never be set to Chad, so **PC-2049 — the Chad contract, and one of
the only two that show a two-country price — could not be reached from any session.**

Four data additions, all in `core-src\`:

| File | Change |
| --- | --- |
| `mockData\c2.ts` | Chad added to `COUNTRY_CONTEXT` — XAF, Mon–Fri, French / Arabic, Ex-form and logistics service request not applicable |
| `mockData\index.ts` | `'Chad'` added to `COUNTRIES`; the system administrator's `countryScope` widened to all five |
| `mockData\c10.ts` | Chad added to the C10 country configuration registry and to the step-configuration country list |

The other demo accounts keep their narrow country scopes deliberately. A single-country account is
what makes the header's selector render as a read-only chip, which is the C1 rule (Step 2) the
shell exists to demonstrate.

### [OPEN] Chad's configuration values

Currency (XAF), the season window and the holidays are stated from the CEMAC zone and from
Ethiopia's window, because no Chad configuration exists anywhere in the workspace. Business
confirmation required.

### [OPEN] Does the export contract apply in Chad?

C10's step configuration said the Ex-contract applies in **Sudan and Ethiopia only**. The Export
module's Chad profile says it **does** apply, sourced from *Ethiopia & Chad Execution.vsdx*. Two
answers to one question. The workshop notes give only a negative list — *"Ex contract is not
applicable in all countries (not applicable in Tanzania…)"* — and name no positive one, so both
readings come from process diagrams rather than from a stated rule.

C10 has been aligned to the Export profile so the two agree today, and the disagreement is
recorded on both sides rather than treated as settled.

## 8. Verified

- `tsc` over `vendor\export` — clean apart from the two long-standing errors (`import.meta.env` in
  `App.tsx`, the `inert` prop in `Shell.tsx`).
- `tsc` with `noUnusedLocals` — no new unused symbols; the four reported are pre-existing.
- `vitest run` over `routes.test.tsx` — **222 passed**, twelve new:
  - unscoped shows every country;
  - the contract list narrows to one country and changes on a switch;
  - the eight records that carry their own country are filtered by it;
  - the parent-derived records — readiness, export contracts, pre-clearance packs — are filtered
    through the parent;
  - reference data and the sourcing records stay unscoped, asserted by count so that changing it
    is deliberate;
  - every seeded row in a scoped collection resolves to a real country, and each shipment's own
    country matches its contract's origin;
  - a record from another country opens by link and shows the notice;
  - a record of the working country shows no notice;
  - a list already on screen re-runs when the country changes, with no reload;
  - the new contract screen states the origin instead of asking, and asks when there is no scope;
  - `createContract` refuses an origin outside the session's country.

## 9. What to look at

Sign in as Nasreen Sayed (system administrator — the account whose scope now carries all five
countries) and use the country selector in the header.

| Country | Contracts you should see |
| --- | --- |
| Sudan | PC-2041, PC-2044, PC-2058-LV |
| Ethiopia | PC-2052 — and the review dialog asks for Ethiopia **and Djibouti** |
| Chad | PC-2049 — Chad **and Cameroon** |
| Tanzania | PC-2055 only |
| Mozambique | none — an empty list under a line saying it is scoped to Mozambique |

Then paste `#/contracts/ct-2` while the header says Tanzania: the Sudan contract opens and says so.

## 10. Still open, beyond the two above

1. **The sourcing records' country** — §2.
2. **Whether a country switch should reset the screen you are on.** It does not: switching while
   reading a Sudan contract leaves that contract open with the notice on it. That is the
   link-follows behaviour applied to a switch, and it is arguable that a switch is more deliberate
   than a link and should return you to the list.
3. **Nothing is scoped by country on write except the contract's origin.** A shipment, a readiness
   row and an advance payment all inherit their country from a parent, so they cannot be created in
   the wrong one; no other create screen asks for a country at all.
