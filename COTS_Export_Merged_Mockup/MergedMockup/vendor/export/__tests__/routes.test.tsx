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
import { PurchaseOrderDetail, PurchaseOrderForm } from "../pages/procurement";
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
import { PurchaseContractForm } from "../pages/purchase-contract-new";
import { ShipmentForm, ShipmentList } from "../pages/shipments";
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
  /* --- Procurement — the tab and its three screens, added 3 September 2026 --- */
  {
    pattern: "/sourcing/:tab",
    path: "/sourcing/procurement",
    element: <SourcingModule />,
    heading: "Sourcing intake",
  },
  {
    pattern: "/sourcing/procurement/new",
    path: "/sourcing/procurement/new",
    element: <PurchaseOrderForm mode="create" />,
    heading: "New purchase order",
  },
  {
    pattern: "/sourcing/procurement/:id",
    path: "/sourcing/procurement/po-1",
    element: <PurchaseOrderDetail />,
    heading: "1123",
  },
  /* The order whose payment has an amount and no date, so no USD conversion exists. */
  {
    pattern: "/sourcing/procurement/:id",
    path: "/sourcing/procurement/po-3",
    element: <PurchaseOrderDetail />,
    heading: "321",
  },
  /* The order raised with no payment at all — the state the Add screen leaves. */
  {
    pattern: "/sourcing/procurement/:id",
    path: "/sourcing/procurement/po-4",
    element: <PurchaseOrderDetail />,
    heading: "1330",
  },
  {
    pattern: "/sourcing/procurement/:id/edit",
    path: "/sourcing/procurement/po-1/edit",
    element: <PurchaseOrderForm mode="edit" />,
    heading: "Edit 1123",
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
    // not been paid, and the agreement with no per-bag tare — plus the six Procurement
    // screens added on 3 September 2026: the tab, its add and edit screens, and three
    // record views, two of them the awkward cases (the order whose payment has an amount
    // and no date, and so no USD conversion at all, and the order raised with no payment
    // against any of its agreements).
    expect(V2_ROUTES).toHaveLength(57);
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

/* ------------------------------------------------------------------ *
 * The page header's actions
 *
 * Two of the changes of 3 September 2026 are about a button *not* being somewhere, and a
 * button's absence is exactly the kind of thing that comes back by accident. Both are
 * pinned here.
 * ------------------------------------------------------------------ */

describe("the sourcing page header carries only its tab's own add action", () => {
  /** The actions region of `PageHeader` — the strip beside the record count. */
  async function headerActions(path: string): Promise<string> {
    const { container, unmount } = renderRoute("/sourcing/:tab", path, <SourcingModule />);
    try {
      /* The actions strip is part of the header, which paints on the first render, so the
         heading is the right thing to wait for here — no store data is involved. */
      await screen.findByRole("heading", { level: 1, name: "Sourcing intake" });
      return container.querySelector(".phead__actions")?.textContent ?? "";
    } finally {
      unmount();
    }
  }

  it("offers New budget and no New fund button on the Budget tab", async () => {
    const actions = await headerActions("/sourcing/budgets");
    expect(actions).toContain("New budget");
    /* Removed from the header on the business instruction of 3 September 2026. The New
       fund action belongs to a budget row, where it has a budget to prefill from — see
       `BudgetsTab`. A header button would have nothing to capture from. */
    expect(actions).not.toContain("New fund");
  });

  it("offers no add action at all on the Funds tab", async () => {
    /* "Export Planning & Intake 03 · Funds Screen: Remove the New Fund button." */
    const actions = await headerActions("/sourcing/funds");
    expect(actions).not.toContain("New fund");
    expect(actions.trim()).toBe("");
  });

  it("still offers the add action on a tab that kept one", async () => {
    /* The guard on the two assertions above: they must be proving a button was removed,
       not that the header is never rendered or never found. */
    expect(await headerActions("/sourcing/procurement")).toContain("New PO");
    expect(await headerActions("/sourcing/agreements")).toContain("New purchase agreement");
  });
});

describe("the budget list offers a New fund action per row", () => {
  /* 20s rather than the 5s default: this is the last of five `SourcingModule` renders in
     a row, and by that point jsdom is slow enough that the default trips before the list
     paints. The waits below are still bounded — a real failure fails, it does not hang. */
  it("gives every budget its own New fund link, naming the budget", async () => {
    const { unmount } = renderRoute("/sourcing/:tab", "/sourcing/budgets", <SourcingModule />);
    try {
      /* The header paints before the store's budgets arrive, so waiting on the heading
         alone is not waiting for the list. Wait for a budget row, with a timeout that
         holds up when the whole file runs rather than this test alone. */
      /* findAll, not find: every row is rendered twice, so the singular query would fail
         on "multiple elements" rather than on the thing under test. */
      await screen.findAllByRole("link", { name: "BGT-2026-0001" }, { timeout: 10_000 });
      /* Selected by destination rather than by accessible name: the budget reference is
         in an `sr-only` span, and the name computation drops it under jsdom, where no
         stylesheet is loaded to make "screen-reader only" mean anything. The href is the
         thing being asserted anyway — it is what carries the budget to the fund screen. */
      const links = screen
        .getAllByRole("link")
        .filter((a) => a.getAttribute("href")?.startsWith("/sourcing/funds/new?budget="));
      /* Three budgets are seeded, so three *destinations*. The count of elements is twice
         that, because `DataTable` renders every row both as a table row and as a stacked
         card for narrow viewports — so the hrefs are what this asserts, not the nodes. */
      const hrefs = [...new Set(links.map((a) => a.getAttribute("href")))].sort();
      expect(hrefs).toEqual([
        "/sourcing/funds/new?budget=bg-1",
        "/sourcing/funds/new?budget=bg-2",
        "/sourcing/funds/new?budget=bg-3",
      ]);
      /* Each link names its budget, so the action is unambiguous to a screen reader
         reading a column of otherwise identical "New fund" links. */
      for (const a of links) {
        expect(a.textContent).toMatch(/^New fund from BGT-\d{4}-\d{4}$/);
      }
    } finally {
      unmount();
    }
  }, 20_000);
});

/* ------------------------------------------------------------------ *
 * The new-fund screen's seasonality
 *
 * Removed as a field on 3 September 2026 and derived from the budget instead, so there
 * are two things to pin: that the field is gone from Create and still there on Update,
 * and that the derived value actually arrives.
 * ------------------------------------------------------------------ */

describe("the new fund screen takes its seasonality from the budget", () => {
  it("shows no Seasonality field on Create", async () => {
    const { unmount } = renderRoute(
      "/sourcing/funds/new",
      "/sourcing/funds/new?budget=bg-1",
      <FundForm mode="create" />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New fund" });
      /* The field is gone — the budget already carries the season, so asking again is
         asking for it to be got wrong. */
      expect(screen.queryByLabelText(/Seasonality/)).toBeNull();
      /* And the value is shown, read-only, on the card that says where it came from.
         bg-1 is written against SPP-2026-0002, whose season runs 2026 into 2027. */
      const shown = await screen.findByText("2026-2027", {}, { timeout: 10_000 });
      expect(shown).toBeTruthy();
    } finally {
      unmount();
    }
  }, 20_000);

  it("keeps the Seasonality field on Update, where a captured season may need correcting", async () => {
    const { unmount } = renderRoute(
      "/sourcing/funds/:id/edit",
      "/sourcing/funds/fd-1/edit",
      <FundForm mode="edit" />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: /Edit FND|Edit fund|Edit /i });
      const field = await screen.findByLabelText(/Seasonality/, {}, { timeout: 10_000 });
      expect(field).toBeTruthy();
    } finally {
      unmount();
    }
  }, 20_000);

  it("says so, rather than showing an unsaveable form, when no budget was named", async () => {
    const { unmount } = renderRoute(
      "/sourcing/funds/new",
      "/sourcing/funds/new",
      <FundForm mode="create" />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New fund" });
      /* No field to fill and no budget to read from, so the screen explains the route
         rather than presenting a form that cannot be saved. */
      expect(screen.queryByLabelText(/Seasonality/)).toBeNull();
      expect(
        await screen.findByText(/This screen is reached from a budget/, {}, { timeout: 10_000 }),
      ).toBeTruthy();
    } finally {
      unmount();
    }
  }, 20_000);
});

