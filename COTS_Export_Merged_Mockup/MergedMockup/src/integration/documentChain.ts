/**
 * The export document chain, with the Core and Shared capability injected at each step.
 *
 * Every row below comes from `COTS_Export_Documentation_Workflow_Integrated.md`, which is itself the
 * Export contribution's own document workflow with the module that already provides each capability
 * named against it. Nothing here invents an export step.
 *
 * The rule this file follows is the rule of that document: **an injection changes where the
 * capability lives, never what the export process does.**
 */

import type { Owner } from './recordMap';

export interface Injection {
  /** module code as the workflows name it — C07, S03, … */
  code: string;
  what: string;
  owner: Owner;
  /** the screen in this mockup that provides it */
  to: string;
}

export interface ChainPhase {
  /** the document workflow's own phase number — P2, P8, P10 … — kept as the source states it */
  phase: string;
  /**
   * v1.3 — the phase in workflow v2.3's twenty-three-phase numbering that this document-chain phase
   * belongs to.
   *
   * The two numbering schemes are not a renumbering of each other and neither is wrong. The
   * P-numbers are the previous documentation workflow's, which the v2.0 and v2.3 documents keep
   * deliberately so the two can be read side by side (v2.3 §5 carries the mapping in its own
   * table). Adding the v2.3 number here rather than replacing the P-number keeps the traceability to
   * the source that these rows were written from, while letting a reviewer who has only ever seen
   * the twenty-three-phase process find their place.
   */
  workflowPhase: string;
  title: string;
  wf: string;
  /** what the Export process does at this phase, from the source document */
  exportStep: string;
  /** the Export screen where it is done */
  exportTo?: string;
  target?: string;
  injections: Injection[];
  /** the rule this phase enforces, where the source names one */
  rule?: string;
}

