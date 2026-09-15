/**
 * Clearance, stuffing & loading, documents & charges, and post-shipment & bank.
 * Each module has a list page and a per-shipment workspace.
 */

import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { commodityById, portName } from "../data/master";
import {
  chargeTotals,
  demurrageEstimate,
  documentCompleteness,
  documentPrerequisitesMet,
  formatDate,
  formatMoney,
  formatMt,
  formatNumber,
  freeDayExposure,
  isOverdue,
  money,
  salesOrderPricing,
  stuffingTotals,
} from "../domain/calc";
import {
  BANK_SUBMITTAL_TRANSITIONS,
  DOCUMENT_TRANSITIONS,
  OBL_TRANSITIONS,
  TELEX_RELEASE_TRANSITIONS,
  guardClearanceCompletion,
  guardPostShipmentCompletion,
  humanise,
  nextStates,
  toneFor,
} from "../domain/status";
import {
  CHARGE_TYPE_LABEL,
  CLEARANCE_STAGE_LABEL,
  DOCUMENT_STATE_LABEL,
  REGULATORY_ACTIVITY_LABEL,
  ROLE_LABEL,
  SHIPMENT_DOCUMENT_LABEL,
  SHIPMENT_STATUS_LABEL,
  SHIPMENT_TYPE_LABEL,
  type BankSubmittalStatus,
  type ClearanceStage,
  type ContainerUnit,
  type DocumentState,
  type Money,
  type OblStatus,
  type ProtocolCheckResult,
  type RegulatoryActivityKey,
  type Shipment,
  type ShipmentDocumentKey,
  type TelexReleaseStatus,
} from "../domain/types";
import { COUNTRY_PROFILES } from "../domain/variants";
import { api } from "../services/store";
import { Banner, Dialog, EmptyState, ErrorState, StatusChip, useToast } from "../components/feedback";
import {
  ActionBar,
  CollapsibleSection,
  FieldGrid,
  PageHeader,
  QuantityDonut,
  SummaryCard,
  TotalBanner,
} from "../components/layout";
import { DataTable, type Column } from "../components/table";
import { FormRow, SelectInput, TextArea, TextInput } from "../components/form";
import { useAsync } from "./hooks";

/* ------------------------------------------------------------------ *
 * Shared: a shipment-scoped list page
 * ------------------------------------------------------------------ */

function ShipmentScopedList({
  moduleLabel,
  title,
  intro,
  basePath,
  extraColumns,
  savedViews,
}: {
  moduleLabel: string;
  title: string;
  intro: string;
  basePath: string;
  extraColumns: Column<Shipment>[];
  savedViews?: { key: string; label: string; description?: string; predicate?: (s: Shipment) => boolean }[];
}) {
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
      cell: (s) => <Link to={`${basePath}/${s.id}`}>{s.shipmentNo}</Link>,
      sortValue: (s) => s.shipmentNo,
    },
    {
      key: "country",
      header: "Country",
      cell: (s) => COUNTRY_PROFILES[s.country].name,
      sortValue: (s) => s.country,
    },
    {
      key: "type",
      header: "Type",
      cell: (s) => SHIPMENT_TYPE_LABEL[s.shipmentType],
      sortValue: (s) => s.shipmentType,
    },
    {
      key: "status",
      header: "Shipment status",
      cell: (s) => <StatusChip tone={toneFor(s.status)} label={SHIPMENT_STATUS_LABEL[s.status]} size="sm" />,
      sortValue: (s) => s.status,
    },
    ...extraColumns,
    {
      key: "contract",
      header: "Contract",
      cell: (s) => <Link to={`/contracts/${s.contractId}`}>{contractNo(s.contractId)}</Link>,
      sortValue: (s) => contractNo(s.contractId),
      optional: true,
    },
    {
      key: "owner",
      header: "Owner",
      cell: (s) => s.assignedTo,
      sortValue: (s) => s.assignedTo,
      optional: true,
    },
  ];

  return (
    <>
      <PageHeader
        moduleLabel={moduleLabel}
        crumbs={[{ label: "Home", to: "/" }, { label: title }]}
        title={title}
        meta={intro}
        recordKey={`${rows.length}`}
        recordDate="shipments"
      />
      <div className="page">
        <DataTable
          caption={title}
          rows={rows}
          columns={columns}
          loading={shipments.loading}
          searchPlaceholder="Search by shipment or contract number…"
          searchValue={(s) => `${s.shipmentNo} ${contractNo(s.contractId)}`}
          rowHref={(s) => `${basePath}/${s.id}`}
          savedViews={savedViews}
        />
      </div>
    </>
  );
}

function useShipmentWorkspace(id: string) {
  const shipment = useAsync(() => api.getShipment(id), [id]);
  const contracts = useAsync(() => api.listContracts());
  const vessels = useAsync(() => api.listVesselCalls());
  return {
    shipment,
    contract: (contracts.data ?? []).find((c) => c.id === shipment.data?.contractId),
    vessel: (vessels.data ?? []).find((v) => v.id === shipment.data?.vesselCallId),
    vessels: vessels.data ?? [],
  };
}

function WorkspaceHeader({
  s,
  moduleLabel,
  moduleTitle,
  basePath,
  statusChip,
  extraMeta,
}: {
  s: Shipment;
  moduleLabel: string;
  moduleTitle: string;
  basePath: string;
  statusChip?: React.ReactNode;
  extraMeta?: string;
}) {
  return (
    <PageHeader
      moduleLabel={moduleLabel}
      crumbs={[{ label: "Home", to: "/" }, { label: moduleTitle, to: basePath }, { label: s.shipmentNo }]}
      title={`${moduleTitle} — ${s.shipmentNo}`}
      statusChip={statusChip}
      meta={
        <>
          {COUNTRY_PROFILES[s.country].name} · {SHIPMENT_TYPE_LABEL[s.shipmentType]} ·{" "}
          {formatMt(s.quantityMt)} · {portName(s.portOfLoadingId)} → {portName(s.portOfDischargeId)}
          {extraMeta ? ` · ${extraMeta}` : ""}
        </>
      }
      recordKey={s.shipmentNo}
      recordDate={formatDate(s.createdDate)}
      actions={
        <div className="actionbar">
          <Link className="btn btn--on-brand" to={`/shipments/${s.id}`}>
            Open shipment
          </Link>
          <Link className="btn btn--on-brand" to={`/shipments/${s.id}/flow`}>
            Execution flow
          </Link>
        </div>
      }
    />
  );
}

function NotFoundInModule({ basePath, label }: { basePath: string; label: string }) {
  return (
    <div className="page">
      <EmptyState
        title="Shipment not found"
        action={<Link className="btn btn--primary" to={basePath}>{`Back to ${label}`}</Link>}
      />
    </div>
  );
}

/* ================================================================== *
 * Clearance
 * ================================================================== */

const STAGE_ACTIVITIES: Record<ClearanceStage, RegulatoryActivityKey[]> = {
  custom_clearance: ["customs_declaration", "customs_release", "tancis_declaration", "tra_release_order"],
  ssmo: ["ssmo_sampling", "ssmo_certificate", "atomic_certificate"],
  fumigation: ["fumigation", "plant_protection"],
  stuffing_operation: ["examination", "spc", "vgm"],
  clearance_certificate: ["health_veterinary", "surveyor_appointment"],
};

export function ClearanceList() {
  return (
    <ShipmentScopedList
      moduleLabel="Pre-clearance & clearance"
      title="Clearance"
      intro="Customs declaration and release, SSMO, plant protection, examination, SPC and the clearance certificate"
      basePath="/clearance"
      savedViews={[
        {
          key: "open",
          label: "Clearance not complete",
          predicate: (s) => s.clearance.status !== "completed",
        },
        { key: "all", label: "All shipments" },
        {
          key: "outstanding",
          label: "Outstanding activities",
          description: "Applicable regulatory activities not yet recorded.",
          predicate: (s) => s.clearance.activities.some((a) => a.applicable && !a.completedDate),
        },
      ]}
      extraColumns={[
        {
          key: "clNo",
          header: "Clearance",
          cell: (s) => s.clearance.clearanceNo ?? "–",
          sortValue: (s) => s.clearance.clearanceNo ?? "",
        },
        {
          key: "clStatus",
          header: "Clearance status",
          cell: (s) => (
            <StatusChip tone={toneFor(s.clearance.status)} label={humanise(s.clearance.status)} size="sm" />
          ),
          sortValue: (s) => s.clearance.status,
        },
        {
          key: "activities",
          header: "Activities",
          cell: (s) => {
            const app = s.clearance.activities.filter((a) => a.applicable);
            const done = app.filter((a) => a.completedDate).length;
            return `${done}/${app.length}`;
          },
          sortValue: (s) => {
            const app = s.clearance.activities.filter((a) => a.applicable);
            return app.length === 0 ? 0 : app.filter((a) => a.completedDate).length / app.length;
          },
        },
        {
          key: "declaration",
          header: "Declaration",
          cell: (s) => s.clearance.declarationNo ?? "–",
          sortValue: (s) => s.clearance.declarationNo ?? "",
        },
        {
          key: "release",
          header: "Customs release",
          cell: (s) => formatDate(s.clearance.customsReleaseDate),
          sortValue: (s) => s.clearance.customsReleaseDate ?? "",
        },
      ]}
    />
  );
}

