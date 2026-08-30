/**
 * Phases 01–02 — the seasonal purchase plan and the budget.
 *
 * WHICH PHASES THESE SERVE. Workflow v2.3 §6.1 (Phase 01, seasonal purchase plan) and
 * §6.2 (Phase 02, budget). Both come from a business requirement of 26 August 2026 and
 * appear in neither source document of §3.1, so both are `[PROPOSED]` throughout.
 *
 * WHAT THIS FILE IS FOR. One place for every figure the two screens show, so the list,
 * the add form and the view form cannot disagree about a total. The same rule the rest
 * of the prototype follows applies here: a derivation that the requirement states is
 * implemented, and a derivation the requirement does not state is either absent or
 * labelled as ours on the screen that shows it.
 *
 * THE ONE THING §6.1 ACTUALLY STATES AS A CALCULATION. Activity 3: "COTS determines the
 * months that fall between the From and To periods and presents them in chronological
 * order." That is `monthsInSeason`, and it is the reason the plan is a header with a
 * generated month grid rather than a flat list of rows.
 *
 * WHAT IS DELIBERATELY ABSENT.
 *   · Any validation or blocking control. §6.1 and §6.2 both state "none stated" under
 *     preconditions, and both ask outright whether the record must be complete before
 *     the user proceeds. `planGaps` and `budgetGaps` therefore *report* what is missing
 *     and nothing refuses a save on the strength of it.
 *   · Any status model for a plan. §6.1: "No status model is defined."
 *   · Any meaning for the budget approval status. The instruction of 26 August 2026
 *     names the field and states no values, no owner and no effect, so nothing here
 *     reads it, orders it or gates on it.
 *   · Any rule tying the budget to the plan. §6.2 asks whether the budget period must
 *     fall inside the seasonal period and whether the budget quantity must reconcile
 *     with the quantity planned. `budgetAgainstPlan` computes both comparisons so a
 *     reviewer can see the answer the data gives, and labels them as open questions
 *     rather than as rules.
 *   · Any unit for `Capacity Needed` beyond the MT the sheet's own header gives it.
 *     §6.1 states no unit and states nothing it is compared against; the Plan sheet
 *     labels the column `Capacity needed MT` and derives it, so the derivation is
 *     implemented as the sheet writes it and what it is compared against stays open.
 *
 * WHERE THE SPREADSHEET SUPERSEDES THE WORKFLOW TEXT. §6.1 activity 4 has the user enter
 * "the commodity, the quantity in MT and the capacity needed" per month. `Export Plan
 * V1.xlsx` does not: capacity is a formula over the commodity's whole row, and the sheet
 * carries a `Notes` column the workflow text never mentions. The sheet is the later and
 * more specific evidence, so the model follows it — capacity is derived, not entered, and
 * the note is captured. Both departures are stated on the screens that make them.
 */

import { sum, sumMoney, TODAY } from "./calc";
import { commodityById } from "../data/master";
import type {
  Budget,
  BudgetLine,
  CommodityGroup,
  IsoDate,
  Money,
  Mt,
  SeasonMonth,
  SeasonalPlanCell,
  SeasonalPlanRow,
  SeasonalPurchasePlan,
} from "./types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/* ------------------------------------------------------------------ *
 * The seasonal period — a month and a year, not a calendar date
 * ------------------------------------------------------------------ */

/** Sortable key for a month, e.g. `{ year: 2026, month: 9 }` → `2026-09`. */
export function seasonMonthKey(m: SeasonMonth): string {
  return `${m.year}-${String(m.month).padStart(2, "0")}`;
}

/** Business-readable month, e.g. "September 2026". */
export function formatSeasonMonth(m?: SeasonMonth): string {
  if (!m) return "–";
  return `${MONTH_NAMES[m.month - 1] ?? String(m.month)} ${m.year}`;
}