export const CHAIN: ChainPhase[] = [
  {
    phase: 'P2',
    workflowPhase: 'Phase 10 — contract creation in SAP',
    title: 'The contract sets the requirement',
    wf: 'WF-INT-01',
    exportStep:
      'The purchase contract fixes which documents this shipment needs, the fumigation treatment, the artwork option and the payment terms that determine the bank maturity date.',
    exportTo: '/export/contract-new',
    injections: [
      { code: 'C03', what: 'Buyer address and nick name default from the governed buyer record — blank on 865 legacy records', owner: 'core', to: '/c3/domains/buyer' },
      { code: 'C03', what: 'The sixteen document types are a governed domain, effective-dated, not a checkbox list in a form', owner: 'core', to: '/c3/domains' },
      { code: 'S02', what: 'The contract inherits the costing snapshot locked to the deal, read-only', owner: 'shared', to: '/s02/deal' },
      { code: 'C04', what: 'The counterparty compliance check before the contract proceeds', owner: 'core', to: '/c4/approvals' },
      { code: 'C08', what: 'The requirement list, once set, is auditable — who set it and what an amendment changed', owner: 'core', to: '/c8/search' },
    ],
    rule: 'At least one document must be required on a contract, and “Other” demands its description.',
  },
  {
    phase: 'P8',
    workflowPhase: 'Phase 16 — pre-clearance and regulatory processing',
    title: 'Pre-clearance pack and custody',
    wf: 'WF-INT-04',
    exportStep:
      'Partner Execution compiles the pack, attaches the scanned document with a date and user, hands it to OPU and records receipt, then to PZU. Status is blank on 36 % of records.',
    exportTo: '/export/clearance',
    injections: [
      { code: 'C07', what: 'The instrument is a register record with its version and access control, and the pack is one custody chain', owner: 'core', to: '/c7/register' },
      { code: 'C07', what: 'Expiry monitoring — an authorisation expiring before the shipment date blocks the operation it supports', owner: 'core', to: '/c7/expiry' },
      { code: 'C05', what: 'Each hand-off notifies the receiving role; an unrecorded receipt past its target prompts', owner: 'core', to: '/c5/rules' },
      { code: 'C02', what: 'A pack awaiting receipt is a task with an owner, not a blank status column', owner: 'integration', to: '/inbox' },
      { code: 'C08', what: 'Every attachment, receipt and custody event recorded', owner: 'core', to: '/c8/search' },
    ],
    rule: 'Custody is a prerequisite of the clearance submission — where a configured receipt is unrecorded, the clearance request cannot be raised.',
  },
  {
    phase: 'P10',
    workflowPhase: 'Phase 16 — pre-clearance and regulatory processing',
    title: 'Regulatory documents',
    wf: 'WF-INT-06',
    exportStep:
      'Customs declaration and release; EX-form consumption; SSMO sampling, certificate and analysis; fumigation; phytosanitary; examinations; SPC; documents to the shipping agency.',
    exportTo: '/export/clearance',
    injections: [
      { code: 'S05', what: 'One clearance position, published once and read by logistics and execution alike', owner: 'shared', to: '/s05/clearance' },
      { code: 'S03', what: 'The quality and weight certificates are the output of an inspection at a configured control point', owner: 'shared', to: '/s03' },
      { code: 'C10', what: 'Which activities apply to this commodity and country, and in what sequence — configuration, not a branch', owner: 'core', to: '/c10/countries/SD/steps' },
      { code: 'C07', what: 'Every certificate is a register record with its validity date, so completeness can be computed', owner: 'core', to: '/c7/register' },
      { code: 'C11', what: 'Issuing-authority and clearance turnaround published once into the catalogue', owner: 'core', to: '/c11/reports' },
    ],
    rule: 'R20 — clearance cannot be marked Completed while an applicable regulatory activity is unrecorded.',
  },
  {
    phase: 'P11',
    workflowPhase: 'Phase 18 — container inspection and stuffing',
    title: 'The stuffing report starts the document chain',
    wf: 'WF-INT-07',
    target: '1–2 days',
    exportStep:
      'The surveyor’s stuffing report is what allows the Final SI to be prepared with confirmed weights. Everything in P12 waits on it.',
    exportTo: '/export/stuffing',
    injections: [
      { code: 'S03', what: 'The inspection at the stuffing area; a failure holds stuffing and raises a non-conformity', owner: 'shared', to: '/s03/inspections' },
      { code: 'S05', what: 'Truck weights and the movement; a loaded-against-received difference becomes a compliance case', owner: 'shared', to: '/s05' },
      { code: 'C05', what: 'The 1–2 day target becomes a notification target, because everything downstream waits on it', owner: 'core', to: '/c5/rules' },
    ],
  },
  {
    phase: 'P12',
    workflowPhase: 'Phases 19–20 — shipping instructions, then draft, confirmed and original documents',
    title: 'Draft, confirmation, original',
    wf: 'WF-INT-08',
    target: 'same day → 2–3 days per step',
    exportStep:
      'Final SI → draft B/L → customer confirmation or amendment → confirmed B/L, which unlocks every other document → originals → OBL to the bank.',
    exportTo: '/export/documents',
    injections: [
      { code: 'C06', what: 'The customer’s objection is a comment on the record, so the reason survives the round trip', owner: 'core', to: '/c6/discussions' },
      { code: 'C04', what: 'A draft awaiting confirmation beyond its target is escalated or reassigned on its route', owner: 'core', to: '/c4/routes' },
      { code: 'C05', what: 'The alert fires on the absence of a confirmation — what change-driven e-mail cannot do', owner: 'core', to: '/c5/rules' },
      { code: 'C07', what: 'Draft, confirmed and original are versions of one record, not three records', owner: 'core', to: '/c7/register' },
      { code: 'S11', what: 'The issuing procedure in force surfaced where the document is prepared', owner: 'shared', to: '/s11' },
    ],
    rule: 'A document cannot skip a state, and a received original is terminal.',
  },
  {
    phase: 'P13',
    workflowPhase: 'Phase 21 — final document assembly and charges',
    title: 'Final documents and charges',
    wf: 'WF-INT-08',
    exportStep:
      'The packing list is issued; five charge types — local invoice, freight invoice, detention, port storage, other — are tracked with status, dates, amount and currency.',
    exportTo: '/export/documents',
    injections: [
      { code: 'S02', what: 'Each settled charge is measured against the element it was estimated at in the locked snapshot', owner: 'shared', to: '/s02/performance' },
      { code: 'C03', what: 'Currency is a governed domain — an amount stored as text with the currency elsewhere cannot recur', owner: 'core', to: '/c3/domains' },
      { code: 'C04', what: 'The Approved charge status is an actual approval with an authority limit', owner: 'core', to: '/c4/approvals' },
      { code: 'S04', what: 'Detention, demurrage and port storage exposure as a case where it becomes claimable', owner: 'shared', to: '/s04/cases' },
      { code: 'C11', what: 'Awaiting DBL, Charges outstanding and Documents at bank as saved views, filtered by scope', owner: 'core', to: '/c11/views' },
    ],
  },
  {
    phase: 'P14',
    workflowPhase: 'Phases 22–23 — bank submission and payment, then delivery and close-out',
    title: 'Bank, delivery and close-out',
    wf: 'WF-INT-08',
    target: '2–3 days',
    exportStep:
      'The five-document set goes to Trade Finance; the amount under collection, the maturity date and the AWB are recorded; the OBL reaches the customer before the cargo; the contract is closed.',
    exportTo: '/export/bank',
    injections: [
      { code: 'C07', what: 'The bank set is a document set with a completeness rule, so R21 is computed rather than ticked', owner: 'core', to: '/c7/register' },
      { code: 'C05', what: 'A maturity date passing without payment raises the alert — today nothing fires', owner: 'core', to: '/c5/rules' },
      { code: 'C12', what: 'The SAP sales order identifier is a reference; a failed exchange is queued and the record stays open', owner: 'core', to: '/c12/exchanges' },
      { code: 'S02', what: 'Estimated against actual operational cost per contract, published through C11', owner: 'shared', to: '/s02/performance' },
      { code: 'S07', what: 'A buyer claim arising from a late or defective document set, with the document as its evidence', owner: 'shared', to: '/s07/register' },
    ],
    rule: 'R21 — post-shipment cannot be Completed while a checklist item is unticked. R22 — the OBL must reach the customer before the cargo arrives.',
  },
];

