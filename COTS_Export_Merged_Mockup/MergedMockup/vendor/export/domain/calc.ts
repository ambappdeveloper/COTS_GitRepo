/**
 * Shared calculations.
 *
 * Every function here replaces a legacy calculation that is broken or mis-typed
 * (export-process-update.md §4.3d):
 *   - `PC Remaining QTY` returning -120 on a 100 MT contract
 *   - `Export Contract remaining days` returning contract *duration*, never counting down
 *   - `Contract Renew Remaining Days` returning `#NAME?` on every row
 *   - `Remaining Qty from TR(Bags/Bales)` returning the literal string `NaN`
 *   - `Price MT USD` carrying float noise (1999.999952 for 2000)
 *   - `Total sales amount (MT)` denominated in AED under a label saying USD
 */

import type {
  Charge,
  Contract,
  DocumentCompleteness,
  ExportContract,
  IsoDate,
  Money,
  Mt,
  QuantityBalance,
  Shipment,
  ShipmentDocument,
  ShipmentDocumentKey,
  StuffingOperation,
  TruckReceipt,
  VesselCall,
} from "./types";

/* ------------------------------------------------------------------ *
 * Numeric hygiene
 * ------------------------------------------------------------------ */

/** Round to `dp` decimal places without float noise. Fixes the 1999.999952 defect. */
export function round(value: number, dp = 3): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** dp;
  return Math.round(value * f + Number.EPSILON * Math.sign(value)) / f;
}

/** Never returns NaN — fixes the `Transportation Screen` literal-"NaN" defect. */
export function safeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function sum(values: number[]): number {
  return round(values.reduce((a, b) => a + safeNumber(b), 0));
}

/* ------------------------------------------------------------------ *
 * Money
 * ------------------------------------------------------------------ */

export function money(amount: number, currency: Money["currency"]): Money {
  return { amount: round(amount, 2), currency };
}

/** Sums only same-currency amounts and reports what it could not add. */
export function sumMoney(items: (Money | undefined)[]): { totals: Money[]; skipped: number } {
  const byCurrency = new Map<Money["currency"], number>();
  let skipped = 0;
  for (const m of items) {
    if (!m || !Number.isFinite(m.amount)) {
      skipped += 1;
      continue;
    }
    byCurrency.set(m.currency, round((byCurrency.get(m.currency) ?? 0) + m.amount, 2));
  }
  return {
    totals: [...byCurrency.entries()].map(([currency, amount]) => ({ amount, currency })),
    skipped,
  };
}

export function formatMoney(m?: Money): string {
  if (!m) return "–";
  return `${m.amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${m.currency}`;
}

export function formatMt(v?: Mt): string {
  if (v === undefined || v === null || !Number.isFinite(v)) return "–";
  return `${round(v, 3).toLocaleString()} MT`;
}

export function formatNumber(v?: number): string {
  if (v === undefined || v === null || !Number.isFinite(v)) return "–";
  return v.toLocaleString();
}

/* ------------------------------------------------------------------ *
 * Dates
 * ------------------------------------------------------------------ */

/** The mock-up's "today". Fixed so the demo data reads consistently. */
export const TODAY: IsoDate = "2026-08-17";

export function parseDate(d?: IsoDate): Date | undefined {
  if (!d) return undefined;
  const t = Date.parse(`${d}T00:00:00Z`);
  return Number.isFinite(t) ? new Date(t) : undefined;
}

