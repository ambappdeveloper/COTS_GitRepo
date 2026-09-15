import { describe, expect, it } from "vitest";
import {
  chargeTotals,
  daysRemaining,
  demurrageEstimate,
  documentCompleteness,
  documentPrerequisitesMet,
  exportContractConsumption,
  exportContractExpiryRisk,
  freeDayExposure,
  maxAllowedQuantity,
  money,
  quantityBalance,
  round,
  safeNumber,
  salesOrderPricing,
  stuffingTotals,
  sumMoney,
  truckNetWeight,
  validateExportFormTotal,
  validateExportContractRequest,
  validateLotTotal,
} from "../calc";
import type {
  Charge,
  ExportContract,
  ShipmentDocument,
  StuffingOperation,
  TruckReceipt,
  VesselCall,
} from "../types";

/* ------------------------------------------------------------------ *
 * Numeric hygiene — the float-noise and NaN defects
 * ------------------------------------------------------------------ */

describe("numeric hygiene", () => {
  it("rounds away the floating-point noise the legacy Sales Order column carries", () => {
    // AED rate 0.272 against the true peg 0.272295 produced 1999.999952 on 77 records.
    expect(round(7352.941 * 0.272, 2)).toBe(2000);
  });

  it("never returns NaN, unlike the legacy Transportation Screen calculated field", () => {
    expect(safeNumber(undefined)).toBe(0);
    expect(safeNumber("not a number")).toBe(0);
    expect(safeNumber(null)).toBe(0);
    expect(round(Number.NaN)).toBe(0);
  });

  it("only sums money of the same currency and reports what it skipped", () => {
    const res = sumMoney([money(100, "USD"), money(50, "USD"), money(10, "AED"), undefined]);
    expect(res.skipped).toBe(1);
    expect(res.totals).toEqual(
      expect.arrayContaining([
        { amount: 150, currency: "USD" },
        { amount: 10, currency: "AED" },
      ]),
    );
  });
});

/* ------------------------------------------------------------------ *
 * Contract quantity — rules R2, R3, R4
 * ------------------------------------------------------------------ */

describe("contract quantity balance", () => {
  const contract = { quantityMt: 100, tolerancePct: 5 };

  it("computes the tolerance ceiling (rule R2)", () => {
    expect(maxAllowedQuantity(contract)).toBe(105);
  });

  it("never returns a negative remaining quantity (rule R4)", () => {
    // The legacy EX Contract Request form saved PC Remaining QTY = -120 on a 100 MT contract.
    const b = quantityBalance(contract, { shippedMt: 220 });
    expect(b.remainingMt).toBe(0);
    expect(b.remainingMt).toBeGreaterThanOrEqual(0);
  });

  it("computes remaining correctly in the normal case", () => {
    const b = quantityBalance(contract, { shippedMt: 40 });
    expect(b.remainingMt).toBe(60);
    expect(b.shippedFraction).toBeCloseTo(0.4);
  });

  it("clamps the shipped fraction at 1 when over-shipped within tolerance", () => {
    expect(quantityBalance(contract, { shippedMt: 104 }).shippedFraction).toBe(1);
  });

  it("rejects lot quantities above the ceiling (rule R3)", () => {
    const bad = validateLotTotal(contract, [60, 50]);
    expect(bad.valid).toBe(false);
    expect(bad.total).toBe(110);
    expect(bad.max).toBe(105);
    expect(bad.message).toContain("exceeds the contract ceiling");
  });

  it("accepts lot quantities exactly at the ceiling", () => {
    expect(validateLotTotal(contract, [100, 5]).valid).toBe(true);
  });
});

