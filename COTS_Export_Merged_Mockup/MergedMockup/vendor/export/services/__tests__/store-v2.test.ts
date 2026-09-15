/**
 * The workflow v2.0 and sourcing-intake mutators.
 *
 * The legacy estate's characteristic defect is a rule that displays its message and
 * then saves anyway (export-process-update.md §4.3e). Every mutator here is therefore
 * tested twice: once for the path that should succeed, and at least once for the
 * refusal — checking not only that `ok` is false but that the reason names the rule,
 * because a refusal a user cannot read is a refusal a user will work around.
 *
 * Where a guard cannot be reached through the API at all, that is said in the test
 * rather than worked around: `setOpportunityCosting` applies the same short-position
 * check as `guardDealAgreement`, so no stored opportunity can ever reach the deal gate
 * in the state the gate refuses.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { api, resetStore, setLatency } from "../store";
import { TODAY, money } from "../../domain/calc";
import { portName } from "../../data/master";
import { INSURANCE_INCIDENT_TRANSITIONS, guardDealAgreement } from "../../domain/status";
import type {
  ContractQualityParameter,
  FreightRate,
  IntakeReceiptPricing,
  MovementTrip,
  StuffingNotifyFunction,
} from "../../domain/types";

setLatency(0);

beforeEach(() => {
  resetStore();
});

/** Narrowing helper — every assertion below wants the reason string, not the union. */
function reasonOf(res: { ok: true } | { ok: false; reason: string }): string {
  expect(res.ok).toBe(false);
  return res.ok ? "" : res.reason;
}

/* ================================================================== *
 * Phase 01 — the costing snapshot
 * ================================================================== */

describe("setOpportunityCosting", () => {
  it("saves a snapshot against an opportunity that has none locked", async () => {
    const op = (await api.listOpportunities()).find((o) => o.id === "op-2")!;
    const res = await api.setOpportunityCosting("op-2", { ...op.costing!, takenOn: TODAY });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.costing!.takenOn).toBe(TODAY);
  });

  it("refuses a snapshot on a locked opportunity, naming why the lock exists", async () => {
    const op = (await api.listOpportunities()).find((o) => o.id === "op-1")!;
    expect(op.costing!.locked).toBe(true);
    const reason = reasonOf(await api.setOpportunityCosting("op-1", { ...op.costing!, takenOn: TODAY }));
    expect(reason).toContain("locked");
    expect(reason).toContain("deal was agreed");
  });

  it("refuses a snapshot once a contract has been raised from the deal", async () => {
    const op = (await api.listOpportunities()).find((o) => o.id === "op-4")!;
    const reason = reasonOf(await api.setOpportunityCosting("op-4", { ...op.costing!, locked: false }));
    expect(reason).toContain("contract has already been raised");
  });

  it("refuses a short position with no expected raw purchase price", async () => {
    const op = (await api.listOpportunities()).find((o) => o.id === "op-2")!;
    const reason = reasonOf(
      await api.setOpportunityCosting("op-2", {
        ...op.costing!,
        position: "short",
        expectedRawPricePerMt: undefined,
      }),
    );
    expect(reason).toContain("expected raw purchase price");
  });

  it("accepts a long position with no expected raw purchase price", async () => {
    const op = (await api.listOpportunities()).find((o) => o.id === "op-2")!;
    const res = await api.setOpportunityCosting("op-2", {
      ...op.costing!,
      position: "long",
      expectedRawPricePerMt: undefined,
    });
    expect(res.ok).toBe(true);
  });

  it("refuses an unknown opportunity", async () => {
    const op = (await api.listOpportunities())[0];
    expect(reasonOf(await api.setOpportunityCosting("op-nope", op.costing!))).toContain("not found");
  });

  it("stores a copy, so mutating the caller's snapshot afterwards does not change the record", async () => {
    const op = (await api.listOpportunities()).find((o) => o.id === "op-2")!;
    const draft = { ...op.costing!, lines: [...op.costing!.lines] };
    await api.setOpportunityCosting("op-2", draft);
    draft.lines.length = 0;
    const after = await api.getOpportunity("op-2");
    expect(after!.costing!.lines.length).toBeGreaterThan(0);
  });
});

/* ================================================================== *
 * Phase 02 — the deal gate
 * ================================================================== */

describe("agreeDeal", () => {
  const terms = {
    buyerId: "cp-lowlands",
    commodityId: "cm-groundnut-hps",
    pricePerMt: money(1140, "USD"),
    incoterm: "FOB" as const,
    origin: "SD" as const,
    portOfLoadingId: "pt-psd",
    portOfDischargeId: "pt-rtm",
    quantityMt: 1200,
    shipmentPeriodStart: "2026-10-01",
    shipmentPeriodEnd: "2026-11-30",
    paymentTerms: "At sight, D/P",
  };

  it("agrees a deal on an opportunity with a costing snapshot and a declared position", async () => {
    const res = await api.agreeDeal("op-2", terms);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.deal!.quantityMt).toBe(1200);
  });

  it("stamps the agreement date", async () => {
    const res = await api.agreeDeal("op-2", terms);
    if (res.ok) expect(res.value.dealAgreedOn).toBe(TODAY);
    else expect.unreachable();
  });

  it("locks the costing snapshot at agreement, so the priced basis can be compared later", async () => {
    const res = await api.agreeDeal("op-2", terms);
    if (res.ok) {
      expect(res.value.costing!.locked).toBe(true);
      expect(res.value.costing!.lockedOn).toBe(TODAY);
    } else expect.unreachable();
  });

  it("records the hand-off channel as the assumption it is", async () => {
    const res = await api.agreeDeal("op-2", terms);
    if (res.ok) expect(res.value.dealChannel).toContain("assumption");
    else expect.unreachable();
  });

  it("refuses a deal with no costing snapshot, naming the snapshot as the gate", async () => {
    // op-3 has no costing run at all.
    const reason = reasonOf(await api.agreeDeal("op-3", terms));
    expect(reason).toContain("costing snapshot");
  });

  it("refuses a second agreement on an opportunity already agreed", async () => {
    const reason = reasonOf(await api.agreeDeal("op-1", terms));
    expect(reason).toContain("already been agreed");
  });

  it("refuses an unknown opportunity", async () => {
    expect(reasonOf(await api.agreeDeal("op-nope", terms))).toContain("not found");
  });

  it("would refuse a short position with no expected raw price — asserted on the guard, since no stored opportunity can reach that state", () => {
    // `setOpportunityCosting` applies the identical check, so a short snapshot without the
    // expected raw price can never be persisted and the deal gate's own branch is unreachable
    // through the API. The rule is still the deal gate's, so it is asserted where it lives.
    const gate = guardDealAgreement({ position: "short", expectedRawPricePerMt: undefined });
    expect(gate.allowed).toBe(false);
    if (!gate.allowed) expect(gate.reason).toContain("expected raw purchase price");
  });

  it("refuses a deal where no position has been declared at all", () => {
    const gate = guardDealAgreement({ locked: false });
    expect(gate.allowed).toBe(false);
    if (!gate.allowed) expect(gate.reason).toContain("long / short position declaration is mandatory");
  });
});

describe("linkOpportunityToContract", () => {
  it("records the contract raised from an agreed deal", async () => {
    const res = await api.linkOpportunityToContract("op-1", "ct-2");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.contractId).toBe("ct-2");
  });

  it("refuses to link before the deal has been agreed", async () => {
    expect(reasonOf(await api.linkOpportunityToContract("op-3", "ct-2"))).toContain(
      "deal has not been agreed",
    );
  });

  it("refuses an unknown opportunity", async () => {
    expect(reasonOf(await api.linkOpportunityToContract("op-nope", "ct-2"))).toContain("not found");
  });
});

/* ================================================================== *
 * Phase 04 — the three cross-functional confirmations
 * ================================================================== */

