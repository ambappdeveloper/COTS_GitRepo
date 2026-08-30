/**
 * The navigation model (v1.1) — one definition, three consumers: the springboard tiles,
 * the drawer tree and the breadcrumb/active-route logic.
 *
 * v1.0 had a flat rail of links. v1.1 arranges the same routes as a springboard, where a
 * tile either opens a module directly or expands a cluster of that module's sub-views,
 * the way the reference application does.
 *
 * Rule kept deliberately: every `to` here is a route that exists in App.tsx. A tile never
 * links to a screen that is not implemented — the process document lists what is missing
 * instead of the navigation implying it is there.
 */

export type IconName =
  | "dashboard"
  | "contract"
  | "shipment"
  | "preclearance"
  | "clearance"
  | "stuffing"
  | "document"
  | "bank"
  | "material"
  | "variants"
  | "exceptions"
  | "reference"
  /* --- workflow v2.0 additions --- */
  | "origination"
  | "allocation"
  | "movement"
  | "rates"
  | "sourcing"
  | "closeout"
  | "processmap";

export interface SubTile {
  label: string;
  to: string;
  hint: string;
  icon: IconName;
}

export interface ModuleTile {
  id: string;
  label: string;
  /** Where the tile itself goes. Every tile has a landing route. */
  to: string;
  icon: IconName;
  hint: string;
  /** Phase band this module serves, used as the springboard's section heading. */
  band: string;
  /** Sub-views revealed under the tile. Only some modules have them, as in the reference. */
  children?: SubTile[];
}

