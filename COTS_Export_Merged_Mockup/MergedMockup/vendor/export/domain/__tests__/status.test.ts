import { describe, expect, it } from "vitest";
import {
  BANK_SUBMITTAL_TRANSITIONS,
  CARGO_TRANSITIONS,
  CLEARANCE_TRANSITIONS,
  CONTRACT_TRANSITIONS,
  DOCUMENT_TRANSITIONS,
  EXPORT_CONTRACT_TRANSITIONS,
  EXPORT_FORM_TRANSITIONS,
  SHIPMENT_TRANSITIONS,
  canTransition,
  guardClearanceCompletion,
  guardExportFormReuse,
  guardPostShipmentCompletion,
  guardUnique,
  humanise,
  nextStates,
  toneFor,
} from "../status";

describe("generic transition checker", () => {
  it("permits a declared transition", () => {
    expect(canTransition(CONTRACT_TRANSITIONS, "new_pc", "under_execution").allowed).toBe(true);
  });

  it("refuses an undeclared transition with a reason", () => {
    const r = canTransition(CONTRACT_TRANSITIONS, "new_pc", "completed");
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toContain("may only move to");
  });

  it("refuses any transition out of a terminal state", () => {
    const r = canTransition(CONTRACT_TRANSITIONS, "completed", "under_execution");
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toContain("terminal state");
  });

  it("refuses a transition to the same state", () => {
    expect(canTransition(CONTRACT_TRANSITIONS, "under_execution", "under_execution").allowed).toBe(false);
  });
});

describe("shipment transitions", () => {
  it("follows the validated lifecycle in order", () => {
    const chain = [
      "draft",
      "planned",
      "booked",
      "cleared",
      "stuffed",
      "sailed",
      "documents_complete",
      "closed",
    ] as const;
    for (let i = 0; i < chain.length - 1; i += 1) {
      expect(canTransition(SHIPMENT_TRANSITIONS, chain[i], chain[i + 1]).allowed).toBe(true);
    }
  });

  it("refuses skipping a phase — planned cannot jump to sailed", () => {
    expect(canTransition(SHIPMENT_TRANSITIONS, "planned", "sailed").allowed).toBe(false);
  });

  it("allows any live phase to become blocked, and blocked to return", () => {
    expect(canTransition(SHIPMENT_TRANSITIONS, "booked", "blocked").allowed).toBe(true);
    expect(canTransition(SHIPMENT_TRANSITIONS, "blocked", "cleared").allowed).toBe(true);
  });

  it("treats closed and cancelled as terminal", () => {
    expect(nextStates(SHIPMENT_TRANSITIONS, "closed")).toEqual([]);
    expect(nextStates(SHIPMENT_TRANSITIONS, "cancelled")).toEqual([]);
  });
});

describe("document transitions", () => {
  it("enforces draft → confirmed → original in order", () => {
    expect(canTransition(DOCUMENT_TRANSITIONS, "not_issued", "draft_received").allowed).toBe(true);
    expect(canTransition(DOCUMENT_TRANSITIONS, "draft_received", "confirmed").allowed).toBe(true);
    expect(canTransition(DOCUMENT_TRANSITIONS, "confirmed", "original_received").allowed).toBe(true);
  });

  it("refuses jumping from not issued straight to original", () => {
    expect(canTransition(DOCUMENT_TRANSITIONS, "not_issued", "original_received").allowed).toBe(false);
  });

  it("supports the amendment loop the legacy system has no status for", () => {
    expect(canTransition(DOCUMENT_TRANSITIONS, "draft_received", "amendment_requested").allowed).toBe(true);
    expect(canTransition(DOCUMENT_TRANSITIONS, "amendment_requested", "draft_received").allowed).toBe(true);
  });

  it("treats original received as terminal", () => {
    expect(nextStates(DOCUMENT_TRANSITIONS, "original_received")).toEqual([]);
  });
});

describe("cargo readiness transitions", () => {
  it("permits any awaiting state to reach ready", () => {
    expect(canTransition(CARGO_TRANSITIONS, "awaiting_fumigation", "ready").allowed).toBe(true);
    expect(canTransition(CARGO_TRANSITIONS, "awaiting_analysis", "ready").allowed).toBe(true);
  });

  it("permits ready to move to in transit and no further", () => {
    expect(canTransition(CARGO_TRANSITIONS, "ready", "in_transit").allowed).toBe(true);
    expect(nextStates(CARGO_TRANSITIONS, "in_transit")).toEqual([]);
  });

  it("refuses jumping from not available straight to ready", () => {
    expect(canTransition(CARGO_TRANSITIONS, "not_available", "ready").allowed).toBe(false);
  });

  it("exposes all ten legacy cargo statuses", () => {
    expect(Object.keys(CARGO_TRANSITIONS)).toHaveLength(10);
  });
});

