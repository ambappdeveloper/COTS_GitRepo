/**
 * Calculations for the Phase 06 allocation view and the sourcing-intake chain.
 *
 * Every figure here is derived and none is stored, which is the point: the four
 * legacy pages these screens replace store derived values and get them wrong.
 * Three defects are fixed by computing rather than copying, and each is named
 * where it is fixed:
 *
 *  1. **No allocation balance anywhere.** MMP Receiving Locations shows no total,
 *     no contracted quantity and no remainder, so the captured data holds
 *     10,000 + 15,700 MT allocated against a 17,777 MT agreement, with one row's
 *     quantity blank. `allocationBalance()` is the missing number.
 *  2. **`Total Number Of Bags` string-concatenated.** The MMP Warehouse Receipt
 *     detail shows `13123123` for bag counts of 13, 123 and 123 — the three values
 *     joined as text instead of added. `totalBags()` adds them.
 *  3. **Packaging weight stored in a field named `NetWeight`, mixing MT and LB.**
 *     MMP divides a pound figure by 22.25 to produce "MT" (3,214 lb → 144.45 "MT"
 *     for 67 bags, which is 2.1 tonnes a bag). One metric tonne is 2,204.62 lb;
 *     `packagingWeight()` uses that and `LEGACY_LB_PER_MT_DIVISOR` records what the
 *     legacy used, so the screen can show both and name the difference.
 *
 * Where the source does not establish a unit or a formula it is marked here and on
 * the screen, and nothing is invented. Two such marks exist: the unit of MMP
 * `Dirt/Ton`, and how `Total Purchase Amount` combines the purchase value with the
 * agent commission (the legacy placeholder reads `Commosion Amount + …` and stops).
 */

import { daysBetween, money, round, sum } from "./calc";
import { exchangeRateOn, type FxRate } from "../data/fx-rates";
import type {
  AgentBalance,
  Contract,
  CurrencyCode,
  Fund,
  IntakeBagCounts,
  IntakeReceipt,
  Money,
  Mt,
  PositionLine,
  ProductionPlanWeek,
  PurchaseAgreement,
  ReceivingLocationPlan,
  StockLot,
} from "./types";

/** 1 MT = 2,204.62 lb. */
export const LB_PER_MT = 2204.62;

/** What MMP divides its pound figure by to produce "MT". Recorded, never used. */
export const LEGACY_LB_PER_MT_DIVISOR = 22.25;

/* ------------------------------------------------------------------ *
 * Sourcing intake — receipts
 * ------------------------------------------------------------------ */

/** Fixes MMP defect 2: the three bag counts added, not concatenated. */
export function totalBags(bags: IntakeBagCounts): number {
  return bags.bpBags + bags.spBags + bags.juteBags;
}

export interface PackagingWeight {
  bpLb: number;
  spLb: number;
  juteLb: number;
  totalLb: number;
  totalMt: Mt;
  /** What the legacy field named `NetWeight` would have held, for comparison only. */
  legacyMt: number;
}

/**
 * Packaging tare from the bag counts and the per-bag weights carried on the parent
 * purchase agreement (MMP `BP_Bag_Weight`, `SP_Bag_Weight`, `Jute`).
 *
 * The instruction of 27 August 2026 makes the per-bag weights conditional on an
 * `Is Applicable` flag. Where they do not apply the tare is zero — and that is now a
 * *stated* zero rather than the indistinguishable one MMP produced when the field was
 * simply left empty. An absent weight on an applicable agreement is still read as zero,
 * because the agreement should not have saved without it.
 */
export function packagingWeight(
  bags: IntakeBagCounts,
  agreement: Pick<
    PurchaseAgreement,
    "bagWeightApplicable" | "bpBagWeightLb" | "spBagWeightLb" | "juteBagWeightLb"
  >,
): PackagingWeight {
  const applies = agreement.bagWeightApplicable;
  const bpLb = round(bags.bpBags * (applies ? (agreement.bpBagWeightLb ?? 0) : 0), 2);
  const spLb = round(bags.spBags * (applies ? (agreement.spBagWeightLb ?? 0) : 0), 2);
  const juteLb = round(bags.juteBags * (applies ? (agreement.juteBagWeightLb ?? 0) : 0), 2);
  const totalLb = round(bpLb + spLb + juteLb, 2);
  return {
    bpLb,
    spLb,
    juteLb,
    totalLb,
    totalMt: round(totalLb / LB_PER_MT, 3),
    legacyMt: round(totalLb / LEGACY_LB_PER_MT_DIVISOR, 2),
  };
}

