/**
 * The Export process, as the integrated mockup navigates it — v1.3.
 *
 * WHAT THIS FILE IS
 * -----------------
 * One ordered model of the **twenty-three phases** of `COTS_Export_End_to_End_Workflow_v2.3`
 * (26 August 2026), each phase carrying:
 *
 *   · the phase number and the exact phase name, in the document's own order;
 *   · the UI section it is grouped under — a grouping only, which never reorders the phases;
 *   · the screen in the Export mock-up **v2.4** that serves it, and that screen's own list, add,
 *     record and edit routes where it has them;
 *   · the owner the workflow names, or `To be confirmed` where it names none;
 *   · the statuses the workflow states, and whether it states a transition model;
 *   · the Core and Shared capabilities the phase uses, so the phase links to the existing
 *     capability instead of a duplicate built inside Export;
 *   · every `[OPEN]`, `[ASSUMPTION]` and `[PROPOSED]` item that belongs to the phase, carried
 *     unresolved.
 *
 * WHY IT REPLACES THE FOURTEEN-DESTINATION MAP
 * --------------------------------------------
 * Until v1.2 the integrated mockup reached fourteen Export screens through a flat list. That list
 * was built against the sixteen-phase workflow v2.0 and cannot express the current process:
 * workflow v2.3 inserts **seven phases ahead of it** — the seasonal purchase plan, the budget,
 * funds, the purchase agreement, the receiving location, the material receipt and the warehouse
 * receipt — and renumbers the other sixteen to 08–23. The fourteen destinations all still exist and
 * are all still reachable; they are the `legacyKey` values below, so no link written against v1.2
 * dies.
 *
 * TWO DIVERGENCES BETWEEN THE SOURCES, RECORDED RATHER THAN RESOLVED
 * -----------------------------------------------------------------
 * 1. **The Export mock-up's own phase model is still the sixteen of v2.0.**
 *    `export-process-mockup/src/domain/workflow.ts` holds `WF01`…`WF16` and its process-map screen
 *    is captioned "the sixteen phases". Workflow v2.3 has twenty-three. The mapping is exact and
 *    additive — v2.0's phase *n* is v2.3's phase *n + 7* — and is recorded here as `mockupPhaseId`
 *    so the two can be read side by side. Nothing in the Export mock-up is changed by this file.
 *
 * 2. **Workflow v2.3 §16.1 says phases 01 and 02 have no screen. They now do.**
 *    v2.3 was written on 26 August 2026; mock-up v2.1 built the seasonal purchase plan, v2.2
 *    rebuilt it to `Export Plan V1.xlsx`, v2.3 gave the budget its rules and v2.4 reshaped funds
 *    and the purchase agreement. The workflow governs behaviour and the mock-up governs
 *    presentation, so the screens are recorded as present and the workflow's statement is marked
 *    superseded rather than contradicted silently.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE
 * ------------------------------------
 * Every `path` below is a route that exists in `export-process-mockup/src/App.tsx` at v2.4. A phase
 * never links to a screen that was not built: where the workflow defines work the mock-up has no
 * screen for, the phase says so and offers no link.
 */

import type { Owner } from './recordMap';

/* ------------------------------------------------------------------ *
 * The UI grouping
 *
 * Twenty-three top-level navigation entries would be unusable, so the phases are shown in six
 * sections. This is presentation only: the sections partition 1…23 in order, no phase moves, and
 * the business sequence is the phase number.
 * ------------------------------------------------------------------ */

export type PhaseSection =
  | 'Planning & Intake'
  | 'Commercial & Contract'
  | 'Allocation & Execution'
  | 'Logistics & Clearance'
  | 'Shipping & Documents'
  | 'Finance & Close-Out';

/**
 * The six sections, in process order.
 *
 * The phase range is **not** stated here. It is derived from the phases themselves by
 * `sectionRange()` below, because a hand-typed range is a second source of truth that goes stale
 * silently: an earlier draft carried `phases: '01–07'` as a literal, printed it on the landing page,
 * and nothing would have noticed if a phase had moved section.
 */
export const PHASE_SECTIONS: { section: PhaseSection; note: string }[] = [
  {
    section: 'Planning & Intake',
    note: 'The season becomes material at origin. Figure 1 part 1 of the workflow — and every owner in this part is a business confirmation.',
  },
  {
    section: 'Commercial & Contract',
    note: 'The trader’s offer through to the contract and the terms it fixes for everything downstream.',
  },
  {
    section: 'Allocation & Execution',
    note: 'What the shipment will be made of, and what the origin country demands before it can move.',
  },
  {
    section: 'Logistics & Clearance',
    note: 'Freight secured, the cargo cleared, moved and stuffed under supervision.',
  },
  {
    section: 'Shipping & Documents',
    note: 'The document chain. Most of the seventeen quantified day-range targets sit here — the source places them across phases 16–23, and they are the only quantified targets anywhere in the evidence base.',
  },
  {
    section: 'Finance & Close-Out',
    note: 'The bank, the payment, the closed contract and what went wrong.',
  },
];

/* ------------------------------------------------------------------ *
 * What a phase carries
 * ------------------------------------------------------------------ */

/**
 * An item carried with the tag the workflow gave it. Never silently resolved, and never re-tagged.
 *
 * All four of the source's tags are representable, and that matters more than it looks.
 * `AS-IS` and `PROPOSED` sit at opposite ends of the confidence scale — one is observed practice in
 * a live system, the other is a recommendation nobody has agreed. An earlier draft of this file had
 * no `AS-IS` member, so two observed facts were forced into `PROPOSED` and the screen then described
 * them as "recommended and not agreed", which inverts the risk rather than merely mislabelling it.
 */
/**
 * `CLOSED` was added on 3 September 2026, when a follow-up instruction answered two
 * questions this file had recorded as OPEN. Deleting them would have lost the more useful
 * half of the record — that the question was asked, and what the prototype did while it
 * went unanswered — so an answered question is retagged and keeps its text.
 */
export type ItemTag = 'OPEN' | 'CLOSED' | 'ASSUMPTION' | 'PROPOSED' | 'AS-IS';

export interface OpenItem {
  tag: ItemTag;
  text: string;
  /** the §14 decision or §13 gap identifier, where the workflow gives the item one */
  ref?: string;
}

/**
 * A field the phase captures.
 *
 * A bare string is a field **the workflow states**, in its own words — the common case. The object
 * form marks a field that comes from somewhere else, and names where, because a field the mock-up
 * introduced and this file presented as the workflow's own words would be a requirement created by a
 * screen. The screen renders the two differently.
 */
export type PhaseField = string | { text: string; source: 'mockup' | 'spreadsheet'; note?: string };

export const fieldText = (f: PhaseField): string => (typeof f === 'string' ? f : f.text);
export const fieldSource = (f: PhaseField): 'workflow' | 'mockup' | 'spreadsheet' =>
  typeof f === 'string' ? 'workflow' : f.source;
export const fieldNote = (f: PhaseField): string | undefined => (typeof f === 'string' ? undefined : f.note);

/**
 * A status the phase carries.
 *
 * A bare string is a status set the workflow records as **[AS-IS]** — observed in a live system. The
 * object form is for a status model the workflow marks `[PROPOSED]`, which must never be shown as
 * something the workflow states: the whole document-state model of §6.20, for instance, is a
 * proposal, and the seven state sets it would replace are the facts.
 */
export type PhaseStatus = string | { text: string; basis: 'proposed' };

export const statusText = (s: PhaseStatus): string => (typeof s === 'string' ? s : s.text);
export const statusBasis = (s: PhaseStatus): 'as-is' | 'proposed' =>
  typeof s === 'string' ? 'as-is' : s.basis;

/**
 * A Core or Shared capability the phase uses.
 *
 * `basis` is why the link exists, and it is the important field:
 *   · `stated`   — the integrated workflow (WF-INT-01…14) binds this phase to this capability;
 *   · `workflow` — the Export workflow v2.3 names the capability for this phase;
 *   · `proposed` — the capability is the obvious home for work the phase does, and no source
 *                  states the binding. Shown as a proposal, never as confirmed behaviour.
 */
export interface CapabilityLink {
  /** module code as the workflows name it — C04, C07, S03, … */
  code: string;
  label: string;
  owner: Owner;
  /** the screen in this integrated mockup that provides it */
  to: string;
  basis: 'stated' | 'workflow' | 'proposed';
}

export interface PhaseScreen {
  label: string;
  /** a route that exists in the Export mock-up v2.4 */
  path: string;
  kind: 'list' | 'add' | 'record' | 'edit' | 'report' | 'workspace';
}

export interface ExportPhase {
  /** 1…23, the business sequence. Never reordered. */
  no: number;
  /** the destination key used by `/export/<key>` */
  key: string;
  /** the phase name, exactly as §6.n heads it */
  name: string;
  /** the workflow section that defines it */
  section: string;
  group: PhaseSection;
  /**
   * The previous documentation workflow's P-number, where §5 gives one. Thirteen phases have one
   * and ten do not — six because they were never documented, phases 01 and 02 because they
   * postdate both sources, and phases 03–07 because neither source covers them.
   */
  pNumber?: string;
  /** `WF01`…`WF16` in the Export mock-up's own sixteen-phase model, where it has an entry. */
  mockupPhaseId?: string;
  owner: string;
  /** false where the workflow assigns no owning function — all seven of phases 01–07 */
  ownerConfirmed: boolean;
  /** the screen the phase opens on */
  path: string;
  screens: PhaseScreen[];
  /**
   * The fields the phase captures. A bare string is the workflow's own words; the object form marks
   * a field the mock-up or the spreadsheet introduced and says so. See `PhaseField`.
   */
  fields: PhaseField[];
  /**
   * The statuses the phase carries. A bare string is a set the workflow records as [AS-IS]; the
   * object form marks a [PROPOSED] model. Empty where the workflow states none. See `PhaseStatus`.
   */
  statuses: PhaseStatus[];
  /**
   * True only where the workflow states an ordering between the **[AS-IS]** statuses. A proposed
   * transition model does not set this — a proposal cannot be evidence of an existing ordering.
   */
  transitionModel: boolean;
  capabilities: CapabilityLink[];
  open: OpenItem[];
  /** why a reviewer would open this screen */
  why: string;
  /** set where the phase or its screens changed at mock-up v2.4 */
  changedAtV24?: string;
  /**
   * Set where the phase or its screens changed at mock-up v2.5 — the business instruction
   * of 3 September 2026.
   */
  changedAtV25?: string;
  /**
   * Set where the phase or its screens changed at mock-up v2.7 — the business instruction
   * of 5 September 2026, which is the same correction twice: a field asking for something
   * the system already held, and a button placed where it had nothing to read from.
   */
  changedAtV27?: string;
  /** the v1.2 destination key this phase answers to, so old links keep working */
  legacyKey?: string;
}

/* ------------------------------------------------------------------ *
 * The twenty-three phases
 * ------------------------------------------------------------------ */

