/**
 * Phase 06 — Stock allocation and cargo readiness (workflow v2.0 §6.6).
 *
 * v2.0 §16.1 records this phase as having no screen at all, so nothing here replaces
 * a captured legacy form. Every figure traces to the workshop notes and to the
 * register rows G-11 and C-17 … C-26; the open decisions on the phase are D-16 and
 * D-20.
 *
 * What the source establishes and this screen therefore shows:
 *  · the stock state model, in three states and no more — “under process (raw) →
 *    ready as finished good → reserved for the purchase contract” [AS-IS];
 *  · the processing team's feedback that stock is ready as a finished good, after
 *    which the stock is reserved for the purchase contract [AS-IS];
 *  · the quality grade of the produced commodity as the reference used in the
 *    purchase contract stock allocation [AS-IS];
 *  · a shortfall against the contract quantity shown as short in the long and short
 *    position report, with the sourcing team taking action to purchase it [AS-IS];
 *  · the weekly production plan built on raw materials actually received at
 *    facilities, planned but unreceived quantities excluded [AS-IS, register C-24];
 *  · stock held under the Stock Management Agreement flagged [AS-IS];
 *  · the new warehouse path — commercial or execution raises it, Logistics handles it
 *    in Sudan and Execution regionally, Quality reports its visit and recommendations
 *    and releases, Execution approves, Compliance creates it in the ERP [AS-IS].
 *
 * What is deliberately absent:
 *  · the “enhanced process” for cargo readiness allocation. v2.0 records only that an
 *    enhanced process is to be applied in COTS and does not describe it, so activity 6
 *    is a confirmation stamp and nothing more [PROPOSED];
 *  · any stock state beyond the three named ones. No released, no shipped [OPEN];
 *  · any flow for the two special processes v2.0 names without describing — change of
 *    intended use from export to local sales, and degraded product [OPEN];
 *  · any prescribed order for the four confirmations — stock allocation, processing
 *    feedback, cargo readiness and shipment execution. v2.0 describes them as a set of
 *    screens rather than a sequence and states no order [OPEN];
 *  · any inventory valuation, and any filter, count or balance keyed on the batch code.
 *    Both are scope decisions of the workshop, not omissions;
 *  · the batch coding structure itself, which is outstanding master data owed by
 *    Siedahmed (v2.0 §14.1).
 *
 * Every derived figure comes from `domain/sourcing.ts` — `stockSummary`,
 * `positionReport`, `contractAllocation` and `productionPlanCheck` — so this screen
 * and `/origination/position` read the same function and cannot disagree.
 */

import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { commodityById, counterpartyName } from "../data/master";
import { formatDate, formatMt, sum } from "../domain/calc";
import {
  CARGO_TRANSITIONS,
  WAREHOUSE_REQUEST_TRANSITIONS,
  guardStockAllocation,
  humanise,
  nextStates,
  toneFor,
} from "../domain/status";
import { contractAllocation, positionReport, productionPlanCheck, stockSummary } from "../domain/sourcing";
import {
  CARGO_STATUS_LABEL,
  ROLE_LABEL,
  type CargoReadiness,
  type CargoStatus,
  type Contract,
  type ExecutionPlan,
  type IntakeReceipt,
  type PositionLine,
  type ProductionPlanWeek,
  type PurchaseAgreement,
  type Shipment,
  type StockLot,
  type WarehouseRequest,
  type WarehouseRequestState,
} from "../domain/types";
import { countryName } from "../domain/variants";
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
import { ErrorSummary, FormRow, RequiredLegend, SelectInput, TextArea, TextInput } from "../components/form";
import { DataTable, type Column } from "../components/table";
import { useAsync } from "./hooks";

const ALLOCATION_TABS = ["stock", "position", "production-plan", "warehouse-requests"] as const;
type AllocationTab = (typeof ALLOCATION_TABS)[number];

const TAB_LABEL: Record<AllocationTab, string> = {
  stock: "Stock & allocation",
  position: "Long & short position",
  "production-plan": "Weekly production plan",
  "warehouse-requests": "Warehouse requests",
};

/** The same reading of “open” that `positionReport` uses, so the two agree. */
function isOpenContract(c: Contract): boolean {
  return c.status !== "completed" && c.status !== "cancelled";
}

function commodityName(id: string): string {
  return commodityById(id)?.name ?? id;
}

/**
 * The action that reaches each warehouse-request state, worded as v2.0 §6.6 words it.
 * Labels only — the permitted steps themselves come from `WAREHOUSE_REQUEST_TRANSITIONS`.
 */
const WAREHOUSE_ACTION_LABEL: Record<WarehouseRequestState, string> = {
  raised: "Raise the request",
  quality_visit: "Record the quality visit",
  quality_released: "Quality reports and releases",
  execution_approved: "Execution approves",
  created_in_erp: "Compliance creates it in the ERP",
  rejected: "Reject the request",
};

/* ================================================================== *
 * Module shell
 * ================================================================== */

export function AllocationModule() {
  const { tab } = useParams();
  const active = (tab ?? "stock") as AllocationTab;
  const { user } = useAuth();
  const actor = user?.displayName ?? "Execution";

  const lots = useAsync(() => api.listStockLots());
  const contracts = useAsync(() => api.listContracts());
  const readiness = useAsync(() => api.listCargoReadiness());
  const executionPlans = useAsync(() => api.listExecutionPlans());
  const productionPlan = useAsync(() => api.listProductionPlan());
  const warehouseRequests = useAsync(() => api.listWarehouseRequests());
  const receipts = useAsync(() => api.listIntakeReceipts());
  const agreements = useAsync(() => api.listPurchaseAgreements());
  const shipments = useAsync(() => api.listShipments());

  const loadError = lots.error ?? contracts.error;
  if (loadError) {
    return (
      <div className="page">
        <ErrorState detail={loadError} onRetry={lots.reload} />
      </div>
    );
  }

  const lotRows = lots.data ?? [];
  const contractRows = contracts.data ?? [];
  const readinessRows = readiness.data ?? [];
  const planRows = executionPlans.data ?? [];
  const weekRows = productionPlan.data ?? [];
  const requestRows = warehouseRequests.data ?? [];
  const receiptRows = receipts.data ?? [];
  const agreementRows = agreements.data ?? [];
  const shipmentRows = shipments.data ?? [];

  const openContracts = contractRows.filter(isOpenContract);
  const position = positionReport(contractRows, lotRows);
  const openRequests = requestRows.filter((r) => r.state !== "created_in_erp" && r.state !== "rejected");

  const tabs = ALLOCATION_TABS.map((t) => ({
    key: t,
    label: TAB_LABEL[t],
    to: t === "stock" ? "/allocation" : `/allocation/${t}`,
    badge:
      t === "stock"
        ? lotRows.length || undefined
        : t === "production-plan"
          ? weekRows.length || undefined
          : t === "warehouse-requests"
            ? openRequests.length || undefined
            : undefined,
  }));

  const crumbs =
    active === "stock"
      ? [{ label: "Home", to: "/" }, { label: "Allocation & readiness" }]
      : [
          { label: "Home", to: "/" },
          { label: "Allocation & readiness", to: "/allocation" },
          { label: TAB_LABEL[active] },
        ];

  return (
    <>
      <PageHeader
        moduleLabel="Allocation & readiness"
        crumbs={crumbs}
        title="Stock allocation & cargo readiness"
        meta="Phase 06 — stock tracked against contracts, finished goods reserved, the position report, the weekly production plan and the warehouse capacity exception"
        recordKey={`${lotRows.length}`}
        recordDate="stock lots"
        tabs={<RecordTabs tabs={tabs} />}
      />

      <div className="page">
        <Banner tone="info" title="Phase 06 has no legacy screen (v2.0 §16.1)">
          The workshop describes this phase in full and no captured form implements any part of it, so
          everything here is built from the notes. Register rows G-11 and C-17 to C-26 land on this screen.
          The owner is the Execution team with the Processing team for readiness feedback; Quality provides
          the grades, Sourcing covers a short position and Warehousing holds the capacity.
        </Banner>

        {active === "stock" ? (
          <StockTab
            actor={actor}
            lots={lotRows}
            loading={lots.loading}
            contracts={contractRows}
            openContracts={openContracts}
            readiness={readinessRows}
            plans={planRows}
            shipments={shipmentRows}
          />
        ) : null}

        {active === "position" ? (
          <PositionTab lines={position} loading={lots.loading || contracts.loading} />
        ) : null}

        {active === "production-plan" ? (
          <ProductionPlanTab
            weeks={weekRows}
            loading={productionPlan.loading}
            receipts={receiptRows}
            agreements={agreementRows}
          />
        ) : null}

        {active === "warehouse-requests" ? (
          <WarehouseRequestsTab requests={requestRows} loading={warehouseRequests.loading} />
        ) : null}
      </div>
    </>
  );
}

