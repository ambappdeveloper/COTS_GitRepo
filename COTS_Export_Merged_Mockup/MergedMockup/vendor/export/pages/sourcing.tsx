/**
 * Sourcing intake — origin-side purchase, receipt and funding (Material Management Portal).
 *
 * WHICH PHASE THIS SERVES. None of the sixteen. Workflow v2.0 §2.2 excludes the
 * sourcing season process and supplier funding from the export workflow by name and
 * with a stated reason — they are upstream of export. This module exists because v2.0
 * names exactly two points at which the origin side enters the export chain, both at
 * Phase 06:
 *   · §6.6 input 4 — "the weekly production plan, built on raw materials actually
 *     received at facilities", which register C-24 makes a firm rule: planned-but-
 *     unreceived quantity is excluded, so only a confirmed receipt counts;
 *   · §6.6 exception 1 — "Short position → sourcing action, through the season
 *     sourcing process".
 * Nothing here is presented as a step in the export phase sequence, and the landing
 * banner says so.
 *
 * WHAT THE SOURCE SAYS. Six legacy MMP screens captured on 24 August 2026 — Purchase
 * Agreements, Receiving Locations, Material Receipts, Warehouse Receipts, Funds and
 * Agent Balances. Every business function they perform is reproduced. Eleven defects
 * the specifications record are named on the screen that fixes them, because a
 * replacement that silently corrects a number teaches nobody what changed:
 *   1. no allocation balance anywhere on Receiving Locations — no total, no agreed
 *      quantity, no remainder, so 10,000 + 15,700 MT sit against a 17,777 MT
 *      agreement with a third row's quantity blank (`allocationBalance`,
 *      `checkAllocationHeadroom`; seed `pa-3`);
 *   2. `Total Number Of Bags` string-concatenated — 13, 123 and 123 printed as
 *      13123123 instead of 259 (`totalBags`; seed `ir-5`);
 *   3. packaging weight stored in a field named `NetWeight`, mixing MT and LB, by
 *      dividing pounds by 22.25 (`packagingWeight`, which also returns `legacyMt`);
 *   4. `Quantity` absent from the Receiving Locations edit form, so a wrong quantity
 *      can never be corrected there (`api.updateReceivingLocationPlan` accepts it);
 *   5. a receipt saved with zero quantities, because only the location and the date
 *      are required (seed `ir-7`);
 *   6. a warehouse receipt that can never be priced or confirmed — both the legacy
 *      Edit and AddReceiptPrice routes return HTTP 500;
 *   7. `Receipt Status` on no list column and no detail field, so status is invisible
 *      outside the pricing form;
 *   8. `Fund Ref` not unique — seed `fd-3` and `fd-4` share `45643123`;
 *   9. `Actual Balance` equal to `Estimated Balance` on every captured row with no
 *      derivation stated for either, and both money-movement dialogs unbuilt;
 *  10. `Finance Rate (%)` and `Tenor Period` captured and consumed by nothing;
 *  11. two things the source does not establish and this screen does not resolve —
 *      the unit of `Dirt/Ton`, and how `Total Purchase Amount` combines the purchase
 *      value with the agent commission (the legacy placeholder reads
 *      `Commosion Amount + …` and is truncated).
 *
 * WHAT IS DELIBERATELY ABSENT.
 *   · Any transition map for `Flow Status`. The source gives five values, no default
 *     and no transition evidence of any kind, so none is asserted.
 *   · Any derivation for `Actual Balance` or `Estimated Balance`, any sign convention,
 *     and any uniqueness rule on agent-and-season. The source states none.
 *   · Any resolution of the unit of `Dirt/Ton` or of the `Total Purchase Amount`
 *     composition. Both are marked on screen and left open.
 *   · Any criterion for the legacy agreement dropdown offering three of seven
 *     agreements. Recorded as unresolved, not guessed.
 *
 * Every derived figure comes from `domain/sourcing.ts`, so this module and
 * `/allocation` cannot disagree about what has been received.
 */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  RECEIVING_LOCATIONS,
  commodityById,
  counterpartyName,
  receivingLocationByLabel,
  receivingLocationKindOf,
  receivingLocationLabel,
} from "../data/master";
import { formatDate, formatMoney, formatMt, formatNumber, money, round, sum } from "../domain/calc";
import { humanise, toneFor } from "../domain/status";
import {
  LB_PER_MT,
  LEGACY_LB_PER_MT_DIVISOR,
  agentPositions,
  allocationBalance,
  checkAllocationHeadroom,
  deliveryUpdates,
  fundExchangeRate,
  fundPaymentDelayDays,
  fundValueLocal,
  fundValueUsd,
  packagingWeight,
  qualityInspectionSummary,
  receiptValue,
  receiptWeights,
  receivedAgainstAgreement,
  totalBags,
} from "../domain/sourcing";
import type {
  AgentBalance,
  AgentBalanceMovement,
  Fund,
  IntakeReceipt,
  IntakeReceiptStatus,
  PurchaseAgreement,
  ReceivingLocationPlan,
} from "../domain/types";
import { api } from "../services/store";
import { Banner, Dialog, EmptyState, ErrorState, StatusChip, useToast } from "../components/feedback";
import {
  ActionBar,
  CollapsibleSection,
  FieldGrid,
  PageHeader,
  QuantityDonut,
  RecordTabs,
  SummaryCard,
  TotalBanner,
} from "../components/layout";
import { DataTable, type Column } from "../components/table";
import { ErrorSummary, FormRow, RequiredLegend, SelectInput, TextInput } from "../components/form";
import { BudgetsTab, SeasonalPlansTab } from "./planning";
import { ProcurementTab } from "./procurement";
import { useAsync } from "./hooks";

/* ------------------------------------------------------------------ *
 * Tabs
 * ------------------------------------------------------------------ */

/**
 * Tab order (v2.1 of this mock-up). The two phases workflow v2.3 puts ahead of funds —
 * §6.1 the seasonal purchase plan and §6.2 the budget — lead the strip, so the eight tabs
 * run in the order the workflow runs them: plan → budget → funds → purchase agreement →
 * receiving location → material receipt → warehouse receipt → agent balances.
 *
 * `funds` deliberately keeps `/sourcing` as its route and stays the module's landing
 * screen. Nothing about the six MMP tabs changes: the same URLs, the same screens, the
 * same banner. Only the strip is longer, and the two new tabs carry their own segments.
 */
const SOURCING_TABS = [
  "plans",
  "budgets",
  "funds",
  "agreements",
  /* Added by the instruction of 3 September 2026: "Add new tab after the Purchase
     Agreement tab name Procurement." Its four screens are in `pages/procurement.tsx`. */
  "procurement",
  "locations",
  "intake",
  "warehouse",
  "balances",
] as const;
type SourcingTab = (typeof SOURCING_TABS)[number];

const TAB_LABEL: Record<SourcingTab, string> = {
  plans: "Seasonal purchase plan",
  budgets: "Budget",
  funds: "Funds",
  agreements: "Purchase agreement",
  procurement: "Procurement",
  locations: "Receiving location",
  intake: "Material receipt",
  warehouse: "Warehouse receipt",
  balances: "Agent balance list",
};

/**
 * The add screen each tab leads to. The MMP forms are in `src/pages/sourcing-forms.tsx`,
 * the two v2.3 forms in `src/pages/planning-forms.tsx`, and the purchase order in
 * `src/pages/procurement.tsx`.
 *
 * `funds` has **no** add action as of the instruction of 3 September 2026: *"Export
 * Planning & Intake 03 · Funds Screen: Remove the New Fund button."* A fund is no longer
 * started from its own list — it is started from the budget it is being raised against,
 * by the New fund button the same instruction adds to the Budget list, which is what
 * makes the budget's plan, commodity, supplier and season available to prefill. Nothing
 * else about the funds screen changes, and `/sourcing/funds/new` still exists — the
 * route is how the Budget list reaches it.
 */
const TAB_ADD_ACTION: Record<SourcingTab, { label: string; to: string } | undefined> = {
  plans: { label: "New seasonal purchase plan", to: "/sourcing/plans/new" },
  budgets: { label: "New budget", to: "/sourcing/budgets/new" },
  funds: undefined,
  agreements: { label: "New purchase agreement", to: "/sourcing/agreements/new" },
  procurement: { label: "New PO", to: "/sourcing/procurement/new" },
  locations: { label: "New receiving location", to: "/sourcing/locations/new" },
  intake: { label: "New material receipt", to: "/sourcing/intake/new" },
  warehouse: { label: "New warehouse receipt", to: "/sourcing/warehouse/new" },
  balances: { label: "New agent balance", to: "/sourcing/balances/new" },
};

/*
 * NO EXTRA HEADER ACTIONS, AND THE BUDGET TAB IS THE REASON THE NOTE IS HERE.
 *
 * The instruction of 3 September 2026 asks for a new/insert Fund action on the Budget
 * *list view*, "which will capture automatically the necessary fields needed in creating
 * new Fund screen". At mock-up v2.5 that action was briefly put in the page header,
 * beside New budget, as well as on each row. It has been taken out of the header, on the
 * business instruction of 3 September 2026 confirming the placement: the action belongs to
 * the list.
 *
 * The reason it cannot sensibly live in the header is the same reason it exists at all. A
 * header button belongs to the tab, not to a record, so it has no budget to capture from —
 * it could only open an empty New fund screen, which is the thing the funds tab's own New
 * Fund button was removed for. The per-row action in `BudgetsTab` carries the budget it
 * sits on, so the fund arrives with that budget's season, agent, commodity and value
 * already filled in. One action, on the row it can answer for.
 */

/** The two tabs that are export phases in their own right, rather than MMP intake. */
const PHASE_TABS: SourcingTab[] = ["plans", "budgets"];

/* ------------------------------------------------------------------ *
 * Small local helpers. Nothing here derives a business figure — every
 * derivation comes from domain/sourcing.ts.
 * ------------------------------------------------------------------ */

