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
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";

import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/feedback";
import { ThemeProvider } from "../theme/ThemeContext";
import { api, resetStore, setLatency } from "../services/store";
import {
  clearPaymentTermsSource,
  isMasterPaymentInstrument,
  isMasterPaymentTerm,
  paymentInstruments,
  paymentTerms,
  paymentTermsSourceName,
  setPaymentTermsSource,
} from "../data/master";
import { CONTRACTS, EXECUTION_PLANS } from "../data/seed";
import { ROLE_LABEL } from "../domain/types";
import { TODAY } from "../domain/calc";
import { emptyDraft } from "../domain/purchase-contract";
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
import { ExecutionPlanForm } from "../pages/execution-plan-form";
import { ExportContractRequestForm } from "../pages/preclearance-form";
import { PreclearanceList } from "../pages/preclearance";
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

describe("execution planning can now raise a plan", () => {
  it("puts a visible New execution plan action in the planning tab's header", async () => {
    const { unmount } = renderRoute("/contracts/:id/:tab", "/contracts/ct-1/planning", <ContractDetail />);
    try {
      await screen.findByRole("heading", { level: 1, name: "North Harbour Foods Ltd" }, { timeout: 10_000 });
      const add = await screen.findAllByRole("link", { name: "New execution plan" });
      expect(add[0].getAttribute("href")).toBe("/contracts/ct-1/planning/new");
      /* `btn--on-brand` is styled for the dark page-header band — white text on a translucent
         fill — so on this white tab body it is very nearly invisible, which is how the button
         first shipped. jsdom loads no stylesheet, so the class is what can be asserted. */
      expect(add[0].className).toContain("btn--primary");
      expect(add[0].className).not.toContain("btn--on-brand");
    } finally {
      unmount();
    }
  }, 20_000);

  it("offers the action in the empty state too — the case that sent PC-2059 nowhere", async () => {
    /* Reproduces the screenshot exactly: a contract created in the mock-up, which has no
       execution plan and therefore no way to reach a shipment. Every seeded contract has
       plans, which is why the dead end was invisible until a real one was raised. */
    const created = await api.createContract({
      ...emptyDraft(TODAY),
      buyerId: "cp-anatolia",
      buyerAddress: "Ege Serbest Bölgesi, İzmir, Türkiye",
      buyerNickName: "Anatolia",
      commodityId: "cm-sesame-white",
      origin: "SD",
      traderName: "Tomás Ferreira",
      quantityMt: "750",
      tolerancePct: "5",
      shipmentPeriodStart: "2026-09-15",
      shipmentPeriodEnd: "2026-10-31",
      incoterm: "CNF",
      shipmentType: "container",
      methodOfShipping: "Sea",
      packingType: "bags",
      packingSizeKg: "50",
      freeDaysAtPort: "14",
      assignedDubaiExecution: "Rania Haddad",
      portOfDischargeId: "pt-mer",
      portOfLoadingId: "pt-psd",
      consignee: "CIM",
      notifyParty: "Anatolia Grain & Seed A.Ş.",
      notifyPartyAddress: "Ege Serbest Bölgesi, İzmir, Türkiye",
      partialShipment: "not_allowed",
      loadingContainerSize: "40ft",
      fumigationType: "phosphine",
      paymentTerms: "60 days from B/L date, D/A",
      lots: [{ key: "l1", quantityMt: "750", containerCount: "38" }],
    });
    if (!created.ok) return expect.unreachable();
    const newId = created.value.id;

    const { container, unmount } = renderRoute(
      "/contracts/:id/:tab",
      `/contracts/${newId}/planning`,
      <ContractDetail />,
    );
    try {
      await screen.findByText("No execution plan yet", {}, { timeout: 10_000 });
      /* The empty state carries the action, not only the header: on a page whose whole body
         says "nothing here", the header button is the easiest thing to miss. */
      const inEmpty = await screen.findByRole("link", { name: "Create an execution plan" });
      expect(inEmpty.getAttribute("href")).toBe(`/contracts/${newId}/planning/new`);
      /* And it says why it matters, which the bare empty state did not. */
      expect(container.textContent).toContain("cannot be raised against this contract until it has one");
    } finally {
      unmount();
      /* This is the only test in the file that writes to the store, and the contract list
         test counts records — so the write is undone rather than left for whatever runs
         next to trip over. */
      resetStore();
      setLatency(0);
    }
  }, 20_000);

  it("issues the next number in the contract's own sequence and defaults from the contract", async () => {
    const { container, unmount } = renderRoute(
      "/contracts/:id/planning/new",
      "/contracts/ct-1/planning/new",
      <ExecutionPlanForm />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New execution plan" });
      /* ct-1 already carries PC-2041.1 and .2, so the next is .3 — the contract's sequence,
         not a global one. */
      expect(container.textContent).toContain("PC-2041.3");
      /* Four values the contract settles, defaulted and still editable. ct-1 is 1,300 MT
         with 1,200 MT already planned across two lots, so 100 MT is unplanned. */
      expect(container.querySelector<HTMLInputElement>("input#ep-qty")?.value).toBe("100");
      expect(container.querySelector<HTMLInputElement>("input#ep-ship-before")?.value).toBe("2026-09-15");
      /* Issued and read, never asked for — the planning number, the status, and, since the
         second pass of 6 September, the assigned owner and the season too. */
      expect(container.querySelector("input#ep-no")).toBeNull();
      expect(container.querySelector("input#ep-status")).toBeNull();
      expect(container.querySelector("input#ep-assigned")).toBeNull();
      expect(container.querySelector("input#ep-season")).toBeNull();
      expect(container.textContent).toContain("Draft");
      /* ct-1's owner, read from the contract. */
      expect(container.querySelector("#ep-assigned")?.textContent).toContain("Rania Haddad");
      /* PC-2041 ships from 1 July 2026 — before October, so the previous crop year. */
      expect(container.querySelector("#ep-season")?.textContent).toContain("2025-2026");
      /* Shipper and bank are chosen from the master, not typed. */
      expect(container.querySelector("input#ep-shipper")).toBeNull();
      expect(container.querySelector("select#ep-shipper")).toBeTruthy();
      expect(container.querySelector("input#ep-bank")).toBeNull();
      expect(container.querySelector("select#ep-bank")).toBeTruthy();
      /* The branch list waits for its bank. */
      expect(container.querySelector<HTMLSelectElement>("select#ep-bank-branch")?.disabled).toBe(true);
    } finally {
      unmount();
    }
  }, 20_000);
});

