/**
 * The sixteen-phase cross-reference of COTS_Export_End_to_End_Workflow_v2.0.
 *
 * `workflow.ts` is a reference table, not a calculation, so these tests guard its
 * integrity rather than its arithmetic: that the sixteen phases are complete and in
 * order, that every foreign key it carries — `PhaseId`, `Role`, a decision id — points
 * at something that exists, and that nothing on a phase is left blank where a screen
 * would print it.
 */

import { describe, expect, it } from "vitest";
import {
  OPEN_DECISIONS,
  OUTSTANDING_MASTER_DATA,
  WORKFLOW_PHASES,
  WORKFLOW_PHASE_BY_ID,
  workflowPhasesForSourcePhase,
  type PhaseCoverage,
  type PhaseEvidence,
} from "../workflow";
import { PHASES } from "../milestones";
import { ROLE_LABEL } from "../types";

const COVERAGE: PhaseCoverage[] = ["covered", "extended", "new"];
const EVIDENCE: PhaseEvidence[] = ["Existing", "New", "Both"];

describe("the sixteen phases", () => {
  it("holds exactly sixteen phases", () => {
    expect(WORKFLOW_PHASES).toHaveLength(16);
  });

  it("numbers them 01 to 16 in order", () => {
    expect(WORKFLOW_PHASES.map((p) => p.number)).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
    ]);
  });

  it("ids them WF01 to WF16 in the same order", () => {
    expect(WORKFLOW_PHASES.map((p) => p.id)).toEqual([
      "WF01",
      "WF02",
      "WF03",
      "WF04",
      "WF05",
      "WF06",
      "WF07",
      "WF08",
      "WF09",
      "WF10",
      "WF11",
      "WF12",
      "WF13",
      "WF14",
      "WF15",
      "WF16",
    ]);
  });

  it("uses no duplicate id", () => {
    const ids = WORKFLOW_PHASES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses no duplicate number", () => {
    const numbers = WORKFLOW_PHASES.map((p) => p.number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("keeps the id and the number consistent — WF07 is phase 07", () => {
    for (const p of WORKFLOW_PHASES) expect(p.id).toBe(`WF${p.number}`);
  });

  it("indexes every phase by id in WORKFLOW_PHASE_BY_ID", () => {
    expect(Object.keys(WORKFLOW_PHASE_BY_ID)).toHaveLength(16);
    for (const p of WORKFLOW_PHASES) expect(WORKFLOW_PHASE_BY_ID[p.id]).toBe(p);
  });
});

describe("what every phase must state", () => {
  it("names every phase", () => {
    for (const p of WORKFLOW_PHASES) {
      expect(p.name.trim().length, `${p.id} has no name`).toBeGreaterThan(0);
    }
  });

  it("labels the owner of every phase in words, not just as a role key", () => {
    for (const p of WORKFLOW_PHASES) {
      expect(p.ownerLabel.trim().length, `${p.id} has no owner label`).toBeGreaterThan(0);
    }
  });

  it("states the key output of every phase", () => {
    for (const p of WORKFLOW_PHASES) {
      expect(p.keyOutput.trim().length, `${p.id} has no key output`).toBeGreaterThan(0);
    }
  });

  it("gives every phase at least one screen, so the process map never dead-ends", () => {
    for (const p of WORKFLOW_PHASES) {
      expect(p.screens.length, `${p.id} has no screen`).toBeGreaterThan(0);
    }
  });

  it("labels every screen and gives it an absolute route", () => {
    for (const p of WORKFLOW_PHASES) {
      for (const s of p.screens) {
        expect(s.label.trim().length, `${p.id} has an unlabelled screen`).toBeGreaterThan(0);
        expect(s.to.startsWith("/"), `${p.id} → ${s.label} is not an absolute route`).toBe(true);
      }
    }
  });

  it("records a coverage of covered, extended or new for every phase", () => {
    for (const p of WORKFLOW_PHASES) expect(COVERAGE).toContain(p.coverage);
  });

  it("records an evidence class of Existing, New or Both for every phase", () => {
    for (const p of WORKFLOW_PHASES) expect(EVIDENCE).toContain(p.evidence);
  });

  it("gives every phase owner a role that exists in ROLE_LABEL", () => {
    const roles = Object.keys(ROLE_LABEL);
    for (const p of WORKFLOW_PHASES) {
      expect(roles, `${p.id} owner "${p.owner}" is not a Role`).toContain(p.owner);
    }
  });
});

describe("the source-phase cross-reference (v2.0 §16)", () => {
  /**
   * v2.0 §16.1 records six phases as undocumented, but only three of the sixteen carry
   * no P-number in this table: 01 and 02 (the trader's own phases, both served by P1's
   * subject matter without claiming P1's number) and 04 (the cross-functional review).
   * Phases 05, 06 and 10 — the other three of §16.1's six — each do carry a P-number
   * (P2, and P3/P4/P5, and P11 respectively), because a prototype phase already covered
   * part of the ground even though the v2.0 phase itself was undocumented. "Undocumented
   * in v2.0 §16.1" and "has no source P-number" are therefore not the same set, and this
   * asserts the second, which is what the table actually models.
   */
  it("leaves exactly three phases with no source P-number — 01, 02 and 04", () => {
    const empty = WORKFLOW_PHASES.filter((p) => p.sourcePhases.length === 0).map((p) => p.number);
    expect(empty).toEqual(["01", "02", "04"]);
  });

  it("gives every other phase at least one source P-number", () => {
    const withSource = WORKFLOW_PHASES.filter((p) => p.sourcePhases.length > 0);
    expect(withSource).toHaveLength(13);
  });

  it("points every source P-number at a phase that exists in PHASES", () => {
    const known = PHASES.map((p) => p.id);
    for (const p of WORKFLOW_PHASES) {
      for (const src of p.sourcePhases) {
        expect(known, `${p.id} names unknown source phase "${src}"`).toContain(src);
      }
    }
  });

  it("names no source P-number twice on the same phase", () => {
    for (const p of WORKFLOW_PHASES) {
      expect(new Set(p.sourcePhases).size, `${p.id} repeats a source phase`).toBe(p.sourcePhases.length);
    }
  });

  it("maps P14 to the two phases that name it — bank submission and close-out", () => {
    expect(workflowPhasesForSourcePhase("P14").map((p) => p.id)).toEqual(["WF15", "WF16"]);
  });

  it("maps P11 to both the movement phase and the stuffing phase", () => {
    expect(workflowPhasesForSourcePhase("P11").map((p) => p.id)).toEqual(["WF10", "WF11"]);
  });

  it("maps P2 to contract creation and to quality parameters", () => {
    expect(workflowPhasesForSourcePhase("P2").map((p) => p.id)).toEqual(["WF03", "WF05"]);
  });

  it("returns nothing for P1, the one prototype phase no v2.0 phase claims", () => {
    // P1 is "Trade origination & costing", whose subject matter became phases 01 and 02 —
    // and both of those record no source P-number, so P1 maps to nothing.
    expect(workflowPhasesForSourcePhase("P1")).toEqual([]);
  });

  it("returns every P-number's phases in phase order", () => {
    for (const phase of PHASES) {
      const found = workflowPhasesForSourcePhase(phase.id);
      const numbers = found.map((p) => p.number);
      expect([...numbers].sort()).toEqual(numbers);
    }
  });
});

describe("open decisions surfaced on a phase", () => {
  it("points every phase's decision id at a real OPEN_DECISIONS entry", () => {
    for (const p of WORKFLOW_PHASES) {
      for (const d of p.openDecisions) {
        expect(Object.keys(OPEN_DECISIONS), `${p.id} names unknown decision "${d}"`).toContain(d);
      }
    }
  });

  it("names no decision twice on the same phase", () => {
    for (const p of WORKFLOW_PHASES) {
      expect(new Set(p.openDecisions).size, `${p.id} repeats a decision`).toBe(p.openDecisions.length);
    }
  });

  it("states every decision as a full question, not a stub", () => {
    for (const [id, d] of Object.entries(OPEN_DECISIONS)) {
      expect(d.title.length, `${id} title is too short to be a decision`).toBeGreaterThan(20);
    }
  });

  it("names an owner for every decision, so nothing is open on nobody", () => {
    for (const [id, d] of Object.entries(OPEN_DECISIONS)) {
      expect(d.owner.trim().length, `${id} has no owner`).toBeGreaterThan(0);
    }
  });

  it("surfaces at least one decision on more than half the phases", () => {
    const withDecisions = WORKFLOW_PHASES.filter((p) => p.openDecisions.length > 0);
    expect(withDecisions.length).toBeGreaterThan(8);
  });
});

describe("outstanding master data (v2.0 §14.1)", () => {
  it("holds the five data sets the source names", () => {
    expect(OUTSTANDING_MASTER_DATA).toHaveLength(5);
  });

  it("names the data set, the owner and what it blocks on every row", () => {
    for (const row of OUTSTANDING_MASTER_DATA) {
      expect(row.dataSet.trim().length, "a row has no data set").toBeGreaterThan(0);
      expect(row.owner.trim().length, `${row.dataSet} has no owner`).toBeGreaterThan(0);
      expect(row.blocks.trim().length, `${row.dataSet} says nothing about what it blocks`).toBeGreaterThan(0);
    }
  });

  it("names a distinct data set on every row", () => {
    const sets = OUTSTANDING_MASTER_DATA.map((r) => r.dataSet);
    expect(new Set(sets).size).toBe(sets.length);
  });

  it("ties every outstanding data set to a phase by number", () => {
    for (const row of OUTSTANDING_MASTER_DATA) {
      expect(row.blocks, `${row.dataSet} does not name a phase`).toMatch(/Phases?\s\d\d/);
    }
  });
});