export const EXPORT_PHASES: ExportPhase[] = [
  /* ---- Planning & Intake — phases 01–07 ------------------------------------------------- */
  {
    no: 1,
    key: 'seasonal-plan',
    name: 'Seasonal purchase plan',
    section: '§6.1',
    group: 'Planning & Intake',
    owner: 'To be confirmed',
    ownerConfirmed: false,
    path: '/sourcing/plans',
    screens: [
      { label: 'Seasonal purchase plans', path: '/sourcing/plans', kind: 'list' },
      { label: 'New seasonal purchase plan', path: '/sourcing/plans/new', kind: 'add' },
      { label: 'Plan SPP-2026-0002', path: '/sourcing/plans/spp-2', kind: 'record' },
      { label: 'Edit SPP-2026-0002', path: '/sourcing/plans/spp-2/edit', kind: 'edit' },
    ],
    fields: [
      'Seasonal period — From month and year, To month and year (a month and a year, not a calendar date)',
      'Commodity, quantity in MT and capacity needed, per month of the period',
      {
        text: 'Months generated from the period, in chronological order',
        source: 'mockup',
        note: '§6.1 activity 3 says COTS determines the months and presents them in order; that the grid is generated from the period is how the mock-up implements it.',
      },
      {
        text: 'One row per commodity, one column per month',
        source: 'spreadsheet',
        note: 'The shape of Export Plan V1.xlsx, adopted at mock-up v2.2. §6.1 describes one entry per month and states no layout.',
      },
      {
        text: 'Commodity Group — read from the commodity master, never typed',
        source: 'spreadsheet',
        note: 'A column of the Plan sheet. §6.1 does not name it.',
      },
      {
        text: 'Total QTY/MT — =SUM(row)',
        source: 'spreadsheet',
        note: 'The sheet\u2019s own formula.',
      },
      {
        text: 'Capacity needed MT — =LARGE(row,1)+LARGE(row,2)+LARGE(row,3), derived rather than entered',
        source: 'spreadsheet',
        note: 'The sheet derives capacity; §6.1 has the user enter it. The mock-up follows the sheet, which is why capacity is no longer an input.',
      },
      {
        text: 'Notes, one per commodity row',
        source: 'spreadsheet',
        note: 'A column of the Plan sheet, placed after Total QTY/MT as the sheet places it. §6.1 does not name it.',
      },
    ],
    statuses: [],
    transitionModel: false,
    capabilities: [
      {
        code: 'C03',
        label: 'Commodity master — the commodity and its group',
        owner: 'core',
        to: '/c3/domains',
        basis: 'proposed',
      },
    ],
    open: [
      { tag: 'OPEN', text: 'Which function owns the seasonal purchase plan, and who may edit one once it is saved.' },
      { tag: 'OPEN', text: 'Is the commodity list the COTS commodity master used at §6.12 and §6.13, or a separate seasonal list?' },
      { tag: 'OPEN', text: 'What is Capacity Needed measured in, and what is it compared against?' },
      { tag: 'OPEN', text: 'No status model is defined for a seasonal purchase plan.' },
      { tag: 'OPEN', text: 'May a month be left without a commodity, a quantity or a capacity, and must the plan be complete before Phase 02?' },
      { tag: 'OPEN', text: 'Is the plan held once for the export module, per origin country, or per legal entity?' },
      { tag: 'OPEN', text: 'What becomes of a saved plan when the seasonal period is afterwards changed?' },
      { tag: 'OPEN', text: 'How the seasonal purchase plan relates to the sourcing season process excluded at §2.2.' },
      { tag: 'PROPOSED', text: 'Every statement in §6.1 is [PROPOSED]: it is a business requirement of 26 August 2026, not observed practice.' },
      { tag: 'ASSUMPTION', text: 'The mock-up reads a plan as active while its seasonal period has not ended, because §6.1 defines no status. One function — planActivity — to change if the business means a flag or an approval.' },
    ],
    why: 'Phase 01. The seasonal period, and the commodity, quantity and derived capacity planned for each month it spans.',
    changedAtV24:
      'Built at mock-up v2.1 and rebuilt at v2.2 to the shape of Export Plan V1.xlsx — commodity down, month across, month columns generated from the period, capacity derived by the LARGE formula. Workflow v2.3 §16.1 still records this phase as having no screen; that statement is superseded.',
  },
  {
    no: 2,
    key: 'budget',
    name: 'Budget',
    section: '§6.2',
    group: 'Planning & Intake',
    owner: 'To be confirmed',
    ownerConfirmed: false,
    path: '/sourcing/budgets',
    screens: [
      { label: 'Budgets', path: '/sourcing/budgets', kind: 'list' },
      { label: 'New budget', path: '/sourcing/budgets/new', kind: 'add' },
      { label: 'Budget BGT-2026-0001', path: '/sourcing/budgets/bg-1', kind: 'record' },
      { label: 'Edit BGT-2026-0001', path: '/sourcing/budgets/bg-1/edit', kind: 'edit' },
      { label: 'Budget with no approval status — BGT-2025-0003', path: '/sourcing/budgets/bg-3', kind: 'record' },
      {
        label: 'Edit a budget whose lines name two plans — BGT-2026-0002',
        path: '/sourcing/budgets/bg-2/edit',
        kind: 'edit',
      },
    ],
    fields: [
      'Budget period — From date, To date (dates here, where the seasonal period is a month and a year)',
      'Plan, from a drop-down',
      'QTY / MT',
      'Amount',
      'Supplier',
      'Approval Status, recorded last',
      {
        text: 'Commodity — offered as only what the selected plan carries',
        source: 'mockup',
        note: 'Added by the business instruction of 27 August 2026, after workflow v2.3 was written. §6.2 does not name a commodity on a budget line.',
      },
      {
        text: 'Plan — one per budget, held above the budget period rather than per line',
        source: 'workflow',
        note: 'The instruction of 3 September 2026: "budget creation should be one plan and can have multiple budget per commodity." The field order it gives is Plan, then From date, then To date. The Plan column and the Planned-on-the-plan column both leave the line grid as a result.',
      },
      {
        text: 'New fund action on each row of the Budget list, and nowhere else — not in the page header',
        source: 'workflow',
        note: 'The instruction of 3 September 2026 puts the action on the list view; a follow-up of the same date removed the header button it had briefly been given beside New budget. The placement is the purpose: a header button belongs to the tab rather than to a budget, so it would have nothing to capture from and could only open an empty New fund screen — which is what the funds tab\u2019s own button was removed for.',
      },
      {
        text: 'Issued Payment Amount in local currency, with a Payment Date and a read-only USD conversion — Edit screen only',
        source: 'workflow',
        note: 'The instruction of 3 September 2026, and its follow-up of the same date which added the Payment Date. The conversion is "from the master data and read only", so the budget holds the amount and never the rate or the conversion; both are read from the FX master. The payment date settles which date governs: the rate is read on it, exactly as a fund reads its rate on its actual payment date. Before the field existed the mock-up read the rate on the budget\u2019s To date and said so, which survives as the fallback for a captured budget holding an amount and no payment date.',
      },
      {
        text: 'Planned on the plan — the per-commodity reference figure, stated once on the Plan card',
        source: 'mockup',
        note: 'The reference figure the mock-up shows so §6.2\u2019s unanswered reconciliation question can be seen. Not a field §6.2 states. It was a column of the line grid until 3 September 2026, when that column was removed with the line Plan; the figure is now stated once beside the plan, and the per-commodity comparison it existed for is still made below the grid.',
      },
      {
        text: 'Active plans only in the Plan drop-down',
        source: 'mockup',
        note: '§6.1 states that no status model is defined for a plan, so "active" had to be given a meaning — see the ASSUMPTION on phase 01.',
      },
    ],
    statuses: ['Approval status — a field with no stated vocabulary'],
    transitionModel: false,
    capabilities: [
      {
        code: 'C04',
        label: 'Approval workflow — where a budget approval would be performed and recorded',
        owner: 'core',
        to: '/c4/approvals',
        basis: 'proposed',
      },
      {
        code: 'C03',
        label: 'Supplier master — governed, or free text',
        owner: 'core',
        to: '/c3/domains/supplier',
        basis: 'proposed',
      },
      {
        code: 'S02',
        label: 'Costing — the snapshot of §6.8, which the workflow relates to the budget in no way at all',
        owner: 'shared',
        to: '/s02',
        basis: 'proposed',
      },
    ],
    open: [
      { tag: 'OPEN', text: 'What values does the approval status take, who may set them, and does the field record an approval made elsewhere or perform one in COTS?' },
      { tag: 'OPEN', text: 'Is any sequence between approval-status values enforced? The mock-up enforces none and allows the field to be cleared.' },
      { tag: 'OPEN', text: 'May a budget that is not approved be used at Phase 03, funds, or by any later phase?' },
      { tag: 'OPEN', text: 'Must the budget period fall inside the seasonal period of the plan it names?' },
      { tag: 'OPEN', text: 'Must the budget quantity reconcile with the quantity planned?' },
      { tag: 'OPEN', text: 'What currency is Amount in — one currency, or chosen per budget?' },
      { tag: 'OPEN', text: 'Is Supplier the COTS supplier master, the same one the sourcing intake uses, or free text?' },
      { tag: 'OPEN', text: 'Which function owns the budget, and who may edit one once it is saved.' },
      { tag: 'OPEN', text: 'No relationship is asserted between the budget amount and the costing snapshot of §6.8.' },
      { tag: 'CLOSED', text: 'Which date governs the exchange rate behind the issued payment amount\u2019s USD conversion? ANSWERED by the follow-up instruction of 3 September 2026, which adds a Payment Date to the Edit screen: the rate is read on it, so one rule now covers the budget and the fund instead of one rule and one reading. The budget\u2019s To date survives only as the fallback for a record saved before the field existed, and every screen names which of the two dates it read.' },
      { tag: 'OPEN', text: 'What is the issued payment amount issued against — the budget as a whole, or a line of it? The instruction puts one field on the budget, so one is held, and no reconciliation against the line amounts is asserted.' },
      { tag: 'OPEN', text: 'What becomes of a budget saved before one plan per budget was the rule, whose lines name two plans? The mock-up says so on the Edit screen and writes one plan to every line on save; a line whose commodity the chosen plan does not carry is refused rather than having its commodity dropped.' },
      { tag: 'PROPOSED', text: '§6.2 is [PROPOSED] throughout — a business requirement of 26 August 2026.' },
    ],
    why: 'Phase 02. The one plan the budget is written against, the budget period, and a line per commodity carrying the quantity, the amount and the supplier — plus the approval status and the issued payment amount.',
    changedAtV24:
      'v2.3 gave the budget its first stated rules: the plan list offers active plans only, the commodity list only what that plan carries, and both are enforced in the service layer as well as the drop-down. The rule is applied asymmetrically — a closed plan is accepted on edit where the budget already named it, and refused when newly added.',
    changedAtV25:
      'Reshaped at v2.5 on the business instruction of 3 September 2026. The Plan moves out of the line grid and above the budget period: one plan per budget, and a line per commodity beneath it. Two columns go from the Budget information card as a consequence — Plan, because it would hold the same value on every row, and Planned on the plan with it, because it read from the line\u2019s plan; the figure is now stated once on the Plan card and the per-commodity comparison is made below the grid. The Edit screen gains an Issued Payment Amount in local currency, a Payment Date, and a read-only USD conversion taken from the FX master on that payment date — which closes the one question the amount had left open, a budget now reading its rate on its own payment date exactly as a fund does. And the Budget list gains a New fund action on each row \u2014 and only there, a follow-up of the same date having removed the header button it briefly sat beside \u2014 which is now how a fund starts — the same instruction removes the New Fund button from the funds screen — carrying the budget\u2019s season, agent, commodity and amount into the New fund screen, all of them still editable and none of them checked back against the budget afterwards.',
  },
  {
    no: 3,
    key: 'funds',
    name: 'Funds',
    section: '§6.3',
    group: 'Planning & Intake',
    owner: 'To be confirmed',
    ownerConfirmed: false,
    path: '/sourcing/funds',
    screens: [
      { label: 'Funds — no New Fund button as of 3 September 2026', path: '/sourcing/funds', kind: 'list' },
      {
        label: 'New fund prefilled from BGT-2026-0001 — the normal way in',
        path: '/sourcing/funds/new?budget=bg-1',
        kind: 'add',
      },
      {
        label: 'New fund reached with no budget — the screen says so rather than offering an unsaveable form',
        path: '/sourcing/funds/new',
        kind: 'add',
      },
      { label: 'Update fund — paid', path: '/sourcing/funds/fd-1/edit', kind: 'edit' },
      { label: 'Update an unpaid fund — FND-2026-0005', path: '/sourcing/funds/fd-5/edit', kind: 'edit' },
    ],
    fields: [
      'Seasonality',
      'Agent, with its address and telephone filled from the agent record',
      'Commodity',
      'Value in SDG — captured as "value in local currency" on the screen, because §6.3 states SDG and leaves the non-SDG origin countries open',
      'Payment date — captured as "required payment date", with the actual payment date separate',
      'Exchange rate',
      'Value in USD — derived, as value in SDG ÷ exchange rate',
      'Finance rate per cent — stated by §6.3, and no longer captured; see the open item below',
      'Tenor period — stated by §6.3, and no longer captured; see the open item below',
      'Note — stated by §6.3, and no longer captured; see the open item below',
      'Mode of fund — finance, cash or barter; bank on a finance fund, bartered commodity on a barter fund',
      'Fund document',
      'Purchase order, which the fund reference is issued from',
      {
        text: 'PO number and actual payment date on Update only, because neither exists when the fund is requested',
        source: 'mockup',
        note: 'The split across Create and Update comes from the business instruction of 27 August 2026, after v2.3.',
      },
      {
        text: 'Exchange rate read for the actual payment date rather than entered, so an unpaid fund has no rate and no USD value',
        source: 'mockup',
        note: 'The same instruction of 27 August 2026. §6.3 has the rate entered. Confirmed that the real application will read it from an API.',
      },
      {
        text: 'Issued Payment Amount in local currency, on Update, immediately before the actual payment date',
        source: 'workflow',
        note: 'The instruction of 3 September 2026, which also makes it the basis of the conversion: "the calculation of usd conversion is based on the Issued Payment amount." So a fund now carries two local amounts that mean different things — the value requested on Create, and the amount actually issued. A captured fund holding no issued amount still converts, from the value requested.',
      },
      {
        text: 'Payment slip attachment, on Update, beside the issued payment amount',
        source: 'workflow',
        note: 'The instruction of 3 September 2026. Separate from the Fund document: the slip evidences the payment, the document evidences the fund. A file name only, as everywhere in this prototype.',
      },
      {
        text: 'No Seasonality field on the Create screen — the season is read from the budget the fund is raised from',
        source: 'workflow',
        note: 'The instruction of 3 September 2026: the seasonality is already on the budget information card, so asking for it again asks the user to restate what COTS knows and to get it wrong. It is read from the seasonal purchase plan the budget is written against \u2014 whose period is a From and a To month-and-year \u2014 or, for a captured budget naming no plan, from the budget period dates; the screen states which of the two it used. Safe because \u00a76.3 records that no seasonality master exists, so a fund\u2019s season has always been a free string with no master to disagree with. The field stays on the Update screen, where a captured fund may carry a season that needs correcting.',
      },
      {
        text: 'No New Fund button on the funds list — a fund is started from the budget it is raised against',
        source: 'workflow',
        note: 'The instruction of 3 September 2026 removes the button from the funds screen and puts a New fund action on the Budget list instead, so the fund screen opens with the season, agent, commodity and value already filled in from the budget line. The /sourcing/funds/new route still exists; the Budget list is how it is reached.',
      },
      {
        text: 'Fund reference FND-<year>-<sequence> for a new fund',
        source: 'mockup',
        note: '§6.3 states the reference is issued from the purchase order, and the purchase order is no longer on the Create screen. Whether the reference should be unique or follow a stated rule is open.',
      },
    ],
    statuses: [],
    transitionModel: false,
    capabilities: [
      {
        code: 'C07',
        label: 'Documents — the fund document as a register record with its version and access control',
        owner: 'core',
        to: '/c7/register',
        basis: 'proposed',
      },
      {
        code: 'C03',
        label: 'Agent and commodity master data',
        owner: 'core',
        to: '/c3/domains',
        basis: 'proposed',
      },
      {
        code: 'C12',
        label: 'Integration layer — where the exchange-rate API would be registered and its failures queued',
        owner: 'core',
        to: '/c12/interfaces',
        basis: 'proposed',
      },
    ],
    open: [
      { tag: 'OPEN', text: 'Must the purchase order on a fund match an existing purchase agreement? The Material Management Portal does not validate it.' },
      { tag: 'OPEN', text: 'Should the fund reference be unique? It is not in the captured data — 45643123 appears twice.' },
      { tag: 'OPEN', text: 'How are funds held in the origin countries that do not use SDG?' },
      { tag: 'OPEN', text: 'Which function owns a fund, and who may edit one.' },
      { tag: 'OPEN', text: 'The finance rate and the tenor period were captured and nothing consumed them — no interest amount and no maturity date exist. Both are dropped from capture at v2.4 and survive on the record for the captured legacy funds.' },
      { tag: 'OPEN', text: 'What the relationship is between a fund and the agent balance. MMP shows no posting from one to the other.' },
      { tag: 'OPEN', text: 'The exchange-rate API contract: is the rate daily or monthly, which published rate is it, and what happens when a payment falls outside what the source can answer for?' },
      { tag: 'OPEN', text: 'Must the issued payment amount agree with the value requested? Nothing states it must, so a shortfall or an overpayment is reported on the screen and refused nowhere.' },
      { tag: 'OPEN', text: 'Is a fund raised against exactly one budget line? The New fund action on the Budget list carries one line\u2019s season, agent, commodity and amount as a starting point, and nothing is stored linking the fund back to the budget — because no rule ties a fund\u2019s value to a budget line\u2019s amount.' },
      { tag: 'AS-IS', text: 'Every statement §6.3 makes about a fund is [AS-IS] of the Material Management Portal — observed in the live portal, where its documentation states a thing, and [OPEN] where it does not. Nothing about funds is designed.' },
      { tag: 'OPEN', text: 'Does export own the origin-side intake chain, or does sourcing? §2.2 excluded it and v2.3 brings it in on instruction. The reversal is recorded, not resolved.', ref: 'G-31 / D-23' },
    ],
    why: 'Phase 03. Financing raised against a purchase order — requested in local currency, then paid, and only then worth anything in USD.',
    changedAtV24:
      'Reshaped at v2.4 on a business instruction of 27 August 2026. The fields split across Create and Update, and the split tells the business story the single MMP form did not: a fund is requested before it is paid. Purchase Order leaves Create entirely; the exchange rate is read for the actual payment date rather than entered; an unpaid fund shows "not until the fund is paid" rather than a zero. The rate table is a dummy stand-in for an API.',
    changedAtV25:
      'Changed at v2.5 on the business instruction of 3 September 2026, in three places. The payment card gains an Issued Payment Amount in local currency immediately before the actual payment date, and that amount — not the value requested on Create — is what the USD conversion divides; a captured fund holding no issued amount still converts, from the value it does hold. The same card gains a payment-slip attachment, held separately from the fund document. The New Fund button is removed from the funds list: a fund is now started from the New fund action on each row of the Budget list, which opens this screen with the agent, commodity and value taken from the budget line, every one of them still editable. And the Seasonality field leaves the Create screen altogether \u2014 it is already on the budget, so it is read from the budget\u2019s plan, or from the budget period where the budget names no plan, and shown read-only with a note saying which. It remains on the Update screen for a captured fund whose season needs correcting.',
  },
  {
    no: 4,
    key: 'purchase-agreement',
    name: 'Purchase agreement',
    section: '§6.4',
    group: 'Planning & Intake',
    owner: 'To be confirmed',
    ownerConfirmed: false,
    path: '/sourcing/agreements',
    screens: [
      { label: 'Purchase agreements', path: '/sourcing/agreements', kind: 'list' },
      { label: 'New purchase agreement', path: '/sourcing/agreements/new', kind: 'add' },
      { label: 'Agreement 1123_220822514', path: '/sourcing/agreements/pa-1', kind: 'record' },
      { label: 'Over-allocated agreement — 321_2009374', path: '/sourcing/agreements/pa-3', kind: 'record' },
      { label: 'Update agreement', path: '/sourcing/agreements/pa-1/edit', kind: 'edit' },
      { label: 'Agreement with no per-bag tare', path: '/sourcing/agreements/pa-5/edit', kind: 'edit' },
      { label: 'Agent balance list — the CIM report\u2019s two balance bases', path: '/sourcing/balances', kind: 'list' },
      {
        label: 'Agreement with a rejected quality inspection — 321_2009374',
        path: '/sourcing/agreements/pa-3/edit',
        kind: 'edit',
      },
    ],
    fields: [
      'Purchase order, which the agreement reference is issued from',
      'Commodity, supplier, seasonality',
      {
        text: 'The agent account, on the two balance bases of the CIM weekly purchase report: Payments SDG, Agreed Purchases SDG, Balance Basis Agreement, Value Received SDG, Balance Basis Delivery and Cargo not Delivered',
        source: 'spreadsheet',
        note: 'Taken from `Funding - CIM Weekly Purchase Report.xlsx`, sheet Agents Accounts, columns P-W, with its own column names and its own formulas: Balance Basis Agreement = Payments \u2212 Agreed Purchases; Balance Basis Delivery = Payments \u2212 Value Received; Cargo not Delivered = the difference between the two, which reduces to Agreed \u2212 Received. The agent is funded before the goods arrive, so "what does this agent owe us" has two answers and the report computes both; the gap between them is cargo agreed and not yet delivered. Until v2.5 the screen showed funding, drawdown and a residual of ours, which was one basis and a half. Four things the sheet does are reproduced and stated rather than copied silently: barter is excluded from Payments (its Payments column reads only the Cash/Transfer pivot, and the barter pivot beside it is read by nothing); the Balance Basis Delivery annotation is reversed against its own formula; Cargo not Delivered is filled in on three rows of forty-nine and not on the Total row; and a negative basis is a real state in the captured data, so neither is floored at zero.',
      },
      {
        text: 'Purchaser — read from the session on Add, kept as captured on Update; not a field on either screen',
        source: 'workflow',
        note: 'The instruction of 3 September 2026 removes the field. On Add it was already pre-filled with the signed-in user\u2019s display name, so the field existed only to let somebody record an agreement as though another person had struck it — the one thing a purchaser field should not allow. It is read from the session instead. On Update the captured name is kept rather than replaced with the editor\u2019s, because editing an agreement is not taking it over; the update sends no purchaser at all, and the service layer\u2019s partial patch leaves the name the agreement was struck under exactly as it is. Both screens display it read-only, because it is on the record being saved and a value saved without being seen is a value nobody checked. MMP renders a username in the grid and a display name on the detail views; the display name is what is captured.',
      },
      'Total quantity agreed, MT',
      'Agreement date',
      'Per-bag weights for big-pack, small-pack and jute bags — every receipt on the agreement derives its packaging weight from these three',
      'Additional expenses',
      'Agreement and contract documents',
      'Note',
      'Flow status — Open, On going, For Quality Inspection, Hold, Completed, Cancelled',
      'A receipts view: the agreement’s Receiving Plan, Facility Material Receipts and Warehouse Material Receipts together',
      {
        text: 'Agreement Type — Fixed or Collection, Fixed by default: on the Add screen, the list view, the view and the Edit screen',
        source: 'workflow',
        note: 'The instruction of 3 September 2026 gives the two values, the default and the owner; its follow-up of the same date puts the field on all four surfaces. It was briefly Edit-only, on the reading that "modifiable by Procurement Team" made it an update field — the follow-up settles it: the type is chosen when the agreement is struck and changed afterwards. Neither instruction states an effect for either value, so the field is held and nothing downstream is gated on it — the same shape as the budget\u2019s approval status. The list column is filterable, because "show me the Collection agreements" is the question a column of two values exists to answer.',
      },
      {
        text: 'Quality Inspection — several per agreement, entered by the trader or the Quality team: Commodity Type, Supplier Location, Estimated Quantity (MT or bags), Actual Test Date, Results (Approved / Rejected / Re-Test)',
        source: 'workflow',
        note: 'The instruction of 3 September 2026 places the card on the Edit screen before Attachments and notes, and states that multiple inspections are entered. Two readings are marked on the screen: Commodity Type is "based on the commodity requested on the purchase agreement", read as the agreement\u2019s own commodity first and then the rest of the master in the same commodity group; and Estimated Quantity is captured as a number plus its unit so the rows can be totalled, with MT and bags totalled separately and never added.',
      },
      {
        text: 'For Quality Inspection as a flow status, set by hand',
        source: 'workflow',
        note: 'Added by the same instruction, between On going and Hold. Nothing sets it automatically: no rule connects an inspection row to the flow status, and the source contains no transition evidence for any value in the list.',
      },
      {
        text: 'Delivery Updates on the View screen — the total of the Facility Material Receipts, the total of the Warehouse Material Receipts, and what remains to be delivered',
        source: 'workflow',
        note: 'The fourth information card, added by the same instruction. Totalled on gross weight with dirt, the one quantity every receipt carries: a net-weight total would read as though nothing had arrived at a warehouse, because a warehouse receipt can never be priced. The remainder is floored at zero and an over-delivery is reported as one.',
      },
      {
        text: 'Receiving Plan as the label of the allocation card, and Facility / Warehouse Material Receipts as the labels of the two receipt cards',
        source: 'workflow',
        note: 'Relabelled by the same instruction. The figures behind the allocation card are unchanged — what it shows is the receiving-location plan against the agreed quantity, which is what the new label says and the old one did not.',
      },
      {
        text: 'Seasonal purchase plan, which narrows the Commodity list to what that plan carries',
        source: 'mockup',
        note: 'The business instruction of 27 August 2026, after v2.3. It is the first link between the origin-side intake chain and phases 01–02, and §6.4 states no such link.',
      },
      {
        text: 'Is Applicable — whether a per-bag tare applies at all, with the three weights mandatory when it is ticked',
        source: 'mockup',
        note: 'The same instruction. §6.4 leaves "are the per-bag weights mandatory?" open; the flag makes a zero a statement rather than an omission, and does not answer the question.',
      },
      {
        text: 'PO number on Update only, and reference PA-<year>-<sequence> for a new agreement',
        source: 'mockup',
        note: 'Same reasoning as the fund: §6.4 issues the reference from the purchase order, which is no longer on Add.',
      },
      {
        text: 'Agreement date defaults to today, Flow Status defaults to Open',
        source: 'mockup',
        note: 'Defaults the instruction specifies. No transition map is asserted for Flow Status — §6.4 gives five values and no ordering.',
      },
    ],
    statuses: ['Flow status: open, on going, hold, completed, cancelled'],
    transitionModel: false,
    capabilities: [
      {
        code: 'C07',
        label: 'Documents — the agreement and contract attachments as register records',
        owner: 'core',
        to: '/c7/register',
        basis: 'proposed',
      },
      {
        code: 'C03',
        label: 'Supplier and commodity master data',
        owner: 'core',
        to: '/c3/domains/supplier',
        basis: 'proposed',
      },
    ],
    open: [
      { tag: 'OPEN', text: 'What decides whether an agreement can be received against? Three of seven agreements are offered on the receipt forms and the filter is stated nowhere.' },
      { tag: 'OPEN', text: 'What order, if any, the five flow statuses run in. MMP states the five values and no transition evidence of any kind, so only the default is taken.' },
      { tag: 'OPEN', text: 'Are the per-bag weights mandatory? They were not required on the MMP form, yet every receipt’s packaging weight derives from them.' },
      { tag: 'OPEN', text: 'Additional expenses appear on the detail view and on no entry form.' },
      { tag: 'OPEN', text: 'Which function owns an agreement.' },
      { tag: 'OPEN', text: 'What does Agreement Type change? The instruction names the field, the two values, the default and the owner, and states no effect — so nothing downstream reads it.' },
      { tag: 'OPEN', text: 'Should a purchase agreement carry its agreed price? In the source it does — the Purchase Details Master of the CIM weekly purchase report holds Price SDG/MT, Total Cost SDG and Value Delivered SDG on the agreement row — and two columns of the agent account are derived from it. In this model a price exists only on a receipt, put there by the separate pricing step of \u00a76.6, so the agreement basis is reconstructed by reading the price back from that agreement\u2019s own priced receipts. An agreement with no priced receipt has no price to read and contributes nothing, and the screen reports how many are in that position. Until the agreement carries a price, the business\u2019s own figure is reconstructed rather than reproduced.' },
      { tag: 'OPEN', text: 'Does a quality-inspection result gate anything? A rejected inspection does not stop a receipt being booked here, and For Quality Inspection is set by hand rather than by an inspection row, because no rule connects the two.' },
      { tag: 'OPEN', text: 'Is Commodity Type on an inspection the agreement\u2019s single commodity, or the commodity master narrowed by it? Read as the latter — the agreement\u2019s own commodity first, then the rest of its commodity group. If the business means the former, the option list narrows to one entry and nothing else changes.' },
      { tag: 'OPEN', text: 'What quantity does an inspection\u2019s Estimated Quantity relate to — the agreement, a receipt, or a lot at the supplier\u2019s location? MT and bags are held separately and never added, because the per-bag figure on an agreement is a tare and cannot convert a bag count into a tonnage.' },
      { tag: 'OPEN', text: 'Should Delivery Updates total gross or net weight? Gross with dirt is used, because a warehouse receipt can never be priced and so has no net weight — a net total would read as though nothing had arrived at a warehouse. The Intake card beside it continues to show the confirmed net tonnage the weekly production plan reads.' },
      { tag: 'OPEN', text: 'Does export own the origin-side intake chain, or does sourcing?', ref: 'G-31 / D-23' },
    ],
    why: 'Phase 04. The parent record of every intake quantity, and the per-bag tare its receipts inherit.',
    changedAtV24:
      'Reshaped at v2.4. An Update screen where MMP had none. Purchase Order leaves Add. The commodity now comes from a seasonal purchase plan — the first link between the origin-side intake chain and phases 01–02. And the per-bag weights sit behind an Is Applicable checkbox, so "no tare applies" and "somebody left it at zero" stop being the same record; unticking it clears the weights rather than leaving a stale one to be read back as a live tare.',
    changedAtV25:
      'Changed at v2.5 on the business instruction of 3 September 2026, in five places. The View screen relabels the allocation card Receiving Plan and the two receipt cards Facility Material Receipts and Warehouse Material Receipts — labels only; no figure changes. It gains a fourth information card, Delivery Updates, showing the total of each and what remains to be delivered, totalled on gross weight with dirt because that is the one quantity every receipt carries. The Add screen\u2019s flow-status list gains For Quality Inspection, between On going and Hold, set by hand. The Agreement Type of Fixed or Collection, Fixed by default and changed by Procurement, is captured on the Add screen and shown on the list, the view and the Edit screen. The Purchaser stops being a field on either screen: it is read from the session on Add and kept as captured on Update, so an agreement cannot be recorded under a name the person recording it typed, and editing one cannot rewrite who struck it. And the Edit screen gains a Quality Inspection card before Attachments and notes carrying several inspections per agreement — the commodity type, the supplier location, the estimated quantity in MT or bags, the actual test date and a result of Approved, Rejected or Re-Test. No result gates anything, because nothing states that it should: a rejected inspection does not stop a receipt being booked, does not change the flow status and does not refuse a save.',
  },
  {
    no: 5,
    key: 'receiving-location',
    name: 'Receiving location',
    section: '§6.5',
    group: 'Planning & Intake',
    owner: 'To be confirmed',
    ownerConfirmed: false,
    path: '/sourcing/locations',
    screens: [
      { label: 'Receiving locations', path: '/sourcing/locations', kind: 'list' },
      { label: 'New receiving location', path: '/sourcing/locations/new', kind: 'add' },
    ],
    fields: [
      'Purchase agreement, and its agreed quantity',
      'Per line: facility, quantity, assigned to',
      'Multiple plan lines, staged on the page and saved together on submit',
      'The allocation balance against the agreed quantity — which the legacy grid never shows',
      {
        text: 'Warehouse or Facility per plan line, with the location list read from the receiving-location master for the chosen country',
        source: 'workflow',
        note: 'The instruction of 3 September 2026: "Add dropdown field to select either Warehouse or Facility then If warehouse all warehouse listed under that country (as per master data) else if Facility all Facility available in that country as per master data." Until this, the Add screen offered the distinct facility names other plan rows happened to carry — a master lookup masquerading as an autocomplete, in which a location could only ever be chosen once some earlier row had used it, and a warehouse and a facility were the same kind of thing.',
      },
      {
        text: 'The operating country, read from the session and shown read-only — not a field the user fills in',
        source: 'workflow',
        note: 'The follow-up instruction of 3 September 2026: "remove the country dropdown list in the add plan line card (country is automatically read in the core module once the user is login to COTS the settings of country is already available)." So the country is carried on the session — Core\u2019s active country reaches the Export screens through it — and the plan line reads it. It is still displayed, because the location list is scoped by it and a filter nobody can see is a filter nobody can account for; where the session names none the screen says it is reading a default rather than presenting a scope nobody chose.',
      },
      {
        text: 'The location kind on a saved row, classified from the location code where a captured row carries none',
        source: 'mockup',
        note: 'WH… is a warehouse and FC… a facility, so the captured plan rows are classified rather than left blank — otherwise a filter on the list would silently exclude every row saved before the field existed.',
      },
    ],
    statuses: [],
    transitionModel: false,
    capabilities: [
      {
        code: 'C03',
        label: 'Receiving-location master data — the warehouses and facilities of each country, which the plan line\u2019s two lists are read from as of 3 September 2026',
        owner: 'core',
        to: '/c3/domains',
        basis: 'proposed',
      },
      {
        code: 'C02',
        label: 'Actions Inbox — an assignee with work to do is a task with an owner',
        owner: 'integration',
        to: '/inbox',
        basis: 'proposed',
      },
    ],
    open: [
      { tag: 'OPEN', text: 'May the allocated total exceed the agreed quantity, and must every line carry one? The captured data allocates 10,000 MT and 15,700 MT against a 17,777 MT agreement, and a third line carries no quantity at all.' },
      { tag: 'OPEN', text: 'What does Assigned To confer? MMP records an assignee per line and what the assignment means is documented nowhere.' },
      { tag: 'OPEN', text: 'How is a wrong quantity corrected? A saved line’s quantity cannot be edited — the edit form carries the facility and the assignee only.' },
      { tag: 'OPEN', text: 'May a facility appear twice on one agreement?' },
      { tag: 'OPEN', text: 'MMP holds no status field anywhere in this module: no column, no badge, no lifecycle, no approval action. A saved line is a flat record.' },
      { tag: 'OPEN', text: 'Does export own the origin-side intake chain, or does sourcing?', ref: 'G-31 / D-23' },
      { tag: 'OPEN', text: 'What does the Warehouse-or-Facility choice change downstream? A warehouse receipt cannot be priced at all, so a quantity planned into a warehouse cannot reach the weekly production plan by the same route as one planned into a facility, and no source states whether that is intended.' },
      { tag: 'CLOSED', text: 'Where does the country come from? ANSWERED by the follow-up instruction of 3 September 2026: Core reads it when the user signs in to COTS, so it is carried on the session and the plan line reads it. The drop-down is gone. What remains is showing it, which the screen does, and saying so where the session names none.' },
      { tag: 'OPEN', text: 'Is the receiving-location master one register with a country attribute, or one register per country? Modelled as the former, because "listed under that country" describes it and it collapses to the latter by filtering.' },
    ],
    why: 'Phase 05. Which warehouse or facility each agreed quantity arrives at, and who is accountable for it.',
    changedAtV25:
      'Changed at v2.5 on the business instruction of 3 September 2026. The plan line gains a Warehouse-or-Facility choice, and the location list stops being the names other plan rows happened to carry: it is read from the receiving-location master, filtered by that choice and by the country. That master is new at this version and holds the three location strings the captured rows already carry, classified by their own WH/FC prefix, so no saved row names a location the master does not have. The Receiving location list gains a Location type column and filter, and the agreement\u2019s Receiving Plan card shows the kind of each line. The country the two lists are filtered by is read from the session rather than asked for — the follow-up instruction of the same date removed that drop-down, Core already holding the operating country from sign-in — and it is shown read-only, because a filter nobody can see is a filter nobody can account for.',
  },
  {
    no: 6,
    key: 'material-receipt',
    name: 'Material receipt',
    section: '§6.6',
    group: 'Planning & Intake',
    owner: 'To be confirmed — Sourcing prices the receipt',
    ownerConfirmed: false,
    path: '/sourcing/intake',
    screens: [
      { label: 'Material receipts', path: '/sourcing/intake', kind: 'list' },
      { label: 'New material receipt', path: '/sourcing/intake/new', kind: 'add' },
      { label: 'Receipt 220551007', path: '/sourcing/receipts/ir-1', kind: 'record' },
      { label: 'Receipt whose bag counts MMP prints as 13123123', path: '/sourcing/receipts/ir-5', kind: 'record' },
    ],
    fields: [
      'Purchase agreement — supplier, commodity, seasonality and purchase order follow from it',
      'Facility, receipt date, and whether the material came from the supplier or from a warehouse',
      'Weighbridge, vehicle plate, driver, driver’s telephone',
      'Bag counts by type — big-pack, small-pack, jute — and total bags, derived',
      'Gross weight with dirt, MT',
      'Packaging weight — derived from the agreement’s per-bag weights',
      'Reference number',
      'Pricing, on a separate Sourcing step: price per pound, dirt per tonne, agent’s declared net weight, receipt status',
      'Derived on pricing: net weight, purchase amount, commission amount, receipt variance',
    ],
    statuses: ['Receipt status: need review, confirmed — set on the pricing screen only'],
    transitionModel: false,
    capabilities: [
      {
        code: 'S03',
        label: 'Quality — inspection on arrival against the commodity standard',
        owner: 'shared',
        to: '/s03/inspections',
        basis: 'proposed',
      },
      {
        code: 'S04',
        label: 'Compliance — where a receipt variance against the agent’s declared net weight would become a case',
        owner: 'shared',
        to: '/s04/cases',
        basis: 'proposed',
      },
      {
        code: 'C08',
        label: 'Audit trail — who priced a receipt, and what a re-pricing changed',
        owner: 'core',
        to: '/c8/search',
        basis: 'proposed',
      },
    ],
    open: [
      { tag: 'OPEN', text: 'What is the filter on the agreement list? Three of seven agreements are offered.' },
      { tag: 'OPEN', text: 'Must a receipt carry a weighbridge gross weight? MMP requires the facility and the receipt date and nothing else, which is how a receipt with no bags and no weight came to be saved.' },
      { tag: 'OPEN', text: 'A non-zero receipt variance against the agent’s declared net weight: what happens, and who resolves it? MMP records the number and no action.' },
      { tag: 'OPEN', text: 'What unit is Dirt per Ton in?' },
      { tag: 'OPEN', text: 'How the total purchase amount is composed from the purchase value and the agent commission. The MMP label is truncated and states no formula.' },
      { tag: 'OPEN', text: 'Is the receipt status ordered — may a confirmed receipt return to need review?' },
      { tag: 'OPEN', text: 'What does a receipt from a warehouse, rather than from the supplier, change on the form?' },
      { tag: 'OPEN', text: 'Does export own the origin-side intake chain, or does sourcing?', ref: 'G-31 / D-23' },
    ],
    why: 'Phase 06. Per-truck intake at a facility, with the weighbridge gross weight, and pricing as a separate step.',
  },
  {
    no: 7,
    key: 'warehouse-receipt',
    name: 'Warehouse receipt',
    section: '§6.7',
    group: 'Planning & Intake',
    owner: 'To be confirmed',
    ownerConfirmed: false,
    path: '/sourcing/warehouse',
    screens: [
      { label: 'Warehouse receipts', path: '/sourcing/warehouse', kind: 'list' },
      { label: 'New warehouse receipt', path: '/sourcing/warehouse/new', kind: 'add' },
    ],
    fields: [
      'Purchase agreement — supplier, commodity, seasonality and purchase order follow from it',
      'Warehouse, receipt date, and whether the material came from the supplier or from a warehouse',
      'Weighbridge, vehicle plate, driver, driver’s telephone',
      'Bag counts by type, and gross weight with dirt, MT',
      'Per-bag weights carried from the agreement',
      'Reference number',
    ],
    statuses: [],
    transitionModel: false,
    capabilities: [
      {
        code: 'S06',
        label: 'Stock — the warehouse position the receipt adds to',
        owner: 'shared',
        to: '/s06/stock',
        basis: 'proposed',
      },
      {
        code: 'S03',
        label: 'Quality — the storage inspection and pest control programmes on the warehouse',
        owner: 'shared',
        to: '/s03/programmes',
        basis: 'proposed',
      },
    ],
    open: [
      { tag: 'OPEN', text: 'Is a warehouse receipt meant to be priced, and if so where? In MMP both the edit and the pricing routes fail, so it carries no receipt status at all. The unresolved area is preserved rather than filled in.' },
      { tag: 'OPEN', text: 'What is the difference in business meaning between a material receipt and a warehouse receipt? The warehouse receipt’s own detail page is titled "Display Material Receipt Form".' },
      { tag: 'OPEN', text: 'Does a warehouse receipt feed the weekly production plan at Phase 13, as a confirmed material receipt does?' },
      { tag: 'OPEN', text: 'What is the filter on the agreement list — the same unstated one as the material receipt form.' },
      { tag: 'OPEN', text: 'A warehouse receipt can be saved with zero bags and zero weight.' },
      { tag: 'OPEN', text: 'Does export own the origin-side intake chain, or does sourcing?', ref: 'G-31 / D-23' },
    ],
    why: 'Phase 07. The same capture at a warehouse — which the legacy system cannot price at all.',
  },

  /* ---- Commercial & Contract — phases 08–12 --------------------------------------------- */
  {
    no: 8,
    key: 'opportunity',
    name: 'Opportunity and commercial assessment',
    section: '§6.8',
    group: 'Commercial & Contract',
    mockupPhaseId: 'WF01',
    owner: 'Trader (commercial)',
    ownerConfirmed: true,
    path: '/origination',
    screens: [
      { label: 'Opportunities', path: '/origination', kind: 'list' },
      { label: 'New opportunity', path: '/origination/new', kind: 'add' },
      { label: 'Opportunity OPP-2026-014', path: '/origination/op-1', kind: 'record' },
      { label: 'Long and short position', path: '/origination/position', kind: 'report' },
    ],
    fields: [
      'Long and short position report',
      'Cost estimate — commodity, selling location, terms of sale / Incoterms',
      'Raw material price, sales price, Incoterms, profit margin',
      'Other costs, where a cost was calculated outside the system',
      'Declared position — long (allocated) or short (still to be purchased)',
      'Expected raw purchase price, where short',
      'Costing snapshot, retained against the opportunity',
    ],
    statuses: [],
    transitionModel: false,
    capabilities: [
      { code: 'S02', label: 'Costing — the cost estimate and the snapshot', owner: 'shared', to: '/s02/calculator', basis: 'stated' },
      { code: 'S02', label: 'Costing — declare the long or short position', owner: 'shared', to: '/s02/deal', basis: 'stated' },
      { code: 'C11', label: 'Reporting — the long and short position report published once', owner: 'core', to: '/c11/reports', basis: 'workflow' },
      { code: 'C03', label: 'Master data — the buyer and commodity must be governed records first', owner: 'core', to: '/c3/domains/buyer', basis: 'stated' },
    ],
    open: [
      { tag: 'OPEN', text: 'Whether an offer requires review or approval before a deal is agreed, and by whom, and to what authority limit.' },
      { tag: 'OPEN', text: 'No status model is defined for an opportunity in either source.' },
      { tag: 'PROPOSED', text: 'The costing snapshot is mandatory to the deal agreement, and a short position requires the expected raw purchase price.' },
      { tag: 'PROPOSED', text: 'Costing elements configured per country, applied per MT, per day or per bag.' },
      { tag: 'ASSUMPTION', text: 'Today the estimate is prepared outside COTS — inferred, because the notes describe the costing module as something to be configured.' },
      { tag: 'OPEN', text: 'Costing elements per country are to be provided by Siedahmed and are not yet available. This blocks the cost estimate and therefore the deal gate.', ref: 'D-20' },
    ],
    why: 'Phase 08. The opportunity, its costing snapshot and the declared position that the deal cannot be agreed without.',
    changedAtV27:
      'The New opportunity screen no longer asks for a Trader: it is read from the signed-in session and shown read-only. This is the clean case of the pattern — Phase 08 has exactly one participant, and this screen’s own hint has always said so (owner of Phase 08 — trader (commercial); no other participant is stated in either source), so the person raising the opportunity IS the trader and the session is the source rather than a fallback. There is nothing to inherit from and nothing to copy, because an opportunity is where the chain starts. It also completes the change made at Phase 10 the day before: the trader captured here is what §6.2 activity 2 carries onto the purchase contract, which no longer asks for one either, so the name is entered nowhere and read everywhere — one point of capture, the sign-in, instead of two chances to disagree. The same instruction adds a save: the screen had validated and previewed since v1.0 and written nothing, because the service layer had no create-opportunity operation. It has one now, and it writes the opportunity and nothing else \u2014 no costing, because \u00a76.1 activity 6 makes the estimate a separate step against a saved opportunity; no deal, because \u00a76.2 is a separate gate needing a locked snapshot; and no status, because neither source defines a status model for an opportunity. Checking without saving is kept as its own action.',
  },
  {
    no: 9,
    key: 'deal',
    name: 'Deal agreement',
    section: '§6.9',
    group: 'Commercial & Contract',
    mockupPhaseId: 'WF02',
    owner: 'Trader (commercial), handing to Dubai Execution',
    ownerConfirmed: true,
    path: '/origination/op-1',
    screens: [
      { label: 'Opportunity with the deal hand-off', path: '/origination/op-1', kind: 'record' },
      { label: 'Opportunities', path: '/origination', kind: 'list' },
    ],
    fields: [
      'Buyer, commodity, price, Incoterms, origin country, loading port, port of discharge',
      'Quantity, shipping period with start and end date',
      'Payment terms, notes',
      'The costing snapshot, attached and locked',
      'The long / short declaration from Phase 08',
    ],
    statuses: [],
    transitionModel: false,
    capabilities: [
      { code: 'S02', label: 'Costing — the snapshot locked to the deal, inherited read-only downstream', owner: 'shared', to: '/s02/deal', basis: 'stated' },
      { code: 'C04', label: 'Approval workflow — the counterparty compliance check before the contract proceeds', owner: 'core', to: '/c4/approvals', basis: 'stated' },
      { code: 'C06', label: 'Comments — the hand-off conversation, where the channel today is e-mail', owner: 'core', to: '/c6/discussions', basis: 'proposed' },
    ],
    open: [
      { tag: 'OPEN', text: 'No states are defined for a deal.' },
      { tag: 'ASSUMPTION', text: 'The hand-off channel is e-mail, inferred because the notes describe the deal as "communicated" with no system named.' },
      { tag: 'OPEN', text: 'Whether a deal can be amended after it has been communicated, and what that does to the snapshot.' },
      { tag: 'PROPOSED', text: 'A deal record in COTS carrying the locked snapshot.' },
    ],
    why: 'Phase 09. The agreed data set passed in full to Dubai Execution, with the costing snapshot locked to it.',
  },
  {
    no: 10,
    key: 'contract',
    name: 'Contracts',
    section: '§6.10',
    group: 'Commercial & Contract',
    pNumber: 'P2',
    mockupPhaseId: 'WF03',
    owner: 'Dubai Execution',
    ownerConfirmed: true,
    path: '/contracts',
    screens: [
      { label: 'Contracts', path: '/contracts', kind: 'list' },
      { label: 'New purchase contract', path: '/contracts/new', kind: 'add' },
      { label: 'Contract PC-2041 — North Harbour Foods Ltd', path: '/contracts/ct-1', kind: 'record' },
    ],
    fields: [
      'Buyer, commodity, price, Incoterms, origin country, loading port, port of discharge',
      'Quantity, shipping period, start and end date, payment terms, notes',
      'Document requirement list — sixteen types, set once and inherited',
      'Fumigation treatment — one required choice',
      'Artwork option',
      'Buyer address, defaulted from the buyer master',
      'Commodity quality standards, from master data',
      'SAP sales order; insurance notification',
    ],
    statuses: [
      'Purchase / sales contract: Draft → Approved → Stamped',
      'SAP sales order: Created',
      'Insurance notification: Sent',
    ],
    transitionModel: true,
    capabilities: [
      { code: 'C03', label: 'Master data — buyer address and commodity quality standards default from governed records', owner: 'core', to: '/c3/domains/buyer', basis: 'stated' },
      { code: 'C03', label: 'Master data — the sixteen document types as an effective-dated governed domain', owner: 'core', to: '/c3/domains', basis: 'stated' },
      { code: 'S02', label: 'Costing — the contract inherits the snapshot locked to the deal, read-only', owner: 'shared', to: '/s02/deal', basis: 'stated' },
      { code: 'C04', label: 'Approval workflow — the counterparty compliance route', owner: 'core', to: '/c4/approvals', basis: 'stated' },
      { code: 'C08', label: 'Audit trail — who set the requirement list and what an amendment changed', owner: 'core', to: '/c8/search', basis: 'stated' },
      { code: 'C12', label: 'Integration layer — the SAP sales order reference, and a failed exchange queued', owner: 'core', to: '/c12/exchanges', basis: 'stated' },
      { code: 'S04', label: 'Insurance — the notification the contract sends', owner: 'shared', to: '/s04/insurance', basis: 'workflow' },
    ],
    open: [
      { tag: 'OPEN', text: 'Which system is the record for the contract — SAP, which issues it, or COTS, where the requirement list and its rules are to be enforced?', ref: 'D-09' },
      { tag: 'OPEN', text: 'Which document requirement list is canonical — the contract’s fifteen checkboxes or the shipping instruction’s sixteen?', ref: 'G-07' },
      { tag: 'OPEN', text: 'Whether a contract amendment re-runs the inheritance of the requirement list.' },
      { tag: 'OPEN', text: 'A contract amendment, or a short close of the contracted quantity, is not described in either source.' },
      { tag: 'PROPOSED', text: 'The document requirement list becomes canonical, is set once here, and is inherited by every shipment rather than re-entered on the shipping instruction.' },
      { tag: 'PROPOSED', text: 'Payment terms become mandatory, because the bank submittal maturity date derives from them. They are null on 865 legacy records.' },
      { tag: 'PROPOSED', text: 'Buyer address becomes mandatory and defaults from the buyer master. It is declared required and blank on 865 records.' },
      { tag: 'PROPOSED', text: 'Fumigation becomes one required choice — methyl bromide, phosphine, or no fumigation required — in place of three independent checkboxes.' },
      { tag: 'OPEN', text: 'The commercial document is called the Purchase Contract although it is the sales contract to the buyer.', ref: 'G-25' },
    ],
    why: 'Phase 10. The spine record. The contract fixes the document requirement list, the fumigation choice, the artwork option and the payment terms the bank maturity date derives from.',
    changedAtV27:
      'Two changes, and they are one change twice. The New purchase contract screen no longer asks for a Trader name: it is read from the agreed deal the contract is raised from, from the contract copied by Retrieve PC No., or from the session when a trader is signed in, and shown read-only with its source named. The removed control was worse than redundant — its list of names was a constant in the page rather than master data, and did not contain Tomás Ferreira, the trader on OPP-2026-014 and on all six seeded contracts, so the field showed as inherited, empty and blocking, and the only way past it was to overwrite the real trader with a name that was not the trader. Where none of the three sources applies the save is refused with the reason stated, rather than a name being invented — which is the open question this raises. And the Contracts list loses its New shipment from a contract header button for a New shipment action on each row, which is what lets it do what its label said: the shipment screen now arrives with that contract, its execution plan where the contract has exactly one, the shipment type, the quantity still to ship and the last shipping date already filled in. The action is not offered on a cancelled contract or on one already fully committed. A follow-up of the same date puts it in the last column, because it is an action rather than a fact about the contract, and gives the page header a New contract button of its own \u2014 which is what makes the distinction plain: creating a contract reads nothing from any row, so it belongs to the page, while raising a shipment needs a contract to read, so it belongs to the row. A further instruction of 6 September 2026 works on the create screen: the packing size (kg per unit) and the B/L consignee are now chosen from master data rather than typed \u2014 50/25/10/5/1, and CIM, Sayga, DFI or Others \u2014 with a value the master does not hold kept and marked rather than blanked, which is the lesson of the trader drop-down; Others asks for the party to be named, because a bill of lading cannot be consigned to the word \u201cothers\u201d; one artwork design attachment is added; and Actual PC is removed, a field this form captured and then dropped on save because the contract record has none. Two masters are therefore outstanding \u2014 packing sizes and consignees \u2014 and one gap is now visible: bulk cargo has no packing size, so a bulk contract still cannot be raised on this form. A further pass the same day makes the commodity type a drop-down read from a third new master, the grades held for the selected commodity \u2014 dependent rather than merely governed, since one flat list would offer cotton grades against sesame, and an empty list is a real answer because not every commodity is graded. It also removes \u201cRetrieve PC No.\u201d, which took the trader\u2019s third source with it: a contract not raised from a deal now needs a trader signed in, and there is no longer a way to borrow one from an existing contract.',
    legacyKey: 'contract',
  },
  {
    no: 11,
    key: 'contract-review',
    name: 'Cross-functional contract review',
    section: '§6.11',
    group: 'Commercial & Contract',
    mockupPhaseId: 'WF04',
    owner: 'Dubai Execution, as the raiser of the notification',
    ownerConfirmed: true,
    path: '/contracts/ct-1/review',
    screens: [
      { label: 'Contract review — PC-2041', path: '/contracts/ct-1/review', kind: 'workspace' },
      { label: 'Contracts', path: '/contracts', kind: 'list' },
    ],
    fields: [
      'The saved contract and its terms',
      'Four recorded confirmations of ability to fulfil — one each from Quality, Execution, Processing and FP&A',
    ],
    statuses: [],
    transitionModel: false,
    capabilities: [
      { code: 'C05', label: 'Notifications — the alert to each of the four teams', owner: 'core', to: '/c5/rules', basis: 'stated' },
      { code: 'C02', label: 'Actions Inbox — a task each for quality, execution, processing and financial planning', owner: 'integration', to: '/inbox', basis: 'stated' },
      { code: 'C04', label: 'Approval workflow — where a blocking review would be routed and escalated, if it is blocking', owner: 'core', to: '/c4/routes', basis: 'proposed' },
      { code: 'C06', label: 'Comments — each team’s feedback against the contract record', owner: 'core', to: '/c6/discussions', basis: 'proposed' },
      { code: 'S10', label: 'Team directory — resolving each of the four functions to a person who can answer', owner: 'shared', to: '/s10/roles', basis: 'stated' },
    ],
    open: [
      { tag: 'OPEN', text: 'Is the review advisory or blocking, and within what period?', ref: 'D-10' },
      { tag: 'OPEN', text: 'Whether execution may proceed before all four teams have responded. Neither a blocking rule nor an SLA is invented here.' },
      { tag: 'OPEN', text: 'What happens when a team reports that it cannot fulfil the contract terms. No path is described in either source.' },
      { tag: 'OPEN', text: 'The notification channel is not stated. COTS holds the feedback.' },
      { tag: 'OPEN', text: 'Whether the same four teams are notified in every country.' },
      { tag: 'OPEN', text: 'Whether a person may record a response for a function they are not in. The responder is read from the session from 6 September 2026 and is not checked against the row\u2019s function; no source states a rule.' },
      { tag: 'OPEN', text: 'No state model is given for the review or for an individual team’s feedback.' },
    ],
    why: 'Phase 11. Four functions confirm they can fulfil what the contract commits to. Everything about timing, blocking and escalation is open.',
    changedAtV27:
      'The Record feedback dialog no longer asks who responded: it is read from the signed-in session and shown read-only. The third field of this kind in two days and the most clear-cut \u2014 unlike a trader on a contract, the person responding on behalf of a function is whoever is signed in and pressing the button, and a typed name could name somebody who was not there. It also makes an existing gap visible rather than creating one: nothing checks that the signed-in user belongs to the function whose row is being answered, which was already true while the box hid it. \u00a76.4 states no rule tying a responder to a function, so none is enforced and it is recorded as open on the screen itself.',
  },
  {
    no: 12,
    key: 'quality-tags',
    name: 'Quality parameters and tags setup',
    section: '§6.12',
    group: 'Commercial & Contract',
    pNumber: 'P2',
    mockupPhaseId: 'WF05',
    owner: 'Dubai Execution, with the quality team for the parameter set',
    ownerConfirmed: true,
    path: '/contracts/ct-1/quality',
    screens: [
      { label: 'Contract quality and tags — PC-2041', path: '/contracts/ct-1/quality', kind: 'workspace' },
      { label: 'Contracts', path: '/contracts', kind: 'list' },
    ],
    fields: [
      'Standard parameters, retrieved from master data for the commodity',
      'Mandatory commodity parameters — for sesame, the moisture content',
      'Buyer-specific quality requirements, where they vary the standard',
      'Tags / artwork specification — Standard or Buyer option',
      'Batch code, which reprocessing changes',
      'SSMO standards per commodity',
    ],
    statuses: ['Tags / artwork specification: Standard, Buyer option'],
    transitionModel: false,
    capabilities: [
      { code: 'S03', label: 'Quality — the contract quality terms, and any variation recorded against the buyer', owner: 'shared', to: '/s03/contracts', basis: 'stated' },
      { code: 'C03', label: 'Master data — commodity quality standards and SSMO standards', owner: 'core', to: '/c3/domains', basis: 'stated' },
      { code: 'S03', label: 'Quality — the control points at which these parameters are inspected', owner: 'shared', to: '/s03', basis: 'stated' },
    ],
    open: [
      { tag: 'OPEN', text: 'Whether a missing mandatory quality parameter blocks the contract, the shipment, or nothing.' },
      { tag: 'OPEN', text: 'No state model is given for the quality terms.' },
      { tag: 'OPEN', text: 'The standard parameter set per commodity is not yet available. QA formats and forms are to be shared by Asim.', ref: 'D-20' },
      { tag: 'PROPOSED', text: 'Standard parameters are retrieved automatically into the contract from master data and modified where the buyer has specific requirements.' },
      { tag: 'PROPOSED', text: 'A separate flow or form is started for the tags specification.' },
      { tag: 'PROPOSED', text: 'SSMO standards are held per commodity in master data — relevant to the Sudan SSMO certificate at Phase 16.' },
    ],
    why: 'Phase 12. The quality parameters the shipment will be inspected against, and whose tags the bags will carry.',
  },

  /* ---- Allocation & Execution — phases 13–14 -------------------------------------------- */
  {
    no: 13,
    key: 'allocation',
    name: 'Stock allocation and cargo readiness',
    section: '§6.13',
    group: 'Allocation & Execution',
    pNumber: 'P3–P7',
    mockupPhaseId: 'WF06',
    owner: 'Execution team, with the Processing team for readiness feedback',
    ownerConfirmed: true,
    path: '/allocation',
    screens: [
      { label: 'Stock and allocation', path: '/allocation', kind: 'list' },
      { label: 'Long and short position', path: '/allocation/position', kind: 'report' },
      { label: 'Weekly production plan', path: '/allocation/production-plan', kind: 'workspace' },
      { label: 'Warehouse requests', path: '/allocation/warehouse-requests', kind: 'list' },
    ],
    fields: [
      'Finished goods stock and its quality grade',
      'Raw material stock and its processing status',
      'Processing team readiness feedback',
      'Weekly production plan, built on raw materials actually received',
      'Warehouse capacity',
      'Stock reserved against the purchase contract',
      'Short and long position report',
      'Batch code — recorded and deliberately not used for allocation',
      'SMA flag',
    ],
    statuses: ['Stock: under process (raw) → ready as finished good → reserved for the purchase contract'],
    transitionModel: true,
    capabilities: [
      { code: 'S01', label: 'Planning — the master plan and weekly processing plan that give expected availability', owner: 'shared', to: '/s01/processing', basis: 'stated' },
      { code: 'S01', label: 'Planning — warehouse capacity, and the request where it is short', owner: 'shared', to: '/s01/warehouse', basis: 'stated' },
      { code: 'S03', label: 'Quality — the inspection grade carried onto the stock; open non-conformity blocks allocation', owner: 'shared', to: '/s03/inspections', basis: 'stated' },
      { code: 'S06', label: 'Stock — the position, and which stock is held under the Stock Management Agreement', owner: 'shared', to: '/s06', basis: 'stated' },
      { code: 'S01', label: 'Planning — a shortfall taken into the sourcing plan for purchase', owner: 'shared', to: '/s01/sourcing', basis: 'stated' },
      { code: 'C04', label: 'Approval workflow — the multi-department warehouse capacity request', owner: 'core', to: '/c4/approvals', basis: 'stated' },
      { code: 'C11', label: 'Reporting — capacity utilisation as a card at the point of planning', owner: 'core', to: '/c11/cards', basis: 'stated' },
    ],
    open: [
      { tag: 'ASSUMPTION', text: 'The crop year an execution plan is planned in is derived from the contract\u2019s shipment period \u2014 before October draws on the previous crop \u2014 because no record in COTS carries a season. It reproduces every captured plan; the boundary month is not evidenced (6 September 2026).' },
      { tag: 'OPEN', text: 'Whether a contract\u2019s execution plans must sum to its quantity. Rule R1 says a contract may carry several planning lots and states no total, so the create screen warns and does not block (6 September 2026).' },
      { tag: 'OPEN', text: 'May SMA-flagged stock be allocated to an export purchase contract, and on whose authority? The notes state only the reverse direction.', ref: 'D-16 / G-27' },
      { tag: 'OPEN', text: 'What the "enhanced process" for cargo readiness allocation is. The workshop records that one is to be applied and does not describe it.' },
      { tag: 'OPEN', text: 'No stock state names beyond the three above are given.' },
      { tag: 'OPEN', text: 'The order in which the four warehouse-request confirmations must occur is not stated.' },
      { tag: 'OPEN', text: 'Change of intended use from export to local sales, and degraded product, are recorded as special processes with no flow described.' },
      { tag: 'OPEN', text: 'The batch coding structure for raw and finished goods is to be provided by Siedahmed.', ref: 'D-20' },
      { tag: 'PROPOSED', text: 'A confirmed cargo readiness position for the shipment.' },
    ],
    why: 'Phase 13. What the shipment will actually be made of — lots by state and grade, and what each contract has reserved.',
    changedAtV27:
      'The execution plan can now be created. Reviewing the planning tab for the instruction of 6 September 2026 found that it had rendered plans since v1.0 and had no way to make one \u2014 the service layer exposed a list and nothing else \u2014 so a contract raised in the mock-up reached \u201cNo execution plan yet\u201d and stopped there. That mattered beyond this tab: a shipment cannot be raised without an execution plan, so a newly created contract could not reach Phase 15 at all. A New execution plan action now sits in the tab\u2019s header, which is where it belongs because a planning lot is raised against the contract the whole tab is scoped to. The planning number (\u003ccontract no\u003e.n, rule R1), the draft status and the large-volume flag are issued or read rather than asked for; the port of loading, the assigned owner, the ship-before date and the quantity are defaulted from the contract and stay editable. Nothing caps the planned total against the contract quantity, because R1 states no total \u2014 the screen warns and does not block, and that is [OPEN]. The New shipment screen also gains a route to it: a shipment cannot be raised without a plan and that screen cannot make one, so a contract with no plan was a dead end there. A link beside its execution-plan field opens this screen and returns to the shipment with the new plan selected. It is a link and not a second create form, because the plan belongs to the contract rather than to the shipment. A second pass the same day takes four more values off the create screen: the shipper and the bank are chosen from the counterparty master, the shipper\u2019s address follows the shipper and the bank\u2019s branch list follows the bank (a new branch master, keyed by bank); the assigned owner is read from the contract; and the seasonality is derived from the contract\u2019s shipment period rather than entered. That derivation is the one inferred value in the round and is marked [ASSUMPTION]: the contract carries no season, so a crop-year convention is applied \u2014 a period beginning before October draws on the previous crop. It reproduces all seven captured plans, which is evidence for a late boundary and not for October precisely. Whether a contract should carry a season of its own is [OPEN]. A third pass makes the shipment\u2019s container type a drop-down from a new container-type master, defaulted from the purchase contract\u2019s loading container size \u2014 which the contract form had collected since v1.1 and dropped on save, the second such field found in a week. A contract permitting both sizes settles no default, deliberately.'
  },
  {
    no: 14,
    key: 'country-prerequisites',
    name: 'Country-specific execution prerequisites',
    section: '§6.14',
    group: 'Allocation & Execution',
    pNumber: 'P6–P8',
    mockupPhaseId: 'WF07',
    owner: 'Partner Execution at origin',
    ownerConfirmed: true,
    path: '/pre-clearance',
    screens: [
      { label: 'Export contracts and EX forms', path: '/pre-clearance', kind: 'list' },
      { label: 'Advance payments', path: '/pre-clearance/advance-payments', kind: 'list' },
      { label: 'Advance payment ADV-2026-004', path: '/pre-clearance/advance-payments/ap-1', kind: 'record' },
      { label: 'Country and shipment variants', path: '/variants', kind: 'report' },
    ],
    fields: [
      'Origin country, and the country execution requirements matrix',
      'Export contract (EX contract) with its expiry',
      'EX form, and its consumption balance',
      'Export permit',
      'Commercial invoice (Mozambique)',
      'Service request (Sudan)',
      'Advance payment — instructions, amount from FP&A, confirmation',
    ],
    statuses: [
      'Export contract: Requested → Under process → Issued, with an expiry',
      'EX form: Under processing → Issued → Used',
      'Export permit: Applied → Received',
      'Commercial invoice (Mozambique): Issued',
      'Service request (Sudan): New SR onwards',
      'Advance payment: Confirmed',
    ],
    transitionModel: true,
    capabilities: [
      { code: 'C10', label: 'Configuration — which instrument applies in this country, and which steps do not', owner: 'core', to: '/c10/countries/SD/steps', basis: 'stated' },
      { code: 'C07', label: 'Documents — the scanned instrument, its version and its access control', owner: 'core', to: '/c7/register', basis: 'stated' },
      { code: 'C07', label: 'Documents — expiry monitoring, where an authorisation expires before the shipment date', owner: 'core', to: '/c7/expiry', basis: 'stated' },
      { code: 'S05', label: 'Logistics — the Sudan transport service request', owner: 'shared', to: '/s05/requests', basis: 'stated' },
      { code: 'C08', label: 'Audit trail — issuance and custody events', owner: 'core', to: '/c8/search', basis: 'stated' },
    ],
    open: [
      { tag: 'OPEN', text: 'Which country and shipment-type matrix is authoritative? The matrix is provisional and only partly confirmed.', ref: 'D3' },
      { tag: 'OPEN', text: 'Do advance payments apply outside Ethiopia, and must they be confirmed before execution can start in COTS?', ref: 'D-15' },
      { tag: 'OPEN', text: 'Does the EX contract keep a structured state and expiry, or become attachments and notes only?', ref: 'D-13 / G-03' },
      { tag: 'OPEN', text: 'Which system holds the Sudan service request — SAP, the legacy SR form, or Odoo?', ref: 'D-11 / G-06' },
      { tag: 'OPEN', text: 'Is the seven-EX-form ceiling a real business limit or an artefact of the form?', ref: 'D2' },
      { tag: 'OPEN', text: 'Was the navigation decision taken — country then flow, or flow then country? The workshop records the question and the two options and no outcome.', ref: 'D-21 / G-26' },
      { tag: 'OPEN', text: 'Transfer prices between source, transit and export entities are to be prepared by Hiba.', ref: 'D-20' },
      { tag: 'PROPOSED', text: 'An EX form marked Used cannot be consumed again (rule R7). The constraint is stated in a drop-down today and is unenforced.' },
      { tag: 'PROPOSED', text: 'The country requirements matrix becomes configuration rather than a working reference.' },
      { tag: 'PROPOSED', text: 'Odoo is named as the logistics system COTS is to integrate with.' },
    ],
    why: 'Phase 14. What this particular origin country demands before the cargo can move — and the advance-payment chain where one applies.',
    legacyKey: 'pre-clearance',
  },

  /* ---- Logistics & Clearance — phases 15–18 --------------------------------------------- */
  {
    no: 15,
    key: 'freight',
    name: 'Freight planning and booking',
    section: '§6.15',
    group: 'Logistics & Clearance',
    pNumber: 'P9',
    mockupPhaseId: 'WF08',
    owner: 'Logistics, with the Trader for offer approval',
    ownerConfirmed: true,
    path: '/shipments',
    screens: [
      { label: 'Shipments — booking and SI', path: '/shipments', kind: 'list' },
      { label: 'New shipment', path: '/shipments/new', kind: 'add' },
      { label: 'Shipment PC-2041.1', path: '/shipments/sh-1', kind: 'record' },
      { label: 'Freight rate table', path: '/freight-rates', kind: 'list' },
    ],
    fields: [
      'Freight rates maintained monthly for 20-foot and 40-foot containers, by loading port, destination port, commodity and line',
      'Shipping line offers',
      'Freight offer with its validity',
      'Booking number',
      'Charter party agreement, for bulk and break-bulk',
    ],
    statuses: [
      'Freight offer: Received → Selected → Approved, with a validity',
      'Booking confirmation: Not booked → Booking number issued',
      'Charter party agreement: Agreed',
    ],
    transitionModel: true,
    capabilities: [
      { code: 'S05', label: 'Logistics — the freight rate grid by lane, container size, line and validity', owner: 'shared', to: '/s05/rates', basis: 'stated' },
      { code: 'S02', label: 'Costing — the freight element fed from the same rate grid', owner: 'shared', to: '/s02', basis: 'stated' },
      { code: 'C04', label: 'Approval workflow — the freight offer route', owner: 'core', to: '/c4/approvals', basis: 'stated' },
      { code: 'S05', label: 'Logistics — the service request and shipping instruction', owner: 'shared', to: '/s05/requests', basis: 'stated' },
    ],
    open: [
      { tag: 'OPEN', text: 'Who approves a freight offer, and to what authority limit? Neither source says.', ref: 'D-17 / G-23' },
      { tag: 'OPEN', text: 'What rule applies to an expired freight offer. The offer carries a validity and no rule is stated.' },
      { tag: 'OPEN', text: 'Road, rail, bulk vessel and air movements are undesigned. Only the container case is covered.', ref: 'G-16' },
      { tag: 'OPEN', text: 'Whether freight rate maintenance is an automated job — it is not listed among them.' },
      { tag: 'PROPOSED', text: 'The rate entry form is made practical for all rates across different loading and destination points and shipping lines.' },
      { tag: 'PROPOSED', text: 'Integration with SeaRates.com, and with Odoo. Whether either is approved or only proposed is not stated.' },
    ],
    why: 'Phase 15. The rate, the offer, the approval and the booking — and where the free-day exposure starts.',
    changedAtV27:
      'The New shipment screen is now normally reached from a row of the Contracts list rather than from a header button, and arrives with what the contract already determines filled in: the contract, its execution plan where the contract has exactly one, the shipment type, the quantity still to ship — the ceiling less what other live shipments commit — and the last shipping date. Each is labelled with where it came from and every one stays editable: none of them is a rule, and the quantity is still checked against the contract ceiling on save. Where the contract has several execution plans none is chosen, and the screen says so: picking one would be the action inventing rather than reading.',
    legacyKey: 'shipments',
  },
  {
    no: 16,
    key: 'clearance',
    name: 'Pre-clearance and regulatory processing',
    section: '§6.16',
    group: 'Logistics & Clearance',
    pNumber: 'P8, P10',
    mockupPhaseId: 'WF09',
    owner: 'Partner Execution at origin; the Clearance team for the clearance entry',
    ownerConfirmed: true,
    path: '/clearance',
    screens: [
      { label: 'Clearance and regulatory', path: '/clearance', kind: 'list' },
      { label: 'Clearance workspace — PC-2041.1', path: '/clearance/sh-1', kind: 'workspace' },
      { label: 'Pre-clearance pack and custody', path: '/pre-clearance', kind: 'list' },
    ],
    fields: [
      'Pre-clearance pack — the scanned document with a date and a user',
      'Custody receipts at OPU, then PZU',
      'Customs declaration',
      'EX form consumption per form — form number, quantity, PS file number, export certificate number, declaration number, form marked Used',
      'SSMO sampling, certificate and analysis',
      'Fumigation, started and finished',
      'Phytosanitary request; SSMO, Health and Veterinary, Plant Protection examinations; SPC dated',
      'Clearance information entry, and the Excel reports in the required template structure',
    ],
    statuses: [
      'Pre-clearance document pack: (blank) → Reviewed → Received by OPU → Received by PZU',
      'Customs declaration: Submitted → Released',
      'SSMO certificate and analysis: Sample taken → Certificate issued (Sudan)',
      'Customs export certificate: Issued (Sudan)',
      'SPC: Dated (Sudan)',
      'TRA release order, TANCIS declaration, atomic certificate: Issued (Tanzania)',
      'Transit documents: Issued (Chad)',
    ],
    transitionModel: true,
    capabilities: [
      { code: 'S05', label: 'Logistics — one clearance position, read by logistics and execution alike', owner: 'shared', to: '/s05/clearance', basis: 'stated' },
      { code: 'S03', label: 'Quality — the quality and weight certificates as the output of an inspection at a configured control point', owner: 'shared', to: '/s03', basis: 'stated' },
      { code: 'C10', label: 'Configuration — which activities apply to this commodity and country, and in what sequence', owner: 'core', to: '/c10/countries/SD/steps', basis: 'stated' },
      { code: 'C07', label: 'Documents — every certificate as a register record with its validity date, so completeness can be computed', owner: 'core', to: '/c7/register', basis: 'stated' },
      { code: 'C05', label: 'Notifications — each custody hand-off notifies the receiving role', owner: 'core', to: '/c5/rules', basis: 'stated' },
      { code: 'C11', label: 'Reporting — issuing-authority and clearance turnaround published once', owner: 'core', to: '/c11/reports', basis: 'stated' },
    ],
    open: [
      { tag: 'OPEN', text: 'Is the authoritative sequence pre-clearance → clearance → stuffing, or pre-clearance → stuffing → clearance? It decides whether a clearance completeness rule blocks stuffing or blocks the shipping instruction.', ref: 'D-14 / G-01' },
      { tag: 'OPEN', text: 'The clearance data-entry field set and the templated Excel exports are undefined and await logistics confirmation.', ref: 'G-15' },
      { tag: 'OPEN', text: 'OPU, PZU and LPU are used without expansion anywhere in either source.', ref: 'G-24' },
      { tag: 'PROPOSED', text: 'Custody becomes a prerequisite of the clearance submission rather than an optional tick. Custody is unrecorded on about 45 per cent (OPU) and 41 per cent (PZU) of records.' },
      { tag: 'PROPOSED', text: 'Clearance cannot be marked Completed while an applicable regulatory activity is unrecorded (rule R20). Records have been observed completed with fumigation blank.' },
      { tag: 'PROPOSED', text: 'An EX form marked Used cannot be used again (rule R7).' },
      { tag: 'PROPOSED', text: 'The clearance team enters the clearance information in COTS and the required Excel reports are exported — marked "to be confirmed with logistics".' },
    ],
    why: 'Phase 16. Customs, SSMO, plant protection, health and surveyor activities — and the custody chain the submission depends on.',
    changedAtV27:
      'The export contract request can now be raised. Reviewing the screen for the instruction of 6 September 2026 found the same shape as the execution plan the day before: the list had rendered export contracts since v1.0 and every mutator advanced a record that already existed \u2014 nothing started one. A New request action sits in the list header, and the create screen captures the request and only the request: the plan it is raised against, the quantity and the exporting entity. Everything in the issuance group \u2014 the export contract number, its dates, the actual exporter, bank and quantity, the ministry dates and the EX forms \u2014 is what the ministry returns, so asking for it would make the record assert an issuance that never happened. Status is always Requested and moves on by transition. The request number, the purchase contract and the large-volume flag are read rather than asked for, and the quantity is defaulted from the plan (the captured requests do not all match their plan, so it is a default and not a rule). A request against a country that does not use an export contract is refused and says which and why, which is the module\u2019s existing rule that an inapplicable step is marked Not applicable rather than left pending. [OPEN] whether the three exporting entities are Sudan\u2019s or every country\u2019s.',
    legacyKey: 'clearance',
  },
  {
    no: 17,
    key: 'movement',
    name: 'Cargo movement and stuffing request',
    section: '§6.17',
    group: 'Logistics & Clearance',
    pNumber: 'P11',
    mockupPhaseId: 'WF10',
    owner: 'Partner Execution at origin, with Logistics for the movement',
    ownerConfirmed: true,
    path: '/movement',
    screens: [
      { label: 'Movement legs', path: '/movement', kind: 'list' },
      { label: 'Stuffing requests', path: '/movement/requests', kind: 'list' },
      { label: 'Movement leg MOV-2026-031', path: '/movement/leg/ml-1', kind: 'record' },
    ],
    fields: [
      'Allocated and ready cargo; the transport arrangement and booking',
      'Truck details, or for bulk a daily operation recording the number of trips and the quantities loaded and received',
      'The stuffing request, and the five functions it notifies',
      'Transfer prices between source, transit and export countries',
    ],
    statuses: [],
    transitionModel: false,
    capabilities: [
      { code: 'S05', label: 'Logistics — the movement, with loaded against received quantity and the variance', owner: 'shared', to: '/s05', basis: 'stated' },
      { code: 'S05', label: 'Logistics — the local shunting trips, for the monthly transportation cost allocation', owner: 'shared', to: '/s05/shunting', basis: 'stated' },
      { code: 'C05', label: 'Notifications — the stuffing request notifies Quality, Logistics, Clearance, Warehousing and Processing', owner: 'core', to: '/c5/rules', basis: 'stated' },
      { code: 'S04', label: 'Compliance — where a loaded-against-received difference becomes a case', owner: 'shared', to: '/s04/cases', basis: 'stated' },
      { code: 'C11', label: 'Reporting — the goods-in-transit reports', owner: 'core', to: '/c11/reports', basis: 'workflow' },
    ],
    open: [
      { tag: 'ASSUMPTION', text: 'Where a quantity loaded versus quantity received difference is raised and resolved — compliance case, commercial claim, or execution correction. Neither source states it.', ref: 'D-19 / G-29' },
      { tag: 'OPEN', text: 'Whether stuffing can begin without a stuffing request. The workshop describes the request as what initiates the operation, which implies a precondition, and states no rule.' },
      { tag: 'OPEN', text: 'No state model is given for the stuffing request.' },
      { tag: 'OPEN', text: 'Transfer prices between the source, transit and export countries are to be prepared by Hiba.', ref: 'D-20' },
      { tag: 'PROPOSED', text: 'Odoo integration for logistics data. SAP holds the Sudan service request today; COTS holds the stuffing request.' },
    ],
    why: 'Phase 17. The cargo to the port country, by truck detail or bulk day, and the request that starts the stuffing operation.',
  },
  {
    no: 18,
    key: 'stuffing',
    name: 'Container inspection and stuffing',
    section: '§6.18',
    group: 'Logistics & Clearance',
    pNumber: 'P11',
    mockupPhaseId: 'WF11',
    owner: 'Partner Execution at origin',
    ownerConfirmed: true,
    path: '/stuffing',
    screens: [
      { label: 'Stuffing and loading', path: '/stuffing', kind: 'list' },
      { label: 'Stuffing workspace — PC-2041.1', path: '/stuffing/sh-1', kind: 'workspace' },
    ],
    fields: [
      'Containers inspection protocol and its results',
      'Weighbridge slip',
      'Stuffing report — preliminary, then final, on a 1–2 day target',
      'Tags to the buyer’s specification',
      'VGM (verified gross mass) filing, Tanzania',
      'Seals, traceability coding and batch coding — two separate codes, both recorded',
    ],
    statuses: [
      'Empty-container inspection report: Issued',
      'Weighbridge slip: Issued',
      'Surveyor stuffing report: Preliminary → Final',
      'VGM: Filed (Tanzania)',
    ],
    transitionModel: true,
    capabilities: [
      { code: 'S03', label: 'Quality — the inspection at the stuffing area; a failure holds stuffing and raises a non-conformity', owner: 'shared', to: '/s03/inspections', basis: 'stated' },
      { code: 'S05', label: 'Logistics — the truck weights and the movement', owner: 'shared', to: '/s05', basis: 'stated' },
      { code: 'C05', label: 'Notifications — the 1–2 day target as a notification target, because everything downstream waits on it', owner: 'core', to: '/c5/rules', basis: 'stated' },
      { code: 'C07', label: 'Documents — the inspection protocol and the stuffing report as register records', owner: 'core', to: '/c7/register', basis: 'stated' },
    ],
    open: [
      { tag: 'OPEN', text: 'What happens when the stuffing-area quality inspection fails, or an empty container is rejected. Neither source states it.', ref: 'G-28' },
      { tag: 'OPEN', text: 'Is "CTS", named as the system holding non-conformities, the same as COTS?', ref: 'D-22 / G-24' },
      { tag: 'OPEN', text: 'What the containers inspection protocol contains — what is inspected, and what constitutes a pass.' },
      { tag: 'OPEN', text: 'Road, bulk and air stuffing and loading detail is undesigned.', ref: 'G-16' },
      { tag: 'AS-IS', text: 'The inspection happens and the surveyor issues a report.' },
      { tag: 'PROPOSED', text: 'The protocol and its results are recorded in COTS — attributed to a discussion between Hiba and Khalid, not to either source document.' },
    ],
    why: 'Phase 18. Daily stuffing progress, containers, seals and traceability coding. The stuffing report is what Phases 19 and 20 wait on.',
    legacyKey: 'stuffing',
  },

  /* ---- Shipping & Documents — phases 19–21 ---------------------------------------------- */
  {
    no: 19,
    key: 'shipping-instructions',
    name: 'Shipping instructions and transport documents',
    section: '§6.19',
    group: 'Shipping & Documents',
    pNumber: 'P12',
    mockupPhaseId: 'WF12',
    owner: 'Dubai Execution',
    ownerConfirmed: true,
    path: '/shipments/sh-1',
    screens: [
      { label: 'Shipment PC-2041.1 — booking and SI', path: '/shipments/sh-1', kind: 'record' },
      { label: 'Shipments and execution', path: '/shipments', kind: 'list' },
      { label: 'Documents and charges — PC-2041.1', path: '/documents/sh-1', kind: 'workspace' },
    ],
    fields: [
      'Final shipping instruction (SI and SRF)',
      'Draft bill of lading (DBL)',
      'Airway bill; road waybill',
      'The inherited document requirement list',
      'Booking or charter party agreement',
      'Confirmed weights from the final stuffing report',
      'Free days at both ports',
    ],
    statuses: [
      'Shipping instruction: Under creation → Issued',
      'Draft bill of lading: Received → Confirmed / Amend',
      'Airway bill: Issued; Road waybill: Issued',
      'Bill of lading sub-lifecycle: Awaiting DBL → DBL received → Final DBL confirmed → CBL → OBL issued',
    ],
    transitionModel: true,
    capabilities: [
      { code: 'C03', label: 'Master data — the document requirement list inherited rather than re-entered', owner: 'core', to: '/c3/domains', basis: 'stated' },
      { code: 'C07', label: 'Documents — the SI and the draft as versions of one register record', owner: 'core', to: '/c7/register', basis: 'stated' },
      { code: 'S05', label: 'Logistics — the service request and shipping instruction to logistics', owner: 'shared', to: '/s05/requests', basis: 'stated' },
    ],
    open: [
      { tag: 'OPEN', text: 'Is the unit of shipment document confirmation the purchase contract or the shipment? The workshop says per contract, the existing workflow processes per shipment, and the two cannot both hold.', ref: 'D-12 / G-02' },
      { tag: 'OPEN', text: 'Whether the day-ranges are contractual SLAs or internal targets.', ref: 'D6' },
      { tag: 'OPEN', text: 'What happens when the line cannot issue against the instruction. Not described.' },
      { tag: 'PROPOSED', text: 'The document requirement list is inherited rather than re-entered. Today the SI and SRF asks again, which is how the contract list and the shipping instruction list came to differ.' },
      { tag: 'PROPOSED', text: 'One SI and SRF cannot be used twice (rule R8). Today a red message prints and the save proceeds.' },
    ],
    why: 'Phase 19. The final shipping instruction, which cannot be prepared before the stuffing report gives it confirmed weights.',
  },
  {
    no: 20,
    key: 'documents',
    name: 'Draft, confirmed and original documents',
    section: '§6.20',
    group: 'Shipping & Documents',
    pNumber: 'P12',
    mockupPhaseId: 'WF13',
    owner: 'Dubai Execution for the confirmation loop; Partner Execution at origin for the certificates',
    ownerConfirmed: true,
    path: '/documents',
    screens: [
      { label: 'Documents and charges', path: '/documents', kind: 'list' },
      { label: 'Documents workspace — PC-2041.1', path: '/documents/sh-1', kind: 'workspace' },
    ],
    fields: [
      'Draft, confirmed and original bill of lading (DBL, CBL, OBL); telex release',
      'Certificate of origin (normal), Arabic certificate of origin, DFT, LDC certificate of origin',
      'Packing list, commercial invoice',
      'Health, phytosanitary and fumigation certificates',
      'Quality and weight certificates',
      'Bank delivery note',
    ],
    /*
     * The seven sets below are what the workflow records as [AS-IS] for §6.20. The unified six-state
     * model that would replace them is [PROPOSED] — including `Amendment requested`, which §6.20
     * marks "New." — so it is carried as a proposal, both in the last entry here and as the
     * PROPOSED open item further down. An earlier draft of this file put the proposed model at the
     * head of this array with `transitionModel: true` and dropped all seven facts, which showed a
     * reviewer an unagreed proposal under the heading "statuses the workflow states".
     */
    statuses: [
      'Confirmed bill of lading (CBL): Confirmed',
      'Original bill of lading (OBL): Not issued → Issued → Sent to bank → Delivered',
      'Telex release: Requested → Released',
      'Certificate of origin (normal): Draft → Confirmed → Original',
      'Arabic COO, DFT and LDC certificates of origin: Draft → Original, based on the OBL date',
      'Fumigation certificate: Draft → Confirmed → Original, or Not required. Phytosanitary: Draft → Confirmed → Original. Health or veterinary: Original received, or Not required',
      'Quality and weight certificates: Draft → Confirmed → Original. Bank delivery note: Attached',
      {
        text: 'One state model over all sixteen document types: Not required · Not issued · Draft received · Amendment requested · Confirmed · Original received (terminal) — which would replace the seven sets above',
        basis: 'proposed',
      },
    ],
    transitionModel: true,
    capabilities: [
      { code: 'C06', label: 'Comments — the customer’s objection as a comment on the record, so the reason survives the round trip', owner: 'core', to: '/c6/discussions', basis: 'stated' },
      { code: 'C04', label: 'Approval workflow — a draft awaiting confirmation beyond its target escalated or reassigned', owner: 'core', to: '/c4/routes', basis: 'stated' },
      { code: 'C05', label: 'Notifications — the alert that fires on the absence of a confirmation', owner: 'core', to: '/c5/rules', basis: 'stated' },
      { code: 'C07', label: 'Documents — draft, confirmed and original as versions of one record, not three records', owner: 'core', to: '/c7/register', basis: 'stated' },
      { code: 'S11', label: 'Knowledge — the issuing procedure in force, surfaced where the document is prepared', owner: 'shared', to: '/s11', basis: 'stated' },
    ],
    open: [
      { tag: 'OPEN', text: 'Who confirms a draft when Dubai Execution and the customer disagree? The amendment loop has no escalation and no time limit.', ref: 'D8' },
      { tag: 'OPEN', text: 'Whether the day-ranges become contractual SLAs or remain internal targets.', ref: 'D6' },
      { tag: 'OPEN', text: 'The amendment loop is real and has no status today. A shipment in its third amendment round looks identical to one whose draft has just arrived.' },
      { tag: 'PROPOSED', text: 'The six-state model, and the four refusals: Not issued → Confirmed; Not issued → Original received; Draft received → Original received; and anything out of Original received.' },
      { tag: 'PROPOSED', text: 'Amendment requested is added as a state.' },
      { tag: 'PROPOSED', text: 'The original bill of lading must reach the customer before the cargo arrives (rule R22). Today this is a stated goal with no control behind it.' },
      { tag: 'PROPOSED', text: 'The workflow set is completed — there is a Draft Fumigation workflow today and no Confirmed or Original Fumigation to match the other document types.' },
    ],
    why: 'Phase 20. Final SI → draft B/L → customer confirmation or amendment → confirmed B/L, which unlocks every other document → originals → OBL to the bank.',
    legacyKey: 'documents',
  },
  {
    no: 21,
    key: 'charges',
    name: 'Final document assembly and charges',
    section: '§6.21',
    group: 'Shipping & Documents',
    pNumber: 'P13',
    mockupPhaseId: 'WF14',
    owner: 'Partner Execution at origin',
    ownerConfirmed: true,
    path: '/documents/sh-1',
    screens: [
      { label: 'Documents and charges — PC-2041.1', path: '/documents/sh-1', kind: 'workspace' },
      { label: 'Documents and charges', path: '/documents', kind: 'list' },
    ],
    fields: [
      'Packing list — bag count, net and gross weight, bill of lading number, export contract and export form references',
      'Master tracker — bill of lading status and numbers, the date the draft was received, the final confirmation date, and the reason for any delay',
      'Five charge types — local invoice, freight invoice, detention, port storage, other — each with status, invoice receive date, payment date, amount and currency',
      'All Doc Complete Status, rolled up from the individual document states',
    ],
    statuses: [
      'Packing list: Issued',
      'All Doc Complete Status: rolled up from the document states',
      'Charge status (proposed): Not applicable · Awaited · Invoice received · Approved · Paid · Disputed',
    ],
    transitionModel: false,
    capabilities: [
      { code: 'S02', label: 'Costing — each settled charge measured against the element it was estimated at in the locked snapshot', owner: 'shared', to: '/s02/performance', basis: 'stated' },
      { code: 'C03', label: 'Master data — currency as a governed domain, so an amount cannot be stored as text with the currency elsewhere', owner: 'core', to: '/c3/domains', basis: 'stated' },
      { code: 'C04', label: 'Approval workflow — the Approved charge status as an actual approval with an authority limit', owner: 'core', to: '/c4/approvals', basis: 'stated' },
      { code: 'S04', label: 'Compliance — detention, demurrage and port storage exposure as a case where it becomes claimable', owner: 'shared', to: '/s04/cases', basis: 'stated' },
      { code: 'C11', label: 'Reporting — Awaiting DBL, Charges outstanding and Documents at bank as saved views filtered by scope', owner: 'core', to: '/c11/views', basis: 'stated' },
    ],
    open: [
      { tag: 'OPEN', text: 'Who owns charge and demurrage tracking? It has columns but no form, and five charge types are captured with nobody accountable for them.', ref: 'D5' },
      { tag: 'OPEN', text: 'Is demurrage and storage a commercial claim or a compliance case?' },
      { tag: 'OPEN', text: 'Whether the country follow-up reports are produced by COTS or remain spreadsheets.' },
      { tag: 'PROPOSED', text: 'A charge amount must carry its currency. Today it is stored as text with the currency separate, in the one library that holds every shipping cost — so it cannot report cost.' },
      { tag: 'PROPOSED', text: 'The charge default ceases to be No Charge, because an untouched record is today indistinguishable from one deliberately marked as having no charge.' },
    ],
    why: 'Phase 21. The packing list, the master tracker, and the five charge types that decide whether the shipment made money.',
  },

  /* ---- Finance & Close-Out — phases 22–23 ----------------------------------------------- */
  {
    no: 22,
    key: 'bank',
    name: 'Bank submission and payment',
    section: '§6.22',
    group: 'Finance & Close-Out',
    pNumber: 'P14',
    mockupPhaseId: 'WF15',
    owner: 'Trade Finance, receiving from Partner Execution',
    ownerConfirmed: true,
    path: '/post-shipment',
    screens: [
      { label: 'Post-shipment and bank', path: '/post-shipment', kind: 'list' },
      { label: 'Post-shipment workspace — PC-2041.1', path: '/post-shipment/sh-1', kind: 'workspace' },
    ],
    fields: [
      'The post-shipment document set, ticked and attached with a date',
      'Amount under collection',
      'Maturity date, derived from the contract payment terms',
      'Date the final documents went to the bank',
      'Airway bill the documents travelled by',
      'Net weight',
    ],
    statuses: [
      'Post-shipment document set: Assembled → Sent to Trade Finance',
      'Bank submittal: Submitted, with amount, maturity date and airway bill',
      'Proposed bank lifecycle: Assembling → Sent to Trade Finance → Submitted to bank → Under collection → Matured → Paid, with Overdue derived',
    ],
    transitionModel: true,
    capabilities: [
      { code: 'C07', label: 'Documents — the bank set as a document set with a completeness rule, so R21 is computed rather than ticked', owner: 'core', to: '/c7/register', basis: 'stated' },
      { code: 'C05', label: 'Notifications — a maturity date passing without payment raises the alert. Today nothing fires.', owner: 'core', to: '/c5/rules', basis: 'stated' },
      { code: 'C12', label: 'Integration layer — the SAP sales order identifier as a reference; a failed exchange queued and the record kept open', owner: 'core', to: '/c12/exchanges', basis: 'stated' },
      { code: 'C02', label: 'Actions Inbox — the Trade Finance task', owner: 'integration', to: '/inbox', basis: 'stated' },
    ],
    open: [
      { tag: 'OPEN', text: 'Is the bank set five items or six? It is described as five documents and lists six, which is one reason the completeness flag cannot be trusted. The completeness check cannot be written until this is settled.', ref: 'D7 / G-04' },
      { tag: 'OPEN', text: 'How submittals and document confirmations are being raised today, given that the legacy forms cannot create records.', ref: 'D1' },
      { tag: 'PROPOSED', text: 'Post-shipment cannot be Completed while a checklist item is unticked (rule R21). One record reads Post Shipment Document Completed with Send To Trade Finance unticked and the COO / DFT stamp missing.' },
      { tag: 'PROPOSED', text: 'The maturity date becomes a real date. Today it is stored as text.' },
      { tag: 'PROPOSED', text: 'The four fields carrying the financial substance appear in a list view. Today they appear in no list view at all.' },
    ],
    why: 'Phase 22. The document set to Trade Finance, the amount under collection, the maturity date and the airway bill they travelled by.',
    legacyKey: 'post-shipment',
  },
  {
    no: 23,
    key: 'close-out',
    name: 'Delivery, close-out, charges and exceptions',
    section: '§6.23',
    group: 'Finance & Close-Out',
    pNumber: 'P14',
    mockupPhaseId: 'WF16',
    owner: 'Dubai Execution and Finance for close-out; Trade Finance for payment; Trader for customer feedback',
    ownerConfirmed: true,
    path: '/close-out',
    screens: [
      { label: 'Customer feedback', path: '/close-out', kind: 'list' },
      { label: 'Buyer claims', path: '/close-out/claims', kind: 'list' },
      { label: 'Insurance', path: '/close-out/insurance', kind: 'list' },
      { label: 'Exceptions and risks', path: '/exceptions', kind: 'list' },
      { label: 'Post-shipment workspace — PC-2041.1', path: '/post-shipment/sh-1', kind: 'workspace' },
    ],
    fields: [
      'Bank submittal and its maturity date; charge invoices',
      'Customer feedback — satisfaction or a complaint, linked to the contract',
      'Buyer claim tracked against the shipment, and its submitted amount',
      'Sales order; storage or demurrage claim form',
      'Insurance case — date, location and brief description; the claim built; compensation status',
      'The purchase contract set to completed or partially completed',
    ],
    statuses: [
      'Sales order: Created → PC completed / partially completed',
      'Storage / demurrage claim form: Raised → Approved',
      'Claim: raised → approved',
    ],
    transitionModel: true,
    capabilities: [
      { code: 'S07', label: 'Claims — the buyer claim, its valuation and its approval', owner: 'shared', to: '/s07/register', basis: 'stated' },
      { code: 'S04', label: 'Insurance — theft, fire, accident or damage as an insurance case with its compensation status', owner: 'shared', to: '/s04/insurance', basis: 'stated' },
      { code: 'S09', label: 'Customer feedback — satisfaction and complaints against the contract', owner: 'shared', to: '/s09/capture', basis: 'stated' },
      { code: 'S02', label: 'Costing — the locked estimate against the settled actual', owner: 'shared', to: '/s02/performance', basis: 'stated' },
      { code: 'C05', label: 'Notifications — the maturity-date and OBL-not-dispatched alerts', owner: 'core', to: '/c5/rules', basis: 'stated' },
      { code: 'C11', label: 'Reporting — open cases with their ageing', owner: 'core', to: '/c11/reports', basis: 'stated' },
      { code: 'C08', label: 'Audit trail — every decision recorded', owner: 'core', to: '/c8/search', basis: 'stated' },
    ],
    open: [
      { tag: 'OPEN', text: 'Who owns charge and demurrage tracking, and is demurrage a commercial claim or a compliance case? Ownership is unresolved.', ref: 'D5 / G-30' },
      { tag: 'OPEN', text: 'Does the system hold a buyer claim, or only its approval? Stated one way in the workshop and implied the other by the existing claim form.', ref: 'G-30' },
      { tag: 'OPEN', text: 'The customer feedback proposal is still to be prepared by IT.' },
      { tag: 'PROPOSED', text: 'Customer feedback is obtained from the final customer by the trader and logged against the contract.' },
      { tag: 'PROPOSED', text: 'A maturity date passed without payment raises an alert; the original bill of lading not dispatched with the vessel approaching the port of discharge raises an alert.' },
    ],
    why: 'Phase 23. The OBL with the customer before the cargo, the charges settled, the contract closed, and what went wrong recorded where it belongs.',
    legacyKey: 'close-out',
  },
];

