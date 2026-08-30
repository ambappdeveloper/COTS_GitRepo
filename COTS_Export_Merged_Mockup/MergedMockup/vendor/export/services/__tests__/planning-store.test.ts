/**
 * The phases 01–02 mutators — `createSeasonalPurchasePlan` and `createBudget`.
 *
 * These two are unusual in this store, and the tests say so explicitly: workflow v2.3
 * §6.1 and §6.2 state no validation, no approval and no blocking control, and both ask
 * outright whether the record must be complete before the next phase. So the mutators
 * refuse only what the record cannot represent, and the block of tests headed "what is
 * deliberately NOT refused" is the important half — it fails if someone later invents a
 * business rule the requirement does not state.
 *
 * As elsewhere in this store, every refusal is checked for a readable reason as well as
 * for `ok: false`: a refusal a user cannot read is a refusal a user will work around.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { api, resetStore, setLatency } from "../store";
import { TODAY, money } from "../../domain/calc";
import { budgetTotals, planTotals, seasonLengthMonths } from "../../domain/planning";

setLatency(0);

beforeEach(() => {
  resetStore();
});

function reasonOf(res: { ok: true } | { ok: false; reason: string }): string {
  expect(res.ok).toBe(false);
  return res.ok ? "" : res.reason;
}

/* ================================================================== *
 * Readers
 * ================================================================== */

describe("reading plans and budgets", () => {
  it("lists the seeded plans and budgets and reads one of each by id", async () => {
    const plans = await api.listSeasonalPurchasePlans();
    const budgets = await api.listBudgets();
    expect(plans.length).toBeGreaterThan(0);
    expect(budgets.length).toBeGreaterThan(0);
    expect((await api.getSeasonalPurchasePlan("spp-2"))?.planRef).toBe("SPP-2026-0002");
    expect((await api.getBudget("bg-1"))?.budgetRef).toBe("BGT-2026-0001");
  });

  it("returns undefined for an id that does not exist rather than throwing", async () => {
    expect(await api.getSeasonalPurchasePlan("spp-nope")).toBeUndefined();
    expect(await api.getBudget("bg-nope")).toBeUndefined();
  });

  it("hands out copies, so a caller cannot mutate the store through the list", async () => {
    const first = await api.listSeasonalPurchasePlans();
    first[0].rows = [];
    const second = await api.listSeasonalPurchasePlans();
    expect(second[0].rows.length).toBeGreaterThan(0);
  });
});

/* ================================================================== *
 * createSeasonalPurchasePlan
 * ================================================================== */

