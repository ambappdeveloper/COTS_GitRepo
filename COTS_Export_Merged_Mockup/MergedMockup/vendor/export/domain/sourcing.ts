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
  PurchaseOrder,
  PurchaseOrderLine,
  QualityInspection,
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
  fund: Pick<Fund, "valueLocal" | "localCurrency" | "actualPaymentDate"> &
    Partial<Pick<Fund, "issuedPaymentLocal">>,
): Money | undefined {
  const rate = fundExchangeRate(fund);
  if (!rate || !rate.perUsd) return undefined;
  return money(round(fundConvertedLocalAmount(fund) / rate.perUsd, 2), "USD");
}

/**
 * Which local amount the USD conversion divides.
 *
 * The instruction of 3 September 2026 is explicit: *"the calculation of usd conversion is
 * based on the Issued Payment amount"*. So the issued amount governs wherever it has been
 * recorded, and the value requested on the Create screen is the fallback — a captured
 * fund that predates the field still converts, and converts the only figure it holds.
 */
export function fundConvertedLocalAmount(
  fund: Pick<Fund, "valueLocal"> & Partial<Pick<Fund, "issuedPaymentLocal">>,
): number {
  return fund.issuedPaymentLocal ?? fund.valueLocal;
}

/** The issued payment amount as money, where one has been recorded. */
export function fundIssuedPaymentLocal(
  fund: Pick<Fund, "localCurrency"> & Partial<Pick<Fund, "issuedPaymentLocal">>,
): Money | undefined {
  return fund.issuedPaymentLocal === undefined
    ? undefined
    : money(fund.issuedPaymentLocal, fund.localCurrency);
}

/**
 * What the issued amount differs from the requested value by, in the local currency.
 *
 * Ours, and an observation only: nothing states that the two must agree, so a shortfall
 * or an overpayment is reported on the screen and refused nowhere.
 */
