/**
 * The two route tables must agree.
 *
 * WHY THIS EXISTS. This prototype is consumed two ways. Standalone, `vendor/export/App.tsx`
 * is the route table. Inside the merged COTS mock-up, that file is **not** mounted: the
 * merged application re-declares every Export route against its own router, so there are
 * two tables and nothing has ever compared them.
 *
 * That cost a working screen. The Procurement routes of 3 September 2026 were added to
 * Export's table and not to the merged application's, so inside COTS the purchase-order
 * list rendered — it matches `/sourcing/:tab`, which already existed — while clicking a PO
 * number fell through to the merged application's catch-all: "That address is not part of
 * the demonstration." Every unit and route test passed throughout, because they all read
 * Export's table, which was correct.
 *
 * WHAT THIS CHECKS. Every route pattern Export declares must be declared in the merged
 * application too, and every route the merged application declares *under a top segment
 * Export owns* must be declared in Export. The second direction is scoped that way because
 * the merged application legitimately carries hundreds of routes Export has never heard of
 * (`/home`, `/c1…/c12`, `/s01…/s11`); the segments Export owns are read from Export's own
 * table rather than listed here, so a new module surface is covered the day it appears.
 *
 * WIDENED 6 September 2026. Until then only `/sourcing` was compared, because that was the
 * prefix the Procurement defect happened on. That made the guard a guard against one
 * recurrence rather than against the failure: `/contracts/:id/planning/new`, added the same
 * day, is exactly the same mistake on a different prefix and the narrow version would have
 * let it through.
 *
 * WHEN THE MERGED APPLICATION IS ABSENT — a standalone checkout of `vendor/export`, where
 * there is no host to compare against — the test says so and passes. It is a drift guard,
 * not a requirement that the host exist.
 */

import { describe, expect, it } from "vitest";

