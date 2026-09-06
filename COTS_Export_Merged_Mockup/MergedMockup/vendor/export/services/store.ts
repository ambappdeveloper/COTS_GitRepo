/**
 * Mock service layer.
 *
 * All data access goes through these interfaces so a real API can replace the local
 * store without touching a single page. Every mutator returns a discriminated result
 * rather than throwing, so pages render a refusal reason instead of a crash.
 */

import {
  AUDIT_SEED,
  CARGO_READINESS,
  CONTRACTS,
  EXECUTION_PLANS,
  EXPORT_CONTRACTS,
  MATERIAL_PURCHASES,
  MATERIAL_RECEIPTS,
  PRECLEARANCE_PACKS,
  SHIPMENTS,
  STANDALONE_RISKS,
  TRANSPORT_REQUESTS,
  VESSEL_CALLS,
} from "../data/seed";
import {
  ADVANCE_PAYMENTS,
  AGENT_BALANCES,
  AGENT_BALANCE_MOVEMENTS,
  BUDGETS,
  BUYER_CLAIMS,
  CUSTOMER_FEEDBACK,
  FREIGHT_RATES,
  FUNDS,
  INSURANCE_INCIDENTS,
  INSURANCE_POLICIES,
  INTAKE_RECEIPTS,
  MOVEMENT_LEGS,
  OPPORTUNITIES,
  PRODUCTION_PLAN,
  PURCHASE_AGREEMENTS,
  PURCHASE_ORDERS,
  RECEIVING_LOCATION_PLANS,
  SEASONAL_PURCHASE_PLANS,
  STOCK_LOTS,
  STUFFING_REQUESTS,
  WAREHOUSE_REQUESTS,
} from "../data/seed-v2";
import {
  PORTS,
  commodityById,
  counterpartyById,
  portName,
  receivingLocationByLabel,
  receivingLocationKindOf,
} from "../data/master";
import { exchangeRateOn } from "../data/fx-rates";
import { COUNTRY_PROFILES } from "../domain/variants";
import {
  ADVANCE_PAYMENT_TRANSITIONS,
  BANK_SUBMITTAL_TRANSITIONS,
  BUYER_CLAIM_TRANSITIONS,
  CARGO_TRANSITIONS,
  CONTRACT_TRANSITIONS,
  DOCUMENT_TRANSITIONS,
  INSURANCE_INCIDENT_TRANSITIONS,
  INTAKE_RECEIPT_TRANSITIONS,
  MOVEMENT_LEG_TRANSITIONS,
  SHIPMENT_TRANSITIONS,
  TAG_SPECIFICATION_TRANSITIONS,
  WAREHOUSE_REQUEST_TRANSITIONS,
  canTransition,
  guardClearanceCompletion,
  guardDealAgreement,
  guardExportFormReuse,
  guardPostShipmentCompletion,
  guardStockAllocation,
} from "../domain/status";
import { documentCompleteness, quantityBalance, safeNumber, TODAY } from "../domain/calc";
import {
  formatSeasonMonth,
  isPlanActive,
  isValidSeasonMonth,
  monthsInSeason,
  planCarriesCommodity,
  seasonMonthKey,
} from "../domain/planning";
import {
  lotsFromDraft,
  lotTotals,
  validatePurchaseContractDraft,
  type PurchaseContractDraft,
} from "../domain/purchase-contract";
import { resolveMilestones, variantContextOf } from "../domain/milestones";
import type {
  AdvancePayment,
  AdvancePaymentState,
  BankSubmittalStatus,
  Money,
  AgentBalance,
  AgentBalanceMovement,
  AuditEvent,
  Budget,
  BudgetLine,
  BuyerClaim,
  BuyerClaimState,
  CargoReadiness,
  CargoStatus,
  Contract,
  ContractStatus,
  DocumentState,
  ContractQualityParameter,
  CustomerFeedback,
  DealTerms,
  ExecutionPlan,
  ExportContract,
  FreightRate,
  Fund,
  InsuranceIncident,
  InsuranceIncidentState,
  InsurancePolicy,
  CountryUnit,
  IntakeReceipt,
  IntakeReceiptPricing,
  IntakeReceiptStatus,
  MaterialPurchase,
  MaterialReceipt,
  MovementLeg,
  MovementLegState,
  MovementTrip,
  Opportunity,
  OpportunityCosting,
  PreclearancePack,
  ProductionPlanWeek,
  PurchaseAgreement,
  PurchaseOrder,
  PurchaseOrderLine,
  ReceivingLocationKind,
  ReceivingLocationPlan,
  RiskItem,
  Role,
  SeasonMonth,
  SeasonalPlanRow,
  SeasonalPurchasePlan,
  Shipment,
  ShipmentDocumentKey,
  ShipmentStatus,
  StockLot,
  StuffingNotifyFunction,
  StuffingRequest,
  TagSpecification,
  TransportRequest,
  VesselCall,
  WarehouseRequest,
  WarehouseRequestState,
} from "../domain/types";

export type Result<T = void> = { ok: true; value: T } | { ok: false; reason: string };

const okResult = <T>(value: T): Result<T> => ({ ok: true, value });
const failResult = (reason: string): Result<never> => ({ ok: false, reason });

/* ------------------------------------------------------------------ *
 * In-memory store, seeded once and mutated locally
 * ------------------------------------------------------------------ */

interface StoreShape {
  contracts: Contract[];
  executionPlans: ExecutionPlan[];
  cargoReadiness: CargoReadiness[];
  exportContracts: ExportContract[];
  preclearancePacks: PreclearancePack[];
  shipments: Shipment[];
  vesselCalls: VesselCall[];
  materialPurchases: MaterialPurchase[];
  materialReceipts: MaterialReceipt[];
  transportRequests: TransportRequest[];
  standaloneRisks: RiskItem[];
  /* --- workflow v2.0 additions --- */
  opportunities: Opportunity[];
  stockLots: StockLot[];
  productionPlan: ProductionPlanWeek[];
  warehouseRequests: WarehouseRequest[];
  advancePayments: AdvancePayment[];
  freightRates: FreightRate[];
  movementLegs: MovementLeg[];
  stuffingRequests: StuffingRequest[];
  customerFeedback: CustomerFeedback[];
  buyerClaims: BuyerClaim[];
  insurancePolicies: InsurancePolicy[];
  insuranceIncidents: InsuranceIncident[];
  /* --- phases 01-02 (v2.3): seasonal purchase plan and budget --- */
  seasonalPurchasePlans: SeasonalPurchasePlan[];
  budgets: Budget[];
  /* --- sourcing intake (MMP) --- */
  purchaseAgreements: PurchaseAgreement[];
  /* --- procurement (3 September 2026): the purchase order as a record --- */
  purchaseOrders: PurchaseOrder[];
  receivingLocationPlans: ReceivingLocationPlan[];
  intakeReceipts: IntakeReceipt[];
  funds: Fund[];
  agentBalances: AgentBalance[];
  agentBalanceMovements: AgentBalanceMovement[];
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

/** A counterparty id has to name a real master record; a blank select is the usual cause. */
function counterpartyExists(id: string): boolean {
  return Boolean(id) && Boolean(counterpartyById(id));
}

/**
 * The rules on a fund, shared by create and update.
 *
 * The instruction of 27 August 2026 removed the purchase order from the Create screen and
 * made the exchange rate a lookup rather than an entry, and both changes take checks away
 * rather than adding them: a fund needs no PO, and there is no rate to validate. What is
 * left is structural — a real agent and commodity, a required payment date, a positive
 * value — plus the two mode-conditional fields MMP itself documents.
 *
 * Nothing about a *late* payment is checked. The instruction states no rule for one, so
 * the delay is counted and shown and never refused.
 */
function checkFund(f: Partial<Fund>): string | undefined {
  if (!f.seasonality) return "Select the seasonality.";
  if (!counterpartyExists(f.agentId ?? "")) return "Select an agent.";
  if (!f.commodityId || !commodityById(f.commodityId)) {
    return "Select a commodity that is in the commodity master.";
  }
  if (!f.requiredPaymentDate) return "Enter the required payment date.";
  if (!f.valueLocal || f.valueLocal <= 0) return "The value in local currency must be above zero.";
  // An actual payment date *before* the required one is not refused: paying early is
  // fine, and the screen counts the days either way. Nothing states a rule for a late
  // payment either, so nothing is refused on that count.
  if (f.actualPaymentDate && !exchangeRateOn(f.localCurrency ?? "SDG", f.actualPaymentDate)) {
    return `No exchange rate is held for ${f.localCurrency ?? "SDG"} on ${f.actualPaymentDate}. The rate is read from the rate table on the actual payment date, so a date the table does not reach cannot produce a value in USD.`;
  }
  if (f.mode === "finance" && !f.bankName?.trim()) {
    return "A fund settled under Finance records the bank that provided it.";
  }
  if (f.mode === "barter" && !f.barterCommodityId) {
    return "A barter fund records the commodity being bartered.";
  }
  return undefined;
}

/**
 * The rules on a purchase agreement, shared by create and update.
 *
 * Two are new at this version and both come from the instruction of 27 August 2026: the
 * commodity must be one the named seasonal purchase plan carries, and the three per-bag
 * weights are required exactly when `Is Applicable` is set. The purchase order is checked
 * nowhere, because the Add screen no longer carries it and the Update screen does not
 * require it either.
 */
function checkPurchaseAgreement(a: Partial<PurchaseAgreement>): string | undefined {
  if (!a.seasonality) return "Select the seasonality.";
  if (!a.commodityId) return "Select the commodity.";
  if (!commodityById(a.commodityId)) return "That commodity is not in the commodity master.";
  if (a.seasonalPlanId) {
    const plan = store.seasonalPurchasePlans.find((p) => p.id === a.seasonalPlanId);
    if (!plan) return "The seasonal purchase plan named does not exist.";
    if (!planCarriesCommodity(plan, a.commodityId)) {
      const name = commodityById(a.commodityId)?.name ?? "That commodity";
      return `${name} is not on ${plan.planRef}. The commodity is chosen from the commodities the selected plan carries.`;
    }
  }
  if (!counterpartyExists(a.supplierId ?? "")) return "Select the supplier.";
  if (!a.purchaser?.trim()) return "Name the purchaser.";
  if (!a.flowStatus) return "Select the flow status.";
  if (!a.agreementDate) return "Enter the agreement date.";
  if (!a.totalQuantityMt || a.totalQuantityMt <= 0) {
    return "The agreed quantity must be above zero — receiving locations allocate against it.";
  }
  if (a.agreementType && a.agreementType !== "fixed" && a.agreementType !== "collection") {
    return "Agreement Type is either Fixed or Collection.";
  }
  /* The quality-inspection card, added 3 September 2026. Structural checks only: the
     instruction names the five fields and states no validation, no owner beyond "the
     trader or the Quality team", and no effect for any result — so a row may be saved
     with no quantity, no test date and no result, and a rejected result blocks nothing.
     What is refused is what the record cannot represent. */
  for (const qi of a.qualityInspections ?? []) {
    if (!qi.commodityTypeId) return "Every quality inspection names a commodity type.";
    if (!commodityById(qi.commodityTypeId)) {
      return "A quality inspection names a commodity type that is not in the commodity master.";
    }
    if (!qi.supplierLocation?.trim()) return "Every quality inspection names a supplier location.";
    if (qi.estimatedQuantity !== undefined && qi.estimatedQuantity < 0) {
      return "An estimated inspection quantity cannot be negative.";
    }
    if (qi.estimatedQuantityUnit !== "mt" && qi.estimatedQuantityUnit !== "bags") {
      return "An estimated inspection quantity is given either in MT or in bags.";
    }
    if (qi.result && !["approved", "rejected", "re_test"].includes(qi.result)) {
      return "A quality inspection result is Approved, Rejected or Re-Test.";
    }
  }
  if (a.bagWeightApplicable) {
    for (const [label, weight] of [
      ["big-pack", a.bpBagWeightLb],
      ["small-pack", a.spBagWeightLb],
      ["jute", a.juteBagWeightLb],
    ] as const) {
      if (!weight || weight <= 0) {
        return `The ${label} bag weight must be above zero. Per-bag weights are marked as applicable on this agreement, and every receipt booked against it derives its packaging tare from these three — so a zero silently zeroes the tare on all of them. Clear Is Applicable if no per-bag tare applies.`;
      }
    }
  }
  return undefined;
}

/**
 * The rules on a budget's lines, shared by create and update.
 *
 * Two of these come from the business instruction of 27 August 2026 and are therefore
 * *stated* rules rather than structural ones — the first the prototype has been given
 * about the budget at all:
 *   · a line's plan must be one of the seasonal purchase plans;
 *   · a line's commodity must be one **that plan carries**. The Commodity drop-down
 *     offers only those, and the service layer refuses anything else, so a stale
 *     selection cannot slip through when the plan is changed.
 *
 * `mode` decides how the active-plan rule applies. On **create** the instruction is
 * plain: only an active plan may be chosen. On **update** an already-saved line may name
 * a plan whose season has since closed — `bg-2` does — and refusing it would make an old
 * budget unsavable, so a closed plan is allowed where the budget already named it and
 * refused where it did not.
 *
 * Everything else §6.2 leaves open stays open: a line may carry no quantity, no amount
 * and no supplier, and the approval status may be blank.
 */
function checkBudgetLines(
  lines: BudgetLine[],
  mode: "create" | "update",
  alreadyNamedPlanIds: Set<string> = new Set(),
): string | undefined {
  for (const l of lines) {
    if (l.seasonalPlanId) {
      const plan = store.seasonalPurchasePlans.find((p) => p.id === l.seasonalPlanId);
      if (!plan) return "A budget line names a plan that does not exist.";
      const closed = !isPlanActive(plan);
      const grandfathered = mode === "update" && alreadyNamedPlanIds.has(plan.id);
      if (closed && !grandfathered) {
        return `${plan.planRef} is closed — its season ended ${formatSeasonMonth(plan.to)}. A budget may only be written against a plan whose season has not ended.`;
      }
      if (l.commodityId && !planCarriesCommodity(plan, l.commodityId)) {
        const name = commodityById(l.commodityId)?.name ?? "That commodity";
        return `${name} is not on ${plan.planRef}. A budget line may only name a commodity the selected plan carries.`;
      }
    }
    if (l.commodityId && !commodityById(l.commodityId)) {
      return "A budget line names a commodity that is not in the commodity master.";
    }
    if (l.supplierId && !counterpartyExists(l.supplierId)) {
      return "A budget line names a supplier that is not in the counterparty master.";
    }
    if ((l.quantityMt ?? 0) < 0) return "A budget quantity cannot be negative.";
    if ((l.amount?.amount ?? 0) < 0) return "A budget amount cannot be negative.";
  }
  return undefined;
}


/**
 * The rules on a purchase order, shared by its Add and Edit screens. See the mutators
 * for why each one exists.
 */
function checkPurchaseOrder(
  poNumber: string,
  lines: Omit<PurchaseOrderLine, "id">[],
  ignoreId?: string,
): string | undefined {
  const ref = poNumber?.trim();
  if (!ref) return "Enter the PO number. It is the order's reference and the list identifies a row by it.";
  if (store.purchaseOrders.some((o) => o.id !== ignoreId && o.poNumber.trim() === ref)) {
    return `Purchase order ${ref} already exists. The list identifies an order by its PO number, so two orders cannot share one.`;
  }
  if (lines.length === 0) {
    return "A purchase order records at least one purchase agreement — the Add screen selects one or several.";
  }
  const seen = new Set<string>();
  for (const l of lines) {
    if (!l.purchaseAgreementId) return "Every line names a purchase agreement.";
    if (!store.purchaseAgreements.some((a) => a.id === l.purchaseAgreementId)) {
      return "A line names a purchase agreement that does not exist.";
    }
    if (seen.has(l.purchaseAgreementId)) {
      const ag = store.purchaseAgreements.find((a) => a.id === l.purchaseAgreementId);
      return `${ag?.paRef ?? "That agreement"} is on this order twice. One agreement appears once on one order, so a payment against it is recorded in one place.`;
    }
    seen.add(l.purchaseAgreementId);
    if (l.paymentAmount && l.paymentAmount.amount < 0) {
      return "A payment amount cannot be negative.";
    }
  }
  return undefined;
}

/**
 * The structural rules on a seasonal purchase plan's rows, shared by create and update.
 *
 * Structural only. §6.1 states no validation and no blocking control, and the Plan sheet
 * of `Export Plan V1.xlsx` states none either, so nothing here refuses an incomplete plan:
 * a row may carry no commodity, no note and no quantity at all, and a month of the period
 * may be empty on every row — the sheet's own October column is.
 *
 * What is refused is what the record cannot represent: a quantity in a month the period
 * does not span, a negative quantity, and a commodity that is not in the master. Note that
 * `Capacity needed MT` is not checked at all, because it is no longer entered — it is
 * derived from the row by the sheet's own three-largest formula.
 */
function checkPlanRows(rows: SeasonalPlanRow[], months: SeasonMonth[]): string | undefined {
  const inPeriod = new Set(months.map(seasonMonthKey));
  for (const r of rows) {
    if (r.commodityId && !commodityById(r.commodityId)) {
      return "A plan row names a commodity that is not in the commodity master.";
    }
    const stray = r.cells.find((c) => !inPeriod.has(seasonMonthKey(c)));
    if (stray) {
      return `${formatSeasonMonth(stray)} is not one of the ${months.length} months the seasonal period spans, so no quantity can be planned against it.`;
    }
    const negative = r.cells.find((c) => (c.quantityMt ?? 0) < 0);
    if (negative) {
      return `The quantity for ${formatSeasonMonth(negative)} cannot be negative.`;
    }
  }
  return undefined;
}

function seed(): StoreShape {
  const shipments = clone(SHIPMENTS).map((s) => ({
    ...s,
    audit: clone(AUDIT_SEED[s.id] ?? []),
  }));
  return {
    contracts: clone(CONTRACTS),
    executionPlans: clone(EXECUTION_PLANS),
    cargoReadiness: clone(CARGO_READINESS),
    exportContracts: clone(EXPORT_CONTRACTS),
    preclearancePacks: clone(PRECLEARANCE_PACKS),
    shipments,
    vesselCalls: clone(VESSEL_CALLS),
    materialPurchases: clone(MATERIAL_PURCHASES),
    materialReceipts: clone(MATERIAL_RECEIPTS),
    transportRequests: clone(TRANSPORT_REQUESTS),
    standaloneRisks: clone(STANDALONE_RISKS),
    opportunities: clone(OPPORTUNITIES),
    stockLots: clone(STOCK_LOTS),
    productionPlan: clone(PRODUCTION_PLAN),
    warehouseRequests: clone(WAREHOUSE_REQUESTS),
    advancePayments: clone(ADVANCE_PAYMENTS),
    freightRates: clone(FREIGHT_RATES),
    movementLegs: clone(MOVEMENT_LEGS),
    stuffingRequests: clone(STUFFING_REQUESTS),
    customerFeedback: clone(CUSTOMER_FEEDBACK),
    buyerClaims: clone(BUYER_CLAIMS),
    insurancePolicies: clone(INSURANCE_POLICIES),
    insuranceIncidents: clone(INSURANCE_INCIDENTS),
    seasonalPurchasePlans: clone(SEASONAL_PURCHASE_PLANS),
    budgets: clone(BUDGETS),
    purchaseAgreements: clone(PURCHASE_AGREEMENTS),
    purchaseOrders: clone(PURCHASE_ORDERS),
    receivingLocationPlans: clone(RECEIVING_LOCATION_PLANS),
    intakeReceipts: clone(INTAKE_RECEIPTS),
    funds: clone(FUNDS),
    agentBalances: clone(AGENT_BALANCES),
    agentBalanceMovements: clone(AGENT_BALANCE_MOVEMENTS),
  };
}

let store: StoreShape = seed();

const listeners = new Set<() => void>();

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) fn();
}