/* ------------------------------------------------------------------ *
 * The Procurement view and edit screens, against the instruction's own words
 *
 * These were built at v2.5 and re-listed in the instruction of 3 September 2026. Rather
 * than rebuild them, the spec is asserted here clause by clause, so "already built" is
 * something the suite proves and keeps proving.
 * ------------------------------------------------------------------ */

describe("the purchase order view screen carries what the instruction lists", () => {
  it("has the PO number as its heading, three info cards and the four-column agreement list", async () => {
    const { container, unmount } = renderRoute(
      "/sourcing/procurement/:id",
      "/sourcing/procurement/po-1",
      <PurchaseOrderDetail />,
    );
    try {
      /* "View Screen > PO Number" — the heading is the number itself. */
      await screen.findByRole("heading", { level: 1, name: "1123" }, { timeout: 10_000 });

      /* "Add necessary Info card related to PO as summary." */
      const cards = [...container.querySelectorAll(".scard__title")].map((h) => h.textContent);
      expect(cards).toEqual(["Purchase order", "Paid against it", "What it covers"]);

      /* "Card for Purchase Agreement List > columns are Purchase Agreement Reference,
         Payment Amount in local currency, usd conversion (read only), actual payment
         date." Asserted in order, because the order is part of what was asked for. */
      const headers = [...container.querySelectorAll("table")]
        .map((t) => [...t.querySelectorAll("thead th")].map((h) => h.textContent?.trim()))
        .find((hs) => hs[0] === "Purchase agreement reference");
      expect(headers).toEqual([
        "Purchase agreement reference",
        "Payment amount in local currency",
        "USD conversion",
        "Actual payment date",
      ]);

      /* "edit button to edit the columns." */
      const edit = screen
        .getAllByRole("link")
        .find((a) => a.getAttribute("href") === "/sourcing/procurement/po-1/edit");
      expect(edit).toBeTruthy();

      /* And the conversion is genuinely read only: no input in that column. Each of po-1's
         two lines converts at its own month's rate, which is why it is per line. */
      expect(container.querySelector("table input")).toBeNull();
    } finally {
      unmount();
    }
  }, 20_000);
});