describe("pre-clearance can now raise a request", () => {
  it("puts a New request action in the list header", async () => {
    const { unmount } = renderRoute("/pre-clearance", "/pre-clearance", <PreclearanceList />);
    try {
      await screen.findByRole("heading", { level: 1, name: "Pre-clearance" });
      const add = screen.getAllByRole("link", { name: "New request" });
      expect(add[0].getAttribute("href")).toBe("/pre-clearance/new");
    } finally {
      unmount();
    }
  }, 20_000);

  it("captures the request and not the issuance, and reads what the plan settles", async () => {
    const { container, unmount } = renderRoute(
      "/pre-clearance/new",
      "/pre-clearance/new",
      <ExportContractRequestForm />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New export contract request" });
      /* The request's own fields are there… */
      expect(container.querySelector("select#ec-plan")).toBeTruthy();
      expect(container.querySelector("input#ec-qty")).toBeTruthy();
      expect(container.querySelector("select#ec-entity")).toBeTruthy();
      /* …and none of the issuance fields is, because the ministry supplies them. */
      for (const id of ["ec-contract-no", "ec-issuance-date", "ec-expiry", "ec-actual-qty", "ec-status"]) {
        expect(container.querySelector(`#${id}`), id).toBeNull();
      }
      expect(container.textContent).toContain("This raises the request, not the contract");
      /* Read, not asked for. */
      expect(container.querySelector("input#ec-no")).toBeNull();
      expect(container.querySelector("input#ec-lv")).toBeNull();
    } finally {
      unmount();
    }
  }, 20_000);
});