describe("recordReviewFeedback", () => {
  it("records a confirmation from one of the three functions and stamps the response date", async () => {
    /* Processing was a fourth reviewer until 8 September 2026, when it was taken off the
       cross-functional review; it keeps its readiness role at Phase 13 (allocation). */
    const res = await api.recordReviewFeedback("ct-2", "partner_execution", "confirmed", {
      respondedBy: "Selim Aziz",
      comment: "Origin execution is ready to load.",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const row = res.value.reviewFeedback.find((f) => f.role === "partner_execution")!;
      expect(row.outcome).toBe("confirmed");
      expect(row.respondedOn).toBe(TODAY);
      expect(row.respondedBy).toBe("Selim Aziz");
    }
  });

  it("clears the response date when the outcome is set back to pending", async () => {
    const res = await api.recordReviewFeedback("ct-1", "quality", "pending");
    expect(res.ok).toBe(true);
    if (res.ok) {
      const row = res.value.reviewFeedback.find((f) => f.role === "quality")!;
      expect(row.outcome).toBe("pending");
      expect(row.respondedOn).toBeUndefined();
    }
  });

  it("records a concern with its comment", async () => {
    const res = await api.recordReviewFeedback("ct-1", "finance", "concern", {
      comment: "Payment terms breach the credit limit.",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const row = res.value.reviewFeedback.find((f) => f.role === "finance")!;
      expect(row.outcome).toBe("concern");
      expect(row.comment).toContain("credit limit");
      expect(row.respondedOn).toBe(TODAY);
    }
  });

  it("refuses a role that is not one of the functions the review notifies", async () => {
    const reason = reasonOf(await api.recordReviewFeedback("ct-1", "logistics", "confirmed"));
    expect(reason).toContain("not one of the functions");
  });

  it("no longer notifies Processing, which came off the review on 8 September 2026", async () => {
    const reason = reasonOf(await api.recordReviewFeedback("ct-1", "processing", "confirmed"));
    expect(reason).toContain("not one of the functions");
  });

  it("refuses a concern with no comment, since the review would record nothing usable", async () => {
    const reason = reasonOf(await api.recordReviewFeedback("ct-1", "quality", "concern"));
    expect(reason).toContain("A concern must say what it is");
  });

  it("refuses a concern whose comment is only whitespace", async () => {
    expect(
      reasonOf(await api.recordReviewFeedback("ct-1", "quality", "concern", { comment: "   " })),
    ).toContain("A concern must say what it is");
  });

  it("refuses an unknown contract", async () => {
    expect(reasonOf(await api.recordReviewFeedback("ct-nope", "quality", "confirmed"))).toContain(
      "not found",
    );
  });
});

/* ================================================================== *
 * Phase 05 — quality terms and the tags specification
 * ================================================================== */

describe("setContractQualityTerms", () => {
  const terms: ContractQualityParameter[] = [
    { name: "Moisture", masterSpec: "max 7%", mandatory: true, source: "master" },
    { name: "FFA", masterSpec: "max 2%", buyerSpec: "max 1.5%", mandatory: true, source: "buyer" },
  ];

  it("saves the contract's quality terms", async () => {
    const res = await api.setContractQualityTerms("ct-1", terms);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.qualityTerms).toHaveLength(2);
  });

  it("keeps the buyer override alongside the master specification", async () => {
    const res = await api.setContractQualityTerms("ct-1", terms);
    if (res.ok) {
      const ffa = res.value.qualityTerms!.find((p) => p.name === "FFA")!;
      expect(ffa.masterSpec).toBe("max 2%");
      expect(ffa.buyerSpec).toBe("max 1.5%");
    } else expect.unreachable();
  });

  it("replaces the previous terms rather than appending to them", async () => {
    await api.setContractQualityTerms("ct-1", terms);
    const res = await api.setContractQualityTerms("ct-1", [terms[0]]);
    if (res.ok) expect(res.value.qualityTerms).toHaveLength(1);
    else expect.unreachable();
  });

  it("refuses an unknown contract", async () => {
    expect(reasonOf(await api.setContractQualityTerms("ct-nope", terms))).toContain("not found");
  });

  it("stores a copy, so mutating the caller's array does not change the record", async () => {
    const draft = [...terms];
    await api.setContractQualityTerms("ct-1", draft);
    draft.length = 0;
    const after = await api.getContract("ct-1");
    expect(after!.qualityTerms).toHaveLength(2);
  });
});

describe("recordTagSpecificationAction", () => {
  /* Origin sends the tag; Dubai answers it. The state is derived from the action, so a test
     reaches a state by performing the legs that lead to it. */
  const sent = (over: Parameters<typeof api.recordTagSpecificationAction>[2] = {}) =>
    api.recordTagSpecificationAction("ct-1", "sent", { option: "standard", ...over });

  it("moves an unstarted specification to sent", async () => {
    const res = await sent();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.tagSpecification!.state).toBe("sent");
  });

  it("moves a sent specification on to confirmed, which is what agreement means", async () => {
    await sent();
    const res = await api.recordTagSpecificationAction("ct-1", "confirmed", { by: "Amara Osei" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.tagSpecification!.state).toBe("confirmed");
      expect(res.value.tagSpecification!.agreedOn).toBe(TODAY);
    }
  });

  it("returns a sent specification with an amendment, which goes back to Origin", async () => {
    await sent();
    const res = await api.recordTagSpecificationAction("ct-1", "amended", {
      note: "Arabic net weight is missing.",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.tagSpecification!.state).toBe("amended");
  });

  it("refuses an amendment that does not say what is to change", async () => {
    await sent();
    const reason = reasonOf(await api.recordTagSpecificationAction("ct-1", "amended"));
    expect(reason).toContain("must say what is to change");
  });

  it("allows a confirmed specification to be reissued after reprocessing, so it is not terminal", async () => {
    await sent();
    await api.recordTagSpecificationAction("ct-1", "confirmed");
    const res = await api.recordTagSpecificationAction("ct-1", "reissued");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.tagSpecification!.state).toBe("reissued");
  });

  it("refuses an illegal state move per TAG_SPECIFICATION_TRANSITIONS", async () => {
    // not_started may only reach `sent`.
    const reason = reasonOf(await api.recordTagSpecificationAction("ct-1", "confirmed"));
    expect(reason).toContain("may only move to");
    expect(reason).toContain("sent");
  });

  it("refuses jumping straight to reissued from unstarted", async () => {
    expect(reasonOf(await api.recordTagSpecificationAction("ct-1", "reissued"))).toContain(
      "may only move to",
    );
  });

  it("refuses a buyer option that lists no custom tags", async () => {
    const reason = reasonOf(await sent({ option: "buyer", customTags: [] }));
    expect(reason).toContain("custom tag options the buyer requires");
  });

  it("accepts a buyer option that lists its custom tags", async () => {
    const res = await sent({
      option: "buyer",
      customTags: ["Buyer logo, 4-colour", "Arabic net weight"],
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.tagSpecification!.customTags).toHaveLength(2);
  });

  it("records the leg on the exchange, so the record says who did what", async () => {
    await sent();
    const res = await api.recordTagSpecificationAction("ct-1", "confirmed", { by: "Amara Osei" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const exchange = res.value.tagSpecification!.exchange;
      expect(exchange).toHaveLength(2);
      expect(exchange[0].action).toBe("sent");
      expect(exchange[0].party).toBe("partner_execution");
      expect(exchange[1].action).toBe("confirmed");
      expect(exchange[1].party).toBe("dubai_execution");
    }
  });

  it("refuses an unknown contract", async () => {
    expect(
      reasonOf(await api.recordTagSpecificationAction("ct-nope", "sent", { option: "standard" })),
    ).toContain("not found");
  });
});

/* ================================================================== *
 * Phase 06 — allocation, readiness, production plan, warehouse capacity
 * ================================================================== */

describe("allocateStockLot", () => {
  it("reserves a ready finished-goods lot of the right commodity and stamps the date", async () => {
    // sl-2 is sesame white, ready as a finished good; ct-1 is a sesame white contract.
    const res = await api.allocateStockLot("sl-2", "ct-1");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.state).toBe("reserved");
      expect(res.value.allocatedContractId).toBe("ct-1");
      expect(res.value.allocatedOn).toBe(TODAY);
    }
  });

  it("refuses a lot that is still under process, naming the processing rule", async () => {
    const reason = reasonOf(await api.allocateStockLot("sl-3", "ct-1"));
    expect(reason).toContain("processing is complete");
    expect(reason).toContain("under process");
  });

  it("refuses a lot that is already reserved against a contract", async () => {
    expect(reasonOf(await api.allocateStockLot("sl-1", "ct-1"))).toContain("already reserved");
  });

  it("refuses a commodity mismatch and names both commodities", async () => {
    // sl-9 is pigeon peas and ready; ct-1 is sesame white.
    const reason = reasonOf(await api.allocateStockLot("sl-9", "ct-1"));
    expect(reason).toContain("cm-pigeon-peas");
    expect(reason).toContain("cm-sesame-white");
    expect(reason).toContain("quality grade");
  });

  it("allocates an SMA-flagged lot but leaves the flag on it, since decision D-16 is open", async () => {
    const res = await api.allocateStockLot("sl-4", "ct-1");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.smaFlagged).toBe(true);
  });

  it("refuses an unknown lot", async () => {
    expect(reasonOf(await api.allocateStockLot("sl-nope", "ct-1"))).toContain("Stock lot not found");
  });

  it("refuses an unknown contract", async () => {
    expect(reasonOf(await api.allocateStockLot("sl-2", "ct-nope"))).toContain("Contract not found");
  });
});

