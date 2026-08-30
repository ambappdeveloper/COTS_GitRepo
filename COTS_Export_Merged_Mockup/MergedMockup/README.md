# MergedMockup v1.5 — the COTS integrated mockup

One connected demonstration of the COTS business journey across the three module sets that already
exist: the **Core Modules** (C01–C12), the **Shared Modules** (S01–S11) and the **Export Modules** —
now the **twenty-three phases** of `COTS_Export_End_to_End_Workflow_v2.3`, served by Export mock-up
**v2.4**.

**v1.0 and v1.1 are preserved unchanged** in `..\MergeModule` and `..\MergeModule_v1.1`.

---

## What is new in v1.5 — one country, and it reaches every country

Two observations from the review — *"why my country in header Ethiopia and inner screen Sudan"*, and
*"it changes only between sudan and ethiopia, but not other country"* — turned out to be four defects
stacked on each other. Full account in `docs/v1.5-one-country-everywhere.md`; in short:

| | Before | Now |
| --- | --- | --- |
| Where the country lives | Core and Shared each held their own | Core is the source; `CountrySync` pushes it, **unconditionally** |
| Switching to Tanzania | worked for Sudan and Ethiopia, silently did nothing otherwise | works for every country in the header |
| `/s05/requests` in Tanzania | threw, **unmounting the whole application** — a white page, and every screen after it blank until reload | shows the country gate, resolved from the C10 configuration |
| Shared routes under Tanzania | **24 of 54** rendered | **54 of 54** |
| The season | inherited the previous country's — Sudan's dates under a Tanzania heading | cleared; three screens that need one say so instead |

Nothing invents a country rule. The S05 gate is derived from Core's `COUNTRY_CONTEXT`
(C10 / WF-C10-01 Step 3), which already states which steps are configured off per country and
**agrees with the Shared table on both countries the two have in common**. Shared's own rows are kept
verbatim. Where neither prototype can answer, the screen says so and asks for business confirmation.

### Two things to know

- **A Shared screen can now show "this screen cannot be shown for {country}".** That is an error
  boundary above the Shared routes, and it is the honest state: the prototype holds no season for
  Tanzania or Mozambique. Whether those countries are in scope is a business question, not a bug.
- **`walk.mjs` now lists three React warnings in the reused prototypes** — on `/s02/calculator`,
  `/s07/reports` and `/origination`. They are pre-existing defects in files this project does not
  modify, newly *attributed* to the right screens rather than newly caused; each was reproduced alone
  to be sure. They are tolerated by name only, on those routes only.

## What was new in v1.4 — Export is imported in place, like Core and Shared

Until v1.3 Export was the one contribution this application did not compile. It was loaded as a
**portable build inside an iframe**, with the Core session handed between two origins through
`sessionStorage` so the reviewer was not asked to sign in twice. That machinery is gone.

Export's pages are now imported from its own `src` exactly as Core's and Shared's are, and they
render inside the one Core shell. There is no frame, no second application, no session hand-over and
no third bar inside a frame.

### What that changed

| | v1.3 | v1.4 |
| --- | --- | --- |
| How Export is reached | a portable HTML build in an `<iframe>` | imported from `@export/…`, compiled into this app |
| Export addresses | `/export/<key>`, a bridge key | **Export's own paths** — `/contracts`, `/sourcing/plans`, `/shipments` |
| Sign-in | one session, carried between two origins | one session, because there is one application |
| Export screens walked | the wrapper only | **all 71**, rendered and checked |
| Routes checked | 186 | **255** |
| Export contribution files changed | none | none |

### Export keeps its own paths

This is rule 1 at the head of `src/App.tsx` applied to the third prototype: Core keeps `/c1…/c12`,
Shared keeps `/s01…/s11`, and Export now keeps `/contracts`, `/sourcing/…`, `/shipments` and the
rest. Every internal link inside the Export prototype resolves without one Export file being
changed, and none of its paths collides with Core's or Shared's.

Two addresses are this layer's own: **`/export`**, the module landing page, and
**`/export/springboard`**, because Export calls its springboard `/` and this application's `/` is the
Core home. And **`/export/<key>` is kept as a redirect** — every destination key any version since
v1.1 linked to still lands on the right screen, which `walk.mjs` asserts individually rather than
just checking that something renders.

### Exactly one Export module is substituted

