/**
 * Milestone definitions for the compact lifecycle stepper (C4) and the expanded
 * execution flow (C5).
 *
 * Milestone names, order, owners and prerequisites come from the export evidence, not
 * from CTRM. CTRM's example labels (Confirmed / Allocated / Shipped / Invoice /
 * Paid-Received) belong to a trading lifecycle we do not model — only the *layout*
 * is borrowed (see docs/export/ctrm-ui-reference.md C4, C5).
 *
 * SLA day-ranges come from Export/OBL Process.pdf and Export/Phyto & Fum and COO.pdf,
 * the only quantified targets in the evidence base.
 */

import type {
  Milestone,
  MilestoneDefinition,
  MilestoneState,
  Phase,
  PhaseId,
  Shipment,
  VariantContext,
} from "./types";
import { TODAY, daysRemaining, documentCompleteness } from "./calc";

/* ------------------------------------------------------------------ *
 * The 14 validated phases
 * ------------------------------------------------------------------ */

/**
 * The prototype's fourteen phases. Workflow v2.0 describes sixteen and keeps these
 * P-numbers deliberately as a cross-reference (§16); the sixteen-phase map is in
 * `domain/workflow.ts`. Where one P-number serves two v2.0 phases the mapping is
 * noted here so the two documents can be read side by side:
 *   P1  → v2.0 phases 01 and 02   P3  → v2.0 phases 04 and 05
 *   P5  → v2.0 phase 06           P11 → v2.0 phases 10 and 11
 */
export const PHASES: Phase[] = [
  { id: "P1", name: "Trade origination & costing", owner: "trader", module: "/origination" },
  { id: "P2", name: "Contract creation & compliance", owner: "dubai_execution", module: "/contracts" },
  { id: "P3", name: "Contract review & setup feedback", owner: "quality", module: "/contracts" },
  { id: "P4", name: "Execution planning", owner: "partner_execution", module: "/shipments" },
  { id: "P5", name: "Cargo readiness & allocation", owner: "processing", module: "/allocation" },
  { id: "P6", name: "Export contract", owner: "partner_execution", module: "/pre-clearance" },
  { id: "P7", name: "EX forms", owner: "trade_finance", module: "/pre-clearance" },
  { id: "P8", name: "Pre-clearance document custody", owner: "partner_execution", module: "/pre-clearance" },
  { id: "P9", name: "Offers, booking, SI & SRF", owner: "logistics", module: "/shipments" },
  { id: "P10", name: "Clearance & regulatory", owner: "logistics", module: "/clearance" },
  { id: "P11", name: "Stuffing / loading & movement", owner: "logistics", module: "/stuffing" },
  { id: "P12", name: "Shipping documents", owner: "dubai_execution", module: "/documents" },
  { id: "P13", name: "Final documents & charges", owner: "finance", module: "/documents" },
  { id: "P14", name: "Post-shipment, bank & close-out", owner: "trade_finance", module: "/post-shipment" },
];

export const PHASE_BY_ID = Object.fromEntries(PHASES.map((p) => [p.id, p])) as Record<PhaseId, Phase>;

/* ------------------------------------------------------------------ *
 * Compact lifecycle steppers (C4)
 * ------------------------------------------------------------------ */

export interface StepperStep {
  key: string;
  label: string;
  phase: PhaseId;
}

/**
 * Contract lifecycle — nine milestones. `deal_agreed` is new in v2.0: phases 01 and
 * 02 precede the contract and had no step before (v2.0 §16.1).
 */
export const CONTRACT_LIFECYCLE: StepperStep[] = [
  { key: "deal_agreed", label: "Deal agreed", phase: "P1" },
  { key: "contract_confirmed", label: "Contract confirmed", phase: "P2" },
  { key: "setup_confirmed", label: "Setup confirmed", phase: "P3" },
  { key: "execution_planned", label: "Execution planned", phase: "P4" },
  { key: "cargo_allocated", label: "Cargo allocated", phase: "P5" },
  { key: "export_contract_ready", label: "Export contract ready", phase: "P6" },
  { key: "shipped", label: "Shipped", phase: "P11" },
  { key: "documents_dispatched", label: "Documents dispatched", phase: "P12" },
  { key: "payment_received", label: "Payment received", phase: "P14" },
];