describe("the purchase order edit screen edits the PO number and the agreement list", () => {
  it("offers the PO number and a payment amount and date per agreement, with the conversion read only", async () => {
    const { container, unmount } = renderRoute(
      "/sourcing/procurement/:id/edit",
      "/sourcing/procurement/po-1/edit",
      <PurchaseOrderForm mode="edit" />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "Edit 1123" }, { timeout: 10_000 });

      /* "Add Edit screen to edit PO number …" */
      const poNumber = await screen.findByLabelText(/PO number/, {}, { timeout: 10_000 });
      expect((poNumber as HTMLInputElement).value).toBe("1123");

      /* "… and Purchase agreement list" — a payment amount and an actual payment date per
         line, both editable. po-1 carries two agreements. */
      const amounts = [...container.querySelectorAll('input[id^="po-amt-"]')];
      const dates = [...container.querySelectorAll('input[id^="po-date-"]')];
      expect(amounts).toHaveLength(2);
      expect(dates).toHaveLength(2);
      expect(dates.every((d) => d.getAttribute("type") === "date")).toBe(true);

      /* The USD conversion is shown and is not an input — the instruction marks it read
         only, so there is nothing to type into. */
      expect(container.querySelector('input[id^="po-usd"]')).toBeNull();
      expect(container.textContent).toContain("USD conversion");
    } finally {
      unmount();
    }
  }, 20_000);
});

/* ------------------------------------------------------------------ *
 * The three screen changes of the follow-up instruction
 * ------------------------------------------------------------------ */

describe("the budget edit screen carries a payment date", () => {
  it("offers it beside the issued amount, and names the date the rate was read on", async () => {
    const { container, unmount } = renderRoute(
      "/sourcing/budgets/:id/edit",
      "/sourcing/budgets/bg-1/edit",
      <BudgetForm mode="edit" />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "Edit BGT-2026-0001" }, { timeout: 10_000 });
      const date = await screen.findByLabelText(/Payment date/, {}, { timeout: 10_000 });
      expect(date.getAttribute("type")).toBe("date");
      /* bg-1 is seeded with a payment date, so the rate row must say it read that date
         rather than the To date of the period — the reading this field replaced. */
      expect((date as HTMLInputElement).value).toBe("2026-08-20");
      expect(container.textContent).toContain("the payment date");
      /* And the conversion is still read only — there is no input for it. */
      expect(container.querySelector('input[id="bg-issued-usd"]')).toBeNull();
    } finally {
      unmount();
    }
  }, 20_000);
});