export const MODULES: ModuleTile[] = [
  {
    id: "origination",
    label: "Origination & Deals",
    to: "/origination",
    icon: "origination",
    band: "Start here",
    hint: "Phases 01-02: the opportunity, the costing snapshot, the declared position and the deal hand-off",
    children: [
      {
        label: "Opportunities",
        to: "/origination",
        icon: "origination",
        hint: "Every opportunity with its costing snapshot and declared position",
      },
      {
        label: "New opportunity",
        to: "/origination/new",
        icon: "origination",
        hint: "Raise an opportunity — the deal cannot be agreed without a costing snapshot and a declared position",
      },
      {
        label: "Long & short position",
        to: "/origination/position",
        icon: "origination",
        hint: "The position report both the trader and the allocation team read",
      },
    ],
  },
  {
    id: "sourcing",
    label: "Sourcing Intake",
    to: "/sourcing",
    icon: "sourcing",
    band: "Start here",
    hint: "Phases 01-02 and the origin-side intake: the seasonal purchase plan, the budget, funds, purchase agreements, receiving locations, receipts and agent balances",
    children: [
      {
        label: "Seasonal purchase plan",
        to: "/sourcing/plans",
        icon: "sourcing",
        hint: "Phase 01: the seasonal period, and the commodity, quantity and capacity planned for each month it spans",
      },
      {
        label: "Budget",
        to: "/sourcing/budgets",
        icon: "sourcing",
        hint: "Phase 02: the budget period, the plan it is written against, the quantity, the amount, the supplier and the approval status",
      },
      {
        label: "Funds",
        to: "/sourcing",
        icon: "sourcing",
        hint: "Financing raised against a purchase order, in SDG with the derived USD",
      },
      {
        label: "Purchase agreement",
        to: "/sourcing/agreements",
        icon: "sourcing",
        hint: "The parent record of every intake quantity, and the per-bag tare its receipts inherit",
      },
      {
        label: "Receiving location",
        to: "/sourcing/locations",
        icon: "sourcing",
        hint: "Which facility each agreed quantity arrives at, with the allocation balance the legacy grid never shows",
      },
      {
        label: "Material receipt",
        to: "/sourcing/intake",
        icon: "sourcing",
        hint: "Per-truck intake at a facility, with the weighbridge gross weight and the separate pricing step",
      },
      {
        label: "Warehouse receipt",
        to: "/sourcing/warehouse",
        icon: "sourcing",
        hint: "The same capture at a warehouse, which the legacy system cannot price at all",
      },
      {
        label: "Agent balance list",
        to: "/sourcing/balances",
        icon: "sourcing",
        hint: "Position per agent per season, with the transfer and refund the legacy left unbuilt",
      },
    ],
  },
  {
    id: "stuffing",
    label: "Stuffing & Loading",
    to: "/stuffing",
    icon: "stuffing",
    band: "Start here",
    hint: "Daily stuffing progress, containers and vehicles, vessel calls and port cycle",
  },
  {
    id: "contracts",
    label: "Contracts",
    to: "/contracts",
    icon: "contract",
    band: "Start here",
    hint: "Sales and purchase contracts, lots, tags and document requirements",
    children: [
      {
        label: "Contract list",
        to: "/contracts",
        icon: "contract",
        hint: "Every contract with saved views, consumption and status",
      },
      {
        label: "New purchase contract",
        to: "/contracts/new",
        icon: "contract",
        hint: "Raise a purchase contract (P2) — enforces the tolerance ceiling, the document minimum and the fumigation choice",
      },
    ],
  },
  {
    id: "dashboard",
    label: "Operations Dashboard",
    to: "/dashboard",
    icon: "dashboard",
    band: "Overview",
    hint: "Workload, risk alerts, contract consumption and upcoming milestones",
  },
  {
    id: "exceptions",
    label: "Exceptions & Risks",
    to: "/exceptions",
    icon: "exceptions",
    band: "Overview",
    hint: "Blocked, overdue and at-risk items across every shipment",
  },
  {
    id: "process-map",
    label: "Process Map",
    to: "/process-map",
    icon: "processmap",
    band: "Overview",
    hint: "The sixteen phases of the export workflow and the screen that serves each one",
  },
  {
    id: "shipments",
    label: "Shipments & Execution",
    to: "/shipments",
    icon: "shipment",
    band: "Contract to cargo",
    hint: "Execution planning, cargo readiness, freight offers, booking and SI",
    children: [
      {
        label: "Shipment list",
        to: "/shipments",
        icon: "shipment",
        hint: "Every shipment with saved views and column chooser",
      },
      {
        label: "New shipment",
        to: "/shipments/new",
        icon: "shipment",
        hint: "Raise a shipment against a contract lot — enforces the tolerance ceiling",
      },
    ],
  },
  {
    id: "allocation",
    label: "Allocation & Readiness",
    to: "/allocation",
    icon: "allocation",
    band: "Contract to cargo",
    hint: "Phase 06: stock allocation, cargo readiness, the production plan and warehouse capacity",
    children: [
      {
        label: "Stock & allocation",
        to: "/allocation",
        icon: "allocation",
        hint: "Lots by state and grade, and what each contract has reserved",
      },
      {
        label: "Long & short position",
        to: "/allocation/position",
        icon: "allocation",
        hint: "The same report the trader reads at Phase 01",
      },
      {
        label: "Weekly production plan",
        to: "/allocation/production-plan",
        icon: "allocation",
        hint: "Built on raw materials actually received — planned-but-unreceived is excluded",
      },
      {
        label: "Warehouse requests",
        to: "/allocation/warehouse-requests",
        icon: "allocation",
        hint: "The capacity exception path: raise, quality visit and release, execution approval, ERP",
      },
    ],
  },
  {
    id: "pre-clearance",
    label: "Pre-clearance",
    to: "/pre-clearance",
    icon: "preclearance",
    band: "Pre-clearance & clearance",
    hint: "Export contracts, EX forms, advance payments, document preparation and OPU / PZU custody",
    children: [
      {
        label: "Export contracts & EX forms",
        to: "/pre-clearance",
        icon: "preclearance",
        hint: "Request, issuance, consumption balance and OPU / PZU custody",
      },
      {
        label: "Advance payments",
        to: "/pre-clearance/advance-payments",
        icon: "preclearance",
        hint: "Phase 07: the Ethiopia chain — Invictus to AMROS to African Lakes — with the FP&A amount",
      },
    ],
  },
  {
    id: "clearance",
    label: "Clearance & Regulatory",
    to: "/clearance",
    icon: "clearance",
    band: "Pre-clearance & clearance",
    hint: "Customs, SSMO, plant protection, health and surveyor activities",
  },
  {
    id: "movement",
    label: "Movement & Stuffing Requests",
    to: "/movement",
    icon: "movement",
    band: "Execution",
    hint: "Phase 10: cargo movement to the port country, by truck detail or bulk day, and the stuffing request",
    children: [
      {
        label: "Movement legs",
        to: "/movement",
        icon: "movement",
        hint: "Every leg with its trips, loaded and received quantities and the variance",
      },
      {
        label: "Stuffing requests",
        to: "/movement/requests",
        icon: "movement",
        hint: "Raise the request and track the five functions it notifies",
      },
    ],
  },
  {
    id: "documents",
    label: "Documents & Charges",
    to: "/documents",
    icon: "document",
    band: "Execution",
    hint: "Draft, confirmed and original documents, packing list and the five charge types",
  },
  {
    id: "post-shipment",
    label: "Post-shipment & Bank",
    to: "/post-shipment",
    icon: "bank",
    band: "Execution",
    hint: "Five-document assembly, bank submittal, collection and close-out",
  },
  {
    id: "close-out",
    label: "Close-out, Claims & Insurance",
    to: "/close-out",
    icon: "closeout",
    band: "Execution",
    hint: "Phase 16: customer feedback, buyer claims, marine and inland cover, and insurance incidents",
    children: [
      {
        label: "Customer feedback",
        to: "/close-out",
        icon: "closeout",
        hint: "Satisfaction or a complaint, linked to the contract",
      },
      {
        label: "Buyer claims",
        to: "/close-out/claims",
        icon: "closeout",
        hint: "Quality and service claims, their submitted amount and their approval",
      },
      {
        label: "Insurance",
        to: "/close-out/insurance",
        icon: "closeout",
        hint: "Marine cover per shipment, inland master policies and incident cases",
      },
    ],
  },
  {
    id: "freight-rates",
    label: "Freight Rate Table",
    to: "/freight-rates",
    icon: "rates",
    band: "Support",
    hint: "Phase 08: monthly rates by container size, loading port, destination port, commodity and line",
  },
  {
    id: "material",
    label: "Material & Transport",
    to: "/material",
    icon: "material",
    band: "Support",
    hint: "Purchases, truck receipts, commodity master and transport requests",
    children: [
      {
        label: "Transport requests",
        to: "/material/transport",
        icon: "material",
        hint: "Requests, lead time rule and contact validation",
      },
      {
        label: "Material purchases",
        to: "/material/purchases",
        icon: "material",
        hint: "Purchase orders and delivery lines",
      },
      {
        label: "Material receipts",
        to: "/material/receipts",
        icon: "material",
        hint: "Per-truck receipts, packaging counts and net weight",
      },
      {
        label: "Commodity master",
        to: "/material/commodities",
        icon: "reference",
        hint: "Commodities with the active flag and naming normalised",
      },
    ],
  },
  {
    id: "variants",
    label: "Country & Shipment Variants",
    to: "/variants",
    icon: "variants",
    band: "Support",
    hint: "How the process differs by operating unit and by shipment mode",
  },
];