/* ================================================================== *
 * Tab 1 — stock and allocation
 * ================================================================== */

function StockTab({
  actor,
  lots,
  loading,
  contracts,
  openContracts,
  readiness,
  plans,
  shipments,
}: {
  actor: string;
  lots: StockLot[];
  loading: boolean;
  contracts: Contract[];
  openContracts: Contract[];
  readiness: CargoReadiness[];
  plans: ExecutionPlan[];
  shipments: Shipment[];
}) {
  const toast = useToast();
  const [allocLot, setAllocLot] = useState<StockLot | null>(null);
  const [allocContractId, setAllocContractId] = useState("");
  const [allocErrors, setAllocErrors] = useState<Record<string, string>>({});

  const summary = stockSummary(lots);
  const contractedOpenMt = sum(openContracts.map((c) => c.quantityMt));
  const reservedAgainstOpenMt = sum(openContracts.map((c) => contractAllocation(c, lots).reservedMt));
  const smaLots = lots.filter((l) => l.smaFlagged);
  const shortfallContracts = openContracts.filter((c) => contractAllocation(c, lots).remainingMt > 0);

  const contractNo = (id?: string) => contracts.find((c) => c.id === id)?.contractNo;

  function closeAllocate() {
    setAllocLot(null);
    setAllocContractId("");
    setAllocErrors({});
  }

  async function release(lot: StockLot) {
    const res = await api.releaseStockLot(lot.id);
    if (!res.ok) {
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `Lot ${lot.lotRef} released back to ready as a finished good.`);
  }

  async function confirmProcessed(lot: StockLot) {
    const res = await api.confirmLotProcessed(lot.id, actor);
    if (!res.ok) {
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `Lot ${lot.lotRef} confirmed ready as a finished good by ${actor}.`);
  }

  async function submitAllocation() {
    if (!allocLot) return;
    const next: Record<string, string> = {};
    if (!allocContractId) {
      next["alloc-contract"] = "Select the purchase contract this lot is reserved for.";
    }
    setAllocErrors(next);
    if (Object.keys(next).length > 0) return;
    const res = await api.allocateStockLot(allocLot.id, allocContractId);
    if (!res.ok) {
      toast.push("risk", res.reason);
      setAllocErrors({ "alloc-contract": res.reason });
      return;
    }
    toast.push(
      "ok",
      `Lot ${allocLot.lotRef} reserved for ${contractNo(allocContractId) ?? "the purchase contract"}.`,
    );
    closeAllocate();
  }

  const columns: Column<StockLot>[] = [
    {
      key: "lotRef",
      header: "Lot",
      cell: (l) => <span className="mono">{l.lotRef}</span>,
      sortValue: (l) => l.lotRef,
    },
    {
      key: "commodity",
      header: "Commodity",
      cell: (l) => commodityName(l.commodityId),
      sortValue: (l) => commodityName(l.commodityId),
      filterOptions: [...new Set(lots.map((l) => l.commodityId))].map((id) => ({
        value: id,
        label: commodityName(id),
      })),
      filterMatch: (l, v) => l.commodityId === v,
    },
    {
      key: "origin",
      header: "Origin",
      cell: (l) => countryName(l.origin),
      sortValue: (l) => countryName(l.origin),
    },
    { key: "facility", header: "Facility", cell: (l) => l.facility, sortValue: (l) => l.facility },
    {
      key: "grade",
      header: "Grade",
      cell: (l) => l.grade,
      sortValue: (l) => l.grade,
      filterOptions: [...new Set(lots.map((l) => l.grade))].map((g) => ({ value: g, label: g })),
      filterMatch: (l, v) => l.grade === v,
    },
    {
      key: "quantity",
      header: "Quantity",
      align: "right",
      cell: (l) => formatMt(l.quantityMt),
      sortValue: (l) => l.quantityMt,
    },
    {
      key: "state",
      header: "State",
      cell: (l) => <StatusChip tone={toneFor(l.state)} label={humanise(l.state)} size="sm" />,
      sortValue: (l) => l.state,
      filterOptions: [...new Set(lots.map((l) => l.state))].map((s) => ({ value: s, label: humanise(s) })),
      filterMatch: (l, v) => l.state === v,
    },
    {
      key: "contract",
      header: "Allocated contract",
      cell: (l) =>
        l.allocatedContractId ? (
          <Link to={`/contracts/${l.allocatedContractId}`}>
            {contractNo(l.allocatedContractId) ?? l.allocatedContractId}
          </Link>
        ) : (
          <span className="muted">–</span>
        ),
      sortValue: (l) => contractNo(l.allocatedContractId) ?? "",
    },
    {
      key: "batch",
      header: "Batch code",
      cell: (l) => <span className="mono small">{l.batchCode ?? "–"}</span>,
      sortValue: (l) => l.batchCode ?? "",
      optional: true,
    },
    {
      key: "sma",
      header: "SMA",
      cell: (l) =>
        l.smaFlagged ? (
          <StatusChip tone="warn" label="Under the SMA" size="sm" />
        ) : (
          <span className="muted">–</span>
        ),
      sortValue: (l) => (l.smaFlagged ? 1 : 0),
      optional: true,
    },
    {
      key: "produced",
      header: "Production date",
      cell: (l) => (l.productionDate ? formatDate(l.productionDate) : <span className="muted">–</span>),
      sortValue: (l) => l.productionDate ?? "",
      optional: true,
    },
    {
      key: "release",
      header: "Quality release",
      cell: (l) => <span className="mono small">{l.qualityReleaseRef ?? "–"}</span>,
      sortValue: (l) => l.qualityReleaseRef ?? "",
      optional: true,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (l) => {
        const gate = guardStockAllocation(l);
        return (
          <span className="row">
            <button
              type="button"
              className="btn btn--sm"
              disabled={!gate.allowed}
              title={gate.allowed ? undefined : gate.reason}
              onClick={() => {
                setAllocErrors({});
                setAllocContractId("");
                setAllocLot(l);
              }}
            >
              Allocate
            </button>
            {l.state === "reserved" ? (
              <button type="button" className="btn btn--sm" onClick={() => void release(l)}>
                Release
              </button>
            ) : null}
            {l.state === "under_process" ? (
              <button type="button" className="btn btn--sm" onClick={() => void confirmProcessed(l)}>
                Confirm processed
              </button>
            ) : null}
            {gate.allowed ? null : <span className="xsmall muted">{gate.reason}</span>}
          </span>
        );
      },
    },
  ];

  const allocatableForLot = allocLot
    ? openContracts.filter((c) => c.commodityId === allocLot.commodityId)
    : [];

  return (
    <>
      <Banner tone="info" title="Three scope decisions the workshop took (v2.0 §6.6)">
        The batch code is recorded on the stock and is deliberately not used in the stock allocation, in the
        delivery to the export purchase contract, or in stock counting and balance tracking — a firm decision,
        so it is shown here and never filtered, counted or reconciled on. COTS does not track the value of
        inventory stocks: it tracks the volumes purchased, processed and moved, without the related costs and
        expenses, so no money appears on this screen. The quality grade of the produced commodity is carried
        on the stock and is the reference used in the purchase contract stock allocation.
      </Banner>

      <Banner tone="warn" title="Decision D-16 — may SMA stock be allocated?">
        Stock held under the Stock Management Agreement — the agreement under which goods are sold to Invictus
        while the stock is still at the warehouse and not yet shipped — is flagged. The notes state one
        direction only: stock already allocated to contracts in the allocation plan may be added to the SMA.
        Whether stock flagged to the SMA may be allocated to an export purchase contract, and on whose
        authority, is open — owner: Execution and Finance. Nothing here blocks it and nothing here permits it.
      </Banner>

      <Banner tone="warn" title="The order of the four confirmations is not stated (v2.0 §6.6)">
        The relationship between cargo readiness, stock allocation, processing feedback and shipment execution
        is described as a set of screens rather than a sequence, and the order in which the four confirmations
        must occur is not given. The one order the source does state is that the processing team confirms the
        stock is ready as a finished good before the stock is reserved (activity 2), and that is the only
        order enforced here.
      </Banner>

      <div className="grid-3">
        <SummaryCard title="Stock by state">
          <FieldGrid
            columns={1}
            fields={[
              { label: "Under process (raw)", value: formatMt(summary.underProcessMt) },
              { label: "Ready as a finished good", value: formatMt(summary.readyFinishedMt) },
              { label: "Reserved for a purchase contract", value: formatMt(summary.reservedMt) },
              { label: "Lots held", value: `${lots.length}`, behaviour: "calculated" },
            ]}
          />
          <p className="xsmall muted" style={{ marginTop: "0.5rem" }}>
            v2.0 §6.6 gives the model as “under process (raw) → ready as finished good → reserved for the
            purchase contract”. No state names beyond these are given [OPEN], so none is added — there is no
            released state and no shipped state on a lot.
          </p>
        </SummaryCard>

        <SummaryCard title="Allocatable now">
          <QuantityDonut
            fraction={contractedOpenMt > 0 ? reservedAgainstOpenMt / contractedOpenMt : 0}
            valueLabel={formatMt(reservedAgainstOpenMt)}
            ofLabel={formatMt(contractedOpenMt)}
            caption="reserved against open purchase contracts"
            tone={reservedAgainstOpenMt >= contractedOpenMt ? "ok" : "accent"}
          />
          <FieldGrid
            columns={1}
            fields={[
              {
                label: "Ready and not yet reserved",
                value: <strong>{formatMt(summary.allocatableMt)}</strong>,
                behaviour: "calculated",
                hint: "The only stock a contract can draw on today",
              },
              { label: "Open contracts", value: `${openContracts.length}` },
              {
                label: "Contracts with a shortfall",
                value: `${shortfallContracts.length}`,
                behaviour: "calculated",
              },
            ]}
          />
        </SummaryCard>

        <SummaryCard title="Under the Stock Management Agreement" tone={smaLots.length > 0 ? "warn" : "na"}>
          <FieldGrid
            columns={1}
            fields={[
              { label: "Flagged tonnage", value: <strong>{formatMt(summary.smaFlaggedMt)}</strong> },
              { label: "Lots flagged", value: `${smaLots.length}` },
              {
                label: "Of which already reserved",
                value: formatMt(sum(smaLots.filter((l) => l.state === "reserved").map((l) => l.quantityMt))),
                behaviour: "calculated",
              },
            ]}
          />
          <Banner tone="warn" title="Decision D-16">
            May stock flagged to the Stock Management Agreement be allocated to an export purchase contract,
            and on whose authority? Open — Execution and Finance.
          </Banner>
        </SummaryCard>
      </div>

      <TotalBanner
        label="Stock reserved against open purchase contracts"
        value={formatMt(reservedAgainstOpenMt)}
        derivation={`contracted ${formatMt(contractedOpenMt)} across ${openContracts.length} open contract(s); ready and unreserved ${formatMt(summary.allocatableMt)}; under process ${formatMt(summary.underProcessMt)}, which cannot be allocated yet`}
      />

      <DataTable
        caption="Stock lots"
        rows={lots}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by lot reference, facility, grade or batch code…"
        searchValue={(l) =>
          `${l.lotRef} ${l.facility} ${l.grade} ${l.batchCode ?? ""} ${commodityName(l.commodityId)}`
        }
        savedViews={[
          { key: "all", label: "All lots" },
          {
            key: "ready",
            label: "Ready and unallocated",
            description:
              "Ready as a finished good and not yet reserved — the only stock a purchase contract can draw on.",
            predicate: (l) => l.state === "ready_finished",
          },
          {
            key: "under-process",
            label: "Under process",
            description:
              "Raw material. No allocation is made until processing is finished; the status shows that the stock is under process (v2.0 §6.6 activity 3).",
            predicate: (l) => l.state === "under_process",
          },
          {
            key: "reserved",
            label: "Reserved",
            description: "Reserved for a purchase contract following the processing team's feedback.",
            predicate: (l) => l.state === "reserved",
          },
          {
            key: "sma",
            label: "SMA-flagged",
            description: "Held under the Stock Management Agreement. See decision D-16.",
            predicate: (l) => l.smaFlagged,
          },
        ]}
        emptyTitle="No stock lot held"
        emptyBody="Stock status is tracked and shown against contracts (v2.0 §6.6 activity 1). Nothing is held at any facility in this data set."
      />

      <CollapsibleSection
        title="Allocation by contract"
        indicator={
          <StatusChip
            tone={shortfallContracts.length === 0 ? "ok" : "warn"}
            label={`${shortfallContracts.length} of ${openContracts.length} short`}
            size="sm"
          />
        }
      >
        {openContracts.length === 0 ? (
          <EmptyState title="No open purchase contract" glyph="○">
            Phase 06 is triggered by a contract that exists and requires cargo (v2.0 §6.6).
          </EmptyState>
        ) : (
          <>
            <div className="dtable__scroll">
              <table className="dtable__table">
                <caption className="sr-only">Reserved stock by open purchase contract</caption>
                <thead>
                  <tr>
                    <th scope="col">Purchase contract</th>
                    <th scope="col">Commodity</th>
                    <th scope="col" className="text-right">
                      Contracted
                    </th>
                    <th scope="col" className="text-right">
                      Reserved
                    </th>
                    <th scope="col" className="text-right">
                      Remaining
                    </th>
                    <th scope="col" className="text-right">
                      Complete
                    </th>
                    <th scope="col">Lots making it up</th>
                    <th scope="col">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {openContracts.map((c) => {
                    const a = contractAllocation(c, lots);
                    const mine = lots.filter((l) => l.allocatedContractId === c.id && l.state === "reserved");
                    return (
                      <tr key={c.id}>
                        <td>
                          <Link to={`/contracts/${c.id}`}>{c.contractNo}</Link>
                          <span className="doclist__sub">{counterpartyName(c.buyerId)}</span>
                        </td>
                        <td>{commodityName(c.commodityId)}</td>
                        <td className="text-right">{formatMt(c.quantityMt)}</td>
                        <td className="text-right">{formatMt(a.reservedMt)}</td>
                        <td className="text-right">
                          <strong>{formatMt(Math.max(0, a.remainingMt))}</strong>
                        </td>
                        <td className="text-right">{Math.round(a.fraction * 100)}%</td>
                        <td className="small">
                          {mine.length === 0 ? (
                            <span className="muted">none</span>
                          ) : (
                            <span className="mono">{mine.map((l) => l.lotRef).join(", ")}</span>
                          )}
                        </td>
                        <td>
                          {a.remainingMt > 0 ? (
                            <>
                              <StatusChip tone="warn" label="Short" size="sm" />
                              <span className="doclist__sub">
                                {formatMt(a.remainingMt)} shows as short in the{" "}
                                <Link to="/allocation/position">position report</Link> and passes to{" "}
                                <Link to="/sourcing">sourcing</Link> to purchase (v2.0 §6.6 activity 5).
                              </span>
                            </>
                          ) : (
                            <StatusChip tone="ok" label="Covered" size="sm" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="small muted" style={{ marginTop: "0.5rem" }}>
              Reserved, remaining and the completeness fraction are derived by `contractAllocation` from the
              lots themselves; no allocated total is stored on a contract. Stock under process is excluded,
              because raw material cannot be allocated until processing is complete.
            </p>
          </>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Cargo readiness confirmation (activity 6)">
        <Banner tone="info" title="An enhanced process is named and not described [PROPOSED]">
          v2.0 §6.6 activity 6 records that cargo readiness allocation, previously captured on the Shipment
          Execution screen, is confirmed, and that an enhanced process is to be applied in COTS. The workshop
          does not describe that process. This screen therefore records the two confirmations the source names
          and nothing more: no rule, no calculation and no further state are inferred from it.
        </Banner>
        <Banner tone="info" title="Two vocabularies for adjacent things">
          v2.0 §6.6 gives the stock state model as three values — under process (raw) → ready as a finished
          good → reserved for the purchase contract — and states that no state names beyond these are given.
          The cargo status carried on the readiness record is the legacy ten-value set from the Shipments
          Execution screen, six of whose values qualify a form of “ready”. The two are not reconciled here,
          because reconciling them silently would hide the question: the three-value model and the ten-value
          set describe adjacent things in different words, and which survives is a decision for the workshop.
        </Banner>
        {readiness.length === 0 ? (
          <EmptyState title="No cargo readiness record" glyph="○" />
        ) : (
          <div className="dtable__scroll">
            <table className="dtable__table">
              <caption className="sr-only">Cargo readiness confirmations</caption>
              <thead>
                <tr>
                  <th scope="col">Planning number</th>
                  <th scope="col">Cargo status</th>
                  <th scope="col" className="text-right">
                    Quantity ready
                  </th>
                  <th scope="col">Processing feedback</th>
                  <th scope="col">Readiness confirmed</th>
                  <th scope="col">Confirm</th>
                </tr>
              </thead>
              <tbody>
                {readiness.map((r) => (
                  <ReadinessRow
                    key={r.id}
                    record={r}
                    actor={actor}
                    plan={plans.find((p) => p.id === r.executionPlanId)}
                    shipment={shipments.find((s) => s.executionPlanId === r.executionPlanId)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Exceptions with no documented flow" defaultOpen={false}>
        <p className="small muted">
          v2.0 §6.6 names two exceptions as special processes and describes no flow for either. They are
          listed here so the gap is visible; no flow has been designed for them, because the source provides
          none.
        </p>
        <ul className="doclist">
          <li>
            <span className="doclist__name">
              Change of intended use from export to local sales
              <span className="doclist__sub">
                Recorded as a special process [AS-IS]. No states, no owner and no sequence are given.
              </span>
            </span>
            <StatusChip tone="warn" label="Open — no flow described" size="sm" />
          </li>
          <li>
            <span className="doclist__name">
              Degraded product
              <span className="doclist__sub">
                Recorded as a special process [AS-IS]. No states, no owner and no sequence are given.
              </span>
            </span>
            <StatusChip tone="warn" label="Open — no flow described" size="sm" />
          </li>
        </ul>
      </CollapsibleSection>

      <Dialog
        open={allocLot !== null}
        title={allocLot ? `Allocate lot ${allocLot.lotRef}` : "Allocate stock lot"}
        onClose={closeAllocate}
        footer={
          <>
            <button type="button" className="btn" onClick={closeAllocate}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary" onClick={() => void submitAllocation()}>
              Reserve for the contract
            </button>
          </>
        }
      >
        {allocLot ? (
          <>
            <ErrorSummary
              title="The lot could not be reserved"
              errors={Object.entries(allocErrors).map(([field, message]) => ({ field, message }))}
            />
            <FieldGrid
              columns={1}
              fields={[
                { label: "Lot", value: allocLot.lotRef, behaviour: "readonly" },
                { label: "Commodity", value: commodityName(allocLot.commodityId), behaviour: "inherited" },
                {
                  label: "Quality grade",
                  value: allocLot.grade,
                  behaviour: "inherited",
                  hint: "The reference used in the purchase contract stock allocation (v2.0 §6.6 activity 4)",
                },
                { label: "Quantity", value: formatMt(allocLot.quantityMt), behaviour: "inherited" },
                {
                  label: "State",
                  value: (
                    <StatusChip tone={toneFor(allocLot.state)} label={humanise(allocLot.state)} size="sm" />
                  ),
                },
                {
                  label: "Batch code",
                  value: allocLot.batchCode,
                  hint: "Recorded on the stock and deliberately not used in this allocation",
                },
              ]}
            />
            <div style={{ marginTop: "0.75rem" }}>
              <FormRow
                label="Purchase contract"
                htmlFor="alloc-contract"
                required
                error={allocErrors["alloc-contract"]}
                hint="Only open contracts for this commodity are offered. Allocation across commodities is refused."
              >
                <SelectInput
                  id="alloc-contract"
                  value={allocContractId}
                  onChange={setAllocContractId}
                  required
                  error={allocErrors["alloc-contract"]}
                  placeholder="Select a purchase contract…"
                  options={allocatableForLot.map((c) => ({
                    value: c.id,
                    label: `${c.contractNo} — ${counterpartyName(c.buyerId)} — ${formatMt(c.quantityMt)} contracted, ${formatMt(Math.max(0, contractAllocation(c, lots).remainingMt))} remaining`,
                  }))}
                />
              </FormRow>
            </div>
            {allocatableForLot.length === 0 ? (
              <Banner tone="warn" title="No open contract for this commodity">
                Where no stock is available for the contract quantity the shortfall shows as short and passes
                to sourcing; the reverse case — stock with no contract to carry it — is not described by the
                source.
              </Banner>
            ) : null}
            <RequiredLegend />
          </>
        ) : null}
      </Dialog>
    </>
  );
}

function ReadinessRow({
  record,
  actor,
  plan,
  shipment,
}: {
  record: CargoReadiness;
  actor: string;
  plan?: ExecutionPlan;
  shipment?: Shipment;
}) {
  const toast = useToast();
  /** The ten-value cargo status was displayed everywhere and changeable nowhere. */
  const [statusOpen, setStatusOpen] = useState(false);
  const [target, setTarget] = useState<CargoStatus | "">("");
  const [qtyReady, setQtyReady] = useState("");
  const [saving, setSaving] = useState(false);
  /**
   * Stable, deliberately: `Dialog` re-runs its focus effect whenever `onClose` changes
   * identity, which would move focus out of the field on every keystroke.
   */
  const closeStatusDialog = useCallback(() => setStatusOpen(false), []);
  const permitted = nextStates(CARGO_TRANSITIONS, record.cargoStatus);

  async function changeCargoStatus() {
    if (!target) {
      toast.push("risk", "Choose the status to move to.");
      return;
    }
    const qty = Number(qtyReady);
    setSaving(true);
    const res = await api.setCargoStatus(
      record.id,
      target,
      qtyReady.trim() !== "" && Number.isFinite(qty) ? qty : undefined,
    );
    setSaving(false);
    if (!res.ok) {
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `Cargo status set to ${CARGO_STATUS_LABEL[target]}.`);
    setStatusOpen(false);
    setTarget("");
    setQtyReady("");
  }

  async function confirm(kind: "processing" | "readiness") {
    const res = await api.confirmCargoReadiness(record.id, actor, kind);
    if (!res.ok) {
      toast.push("risk", res.reason);
      return;
    }
    toast.push(
      "ok",
      kind === "processing"
        ? `Processing feedback recorded by ${actor} — the stock is ready as a finished good.`
        : `Cargo readiness confirmed by ${actor}.`,
    );
  }

  const processingDone = Boolean(record.processingConfirmedOn);
  const readinessDone = Boolean(record.readinessConfirmedOn);

  return (
    <tr>
      <td>
        {plan ? plan.planningNo : <span className="muted">–</span>}
        {shipment ? (
          <span className="doclist__sub">
            <Link to={`/shipments/${shipment.id}`}>{shipment.shipmentNo}</Link>
          </span>
        ) : null}
      </td>
      <td>
        <StatusChip
          tone={toneFor(record.cargoStatus)}
          label={CARGO_STATUS_LABEL[record.cargoStatus]}
          size="sm"
        />
        <span className="doclist__sub">{formatDate(record.statusDate)}</span>
        {permitted.length === 0 ? (
          <span className="xsmall muted">
            {CARGO_STATUS_LABEL[record.cargoStatus]} is a terminal cargo status — no move is permitted from
            it.
          </span>
        ) : (
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              setTarget("");
              setQtyReady("");
              setStatusOpen(true);
            }}
          >
            Change cargo status
          </button>
        )}
        <Dialog
          open={statusOpen}
          title={`Change cargo status${plan ? ` on ${plan.planningNo}` : ""}`}
          onClose={closeStatusDialog}
          footer={
            <>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void changeCargoStatus()}
                disabled={saving}
              >
                {saving ? "Saving…" : "Change cargo status"}
              </button>
              <button type="button" className="btn" onClick={closeStatusDialog}>
                Cancel
              </button>
            </>
          }
        >
          <p className="small">
            Current status {CARGO_STATUS_LABEL[record.cargoStatus]}, recorded {formatDate(record.statusDate)}.
            Only the moves the transition map permits from it are offered; anything else is refused by the
            service layer.
          </p>
          <FormRow
            label="Move to"
            htmlFor={`cargo-status-${record.id}`}
            required
            hint="The legacy Shipments Execution cargo status, all ten values, in operational order."
          >
            <SelectInput
              id={`cargo-status-${record.id}`}
              value={target}
              onChange={setTarget}
              required
              options={permitted.map((s) => ({ value: s, label: CARGO_STATUS_LABEL[s] }))}
            />
          </FormRow>
          <FormRow
            label="Quantity ready (MT)"
            htmlFor={`cargo-qty-${record.id}`}
            hint={`Optional. Left blank, the recorded ${formatMt(record.qtyReadyMt)} stands.`}
          >
            <TextInput
              id={`cargo-qty-${record.id}`}
              value={qtyReady}
              onChange={setQtyReady}
              inputMode="decimal"
            />
          </FormRow>
        </Dialog>
      </td>
      <td className="text-right">{formatMt(record.qtyReadyMt)}</td>
      <td>
        {processingDone ? (
          <>
            <StatusChip tone="ok" label="Confirmed" size="sm" />
            <span className="doclist__sub">
              {formatDate(record.processingConfirmedOn)}
              {record.processingConfirmedBy ? ` · ${record.processingConfirmedBy}` : ""}
            </span>
          </>
        ) : (
          <StatusChip tone="warn" label="Not confirmed" size="sm" />
        )}
      </td>
      <td>
        {readinessDone ? (
          <>
            <StatusChip tone="ok" label="Confirmed" size="sm" />
            <span className="doclist__sub">
              {formatDate(record.readinessConfirmedOn)}
              {record.readinessConfirmedBy ? ` · ${record.readinessConfirmedBy}` : ""}
            </span>
          </>
        ) : (
          <StatusChip tone="idle" label="Not confirmed" size="sm" />
        )}
      </td>
      <td>
        <span className="row">
          <button
            type="button"
            className="btn btn--sm"
            disabled={processingDone}
            title={processingDone ? "The processing team has already given its feedback." : undefined}
            onClick={() => void confirm("processing")}
          >
            Processing feedback
          </button>
          <button
            type="button"
            className="btn btn--sm"
            disabled={readinessDone || !processingDone}
            title={
              readinessDone
                ? "Cargo readiness has already been confirmed."
                : !processingDone
                  ? "The processing team confirms the stock is ready as a finished good before cargo readiness is confirmed (v2.0 §6.6 activity 2 then 6)."
                  : undefined
            }
            onClick={() => void confirm("readiness")}
          >
            Cargo readiness
          </button>
        </span>
        {!processingDone && !readinessDone ? (
          <span className="xsmall muted">
            Activity 2 before activity 6 is the one order the source states.
          </span>
        ) : null}
      </td>
    </tr>
  );
}

/* ================================================================== *
 * Tab 2 — the long and short position report
 * ================================================================== */

interface PositionRow extends PositionLine {
  id: string;
}

function PositionTab({ lines, loading }: { lines: PositionLine[]; loading: boolean }) {
  const rows: PositionRow[] = lines.map((l) => ({ ...l, id: `${l.commodityId}|${l.origin}` }));
  const shortLines = rows.filter((l) => l.position === "short");
  const longLines = rows.filter((l) => l.position === "long");

  const columns: Column<PositionRow>[] = [
    {
      key: "commodity",
      header: "Commodity",
      cell: (l) => commodityName(l.commodityId),
      sortValue: (l) => commodityName(l.commodityId),
    },
    {
      key: "origin",
      header: "Origin",
      cell: (l) => countryName(l.origin),
      sortValue: (l) => countryName(l.origin),
      filterOptions: [...new Set(rows.map((l) => l.origin))].map((o) => ({
        value: o,
        label: countryName(o),
      })),
      filterMatch: (l, v) => l.origin === v,
    },
    {
      key: "contracted",
      header: "Contracted",
      align: "right",
      cell: (l) => formatMt(l.contractedMt),
      sortValue: (l) => l.contractedMt,
    },
    {
      key: "allocated",
      header: "Reserved",
      align: "right",
      cell: (l) => formatMt(l.allocatedMt),
      sortValue: (l) => l.allocatedMt,
    },
    {
      key: "ready",
      header: "Ready",
      align: "right",
      cell: (l) => formatMt(l.readyMt),
      sortValue: (l) => l.readyMt,
    },
    {
      key: "underProcess",
      header: "Under process",
      align: "right",
      cell: (l) => formatMt(l.underProcessMt),
      sortValue: (l) => l.underProcessMt,
      optional: true,
    },
    {
      key: "positionMt",
      header: "Position",
      align: "right",
      cell: (l) => <strong>{formatMt(l.positionMt)}</strong>,
      sortValue: (l) => l.positionMt,
    },
    {
      key: "flag",
      header: "Long or short",
      cell: (l) => (
        <StatusChip
          tone={l.position === "short" ? "warn" : "ok"}
          label={l.position === "short" ? "Short" : "Long"}
          size="sm"
        />
      ),
      sortValue: (l) => l.position,
      filterOptions: [
        { value: "short", label: "Short" },
        { value: "long", label: "Long" },
      ],
      filterMatch: (l, v) => l.position === v,
    },
    {
      key: "action",
      header: "Action",
      cell: (l) =>
        l.position === "short" ? (
          <>
            <Link to="/sourcing">Sourcing action</Link>
            <span className="doclist__sub">
              {formatMt(Math.abs(l.positionMt))} to be purchased through the season sourcing process (v2.0
              §6.6 exception 1).
            </span>
          </>
        ) : (
          <span className="muted">None</span>
        ),
    },
  ];

  return (
    <>
      <h2 className="page__title">Long and short position</h2>
      <p className="page__intro">
        Output 2 of Phase 06: a long and short position report reflecting the allocation [AS-IS]. The same
        report is input 1 of Phase 01, where the trader reads it before costing an opportunity. Both screens
        call the same function — <code>positionReport</code> in <code>domain/sourcing.ts</code> — over the
        same contracts and the same lots, so the trader's view at{" "}
        <Link to="/origination/position">origination</Link> and this one cannot disagree. Nothing is stored.
      </p>

      <div className="grid-2">
        <SummaryCard title="Short lines" tone={shortLines.length > 0 ? "warn" : "ok"}>
          <FieldGrid
            columns={1}
            fields={[
              { label: "Lines short", value: <strong>{`${shortLines.length}`}</strong> },
              {
                label: "Total shortfall",
                value: formatMt(sum(shortLines.map((l) => Math.abs(l.positionMt)))),
                behaviour: "calculated",
              },
              { label: "Passes to", value: <Link to="/sourcing">Sourcing — season sourcing process</Link> },
            ]}
          />
        </SummaryCard>
        <SummaryCard title="Long lines" tone="ok">
          <FieldGrid
            columns={1}
            fields={[
              { label: "Lines long", value: <strong>{`${longLines.length}`}</strong> },
              {
                label: "Total long",
                value: formatMt(sum(longLines.map((l) => l.positionMt))),
                behaviour: "calculated",
              },
            ]}
          />
        </SummaryCard>
      </div>

      <Banner tone="info" title="How the position is derived">
        Position is reserved plus ready as a finished good, less the contracted quantity of open contracts, by
        commodity and origin. Stock under process is shown and not counted, because raw material cannot be
        allocated until processing is complete (v2.0 §6.6 activity 3). A negative position is short and the
        sourcing team takes action to purchase it (activity 5 and exception 1).
      </Banner>

      <DataTable
        caption="Long and short position by commodity and origin"
        rows={rows}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by commodity or origin…"
        searchValue={(l) => `${commodityName(l.commodityId)} ${countryName(l.origin)}`}
        savedViews={[
          { key: "all", label: "All lines" },
          {
            key: "short",
            label: "Short lines only",
            description: "Where no stock is available for the contract quantity. Each passes to sourcing.",
            predicate: (l) => l.position === "short",
          },
          { key: "long", label: "Long lines only", predicate: (l) => l.position === "long" },
        ]}
        emptyTitle="No position to report"
        emptyBody="No open contract and no stock lot exists for any commodity and origin pair."
      />
    </>
  );
}

/* ================================================================== *
 * Tab 3 — the weekly production plan
 * ================================================================== */

function ProductionPlanTab({
  weeks,
  loading,
  receipts,
  agreements,
}: {
  weeks: ProductionPlanWeek[];
  loading: boolean;
  receipts: IntakeReceipt[];
  agreements: PurchaseAgreement[];
}) {
  const toast = useToast();
  const checks = new Map(weeks.map((w) => [w.id, productionPlanCheck(w, receipts, agreements)]));
  const checkOf = (w: ProductionPlanWeek) => checks.get(w.id);

  async function issue(w: ProductionPlanWeek) {
    const res = await api.issueProductionPlanWeek(w.id);
    if (!res.ok) {
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `Production plan week beginning ${formatDate(w.weekStarting)} issued.`);
  }

  const columns: Column<ProductionPlanWeek>[] = [
    {
      key: "week",
      header: "Week starting",
      cell: (w) => formatDate(w.weekStarting),
      sortValue: (w) => w.weekStarting,
    },
    {
      key: "facility",
      header: "Facility",
      cell: (w) => w.facility,
      sortValue: (w) => w.facility,
      filterOptions: [...new Set(weeks.map((w) => w.facility))].map((f) => ({ value: f, label: f })),
      filterMatch: (w, v) => w.facility === v,
    },
    {
      key: "commodity",
      header: "Commodity",
      cell: (w) => commodityName(w.commodityId),
      sortValue: (w) => commodityName(w.commodityId),
    },
    {
      key: "received",
      header: "Received raw",
      align: "right",
      cell: (w) => formatMt(w.receivedRawMt),
      sortValue: (w) => w.receivedRawMt,
    },
    {
      key: "derived",
      header: "Derived from receipts",
      align: "right",
      cell: (w) => {
        const c = checkOf(w);
        if (!c) return <span className="muted">–</span>;
        return (
          <>
            {formatMt(c.derivedReceivedMt)}
            <span className="doclist__sub">
              <StatusChip
                tone={c.agrees ? "ok" : "risk"}
                label={c.agrees ? "Agrees with the stored figure" : "Disagrees with the stored figure"}
                size="sm"
              />
            </span>
          </>
        );
      },
      sortValue: (w) => checkOf(w)?.derivedReceivedMt ?? 0,
    },
    {
      key: "excluded",
      header: "Receipts excluded",
      align: "right",
      cell: (w) => {
        const c = checkOf(w);
        if (!c) return <span className="muted">–</span>;
        return (
          <>
            {`${c.excludedUnpriced}`}
            {c.excludedUnpriced > 0 ? (
              <span className="doclist__sub">unpriced or awaiting review, so not counted</span>
            ) : null}
          </>
        );
      },
      sortValue: (w) => checkOf(w)?.excludedUnpriced ?? 0,
    },
    {
      key: "planned",
      header: "Planned output",
      align: "right",
      cell: (w) => formatMt(w.plannedOutputMt),
      sortValue: (w) => w.plannedOutputMt,
    },
    {
      key: "actual",
      header: "Actual output",
      align: "right",
      cell: (w) =>
        w.actualOutputMt === undefined ? <span className="muted">–</span> : formatMt(w.actualOutputMt),
      sortValue: (w) => w.actualOutputMt ?? 0,
    },
    {
      key: "status",
      header: "Status",
      cell: (w) => <StatusChip tone={toneFor(w.status)} label={humanise(w.status)} size="sm" />,
      sortValue: (w) => w.status,
      filterOptions: [...new Set(weeks.map((w) => w.status))].map((s) => ({ value: s, label: humanise(s) })),
      filterMatch: (w, v) => w.status === v,
    },
    {
      key: "note",
      header: "Note",
      cell: (w) => <span className="small muted">{w.note ?? "–"}</span>,
      sortValue: (w) => w.note ?? "",
      optional: true,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (w) =>
        w.status === "draft" ? (
          <button type="button" className="btn btn--sm" onClick={() => void issue(w)}>
            Issue
          </button>
        ) : (
          <span className="muted small">Issued</span>
        ),
    },
  ];

  return (
    <>
      <h2 className="page__title">Weekly production plan</h2>
      <p className="page__intro">
        Input 4 of Phase 06. The plan is what turns raw material into the finished goods a contract can draw
        on, so what it may count is a firm rule rather than a preference.
      </p>

      <Banner tone="info" title="Register C-24 — the firm rule">
        “The weekly production plan is built on raw materials actually received at facilities; planned but
        unreceived quantities are excluded.” The received figure on every week below is therefore recomputed
        from confirmed intake receipts at that facility, for that commodity, inside that week, and the stored
        figure is shown beside it. Receipts that are unpriced or still awaiting review are counted as excluded
        and named as such. The actual receipts are captured at{" "}
        <Link to="/sourcing/intake">sourcing intake</Link>.
      </Banner>

      <DataTable
        caption="Weekly production plan"
        rows={weeks}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by facility or commodity…"
        searchValue={(w) => `${w.facility} ${commodityName(w.commodityId)} ${w.weekStarting}`}
        savedViews={[
          { key: "all", label: "All weeks" },
          { key: "draft", label: "Draft, not yet issued", predicate: (w) => w.status === "draft" },
          { key: "issued", label: "Issued", predicate: (w) => w.status === "issued" },
          {
            key: "disagreeing",
            label: "Stored figure disagrees with the receipts",
            description:
              "The stored received quantity does not match what confirmed intake receipts support for that facility, commodity and week.",
            predicate: (w) => checks.get(w.id)?.agrees === false,
          },
        ]}
        emptyTitle="No production plan week held"
        emptyBody="Nothing has been planned at any facility in this data set."
      />

      <p className="small muted" style={{ marginTop: "0.5rem" }}>
        Issuing a week is refused where nothing has actually been received, which is the same rule stated the
        other way round. The batch coding structure for raw and finished goods is outstanding master data owed
        by Siedahmed (v2.0 §14.1), so no batch is generated here.
      </p>
    </>
  );
}

/* ================================================================== *
 * Tab 4 — the warehouse capacity exception
 * ================================================================== */

function WarehouseRequestsTab({ requests, loading }: { requests: WarehouseRequest[]; loading: boolean }) {
  const toast = useToast();
  const [pending, setPending] = useState<{ request: WarehouseRequest; to: WarehouseRequestState } | null>(
    null,
  );
  const [recommendation, setRecommendation] = useState("");
  const [erpReference, setErpReference] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function closeDialog() {
    setPending(null);
    setRecommendation("");
    setErpReference("");
    setErrors({});
  }

  async function advance(
    request: WarehouseRequest,
    to: WarehouseRequestState,
    opts: { recommendation?: string; erpReference?: string } = {},
  ) {
    const res = await api.advanceWarehouseRequest(request.id, to, opts);
    if (!res.ok) {
      toast.push("risk", res.reason);
      return false;
    }
    toast.push("ok", `${request.requestNo} moved to “${humanise(to)}”.`);
    return true;
  }

  function start(request: WarehouseRequest, to: WarehouseRequestState) {
    if (to === "quality_released" || to === "created_in_erp") {
      setErrors({});
      setRecommendation(request.qualityRecommendation ?? "");
      setErpReference("");
      setPending({ request, to });
      return;
    }
    void advance(request, to);
  }

  async function submitDialog() {
    if (!pending) return;
    const next: Record<string, string> = {};
    if (pending.to === "quality_released" && !recommendation.trim()) {
      next["wr-recommendation"] =
        "Enter the recommendation. Quality reports its visit and recommendations before it releases.";
    }
    if (pending.to === "created_in_erp" && !erpReference.trim()) {
      next["wr-erp"] = "Enter the ERP reference. Compliance creates the warehouse in the ERP.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const ok = await advance(pending.request, pending.to, {
      recommendation: recommendation.trim() || undefined,
      erpReference: erpReference.trim() || undefined,
    });
    if (ok) closeDialog();
  }

  const columns: Column<WarehouseRequest>[] = [
    {
      key: "requestNo",
      header: "Request",
      cell: (r) => <span className="mono">{r.requestNo}</span>,
      sortValue: (r) => r.requestNo,
    },
    {
      key: "raisedBy",
      header: "Raised by",
      cell: (r) => ROLE_LABEL[r.raisedBy],
      sortValue: (r) => ROLE_LABEL[r.raisedBy],
      filterOptions: [...new Set(requests.map((r) => r.raisedBy))].map((role) => ({
        value: role,
        label: ROLE_LABEL[role],
      })),
      filterMatch: (r, v) => r.raisedBy === v,
    },
    {
      key: "raisedOn",
      header: "Raised on",
      cell: (r) => formatDate(r.raisedOn),
      sortValue: (r) => r.raisedOn,
    },
    {
      key: "country",
      header: "Country",
      cell: (r) => countryName(r.country),
      sortValue: (r) => countryName(r.country),
      filterOptions: [...new Set(requests.map((r) => r.country))].map((c) => ({
        value: c,
        label: countryName(c),
      })),
      filterMatch: (r, v) => r.country === v,
    },
    { key: "location", header: "Location", cell: (r) => r.location, sortValue: (r) => r.location },
    {
      key: "capacity",
      header: "Required capacity",
      align: "right",
      cell: (r) => formatMt(r.requiredCapacityMt),
      sortValue: (r) => r.requiredCapacityMt,
    },
    {
      key: "state",
      header: "State",
      cell: (r) => <StatusChip tone={toneFor(r.state)} label={humanise(r.state)} size="sm" />,
      sortValue: (r) => r.state,
      filterOptions: [...new Set(requests.map((r) => r.state))].map((s) => ({
        value: s,
        label: humanise(s),
      })),
      filterMatch: (r, v) => r.state === v,
    },
    {
      key: "handledBy",
      header: "Handled by",
      cell: (r) => ROLE_LABEL[r.handledBy],
      sortValue: (r) => ROLE_LABEL[r.handledBy],
      optional: true,
    },
  ];

  return (
    <>
      <h2 className="page__title">Warehouse requests</h2>
      <p className="page__intro">
        Exception 3 of Phase 06: where warehouse capacity is insufficient a new warehouse request is raised.
        v2.0 §6.6 gives the path and the actors in one sentence, and this screen follows it exactly —
        commercial or execution raises it, Logistics handles it in Sudan and Execution regionally, Quality
        reports its visit and recommendations and releases, Execution approves, Compliance creates it in the
        ERP.
      </p>

      <Banner tone="info" title="Who handles the request depends on the country">
        Logistics handles the request in Sudan; Execution handles it regionally. The handling role is held on
        each request and is shown, not inferred from the country.
      </Banner>

      <DataTable
        caption="Warehouse requests"
        rows={requests}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by request number or location…"
        searchValue={(r) => `${r.requestNo} ${r.location} ${countryName(r.country)}`}
        savedViews={[
          { key: "all", label: "All requests" },
          {
            key: "open",
            label: "In progress",
            description: "Raised and not yet created in the ERP or rejected.",
            predicate: (r) => r.state !== "created_in_erp" && r.state !== "rejected",
          },
          { key: "erp", label: "Created in the ERP", predicate: (r) => r.state === "created_in_erp" },
          { key: "rejected", label: "Rejected", predicate: (r) => r.state === "rejected" },
        ]}
        emptyTitle="No warehouse request raised"
        emptyBody="Capacity is sufficient, or no shortfall has been reported. v2.0 §6.6 names warehouse capacity as an input to the phase and the request as its exception."
      />

      <div className="stack">
        {requests.map((r) => {
          const allowed = nextStates(WAREHOUSE_REQUEST_TRANSITIONS, r.state);
          return (
            <CollapsibleSection
              key={r.id}
              title={`${r.requestNo} — ${r.location} — ${formatMt(r.requiredCapacityMt)}`}
              defaultOpen={requests.length === 1}
              indicator={<StatusChip tone={toneFor(r.state)} label={humanise(r.state)} size="sm" />}
            >
              <FieldGrid
                fields={[
                  { label: "Request number", value: r.requestNo, behaviour: "readonly" },
                  { label: "Raised by", value: `${ROLE_LABEL[r.raisedBy]} — ${formatDate(r.raisedOn)}` },
                  { label: "Country", value: countryName(r.country) },
                  { label: "Location", value: r.location },
                  { label: "Required capacity", value: formatMt(r.requiredCapacityMt) },
                  {
                    label: "Handled by",
                    value: ROLE_LABEL[r.handledBy],
                    hint: "Logistics in Sudan, Execution regionally",
                  },
                  { label: "Quality visit", value: formatDate(r.qualityVisitDate) },
                  { label: "Quality recommendation", value: r.qualityRecommendation },
                  { label: "Quality released", value: formatDate(r.qualityReleasedOn) },
                  { label: "Execution approved", value: formatDate(r.executionApprovedOn) },
                  { label: "ERP reference", value: r.erpReference },
                  { label: "Note", value: r.note },
                ]}
              />
              {allowed.length === 0 ? (
                <Banner tone="na" title="No further step">
                  {r.state === "rejected"
                    ? "A rejected request is closed. v2.0 §6.6 does not describe what follows a rejection, so nothing is offered here."
                    : "Compliance has created the warehouse in the ERP, which is the last step the source names."}
                </Banner>
              ) : (
                <ActionBar
                  primary={allowed.map((to) => ({
                    label: WAREHOUSE_ACTION_LABEL[to],
                    tone: "primary" as const,
                    onClick: () => start(r, to),
                  }))}
                />
              )}
              <p className="xsmall muted" style={{ marginTop: "0.5rem" }}>
                Only the steps the source lists are offered, in the order it lists them. A quality release
                without a recommendation, and a creation in the ERP without its reference, are both refused.
              </p>
            </CollapsibleSection>
          );
        })}
      </div>

      <Dialog
        open={pending !== null}
        title={
          pending
            ? `${pending.request.requestNo} — ${WAREHOUSE_ACTION_LABEL[pending.to]}`
            : "Advance warehouse request"
        }
        onClose={closeDialog}
        footer={
          <>
            <button type="button" className="btn" onClick={closeDialog}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary" onClick={() => void submitDialog()}>
              Apply
            </button>
          </>
        }
      >
        {pending ? (
          <>
            <ErrorSummary
              title="The request could not be advanced"
              errors={Object.entries(errors).map(([field, message]) => ({ field, message }))}
            />
            {pending.to === "quality_released" ? (
              <FormRow
                label="Quality recommendation"
                htmlFor="wr-recommendation"
                required
                error={errors["wr-recommendation"]}
                hint="Quality reports its visit and recommendations and releases (v2.0 §6.6). The release is refused without a recommendation."
              >
                <TextArea
                  id="wr-recommendation"
                  value={recommendation}
                  onChange={setRecommendation}
                  rows={3}
                  required
                  error={errors["wr-recommendation"]}
                  hint="Quality reports its visit and recommendations and releases (v2.0 §6.6). The release is refused without a recommendation."
                />
              </FormRow>
            ) : null}
            {pending.to === "created_in_erp" ? (
              <FormRow
                label="ERP reference"
                htmlFor="wr-erp"
                required
                error={errors["wr-erp"]}
                hint="Compliance creates the warehouse in the ERP. The reference is required."
              >
                <TextInput
                  id="wr-erp"
                  value={erpReference}
                  onChange={setErpReference}
                  required
                  error={errors["wr-erp"]}
                  hint="Compliance creates the warehouse in the ERP. The reference is required."
                />
              </FormRow>
            ) : null}
            <RequiredLegend />
          </>
        ) : null}
      </Dialog>
    </>
  );
}