describe("the shipment screen can reach the execution plan it needs", () => {
  it("offers a link to create one, and says why when the contract has none", async () => {
    /* ct-1 has two plans, so this is the plain case: the link is offered anyway, because a
       contract with plans may still need another. */
    const withPlans = renderRoute("/shipments/new", "/shipments/new?contract=ct-1", <ShipmentForm mode="create" />);
    try {
      await screen.findByRole("heading", { level: 1, name: "New shipment" });
      const link = await screen.findByRole("link", { name: "Create an execution plan" });
      expect(link.getAttribute("href")).toBe("/contracts/ct-1/planning/new?return=shipment");
    } finally {
      withPlans.unmount();
    }
  }, 20_000);

  it("comes back with the new plan selected", async () => {
    /* The return leg: `?plan=` is what the execution-plan screen hands back, and it is not
       overruled by the prefill. ep-2 stands in for a freshly created plan. */
    const { container, unmount } = renderRoute(
      "/shipments/new",
      "/shipments/new?contract=ct-1&plan=ep-2",
      <ShipmentForm mode="create" />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New shipment" });
      await screen.findByText(/Captured from PC-2041/, {}, { timeout: 10_000 });
      expect(container.querySelector<HTMLSelectElement>("select#sf-plan")?.value).toBe("ep-2");
    } finally {
      unmount();
    }
  }, 20_000);

  it("tells the plan screen to come back, and says so on it", async () => {
    const { container, unmount } = renderRoute(
      "/contracts/:id/planning/new",
      "/contracts/ct-1/planning/new?return=shipment",
      <ExecutionPlanForm />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New execution plan" });
      expect(container.textContent).toContain("Raised from the New shipment screen");
      /* Cancel returns where the user came from rather than dumping them on the contract. */
      const cancel = screen.getByRole("link", { name: "Cancel" });
      expect(cancel.getAttribute("href")).toBe("/shipments/new?contract=ct-1");
    } finally {
      unmount();
    }
  }, 20_000);
});

describe("the cross-functional review no longer asks who responded", () => {
  it("has no Responded by input on the review tab's feedback dialog", async () => {
    const { container, unmount } = renderRoute(
      "/contracts/:id/:tab",
      "/contracts/ct-1/review",
      <ContractDetail />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "North Harbour Foods Ltd" }, { timeout: 10_000 });
      /* The dialog renders only while open, so it has to be opened. Every row carries a
         Record feedback button; the first is Quality's. */
      const buttons = await screen.findAllByRole("button", { name: "Record feedback" }, { timeout: 10_000 });
      fireEvent.click(buttons[0]);
      await screen.findByRole("heading", { name: /Record Quality feedback/i });
      /* The label stays — the responder is on the record being saved — and the input is
         what has gone. */
      expect(container.querySelector("input#rv-by")).toBeNull();
      expect(container.querySelector("#rv-by")).toBeTruthy();
      expect(container.textContent).toContain("Read from the session");
      /* And the gap the change makes visible is stated rather than left implicit. */
      expect(container.textContent).toContain(
        "May a person record a response for a function they are not in?",
      );
    } finally {
      unmount();
    }
  }, 20_000);
});