export interface ReceiptWeights {
  grossWithDirtMt: Mt;
  packagingMt: Mt;
  /** Undefined until the receipt has been priced — the dirt rate is entered there. */
  dirtDeductionMt?: Mt;
  /** gross − packaging − dirt. Undefined until priced, because dirt is unknown. */
  netMt?: Mt;
  /** net − the agent's declared net weight. MMP `Reciept Variance (MT)`. */
  varianceMt?: Mt;
  /** True when the source does not establish the unit of `Dirt/Ton`. Always true today. */
  dirtUnitUnconfirmed: boolean;
}

/**
 * MMP treats dirt as a rate per tonne and does not say in what unit. Read here as
 * kilograms of dirt per tonne of gross weight, which is the only reading that gives
 * a sane result for the captured values, and marked unconfirmed on the screen.
 */
export function receiptWeights(
  receipt: Pick<IntakeReceipt, "bags" | "grossWeightWithDirtMt" | "pricing">,
  agreement: Pick<
    PurchaseAgreement,
    "bagWeightApplicable" | "bpBagWeightLb" | "spBagWeightLb" | "juteBagWeightLb"
  >,
): ReceiptWeights {
  const packaging = packagingWeight(receipt.bags, agreement);
  const base: ReceiptWeights = {
    grossWithDirtMt: receipt.grossWeightWithDirtMt,
    packagingMt: packaging.totalMt,
    dirtUnitUnconfirmed: true,
  };
  if (!receipt.pricing) return base;
  const dirtDeductionMt = round((receipt.pricing.dirtPerTon / 1000) * receipt.grossWeightWithDirtMt, 3);
  const netMt = round(receipt.grossWeightWithDirtMt - packaging.totalMt - dirtDeductionMt, 3);
  return {
    ...base,
    dirtDeductionMt,
    netMt,
    varianceMt: round(netMt - receipt.pricing.agentNetWeightMt, 3),
  };
}

export interface ReceiptValue {
  netLb?: number;
  purchaseAmount?: Money;
  commissionAmount?: Money;
  /** purchase + commission. MMP `Total Purchase Amount`; its exact composition is unconfirmed. */
  totalAmount?: Money;
  compositionUnconfirmed: boolean;
}

/**
 * MMP prices per pound and pays commission per tonne. How the two are combined into
 * `Total Purchase Amount` is not established — the legacy placeholder text reads
 * `Commosion Amount + …` and is truncated — so the two components are shown
 * separately as well as summed, and the screen says the composition is unconfirmed.
 */
export function receiptValue(
  receipt: Pick<IntakeReceipt, "bags" | "grossWeightWithDirtMt" | "pricing">,
  agreement: Pick<
    PurchaseAgreement,
    "bagWeightApplicable" | "bpBagWeightLb" | "spBagWeightLb" | "juteBagWeightLb"
  >,
): ReceiptValue {
  const weights = receiptWeights(receipt, agreement);
  if (!receipt.pricing || weights.netMt === undefined) return { compositionUnconfirmed: true };
  const currency: CurrencyCode = receipt.pricing.pricePerLb.currency;
  const netLb = round(weights.netMt * LB_PER_MT, 1);
  const purchase = round(netLb * receipt.pricing.pricePerLb.amount, 2);
  const commission = receipt.pricing.agentCommissionPerMt
    ? round(weights.netMt * receipt.pricing.agentCommissionPerMt.amount, 2)
    : 0;
  return {
    netLb,
    purchaseAmount: money(purchase, currency),
    commissionAmount: receipt.pricing.agentCommissionPerMt ? money(commission, currency) : undefined,
    totalAmount: money(round(purchase + commission, 2), currency),
    compositionUnconfirmed: true,
  };
}

/* ------------------------------------------------------------------ *
 * Sourcing intake — the agreement's allocation balance
 * ------------------------------------------------------------------ */

export interface AllocationBalance {
  agreedMt: Mt;
  allocatedMt: Mt;
  remainingMt: Mt;
  /** Rows whose quantity is missing. Four of ten live legacy rows are blank. */
  rowsWithNoQuantity: number;
  overAllocated: boolean;
  /** 0–1, capped for display. */
  fraction: number;
}

/**
 * The number MMP Receiving Locations never shows. Without it the captured data holds
 * 25,700 MT allocated against a 17,777 MT agreement and nothing to stop it.
 */