/* ------------------------------------------------------------------ *
 * What is undecided about the process rather than about one phase
 *
 * Six rows of the source's registers do not belong to any single phase, so carrying them only on
 * phases would lose them. They are held here and shown on the module landing page, which is the one
 * screen that speaks for the process as a whole.
 * ------------------------------------------------------------------ */

export const PROCESS_LEVEL_OPEN: OpenItem[] = [
  {
    tag: 'OPEN',
    text: 'Is Procurement a phase of the export process, or a screen group beside it? The business instruction of 3 September 2026 adds it as a tab after Purchase agreement and workflow v2.3 numbers the phases 01\u201323 with no purchase-order record among them. So it is documented as a screen group and the phase count is unchanged \u2014 numbering it as a phase would renumber every phase after it and assert a sequence the workflow document does not contain. If the business means it as a phase, the workflow needs a version that says so.',
  },
  {
    tag: 'OPEN',
    text: 'What is the relationship between the purchase order as a record on the Procurement tab and the purchaseOrderNo string a fund and a purchase agreement each already carry? Nothing is migrated and no join is asserted, because the instruction states none; the view screen lists the records that name the same PO number and leaves the question open.',
  },
  {
    tag: 'OPEN',
    text: 'Are targets needed for the phases before the document chain, and if so what are they? No quantified target exists for any phase before phase 16, so "overdue" is computable for document steps and for nothing else.',
    ref: 'D-18 / G-18',
  },
  {
    tag: 'OPEN',
    text: 'Which system is the record for the contract — SAP, which issues it, or COTS, where the requirement list and its rules are to be enforced? The rules currently live on the legacy purchase contract form.',
    ref: 'D-09 / G-05',
  },
  {
    tag: 'OPEN',
    text: 'Whether a statement in the workshop notes is current practice or a proposed future state is not always clear in the source, which carries a standing risk of building a discussion point as a requirement.',
    ref: 'G-08',
  },
  {
    tag: 'OPEN',
    text: 'Five master data sets are named with an owner and have not been provided — batch coding (Siedahmed), costing elements per country (Siedahmed), commodity quality parameters (quality team with Asim), transfer prices (Hiba) and QA formats and forms (Asim). Each blocks a phase.',
    ref: 'G-17 / D-20',
  },
  {
    tag: 'OPEN',
    text: 'Approvals are named per artefact — freight offer, charge, claim, warehouse request — with no route, no approver and no authority limit stated anywhere in either source.',
    ref: 'G-23 / D-17',
  },
  {
    tag: 'OPEN',
    text: 'Was the structural navigation decision taken — country first then flow, or flow first then country? The workshop records the question and the two options and no outcome.',
    ref: 'D-21 / G-26',
  },
];