describe("releaseStockLot", () => {
  it("returns a reserved lot to ready as a finished good and clears the allocation", async () => {
    const res = await api.releaseStockLot("sl-1");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.state).toBe("ready_finished");
      expect(res.value.allocatedContractId).toBeUndefined();
      expect(res.value.allocatedOn).toBeUndefined();
    }
  });

  it("refuses to release a lot that was never reserved", async () => {
    expect(reasonOf(await api.releaseStockLot("sl-2"))).toContain("Only a reserved lot");
  });

  it("refuses to release a lot that is under process", async () => {
    expect(reasonOf(await api.releaseStockLot("sl-3"))).toContain("Only a reserved lot");
  });

  it("refuses an unknown lot", async () => {
    expect(reasonOf(await api.releaseStockLot("sl-nope"))).toContain("not found");
  });
});

describe("confirmLotProcessed", () => {
  it("moves an under-process lot to ready as a finished good", async () => {
    const res = await api.confirmLotProcessed("sl-3", "Selim Aziz");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.state).toBe("ready_finished");
      expect(res.value.productionDate).toBe(TODAY);
      expect(res.value.note).toContain("Selim Aziz");
    }
  });

  it("gives the lot a quality release reference if it had none", async () => {
    const res = await api.confirmLotProcessed("sl-3", "Selim Aziz");
    if (res.ok) expect(res.value.qualityReleaseRef).toBeTruthy();
    else expect.unreachable();
  });

  it("refuses a lot that is already a finished good", async () => {
    expect(reasonOf(await api.confirmLotProcessed("sl-2", "Selim Aziz"))).toContain(
      "Only a lot that is under process",
    );
  });

  it("refuses a lot that is reserved", async () => {
    expect(reasonOf(await api.confirmLotProcessed("sl-1", "Selim Aziz"))).toContain(
      "Only a lot that is under process",
    );
  });

  it("refuses an unknown lot", async () => {
    expect(reasonOf(await api.confirmLotProcessed("sl-nope", "Selim Aziz"))).toContain("not found");
  });
});

describe("confirmCargoReadiness", () => {
  it("refuses cargo readiness before the processing team has confirmed", async () => {
    const cr = (await api.listCargoReadiness())[0];
    expect(cr.processingConfirmedOn).toBeUndefined();
    const reason = reasonOf(await api.confirmCargoReadiness(cr.id, "Amara Osei", "readiness"));
    expect(reason).toContain("processing team confirms");
  });

  it("records the processing confirmation first", async () => {
    const cr = (await api.listCargoReadiness())[0];
    const res = await api.confirmCargoReadiness(cr.id, "Selim Aziz", "processing");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.processingConfirmedOn).toBe(TODAY);
      expect(res.value.processingConfirmedBy).toBe("Selim Aziz");
    }
  });

  it("accepts the readiness confirmation once processing has confirmed", async () => {
    const cr = (await api.listCargoReadiness())[0];
    await api.confirmCargoReadiness(cr.id, "Selim Aziz", "processing");
    const res = await api.confirmCargoReadiness(cr.id, "Amara Osei", "readiness");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.readinessConfirmedOn).toBe(TODAY);
      expect(res.value.readinessConfirmedBy).toBe("Amara Osei");
    }
  });

  it("refuses an unknown readiness record", async () => {
    expect(reasonOf(await api.confirmCargoReadiness("cr-nope", "Amara Osei", "processing"))).toContain(
      "not found",
    );
  });
});

describe("issueProductionPlanWeek", () => {
  it("refuses a week with no received quantity, naming the actually-received rule", async () => {
    // pp-3 has nothing confirmed at its facility.
    const reason = reasonOf(await api.issueProductionPlanWeek("pp-3"));
    expect(reason).toContain("actually received");
    expect(reason).toContain("planned-but-unreceived");
  });

  it("refuses re-issuing a week that has already been issued", async () => {
    expect(reasonOf(await api.issueProductionPlanWeek("pp-1"))).toContain("already been issued");
  });

  it("refuses an unknown week", async () => {
    expect(reasonOf(await api.issueProductionPlanWeek("pp-nope"))).toContain("not found");
  });
});

describe("advanceWarehouseRequest", () => {
  it("refuses an illegal transition per WAREHOUSE_REQUEST_TRANSITIONS", async () => {
    // wr-2 sits at quality_visit, which may only reach quality_released or rejected.
    const reason = reasonOf(await api.advanceWarehouseRequest("wr-2", "created_in_erp"));
    expect(reason).toContain("may only move to");
    expect(reason).toContain("quality_released");
  });

  it("refuses a quality release with no recommendation recorded", async () => {
    const reason = reasonOf(await api.advanceWarehouseRequest("wr-2", "quality_released"));
    expect(reason).toContain("recommendations before it releases");
  });

  it("accepts a quality release once the recommendation is given, and stamps the date", async () => {
    const res = await api.advanceWarehouseRequest("wr-2", "quality_released", {
      recommendation: "Floor sealed; racking to be replaced before second intake.",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.state).toBe("quality_released");
      expect(res.value.qualityReleasedOn).toBe(TODAY);
      expect(res.value.qualityRecommendation).toContain("Floor sealed");
    }
  });

  it("refuses creation in the ERP with no ERP reference", async () => {
    // wr-1 already sits at execution_approved.
    const reason = reasonOf(await api.advanceWarehouseRequest("wr-1", "created_in_erp"));
    expect(reason).toContain("ERP reference is required");
  });

  it("walks a request from a quality visit all the way to created in the ERP", async () => {
    const released = await api.advanceWarehouseRequest("wr-2", "quality_released", {
      recommendation: "Sound.",
    });
    expect(released.ok).toBe(true);
    const approved = await api.advanceWarehouseRequest("wr-2", "execution_approved");
    expect(approved.ok).toBe(true);
    if (approved.ok) expect(approved.value.executionApprovedOn).toBe(TODAY);
    const erp = await api.advanceWarehouseRequest("wr-2", "created_in_erp", {
      erpReference: "ERP-WH-2026-0044",
    });
    expect(erp.ok).toBe(true);
    if (erp.ok) {
      expect(erp.value.state).toBe("created_in_erp");
      expect(erp.value.erpReference).toBe("ERP-WH-2026-0044");
    }
  });

  it("treats created_in_erp as terminal", async () => {
    await api.advanceWarehouseRequest("wr-1", "created_in_erp", { erpReference: "ERP-1" });
    expect(reasonOf(await api.advanceWarehouseRequest("wr-1", "rejected"))).toContain("terminal state");
  });

  it("refuses an unknown request", async () => {
    expect(reasonOf(await api.advanceWarehouseRequest("wr-nope", "rejected"))).toContain("not found");
  });
});

/* ================================================================== *
 * Phase 07 — advance payments
 * ================================================================== */