describe("createSeasonalPurchasePlan", () => {
  it("saves a plan, issues a reference and dates it today", async () => {
    const res = await api.createSeasonalPurchasePlan({
      from: { year: 2026, month: 9 },
      to: { year: 2026, month: 11 },
      createdBy: "tester",
      rows: [
        {
          id: "x1",
          commodityId: "cm-sesame-gadarif",
          note: "PZU",
          cells: [
            { year: 2026, month: 9, quantityMt: 100 },
            { year: 2026, month: 10, quantityMt: 200 },
          ],
        },
        {
          id: "x2",
          commodityId: "cm-gum-talha-fresh",
          note: "PZU",
          cells: [{ year: 2026, month: 11, quantityMt: 50 }],
        },
      ],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.planRef).toMatch(/^SPP-2026-\d{4}$/);
    expect(res.value.createdOn).toBe(TODAY);
    expect(planTotals(res.value).quantityMt).toBe(350);
    // Capacity is derived, never supplied: 300 for the first row, 50 for the second.
    expect(planTotals(res.value).capacityMt).toBe(350);
    // And nothing was shared, because Save rather than Save & share was used.
    expect(res.value.sharedOn).toBeUndefined();
    // And it is readable back.
    expect((await api.getSeasonalPurchasePlan(res.value.id))?.planRef).toBe(res.value.planRef);
  });

  it("refuses a period that spans no months, and says why", async () => {
    const reason = reasonOf(
      await api.createSeasonalPurchasePlan({
        from: { year: 2027, month: 2 },
        to: { year: 2026, month: 9 },
        createdBy: "tester",
        rows: [],
      }),
    );
    expect(reason).toMatch(/spans no months/i);
    expect(reason).toMatch(/same month as the From period or later/i);
  });

  it("refuses a bound that is not a real month", async () => {
    const reason = reasonOf(
      await api.createSeasonalPurchasePlan({
        from: { year: 2026, month: 0 },
        to: { year: 2026, month: 9 },
        createdBy: "tester",
        rows: [],
      }),
    );
    expect(reason).toMatch(/From month and year/i);
  });

  it("refuses a quantity in a month outside the period, and names that month", async () => {
    const reason = reasonOf(
      await api.createSeasonalPurchasePlan({
        from: { year: 2026, month: 9 },
        to: { year: 2026, month: 10 },
        createdBy: "tester",
        rows: [
          {
            id: "x1",
            commodityId: "cm-sesame-gadarif",
            cells: [{ year: 2027, month: 5, quantityMt: 10 }],
          },
        ],
      }),
    );
    expect(reason).toMatch(/May 2027/);
    expect(reason).toMatch(/not one of the 2 months/i);
  });

  it("refuses a negative quantity, and names the month", async () => {
    const q = reasonOf(
      await api.createSeasonalPurchasePlan({
        from: { year: 2026, month: 9 },
        to: { year: 2026, month: 9 },
        createdBy: "tester",
        rows: [{ id: "x1", cells: [{ year: 2026, month: 9, quantityMt: -5 }] }],
      }),
    );
    expect(q).toMatch(/September 2026/);
    expect(q).toMatch(/cannot be negative/i);
  });

  it("refuses a commodity that is not in the master", async () => {
    expect(
      reasonOf(
        await api.createSeasonalPurchasePlan({
          from: { year: 2026, month: 9 },
          to: { year: 2026, month: 9 },
          createdBy: "tester",
          rows: [{ id: "x1", commodityId: "cm-nope", cells: [] }],
        }),
      ),
    ).toMatch(/not in the commodity master/i);
  });

  it("stamps the plan as shared when Save & share is used, and records no recipient", async () => {
    const res = await api.createSeasonalPurchasePlan({
      from: { year: 2026, month: 9 },
      to: { year: 2026, month: 9 },
      createdBy: "tester",
      rows: [{ id: "x1", commodityId: "cm-sorghum", cells: [{ year: 2026, month: 9, quantityMt: 10 }] }],
      share: true,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.sharedOn).toBe(TODAY);
    expect(res.value.sharedBy).toBe("tester");
    // Nothing else: the stakeholders are configured in the system later, so no recipient
    // list is held and nothing downstream reads the stamp.
    expect(Object.keys(res.value)).not.toContain("sharedWith");
  });

  it("does not disturb the seeded plans when it refuses", async () => {
    const before = (await api.listSeasonalPurchasePlans()).length;
    await api.createSeasonalPurchasePlan({
      from: { year: 2027, month: 2 },
      to: { year: 2026, month: 9 },
      createdBy: "tester",
      rows: [],
    });
    expect((await api.listSeasonalPurchasePlans()).length).toBe(before);
  });
});

/* ================================================================== *
 * createBudget
 * ================================================================== */

describe("createBudget", () => {
  it("saves a budget, issues a reference, dates it today and stores the approval status as typed", async () => {
    const res = await api.createBudget({
      fromDate: "2026-09-01",
      toDate: "2027-02-28",
      approvalStatus: "Waiting on the board",
      createdBy: "tester",
      lines: [
        {
          id: "l1",
          seasonalPlanId: "spp-2",
          commodityId: "cm-sesame-white",
          quantityMt: 1000,
          amount: money(650000, "USD"),
          supplierId: "cp-sup-gabani",
        },
      ],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.budgetRef).toMatch(/^BGT-2026-\d{4}$/);
    expect(res.value.createdOn).toBe(TODAY);
    // Stored verbatim: no normalisation, no value list, no mapping to a known state.
    expect(res.value.approvalStatus).toBe("Waiting on the board");
    expect(budgetTotals(res.value).quantityMt).toBe(1000);
  });

  it("refuses a period whose To date falls before its From date", async () => {
    const reason = reasonOf(
      await api.createBudget({
        fromDate: "2027-02-28",
        toDate: "2026-09-01",
        createdBy: "tester",
        lines: [{ id: "l1", quantityMt: 10 }],
      }),
    );
    expect(reason).toMatch(/To date cannot fall before its From date/i);
  });

  it("refuses a missing period bound", async () => {
    expect(
      reasonOf(
        await api.createBudget({
          fromDate: "",
          toDate: "2027-02-28",
          createdBy: "tester",
          lines: [{ id: "l1", quantityMt: 10 }],
        }),
      ),
    ).toMatch(/From date and a To date/i);
  });

  it("refuses a budget with no line at all, because it records nothing", async () => {
    expect(
      reasonOf(
        await api.createBudget({
          fromDate: "2026-09-01",
          toDate: "2027-02-28",
          createdBy: "tester",
          lines: [],
        }),
      ),
    ).toMatch(/at least one line/i);
  });

  it("refuses a line naming a plan that does not exist", async () => {
    expect(
      reasonOf(
        await api.createBudget({
          fromDate: "2026-09-01",
          toDate: "2027-02-28",
          createdBy: "tester",
          lines: [{ id: "l1", seasonalPlanId: "spp-nope", quantityMt: 10 }],
        }),
      ),
    ).toMatch(/plan that does not exist/i);
  });

  it("refuses a line naming a supplier that is not in the counterparty master", async () => {
    expect(
      reasonOf(
        await api.createBudget({
          fromDate: "2026-09-01",
          toDate: "2027-02-28",
          createdBy: "tester",
          lines: [{ id: "l1", supplierId: "cp-nope", quantityMt: 10 }],
        }),
      ),
    ).toMatch(/not in the counterparty master/i);
  });

  it("refuses a negative quantity or amount", async () => {
    expect(
      reasonOf(
        await api.createBudget({
          fromDate: "2026-09-01",
          toDate: "2027-02-28",
          createdBy: "tester",
          lines: [{ id: "l1", quantityMt: -1 }],
        }),
      ),
    ).toMatch(/quantity cannot be negative/i);

    expect(
      reasonOf(
        await api.createBudget({
          fromDate: "2026-09-01",
          toDate: "2027-02-28",
          createdBy: "tester",
          lines: [{ id: "l1", amount: money(-5, "USD") }],
        }),
      ),
    ).toMatch(/amount cannot be negative/i);
  });
});

/* ================================================================== *
 * The two rules the instruction of 27 August 2026 states about a budget
 *
 * These are the first *stated* business rules the budget has been given, so
 * unlike almost everything else in this file they are enforced rather than
 * merely reported — and the drop-downs alone are not the enforcement, the
 * service layer is.
 * ================================================================== */

describe("createBudget — only an active plan, and only a commodity that plan carries", () => {
  it("accepts a line whose plan is active and whose commodity is on that plan", async () => {
    // spp-2 runs September 2026 – February 2027, so it is active at TODAY, and it
    // carries white sesame.
    const res = await api.createBudget({
      fromDate: "2026-09-01",
      toDate: "2027-02-28",
      createdBy: "tester",
      lines: [{ id: "l1", seasonalPlanId: "spp-2", commodityId: "cm-sesame-white", quantityMt: 100 }],
    });
    expect(res.ok).toBe(true);
  });

  it("refuses a plan whose season has already ended, and names the plan and the month", async () => {
    // spp-3 ended July 2026.
    const reason = reasonOf(
      await api.createBudget({
        fromDate: "2026-09-01",
        toDate: "2027-02-28",
        createdBy: "tester",
        lines: [{ id: "l1", seasonalPlanId: "spp-3", commodityId: "cm-watermelon-seed", quantityMt: 10 }],
      }),
    );
    expect(reason).toMatch(/SPP-2026-0003/);
    expect(reason).toMatch(/closed/i);
    expect(reason).toMatch(/July 2026/);
  });

  it("refuses a commodity the plan does not carry, and names both", async () => {
    // spp-2 carries white sesame, shelled peanut and fresh talha — not sorghum.
    const reason = reasonOf(
      await api.createBudget({
        fromDate: "2026-09-01",
        toDate: "2027-02-28",
        createdBy: "tester",
        lines: [{ id: "l1", seasonalPlanId: "spp-2", commodityId: "cm-sorghum", quantityMt: 10 }],
      }),
    );
    expect(reason).toMatch(/Sorghum/);
    expect(reason).toMatch(/SPP-2026-0002/);
    expect(reason).toMatch(/only name a commodity the selected plan carries/i);
  });

  it("accepts a commodity the plan carries on a row with no quantity", async () => {
    // spp-2's fresh-talha row has no quantity at all. It is still on the plan.
    const res = await api.createBudget({
      fromDate: "2026-09-01",
      toDate: "2027-02-28",
      createdBy: "tester",
      lines: [{ id: "l1", seasonalPlanId: "spp-2", commodityId: "cm-gum-talha-fresh", quantityMt: 500 }],
    });
    expect(res.ok).toBe(true);
  });

  it("refuses a commodity that is not in the master at all", async () => {
    expect(
      reasonOf(
        await api.createBudget({
          fromDate: "2026-09-01",
          toDate: "2027-02-28",
          createdBy: "tester",
          lines: [{ id: "l1", seasonalPlanId: "spp-2", commodityId: "cm-nope", quantityMt: 10 }],
        }),
      ),
    ).toMatch(/not in the commodity master|only name a commodity the selected plan carries/i);
  });

  it("still permits a line with no commodity — the instruction narrows the list, not the requirement", async () => {
    const res = await api.createBudget({
      fromDate: "2026-09-01",
      toDate: "2027-02-28",
      createdBy: "tester",
      lines: [{ id: "l1", seasonalPlanId: "spp-2", quantityMt: 10 }],
    });
    expect(res.ok).toBe(true);
  });

  it("stamps the budget as shared when Save & share is used, and records no recipient", async () => {
    const res = await api.createBudget({
      fromDate: "2026-09-01",
      toDate: "2027-02-28",
      createdBy: "tester",
      lines: [{ id: "l1", seasonalPlanId: "spp-2", commodityId: "cm-sesame-white", quantityMt: 10 }],
      share: true,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.sharedOn).toBe(TODAY);
    expect(res.value.sharedBy).toBe("tester");
  });
});

describe("updateBudget — a closed plan is kept where the budget already named it", () => {
  it("saves bg-2 unchanged, even though one of its lines names a closed plan", async () => {
    // This is the case that matters: refusing it would make an old budget unsavable.
    const before = (await api.getBudget("bg-2"))!;
    const res = await api.updateBudget("bg-2", {
      fromDate: before.fromDate,
      toDate: before.toDate,
      lines: before.lines,
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
  });

  it("refuses a closed plan added to a budget that did not already name it", async () => {
    const before = (await api.getBudget("bg-1"))!;
    expect(before.lines.some((l) => l.seasonalPlanId === "spp-3")).toBe(false);
    const reason = reasonOf(
      await api.updateBudget("bg-1", {
        fromDate: before.fromDate,
        toDate: before.toDate,
        lines: [
          ...before.lines,
          { id: "lx", seasonalPlanId: "spp-3", commodityId: "cm-watermelon-seed", quantityMt: 10 },
        ],
        updatedBy: "tester",
      }),
    );
    expect(reason).toMatch(/SPP-2026-0003/);
    expect(reason).toMatch(/closed/i);
  });

  it("still applies the commodity rule on update, including to a grandfathered plan", async () => {
    const before = (await api.getBudget("bg-2"))!;
    expect(
      reasonOf(
        await api.updateBudget("bg-2", {
          fromDate: before.fromDate,
          toDate: before.toDate,
          // spp-3 carries watermelon seed only.
          lines: [{ id: "l1", seasonalPlanId: "spp-3", commodityId: "cm-sorghum", quantityMt: 10 }],
          updatedBy: "tester",
        }),
      ),
    ).toMatch(/only name a commodity the selected plan carries/i);
  });

  it("stamps the budget as shared on update too", async () => {
    const before = (await api.getBudget("bg-3"))!;
    expect(before.sharedOn).toBeUndefined();
    const res = await api.updateBudget("bg-3", {
      fromDate: before.fromDate,
      toDate: before.toDate,
      lines: before.lines,
      updatedBy: "tester",
      share: true,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.sharedOn).toBe(TODAY);
    expect(res.value.sharedBy).toBe("tester");
  });
});

/* ================================================================== *
 * updateSeasonalPurchasePlan
 *
 * §6.1 does not describe editing a plan at all. What is pinned here is that the
 * update applies the same structural rules as the create, records that a change
 * happened, and leaves the record's identity alone.
 * ================================================================== */

describe("updateSeasonalPurchasePlan", () => {
  it("changes the period, the lines and the note, and stamps who changed it when", async () => {
    const res = await api.updateSeasonalPurchasePlan("spp-3", {
      from: { year: 2026, month: 6 },
      to: { year: 2026, month: 8 },
      note: "Extended by a month.",
      updatedBy: "tester",
      rows: [
        {
          id: "x1",
          commodityId: "cm-watermelon-seed",
          note: "PZU",
          cells: [
            { year: 2026, month: 6, quantityMt: 300 },
            { year: 2026, month: 8, quantityMt: 150 },
          ],
        },
      ],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(seasonLengthMonths(res.value.from, res.value.to)).toBe(3);
    expect(planTotals(res.value).quantityMt).toBe(450);
    expect(res.value.note).toBe("Extended by a month.");
    expect(res.value.updatedOn).toBe(TODAY);
    expect(res.value.updatedBy).toBe("tester");
  });

  it("leaves the reference, the creation date and the creator alone", async () => {
    const before = (await api.getSeasonalPurchasePlan("spp-3"))!;
    const res = await api.updateSeasonalPurchasePlan("spp-3", {
      from: before.from,
      to: before.to,
      rows: [],
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.planRef).toBe(before.planRef);
    expect(res.value.createdOn).toBe(before.createdOn);
    expect(res.value.createdBy).toBe(before.createdBy);
    expect(res.value.id).toBe("spp-3");
  });

  it("persists the change, and does not add a second plan", async () => {
    const count = (await api.listSeasonalPurchasePlans()).length;
    await api.updateSeasonalPurchasePlan("spp-3", {
      from: { year: 2026, month: 6 },
      to: { year: 2026, month: 6 },
      rows: [
        {
          id: "x1",
          commodityId: "cm-watermelon-seed",
          cells: [{ year: 2026, month: 6, quantityMt: 99 }],
        },
      ],
      updatedBy: "tester",
    });
    const after = await api.getSeasonalPurchasePlan("spp-3");
    expect(planTotals(after!).quantityMt).toBe(99);
    expect(seasonLengthMonths(after!.from, after!.to)).toBe(1);
    expect((await api.listSeasonalPurchasePlans()).length).toBe(count);
  });

  it("refuses an id that does not exist", async () => {
    expect(
      reasonOf(
        await api.updateSeasonalPurchasePlan("spp-nope", {
          from: { year: 2026, month: 9 },
          to: { year: 2026, month: 10 },
          rows: [],
        }),
      ),
    ).toMatch(/not found/i);
  });

  it("applies the same structural refusals as the create", async () => {
    expect(
      reasonOf(
        await api.updateSeasonalPurchasePlan("spp-2", {
          from: { year: 2027, month: 2 },
          to: { year: 2026, month: 9 },
          rows: [],
        }),
      ),
    ).toMatch(/spans no months/i);

    // Narrowing the period is allowed; handing over a line that no longer fits is not.
    // The edit screen therefore drops those lines from what it submits, having named
    // them on screen first — the store never silently discards one.
    expect(
      reasonOf(
        await api.updateSeasonalPurchasePlan("spp-2", {
          from: { year: 2026, month: 9 },
          to: { year: 2026, month: 10 },
          rows: [
            {
              id: "x1",
              commodityId: "cm-sesame-white",
              cells: [{ year: 2026, month: 12, quantityMt: 10 }],
            },
          ],
        }),
      ),
    ).toMatch(/December 2026/);

    expect(
      reasonOf(
        await api.updateSeasonalPurchasePlan("spp-2", {
          from: { year: 2026, month: 9 },
          to: { year: 2026, month: 9 },
          rows: [{ id: "x1", cells: [{ year: 2026, month: 9, quantityMt: -1 }] }],
        }),
      ),
    ).toMatch(/cannot be negative/i);
  });

  it("leaves the stored plan untouched when it refuses", async () => {
    const before = (await api.getSeasonalPurchasePlan("spp-2"))!;
    await api.updateSeasonalPurchasePlan("spp-2", {
      from: { year: 2027, month: 2 },
      to: { year: 2026, month: 9 },
      rows: [],
    });
    const after = (await api.getSeasonalPurchasePlan("spp-2"))!;
    expect(after.from).toEqual(before.from);
    expect(after.rows.length).toBe(before.rows.length);
    expect(after.updatedOn).toBeUndefined();
  });

  it("narrowing the period to a line set that fits is accepted, and the rest are gone", async () => {
    const res = await api.updateSeasonalPurchasePlan("spp-2", {
      from: { year: 2026, month: 9 },
      to: { year: 2026, month: 10 },
      updatedBy: "tester",
      rows: [
        {
          id: "x1",
          commodityId: "cm-sesame-white",
          note: "PZU",
          cells: [
            { year: 2026, month: 9, quantityMt: 5000 },
            { year: 2026, month: 10, quantityMt: 7500 },
          ],
        },
      ],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.rows).toHaveLength(1);
    expect(planTotals(res.value).quantityMt).toBe(12500);
  });
});

/* ================================================================== *
 * updateBudget
 * ================================================================== */

describe("updateBudget", () => {
  it("changes the period, the lines, the approval status and the note, and stamps the change", async () => {
    const res = await api.updateBudget("bg-1", {
      fromDate: "2026-10-01",
      toDate: "2027-01-31",
      approvalStatus: "Re-approved after revision",
      note: "Trimmed by one supplier.",
      updatedBy: "tester",
      lines: [
        {
          id: "l1",
          seasonalPlanId: "spp-2",
          quantityMt: 9000,
          amount: money(5850000, "USD"),
          supplierId: "cp-sup-gabani",
        },
      ],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.fromDate).toBe("2026-10-01");
    expect(res.value.lines).toHaveLength(1);
    expect(res.value.approvalStatus).toBe("Re-approved after revision");
    expect(res.value.note).toBe("Trimmed by one supplier.");
    expect(res.value.updatedOn).toBe(TODAY);
    expect(res.value.updatedBy).toBe("tester");
    expect(budgetTotals(res.value).quantityMt).toBe(9000);
  });

  it("leaves the reference, the creation date and the creator alone", async () => {
    const before = (await api.getBudget("bg-1"))!;
    const res = await api.updateBudget("bg-1", {
      fromDate: before.fromDate,
      toDate: before.toDate,
      lines: before.lines,
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.budgetRef).toBe(before.budgetRef);
    expect(res.value.createdOn).toBe(before.createdOn);
    expect(res.value.createdBy).toBe(before.createdBy);
  });

  it("refuses an id that does not exist", async () => {
    expect(
      reasonOf(
        await api.updateBudget("bg-nope", {
          fromDate: "2026-09-01",
          toDate: "2027-02-28",
          lines: [{ id: "l1", quantityMt: 10 }],
        }),
      ),
    ).toMatch(/not found/i);
  });

  it("applies the same structural refusals as the create", async () => {
    expect(
      reasonOf(
        await api.updateBudget("bg-1", {
          fromDate: "2027-02-28",
          toDate: "2026-09-01",
          lines: [{ id: "l1", quantityMt: 10 }],
        }),
      ),
    ).toMatch(/To date cannot fall before/i);

    expect(
      reasonOf(await api.updateBudget("bg-1", { fromDate: "2026-09-01", toDate: "2027-02-28", lines: [] })),
    ).toMatch(/at least one line/i);

    expect(
      reasonOf(
        await api.updateBudget("bg-1", {
          fromDate: "2026-09-01",
          toDate: "2027-02-28",
          lines: [{ id: "l1", seasonalPlanId: "spp-nope", quantityMt: 10 }],
        }),
      ),
    ).toMatch(/plan that does not exist/i);
  });

  it("leaves the stored budget untouched when it refuses", async () => {
    const before = (await api.getBudget("bg-1"))!;
    await api.updateBudget("bg-1", { fromDate: "2026-09-01", toDate: "2027-02-28", lines: [] });
    const after = (await api.getBudget("bg-1"))!;
    expect(after.lines.length).toBe(before.lines.length);
    expect(after.approvalStatus).toBe(before.approvalStatus);
    expect(after.updatedOn).toBeUndefined();
  });
});

/* ================================================================== *
 * What is deliberately NOT refused
 *
 * Each of these would be a business rule §6.1 or §6.2 does not state. They pass
 * today; if one of them starts failing, a rule has been invented somewhere.
 * ================================================================== */

describe("what §6.1 and §6.2 leave open, and so is not refused", () => {
  it("saves a plan with a month carrying no line — §6.1 asks whether a month may be blank", async () => {
    const res = await api.createSeasonalPurchasePlan({
      from: { year: 2026, month: 9 },
      to: { year: 2026, month: 11 },
      createdBy: "tester",
      rows: [
        {
          id: "x1",
          commodityId: "cm-sesame-white",
          cells: [{ year: 2026, month: 10, quantityMt: 40 }],
        },
      ],
    });
    expect(res.ok).toBe(true);
  });

  it("saves a plan with no rows at all", async () => {
    const res = await api.createSeasonalPurchasePlan({
      from: { year: 2026, month: 9 },
      to: { year: 2026, month: 11 },
      createdBy: "tester",
      rows: [],
    });
    expect(res.ok).toBe(true);
  });

  it("saves a plan row with no commodity, no note and no quantity", async () => {
    const res = await api.createSeasonalPurchasePlan({
      from: { year: 2026, month: 9 },
      to: { year: 2026, month: 9 },
      createdBy: "tester",
      rows: [{ id: "x1", cells: [] }],
    });
    expect(res.ok).toBe(true);
  });

  it("saves two commodities against the same month, which is the normal case in the sheet", async () => {
    const res = await api.createSeasonalPurchasePlan({
      from: { year: 2026, month: 11 },
      to: { year: 2026, month: 11 },
      createdBy: "tester",
      rows: [
        {
          id: "x1",
          commodityId: "cm-sesame-white",
          cells: [{ year: 2026, month: 11, quantityMt: 10 }],
        },
        {
          id: "x2",
          commodityId: "cm-peanut-shelled",
          cells: [{ year: 2026, month: 11, quantityMt: 20 }],
        },
      ],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.rows).toHaveLength(2);
    expect(planTotals(res.value).quantityMt).toBe(30);
  });

  it("saves the same commodity on two rows, which the sheet never does and nothing forbids", async () => {
    const res = await api.createSeasonalPurchasePlan({
      from: { year: 2026, month: 11 },
      to: { year: 2026, month: 11 },
      createdBy: "tester",
      rows: [
        { id: "x1", commodityId: "cm-sorghum", cells: [{ year: 2026, month: 11, quantityMt: 10 }] },
        { id: "x2", commodityId: "cm-sorghum", cells: [{ year: 2026, month: 11, quantityMt: 20 }] },
      ],
    });
    expect(res.ok).toBe(true);
  });

  it("saves a budget with no approval status — the field is not stated to be required", async () => {
    const res = await api.createBudget({
      fromDate: "2026-09-01",
      toDate: "2027-02-28",
      createdBy: "tester",
      lines: [{ id: "l1", seasonalPlanId: "spp-2", quantityMt: 10 }],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.approvalStatus).toBeUndefined();
  });

  it("accepts any approval status text, in any order, with no sequence enforced", async () => {
    const first = await api.createBudget({
      fromDate: "2026-09-01",
      toDate: "2027-02-28",
      approvalStatus: "Approved",
      createdBy: "tester",
      lines: [{ id: "l1", quantityMt: 10 }],
    });
    const second = await api.createBudget({
      fromDate: "2026-09-01",
      toDate: "2027-02-28",
      approvalStatus: "Draft",
      createdBy: "tester",
      lines: [{ id: "l1", quantityMt: 10 }],
    });
    expect(first.ok).toBe(true);
    // Going from Approved back to Draft on a later record is not a transition and is
    // not refused: no sequence between values is stated anywhere.
    expect(second.ok).toBe(true);
  });

  it("saves a budget period outside the seasonal period of the plan it names", async () => {
    // §6.2 asks whether the budget period must fall inside the seasonal period of §6.1.
    // The screens show the comparison; nothing refuses it.
    const res = await api.createBudget({
      fromDate: "2024-01-01",
      toDate: "2024-06-30",
      createdBy: "tester",
      lines: [{ id: "l1", seasonalPlanId: "spp-2", quantityMt: 10 }],
    });
    expect(res.ok).toBe(true);
  });

  it("saves a budget quantity far above the quantity its plan plans", async () => {
    // §6.2 asks whether the two must reconcile. The variance is shown, not enforced.
    const plan = await api.getSeasonalPurchasePlan("spp-2");
    const planned = planTotals(plan!).quantityMt;
    const res = await api.createBudget({
      fromDate: "2026-09-01",
      toDate: "2027-02-28",
      createdBy: "tester",
      lines: [{ id: "l1", seasonalPlanId: "spp-2", quantityMt: planned * 10 }],
    });
    expect(res.ok).toBe(true);
  });

  it("lets an edit empty a plan out entirely", async () => {
    // §6.1 states no completeness rule on create, so it states none on a change either.
    const before = (await api.getSeasonalPurchasePlan("spp-1"))!;
    const res = await api.updateSeasonalPurchasePlan("spp-1", {
      from: before.from,
      to: before.to,
      rows: [],
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.rows).toEqual([]);
  });

  it("lets an edit clear a budget's approval status back to blank", async () => {
    const before = (await api.getBudget("bg-1"))!;
    expect(before.approvalStatus).toBeTruthy();
    const res = await api.updateBudget("bg-1", {
      fromDate: before.fromDate,
      toDate: before.toDate,
      lines: before.lines,
      approvalStatus: "",
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // Clearing an approval is not a backwards transition, because there is no sequence
    // to go backwards along and nothing was gated on the value in the first place.
    expect(res.value.approvalStatus).toBeUndefined();
  });

  it("lets an edit move an approval status to any other value, in any direction", async () => {
    const before = (await api.getBudget("bg-1"))!;
    for (const status of ["Draft", "Rejected", "Approved", "Anything at all"]) {
      const res = await api.updateBudget("bg-1", {
        fromDate: before.fromDate,
        toDate: before.toDate,
        lines: before.lines,
        approvalStatus: status,
        updatedBy: "tester",
      });
      expect(res.ok).toBe(true);
    }
  });

  it("saves budget lines in different currencies on one budget", async () => {
    const res = await api.createBudget({
      fromDate: "2026-09-01",
      toDate: "2027-02-28",
      createdBy: "tester",
      lines: [
        { id: "l1", quantityMt: 10, amount: money(1000, "USD") },
        { id: "l2", quantityMt: 10, amount: money(600000, "SDG") },
      ],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // And they are totalled separately rather than added together.
    expect(budgetTotals(res.value).amounts).toHaveLength(2);
  });
});
