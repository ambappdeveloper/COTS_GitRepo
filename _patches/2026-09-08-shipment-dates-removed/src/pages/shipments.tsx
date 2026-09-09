import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  CONTAINER_TYPES,
  commodityById,
  counterpartyName,
  defaultContainerTypeFor,
  isMasterContainerType,
  portName,
} from "../data/master";
import {
  TODAY,
  chargeTotals,
  daysRemaining,
  demurrageEstimate,
  documentCompleteness,
  exportContractExpiryRisk,
  formatDate,
  formatMoney,
  formatMt,
  formatNumber,
  freeDayExposure,
  quantityBalance,
  shipmentProgress,
} from "../domain/calc";
import { resolveMilestones, resolveShipmentStepper, variantContextOf } from "../domain/milestones";
import { SHIPMENT_TRANSITIONS, humanise, nextStates, toneFor } from "../domain/status";
import {
  CHARGE_TYPE_LABEL,
  ROLE_LABEL,
  SHIPMENT_DOCUMENT_LABEL,
  SHIPMENT_STATUS_LABEL,
  SHIPMENT_TYPE_LABEL,
  type Shipment,
  type ShipmentStatus,
  type ShipmentType,
} from "../domain/types";
import { COUNTRY_ORDER, COUNTRY_PROFILES } from "../domain/variants";
import { api } from "../services/store";
import { Banner, Dialog, EmptyState, ErrorState, StatusChip, useToast } from "../components/feedback";
import {
  ActionBar,
  CollapsibleSection,
  FieldGrid,
  PageHeader,
  QuantityDonut,
  RecordTabs,
  RouteVisual,
  SummaryCard,
  TotalBanner,
} from "../components/layout";
import { ExecutionFlow, LifecycleStepper } from "../components/status-flow";
import { DataTable, type Column } from "../components/table";
import { ErrorSummary, FormRow, RequiredLegend, SelectInput, TextInput } from "../components/form";
import { AuditList } from "./contracts";
import { useAsync } from "./hooks";

/* ================================================================== *
 * Shipment list
 * ================================================================== */

export function ShipmentList() {
  const shipments = useAsync(() => api.listShipments());
  const contracts = useAsync(() => api.listContracts());

  if (shipments.error) {
    return (
      <div className="page">
        <ErrorState detail={shipments.error} onRetry={shipments.reload} />
      </div>
    );
  }

  const rows = shipments.data ?? [];
  const cts = contracts.data ?? [];
  const contractNo = (id: string) => cts.find((c) => c.id === id)?.contractNo ?? "–";

  const columns: Column<Shipment>[] = [
    {
      key: "shipmentNo",
      header: "Shipment",
      cell: (s) => <Link to={`/shipments/${s.id}`}>{s.shipmentNo}</Link>,
      sortValue: (s) => s.shipmentNo,
    },
    {
      key: "contract",
      header: "Contract",
      cell: (s) => <Link to={`/contracts/${s.contractId}`}>{contractNo(s.contractId)}</Link>,
      sortValue: (s) => contractNo(s.contractId),
    },
    {
      key: "country",
      header: "Country",
      cell: (s) => COUNTRY_PROFILES[s.country].name,
      sortValue: (s) => COUNTRY_PROFILES[s.country].name,
      filterOptions: COUNTRY_ORDER.map((c) => ({ value: c, label: COUNTRY_PROFILES[c].name })),
      filterMatch: (s, v) => s.country === v,
    },
    {
      key: "type",
      header: "Type",
      cell: (s) => SHIPMENT_TYPE_LABEL[s.shipmentType],
      sortValue: (s) => s.shipmentType,
      filterOptions: (["container", "bulk", "break_bulk", "road", "air"] as ShipmentType[]).map((t) => ({
        value: t,
        label: SHIPMENT_TYPE_LABEL[t],
      })),
      filterMatch: (s, v) => s.shipmentType === v,
    },
    {
      key: "status",
      header: "Status",
      cell: (s) => <StatusChip tone={toneFor(s.status)} label={SHIPMENT_STATUS_LABEL[s.status]} size="sm" />,
      sortValue: (s) => s.status,
      filterOptions: (Object.keys(SHIPMENT_STATUS_LABEL) as ShipmentStatus[]).map((s) => ({
        value: s,
        label: SHIPMENT_STATUS_LABEL[s],
      })),
      filterMatch: (s, v) => s.status === v,
    },
    {
      key: "qty",
      header: "Quantity",
      align: "right",
      cell: (s) => formatMt(s.quantityMt),
      sortValue: (s) => s.quantityMt,
    },
    {
      key: "route",
      header: "Route",
      cell: (s) => `${portName(s.portOfLoadingId)} → ${portName(s.portOfDischargeId)}`,
      sortValue: (s) => portName(s.portOfDischargeId),
    },
    {
      key: "progress",
      header: "Progress",
      align: "right",
      cell: (s) => `${Math.round(shipmentProgress(s) * 100)}%`,
      sortValue: (s) => shipmentProgress(s),
    },
    {
      key: "docs",
      header: "Documents",
      cell: (s) => {
        const c = documentCompleteness(s.documents);
        return c.required === 0 ? <span className="muted">–</span> : `${c.atOriginal}/${c.required}`;
      },
      sortValue: (s) => documentCompleteness(s.documents).fraction,
    },
    {
      key: "risks",
      header: "Risks",
      cell: (s) => {
        const open = s.risks.filter((r) => !r.acknowledged);
        return open.length === 0 ? (
          <span className="muted">–</span>
        ) : (
          <StatusChip
            tone={open.some((r) => r.severity === "high") ? "risk" : "warn"}
            label={`${open.length}`}
            size="sm"
          />
        );
      },
      sortValue: (s) => s.risks.filter((r) => !r.acknowledged).length,
    },
    {
      key: "owner",
      header: "Owner",
      cell: (s) => s.assignedTo,
      sortValue: (s) => s.assignedTo,
      optional: true,
    },
    {
      key: "lastShip",
      header: "Last shipping date",
      cell: (s) => formatDate(s.lastShippingDate),
      sortValue: (s) => s.lastShippingDate ?? "",
      optional: true,
    },
    {
      key: "booking",
      header: "Booking",
      cell: (s) => s.booking.bookingNo ?? "–",
      sortValue: (s) => s.booking.bookingNo ?? "",
      optional: true,
    },
    {
      key: "vessel",
      header: "Vessel",
      cell: (s) => s.booking.vesselName ?? "–",
      sortValue: (s) => s.booking.vesselName ?? "",
      optional: true,
    },
    {
      key: "lv",
      header: "LV",
      cell: (s) =>
        s.isLargeVolume ? (
          <StatusChip tone="accent" label="LV" size="sm" />
        ) : (
          <span className="muted">–</span>
        ),
      sortValue: (s) => (s.isLargeVolume ? 1 : 0),
      optional: true,
    },
  ];

  return (
    <>
      <PageHeader
        moduleLabel="Contract to cargo"
        crumbs={[{ label: "Home", to: "/" }, { label: "Shipments & execution" }]}
        title="Shipments & execution"
        meta="Execution planning, cargo readiness, freight offers, booking and shipping instruction"
        recordKey={`${rows.length}`}
        recordDate="shipments"
        actions={<ActionBar primary={[{ label: "New shipment", to: "/shipments/new" }]} />}
      />
      <div className="page">
        <DataTable
          caption="Shipments"
          rows={rows}
          columns={columns}
          loading={shipments.loading}
          searchPlaceholder="Search by shipment or contract number, vessel or booking…"
          searchValue={(s) =>
            `${s.shipmentNo} ${contractNo(s.contractId)} ${s.booking.vesselName ?? ""} ${s.booking.bookingNo ?? ""}`
          }
          rowHref={(s) => `/shipments/${s.id}`}
          savedViews={[
            {
              key: "open",
              label: "Open shipments",
              description: "Everything not closed or cancelled.",
              predicate: (s) => s.status !== "closed" && s.status !== "cancelled",
            },
            { key: "all", label: "All shipments" },
            {
              key: "blocked",
              label: "Blocked or at risk",
              description: "Shipments with a blocked or overdue milestone, or an open risk.",
              predicate: (s) =>
                s.milestones.some((m) => m.state === "blocked" || m.state === "overdue") ||
                s.risks.some((r) => !r.acknowledged),
            },
            {
              key: "awaiting_docs",
              label: "Awaiting documents",
              description: "Required documents not yet at original.",
              predicate: (s) => {
                const c = documentCompleteness(s.documents);
                return c.required > 0 && c.fraction < 1;
              },
            },
            {
              key: "variants",
              label: "Non-container variants",
              description: "Bulk, break-bulk, road and air shipments.",
              predicate: (s) => s.shipmentType !== "container",
              columns: ["shipmentNo", "contract", "country", "type", "status", "qty", "vessel", "booking"],
            },
          ]}
        />
      </div>
    </>
  );
}

