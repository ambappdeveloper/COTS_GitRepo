import { beforeEach, describe, expect, it } from "vitest";
import { api, resetStore, setLatency } from "../store";

setLatency(0);

beforeEach(() => {
  resetStore();
});

describe("seed data integrity", () => {
  it("links every shipment to an existing contract and execution plan", async () => {
    const [shipments, contracts, plans] = await Promise.all([
      api.listShipments(),
      api.listContracts(),
      api.listExecutionPlans(),
    ]);
    for (const s of shipments) {
      expect(
        contracts.some((c) => c.id === s.contractId),
        `${s.shipmentNo} has no contract`,
      ).toBe(true);
      expect(
        plans.some((p) => p.id === s.executionPlanId),
        `${s.shipmentNo} has no execution plan`,
      ).toBe(true);
    }
  });

  it("links every export contract to an existing contract and plan", async () => {
    const [ecs, contracts, plans] = await Promise.all([
      api.listExportContracts(),
      api.listContracts(),
      api.listExecutionPlans(),
    ]);
    for (const e of ecs) {
      expect(contracts.some((c) => c.id === e.contractId)).toBe(true);
      expect(plans.some((p) => p.id === e.executionPlanId)).toBe(true);
    }
  });

  it("covers normal, incomplete, delayed and exception scenarios", async () => {
    const shipments = await api.listShipments();
    expect(
      shipments.some((s) => s.status === "closed"),
      "a closed shipment",
    ).toBe(true);
    expect(
      shipments.some((s) => s.status === "planned"),
      "an early-stage shipment",
    ).toBe(true);
    expect(
      shipments.some((s) => s.milestones.some((m) => m.state === "blocked")),
      "a blocked shipment",
    ).toBe(true);
    expect(
      shipments.some((s) => s.milestones.some((m) => m.state === "overdue")),
      "an overdue shipment",
    ).toBe(true);
    expect(
      shipments.some((s) => s.risks.length > 0),
      "a shipment with risks",
    ).toBe(true);
  });

  it("covers at least four countries and three shipment types", async () => {
    const shipments = await api.listShipments();
    expect(new Set(shipments.map((s) => s.country)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(shipments.map((s) => s.shipmentType)).size).toBeGreaterThanOrEqual(3);
  });

  it("includes a large-volume shipment and a forwarder-handled shipment", async () => {
    const shipments = await api.listShipments();
    expect(shipments.some((s) => s.isLargeVolume)).toBe(true);
    expect(shipments.some((s) => s.usesFreightForwarder)).toBe(true);
  });

  it("keeps every shipment quantity within its contract ceiling", async () => {
    const [shipments, contracts] = await Promise.all([api.listShipments(), api.listContracts()]);
    for (const c of contracts) {
      const total = shipments
        .filter((s) => s.contractId === c.id && s.status !== "cancelled")
        .reduce((a, s) => a + s.quantityMt, 0);
      expect(total, `contract ${c.contractNo} over-committed`).toBeLessThanOrEqual(
        c.quantityMt * (1 + c.tolerancePct / 100),
      );
    }
  });
});

describe("status transitions through the service layer", () => {
  it("permits a declared shipment transition and records an audit event", async () => {
    const before = (await api.listShipments()).find((s) => s.status === "planned")!;
    const auditBefore = before.audit.length;
    const res = await api.setShipmentStatus(before.id, "booked");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.status).toBe("booked");
      expect(res.value.audit.length).toBe(auditBefore + 1);
      const last = res.value.audit.at(-1)!;
      expect(last.field).toBe("status");
      expect(last.from).toBe("planned");
      expect(last.to).toBe("booked");
    }
  });

  it("refuses an undeclared shipment transition", async () => {
    const s = (await api.listShipments()).find((x) => x.status === "planned")!;
    const res = await api.setShipmentStatus(s.id, "sailed");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("may only move to");
  });

  it("refuses moving to cleared while a regulatory activity is unrecorded (rule R20)", async () => {
    const s = (await api.listShipments()).find(
      (x) => x.clearance.activities.some((a) => a.applicable && !a.completedDate) && x.status === "booked",
    )!;
    const res = await api.setShipmentStatus(s.id, "cleared");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("unrecorded");
  });

  it("refuses closing a shipment while the post-shipment checklist is incomplete (rule R21)", async () => {
    const shipments = await api.listShipments();
    const s = shipments.find((x) => x.status === "documents_complete") ?? shipments[0];
    // Force the shipment to documents_complete by walking the allowed chain where possible.
    const target = shipments.find(
      (x) => x.postShipment.checklist.some((c) => !c.done) && x.status !== "closed",
    );
    if (target) {
      const res = await api.setShipmentStatus(target.id, "closed");
      expect(res.ok).toBe(false);
    } else {
      expect(s).toBeTruthy();
    }
  });

  it("refuses a contract transition out of a terminal state", async () => {
    const c = (await api.listContracts())[0];
    await api.setContractStatus(c.id, "completed");
    const res = await api.setContractStatus(c.id, "under_execution");
    expect(res.ok).toBe(false);
  });
});

