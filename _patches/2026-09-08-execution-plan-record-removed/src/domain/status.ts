/**
 * Allowed status transitions.
 *
 * The legacy system enforces none of these: every "blocking" rule across all 28
 * libraries displays its message and then permits the save (export-process-update.md
 * §4.3e). Here a transition that is not in the map is not offered in the UI and is
 * refused by the service layer.
 */

import type {
  AdvancePaymentState,
  BankSubmittalStatus,
  BuyerClaimState,
  CargoStatus,
  ClearanceStatus,
  ContractStatus,
  DocumentState,
  ExportContractStatus,
  ExportFormStatus,
  InsuranceIncidentState,
  IntakeReceiptStatus,
  MovementLegState,
  ShipmentStatus,
  StatusTone,
  StockState,
  TagSpecificationState,
  WarehouseRequestState,
} from "./types";

export interface TransitionRefusal {
  allowed: false;
  reason: string;
}
export interface TransitionOk {
  allowed: true;
}
export type TransitionResult = TransitionOk | TransitionRefusal;

const ok: TransitionOk = { allowed: true };
const no = (reason: string): TransitionRefusal => ({ allowed: false, reason });

/* ---------------- Contract ---------------- */
export const CONTRACT_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  new_pc: ["pending_compliance", "under_execution", "cancelled"],
  pending_compliance: ["under_execution", "cancelled"],
  under_execution: ["partially_completed", "completed", "cancelled"],
  exported_from_chad: ["under_execution", "partially_completed", "completed"],
  partially_completed: ["completed", "under_execution"],
  completed: [],
  cancelled: [],
};

/* ---------------- Cargo readiness ----------------
 * AS-IS the ten values exist; the ordering rules are PROPOSED.
 * Any "awaiting" state may move to `ready` or back to `partially_ready`. */
const AWAITING: CargoStatus[] = [
  "awaiting_tagging",
  "awaiting_fumigation",
  "awaiting_analysis",
  "awaiting_pp_check",
  "awaiting_classification",
  "awaiting_customer_approval",
];

export const CARGO_TRANSITIONS: Record<CargoStatus, CargoStatus[]> = {
  not_available: ["partially_ready", ...AWAITING],
  partially_ready: [...AWAITING, "ready", "not_available"],
  awaiting_tagging: ["ready", "partially_ready", ...AWAITING.filter((s) => s !== "awaiting_tagging")],
  awaiting_fumigation: ["ready", "partially_ready", ...AWAITING.filter((s) => s !== "awaiting_fumigation")],
  awaiting_analysis: ["ready", "partially_ready", ...AWAITING.filter((s) => s !== "awaiting_analysis")],
  awaiting_pp_check: ["ready", "partially_ready", ...AWAITING.filter((s) => s !== "awaiting_pp_check")],
  awaiting_classification: [
    "ready",
    "partially_ready",
    ...AWAITING.filter((s) => s !== "awaiting_classification"),
  ],
  awaiting_customer_approval: [
    "ready",
    "partially_ready",
    ...AWAITING.filter((s) => s !== "awaiting_customer_approval"),
  ],
  ready: ["in_transit", "partially_ready"],
  in_transit: [],
};

/* ---------------- Export contract ---------------- */
export const EXPORT_CONTRACT_TRANSITIONS: Record<ExportContractStatus, ExportContractStatus[]> = {
  not_requested: ["requested"],
  requested: ["sent_to_mot", "under_process"],
  sent_to_mot: ["received_from_mot", "under_process"],
  received_from_mot: ["under_process", "issued"],
  under_process: ["issued"],
  issued: ["expiring_soon", "expired"],
  expiring_soon: ["expired", "issued"],
  expired: ["issued"], // renewal
};

/* ---------------- EX form ---------------- */
export const EXPORT_FORM_TRANSITIONS: Record<ExportFormStatus, ExportFormStatus[]> = {
  under_processing: ["issued"],
  issued: ["used"],
  used: [],
};

/* ---------------- Shipment ---------------- */
export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  draft: ["planned", "cancelled"],
  planned: ["booked", "blocked", "cancelled"],
  booked: ["cleared", "blocked", "cancelled"],
  cleared: ["stuffed", "blocked"],
  stuffed: ["sailed", "blocked"],
  sailed: ["documents_complete", "blocked"],
  documents_complete: ["closed", "blocked"],
  closed: [],
  blocked: ["planned", "booked", "cleared", "stuffed", "sailed", "documents_complete", "cancelled"],
  cancelled: [],
};

