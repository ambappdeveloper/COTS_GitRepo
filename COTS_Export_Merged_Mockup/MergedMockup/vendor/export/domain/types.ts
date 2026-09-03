/**
 * COTS Export — typed domain model.
 *
 * Every type here traces to evidence in `docs/export/export-source-traceability.csv`.
 * Design decisions that differ deliberately from the legacy SharePoint schema are
 * marked PROPOSED with the defect they fix (see export-process-update.md §4.3).
 *
 * Five structural departures from the legacy model:
 *  1. Repeating data is a child collection with NO ceiling  (fixes §4.3a: 7/5/7/20 slot limits)
 *  2. Quantities are `number`, money is `Money`, dates are ISO date strings
 *                                                          (fixes §4.3b: Text-typed numbers/dates)
 *  3. One name per concept                                  (fixes §4.3c,i,j: misspelt/duplicate/cryptic names)
 *  4. Derived values are computed, never stored             (fixes §4.3d: -120, #NAME?, NaN, float noise)
 *  5. Status transitions are enforced by an allowed-transition map
 *                                                          (fixes §4.3e: advisory-only blocking rules)
 */

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

/** ISO-8601 date, `YYYY-MM-DD`. Never a display-formatted string. */
export type IsoDate = string;

export type CurrencyCode = "USD" | "AED" | "SDG" | "EUR" | "ETB" | "TZS";

/**
 * Money always carries its currency.
 * PROPOSED — fixes the `Sales Order` defect where `Total sales amount (MT)` is
 * denominated in AED beneath a field labelled `Price MT (USD)`, with the currency
 * stated on neither the label nor the column (decision D13).
 */
export interface Money {
  amount: number;
  currency: CurrencyCode;
}

/** Metric tonnes. Always numeric — the legacy chain stores most of these as Text. */
export type Mt = number;

/**
 * How a field behaves on screen.
 * `inherited` preserves the legacy pale-green convention: a value carried from an
 * upstream record that this role does not own. It is the single most useful idea in
 * the legacy forms (§4.4.1) and is kept deliberately.
 */
export type FieldBehaviour =
  "editable" | "required" | "readonly" | "inherited" | "calculated" | "conditional";

export type Role =
  | "trader"
  | "dubai_execution"
  | "partner_execution"
  | "trade_finance"
  | "compliance"
  | "logistics"
  | "warehouse"
  | "quality"
  | "surveyor"
  | "processing"
  | "finance";

export const ROLE_LABEL: Record<Role, string> = {
  trader: "Trader",
  dubai_execution: "Dubai Execution",
  partner_execution: "Partner / Country Execution",
  trade_finance: "Trade Finance",
  compliance: "Compliance",
  logistics: "Logistics",
  warehouse: "Warehouse",
  quality: "Quality",
  surveyor: "Surveyor",
  processing: "Processing",
  finance: "Finance",
};

/* ------------------------------------------------------------------ *
 * Variants — country / operating unit and shipment type
 * Evidence: COTS - Workshop Notes; Export/*.vsdx; Tanzania & MOZ PDFs
 * ------------------------------------------------------------------ */

export type CountryUnit = "SD" | "ET" | "TD" | "TZ" | "MZ";

export interface CountryProfile {
  code: CountryUnit;
  name: string;
  partnerEntity: string;
  /** Export contract (EX contract) applicable? Workshop notes: not Tanzania; yes Sudan & Ethiopia. */
  usesExportContract: boolean;
  /** EX forms applicable? Workshop notes: "mainly in Sudan". */
  usesExportForms: boolean;
  /** Export permit used instead of / alongside an EX contract. */
  usesExportPermit: boolean;
  /** Mozambique starts customs from a commercial invoice. */
  startsFromCommercialInvoice: boolean;
  /** Service Request to logistics — workshop notes: Sudan only. */
  usesLogisticsServiceRequest: boolean;
  /** Chad and Ethiopia have an inland leg before the load port. */
  hasInlandTransitLeg: boolean;
  inlandLegLabel?: string;
  loadPort: string;
  regulators: string[];
  /** Chad tracks only originals for three certificate types. */
  simplifiedDocumentTracking: boolean;
  evidence: string[];
}

export type ShipmentType = "container" | "bulk" | "break_bulk" | "road" | "air";

export const SHIPMENT_TYPE_LABEL: Record<ShipmentType, string> = {
  container: "Containerised",
  bulk: "Bulk",
  break_bulk: "Break bulk",
  road: "Road",
  air: "Air",
};

/* ------------------------------------------------------------------ *
 * Status enums — AS-IS values from the captured screens where they exist
 * ------------------------------------------------------------------ */

/** AS-IS — `Purchase Contract` §2 Status drop-down. */
export type ContractStatus =
  | "new_pc"
  | "pending_compliance" // PROPOSED — the compliance gate has no status today
  | "under_execution"
  | "exported_from_chad"
  | "partially_completed"
  | "completed"
  | "cancelled"; // PROPOSED — a "This PC was Cancelled" rule exists with no status

/** PROPOSED — the legacy drop-down could not be captured (decision D16). */
export type ExecutionPlanStatus = "draft" | "planned" | "in_execution" | "completed" | "cancelled";

/** AS-IS — `Shipments Execution` Cargo Status, all ten values, in operational order. */
export type CargoStatus =
  | "not_available"
  | "partially_ready"
  | "awaiting_tagging"
  | "awaiting_fumigation"
  | "awaiting_analysis"
  | "awaiting_pp_check"
  | "awaiting_classification"
  | "awaiting_customer_approval"
  | "ready"
  | "in_transit";

export const CARGO_STATUS_LABEL: Record<CargoStatus, string> = {
  not_available: "Not available",
  partially_ready: "Partially ready",
  awaiting_tagging: "Ready — awaiting tagging",
  awaiting_fumigation: "Ready — awaiting fumigation",
  awaiting_analysis: "Ready — awaiting analysis",
  awaiting_pp_check: "Ready — awaiting PP check",
  awaiting_classification: "Ready — awaiting classification",
  awaiting_customer_approval: "Ready — awaiting customer approval",
  ready: "Ready",
  in_transit: "In transit",
};

/** AS-IS — `EX Contract Request` + `Ex-contract-Follow-up`, with PROPOSED additions. */
export type ExportContractStatus =
  | "not_requested"
  | "requested"
  | "sent_to_mot" // PROPOSED — columns exist, no form controls (decision D7)
  | "received_from_mot" // PROPOSED — as above
  | "under_process"
  | "issued"
  | "expiring_soon" // PROPOSED — derived
  | "expired";

/** AS-IS — `Export form details` EX Form Status, plus `Used` from `Clearance`. */
export type ExportFormStatus = "under_processing" | "issued" | "used";

/** AS-IS — `Export Preclearance Tracking Document` Tracking Document Status. */
export type PreclearanceCustodyStatus = "not_started" | "reviewed" | "received_by_opu" | "received_by_pzu";

/** PROPOSED — unifies the legacy `SI Status`, `SR Status` and booking status. */
export type ShipmentStatus =
  | "draft"
  | "planned"
  | "booked"
  | "cleared"
  | "stuffed"
  | "sailed"
  | "documents_complete"
  | "closed"
  | "blocked"
  | "cancelled";

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  draft: "Draft",
  planned: "Planned",
  booked: "Booked",
  cleared: "Cleared",
  stuffed: "Stuffed & sealed",
  sailed: "Sailed",
  documents_complete: "Documents complete",
  closed: "Closed",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

/** AS-IS — `Clearance` Status + the five-stage progress band from `Clearance_Restored`. */
export type ClearanceStatus = "started" | "in_progress" | "completed";

export type ClearanceStage =
  "custom_clearance" | "ssmo" | "fumigation" | "stuffing_operation" | "clearance_certificate";

export const CLEARANCE_STAGE_LABEL: Record<ClearanceStage, string> = {
  custom_clearance: "Custom clearance",
  ssmo: "SSMO",
  fumigation: "Fumigation",
  stuffing_operation: "Stuffing operation",
  clearance_certificate: "Clearance certificate",
};

/** AS-IS — `Documents Confirmation` draft/confirmed/original, plus `Not Required` flags. */
export type DocumentState =
  | "not_required"
  | "not_issued"
  | "draft_received"
  | "amendment_requested" // PROPOSED — the DBL amendment loop has no status today
  | "confirmed"
  | "original_received";

export const DOCUMENT_STATE_LABEL: Record<DocumentState, string> = {
  not_required: "Not required",
  not_issued: "Not issued",
  draft_received: "Draft received",
  amendment_requested: "Amendment requested",
  confirmed: "Confirmed",
  original_received: "Original received",
};

/** PROPOSED — replaces the legacy default of `No Charge`, which makes an untouched
 *  record look deliberately settled (§4.3, `Shipment Documents Tracking`). */
export type ChargeStatus =
  "not_applicable" | "awaited" | "invoice_received" | "approved" | "paid" | "disputed";

export type ChargeType = "local_invoice" | "freight_invoice" | "detention" | "port_storage" | "other";

export const CHARGE_TYPE_LABEL: Record<ChargeType, string> = {
  local_invoice: "Local invoice",
  freight_invoice: "Freight invoice",
  detention: "Detention",
  port_storage: "Port storage",
  other: "Other",
};

/** PROPOSED — replaces `Post Shipment Document Completed` + free-text Trade Finance status. */
export type BankSubmittalStatus =
  | "assembling"
  | "sent_to_trade_finance"
  | "submitted_to_bank"
  | "under_collection"
  | "matured"
  | "paid"
  | "overdue";

/**
 * Milestone state — eight values.
 * CTRM has two (done / not done, by fill colour alone). Every extra state here is
 * grounded in real evidence: `blocked` (unmet prerequisite), `overdue` (EX No.927's
 * expiry preceding its shipment date), `not_applicable` (EX contract in Tanzania).
 */
export type MilestoneState =
  | "not_started"
  | "ready"
  | "in_progress"
  | "completed"
  | "blocked"
  | "overdue"
  | "not_applicable"
  | "cancelled";

export const MILESTONE_STATE_LABEL: Record<MilestoneState, string> = {
  not_started: "Not started",
  ready: "Ready to start",
  in_progress: "In progress",
  completed: "Completed",
  blocked: "Blocked",
  overdue: "Overdue",
  not_applicable: "Not applicable",
  cancelled: "Cancelled",
};

