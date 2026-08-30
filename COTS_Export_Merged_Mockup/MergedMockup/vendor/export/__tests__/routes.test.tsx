/**
 * Route smoke test.
 *
 * Every route added for workflow v2.0, plus a handful of pre-existing ones, is rendered
 * once and asked for two things: its own `<h1>`, and the absence of an error state. That
 * is deliberately shallow — the point is not to re-test a page's behaviour but to catch
 * the failure a unit test cannot see, where a page throws on mount, reads a record that
 * is not in the seed, or is wired to a route that does not resolve.
 *
 * `App` itself is not imported: it chooses `BrowserRouter` or `HashRouter` at module
 * load from `import.meta.env.VITE_PORTABLE`, so it cannot be mounted under a
 * `MemoryRouter`. Each page is therefore mounted against the same route pattern App.tsx
 * declares for it, inside the providers that page needs. The last describe block closes
 * the gap that leaves: it reads the route patterns out of App.tsx and checks that every
 * navigation destination and every process-map screen link resolves against one of them.
 */

import appSource from "../App.tsx?raw";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";

import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/feedback";
import { ThemeProvider } from "../theme/ThemeContext";
import { setLatency } from "../services/store";
import { WORKFLOW_PHASES } from "../domain/workflow";
import { allDestinations } from "../nav/modules";

import { ProcessMapPage } from "../pages/process-map";
import { OpportunityDetail, OpportunityForm, OpportunityList, PositionReport } from "../pages/origination";
import { AllocationModule } from "../pages/allocation";
import { AdvancePaymentDetail, AdvancePaymentList } from "../pages/advance-payments";
import { FreightRatesPage } from "../pages/freight-rates";
import { MovementLegDetail, MovementModule } from "../pages/movement";
import { CloseOutModule } from "../pages/close-out";
import { IntakeReceiptDetail, PurchaseAgreementDetail, SourcingModule } from "../pages/sourcing";
import {
  FundForm,
  NewAgentBalanceForm,
  NewMaterialReceiptForm,
  NewReceivingLocationForm,
  NewWarehouseReceiptForm,
  PurchaseAgreementForm,
} from "../pages/sourcing-forms";
import { BudgetDetail, SeasonalPurchasePlanDetail } from "../pages/planning";
import { BudgetForm, SeasonalPurchasePlanForm } from "../pages/planning-forms";
import { ContractDetail, ContractList } from "../pages/contracts";
import { ShipmentList } from "../pages/shipments";
import {
  ClearanceWorkspace,
  DocumentsWorkspace,
  PostShipmentWorkspace,
  StuffingWorkspace,
} from "../pages/execution-modules";

setLatency(0);

/* ------------------------------------------------------------------ *
 * Harness
 * ------------------------------------------------------------------ */

/**
 * Mounts one page at one URL. The providers are the three App.tsx wraps every protected
 * route in, minus the router itself and minus `Shell`, which is chrome rather than page.
 */
function renderRoute(pattern: string, path: string, element: ReactElement) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path={pattern} element={element} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