/* ---------------- Clearance ---------------- */
export const CLEARANCE_TRANSITIONS: Record<ClearanceStatus, ClearanceStatus[]> = {
  started: ["in_progress"],
  in_progress: ["completed", "started"],
  completed: [],
};

/* ---------------- Document ---------------- */
export const DOCUMENT_TRANSITIONS: Record<DocumentState, DocumentState[]> = {
  not_required: ["not_issued"],
  not_issued: ["draft_received", "not_required"],
  draft_received: ["confirmed", "amendment_requested"],
  amendment_requested: ["draft_received"],
  confirmed: ["original_received", "amendment_requested"],
  original_received: [],
};

/* ---------------- Bank submittal ---------------- */
export const BANK_SUBMITTAL_TRANSITIONS: Record<BankSubmittalStatus, BankSubmittalStatus[]> = {
  assembling: ["sent_to_trade_finance"],
  sent_to_trade_finance: ["submitted_to_bank"],
  submitted_to_bank: ["under_collection"],
  under_collection: ["matured", "overdue", "paid"],
  matured: ["paid", "overdue"],
  overdue: ["paid"],
  paid: [],
};

/* ------------------------------------------------------------------ *
 * Generic checker
 * ------------------------------------------------------------------ */

export function canTransition<S extends string>(map: Record<S, S[]>, from: S, to: S): TransitionResult {
  if (from === to) return no("The record is already in that state.");
  const allowed = map[from];
  if (!allowed) return no(`Unknown current state "${from}".`);
  if (!allowed.includes(to)) {
    return no(
      allowed.length === 0
        ? `"${from}" is a terminal state — no further transition is permitted.`
        : `"${from}" may only move to: ${allowed.join(", ")}.`,
    );
  }
  return ok;
}

export function nextStates<S extends string>(map: Record<S, S[]>, from: S): S[] {
  return map[from] ?? [];
}

/* ------------------------------------------------------------------ *
 * Business-rule guards (the rules the legacy system displays but does not enforce)
 * ------------------------------------------------------------------ */

/**
 * Rule R20 — clearance cannot be marked Completed while an applicable regulatory
 * activity is unrecorded. Evidence: `Clearance` CL No.1 is `Completed` with both
 * fumigation dates blank on a Groundnut Oil shipment.
 */
export function guardClearanceCompletion(
  activities: { key: string; applicable: boolean; completedDate?: string }[],
): TransitionResult {
  const outstanding = activities.filter((a) => a.applicable && !a.completedDate);
  if (outstanding.length > 0) {
    return no(
      `${outstanding.length} applicable regulatory ${
        outstanding.length === 1 ? "activity is" : "activities are"
      } still unrecorded: ${outstanding.map((a) => a.key).join(", ")}.`,
    );
  }
  return ok;
}

/**
 * Rule R21 — post-shipment cannot complete while a checklist item is unticked.
 * Evidence: EX Comp No.1 reads `Post Shipment Document Completed` with
 * `Send To Trade Finance` unticked and the COO/DFT stamp missing.
 */
export function guardPostShipmentCompletion(checklist: { key: string; done: boolean }[]): TransitionResult {
  const missing = checklist.filter((c) => !c.done);
  if (missing.length > 0) {
    return no(`${missing.length} checklist item(s) outstanding: ${missing.map((c) => c.key).join(", ")}.`);
  }
  return ok;
}

/**
 * Rule R7 — an EX form, once `Used` on a clearance declaration, cannot be reused.
 * The legacy message "THIS SI & SRF HAS BEEN USED BEFORE AND CANNOT BE USED AGAIN"
 * is advisory only.
 */
export function guardExportFormReuse(form: { formNo: string; status: ExportFormStatus }): TransitionResult {
  if (form.status === "used") {
    return no(`EX form ${form.formNo} has already been consumed and cannot be used again.`);
  }
  if (form.status !== "issued") {
    return no(`EX form ${form.formNo} is not yet issued.`);
  }
  return ok;
}

