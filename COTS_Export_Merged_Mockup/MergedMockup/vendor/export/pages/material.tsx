import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { COMMODITIES, commodityById, counterpartyName } from "../data/master";
import { formatDate, formatMoney, formatMt, formatNumber, sum, truckNetWeight } from "../domain/calc";
import { humanise, toneFor } from "../domain/status";
import type { MaterialPurchase, MaterialReceipt, TransportRequest } from "../domain/types";
import { api } from "../services/store";
import { Banner, EmptyState, ErrorState, StatusChip, useToast } from "../components/feedback";
import { CollapsibleSection, FieldGrid, PageHeader, RecordTabs, TotalBanner } from "../components/layout";
import { DataTable, type Column } from "../components/table";
import { ErrorSummary, FormRow, RequiredLegend, SelectInput, TextInput } from "../components/form";
import { useAsync } from "./hooks";

const MATERIAL_TABS = ["transport", "purchases", "receipts", "commodities"] as const;
type MaterialTab = (typeof MATERIAL_TABS)[number];

export function MaterialModule() {
  const { tab } = useParams();
  const active = (tab ?? "transport") as MaterialTab;

  const purchases = useAsync(() => api.listMaterialPurchases());
  const receipts = useAsync(() => api.listMaterialReceipts());
  const transports = useAsync(() => api.listTransportRequests());
  const shipments = useAsync(() => api.listShipments());

  if (transports.error) {
    return (
      <div className="page">
        <ErrorState detail={transports.error} onRetry={transports.reload} />
      </div>
    );
  }

  const tabs = MATERIAL_TABS.map((t) => ({
    key: t,
    label:
      t === "transport"
        ? "Transport requests"
        : t === "purchases"
          ? "Material purchases"
          : t === "receipts"
            ? "Material receipts"
            : "Commodity master",
    to: t === "transport" ? "/material" : `/material/${t}`,
    badge:
      t === "transport" && (transports.data ?? []).length > 0 ? (transports.data ?? []).length : undefined,
  }));

  const trRows = transports.data ?? [];
  const mpRows = purchases.data ?? [];
  const mrRows = receipts.data ?? [];
  const ships = shipments.data ?? [];

  const trColumns: Column<TransportRequest>[] = [
    {
      key: "trNo",
      header: "Request",
      cell: (t) => <Link to={`/material/transport/${t.id}`}>{t.trNo}</Link>,
      sortValue: (t) => t.trNo,
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => <StatusChip tone={toneFor(t.status)} label={humanise(t.status)} size="sm" />,
      sortValue: (t) => t.status,
      filterOptions: [...new Set(trRows.map((t) => t.status))].map((s) => ({ value: s, label: humanise(s) })),
      filterMatch: (t, v) => t.status === v,
    },
    {
      key: "route",
      header: "Route",
      cell: (t) => `${t.origin} → ${t.destination}`,
      sortValue: (t) => t.origin,
    },
    {
      key: "commodity",
      header: "Commodity",
      cell: (t) => commodityById(t.commodityId)?.name ?? "–",
      sortValue: (t) => commodityById(t.commodityId)?.name ?? "",
    },
    {
      key: "ready",
      header: "Ready to move",
      align: "right",
      cell: (t) => formatMt(t.readyForTransportMt),
      sortValue: (t) => t.readyForTransportMt,
    },
    {
      key: "start",
      header: "Required start",
      cell: (t) => formatDate(t.requiredStartDate),
      sortValue: (t) => t.requiredStartDate,
    },
    { key: "urgency", header: "Urgency", cell: (t) => humanise(t.urgency), sortValue: (t) => t.urgency },
    {
      key: "shipment",
      header: "Serves shipment",
      cell: (t) => {
        const s = ships.find((x) => x.id === t.shipmentId);
        return s ? <Link to={`/shipments/${s.id}`}>{s.shipmentNo}</Link> : <span className="muted">–</span>;
      },
      sortValue: (t) => t.shipmentId ?? "",
    },
    {
      key: "fulfilled",
      header: "Fulfilment recorded",
      cell: (t) =>
        t.execution ? (
          <StatusChip tone="ok" label={t.execution.transportationNo} size="sm" />
        ) : (
          <StatusChip tone="warn" label="none" size="sm" />
        ),
      sortValue: (t) => (t.execution ? 1 : 0),
    },
    {
      key: "officer",
      header: "Officer",
      cell: (t) => t.transportationOfficer ?? "–",
      sortValue: (t) => t.transportationOfficer ?? "",
      optional: true,
    },
    {
      key: "contact",
      header: "Origin contact",
      cell: (t) => `${t.contactOriginName} · ${t.contactOriginPhone}`,
      sortValue: (t) => t.contactOriginName,
      optional: true,
    },
  ];

  const mpColumns: Column<MaterialPurchase>[] = [
    { key: "no", header: "Purchase", cell: (p) => p.purchaseNo, sortValue: (p) => p.purchaseNo },
    {
      key: "po",
      header: "Sage PO",
      cell: (p) => `${p.sagePoNo} / line ${p.poLine}`,
      sortValue: (p) => p.sagePoNo,
    },
    {
      key: "supplier",
      header: "Supplier",
      cell: (p) => counterpartyName(p.supplierId),
      sortValue: (p) => counterpartyName(p.supplierId),
    },
    {
      key: "commodity",
      header: "Commodity",
      cell: (p) => commodityById(p.commodityId)?.name ?? "–",
      sortValue: (p) => commodityById(p.commodityId)?.name ?? "",
    },
    { key: "origin", header: "Origin", cell: (p) => p.origin, sortValue: (p) => p.origin },
    {
      key: "contracted",
      header: "Contracted",
      align: "right",
      cell: (p) => formatMt(p.contractedQuantityMt),
      sortValue: (p) => p.contractedQuantityMt,
    },
    {
      key: "delivered",
      header: "Delivered",
      align: "right",
      cell: (p) => formatMt(sum(p.deliveries.map((d) => d.quantityMt))),
      sortValue: (p) => sum(p.deliveries.map((d) => d.quantityMt)),
    },
    {
      key: "remaining",
      header: "Remaining",
      align: "right",
      cell: (p) => (
        <strong>
          {formatMt(Math.max(0, p.contractedQuantityMt - sum(p.deliveries.map((d) => d.quantityMt))))}
        </strong>
      ),
      sortValue: (p) => p.contractedQuantityMt - sum(p.deliveries.map((d) => d.quantityMt)),
    },
    {
      key: "closed",
      header: "PO closed",
      cell: (p) => (
        <StatusChip tone={p.closed ? "ok" : "idle"} label={p.closed ? "Closed" : "Open"} size="sm" />
      ),
      sortValue: (p) => (p.closed ? 1 : 0),
    },
    {
      key: "lines",
      header: "Delivery lines",
      align: "right",
      cell: (p) => `${p.deliveries.length}`,
      sortValue: (p) => p.deliveries.length,
      optional: true,
    },
  ];

  const mrColumns: Column<MaterialReceipt>[] = [
    { key: "no", header: "Receipt", cell: (r) => r.receiptNo, sortValue: (r) => r.receiptNo },
    {
      key: "po",
      header: "Against purchase",
      cell: (r) => mpRows.find((p) => p.id === r.materialPurchaseId)?.purchaseNo ?? "–",
      sortValue: (r) => r.materialPurchaseId,
    },
    { key: "date", header: "Date", cell: (r) => formatDate(r.date), sortValue: (r) => r.date },
    {
      key: "loc",
      header: "Receiving location",
      cell: (r) => r.receivingLocation,
      sortValue: (r) => r.receivingLocation,
    },
    {
      key: "trucks",
      header: "Trucks",
      align: "right",
      cell: (r) => `${r.trucks.length}`,
      sortValue: (r) => r.trucks.length,
    },
    {
      key: "gross",
      header: "Gross weight",
      align: "right",
      cell: (r) => `${formatNumber(sum(r.trucks.map((t) => t.grossWeightKg)))} kg`,
      sortValue: (r) => sum(r.trucks.map((t) => t.grossWeightKg)),
    },
    {
      key: "tare",
      header: "Packaging tare",
      align: "right",
      cell: (r) => `${formatNumber(sum(r.trucks.map((t) => truckNetWeight(t).tareKg)))} kg`,
      sortValue: (r) => sum(r.trucks.map((t) => truckNetWeight(t).tareKg)),
    },
    {
      key: "net",
      header: "Net weight",
      align: "right",
      cell: (r) => <strong>{formatNumber(sum(r.trucks.map((t) => truckNetWeight(t).netKg)))} kg</strong>,
      sortValue: (r) => sum(r.trucks.map((t) => truckNetWeight(t).netKg)),
    },
  ];

  return (
    <>
      <PageHeader
        moduleLabel="Support"
        crumbs={[{ label: "Home", to: "/" }, { label: "Material & transport" }]}
        title="Material & transport"
        meta="Packaging and operational material purchase, receipt with derived net weight, and road transport"
        recordKey={`${trRows.length}`}
        recordDate="transport requests"
        tabs={<RecordTabs tabs={tabs} />}
      />

      <div className="page">
        <Banner tone="info" title="Support process, not the export lifecycle">
          Linked to export execution but deliberately not part of it. Per the workshop notes the logistics
          service request is a Sudan-only step, so this module must not be presented as universal.
        </Banner>

        {active === "transport" ? (
          <>
            <DataTable
              caption="Transport requests"
              rows={trRows}
              columns={trColumns}
              loading={transports.loading}
              searchPlaceholder="Search by request number, origin, destination or commodity…"
              searchValue={(t) =>
                `${t.trNo} ${t.origin} ${t.destination} ${commodityById(t.commodityId)?.name ?? ""}`
              }
              rowHref={(t) => `/material/transport/${t.id}`}
              savedViews={[
                {
                  key: "open",
                  label: "Open requests",
                  predicate: (t) => t.status !== "delivered" && t.status !== "cancelled",
                },
                { key: "all", label: "All requests" },
                {
                  key: "unfulfilled",
                  label: "No fulfilment recorded",
                  description:
                    "In the legacy system every one of 312 requests is in this state — the execution library holds zero records.",
                  predicate: (t) => !t.execution,
                },
              ]}
            />
            <Banner tone="warn" title="The legacy transport loop was never closed">
              The transportation execution library holds <strong>0 records</strong> against 312 requests,
              because a required carrier drop-down cannot load its options (decision D4). Fulfilment is a
              first-class part of the request here.
            </Banner>
          </>
        ) : null}

        {active === "purchases" ? (
          <>
            <DataTable
              caption="Material purchases"
              rows={mpRows}
              columns={mpColumns}
              loading={purchases.loading}
              searchPlaceholder="Search by purchase or PO number…"
              searchValue={(p) => `${p.purchaseNo} ${p.sagePoNo} ${counterpartyName(p.supplierId)}`}
              savedViews={[
                { key: "open", label: "Open orders", predicate: (p) => !p.closed },
                { key: "all", label: "All purchases" },
              ]}
            />
            <div className="stack">
              {mpRows.map((p) => (
                <CollapsibleSection
                  key={p.id}
                  title={`${p.purchaseNo} — ${commodityById(p.commodityId)?.name} — ${p.deliveries.length} delivery line(s)`}
                  defaultOpen={false}
                  indicator={
                    <StatusChip
                      tone={p.closed ? "ok" : "idle"}
                      label={p.closed ? "PO closed" : "Open"}
                      size="sm"
                    />
                  }
                >
                  {p.deliveries.length === 0 ? (
                    <EmptyState title="No delivery drawn against this order yet" glyph="○" />
                  ) : (
                    <>
                      <div className="dtable__scroll">
                        <table className="dtable__table">
                          <caption className="sr-only">Deliveries</caption>
                          <thead>
                            <tr>
                              <th scope="col">Date</th>
                              <th scope="col" className="text-right">
                                Quantity
                              </th>
                              <th scope="col" className="text-right">
                                Price per MT
                              </th>
                              <th scope="col">Location</th>
                              <th scope="col">PO line</th>
                              <th scope="col">Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.deliveries.map((d, i) => (
                              <tr key={`${d.date}-${i}`}>
                                <td>{formatDate(d.date)}</td>
                                <td className="text-right">{formatMt(d.quantityMt)}</td>
                                <td className="text-right">{formatMoney(d.price)}</td>
                                <td>{d.deliveryLocation}</td>
                                <td>{d.poLine}</td>
                                <td className="small muted">{d.note ?? "–"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <TotalBanner
                        label="Total delivered against this order"
                        value={formatMt(sum(p.deliveries.map((d) => d.quantityMt)))}
                        derivation={`sum of ${p.deliveries.length} delivery line(s); ordered ${formatMt(p.contractedQuantityMt)}`}
                      />
                      <p className="small muted" style={{ marginTop: "0.5rem" }}>
                        Every delivery line — including the price paid — is queryable here. In the legacy
                        library none of the six delivery columns is promoted to the database, so individual
                        deliveries cannot be reported on, filtered or exported.
                      </p>
                    </>
                  )}
                </CollapsibleSection>
              ))}
            </div>
          </>
        ) : null}

        {active === "receipts" ? (
          <>
            <DataTable
              caption="Material receipts"
              rows={mrRows}
              columns={mrColumns}
              loading={receipts.loading}
              searchPlaceholder="Search by receipt number or location…"
              searchValue={(r) => `${r.receiptNo} ${r.receivingLocation}`}
            />
            <div className="stack">
              {mrRows.map((r) => {
                const gross = sum(r.trucks.map((t) => t.grossWeightKg));
                const tare = sum(r.trucks.map((t) => truckNetWeight(t).tareKg));
                const net = sum(r.trucks.map((t) => truckNetWeight(t).netKg));
                return (
                  <CollapsibleSection
                    key={r.id}
                    title={`${r.receiptNo} — ${r.trucks.length} truck(s) at ${r.receivingLocation}`}
                    defaultOpen={false}
                  >
                    <div className="dtable__scroll">
                      <table className="dtable__table">
                        <caption className="sr-only">Truck receipts</caption>
                        <thead>
                          <tr>
                            <th scope="col">Plate</th>
                            <th scope="col" className="text-right">
                              Gross (kg)
                            </th>
                            <th scope="col" className="text-right">
                              BP bags
                            </th>
                            <th scope="col" className="text-right">
                              SP bags
                            </th>
                            <th scope="col" className="text-right">
                              Jute bags
                            </th>
                            <th scope="col" className="text-right">
                              Jute bales
                            </th>
                            <th scope="col" className="text-right">
                              Plastic bales
                            </th>
                            <th scope="col" className="text-right">
                              Trico bales
                            </th>
                            <th scope="col" className="text-right">
                              Tare (kg)
                            </th>
                            <th scope="col" className="text-right">
                              Net (kg)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.trucks.map((t) => {
                            const w = truckNetWeight(t);
                            return (
                              <tr key={t.plateNo}>
                                <td className="mono small">{t.plateNo}</td>
                                <td className="text-right">{formatNumber(t.grossWeightKg)}</td>
                                <td className="text-right">{formatNumber(t.packaging.bpBags)}</td>
                                <td className="text-right">{formatNumber(t.packaging.spBags)}</td>
                                <td className="text-right">{formatNumber(t.packaging.juteBags)}</td>
                                <td className="text-right">{formatNumber(t.packaging.juteBales)}</td>
                                <td className="text-right">{formatNumber(t.packaging.plasticBales)}</td>
                                <td className="text-right">{formatNumber(t.packaging.tricoBales)}</td>
                                <td className="text-right">{formatNumber(w.tareKg)}</td>
                                <td className="text-right">
                                  <strong>{formatNumber(w.netKg)}</strong>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <TotalBanner
                      label="Total net weight received"
                      value={`${formatNumber(net)} kg`}
                      derivation={`gross ${formatNumber(gross)} kg less packaging tare ${formatNumber(tare)} kg, derived per truck (rule R16)`}
                    />
                    <p className="small muted" style={{ marginTop: "0.5rem" }}>
                      Net weight is derived from gross less a per-packaging-type tare, never typed — the best
                      calculation in the legacy estate, kept. What is new is that every truck-level figure is
                      queryable: in the legacy library not one of the ten truck columns is promoted, nor the
                      receipt date, receiving location or purchase-order link.
                    </p>
                  </CollapsibleSection>
                );
              })}
            </div>
          </>
        ) : null}

        {active === "commodities" ? (
          <>
            <h2 className="page__title">Commodity master</h2>
            <p className="page__intro">
              The legacy master is a single-column list of 15 entries, seeded in four minutes in March 2020
              and never touched since, with three naming conventions, overlapping meanings and no way to
              retire an entry. This one adds a code, a category, packing and quality defaults, and an{" "}
              <code>active</code> flag.
            </p>
            <div className="card">
              <div className="dtable__scroll">
                <table className="dtable__table">
                  <caption className="sr-only">Commodity master</caption>
                  <thead>
                    <tr>
                      <th scope="col">Code</th>
                      <th scope="col">Name</th>
                      <th scope="col">Category</th>
                      <th scope="col">Default packing</th>
                      <th scope="col">Fumigation</th>
                      <th scope="col">Quality parameters</th>
                      <th scope="col">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMMODITIES.map((c) => (
                      <tr key={c.id}>
                        <td className="mono small">{c.code}</td>
                        <td>{c.name}</td>
                        <td>{humanise(c.category)}</td>
                        <td>{humanise(c.defaultPackingType)}</td>
                        <td>{c.requiresFumigation ? "Required" : "Not required"}</td>
                        <td className="small">
                          {c.qualityParameters.map((q) => `${q.name} ${q.spec}`).join("; ")}
                        </td>
                        <td>
                          <StatusChip
                            tone={c.active ? "ok" : "na"}
                            label={c.active ? "Active" : "Retired"}
                            size="sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

/* ================================================================== *
 * Transport request detail + edit
 * ================================================================== */

export function TransportRequestDetail() {
  const { id = "" } = useParams();
  const request = useAsync(() => api.getTransportRequest(id), [id]);
  const shipments = useAsync(() => api.listShipments());

  if (request.error) {
    return (
      <div className="page">
        <ErrorState detail={request.error} onRetry={request.reload} />
      </div>
    );
  }
  if (request.loading)
    return (
      <div className="page">
        <div className="card card__body muted">Loading…</div>
      </div>
    );
  const t = request.data;
  if (!t) {
    return (
      <div className="page">
        <EmptyState
          title="Transport request not found"
          action={
            <Link className="btn btn--primary" to="/material">
              Back to material &amp; transport
            </Link>
          }
        />
      </div>
    );
  }
  const shipment = (shipments.data ?? []).find((s) => s.id === t.shipmentId);

  return (
    <>
      <PageHeader
        moduleLabel="Material & transport"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Material & transport", to: "/material" },
          { label: t.trNo },
        ]}
        title={`Transport request ${t.trNo}`}
        statusChip={<StatusChip tone={toneFor(t.status)} label={humanise(t.status)} />}
        meta={`${t.origin} → ${t.destination} · ${commodityById(t.commodityId)?.name} · ${formatMt(t.readyForTransportMt)} ready`}
        recordKey={t.trNo}
        recordDate={formatDate(t.requiredStartDate)}
        actions={
          <div className="actionbar">
            <Link className="btn btn--on-brand" to={`/material/transport/${t.id}/edit`}>
              Edit request
            </Link>
            {shipment ? (
              <Link className="btn btn--on-brand" to={`/shipments/${shipment.id}`}>
                Open shipment {shipment.shipmentNo}
              </Link>
            ) : null}
          </div>
        }
      />
      <div className="page">
        <CollapsibleSection title="Request detail">
          <FieldGrid
            fields={[
              { label: "Request number", value: t.trNo, behaviour: "readonly" },
              {
                label: "Required start date",
                value: formatDate(t.requiredStartDate),
                behaviour: "required",
                hint: "Minimum two days' notice (rule R26)",
              },
              {
                label: "Total quantity",
                value: t.quantityMt !== undefined ? formatMt(t.quantityMt) : undefined,
              },
              { label: "Ready to move", value: formatMt(t.readyForTransportMt), behaviour: "required" },
              { label: "UOM", value: t.uom, behaviour: "required" },
              { label: "Bag count", value: formatNumber(t.bagCount), behaviour: "required" },
              { label: "Bag size", value: `${t.bagSizeKg} kg`, behaviour: "required" },
              { label: "Company", value: t.companyName, behaviour: "required" },
              {
                label: "Origin",
                value: `${t.origin}${t.originAddress ? ` — ${t.originAddress}` : ""}`,
                behaviour: "required",
              },
              { label: "Destination", value: t.destination },
              { label: "Commodity", value: commodityById(t.commodityId)?.name, behaviour: "required" },
              { label: "Urgency", value: humanise(t.urgency) },
              {
                label: "Transportation cluster",
                value: t.transportationCluster,
                hint: "Legacy: on the form with no column — cannot be reported",
              },
              { label: "Transportation officer", value: t.transportationOfficer },
              { label: "Bill address", value: t.billAddress },
              {
                label: "PO / project",
                value: [t.poNo, t.projectCode, t.subProjectCode].filter(Boolean).join(" / "),
              },
              { label: "Special instruction", value: t.specialInstruction },
            ]}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Contacts">
          <FieldGrid
            fields={[
              { label: "Contact at origin", value: t.contactOriginName, behaviour: "required" },
              {
                label: "Origin phone",
                value: t.contactOriginPhone,
                behaviour: "required",
                hint: "Stored as text — the legacy column is an Integer, which strips leading zeros and rejects +, spaces and hyphens",
              },
              { label: "Contact at destination", value: t.contactDestinationName, behaviour: "required" },
              {
                label: "Destination phone",
                value: t.contactDestinationPhone,
                behaviour: "required",
                hint: "Stored as text for the same reason",
              },
            ]}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Fulfilment"
          indicator={
            <StatusChip
              tone={t.execution ? "ok" : "warn"}
              label={t.execution ? "Recorded" : "Not recorded"}
              size="sm"
            />
          }
        >
          {t.execution ? (
            <FieldGrid
              fields={[
                {
                  label: "Transportation number",
                  value: t.execution.transportationNo,
                  behaviour: "readonly",
                },
                { label: "Carrier", value: t.execution.carrier, behaviour: "required" },
                { label: "Transport mode", value: t.execution.transportMode },
                { label: "Truck size", value: formatMt(t.execution.truckSizeMt) },
                { label: "Driver", value: t.execution.driverName },
                {
                  label: "Driver mobile",
                  value: t.execution.driverMobile,
                  hint: "Legacy: an Integer column named Drver_x0020_Name's sibling",
                },
                { label: "Plate number", value: t.execution.plateNo },
                { label: "Waybill", value: t.execution.waybillNo, behaviour: "required" },
                { label: "Loading start", value: formatDate(t.execution.loadingStartDate) },
                {
                  label: "Loading finish",
                  value: formatDate(t.execution.loadingFinishDate),
                  hint: "Legacy: on the form with no column, so loading duration could never be measured",
                },
                {
                  label: "Loading duration",
                  value:
                    t.execution.loadingStartDate && t.execution.loadingFinishDate
                      ? `${Math.round((Date.parse(t.execution.loadingFinishDate) - Date.parse(t.execution.loadingStartDate)) / 86400000)} day(s)`
                      : undefined,
                  behaviour: "calculated",
                },
                {
                  label: "Remaining against the request",
                  value: formatMt(Math.max(0, t.readyForTransportMt - t.execution.truckSizeMt)),
                  behaviour: "calculated",
                  hint: 'Legacy: this calculated field displays the literal string "NaN" on a blank form',
                },
              ]}
            />
          ) : (
            <EmptyState title="No fulfilment recorded" glyph="○">
              In the legacy system this is the state of all 312 requests — the execution library has never
              held a single record.
            </EmptyState>
          )}
          {t.execution?.remarks ? (
            <p className="small muted" style={{ marginTop: "0.75rem" }}>
              {t.execution.remarks}
            </p>
          ) : null}
        </CollapsibleSection>
      </div>
    </>
  );
}

export function TransportRequestForm() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const request = useAsync(() => api.getTransportRequest(id), [id]);
  const t = request.data;

  const [originPhone, setOriginPhone] = useState("");
  const [destPhone, setDestPhone] = useState("");
  const [officer, setOfficer] = useState("");
  const [urgency, setUrgency] = useState<"low" | "medium" | "high" | "">("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  if (t && !hydrated) {
    setOriginPhone(t.contactOriginPhone);
    setDestPhone(t.contactDestinationPhone);
    setOfficer(t.transportationOfficer ?? "");
    setUrgency(t.urgency);
    setHydrated(true);
  }

  if (request.loading)
    return (
      <div className="page">
        <div className="card card__body muted">Loading…</div>
      </div>
    );
  if (!t) {
    return (
      <div className="page">
        <EmptyState
          title="Transport request not found"
          action={
            <Link className="btn btn--primary" to="/material">
              Back
            </Link>
          }
        />
      </div>
    );
  }

  const PHONE = /^[+\d][\d\s()+-]{5,}$/;

  return (
    <>
      <PageHeader
        moduleLabel="Material & transport"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Material & transport", to: "/material" },
          { label: t.trNo, to: `/material/transport/${t.id}` },
          { label: "Edit" },
        ]}
        title={`Edit transport request ${t.trNo}`}
        meta="Demonstrates phone-number validation that the legacy Integer column cannot express"
        recordKey={t.trNo}
      />
      <div className="page">
        <form
          className="card card__body stack"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setServerError(null);
            const next: Record<string, string> = {};
            if (!originPhone.trim()) next["tr-ophone"] = "Enter the origin contact phone number.";
            else if (!PHONE.test(originPhone.trim()))
              next["tr-ophone"] =
                "Enter a valid phone number — digits with optional +, spaces, hyphens or brackets.";
            if (!destPhone.trim()) next["tr-dphone"] = "Enter the destination contact phone number.";
            else if (!PHONE.test(destPhone.trim()))
              next["tr-dphone"] =
                "Enter a valid phone number — digits with optional +, spaces, hyphens or brackets.";
            if (!urgency) next["tr-urgency"] = "Select an urgency.";
            setErrors(next);
            if (Object.keys(next).length > 0) return;

            const res = await api.updateTransportRequest(t.id, {
              contactOriginPhone: originPhone.trim(),
              contactDestinationPhone: destPhone.trim(),
              transportationOfficer: officer || undefined,
              urgency: urgency as "low" | "medium" | "high",
            });
            if (!res.ok) {
              setServerError(res.reason);
              return;
            }
            toast.push("ok", `Transport request ${t.trNo} updated.`);
            navigate(`/material/transport/${t.id}`);
          }}
        >
          {serverError ? (
            <Banner tone="risk" title="The request could not be saved">
              {serverError}
            </Banner>
          ) : null}
          <ErrorSummary errors={Object.entries(errors).map(([field, message]) => ({ field, message }))} />

          <FieldGrid
            fields={[
              { label: "Request number", value: t.trNo, behaviour: "readonly" },
              { label: "Route", value: `${t.origin} → ${t.destination}`, behaviour: "inherited" },
              { label: "Commodity", value: commodityById(t.commodityId)?.name, behaviour: "inherited" },
              { label: "Ready to move", value: formatMt(t.readyForTransportMt), behaviour: "inherited" },
            ]}
          />

          <div className="fields">
            <FormRow
              label="Origin contact phone"
              htmlFor="tr-ophone"
              required
              error={errors["tr-ophone"]}
              hint="Text, so leading zeros, +, spaces, hyphens and extensions all survive."
            >
              <TextInput
                id="tr-ophone"
                value={originPhone}
                onChange={setOriginPhone}
                required
                error={errors["tr-ophone"]}
                inputMode="tel"
              />
            </FormRow>
            <FormRow
              label="Destination contact phone"
              htmlFor="tr-dphone"
              required
              error={errors["tr-dphone"]}
            >
              <TextInput
                id="tr-dphone"
                value={destPhone}
                onChange={setDestPhone}
                required
                error={errors["tr-dphone"]}
                inputMode="tel"
              />
            </FormRow>
            <FormRow label="Transportation officer" htmlFor="tr-officer">
              <TextInput id="tr-officer" value={officer} onChange={setOfficer} />
            </FormRow>
            <FormRow label="Urgency" htmlFor="tr-urgency" required error={errors["tr-urgency"]}>
              <SelectInput
                id="tr-urgency"
                value={urgency}
                onChange={setUrgency}
                required
                error={errors["tr-urgency"]}
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ]}
              />
            </FormRow>
          </div>

          <Banner tone="info" title="Why this form exists in the mock-up">
            The legacy transport request is the only form on the whole site that meaningfully enforces
            completeness — eleven required fields and an inline lead-time note. But both phone numbers are
            stored as Integers, so a leading zero is silently stripped and a plus sign cannot be entered at
            all, on the one form whose purpose is letting a driver be reached at each end.
          </Banner>

          <RequiredLegend />

          <div className="factions">
            <button type="submit" className="btn btn--primary">
              Save changes
            </button>
            <Link className="btn" to={`/material/transport/${t.id}`}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