/* ------------------------------------------------------------------ *
 * The screens that are not a phase
 *
 * Export screens that serve the whole process rather than one phase, held apart from the
 * twenty-three rather than given a phase number they do not have.
 *
 * PROCUREMENT belongs here, and the reason is worth stating rather than assuming. The
 * business instruction of 3 September 2026 says "add new tab after the Purchase Agreement
 * tab name Procurement". A tab is not a phase: workflow v2.3 defines the phase sequence,
 * numbers it 01–23, and says nothing about a purchase order as a record. Numbering
 * Procurement as phase 05 would renumber every phase after it and put a phase order in
 * front of a business reviewer that the workflow document does not contain — which is the
 * one thing this layer exists to prevent. So the tab is documented here, in the sequence
 * the screens appear in, and the phase count stays twenty-three until a workflow version
 * says otherwise. That is an [OPEN] question recorded at process level.
 * ------------------------------------------------------------------ */

export interface CrossCuttingScreen {
  key: string;
  label: string;
  path: string;
  why: string;
  legacyKey?: string;
}

export const CROSS_CUTTING: CrossCuttingScreen[] = [
  {
    key: 'procurement',
    label: 'Procurement — purchase orders',
    path: '/sourcing/procurement',
    why: 'The tab added after Purchase agreement on 3 September 2026: the purchase order as a record of its own — the PO number, the purchase agreements under it, and the payment against each with its read-only USD conversion. The list shows the PO number, the total in local currency and the total in USD. Not a phase: the workflow numbers 01\u201323 and names no purchase-order record.',
  },
  {
    key: 'procurement-new',
    label: 'New PO',
    path: '/sourcing/procurement/new',
    why: 'The PO number as the header and a purchase-agreement reference field that selects several. Nothing about a payment is captured here — no payment has been made when an order is raised.',
  },
  {
    key: 'procurement-record',
    label: 'Purchase order 1123',
    path: '/sourcing/procurement/po-1',
    why: 'Three information cards summarising the order, and the Purchase Agreement List card whose four columns are the agreement reference, the payment amount in local currency, the read-only USD conversion and the actual payment date. Its two agreements were paid three weeks apart, so the same currency converts at two different rates — which is why the conversion is per line and not per order.',
  },
  {
    key: 'procurement-edit',
    label: 'Edit purchase order 1123',
    path: '/sourcing/procurement/po-1/edit',
    why: 'The PO number and the whole purchase agreement list, including the payment amount and the actual payment date per agreement. The USD conversion is shown beside each amount and is not an input.',
  },
  {
    key: 'home',
    label: 'Export springboard',
    /*
      Export calls this screen `/`. This application's own `/` is the Core home, so the springboard
      is mounted at `/export/springboard` — the one Export address that could not be kept, because
      two prototypes cannot both own the root.
    */
    path: '/export/springboard',
    why: 'The Export module tile board — what is late, due today, due this week, open risks and open shipments.',
    legacyKey: 'home',
  },
  {
    key: 'dashboard',
    label: 'Operations dashboard',
    path: '/dashboard',
    why: 'Risk alerts, shipment status, contract consumption, pending actions and upcoming milestones. WF-INT-14.',
    legacyKey: 'dashboard',
  },
  {
    key: 'exceptions',
    label: 'Exceptions and risks',
    path: '/exceptions',
    why: 'Blocked, overdue and at-risk items across every shipment, in one queue. WF-INT-09 / Step 1.',
    legacyKey: 'exceptions',
  },
  {
    key: 'process-map',
    label: 'Export process map',
    path: '/process-map',
    why: 'The Export mock-up’s own phase map. It is still the sixteen phases of workflow v2.0 — see the divergence noted at the head of this file.',
  },
  {
    key: 'variants',
    label: 'Country and shipment variants',
    path: '/variants',
    why: 'How the process differs by operating unit and by shipment mode. Only the containerised case is covered by the existing design.',
    legacyKey: 'variants',
  },
  {
    key: 'material',
    label: 'Material and transport',
    path: '/material',
    why: 'Packaging and operational material, truck receipts and transport requests. WF-INT-10.',
    legacyKey: 'material',
  },
  {
    key: 'freight-rates',
    label: 'Freight rate table',
    path: '/freight-rates',
    why: 'Monthly rates by container size, loading port, destination port, commodity and line. Serves Phase 15.',
  },
  {
    key: 'contracts',
    label: 'Contracts',
    path: '/contracts',
    why: 'Every contract with its saved views, consumption and status. Serves Phase 10.',
    legacyKey: 'contracts',
  },
  {
    key: 'contract-new',
    label: 'New purchase contract',
    path: '/contracts/new',
    why: 'Phase 10 on entry — the tolerance ceiling, the document minimum and the fumigation choice enforced.',
    legacyKey: 'contract-new',
  },
  {
    key: 'sourcing',
    label: 'Sourcing intake',
    path: '/sourcing',
    why: 'The origin-side intake module that carries phases 01–07 and the agent balance list.',
  },
];