describe("export contract request validation (rule R3)", () => {
  const contract = { quantityMt: 100, tolerancePct: 5 };

  it("refuses the exact legacy defect — 110 MT requested against a 100 MT contract at 5%", () => {
    const res = validateExportContractRequest(contract, 110);
    expect(res.valid).toBe(false);
    expect(res.message).toContain("above the contract ceiling");
  });

  it("accepts a request at the ceiling", () => {
    expect(validateExportContractRequest(contract, 105).valid).toBe(true);
  });

  it("accounts for quantity already requested", () => {
    expect(validateExportContractRequest(contract, 60, 50).valid).toBe(false);
    expect(validateExportContractRequest(contract, 50, 50).valid).toBe(true);
  });

  it("rejects a zero or negative request", () => {
    expect(validateExportContractRequest(contract, 0).valid).toBe(false);
    expect(validateExportContractRequest(contract, -5).valid).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * EX forms — rule R5
 * ------------------------------------------------------------------ */

function ec(partial: Partial<ExportContract>): ExportContract {
  return {
    id: "ec-t",
    requestNo: "R1",
    contractId: "ct",
    status: "issued",
    requestedOn: "2026-01-01",
    requestedQuantityMt: 600,
    exportingEntity: "Invictus",
    exportForms: [],
    consumption: [],
    isLargeVolume: false,
    ...partial,
  };
}

describe("EX form reconciliation (rule R5)", () => {
  it("flags the legacy defect: 783.6 MT of forms against a 783 MT export contract", () => {
    const res = validateExportFormTotal(
      ec({
        actualQuantityMt: 783,
        exportForms: [
          { formNo: "A", quantityMt: 369, status: "issued" },
          { formNo: "B", quantityMt: 414.6, status: "issued" },
        ],
      }),
    );
    expect(res.valid).toBe(false);
    expect(res.formsTotal).toBe(783.6);
    expect(res.contractTotal).toBe(783);
  });

  it("accepts forms that reconcile exactly", () => {
    const res = validateExportFormTotal(
      ec({
        actualQuantityMt: 620,
        exportForms: [
          { formNo: "A", quantityMt: 320, status: "used" },
          { formNo: "B", quantityMt: 300, status: "issued" },
        ],
      }),
    );
    expect(res.valid).toBe(true);
  });

  it("supports fractional quantities in every slot", () => {
    // The legacy schema types slot 1 as Integer and slots 2-20 as Text, so 414.6
    // is storable in slot 2 but not slot 1. A collection has no such asymmetry.
    const res = validateExportFormTotal(
      ec({
        actualQuantityMt: 829.2,
        exportForms: [
          { formNo: "A", quantityMt: 414.6, status: "issued" },
          { formNo: "B", quantityMt: 414.6, status: "issued" },
        ],
      }),
    );
    expect(res.valid).toBe(true);
  });
});

describe("export contract consumption (rule R6)", () => {
  it("tracks one export contract consumed across several purchase contracts", () => {
    const c = exportContractConsumption(
      ec({
        actualQuantityMt: 6300,
        exportForms: [
          { formNo: "A", quantityMt: 2100, status: "used" },
          { formNo: "B", quantityMt: 2100, status: "issued" },
          { formNo: "C", quantityMt: 2100, status: "issued" },
        ],
        consumption: [
          { purchaseContractNo: "PC-1", shipmentRef: "PC-1.1", exportFormNo: "A", quantityMt: 2000 },
        ],
      }),
    );
    expect(c.contractQuantityMt).toBe(6300);
    expect(c.usedMt).toBe(2000);
    expect(c.remainingMt).toBe(4300);
    expect(c.formsIssued).toBe(3);
    expect(c.formsUsed).toBe(1);
  });

  it("never reports a negative remaining balance", () => {
    const c = exportContractConsumption(
      ec({
        actualQuantityMt: 100,
        consumption: [{ purchaseContractNo: "PC", shipmentRef: "S", exportFormNo: "A", quantityMt: 150 }],
      }),
    );
    expect(c.remainingMt).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * Dates — the "remaining days" defect
 * ------------------------------------------------------------------ */

describe("days remaining", () => {
  it("counts down from today, unlike the legacy DATEDIF(issuing, validity) column", () => {
    // The legacy column reports contract *duration* and never counts down: all ten of
    // its records expired in 2021 and it still shows a positive 60-63.
    expect(daysRemaining("2026-08-24", "2026-08-17")).toBe(7);
    expect(daysRemaining("2021-04-02", "2026-08-17")).toBeLessThan(0);
  });

  it("returns undefined rather than a number when the date is missing", () => {
    expect(daysRemaining(undefined)).toBeUndefined();
  });
});

describe("export contract expiry risk (rule R13)", () => {
  it("is critical when the contract has already expired", () => {
    const r = exportContractExpiryRisk({ expiryDate: "2026-08-01" }, undefined, "2026-08-17");
    expect(r.level).toBe("critical");
    expect(r.message).toContain("expired");
  });

  it("is critical when expiry precedes the planned shipment date", () => {
    // The exact legacy condition: EX No.927 has an Ex Date eleven days after expiry.
    const r = exportContractExpiryRisk({ expiryDate: "2026-08-29" }, "2026-08-31", "2026-08-17");
    expect(r.level).toBe("critical");
    expect(r.message).toContain("before the planned shipment date");
  });

  it("warns inside fourteen days", () => {
    expect(exportContractExpiryRisk({ expiryDate: "2026-08-25" }, "2026-08-20", "2026-08-17").level).toBe(
      "warning",
    );
  });

  it("is silent with plenty of validity left", () => {
    expect(exportContractExpiryRisk({ expiryDate: "2026-11-28" }, "2026-09-01", "2026-08-17").level).toBe(
      "none",
    );
  });

  it("is silent when no expiry is recorded — e.g. a country with no export contract", () => {
    expect(exportContractExpiryRisk({}, "2026-09-01").level).toBe("none");
  });
});

/* ------------------------------------------------------------------ *
 * Document completeness and prerequisites
 * ------------------------------------------------------------------ */

function doc(
  key: ShipmentDocument["key"],
  state: ShipmentDocument["state"],
  required = true,
): ShipmentDocument {
  return { key, state, required, comments: [] };
}

describe("document completeness", () => {
  it("reports 100% when every required document is at original", () => {
    const c = documentCompleteness([
      doc("bill_of_lading", "original_received"),
      doc("packing_list", "original_received"),
    ]);
    expect(c.fraction).toBe(1);
    expect(c.outstanding).toEqual([]);
  });

  it("weights draft and confirmed states between zero and one", () => {
    const c = documentCompleteness([
      doc("bill_of_lading", "draft_received"),
      doc("packing_list", "confirmed"),
    ]);
    expect(c.fraction).toBeGreaterThan(0);
    expect(c.fraction).toBeLessThan(1);
    expect(c.outstanding).toEqual(["bill_of_lading", "packing_list"]);
  });

  it("excludes documents marked not required", () => {
    const c = documentCompleteness([
      doc("bill_of_lading", "original_received"),
      doc("health", "not_required"),
    ]);
    expect(c.required).toBe(1);
    expect(c.fraction).toBe(1);
  });

  it("reports complete when nothing is required", () => {
    expect(documentCompleteness([]).fraction).toBe(1);
  });
});

describe("document prerequisites", () => {
  const docs = [
    doc("bill_of_lading", "original_received"),
    doc("packing_list", "confirmed"),
    doc("health", "not_required"),
  ];

  it("reports the specific documents that are not yet at original", () => {
    const r = documentPrerequisitesMet(docs, ["bill_of_lading", "packing_list"]);
    expect(r.met).toBe(false);
    expect(r.missing).toEqual(["packing_list"]);
  });

  it("treats a not-required document as satisfied", () => {
    expect(documentPrerequisitesMet(docs, ["health"]).met).toBe(true);
  });

  it("treats a wholly absent document as missing", () => {
    expect(documentPrerequisitesMet(docs, ["obl"]).met).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * Weights — rule R16
 * ------------------------------------------------------------------ */

describe("net weight derivation (rule R16)", () => {
  const truck: TruckReceipt = {
    plateNo: "T-1",
    grossWeightKg: 31200,
    packaging: { bpBags: 0, spBags: 0, juteBags: 600, juteBales: 0, plasticBales: 0, tricoBales: 0 },
  };

  it("derives net weight from gross less a per-packaging-type tare", () => {
    const w = truckNetWeight(truck);
    expect(w.tareKg).toBe(390); // 600 jute bags × 0.65 kg
    expect(w.netKg).toBe(30810);
    expect(w.netKg).toBe(truck.grossWeightKg - w.tareKg);
  });

  it("never returns a negative net weight", () => {
    const w = truckNetWeight({ ...truck, grossWeightKg: 10 });
    expect(w.netKg).toBe(0);
  });

  it("handles a mixed bag and bale load", () => {
    const w = truckNetWeight({
      plateNo: "T-2",
      grossWeightKg: 20000,
      packaging: { bpBags: 100, spBags: 100, juteBags: 100, juteBales: 10, plasticBales: 10, tricoBales: 10 },
    });
    expect(w.tareKg).toBe(round(100 * 0.09 + 100 * 0.11 + 100 * 0.65 + 10 * 1.8 + 10 * 1.2 + 10 * 1.5, 2));
  });
});

describe("stuffing totals", () => {
  it("sums an unbounded daily collection — the legacy grid caps at seven rows", () => {
    const st: StuffingOperation = {
      containerReceived: true,
      days: Array.from({ length: 12 }, (_, i) => ({
        date: `2026-08-${String(i + 1).padStart(2, "0")}`,
        quantityMt: 50,
        bagsOrBales: 1000,
      })),
      containers: [],
      surveyorReportDates: [],
    };
    const t = stuffingTotals(st);
    expect(t.days).toBe(12);
    expect(t.quantityMt).toBe(600);
    expect(t.bagsOrBales).toBe(12000);
  });
});

/* ------------------------------------------------------------------ *
 * Demurrage — rule R15
 * ------------------------------------------------------------------ */

function vessel(partial: Partial<VesselCall>): VesselCall {
  return {
    id: "v",
    vesselNo: "V1",
    vesselName: "MV Test",
    direction: "export",
    status: "sailed",
    manifest: [],
    shipmentIds: [],
    ...partial,
  };
}

describe("demurrage estimate (rule R15)", () => {
  it("computes time alongside from ATD minus ATB and charges only the excess", () => {
    const d = demurrageEstimate(
      vessel({
        atb: "2026-07-31",
        atd: "2026-08-07",
        agreedLaytimeDays: 5,
        demurrageRatePerDay: money(9500, "USD"),
      }),
    );
    expect(d.timeAlongsideDays).toBe(7);
    expect(d.overDays).toBe(2);
    expect(d.estimate).toEqual({ amount: 19000, currency: "USD" });
  });

  it("charges nothing when inside the agreed laytime", () => {
    const d = demurrageEstimate(
      vessel({
        atb: "2026-08-15",
        atd: "2026-08-18",
        agreedLaytimeDays: 4,
        demurrageRatePerDay: money(6200, "USD"),
      }),
    );
    expect(d.overDays).toBe(0);
    expect(d.estimate).toEqual({ amount: 0, currency: "USD" });
  });

  it("returns no estimate while the vessel is still alongside", () => {
    const d = demurrageEstimate(vessel({ atb: "2026-08-15", agreedLaytimeDays: 4 }));
    expect(d.timeAlongsideDays).toBeUndefined();
    expect(d.estimate).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ *
 * Free days — rule R14
 * ------------------------------------------------------------------ */

describe("free-day exposure (rule R14)", () => {
  it("is critical once the free days are exceeded", () => {
    const e = freeDayExposure({ containersReceivedDate: "2026-07-25", freeDays: 14, today: "2026-08-17" });
    expect(e.level).toBe("critical");
    expect(e.daysLeft).toBeLessThan(0);
    expect(e.message).toContain("detention");
  });

  it("warns within three days of the limit", () => {
    const e = freeDayExposure({ containersReceivedDate: "2026-08-05", freeDays: 14, today: "2026-08-17" });
    expect(e.level).toBe("warning");
    expect(e.daysLeft).toBe(2);
  });

  it("stops the clock once the containers reach the port", () => {
    const e = freeDayExposure({
      containersReceivedDate: "2026-07-25",
      freeDays: 14,
      returnedToPortDate: "2026-08-01",
      today: "2026-08-17",
    });
    expect(e.level).toBe("none");
    expect(e.daysUsed).toBe(7);
  });

  it("is silent before the containers are received", () => {
    expect(freeDayExposure({ freeDays: 14 }).level).toBe("none");
  });
});

/* ------------------------------------------------------------------ *
 * Charges and pricing
 * ------------------------------------------------------------------ */

describe("charge totals", () => {
  const charges: Charge[] = [
    { type: "local_invoice", status: "paid", amount: money(41200, "USD") },
    { type: "freight_invoice", status: "paid", amount: money(196000, "USD") },
    { type: "detention", status: "not_applicable" },
    { type: "port_storage", status: "invoice_received", amount: money(7800, "USD") },
    { type: "other", status: "invoice_received", amount: money(1000, "AED") },
  ];

  it("totals per currency and counts what is outstanding", () => {
    const t = chargeTotals(charges);
    expect(t.paidCount).toBe(2);
    expect(t.outstandingCount).toBe(2);
    expect(t.notApplicableCount).toBe(1);
    expect(t.totals).toEqual(
      expect.arrayContaining([
        { amount: 245000, currency: "USD" },
        { amount: 1000, currency: "AED" },
      ]),
    );
  });
});

describe("sales order pricing (rule R17)", () => {
  it("labels every derived value with its own currency", () => {
    const p = salesOrderPricing({
      unitPricePerMtAed: 7352.941,
      aedToUsdRate: 0.272295,
      actuallyExportedMt: 20,
    });
    // The legacy field labelled "Total sales amount (MT)" sits under "Price MT (USD)" and is in AED.
    expect(p.totalSalesAmountAed.currency).toBe("AED");
    expect(p.pricePerMtUsd.currency).toBe("USD");
    expect(p.unitPricePerBagAed.currency).toBe("AED");
    expect(p.totalSalesAmountAed.amount).toBe(147058.82);
  });

  it("rounds the derived USD price cleanly", () => {
    const p = salesOrderPricing({ unitPricePerMtAed: 7352.941, aedToUsdRate: 0.272, actuallyExportedMt: 1 });
    expect(p.pricePerMtUsd.amount).toBe(2000);
  });
});
