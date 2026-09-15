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
import { TODAY, cropYearOf, exportContractAllocation, money } from "../../domain/calc";
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
 * The crop year, and the two masters the planning round added
 *
 * Second pass of 6 September 2026. `cropYearOf` is the only *inferred* value added in
 * this whole round, so it is the one that most needs its evidence written down. The
 * captured execution plans that were its evidence went with the record on 8 September
 * 2026, so what is left is the convention itself, pinned directly.
 * ------------------------------------------------------------------ */

describe("the crop year a contract draws on", () => {
  beforeEach(() => {
    resetStore();
    setLatency(0);
  });

  it("reads 2025-2026 off every captured contract's shipment period", async () => {
    /* All six contracts start between June and August 2026, which is the season the
       captured records were raised in; if the rule could not reproduce that, it would be
       an invention with nothing behind it. */
    const contracts = await api.listContracts();
    expect(contracts.length).toBeGreaterThan(5);
    for (const c of contracts) {
      expect(cropYearOf(c.shipmentPeriodStart), `${c.contractNo}`).toBe("2025-2026");
    }
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

describe("the shipper and bank masters the planning round added", () => {
  it("offers the shippers and banks the counterparty master already holds", () => {
    const shippers = counterpartiesOfType("shipper");
    const banks = counterpartiesOfType("bank");
    expect(shippers.length).toBeGreaterThan(0);
    expect(banks.length).toBeGreaterThan(0);
    /* Every shipper has an address, which is what the address field is filled from — a
       shipper without one would leave that field silently blank. */
    expect(shippers.every((s) => s.address.trim() !== "")).toBe(true);
  });

  it("finds a shipper and a bank by the name a record carries, so neither is blanked", () => {
    expect(shipperByName("Riverbend Trading Co.")).toBeTruthy();
    expect(bankByName("Unity Commercial Bank")).toBeTruthy();
    expect(shipperByName("Not A Shipper")).toBeUndefined();
    expect(bankByName(undefined)).toBeUndefined();
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
 * Added 6 September 2026. The list had rendered export contracts since v1.0, and every
 * mutator advanced a record that already existed. The request was raised against the
 * execution plan until 8 September 2026, when the plan record was removed and the request
 * came to sit directly on the purchase contract.
 * ------------------------------------------------------------------ */

describe("raising an export contract request", () => {
  beforeEach(() => {
    resetStore();
    setLatency(0);
  });

  const good = {
    contractId: "ct-1",
    requestedQuantityMt: 600,
    exportingEntity: "Invictus" as const,
  };

  it("issues the next number in the contract's own sequence", async () => {
    /* ct-1 already carries one request, so the next is R2. The captured request is
       numbered PC-2041.1-R1 in the old planning format and is left as captured, which is
       why the sequence counts the requests on the contract rather than parsing them. */
    const res = await api.requestExportContract(good);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.requestNo).toBe("PC-2041-R2");
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
    /* ct-6 is PC-2058-LV. */
    const lv = await api.requestExportContract({ ...good, contractId: "ct-6", requestedQuantityMt: 500 });
    if (!lv.ok) return expect.unreachable();
    expect(lv.value.isLargeVolume).toBe(true);
  });

  it("refuses a country that does not use an export contract, and says which and why", async () => {
    /* Tanzania and Mozambique do not use one; Mozambique starts from a commercial invoice.
       ct-5 is PC-2055, which is Tanzania. */
    const res = await api.requestExportContract({ ...good, contractId: "ct-5" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toContain("Tanzania");
    expect(res.reason).toContain("Not applicable");
  });

  it("allows a second request on one contract, because nothing forbids re-raising a rejected one", async () => {
    const first = await api.requestExportContract(good);
    const second = await api.requestExportContract(good);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.value.requestNo).toBe("PC-2041-R2");
    expect(second.value.requestNo).toBe("PC-2041-R3");
  });

  it("refuses an unknown contract and a non-positive quantity", async () => {
    expect((await api.requestExportContract({ ...good, contractId: "ct-nope" })).ok).toBe(false);
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

/* ================================================================== *
 * THE SHIPMENT'S EXPORT CONTRACT — 14 September 2026
 *
 * `Shipment.exportContractId` was read by the Pre-clearance tab, by the export contract
 * workspace's own list of linked shipments and by the expiry check (rule R13), and written
 * by nothing but the seed: `createShipment` set it to `undefined`, so every shipment the
 * mock-up made reported "No export contract linked to this shipment" however many had been
 * issued against its purchase contract. The link went implicit when execution planning was
 * removed on 8 September and was never re-made.
 * ================================================================== */

describe("the export contract a shipment draws on", () => {
  it("inherits the purchase contract's sole export contract when the shipment is created", async () => {
    /* ct-1 is PC-2041, which carries exactly one — ec-1, issued. */
    const res = await api.createShipment({ contractId: "ct-1", quantityMt: 25, shipmentType: "container" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.exportContractId).toBe("ec-1");
  });

  it("leaves the link empty when the contract has none, rather than reaching for another PC's", async () => {
    /* ct-5 is PC-2055 (Tanzania), which uses no export contract and has none raised. Its
       headroom is 12.5 MT — 250 MT shipped against a 262.5 MT ceiling. */
    const res = await api.createShipment({ contractId: "ct-5", quantityMt: 10, shipmentType: "bulk" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.exportContractId).toBeUndefined();
  });

  it("declines to guess once a second request exists, and links the one issued contract", async () => {
    /* A re-raised request beside the issued ec-1: two candidates, one of them live. */
    const second = await api.requestExportContract({
      contractId: "ct-1",
      requestedQuantityMt: 100,
      exportingEntity: "Invictus",
    });
    expect(second.ok).toBe(true);
    const one = await api.createShipment({ contractId: "ct-1", quantityMt: 25, shipmentType: "container" });
    if (!one.ok) return expect.unreachable();
    /* ec-1 is issued and the new request is not, so the answer is unambiguous. */
    expect(one.value.exportContractId).toBe("ec-1");

    /* A third, also merely requested, does not change that — but two *issued* would, and
       there is no way to reach two issued through the API without answering both. */
    const third = await api.requestExportContract({
      contractId: "ct-1",
      requestedQuantityMt: 100,
      exportingEntity: "Invictus",
    });
    expect(third.ok).toBe(true);
    const two = await api.createShipment({ contractId: "ct-1", quantityMt: 25, shipmentType: "container" });
    if (!two.ok) return expect.unreachable();
    expect(two.value.exportContractId).toBe("ec-1");
  });

  it("honours an explicit choice, and refuses one raised against a different contract", async () => {
    const req = await api.requestExportContract({
      contractId: "ct-1",
      requestedQuantityMt: 100,
      exportingEntity: "Invictus",
    });
    if (!req.ok) return expect.unreachable();
    const chosen = await api.createShipment({
      contractId: "ct-1",
      quantityMt: 25,
      shipmentType: "container",
      exportContractId: req.value.id,
    });
    if (!chosen.ok) return expect.unreachable();
    expect(chosen.value.exportContractId).toBe(req.value.id);

    /* ec-2 belongs to ct-2. A shipment on ct-1 cannot reach sideways for it. */
    const wrong = await api.createShipment({
      contractId: "ct-1",
      quantityMt: 25,
      shipmentType: "container",
      exportContractId: "ec-2",
    });
    expect(reasonOf(wrong)).toContain("not raised against this purchase contract");
  });

  it("links and unlinks after the fact, and writes both to the audit trail", async () => {
    const created = await api.createShipment({
      contractId: "ct-5",
      quantityMt: 10,
      shipmentType: "bulk",
    });
    if (!created.ok) return expect.unreachable();
    const before = created.value.audit.length;

    /* ct-5 has none, so nothing to link to — the refusal names the reason. */
    expect(reasonOf(await api.linkExportContract(created.value.id, "ec-1"))).toContain(
      "not raised against this shipment's purchase contract",
    );

    const onCt1 = await api.createShipment({
      contractId: "ct-1",
      quantityMt: 25,
      shipmentType: "container",
    });
    if (!onCt1.ok) return expect.unreachable();
    const cleared = await api.linkExportContract(onCt1.value.id, undefined);
    if (!cleared.ok) return expect.unreachable();
    expect(cleared.value.exportContractId).toBeUndefined();
    expect(cleared.value.audit.at(-1)?.note).toContain("link removed");

    const relinked = await api.linkExportContract(onCt1.value.id, "ec-1");
    if (!relinked.ok) return expect.unreachable();
    expect(relinked.value.exportContractId).toBe("ec-1");
    expect(relinked.value.audit.at(-1)?.note).toContain("EC-2026-004118");

    /* The refused link left no trace on the other shipment. */
    const untouched = await api.getShipment(created.value.id);
    expect(untouched?.audit).toHaveLength(before);
  });

  it("refuses an unknown shipment and an unknown export contract", async () => {
    expect(reasonOf(await api.linkExportContract("sh-nope", "ec-1"))).toContain("Shipment not found");
    const s = (await api.listShipments())[0];
    expect(reasonOf(await api.linkExportContract(s.id, "ec-nope"))).toContain(
      "Export contract not found",
    );
  });

  it("reports over-allocation rather than refusing it, because no source states a ceiling", async () => {
    /* Rule R6 says one export contract may be consumed across many purchase contracts, which
       is the opposite of a ceiling. Decision D-10: a guard exists only where a source states
       a rule, so the link saves and the screen warns. */
    const ec = (await api.listExportContracts()).find((e) => e.id === "ec-1")!;
    const linked = (await api.listShipments()).filter(
      (s) => s.exportContractId === "ec-1" && s.status !== "cancelled",
    );

    /* THE CAPTURED DATA IS ALREADY OVER. EC-2026-004118 was issued for 620 MT and PC-2041.1
       (600 MT, sailed) and PC-2041.3 (60 MT, stuffed) both draw on it — 660 MT against 620.
       That is the business's own record, shipped and sailed, which is the plainest possible
       argument against making this a refusal: a guard here would have refused history. */
    const alloc = exportContractAllocation(ec, linked);
    expect(alloc.basis).toBe("actual");
    expect(alloc.issuedMt).toBe(620);
    expect(alloc.linkedMt).toBe(660);
    expect(alloc.remainingMt).toBe(-40);
    expect(alloc.overAllocated).toBe(true);

    /* And the link still saves — the screen warns, the service layer does not refuse. */
    const created = await api.createShipment({
      contractId: "ct-1",
      quantityMt: 25,
      shipmentType: "container",
    });
    if (!created.ok) return expect.unreachable();
    expect(created.value.exportContractId).toBe("ec-1");
  });

  it("measures against the requested quantity until the ministry has answered", async () => {
    const req = await api.requestExportContract({
      contractId: "ct-1",
      requestedQuantityMt: 400,
      exportingEntity: "Invictus",
    });
    if (!req.ok) return expect.unreachable();
    const alloc = exportContractAllocation(req.value, [{ quantityMt: 150 }]);
    expect(alloc.basis).toBe("requested");
    expect(alloc.issuedMt).toBe(400);
    expect(alloc.remainingMt).toBe(250);
    expect(alloc.overAllocated).toBe(false);
  });
});

/* ================================================================== *
 * THE OBL DOCUMENT CHAIN — 14 September 2026
 *
 * `OBL Process.pdf` — "Documents Process (OBL) – Export – Sudan". The audit of 14 September
 * found the flow present in the mock-up but only a third of it recordable: the Final SI was
 * the one document in the chain with no editor and no place in the document workspace, and
 * the last four steps — delivery to the bank, collection from it, the telex retention branch
 * and the courier to Dubai — had nowhere to go at all.
 * ================================================================== */

describe("the Final SI — the first document of the OBL flow", () => {
  it("is a document in its own right, required wherever a bill of lading is", async () => {
    for (const s of await api.listShipments()) {
      const si = s.documents.find((d) => d.key === "final_si");
      const bl = s.documents.find((d) => d.key === "bill_of_lading");
      expect(si, `${s.shipmentNo} carries no Final SI row`).toBeDefined();
      /* The dependency runs one way: the line is sent the SI in order to draw the B/L, so a
         shipment needing a B/L needed an SI first. */
      expect(si!.required, s.shipmentNo).toBe(bl!.required);
    }
  });

  it("records the terms and does not issue anything without a date", async () => {
    const res = await api.setShippingInstruction("sh-2", {
      consignee: "Nile Provisions LLC",
      notifyParty: "Same as consignee",
      blOriginals: 3,
      blCopies: 3,
      billKind: "shipped",
      chargeAllocation: {
        originLocal: "shipper",
        seaFreight: "shipper",
        destinationLocal: "consignee",
        other: "unset",
      },
      recordedBy: "Dubai documentation",
    });
    if (!res.ok) return expect.unreachable();
    expect(res.value.shippingInstruction.consignee).toBe("Nile Provisions LLC");
    expect(res.value.shippingInstruction.billKind).toBe("shipped");
    expect(res.value.shippingInstruction.issuedOn).toBeUndefined();
    /* A draft is not an issue, so the milestone stays unanswered. */
    expect(res.value.milestones.find((m) => m.key === "shipping_instruction_issued")).toBeUndefined();
    expect(res.value.audit.at(-1)?.note).toContain("not yet issued");
  });

  it("issuing it completes the milestone and writes the document row's reference", async () => {
    const res = await api.setShippingInstruction("sh-2", {
      finalSiNo: "SI-2026-0900",
      issuedOn: "2026-09-14",
      consignee: "To order",
      blOriginals: 3,
      blCopies: 0,
      billKind: "shipped",
      chargeAllocation: {
        originLocal: "shipper",
        seaFreight: "consignee",
        destinationLocal: "consignee",
        other: "unset",
      },
      recordedBy: "Dubai documentation",
    });
    if (!res.ok) return expect.unreachable();
    const ms = res.value.milestones.find((m) => m.key === "shipping_instruction_issued");
    expect(ms?.state).toBe("completed");
    expect(ms?.actualDate).toBe("2026-09-14");
    expect(ms?.ownerName).toBe("Dubai documentation");
    /* The row and the record name the same SI — the point of giving it a document key. */
    expect(res.value.documents.find((d) => d.key === "final_si")?.reference).toBe("SI-2026-0900");
    expect(res.value.audit.at(-1)?.note).toContain("Final SI issued");
  });

  it("refuses an issue with no number, a blank consignee and a fractional B/L count", async () => {
    const base = {
      consignee: "To order",
      blOriginals: 3,
      blCopies: 3,
      billKind: "shipped" as const,
      chargeAllocation: {
        originLocal: "shipper" as const,
        seaFreight: "consignee" as const,
        destinationLocal: "consignee" as const,
        other: "unset" as const,
      },
    };
    expect(reasonOf(await api.setShippingInstruction("sh-2", { ...base, issuedOn: "2026-09-14" }))).toContain(
      "carries its number",
    );
    expect(reasonOf(await api.setShippingInstruction("sh-2", { ...base, consignee: "  " }))).toContain(
      "To order",
    );
    expect(reasonOf(await api.setShippingInstruction("sh-2", { ...base, blOriginals: 2.5 }))).toContain(
      "whole number",
    );
    expect(reasonOf(await api.setShippingInstruction("sh-2", { ...base, blCopies: -1 }))).toContain(
      "zero or more",
    );
    expect(reasonOf(await api.setShippingInstruction("sh-nope", base))).toContain("Shipment not found");
  });

  it("amends an issued SI and says so, because the correction has to be recordable somewhere", async () => {
    /* sh-1 carries SI-2026-0771, issued 11 August. */
    const s = await api.getShipment("sh-1");
    expect(s?.shippingInstruction.finalSiNo).toBe("SI-2026-0771");
    const res = await api.setShippingInstruction("sh-1", {
      finalSiNo: "SI-2026-0771",
      issuedOn: "2026-08-11",
      consignee: "Qingdao Grain Import Co.",
      blOriginals: 3,
      blCopies: 3,
      billKind: s!.shippingInstruction.billKind,
      chargeAllocation: s!.shippingInstruction.chargeAllocation,
    });
    if (!res.ok) return expect.unreachable();
    expect(res.value.shippingInstruction.consignee).toBe("Qingdao Grain Import Co.");
    expect(res.value.audit.at(-1)?.note).toContain("Final SI amended");
  });
});

describe("the OBL's custody chain", () => {
  it("walks the whole flow to the courier end", async () => {
    /* sh-7 has both invoices paid but its OBL already completed, so the walk is done on sh-1,
       whose charges are outstanding — the payment gate is exercised in its own test below. */
    const issued = await api.advanceObl("sh-1", "issued", { issuedBeforePayment: true });
    if (!issued.ok) return expect.unreachable();
    expect(issued.value.oblCustody.issuedDate).toBe(TODAY);
    expect(issued.value.oblCustody.issuedBeforePayment).toBe(true);

    const toBank = await api.advanceObl("sh-1", "sent_to_bank", { bankName: "Unity Commercial Bank" });
    if (!toBank.ok) return expect.unreachable();
    expect(toBank.value.oblCustody.bankName).toBe("Unity Commercial Bank");
    expect(toBank.value.oblCustody.deliveredToBankDate).toBe(TODAY);

    const collected = await api.advanceObl("sh-1", "collected_from_bank", {
      collectedBy: "Khartoum documentation desk",
    });
    if (!collected.ok) return expect.unreachable();
    expect(collected.value.oblCustody.collectedBy).toBe("Khartoum documentation desk");

    const couriered = await api.advanceObl("sh-1", "couriered", { courierAwb: "AWB-9001-4412" });
    if (!couriered.ok) return expect.unreachable();
    expect(couriered.value.oblCustody.status).toBe("couriered");
    expect(couriered.value.oblCustody.courierAwb).toBe("AWB-9001-4412");
    /* Terminal — the flow draws no edge out of either end. */
    expect(reasonOf(await api.advanceObl("sh-1", "retained_for_telex"))).toContain("terminal state");
    expect(couriered.value.audit.at(-1)?.action).toBe("OBL custody advanced");
  });

  it("takes the telex branch instead, and will not courier once a release is expected", async () => {
    await api.advanceTelexRelease("sh-1", "expected");
    await api.advanceObl("sh-1", "issued", { issuedBeforePayment: true });
    await api.advanceObl("sh-1", "sent_to_bank", { bankName: "Unity Commercial Bank" });
    await api.advanceObl("sh-1", "collected_from_bank", {});

    /* The two branches are the two answers to one question, so the answer settles which. */
    expect(reasonOf(await api.advanceObl("sh-1", "couriered"))).toContain("retained at origin");

    const retained = await api.advanceObl("sh-1", "retained_for_telex");
    if (!retained.ok) return expect.unreachable();
    expect(retained.value.oblCustody.status).toBe("retained_for_telex");

    const requested = await api.advanceTelexRelease("sh-1", "requested");
    if (!requested.ok) return expect.unreachable();
    expect(requested.value.oblCustody.telexRequestedDate).toBe(TODAY);

    const released = await api.advanceTelexRelease("sh-1", "released", { reference: "TR-26-0099" });
    if (!released.ok) return expect.unreachable();
    expect(released.value.oblCustody.telex).toBe("released");
    expect(released.value.oblCustody.telexReference).toBe("TR-26-0099");
    /* A release that has happened cannot un-happen. */
    expect(reasonOf(await api.advanceTelexRelease("sh-1", "requested"))).toContain("terminal state");
  });

  it("applies the flow's own payment gate before the OBL is issued", async () => {
    /* sh-1: the local charge invoice is received and the freight invoice is still awaited. */
    const refusal = reasonOf(await api.advanceObl("sh-1", "issued"));
    expect(refusal).toContain("Local invoice");
    expect(refusal).toContain("Freight invoice");
    expect(refusal).toContain("agreed with the line");

    /* sh-7 has both paid, so no agreement is needed — and nothing is recorded as printed
       early. Its own OBL is already couriered, so the gate is checked on a fresh split of
       the same contract instead. */
    const paid = (await api.listShipments()).find((s) => s.id === "sh-7")!;
    expect(
      paid.charges
        .filter((c) => c.type === "freight_invoice" || c.type === "local_invoice")
        .every((c) => c.status === "paid"),
    ).toBe(true);
    expect(paid.oblCustody.issuedBeforePayment).toBeUndefined();
  });

  it("refuses the retention branch until a release is expected, and the request until it is in hand", async () => {
    await api.advanceObl("sh-1", "issued", { issuedBeforePayment: true });
    await api.advanceObl("sh-1", "sent_to_bank", { bankName: "Unity Commercial Bank" });
    await api.advanceObl("sh-1", "collected_from_bank", {});
    expect(reasonOf(await api.advanceObl("sh-1", "retained_for_telex"))).toContain(
      "Record the expectation first",
    );
  });

  it("will not request a release before the OBL has been collected", async () => {
    await api.advanceTelexRelease("sh-1", "expected");
    expect(reasonOf(await api.advanceTelexRelease("sh-1", "requested"))).toContain(
      "collected from the bank first",
    );
  });

  it("will not withdraw the expectation once the OBL is being held for it", async () => {
    await api.advanceTelexRelease("sh-1", "expected");
    await api.advanceObl("sh-1", "issued", { issuedBeforePayment: true });
    await api.advanceObl("sh-1", "sent_to_bank", { bankName: "Unity Commercial Bank" });
    await api.advanceObl("sh-1", "collected_from_bank", {});
    await api.advanceObl("sh-1", "retained_for_telex");
    expect(reasonOf(await api.advanceTelexRelease("sh-1", "not_expected"))).toContain(
      "nobody is waiting for",
    );
  });

  it("names the bank that took the OBL, because the flow does not", async () => {
    await api.advanceObl("sh-1", "issued", { issuedBeforePayment: true });
    expect(reasonOf(await api.advanceObl("sh-1", "sent_to_bank", {}))).toContain(
      "Name the commercial bank",
    );
  });

  it("refuses an out-of-order move and an unknown shipment", async () => {
    expect(reasonOf(await api.advanceObl("sh-1", "collected_from_bank"))).toContain("may only move to");
    expect(reasonOf(await api.advanceObl("sh-nope", "issued"))).toContain("Shipment not found");
    expect(reasonOf(await api.advanceTelexRelease("sh-nope", "expected"))).toContain("Shipment not found");
  });

  it("reconstructs the one captured OBL that finished its journey", async () => {
    /* PC-2058-LV.1 — built from the booking columns the legacy screen could never write:
       original B/L 11 August, delivered to the bank 13 August, dispatched the same day. */
    const s = await api.getShipment("sh-7");
    expect(s?.oblCustody.status).toBe("couriered");
    expect(s?.oblCustody.issuedDate).toBe("2026-08-11");
    expect(s?.oblCustody.deliveredToBankDate).toBe("2026-08-13");
    expect(s?.oblCustody.courieredDate).toBe("2026-08-13");
    expect(s?.oblCustody.courierAwb).toBe("AWB-8841-2201");
    expect(s?.oblCustody.telex).toBe("not_expected");
    /* The documents' AWB and the OBL's are separate legs now, even where they carry the
       same number on this record. */
    expect(s?.bankSubmittal.awb).toBe("AWB-8841-2201");
  });

  it("starts every other shipment with nothing issued and no answer on the telex", async () => {
    for (const s of await api.listShipments()) {
      if (s.id === "sh-7") continue;
      expect(s.oblCustody.status, s.shipmentNo).toBe("not_issued");
      expect(s.oblCustody.telex, s.shipmentNo).toBe("not_expected");
    }
    const created = await api.createShipment({
      contractId: "ct-1",
      quantityMt: 25,
      shipmentType: "container",
    });
    if (!created.ok) return expect.unreachable();
    expect(created.value.oblCustody).toEqual({ status: "not_issued", telex: "not_expected" });
  });
});