/**
 * Shipment lifecycle — ten milestones. `moved_to_port` is new in v2.0: phase 10,
 * cargo movement and the stuffing request, had no step before (v2.0 §16.1, G-12).
 */
export const SHIPMENT_LIFECYCLE: StepperStep[] = [
  { key: "planned", label: "Planned", phase: "P4" },
  { key: "cargo_ready", label: "Cargo ready", phase: "P5" },
  { key: "preclearance_complete", label: "Pre-clearance complete", phase: "P8" },
  { key: "booked", label: "Booked", phase: "P9" },
  { key: "cleared", label: "Cleared", phase: "P10" },
  { key: "moved_to_port", label: "Moved to port", phase: "P11" },
  { key: "stuffed_sealed", label: "Stuffed & sealed", phase: "P11" },
  { key: "sailed", label: "Sailed", phase: "P11" },
  { key: "documents_complete", label: "Documents complete", phase: "P13" },
  { key: "closed", label: "Closed", phase: "P14" },
];

/* ------------------------------------------------------------------ *
 * Expanded execution flow (C5) — full COTS sequence, with variant branching
 * ------------------------------------------------------------------ */

export const EXECUTION_FLOW: MilestoneDefinition[] = [
  /* ---- Band: Contract ---- */
  {
    key: "costing_snapshot",
    name: "Costing snapshot taken & position declared",
    phase: "P1",
    band: "Contract",
    owner: "trader",
    prerequisites: [],
    evidence:
      "Workflow v2.0 §6.1 Phase 01, activities 3-6 and both blocking controls; register C-08, C-09, G-09",
  },
  {
    key: "deal_agreed",
    name: "Deal agreed with buyer & snapshot locked",
    phase: "P1",
    band: "Contract",
    owner: "trader",
    prerequisites: ["costing_snapshot"],
    evidence:
      "Workflow v2.0 §6.2 Phase 02, activities 1-3; the snapshot gate is workshop Costing 1(vi); register C-10",
  },
  {
    key: "compliance_cleared",
    name: "Compliance / new-counterparty cleared",
    phase: "P2",
    band: "Contract",
    owner: "compliance",
    prerequisites: ["deal_agreed"],
    evidence: "CIM Invictus/Appendix B: 'get review and approval to proceed from Finance Compliance'",
  },
  {
    key: "contract_issued",
    name: "Purchase contract issued & distributed",
    phase: "P2",
    band: "Contract",
    owner: "dubai_execution",
    prerequisites: ["compliance_cleared"],
    documents: ["commercial_invoice"],
    evidence: "Export Screnshots/Pre Clearance Process Tab/Purchase Contract; Appendix B",
  },
  {
    key: "setup_feedback",
    name: "Cross-functional fulfilment confirmations (4)",
    phase: "P3",
    band: "Contract",
    owner: "quality",
    prerequisites: ["contract_issued"],
    evidence:
      "Workflow v2.0 §6.4 Phase 04 - Quality, Execution, Processing and FP&A each confirm they can fulfil; register C-16, G-10. Whether it gates execution is decision D-10",
  },
  {
    key: "quality_terms_set",
    name: "Contract quality terms set",
    phase: "P3",
    band: "Contract",
    owner: "quality",
    prerequisites: ["contract_issued"],
    evidence:
      "Workflow v2.0 §6.5 Phase 05, activities 1-2 - mandatory commodity parameters retrieved from master data and overridden per buyer; register C-13",
  },
  {
    key: "tags_specified",
    name: "Tags / artwork specification agreed",
    phase: "P3",
    band: "Contract",
    owner: "dubai_execution",
    prerequisites: ["contract_issued"],
    evidence:
      "Workflow v2.0 §6.5 Phase 05, activities 3-4 - a separate flow after contract save, listing the buyer's custom tag options; register C-14",
  },

  /* ---- Band: Planning ---- */
  {
    key: "execution_plan_created",
    name: "Execution plan created",
    phase: "P4",
    band: "Planning",
    owner: "partner_execution",
    prerequisites: ["contract_issued"],
    evidence: "Export Screnshots/Pre Clearance Process Tab/Execution Planning",
  },
  {
    key: "stock_allocated",
    name: "Stock allocated to contract",
    phase: "P5",
    band: "Planning",
    owner: "processing",
    prerequisites: ["execution_plan_created"],
    evidence: "COTS - Workshop Notes (Stock Allocation); Shipments Execution",
  },
  {
    key: "cargo_ready",
    name: "Cargo ready at facility",
    phase: "P5",
    band: "Planning",
    owner: "warehouse",
    prerequisites: ["stock_allocated"],
    evidence: "Appendix B 'Ensure Cargo Readiness'; Shipments Execution Cargo Status",
  },

  /* ---- Band: Pre-clearance (conditional by country) ---- */
  {
    key: "advance_payment_confirmed",
    name: "Advance payment issued & confirmed",
    phase: "P6",
    band: "Pre-clearance",
    owner: "finance",
    prerequisites: ["contract_issued"],
    /**
     * v2.0 §6.7 states Ethiopia yes (Invictus to AMROS to African Lakes) and Chad
     * not applicable; the other three countries are unstated and are decision D-15.
     * Only the confirmed cell is applied here - nothing is inferred for the rest.
     */
    appliesTo: (c) => c.country.code === "ET",
    evidence:
      "Workflow v2.0 §6.7 Phase 07, activities 5 and 8; register C-31, G-13; applicability outside Ethiopia is decision D-15",
  },
  {
    key: "export_contract_requested",
    name: "Export contract requested",
    phase: "P6",
    band: "Pre-clearance",
    owner: "partner_execution",
    prerequisites: ["execution_plan_created"],
    appliesTo: (c) => c.country.usesExportContract,
    evidence: "EX Contract Request; COTS - Workshop Notes (country applicability)",
  },
  {
    key: "export_contract_issued",
    name: "Export contract issued (MOT)",
    phase: "P6",
    band: "Pre-clearance",
    owner: "partner_execution",
    prerequisites: ["export_contract_requested"],
    appliesTo: (c) => c.country.usesExportContract,
    evidence: "Ex-contract-Follow-up; Appendix B 'Issued from Ministry of Trade (MOT)'",
  },
  {
    key: "export_permit_issued",
    name: "Export permit issued",
    phase: "P6",
    band: "Pre-clearance",
    owner: "partner_execution",
    prerequisites: ["contract_issued"],
    appliesTo: (c) => c.country.usesExportPermit,
    evidence: "Export/Export Processes.vsdx p3; Export/Tanzania Shipping Process.pdf",
  },
  {
    key: "commercial_invoice_issued",
    name: "Commercial invoice issued to customs",
    phase: "P6",
    band: "Pre-clearance",
    owner: "partner_execution",
    prerequisites: ["contract_issued"],
    appliesTo: (c) => c.country.startsFromCommercialInvoice,
    evidence: "COTS - Workshop Notes: Mozambique starts with the commercial invoice",
  },
  {
    key: "ex_forms_issued",
    name: "EX forms issued by bank",
    phase: "P7",
    band: "Pre-clearance",
    owner: "trade_finance",
    prerequisites: ["export_contract_issued"],
    appliesTo: (c) => c.country.usesExportForms,
    evidence: "Export form details; Appendix B 'Ex forms… pre-issued by banks in specific quantities'",
  },
  {
    key: "preclearance_custody",
    name: "Pre-clearance pack received by OPU & PZU",
    phase: "P8",
    band: "Pre-clearance",
    owner: "partner_execution",
    prerequisites: ["export_contract_issued"],
    appliesTo: (c) => c.country.code === "SD",
    evidence: "Export Preclearance Tracking Document (OPU / PZU custody block)",
  },

  /* ---- Band: Booking & SI ---- */
  {
    key: "freight_offer_selected",
    name: "Freight offer selected & approved",
    phase: "P9",
    band: "Booking & SI",
    owner: "logistics",
    prerequisites: ["cargo_ready"],
    evidence: "Freight Offers; Export/Ethiopia & Chad Execution.vsdx ('Select Offer' → 'Approval')",
  },
  {
    key: "service_request_raised",
    name: "Service request raised to logistics",
    phase: "P9",
    band: "Booking & SI",
    owner: "partner_execution",
    prerequisites: ["cargo_ready"],
    appliesTo: (c) => c.country.usesLogisticsServiceRequest,
    evidence: "SI and SRF; COTS - Workshop Notes: Service request applicable to Sudan only",
  },
  {
    key: "booking_confirmed",
    name: "Booking confirmed with carrier",
    phase: "P9",
    band: "Booking & SI",
    owner: "logistics",
    prerequisites: ["freight_offer_selected"],
    appliesTo: (c) => c.shipmentType !== "road",
    evidence: "Shipment Booking; Appendix B 'Shipment Booking with shipping line and get booking No'",
  },
  {
    key: "charter_party_agreed",
    name: "Charter party agreed with vessel agent",
    phase: "P9",
    band: "Booking & SI",
    owner: "partner_execution",
    prerequisites: ["freight_offer_selected"],
    appliesTo: (c) => c.shipmentType === "bulk" || c.shipmentType === "break_bulk",
    evidence: "Appendix B 'Charter Party Agreement… for bulk and break-bulk sea shipments'",
  },
  {
    key: "shipping_instruction_issued",
    name: "Shipping instruction issued",
    phase: "P9",
    band: "Booking & SI",
    owner: "dubai_execution",
    prerequisites: ["booking_confirmed"],
    slaDays: 1,
    slaSource: "Export/OBL Process.pdf — 'Issue and share final SI (0-1) day'",
    evidence: "Final SI (numbered blocks 1-9); SI and SRF",
  },

  /* ---- Band: Clearance ---- */
  {
    key: "customs_declaration",
    name: "Customs declaration submitted",
    phase: "P10",
    band: "Clearance",
    owner: "logistics",
    prerequisites: ["ex_forms_issued", "booking_confirmed"],
    evidence: "Clearance §4; Appendix B 'The customs declaration is done for each export form'",
  },
  {
    key: "regulatory_sampling",
    name: "Regulatory sampling (SSMO / health / PP)",
    phase: "P10",
    band: "Clearance",
    owner: "quality",
    prerequisites: ["customs_declaration"],
    appliesTo: (c) => c.country.code === "SD",
    evidence: "Clearance §5-§6; Export/Execution & Operation Processes.vsdx p2",
  },
  {
    key: "tancis_declaration",
    name: "TANCIS declaration & TRA release order",
    phase: "P10",
    band: "Clearance",
    owner: "logistics",
    prerequisites: ["booking_confirmed"],
    appliesTo: (c) => c.country.code === "TZ",
    evidence: "Export/Tanzania Shipping Process.pdf (Forwarder and CFS lanes)",
  },
  {
    key: "customs_release",
    name: "Customs release obtained",
    phase: "P10",
    band: "Clearance",
    owner: "logistics",
    prerequisites: ["customs_declaration"],
    evidence: "Clearance §4 Custom Release Date",
  },
  {
    key: "surveyor_appointed",
    name: "Surveyor appointed",
    phase: "P10",
    band: "Clearance",
    owner: "surveyor",
    prerequisites: ["booking_confirmed"],
    evidence: "Appendix B 'Surveyor Appointment and Reporting'",
  },

  /* ---- Band: Movement & stuffing request (v2.0 Phase 10, new) ---- */
  {
    key: "cargo_moved_to_port",
    name: "Cargo moved to the port country",
    phase: "P11",
    band: "Movement & stuffing request",
    owner: "partner_execution",
    prerequisites: ["cargo_ready", "advance_payment_confirmed"],
    evidence:
      "Workflow v2.0 §6.10 Phase 10, activities 1-2 - movement from the origin city to the port country, tracked by truck detail or as a bulk daily operation; register C-35, C-40, G-12",
  },
  {
    key: "stuffing_request_raised",
    name: "Stuffing request raised & notified to five functions",
    phase: "P11",
    band: "Movement & stuffing request",
    owner: "partner_execution",
    prerequisites: ["cargo_moved_to_port"],
    evidence:
      "Workflow v2.0 §6.10 Phase 10, activities 3-4 - the request initiates the stuffing operation and is communicated to Quality, Logistics, Clearance, Warehousing and Processing; register C-47. Whether it blocks stuffing is [OPEN]",
  },

  /* ---- Band: Stuffing & loading ---- */
  {
    key: "empty_containers_inspected",
    name: "Empty containers inspected & positioned",
    phase: "P11",
    band: "Stuffing & loading",
    owner: "logistics",
    prerequisites: ["booking_confirmed", "surveyor_appointed", "stuffing_request_raised"],
    appliesTo: (c) => c.shipmentType === "container",
    evidence: "Appendix B 'Empty containers check and inspection report'; Clearance orphaned columns",
  },
  {
    key: "container_protocol_recorded",
    name: "Container inspection protocol recorded",
    phase: "P11",
    band: "Stuffing & loading",
    owner: "surveyor",
    prerequisites: ["empty_containers_inspected"],
    appliesTo: (c) => c.shipmentType === "container",
    evidence:
      "Workflow v2.0 §6.11 Phase 11, activity 1 - [PROPOSED] that the protocol and its results are recorded in COTS; register C-46. What is inspected and what constitutes a pass is [OPEN]",
  },
  {
    key: "stuffing_complete",
    name: "Stuffing complete",
    phase: "P11",
    band: "Stuffing & loading",
    owner: "logistics",
    prerequisites: ["empty_containers_inspected", "customs_release"],
    appliesTo: (c) => c.shipmentType === "container",
    evidence: "Stuffing Status (daily progress grid); Appendix B 'Container stuffing starts…'",
  },
  {
    key: "vessel_loaded",
    name: "Vessel loading complete",
    phase: "P11",
    band: "Stuffing & loading",
    owner: "logistics",
    prerequisites: ["charter_party_agreed", "customs_release"],
    appliesTo: (c) => c.shipmentType === "bulk" || c.shipmentType === "break_bulk",
    evidence: "Appendix B 'Vessel Loading Operation'; Vessel at PZU North Port",
  },
  {
    key: "trucks_loaded",
    name: "Trucks loaded & weighed",
    phase: "P11",
    band: "Stuffing & loading",
    owner: "logistics",
    prerequisites: ["customs_release"],
    appliesTo: (c) => c.shipmentType === "road" || c.country.hasInlandTransitLeg,
    evidence: "Export/Ethiopia & Chad Execution.vsdx p2 'Trucks loading and weighting'",
  },
  {
    key: "inland_transit_complete",
    name: "Inland transit complete",
    phase: "P11",
    band: "Stuffing & loading",
    owner: "logistics",
    prerequisites: ["trucks_loaded"],
    appliesTo: (c) => c.country.hasInlandTransitLeg,
    evidence: "Export/Export Processes.vsdx p2-p3 (Djibouti); p1 (Chad transit documents)",
  },
  {
    key: "sealed_under_survey",
    name: "Sealed under surveyor supervision",
    phase: "P11",
    band: "Stuffing & loading",
    owner: "surveyor",
    prerequisites: ["stuffing_complete"],
    appliesTo: (c) => c.shipmentType === "container",
    evidence: "Appendix B 'containers sealed under surveyor supervision'",
  },
  {
    key: "delivered_to_port",
    name: "Delivered to carrier at port",
    phase: "P11",
    band: "Stuffing & loading",
    owner: "logistics",
    prerequisites: ["sealed_under_survey"],
    evidence: "Appendix B 'Move the containers, deliver to shipping line at port'",
  },
  {
    key: "stuffing_report_received",
    name: "Surveyor stuffing report received",
    phase: "P11",
    band: "Stuffing & loading",
    owner: "surveyor",
    prerequisites: ["delivered_to_port"],
    slaDays: 2,
    slaSource: "Export/OBL Process.pdf — 'Receiving the Stuffing Report from Surveyor (1-2) days'",
    documents: ["stuffing_report"],
    evidence: "Stuffing Status; Clearance §7; Export/OBL Process.pdf",
  },
  {
    key: "sailed",
    name: "Vessel sailed",
    phase: "P11",
    band: "Stuffing & loading",
    owner: "logistics",
    prerequisites: ["delivered_to_port"],
    evidence: "Export/OBL Process.pdf 'Vessel Sailing'; Vessel at PZU (ATD)",
  },

  /* ---- Band: Documents ---- */
  {
    key: "dbl_received",
    name: "Draft B/L received from carrier",
    phase: "P12",
    band: "Documents",
    owner: "partner_execution",
    prerequisites: ["stuffing_report_received", "shipping_instruction_issued"],
    slaDays: 1,
    slaSource: "Export/OBL Process.pdf — 'Send S/R & Final SI to S/L to issue DBL (0-1) day'",
    documents: ["bill_of_lading"],
    evidence: "Documents Confirmation §4.1; Export/OBL Process.pdf",
  },
  {
    key: "dbl_confirmed",
    name: "Draft B/L confirmed by customer",
    phase: "P12",
    band: "Documents",
    owner: "dubai_execution",
    prerequisites: ["dbl_received"],
    slaDays: 2,
    slaSource: "Export/OBL Process.pdf — 'share with Customer to confirm/amend (1-2) day'",
    documents: ["bill_of_lading"],
    evidence: "Export/OBL Process.pdf (DBL confirmed decision with amendment loop)",
  },
  {
    key: "certificate_drafts_confirmed",
    name: "Certificate drafts confirmed",
    phase: "P12",
    band: "Documents",
    owner: "dubai_execution",
    prerequisites: ["dbl_confirmed"],
    slaDays: 2,
    slaSource: "Export/Phyto & Fum and COO.pdf — 'Send to customer to check and confirm (1-2) day'",
    documents: ["coo", "phytosanitary", "fumigation", "health"],
    evidence: "Export/Phyto & Fum and COO.pdf; Documents Confirmation §4.2-§4.4",
  },
  {
    key: "originals_issued",
    name: "Original certificates issued",
    phase: "P12",
    band: "Documents",
    owner: "partner_execution",
    prerequisites: ["certificate_drafts_confirmed"],
    slaDays: 2,
    slaSource: "Export/Phyto & Fum and COO.pdf — 'Issue Original Phyto & Fum, Health certificates (1-2)day'",
    documents: ["coo", "phytosanitary", "fumigation"],
    evidence: "Export/Phyto & Fum and COO.pdf (Clearance Team PZU lane)",
  },
  {
    key: "obl_issued",
    name: "Original B/L issued",
    phase: "P13",
    band: "Documents",
    owner: "logistics",
    prerequisites: ["dbl_confirmed"],
    slaDays: 3,
    slaSource:
      "Export/OBL Process.pdf — 'Line to issue OBL and deliver to Sudan and commercial Banks (2-3) day'",
    documents: ["obl"],
    evidence: "Shipment Documents Tracking §3.2; Export/OBL Process.pdf",
  },
  {
    key: "packing_list_issued",
    name: "Packing list issued",
    phase: "P13",
    band: "Documents",
    owner: "partner_execution",
    prerequisites: ["stuffing_report_received"],
    slaDays: 1,
    slaSource: "Export/Phyto & Fum and COO.pdf — 'Issue PL & INV in office (0-1)day'",
    documents: ["packing_list"],
    evidence: "Packing List; Shipment Documents Tracking §4",
  },
  {
    key: "charges_settled",
    name: "Freight & local charges settled",
    phase: "P13",
    band: "Documents",
    owner: "finance",
    prerequisites: ["obl_issued"],
    slaDays: 3,
    slaSource: "Export/OBL Process.pdf — 'Line to issue Local charges invoice and Freight Invoice (2-3) day'",
    evidence: "Shipment Documents Tracking §3.1 (five charge blocks); Appendix B 'Pay Freight Charges'",
  },

  /* ---- Band: Close-out ---- */
  {
    key: "post_shipment_assembled",
    name: "Post-shipment document set assembled",
    phase: "P14",
    band: "Close-out",
    owner: "partner_execution",
    prerequisites: ["originals_issued", "packing_list_issued"],
    evidence: "Post Shipment Details §2.1 (five-item checklist)",
  },
  {
    key: "bank_submittal",
    name: "Documents submitted to bank",
    phase: "P14",
    band: "Close-out",
    owner: "trade_finance",
    prerequisites: ["post_shipment_assembled", "obl_issued"],
    evidence: "Bank Submittal (under collection, maturity date, AWB)",
  },
  {
    key: "obl_dispatched",
    name: "OBL dispatched to customer",
    phase: "P14",
    band: "Close-out",
    owner: "dubai_execution",
    prerequisites: ["obl_issued"],
    slaDays: 2,
    slaSource:
      "Export/Phyto & Fum and COO.pdf — 'Courier original documents to Dubai or directly to customer (1-2)day'",
    documents: ["obl"],
    evidence: "Export/OBL Process.pdf (courier / telex release branch); Appendix B; rule R22",
  },
  {
    key: "payment_received",
    name: "Customer payment received",
    phase: "P14",
    band: "Close-out",
    owner: "finance",
    prerequisites: ["bank_submittal"],
    evidence: "Appendix B 'Follow on customer payment according to agreed terms'",
  },
  {
    key: "customer_feedback_logged",
    name: "Customer feedback logged against the contract",
    phase: "P14",
    band: "Close-out",
    owner: "trader",
    prerequisites: ["payment_received"],
    evidence:
      "Workflow v2.0 §6.16 Phase 16, activity 5 - satisfaction or a complaint about the service or the commodity, linked to the contract; register C-59. [PROPOSED], awaiting an IT proposal",
  },
  {
    key: "closed_out",
    name: "Sales order created & contract closed",
    phase: "P14",
    band: "Close-out",
    owner: "finance",
    prerequisites: ["payment_received"],
    evidence: "Sales Order (PC Completion flag; PC-Completed / PC Partially-Completed workflows)",
  },
];

