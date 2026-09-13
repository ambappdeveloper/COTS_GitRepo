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
import { afterEach, describe, expect, it } from "vitest";
import type { ReactElement } from "react";

import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/feedback";
import { ThemeProvider } from "../theme/ThemeContext";
import {
  activeCountryScope,
  api,
  resetStore,
  resolvedMilestonesFor,
  setCountryScope,
  setLatency,
} from "../services/store";
import {
  clearPaymentTermsSource,
  isMasterPaymentInstrument,
  isMasterPaymentTerm,
  paymentInstruments,
  paymentTerms,
  paymentTermsSourceName,
  setPaymentTermsSource,
} from "../data/master";
import { CARGO_READINESS, CONTRACTS, EXPORT_CONTRACTS, SHIPMENTS } from "../data/seed";
import { EXECUTION_FLOW } from "../domain/milestones";
import { COUNTRY_PROFILES, reviewPriceLegsFor } from "../domain/variants";
import { ADVANCE_PAYMENTS } from "../data/seed-v2";
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
import { ExportContractRequestForm } from "../pages/preclearance-form";
import { PreclearanceList } from "../pages/preclearance";
import { ShipmentDetail, ShipmentForm, ShipmentList } from "../pages/shipments";
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

  it("captures the request and not the issuance, and is raised against the contract", async () => {
    const { container, unmount } = renderRoute(
      "/pre-clearance/new",
      "/pre-clearance/new",
      <ExportContractRequestForm />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New export contract request" });
      /* The request's own fields are there… */
      /* `select#ec-plan` until 8 September 2026, when execution planning was removed and the
         request was re-pointed at the contract it was always ultimately for. */
      expect(container.querySelector("#ec-plan")).toBeNull();
      expect(container.querySelector("select#ec-contract")).toBeTruthy();
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

  it("holds every term and instrument the captured records carry", () => {
    /* The test that would have caught `Trade centre` if the bank-branch master had lost it,
       written for this master before anything is lost. Every value on a seeded contract must
       be one the master offers — except the two deals whose terms are written in words, which
       are the reason the master exists and are asserted to be outside it deliberately, above.

       The companion loop over `EXECUTION_PLANS` went on 8 September 2026 with execution
       planning. That leaves the instrument level with no record reading it: the plan's
       `exportContractPaymentTerms` was its only consumer. The list is kept, because it is the
       parent of the term list and a C03 domain in its own right, but nothing carries an
       instrument alone any more — see CHANGES.md. */
    for (const c of CONTRACTS) {
      expect(isMasterPaymentTerm(c.paymentTerms)).toBe(true);
    }
    /* The two levels are still one domain: every term's instrument is an instrument the master
       holds. That join is now the only thing keeping the two lists honest. */
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

describe("bank details are asked of Finance on each Sudan split", () => {
  /* "Request bank details only for Sudan. After split shipment ask bank details for each split.
     There should be notification to finance once split so they enter bank details (bank name,
     branch name)." — 9 September 2026. */

  it("asks for them on a Sudan split that has none, and says nothing is blocked", async () => {
    /* sh-8 is Sudan and carries no bank details — the outstanding case. */
    const { container, unmount } = renderRoute("/shipments/:id", "/shipments/sh-8", <ShipmentDetail />);
    try {
      await screen.findByRole("heading", { level: 1 }, { timeout: 10_000 });
      expect(container.textContent).toContain("Bank details");
      expect(container.querySelector("select#sb-bank")).toBeTruthy();
      expect(container.querySelector("select#sb-branch")).toBeTruthy();
      expect(container.textContent).toContain("nothing is blocked");
    } finally {
      unmount();
    }
  }, 20_000);

  it("shows what was recorded, and a way to change it, once they are held", async () => {
    const { container, unmount } = renderRoute("/shipments/:id", "/shipments/sh-1", <ShipmentDetail />);
    try {
      await screen.findByRole("heading", { level: 1 }, { timeout: 10_000 });
      /* sh-1 carries the bank its execution plan named before planning was removed. */
      expect(container.textContent).toContain("Unity Commercial Bank");
      expect(container.textContent).toContain("Head office");
      /* Read-only until asked otherwise… */
      expect(container.querySelector("select#sb-bank")).toBeNull();

      /* …but reachable. The first version of this card had no control at all once the details
         existed, so a bank recorded wrongly was recorded for good. */
      const change = await screen.findByRole("button", { name: "Change bank details" });
      fireEvent.click(change);
      const sel = container.querySelector<HTMLSelectElement>("select#sb-bank");
      expect(sel).toBeTruthy();
      /* Pre-filled with what is held, not blank — changing one field must not silently clear
         the other. */
      expect(sel?.value).toBe("cp-bank-unity");
      expect(container.querySelector<HTMLSelectElement>("select#sb-branch")?.value).toBe("Head office");
      expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    } finally {
      unmount();
    }
  }, 20_000);

  it("does not ask outside Sudan, and says why", async () => {
    /* sh-6 is Tanzania. The card renders and explains rather than disappearing, so a reviewer
       can see the rule instead of wondering where the field went. */
    const { container, unmount } = renderRoute("/shipments/:id", "/shipments/sh-6", <ShipmentDetail />);
    try {
      await screen.findByRole("heading", { level: 1 }, { timeout: 10_000 });
      expect(container.textContent).toContain("Not requested in Tanzania");
      expect(container.querySelector("select#sb-bank")).toBeNull();
    } finally {
      unmount();
    }
  }, 20_000);

  it("is required by the country profile, not by a country code in the screen", () => {
    expect(COUNTRY_PROFILES.SD.requiresShipmentBankDetails).toBe(true);
    for (const code of ["ET", "TZ", "MZ", "TD"] as const) {
      expect(COUNTRY_PROFILES[code].requiresShipmentBankDetails, code).toBe(false);
    }
  });

  it("raises the milestone against Finance on a Sudan split, and only there", () => {
    /* This is the notification: Export keeps no task queue, so an unanswered milestone owned by
       Finance is what puts the split in front of them in the one Actions Inbox. */
    const def = EXECUTION_FLOW.find((m) => m.key === "shipment_bank_details");
    expect(def).toBeTruthy();
    expect(def?.owner).toBe("finance");

    const sudan = SHIPMENTS.find((x) => x.id === "sh-8")!;
    const outstanding = resolvedMilestonesFor(sudan).find((m) => m.def.key === "shipment_bank_details");
    /* Actionable, not complete — which is what makes it a task. */
    expect(outstanding?.state).not.toBe("not_applicable");
    expect(outstanding?.state).not.toBe("completed");

    const tanzania = SHIPMENTS.find((x) => x.id === "sh-6")!;
    expect(
      resolvedMilestonesFor(tanzania).find((m) => m.def.key === "shipment_bank_details")?.state,
    ).toBe("not_applicable");
  });

  it("no longer carries a milestone for the record that was deleted", () => {
    /* `execution_plan_created` went with execution planning. A prerequisite naming a milestone
       the flow does not define is never met, so leaving it would have stalled the export-contract
       step for ever. */
    expect(EXECUTION_FLOW.some((m) => m.key === "execution_plan_created")).toBe(false);
    for (const def of EXECUTION_FLOW) {
      for (const p of def.prerequisites) {
        expect(EXECUTION_FLOW.some((m) => m.key === p), `${def.key} → ${p}`).toBe(true);
      }
    }
  });
});

describe("the execution plan is no longer a record either", () => {
  /* "Remove it in all places it's no longer needed and remove the executionPlanId from all
     records that contains it." — 8 September 2026, the second half of the same instruction.
     Shipment, ExportContract and AdvancePayment all already carried `contractId`, so they
     simply lost a field. CargoReadiness had no other parent and was re-pointed at the
     shipment. */

  it("carries no executionPlanId on any seeded record", () => {
    const carriers: Record<string, unknown[]> = {
      shipments: SHIPMENTS,
      exportContracts: EXPORT_CONTRACTS,
      cargoReadiness: CARGO_READINESS,
      advancePayments: ADVANCE_PAYMENTS,
    };
    for (const [name, rows] of Object.entries(carriers)) {
      for (const r of rows as Record<string, unknown>[]) {
        expect(`${name}: ${JSON.stringify(Object.keys(r))}`).not.toContain("executionPlanId");
      }
    }
  });

  it("keys cargo readiness to a shipment that exists", () => {
    /* The re-parenting is only worth anything if every readiness row lands on a real
       shipment — seven rows moved, and a typo in one of them would be invisible on screen. */
    for (const cr of CARGO_READINESS) {
      expect(cr.shipmentId, cr.id).toBeTruthy();
      expect(SHIPMENTS.some((s) => s.id === cr.shipmentId), cr.id).toBe(true);
    }
  });

  it("still reaches cargo readiness from the shipment screen", async () => {
    const { container, unmount } = renderRoute("/shipments/:id/:tab", "/shipments/sh-1/planning", <ShipmentDetail />);
    try {
      /* The page title is the buyer; the shipment number is in the meta line. */
      await screen.findByRole("heading", { level: 1, name: "North Harbour Foods Ltd" }, { timeout: 10_000 });
      expect(container.textContent).toContain("PC-2041.1");
      expect(container.textContent).toContain("Cargo readiness");
      /* sh-1 carried ep-1's readiness before the move. */
      expect(container.textContent).not.toContain("No cargo readiness record");
    } finally {
      unmount();
    }
  }, 20_000);
});

describe("execution planning is no longer a screen", () => {
  /* "Remove execution plan screen from the project in all places" — 8 September 2026, on the
     grounds that split shipments make the plan redundant. Two screens went: the contract's
     Execution planning tab and the New execution plan form. The record is untouched for now —
     shipments still carry `executionPlanId` and the seeded plans still exist — so these tests
     assert the screens are gone, not the model. */

  it("has no Execution planning tab on the contract", async () => {
    const { container, unmount } = renderRoute("/contracts/:id/:tab", "/contracts/ct-1/summary", <ContractDetail />);
    try {
      await screen.findByRole("heading", { level: 1, name: "North Harbour Foods Ltd" }, { timeout: 10_000 });
      expect(screen.queryAllByRole("link", { name: "Execution planning" })).toHaveLength(0);
      expect(container.textContent).not.toContain("Execution planning");
    } finally {
      unmount();
    }
  }, 20_000);

  it("offers no route to the create form, from anywhere", async () => {
    /* The two links that pointed at it — the planning tab's header and empty state, and the
       shipment screen's hint — are gone with it. A link to a route that no longer exists is
       worse than no link: it lands on the not-part-of-the-demonstration page. */
    for (const [pattern, path, element] of [
      ["/contracts/:id/:tab", "/contracts/ct-1/summary", <ContractDetail />],
      ["/contracts", "/contracts", <ContractList />],
      ["/shipments/new", "/shipments/new?contract=ct-1", <ShipmentForm mode="create" />],
    ] as const) {
      const { unmount } = renderRoute(pattern, path, element);
      try {
        await screen.findAllByRole("link", {}, { timeout: 10_000 }).catch(() => []);
        const hrefs = screen.queryAllByRole("link").map((a) => a.getAttribute("href") ?? "");
        expect(hrefs.filter((h) => h.includes("/planning"))).toEqual([]);
      } finally {
        unmount();
      }
    }
  }, 30_000);

  it("says plainly on the shipment screen that a plan can no longer be created", async () => {
    const { container, unmount } = renderRoute("/shipments/new", "/shipments/new?contract=ct-9999", <ShipmentForm mode="create" />);
    try {
      await screen.findByRole("heading", { level: 1, name: "New shipment" });
      expect(screen.queryAllByRole("link", { name: "Create an execution plan" })).toHaveLength(0);
      expect(container.textContent).not.toContain("you will come back here with it selected");
    } finally {
      unmount();
    }
  }, 20_000);
});

describe("the tag specification is a two-party workflow", () => {
  /* "Origin execution will send tag and Dubai execution will confirm or add amendment; there is
     a workflow." — 9 September 2026. The single form with a State drop-down became a hand-off:
     Origin sends, Dubai confirms or returns an amendment, and every leg is kept. */

  async function openQualityTab() {
    const r = renderRoute("/contracts/:id/:tab", "/contracts/ct-1/quality", <ContractDetail />);
    await screen.findByRole("heading", { level: 2, name: "Quality terms and the tags specification" });
    return r;
  }

  it("starts with Origin Execution and offers no state to choose", async () => {
    const { container, unmount } = await openQualityTab();
    try {
      /* The State drop-down has gone: a hand-off is performed, not selected, and a control that
         let either party set any state was how the record could say confirmed with nobody having
         confirmed anything. */
      expect(container.querySelector("#tg-state")).toBeNull();
      expect(container.textContent).toContain("Origin Execution — nothing has been sent yet");
      expect(screen.getByRole("button", { name: "Send tag specification" })).toBeTruthy();
      /* Dubai's actions are not offered before anything has been sent. */
      expect(screen.queryByRole("button", { name: "Confirm the tag" })).toBeNull();
    } finally {
      unmount();
    }
  }, 20_000);

  it("carries the attachment on the send, inside the tags section", async () => {
    const { container, unmount } = await openQualityTab();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Send tag specification" }));
      const field = container.querySelector<HTMLInputElement>("input#tg-attachment");
      expect(field).toBeTruthy();
      /* A name, not a file — the same statement the contract form's Artwork design makes. */
      expect(field?.type).toBe("text");
      expect(container.textContent).toContain("this prototype stores names, not files");
      /* And it belongs to the leg, which is what answers the question left open on 8 September
         about a single attachment being overwritten. */
      expect(container.textContent).toContain("Each send keeps its own");
    } finally {
      unmount();
    }
  }, 20_000);

  it("walks send → amend → send → confirm, keeping every leg", async () => {
    const first = await api.recordTagSpecificationAction("ct-1", "sent", {
      by: "Amara Osei",
      option: "buyer",
      customTags: ["Buyer logo", "Arabic weight panel"],
      attachmentFileName: "northharbour-tag-v1.pdf",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.tagSpecification?.state).toBe("sent");
    expect(first.value.tagSpecification?.exchange[0].party).toBe("partner_execution");

    /* An amendment must say what is to change. */
    const empty = await api.recordTagSpecificationAction("ct-1", "amended", { by: "Leila Haddad" });
    expect(empty.ok).toBe(false);

    const amended = await api.recordTagSpecificationAction("ct-1", "amended", {
      by: "Leila Haddad",
      note: "Arabic panel must carry the net weight in kg, not MT.",
    });
    expect(amended.ok).toBe(true);
    if (!amended.ok) return;
    expect(amended.value.tagSpecification?.state).toBe("amended");
    expect(amended.value.tagSpecification?.exchange[1].party).toBe("dubai_execution");

    /* Dubai cannot confirm while it is back with Origin — the transition table says so. */
    const early = await api.recordTagSpecificationAction("ct-1", "confirmed", { by: "Leila Haddad" });
    expect(early.ok).toBe(false);

    const resent = await api.recordTagSpecificationAction("ct-1", "sent", {
      by: "Amara Osei",
      option: "buyer",
      customTags: ["Buyer logo", "Arabic weight panel (kg)"],
      attachmentFileName: "northharbour-tag-v2.pdf",
    });
    expect(resent.ok).toBe(true);

    const confirmed = await api.recordTagSpecificationAction("ct-1", "confirmed", { by: "Leila Haddad" });
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    const spec = confirmed.value.tagSpecification!;
    expect(spec.state).toBe("confirmed");
    expect(spec.agreedBy).toBe("Leila Haddad");

    /* Four legs, in order, and the first amendment is still readable after the second send —
       which is the whole reason the exchange is a list and not a note field. */
    expect(spec.exchange.map((e) => e.action)).toEqual(["sent", "amended", "sent", "confirmed"]);
    expect(spec.exchange[1].note).toContain("net weight in kg");
    expect(spec.exchange[0].attachmentFileName).toBe("northharbour-tag-v1.pdf");
    expect(spec.exchange[2].attachmentFileName).toBe("northharbour-tag-v2.pdf");
  });

  it("refuses a buyer option sent with no custom tags, as §6.5 activity 3 requires", async () => {
    const res = await api.recordTagSpecificationAction("ct-2", "sent", {
      by: "Amara Osei",
      option: "buyer",
      customTags: [],
    });
    expect(res.ok).toBe(false);
  });
});

describe("Finance records a price per country of the route", () => {
  /* "If country is Sudan user can add price for Sudan only; for other countries user can add
     price between one or two countries. This should be entered by finance." — 9 September 2026.
     The countries are the contract's origin and, where the profile names one, its transit
     country — so Sudan is one row and Chad or Ethiopia two. */

  async function openFeedback(contractId: string, rowIndex: number) {
    const r = renderRoute("/contracts/:id/:tab", `/contracts/${contractId}/review`, <ContractDetail />);
    await screen.findByRole("heading", { level: 2, name: "Cross-functional contract review" });
    const buttons = await screen.findAllByRole("button", { name: "Record feedback" }, { timeout: 10_000 });
    fireEvent.click(buttons[rowIndex]);
    return r;
  }

  it("derives one leg for Sudan and two where there is an inland leg", () => {
    /* The form and the service layer read the same function, so they cannot disagree about
       which countries may be priced. */
    expect(reviewPriceLegsFor({ origin: "SD" }).map((l) => l.countryName)).toEqual(["Sudan"]);
    expect(reviewPriceLegsFor({ origin: "TZ" }).map((l) => l.countryName)).toEqual(["Tanzania"]);
    expect(reviewPriceLegsFor({ origin: "ET" }).map((l) => l.countryName)).toEqual(["Ethiopia", "Djibouti"]);
    expect(reviewPriceLegsFor({ origin: "TD" }).map((l) => l.countryName)).toEqual(["Chad", "Cameroon"]);
  });

  it("asks Finance for one price on a Sudan contract, and nobody else for any", async () => {
    /* ct-1 is Sudan. The rows are Quality, Partner / Country Execution, Finance. */
    const quality = await openFeedback("ct-1", 0);
    try {
      expect(quality.container.querySelector("#rv-price-origin")).toBeNull();
    } finally {
      quality.unmount();
    }

    const finance = await openFeedback("ct-1", 2);
    try {
      expect(finance.container.querySelector("input#rv-price-origin")).toBeTruthy();
      /* Sudan loads at Port Sudan and never leaves — one country, so no transit row. */
      expect(finance.container.querySelector("#rv-price-transit")).toBeNull();
      expect(finance.container.textContent).toContain("Price — Sudan");
      expect(finance.container.textContent).toContain("loads in its own country");
    } finally {
      finance.unmount();
    }
  }, 30_000);

  it("asks Finance for two on a contract with an inland leg", async () => {
    /* ct-3 is Chad — overland to Douala, which is in Cameroon. */
    const { container, unmount } = await openFeedback("ct-3", 2);
    try {
      expect(container.querySelector("input#rv-price-origin")).toBeTruthy();
      expect(container.querySelector("input#rv-price-transit")).toBeTruthy();
      expect(container.textContent).toContain("Price — Chad");
      expect(container.textContent).toContain("Price — Cameroon");
    } finally {
      unmount();
    }
  }, 20_000);

  it("stores Finance's prices and refuses everyone else's", async () => {
    const ok = await api.recordReviewFeedback("ct-3", "finance", "confirmed", {
      respondedBy: "Nasreen Sayed",
      prices: [
        { leg: "origin", countryName: "Chad", amount: { amount: 1200, currency: "USD" } },
        { leg: "transit", countryName: "Cameroon", amount: { amount: 340, currency: "USD" } },
      ],
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.value.reviewFeedback.find((f) => f.role === "finance")?.prices).toHaveLength(2);

    /* Quality confirms it can fulfil; it is not asked about money, and the service layer says so
       rather than filing a figure under the wrong function. */
    const wrongRole = await api.recordReviewFeedback("ct-3", "quality", "confirmed", {
      respondedBy: "Nadia Kimani",
      prices: [{ leg: "origin", countryName: "Chad", amount: { amount: 10, currency: "USD" } }],
    });
    expect(wrongRole.ok).toBe(false);
  });

  it("refuses a leg the route does not have", async () => {
    /* Sudan has no transit country, so a price filed against one would be a figure for a
       country the cargo never enters. */
    const res = await api.recordReviewFeedback("ct-1", "finance", "confirmed", {
      respondedBy: "Nasreen Sayed",
      prices: [{ leg: "transit", countryName: "Djibouti", amount: { amount: 500, currency: "USD" } }],
    });
    expect(res.ok).toBe(false);
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
  it("fills the type and the quantity left, and no longer asks for the two dates", async () => {
    const { container, unmount } = renderRoute(
      "/shipments/new",
      "/shipments/new?contract=ct-6",
      <ShipmentForm mode="create" />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New shipment" });
      await screen.findByText(/Captured from PC-2058-LV/, {}, { timeout: 10_000 });
      /* The plan was the first thing this action captured, where the contract had exactly
         one. There is no plan to capture since 8 September 2026, and no control to hold it. */
      expect(container.querySelector("#sf-plan")).toBeNull();
      expect(container.querySelector<HTMLSelectElement>("select#sf-type")?.value).toBe("bulk");
      /* 6,000 MT + 5% tolerance = 6,300 allowed, 2,000 MT already committed by live
         shipments, so 4,300 MT is what is left to ship — the largest this one may be. */
      expect(container.querySelector<HTMLInputElement>("input#sf-qty")?.value).toBe("4300");
      /* The last shipping date was captured into a field here until 8 September 2026, when the
         instruction removed it and the cargo readiness date from this screen. The contract
         still settles it and `createShipment` still records it — it is simply not asked for. */
      expect(container.querySelector("#sf-lastship")).toBeNull();
      expect(container.querySelector("#sf-readiness")).toBeNull();
    } finally {
      unmount();
    }
  }, 20_000);

  it("captures the quantity left and the container list on a contract with several shipments", async () => {
    const { container, unmount } = renderRoute(
      "/shipments/new",
      "/shipments/new?contract=ct-1",
      <ShipmentForm mode="create" />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New shipment" });
      await screen.findByText(/Captured from PC-2041/, {}, { timeout: 10_000 });
      expect(container.querySelector("#sf-plan")).toBeNull();
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

describe("the bank can be recorded with the split, or left to Finance", () => {
  /*
   * "Add the bank details, Bank Name and Bank Address details. The Bank Name field is a dropdown
   *  list from the Master Data." — 11 September 2026, on the New shipment screen. Confirmed in
   *  review as bank **name and branch**, the two the record already holds.
   *
   * This does not withdraw the 9 September design: the fields are OPTIONAL, Finance is still who
   * is asked when they are left blank, and the `shipment_bank_details` milestone is still the
   * notification. What is new is a second, earlier way in for a raiser who already knows the bank.
   *
   * Both ways in go through `resolveShipmentBankDetails`, which is what the last three tests
   * here hold: the create form cannot file a value the Summary card would refuse.
   */

  const SUDAN = CONTRACTS.find((c) => c.origin === "SD")!;
  const TANZANIA = CONTRACTS.find((c) => c.contractNo === "PC-2055")!;

  afterEach(() => {
    /* These tests create shipments. Without this the new rows leak into every test after them —
       the quantity-left assertions on this same contract are the first that would break. */
    resetStore();
  });

  it("offers the bank from the master, and the branch only once a bank is chosen", async () => {
    const { container, unmount } = renderRoute(
      "/shipments/new",
      `/shipments/new?contract=${SUDAN.id}`,
      <ShipmentForm mode="create" />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New shipment" });
      const bank = await screen.findByLabelText(/^Bank$/, {}, { timeout: 10_000 });
      expect(bank.tagName).toBe("SELECT");

      /* A list from the counterparty master, not a text box — the instruction's own words. */
      const names = [...(container.querySelector<HTMLSelectElement>("select#sf-bank")?.options ?? [])]
        .map((o) => o.label)
        .filter(Boolean);
      expect(names).toContain("Unity Commercial Bank");
      expect(names).toContain("Savannah Trade Bank");
      expect(container.querySelector("input#sf-bank")).toBeNull();

      /* The branch is keyed by the bank, so it cannot be answered before one is picked. */
      const branch = container.querySelector<HTMLSelectElement>("select#sf-bankbranch");
      expect(branch).toBeTruthy();
      expect(branch?.disabled).toBe(true);

      fireEvent.change(container.querySelector("select#sf-bank")!, {
        target: { value: "cp-bank-unity" },
      });
      const after = container.querySelector<HTMLSelectElement>("select#sf-bankbranch");
      expect(after?.disabled).toBe(false);
      const branches = [...(after?.options ?? [])].map((o) => o.value).filter(Boolean);
      expect(branches).toEqual(["Head office", "Port Sudan", "Gedaref", "Khartoum North"]);
    } finally {
      unmount();
    }
  }, 20_000);

  it("says the bank may be left to Finance rather than implying it is required", async () => {
    const { container, unmount } = renderRoute(
      "/shipments/new",
      `/shipments/new?contract=${SUDAN.id}`,
      <ShipmentForm mode="create" />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New shipment" });
      await screen.findByLabelText(/^Bank$/, {}, { timeout: 10_000 });
      /* Optional is stated, not left to be discovered by saving. Decision D-10: no gate is
         invented, so the screen must not look like one. */
      expect(container.textContent).toContain("can be left to Finance");
      expect(container.textContent).toContain("Nothing is blocked");
    } finally {
      unmount();
    }
  }, 20_000);

  it("does not ask outside the countries configured for it", async () => {
    const { container, unmount } = renderRoute(
      "/shipments/new",
      `/shipments/new?contract=${TANZANIA.id}`,
      <ShipmentForm mode="create" />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New shipment" });
      await screen.findByText(/Captured from PC-2055/, {}, { timeout: 10_000 });
      /* Tanzania's profile says false, so the fields are absent from the create form. The
         shipment's own Summary card still renders and explains — that is its job, not this
         screen's. */
      expect(container.querySelector("select#sf-bank")).toBeNull();
      expect(container.querySelector("select#sf-bankbranch")).toBeNull();
    } finally {
      unmount();
    }
  }, 20_000);

  it("reads the requirement from the contract's origin, not from a country code on the screen", () => {
    expect(COUNTRY_PROFILES[SUDAN.origin].requiresShipmentBankDetails).toBe(true);
    expect(COUNTRY_PROFILES[TANZANIA.origin].requiresShipmentBankDetails).toBe(false);
  });

  it("records the details and completes the Finance milestone when the bank is supplied", async () => {
    const res = await api.createShipment({
      contractId: SUDAN.id,
      quantityMt: 1,
      shipmentType: "container",
      bankId: "cp-bank-unity",
      bankBranch: "Port Sudan",
      recordedBy: "Amara Osei",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.bankDetails?.bankId).toBe("cp-bank-unity");
    /* The name is kept on the record, so renaming the master does not rewrite history. */
    expect(res.value.bankDetails?.bankName).toBe("Unity Commercial Bank");
    expect(res.value.bankDetails?.bankBranch).toBe("Port Sudan");
    /* Dubai Execution, not Finance — which is the only way to tell the two routes apart later. */
    expect(res.value.bankDetails?.providedBy).toBe("Amara Osei");

    const m = res.value.milestones.find((x) => x.key === "shipment_bank_details");
    expect(m?.state).toBe("completed");
    /* The task cannot outlive the answer: no Finance row is raised for a split that arrived
       with its bank. */
    expect(resolvedMilestonesFor(res.value).find((x) => x.def.key === "shipment_bank_details")?.state).toBe(
      "completed",
    );
  });

  it("leaves the milestone outstanding when the bank is not supplied — the 9 September path", async () => {
    const res = await api.createShipment({
      contractId: SUDAN.id,
      quantityMt: 1,
      shipmentType: "container",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.bankDetails).toBeUndefined();
    expect(res.value.milestones.some((m) => m.key === "shipment_bank_details")).toBe(false);
    const state = resolvedMilestonesFor(res.value).find(
      (m) => m.def.key === "shipment_bank_details",
    )?.state;
    /* Actionable, which is what puts it in front of Finance in the one Actions Inbox. */
    expect(state).not.toBe("completed");
    expect(state).not.toBe("not_applicable");
  });

  it("refuses a bank for a country that does not request one", async () => {
    const res = await api.createShipment({
      contractId: TANZANIA.id,
      quantityMt: 1,
      shipmentType: "container",
      bankId: "cp-bank-unity",
    });
    /* Refused rather than silently dropped: discarding a value somebody typed is worse than
       saying it does not apply here. */
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/Tanzania does not require bank details/);
  });

  it("refuses a branch the bank does not hold, and a branch with no bank", async () => {
    const wrongBranch = await api.createShipment({
      contractId: SUDAN.id,
      quantityMt: 1,
      shipmentType: "container",
      bankId: "cp-bank-unity",
      bankBranch: "Trade centre", // Savannah's, not Unity's
    });
    expect(wrongBranch.ok).toBe(false);
    if (!wrongBranch.ok) expect(wrongBranch.reason).toMatch(/no branch called/);

    const orphanBranch = await api.createShipment({
      contractId: SUDAN.id,
      quantityMt: 1,
      shipmentType: "container",
      bankBranch: "Head office",
    });
    /* A branch alone names nothing — the list is keyed by the bank. */
    expect(orphanBranch.ok).toBe(false);
    if (!orphanBranch.ok) expect(orphanBranch.reason).toMatch(/Select the bank before its branch/);
  });

  it("refuses the same values on both routes in, because one function decides", async () => {
    /* The point of `resolveShipmentBankDetails`: the create form cannot file a value the
       Summary card would refuse, or the reverse. Two entry points validating a field their own
       way is how two screens come to disagree about what is allowed. */
    const sudanSplit = SHIPMENTS.find((s) => s.country === "SD")!;
    const viaCard = await api.setShipmentBankDetails(sudanSplit.id, {
      bankId: "cp-bank-unity",
      bankBranch: "Trade centre",
    });
    const viaForm = await api.createShipment({
      contractId: SUDAN.id,
      quantityMt: 1,
      shipmentType: "container",
      bankId: "cp-bank-unity",
      bankBranch: "Trade centre",
    });
    expect(viaCard.ok).toBe(false);
    expect(viaForm.ok).toBe(false);
    if (!viaCard.ok && !viaForm.ok) expect(viaCard.reason).toBe(viaForm.reason);
  });

  it("does not put the fields on the edit form — the Summary card is the one way to change them", async () => {
    const sudanSplit = SHIPMENTS.find((s) => s.country === "SD")!;
    const { container, unmount } = renderRoute(
      "/shipments/:id/edit",
      `/shipments/${sudanSplit.id}/edit`,
      <ShipmentForm mode="edit" />,
    );
    try {
      await screen.findByRole("heading", { level: 1 }, { timeout: 10_000 });
      /* Two editors for one field is how a screen and a card come to disagree about what was
         recorded. The card already carries Change bank details. */
      expect(container.querySelector("select#sf-bank")).toBeNull();
      expect(container.querySelector("select#sf-bankbranch")).toBeNull();
    } finally {
      unmount();
    }
  }, 20_000);
});

describe("every list is scoped to the country the session is working in", () => {
  /*
   * "Export should connect to the country in the header. If country is Tanzania, the user
   *  should view only Tanzania contracts; when they switch country the contract list should
   *  update. This should apply to any screen affected by country." — 9 September 2026.
   *
   * The filter is in the service layer's list accessors rather than on the screens, so these
   * tests set the scope directly and read the accessors. `setCountryScope` notifies the store,
   * and `useAsync` re-fetches on a notification, which is what makes a screen follow a switch;
   * the two rendering tests below hold that end of it.
   *
   * Every test restores the unscoped state, because the scope is module state and a test that
   * left it set would silently filter every test after it.
   */

  async function withScope<T>(code: Parameters<typeof setCountryScope>[0], fn: () => Promise<T>): Promise<T> {
    setCountryScope(code);
    try {
      return await fn();
    } finally {
      setCountryScope(null);
    }
  }

  it("shows every country when no country is set", async () => {
    expect(activeCountryScope()).toBeNull();
    const all = await api.listContracts();
    expect(all.length).toBe(CONTRACTS.length);
    expect(new Set(all.map((c) => c.origin)).size).toBeGreaterThan(1);
  });

  it("filters the contract list to one country, and changes it on a switch", async () => {
    await withScope("TZ", async () => {
      const tz = await api.listContracts();
      expect(tz.map((c) => c.contractNo)).toEqual(["PC-2055"]);
      expect(tz.every((c) => c.origin === "TZ")).toBe(true);
    });
    await withScope("SD", async () => {
      const sd = await api.listContracts();
      expect(sd.length).toBeGreaterThan(1);
      expect(sd.every((c) => c.origin === "SD")).toBe(true);
      expect(sd.some((c) => c.contractNo === "PC-2055")).toBe(false);
    });
  });

  it("scopes the records that carry a country of their own", async () => {
    await withScope("SD", async () => {
      expect((await api.listShipments()).every((s) => s.country === "SD")).toBe(true);
      expect((await api.listOpportunities()).every((o) => o.origin === "SD")).toBe(true);
      expect((await api.listStockLots()).every((l) => l.origin === "SD")).toBe(true);
      expect((await api.listWarehouseRequests()).every((w) => w.country === "SD")).toBe(true);
      expect((await api.listMovementLegs()).every((m) => m.originCountry === "SD")).toBe(true);
      expect((await api.listReceivingLocationPlans()).every((p) => p.country === "SD")).toBe(true);
      /* Sudan raises no advance payment — the seeded three are Ethiopian and Chadian. An empty
         list is the right answer, and it is what the screen will show. */
      expect(await api.listAdvancePayments()).toEqual([]);
    });
    await withScope("ET", async () => {
      expect((await api.listAdvancePayments()).every((a) => a.country === "ET")).toBe(true);
      expect((await api.listAdvancePayments()).length).toBe(2);
    });
  });

  it("scopes the records whose country comes from a parent", async () => {
    const sdShipments = new Set(SHIPMENTS.filter((s) => s.country === "SD").map((s) => s.id));
    await withScope("SD", async () => {
      const readiness = await api.listCargoReadiness();
      expect(readiness.length).toBeGreaterThan(0);
      expect(readiness.every((r) => sdShipments.has(r.shipmentId))).toBe(true);

      const exportContracts = await api.listExportContracts();
      const sdContracts = new Set(CONTRACTS.filter((c) => c.origin === "SD").map((c) => c.id));
      expect(exportContracts.every((e) => sdContracts.has(e.contractId))).toBe(true);

      /* A pre-clearance pack is two hops out — its export contract's purchase contract. */
      const packs = await api.listPreclearancePacks();
      const sdExport = new Set(exportContracts.map((e) => e.id));
      expect(packs.every((p) => sdExport.has(p.exportContractId))).toBe(true);
    });
  });

  it("leaves reference data and the sourcing records unscoped, and says which they are", async () => {
    /*
     * Not an oversight — a rule, recorded so that changing it is deliberate. Vessel calls and
     * freight rates belong to no operating unit; the sourcing and procurement records carry no
     * country at all, on themselves or on any parent, so a country filter could only empty
     * those screens. See the [OPEN] on the accessors.
     */
    const unscopedCounts = {
      vessels: (await api.listVesselCalls()).length,
      rates: (await api.listFreightRates()).length,
      plans: (await api.listSeasonalPurchasePlans()).length,
      budgets: (await api.listBudgets()).length,
      agreements: (await api.listPurchaseAgreements()).length,
      orders: (await api.listPurchaseOrders()).length,
      receipts: (await api.listIntakeReceipts()).length,
      funds: (await api.listFunds()).length,
      balances: (await api.listAgentBalances()).length,
      production: (await api.listProductionPlan()).length,
    };
    await withScope("MZ", async () => {
      /* Mozambique has no records anywhere, so anything still returned is deliberately unscoped. */
      expect(await api.listContracts()).toEqual([]);
      expect({
        vessels: (await api.listVesselCalls()).length,
        rates: (await api.listFreightRates()).length,
        plans: (await api.listSeasonalPurchasePlans()).length,
        budgets: (await api.listBudgets()).length,
        agreements: (await api.listPurchaseAgreements()).length,
        orders: (await api.listPurchaseOrders()).length,
        receipts: (await api.listIntakeReceipts()).length,
        funds: (await api.listFunds()).length,
        balances: (await api.listAgentBalances()).length,
        production: (await api.listProductionPlan()).length,
      }).toEqual(unscopedCounts);
    });
  });

  it("holds every scoped record to a country that can actually be derived", () => {
    /*
     * The filter keeps a row whose country cannot be worked out, so that a broken link shows
     * up rather than being hidden by the filter. This test is the other half of that decision:
     * no seeded row is in that state, so the branch never fires in the demo, and if a future
     * change breaks a link this fails instead of a list quietly growing a stranger.
     */
    const contractCountry = new Map(CONTRACTS.map((c) => [c.id, c.origin]));
    const shipmentCountry = new Map(SHIPMENTS.map((s) => [s.id, s.country]));

    for (const s of SHIPMENTS) {
      expect(contractCountry.get(s.contractId), `shipment ${s.shipmentNo} has no contract`).toBeDefined();
      /* And the two agree — which is why the shipment's own field is the one that is read. */
      expect(s.country).toBe(contractCountry.get(s.contractId));
    }
    for (const r of CARGO_READINESS) {
      expect(shipmentCountry.get(r.shipmentId), `readiness ${r.id} has no shipment`).toBeDefined();
    }
    for (const e of EXPORT_CONTRACTS) {
      expect(contractCountry.get(e.contractId), `export contract ${e.requestNo} has no contract`).toBeDefined();
    }
    for (const a of ADVANCE_PAYMENTS) {
      expect(a.country).toBe(contractCountry.get(a.contractId));
    }
  });

  it("opens a record from another country by link, and says so on the screen", async () => {
    /* The `get*` readers are not scoped: a link is a link. The screen carries the notice. */
    await withScope("TZ", async () => {
      const sudanContract = await api.getContract("ct-2");
      expect(sudanContract?.contractNo).toBe("PC-2044");

      const { unmount } = renderRoute("/contracts/:id", "/contracts/ct-2", <ContractDetail />);
      try {
        await screen.findByRole("heading", { level: 1 });
        const notice = await screen.findByText(
          /This is a Sudan record and you are working in Tanzania/i,
        );
        expect(notice).toBeTruthy();
      } finally {
        unmount();
      }
    });
  });

  it("says nothing on a record of the country being worked in", async () => {
    await withScope("SD", async () => {
      const { unmount } = renderRoute("/contracts/:id", "/contracts/ct-2", <ContractDetail />);
      try {
        await screen.findByRole("heading", { level: 1 });
        expect(screen.queryByText(/and you are working in/i)).toBeNull();
      } finally {
        unmount();
      }
    });
  });

  it("re-runs a list on screen when the country changes, with no reload", async () => {
    /* This is "when they switch country the contract list should update", end to end:
       `setCountryScope` notifies the store and `useAsync` re-fetches. */
    setCountryScope("TZ");
    const { unmount } = renderRoute("/contracts", "/contracts", <ContractList />);
    try {
      /* `findAllBy` because the table renders a row and a small-screen card for each. */
      expect((await screen.findAllByText("PC-2055")).length).toBeGreaterThan(0);
      expect(screen.queryAllByText("PC-2044")).toEqual([]);

      setCountryScope("SD");
      expect((await screen.findAllByText("PC-2044")).length).toBeGreaterThan(0);
      expect(screen.queryAllByText("PC-2055")).toEqual([]);
    } finally {
      unmount();
      setCountryScope(null);
    }
  });

  it("fixes the new contract's origin to the country being worked in", async () => {
    await withScope("TZ", async () => {
      const { unmount } = renderRoute("/contracts/new", "/contracts/new", <PurchaseContractForm />);
      try {
        await screen.findByRole("heading", { level: 1 });
        /* The drop-down is gone and the country is stated instead. */
        expect(screen.queryByLabelText(/^Origin/)).toBeNull();
        expect(screen.getByTestId("pc-origin-fixed").textContent).toContain("Tanzania");
      } finally {
        unmount();
      }
    });
  });

  it("refuses a contract raised in a country other than the session's", async () => {
    await withScope("TZ", async () => {
      const draft = { ...emptyDraft(TODAY), origin: "SD" as const };
      const res = await api.createContract(draft);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toMatch(/Sudan.*working in Tanzania/);
    });
  });

  it("asks for the origin when the session names no country", async () => {
    expect(activeCountryScope()).toBeNull();
    const { unmount } = renderRoute("/contracts/new", "/contracts/new", <PurchaseContractForm />);
    try {
      await screen.findByRole("heading", { level: 1 });
      expect(screen.getByLabelText(/^Origin/)).toBeTruthy();
    } finally {
      unmount();
    }
  });
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

describe("a request can be raised from the contract's own Export contract tab", () => {
  /*
   * "In this screen tab Export Contract screen shot, add a button new request for Export
   *  contract related to the Purchase Contract, in the new Export Contract screen form, it will
   *  inherit the Purchase Contract no." — 13 September 2026.
   *
   * The action existed only on the Pre-clearance list header, where the screen it opens asks
   * which contract the request is for. Reached from a contract's own tab the contract is already
   * settled, so it travels in the query string and the screen states it.
   *
   * Locked rather than prefilled, confirmed in review: the tab is scoped to one contract, and a
   * live drop-down would let someone file a request that never appears on the tab they started
   * from — a mistake nothing on screen would show. Same call the new purchase contract makes
   * with its origin.
   */

  afterEach(() => {
    resetStore();
  });

  it("offers the action on the tab, carrying the contract in the address", async () => {
    const { container, unmount } = renderRoute(
      "/contracts/:id/:tab",
      "/contracts/ct-1/export-contract",
      <ContractDetail />,
    );
    try {
      await screen.findByRole("heading", { level: 1 }, { timeout: 10_000 });
      const link = container.querySelector('a[href$="/pre-clearance/new?contract=ct-1"]');
      expect(link).toBeTruthy();
      expect(link?.textContent).toContain("New request");
    } finally {
      unmount();
    }
  }, 20_000);

  it("renders the action once when the contract already has a request", async () => {
    /*
     * NOT COVERED BY SEEDED DATA, and said here rather than left to be discovered: the empty
     * state carries a second copy of this action so an empty tab is not a dead end, and no
     * seeded contract can reach it. Every applicable contract already has an export contract
     * (ec-1→ct-1, ec-2→ct-2, ec-3→ct-3, ec-4→ct-4, ec-5→ct-6) and the only one without — ct-5,
     * Tanzania — is a country the action is withheld from. The empty-state branch is exercised
     * by raising a contract inside the mock-up.
     */
    const { container, unmount } = renderRoute(
      "/contracts/:id/:tab",
      "/contracts/ct-1/export-contract",
      <ContractDetail />,
    );
    try {
      await screen.findByRole("heading", { level: 1 }, { timeout: 10_000 });
      const links = container.querySelectorAll('a[href$="/pre-clearance/new?contract=ct-1"]');
      expect(links.length).toBe(1);
    } finally {
      unmount();
    }
  }, 20_000);

  it("does not offer it where the country does not use an export contract", async () => {
    /* ct-5 is PC-2055, Tanzania. The tab still explains; it just offers no action, because a
       button leading to a screen that refuses is worse than no button. */
    const { container, unmount } = renderRoute(
      "/contracts/:id/:tab",
      "/contracts/ct-5/export-contract",
      <ContractDetail />,
    );
    try {
      await screen.findByRole("heading", { level: 1 }, { timeout: 10_000 });
      expect(container.querySelector('a[href*="/pre-clearance/new"]')).toBeNull();
      expect(container.textContent).toContain("does not apply in Tanzania");
    } finally {
      unmount();
    }
  }, 20_000);

  it("inherits the contract, states it, and offers no way to change it", async () => {
    const { container, unmount } = renderRoute(
      "/pre-clearance/new",
      "/pre-clearance/new?contract=ct-1",
      <ExportContractRequestForm />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New export contract request" });
      const fixed = await screen.findByTestId("ec-contract-fixed", {}, { timeout: 10_000 });
      expect(fixed.textContent).toContain("PC-2041");
      /* The drop-down is gone on this path — not disabled, absent. */
      expect(container.querySelector("select#ec-contract")).toBeNull();
    } finally {
      unmount();
    }
  }, 20_000);

  it("carries the three values that derive from the contract", async () => {
    const { container, unmount } = renderRoute(
      "/pre-clearance/new",
      "/pre-clearance/new?contract=ct-1",
      <ExportContractRequestForm />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New export contract request" });
      await screen.findByTestId("ec-contract-fixed", {}, { timeout: 10_000 });
      /* The request number preview counts the requests already on the contract — ct-1 carries
         ec-1, so the next is R2. It is issued on save, not typed. */
      expect(container.textContent).toContain("PC-2041-R2");
      /* The quantity defaults to what is still unrequested: 1,300 contracted less ec-1's 630. */
      expect(container.querySelector<HTMLInputElement>("input#ec-qty")?.value).toBe("670");
      /* Large volume is read from the contract, and no longer says "select an execution plan" —
         a string left behind when planning was removed on 8 September 2026. */
      expect(container.textContent).not.toContain("select an execution plan");
    } finally {
      unmount();
    }
  }, 20_000);

  it("still asks which contract when opened without one", async () => {
    /* The path that has existed since 6 September: Pre-clearance → New request. */
    const { container, unmount } = renderRoute(
      "/pre-clearance/new",
      "/pre-clearance/new",
      <ExportContractRequestForm />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New export contract request" });
      expect(container.querySelector("select#ec-contract")).toBeTruthy();
      expect(screen.queryByTestId("ec-contract-fixed")).toBeNull();
    } finally {
      unmount();
    }
  }, 20_000);

  it("falls back to the drop-down when the address names a contract it cannot see", async () => {
    const { container, unmount } = renderRoute(
      "/pre-clearance/new",
      "/pre-clearance/new?contract=ct-does-not-exist",
      <ExportContractRequestForm />,
    );
    try {
      await screen.findByRole("heading", { level: 1, name: "New export contract request" });
      await screen.findByText(/could not be found/, {}, { timeout: 10_000 });
      /* Says so and stays usable, rather than locking the screen to a contract it cannot show.
         A country-scoped list makes this reachable with a real id, not only a bogus one. */
      expect(container.querySelector("select#ec-contract")).toBeTruthy();
    } finally {
      unmount();
    }
  }, 20_000);
});
