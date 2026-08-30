/**
 * The sixteen phases of COTS_Export_End_to_End_Workflow_v2.0 (24 August 2026).
 *
 * Why this file exists rather than a renumbering of `PhaseId`. The v2.0 document
 * keeps the previous P-numbering deliberately (§16, "Phase numbering") so the two
 * documents can be read side by side. `PhaseId` (P1–P14) is the prototype's internal
 * phase model, referenced by every milestone in `milestones.ts`;
 * renumbering it would break that mapping and gain nothing. So the sixteen-phase
 * model lives here as the authoritative cross-reference, and every phase records
 * which prototype screens now serve it.
 *
 * `evidence` is the v2.0 §5 column of the same name: Existing (from the previous
 * documentation workflow), New (from the workshop notes only), Both (reconciled).
 *
 * TWO SOURCE DISCREPANCIES, RECORDED RATHER THAN RESOLVED.
 *
 * 1. **How many phases carry a P-number.** §5's prose says "six phases have no
 *    P-number because they were not documented", and §16.1 names six phases as
 *    having no screen — 01, 02, 04, 06, 10 and, in part, 05. But §5's own table puts
 *    "—" in the source-phase column for **three** rows only: 01, 02 and 04. Phases
 *    05, 06 and 10 each carry one (P2; P3–P7; P11). The table is the harder evidence
 *    and is what `sourcePhases` follows, so three phases here have an empty array and
 *    thirteen do not. The prose count is not silently adopted, and the discrepancy is
 *    shown on the process-map screen.
 *
 * 2. **Phase 06's source range overlaps Phase 07's.** §5 gives phase 06 as "P3–P7"
 *    and phase 07 as "P6–P8", so P6 and P7 appear against both. In the prototype's
 *    own model P6 is the export contract and P7 the EX forms, which are Phase 07 work,
 *    so P6 and P7 are recorded against Phase 07 here and Phase 06 keeps P3–P5. That is
 *    a reading of an overlapping range, not a resolution of it; `sourcePhaseNote` says
 *    so on the phase itself.
 */

import type { PhaseId, Role } from "./types";

export type WorkflowPhaseId =
  | "WF01"
  | "WF02"
  | "WF03"
  | "WF04"
  | "WF05"
  | "WF06"
  | "WF07"
  | "WF08"
  | "WF09"
  | "WF10"
  | "WF11"
  | "WF12"
  | "WF13"
  | "WF14"
  | "WF15"
  | "WF16";

export type PhaseEvidence = "Existing" | "New" | "Both";

/** How far the prototype covers a phase. Recorded, not inferred. */
export type PhaseCoverage = "covered" | "extended" | "new";

export interface WorkflowScreen {
  label: string;
  to: string;
}

export interface WorkflowPhase {
  id: WorkflowPhaseId;
  /** §5 "#" column, e.g. "01". */
  number: string;
  name: string;
  /**
   * §5 "Source phase" column. Empty on the three rows where §5's table prints "—".
   * See the file header for why that is three and not the six §5's prose claims.
   */
  sourcePhases: PhaseId[];
  /** Set where the source's own range is ambiguous or overlaps another phase's. */
  sourcePhaseNote?: string;
  owner: Role;
  ownerLabel: string;
  keyOutput: string;
  evidence: PhaseEvidence;
  /** Was this phase already in the v1.1 prototype, extended for v2.0, or new? */
  coverage: PhaseCoverage;
  /** The screens that serve the phase. Every `to` is a route that exists in App.tsx. */
  screens: WorkflowScreen[];
  /** Decisions from v2.0 §14 that bear on this phase and are shown on its screens. */
  openDecisions: string[];
}