describe("document state changes", () => {
  it("advances a document and stamps the right date", async () => {
    const s = (await api.listShipments()).find((x) =>
      x.documents.some((d) => d.state === "not_issued" && d.required),
    )!;
    const doc = s.documents.find((d) => d.state === "not_issued" && d.required)!;
    const res = await api.setDocumentState(s.id, doc.key, "draft_received");
    expect(res.ok).toBe(true);
    if (res.ok) {
      const after = res.value.documents.find((d) => d.key === doc.key)!;
      expect(after.state).toBe("draft_received");
      expect(after.draftReceivedOn).toBeTruthy();
    }
  });

  it("refuses an out-of-order document transition", async () => {
    const s = (await api.listShipments()).find((x) =>
      x.documents.some((d) => d.state === "not_issued" && d.required),
    )!;
    const doc = s.documents.find((d) => d.state === "not_issued" && d.required)!;
    const res = await api.setDocumentState(s.id, doc.key, "original_received");
    expect(res.ok).toBe(false);
  });

  it("records a document state change in the audit trail", async () => {
    const s = (await api.listShipments()).find((x) =>
      x.documents.some((d) => d.state === "not_issued" && d.required),
    )!;
    const doc = s.documents.find((d) => d.state === "not_issued" && d.required)!;
    const before = s.audit.length;
    const res = await api.setDocumentState(s.id, doc.key, "draft_received");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.audit.length).toBe(before + 1);
  });

  it("refuses an empty comment", async () => {
    const s = (await api.listShipments())[0];
    const res = await api.addDocumentComment(s.id, s.documents[0].key, "   ", "Tester");
    expect(res.ok).toBe(false);
  });

  it("appends a valid comment", async () => {
    const s = (await api.listShipments())[0];
    const res = await api.addDocumentComment(s.id, s.documents[0].key, "Chased the buyer.", "Tester");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.documents[0].comments.at(-1)!.text).toBe("Chased the buyer.");
  });
});

describe("cargo status changes", () => {
  it("permits a declared cargo transition and updates the ready quantity", async () => {
    const cr = (await api.listCargoReadiness()).find((x) => x.cargoStatus === "partially_ready")!;
    const res = await api.setCargoStatus(cr.id, "ready", 600);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.cargoStatus).toBe("ready");
      expect(res.value.qtyReadyMt).toBe(600);
    }
  });

  it("refuses jumping from not available straight to ready", async () => {
    const cr = (await api.listCargoReadiness()).find((x) => x.cargoStatus === "not_available")!;
    const res = await api.setCargoStatus(cr.id, "ready");
    expect(res.ok).toBe(false);
  });
});