/**
 * Band order follows the v2.0 phase sequence. "Movement & stuffing request" is new:
 * v2.0 Phase 10 sits between clearance and stuffing and had no band before.
 * Whether clearance genuinely completes before or after stuffing is decision D-14
 * and is not settled by this ordering.
 */
export const EXECUTION_FLOW_BANDS = [
  "Contract",
  "Planning",
  "Pre-clearance",
  "Booking & SI",
  "Clearance",
  "Movement & stuffing request",
  "Stuffing & loading",
  "Documents",
  "Close-out",
] as const;

export const MILESTONE_BY_KEY = Object.fromEntries(EXECUTION_FLOW.map((m) => [m.key, m])) as Record<
  string,
  MilestoneDefinition
>;

/* ------------------------------------------------------------------ *
 * Applicability and state resolution
 * ------------------------------------------------------------------ */

export function variantContextOf(
  shipment: Pick<Shipment, "shipmentType" | "isLargeVolume" | "usesFreightForwarder" | "country">,
  countryProfile: VariantContext["country"],
  commodityIsGold = false,
): VariantContext {
  return {
    country: countryProfile,
    shipmentType: shipment.shipmentType,
    isLargeVolume: shipment.isLargeVolume,
    usesFreightForwarder: shipment.usesFreightForwarder,
    commodityIsGold,
  };
}

