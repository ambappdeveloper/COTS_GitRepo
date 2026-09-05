/**
 * New purchase contract (P2) — the draft shape and its rules.
 *
 * This is the target-state version of the legacy `Purchase Contract` InfoPath form. The field
 * set is deliberately recognisable to the people who use that form every day; what changes is
 * that the rules are *enforced* and the derived values are *derived*. Each departure below is
 * traceable to a defect recorded in the review document.
 *
 * | Legacy behaviour (§4.3)                                        | Here                                   |
 * |----------------------------------------------------------------|----------------------------------------|
 * | Lots flattened into fixed numbered slots                       | unbounded `lots[]`, add / remove        |
 * | `Total QTY` a stored column showing 0                          | computed from the lots on every keystroke |
 * | Σ lot qty could exceed contract qty + tolerance and still save | blocking rule R3                        |
 * | Quantities, tolerance and container counts stored as Text      | numbers, validated                      |
 * | Shipment period dates with no order check                      | end ≥ start, and start ≥ confirmation    |
 * | Three independent fumigation checkboxes; none, or several, could be ticked while the form printed "Fumigation Value is Required" | one required choice, including "no fumigation required" |
 * | 15 document checkboxes with no minimum                         | at least one required (R? / §8.1)       |
 * | "Other" document could be ticked with no text                  | text required when ticked               |
 * | `Buyer Address` required on the form but empty on 865 records  | required, and defaulted from the buyer   |
 * | `Status` editable at creation                                  | always `new_pc`; status moves by transition |
 *
 * Pure functions only, so every rule is unit-tested without a browser.
 */

import { maxAllowedQuantity, safeNumber, sum } from "./calc";
import type {
  ContractLot,
  CountryUnit,
  DocumentRequirementKey,
  FumigationType,
  Incoterm,
  IsoDate,
  Mt,
  PackingType,
  ShipmentType,
} from "./types";

export interface LotDraft {
  /** Row key, stable across re-orders. Not the lot number — that is the row's position. */
  key: string;
  quantityMt: string;
  containerCount: string;
}

export interface PurchaseContractDraft {
  retrievePcId: string;
  businessConfirmationDate: string;
  buyerId: string;
  buyerAddress: string;
  buyerNickName: string;
  commodityId: string;
  commodityType: string;
  origin: CountryUnit | "";
  traderName: string;
  quantityMt: string;
  tolerancePct: string;
  shipmentPeriodStart: string;
  shipmentPeriodEnd: string;
  lots: LotDraft[];
  incoterm: Incoterm | "";
  shipmentType: ShipmentType | "";
  methodOfShipping: string;
  packingType: PackingType | "";
  packingSizeKg: string;
  tolerancePctPerUnit: string;
  packingInstruction: string;
  cargoInstruction: string;
  nominatedSurveyorId: string;
  freeDaysAtPort: string;
  sapNumber: string;
  communicatedFrom: string;
  assignedDubaiExecution: string;
  portOfDischargeId: string;
  portOfLoadingId: string;
  consignee: string;
  notifyParty: string;
  notifyPartyAddress: string;
  documentRequirements: DocumentRequirementKey[];
  otherDocumentText: string;
  partialShipment: "" | "allowed" | "not_allowed";
  loadingContainerSize: "" | "20ft" | "40ft" | "20ft_and_40ft";
  fumigationType: FumigationType | "";
  actualPc: string;
  note: string;
  artworkType: "" | "standard" | "buyer_option";
  artworkPrintedBags: boolean;
  artworkTags: boolean;
  paymentTerms: string;
}

export type FieldErrors = Partial<Record<string, string>>;

export const PARTIAL_SHIPMENT_OPTIONS = [
  { value: "allowed" as const, label: "Allowed" },
  { value: "not_allowed" as const, label: "Not allowed" },
];

export const CONTAINER_SIZE_OPTIONS = [
  { value: "20ft" as const, label: "20 ft only" },
  { value: "40ft" as const, label: "40 ft only" },
  { value: "20ft_and_40ft" as const, label: "20 ft and/or 40 ft" },
];

export const FUMIGATION_OPTIONS = [
  { value: "methyl_bromide" as const, label: "Methyl bromide" },
  { value: "phosphine" as const, label: "Phosphine" },
  { value: "none" as const, label: "No fumigation required" },
];

/** The four the legacy form ticks by default. Kept, because the business relies on it. */
export const DEFAULT_DOCUMENT_REQUIREMENTS: DocumentRequirementKey[] = [
  "bl_awb_roadwb",
  "commercial_invoice",
  "coo_normal",
  "packing_list",
];

export function emptyLot(key: string): LotDraft {
  return { key, quantityMt: "", containerCount: "" };
}