/** Distinct glyph per state so the component survives greyscale — CTRM anti-pattern A3. */
export const MILESTONE_STATE_GLYPH: Record<MilestoneState, string> = {
  not_started: "○",
  ready: "◔",
  in_progress: "◐",
  completed: "✓",
  blocked: "⊘",
  overdue: "!",
  not_applicable: "–",
  cancelled: "✕",
};

export type StatusTone = "ok" | "warn" | "risk" | "info" | "idle" | "na" | "accent";

/* ------------------------------------------------------------------ *
 * Phases
 * ------------------------------------------------------------------ */

export type PhaseId =
  "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "P8" | "P9" | "P10" | "P11" | "P12" | "P13" | "P14";

export interface Phase {
  id: PhaseId;
  name: string;
  owner: Role;
  /** Route into the workspace that owns this phase. */
  module: string;
}

/* ------------------------------------------------------------------ *
 * Milestones
 * ------------------------------------------------------------------ */

export interface MilestoneDefinition {
  key: string;
  name: string;
  phase: PhaseId;
  /** Grouping band in the expanded execution flow (C5). */
  band: string;
  owner: Role;
  /** Keys of milestones that must complete first. */
  prerequisites: string[];
  /** Target duration in days, from the documented SLAs where they exist. */
  slaDays?: number;
  /** Source of the SLA, shown in the milestone detail panel. */
  slaSource?: string;
  /** Only applicable when this predicate passes for the shipment's variant. */
  appliesTo?: (ctx: VariantContext) => boolean;
  /** Documents this milestone is responsible for. */
  documents?: string[];
  evidence: string;
}

export interface VariantContext {
  country: CountryProfile;
  shipmentType: ShipmentType;
  isLargeVolume: boolean;
  usesFreightForwarder: boolean;
  commodityIsGold: boolean;
}

export interface Milestone {
  key: string;
  state: MilestoneState;
  /** Completion date when completed; target date otherwise. */
  actualDate?: IsoDate;
  targetDate?: IsoDate;
  ownerName?: string;
  /** Populated when state is `blocked`. */
  blockingReason?: string;
  /** 0–1. Derived from the milestone's required documents. */
  documentCompleteness?: number;
  note?: string;
}

/* ------------------------------------------------------------------ *
 * Master data
 * ------------------------------------------------------------------ */

/**
 * PROPOSED — the legacy `Raw Material (Commodities)` list is one column, 15 rows,
 * three naming conventions, no code, no UOM, no Active flag and no uniqueness
 * enforcement (§4.3h). This adds all four.
 */
/**
 * The business-facing grouping the export plan is written against, taken verbatim from
 * the `Commodity Group` column of the Plan sheet in `Export Plan V1.xlsx`. It is not the
 * same thing as `Commodity.category`, which is the technical classification the contract
 * and quality screens use — both are kept, because the spreadsheet groups by one and the
 * rest of the prototype by the other.
 */
export type CommodityGroup =
  "Peanut Category" | "Sesame Category" | "Cotton Category" | "Gum Arabic Category" | "Sorghum" | "Others";

export interface Commodity {
  id: string;
  code: string;
  name: string;
  category: "oilseed" | "nut" | "gum" | "pulse" | "cotton" | "cereal" | "oil";
  /** `Commodity Group` on the Plan sheet. Filled from the commodity, never typed. */
  group: CommodityGroup;
  defaultPackingType: PackingType;
  /** Quality parameters mandatory for this commodity, defaulted onto the contract. */
  qualityParameters: { name: string; spec: string }[];
  requiresFumigation: boolean;
  active: boolean;
}

export type PackingType = "bags" | "bales" | "bulk" | "flexi_tank" | "drums";

export interface Port {
  id: string;
  name: string;
  country: string;
  type: "load" | "discharge" | "both";
}

export interface Counterparty {
  id: string;
  name: string;
  nickName: string;
  address: string;
  country: string;
  type: "buyer" | "supplier" | "shipper" | "surveyor" | "shipping_line" | "bank" | "forwarder";
  active: boolean;
}

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  unit: string;
  /**
   * The operating country the session is working in.
   *
   * Added by the instruction of 3 September 2026, which took the country drop-down off
   * the receiving-location plan line with the reason: *"country is automatically read in
   * the core module once the user is login to COTS the settings of country is already
   * available."* That is right, and the country was being asked for only because this
   * module had nowhere to read it from. Now it does: the country is part of the session,
   * and a screen that needs it reads it rather than asking.
   *
   * Optional on the type because the Export prototype runs two ways. Inside the merged
   * mock-up the Core session carries it (see `carriedSession` in the integration layer,
   * which sets it from Core's `activeCountry`). Run standalone, the demo accounts carry
   * their own — `activeCountryOf()` in `domain/variants.ts` resolves it either way and
   * says when it fell back, so a screen never presents a defaulted country as a
   * confirmed one.
   */
  country?: CountryUnit;
}

/* ------------------------------------------------------------------ *
 * Contract (P2)
 * ------------------------------------------------------------------ */

export type Incoterm = "CNF" | "CIF" | "FOB" | "FCA" | "EXW" | "DAP";

export interface ContractLot {
  lotNo: number;
  quantityMt: Mt;
  containerCount: number;
}

/** AS-IS — the 15 checkboxes on `Purchase Contract` §4, plus `SSMO Certificate`
 *  which appears only on `SI & SRF`. One canonical list (PROPOSED). */
export type DocumentRequirementKey =
  | "bl_awb_roadwb"
  | "commercial_invoice"
  | "coo_normal"
  | "packing_list"
  | "fumigation_certificate"
  | "phytosanitary_certificate"
  | "quality_certificate_surveyor"
  | "weight_certificate_surveyor"
  | "dft"
  | "export_health_certificate"
  | "certificate_of_analysis"
  | "ldc"
  | "coo_arabic"
  | "invoice_arabic"
  | "ssmo_certificate"
  | "other";

export const DOCUMENT_REQUIREMENT_LABEL: Record<DocumentRequirementKey, string> = {
  bl_awb_roadwb: "B/L – AWB – Road WB",
  commercial_invoice: "Commercial invoice",
  coo_normal: "Certificate of origin (normal)",
  packing_list: "Packing list",
  fumigation_certificate: "Fumigation certificate",
  phytosanitary_certificate: "Phytosanitary certificate",
  quality_certificate_surveyor: "Quality certificate (independent surveyor)",
  weight_certificate_surveyor: "Weight certificate (independent surveyor)",
  dft: "DFT (duty-free tariff COO)",
  export_health_certificate: "Export health certificate",
  certificate_of_analysis: "Certificate of analysis",
  ldc: "LDC certificate of origin",
  coo_arabic: "Arabic certificate of origin",
  invoice_arabic: "Arabic invoice",
  ssmo_certificate: "SSMO certificate",
  other: "Other",
};

export type FumigationType = "phosphine" | "methyl_bromide" | "none";

export interface ReviewFeedback {
  role: Role;
  respondedBy?: string;
  respondedOn?: IsoDate;
  outcome: "pending" | "confirmed" | "concern";
  comment?: string;
}

export interface Contract {
  id: string;
  contractNo: string;
  status: ContractStatus;
  createdDate: IsoDate;
  businessConfirmationDate: IsoDate;
  buyerId: string;
  /** AS-IS required on the legacy form and empty on the live record — enforced here. */
  buyerAddress: string;
  buyerNickName: string;
  commodityId: string;
  commodityType?: string;
  origin: CountryUnit;
  traderName: string;
  quantityMt: Mt;
  tolerancePct: number;
  shipmentPeriodStart: IsoDate;
  shipmentPeriodEnd: IsoDate;
  extensionDate?: IsoDate;
  lots: ContractLot[];
  incoterm: Incoterm;
  shipmentType: ShipmentType;
  methodOfShipping: string;
  packingType: PackingType;
  packingSizeKg: number;
  cargoInstruction?: string;
  nominatedSurveyorId?: string;
  freeDaysAtPort: number;
  sapNumber?: string;
  assignedDubaiExecution: string;
  portOfDischargeId: string;
  portOfLoadingId: string;
  consignee: string;
  notifyParty: string;
  documentRequirements: DocumentRequirementKey[];
  partialShipmentAllowed: boolean;
  fumigationType: FumigationType;
  artworkType: "standard" | "buyer_option";
  artworkPrintedBags: boolean;
  artworkTags: boolean;
  paymentTerms: string;
  /** PROPOSED (P3) — the workshop requirement with no legacy screen. */
  reviewFeedback: ReviewFeedback[];
  /** PROPOSED (R29) — costing snapshot mandatory at deal agreement. */
  costingSnapshot?: {
    estimatedCostPerMt: Money;
    salesPricePerMt: Money;
    marginPct: number;
    position: "long" | "short";
    expectedRawPricePerMt?: Money;
    takenOn: IsoDate;
  };
  /**
   * v2.0 §6.2 — the opportunity and deal this contract was raised from.
   * Absent on a contract entered directly, which is what every legacy record is.
   */
  opportunityId?: string;
  /** v2.0 §6.5 Phase 05 — contract quality terms, retrieved from master and overridden per buyer. */
  qualityTerms?: ContractQualityParameter[];
  /** v2.0 §6.5 Phase 05 — the separate tags / artwork specification flow. */
  tagSpecification?: TagSpecification;
  isLargeVolume: boolean;
  note?: string;
}

/* ------------------------------------------------------------------ *
 * Execution plan (P4) and cargo readiness (P5)
 * ------------------------------------------------------------------ */

export interface ExecutionPlan {
  id: string;
  planningNo: string; // `PC.n`
  contractId: string;
  status: ExecutionPlanStatus;
  createdDate: IsoDate;
  plannedQuantityMt: Mt;
  portOfLoadingId: string;
  shipperName: string;
  shipperAddress: string;
  shipperOnBehalfOf: string;
  bank: string;
  bankBranch?: string;
  seasonality: string;
  cargoSource: "CIM" | "JV";
  exportContractPaymentTerms: string;
  urgency: "low" | "medium" | "high";
  assignedTo: string;
  rawQuantityMt?: Mt;
  finishedQuantityMt?: Mt;
  needProcessingMt?: Mt;
  receivingAtFacilityDate?: IsoDate;
  toBeShippedBefore?: IsoDate;
  isLargeVolume: boolean;
  note?: string;
}

