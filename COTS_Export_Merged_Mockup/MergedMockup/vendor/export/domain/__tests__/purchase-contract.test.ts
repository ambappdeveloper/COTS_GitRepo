import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_DOCUMENT_REQUIREMENTS,
  emptyDraft,
  emptyLot,
  errorList,
  lotTotals,
  lotsFromDraft,
  validatePurchaseContractDraft,
  type PurchaseContractDraft,
} from "../purchase-contract";
import { TODAY } from "../calc";
import { api, resetStore } from "../../services/store";

/** A draft that passes every rule, so each test can break exactly one thing. */
function validDraft(): PurchaseContractDraft {
  return {
    ...emptyDraft(TODAY),
    buyerId: "cp-northharbour",
    buyerAddress: "Jebel Ali Free Zone, Dubai",
    buyerNickName: "NORTHH",
    commodityId: "cm-sesame-white",
    origin: "SD",
    traderName: "A. Okonkwo",
    quantityMt: "1000",
    tolerancePct: "5",
    shipmentPeriodStart: "2026-09-01",
    shipmentPeriodEnd: "2026-10-31",
    lots: [
      { key: "l1", quantityMt: "600", containerCount: "30" },
      { key: "l2", quantityMt: "400", containerCount: "20" },
    ],
    incoterm: "CNF",
    shipmentType: "container",
    methodOfShipping: "Container",
    packingType: "bags",
    packingSizeKg: "50",
    assignedDubaiExecution: "Amara Osei",
    portOfLoadingId: "pt-psd",
    portOfDischargeId: "pt-qin",
    consignee: "To order",
    notifyParty: "cp-northharbour",
    notifyPartyAddress: "Jebel Ali Free Zone, Dubai",
    partialShipment: "allowed",
    loadingContainerSize: "20ft_and_40ft",
    fumigationType: "phosphine",
    paymentTerms: "DA 60 days",
  };
}

describe("purchase contract draft — defaults", () => {
  it("pre-fills the tolerance and the four default documents, as the legacy form does", () => {
    const d = emptyDraft(TODAY);
    expect(d.tolerancePct).toBe("5");
    expect(d.documentRequirements).toEqual(DEFAULT_DOCUMENT_REQUIREMENTS);
    expect(d.consignee).toBe("To order");
    expect(d.lots).toHaveLength(1);
  });

  it("starts with the confirmation date set to today and no status field to pick", () => {
    expect(emptyDraft(TODAY).businessConfirmationDate).toBe(TODAY);
    expect("status" in emptyDraft(TODAY)).toBe(false);
  });
});

describe("lot totals are derived, never stored", () => {
  it("adds the lots up and computes the ceiling from quantity and tolerance", () => {
    const t = lotTotals(validDraft());
    expect(t.totalQtyMt).toBe(1000);
    expect(t.totalContainers).toBe(50);
    expect(t.ceilingMt).toBe(1050);
    expect(t.headroomMt).toBe(50);
    expect(t.overCeiling).toBe(false);
  });

  it("treats empty and non-numeric lot rows as zero rather than NaN", () => {
    const d = { ...validDraft(), lots: [emptyLot("a"), { key: "b", quantityMt: "abc", containerCount: "" }] };
    const t = lotTotals(d);
    expect(t.totalQtyMt).toBe(0);
    expect(Number.isNaN(t.totalQtyMt)).toBe(false);
    expect(t.totalContainers).toBe(0);
  });

  it("numbers lots by position, so removing one does not leave a hole", () => {
    const d = validDraft();
    d.lots = [d.lots[1]];
    expect(lotsFromDraft(d)).toEqual([{ lotNo: 1, quantityMt: 400, containerCount: 20 }]);
  });

  it("has no slot ceiling — twenty lots are as valid as two", () => {
    const d = validDraft();
    d.quantityMt = "2000";
    d.lots = Array.from({ length: 20 }, (_, i) => ({
      key: `l${i}`,
      quantityMt: "100",
      containerCount: "5",
    }));
    expect(lotTotals(d).totalQtyMt).toBe(2000);
    expect(validatePurchaseContractDraft(d)["pc-lot-total"]).toBeUndefined();
  });
});