`auth/AuthContext.tsx`. Twelve Export page files call `useAuth()`, and Export's own implementation
authenticates against its demo accounts in `sessionStorage` — which is what used to produce the
second sign-in. `vite.config.ts` redirects that one module to `src/export/ExportAuthBridge.tsx`,
which returns the person who signed in at the Core screen. Remove the redirect and the Export
prototype authenticates exactly as it does standalone.

Nothing else needed replacing. Export's `Shell` and its `global.css` are imported by Export's own
`App.tsx` and by nothing else, and this application mounts Export's routes itself rather than using
that file — so neither is ever loaded.

### The CSS is contained, and the containment adds no specificity

Export's `global.css` restyles `body`, `button`, `a`, `table`, `h1`–`h5`, `ul`, `ol` and
`:focus-visible` at the element level. Loaded as-is it would reach every Core and Shared screen.
`src/export/export-scoped.css` carries the same rules confined to `.cots-export`, the wrapper
`ExportPageFrame` puts around Export's pages.

The confinement uses **`:where(.cots-export)`**, and that detail matters. A plain
`.cots-export a { … }` would raise the rule's specificity from (0,0,1) to (0,1,1) and start beating
Export's own class rules — `.rtab { color: … }` is (0,1,0), and the visible result was the sourcing
tab strip rendering in link blue on its dark band, nearly illegible. `:where()` matches without
contributing specificity, so the cascade inside Export is exactly what it is standalone.

### Two consequences to know

- **`tsconfig.json` targets ES2022**, up from ES2020. The Export contribution targets ES2023 and uses
  `Array.prototype.at`. Core and Shared are unaffected — a higher lib only adds declarations.
- **No dependency was upgraded.** Export's own `package.json` names React 19 and react-router 7, but
  its source uses no API from either that React 18 and react-router 6 do not have — checked, not
  assumed. It compiles against this project's existing dependency tree unchanged.

---

## What was new in v1.3

v1.3 updates the Export contribution and leaves Core and Shared alone. Nothing in the Core, Shared or
Export source trees was modified, no route was removed, and every destination key that worked in v1.2
still resolves.

### The Export bridge was pointing at a build that no longer exists

Every candidate path in `vite.config.ts` named `COTS_Export_Mockup_v1.1`, a folder the project no
longer delivers. The build logged *"the Export portable build was not found"* and every Export screen
showed its not-found state. The candidates now prefer **v2.4**, then v2.0, and keep the v1.1 paths
last so an older checkout still runs.

The session hand-over needed no change: Export v2.4 uses the same `sessionStorage` key and the same
five demo accounts, and `src/integration/session.ts` records that this was re-checked rather than
assumed.

### The twenty-three-phase process, in order, as a model

`src/integration/exportProcess.ts` is new and is the centre of this version. One ordered model of the
twenty-three phases, each carrying the phase name and number, the section it is grouped under, the
Export v2.4 screens that serve it, the owner the workflow names *or the fact that it names none*, the
statuses it states, the Core and Shared capabilities the phase uses, and every `[OPEN]`,
`[ASSUMPTION]`, `[PROPOSED]` and `[AS-IS]` item that belongs to it.

Three properties of that file are enforced rather than asserted:

- the phases run 1…23 with no gap, no duplicate key, and each section contiguous — checked by an
  invariant that throws at import, because a wrong phase order in front of a business reviewer is the
  one failure this layer exists to prevent;
- every screen path exists in the Export contribution's own `App.tsx` — checked by `walk.mjs`
  against that file, 69 distinct paths against 62 route patterns;
- a field the mock-up or the spreadsheet introduced is typed as such and rendered as such, so it can
  never be presented as a field the workflow states.

### Where the process is visible

| Screen | What it adds |
| --- | --- |
| `/export` | **New.** The module landing page: 23 phases in six sections, in order, with owners, the unresolved-question counts, the screens that serve no single phase, and the two places the sources disagree |
| `/export/<phase>` | A breadcrumb, the phase's position in the twenty-three, a rail of all of them, previous and next in business sequence, and a **phase context panel** — fields, statuses, capabilities and open questions |
| `/journey` | The Export phase each WF-INT step belongs to, read from the model; and the integration gap below |
| `/document-chain` | Each document-chain phase cross-referenced to its v2.3 phase number |

### The one new integration finding