export interface CargoReadiness {
  id: string;
  executionPlanId: string;
  cargoStatus: CargoStatus;
  statusDate: IsoDate;
  qtyReadyMt: Mt;
  /** Chad only — AS-IS `Cargo Transit Status` / `Cargo arrival status`, both unused today (D8). */
  transitStatus?: "partially_in_transit" | "loaded";
  arrivalStatus?: "partially_arrived" | "arrived";
  loadingStartDate?: IsoDate;
  loadedQtyMt?: Mt;
  loadingEndDate?: IsoDate;
  arrivedQtyMt?: Mt;
  arrivalDate?: IsoDate;
  /** PROPOSED — the workshop's stock-allocation redesign. */
  allocations: StockAllocation[];
  /**
   * v2.0 §6.6 activity 2 — "the processing team gives feedback that the stock is
   * ready as a finished good, and the stock is reserved for the purchase contract."
   */
  processingConfirmedOn?: IsoDate;
  processingConfirmedBy?: string;
  /**
   * v2.0 §6.6 activity 6 — cargo readiness allocation is confirmed. [PROPOSED]:
   * the workshop records that an enhanced process is to be applied but does not
   * describe it, so this is a confirmation stamp and nothing more.
   */
  readinessConfirmedOn?: IsoDate;
  readinessConfirmedBy?: string;
  remarks?: string;
}

export interface StockAllocation {
  lotRef: string;
  facility: string;
  grade: string;
  quantityMt: Mt;
  state: "under_process" | "reserved" | "released";
}

/* ------------------------------------------------------------------ *
 * Export contract (P6) and EX forms (P7)
 * ------------------------------------------------------------------ */

export interface ExportForm {
  formNo: string;
  quantityMt: Mt;
  status: ExportFormStatus;
  issuedOn?: IsoDate;
  /** Populated when consumed at clearance. */
  usedOnClearanceId?: string;
  psFileNo?: string;
  exportCertificateNo?: string;
  declarationNo?: string;
}

export interface ExportContractConsumption {
  purchaseContractNo: string;
  shipmentRef: string;
  exportFormNo: string;
  quantityMt: Mt;
}

export interface ExportContract {
  id: string;
  /** Request stage. */
  requestNo: string;
  executionPlanId: string;
  contractId: string;
  status: ExportContractStatus;
  requestedOn: IsoDate;
  requestedQuantityMt: Mt;
  exportingEntity: "Invictus" | "Sayga" | "Green Zone";
  unitPrice?: Money;
  /** Issuance stage. */
  exportContractNo?: string;
  issuanceDate?: IsoDate;
  expiryDate?: IsoDate;
  actualExporterName?: string;
  actualBank?: string;
  actualBankBranch?: string;
  actualQuantityMt?: Mt;
  /** AS-IS columns that have no form controls today (decision D7). */
  sentToMotDate?: IsoDate;
  receivedFromMotDate?: IsoDate;
  sentToTradeFinanceDate?: IsoDate;
  chamberOfExportersDate?: IsoDate;
  scannedContractName?: string;
  /** Child collection with NO ceiling — replaces 41 flattened slot columns. */
  exportForms: ExportForm[];
  /** One EX contract may be consumed across many PCs (rule R6). */
  consumption: ExportContractConsumption[];
  isLargeVolume: boolean;
  notes?: string;
}

export interface PreclearancePack {
  id: string;
  exportContractId: string;
  status: PreclearanceCustodyStatus;
  scannedDocumentName?: string;
  scannedOn?: IsoDate;
  scannedBy?: string;
  receivedByOpu: boolean;
  receivedByOpuDate?: IsoDate;
  receivedByPzu: boolean;
  receivedByPzuDate?: IsoDate;
}

/* ------------------------------------------------------------------ *
 * Shipment (P9) and everything hanging off it
 * ------------------------------------------------------------------ */

export interface FreightOffer {
  id: string;
  offerNo: string;
  shippingLine: string;
  isForwarder: boolean;
  forwarderName?: string;
  rate20ft?: Money;
  rate40ft?: Money;
  offerFrom: "Dubai" | "Origin";
  destinationPortId: string;
  offerDate: IsoDate;
  freeDaysAtPol: number;
  freeDaysAtPod: number;
  validity: IsoDate;
  selected: boolean;
  remarks?: string;
}

export interface Booking {
  bookingNo?: string;
  shippingLine?: string;
  vesselName?: string;
  voyageNo?: string;
  /** AS-IS the only required field on the legacy form, and empty on live records. */
  vesselEtaPol?: IsoDate;
  vesselAtaPol?: IsoDate;
  shippedOnBoardDate?: IsoDate;
  /** AS-IS — 11 columns with no form fields on the legacy booking screen (D5). */
  draftBlConfirmationDate?: IsoDate;
  originalBlDate?: IsoDate;
  blNumber?: string;
  blNetWeightKg?: number;
  blDeliveredToBankDate?: IsoDate;
  attachmentName?: string;
}

export interface ChargeAllocation {
  originLocal: "shipper" | "consignee";
  seaFreight: "shipper" | "consignee";
  destinationLocal: "shipper" | "consignee";
  other: "shipper" | "consignee" | "unset";
}

export interface ShippingInstruction {
  finalSiNo?: string;
  issuedOn?: IsoDate;
  lastShippingDate?: IsoDate;
  consignee: string;
  notifyParty: string;
  secondNotifyParty?: string;
  forwardingAgent?: string;
  placeOfReceipt?: string;
  placeOfDelivery?: string;
  serviceType?: string;
  chargeAllocation: ChargeAllocation;
  blOriginals: number;
  blCopies: number;
  releasedBillTo?: string;
  placeOfRelease?: string;
  billKind: "received" | "shipped" | "unset";
  /** Dangerous / temperature-controlled block. */
  tempC?: number;
  humidityPct?: number;
  ventilationCbmHr?: number;
  unNo?: string;
  imcoNo?: string;
  flashPoint?: string;
}

export type RegulatoryActivityKey =
  | "customs_declaration"
  | "customs_release"
  | "ssmo_sampling"
  | "ssmo_certificate"
  | "plant_protection"
  | "fumigation"
  | "health_veterinary"
  | "examination"
  | "spc"
  | "surveyor_appointment"
  | "tancis_declaration"
  | "tra_release_order"
  | "atomic_certificate"
  | "vgm";

export const REGULATORY_ACTIVITY_LABEL: Record<RegulatoryActivityKey, string> = {
  customs_declaration: "Customs declaration",
  customs_release: "Customs release",
  ssmo_sampling: "SSMO sampling",
  ssmo_certificate: "SSMO certificate & analysis",
  plant_protection: "Plant protection / phytosanitary",
  fumigation: "Fumigation",
  health_veterinary: "Health / veterinary certificate",
  examination: "Examination (SSMO / health / PP)",
  spc: "SPC",
  surveyor_appointment: "Surveyor appointment",
  tancis_declaration: "TANCIS declaration",
  tra_release_order: "TRA release order",
  atomic_certificate: "Atomic certificate",
  vgm: "VGM filing",
};

export interface RegulatoryActivity {
  key: RegulatoryActivityKey;
  applicable: boolean;
  startDate?: IsoDate;
  completedDate?: IsoDate;
  reference?: string;
  attachmentName?: string;
  owner: Role;
  note?: string;
}

export interface Clearance {
  clearanceNo?: string;
  status: ClearanceStatus;
  submitToCustomsDate?: IsoDate;
  declarationNo?: string;
  customsReleaseDate?: IsoDate;
  stuffingLocation?: string;
  emptyContainersRequestDate?: IsoDate;
  emptyContainersReceivedDate?: IsoDate;
  emptyContainerCount?: number;
  documentsToShippingAgencyDate?: IsoDate;
  surveyorStuffingReportDate?: IsoDate;
  setOfDocumentsSentDate?: IsoDate;
  airwayBillNo?: string;
  activities: RegulatoryActivity[];
  /** EX forms consumed here — unbounded (legacy: 28 flattened columns, 7-form ceiling). */
  exFormUsage: ExportForm[];
  remark?: string;
}

export interface StuffingDay {
  date: IsoDate;
  quantityMt: Mt;
  bagsOrBales: number;
}

export interface ContainerUnit {
  containerNo: string;
  sealNo?: string;
  type: string;
  tareKg?: number;
  netWeightKg?: number;
  bagCount?: number;
  inspectedOn?: IsoDate;
  stuffedOn?: IsoDate;
  /** v2.0 §6.11 activity 1 — the containers inspection protocol result. [PROPOSED] */
  protocol?: ContainerInspectionProtocol;
}

/** PROPOSED — promoted from form-XML-only (defect D9). Recall/audit data. */
export interface TraceabilityCoding {
  commodityCode: string;
  cargoSource: string;
  supplierCode: string;
  processingFacilityCode: string;
  monthCode: string;
}

export interface StuffingOperation {
  stuffingNo?: string;
  containerReceived: boolean;
  receivingDate?: IsoDate;
  startDate?: IsoDate;
  endDate?: IsoDate;
  containerType?: string;
  plannedContainerCount?: number;
  containersStuffedToDate?: number;
  actualShippingLine?: string;
  /** Unbounded — legacy fixed 7-row grid, rows not promoted at all. */
  days: StuffingDay[];
  containers: ContainerUnit[];
  coding?: TraceabilityCoding;
  surveyorReportDates: IsoDate[];
  weighbridgeSlipRef?: string;
  remarks?: string;
}

export interface VesselCall {
  id: string;
  vesselNo: string;
  vesselName: string;
  imo?: string;
  vesselType?: string;
  agent?: string;
  direction: "import" | "export";
  holds?: number;
  originPortId?: string;
  destinationPortId?: string;
  status: "waiting_vessel" | "waiting_outside" | "under_operation" | "sailed";
  eta?: IsoDate;
  currentPosition?: string;
  ata?: IsoDate;
  etb?: IsoDate;
  atb?: IsoDate;
  berthNo?: string;
  etd?: IsoDate;
  atd?: IsoDate;
  balanceTonnageOnBoard?: Mt;
  /** Unbounded manifest — legacy fixed 5-row grid, 20 flattened columns. */
  manifest: { commodity: string; tonnage: Mt; consignee: string; shipper: string; category: string }[];
  /** PROPOSED — legacy has no PC/SI/booking reference anywhere in 54 columns (D21). */
  shipmentIds: string[];
  agreedLaytimeDays?: number;
  demurrageRatePerDay?: Money;
}