/** The canonical sixteen, §3.1 of the source. `conditional` marks the ones a country or commodity decides. */
export const REQUIREMENT_LIST: { n: number; doc: string; conditional?: string }[] = [
  { n: 1, doc: 'B/L – AWB – Road WB' },
  { n: 2, doc: 'Commercial invoice' },
  { n: 3, doc: 'Certificate of origin (normal)' },
  { n: 4, doc: 'Packing list' },
  { n: 5, doc: 'Fumigation certificate', conditional: 'commodity' },
  { n: 6, doc: 'Phytosanitary certificate', conditional: 'commodity' },
  { n: 7, doc: 'Quality certificate (independent surveyor)', conditional: 'contracted' },
  { n: 8, doc: 'Weight certificate (independent surveyor)', conditional: 'contracted' },
  { n: 9, doc: 'DFT (duty-free tariff COO)', conditional: 'destination' },
  { n: 10, doc: 'Export health certificate', conditional: 'commodity' },
  { n: 11, doc: 'Certificate of analysis', conditional: 'commodity' },
  { n: 12, doc: 'LDC certificate of origin', conditional: 'destination' },
  { n: 13, doc: 'Arabic certificate of origin', conditional: 'destination' },
  { n: 14, doc: 'Arabic invoice', conditional: 'destination' },
  { n: 15, doc: 'SSMO certificate', conditional: 'country' },
  { n: 16, doc: 'Other — with a mandatory description' },
];