**The seven phases workflow v2.3 inserted have no integrated workflow.** `WF-INT-01` … `WF-INT-14`
were written against the sixteen-phase process; the origin-side intake chain — seasonal purchase
plan, budget, funds, purchase agreement, receiving location, material receipt, warehouse receipt —
is covered by none of them. **No WF-INT workflow has been invented for them.** The absence is stated
on the journey map, and the capability links those phases would need are all marked *proposed*.

It is blocked by the workflow's own **G-31 / D-23**: whether export owns the origin-side intake chain
at all, or sourcing does. §2.2 excluded it; v2.3 brings it in on a business instruction and records
the reversal rather than resolving it.

### Four reusable components, and what they are not

`src/components/` is new: `WorkflowStepper`, `SectionNav`, `CapabilityRail`, `OpenItems`, and a small
`tokens.ts`. All four render no business term and take every string from their props, so they serve
any ordered process, not only this one.

Two honest qualifications, because "reusable" is easy to claim:

- `CapabilityRail` and `OpenItems` hard-code a **provenance vocabulary** — *stated / named /
  proposed*, and *OPEN / ASSUMPTION / PROPOSED / AS-IS*. A consumer with a different vocabulary would
  need those as props. `CapabilityRail` already accepts them; `OpenItems` does not yet.
- Neither has a **second consumer**, which the architecture standard asks for before a shared
  component is created. `docs/adr/0001-integration-layer-components.md` records why they were created
  anyway and what would justify promoting them into the Core design system.

`WorkflowStepper` does **not** duplicate Core's `RouteProgress`: that component is bound to the C04
approval store and decision data, has no previous/next and no route links, and could not serve a
twenty-three-step process.

### What v1.3 does not claim

- **No progress.** Nothing here knows how far a real shipment has got. The rail shows a *position*,
  never a visit record — an earlier draft marked twenty-one phases as reached when a reviewer opened
  phase 22 from a bookmark, and that was removed.
- **No invented rule.** No status the workflow does not state, no owner it does not assign, no
  approval, validation or country rule. Where §6.20's six-state document model appears it is labelled
  *proposed, not stated*, beside the seven state sets the workflow actually observes.
- **Nothing changed inside Export.** The bridge reaches that application; it does not modify it.

---

## What was new in v1.2

### One menu, one login, one shell

The mock-up review asked for a single navigation and a single sign-in. Both are now the Core C2
shell:

- **There is no second bar.** The dark integration bar of v1.0–v1.1 is gone. Every screen — Core,
  Shared, the Export bridge and the integration screens — renders inside the one Core shell, under
  the one COTS header.
- **There is no separate integrated home page.** Signing in lands on the Core home page.
- **There is no country-context screen.** The country is set from the header selector, as in the
  Core prototype. `/` and `/select-country` redirect to `/home`, so no old link dies.
- **The other module sets are on the module screen.** Opening the ☰ menu shows the twelve Core tiles
  and, beneath them, **Other module sets** — Export, Shared Modules, and Import and Distribution
  dimmed as a later phase. The switcher is not repeated anywhere else.
- **The menu appears by privilege.** Identity, audit, logging, configuration and the integration
  layer are shown only where the account's module scope carries **Administration**; reporting follows
  its own scope; the operational Core modules every journey passes through are shown to any account.
  *Business confirmation required: this split is the demonstration rule; the authoritative
  role-to-module list belongs with the C1 role catalogue (WF-C1-03).*
- **The integrated screens are in the profile menu** — the journey map, the export document chain
  and the one Actions Inbox.
- **The login is the Core login, simplified** — the internal/external route toggle and the Windows
  authentication note were removed per the review.

The single sign-in of v1.1 is unchanged: the Core session is handed to the Export prototype, which
opens on the requested screen with no second sign-in, and Export and Shared remain gated on the
account's module scope.

### The export document chain, applied

`COTS_Export_Documentation_Workflow_Integrated` — the Export contribution's document workflow with
the Core and Shared capability injected at each step — is now a screen:
**profile menu → Export document chain**, or `/document-chain`.

It carries the seven phases (P2, P8, P10, P11, P12, P13, P14), and at each one the injected module
with a link to the screen that provides it; the canonical sixteen-document requirement list, showing
which documents C03 governs and which C10 country configuration decides; the six-state model with the
four refusals; the custody chain; and the four document alerts with what each is wired to. Every open
point is listed rather than resolved.