export type ShipmentDocumentKey =
  | "bill_of_lading"
  | "coo"
  | "coo_customised"
  | "phytosanitary"
  | "fumigation"
  | "health"
  | "packing_list"
  | "commercial_invoice"
  | "quality_certificate"
  | "weight_certificate"
  | "stuffing_report"
  | "obl";

export const SHIPMENT_DOCUMENT_LABEL: Record<ShipmentDocumentKey, string> = {
  bill_of_lading: "Bill of lading",
  coo: "Certificate of origin",
  coo_customised: "Customised COO (A.COO / DFT / LDC)",
  phytosanitary: "Phytosanitary certificate",
  fumigation: "Fumigation certificate",
  health: "Health / veterinary certificate",
  packing_list: "Packing list",
  commercial_invoice: "Commercial invoice",
  quality_certificate: "Quality certificate",
  weight_certificate: "Weight certificate",
  stuffing_report: "Surveyor stuffing report",
  obl: "Original bill of lading",
};

export interface ShipmentDocument {
  key: ShipmentDocumentKey;
  state: DocumentState;
  required: boolean;
  draftReceivedOn?: IsoDate;
  confirmedOn?: IsoDate;
  originalReceivedOn?: IsoDate;
  reference?: string;
  attachmentName?: string;
  /** Target turnaround in days, from the OBL / Phyto & COO process SLAs. */
  slaDays?: number;
  comments: { by: string; on: IsoDate; text: string }[];
}

export interface Charge {
  type: ChargeType;
  label?: string;
  status: ChargeStatus;
  invoiceReceivedDate?: IsoDate;
  paymentDate?: IsoDate;
  /** Typed money — legacy stores all five amounts as Text (defect D5). */
  amount?: Money;
}

export interface PackingListRecord {
  packNo?: string;
  issuedOn?: IsoDate;
  /** Numeric — legacy stores all four as Text. */
  bagCount?: number;
  netWeightKg?: number;
  grossWeightKg?: number;
  blNo?: string;
}

export interface PostShipmentAssembly {
  assemblyNo?: string;
  commercialInvoiceNo?: string;
  checklist: {
    key: "obl_draft_copy" | "coo_dft_stamp" | "packing_list" | "export_contract_copy" | "export_form_copy";
    done: boolean;
    attachmentName?: string;
  }[];
  sentToTradeFinance: boolean;
  sentToTradeFinanceDate?: IsoDate;
}

export interface BankSubmittal {
  submittalNo?: string;
  status: BankSubmittalStatus;
  underCollection?: Money;
  /** Real date — legacy stores this as Text, the most consequential typing error found. */
  maturityDate?: IsoDate;
  docsSentToBankDate?: IsoDate;
  awb?: string;
  telexRelease: boolean;
  oblDispatchedDate?: IsoDate;
  paymentReceivedDate?: IsoDate;
}

export interface SalesOrderRecord {
  salesOrderNo?: string;
  createdOn?: IsoDate;
  dispatchNo?: string;
  customerCode?: string;
  warehouseName?: string;
  sageCode?: string;
  actuallyExportedMt?: Mt;
  unitPricePerMt?: Money;
  /** Currency is explicit — the legacy field is AED under a label saying USD. */
  totalSalesAmount?: Money;
  pcCompletion: "open" | "partially_completed" | "completed";
}

export type RiskKind =
  | "shipment_period"
  | "export_contract_expiry"
  | "export_contract_balance"
  | "free_days"
  | "demurrage"
  | "dbl_sla"
  | "document_gap"
  | "obl_dispatch"
  | "bank_maturity"
  | "custody_missing";

export interface RiskItem {
  id: string;
  kind: RiskKind;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  shipmentId?: string;
  contractId?: string;
  dueDate?: IsoDate;
  owner: Role;
  acknowledged: boolean;
}

export interface AuditEvent {
  id: string;
  at: string; // ISO datetime
  actor: string;
  actorRole: Role;
  action: string;
  entity: string;
  field?: string;
  from?: string;
  to?: string;
  note?: string;
}

export interface Shipment {
  id: string;
  /** `PC.n` — the SI & SRF key. */
  shipmentNo: string;
  contractId: string;
  executionPlanId: string;
  exportContractId?: string;
  status: ShipmentStatus;
  createdDate: IsoDate;
  shipmentType: ShipmentType;
  country: CountryUnit;
  usesFreightForwarder: boolean;
  isLargeVolume: boolean;
  quantityMt: Mt;
  bagsOrBales?: number;
  bagSizeKg?: number;
  projectCode?: string;
  subProjectCode?: string;
  containerCount?: number;
  containerType?: string;
  commodityReadinessDate?: IsoDate;
  ssmoIssuedAt?: string;
  lastShippingDate?: IsoDate;
  portOfLoadingId: string;
  portOfDischargeId: string;
  /** EX forms allocated to this shipment — unbounded. */
  allocatedExportForms: string[];
  freightOffers: FreightOffer[];
  booking: Booking;
  shippingInstruction: ShippingInstruction;
  clearance: Clearance;
  stuffing: StuffingOperation;
  vesselCallId?: string;
  documents: ShipmentDocument[];
  packingList: PackingListRecord;
  charges: Charge[];
  postShipment: PostShipmentAssembly;
  bankSubmittal: BankSubmittal;
  salesOrder: SalesOrderRecord;
  milestones: Milestone[];
  risks: RiskItem[];
  audit: AuditEvent[];
  assignedTo: string;
  blocked?: { reason: string };
}

/* ------------------------------------------------------------------ *
 * Material & transport (M3–M7)
 * ------------------------------------------------------------------ */

export interface MaterialDelivery {
  quantityMt: Mt;
  date: IsoDate;
  /** PROPOSED — promoted; legacy holds this only inside the form XML. */
  price?: Money;
  deliveryLocation: string;
  poLine: string;
  note?: string;
}

export interface MaterialPurchase {
  id: string;
  purchaseNo: string;
  sagePoNo: string;
  poLine: string;
  supplierId: string;
  commodityId: string;
  origin: string;
  contractedQuantityMt: Mt;
  deliveries: MaterialDelivery[];
  closed: boolean;
}

export interface PackagingCount {
  bpBags: number;
  spBags: number;
  juteBags: number;
  juteBales: number;
  plasticBales: number;
  tricoBales: number;
}

export interface TruckReceipt {
  plateNo: string;
  grossWeightKg: number;
  packaging: PackagingCount;
}

export interface MaterialReceipt {
  id: string;
  receiptNo: string;
  materialPurchaseId: string;
  date: IsoDate;
  receivingLocation: string;
  trucks: TruckReceipt[];
}

export interface TransportRequest {
  id: string;
  trNo: string;
  status: "new" | "assigned" | "in_transit" | "delivered" | "cancelled";
  requiredStartDate: IsoDate;
  quantityMt?: Mt;
  readyForTransportMt: Mt;
  uom: string;
  bagCount: number;
  bagSizeKg: number;
  companyName: string;
  contactOriginName: string;
  /** String — legacy stores both phone numbers as Integer. */
  contactOriginPhone: string;
  contactDestinationName: string;
  contactDestinationPhone: string;
  poNo?: string;
  projectCode?: string;
  subProjectCode?: string;
  origin: string;
  originAddress?: string;
  destination: string;
  commodityId: string;
  specialInstruction?: string;
  billAddress: string;
  urgency: "low" | "medium" | "high";
  transportationCluster?: string;
  transportationOfficer?: string;
  /** Links to the shipment this movement serves, where applicable. */
  shipmentId?: string;
  execution?: TransportExecution;
}

/** M7 — designed but never used in the legacy system (0 records against 312 requests). */
export interface TransportExecution {
  transportationNo: string;
  carrier: string;
  transportMode: string;
  truckSizeMt: Mt;
  driverName: string;
  driverMobile: string;
  plateNo: string;
  waybillNo: string;
  loadingStartDate?: IsoDate;
  loadingFinishDate?: IsoDate;
  remarks?: string;
}

/* ------------------------------------------------------------------ *
 * Cross-entity view models used by the UI
 * ------------------------------------------------------------------ */

export interface QuantityBalance {
  contractQuantityMt: Mt;
  tolerancePct: number;
  maxAllowedMt: Mt;
  plannedMt: Mt;
  readyMt: Mt;
  shippedMt: Mt;
  remainingMt: Mt;
  /** 0–1 */
  shippedFraction: number;
}

export interface DocumentCompleteness {
  required: number;
  atOriginal: number;
  atConfirmed: number;
  atDraft: number;
  outstanding: ShipmentDocumentKey[];
  /** 0–1 */
  fraction: number;
}

/* ================================================================== *
 * WORKFLOW v2.0 ADDITIONS
 *
 * Everything below traces to COTS_Export_End_to_End_Workflow_v2.0 (24 Aug 2026)
 * and its companion register, or — for the sourcing-intake block — to the
 * Material Management Portal page documentation of 24 Aug 2026.
 *
 * The v2.0 document describes sixteen phases. Ten of them carry the P-numbers
 * used here and in `milestones.ts`; six are new and have no P-number, which is
 * why `PhaseId` is left at P1–P14 and the sixteen-phase map lives in
 * `domain/workflow.ts` as a cross-reference rather than a renumbering (§16).
 *
 * Nothing here invents a status, a rule or an owner. Where v2.0 states that no
 * state model exists — the opportunity (§6.1), the deal (§6.2), the Phase 04
 * review (§6.4) and the stuffing request (§6.10) — the type carries no status
 * union and the screen says so.
 * ================================================================== */

/* ------------------------------------------------------------------ *
 * Phase 01–02 — Opportunity and deal agreement
 * v2.0 §6.1, §6.2; register C-07 … C-10, G-09
 * ------------------------------------------------------------------ */

/** v2.0 §6.1 activity 5: "against a long (allocated) or a short (still to be purchased) stock position". */
export type StockPosition = "long" | "short";

/**
 * Where the opportunity has reached. v2.0 §6.1 and §6.2 both record
 * "No status model is defined … [OPEN]", so this is presence-derived rather
 * than a business status: it is computed from which artefacts exist, never typed.
 */
export type OpportunityStage = "identified" | "costed" | "deal_agreed" | "contracted" | "lapsed";