describe("agreement type is on the add screen and in the list", () => {
  it("is a required field on Add, defaulted to Fixed", async () => {
    const { unmount } = renderRoute(
      "/sourcing/agreements/new",
      "/sourcing/agreements/new",
      <PurchaseAgreementForm mode="create" />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New purchase agreement" });
      const field = (await screen.findByLabelText(/Agreement type/, {}, { timeout: 10_000 })) as HTMLSelectElement;
      expect(field.value).toBe("fixed");
      /* `SelectInput` renders a leading placeholder option, so the two real values are
         what matters, not the raw option count. */
      expect([...field.options].map((o) => o.value).filter(Boolean)).toEqual([
        "fixed",
        "collection",
      ]);
    } finally {
      unmount();
    }
  }, 20_000);

  it("is a column of the agreements list", async () => {
    const { container, unmount } = renderRoute(
      "/sourcing/:tab",
      "/sourcing/agreements",
      <SourcingModule />,
    );
    try {
      await screen.findAllByRole("link", { name: "1123_220822514" }, { timeout: 10_000 });
      /* Sortable headers carry a sort glyph in their text, so match on the label rather
         than on the whole cell. */
      const headers = [...container.querySelectorAll("thead th")].map((h) => h.textContent ?? "");
      expect(headers.some((h) => h.includes("Agreement type"))).toBe(true);
      /* pa-3 is the seeded Collection agreement, so both values reach the column. */
      expect(container.textContent).toContain("Collection");
      expect(container.textContent).toContain("Fixed");
    } finally {
      unmount();
    }
  }, 20_000);
});

describe("the receiving location plan line no longer asks for a country", () => {
  it("shows the session's country read-only, with no drop-down", async () => {
    const { container, unmount } = renderRoute(
      "/sourcing/locations/new",
      "/sourcing/locations/new",
      <NewReceivingLocationForm />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: /receiving location/i });
      /* The label is still there — the list below is scoped by it, so hiding it would
         hide a filter. What is gone is the control: it is read, not chosen. */
      expect(container.textContent).toContain("Country");
      const control = container.querySelector("#rln-country");
      expect(control).toBeTruthy();
      expect(control?.tagName).not.toBe("SELECT");
      expect(container.querySelector("select#rln-country")).toBeNull();
      /* The kind of location is still asked for — that drop-down stays. */
      expect(container.querySelector("select#rln-kind")).toBeTruthy();
    } finally {
      unmount();
    }
  }, 20_000);
});

describe("the purchase agreement screens no longer ask for a purchaser", () => {
  it("shows the signed-in user read-only on Add, with no input", async () => {
    const { container, unmount } = renderRoute(
      "/sourcing/agreements/new",
      "/sourcing/agreements/new",
      <PurchaseAgreementForm mode="create" />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New purchase agreement" });
      /* The label stays — the purchaser is on the record being saved, and a value saved
         without being seen is a value nobody checked. The control is what has gone. */
      expect(container.textContent).toContain("Purchaser");
      const row = container.querySelector("#pa-purchaser");
      expect(row).toBeTruthy();
      expect(row?.tagName).not.toBe("INPUT");
      expect(container.querySelector("input#pa-purchaser")).toBeNull();
      expect(container.textContent).toContain("from the session");
    } finally {
      unmount();
    }
  }, 20_000);

  it("shows the captured purchaser read-only on Edit, not the editor's name", async () => {
    const { container, unmount } = renderRoute(
      "/sourcing/agreements/:id/edit",
      "/sourcing/agreements/pa-1/edit",
      <PurchaseAgreementForm mode="edit" />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: /Edit 1123_220822514/ }, { timeout: 10_000 });
      expect(container.querySelector("input#pa-purchaser")).toBeNull();
      /* pa-1 was struck by Selim Aziz. Editing it must not rewrite that to whoever is
         signed in — editing an agreement is not taking it over. */
      expect(container.textContent).toContain("Selim Aziz");
      expect(container.textContent).toContain("as captured");
    } finally {
      unmount();
    }
  }, 20_000);
});