export const WORKFLOW_PHASES: WorkflowPhase[] = [
  {
    id: "WF01",
    number: "01",
    name: "Opportunity and commercial assessment",
    sourcePhases: [],
    owner: "trader",
    ownerLabel: "Trader",
    keyOutput: "Costing snapshot, declared position",
    evidence: "New",
    coverage: "new",
    screens: [
      { label: "Origination", to: "/origination" },
      { label: "Long & short position", to: "/origination/position" },
    ],
    openDecisions: ["D-18", "D-20"],
  },
  {
    id: "WF02",
    number: "02",
    name: "Deal agreement",
    sourcePhases: [],
    owner: "trader",
    ownerLabel: "Trader → Dubai Execution",
    keyOutput: "Agreed deal",
    evidence: "New",
    coverage: "new",
    screens: [{ label: "Origination", to: "/origination" }],
    openDecisions: [],
  },
  {
    id: "WF03",
    number: "03",
    name: "Contract creation in SAP",
    sourcePhases: ["P2"],
    owner: "dubai_execution",
    ownerLabel: "Dubai Execution",
    keyOutput: "Contract, sales order, document requirement list",
    evidence: "Both",
    coverage: "covered",
    screens: [
      { label: "Contracts", to: "/contracts" },
      { label: "New purchase contract", to: "/contracts/new" },
    ],
    openDecisions: ["D-09", "G-07"],
  },
  {
    id: "WF04",
    number: "04",
    name: "Cross-functional contract review",
    sourcePhases: [],
    owner: "dubai_execution",
    ownerLabel: "Quality, Execution, Processing, FP&A",
    keyOutput: "Four fulfilment confirmations",
    evidence: "New",
    coverage: "new",
    screens: [{ label: "Contract review", to: "/contracts" }],
    openDecisions: ["D-10"],
  },
  {
    id: "WF05",
    number: "05",
    name: "Quality parameters and tags setup",
    sourcePhases: ["P2"],
    owner: "dubai_execution",
    ownerLabel: "Dubai Execution + Quality",
    keyOutput: "Quality terms, tags specification",
    evidence: "Both",
    coverage: "extended",
    screens: [{ label: "Contract quality & tags", to: "/contracts" }],
    openDecisions: ["D-20"],
  },
  {
    id: "WF06",
    number: "06",
    name: "Stock allocation and cargo readiness",
    sourcePhases: ["P3", "P4", "P5"],
    owner: "processing",
    ownerLabel: "Execution + Processing",
    sourcePhaseNote:
      'v2.0 §5 gives this phase as "P3–P7" and phase 07 as "P6–P8", so P6 and P7 appear against both. P6 and P7 are the export contract and the EX forms in the prototype\'s own model, which is phase 07 work, so they are recorded there and P3–P5 kept here. A reading of an overlapping range, not a resolution of it.',
    keyOutput: "Reserved stock, short/long position",
    evidence: "New",
    coverage: "new",
    screens: [
      { label: "Allocation & readiness", to: "/allocation" },
      { label: "Production plan", to: "/allocation/production-plan" },
      { label: "Warehouse requests", to: "/allocation/warehouse-requests" },
    ],
    openDecisions: ["D-16", "D-20"],
  },
  {
    id: "WF07",
    number: "07",
    name: "Country-specific execution prerequisites",
    sourcePhases: ["P6", "P7", "P8"],
    owner: "partner_execution",
    ownerLabel: "Partner Execution",
    keyOutput: "EX contract, EX form, permit, advance payment, SR",
    evidence: "Both",
    coverage: "extended",
    screens: [
      { label: "Pre-clearance", to: "/pre-clearance" },
      { label: "Advance payments", to: "/pre-clearance/advance-payments" },
    ],
    openDecisions: ["D3", "D-13", "D-15"],
  },
  {
    id: "WF08",
    number: "08",
    name: "Freight planning and booking",
    sourcePhases: ["P9"],
    owner: "logistics",
    ownerLabel: "Logistics",
    keyOutput: "Approved offer, booking or charter",
    evidence: "Both",
    coverage: "extended",
    screens: [
      { label: "Shipments — booking & SI", to: "/shipments" },
      { label: "Freight rate table", to: "/freight-rates" },
    ],
    openDecisions: ["D-17"],
  },
  {
    id: "WF09",
    number: "09",
    name: "Pre-clearance and regulatory processing",
    sourcePhases: ["P8", "P10"],
    owner: "logistics",
    ownerLabel: "Partner Execution + Clearance",
    keyOutput: "Custody recorded, customs released, certificates",
    evidence: "Existing",
    coverage: "covered",
    screens: [{ label: "Clearance & regulatory", to: "/clearance" }],
    openDecisions: ["D-14", "G-15"],
  },
  {
    id: "WF10",
    number: "10",
    name: "Cargo movement and stuffing request",
    sourcePhases: ["P11"],
    owner: "partner_execution",
    ownerLabel: "Partner Execution + Logistics",
    keyOutput: "Cargo at port country, stuffing request",
    evidence: "New",
    coverage: "new",
    screens: [
      { label: "Movement & stuffing requests", to: "/movement" },
      { label: "Stuffing requests", to: "/movement/requests" },
    ],
    openDecisions: ["D-19"],
  },
  {
    id: "WF11",
    number: "11",
    name: "Container inspection and stuffing",
    sourcePhases: ["P11"],
    owner: "logistics",
    ownerLabel: "Partner Execution + Surveyor",
    keyOutput: "Stuffing report (1–2 d)",
    evidence: "Both",
    coverage: "extended",
    screens: [{ label: "Stuffing & loading", to: "/stuffing" }],
    openDecisions: ["G-28", "D-22"],
  },
  {
    id: "WF12",
    number: "12",
    name: "Shipping instructions and transport documents",
    sourcePhases: ["P12"],
    owner: "dubai_execution",
    ownerLabel: "Dubai Execution",
    keyOutput: "Final SI, draft bill of lading",
    evidence: "Existing",
    coverage: "covered",
    screens: [{ label: "Shipments — booking & SI", to: "/shipments" }],
    openDecisions: ["D-12"],
  },
  {
    id: "WF13",
    number: "13",
    name: "Draft, confirmed and original documents",
    sourcePhases: ["P12"],
    owner: "dubai_execution",
    ownerLabel: "Dubai Execution + origin",
    keyOutput: "Confirmed and original document set",
    evidence: "Existing",
    coverage: "covered",
    screens: [{ label: "Documents & charges", to: "/documents" }],
    openDecisions: ["D6", "D8"],
  },
  {
    id: "WF14",
    number: "14",
    name: "Final document assembly and charges",
    sourcePhases: ["P13"],
    owner: "partner_execution",
    ownerLabel: "Partner Execution",
    keyOutput: "Packing list, tracker, five charge types",
    evidence: "Existing",
    coverage: "extended",
    screens: [{ label: "Documents & charges", to: "/documents" }],
    openDecisions: ["D5"],
  },
  {
    id: "WF15",
    number: "15",
    name: "Bank submission and payment",
    sourcePhases: ["P14"],
    owner: "trade_finance",
    ownerLabel: "Trade Finance",
    keyOutput: "Bank submittal, collection",
    evidence: "Existing",
    coverage: "covered",
    screens: [{ label: "Post-shipment & bank", to: "/post-shipment" }],
    openDecisions: ["D7", "D1"],
  },
  {
    id: "WF16",
    number: "16",
    name: "Delivery, close-out, charges and exceptions",
    sourcePhases: ["P14"],
    owner: "finance",
    ownerLabel: "Dubai Execution + Finance",
    keyOutput: "Closed contract, settled charges, claims",
    evidence: "Both",
    coverage: "extended",
    screens: [
      { label: "Post-shipment & bank", to: "/post-shipment" },
      { label: "Close-out, claims & insurance", to: "/close-out" },
      { label: "Exceptions & risks", to: "/exceptions" },
    ],
    openDecisions: ["D5", "G-30"],
  },
];