export function emptyDraft(today: IsoDate): PurchaseContractDraft {
  return {
    retrievePcId: "",
    businessConfirmationDate: today,
    buyerId: "",
    buyerAddress: "",
    buyerNickName: "",
    commodityId: "",
    commodityType: "",
    origin: "",
    traderName: "",
    quantityMt: "",
    // The legacy form pre-fills 5% and prints "More or less at sellers' option at contract price".
    tolerancePct: "5",
    shipmentPeriodStart: "",
    shipmentPeriodEnd: "",
    lots: [emptyLot("lot-1")],
    incoterm: "",
    shipmentType: "",
    methodOfShipping: "",
    packingType: "",
    packingSizeKg: "",
    tolerancePctPerUnit: "",
    packingInstruction: "",
    cargoInstruction: "",
    nominatedSurveyorId: "",
    freeDaysAtPort: "",
    sapNumber: "",
    communicatedFrom: "",
    assignedDubaiExecution: "",
    portOfDischargeId: "",
    portOfLoadingId: "",
    consignee: "To order",
    notifyParty: "",
    notifyPartyAddress: "",
    documentRequirements: [...DEFAULT_DOCUMENT_REQUIREMENTS],
    otherDocumentText: "",
    partialShipment: "",
    loadingContainerSize: "",
    fumigationType: "",
    actualPc: "",
    note: "",
    artworkType: "",
    artworkPrintedBags: false,
    artworkTags: false,
    paymentTerms: "",
  };
}

/* ------------------------------------------------------------------ *
 * Derived values — computed, never stored (fixes §4.3 d)
 * ------------------------------------------------------------------ */

export interface LotTotals {
  lotCount: number;
  totalQtyMt: Mt;
  totalContainers: number;
  contractQtyMt: Mt;
  ceilingMt: Mt;
  /** Positive when the lots still have room; negative when they breach the ceiling. */
  headroomMt: Mt;
  overCeiling: boolean;
}

