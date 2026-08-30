/**
 * Phases 01–02 — the seasonal purchase plan and the budget.
 *
 * The tests fall into two groups, and the difference between them matters:
 *
 *   · the ones that pin a *stated* rule — §6.1 activity 3, "COTS determines the months
 *     that fall between the From and To periods and presents them in chronological
 *     order", and §6.2's per-currency amounts, which follow from the requirement asking
 *     what currency Amount is in rather than answering it;
 *
 *   · the ones that pin the *absence* of a rule — that an incomplete plan is reported and
 *     not refused, that a month may carry more than one commodity, that the approval
 *     status means nothing. Those are the ones worth having: they fail if someone later
 *     quietly invents a validation the requirement does not state.
 */

import { describe, expect, it } from "vitest";
import {
  approvalStatusesInUse,
  budgetAgainstPlan,
  budgetGaps,
  budgetQuantityForPlan,
  budgetTotals,
  compareSeasonMonth,
  formatSeasonMonth,
  capacityNeeded,
  capacitySummary,
  activePlans,
  budgetByCommodity,
  isValidSeasonMonth,
  monthsInSeason,
  NO_LOCATION,
  planActivity,
  planCarriesCommodity,
  planCommodities,
  plannedForCommodity,
  periodFit,
  planGaps,
  planGrid,
  planGridTotals,
  planTotals,
  plannedQuantityByCommodity,
  seasonLengthMonths,
  seasonMonthEndIso,
  seasonMonthKey,
  seasonMonthStartIso,
} from "../planning";
import { money } from "../calc";
import { BUDGETS, SEASONAL_PURCHASE_PLANS } from "../../data/seed-v2";
import { isPlanActive } from "../planning";
import type { Budget, SeasonalPurchasePlan } from "../types";

const plan = (over: Partial<SeasonalPurchasePlan> = {}): SeasonalPurchasePlan => ({
  id: "spp-t",
  planRef: "SPP-TEST",
  from: { year: 2026, month: 9 },
  to: { year: 2027, month: 2 },
  rows: [],
  createdOn: "2026-08-17",
  createdBy: "tester",
  ...over,
});

const budget = (over: Partial<Budget> = {}): Budget => ({
  id: "bg-t",
  budgetRef: "BGT-TEST",
  fromDate: "2026-09-01",
  toDate: "2027-02-28",
  lines: [],
  createdOn: "2026-08-17",
  createdBy: "tester",
  ...over,
});

/* ================================================================== *
 * The seasonal period — §6.1 activity 3, the one stated calculation
 * ================================================================== */