export const WORKFLOW_PHASE_BY_ID = Object.fromEntries(WORKFLOW_PHASES.map((p) => [p.id, p])) as Record<
  WorkflowPhaseId,
  WorkflowPhase
>;

/** Which v2.0 phases a prototype P-number serves. Several map to more than one. */
export function workflowPhasesForSourcePhase(phase: PhaseId): WorkflowPhase[] {
  return WORKFLOW_PHASES.filter((p) => p.sourcePhases.includes(phase));
}

/**
 * What is unresolved and shown on the screen that would otherwise have to assume it.
 *
 * Twenty-one of these are the decisions of v2.0 §14, keyed by their own identifiers
 * (D1, D2, D3, D5-D8 keep the numbering the previous document and the export review
 * used; D-09 onwards are the fourteen added in v2.0). The remaining four are rows from
 * the §13 gap and conflict register that bear directly on a screen and have no §14
 * decision of their own: G-07, G-15, G-28 and G-30. Text is the decision or finding as
 * written in the source.
 */
export const OPEN_DECISIONS: Record<string, { title: string; owner: string }> = {
  D1: {
    title:
      "How are shipping instructions / SRFs and document confirmations being raised today, given that the forms cannot create records?",
    owner: "Partner Execution and Dubai Execution",
  },
  D2: {
    title: "Is the seven-EX-form ceiling a real business limit or an artefact of the form?",
    owner: "Partner Execution, Sudan",
  },
  D3: {
    title:
      "Which country and shipment-type matrix is authoritative? The matrix is provisional and only partly confirmed by the workshop.",
    owner: "Regional execution process owner",
  },
  D5: { title: "Who owns charge and demurrage tracking?", owner: "Finance and Operations" },
  D6: {
    title: "Should the day-ranges in Phase 13 become contractual SLAs or remain internal targets?",
    owner: "Commercial and Execution",
  },
  D7: { title: "Is the post-shipment bank set five items or six?", owner: "Trade Finance" },
  D8: {
    title: "Who confirms a draft when Dubai Execution and the customer disagree?",
    owner: "Dubai Execution",
  },
  "D-09": {
    title:
      "Which system is the record for the contract — SAP, which issues it, or COTS, where the requirement list and its rules are to be enforced?",
    owner: "IT and Dubai Execution",
  },
  "D-10": {
    title: "Is the cross-functional review at Phase 04 advisory or blocking, and within what period?",
    owner: "Execution, Quality, Processing, FP&A",
  },
  "D-11": {
    title:
      "Which system is the record for logistics — SAP, Odoo or COTS — and in which direction does the integration run?",
    owner: "IT and Logistics",
  },
  "D-12": {
    title: "Is the unit of shipment document confirmation the purchase contract or the shipment?",
    owner: "Dubai Execution",
  },
  "D-13": {
    title: "Does the EX contract keep a structured state and expiry, or become attachments and notes only?",
    owner: "Partner Execution, Sudan and Ethiopia",
  },
  "D-14": {
    title:
      "Is the authoritative sequence pre-clearance → clearance → stuffing, or pre-clearance → stuffing → clearance?",
    owner: "Regional execution process owner",
  },
  "D-15": {
    title:
      "Do advance payments apply outside Ethiopia, and must they be confirmed before execution can start in COTS?",
    owner: "FP&A and Execution",
  },
  "D-16": {
    title:
      "May stock flagged to the Stock Management Agreement be allocated to an export purchase contract, and on whose authority?",
    owner: "Execution and Finance",
  },
  "D-17": {
    title: "Who approves a freight offer, a charge and a claim, and to what authority limit?",
    owner: "Finance and Logistics",
  },
  "D-18": {
    title: "Are targets needed for the phases before the document chain, and if so what are they?",
    owner: "Execution process owner",
  },
  "D-19": {
    title:
      "Where is a loaded-versus-received quantity variance raised and resolved — compliance case, commercial claim, or execution correction?",
    owner: "Compliance and Execution",
  },
  "D-20": {
    title: "Which of the five outstanding master data sets are needed for the first release, and by when?",
    owner: "Siedahmed, Hiba, Asim, quality team",
  },
  "D-21": {
    title: "Was the navigation decision taken — country then flow, or flow then country?",
    owner: "IT and business sponsors",
  },
  "D-22": {
    title: 'Is "CTS", named as the system holding non-conformities, the same as COTS?',
    owner: "Quality and IT",
  },
  "G-07": {
    title:
      "Which document requirement list is canonical — the contract's fifteen checkboxes or the shipping instruction's sixteen?",
    owner: "Dubai Execution",
  },
  "G-15": {
    title:
      "The clearance data entry form set and the templated Excel exports are undefined and await logistics confirmation.",
    owner: "Logistics",
  },
  "G-28": {
    title:
      "Neither source states what happens when the stuffing-area quality inspection fails or when an empty container is rejected.",
    owner: "Quality and Execution",
  },
  "G-30": {
    title: "Does the system hold a buyer claim, or only its approval?",
    owner: "Operations and Finance",
  },
};

/** The five master data sets of v2.0 §14.1, none of which has been provided. */
export const OUTSTANDING_MASTER_DATA: { dataSet: string; owner: string; blocks: string }[] = [
  {
    dataSet: "Batch coding structure for raw and finished goods",
    owner: "Siedahmed",
    blocks: "Phase 06 — batch generation and customer-requirement versioning",
  },
  {
    dataSet: "Costing elements per country, with their units",
    owner: "Siedahmed",
    blocks: "Phase 01 — the cost estimate and therefore the deal gate",
  },
  {
    dataSet: "Commodity quality parameter sets",
    owner: "Quality team, with Asim",
    blocks: "Phase 05 — the mandatory parameters on the contract",
  },
  {
    dataSet: "Transfer prices, source → transit → export entity",
    owner: "Hiba",
    blocks: "Phase 10 — cross-entity cargo movement",
  },
  {
    dataSet: "QA formats and forms",
    owner: "Asim (two days with IT)",
    blocks: "Phases 05, 09 and 11 — inspection recording",
  },
];