export function allocationBalance(
  agreement: Pick<PurchaseAgreement, "totalQuantityMt">,
  plans: Pick<ReceivingLocationPlan, "quantityMt">[],
): AllocationBalance {
  const allocatedMt = round(sum(plans.map((p) => p.quantityMt || 0)), 3);
  const remainingMt = round(agreement.totalQuantityMt - allocatedMt, 3);
  return {
    agreedMt: agreement.totalQuantityMt,
    allocatedMt,
    remainingMt,
    rowsWithNoQuantity: plans.filter((p) => !p.quantityMt).length,
    overAllocated: remainingMt < 0,
    fraction:
      agreement.totalQuantityMt > 0 ? Math.min(1, Math.max(0, allocatedMt / agreement.totalQuantityMt)) : 0,
  };
}

/**
 * Whether a proposed allocation would exceed the agreement. The MMP form has no such
 * check, which is why the balance is negative in the live data. Reported, not refused:
 * no source states that over-allocation is blocked.
 */
export function checkAllocationHeadroom(
  agreement: Pick<PurchaseAgreement, "totalQuantityMt">,
  plans: Pick<ReceivingLocationPlan, "quantityMt">[],
  proposedMt: number,
): { withinAgreement: boolean; headroomMt: Mt; message?: string } {
  const bal = allocationBalance(agreement, plans);
  const headroomMt = round(bal.remainingMt - proposedMt, 3);
  if (headroomMt >= 0) return { withinAgreement: true, headroomMt };
  return {
    withinAgreement: false,
    headroomMt,
    message: `This allocation exceeds the agreed quantity by ${Math.abs(headroomMt).toFixed(3)} MT. The legacy form has no such check — the captured data holds 25,700 MT allocated against a 17,777 MT agreement.`,
  };
}

/** Confirmed receipts against an agreement, which is what the production plan may count. */
export function receivedAgainstAgreement(
  agreementId: string,
  receipts: IntakeReceipt[],
  agreements: PurchaseAgreement[],
): { confirmedMt: Mt; awaitingReviewMt: Mt; unpricedCount: number } {
  const agreement = agreements.find((a) => a.id === agreementId);
  const mine = receipts.filter((r) => r.purchaseAgreementId === agreementId);
  let confirmedMt = 0;
  let awaitingReviewMt = 0;
  let unpricedCount = 0;
  for (const r of mine) {
    if (!agreement) continue;
    const w = receiptWeights(r, agreement);
    if (!r.pricing) {
      unpricedCount += 1;
      continue;
    }
    if (r.pricing.status === "confirmed") confirmedMt += w.netMt ?? 0;
    else awaitingReviewMt += w.netMt ?? 0;
  }
  return {
    confirmedMt: round(confirmedMt, 3),
    awaitingReviewMt: round(awaitingReviewMt, 3),
    unpricedCount,
  };
}

/* ------------------------------------------------------------------ *
 * Phase 06 — stock, position and the production plan
 * ------------------------------------------------------------------ */

export interface StockSummary {
  underProcessMt: Mt;
  readyFinishedMt: Mt;
  reservedMt: Mt;
  smaFlaggedMt: Mt;
  /** Ready and not yet reserved — the only stock a contract can draw on. */
  allocatableMt: Mt;
}

export function stockSummary(lots: StockLot[]): StockSummary {
  const by = (s: StockLot["state"]) =>
    round(sum(lots.filter((l) => l.state === s).map((l) => l.quantityMt)), 3);
  return {
    underProcessMt: by("under_process"),
    readyFinishedMt: by("ready_finished"),
    reservedMt: by("reserved"),
    smaFlaggedMt: round(sum(lots.filter((l) => l.smaFlagged).map((l) => l.quantityMt)), 3),
    allocatableMt: by("ready_finished"),
  };
}

/**
 * The long and short position report of v2.0 §6.1 input 1 and §6.6 output 2, by
 * commodity and origin. A negative position is short and passes to sourcing (§6.6
 * exception 1). Only open contracts count — a closed or cancelled contract no longer
 * demands cargo.
 */
