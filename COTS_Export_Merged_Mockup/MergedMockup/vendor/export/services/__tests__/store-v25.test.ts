/**
 * The changes of 3 September 2026 — the store and the derivations behind them.
 *
 * Same discipline as `store-v2.test.ts`: every rule is tested for the path that should
 * succeed and for the refusal, and the refusal is checked for a reason that names the
 * rule. A refusal a user cannot read is a refusal a user will work around.
 *
 * What is deliberately *not* tested as a rule, because these changes state none:
 *   · nothing gates on a quality-inspection result — a rejected inspection still allows
 *     a receipt, a save and any flow status;
 *   · nothing gates on an agreement type — Fixed and Collection behave identically;
 *   · nothing requires a fund's issued payment amount to match the value requested;
 *   · nothing requires the agreements on one purchase order to share a supplier, a
 *     commodity or a season.
 * Each of those has a test below asserting that the permissive path *is* permitted, so a
 * rule invented later cannot slip in unnoticed.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { api, resetStore, setLatency } from "../store";
import { TODAY, money } from "../../domain/calc";
import {
  budgetIssuedPaymentRate,
  budgetIssuedPaymentRateBasis,
  budgetIssuedPaymentRateDate,
  budgetIssuedPaymentUsd,
  budgetPlanConflict,
  budgetPlanId,
} from "../../domain/planning";
import {
  deliveryUpdates,
  fundConvertedLocalAmount,
  fundValueUsd,
  purchaseOrderLineUsd,
  purchaseOrderTotals,
  qualityInspectionSummary,
} from "../../domain/sourcing";
import { receivingLocationKindOf, receivingLocationsIn } from "../../data/master";
import { activeCountryOf, countryUnitByName } from "../../domain/variants";
import type { QualityInspection } from "../../domain/types";

setLatency(0);

beforeEach(() => {
  resetStore();
});

function reasonOf(res: { ok: true } | { ok: false; reason: string }): string {
  expect(res.ok).toBe(false);
  return res.ok ? "" : res.reason;
}

/* ================================================================== *
 * BUDGET — one plan per budget, and the issued payment amount
 * ================================================================== */