/**
 * v2.0 §6.1: "Costing elements configured per country — raw material, processing
 * and execution operation costs, as a fixed amount or a range, applied per MT,
 * per day or per bag." [PROPOSED]
 */
export type CostingBasis = "per_mt" | "per_day" | "per_bag";

export interface CostingLine {
  key: string;
  label: string;
  basis: CostingBasis;
  amount: Money;
  /** `master` = a configured costing element; `other` = the trader's manual entry (§6.1 activity 4). */
  source: "master" | "other";
}

/**
 * The costing snapshot of v2.0 §6.1 activity 6, retained against the opportunity and
 * carried into the deal agreement. Locked at deal agreement (§6.2 activity 3) so the
 * basis on which the deal was priced can be compared with what the shipment cost.
 */
export interface OpportunityCosting {
  takenOn: IsoDate;
  incoterm: Incoterm;
  rawMaterialPricePerMt: Money;
  salesPricePerMt: Money;
  lines: CostingLine[];
  /** Calculated — raw material + every per-MT line. Never stored on the record. */
  position: StockPosition;
  /** Required when `position` is `short` (§6.1 blocking control 2). */
  expectedRawPricePerMt?: Money;
  locked: boolean;
  lockedOn?: IsoDate;
}

/**
 * The data set v2.0 §6.2 activity 2 says is passed in full from the trader to
 * Dubai Execution. Twelve items, named in the source in this order.
 */
export interface DealTerms {
  buyerId: string;
  commodityId: string;
  pricePerMt: Money;
  incoterm: Incoterm;
  origin: CountryUnit;
  portOfLoadingId: string;
  portOfDischargeId: string;
  quantityMt: Mt;
  shipmentPeriodStart: IsoDate;
  shipmentPeriodEnd: IsoDate;
  paymentTerms: string;
  notes?: string;
}

export interface Opportunity {
  id: string;
  opportunityNo: string;
  createdDate: IsoDate;
  traderName: string;
  commodityId: string;
  origin: CountryUnit;
  indicativeQuantityMt: Mt;
  buyerId?: string;
  costing?: OpportunityCosting;
  deal?: DealTerms;
  dealAgreedOn?: IsoDate;
  /** Channel of the hand-off. v2.0 §6.2 marks this an [ASSUMPTION]: e-mail. */
  dealChannel?: string;
  /** Set once a purchase contract has been raised from the deal. */
  contractId?: string;
  lapsedOn?: IsoDate;
  note?: string;
}

/**
 * The long and short position report — v2.0 §6.1 input 1 and §6.6 output 2.
 * Derived from contracts and stock, never stored.
 */
export interface PositionLine {
  commodityId: string;
  origin: CountryUnit;
  contractedMt: Mt;
  allocatedMt: Mt;
  readyMt: Mt;
  underProcessMt: Mt;
  /** allocated + ready − contracted. Negative is a short position. */
  positionMt: Mt;
  position: StockPosition;
}

/* ------------------------------------------------------------------ *
 * Phase 05 — Quality parameters and tags
 * v2.0 §6.5; register C-13, C-14, C-68
 * ------------------------------------------------------------------ */

/**
 * v2.0 §6.5 activities 1–2: standard parameters retrieved automatically from
 * master data and modified where the buyer has specific requirements. Parameters
 * mandatory for the commodity must be provided.
 */
export interface ContractQualityParameter {
  name: string;
  /** The specification carried from commodity master data. */
  masterSpec: string;
  /** The buyer's override, where there is one. */
  buyerSpec?: string;
  mandatory: boolean;
  source: "master" | "buyer";
}

/**
 * v2.0 §6.5 activity 3: "a separate flow or form is started for the tags
 * specification, listing the custom tag options the buyer requires." [PROPOSED]
 * The Standard / Buyer option states themselves are [AS-IS] (§10.2, at the contract).
 */
export type TagSpecificationState = "not_started" | "specified" | "agreed" | "reissued";

export interface TagSpecification {
  option: "standard" | "buyer";
  state: TagSpecificationState;
  customTags: string[];
  /** §6.6: the batch code is recorded on stock but deliberately excluded from allocation. */
  batchCodeOnTag: boolean;
  agreedOn?: IsoDate;
  agreedBy?: string;
  /** §6.5 exception: reprocessing changes the packaging and the tags, including the batch code. */
  reissuedAfterReprocessingOn?: IsoDate;
  note?: string;
}

/* ------------------------------------------------------------------ *
 * Phase 06 — Stock allocation and cargo readiness
 * v2.0 §6.6; register C-17 … C-26, G-11, G-27
 * ------------------------------------------------------------------ */

/**
 * v2.0 §6.6 states: "Stock: under process (raw) → ready as finished good →
 * reserved for the purchase contract. [AS-IS] No state names beyond these are
 * given. [OPEN]" — so `released` and `shipped` are NOT added here.
 */
export type StockState = "under_process" | "ready_finished" | "reserved";

export interface StockLot {
  id: string;
  lotRef: string;
  commodityId: string;
  origin: CountryUnit;
  facility: string;
  /** §6.6 activity 4: the quality grade is the reference used in contract allocation. */
  grade: string;
  quantityMt: Mt;
  state: StockState;
  /**
   * §6.6: "The batch code is recorded on the stock but is deliberately not used in
   * the stock allocation … a firm decision of the workshop." Shown, never filtered on.
   */
  batchCode?: string;
  /** §6.6 variation: stock under the Stock Management Agreement is flagged. */
  smaFlagged: boolean;
  productionDate?: IsoDate;
  qualityReleaseRef?: string;
  allocatedContractId?: string;
  allocatedOn?: IsoDate;
  note?: string;
}

/**
 * v2.0 §6.6 input 4: "The weekly production plan, built on raw materials actually
 * received at facilities." Register C-24 records the firm rule that planned-but-
 * unreceived quantities are excluded. `receivedRawMt` is therefore sourced from
 * intake receipts, not from purchase agreements.
 */
export interface ProductionPlanWeek {
  id: string;
  weekStarting: IsoDate;
  facility: string;
  commodityId: string;
  /** Sum of confirmed intake receipts at this facility in this week. Calculated. */
  receivedRawMt: Mt;
  plannedOutputMt: Mt;
  actualOutputMt?: Mt;
  status: "draft" | "issued";
  note?: string;
}

/**
 * v2.0 §6.6 exception 3, verbatim: "commercial or execution raises it, Logistics
 * handles it in Sudan and Execution regionally, Quality reports its visit and
 * recommendations and releases, Execution approves, Compliance creates it in the ERP."
 */
export type WarehouseRequestState =
  "raised" | "quality_visit" | "quality_released" | "execution_approved" | "created_in_erp" | "rejected";

export interface WarehouseRequest {
  id: string;
  requestNo: string;
  raisedBy: Role;
  raisedOn: IsoDate;
  country: CountryUnit;
  location: string;
  requiredCapacityMt: Mt;
  state: WarehouseRequestState;
  /** Logistics in Sudan, Execution regionally (§6.6). */
  handledBy: Role;
  qualityVisitDate?: IsoDate;
  qualityRecommendation?: string;
  qualityReleasedOn?: IsoDate;
  executionApprovedOn?: IsoDate;
  erpReference?: string;
  note?: string;
}

/* ------------------------------------------------------------------ *
 * Phase 07 — Advance payments
 * v2.0 §6.7 activity 5 and 8; register C-31, G-13, decision D-15
 * ------------------------------------------------------------------ */

/**
 * §6.7: "Advance payments are issued between parties before execution of the
 * contract starts. In Ethiopia, Invictus issues to AMROS, AMROS transfers to
 * African Lakes, and execution can then start. FP&A determines the amount;
 * payments are issued and need to be confirmed. Advance payments are not
 * applicable in Chad."
 */
export type AdvancePaymentState =
  "not_applicable" | "amount_pending" | "amount_determined" | "issued" | "confirmed";

export interface AdvancePaymentLeg {
  fromEntity: string;
  toEntity: string;
  amount?: Money;
  issuedOn?: IsoDate;
  confirmedOn?: IsoDate;
  reference?: string;
}

export interface AdvancePayment {
  id: string;
  requestNo: string;
  contractId: string;
  executionPlanId?: string;
  country: CountryUnit;
  state: AdvancePaymentState;
  /** FP&A determines the amount (§6.7). */
  determinedBy?: string;
  determinedOn?: IsoDate;
  totalAmount?: Money;
  legs: AdvancePaymentLeg[];
  note?: string;
}

/* ------------------------------------------------------------------ *
 * Phase 08 — Freight rate table
 * v2.0 §6.8 activities 1–2; register C-36, G-14
 * ------------------------------------------------------------------ */

/**
 * §6.8: "Freight rate costs are updated monthly for 20-foot and 40-foot containers,
 * by loading port, destination port and commodity." Held by five dimensions, the
 * fifth being the shipping line (§6.8 country/shipment variations).
 */
export interface FreightRate {
  id: string;
  /** `YYYY-MM` — the month the rate applies to. */
  effectiveMonth: string;
  loadingPortId: string;
  destinationPortId: string;
  commodityId: string;
  shippingLine: string;
  rate20ft?: Money;
  rate40ft?: Money;
  updatedOn: IsoDate;
  updatedBy: string;
  /** SeaRates.com integration is [PROPOSED] with no decision (§6.8 open questions). */
  source: "manual" | "searates";
}

/* ------------------------------------------------------------------ *
 * Phase 10 — Cargo movement and stuffing request
 * v2.0 §6.10; register C-35, C-39, C-40, C-41, G-12, G-29, decision D-19
 * ------------------------------------------------------------------ */

/** §6.8 activity 4 and §6.10: truck, rail, container-on-truck and bulk daily operation. */
export type MovementMode = "truck" | "rail" | "container_on_truck" | "bulk_daily";

export type MovementLegState = "planned" | "loading" | "in_transit" | "arrived" | "closed";

/**
 * §6.10 activity 2: "tracked, either by truck details or, for bulk, as a daily
 * operation recording the number of trips and the quantities loaded and received."
 */
export interface MovementTrip {
  tripNo: string;
  date: IsoDate;
  plateNo?: string;
  waybillNo?: string;
  loadedMt: Mt;
  receivedMt?: Mt;
}