/** Renders the route, waits out the store's async load and asserts the page came up clean. */
async function expectPage(
  pattern: string,
  path: string,
  element: ReactElement,
  heading: string,
): Promise<void> {
  const { container, unmount } = renderRoute(pattern, path, element);
  try {
    const h1 = await screen.findByRole("heading", { level: 1, name: heading });
    expect(h1).toBeTruthy();
    expect(h1.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    // `ErrorState` is the only thing that renders `.empty--error`; a page that threw or
    // failed to load would show it instead of its own content.
    expect(container.querySelector(".empty--error"), `${path} rendered an error state`).toBeNull();
  } finally {
    unmount();
  }
}

interface Case {
  /** The route pattern as App.tsx declares it, absolute for the MemoryRouter. */
  pattern: string;
  path: string;
  element: ReactElement;
  heading: string;
}

const V2_ROUTES: Case[] = [
  /* --- the process map itself --- */
  {
    pattern: "/process-map",
    path: "/process-map",
    element: <ProcessMapPage />,
    heading: "Export process map",
  },

  /* --- Origination, v2.0 phases 01-02 --- */
  { pattern: "/origination", path: "/origination", element: <OpportunityList />, heading: "Opportunities" },
  {
    pattern: "/origination/new",
    path: "/origination/new",
    element: <OpportunityForm />,
    heading: "New opportunity",
  },
  {
    pattern: "/origination/position",
    path: "/origination/position",
    element: <PositionReport />,
    heading: "Long and short position",
  },
  {
    pattern: "/origination/:id",
    path: "/origination/op-1",
    element: <OpportunityDetail />,
    heading: "OPP-2026-014",
  },

  /* --- Allocation & readiness, v2.0 phase 06 --- */
  {
    pattern: "/allocation",
    path: "/allocation",
    element: <AllocationModule />,
    heading: "Stock allocation & cargo readiness",
  },
  {
    pattern: "/allocation/:tab",
    path: "/allocation/position",
    element: <AllocationModule />,
    heading: "Stock allocation & cargo readiness",
  },
  {
    pattern: "/allocation/:tab",
    path: "/allocation/production-plan",
    element: <AllocationModule />,
    heading: "Stock allocation & cargo readiness",
  },
  {
    pattern: "/allocation/:tab",
    path: "/allocation/warehouse-requests",
    element: <AllocationModule />,
    heading: "Stock allocation & cargo readiness",
  },

  /* --- Advance payments, v2.0 phase 07 --- */
  {
    pattern: "/pre-clearance/advance-payments",
    path: "/pre-clearance/advance-payments",
    element: <AdvancePaymentList />,
    heading: "Advance payments",
  },
  {
    pattern: "/pre-clearance/advance-payments/:id",
    path: "/pre-clearance/advance-payments/ap-1",
    element: <AdvancePaymentDetail />,
    heading: "Advance payment ADV-2026-004",
  },

  /* --- Movement & stuffing requests, v2.0 phase 10 --- */
  {
    pattern: "/movement",
    path: "/movement",
    element: <MovementModule />,
    heading: "Movement & stuffing requests",
  },
  {
    pattern: "/movement/:tab",
    path: "/movement/requests",
    element: <MovementModule />,
    heading: "Movement & stuffing requests",
  },
  {
    pattern: "/movement/leg/:id",
    path: "/movement/leg/ml-1",
    element: <MovementLegDetail />,
    heading: "Movement leg MOV-2026-031",
  },

  /* --- Freight rate table, v2.0 phase 08 --- */
  {
    pattern: "/freight-rates",
    path: "/freight-rates",
    element: <FreightRatesPage />,
    heading: "Freight rate table",
  },

  /* --- Close-out, claims & insurance, v2.0 phase 16 --- */
  {
    pattern: "/close-out",
    path: "/close-out",
    element: <CloseOutModule />,
    heading: "Close-out, claims and insurance",
  },
  {
    pattern: "/close-out/:tab",
    path: "/close-out/claims",
    element: <CloseOutModule />,
    heading: "Close-out, claims and insurance",
  },
  {
    pattern: "/close-out/:tab",
    path: "/close-out/insurance",
    element: <CloseOutModule />,
    heading: "Close-out, claims and insurance",
  },

  /* --- Workflow v2.3 phases 01-02: seasonal purchase plan and budget --- */
  {
    pattern: "/sourcing/:tab",
    path: "/sourcing/plans",
    element: <SourcingModule />,
    heading: "Sourcing intake",
  },
  {
    pattern: "/sourcing/:tab",
    path: "/sourcing/budgets",
    element: <SourcingModule />,
    heading: "Sourcing intake",
  },
  {
    pattern: "/sourcing/plans/new",
    path: "/sourcing/plans/new",
    element: <SeasonalPurchasePlanForm mode="create" />,
    heading: "New seasonal purchase plan",
  },
  {
    pattern: "/sourcing/budgets/new",
    path: "/sourcing/budgets/new",
    element: <BudgetForm mode="create" />,
    heading: "New budget",
  },
  {
    pattern: "/sourcing/plans/:id",
    path: "/sourcing/plans/spp-2",
    element: <SeasonalPurchasePlanDetail />,
    heading: "SPP-2026-0002",
  },
  /* The edit screens hydrate from the record, so a missing field would throw on mount. */
  {
    pattern: "/sourcing/plans/:id/edit",
    path: "/sourcing/plans/spp-2/edit",
    element: <SeasonalPurchasePlanForm mode="edit" />,
    heading: "Edit SPP-2026-0002",
  },
  {
    pattern: "/sourcing/budgets/:id",
    path: "/sourcing/budgets/bg-1",
    element: <BudgetDetail />,
    heading: "BGT-2026-0001",
  },
  {
    pattern: "/sourcing/budgets/:id/edit",
    path: "/sourcing/budgets/bg-1/edit",
    element: <BudgetForm mode="edit" />,
    heading: "Edit BGT-2026-0001",
  },
  /* The budget with no approval status — the edit form must hydrate a blank one. */
  {
    pattern: "/sourcing/budgets/:id/edit",
    path: "/sourcing/budgets/bg-3/edit",
    element: <BudgetForm mode="edit" />,
    heading: "Edit BGT-2025-0003",
  },
  /* The budget whose approval status was never recorded — the field is optional. */
  {
    pattern: "/sourcing/budgets/:id",
    path: "/sourcing/budgets/bg-3",
    element: <BudgetDetail />,
    heading: "BGT-2025-0003",
  },

  /* --- Sourcing intake (MMP) --- */
  { pattern: "/sourcing", path: "/sourcing", element: <SourcingModule />, heading: "Sourcing intake" },
  {
    pattern: "/sourcing/:tab",
    path: "/sourcing/locations",
    element: <SourcingModule />,
    heading: "Sourcing intake",
  },
  {
    pattern: "/sourcing/:tab",
    path: "/sourcing/intake",
    element: <SourcingModule />,
    heading: "Sourcing intake",
  },
  {
    pattern: "/sourcing/:tab",
    path: "/sourcing/warehouse",
    element: <SourcingModule />,
    heading: "Sourcing intake",
  },
  {
    pattern: "/sourcing/:tab",
    path: "/sourcing/funds",
    element: <SourcingModule />,
    heading: "Sourcing intake",
  },
  {
    pattern: "/sourcing/:tab",
    path: "/sourcing/balances",
    element: <SourcingModule />,
    heading: "Sourcing intake",
  },
  {
    pattern: "/sourcing/:tab",
    path: "/sourcing/agreements",
    element: <SourcingModule />,
    heading: "Sourcing intake",
  },

  /* --- Sourcing intake: the six add screens (MMP documents an Add form for each) --- */
  {
    pattern: "/sourcing/funds/new",
    path: "/sourcing/funds/new",
    element: <FundForm mode="create" />,
    heading: "New fund",
  },
  {
    pattern: "/sourcing/funds/:id/edit",
    path: "/sourcing/funds/fd-1/edit",
    element: <FundForm mode="edit" />,
    heading: "Edit 1123_204620341",
  },
  /* The requested-but-unpaid fund — the Update screen must hydrate with no rate at all. */
  {
    pattern: "/sourcing/funds/:id/edit",
    path: "/sourcing/funds/fd-5/edit",
    element: <FundForm mode="edit" />,
    heading: "Edit FND-2026-0005",
  },
  {
    pattern: "/sourcing/agreements/:id/edit",
    path: "/sourcing/agreements/pa-1/edit",
    element: <PurchaseAgreementForm mode="edit" />,
    heading: "Edit 1123_220822514",
  },
  /* The agreement with no per-bag tare — the checkbox must hydrate unticked. */
  {
    pattern: "/sourcing/agreements/:id/edit",
    path: "/sourcing/agreements/pa-5/edit",
    element: <PurchaseAgreementForm mode="edit" />,
    heading: "Edit 988_219905510",
  },
  {
    pattern: "/sourcing/agreements/new",
    path: "/sourcing/agreements/new",
    element: <PurchaseAgreementForm mode="create" />,
    heading: "New purchase agreement",
  },
  {
    pattern: "/sourcing/locations/new",
    path: "/sourcing/locations/new",
    element: <NewReceivingLocationForm />,
    heading: "New receiving location",
  },
  {
    pattern: "/sourcing/intake/new",
    path: "/sourcing/intake/new",
    element: <NewMaterialReceiptForm />,
    heading: "New material receipt",
  },
  {
    pattern: "/sourcing/warehouse/new",
    path: "/sourcing/warehouse/new",
    element: <NewWarehouseReceiptForm />,
    heading: "New warehouse receipt",
  },
  {
    pattern: "/sourcing/balances/new",
    path: "/sourcing/balances/new",
    element: <NewAgentBalanceForm />,
    heading: "New agent balance",
  },

  {
    pattern: "/sourcing/agreements/:id",
    path: "/sourcing/agreements/pa-1",
    element: <PurchaseAgreementDetail />,
    heading: "1123_220822514",
  },
  {
    // pa-3 is the captured over-allocated agreement: 25,700 MT against 17,777 MT agreed.
    pattern: "/sourcing/agreements/:id",
    path: "/sourcing/agreements/pa-3",
    element: <PurchaseAgreementDetail />,
    heading: "321_2009374",
  },
  {
    pattern: "/sourcing/receipts/:id",
    path: "/sourcing/receipts/ir-1",
    element: <IntakeReceiptDetail />,
    heading: "220551007",
  },
  {
    // ir-5 is the captured receipt whose bag counts MMP prints as 13123123.
    pattern: "/sourcing/receipts/:id",
    path: "/sourcing/receipts/ir-5",
    element: <IntakeReceiptDetail />,
    heading: "220736512",
  },

  /* --- Contract tabs added for v2.0 phases 04 and 05 --- */
  {
    pattern: "/contracts/:id/:tab",
    path: "/contracts/ct-1/review",
    element: <ContractDetail />,
    heading: "North Harbour Foods Ltd",
  },
  {
    pattern: "/contracts/:id/:tab",
    path: "/contracts/ct-1/quality",
    element: <ContractDetail />,
    heading: "North Harbour Foods Ltd",
  },
];

const PRE_EXISTING_ROUTES: Case[] = [
  { pattern: "/contracts", path: "/contracts", element: <ContractList />, heading: "Contracts" },
  { pattern: "/shipments", path: "/shipments", element: <ShipmentList />, heading: "Shipments & execution" },
  {
    pattern: "/clearance/:id",
    path: "/clearance/sh-1",
    element: <ClearanceWorkspace />,
    heading: "Clearance — PC-2041.1",
  },
  {
    pattern: "/stuffing/:id",
    path: "/stuffing/sh-1",
    element: <StuffingWorkspace />,
    heading: "Stuffing & loading — PC-2041.1",
  },
  {
    pattern: "/documents/:id",
    path: "/documents/sh-1",
    element: <DocumentsWorkspace />,
    heading: "Documents & charges — PC-2041.1",
  },
  {
    pattern: "/post-shipment/:id",
    path: "/post-shipment/sh-1",
    element: <PostShipmentWorkspace />,
    heading: "Post-shipment & bank — PC-2041.1",
  },
];

describe("routes added for workflow v2.0", () => {
  for (const c of V2_ROUTES) {
    it(`renders ${c.path}`, async () => {
      await expectPage(c.pattern, c.path, c.element, c.heading);
    });
  }

  it("covers every v2.0 route the brief lists", () => {
    // A guard on the guard: if a case is deleted the count drops and this fails.
    // 30 at the first v2.0 build, plus the seven sourcing screens added with the menu
    // reorder — the six add forms and the purchase-agreement tab, which stopped being
    // the default when funds took its place — plus the seven screens workflow v2.3
    // phases 01-02 added: the two list tabs, the two add forms and three record views
    // (two plans-and-budgets pairs, and the budget carrying no approval status) — plus
    // the three edit screens added afterwards, one per record type and one for the
    // budget that carries no approval status, since a blank field is what an edit form
    // most easily breaks on — plus the four sourcing edit screens added with the fund and
    // purchase-agreement reshape, two of which are the awkward cases: the fund that has
    // not been paid, and the agreement with no per-bag tare.
    expect(V2_ROUTES).toHaveLength(51);
    expect(new Set(V2_ROUTES.map((c) => c.path)).size).toBe(V2_ROUTES.length);
  });
});

describe("pre-existing routes still render", () => {
  for (const c of PRE_EXISTING_ROUTES) {
    it(`renders ${c.path}`, async () => {
      await expectPage(c.pattern, c.path, c.element, c.heading);
    });
  }
});

/* ================================================================== *
 * Every navigation destination resolves against the route table
 *
 * `modules.ts` states the rule as a comment — "every `to` here is a route that exists
 * in App.tsx" — and `workflow.ts` states the same for its screen links. Neither can be
 * enforced by the type system, so it is enforced here, against the real file.
 * ================================================================== */

/**
 * Route patterns as declared in App.tsx, read from the file itself — imported raw rather
 * than restated here, so the two cannot drift apart without this test noticing.
 */
function routePatternsFromApp(): string[] {
  const patterns: string[] = [];
  for (const m of appSource.matchAll(/\bpath="([^"]+)"/g)) {
    const raw = m[1];
    if (raw === "*") continue; // the catch-all would match everything and prove nothing
    patterns.push(raw.startsWith("/") ? raw : `/${raw}`);
  }
  return patterns;
}

