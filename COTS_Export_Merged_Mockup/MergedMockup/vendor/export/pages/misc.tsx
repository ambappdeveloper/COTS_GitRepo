import { Link } from "react-router-dom";
import { formatDate } from "../domain/calc";
import { humanise } from "../domain/status";
import { ROLE_LABEL, SHIPMENT_TYPE_LABEL, type RiskItem } from "../domain/types";
import { COUNTRY_ORDER, COUNTRY_PROFILES } from "../domain/variants";
import { api } from "../services/store";
import { EmptyState, ErrorState, StatusChip, useToast } from "../components/feedback";
import { CollapsibleSection, PageHeader } from "../components/layout";
import { DataTable, type Column } from "../components/table";
import { useAsync } from "./hooks";

/* ================================================================== *
 * Exceptions & risks queue
 * ================================================================== */

export function ExceptionsQueue() {
  const risks = useAsync(() => api.listRisks());
  const shipments = useAsync(() => api.listShipments());
  const toast = useToast();

  if (risks.error) {
    return (
      <div className="page">
        <ErrorState detail={risks.error} onRetry={risks.reload} />
      </div>
    );
  }

  const rows = risks.data ?? [];
  const ships = shipments.data ?? [];
  const shipmentNo = (id?: string) => ships.find((s) => s.id === id)?.shipmentNo ?? "–";

  const blockedMilestones = ships.flatMap((s) =>
    s.milestones
      .filter((m) => m.state === "blocked")
      .map((m) => ({ shipment: s, key: m.key, reason: m.blockingReason ?? "" })),
  );
  const overdueMilestones = ships.flatMap((s) =>
    s.milestones
      .filter((m) => m.state === "overdue")
      .map((m) => ({ shipment: s, key: m.key, target: m.targetDate })),
  );

  const columns: Column<RiskItem>[] = [
    {
      key: "severity",
      header: "Severity",
      cell: (r) => (
        <StatusChip
          tone={r.severity === "high" ? "risk" : r.severity === "medium" ? "warn" : "info"}
          label={r.severity}
          size="sm"
        />
      ),
      sortValue: (r) => (r.severity === "high" ? 3 : r.severity === "medium" ? 2 : 1),
      filterOptions: [
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ],
      filterMatch: (r, v) => r.severity === v,
    },
    { key: "title", header: "Risk", cell: (r) => <strong>{r.title}</strong>, sortValue: (r) => r.title },
    {
      key: "kind",
      header: "Kind",
      cell: (r) => humanise(r.kind),
      sortValue: (r) => r.kind,
      filterOptions: [...new Set(rows.map((r) => r.kind))].map((k) => ({ value: k, label: humanise(k) })),
      filterMatch: (r, v) => r.kind === v,
    },
    {
      key: "record",
      header: "Record",
      cell: (r) =>
        r.shipmentId ? (
          <Link to={`/shipments/${r.shipmentId}/flow`}>{shipmentNo(r.shipmentId)}</Link>
        ) : r.contractId ? (
          <Link to={`/contracts/${r.contractId}`}>contract</Link>
        ) : (
          <span className="muted">–</span>
        ),
      sortValue: (r) => shipmentNo(r.shipmentId),
    },
    { key: "owner", header: "Owner", cell: (r) => ROLE_LABEL[r.owner], sortValue: (r) => r.owner },
    { key: "due", header: "Due", cell: (r) => formatDate(r.dueDate), sortValue: (r) => r.dueDate ?? "" },
    {
      key: "ack",
      header: "Acknowledged",
      cell: (r) =>
        r.acknowledged ? (
          <StatusChip tone="ok" label="Yes" size="sm" />
        ) : (
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
        ),
      sortValue: (r) => (r.acknowledged ? 1 : 0),
    },
    {
      key: "detail",
      header: "Detail",
      cell: (r) => <span className="small">{r.detail}</span>,
      optional: true,
    },
  ];

  return (
    <>
      <PageHeader
        moduleLabel="Overview"
        crumbs={[{ label: "Home", to: "/" }, { label: "Exceptions & risks" }]}
        title="Exceptions & risks"
        meta="Blocked prerequisites, overdue milestones, expiry and demurrage exposure, and document gaps"
        recordKey={`${rows.filter((r) => !r.acknowledged).length}`}
        recordDate="open risks"
      />
      <div className="page">
        <DataTable
          caption="Risk register"
          rows={rows}
          columns={columns}
          loading={risks.loading}
          searchPlaceholder="Search risks…"
          searchValue={(r) => `${r.title} ${r.detail} ${r.kind} ${shipmentNo(r.shipmentId)}`}
          savedViews={[
            { key: "open", label: "Open risks", predicate: (r) => !r.acknowledged },
            { key: "all", label: "All risks" },
            { key: "high", label: "High severity only", predicate: (r) => r.severity === "high" },
            { key: "dated", label: "With a due date", predicate: (r) => !!r.dueDate },
          ]}
          emptyTitle="No risks match"
        />

        <CollapsibleSection
          title={`Blocked milestones (${blockedMilestones.length})`}
          indicator={
            <StatusChip
              tone={blockedMilestones.length > 0 ? "risk" : "ok"}
              label={blockedMilestones.length > 0 ? "Action needed" : "Clear"}
              size="sm"
            />
          }
        >
          {blockedMilestones.length === 0 ? (
            <EmptyState title="No blocked milestones" glyph="✓" />
          ) : (
            <ul className="doclist">
              {blockedMilestones.map((b) => (
                <li key={`${b.shipment.id}-${b.key}`} className="required">
                  <span className="doclist__name">
                    {humanise(b.key)}
                    <span className="doclist__sub">{b.reason}</span>
                  </span>
                  <StatusChip tone="risk" glyph="⊘" label="Blocked" size="sm" />
                  <span className="small">{b.shipment.shipmentNo}</span>
                  <Link className="btn btn--sm" to={`/shipments/${b.shipment.id}/flow`}>
                    Open flow
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title={`Overdue milestones (${overdueMilestones.length})`}
          indicator={
            <StatusChip
              tone={overdueMilestones.length > 0 ? "warn" : "ok"}
              label={overdueMilestones.length > 0 ? "Past target" : "Clear"}
              size="sm"
            />
          }
        >
          {overdueMilestones.length === 0 ? (
            <EmptyState title="No overdue milestones" glyph="✓" />
          ) : (
            <ul className="doclist">
              {overdueMilestones.map((o) => (
                <li key={`${o.shipment.id}-${o.key}`} className="required">
                  <span className="doclist__name">
                    {humanise(o.key)}
                    <span className="doclist__sub">Target {formatDate(o.target)}</span>
                  </span>
                  <StatusChip tone="risk" glyph="!" label="Overdue" size="sm" />
                  <span className="small">{o.shipment.shipmentNo}</span>
                  <Link className="btn btn--sm" to={`/shipments/${o.shipment.id}/flow`}>
                    Open flow
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>
      </div>
    </>
  );
}

/* ================================================================== *
 * Country & shipment variants
 * ================================================================== */

export function VariantsPage() {
  const shipments = useAsync(() => api.listShipments());
  const ships = shipments.data ?? [];

  const rows: {
    label: string;
    get: (c: (typeof COUNTRY_PROFILES)[keyof typeof COUNTRY_PROFILES]) => React.ReactNode;
  }[] = [
    { label: "Partner entity", get: (c) => c.partnerEntity },
    { label: "Load port", get: (c) => c.loadPort },
    {
      label: "Export contract",
      get: (c) => (
        <StatusChip
          tone={c.usesExportContract ? "ok" : "na"}
          label={c.usesExportContract ? "Applies" : "Not applicable"}
          size="sm"
        />
      ),
    },
    {
      label: "EX forms",
      get: (c) => (
        <StatusChip
          tone={c.usesExportForms ? "ok" : "na"}
          label={c.usesExportForms ? "Applies" : "Not applicable"}
          size="sm"
        />
      ),
    },
    {
      label: "Export permit",
      get: (c) => (
        <StatusChip
          tone={c.usesExportPermit ? "ok" : "na"}
          label={c.usesExportPermit ? "Applies" : "Not applicable"}
          size="sm"
        />
      ),
    },
    {
      label: "Customs starts from",
      get: (c) =>
        c.startsFromCommercialInvoice
          ? "Commercial invoice"
          : c.usesExportContract
            ? "Export contract"
            : "Export permit",
    },
    {
      label: "Logistics service request",
      get: (c) => (
        <StatusChip
          tone={c.usesLogisticsServiceRequest ? "ok" : "na"}
          label={c.usesLogisticsServiceRequest ? "Applies" : "Not applicable"}
          size="sm"
        />
      ),
    },
    {
      label: "Inland transit leg",
      get: (c) => (c.hasInlandTransitLeg ? c.inlandLegLabel : <span className="muted">None</span>),
    },
    {
      label: "OPU / PZU custody",
      get: (c) => (
        <StatusChip
          tone={c.code === "SD" ? "ok" : "na"}
          label={c.code === "SD" ? "Applies" : "Not applicable"}
          size="sm"
        />
      ),
    },
    { label: "Regulators", get: (c) => <span className="small">{c.regulators.join(", ")}</span> },
    {
      label: "Document tracking",
      get: (c) =>
        c.simplifiedDocumentTracking
          ? "Simplified — originals only, no charge tracking"
          : "Full — draft / confirmed / original plus charges",
    },
    {
      label: "Demo shipments",
      get: (c) => {
        const inCountry = ships.filter((s) => s.country === c.code);
        return inCountry.length === 0 ? (
          <span className="muted">none</span>
        ) : (
          inCountry.map((s) => (
            <span key={s.id} style={{ display: "block" }}>
              <Link to={`/shipments/${s.id}/flow`}>{s.shipmentNo}</Link>{" "}
              <span className="muted xsmall">{SHIPMENT_TYPE_LABEL[s.shipmentType]}</span>
            </span>
          ))
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        moduleLabel="Support"
        crumbs={[{ label: "Home", to: "/" }, { label: "Country & shipment variants" }]}
        title="Country & shipment variants"
        meta="How the validated export process genuinely differs by operating unit and by shipment type"
        recordKey={`${COUNTRY_ORDER.length}`}
        recordDate="operating units"
      />
      <div className="page">
        <div className="card card__body">
          <h2 className="page__title">Why this page exists</h2>
          <p className="page__intro" style={{ marginTop: "0.5rem" }}>
            The CTRM reference application shows a single universal execution line. The COTS export process
            does not have one: the export contract does not exist in Tanzania, EX forms are essentially
            Sudan-only, Mozambique starts its customs process from a commercial invoice, Chad and Ethiopia
            both add an inland leg, and bulk or charter shipments replace container stuffing with vessel
            loading. Forcing all of that into one line would be actively misleading, so the expanded execution
            flow branches and marks inapplicable milestones <em>Not applicable</em>.
          </p>
          <p className="page__intro" style={{ marginTop: "0.5rem" }}>
            This matrix is <strong>provisional</strong>. The workshop notes record that an authoritative
            country / execution-contract matrix is being prepared and it is not yet in the source folder —
            decision D3 in the process document.
          </p>
        </div>

        <div className="card card__body variantgrid">
          <table>
            <caption className="sr-only">Country and operating-unit variant matrix</caption>
            <thead>
              <tr>
                <th scope="col">Attribute</th>
                {COUNTRY_ORDER.map((c) => (
                  <th scope="col" key={c}>
                    {COUNTRY_PROFILES[c].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  {COUNTRY_ORDER.map((c) => (
                    <td key={c}>{r.get(COUNTRY_PROFILES[c])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <CollapsibleSection title="Shipment-type variants">
          <ul className="doclist">
            {(
              [
                [
                  "container",
                  "Booking with a shipping line; empty container inspection, daily stuffing, sealing under surveyor supervision, movement to port. The bulk of the legacy data.",
                ],
                [
                  "bulk",
                  "Charter party with the vessel's agent instead of a line booking; vessel loading operation with a daily rate; the port cycle and demurrage model apply.",
                ],
                [
                  "break_bulk",
                  "As bulk — one voyage or a period charter. The legacy Bulk & Break Bulk views hold between zero and six records.",
                ],
                [
                  "road",
                  "Transporter contract; trucks loaded and weighed; a separate document set per truck for refrigerated meat, one set for the whole consignment for commodities; documents couriered with the convoy.",
                ],
                [
                  "air",
                  "Airline reservation and delivery at flight time; an AWB in place of a bill of lading.",
                ],
              ] as const
            ).map(([type, note]) => {
              const inType = ships.filter((s) => s.shipmentType === type);
              return (
                <li key={type} className={inType.length > 0 ? "required" : "na"}>
                  <span className="doclist__name">
                    {SHIPMENT_TYPE_LABEL[type]}
                    <span className="doclist__sub">{note}</span>
                  </span>
                  <StatusChip
                    tone={inType.length > 0 ? "ok" : "na"}
                    label={inType.length > 0 ? `${inType.length} demo` : "not in demo data"}
                    size="sm"
                  />
                  <span className="small">
                    {inType.map((s) => (
                      <Link key={s.id} to={`/shipments/${s.id}/flow`} style={{ marginRight: "0.5rem" }}>
                        {s.shipmentNo}
                      </Link>
                    ))}
                  </span>
                  <span />
                </li>
              );
            })}
          </ul>
          <p className="small muted" style={{ marginTop: "0.5rem" }}>
            The workshop notes state that road, bulk-vessel and air shipment detail is still "to be designed"
            and that Export Direct covers containerised shipment only — so these branches carry the evidenced
            milestones and no more (decision D20).
          </p>
        </CollapsibleSection>

        <CollapsibleSection title="Other variants" defaultOpen={false}>
          <ul className="doclist">
            <li className="required">
              <span className="doclist__name">
                Large-volume contracts
                <span className="doclist__sub">
                  A parallel legacy chain of six libraries. Merged here behind an <code>isLargeVolume</code>{" "}
                  flag, which the legacy screens already carry on every form.
                </span>
              </span>
              <StatusChip tone="ok" label={`${ships.filter((s) => s.isLargeVolume).length} demo`} size="sm" />
              <span className="small">
                {ships
                  .filter((s) => s.isLargeVolume)
                  .map((s) => (
                    <Link key={s.id} to={`/shipments/${s.id}/flow`} style={{ marginRight: "0.5rem" }}>
                      {s.shipmentNo}
                    </Link>
                  ))}
              </span>
              <span />
            </li>
            <li className="required">
              <span className="doclist__name">
                Freight-forwarder handled
                <span className="doclist__sub">
                  The forwarder handles the whole booking and shipment process. Ethiopia and Chad are
                  forwarder-driven throughout.
                </span>
              </span>
              <StatusChip
                tone="ok"
                label={`${ships.filter((s) => s.usesFreightForwarder).length} demo`}
                size="sm"
              />
              <span className="small">
                {ships
                  .filter((s) => s.usesFreightForwarder)
                  .map((s) => (
                    <Link key={s.id} to={`/shipments/${s.id}/flow`} style={{ marginRight: "0.5rem" }}>
                      {s.shipmentNo}
                    </Link>
                  ))}
              </span>
              <span />
            </li>
            <li className="na">
              <span className="doclist__name">
                Gold
                <span className="doclist__sub">
                  SSMO is issued <em>before</em> the export contract, per Ministry of Trade requirements — a
                  genuine reordering of the pre-clearance phase, modelled but not represented in the demo
                  data.
                </span>
              </span>
              <StatusChip tone="na" label="modelled" size="sm" />
              <span />
              <span />
            </li>
            <li className="na">
              <span className="doclist__name">
                Cross-country sourcing and processing
                <span className="doclist__sub">
                  Adds an intermediate clearance at the country of origin, between sourcing and delivery of
                  material to the processing location.
                </span>
              </span>
              <StatusChip tone="na" label="modelled" size="sm" />
              <span />
              <span />
            </li>
          </ul>
        </CollapsibleSection>
      </div>
    </>
  );
}

/* ================================================================== *
 * Not found
 * ================================================================== */

export function NotFoundPage() {
  return (
    <div className="page">
      <div className="card card__body notfound">
        <p className="notfound__code" aria-hidden="true">
          404
        </p>
        <h1 className="page__title">That page could not be found</h1>
        <p className="page__intro">
          The address you followed does not match any screen in this mock-up. It may have been mistyped, or it
          may point at a module that has not been built yet.
        </p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn btn--primary" to="/">
            Back to the springboard
          </Link>
          <Link className="btn" to="/dashboard">
            Go to the dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
