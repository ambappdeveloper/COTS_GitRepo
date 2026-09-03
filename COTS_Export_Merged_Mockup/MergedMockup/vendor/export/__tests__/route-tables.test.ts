/**
 * The two route tables must agree about `/sourcing`.
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
 * WHAT THIS CHECKS. Every `/sourcing…` route pattern declared in either table is declared
 * in both. Only `/sourcing` is compared, because that is the surface this module owns and
 * the merged application legitimately carries hundreds of routes Export has never heard of
 * (`/home`, `/c1…/c12`, `/s01…/s11`).
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

const sourcingOnly = (paths: string[]) =>
  paths.filter((p) => p === "/sourcing" || p.startsWith("/sourcing/")).sort();

describe("the Export and merged route tables agree about /sourcing", () => {
  const exportPaths = sourcingOnly(routePaths(Object.values(EXPORT_TABLE).join("\n")));

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