export function applicableMilestones(ctx: VariantContext): MilestoneDefinition[] {
  return EXECUTION_FLOW.filter((m) => (m.appliesTo ? m.appliesTo(ctx) : true));
}

export interface ResolvedMilestone {
  def: MilestoneDefinition;
  state: MilestoneState;
  actualDate?: string;
  targetDate?: string;
  ownerName?: string;
  blockingReason?: string;
  documentCompleteness?: number;
  note?: string;
  /** Prerequisites that are not yet complete. */
  unmetPrerequisites: string[];
  daysToTarget?: number;
}

/**
 * Resolve stored milestone records against the definitions and the shipment's variant,
 * deriving `not_applicable`, `blocked`, `ready` and `overdue` rather than storing them.
 */
export function resolveMilestones(
  stored: Milestone[],
  ctx: VariantContext,
  today: string = TODAY,
  documents?: Shipment["documents"],
): ResolvedMilestone[] {
  const byKey = new Map(stored.map((m) => [m.key, m]));
  const applicable = new Set(applicableMilestones(ctx).map((m) => m.key));

  // First pass — the state we can read directly.
  const base = new Map<string, MilestoneState>();
  for (const def of EXECUTION_FLOW) {
    if (!applicable.has(def.key)) {
      base.set(def.key, "not_applicable");
      continue;
    }
    base.set(def.key, byKey.get(def.key)?.state ?? "not_started");
  }

  return EXECUTION_FLOW.map((def) => {
    const rec = byKey.get(def.key);
    let state = base.get(def.key)!;

    // Prerequisites that are applicable and not complete.
    const unmetPrerequisites = def.prerequisites.filter((p) => {
      const pState = base.get(p);
      if (pState === "not_applicable") return false;
      return pState !== "completed";
    });

    if (state !== "not_applicable" && state !== "cancelled" && state !== "completed") {
      if (unmetPrerequisites.length > 0 && state === "not_started") {
        state = "not_started";
      } else if (unmetPrerequisites.length === 0 && state === "not_started") {
        state = "ready";
      }
      if (rec?.blockingReason) state = "blocked";
      const target = rec?.targetDate;
      if (target && state !== "blocked") {
        const left = daysRemaining(target, today);
        if (left !== undefined && left < 0) state = "overdue";
      }
    }

    let docCompleteness = rec?.documentCompleteness;
    if (docCompleteness === undefined && documents && def.documents?.length) {
      const scoped = documents.filter((d) => def.documents!.includes(d.key));
      if (scoped.length > 0) docCompleteness = documentCompleteness(scoped).fraction;
    }

    return {
      def,
      state,
      actualDate: rec?.actualDate,
      targetDate: rec?.targetDate,
      ownerName: rec?.ownerName,
      blockingReason: rec?.blockingReason,
      documentCompleteness: docCompleteness,
      note: rec?.note,
      unmetPrerequisites,
      daysToTarget: rec?.targetDate ? daysRemaining(rec.targetDate, today) : undefined,
    };
  });
}