export function fundIssuedVariance(
  fund: Pick<Fund, "valueLocal" | "localCurrency"> & Partial<Pick<Fund, "issuedPaymentLocal">>,
): Money | undefined {
  if (fund.issuedPaymentLocal === undefined) return undefined;
  return money(round(fund.issuedPaymentLocal - fund.valueLocal, 2), fund.localCurrency);
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

/* ================================================================== *
 * AGENT ACCOUNTS — the two balance bases of the CIM weekly purchase report
 *
 * SOURCE. `Funding - CIM Weekly Purchase Report.xlsx`, sheet **Agents Accounts**,
 * columns P–W. That block is the business's own agent reconciliation, and it is the
 * model this screen now follows. Its six figures and their formulas, read off the
 * sheet rather than inferred from its labels:
 *
 *   Payments SDG                   VLOOKUP into the Cash/Transfer payments pivot
 *   Agreed Purchases SDG           VLOOKUP into the Cost-of-Materials pivot
 *   Balance Basis Agreement SDG    = Payments − Agreed Purchases
 *   Value Received SDG             VLOOKUP into the Value-Delivered pivot
 *   Balance Basis Delivery SDG     = Payments − Value Received
 *   Cargo not Delivered            = Balance Basis Delivery − Balance Basis Agreement
 *
 * WHY TWO BASES, AND WHY IT MATTERS. The agent is funded before the goods arrive, so
 * "what does this agent owe us" has two different answers and the sheet computes both.
 * Against the **agreement** it asks: have we paid more than we agreed to buy? Against
 * the **delivery** it asks: have we paid more than has actually arrived? The gap
 * between the two answers is cargo agreed and not yet delivered — which is why the
 * last column reduces exactly to `Agreed Purchases − Value Received`. Nothing in this
 * prototype computed either basis before: it showed funding and drawdown, which is one
 * basis and a half.
 *
 * FOUR THINGS THE SOURCE DOES THAT ARE WORTH STATING RATHER THAN COPYING SILENTLY.
 *
 *   · **Barter is not a payment.** `Payments SDG` reads only the Cash/Transfer pivot.
 *     The sheet loads a Payments-Made-in-Barter pivot beside it and no column reads it,
 *     so a barter fund does not count against the agent's balance at all. Reproduced,
 *     because it is what the report does — and reported separately, because a fund of
 *     mode `barter` exists in this system and silently dropping it would be the kind of
 *     omission nobody notices until a settlement is wrong.
 *
 *   · **The Balance Basis Delivery label is reversed.** The sheet's own annotation reads
 *     "VALUE Received SDG - Payments SDG"; the formula is `=R−U`, Payments − Value
 *     Received. The formula is followed, since it is what produced every figure in the
 *     report, and the discrepancy is recorded rather than resolved.
 *
 *   · **Cargo not Delivered is populated on three rows out of forty-nine**, and not on
 *     the Total row. It is a formula somebody filled downward part of the way. Computed
 *     for every row here, because a column that exists for three rows is not a column.
 *
 *   · **A negative balance is a real state.** One captured agent has received more value
 *     than has been paid — Balance Basis Delivery of −58.77m — so neither basis can be
 *     floored at zero. Which direction a positive figure means is still unstated by any
 *     source, and this screen still declines to assert one.
 *
 * THE ONE FIGURE THIS MODEL CANNOT SUPPLY, AND WHY. `Agreed Purchases SDG` is the
 * agreed quantity times the agreed price, and **a purchase agreement in this prototype
 * holds no price**. In the source it does: the Purchase Details Master carries
 * `Price SDG/MT`, `Total Cost SDG` and `Value Delivered SDG` on the agreement row. Here
 * the price exists only on a *receipt*, put there by the separate pricing step of §6.6.
 * So the agreement's price is read back from its own priced receipts — one price per
 * agreement, which is what the sheet's own note assumes when it defines Value Received
 * as "material receipt multiplied by the price for the agreement". Where no receipt on
 * an agreement has been priced there is no price to read, that agreement contributes
 * nothing to the agreement basis, and the count of such agreements is returned so the
 * screen can say the figure is partial rather than showing a smaller number as though it
 * were complete. **[OPEN] The purchase agreement should carry its agreed price.** Until
 * it does, this column is a reconstruction of the business's own figure rather than the
 * figure itself.
 * ================================================================== */

export interface AgentPosition {
  supplierId: string;
  seasonality: string;
  /* --- the two stored MMP balances, neither recomputed --- */
  actual: Money;
  estimated: Money;
  /** actual − estimated. Zero on every captured legacy row, which is why it is shown. */
  divergence: number;
  /* --- the CIM report's six figures --- */
  /** `Payments SDG` — funds issued to the agent this season, excluding barter. */
  paymentsSdg: number;
  /** Barter funds, which the source excludes from Payments. Shown, never added in. */
  barterSdg: number;
  /** `Agreed Purchases SDG` — Σ agreed quantity × the agreement's price. */
  agreedPurchasesSdg: number;
  /** `Balance Basis Agreement SDG` — Payments − Agreed Purchases. */
  balanceBasisAgreementSdg: number;
  /** `Value Received SDG` — Σ confirmed receipt value on this agent's agreements. */
  valueReceivedSdg: number;
  /** `Balance Basis Delivery SDG` — Payments − Value Received. */
  balanceBasisDeliverySdg: number;
  /** `Cargo not Delivered` — Agreed Purchases − Value Received. */
  cargoNotDeliveredSdg: number;
  /* --- what the figures above could not account for --- */
  /** Agreements whose price is unknown, so the agreement basis is short by their value. */
  agreementsWithoutPrice: number;
  /** Agreements held for this agent and season. */
  agreements: number;
  /** Receipts booked but not yet priced, so absent from Value Received. */
  receiptsNotPriced: number;
  /** Amounts skipped because they are not in SDG, which the source never mixes. */
  nonSdgAmounts: number;
}

/**
 * The price per MT an agreement was struck at, read back from its own priced receipts.
 *
 * A reconstruction, and the reason is above: the agreement holds no price in this model
 * and the receipt does. Where more than one priced receipt disagrees the first is taken
 * and the disagreement is not hidden — `agreementsWithoutPrice` counts only the absent
 * case, so a screen wanting to report disagreement should compare the receipts itself.
 *
 * `pricePerLb` is converted at `LB_PER_MT`, the same constant every other weight
 * derivation in this file uses.
 */
export function agreementPricePerMt(
  agreementId: string,
  receipts: IntakeReceipt[],
): Money | undefined {
  const priced = receipts.find((r) => r.purchaseAgreementId === agreementId && r.pricing);
  if (!priced?.pricing) return undefined;
  const perLb = priced.pricing.pricePerLb;
  return money(round(perLb.amount * LB_PER_MT, 2), perLb.currency);
}

/**
 * The agent accounts, one row per stored balance.
 *
 * The two stored balances are carried through untouched — MMP states no derivation for
 * either and shows them equal on every captured row, so neither is recomputed. What is
 * computed beside them is the CIM report's own reconciliation, so the screen can show
 * what the stored balances would have to agree with and, on the captured data, do not.
 */
export function agentPositions(
  balances: AgentBalance[],
  funds: Fund[],
  receipts: IntakeReceipt[],
  agreements: PurchaseAgreement[],
): AgentPosition[] {
  return balances.map((b) => {
    const mine = funds.filter((f) => f.agentId === b.supplierId && f.seasonality === b.seasonality);
    let nonSdgAmounts = 0;

    /* Payments: cash and finance, never barter — the source's own exclusion. The issued
       amount governs where one has been recorded, which is the rule the fund's own USD
       conversion follows, so the two figures cannot disagree about what was paid. */
    let paymentsSdg = 0;
    let barterSdg = 0;
    for (const f of mine) {
      const amount = fundConvertedLocalAmount(f);
      if (f.localCurrency !== "SDG") {
        nonSdgAmounts += 1;
        continue;
      }
      if (f.mode === "barter") barterSdg += amount;
      else paymentsSdg += amount;
    }

    const mineAgreements = agreements.filter(
      (a) => a.supplierId === b.supplierId && a.seasonality === b.seasonality,
    );

    let agreedPurchasesSdg = 0;
    let valueReceivedSdg = 0;
    let agreementsWithoutPrice = 0;
    let receiptsNotPriced = 0;

    for (const a of mineAgreements) {
      const price = agreementPricePerMt(a.id, receipts);
      if (!price) agreementsWithoutPrice += 1;
      else if (price.currency !== "SDG") nonSdgAmounts += 1;
      else agreedPurchasesSdg += a.totalQuantityMt * price.amount;

      for (const r of receipts.filter((x) => x.purchaseAgreementId === a.id)) {
        if (!r.pricing) {
          receiptsNotPriced += 1;
          continue;
        }
        /* Confirmed only. Register C-24 makes the same rule for the production plan:
           a receipt awaiting review is not a quantity the business counts on. */
        if (r.pricing.status !== "confirmed") continue;
        const v = receiptValue(r, a);
        if (!v.totalAmount) continue;
        if (v.totalAmount.currency !== "SDG") nonSdgAmounts += 1;
        else valueReceivedSdg += v.totalAmount.amount;
      }
    }

    agreedPurchasesSdg = round(agreedPurchasesSdg, 2);
    valueReceivedSdg = round(valueReceivedSdg, 2);
    paymentsSdg = round(paymentsSdg, 2);

    return {
      supplierId: b.supplierId,
      seasonality: b.seasonality,
      actual: b.actualBalance,
      estimated: b.estimatedBalance,
      divergence: round(b.actualBalance.amount - b.estimatedBalance.amount, 2),
      paymentsSdg,
      barterSdg: round(barterSdg, 2),
      agreedPurchasesSdg,
      /* The sheet's formulas, kept in its own order so they can be read against it. */
      balanceBasisAgreementSdg: round(paymentsSdg - agreedPurchasesSdg, 2),
      valueReceivedSdg,
      balanceBasisDeliverySdg: round(paymentsSdg - valueReceivedSdg, 2),
      cargoNotDeliveredSdg: round(agreedPurchasesSdg - valueReceivedSdg, 2),
      agreementsWithoutPrice,
      agreements: mineAgreements.length,
      receiptsNotPriced,
      nonSdgAmounts,
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

/* ================================================================== *
 * DELIVERY UPDATES — the fourth information card on the agreement view
 *
 * Added by the instruction of 3 September 2026: the Purchase agreement View screen
 * gains one more information card, *Delivery Updates*, showing *"total of the
 * Facility Material Receipt, total of Warehouse Material Receipt and remaining to
 * be delivered"*.
 *
 * WHAT "TOTAL" MEANS HERE. The figure the card totals is the **gross weight with
 * dirt** each receipt was booked at — the one quantity every receipt carries,
 * priced or not, at a facility or at a warehouse. It is deliberately not the net
 * weight: a warehouse receipt can never be priced (the legacy system returns HTTP
 * 500 on both its edit and its pricing route), so a net-weight total would read as
 * though nothing had arrived at a warehouse at all. The intake card beside it
 * continues to show confirmed and awaiting-review net tonnage, which is the figure
 * the weekly production plan reads (v2.0 §6.6 input 4, register C-24) — the two
 * cards answer different questions and the screen says which is which.
 *
 * REMAINING TO BE DELIVERED is the agreed quantity less both totals, floored at
 * zero, with the over-delivered case reported separately rather than shown as a
 * negative remainder.
 * ================================================================== */

export interface DeliveryUpdates {
  agreedMt: Mt;
  facilityReceiptMt: Mt;
  facilityReceiptCount: number;
  warehouseReceiptMt: Mt;
  warehouseReceiptCount: number;
  /** Facility plus warehouse. */
  deliveredMt: Mt;
  /** Agreed − delivered, floored at zero. */
  remainingMt: Mt;
  /** By how much delivery exceeds the agreed quantity, where it does. */
  overDeliveredMt: Mt;
  overDelivered: boolean;
  /** Delivered ÷ agreed, capped at 1 for the dial. */
  fraction: number;
}

export function deliveryUpdates(
  agreement: Pick<PurchaseAgreement, "id" | "totalQuantityMt">,
  receipts: IntakeReceipt[],
): DeliveryUpdates {
  const mine = receipts.filter((r) => r.purchaseAgreementId === agreement.id);
  const facility = mine.filter((r) => r.kind === "facility");
  const warehouse = mine.filter((r) => r.kind === "warehouse");
  const facilityReceiptMt = sum(facility.map((r) => r.grossWeightWithDirtMt));
  const warehouseReceiptMt = sum(warehouse.map((r) => r.grossWeightWithDirtMt));
  const deliveredMt = round(facilityReceiptMt + warehouseReceiptMt, 3);
  const agreedMt = agreement.totalQuantityMt;
  const gap = round(agreedMt - deliveredMt, 3);
  return {
    agreedMt,
    facilityReceiptMt: round(facilityReceiptMt, 3),
    facilityReceiptCount: facility.length,
    warehouseReceiptMt: round(warehouseReceiptMt, 3),
    warehouseReceiptCount: warehouse.length,
    deliveredMt,
    remainingMt: gap > 0 ? gap : 0,
    overDeliveredMt: gap < 0 ? Math.abs(gap) : 0,
    overDelivered: gap < 0,
    fraction: agreedMt > 0 ? Math.min(deliveredMt / agreedMt, 1) : 0,
  };
}

/* ================================================================== *
 * QUALITY INSPECTIONS — the card added to the agreement's Edit screen
 * ================================================================== */

export interface QualityInspectionSummary {
  count: number;
  approved: number;
  rejected: number;
  reTest: number;
  /** Inspections with no result recorded yet. */
  pending: number;
  /** Estimated quantity totalled per unit, because the two cannot be added. */
  estimatedMt: Mt;
  estimatedBags: number;
  latestTestDate?: string;
}

/**
 * What the inspections on one agreement add up to.
 *
 * The two estimated quantities are totalled separately and never added: the instruction
 * writes the field as *Estimated Quantity (mt/bags)*, and a tonne and a bag are not the
 * same unit. No bag weight is applied to convert them, because the per-bag tare on the
 * agreement is a *tare* — the weight of the empty packaging — and not the weight of a
 * full bag, so it cannot turn a bag count into a tonnage.
 */
export function qualityInspectionSummary(
  inspections: QualityInspection[],
): QualityInspectionSummary {
  const dates = inspections
    .map((i) => i.actualTestDate)
    .filter((d): d is string => Boolean(d))
    .sort();
  return {
    count: inspections.length,
    approved: inspections.filter((i) => i.result === "approved").length,
    rejected: inspections.filter((i) => i.result === "rejected").length,
    reTest: inspections.filter((i) => i.result === "re_test").length,
    pending: inspections.filter((i) => !i.result).length,
    estimatedMt: round(
      sum(inspections.filter((i) => i.estimatedQuantityUnit === "mt").map((i) => i.estimatedQuantity ?? 0)),
      3,
    ),
    estimatedBags: sum(
      inspections.filter((i) => i.estimatedQuantityUnit === "bags").map((i) => i.estimatedQuantity ?? 0),
    ),
    latestTestDate: dates[dates.length - 1],
  };
}

/* ================================================================== *
 * PROCUREMENT — the purchase order's own derivations
 *
 * The instruction of 3 September 2026 marks the USD conversion on a purchase-order
 * line **read only**, and the list shows a total amount in local currency and a
 * total amount in USD. Both totals are derived here and neither is stored.
 * ================================================================== */

/**
 * The USD conversion of one line — the payment amount divided by the rate in force on
 * that line's own actual payment date.
 *
 * The same rule the fund follows, and for the same reason: a payment that has not been
 * made has no rate, so it has no USD amount either. `undefined` is the honest answer and
 * is not the same as zero.
 */
export function purchaseOrderLineUsd(line: PurchaseOrderLine): Money | undefined {
  if (!line.paymentAmount) return undefined;
  if (line.paymentAmount.currency === "USD") return line.paymentAmount;
  const rate = exchangeRateOn(line.paymentAmount.currency, line.actualPaymentDate);
  if (!rate || !rate.perUsd) return undefined;
  return money(round(line.paymentAmount.amount / rate.perUsd, 2), "USD");
}

/** The rate a line's conversion used, for showing the derivation on screen. */
export function purchaseOrderLineRate(line: PurchaseOrderLine): FxRate | undefined {
  if (!line.paymentAmount || line.paymentAmount.currency === "USD") return undefined;
  return exchangeRateOn(line.paymentAmount.currency, line.actualPaymentDate);
}

export interface PurchaseOrderTotals {
  lines: number;
  agreements: number;
  /** One total per local currency. Amounts are never added across currencies. */
  localAmounts: Money[];
  /** The sum of the per-line conversions, in USD. */
  usdAmount: Money;
  /** Lines carrying a payment amount that cannot be converted, because no rate applies. */
  linesWithoutConversion: number;
  linesWithoutPayment: number;
  linesWithoutPaymentDate: number;
  latestPaymentDate?: string;
}

export function purchaseOrderTotals(
  po: Pick<PurchaseOrder, "lines">,
): PurchaseOrderTotals {
  const byCurrency = new Map<CurrencyCode, number>();
  let usd = 0;
  let linesWithoutConversion = 0;
  for (const l of po.lines) {
    if (!l.paymentAmount) continue;
    byCurrency.set(
      l.paymentAmount.currency,
      round((byCurrency.get(l.paymentAmount.currency) ?? 0) + l.paymentAmount.amount, 2),
    );
    const converted = purchaseOrderLineUsd(l);
    if (converted) usd = round(usd + converted.amount, 2);
    else linesWithoutConversion += 1;
  }
  const dates = po.lines
    .map((l) => l.actualPaymentDate)
    .filter((d): d is string => Boolean(d))
    .sort();
  return {
    lines: po.lines.length,
    agreements: new Set(po.lines.map((l) => l.purchaseAgreementId)).size,
    localAmounts: [...byCurrency.entries()].map(([currency, amount]) => money(amount, currency)),
    usdAmount: money(usd, "USD"),
    linesWithoutConversion,
    linesWithoutPayment: po.lines.filter((l) => !l.paymentAmount).length,
    linesWithoutPaymentDate: po.lines.filter((l) => !l.actualPaymentDate).length,
    latestPaymentDate: dates[dates.length - 1],
  };
}