/**
 * Rule R8/R9/R10/R11 — one-per-parent uniqueness. The legacy estate shows the message
 * and saves anyway on every library.
 */
export function guardUnique(existingCount: number, entity: string, parentRef: string): TransitionResult {
  if (existingCount > 0) {
    return no(`A ${entity} already exists for ${parentRef}. Only one is permitted.`);
  }
  return ok;
}

/* ------------------------------------------------------------------ *
 * Status → tone (paired with a glyph and text label everywhere; never colour alone)
 * ------------------------------------------------------------------ */

const TONE_MAP: Record<string, StatusTone> = {
  // contract
  new_pc: "info",
  pending_compliance: "warn",
  under_execution: "accent",
  exported_from_chad: "info",
  partially_completed: "warn",
  completed: "ok",
  cancelled: "na",
  // execution plan
  draft: "idle",
  planned: "info",
  in_execution: "accent",
  // cargo
  not_available: "risk",
  partially_ready: "warn",
  awaiting_tagging: "warn",
  awaiting_fumigation: "warn",
  awaiting_analysis: "warn",
  awaiting_pp_check: "warn",
  awaiting_classification: "warn",
  awaiting_customer_approval: "warn",
  ready: "ok",
  in_transit: "info",
  // export contract
  not_requested: "idle",
  requested: "info",
  sent_to_mot: "info",
  received_from_mot: "info",
  under_process: "accent",
  issued: "ok",
  expiring_soon: "warn",
  expired: "risk",
  // ex form
  under_processing: "accent",
  used: "na",
  // shipment
  booked: "info",
  cleared: "info",
  stuffed: "accent",
  sailed: "accent",
  documents_complete: "ok",
  closed: "ok",
  blocked: "risk",
  // clearance
  started: "idle",
  in_progress: "accent",
  // document
  not_required: "na",
  not_issued: "idle",
  draft_received: "warn",
  amendment_requested: "risk",
  confirmed: "info",
  original_received: "ok",
  // charge
  not_applicable: "na",
  awaited: "warn",
  invoice_received: "info",
  approved: "info",
  paid: "ok",
  disputed: "risk",
  // bank
  assembling: "idle",
  sent_to_trade_finance: "info",
  submitted_to_bank: "info",
  under_collection: "accent",
  matured: "warn",
  overdue: "risk",
  // custody
  not_started: "idle",
  reviewed: "info",
  /* ---- workflow v2.0 additions ---- */
  // opportunity stage (derived, not stored — v2.0 §6.1/§6.2 define no status model)
  identified: "idle",
  costed: "info",
  deal_agreed: "accent",
  contracted: "ok",
  lapsed: "na",
  // stock lot state (v2.0 §6.6) — `under_process` is mapped above for the export
  // contract and carries the same "work in progress" reading here.
  ready_finished: "ok",
  reserved: "accent",
  // tags / artwork specification (v2.0 §6.5)
  specified: "info",
  agreed: "ok",
  reissued: "warn",
  // warehouse request (v2.0 §6.6 exception 3)
  raised: "info",
  quality_visit: "accent",
  quality_released: "info",
  execution_approved: "info",
  created_in_erp: "ok",
  rejected: "risk",
  // advance payment (v2.0 §6.7)
  amount_pending: "warn",
  amount_determined: "info",
  // movement leg (v2.0 §6.10)
  loading: "accent",
  arrived: "ok",
  // review feedback outcome (v2.0 §6.4)
  pending: "idle",
  concern: "risk",
  // buyer claim / insurance incident (v2.0 §6.16)
  claim_built: "accent",
  finalised: "ok",
  reported: "info",
  // freight rate provenance (v2.0 §6.8) — a maintained rate against a platform feed
  manual: "info",
  searates: "accent",
  // sourcing intake — MMP
  on_going: "accent",
  hold: "warn",
  open: "info",
  need_review: "warn",
  // purchase agreement — added 3 September 2026
  for_quality_inspection: "info",
  // agreement type (3 September 2026). Neither type is better than the other, so
  // neither carries a risk or a success tone.
  fixed: "info",
  collection: "accent",
  // quality inspection result (3 September 2026). `approved` and `rejected` already
  // carry tones above, from the approval flow, and are reused rather than redefined.
  re_test: "warn",
  // customer feedback outcome (v2.0 §6.16)
  satisfied: "ok",
  complaint_service: "risk",
  complaint_commodity: "risk",
  received_by_opu: "info",
  received_by_pzu: "ok",
  // milestone
  not_applicable_ms: "na",
};