describe("the new purchase contract screen reads packing size and consignee from master data", () => {
  it("offers the five master packing sizes as a list, not a text box", async () => {
    const { container, unmount } = renderRoute("/contracts/new", "/contracts/new", <PurchaseContractForm />);
    try {
      await screen.findByRole("heading", { level: 1, name: "New purchase contract" });
      expect(container.querySelector("input#pc-packing-size")).toBeNull();
      const sel = container.querySelector<HTMLSelectElement>("select#pc-packing-size");
      expect(sel).toBeTruthy();
      const values = [...(sel?.options ?? [])].map((o) => o.value).filter(Boolean);
      expect(values).toEqual(["50", "25", "10", "5", "1"]);
    } finally {
      unmount();
    }
  }, 20_000);

  it("offers the consignee master and asks for a name only when Others is chosen", async () => {
    const { container, unmount } = renderRoute("/contracts/new", "/contracts/new", <PurchaseContractForm />);
    try {
      await screen.findByRole("heading", { level: 1, name: "New purchase contract" });
      const sel = container.querySelector<HTMLSelectElement>("select#pc-consignee");
      expect(sel).toBeTruthy();
      expect([...(sel?.options ?? [])].map((o) => o.value).filter(Boolean)).toEqual([
        "CIM",
        "SAYGA",
        "DFI",
        "OTHER",
      ]);
      /* The blank form's legacy default is the shipping term "To order", which the master
         does not hold — so it reads as Others with the term kept as the name, rather than
         being blanked. The name box is therefore present from the start. */
      expect(sel?.value).toBe("OTHER");
      const other = container.querySelector<HTMLInputElement>("input#pc-consignee-other");
      expect(other?.value).toBe("To order");
    } finally {
      unmount();
    }
  }, 20_000);

  it("chooses the commodity type from the commodity's own grades, and drops Retrieve PC No.", async () => {
    const { container, unmount } = renderRoute(
      "/contracts/new",
      "/contracts/new?opportunity=op-1",
      <PurchaseContractForm />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New purchase contract" });
      /* Removed by the instruction of 6 September, and with it the third source the trader
         used to have — see the trader tests above. */
      expect(container.querySelector("#pc-retrieve")).toBeNull();
      /* Free text before; a list now, and the list belongs to the commodity. op-1 carries
         white sesame, whose grades include the one PC-2041 already holds. */
      expect(container.querySelector("input#pc-commodity-type")).toBeNull();
      const sel = container.querySelector<HTMLSelectElement>("select#pc-commodity-type");
      expect(sel).toBeTruthy();
      const grades = [...(sel?.options ?? [])].map((o) => o.value).filter(Boolean);
      expect(grades).toContain("Non-GDP");
      expect(grades).not.toContain("Barakat");
    } finally {
      unmount();
    }
  }, 20_000);

  it("leaves the commodity type disabled until a commodity is chosen", async () => {
    const { container, unmount } = renderRoute("/contracts/new", "/contracts/new", <PurchaseContractForm />);
    try {
      await screen.findByRole("heading", { level: 1, name: "New purchase contract" });
      const sel = container.querySelector<HTMLSelectElement>("select#pc-commodity-type");
      /* A grade with no commodity is a grade of nothing, so the control says so rather
         than offering an unexplained empty list. */
      expect(sel?.disabled).toBe(true);
      expect(container.textContent).toContain("Select the commodity first");
    } finally {
      unmount();
    }
  }, 20_000);

  it("drops Actual PC, which was captured here and never saved", async () => {
    const { container, unmount } = renderRoute("/contracts/new", "/contracts/new", <PurchaseContractForm />);
    try {
      await screen.findByRole("heading", { level: 1, name: "New purchase contract" });
      expect(container.querySelector("#pc-actual")).toBeNull();
      expect(screen.queryByLabelText("Actual PC")).toBeNull();
    } finally {
      unmount();
    }
  }, 20_000);

  it("carries one artwork design attachment", async () => {
    const { container, unmount } = renderRoute("/contracts/new", "/contracts/new", <PurchaseContractForm />);
    try {
      await screen.findByRole("heading", { level: 1, name: "New purchase contract" });
      const att = container.querySelector<HTMLInputElement>("input#pc-artwork-design");
      expect(att).toBeTruthy();
      /* One, not a slot list: the instruction asks for a single design file. */
      expect(container.querySelectorAll("input[id^='pc-artwork-design']")).toHaveLength(1);
    } finally {
      unmount();
    }
  }, 20_000);
});

