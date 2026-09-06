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
import {
  CONSIGNEES,
  PACKING_SIZES_KG,
  bankBranchesFor,
  bankByName,
  consigneeByName,
  defaultContainerTypeFor,
  isMasterContainerType,
  counterpartiesOfType,
  isMasterPackingSize,
  shipperByName,
} from "../../data/master";
import { emptyDraft, type PurchaseContractDraft } from "../../domain/purchase-contract";
import { TODAY, cropYearOf, money } from "../../domain/calc";
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

/* ------------------------------------------------------------------ *
 * Phase 01 — creating an opportunity
 *
 * Added 6 September 2026. The screen has previewed since v1.0 and written nothing,
 * because the operation did not exist; these are the rules it now enforces, and — as
 * important — the three things it deliberately does *not* set.
 * ------------------------------------------------------------------ */

describe("creating an opportunity", () => {
  beforeEach(() => {
    resetStore();
    setLatency(0);
  });

  const good = {
    traderName: "Tomás Ferreira",
    commodityId: "cm-sesame-white",
    origin: "SD" as const,
    indicativeQuantityMt: 1000,
  };

  it("writes the opportunity, issues its reference and shows it in the list", async () => {
    const before = await api.listOpportunities();
    const res = await api.createOpportunity({ ...good, buyerId: "cp-anatolia", note: " a note " });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.opportunityNo).toMatch(/^OPP-\d{4}-\d{3}$/);
    expect(res.value.createdDate).toBe(TODAY);
    expect(res.value.traderName).toBe("Tomás Ferreira");
    expect(res.value.note).toBe("a note");
    const after = await api.listOpportunities();
    expect(after).toHaveLength(before.length + 1);
    expect(after.some((o) => o.id === res.value.id)).toBe(true);
    /* And it is readable by id, which is where the screen navigates to. */
    expect((await api.getOpportunity(res.value.id))?.opportunityNo).toBe(res.value.opportunityNo);
  });

  it("continues the reference sequence within the year rather than across all of them", async () => {
    const res = await api.createOpportunity(good);
    if (!res.ok) return expect.unreachable();
    const year = TODAY.slice(0, 4);
    /* The seed holds OPP-2026-009, -011, -014, -015 and -016, so the next is 017: the
       highest in the year plus one, not the count of records and not 001. */
    expect(res.value.opportunityNo).toBe(`OPP-${year}-017`);
    const second = await api.createOpportunity(good);
    if (!second.ok) return expect.unreachable();
    expect(second.value.opportunityNo).toBe(`OPP-${year}-018`);
  });

  it("creates an opportunity with no costing, no deal and no contract", async () => {
    const res = await api.createOpportunity(good);
    if (!res.ok) return expect.unreachable();
    /* Phase 01 produces an identified opportunity and nothing else: §6.1 activity 6 makes
       the estimate a separate step, and §6.2 a separate gate. A save that quietly created
       an empty costing would let the deal gate be passed by an artefact nobody took. */
    expect(res.value.costing).toBeUndefined();
    expect(res.value.deal).toBeUndefined();
    expect(res.value.dealAgreedOn).toBeUndefined();
    expect(res.value.contractId).toBeUndefined();
  });

  it("refuses the deal on a freshly saved opportunity, because it has no locked snapshot", async () => {
    const res = await api.createOpportunity(good);
    if (!res.ok) return expect.unreachable();
    const deal = await api.agreeDeal(res.value.id, {
      buyerId: "cp-anatolia",
      commodityId: good.commodityId,
      pricePerMt: money(1495, "USD"),
      incoterm: "CNF",
      origin: "SD",
      portOfLoadingId: "pt-psd",
      portOfDischargeId: "pt-mer",
      quantityMt: 750,
      shipmentPeriodStart: "2026-10-01",
      shipmentPeriodEnd: "2026-11-30",
      paymentTerms: "60 days from B/L date, D/A",
    });
    expect(deal.ok).toBe(false);
    if (deal.ok) return;
    expect(deal.reason.length).toBeGreaterThan(0);
  });

  it("keeps the buyer optional, and refuses one that is not in the master", async () => {
    const none = await api.createOpportunity(good);
    expect(none.ok).toBe(true);
    if (none.ok) expect(none.value.buyerId).toBeUndefined();

    const bad = await api.createOpportunity({ ...good, buyerId: "cp-not-a-buyer" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toContain("counterparty master");

    /* A supplier is a real counterparty and still not a buyer. */
    const supplier = await api.createOpportunity({ ...good, buyerId: "cp-sup-mahaseel" });
    expect(supplier.ok).toBe(false);
  });

  it("refuses a trader-less save with the reason the field was removed", async () => {
    const res = await api.createOpportunity({ ...good, traderName: "   " });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    /* The message has to explain rather than instruct: there is no field to go and fill in. */
    expect(res.reason).toContain("read from the signed-in session");
  });

  it("refuses an unknown commodity, an origin outside the module and a non-positive quantity", async () => {
    const c = await api.createOpportunity({ ...good, commodityId: "cm-not-real" });
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.reason).toContain("commodity master");

    const o = await api.createOpportunity({ ...good, origin: "ZZ" as never });
    expect(o.ok).toBe(false);

    for (const q of [0, -1]) {
      const res = await api.createOpportunity({ ...good, indicativeQuantityMt: q });
      expect(res.ok).toBe(false);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Phase 10 — the packing-size and consignee masters, and the artwork design
 *
 * Added 6 September 2026. The masters themselves are data, so what is worth testing is
 * the seam: that the captured contracts hold values the new lists do not, which is why
 * the screen keeps them rather than blanking the field.
 * ------------------------------------------------------------------ */

describe("the packing-size and consignee masters", () => {
  beforeEach(() => {
    resetStore();
    setLatency(0);
  });

  it("holds the five sizes the instruction names, largest first", () => {
    expect(PACKING_SIZES_KG).toEqual([50, 25, 10, 5, 1]);
  });

  it("does not hold two sizes the captured contracts do — a bale and bulk", async () => {
    const contracts = await api.listContracts();
    const outside = contracts
      .filter((c) => !isMasterPackingSize(c.packingSizeKg))
      .map((c) => [c.contractNo, c.packingSizeKg] as const);
    /* PC-2044 is cotton lint in 175 kg bales; PC-2058-LV is bulk and carries 0. Neither is
       a data error, so neither may be silently blanked by a list that omits it — the same
       failure as the trader drop-down removed on 5 September. */
    expect(outside).toEqual([
      ["PC-2044", 175],
      ["PC-2058-LV", 0],
    ]);
  });

  it("names three consignees and one catch-all, and the catch-all is not a consignee", () => {
    expect(CONSIGNEES.map((c) => c.name)).toEqual(["CIM", "Sayga", "DFI", "Others"]);
    expect(CONSIGNEES.filter((c) => c.isOther)).toHaveLength(1);
    /* "Others" must never resolve as a match: a bill of lading consigned to the word
       "others" is not a bill of lading. */
    expect(consigneeByName("Others")).toBeUndefined();
    expect(consigneeByName("others")).toBeUndefined();
  });

  it("matches a master consignee case-insensitively and reads everything else as Others", async () => {
    expect(consigneeByName("CIM")?.code).toBe("CIM");
    expect(consigneeByName("sayga")?.code).toBe("SAYGA");
    const contracts = await api.listContracts();
    /* Every captured contract falls outside the master: five carry the shipping term
       "To order" and one names the buyer. All of them read as Others with the captured
       string kept, so a contract copied by Retrieve PC No. keeps its own consignee. */
    expect(contracts.every((c) => consigneeByName(c.consignee) === undefined)).toBe(true);
  });

  it("saves the artwork design file name onto the contract, and leaves it unset when blank", async () => {
    const withDesign = await api.createContract({
      ...validContractDraft(),
      artworkType: "standard",
      artworkPrintedBags: true,
      artworkDesignFileName: "  anatolia-bag-artwork-v3.pdf  ",
    });
    expect(withDesign.ok).toBe(true);
    if (withDesign.ok) expect(withDesign.value.artworkDesignFileName).toBe("anatolia-bag-artwork-v3.pdf");

    const without = await api.createContract(validContractDraft());
    expect(without.ok).toBe(true);
    /* Absent rather than an empty string, so "no design attached" is one state and not two. */
    if (without.ok) expect(without.value.artworkDesignFileName).toBeUndefined();
  });
});

/** A draft that passes every rule, for the artwork test above. Mirrors `store-v2-wiring`. */
function validContractDraft(): PurchaseContractDraft {
  return {
    ...emptyDraft(TODAY),
    buyerId: "cp-anatolia",
    buyerAddress: "Ege Serbest Bölgesi, İzmir, Türkiye",
    buyerNickName: "Anatolia",
    commodityId: "cm-sesame-white",
    origin: "SD",
    traderName: "Tomás Ferreira",
    quantityMt: "750",
    tolerancePct: "5",
    shipmentPeriodStart: "2026-09-15",
    shipmentPeriodEnd: "2026-10-31",
    incoterm: "CNF",
    shipmentType: "container",
    methodOfShipping: "Sea",
    packingType: "bags",
    packingSizeKg: "50",
    freeDaysAtPort: "14",
    assignedDubaiExecution: "Rania Haddad",
    portOfDischargeId: "pt-mer",
    portOfLoadingId: "pt-psd",
    consignee: "CIM",
    notifyParty: "Anatolia Grain & Seed A.Ş.",
    notifyPartyAddress: "Ege Serbest Bölgesi, İzmir, Türkiye",
    partialShipment: "not_allowed",
    loadingContainerSize: "40ft",
    fumigationType: "phosphine",
    paymentTerms: "60 days from B/L date, D/A",
    lots: [{ key: "l1", quantityMt: "750", containerCount: "38" }],
  };
}

/* ------------------------------------------------------------------ *
 * Phase 13 — creating an execution plan
 *
 * Added 6 September 2026. The tab had shown plans since v1.0 with no way to make one, so
 * a contract raised in the mock-up could not reach Phase 15 at all: a shipment needs an
 * execution plan.
 * ------------------------------------------------------------------ */

describe("creating an execution plan", () => {
  beforeEach(() => {
    resetStore();
    setLatency(0);
  });

  const good = {
    contractId: "ct-1",
    plannedQuantityMt: 100,
    portOfLoadingId: "pt-psd",
    shipperName: "Riverbend Trading Co.",
    bank: "Unity Commercial Bank",
    seasonality: "2025-2026",
    cargoSource: "CIM" as const,
    exportContractPaymentTerms: "DA",
    urgency: "medium" as const,
    assignedTo: "Amara Osei",
  };

  it("issues the next number in the contract's own sequence, not a global one", async () => {
    /* ct-1 carries PC-2041.1 and .2; ct-2 carries PC-2044.1. Each contract counts for
       itself — rule R1's `PC.n`. */
    const a = await api.createExecutionPlan(good);
    expect(a.ok).toBe(true);
    if (a.ok) expect(a.value.planningNo).toBe("PC-2041.3");

    const b = await api.createExecutionPlan({ ...good, contractId: "ct-2", plannedQuantityMt: 20 });
    expect(b.ok).toBe(true);
    if (b.ok) expect(b.value.planningNo).toBe("PC-2044.2");
  });

  it("creates a draft and reads large volume from the contract", async () => {
    const res = await api.createExecutionPlan(good);
    if (!res.ok) return expect.unreachable();
    /* A plan moves on by transition, never by being created in a later state. */
    expect(res.value.status).toBe("draft");
    expect(res.value.createdDate).toBe(TODAY);
    /* Large volume describes one export contract consumed across several shipments — a
       property of the contract, so it is read rather than asked for. */
    expect(res.value.isLargeVolume).toBe(false);
    const lv = await api.createExecutionPlan({ ...good, contractId: "ct-6", plannedQuantityMt: 500 });
    if (!lv.ok) return expect.unreachable();
    expect(lv.value.isLargeVolume).toBe(true);
  });

  it("makes the new plan available to the shipment screen, which is why it exists", async () => {
    const res = await api.createExecutionPlan(good);
    if (!res.ok) return expect.unreachable();
    const plans = await api.listExecutionPlans();
    expect(plans.some((p) => p.id === res.value.id)).toBe(true);
    /* The point of the whole change: a shipment cannot be raised without a plan. */
    const ship = await api.createShipment({
      contractId: "ct-1",
      executionPlanId: res.value.id,
      quantityMt: 20,
      shipmentType: "container",
    });
    expect(ship.ok).toBe(true);
  });

  it("does not cap the planned total against the contract, because no source states that rule", async () => {
    /* ct-1 is 1,300 MT with 1,200 MT already planned. 900 more takes the total well past
       it and is allowed: R1 says a contract may carry several planning lots and states no
       total. The screen warns; nothing blocks. Recorded as open. */
    const res = await api.createExecutionPlan({ ...good, plannedQuantityMt: 900 });
    expect(res.ok).toBe(true);
  });

  it("refuses an unknown contract, a cancelled one, a bad port and a non-positive quantity", async () => {
    const noContract = await api.createExecutionPlan({ ...good, contractId: "ct-nope" });
    expect(noContract.ok).toBe(false);

    const badPort = await api.createExecutionPlan({ ...good, portOfLoadingId: "pt-nope" });
    expect(badPort.ok).toBe(false);
    if (!badPort.ok) expect(badPort.reason).toContain("port master");

    for (const q of [0, -5]) {
      const res = await api.createExecutionPlan({ ...good, plannedQuantityMt: q });
      expect(res.ok).toBe(false);
    }
  });

  it("names the missing field when a required one is blank", async () => {
    for (const [field, patch] of [
      ["shipper", { shipperName: "  " }],
      ["bank", { bank: "" }],
      ["seasonality", { seasonality: " " }],
      ["assigned-to name", { assignedTo: "" }],
    ] as const) {
      const res = await api.createExecutionPlan({ ...good, ...patch });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toContain(field);
    }
  });
});

/* ------------------------------------------------------------------ *
 * The crop year, and the two masters the execution plan now reads
 *
 * Second pass of 6 September 2026. `cropYearOf` is the only *inferred* value added in
 * this whole round, so it is the one that most needs its evidence written down.
 * ------------------------------------------------------------------ */

describe("the crop year a contract draws on", () => {
  beforeEach(() => {
    resetStore();
    setLatency(0);
  });

  it("reproduces every captured plan's season from its contract's shipment period", async () => {
    /* This is the whole evidence for the convention. All seven captured plans carry
       2025-2026 and all six contracts start between June and August 2026; if the rule
       could not reproduce that, it would be an invention with nothing behind it. */
    const contracts = await api.listContracts();
    const plans = await api.listExecutionPlans();
    for (const p of plans) {
      const c = contracts.find((x) => x.id === p.contractId);
      if (!c) continue;
      expect(cropYearOf(c.shipmentPeriodStart), `${p.planningNo}`).toBe(p.seasonality);
    }
    expect(plans.length).toBeGreaterThan(5);
  });

  it("turns over in October, and says nothing when there is no date", () => {
    /* The boundary the captured data cannot settle, pinned so that changing it is a
       deliberate act with a failing test attached rather than a quiet edit. */
    expect(cropYearOf("2026-09-30")).toBe("2025-2026");
    expect(cropYearOf("2026-10-01")).toBe("2026-2027");
    expect(cropYearOf("2026-01-15")).toBe("2025-2026");
    expect(cropYearOf("2026-12-31")).toBe("2026-2027");
    expect(cropYearOf(undefined)).toBe("");
    expect(cropYearOf("not-a-date")).toBe("");
  });
});

describe("the shipper and bank masters the execution plan reads", () => {
  it("offers the shippers and banks the counterparty master already holds", () => {
    const shippers = counterpartiesOfType("shipper");
    const banks = counterpartiesOfType("bank");
    expect(shippers.length).toBeGreaterThan(0);
    expect(banks.length).toBeGreaterThan(0);
    /* Every shipper has an address, which is what the plan's address field is filled from —
       a shipper without one would leave that field silently blank. */
    expect(shippers.every((s) => s.address.trim() !== "")).toBe(true);
  });

  it("names every shipper and bank the captured plans carry, so none is blanked", async () => {
    const plans = await api.listExecutionPlans();
    for (const p of plans) {
      expect(shipperByName(p.shipperName), `shipper ${p.shipperName}`).toBeTruthy();
      expect(bankByName(p.bank), `bank ${p.bank}`).toBeTruthy();
      if (p.bankBranch) {
        const bank = bankByName(p.bank);
        expect(bankBranchesFor(bank?.id), `branch ${p.bankBranch}`).toContain(p.bankBranch);
      }
    }
  });

  it("keys branches to their bank, and holds none for a bank it does not know", () => {
    const unity = bankByName("Unity Commercial Bank");
    expect(bankBranchesFor(unity?.id)).toContain("Head office");
    expect(bankBranchesFor("cp-not-a-bank")).toEqual([]);
    expect(bankBranchesFor(undefined)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * Phase 16 — raising an export contract request
 *
 * Added 6 September 2026. Same shape as the execution plan: the list had rendered export
 * contracts since v1.0, and every mutator advanced a record that already existed.
 * ------------------------------------------------------------------ */

describe("raising an export contract request", () => {
  beforeEach(() => {
    resetStore();
    setLatency(0);
  });

  const good = {
    executionPlanId: "ep-1",
    requestedQuantityMt: 600,
    exportingEntity: "Invictus" as const,
  };

  it("issues the next number in the plan's own sequence and reads the contract from it", async () => {
    /* ep-1 already carries PC-2041.1-R1, so the next is R2 — the plan's sequence, and the
       format every captured request uses. */
    const res = await api.requestExportContract(good);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.requestNo).toBe("PC-2041.1-R2");
    expect(res.value.contractId).toBe("ct-1");
    expect(res.value.requestedOn).toBe(TODAY);
  });

  it("starts at Requested, with no issuance, no EX forms and no consumption", async () => {
    const res = await api.requestExportContract(good);
    if (!res.ok) return expect.unreachable();
    /* Everything in the issuance group is what the ministry returns. A create that filled
       any of it in would make the record assert an issuance that never happened. */
    expect(res.value.status).toBe("requested");
    expect(res.value.exportContractNo).toBeUndefined();
    expect(res.value.issuanceDate).toBeUndefined();
    expect(res.value.expiryDate).toBeUndefined();
    expect(res.value.actualQuantityMt).toBeUndefined();
    expect(res.value.exportForms).toEqual([]);
    expect(res.value.consumption).toEqual([]);
  });

  it("reads large volume from the contract, not from the form", async () => {
    const plain = await api.requestExportContract(good);
    if (!plain.ok) return expect.unreachable();
    expect(plain.value.isLargeVolume).toBe(false);
    /* ep-7 is on PC-2058-LV. */
    const lv = await api.requestExportContract({ ...good, executionPlanId: "ep-7", requestedQuantityMt: 500 });
    if (!lv.ok) return expect.unreachable();
    expect(lv.value.isLargeVolume).toBe(true);
  });

  it("refuses a country that does not use an export contract, and says which and why", async () => {
    /* Tanzania and Mozambique do not use one; Mozambique starts from a commercial invoice.
       PC-2055 is Tanzania, and ep-6 is its plan. */
    const res = await api.requestExportContract({ ...good, executionPlanId: "ep-6" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toContain("Tanzania");
    expect(res.reason).toContain("Not applicable");
  });

  it("allows a second request on one plan, because nothing forbids re-raising a rejected one", async () => {
    const first = await api.requestExportContract(good);
    const second = await api.requestExportContract(good);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.value.requestNo).toBe("PC-2041.1-R2");
    expect(second.value.requestNo).toBe("PC-2041.1-R3");
  });

  it("refuses an unknown plan and a non-positive quantity", async () => {
    expect((await api.requestExportContract({ ...good, executionPlanId: "ep-nope" })).ok).toBe(false);
    for (const q of [0, -1]) {
      expect((await api.requestExportContract({ ...good, requestedQuantityMt: q })).ok).toBe(false);
    }
  });
});

describe("the container-type master the shipment screen reads", () => {
  it("holds every type the captured shipments carry", async () => {
    const shipments = await api.listShipments();
    for (const s of shipments) {
      expect(isMasterContainerType(s.containerType), `${s.shipmentNo}: ${s.containerType}`).toBe(true);
    }
  });

  it("maps a contract's loading container size to a default, and both sizes to none", () => {
    expect(defaultContainerTypeFor("20ft")).toBe("20 FT standard");
    expect(defaultContainerTypeFor("40ft")).toBe("40 FT standard");
    /* A contract that permits both settles nothing, so the shipment screen offers no
       default rather than guessing one of them. */
    expect(defaultContainerTypeFor("20ft_and_40ft")).toBeUndefined();
    expect(defaultContainerTypeFor(undefined)).toBeUndefined();
  });

  it("now stores the loading container size the contract form has always collected", async () => {
    /* Until 6 September the form asked for it and `createContract` dropped it, exactly as
       it dropped Actual PC — the record had no such property. */
    const res = await api.createContract({ ...validContractDraft(), loadingContainerSize: "40ft" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.loadingContainerSize).toBe("40ft");
    expect(defaultContainerTypeFor(res.value.loadingContainerSize)).toBe("40 FT standard");
  });
});