function parseNumber(v: string): number | undefined {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** The captured legacy case: only the location and the date are required. */
function isZeroQuantity(r: IntakeReceipt): boolean {
  return r.grossWeightWithDirtMt === 0 && totalBags(r.bags) === 0;
}

function commodityName(id?: string): string {
  return (id ? commodityById(id)?.name : undefined) ?? "–";
}

function receiptStatusChip(r: IntakeReceipt) {
  if (!r.pricing) return <StatusChip tone="warn" label="Not priced" size="sm" />;
  return <StatusChip tone={toneFor(r.pricing.status)} label={humanise(r.pricing.status)} size="sm" />;
}

/* ================================================================== *
 * Module — /sourcing and /sourcing/:tab
 * ================================================================== */

export function SourcingModule() {
  const { tab } = useParams();
  // Funds is the first tab, so `/sourcing` with no `:tab` segment shows funds.
  const active = (tab ?? "funds") as SourcingTab;

  const agreements = useAsync(() => api.listPurchaseAgreements());
  const plans = useAsync(() => api.listReceivingLocationPlans());
  const receipts = useAsync(() => api.listIntakeReceipts());
  const funds = useAsync(() => api.listFunds());
  const balances = useAsync(() => api.listAgentBalances());
  const movements = useAsync(() => api.listAgentBalanceMovements());
  const lots = useAsync(() => api.listStockLots());
  /* v2.3 phases 01-02 */
  const seasonalPlans = useAsync(() => api.listSeasonalPurchasePlans());
  const budgets = useAsync(() => api.listBudgets());
  /* Procurement — added 3 September 2026. */
  const purchaseOrders = useAsync(() => api.listPurchaseOrders());

  const loadError = agreements.error ?? plans.error ?? receipts.error;
  if (loadError) {
    return (
      <div className="page">
        <ErrorState detail={loadError} onRetry={agreements.reload} />
      </div>
    );
  }

  const agreementRows = agreements.data ?? [];
  const planRows = plans.data ?? [];
  const receiptRows = receipts.data ?? [];
  const fundRows = funds.data ?? [];
  const balanceRows = balances.data ?? [];
  const movementRows = movements.data ?? [];
  const seasonalPlanRows = seasonalPlans.data ?? [];
  const budgetRows = budgets.data ?? [];
  const purchaseOrderRows = purchaseOrders.data ?? [];
  const facilityReceipts = receiptRows.filter((r) => r.kind === "facility");
  const warehouseReceipts = receiptRows.filter((r) => r.kind === "warehouse");
  const underProcessLots = (lots.data ?? []).filter((l) => l.state === "under_process").length;

  const badgeFor = (t: SourcingTab): number | undefined => {
    const n =
      t === "plans"
        ? seasonalPlanRows.length
        : t === "budgets"
          ? budgetRows.length
          : t === "funds"
            ? fundRows.length
            : t === "agreements"
              ? agreementRows.length
              : t === "procurement"
                ? purchaseOrderRows.length
                : t === "locations"
                ? planRows.length
                : t === "intake"
                  ? facilityReceipts.length
                  : t === "warehouse"
                    ? warehouseReceipts.length
                    : balanceRows.length;
    return n > 0 ? n : undefined;
  };

  // The tab route is `/sourcing/:tab`, so the first tab has no segment of its own.
  const tabs = SOURCING_TABS.map((t) => ({
    key: t,
    label: TAB_LABEL[t],
    to: t === "funds" ? "/sourcing" : `/sourcing/${t}`,
    badge: badgeFor(t),
  }));

  const crumbs =
    active === "funds"
      ? [{ label: "Home", to: "/" }, { label: "Sourcing intake" }]
      : [
          { label: "Home", to: "/" },
          { label: "Sourcing intake", to: "/sourcing" },
          { label: TAB_LABEL[active] },
        ];

  /* One action in the header at most — the tab's own add screen, where it has one. */
  const addAction = TAB_ADD_ACTION[active];
  const isPhaseTab = PHASE_TABS.includes(active);

  return (
    <>
      <PageHeader
        moduleLabel="Sourcing intake"
        crumbs={crumbs}
        title="Sourcing intake"
        meta={
          active === "plans"
            ? "Phase 01 — the seasonal period and the commodity, quantity and capacity planned for each month it spans"
            : active === "budgets"
              ? "Phase 02 — the one plan the budget is written against, the budget period, and a line per commodity carrying the quantity, the amount and the supplier"
              : active === "procurement"
                ? "The purchase order as a record of its own — one order, the purchase agreements under it, and the payment made against each with its read-only USD conversion"
                : "Origin-side purchase agreement, facility allocation, per-truck receipt with the pricing step, supplier funding and the agent position"
        }
        recordKey={
          active === "plans"
            ? `${seasonalPlanRows.length}`
            : active === "budgets"
              ? `${budgetRows.length}`
              : `${agreementRows.length}`
        }
        recordDate={
          active === "plans"
            ? "seasonal purchase plans"
            : active === "budgets"
              ? "budgets"
              : "purchase agreements"
        }
        actions={
          addAction ? <ActionBar primary={[{ label: addAction.label, to: addAction.to }]} /> : undefined
        }
        tabs={<RecordTabs tabs={tabs} />}
      />

      <div className="page">
        {isPhaseTab ? (
          <Banner
            tone="info"
            title="Phases 01 and 02 — these two tabs are steps in the export phase sequence"
          >
            Workflow v2.3 puts the seasonal purchase plan and the budget ahead of funds as phases 01 and 02,
            and §16.1 recorded that neither had a screen. These are those two screens, and they lead this
            module — before <Link to="/sourcing/funds">funds</Link> — because that is the order the workflow
            runs them in: plan → budget → funds → purchase agreement → receiving location → material receipt →
            warehouse receipt. The six tabs that follow are unchanged, and remain the Material Management
            Portal as it stands today rather than steps in the phase sequence.
          </Banner>
        ) : null}

        {isPhaseTab ? null : (
          <Banner tone="info" title="Origin-side intake — not a step in the export phase sequence">
            Workflow v2.0 §2.2 excludes the sourcing season process and supplier funding from the export
            workflow by name, and gives the reason: they sit upstream of export. This module is here because
            v2.0 names exactly two points at which the origin side enters the export chain, both at Phase 06 —
            the <Link to="/allocation/production-plan">weekly production plan</Link>, which §6.6 input 4
            builds on raw materials actually received at facilities and which register C-24 makes a firm rule
            by excluding planned-but-unreceived quantity; and{" "}
            <Link to="/allocation/position">the long and short position</Link>, where §6.6 exception 1 sends a
            short position to a sourcing action through the season sourcing process. Nothing on these six tabs
            advances an export phase. Raw material received here becomes stock elsewhere —{" "}
            {formatNumber(underProcessLots)} lot(s) are under process on allocation and readiness today.
          </Banner>
        )}

        {active === "plans" ? (
          <SeasonalPlansTab plans={seasonalPlanRows} budgets={budgetRows} loading={seasonalPlans.loading} />
        ) : null}

        {active === "budgets" ? (
          <BudgetsTab budgets={budgetRows} plans={seasonalPlanRows} loading={budgets.loading} />
        ) : null}

        {active === "agreements" ? (
          <AgreementsTab
            agreements={agreementRows}
            plans={planRows}
            receipts={receiptRows}
            loading={agreements.loading}
          />
        ) : null}

        {active === "procurement" ? (
          <ProcurementTab
            orders={purchaseOrderRows}
            agreements={agreementRows}
            loading={purchaseOrders.loading}
          />
        ) : null}

        {active === "locations" ? (
          <LocationsTab agreements={agreementRows} plans={planRows} loading={plans.loading} />
        ) : null}

        {active === "intake" ? (
          <ReceiptsTab
            kind="facility"
            rows={facilityReceipts}
            agreements={agreementRows}
            loading={receipts.loading}
          />
        ) : null}

        {active === "warehouse" ? (
          <ReceiptsTab
            kind="warehouse"
            rows={warehouseReceipts}
            agreements={agreementRows}
            loading={receipts.loading}
            zeroQuantityElsewhere={facilityReceipts.filter(isZeroQuantity)}
          />
        ) : null}

        {active === "funds" ? <FundsTab funds={fundRows} loading={funds.loading} /> : null}

        {active === "balances" ? (
          <BalancesTab
            balances={balanceRows}
            funds={fundRows}
            receipts={receiptRows}
            agreements={agreementRows}
            movements={movementRows}
            loading={balances.loading}
          />
        ) : null}
      </div>
    </>
  );
}

/* ================================================================== *
 * Tab 1 — purchase agreements
 * ================================================================== */

function AgreementsTab({
  agreements,
  plans,
  receipts,
  loading,
}: {
  agreements: PurchaseAgreement[];
  plans: ReceivingLocationPlan[];
  receipts: IntakeReceipt[];
  loading: boolean;
}) {
  const balanceOf = new Map(
    agreements.map((a) => [
      a.id,
      allocationBalance(
        a,
        plans.filter((p) => p.purchaseAgreementId === a.id),
      ),
    ]),
  );
  const receivedOf = new Map(
    agreements.map((a) => [a.id, receivedAgainstAgreement(a.id, receipts, agreements)]),
  );
  const overAllocated = agreements.filter((a) => balanceOf.get(a.id)?.overAllocated);
  const statusCounts = [...new Set(agreements.map((a) => a.flowStatus))].map((s) => ({
    status: s,
    count: agreements.filter((a) => a.flowStatus === s).length,
  }));

  const columns: Column<PurchaseAgreement>[] = [
    {
      key: "paRef",
      header: "PA ref",
      cell: (a) => (
        <Link className="mono" to={`/sourcing/agreements/${a.id}`}>
          {a.paRef}
        </Link>
      ),
      sortValue: (a) => a.paRef,
    },
    {
      key: "po",
      header: "PO number",
      cell: (a) =>
        a.purchaseOrderNo ? (
          <span className="mono small">{a.purchaseOrderNo}</span>
        ) : (
          <span className="muted small">not issued yet</span>
        ),
      sortValue: (a) => a.purchaseOrderNo ?? "",
      optional: true,
    },
    {
      key: "plan",
      header: "Seasonal plan",
      cell: (a) => {
        if (!a.seasonalPlanId) return <span className="muted small">none</span>;
        return (
          <Link className="mono small" to={`/sourcing/plans/${a.seasonalPlanId}`}>
            {a.seasonalPlanId}
          </Link>
        );
      },
      sortValue: (a) => a.seasonalPlanId ?? "",
      optional: true,
    },
    { key: "season", header: "Seasonality", cell: (a) => a.seasonality, sortValue: (a) => a.seasonality },
    {
      key: "bagtare",
      header: "Per-bag tare",
      cell: (a) =>
        a.bagWeightApplicable ? (
          <StatusChip tone="ok" label="applies" size="sm" />
        ) : (
          <StatusChip
            tone="idle"
            label="not applicable"
            size="sm"
            title="Is Applicable is unset, so no per-bag weight is held and receipts on this agreement carry a packaging tare of zero by statement."
          />
        ),
      sortValue: (a) => (a.bagWeightApplicable ? "applies" : "not applicable"),
    },
    {
      key: "commodity",
      header: "Commodity",
      cell: (a) => commodityName(a.commodityId),
      sortValue: (a) => commodityName(a.commodityId),
    },
    {
      key: "supplier",
      header: "Supplier",
      cell: (a) => counterpartyName(a.supplierId),
      sortValue: (a) => counterpartyName(a.supplierId),
    },
    { key: "purchaser", header: "Purchaser", cell: (a) => a.purchaser, sortValue: (a) => a.purchaser },
    {
      key: "agreed",
      header: "Agreed quantity",
      align: "right",
      cell: (a) => formatMt(a.totalQuantityMt),
      sortValue: (a) => a.totalQuantityMt,
    },
    {
      key: "allocated",
      header: "Allocated",
      align: "right",
      cell: (a) => formatMt(balanceOf.get(a.id)?.allocatedMt),
      sortValue: (a) => balanceOf.get(a.id)?.allocatedMt ?? 0,
    },
    {
      key: "remaining",
      header: "Remaining",
      align: "right",
      cell: (a) => {
        const bal = balanceOf.get(a.id);
        if (!bal) return <span className="muted">–</span>;
        return bal.overAllocated ? (
          <StatusChip
            tone="risk"
            label={`over by ${formatMt(Math.abs(bal.remainingMt))}`}
            size="sm"
            title="The legacy grid shows no total, no agreed quantity and no remainder, so nothing surfaced this."
          />
        ) : (
          <strong>{formatMt(bal.remainingMt)}</strong>
        );
      },
      sortValue: (a) => balanceOf.get(a.id)?.remainingMt ?? 0,
    },
    {
      key: "received",
      header: "Received and confirmed",
      align: "right",
      cell: (a) => formatMt(receivedOf.get(a.id)?.confirmedMt),
      sortValue: (a) => receivedOf.get(a.id)?.confirmedMt ?? 0,
    },
    {
      key: "flow",
      header: "Flow status",
      cell: (a) => <StatusChip tone={toneFor(a.flowStatus)} label={humanise(a.flowStatus)} size="sm" />,
      sortValue: (a) => a.flowStatus,
      filterOptions: [...new Set(agreements.map((a) => a.flowStatus))].map((s) => ({
        value: s,
        label: humanise(s),
      })),
      filterMatch: (a, v) => a.flowStatus === v,
    },
    {
      key: "type",
      /* Added to the list by the instruction of 3 September 2026, which asks for the
         Agreement Type on the add screen, the list view, the view and the edit screen —
         all four. Filterable, because "show me the Collection agreements" is the question
         a column of two values exists to answer. */
      header: "Agreement type",
      cell: (a) => (
        <StatusChip tone={toneFor(a.agreementType)} label={humanise(a.agreementType)} size="sm" />
      ),
      sortValue: (a) => a.agreementType,
      filterOptions: [
        { value: "fixed", label: "Fixed" },
        { value: "collection", label: "Collection" },
      ],
      filterMatch: (a, v) => a.agreementType === v,
    },
    {
      key: "date",
      header: "Agreement date",
      cell: (a) => formatDate(a.agreementDate),
      sortValue: (a) => a.agreementDate,
    },
    {
      key: "createdBy",
      header: "Created by",
      cell: (a) => <span className="small">{a.createdBy}</span>,
      sortValue: (a) => a.createdBy,
      optional: true,
    },
  ];

  return (
    <>
      <DataTable
        caption="Purchase agreements"
        rows={agreements}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by PA ref, purchase order, supplier or commodity…"
        searchValue={(a) =>
          `${a.paRef} ${a.purchaseOrderNo} ${counterpartyName(a.supplierId)} ${commodityName(a.commodityId)} ${a.purchaser} ${humanise(a.agreementType)}`
        }
        rowHref={(a) => `/sourcing/agreements/${a.id}`}
        savedViews={[
          { key: "all", label: "All agreements" },
          { key: "ongoing", label: "On-going", predicate: (a) => a.flowStatus === "on_going" },
          {
            key: "over",
            label: "Over-allocated",
            description:
              "Receiving-location plans total more than the agreed quantity. The legacy screens show no such figure, so this state was invisible.",
            predicate: (a) => Boolean(balanceOf.get(a.id)?.overAllocated),
          },
          {
            key: "unallocated",
            label: "Nothing allocated yet",
            description:
              "No receiving location assigned, so no receipt can be booked against the agreement at a facility.",
            predicate: (a) => (balanceOf.get(a.id)?.allocatedMt ?? 0) === 0,
          },
          { key: "completed", label: "Completed", predicate: (a) => a.flowStatus === "completed" },
        ]}
      />

      <div className="grid-2">
        <SummaryCard title="Agreements by flow status">
          {statusCounts.length === 0 ? (
            <p className="muted small">No agreement held.</p>
          ) : (
            <ul className="doclist">
              {statusCounts.map((s) => (
                <li key={s.status}>
                  <span className="doclist__name">
                    {humanise(s.status)}
                    <span className="doclist__sub">
                      {s.count} agreement{s.count === 1 ? "" : "s"}
                    </span>
                  </span>
                  <StatusChip tone={toneFor(s.status)} label={humanise(s.status)} size="sm" />
                </li>
              ))}
            </ul>
          )}
          <p className="xsmall muted" style={{ marginTop: "0.5rem" }}>
            `Flow Status` is not a column on the legacy list at all, so agreement status could not be seen or
            filtered without opening each record.
          </p>
        </SummaryCard>

        <SummaryCard title="Over-allocated agreements" tone={overAllocated.length > 0 ? "risk" : "ok"}>
          <p className="page__title" style={{ margin: 0 }}>
            {formatNumber(overAllocated.length)}
          </p>
          <p className="small" style={{ marginTop: "0.5rem" }}>
            The captured legacy case is agreement <span className="mono">321_2009374</span>: plan lines of
            10,000 MT and 15,700 MT — 25,700 MT in total — against an agreed quantity of 17,777 MT, with a
            third row's quantity blank. The legacy Receiving Locations screens carry no total, no agreed
            quantity, no remainder and no over-allocation check, so the excess of 7,923 MT appears nowhere.
          </p>
          {overAllocated.length > 0 ? (
            <ul className="doclist" style={{ marginTop: "0.5rem" }}>
              {overAllocated.map((a) => (
                <li key={a.id}>
                  <span className="doclist__name">
                    <Link className="mono" to={`/sourcing/agreements/${a.id}`}>
                      {a.paRef}
                    </Link>
                    <span className="doclist__sub">
                      agreed {formatMt(a.totalQuantityMt)} · allocated{" "}
                      {formatMt(balanceOf.get(a.id)?.allocatedMt)}
                    </span>
                  </span>
                  <StatusChip
                    tone="risk"
                    label={`over by ${formatMt(Math.abs(balanceOf.get(a.id)?.remainingMt ?? 0))}`}
                    size="sm"
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </SummaryCard>
      </div>

      <Banner tone="warn" title="Flow status: five values, no default and no transition evidence">
        The source gives five options — <em>Open</em>, <em>On-going</em>, <em>Hold</em>, <em>Completed</em>{" "}
        and <em>Cancled</em> (misspelt in the legacy UI, normalised once to <em>Cancelled</em> here). It
        states no default, no permitted-transition matrix, no role gating and no evidence that receipts drive
        the status. No transition map is asserted for it, so the status is shown and never advanced
        automatically.
      </Banner>

      <p className="small muted" style={{ marginTop: "0.5rem" }}>
        The legacy list grid shows the purchaser as a username (<span className="mono">khalid.hamada</span>)
        while the two detail views show a display name (<em>Khalid Hamada</em>) for the same person. One name
        is used on every screen here, with the username kept separately as <em>Created by</em>.
      </p>
    </>
  );
}

/* ================================================================== *
 * Tab 2 — receiving locations, with the balance the legacy never shows
 * ================================================================== */

interface StagedPlanRow {
  key: string;
  facility: string;
  quantityMt: number;
  assignedTo: string;
}

function LocationsTab({
  agreements,
  plans,
  loading,
}: {
  agreements: PurchaseAgreement[];
  plans: ReceivingLocationPlan[];
  loading: boolean;
}) {
  const toast = useToast();

  // Basket state — the MMP "+ Add Plan" pattern: stage many, submit once.
  const [basketAgreementId, setBasketAgreementId] = useState("");
  const [draftFacility, setDraftFacility] = useState("");
  const [draftQuantity, setDraftQuantity] = useState("");
  const [draftAssignee, setDraftAssignee] = useState("");
  const [staged, setStaged] = useState<StagedPlanRow[]>([]);
  const [basketErrors, setBasketErrors] = useState<Record<string, string>>({});
  const [basketRefusal, setBasketRefusal] = useState<string | null>(null);
  const [basketWarning, setBasketWarning] = useState<string | null>(null);

  // Edit-one-row state — the form the legacy omits `Quantity` from.
  const [editing, setEditing] = useState<ReceivingLocationPlan | null>(null);
  const [editFacility, setEditFacility] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const agreementById = new Map(agreements.map((a) => [a.id, a]));
  const plansFor = (id: string) => plans.filter((p) => p.purchaseAgreementId === id);
  const balanceOf = new Map(agreements.map((a) => [a.id, allocationBalance(a, plansFor(a.id))]));

  /**
   * The location options on this tab.
   *
   * The instruction of 3 September 2026 makes the receiving-location list a master
   * lookup, so this list is the master rather than the names already on plan rows. The
   * Add screen at `/sourcing/locations/new` asks for the location type and the country
   * first and offers only that country's locations of that type; this tab is the
   * correct-a-row surface, so it offers the whole master with each entry labelled by its
   * kind and country and lets the service classify what is chosen. Any location a
   * captured row names that the master does not hold is kept in the list, so an existing
   * row can still be re-saved without its location being silently changed.
   */
  const facilityOptions = [
    ...RECEIVING_LOCATIONS.filter((l) => l.active).map((l) => ({
      value: receivingLocationLabel(l),
      label: `${receivingLocationLabel(l)} — ${humanise(l.kind)}, ${l.country}`,
    })),
    ...[...new Set(plans.map((p) => p.facility))]
      .filter((f) => !receivingLocationByLabel(f))
      .sort()
      .map((f) => ({ value: f, label: `${f} — not in the receiving-location master` })),
  ];
  const assigneeOptions = [
    ...new Set([...plans.map((p) => p.assignedTo), ...agreements.map((a) => a.createdBy)]),
  ]
    .sort()
    .map((v) => ({ value: v, label: v }));

  const basketAgreement = basketAgreementId ? agreementById.get(basketAgreementId) : undefined;
  const stagedTotal = sum(staged.map((s) => s.quantityMt));
  const headroom = basketAgreement
    ? checkAllocationHeadroom(basketAgreement, plansFor(basketAgreement.id), stagedTotal)
    : undefined;

  function resetBasket() {
    setStaged([]);
    setDraftFacility("");
    setDraftQuantity("");
    setDraftAssignee("");
    setBasketErrors({});
  }

  function addStagedRow() {
    const next: Record<string, string> = {};
    if (!basketAgreementId) next["rl-agreement"] = "Select the agreement the allocation belongs to.";
    if (!draftFacility) next["rl-facility"] = "Select a receiving facility.";
    if (!draftAssignee) next["rl-assignee"] = "Select the user responsible for the allocation.";
    const qty = parseNumber(draftQuantity);
    if (qty === undefined) next["rl-quantity"] = "Enter the quantity to allocate, in MT.";
    else if (qty <= 0) next["rl-quantity"] = "The quantity must be greater than zero.";
    setBasketErrors(next);
    if (Object.keys(next).length > 0) return;
    setStaged((rows) => [
      ...rows,
      {
        key: `${draftFacility}-${draftAssignee}-${rows.length}`,
        facility: draftFacility,
        quantityMt: qty as number,
        assignedTo: draftAssignee,
      },
    ]);
    setDraftFacility("");
    setDraftQuantity("");
    setDraftAssignee("");
  }

  async function submitBasket() {
    setBasketRefusal(null);
    setBasketWarning(null);
    if (!basketAgreementId) {
      setBasketErrors({ "rl-agreement": "Select the agreement the allocation belongs to." });
      return;
    }
    const res = await api.addReceivingLocationPlans(
      basketAgreementId,
      staged.map((s) => ({ facility: s.facility, quantityMt: s.quantityMt, assignedTo: s.assignedTo })),
    );
    if (!res.ok) {
      setBasketRefusal(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `${res.value.plans.length} plan line(s) saved.`);
    if (res.value.warning) setBasketWarning(res.value.warning);
    resetBasket();
  }

  function startEdit(plan: ReceivingLocationPlan) {
    setEditing(plan);
    setEditFacility(plan.facility);
    setEditQuantity(plan.quantityMt ? String(plan.quantityMt) : "");
    setEditAssignee(plan.assignedTo);
    setEditErrors({});
  }

  async function submitEdit() {
    if (!editing) return;
    const next: Record<string, string> = {};
    const qty = parseNumber(editQuantity);
    if (qty === undefined) next["rl-edit-quantity"] = "Enter the allocated quantity, in MT.";
    else if (qty <= 0) next["rl-edit-quantity"] = "The quantity must be greater than zero.";
    if (!editFacility) next["rl-edit-facility"] = "Select a receiving facility.";
    if (!editAssignee) next["rl-edit-assignee"] = "Select the user responsible for the allocation.";
    setEditErrors(next);
    if (Object.keys(next).length > 0) return;
    const res = await api.updateReceivingLocationPlan(editing.id, {
      facility: editFacility,
      quantityMt: qty as number,
      assignedTo: editAssignee,
    });
    if (!res.ok) {
      setEditErrors({ "rl-edit-quantity": res.reason });
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `Plan line ${editing.planId} updated.`);
    setEditing(null);
  }

  const columns: Column<ReceivingLocationPlan>[] = [
    {
      key: "planId",
      header: "Plan",
      cell: (p) => <span className="mono">{p.planId}</span>,
      sortValue: (p) => p.planId,
    },
    {
      key: "agreement",
      header: "Agreement",
      cell: (p) => {
        const a = agreementById.get(p.purchaseAgreementId);
        return a ? (
          <Link className="mono" to={`/sourcing/agreements/${a.id}`}>
            {a.paRef}
          </Link>
        ) : (
          <span className="muted">–</span>
        );
      },
      sortValue: (p) => agreementById.get(p.purchaseAgreementId)?.paRef ?? "",
    },
    {
      key: "kind",
      /* Added 3 September 2026 with the Warehouse-or-Facility choice on the Add screen.
         Captured rows carry no kind of their own, so it is read from the location code. */
      header: "Location type",
      cell: (p) => {
        const kind = p.locationKind ?? receivingLocationKindOf(p.facility);
        return (
          <>
            <StatusChip tone="info" label={humanise(kind)} size="sm" />
            {p.country ? <span className="xsmall muted"> {p.country}</span> : null}
          </>
        );
      },
      sortValue: (p) => p.locationKind ?? receivingLocationKindOf(p.facility),
      filterOptions: [
        { value: "facility", label: "Facility" },
        { value: "warehouse", label: "Warehouse" },
      ],
      filterMatch: (p, v) => (p.locationKind ?? receivingLocationKindOf(p.facility)) === v,
    },
    { key: "facility", header: "Location", cell: (p) => p.facility, sortValue: (p) => p.facility },
    {
      key: "quantity",
      header: "Quantity",
      align: "right",
      cell: (p) =>
        p.quantityMt ? (
          formatMt(p.quantityMt)
        ) : (
          <StatusChip
            tone="risk"
            label="blank in the source"
            size="sm"
            title="Quantity is marked required on the legacy add form, yet four of ten captured rows hold no quantity."
          />
        ),
      sortValue: (p) => p.quantityMt || 0,
    },
    { key: "assigned", header: "Assigned to", cell: (p) => p.assignedTo, sortValue: (p) => p.assignedTo },
    {
      key: "created",
      header: "Created on",
      cell: (p) => formatDate(p.createdOn),
      sortValue: (p) => p.createdOn,
    },
    {
      key: "edit",
      header: "Correct this line",
      cell: (p) => (
        <button type="button" className="btn btn--sm" onClick={() => startEdit(p)}>
          Edit
        </button>
      ),
    },
  ];

  const agreementsWithPlans = agreements.filter((a) => plansFor(a.id).length > 0);

  return (
    <>
      <Banner tone="warn" title="The single largest gap in the legacy module">
        The stated purpose of Receiving Locations is to allocate <em>the contracted quantity</em> of a
        purchase agreement across facilities, yet no screen in the module shows the agreed quantity, the sum
        allocated so far or the unallocated remainder. The grid has a footer row with an empty{" "}
        <em>Quantity</em> cell, so it computes no sum. Nothing prevents over- or under-allocation and the
        source states no validation. The three figures below come from <code>allocationBalance()</code>, and a
        proposed allocation is checked with <code>checkAllocationHeadroom()</code>, which reports and never
        refuses — no source says over-allocation is blocked, and the captured data proves it is not.
      </Banner>

      <DataTable
        caption="Receiving location plan lines"
        rows={plans}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by plan, agreement, facility or assignee…"
        searchValue={(p) =>
          `${p.planId} ${agreementById.get(p.purchaseAgreementId)?.paRef ?? ""} ${p.facility} ${p.assignedTo}`
        }
        savedViews={[
          { key: "all", label: "All plan lines" },
          {
            key: "blank",
            label: "Quantity blank in the source",
            description:
              "Quantity is required on the legacy add form and blank on four of ten captured rows. The source does not resolve how.",
            predicate: (p) => !p.quantityMt,
          },
          {
            key: "over",
            label: "On an over-allocated agreement",
            predicate: (p) => Boolean(balanceOf.get(p.purchaseAgreementId)?.overAllocated),
          },
        ]}
        emptyTitle="No receiving location allocated"
        emptyBody="Until a facility is allocated, no receipt can be booked against the agreement at that facility."
      />

      <div className="stack">
        {agreementsWithPlans.map((a) => {
          const bal = balanceOf.get(a.id);
          if (!bal) return null;
          return (
            <CollapsibleSection
              key={a.id}
              title={`${a.paRef} — ${plansFor(a.id).length} plan line(s) · ${commodityName(a.commodityId)}`}
              defaultOpen={bal.overAllocated}
              indicator={
                <StatusChip
                  tone={bal.overAllocated ? "risk" : bal.remainingMt === 0 ? "ok" : "accent"}
                  label={
                    bal.overAllocated
                      ? `over by ${formatMt(Math.abs(bal.remainingMt))}`
                      : `${formatMt(bal.remainingMt)} unallocated`
                  }
                  size="sm"
                />
              }
            >
              <div className="grid-2">
                <QuantityDonut
                  fraction={bal.fraction}
                  valueLabel={formatMt(bal.allocatedMt)}
                  ofLabel={formatMt(bal.agreedMt)}
                  caption="of the agreed quantity allocated to facilities"
                  tone={bal.overAllocated ? "warn" : bal.fraction >= 1 ? "ok" : "accent"}
                />
                <FieldGrid
                  columns={1}
                  fields={[
                    { label: "Agreed quantity", value: formatMt(bal.agreedMt), behaviour: "inherited" },
                    { label: "Allocated", value: formatMt(bal.allocatedMt), behaviour: "calculated" },
                    {
                      label: "Remaining",
                      value: <strong>{formatMt(bal.remainingMt)}</strong>,
                      behaviour: "calculated",
                    },
                    {
                      label: "Rows with no quantity",
                      value: formatNumber(bal.rowsWithNoQuantity),
                      hint: "Required on the legacy add form, blank in the captured data.",
                    },
                  ]}
                />
              </div>
              <TotalBanner
                label={bal.overAllocated ? "Allocated over the agreed quantity" : "Remaining to allocate"}
                value={formatMt(Math.abs(bal.remainingMt))}
                derivation={`agreed ${formatMt(bal.agreedMt)} − allocated ${formatMt(bal.allocatedMt)} across ${plansFor(a.id).length} plan line(s)`}
              />
              {bal.overAllocated ? (
                <Banner tone="risk" title="Allocations exceed the agreed quantity">
                  The plan lines total {formatMt(bal.allocatedMt)} against {formatMt(bal.agreedMt)} agreed.
                  The legacy screens surface no total and no check, which is how this record was saved.
                </Banner>
              ) : null}
            </CollapsibleSection>
          );
        })}
      </div>

      <CollapsibleSection
        title="Add plan lines (the MMP basket, with the headroom shown)"
        defaultOpen={false}
      >
        <Banner tone="info" title="Why this is a basket">
          The legacy add form is the one form in the module that stages rows: <em>+ Add Plan</em> appends the
          current field values to a table on the page rather than saving, so several facilities can be
          allocated in one visit, then a single <em>Submit</em> posts them all. That pattern is kept. What is
          added is the running headroom, which the legacy basket does not show — it has no totals row at all.
          The legacy agreement dropdown offered only three of the seven agreements in the system and the
          source never states the filter criterion, so every agreement is offered here and the gap is recorded
          rather than guessed.
        </Banner>

        {basketRefusal ? (
          <Banner tone="risk" title="The plan lines could not be saved">
            {basketRefusal}
          </Banner>
        ) : null}
        {basketWarning ? (
          <Banner tone="warn" title="Saved, with the balance now negative">
            {basketWarning}
          </Banner>
        ) : null}

        <ErrorSummary
          title="The plan line could not be staged"
          errors={Object.entries(basketErrors).map(([field, message]) => ({ field, message }))}
        />

        <div className="fields">
          <FormRow
            label="Agreement reference"
            htmlFor="rl-agreement"
            required
            error={basketErrors["rl-agreement"]}
            hint="Selecting an agreement is what makes the allocation balance meaningful."
          >
            <SelectInput
              id="rl-agreement"
              value={basketAgreementId}
              onChange={(v) => {
                setBasketAgreementId(v);
                setStaged([]);
                setBasketWarning(null);
              }}
              required
              error={basketErrors["rl-agreement"]}
              placeholder="Select an agreement…"
              options={agreements.map((a) => ({
                value: a.id,
                label: `${a.paRef} — ${commodityName(a.commodityId)} — ${formatMt(a.totalQuantityMt)} agreed`,
              }))}
            />
          </FormRow>
          <FormRow label="Facility" htmlFor="rl-facility" required error={basketErrors["rl-facility"]}>
            <SelectInput
              id="rl-facility"
              value={draftFacility}
              onChange={setDraftFacility}
              required
              error={basketErrors["rl-facility"]}
              placeholder="Select a facility…"
              options={facilityOptions}
            />
          </FormRow>
          <FormRow
            label="Quantity (MT)"
            htmlFor="rl-quantity"
            required
            error={basketErrors["rl-quantity"]}
            hint="The source never states the unit of measure for this field. MT is used throughout this mock-up and the unit is on the label."
          >
            <TextInput
              id="rl-quantity"
              value={draftQuantity}
              onChange={setDraftQuantity}
              required
              error={basketErrors["rl-quantity"]}
              inputMode="decimal"
            />
          </FormRow>
          <FormRow label="Assigned to" htmlFor="rl-assignee" required error={basketErrors["rl-assignee"]}>
            <SelectInput
              id="rl-assignee"
              value={draftAssignee}
              onChange={setDraftAssignee}
              required
              error={basketErrors["rl-assignee"]}
              placeholder="Select an assignee…"
              options={assigneeOptions}
            />
          </FormRow>
        </div>

        <RequiredLegend />

        <div className="factions">
          <button type="button" className="btn" onClick={addStagedRow}>
            Add plan
          </button>
        </div>

        {staged.length === 0 ? (
          <EmptyState title="No plan line staged yet" glyph="○">
            Stage one line per facility, then submit them together.
          </EmptyState>
        ) : (
          <>
            <div className="dtable__scroll">
              <table className="dtable__table">
                <caption className="sr-only">Staged plan lines</caption>
                <thead>
                  <tr>
                    <th scope="col">Facility</th>
                    <th scope="col" className="text-right">
                      Quantity
                    </th>
                    <th scope="col">Assigned to</th>
                    <th scope="col">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {staged.map((s) => (
                    <tr key={s.key}>
                      <td>{s.facility}</td>
                      <td className="text-right">{formatMt(s.quantityMt)}</td>
                      <td>{s.assignedTo}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--sm"
                          onClick={() => setStaged((rows) => rows.filter((r) => r.key !== s.key))}
                        >
                          Remove line
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td>
                      <strong>Staged total</strong>
                    </td>
                    <td className="text-right">
                      <strong>{formatMt(stagedTotal)}</strong>
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="small" aria-live="polite" style={{ marginTop: "0.5rem" }}>
              {headroom ? (
                headroom.withinAgreement ? (
                  <>
                    Headroom after these {staged.length} staged line(s):{" "}
                    <strong>{formatMt(headroom.headroomMt)}</strong> of the agreed quantity would remain
                    unallocated.
                  </>
                ) : (
                  <StatusChip
                    tone="risk"
                    label={`exceeds the agreement by ${formatMt(Math.abs(headroom.headroomMt))}`}
                    size="sm"
                  />
                )
              ) : (
                <span className="muted">Select an agreement to see the headroom.</span>
              )}
            </p>
            {headroom && !headroom.withinAgreement ? (
              <Banner tone="warn" title="This would over-allocate the agreement">
                {headroom.message} Nothing here refuses the save, because no source states that
                over-allocation is blocked. It is reported so the person entering it can see it.
              </Banner>
            ) : null}

            <div className="factions">
              <button type="button" className="btn btn--primary" onClick={() => void submitBasket()}>
                Submit {staged.length} plan line(s)
              </button>
              <button type="button" className="btn" onClick={resetBasket}>
                Clear the basket
              </button>
            </div>
          </>
        )}
      </CollapsibleSection>

      <Dialog
        open={editing !== null}
        title={editing ? `Correct plan line ${editing.planId}` : "Correct plan line"}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary" onClick={() => void submitEdit()}>
              Save changes
            </button>
          </>
        }
      >
        {editing ? (
          <>
            <Banner tone="info" title="Quantity is editable here, and is not in the legacy form">
              The legacy edit form carries three fields — a disabled agreement, the facility and the assignee.{" "}
              <em>Quantity</em> is absent from it entirely, so a wrong quantity can never be corrected through
              the legacy UI; the source states no other route and does not say how a correction is ever made.
            </Banner>
            <ErrorSummary
              title="The plan line could not be saved"
              errors={Object.entries(editErrors).map(([field, message]) => ({ field, message }))}
            />
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Agreement",
                  value: agreementById.get(editing.purchaseAgreementId)?.paRef,
                  behaviour: "inherited",
                },
              ]}
            />
            <div className="fields">
              <FormRow
                label="Facility"
                htmlFor="rl-edit-facility"
                required
                error={editErrors["rl-edit-facility"]}
              >
                <SelectInput
                  id="rl-edit-facility"
                  value={editFacility}
                  onChange={setEditFacility}
                  required
                  error={editErrors["rl-edit-facility"]}
                  options={facilityOptions}
                />
              </FormRow>
              <FormRow
                label="Quantity (MT)"
                htmlFor="rl-edit-quantity"
                required
                error={editErrors["rl-edit-quantity"]}
                hint="Absent from the legacy edit form."
              >
                <TextInput
                  id="rl-edit-quantity"
                  value={editQuantity}
                  onChange={setEditQuantity}
                  required
                  error={editErrors["rl-edit-quantity"]}
                  inputMode="decimal"
                />
              </FormRow>
              <FormRow
                label="Assigned to"
                htmlFor="rl-edit-assignee"
                required
                error={editErrors["rl-edit-assignee"]}
              >
                <SelectInput
                  id="rl-edit-assignee"
                  value={editAssignee}
                  onChange={setEditAssignee}
                  required
                  error={editErrors["rl-edit-assignee"]}
                  options={assigneeOptions}
                />
              </FormRow>
            </div>
            <RequiredLegend />
          </>
        ) : null}
      </Dialog>

      <p className="small muted" style={{ marginTop: "0.5rem" }}>
        Two things the source leaves open and this screen does not resolve: what <em>Assigned To</em> confers
        — no downstream use of the assignee is documented anywhere — and whether facility plus agreement must
        be unique. The captured data repeats the same pair with different assignees, so in practice it is not,
        but no rule is stated either way. Saved plan lines also cannot be deleted in the legacy module at all;
        there is no delete here either, because no source establishes what deleting one would mean.
      </p>
    </>
  );
}

/* ================================================================== *
 * Tabs 3 and 4 — facility receipts and warehouse receipts
 * ================================================================== */

function ReceiptsTab({
  kind,
  rows,
  agreements,
  loading,
  zeroQuantityElsewhere = [],
}: {
  kind: "facility" | "warehouse";
  rows: IntakeReceipt[];
  agreements: PurchaseAgreement[];
  loading: boolean;
  zeroQuantityElsewhere?: IntakeReceipt[];
}) {
  const agreementById = new Map(agreements.map((a) => [a.id, a]));
  const weightsOf = new Map(
    rows.map((r) => {
      const a = agreementById.get(r.purchaseAgreementId);
      return [r.id, a ? receiptWeights(r, a) : undefined];
    }),
  );
  const anyPriced = rows.some((r) => r.pricing);
  const showPricingColumns = kind === "facility" || anyPriced;
  const locationHeader = kind === "facility" ? "Facility" : "Warehouse";

  const totals = agreements.map((a) => receivedAgainstAgreement(a.id, rows, agreements));
  const confirmedMt = round(sum(totals.map((t) => t.confirmedMt)), 3);
  const awaitingMt = round(sum(totals.map((t) => t.awaitingReviewMt)), 3);
  const unpricedCount = rows.filter((r) => !r.pricing).length;

  const columns: Column<IntakeReceipt>[] = [
    {
      key: "ref",
      header: "Reference number",
      cell: (r) => (
        <Link className="mono" to={`/sourcing/receipts/${r.id}`}>
          {r.referenceNo}
        </Link>
      ),
      sortValue: (r) => r.referenceNo,
    },
    {
      key: "agreement",
      header: "Agreement",
      cell: (r) => {
        const a = agreementById.get(r.purchaseAgreementId);
        return a ? (
          <Link className="mono" to={`/sourcing/agreements/${a.id}`}>
            {a.paRef}
          </Link>
        ) : (
          <span className="muted">–</span>
        );
      },
      sortValue: (r) => agreementById.get(r.purchaseAgreementId)?.paRef ?? "",
    },
    { key: "location", header: locationHeader, cell: (r) => r.location, sortValue: (r) => r.location },
    {
      key: "date",
      header: "Receipt date",
      cell: (r) => formatDate(r.receiptDate),
      sortValue: (r) => r.receiptDate,
    },
    {
      key: "plate",
      header: "Plate number",
      cell: (r) => <span className="mono small">{r.plateNo ?? "–"}</span>,
      sortValue: (r) => r.plateNo ?? "",
    },
    {
      key: "bags",
      header: "Total bags",
      align: "right",
      cell: (r) => formatNumber(totalBags(r.bags)),
      sortValue: (r) => totalBags(r.bags),
    },
    {
      key: "gross",
      header: "Gross with dirt",
      align: "right",
      cell: (r) =>
        isZeroQuantity(r) ? (
          <StatusChip
            tone="risk"
            label="saved with no quantities"
            size="sm"
            title="Only the location and the receipt date are required on the legacy form."
          />
        ) : (
          formatMt(r.grossWeightWithDirtMt)
        ),
      sortValue: (r) => r.grossWeightWithDirtMt,
    },
  ];

  if (showPricingColumns) {
    columns.push(
      {
        key: "net",
        header: "Net weight",
        align: "right",
        cell: (r) => {
          const w = weightsOf.get(r.id);
          if (!w || w.netMt === undefined) return <StatusChip tone="warn" label="not priced" size="sm" />;
          return <strong>{formatMt(w.netMt)}</strong>;
        },
        sortValue: (r) => weightsOf.get(r.id)?.netMt ?? -1,
      },
      {
        key: "variance",
        header: "Variance vs agent",
        align: "right",
        cell: (r) => {
          const w = weightsOf.get(r.id);
          if (!w || w.varianceMt === undefined) return <span className="muted">–</span>;
          return w.varianceMt === 0 ? (
            formatMt(0)
          ) : (
            <StatusChip tone="warn" label={formatMt(w.varianceMt)} size="sm" />
          );
        },
        sortValue: (r) => Math.abs(weightsOf.get(r.id)?.varianceMt ?? 0),
      },
      {
        key: "status",
        header: "Receipt status",
        cell: (r) => receiptStatusChip(r),
        sortValue: (r) => r.pricing?.status ?? "unpriced",
        filterOptions: [
          { value: "confirmed", label: "Confirmed" },
          { value: "need_review", label: "Need review" },
          { value: "unpriced", label: "Not priced" },
        ],
        filterMatch: (r, v) => (r.pricing?.status ?? "unpriced") === v,
      },
    );
  }

  columns.push(
    {
      key: "bridge",
      header: "Weighbridge",
      cell: (r) => <span className="small">{r.weighBridge ?? "–"}</span>,
      sortValue: (r) => r.weighBridge ?? "",
      optional: true,
    },
    {
      key: "driver",
      header: "Driver",
      cell: (r) => (
        <span className="small">
          {r.driverName ?? "–"}
          {r.driverPhone ? ` · ${r.driverPhone}` : ""}
        </span>
      ),
      sortValue: (r) => r.driverName ?? "",
      optional: true,
    },
  );

  return (
    <>
      {kind === "warehouse" ? (
        <>
          <Banner tone="info" title="In the legacy system a warehouse receipt could never be priced at all">
            <code>/WarehouseReceipts/Edit/{"{id}"}</code> returns HTTP 500 and{" "}
            <code>/WarehouseReceipts/AddReceiptPrice/{"{id}"}</code> does not exist — it redirects to a
            not-found page, also with HTTP 500 — so the source states plainly that a warehouse receipt "can
            never be priced or confirmed through the UI". It is a single-state, create-once record: created,
            then viewable, carrying quantity and never value. Its detail page is titled{" "}
            <em>Display Material Receipt Form</em> — the wrong entity, because the view was copied from
            Material Receipts and never corrected — and it loads with{" "}
            <code>TypeError: Cannot set properties of null (setting 'onblur')</code> because the Material
            Receipts page script was copied verbatim and still tries to attach handlers to pricing fields that
            do not exist on the form. That error aborts the rest of the setup, which is why the gross weight
            field is left with no handler at all. Here a warehouse receipt opens its own detail page and can
            be priced through the same step as a facility receipt.
          </Banner>
          {zeroQuantityElsewhere.length > 0 ? (
            <Banner tone="warn" title="A receipt can be saved with no quantities">
              Only the warehouse and the receipt date are required, so bag counts and gross weight can all be
              left empty and the record still saves. The captured example of that is receipt{" "}
              {zeroQuantityElsewhere.map((r) => (
                <Link className="mono" key={r.id} to={`/sourcing/receipts/${r.id}`}>
                  {r.referenceNo}
                </Link>
              ))}{" "}
              on the facility-receipt tab — zero bags of every type and a gross weight of zero. The same gap
              exists on both forms; it is flagged with a risk chip wherever such a record appears, and the
              create path in this mock-up refuses a receipt with no weighbridge figure.
            </Banner>
          ) : null}
        </>
      ) : null}

      <DataTable
        caption={kind === "facility" ? "Facility receipts" : "Warehouse receipts"}
        rows={rows}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by reference, agreement, location or plate…"
        searchValue={(r) =>
          `${r.referenceNo} ${agreementById.get(r.purchaseAgreementId)?.paRef ?? ""} ${r.location} ${r.plateNo ?? ""} ${r.driverName ?? ""}`
        }
        rowHref={(r) => `/sourcing/receipts/${r.id}`}
        savedViews={[
          { key: "all", label: "All receipts" },
          {
            key: "unpriced",
            label: "Not priced",
            description:
              "Pricing is a separate Sourcing step. An unpriced receipt has no net weight, no value and no status.",
            predicate: (r) => !r.pricing,
          },
          {
            key: "review",
            label: "Awaiting review",
            predicate: (r) => r.pricing?.status === "need_review",
          },
          { key: "confirmed", label: "Confirmed", predicate: (r) => r.pricing?.status === "confirmed" },
          {
            key: "variance",
            label: "With a weight variance",
            description:
              "Our net weight differs from the agent's declared net weight. The legacy figure is an absolute difference, so it never shows the direction.",
            predicate: (r) => {
              const w = weightsOf.get(r.id);
              return w?.varianceMt !== undefined && w.varianceMt !== 0;
            },
          },
        ]}
        emptyTitle={kind === "facility" ? "No facility receipt held" : "No warehouse receipt held"}
        emptyBody="A receipt is booked against a facility already allocated on the purchase agreement."
      />

      {kind === "facility" ? (
        <>
          <div className="grid-3">
            <SummaryCard title="Confirmed tonnage" tone="ok">
              <p className="page__title" style={{ margin: 0 }}>
                {formatMt(confirmedMt)}
              </p>
              <p className="small" style={{ marginTop: "0.5rem" }}>
                Net weight on receipts whose status is <em>Confirmed</em>. Only this figure counts towards the{" "}
                <Link to="/allocation/production-plan">weekly production plan</Link>: v2.0 §6.6 input 4 builds
                the plan on raw materials actually received, and register C-24 makes it a firm rule that
                planned-but-unreceived quantity is excluded.
              </p>
            </SummaryCard>
            <SummaryCard title="Awaiting review" tone="warn">
              <p className="page__title" style={{ margin: 0 }}>
                {formatMt(awaitingMt)}
              </p>
              <p className="small" style={{ marginTop: "0.5rem" }}>
                Priced, and held at <em>Need Review</em> with the Sourcing team. Setting the status to
                Confirmed is what closes a receipt off — the only status transition evidence in the whole
                source. Until then this tonnage does not reach the production plan.
              </p>
            </SummaryCard>
            <SummaryCard title="Not yet priced" tone="idle">
              <p className="page__title" style={{ margin: 0 }}>
                {formatNumber(unpricedCount)}
              </p>
              <p className="small" style={{ marginTop: "0.5rem" }}>
                Receipts with no price, no dirt deduction, no net weight and no status. Pricing is reached
                from the agreement in the legacy system and from the receipt itself here, and it carries no
                tonnage into the plan until it is confirmed.
              </p>
            </SummaryCard>
          </div>

          <Banner tone="warn" title="Receipt status was invisible outside the pricing form">
            The source records that <em>Receipt Status</em> appears on no list column and no detail field, so
            nobody looking at a receipt could tell whether it was <em>Need Review</em> or <em>Confirmed</em>.
            It is a column here, a saved view, and a field on the receipt. The source does not resolve whether
            Confirmed locks further edits, so nothing here claims it does.
          </Banner>
        </>
      ) : null}
    </>
  );
}

/* ================================================================== *
 * Tab 5 — funds
 * ================================================================== */

function FundsTab({ funds, loading }: { funds: Fund[]; loading: boolean }) {
  const refCounts = new Map<string, number>();
  for (const f of funds) refCounts.set(f.fundRef, (refCounts.get(f.fundRef) ?? 0) + 1);
  const duplicated = [...refCounts.entries()].filter(([, n]) => n > 1);

  const columns: Column<Fund>[] = [
    {
      key: "ref",
      header: "Fund ref",
      cell: (f) => (
        <>
          <span className="mono">{f.fundRef}</span>
          {(refCounts.get(f.fundRef) ?? 0) > 1 ? (
            <>
              {" "}
              <StatusChip
                tone="warn"
                label="not unique in the source"
                size="sm"
                title="The legacy Fund Ref is generated as purchase order plus a sequence, and the captured data holds the same reference on two records."
              />
            </>
          ) : null}
        </>
      ),
      sortValue: (f) => f.fundRef,
    },
    {
      key: "po",
      header: "PO number",
      cell: (f) =>
        f.purchaseOrderNo ? (
          <span className="mono small">{f.purchaseOrderNo}</span>
        ) : (
          <span className="muted small">not issued yet</span>
        ),
      sortValue: (f) => f.purchaseOrderNo ?? "",
      optional: true,
    },
    {
      key: "required",
      header: "Required payment date",
      cell: (f) => formatDate(f.requiredPaymentDate),
      sortValue: (f) => f.requiredPaymentDate,
    },
    {
      key: "actual",
      header: "Actual payment date",
      cell: (f) => {
        if (!f.actualPaymentDate) return <StatusChip tone="warn" label="not paid yet" size="sm" />;
        const delay = fundPaymentDelayDays(f);
        return (
          <>
            {formatDate(f.actualPaymentDate)}
            {delay !== undefined && delay > 0 ? (
              <>
                <br />
                <span className="xsmall muted">{delay} day(s) late</span>
              </>
            ) : null}
          </>
        );
      },
      sortValue: (f) => f.actualPaymentDate ?? "",
    },
    {
      key: "agent",
      header: "Agent",
      cell: (f) => counterpartyName(f.agentId),
      sortValue: (f) => counterpartyName(f.agentId),
    },
    {
      key: "commodity",
      header: "Commodity",
      cell: (f) => commodityName(f.commodityId),
      sortValue: (f) => commodityName(f.commodityId),
    },
    {
      key: "local",
      header: "Value in local currency",
      align: "right",
      cell: (f) => formatMoney(fundValueLocal(f)),
      sortValue: (f) => f.valueLocal,
    },
    {
      key: "usd",
      header: "Value in USD (calculated)",
      align: "right",
      cell: (f) => {
        const usd = fundValueUsd(f);
        return usd ? (
          formatMoney(usd)
        ) : (
          <span
            className="muted small"
            title="The rate is read on the actual payment date. Until the fund is paid there is no rate, so there is no value in USD — which is not the same as zero."
          >
            not until paid
          </span>
        );
      },
      sortValue: (f) => fundValueUsd(f)?.amount ?? 0,
    },
    {
      key: "rate",
      header: "Exchange rate",
      align: "right",
      cell: (f) => {
        const r = fundExchangeRate(f);
        return r ? (
          <>
            {formatNumber(r.perUsd)}
            <br />
            <span className="xsmall muted">from {formatDate(r.effectiveFrom)}</span>
          </>
        ) : (
          <span className="muted small">no rate yet</span>
        );
      },
      sortValue: (f) => fundExchangeRate(f)?.perUsd ?? 0,
    },
    {
      key: "mode",
      header: "Mode of fund",
      cell: (f) =>
        f.mode ? (
          <StatusChip tone={toneFor(f.mode)} label={humanise(f.mode)} size="sm" />
        ) : (
          <span className="muted small">not recorded yet</span>
        ),
      sortValue: (f) => f.mode ?? "",
      filterOptions: [...new Set(funds.map((f) => f.mode).filter(Boolean))].map((m) => ({
        value: m as string,
        label: humanise(m as string),
      })),
      filterMatch: (f, v) => f.mode === v,
    },
    {
      key: "bank",
      header: "Bank",
      cell: (f) =>
        f.mode === "finance" ? (
          (f.bankName ?? <span className="muted">not recorded</span>)
        ) : (
          <span className="muted">not applicable</span>
        ),
      sortValue: (f) => f.bankName ?? "",
      optional: true,
    },
    {
      key: "barter",
      header: "Barter commodity",
      cell: (f) =>
        f.mode === "barter" ? (
          f.barterCommodityId ? (
            commodityName(f.barterCommodityId)
          ) : (
            <span className="muted">not recorded</span>
          )
        ) : (
          <span className="muted">not applicable</span>
        ),
      sortValue: (f) => (f.barterCommodityId ? commodityName(f.barterCommodityId) : ""),
      optional: true,
    },
    {
      key: "tenor",
      header: "Tenor",
      cell: (f) => f.tenorPeriod ?? <span className="muted">–</span>,
      sortValue: (f) => f.tenorPeriod ?? "",
    },
  ];

  return (
    <>
      <Banner tone="info" title="What a fund is, and what the source states about it">
        A fund records financing raised against a purchase order for a given commodity and agent, entered in
        SDG with the USD value derived as <em>Value In SDG ÷ Exchange Rate</em> — the one calculated field in
        the legacy module, and the only one kept as-is here because it is verifiably correct (1,000,000 ÷ 600
        = 1,666.67). <em>Bank Name</em> applies to a finance fund and <em>Commodities "Barter"</em> to a
        barter fund; the source never says which fields apply when the mode is <em>Cash</em>, and no approval
        or rejection path exists anywhere in the module, so none is invented here.
      </Banner>

      {duplicated.length > 0 ? (
        <Banner tone="warn" title="Fund reference is not unique in the captured data">
          {duplicated.map(([ref, n]) => (
            <span key={ref}>
              <span className="mono">{ref}</span> appears on {n} records.{" "}
            </span>
          ))}
          Both are held against the same purchase order with different payment dates, and neither follows the
          documented <em>purchase order + sequence</em> pattern. The legacy system enforces no uniqueness on{" "}
          <em>Fund Ref</em>, and the source does not even state that it is meant to be unique. Both records
          are shown rather than one being suppressed.
        </Banner>
      ) : null}

      <DataTable
        caption="Funds"
        rows={funds}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by fund reference, purchase order, agent or commodity…"
        searchValue={(f) =>
          `${f.fundRef} ${f.purchaseOrderNo} ${counterpartyName(f.agentId)} ${commodityName(f.commodityId)} ${f.bankName ?? ""}`
        }
        savedViews={[
          { key: "all", label: "All funds" },
          { key: "finance", label: "Finance", predicate: (f) => f.mode === "finance" },
          { key: "cash", label: "Cash", predicate: (f) => f.mode === "cash" },
          { key: "barter", label: "Barter", predicate: (f) => f.mode === "barter" },
        ]}
      />

      <div className="stack">
        {funds.map((f) => {
          const rate = fundExchangeRate(f);
          const usd = fundValueUsd(f);
          const delay = fundPaymentDelayDays(f);
          return (
            <CollapsibleSection
              key={f.id}
              title={`${f.fundRef} — ${counterpartyName(f.agentId)} — ${formatMoney(fundValueLocal(f))}`}
              defaultOpen={false}
              indicator={
                f.actualPaymentDate ? (
                  <StatusChip
                    tone={f.mode ? toneFor(f.mode) : "info"}
                    label={f.mode ? humanise(f.mode) : "paid"}
                    size="sm"
                  />
                ) : (
                  <StatusChip tone="warn" label="requested, not paid" size="sm" />
                )
              }
              actions={
                <Link className="btn btn--sm" to={`/sourcing/funds/${f.id}/edit`}>
                  Edit this fund
                </Link>
              }
            >
              <FieldGrid
                fields={[
                  { label: "Value in local currency", value: formatMoney(fundValueLocal(f)) },
                  {
                    label: "PO number",
                    value: f.purchaseOrderNo,
                    hint: "Issued after the fund is requested, so captured on the Update screen.",
                  },
                  { label: "Required payment date", value: formatDate(f.requiredPaymentDate) },
                  {
                    label: "Actual payment date",
                    value: f.actualPaymentDate ? formatDate(f.actualPaymentDate) : undefined,
                    hint: "Recording it is what gives the fund a rate and a value in USD.",
                  },
                  {
                    label: "Paid against the required date",
                    value:
                      delay === undefined ? undefined : delay === 0 ? (
                        <StatusChip tone="ok" label="on the required date" size="sm" />
                      ) : delay < 0 ? (
                        <StatusChip tone="ok" label={`${Math.abs(delay)} day(s) early`} size="sm" />
                      ) : (
                        <StatusChip tone="warn" label={`${delay} day(s) late`} size="sm" />
                      ),
                    behaviour: "calculated",
                    hint: "Ours, and an observation only — no rule about a late payment is stated anywhere.",
                  },
                  {
                    label: "Exchange rate",
                    value: rate ? (
                      <>
                        {formatNumber(rate.perUsd)}{" "}
                        <span className="xsmall muted">
                          {f.localCurrency}/USD from {formatDate(rate.effectiveFrom)}
                        </span>
                      </>
                    ) : undefined,
                    behaviour: "readonly",
                    hint: "Read from the rate table on the actual payment date, never entered. A dummy table stands in for the API that will supply it.",
                  },
                  {
                    label: "Value in USD",
                    value: usd ? <strong>{formatMoney(usd)}</strong> : undefined,
                    behaviour: "calculated",
                    hint: "Value in local currency ÷ the rate above. The division is the legacy module's own formula.",
                  },
                  { label: "Mode of fund", value: f.mode ? humanise(f.mode) : undefined },
                  { label: "Bank", value: f.mode === "finance" ? f.bankName : undefined },
                  {
                    label: "Barter commodity",
                    value:
                      f.mode === "barter" && f.barterCommodityId
                        ? commodityName(f.barterCommodityId)
                        : undefined,
                  },
                  { label: "Fund document", value: f.documentName },
                  {
                    label: "Shared",
                    value: f.sharedOn ? `${formatDate(f.sharedOn)} by ${f.sharedBy ?? "unknown"}` : undefined,
                    hint: "Save & share marks the record. Recipients are configured in the system later, so nothing was sent.",
                  },
                ]}
              />
              {usd && rate ? (
                <TotalBanner
                  label="Value in USD at the rate on the actual payment date"
                  value={formatMoney(usd)}
                  derivation={`${formatMoney(fundValueLocal(f))} ÷ ${formatNumber(rate.perUsd)} ${f.localCurrency}/USD, the rate in force from ${formatDate(rate.effectiveFrom)}`}
                />
              ) : (
                <TotalBanner
                  label="Value in USD"
                  value="–"
                  derivation="no actual payment date, so no rate applies and no USD value exists — which is not the same as zero"
                />
              )}
              <p className="small muted" style={{ marginTop: "0.5rem" }}>
                <strong>The exchange rate is read, not entered.</strong> The instruction of 27 August 2026
                makes it read-only and derived from the currency exchange on the actual payment date, so the
                fund holds no rate of its own — it reads one. The table behind it here is a{" "}
                <strong>dummy stand-in</strong>: in the real application the rate will come from an API, and
                every screen reads it through one function so that swap is a one-place change.
                {f.financeRatePct !== undefined ? (
                  <>
                    {" "}
                    This fund also carries a legacy <em>Finance Rate</em> of {formatNumber(f.financeRatePct)}%
                    and a tenor of {f.tenorPeriod ?? "none"}. Neither is on either of the two screens the
                    instruction specifies, so neither is captured any more; both are kept on the record so the
                    captured legacy funds still read correctly.
                  </>
                ) : null}
              </p>
              {f.note ? (
                <p className="small" style={{ marginTop: "0.5rem" }}>
                  {f.note}
                </p>
              ) : null}
            </CollapsibleSection>
          );
        })}
      </div>
    </>
  );
}

/* ================================================================== *
 * Tab 6 — agent balances
 * ================================================================== */

interface AgentPositionRow {
  id: string;
  supplierId: string;
  seasonality: string;
  actualAmount: number;
  currency: ReturnType<typeof money>["currency"];
  estimatedAmount: number;
  divergence: number;
  fundedSdg: number;
  drawnSdg: number;
  residualSdg: number;
}

function BalancesTab({
  balances,
  funds,
  receipts,
  agreements,
  movements,
  loading,
}: {
  balances: AgentBalance[];
  funds: Fund[];
  receipts: IntakeReceipt[];
  agreements: PurchaseAgreement[];
  movements: AgentBalanceMovement[];
  loading: boolean;
}) {
  const toast = useToast();
  const [pending, setPending] = useState<{ row: AgentPositionRow; kind: "transfer" | "refund" } | null>(null);
  const [amount, setAmount] = useState("");
  const [toAgent, setToAgent] = useState("");
  const [reference, setReference] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const positions = agentPositions(balances, funds, receipts, agreements);
  const rows: AgentPositionRow[] = positions.map((p) => ({
    id: `${p.supplierId}|${p.seasonality}`,
    supplierId: p.supplierId,
    seasonality: p.seasonality,
    actualAmount: p.actual.amount,
    currency: p.actual.currency,
    estimatedAmount: p.estimated.amount,
    divergence: p.divergence,
    fundedSdg: p.fundedSdg,
    drawnSdg: p.drawnSdg,
    // Funded less drawn. Our figure, shown beside the two stored balances rather than
    // replacing them, because the source states no derivation for either.
    residualSdg: round(p.fundedSdg - p.drawnSdg, 2),
  }));

  function start(row: AgentPositionRow, kind: "transfer" | "refund") {
    setPending({ row, kind });
    setAmount("");
    setToAgent("");
    setReference("");
    setErrors({});
  }

  async function submitMovement() {
    if (!pending) return;
    const next: Record<string, string> = {};
    const value = parseNumber(amount);
    if (value === undefined) next["ab-amount"] = "Enter the amount to move.";
    else if (value <= 0) next["ab-amount"] = "The amount must be greater than zero.";
    if (pending.kind === "transfer" && !toAgent) {
      next["ab-to"] = "Select the agent receiving the balance. A transfer needs a receiving agent.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const res = await api.moveAgentBalance({
      kind: pending.kind,
      supplierId: pending.row.supplierId,
      seasonality: pending.row.seasonality,
      amount: money(value as number, pending.row.currency),
      toSupplierId: pending.kind === "transfer" ? toAgent : undefined,
      reference: reference.trim() || undefined,
    });
    if (!res.ok) {
      setErrors({ "ab-amount": res.reason });
      toast.push("risk", res.reason);
      return;
    }
    toast.push(
      "ok",
      pending.kind === "transfer"
        ? `${formatMoney(res.value.amount)} transferred to ${counterpartyName(toAgent)}.`
        : `${formatMoney(res.value.amount)} refunded against ${counterpartyName(pending.row.supplierId)}.`,
    );
    setPending(null);
  }

  const columns: Column<AgentPositionRow>[] = [
    {
      key: "agent",
      header: "Agent",
      cell: (r) => counterpartyName(r.supplierId),
      sortValue: (r) => counterpartyName(r.supplierId),
    },
    { key: "season", header: "Seasonality", cell: (r) => r.seasonality, sortValue: (r) => r.seasonality },
    {
      key: "actual",
      header: "Actual balance",
      align: "right",
      cell: (r) => formatMoney(money(r.actualAmount, r.currency)),
      sortValue: (r) => r.actualAmount,
    },
    {
      key: "estimated",
      header: "Estimated balance",
      align: "right",
      cell: (r) => formatMoney(money(r.estimatedAmount, r.currency)),
      sortValue: (r) => r.estimatedAmount,
    },
    {
      key: "divergence",
      header: "Divergence",
      align: "right",
      cell: (r) =>
        r.divergence === 0 ? (
          <StatusChip
            tone="info"
            label="equal in the source, with no derivation stated"
            size="sm"
            title="Actual Balance equals Estimated Balance on every captured legacy row, so the data demonstrates no difference between them."
          />
        ) : (
          <strong>{formatMoney(money(r.divergence, r.currency))}</strong>
        ),
      sortValue: (r) => r.divergence,
    },
    {
      key: "funded",
      header: "Funded this season (SDG)",
      align: "right",
      cell: (r) => formatMoney(money(r.fundedSdg, "SDG")),
      sortValue: (r) => r.fundedSdg,
    },
    {
      key: "drawn",
      header: "Drawn against confirmed receipts (SDG)",
      align: "right",
      cell: (r) => formatMoney(money(r.drawnSdg, "SDG")),
      sortValue: (r) => r.drawnSdg,
    },
    {
      key: "residual",
      header: "Residual (SDG)",
      align: "right",
      cell: (r) => <strong>{formatMoney(money(r.residualSdg, "SDG"))}</strong>,
      sortValue: (r) => r.residualSdg,
    },
    {
      key: "actions",
      header: "Settlement",
      cell: (r) => (
        <span className="row">
          <button type="button" className="btn btn--sm" onClick={() => start(r, "transfer")}>
            Transfer balance
          </button>
          <button type="button" className="btn btn--sm" onClick={() => start(r, "refund")}>
            Refund
          </button>
        </span>
      ),
    },
  ];

  const agentOptions = balances
    .map((b) => ({ value: b.supplierId, label: counterpartyName(b.supplierId) }))
    .filter((o, i, all) => all.findIndex((x) => x.value === o.value) === i);

  return (
    <>
      <Banner tone="warn" title="Neither balance has a stated derivation, and none has been invented">
        The source states no derivation, source or refresh mechanism for either <em>Actual Balance</em> or{" "}
        <em>Estimated Balance</em>, does not explain how the two are meant to differ, and shows them identical
        on every captured row — so nothing here recomputes them. It also states no sign convention, so whether
        a positive balance is owed <em>by</em> the agent or <em>to</em> the agent is unknown and not asserted;
        and no uniqueness rule on agent-and-season, so nothing prevents duplicate rows. What is added beside
        the two stored figures is the funding and the drawdown either balance would have to reconcile against
        — funds paid to that agent for that season, and the confirmed purchase value drawn against their
        agreements — so the screen can show that the stored balances are unrelated to any other figure in the
        system today. No currency is declared anywhere on the legacy grid; the magnitudes are SDG-scale by
        comparison with the Funds page, and that inference is labelled, not hidden.
      </Banner>

      <DataTable
        caption="Agent balances"
        rows={rows}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by agent or season…"
        searchValue={(r) => `${counterpartyName(r.supplierId)} ${r.seasonality}`}
        savedViews={[
          { key: "all", label: "All balances" },
          {
            key: "diverging",
            label: "Actual and estimated differ",
            description:
              "No captured legacy row is in this state — the two figures are identical on both live records.",
            predicate: (r) => r.divergence !== 0,
          },
        ]}
        emptyTitle="No agent balance held"
      />

      <CollapsibleSection
        title={`Movement history — ${movements.length} record(s)`}
        indicator={
          <StatusChip
            tone={movements.length > 0 ? "ok" : "idle"}
            label={movements.length > 0 ? "recorded" : "none"}
            size="sm"
          />
        }
      >
        <Banner tone="info" title="Both of these were unbuilt dialogs">
          <em>Transfer Balance</em> and <em>Refund</em> are row actions in the legacy grid. Each opens a modal
          containing one line of placeholder prose describing the form that was meant to go there — "Here you
          can add Transfer balance to another agent form" and "Here you can add refund form" — and no input,
          select or textarea of any kind. Both modals have a Submit button with no form to post, so the source
          concludes that agent balances "can only be viewed, not acted on". Both are real operations here,
          with the amount, the receiving agent and a reference captured, and with the refusals the service
          layer applies stated on failure. Everything the source leaves unspecified about them — whether a
          transfer crosses seasons, whether it writes one record or two, which balance figure a refund
          decrements, the direction of a refund — is left unspecified here too: the movement is recorded
          against the actual balance and nothing more is claimed.
        </Banner>
        {movements.length === 0 ? (
          <EmptyState title="No movement recorded" glyph="○" />
        ) : (
          <div className="dtable__scroll">
            <table className="dtable__table">
              <caption className="sr-only">Agent balance movements</caption>
              <thead>
                <tr>
                  <th scope="col">Kind</th>
                  <th scope="col">Agent</th>
                  <th scope="col">Season</th>
                  <th scope="col" className="text-right">
                    Amount
                  </th>
                  <th scope="col">Receiving agent</th>
                  <th scope="col">Moved on</th>
                  <th scope="col">Reference</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <StatusChip tone={toneFor(m.kind)} label={humanise(m.kind)} size="sm" />
                    </td>
                    <td>{counterpartyName(m.supplierId)}</td>
                    <td>{m.seasonality}</td>
                    <td className="text-right">{formatMoney(m.amount)}</td>
                    <td>
                      {m.toSupplierId ? counterpartyName(m.toSupplierId) : <span className="muted">–</span>}
                    </td>
                    <td>{formatDate(m.movedOn)}</td>
                    <td className="mono small">{m.reference ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      <Dialog
        open={pending !== null}
        title={
          pending
            ? `${pending.kind === "transfer" ? "Transfer balance" : "Refund"} — ${counterpartyName(pending.row.supplierId)}, ${pending.row.seasonality}`
            : "Move agent balance"
        }
        onClose={() => setPending(null)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary" onClick={() => void submitMovement()}>
              {pending?.kind === "transfer" ? "Transfer" : "Record refund"}
            </button>
          </>
        }
      >
        {pending ? (
          <>
            <ErrorSummary
              title="The movement could not be recorded"
              errors={Object.entries(errors).map(([field, message]) => ({ field, message }))}
            />
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Available on the actual balance",
                  value: formatMoney(money(pending.row.actualAmount, pending.row.currency)),
                  behaviour: "inherited",
                },
              ]}
            />
            <div className="fields">
              <FormRow
                label={`Amount (${pending.row.currency})`}
                htmlFor="ab-amount"
                required
                error={errors["ab-amount"]}
                hint="The move is refused above the actual balance. The source states no such cap; this one is ours and is stated on refusal."
              >
                <TextInput
                  id="ab-amount"
                  value={amount}
                  onChange={setAmount}
                  required
                  error={errors["ab-amount"]}
                  inputMode="decimal"
                />
              </FormRow>
              {pending.kind === "transfer" ? (
                <FormRow
                  label="Receiving agent"
                  htmlFor="ab-to"
                  required
                  error={errors["ab-to"]}
                  hint="A transfer needs a receiving agent with a balance in the same season. A refund does not."
                >
                  <SelectInput
                    id="ab-to"
                    value={toAgent}
                    onChange={setToAgent}
                    required
                    error={errors["ab-to"]}
                    placeholder="Select the receiving agent…"
                    options={agentOptions.filter((o) => o.value !== pending.row.supplierId)}
                  />
                </FormRow>
              ) : null}
              <FormRow
                label="Reference"
                htmlFor="ab-ref"
                hint="The legacy entity holds no reference, date, note or audit field at all — five fields in total."
              >
                <TextInput id="ab-ref" value={reference} onChange={setReference} />
              </FormRow>
            </div>
            <RequiredLegend />
          </>
        ) : null}
      </Dialog>
    </>
  );
}

/* ================================================================== *
 * Purchase agreement detail — /sourcing/agreements/:id
 * The MMP "Receipts Details" view, with the numbers it lacks.
 * ================================================================== */

export function PurchaseAgreementDetail() {
  const { id = "" } = useParams();
  const agreement = useAsync(() => api.getPurchaseAgreement(id), [id]);
  const agreements = useAsync(() => api.listPurchaseAgreements());
  const plans = useAsync(() => api.listReceivingLocationPlans());
  const receipts = useAsync(() => api.listIntakeReceipts());

  if (agreement.error) {
    return (
      <div className="page">
        <ErrorState detail={agreement.error} onRetry={agreement.reload} />
      </div>
    );
  }
  if (agreement.loading) {
    return (
      <div className="page">
        <div className="card card__body muted">Loading…</div>
      </div>
    );
  }
  const a = agreement.data;
  if (!a) {
    return (
      <div className="page">
        <EmptyState
          title="Purchase agreement not found"
          action={
            <Link className="btn btn--primary" to="/sourcing">
              Back to sourcing intake
            </Link>
          }
        />
      </div>
    );
  }

  const myPlans = (plans.data ?? []).filter((p) => p.purchaseAgreementId === a.id);
  const myReceipts = (receipts.data ?? []).filter((r) => r.purchaseAgreementId === a.id);
  const facilityReceipts = myReceipts.filter((r) => r.kind === "facility");
  const warehouseReceipts = myReceipts.filter((r) => r.kind === "warehouse");
  const bal = allocationBalance(a, myPlans);
  const received = receivedAgainstAgreement(a.id, receipts.data ?? [], agreements.data ?? [a]);
  /* Delivery Updates — the fourth information card, added 3 September 2026. */
  const delivery = deliveryUpdates(a, receipts.data ?? []);
  const inspections = qualityInspectionSummary(a.qualityInspections);

  const receiptRowsTable = (rows: IntakeReceipt[], withPricing: boolean) => (
    <div className="dtable__scroll">
      <table className="dtable__table">
        <caption className="sr-only">Receipts against this agreement</caption>
        <thead>
          <tr>
            <th scope="col">Reference</th>
            <th scope="col">Location</th>
            <th scope="col">Receipt date</th>
            <th scope="col">Plate</th>
            <th scope="col" className="text-right">
              Total bags
            </th>
            <th scope="col" className="text-right">
              Gross with dirt
            </th>
            {withPricing ? (
              <>
                <th scope="col" className="text-right">
                  Net weight
                </th>
                <th scope="col">Receipt status</th>
                <th scope="col">Pricing</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const w = receiptWeights(r, a);
            return (
              <tr key={r.id}>
                <td>
                  <Link className="mono" to={`/sourcing/receipts/${r.id}`}>
                    {r.referenceNo}
                  </Link>
                </td>
                <td>{r.location}</td>
                <td>{formatDate(r.receiptDate)}</td>
                <td className="mono small">{r.plateNo ?? "–"}</td>
                <td className="text-right">{formatNumber(totalBags(r.bags))}</td>
                <td className="text-right">
                  {isZeroQuantity(r) ? (
                    <StatusChip tone="risk" label="saved with no quantities" size="sm" />
                  ) : (
                    formatMt(r.grossWeightWithDirtMt)
                  )}
                </td>
                {withPricing ? (
                  <>
                    <td className="text-right">
                      {w.netMt === undefined ? <span className="muted">–</span> : formatMt(w.netMt)}
                    </td>
                    <td>{receiptStatusChip(r)}</td>
                    <td>
                      {r.pricing ? (
                        <span className="small muted">priced {formatDate(r.pricing.pricedOn)}</span>
                      ) : (
                        <Link className="btn btn--sm" to={`/sourcing/receipts/${r.id}`}>
                          Price this receipt
                        </Link>
                      )}
                    </td>
                  </>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <PageHeader
        moduleLabel="Sourcing intake"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Sourcing intake", to: "/sourcing" },
          { label: a.paRef },
        ]}
        title={a.paRef}
        statusChip={<StatusChip tone={toneFor(a.flowStatus)} label={humanise(a.flowStatus)} />}
        meta={
          <>
            {commodityName(a.commodityId)} · {counterpartyName(a.supplierId)} · {a.seasonality} ·{" "}
            {a.purchaseOrderNo ? `purchase order ${a.purchaseOrderNo}` : "no purchase order issued yet"} ·{" "}
            {formatMt(a.totalQuantityMt)} agreed
          </>
        }
        recordKey={a.paRef}
        recordDate={
          a.updatedOn
            ? `changed ${formatDate(a.updatedOn)} by ${a.updatedBy ?? "unknown"}`
            : formatDate(a.agreementDate)
        }
        actions={
          <ActionBar
            primary={[
              { label: "Edit this agreement", to: `/sourcing/agreements/${a.id}/edit`, tone: "primary" },
            ]}
          />
        }
      />

      <div className="page">
        <Banner tone="info" title="This is the legacy Receipts Details view, done properly">
          The legacy screen carries a summary block and three grids — receiving locations, material receipts
          and warehouse receipts — and not one number derived from them: no allocation total, no
          received-versus-contracted comparison, no outstanding balance, no grid footer totals on any of its
          four views. The three cards below are those missing figures. The label drift the source records is
          fixed rather than reproduced: <em>PA Document</em> on the add form became <em>Purchase Document</em>{" "}
          on the detail view, the third tab reads <em>Warhouse Receipts</em>, and the summary label reads{" "}
          <em>Pruchaser</em>. The field name behind the agreed quantity is <code>TotalPurhcasedQuantity</code>
          .
        </Banner>

        <div className="grid-4">
          <SummaryCard title="Agreement">
            <FieldGrid
              columns={1}
              fields={[
                { label: "Seasonality", value: a.seasonality, behaviour: "required" },
                {
                  label: "Agreement type",
                  value: <StatusChip tone={toneFor(a.agreementType)} label={humanise(a.agreementType)} size="sm" />,
                  hint: "Fixed or Collection, Fixed by default and changed by Procurement on the Edit screen — the instruction of 3 September 2026. The instruction names the field and states no effect, so nothing downstream is gated on it.",
                },
                {
                  label: "Quality inspections",
                  value:
                    inspections.count > 0
                      ? `${formatNumber(inspections.count)} recorded${inspections.pending > 0 ? `, ${inspections.pending} not yet tested` : ""}`
                      : undefined,
                  hint: "Entered on the Edit screen by the trader or the Quality team, several per agreement. No result gates anything here, because nothing states that it should.",
                },
                {
                  label: "Seasonal purchase plan",
                  value: a.seasonalPlanId ? (
                    <Link className="mono" to={`/sourcing/plans/${a.seasonalPlanId}`}>
                      {a.seasonalPlanId}
                    </Link>
                  ) : undefined,
                  hint: "The Add screen offers active plans, and the commodity is chosen from the ones that plan carries. Five captured agreements have none.",
                },
                { label: "Commodity", value: commodityName(a.commodityId), behaviour: "required" },
                {
                  label: "PO number",
                  value: a.purchaseOrderNo,
                  hint: "Issued after the agreement is struck, so captured on the Update screen rather than the Add screen.",
                },
                {
                  label: "Per-bag tare",
                  value: a.bagWeightApplicable ? (
                    <StatusChip tone="ok" label="applies" size="sm" />
                  ) : (
                    <StatusChip tone="idle" label="not applicable" size="sm" />
                  ),
                  hint: a.bagWeightApplicable
                    ? "Is Applicable is set, so the three weights are held and every receipt derives its tare from them."
                    : "Is Applicable is unset, so no weight is held and receipts carry a packaging tare of zero by statement — not by accident, which is what MMP could not distinguish.",
                },
                {
                  label: "Shared",
                  value: a.sharedOn ? `${formatDate(a.sharedOn)} by ${a.sharedBy ?? "unknown"}` : undefined,
                  hint: "Save & share marks the record. Recipients are configured in the system later, so nothing was sent.",
                },
                {
                  label: "Supplier",
                  value: counterpartyName(a.supplierId),
                  behaviour: "required",
                  hint: "The legacy picker concatenates name, address and phone into one option string.",
                },
                {
                  label: "Purchaser",
                  value: a.purchaser,
                  behaviour: "required",
                  hint: "Shown as a username in the legacy grid and a display name here — one name is used on every screen.",
                },
                { label: "Agreement date", value: formatDate(a.agreementDate), behaviour: "required" },
                { label: "Recorded on", value: formatDate(a.createdOn), behaviour: "readonly" },
                { label: "Created by", value: a.createdBy, behaviour: "readonly" },
                {
                  label: "Per-bag tare, big pack",
                  value: `${formatNumber(a.bpBagWeightLb)} lb`,
                  hint: "Carried onto every receipt booked against this agreement.",
                },
                { label: "Per-bag tare, small pack", value: `${formatNumber(a.spBagWeightLb)} lb` },
                { label: "Per-bag tare, jute", value: `${formatNumber(a.juteBagWeightLb)} lb` },
                {
                  label: "Additional expenses",
                  value: a.additionalExpenses ? formatMoney(a.additionalExpenses) : undefined,
                  hint: "Marked required on the legacy detail view with no input on the add form, so the source cannot say how it is ever populated.",
                },
              ]}
            />
          </SummaryCard>

          {/* `Allocation` was the label until 3 September 2026, when the instruction
              replaced it with `Receiving Plan`. The figures behind it are unchanged —
              what the card shows is the receiving-location plan against the agreed
              quantity, which is what the new label says and the old one did not. */}
          <SummaryCard title="Receiving Plan" tone={bal.overAllocated ? "risk" : "accent"}>
            <QuantityDonut
              fraction={bal.fraction}
              valueLabel={formatMt(bal.allocatedMt)}
              ofLabel={formatMt(bal.agreedMt)}
              caption="of the agreed quantity allocated to facilities"
              tone={bal.overAllocated ? "warn" : bal.fraction >= 1 ? "ok" : "accent"}
            />
            <FieldGrid
              columns={1}
              fields={[
                { label: "Agreed quantity", value: formatMt(bal.agreedMt) },
                { label: "Allocated", value: formatMt(bal.allocatedMt), behaviour: "calculated" },
                {
                  label: "Remaining",
                  value: <strong>{formatMt(bal.remainingMt)}</strong>,
                  behaviour: "calculated",
                },
                {
                  label: "Plan rows with no quantity",
                  value: formatNumber(bal.rowsWithNoQuantity),
                  hint: "Required on the legacy add form and blank in the captured data.",
                },
              ]}
            />
            {bal.overAllocated ? (
              <Banner tone="risk" title="Allocated over the agreed quantity">
                Plan lines total {formatMt(bal.allocatedMt)} against {formatMt(bal.agreedMt)} agreed — over by{" "}
                {formatMt(Math.abs(bal.remainingMt))}. The legacy module shows no total and applies no check,
                so this state was unobservable.
              </Banner>
            ) : null}
          </SummaryCard>

          <SummaryCard title="Intake">
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Confirmed",
                  value: <strong>{formatMt(received.confirmedMt)}</strong>,
                  behaviour: "calculated",
                  hint: "The only tonnage that reaches the weekly production plan (v2.0 §6.6 input 4, register C-24).",
                },
                {
                  label: "Awaiting review",
                  value: formatMt(received.awaitingReviewMt),
                  behaviour: "calculated",
                },
                {
                  label: "Receipts not yet priced",
                  value: formatNumber(received.unpricedCount),
                  hint: "No net weight and no value until the separate Sourcing pricing step runs.",
                },
                { label: "Facility receipts", value: formatNumber(facilityReceipts.length) },
                { label: "Warehouse receipts", value: formatNumber(warehouseReceipts.length) },
              ]}
            />
          </SummaryCard>

          {/* Delivery Updates — added by the instruction of 3 September 2026, which names
              its three figures: the total of the Facility Material Receipt, the total of
              the Warehouse Material Receipt, and what remains to be delivered. */}
          <SummaryCard
            title="Delivery Updates"
            tone={delivery.overDelivered ? "risk" : "accent"}
            footer={
              <span className="small muted">
                Totalled on <strong>gross weight with dirt</strong>, the one quantity every receipt
                carries — a net-weight total would read as though nothing had arrived at a warehouse,
                because a warehouse receipt can never be priced.
              </span>
            }
          >
            <QuantityDonut
              fraction={delivery.fraction}
              valueLabel={formatMt(delivery.deliveredMt)}
              ofLabel={formatMt(delivery.agreedMt)}
              caption="of the agreed quantity delivered"
              tone={delivery.overDelivered ? "warn" : delivery.fraction >= 1 ? "ok" : "accent"}
            />
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Facility Material Receipts",
                  value: `${formatMt(delivery.facilityReceiptMt)} · ${formatNumber(delivery.facilityReceiptCount)} receipt(s)`,
                  behaviour: "calculated",
                },
                {
                  label: "Warehouse Material Receipts",
                  value: `${formatMt(delivery.warehouseReceiptMt)} · ${formatNumber(delivery.warehouseReceiptCount)} receipt(s)`,
                  behaviour: "calculated",
                },
                {
                  label: "Delivered in total",
                  value: formatMt(delivery.deliveredMt),
                  behaviour: "calculated",
                },
                {
                  label: "Remaining to be delivered",
                  value: <strong>{formatMt(delivery.remainingMt)}</strong>,
                  behaviour: "calculated",
                  hint: "Agreed quantity less both totals. Floored at zero — an over-delivery is reported as one rather than shown as a negative remainder.",
                },
              ]}
            />
            {delivery.overDelivered ? (
              <Banner tone="risk" title="Delivered over the agreed quantity">
                Receipts total {formatMt(delivery.deliveredMt)} against {formatMt(delivery.agreedMt)}{" "}
                agreed — over by {formatMt(delivery.overDeliveredMt)}. Nothing refuses this: no source
                states that receipt is capped at the agreed quantity, and the captured data shows it is
                not.
              </Banner>
            ) : null}
          </SummaryCard>
        </div>

        <TotalBanner
          label={bal.overAllocated ? "Allocated over the agreed quantity" : "Remaining agreed quantity"}
          value={formatMt(Math.abs(bal.remainingMt))}
          derivation={`agreed ${formatMt(bal.agreedMt)} − allocated ${formatMt(bal.allocatedMt)} across ${myPlans.length} receiving-location plan line(s); ${bal.rowsWithNoQuantity} row(s) carry no quantity`}
        />

        <CollapsibleSection
          title={`Receiving Plan — ${myPlans.length} plan line(s)`}
          indicator={
            <StatusChip
              tone={bal.overAllocated ? "risk" : "ok"}
              label={`${formatMt(bal.allocatedMt)} of ${formatMt(bal.agreedMt)}`}
              size="sm"
            />
          }
        >
          {myPlans.length === 0 ? (
            <EmptyState title="No receiving location allocated" glyph="○">
              Allocation is a precondition of physical receipt — a receipt is booked against a facility that
              has been allocated here.
            </EmptyState>
          ) : (
            <>
              <div className="dtable__scroll">
                <table className="dtable__table">
                  <caption className="sr-only">Receiving location plan lines</caption>
                  <thead>
                    <tr>
                      <th scope="col">Plan</th>
                      <th scope="col">Location type</th>
                      <th scope="col">Location</th>
                      <th scope="col" className="text-right">
                        Quantity
                      </th>
                      <th scope="col">Assigned to</th>
                      <th scope="col">Created on</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myPlans.map((p) => (
                      <tr key={p.id}>
                        <td className="mono small">{p.planId}</td>
                        <td>
                          <StatusChip
                            tone="info"
                            label={humanise(p.locationKind ?? receivingLocationKindOf(p.facility))}
                            size="sm"
                          />
                          {p.country ? <span className="xsmall muted"> {p.country}</span> : null}
                        </td>
                        <td>{p.facility}</td>
                        <td className="text-right">
                          {p.quantityMt ? (
                            formatMt(p.quantityMt)
                          ) : (
                            <StatusChip tone="risk" label="blank in the source" size="sm" />
                          )}
                        </td>
                        <td>{p.assignedTo}</td>
                        <td>{formatDate(p.createdOn)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={3}>
                        <strong>Total allocated</strong>
                      </td>
                      <td className="text-right">
                        <strong>{formatMt(bal.allocatedMt)}</strong>
                      </td>
                      <td colSpan={2} className="small muted">
                        against {formatMt(bal.agreedMt)} agreed
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="small muted" style={{ marginTop: "0.5rem" }}>
                The legacy grid for this tab has no control column at all — no add, edit or delete row — so
                allocations must be created on another screen, and the source does not say which one or how a
                facility comes to be allocated to an agreement. They are created and corrected on{" "}
                <Link to="/sourcing/locations">receiving locations</Link> here.
              </p>
            </>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title={`Facility Material Receipts — ${facilityReceipts.length} record(s)`}
          indicator={
            <StatusChip
              tone={received.unpricedCount > 0 ? "warn" : "ok"}
              label={received.unpricedCount > 0 ? `${received.unpricedCount} unpriced` : "all priced"}
              size="sm"
            />
          }
        >
          {facilityReceipts.length === 0 ? (
            <EmptyState title="No facility receipt booked" glyph="○" />
          ) : (
            <>
              {receiptRowsTable(facilityReceipts, true)}
              <p className="small muted" style={{ marginTop: "0.5rem" }}>
                The legacy grid carries <em>Gross Weight with Dirt</em> and no net weight, tare or
                dirt-percentage column, and the pricing screen it links to is reachable from nowhere else in
                the system. Pricing is still a distinct step here — price is not captured at receipt time —
                but the receipt itself now carries the derived net weight and the status.
              </p>
            </>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title={`Warehouse Material Receipts — ${warehouseReceipts.length} record(s)`}
          defaultOpen={warehouseReceipts.length > 0}
        >
          {warehouseReceipts.length === 0 ? (
            <EmptyState title="No warehouse receipt booked" glyph="–">
              On the captured legacy record this grid read "No data available in table", so its control column
              was empty and the actions available on it are unknown.
            </EmptyState>
          ) : (
            <>
              {receiptRowsTable(
                warehouseReceipts,
                warehouseReceipts.some((r) => r.pricing),
              )}
              <p className="small muted" style={{ marginTop: "0.5rem" }}>
                The legacy tab label is misspelt <em>Warhouse Receipts</em>, and its gross-weight column
                header omits "with Dirt" although the field behind it is the same one. A warehouse receipt
                could never be priced or confirmed in the legacy system at all.
              </p>
            </>
          )}
        </CollapsibleSection>

        <CollapsibleSection title={`Attachments — ${a.attachments.length} document(s)`} defaultOpen={false}>
          {a.attachments.length === 0 ? (
            <EmptyState title="No document attached" glyph="○">
              The legacy form supports four uploads, each capped at 5 MB, and the captured record has none —
              so the attached state, the link text, whether a document opens inline or downloads, and whether
              a replace or delete control appears are all unevidenced in the source.
            </EmptyState>
          ) : (
            <ul className="doclist">
              {a.attachments.map((d) => (
                <li key={d.slot}>
                  <span className="doclist__name">
                    {humanise(d.slot === "pa_document" ? "purchase_document" : d.slot)}
                    <span className="doclist__sub">{d.fileName}</span>
                  </span>
                  <StatusChip tone="ok" label="attached" size="sm" />
                </li>
              ))}
            </ul>
          )}
          <p className="xsmall muted" style={{ marginTop: "0.5rem" }}>
            Four upload slots, as in the source: purchase agreement, contract, delivery note and other. The
            legacy label drift — <em>PA Document</em> on the add form, <em>Purchase Document</em> on the
            detail view — is resolved to one name.
          </p>
        </CollapsibleSection>

        {a.note ? (
          <div className="card card__body">
            <h3 className="card__title">Notes</h3>
            <p className="small" style={{ marginTop: "0.5rem" }}>
              {a.note}
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}

/* ================================================================== *
 * Intake receipt detail — /sourcing/receipts/:id
 * ================================================================== */

export function IntakeReceiptDetail() {
  const { id = "" } = useParams();
  const toast = useToast();
  const receipt = useAsync(() => api.getIntakeReceipt(id), [id]);
  const agreements = useAsync(() => api.listPurchaseAgreements());

  const [pricePerLb, setPricePerLb] = useState("");
  const [dirtPerTon, setDirtPerTon] = useState("");
  const [agentNet, setAgentNet] = useState("");
  const [commission, setCommission] = useState("");
  const [status, setStatus] = useState<IntakeReceiptStatus | "">("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const r = receipt.data;
  if (r && !hydrated) {
    setPricePerLb(r.pricing ? String(r.pricing.pricePerLb.amount) : "");
    setDirtPerTon(r.pricing ? String(r.pricing.dirtPerTon) : "");
    setAgentNet(r.pricing ? String(r.pricing.agentNetWeightMt) : "");
    setCommission(r.pricing?.agentCommissionPerMt ? String(r.pricing.agentCommissionPerMt.amount) : "");
    setStatus(r.pricing?.status ?? "");
    setHydrated(true);
  }

  if (receipt.error) {
    return (
      <div className="page">
        <ErrorState detail={receipt.error} onRetry={receipt.reload} />
      </div>
    );
  }
  if (receipt.loading) {
    return (
      <div className="page">
        <div className="card card__body muted">Loading…</div>
      </div>
    );
  }
  if (!r) {
    return (
      <div className="page">
        <EmptyState
          title="Receipt not found"
          action={
            <Link className="btn btn--primary" to="/sourcing/intake">
              Back to sourcing intake
            </Link>
          }
        />
      </div>
    );
  }

  // Bound after the guard above so the handlers below, which are hoisted function
  // declarations, still see a defined receipt.
  const rec: IntakeReceipt = r;

  const agreement = (agreements.data ?? []).find((x) => x.id === r.purchaseAgreementId);
  if (!agreement) {
    return (
      <div className="page">
        <EmptyState title="The parent purchase agreement could not be loaded">
          A receipt cannot exist without one — the agreement supplies the supplier, commodity, seasonality and
          the per-bag tare weights every weight on this page is derived from.
        </EmptyState>
      </div>
    );
  }

  const bags = totalBags(r.bags);
  const packaging = packagingWeight(r.bags, agreement);
  const weights = receiptWeights(r, agreement);
  const value = receiptValue(r, agreement);
  const currency = r.pricing?.pricePerLb.currency ?? "SDG";

  async function submitPricing() {
    setRefusal(null);
    const next: Record<string, string> = {};
    const price = parseNumber(pricePerLb);
    const dirt = parseNumber(dirtPerTon);
    const net = parseNumber(agentNet);
    const comm = parseNumber(commission);
    if (price === undefined) next["px-price"] = "Enter the agreed price per pound.";
    else if (price <= 0) next["px-price"] = "The price per pound must be greater than zero.";
    if (dirt === undefined) next["px-dirt"] = "Enter the dirt deduction per tonne.";
    else if (dirt < 0) next["px-dirt"] = "The dirt deduction cannot be negative.";
    if (net === undefined) next["px-agentnet"] = "Enter the agent's declared net weight, in MT.";
    else if (net < 0) next["px-agentnet"] = "The agent's net weight cannot be negative.";
    if (commission.trim() && comm === undefined) {
      next["px-commission"] = "Enter the agent commission per MT as a number, or leave it empty.";
    }
    if (!status) next["px-status"] = "Select the receipt status. It is required on the legacy pricing form.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const res = await api.priceIntakeReceipt(rec.id, {
      pricePerLb: money(price as number, currency),
      dirtPerTon: dirt as number,
      agentNetWeightMt: net as number,
      agentCommissionPerMt: comm !== undefined ? money(comm, currency) : undefined,
      status: status as IntakeReceiptStatus,
    });
    if (!res.ok) {
      setRefusal(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `Receipt ${rec.referenceNo} priced.`);
  }

  async function moveStatus(to: IntakeReceiptStatus) {
    setRefusal(null);
    const res = await api.setIntakeReceiptStatus(rec.id, to);
    if (!res.ok) {
      setRefusal(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `Receipt ${rec.referenceNo} moved to “${humanise(to)}”.`);
  }

  return (
    <>
      <PageHeader
        moduleLabel="Sourcing intake"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Sourcing intake", to: "/sourcing" },
          {
            label: r.kind === "facility" ? "Facility receipts" : "Warehouse receipts",
            to: r.kind === "facility" ? "/sourcing/intake" : "/sourcing/warehouse",
          },
          { label: r.referenceNo },
        ]}
        title={r.referenceNo}
        statusChip={receiptStatusChip(r)}
        meta={
          <>
            {r.kind === "facility" ? "Facility receipt" : "Warehouse receipt"} · {r.location} ·{" "}
            {formatDate(r.receiptDate)} · {agreement.paRef} · {commodityName(agreement.commodityId)}
          </>
        }
        recordKey={r.referenceNo}
        recordDate={formatDate(r.receiptDate)}
      />

      <div className="page">
        {isZeroQuantity(r) ? (
          <Banner tone="risk" title="This receipt was saved with no quantities at all">
            Every bag count is zero and the weighbridge gross weight is zero. The legacy form requires only
            the location and the receipt date — bag counts and gross weight are not required on either the
            material-receipt or the warehouse-receipt form — so a record like this one is valid there and
            carries no information. The create path in this mock-up refuses a receipt with no weighbridge
            figure.
          </Banner>
        ) : null}
        {refusal ? (
          <Banner tone="risk" title="The change was refused">
            {refusal}
          </Banner>
        ) : null}

        <div className="grid-3">
          <SummaryCard title="Receipt">
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Purchase agreement",
                  value: <Link to={`/sourcing/agreements/${agreement.id}`}>{agreement.paRef}</Link>,
                  behaviour: "inherited",
                },
                {
                  label: r.kind === "facility" ? "Facility" : "Warehouse",
                  value: r.location,
                  behaviour: "required",
                  hint:
                    r.kind === "warehouse"
                      ? "Labelled Facility on the legacy warehouse detail view — wording carried over from Material Receipts."
                      : undefined,
                },
                { label: "Receipt date", value: formatDate(r.receiptDate), behaviour: "required" },
                {
                  label: "Receipt from",
                  value: humanise(r.receiptFrom),
                  behaviour: "required",
                  hint: "Every captured legacy row reads Supplier; what the Warehouse option changes is not stated.",
                },
                { label: "Plate number", value: r.plateNo },
                {
                  label: "Driver name",
                  value: r.driverName,
                  hint: "Captured as Driver Name and displayed as Contact Person in the legacy system — same data, two labels.",
                },
                { label: "Driver phone", value: r.driverPhone },
                { label: "Weighbridge", value: r.weighBridge },
                { label: "Supplier", value: counterpartyName(agreement.supplierId), behaviour: "inherited" },
                { label: "Seasonality", value: agreement.seasonality, behaviour: "inherited" },
                { label: "Notes", value: r.note },
              ]}
            />
          </SummaryCard>

          <SummaryCard title="Weights">
            <FieldGrid
              columns={1}
              fields={[
                { label: "Big-pack bags", value: formatNumber(r.bags.bpBags) },
                { label: "Small-pack bags", value: formatNumber(r.bags.spBags) },
                { label: "Jute bags", value: formatNumber(r.bags.juteBags) },
                {
                  label: "Total bags",
                  value: <strong>{formatNumber(bags)}</strong>,
                  behaviour: "calculated",
                  hint: `Added. The legacy detail view joins the three counts as text — 13, 123 and 123 print as 13123123 instead of 259.`,
                },
                {
                  label: "Packaging weight",
                  value: `${formatNumber(packaging.totalLb)} lb`,
                  behaviour: "calculated",
                  hint: `big pack ${formatNumber(packaging.bpLb)} lb + small pack ${formatNumber(packaging.spLb)} lb + jute ${formatNumber(packaging.juteLb)} lb, at the per-bag tare on the agreement`,
                },
                {
                  label: "Packaging weight in MT",
                  value: <strong>{formatMt(packaging.totalMt)}</strong>,
                  behaviour: "calculated",
                  hint: `${formatNumber(packaging.totalLb)} lb ÷ ${formatNumber(LB_PER_MT)} lb per MT`,
                },
                {
                  label: "The legacy figure for the same field",
                  value: (
                    <StatusChip
                      tone="risk"
                      label={`${formatNumber(packaging.legacyMt)} "MT"`}
                      size="sm"
                      title="Stored in a field named NetWeight, holding a packaging weight, produced by dividing pounds by 22.25."
                    />
                  ),
                  hint: `The legacy system divides the pound figure by ${formatNumber(LEGACY_LB_PER_MT_DIVISOR)} and stores the result in a field named NetWeight, under a label reading Packaging Weight (MT). Label, field name and arithmetic all disagree, and one tonne is ${formatNumber(LB_PER_MT)} lb, not ${formatNumber(LEGACY_LB_PER_MT_DIVISOR)}.`,
                },
                {
                  label: "Gross weight with dirt",
                  value: formatMt(weights.grossWithDirtMt),
                  behaviour: "required",
                },
                {
                  label: "Dirt deduction",
                  value:
                    weights.dirtDeductionMt === undefined ? (
                      <StatusChip tone="warn" label="not priced" size="sm" />
                    ) : (
                      formatMt(weights.dirtDeductionMt)
                    ),
                  behaviour: "calculated",
                  hint: weights.dirtUnitUnconfirmed
                    ? "The dirt rate is entered on the pricing step, so there is no deduction until a receipt is priced. The unit of the legacy Dirt/Ton field is not established by the source and is read here as kilograms per tonne of gross weight — marked unconfirmed, not resolved."
                    : "The dirt rate is entered on the pricing step, so there is no deduction until a receipt is priced.",
                },
                {
                  label: "Unit of the dirt rate",
                  value: weights.dirtUnitUnconfirmed ? (
                    <StatusChip tone="warn" label="unit not established by the source" size="sm" />
                  ) : undefined,
                },
                {
                  label: "Net weight",
                  value:
                    weights.netMt === undefined ? (
                      <StatusChip tone="warn" label="not priced" size="sm" />
                    ) : (
                      <strong>{formatMt(weights.netMt)}</strong>
                    ),
                  behaviour: "calculated",
                },
                {
                  label: "Variance against the agent's declared net",
                  value:
                    weights.varianceMt === undefined ? (
                      <span className="muted">–</span>
                    ) : weights.varianceMt === 0 ? (
                      formatMt(0)
                    ) : (
                      <StatusChip tone="warn" label={formatMt(weights.varianceMt)} size="sm" />
                    ),
                  behaviour: "calculated",
                  hint: "Signed, so the direction of the discrepancy is visible. The legacy figure is an absolute difference and never shows which way it runs.",
                },
              ]}
            />
          </SummaryCard>

          <SummaryCard title="Value">
            {value.purchaseAmount === undefined ? (
              <EmptyState title="Not priced" glyph="○">
                No price per pound, no net weight and therefore no value. Pricing is a separate Sourcing step,
                below.
              </EmptyState>
            ) : (
              <FieldGrid
                columns={1}
                fields={[
                  {
                    label: "Net weight in pounds",
                    value: value.netLb !== undefined ? `${formatNumber(value.netLb)} lb` : undefined,
                    behaviour: "calculated",
                    hint: `net weight × ${formatNumber(LB_PER_MT)} lb per MT. The legacy chain multiplies by 22.25 for gross and divides by 22.25 for net, which cannot both be right.`,
                  },
                  {
                    label: "Commodity purchase amount",
                    value: formatMoney(value.purchaseAmount),
                    behaviour: "calculated",
                    hint: "net pounds × price per pound",
                  },
                  {
                    label: "Agent commission amount",
                    value: value.commissionAmount ? formatMoney(value.commissionAmount) : undefined,
                    behaviour: "calculated",
                    hint: "net weight in MT × commission per MT. The commission rate originates on the purchase agreement.",
                  },
                  {
                    label: "Total purchase amount",
                    value: <strong>{formatMoney(value.totalAmount)}</strong>,
                    behaviour: "calculated",
                  },
                ]}
              />
            )}
            {value.compositionUnconfirmed ? (
              <Banner tone="warn" title="How the total is composed is not established">
                The legacy placeholder for <em>Total Purchase Amount</em> reads{" "}
                <code>Commosion Amount + Commodity Purchase Amount</code> and is visibly truncated in the only
                capture of it, so the source does not establish how the purchase value and the agent
                commission combine into one figure. The two components are shown separately as well as summed,
                and this note stays until the business confirms the composition. The source also states no
                currency for the receipt price; {currency} is used here to match the Funds page.
              </Banner>
            ) : null}
          </SummaryCard>
        </div>

        <TotalBanner
          label="Net weight received"
          value={weights.netMt === undefined ? "not priced" : formatMt(weights.netMt)}
          derivation={
            weights.netMt === undefined
              ? "gross − packaging − dirt; the dirt rate is entered on the pricing step, so no net weight exists yet"
              : `gross ${formatMt(weights.grossWithDirtMt)} − packaging ${formatMt(weights.packagingMt)} − dirt ${formatMt(weights.dirtDeductionMt)}`
          }
        />

        <CollapsibleSection title="Pricing (the separate Sourcing step)" indicator={receiptStatusChip(r)}>
          <Banner tone="info" title="Why this step is separate, and why it now exists for both kinds">
            Price is not captured when a receipt is created; it is added later by the Sourcing team, which is
            a genuine two-step process and is kept. In the legacy system that step was reachable only from the
            parent agreement's Receipts Details grid and from nowhere else — the receipt's own detail view had
            no link to it.{" "}
            {r.kind === "warehouse"
              ? "For a warehouse receipt it did not exist at all: /WarehouseReceipts/Edit/{id} returns HTTP 500 and /WarehouseReceipts/AddReceiptPrice/{id} redirects to a not-found page, also with HTTP 500, so the source records that a warehouse receipt can never be priced or confirmed through the UI. It can be here."
              : "It is reachable from the receipt and from the agreement here."}
          </Banner>

          <ErrorSummary
            title="The pricing could not be saved"
            errors={Object.entries(errors).map(([field, message]) => ({ field, message }))}
          />

          <div className="fields">
            <FormRow
              label={`Price per pound (${currency})`}
              htmlFor="px-price"
              required
              error={errors["px-price"]}
              hint="The agreed price per pound, entered by Sourcing. The source states no currency for it."
            >
              <TextInput
                id="px-price"
                value={pricePerLb}
                onChange={setPricePerLb}
                required
                error={errors["px-price"]}
                inputMode="decimal"
              />
            </FormRow>
            <FormRow
              label="Dirt per tonne (kg per tonne — unit unconfirmed)"
              htmlFor="px-dirt"
              required
              error={errors["px-dirt"]}
              hint="The legacy field is Dirt/Ton and the source never states its unit. It is read here as kilograms of dirt per tonne of gross weight, which is the only reading that gives a sane result for the captured values. Marked unconfirmed and not resolved."
            >
              <TextInput
                id="px-dirt"
                value={dirtPerTon}
                onChange={setDirtPerTon}
                required
                error={errors["px-dirt"]}
                inputMode="decimal"
              />
            </FormRow>
            <FormRow
              label="Agent's declared net weight (MT)"
              htmlFor="px-agentnet"
              required
              error={errors["px-agentnet"]}
              hint="The agent's own figure. The variance against our derived net weight is what this reconciles."
            >
              <TextInput
                id="px-agentnet"
                value={agentNet}
                onChange={setAgentNet}
                required
                error={errors["px-agentnet"]}
                inputMode="decimal"
              />
            </FormRow>
            <FormRow
              label={`Agent commission per MT (${currency})`}
              htmlFor="px-commission"
              error={errors["px-commission"]}
              hint="Originates on the purchase agreement and is carried onto the receipt as a hidden field in the legacy form."
            >
              <TextInput
                id="px-commission"
                value={commission}
                onChange={setCommission}
                error={errors["px-commission"]}
                inputMode="decimal"
              />
            </FormRow>
            <FormRow
              label="Receipt status"
              htmlFor="px-status"
              required
              error={errors["px-status"]}
              hint="Confirmed closes the receipt off and is what lets its tonnage reach the weekly production plan. Need Review holds it with Sourcing. This is the only status transition evidence in the whole source."
            >
              <SelectInput
                id="px-status"
                value={status}
                onChange={setStatus}
                required
                error={errors["px-status"]}
                placeholder="Select a receipt status…"
                options={[
                  { value: "need_review", label: "Need review" },
                  { value: "confirmed", label: "Confirmed" },
                ]}
              />
            </FormRow>
          </div>

          <RequiredLegend />

          <div className="factions">
            <button type="button" className="btn btn--primary" onClick={() => void submitPricing()}>
              {r.pricing ? "Update pricing" : "Save pricing"}
            </button>
            {r.pricing?.status === "need_review" ? (
              <button type="button" className="btn" onClick={() => void moveStatus("confirmed")}>
                Confirm receipt
              </button>
            ) : null}
            {r.pricing?.status === "confirmed" ? (
              <button type="button" className="btn" onClick={() => void moveStatus("need_review")}>
                Return for review
              </button>
            ) : null}
            <Link className="btn" to={`/sourcing/agreements/${agreement.id}`}>
              Back to the agreement
            </Link>
          </div>

          {r.pricing ? (
            <FieldGrid
              fields={[
                { label: "Priced on", value: formatDate(r.pricing.pricedOn), behaviour: "readonly" },
                { label: "Priced by", value: r.pricing.pricedBy, behaviour: "readonly" },
                {
                  label: "Current status",
                  value: (
                    <StatusChip
                      tone={toneFor(r.pricing.status)}
                      label={humanise(r.pricing.status)}
                      size="sm"
                    />
                  ),
                },
              ]}
            />
          ) : null}
        </CollapsibleSection>

        <CollapsibleSection title="What the source does not resolve" defaultOpen={false}>
          <p className="small">
            Recorded because a replacement design has to ask the business, not guess. Each of these is stated
            as unresolved in the extracted specification of the legacy screens.
          </p>
          <ul className="doclist">
            <li>
              <span className="doclist__name">
                How the reference number is generated
                <span className="doclist__sub">
                  The source says only "system-generated". The format, sequence and any meaning in the prefix
                  are not stated for either the material-receipt reference or the warehouse-receipt reference,
                  and neither is obviously derived from the PA ref, the purchase order or the date.
                </span>
              </span>
              <StatusChip tone="warn" label="open" size="sm" />
            </li>
            <li>
              <span className="doclist__name">
                Why the purchase-agreement dropdown offers three of seven agreements
                <span className="doclist__sub">
                  The same filtering appears on the receiving-locations, material-receipt and
                  warehouse-receipt forms. One source calls agreement status the likely criterion and labels
                  that a suggestion, not observed behaviour. The criterion, and which statuses qualify, are
                  never given.
                </span>
              </span>
              <StatusChip tone="warn" label="open" size="sm" />
            </li>
            <li>
              <span className="doclist__name">
                What <em>Receipt From = Warehouse</em> means
                <span className="doclist__sub">
                  Every captured row reads Supplier. There is no example of the Warehouse option, and the
                  source does not state what it changes on the form, whether the supplier fields still apply,
                  or what it does to the source-warehouse record.
                </span>
              </span>
              <StatusChip tone="warn" label="open" size="sm" />
            </li>
            <li>
              <span className="doclist__name">
                The absence of any validation message text
                <span className="doclist__sub">
                  The source states that client-side messages render beneath each field and quotes none. No
                  error state is captured anywhere in the module, so the required-field messages, the numeric
                  validation on every quantity, any min, max or precision, and any date bound on the receipt
                  date are all unknown. Required-ness is inferred solely from red asterisks.
                </span>
              </span>
              <StatusChip tone="warn" label="open" size="sm" />
            </li>
          </ul>
        </CollapsibleSection>
      </div>
    </>
  );
}