describe("advanceAdvancePayment", () => {
  it("refuses confirming while a leg in the chain is unconfirmed, and counts them", async () => {
    // ap-2: leg 1 issued and unconfirmed, leg 2 not issued at all.
    const reason = reasonOf(await api.advanceAdvancePayment("ap-2", "confirmed"));
    expect(reason).toContain("2 of 2 legs");
    expect(reason).toContain("Invictus issues to AMROS");
  });

  it("refuses an illegal transition per ADVANCE_PAYMENT_TRANSITIONS", async () => {
    expect(reasonOf(await api.advanceAdvancePayment("ap-2", "amount_pending"))).toContain("may only move to");
  });

  it("treats not_applicable as terminal, because Chad has no advance payment step", async () => {
    const reason = reasonOf(await api.advanceAdvancePayment("ap-3", "amount_pending"));
    expect(reason).toContain("terminal state");
  });

  it("treats confirmed as terminal", async () => {
    expect(reasonOf(await api.advanceAdvancePayment("ap-1", "issued"))).toContain("terminal state");
  });

  it("refuses an unknown request", async () => {
    expect(reasonOf(await api.advanceAdvancePayment("ap-nope", "issued"))).toContain("not found");
  });

  it("confirms once every leg of the chain is confirmed", async () => {
    await api.recordAdvancePaymentLeg("ap-2", 0, { confirmed: true });
    const res = await api.recordAdvancePaymentLeg("ap-2", 1, { issued: true, confirmed: true });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.state).toBe("confirmed");
  });
});

describe("recordAdvancePaymentLeg", () => {
  it("records the confirmation of a leg that has been issued", async () => {
    const res = await api.recordAdvancePaymentLeg("ap-2", 0, { confirmed: true });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.legs[0].confirmedOn).toBe(TODAY);
  });

  it("refuses a confirmation before the payment has been issued", async () => {
    const reason = reasonOf(await api.recordAdvancePaymentLeg("ap-2", 1, { confirmed: true }));
    expect(reason).toContain("cannot be confirmed before it has been issued");
  });

  it("refuses confirming leg 2 while leg 1 is unconfirmed, naming the chain", async () => {
    const reason = reasonOf(await api.recordAdvancePaymentLeg("ap-2", 1, { issued: true, confirmed: true }));
    expect(reason).toContain("only after the preceding leg is confirmed");
    expect(reason).toContain("AMROS");
  });

  it("refuses issuing leg 2 while leg 1 is unconfirmed", async () => {
    expect(reasonOf(await api.recordAdvancePaymentLeg("ap-2", 1, { issued: true }))).toContain(
      "only after the preceding leg is confirmed",
    );
  });

  it("permits leg 2 once leg 1 is confirmed", async () => {
    await api.recordAdvancePaymentLeg("ap-2", 0, { confirmed: true });
    const res = await api.recordAdvancePaymentLeg("ap-2", 1, { issued: true, reference: "SWIFT/X" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.legs[1].issuedOn).toBe(TODAY);
      expect(res.value.legs[1].reference).toBe("SWIFT/X");
    }
  });

  it("refuses an unknown leg index", async () => {
    expect(reasonOf(await api.recordAdvancePaymentLeg("ap-2", 9, { issued: true }))).toContain(
      "Payment leg not found",
    );
  });

  it("refuses an unknown request", async () => {
    expect(reasonOf(await api.recordAdvancePaymentLeg("ap-nope", 0, { issued: true }))).toContain(
      "not found",
    );
  });
});

/* ================================================================== *
 * Phase 08 — the freight rate table
 * ================================================================== */

describe("upsertFreightRates", () => {
  const rowFrom = (base: FreightRate, over: Partial<FreightRate>): FreightRate => ({ ...base, ...over });

  it("refuses an empty basket", async () => {
    expect(reasonOf(await api.upsertFreightRates([]))).toContain("Nothing to save");
  });

  it("refuses a row that carries neither a 20-foot nor a 40-foot rate", async () => {
    const base = (await api.listFreightRates())[0];
    const reason = reasonOf(
      await api.upsertFreightRates([rowFrom(base, { rate20ft: undefined, rate40ft: undefined })]),
    );
    expect(reason).toContain("must carry a 20-foot or a 40-foot rate");
    // The lane is named, not identified: the refusal prints the port names a reader
    // recognises rather than the `pt-*` ids they would have to look up.
    expect(reason).toContain(portName(base.loadingPortId));
    expect(reason).toContain(portName(base.destinationPortId));
  });

  it("accepts a row that carries only a 40-foot rate", async () => {
    const base = (await api.listFreightRates())[0];
    const res = await api.upsertFreightRates([
      rowFrom(base, { rate20ft: undefined, rate40ft: money(3000, "USD") }),
    ]);
    expect(res.ok).toBe(true);
  });

  it("updates an existing lane in place rather than duplicating it", async () => {
    const before = await api.listFreightRates();
    const base = before[0];
    const res = await api.upsertFreightRates([rowFrom(base, { rate20ft: money(1900, "USD") })]);
    expect(res.ok).toBe(true);
    const after = await api.listFreightRates();
    expect(after).toHaveLength(before.length);
    expect(after.find((r) => r.id === base.id)!.rate20ft!.amount).toBe(1900);
  });

  it("stamps the update date on an updated lane", async () => {
    const base = (await api.listFreightRates())[0];
    await api.upsertFreightRates([rowFrom(base, { rate20ft: money(1900, "USD"), updatedOn: "2020-01-01" })]);
    const after = await api.listFreightRates();
    expect(after.find((r) => r.id === base.id)!.updatedOn).toBe(TODAY);
  });

  it("inserts a new lane rather than overwriting a neighbour", async () => {
    const before = await api.listFreightRates();
    const base = before[0];
    const res = await api.upsertFreightRates([
      rowFrom(base, { shippingLine: "Sahel Container Express", rate20ft: money(1500, "USD") }),
    ]);
    expect(res.ok).toBe(true);
    const after = await api.listFreightRates();
    expect(after).toHaveLength(before.length + 1);
    expect(after.some((r) => r.shippingLine === "Sahel Container Express")).toBe(true);
  });

  it("treats a different effective month as a different lane", async () => {
    const before = await api.listFreightRates();
    await api.upsertFreightRates([rowFrom(before[0], { effectiveMonth: "2026-09" })]);
    expect(await api.listFreightRates()).toHaveLength(before.length + 1);
  });

  it("saves several rows in one call, which the single-option legacy form cannot", async () => {
    const before = await api.listFreightRates();
    const base = before[0];
    const res = await api.upsertFreightRates([
      rowFrom(base, { shippingLine: "Line A" }),
      rowFrom(base, { shippingLine: "Line B" }),
    ]);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toHaveLength(2);
    expect(await api.listFreightRates()).toHaveLength(before.length + 2);
  });

  it("saves nothing at all when any row in the basket is invalid", async () => {
    const before = await api.listFreightRates();
    const base = before[0];
    await api.upsertFreightRates([
      rowFrom(base, { shippingLine: "Line A" }),
      rowFrom(base, { shippingLine: "Line B", rate20ft: undefined, rate40ft: undefined }),
    ]);
    expect(await api.listFreightRates()).toHaveLength(before.length);
  });
});

/* ================================================================== *
 * Phase 10 — movement and the stuffing request
 * ================================================================== */

const truckTrip = (over: Partial<MovementTrip> = {}): MovementTrip => ({
  tripNo: "1",
  date: TODAY,
  plateNo: "KRT 9001",
  waybillNo: "WB-99001",
  loadedMt: 50,
  ...over,
});

