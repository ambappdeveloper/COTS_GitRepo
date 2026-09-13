import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { commodityById, counterpartyName } from "../data/master";
import {
  exportContractConsumption,
  exportContractExpiryRisk,
  formatDate,
  formatMoney,
  formatMt,
  validateExportFormTotal,
} from "../domain/calc";
import { humanise, toneFor } from "../domain/status";
import type { ExportContract, ExportForm } from "../domain/types";
import { COUNTRY_PROFILES } from "../domain/variants";
import { api } from "../services/store";
import { Banner, Dialog, EmptyState, ErrorState, StatusChip, useToast } from "../components/feedback";
import { FormRow, SelectInput, TextInput } from "../components/form";
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
import { useAsync } from "./hooks";

export function PreclearanceList() {
  const exportContracts = useAsync(() => api.listExportContracts());
  const contracts = useAsync(() => api.listContracts());
  const packs = useAsync(() => api.listPreclearancePacks());

  if (exportContracts.error) {
    return (
      <div className="page">
        <ErrorState detail={exportContracts.error} onRetry={exportContracts.reload} />
      </div>
    );
  }

  const rows = exportContracts.data ?? [];
  const cts = contracts.data ?? [];
  const pks = packs.data ?? [];
  const contractOf = (id: string) => cts.find((c) => c.id === id);

  const columns: Column<ExportContract>[] = [
    {
      key: "ref",
      header: "Export contract",
      cell: (e) => <Link to={`/pre-clearance/${e.id}`}>{e.exportContractNo ?? e.requestNo}</Link>,
      sortValue: (e) => e.exportContractNo ?? e.requestNo,
    },
    { key: "request", header: "Request", cell: (e) => e.requestNo, sortValue: (e) => e.requestNo },
    {
      key: "contract",
      header: "Purchase contract",
      cell: (e) => {
        const c = contractOf(e.contractId);
        return c ? <Link to={`/contracts/${c.id}`}>{c.contractNo}</Link> : "–";
      },
      sortValue: (e) => contractOf(e.contractId)?.contractNo ?? "",
    },
    {
      key: "commodity",
      header: "Commodity",
      cell: (e) => {
        const c = contractOf(e.contractId);
        return c ? (commodityById(c.commodityId)?.name ?? "–") : "–";
      },
      sortValue: (e) => contractOf(e.contractId)?.commodityId ?? "",
    },
    {
      key: "status",
      header: "Status",
      cell: (e) => <StatusChip tone={toneFor(e.status)} label={humanise(e.status)} size="sm" />,
      sortValue: (e) => e.status,
      filterOptions: [...new Set(rows.map((e) => e.status))].map((s) => ({ value: s, label: humanise(s) })),
      filterMatch: (e, v) => e.status === v,
    },
    {
      key: "qty",
      header: "Quantity",
      align: "right",
      cell: (e) => formatMt(e.actualQuantityMt ?? e.requestedQuantityMt),
      sortValue: (e) => e.actualQuantityMt ?? e.requestedQuantityMt,
    },
    {
      key: "consumed",
      header: "Consumed",
      align: "right",
      cell: (e) => formatMt(exportContractConsumption(e).usedMt),
      sortValue: (e) => exportContractConsumption(e).usedMt,
    },
    {
      key: "remaining",
      header: "Remaining",
      align: "right",
      cell: (e) => <strong>{formatMt(exportContractConsumption(e).remainingMt)}</strong>,
      sortValue: (e) => exportContractConsumption(e).remainingMt,
    },
    {
      key: "expiry",
      header: "Expiry",
      cell: (e) => {
        const risk = exportContractExpiryRisk(e);
        return (
          <>
            {formatDate(e.expiryDate)}
            {risk.level !== "none" ? (
              <>
                {" "}
                <StatusChip
                  tone={risk.level === "critical" ? "risk" : "warn"}
                  label={risk.level === "critical" ? "expired / too late" : `${risk.daysLeft}d left`}
                  size="sm"
                />
              </>
            ) : null}
          </>
        );
      },
      sortValue: (e) => e.expiryDate ?? "",
    },
    {
      key: "forms",
      header: "EX forms",
      cell: (e) =>
        e.exportForms.length === 0 ? (
          <span className="muted">n/a</span>
        ) : (
          `${e.exportForms.filter((f) => f.status === "used").length}/${e.exportForms.length} used`
        ),
      sortValue: (e) => e.exportForms.length,
    },
    {
      key: "custody",
      header: "Custody",
      cell: (e) => {
        const p = pks.find((x) => x.exportContractId === e.id);
        if (!p) return <span className="muted">–</span>;
        return <StatusChip tone={toneFor(p.status)} label={humanise(p.status)} size="sm" />;
      },
      sortValue: (e) => pks.find((x) => x.exportContractId === e.id)?.status ?? "",
      optional: true,
    },
    {
      key: "entity",
      header: "Exporting entity",
      cell: (e) => e.exportingEntity,
      sortValue: (e) => e.exportingEntity,
      optional: true,
    },
    {
      key: "lv",
      header: "LV",
      cell: (e) =>
        e.isLargeVolume ? (
          <StatusChip tone="accent" label="LV" size="sm" />
        ) : (
          <span className="muted">–</span>
        ),
      sortValue: (e) => (e.isLargeVolume ? 1 : 0),
      optional: true,
    },
  ];

  return (
    <>
      <PageHeader
        moduleLabel="Pre-clearance & clearance"
        crumbs={[{ label: "Home", to: "/" }, { label: "Pre-clearance" }]}
        title="Pre-clearance"
        meta="Export contract request and issuance, EX forms, consumption balance and document custody"
        recordKey={`${rows.length}`}
        recordDate="export contracts"
        /* "Add New button on the header right side." — 6 September 2026. A request is raised
           against an execution plan, which this list is not scoped to, so the header is where
           it belongs: the screen it opens chooses the plan and reads the contract from it. */
        actions={<ActionBar primary={[{ label: "New request", to: "/pre-clearance/new" }]} />}
      />
      <div className="page">
        <Banner tone="info" title="Country applicability">
          The export contract applies in Sudan and Ethiopia and not in Tanzania; EX forms are essentially
          Sudan-only; Mozambique starts its customs process from a commercial invoice instead. Inapplicable
          steps are marked <em>Not applicable</em> throughout, never left pending.
        </Banner>
        <DataTable
          caption="Export contracts"
          rows={rows}
          columns={columns}
          loading={exportContracts.loading}
          searchPlaceholder="Search by export contract or request number…"
          searchValue={(e) =>
            `${e.exportContractNo ?? ""} ${e.requestNo} ${contractOf(e.contractId)?.contractNo ?? ""}`
          }
          rowHref={(e) => `/pre-clearance/${e.id}`}
          savedViews={[
            { key: "all", label: "All export contracts" },
            {
              key: "issued",
              label: "Issued",
              predicate: (e) => e.status === "issued",
              description: "Issued and available for allocation.",
            },
            {
              key: "inprocess",
              label: "In process with the Ministry",
              predicate: (e) =>
                e.status === "under_process" || e.status === "sent_to_mot" || e.status === "requested",
            },
            {
              key: "expiring",
              label: "Expiring or expired",
              description: "Validity ends within 30 days, or has already passed.",
              predicate: (e) => {
                const r = exportContractExpiryRisk(e);
                return r.level !== "none" || (r.daysLeft !== undefined && r.daysLeft <= 30);
              },
            },
            {
              key: "balance",
              label: "With unused balance",
              description:
                "Contracted quantity not yet consumed — the balance review the Appendix B baseline calls for.",
              predicate: (e) => exportContractConsumption(e).remainingMt > 0,
            },
          ]}
        />
      </div>
    </>
  );
}