export function positionReport(contracts: Contract[], lots: StockLot[]): PositionLine[] {
  const keys = new Set<string>();
  for (const c of contracts) keys.add(`${c.commodityId}|${c.origin}`);
  for (const l of lots) keys.add(`${l.commodityId}|${l.origin}`);

  const open = contracts.filter((c) => c.status !== "completed" && c.status !== "cancelled");

  return [...keys]
    .map((key) => {
      const [commodityId, origin] = key.split("|") as [string, PositionLine["origin"]];
      const mineContracts = open.filter((c) => c.commodityId === commodityId && c.origin === origin);
      const mineLots = lots.filter((l) => l.commodityId === commodityId && l.origin === origin);
      const contractedMt = round(sum(mineContracts.map((c) => c.quantityMt)), 3);
      const allocatedMt = round(
        sum(mineLots.filter((l) => l.state === "reserved").map((l) => l.quantityMt)),
        3,
      );
      const readyMt = round(
        sum(mineLots.filter((l) => l.state === "ready_finished").map((l) => l.quantityMt)),
        3,
      );
      const underProcessMt = round(
        sum(mineLots.filter((l) => l.state === "under_process").map((l) => l.quantityMt)),
        3,
      );
      const positionMt = round(allocatedMt + readyMt - contractedMt, 3);
      return {
        commodityId,
        origin,
        contractedMt,
        allocatedMt,
        readyMt,
        underProcessMt,
        positionMt,
        position: positionMt < 0 ? ("short" as const) : ("long" as const),
      };
    })
    .filter((l) => l.contractedMt > 0 || l.allocatedMt > 0 || l.readyMt > 0 || l.underProcessMt > 0)
    .sort((a, b) => a.positionMt - b.positionMt);
}

/** How much of a contract's quantity is reserved against it. */
export function contractAllocation(
  contract: Pick<Contract, "id" | "quantityMt">,
  lots: StockLot[],
): { reservedMt: Mt; remainingMt: Mt; fraction: number; lotCount: number } {
  const mine = lots.filter((l) => l.allocatedContractId === contract.id && l.state === "reserved");
  const reservedMt = round(sum(mine.map((l) => l.quantityMt)), 3);
  return {
    reservedMt,
    remainingMt: round(contract.quantityMt - reservedMt, 3),
    fraction: contract.quantityMt > 0 ? Math.min(1, reservedMt / contract.quantityMt) : 0,
    lotCount: mine.length,
  };
}

/**
 * v2.0 §6.6 input 4 with register C-24's firm rule: the weekly production plan is
 * built on raw materials **actually received**, so planned-but-unreceived quantity is
 * excluded. This recomputes each week's `receivedRawMt` from confirmed intake
 * receipts and reports where the stored figure disagrees.
 */
export function productionPlanCheck(
  week: ProductionPlanWeek,
  receipts: IntakeReceipt[],
  agreements: PurchaseAgreement[],
): { derivedReceivedMt: Mt; storedReceivedMt: Mt; agrees: boolean; excludedUnpriced: number } {
  const weekEnd = addIsoDays(week.weekStarting, 6);
  let derived = 0;
  let excluded = 0;
  for (const r of receipts) {
    if (r.location !== week.facility) continue;
    if (r.receiptDate < week.weekStarting || r.receiptDate > weekEnd) continue;
    const agreement = agreements.find((a) => a.id === r.purchaseAgreementId);
    if (!agreement || agreement.commodityId !== week.commodityId) continue;
    if (!r.pricing || r.pricing.status !== "confirmed") {
      excluded += 1;
      continue;
    }
    derived += receiptWeights(r, agreement).netMt ?? 0;
  }
  const derivedReceivedMt = round(derived, 3);
  return {
    derivedReceivedMt,
    storedReceivedMt: week.receivedRawMt,
    agrees: Math.abs(derivedReceivedMt - week.receivedRawMt) < 0.01,
    excludedUnpriced: excluded,
  };
}