export function formatDate(d?: IsoDate): string {
  const parsed = parseDate(d);
  if (!parsed) return "–";
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Whole days between two ISO dates (b − a). Returns undefined if either is missing. */
export function daysBetween(a?: IsoDate, b?: IsoDate): number | undefined {
  const da = parseDate(a);
  const db = parseDate(b);
  if (!da || !db) return undefined;
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

/**
 * Days remaining from `today` to `target`. Negative when the target has passed.
 *
 * This is the correct version of the legacy `Export Contract remaining days`
 * column, which computes `DATEDIF(issuingDate, validityDate)` — the contract's
 * total duration — and therefore never counts down. All 10 records in that library
 * relate to contracts that expired in 2021 and it still reports a positive 60–63.
 */
export function daysRemaining(target?: IsoDate, today: IsoDate = TODAY): number | undefined {
  return daysBetween(today, target);
}

export function addDays(d: IsoDate, n: number): IsoDate {
  const parsed = parseDate(d);
  if (!parsed) return d;
  parsed.setUTCDate(parsed.getUTCDate() + n);
  return parsed.toISOString().slice(0, 10);
}

export function isOverdue(target?: IsoDate, today: IsoDate = TODAY): boolean {
  const r = daysRemaining(target, today);
  return r !== undefined && r < 0;
}

export function isApproaching(target?: IsoDate, withinDays = 7, today: IsoDate = TODAY): boolean {
  const r = daysRemaining(target, today);
  return r !== undefined && r >= 0 && r <= withinDays;
}

/* ------------------------------------------------------------------ *
 * Contract quantity balance  (rules R2, R3, R4)
 * ------------------------------------------------------------------ */

export function maxAllowedQuantity(contract: Pick<Contract, "quantityMt" | "tolerancePct">): Mt {
  return round(contract.quantityMt * (1 + safeNumber(contract.tolerancePct) / 100), 3);
}

/**
 * Rule R4 — remaining quantity is clamped at zero and never negative.
 * The legacy `EX Contract Request` form saved `PC Remaining QTY = -120` against a
 * 100 MT contract while its reconciliation field reported agreement.
 */
export function quantityBalance(
  contract: Pick<Contract, "quantityMt" | "tolerancePct">,
  opts: { plannedMt?: Mt; readyMt?: Mt; shippedMt?: Mt },
): QuantityBalance {
  const maxAllowedMt = maxAllowedQuantity(contract);
  const plannedMt = round(safeNumber(opts.plannedMt));
  const readyMt = round(safeNumber(opts.readyMt));
  const shippedMt = round(safeNumber(opts.shippedMt));
  const remainingMt = Math.max(0, round(contract.quantityMt - shippedMt));
  const shippedFraction =
    contract.quantityMt > 0 ? Math.min(1, round(shippedMt / contract.quantityMt, 4)) : 0;
  return {
    contractQuantityMt: contract.quantityMt,
    tolerancePct: contract.tolerancePct,
    maxAllowedMt,
    plannedMt,
    readyMt,
    shippedMt,
    remainingMt,
    shippedFraction,
  };
}

/** Rule R3 — Σ lot quantities must not exceed contract quantity × (1 + tolerance). */
export function validateLotTotal(
  contract: Pick<Contract, "quantityMt" | "tolerancePct">,
  lotQuantities: Mt[],
): { valid: boolean; total: Mt; max: Mt; message?: string } {
  const total = sum(lotQuantities);
  const max = maxAllowedQuantity(contract);
  if (total > max) {
    return {
      valid: false,
      total,
      max,
      message: `Lot quantities total ${formatMt(total)}, which exceeds the contract ceiling of ${formatMt(
        max,
      )} (${formatMt(contract.quantityMt)} + ${contract.tolerancePct}% tolerance).`,
    };
  }
  return { valid: true, total, max };
}

/**
 * Rule R3 applied to an export-contract request.
 * Evidence: `EX Contract Request` Form No.1 requested 110 MT against a 100 MT
 * contract with a 5% tolerance (ceiling 105) and saved.
 */
export function validateExportContractRequest(
  contract: Pick<Contract, "quantityMt" | "tolerancePct">,
  requestedMt: Mt,
  alreadyRequestedMt = 0,
): { valid: boolean; message?: string } {
  const max = maxAllowedQuantity(contract);
  const total = round(requestedMt + alreadyRequestedMt);
  if (requestedMt <= 0) {
    return { valid: false, message: "Requested quantity must be greater than zero." };
  }
  if (total > max) {
    return {
      valid: false,
      message: `Requesting ${formatMt(requestedMt)} would take the total to ${formatMt(
        total,
      )}, above the contract ceiling of ${formatMt(max)} (${formatMt(contract.quantityMt)} + ${
        contract.tolerancePct
      }% tolerance).`,
    };
  }
  return { valid: true };
}

/**
 * Rule R5 — Σ EX-form quantity must equal the export-contract quantity.
 * Evidence: `Export form details` Form No937 carries PC QTY 600, export-contract
 * total 783 and issued EX forms summing to 783.6 — three totals, none matching.
 */
export function validateExportFormTotal(
  exportContract: Pick<ExportContract, "actualQuantityMt" | "requestedQuantityMt" | "exportForms">,
  toleranceMt = 0.001,
): { valid: boolean; formsTotal: Mt; contractTotal: Mt; message?: string } {
  const contractTotal = round(
    safeNumber(exportContract.actualQuantityMt ?? exportContract.requestedQuantityMt),
  );
  const formsTotal = sum(exportContract.exportForms.map((f) => f.quantityMt));
  if (Math.abs(formsTotal - contractTotal) > toleranceMt) {
    return {
      valid: false,
      formsTotal,
      contractTotal,
      message: `Issued EX forms total ${formatMt(formsTotal)} against an export contract of ${formatMt(
        contractTotal,
      )} — a difference of ${formatMt(round(Math.abs(formsTotal - contractTotal)))}.`,
    };
  }
  return { valid: true, formsTotal, contractTotal };
}

/** Export-contract consumption — the LV `Export Contract Tracking` concept, rebuilt (rule R6). */
export function exportContractConsumption(ec: ExportContract): {
  contractQuantityMt: Mt;
  usedMt: Mt;
  remainingMt: Mt;
  usedFraction: number;
  formsIssued: number;
  formsUsed: number;
} {
  const contractQuantityMt = round(safeNumber(ec.actualQuantityMt ?? ec.requestedQuantityMt));
  const usedMt = sum(ec.consumption.map((c) => c.quantityMt));
  const remainingMt = Math.max(0, round(contractQuantityMt - usedMt));
  return {
    contractQuantityMt,
    usedMt,
    remainingMt,
    usedFraction: contractQuantityMt > 0 ? Math.min(1, round(usedMt / contractQuantityMt, 4)) : 0,
    formsIssued: ec.exportForms.length,
    formsUsed: ec.exportForms.filter((f) => f.status === "used").length,
  };
}

/** Rule R13 — the EX contract must still be valid on the planned shipment date. */
export function exportContractExpiryRisk(
  ec: Pick<ExportContract, "expiryDate">,
  plannedShipmentDate?: IsoDate,
  today: IsoDate = TODAY,
): { level: "none" | "warning" | "critical"; message?: string; daysLeft?: number } {
  if (!ec.expiryDate) return { level: "none" };
  const daysLeft = daysRemaining(ec.expiryDate, today);
  if (daysLeft !== undefined && daysLeft < 0) {
    return {
      level: "critical",
      daysLeft,
      message: `The export contract expired ${Math.abs(daysLeft)} day(s) ago (${formatDate(ec.expiryDate)}).`,
    };
  }
  if (plannedShipmentDate) {
    const slack = daysBetween(plannedShipmentDate, ec.expiryDate);
    if (slack !== undefined && slack < 0) {
      return {
        level: "critical",
        daysLeft,
        message: `The export contract expires ${formatDate(
          ec.expiryDate,
        )}, ${Math.abs(slack)} day(s) before the planned shipment date of ${formatDate(plannedShipmentDate)}.`,
      };
    }
  }
  if (daysLeft !== undefined && daysLeft <= 14) {
    return {
      level: "warning",
      daysLeft,
      message: `The export contract expires in ${daysLeft} day(s), on ${formatDate(ec.expiryDate)}.`,
    };
  }
  return { level: "none", daysLeft };
}

/**
 * Which export contract a shipment draws on — 14 September 2026.
 *
 * THE GAP THIS CLOSES. `Shipment.exportContractId` was written by the seed and by nothing
 * else: `createShipment` set it to `undefined` and no operation ever filled it, so the
 * shipment's Pre-clearance tab read "No export contract linked to this shipment" on every
 * record the mock-up made, however many contracts had been issued against its PC. The link
 * was implicit while execution planning sat between the two records and was lost when that
 * was removed on 8 September — the same seam that moved the request number from
 * `<planning no>-R<n>` to `<contract no>-R<n>`.
 *
 * ONE CANDIDATE IS THE ANSWER. A sole export contract on the purchase contract is the one
 * the shipment draws on whatever its stage: a shipment can be raised while the request is
 * still with the ministry, and the tab shows the status chip, so nothing is hidden by
 * linking a request that is not yet issued.
 *
 * SEVERAL CANDIDATES NEED A PERSON. Where more than one exists — a re-raised request after a
 * rejection, or a second contract on a large-volume PC — the choice is the operator's, and
 * inference would be a guess presented as a record. The one exception is an unambiguous
 * issued contract: if exactly one of them is live, the others are requests or spent, and
 * that one is the answer. Otherwise this returns nothing and the Pre-clearance tab asks.
 */
export function inferExportContractId(
  candidates: Pick<ExportContract, "id" | "status">[],
): string | undefined {
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0].id;
  const live = candidates.filter((e) => e.status === "issued" || e.status === "expiring_soon");
  return live.length === 1 ? live[0].id : undefined;
}

/**
 * How much of an export contract the shipments linked to it have taken up.
 *
 * Reported, not enforced (decision D-10). No source states a ceiling on what may be drawn
 * against one export contract, and rule R6 says the opposite of a ceiling — "one EX contract
 * may be consumed across many PCs". So over-allocation is surfaced and the link still saves:
 * the mock-up's job here is to show the operator a total they cannot see today, not to
 * invent a refusal the business has not asked for.
 *
 * The basis is the actual quantity once the ministry has answered, and the requested
 * quantity before that — the two are equal on PC-2059 and differ whenever the ministry
 * issues for less than was asked.
 */
export function exportContractAllocation(
  ec: Pick<ExportContract, "requestedQuantityMt" | "actualQuantityMt">,
  linkedShipments: Pick<Shipment, "quantityMt">[],
): { basis: "actual" | "requested"; issuedMt: Mt; linkedMt: Mt; remainingMt: Mt; overAllocated: boolean } {
  const basis = ec.actualQuantityMt !== undefined ? "actual" : "requested";
  const issuedMt = round(ec.actualQuantityMt ?? ec.requestedQuantityMt);
  const linkedMt = round(linkedShipments.reduce((acc, s) => acc + s.quantityMt, 0));
  return {
    basis,
    issuedMt,
    linkedMt,
    remainingMt: round(issuedMt - linkedMt),
    overAllocated: linkedMt > issuedMt,
  };
}

/* ------------------------------------------------------------------ *
 * Document completeness
 * ------------------------------------------------------------------ */

const DOC_WEIGHT: Record<string, number> = {
  not_required: 1,
  not_issued: 0,
  draft_received: 0.34,
  amendment_requested: 0.2,
  confirmed: 0.67,
  original_received: 1,
};

export function documentCompleteness(documents: ShipmentDocument[]): DocumentCompleteness {
  const required = documents.filter((d) => d.required && d.state !== "not_required");
  const atOriginal = required.filter((d) => d.state === "original_received").length;
  const atConfirmed = required.filter((d) => d.state === "confirmed").length;
  const atDraft = required.filter((d) => d.state === "draft_received").length;
  const outstanding: ShipmentDocumentKey[] = required
    .filter((d) => d.state !== "original_received")
    .map((d) => d.key);
  const weighted = required.reduce((acc, d) => acc + (DOC_WEIGHT[d.state] ?? 0), 0);
  return {
    required: required.length,
    atOriginal,
    atConfirmed,
    atDraft,
    outstanding,
    fraction: required.length > 0 ? round(weighted / required.length, 4) : 1,
  };
}

/** Rule — a prerequisite document must be at `original_received` before a milestone clears. */
export function documentPrerequisitesMet(
  documents: ShipmentDocument[],
  requiredKeys: ShipmentDocumentKey[],
): { met: boolean; missing: ShipmentDocumentKey[] } {
  const missing = requiredKeys.filter((key) => {
    const doc = documents.find((d) => d.key === key);
    if (!doc) return true;
    if (doc.state === "not_required") return false;
    return doc.state !== "original_received";
  });
  return { met: missing.length === 0, missing };
}

/* ------------------------------------------------------------------ *
 * Stuffing and weights
 * ------------------------------------------------------------------ */

export function stuffingTotals(s: StuffingOperation): {
  quantityMt: Mt;
  bagsOrBales: number;
  days: number;
  containersStuffed: number;
} {
  return {
    quantityMt: sum(s.days.map((d) => d.quantityMt)),
    bagsOrBales: sum(s.days.map((d) => d.bagsOrBales)),
    days: s.days.length,
    containersStuffed: safeNumber(
      s.containersStuffedToDate ?? s.containers.filter((c) => c.stuffedOn).length,
    ),
  };
}

/** Rule R16 — net weight is derived from gross less packaging tare, never typed. */
export const PACKAGING_TARE_KG = {
  bpBags: 0.09,
  spBags: 0.11,
  juteBags: 0.65,
  juteBales: 1.8,
  plasticBales: 1.2,
  tricoBales: 1.5,
} as const;

export function truckNetWeight(t: TruckReceipt): { tareKg: number; netKg: number } {
  const p = t.packaging;
  const tareKg = round(
    p.bpBags * PACKAGING_TARE_KG.bpBags +
      p.spBags * PACKAGING_TARE_KG.spBags +
      p.juteBags * PACKAGING_TARE_KG.juteBags +
      p.juteBales * PACKAGING_TARE_KG.juteBales +
      p.plasticBales * PACKAGING_TARE_KG.plasticBales +
      p.tricoBales * PACKAGING_TARE_KG.tricoBales,
    2,
  );
  return { tareKg, netKg: round(Math.max(0, safeNumber(t.grossWeightKg) - tareKg), 2) };
}

/* ------------------------------------------------------------------ *
 * Demurrage  (rule R15)
 * ------------------------------------------------------------------ */

/**
 * Time alongside = ATD − ATB, and demurrage accrues beyond the agreed laytime.
 * The legacy `Vessel at PZU` library stores each of these dates twice, once as a
 * real Date and once as Text, and the estimate depends on which pair you pick.
 */
export function demurrageEstimate(v: VesselCall): {
  timeAlongsideDays?: number;
  overDays?: number;
  estimate?: Money;
} {
  const timeAlongsideDays = daysBetween(v.atb, v.atd);
  if (timeAlongsideDays === undefined || v.agreedLaytimeDays === undefined) {
    return { timeAlongsideDays };
  }
  const overDays = Math.max(0, timeAlongsideDays - v.agreedLaytimeDays);
  if (!v.demurrageRatePerDay) return { timeAlongsideDays, overDays };
  return {
    timeAlongsideDays,
    overDays,
    estimate: money(overDays * v.demurrageRatePerDay.amount, v.demurrageRatePerDay.currency),
  };
}

/* ------------------------------------------------------------------ *
 * Charges
 * ------------------------------------------------------------------ */

export function chargeTotals(charges: Charge[]): {
  totals: Money[];
  outstandingCount: number;
  paidCount: number;
  notApplicableCount: number;
  skipped: number;
} {
  const applicable = charges.filter((c) => c.status !== "not_applicable");
  const { totals, skipped } = sumMoney(applicable.map((c) => c.amount));
  return {
    totals,
    outstandingCount: applicable.filter((c) => c.status !== "paid").length,
    paidCount: applicable.filter((c) => c.status === "paid").length,
    notApplicableCount: charges.length - applicable.length,
    skipped,
  };
}

/* ------------------------------------------------------------------ *
 * Sales-order pricing  (rule R17) — with the currency made explicit
 * ------------------------------------------------------------------ */

export function salesOrderPricing(input: {
  unitPricePerMtAed: number;
  aedToUsdRate: number;
  actuallyExportedMt: Mt;
  bagsPerMt?: number;
}): {
  pricePerMtUsd: Money;
  unitPricePerBagAed: Money;
  totalSalesAmountAed: Money;
} {
  const bagsPerMt = input.bagsPerMt ?? 40;
  return {
    // Rounded to 2dp — the legacy column carries float noise on 77 records.
    pricePerMtUsd: money(input.unitPricePerMtAed * input.aedToUsdRate, "USD"),
    unitPricePerBagAed: money(input.unitPricePerMtAed / bagsPerMt, "AED"),
    // Explicitly AED. The legacy field sits under a label reading USD.
    totalSalesAmountAed: money(input.unitPricePerMtAed * input.actuallyExportedMt, "AED"),
  };
}

/* ------------------------------------------------------------------ *
 * Free-day / detention exposure  (rule R14)
 * ------------------------------------------------------------------ */

export function freeDayExposure(args: {
  containersReceivedDate?: IsoDate;
  freeDays: number;
  returnedToPortDate?: IsoDate;
  today?: IsoDate;
}): { level: "none" | "warning" | "critical"; daysUsed?: number; daysLeft?: number; message?: string } {
  const today = args.today ?? TODAY;
  if (!args.containersReceivedDate) return { level: "none" };
  const end = args.returnedToPortDate ?? today;
  const daysUsed = daysBetween(args.containersReceivedDate, end);
  if (daysUsed === undefined) return { level: "none" };
  const daysLeft = args.freeDays - daysUsed;
  if (daysLeft < 0) {
    return {
      level: "critical",
      daysUsed,
      daysLeft,
      message: `Free days exceeded by ${Math.abs(daysLeft)} day(s) — detention and port storage are accruing.`,
    };
  }
  if (daysLeft <= 3) {
    return {
      level: "warning",
      daysUsed,
      daysLeft,
      message: `${daysLeft} free day(s) remaining of ${args.freeDays} — return the containers to avoid detention.`,
    };
  }
  return { level: "none", daysUsed, daysLeft };
}

/* ------------------------------------------------------------------ *
 * Shipment-level roll-ups used by the dashboard
 * ------------------------------------------------------------------ */

export function shipmentProgress(s: Shipment): number {
  const total = s.milestones.filter((m) => m.state !== "not_applicable").length;
  if (total === 0) return 0;
  const done = s.milestones.filter((m) => m.state === "completed").length;
  return round(done / total, 4);
}

export function shipmentHasBlocker(s: Shipment): boolean {
  return s.status === "blocked" || s.milestones.some((m) => m.state === "blocked");
}

export function shipmentOverdueCount(s: Shipment): number {
  return s.milestones.filter((m) => m.state === "overdue").length;
}

/* ------------------------------------------------------------------ *
 * Seasonality — the crop year a contract draws on
 * ------------------------------------------------------------------ */

/**
 * The crop year, as `YYYY-YYYY`, that a contract's shipment period draws on.
 *
 * WHY THIS EXISTS. The execution plan carries a seasonality and the instruction of
 * 6 September 2026 removed the field from the create screen — *"remove the seasonality
 * because it is already inherited based on the purchase contract."* The contract is
 * where it should come from, and there is a problem with that which is stated here
 * rather than hidden: **the contract record carries no season.** Nothing in COTS does.
 * So the value is derived from the one thing the contract does carry that bears on it,
 * the shipment period, using the convention below.
 *
 * THE CONVENTION, and it is [ASSUMPTION], not [AS-IS]. The crop is harvested towards the
 * end of the calendar year, so a shipment period beginning before October draws on the
 * crop of the previous year and is labelled `(Y-1)-Y`; one beginning in October or later
 * draws on the new crop and is labelled `Y-(Y+1)`. October is the boundary because it is
 * the only one consistent with the captured data: all six contracts start between June
 * and August 2026 and all seven of their plans carry `2025-2026`, so any boundary from
 * September onwards reproduces them and any earlier one does not. That is evidence for
 * the boundary being late in the year, and not evidence that it is October precisely.
 *
 * A business that confirms a different rule — or, better, puts a season on the contract —
 * replaces this function. It is deliberately one small pure function for that reason.
 */
export function cropYearOf(shipmentPeriodStart: IsoDate | undefined): string {
  if (!shipmentPeriodStart) return "";
  const year = Number(shipmentPeriodStart.slice(0, 4));
  const month = Number(shipmentPeriodStart.slice(5, 7));
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return "";
  return month >= 10 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}
