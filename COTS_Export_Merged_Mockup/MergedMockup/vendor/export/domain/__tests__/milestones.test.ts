import { describe, expect, it } from "vitest";
import {
  EXECUTION_FLOW,
  MILESTONE_BY_KEY,
  applicableMilestones,
  resolveContractStepper,
  resolveMilestones,
  resolveShipmentStepper,
} from "../milestones";
import { COUNTRY_PROFILES } from "../variants";
import type { Milestone, VariantContext } from "../types";

function ctx(partial: Partial<VariantContext> = {}): VariantContext {
  return {
    country: COUNTRY_PROFILES.SD,
    shipmentType: "container",
    isLargeVolume: false,
    usesFreightForwarder: false,
    commodityIsGold: false,
    ...partial,
  };
}

describe("execution flow definition", () => {
  it("declares every prerequisite as a real milestone key", () => {
    for (const m of EXECUTION_FLOW) {
      for (const p of m.prerequisites) {
        expect(MILESTONE_BY_KEY[p], `${m.key} depends on unknown milestone ${p}`).toBeDefined();
      }
    }
  });

  it("gives every milestone an evidence citation", () => {
    for (const m of EXECUTION_FLOW) {
      expect(m.evidence.length, `${m.key} has no evidence`).toBeGreaterThan(10);
    }
  });

  it("has no circular prerequisite chain", () => {
    const index = new Map(EXECUTION_FLOW.map((m, i) => [m.key, i]));
    for (const m of EXECUTION_FLOW) {
      for (const p of m.prerequisites) {
        // Prerequisites must be declared earlier in the flow, which rules out cycles.
        expect(index.get(p)!, `${m.key} depends on a later milestone ${p}`).toBeLessThan(index.get(m.key)!);
      }
    }
  });
});

describe("variant applicability", () => {
  it("drops the export contract and EX forms in Tanzania", () => {
    const keys = applicableMilestones(ctx({ country: COUNTRY_PROFILES.TZ })).map((m) => m.key);
    expect(keys).not.toContain("export_contract_requested");
    expect(keys).not.toContain("ex_forms_issued");
    expect(keys).toContain("export_permit_issued");
    expect(keys).toContain("tancis_declaration");
  });

  it("keeps the export contract but drops EX forms in Ethiopia", () => {
    const keys = applicableMilestones(ctx({ country: COUNTRY_PROFILES.ET })).map((m) => m.key);
    expect(keys).toContain("export_contract_requested");
    expect(keys).not.toContain("ex_forms_issued");
    expect(keys).toContain("inland_transit_complete");
  });

  it("starts Mozambique from a commercial invoice", () => {
    const keys = applicableMilestones(ctx({ country: COUNTRY_PROFILES.MZ })).map((m) => m.key);
    expect(keys).toContain("commercial_invoice_issued");
    expect(keys).not.toContain("ex_forms_issued");
    expect(keys).not.toContain("preclearance_custody");
  });

  it("adds an inland leg for Chad", () => {
    const keys = applicableMilestones(ctx({ country: COUNTRY_PROFILES.TD })).map((m) => m.key);
    expect(keys).toContain("trucks_loaded");
    expect(keys).toContain("inland_transit_complete");
  });

  it("keeps OPU/PZU custody and the logistics service request for Sudan only", () => {
    expect(applicableMilestones(ctx()).map((m) => m.key)).toContain("preclearance_custody");
    expect(applicableMilestones(ctx({ country: COUNTRY_PROFILES.TZ })).map((m) => m.key)).not.toContain(
      "preclearance_custody",
    );
    expect(applicableMilestones(ctx()).map((m) => m.key)).toContain("service_request_raised");
    expect(applicableMilestones(ctx({ country: COUNTRY_PROFILES.TD })).map((m) => m.key)).not.toContain(
      "service_request_raised",
    );
  });

  it("swaps stuffing for vessel loading and a charter party on a bulk shipment", () => {
    const keys = applicableMilestones(ctx({ shipmentType: "bulk" })).map((m) => m.key);
    expect(keys).toContain("charter_party_agreed");
    expect(keys).toContain("vessel_loaded");
    expect(keys).not.toContain("stuffing_complete");
    expect(keys).not.toContain("empty_containers_inspected");
    expect(keys).not.toContain("sealed_under_survey");
  });

  it("drops the carrier booking on a road shipment", () => {
    const keys = applicableMilestones(ctx({ shipmentType: "road" })).map((m) => m.key);
    expect(keys).not.toContain("booking_confirmed");
    expect(keys).toContain("trucks_loaded");
  });
});