describe("payment terms are read from master data on all three screens that ask for them", () => {
  /* "All payment terms should be a dropdown list, come from master data." — 8 September 2026.
     The three screens are the purchase contract, the deal agreement and the execution plan;
     the first two take the whole term and the third the instrument alone, which is what every
     captured plan holds. One master, read at two levels — so the lists are asserted against
     the master rather than against literals, and the *relationship* between them is asserted
     too: a second vocabulary would pass a list-of-strings test and fail this one. */

  it("offers the contract's terms as a list, from the master, not a text box", async () => {
    const { container, unmount } = renderRoute("/contracts/new", "/contracts/new", <PurchaseContractForm />);
    try {
      await screen.findByRole("heading", { level: 1, name: "New purchase contract" });
      expect(container.querySelector("input#pc-payment-terms")).toBeNull();
      const sel = container.querySelector<HTMLSelectElement>("select#pc-payment-terms");
      expect(sel).toBeTruthy();
      const values = [...(sel?.options ?? [])].map((o) => o.value).filter(Boolean);
      expect(values).toEqual(paymentTerms().filter((t) => t.active).map((t) => t.label));
      /* The four terms the captured contracts carry are in it — the packing-size lesson, as
         an assertion rather than as a comment. */
      expect(values).toContain("DA 60 days");
      expect(values).toContain("LC at sight");
      expect(values).toContain("CAD");
      expect(values).toContain("TT 30 days");
    } finally {
      unmount();
    }
  }, 20_000);

  it("keeps a deal's term the master does not hold, and marks it", async () => {
    const { container, unmount } = renderRoute(
      "/contracts/new",
      "/contracts/new?opportunity=op-1",
      <PurchaseContractForm />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New purchase contract" });
      const sel = container.querySelector<HTMLSelectElement>("select#pc-payment-terms");
      /* OPP-2026-014 carries "60 days from B/L date, D/A" — `DA 60 days` in words. §6.2
         activity 2 copies it here, and the master does not hold it. It is offered and marked
         rather than silently dropped, which is the trader-drop-down defect of 5 September. */
      await screen.findByText(/60 days from B\/L date, D\/A — not in the master/);
      expect(sel?.value).toBe("60 days from B/L date, D/A");
      expect(isMasterPaymentTerm("60 days from B/L date, D/A")).toBe(false);
    } finally {
      unmount();
    }
  }, 20_000);

  it("offers the same list on the deal agreement, so the deal and its contract can agree", async () => {
    const { container, unmount } = renderRoute("/origination/:id", "/origination/op-2", <OpportunityDetail />);
    try {
      await screen.findByRole("heading", { level: 1, name: "OPP-2026-015" });
      expect(container.querySelector("input#deal-payment")).toBeNull();
      const sel = container.querySelector<HTMLSelectElement>("select#deal-payment");
      expect(sel).toBeTruthy();
      expect([...(sel?.options ?? [])].map((o) => o.value).filter(Boolean)).toEqual(
        paymentTerms().filter((t) => t.active).map((t) => t.label),
      );
    } finally {
      unmount();
    }
  }, 20_000);

  it("offers the execution plan the instrument alone, which is what every captured plan holds", async () => {
    const { container, unmount } = renderRoute(
      "/contracts/:id/planning/new",
      "/contracts/ct-1/planning/new",
      <ExecutionPlanForm />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New execution plan" });
      expect(container.querySelector("input#ep-payment-terms")).toBeNull();
      const sel = container.querySelector<HTMLSelectElement>("select#ep-payment-terms");
      expect(sel).toBeTruthy();
      expect([...(sel?.options ?? [])].map((o) => o.value).filter(Boolean)).toEqual(
        paymentInstruments().filter((i) => i.active).map((i) => i.code),
      );
    } finally {
      unmount();
    }
  }, 20_000);

  it("holds every term and instrument the captured records carry", () => {
    /* The test that would have caught `Trade centre` if the bank-branch master had lost it,
       written for this master before anything is lost. Every value on a seeded contract and
       every value on a seeded plan must be one the master offers — except the two deals whose
       terms are written in words, which are the reason the master exists and are asserted to
       be outside it deliberately, above. */
    for (const c of CONTRACTS) {
      expect(isMasterPaymentTerm(c.paymentTerms)).toBe(true);
    }
    for (const p of EXECUTION_PLANS) {
      expect(isMasterPaymentInstrument(p.exportContractPaymentTerms)).toBe(true);
    }
    /* And the two levels are one domain: every term's instrument is an instrument the master
       holds. This is what makes the plan's short form a projection of the contract's list
       rather than a second vocabulary that happens to resemble it. */
    const codes = paymentInstruments().map((i) => i.code);
    for (const t of paymentTerms()) {
      expect(codes).toContain(t.instrument);
    }
  });

  it("lets an integrator replace the list, and names the master on screen", async () => {
    /* The seam the integrated mock-up uses to feed these screens from C03's `paymentterm`
       domain. This prototype cannot import Core — it builds and runs on its own — so the
       list above is the default and an integrator pushes over it at start-up, in the same
       direction as `CountrySync`. Asserted here rather than only in the merged project,
       because the seam lives in this file and a change here is what would break it. */
    setPaymentTermsSource({
      instruments: [{ code: "LC", name: "Letter of credit", active: true }],
      terms: [{ instrument: "LC", label: "LC at sight", tenorDays: 0, active: true }],
      name: "C03 master data — the payment-term domain",
    });
    try {
      expect(paymentTermsSourceName()).toBe("C03 master data — the payment-term domain");
      /* The lookups read the injected list, not the default: `DA 60 days` is in this
         prototype's own list and not in the one the integrator supplied. */
      expect(isMasterPaymentTerm("LC at sight")).toBe(true);
      expect(isMasterPaymentTerm("DA 60 days")).toBe(false);
      expect(isMasterPaymentInstrument("DA")).toBe(false);

      const { container, unmount } = renderRoute("/contracts/new", "/contracts/new", <PurchaseContractForm />);
      try {
        await screen.findByRole("heading", { level: 1, name: "New purchase contract" });
        const sel = container.querySelector<HTMLSelectElement>("select#pc-payment-terms");
        expect([...(sel?.options ?? [])].map((o) => o.value).filter(Boolean)).toEqual(["LC at sight"]);
        /* The screen says which master it is showing, so a reviewer can see the wiring. */
        expect(container.textContent).toContain("C03 master data — the payment-term domain");
      } finally {
        unmount();
      }
    } finally {
      clearPaymentTermsSource();
    }
  }, 20_000);

  it("falls back to the prototype's own list when no integrator supplies one", () => {
    /* Standalone is the default state, and it has to stay the default: nothing in this
       prototype calls `setPaymentTermsSource`. */
    expect(paymentTermsSourceName()).toBe("the Export prototype's own list");
    expect(isMasterPaymentTerm("DA 60 days")).toBe(true);
  });
});