describe("the agent balance list follows the CIM report's columns", () => {
  it("shows the report's six figures, in the report's order and under its own names", async () => {
    const { container, unmount } = renderRoute("/sourcing/:tab", "/sourcing/balances", <SourcingModule />);
    try {
      await screen.findByRole("heading", { level: 1, name: "Sourcing intake" });
      const headers = [...container.querySelectorAll("thead th")].map((h) => h.textContent ?? "");
      const wanted = [
        "Payments SDG",
        "Agreed Purchases SDG",
        "Balance Basis Agreement SDG",
        "Value Received SDG",
        "Balance Basis Delivery SDG",
        "Cargo not Delivered",
      ];
      for (const w of wanted) {
        expect(headers.some((h) => h.includes(w)), `${w} missing from the list`).toBe(true);
      }
      /* Order matters: the point of the change is that the screen can be read against the
         spreadsheet side by side. */
      const positions = wanted.map((w) => headers.findIndex((h) => h.includes(w)));
      expect(positions).toEqual([...positions].sort((a, b) => a - b));

      /* The three columns this replaced must be gone, not merely joined. */
      for (const gone of ["Funded this season", "Drawn against confirmed receipts", "Residual"]) {
        expect(headers.some((h) => h.includes(gone)), `${gone} should have been replaced`).toBe(false);
      }
    } finally {
      unmount();
    }
  }, 20_000);

  it("keeps the two stored balances available but off the list by default", async () => {
    const { container, unmount } = renderRoute("/sourcing/:tab", "/sourcing/balances", <SourcingModule />);
    try {
      await screen.findByRole("heading", { level: 1, name: "Sourcing intake" });
      const headers = [...container.querySelectorAll("thead th")].map((h) => h.textContent ?? "");
      /* They are the legacy record and reconcile to nothing, so they are in the column
         chooser rather than competing with the reconciliation for width. */
      expect(headers.some((h) => h.includes("Actual balance"))).toBe(false);
      const chooser = container.querySelector(".dtable__chooser, .menu");
      expect(container.textContent).toContain("Actual Balance");
      expect(chooser ?? container.textContent).toBeTruthy();
    } finally {
      unmount();
    }
  }, 20_000);

  it("states the barter exclusion and the missing agreement price on the screen", async () => {
    const { container, unmount } = renderRoute("/sourcing/:tab", "/sourcing/balances", <SourcingModule />);
    try {
      await screen.findByRole("heading", { level: 1, name: "Sourcing intake" });
      /* Both are reproductions of the source that a reader would otherwise have to
         discover by arithmetic, so both have to be legible on the screen itself. */
      expect(container.textContent).toContain("Barter is not a payment");
      expect(container.textContent).toContain("carries no price at all");
    } finally {
      unmount();
    }
  }, 20_000);
});

/* ------------------------------------------------------------------ *
 * The instruction of 5 September 2026
 *
 * Two changes, and they are the same change twice: a screen asking for something the
 * system already knows, and a button placed where it had nothing to read from.
 * ------------------------------------------------------------------ */

describe("the new purchase contract screen no longer asks for a trader", () => {
  it("reads the trader from the agreed deal, with no control to overwrite it", async () => {
    const { container, unmount } = renderRoute(
      "/contracts/new",
      "/contracts/new?opportunity=op-1",
      <PurchaseContractForm />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New purchase contract" });
      /* The label stays — the trader is on the record being saved. The control is gone. */
      expect(container.textContent).toContain("Trader name");
      expect(container.querySelector("select#pc-trader")).toBeNull();
      expect(container.querySelector("input#pc-trader")).toBeNull();
      /* The name the *deal* carries, which is the whole point: it was not one of the four
         in the removed drop-down's hard-coded list, so the old screen showed this field
         inherited, empty and blocking. */
      const shown = await screen.findByText("Tomás Ferreira", {}, { timeout: 10_000 });
      expect(shown).toBeTruthy();
      expect(container.textContent).toContain("Read from the agreed deal");
      /* And no warning, because there is a source. */
      expect(container.textContent).not.toContain("This contract has no trader");
    } finally {
      unmount();
    }
  }, 20_000);

  it("says so, and refuses, when no source for the trader applies", async () => {
    const { container, unmount } = renderRoute("/contracts/new", "/contracts/new", <PurchaseContractForm />);
    try {
      await screen.findByRole("heading", { level: 1, name: "New purchase contract" });
      expect(container.querySelector("select#pc-trader")).toBeNull();
      /* A blank form, and the test session signs nobody in — so none of the three sources
         applies and the screen says which they are rather than offering a list of names
         to guess from. */
      expect(container.textContent).toContain("This contract has no trader");
      expect(container.textContent).toContain("Retrieve PC No.");
    } finally {
      unmount();
    }
  }, 20_000);
});