---

## Core files changed in v1.2, and why

v1.0 and v1.1 changed **no** Core, Shared or Export file. v1.2 could not honour the review without
touching Core, because the review is about the Core shell and the Core login. Two files changed, both
your own Core work; the Export contribution is still untouched.

| File | Change | Effect elsewhere |
| --- | --- | --- |
| `…/CoreModules/react/src/layouts/AppShell.tsx` | **Added** an optional `ShellExtensions` context (module sets, extra menu entries, `canSeeModule`, menu title). **Removed** the "CoreModules prototype" text from the header, per the review. Everything else is unchanged. | The added parts render **only** when a provider is present, so the standalone Core prototype, v1.0 and v1.1 behave exactly as before. The header text is gone everywhere — which is what the review asked for. |
| `…/CoreModules/react/src/pages/Login.tsx` | **Removed** the internal/external route toggle and the Windows-authentication note, per the review. The account list, the password rule, the lockout demonstration and the audit note are unchanged. | The simplified login appears in the standalone Core prototype and in v1.0 and v1.1 too, since all of them import the same file. The external-user login route is no longer demonstrated. |

**No Shared file was changed.** The Shared pages render inside the one Core shell because
`vite.config.ts` substitutes the resolved Shared `AppShell` module with
`src/shell/SharedPageFrame.tsx`, which keeps the page title, breadcrumb, season selector and toast and
drops the second app bar. Remove the plugin and the Shared prototype is exactly as it was.

**No Export file was changed.**

---

## What it contains

| | |
| --- | --- |
| New screens | 5 — the Export module landing page (v1.3), journey map, export document chain, Actions Inbox across the modules, Export bridge |
| Core screens reused | 71 routes, imported in place from the Core prototype — unchanged at v1.3 |
| Shared screens reused | 70 routes, imported in place, re-framed into the one shell — unchanged at v1.3 |
| Export process represented | **23 phases** of workflow v2.3, in order, grouped into six UI sections |
| Export screens reused | **71 routes**, imported in place from Export mock-up v2.4, unmodified, at Export's own addresses. All 14 v1.2 keys still resolve, as redirects |
| Integrated workflows represented | 14 — `WF-INT-01` … `WF-INT-14`, plus the document chain. Phases 01–07 are covered by none, and that is stated rather than filled in |
| Reusable components | 4, domain-neutral, in `src/components/` |
| Route check | **255 of 255** routes render with no console error |
| Export link check | **69 of 69** model paths resolve against this application's own route table |
| Redirect check | **10 of 10** `/export/<key>` addresses land on the screen they always did |
| Access-rule check | **10 of 10** cases behave as documented, including the Export screens at their own addresses |
| Menu-privilege check | 3 of 3 menus match the account's scope |
| Accessibility | phase rail at 24px targets and ≥3:1 contrast; position in the accessible name, not colour alone; no page-body horizontal scroll from 480px to 1920px |