describe("advanceMovementLeg", () => {
  it("moves a planned truck leg to loading", async () => {
    const res = await api.advanceMovementLeg("ml-5", "loading");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.state).toBe("loading");
      expect(res.value.startDate).toBe(TODAY);
    }
  });

  it("refuses an illegal transition per MOVEMENT_LEG_TRANSITIONS", async () => {
    expect(reasonOf(await api.advanceMovementLeg("ml-5", "arrived"))).toContain("may only move to");
  });

  it("refuses arrival while no trip has a received figure", async () => {
    await api.advanceMovementLeg("ml-5", "loading");
    await api.advanceMovementLeg("ml-5", "in_transit");
    const reason = reasonOf(await api.advanceMovementLeg("ml-5", "arrived"));
    expect(reason).toContain("No trip has a received quantity");
  });

  it("records arrival once a trip has been received, and stamps the arrival date", async () => {
    await api.advanceMovementLeg("ml-5", "loading");
    await api.addMovementTrip("ml-5", truckTrip());
    await api.advanceMovementLeg("ml-5", "in_transit");
    await api.recordTripReceipt("ml-5", "1", 49.4);
    const res = await api.advanceMovementLeg("ml-5", "arrived");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.arrivalDate).toBe(TODAY);
  });

  it("treats closed as terminal", async () => {
    expect(reasonOf(await api.advanceMovementLeg("ml-1", "arrived"))).toContain("terminal state");
  });

  it("refuses an unknown leg", async () => {
    expect(reasonOf(await api.advanceMovementLeg("ml-nope", "loading"))).toContain("not found");
  });
});

describe("addMovementTrip", () => {
  it("adds a truck trip with its plate and waybill", async () => {
    const res = await api.addMovementTrip("ml-5", truckTrip());
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.trips).toHaveLength(1);
  });

  it("refuses a duplicate trip number on the same leg", async () => {
    await api.addMovementTrip("ml-5", truckTrip());
    const reason = reasonOf(await api.addMovementTrip("ml-5", truckTrip({ plateNo: "KRT 9002" })));
    expect(reason).toContain("already recorded on this leg");
    expect(reason).toContain('"1"');
  });

  it("refuses a truck or rail trip with no plate number", async () => {
    const reason = reasonOf(await api.addMovementTrip("ml-5", truckTrip({ plateNo: undefined })));
    expect(reason).toContain("plate number is required");
  });

  it("accepts a bulk day with no plate number, since bulk is tracked as a daily operation", async () => {
    const res = await api.addMovementTrip(
      "ml-4",
      truckTrip({ tripNo: "D5", plateNo: undefined, loadedMt: 380 }),
    );
    expect(res.ok).toBe(true);
  });

  it("refuses a trip with no quantity loaded", async () => {
    expect(reasonOf(await api.addMovementTrip("ml-5", truckTrip({ loadedMt: 0 })))).toContain(
      "must record the quantity loaded",
    );
  });

  it("refuses adding a trip to a closed leg", async () => {
    expect(reasonOf(await api.addMovementTrip("ml-1", truckTrip({ tripNo: "9" })))).toContain(
      "This leg is closed",
    );
  });

  it("refuses an unknown leg", async () => {
    expect(reasonOf(await api.addMovementTrip("ml-nope", truckTrip()))).toContain("not found");
  });
});

describe("recordTripReceipt", () => {
  it("records the quantity received against a trip", async () => {
    const res = await api.recordTripReceipt("ml-2", "3", 47.5);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.trips.find((t) => t.tripNo === "3")!.receivedMt).toBe(47.5);
  });

  it("accepts a received quantity of zero, which is not the same as unreceived", async () => {
    const res = await api.recordTripReceipt("ml-2", "3", 0);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.trips.find((t) => t.tripNo === "3")!.receivedMt).toBe(0);
  });

  it("refuses a negative received quantity", async () => {
    expect(reasonOf(await api.recordTripReceipt("ml-2", "3", -1))).toContain("cannot be negative");
  });

  it("refuses an unknown trip number", async () => {
    expect(reasonOf(await api.recordTripReceipt("ml-2", "99", 10))).toContain("Trip not found");
  });

  it("refuses an unknown leg", async () => {
    expect(reasonOf(await api.recordTripReceipt("ml-nope", "1", 10))).toContain("not found");
  });
});

describe("raiseStuffingRequest", () => {
  it("refuses while the movement leg has not arrived, naming the movement", async () => {
    // sq-3 is on sh-8, whose leg ml-5 is still planned.
    const reason = reasonOf(await api.raiseStuffingRequest("sq-3", "Amara Osei"));
    expect(reason).toContain("Cargo is moved before the start of the stuffing operation");
    expect(reason).toContain("MOV-2026-047");
  });

  it("raises the request once the movement has arrived", async () => {
    await api.advanceMovementLeg("ml-5", "loading");
    await api.addMovementTrip("ml-5", truckTrip());
    await api.advanceMovementLeg("ml-5", "in_transit");
    await api.recordTripReceipt("ml-5", "1", 49.4);
    await api.advanceMovementLeg("ml-5", "arrived");
    const res = await api.raiseStuffingRequest("sq-3", "Amara Osei");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.raisedOn).toBe(TODAY);
      expect(res.value.raisedBy).toBe("Amara Osei");
    }
  });

  it("refuses a second raise of the same request", async () => {
    expect(reasonOf(await api.raiseStuffingRequest("sq-1", "Amara Osei"))).toContain("already been raised");
  });

  it("refuses an unknown request", async () => {
    expect(reasonOf(await api.raiseStuffingRequest("sq-nope", "Amara Osei"))).toContain("not found");
  });
});

describe("acknowledgeStuffingRequest", () => {
  it("records an acknowledgement from one of the five notified functions", async () => {
    const res = await api.acknowledgeStuffingRequest("sq-2", "clearance", "Clearance Douala");
    expect(res.ok).toBe(true);
    if (res.ok) {
      const row = res.value.notifications.find((n) => n.fn === "clearance")!;
      expect(row.acknowledgedOn).toBe(TODAY);
      expect(row.acknowledgedBy).toBe("Clearance Douala");
    }
  });

  it("refuses an acknowledgement before the request has been raised", async () => {
    const reason = reasonOf(await api.acknowledgeStuffingRequest("sq-3", "quality", "Nadia Kimani"));
    expect(reason).toContain("has not been raised");
  });

  it("refuses a function that is not one of the five", async () => {
    const reason = reasonOf(
      await api.acknowledgeStuffingRequest("sq-2", "compliance" as StuffingNotifyFunction, "Compliance desk"),
    );
    expect(reason).toContain("not one of the five notified functions");
  });

  it("refuses an unknown request", async () => {
    expect(reasonOf(await api.acknowledgeStuffingRequest("sq-nope", "quality", "X"))).toContain("not found");
  });
});

/* ================================================================== *
 * Phase 11 — the container inspection protocol
 * ================================================================== */

describe("recordContainerProtocol", () => {
  const checks = [
    { key: "clean_dry", label: "Clean and dry", result: "pass" as const },
    { key: "no_odour", label: "Free of odour", result: "fail" as const, note: "Diesel smell." },
  ];

  it("records the protocol against the container and stamps the inspection date", async () => {
    const res = await api.recordContainerProtocol("sh-1", "ASLU2210441", checks, "Sea-Cert Surveyors");
    expect(res.ok).toBe(true);
    if (res.ok) {
      const unit = res.value.stuffing.containers.find((c) => c.containerNo === "ASLU2210441")!;
      expect(unit.protocol!.checks).toHaveLength(2);
      expect(unit.protocol!.inspectedOn).toBe(TODAY);
      expect(unit.protocol!.inspectedBy).toBe("Sea-Cert Surveyors");
      expect(unit.inspectedOn).toBeTruthy();
    }
  });

  it("appends an audit event naming the failed checks", async () => {
    const before = (await api.getShipment("sh-1"))!.audit.length;
    const res = await api.recordContainerProtocol("sh-1", "ASLU2210441", checks, "Sea-Cert Surveyors");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.audit.length).toBe(before + 1);
      const last = res.value.audit.at(-1)!;
      expect(last.action).toContain("Container inspection protocol");
      expect(last.note).toContain("1 failed check");
    }
  });

  it("refuses a container that is not on the shipment", async () => {
    const reason = reasonOf(await api.recordContainerProtocol("sh-1", "NOPE0000001", checks, "X"));
    expect(reason).toContain("NOPE0000001");
    expect(reason).toContain("not on this shipment");
  });

  it("refuses a protocol with no checks at all", async () => {
    expect(reasonOf(await api.recordContainerProtocol("sh-1", "ASLU2210441", [], "X"))).toContain(
      "at least one check",
    );
  });

  it("refuses an unknown shipment", async () => {
    expect(reasonOf(await api.recordContainerProtocol("sh-nope", "ASLU2210441", checks, "X"))).toContain(
      "not found",
    );
  });
});