/**
 * Minimal path matcher: a `:param` segment matches any one non-empty segment, anything
 * else must match literally, and the segment counts must be equal. That is all react-router
 * does for the patterns this table uses — no splats, no optional segments.
 */
function matchesPattern(pattern: string, path: string): boolean {
  const p = pattern.split("/").filter(Boolean);
  const t = path.split("/").filter(Boolean);
  if (p.length !== t.length) return false;
  return p.every((seg, i) => (seg.startsWith(":") ? t[i].length > 0 : seg === t[i]));
}

const PATTERNS = routePatternsFromApp();

describe("the route table", () => {
  it("was read out of App.tsx and is not empty", () => {
    expect(PATTERNS.length).toBeGreaterThan(30);
  });

  it("declares the login route and every module landing route", () => {
    for (const p of ["/login", "/process-map", "/origination", "/allocation", "/sourcing", "/movement"]) {
      expect(PATTERNS).toContain(p);
    }
  });

  it("matches a literal segment only literally", () => {
    expect(matchesPattern("/origination/new", "/origination/new")).toBe(true);
    expect(matchesPattern("/origination/new", "/origination/op-1")).toBe(false);
  });

  it("matches a :param segment against any one segment", () => {
    expect(matchesPattern("/origination/:id", "/origination/op-1")).toBe(true);
    expect(matchesPattern("/origination/:id", "/origination/op-1/extra")).toBe(false);
  });

  it("requires equal segment counts", () => {
    expect(matchesPattern("/sourcing", "/sourcing/funds")).toBe(false);
    expect(matchesPattern("/sourcing/:tab", "/sourcing")).toBe(false);
  });
});

describe("navigation destinations point at routes that exist", () => {
  const destinations = allDestinations();

  it("finds at least one destination to check", () => {
    expect(destinations.length).toBeGreaterThan(20);
  });

  for (const d of destinations) {
    it(`matches ${d.to} (${d.label})`, () => {
      expect(
        PATTERNS.some((p) => matchesPattern(p, d.to)),
        `nav destination ${d.to} matches no route in App.tsx`,
      ).toBe(true);
    });
  }
});

describe("process-map screen links point at routes that exist", () => {
  const screens = WORKFLOW_PHASES.flatMap((phase) => phase.screens.map((s) => ({ phase: phase.id, ...s })));

  it("finds a screen link on every phase", () => {
    expect(screens.length).toBeGreaterThanOrEqual(WORKFLOW_PHASES.length);
  });

  for (const s of screens) {
    it(`matches ${s.to} (${s.phase} — ${s.label})`, () => {
      expect(
        PATTERNS.some((p) => matchesPattern(p, s.to)),
        `${s.phase} screen "${s.label}" points at ${s.to}, which matches no route in App.tsx`,
      ).toBe(true);
    });
  }
});