/**
 * Springboard section order. Bands with no modules are skipped.
 *
 * "Start here" leads deliberately. It carries the four tiles a reviewer is asked to walk
 * in order — the deal, the sourcing intake behind it, the stuffing and loading, and the
 * contract — rather than their process position, which is what the remaining bands give.
 */
export const BANDS = [
  "Start here",
  "Overview",
  "Contract to cargo",
  "Pre-clearance & clearance",
  "Execution",
  "Support",
];

/** Flat list of every navigable destination, tiles and sub-tiles alike. */
export function allDestinations(): { label: string; to: string }[] {
  const out: { label: string; to: string }[] = [];
  for (const m of MODULES) {
    out.push({ label: m.label, to: m.to });
    for (const c of m.children ?? []) out.push({ label: `${m.label} › ${c.label}`, to: c.to });
  }
  return out;
}

/**
 * Which tile owns the current URL. Longest matching `to` wins, so /shipments/new
 * resolves to the shipments tile rather than to "/" by accident.
 */
export function moduleForPath(pathname: string): ModuleTile | undefined {
  let best: ModuleTile | undefined;
  for (const m of MODULES) {
    const candidates = [m.to, ...(m.children ?? []).map((c) => c.to)];
    for (const c of candidates) {
      if (pathname === c || pathname.startsWith(c.endsWith("/") ? c : `${c}/`)) {
        if (!best || c.length > best.to.length) best = m;
      }
    }
  }
  return best;
}
