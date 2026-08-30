import { describe, expect, it } from "vitest";
import { ICON_NAMES } from "../Icon";
import { BANDS, MODULES, allDestinations, moduleForPath } from "../modules";
import { availableYears, homeCounters, inPeriod, monthName, periodFromIso } from "../home-counters";
import { SHIPMENTS, STANDALONE_RISKS } from "../../data/seed";
import { TODAY } from "../../domain/calc";

describe("navigation model integrity", () => {
  it("gives every tile an icon that exists", () => {
    for (const m of MODULES) {
      expect(ICON_NAMES).toContain(m.icon);
      for (const c of m.children ?? []) expect(ICON_NAMES).toContain(c.icon);
    }
  });

  it("puts every tile in a declared band", () => {
    for (const m of MODULES) expect(BANDS).toContain(m.band);
  });

  it("uses unique ids and absolute routes", () => {
    const ids = MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of allDestinations()) expect(d.to.startsWith("/")).toBe(true);
  });

  it("labels and explains every destination — no icon-only, no bare link", () => {
    for (const m of MODULES) {
      expect(m.label.length).toBeGreaterThan(3);
      expect(m.hint.length).toBeGreaterThan(10);
      for (const c of m.children ?? []) {
        expect(c.label.length).toBeGreaterThan(3);
        expect(c.hint.length).toBeGreaterThan(10);
      }
    }
  });
});

describe("moduleForPath", () => {
  it("matches a module landing route", () => {
    expect(moduleForPath("/contracts")?.id).toBe("contracts");
    expect(moduleForPath("/dashboard")?.id).toBe("dashboard");
  });

  it("matches deeper record routes to their module", () => {
    expect(moduleForPath("/shipments/sh-1/execution")?.id).toBe("shipments");
    expect(moduleForPath("/material/transport/tr-1/edit")?.id).toBe("material");
  });

  it("resolves a sub-view to its owning tile rather than a shorter prefix", () => {
    expect(moduleForPath("/shipments/new")?.id).toBe("shipments");
    expect(moduleForPath("/material/receipts")?.id).toBe("material");
  });

  it("returns nothing for the springboard itself and for unknown paths", () => {
    expect(moduleForPath("/")).toBeUndefined();
    expect(moduleForPath("/nope")).toBeUndefined();
  });
});

describe("period helpers", () => {
  it("reads a period out of an ISO date", () => {
    expect(periodFromIso("2026-08-17")).toEqual({ year: 2026, month: 8 });
  });

  it("tests membership of a period", () => {
    expect(inPeriod("2026-08-01", { year: 2026, month: 8 })).toBe(true);
    expect(inPeriod("2026-09-01", { year: 2026, month: 8 })).toBe(false);
    expect(inPeriod("2025-08-01", { year: 2026, month: 8 })).toBe(false);
    expect(inPeriod(undefined, { year: 2026, month: 8 })).toBe(false);
  });

  it("names all twelve months", () => {
    expect(monthName(1)).toBe("January");
    expect(monthName(12)).toBe("December");
  });
});

describe("home counters", () => {
  const rows = homeCounters(SHIPMENTS, STANDALONE_RISKS, periodFromIso(TODAY));
  const by = (key: string) => rows.find((r) => r.key === key)!;

  it("returns every counter with a label, a link and a hint", () => {
    for (const r of rows) {
      expect(r.label.length).toBeGreaterThan(2);
      expect(r.to.startsWith("/")).toBe(true);
      expect(r.hint.length).toBeGreaterThan(10);
      expect(Number.isInteger(r.count)).toBe(true);
      expect(r.count).toBeGreaterThanOrEqual(0);
    }
  });

  it("counts open shipments the same way the dashboard does", () => {
    const expected = SHIPMENTS.filter((s) => s.status !== "closed" && s.status !== "cancelled").length;
    expect(by("open").count).toBe(expected);
  });

  it("never counts a completed or not-applicable milestone as work", () => {
    const late = homeCounters(
      [
        {
          ...SHIPMENTS[0],
          milestones: [
            { key: "a", state: "completed", targetDate: "2026-01-01" },
            { key: "b", state: "not_applicable", targetDate: "2026-01-01" },
          ],
        },
      ],
      [],
      periodFromIso(TODAY),
    );
    expect(late.find((r) => r.key === "late")!.count).toBe(0);
  });

  it("separates late, today and the next seven days without double counting", () => {
    const ship = {
      ...SHIPMENTS[0],
      milestones: [
        { key: "overdue", state: "ready" as const, targetDate: "2026-08-10" },
        { key: "today", state: "ready" as const, targetDate: TODAY },
        { key: "soon", state: "ready" as const, targetDate: "2026-08-20" },
        { key: "later", state: "ready" as const, targetDate: "2026-09-30" },
      ],
    };
    const r = homeCounters([ship], [], { year: 2026, month: 9 });
    expect(r.find((x) => x.key === "late")!.count).toBe(1);
    expect(r.find((x) => x.key === "today")!.count).toBe(1);
    expect(r.find((x) => x.key === "seven")!.count).toBe(1);
    // The period counter is scoped by the selector, not by today.
    expect(r.find((x) => x.key === "period")!.count).toBe(1);
    expect(r.find((x) => x.key === "period")!.label).toBe("Due in September");
  });

  it("counts only unacknowledged risks", () => {
    const risks = [
      { ...STANDALONE_RISKS[0], acknowledged: false },
      { ...STANDALONE_RISKS[0], id: "r-x", acknowledged: true },
    ];
    expect(homeCounters([], risks, periodFromIso(TODAY)).find((r) => r.key === "risks")!.count).toBe(1);
  });

  it("offers the current year in the period selector even with no dated milestones", () => {
    expect(availableYears([])).toEqual([periodFromIso(TODAY).year]);
    expect(availableYears(SHIPMENTS)).toContain(periodFromIso(TODAY).year);
  });
});
