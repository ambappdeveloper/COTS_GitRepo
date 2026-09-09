import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { commodityById, counterpartyName, portName } from "../data/master";
import {
  TODAY,
  documentCompleteness,
  formatDate,
  formatMoney,
  formatMt,
  maxAllowedQuantity,
  money,
  quantityBalance,
  safeNumber,
  validateLotTotal,
} from "../domain/calc";
import { resolveContractStepper, resolveMilestones, variantContextOf } from "../domain/milestones";
import {
  CONTRACT_TRANSITIONS,
  TAG_SPECIFICATION_TRANSITIONS,
  checkMandatoryQualityParameters,
  humanise,
  nextStates,
  toneFor,
} from "../domain/status";
import {
  DOCUMENT_REQUIREMENT_LABEL,
  ROLE_LABEL,
  SHIPMENT_STATUS_LABEL,
  SHIPMENT_TYPE_LABEL,
  type Contract,
  type ContractQualityParameter,
  type ContractStatus,
  type CurrencyCode,
  type ReviewFeedbackPrice,
  type Role,
  type Shipment,
  type TagSpecificationState,
} from "../domain/types";
import { COUNTRY_PROFILES, reviewPriceLegsFor } from "../domain/variants";
import { api } from "../services/store";
import { useAuth } from "../auth/AuthContext";
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
import {
  ErrorSummary,
  FormActions,
  FormRow,
  RequiredLegend,
  SelectInput,
  TextArea,
  TextInput,
} from "../components/form";
import { LifecycleStepper } from "../components/status-flow";
import { DataTable, type Column } from "../components/table";
import { useAsync } from "./hooks";

/* ================================================================== *
 * Contract list
 * ================================================================== */

export function ContractList() {
  const contracts = useAsync(() => api.listContracts());
  const shipments = useAsync(() => api.listShipments());

  if (contracts.error) {
    return (
      <div className="page">
        <ErrorState detail={contracts.error} onRetry={contracts.reload} />
      </div>
    );
  }

  const rows = contracts.data ?? [];
  const ships = shipments.data ?? [];

  const columns: Column<Contract>[] = [
    {
      key: "contractNo",
      header: "Contract",
      cell: (c) => <Link to={`/contracts/${c.id}`}>{c.contractNo}</Link>,
      sortValue: (c) => c.contractNo,
    },
    {
      key: "buyer",
      header: "Buyer",
      cell: (c) => counterpartyName(c.buyerId),
      sortValue: (c) => counterpartyName(c.buyerId),
    },
    {
      key: "commodity",
      header: "Commodity",
      cell: (c) => commodityById(c.commodityId)?.name ?? "–",
      sortValue: (c) => commodityById(c.commodityId)?.name ?? "",
      filterOptions: [...new Set(rows.map((c) => c.commodityId))].map((id) => ({
        value: id,
        label: commodityById(id)?.name ?? id,
      })),
      filterMatch: (c, v) => c.commodityId === v,
    },
    {
      key: "origin",
      header: "Origin",
      cell: (c) => COUNTRY_PROFILES[c.origin].name,
      sortValue: (c) => COUNTRY_PROFILES[c.origin].name,
      filterOptions: [...new Set(rows.map((c) => c.origin))].map((o) => ({
        value: o,
        label: COUNTRY_PROFILES[o].name,
      })),
      filterMatch: (c, v) => c.origin === v,
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => <StatusChip tone={toneFor(c.status)} label={humanise(c.status)} size="sm" />,
      sortValue: (c) => c.status,
      filterOptions: [...new Set(rows.map((c) => c.status))].map((s) => ({ value: s, label: humanise(s) })),
      filterMatch: (c, v) => c.status === v,
    },
    {
      key: "qty",
      header: "Quantity",
      align: "right",
      cell: (c) => formatMt(c.quantityMt),
      sortValue: (c) => c.quantityMt,
    },
    {
      key: "shipped",
      header: "Shipped",
      align: "right",
      cell: (c) => {
        const shipped = ships
          .filter((s) => s.contractId === c.id && s.status !== "cancelled")
          .reduce((a, s) => a + s.quantityMt, 0);
        return formatMt(shipped);
      },
      sortValue: (c) => ships.filter((s) => s.contractId === c.id).reduce((a, s) => a + s.quantityMt, 0),
    },
    {
      key: "period",
      header: "Shipment period",
      cell: (c) => `${formatDate(c.shipmentPeriodStart)} – ${formatDate(c.shipmentPeriodEnd)}`,
      sortValue: (c) => c.shipmentPeriodEnd,
      optional: true,
    },
    {
      key: "incoterm",
      header: "Incoterm",
      cell: (c) => c.incoterm,
      sortValue: (c) => c.incoterm,
      optional: true,
    },
    {
      key: "type",
      header: "Shipment type",
      cell: (c) => SHIPMENT_TYPE_LABEL[c.shipmentType],
      sortValue: (c) => c.shipmentType,
      optional: true,
    },
    {
      key: "trader",
      header: "Trader",
      cell: (c) => c.traderName,
      sortValue: (c) => c.traderName,
      optional: true,
    },
    {
      key: "lv",
      header: "Large volume",
      cell: (c) =>
        c.isLargeVolume ? (
          <StatusChip tone="accent" label="LV" size="sm" />
        ) : (
          <span className="muted">–</span>
        ),
      sortValue: (c) => (c.isLargeVolume ? 1 : 0),
      optional: true,
    },
    {
      /**
       * "Under Contract List view screen, remove the header button New shipment from a
       * contract, instead add an action button in the list view to automatically capture
       * the details needed in the new shipment screen." — 5 September 2026.
       *
       * The same correction the business made to the budget list on 3 September, for the
       * same reason. The header button's own label said "from a contract" while the header
       * belongs to the list rather than to any contract, so it could only open an empty New
       * shipment screen with the contract drop-down still to be answered — the one thing it
       * named. Raised from a row, the shipment arrives with the contract, its execution plan
       * where the contract has exactly one, the shipment type, the quantity still to ship and
       * the last shipping date already filled in, and the screen says where each came from.
       *
       * Offered only where a shipment can actually be raised: a cancelled contract, and one
       * whose quantity is fully committed, have nothing left to capture.
       *
       * Last column, on the follow-up of the same date. It is an action rather than a fact
       * about the contract, so it belongs at the end of the row where the eye stops, not in
       * the middle of the record's own attributes. It is also the only non-optional column
       * after Status, so it stays put when the switchable ones are turned off.
       */
      key: "ship",
      header: "Shipment",
      cell: (c) => {
        const committed = ships
          .filter((s) => s.contractId === c.id && s.status !== "cancelled")
          .reduce((a, s) => a + s.quantityMt, 0);
        const remaining = maxAllowedQuantity(c) - committed;
        if (c.status === "cancelled")
          return <span className="muted" title="The contract is cancelled.">–</span>;
        if (remaining <= 0)
          return (
            <span className="muted" title="The contract quantity, plus tolerance, is fully committed.">
              –
            </span>
          );
        return (
          <Link className="btn btn--sm" to={`/shipments/new?contract=${c.id}`}>
            New shipment
            <span className="sr-only"> from {c.contractNo}</span>
          </Link>
        );
      },
      sortValue: () => "",
    },
  ];

  return (
    <>
      <PageHeader
        moduleLabel="Contract to cargo"
        crumbs={[{ label: "Home", to: "/" }, { label: "Contracts" }]}
        title="Contracts"
        meta="Sales and purchase contracts, their lots and their consumption"
        recordKey={`${rows.length}`}
        recordDate="contracts"
        /**
         * "Add a new Contract button on the header of contract screen." — follow-up of
         * 5 September 2026, and the counterpart to moving New shipment onto the row.
         *
         * The two are not the same kind of button and that is the whole point. Creating a
         * contract needs nothing from any row, so the header is where it belongs; raising a
         * shipment needs the contract to capture from, so it belongs on the row. The list
         * had lost its own add action when the shipment button was taken off the header.
         */
        actions={<ActionBar primary={[{ label: "New contract", to: "/contracts/new" }]} />}
      />
      <div className="page">
        <Banner tone="info" title="Raising a shipment from a contract">
          The instruction of 5 September 2026 takes <strong>New shipment from a contract</strong> off this
          page's header and puts a <strong>New shipment</strong> action on each row, so that it can do what
          its label always said: capture the contract's details automatically. From the header it had no
          contract to capture from and opened an empty screen with the contract still to be chosen. From a
          row, the New shipment screen arrives with the contract, its
          execution plan where the contract has exactly one, the shipment type, the quantity still to ship
          and the last shipping date already filled in, each marked with where it came from, and all of it
          still editable — nothing here is a rule, only a starting point. The action is not offered on a
          cancelled contract, or on one whose quantity plus tolerance is already fully committed, because
          neither has a shipment left to raise. It is the last column, because it is an action rather than
          a fact about the contract. The header keeps a button of its own — <strong>New contract</strong> —
          which is the difference the two make plain: creating a contract needs nothing from any row, so it
          belongs to the page; raising a shipment needs a contract to read, so it belongs to the row.
        </Banner>

        <DataTable
          caption="Contracts"
          rows={rows}
          columns={columns}
          loading={contracts.loading}
          searchPlaceholder="Search by contract number, buyer or commodity…"
          searchValue={(c) =>
            `${c.contractNo} ${counterpartyName(c.buyerId)} ${commodityById(c.commodityId)?.name ?? ""} ${c.buyerNickName}`
          }
          rowHref={(c) => `/contracts/${c.id}`}
          savedViews={[
            { key: "all", label: "All contracts", description: "Every contract in the demo data set." },
            {
              key: "under",
              label: "Under execution",
              description: "Contracts currently being executed.",
              predicate: (c) => c.status === "under_execution",
            },
            {
              key: "lv",
              label: "Large volume only",
              description:
                "Contracts flagged as large volume — one export contract consumed across several shipments.",
              predicate: (c) => c.isLargeVolume,
            },
            {
              key: "period",
              label: "Shipment period ending soonest",
              description: "Sorted by the end of the contracted shipment period.",
              /* "ship" is kept in every prescribed column set: it is the list's action, and a
                 saved view that drops it would quietly take the action away. */
              columns: ["contractNo", "buyer", "commodity", "status", "qty", "shipped", "period", "ship"],
            },
          ]}
        />
      </div>
    </>
  );
}