export function toneFor(status: string): StatusTone {
  return TONE_MAP[status] ?? "idle";
}

/** Human label from a snake_case status key, when no explicit label map exists. */
/**
 * Words the business writes in capitals. Without this, `new_pc` renders as "New pc" and
 * `si_srf` as "Si srf", which is not what any of the source screens say.
 */
const ACRONYMS: Record<string, string> = {
  pc: "PC",
  si: "SI",
  srf: "SRF",
  sr: "SR",
  ex: "EX",
  bl: "B/L",
  dbl: "DBL",
  cbl: "CBL",
  obl: "OBL",
  awb: "AWB",
  coo: "COO",
  ssmo: "SSMO",
  opu: "OPU",
  pzu: "PZU",
  mot: "MOT",
  lv: "LV",
  qa: "QA",
  sap: "SAP",
  erp: "ERP",
  sma: "SMA",
  fpa: "FP&A",
  mmp: "MMP",
  pa: "PA",
  usd: "USD",
  sdg: "SDG",
  tr: "T/R",
  eta: "ETA",
  ata: "ATA",
  etb: "ETB",
  atb: "ATB",
  etd: "ETD",
  atd: "ATD",
};

export function humanise(key: string): string {
  const words = key.split("_").map((w) => ACRONYMS[w.toLowerCase()] ?? w);
  const joined = words.join(" ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

/* ================================================================== *
 * WORKFLOW v2.0 — transition maps
 *
 * A transition map is added only where a source states the states and their order.
 * Where v2.0 records that no state model exists — the opportunity (§6.1), the deal
 * (§6.2), the Phase 04 review (§6.4), the stuffing request (§6.10) and the MMP
 * `Flow Status` (no transition evidence in the page documentation) — no map appears
 * here and the screen says the ordering is unconfirmed rather than enforcing one.
 * ================================================================== */

/**
 * v2.0 §6.6: "Stock: under process (raw) → ready as finished good → reserved for the
 * purchase contract." The blocking control is stated as a rule, not a system
 * behaviour: "Raw material cannot be allocated until processing is complete."
 */
export const STOCK_TRANSITIONS: Record<StockState, StockState[]> = {
  under_process: ["ready_finished"],
  ready_finished: ["reserved"],
  reserved: ["ready_finished"],
};

/**
 * v2.0 §6.6 exception 3, in the order the source lists the actors:
 * raised → Quality visit → Quality release → Execution approval → created in the ERP.
 */
export const WAREHOUSE_REQUEST_TRANSITIONS: Record<WarehouseRequestState, WarehouseRequestState[]> = {
  raised: ["quality_visit", "rejected"],
  quality_visit: ["quality_released", "rejected"],
  quality_released: ["execution_approved", "rejected"],
  execution_approved: ["created_in_erp"],
  created_in_erp: [],
  rejected: [],
};

/**
 * v2.0 §6.7: FP&A determines the amount, then "payments are issued and need to be
 * confirmed". `not_applicable` is terminal — Chad has no advance payment step.
 */
export const ADVANCE_PAYMENT_TRANSITIONS: Record<AdvancePaymentState, AdvancePaymentState[]> = {
  not_applicable: [],
  amount_pending: ["amount_determined"],
  amount_determined: ["issued"],
  issued: ["confirmed"],
  confirmed: [],
};

/** v2.0 §6.10 activities 1–2, as the movement is described. */
export const MOVEMENT_LEG_TRANSITIONS: Record<MovementLegState, MovementLegState[]> = {
  planned: ["loading"],
  loading: ["in_transit"],
  in_transit: ["arrived"],
  arrived: ["closed"],
  closed: [],
};

/**
 * v2.0 §6.5: the tags / artwork specification is agreed as either the standard option
 * or a buyer option [AS-IS]; reprocessing changes the packaging and the tags after the
 * specification has been set, which is why `agreed` is not terminal.
 */
export const TAG_SPECIFICATION_TRANSITIONS: Record<TagSpecificationState, TagSpecificationState[]> = {
  not_started: ["specified"],
  specified: ["agreed"],
  agreed: ["reissued"],
  reissued: ["agreed"],
};

/** v2.0 §6.16: "Claim: raised → approved." Rejection is the unstated other outcome. */
export const BUYER_CLAIM_TRANSITIONS: Record<BuyerClaimState, BuyerClaimState[]> = {
  raised: ["approved", "rejected"],
  approved: [],
  rejected: [],
};

/** v2.0 §6.16 exception 2: "recorded → the claim is built → finalised". */
export const INSURANCE_INCIDENT_TRANSITIONS: Record<InsuranceIncidentState, InsuranceIncidentState[]> = {
  reported: ["claim_built"],
  claim_built: ["finalised"],
  finalised: [],
};

/**
 * MMP Add Receipt Price — `Receipt Status` has exactly two values and the page
 * documentation states no rule for moving between them, so both directions are open
 * and the screen says the ordering is unconfirmed.
 */
export const INTAKE_RECEIPT_TRANSITIONS: Record<IntakeReceiptStatus, IntakeReceiptStatus[]> = {
  need_review: ["confirmed"],
  confirmed: ["need_review"],
};

/* ------------------------------------------------------------------ *
 * Guards for the v2.0 controls that a source states
 * ------------------------------------------------------------------ */

/**
 * v2.0 §6.1 blocking controls, both [PROPOSED]:
 *  · "The costing snapshot is a mandatory input to the deal agreement step — a deal
 *     cannot be agreed without one (workshop, Costing 1(vi))."
 *  · "The long / short declaration is mandatory, and a short declaration requires the
 *     expected raw purchase price."
 */
export function guardDealAgreement(costing?: {
  locked?: boolean;
  position?: "long" | "short";
  expectedRawPricePerMt?: unknown;
}): TransitionResult {
  if (!costing) {
    return {
      allowed: false,
      reason:
        "A deal cannot be agreed without a costing snapshot (proposed control, workshop Costing 1(vi)).",
    };
  }
  if (!costing.position) {
    return {
      allowed: false,
      reason: "The long / short position declaration is mandatory before the deal can be agreed.",
    };
  }
  if (costing.position === "short" && !costing.expectedRawPricePerMt) {
    return {
      allowed: false,
      reason: "A short position requires the expected raw purchase price before the deal can be agreed.",
    };
  }
  return { allowed: true };
}

/**
 * v2.0 §6.6: "Raw material cannot be allocated until processing is complete.
 * [AS-IS] — stated as the rule, not as a system behaviour." Enforced here because
 * the source states it as the rule; the screen names it as such.
 */
export function guardStockAllocation(lot: { state: StockState; smaFlagged?: boolean }): TransitionResult {
  if (lot.state === "under_process") {
    return {
      allowed: false,
      reason:
        "Raw material cannot be allocated to a contract until processing is complete; until then it shows as under process.",
    };
  }
  if (lot.state === "reserved") {
    return { allowed: false, reason: "This lot is already reserved against a purchase contract." };
  }
  return { allowed: true };
}

/**
 * v2.0 §6.5: "Parameters that are mandatory for the specific commodity must be
 * provided." The source does not say what a missing parameter blocks (§6.5 open
 * question 3), so this reports rather than refuses, and the caller decides.
 */
export function checkMandatoryQualityParameters(
  parameters: { name: string; mandatory: boolean; masterSpec: string; buyerSpec?: string }[],
): { complete: boolean; missing: string[] } {
  const missing = parameters
    .filter((p) => p.mandatory && !(p.buyerSpec ?? p.masterSpec).trim())
    .map((p) => p.name);
  return { complete: missing.length === 0, missing };
}

/**
 * v2.0 §6.10: "Whether stuffing can begin without a stuffing request. The workshop
 * describes the request as what initiates the operation, which implies it is a
 * precondition, but states no rule." [OPEN] — so this warns and never refuses.
 */
export function checkStuffingRequestRaised(request?: { raisedOn?: string }): {
  raised: boolean;
  advisory: string;
} {
  return {
    raised: Boolean(request?.raisedOn),
    advisory:
      "The workshop describes the stuffing request as what initiates the stuffing operation, but states no blocking rule. Whether it gates stuffing is open (v2.0 §6.10).",
  };
}