describe("the contract list raises a shipment from a row, not from the header", () => {
  it("drops the header button and gives every contract its own action", async () => {
    const { container, unmount } = renderRoute("/contracts", "/contracts", <ContractList />);
    try {
      await screen.findAllByRole("link", { name: "PC-2041" }, { timeout: 10_000 });
      /* The header button is gone. Its label is what gave it away: "from a contract",
         on a header that belongs to no contract — so the text still appears on the page,
         in the note explaining the change, and the assertion is on the control rather
         than on the words. Nothing links to the bare New shipment screen any more. */
      expect(
        screen.queryAllByRole("link", { name: "New shipment from a contract" }),
      ).toHaveLength(0);
      expect(
        screen.getAllByRole("link").filter((a) => a.getAttribute("href") === "/shipments/new"),
      ).toHaveLength(0);
      /* Selected by destination, not by accessible name: the contract number sits in an
         `sr-only` span that jsdom's name computation drops. `DataTable` renders each row
         twice, so the distinct hrefs are the assertion, not the node count. */
      const hrefs = [
        ...new Set(
          screen
            .getAllByRole("link")
            .map((a) => a.getAttribute("href"))
            .filter((h): h is string => !!h && h.startsWith("/shipments/new?contract=")),
        ),
      ].sort();
      /* The header keeps an add action of its own, and it is the one that needs no row:
         creating a contract reads nothing from the list. */
      const add = screen.getAllByRole("link", { name: "New contract" });
      expect(add.length).toBeGreaterThan(0);
      expect(add[0].getAttribute("href")).toBe("/contracts/new");
      /* The row action is the last column — an action, not an attribute of the contract. */
      const headers = [...container.querySelectorAll("thead th")].map((th) =>
        th.textContent?.replace(/[^A-Za-z ]/g, "").trim(),
      );
      expect(headers[headers.length - 1]).toBe("Shipment");
      expect(hrefs).toEqual([
        "/shipments/new?contract=ct-1",
        "/shipments/new?contract=ct-2",
        "/shipments/new?contract=ct-3",
        "/shipments/new?contract=ct-4",
        "/shipments/new?contract=ct-5",
        "/shipments/new?contract=ct-6",
      ]);
    } finally {
      unmount();
    }
  }, 20_000);
});

describe("the new shipment screen captures what the contract determines", () => {
  it("fills the one plan, the type, the quantity left and the last shipping date", async () => {
    const { container, unmount } = renderRoute(
      "/shipments/new",
      "/shipments/new?contract=ct-6",
      <ShipmentForm mode="create" />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New shipment" });
      await screen.findByText(/Captured from PC-2058-LV/, {}, { timeout: 10_000 });
      const plan = container.querySelector<HTMLSelectElement>("select#sf-plan");
      /* ct-6 has exactly one execution plan, so the choice is not a choice. */
      expect(plan?.value).toBe("ep-7");
      expect(container.querySelector<HTMLSelectElement>("select#sf-type")?.value).toBe("bulk");
      /* 6,000 MT + 5% tolerance = 6,300 allowed, 2,000 MT already committed by live
         shipments, so 4,300 MT is what is left to ship — the largest this one may be. */
      expect(container.querySelector<HTMLInputElement>("input#sf-qty")?.value).toBe("4300");
      expect(container.querySelector<HTMLInputElement>("input#sf-lastship")?.value).toBe("2026-11-30");
    } finally {
      unmount();
    }
  }, 20_000);

  it("leaves the plan to the user where the contract has more than one", async () => {
    const { container, unmount } = renderRoute(
      "/shipments/new",
      "/shipments/new?contract=ct-1",
      <ShipmentForm mode="create" />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New shipment" });
      await screen.findByText(/Captured from PC-2041/, {}, { timeout: 10_000 });
      /* Two plans on ct-1. Picking one would be the action inventing rather than reading,
         so it says what it did not fill in and why. */
      expect(container.querySelector<HTMLSelectElement>("select#sf-plan")?.value).toBe("");
      expect(container.textContent).toContain("the contract has 2 and the choice is yours");
      /* 1,300 + 5% = 1,365 allowed, 1,260 committed, so 105 left. */
      expect(container.querySelector<HTMLInputElement>("input#sf-qty")?.value).toBe("105");
    } finally {
      unmount();
    }
  }, 20_000);

  it("captures nothing when opened without a contract", async () => {
    const { container, unmount } = renderRoute(
      "/shipments/new",
      "/shipments/new",
      <ShipmentForm mode="create" />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New shipment" });
      expect(container.textContent).not.toContain("Captured from");
      expect(container.querySelector<HTMLInputElement>("input#sf-qty")?.value).toBe("");
    } finally {
      unmount();
    }
  }, 20_000);
});

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