/* ================================================================== *
 * Shipment detail — the primary workspace
 * ================================================================== */

const SHIPMENT_TABS = [
  "summary",
  "flow",
  "planning",
  "pre-clearance",
  "booking",
  "clearance",
  "stuffing",
  "documents",
  "post-shipment",
  "risks",
  "audit",
] as const;
type ShipmentTab = (typeof SHIPMENT_TABS)[number];

const TAB_LABEL: Record<ShipmentTab, string> = {
  summary: "Summary",
  flow: "Execution flow",
  /* Was "Planning" and held the execution plan above the readiness block. The plan went on
     8 September 2026 and readiness is all that is left, so the tab is named for it. */
  planning: "Cargo readiness",
  "pre-clearance": "Pre-clearance",
  booking: "Booking & SI",
  clearance: "Clearance",
  stuffing: "Stuffing & loading",
  documents: "Documents",
  "post-shipment": "Post-shipment",
  risks: "Risks",
  audit: "Audit",
};

export function ShipmentDetail() {
  const { id = "", tab } = useParams();
  const activeTab = (tab ?? "summary") as ShipmentTab;
  const toast = useToast();

  const shipment = useAsync(() => api.getShipment(id), [id]);
  const shipments = useAsync(() => api.listShipments());
  const contracts = useAsync(() => api.listContracts());
  const cargo = useAsync(() => api.listCargoReadiness());
  const exportContracts = useAsync(() => api.listExportContracts());
  const vessels = useAsync(() => api.listVesselCalls());
  const transports = useAsync(() => api.listTransportRequests());

  const [statusOpen, setStatusOpen] = useState(false);
  const [pending, setPending] = useState<ShipmentStatus | "">("");

  if (shipment.error) {
    return (
      <div className="page">
        <ErrorState detail={shipment.error} onRetry={shipment.reload} />
      </div>
    );
  }
  if (shipment.loading) {
    return (
      <div className="page">
        <div className="card card__body muted">Loading shipment…</div>
      </div>
    );
  }
  const s = shipment.data;
  if (!s) {
    return (
      <div className="page">
        <EmptyState
          title="Shipment not found"
          action={
            <Link className="btn btn--primary" to="/shipments">
              Back to shipments
            </Link>
          }
        >
          No shipment exists with the id <code>{id}</code>.
        </EmptyState>
      </div>
    );
  }

  const contract = (contracts.data ?? []).find((c) => c.id === s.contractId);
  const readiness = (cargo.data ?? []).find((cr) => cr.shipmentId === s.id);
  const exportContract = (exportContracts.data ?? []).find((e) => e.id === s.exportContractId);
  const vessel = (vessels.data ?? []).find((v) => v.id === s.vesselCallId);
  const linkedTransport = (transports.data ?? []).filter((t) => t.shipmentId === s.id);
  const profile = COUNTRY_PROFILES[s.country];
  const commodity = contract ? commodityById(contract.commodityId) : undefined;

  const siblingShipments = (shipments.data ?? []).filter(
    (x) => x.contractId === s.contractId && x.status !== "cancelled",
  );
  const contractCommittedMt = siblingShipments.reduce((a, x) => a + x.quantityMt, 0);

  const resolved = resolveMilestones(s.milestones, variantContextOf(s, profile), TODAY, s.documents);
  const steps = resolveShipmentStepper(resolved);
  const completeness = documentCompleteness(s.documents);
  const allowed = nextStates(SHIPMENT_TRANSITIONS, s.status);

  const expiryRisk = exportContract
    ? exportContractExpiryRisk(exportContract, s.lastShippingDate)
    : { level: "none" as const };
  const freeDays = freeDayExposure({
    containersReceivedDate: s.stuffing.receivingDate,
    freeDays: contract?.freeDaysAtPort ?? 0,
    returnedToPortDate: s.milestones.find((m) => m.key === "delivered_to_port")?.actualDate,
  });
  const demurrage = vessel ? demurrageEstimate(vessel) : undefined;

  const tabs = SHIPMENT_TABS.map((t) => ({
    key: t,
    label: TAB_LABEL[t],
    to: t === "summary" ? `/shipments/${s.id}` : `/shipments/${s.id}/${t}`,
    badge:
      t === "risks" && s.risks.filter((r) => !r.acknowledged).length > 0
        ? s.risks.filter((r) => !r.acknowledged).length
        : t === "documents" && completeness.outstanding.length > 0
          ? completeness.outstanding.length
          : undefined,
  }));

  const openRisks = s.risks.filter((r) => !r.acknowledged);

  return (
    <>
      <PageHeader
        moduleLabel="Shipments & execution"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Shipments", to: "/shipments" },
          { label: s.shipmentNo },
        ]}
        title={contract ? counterpartyName(contract.buyerId) : s.shipmentNo}
        statusChip={<StatusChip tone={toneFor(s.status)} label={SHIPMENT_STATUS_LABEL[s.status]} />}
        meta={
          <>
            {s.shipmentNo} · {commodity?.name ?? "–"} · {formatMt(s.quantityMt)} ·{" "}
            {SHIPMENT_TYPE_LABEL[s.shipmentType]} · {profile.name} → {portName(s.portOfDischargeId)}
            {s.usesFreightForwarder ? " · forwarder-handled" : ""}
            {s.isLargeVolume ? " · large volume" : ""}
          </>
        }
        recordKey={s.shipmentNo}
        recordDate={formatDate(s.createdDate)}
        actions={
          <ActionBar
            primary={[
              { label: "Edit shipment", to: `/shipments/${s.id}/edit` },
              {
                label: "Change status",
                onClick: () => setStatusOpen(true),
                disabled: allowed.length === 0,
                disabledReason: `"${SHIPMENT_STATUS_LABEL[s.status]}" is a terminal state.`,
              },
            ]}
            more={[
              { label: "Open execution flow", to: `/shipments/${s.id}/flow` },
              { label: "Open clearance workspace", to: `/clearance/${s.id}` },
              { label: "Open movement & stuffing request (phase 10)", to: "/movement" },
              { label: "Open stuffing tracker", to: `/stuffing/${s.id}` },
              { label: "Open document workspace", to: `/documents/${s.id}` },
              { label: "Open post-shipment & bank", to: `/post-shipment/${s.id}` },
              { label: "View audit history", to: `/shipments/${s.id}/audit` },
            ]}
          />
        }
        tabs={<RecordTabs tabs={tabs} />}
      />

      <div className="page">
        {openRisks.length > 0 && activeTab !== "risks" ? (
          <Banner
            tone={openRisks.some((r) => r.severity === "high") ? "risk" : "warn"}
            title={`${openRisks.length} open risk${openRisks.length === 1 ? "" : "s"} on this shipment`}
            action={
              <Link className="btn btn--sm" to={`/shipments/${s.id}/risks`}>
                Review risks
              </Link>
            }
          >
            {openRisks[0].title}
            {openRisks.length > 1 ? ` and ${openRisks.length - 1} more.` : "."}
          </Banner>
        ) : null}

        {/* ---------------- Summary ---------------- */}
        {activeTab === "summary" ? (
          <>
            <SummaryCard title="Shipment lifecycle" tone="accent">
              <LifecycleStepper steps={steps} caption={`Shipment lifecycle for ${s.shipmentNo}`} />
              <p className="small muted" style={{ marginTop: "0.5rem" }}>
                Each step rolls up the underlying execution-flow milestones, so the compact stepper and the
                expanded flow can never disagree.{" "}
                <Link to={`/shipments/${s.id}/flow`}>Open the expanded execution flow</Link>.
              </p>
            </SummaryCard>

            <SummaryCard title="Route & movement">
              <RouteVisual
                ariaLabel={`Route for ${s.shipmentNo}`}
                leftCaption={{
                  label: "Shipment period",
                  value: contract
                    ? `${formatDate(contract.shipmentPeriodStart)} – ${formatDate(contract.shipmentPeriodEnd)}`
                    : "–",
                }}
                rightCaption={{ label: "Last shipping date", value: formatDate(s.lastShippingDate) }}
                nodes={routeNodes(s, profile)}
              />
              {profile.hasInlandTransitLeg ? (
                <p className="small muted" style={{ marginTop: "0.5rem" }}>
                  {profile.name} adds an inland leg: {profile.inlandLegLabel}. A single origin → destination
                  line would hide it.
                </p>
              ) : null}
            </SummaryCard>

            <div className="grid-3">
              <SummaryCard title="Terms">
                <FieldGrid
                  columns={1}
                  fields={[
                    {
                      label: "Contract",
                      value: contract ? (
                        <Link to={`/contracts/${contract.id}`}>{contract.contractNo}</Link>
                      ) : undefined,
                      behaviour: "inherited",
                    },
                    {
                      label: "Buyer",
                      value: contract ? counterpartyName(contract.buyerId) : undefined,
                      behaviour: "inherited",
                    },
                    { label: "Incoterm", value: contract?.incoterm, behaviour: "inherited" },
                    { label: "Payment terms", value: contract?.paymentTerms, behaviour: "inherited" },
                    { label: "Assigned to", value: s.assignedTo },
                  ]}
                />
              </SummaryCard>

              <SummaryCard title="Commodity & packing">
                <FieldGrid
                  columns={1}
                  fields={[
                    { label: "Commodity", value: commodity?.name, behaviour: "inherited" },
                    { label: "Quantity", value: formatMt(s.quantityMt) },
                    { label: "Bags / bales", value: formatNumber(s.bagsOrBales) },
                    { label: "Unit size", value: s.bagSizeKg ? `${s.bagSizeKg} kg` : undefined },
                    {
                      label: "Containers",
                      value: s.containerCount ? `${s.containerCount} × ${s.containerType ?? ""}` : undefined,
                    },
                    {
                      label: "Fumigation",
                      value: contract ? humanise(contract.fumigationType) : undefined,
                      behaviour: "inherited",
                    },
                  ]}
                />
              </SummaryCard>

              <SummaryCard title="Document completeness" tone={completeness.fraction === 1 ? "ok" : "warn"}>
                <QuantityDonut
                  fraction={completeness.fraction}
                  valueLabel={`${completeness.atOriginal}/${completeness.required}`}
                  ofLabel="required documents"
                  caption="at original state"
                  tone={completeness.fraction === 1 ? "ok" : "warn"}
                />
                {completeness.outstanding.length > 0 ? (
                  <p className="small">
                    Outstanding: {completeness.outstanding.map((k) => SHIPMENT_DOCUMENT_LABEL[k]).join(", ")}
                  </p>
                ) : (
                  <p className="small" style={{ color: "var(--c-ok-700)" }}>
                    Every required document is at original.
                  </p>
                )}
                <p style={{ marginTop: "0.5rem" }}>
                  <Link className="btn btn--sm" to={`/shipments/${s.id}/documents`}>
                    Open document checklist
                  </Link>
                </p>
              </SummaryCard>
            </div>

            {contract ? (
              <TotalBanner
                label={`Contract quantity remaining on ${contract.contractNo}`}
                value={formatMt(quantityBalance(contract, { shippedMt: contractCommittedMt }).remainingMt)}
                derivation={`contracted ${formatMt(contract.quantityMt)} − committed across ${siblingShipments.length} shipment(s) ${formatMt(contractCommittedMt)}, of which this one is ${formatMt(s.quantityMt)}`}
              />
            ) : null}

            <div className="grid-2">
              <SummaryCard title="Current risks" tone={openRisks.length > 0 ? "risk" : "ok"}>
                {openRisks.length === 0 ? (
                  <EmptyState title="No open risks" glyph="✓">
                    Nothing outside its target dates or prerequisites.
                  </EmptyState>
                ) : (
                  <ul className="kvbars">
                    {openRisks.map((r) => (
                      <li key={r.id} style={{ gridTemplateColumns: "6rem 1fr" }}>
                        <StatusChip
                          tone={r.severity === "high" ? "risk" : r.severity === "medium" ? "warn" : "info"}
                          label={r.severity}
                          size="sm"
                        />
                        <span>
                          <strong className="small">{r.title}</strong>
                          <br />
                          <span className="xsmall muted">
                            {ROLE_LABEL[r.owner]}
                            {r.dueDate ? ` · due ${formatDate(r.dueDate)}` : ""}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </SummaryCard>

              <SummaryCard title="Operational exposure">
                <FieldGrid
                  columns={1}
                  fields={[
                    {
                      label: "Export contract validity",
                      value:
                        expiryRisk.level === "none"
                          ? exportContract?.expiryDate
                            ? `Valid to ${formatDate(exportContract.expiryDate)}`
                            : "Not applicable in this country"
                          : expiryRisk.message,
                      behaviour: "calculated",
                    },
                    {
                      label: "Free days at port",
                      value:
                        freeDays.level === "none"
                          ? freeDays.daysLeft !== undefined
                            ? `${freeDays.daysLeft} of ${contract?.freeDaysAtPort ?? 0} remaining`
                            : "Containers not yet received"
                          : freeDays.message,
                      behaviour: "calculated",
                    },
                    {
                      label: "Demurrage",
                      value: demurrage
                        ? demurrage.overDays
                          ? `${demurrage.overDays} day(s) over laytime — ${formatMoney(demurrage.estimate)}`
                          : `${demurrage.timeAlongsideDays ?? "–"} day(s) alongside, within laytime`
                        : "No vessel call linked",
                      behaviour: "calculated",
                    },
                    {
                      label: "Shipment period",
                      value: contract
                        ? (() => {
                            const left = daysRemaining(contract.shipmentPeriodEnd);
                            if (left === undefined) return undefined;
                            return left < 0
                              ? `Ended ${Math.abs(left)} day(s) ago`
                              : `${left} day(s) remaining`;
                          })()
                        : undefined,
                      behaviour: "calculated",
                    },
                  ]}
                />
              </SummaryCard>
            </div>
          </>
        ) : null}

        {/* ---------------- Execution flow ---------------- */}
        {activeTab === "flow" ? (
          <>
            <h2 className="page__title">Expanded execution flow</h2>
            <p className="page__intro">
              The full COTS sequence from trade/contract initiation to close-out, grouped into phase bands.
              Milestones that do not apply to this shipment's country or shipment type are marked{" "}
              <em>Not applicable</em> rather than left looking pending. Select any milestone to see its owner,
              dates, prerequisites and document readiness.
            </p>
            <ExecutionFlow
              milestones={resolved}
              shipmentId={s.id}
              variantSummary={variantSummary(s, profile)}
            />
          </>
        ) : null}

        {/* ---------------- Planning ---------------- */}
        {activeTab === "planning" ? (
          <>
            <CollapsibleSection title="Cargo readiness & stock allocation">
              {readiness ? (
                <>
                  <FieldGrid
                    fields={[
                      {
                        label: "Cargo status",
                        value: (
                          <StatusChip
                            tone={toneFor(readiness.cargoStatus)}
                            label={humanise(readiness.cargoStatus)}
                            size="sm"
                          />
                        ),
                      },
                      { label: "Status date", value: formatDate(readiness.statusDate) },
                      { label: "Quantity ready", value: formatMt(readiness.qtyReadyMt) },
                      {
                        label: "Remaining to ready",
                        /* Was the execution plan's planned quantity; the shipment's own
                           quantity is the basis since planning was removed. */
                        value: formatMt(Math.max(0, s.quantityMt - readiness.qtyReadyMt)),
                        behaviour: "calculated",
                      },
                      ...(readiness.transitStatus
                        ? [{ label: "Cargo transit status", value: humanise(readiness.transitStatus) }]
                        : []),
                      ...(readiness.arrivalStatus
                        ? [{ label: "Cargo arrival status", value: humanise(readiness.arrivalStatus) }]
                        : []),
                      ...(readiness.loadedQtyMt !== undefined
                        ? [{ label: "Loaded quantity", value: formatMt(readiness.loadedQtyMt) }]
                        : []),
                      ...(readiness.arrivedQtyMt !== undefined
                        ? [{ label: "Arrived quantity", value: formatMt(readiness.arrivedQtyMt) }]
                        : []),
                    ]}
                  />
                  {profile.hasInlandTransitLeg ? (
                    <Banner tone="info" title="Inland transit tracking is active here">
                      In the legacy Chad list these five loading and arrival fields exist as columns with no
                      form controls and carry no data — the tracking that is the reason the Chad sub-site
                      exists separately (decision D8). They are first-class fields here.
                    </Banner>
                  ) : null}
                  <table className="dash__table" style={{ marginTop: "0.75rem" }}>
                    <caption className="sr-only">Stock allocations</caption>
                    <thead>
                      <tr>
                        <th scope="col">Lot</th>
                        <th scope="col">Facility</th>
                        <th scope="col">Grade</th>
                        <th scope="col" className="text-right">
                          Quantity
                        </th>
                        <th scope="col">State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readiness.allocations.map((a) => (
                        <tr key={a.lotRef}>
                          <td className="mono small">{a.lotRef}</td>
                          <td>{a.facility}</td>
                          <td>{a.grade}</td>
                          <td className="text-right">{formatMt(a.quantityMt)}</td>
                          <td>
                            <StatusChip
                              tone={a.state === "released" ? "ok" : a.state === "reserved" ? "info" : "warn"}
                              label={humanise(a.state)}
                              size="sm"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {readiness.remarks ? (
                    <p className="small muted" style={{ marginTop: "0.5rem" }}>
                      {readiness.remarks}
                    </p>
                  ) : null}
                </>
              ) : (
                <EmptyState title="No cargo readiness record" />
              )}
            </CollapsibleSection>

            {linkedTransport.length > 0 ? (
              <CollapsibleSection title="Linked transport requests" defaultOpen={false}>
                <ul className="doclist">
                  {linkedTransport.map((t) => (
                    <li key={t.id} className="required">
                      <span className="doclist__name">
                        {t.trNo}
                        <span className="doclist__sub">
                          {t.origin} → {t.destination} · {formatMt(t.readyForTransportMt)} ready
                        </span>
                      </span>
                      <StatusChip tone={toneFor(t.status)} label={humanise(t.status)} size="sm" />
                      <span className="small">{formatDate(t.requiredStartDate)}</span>
                      <Link className="btn btn--sm" to={`/material/transport/${t.id}`}>
                        Open
                      </Link>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            ) : null}
          </>
        ) : null}

        {/* ---------------- Pre-clearance ---------------- */}
        {activeTab === "pre-clearance" ? (
          <>
            {!profile.usesExportContract &&
            !profile.usesExportPermit &&
            !profile.startsFromCommercialInvoice ? (
              <Banner tone="na" title={`Export contract does not apply in ${profile.name}`}>
                {profile.evidence[0]}
              </Banner>
            ) : null}
            {exportContract ? (
              <>
                <CollapsibleSection
                  title="Export contract"
                  indicator={
                    <StatusChip
                      tone={toneFor(exportContract.status)}
                      label={humanise(exportContract.status)}
                      size="sm"
                    />
                  }
                >
                  <FieldGrid
                    fields={[
                      { label: "Request number", value: exportContract.requestNo, behaviour: "readonly" },
                      { label: "Export contract number", value: exportContract.exportContractNo },
                      { label: "Exporting entity", value: exportContract.exportingEntity },
                      { label: "Requested quantity", value: formatMt(exportContract.requestedQuantityMt) },
                      {
                        label: "Actual quantity",
                        value:
                          exportContract.actualQuantityMt !== undefined
                            ? formatMt(exportContract.actualQuantityMt)
                            : undefined,
                      },
                      { label: "Issuance date", value: formatDate(exportContract.issuanceDate) },
                      { label: "Expiry date", value: formatDate(exportContract.expiryDate) },
                      { label: "Actual bank", value: exportContract.actualBank },
                      {
                        label: "Sent to Ministry of Trade",
                        value: formatDate(exportContract.sentToMotDate),
                        hint: "Legacy: column exists, no form control (D7)",
                      },
                      {
                        label: "Received from Ministry of Trade",
                        value: formatDate(exportContract.receivedFromMotDate),
                        hint: "Legacy: column exists, no form control (D7)",
                      },
                      {
                        label: "Sent to trade finance",
                        value: formatDate(exportContract.sentToTradeFinanceDate),
                      },
                      {
                        label: "Chamber of exporters",
                        value: formatDate(exportContract.chamberOfExportersDate),
                      },
                    ]}
                  />
                  {expiryRisk.level !== "none" ? (
                    <Banner
                      tone={expiryRisk.level === "critical" ? "risk" : "warn"}
                      title="Export contract validity risk"
                    >
                      {expiryRisk.message}
                    </Banner>
                  ) : null}
                  <p style={{ marginTop: "0.75rem" }}>
                    <Link className="btn btn--sm" to={`/pre-clearance/${exportContract.id}`}>
                      Open the export contract workspace
                    </Link>
                  </p>
                </CollapsibleSection>

                <CollapsibleSection
                  title="EX forms allocated to this shipment"
                  indicator={
                    <StatusChip
                      tone={s.allocatedExportForms.length > 0 ? "ok" : "idle"}
                      label={`${s.allocatedExportForms.length} allocated`}
                      size="sm"
                    />
                  }
                >
                  {!profile.usesExportForms ? (
                    <Banner tone="na" title={`EX forms do not apply in ${profile.name}`}>
                      Workshop notes: "Ex form is not applicable in all counties. Mainly in Sudan."
                    </Banner>
                  ) : s.allocatedExportForms.length === 0 ? (
                    <EmptyState title="No EX form allocated yet" />
                  ) : (
                    <ul className="doclist">
                      {s.allocatedExportForms.map((formNo) => {
                        const f = exportContract.exportForms.find((x) => x.formNo === formNo);
                        return (
                          <li key={formNo} className="required">
                            <span className="doclist__name">
                              {formNo}
                              <span className="doclist__sub">{f ? formatMt(f.quantityMt) : "–"}</span>
                            </span>
                            <StatusChip
                              tone={f ? toneFor(f.status) : "idle"}
                              label={f ? humanise(f.status) : "unknown"}
                              size="sm"
                            />
                            <span className="small">{f?.issuedOn ? formatDate(f.issuedOn) : "–"}</span>
                            <span className="xsmall muted">
                              {f?.declarationNo ? `Decl. ${f.declarationNo}` : ""}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <p className="small muted" style={{ marginTop: "0.5rem" }}>
                    Unbounded collection. The legacy chain stores this in 28 flattened columns with a hard
                    ceiling of seven forms per shipping instruction (decision D2).
                  </p>
                </CollapsibleSection>
              </>
            ) : (
              <div className="card">
                <EmptyState title="No export contract linked to this shipment" />
              </div>
            )}
          </>
        ) : null}

        {/* ---------------- Booking & SI ---------------- */}
        {activeTab === "booking" ? <BookingTab s={s} /> : null}

        {/* ---------------- Clearance / stuffing / documents / post-shipment: link out ---------------- */}
        {activeTab === "clearance" ? (
          <NavigateNotice
            title="Clearance workspace"
            body="Customs, SSMO, plant protection, examination and the clearance certificate are recorded in the clearance workspace."
            to={`/clearance/${s.id}`}
            cta="Open clearance workspace"
          />
        ) : null}
        {activeTab === "stuffing" ? (
          <NavigateNotice
            title="Stuffing & loading tracker"
            body="Daily progress, containers, traceability coding and vessel calls are recorded in the stuffing tracker."
            to={`/stuffing/${s.id}`}
            cta="Open stuffing tracker"
          />
        ) : null}
        {activeTab === "documents" ? (
          <NavigateNotice
            title="Document workspace"
            body="Draft / confirmed / original states, packing list and charges are recorded in the document workspace."
            to={`/documents/${s.id}`}
            cta="Open document workspace"
          />
        ) : null}
        {activeTab === "post-shipment" ? (
          <NavigateNotice
            title="Post-shipment & bank submittal"
            body="Document assembly, bank submittal, OBL dispatch and close-out are recorded in the post-shipment workspace."
            to={`/post-shipment/${s.id}`}
            cta="Open post-shipment workspace"
          />
        ) : null}

        {/* ---------------- Risks ---------------- */}
        {activeTab === "risks" ? (
          <>
            <h2 className="page__title">Risks & exceptions</h2>
            {s.risks.length === 0 ? (
              <div className="card">
                <EmptyState title="No risks recorded on this shipment" glyph="✓" />
              </div>
            ) : (
              <div className="stack">
                {s.risks.map((r) => (
                  <div
                    className={`riskrow riskrow--${r.severity === "high" ? "risk" : r.severity === "medium" ? "warn" : "info"}`}
                    key={r.id}
                  >
                    <StatusChip
                      tone={r.severity === "high" ? "risk" : r.severity === "medium" ? "warn" : "info"}
                      label={r.severity}
                      size="sm"
                    />
                    <div className="riskrow__body">
                      <p className="riskrow__title">{r.title}</p>
                      <p className="riskrow__detail small">{r.detail}</p>
                      <p className="riskrow__meta xsmall muted">
                        {humanise(r.kind)} · owner {ROLE_LABEL[r.owner]}
                        {r.dueDate ? ` · due ${formatDate(r.dueDate)}` : ""}
                        {r.acknowledged ? " · acknowledged" : ""}
                      </p>
                    </div>
                    {!r.acknowledged ? (
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={async () => {
                          const res = await api.acknowledgeRisk(r.id);
                          toast.push(res.ok ? "ok" : "risk", res.ok ? "Risk acknowledged." : res.reason);
                        }}
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <StatusChip tone="ok" label="Acknowledged" size="sm" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}

        {/* ---------------- Audit ---------------- */}
        {activeTab === "audit" ? (
          <>
            <h2 className="page__title">Audit history</h2>
            <p className="page__intro">
              Actor, role, action, field-level before/after and status transitions. The legacy chain holds
              this data on every list and surfaces none of it to operators.
            </p>
            <div className="card card__body">
              <AuditList events={s.audit} />
            </div>
          </>
        ) : null}
      </div>

      <Dialog
        open={statusOpen}
        title={`Change shipment status — ${s.shipmentNo}`}
        onClose={() => setStatusOpen(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setStatusOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!pending}
              onClick={async () => {
                if (!pending) return;
                const res = await api.setShipmentStatus(s.id, pending);
                if (res.ok) {
                  toast.push("ok", `Shipment moved to "${SHIPMENT_STATUS_LABEL[pending]}".`);
                  setStatusOpen(false);
                  setPending("");
                } else {
                  toast.push("risk", res.reason);
                }
              }}
            >
              Apply status
            </button>
          </>
        }
      >
        <p className="small muted">
          Only transitions permitted from <strong>{SHIPMENT_STATUS_LABEL[s.status]}</strong> are offered, and
          a guard runs on top: moving to <em>Cleared</em> requires every applicable regulatory activity to be
          recorded (rule R20), and moving to <em>Closed</em> requires the post-shipment checklist to be
          complete (rule R21).
        </p>
        <ul className="statuschoices">
          {allowed.map((st) => (
            <li key={st}>
              <label>
                <input
                  type="radio"
                  name="sstatus"
                  value={st}
                  checked={pending === st}
                  onChange={() => setPending(st)}
                />
                <StatusChip tone={toneFor(st)} label={SHIPMENT_STATUS_LABEL[st]} size="sm" />
              </label>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}

function NavigateNotice({ title, body, to, cta }: { title: string; body: string; to: string; cta: string }) {
  return (
    <div className="card card__body">
      <h2 className="page__title">{title}</h2>
      <p className="page__intro" style={{ marginTop: "0.5rem" }}>
        {body}
      </p>
      <p style={{ marginTop: "1rem" }}>
        <Link className="btn btn--primary" to={to}>
          {cta}
        </Link>
      </p>
    </div>
  );
}

function routeNodes(s: Shipment, profile: (typeof COUNTRY_PROFILES)[keyof typeof COUNTRY_PROFILES]) {
  const done = (key: string) => s.milestones.find((m) => m.key === key)?.state === "completed";
  const nodes = [
    {
      label: "Facility",
      sub: s.clearance.stuffingLocation ?? profile.name,
      glyph: "▤",
      reached: done("cargo_ready"),
    },
  ] as { label: string; sub?: string; glyph: string; reached: boolean }[];
  if (profile.hasInlandTransitLeg) {
    nodes.push({
      label: "Inland transit",
      sub: profile.inlandLegLabel,
      glyph: "⇥",
      reached: done("inland_transit_complete"),
    });
  }
  nodes.push(
    {
      label: "Port of loading",
      sub: portName(s.portOfLoadingId),
      glyph: "⚓",
      reached: done("delivered_to_port"),
    },
    {
      label: s.shipmentType === "road" ? "Road convoy" : s.shipmentType === "air" ? "Flight" : "Vessel",
      sub: s.booking.vesselName ?? s.booking.bookingNo,
      glyph: s.shipmentType === "road" ? "▭" : s.shipmentType === "air" ? "✈" : "⛴",
      reached: done("sailed"),
    },
    {
      label: "Port of discharge",
      sub: portName(s.portOfDischargeId),
      glyph: "⚓",
      reached: s.status === "closed",
    },
    { label: "Customer", sub: undefined, glyph: "▣", reached: done("payment_received") },
  );
  return nodes;
}

function variantSummary(
  s: Shipment,
  profile: (typeof COUNTRY_PROFILES)[keyof typeof COUNTRY_PROFILES],
): string {
  const parts: string[] = [
    `${profile.name} (${profile.partnerEntity})`,
    SHIPMENT_TYPE_LABEL[s.shipmentType].toLowerCase(),
  ];
  parts.push(profile.usesExportContract ? "export contract applies" : "no export contract");
  parts.push(profile.usesExportForms ? "EX forms apply" : "no EX forms");
  if (profile.usesExportPermit) parts.push("export permit applies");
  if (profile.startsFromCommercialInvoice) parts.push("customs starts from the commercial invoice");
  if (profile.hasInlandTransitLeg) parts.push(`inland leg: ${profile.inlandLegLabel}`);
  if (profile.usesLogisticsServiceRequest) parts.push("logistics service request applies");
  if (s.usesFreightForwarder) parts.push("freight forwarder handles booking and shipment");
  if (s.isLargeVolume) parts.push("large-volume contract");
  return `Variant: ${parts.join(" · ")}.`;
}

/* ================================================================== *
 * Booking & SI tab
 * ================================================================== */

function BookingTab({ s }: { s: Shipment }) {
  const totals = chargeTotals(s.charges);
  return (
    <>
      <CollapsibleSection
        title="Freight offers"
        indicator={
          <StatusChip
            tone={s.freightOffers.some((o) => o.selected) ? "ok" : "idle"}
            label={`${s.freightOffers.length} offer(s)`}
            size="sm"
          />
        }
      >
        {s.freightOffers.length === 0 ? (
          <EmptyState title="No freight offer captured yet">
            Collect quotations by line and forwarder, then select and approve one.
          </EmptyState>
        ) : (
          <div className="dtable__scroll">
            <table className="dtable__table">
              <caption className="sr-only">Freight offers</caption>
              <thead>
                <tr>
                  <th scope="col">Offer</th>
                  <th scope="col">Line / forwarder</th>
                  <th scope="col" className="text-right">
                    20 ft
                  </th>
                  <th scope="col" className="text-right">
                    40 ft
                  </th>
                  <th scope="col">Free days POL/POD</th>
                  <th scope="col">Validity</th>
                  <th scope="col">Selected</th>
                </tr>
              </thead>
              <tbody>
                {s.freightOffers.map((o) => {
                  const expired = daysRemaining(o.validity);
                  return (
                    <tr key={o.id}>
                      <td>{o.offerNo}</td>
                      <td>
                        {o.shippingLine}
                        {o.isForwarder ? (
                          <span className="muted xsmall"> · via {o.forwarderName}</span>
                        ) : null}
                      </td>
                      <td className="text-right">{formatMoney(o.rate20ft)}</td>
                      <td className="text-right">{formatMoney(o.rate40ft)}</td>
                      <td>
                        {o.freeDaysAtPol} / {o.freeDaysAtPod}
                      </td>
                      <td>
                        {formatDate(o.validity)}
                        {expired !== undefined && expired < 0 ? (
                          <StatusChip tone="risk" label="expired" size="sm" />
                        ) : null}
                      </td>
                      <td>
                        {o.selected ? (
                          <StatusChip tone="ok" label="Selected" size="sm" />
                        ) : (
                          <span className="muted">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Banner tone="info" title="Proposed extension">
          The workshop notes require one entry form to accept all rates for multiple loading and destination
          points and shipping lines — the legacy form takes a single option only — plus integration with
          searates.com.
        </Banner>
      </CollapsibleSection>

      <CollapsibleSection title="Booking">
        <FieldGrid
          fields={[
            { label: "Booking number", value: s.booking.bookingNo },
            { label: "Shipping line", value: s.booking.shippingLine },
            { label: "Vessel", value: s.booking.vesselName },
            { label: "Voyage", value: s.booking.voyageNo },
            {
              label: "Vessel ETA at load port",
              value: formatDate(s.booking.vesselEtaPol),
              behaviour: "required",
            },
            { label: "Vessel ATA at load port", value: formatDate(s.booking.vesselAtaPol) },
            { label: "Shipped on board", value: formatDate(s.booking.shippedOnBoardDate) },
            {
              label: "Draft B/L confirmation",
              value: formatDate(s.booking.draftBlConfirmationDate),
              hint: "Legacy: column with no form field (D5)",
            },
            {
              label: "Original B/L date",
              value: formatDate(s.booking.originalBlDate),
              hint: "Legacy: column with no form field (D5)",
            },
            { label: "B/L number", value: s.booking.blNumber },
            {
              label: "B/L net weight",
              value: s.booking.blNetWeightKg ? `${formatNumber(s.booking.blNetWeightKg)} kg` : undefined,
            },
            {
              label: "B/L delivered to bank",
              value: formatDate(s.booking.blDeliveredToBankDate),
              hint: "Legacy: column with no form field (D5)",
            },
            { label: "Attachment", value: s.booking.attachmentName },
          ]}
        />
        <Banner tone="info" title="Eleven recovered milestone fields">
          The legacy booking screen carries eleven columns that no form control reaches — the entire
          commercial close-out of a shipment. Four of them appear above; the remainder are on the charges
          block in the document workspace.
        </Banner>
      </CollapsibleSection>

      <CollapsibleSection title="Shipping instruction">
        <FieldGrid
          fields={[
            { label: "Final SI number", value: s.shippingInstruction.finalSiNo },
            { label: "Issued", value: formatDate(s.shippingInstruction.issuedOn) },
            {
              label: "Last shipping date",
              value: formatDate(s.shippingInstruction.lastShippingDate ?? s.lastShippingDate),
            },
            { label: "Consignee", value: s.shippingInstruction.consignee },
            { label: "Notify party", value: s.shippingInstruction.notifyParty },
            { label: "Second notify party", value: s.shippingInstruction.secondNotifyParty },
            { label: "Forwarding agent", value: s.shippingInstruction.forwardingAgent },
            { label: "Place of receipt", value: s.shippingInstruction.placeOfReceipt },
            { label: "Place of delivery", value: s.shippingInstruction.placeOfDelivery },
            { label: "Service type", value: s.shippingInstruction.serviceType },
            {
              label: "B/L originals / copies",
              value: `${s.shippingInstruction.blOriginals} / ${s.shippingInstruction.blCopies}`,
            },
            { label: "Released bill to", value: s.shippingInstruction.releasedBillTo },
            { label: "Place of release", value: s.shippingInstruction.placeOfRelease },
            { label: "Bill kind", value: humanise(s.shippingInstruction.billKind) },
          ]}
        />

        <h4 className="small" style={{ fontWeight: 600, marginTop: "1rem" }}>
          Charge allocation
        </h4>
        <ul className="kvbars" style={{ marginTop: "0.5rem" }}>
          {(
            [
              ["Origin local charges", s.shippingInstruction.chargeAllocation.originLocal],
              ["Sea freight", s.shippingInstruction.chargeAllocation.seaFreight],
              ["Destination local charges", s.shippingInstruction.chargeAllocation.destinationLocal],
              ["Other charges", s.shippingInstruction.chargeAllocation.other],
            ] as const
          ).map(([label, who]) => (
            <li key={label} style={{ gridTemplateColumns: "14rem 1fr" }}>
              <span className="small">{label}</span>
              <StatusChip
                tone={who === "unset" ? "idle" : "info"}
                label={who === "unset" ? "Not set" : `By ${who}`}
                size="sm"
              />
            </li>
          ))}
        </ul>
        <p className="small muted" style={{ marginTop: "0.5rem" }}>
          The defaults encode the standard CNF split (rule R18). This shipment's incoterm should be checked
          against them — the legacy form defaults silently and flags nothing.
        </p>
      </CollapsibleSection>

      <CollapsibleSection
        title="Charges recorded so far"
        defaultOpen={false}
        indicator={
          <StatusChip
            tone={totals.outstandingCount > 0 ? "warn" : "ok"}
            label={`${totals.outstandingCount} outstanding`}
            size="sm"
          />
        }
      >
        <ul className="doclist">
          {s.charges.map((ch) => (
            <li key={ch.type} className={ch.status === "not_applicable" ? "na" : "required"}>
              <span className="doclist__name">
                {CHARGE_TYPE_LABEL[ch.type]}
                {ch.label ? <span className="doclist__sub">{ch.label}</span> : null}
              </span>
              <StatusChip tone={toneFor(ch.status)} label={humanise(ch.status)} size="sm" />
              <span className="small">{formatMoney(ch.amount)}</span>
              <span className="xsmall muted">
                {ch.paymentDate
                  ? `paid ${formatDate(ch.paymentDate)}`
                  : ch.invoiceReceivedDate
                    ? `invoiced ${formatDate(ch.invoiceReceivedDate)}`
                    : ""}
              </span>
            </li>
          ))}
        </ul>
        {totals.totals.map((t) => (
          <TotalBanner
            key={t.currency}
            label={`Total charges (${t.currency})`}
            value={formatMoney(t)}
            derivation="sum of applicable charge amounts in this currency; amounts in other currencies are totalled separately"
          />
        ))}
      </CollapsibleSection>
    </>
  );
}

/* ================================================================== *
 * Shipment create / edit form
 * ================================================================== */

export function ShipmentForm({ mode }: { mode: "create" | "edit" }) {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const contracts = useAsync(() => api.listContracts());
  const shipments = useAsync(() => api.listShipments());
  const existing = mode === "edit" ? (shipments.data ?? []).find((s) => s.id === id) : undefined;

  const [contractId, setContractId] = useState(params.get("contract") ?? "");
  const [quantity, setQuantity] = useState("");
  const [type, setType] = useState<ShipmentType | "">("");
  const [containerCount, setContainerCount] = useState("");
  const [containerType, setContainerType] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate the edit form once the record arrives.
  if (mode === "edit" && existing && !hydrated) {
    setContractId(existing.contractId);
    setQuantity(String(existing.quantityMt));
    setType(existing.shipmentType);
    setContainerCount(existing.containerCount ? String(existing.containerCount) : "");
    setContainerType(existing.containerType ?? "");
    setHydrated(true);
  }

  const contract = (contracts.data ?? []).find((c) => c.id === contractId);
  const shippedElsewhere = (shipments.data ?? [])
    .filter((x) => x.contractId === contractId && x.id !== id && x.status !== "cancelled")
    .reduce((a, x) => a + x.quantityMt, 0);
  const balance = contract ? quantityBalance(contract, { shippedMt: shippedElsewhere }) : undefined;

  /**
   * Raised from a row of the contract list — `?contract=<id>`, the action that replaced the
   * "New shipment from a contract" header button on 5 September 2026.
   *
   * The instruction is that the action "automatically captures the details needed in the new
   * shipment screen", so what the contract already determines is filled in and labelled:
   *
   *   - the contract itself, which the query string already carried before this change;
   *   - the shipment type, from the contract's own;
   *   - the quantity still to ship, which is the ceiling less what other live shipments
   *     already commit — the largest this shipment may be, and the usual answer.
   *
   * The last shipping date was the fourth until 8 September 2026, when the instruction removed
   * it and the cargo readiness date from this screen. It is still on the record, and still
   * defaulted from the contract's shipment period when a shipment is created — see below.
   *
   * Nothing is locked. None of these is a rule: the quantity is checked against the ceiling on
   * save and the rest are free text or a choice, so every prefilled value stays editable.
   * Applied once — `useAsync` re-fetches on every store mutation, and a second application
   * would overwrite whatever has since been typed.
   */
  const prefilledFor = useRef<string | null>(null);
  const [capturedFrom, setCapturedFrom] = useState<string[]>([]);
  useEffect(() => {
    if (mode !== "create") return;
    const wanted = params.get("contract");
    if (!wanted || prefilledFor.current === wanted) return;
    const c = (contracts.data ?? []).find((x) => x.id === wanted);
    if (!c || shipments.loading) return;
    prefilledFor.current = wanted;
    const captured = ["sf-contract"];
    setType(c.shipmentType);
    captured.push("sf-type");
    /* The container type the contract's loading container size implies. Nothing where the
       contract permits both sizes or names none — a contract that settles nothing should
       not have a guess put in its mouth. */
    const ct = defaultContainerTypeFor(c.loadingContainerSize);
    if (ct) {
      setContainerType(ct);
      captured.push("sf-ctype");
    }
    const committed = (shipments.data ?? [])
      .filter((x) => x.contractId === wanted && x.status !== "cancelled")
      .reduce((a, x) => a + x.quantityMt, 0);
    const remaining = quantityBalance(c, { shippedMt: committed }).maxAllowedMt - committed;
    if (remaining > 0) {
      setQuantity(String(remaining));
      captured.push("sf-qty");
    }
    setCapturedFrom(captured);
  }, [mode, params, contracts.data, shipments.data, shipments.loading]);
  const capturedContract = capturedFrom.length > 0 ? contract : undefined;

  const summaryItems = Object.entries(errors).map(([field, message]) => ({ field, message }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const next: Record<string, string> = {};
    if (!contractId) next["sf-contract"] = "Select the contract this shipment is executed against.";
    const q = Number(quantity);
    if (!quantity.trim()) next["sf-qty"] = "Enter the shipment quantity in MT.";
    else if (!Number.isFinite(q) || q <= 0) next["sf-qty"] = "Quantity must be a number greater than zero.";
    if (!type) next["sf-type"] = "Select the shipment type.";
    if (type === "container" && containerCount && Number(containerCount) <= 0) {
      next["sf-ccount"] = "Container count must be greater than zero.";
    }
    /* The readiness-before-last-shipping check went with the two date fields on 8 September
       2026: there is nothing on this screen left to check. The rule is still enforced in
       `api.updateShipment`, which is where it has to live now — the service layer is the last
       guard, and a date set anywhere else must still obey it. */
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    const res =
      mode === "create"
        ? await api.createShipment({
            contractId,
            quantityMt: q,
            shipmentType: type as ShipmentType,
            containerCount: containerCount ? Number(containerCount) : undefined,
            containerType: containerType || undefined,
            /* The last shipping date is no longer asked for here, but the contract still
               settles it, so it is read rather than dropped: a shipment with no last shipping
               date would lose the export-contract expiry check on its own detail screen. */
            lastShippingDate: contract?.shipmentPeriodEnd || undefined,
          })
        : /* On edit, neither date is sent at all — not as `undefined`. `updateShipment` does
             `Object.assign`, so a key present and undefined would erase a captured date that
             this screen no longer shows and therefore cannot have been asked to change. */
          await api.updateShipment(id, {
            quantityMt: q,
            containerCount: containerCount ? Number(containerCount) : undefined,
            containerType: containerType || undefined,
          });
    setSaving(false);
    if (!res.ok) {
      setServerError(res.reason);
      return;
    }
    toast.push(
      "ok",
      mode === "create" ? `Shipment ${res.value.shipmentNo} created as a draft.` : "Shipment updated.",
    );
    navigate(`/shipments/${res.value.id}`);
  }

  return (
    <>
      <PageHeader
        moduleLabel="Shipments & execution"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Shipments", to: "/shipments" },
          ...(mode === "edit" && existing
            ? [{ label: existing.shipmentNo, to: `/shipments/${existing.id}` }]
            : []),
          { label: mode === "create" ? "New shipment" : "Edit" },
        ]}
        title={mode === "create" ? "New shipment" : `Edit ${existing?.shipmentNo ?? ""}`}
        meta="Client-side validation, contract-ceiling enforcement and a service-layer guard"
      />
      <div className="page">
        <form className="card card__body stack" onSubmit={submit} noValidate>
          {serverError ? (
            <Banner tone="risk" title="The shipment could not be saved">
              {serverError}
            </Banner>
          ) : null}
          <ErrorSummary errors={summaryItems} />

          {capturedContract ? (
            <Banner tone="info" title={`Captured from ${capturedContract.contractNo}`}>
              Raised from the <strong>New shipment</strong> action on{" "}
              <Link to="/contracts">the contract list</Link>, which fills in what the contract already
              determines:{" "}
              {[
                "the contract",
                capturedFrom.includes("sf-type") ? "the shipment type" : null,
                capturedFrom.includes("sf-ctype") ? "the container type" : null,
                capturedFrom.includes("sf-qty") ? "the quantity still to ship" : null,
              ]
                .filter(Boolean)
                .join(", ")}
              . Every one of them is editable: none is a rule, and the quantity is checked against the
              contract ceiling on save rather than fixed here.
            </Banner>
          ) : null}

          <div className="fields">
            <FormRow label="Contract" htmlFor="sf-contract" required error={errors["sf-contract"]}>
              <SelectInput
                id="sf-contract"
                value={contractId}
                onChange={setContractId}
                required
                error={errors["sf-contract"]}
                disabled={mode === "edit"}
                options={(contracts.data ?? []).map((c) => ({
                  value: c.id,
                  label: `${c.contractNo} — ${counterpartyName(c.buyerId)} — ${formatMt(c.quantityMt)}`,
                }))}
              />
            </FormRow>

            <FormRow
              label="Quantity (MT)"
              htmlFor="sf-qty"
              required
              error={errors["sf-qty"]}
              hint={
                balance
                  ? `Contract ceiling ${formatMt(balance.maxAllowedMt)} (${formatMt(balance.contractQuantityMt)} + ${balance.tolerancePct}% tolerance); ${formatMt(shippedElsewhere)} already committed elsewhere`
                  : undefined
              }
            >
              <TextInput
                id="sf-qty"
                value={quantity}
                onChange={setQuantity}
                required
                error={errors["sf-qty"]}
                inputMode="decimal"
                placeholder="e.g. 600"
              />
            </FormRow>

            <FormRow label="Shipment type" htmlFor="sf-type" required error={errors["sf-type"]}>
              <SelectInput
                id="sf-type"
                value={type}
                onChange={setType}
                required
                error={errors["sf-type"]}
                disabled={mode === "edit"}
                options={(["container", "bulk", "break_bulk", "road", "air"] as ShipmentType[]).map((t) => ({
                  value: t,
                  label: SHIPMENT_TYPE_LABEL[t],
                }))}
              />
            </FormRow>

            <FormRow
              label="Container count"
              htmlFor="sf-ccount"
              error={errors["sf-ccount"]}
              hint={type && type !== "container" ? "Not applicable for this shipment type" : undefined}
              behaviour={type && type !== "container" ? "conditional" : undefined}
            >
              <TextInput
                id="sf-ccount"
                value={containerCount}
                onChange={setContainerCount}
                error={errors["sf-ccount"]}
                inputMode="numeric"
                disabled={!!type && type !== "container"}
              />
            </FormRow>

            <FormRow
              label="Container type"
              htmlFor="sf-ctype"
              behaviour={
                type && type !== "container"
                  ? "conditional"
                  : capturedFrom.includes("sf-ctype")
                    ? "inherited"
                    : undefined
              }
              hint={
                type && type !== "container"
                  ? undefined
                  : contract && contract.loadingContainerSize === "20ft_and_40ft"
                    ? `${contract.contractNo} permits 20 ft and/or 40 ft, so it settles no default — choose one.`
                    : capturedFrom.includes("sf-ctype")
                      ? `Defaulted from ${contract?.contractNo}'s loading container size.`
                      : "From the container-type master."
              }
            >
              <SelectInput
                id="sf-ctype"
                value={containerType}
                onChange={setContainerType}
                disabled={!!type && type !== "container"}
                placeholder="No container type specified"
                options={[
                  ...CONTAINER_TYPES.map((t) => ({ value: t.value, label: t.value })),
                  /* A captured value the master does not offer is kept and marked, never
                     blanked — the lesson of the trader drop-down, applied on edit. */
                  ...(isMasterContainerType(containerType)
                    ? []
                    : [{ value: containerType, label: `${containerType} — not in the master` }]),
                ]}
              />
            </FormRow>

          </div>

          {contract &&
          quantity &&
          Number(quantity) > 0 &&
          balance &&
          shippedElsewhere + Number(quantity) > balance.maxAllowedMt ? (
            <Banner tone="warn" title="This quantity would exceed the contract ceiling">
              {formatMt(shippedElsewhere)} is already committed and the ceiling is{" "}
              {formatMt(balance.maxAllowedMt)}. The save will be refused by the service layer — unlike the
              legacy form, which saved 110 MT against a 100 MT contract at 5% tolerance.
            </Banner>
          ) : null}

          <RequiredLegend />

          <div className="factions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? "Create shipment" : "Save changes"}
            </button>
            <Link
              className="btn"
              to={mode === "edit" && existing ? `/shipments/${existing.id}` : "/shipments"}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