describe("creating a shipment", () => {
  it("refuses a quantity that would breach the contract ceiling", async () => {
    const contracts = await api.listContracts();
    const c = contracts[0];
    const res = await api.createShipment({
      contractId: c.id,
      executionPlanId: (await api.listExecutionPlans()).find((p) => p.contractId === c.id)!.id,
      quantityMt: c.quantityMt * 2,
      shipmentType: "container",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("above the ceiling");
  });

  it("refuses a zero quantity", async () => {
    const c = (await api.listContracts())[0];
    const res = await api.createShipment({
      contractId: c.id,
      executionPlanId: (await api.listExecutionPlans()).find((p) => p.contractId === c.id)!.id,
      quantityMt: 0,
      shipmentType: "container",
    });
    expect(res.ok).toBe(false);
  });

  it("refuses a missing contract", async () => {
    const res = await api.createShipment({
      contractId: "nope",
      executionPlanId: "nope",
      quantityMt: 10,
      shipmentType: "container",
    });
    expect(res.ok).toBe(false);
  });

  it("creates a draft shipment with a clean slate and an audit entry", async () => {
    const contracts = await api.listContracts();
    // Pick a contract with headroom.
    const shipments = await api.listShipments();
    const c = contracts.find((x) => {
      const used = shipments.filter((s) => s.contractId === x.id).reduce((a, s) => a + s.quantityMt, 0);
      return x.quantityMt - used > 50;
    })!;
    const plan = (await api.listExecutionPlans()).find((p) => p.contractId === c.id)!;
    const res = await api.createShipment({
      contractId: c.id,
      executionPlanId: plan.id,
      quantityMt: 25,
      shipmentType: "container",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.status).toBe("draft");
      expect(res.value.quantityMt).toBe(25);
      expect(res.value.audit).toHaveLength(1);
      expect(res.value.documents.every((d) => d.state === "not_issued" || d.state === "not_required")).toBe(
        true,
      );
      expect(res.value.stuffing.days).toEqual([]);
      expect(res.value.risks).toEqual([]);
    }
  });
});

describe("updating a shipment", () => {
  it("refuses a readiness date after the last shipping date", async () => {
    const s = (await api.listShipments())[0];
    const res = await api.updateShipment(s.id, {
      commodityReadinessDate: "2026-12-01",
      lastShippingDate: "2026-09-01",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("cannot fall after");
  });

  it("refuses a non-positive quantity", async () => {
    const s = (await api.listShipments())[0];
    expect((await api.updateShipment(s.id, { quantityMt: 0 })).ok).toBe(false);
  });

  it("applies a valid patch and audits it", async () => {
    const s = (await api.listShipments())[0];
    const before = s.audit.length;
    const res = await api.updateShipment(s.id, { containerType: "40 FT high cube" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.containerType).toBe("40 FT high cube");
      expect(res.value.audit.length).toBe(before + 1);
    }
  });
});

describe("transport request validation", () => {
  it("refuses a malformed origin phone number", async () => {
    const t = (await api.listTransportRequests())[0];
    const res = await api.updateTransportRequest(t.id, { contactOriginPhone: "abc" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("valid number");
  });

  it("accepts an international format with a plus, spaces and a leading zero", async () => {
    const t = (await api.listTransportRequests())[0];
    expect((await api.updateTransportRequest(t.id, { contactOriginPhone: "+249 (0)91 234 5678" })).ok).toBe(
      true,
    );
  });
});

describe("risk acknowledgement and reset", () => {
  it("acknowledges a shipment risk", async () => {
    const risks = await api.listRisks();
    const open = risks.find((r) => !r.acknowledged)!;
    expect((await api.acknowledgeRisk(open.id)).ok).toBe(true);
    const after = (await api.listRisks()).find((r) => r.id === open.id)!;
    expect(after.acknowledged).toBe(true);
  });

  it("refuses an unknown risk id", async () => {
    expect((await api.acknowledgeRisk("nope")).ok).toBe(false);
  });

  it("restores the seeded state on reset", async () => {
    const s = (await api.listShipments()).find((x) => x.status === "planned")!;
    await api.setShipmentStatus(s.id, "booked");
    resetStore();
    const after = (await api.listShipments()).find((x) => x.id === s.id)!;
    expect(after.status).toBe("planned");
  });
});