export interface MovementLeg {
  id: string;
  legNo: string;
  shipmentId: string;
  mode: MovementMode;
  state: MovementLegState;
  fromLocation: string;
  toLocation: string;
  originCountry: CountryUnit;
  /** Free text — Djibouti and Douala are not COTS operating units. */
  destinationCountry: string;
  /**
   * §6.10 input 3: transfer prices are required where the movement crosses an entity
   * boundary and are [OPEN] — "to be prepared by Hiba".
   */
  crossesEntityBoundary: boolean;
  transferPriceKnown: boolean;
  plannedQuantityMt: Mt;
  trips: MovementTrip[];
  startDate?: IsoDate;
  arrivalDate?: IsoDate;
  /** Sudan only — the movement is a service request to the Logistics department. */
  serviceRequestNo?: string;
  note?: string;
}

/** §6.10 activity 4: the stuffing request is communicated to five functions. */
export type StuffingNotifyFunction = "quality" | "logistics" | "clearance" | "warehouse" | "processing";

export interface StuffingRequestNotification {
  fn: StuffingNotifyFunction;
  acknowledgedOn?: IsoDate;
  acknowledgedBy?: string;
}

/**
 * §6.10: "No state model is given for the stuffing request. [OPEN]" — so this
 * record has `raisedOn` and nothing else. Raised or not raised is presence, not status.
 */
export interface StuffingRequest {
  id: string;
  requestNo: string;
  shipmentId: string;
  stuffingLocation: string;
  quantityMt: Mt;
  plannedStartDate?: IsoDate;
  plannedContainerCount?: number;
  raisedOn?: IsoDate;
  raisedBy?: string;
  notifications: StuffingRequestNotification[];
  note?: string;
}

/* ------------------------------------------------------------------ *
 * Phase 11 — Container inspection protocol
 * v2.0 §6.11 activity 1; register C-46
 * ------------------------------------------------------------------ */

/**
 * §6.11: "[AS-IS] that the inspection happens and a report is issued by the surveyor;
 * [PROPOSED] that the protocol and its results are recorded in COTS." §6.11 open
 * question: "The content of the containers inspection protocol — what is inspected
 * and what constitutes a pass" is not established, so the check list below is
 * marked as awaiting confirmation on the screen and no pass rule is asserted.
 */
export type ProtocolCheckResult = "pass" | "fail" | "not_checked";

export interface ContainerProtocolCheck {
  key: string;
  label: string;
  result: ProtocolCheckResult;
  note?: string;
}

export interface ContainerInspectionProtocol {
  checks: ContainerProtocolCheck[];
  inspectedOn?: IsoDate;
  inspectedBy?: string;
}

/* ------------------------------------------------------------------ *
 * Phase 16 — Close-out: feedback, claims and insurance
 * v2.0 §6.16; register C-58, C-59, C-60, G-30, decision D5
 * ------------------------------------------------------------------ */

/**
 * §6.16 activity 5: "showing whether the customer is satisfied or has a complaint
 * about the service or the commodity, and is linked to the contract." [PROPOSED] —
 * the workshop records that a proposal is to be prepared by IT.
 */
export type CustomerFeedbackOutcome = "satisfied" | "complaint_service" | "complaint_commodity";

export interface CustomerFeedback {
  id: string;
  contractId: string;
  shipmentId?: string;
  loggedOn: IsoDate;
  loggedBy: string;
  outcome: CustomerFeedbackOutcome;
  detail: string;
}

/**
 * §6.16 activity 6: "The investigation is normally carried out offline by the
 * operation team and is not tracked in the system; what the system records is the
 * approval of the claim and the amount submitted." G-30 records the ambiguity
 * between that reading and the fuller storage/demurrage claim form, so both the
 * submitted amount and the approval are held and the ambiguity is stated.
 */
export type BuyerClaimState = "raised" | "approved" | "rejected";

export interface BuyerClaim {
  id: string;
  claimNo: string;
  shipmentId: string;
  contractId: string;
  raisedOn: IsoDate;
  reason: "quality" | "service";
  amountSubmitted?: Money;
  state: BuyerClaimState;
  decidedOn?: IsoDate;
  approvedAmount?: Money;
  note?: string;
}

/**
 * §6.16 country variation: "marine cover policies are created and related to each
 * shipment separately; inland cover is held as master policies per warehouse and
 * operational area."
 */
export type InsurancePolicyKind = "marine_per_shipment" | "inland_master";

export interface InsurancePolicy {
  id: string;
  policyNo: string;
  kind: InsurancePolicyKind;
  shipmentId?: string;
  coveredAreas: string[];
  validFrom?: IsoDate;
  validTo?: IsoDate;
  claimContact?: string;
  note?: string;
}

/**
 * §6.16 exception 2: "reported as a case with a date, location and brief description,
 * the claim is built, and the claim is finalised with the compensation status updated."
 */
export type InsuranceIncidentState = "reported" | "claim_built" | "finalised";

export interface InsuranceIncident {
  id: string;
  caseNo: string;
  reportedOn: IsoDate;
  location: string;
  kind: "theft" | "fire" | "loss_in_transit";
  description: string;
  shipmentId?: string;
  policyId?: string;
  state: InsuranceIncidentState;
  claimAmount?: Money;
  compensationStatus?: string;
}

/* ================================================================== *
 * PHASES 01–02 — SEASONAL PURCHASE PLAN AND BUDGET
 *
 * Source: a business requirement received on 26 August 2026, carried by
 * workflow v2.3 §6.1 (Phase 01, seasonal purchase plan) and §6.2 (Phase 02,
 * budget). Neither appears in either source document of §3.1, so every field
 * below is [PROPOSED] and every rule the requirement does not state is left
 * open rather than settled here. In particular:
 *   · no status model for a plan — §6.1 defines none;
 *   · no validation and no blocking control on either record — §6.1 and §6.2
 *     both state "none stated" and neither invents one, so every line field
 *     below is optional and a plan or budget saves incomplete;
 *   · no value list for the budget approval status — the instruction of
 *     26 August 2026 names the field and states no values, no owner and no
 *     effect, so it is held as free text and nothing downstream reads it.
 * ================================================================== */

/**
 * §6.1: a seasonal period bound is a month and a year, never a calendar date.
 * "The period is chosen by month and year, not by calendar date."
 */
export interface SeasonMonth {
  /** 1–12. */
  month: number;
  year: number;
}

/**
 * One month's planned quantity inside a commodity's row.
 *
 * The quantity is optional. §6.1 preconditions state "none" and ask outright whether a
 * month may be left without a quantity, so a blank cell is permitted and means exactly
 * that — no quantity planned — which the spreadsheet writes as `-`.
 */
export interface SeasonalPlanCell {
  /** 1–12. Always one of the months the plan's period spans. */
  month: number;
  year: number;
  quantityMt?: Mt;
}

/**
 * One row of the plan: a commodity, its quantity in each month of the period, and the
 * note the spreadsheet carries against it.
 *
 * This is the shape of the Plan sheet in `Export Plan V1.xlsx` — commodity down, month
 * across — rather than a flat list of month lines. It matters for two reasons the
 * requirement does not state but the spreadsheet does: the `Capacity needed MT` formula
 * reads a whole commodity row at once, and `Notes` is one value per commodity for the
 * whole period, not one per month.
 *
 * `Commodity Group` is not held here. It is a property of the commodity in the master and
 * is filled from it, so a plan can never disagree with the master about which group a
 * commodity belongs to.
 */
export interface SeasonalPlanRow {
  id: string;
  commodityId?: string;
  /**
   * The spreadsheet's `Notes` column, which the captured sheet uses as a location — every
   * row reads `PZU`, and the Summary sheet pivots capacity by group against this value.
   * Free text: no location master is named by the requirement or the sheet.
   */
  note?: string;
  cells: SeasonalPlanCell[];
}

export interface SeasonalPurchasePlan {
  id: string;
  /** Issued on save. The requirement names no reference; this is ours, marked as such. */
  planRef: string;
  from: SeasonMonth;
  to: SeasonMonth;
  rows: SeasonalPlanRow[];
  createdOn: IsoDate;
  createdBy: string;
  /**
   * Set when the plan was saved with `Save & share`. The stakeholders to notify are to be
   * configured in the system later, so nothing is sent and no recipient is asserted — the
   * prototype records only that sharing was requested, and says on screen that no
   * notification went out.
   */
  sharedOn?: IsoDate;
  sharedBy?: string;
  /**
   * When the plan was last changed, and by whom. Ours, not the requirement's: §6.1
   * describes saving a plan and says nothing about editing one, and it asks who may edit
   * a plan once it is saved. Until that is answered anyone signed in may edit, and the
   * only thing recorded is that a change happened — no version history, no previous
   * values, no approval of the change, because none of that is stated.
   */
  updatedOn?: IsoDate;
  updatedBy?: string;
  note?: string;
}

/**
 * One budget line. §6.2 activity 3: "the plan, chosen from a drop-down list;
 * the quantity in MT; the amount; and the supplier." Whether a budget is one
 * line for the period or several, one per plan or supplier, is [OPEN] — so
 * several are permitted and the question is put on the screen.
 */
export interface BudgetLine {
  id: string;
  /**
   * The plan the line is written against. §6.2 asked what the Plan drop-down contains;
   * the business instruction of 27 August 2026 answers it — the drop-down offers the
   * seasonal purchase plans of §6.1, and only those that are still **active**.
   *
   * **Superseded as an input by the instruction of 3 September 2026.** A budget is now
   * written against **one** plan, held on the budget as `Budget.seasonalPlanId`, and the
   * lines below it carry one commodity each. The field stays on the line because every
   * derivation, service check and captured record reads it: the Add and Edit screens
   * write the budget's own plan into every line they save, so line and header always
   * agree on a record saved at this version or later. A legacy budget saved before it
   * may still carry two plans across its lines — `bg-2` does — and the Edit screen says
   * so rather than picking one silently.
   */
  seasonalPlanId?: string;
  /**
   * The commodity being budgeted, added by the instruction of 27 August 2026: a budget
   * line names a commodity, and only a commodity **the selected plan actually carries**.
   * That is a stated rule rather than a reading, and the service layer enforces it — a
   * line whose commodity is not on its plan is refused.
   */
  commodityId?: string;
  quantityMt?: Mt;
  /** §6.2 `Amount`. The currency is [OPEN]; it is carried per line, not assumed. */
  amount?: Money;
  supplierId?: string;
}