describe("the cross-functional review no longer asks Processing to confirm", () => {
  /* "Remove Processing from this screen." — 8 September 2026. The reviewing functions are
     Quality, Partner / Country Execution and Finance. Processing keeps its readiness role at
     Phase 13, which is a different activity on a different screen — asserted below, because
     removing a role from one screen must not quietly remove it from the other. */

  it("shows three functions on the review tab, and Processing is not one of them", async () => {
    const { container, unmount } = renderRoute("/contracts/:id/:tab", "/contracts/ct-1/review", <ContractDetail />);
    try {
      await screen.findByRole("heading", { level: 2, name: "Cross-functional contract review" });
      const rows = [...container.querySelectorAll("table.dtable__table tbody tr")];
      const functions = rows.map((r) => r.querySelector("td strong")?.textContent);
      expect(functions).toEqual(["Quality", "Partner / Country Execution", "Finance"]);
      expect(functions).not.toContain("Processing");
      /* The prose and the section title counted to four and must not now disagree with the
         table — the defect that outlives a row deletion. */
      expect(container.textContent).not.toContain("Four confirmations");
      expect(container.textContent).not.toContain("The four fulfilment confirmations");
    } finally {
      unmount();
    }
  }, 20_000);

  it("carries no Processing feedback on any captured contract", () => {
    for (const c of CONTRACTS) {
      expect(c.reviewFeedback.some((f) => f.role === "processing")).toBe(false);
    }
  });

  it("keeps Processing as a role, because Phase 13 still uses it", () => {
    /* The role is not deleted from the model. Allocation names the Processing team for
       readiness feedback, and a screen change must not reach that far. */
    expect(ROLE_LABEL.processing).toBe("Processing");
  });
});

describe("the new opportunity screen no longer asks for a trader", () => {
  it("reads the trader from the session, with no control to type one", async () => {
    const { container, unmount } = renderRoute("/origination/new", "/origination/new", <OpportunityForm />);
    try {
      await screen.findByRole("heading", { level: 1, name: "New opportunity" });
      /* The label stays — the trader is on the record. The input is what has gone. */
      expect(container.textContent).toContain("Trader");
      expect(container.querySelector("input#opp-trader")).toBeNull();
      expect(container.querySelector("#opp-trader")).toBeTruthy();
      expect(container.textContent).toContain("Read from the session");
    } finally {
      unmount();
    }
  }, 20_000);

  it("offers a save alongside the check, and no longer claims nothing is written", async () => {
    const { container, unmount } = renderRoute("/origination/new", "/origination/new", <OpportunityForm />);
    try {
      await screen.findByRole("heading", { level: 1, name: "New opportunity" });
      /* The save the instruction of 6 September asked for, and the preview it replaced as
         the primary action — kept, because checking without writing is something this
         screen already did and nothing else in the module does. */
      expect(screen.getByRole("button", { name: "Save opportunity" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Check this opportunity" })).toBeTruthy();
      expect(container.textContent).not.toContain("it does not save");
      expect(container.textContent).not.toContain("has no create-opportunity operation");
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
      /* Container type is a list from the master, not free text. ct-1 is seeded without a
         loading container size, so nothing is defaulted — the screen offers the list. */
      expect(container.querySelector("input#sf-ctype")).toBeNull();
      const ctypes = [...(container.querySelector<HTMLSelectElement>("select#sf-ctype")?.options ?? [])]
        .map((o) => o.value)
        .filter(Boolean);
      expect(ctypes).toContain("20 FT standard");
      expect(ctypes).toContain("40 FT standard");
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