/* ================================================================== *
 * Phase 16 — close-out
 * ================================================================== */

describe("logCustomerFeedback", () => {
  it("logs feedback against a contract and stamps the date", async () => {
    const res = await api.logCustomerFeedback({
      contractId: "ct-1",
      loggedBy: "Tomás Ferreira",
      outcome: "satisfied",
      detail: "Buyer confirmed the cargo met specification.",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.loggedOn).toBe(TODAY);
      expect(res.value.outcome).toBe("satisfied");
    }
  });

  it("adds the row to the collection", async () => {
    const before = (await api.listCustomerFeedback()).length;
    await api.logCustomerFeedback({
      contractId: "ct-1",
      loggedBy: "Tomás Ferreira",
      outcome: "complaint_commodity",
      detail: "Colour grade queried on lot 2.",
    });
    expect(await api.listCustomerFeedback()).toHaveLength(before + 1);
  });

  it("refuses an unknown contract", async () => {
    const reason = reasonOf(
      await api.logCustomerFeedback({
        contractId: "ct-nope",
        loggedBy: "X",
        outcome: "satisfied",
        detail: "Fine.",
      }),
    );
    expect(reason).toContain("Contract not found");
  });

  it("refuses feedback that says nothing", async () => {
    const reason = reasonOf(
      await api.logCustomerFeedback({
        contractId: "ct-1",
        loggedBy: "X",
        outcome: "satisfied",
        detail: "   ",
      }),
    );
    expect(reason).toContain("must say what the customer said");
  });
});

describe("decideBuyerClaim", () => {
  it("approves a raised claim with its approved amount", async () => {
    const res = await api.decideBuyerClaim("bc-2", "approved", {
      approvedAmount: money(3000, "USD"),
      note: "Settled against the freight invoice.",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.state).toBe("approved");
      expect(res.value.approvedAmount).toEqual(money(3000, "USD"));
      expect(res.value.decidedOn).toBe(TODAY);
    }
  });

  it("rejects a raised claim without needing an amount", async () => {
    const res = await api.decideBuyerClaim("bc-2", "rejected");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.state).toBe("rejected");
  });

  it("refuses an approval with no amount, since the amount is what the system records", async () => {
    const reason = reasonOf(await api.decideBuyerClaim("bc-2", "approved"));
    expect(reason).toContain("records the amount approved");
  });

  it("refuses deciding a claim twice", async () => {
    // bc-1 is already approved, and approved is terminal.
    expect(reasonOf(await api.decideBuyerClaim("bc-1", "rejected"))).toContain("terminal state");
  });

  it("refuses deciding the same claim twice in one session", async () => {
    await api.decideBuyerClaim("bc-2", "rejected");
    expect(
      reasonOf(await api.decideBuyerClaim("bc-2", "approved", { approvedAmount: money(1, "USD") })),
    ).toContain("terminal state");
  });

  it("refuses an unknown claim", async () => {
    expect(reasonOf(await api.decideBuyerClaim("bc-nope", "rejected"))).toContain("Claim not found");
  });
});

describe("advanceInsuranceIncident", () => {
  it("refuses finalising an incident with no compensation status", async () => {
    // ii-2 sits at claim_built.
    const reason = reasonOf(await api.advanceInsuranceIncident("ii-2", "finalised"));
    expect(reason).toContain("compensation status");
  });

  it("finalises the incident once the compensation status is given", async () => {
    const res = await api.advanceInsuranceIncident("ii-2", "finalised", {
      compensationStatus: "Settled at 80%, 20 Aug 2026",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.state).toBe("finalised");
      expect(res.value.compensationStatus).toContain("80%");
    }
  });

  it("would refuse building a claim with no amount — the guard cannot be reached from the seed", async () => {
    // The claim-amount guard fires on reported → claim_built, and no seeded incident sits in
    // `reported`: ii-1 is finalised and ii-2 is already claim_built with its amount. No mutator
    // creates an incident, so the branch is unreachable through the API. What is asserted here
    // is that the transition the guard sits on is the declared one, and that both incidents are
    // past it — so a future `reported` incident would meet the guard rather than bypass it.
    expect(INSURANCE_INCIDENT_TRANSITIONS.reported).toEqual(["claim_built"]);
    const incidents = await api.listInsuranceIncidents();
    expect(incidents.some((i) => i.state === "reported")).toBe(false);
    for (const i of incidents) expect(i.claimAmount).toBeTruthy();
  });

  it("refuses an illegal transition per INSURANCE_INCIDENT_TRANSITIONS", async () => {
    expect(reasonOf(await api.advanceInsuranceIncident("ii-2", "reported"))).toContain("may only move to");
  });

  it("treats finalised as terminal", async () => {
    expect(reasonOf(await api.advanceInsuranceIncident("ii-1", "claim_built"))).toContain("terminal state");
  });

  it("refuses an unknown incident", async () => {
    expect(reasonOf(await api.advanceInsuranceIncident("ii-nope", "finalised"))).toContain(
      "Incident not found",
    );
  });
});

/* ================================================================== *
 * Sourcing intake — receiving locations
 * ================================================================== */

describe("addReceivingLocationPlans", () => {
  const row = (
    over: Partial<{
      facility: string;
      quantityMt: number;
      assignedTo: string;
      locationKind: "facility" | "warehouse";
      country: "SD" | "ET" | "TD" | "TZ" | "MZ";
    }> = {},
  ) => ({
    facility: "FC31 - Mahaseelna",
    quantityMt: 100,
    assignedTo: "s.aziz",
    ...over,
  });

  it("adds a plan row against the agreement", async () => {
    const before = (await api.listReceivingLocationPlans()).length;
    const res = await api.addReceivingLocationPlans("pa-4", [row()]);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.plans).toHaveLength(1);
    expect(await api.listReceivingLocationPlans()).toHaveLength(before + 1);
  });

  it("returns no warning where the basket fits inside the agreement", async () => {
    const res = await api.addReceivingLocationPlans("pa-4", [row()]);
    if (res.ok) expect(res.value.warning).toBeUndefined();
    else expect.unreachable();
  });

  it("refuses an empty basket", async () => {
    expect(reasonOf(await api.addReceivingLocationPlans("pa-4", []))).toContain("at least one plan row");
  });

  it("refuses a row with no quantity, naming the blank legacy rows", async () => {
    const reason = reasonOf(await api.addReceivingLocationPlans("pa-4", [row({ quantityMt: 0 })]));
    expect(reason).toContain("Every plan row needs a quantity");
    expect(reason).toContain("blank");
  });

  it("refuses a negative quantity", async () => {
    expect(reasonOf(await api.addReceivingLocationPlans("pa-4", [row({ quantityMt: -5 })]))).toContain(
      "Every plan row needs a quantity",
    );
  });

  /* The message says "receiving location" rather than "facility" as of 3 September 2026:
     a plan line now names a warehouse or a facility, chosen from the receiving-location
     master, so "facility" would name only half of what the field accepts. */
  it("refuses a row with no receiving location", async () => {
    expect(reasonOf(await api.addReceivingLocationPlans("pa-4", [row({ facility: "" })]))).toContain(
      "needs a receiving location",
    );
  });

  /* The two master checks the same instruction adds. Neither existed before it, because
     before it any string was an acceptable location. */
  it("refuses a location whose kind contradicts the master", async () => {
    expect(
      reasonOf(
        await api.addReceivingLocationPlans("pa-4", [
          row({ facility: "WH22 - Khartoum2", locationKind: "facility" }),
        ]),
      ),
    ).toContain("is a warehouse in the receiving-location master");
  });

  it("refuses a location held under another country", async () => {
    expect(
      reasonOf(
        await api.addReceivingLocationPlans("pa-4", [
          row({ facility: "FC31 - Mahaseelna", locationKind: "facility", country: "ET" }),
        ]),
      ),
    ).toContain("is held under SD in the receiving-location master");
  });

  it("classifies a saved row's location kind from the master when the caller does not say", async () => {
    const res = await api.addReceivingLocationPlans("pa-4", [
      row({ facility: "WH22 - Khartoum2" }),
      row({ facility: "FC31 - Mahaseelna" }),
    ]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.plans.map((p) => p.locationKind)).toEqual(["warehouse", "facility"]);
    expect(res.value.plans.map((p) => p.country)).toEqual(["SD", "SD"]);
  });

  it("refuses a row with no assignee", async () => {
    expect(reasonOf(await api.addReceivingLocationPlans("pa-4", [row({ assignedTo: "" })]))).toContain(
      "needs an assignee",
    );
  });

  it("refuses an unknown agreement", async () => {
    expect(reasonOf(await api.addReceivingLocationPlans("pa-nope", [row()]))).toContain("not found");
  });

  it("succeeds on an over-allocating basket, because no source says over-allocation is blocked", async () => {
    // pa-3 already holds 25,700 MT against a 17,777 MT agreement.
    const res = await api.addReceivingLocationPlans("pa-3", [row({ quantityMt: 100 })]);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.plans).toHaveLength(1);
  });

  it("returns a warning naming the excess on an over-allocating basket", async () => {
    const res = await api.addReceivingLocationPlans("pa-3", [row({ quantityMt: 100 })]);
    if (res.ok) {
      expect(res.value.warning).toContain("8023.000");
      expect(res.value.warning).toContain("legacy form has no such check");
    } else expect.unreachable();
  });

  it("saves nothing when any row in the basket is invalid", async () => {
    const before = (await api.listReceivingLocationPlans()).length;
    await api.addReceivingLocationPlans("pa-4", [row(), row({ quantityMt: 0 })]);
    expect(await api.listReceivingLocationPlans()).toHaveLength(before);
  });
});