describe("budget — one plan, held on the budget", () => {
  it("saves the plan on the budget and not only on its lines", async () => {
    const res = await api.createBudget({
      seasonalPlanId: "spp-2",
      fromDate: "2026-10-01",
      toDate: "2027-01-31",
      lines: [
        { id: "l1", seasonalPlanId: "spp-2", commodityId: "cm-sesame-white", quantityMt: 100 },
        { id: "l2", seasonalPlanId: "spp-2", commodityId: "cm-peanut-shelled", quantityMt: 200 },
      ],
      createdBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.seasonalPlanId).toBe("spp-2");
    expect(budgetPlanId(res.value)).toBe("spp-2");
    /* Two lines, one plan, one commodity each — "one plan and multiple budget per
       commodity", which is what the instruction asks for. */
    expect(budgetPlanConflict(res.value)).toEqual([]);
    expect(res.value.lines).toHaveLength(2);
  });

  it("reads the plan off the lines on a budget that carries none of its own", () => {
    /* The shape a record saved before 3 September 2026 has. `budgetPlanId` is what lets
       every screen keep working against it without the seed being rewritten. */
    expect(
      budgetPlanId({
        lines: [{ id: "l1", seasonalPlanId: "spp-1", commodityId: "cm-sorghum" }],
      }),
    ).toBe("spp-1");
  });

  it("reports, rather than resolves, a budget whose lines name another plan", async () => {
    const b = await api.getBudget("bg-2");
    expect(b).toBeDefined();
    if (!b) return;
    /* bg-2's own plan is spp-2 and its second line still names the closed spp-3. */
    expect(budgetPlanId(b)).toBe("spp-2");
    expect(budgetPlanConflict(b)).toEqual(["spp-3"]);
  });

  it("writes one plan to every line when such a budget is saved", async () => {
    const b = await api.getBudget("bg-2");
    if (!b) return expect.unreachable();
    const res = await api.updateBudget("bg-2", {
      seasonalPlanId: "spp-2",
      fromDate: b.fromDate,
      toDate: b.toDate,
      /* What the Edit screen hands over: the budget's plan on every line. The line whose
         commodity does not belong to that plan has to be dealt with first — see the
         refusal below, which is what makes the user deal with it. */
      lines: b.lines
        .filter((l) => l.commodityId !== "cm-watermelon-seed")
        .map((l) => ({ ...l, seasonalPlanId: "spp-2" })),
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(budgetPlanConflict(res.value)).toEqual([]);
    expect(res.value.lines.every((l) => l.seasonalPlanId === "spp-2")).toBe(true);
  });

  /**
   * The consequence of one plan per budget that the instruction does not mention, and
   * the one thing on the Edit screen a user has to resolve by hand.
   *
   * bg-2's second line budgets Watermelon seed against SPP-2026-0003. Moving that line
   * onto the budget's own plan, SPP-2026-0002, would make it budget a commodity that
   * plan does not carry — which the rule of 27 August 2026 forbids. So the save is
   * refused with a reason naming the commodity and the plan, rather than the commodity
   * being dropped to make the plan fit. The Edit screen checks the same thing per row
   * before the service does, so the message appears against the line it belongs to.
   */
  it("refuses to move a line onto a plan that does not carry its commodity", async () => {
    const b = await api.getBudget("bg-2");
    if (!b) return expect.unreachable();
    const reason = reasonOf(
      await api.updateBudget("bg-2", {
        seasonalPlanId: "spp-2",
        fromDate: b.fromDate,
        toDate: b.toDate,
        lines: b.lines.map((l) => ({ ...l, seasonalPlanId: "spp-2" })),
        updatedBy: "tester",
      }),
    );
    expect(reason).toContain("Watermelon");
    expect(reason).toContain("SPP-2026-0002");
    expect(reason).toContain("only name a commodity the selected plan carries");
  });
});

describe("budget — the issued payment amount and its read-only conversion", () => {
  it("stores the amount and the currency, and stores no conversion", async () => {
    const b = await api.getBudget("bg-1");
    if (!b) return expect.unreachable();
    const res = await api.updateBudget("bg-1", {
      fromDate: b.fromDate,
      toDate: b.toDate,
      lines: b.lines,
      seasonalPlanId: b.seasonalPlanId,
      issuedPaymentLocal: 1_200_000,
      issuedPaymentCurrency: "SDG",
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.issuedPaymentLocal).toBe(1_200_000);
    expect(res.value.issuedPaymentCurrency).toBe("SDG");
    /* There is no rate and no USD figure on the record. The conversion is derived. */
    expect(Object.keys(res.value)).not.toContain("issuedPaymentUsd");
    expect(Object.keys(res.value)).not.toContain("issuedPaymentRate");
  });

  it("converts on the To date of the budget period, not on today", () => {
    /* bg-1 runs to 2027-02-28; the FX table's last SDG rate before that governs. A rate
       read on a different date would give a different number, which is the whole reason
       the date is stated on the screen. */
    const usd = budgetIssuedPaymentUsd({
      toDate: "2026-06-15",
      issuedPaymentLocal: 600_000,
      issuedPaymentCurrency: "SDG",
    });
    expect(usd).toBeDefined();
    /* 600,000 ÷ 600 (the 1 June 2026 rate) = 1,000. */
    expect(usd?.amount).toBe(1000);
    expect(usd?.currency).toBe("USD");
  });

  it("returns no conversion where the master holds no rate for that date", () => {
    expect(
      budgetIssuedPaymentUsd({
        toDate: "2020-01-01",
        issuedPaymentLocal: 600_000,
        issuedPaymentCurrency: "SDG",
      }),
    ).toBeUndefined();
  });

  it("returns the amount itself where it is already in USD", () => {
    const usd = budgetIssuedPaymentUsd({
      toDate: "2026-06-15",
      issuedPaymentLocal: 5000,
      issuedPaymentCurrency: "USD",
    });
    expect(usd?.amount).toBe(5000);
  });

  /* ---------------------------------------------------------------- *
   * The payment date, added later on 3 September 2026 — and the answer
   * to the one question the issued amount had left open.
   * ---------------------------------------------------------------- */

  it("reads the rate on the payment date where one is recorded", () => {
    /* SDG was 600 per USD from 1 June 2026 and 612 from 1 July. A payment on 20 June
       therefore converts at 600 — and it must not matter that the budget period ends in
       another month entirely, which is what the old To-date reading made it do. */
    const usd = budgetIssuedPaymentUsd({
      toDate: "2027-02-28",
      issuedPaymentLocal: 600_000,
      issuedPaymentCurrency: "SDG",
      issuedPaymentDate: "2026-06-20",
    });
    expect(usd?.amount).toBe(1000);
    expect(budgetIssuedPaymentRate({
      toDate: "2027-02-28",
      issuedPaymentCurrency: "SDG",
      issuedPaymentDate: "2026-06-20",
    })?.perUsd).toBe(600);
  });

  it("falls back to the To date only where no payment date is held", () => {
    const withDate = { toDate: "2026-08-31", issuedPaymentDate: "2026-06-20" };
    expect(budgetIssuedPaymentRateDate(withDate)).toBe("2026-06-20");
    expect(budgetIssuedPaymentRateBasis(withDate)).toBe("payment-date");

    /* The shape a budget saved before the field existed leaves. It still converts, and
       the screens say which date they used, so a figure cannot silently change meaning.
       Typed explicitly, since an object literal with no payment date has nothing in
       common with the parameter type and TypeScript rightly says so. */
    const withoutDate: { toDate: string; issuedPaymentDate?: string } = { toDate: "2026-08-31" };
    expect(budgetIssuedPaymentRateDate(withoutDate)).toBe("2026-08-31");
    expect(budgetIssuedPaymentRateBasis(withoutDate)).toBe("period-end");
  });

  it("gives a different conversion from the To-date reading, which is the point", () => {
    const base = {
      toDate: "2026-08-31",
      issuedPaymentLocal: 1_224_000,
      issuedPaymentCurrency: "SDG" as const,
    };
    /* 31 August 2026 reads the 1 August rate of 618; 20 June reads 600. Same amount, two
       answers — so which date governs was never a cosmetic question. */
    expect(budgetIssuedPaymentUsd(base)?.amount).toBeCloseTo(1_224_000 / 618, 2);
    expect(
      budgetIssuedPaymentUsd({ ...base, issuedPaymentDate: "2026-06-20" })?.amount,
    ).toBeCloseTo(1_224_000 / 600, 2);
  });

  it("stores the payment date and still stores no rate", async () => {
    const b = await api.getBudget("bg-1");
    if (!b) return expect.unreachable();
    const res = await api.updateBudget("bg-1", {
      fromDate: b.fromDate,
      toDate: b.toDate,
      lines: b.lines,
      seasonalPlanId: b.seasonalPlanId,
      issuedPaymentLocal: 900_000,
      issuedPaymentCurrency: "SDG",
      issuedPaymentDate: "2026-07-15",
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.issuedPaymentDate).toBe("2026-07-15");
    expect(Object.keys(res.value)).not.toContain("issuedPaymentRate");
    /* July 2026: 612 SDG per USD. */
    expect(budgetIssuedPaymentUsd(res.value)?.amount).toBeCloseTo(900_000 / 612, 2);
  });

  it("carries a payment date on the seeded budget, so the fallback is not the only path exercised", async () => {
    const b = await api.getBudget("bg-1");
    if (!b) return expect.unreachable();
    expect(b.issuedPaymentDate).toBe("2026-08-20");
    expect(budgetIssuedPaymentRateBasis(b)).toBe("payment-date");
  });

  it("clears the amount when it is saved away", async () => {
    const b = await api.getBudget("bg-1");
    if (!b) return expect.unreachable();
    const res = await api.updateBudget("bg-1", {
      fromDate: b.fromDate,
      toDate: b.toDate,
      lines: b.lines,
      seasonalPlanId: b.seasonalPlanId,
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.issuedPaymentLocal).toBeUndefined();
    /* The date goes with the amount: a payment date with no amount describes nothing. */
    expect(res.value.issuedPaymentDate).toBeUndefined();
  });
});

/* ================================================================== *
 * THE SESSION'S OPERATING COUNTRY
 *
 * The country drop-down came off the receiving-location plan line on 3 September
 * 2026, on the grounds that Core already knows the country. These pin the reading
 * that replaced it — including the fallback, which must be reported rather than
 * silently applied.
 * ================================================================== */

describe("the operating country is read from the session, not asked for", () => {
  it("takes the country off the user where one is carried", () => {
    const c = activeCountryOf({ country: "ET", unit: "Humera Processing · Ethiopia" });
    expect(c).toMatchObject({ code: "ET", name: "Ethiopia", resolved: true, source: "session" });
  });

  it("falls back to the country name the session's unit string ends with", () => {
    /* The integration layer composes `unit` as "<org unit> · <active country>", so this is
       the path taken by a session carried from Core before the country code was added. */
    const c = activeCountryOf({ unit: "Port Sudan Execution · Sudan" });
    expect(c).toMatchObject({ code: "SD", resolved: true, source: "unit" });
  });

  it("reports a default rather than applying one silently", () => {
    /* A screen that scopes itself to a country nobody chose is the defect the drop-down
       was removed to avoid, so an unresolved country says so. */
    const c = activeCountryOf({ unit: "Trading Desk" });
    expect(c.resolved).toBe(false);
    expect(c.source).toBe("default");
    expect(c.code).toBe("SD");
  });

  it("resolves nothing from a signed-out session, and still names a country", () => {
    expect(activeCountryOf(null).resolved).toBe(false);
    expect(activeCountryOf(undefined).code).toBe("SD");
  });

  it("maps every country name the Core session can hold", () => {
    expect(countryUnitByName("Sudan")).toBe("SD");
    expect(countryUnitByName("Ethiopia")).toBe("ET");
    expect(countryUnitByName("Chad")).toBe("TD");
    expect(countryUnitByName("Tanzania")).toBe("TZ");
    expect(countryUnitByName("Mozambique")).toBe("MZ");
    /* Case and padding are the shell's business, not this function's. */
    expect(countryUnitByName("  sudan ")).toBe("SD");
    expect(countryUnitByName("Atlantis")).toBeUndefined();
    expect(countryUnitByName(undefined)).toBeUndefined();
  });

  it("gives every demo account a country, so the standalone prototype resolves one", async () => {
    const { DEMO_USERS } = await import("../../data/master");
    expect(DEMO_USERS.length).toBeGreaterThan(0);
    for (const u of DEMO_USERS) {
      expect(activeCountryOf(u).resolved, `${u.username} resolves no country`).toBe(true);
    }
  });
});

/* ================================================================== *
 * FUND — the issued payment amount, the slip, and what the USD divides
 * ================================================================== */

describe("fund — the conversion is calculated on the issued payment amount", () => {
  it("divides the issued amount, not the value requested", async () => {
    const res = await api.updateFund("fd-1", {
      issuedPaymentLocal: 900_000,
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(fundConvertedLocalAmount(res.value)).toBe(900_000);
    /* fd-1 was paid 18 June 2026, so the 1 June rate of 600 governs: 900,000 ÷ 600. */
    expect(fundValueUsd(res.value)?.amount).toBe(1500);
    /* And the value requested is untouched — the two figures mean different things. */
    expect(res.value.valueLocal).toBe(1_000_000);
  });

  it("falls back to the value requested where no issued amount is held", async () => {
    const f = await api.getFund("fd-3");
    if (!f) return expect.unreachable();
    expect(f.issuedPaymentLocal).toBeUndefined();
    expect(fundConvertedLocalAmount(f)).toBe(f.valueLocal);
    expect(fundValueUsd(f)).toBeDefined();
  });

  it("keeps the payment slip separately from the fund document", async () => {
    const res = await api.updateFund("fd-2", {
      paymentSlipName: "slip-431-rev2.pdf",
      documentName: "fund-431.pdf",
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.paymentSlipName).toBe("slip-431-rev2.pdf");
    expect(res.value.documentName).toBe("fund-431.pdf");
  });

  it("permits an issued amount that does not match the value requested", async () => {
    /* Nothing states the two must agree. The seeded fd-2 is issued short on purpose. */
    const f = await api.getFund("fd-2");
    if (!f) return expect.unreachable();
    expect(f.issuedPaymentLocal).toBe(720_000);
    expect(f.valueLocal).toBe(750_000);
  });
});

/* ================================================================== *
 * PURCHASE AGREEMENT — the type, the inspections, the new flow status
 * ================================================================== */

describe("purchase agreement — agreement type", () => {
  const base = {
    seasonality: "2025-2026",
    commodityId: "cm-sesame-white",
    supplierId: "cp-sup-gabani",
    purchaser: "Tester",
    createdBy: "tester",
    totalQuantityMt: 100,
    flowStatus: "open" as const,
    agreementDate: TODAY,
    bagWeightApplicable: false,
    attachments: [],
  };

  it("takes the type from the Add screen, which now carries the field", async () => {
    /* On the Add screen as of 3 September 2026 — "visible in the view list, view and edit
       screen" — so a Collection agreement can be created as one rather than created Fixed
       and corrected afterwards. */
    const res = await api.createPurchaseAgreement({ ...base, agreementType: "collection" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.agreementType).toBe("collection");
  });

  it("defaults to Fixed when a caller does not send the field", async () => {
    const res = await api.createPurchaseAgreement(base);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.agreementType).toBe("fixed");
    expect(res.value.qualityInspections).toEqual([]);
  });

  it("lets Procurement change it to Collection on the Edit screen", async () => {
    const res = await api.updatePurchaseAgreement("pa-1", {
      agreementType: "collection",
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.agreementType).toBe("collection");
  });

  /**
   * The purchaser is no longer captured on either screen, so the store has to behave in a
   * particular way for that to be safe: an update that does not mention the purchaser must
   * leave it alone. It already does — the patch is partial — and this pins it, because a
   * regression there would silently rewrite who struck a deal.
   */
  it("leaves the captured purchaser alone on an update that does not send one", async () => {
    const before = await api.getPurchaseAgreement("pa-1");
    if (!before) return expect.unreachable();
    expect(before.purchaser).toBe("Selim Aziz");
    const res = await api.updatePurchaseAgreement("pa-1", {
      /* What the Edit screen now sends: everything except the purchaser. */
      totalQuantityMt: 2500,
      flowStatus: "hold",
      agreementType: "collection",
      updatedBy: "someone.else",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.purchaser).toBe("Selim Aziz");
    expect(res.value.updatedBy).toBe("someone.else");
  });

  it("still refuses an agreement created with no purchaser at all", async () => {
    /* The Add screen reads the name from the session and cannot send a blank one, but the
       service check stays: it guards every other caller, and the screen surfaces its own
       message for the case where a session carries no display name. */
    const { purchaser: _drop, ...noPurchaser } = base;
    expect(reasonOf(await api.createPurchaseAgreement({ ...noPurchaser, purchaser: "  " }))).toContain(
      "Name the purchaser",
    );
  });

  it("changes nothing else — neither type gates anything", async () => {
    const before = await api.getPurchaseAgreement("pa-1");
    await api.updatePurchaseAgreement("pa-1", { agreementType: "collection", updatedBy: "tester" });
    const after = await api.getPurchaseAgreement("pa-1");
    if (!before || !after) return expect.unreachable();
    expect(after.flowStatus).toBe(before.flowStatus);
    expect(after.totalQuantityMt).toBe(before.totalQuantityMt);
  });
});

describe("purchase agreement — For Quality Inspection", () => {
  it("accepts the new flow status", async () => {
    const res = await api.updatePurchaseAgreement("pa-1", {
      flowStatus: "for_quality_inspection",
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.flowStatus).toBe("for_quality_inspection");
  });

  it("is set by hand — recording an inspection does not set it", async () => {
    const before = await api.getPurchaseAgreement("pa-4");
    if (!before) return expect.unreachable();
    const res = await api.updatePurchaseAgreement("pa-4", {
      qualityInspections: [
        {
          id: "qi-x",
          commodityTypeId: "cm-sesame-red",
          supplierLocation: "Anywhere",
          estimatedQuantityUnit: "mt",
        },
      ],
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.flowStatus).toBe(before.flowStatus);
  });
});

describe("purchase agreement — quality inspections", () => {
  const inspection = (over: Partial<QualityInspection> = {}): QualityInspection => ({
    id: "qi-t",
    commodityTypeId: "cm-sesame-white",
    supplierLocation: "Gedaref collection yard",
    estimatedQuantity: 100,
    estimatedQuantityUnit: "mt",
    ...over,
  });

  it("records several against one agreement", async () => {
    const res = await api.updatePurchaseAgreement("pa-4", {
      qualityInspections: [
        inspection({ id: "qi-a", commodityTypeId: "cm-sesame-red", result: "approved" }),
        inspection({ id: "qi-b", commodityTypeId: "cm-sesame-red", result: "re_test" }),
        inspection({ id: "qi-c", commodityTypeId: "cm-sesame-red" }),
      ],
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.qualityInspections).toHaveLength(3);
  });

  it("permits a row with no quantity, no test date and no result", async () => {
    const res = await api.updatePurchaseAgreement("pa-4", {
      qualityInspections: [
        {
          id: "qi-bare",
          commodityTypeId: "cm-sesame-red",
          supplierLocation: "Kassala buying point",
          estimatedQuantityUnit: "bags",
        },
      ],
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
  });

  it("refuses a row with no commodity type, naming the rule", async () => {
    expect(
      reasonOf(
        await api.updatePurchaseAgreement("pa-4", {
          qualityInspections: [inspection({ commodityTypeId: "" })],
          updatedBy: "tester",
        }),
      ),
    ).toContain("names a commodity type");
  });

  it("refuses a commodity type that is not in the master", async () => {
    expect(
      reasonOf(
        await api.updatePurchaseAgreement("pa-4", {
          qualityInspections: [inspection({ commodityTypeId: "cm-not-a-commodity" })],
          updatedBy: "tester",
        }),
      ),
    ).toContain("not in the commodity master");
  });

  it("refuses a row with no supplier location", async () => {
    expect(
      reasonOf(
        await api.updatePurchaseAgreement("pa-4", {
          qualityInspections: [inspection({ supplierLocation: "  " })],
          updatedBy: "tester",
        }),
      ),
    ).toContain("names a supplier location");
  });

  it("refuses a negative estimated quantity", async () => {
    expect(
      reasonOf(
        await api.updatePurchaseAgreement("pa-4", {
          qualityInspections: [inspection({ estimatedQuantity: -5 })],
          updatedBy: "tester",
        }),
      ),
    ).toContain("cannot be negative");
  });

  it("does not stop a receipt being booked against a rejected agreement", async () => {
    /* pa-3's seeded inspection is Rejected and its receipts exist. Nothing states that a
       rejected inspection blocks intake, so nothing here does. */
    const a = await api.getPurchaseAgreement("pa-3");
    if (!a) return expect.unreachable();
    expect(a.qualityInspections.some((qi) => qi.result === "rejected")).toBe(true);
    const receipts = await api.listIntakeReceipts();
    expect(receipts.some((r) => r.purchaseAgreementId === "pa-3")).toBe(true);
  });

  it("totals the two estimated units separately and never adds them", () => {
    const summary = qualityInspectionSummary([
      inspection({ id: "a", estimatedQuantity: 100, estimatedQuantityUnit: "mt" }),
      inspection({ id: "b", estimatedQuantity: 4000, estimatedQuantityUnit: "bags" }),
      inspection({ id: "c", estimatedQuantity: 50, estimatedQuantityUnit: "mt" }),
    ]);
    expect(summary.estimatedMt).toBe(150);
    expect(summary.estimatedBags).toBe(4000);
    expect(summary.count).toBe(3);
  });

  it("counts the results, and counts an untested row as pending", () => {
    const summary = qualityInspectionSummary([
      inspection({ id: "a", result: "approved" }),
      inspection({ id: "b", result: "rejected" }),
      inspection({ id: "c", result: "re_test" }),
      inspection({ id: "d" }),
    ]);
    expect(summary).toMatchObject({ approved: 1, rejected: 1, reTest: 1, pending: 1 });
  });
});

/* ================================================================== *
 * PURCHASE AGREEMENT VIEW — Delivery Updates
 * ================================================================== */

describe("delivery updates", () => {
  it("totals facility and warehouse receipts separately and adds them", async () => {
    const receipts = await api.listIntakeReceipts();
    const a = await api.getPurchaseAgreement("pa-1");
    if (!a) return expect.unreachable();
    const d = deliveryUpdates(a, receipts);
    const mine = receipts.filter((r) => r.purchaseAgreementId === "pa-1");
    const facility = mine
      .filter((r) => r.kind === "facility")
      .reduce((t, r) => t + r.grossWeightWithDirtMt, 0);
    const warehouse = mine
      .filter((r) => r.kind === "warehouse")
      .reduce((t, r) => t + r.grossWeightWithDirtMt, 0);
    expect(d.facilityReceiptMt).toBeCloseTo(facility, 3);
    expect(d.warehouseReceiptMt).toBeCloseTo(warehouse, 3);
    expect(d.deliveredMt).toBeCloseTo(facility + warehouse, 3);
  });

  it("floors the remainder at zero and reports the over-delivery instead", () => {
    const d = deliveryUpdates({ id: "pa-x", totalQuantityMt: 100 }, [
      {
        id: "r1",
        referenceNo: "R1",
        kind: "facility",
        purchaseAgreementId: "pa-x",
        location: "FC31 - Mahaseelna",
        receiptDate: TODAY,
        receiptFrom: "supplier",
        bags: { bpBags: 0, spBags: 0, juteBags: 0 },
        grossWeightWithDirtMt: 130,
      },
    ]);
    expect(d.remainingMt).toBe(0);
    expect(d.overDelivered).toBe(true);
    expect(d.overDeliveredMt).toBe(30);
    /* The dial never reads past full. */
    expect(d.fraction).toBe(1);
  });

  it("counts nothing against an agreement with no receipt", async () => {
    const receipts = await api.listIntakeReceipts();
    const a = await api.getPurchaseAgreement("pa-4");
    if (!a) return expect.unreachable();
    const d = deliveryUpdates(a, receipts);
    expect(d.deliveredMt).toBe(0);
    expect(d.remainingMt).toBe(a.totalQuantityMt);
  });
});

/* ================================================================== *
 * RECEIVING LOCATION — the warehouse-or-facility master
 * ================================================================== */

describe("receiving location master", () => {
  it("offers only the chosen country's locations of the chosen kind", () => {
    const sdWarehouses = receivingLocationsIn("SD", "warehouse");
    expect(sdWarehouses.length).toBeGreaterThan(0);
    expect(sdWarehouses.every((l) => l.country === "SD" && l.kind === "warehouse")).toBe(true);
    expect(receivingLocationsIn("ET", "facility").every((l) => l.country === "ET")).toBe(true);
  });

  it("classifies a captured location string by its own code", () => {
    expect(receivingLocationKindOf("WH22 - Khartoum2")).toBe("warehouse");
    expect(receivingLocationKindOf("FC31 - Mahaseelna")).toBe("facility");
    /* A string the master has never held is read as a facility, because every captured
       receipt location that is not a warehouse is one. */
    expect(receivingLocationKindOf("Somewhere else")).toBe("facility");
  });

  it("keeps the seeded plan rows consistent with the master", async () => {
    const plans = await api.listReceivingLocationPlans();
    expect(plans.length).toBeGreaterThan(0);
    for (const p of plans) {
      expect(p.locationKind).toBe(receivingLocationKindOf(p.facility));
    }
  });
});

/* ================================================================== *
 * PROCUREMENT — the purchase order
 * ================================================================== */

describe("purchase order — the rules", () => {
  it("saves a PO number and the agreements beneath it", async () => {
    const res = await api.createPurchaseOrder({
      poNumber: "9001",
      createdBy: "tester",
      lines: [{ purchaseAgreementId: "pa-1" }, { purchaseAgreementId: "pa-2" }],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.poNumber).toBe("9001");
    expect(res.value.lines).toHaveLength(2);
    expect(res.value.createdOn).toBe(TODAY);
    /* Line ids are issued by the store, not by the caller. */
    expect(res.value.lines.every((l) => l.id.startsWith("pol-"))).toBe(true);
  });

  it("refuses a blank PO number, naming why it matters", async () => {
    const reason = reasonOf(
      await api.createPurchaseOrder({
        poNumber: "   ",
        createdBy: "tester",
        lines: [{ purchaseAgreementId: "pa-1" }],
      }),
    );
    expect(reason).toContain("PO number");
    expect(reason).toContain("identifies a row");
  });

  it("refuses a duplicate PO number", async () => {
    const reason = reasonOf(
      await api.createPurchaseOrder({
        poNumber: "1123",
        createdBy: "tester",
        lines: [{ purchaseAgreementId: "pa-1" }],
      }),
    );
    expect(reason).toContain("already exists");
  });

  it("refuses an order with no agreement", async () => {
    expect(
      reasonOf(await api.createPurchaseOrder({ poNumber: "9002", createdBy: "tester", lines: [] })),
    ).toContain("at least one purchase agreement");
  });

  it("refuses an agreement that does not exist", async () => {
    expect(
      reasonOf(
        await api.createPurchaseOrder({
          poNumber: "9003",
          createdBy: "tester",
          lines: [{ purchaseAgreementId: "pa-nope" }],
        }),
      ),
    ).toContain("does not exist");
  });

  it("refuses the same agreement twice on one order", async () => {
    const reason = reasonOf(
      await api.createPurchaseOrder({
        poNumber: "9004",
        createdBy: "tester",
        lines: [{ purchaseAgreementId: "pa-1" }, { purchaseAgreementId: "pa-1" }],
      }),
    );
    expect(reason).toContain("twice");
    expect(reason).toContain("in one place");
  });

  it("refuses a negative payment amount", async () => {
    expect(
      reasonOf(
        await api.createPurchaseOrder({
          poNumber: "9005",
          createdBy: "tester",
          lines: [{ purchaseAgreementId: "pa-1", paymentAmount: money(-1, "SDG") }],
        }),
      ),
    ).toContain("cannot be negative");
  });

  it("permits agreements that share no supplier, commodity or season", async () => {
    /* pa-1 and pa-5 differ in commodity and season. Nothing states they must agree. */
    const res = await api.createPurchaseOrder({
      poNumber: "9006",
      createdBy: "tester",
      lines: [{ purchaseAgreementId: "pa-1" }, { purchaseAgreementId: "pa-5" }],
    });
    expect(res.ok).toBe(true);
  });

  it("permits an amount with no payment date", async () => {
    const res = await api.createPurchaseOrder({
      poNumber: "9007",
      createdBy: "tester",
      lines: [{ purchaseAgreementId: "pa-1", paymentAmount: money(500, "SDG") }],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    /* And it converts to nothing, which is not zero. */
    expect(purchaseOrderLineUsd(res.value.lines[0])).toBeUndefined();
    expect(purchaseOrderTotals(res.value).linesWithoutConversion).toBe(1);
  });

  it("edits the PO number and the whole agreement list", async () => {
    const res = await api.updatePurchaseOrder("po-4", {
      poNumber: "1331",
      lines: [
        {
          purchaseAgreementId: "pa-4",
          paymentAmount: money(200_000, "SDG"),
          actualPaymentDate: "2026-08-14",
        },
      ],
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.poNumber).toBe("1331");
    expect(res.value.lines).toHaveLength(1);
    expect(res.value.updatedOn).toBe(TODAY);
    expect(res.value.updatedBy).toBe("tester");
  });

  it("lets an order keep its own PO number when it is edited", async () => {
    const res = await api.updatePurchaseOrder("po-1", {
      poNumber: "1123",
      lines: [{ purchaseAgreementId: "pa-1" }],
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
  });

  it("refuses an edit onto another order's PO number", async () => {
    expect(
      reasonOf(
        await api.updatePurchaseOrder("po-4", {
          poNumber: "1123",
          lines: [{ purchaseAgreementId: "pa-4" }],
          updatedBy: "tester",
        }),
      ),
    ).toContain("already exists");
  });

  it("refuses an edit to an order that does not exist", async () => {
    expect(
      reasonOf(
        await api.updatePurchaseOrder("po-nope", {
          poNumber: "9999",
          lines: [{ purchaseAgreementId: "pa-1" }],
        }),
      ),
    ).toContain("not found");
  });
});

describe("purchase order — the read-only USD conversion", () => {
  it("converts each line at the rate in force on its own payment date", async () => {
    const o = await api.getPurchaseOrder("po-1");
    if (!o) return expect.unreachable();
    /* po-1's two lines were paid in June and July 2026, when the SDG rate was 600 and
       612. Converting both at one rate would give a different — and wrong — total. */
    const [june, july] = o.lines;
    expect(purchaseOrderLineUsd(june)?.amount).toBeCloseTo(1_000_000 / 600, 2);
    expect(purchaseOrderLineUsd(july)?.amount).toBeCloseTo(720_000 / 612, 2);
    const totals = purchaseOrderTotals(o);
    expect(totals.usdAmount.amount).toBeCloseTo(
      Math.round((1_000_000 / 600) * 100) / 100 + Math.round((720_000 / 612) * 100) / 100,
      2,
    );
  });

  it("returns a USD amount unchanged, with no rate read", async () => {
    const o = await api.getPurchaseOrder("po-2");
    if (!o) return expect.unreachable();
    expect(purchaseOrderLineUsd(o.lines[0])?.amount).toBe(512_000);
    const totals = purchaseOrderTotals(o);
    expect(totals.linesWithoutConversion).toBe(0);
  });

  it("totals local amounts per currency and never across them", async () => {
    const res = await api.createPurchaseOrder({
      poNumber: "9008",
      createdBy: "tester",
      lines: [
        {
          purchaseAgreementId: "pa-1",
          paymentAmount: money(600_000, "SDG"),
          actualPaymentDate: "2026-06-18",
        },
        {
          purchaseAgreementId: "pa-4",
          paymentAmount: money(1000, "USD"),
          actualPaymentDate: "2026-06-18",
        },
      ],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const totals = purchaseOrderTotals(res.value);
    expect(totals.localAmounts).toHaveLength(2);
    expect(totals.localAmounts.map((m) => m.currency).sort()).toEqual(["SDG", "USD"]);
    /* And the USD total is the sum of the conversions: 600,000 ÷ 600 + 1,000. */
    expect(totals.usdAmount.amount).toBeCloseTo(2000, 2);
  });

  it("leaves an unconvertible line out of the USD total and says so", async () => {
    const o = await api.getPurchaseOrder("po-3");
    if (!o) return expect.unreachable();
    const totals = purchaseOrderTotals(o);
    expect(totals.usdAmount.amount).toBe(0);
    expect(totals.linesWithoutConversion).toBe(1);
    expect(totals.localAmounts).toHaveLength(1);
  });

  it("counts an order with no payment at all as unpaid, not as zero", async () => {
    const o = await api.getPurchaseOrder("po-4");
    if (!o) return expect.unreachable();
    const totals = purchaseOrderTotals(o);
    expect(totals.linesWithoutPayment).toBe(2);
    expect(totals.localAmounts).toEqual([]);
    expect(totals.latestPaymentDate).toBeUndefined();
  });
});