export interface Budget {
  id: string;
  /** Issued on save. Ours, as with the plan reference. */
  budgetRef: string;
  /**
   * The one seasonal purchase plan this budget is written against.
   *
   * Added by the business instruction of 3 September 2026: *"budget creation should be
   * one plan and can have multiple budget per commodity"*. The Plan field therefore
   * leaves the line grid and sits **above** the budget period on the Add screen, where
   * the field order the instruction gives it is Plan → From date → To date.
   *
   * Optional on the record rather than required, for the same reason the line's plan was:
   * §6.2 does not state the field is mandatory, and three captured budgets predate the
   * instruction. Where it is absent the screens fall back to the plan the lines name.
   */
  seasonalPlanId?: string;
  /** §6.2: the budget period is given as dates, unlike the seasonal period of §6.1. */
  fromDate: IsoDate;
  toDate: IsoDate;
  lines: BudgetLine[];
  /**
   * `Issued Payment Amount`, in the local currency — added to the **Edit** screen by the
   * instruction of 3 September 2026, which pairs it with a USD conversion that is *read
   * only and taken from the master data*. So the amount is held and the conversion is
   * not: `budgetIssuedPaymentUsd()` divides this by the rate the FX master holds, and the
   * budget stores no rate of its own — the same rule the fund's own conversion follows.
   *
   * **The date the rate is read on is now stated, and it is this record's own.** Until the
   * instruction of 3 September 2026 added `issuedPaymentDate` below, a budget had no
   * payment date at all and the screens read the rate on the budget's To date — a
   * defensible reading, recorded as [OPEN], and no longer needed. The To date remains the
   * fallback for a captured budget that holds an amount and no payment date.
   */
  issuedPaymentLocal?: number;
  /** Which local currency the issued payment amount is held in. */
  issuedPaymentCurrency?: CurrencyCode;
  /**
   * `Payment Date` — the date the issued payment was made, added to the Edit screen by the
   * instruction of 3 September 2026 alongside the issued amount.
   *
   * It answers the question the issued amount left open. A fund reads its exchange rate on
   * its actual payment date; a budget could not, having no payment date, so the screens
   * read the rate on the budget's To date and said so. With this field the budget reads
   * the rate on the date the money actually moved, exactly as a fund does — one rule for
   * both records instead of one rule and one reading.
   */
  issuedPaymentDate?: IsoDate;
  /**
   * Added by a business instruction of 26 August 2026. The instruction names
   * the field and states no values, no owner and no effect, so it is free text,
   * no sequence is enforced, and nothing downstream is gated on it.
   */
  approvalStatus?: string;
  createdOn: IsoDate;
  createdBy: string;
  /**
   * When the budget was last changed, and by whom. Ours, for the same reason as on the
   * plan: §6.2 describes saving a budget and says nothing about editing one, and it asks
   * who may edit it once it is saved. Nothing is versioned and no change is approved —
   * including a change to the approval status itself, which is just another edit here
   * because the instruction that added the field states no owner and no effect.
   */
  updatedOn?: IsoDate;
  updatedBy?: string;
  /**
   * Set when the budget was saved with `Save & share`, as on the plan. The stakeholders
   * to notify are to be configured in the system later, so nothing is sent and no
   * recipient is asserted — the prototype records only that sharing was requested.
   */
  sharedOn?: IsoDate;
  sharedBy?: string;
  note?: string;
}

/* ================================================================== *
 * SOURCING INTAKE — Material Management Portal
 *
 * Source: the MMP page documentation of 24 August 2026 (Purchase Agreement,
 * Receiving Locations, Material Receipt, Warehouse Receipt, Funds, Agent Balances).
 *
 * Scope. Workflow v2.0 §2.2 excludes the sourcing season process and supplier
 * funding from the export workflow by name and with a stated reason. They are
 * modelled here because v2.0 names exactly two points at which they enter the
 * export chain, both at Phase 06:
 *   · §6.6 input 4 — "the weekly production plan, built on raw materials actually
 *     received at facilities" (register C-24: planned-but-unreceived is excluded);
 *   · §6.6 exception 1 — "Short position → sourcing action".
 * Nothing here is presented as a step in the export phase sequence.
 * ================================================================== */

/** MMP `Seasonality`, e.g. "2025-2026". */
export type Seasonality = string;

/**
 * MMP `Flow Status` on the Purchase Agreement form. The five options are taken from
 * the screenshot, with the source's own spellings normalised once
 * (`Cancled` → `cancelled`). The MMP documentation contains no transition evidence
 * and no default, so no transition map is asserted for it.
 */
export type PurchaseAgreementFlowStatus =
  | "open"
  | "on_going"
  | "for_quality_inspection"
  | "hold"
  | "completed"
  | "cancelled";

export interface PurchaseAgreementAttachment {
  slot: "pa_document" | "contract_document" | "delivery_note" | "other";
  fileName: string;
}

/**
 * `Agreement Type` — added to the agreement card of the Edit screen by the instruction of
 * 3 September 2026, which gives the two values, the default and the owner: *Fixed or
 * Collection, by default Fixed, and modifiable by the Procurement Team*.
 *
 * [OPEN] What either type changes. The instruction names the field and states no effect,
 * so nothing downstream is gated on it — as with the budget's approval status, the
 * prototype holds the value and asserts no consequence.
 */
export type PurchaseAgreementType = "fixed" | "collection";

/** `Results` on a quality inspection. The three values the instruction names, verbatim. */
export type QualityInspectionResult = "approved" | "rejected" | "re_test";

/** Whether an estimated inspection quantity was given in tonnes or in bags. */
export type QualityInspectionUnit = "mt" | "bags";

/**
 * One quality inspection against a purchase agreement.
 *
 * Added by the instruction of 3 September 2026, which places the card on the **Edit**
 * screen before Attachments and notes, names its five fields, and says who fills it in:
 * *"This section will be filled out by the trader or the Quality team and they enter
 * multiple Inspection."* Several per agreement, therefore, and no cap.
 *
 * Two readings are marked on the screen rather than hidden here:
 *   · **Commodity Type** is *"based on the commodity requested on the purchase
 *     agreement"*. The reading taken is the commodity master narrowed to the group the
 *     agreement's own commodity belongs to, with that commodity offered first — a
 *     sesame agreement is inspected against a sesame, not against a gum. If the business
 *     means the agreement's single commodity and nothing else, the option list narrows
 *     to one and no other code changes.
 *   · **Estimated Quantity (mt/bags)** is captured as a number and the unit it was given
 *     in, rather than as two fields or as free text, so the figure can be totalled.
 *
 * [OPEN] Whether an inspection result gates anything — a rejected inspection does not
 * stop a receipt being booked here, because nothing states that it should. The new
 * `for_quality_inspection` flow status is set by hand for the same reason: no rule
 * connects an inspection to it.
 */
export interface QualityInspection {
  id: string;
  /** Master-data commodity being inspected, from the agreement's own commodity group. */
  commodityTypeId: string;
  /** `Supplier Location` — manual entry, as the instruction states. No location master. */
  supplierLocation: string;
  estimatedQuantity?: number;
  estimatedQuantityUnit: QualityInspectionUnit;
  actualTestDate?: IsoDate;
  result?: QualityInspectionResult;
  recordedOn?: IsoDate;
  recordedBy?: string;
  note?: string;
}

/**
 * A purchase agreement, as reshaped by the business instruction of 27 August 2026.
 *
 * Three changes, and the first is the substantive one:
 *   · the agreement is written **against a seasonal purchase plan**, and its commodity
 *     is chosen from the commodities that plan carries — the same cascade the budget
 *     uses, and the first link between the origin-side intake chain and phases 01–02;
 *   · `Purchase Order` leaves the Add screen and appears on a new Update screen, because
 *     it is issued after the agreement is struck;
 *   · the three per-bag tare weights become conditional on an applicability flag.
 */
export interface PurchaseAgreement {
  id: string;
  /**
   * `PA Ref`. MMP built it from the purchase order plus a sequence; the purchase order is
   * no longer known when the agreement is created, so a new agreement is referenced
   * `PA-<year>-<sequence>`. Captured legacy references are left as they are.
   */
  paRef: string;
  /** Issued after the agreement is struck, so absent on a newly created one. */
  purchaseOrderNo?: string;
  seasonality: Seasonality;
  /**
   * The seasonal purchase plan the agreement is written against. The Add screen offers
   * only active plans, and the commodity is chosen from the ones that plan carries.
   */
  seasonalPlanId?: string;
  commodityId: string;
  supplierId: string;
  /** MMP renders a username in the grid and a display name on the detail views. */
  purchaser: string;
  totalQuantityMt: Mt;
  flowStatus: PurchaseAgreementFlowStatus;
  agreementDate: IsoDate;
  createdOn: IsoDate;
  createdBy: string;
  /**
   * `Is Applicable` — whether a per-bag tare applies to this agreement at all. When it
   * does, the three weights below are required; when it does not, they are not captured
   * and every receipt booked against the agreement carries no packaging tare.
   *
   * This is the flag MMP lacked, and the reason it lacked it shows in the captured data:
   * a zero weight and "no tare applies" were indistinguishable, and a zero silently
   * zeroed the tare on every receipt that followed.
   */
  bagWeightApplicable: boolean;
  /** Per-bag tare in lb, carried onto every receipt booked against this agreement. */
  bpBagWeightLb?: number;
  spBagWeightLb?: number;
  juteBagWeightLb?: number;
  /** MMP shows this on the details view only, with no counterpart on the add form. */
  additionalExpenses?: Money;
  /**
   * `Agreement Type` — Fixed or Collection, Fixed by default, changed by Procurement on
   * the Edit screen. Added by the instruction of 3 September 2026.
   */
  agreementType: PurchaseAgreementType;
  /**
   * The quality inspections recorded against this agreement, entered on the Edit screen
   * by the trader or the Quality team. Several are expected; none is required.
   */
  qualityInspections: QualityInspection[];
  attachments: PurchaseAgreementAttachment[];
  note?: string;
  updatedOn?: IsoDate;
  updatedBy?: string;
  sharedOn?: IsoDate;
  sharedBy?: string;
}