describe("updateReceivingLocationPlan", () => {
  it("accepts a quantity change, which the legacy edit form omits entirely", async () => {
    // rl-7 is the captured row saved with no quantity; MMP's edit form has no Quantity field.
    const res = await api.updateReceivingLocationPlan("rl-7", { quantityMt: 2077 });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.quantityMt).toBe(2077);
  });

  it("accepts a facility and assignee change", async () => {
    const res = await api.updateReceivingLocationPlan("rl-7", {
      facility: "FC22 - HMA",
      assignedTo: "a.osei",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.facility).toBe("FC22 - HMA");
      expect(res.value.assignedTo).toBe("a.osei");
    }
  });

  it("refuses a quantity of zero", async () => {
    expect(reasonOf(await api.updateReceivingLocationPlan("rl-7", { quantityMt: 0 }))).toContain(
      "greater than zero",
    );
  });

  it("refuses a negative quantity", async () => {
    expect(reasonOf(await api.updateReceivingLocationPlan("rl-7", { quantityMt: -1 }))).toContain(
      "greater than zero",
    );
  });

  it("refuses an unknown plan", async () => {
    expect(reasonOf(await api.updateReceivingLocationPlan("rl-nope", { quantityMt: 1 }))).toContain(
      "not found",
    );
  });
});

/* ================================================================== *
 * Sourcing intake — receipts and pricing
 * ================================================================== */

describe("createIntakeReceipt", () => {
  const draft = (over: Record<string, unknown> = {}) => ({
    kind: "facility" as const,
    purchaseAgreementId: "pa-1",
    location: "FC31 - Mahaseelna",
    receiptDate: TODAY,
    receiptFrom: "supplier" as const,
    plateNo: "KRT 5150",
    bags: { bpBags: 10, spBags: 10, juteBags: 10 },
    grossWeightWithDirtMt: 120,
    ...over,
  });

  it("creates a receipt against a facility allocated on the agreement", async () => {
    const res = await api.createIntakeReceipt(draft());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.id).toBeTruthy();
      expect(res.value.referenceNo).toBeTruthy();
      expect(res.value.pricing).toBeUndefined();
    }
  });

  it("adds the receipt to the collection", async () => {
    const before = (await api.listIntakeReceipts()).length;
    await api.createIntakeReceipt(draft());
    expect(await api.listIntakeReceipts()).toHaveLength(before + 1);
  });

  it("refuses a facility that is not a receiving location on the agreement", async () => {
    // pa-4 has no receiving location allocated at all.
    const reason = reasonOf(await api.createIntakeReceipt(draft({ purchaseAgreementId: "pa-4" })));
    expect(reason).toContain("not a receiving location");
    expect(reason).toContain("1204_226610033");
  });

  it("refuses a zero gross weight, naming the legacy form's two required fields", async () => {
    const reason = reasonOf(await api.createIntakeReceipt(draft({ grossWeightWithDirtMt: 0 })));
    expect(reason).toContain("weighbridge gross weight");
    expect(reason).toContain("location and the date");
  });

  it("refuses a receipt with no location at all", async () => {
    expect(reasonOf(await api.createIntakeReceipt(draft({ location: "" })))).toContain(
      "facility or warehouse is required",
    );
  });

  it("refuses an unknown agreement", async () => {
    expect(reasonOf(await api.createIntakeReceipt(draft({ purchaseAgreementId: "pa-nope" })))).toContain(
      "not found",
    );
  });

  it("does not apply the receiving-location check to a warehouse receipt", async () => {
    const res = await api.createIntakeReceipt(
      draft({ kind: "warehouse", location: "WH99 - Port Sudan", receiptFrom: "warehouse" }),
    );
    expect(res.ok).toBe(true);
  });
});

describe("priceIntakeReceipt", () => {
  const pricing = (over: Partial<IntakeReceiptPricing> = {}): IntakeReceiptPricing => ({
    pricePerLb: money(11.4, "SDG"),
    dirtPerTon: 10,
    agentNetWeightMt: 118,
    agentCommissionPerMt: money(160, "SDG"),
    status: "need_review",
    ...over,
  });

  it("prices an unpriced facility receipt and stamps the pricing date", async () => {
    const res = await api.priceIntakeReceipt("ir-3", pricing());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.pricing!.pricedOn).toBe(TODAY);
      expect(res.value.pricing!.status).toBe("need_review");
    }
  });

  it("prices a warehouse receipt, which the legacy system cannot do at all", async () => {
    const res = await api.priceIntakeReceipt("ir-5", pricing());
    expect(res.ok).toBe(true);
  });

  it("refuses a price per pound of zero", async () => {
    const reason = reasonOf(await api.priceIntakeReceipt("ir-3", pricing({ pricePerLb: money(0, "SDG") })));
    expect(reason).toContain("price per pound is required");
  });

  it("refuses a negative price per pound", async () => {
    expect(
      reasonOf(await api.priceIntakeReceipt("ir-3", pricing({ pricePerLb: money(-1, "SDG") }))),
    ).toContain("price per pound is required");
  });

  it("refuses a negative agent net weight", async () => {
    expect(reasonOf(await api.priceIntakeReceipt("ir-3", pricing({ agentNetWeightMt: -1 })))).toContain(
      "cannot be negative",
    );
  });

  it("refuses an unknown receipt", async () => {
    expect(reasonOf(await api.priceIntakeReceipt("ir-nope", pricing()))).toContain("Receipt not found");
  });

  it("re-prices a confirmed receipt back to need_review, since MMP states no ordering", async () => {
    const res = await api.priceIntakeReceipt("ir-1", pricing({ status: "need_review" }));
    expect(res.ok).toBe(true);
  });
});