export function lotTotals(draft: PurchaseContractDraft): LotTotals {
  const contractQtyMt = safeNumber(draft.quantityMt, 0);
  const tolerancePct = safeNumber(draft.tolerancePct, 0);
  const totalQtyMt = sum(draft.lots.map((l) => safeNumber(l.quantityMt, 0)));
  const totalContainers = sum(draft.lots.map((l) => safeNumber(l.containerCount, 0)));
  const ceilingMt = maxAllowedQuantity({ quantityMt: contractQtyMt, tolerancePct });
  return {
    lotCount: draft.lots.length,
    totalQtyMt,
    totalContainers,
    contractQtyMt,
    ceilingMt,
    headroomMt: Math.round((ceilingMt - totalQtyMt) * 1000) / 1000,
    overCeiling: contractQtyMt > 0 && totalQtyMt > ceilingMt,
  };
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

function isPositiveNumber(raw: string): boolean {
  const n = Number(raw);
  return raw.trim() !== "" && Number.isFinite(n) && n > 0;
}

function isNonNegativeInteger(raw: string): boolean {
  if (raw.trim() === "") return true; // optional
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0;
}

/**
 * Every rule that stops a save, in one place. Returns a map of field id → message; an empty
 * map means the draft can be created. Field ids match the input ids on the form so the error
 * summary can link straight to the offending control.
 */
export function validatePurchaseContractDraft(draft: PurchaseContractDraft): FieldErrors {
  const e: FieldErrors = {};

  if (!draft.businessConfirmationDate) e["pc-confirmation-date"] = "Business confirmation date is required.";
  if (!draft.buyerId) e["pc-buyer"] = "Buyer is required.";
  if (!draft.buyerAddress.trim())
    e["pc-buyer-address"] =
      "Buyer address is required. It is blank on 865 legacy records because the rule never blocked the save.";
  if (!draft.buyerNickName.trim()) e["pc-buyer-nick"] = "Buyer nick name is required.";
  if (!draft.commodityId) e["pc-commodity"] = "Commodity is required.";
  if (!draft.origin) e["pc-origin"] = "Origin is required.";
  /**
   * The trader is still required on the contract, and is no longer entered on the screen
   * (instruction of 5 September 2026). It is read from the agreed deal, from the contract
   * copied by "Retrieve PC No.", or from the session when a trader is signed in — so a
   * missing trader is not a field left blank, it is a contract with no source for one, and
   * the message says which sources exist rather than asking for input that has nowhere to go.
   */
  if (!draft.traderName)
    e["pc-trader"] =
      "This contract has no trader. The trader is no longer entered here: it is read from the agreed " +
      "deal the contract is raised from, from the contract copied by Retrieve PC No., or from the " +
      "session when a trader is signed in.";

  if (!isPositiveNumber(draft.quantityMt))
    e["pc-quantity"] = "Contract quantity is required and must be a number greater than zero.";
  const tol = Number(draft.tolerancePct);
  if (draft.tolerancePct.trim() === "" || !Number.isFinite(tol) || tol < 0 || tol > 10)
    e["pc-tolerance"] = "Tolerance is required and must be between 0 and 10%.";

  if (!draft.shipmentPeriodStart) e["pc-period-start"] = "Shipment period start date is required.";
  if (!draft.shipmentPeriodEnd) e["pc-period-end"] = "Shipment period end date is required.";
  if (
    draft.shipmentPeriodStart &&
    draft.shipmentPeriodEnd &&
    draft.shipmentPeriodEnd < draft.shipmentPeriodStart
  )
    e["pc-period-end"] = "Shipment period end date cannot be before the start date.";
  if (
    draft.businessConfirmationDate &&
    draft.shipmentPeriodStart &&
    draft.shipmentPeriodStart < draft.businessConfirmationDate
  )
    e["pc-period-start"] = "Shipment period cannot start before the business confirmation date.";

  // Lots: at least one, each a real number, and the total inside the tolerance ceiling (R3).
  if (draft.lots.length === 0) e["pc-lot-add"] = "Add at least one shipment lot.";
  draft.lots.forEach((lot, i) => {
    if (!isPositiveNumber(lot.quantityMt))
      e[`pc-lot-qty-${i}`] = `Lot ${i + 1}: quantity is required and must be greater than zero.`;
    if (!isNonNegativeInteger(lot.containerCount))
      e[`pc-lot-containers-${i}`] = `Lot ${i + 1}: number of containers must be a whole number.`;
  });
  const totals = lotTotals(draft);
  if (totals.overCeiling)
    e["pc-lot-total"] =
      `Lot quantities total ${totals.totalQtyMt.toLocaleString()} MT, above the contract ceiling of ` +
      `${totals.ceilingMt.toLocaleString()} MT (${totals.contractQtyMt.toLocaleString()} MT + ${draft.tolerancePct}% tolerance). ` +
      `Reduce a lot by ${Math.abs(totals.headroomMt).toLocaleString()} MT.`;

  if (!draft.incoterm) e["pc-incoterm"] = "Inco term is required.";
  if (!draft.shipmentType) e["pc-shipping-type"] = "Shipping type is required.";
  if (!draft.methodOfShipping) e["pc-method-of-shipping"] = "Method of shipping is required.";
  if (!draft.packingType) e["pc-packing-type"] = "Packing type is required.";
  if (!isPositiveNumber(draft.packingSizeKg))
    e["pc-packing-size"] = "Packing size is required and must be a number greater than zero.";
  if (draft.tolerancePctPerUnit.trim() !== "") {
    const perUnit = Number(draft.tolerancePctPerUnit);
    if (!Number.isFinite(perUnit) || perUnit < 0 || perUnit > 100)
      e["pc-packing-tolerance"] = "Tolerance per unit must be a percentage between 0 and 100.";
  }
  if (!isNonNegativeInteger(draft.freeDaysAtPort))
    e["pc-free-days"] = "Free days at port must be a whole number.";

  if (!draft.portOfDischargeId) e["pc-port-discharge"] = "Port of discharge is required.";
  if (!draft.portOfLoadingId) e["pc-port-loading"] = "Port of loading is required.";
  if (!draft.consignee.trim()) e["pc-consignee"] = "Consignee is required.";
  if (!draft.notifyParty) e["pc-notify-party"] = "Notify party is required.";
  if (!draft.notifyPartyAddress.trim()) e["pc-notify-address"] = "Notify party address is required.";

  if (draft.documentRequirements.length === 0)
    e["pc-doc-bl_awb_roadwb"] = "Select at least one required document.";
  if (draft.documentRequirements.includes("other") && !draft.otherDocumentText.trim())
    e["pc-doc-other-text"] = 'Describe the "other" document, or clear the tick.';

  if (!draft.partialShipment) e["pc-partial"] = "State whether partial shipment is allowed.";
  if (draft.shipmentType === "container" && !draft.loadingContainerSize)
    e["pc-container-size"] = "Container loading size is required for a containerised shipment.";

  // The legacy form printed "Fumigation Value is Required" and then saved anyway.
  if (!draft.fumigationType)
    e["pc-fumigation-methyl_bromide"] = "Choose a fumigation treatment, or “No fumigation required”.";

  if (!draft.paymentTerms.trim()) e["pc-payment-terms"] = "Payment terms are required.";
  if (!draft.assignedDubaiExecution) e["pc-assigned"] = "Assign a person from Dubai execution.";

  if (draft.artworkType && !draft.artworkPrintedBags && !draft.artworkTags)
    e["pc-artwork-printed-bags"] = "Choose at least one artwork detail, or clear the artwork type.";

  return e;
}

/** Ordered list for the error summary: the order fields appear in on screen. */
export function errorList(errors: FieldErrors): { field: string; message: string }[] {
  return Object.entries(errors)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([field, message]) => ({ field, message }));
}

/** Lots as the domain wants them: numbered by position, typed, with no empty slots. */
export function lotsFromDraft(draft: PurchaseContractDraft): ContractLot[] {
  return draft.lots.map((l, i) => ({
    lotNo: i + 1,
    quantityMt: safeNumber(l.quantityMt, 0),
    containerCount: safeNumber(l.containerCount, 0),
  }));
}