describe("validation — the rules the legacy form displayed but did not enforce", () => {
  it("accepts a complete draft", () => {
    expect(validatePurchaseContractDraft(validDraft())).toEqual({});
  });

  it("refuses lot quantities above the contract ceiling (R3)", () => {
    const d = validDraft();
    d.lots = [{ key: "l1", quantityMt: "1100", containerCount: "" }];
    const e = validatePurchaseContractDraft(d);
    expect(e["pc-lot-total"]).toContain("above the contract ceiling");
    expect(e["pc-lot-total"]).toContain("1,050");
  });

  it("accepts a total inside the tolerance band", () => {
    const d = validDraft();
    d.lots = [{ key: "l1", quantityMt: "1050", containerCount: "" }];
    expect(validatePurchaseContractDraft(d)["pc-lot-total"]).toBeUndefined();
  });

  it("requires a fumigation choice, including an explicit 'none'", () => {
    const d = { ...validDraft(), fumigationType: "" as const };
    expect(validatePurchaseContractDraft(d)["pc-fumigation-methyl_bromide"]).toBeDefined();
    expect(
      validatePurchaseContractDraft({ ...d, fumigationType: "none" })["pc-fumigation-methyl_bromide"],
    ).toBeUndefined();
  });

  it("requires at least one document, and text behind a ticked 'other'", () => {
    expect(
      validatePurchaseContractDraft({ ...validDraft(), documentRequirements: [] })["pc-doc-bl_awb_roadwb"],
    ).toBeDefined();
    const withOther = {
      ...validDraft(),
      documentRequirements: [...DEFAULT_DOCUMENT_REQUIREMENTS, "other" as const],
    };
    expect(validatePurchaseContractDraft(withOther)["pc-doc-other-text"]).toBeDefined();
    expect(
      validatePurchaseContractDraft({ ...withOther, otherDocumentText: "SGS draft survey report" })[
        "pc-doc-other-text"
      ],
    ).toBeUndefined();
  });

  it("requires the buyer address that 865 legacy records are missing", () => {
    expect(
      validatePurchaseContractDraft({ ...validDraft(), buyerAddress: "   " })["pc-buyer-address"],
    ).toContain("865");
  });

  it("keeps the shipment period in order and after the confirmation date", () => {
    expect(
      validatePurchaseContractDraft({ ...validDraft(), shipmentPeriodEnd: "2026-08-01" })["pc-period-end"],
    ).toContain("before the start date");
    expect(
      validatePurchaseContractDraft({
        ...validDraft(),
        businessConfirmationDate: "2026-09-15",
        shipmentPeriodStart: "2026-09-01",
      })["pc-period-start"],
    ).toContain("business confirmation date");
  });

  it("rejects non-numeric quantities and out-of-range tolerance", () => {
    expect(
      validatePurchaseContractDraft({ ...validDraft(), quantityMt: "1,000 MT" })["pc-quantity"],
    ).toBeDefined();
    expect(validatePurchaseContractDraft({ ...validDraft(), quantityMt: "0" })["pc-quantity"]).toBeDefined();
    expect(
      validatePurchaseContractDraft({ ...validDraft(), tolerancePct: "40" })["pc-tolerance"],
    ).toBeDefined();
    expect(
      validatePurchaseContractDraft({ ...validDraft(), tolerancePct: "" })["pc-tolerance"],
    ).toBeDefined();
  });

  it("rejects fractional container counts and negative free days", () => {
    const d = validDraft();
    d.lots = [{ key: "l1", quantityMt: "1000", containerCount: "2.5" }];
    expect(validatePurchaseContractDraft(d)["pc-lot-containers-0"]).toContain("whole number");
    expect(
      validatePurchaseContractDraft({ ...validDraft(), freeDaysAtPort: "-3" })["pc-free-days"],
    ).toBeDefined();
  });

  it("asks for a container size only when the shipment is containerised", () => {
    const d = { ...validDraft(), loadingContainerSize: "" as const };
    expect(validatePurchaseContractDraft(d)["pc-container-size"]).toBeDefined();
    expect(
      validatePurchaseContractDraft({ ...d, shipmentType: "bulk", methodOfShipping: "Bulk vessel" })[
        "pc-container-size"
      ],
    ).toBeUndefined();
  });

  it("requires payment terms, because the bank submittal maturity date derives from them", () => {
    expect(
      validatePurchaseContractDraft({ ...validDraft(), paymentTerms: "" })["pc-payment-terms"],
    ).toBeDefined();
  });

  it("does not let an artwork type be chosen with no artwork detail", () => {
    const d = { ...validDraft(), artworkType: "standard" as const };
    expect(validatePurchaseContractDraft(d)["pc-artwork-printed-bags"]).toBeDefined();
    expect(
      validatePurchaseContractDraft({ ...d, artworkTags: true })["pc-artwork-printed-bags"],
    ).toBeUndefined();
  });

  it("lists every error for the summary, each pointing at a real field id", () => {
    const list = errorList(validatePurchaseContractDraft(emptyDraft(TODAY)));
    expect(list.length).toBeGreaterThan(10);
    for (const item of list) {
      expect(item.field.startsWith("pc-")).toBe(true);
      expect(item.message.length).toBeGreaterThan(5);
    }
  });
});

describe("api.createContract", () => {
  beforeEach(() => resetStore());

  it("creates the contract, issues a number and starts it at New PC", async () => {
    const before = (await api.listContracts()).length;
    const res = await api.createContract(validDraft());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.status).toBe("new_pc");
    expect(res.value.contractNo).toMatch(/^PC-\d+$/);
    expect(res.value.lots).toHaveLength(2);
    expect(res.value.quantityMt).toBe(1000);
    expect(res.value.reviewFeedback).toHaveLength(3);
    expect(res.value.reviewFeedback.map((r) => r.role)).toEqual([
      "quality",
      "finance",
      "dubai_execution",
    ]);
    expect(res.value.reviewFeedback.every((r) => r.outcome === "pending")).toBe(true);
    expect((await api.listContracts()).length).toBe(before + 1);
  });

  it("appears in the contract list straight away", async () => {
    const res = await api.createContract({ ...validDraft(), buyerNickName: "TESTBUYER" });
    expect(res.ok).toBe(true);
    const list = await api.listContracts();
    expect(list.some((c) => c.buyerNickName === "TESTBUYER")).toBe(true);
  });

  it("refuses a draft the form would have blocked, so the rule is not only in the UI", async () => {
    const bad = { ...validDraft(), lots: [{ key: "l1", quantityMt: "5000", containerCount: "" }] };
    const res = await api.createContract(bad);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/ceiling/i);
  });

  it("does not add a record when it refuses", async () => {
    const before = (await api.listContracts()).length;
    await api.createContract({ ...validDraft(), buyerAddress: "" });
    expect((await api.listContracts()).length).toBe(before);
  });

  it("flags a large-volume contract from the quantity, rather than a duplicate chain", async () => {
    const res = await api.createContract({
      ...validDraft(),
      quantityMt: "8000",
      lots: [{ key: "l1", quantityMt: "8000", containerCount: "320" }],
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.isLargeVolume).toBe(true);
  });
});