/*
  Both tables are read through Vite rather than through `node:fs`, for two reasons. It is
  the idiom this suite already uses — `routes.test.tsx` reads Export's own table with
  `?raw` — and `import.meta.glob` degrades exactly the way a drift guard needs it to: a
  pattern that matches nothing yields an empty object instead of throwing, so a standalone
  checkout of `vendor/export` with no host to compare against reports that rather than
  failing to load.

  The glob patterns are literals because Vite resolves them at build time; a computed path
  would match nothing. The two patterns cover the layout this module is vendored into —
  `<host>/vendor/export` — and a flat layout where the two sit side by side.
*/
const EXPORT_TABLE = import.meta.glob("../App.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const HOST_TABLES = {
  ...(import.meta.glob("../../../src/App.tsx", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob("../../src/App.tsx", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>),
};

/** The host is the one that re-declares Export's routes; nothing else imports `@export/`. */
function hostSource(): string | undefined {
  return Object.values(HOST_TABLES).find((src) => src.includes("@export/"));
}

/** Every `path="…"` in a route table, normalised to a leading slash. */
function routePaths(source: string): string[] {
  const found = [...source.matchAll(/path=["']([^"']+)["']/g)].map((m) => m[1]);
  return [...new Set(found.map((p) => (p.startsWith("/") ? p : `/${p}`)))];
}

/** The first path segment of a route, or "" for the index route. */
function topSegment(path: string): string {
  return path.split("/").filter(Boolean)[0] ?? "";
}

/**
 * The top-level segments Export declares, which is the surface it owns. A `:param` segment
 * is excluded: it matches anything, so treating it as an owned prefix would drag every host
 * route into the comparison.
 */
function ownedSegments(exportPaths: string[]): Set<string> {
  return new Set(exportPaths.map(topSegment).filter((seg) => seg !== "" && !seg.startsWith(":")));
}

const sourcingOnly = (paths: string[]) =>
  paths.filter((p) => p === "/sourcing" || p.startsWith("/sourcing/")).sort();

describe("the Export and merged route tables agree", () => {
  const allExportPaths = routePaths(Object.values(EXPORT_TABLE).join("\n"))
    .filter((p) => p !== "/*")
    .sort();
  const exportPaths = sourcingOnly(allExportPaths);

  it("finds a sourcing route table to compare", () => {
    /* A guard on the guard: a regex that matched nothing would make every assertion
       below vacuously true. */
    expect(exportPaths.length).toBeGreaterThan(10);
    expect(exportPaths).toContain("/sourcing");
  });

  const host = hostSource();
  const hostExists = host !== undefined;

  it.skipIf(!hostExists)("declares every Export /sourcing route in the merged application too", () => {
    const hostPaths = sourcingOnly(routePaths(host!));
    const missing = exportPaths.filter((p) => !hostPaths.includes(p));
    expect(
      missing,
      `these routes exist in vendor/export/App.tsx and not in the merged src/App.tsx, so inside ` +
        `COTS they fall through to "That address is not part of the demonstration": ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it.skipIf(!hostExists)("declares every merged /sourcing route in Export too", () => {
    /* The other direction matters as much: a route the host carries and Export does not is
       a screen that works inside COTS and 404s in the standalone prototype, which is the
       harder failure to notice because the standalone build is where the tests run. */
    const hostPaths = sourcingOnly(routePaths(host!));
    const missing = hostPaths.filter((p) => !exportPaths.includes(p));
    expect(
      missing,
      `these routes exist in the merged src/App.tsx and not in vendor/export/App.tsx: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it.skipIf(hostExists)("says so when there is no merged application to compare against", () => {
    expect(hostExists).toBe(false);
  });

  it.skipIf(!hostExists)("declares every Export route in the merged application, on any prefix", () => {
    const hostPaths = routePaths(host!);
    const missing = allExportPaths.filter((p) => !hostPaths.includes(p));
    expect(
      missing,
      `these routes exist in vendor/export/App.tsx and not in the merged src/App.tsx, so inside ` +
        `COTS they fall through to "That address is not part of the demonstration": ${missing.join(", ")}`,
    ).toEqual([]);
  });

  /**
   * One legitimate divergence, named rather than papered over by loosening the rule.
   *
   * `/login/external` is Core's external-login screen, which the merged application routes to
   * (WF-C1-01 step 1) and Export has no business declaring: Export's `/login` is its own demo
   * sign-in. It shares a top segment with an Export route without being an Export route, which
   * is the only way this comparison can be wrong, so it is listed here with the reason. A new
   * entry should be argued for, not added to make a red test green.
   */
  const HOST_ONLY = ["/login/external"];

  it.skipIf(!hostExists)("declares every merged route on an Export-owned prefix in Export too", () => {
    const owned = ownedSegments(allExportPaths);
    const hostPaths = routePaths(host!)
      .filter((p) => owned.has(topSegment(p)))
      .filter((p) => !HOST_ONLY.includes(p));
    const missing = hostPaths.filter((p) => !allExportPaths.includes(p));
    expect(
      missing,
      `these routes exist in the merged src/App.tsx under a prefix Export owns, and not in ` +
        `vendor/export/App.tsx, so they 404 in the standalone prototype — which is where the ` +
        `tests run, so nothing else would notice: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it.skipIf(!hostExists)("carries the execution-plan route in both, the case that widened this guard", () => {
    const hostPaths = routePaths(host!);
    const p = "/contracts/:id/planning/new";
    expect(allExportPaths, `${p} missing from vendor/export/App.tsx`).toContain(p);
    expect(hostPaths, `${p} missing from the merged src/App.tsx`).toContain(p);
  });

  it.skipIf(!hostExists)("carries the Procurement routes in both, which is the case that failed", () => {
    const hostPaths = sourcingOnly(routePaths(host!));
    for (const p of [
      "/sourcing/procurement/new",
      "/sourcing/procurement/:id",
      "/sourcing/procurement/:id/edit",
    ]) {
      expect(exportPaths, `${p} missing from vendor/export/App.tsx`).toContain(p);
      expect(hostPaths, `${p} missing from the merged src/App.tsx`).toContain(p);
    }
  });
});