describe("export contract and EX form transitions", () => {
  it("routes a request through the Ministry to issuance", () => {
    expect(canTransition(EXPORT_CONTRACT_TRANSITIONS, "not_requested", "requested").allowed).toBe(true);
    expect(canTransition(EXPORT_CONTRACT_TRANSITIONS, "requested", "sent_to_mot").allowed).toBe(true);
    expect(canTransition(EXPORT_CONTRACT_TRANSITIONS, "received_from_mot", "issued").allowed).toBe(true);
  });

  it("permits renewal from expired", () => {
    expect(canTransition(EXPORT_CONTRACT_TRANSITIONS, "expired", "issued").allowed).toBe(true);
  });

  it("moves an EX form through issued to used, and no further", () => {
    expect(canTransition(EXPORT_FORM_TRANSITIONS, "under_processing", "issued").allowed).toBe(true);
    expect(canTransition(EXPORT_FORM_TRANSITIONS, "issued", "used").allowed).toBe(true);
    expect(nextStates(EXPORT_FORM_TRANSITIONS, "used")).toEqual([]);
  });
});

describe("clearance and bank submittal transitions", () => {
  it("moves clearance through in progress to completed", () => {
    expect(canTransition(CLEARANCE_TRANSITIONS, "started", "in_progress").allowed).toBe(true);
    expect(canTransition(CLEARANCE_TRANSITIONS, "in_progress", "completed").allowed).toBe(true);
    expect(canTransition(CLEARANCE_TRANSITIONS, "started", "completed").allowed).toBe(false);
  });

  it("moves a bank submittal to paid via collection", () => {
    expect(canTransition(BANK_SUBMITTAL_TRANSITIONS, "under_collection", "matured").allowed).toBe(true);
    expect(canTransition(BANK_SUBMITTAL_TRANSITIONS, "matured", "paid").allowed).toBe(true);
    expect(canTransition(BANK_SUBMITTAL_TRANSITIONS, "overdue", "paid").allowed).toBe(true);
    expect(nextStates(BANK_SUBMITTAL_TRANSITIONS, "paid")).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * Guards — the rules the legacy system displays but does not enforce
 * ------------------------------------------------------------------ */

describe("clearance completion guard (rule R20)", () => {
  it("refuses completion while an applicable activity is unrecorded", () => {
    // The exact legacy defect: CL No.1 is marked Completed with both fumigation dates blank.
    const r = guardClearanceCompletion([
      { key: "customs_release", applicable: true, completedDate: "2026-07-24" },
      { key: "fumigation", applicable: true },
    ]);
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toContain("fumigation");
  });

  it("permits completion when everything applicable is recorded", () => {
    expect(
      guardClearanceCompletion([
        { key: "customs_release", applicable: true, completedDate: "2026-07-24" },
        { key: "fumigation", applicable: false },
      ]).allowed,
    ).toBe(true);
  });

  it("permits completion when nothing applies", () => {
    expect(guardClearanceCompletion([]).allowed).toBe(true);
  });
});

describe("post-shipment completion guard (rule R21)", () => {
  it("refuses completion with an unticked checklist item", () => {
    const r = guardPostShipmentCompletion([
      { key: "obl_draft_copy", done: true },
      { key: "coo_dft_stamp", done: false },
    ]);
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toContain("coo_dft_stamp");
  });

  it("permits completion when every item is ticked", () => {
    expect(guardPostShipmentCompletion([{ key: "packing_list", done: true }]).allowed).toBe(true);
  });
});

describe("EX form reuse guard (rule R7)", () => {
  it("refuses a form that has already been consumed", () => {
    const r = guardExportFormReuse({ formNo: "EXF-1", status: "used" });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toContain("already been consumed");
  });

  it("refuses a form that is not yet issued", () => {
    expect(guardExportFormReuse({ formNo: "EXF-1", status: "under_processing" }).allowed).toBe(false);
  });

  it("permits an issued form", () => {
    expect(guardExportFormReuse({ formNo: "EXF-1", status: "issued" }).allowed).toBe(true);
  });
});

describe("uniqueness guard (rules R8-R11)", () => {
  it("refuses a second record for the same parent — the advisory-only legacy rule, enforced", () => {
    const r = guardUnique(1, "shipping instruction", "SI/SRF 934.2");
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toContain("Only one is permitted");
  });

  it("permits the first record", () => {
    expect(guardUnique(0, "booking", "SI/SRF 934.2").allowed).toBe(true);
  });
});

describe("status tones", () => {
  it("assigns a tone to every status it is asked about", () => {
    for (const s of ["completed", "blocked", "overdue", "issued", "expired", "paid", "not_applicable"]) {
      expect(toneFor(s)).toBeTruthy();
    }
  });

  it("falls back to idle for an unknown status rather than throwing", () => {
    expect(toneFor("something-unmapped")).toBe("idle");
  });
});

describe("humanise", () => {
  it("keeps trade acronyms in capitals", () => {
    expect(humanise("new_pc")).toBe("New PC");
    expect(humanise("si_srf")).toBe("SI SRF");
    expect(humanise("obl_issued")).toBe("OBL issued");
  });

  it("still sentence-cases ordinary status keys", () => {
    expect(humanise("under_execution")).toBe("Under execution");
    expect(humanise("partially_completed")).toBe("Partially completed");
  });
});
