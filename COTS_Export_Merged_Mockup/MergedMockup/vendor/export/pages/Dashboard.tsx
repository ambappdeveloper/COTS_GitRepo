import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { commodityById, portName } from "../data/master";
import {
  TODAY,
  daysRemaining,
  documentCompleteness,
  formatDate,
  formatMt,
  quantityBalance,
  shipmentOverdueCount,
  shipmentProgress,
} from "../domain/calc";
import { resolveMilestones, variantContextOf } from "../domain/milestones";
import { SHIPMENT_STATUS_LABEL, ROLE_LABEL, type RiskItem, type Shipment } from "../domain/types";
import { COUNTRY_PROFILES } from "../domain/variants";
import { toneFor } from "../domain/status";
import { api } from "../services/store";
import { Banner, EmptyState, ErrorState, SkeletonRows, StatusChip } from "../components/feedback";
import { PageHeader, SummaryCard } from "../components/layout";
import { useAsync } from "./hooks";
import "./dashboard.css";

export function Dashboard() {
  const { user } = useAuth();
  const shipments = useAsync(() => api.listShipments());
  const contracts = useAsync(() => api.listContracts());
  const risks = useAsync(() => api.listRisks());

  if (shipments.error || contracts.error) {
    return (
      <div className="page">
        <ErrorState detail={shipments.error ?? contracts.error ?? undefined} onRetry={shipments.reload} />
      </div>
    );
  }

  const loading = shipments.loading || contracts.loading;
  const ships = shipments.data ?? [];
  const cts = contracts.data ?? [];
  const rks = (risks.data ?? []).filter((r) => !r.acknowledged);

  const open = ships.filter((s) => s.status !== "closed" && s.status !== "cancelled");
  const blocked = ships.filter((s) => s.milestones.some((m) => m.state === "blocked"));
  const overdue = ships.filter((s) => shipmentOverdueCount(s) > 0);
  const docGaps = ships
    .map((s) => ({ s, c: documentCompleteness(s.documents) }))
    .filter((x) => x.c.required > 0 && x.c.fraction < 1 && x.s.status !== "closed");

  const upcoming = ships
    .flatMap((s) =>
      s.milestones
        .filter((m) => m.targetDate && m.state !== "completed" && m.state !== "not_applicable")
        .map((m) => ({ shipment: s, milestoneKey: m.key, date: m.targetDate!, owner: m.ownerName })),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  return (
    <>
      <PageHeader
        moduleLabel="Overview"
        crumbs={[{ label: "Home", to: "/" }, { label: "Export operations dashboard" }]}
        title="Export operations dashboard"
        meta={
          <>
            {user ? `${user.displayName} · ${ROLE_LABEL[user.role]} · ${user.unit}` : ""} · as at{" "}
            {formatDate(TODAY)}
          </>
        }
        recordKey={`${open.length}`}
        recordDate="open shipments"
      />

      <div className="page">
        {loading ? (
          <div className="card">
            <SkeletonRows rows={4} cols={4} />
          </div>
        ) : (
          <>
            {/* --- Workload tiles --- */}
            <section aria-labelledby="dash-workload">
              <h2 className="page__title" id="dash-workload">
                My workload
              </h2>
              <div className="grid-4" style={{ marginTop: "0.75rem" }}>
                <Tile
                  label="Open shipments"
                  value={open.length}
                  to="/shipments"
                  hint="Not closed or cancelled"
                />
                <Tile
                  label="Blocked milestones"
                  value={blocked.length}
                  to="/exceptions"
                  hint="Shipments with an unmet prerequisite"
                  tone={blocked.length > 0 ? "risk" : "ok"}
                />
                <Tile
                  label="Overdue milestones"
                  value={overdue.length}
                  to="/exceptions"
                  hint="Past their target date"
                  tone={overdue.length > 0 ? "warn" : "ok"}
                />
                <Tile
                  label="Document gaps"
                  value={docGaps.length}
                  to="/documents"
                  hint="Required documents not yet at original"
                  tone={docGaps.length > 0 ? "warn" : "ok"}
                />
              </div>
            </section>

            {/* --- Risk alerts --- */}
            <section aria-labelledby="dash-risks">
              <h2 className="page__title" id="dash-risks">
                Risk alerts
              </h2>
              <p className="page__intro">
                Every alert links to the record it affects. Severity is shown with a glyph and a word as well
                as a colour.
              </p>
              <div className="stack" style={{ marginTop: "0.75rem" }}>
                {rks.length === 0 ? (
                  <div className="card">
                    <EmptyState title="No open risk alerts" glyph="✓">
                      Everything currently within its target dates and prerequisites.
                    </EmptyState>
                  </div>
                ) : (
                  rks
                    .sort((a, b) => severityRank(b) - severityRank(a))
                    .map((r) => <RiskRow key={r.id} risk={r} shipments={ships} />)
                )}
              </div>
            </section>

            <div className="grid-2">
              {/* --- Shipment status --- */}
              <SummaryCard title="Shipment status">
                <ul className="dash__statuslist">
                  {(
                    [
                      "draft",
                      "planned",
                      "booked",
                      "cleared",
                      "stuffed",
                      "sailed",
                      "documents_complete",
                      "closed",
                    ] as Shipment["status"][]
                  ).map((st) => {
                    const n = ships.filter((s) => s.status === st).length;
                    return (
                      <li key={st}>
                        <StatusChip tone={toneFor(st)} label={SHIPMENT_STATUS_LABEL[st]} size="sm" />
                        <span className="dash__bar" aria-hidden="true">
                          <span style={{ width: `${ships.length ? (n / ships.length) * 100 : 0}%` }} />
                        </span>
                        <strong>{n}</strong>
                      </li>
                    );
                  })}
                </ul>
              </SummaryCard>

              {/* --- Contract consumption --- */}
              <SummaryCard title="Contract quantity used vs remaining">
                <table className="dash__table">
                  <caption className="sr-only">Contract quantity consumption</caption>
                  <thead>
                    <tr>
                      <th scope="col">Contract</th>
                      <th scope="col">Commodity</th>
                      <th scope="col" className="text-right">
                        Contracted
                      </th>
                      <th scope="col" className="text-right">
                        Shipped
                      </th>
                      <th scope="col" className="text-right">
                        Remaining
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cts.map((c) => {
                      const shipped = ships
                        .filter((s) => s.contractId === c.id && s.status !== "cancelled")
                        .reduce((a, s) => a + s.quantityMt, 0);
                      const b = quantityBalance(c, { shippedMt: shipped });
                      return (
                        <tr key={c.id}>
                          <td>
                            <Link to={`/contracts/${c.id}`}>{c.contractNo}</Link>
                          </td>
                          <td>{commodityById(c.commodityId)?.name ?? "–"}</td>
                          <td className="text-right">{formatMt(b.contractQuantityMt)}</td>
                          <td className="text-right">{formatMt(b.shippedMt)}</td>
                          <td className="text-right">
                            <strong>{formatMt(b.remainingMt)}</strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </SummaryCard>
            </div>

            {/* --- Pending actions --- */}
            <section aria-labelledby="dash-actions">
              <h2 className="page__title" id="dash-actions">
                Pending actions
              </h2>
              <div className="card" style={{ marginTop: "0.75rem" }}>
                <div className="dtable__scroll">
                  <table className="dtable__table">
                    <caption className="sr-only">Shipments needing attention</caption>
                    <thead>
                      <tr>
                        <th scope="col">Shipment</th>
                        <th scope="col">Route</th>
                        <th scope="col">Status</th>
                        <th scope="col">Next action</th>
                        <th scope="col">Owner</th>
                        <th scope="col" className="text-right">
                          Progress
                        </th>
                        <th scope="col">Documents</th>
                      </tr>
                    </thead>
                    <tbody>
                      {open.map((s) => {
                        const resolved = resolveMilestones(
                          s.milestones,
                          variantContextOf(s, COUNTRY_PROFILES[s.country]),
                          TODAY,
                          s.documents,
                        );
                        const next =
                          resolved.find((m) => m.state === "blocked") ??
                          resolved.find((m) => m.state === "overdue") ??
                          resolved.find((m) => m.state === "in_progress") ??
                          resolved.find((m) => m.state === "ready");
                        const comp = documentCompleteness(s.documents);
                        return (
                          <tr key={s.id}>
                            <td>
                              <Link to={`/shipments/${s.id}`}>{s.shipmentNo}</Link>
                              <br />
                              <span className="muted xsmall">
                                {COUNTRY_PROFILES[s.country].name} · {s.shipmentType}
                              </span>
                            </td>
                            <td className="small">
                              {portName(s.portOfLoadingId)} → {portName(s.portOfDischargeId)}
                            </td>
                            <td>
                              <StatusChip
                                tone={toneFor(s.status)}
                                label={SHIPMENT_STATUS_LABEL[s.status]}
                                size="sm"
                              />
                            </td>
                            <td className="small">
                              {next ? (
                                <>
                                  {next.def.name}
                                  <br />
                                  <span className="muted xsmall">
                                    {next.state === "blocked"
                                      ? "Blocked"
                                      : next.targetDate
                                        ? `target ${formatDate(next.targetDate)}`
                                        : ""}
                                  </span>
                                </>
                              ) : (
                                <span className="muted">–</span>
                              )}
                            </td>
                            <td className="small">{next?.ownerName ?? s.assignedTo}</td>
                            <td className="text-right small">{Math.round(shipmentProgress(s) * 100)}%</td>
                            <td className="small">
                              {comp.required === 0 ? (
                                <span className="muted">–</span>
                              ) : (
                                <>
                                  {comp.atOriginal}/{comp.required} at original
                                  <span className="dash__bar dash__bar--inline" aria-hidden="true">
                                    <span style={{ width: `${comp.fraction * 100}%` }} />
                                  </span>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* --- Upcoming milestones --- */}
            <section aria-labelledby="dash-upcoming">
              <h2 className="page__title" id="dash-upcoming">
                Upcoming milestones
              </h2>
              <div className="card card__body" style={{ marginTop: "0.75rem" }}>
                <ol className="dash__upcoming">
                  {upcoming.length === 0 ? (
                    <li className="muted">No target dates set on open milestones.</li>
                  ) : (
                    upcoming.map((u) => {
                      const left = daysRemaining(u.date);
                      const late = left !== undefined && left < 0;
                      return (
                        <li key={`${u.shipment.id}-${u.milestoneKey}`}>
                          <span className={`dash__date ${late ? "dash__date--late" : ""}`}>
                            {formatDate(u.date)}
                          </span>
                          <span className="dash__mname">{u.milestoneKey.replace(/_/g, " ")}</span>
                          <Link to={`/shipments/${u.shipment.id}/flow`}>{u.shipment.shipmentNo}</Link>
                          <span className="muted small">{u.owner ?? u.shipment.assignedTo}</span>
                          {late ? (
                            <StatusChip
                              tone="risk"
                              glyph="!"
                              label={`${Math.abs(left!)} day(s) late`}
                              size="sm"
                            />
                          ) : (
                            <StatusChip tone="info" label={`in ${left} day(s)`} size="sm" />
                          )}
                        </li>
                      );
                    })
                  )}
                </ol>
              </div>
            </section>

            <Banner tone="info" title="This is a mock-up">
              Every record is synthetic. Statements marked as proposals in{" "}
              <code>docs/export/export-process-update.md</code> are not descriptions of the current system —
              see §14 of that document for the decisions still needed from a process owner.
            </Banner>
          </>
        )}
      </div>
    </>
  );
}

function severityRank(r: RiskItem): number {
  return r.severity === "high" ? 3 : r.severity === "medium" ? 2 : 1;
}

function Tile({
  label,
  value,
  hint,
  to,
  tone = "info",
}: {
  label: string;
  value: number;
  hint: string;
  to: string;
  tone?: "info" | "ok" | "warn" | "risk";
}) {
  return (
    <Link to={to} className={`tile tile--${tone}`}>
      <span className="tile__value">{value}</span>
      <span className="tile__label">{label}</span>
      <span className="tile__hint">{hint}</span>
    </Link>
  );
}

function RiskRow({ risk, shipments }: { risk: RiskItem; shipments: Shipment[] }) {
  const tone = risk.severity === "high" ? "risk" : risk.severity === "medium" ? "warn" : "info";
  const shipment = shipments.find((s) => s.id === risk.shipmentId);
  const target = shipment
    ? `/shipments/${shipment.id}/flow`
    : risk.contractId
      ? `/contracts/${risk.contractId}`
      : "/exceptions";
  return (
    <div className={`riskrow riskrow--${tone}`}>
      <StatusChip tone={tone} label={risk.severity} size="sm" />
      <div className="riskrow__body">
        <p className="riskrow__title">{risk.title}</p>
        <p className="riskrow__detail small">{risk.detail}</p>
        <p className="riskrow__meta xsmall muted">
          Owner: {ROLE_LABEL[risk.owner]}
          {risk.dueDate ? ` · due ${formatDate(risk.dueDate)}` : ""}
          {shipment ? ` · ${shipment.shipmentNo}` : ""}
        </p>
      </div>
      <Link className="btn btn--sm" to={target}>
        Open
      </Link>
    </div>
  );
}