describe("monthsInSeason — the months COTS determines from the period", () => {
  it("spans both ends inclusively and runs in chronological order", () => {
    const months = monthsInSeason({ year: 2026, month: 9 }, { year: 2027, month: 2 });
    expect(months.map(seasonMonthKey)).toEqual([
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
  });

  it("crosses the year boundary without losing or repeating a month", () => {
    const months = monthsInSeason({ year: 2025, month: 11 }, { year: 2026, month: 3 });
    expect(months).toHaveLength(5);
    expect(new Set(months.map(seasonMonthKey)).size).toBe(5);
  });

  it("spans exactly one month when the two bounds are the same month", () => {
    expect(monthsInSeason({ year: 2026, month: 6 }, { year: 2026, month: 6 })).toHaveLength(1);
  });

  it("spans nothing when the To period falls before the From period — it does not swap them", () => {
    // The requirement states no rule for a backwards period. Silently swapping the bounds
    // would record a period the user did not enter, so nothing is inferred.
    expect(monthsInSeason({ year: 2027, month: 2 }, { year: 2026, month: 9 })).toEqual([]);
  });

  it("spans nothing when either bound is missing or is not a real month", () => {
    expect(monthsInSeason(undefined, { year: 2026, month: 9 })).toEqual([]);
    expect(monthsInSeason({ year: 2026, month: 0 }, { year: 2026, month: 9 })).toEqual([]);
    expect(monthsInSeason({ year: 2026, month: 13 }, { year: 2027, month: 1 })).toEqual([]);
  });

  it("counts a twelve-month season as twelve", () => {
    expect(seasonLengthMonths({ year: 2026, month: 1 }, { year: 2026, month: 12 })).toBe(12);
  });
});

describe("season month helpers", () => {
  it("keys a month sortably and names it readably", () => {
    expect(seasonMonthKey({ year: 2026, month: 3 })).toBe("2026-03");
    expect(formatSeasonMonth({ year: 2026, month: 3 })).toBe("March 2026");
    expect(formatSeasonMonth(undefined)).toBe("–");
  });

  it("orders two months", () => {
    expect(compareSeasonMonth({ year: 2026, month: 1 }, { year: 2026, month: 2 })).toBeLessThan(0);
    expect(compareSeasonMonth({ year: 2027, month: 1 }, { year: 2026, month: 12 })).toBeGreaterThan(0);
    expect(compareSeasonMonth({ year: 2026, month: 5 }, { year: 2026, month: 5 })).toBe(0);
  });

  it("validates a month", () => {
    expect(isValidSeasonMonth({ year: 2026, month: 1 })).toBe(true);
    expect(isValidSeasonMonth({ year: 2026, month: 12 })).toBe(true);
    expect(isValidSeasonMonth({ year: 2026, month: 13 })).toBe(false);
    expect(isValidSeasonMonth(undefined)).toBe(false);
  });

  it("bounds a month as calendar dates, February and a leap February included", () => {
    expect(seasonMonthStartIso({ year: 2026, month: 2 })).toBe("2026-02-01");
    expect(seasonMonthEndIso({ year: 2026, month: 2 })).toBe("2026-02-28");
    expect(seasonMonthEndIso({ year: 2028, month: 2 })).toBe("2028-02-29");
    expect(seasonMonthEndIso({ year: 2026, month: 12 })).toBe("2026-12-31");
  });
});

/* ================================================================== *
 * The plan — the Plan sheet's grid, its two formulas, and the absence
 * of any validation
 * ================================================================== */

describe("capacityNeeded — the spreadsheet's own formula", () => {
  it("adds the three largest months, which is what LARGE(row,1..3) does", () => {
    // Shelled-Peanut in the captured sheet: 4,250 + 4,250 + 3,400 = 11,900.
    expect(capacityNeeded([0, 425, 3400, 4250, 4250, 1700, 1700, 850, 425])).toBe(11900);
  });

  it("ignores the order the months come in", () => {
    expect(capacityNeeded([1, 9, 2, 8, 3, 7])).toBe(24);
    expect(capacityNeeded([9, 8, 7, 3, 2, 1])).toBe(24);
  });

  it("sums whatever it has when fewer than three months carry a quantity", () => {
    // Red-Sesame: two months of 232.5 give 465, not a third of anything.
    expect(capacityNeeded([232.5, 232.5])).toBe(465);
    expect(capacityNeeded([1800])).toBe(1800);
    expect(capacityNeeded([])).toBe(0);
  });

  it("reads a blank cell as no quantity rather than as a number", () => {
    expect(capacityNeeded([undefined, 100, undefined, 200, 50])).toBe(350);
  });

  it("is never larger than the row's total, and equals it when three months or fewer are used", () => {
    const row = [450, 900, 450];
    expect(capacityNeeded(row)).toBe(1800);
    expect(capacityNeeded(row)).toBe(row.reduce((a, b) => a + b, 0));
  });
});

describe("planGrid — commodity down, month across", () => {
  it("lines each row's quantities up with the months of the period, blanks included", () => {
    const p = plan({
      from: { year: 2026, month: 9 },
      to: { year: 2026, month: 11 },
      rows: [
        {
          id: "r1",
          commodityId: "cm-sesame-gadarif",
          note: "PZU",
          cells: [
            { year: 2026, month: 9, quantityMt: 500 },
            { year: 2026, month: 11, quantityMt: 300 },
          ],
        },
      ],
    });
    const [g] = planGrid(p);
    expect(g.quantities).toEqual([500, undefined, 300]);
    expect(g.totalMt).toBe(800);
    expect(g.capacityMt).toBe(800);
    expect(g.note).toBe("PZU");
  });

  it("reads the commodity group out of the master rather than off the plan", () => {
    const p = plan({
      rows: [{ id: "r1", commodityId: "cm-sorghum", cells: [] }],
    });
    const [g] = planGrid(p);
    expect(g.group).toBe("Sorghum");
    expect(g.commodityName).toBe("Sorghum");
  });

  it("leaves the group undefined where no commodity has been chosen", () => {
    const [g] = planGrid(plan({ rows: [{ id: "r1", cells: [] }] }));
    expect(g.group).toBeUndefined();
    expect(g.commodityName).toBe("–");
  });

  it("ignores a cell whose month is outside the period rather than counting it", () => {
    const p = plan({
      from: { year: 2026, month: 9 },
      to: { year: 2026, month: 10 },
      rows: [
        {
          id: "r1",
          commodityId: "cm-sorghum",
          cells: [
            { year: 2026, month: 9, quantityMt: 100 },
            { year: 2027, month: 5, quantityMt: 999 },
          ],
        },
      ],
    });
    const [g] = planGrid(p);
    expect(g.quantities).toEqual([100, undefined]);
    expect(g.totalMt).toBe(100);
    // But it is not lost silently — planGaps reports it.
    expect(planGaps(p).cellsOutsidePeriod).toHaveLength(1);
  });

  it("permits the same commodity on two rows and keeps them apart", () => {
    const p = plan({
      from: { year: 2026, month: 9 },
      to: { year: 2026, month: 9 },
      rows: [
        { id: "r1", commodityId: "cm-sorghum", cells: [{ year: 2026, month: 9, quantityMt: 10 }] },
        { id: "r2", commodityId: "cm-sorghum", cells: [{ year: 2026, month: 9, quantityMt: 20 }] },
      ],
    });
    const grid = planGrid(p);
    expect(grid).toHaveLength(2);
    expect(grid.map((g) => g.totalMt)).toEqual([10, 20]);
    expect(planGaps(p).duplicatedCommodities).toEqual(["cm-sorghum"]);
  });
});

describe("planGridTotals — the Total footer", () => {
  const p = plan({
    from: { year: 2026, month: 9 },
    to: { year: 2026, month: 11 },
    rows: [
      {
        id: "r1",
        commodityId: "cm-sorghum",
        cells: [
          { year: 2026, month: 9, quantityMt: 100 },
          { year: 2026, month: 10, quantityMt: 400 },
          { year: 2026, month: 11, quantityMt: 300 },
        ],
      },
      {
        id: "r2",
        commodityId: "cm-cotton-raw",
        cells: [
          { year: 2026, month: 10, quantityMt: 50 },
          { year: 2026, month: 11, quantityMt: 25 },
        ],
      },
    ],
  });

  it("totals each month down the columns", () => {
    expect(planGridTotals(planGrid(p), 3).perMonth).toEqual([100, 450, 325]);
  });

  it("adds the per-row capacities rather than re-applying the formula to the monthly totals", () => {
    // The sheet's own =SUM(N19:N29). Per row: 800 and 75, so 875.
    // The formula applied to the monthly totals (100, 450, 325) would give 875 here by
    // coincidence of a three-month period, so use a longer one to tell them apart.
    const long = plan({
      from: { year: 2026, month: 1 },
      to: { year: 2026, month: 4 },
      rows: [
        {
          id: "r1",
          commodityId: "cm-sorghum",
          cells: [
            { year: 2026, month: 1, quantityMt: 100 },
            { year: 2026, month: 2, quantityMt: 100 },
            { year: 2026, month: 3, quantityMt: 100 },
            { year: 2026, month: 4, quantityMt: 100 },
          ],
        },
      ],
    });
    const grid = planGrid(long);
    const totals = planGridTotals(grid, 4);
    expect(totals.totalMt).toBe(400);
    // Sum of the row capacities: the row's three peak months = 300.
    expect(totals.capacityMt).toBe(300);
    // And that is deliberately not the same as the formula over the monthly totals,
    // which for a flat row of four 100s is also 300 — so check the two-row case where
    // they genuinely differ.
    const twoRows = planGridTotals(planGrid(p), 3);
    expect(twoRows.capacityMt).toBe(800 + 75);
  });
});

describe("planTotals", () => {
  it("counts rows, filled cells, commodities and groups, and carries both derived figures", () => {
    const p = plan({
      from: { year: 2026, month: 9 },
      to: { year: 2026, month: 11 },
      rows: [
        {
          id: "r1",
          commodityId: "cm-sesame-gadarif",
          cells: [
            { year: 2026, month: 9, quantityMt: 500 },
            { year: 2026, month: 10, quantityMt: 300 },
          ],
        },
        { id: "r2", commodityId: "cm-sorghum", cells: [{ year: 2026, month: 11, quantityMt: 200 }] },
      ],
    });
    const t = planTotals(p);
    expect(t.months).toBe(3);
    expect(t.rows).toBe(2);
    expect(t.filledCells).toBe(3);
    expect(t.quantityMt).toBe(1000);
    expect(t.capacityMt).toBe(800 + 200);
    expect(t.commodities).toBe(2);
    expect(t.groups).toBe(2);
  });

  it("returns zeroes for a plan with no rows without throwing", () => {
    const t = planTotals(plan());
    expect(t.rows).toBe(0);
    expect(t.quantityMt).toBe(0);
    expect(t.capacityMt).toBe(0);
  });
});

describe("capacitySummary — the Summary sheet's pivot", () => {
  it("sums capacity by commodity group against the note the sheet uses as a location", () => {
    const p = plan({
      from: { year: 2026, month: 9 },
      to: { year: 2026, month: 10 },
      rows: [
        {
          id: "r1",
          commodityId: "cm-sesame-gadarif",
          note: "PZU",
          cells: [
            { year: 2026, month: 9, quantityMt: 100 },
            { year: 2026, month: 10, quantityMt: 200 },
          ],
        },
        {
          id: "r2",
          commodityId: "cm-sesame-mixed",
          note: "PZU",
          cells: [{ year: 2026, month: 9, quantityMt: 50 }],
        },
        {
          id: "r3",
          commodityId: "cm-sorghum",
          note: "Gadarif store",
          cells: [{ year: 2026, month: 10, quantityMt: 400 }],
        },
      ],
    });
    const s = capacitySummary(planGrid(p));
    expect(s.locations).toEqual(["Gadarif store", "PZU"]);
    const sesame = s.rows.find((r) => r.group === "Sesame Category")!;
    expect(sesame.total).toBe(350);
    const sorghum = s.rows.find((r) => r.group === "Sorghum")!;
    expect(sorghum.total).toBe(400);
    expect(s.grandTotal).toBe(750);
    // The grand total is the sum of the group totals, and of the per-location totals.
    expect(s.perLocation.reduce((a, b) => a + b, 0)).toBe(s.grandTotal);
  });

  it("buckets a row with no note under a named placeholder rather than dropping it", () => {
    const p = plan({
      from: { year: 2026, month: 9 },
      to: { year: 2026, month: 9 },
      rows: [{ id: "r1", commodityId: "cm-sorghum", cells: [{ year: 2026, month: 9, quantityMt: 10 }] }],
    });
    const s = capacitySummary(planGrid(p));
    expect(s.locations).toEqual([NO_LOCATION]);
    expect(s.grandTotal).toBe(10);
  });
});

describe("planGaps — reported, never enforced", () => {
  it("counts each kind of gap without refusing anything", () => {
    const p = plan({
      from: { year: 2026, month: 9 },
      to: { year: 2026, month: 11 },
      rows: [
        {
          id: "r1",
          commodityId: "cm-sorghum",
          note: "PZU",
          cells: [{ year: 2026, month: 9, quantityMt: 100 }],
        },
        /* no commodity, and no note */
        { id: "r2", cells: [{ year: 2026, month: 10, quantityMt: 50 }] },
        /* a commodity and a note, but no quantity anywhere */
        { id: "r3", commodityId: "cm-cotton-raw", note: "PZU", cells: [] },
      ],
    });
    const g = planGaps(p);
    expect(g.rowsWithoutCommodity).toBe(1);
    expect(g.rowsWithNoQuantity).toBe(1);
    expect(g.rowsWithoutNote).toBe(1);
    expect(g.monthsWithNoQuantity.map(seasonMonthKey)).toEqual(["2026-11"]);
    expect(g.complete).toBe(false);
  });

  it("calls a plan complete only when nothing at all is outstanding", () => {
    const p = plan({
      from: { year: 2026, month: 9 },
      to: { year: 2026, month: 10 },
      rows: [
        {
          id: "r1",
          commodityId: "cm-sorghum",
          note: "PZU",
          cells: [
            { year: 2026, month: 9, quantityMt: 100 },
            { year: 2026, month: 10, quantityMt: 200 },
          ],
        },
      ],
    });
    expect(planGaps(p).complete).toBe(true);
  });

  it("treats a plan with no rows as incomplete", () => {
    expect(planGaps(plan()).complete).toBe(false);
  });

  it("reports a cell outside the period, and does not count a blank one as outside", () => {
    const p = plan({
      from: { year: 2026, month: 9 },
      to: { year: 2026, month: 10 },
      rows: [
        {
          id: "r1",
          commodityId: "cm-sorghum",
          note: "PZU",
          cells: [
            { year: 2027, month: 5, quantityMt: 10 },
            { year: 2027, month: 6 },
          ],
        },
      ],
    });
    const g = planGaps(p);
    expect(g.cellsOutsidePeriod).toHaveLength(1);
    expect(g.cellsOutsidePeriod[0].cell.month).toBe(5);
    expect(g.complete).toBe(false);
  });
});

describe("plannedQuantityByCommodity", () => {
  it("adds a commodity's quantity across every month and every row it appears on", () => {
    const p = plan({
      from: { year: 2026, month: 9 },
      to: { year: 2026, month: 11 },
      rows: [
        {
          id: "r1",
          commodityId: "cm-sorghum",
          cells: [
            { year: 2026, month: 9, quantityMt: 100 },
            { year: 2026, month: 10, quantityMt: 150 },
          ],
        },
        { id: "r2", commodityId: "cm-sorghum", cells: [{ year: 2026, month: 11, quantityMt: 25 }] },
        /* No commodity — belongs to none, and is not silently attributed. */
        { id: "r3", cells: [{ year: 2026, month: 11, quantityMt: 999 }] },
      ],
    });
    const by = plannedQuantityByCommodity(p);
    expect(by.get("cm-sorghum")).toBe(275);
    expect(by.size).toBe(1);
  });
});

/* ================================================================== *
 * Which plans a budget may name, and which commodities
 *
 * From the business instruction of 27 August 2026. The commodity rule is
 * stated outright and is enforced; the "active plan" rule needed a definition,
 * because §6.1 states no status model for a plan — so what is pinned here is
 * the reading, and it fails loudly if someone changes it by accident.
 * ================================================================== */

describe("planActivity — a reading, because §6.1 defines no status for a plan", () => {
  const at = "2026-08-17";

  it("calls a season still to start active, because that is the season a budget is for", () => {
    expect(planActivity(plan({ from: { year: 2026, month: 10 }, to: { year: 2027, month: 7 } }), at)).toBe(
      "active",
    );
  });

  it("calls a season in progress active", () => {
    expect(planActivity(plan({ from: { year: 2026, month: 1 }, to: { year: 2026, month: 12 } }), at)).toBe(
      "active",
    );
  });

  it("calls a season active in its own final month, not closed a month early", () => {
    expect(planActivity(plan({ from: { year: 2026, month: 1 }, to: { year: 2026, month: 8 } }), at)).toBe(
      "active",
    );
  });

  it("calls a season closed once its last month has passed", () => {
    expect(planActivity(plan({ from: { year: 2026, month: 6 }, to: { year: 2026, month: 7 } }), at)).toBe(
      "closed",
    );
  });

  it("calls a period that spans no months closed — there is no season to budget for", () => {
    expect(planActivity(plan({ from: { year: 2027, month: 2 }, to: { year: 2026, month: 9 } }), at)).toBe(
      "closed",
    );
  });

  it("offers the active plans earliest season first", () => {
    const later = plan({ id: "later", from: { year: 2027, month: 1 }, to: { year: 2027, month: 6 } });
    const sooner = plan({ id: "sooner", from: { year: 2026, month: 9 }, to: { year: 2027, month: 2 } });
    const closed = plan({ id: "closed", from: { year: 2026, month: 1 }, to: { year: 2026, month: 3 } });
    expect(activePlans([later, closed, sooner], at).map((p) => p.id)).toEqual(["sooner", "later"]);
  });
});

describe("planCommodities — the Commodity drop-down of a budget line", () => {
  const p = plan({
    from: { year: 2026, month: 9 },
    to: { year: 2026, month: 11 },
    rows: [
      {
        id: "r1",
        commodityId: "cm-sorghum",
        cells: [
          { year: 2026, month: 9, quantityMt: 100 },
          { year: 2026, month: 10, quantityMt: 200 },
        ],
      },
      /* The same commodity again — the drop-down must still offer it once. */
      { id: "r2", commodityId: "cm-sorghum", cells: [{ year: 2026, month: 11, quantityMt: 50 }] },
      { id: "r3", commodityId: "cm-cotton-raw", cells: [{ year: 2026, month: 9, quantityMt: 10 }] },
      /* A row with no commodity contributes nothing to the list. */
      { id: "r4", cells: [{ year: 2026, month: 11, quantityMt: 999 }] },
    ],
  });

  it("lists each commodity once, with its quantities added across rows", () => {
    const list = planCommodities(p);
    expect(list.map((c) => c.commodityId)).toEqual(["cm-cotton-raw", "cm-sorghum"]);
    expect(list.find((c) => c.commodityId === "cm-sorghum")!.plannedMt).toBe(350);
  });

  it("carries the commodity's group, read from the master", () => {
    expect(planCommodities(p).find((c) => c.commodityId === "cm-sorghum")!.group).toBe("Sorghum");
  });

  it("includes a commodity the plan carries with no quantity at all", () => {
    const withEmptyRow = plan({
      from: { year: 2026, month: 9 },
      to: { year: 2026, month: 9 },
      rows: [{ id: "r1", commodityId: "cm-gum-talha-fresh", cells: [] }],
    });
    const list = planCommodities(withEmptyRow);
    expect(list).toHaveLength(1);
    expect(list[0].plannedMt).toBe(0);
  });

  it("answers whether a plan carries a commodity — the rule the instruction states", () => {
    expect(planCarriesCommodity(p, "cm-sorghum")).toBe(true);
    expect(planCarriesCommodity(p, "cm-sesame-white")).toBe(false);
  });

  it("reads what is planned for one commodity, or nothing where it is not carried", () => {
    expect(plannedForCommodity(p, "cm-sorghum")?.plannedMt).toBe(350);
    expect(plannedForCommodity(p, "cm-sesame-white")).toBeUndefined();
    expect(plannedForCommodity(p, undefined)).toBeUndefined();
  });
});

describe("budgetByCommodity — the reconciliation at the level the plan is written at", () => {
  const p = plan({
    id: "spp-x",
    from: { year: 2026, month: 9 },
    to: { year: 2026, month: 10 },
    rows: [
      {
        id: "r1",
        commodityId: "cm-sorghum",
        cells: [
          { year: 2026, month: 9, quantityMt: 100 },
          { year: 2026, month: 10, quantityMt: 200 },
        ],
      },
      { id: "r2", commodityId: "cm-cotton-raw", cells: [{ year: 2026, month: 9, quantityMt: 40 }] },
    ],
  });

  it("compares budgeted against planned per commodity, and signs the variance", () => {
    const b = budget({
      lines: [
        { id: "l1", seasonalPlanId: "spp-x", commodityId: "cm-sorghum", quantityMt: 250 },
        { id: "l2", seasonalPlanId: "spp-x", commodityId: "cm-sorghum", quantityMt: 50 },
      ],
    });
    const rows = budgetByCommodity(b, p);
    const sorghum = rows.find((r) => r.commodityId === "cm-sorghum")!;
    expect(sorghum.budgetedMt).toBe(300);
    expect(sorghum.plannedMt).toBe(300);
    expect(sorghum.varianceMt).toBe(0);
  });

  it("lists a commodity the plan carries but the budget does not mention, at zero", () => {
    const b = budget({
      lines: [{ id: "l1", seasonalPlanId: "spp-x", commodityId: "cm-sorghum", quantityMt: 300 }],
    });
    const cotton = budgetByCommodity(b, p).find((r) => r.commodityId === "cm-cotton-raw")!;
    expect(cotton.budgetedMt).toBe(0);
    expect(cotton.plannedMt).toBe(40);
    expect(cotton.varianceMt).toBe(-40);
  });

  it("ignores lines written against a different plan", () => {
    const b = budget({
      lines: [
        { id: "l1", seasonalPlanId: "spp-x", commodityId: "cm-sorghum", quantityMt: 100 },
        { id: "l2", seasonalPlanId: "spp-other", commodityId: "cm-sorghum", quantityMt: 9999 },
      ],
    });
    expect(budgetByCommodity(b, p).find((r) => r.commodityId === "cm-sorghum")!.budgetedMt).toBe(100);
  });
});

/* ================================================================== *
 * The budget
 * ================================================================== */

describe("budgetTotals", () => {
  it("adds quantity, and totals amounts per currency rather than across them", () => {
    // §6.2 asks what currency Amount is in and whether it is one currency or chosen per
    // budget. Until that is answered nothing may be added across currencies.
    const b = budget({
      lines: [
        { id: "1", quantityMt: 100, amount: money(1000, "USD"), supplierId: "cp-sup-gabani" },
        { id: "2", quantityMt: 50, amount: money(400, "USD"), supplierId: "cp-sup-abakar" },
        { id: "3", quantityMt: 25, amount: money(9000, "SDG"), supplierId: "cp-sup-gabani" },
      ],
    });
    const t = budgetTotals(b);
    expect(t.quantityMt).toBe(175);
    expect(t.amounts).toHaveLength(2);
    expect(t.amounts.find((m) => m.currency === "USD")?.amount).toBe(1400);
    expect(t.amounts.find((m) => m.currency === "SDG")?.amount).toBe(9000);
    expect(t.suppliers).toBe(2);
  });

  it("counts the lines carrying no amount, which are in no total", () => {
    const b = budget({
      lines: [
        { id: "1", quantityMt: 100, amount: money(1000, "USD") },
        { id: "2", quantityMt: 60 },
      ],
    });
    const t = budgetTotals(b);
    expect(t.linesWithoutAmount).toBe(1);
    expect(t.quantityMt).toBe(160);
  });
});

describe("budgetGaps — reported, never enforced", () => {
  it("counts each unfilled field and notes whether an approval status was recorded", () => {
    const b = budget({
      approvalStatus: "  ",
      lines: [{ id: "1", quantityMt: 10 }],
    });
    const g = budgetGaps(b);
    expect(g.linesWithoutPlan).toBe(1);
    expect(g.linesWithoutCommodity).toBe(1);
    expect(g.linesWithoutAmount).toBe(1);
    expect(g.linesWithoutSupplier).toBe(1);
    expect(g.linesWithoutQuantity).toBe(0);
    // Whitespace is not a recorded status.
    expect(g.approvalStatusRecorded).toBe(false);
    expect(g.complete).toBe(false);
  });

  it("treats a budget with no line as incomplete", () => {
    expect(budgetGaps(budget({ approvalStatus: "Approved" })).complete).toBe(false);
  });
});

describe("periodFit — a comparison, not a rule", () => {
  const p = plan({ from: { year: 2026, month: 9 }, to: { year: 2027, month: 2 } });

  it("reads a budget period wholly within the seasonal period as inside", () => {
    expect(periodFit("2026-09-01", "2027-02-28", p)).toBe("inside");
    expect(periodFit("2026-10-15", "2026-11-30", p)).toBe("inside");
  });

  it("reads a period that straddles a bound as overlapping", () => {
    expect(periodFit("2026-07-01", "2026-12-31", p)).toBe("overlapping");
    expect(periodFit("2027-01-01", "2027-06-30", p)).toBe("overlapping");
  });

  it("reads a period entirely before or after the season as outside", () => {
    expect(periodFit("2026-01-01", "2026-06-30", p)).toBe("outside");
    expect(periodFit("2027-04-01", "2027-09-30", p)).toBe("outside");
  });

  it("returns unknown rather than guessing when a bound is missing or reversed", () => {
    expect(periodFit(undefined, "2027-02-28", p)).toBe("unknown");
    expect(periodFit("2027-02-28", "2026-09-01", p)).toBe("unknown");
    expect(periodFit("2026-09-01", "2027-02-28", plan({ to: { year: 2025, month: 1 } }))).toBe("unknown");
  });
});

describe("budgetAgainstPlan", () => {
  it("compares only the lines naming that plan, and signs the variance", () => {
    const p = plan({
      rows: [
        {
          id: "r1",
          commodityId: "cm-sesame-gadarif",
          cells: [
            { year: 2026, month: 9, quantityMt: 5000 },
            { year: 2026, month: 10, quantityMt: 7500 },
          ],
        },
      ],
    });
    const b = budget({
      lines: [
        { id: "l1", seasonalPlanId: p.id, quantityMt: 6000 },
        { id: "l2", seasonalPlanId: p.id, quantityMt: 4000 },
        { id: "l3", seasonalPlanId: "some-other-plan", quantityMt: 9999 },
      ],
    });
    const cmp = budgetAgainstPlan(b, p);
    expect(cmp.budgetQuantityMt).toBe(10000);
    expect(cmp.plannedQuantityMt).toBe(12500);
    expect(cmp.varianceMt).toBe(-2500);
    expect(cmp.periodFit).toBe("inside");
  });

  it("sums a budget's quantity for one plan", () => {
    const lines = [
      { id: "1", seasonalPlanId: "spp-2", quantityMt: 100 },
      { id: "2", seasonalPlanId: "spp-2", quantityMt: 250 },
      { id: "3", seasonalPlanId: "spp-1", quantityMt: 900 },
    ];
    expect(budgetQuantityForPlan(lines, "spp-2")).toBe(350);
  });
});

describe("approvalStatusesInUse", () => {
  it("returns the distinct values held, sorted, and treats blank as no value", () => {
    expect(
      approvalStatusesInUse([
        { approvalStatus: "Pending" },
        { approvalStatus: "Approved" },
        { approvalStatus: "Pending" },
        { approvalStatus: "   " },
        {},
      ]),
    ).toEqual(["Approved", "Pending"]);
  });
});

/* ================================================================== *
 * The seeded records — the open questions are visible in the data
 * ================================================================== */

describe("the seeded plans reconcile against Export Plan V1.xlsx", () => {
  const spp1 = SEASONAL_PURCHASE_PLANS.find((p) => p.id === "spp-1")!;

  it("reproduces the sheet's period: ten months, October 2026 to July 2027", () => {
    const months = monthsInSeason(spp1.from, spp1.to);
    expect(months).toHaveLength(10);
    expect(seasonMonthKey(months[0])).toBe("2026-10");
    expect(seasonMonthKey(months[9])).toBe("2027-07");
  });

  it("reproduces all eleven commodity rows", () => {
    expect(spp1.rows).toHaveLength(11);
    expect(planTotals(spp1).commodities).toBe(11);
  });

  it("reproduces the grand Total QTY/MT of 74,940 MT", () => {
    expect(planTotals(spp1).quantityMt).toBe(74940);
  });

  it("reproduces the grand Capacity needed of 51,960 MT", () => {
    expect(planTotals(spp1).capacityMt).toBe(51960);
  });

  it("reproduces every row's own Total QTY/MT and Capacity needed", () => {
    // The figures printed on the sheet, by commodity, in its own row order.
    const expected: [string, number, number][] = [
      ["Shelled-Peanut", 17000, 11900],
      ["Gadarif Sesame", 13160, 7520],
      ["NG-Sesame/Eastern", 1800, 1800],
      ["Red sesame seed", 465, 465],
      ["Mixed-Sesame", 465, 465],
      ["Raw-Cotton", 1200, 900],
      ["Pigeon peas", 3000, 2500],
      ["Chick-Peas", 2000, 2000],
      ["Watermelon seed", 5400, 4050],
      ["Fresh-Talha", 450, 360],
      ["Sorghum", 30000, 20000],
    ];
    const grid = planGrid(spp1);
    expect(grid.map((g) => [g.commodityName, g.totalMt, g.capacityMt])).toEqual(expected);
  });

  it("reproduces the sheet's monthly Total row", () => {
    const grid = planGrid(spp1);
    const totals = planGridTotals(grid, monthsInSeason(spp1.from, spp1.to).length);
    // October is blank on every row in the sheet, then 1,385 … 1,895.
    expect(totals.perMonth).toEqual([0, 1385, 4610, 11750, 15750, 16420, 9580, 7920, 5630, 1895]);
  });

  it("reproduces the Summary sheet's capacity by commodity group", () => {
    const s = capacitySummary(planGrid(spp1));
    const by = (g: string) => s.rows.find((r) => r.group === g)!.total;
    expect(by("Cotton Category")).toBe(900);
    expect(by("Gum Arabic Category")).toBe(360);
    expect(by("Others")).toBe(8550);
    expect(by("Peanut Category")).toBe(11900);
    expect(by("Sesame Category")).toBe(10250);
    expect(by("Sorghum")).toBe(20000);
    expect(s.grandTotal).toBe(51960);
  });

  it("carries the sheet's single location, PZU, on every row", () => {
    const s = capacitySummary(planGrid(spp1));
    expect(s.locations).toEqual(["PZU"]);
    expect(planGaps(spp1).rowsWithoutNote).toBe(0);
  });

  it("has October in the period and empty on every row, exactly as the sheet does", () => {
    expect(planGaps(spp1).monthsWithNoQuantity.map(seasonMonthKey)).toEqual(["2026-10"]);
  });
});

/* ================================================================== *
 * The other seeded records — the open questions are visible in the data
 * ================================================================== */

describe("the other seeded plans and budgets show the open questions rather than hiding them", () => {
  const spp2 = SEASONAL_PURCHASE_PLANS.find((p) => p.id === "spp-2")!;
  const spp3 = SEASONAL_PURCHASE_PLANS.find((p) => p.id === "spp-3")!;

  it("puts the same commodity on two rows, which nothing forbids", () => {
    expect(planGaps(spp2).duplicatedCommodities).toEqual(["cm-sesame-white"]);
  });

  it("holds a row with no note, a row with no quantity, and a month with nothing planned", () => {
    const g = planGaps(spp2);
    expect(g.rowsWithoutNote).toBe(1);
    expect(g.rowsWithNoQuantity).toBe(1);
    expect(g.monthsWithNoQuantity.map(seasonMonthKey)).toEqual(["2027-02"]);
    expect(g.complete).toBe(false);
  });

  it("holds a row with no commodity chosen, whose group is therefore unknown", () => {
    expect(planGaps(spp3).rowsWithoutCommodity).toBe(1);
    expect(planGrid(spp3).some((g) => g.group === undefined)).toBe(true);
  });

  it("holds every cell inside its own plan's period", () => {
    for (const p of SEASONAL_PURCHASE_PLANS) {
      expect(planGaps(p).cellsOutsidePeriod).toEqual([]);
    }
  });

  it("gives every budget line a commodity the named plan actually carries", () => {
    for (const b of BUDGETS) {
      for (const l of b.lines) {
        if (!l.seasonalPlanId || !l.commodityId) continue;
        const p = SEASONAL_PURCHASE_PLANS.find((x) => x.id === l.seasonalPlanId)!;
        expect(planCarriesCommodity(p, l.commodityId)).toBe(true);
      }
    }
  });

  it("holds one budget line against a plan whose season has closed, which Edit must still offer", () => {
    const closedRefs = SEASONAL_PURCHASE_PLANS.filter((p) => !isPlanActive(p, "2026-08-17")).map((p) => p.id);
    expect(closedRefs).toEqual(["spp-3"]);
    const naming = BUDGETS.filter((b) => b.lines.some((l) => l.seasonalPlanId === "spp-3"));
    expect(naming.map((b) => b.id)).toEqual(["bg-2"]);
  });

  it("budgets one commodity the plan carries with nothing planned, so the variance is visible", () => {
    const spp2 = SEASONAL_PURCHASE_PLANS.find((p) => p.id === "spp-2")!;
    const bg1 = BUDGETS.find((b) => b.id === "bg-1")!;
    const talha = budgetByCommodity(bg1, spp2).find((c) => c.commodityId === "cm-gum-talha-fresh")!;
    expect(talha.plannedMt).toBe(0);
    expect(talha.budgetedMt).toBeGreaterThan(0);
  });

  it("records one plan and one budget as shared, since sharing means nothing downstream", () => {
    expect(BUDGETS.filter((b) => b.sharedOn).map((b) => b.id)).toEqual(["bg-1"]);
  });

  it("records one plan as shared and the rest as not, since sharing means nothing downstream", () => {
    const shared = SEASONAL_PURCHASE_PLANS.filter((p) => p.sharedOn);
    expect(shared).toHaveLength(1);
    expect(shared[0].id).toBe("spp-1");
  });

  it("budgets less than the plan plans, and shows it as a variance rather than a refusal", () => {
    const bg1 = BUDGETS.find((b) => b.id === "bg-1")!;
    const cmp = budgetAgainstPlan(bg1, spp2);
    expect(cmp.periodFit).toBe("inside");
    expect(cmp.varianceMt).not.toBe(0);
  });

  it("holds one budget whose period only straddles the seasonal period", () => {
    const bg2 = BUDGETS.find((b) => b.id === "bg-2")!;
    expect(budgetAgainstPlan(bg2, spp2).periodFit).toBe("overlapping");
  });

  it("holds one budget with no approval status, because the field is not required", () => {
    const withNone = BUDGETS.filter((b) => !b.approvalStatus?.trim());
    expect(withNone).toHaveLength(1);
    expect(budgetGaps(withNone[0]).approvalStatusRecorded).toBe(false);
  });

  it("carries more than one approval status value, since no value list is stated", () => {
    expect(approvalStatusesInUse(BUDGETS).length).toBeGreaterThan(1);
  });

  it("holds one budget amount in a second currency, so no total spans currencies", () => {
    const currencies = new Set(
      BUDGETS.flatMap((b) => b.lines.map((l) => l.amount?.currency).filter(Boolean)),
    );
    expect(currencies.size).toBeGreaterThan(1);
    for (const b of BUDGETS) {
      const t = budgetTotals(b);
      const perCurrency = new Set(t.amounts.map((m) => m.currency));
      expect(perCurrency.size).toBe(t.amounts.length);
    }
  });

  it("gives every seeded plan and budget a unique reference", () => {
    const planRefs = SEASONAL_PURCHASE_PLANS.map((p) => p.planRef);
    const budgetRefs = BUDGETS.map((b) => b.budgetRef);
    expect(new Set(planRefs).size).toBe(planRefs.length);
    expect(new Set(budgetRefs).size).toBe(budgetRefs.length);
  });
});