export function ClearanceWorkspace() {
  const { id = "" } = useParams();
  const toast = useToast();
  const { shipment } = useShipmentWorkspace(id);
  const [selected, setSelected] = useState<RegulatoryActivityKey | null>(null);
  const [refDraft, setRefDraft] = useState("");
  const [dateDraft, setDateDraft] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  if (shipment.error)
    return (
      <div className="page">
        <ErrorState detail={shipment.error} onRetry={shipment.reload} />
      </div>
    );
  if (shipment.loading)
    return (
      <div className="page">
        <div className="card card__body muted">Loading clearance…</div>
      </div>
    );
  const s = shipment.data;
  if (!s) return <NotFoundInModule basePath="/clearance" label="clearance" />;

  const profile = COUNTRY_PROFILES[s.country];
  const cl = s.clearance;
  const applicable = cl.activities.filter((a) => a.applicable);
  const completionGuard = guardClearanceCompletion(cl.activities);
  const active = selected ? cl.activities.find((a) => a.key === selected) : null;

  const stageDone = (stage: ClearanceStage) => {
    const keys = STAGE_ACTIVITIES[stage];
    const inScope = cl.activities.filter((a) => keys.includes(a.key) && a.applicable);
    if (inScope.length === 0) return "not_applicable" as const;
    return inScope.every((a) => a.completedDate) ? ("completed" as const) : ("pending" as const);
  };

  return (
    <>
      <WorkspaceHeader
        s={s}
        moduleLabel="Pre-clearance & clearance"
        moduleTitle="Clearance"
        basePath="/clearance"
        statusChip={<StatusChip tone={toneFor(cl.status)} label={humanise(cl.status)} />}
        extraMeta={cl.clearanceNo}
      />

      <div className="page">
        {/* Five-stage progress band — the legacy Clearance form's own idea, kept. */}
        <SummaryCard title="Clearance progress band">
          <p className="small muted">
            The five stages come from the legacy Clearance form's own rule-driven progress band, which is one
            of the genuinely good ideas in that estate. Only the blank form reveals all five — the live record
            shows three.
          </p>
          <ul className="kvbars" style={{ marginTop: "0.75rem" }}>
            {(Object.keys(CLEARANCE_STAGE_LABEL) as ClearanceStage[]).map((stage) => {
              const st = stageDone(stage);
              return (
                <li key={stage} style={{ gridTemplateColumns: "14rem 1fr 8rem" }}>
                  <span className="small">{CLEARANCE_STAGE_LABEL[stage]}</span>
                  <span className="dash__bar" aria-hidden="true">
                    <span
                      style={{
                        width: st === "completed" ? "100%" : st === "not_applicable" ? "0%" : "45%",
                        background: st === "completed" ? "var(--c-ok-700)" : "var(--c-warn-700)",
                      }}
                    />
                  </span>
                  <StatusChip
                    tone={st === "completed" ? "ok" : st === "not_applicable" ? "na" : "warn"}
                    label={
                      st === "completed" ? "Done" : st === "not_applicable" ? "Not applicable" : "In progress"
                    }
                    size="sm"
                  />
                </li>
              );
            })}
          </ul>
        </SummaryCard>

        {!completionGuard.allowed ? (
          <Banner tone="warn" title="Clearance cannot be marked complete yet (rule R20)">
            {completionGuard.reason} The legacy system allowed a record to be marked Completed with the whole
            Plant Protection section empty.
          </Banner>
        ) : (
          <Banner tone="ok" title="All applicable regulatory activities are recorded">
            Clearance may be marked complete and the shipment moved to <em>Cleared</em>.
          </Banner>
        )}

        <CollapsibleSection title="Customs clearance">
          <FieldGrid
            fields={[
              { label: "Clearance number", value: cl.clearanceNo, behaviour: "readonly" },
              { label: "Submitted to customs", value: formatDate(cl.submitToCustomsDate) },
              { label: "Declaration number", value: cl.declarationNo },
              { label: "Customs release", value: formatDate(cl.customsReleaseDate) },
              { label: "Documents to shipping agency", value: formatDate(cl.documentsToShippingAgencyDate) },
              { label: "Set of documents sent to OPU / Dubai", value: formatDate(cl.setOfDocumentsSentDate) },
              { label: "Airway bill", value: cl.airwayBillNo },
            ]}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Regulatory activities"
          indicator={
            <StatusChip
              tone={completionGuard.allowed ? "ok" : "warn"}
              label={`${applicable.filter((a) => a.completedDate).length}/${applicable.length} recorded`}
              size="sm"
            />
          }
        >
          <p className="small muted">
            The set of applicable activities varies by commodity and country — {profile.name} regulators:{" "}
            {profile.regulators.join(", ")}. Select an activity to record it.
          </p>
          <div className="picker" style={{ marginTop: "0.75rem" }}>
            <ul className="picker__list">
              {cl.activities.map((a) => (
                <li key={a.key}>
                  <button
                    type="button"
                    aria-pressed={selected === a.key}
                    onClick={() => {
                      setSelected(a.key);
                      setRefDraft(a.reference ?? "");
                      setDateDraft(a.completedDate ?? "");
                      setFieldError(null);
                    }}
                  >
                    <span aria-hidden="true">{!a.applicable ? "–" : a.completedDate ? "✓" : "○"}</span>
                    <span>{REGULATORY_ACTIVITY_LABEL[a.key]}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="card card__body">
              {!active ? (
                <EmptyState title="Select an activity" glyph="◐">
                  Pick a regulatory activity on the left to see and record its detail.
                </EmptyState>
              ) : (
                <>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <h4 className="card__title">{REGULATORY_ACTIVITY_LABEL[active.key]}</h4>
                    <StatusChip
                      tone={!active.applicable ? "na" : active.completedDate ? "ok" : "warn"}
                      label={
                        !active.applicable
                          ? "Not applicable"
                          : active.completedDate
                            ? "Recorded"
                            : "Outstanding"
                      }
                      size="sm"
                    />
                  </div>
                  <FieldGrid
                    columns={2}
                    fields={[
                      { label: "Owner", value: ROLE_LABEL[active.owner] },
                      { label: "Applicable", value: active.applicable ? "Yes" : "No" },
                      { label: "Recorded on", value: formatDate(active.completedDate) },
                      { label: "Reference", value: active.reference },
                    ]}
                  />
                  <div className="fields" style={{ marginTop: "1rem" }}>
                    <FormRow
                      label="Completion date"
                      htmlFor="cl-date"
                      error={fieldError ?? undefined}
                      hint="Cannot be earlier than the customs submission date."
                    >
                      <TextInput
                        id="cl-date"
                        type="date"
                        value={dateDraft}
                        onChange={setDateDraft}
                        error={fieldError ?? undefined}
                      />
                    </FormRow>
                    <FormRow
                      label="Reference"
                      htmlFor="cl-ref"
                      hint="Certificate, file or declaration number."
                    >
                      <TextInput id="cl-ref" value={refDraft} onChange={setRefDraft} />
                    </FormRow>
                  </div>
                  <div className="factions">
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={!active.applicable}
                      onClick={async () => {
                        setFieldError(null);
                        if (!dateDraft) {
                          setFieldError("Enter the date the activity was completed.");
                          return;
                        }
                        if (cl.submitToCustomsDate && dateDraft < cl.submitToCustomsDate) {
                          setFieldError(
                            `Cannot be earlier than the customs submission date, ${formatDate(cl.submitToCustomsDate)}.`,
                          );
                          return;
                        }
                        const res = await api.setRegulatoryActivity(s.id, active.key, {
                          completedDate: dateDraft,
                          reference: refDraft || undefined,
                        });
                        toast.push(
                          res.ok ? "ok" : "risk",
                          res.ok ? `${REGULATORY_ACTIVITY_LABEL[active.key]} recorded.` : res.reason,
                        );
                      }}
                    >
                      Record activity
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={async () => {
                        const res = await api.setRegulatoryActivity(s.id, active.key, {
                          applicable: !active.applicable,
                          completedDate: undefined,
                        });
                        toast.push(
                          res.ok ? "ok" : "risk",
                          res.ok
                            ? `Marked ${active.applicable ? "not applicable" : "applicable"}.`
                            : res.reason,
                        );
                      }}
                    >
                      Mark {active.applicable ? "not applicable" : "applicable"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Empty container tracking" defaultOpen={false}>
          <Banner tone="info" title="Three recovered fields">
            The legacy clearance library carries these as columns with no form controls at all — "the
            empty-container tracking in particular looks like an intended feature that was never wired up."
          </Banner>
          <FieldGrid
            fields={[
              { label: "Stuffing location", value: cl.stuffingLocation },
              { label: "Empty containers requested", value: formatDate(cl.emptyContainersRequestDate) },
              { label: "Empty containers received", value: formatDate(cl.emptyContainersReceivedDate) },
              { label: "Container count", value: formatNumber(cl.emptyContainerCount) },
              { label: "Surveyor stuffing report", value: formatDate(cl.surveyorStuffingReportDate) },
            ]}
          />
        </CollapsibleSection>

        <CollapsibleSection title="EX forms consumed at clearance" defaultOpen={false}>
          {cl.exFormUsage.length === 0 ? (
            <EmptyState
              title={
                profile.usesExportForms
                  ? "No EX form consumed yet"
                  : `EX forms do not apply in ${profile.name}`
              }
              glyph="–"
            />
          ) : (
            <table className="dash__table">
              <caption className="sr-only">EX forms consumed</caption>
              <thead>
                <tr>
                  <th scope="col">Form</th>
                  <th scope="col" className="text-right">
                    Quantity
                  </th>
                  <th scope="col">PS file</th>
                  <th scope="col">Export certificate</th>
                  <th scope="col">Declaration</th>
                </tr>
              </thead>
              <tbody>
                {cl.exFormUsage.map((f) => (
                  <tr key={f.formNo}>
                    <td className="mono small">{f.formNo}</td>
                    <td className="text-right">{formatMt(f.quantityMt)}</td>
                    <td className="small">{f.psFileNo ?? "–"}</td>
                    <td className="small">{f.exportCertificateNo ?? "–"}</td>
                    <td className="small">{f.declarationNo ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="small muted" style={{ marginTop: "0.5rem" }}>
            An EX form, once consumed, cannot be reused (rule R7). The legacy message "THIS SI &amp; SRF HAS
            BEEN USED BEFORE AND CANNOT BE USED AGAIN" is advisory only.
          </p>
        </CollapsibleSection>

        {cl.remark ? (
          <div className="card card__body">
            <h3 className="card__title">Remark</h3>
            <p className="small" style={{ marginTop: "0.5rem" }}>
              {cl.remark}
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}

/* ================================================================== *
 * Stuffing & loading
 * ================================================================== */

export function StuffingList() {
  const vessels = useAsync(() => api.listVesselCalls());
  return (
    <>
      <ShipmentScopedList
        moduleLabel="Execution"
        title="Stuffing & loading"
        intro="Daily progress, containers and seals, traceability coding, vessel calls and demurrage exposure"
        basePath="/stuffing"
        savedViews={[
          { key: "active", label: "In progress or pending", predicate: (s) => !s.stuffing.endDate },
          { key: "all", label: "All shipments" },
          { key: "complete", label: "Stuffing complete", predicate: (s) => !!s.stuffing.endDate },
        ]}
        extraColumns={[
          {
            key: "stNo",
            header: "Stuffing",
            cell: (s) => s.stuffing.stuffingNo ?? "–",
            sortValue: (s) => s.stuffing.stuffingNo ?? "",
          },
          {
            key: "received",
            header: "Containers received",
            cell: (s) =>
              s.stuffing.containerReceived ? (
                <StatusChip tone="ok" label="Yes" size="sm" />
              ) : (
                <StatusChip tone="idle" label="No" size="sm" />
              ),
            sortValue: (s) => (s.stuffing.containerReceived ? 1 : 0),
          },
          {
            key: "period",
            header: "Stuffing period",
            cell: (s) =>
              s.stuffing.startDate
                ? `${formatDate(s.stuffing.startDate)} – ${formatDate(s.stuffing.endDate)}`
                : "–",
            sortValue: (s) => s.stuffing.startDate ?? "",
          },
          {
            key: "loaded",
            header: "Loaded",
            align: "right",
            cell: (s) => formatMt(stuffingTotals(s.stuffing).quantityMt),
            sortValue: (s) => stuffingTotals(s.stuffing).quantityMt,
          },
          {
            key: "units",
            header: "Units stuffed",
            align: "right",
            cell: (s) => formatNumber(stuffingTotals(s.stuffing).containersStuffed),
            sortValue: (s) => stuffingTotals(s.stuffing).containersStuffed,
          },
        ]}
      />
      <div className="page page--tight">
        <CollapsibleSection title={`Vessel calls (${(vessels.data ?? []).length})`} defaultOpen={false}>
          <p className="small muted">
            The legacy vessel library has no PC, SI &amp; SRF or booking reference anywhere in its 54 columns,
            so a vessel call can only be joined to its cargo by matching free-text vessel names (decision
            D21). Here each call carries an explicit shipment link.
          </p>
          {(vessels.data ?? []).length === 0 ? (
            <EmptyState title="No vessel call recorded" />
          ) : (
            <div className="dtable__scroll" style={{ marginTop: "0.75rem" }}>
              <table className="dtable__table">
                <caption className="sr-only">Vessel calls</caption>
                <thead>
                  <tr>
                    <th scope="col">Vessel</th>
                    <th scope="col">Status</th>
                    <th scope="col">ETA / ATA</th>
                    <th scope="col">ATB</th>
                    <th scope="col">ATD</th>
                    <th scope="col">Alongside</th>
                    <th scope="col">Demurrage</th>
                    <th scope="col">Shipments</th>
                  </tr>
                </thead>
                <tbody>
                  {(vessels.data ?? []).map((v) => {
                    const d = demurrageEstimate(v);
                    return (
                      <tr key={v.id}>
                        <td>
                          <strong>{v.vesselName}</strong>
                          <br />
                          <span className="muted xsmall">
                            {v.vesselNo} · {v.vesselType}
                          </span>
                        </td>
                        <td>
                          <StatusChip
                            tone={
                              v.status === "sailed"
                                ? "ok"
                                : v.status === "under_operation"
                                  ? "accent"
                                  : "info"
                            }
                            label={humanise(v.status)}
                            size="sm"
                          />
                        </td>
                        <td className="small">
                          {formatDate(v.eta)} / {formatDate(v.ata)}
                        </td>
                        <td className="small">{formatDate(v.atb)}</td>
                        <td className="small">{formatDate(v.atd)}</td>
                        <td className="small">
                          {d.timeAlongsideDays !== undefined ? `${d.timeAlongsideDays} day(s)` : "–"}
                          {v.agreedLaytimeDays !== undefined ? (
                            <span className="muted xsmall"> of {v.agreedLaytimeDays} laytime</span>
                          ) : null}
                        </td>
                        <td className="small">
                          {d.overDays ? (
                            <StatusChip tone="risk" label={formatMoney(d.estimate)} size="sm" />
                          ) : (
                            <span className="muted">–</span>
                          )}
                        </td>
                        <td className="small">
                          {v.shipmentIds.length === 0 ? (
                            <span className="muted">–</span>
                          ) : (
                            v.shipmentIds.map((sid) => (
                              <Link key={sid} to={`/stuffing/${sid}`} style={{ marginRight: "0.5rem" }}>
                                open
                              </Link>
                            ))
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleSection>
      </div>
    </>
  );
}

export function StuffingWorkspace() {
  const { id = "" } = useParams();
  const { shipment, contract, vessel } = useShipmentWorkspace(id);

  if (shipment.error)
    return (
      <div className="page">
        <ErrorState detail={shipment.error} onRetry={shipment.reload} />
      </div>
    );
  if (shipment.loading)
    return (
      <div className="page">
        <div className="card card__body muted">Loading stuffing tracker…</div>
      </div>
    );
  const s = shipment.data;
  if (!s) return <NotFoundInModule basePath="/stuffing" label="stuffing" />;

  const st = s.stuffing;
  const totals = stuffingTotals(st);
  const profile = COUNTRY_PROFILES[s.country];
  const isVesselLoad = s.shipmentType === "bulk" || s.shipmentType === "break_bulk";
  const freeDays = freeDayExposure({
    containersReceivedDate: st.receivingDate,
    freeDays: contract?.freeDaysAtPort ?? 0,
    returnedToPortDate: s.milestones.find((m) => m.key === "delivered_to_port")?.actualDate,
  });
  const demurrage = vessel ? demurrageEstimate(vessel) : undefined;

  return (
    <>
      <WorkspaceHeader
        s={s}
        moduleLabel="Execution"
        moduleTitle="Stuffing & loading"
        basePath="/stuffing"
        statusChip={
          <StatusChip
            tone={st.endDate ? "ok" : st.startDate ? "accent" : "idle"}
            label={st.endDate ? "Complete" : st.startDate ? "In progress" : "Not started"}
          />
        }
        extraMeta={st.stuffingNo}
      />

      <div className="page">
        {freeDays.level !== "none" ? (
          <Banner tone={freeDays.level === "critical" ? "risk" : "warn"} title="Free-day exposure (rule R14)">
            {freeDays.message}
          </Banner>
        ) : null}
        {demurrage?.overDays ? (
          <Banner tone="risk" title="Demurrage incurred (rule R15)">
            {vessel!.vesselName} was alongside {demurrage.timeAlongsideDays} day(s) against an agreed laytime
            of {vessel!.agreedLaytimeDays}. Exposure {formatMoney(demurrage.estimate)}, derived from ATD −
            ATB.
          </Banner>
        ) : null}

        <div className="grid-3">
          <SummaryCard title={isVesselLoad ? "Loading operation" : "Stuffing operation"}>
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: isVesselLoad ? "Loading reference" : "Stuffing reference",
                  value: st.stuffingNo,
                  behaviour: "readonly",
                },
                { label: "Containers received", value: st.containerReceived ? "Yes" : "No" },
                { label: "Receiving date", value: formatDate(st.receivingDate) },
                { label: "Start", value: formatDate(st.startDate) },
                { label: "Finish", value: formatDate(st.endDate) },
                { label: "Actual shipping line", value: st.actualShippingLine },
                { label: "Weighbridge slip", value: st.weighbridgeSlipRef },
              ]}
            />
          </SummaryCard>

          <SummaryCard
            title="Progress against plan"
            tone={totals.quantityMt >= s.quantityMt ? "ok" : "accent"}
          >
            <QuantityDonut
              fraction={s.quantityMt > 0 ? totals.quantityMt / s.quantityMt : 0}
              valueLabel={formatMt(totals.quantityMt)}
              ofLabel={formatMt(s.quantityMt)}
              caption={isVesselLoad ? "loaded" : "stuffed"}
              tone={totals.quantityMt >= s.quantityMt ? "ok" : "accent"}
            />
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: isVesselLoad ? "Loading days" : "Stuffing days",
                  value: `${totals.days}`,
                  behaviour: "calculated",
                },
                {
                  label: isVesselLoad ? "—" : "Units stuffed",
                  value: isVesselLoad
                    ? undefined
                    : `${totals.containersStuffed} of ${st.plannedContainerCount ?? "–"}`,
                },
                {
                  label: "Bags / bales",
                  value: totals.bagsOrBales ? formatNumber(totals.bagsOrBales) : undefined,
                  behaviour: "calculated",
                },
              ]}
            />
          </SummaryCard>

          <SummaryCard title="Traceability coding" tone={st.coding ? "ok" : "warn"}>
            <Banner tone="info" title="Promoted from form-XML-only">
              In the legacy library these five codes exist only inside the form XML and cannot be filtered,
              grouped or exported — "exactly the data most likely to be wanted in a recall or an audit"
              (decision D9).
            </Banner>
            {st.coding ? (
              <FieldGrid
                columns={1}
                fields={[
                  { label: "Commodity code", value: st.coding.commodityCode },
                  { label: "Cargo source", value: st.coding.cargoSource },
                  { label: "Supplier code", value: st.coding.supplierCode },
                  { label: "Processing facility", value: st.coding.processingFacilityCode },
                  { label: "Month code", value: st.coding.monthCode },
                ]}
              />
            ) : (
              <EmptyState title="Coding not yet recorded" glyph="○">
                Required before sealing.
              </EmptyState>
            )}
          </SummaryCard>
        </div>

        <TotalBanner
          label={isVesselLoad ? "Total loaded" : "Total stuffed"}
          value={formatMt(totals.quantityMt)}
          derivation={`sum of ${totals.days} daily row(s) — an unbounded collection, not the legacy fixed seven-row grid`}
        />

        <CollapsibleSection title={`Daily progress (${totals.days} day${totals.days === 1 ? "" : "s"})`}>
          {st.days.length === 0 ? (
            <EmptyState title="No daily progress recorded" glyph="○">
              Progress is followed on a daily basis until the operation completes.
            </EmptyState>
          ) : (
            <>
              <div className="dtable__scroll">
                <table className="dtable__table">
                  <caption className="sr-only">Daily stuffing progress</caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col" className="text-right">
                        Quantity
                      </th>
                      <th scope="col" className="text-right">
                        Bags / bales
                      </th>
                      <th scope="col" className="text-right">
                        Cumulative
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {st.days.map((d, i) => {
                      const cum = st.days.slice(0, i + 1).reduce((a, x) => a + x.quantityMt, 0);
                      return (
                        <tr key={d.date}>
                          <td>{formatDate(d.date)}</td>
                          <td className="text-right">{formatMt(d.quantityMt)}</td>
                          <td className="text-right">{d.bagsOrBales ? formatNumber(d.bagsOrBales) : "–"}</td>
                          <td className="text-right">{formatMt(cum)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="small muted" style={{ marginTop: "0.5rem" }}>
                The legacy grid is a fixed seven-row block whose daily rows are not promoted to the database
                at all — only the total is, so day-by-day throughput cannot be reported. This one has no
                ceiling and every row is queryable.
              </p>
            </>
          )}
        </CollapsibleSection>

        {st.containers.length > 0 ? (
          <CollapsibleSection
            title={`Containers and seals (${st.containers.length} of ${st.plannedContainerCount ?? "–"})`}
            defaultOpen={false}
          >
            <div className="dtable__scroll">
              <table className="dtable__table">
                <caption className="sr-only">Containers</caption>
                <thead>
                  <tr>
                    <th scope="col">Container</th>
                    <th scope="col">Seal</th>
                    <th scope="col">Type</th>
                    <th scope="col" className="text-right">
                      Net weight
                    </th>
                    <th scope="col" className="text-right">
                      Bags
                    </th>
                    <th scope="col">Inspected</th>
                    <th scope="col">Inspection protocol</th>
                    <th scope="col">Stuffed</th>
                  </tr>
                </thead>
                <tbody>
                  {st.containers.map((c) => (
                    <tr key={c.containerNo}>
                      <td className="mono small">{c.containerNo}</td>
                      <td className="mono small">{c.sealNo ?? "–"}</td>
                      <td className="small">{c.type}</td>
                      <td className="text-right">
                        {c.netWeightKg ? `${formatNumber(c.netWeightKg)} kg` : "–"}
                      </td>
                      <td className="text-right">{formatNumber(c.bagCount)}</td>
                      <td className="small">{formatDate(c.inspectedOn)}</td>
                      <td>
                        <ProtocolCell shipmentId={s.id} container={c} onSaved={() => shipment.reload()} />
                      </td>
                      <td className="small">{formatDate(c.stuffedOn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Banner tone="warn" title="Containers inspection protocol — proposed, and its content is open">
              Workflow v2.0 §6.11 activity 1 records that the empty-container inspection happens and that the
              surveyor issues a report <strong>[AS-IS]</strong>, and that recording the protocol and its
              results in COTS is <strong>[PROPOSED]</strong>, attributed to a discussion between Hiba and
              Khalid. §6.11 also records that &quot;the content of the containers inspection protocol — what
              is inspected and what constitutes a pass&quot; is not established, so the checks below are a
              working list awaiting confirmation and <strong>no pass rule is applied</strong>: a failed check
              is recorded and blocks nothing. What happens when an empty container is rejected is register
              G-28 and is equally open.
            </Banner>
            {st.containers.length < (st.plannedContainerCount ?? 0) ? (
              <Banner tone="info" title="Demo data shows a sample of containers">
                {st.plannedContainerCount} containers are planned; {st.containers.length} are listed here to
                keep the demo readable.
              </Banner>
            ) : null}
          </CollapsibleSection>
        ) : null}

        {vessel ? (
          <CollapsibleSection title={`Vessel call — ${vessel.vesselName}`}>
            <FieldGrid
              fields={[
                { label: "Vessel number", value: vessel.vesselNo, behaviour: "readonly" },
                { label: "IMO", value: vessel.imo },
                { label: "Type", value: vessel.vesselType },
                { label: "Agent", value: vessel.agent },
                { label: "Status", value: humanise(vessel.status) },
                { label: "Berth", value: vessel.berthNo },
                { label: "ETA", value: formatDate(vessel.eta) },
                { label: "ATA", value: formatDate(vessel.ata) },
                {
                  label: "ETB",
                  value: formatDate(vessel.etb),
                  hint: "Legacy: on the form, no column — cannot be reported",
                },
                { label: "ATB", value: formatDate(vessel.atb) },
                { label: "ETD", value: formatDate(vessel.etd), hint: "Legacy: on the form, no column" },
                { label: "ATD", value: formatDate(vessel.atd) },
                {
                  label: "Current position",
                  value: vessel.currentPosition,
                  hint: 'Legacy label reads "Current Poisson"',
                },
                {
                  label: "Balance tonnage on board",
                  value:
                    vessel.balanceTonnageOnBoard !== undefined
                      ? formatMt(vessel.balanceTonnageOnBoard)
                      : undefined,
                },
                {
                  label: "Time alongside",
                  value:
                    demurrage?.timeAlongsideDays !== undefined
                      ? `${demurrage.timeAlongsideDays} day(s)`
                      : undefined,
                  behaviour: "calculated",
                },
                {
                  label: "Demurrage estimate",
                  value: demurrage?.estimate
                    ? formatMoney(demurrage.estimate)
                    : demurrage?.overDays === 0
                      ? "Within laytime"
                      : undefined,
                  behaviour: "calculated",
                },
              ]}
            />
            {vessel.manifest.length > 0 ? (
              <table className="dash__table" style={{ marginTop: "0.75rem" }}>
                <caption className="sr-only">Cargo manifest</caption>
                <thead>
                  <tr>
                    <th scope="col">Commodity</th>
                    <th scope="col" className="text-right">
                      Tonnage
                    </th>
                    <th scope="col">Consignee</th>
                    <th scope="col">Shipper</th>
                    <th scope="col">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {vessel.manifest.map((m, i) => (
                    <tr key={`${m.commodity}-${i}`}>
                      <td>{m.commodity}</td>
                      <td className="text-right">{formatMt(m.tonnage)}</td>
                      <td>{m.consignee}</td>
                      <td>{m.shipper}</td>
                      <td>{m.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            <p className="small muted" style={{ marginTop: "0.5rem" }}>
              Unbounded manifest. The legacy library uses a fixed five-row grid promoted into 20 flattened
              columns, with slot 1 typed as a Number and slots 2–5 as Text, so the manifest cannot be summed.
            </p>
          </CollapsibleSection>
        ) : null}

        {profile.hasInlandTransitLeg ? (
          <Banner tone="info" title={`${profile.name} inland leg`}>
            {profile.inlandLegLabel}. Trucks are loaded and weighed, transit documents are issued, and the
            cargo moves overland before reaching the load port — a leg that a single origin → destination
            model would hide.
          </Banner>
        ) : null}

        {st.remarks ? (
          <div className="card card__body">
            <h3 className="card__title">Remarks</h3>
            <p className="small" style={{ marginTop: "0.5rem" }}>
              {st.remarks}
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}

/* ================================================================== *
 * Documents & charges
 * ================================================================== */

export function DocumentsList() {
  return (
    <ShipmentScopedList
      moduleLabel="Execution"
      title="Documents & charges"
      intro="Draft / confirmed / original document states with SLA targets, packing list and the five charge types"
      basePath="/documents"
      savedViews={[
        {
          key: "outstanding",
          label: "Documents outstanding",
          predicate: (s) => {
            const c = documentCompleteness(s.documents);
            return c.required > 0 && c.fraction < 1;
          },
        },
        { key: "all", label: "All shipments" },
        {
          key: "charges",
          label: "Charges outstanding",
          description: "At least one applicable charge is not yet paid.",
          predicate: (s) => chargeTotals(s.charges).outstandingCount > 0,
        },
        {
          key: "complete",
          label: "Documents complete",
          predicate: (s) => documentCompleteness(s.documents).fraction === 1,
        },
      ]}
      extraColumns={[
        {
          key: "docs",
          header: "Documents",
          cell: (s) => {
            const c = documentCompleteness(s.documents);
            return c.required === 0 ? (
              <span className="muted">–</span>
            ) : (
              `${c.atOriginal}/${c.required} at original`
            );
          },
          sortValue: (s) => documentCompleteness(s.documents).fraction,
        },
        {
          key: "outstanding",
          header: "Outstanding",
          cell: (s) => {
            const c = documentCompleteness(s.documents);
            return c.outstanding.length === 0 ? (
              <StatusChip tone="ok" label="none" size="sm" />
            ) : (
              c.outstanding.map((k) => SHIPMENT_DOCUMENT_LABEL[k]).join(", ")
            );
          },
          sortValue: (s) => documentCompleteness(s.documents).outstanding.length,
        },
        {
          key: "chargeOut",
          header: "Charges outstanding",
          align: "right",
          cell: (s) => `${chargeTotals(s.charges).outstandingCount}`,
          sortValue: (s) => chargeTotals(s.charges).outstandingCount,
        },
      ]}
    />
  );
}

export function DocumentsWorkspace() {
  const { id = "" } = useParams();
  const toast = useToast();
  const { shipment } = useShipmentWorkspace(id);
  const [dialogFor, setDialogFor] = useState<ShipmentDocumentKey | null>(null);
  const [target, setTarget] = useState<DocumentState | "">("");
  const [reference, setReference] = useState("");
  const [comment, setComment] = useState("");
  const [refError, setRefError] = useState<string | null>(null);

  if (shipment.error)
    return (
      <div className="page">
        <ErrorState detail={shipment.error} onRetry={shipment.reload} />
      </div>
    );
  if (shipment.loading)
    return (
      <div className="page">
        <div className="card card__body muted">Loading documents…</div>
      </div>
    );
  const s = shipment.data;
  if (!s) return <NotFoundInModule basePath="/documents" label="documents" />;

  const completeness = documentCompleteness(s.documents);
  const totals = chargeTotals(s.charges);
  const oblPrereq = documentPrerequisitesMet(s.documents, [
    "bill_of_lading",
    "packing_list",
    "commercial_invoice",
  ]);
  const activeDoc = dialogFor ? s.documents.find((d) => d.key === dialogFor) : null;
  const allowedStates = activeDoc ? nextStates(DOCUMENT_TRANSITIONS, activeDoc.state) : [];

  return (
    <>
      <WorkspaceHeader
        s={s}
        moduleLabel="Execution"
        moduleTitle="Documents & charges"
        basePath="/documents"
        statusChip={
          <StatusChip
            tone={completeness.fraction === 1 ? "ok" : "warn"}
            label={`${completeness.atOriginal}/${completeness.required} at original`}
          />
        }
      />

      <div className="page">
        {!oblPrereq.met ? (
          <Banner tone="warn" title="Missing prerequisites for the original bill of lading">
            {oblPrereq.missing.map((k) => SHIPMENT_DOCUMENT_LABEL[k]).join(", ")} must reach{" "}
            <em>original received</em> first. The legacy system shows an advisory message and saves anyway.
          </Banner>
        ) : null}

        <div className="grid-2">
          <SummaryCard title="Document completeness" tone={completeness.fraction === 1 ? "ok" : "warn"}>
            <QuantityDonut
              fraction={completeness.fraction}
              valueLabel={`${completeness.atOriginal}/${completeness.required}`}
              ofLabel="required documents"
              caption="at original state"
              tone={completeness.fraction === 1 ? "ok" : "warn"}
            />
            <FieldGrid
              columns={1}
              fields={[
                { label: "At draft", value: `${completeness.atDraft}`, behaviour: "calculated" },
                { label: "At confirmed", value: `${completeness.atConfirmed}`, behaviour: "calculated" },
                { label: "At original", value: `${completeness.atOriginal}`, behaviour: "calculated" },
                {
                  label: "Not required",
                  value: `${s.documents.filter((d) => d.state === "not_required").length}`,
                },
              ]}
            />
          </SummaryCard>

          <SummaryCard title="Packing list">
            <FieldGrid
              columns={1}
              fields={[
                { label: "Pack number", value: s.packingList.packNo },
                { label: "Issued", value: formatDate(s.packingList.issuedOn) },
                { label: "Bag / bale count", value: formatNumber(s.packingList.bagCount) },
                {
                  label: "Net weight",
                  value: s.packingList.netWeightKg
                    ? `${formatNumber(s.packingList.netWeightKg)} kg`
                    : undefined,
                },
                {
                  label: "Gross weight",
                  value: s.packingList.grossWeightKg
                    ? `${formatNumber(s.packingList.grossWeightKg)} kg`
                    : undefined,
                },
                {
                  label: "Packaging tare",
                  value:
                    s.packingList.grossWeightKg && s.packingList.netWeightKg
                      ? `${formatNumber(s.packingList.grossWeightKg - s.packingList.netWeightKg)} kg`
                      : undefined,
                  behaviour: "calculated",
                },
                { label: "B/L number", value: s.packingList.blNo },
              ]}
            />
            <p className="small muted" style={{ marginTop: "0.5rem" }}>
              All four figures are numeric here. The legacy library stores net weight, gross weight, bag count
              and quantity as Text, while typing an identifier as an Integer — "the typing is precisely
              inverted from what would be useful."
            </p>
          </SummaryCard>
        </div>

        {s.packingList.netWeightKg ? (
          <TotalBanner
            label="Total net weight"
            value={`${formatNumber(s.packingList.netWeightKg)} kg`}
            derivation={`gross ${formatNumber(s.packingList.grossWeightKg ?? 0)} kg less packaging tare`}
          />
        ) : null}

        <CollapsibleSection
          title="Document checklist"
          indicator={
            <StatusChip
              tone={completeness.fraction === 1 ? "ok" : "warn"}
              label={`${completeness.outstanding.length} outstanding`}
              size="sm"
            />
          }
        >
          <p className="small muted">
            Draft → confirmed → original per document type, with the target turnaround taken from the
            documented SLAs in <code>Export/OBL Process.pdf</code> and{" "}
            <code>Export/Phyto &amp; Fum and COO.pdf</code>. Overdue is computed, not noticed.
          </p>
          <ul className="doclist" style={{ marginTop: "0.75rem" }}>
            {s.documents.map((d) => {
              const anchor = d.draftReceivedOn ?? d.confirmedOn;
              const late =
                d.slaDays !== undefined &&
                d.state !== "original_received" &&
                d.state !== "not_required" &&
                anchor !== undefined &&
                isOverdue(new Date(Date.parse(anchor) + d.slaDays * 86400000).toISOString().slice(0, 10));
              return (
                <li key={d.key} className={d.state === "not_required" ? "na" : "required"}>
                  <span className="doclist__name">
                    {SHIPMENT_DOCUMENT_LABEL[d.key]}
                    <span className="doclist__sub">
                      {d.reference ? `${d.reference} · ` : ""}
                      {d.slaDays ? `target ${d.slaDays} day(s)` : "no SLA documented"}
                      {d.comments.length > 0 ? ` · ${d.comments.length} comment(s)` : ""}
                    </span>
                  </span>
                  <span>
                    <StatusChip tone={toneFor(d.state)} label={DOCUMENT_STATE_LABEL[d.state]} size="sm" />
                    {late ? (
                      <>
                        {" "}
                        <StatusChip tone="risk" glyph="!" label="overdue" size="sm" />
                      </>
                    ) : null}
                  </span>
                  <span className="small">
                    {d.originalReceivedOn
                      ? formatDate(d.originalReceivedOn)
                      : d.confirmedOn
                        ? formatDate(d.confirmedOn)
                        : d.draftReceivedOn
                          ? formatDate(d.draftReceivedOn)
                          : "–"}
                  </span>
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => {
                      setDialogFor(d.key);
                      setTarget("");
                      setReference(d.reference ?? "");
                      setComment("");
                      setRefError(null);
                    }}
                  >
                    Update
                  </button>
                </li>
              );
            })}
          </ul>
        </CollapsibleSection>

        <CollapsibleSection
          title="Charges"
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
          {totals.totals.length === 0 ? (
            <EmptyState title="No charge amounts recorded" glyph="○" />
          ) : (
            totals.totals.map((t) => (
              <TotalBanner
                key={t.currency}
                label={`Total charges (${t.currency})`}
                value={formatMoney(t)}
                derivation="typed money with an explicit currency — the legacy library stores all five amounts as Text and cannot report cost"
              />
            ))
          )}
        </CollapsibleSection>

        {s.documents.some((d) => d.comments.length > 0) ? (
          <CollapsibleSection title="Document comment threads" defaultOpen={false}>
            {s.documents
              .filter((d) => d.comments.length > 0)
              .map((d) => (
                <div key={d.key} style={{ marginBottom: "1rem" }}>
                  <h4 className="small" style={{ fontWeight: 600 }}>
                    {SHIPMENT_DOCUMENT_LABEL[d.key]}
                  </h4>
                  <ul className="audit">
                    {d.comments.map((c, i) => (
                      <li key={i}>
                        <div className="audit__when">
                          <time dateTime={c.on}>{formatDate(c.on)}</time>
                        </div>
                        <div className="audit__body">
                          <p className="small">{c.text}</p>
                          <p className="xsmall muted">{c.by}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </CollapsibleSection>
        ) : null}
      </div>

      <Dialog
        open={dialogFor !== null}
        title={activeDoc ? `Update ${SHIPMENT_DOCUMENT_LABEL[activeDoc.key]}` : "Update document"}
        onClose={() => setDialogFor(null)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setDialogFor(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!target && !comment.trim()}
              onClick={async () => {
                if (!activeDoc) return;
                setRefError(null);
                if (target === "original_received" && !reference.trim()) {
                  setRefError("A reference is required before a document may be recorded as original.");
                  return;
                }
                if (target) {
                  const res = await api.setDocumentState(s.id, activeDoc.key, target, {
                    reference: reference || undefined,
                  });
                  if (!res.ok) {
                    toast.push("risk", res.reason);
                    return;
                  }
                  toast.push(
                    "ok",
                    `${SHIPMENT_DOCUMENT_LABEL[activeDoc.key]} moved to "${DOCUMENT_STATE_LABEL[target]}".`,
                  );
                }
                if (comment.trim()) {
                  const res = await api.addDocumentComment(s.id, activeDoc.key, comment, "Amara Osei");
                  if (!res.ok) toast.push("risk", res.reason);
                }
                setDialogFor(null);
              }}
            >
              Apply
            </button>
          </>
        }
      >
        {activeDoc ? (
          <>
            <FieldGrid
              columns={1}
              fields={[
                { label: "Current state", value: DOCUMENT_STATE_LABEL[activeDoc.state] },
                { label: "Required", value: activeDoc.required ? "Yes" : "No" },
                {
                  label: "Target turnaround",
                  value: activeDoc.slaDays ? `${activeDoc.slaDays} day(s)` : "None documented",
                },
              ]}
            />
            <p className="small muted" style={{ marginTop: "0.75rem" }}>
              Only ordered transitions are offered — a document cannot jump from <em>not issued</em>
              straight to <em>original received</em>.
            </p>
            {allowedStates.length === 0 ? (
              <Banner tone="na" title="Terminal state">
                No further transition is permitted from {DOCUMENT_STATE_LABEL[activeDoc.state]}.
              </Banner>
            ) : (
              <ul className="statuschoices">
                {allowedStates.map((st) => (
                  <li key={st}>
                    <label>
                      <input
                        type="radio"
                        name="docstate"
                        value={st}
                        checked={target === st}
                        onChange={() => setTarget(st)}
                      />
                      <StatusChip tone={toneFor(st)} label={DOCUMENT_STATE_LABEL[st]} size="sm" />
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ marginTop: "1rem" }}>
              <FormRow
                label="Reference"
                htmlFor="doc-ref"
                error={refError ?? undefined}
                hint="Certificate or B/L number. Required to record a document as original."
              >
                <TextInput
                  id="doc-ref"
                  value={reference}
                  onChange={setReference}
                  error={refError ?? undefined}
                />
              </FormRow>
            </div>
            <div style={{ marginTop: "0.75rem" }}>
              <FormRow
                label="Add a comment"
                htmlFor="doc-comment"
                hint="Optional. Appended to the document's thread."
              >
                <TextArea id="doc-comment" value={comment} onChange={setComment} rows={3} />
              </FormRow>
            </div>
          </>
        ) : null}
      </Dialog>
    </>
  );
}

/* ================================================================== *
 * Post-shipment & bank submittal
 * ================================================================== */

export function PostShipmentList() {
  return (
    <ShipmentScopedList
      moduleLabel="Execution"
      title="Post-shipment & bank"
      intro="Document assembly, bank submittal with a real maturity date, OBL dispatch and close-out"
      basePath="/post-shipment"
      savedViews={[
        { key: "open", label: "Not yet closed", predicate: (s) => s.status !== "closed" },
        { key: "all", label: "All shipments" },
        {
          key: "collection",
          label: "Under collection or matured",
          predicate: (s) =>
            ["submitted_to_bank", "under_collection", "matured", "overdue"].includes(s.bankSubmittal.status),
        },
      ]}
      extraColumns={[
        {
          key: "assembly",
          header: "Assembly",
          cell: (s) => {
            const done = s.postShipment.checklist.filter((c) => c.done).length;
            return `${done}/${s.postShipment.checklist.length}`;
          },
          sortValue: (s) => s.postShipment.checklist.filter((c) => c.done).length,
        },
        {
          key: "bank",
          header: "Bank submittal",
          cell: (s) => (
            <StatusChip
              tone={toneFor(s.bankSubmittal.status)}
              label={humanise(s.bankSubmittal.status)}
              size="sm"
            />
          ),
          sortValue: (s) => s.bankSubmittal.status,
        },
        {
          key: "collection",
          header: "Under collection",
          align: "right",
          cell: (s) => formatMoney(s.bankSubmittal.underCollection),
          sortValue: (s) => s.bankSubmittal.underCollection?.amount ?? 0,
        },
        {
          key: "maturity",
          header: "Maturity",
          cell: (s) => (
            <>
              {formatDate(s.bankSubmittal.maturityDate)}
              {s.bankSubmittal.maturityDate &&
              isOverdue(s.bankSubmittal.maturityDate) &&
              s.bankSubmittal.status !== "paid" ? (
                <>
                  {" "}
                  <StatusChip tone="risk" glyph="!" label="overdue" size="sm" />
                </>
              ) : null}
            </>
          ),
          sortValue: (s) => s.bankSubmittal.maturityDate ?? "",
        },
        {
          key: "so",
          header: "Sales order",
          cell: (s) => s.salesOrder.salesOrderNo ?? "–",
          sortValue: (s) => s.salesOrder.salesOrderNo ?? "",
          optional: true,
        },
      ]}
    />
  );
}

const CHECKLIST_LABEL: Record<string, string> = {
  obl_draft_copy: "Draft copy of OBL",
  coo_dft_stamp: "COO / DFT stamp",
  packing_list: "Packing list",
  export_contract_copy: "Copy of export contract",
  export_form_copy: "Copy of export form",
};

/** The two fields the store refuses a move without, by target state (v2.0 §6.15). */
const BANK_NEEDS_MATURITY: BankSubmittalStatus = "submitted_to_bank";
const BANK_NEEDS_AMOUNT: BankSubmittalStatus = "under_collection";

export function PostShipmentWorkspace() {
  const { id = "" } = useParams();
  const toast = useToast();
  const { shipment, contract } = useShipmentWorkspace(id);
  /** The proposed bank lifecycle of v2.0 §6.15, one permitted move at a time. */
  const [bankTarget, setBankTarget] = useState<BankSubmittalStatus | null>(null);
  const [maturityEntry, setMaturityEntry] = useState("");
  const [collectionEntry, setCollectionEntry] = useState("");
  const [bankRefusal, setBankRefusal] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  /**
   * Stable, deliberately: `Dialog` re-runs its focus effect whenever `onClose` changes
   * identity, which would move focus out of the field on every keystroke.
   */
  const closeBankDialog = useCallback(() => setBankTarget(null), []);

  if (shipment.error)
    return (
      <div className="page">
        <ErrorState detail={shipment.error} onRetry={shipment.reload} />
      </div>
    );
  if (shipment.loading)
    return (
      <div className="page">
        <div className="card card__body muted">Loading post-shipment…</div>
      </div>
    );
  const s = shipment.data;
  if (!s) return <NotFoundInModule basePath="/post-shipment" label="post-shipment" />;

  const ps = s.postShipment;
  const bank = s.bankSubmittal;
  const so = s.salesOrder;
  const guard = guardPostShipmentCompletion(ps.checklist);
  const maturityOverdue = bank.maturityDate && isOverdue(bank.maturityDate) && bank.status !== "paid";
  const shipmentId = s.id;
  const bankMoves = nextStates(BANK_SUBMITTAL_TRANSITIONS, bank.status);
  const collectionCurrency = bank.underCollection?.currency ?? "AED";

  /**
   * Every refusal is shown twice: as a toast, and — because rule R21 is the most
   * instructive guard on this screen — in a banner beside the control that raised it.
   */
  async function advanceBank(
    to: BankSubmittalStatus,
    opts: { maturityDate?: string; underCollection?: Money } = {},
  ) {
    setAdvancing(true);
    setBankRefusal(null);
    const res = await api.advanceBankSubmittal(shipmentId, to, opts);
    setAdvancing(false);
    if (!res.ok) {
      setBankRefusal(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `Bank submittal moved to ${humanise(to)}.`);
    setBankTarget(null);
    setMaturityEntry("");
    setCollectionEntry("");
    shipment.reload();
  }

  function startBankMove(to: BankSubmittalStatus) {
    setBankRefusal(null);
    if (to === BANK_NEEDS_MATURITY || to === BANK_NEEDS_AMOUNT) {
      setMaturityEntry(bank.maturityDate ?? "");
      setCollectionEntry(bank.underCollection ? String(bank.underCollection.amount) : "");
      setBankTarget(to);
      return;
    }
    void advanceBank(to);
  }

  async function confirmBankMove() {
    if (!bankTarget) return;
    const amount = Number(collectionEntry);
    await advanceBank(bankTarget, {
      maturityDate: maturityEntry.trim() || undefined,
      underCollection:
        collectionEntry.trim() !== "" && Number.isFinite(amount)
          ? money(amount, collectionCurrency)
          : undefined,
    });
  }

  // Illustrates rule R17 with the currency made explicit.
  const pricing =
    so.actuallyExportedMt && so.unitPricePerMt
      ? salesOrderPricing({
          unitPricePerMtAed: so.unitPricePerMt.amount * 3.6725,
          aedToUsdRate: 0.272295,
          actuallyExportedMt: so.actuallyExportedMt,
        })
      : undefined;

  return (
    <>
      <WorkspaceHeader
        s={s}
        moduleLabel="Execution"
        moduleTitle="Post-shipment & bank"
        basePath="/post-shipment"
        statusChip={<StatusChip tone={toneFor(bank.status)} label={humanise(bank.status)} />}
        extraMeta={bank.submittalNo}
      />

      <div className="page">
        {maturityOverdue ? (
          <Banner tone="risk" title="Bank submittal past its maturity date">
            Maturity was {formatDate(bank.maturityDate)} and payment has not been recorded. The legacy library
            stores maturity as Text, so submittals falling due cannot be found at all — "the single most
            consequential typing error found in the review."
          </Banner>
        ) : null}
        {!guard.allowed ? (
          <Banner tone="warn" title="Post-shipment cannot be completed yet (rule R21)">
            {guard.reason} The legacy record read "Post Shipment Document Completed" with the
            send-to-trade-finance box unticked and the COO/DFT stamp missing.
          </Banner>
        ) : null}

        <CollapsibleSection
          title="Document assembly"
          indicator={
            <StatusChip
              tone={guard.allowed ? "ok" : "warn"}
              label={`${ps.checklist.filter((c) => c.done).length}/${ps.checklist.length} complete`}
              size="sm"
            />
          }
        >
          <FieldGrid
            fields={[
              { label: "Assembly number", value: ps.assemblyNo, behaviour: "readonly" },
              { label: "Commercial invoice", value: ps.commercialInvoiceNo },
              {
                label: "Sent to trade finance",
                value: ps.sentToTradeFinance ? `Yes — ${formatDate(ps.sentToTradeFinanceDate)}` : "No",
              },
            ]}
          />
          <ul className="doclist" style={{ marginTop: "0.75rem" }}>
            {ps.checklist.map((c) => (
              <li key={c.key} className="required">
                <span className="doclist__name">
                  {CHECKLIST_LABEL[c.key] ?? humanise(c.key)}
                  {c.attachmentName ? <span className="doclist__sub">{c.attachmentName}</span> : null}
                </span>
                <StatusChip
                  tone={c.done ? "ok" : "idle"}
                  label={c.done ? "Attached" : "Outstanding"}
                  size="sm"
                />
                <span />
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={async () => {
                    const res = await api.toggleChecklistItem(s.id, c.key);
                    toast.push(
                      res.ok ? "ok" : "risk",
                      res.ok
                        ? `${CHECKLIST_LABEL[c.key] ?? c.key} marked ${c.done ? "outstanding" : "attached"}.`
                        : res.reason,
                    );
                  }}
                >
                  {c.done ? "Mark outstanding" : "Mark attached"}
                </button>
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        <CollapsibleSection title="Bank submittal">
          <Banner tone="info" title="The proposed bank lifecycle (v2.0 §6.15 [PROPOSED], decision D7)">
            Assembling → Sent to Trade Finance → Submitted to bank → Under collection → Matured → Paid, with
            Overdue derived from the maturity date rather than typed — which is why no control here sets
            Overdue by hand. The same section records the bank set as five documents while listing six, an
            inconsistency left open as decision D7 rather than reconciled here. Only the moves{" "}
            {humanise(bank.status)} permits are offered.
          </Banner>
          {bankRefusal ? (
            <Banner tone="risk" title="The service layer refused this move">
              {bankRefusal}
            </Banner>
          ) : null}
          {bankMoves.length > 0 ? (
            <div style={{ marginBottom: "0.75rem" }}>
              <ActionBar
                primary={bankMoves.map((to) => ({
                  label: `Move to ${humanise(to)}`,
                  tone: "primary" as const,
                  onClick: () => startBankMove(to),
                  disabled: advancing,
                  disabledReason: "A move is in progress.",
                }))}
              />
              {bankMoves.includes("sent_to_trade_finance") && !guard.allowed ? (
                <Banner tone="risk" title="Rule R21 will refuse the move to Sent to Trade Finance">
                  {guard.reason} The legacy record reads "Post Shipment Document Completed" with{" "}
                  <code>Send To Trade Finance</code> unticked and the COO/DFT stamp missing, and nothing
                  stopped it. Attach the outstanding items in <em>Document assembly</em> above; the refusal
                  below is the store's, not the form's.
                </Banner>
              ) : null}
            </div>
          ) : (
            <p className="small muted">
              {humanise(bank.status)} is a terminal state in the proposed lifecycle — no further move is
              permitted.
            </p>
          )}
          <FieldGrid
            fields={[
              { label: "Submittal number", value: bank.submittalNo, behaviour: "readonly" },
              { label: "Status", value: humanise(bank.status) },
              {
                label: "Amount under collection",
                value: formatMoney(bank.underCollection),
                hint: "Legacy: correctly a Number but shown in no view at all",
              },
              {
                label: "Maturity date",
                value: formatDate(bank.maturityDate),
                hint: "Legacy: stored as Text — cannot be sorted or filtered",
              },
              { label: "Documents sent to bank", value: formatDate(bank.docsSentToBankDate) },
              {
                label: "AWB (documents to bank)",
                value: bank.awb,
                hint: "Not the OBL's own courier leg — that is on the custody chain below",
              },
              { label: "Payment received", value: formatDate(bank.paymentReceivedDate) },
            ]}
          />
          {bank.underCollection ? (
            <TotalBanner
              label="Amount under collection with the bank"
              value={formatMoney(bank.underCollection)}
              derivation="typed money with an explicit currency; the legacy field carrying this appears in no list view"
            />
          ) : null}

          <Dialog
            open={bankTarget !== null}
            title={`Move the bank submittal to ${bankTarget ? humanise(bankTarget) : ""}`}
            onClose={closeBankDialog}
            footer={
              <>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={confirmBankMove}
                  disabled={advancing}
                >
                  {advancing ? "Moving…" : "Move"}
                </button>
                <button type="button" className="btn" onClick={closeBankDialog}>
                  Cancel
                </button>
              </>
            }
          >
            {bankRefusal ? (
              <Banner tone="risk" title="The service layer refused this move">
                {bankRefusal}
              </Banner>
            ) : null}
            {bankTarget === BANK_NEEDS_MATURITY ? (
              <FormRow
                label="Maturity date"
                htmlFor="bank-maturity"
                required
                hint="Derives from the contract payment terms. A real date, not text — the store refuses submission without it."
              >
                <TextInput
                  id="bank-maturity"
                  type="date"
                  value={maturityEntry}
                  onChange={setMaturityEntry}
                  required
                />
              </FormRow>
            ) : null}
            {bankTarget === BANK_NEEDS_AMOUNT ? (
              <FormRow
                label={`Amount under collection (${collectionCurrency})`}
                htmlFor="bank-collection"
                required
                hint={`The source records this field as "Under Collection AED"; the currency is stated here rather than implied. The store refuses the move without it.`}
              >
                <TextInput
                  id="bank-collection"
                  value={collectionEntry}
                  onChange={setCollectionEntry}
                  inputMode="decimal"
                  required
                />
              </FormRow>
            ) : null}
            <p className="small muted">
              {contract?.paymentTerms
                ? `Payment terms on ${contract.contractNo}: ${contract.paymentTerms}.`
                : "The contract carries no payment terms, so the maturity date cannot be derived from them here."}
            </p>
          </Dialog>
        </CollapsibleSection>

        <CollapsibleSection title="Close-out — sales order" defaultOpen={!!so.salesOrderNo}>
          {so.salesOrderNo ? (
            <>
              <FieldGrid
                fields={[
                  { label: "Sales order number", value: so.salesOrderNo, behaviour: "readonly" },
                  { label: "Created", value: formatDate(so.createdOn) },
                  { label: "Dispatch number", value: so.dispatchNo },
                  { label: "Customer code", value: so.customerCode },
                  { label: "Warehouse", value: so.warehouseName },
                  { label: "Sage code", value: so.sageCode },
                  {
                    label: "Actually exported",
                    value: so.actuallyExportedMt !== undefined ? formatMt(so.actuallyExportedMt) : undefined,
                  },
                  { label: "Unit price per MT", value: formatMoney(so.unitPricePerMt) },
                  {
                    label: "Total sales amount",
                    value: formatMoney(so.totalSalesAmount),
                    behaviour: "calculated",
                    hint: "Currency stated explicitly — the legacy field is AED beneath a label reading USD",
                  },
                  { label: "PC completion", value: humanise(so.pcCompletion) },
                ]}
              />
              {pricing ? (
                <>
                  <h4 className="small" style={{ fontWeight: 600, marginTop: "1rem" }}>
                    Pricing derivation (rule R17), currencies made explicit
                  </h4>
                  <FieldGrid
                    fields={[
                      {
                        label: "Price per MT (USD)",
                        value: formatMoney(pricing.pricePerMtUsd),
                        behaviour: "calculated",
                      },
                      {
                        label: "Unit price per bag (AED)",
                        value: formatMoney(pricing.unitPricePerBagAed),
                        behaviour: "calculated",
                      },
                      {
                        label: "Total sales amount (AED)",
                        value: formatMoney(pricing.totalSalesAmountAed),
                        behaviour: "calculated",
                      },
                    ]}
                  />
                  <p className="small muted" style={{ marginTop: "0.5rem" }}>
                    Rounded to two decimal places at the point of calculation. The legacy column carries
                    floating-point noise on 77 records — 1999.999952 instead of 2000 — because the AED rate is
                    stored rounded to 0.272 against the actual peg of 0.272295.
                  </p>
                </>
              ) : null}
              {contract ? (
                <p className="small" style={{ marginTop: "0.75rem" }}>
                  <Link to={`/contracts/${contract.id}`}>Open {contract.contractNo}</Link> to see the
                  remaining contract balance.
                </p>
              ) : null}
            </>
          ) : (
            <EmptyState title="Not closed out yet" glyph="○">
              The sales order is the closing commercial record and carries the PC completion flag.
            </EmptyState>
          )}
        </CollapsibleSection>

        <OblCustodySection s={s} onChanged={shipment.reload} />
      </div>
    </>
  );
}

/* ================================================================== *
 * The OBL's custody chain — OBL Process.pdf, 14 September 2026
 * ================================================================== */

const OBL_STEP_LABEL: Record<OblStatus, string> = {
  not_issued: "Not issued",
  issued: "Issued by the line",
  sent_to_bank: "Delivered to the bank",
  collected_from_bank: "Collected from the bank",
  couriered: "Couriered to Dubai",
  retained_for_telex: "Retained at origin",
};

const TELEX_LABEL: Record<TelexReleaseStatus, string> = {
  not_expected: "Not expected",
  expected: "Expected",
  requested: "Requested from the line",
  released: "Released",
};

/**
 * The last third of `OBL Process.pdf`, which had nowhere to be recorded until today.
 *
 * The flow's four closing steps — the line delivering the OBL to a Sudan commercial bank, the
 * team collecting it, and then the fork between couriering it to Dubai and holding it at
 * origin for a telex release — were a read-only `FieldGrid` over a boolean. The boolean has
 * gone; `Shipment.oblCustody` holds the chain, and every move on this screen is a guarded
 * transition through the service layer.
 *
 * Two lifecycles, side by side, because that is how the flow draws them: the OBL's own
 * custody, and the telex release, which is answered early and only *runs* once the OBL is in
 * hand.
 */
function OblCustodySection({ s, onChanged }: { s: Shipment; onChanged: () => void }) {
  const toast = useToast();
  const obl = s.oblCustody;
  const [target, setTarget] = useState<OblStatus | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bankName, setBankName] = useState("");
  const [collectedBy, setCollectedBy] = useState("");
  const [courierAwb, setCourierAwb] = useState("");
  const [telexRef, setTelexRef] = useState("");
  const [beforePayment, setBeforePayment] = useState(false);

  const closeDialog = useCallback(() => setTarget(null), []);

  const moves = nextStates(OBL_TRANSITIONS, obl.status);
  const telexMoves = nextStates(TELEX_RELEASE_TRANSITIONS, obl.telex);
  const shipmentId = s.id;

  /* The flow's payment gate, shown before it refuses rather than only after. */
  const unsettled = s.charges.filter(
    (c) =>
      (c.type === "freight_invoice" || c.type === "local_invoice") &&
      c.status !== "paid" &&
      c.status !== "not_applicable",
  );

  async function move(to: OblStatus, opts: Parameters<typeof api.advanceObl>[2] = {}) {
    setBusy(true);
    setRefusal(null);
    const res = await api.advanceObl(shipmentId, to, opts);
    setBusy(false);
    if (!res.ok) {
      setRefusal(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `OBL moved to ${OBL_STEP_LABEL[to]}.`);
    setTarget(null);
    setBankName("");
    setCollectedBy("");
    setCourierAwb("");
    setBeforePayment(false);
    onChanged();
  }

  async function moveTelex(to: TelexReleaseStatus) {
    setBusy(true);
    setRefusal(null);
    const res = await api.advanceTelexRelease(shipmentId, to, { reference: telexRef });
    setBusy(false);
    if (!res.ok) {
      setRefusal(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `Telex release: ${TELEX_LABEL[to]}.`);
    setTelexRef("");
    onChanged();
  }

  /* Every move that needs a detail opens the dialog; the rest go straight through. */
  function start(to: OblStatus) {
    setRefusal(null);
    if (to === "sent_to_bank" || to === "collected_from_bank" || to === "couriered") {
      setBankName(obl.bankName ?? s.bankDetails?.bankName ?? "");
      setTarget(to);
      return;
    }
    if (to === "issued" && unsettled.length > 0) {
      setBeforePayment(false);
      setTarget(to);
      return;
    }
    void move(to);
  }

  return (
    <CollapsibleSection
      title="OBL custody & telex release"
      indicator={<StatusChip tone={toneFor(obl.status)} label={OBL_STEP_LABEL[obl.status]} size="sm" />}
    >
      <p className="small muted">
        The closing steps of <code>OBL Process.pdf</code>: the line issues the original bill of lading and
        delivers it to a Sudan commercial bank, the team collects it, and it is then either couriered to
        Dubai with the rest of the documents or held at origin and returned to the line for the telex
        release. Rule R22 requires it to reach the customer before the cargo arrives at the port of
        discharge.
      </p>

      {refusal ? (
        <Banner tone="risk" title="The service layer refused this move">
          {refusal}
        </Banner>
      ) : null}

      {unsettled.length > 0 && obl.status === "not_issued" ? (
        <Banner tone="warn" title="The invoices are not settled">
          {unsettled.map((c) => CHARGE_TYPE_LABEL[c.type]).join(" and ")}{" "}
          {unsettled.length === 1 ? "is" : "are"} still outstanding. The flow allows the line to print the
          OBL first only where that is agreed with it — the move will ask.
        </Banner>
      ) : null}
      {obl.issuedBeforePayment ? (
        <Banner tone="warn" title="Printed before payment">
          This OBL was issued by agreement with the line before the charge invoices were settled — the
          right-hand branch of the flow's payment decision.
        </Banner>
      ) : null}

      {moves.length > 0 ? (
        <div style={{ marginBottom: "0.75rem" }}>
          <ActionBar
            primary={moves.map((to) => ({
              label: `Record: ${OBL_STEP_LABEL[to]}`,
              tone: "primary" as const,
              onClick: () => start(to),
              disabled: busy,
              disabledReason: "A move is in progress.",
            }))}
          />
        </div>
      ) : (
        <p className="small muted">
          {OBL_STEP_LABEL[obl.status]} is where this flow ends — no further custody move is drawn.
        </p>
      )}

      <FieldGrid
        fields={[
          { label: "Status", value: OBL_STEP_LABEL[obl.status] },
          { label: "Issued by the line", value: formatDate(obl.issuedDate) },
          { label: "Delivered to bank", value: formatDate(obl.deliveredToBankDate) },
          { label: "Holding bank", value: obl.bankName },
          { label: "Collected", value: formatDate(obl.collectedDate) },
          { label: "Collected by", value: obl.collectedBy },
          { label: "Couriered to Dubai", value: formatDate(obl.courieredDate) },
          { label: "Courier AWB", value: obl.courierAwb },
          {
            label: "Target",
            value: "Before vessel arrival at the port of discharge",
            behaviour: "readonly",
          },
        ]}
      />

      <h4 className="small" style={{ fontWeight: 600, marginTop: "1.25rem" }}>
        Telex release
      </h4>
      <p className="small muted" style={{ marginTop: "0.25rem" }}>
        Answered with the customer, usually long before the OBL exists. Where one is expected the OBL is
        not couriered — it is held at origin and returned to the line when the release is asked for.
      </p>
      <div style={{ margin: "0.5rem 0 0.75rem" }}>
        <ActionBar
          primary={telexMoves.map((to) => ({
            label: `Telex: ${TELEX_LABEL[to]}`,
            tone: "primary" as const,
            onClick: () => void moveTelex(to),
            disabled: busy,
            disabledReason: "A move is in progress.",
          }))}
        />
      </div>
      <FieldGrid
        fields={[
          { label: "Telex release", value: TELEX_LABEL[obl.telex] },
          { label: "Requested", value: formatDate(obl.telexRequestedDate) },
          { label: "Released", value: formatDate(obl.telexReleasedDate) },
          { label: "Reference", value: obl.telexReference },
        ]}
      />

      <Dialog
        open={target !== null}
        title={target ? `Record: ${OBL_STEP_LABEL[target]}` : ""}
        onClose={closeDialog}
        footer={
          <>
            <button type="button" className="btn" onClick={closeDialog}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy || (target === "issued" && unsettled.length > 0 && !beforePayment)}
              onClick={() => {
                if (!target) return;
                void move(target, {
                  bankName: bankName || undefined,
                  collectedBy: collectedBy || undefined,
                  courierAwb: courierAwb || undefined,
                  issuedBeforePayment: beforePayment || undefined,
                });
              }}
            >
              {busy ? "Recording…" : "Record"}
            </button>
          </>
        }
      >
        {target === "issued" ? (
          <>
            <p className="small">
              {unsettled.map((c) => CHARGE_TYPE_LABEL[c.type]).join(" and ")}{" "}
              {unsettled.length === 1 ? "is" : "are"} not settled, so the flow's decision applies: the OBL
              may be printed first only where that is agreed with the line.
            </p>
            <label className="small" style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <input
                type="checkbox"
                checked={beforePayment}
                onChange={(e) => setBeforePayment(e.currentTarget.checked)}
              />
              <span>The agreement with the line to print the OBL before payment is in place.</span>
            </label>
          </>
        ) : null}
        {target === "sent_to_bank" ? (
          <FormRow
            label="Holding bank"
            htmlFor="obl-bank"
            required
            hint='The flow says "Sudan commercial Banks" without naming one — record which took it.'
          >
            <TextInput id="obl-bank" value={bankName} onChange={setBankName} required />
          </FormRow>
        ) : null}
        {target === "collected_from_bank" ? (
          <FormRow label="Collected by" htmlFor="obl-by" hint="The person or desk that went to the bank.">
            <TextInput id="obl-by" value={collectedBy} onChange={setCollectedBy} />
          </FormRow>
        ) : null}
        {target === "couriered" ? (
          <FormRow
            label="Courier AWB"
            htmlFor="obl-awb"
            hint="The OBL's own leg to Dubai — not the AWB for the documents sent to the bank."
          >
            <TextInput id="obl-awb" value={courierAwb} onChange={setCourierAwb} />
          </FormRow>
        ) : null}
      </Dialog>
    </CollapsibleSection>
  );
}

/* ================================================================== *
 * Container inspection protocol — workflow v2.0 §6.11 activity 1
 *
 * "Empty containers are inspected and the inspection results recorded against a
 *  containers inspection protocol. [AS-IS] that the inspection happens and a report
 *  is issued by the surveyor; [PROPOSED] that the protocol and its results are
 *  recorded in COTS."
 *
 * The check list below is a working list, not a specification: §6.11's own open
 * question is "the content of the containers inspection protocol — what is inspected
 * and what constitutes a pass". Nothing here asserts a pass rule, and a failed check
 * blocks nothing, because no source says it should.
 * ================================================================== */

/** A working list, marked as awaiting confirmation wherever it appears. */
const PROTOCOL_CHECKS: { key: string; label: string }[] = [
  { key: "structural", label: "Structure sound — no holes, dents or repairs affecting integrity" },
  { key: "watertight", label: "Watertight — no light visible with the doors closed" },
  { key: "clean_dry", label: "Clean, dry and free of residue or odour" },
  { key: "doors_seals", label: "Doors, gaskets and locking gear serviceable" },
  { key: "floor", label: "Floor sound and free of contamination" },
  { key: "pest_free", label: "Free of pest or infestation evidence" },
  { key: "markings", label: "CSC plate and container markings legible" },
];

const PROTOCOL_RESULTS: { value: ProtocolCheckResult; label: string }[] = [
  { value: "not_checked", label: "Not checked" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
];

function ProtocolCell({
  shipmentId,
  container,
  onSaved,
}: {
  shipmentId: string;
  container: ContainerUnit;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [by, setBy] = useState(container.protocol?.inspectedBy ?? "");
  const [results, setResults] = useState<Record<string, ProtocolCheckResult>>(() =>
    Object.fromEntries(
      PROTOCOL_CHECKS.map((c) => [
        c.key,
        container.protocol?.checks.find((x) => x.key === c.key)?.result ?? "not_checked",
      ]),
    ),
  );
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      PROTOCOL_CHECKS.map((c) => [
        c.key,
        container.protocol?.checks.find((x) => x.key === c.key)?.note ?? "",
      ]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const recorded = container.protocol;
  const failed = recorded?.checks.filter((c) => c.result === "fail").length ?? 0;
  const checked = recorded?.checks.filter((c) => c.result !== "not_checked").length ?? 0;

  async function save() {
    if (!by.trim()) {
      setError("Say who carried out the inspection.");
      return;
    }
    const checks = PROTOCOL_CHECKS.map((c) => ({
      key: c.key,
      label: c.label,
      result: results[c.key] ?? "not_checked",
      note: notes[c.key]?.trim() || undefined,
    }));
    if (checks.every((c) => c.result === "not_checked")) {
      setError("Record at least one check, or there is nothing to save.");
      return;
    }
    setError(null);
    setSaving(true);
    const res = await api.recordContainerProtocol(shipmentId, container.containerNo, checks, by.trim());
    setSaving(false);
    if (!res.ok) {
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `Protocol recorded for ${container.containerNo}.`);
    setOpen(false);
    onSaved();
  }

  return (
    <>
      <span className="row" style={{ gap: "0.4rem", alignItems: "center" }}>
        {recorded ? (
          <StatusChip
            tone={failed > 0 ? "risk" : "ok"}
            label={failed > 0 ? `${failed} failed` : `${checked} checks passed`}
            size="sm"
            title={`Recorded by ${recorded.inspectedBy ?? "–"} on ${formatDate(recorded.inspectedOn)}`}
          />
        ) : (
          <StatusChip tone="idle" label="Not recorded" size="sm" />
        )}
        <button type="button" className="btn btn--sm" onClick={() => setOpen(true)}>
          {recorded ? "Review" : "Record"}
        </button>
      </span>

      <Dialog
        open={open}
        title={`Inspection protocol — ${container.containerNo}`}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Record protocol"}
            </button>
          </>
        }
      >
        {error ? (
          <Banner tone="risk" title="The protocol could not be recorded">
            {error}
          </Banner>
        ) : null}
        <Banner tone="info" title="A working list, not a specification">
          What is inspected and what constitutes a pass is not established in either source (v2.0 §6.11 open
          question 1). A failed check is recorded and blocks nothing.
        </Banner>
        <FormRow
          label="Inspected by"
          htmlFor="cp-by"
          required
          hint="The surveyor who carried out the inspection."
        >
          <TextInput id="cp-by" value={by} onChange={setBy} required />
        </FormRow>
        <div className="dtable__scroll">
          <table className="dtable__table">
            <caption className="sr-only">Container inspection checks</caption>
            <thead>
              <tr>
                <th scope="col">Check</th>
                <th scope="col">Result</th>
                <th scope="col">Note</th>
              </tr>
            </thead>
            <tbody>
              {PROTOCOL_CHECKS.map((c) => (
                <tr key={c.key}>
                  <td className="small">{c.label}</td>
                  <td>
                    <FormRow label={`${c.label} — result`} htmlFor={`cp-${c.key}`}>
                      <SelectInput
                        id={`cp-${c.key}`}
                        value={results[c.key] ?? "not_checked"}
                        onChange={(v) => setResults((r) => ({ ...r, [c.key]: v }))}
                        options={PROTOCOL_RESULTS}
                        placeholder="Not checked"
                      />
                    </FormRow>
                  </td>
                  <td>
                    <FormRow label={`${c.label} — note`} htmlFor={`cp-note-${c.key}`}>
                      <TextInput
                        id={`cp-note-${c.key}`}
                        value={notes[c.key] ?? ""}
                        onChange={(v) => setNotes((n) => ({ ...n, [c.key]: v }))}
                      />
                    </FormRow>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recorded ? (
          <p className="xsmall muted" style={{ marginTop: "0.5rem" }}>
            Recorded by {recorded.inspectedBy ?? "–"} on {formatDate(recorded.inspectedOn)}. Saving again
            replaces the recorded result.
          </p>
        ) : null}
      </Dialog>
    </>
  );
}