```
MergeModule_v1.2/
├── run-mockup.bat · run-portable.bat
├── COTS_Integrated_Walkthrough.md
├── Workflows/
│   ├── README.md
│   ├── COTS_Export_Documentation_Workflow_Integrated.md
│   └── COTS_Export_Documentation_Workflow_Integrated.docx
└── MergedMockup/
    ├── docs/adr/0001-integration-layer-components.md  v1.3 — why four new shared components
    ├── docs/v1.4-export-imported-in-place.md  v1.4 — the frame removed, and what it cost
    ├── docs/v1.5-one-country-everywhere.md    v1.5 — the country switch, and the four defects behind it
    ├── src/integration/CountrySync.tsx        v1.4 — one active country, pushed into the Shared store
    ├── src/integration/countryConfig.ts       v1.5 — the C10 country configuration, read by whoever needs it
    ├── src/integration/SharedCountryModels.ts v1.5 — S05's country table, completed from that configuration
    ├── src/shell/SharedScreenBoundary.tsx     v1.5 — what a Shared screen shows when a country has no data
    ├── src/export/ExportPageFrame.tsx     v1.4 — the frame every Export screen renders in
    ├── src/export/ExportAuthBridge.tsx    v1.4 — the one Export module substituted: its identity
    ├── src/export/ExportKeyRedirect.tsx   v1.4 — /export/<key> kept alive as a redirect
    ├── src/export/export-scoped.css       v1.4 — Export's base CSS, contained with :where()
    ├── src/integration/exportProcess.ts  v1.3 — the 23 phases: screens, owners, statuses, open items
    ├── src/pages/ExportModule.tsx        v1.3 — the Export module landing page
    ├── src/components/WorkflowStepper.tsx v1.3 — position in an ordered process; prev / next
    ├── src/components/SectionNav.tsx     v1.3 — a long ordered list, grouped
    ├── src/components/CapabilityRail.tsx v1.3 — the platform capabilities a step uses
    ├── src/components/OpenItems.tsx      v1.3 — what is not decided, tagged as the source tags it
    ├── src/components/tokens.ts          v1.3 — the accents this layer adds, in one place
    ├── src/App.tsx                       the integrated route table — everything inside the Core shell
    ├── src/shell/ShellBridge.tsx         v1.2 — what makes the Core menu the only menu
    ├── src/shell/SharedPageFrame.tsx     v1.2 — Shared pages inside that shell, no Shared file changed
    ├── src/pages/DocumentChain.tsx       v1.2 — the export document chain, injected
    ├── src/integration/documentChain.ts  v1.2 — the chain model, from the integrated workflow
    ├── src/integration/session.ts        v1.1 — the session hand-over and the module-scope rule
    ├── src/integration/useIdentity.ts    v1.1 — the signed-in identity, read from the Core session
    ├── src/integration/RequireModule.tsx v1.1 — the gate, and the access explanation
    ├── src/integration/exportTarget.ts   where the Export application is loaded from
    ├── src/integration/ExportScreen.tsx  the Export bridge
    ├── src/integration/journey.ts        every WF-INT step → the screen that performs it
    ├── src/integration/recordMap.ts      the record spine across the three prototypes
    ├── walk.mjs                          routes, access rule and menu privilege, checked
    └── make-portable.mjs                 the single-file portable build
```

---

## How to run it

### Double-click

| File | What it does |
| --- | --- |
| `run-mockup.bat` | Checks Node, installs on first run, starts the mockup and opens `http://localhost:5180` |
| `run-portable.bat` | Opens the built single file — no Node, no install, no network |

### From a terminal

```bash
npm install
npm run dev          # http://localhost:5180
```

Sign in — the password is `demo` for every account. You land on the Core home page. The ☰ menu is the
whole system; the profile menu holds the journey map, the document chain and the Actions Inbox.

The Export screens need the Export **sources** at
`..\..\COTS_Export_Mockup_v2.4\export-process-mockup\src` — the same arrangement as Core and
Shared, which are also read in place from their own folders. Set `COTS_EXPORT_SRC` to point somewhere
else. Nothing in that folder is copied or modified, and the portable build is no longer used at all.

### The accounts, and what each may open

| Sign in as | Module scope in force | Core menu | Export | Shared |
| --- | --- | :---: | :---: | :---: |
| `nasreen.sayed` | every module | all twelve | ✅ | ✅ |
| `ahmed.osman` | Export · Shared Modules | operational + reports | ✅ | ✅ |
| `meseret.alemu` | Export | operational | ✅ | — |
| `yusuf.kamal` | Shared Modules | operational | — | ✅ |
| `fatima.idris` | Reports and Dashboards | operational + reports | — | — |

### Checking it

```bash
npm run build
npx vite preview --port 4180 &
node walk.mjs        # needs playwright: npm i -D playwright && npx playwright install chromium
```

`PW_EXECUTABLE_PATH=/path/to/chrome` runs it against a Chromium already on the machine, for a build
agent with no access to Playwright's download CDN. The script exits non-zero on any failure, so it
can be a gate rather than a report.

Last run: **255 of 255 routes ok · 69 of 69 model paths resolve · 10 of 10 access cases · 3 of 3 menus
by privilege · 10 of 10 redirects · 4 of 4 model comparisons agree.**

The frame-mode table that stood here until v1.3 is gone with the frame. Export is compiled into this
application, so its screens render the same way in `npm run dev`, in `vite preview` and off a folder
— there is nothing left that behaves differently by origin.

---

## The record spine

