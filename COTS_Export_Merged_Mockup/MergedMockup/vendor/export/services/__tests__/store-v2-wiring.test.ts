/**
 * The three mutators added when the v2.0 screens were wired, and two regressions
 * for bugs found while wiring them.
 *
 * The regressions matter more than the features. Both were silent: a shared seed
 * object made one shipment's post-shipment checklist every shipment's, and a focus
 * effect that depended on an inline callback threw away every character after the
 * first in a dialog text input. Neither showed up as an error.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { api, resetStore, setLatency } from "../store";
import { fundExchangeRate, fundValueUsd } from "../../domain/sourcing";
import { TODAY, money } from "../../domain/calc";
import { emptyDraft } from "../../domain/purchase-contract";
import type { PurchaseContractDraft } from "../../domain/purchase-contract";

setLatency(0);
beforeEach(resetStore);

/** A draft that passes `validatePurchaseContractDraft`, built from the seeded masters. */
function validDraft(): PurchaseContractDraft {
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
    consignee: "To order",
    notifyParty: "Anatolia Grain & Seed A.Ş.",
    notifyPartyAddress: "Ege Serbest Bölgesi, İzmir, Türkiye",
    partialShipment: "not_allowed",
    loadingContainerSize: "40ft",
    fumigationType: "phosphine",
    paymentTerms: "60 days from B/L date, D/A",
    lots: [{ key: "l1", quantityMt: "750", containerCount: "38" }],
  };
}