/** Local, dependency-free date arithmetic so this module stays pure. */
function addIsoDays(d: string, n: number): string {
  const t = Date.parse(`${d}T00:00:00Z`) + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ *
 * Funding — MMP Funds and Agent Balances
 * ------------------------------------------------------------------ */

/** MMP: `Value In USD` = `Value In SDG` ÷ `Exchange Rate`. Verified: 1,000,000 ÷ 600 = 1,666.67. */
/**
 * The exchange rate that applies to a fund — read, never entered.
 *
 * The business instruction of 27 August 2026 makes it "read only, auto calculated based
 * on the currency exchange during the actual payment date". So it is a lookup against
 * `data/fx-rates.ts` on the fund's **actual** payment date, and it does not exist until
 * that date does. A fund that has been requested but not paid therefore has no rate and
 * no value in USD, which is the honest answer rather than zero.
 */
export function fundExchangeRate(
  fund: Pick<Fund, "localCurrency" | "actualPaymentDate">,
): FxRate | undefined {
  return exchangeRateOn(fund.localCurrency, fund.actualPaymentDate);
}

/**
 * `Value In USD` — the value in local currency divided by the rate in force on the actual
 * payment date.
 *
 * The division is the legacy module's own formula and the one calculated field it got
 * right (1,000,000 ÷ 600 = 1,666.67); what has changed is where the divisor comes from.
 * Returns `undefined` where no rate applies — an unpaid fund has no USD value, and saying
 * so is not the same as saying zero.
 */
export function fundValueUsd(
  fund: Pick<Fund, "valueLocal" | "localCurrency" | "actualPaymentDate">,
): Money | undefined {
  const rate = fundExchangeRate(fund);
  if (!rate || !rate.perUsd) return undefined;
  return money(round(fund.valueLocal / rate.perUsd, 2), "USD");
}

/** The fund's value as it stands in the local currency it was raised in. */
export function fundValueLocal(fund: Pick<Fund, "valueLocal" | "localCurrency">): Money {
  return money(fund.valueLocal, fund.localCurrency);
}

/**
 * Whether a fund has been paid — the one thing that distinguishes the two screens' worth
 * of data. Ours: the instruction splits the fields across Create and Update and does not
 * name a status, so nothing is asserted beyond "an actual payment date has been recorded".
 */
export function fundIsPaid(fund: Pick<Fund, "actualPaymentDate">): boolean {
  return Boolean(fund.actualPaymentDate);
}

/**
 * How late the payment was against the date it was required by, in days. Ours, and shown
 * as an observation rather than a rule: nothing in the instruction says a late payment is
 * refused, escalated or even flagged, so nothing here does more than count the days.
 * Negative means paid early; `undefined` means not yet paid.
 */
export function fundPaymentDelayDays(
  fund: Pick<Fund, "requiredPaymentDate" | "actualPaymentDate">,
): number | undefined {
  if (!fund.actualPaymentDate) return undefined;
  return daysBetween(fund.requiredPaymentDate, fund.actualPaymentDate);
}

export interface AgentPosition {
  supplierId: string;
  seasonality: string;
  actual: Money;
  estimated: Money;
  /** actual − estimated. Zero on every captured legacy row, which is why it is shown. */
  divergence: number;
  fundedSdg: number;
  /** Confirmed purchase value drawn against the agent this season. */
  drawnSdg: number;
}

/**
 * MMP states no derivation for either balance and shows them equal on both live rows,
 * so neither is recomputed. What is added is the funding and drawdown either balance
 * would have to reconcile against, so the screen can show that the two are unrelated
 * to any figure in the system today.
 */
export function agentPositions(
  balances: AgentBalance[],
  funds: Fund[],
  receipts: IntakeReceipt[],
  agreements: PurchaseAgreement[],
): AgentPosition[] {
  return balances.map((b) => {
    const fundedSdg = round(
      sum(
        funds
          .filter((f) => f.agentId === b.supplierId && f.seasonality === b.seasonality)
          .map((f) => f.valueLocal),
      ),
      2,
    );
    const mineAgreements = agreements.filter(
      (a) => a.supplierId === b.supplierId && a.seasonality === b.seasonality,
    );
    let drawnSdg = 0;
    for (const a of mineAgreements) {
      for (const r of receipts.filter((x) => x.purchaseAgreementId === a.id)) {
        if (r.pricing?.status !== "confirmed") continue;
        const v = receiptValue(r, a);
        if (v.totalAmount) drawnSdg += v.totalAmount.amount;
      }
    }
    return {
      supplierId: b.supplierId,
      seasonality: b.seasonality,
      actual: b.actualBalance,
      estimated: b.estimatedBalance,
      divergence: round(b.actualBalance.amount - b.estimatedBalance.amount, 2),
      fundedSdg,
      drawnSdg: round(drawnSdg, 2),
    };
  });
}

/* ------------------------------------------------------------------ *
 * Phase 10 — movement
 * ------------------------------------------------------------------ */

export interface MovementTotals {
  trips: number;
  loadedMt: Mt;
  receivedMt: Mt;
  /** loaded − received. v2.0 §6.10 exception: "a variance to be resolved" — owner [OPEN]. */
  varianceMt: Mt;
  /** Trips loaded but with no received figure yet. */
  awaitingReceipt: number;
}

export function movementTotals(trips: { loadedMt: number; receivedMt?: number }[]): MovementTotals {
  const loadedMt = round(sum(trips.map((t) => t.loadedMt)), 3);
  const withReceipt = trips.filter((t) => t.receivedMt !== undefined);
  const receivedMt = round(sum(withReceipt.map((t) => t.receivedMt as number)), 3);
  return {
    trips: trips.length,
    loadedMt,
    receivedMt,
    varianceMt: round(sum(withReceipt.map((t) => t.loadedMt)) - receivedMt, 3),
    awaitingReceipt: trips.length - withReceipt.length,
  };
}