/* ------------------------------------------------------------------ *
 * Derivations
 * ------------------------------------------------------------------ */

export const TOTAL_PHASES = EXPORT_PHASES.length;

/** The phases of one section, in phase order. */
export function phasesInSection(section: PhaseSection): ExportPhase[] {
  return EXPORT_PHASES.filter((p) => p.group === section);
}

/** A section's phase range, derived — `'01–07'`, or `'13'` for a section holding one phase. */
export function sectionRange(section: PhaseSection): string {
  const ns = phasesInSection(section).map((p) => p.no);
  if (ns.length === 0) return '—';
  const lo = String(Math.min(...ns)).padStart(2, '0');
  const hi = String(Math.max(...ns)).padStart(2, '0');
  return lo === hi ? lo : `${lo}–${hi}`;
}

/**
 * The invariants the rest of this layer relies on, checked once when the module loads.
 *
 * Three things are asserted in prose all over this file and were, until now, enforced nowhere: that
 * the phases run 1…N with no gap or duplicate, that every key is unique, and that each section's
 * phases are **contiguous** in the sequence. The third one matters beyond tidiness —
 * `groupedDestinations()` groups by run-length over the array, so a section whose phases were not
 * contiguous would silently render as two menu sections with the same heading and produce duplicate
 * React keys.
 *
 * It throws rather than warning. A broken process model is not a degraded state worth rendering: it
 * would put a wrong phase order in front of a business reviewer, which is the one thing this layer
 * exists to prevent. The check is O(n) over twenty-three rows and runs at import.
 */