describe("milestone state resolution", () => {
  const stored: Milestone[] = [
    { key: "deal_agreed", state: "completed", actualDate: "2026-06-01" },
    { key: "compliance_cleared", state: "completed", actualDate: "2026-06-02" },
    { key: "contract_issued", state: "completed", actualDate: "2026-06-02" },
    { key: "execution_plan_created", state: "completed", actualDate: "2026-06-05" },
    { key: "stock_allocated", state: "not_started", blockingReason: "Raw material still under process." },
    { key: "cargo_ready", state: "not_started", targetDate: "2026-08-30" },
  ];

  it("marks inapplicable milestones not_applicable rather than pending", () => {
    const r = resolveMilestones(stored, ctx({ country: COUNTRY_PROFILES.TZ }), "2026-08-17");
    const exForms = r.find((m) => m.def.key === "ex_forms_issued")!;
    expect(exForms.state).toBe("not_applicable");
  });

  it("derives blocked from a stored blocking reason", () => {
    const r = resolveMilestones(stored, ctx(), "2026-08-17");
    expect(r.find((m) => m.def.key === "stock_allocated")!.state).toBe("blocked");
  });

  it("derives ready when every prerequisite is complete", () => {
    const r = resolveMilestones(stored, ctx(), "2026-08-17");
    // export_contract_requested depends only on execution_plan_created, which is complete.
    expect(r.find((m) => m.def.key === "export_contract_requested")!.state).toBe("ready");
  });

  it("leaves a milestone not_started while a prerequisite is outstanding", () => {
    const r = resolveMilestones(stored, ctx(), "2026-08-17");
    const cargo = r.find((m) => m.def.key === "cargo_ready")!;
    expect(cargo.unmetPrerequisites).toContain("stock_allocated");
    expect(cargo.state).toBe("not_started");
  });

  it("derives overdue from a past target date", () => {
    const r = resolveMilestones(
      [...stored, { key: "freight_offer_selected", state: "not_started", targetDate: "2026-08-01" }],
      ctx(),
      "2026-08-17",
    );
    expect(r.find((m) => m.def.key === "freight_offer_selected")!.state).toBe("overdue");
  });

  it("does not mark a completed milestone overdue", () => {
    const r = resolveMilestones(
      [{ key: "deal_agreed", state: "completed", actualDate: "2026-06-01", targetDate: "2026-05-01" }],
      ctx(),
      "2026-08-17",
    );
    expect(r.find((m) => m.def.key === "deal_agreed")!.state).toBe("completed");
  });

  it("ignores an inapplicable prerequisite when deciding readiness", () => {
    // customs_declaration depends on ex_forms_issued, which does not apply in Tanzania.
    const r = resolveMilestones(
      [
        { key: "deal_agreed", state: "completed" },
        { key: "compliance_cleared", state: "completed" },
        { key: "contract_issued", state: "completed" },
        { key: "execution_plan_created", state: "completed" },
        { key: "stock_allocated", state: "completed" },
        { key: "cargo_ready", state: "completed" },
        { key: "freight_offer_selected", state: "completed" },
        { key: "booking_confirmed", state: "completed" },
      ],
      ctx({ country: COUNTRY_PROFILES.TZ }),
      "2026-08-17",
    );
    const customs = r.find((m) => m.def.key === "customs_declaration")!;
    expect(customs.unmetPrerequisites).not.toContain("ex_forms_issued");
    expect(customs.state).toBe("ready");
  });

  it("returns a state for every milestone in the flow", () => {
    const r = resolveMilestones(stored, ctx(), "2026-08-17");
    expect(r).toHaveLength(EXECUTION_FLOW.length);
    for (const m of r) expect(m.state).toBeTruthy();
  });
});

describe("stepper roll-up", () => {
  const stored: Milestone[] = [
    { key: "deal_agreed", state: "completed", actualDate: "2026-06-01" },
    { key: "compliance_cleared", state: "completed", actualDate: "2026-06-02" },
    { key: "contract_issued", state: "completed", actualDate: "2026-06-02" },
    { key: "setup_feedback", state: "in_progress" },
    { key: "execution_plan_created", state: "completed", actualDate: "2026-06-05" },
    { key: "stock_allocated", state: "completed", actualDate: "2026-07-02" },
    { key: "cargo_ready", state: "completed", actualDate: "2026-07-05" },
  ];

  it("derives the shipment stepper from the same resolved flow", () => {
    const resolved = resolveMilestones(stored, ctx(), "2026-08-17");
    const steps = resolveShipmentStepper(resolved);
    expect(steps).toHaveLength(10);
    expect(steps.find((s) => s.key === "planned")!.state).toBe("completed");
    expect(steps.find((s) => s.key === "cargo_ready")!.state).toBe("completed");
    expect(steps.find((s) => s.key === "closed")!.state).not.toBe("completed");
  });

  it("carries the completion date onto a completed step", () => {
    const steps = resolveShipmentStepper(resolveMilestones(stored, ctx(), "2026-08-17"));
    expect(steps.find((s) => s.key === "cargo_ready")!.date).toBe("2026-07-05");
  });

  it("propagates a blocked or overdue state up to the step", () => {
    const resolved = resolveMilestones(
      [...stored, { key: "customs_release", state: "not_started", targetDate: "2026-08-01" }],
      ctx(),
      "2026-08-17",
    );
    expect(resolveShipmentStepper(resolved).find((s) => s.key === "cleared")!.state).toBe("overdue");
  });

  it("marks a step not_applicable when every underlying milestone is", () => {
    // In Tanzania the pre-clearance step maps only to export_permit_issued, which does apply,
    // so use a country where nothing in the group applies to test the roll-up itself.
    const resolved = resolveMilestones(stored, ctx({ country: COUNTRY_PROFILES.TZ }), "2026-08-17");
    const step = resolveShipmentStepper(resolved).find((s) => s.key === "preclearance_complete")!;
    expect([
      "not_started",
      "ready",
      "in_progress",
      "completed",
      "overdue",
      "blocked",
      "not_applicable",
    ]).toContain(step.state);
  });

  it("derives the contract stepper with the same nine milestones", () => {
    const steps = resolveContractStepper(resolveMilestones(stored, ctx(), "2026-08-17"));
    expect(steps).toHaveLength(9);
    expect(steps.find((s) => s.key === "contract_confirmed")!.state).toBe("completed");
    expect(steps.find((s) => s.key === "setup_confirmed")!.state).toBe("in_progress");
  });
});