describe("createContract, raised from an agreed deal (v2.0 §6.2 → §6.3)", () => {
  it("links both records and carries the locked costing snapshot onto the contract", async () => {
    const res = await api.createContract(validDraft(), { opportunityId: "op-1" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.opportunityId).toBe("op-1");
    expect(res.value.costingSnapshot?.position).toBe("long");

    const opp = await api.getOpportunity("op-1");
    expect(opp?.contractId).toBe(res.value.id);
  });

  it("still creates a contract with no opportunity, which is what every legacy record is", async () => {
    const res = await api.createContract(validDraft());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.opportunityId).toBeUndefined();
  });

  it("refuses an opportunity whose deal has not been agreed", async () => {
    const res = await api.createContract(validDraft(), { opportunityId: "op-2" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/deal on that opportunity has not been agreed/i);
  });

  it("refuses a second contract from the same deal", async () => {
    const res = await api.createContract(validDraft(), { opportunityId: "op-4" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/already been raised from OPP-2026-011/);
  });

  it("refuses an opportunity that does not exist", async () => {
    const res = await api.createContract(validDraft(), { opportunityId: "op-nope" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/originating opportunity was not found/i);
  });
});

describe("consumeExportForm — rule R7 (v2.0 §6.9 activity 3)", () => {
  async function firstUnusedForm() {
    const ecs = await api.listExportContracts();
    for (const ec of ecs) {
      const form = ec.exportForms.find((f) => f.status !== "used");
      if (form) return { ec, form };
    }
    return undefined;
  }

  it("records the five identifiers, marks the form Used and appends to the consumption list", async () => {
    const found = await firstUnusedForm();
    expect(found).toBeDefined();
    if (!found) return;
    const shipments = await api.listShipments();
    const shipment = shipments.find((s) => s.exportContractId === found.ec.id) ?? shipments[0];
    const before = found.ec.consumption.length;

    const res = await api.consumeExportForm(found.ec.id, found.form.formNo, {
      clearanceShipmentId: shipment.id,
      psFileNo: "PS-99-0001",
      exportCertificateNo: "EC-99-0001",
      declarationNo: "DEC-99-0001",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const form = res.value.exportForms.find((f) => f.formNo === found.form.formNo);
    expect(form?.status).toBe("used");
    expect(form?.declarationNo).toBe("DEC-99-0001");
    expect(form?.usedOnClearanceId).toBe(shipment.id);
    expect(res.value.consumption.length).toBe(before + 1);
  });

  it("refuses consuming a form that is already Used — the constraint the legacy drop-down states and does not enforce", async () => {
    const found = await firstUnusedForm();
    if (!found) return;
    const shipments = await api.listShipments();
    const shipment = shipments.find((s) => s.exportContractId === found.ec.id) ?? shipments[0];
    await api.consumeExportForm(found.ec.id, found.form.formNo, {
      clearanceShipmentId: shipment.id,
      declarationNo: "DEC-99-0002",
    });
    const again = await api.consumeExportForm(found.ec.id, found.form.formNo, {
      clearanceShipmentId: shipment.id,
      declarationNo: "DEC-99-0003",
    });
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.reason).toMatch(/used/i);
  });

  it("refuses without the customs declaration number", async () => {
    const found = await firstUnusedForm();
    if (!found) return;
    const shipments = await api.listShipments();
    const res = await api.consumeExportForm(found.ec.id, found.form.formNo, {
      clearanceShipmentId: shipments[0].id,
      declarationNo: "   ",
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/declaration number/i);
  });

  it("refuses an unknown form and an unknown export contract", async () => {
    const ecs = await api.listExportContracts();
    const shipments = await api.listShipments();
    const a = await api.consumeExportForm(ecs[0].id, "NOT-A-FORM", {
      clearanceShipmentId: shipments[0].id,
      declarationNo: "D",
    });
    expect(a.ok).toBe(false);
    const b = await api.consumeExportForm("ec-nope", "X", {
      clearanceShipmentId: shipments[0].id,
      declarationNo: "D",
    });
    expect(b.ok).toBe(false);
  });
});

describe("advanceBankSubmittal — the proposed bank lifecycle (v2.0 §6.15)", () => {
  /** A shipment whose bank submittal is still at `assembling`. */
  async function assembling() {
    const shipments = await api.listShipments();
    return shipments.find((s) => s.bankSubmittal.status === "assembling")!;
  }

  it("refuses the first move while a post-shipment checklist item is unticked — rule R21", async () => {
    const s = await assembling();
    expect(s).toBeDefined();
    const res = await api.advanceBankSubmittal(s.id, "sent_to_trade_finance");
    if (s.postShipment.checklist.every((c) => c.done)) return; // nothing to prove on this record
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/checklist|unticked|item/i);
  });

  it("walks assembling → sent → submitted → under collection once the checklist is complete", async () => {
    const s = await assembling();
    for (const item of s.postShipment.checklist) {
      if (!item.done) await api.toggleChecklistItem(s.id, item.key);
    }
    const sent = await api.advanceBankSubmittal(s.id, "sent_to_trade_finance");
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    expect(sent.value.postShipment.sentToTradeFinance).toBe(true);
    expect(sent.value.postShipment.sentToTradeFinanceDate).toBe(TODAY);

    const noMaturity = await api.advanceBankSubmittal(s.id, "submitted_to_bank");
    expect(noMaturity.ok).toBe(false);
    if (!noMaturity.ok) expect(noMaturity.reason).toMatch(/maturity date/i);

    const submitted = await api.advanceBankSubmittal(s.id, "submitted_to_bank", {
      maturityDate: "2026-11-30",
      awb: "AWB-99-1234",
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(submitted.value.bankSubmittal.maturityDate).toBe("2026-11-30");
    expect(submitted.value.bankSubmittal.docsSentToBankDate).toBe(TODAY);

    const noAmount = await api.advanceBankSubmittal(s.id, "under_collection");
    expect(noAmount.ok).toBe(false);
    if (!noAmount.ok) expect(noAmount.reason).toMatch(/under collection/i);

    const collecting = await api.advanceBankSubmittal(s.id, "under_collection", {
      underCollection: money(1250000, "AED"),
    });
    expect(collecting.ok).toBe(true);
    if (!collecting.ok) return;
    expect(collecting.value.bankSubmittal.status).toBe("under_collection");
    expect(collecting.value.bankSubmittal.underCollection?.amount).toBe(1250000);
  });

  it("refuses a transition the lifecycle does not permit", async () => {
    const s = await assembling();
    const res = await api.advanceBankSubmittal(s.id, "paid");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/may only move to/i);
  });

  it("stamps the payment date on paid and appends an audit event", async () => {
    const shipments = await api.listShipments();
    const s = shipments.find((x) => x.bankSubmittal.status === "under_collection");
    if (!s) return;
    const before = s.audit.length;
    const res = await api.advanceBankSubmittal(s.id, "paid");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.bankSubmittal.paymentReceivedDate).toBe(TODAY);
    expect(res.value.audit.length).toBe(before + 1);
  });

  it("refuses an unknown shipment", async () => {
    const res = await api.advanceBankSubmittal("sh-nope", "sent_to_trade_finance");
    expect(res.ok).toBe(false);
  });
});

describe("regression — the seed must not share sub-records between shipments", () => {
  /**
   * `emptyAssembly` and `emptyBank` were shared constants assigned to several
   * shipments. `structuredClone` preserves aliasing within one call, so cloning the
   * store carried the sharing through and ticking one shipment's checklist ticked
   * every shipment's. They are factories now; this is the guard.
   */
  it("ticks a post-shipment checklist item on one shipment only", async () => {
    const before = await api.listShipments();
    const target = before.find((s) => s.postShipment.checklist.some((c) => !c.done))!;
    const key = target.postShipment.checklist.find((c) => !c.done)!.key;
    const others = before.filter((s) => s.id !== target.id);

    await api.toggleChecklistItem(target.id, key);

    const after = await api.listShipments();
    expect(
      after.find((s) => s.id === target.id)!.postShipment.checklist.find((c) => c.key === key)!.done,
    ).toBe(true);
    for (const o of others) {
      const now = after.find((s) => s.id === o.id)!;
      const wasDone = o.postShipment.checklist.find((c) => c.key === key)?.done;
      const isDone = now.postShipment.checklist.find((c) => c.key === key)?.done;
      expect(isDone, `${o.shipmentNo} changed when ${target.shipmentNo} was ticked`).toBe(wasDone);
    }
  });

  it("advances one shipment's bank submittal only", async () => {
    const before = await api.listShipments();
    const target = before.find((s) => s.bankSubmittal.status === "assembling")!;
    for (const item of target.postShipment.checklist) {
      if (!item.done) await api.toggleChecklistItem(target.id, item.key);
    }
    await api.advanceBankSubmittal(target.id, "sent_to_trade_finance");

    const after = await api.listShipments();
    for (const o of before.filter((s) => s.id !== target.id)) {
      const now = after.find((s) => s.id === o.id)!;
      expect(now.bankSubmittal.status, `${o.shipmentNo} moved with ${target.shipmentNo}`).toBe(
        o.bankSubmittal.status,
      );
    }
  });

  it("gives every shipment its own stuffing, packing, assembly, bank and sales-order object", async () => {
    const shipments = await api.listShipments();
    for (const key of ["stuffing", "packingList", "postShipment", "bankSubmittal", "salesOrder"] as const) {
      const seen = new Set<unknown>();
      for (const s of shipments) {
        expect(seen.has(s[key]), `two shipments share the same ${key} object`).toBe(false);
        seen.add(s[key]);
      }
    }
  });
});

/* ================================================================== *
 * The three add-screen mutators, added with the sourcing menu reorder.
 *
 * Each one enforces something MMP does not, and each refusal names the legacy
 * behaviour it is refusing, so a reviewer reading the message learns why the rule
 * exists rather than just being stopped.
 * ================================================================== */

describe("createFund — MMP New Fund Form", () => {
  const base = {
    seasonality: "2025-2026",
    agentId: "cp-sup-gabani",
    commodityId: "cm-sesame-white",
    requiredPaymentDate: TODAY,
    valueLocal: 500000,
    localCurrency: "SDG" as const,
  };

  it("creates a fund and issues its own reference, no purchase order needed", async () => {
    const res = await api.createFund(base);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // MMP built the reference from the purchase order. The Create screen no longer
    // captures one, so the reference is issued independently.
    expect(res.value.fundRef).toMatch(/^FND-\d{4}-\d{4}$/);
    expect(res.value.purchaseOrderNo).toBeUndefined();
    expect(res.value.id).toMatch(/^fd-/);
    // Requested, not paid: no rate, and no USD value.
    expect(res.value.actualPaymentDate).toBeUndefined();
  });

  it("refuses a zero or negative value in local currency", async () => {
    expect((await api.createFund({ ...base, valueLocal: 0 })).ok).toBe(false);
    expect((await api.createFund({ ...base, valueLocal: -1 })).ok).toBe(false);
  });

  it("refuses a payment date the rate table cannot answer for, naming the currency and date", async () => {
    const res = await api.createFund({ ...base, actualPaymentDate: "1999-01-01" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/no exchange rate is held for sdg/i);
    expect(res.reason).toContain("1999-01-01");
  });

  it("reads a rate for a payment date the table does reach, and derives the USD value", async () => {
    const res = await api.createFund({ ...base, actualPaymentDate: "2026-06-18" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // 500,000 SDG ÷ the June rate of 600.
    expect(fundExchangeRate(res.value)?.perUsd).toBe(600);
    expect(fundValueUsd(res.value)?.amount).toBeCloseTo(833.33, 2);
  });

  it("no longer captures a finance rate at all, so none is validated", async () => {
    // MMP required Finance Rate (%) and consumed it nowhere. Neither of the two screens
    // the instruction of 27 August 2026 specifies carries it, so it is not entered and
    // there is nothing to refuse. The field survives on the record for the legacy funds.
    const res = await api.createFund(base);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.financeRatePct).toBeUndefined();
  });

  it("refuses Finance with no bank — MMP shows the field and accepts it blank", async () => {
    const res = await api.createFund({ ...base, mode: "finance" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/records the bank/i);
  });

  it("accepts Finance once the bank is named", async () => {
    expect((await api.createFund({ ...base, mode: "finance", bankName: "QNB" })).ok).toBe(true);
  });

  it("refuses Barter with no bartered commodity", async () => {
    const res = await api.createFund({ ...base, mode: "barter" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/commodity being bartered/i);
  });

  it("accepts no purchase order, and refuses an unknown agent or commodity", async () => {
    // The purchase order is not on the Create screen at all — it is issued afterwards.
    expect((await api.createFund({ ...base, purchaseOrderNo: undefined })).ok).toBe(true);
    expect((await api.createFund({ ...base, agentId: "cp-nope" })).ok).toBe(false);
    expect((await api.createFund({ ...base, commodityId: "cm-nope" })).ok).toBe(false);
  });

  it("stamps the fund as shared under Save & share, and not otherwise", async () => {
    expect((await api.createFund(base)).ok && (await api.createFund(base)).ok).toBe(true);
    const plain = await api.createFund(base);
    const shared = await api.createFund({ ...base, share: true });
    expect(plain.ok && plain.value.sharedOn).toBeFalsy();
    expect(shared.ok && shared.value.sharedOn).toBe(TODAY);
  });
});

describe("createPurchaseAgreement — MMP New Purchase Agreement", () => {
  const base = {
    purchaseOrderNo: "9922",
    seasonality: "2025-2026",
    commodityId: "cm-sesame-white",
    supplierId: "cp-sup-gabani",
    purchaser: "Selim Aziz",
    createdBy: "s.aziz",
    totalQuantityMt: 1000,
    flowStatus: "open" as const,
    agreementDate: TODAY,
    bpBagWeightLb: 0.2,
    spBagWeightLb: 0.24,
    juteBagWeightLb: 1.43,
    bagWeightApplicable: true,
    attachments: [],
  };

  it("creates an agreement and issues its own reference, no purchase order needed", async () => {
    const res = await api.createPurchaseAgreement(base);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // MMP built the reference from the purchase order, which the Add screen no longer
    // carries — it is issued after the agreement is struck.
    expect(res.value.paRef).toMatch(/^PA-\d{4}-\d{4}$/);
    expect(res.value.createdOn).toBe(TODAY);
  });

  it("refuses a zero quantity, because receiving locations allocate against it", async () => {
    const res = await api.createPurchaseAgreement({ ...base, totalQuantityMt: 0 });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/receiving locations allocate against it/i);
  });

  it.each([
    ["bpBagWeightLb", "big-pack"],
    ["spBagWeightLb", "small-pack"],
    ["juteBagWeightLb", "jute"],
  ] as const)(
    "refuses a zero %s weight, naming what it would silently zero downstream",
    async (field, label) => {
      const res = await api.createPurchaseAgreement({ ...base, [field]: 0 });
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.reason).toContain(label);
      expect(res.reason).toMatch(/packaging tare/i);
      // And the same weight is fine once Is Applicable is cleared — the point of the flag.
      const cleared = await api.createPurchaseAgreement({
        ...base,
        [field]: 0,
        bagWeightApplicable: false,
      });
      expect(cleared.ok).toBe(true);
    },
  );

  it("accepts a blank purchase order, because the Add screen no longer captures one", async () => {
    expect((await api.createPurchaseAgreement({ ...base, purchaseOrderNo: undefined })).ok).toBe(true);
  });

  it("refuses a blank purchaser, seasonality, commodity or supplier", async () => {
    expect((await api.createPurchaseAgreement({ ...base, purchaser: " " })).ok).toBe(false);
    expect((await api.createPurchaseAgreement({ ...base, seasonality: "" })).ok).toBe(false);
    expect((await api.createPurchaseAgreement({ ...base, commodityId: "" })).ok).toBe(false);
    expect((await api.createPurchaseAgreement({ ...base, supplierId: "cp-nope" })).ok).toBe(false);
  });

  it("takes the commodity from a seasonal purchase plan when one is named", async () => {
    // spp-2 carries white sesame, so this is accepted.
    const ok = await api.createPurchaseAgreement({
      ...base,
      seasonalPlanId: "spp-2",
      commodityId: "cm-sesame-white",
    });
    expect(ok.ok).toBe(true);
  });

  it("refuses a commodity the named plan does not carry, and names both", async () => {
    const res = await api.createPurchaseAgreement({
      ...base,
      seasonalPlanId: "spp-2",
      commodityId: "cm-sorghum",
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/Sorghum/);
    expect(res.reason).toMatch(/SPP-2026-0002/);
  });

  it("accepts no plan at all, because five of the captured agreements have none", async () => {
    const res = await api.createPurchaseAgreement({ ...base, seasonalPlanId: undefined });
    expect(res.ok).toBe(true);
  });

  it("refuses a plan that does not exist", async () => {
    const res = await api.createPurchaseAgreement({ ...base, seasonalPlanId: "spp-nope" });
    expect(res.ok).toBe(false);
  });

  it("stamps the agreement as shared under Save & share, and not otherwise", async () => {
    const plain = await api.createPurchaseAgreement(base);
    const shared = await api.createPurchaseAgreement({ ...base, share: true });
    expect(plain.ok && plain.value.sharedOn).toBeFalsy();
    expect(shared.ok && shared.value.sharedOn).toBe(TODAY);
  });

  it("lets a receipt be booked against a facility allocated on the new agreement", async () => {
    const created = await api.createPurchaseAgreement(base);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const plans = await api.addReceivingLocationPlans(created.value.id, [
      { facility: "FC31 - Mahaseelna", quantityMt: 400, assignedTo: "s.aziz" },
    ]);
    expect(plans.ok).toBe(true);
    const receipt = await api.createIntakeReceipt({
      kind: "facility",
      purchaseAgreementId: created.value.id,
      location: "FC31 - Mahaseelna",
      receiptDate: TODAY,
      receiptFrom: "supplier",
      bags: { bpBags: 10, spBags: 10, juteBags: 10 },
      grossWeightWithDirtMt: 40,
    });
    expect(receipt.ok).toBe(true);
  });
});

describe("updatePurchaseAgreement — the Update screen MMP never had", () => {
  it("adds the purchase order, which the Add screen does not carry", async () => {
    const before = (await api.getPurchaseAgreement("pa-4"))!;
    const res = await api.updatePurchaseAgreement("pa-4", {
      purchaseOrderNo: "PO-77120",
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.purchaseOrderNo).toBe("PO-77120");
    expect(res.value.updatedOn).toBe(TODAY);
    // The reference is not rewritten to follow the new PO.
    expect(res.value.paRef).toBe(before.paRef);
  });

  it("refuses an id that does not exist", async () => {
    const res = await api.updatePurchaseAgreement("pa-nope", { purchaseOrderNo: "X" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/not found/i);
  });

  it("clears the three weights when Is Applicable is unset, so no stale tare can be read", async () => {
    const before = (await api.getPurchaseAgreement("pa-1"))!;
    expect(before.bagWeightApplicable).toBe(true);
    expect(before.bpBagWeightLb).toBeGreaterThan(0);
    const res = await api.updatePurchaseAgreement("pa-1", {
      bagWeightApplicable: false,
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.bpBagWeightLb).toBeUndefined();
    expect(res.value.spBagWeightLb).toBeUndefined();
    expect(res.value.juteBagWeightLb).toBeUndefined();
  });

  it("requires the three weights the moment Is Applicable is set", async () => {
    // pa-5 has no weights at all, because none applies to it.
    const res = await api.updatePurchaseAgreement("pa-5", {
      bagWeightApplicable: true,
      updatedBy: "tester",
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/must be above zero/i);
    expect(res.reason).toMatch(/Clear Is Applicable/i);
  });

  it("applies the plan-and-commodity rule on update too", async () => {
    const res = await api.updatePurchaseAgreement("pa-1", {
      seasonalPlanId: "spp-2",
      commodityId: "cm-sorghum",
      updatedBy: "tester",
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/is not on SPP-2026-0002/i);
  });

  it("leaves the stored agreement untouched when it refuses", async () => {
    await api.updatePurchaseAgreement("pa-5", { bagWeightApplicable: true });
    const after = (await api.getPurchaseAgreement("pa-5"))!;
    expect(after.bagWeightApplicable).toBe(false);
    expect(after.updatedOn).toBeUndefined();
  });

  it("stamps the agreement as shared on update", async () => {
    const res = await api.updatePurchaseAgreement("pa-4", { share: true, updatedBy: "tester" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.sharedOn).toBe(TODAY);
  });
});

describe("updateFund — the payment the Create screen could not know about", () => {
  it("records the PO number, the actual payment date and the mode, and derives the rate", async () => {
    const res = await api.updateFund("fd-5", {
      purchaseOrderNo: "PO-5501",
      actualPaymentDate: "2026-09-14",
      mode: "cash",
      documentName: "fd-5-transfer.pdf",
      updatedBy: "tester",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.purchaseOrderNo).toBe("PO-5501");
    // The September rate, read from the table — never supplied by the caller.
    expect(fundExchangeRate(res.value)?.perUsd).toBe(626);
    expect(fundValueUsd(res.value)).toBeTruthy();
    expect(res.value.updatedOn).toBe(TODAY);
  });

  it("had no rate and no USD value before that payment date was recorded", async () => {
    const before = (await api.getFund("fd-5"))!;
    expect(before.actualPaymentDate).toBeUndefined();
    expect(fundExchangeRate(before)).toBeUndefined();
    expect(fundValueUsd(before)).toBeUndefined();
  });

  it("refuses an actual payment date the rate table cannot answer for", async () => {
    const res = await api.updateFund("fd-5", { actualPaymentDate: "1990-01-01" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/no exchange rate is held/i);
  });

  it("refuses Finance with no bank on update, as on create", async () => {
    const res = await api.updateFund("fd-5", { mode: "finance" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/records the bank that provided it/i);
  });

  it("refuses an id that does not exist", async () => {
    expect((await api.updateFund("fd-nope", { mode: "cash" })).ok).toBe(false);
  });

  it("stamps the fund as shared on update", async () => {
    const res = await api.updateFund("fd-5", { share: true, updatedBy: "tester" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.sharedOn).toBe(TODAY);
    expect(res.value.sharedBy).toBe("tester");
  });
});

describe("createAgentBalance — MMP /AgentBalances/Create", () => {
  const base = {
    supplierId: "cp-sup-sahelseeds",
    seasonality: "2025-2026",
    actualBalance: money(1000000, "SDG"),
    estimatedBalance: money(1000000, "SDG"),
  };

  it("creates a balance and generates the id the legacy scaffold asks the user to type", async () => {
    const res = await api.createAgentBalance(base);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.id).toMatch(/^ab-/);
  });

  it("refuses a second balance for the same agent and season — MMP states no uniqueness rule", async () => {
    const res = await api.createAgentBalance({
      ...base,
      supplierId: "cp-sup-gabani",
      seasonality: "2025-2026",
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/already has a balance/i);
    expect(res.reason).toMatch(/uniqueness/i);
  });

  it("refuses a negative balance, which the legacy plain text input accepts", async () => {
    expect((await api.createAgentBalance({ ...base, actualBalance: money(-1, "SDG") })).ok).toBe(false);
    expect((await api.createAgentBalance({ ...base, estimatedBalance: money(-1, "SDG") })).ok).toBe(false);
  });

  it("refuses an unknown agent and a blank season", async () => {
    expect((await api.createAgentBalance({ ...base, supplierId: "cp-nope" })).ok).toBe(false);
    expect((await api.createAgentBalance({ ...base, seasonality: "" })).ok).toBe(false);
  });

  it("is immediately movable, so the new balance reaches the transfer and refund path", async () => {
    const created = await api.createAgentBalance(base);
    expect(created.ok).toBe(true);
    const moved = await api.moveAgentBalance({
      kind: "transfer",
      supplierId: base.supplierId,
      seasonality: base.seasonality,
      amount: money(250000, "SDG"),
      toSupplierId: "cp-sup-gabani",
    });
    expect(moved.ok).toBe(true);
  });
});