function assertProcessInvariants(): void {
  const problems: string[] = [];

  EXPORT_PHASES.forEach((p, i) => {
    if (p.no !== i + 1) problems.push(`phase at index ${i} carries no=${p.no}; the sequence must run 1…N in order`);
  });

  const keys = new Set<string>();
  for (const p of EXPORT_PHASES) {
    if (keys.has(p.key)) problems.push(`duplicate phase key "${p.key}"`);
    keys.add(p.key);
  }

  // every phase belongs to a declared section, and each section's phases form one unbroken run
  const declared = PHASE_SECTIONS.map((s) => s.section);
  for (const p of EXPORT_PHASES) {
    if (!declared.includes(p.group)) problems.push(`phase ${p.no} is in section "${p.group}", which PHASE_SECTIONS does not declare`);
  }
  const runs: PhaseSection[] = [];
  for (const p of EXPORT_PHASES) if (runs[runs.length - 1] !== p.group) runs.push(p.group);
  const seen = new Set<PhaseSection>();
  for (const r of runs) {
    if (seen.has(r)) problems.push(`section "${r}" is not contiguous in the phase sequence`);
    seen.add(r);
  }

  if (problems.length > 0) {
    throw new Error(
      `exportProcess.ts: the process model is inconsistent and would render a wrong phase order.\n` +
        problems.map((x) => `  · ${x}`).join('\n'),
    );
  }
}