/**
 * Derive the compact lifecycle stepper from the resolved execution flow, so the two
 * components can never disagree.
 */
const SHIPMENT_STEP_SOURCE: Record<string, string[]> = {
  planned: ["execution_plan_created"],
  cargo_ready: ["cargo_ready"],
  preclearance_complete: [
    "advance_payment_confirmed",
    "ex_forms_issued",
    "preclearance_custody",
    "export_permit_issued",
    "commercial_invoice_issued",
  ],
  booked: ["booking_confirmed", "charter_party_agreed"],
  cleared: ["customs_release"],
  moved_to_port: ["cargo_moved_to_port", "stuffing_request_raised"],
  stuffed_sealed: ["sealed_under_survey", "vessel_loaded", "trucks_loaded"],
  sailed: ["sailed"],
  documents_complete: ["originals_issued", "obl_issued"],
  closed: ["closed_out"],
};

const CONTRACT_STEP_SOURCE: Record<string, string[]> = {
  deal_agreed: ["costing_snapshot", "deal_agreed"],
  contract_confirmed: ["contract_issued"],
  setup_confirmed: ["setup_feedback", "quality_terms_set", "tags_specified"],
  execution_planned: ["execution_plan_created"],
  cargo_allocated: ["stock_allocated"],
  export_contract_ready: ["export_contract_issued", "export_permit_issued", "commercial_invoice_issued"],
  shipped: ["sailed"],
  documents_dispatched: ["obl_dispatched"],
  payment_received: ["payment_received"],
};