| Module set | Record |
| --- | --- |
| Export | purchase contract **PC-2041** (`ct-1`), SAP reference **SAP-88104**, shipment **PC-2041.1** (`sh-1`) |
| Export — origin intake (v1.3) | plan **SPP-2026-0002**, budget **BGT-2026-0001**, agreement **1123_220822514**, fund **FND-2026-0005**. **Unconnected to PC-2041** — at v2.4 the only link between the two halves of the module is that an agreement may name a plan, and the workflow asserts no more (G-31 / D-23) |
| Shared | deal **DEAL-0455** with locked costing snapshot **CS-0271**; plan **MP-SD-2526**; **NC-0087**; **VAR-0051**; **MOV-0552**; claim **CL-0181**; feedback **FB-0233** |
| Core | country **Sudan (SD)**, the governed buyer and commodity records, the approval routes |

`src/integration/recordMap.ts` is the only place these are tied together, and every identifier in it
already existed in one of the three prototypes.

---

## Known integration gaps

1. **Country context is not applied inside Export.** The active country is carried onto the session,
   but the Export screens have no country filter of their own.
2. **The Export queue is linked, not merged.** The Actions Inbox shows Core and Shared tasks in one
   list; Export keeps its own queues, linked from it. Since v1.4 that is a business decision about
   three task models rather than a technical limit.
3. ~~**The Export prototype keeps its own header** inside the frame.~~ **Resolved at v1.4** — there
   is no frame and no second header. Export's `Shell` is simply never imported.
4. ~~**Sign-out is one-way.**~~ **Resolved at v1.4** — there is one session, held by Core, and Export
   has no sign-out of its own to disagree with it.
5. **The role mapping is approximate** — Core has seven roles, Export offers five demo accounts.
6. **The privilege split for the Core menu is a demonstration rule**, not the C1 role catalogue.
7. **Import and Distribution** is named in the menu and dimmed; there is no source material for it.
8. **The document chain screen explains the states; it does not run them.** Draft → confirmed →
   original is described, not clickable — the four refusals are stated, not enforced.
9. **Phases 01–07 have no integrated workflow** (v1.3). See *The one new integration finding* above.
   Their capability links are proposals, not bindings.
10. **The Export mock-up's own phase model is still the sixteen phases of workflow v2.0** (v1.3).
    `export-process-mockup/src/domain/workflow.ts` holds `WF01`…`WF16` and its process-map screen is
    captioned "the sixteen phases". The mapping is exact and additive — v2.0's phase *n* is v2.3's
    phase *n* + 7 — and `exportProcess.ts` carries it as `mockupPhaseId`. Nothing in the Export
    contribution was changed to accommodate this.
11. **Workflow v2.3 §16.1 says phases 01 and 02 have no screen. They do** (v1.3), built across
    mock-up v2.1–v2.4. The workflow governs behaviour and the mock-up governs presentation, so the
    screens are recorded as present and the statement is marked superseded rather than contradicted
    in silence.
12. **`OpenItems` has no second consumer** and hard-codes the provenance tag vocabulary. See the ADR.

## Business confirmations still required

Carried from `COTS_Integrated_Workflows` and from the document-chain injection, and shown in place on
the journey map and the document chain screen:

- Which document requirement list is canonical — the contract's fifteen or the shipping instruction's
  sixteen (I-1).
- Whether the Export screens take the **active country and permission scope** from the Core session on
  build (I-2).
- Whether demurrage and storage is a commercial claim (S07) or a compliance case (S04) (I-3).
- Who approves a charge, and to what authority limit (I-4).
- Whether the quality and weight certificate is the output of an S03 inspection or a filed attachment
  (I-5).
- The authoritative **Core role → Export role mapping**, and the authoritative **role → Core module**
  list behind the menu privilege.
- Which application owns the **deal agreement** screen.
- Whether the **Export exceptions queue** becomes rows in the one Actions Inbox.
- The **country and execution contract requirement matrix** behind the WF-INT-04 configuration.
- The approvers and authority limits on the counterparty compliance, warehouse, freight offer, claims
  and operational compliance routes.
- Whether SMA-flagged stock may be allocated to an export purchase contract.
- The target durations behind the overdue alerts.
- Whether the SAP identifiers arrive through the C12 interface or are entered by Dubai Execution.

---

Prototype only: mock data, front-end state, no backend, no persistence, no production security. The
session hand-over between the two prototypes is a demonstration mechanism, not an authentication
design.