assertProcessInvariants();

export function phaseByNo(no: number): ExportPhase | undefined {
  return EXPORT_PHASES.find((p) => p.no === no);
}

export function phaseByKey(key: string): ExportPhase | undefined {
  return EXPORT_PHASES.find((p) => p.key === key || p.legacyKey === key);
}

/**
 * Which phase an address belongs to — v1.4.
 *
 * Needed because the Export screens are now real routes in this application rather than a key in a
 * bridge URL: the frame has an address and has to work out the phase from it.
 *
 * **Longest match wins**, which is the rule the Export prototype's own navigation model uses for the
 * same problem. `/sourcing/plans/new` belongs to phase 01 and not to phase 03, whose landing screen
 * is `/sourcing/funds`, because a longer declared path is a more specific claim. Every `screens`
 * entry counts as well as the landing `path`, so an add form or an edit screen resolves to its phase
 * rather than to whichever phase happens to own the shortest prefix.
 *
 * A screen that belongs to no phase — the springboard, the dashboard, the exceptions queue — returns
 * undefined, and the frame renders no phase strip for it rather than claiming a position.
 */
export function phaseForPath(pathname: string): ExportPhase | undefined {
  let best: ExportPhase | undefined;
  let bestLength = -1;

  for (const phase of EXPORT_PHASES) {
    const candidates = [phase.path, ...phase.screens.map((s) => s.path)];
    for (const candidate of candidates) {
      const exact = pathname === candidate;
      const nested = pathname.startsWith(candidate.endsWith('/') ? candidate : `${candidate}/`);
      if ((exact || nested) && candidate.length > bestLength) {
        best = phase;
        bestLength = candidate.length;
      }
    }
  }
  return best;
}