/** Negative if `a` is earlier, positive if later, zero if the same month. */
export function compareSeasonMonth(a: SeasonMonth, b: SeasonMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

/** A month is valid when it names a real month of a four-digit year. */
export function isValidSeasonMonth(m?: SeasonMonth): boolean {
  if (!m) return false;
  return Number.isInteger(m.month) && m.month >= 1 && m.month <= 12 && Number.isInteger(m.year);
}

/**
 * §6.1 activity 3 — the months that fall between the From and To periods, in
 * chronological order and inclusive of both ends.
 *
 * A To period earlier than the From period spans nothing. The requirement states no
 * rule for that case, so this returns an empty list and the screens say so rather than
 * silently swapping the two bounds, which would record a period the user did not enter.
 */
export function monthsInSeason(from?: SeasonMonth, to?: SeasonMonth): SeasonMonth[] {
  if (!isValidSeasonMonth(from) || !isValidSeasonMonth(to)) return [];
  const a = from as SeasonMonth;
  const b = to as SeasonMonth;
  if (compareSeasonMonth(a, b) > 0) return [];
  const out: SeasonMonth[] = [];
  let year = a.year;
  let month = a.month;
  // Bounded by construction: the loop advances one month at a time towards `b`.
  while (year * 12 + month <= b.year * 12 + b.month) {
    out.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out;
}

/** How many months the period spans, inclusive. Zero if the period is not usable. */
export function seasonLengthMonths(from?: SeasonMonth, to?: SeasonMonth): number {
  return monthsInSeason(from, to).length;
}

/** The first day of a month, so a plan period can be compared with a budget's dates. */
export function seasonMonthStartIso(m: SeasonMonth): string {
  return `${m.year}-${String(m.month).padStart(2, "0")}-01`;
}

/** The last day of a month, ditto. */
export function seasonMonthEndIso(m: SeasonMonth): string {
  const last = new Date(Date.UTC(m.year, m.month, 0)).getUTCDate();
  return `${m.year}-${String(m.month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ *
 * The seasonal purchase plan — the Plan sheet's own shape
 *
 * `Export Plan V1.xlsx` lays a plan out as commodity down, month across, and
 * two of its columns are formulas rather than entries:
 *
 *   Total QTY/MT       =SUM(C19:L19)
 *   Capacity needed MT =LARGE(C19:L19,1)+LARGE(C19:L19,2)+LARGE(C19:L19,3)
 *
 * The second is the reason capacity is no longer a field a planner types. It is
 * the sum of the three largest months in the commodity's own row — the peak
 * three months of intake, which is what the storage has to hold. Everything
 * here follows that sheet; where the sheet and workflow v2.3 §6.1 differ, the
 * difference is noted on the screen rather than resolved.
 * ------------------------------------------------------------------ */

/** How many of the largest months the capacity formula adds. The sheet uses three. */
export const CAPACITY_PEAK_MONTHS = 3;

/**
 * `Capacity needed MT` — the spreadsheet's formula, generalised.
 *
 * `LARGE(range,1) + LARGE(range,2) + LARGE(range,3)`: the sum of the three largest
 * values in the row. A row with fewer than three months carrying a quantity sums
 * whatever it has, which is what Excel does once the blanks are read as zero — verified
 * against the captured sheet, where NG-Sesame's three months of 450, 900 and 450 give
 * 1,800 and Red-Sesame's two months of 232.5 give 465.
 */
export function capacityNeeded(quantities: (number | undefined)[], peak = CAPACITY_PEAK_MONTHS): number {
  return [...quantities.map((q) => q ?? 0)]
    .sort((a, b) => b - a)
    .slice(0, peak)
    .reduce((a, b) => a + b, 0);
}

/** The cell of one month in a row, or undefined where the row does not reach that month. */
export function cellFor(row: Pick<SeasonalPlanRow, "cells">, m: SeasonMonth): SeasonalPlanCell | undefined {
  return row.cells.find((c) => c.year === m.year && c.month === m.month);
}

/** One row of the rendered grid: the entered cells lined up with the period's months. */
export interface PlanGridRow {
  row: SeasonalPlanRow;
  commodityId?: string;
  group?: CommodityGroup;
  commodityName: string;
  /** One entry per month of the period, in chronological order. Undefined = blank cell. */
  quantities: (number | undefined)[];
  /** `Total QTY/MT` — SUM of the row. */
  totalMt: Mt;
  /** `Capacity needed MT` — the three-largest formula over the row. */
  capacityMt: number;
  note?: string;
}

/**
 * The grid the screens render: one row per commodity on the plan, its quantities lined up
 * with the months the period spans, and the two derived columns.
 *
 * Cells whose month falls outside the period are ignored here rather than dropped from the
 * record — `planGaps` reports them instead, so a period narrowed after the fact never
 * loses data silently.
 */
export function planGrid(plan: Pick<SeasonalPurchasePlan, "from" | "to" | "rows">): PlanGridRow[] {
  const months = monthsInSeason(plan.from, plan.to);
  return plan.rows.map((row) => {
    const quantities = months.map((m) => cellFor(row, m)?.quantityMt);
    const commodity = row.commodityId ? commodityById(row.commodityId) : undefined;
    return {
      row,
      commodityId: row.commodityId,
      group: commodity?.group,
      commodityName: commodity?.name ?? "–",
      quantities,
      totalMt: sum(quantities.map((q) => q ?? 0)),
      capacityMt: capacityNeeded(quantities),
      note: row.note,
    };
  });
}

/** The grid's `Total` footer: a total per month, plus the two derived totals. */
export interface PlanGridTotals {
  /** One per month of the period, in chronological order. */
  perMonth: Mt[];
  /** Grand `Total QTY/MT` — the sheet's `=SUM(C30:L30)`. */
  totalMt: Mt;
  /**
   * Grand `Capacity needed MT` — the sheet's `=SUM(N19:N29)`: the sum of the per-row
   * capacities, NOT the three-largest formula applied to the monthly totals. The two
   * differ, and the sheet uses the former.
   */
  capacityMt: number;
}

export function planGridTotals(grid: PlanGridRow[], monthCount: number): PlanGridTotals {
  const perMonth = Array.from({ length: monthCount }, (_, i) => sum(grid.map((g) => g.quantities[i] ?? 0)));
  return {
    perMonth,
    totalMt: sum(grid.map((g) => g.totalMt)),
    capacityMt: sum(grid.map((g) => g.capacityMt)),
  };
}

export interface PlanTotals {
  /** Months the period spans, from `monthsInSeason`. */
  months: number;
  /** Commodity rows held on the plan. */
  rows: number;
  /** Cells carrying a quantity. */
  filledCells: number;
  quantityMt: Mt;
  /** The sheet's grand capacity: the sum of the per-row three-largest figures. */
  capacityMt: number;
  /** Distinct commodities named on the plan. */
  commodities: number;
  /** Distinct commodity groups the plan touches. */
  groups: number;
}

export function planTotals(plan: Pick<SeasonalPurchasePlan, "from" | "to" | "rows">): PlanTotals {
  const months = monthsInSeason(plan.from, plan.to);
  const grid = planGrid(plan);
  const totals = planGridTotals(grid, months.length);
  return {
    months: months.length,
    rows: plan.rows.length,
    filledCells: grid.reduce((n, g) => n + g.quantities.filter((q) => q !== undefined).length, 0),
    quantityMt: totals.totalMt,
    capacityMt: totals.capacityMt,
    commodities: new Set(plan.rows.map((r) => r.commodityId).filter(Boolean)).size,
    groups: new Set(grid.map((g) => g.group).filter(Boolean)).size,
  };
}

/**
 * The Summary sheet: `Sum of Capacity needed` by `Category` against the `Notes` value,
 * which the captured sheet uses as a location. Reproduced because it is the one place the
 * spreadsheet says what the capacity figure is *for*.
 */
export interface CapacityByGroupRow {
  group: CommodityGroup;
  /** Capacity per distinct note/location, in the order the locations are given. */
  perLocation: number[];
  total: number;
}

export interface CapacitySummary {
  /** The distinct `Notes` values present, sorted. Blank notes appear as "Not recorded". */
  locations: string[];
  rows: CapacityByGroupRow[];
  perLocation: number[];
  grandTotal: number;
}

export const NO_LOCATION = "Not recorded";

export function capacitySummary(grid: PlanGridRow[]): CapacitySummary {
  const locationOf = (g: PlanGridRow) => g.note?.trim() || NO_LOCATION;
  const locations = [...new Set(grid.map(locationOf))].sort();
  const groups = [...new Set(grid.map((g) => g.group).filter((x): x is CommodityGroup => Boolean(x)))];
  const rows = groups.map((group) => {
    const mine = grid.filter((g) => g.group === group);
    const perLocation = locations.map((loc) =>
      sum(mine.filter((g) => locationOf(g) === loc).map((g) => g.capacityMt)),
    );
    return { group, perLocation, total: sum(perLocation) };
  });
  return {
    locations,
    rows,
    perLocation: locations.map((_, i) => sum(rows.map((r) => r.perLocation[i]))),
    grandTotal: sum(rows.map((r) => r.total)),
  };
}

export interface PlanGaps {
  /** Rows carrying no commodity. */
  rowsWithoutCommodity: number;
  /** Rows carrying no quantity in any month of the period. */
  rowsWithNoQuantity: number;
  /** Rows carrying no note. */
  rowsWithoutNote: number;
  /** Months of the period with no quantity against any commodity. */
  monthsWithNoQuantity: SeasonMonth[];
  /** Commodities appearing on more than one row. */
  duplicatedCommodities: string[];
  /** Cells held on the record whose month is outside the period. */
  cellsOutsidePeriod: { commodityId?: string; cell: SeasonalPlanCell }[];
  /** True when nothing above is outstanding. */
  complete: boolean;
}

/**
 * What a plan is missing. Reported, never enforced: §6.1 preconditions state "none" and
 * ask outright whether the plan must be complete before the user proceeds to Phase 02.
 */
export function planGaps(plan: Pick<SeasonalPurchasePlan, "from" | "to" | "rows">): PlanGaps {
  const months = monthsInSeason(plan.from, plan.to);
  const keys = new Set(months.map(seasonMonthKey));
  const grid = planGrid(plan);

  const counts = new Map<string, number>();
  for (const r of plan.rows) {
    if (!r.commodityId) continue;
    counts.set(r.commodityId, (counts.get(r.commodityId) ?? 0) + 1);
  }

  const cellsOutsidePeriod = plan.rows.flatMap((r) =>
    r.cells
      .filter((c) => !keys.has(seasonMonthKey(c)) && c.quantityMt !== undefined)
      .map((cell) => ({ commodityId: r.commodityId, cell })),
  );

  const rowsWithoutCommodity = plan.rows.filter((r) => !r.commodityId).length;
  const rowsWithNoQuantity = grid.filter((g) => g.quantities.every((q) => q === undefined)).length;
  const rowsWithoutNote = plan.rows.filter((r) => !r.note?.trim()).length;
  const monthsWithNoQuantity = months.filter((_, i) => grid.every((g) => g.quantities[i] === undefined));
  const duplicatedCommodities = [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id);

  return {
    rowsWithoutCommodity,
    rowsWithNoQuantity,
    rowsWithoutNote,
    monthsWithNoQuantity,
    duplicatedCommodities,
    cellsOutsidePeriod,
    complete:
      plan.rows.length > 0 &&
      rowsWithoutCommodity === 0 &&
      rowsWithNoQuantity === 0 &&
      rowsWithoutNote === 0 &&
      monthsWithNoQuantity.length === 0 &&
      cellsOutsidePeriod.length === 0,
  };
}

/** Quantity planned for one commodity across the whole plan. */
export function plannedQuantityByCommodity(plan: Pick<SeasonalPurchasePlan, "from" | "to" | "rows">) {
  const out = new Map<string, Mt>();
  for (const g of planGrid(plan)) {
    if (!g.commodityId) continue;
    out.set(g.commodityId, (out.get(g.commodityId) ?? 0) + g.totalMt);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Which plans a budget may be written against, and which commodities
 *
 * A business instruction of 27 August 2026 narrows the budget's two
 * drop-downs: the Plan list offers **only active plans**, and the Commodity
 * list offers **only the commodities the selected plan carries**.
 *
 * The second is unambiguous and is enforced end to end — the commodities on a
 * plan are the commodities on its rows, and a budget line naming any other is
 * refused by the service layer.
 *
 * The first needs a definition the requirement does not give. §6.1 states in as
 * many words that **no status model is defined for a seasonal purchase plan**,
 * so there is no `active` flag to read. The reading taken here, and stated on
 * the screen that takes it, is the least presumptuous one available: a plan is
 * active while **its seasonal period has not ended** — its To month is the
 * current month or a later one. A season still to start is therefore active,
 * because that is the season a budget is written for; a season whose last month
 * has passed is closed. If the business means something else — an explicit
 * flag, an approval, one active plan per country — that is one function to
 * change, and it is recorded as an open question.
 * ------------------------------------------------------------------ */

export type PlanActivity = "active" | "closed";

/**
 * Whether a plan's season has not yet ended, measured against `today`.
 *
 * Ours, not the requirement's: §6.1 defines no status for a plan. A plan whose period
 * spans no months at all is treated as closed, because there is no season to budget for.
 */
export function planActivity(
  plan: Pick<SeasonalPurchasePlan, "from" | "to">,
  today: IsoDate = TODAY,
): PlanActivity {
  const months = monthsInSeason(plan.from, plan.to);
  if (months.length === 0) return "closed";
  const last = months[months.length - 1];
  const [y, m] = today.split("-");
  const now = { year: Number(y), month: Number(m) };
  return compareSeasonMonth(last, now) >= 0 ? "active" : "closed";
}

export function isPlanActive(
  plan: Pick<SeasonalPurchasePlan, "from" | "to">,
  today: IsoDate = TODAY,
): boolean {
  return planActivity(plan, today) === "active";
}

/** The plans a new budget may name: the active ones, earliest season first. */
export function activePlans<T extends Pick<SeasonalPurchasePlan, "from" | "to">>(
  plans: T[],
  today: IsoDate = TODAY,
): T[] {
  return plans.filter((p) => isPlanActive(p, today)).sort((a, b) => compareSeasonMonth(a.from, b.from));
}

/** One commodity a plan carries, with what the plan plans for it. */
export interface PlanCommodity {
  commodityId: string;
  name: string;
  group?: CommodityGroup;
  /** Total QTY/MT planned for this commodity across the plan, over every row it is on. */
  plannedMt: Mt;
  /** Capacity needed for this commodity — summed where it appears on more than one row. */
  capacityMt: number;
}

/**
 * The commodities a plan carries — the Commodity drop-down of the budget line.
 *
 * Only commodities actually named on a row: a row added and left without a commodity
 * contributes nothing, and a commodity appearing on two rows appears once here with its
 * quantities added, so the drop-down never offers the same commodity twice.
 */
export function planCommodities(plan: Pick<SeasonalPurchasePlan, "from" | "to" | "rows">): PlanCommodity[] {
  const byId = new Map<string, PlanCommodity>();
  for (const g of planGrid(plan)) {
    if (!g.commodityId) continue;
    const existing = byId.get(g.commodityId);
    if (existing) {
      existing.plannedMt += g.totalMt;
      existing.capacityMt += g.capacityMt;
    } else {
      byId.set(g.commodityId, {
        commodityId: g.commodityId,
        name: g.commodityName,
        group: g.group,
        plannedMt: g.totalMt,
        capacityMt: g.capacityMt,
      });
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Whether a commodity is one the plan carries — the rule the instruction states. */
export function planCarriesCommodity(
  plan: Pick<SeasonalPurchasePlan, "from" | "to" | "rows">,
  commodityId: string,
): boolean {
  return plan.rows.some((r) => r.commodityId === commodityId);
}

/** What the plan plans for one commodity, or undefined where it carries none. */
export function plannedForCommodity(
  plan: Pick<SeasonalPurchasePlan, "from" | "to" | "rows">,
  commodityId?: string,
): PlanCommodity | undefined {
  if (!commodityId) return undefined;
  return planCommodities(plan).find((c) => c.commodityId === commodityId);
}

/* ------------------------------------------------------------------ *
 * The budget
 * ------------------------------------------------------------------ */

export interface BudgetTotals {
  lines: number;
  quantityMt: Mt;
  /**
   * One total per currency present. §6.2 asks what currency Amount is in and whether it
   * is one currency or chosen per budget, so amounts are never added across currencies.
   */
  amounts: Money[];
  /** Lines carrying no amount at all, and so contributing to no total. */
  linesWithoutAmount: number;
  /** Distinct suppliers, plans and commodities named on the budget. */
  suppliers: number;
  plans: number;
  commodities: number;
}

export function budgetTotals(budget: Pick<Budget, "lines">): BudgetTotals {
  const { totals, skipped } = sumMoney(budget.lines.map((l) => l.amount));
  return {
    lines: budget.lines.length,
    quantityMt: sum(budget.lines.map((l) => l.quantityMt ?? 0)),
    amounts: totals,
    linesWithoutAmount: skipped,
    suppliers: new Set(budget.lines.map((l) => l.supplierId).filter(Boolean)).size,
    plans: new Set(budget.lines.map((l) => l.seasonalPlanId).filter(Boolean)).size,
    commodities: new Set(budget.lines.map((l) => l.commodityId).filter(Boolean)).size,
  };
}

export interface BudgetGaps {
  linesWithoutPlan: number;
  linesWithoutCommodity: number;
  linesWithoutQuantity: number;
  linesWithoutAmount: number;
  linesWithoutSupplier: number;
  /** §6.2 output 3 — the approval status recorded against the budget. */
  approvalStatusRecorded: boolean;
  complete: boolean;
}

/**
 * What a budget is missing. Reported, never enforced, for the same reason as `planGaps`:
 * §6.2 preconditions state "none stated", and the approval status "now carries a field,
 * but nothing states that it gates anything".
 */
export function budgetGaps(budget: Pick<Budget, "lines" | "approvalStatus">): BudgetGaps {
  const linesWithoutPlan = budget.lines.filter((l) => !l.seasonalPlanId).length;
  const linesWithoutCommodity = budget.lines.filter((l) => !l.commodityId).length;
  const linesWithoutQuantity = budget.lines.filter((l) => l.quantityMt === undefined).length;
  const linesWithoutAmount = budget.lines.filter((l) => !l.amount).length;
  const linesWithoutSupplier = budget.lines.filter((l) => !l.supplierId).length;
  const approvalStatusRecorded = Boolean(budget.approvalStatus?.trim());
  return {
    linesWithoutPlan,
    linesWithoutCommodity,
    linesWithoutQuantity,
    linesWithoutAmount,
    linesWithoutSupplier,
    approvalStatusRecorded,
    complete:
      budget.lines.length > 0 &&
      linesWithoutPlan === 0 &&
      linesWithoutCommodity === 0 &&
      linesWithoutQuantity === 0 &&
      linesWithoutAmount === 0 &&
      linesWithoutSupplier === 0 &&
      approvalStatusRecorded,
  };
}

/** Where the budget period sits relative to a plan's seasonal period. */
export type PeriodFit = "inside" | "overlapping" | "outside" | "unknown";

export interface BudgetAgainstPlan {
  planId: string;
  /** Quantity this budget writes against the plan, across every line naming it. */
  budgetQuantityMt: Mt;
  /** Quantity the plan itself carries, across every month. */
  plannedQuantityMt: Mt;
  /** Budget minus plan. Positive means the budget exceeds what was planned. */
  varianceMt: Mt;
  periodFit: PeriodFit;
}

/**
 * The two comparisons §6.2 raises as open questions and answers as neither: whether the
 * budget period must fall inside the seasonal period, and whether the budget quantity
 * must reconcile with the quantity planned. Both are computed so a reviewer can see what
 * the data says; neither is a rule, and nothing refuses a budget on either count.
 */
export function budgetAgainstPlan(
  budget: Pick<Budget, "fromDate" | "toDate" | "lines">,
  plan: Pick<SeasonalPurchasePlan, "id" | "from" | "to" | "rows">,
): BudgetAgainstPlan {
  const mine = budget.lines.filter((l) => l.seasonalPlanId === plan.id);
  const budgetQuantityMt = sum(mine.map((l) => l.quantityMt ?? 0));
  const plannedQuantityMt = planTotals(plan).quantityMt;
  return {
    planId: plan.id,
    budgetQuantityMt,
    plannedQuantityMt,
    varianceMt: budgetQuantityMt - plannedQuantityMt,
    periodFit: periodFit(budget.fromDate, budget.toDate, plan),
  };
}

/**
 * Whether the budget's dates sit inside, across or wholly outside the plan's months.
 * `unknown` when either bound is missing or the plan's period spans nothing.
 */
export function periodFit(
  fromDate: string | undefined,
  toDate: string | undefined,
  plan: Pick<SeasonalPurchasePlan, "from" | "to">,
): PeriodFit {
  if (!fromDate || !toDate) return "unknown";
  const months = monthsInSeason(plan.from, plan.to);
  if (months.length === 0) return "unknown";
  const seasonStart = seasonMonthStartIso(months[0]);
  const seasonEnd = seasonMonthEndIso(months[months.length - 1]);
  if (fromDate > toDate) return "unknown";
  if (fromDate >= seasonStart && toDate <= seasonEnd) return "inside";
  if (toDate < seasonStart || fromDate > seasonEnd) return "outside";
  return "overlapping";
}

/** One commodity's budgeted-against-planned comparison, within one plan. */
export interface BudgetCommodityComparison {
  commodityId: string;
  name: string;
  group?: CommodityGroup;
  budgetedMt: Mt;
  plannedMt: Mt;
  varianceMt: Mt;
}

/**
 * Budgeted against planned, per commodity, for the lines of one budget naming one plan.
 *
 * Now that a budget line names a commodity, the comparison §6.2 raises can be made at the
 * level the plan is actually written at rather than only in total. It is still shown and
 * not enforced: §6.2 asks whether the two must reconcile and does not answer. A commodity
 * the plan carries but the budget does not mention appears with a zero budget, because a
 * gap is the interesting case.
 */
export function budgetByCommodity(
  budget: Pick<Budget, "lines">,
  plan: Pick<SeasonalPurchasePlan, "id" | "from" | "to" | "rows">,
): BudgetCommodityComparison[] {
  const mine = budget.lines.filter((l) => l.seasonalPlanId === plan.id);
  const planned = planCommodities(plan);
  const ids = [...new Set([...planned.map((c) => c.commodityId), ...mine.map((l) => l.commodityId)])]
    .filter((id): id is string => Boolean(id))
    .sort();
  return ids.map((commodityId) => {
    const p = planned.find((c) => c.commodityId === commodityId);
    const budgetedMt = sum(mine.filter((l) => l.commodityId === commodityId).map((l) => l.quantityMt ?? 0));
    const plannedMt = p?.plannedMt ?? 0;
    return {
      commodityId,
      name: p?.name ?? commodityById(commodityId)?.name ?? "–",
      group: p?.group ?? commodityById(commodityId)?.group,
      budgetedMt,
      plannedMt,
      varianceMt: budgetedMt - plannedMt,
    };
  });
}

/** Quantity a budget writes against one plan, across every line naming it. */
export function budgetQuantityForPlan(lines: BudgetLine[], planId: string): Mt {
  return sum(lines.filter((l) => l.seasonalPlanId === planId).map((l) => l.quantityMt ?? 0));
}

/**
 * Every distinct approval status recorded across the budgets held. Used to show the
 * reviewer what the field actually contains, because the instruction that added it names
 * no value list — so the values in the data are the only evidence there is.
 */
export function approvalStatusesInUse(budgets: Pick<Budget, "approvalStatus">[]): string[] {
  return [
    ...new Set(budgets.map((b) => b.approvalStatus?.trim()).filter((v): v is string => Boolean(v))),
  ].sort();
}