function rollUp(states: MilestoneState[]): MilestoneState {
  const live = states.filter((s) => s !== "not_applicable");
  if (live.length === 0) return "not_applicable";
  if (live.some((s) => s === "blocked")) return "blocked";
  if (live.some((s) => s === "overdue")) return "overdue";
  if (live.every((s) => s === "completed")) return "completed";
  if (live.some((s) => s === "completed" || s === "in_progress")) return "in_progress";
  if (live.some((s) => s === "ready")) return "ready";
  return "not_started";
}

export interface ResolvedStep extends StepperStep {
  state: MilestoneState;
  date?: string;
  ownerName?: string;
  sourceKeys: string[];
}

export function resolveStepper(
  steps: StepperStep[],
  resolved: ResolvedMilestone[],
  source: Record<string, string[]>,
): ResolvedStep[] {
  const byKey = new Map(resolved.map((r) => [r.def.key, r]));
  return steps.map((step) => {
    const keys = source[step.key] ?? [];
    const items = keys.map((k) => byKey.get(k)).filter(Boolean) as ResolvedMilestone[];
    const state = rollUp(items.map((i) => i.state));
    const dates = items.map((i) => i.actualDate).filter(Boolean) as string[];
    const targets = items.map((i) => i.targetDate).filter(Boolean) as string[];
    return {
      ...step,
      state,
      date: state === "completed" ? dates.sort().at(-1) : targets.sort().at(0),
      ownerName: items.find((i) => i.ownerName)?.ownerName,
      sourceKeys: keys,
    };
  });
}

export function resolveShipmentStepper(resolved: ResolvedMilestone[]): ResolvedStep[] {
  return resolveStepper(SHIPMENT_LIFECYCLE, resolved, SHIPMENT_STEP_SOURCE);
}

export function resolveContractStepper(resolved: ResolvedMilestone[]): ResolvedStep[] {
  return resolveStepper(CONTRACT_LIFECYCLE, resolved, CONTRACT_STEP_SOURCE);
}