export function crossCuttingByKey(key: string): CrossCuttingScreen | undefined {
  return CROSS_CUTTING.find((c) => c.key === key || c.legacyKey === key);
}

/** The phase before and after, in business sequence. Used for previous / next, never for a jump. */
export function neighbours(no: number): { prev?: ExportPhase; next?: ExportPhase } {
  return { prev: phaseByNo(no - 1), next: phaseByNo(no + 1) };
}

/** Every open item across the process, for the count on the landing page. */
export function allOpenItems(): { phase: ExportPhase; item: OpenItem }[] {
  return EXPORT_PHASES.flatMap((phase) => phase.open.map((item) => ({ phase, item })));
}

/** Every capability binding, so the cross-module coverage can be read in one place. */
export function allCapabilityLinks(): { phase: ExportPhase; link: CapabilityLink }[] {
  return EXPORT_PHASES.flatMap((phase) => phase.capabilities.map((link) => ({ phase, link })));
}

/**
 * Every Export route this model links to.
 *
 * The check that matters is the other direction — that each of these exists in the Export mock-up's
 * own `App.tsx`. `walk.mjs` asserts it, reading the `path:` values out of this file and the route
 * patterns out of that `App.tsx`, and failing the run if any path here has no matching pattern
 * there. That is the same rule the Export contribution applies to its own navigation model.
 */
export function allExportPaths(): string[] {
  const out = new Set<string>();
  EXPORT_PHASES.forEach((p) => {
    out.add(p.path);
    p.screens.forEach((s) => out.add(s.path));
  });
  CROSS_CUTTING.forEach((c) => out.add(c.path));
  return Array.from(out).sort();
}

/** Every integrated route the capability rails link to, for the same check on this side. */
export function allCapabilityTargets(): string[] {
  return Array.from(new Set(allCapabilityLinks().map(({ link }) => link.to))).sort();
}
