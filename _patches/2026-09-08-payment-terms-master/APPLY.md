# Payment terms from master data — how to apply this patch

**Date:** 8 September 2026
**Instruction:** *"In the project Merged_Mockup all payment terms should be a dropdown list, come from master data."*
**Follow-up:** *"Why is it not added to Core modules master data?"* — it is now. See §2.

## Why this folder exists

`MergedMockup\vendor\` is written by `vendorize.ps1`, and its own README says not to edit it:
the next `vendorize.ps1 -Go -Refresh` overwrites the lot. This change touches **three**
prototypes, two of which are vendored copies. So the durable version lives here, and everything
has *also* been applied to `vendor\` and `src\` so the merged mock-up shows it today.

| Folder here | Goes to |
| --- | --- |
| `src\` | `D:\CIMEgypt\COTS_Claude\COTS_Export_Mockup_v2.4\export-process-mockup\src\` |
| `core-src\` | `D:\CIMEgypt\COTS_Claude\COTS_CoreModules_Mockups_Walkthroughs\CoreModules\react\src\` |
| `merged-src\` | `D:\CIMEgypt\COTS_30Aug26\COTS_Export_Merged_Mockup\MergedMockup\src\` — **already applied**, this is the merged project's own source and is not vendored |

Then, in `MergedMockup`:

    powershell -ExecutionPolicy Bypass -File .\vendorize.ps1 -Go -Refresh

`CHANGES.md` here is the merged repo's change log with the 2026-09-08 entry at the top; it has
already been written to `D:\CIMEgypt\COTS_30Aug26\CHANGES.md`.

**Every file is a whole-file replacement**, taken from the version in `vendor\` as of
6 September plus the changes below. If either prototype's own source has moved on since it was
last vendorised, diff before overwriting rather than copying blind.

---

## 1. What the change does

Three screens asked for payment terms as free text — the deal agreement (§6.9), the new purchase
contract (§6.10), and the new execution plan, whose field is the *export* contract's terms and
not the sales contract's. All three now read a governed master.

**Why this field and not another.** The bank submittal maturity date derives from it (§6.14).
A date cannot be derived from prose, and the captured data shows exactly that failure: 865
legacy contracts hold nothing at all, and the eight records that do hold something spell it four
different ways.

| Captured on | Value |
| --- | --- |
| contract PC-2041 | `DA 60 days` |
| contract PC-2044 | `LC at sight` |
| contracts PC-2049 / PC-2055 | `CAD`, `DP` |
| contracts PC-2052 / PC-2058-LV | `TT 30 days`, `LC 90 days` |
| deal OPP-2026-014 | `60 days from B/L date, D/A` |
| deal OPP-2026-011 | `At sight, D/P` |

**Two levels, one domain.** A term is an instrument plus a tenor. A contract carries the whole
term, because the maturity date is computed from its tenor; every captured execution plan
carries the instrument alone, because the export contract's terms are agreed with the bank and
not with the buyer. Modelled as a parent list and a child list — the shape `commodity` and
`grade` already use.

**Values the master does not hold are kept and marked, never blanked.** The two long spellings
above are deliberately excluded — a master holding two spellings of one term is the problem it
was created to solve — so they show as an extra option reading *not in the master*. That path is
live: OPP-2026-014 is the deal the create screen prefills from.

### The finding worth escalating

**OPP-2026-011 is the deal PC-2041 was raised from.** The deal says `At sight, D/P`; the
contract says `DA 60 days`. Different instrument *and* different tenor — not two spellings of
one term. Nothing could have caught this while both fields were free text. It is recorded, not
corrected: which is right is a commercial question for the trader and Dubai Execution.

---

## 2. Where the master lives, and why that changed

The first pass put the list inside the Export prototype, beside the five masters added on
6 September — packing sizes, B/L consignees, commodity types, bank branches, container types —
each of which carries an open question reading *which governed domain in C03 does this belong
to*. That made six unclosed questions instead of closing one.

C03's own domain browser already states the rule, in these words:

> Nothing is entered as free text anywhere in COTS where a master record exists.

A list held inside one module is not a master; it is a second copy. So payment terms are now a
**C03 domain**, and Export reads it.

### Two new C03 domains, in the Financial group beside `incoterm`

| Domain | Records | Governance | Why |
| --- | --- | --- | --- |
| `paymentinstrument` | 5 — LC, DA, DP, CAD, TT | Immediate activation | A closed list; adding one carries no risk. The call `currency` makes. |
| `paymentterm` | 11 — an instrument plus a tenor | **Approval required** | Its tenor moves a payment date. The call `fxrate` makes. |

Each of the six terms a captured contract carries names that contract in its `dependencies` —
what a real C03 record would show before anyone tried to deactivate one.

### Export subscribes; it is not patched

The Export prototype builds and runs on its own, where `@core/*` does not resolve. It cannot
import C03, and should not be made to depend on Core for a list it must be able to show alone.
So its list becomes the **default**, and `setPaymentTermsSource` lets an integrator replace it.
`src\integration\MasterDataSync.tsx` in the merged project reads the **active** C03 records from
the Core store and pushes them in — the direction `CountrySync` established, mounted beside it
in `main.tsx`.

Consequences worth knowing:

- **Only Active records cross.** Approve a term in C3 and it appears in the contract's drop-down
  without a reload; leave it in Draft and it does not. That is the point of governing the domain.
- **Each screen names the master it is reading** — *the Export prototype's own list* standalone,
  *C03 master data — the payment-term domain* integrated — so the wiring is visible rather than
  something a reviewer has to be told about.
- **An empty C03 result is not pushed.** A renamed domain would otherwise blank every
  payment-terms field and make a contract unsaveable; the Export default stands instead, which
  is wrong visibly rather than invisibly.
- **The two lists are identical, and that is checked.** The C03 records map to exactly Export's
  eleven terms and five instruments, so switching the source changes nothing on screen except
  the name of the master. The change is where the data lives, not what it says.

---

## 3. File by file

### Export prototype — `src\`

| File | Change |
| --- | --- |
| `data\master.ts` | New payment-terms section appended; nothing existing is touched. `DEFAULT_PAYMENT_INSTRUMENTS` and `DEFAULT_PAYMENT_TERMS` (the standalone lists), the `paymentInstruments()` / `paymentTerms()` / `paymentTermsSourceName()` accessors, the `setPaymentTermsSource` / `clearPaymentTermsSource` seam, and the lookups `paymentTermByLabel`, `isMasterPaymentTerm`, `paymentInstrumentByCode`, `isMasterPaymentInstrument`. |
| `pages\purchase-contract-new.tsx` | `pc-payment-terms` becomes a `SelectInput` over `paymentTerms()`, with the extra-option rule for a term the master does not hold. Banner gains a sentence. |
| `pages\origination.tsx` | `deal-payment` becomes a `SelectInput` over the same list. The import is aliased `paymentTerms as paymentTermMaster`, because `DealAgreementForm` has a local state variable of that name. |
| `pages\execution-plan-form.tsx` | `ep-payment-terms` becomes a `SelectInput` over `paymentInstruments()`. |
| `__tests__\routes.test.tsx` | One new `describe` with seven tests, plus import lines. |

**Read through the accessors, never the `DEFAULT_*` arrays.** A screen reading the array directly
would show the prototype's list while its neighbour showed C03's — the two-copies problem one
level down.

### Core prototype — `core-src\`

| File | Change |
| --- | --- |
| `mockData\c3.ts` | Two `DOMAINS` entries beside `incoterm`; `paymentMasterRecords` (sixteen records, spread into `seedMasterRecords`); `DOMAIN_ATTRS` for both domains. |
| `mockData\c2.ts` | Two shortcut chips in `SUB_MODULES.C3` — *Payment terms* and *Payment instruments*. That strip is a shortcut list and not the domain list: every domain is reachable through **Domains**, and only the domains modelled in full carry a chip. Both new ones are, so both get one. |

### Merged project — `merged-src\` (already applied)

| File | Change |
| --- | --- |
| `integration\MasterDataSync.tsx` | New. Reads the active C03 payment records from the Core store and pushes them into Export. |
| `main.tsx` | Mounts it inside `CountrySync`, above the routes. |

---

## 4. Verified

Type-checked and run in a clean container against this exact source:

- `tsc` over `vendor\export` — no new errors. The only two reported are pre-existing and known:
  `import.meta.env` in `App.tsx` and the long-standing `inert` prop in `Shell.tsx`.
- `tsc --strict` over the modified `c3.ts` — clean. Every `modelled` domain has attribute
  definitions, including the two new ones.
- `vitest run` over `routes.test.tsx` — **193 passed**, which is the existing 186 plus seven new.
- A parity check: the C03 records map to byte-identical output to Export's eleven default terms
  and five default instruments.

`MasterDataSync.tsx` and `main.tsx` could not be type-checked here — they need `vendor\core` and
`vendor\shared`, which were not staged. Run `npm run typecheck` in `MergedMockup` after applying.
The rest of the Export test suite was not run either; run it in the Export prototype.

---

## 5. Open for the business

1. **Who owns the two new domains?** Payment terms are arguably a treasury matter rather than a
   commercial one, and no source names an owner. `Group Commercial` is shown because that is
   what `incoterm` carries, and the domain browser already says the owners are placeholders.
2. **Which is right on PC-2041** — the contract's `DA 60 days` or its deal's `At sight, D/P`?
3. **Are the two long spellings corrected** on OPP-2026-014 and OPP-2026-011, or kept as
   captured? A cleansing decision, not a screen decision.
4. **Should the bank submittal maturity date now be derived** from the term's tenor rather than
   typed? `tenorDays` is held against that day. It changes a Phase 14 rule, so it is not done here.
5. **Two attribute-level lists inside C03 now shadow the new domain** and should be re-pointed at
   it: `supplier` carries a *Payment terms* select with four options of its own — *Cash against
   documents, Documents against acceptance, 30 days net, 60 days net* — and `warehouse` carries a
   *Payment terms* free-text attribute. Re-pointing an attribute at a domain is a modelling
   decision, so neither is changed here.
6. **The other five Export-local masters need the same treatment** — packing sizes, B/L
   consignees, commodity types, bank branches, container types. One of them is not an open
   question at all: **C03 already holds a `grade` domain** (Commodity group, owner Group Quality,
   coding `GRD-000`), and the commodity-type master added to Export on 6 September duplicates it.
   That is a governed domain being shadowed, and it should be re-pointed the way payment terms
   now are.