/** The state model of §6, and the four transitions the proposed process refuses. */
export const STATES = [
  { state: 'Not required', meaning: 'Applies to fumigation, customised COO and health only — set by configuration (C10)' },
  { state: 'Not issued', meaning: 'The starting state of every required document' },
  { state: 'Draft received', meaning: 'A draft is in from the line, ministry or team — a C07 version' },
  { state: 'Amendment requested', meaning: 'New. The customer has rejected the draft; the reason is a C06 comment' },
  { state: 'Confirmed', meaning: 'The customer has checked and accepted the draft' },
  { state: 'Original received', meaning: 'The signed original is in hand. Terminal' },
];

export const REFUSALS = [
  'Not issued → Confirmed — a document cannot be confirmed before a draft exists',
  'Not issued → Original received — the draft and confirmation steps cannot be skipped',
  'Draft received → Original received — the customer’s confirmation cannot be bypassed',
  'Original received → anything — a received original is terminal',
];

/** The four document alerts of §9, and where each is wired. */
export const ALERTS: { alert: string; source: string; wired: string; to: string }[] = [
  {
    alert: 'A draft B/L awaiting customer confirmation beyond its documented SLA',
    source: 'the P12 day-range targets, held as C10 configuration',
    wired: 'C05 rule → C02 task → C04 escalation on the route',
    to: '/c5/rules',
  },
  {
    alert: 'A required document missing at the point it is needed',
    source: 'the C07 register against the C03 / C10 requirement list',
    wired: 'C05 → C02',
    to: '/c7/expiry',
  },
  {
    alert: 'The OBL not dispatched with the vessel approaching the port of discharge',
    source: 'the S05 vessel and movement position',
    wired: 'C05 → C02, rule R22',
    to: '/s05',
  },
  {
    alert: 'A bank submittal maturity date passed without payment',
    source: 'the typed maturity date on the submittal',
    wired: 'C05 → C02, Trade Finance',
    to: '/inbox',
  },
];

/** The custody chain of §7 — each hand-off is a point where a shipment can stall invisibly. */
export const CUSTODY: { handoff: string; from: string; recordedToday: string; injected: string }[] = [
  { handoff: 'Pre-clearance pack', from: 'Partner Execution → OPU', recordedToday: '399 records say No, 3 blank', injected: 'C07 custody on the record; a prerequisite of the clearance submission' },
  { handoff: 'Pre-clearance pack', from: 'OPU → PZU', recordedToday: '356 records say No, 3 blank', injected: 'C07 custody; C05 notifies the receiving role' },
  { handoff: 'Originals', from: 'Origin → Dubai or customer, by courier', recordedToday: 'AWB number, 1–2 day target', injected: 'S05 movement record — one record instead of three fields under three names' },
  { handoff: 'Final document set', from: 'Partner Execution → Trade Finance', recordedToday: 'a tick and a date', injected: 'C07 set completeness (R21); C02 task' },
  { handoff: 'OBL', from: 'Bank → team → customer', recordedToday: 'OBL status and dates', injected: 'C05 against R22; S05 vessel position' },
];

/** Open points carried from the source and from the injection. */
export const OPEN_POINTS = [
  'Which requirement list is canonical — the contract’s fifteen or the shipping instruction’s sixteen (I-1).',
  'Whether the Export screens take the active country and permission scope from the Core session on build (I-2).',
  'Is demurrage and storage a commercial claim (S07) or a compliance case (S04) (I-3).',
  'Who approves a charge, and to what authority limit (I-4).',
  'Is the quality and weight certificate the output of an S03 inspection, or a document received and filed (I-5).',
  'Should the P12 day-ranges become contractual SLAs or remain internal targets.',
  'Is the five-document bank set five items or six — the source names five and lists six.',
  'Who confirms a draft when Dubai Execution and the customer disagree.',
];