const EMPTY_CONSUMPTION = { shipmentId: "", psFileNo: "", exportCertificateNo: "", declarationNo: "" };

export function PreclearanceDetail() {
  const { id = "" } = useParams();
  const toast = useToast();
  const ec = useAsync(() => api.getExportContract(id), [id]);
  const contracts = useAsync(() => api.listContracts());
  const packs = useAsync(() => api.listPreclearancePacks());
  const shipments = useAsync(() => api.listShipments());
  /** v2.0 §6.9 activity 3 — the per-form consumption record, one form at a time. */
  const [consuming, setConsuming] = useState<ExportForm | null>(null);
  const [entry, setEntry] = useState(EMPTY_CONSUMPTION);
  const [recording, setRecording] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  /**
   * Stable, deliberately: `Dialog` re-runs its focus effect whenever `onClose` changes
   * identity, which would move focus out of the field on every keystroke.
   */
  const closeConsumption = useCallback(() => setConsuming(null), []);

  if (ec.error) {
    return (
      <div className="page">
        <ErrorState detail={ec.error} onRetry={ec.reload} />
      </div>
    );
  }
  if (ec.loading)
    return (
      <div className="page">
        <div className="card card__body muted">Loading…</div>
      </div>
    );
  const e = ec.data;
  if (!e) {
    return (
      <div className="page">
        <EmptyState
          title="Export contract not found"
          action={
            <Link className="btn btn--primary" to="/pre-clearance">
              Back to pre-clearance
            </Link>
          }
        />
      </div>
    );
  }

  const contract = (contracts.data ?? []).find((c) => c.id === e.contractId);
  const pack = (packs.data ?? []).find((p) => p.exportContractId === e.id);
  const linkedShipments = (shipments.data ?? []).filter((s) => s.exportContractId === e.id);
  /**
   * A form is consumed on a clearance declaration for one shipment. Where no shipment
   * yet draws on this export contract, every shipment on the same purchase contract is
   * offered, because an export contract is consumed across a purchase contract (rule R6).
   */
  const contractShipments = (shipments.data ?? []).filter((s) => s.contractId === e.contractId);
  const consumptionCandidates = linkedShipments.length > 0 ? linkedShipments : contractShipments;
  const shipmentNoOf = (shipmentId?: string) =>
    (shipments.data ?? []).find((s) => s.id === shipmentId)?.shipmentNo;
  const consumption = exportContractConsumption(e);
  const formCheck = validateExportFormTotal(e);
  const expiry = exportContractExpiryRisk(e, linkedShipments[0]?.lastShippingDate);
  const profile = contract ? COUNTRY_PROFILES[contract.origin] : undefined;
  const exportContractId = e.id;

  function openConsumption(f: ExportForm) {
    setConsuming(f);
    setRefusal(null);
    setEntry({
      ...EMPTY_CONSUMPTION,
      shipmentId: consumptionCandidates.length === 1 ? consumptionCandidates[0].id : "",
      psFileNo: f.psFileNo ?? "",
      exportCertificateNo: f.exportCertificateNo ?? "",
    });
  }

  /** Rule R7 lives in the store; whatever it refuses is shown here, never swallowed. */
  async function recordConsumption() {
    if (!consuming) return;
    setRecording(true);
    setRefusal(null);
    const res = await api.consumeExportForm(exportContractId, consuming.formNo, {
      clearanceShipmentId: entry.shipmentId,
      psFileNo: entry.psFileNo,
      exportCertificateNo: entry.exportCertificateNo,
      declarationNo: entry.declarationNo,
    });
    setRecording(false);
    if (!res.ok) {
      setRefusal(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    toast.push(
      "ok",
      `EX form ${consuming.formNo} marked Used on ${shipmentNoOf(entry.shipmentId) ?? "the shipment"} under declaration ${entry.declarationNo.trim()}.`,
    );
    setConsuming(null);
    setEntry(EMPTY_CONSUMPTION);
    ec.reload();
  }

  return (
    <>
      <PageHeader
        moduleLabel="Pre-clearance"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Pre-clearance", to: "/pre-clearance" },
          { label: e.exportContractNo ?? e.requestNo },
        ]}
        title={contract ? counterpartyName(contract.buyerId) : e.requestNo}
        statusChip={<StatusChip tone={toneFor(e.status)} label={humanise(e.status)} />}
        meta={
          <>
            {e.exportContractNo ?? "not yet issued"} · request {e.requestNo} · {e.exportingEntity}
            {contract ? ` · ${contract.contractNo} · ${commodityById(contract.commodityId)?.name}` : ""}
            {e.isLargeVolume ? " · large volume" : ""}
          </>
        }
        recordKey={e.exportContractNo ?? e.requestNo}
        recordDate={formatDate(e.issuanceDate ?? e.requestedOn)}
        /*
         * The way into the issuance — 11 September 2026, meeting-pack gap 1.
         *
         * Offered only where the country uses an export contract: Tanzania and Mozambique do
         * not, and an action leading to a screen that refuses is worse than no action. The
         * label states which of the two things it does, because "Edit" on a record that has
         * never been issued does not say that the ministry's answer is what is wanted.
         */
        actions={
          profile?.usesExportContract === false ? undefined : (
            <ActionBar
              primary={[
                {
                  label: e.exportContractNo ? "Edit the issuance" : "Record the issuance",
                  to: `/pre-clearance/${e.id}/edit`,
                },
              ]}
            />
          )
        }
      />

      <div className="page">
        {expiry.level !== "none" ? (
          <Banner
            tone={expiry.level === "critical" ? "risk" : "warn"}
            title="Export contract validity risk (rule R13)"
          >
            {expiry.message}
          </Banner>
        ) : null}
        {!formCheck.valid && e.exportForms.length > 0 ? (
          <Banner tone="risk" title="EX form quantities do not reconcile (rule R5)">
            {formCheck.message} The legacy record showed three different totals on one shipment — 600, 783 and
            783.6 MT — and saved all three.
          </Banner>
        ) : null}

        <div className="grid-3">
          <SummaryCard title="Request">
            <FieldGrid
              columns={1}
              fields={[
                { label: "Request number", value: e.requestNo, behaviour: "readonly" },
                { label: "Requested on", value: formatDate(e.requestedOn) },
                {
                  label: "Requested quantity",
                  value: formatMt(e.requestedQuantityMt),
                  behaviour: "required",
                },
                { label: "Exporting entity", value: e.exportingEntity },
                { label: "Unit price", value: formatMoney(e.unitPrice) },
                {
                  label: "Purchase contract",
                  value: contract ? (
                    <Link to={`/contracts/${contract.id}`}>{contract.contractNo}</Link>
                  ) : undefined,
                  behaviour: "inherited",
                },
              ]}
            />
          </SummaryCard>

          <SummaryCard title="Issuance" tone={e.exportContractNo ? undefined : "warn"}>
            {/*
              Until 11 September 2026 every field below was unwritable: the card rendered the
              ministry's answer on the seeded records and there was no screen that could record
              one. An empty card now says so and links to the screen, rather than reading as
              eight fields nobody had filled in.
            */}
            {!e.exportContractNo ? (
              <p className="small">
                Not yet issued.{" "}
                {profile?.usesExportContract === false ? (
                  <>The export contract does not apply in {profile.name}.</>
                ) : (
                  <>
                    <Link to={`/pre-clearance/${e.id}/edit`}>Record what the ministry returns</Link> — the
                    contract number, its dates, the actual exporter, bank and quantity.
                  </>
                )}
              </p>
            ) : null}
            <FieldGrid
              columns={1}
              fields={[
                { label: "Export contract number", value: e.exportContractNo },
                { label: "Issuance date", value: formatDate(e.issuanceDate) },
                { label: "Expiry date", value: formatDate(e.expiryDate) },
                { label: "Actual exporter", value: e.actualExporterName },
                { label: "Actual bank", value: e.actualBank },
                {
                  label: "Actual bank branch",
                  value: e.actualBankBranch,
                  hint: "Legacy: written into the column named Goods Desc (defect D14)",
                },
                {
                  label: "Actual quantity",
                  value: e.actualQuantityMt !== undefined ? formatMt(e.actualQuantityMt) : undefined,
                },
                { label: "Scanned contract", value: e.scannedContractName },
              ]}
            />
          </SummaryCard>

          <SummaryCard title="Consumption" tone={consumption.remainingMt === 0 ? "ok" : "accent"}>
            <QuantityDonut
              fraction={consumption.usedFraction}
              valueLabel={formatMt(consumption.usedMt)}
              ofLabel={formatMt(consumption.contractQuantityMt)}
              caption="of the export contract consumed"
              tone={consumption.usedFraction >= 1 ? "ok" : "accent"}
            />
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Remaining balance",
                  value: <strong>{formatMt(consumption.remainingMt)}</strong>,
                  behaviour: "calculated",
                },
                {
                  label: "EX forms issued",
                  value:
                    consumption.formsIssued > 0
                      ? `${consumption.formsIssued}`
                      : "Not applicable in this country",
                },
                {
                  label: "EX forms used",
                  value: consumption.formsIssued > 0 ? `${consumption.formsUsed}` : undefined,
                },
              ]}
            />
          </SummaryCard>
        </div>

        <TotalBanner
          label="Export contract balance remaining"
          value={formatMt(consumption.remainingMt)}
          derivation={`contracted ${formatMt(consumption.contractQuantityMt)} − consumed ${formatMt(consumption.usedMt)} across ${e.consumption.length} shipment(s)`}
        />

        <CollapsibleSection title="Ministry of Trade & Chamber of Exporters tracking">
          <Banner tone="info" title="Four recovered fields">
            In the legacy follow-up screen these four dates exist as columns, are blank on recent records and
            have no form controls at all — and the form shows an empty "Chamber of Exporters" sub-section with
            nothing in it (decision D7).
          </Banner>
          <FieldGrid
            fields={[
              { label: "Sent to Ministry of Trade", value: formatDate(e.sentToMotDate) },
              { label: "Received from Ministry of Trade", value: formatDate(e.receivedFromMotDate) },
              { label: "Sent to trade finance", value: formatDate(e.sentToTradeFinanceDate) },
              { label: "Chamber of exporters", value: formatDate(e.chamberOfExportersDate) },
              {
                label: "Days at the Ministry",
                value:
                  e.sentToMotDate && e.receivedFromMotDate
                    ? `${Math.round((Date.parse(e.receivedFromMotDate) - Date.parse(e.sentToMotDate)) / 86400000)} day(s)`
                    : e.sentToMotDate
                      ? "Still with the Ministry"
                      : undefined,
                behaviour: "calculated",
              },
            ]}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="EX forms"
          indicator={
            <StatusChip
              tone={formCheck.valid ? "ok" : "risk"}
              label={`${formatMt(formCheck.formsTotal)} of ${formatMt(formCheck.contractTotal)}`}
              size="sm"
            />
          }
        >
          {e.exportForms.length === 0 ? (
            <EmptyState
              title={
                profile && !profile.usesExportForms
                  ? `EX forms do not apply in ${profile.name}`
                  : "No EX form issued yet"
              }
              glyph="–"
            >
              {profile && !profile.usesExportForms
                ? 'Workshop notes: "Ex form is not applicable in all counties. Mainly in Sudan."'
                : "The bank issues EX forms in specific quantities against the export contract."}
            </EmptyState>
          ) : (
            <>
              <Banner tone="info" title="Consumption is recorded per form (v2.0 §6.9 activity 3, rule R7)">
                The source records consumption as six things per form: form number, quantity, PS file number,
                export certificate number, declaration number, and the form marked Used. Rule R7 refuses
                consuming a form that is already Used; in the legacy system the constraint is stated in a
                drop-down and is unenforced, and the message “THIS SI &amp; SRF HAS BEEN USED BEFORE AND
                CANNOT BE USED AGAIN” is advisory only. Here the refusal comes from the service layer.
              </Banner>
              <div className="dtable__scroll">
                <table className="dtable__table">
                  <caption className="sr-only">Issued EX forms</caption>
                  <thead>
                    <tr>
                      <th scope="col">Form number</th>
                      <th scope="col" className="text-right">
                        Quantity
                      </th>
                      <th scope="col">Status</th>
                      <th scope="col">Issued</th>
                      <th scope="col">PS file</th>
                      <th scope="col">Export certificate</th>
                      <th scope="col">Declaration</th>
                      <th scope="col">Consumption</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.exportForms.map((f) => (
                      <tr key={f.formNo}>
                        <td className="mono">{f.formNo}</td>
                        <td className="text-right">{formatMt(f.quantityMt)}</td>
                        <td>
                          <StatusChip tone={toneFor(f.status)} label={humanise(f.status)} size="sm" />
                        </td>
                        <td>{formatDate(f.issuedOn)}</td>
                        <td className="small">{f.psFileNo ?? "–"}</td>
                        <td className="small">{f.exportCertificateNo ?? "–"}</td>
                        <td className="small">{f.declarationNo ?? "–"}</td>
                        <td>
                          {f.status === "used" ? (
                            <>
                              <span className="small">
                                Used on {shipmentNoOf(f.usedOnClearanceId) ?? "a clearance not on file"}
                              </span>{" "}
                              <StatusChip
                                tone="na"
                                label="Used — rule R7 refuses consuming it again"
                                size="sm"
                              />
                            </>
                          ) : (
                            <button type="button" className="btn btn--sm" onClick={() => openConsumption(f)}>
                              Record consumption<span className="sr-only"> of EX form {f.formNo}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="small muted" style={{ marginTop: "0.5rem" }}>
                An unbounded child collection. The legacy chain flattens this into 41 numbered columns with a
                hard ceiling of 20 forms — and slot 1 is typed differently from slots 2–20, so 414.6 MT fits
                slot 2 but not slot 1 (defect §4.3a).
              </p>
            </>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Consumption across purchase contracts (rule R6)">
          {e.consumption.length === 0 ? (
            <EmptyState title="Nothing consumed yet" glyph="○">
              An export contract is a global document that may be consumed across many purchase contracts. The
              legacy library built to track this was abandoned in 2021 with both of its calculated columns
              broken (decision D15).
            </EmptyState>
          ) : (
            <table className="dash__table">
              <caption className="sr-only">Export contract consumption</caption>
              <thead>
                <tr>
                  <th scope="col">Purchase contract</th>
                  <th scope="col">Shipment</th>
                  <th scope="col">EX form</th>
                  <th scope="col" className="text-right">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody>
                {e.consumption.map((c, i) => (
                  <tr key={`${c.exportFormNo}-${i}`}>
                    <td>{c.purchaseContractNo}</td>
                    <td>{c.shipmentRef}</td>
                    <td className="mono small">{c.exportFormNo}</td>
                    <td className="text-right">{formatMt(c.quantityMt)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3}>
                    <strong>Total consumed</strong>
                  </td>
                  <td className="text-right">
                    <strong>{formatMt(consumption.usedMt)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Pre-clearance document custody (OPU / PZU)">
          {pack ? (
            <>
              <FieldGrid
                fields={[
                  {
                    label: "Custody status",
                    value: <StatusChip tone={toneFor(pack.status)} label={humanise(pack.status)} size="sm" />,
                  },
                  { label: "Scanned document", value: pack.scannedDocumentName },
                  { label: "Scanned on", value: formatDate(pack.scannedOn) },
                  { label: "Scanned by", value: pack.scannedBy },
                  {
                    label: "Received by OPU",
                    value: pack.receivedByOpu ? `Yes — ${formatDate(pack.receivedByOpuDate)}` : "No",
                  },
                  {
                    label: "Received by PZU",
                    value: pack.receivedByPzu ? `Yes — ${formatDate(pack.receivedByPzuDate)}` : "No",
                  },
                ]}
              />
              {!pack.receivedByOpu || !pack.receivedByPzu ? (
                <Banner tone="warn" title="Custody incomplete">
                  Both units must record receipt before the clearance submission (proposed). Across the legacy
                  library ~45% of packs are not recorded as received by OPU and ~41% not by PZU.
                </Banner>
              ) : null}
            </>
          ) : (
            <EmptyState title="No custody record" glyph="○">
              {profile && profile.code !== "SD"
                ? `OPU / PZU custody is a Sudan-specific step and does not apply in ${profile.name}.`
                : "The scanned pre-clearance pack has not been logged."}
            </EmptyState>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Shipments drawing on this export contract" defaultOpen={false}>
          {linkedShipments.length === 0 ? (
            <EmptyState title="No shipment linked yet" />
          ) : (
            <ul className="doclist">
              {linkedShipments.map((s) => (
                <li key={s.id} className="required">
                  <span className="doclist__name">
                    {s.shipmentNo}
                    <span className="doclist__sub">
                      {formatMt(s.quantityMt)} · {s.shipmentType}
                    </span>
                  </span>
                  <StatusChip tone={toneFor(s.status)} label={humanise(s.status)} size="sm" />
                  <span className="small">{formatDate(s.lastShippingDate)}</span>
                  <Link className="btn btn--sm" to={`/shipments/${s.id}`}>
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>

        {e.notes ? (
          <div className="card card__body">
            <h3 className="card__title">Notes</h3>
            <p className="small" style={{ marginTop: "0.5rem" }}>
              {e.notes}
            </p>
            <p className="xsmall muted" style={{ marginTop: "0.5rem" }}>
              Per the workshop notes, the follow-up screen is deliberately being reduced to attachment and
              notes only, because the fields differ by country and standardising them is counter-productive.
            </p>
          </div>
        ) : null}

        <Dialog
          open={Boolean(consuming)}
          title={`Record consumption of EX form ${consuming?.formNo ?? ""}`}
          onClose={closeConsumption}
          footer={
            <>
              <button
                type="button"
                className="btn btn--primary"
                onClick={recordConsumption}
                disabled={recording}
              >
                {recording ? "Recording…" : "Record consumption"}
              </button>
              <button type="button" className="btn" onClick={closeConsumption}>
                Cancel
              </button>
            </>
          }
        >
          <p className="small">
            v2.0 §6.9 activity 3 records the consumption against one shipment and marks the form Used.{" "}
            {consuming ? formatMt(consuming.quantityMt) : ""} is drawn from the export contract balance.
          </p>
          {refusal ? (
            <Banner tone="risk" title="The service layer refused this consumption">
              {refusal}
            </Banner>
          ) : null}
          {consumptionCandidates.length === 0 ? (
            <Banner tone="warn" title="No shipment is available to consume this form on">
              No shipment draws on this export contract, and none exists on{" "}
              {contract?.contractNo ?? "the purchase contract"} either. A form is consumed on a clearance
              declaration for a shipment, so there is nothing to record it against yet.
            </Banner>
          ) : (
            <FormRow
              label="Consumed on shipment"
              htmlFor="exf-shipment"
              required
              hint={
                linkedShipments.length > 0
                  ? "Shipments drawing on this export contract."
                  : `No shipment draws on this export contract yet, so every shipment on ${contract?.contractNo ?? "the purchase contract"} is offered (rule R6).`
              }
            >
              <SelectInput
                id="exf-shipment"
                value={entry.shipmentId}
                onChange={(v) => setEntry((s) => ({ ...s, shipmentId: v }))}
                required
                options={consumptionCandidates.map((s) => ({
                  value: s.id,
                  label: `${s.shipmentNo} — ${formatMt(s.quantityMt)} · ${humanise(s.status)}`,
                }))}
              />
            </FormRow>
          )}
          <FormRow label="PS file number" htmlFor="exf-ps-file">
            <TextInput
              id="exf-ps-file"
              value={entry.psFileNo}
              onChange={(v) => setEntry((s) => ({ ...s, psFileNo: v }))}
            />
          </FormRow>
          <FormRow label="Export certificate number" htmlFor="exf-certificate">
            <TextInput
              id="exf-certificate"
              value={entry.exportCertificateNo}
              onChange={(v) => setEntry((s) => ({ ...s, exportCertificateNo: v }))}
            />
          </FormRow>
          <FormRow
            label="Customs declaration number"
            htmlFor="exf-declaration"
            required
            hint="The identifier that records the consumption. The store refuses without it."
          >
            <TextInput
              id="exf-declaration"
              value={entry.declarationNo}
              onChange={(v) => setEntry((s) => ({ ...s, declarationNo: v }))}
              required
            />
          </FormRow>
        </Dialog>
      </div>
    </>
  );
}