describe("setIntakeReceiptStatus", () => {
  it("confirms a priced receipt, which is what lets it count towards the production plan", async () => {
    const res = await api.setIntakeReceiptStatus("ir-2", "confirmed");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.pricing!.status).toBe("confirmed");
  });

  it("returns a confirmed receipt to review, since the source states no ordering", async () => {
    const res = await api.setIntakeReceiptStatus("ir-1", "need_review");
    expect(res.ok).toBe(true);
  });

  it("refuses setting a status on an unpriced receipt", async () => {
    const reason = reasonOf(await api.setIntakeReceiptStatus("ir-3", "confirmed"));
    expect(reason).toContain("priced before it is confirmed");
  });

  it("refuses setting the status a receipt already holds", async () => {
    expect(reasonOf(await api.setIntakeReceiptStatus("ir-1", "confirmed"))).toContain(
      "already in that state",
    );
  });

  it("refuses an unknown receipt", async () => {
    expect(reasonOf(await api.setIntakeReceiptStatus("ir-nope", "confirmed"))).toContain("Receipt not found");
  });
});

/* ================================================================== *
 * Sourcing intake — agent balances
 * ================================================================== */

describe("moveAgentBalance", () => {
  const transfer = (over: Record<string, unknown> = {}) => ({
    kind: "transfer" as const,
    supplierId: "cp-sup-gabani",
    seasonality: "2025-2026",
    amount: money(500000, "SDG"),
    toSupplierId: "cp-sup-abakar",
    reference: "TRF-TEST-1",
    ...over,
  });

  it("moves the amount off one balance and onto the other", async () => {
    const res = await api.moveAgentBalance(transfer());
    expect(res.ok).toBe(true);
    const after = await api.listAgentBalances();
    expect(after.find((b) => b.supplierId === "cp-sup-gabani")!.actualBalance.amount).toBe(13147000);
    expect(after.find((b) => b.supplierId === "cp-sup-abakar")!.actualBalance.amount).toBe(11400000);
  });

  it("records the movement with its date", async () => {
    const before = (await api.listAgentBalanceMovements()).length;
    const res = await api.moveAgentBalance(transfer());
    if (res.ok) expect(res.value.movedOn).toBe(TODAY);
    else expect.unreachable();
    expect(await api.listAgentBalanceMovements()).toHaveLength(before + 1);
  });

  it("leaves the estimated balance untouched, since MMP states no derivation for it", async () => {
    const before = (await api.listAgentBalances()).find((b) => b.supplierId === "cp-sup-gabani")!;
    await api.moveAgentBalance(transfer());
    const after = (await api.listAgentBalances()).find((b) => b.supplierId === "cp-sup-gabani")!;
    expect(after.estimatedBalance).toEqual(before.estimatedBalance);
  });

  it("debits only the source balance on a refund", async () => {
    const res = await api.moveAgentBalance({
      kind: "refund",
      supplierId: "cp-sup-abakar",
      seasonality: "2025-2026",
      amount: money(900000, "SDG"),
      reference: "RFD-TEST-1",
    });
    expect(res.ok).toBe(true);
    const after = await api.listAgentBalances();
    expect(after.find((b) => b.supplierId === "cp-sup-abakar")!.actualBalance.amount).toBe(10000000);
    expect(after.find((b) => b.supplierId === "cp-sup-gabani")!.actualBalance.amount).toBe(13647000);
  });

  it("refuses more than the available balance, quoting what is available", async () => {
    const reason = reasonOf(await api.moveAgentBalance(transfer({ amount: money(20000000, "SDG") })));
    expect(reason).toContain("is available on this balance");
    expect(reason).toContain("13,647,000");
  });

  it("refuses a zero amount", async () => {
    expect(reasonOf(await api.moveAgentBalance(transfer({ amount: money(0, "SDG") })))).toContain(
      "greater than zero",
    );
  });

  it("refuses a transfer with no receiving agent", async () => {
    expect(reasonOf(await api.moveAgentBalance(transfer({ toSupplierId: undefined })))).toContain(
      "transfer needs a receiving agent",
    );
  });

  it("refuses a transfer to the same agent", async () => {
    expect(reasonOf(await api.moveAgentBalance(transfer({ toSupplierId: "cp-sup-gabani" })))).toContain(
      "cannot be transferred to the same agent",
    );
  });

  it("refuses a transfer to an agent with no balance in that season", async () => {
    const reason = reasonOf(await api.moveAgentBalance(transfer({ toSupplierId: "cp-sup-mahaseel" })));
    expect(reason).toContain("receiving agent has no balance for that season");
  });

  it("refuses a movement on an agent and season with no balance", async () => {
    expect(reasonOf(await api.moveAgentBalance(transfer({ seasonality: "1999-2000" })))).toContain(
      "No balance exists",
    );
  });

  it("leaves both balances untouched when the transfer is refused", async () => {
    await api.moveAgentBalance(transfer({ amount: money(20000000, "SDG") }));
    const after = await api.listAgentBalances();
    expect(after.find((b) => b.supplierId === "cp-sup-gabani")!.actualBalance.amount).toBe(13647000);
    expect(after.find((b) => b.supplierId === "cp-sup-abakar")!.actualBalance.amount).toBe(10900000);
  });
});

/* ================================================================== *
 * Every reader hands back a deep copy
 *
 * A reader that returns the live array lets a page corrupt the store by sorting a
 * column. Each of these mutates what came back and proves the store did not move.
 * ================================================================== */

describe("readers return a deep copy", () => {
  it("survives a caller emptying the stock lot array", async () => {
    const lots = await api.listStockLots();
    const count = lots.length;
    lots.length = 0;
    expect(await api.listStockLots()).toHaveLength(count);
  });

  it("survives a caller mutating a stock lot's own fields", async () => {
    const lots = await api.listStockLots();
    lots[0].quantityMt = -1;
    lots[0].state = "reserved";
    const after = await api.listStockLots();
    expect(after[0].quantityMt).not.toBe(-1);
  });

  it("survives a caller emptying the opportunity array", async () => {
    const ops = await api.listOpportunities();
    const count = ops.length;
    ops.splice(0, ops.length);
    expect(await api.listOpportunities()).toHaveLength(count);
  });

  it("survives a caller mutating a nested costing line on an opportunity", async () => {
    const ops = await api.listOpportunities();
    const op = ops.find((o) => o.id === "op-1")!;
    const lineCount = op.costing!.lines.length;
    op.costing!.lines.length = 0;
    op.costing!.locked = false;
    const after = await api.getOpportunity("op-1");
    expect(after!.costing!.lines).toHaveLength(lineCount);
    expect(after!.costing!.locked).toBe(true);
  });

  it("survives a caller emptying the intake receipt array", async () => {
    const receipts = await api.listIntakeReceipts();
    const count = receipts.length;
    receipts.length = 0;
    expect(await api.listIntakeReceipts()).toHaveLength(count);
  });

  it("survives a caller mutating a receipt's bag counts", async () => {
    const receipts = await api.listIntakeReceipts();
    const target = receipts.find((r) => r.id === "ir-5")!;
    target.bags.juteBags = 0;
    const after = await api.getIntakeReceipt("ir-5");
    expect(after!.bags.juteBags).toBe(123);
  });

  it("survives a caller emptying the freight rate array", async () => {
    const rates = await api.listFreightRates();
    const count = rates.length;
    rates.length = 0;
    expect(await api.listFreightRates()).toHaveLength(count);
  });

  it("survives a caller mutating a movement leg's trips", async () => {
    const legs = await api.listMovementLegs();
    const target = legs.find((l) => l.id === "ml-1")!;
    const tripCount = target.trips.length;
    target.trips.length = 0;
    const after = await api.getMovementLeg("ml-1");
    expect(after!.trips).toHaveLength(tripCount);
  });

  it("survives a caller mutating an agent balance", async () => {
    const balances = await api.listAgentBalances();
    balances[0].actualBalance.amount = 0;
    expect((await api.listAgentBalances())[0].actualBalance.amount).not.toBe(0);
  });

  it("survives a caller mutating a warehouse request", async () => {
    const requests = await api.listWarehouseRequests();
    requests[0].state = "rejected";
    expect((await api.listWarehouseRequests())[0].state).not.toBe("rejected");
  });

  it("survives a caller mutating an advance payment's legs", async () => {
    const payments = await api.listAdvancePayments();
    const ap = payments.find((p) => p.id === "ap-1")!;
    ap.legs.length = 0;
    const after = await api.getAdvancePayment("ap-1");
    expect(after!.legs).toHaveLength(2);
  });
});