/* ================================================================== *
 * Contract detail — tabbed workspace
 * ================================================================== */

const CONTRACT_TABS = [
  "summary",
  "details",
  /** v2.0 phase 04 — the cross-functional fulfilment confirmations. */
  "review",
  /** v2.0 phase 05 — contract quality terms and the tags / artwork specification. */
  "quality",
  /* "planning" removed 8 September 2026 — execution planning is no longer a screen. */
  "export-contract",
  "shipments",
  "documents",
  "audit",
] as const;
type ContractTab = (typeof CONTRACT_TABS)[number];

const CONTRACT_TAB_LABEL: Record<ContractTab, string> = {
  summary: "Summary",
  details: "Details",
  review: "Cross-functional review",
  quality: "Quality & tags",
  "export-contract": "Export contract",
  shipments: "Shipments",
  documents: "Document requirements",
  audit: "Audit",
};

export function ContractDetail() {
  const { id = "", tab } = useParams();
  const activeTab = (tab ?? "summary") as ContractTab;
  const toast = useToast();

  const contract = useAsync(() => api.getContract(id), [id]);
  const shipments = useAsync(() => api.listShipments());
  const cargo = useAsync(() => api.listCargoReadiness());
  const exportContracts = useAsync(() => api.listExportContracts());

  const [statusOpen, setStatusOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ContractStatus | "">("");

  if (contract.error) {
    return (
      <div className="page">
        <ErrorState detail={contract.error} onRetry={contract.reload} />
      </div>
    );
  }
  if (contract.loading) {
    return (
      <div className="page">
        <div className="card">
          <p className="card__body muted">Loading contract…</p>
        </div>
      </div>
    );
  }
  const c = contract.data;
  if (!c) {
    return (
      <div className="page">
        <EmptyState
          title="Contract not found"
          action={
            <Link className="btn btn--primary" to="/contracts">
              Back to contracts
            </Link>
          }
        >
          No contract exists with the id <code>{id}</code>.
        </EmptyState>
      </div>
    );
  }

  const ships = (shipments.data ?? []).filter((s) => s.contractId === c.id);
  /* Readiness reaches the contract through its shipments since 8 September 2026; it reached it
     through its execution plans until then. */
  const ctCargo = (cargo.data ?? []).filter((cr) => ships.some((sh) => sh.id === cr.shipmentId));
  const ctExport = (exportContracts.data ?? []).filter((e) => e.contractId === c.id);
  const commodity = commodityById(c.commodityId);
  const shippedMt = ships.filter((s) => s.status !== "cancelled").reduce((a, s) => a + s.quantityMt, 0);
  const readyMt = ctCargo.reduce((a, cr) => a + cr.qtyReadyMt, 0);
  /* `plannedMt` was the sum of the contract's execution plans. With planning gone there is
     nothing between the contract and its shipments to plan a quantity, so it is not supplied
     and the balance reports planned as unknown rather than as zero. */
  const balance = quantityBalance(c, { readyMt, shippedMt });

  // Contract-level lifecycle stepper, rolled up from the earliest shipment's flow.
  const primary = ships[0];
  const resolved = primary
    ? resolveMilestones(
        primary.milestones,
        variantContextOf(primary, COUNTRY_PROFILES[primary.country]),
        TODAY,
        primary.documents,
      )
    : [];
  const steps = resolveContractStepper(resolved);

  const allowedStatuses = CONTRACT_TRANSITIONS[c.status];

  const tabs = CONTRACT_TABS.map((t) => ({
    key: t,
    label: CONTRACT_TAB_LABEL[t],
    to: t === "summary" ? `/contracts/${c.id}` : `/contracts/${c.id}/${t}`,
    badge:
      t === "shipments" && ships.length > 0
        ? ships.length
        : t === "export-contract" && ctExport.length > 0
          ? ctExport.length
          : t === "review" && c.reviewFeedback.some((f) => f.outcome !== "confirmed")
            ? c.reviewFeedback.filter((f) => f.outcome !== "confirmed").length
            : undefined,
  }));

  return (
    <>
      <PageHeader
        moduleLabel="Contracts"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Contracts", to: "/contracts" },
          { label: c.contractNo },
        ]}
        title={counterpartyName(c.buyerId)}
        statusChip={<StatusChip tone={toneFor(c.status)} label={humanise(c.status)} />}
        meta={
          <>
            {c.contractNo} · {commodity?.name} · {formatMt(c.quantityMt)} · {COUNTRY_PROFILES[c.origin].name}{" "}
            → {portName(c.portOfDischargeId)} · {c.incoterm}
            {c.isLargeVolume ? " · Large volume" : ""}
          </>
        }
        recordKey={c.contractNo}
        recordDate={formatDate(c.createdDate)}
        actions={
          <ActionBar
            primary={[
              { label: "Edit contract", to: `/contracts/${c.id}/edit` },
              {
                label: "Change status",
                onClick: () => setStatusOpen(true),
                disabled: allowedStatuses.length === 0,
                disabledReason: `"${humanise(c.status)}" is a terminal state.`,
              },
            ]}
            more={[
              { label: "New shipment against this contract", to: `/shipments/new?contract=${c.id}` },
              { label: "Record cross-functional review (phase 04)", to: `/contracts/${c.id}/review` },
              { label: "Quality terms & tags (phase 05)", to: `/contracts/${c.id}/quality` },
              { label: "Stock allocation & readiness (phase 06)", to: "/allocation" },
              { label: "View export contracts", to: `/contracts/${c.id}/export-contract` },
              ...(c.opportunityId
                ? [
                    {
                      label: "Open the originating deal (phases 01-02)",
                      to: `/origination/${c.opportunityId}`,
                    },
                  ]
                : []),
              { label: "View audit history", to: `/contracts/${c.id}/audit` },
            ]}
          />
        }
        tabs={<RecordTabs tabs={tabs} />}
      />

      <div className="page">
        {activeTab === "summary" ? (
          <>
            <SummaryCard title="Contract lifecycle" tone="accent">
              {primary ? (
                <LifecycleStepper steps={steps} caption={`Contract lifecycle for ${c.contractNo}`} />
              ) : (
                <EmptyState title="No shipment yet" glyph="○">
                  The contract lifecycle stepper is derived from its shipments. Create a shipment to populate
                  it.
                </EmptyState>
              )}
            </SummaryCard>

            <div className="grid-3">
              <SummaryCard title="Contract terms">
                <FieldGrid
                  columns={1}
                  fields={[
                    { label: "Buyer", value: counterpartyName(c.buyerId) },
                    { label: "Buyer nickname", value: c.buyerNickName, behaviour: "required" },
                    { label: "Trader", value: c.traderName },
                    { label: "Incoterm", value: c.incoterm },
                    { label: "Payment terms", value: c.paymentTerms },
                    { label: "Port of loading", value: portName(c.portOfLoadingId) },
                    { label: "Port of discharge", value: portName(c.portOfDischargeId) },
                  ]}
                />
              </SummaryCard>

              <SummaryCard title="Commodity & packing">
                <FieldGrid
                  columns={1}
                  fields={[
                    { label: "Commodity", value: commodity?.name },
                    { label: "Commodity code", value: commodity?.code },
                    {
                      label: "Packing",
                      value: `${humanise(c.packingType)}${c.packingSizeKg ? ` · ${c.packingSizeKg} kg` : ""}`,
                    },
                    { label: "Shipment type", value: SHIPMENT_TYPE_LABEL[c.shipmentType] },
                    { label: "Method of shipping", value: c.methodOfShipping },
                    { label: "Fumigation", value: humanise(c.fumigationType) },
                    {
                      label: "Artwork",
                      value: `${humanise(c.artworkType)}${c.artworkTags ? " · tags" : ""}${c.artworkPrintedBags ? " · printed bags" : ""}`,
                    },
                    {
                      /* Added 6 September 2026 with the attachment on the create screen. Shown
                         here rather than only captured, because an attachment nobody can see on
                         the record is an attachment nobody knows is missing. */
                      label: "Artwork design",
                      value: c.artworkDesignFileName,
                      hint: "The design file attached when the contract was raised. Absent on every captured contract, where the design was held outside the system.",
                    },
                  ]}
                />
              </SummaryCard>

              <SummaryCard title="Quantity & allocation">
                <QuantityDonut
                  fraction={balance.shippedFraction}
                  valueLabel={formatMt(balance.shippedMt)}
                  ofLabel={formatMt(balance.contractQuantityMt)}
                  caption="shipped against the contract"
                  tone={balance.shippedFraction >= 1 ? "ok" : "accent"}
                />
                <FieldGrid
                  columns={1}
                  fields={[
                    {
                      label: "Tolerance",
                      value: `${c.tolerancePct}% — more or less at seller's option at contract price`,
                    },
                    {
                      label: "Ceiling with tolerance",
                      value: formatMt(balance.maxAllowedMt),
                      behaviour: "calculated",
                    },
                    { label: "Cargo ready", value: formatMt(balance.readyMt), behaviour: "calculated" },
                    {
                      label: "Remaining",
                      value: <strong>{formatMt(balance.remainingMt)}</strong>,
                      behaviour: "calculated",
                    },
                  ]}
                />
              </SummaryCard>
            </div>

            <TotalBanner
              label="Contract quantity remaining"
              value={formatMt(balance.remainingMt)}
              derivation={`contracted ${formatMt(balance.contractQuantityMt)} − shipped ${formatMt(balance.shippedMt)}, clamped at zero (rule R4)`}
            />

            <div className="grid-2">
              <SummaryCard title="Shipment period">
                <FieldGrid
                  columns={1}
                  fields={[
                    { label: "Start", value: formatDate(c.shipmentPeriodStart) },
                    { label: "End", value: formatDate(c.shipmentPeriodEnd) },
                    { label: "Extension", value: c.extensionDate ? formatDate(c.extensionDate) : undefined },
                    {
                      label: "Partial shipment",
                      value: c.partialShipmentAllowed ? "Allowed" : "Not allowed",
                    },
                    { label: "Free days at port", value: `${c.freeDaysAtPort} days` },
                  ]}
                />
              </SummaryCard>

              <SummaryCard
                title="Contract review & setup feedback"
                tone={
                  c.reviewFeedback.some((f) => f.outcome === "concern")
                    ? "warn"
                    : c.reviewFeedback.every((f) => f.outcome === "confirmed")
                      ? "ok"
                      : "accent"
                }
              >
                <Banner tone="info" title="Proposed step — no legacy screen exists">
                  Workshop requirement: on contract creation, quality, execution and FP&amp;A are alerted,
                  review the terms and record their feedback in COTS.
                </Banner>
                <ul className="reviewlist">
                  {c.reviewFeedback.map((f) => (
                    <li key={f.role}>
                      <StatusChip
                        tone={f.outcome === "confirmed" ? "ok" : f.outcome === "concern" ? "warn" : "idle"}
                        label={humanise(f.outcome)}
                        size="sm"
                      />
                      <div>
                        <strong className="small">{ROLE_LABEL[f.role]}</strong>
                        {f.respondedBy ? (
                          <span className="muted xsmall">
                            {" "}
                            — {f.respondedBy}, {formatDate(f.respondedOn)}
                          </span>
                        ) : null}
                        {f.comment ? <p className="small">{f.comment}</p> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </SummaryCard>
            </div>

            {c.costingSnapshot ? (
              <CollapsibleSection
                title="Costing snapshot at deal agreement (proposed — rule R29)"
                defaultOpen={false}
              >
                <FieldGrid
                  fields={[
                    { label: "Position declared", value: humanise(c.costingSnapshot.position) },
                    {
                      label: "Estimated cost per MT",
                      value: formatMoney(c.costingSnapshot.estimatedCostPerMt),
                    },
                    { label: "Sales price per MT", value: formatMoney(c.costingSnapshot.salesPricePerMt) },
                    { label: "Margin", value: `${c.costingSnapshot.marginPct}%`, behaviour: "calculated" },
                    { label: "Taken on", value: formatDate(c.costingSnapshot.takenOn) },
                    {
                      label: "Expected raw price (short position)",
                      value: c.costingSnapshot.expectedRawPricePerMt
                        ? formatMoney(c.costingSnapshot.expectedRawPricePerMt)
                        : undefined,
                    },
                  ]}
                />
              </CollapsibleSection>
            ) : null}
          </>
        ) : null}

        {activeTab === "details" ? <ContractDetailsTab c={c} /> : null}

        {activeTab === "review" ? <ContractReviewTab c={c} onSaved={() => contract.reload()} /> : null}

        {activeTab === "quality" ? <ContractQualityTab c={c} onSaved={() => contract.reload()} /> : null}

        {activeTab === "export-contract" ? (
          <>
            <h2 className="page__title">Export contracts against this contract</h2>
            {ctExport.length === 0 ? (
              <div className="card">
                <EmptyState title="No export contract">
                  {COUNTRY_PROFILES[c.origin].usesExportContract
                    ? "None has been requested yet."
                    : `An export contract does not apply in ${COUNTRY_PROFILES[c.origin].name}.`}
                </EmptyState>
              </div>
            ) : (
              <div className="stack">
                {ctExport.map((e) => (
                  <div className="card card__body" key={e.id}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <strong>{e.exportContractNo ?? e.requestNo}</strong>
                      <StatusChip tone={toneFor(e.status)} label={humanise(e.status)} size="sm" />
                    </div>
                    <FieldGrid
                      fields={[
                        { label: "Request number", value: e.requestNo, behaviour: "readonly" },
                        { label: "Requested quantity", value: formatMt(e.requestedQuantityMt) },
                        {
                          label: "Actual quantity",
                          value: e.actualQuantityMt !== undefined ? formatMt(e.actualQuantityMt) : undefined,
                        },
                        { label: "Issuance", value: formatDate(e.issuanceDate) },
                        { label: "Expiry", value: formatDate(e.expiryDate) },
                        {
                          label: "EX forms",
                          value: e.exportForms.length > 0 ? `${e.exportForms.length} issued` : undefined,
                        },
                      ]}
                    />
                    <p style={{ marginTop: "0.75rem" }}>
                      <Link className="btn btn--sm" to={`/pre-clearance/${e.id}`}>
                        Open export contract
                      </Link>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}

        {activeTab === "shipments" ? <ContractShipmentsTab shipments={ships} /> : null}

        {activeTab === "documents" ? (
          <>
            <h2 className="page__title">Document requirements</h2>
            <p className="page__intro">
              Set once on the contract and inherited by every shipment. The legacy system keeps two divergent
              lists — one on the Purchase Contract and one on SI &amp; SRF, which uniquely adds the SSMO
              certificate. This is the single canonical list (proposed).
            </p>
            <div className="card card__body">
              <ul className="reqlist">
                {(Object.keys(DOCUMENT_REQUIREMENT_LABEL) as (keyof typeof DOCUMENT_REQUIREMENT_LABEL)[]).map(
                  (k) => {
                    const on = c.documentRequirements.includes(k);
                    return (
                      <li key={k} className={on ? "on" : "off"}>
                        <span aria-hidden="true">{on ? "✓" : "○"}</span>
                        <span>{DOCUMENT_REQUIREMENT_LABEL[k]}</span>
                        <span className="muted xsmall">{on ? "required" : "not required"}</span>
                      </li>
                    );
                  },
                )}
              </ul>
            </div>
          </>
        ) : null}

        {activeTab === "audit" ? (
          <>
            <h2 className="page__title">Audit history</h2>
            <p className="page__intro">
              Contract-level events plus the audit trail of each shipment raised against it. The legacy chain
              holds created / modified / author / editor on every list and surfaces none of it.
            </p>
            {ships.length === 0 ? (
              <div className="card">
                <EmptyState title="No audit events yet" />
              </div>
            ) : (
              <div className="stack">
                {ships.map((s) => (
                  <CollapsibleSection
                    key={s.id}
                    title={`${s.shipmentNo} — ${s.audit.length} event(s)`}
                    defaultOpen={ships.length === 1}
                  >
                    <AuditList events={s.audit} />
                  </CollapsibleSection>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>

      <Dialog
        open={statusOpen}
        title={`Change contract status — ${c.contractNo}`}
        onClose={() => setStatusOpen(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setStatusOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!pendingStatus}
              onClick={async () => {
                if (!pendingStatus) return;
                const res = await api.setContractStatus(c.id, pendingStatus);
                if (res.ok) {
                  toast.push("ok", `Contract ${c.contractNo} moved to "${humanise(pendingStatus)}".`);
                  setStatusOpen(false);
                  setPendingStatus("");
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
          Only transitions permitted from <strong>{humanise(c.status)}</strong> are offered. The legacy system
          displays its rule message and then saves anyway; here a disallowed transition is not available at
          all.
        </p>
        <ul className="statuschoices">
          {allowedStatuses.map((s) => (
            <li key={s}>
              <label>
                <input
                  type="radio"
                  name="status"
                  value={s}
                  checked={pendingStatus === s}
                  onChange={() => setPendingStatus(s)}
                />
                <StatusChip tone={toneFor(s)} label={humanise(s)} size="sm" />
              </label>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}

/* ================================================================== *
 * Phase 04 — cross-functional contract review
 *
 * Workflow v2.0 §6.4, entirely from the workshop notes and absent from the previous
 * documentation workflow (register G-10, C-16):
 *   "Alert notifications are communicated to Quality, the Execution team, the
 *    Processing team and FP&A. Each team reviews the contract terms and confirms that
 *    it has the set-up in place to fulfil the requirements. Each team captures its
 *    feedback in COTS."
 *
 * What is deliberately absent. §6.4 records four things as [OPEN] and none is
 * invented here: no state model for the review or for an individual team's feedback;
 * no response period and no SLA; no gate on execution; and no path for a team that
 * reports it cannot fulfil the contract. The screen therefore captures the
 * confirmations, shows a concern, and blocks nothing — decision D-10.
 *
 * AMENDED 8 September 2026 — "remove Processing from this screen". The reviewing
 * functions are now Quality, Partner / Country Execution and Finance (FP&A). The
 * §6.4 text quoted above names the Processing team as a fourth; the business has since
 * said three, and the instruction is what the screen follows. The `processing` role
 * itself is untouched — Processing still gives the Execution team readiness feedback at
 * Phase 13, which is a different activity on a different screen.
 * ================================================================== */

/**
 * The currencies Finance may price in — 9 September 2026.
 *
 * The same two the costing screens offer. No source names a currency for this figure, so the
 * list is not widened on a guess; adding one is a one-line change when the business says which.
 */
const REVIEW_PRICE_CURRENCIES: { value: CurrencyCode; label: string }[] = [
  { value: "USD", label: "USD" },
  { value: "SDG", label: "SDG" },
];

const REVIEW_OUTCOMES: { value: ReviewOutcome; label: string }[] = [
  { value: "pending", label: "Not yet responded" },
  { value: "confirmed", label: "Confirmed — the set-up is in place" },
  { value: "concern", label: "Concern — cannot confirm as it stands" },
];

type ReviewOutcome = Contract["reviewFeedback"][number]["outcome"];

function ContractReviewTab({ c, onSaved }: { c: Contract; onSaved: () => void }) {
  const toast = useToast();
  /**
   * Who responded, read and not asked for.
   *
   * "In the cross function review > Record feedback screen: remove the responded by field
   * (it is automatically captured by the system, the current user logged in)." — 6 September
   * 2026. The third field of this kind in two days, and the most clear-cut: unlike a trader
   * on a contract or a purchaser on an agreement, the person responding on behalf of a
   * function IS whoever is signed in and pressing the button. A typed name could name
   * somebody who was not there.
   *
   * WHAT THIS MAKES VISIBLE, and does not change. Nothing here checks that the signed-in
   * user belongs to the function whose row is being answered — anyone may record for any of
   * them. That was already true and the typed box hid it, because a Dubai Execution user
   * could type a Quality reviewer's name. Now the name recorded is the person who actually
   * recorded it, whichever row it is, which is more truthful and more visibly incomplete.
   * §6.4 states no rule tying a responder to a function, so none is invented — see the
   * screen's own note and the open item.
   */
  const { user } = useAuth();
  const respondedBy = user?.displayName ?? "";
  const [openRole, setOpenRole] = useState<Role | null>(null);
  const [outcome, setOutcome] = useState<ReviewOutcome>("confirmed");
  const [comment, setComment] = useState("");
  /**
   * Finance's prices per country of the route — 9 September 2026.
   *
   * "If country is Sudan user can add price for Sudan only; for other countries user can add
   * price between one or two countries. This should be entered by finance."
   *
   * Keyed by leg rather than by country name, so the map survives a profile renaming a country.
   * The legs themselves come from `reviewPriceLegsFor`, which the service layer reads too — the
   * form cannot offer a country the service would refuse.
   */
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [priceCurrency, setPriceCurrency] = useState<CurrencyCode>("USD");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const priceLegs = reviewPriceLegsFor(c);

  const confirmed = c.reviewFeedback.filter((f) => f.outcome === "confirmed").length;
  const concerns = c.reviewFeedback.filter((f) => f.outcome === "concern");
  const pending = c.reviewFeedback.filter((f) => f.outcome === "pending");

  function openFor(role: Role) {
    const row = c.reviewFeedback.find((f) => f.role === role);
    setOpenRole(role);
    setOutcome(row?.outcome ?? "confirmed");
    setComment(row?.comment ?? "");
    setPrices(
      Object.fromEntries(
        (row?.prices ?? []).map((p) => [p.leg, String(p.amount.amount)]),
      ),
    );
    setPriceCurrency(row?.prices?.[0]?.amount.currency ?? "USD");
    setErrors({});
  }

  async function save() {
    if (!openRole) return;
    const next: Record<string, string> = {};
    /* Not a field left blank — a session with no display name to read. It cannot happen from
       these screens; the check stays because a response with no responder records nothing. */
    if (outcome !== "pending" && !respondedBy.trim()) {
      next["rv-by"] =
        "The signed-in session carries no display name, so there is no responder to record. Who responded " +
        "is read from the session rather than entered.";
    }
    if (outcome === "concern" && !comment.trim()) {
      next["rv-comment"] = "A concern must say what it is.";
    }
    /* Only Finance is asked, so only Finance's entries are read. A number that is not a number
       is caught here; whether a price is required at all is not asserted — no source says it is. */
    const priceRows: ReviewFeedbackPrice[] = [];
    if (openRole === "finance") {
      for (const leg of priceLegs) {
        const raw = (prices[leg.leg] ?? "").trim();
        if (!raw) continue;
        const amount = safeNumber(raw, -1);
        if (!(amount > 0)) {
          next[`rv-price-${leg.leg}`] = `Enter a price for ${leg.countryName} greater than zero, or leave it blank.`;
          continue;
        }
        priceRows.push({ leg: leg.leg, countryName: leg.countryName, amount: money(amount, priceCurrency) });
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    const res = await api.recordReviewFeedback(c.id, openRole, outcome, {
      respondedBy: respondedBy.trim() || undefined,
      comment: comment.trim() || undefined,
      prices: openRole === "finance" ? priceRows : undefined,
    });
    setSaving(false);
    if (!res.ok) {
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `${ROLE_LABEL[openRole]} feedback recorded.`);
    setOpenRole(null);
    onSaved();
  }

  return (
    <>
      <h2 className="page__title">Cross-functional contract review</h2>
      <p className="page__intro">
        Phase 04 of workflow v2.0. On contract creation, Quality, the Execution team and FP&amp;A are
        alerted, each reviews the terms and each confirms it has the set-up in place to fulfil them. One
        confirmation per function.
      </p>

      <Banner tone="warn" title="Advisory, not a gate — decision D-10">
        The workshop notes describe the notification and the feedback but do not make the feedback a gate, and
        give no response period. Whether a contract may be executed while a function has not confirmed is a
        business decision, so nothing on this screen blocks anything. No state model is given for the review
        or for an individual team&apos;s feedback either.
      </Banner>

      {concerns.length > 0 ? (
        <Banner
          tone="risk"
          title={`${concerns.length} function${concerns.length === 1 ? "" : "s"} raised a concern`}
        >
          {concerns.map((f) => `${ROLE_LABEL[f.role]}: ${f.comment ?? "no detail recorded"}`).join(" · ")}{" "}
          Neither source describes what happens when a team reports that it cannot fulfil the contract terms,
          so no escalation path is offered here.
        </Banner>
      ) : null}

      <div className="grid-3">
        <SummaryCard title="Confirmations" tone={confirmed === c.reviewFeedback.length ? "ok" : "accent"}>
          <QuantityDonut
            fraction={c.reviewFeedback.length > 0 ? confirmed / c.reviewFeedback.length : 0}
            valueLabel={`${confirmed}`}
            ofLabel={`${c.reviewFeedback.length}`}
            caption="functions have confirmed they can fulfil"
            tone={confirmed === c.reviewFeedback.length ? "ok" : "accent"}
          />
        </SummaryCard>
        <SummaryCard title="Outstanding" tone={pending.length > 0 ? "warn" : "ok"}>
          {pending.length === 0 ? (
            <p className="small">Every function has responded.</p>
          ) : (
            <ul className="doclist">
              {pending.map((f) => (
                <li key={f.role}>
                  <span className="doclist__name">{ROLE_LABEL[f.role]}</span>
                  <StatusChip tone="idle" label="Not yet responded" size="sm" />
                </li>
              ))}
            </ul>
          )}
          <p className="xsmall muted" style={{ marginTop: "0.5rem" }}>
            No response period is given in either source, so nothing here can be overdue.
          </p>
        </SummaryCard>
        <SummaryCard title="Notification channel">
          <FieldGrid
            columns={1}
            fields={[
              { label: "Raised by", value: "Dubai Execution", behaviour: "readonly" },
              { label: "Feedback held in", value: "COTS", behaviour: "readonly" },
              { label: "Notification channel", value: "Not stated in either source", behaviour: "readonly" },
              {
                label: "The same teams in every country?",
                value: "Not stated",
                hint: "v2.0 §6.4 describes country differences in who owns execution but does not extend that to the review.",
              },
            ]}
          />
        </SummaryCard>
      </div>

      <CollapsibleSection title="The fulfilment confirmations">
        <div className="dtable__scroll">
          <table className="dtable__table">
            <caption className="sr-only">Cross-functional review feedback</caption>
            <thead>
              <tr>
                <th scope="col">Function</th>
                <th scope="col">Outcome</th>
                <th scope="col">Responded by</th>
                <th scope="col">Responded on</th>
                <th scope="col">Comment</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {c.reviewFeedback.map((f) => (
                <tr key={f.role}>
                  <td>
                    <strong>{ROLE_LABEL[f.role]}</strong>
                  </td>
                  <td>
                    <StatusChip
                      tone={f.outcome === "confirmed" ? "ok" : f.outcome === "concern" ? "risk" : "idle"}
                      label={REVIEW_OUTCOMES.find((o) => o.value === f.outcome)?.label ?? humanise(f.outcome)}
                      size="sm"
                    />
                  </td>
                  <td className="small">{f.respondedBy ?? "–"}</td>
                  <td className="small">{formatDate(f.respondedOn)}</td>
                  <td className="small">
                    {f.comment ?? "–"}
                    {/* Finance's prices, where it has recorded any — 9 September 2026. The column
                        is Comment rather than a column of its own because only one of the three
                        rows can ever carry a price, and an almost-always-empty column reads as a
                        gap in the data rather than as a field that does not apply. */}
                    {f.prices?.length ? (
                      <span className="doclist__sub">
                        {f.prices
                          .map((p) => `${p.countryName} ${formatMoney(p.amount)}`)
                          .join(" · ")}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <button type="button" className="btn btn--sm" onClick={() => openFor(f.role)}>
                      Record feedback
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: "0.5rem" }}>
          FP&amp;A&apos;s role here is stated only as &quot;review and confirm set-up&quot;; its separate role
          in determining advance payment amounts belongs to Phase 07 —{" "}
          <Link to="/pre-clearance/advance-payments">advance payments</Link>.
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="What this phase does not settle" defaultOpen={false}>
        <ul className="doclist">
          <li>
            <span className="doclist__name">
              Is the feedback advisory or blocking?
              <span className="doclist__sub">Decision D-10 — Execution, Quality, FP&amp;A</span>
            </span>
            <StatusChip tone="warn" label="Open" size="sm" />
          </li>
          <li>
            <span className="doclist__name">
              What happens when a team says it cannot fulfil?
              <span className="doclist__sub">No path is described in either source</span>
            </span>
            <StatusChip tone="warn" label="Open" size="sm" />
          </li>
          <li>
            <span className="doclist__name">
              May a person record a response for a function they are not in?
              <span className="doclist__sub">
                The responder is read from the session (6 September 2026), and nothing checks it against
                the row's function. §6.4 states no rule, so none is enforced — but the name now recorded is
                whoever pressed the button, which makes the gap visible rather than hidden behind a typed
                name.
              </span>
            </span>
            <StatusChip tone="warn" label="Open" size="sm" />
          </li>
          <li>
            <span className="doclist__name">
              Is there a response period, and what happens when it passes?
              <span className="doclist__sub">No period is given; no SLA is inferred</span>
            </span>
            <StatusChip tone="warn" label="Open" size="sm" />
          </li>
          <li>
            <span className="doclist__name">
              Are the same teams notified in every country?
              <span className="doclist__sub">Not stated</span>
            </span>
            <StatusChip tone="warn" label="Open" size="sm" />
          </li>
        </ul>
      </CollapsibleSection>

      <Dialog
        open={openRole !== null}
        title={openRole ? `Record ${ROLE_LABEL[openRole]} feedback` : ""}
        onClose={() => setOpenRole(null)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setOpenRole(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Record feedback"}
            </button>
          </>
        }
      >
        <ErrorSummary errors={errorRows(errors)} title="The feedback could not be recorded" />
        <FormRow label="Outcome" htmlFor="rv-outcome" required>
          <SelectInput
            id="rv-outcome"
            value={outcome}
            onChange={(v) => setOutcome(v)}
            options={REVIEW_OUTCOMES}
            placeholder="Select an outcome…"
            required
          />
        </FormRow>
        <FormRow
          label="Responded by"
          htmlFor="rv-by"
          required={outcome !== "pending"}
          error={errors["rv-by"]}
          hint={
            respondedBy
              ? "Read from the session — the person recording the response is the person who reviewed the terms. Nothing checks that they belong to this function; §6.4 states no such rule."
              : "Read from the session, which carries no display name."
          }
        >
          <div id="rv-by">
            {respondedBy ? (
              <strong>{respondedBy}</strong>
            ) : (
              <span className="muted">– no display name on the session</span>
            )}
          </div>
        </FormRow>
        <FormRow
          label="Comment"
          htmlFor="rv-comment"
          required={outcome === "concern"}
          error={errors["rv-comment"]}
          hint="Required on a concern. The service layer refuses a concern with no detail."
        >
          <TextArea id="rv-comment" value={comment} onChange={setComment} error={errors["rv-comment"]} />
        </FormRow>

        {/*
          Price per country of the route — Finance only, 9 September 2026.

          "If country is Sudan user can add price for Sudan only; for other countries user can
          add price between one or two countries. This should be entered by finance."

          The countries are derived, not chosen: the contract's origin, plus the transit country
          where the profile names one. Sudan loads at Port Sudan and never leaves, so it is one
          row; Chad crosses into Cameroon for Douala and Ethiopia into Djibouti, so those are two.
          `reviewPriceLegsFor` is what both this form and the service layer read, so the form
          cannot offer a country the save would refuse.

          Only Finance's row asks. The other functions confirm they can fulfil and are asked
          nothing about money — and the service layer refuses a price sent for any other role,
          so a second screen cannot file one under Quality.
        */}
        {openRole === "finance" ? (
          <>
            <FormRow
              label="Currency"
              htmlFor="rv-price-ccy"
              hint={
                priceLegs.length > 1
                  ? `One currency for both legs — ${priceLegs.map((l) => l.countryName).join(" and ")}.`
                  : undefined
              }
            >
              <SelectInput
                id="rv-price-ccy"
                value={priceCurrency}
                onChange={(v) => setPriceCurrency(v)}
                options={REVIEW_PRICE_CURRENCIES}
              />
            </FormRow>
            {priceLegs.map((leg) => (
              <FormRow
                key={leg.leg}
                label={`Price — ${leg.countryName}`}
                htmlFor={`rv-price-${leg.leg}`}
                error={errors[`rv-price-${leg.leg}`]}
                hint={
                  leg.leg === "origin"
                    ? "The origin country. Optional — no source makes a price mandatory to the review."
                    : `The transit leg: ${COUNTRY_PROFILES[c.origin]?.inlandLegLabel ?? "the second country on the route"}.`
                }
              >
                <TextInput
                  id={`rv-price-${leg.leg}`}
                  value={prices[leg.leg] ?? ""}
                  onChange={(v) => setPrices((p) => ({ ...p, [leg.leg]: v }))}
                  inputMode="decimal"
                  error={errors[`rv-price-${leg.leg}`]}
                />
              </FormRow>
            ))}
            <p className="xsmall muted">
              {priceLegs.length > 1
                ? `${COUNTRY_PROFILES[c.origin]?.name} has an inland leg, so the route is priced in two countries. A contract loading in its own country is priced in one.`
                : `${COUNTRY_PROFILES[c.origin]?.name} loads in its own country, so there is one country to price.`}{" "}
              What the figure represents — a cost, a transfer price or a quoted rate — is not stated
              in either source and is not decided here.
            </p>
          </>
        ) : null}

        <p className="xsmall muted">
          Recording a confirmation does not unblock anything and recording a concern does not block anything,
          because v2.0 §6.4 does not say it should (decision D-10).
        </p>
      </Dialog>
    </>
  );
}

/* ================================================================== *
 * Phase 05 — quality parameters and the tags / artwork specification
 *
 * Workflow v2.0 §6.5, reconciled from the existing document register (tags / artwork
 * specification, Standard / Buyer option, [AS-IS]) and the workshop notes (the
 * parameters and the separate tags flow, both [PROPOSED]):
 *   "Quality terms are recorded against the contract. Parameters that are mandatory
 *    for the specific commodity must be provided — for sesame, for example, the
 *    moisture content. The standard parameters for each commodity are retrieved
 *    automatically into the contract from master data, and are modified where the
 *    buyer has specific requirements. After the contract is saved, a separate flow or
 *    form is started for the tags specification, listing the custom tag options the
 *    buyer requires."
 *
 * What is deliberately absent. §6.5 records that "the standard parameter set per
 * commodity is to be defined with the quality team — not yet available" (decision
 * D-20) and that "whether a missing mandatory quality parameter blocks the contract,
 * the shipment, or nothing" is [OPEN]. The one parameter the source names as mandatory
 * is moisture content for sesame; nothing else is marked mandatory here, because
 * nothing else is stated. Missing parameters are reported and block nothing.
 * ================================================================== */

/**
 * The only mandatory-parameter evidence in the source is §6.5's own example. Marking
 * anything else mandatory would be an invention, so the rest render as "not stated".
 */
function isMandatoryParameter(commodityId: string, name: string): boolean {
  return commodityId.startsWith("cm-sesame") && name.toLowerCase().startsWith("moisture");
}

/** What the toast says for each leg, so the words match the button that was pressed. */
const TAG_ACTION_DONE: Record<"sent" | "amended" | "confirmed" | "reissued", string> = {
  sent: "Tag specification sent to Dubai Execution.",
  amended: "Amendment returned to Origin Execution.",
  confirmed: "Tag specification confirmed.",
  reissued: "Specification re-opened after reprocessing — Origin Execution sends the new tag.",
};

/** Who owns the next move, in the words the screen uses for the parties. */
const TAG_NEXT_OWNER: Record<TagSpecificationState, string> = {
  not_started: "Origin Execution — nothing has been sent yet",
  sent: "Dubai Execution — confirm it, or return it with an amendment",
  amended: "Origin Execution — an amendment was returned; send the amended tag",
  confirmed: "Nobody. Reprocessing is the only thing that re-opens it",
  reissued: "Origin Execution — reprocessing changed the tag, so it is sent again",
};

const TAG_PARTY_LABEL: Record<string, string> = {
  partner_execution: "Origin Execution",
  dubai_execution: "Dubai Execution",
};

function ContractQualityTab({ c, onSaved }: { c: Contract; onSaved: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const commodity = commodityById(c.commodityId);

  const parameters: ContractQualityParameter[] =
    c.qualityTerms ??
    (commodity?.qualityParameters ?? []).map((q) => ({
      name: q.name,
      masterSpec: q.spec,
      mandatory: isMandatoryParameter(c.commodityId, q.name),
      source: "master" as const,
    }));

  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(parameters.map((p) => [p.name, p.buyerSpec ?? ""])),
  );
  const [savingTerms, setSavingTerms] = useState(false);

  const check = checkMandatoryQualityParameters(parameters);

  const spec = c.tagSpecification;
  const [tagOption, setTagOption] = useState<"standard" | "buyer">(
    spec?.option ?? (c.artworkTags ? "buyer" : "standard"),
  );
  const [customTags, setCustomTags] = useState(spec?.customTags.join(", ") ?? "");
  const [batchOnTag, setBatchOnTag] = useState(spec?.batchCodeOnTag ?? false);
  const [tagAttachment, setTagAttachment] = useState(spec?.attachmentFileName ?? "");
  /** The note that goes on this leg — what the amendment asks for, or what the sender adds. */
  const [tagNote, setTagNote] = useState("");
  const [tagErrors, setTagErrors] = useState<Record<string, string>>({});
  const [savingTags, setSavingTags] = useState(false);
  /**
   * Which panel is open. The `State` drop-down went on 9 September 2026: a two-party hand-off is
   * performed, not selected, and a control that let either party set any state was how the
   * record could say `agreed` with nobody having agreed anything.
   */
  const [tagPanel, setTagPanel] = useState<"send" | "amend" | null>(null);

  async function saveTerms() {
    setSavingTerms(true);
    const next: ContractQualityParameter[] = parameters.map((p) => {
      const buyerSpec = (drafts[p.name] ?? "").trim();
      return { ...p, buyerSpec: buyerSpec || undefined, source: buyerSpec ? "buyer" : "master" };
    });
    const res = await api.setContractQualityTerms(c.id, next);
    setSavingTerms(false);
    if (!res.ok) {
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", "Contract quality terms saved.");
    onSaved();
  }

  /**
   * One leg of the exchange — 9 September 2026.
   *
   * "Origin execution will send tag and Dubai execution will confirm or add amendment; there is
   * a workflow." Each button below performs one action and the state follows from it; the screen
   * no longer offers a state to choose.
   */
  async function actOnTags(action: "sent" | "amended" | "confirmed" | "reissued") {
    const errs: Record<string, string> = {};
    const tags = customTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (action === "sent" && tagOption === "buyer" && tags.length === 0) {
      errs["tg-custom"] =
        "A buyer option lists the custom tag options the buyer requires (v2.0 §6.5 activity 3).";
    }
    if (action === "amended" && !tagNote.trim()) {
      errs["tg-note"] = "Say what is to change — an amendment that names nothing is not an amendment.";
    }
    setTagErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSavingTags(true);
    const res = await api.recordTagSpecificationAction(c.id, action, {
      by: user?.displayName,
      note: tagNote.trim() || undefined,
      option: tagOption,
      customTags: tags,
      batchCodeOnTag: batchOnTag,
      attachmentFileName: tagAttachment.trim() || undefined,
    });
    setSavingTags(false);
    if (!res.ok) {
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", TAG_ACTION_DONE[action]);
    setTagNote("");
    setTagPanel(null);
    onSaved();
  }

  const tagState: TagSpecificationState = spec?.state ?? "not_started";
  const allowedTagStates = nextStates(TAG_SPECIFICATION_TRANSITIONS, tagState);
  const canSend = allowedTagStates.includes("sent");
  const canAnswer = allowedTagStates.includes("confirmed");
  const canReissue = allowedTagStates.includes("reissued");

  return (
    <>
      <h2 className="page__title">Quality terms and the tags specification</h2>
      <p className="page__intro">
        Phase 05 of workflow v2.0. The standard parameters for the commodity are retrieved from master data
        and modified where the buyer has specific requirements; after the contract is saved a separate flow
        records the tags or artwork the buyer requires.
      </p>

      <Banner tone="warn" title="Master data outstanding — decision D-20">
        The standard parameter set per commodity is to be defined with the quality team and is not yet
        available, and the QA formats and forms are to be shared by Asim. The parameters below are the
        commodity master&apos;s own; the only parameter either source names as mandatory is the moisture
        content for sesame, so nothing else is marked mandatory here.
      </Banner>

      <div className="grid-3">
        <SummaryCard title="Parameters" tone={check.complete ? "ok" : "warn"}>
          <FieldGrid
            columns={1}
            fields={[
              { label: "Commodity", value: commodity?.name, behaviour: "inherited" },
              { label: "Parameters held", value: `${parameters.length}` },
              {
                label: "Mandatory for this commodity",
                value: `${parameters.filter((p) => p.mandatory).length}`,
                hint: "Only where a source states it. Everything else is not stated.",
              },
              {
                label: "Buyer overrides",
                value: `${parameters.filter((p) => p.buyerSpec).length}`,
                behaviour: "calculated",
              },
              {
                label: "Saved against this contract",
                value: c.qualityTerms ? "Yes" : "No — showing the master default",
              },
            ]}
          />
        </SummaryCard>

        <SummaryCard title="Mandatory check" tone={check.complete ? "ok" : "warn"}>
          {check.complete ? (
            <p className="small">Every parameter this commodity requires carries a specification.</p>
          ) : (
            <>
              <StatusChip tone="warn" label={`${check.missing.length} missing`} />
              <ul className="doclist" style={{ marginTop: "0.5rem" }}>
                {check.missing.map((m) => (
                  <li key={m}>
                    <span className="doclist__name">{m}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="xsmall muted" style={{ marginTop: "0.5rem" }}>
            Reported, not enforced. v2.0 §6.5 states the parameters are mandatory for the commodity but does
            not say what a missing one blocks, so no blocking behaviour is asserted.
          </p>
        </SummaryCard>

        <SummaryCard
          title="Tags / artwork specification"
          tone={
            spec?.state === "confirmed" ? "ok" : spec?.state === "amended" || spec?.state === "reissued" ? "warn" : "accent"
          }
        >
          <FieldGrid
            columns={1}
            fields={[
              {
                label: "Option",
                value: spec ? humanise(spec.option) : humanise(c.artworkType),
                behaviour: spec ? undefined : "inherited",
              },
              {
                label: "State",
                value: (
                  <StatusChip
                    tone={toneFor(spec?.state ?? "not_started")}
                    label={humanise(spec?.state ?? "not_started")}
                    size="sm"
                  />
                ),
              },
              { label: "Custom tag options", value: spec?.customTags.join(", ") },
              {
                label: "Batch code on the tag",
                value: spec ? (spec.batchCodeOnTag ? "Yes" : "No") : undefined,
              },
              { label: "Confirmed on", value: formatDate(spec?.agreedOn) },
              { label: "Confirmed by", value: spec?.agreedBy },
              { label: "Attachment", value: spec?.attachmentFileName },
              {
                label: "Last action",
                value: spec?.exchange.length
                  ? `${humanise(spec.exchange[spec.exchange.length - 1].action)} by ${
                      TAG_PARTY_LABEL[spec.exchange[spec.exchange.length - 1].party] ??
                      humanise(spec.exchange[spec.exchange.length - 1].party)
                    }`
                  : undefined,
              },
              {
                label: "Rounds",
                value: spec?.exchange.length ? String(spec.exchange.length) : undefined,
                hint: "Every send, amendment and confirmation is kept — the thread is in the tags specification flow below.",
              },
              {
                label: "Re-issued after reprocessing",
                value: formatDate(spec?.reissuedAfterReprocessingOn),
                hint: "Reprocessing changes the product packaging and the tags, including the batch code, after the specification has been set.",
              },
              {
                label: "On the contract form",
                value: `${humanise(c.artworkType)}${c.artworkTags ? " · tags" : ""}${c.artworkPrintedBags ? " · printed bags" : ""}`,
                behaviour: "inherited",
              },
              {
                label: "Design attached to the contract",
                value: c.artworkDesignFileName,
                behaviour: "inherited",
                hint: "Attached on the create screen from 6 September 2026. Whether this is the same artefact as the specification above is [OPEN] — no source says it is.",
              },
            ]}
          />
        </SummaryCard>
      </div>

      <CollapsibleSection title="Contract quality terms">
        <div className="dtable__scroll">
          <table className="dtable__table">
            <caption className="sr-only">Contract quality parameters</caption>
            <thead>
              <tr>
                <th scope="col">Parameter</th>
                <th scope="col">Master specification</th>
                <th scope="col">Buyer requirement</th>
                <th scope="col">Mandatory</th>
                <th scope="col">Applies</th>
              </tr>
            </thead>
            <tbody>
              {parameters.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <span className="muted">No parameters are held for this commodity in master data.</span>
                  </td>
                </tr>
              ) : (
                parameters.map((p) => (
                  <tr key={p.name}>
                    <td>
                      <strong className="small">{p.name}</strong>
                    </td>
                    <td className="small">{p.masterSpec || <span className="muted">–</span>}</td>
                    <td>
                      <FormRow label={`${p.name} — buyer requirement`} htmlFor={`qt-${p.name}`}>
                        <TextInput
                          id={`qt-${p.name}`}
                          value={drafts[p.name] ?? ""}
                          onChange={(v) => setDrafts((d) => ({ ...d, [p.name]: v }))}
                          placeholder="Leave blank to use the master specification"
                        />
                      </FormRow>
                    </td>
                    <td>
                      {p.mandatory ? (
                        <StatusChip tone="warn" label="Mandatory" size="sm" />
                      ) : (
                        <StatusChip tone="na" label="Not stated" size="sm" />
                      )}
                    </td>
                    <td className="small">
                      {(drafts[p.name] ?? "").trim() ? "Buyer requirement" : "Master default"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <FormActions>
          <button
            type="button"
            className="btn btn--primary"
            onClick={saveTerms}
            disabled={savingTerms || parameters.length === 0}
          >
            {savingTerms ? "Saving…" : "Save quality terms"}
          </button>
        </FormActions>
        <p className="small muted">
          Each commodity in each country has specific quality inspection parameters and activities (v2.0
          §6.5). SSMO standards and requirements are held per commodity in master data, which is what the
          Sudan SSMO certificate at Phase 09 draws on.
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Tags specification flow (activity 3)">
        <ErrorSummary errors={errorRows(tagErrors)} title="The tags specification could not be saved" />

        {/*
          The two-party workflow — 9 September 2026.

          "Origin execution will send tag and Dubai execution will confirm or add amendment;
          there is a workflow."

          What this replaced: one form with an Option, a State drop-down and an Agreed by box,
          filled in by whoever had the screen open. A hand-off is performed rather than selected,
          so the State control has gone and each party's move is a button that says what it does.

          Who may press which is shown and not enforced — the same position the cross-functional
          review takes, and for the same reason: which role may act is a C01 permission question,
          and deciding it one screen at a time is how two screens come to disagree.
        */}
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <StatusChip
            tone={tagState === "confirmed" ? "ok" : toneFor(tagState)}
            label={humanise(tagState)}
          />
          <span className="small muted">Next: {TAG_NEXT_OWNER[tagState]}</span>
        </div>

        {spec && spec.exchange.length > 0 ? (
          <ol className="doclist" style={{ marginTop: "0.75rem" }}>
            {spec.exchange.map((e) => (
              <li key={e.id}>
                <span className="doclist__name">
                  {humanise(e.action)} by {TAG_PARTY_LABEL[e.party] ?? humanise(e.party)}
                  <span className="doclist__sub">
                    {formatDate(e.at)}
                    {e.by ? ` · ${e.by}` : ""}
                    {e.attachmentFileName ? ` · ${e.attachmentFileName}` : ""}
                    {e.note ? ` — ${e.note}` : ""}
                  </span>
                </span>
                <StatusChip
                  tone={e.action === "confirmed" ? "ok" : e.action === "amended" ? "warn" : "info"}
                  label={humanise(e.action)}
                  size="sm"
                />
              </li>
            ))}
          </ol>
        ) : (
          <p className="small muted" style={{ marginTop: "0.75rem" }}>
            Nothing has been exchanged yet. Origin Execution sends the tag first.
          </p>
        )}

        {/* ---- Origin Execution: send, or re-send after an amendment ---- */}
        {canSend ? (
          tagPanel === "send" ? (
            <div className="card card__body" style={{ marginTop: "0.75rem" }}>
              <p className="small">
                <strong>Origin Execution</strong> — the tag sent to Dubai Execution for confirmation.
              </p>
              <div className="grid-2">
                <FormRow label="Option" htmlFor="tg-option" required>
                  <SelectInput
                    id="tg-option"
                    value={tagOption}
                    onChange={(v) => setTagOption(v)}
                    options={[
                      { value: "standard" as const, label: "Standard option" },
                      { value: "buyer" as const, label: "Buyer option" },
                    ]}
                    placeholder="Select an option…"
                    required
                  />
                </FormRow>
                <FormRow label="Batch code printed on the tag" htmlFor="tg-batch">
                  <label className="small" htmlFor="tg-batch">
                    <input
                      id="tg-batch"
                      type="checkbox"
                      checked={batchOnTag}
                      onChange={(e) => setBatchOnTag(e.target.checked)}
                    />{" "}
                    Yes — the batch code appears on the tag
                  </label>
                </FormRow>
              </div>
              <FormRow
                label="Custom tag options the buyer requires"
                htmlFor="tg-custom"
                required={tagOption === "buyer"}
                error={tagErrors["tg-custom"]}
                hint="Comma separated. Required on a buyer option — the service layer refuses one with no options listed."
              >
                <TextArea
                  id="tg-custom"
                  value={customTags}
                  onChange={setCustomTags}
                  error={tagErrors["tg-custom"]}
                />
              </FormRow>
              <FormRow
                label="Attachment"
                htmlFor="tg-attachment"
                hint="The tag or artwork file this send carries. A file name only — this prototype stores names, not files. Each send keeps its own, so an earlier one is not overwritten."
              >
                <TextInput
                  id="tg-attachment"
                  value={tagAttachment}
                  onChange={setTagAttachment}
                  placeholder="e.g. northharbour-tag-spec-v2.pdf"
                />
              </FormRow>
              <FormRow label="Note" htmlFor="tg-note" hint="Optional — anything Dubai Execution should read with it.">
                <TextArea id="tg-note" value={tagNote} onChange={setTagNote} rows={2} />
              </FormRow>
              <FormActions>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => void actOnTags("sent")}
                  disabled={savingTags}
                >
                  {savingTags ? "Sending…" : "Send to Dubai Execution"}
                </button>
                <button type="button" className="btn" onClick={() => setTagPanel(null)}>
                  Cancel
                </button>
              </FormActions>
            </div>
          ) : (
            <FormActions>
              <button type="button" className="btn btn--primary" onClick={() => setTagPanel("send")}>
                {tagState === "amended" ? "Send the amended tag" : "Send tag specification"}
              </button>
              <span className="small muted">Origin Execution</span>
            </FormActions>
          )
        ) : null}

        {/* ---- Dubai Execution: confirm, or return with an amendment ---- */}
        {canAnswer ? (
          tagPanel === "amend" ? (
            <div className="card card__body" style={{ marginTop: "0.75rem" }}>
              <p className="small">
                <strong>Dubai Execution</strong> — returning the tag to Origin Execution with an amendment.
              </p>
              <FormRow
                label="What is to change"
                htmlFor="tg-note"
                required
                error={tagErrors["tg-note"]}
                hint="Kept as its own entry in the exchange above, so a second amendment does not overwrite the first."
              >
                <TextArea
                  id="tg-note"
                  value={tagNote}
                  onChange={setTagNote}
                  rows={3}
                  error={tagErrors["tg-note"]}
                />
              </FormRow>
              <FormActions>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => void actOnTags("amended")}
                  disabled={savingTags}
                >
                  {savingTags ? "Returning…" : "Return with the amendment"}
                </button>
                <button type="button" className="btn" onClick={() => setTagPanel(null)}>
                  Cancel
                </button>
              </FormActions>
            </div>
          ) : (
            <FormActions>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void actOnTags("confirmed")}
                disabled={savingTags}
              >
                {savingTags ? "Saving…" : "Confirm the tag"}
              </button>
              <button type="button" className="btn" onClick={() => setTagPanel("amend")}>
                Return with an amendment
              </button>
              <span className="small muted">Dubai Execution</span>
            </FormActions>
          )
        ) : null}

        {/* ---- Reprocessing re-opens a confirmed specification ---- */}
        {canReissue ? (
          <FormActions>
            <button
              type="button"
              className="btn"
              onClick={() => void actOnTags("reissued")}
              disabled={savingTags}
            >
              Re-issue after reprocessing
            </button>
            <span className="small muted">
              Reprocessing changed the packaging and the tags, so the specification goes round again.
            </span>
          </FormActions>
        ) : null}

        <RequiredLegend />
        <Banner tone="info" title="Who may press which is shown, not enforced">
          Each action names the party that owns it — Origin Execution sends, Dubai Execution answers —
          and the exchange records which party each leg came from. Nothing here checks that the
          signed-in user belongs to that party, which is the same position the cross-functional review
          takes: who may act is a permission question for C01, not a rule invented on this screen.
        </Banner>
        <Banner tone="info" title="Reprocessing re-opens this">
          Reprocessing changes the product packaging and the tags, including the batch code, after the
          specification has been set (v2.0 §6.5 exception). That is why <em>Confirmed</em> is not terminal
          and a re-issued specification is a state of its own. The batch code itself is recorded on the
          stock and deliberately excluded from stock allocation — see{" "}
          <Link to="/allocation">allocation and readiness</Link>.
        </Banner>
      </CollapsibleSection>

      <CollapsibleSection title="What this phase does not settle" defaultOpen={false}>
        <ul className="doclist">
          <li>
            <span className="doclist__name">
              The standard parameter set per commodity
              <span className="doclist__sub">
                To be defined with the quality team — not yet available (decision D-20)
              </span>
            </span>
            <StatusChip tone="warn" label="Open" size="sm" />
          </li>
          <li>
            <span className="doclist__name">
              QA formats and forms
              <span className="doclist__sub">To be shared by Asim, with two days alongside the IT team</span>
            </span>
            <StatusChip tone="warn" label="Open" size="sm" />
          </li>
          <li>
            <span className="doclist__name">
              Does a missing mandatory quality parameter block the contract, the shipment, or nothing?
              <span className="doclist__sub">Not stated, so nothing is blocked here</span>
            </span>
            <StatusChip tone="warn" label="Open" size="sm" />
          </li>
        </ul>
      </CollapsibleSection>
    </>
  );
}

/** `ErrorSummary` takes an ordered list; the pages keep their errors in a map. */
function errorRows(errors: Record<string, string>): { field: string; message: string }[] {
  return Object.entries(errors)
    .filter(([, message]) => Boolean(message))
    .map(([field, message]) => ({ field, message }));
}

function ContractDetailsTab({ c }: { c: Contract }) {
  const commodity = commodityById(c.commodityId);
  const lotCheck = validateLotTotal(
    c,
    c.lots.map((l) => l.quantityMt),
  );
  return (
    <>
      <CollapsibleSection title="Basic details">
        <FieldGrid
          fields={[
            { label: "Contract number", value: c.contractNo, behaviour: "readonly" },
            { label: "Created", value: formatDate(c.createdDate), behaviour: "readonly" },
            { label: "Business confirmation date", value: formatDate(c.businessConfirmationDate) },
            { label: "Status", value: humanise(c.status) },
            { label: "Origin", value: COUNTRY_PROFILES[c.origin].name },
            { label: "SAP number", value: c.sapNumber },
            { label: "Assigned Dubai execution", value: c.assignedDubaiExecution },
            { label: "Large volume", value: c.isLargeVolume ? "Yes" : "No" },
          ]}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Buyer & document instruction">
        <FieldGrid
          fields={[
            { label: "Buyer", value: counterpartyName(c.buyerId) },
            { label: "Buyer address", value: c.buyerAddress, behaviour: "required" },
            { label: "Buyer nickname", value: c.buyerNickName, behaviour: "required" },
            { label: "Consignee", value: c.consignee },
            { label: "Notify party", value: c.notifyParty },
            { label: "Nominated surveyor (buyer)", value: counterpartyName(c.nominatedSurveyorId) },
          ]}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Shipment lots"
        indicator={
          <StatusChip
            tone={lotCheck.valid ? "ok" : "risk"}
            label={
              lotCheck.valid
                ? `${formatMt(lotCheck.total)} of ${formatMt(lotCheck.max)} ceiling`
                : "Exceeds ceiling"
            }
            size="sm"
          />
        }
      >
        {!lotCheck.valid ? (
          <Banner tone="risk" title="Lot quantities exceed the contract ceiling">
            {lotCheck.message}
          </Banner>
        ) : null}
        <table className="dash__table">
          <caption className="sr-only">Shipment lots</caption>
          <thead>
            <tr>
              <th scope="col">Lot</th>
              <th scope="col" className="text-right">
                Quantity
              </th>
              <th scope="col" className="text-right">
                Containers
              </th>
            </tr>
          </thead>
          <tbody>
            {c.lots.map((l) => (
              <tr key={l.lotNo}>
                <td>{l.lotNo}</td>
                <td className="text-right">{formatMt(l.quantityMt)}</td>
                <td className="text-right">{l.containerCount || "–"}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total</strong>
              </td>
              <td className="text-right">
                <strong>{formatMt(lotCheck.total)}</strong>
              </td>
              <td className="text-right">
                <strong>{c.lots.reduce((a, l) => a + l.containerCount, 0) || "–"}</strong>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="small muted" style={{ marginTop: "0.5rem" }}>
          Ceiling {formatMt(maxAllowedQuantity(c))} = contracted {formatMt(c.quantityMt)} + {c.tolerancePct}%
          tolerance (rule R3). The legacy form saved 110 MT against a 100 MT contract at 5%.
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Quality terms" defaultOpen={false}>
        {commodity ? (
          <table className="dash__table">
            <caption className="sr-only">Quality parameters</caption>
            <thead>
              <tr>
                <th scope="col">Parameter</th>
                <th scope="col">Specification</th>
              </tr>
            </thead>
            <tbody>
              {commodity.qualityParameters.map((q) => (
                <tr key={q.name}>
                  <td>{q.name}</td>
                  <td>{q.spec}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="No commodity selected" />
        )}
        <p className="small muted" style={{ marginTop: "0.5rem" }}>
          Retrieved from commodity master data and overridable per buyer (proposed — rule R27).
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Cargo instruction & notes" defaultOpen={false}>
        <FieldGrid
          columns={1}
          fields={[
            { label: "Cargo instruction", value: c.cargoInstruction },
            { label: "Note", value: c.note },
          ]}
        />
      </CollapsibleSection>
    </>
  );
}

function ContractShipmentsTab({ shipments }: { shipments: Shipment[] }) {
  if (shipments.length === 0) {
    return (
      <div className="card">
        <EmptyState
          title="No shipment yet"
          action={
            <Link className="btn btn--primary" to="/shipments/new">
              Create a shipment
            </Link>
          }
        >
          Nothing has been raised against this contract.
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="dtable__scroll">
        <table className="dtable__table">
          <caption className="sr-only">Shipments against this contract</caption>
          <thead>
            <tr>
              <th scope="col">Shipment</th>
              <th scope="col">Type</th>
              <th scope="col">Status</th>
              <th scope="col" className="text-right">
                Quantity
              </th>
              <th scope="col">Documents</th>
              <th scope="col">Owner</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => {
              const comp = documentCompleteness(s.documents);
              return (
                <tr key={s.id}>
                  <td>
                    <Link to={`/shipments/${s.id}`}>{s.shipmentNo}</Link>
                  </td>
                  <td>{SHIPMENT_TYPE_LABEL[s.shipmentType]}</td>
                  <td>
                    <StatusChip tone={toneFor(s.status)} label={SHIPMENT_STATUS_LABEL[s.status]} size="sm" />
                  </td>
                  <td className="text-right">{formatMt(s.quantityMt)}</td>
                  <td className="small">
                    {comp.required === 0 ? "–" : `${comp.atOriginal}/${comp.required} at original`}
                  </td>
                  <td className="small">{s.assignedTo}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AuditList({
  events,
}: {
  events: {
    id: string;
    at: string;
    actor: string;
    actorRole: keyof typeof ROLE_LABEL;
    action: string;
    entity: string;
    field?: string;
    from?: string;
    to?: string;
    note?: string;
  }[];
}) {
  if (events.length === 0) return <EmptyState title="No audit events recorded" />;
  return (
    <ol className="audit">
      {[...events].reverse().map((e) => (
        <li key={e.id}>
          <div className="audit__when">
            <time dateTime={e.at}>{formatDate(e.at.slice(0, 10))}</time>
            <span className="muted xsmall">{e.at.slice(11, 16)}</span>
          </div>
          <div className="audit__body">
            <p className="audit__action">
              <strong>{e.action}</strong> — {e.entity}
            </p>
            {e.field ? (
              <p className="small">
                <code>{e.field}</code>: <span className="muted">{e.from ?? "—"}</span> →{" "}
                <strong>{e.to ?? "—"}</strong>
              </p>
            ) : e.to ? (
              <p className="small">
                → <strong>{e.to}</strong>
              </p>
            ) : null}
            {e.note ? <p className="small muted">{e.note}</p> : null}
            <p className="xsmall muted">
              {e.actor} · {ROLE_LABEL[e.actorRole]}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ================================================================== *
 * Contract edit form (mock-up: a representative subset of fields)
 * ================================================================== */

export function ContractForm() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const contract = useAsync(() => api.getContract(id), [id]);
  const c = contract.data;

  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  if (contract.loading)
    return (
      <div className="page">
        <div className="card card__body muted">Loading…</div>
      </div>
    );
  if (!c) {
    return (
      <div className="page">
        <EmptyState
          title="Contract not found"
          action={
            <Link className="btn btn--primary" to="/contracts">
              Back to contracts
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        moduleLabel="Contracts"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Contracts", to: "/contracts" },
          { label: c.contractNo, to: `/contracts/${c.id}` },
          { label: "Edit" },
        ]}
        title={`Edit ${c.contractNo}`}
        meta="Commercial terms are read-only in the mock-up; the note and review feedback are editable"
        recordKey={c.contractNo}
      />
      <div className="page">
        <Banner tone="info" title="Scope of this form in the mock-up">
          Contract commercial terms come from SAP in the target design, so they are shown read-only here. The
          editable fields demonstrate validation, inherited/read-only field states and the save/cancel
          pattern.
        </Banner>

        <form
          className="card card__body stack"
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(true);
            toast.push("ok", "Contract note saved.");
            navigate(`/contracts/${c.id}`);
          }}
        >
          <FieldGrid
            fields={[
              { label: "Contract number", value: c.contractNo, behaviour: "readonly" },
              { label: "Buyer", value: counterpartyName(c.buyerId), behaviour: "inherited" },
              { label: "Commodity", value: commodityById(c.commodityId)?.name, behaviour: "inherited" },
              { label: "Quantity", value: formatMt(c.quantityMt), behaviour: "inherited" },
              {
                label: "Ceiling with tolerance",
                value: formatMt(maxAllowedQuantity(c)),
                behaviour: "calculated",
              },
              { label: "Incoterm", value: c.incoterm, behaviour: "inherited" },
            ]}
          />
          <div className="frow">
            <label className="frow__label" htmlFor="ct-note">
              Contract note
            </label>
            <textarea
              id="ct-note"
              className="input"
              rows={4}
              value={note || (c.note ?? "")}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="frow__hint">Free text. Visible to every role working the contract.</p>
          </div>
          <div className="factions">
            <button type="submit" className="btn btn--primary">
              Save changes
            </button>
            <Link className="btn" to={`/contracts/${c.id}`}>
              Cancel
            </Link>
            {saved ? (
              <span className="small" style={{ color: "var(--c-ok-700)" }}>
                Saved.
              </span>
            ) : null}
          </div>
        </form>
      </div>
    </>
  );
}