/**
 * MMP Receiving Locations: which facility each part of the agreed quantity arrives at.
 * The legacy grid has no totals row and no balance field, so 10,000 + 15,700 MT were
 * allocated against a 17,777 MT agreement with nothing to stop it — see
 * `allocationBalance()` in `domain/sourcing.ts`.
 */
/**
 * Whether a plan line delivers into a processing facility or into a warehouse.
 *
 * Added by the instruction of 3 September 2026: the Add screen's plan line gets a
 * drop-down to choose one, *"then if warehouse all warehouse listed under that country
 * (as per master data) else if Facility all Facility available in that country as per
 * master data"*. The location list is therefore no longer the free-text set of names
 * already present in the data — it is the receiving-location master, filtered by kind
 * and by country. See `RECEIVING_LOCATIONS` in `data/master.ts`.
 */
export type ReceivingLocationKind = "facility" | "warehouse";

export interface ReceivingLocationPlan {
  id: string;
  planId: string;
  purchaseAgreementId: string;
  /**
   * Which of the two location masters the line's location was chosen from. Required at
   * this version; the captured rows are classified from the codes they already carry —
   * `WH…` is a warehouse, `FC…` a facility.
   */
  locationKind: ReceivingLocationKind;
  /**
   * The country whose master the location was chosen from.
   *
   * [OPEN] Where the country comes from. Neither the agreement nor the signed-in user
   * carries an operating country in this module, so the Add screen asks for it on the
   * plan line and defaults it to the country the agreement's other lines already use.
   * If COTS holds one operating country per session, this field is read rather than
   * asked for and the drop-down disappears.
   */
  country?: CountryUnit;
  /** The chosen location, held as `<code> - <name>` exactly as the legacy grid shows it. */
  facility: string;
  quantityMt: Mt;
  assignedTo: string;
  createdOn: IsoDate;
}

/** MMP `Receipt Status` on the Add Receipt Price form. Facility receipts only. */
export type IntakeReceiptStatus = "need_review" | "confirmed";

export interface IntakeBagCounts {
  bpBags: number;
  spBags: number;
  juteBags: number;
}

/**
 * MMP `Add Receipt Price` — the separate Sourcing step that prices a facility receipt,
 * deducts dirt, reconciles against the agent's declared net weight and computes the
 * purchase amount and commission.
 */
export interface IntakeReceiptPricing {
  pricePerLb: Money;
  /** MMP `Dirt/Ton`. Unit not stated by the source — treated as kg per tonne, marked on screen. */
  dirtPerTon: number;
  /** MMP `Agent Net Weight (MT)` — the agent's declared figure, reconciled against ours. */
  agentNetWeightMt: Mt;
  agentCommissionPerMt?: Money;
  status: IntakeReceiptStatus;
  pricedOn?: IsoDate;
  pricedBy?: string;
}

/**
 * One physical delivery. `facility` receipts are MMP Material Receipts; `warehouse`
 * receipts are MMP Warehouse Receipts, which the legacy system cannot price at all
 * (both its Edit and AddReceiptPrice routes return HTTP 500) — hence `pricing` is
 * optional and the screen explains why a warehouse receipt has none.
 */
export interface IntakeReceipt {
  id: string;
  referenceNo: string;
  kind: "facility" | "warehouse";
  purchaseAgreementId: string;
  /** Facility code for a facility receipt, warehouse code for a warehouse receipt. */
  location: string;
  receiptDate: IsoDate;
  receiptFrom: "supplier" | "warehouse";
  plateNo?: string;
  driverName?: string;
  driverPhone?: string;
  weighBridge?: string;
  bags: IntakeBagCounts;
  /** MMP `Gross Weight with Dirt (MT)` — the weighbridge figure. */
  grossWeightWithDirtMt: Mt;
  pricing?: IntakeReceiptPricing;
  note?: string;
}

/** MMP `Mode of Fund`. */
export type FundMode = "finance" | "cash" | "barter";

/**
 * A fund, as reshaped by the business instruction of 27 August 2026.
 *
 * The instruction splits the record across its two screens, and the split tells a
 * business story the MMP form did not: a fund is **requested** before it is **paid**.
 *
 *   · The Create screen captures the request — seasonality, agent, commodity, the value
 *     in local currency and the date payment is *required* by. There is no purchase
 *     order yet, so `Purchase Order` is gone from that screen.
 *   · The Update screen captures what then happened — the PO number once it is issued,
 *     the date payment was *actually* made, the exchange rate that applied on that date,
 *     the mode of fund, and the fund document.
 *
 * The consequence for the model is that most of it is optional: a fund exists, and is
 * perfectly valid, before any of the update-screen fields have a value.
 */
export interface Fund {
  id: string;
  /**
   * `Fund Ref`. MMP built it from the purchase order plus a sequence, but the purchase
   * order is no longer known when a fund is created, so a new fund is referenced
   * `FND-<year>-<sequence>` instead. Captured legacy references are left as they are.
   */
  fundRef: string;
  /**
   * `PO number`. Not on the Create screen at all — it is issued after the fund is
   * requested — and therefore optional on the record.
   */
  purchaseOrderNo?: string;
  seasonality: Seasonality;
  agentId: string;
  commodityId: string;
  /** The date payment is required by. Captured on Create, and the only date that is. */
  requiredPaymentDate: IsoDate;
  /**
   * `Issued Payment Amount`, in the local currency — added to the payment card of the
   * Edit screen by the instruction of 3 September 2026, immediately **before** the actual
   * payment date, and made the basis of the conversion: *"the calculation of usd
   * conversion is based on the Issued Payment amount"*.
   *
   * So the fund now carries two local amounts and they mean different things: `valueLocal`
   * is the value **requested** on the Create screen, and this is the amount actually
   * **issued** when payment was made. `fundValueUsd()` divides this one by the rate where
   * it is present and falls back to the requested value where it is not, so a captured
   * fund that predates the field still reads correctly.
   */
  issuedPaymentLocal?: number;
  /**
   * `Payment slip` — the attachment added beside it by the same instruction. A file name
   * only, as everywhere else in this prototype: names are stored, files are not.
   */
  paymentSlipName?: string;
  /**
   * The date payment was actually made. Captured on Update, and the date the exchange
   * rate is read from — so until it is set there is no rate and no value in USD.
   */
  actualPaymentDate?: IsoDate;
  /** `Value in local currency` — the amount as the agent is paid it. */
  valueLocal: number;
  /**
   * Which local currency that is. SDG throughout the captured data; held explicitly so
   * an operating unit with another currency does not need the field renamed.
   */
  localCurrency: CurrencyCode;
  /**
   * `Mode of Fund`. On the Update screen: how the fund was settled, which is not known
   * when it is requested.
   */
  mode?: FundMode;
  bankName?: string;
  barterCommodityId?: string;
  documentName?: string;
  note?: string;
  updatedOn?: IsoDate;
  updatedBy?: string;
  sharedOn?: IsoDate;
  sharedBy?: string;
  /**
   * Captured by the legacy MMP form and consumed by nothing — no interest amount, no
   * maturity date. Neither is on either of the two screens the instruction of 27 August
   * 2026 specifies, so neither is entered any more. They are kept on the record so the
   * captured legacy funds still read correctly.
   */
  financeRatePct?: number;
  tenorPeriod?: string;
}

/**
 * MMP Agent Balances. The legacy page shows `Actual Balance` equal to
 * `Estimated Balance` on both live records and states no derivation for either, so
 * neither is computed here — both are held and the absence of a rule is shown.
 */
export interface AgentBalance {
  id: string;
  supplierId: string;
  seasonality: Seasonality;
  actualBalance: Money;
  estimatedBalance: Money;
}

/**
 * The two settlement operations MMP exposes as row actions and leaves unbuilt
 * (both modals contain placeholder body text and no inputs).
 */
export interface AgentBalanceMovement {
  id: string;
  kind: "transfer" | "refund";
  supplierId: string;
  seasonality: Seasonality;
  amount: Money;
  /** Required for a transfer, absent for a refund. */
  toSupplierId?: string;
  movedOn: IsoDate;
  reference?: string;
  note?: string;
}

/* ================================================================== *
 * PROCUREMENT — the purchase order
 *
 * Source: the business instruction of 3 September 2026, which adds a tab of its
 * own after Purchase agreement and specifies four screens for it:
 *
 *   · **List** — PO Number (clickable, opens the details), total amount in local
 *     currency, total amount in USD, and a New PO button.
 *   · **Add** — the PO Number as the header, and a Purchase Agreement reference
 *     field with the option to select **several** agreements.
 *   · **View** — the PO Number, information cards summarising the order, and a
 *     Purchase Agreement List card whose columns are the purchase agreement
 *     reference, the payment amount in local currency, the USD conversion (read
 *     only) and the actual payment date, with an Edit button over them.
 *   · **Edit** — the PO number and the purchase agreement list.
 *
 * WHY IT IS A RECORD OF ITS OWN. Both the fund and the purchase agreement already
 * carry a `purchaseOrderNo` as a plain string, issued after the fact and checked by
 * nothing. This tab makes the purchase order the record it always was in the
 * business: one order, several agreements under it, and a payment against each.
 * The two existing string fields are left exactly as they are — nothing is
 * migrated, and no link between them and this record is asserted, because the
 * instruction does not state one.
 * ================================================================== */

/**
 * One purchase agreement under a purchase order, with the payment made against it.
 *
 * The instruction gives the four columns and marks the USD conversion read only, so
 * the line holds the payment amount in local currency and the conversion is derived —
 * `purchaseOrderLineUsd()` reads the FX master on the line's own actual payment date,
 * exactly as the fund does. The line stores no rate.
 */
export interface PurchaseOrderLine {
  id: string;
  purchaseAgreementId: string;
  /** `Payment Amount in local currency`. Absent until a payment is recorded. */
  paymentAmount?: Money;
  /** The date the payment was made, and the date the USD conversion is read on. */
  actualPaymentDate?: IsoDate;
  note?: string;
}

export interface PurchaseOrder {
  id: string;
  /**
   * `PO Number` — entered, not generated. The instruction makes it the header of the Add
   * screen and the editable field of the Edit screen, so it is a business reference the
   * user supplies rather than a sequence COTS issues. It is checked for uniqueness,
   * because the list makes it the row identity.
   */
  poNumber: string;
  lines: PurchaseOrderLine[];
  createdOn: IsoDate;
  createdBy: string;
  updatedOn?: IsoDate;
  updatedBy?: string;
  note?: string;
}