/** Reset to the seeded demo data. Wired to the "Reset demo data" action in the shell. */
export function resetStore(): void {
  store = seed();
  notify();
}

/** Simulated latency so loading states are demonstrable. `0` for tests. */
let latencyMs = 220;
export function setLatency(ms: number): void {
  latencyMs = ms;
}

function delay<T>(value: T): Promise<T> {
  if (latencyMs <= 0) return Promise.resolve(value);
  return new Promise((resolve) => setTimeout(() => resolve(value), latencyMs));
}

/* ------------------------------------------------------------------ *
 * Audit helper
 * ------------------------------------------------------------------ */

let auditSeq = 1000;

function pushAudit(shipmentId: string, event: Omit<AuditEvent, "id" | "at"> & { at?: string }): void {
  const s = store.shipments.find((x) => x.id === shipmentId);
  if (!s) return;
  s.audit = [...s.audit, { id: `au-${++auditSeq}`, at: event.at ?? `${TODAY}T12:00:00Z`, ...event }];
}

/* ------------------------------------------------------------------ *
 * Readers
 * ------------------------------------------------------------------ */

export const api = {
  /* --- contracts --- */
  listContracts: () => delay(clone(store.contracts)),
  getContract: (id: string) => delay(clone(store.contracts.find((c) => c.id === id)) ?? undefined),

  /* --- execution plans & cargo --- */
  listExecutionPlans: () => delay(clone(store.executionPlans)),
  listCargoReadiness: () => delay(clone(store.cargoReadiness)),

  /* --- export contracts --- */
  listExportContracts: () => delay(clone(store.exportContracts)),
  getExportContract: (id: string) =>
    delay(clone(store.exportContracts.find((e) => e.id === id)) ?? undefined),
  listPreclearancePacks: () => delay(clone(store.preclearancePacks)),

  /* --- shipments --- */
  listShipments: () => delay(clone(store.shipments)),
  getShipment: (id: string) => delay(clone(store.shipments.find((s) => s.id === id)) ?? undefined),

  /* --- vessels --- */
  listVesselCalls: () => delay(clone(store.vesselCalls)),
  getVesselCall: (id: string) => delay(clone(store.vesselCalls.find((v) => v.id === id)) ?? undefined),

  /* --- material & transport --- */
  listMaterialPurchases: () => delay(clone(store.materialPurchases)),
  listMaterialReceipts: () => delay(clone(store.materialReceipts)),
  listTransportRequests: () => delay(clone(store.transportRequests)),
  getTransportRequest: (id: string) =>
    delay(clone(store.transportRequests.find((t) => t.id === id)) ?? undefined),

  /* --- workflow v2.0: origination (phases 01-02) --- */
  listOpportunities: () => delay(clone(store.opportunities)),
  getOpportunity: (id: string) => delay(clone(store.opportunities.find((o) => o.id === id)) ?? undefined),

  /* --- workflow v2.0: allocation & readiness (phase 06) --- */
  listStockLots: () => delay(clone(store.stockLots)),
  listProductionPlan: () => delay(clone(store.productionPlan)),
  listWarehouseRequests: () => delay(clone(store.warehouseRequests)),

  /* --- workflow v2.0: country prerequisites (phase 07) --- */
  listAdvancePayments: () => delay(clone(store.advancePayments)),
  getAdvancePayment: (id: string) =>
    delay(clone(store.advancePayments.find((a) => a.id === id)) ?? undefined),

  /* --- workflow v2.0: freight rate table (phase 08) --- */
  listFreightRates: () => delay(clone(store.freightRates)),

  /* --- workflow v2.0: movement & stuffing request (phase 10) --- */
  listMovementLegs: () => delay(clone(store.movementLegs)),
  getMovementLeg: (id: string) => delay(clone(store.movementLegs.find((m) => m.id === id)) ?? undefined),
  listStuffingRequests: () => delay(clone(store.stuffingRequests)),

  /* --- workflow v2.0: close-out (phase 16) --- */
  listCustomerFeedback: () => delay(clone(store.customerFeedback)),
  listBuyerClaims: () => delay(clone(store.buyerClaims)),
  listInsurancePolicies: () => delay(clone(store.insurancePolicies)),
  listInsuranceIncidents: () => delay(clone(store.insuranceIncidents)),

  /* --- workflow v2.3: seasonal purchase plan and budget (phases 01-02) --- */
  listSeasonalPurchasePlans: () => delay(clone(store.seasonalPurchasePlans)),
  getSeasonalPurchasePlan: (id: string) =>
    delay(clone(store.seasonalPurchasePlans.find((p) => p.id === id)) ?? undefined),
  listBudgets: () => delay(clone(store.budgets)),
  getBudget: (id: string) => delay(clone(store.budgets.find((b) => b.id === id)) ?? undefined),

  /* --- sourcing intake (MMP) --- */
  listPurchaseAgreements: () => delay(clone(store.purchaseAgreements)),
  getPurchaseAgreement: (id: string) =>
    delay(clone(store.purchaseAgreements.find((a) => a.id === id)) ?? undefined),
  listReceivingLocationPlans: () => delay(clone(store.receivingLocationPlans)),
  listIntakeReceipts: () => delay(clone(store.intakeReceipts)),

  /* --- procurement (3 September 2026) --- */
  listPurchaseOrders: () => delay(clone(store.purchaseOrders)),
  getPurchaseOrder: (id: string) =>
    delay(clone(store.purchaseOrders.find((o) => o.id === id)) ?? undefined),
  getIntakeReceipt: (id: string) => delay(clone(store.intakeReceipts.find((r) => r.id === id)) ?? undefined),
  listFunds: () => delay(clone(store.funds)),
  getFund: (id: string) => delay(clone(store.funds.find((f) => f.id === id)) ?? undefined),
  listAgentBalances: () => delay(clone(store.agentBalances)),
  listAgentBalanceMovements: () => delay(clone(store.agentBalanceMovements)),

  /* --- risks --- */
  listRisks: () => delay(clone([...store.shipments.flatMap((s) => s.risks), ...store.standaloneRisks])),

  /* ---------------------------------------------------------------- *
   * Mutators — every one is guarded
   * ---------------------------------------------------------------- */

  /**
   * Create a purchase contract (P2).
   *
   * The screen validates as you type, but the service validates again — a rule that only lives
   * in the form is a rule the next caller can skip, which is exactly how the legacy estate
   * ended up with 865 records missing a "required" buyer address. Rejections come back as a
   * reason string, not a thrown error, so the page can show it in its banner.
   */
  async createContract(
    draft: PurchaseContractDraft,
    opts: { opportunityId?: string } = {},
  ): Promise<Result<Contract>> {
    const errors = validatePurchaseContractDraft(draft);
    const first = Object.values(errors).find(Boolean);
    if (first) return delay(failResult(first));

    const totals = lotTotals(draft);
    if (totals.overCeiling)
      return delay(
        failResult(
          `Lot quantities total ${totals.totalQtyMt.toLocaleString()} MT, above the ceiling of ${totals.ceilingMt.toLocaleString()} MT.`,
        ),
      );

    const used = store.contracts
      .map((c) => Number(c.contractNo.replace(/[^0-9]/g, "")))
      .filter((n) => Number.isFinite(n));
    const nextNo = (used.length ? Math.max(...used) : 900) + 1;

    const created: Contract = {
      id: `ct-new-${nextNo}`,
      contractNo: `PC-${nextNo}`,
      // Never taken from the form: a new contract is new, and moves on by transition only.
      status: "new_pc",
      createdDate: TODAY,
      businessConfirmationDate: draft.businessConfirmationDate,
      buyerId: draft.buyerId,
      buyerAddress: draft.buyerAddress.trim(),
      buyerNickName: draft.buyerNickName.trim(),
      commodityId: draft.commodityId,
      commodityType: draft.commodityType || undefined,
      origin: draft.origin as Contract["origin"],
      traderName: draft.traderName,
      quantityMt: safeNumber(draft.quantityMt, 0),
      tolerancePct: safeNumber(draft.tolerancePct, 0),
      shipmentPeriodStart: draft.shipmentPeriodStart,
      shipmentPeriodEnd: draft.shipmentPeriodEnd,
      lots: lotsFromDraft(draft),
      incoterm: draft.incoterm as Contract["incoterm"],
      shipmentType: draft.shipmentType as Contract["shipmentType"],
      methodOfShipping: draft.methodOfShipping,
      packingType: draft.packingType as Contract["packingType"],
      packingSizeKg: safeNumber(draft.packingSizeKg, 0),
      cargoInstruction: draft.cargoInstruction.trim() || undefined,
      nominatedSurveyorId: draft.nominatedSurveyorId || undefined,
      freeDaysAtPort: safeNumber(draft.freeDaysAtPort, 0),
      sapNumber: draft.sapNumber.trim() || undefined,
      assignedDubaiExecution: draft.assignedDubaiExecution,
      portOfDischargeId: draft.portOfDischargeId,
      portOfLoadingId: draft.portOfLoadingId,
      consignee: draft.consignee.trim(),
      notifyParty: draft.notifyParty,
      documentRequirements: [...draft.documentRequirements],
      partialShipmentAllowed: draft.partialShipment === "allowed",
      fumigationType: draft.fumigationType as Contract["fumigationType"],
      artworkType: draft.artworkType === "buyer_option" ? "buyer_option" : "standard",
      artworkPrintedBags: draft.artworkPrintedBags,
      artworkTags: draft.artworkTags,
      artworkDesignFileName: draft.artworkDesignFileName.trim() || undefined,
      loadingContainerSize: draft.loadingContainerSize || undefined,
      paymentTerms: draft.paymentTerms.trim(),
      // P3 exists as a phase with no legacy screen: the four teams start out pending.
      reviewFeedback: [
        { role: "quality", outcome: "pending" },
        { role: "processing", outcome: "pending" },
        { role: "finance", outcome: "pending" },
        { role: "dubai_execution", outcome: "pending" },
      ],
      isLargeVolume: safeNumber(draft.quantityMt, 0) >= 5000,
      note: draft.note.trim() || undefined,
    };

    /**
     * v2.0 §6.3 trigger — "the deal agreement is received by Dubai Execution". Where the
     * contract was raised from an agreed deal, the two records are linked in both
     * directions so the locked costing snapshot can later be compared with what the
     * shipment actually cost (§6.2 activity 3). A contract entered directly carries no
     * link, which is what every legacy record is.
     */
    if (opts.opportunityId) {
      const opportunity = store.opportunities.find((o) => o.id === opts.opportunityId);
      if (!opportunity) return delay(failResult("The originating opportunity was not found."));
      if (!opportunity.dealAgreedOn) {
        return delay(
          failResult(
            "The deal on that opportunity has not been agreed, so a contract cannot be raised from it (v2.0 §6.2 then §6.3).",
          ),
        );
      }
      if (opportunity.contractId) {
        return delay(failResult(`A contract has already been raised from ${opportunity.opportunityNo}.`));
      }
      created.opportunityId = opportunity.id;
      if (opportunity.costing) {
        created.costingSnapshot = {
          estimatedCostPerMt: opportunity.costing.rawMaterialPricePerMt,
          salesPricePerMt: opportunity.costing.salesPricePerMt,
          marginPct: 0,
          position: opportunity.costing.position,
          expectedRawPricePerMt: opportunity.costing.expectedRawPricePerMt,
          takenOn: opportunity.costing.takenOn,
        };
      }
      opportunity.contractId = created.id;
    }

    store.contracts = [created, ...store.contracts];
    notify();
    return delay(okResult(clone(created)));
  },

  async setContractStatus(id: string, to: ContractStatus): Promise<Result<Contract>> {
    const c = store.contracts.find((x) => x.id === id);
    if (!c) return delay(failResult("Contract not found."));
    const check = canTransition(CONTRACT_TRANSITIONS, c.status, to);
    if (!check.allowed) return delay(failResult(check.reason));
    c.status = to;
    notify();
    return delay(okResult(clone(c)));
  },

  async setShipmentStatus(id: string, to: ShipmentStatus): Promise<Result<Shipment>> {
    const s = store.shipments.find((x) => x.id === id);
    if (!s) return delay(failResult("Shipment not found."));
    const check = canTransition(SHIPMENT_TRANSITIONS, s.status, to);
    if (!check.allowed) return delay(failResult(check.reason));

    // Rule R20 — clearance must be complete before a shipment may become `cleared`.
    if (to === "cleared") {
      const guard = guardClearanceCompletion(s.clearance.activities);
      if (!guard.allowed) return delay(failResult(guard.reason));
    }
    // Rule R21 — the post-shipment checklist must be complete before close-out.
    if (to === "closed") {
      const guard = guardPostShipmentCompletion(s.postShipment.checklist);
      if (!guard.allowed) return delay(failResult(guard.reason));
    }

    const from = s.status;
    s.status = to;
    pushAudit(id, {
      actor: "Amara Osei",
      actorRole: "partner_execution",
      action: "Status changed",
      entity: `Shipment ${s.shipmentNo}`,
      field: "status",
      from,
      to,
    });
    notify();
    return delay(okResult(clone(s)));
  },

  async setCargoStatus(
    readinessId: string,
    to: CargoStatus,
    qtyReadyMt?: number,
  ): Promise<Result<CargoReadiness>> {
    const cr = store.cargoReadiness.find((x) => x.id === readinessId);
    if (!cr) return delay(failResult("Cargo readiness record not found."));
    const check = canTransition(CARGO_TRANSITIONS, cr.cargoStatus, to);
    if (!check.allowed) return delay(failResult(check.reason));
    cr.cargoStatus = to;
    cr.statusDate = TODAY;
    if (qtyReadyMt !== undefined) cr.qtyReadyMt = qtyReadyMt;
    notify();
    return delay(okResult(clone(cr)));
  },

  async setDocumentState(
    shipmentId: string,
    key: ShipmentDocumentKey,
    to: DocumentState,
    opts: { reference?: string; attachmentName?: string; actor?: string; actorRole?: Role } = {},
  ): Promise<Result<Shipment>> {
    const s = store.shipments.find((x) => x.id === shipmentId);
    if (!s) return delay(failResult("Shipment not found."));
    const doc = s.documents.find((d) => d.key === key);
    if (!doc) return delay(failResult("Document not found on this shipment."));
    const check = canTransition(DOCUMENT_TRANSITIONS, doc.state, to);
    if (!check.allowed) return delay(failResult(check.reason));

    const from = doc.state;
    doc.state = to;
    if (opts.reference) doc.reference = opts.reference;
    if (opts.attachmentName) doc.attachmentName = opts.attachmentName;
    if (to === "draft_received") doc.draftReceivedOn = TODAY;
    if (to === "confirmed") doc.confirmedOn = TODAY;
    if (to === "original_received") doc.originalReceivedOn = TODAY;

    pushAudit(shipmentId, {
      actor: opts.actor ?? "Amara Osei",
      actorRole: opts.actorRole ?? "partner_execution",
      action: "Document state changed",
      entity: key,
      field: "state",
      from,
      to,
    });
    notify();
    return delay(okResult(clone(s)));
  },

  async addDocumentComment(
    shipmentId: string,
    key: ShipmentDocumentKey,
    text: string,
    by: string,
  ): Promise<Result<Shipment>> {
    const s = store.shipments.find((x) => x.id === shipmentId);
    if (!s) return delay(failResult("Shipment not found."));
    const doc = s.documents.find((d) => d.key === key);
    if (!doc) return delay(failResult("Document not found on this shipment."));
    if (!text.trim()) return delay(failResult("A comment cannot be empty."));
    doc.comments = [...doc.comments, { by, on: TODAY, text: text.trim() }];
    notify();
    return delay(okResult(clone(s)));
  },

  async setRegulatoryActivity(
    shipmentId: string,
    key: string,
    patch: { applicable?: boolean; completedDate?: string; reference?: string },
  ): Promise<Result<Shipment>> {
    const s = store.shipments.find((x) => x.id === shipmentId);
    if (!s) return delay(failResult("Shipment not found."));
    const a = s.clearance.activities.find((x) => x.key === key);
    if (!a) return delay(failResult("Regulatory activity not found."));
    Object.assign(a, patch);
    pushAudit(shipmentId, {
      actor: "Kwame Boateng",
      actorRole: "logistics",
      action: patch.completedDate ? "Regulatory activity recorded" : "Regulatory activity updated",
      entity: key,
      to: patch.completedDate ?? (patch.applicable === false ? "not applicable" : undefined),
    });
    notify();
    return delay(okResult(clone(s)));
  },

  async toggleChecklistItem(shipmentId: string, key: string): Promise<Result<Shipment>> {
    const s = store.shipments.find((x) => x.id === shipmentId);
    if (!s) return delay(failResult("Shipment not found."));
    const item = s.postShipment.checklist.find((c) => c.key === key);
    if (!item) return delay(failResult("Checklist item not found."));
    item.done = !item.done;
    notify();
    return delay(okResult(clone(s)));
  },

  async acknowledgeRisk(riskId: string): Promise<Result<void>> {
    for (const s of store.shipments) {
      const r = s.risks.find((x) => x.id === riskId);
      if (r) {
        r.acknowledged = true;
        notify();
        return delay(okResult(undefined));
      }
    }
    const sr = store.standaloneRisks.find((x) => x.id === riskId);
    if (sr) {
      sr.acknowledged = true;
      notify();
      return delay(okResult(undefined));
    }
    return delay(failResult("Risk not found."));
  },

  async createShipment(draft: {
    contractId: string;
    executionPlanId: string;
    quantityMt: number;
    shipmentType: Shipment["shipmentType"];
    containerCount?: number;
    containerType?: string;
    commodityReadinessDate?: string;
    lastShippingDate?: string;
  }): Promise<Result<Shipment>> {
    const contract = store.contracts.find((c) => c.id === draft.contractId);
    const plan = store.executionPlans.find((p) => p.id === draft.executionPlanId);
    if (!contract) return delay(failResult("Select a contract."));
    if (!plan) return delay(failResult("Select an execution plan."));
    if (!(draft.quantityMt > 0)) return delay(failResult("Quantity must be greater than zero."));

    const existing = store.shipments.filter((s) => s.contractId === draft.contractId);
    const shippedMt = existing.reduce((acc, s) => acc + s.quantityMt, 0);
    const balance = quantityBalance(contract, { shippedMt });
    if (shippedMt + draft.quantityMt > balance.maxAllowedMt) {
      return delay(
        failResult(
          `Quantity would take the contract total to ${(shippedMt + draft.quantityMt).toLocaleString()} MT, above the ceiling of ${balance.maxAllowedMt.toLocaleString()} MT (${contract.quantityMt.toLocaleString()} MT + ${contract.tolerancePct}% tolerance).`,
        ),
      );
    }

    const seq = existing.length + 1;
    const template = store.shipments.find((s) => s.contractId === draft.contractId) ?? store.shipments[0];
    const created: Shipment = {
      ...clone(template),
      id: `sh-new-${Date.now()}`,
      shipmentNo: `${contract.contractNo}.${seq}`,
      contractId: draft.contractId,
      executionPlanId: draft.executionPlanId,
      exportContractId: undefined,
      status: "draft",
      createdDate: TODAY,
      shipmentType: draft.shipmentType,
      country: contract.origin,
      quantityMt: draft.quantityMt,
      containerCount: draft.containerCount,
      containerType: draft.containerType,
      commodityReadinessDate: draft.commodityReadinessDate,
      lastShippingDate: draft.lastShippingDate,
      allocatedExportForms: [],
      freightOffers: [],
      booking: {},
      clearance: {
        status: "started",
        activities: clone(template.clearance.activities).map((a) => ({ ...a, completedDate: undefined })),
        exFormUsage: [],
      },
      stuffing: { containerReceived: false, days: [], containers: [], surveyorReportDates: [] },
      vesselCallId: undefined,
      documents: clone(template.documents).map((d) => ({
        ...d,
        state: d.required ? "not_issued" : "not_required",
        draftReceivedOn: undefined,
        confirmedOn: undefined,
        originalReceivedOn: undefined,
        reference: undefined,
        attachmentName: undefined,
        comments: [],
      })),
      packingList: {},
      charges: clone(template.charges).map((c) => ({
        ...c,
        status: "not_applicable",
        amount: undefined,
        invoiceReceivedDate: undefined,
        paymentDate: undefined,
      })),
      postShipment: {
        checklist: clone(template.postShipment.checklist).map((c) => ({
          ...c,
          done: false,
          attachmentName: undefined,
        })),
        sentToTradeFinance: false,
      },
      bankSubmittal: { status: "assembling", telexRelease: false },
      salesOrder: { pcCompletion: "open" },
      milestones: [
        { key: "deal_agreed", state: "completed", actualDate: contract.businessConfirmationDate },
        { key: "compliance_cleared", state: "completed", actualDate: contract.businessConfirmationDate },
        { key: "contract_issued", state: "completed", actualDate: contract.createdDate },
        {
          key: "execution_plan_created",
          state: "completed",
          actualDate: plan.createdDate,
          ownerName: plan.assignedTo,
        },
      ],
      risks: [],
      audit: [
        {
          id: `au-${++auditSeq}`,
          at: `${TODAY}T12:00:00Z`,
          actor: "Amara Osei",
          actorRole: "partner_execution",
          action: "Created",
          entity: `Shipment ${contract.contractNo}.${seq}`,
          note: "Created in the mock-up.",
        },
      ],
      assignedTo: plan.assignedTo,
      blocked: undefined,
    };
    store.shipments = [created, ...store.shipments];
    notify();
    return delay(okResult(clone(created)));
  },

  async updateShipment(
    id: string,
    patch: Partial<
      Pick<
        Shipment,
        | "quantityMt"
        | "containerCount"
        | "containerType"
        | "commodityReadinessDate"
        | "lastShippingDate"
        | "assignedTo"
        | "bagsOrBales"
        | "bagSizeKg"
      >
    >,
  ): Promise<Result<Shipment>> {
    const s = store.shipments.find((x) => x.id === id);
    if (!s) return delay(failResult("Shipment not found."));
    if (patch.quantityMt !== undefined && !(patch.quantityMt > 0)) {
      return delay(failResult("Quantity must be greater than zero."));
    }
    if (
      patch.commodityReadinessDate &&
      patch.lastShippingDate &&
      patch.commodityReadinessDate > patch.lastShippingDate
    ) {
      return delay(failResult("Cargo readiness date cannot fall after the last shipping date."));
    }
    Object.assign(s, patch);
    pushAudit(id, {
      actor: "Amara Osei",
      actorRole: "partner_execution",
      action: "Shipment updated",
      entity: `Shipment ${s.shipmentNo}`,
      note: Object.keys(patch).join(", "),
    });
    notify();
    return delay(okResult(clone(s)));
  },

  /* ================================================================ *
   * WORKFLOW v2.0 MUTATORS
   *
   * Same pattern throughout: find, guard, mutate, notify, return a cloned
   * result. A guard exists only where a source states a rule; where v2.0 records
   * a control as [OPEN] the mutator proceeds and the page shows the advisory.
   * ================================================================ */

  /* ---- Phase 16: the export contract request ---- */

  /**
   * Raises the *request* for an export contract against an execution plan.
   *
   * Added 6 September 2026: *"review all needed fields to be able to produce a new
   * Add/Create form for EX contract or pre-clearance."* The review found the same shape as
   * the execution plan a day earlier — the pre-clearance list has rendered export contracts
   * since v1.0 and had no way to raise one.
   *
   * WHAT A REQUEST HOLDS, and what it does not. `ExportContract` carries two stages in one
   * record: the request (request number, plan, quantity, exporting entity, unit price) and
   * the issuance (contract number, dates, actual exporter, bank, quantity, the MoT dates,
   * the scan). Only the first is captured here. The issuance fields are what the ministry
   * returns, so a create screen that asked for them would be asking the user to invent the
   * answer — the same reason a new contract is always New PC and a new plan always Draft.
   * `exportForms` and `consumption` start empty for the same reason: a form is issued
   * against a contract that exists.
   *
   * COUNTRY. The export contract does not apply everywhere — `usesExportContract` is false
   * for Tanzania and Mozambique, which start from a commercial invoice — so a request
   * against a contract from such an origin is refused and says which country and why,
   * rather than creating a record the country's process has no place for.
   */
  async requestExportContract(draft: {
    executionPlanId: string;
    requestedQuantityMt: number;
    exportingEntity: ExportContract["exportingEntity"];
    unitPrice?: Money;
    notes?: string;
  }): Promise<Result<ExportContract>> {
    const plan = store.executionPlans.find((p) => p.id === draft.executionPlanId);
    if (!plan) return delay(failResult("Select the execution plan this request is raised against."));
    const contract = store.contracts.find((c) => c.id === plan.contractId);
    if (!contract) return delay(failResult("That plan's contract is not in the demonstration data."));

    const profile = COUNTRY_PROFILES[contract.origin];
    if (profile && !profile.usesExportContract) {
      return delay(
        failResult(
          `${profile.name} does not use an export contract${
            profile.startsFromCommercialInvoice ? " — its customs process starts from a commercial invoice" : ""
          }, so no request is raised there. The step is marked Not applicable rather than left pending.`,
        ),
      );
    }
    if (!(draft.requestedQuantityMt > 0))
      return delay(failResult("The requested quantity must be greater than zero."));

    /* `<planning no>-R<n>` — the sequence belongs to the plan, which is the format every
       captured request uses (PC-2041.1-R1). A second request against one plan is allowed:
       no source forbids it, and a rejected request being re-raised is the obvious case. */
    const onPlan = store.exportContracts.filter((e) => e.executionPlanId === plan.id);
    const used = onPlan
      .map((e) => Number(e.requestNo.split("-R").pop()))
      .filter((n) => Number.isFinite(n));
    const next = (used.length ? Math.max(...used) : 0) + 1;

    const created: ExportContract = {
      id: `ec-new-${plan.id}-${next}`,
      requestNo: `${plan.planningNo}-R${next}`,
      executionPlanId: plan.id,
      contractId: contract.id,
      // Never taken from the form: a request is requested, and moves on by transition.
      status: "requested",
      requestedOn: TODAY,
      requestedQuantityMt: draft.requestedQuantityMt,
      exportingEntity: draft.exportingEntity,
      unitPrice: draft.unitPrice,
      exportForms: [],
      consumption: [],
      /* Read from the contract, as the execution plan's is: large volume describes one
         export contract consumed across several shipments, which is exactly this record. */
      isLargeVolume: contract.isLargeVolume,
      notes: draft.notes?.trim() || undefined,
    };
    store.exportContracts.push(created);
    notify();
    return delay(okResult(clone(created)));
  },

  /* ---- Phase 13: the execution plan ---- */

  /**
   * Creates an execution planning lot against a contract.
   *
   * Added 6 September 2026: *"add new button in the header of execution planning to create
   * new execution plan."* The planning tab has shown plans since v1.0 and had no way to make
   * one, so a contract raised in the mock-up reached the tab and stopped there — which is
   * what the screenshot of PC-2059 shows.
   *
   * WHAT IS ISSUED, NOT ASKED FOR. The planning number is `<contract no>.<n>`, continuing the
   * contract's own sequence — rule R1, and the format every captured plan uses. The status is
   * always `draft`: a plan moves on by transition, never by being created in a later state,
   * which is the same rule `createContract` applies to New PC.
   *
   * WHAT IS NOT ENFORCED, and deliberately. Nothing checks the planned quantity against the
   * contract's, because no source states that rule: R1 says a contract may carry several
   * planning lots and stops there. The screen shows what is already planned and what remains,
   * and warns when a plan would take the total past the contract quantity, but the warning is
   * advisory in the same way the Phase 11 review is (decision D-10). Recorded as open.
   */
  async createExecutionPlan(draft: {
    contractId: string;
    plannedQuantityMt: number;
    portOfLoadingId: string;
    shipperName: string;
    shipperAddress?: string;
    shipperOnBehalfOf?: string;
    bank: string;
    bankBranch?: string;
    seasonality: string;
    cargoSource: "CIM" | "JV";
    exportContractPaymentTerms: string;
    urgency: "low" | "medium" | "high";
    assignedTo: string;
    rawQuantityMt?: number;
    finishedQuantityMt?: number;
    needProcessingMt?: number;
    receivingAtFacilityDate?: string;
    toBeShippedBefore?: string;
    note?: string;
  }): Promise<Result<ExecutionPlan>> {
    const contract = store.contracts.find((c) => c.id === draft.contractId);
    if (!contract) return delay(failResult("That contract is not in the demonstration data."));
    if (contract.status === "cancelled")
      return delay(failResult("The contract is cancelled, so no further planning lot can be raised on it."));
    if (!(draft.plannedQuantityMt > 0))
      return delay(failResult("The planned quantity must be greater than zero."));
    if (!PORTS.find((p) => p.id === draft.portOfLoadingId))
      return delay(failResult("That port of loading is not in the port master."));
    for (const [value, label] of [
      [draft.shipperName, "shipper"],
      [draft.bank, "bank"],
      [draft.seasonality, "seasonality"],
      [draft.exportContractPaymentTerms, "export contract payment terms"],
      [draft.assignedTo, "assigned-to name"],
    ] as const) {
      if (!value.trim()) return delay(failResult(`The ${label} is required on an execution plan.`));
    }

    /* `<contract no>.<n>` — the sequence belongs to the contract, so it is read from the plans
       already on it rather than from a global counter. */
    const onContract = store.executionPlans.filter((p) => p.contractId === contract.id);
    const used = onContract
      .map((p) => Number(p.planningNo.split(".").pop()))
      .filter((n) => Number.isFinite(n));
    const next = (used.length ? Math.max(...used) : 0) + 1;

    const created: ExecutionPlan = {
      id: `ep-new-${contract.id}-${next}`,
      planningNo: `${contract.contractNo}.${next}`,
      contractId: contract.id,
      // Never taken from the form: a new plan is a draft and moves on by transition.
      status: "draft",
      createdDate: TODAY,
      plannedQuantityMt: draft.plannedQuantityMt,
      portOfLoadingId: draft.portOfLoadingId,
      shipperName: draft.shipperName.trim(),
      shipperAddress: draft.shipperAddress?.trim() ?? "",
      shipperOnBehalfOf: draft.shipperOnBehalfOf?.trim() ?? "",
      bank: draft.bank.trim(),
      bankBranch: draft.bankBranch?.trim() || undefined,
      seasonality: draft.seasonality.trim(),
      cargoSource: draft.cargoSource,
      exportContractPaymentTerms: draft.exportContractPaymentTerms.trim(),
      urgency: draft.urgency,
      assignedTo: draft.assignedTo.trim(),
      rawQuantityMt: draft.rawQuantityMt,
      finishedQuantityMt: draft.finishedQuantityMt,
      needProcessingMt: draft.needProcessingMt,
      receivingAtFacilityDate: draft.receivingAtFacilityDate || undefined,
      toBeShippedBefore: draft.toBeShippedBefore || undefined,
      /* Read from the contract, never asked for: large volume is a property of the contract —
         one export contract consumed across several shipments — not of a planning lot. */
      isLargeVolume: contract.isLargeVolume,
      note: draft.note?.trim() || undefined,
    };
    store.executionPlans.push(created);
    notify();
    return delay(okResult(clone(created)));
  },

  /* ---- Phase 01: the opportunity itself ---- */

  /**
   * v2.0 §6.1 activity 1 — a trader identifies a potential selling opportunity.
   *
   * Added 6 September 2026: *"Add save function in the Add Opportunity screen."* Until now
   * the screen validated and previewed and wrote nothing, and said so on itself, because
   * this operation did not exist. It is the first record in the chain, so nothing upstream
   * constrains it and the guards below are only the field rules the screen already applies,
   * re-checked here — the service layer is the third check by design (see `createContract`).
   *
   * What is deliberately NOT set. There is no costing, because §6.1 activity 6 makes the
   * estimate a separate step against a saved opportunity; no deal, because §6.2 is a
   * separate gate that needs a locked snapshot; and no status, because neither source
   * defines a status model for an opportunity — the list derives its stage from which
   * artefacts exist. So a saved opportunity is *identified* and nothing more, which is
   * exactly what Phase 01 produces.
   */
  async createOpportunity(draft: {
    traderName: string;
    commodityId: string;
    origin: CountryUnit;
    indicativeQuantityMt: number;
    buyerId?: string;
    note?: string;
  }): Promise<Result<Opportunity>> {
    const trader = draft.traderName.trim();
    if (!trader)
      return delay(
        failResult(
          "This opportunity records no trader. The trader is read from the signed-in session rather than entered, so a session with no display name cannot raise one.",
        ),
      );
    if (!commodityById(draft.commodityId))
      return delay(failResult("That commodity is not in the commodity master."));
    if (!draft.origin || !COUNTRY_PROFILES[draft.origin])
      return delay(failResult("That origin country is not one the module operates in."));
    if (!(draft.indicativeQuantityMt > 0))
      return delay(failResult("The indicative quantity must be greater than zero."));
    /* The buyer is optional at Phase 01 — the trader may be looking for an offer before a
       buyer is named — but a named one has to be a real one. */
    if (draft.buyerId) {
      const b = counterpartyById(draft.buyerId);
      if (!b || b.type !== "buyer")
        return delay(failResult("That buyer is not in the counterparty master."));
    }

    /* OPP-<year>-<3 digits>, continuing the sequence within the year rather than across all
       of them, which is what the seeded references do (OPP-2026-014). */
    const year = TODAY.slice(0, 4);
    const used = store.opportunities
      .filter((o) => o.opportunityNo.startsWith(`OPP-${year}-`))
      .map((o) => Number(o.opportunityNo.split("-")[2]))
      .filter((n) => Number.isFinite(n));
    const next = (used.length ? Math.max(...used) : 0) + 1;
    const opportunityNo = `OPP-${year}-${String(next).padStart(3, "0")}`;

    const created: Opportunity = {
      id: `op-new-${year}-${next}`,
      opportunityNo,
      createdDate: TODAY,
      traderName: trader,
      commodityId: draft.commodityId,
      origin: draft.origin,
      indicativeQuantityMt: draft.indicativeQuantityMt,
      buyerId: draft.buyerId || undefined,
      note: draft.note?.trim() || undefined,
    };
    store.opportunities.push(created);
    notify();
    return delay(okResult(clone(created)));
  },

  /* ---- Phase 01: the costing snapshot ---- */

  /**
   * v2.0 §6.1 activity 6 — the costing exercise is retained as a snapshot against the
   * opportunity, to be carried into the deal agreement.
   */
  async setOpportunityCosting(id: string, costing: OpportunityCosting): Promise<Result<Opportunity>> {
    const o = store.opportunities.find((x) => x.id === id);
    if (!o) return delay(failResult("Opportunity not found."));
    if (o.contractId) return delay(failResult("A contract has already been raised from this deal."));
    if (o.costing?.locked) {
      return delay(
        failResult(
          "The snapshot was locked when the deal was agreed, so that the basis on which the deal was priced can be compared with what the shipment actually cost (v2.0 §6.2).",
        ),
      );
    }
    if (costing.position === "short" && !costing.expectedRawPricePerMt) {
      return delay(
        failResult("A short position requires the expected raw purchase price (v2.0 §6.1 control 2)."),
      );
    }
    o.costing = clone(costing);
    notify();
    return delay(okResult(clone(o)));
  },

  /**
   * v2.0 §6.2 — the deal is agreed and the snapshot is locked. The gate is the one
   * control both the workshop and the export review reach independently.
   */
  async agreeDeal(id: string, terms: DealTerms): Promise<Result<Opportunity>> {
    const o = store.opportunities.find((x) => x.id === id);
    if (!o) return delay(failResult("Opportunity not found."));
    if (o.dealAgreedOn) return delay(failResult("This deal has already been agreed."));
    const gate = guardDealAgreement(o.costing);
    if (!gate.allowed) return delay(failResult(gate.reason));
    o.deal = clone(terms);
    o.dealAgreedOn = TODAY;
    o.dealChannel = "E-mail (assumption — no channel is stated in either source)";
    if (o.costing) {
      o.costing.locked = true;
      o.costing.lockedOn = TODAY;
    }
    notify();
    return delay(okResult(clone(o)));
  },

  /** Records that a purchase contract has been raised from the deal (v2.0 §6.3 trigger). */
  async linkOpportunityToContract(id: string, contractId: string): Promise<Result<Opportunity>> {
    const o = store.opportunities.find((x) => x.id === id);
    if (!o) return delay(failResult("Opportunity not found."));
    if (!o.dealAgreedOn) return delay(failResult("The deal has not been agreed yet."));
    o.contractId = contractId;
    notify();
    return delay(okResult(clone(o)));
  },

  /* ---- Phase 04: the four cross-functional confirmations ---- */

  /**
   * v2.0 §6.4 activities 2-3 — each team reviews the contract terms, confirms it has
   * the set-up in place to fulfil them, and captures its feedback in COTS.
   * Whether the feedback gates execution is decision D-10, so nothing is blocked here.
   */
  async recordReviewFeedback(
    contractId: string,
    role: Role,
    outcome: "pending" | "confirmed" | "concern",
    opts: { respondedBy?: string; comment?: string } = {},
  ): Promise<Result<Contract>> {
    const c = store.contracts.find((x) => x.id === contractId);
    if (!c) return delay(failResult("Contract not found."));
    const row = c.reviewFeedback.find((f) => f.role === role);
    if (!row) {
      return delay(
        failResult(
          `${role} is not one of the four functions the contract review notifies (Quality, Execution, Processing, FP&A).`,
        ),
      );
    }
    if (outcome === "concern" && !opts.comment?.trim()) {
      return delay(failResult("A concern must say what it is, or the review records nothing usable."));
    }
    row.outcome = outcome;
    row.respondedBy = opts.respondedBy;
    row.respondedOn = outcome === "pending" ? undefined : TODAY;
    row.comment = opts.comment;
    notify();
    return delay(okResult(clone(c)));
  },

  /* ---- Phase 05: quality terms and the tags specification ---- */

  /** v2.0 §6.5 activities 1-2 — the contract's quality terms, master defaults overridden per buyer. */
  async setContractQualityTerms(
    contractId: string,
    terms: ContractQualityParameter[],
  ): Promise<Result<Contract>> {
    const c = store.contracts.find((x) => x.id === contractId);
    if (!c) return delay(failResult("Contract not found."));
    c.qualityTerms = clone(terms);
    notify();
    return delay(okResult(clone(c)));
  },

  /** v2.0 §6.5 activities 3-4 — the separate tags / artwork specification flow. */
  async setTagSpecification(contractId: string, next: TagSpecification): Promise<Result<Contract>> {
    const c = store.contracts.find((x) => x.id === contractId);
    if (!c) return delay(failResult("Contract not found."));
    const current = c.tagSpecification?.state ?? "not_started";
    if (current !== next.state) {
      const check = canTransition(TAG_SPECIFICATION_TRANSITIONS, current, next.state);
      if (!check.allowed) return delay(failResult(check.reason));
    }
    if (next.option === "buyer" && next.state !== "not_started" && next.customTags.length === 0) {
      return delay(
        failResult(
          "A buyer option must list the custom tag options the buyer requires (v2.0 §6.5 activity 3).",
        ),
      );
    }
    c.tagSpecification = clone(next);
    notify();
    return delay(okResult(clone(c)));
  },

  /* ---- Phase 06: allocation, readiness, production plan, warehouse capacity ---- */

  /**
   * v2.0 §6.6 activity 2 — finished-goods stock is reserved for the purchase contract.
   * The blocking control is §6.6's own rule: raw material cannot be allocated until
   * processing is complete.
   */
  async allocateStockLot(lotId: string, contractId: string): Promise<Result<StockLot>> {
    const lot = store.stockLots.find((l) => l.id === lotId);
    if (!lot) return delay(failResult("Stock lot not found."));
    const contract = store.contracts.find((c) => c.id === contractId);
    if (!contract) return delay(failResult("Contract not found."));
    const gate = guardStockAllocation(lot);
    if (!gate.allowed) return delay(failResult(gate.reason));
    if (contract.commodityId !== lot.commodityId) {
      return delay(
        failResult(
          `This lot is ${lot.commodityId} and the contract is for ${contract.commodityId}. The quality grade of the produced commodity is the reference used in allocation (v2.0 §6.6 activity 4).`,
        ),
      );
    }
    lot.state = "reserved";
    lot.allocatedContractId = contractId;
    lot.allocatedOn = TODAY;
    notify();
    return delay(okResult(clone(lot)));
  },

  /** Releases a reservation back to ready-as-finished-good. */
  async releaseStockLot(lotId: string): Promise<Result<StockLot>> {
    const lot = store.stockLots.find((l) => l.id === lotId);
    if (!lot) return delay(failResult("Stock lot not found."));
    if (lot.state !== "reserved") return delay(failResult("Only a reserved lot can be released."));
    lot.state = "ready_finished";
    lot.allocatedContractId = undefined;
    lot.allocatedOn = undefined;
    notify();
    return delay(okResult(clone(lot)));
  },

  /** v2.0 §6.6 activity 2 and 3 — the processing team's readiness feedback on a raw lot. */
  async confirmLotProcessed(lotId: string, by: string): Promise<Result<StockLot>> {
    const lot = store.stockLots.find((l) => l.id === lotId);
    if (!lot) return delay(failResult("Stock lot not found."));
    if (lot.state !== "under_process") {
      return delay(failResult("Only a lot that is under process can be confirmed as a finished good."));
    }
    lot.state = "ready_finished";
    lot.productionDate = TODAY;
    lot.qualityReleaseRef =
      lot.qualityReleaseRef ?? `QR-26-${String(store.stockLots.length + 800).padStart(4, "0")}`;
    lot.note = `Confirmed ready as a finished good by ${by}.`;
    notify();
    return delay(okResult(clone(lot)));
  },

  /**
   * v2.0 §6.6 activity 6 — cargo readiness allocation is confirmed. [PROPOSED]: the
   * workshop names an enhanced process without describing it, so this records the
   * confirmation and nothing more.
   */
  async confirmCargoReadiness(
    readinessId: string,
    by: string,
    kind: "processing" | "readiness",
  ): Promise<Result<CargoReadiness>> {
    const r = store.cargoReadiness.find((x) => x.id === readinessId);
    if (!r) return delay(failResult("Cargo readiness record not found."));
    if (kind === "processing") {
      r.processingConfirmedOn = TODAY;
      r.processingConfirmedBy = by;
    } else {
      if (!r.processingConfirmedOn) {
        return delay(
          failResult(
            "The processing team confirms the stock is ready as a finished good before cargo readiness is confirmed (v2.0 §6.6 activity 2 then 6).",
          ),
        );
      }
      r.readinessConfirmedOn = TODAY;
      r.readinessConfirmedBy = by;
    }
    notify();
    return delay(okResult(clone(r)));
  },

  /** Issues a weekly production plan. Only the received quantity may back it (register C-24). */
  async issueProductionPlanWeek(id: string): Promise<Result<ProductionPlanWeek>> {
    const w = store.productionPlan.find((x) => x.id === id);
    if (!w) return delay(failResult("Production plan week not found."));
    if (w.status === "issued") return delay(failResult("This week has already been issued."));
    if (w.receivedRawMt <= 0) {
      return delay(
        failResult(
          "The weekly production plan is built on raw materials actually received at facilities; planned-but-unreceived quantity is excluded as a firm rule.",
        ),
      );
    }
    w.status = "issued";
    notify();
    return delay(okResult(clone(w)));
  },

  /** v2.0 §6.6 exception 3 — the new warehouse request path, in the order the source lists. */
  async advanceWarehouseRequest(
    id: string,
    to: WarehouseRequestState,
    opts: { recommendation?: string; erpReference?: string } = {},
  ): Promise<Result<WarehouseRequest>> {
    const r = store.warehouseRequests.find((x) => x.id === id);
    if (!r) return delay(failResult("Warehouse request not found."));
    const check = canTransition(WAREHOUSE_REQUEST_TRANSITIONS, r.state, to);
    if (!check.allowed) return delay(failResult(check.reason));
    if (to === "quality_released" && !(opts.recommendation ?? r.qualityRecommendation)) {
      return delay(
        failResult("Quality reports its visit and recommendations before it releases (v2.0 §6.6)."),
      );
    }
    if (to === "created_in_erp" && !opts.erpReference) {
      return delay(failResult("Compliance creates the warehouse in the ERP; the ERP reference is required."));
    }
    r.state = to;
    if (to === "quality_visit") r.qualityVisitDate = TODAY;
    if (to === "quality_released") {
      r.qualityRecommendation = opts.recommendation ?? r.qualityRecommendation;
      r.qualityReleasedOn = TODAY;
    }
    if (to === "execution_approved") r.executionApprovedOn = TODAY;
    if (to === "created_in_erp") r.erpReference = opts.erpReference;
    notify();
    return delay(okResult(clone(r)));
  },

  /* ---- Phase 07: advance payments ---- */

  /**
   * v2.0 §6.7 activity 5 and 8 — FP&A determines the amount, the payments are issued
   * and need to be confirmed. Whether COTS should block execution on it is [OPEN],
   * so nothing downstream is refused.
   */
  async advanceAdvancePayment(
    id: string,
    to: AdvancePaymentState,
    opts: { determinedBy?: string; legIndex?: number; reference?: string } = {},
  ): Promise<Result<AdvancePayment>> {
    const a = store.advancePayments.find((x) => x.id === id);
    if (!a) return delay(failResult("Advance payment not found."));
    const check = canTransition(ADVANCE_PAYMENT_TRANSITIONS, a.state, to);
    if (!check.allowed) return delay(failResult(check.reason));
    if (to === "amount_determined") {
      if (!a.totalAmount) return delay(failResult("FP&A determines the amount before it can be issued."));
      a.determinedBy = opts.determinedBy ?? "FP&A";
      a.determinedOn = TODAY;
    }
    if (to === "issued") {
      const first = a.legs[0];
      if (!first) return delay(failResult("No payment leg has been defined."));
      first.issuedOn = first.issuedOn ?? TODAY;
      first.reference = opts.reference ?? first.reference;
    }
    if (to === "confirmed") {
      const unconfirmed = a.legs.filter((l) => !l.confirmedOn);
      if (unconfirmed.length > 0) {
        return delay(
          failResult(
            `${unconfirmed.length} of ${a.legs.length} legs in the chain are not yet confirmed. In Ethiopia, Invictus issues to AMROS, AMROS transfers to African Lakes, and execution can then start (v2.0 §6.7).`,
          ),
        );
      }
    }
    a.state = to;
    notify();
    return delay(okResult(clone(a)));
  },

  /** Records the issue or the confirmation of one leg of the chain. */
  async recordAdvancePaymentLeg(
    id: string,
    legIndex: number,
    patch: { issued?: boolean; confirmed?: boolean; reference?: string },
  ): Promise<Result<AdvancePayment>> {
    const a = store.advancePayments.find((x) => x.id === id);
    if (!a) return delay(failResult("Advance payment not found."));
    const leg = a.legs[legIndex];
    if (!leg) return delay(failResult("Payment leg not found."));
    if (patch.confirmed && !leg.issuedOn && !patch.issued) {
      return delay(failResult("A payment cannot be confirmed before it has been issued."));
    }
    if (legIndex > 0 && (patch.issued || patch.confirmed) && !a.legs[legIndex - 1]?.confirmedOn) {
      return delay(
        failResult(
          `${leg.fromEntity} transfers to ${leg.toEntity} only after the preceding leg is confirmed (v2.0 §6.7).`,
        ),
      );
    }
    if (patch.issued) leg.issuedOn = leg.issuedOn ?? TODAY;
    if (patch.confirmed) leg.confirmedOn = TODAY;
    if (patch.reference !== undefined) leg.reference = patch.reference;
    if (a.legs.every((l) => l.confirmedOn)) a.state = "confirmed";
    else if (a.legs.some((l) => l.issuedOn)) a.state = "issued";
    notify();
    return delay(okResult(clone(a)));
  },

  /* ---- Phase 08: the freight rate table ---- */

  /**
   * v2.0 §6.8 activity 2 [PROPOSED] — the rate entry form is made practical for all
   * rates across different loading and destination points and shipping lines. Today
   * the entry form in Export Direct handles a single option only, which is why this
   * takes an array.
   */
  async upsertFreightRates(rows: FreightRate[]): Promise<Result<FreightRate[]>> {
    if (rows.length === 0) return delay(failResult("Nothing to save."));
    for (const r of rows) {
      if (!r.rate20ft && !r.rate40ft) {
        return delay(
          failResult(
            `${portName(r.loadingPortId)} → ${portName(r.destinationPortId)}: a rate row must carry a 20-foot or a 40-foot rate.`,
          ),
        );
      }
    }
    const saved: FreightRate[] = [];
    for (const r of rows) {
      const existing = store.freightRates.find(
        (x) =>
          x.effectiveMonth === r.effectiveMonth &&
          x.loadingPortId === r.loadingPortId &&
          x.destinationPortId === r.destinationPortId &&
          x.commodityId === r.commodityId &&
          x.shippingLine === r.shippingLine,
      );
      if (existing) {
        Object.assign(existing, r, { id: existing.id, updatedOn: TODAY });
        saved.push(clone(existing));
      } else {
        const row = { ...clone(r), id: `fr-${store.freightRates.length + 1}`, updatedOn: TODAY };
        store.freightRates.push(row);
        saved.push(clone(row));
      }
    }
    notify();
    return delay(okResult(saved));
  },

  /* ---- Phase 10: movement and the stuffing request ---- */

  async advanceMovementLeg(id: string, to: MovementLegState): Promise<Result<MovementLeg>> {
    const leg = store.movementLegs.find((x) => x.id === id);
    if (!leg) return delay(failResult("Movement leg not found."));
    const check = canTransition(MOVEMENT_LEG_TRANSITIONS, leg.state, to);
    if (!check.allowed) return delay(failResult(check.reason));
    if (to === "loading" && leg.trips.length === 0 && leg.mode === "bulk_daily") {
      return delay(
        failResult(
          "A bulk movement is tracked as a daily operation: record the first day's trips before it moves to loading (v2.0 §6.10 activity 2).",
        ),
      );
    }
    if (to === "arrived" && leg.trips.every((t) => t.receivedMt === undefined)) {
      return delay(failResult("No trip has a received quantity yet, so arrival cannot be recorded."));
    }
    leg.state = to;
    if (to === "loading") leg.startDate = leg.startDate ?? TODAY;
    if (to === "arrived") leg.arrivalDate = TODAY;
    notify();
    return delay(okResult(clone(leg)));
  },

  /** Adds a truck detail or a bulk day to a movement leg (v2.0 §6.10 activity 2). */
  async addMovementTrip(id: string, trip: MovementTrip): Promise<Result<MovementLeg>> {
    const leg = store.movementLegs.find((x) => x.id === id);
    if (!leg) return delay(failResult("Movement leg not found."));
    if (leg.state === "closed") return delay(failResult("This leg is closed."));
    if (!trip.loadedMt || trip.loadedMt <= 0) {
      return delay(failResult("A trip must record the quantity loaded."));
    }
    if (leg.mode !== "bulk_daily" && !trip.plateNo) {
      return delay(
        failResult(
          "Movement by truck or rail is tracked by vehicle detail, so the plate number is required.",
        ),
      );
    }
    if (leg.trips.some((t) => t.tripNo === trip.tripNo)) {
      return delay(failResult(`Trip "${trip.tripNo}" is already recorded on this leg.`));
    }
    leg.trips.push(clone(trip));
    notify();
    return delay(okResult(clone(leg)));
  },

  /** Records the quantity received against a trip, which is where the variance appears. */
  async recordTripReceipt(id: string, tripNo: string, receivedMt: number): Promise<Result<MovementLeg>> {
    const leg = store.movementLegs.find((x) => x.id === id);
    if (!leg) return delay(failResult("Movement leg not found."));
    const trip = leg.trips.find((t) => t.tripNo === tripNo);
    if (!trip) return delay(failResult("Trip not found."));
    if (receivedMt < 0) return delay(failResult("A received quantity cannot be negative."));
    trip.receivedMt = receivedMt;
    notify();
    return delay(okResult(clone(leg)));
  },

  /**
   * v2.0 §6.10 activities 3-4 — the stuffing request initiates the stuffing operation
   * and is communicated to Quality, Logistics, Clearance, Warehousing and Processing.
   */
  async raiseStuffingRequest(id: string, by: string): Promise<Result<StuffingRequest>> {
    const r = store.stuffingRequests.find((x) => x.id === id);
    if (!r) return delay(failResult("Stuffing request not found."));
    if (r.raisedOn) return delay(failResult("This stuffing request has already been raised."));
    const leg = store.movementLegs.find((m) => m.shipmentId === r.shipmentId);
    if (leg && leg.state !== "arrived" && leg.state !== "closed") {
      return delay(
        failResult(
          `Cargo is moved before the start of the stuffing operation; movement ${leg.legNo} is still ${leg.state.replace("_", " ")} (v2.0 §6.10 activity 1).`,
        ),
      );
    }
    r.raisedOn = TODAY;
    r.raisedBy = by;
    notify();
    return delay(okResult(clone(r)));
  },

  /** One of the five notified functions acknowledges the request. */
  async acknowledgeStuffingRequest(
    id: string,
    fn: StuffingNotifyFunction,
    by: string,
  ): Promise<Result<StuffingRequest>> {
    const r = store.stuffingRequests.find((x) => x.id === id);
    if (!r) return delay(failResult("Stuffing request not found."));
    if (!r.raisedOn)
      return delay(failResult("The request has not been raised, so nobody has been notified."));
    const row = r.notifications.find((n) => n.fn === fn);
    if (!row) return delay(failResult(`${fn} is not one of the five notified functions.`));
    row.acknowledgedOn = TODAY;
    row.acknowledgedBy = by;
    notify();
    return delay(okResult(clone(r)));
  },

  /**
   * v2.0 §6.9 activity 3 — "EX form consumption is recorded per form: form number,
   * quantity, PS file number, export certificate number, declaration number, and the
   * form marked Used." Rule R7 refuses consuming a form already marked Used; today
   * "the constraint is stated in a drop-down and is unenforced".
   */
  async consumeExportForm(
    exportContractId: string,
    formNo: string,
    input: {
      clearanceShipmentId: string;
      psFileNo?: string;
      exportCertificateNo?: string;
      declarationNo?: string;
    },
  ): Promise<Result<ExportContract>> {
    const ec = store.exportContracts.find((e) => e.id === exportContractId);
    if (!ec) return delay(failResult("Export contract not found."));
    const form = ec.exportForms.find((f) => f.formNo === formNo);
    if (!form) return delay(failResult(`EX form ${formNo} is not issued against this export contract.`));
    const reuse = guardExportFormReuse(form);
    if (!reuse.allowed) return delay(failResult(reuse.reason));
    const shipment = store.shipments.find((s) => s.id === input.clearanceShipmentId);
    if (!shipment) return delay(failResult("Shipment not found."));
    if (!input.declarationNo?.trim()) {
      return delay(
        failResult(
          "The customs declaration number is what records the consumption; v2.0 §6.9 activity 3 lists it among the five identifiers.",
        ),
      );
    }
    form.status = "used";
    form.usedOnClearanceId = shipment.id;
    form.psFileNo = input.psFileNo?.trim() || form.psFileNo;
    form.exportCertificateNo = input.exportCertificateNo?.trim() || form.exportCertificateNo;
    form.declarationNo = input.declarationNo.trim();

    const contract = store.contracts.find((c) => c.id === ec.contractId);
    ec.consumption.push({
      purchaseContractNo: contract?.contractNo ?? ec.contractId,
      shipmentRef: shipment.shipmentNo,
      exportFormNo: form.formNo,
      quantityMt: form.quantityMt,
    });
    if (!shipment.allocatedExportForms.includes(form.formNo)) {
      shipment.allocatedExportForms.push(form.formNo);
    }
    shipment.clearance.exFormUsage = clone(ec.exportForms.filter((f) => f.usedOnClearanceId === shipment.id));
    pushAudit(shipment.id, {
      actor: "Clearance team",
      actorRole: "logistics",
      action: "EX form marked Used",
      entity: `EX form ${form.formNo}`,
      note: `declaration ${form.declarationNo}`,
    });
    notify();
    return delay(okResult(clone(ec)));
  },

  /**
   * v2.0 §6.15 [PROPOSED] — "A bank lifecycle: Assembling → Sent to Trade Finance →
   * Submitted to bank → Under collection → Matured → Paid, with Overdue derived from the
   * maturity date rather than typed." Rule R21 gates the first move: post-shipment cannot
   * be sent while a checklist item is unticked.
   */
  async advanceBankSubmittal(
    shipmentId: string,
    to: BankSubmittalStatus,
    opts: { maturityDate?: string; awb?: string; underCollection?: Money } = {},
  ): Promise<Result<Shipment>> {
    const s = store.shipments.find((x) => x.id === shipmentId);
    if (!s) return delay(failResult("Shipment not found."));
    const bank = s.bankSubmittal;
    const check = canTransition(BANK_SUBMITTAL_TRANSITIONS, bank.status, to);
    if (!check.allowed) return delay(failResult(check.reason));

    if (to === "sent_to_trade_finance") {
      const guard = guardPostShipmentCompletion(s.postShipment.checklist);
      if (!guard.allowed) return delay(failResult(guard.reason));
      s.postShipment.sentToTradeFinance = true;
      s.postShipment.sentToTradeFinanceDate = TODAY;
    }
    if (to === "submitted_to_bank") {
      const maturity = opts.maturityDate ?? bank.maturityDate;
      if (!maturity) {
        return delay(
          failResult(
            "The maturity date derives from the contract payment terms and is the single field a collections process needs most (v2.0 §6.15). It is required before submission.",
          ),
        );
      }
      bank.maturityDate = maturity;
      bank.docsSentToBankDate = TODAY;
      bank.awb = opts.awb?.trim() || bank.awb;
    }
    if (to === "under_collection" && !bank.underCollection && opts.underCollection === undefined) {
      return delay(
        failResult("The amount under collection is required once the documents are with the bank."),
      );
    }
    if (opts.underCollection !== undefined) bank.underCollection = opts.underCollection;
    if (to === "paid") bank.paymentReceivedDate = TODAY;
    bank.status = to;
    pushAudit(shipmentId, {
      actor: "Trade Finance",
      actorRole: "trade_finance",
      action: "Bank submittal advanced",
      entity: `Shipment ${s.shipmentNo}`,
      field: "bankSubmittal.status",
      to,
    });
    notify();
    return delay(okResult(clone(s)));
  },

  /* ---- Phase 11: the container inspection protocol ---- */

  /**
   * v2.0 §6.11 activity 1 [PROPOSED] — the protocol and its results are recorded in
   * COTS. What constitutes a pass is [OPEN], so no pass rule is applied: the result
   * is recorded and the screen says the protocol content awaits confirmation.
   */
  async recordContainerProtocol(
    shipmentId: string,
    containerNo: string,
    checks: { key: string; label: string; result: "pass" | "fail" | "not_checked"; note?: string }[],
    inspectedBy: string,
  ): Promise<Result<Shipment>> {
    const s = store.shipments.find((x) => x.id === shipmentId);
    if (!s) return delay(failResult("Shipment not found."));
    const unit = s.stuffing.containers.find((c) => c.containerNo === containerNo);
    if (!unit) return delay(failResult(`Container ${containerNo} is not on this shipment.`));
    if (checks.length === 0) return delay(failResult("The protocol must record at least one check."));
    unit.protocol = { checks: clone(checks), inspectedOn: TODAY, inspectedBy };
    unit.inspectedOn = unit.inspectedOn ?? TODAY;
    pushAudit(shipmentId, {
      actor: inspectedBy,
      actorRole: "surveyor",
      action: "Container inspection protocol recorded",
      entity: `Container ${containerNo}`,
      note: `${checks.filter((c) => c.result === "fail").length} failed check(s)`,
    });
    notify();
    return delay(okResult(clone(s)));
  },

  /* ---- Phase 16: close-out ---- */

  /** v2.0 §6.16 activity 5 [PROPOSED] — customer feedback, linked to the contract. */
  async logCustomerFeedback(
    input: Omit<CustomerFeedback, "id" | "loggedOn">,
  ): Promise<Result<CustomerFeedback>> {
    if (!store.contracts.some((c) => c.id === input.contractId)) {
      return delay(failResult("Contract not found."));
    }
    if (!input.detail.trim()) return delay(failResult("Feedback must say what the customer said."));
    const row: CustomerFeedback = {
      ...clone(input),
      id: `cf-${store.customerFeedback.length + 1}`,
      loggedOn: TODAY,
    };
    store.customerFeedback.push(row);
    notify();
    return delay(okResult(clone(row)));
  },

  /**
   * v2.0 §6.16 activity 6 — what the system records is the approval of the claim and
   * the amount submitted. Whether it should hold the whole claim is G-30.
   */
  async decideBuyerClaim(
    id: string,
    to: BuyerClaimState,
    opts: { approvedAmount?: BuyerClaim["approvedAmount"]; note?: string } = {},
  ): Promise<Result<BuyerClaim>> {
    const c = store.buyerClaims.find((x) => x.id === id);
    if (!c) return delay(failResult("Claim not found."));
    const check = canTransition(BUYER_CLAIM_TRANSITIONS, c.state, to);
    if (!check.allowed) return delay(failResult(check.reason));
    if (to === "approved" && !opts.approvedAmount) {
      return delay(failResult("An approved claim records the amount approved."));
    }
    c.state = to;
    c.decidedOn = TODAY;
    c.approvedAmount = opts.approvedAmount;
    if (opts.note) c.note = opts.note;
    notify();
    return delay(okResult(clone(c)));
  },

  /** v2.0 §6.16 exception 2 — reported → claim built → finalised with a compensation status. */
  async advanceInsuranceIncident(
    id: string,
    to: InsuranceIncidentState,
    opts: { claimAmount?: InsuranceIncident["claimAmount"]; compensationStatus?: string } = {},
  ): Promise<Result<InsuranceIncident>> {
    const i = store.insuranceIncidents.find((x) => x.id === id);
    if (!i) return delay(failResult("Incident not found."));
    const check = canTransition(INSURANCE_INCIDENT_TRANSITIONS, i.state, to);
    if (!check.allowed) return delay(failResult(check.reason));
    if (to === "claim_built" && !(opts.claimAmount ?? i.claimAmount)) {
      return delay(failResult("A built claim carries its amount."));
    }
    if (to === "finalised" && !opts.compensationStatus) {
      return delay(failResult("The claim is finalised with the compensation status updated (v2.0 §6.16)."));
    }
    i.state = to;
    if (opts.claimAmount) i.claimAmount = opts.claimAmount;
    if (opts.compensationStatus) i.compensationStatus = opts.compensationStatus;
    notify();
    return delay(okResult(clone(i)));
  },

  /* ================================================================ *
   * PHASES 01–02 MUTATORS — seasonal purchase plan and budget
   *
   * Workflow v2.3 §6.1 and §6.2 state no validation, no approval and no
   * blocking rule, and both ask outright whether the record must be complete
   * before the user proceeds. So the refusals below are structural only —
   * each one rejects input the record cannot represent, not input the
   * business has not approved.
   *
   * NOT ENFORCED, deliberately, because nothing states it:
   *   · that every month of a plan carries a commodity, a quantity and a
   *     capacity, or carries a line at all;
   *   · that a month carries only one commodity;
   *   · that a budget period falls inside the seasonal period of its plan;
   *   · that the budget quantity reconciles with the quantity planned;
   *   · that a budget carries an approval status, or that any particular
   *     status permits anything downstream. Nothing reads the field.
   * ================================================================ */

  /**
   * §6.1 — save a seasonal purchase plan against the export process record.
   *
   * Three structural refusals, each one a thing the record cannot hold rather
   * than a business rule:
   *  · the period must span at least one month. §6.1 activity 3 has COTS
   *    determine the months between the From and To periods; a To period before
   *    the From period determines none, so there is no plan to save.
   *  · every line must fall in a month the period spans. Activity 4 puts a line
   *    against "each month in the seasonal period", so a line outside it has no
   *    row to sit in.
   *  · a quantity or a capacity, where entered, cannot be negative.
   */
  async createSeasonalPurchasePlan(
    input: Omit<SeasonalPurchasePlan, "id" | "planRef" | "createdOn" | "sharedOn"> & { share?: boolean },
  ): Promise<Result<SeasonalPurchasePlan>> {
    const months = monthsInSeason(input.from, input.to);
    if (!isValidSeasonMonth(input.from) || !isValidSeasonMonth(input.to)) {
      return delay(failResult("Enter the seasonal period as a From month and year and a To month and year."));
    }
    if (months.length === 0) {
      return delay(
        failResult(
          "The seasonal period spans no months. The To period must be the same month as the From period or later — COTS determines the months that fall between the two, and a period that runs backwards determines none.",
        ),
      );
    }
    const refusal = checkPlanRows(input.rows, months);
    if (refusal) return delay(failResult(refusal));

    const seq = store.seasonalPurchasePlans.length + 1;
    const { share, ...rest } = input;
    const row: SeasonalPurchasePlan = {
      ...clone(rest),
      id: `spp-${seq}`,
      planRef: `SPP-${months[0].year}-${String(seq).padStart(4, "0")}`,
      createdOn: TODAY,
      ...(share ? { sharedOn: TODAY, sharedBy: input.createdBy } : {}),
    };
    store.seasonalPurchasePlans.push(row);
    notify();
    return delay(okResult(clone(row)));
  },

  /**
   * §6.1 — change a saved seasonal purchase plan.
   *
   * §6.1 describes saving a plan and says nothing whatever about editing one. Two of its
   * business confirmations bear on this directly, and neither is answered here:
   *  · "who may edit it once it is saved?" — so anyone signed in may, and the only thing
   *    recorded is that a change happened and by whom;
   *  · "what becomes of a saved plan when the seasonal period is afterwards changed?" —
   *    so nothing is decided in the store. The same structural rule as on create applies:
   *    every line must fall in a month the period spans. A caller that narrows the period
   *    must therefore hand over a line set that fits it, and the edit screen shows the
   *    lines that would be dropped, by month, before the user commits to it. Dropping
   *    them silently here would answer the open question by accident.
   *
   * The reference, the creation date and the creator are not editable — they identify the
   * record rather than describing the plan.
   */
  async updateSeasonalPurchasePlan(
    id: string,
    input: Pick<SeasonalPurchasePlan, "from" | "to" | "rows"> &
      Partial<Pick<SeasonalPurchasePlan, "note" | "updatedBy">> & { share?: boolean },
  ): Promise<Result<SeasonalPurchasePlan>> {
    const existing = store.seasonalPurchasePlans.find((p) => p.id === id);
    if (!existing) return delay(failResult("Seasonal purchase plan not found."));

    const months = monthsInSeason(input.from, input.to);
    if (!isValidSeasonMonth(input.from) || !isValidSeasonMonth(input.to)) {
      return delay(failResult("Enter the seasonal period as a From month and year and a To month and year."));
    }
    if (months.length === 0) {
      return delay(
        failResult(
          "The seasonal period spans no months. The To period must be the same month as the From period or later — COTS determines the months that fall between the two, and a period that runs backwards determines none.",
        ),
      );
    }
    const refusal = checkPlanRows(input.rows, months);
    if (refusal) return delay(failResult(refusal));

    existing.from = clone(input.from);
    existing.to = clone(input.to);
    existing.rows = clone(input.rows);
    existing.note = input.note?.trim() || undefined;
    existing.updatedOn = TODAY;
    existing.updatedBy = input.updatedBy;
    if (input.share) {
      existing.sharedOn = TODAY;
      existing.sharedBy = input.updatedBy;
    }
    notify();
    return delay(okResult(clone(existing)));
  },

  /**
   * §6.2 — save a budget against the export process record.
   *
   * Structural refusals only:
   *  · the To date cannot precede the From date;
   *  · a budget with no line records nothing;
   *  · a plan named on a line must be a plan that exists, and a supplier named
   *    on a line must be a counterparty that exists — a blank select is the
   *    usual cause of either;
   *  · a quantity or an amount, where entered, cannot be negative.
   *
   * The approval status is stored exactly as typed. The instruction of
   * 26 August 2026 names the field and states no values, no owner and no
   * effect, so no value list is checked and nothing is gated on it.
   */
  async createBudget(
    input: Omit<Budget, "id" | "budgetRef" | "createdOn" | "sharedOn"> & { share?: boolean },
  ): Promise<Result<Budget>> {
    if (!input.fromDate || !input.toDate) {
      return delay(failResult("Enter the budget period as a From date and a To date."));
    }
    if (input.toDate < input.fromDate) {
      return delay(failResult("The budget period's To date cannot fall before its From date."));
    }
    if (input.lines.length === 0) {
      return delay(
        failResult(
          "A budget records at least one line — the plan, the quantity, the amount and the supplier.",
        ),
      );
    }
    const refusal = checkBudgetLines(input.lines, "create");
    if (refusal) return delay(failResult(refusal));

    const seq = store.budgets.length + 1;
    const { share, ...rest } = input;
    const row: Budget = {
      ...clone(rest),
      id: `bg-${seq}`,
      budgetRef: `BGT-${input.fromDate.slice(0, 4)}-${String(seq).padStart(4, "0")}`,
      createdOn: TODAY,
      ...(share ? { sharedOn: TODAY, sharedBy: input.createdBy } : {}),
    };
    store.budgets.push(row);
    notify();
    return delay(okResult(clone(row)));
  },

  /**
   * §6.2 — change a saved budget.
   *
   * Same shape as the plan's update, and the same two unanswered questions behind it:
   * §6.2 asks who may edit a budget once it is saved, and what becomes of a saved budget
   * when the period or the plan is afterwards changed. Neither is decided here.
   *
   * The approval status is editable like any other field, and changing it is not a
   * transition: no value is treated as more advanced than another, no sequence is
   * enforced, and clearing it back to blank is allowed. The instruction that added the
   * field states no values, no owner and no effect, so there is nothing to enforce.
   *
   * The reference, the creation date and the creator are not editable.
   */
  async updateBudget(
    id: string,
    input: Pick<Budget, "fromDate" | "toDate" | "lines"> &
      Partial<
        Pick<
          Budget,
          | "seasonalPlanId"
          | "issuedPaymentLocal"
          | "issuedPaymentCurrency"
          | "issuedPaymentDate"
          | "approvalStatus"
          | "note"
          | "updatedBy"
        >
      > & { share?: boolean },
  ): Promise<Result<Budget>> {
    const existing = store.budgets.find((b) => b.id === id);
    if (!existing) return delay(failResult("Budget not found."));

    if (!input.fromDate || !input.toDate) {
      return delay(failResult("Enter the budget period as a From date and a To date."));
    }
    if (input.toDate < input.fromDate) {
      return delay(failResult("The budget period's To date cannot fall before its From date."));
    }
    if (input.lines.length === 0) {
      return delay(
        failResult(
          "A budget records at least one line — the plan, the quantity, the amount and the supplier.",
        ),
      );
    }
    // A closed plan is tolerated only where this budget already named it.
    const alreadyNamed = new Set(
      existing.lines.map((l) => l.seasonalPlanId).filter((x): x is string => Boolean(x)),
    );
    const refusal = checkBudgetLines(input.lines, "update", alreadyNamed);
    if (refusal) return delay(failResult(refusal));

    existing.fromDate = input.fromDate;
    existing.toDate = input.toDate;
    existing.lines = clone(input.lines);
    existing.seasonalPlanId = input.seasonalPlanId || undefined;
    /* `Issued Payment Amount` and its currency, added 3 September 2026. The USD
       conversion is not stored: it is read from the FX master by
       `budgetIssuedPaymentUsd()`, which is what "read only, from the master data"
       means on the screen. */
    existing.issuedPaymentLocal = input.issuedPaymentLocal;
    existing.issuedPaymentCurrency = input.issuedPaymentCurrency;
    existing.issuedPaymentDate = input.issuedPaymentDate;
    existing.approvalStatus = input.approvalStatus?.trim() || undefined;
    existing.note = input.note?.trim() || undefined;
    existing.updatedOn = TODAY;
    existing.updatedBy = input.updatedBy;
    if (input.share) {
      existing.sharedOn = TODAY;
      existing.sharedBy = input.updatedBy;
    }
    notify();
    return delay(okResult(clone(existing)));
  },

  /* ================================================================ *
   * SOURCING INTAKE MUTATORS — Material Management Portal
   * ================================================================ */

  /**
   * MMP `New Fund Form` (`/Funds/Create`).
   *
   * Three things the legacy form does not do, and this does:
   *  · `Fund Ref` is unique. The captured data holds two records sharing `45643123`,
   *    because MMP builds the reference from the purchase order and never checks it.
   *  · The exchange rate must be above zero. `Value In USD` is `Value In SDG` divided
   *    by it, so a zero rate produces `Infinity` in a money field.
   *  · The mode decides which fields apply. `Finance` needs its bank, `Barter` needs the
   *    commodity being bartered, and `Cash` needs neither — MMP shows the conditional
   *    fields but accepts a Finance record with no bank.
   */
  async createFund(
    input: Omit<Fund, "id" | "fundRef" | "sharedOn"> & { share?: boolean },
  ): Promise<Result<Fund>> {
    const refusal = checkFund(input);
    if (refusal) return delay(failResult(refusal));

    const seq = store.funds.length + 1;
    const { share, ...rest } = input;
    const fundRef = `FND-${input.requiredPaymentDate.slice(0, 4)}-${String(seq).padStart(4, "0")}`;
    if (store.funds.some((f) => f.fundRef === fundRef)) {
      return delay(failResult(`Fund reference ${fundRef} already exists.`));
    }
    const row: Fund = {
      ...clone(rest),
      id: `fd-${seq}`,
      fundRef,
      ...(share ? { sharedOn: TODAY, sharedBy: rest.updatedBy } : {}),
    };
    store.funds.push(row);
    notify();
    return delay(okResult(clone(row)));
  },

  /**
   * The fund's Update screen — the fields that only exist once the fund has been paid.
   *
   * The instruction of 27 August 2026 puts these on Update and not on Create: the PO
   * number, the actual payment date, the mode of fund and the fund document. The exchange
   * rate is not among them, because it is not entered at all — it is read from the rate
   * table on the actual payment date, so recording that date is what gives the fund a rate
   * and a value in USD.
   *
   * The reference and the creation trail are not editable; everything the Create screen
   * captured stays editable, because nothing states otherwise.
   */
  async updateFund(
    id: string,
    input: Partial<
      Pick<
        Fund,
        | "seasonality"
        | "agentId"
        | "commodityId"
        | "purchaseOrderNo"
        | "requiredPaymentDate"
        | "actualPaymentDate"
        | "issuedPaymentLocal"
        | "paymentSlipName"
        | "valueLocal"
        | "localCurrency"
        | "mode"
        | "bankName"
        | "barterCommodityId"
        | "documentName"
        | "note"
        | "updatedBy"
      >
    > & { share?: boolean },
  ): Promise<Result<Fund>> {
    const existing = store.funds.find((f) => f.id === id);
    if (!existing) return delay(failResult("Fund not found."));

    const { share, ...patch } = input;
    const refusal = checkFund({ ...clone(existing), ...clone(patch) });
    if (refusal) return delay(failResult(refusal));

    Object.assign(existing, clone(patch));
    existing.updatedOn = TODAY;
    existing.updatedBy = patch.updatedBy;
    if (share) {
      existing.sharedOn = TODAY;
      existing.sharedBy = patch.updatedBy;
    }
    notify();
    return delay(okResult(clone(existing)));
  },

  /**
   * The purchase agreement's Add screen, as reshaped by the instruction of 27 August 2026.
   *
   * Three things changed, and each is enforced here as well as on the screen:
   *   · **no purchase order.** It is issued after the agreement is struck, so the
   *     reference is now `PA-<year>-<sequence>` rather than the purchase order plus a
   *     sequence, and the PO is captured on the Update screen instead;
   *   · **the commodity comes from a seasonal purchase plan.** Where a plan is named, the
   *     commodity must be one that plan carries — the same rule the budget's line
   *     follows, and the first link between this intake chain and phases 01–02;
   *   · **the per-bag weights are conditional.** `Is Applicable` decides whether they are
   *     captured at all. When it is set they are required and must be above zero, for the
   *     reason MMP's own data demonstrates: every receipt on the agreement derives its
   *     packaging tare from them, so a zero silently zeroes the tare on all of them. When
   *     it is not set they are not captured, and the tare is a stated zero.
   *
   * `Flow Status` defaults to `open` and `Agreement date` to today on the screen, so
   * neither can arrive unset from it; both are still checked here, because a caller that
   * is not that screen could.
   */
  async createPurchaseAgreement(
    input: Omit<
      PurchaseAgreement,
      "id" | "paRef" | "createdOn" | "sharedOn" | "agreementType" | "qualityInspections"
    > &
      Partial<Pick<PurchaseAgreement, "agreementType" | "qualityInspections">> & {
        share?: boolean;
      },
  ): Promise<Result<PurchaseAgreement>> {
    const refusal = checkPurchaseAgreement(input);
    if (refusal) return delay(failResult(refusal));

    const seq = store.purchaseAgreements.length + 1;
    const { share, ...rest } = input;
    const paRef = `PA-${input.agreementDate.slice(0, 4)}-${String(seq).padStart(4, "0")}`;
    if (store.purchaseAgreements.some((a) => a.paRef === paRef)) {
      return delay(failResult(`Agreement reference ${paRef} already exists.`));
    }
    const row: PurchaseAgreement = {
      ...clone(rest),
      id: `pa-${seq}`,
      paRef,
      /* `Agreement Type` defaults to Fixed, exactly as the instruction of 3 September
         2026 states, and is changed by Procurement on the Edit screen. A caller that
         is not that screen — the Add screen does not carry the field — therefore gets
         the default rather than an unset value. */
      agreementType: rest.agreementType ?? "fixed",
      /* Quality inspections are entered on the Edit screen, so a newly created
         agreement has none. */
      qualityInspections: clone(rest.qualityInspections ?? []),
      createdOn: TODAY,
      ...(share ? { sharedOn: TODAY, sharedBy: rest.createdBy } : {}),
    };
    store.purchaseAgreements.push(row);
    notify();
    return delay(okResult(clone(row)));
  },

  /**
   * The purchase agreement's Update screen — new at this version.
   *
   * MMP had no edit form for an agreement at all. The instruction of 27 August 2026 adds
   * one, and adds the **purchase order** to it as a field the Add screen does not carry.
   * Everything else stays editable and the same three rules apply, so an agreement cannot
   * be edited into a state it could not have been created in — including the per-bag
   * weights, which become required the moment `Is Applicable` is set and are cleared when
   * it is unset, so a stale weight can never be read as a live tare.
   */
  async updatePurchaseAgreement(
    id: string,
    input: Partial<
      Pick<
        PurchaseAgreement,
        | "purchaseOrderNo"
        | "seasonality"
        | "seasonalPlanId"
        | "commodityId"
        | "supplierId"
        | "purchaser"
        | "totalQuantityMt"
        | "flowStatus"
        | "agreementDate"
        | "bagWeightApplicable"
        | "bpBagWeightLb"
        | "spBagWeightLb"
        | "juteBagWeightLb"
        | "agreementType"
        | "qualityInspections"
        | "attachments"
        | "note"
        | "updatedBy"
      >
    > & { share?: boolean },
  ): Promise<Result<PurchaseAgreement>> {
    const existing = store.purchaseAgreements.find((a) => a.id === id);
    if (!existing) return delay(failResult("Purchase agreement not found."));

    const { share, ...patch } = input;
    const refusal = checkPurchaseAgreement({ ...clone(existing), ...clone(patch) });
    if (refusal) return delay(failResult(refusal));

    Object.assign(existing, clone(patch));
    if (patch.bagWeightApplicable === false) {
      existing.bpBagWeightLb = undefined;
      existing.spBagWeightLb = undefined;
      existing.juteBagWeightLb = undefined;
    }
    existing.updatedOn = TODAY;
    existing.updatedBy = patch.updatedBy;
    if (share) {
      existing.sharedOn = TODAY;
      existing.sharedBy = patch.updatedBy;
    }
    notify();
    return delay(okResult(clone(existing)));
  },

  /* ================================================================ *
   * PROCUREMENT MUTATORS — the purchase order
   *
   * Added by the instruction of 3 September 2026. Four screens, two mutators: the
   * Add screen captures the PO number and the agreements under it, and the Edit
   * screen changes the PO number and the whole agreement list, including the
   * payment amount and the actual payment date on each line.
   *
   * WHAT IS REFUSED, AND WHY EACH RULE EXISTS.
   *   · **The PO number is required and unique.** The list makes it the row identity
   *     and the clickable link to the details, so two orders sharing one number
   *     would give two rows that are both right and neither findable. This is the
   *     defect the captured fund data already demonstrates — MMP builds a fund
   *     reference from the purchase order and never checks it, and two captured
   *     funds share `45643123`.
   *   · **Every line names an agreement that exists**, because the view screen links
   *     to it and the list counts it.
   *   · **An agreement appears at most once on one order.** The instruction says the
   *     Add screen may select several agreements; selecting the same one twice
   *     records one payment against it in two places, and neither total would be
   *     wrong on its own.
   *   · **An order records at least one agreement**, because an order with none is
   *     the PO number and nothing else.
   *   · **A payment amount cannot be negative**, and a payment amount with no date
   *     is permitted — that is `po-3`, and it is the state that has an amount and no
   *     USD conversion, because the conversion is read on the payment date.
   *
   * WHAT IS NOT REFUSED. The USD conversion is never accepted from a caller at all:
   * the instruction marks it read only, so it is derived by `purchaseOrderLineUsd()`
   * and the line has nowhere to put a rate. Nothing checks the payment against the
   * agreement's own value, and nothing requires the agreements on an order to share
   * a supplier, a commodity or a season — no rule states any of that.
   * ================================================================ */

  async createPurchaseOrder(
    input: Pick<PurchaseOrder, "poNumber" | "createdBy"> & {
      lines: Omit<PurchaseOrderLine, "id">[];
      note?: string;
    },
  ): Promise<Result<PurchaseOrder>> {
    const refusal = checkPurchaseOrder(input.poNumber, input.lines);
    if (refusal) return delay(failResult(refusal));

    const seq = store.purchaseOrders.length + 1;
    const row: PurchaseOrder = {
      id: `po-${seq}`,
      poNumber: input.poNumber.trim(),
      lines: input.lines.map((l, i) => ({ ...clone(l), id: `pol-${seq}-${i + 1}` })),
      createdOn: TODAY,
      createdBy: input.createdBy,
      note: input.note?.trim() || undefined,
    };
    store.purchaseOrders.push(row);
    notify();
    return delay(okResult(clone(row)));
  },

  async updatePurchaseOrder(
    id: string,
    input: Pick<PurchaseOrder, "poNumber"> & {
      lines: Omit<PurchaseOrderLine, "id">[];
      note?: string;
      updatedBy?: string;
    },
  ): Promise<Result<PurchaseOrder>> {
    const existing = store.purchaseOrders.find((o) => o.id === id);
    if (!existing) return delay(failResult("Purchase order not found."));

    const refusal = checkPurchaseOrder(input.poNumber, input.lines, id);
    if (refusal) return delay(failResult(refusal));

    existing.poNumber = input.poNumber.trim();
    /* Line ids are reissued from the saved order's own sequence. The Edit screen hands
       over the list as it stands rather than a set of changes, because the instruction
       describes editing "the purchase agreement list" and not editing one row of it. */
    existing.lines = input.lines.map((l, i) => ({ ...clone(l), id: `pol-${existing.id.slice(3)}-${i + 1}` }));
    existing.note = input.note?.trim() || undefined;
    existing.updatedOn = TODAY;
    existing.updatedBy = input.updatedBy;
    notify();
    return delay(okResult(clone(existing)));
  },

  /**
   * MMP `/AgentBalances/Create`.
   *
   * The legacy scaffold asks for `BalanceID` as an editable required primary key and
   * takes both balances as plain text inputs, with no uniqueness rule on the agent and
   * season it describes. The id is generated here, the balances are money, and one
   * balance per agent per season is enforced — otherwise the list shows two rows for the
   * same position and neither is wrong.
   */
  async createAgentBalance(input: Omit<AgentBalance, "id">): Promise<Result<AgentBalance>> {
    if (!counterpartyExists(input.supplierId)) return delay(failResult("Select an agent."));
    if (!input.seasonality) return delay(failResult("Select the seasonality."));
    if (input.actualBalance.amount < 0 || input.estimatedBalance.amount < 0) {
      return delay(failResult("A balance cannot be negative."));
    }
    if (
      store.agentBalances.some(
        (b) => b.supplierId === input.supplierId && b.seasonality === input.seasonality,
      )
    ) {
      return delay(
        failResult(
          "That agent already has a balance for that season. MMP states no uniqueness rule, which is how a list can show two rows for one position.",
        ),
      );
    }
    const row: AgentBalance = { ...clone(input), id: `ab-${store.agentBalances.length + 1}` };
    store.agentBalances.push(row);
    notify();
    return delay(okResult(clone(row)));
  },

  /**
   * MMP Receiving Locations, with the balance the legacy grid never shows. The check
   * reports rather than refuses: no source states that over-allocation is blocked, and
   * the captured data proves it is not.
   */
  async addReceivingLocationPlans(
    purchaseAgreementId: string,
    rows: {
      facility: string;
      quantityMt: number;
      assignedTo: string;
      /**
       * Which master the location came from, and the country whose master it was.
       * Added 3 September 2026. Both optional on the call so an existing caller still
       * compiles: the kind is otherwise classified from the location string itself,
       * exactly as the captured rows are.
       */
      locationKind?: ReceivingLocationKind;
      country?: CountryUnit;
    }[],
  ): Promise<Result<{ plans: ReceivingLocationPlan[]; warning?: string }>> {
    const agreement = store.purchaseAgreements.find((a) => a.id === purchaseAgreementId);
    if (!agreement) return delay(failResult("Purchase agreement not found."));
    if (rows.length === 0) return delay(failResult("Add at least one plan row before submitting."));
    for (const r of rows) {
      if (!r.facility) return delay(failResult("Every plan row needs a receiving location."));
      /* The location must be one the receiving-location master holds, and it must be of
         the kind the row says it is. Before 3 September 2026 the Add screen offered the
         distinct names already present in the data, so any string was acceptable; now
         the two lists come from the master and the service checks against it. A row
         whose location predates the master is tolerated, because the captured plans
         carry such strings and refusing them would make an old plan unsavable. */
      const known = receivingLocationByLabel(r.facility);
      if (known && r.locationKind && known.kind !== r.locationKind) {
        return delay(
          failResult(
            `${r.facility} is a ${known.kind} in the receiving-location master, and the plan row records it as a ${r.locationKind}.`,
          ),
        );
      }
      if (known && r.country && known.country !== r.country) {
        return delay(
          failResult(
            `${r.facility} is held under ${known.country} in the receiving-location master, not under ${r.country}. The location list offers only the locations of the chosen country.`,
          ),
        );
      }
      if (!r.assignedTo) return delay(failResult("Every plan row needs an assignee."));
      if (!r.quantityMt || r.quantityMt <= 0) {
        return delay(
          failResult(
            "Every plan row needs a quantity. Four of ten live legacy rows are blank despite the field being required on the add form.",
          ),
        );
      }
    }
    const existing = store.receivingLocationPlans.filter(
      (p) => p.purchaseAgreementId === purchaseAgreementId,
    );
    const proposed = rows.reduce((t, r) => t + r.quantityMt, 0);
    const allocated = existing.reduce((t, p) => t + (p.quantityMt || 0), 0);
    const overBy = allocated + proposed - agreement.totalQuantityMt;

    const plans: ReceivingLocationPlan[] = rows.map((r, i) => ({
      id: `rl-${store.receivingLocationPlans.length + i + 1}`,
      planId: `PLN-${String(store.receivingLocationPlans.length + i + 41).padStart(4, "0")}`,
      purchaseAgreementId,
      /* Where the caller does not say, the kind is read from the location string — the
         same classification the captured rows were given. */
      locationKind: r.locationKind ?? receivingLocationKindOf(r.facility),
      country: r.country ?? receivingLocationByLabel(r.facility)?.country,
      facility: r.facility,
      quantityMt: r.quantityMt,
      assignedTo: r.assignedTo,
      createdOn: TODAY,
    }));
    store.receivingLocationPlans.push(...plans);
    notify();
    return delay(
      okResult({
        plans: clone(plans),
        warning:
          overBy > 0
            ? `Allocated quantity now exceeds the agreement by ${overBy.toFixed(3)} MT. The legacy form has no such check.`
            : undefined,
      }),
    );
  },

  /**
   * MMP Receiving Locations Edit omits `Quantity` entirely, so a wrong quantity can
   * never be corrected there. It can be corrected here, which is the point.
   */
  async updateReceivingLocationPlan(
    id: string,
    patch: {
      facility?: string;
      quantityMt?: number;
      assignedTo?: string;
      locationKind?: ReceivingLocationKind;
      country?: CountryUnit;
    },
  ): Promise<Result<ReceivingLocationPlan>> {
    const plan = store.receivingLocationPlans.find((p) => p.id === id);
    if (!plan) return delay(failResult("Receiving location plan not found."));
    if (patch.quantityMt !== undefined && patch.quantityMt <= 0) {
      return delay(failResult("Quantity must be greater than zero."));
    }
    Object.assign(plan, patch);
    /* Changing the location without saying which master it came from re-classifies it,
       so the kind on the record can never contradict the location it names. */
    if (patch.facility && !patch.locationKind) {
      plan.locationKind = receivingLocationKindOf(patch.facility);
      plan.country = receivingLocationByLabel(patch.facility)?.country ?? plan.country;
    }
    notify();
    return delay(okResult(clone(plan)));
  },

  /** MMP Material Receipt / Warehouse Receipt — the create form. */
  async createIntakeReceipt(
    input: Omit<IntakeReceipt, "id" | "referenceNo">,
  ): Promise<Result<IntakeReceipt>> {
    const agreement = store.purchaseAgreements.find((a) => a.id === input.purchaseAgreementId);
    if (!agreement) return delay(failResult("Purchase agreement not found."));
    if (!input.location) return delay(failResult("The receiving facility or warehouse is required."));
    const allocated = store.receivingLocationPlans.filter(
      (p) => p.purchaseAgreementId === input.purchaseAgreementId,
    );
    if (input.kind === "facility" && !allocated.some((p) => p.facility === input.location)) {
      return delay(
        failResult(
          `${input.location} is not a receiving location on ${agreement.paRef}. A receipt is booked against a facility allocated on the agreement.`,
        ),
      );
    }
    if (!input.grossWeightWithDirtMt || input.grossWeightWithDirtMt <= 0) {
      return delay(
        failResult(
          "A receipt must record the weighbridge gross weight. The legacy form requires only the location and the date, which is how a receipt with zero quantities was saved.",
        ),
      );
    }
    const row: IntakeReceipt = {
      ...clone(input),
      id: `ir-${store.intakeReceipts.length + 1}`,
      referenceNo: `2205${String(52000 + store.intakeReceipts.length * 7).slice(0, 5)}`,
    };
    store.intakeReceipts.push(row);
    notify();
    return delay(okResult(clone(row)));
  },

  /**
   * MMP Add Receipt Price — the separate Sourcing pricing step. Warehouse receipts
   * cannot be priced in the legacy system at all (both routes return HTTP 500); here
   * they can, and the screen says why that was previously impossible.
   */
  async priceIntakeReceipt(id: string, pricing: IntakeReceiptPricing): Promise<Result<IntakeReceipt>> {
    const r = store.intakeReceipts.find((x) => x.id === id);
    if (!r) return delay(failResult("Receipt not found."));
    if (pricing.pricePerLb.amount <= 0) return delay(failResult("A price per pound is required."));
    if (pricing.agentNetWeightMt < 0) return delay(failResult("The agent's net weight cannot be negative."));
    if (r.pricing) {
      const check = canTransition(INTAKE_RECEIPT_TRANSITIONS, r.pricing.status, pricing.status);
      if (r.pricing.status !== pricing.status && !check.allowed) return delay(failResult(check.reason));
    }
    r.pricing = { ...clone(pricing), pricedOn: TODAY };
    notify();
    return delay(okResult(clone(r)));
  },

  /** Confirms a priced receipt, which is what lets it count towards the production plan. */
  async setIntakeReceiptStatus(id: string, to: IntakeReceiptStatus): Promise<Result<IntakeReceipt>> {
    const r = store.intakeReceipts.find((x) => x.id === id);
    if (!r) return delay(failResult("Receipt not found."));
    if (!r.pricing) {
      return delay(
        failResult("A receipt is priced before it is confirmed — the status lives on the pricing step."),
      );
    }
    const check = canTransition(INTAKE_RECEIPT_TRANSITIONS, r.pricing.status, to);
    if (!check.allowed) return delay(failResult(check.reason));
    r.pricing.status = to;
    notify();
    return delay(okResult(clone(r)));
  },

  /**
   * MMP Agent Balances — `Transfer Balance` and `Refund` were row actions whose dialogs
   * held placeholder text and no inputs. Both are real here.
   */
  async moveAgentBalance(
    input: Omit<AgentBalanceMovement, "id" | "movedOn">,
  ): Promise<Result<AgentBalanceMovement>> {
    const from = store.agentBalances.find(
      (b) => b.supplierId === input.supplierId && b.seasonality === input.seasonality,
    );
    if (!from) return delay(failResult("No balance exists for that agent and season."));
    if (input.amount.amount <= 0) return delay(failResult("The amount must be greater than zero."));
    if (input.amount.amount > from.actualBalance.amount) {
      return delay(
        failResult(
          `Only ${from.actualBalance.amount.toLocaleString()} ${from.actualBalance.currency} is available on this balance.`,
        ),
      );
    }
    if (input.kind === "transfer") {
      if (!input.toSupplierId) return delay(failResult("A transfer needs a receiving agent."));
      if (input.toSupplierId === input.supplierId) {
        return delay(failResult("A balance cannot be transferred to the same agent."));
      }
      const to = store.agentBalances.find(
        (b) => b.supplierId === input.toSupplierId && b.seasonality === input.seasonality,
      );
      if (!to) {
        return delay(failResult("The receiving agent has no balance for that season."));
      }
      to.actualBalance = { ...to.actualBalance, amount: to.actualBalance.amount + input.amount.amount };
    }
    from.actualBalance = { ...from.actualBalance, amount: from.actualBalance.amount - input.amount.amount };
    const row: AgentBalanceMovement = {
      ...clone(input),
      id: `am-${store.agentBalanceMovements.length + 1}`,
      movedOn: TODAY,
    };
    store.agentBalanceMovements.push(row);
    notify();
    return delay(okResult(clone(row)));
  },

  async updateTransportRequest(
    id: string,
    patch: Partial<TransportRequest>,
  ): Promise<Result<TransportRequest>> {
    const t = store.transportRequests.find((x) => x.id === id);
    if (!t) return delay(failResult("Transport request not found."));
    if (patch.contactOriginPhone !== undefined && !/^[+\d][\d\s()+-]{5,}$/.test(patch.contactOriginPhone)) {
      return delay(
        failResult("Origin contact phone must be a valid number — digits, spaces, +, - and () are allowed."),
      );
    }
    Object.assign(t, patch);
    notify();
    return delay(okResult(clone(t)));
  },
};

/* ------------------------------------------------------------------ *
 * Derived selectors used across pages
 * ------------------------------------------------------------------ */

export function resolvedMilestonesFor(shipment: Shipment) {
  const ctx = variantContextOf(shipment, COUNTRY_PROFILES[shipment.country]);
  return resolveMilestones(shipment.milestones, ctx, TODAY, shipment.documents);
}

export function variantFor(shipment: Shipment) {
  return variantContextOf(shipment, COUNTRY_PROFILES[shipment.country]);
}

export function completenessFor(shipment: Shipment) {
  return documentCompleteness(shipment.documents);
}
