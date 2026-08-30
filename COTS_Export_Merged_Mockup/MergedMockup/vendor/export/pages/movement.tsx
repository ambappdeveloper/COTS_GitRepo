/**
 * Phase 10 — Cargo movement and stuffing request.
 *
 * Source: workflow v2.0 §6.10; register G-12 and §16.1 record this phase as having
 * no screen at all, so everything here is new surface over an existing operation.
 *
 * What the source says, and what this screen therefore shows:
 *  · Trigger [AS-IS] — cargo is cleared, or ready and cleared for movement, and
 *    loading is to begin.
 *  · Inputs [AS-IS] — allocated and ready cargo (Phase 06) and the transport
 *    arrangement and booking (Phase 08). The third input, the transfer prices
 *    between the source, transit and export countries where the movement crosses an
 *    entity boundary, is [OPEN] and "to be prepared by Hiba", so no price is shown
 *    or implied anywhere on these screens.
 *  · Activities [AS-IS], in sequence — (1) cargo is moved before the start of the
 *    stuffing operation, loading from the origin city to the port country;
 *    (2) the movement is tracked, either by truck details or, for bulk, as a daily
 *    operation recording the number of trips and the quantities loaded and received;
 *    (3) the stuffing request is raised to initiate the beginning of the stuffing
 *    operation; (4) the stuffing request is communicated to Quality, Logistics,
 *    Clearance, Warehousing and Processing.
 *  · Owner [AS-IS] — Partner Execution at origin, with Logistics for the movement.
 *    In Sudan the movement is a service request to the Logistics department.
 *  · System or channel — SAP carries the Sudan service request today; COTS is the
 *    intended destination for the stuffing request. Odoo integration for logistics
 *    data is [PROPOSED].
 *  · Outputs [AS-IS] — cargo at the port country ready for stuffing; a stuffing
 *    request notified to five functions; goods in transit records, whose existing
 *    reference reports are named verbatim on the movement legs tab.
 *
 * Deliberately absent:
 *  · No status model for the stuffing request. v2.0 §6.10: "No state model is given
 *    for the stuffing request. [OPEN]" — so the record carries `raisedOn` and
 *    nothing else, and "raised" is presence, not a status.
 *  · No blocking rule on stuffing. Whether stuffing can begin without a stuffing
 *    request is [OPEN]; `checkStuffingRequestRaised` advises and never refuses, and
 *    its wording is used verbatim rather than restated here.
 *  · No owner for a loaded-versus-received variance. Neither source says where it is
 *    raised or resolved — that is decision D-19 — so the variance is surfaced and
 *    attributed to nobody.
 *  · No transfer price. Where a leg crosses an entity boundary and the price is not
 *    known, the screen says the figure is outstanding; it does not estimate one.
 */

import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { TODAY, formatDate, formatMt, formatNumber, sum } from "../domain/calc";
import { movementTotals } from "../domain/sourcing";
import {
  MOVEMENT_LEG_TRANSITIONS,
  checkStuffingRequestRaised,
  humanise,
  nextStates,
  toneFor,
} from "../domain/status";
import type { MovementLeg, MovementLegState, StuffingNotifyFunction, StuffingRequest } from "../domain/types";
import { countryName } from "../domain/variants";
import { api } from "../services/store";
import { Banner, EmptyState, ErrorState, StatusChip, useToast } from "../components/feedback";
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
import { ErrorSummary, FormRow, RequiredLegend, TextInput } from "../components/form";
import { DataTable, type Column } from "../components/table";
import { useAsync } from "./hooks";

const MOVEMENT_TABS = ["legs", "requests"] as const;
type MovementTab = (typeof MOVEMENT_TABS)[number];

/**
 * §6.10 activity 4 names the five functions the stuffing request is communicated to.
 * The stored key for the fourth is `warehouse`; the source says "Warehousing".
 */
const NOTIFY_LABEL: Record<StuffingNotifyFunction, string> = {
  quality: "Quality",
  logistics: "Logistics",
  clearance: "Clearance",
  warehouse: "Warehousing",
  processing: "Processing",
};

const NOTIFY_ORDER: StuffingNotifyFunction[] = [
  "quality",
  "logistics",
  "clearance",
  "warehouse",
  "processing",
];

/** §6.10 exception: quantity loaded and quantity received differ. Owner is decision D-19. */
const D19 =
  "Where a loaded-versus-received quantity variance is raised and resolved — compliance case, commercial claim, or execution correction — is decision D-19. Neither source states it.";

/** §6.10 input 3, verbatim in substance: the prices are [OPEN], to be prepared by Hiba. */
const TRANSFER_PRICE_OPEN =
  "The transfer prices between the source, transit and export countries are [OPEN] — to be prepared by Hiba. No price is shown here because none is recorded.";

const OPEN_QUESTIONS: { question: string; owner: string }[] = [
  {
    question:
      "The transfer prices from the source countries to the transit and export countries are to be prepared by Hiba.",
    owner: "Hiba — outstanding master data, blocking cross-entity cargo movement",
  },
  {
    question: "Whether the stuffing request is a blocking precondition of stuffing.",
    owner: "Execution process owner — no rule is stated in either source",
  },
  {
    question: "Where a loaded-versus-received variance is raised and by whom.",
    owner: "Compliance and Execution — decision D-19",
  },
];

const ackCount = (r: StuffingRequest) => r.notifications.filter((n) => n.acknowledgedOn).length;
const fullyAcknowledged = (r: StuffingRequest) => ackCount(r) === r.notifications.length;

/* ================================================================== *
 * Module — movement legs and stuffing requests
 * ================================================================== */

export function MovementModule() {
  const { tab } = useParams();
  const active = (tab ?? "legs") as MovementTab;
  const toast = useToast();
  const { user } = useAuth();

  const legs = useAsync(() => api.listMovementLegs());
  const requests = useAsync(() => api.listStuffingRequests());
  const shipments = useAsync(() => api.listShipments());
  const contracts = useAsync(() => api.listContracts());

  /** Refusals are shown next to the control that caused them, as well as in a toast. */
  const [refusals, setRefusals] = useState<Record<string, string>>({});

  if (legs.error) {
    return (
      <div className="page">
        <ErrorState detail={legs.error} onRetry={legs.reload} />
      </div>
    );
  }

  const legRows = legs.data ?? [];
  const reqRows = requests.data ?? [];
  const ships = shipments.data ?? [];
  const cts = contracts.data ?? [];

  const shipmentOf = (id: string) => ships.find((s) => s.id === id);
  const contractRefOf = (shipmentId: string) => {
    const s = shipmentOf(shipmentId);
    return s ? (cts.find((c) => c.id === s.contractId)?.contractNo ?? "") : "";
  };

  const inTransitMt = sum(
    legRows.filter((l) => l.state === "in_transit").map((l) => movementTotals(l.trips).loadedMt),
  );
  const awaitingReceipt = legRows.filter((l) => movementTotals(l.trips).awaitingReceipt > 0);
  const priceOutstanding = legRows.filter((l) => l.crossesEntityBoundary && !l.transferPriceKnown);
  const withVariance = legRows.filter((l) => movementTotals(l.trips).varianceMt !== 0);

  const tabs = MOVEMENT_TABS.map((t) => ({
    key: t,
    label: t === "legs" ? "Movement legs" : "Stuffing requests",
    to: t === "legs" ? "/movement" : `/movement/${t}`,
    badge: t === "legs" ? legRows.length || undefined : reqRows.length || undefined,
  }));

  const legColumns: Column<MovementLeg>[] = [
    {
      key: "legNo",
      header: "Leg",
      cell: (l) => <Link to={`/movement/leg/${l.id}`}>{l.legNo}</Link>,
      sortValue: (l) => l.legNo,
    },
    {
      key: "shipment",
      header: "Shipment",
      cell: (l) => {
        const s = shipmentOf(l.shipmentId);
        return s ? <Link to={`/shipments/${s.id}`}>{s.shipmentNo}</Link> : <span className="muted">–</span>;
      },
      sortValue: (l) => shipmentOf(l.shipmentId)?.shipmentNo ?? "",
    },
    {
      key: "mode",
      header: "Mode",
      cell: (l) => <StatusChip tone="info" label={humanise(l.mode)} size="sm" />,
      sortValue: (l) => l.mode,
      filterOptions: [...new Set(legRows.map((l) => l.mode))].map((m) => ({
        value: m,
        label: humanise(m),
      })),
      filterMatch: (l, v) => l.mode === v,
    },
    { key: "from", header: "From", cell: (l) => l.fromLocation, sortValue: (l) => l.fromLocation },
    { key: "to", header: "To", cell: (l) => l.toLocation, sortValue: (l) => l.toLocation },
    {
      key: "originCountry",
      header: "Origin country",
      cell: (l) => countryName(l.originCountry),
      sortValue: (l) => countryName(l.originCountry),
      optional: true,
    },
    {
      key: "destinationCountry",
      header: "Destination country",
      cell: (l) => l.destinationCountry,
      sortValue: (l) => l.destinationCountry,
      optional: true,
    },
    {
      key: "state",
      header: "State",
      cell: (l) => <StatusChip tone={toneFor(l.state)} label={humanise(l.state)} size="sm" />,
      sortValue: (l) => l.state,
      filterOptions: [...new Set(legRows.map((l) => l.state))].map((s) => ({
        value: s,
        label: humanise(s),
      })),
      filterMatch: (l, v) => l.state === v,
    },
    {
      key: "planned",
      header: "Planned",
      align: "right",
      cell: (l) => formatMt(l.plannedQuantityMt),
      sortValue: (l) => l.plannedQuantityMt,
    },
    {
      key: "loaded",
      header: "Loaded",
      align: "right",
      cell: (l) => formatMt(movementTotals(l.trips).loadedMt),
      sortValue: (l) => movementTotals(l.trips).loadedMt,
    },
    {
      key: "received",
      header: "Received",
      align: "right",
      cell: (l) => formatMt(movementTotals(l.trips).receivedMt),
      sortValue: (l) => movementTotals(l.trips).receivedMt,
    },
    {
      key: "variance",
      header: "Variance",
      align: "right",
      cell: (l) => {
        const t = movementTotals(l.trips);
        return t.varianceMt === 0 ? (
          <span className="muted">{formatMt(0)}</span>
        ) : (
          <StatusChip tone="warn" label={formatMt(t.varianceMt)} size="sm" title={D19} />
        );
      },
      sortValue: (l) => movementTotals(l.trips).varianceMt,
    },
    {
      key: "trips",
      header: "Trips",
      align: "right",
      cell: (l) => formatNumber(movementTotals(l.trips).trips),
      sortValue: (l) => movementTotals(l.trips).trips,
      optional: true,
    },
    {
      key: "serviceRequest",
      header: "Service request",
      cell: (l) =>
        l.serviceRequestNo ? (
          <span className="mono small">{l.serviceRequestNo}</span>
        ) : (
          <span className="muted">–</span>
        ),
      sortValue: (l) => l.serviceRequestNo ?? "",
      optional: true,
    },
  ];

  const requestColumns: Column<StuffingRequest>[] = [
    { key: "requestNo", header: "Request", cell: (r) => r.requestNo, sortValue: (r) => r.requestNo },
    {
      key: "shipment",
      header: "Shipment",
      cell: (r) => {
        const s = shipmentOf(r.shipmentId);
        return s ? <Link to={`/shipments/${s.id}`}>{s.shipmentNo}</Link> : <span className="muted">–</span>;
      },
      sortValue: (r) => shipmentOf(r.shipmentId)?.shipmentNo ?? "",
    },
    {
      key: "location",
      header: "Stuffing location",
      cell: (r) => r.stuffingLocation,
      sortValue: (r) => r.stuffingLocation,
    },
    {
      key: "quantity",
      header: "Quantity",
      align: "right",
      cell: (r) => formatMt(r.quantityMt),
      sortValue: (r) => r.quantityMt,
    },
    {
      key: "start",
      header: "Planned start",
      cell: (r) => formatDate(r.plannedStartDate),
      sortValue: (r) => r.plannedStartDate ?? "",
    },
    {
      key: "containers",
      header: "Planned containers",
      align: "right",
      cell: (r) =>
        r.plannedContainerCount === undefined ? (
          <span className="muted">–</span>
        ) : (
          formatNumber(r.plannedContainerCount)
        ),
      sortValue: (r) => r.plannedContainerCount ?? 0,
      optional: true,
    },
    {
      key: "raisedOn",
      header: "Raised on",
      cell: (r) =>
        r.raisedOn ? formatDate(r.raisedOn) : <StatusChip tone="warn" label="not raised" size="sm" />,
      sortValue: (r) => r.raisedOn ?? "",
    },
    {
      key: "raisedBy",
      header: "Raised by",
      cell: (r) => r.raisedBy ?? <span className="muted">–</span>,
      sortValue: (r) => r.raisedBy ?? "",
      optional: true,
    },
    {
      key: "ack",
      header: "Acknowledged",
      cell: (r) => (
        <StatusChip
          tone={fullyAcknowledged(r) ? "ok" : "warn"}
          label={`${ackCount(r)} of ${r.notifications.length}`}
          size="sm"
          title="§6.10 activity 4: the stuffing request is communicated to Quality, Logistics, Clearance, Warehousing and Processing."
        />
      ),
      sortValue: (r) => ackCount(r),
    },
  ];

  const raise = async (r: StuffingRequest) => {
    const res = await api.raiseStuffingRequest(r.id, user?.displayName ?? "Partner Execution");
    if (!res.ok) {
      setRefusals((x) => ({ ...x, [r.id]: res.reason }));
      toast.push("risk", res.reason);
      return;
    }
    setRefusals((x) => ({ ...x, [r.id]: "" }));
    toast.push("ok", `Stuffing request ${r.requestNo} raised and notified to the five functions.`);
  };

  const acknowledge = async (r: StuffingRequest, fn: StuffingNotifyFunction) => {
    const res = await api.acknowledgeStuffingRequest(r.id, fn, user?.displayName ?? "Partner Execution");
    if (!res.ok) {
      setRefusals((x) => ({ ...x, [r.id]: res.reason }));
      toast.push("risk", res.reason);
      return;
    }
    setRefusals((x) => ({ ...x, [r.id]: "" }));
    toast.push("ok", `${NOTIFY_LABEL[fn]} acknowledged stuffing request ${r.requestNo}.`);
  };

  return (
    <>
      <PageHeader
        moduleLabel="Movement & stuffing requests"
        crumbs={[{ label: "Home", to: "/" }, { label: "Movement & stuffing requests" }]}
        title="Movement & stuffing requests"
        meta="Phase 10 — cargo moved from the origin city to the port country before stuffing begins, tracked by truck detail or as a bulk daily operation, and the stuffing request that initiates the stuffing operation"
        recordKey={`${legRows.length}`}
        recordDate="movement legs"
        tabs={<RecordTabs tabs={tabs} />}
      />

      <div className="page">
        {active === "legs" ? (
          <>
            <Banner tone="info" title="Where this data lives today (v2.0 §6.10, register G-12)">
              Phase 10 has no screen in either source. The goods in transit records exist as four reference
              reports: the <strong>Goods In Transit</strong> report (processing team), the{" "}
              <strong>Goods In Transit to Douala</strong> report (Chad), the{" "}
              <strong>In Transit Status Report PZU CIM</strong> (logistics, Sudan) and the{" "}
              <strong>Sudan Local Shunting Summary</strong> report. SAP carries the Sudan service request
              today; COTS is the intended destination for the stuffing request. Odoo integration for logistics
              data is proposed, with no decision.
            </Banner>

            <Banner tone="info" title="Cargo movement before stuffing differs by country (v2.0 §6.10)">
              Movement before stuffing is named as one of the main differences between countries' execution
              operations. Chad moves cargo overland to Douala; Ethiopia to Djibouti by truck or rail; Sudan
              raises a logistics service request. Cross-country sourcing and processing adds a clearance
              execution in the country of origin. Local shunting movement for the SMA is not covered in SAP,
              and the number of trips matters for the monthly transportation cost allocation.
            </Banner>

            <Banner tone="warn" title="Decision D-19 — the variance has no owner">
              {D19}
              {withVariance.length > 0
                ? ` ${withVariance.length} of ${legRows.length} leg(s) below already show one.`
                : ""}
            </Banner>

            {priceOutstanding.length > 0 ? (
              <Banner
                tone="warn"
                title={`${priceOutstanding.length} leg(s) cross an entity boundary with no transfer price`}
              >
                {TRANSFER_PRICE_OPEN} Affected legs:{" "}
                {priceOutstanding.map((l, i) => (
                  <span key={l.id}>
                    {i > 0 ? ", " : ""}
                    <Link to={`/movement/leg/${l.id}`}>{l.legNo}</Link>
                  </span>
                ))}
                .
              </Banner>
            ) : null}

            <div className="grid-3">
              <SummaryCard title="Tonnage in transit" tone="accent">
                <p className="page__title">{formatMt(inTransitMt)}</p>
                <p className="small muted">
                  Loaded on legs whose state is in transit, from the recorded trips.{" "}
                  {legRows.filter((l) => l.state === "in_transit").length} leg(s).
                </p>
              </SummaryCard>
              <SummaryCard
                title="Legs awaiting a received quantity"
                tone={awaitingReceipt.length > 0 ? "warn" : "ok"}
              >
                <p className="page__title">{formatNumber(awaitingReceipt.length)}</p>
                <p className="small muted">
                  At least one trip is loaded with no received figure, so the variance is not yet complete
                  (§6.10 activity 2).
                </p>
              </SummaryCard>
              <SummaryCard
                title="Transfer price outstanding"
                tone={priceOutstanding.length > 0 ? "warn" : "ok"}
              >
                <p className="page__title">{formatNumber(priceOutstanding.length)}</p>
                <p className="small muted">
                  Legs crossing an entity boundary with no transfer price recorded. To be prepared by Hiba
                  (§6.10 input 3, open).
                </p>
              </SummaryCard>
            </div>

            <DataTable
              caption="Movement legs"
              rows={legRows}
              columns={legColumns}
              loading={legs.loading}
              searchPlaceholder="Search by leg, shipment, route or service request…"
              searchValue={(l) =>
                `${l.legNo} ${shipmentOf(l.shipmentId)?.shipmentNo ?? ""} ${contractRefOf(l.shipmentId)} ${l.fromLocation} ${l.toLocation} ${countryName(l.originCountry)} ${l.destinationCountry} ${l.serviceRequestNo ?? ""}`
              }
              rowHref={(l) => `/movement/leg/${l.id}`}
              emptyTitle="No movement leg recorded"
              emptyBody="Cargo is moved before the start of the stuffing operation (v2.0 §6.10 activity 1)."
              savedViews={[
                { key: "all", label: "All movement legs" },
                {
                  key: "transit",
                  label: "In transit",
                  description: "Loaded and on the way to the port country.",
                  predicate: (l) => l.state === "in_transit",
                },
                {
                  key: "variance",
                  label: "With a loaded-versus-received variance",
                  description:
                    "Quantity loaded and quantity received differ. Where the variance is resolved is decision D-19.",
                  predicate: (l) => movementTotals(l.trips).varianceMt !== 0,
                },
                {
                  key: "noprice",
                  label: "Crossing an entity boundary with no transfer price",
                  description: "Transfer prices are open — to be prepared by Hiba (§6.10 input 3).",
                  predicate: (l) => l.crossesEntityBoundary && !l.transferPriceKnown,
                },
                {
                  key: "bulk",
                  label: "Bulk daily operations",
                  description:
                    "Tracked as a daily operation recording the number of trips and the quantities loaded and received.",
                  predicate: (l) => l.mode === "bulk_daily",
                },
              ]}
            />
          </>
        ) : null}

        {active === "requests" ? (
          <>
            <Banner
              tone="warn"
              title="The stuffing request has no state model (v2.0 §6.10)"
              action={
                <Link className="btn btn--sm" to="/stuffing">
                  Open stuffing &amp; loading
                </Link>
              }
            >
              No state model is given for the stuffing request, so the record carries a raised date and
              nothing else — raised or not raised is presence, not a status.{" "}
              {checkStuffingRequestRaised().advisory} The next phase is stuffing and loading.
            </Banner>

            <DataTable
              caption="Stuffing requests"
              rows={reqRows}
              columns={requestColumns}
              loading={requests.loading}
              searchPlaceholder="Search by request number, shipment or stuffing location…"
              searchValue={(r) =>
                `${r.requestNo} ${shipmentOf(r.shipmentId)?.shipmentNo ?? ""} ${r.stuffingLocation}`
              }
              emptyTitle="No stuffing request recorded"
              emptyBody="The stuffing request is raised to initiate the beginning of the stuffing operation (v2.0 §6.10 activity 3)."
              savedViews={[
                { key: "all", label: "All stuffing requests" },
                {
                  key: "notraised",
                  label: "Not yet raised",
                  description: "Drafted; nobody has been notified.",
                  predicate: (r) => !r.raisedOn,
                },
                {
                  key: "partial",
                  label: "Raised and not fully acknowledged",
                  description:
                    "One or more of Quality, Logistics, Clearance, Warehousing and Processing has not acknowledged.",
                  predicate: (r) => Boolean(r.raisedOn) && !fullyAcknowledged(r),
                },
                {
                  key: "full",
                  label: "Fully acknowledged",
                  predicate: (r) => fullyAcknowledged(r),
                },
              ]}
            />

            <div className="stack">
              {reqRows.map((r) => {
                const s = shipmentOf(r.shipmentId);
                const raised = checkStuffingRequestRaised(r);
                return (
                  <CollapsibleSection
                    key={r.id}
                    title={`${r.requestNo} — ${r.stuffingLocation} — ${ackCount(r)} of ${r.notifications.length} acknowledged`}
                    defaultOpen={false}
                    indicator={
                      <StatusChip
                        tone={raised.raised ? (fullyAcknowledged(r) ? "ok" : "warn") : "idle"}
                        label={raised.raised ? `Raised ${formatDate(r.raisedOn)}` : "Not raised"}
                        size="sm"
                      />
                    }
                    actions={
                      !r.raisedOn ? (
                        <button type="button" className="btn btn--sm btn--primary" onClick={() => raise(r)}>
                          Raise the stuffing request
                        </button>
                      ) : undefined
                    }
                  >
                    {refusals[r.id] ? (
                      <Banner tone="risk" title="The request was refused">
                        {refusals[r.id]}
                      </Banner>
                    ) : null}

                    {!r.raisedOn ? (
                      <Banner tone="info" title="Movement comes before the stuffing operation">
                        §6.10 activity 1 puts the movement first: cargo is moved before the start of the
                        stuffing operation. Raising this request is refused while the movement leg serving the
                        same shipment has not arrived, and the refusal names the leg and its current state.
                      </Banner>
                    ) : null}

                    <FieldGrid
                      fields={[
                        { label: "Request number", value: r.requestNo, behaviour: "readonly" },
                        {
                          label: "Shipment",
                          value: s ? <Link to={`/shipments/${s.id}`}>{s.shipmentNo}</Link> : undefined,
                          behaviour: "inherited",
                        },
                        { label: "Stuffing location", value: r.stuffingLocation },
                        { label: "Quantity", value: formatMt(r.quantityMt) },
                        { label: "Planned start", value: formatDate(r.plannedStartDate) },
                        {
                          label: "Planned containers",
                          value:
                            r.plannedContainerCount === undefined
                              ? undefined
                              : formatNumber(r.plannedContainerCount),
                        },
                        { label: "Raised on", value: formatDate(r.raisedOn) },
                        { label: "Raised by", value: r.raisedBy },
                      ]}
                    />

                    <p className="small muted" style={{ marginTop: "0.75rem" }}>
                      §6.10 activity 4 — the stuffing request is communicated to Quality, Logistics,
                      Clearance, Warehousing and Processing. Acknowledgement is recorded per function; the
                      source states no deadline and no escalation, so none is shown.
                    </p>

                    <ul className="doclist" style={{ marginTop: "0.5rem" }}>
                      {NOTIFY_ORDER.map((fn) => {
                        const n = r.notifications.find((x) => x.fn === fn);
                        return (
                          <li key={fn} className={n?.acknowledgedOn ? "required" : undefined}>
                            <span className="doclist__name">
                              {NOTIFY_LABEL[fn]}
                              <span className="doclist__sub">
                                {n?.acknowledgedOn
                                  ? `Acknowledged ${formatDate(n.acknowledgedOn)} by ${n.acknowledgedBy ?? "an unrecorded user"}`
                                  : r.raisedOn
                                    ? "Notified, not yet acknowledged"
                                    : "Not yet notified — the request has not been raised"}
                              </span>
                            </span>
                            <StatusChip
                              tone={n?.acknowledgedOn ? "ok" : "warn"}
                              label={n?.acknowledgedOn ? "Acknowledged" : "Outstanding"}
                              size="sm"
                            />
                            <span className="small">{formatDate(n?.acknowledgedOn)}</span>
                            {n && !n.acknowledgedOn ? (
                              <button
                                type="button"
                                className="btn btn--sm"
                                onClick={() => acknowledge(r, fn)}
                              >
                                Acknowledge
                              </button>
                            ) : (
                              <span />
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    {r.note ? (
                      <p className="small muted" style={{ marginTop: "0.75rem" }}>
                        {r.note}
                      </p>
                    ) : null}

                    <p className="small" style={{ marginTop: "0.75rem" }}>
                      Next phase: <Link to="/stuffing">stuffing &amp; loading</Link> — the operation this
                      request initiates.
                    </p>
                  </CollapsibleSection>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

/* ================================================================== *
 * Movement leg detail
 * ================================================================== */

export function MovementLegDetail() {
  const { id = "" } = useParams();
  const toast = useToast();
  const { user } = useAuth();

  const leg = useAsync(() => api.getMovementLeg(id), [id]);
  const shipments = useAsync(() => api.listShipments());
  const contracts = useAsync(() => api.listContracts());
  const requests = useAsync(() => api.listStuffingRequests());

  const [receiptDrafts, setReceiptDrafts] = useState<Record<string, string>>({});
  const [receiptErrors, setReceiptErrors] = useState<Record<string, string>>({});
  const [tripNo, setTripNo] = useState("");
  const [tripDate, setTripDate] = useState(TODAY);
  const [plateNo, setPlateNo] = useState("");
  const [waybillNo, setWaybillNo] = useState("");
  const [loadedMt, setLoadedMt] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  if (leg.error) {
    return (
      <div className="page">
        <ErrorState detail={leg.error} onRetry={leg.reload} />
      </div>
    );
  }
  if (leg.loading)
    return (
      <div className="page">
        <div className="card card__body muted">Loading…</div>
      </div>
    );
  const m = leg.data;
  if (!m) {
    return (
      <div className="page">
        <EmptyState
          title="Movement leg not found"
          action={
            <Link className="btn btn--primary" to="/movement">
              Back to movement legs
            </Link>
          }
        />
      </div>
    );
  }

  const shipment = (shipments.data ?? []).find((s) => s.id === m.shipmentId);
  const contract = shipment ? (contracts.data ?? []).find((c) => c.id === shipment.contractId) : undefined;
  const request = (requests.data ?? []).find((r) => r.shipmentId === m.shipmentId);
  const totals = movementTotals(m.trips);
  const allowed = nextStates(MOVEMENT_LEG_TRANSITIONS, m.state);
  const isBulk = m.mode === "bulk_daily";
  const receivedFraction = m.plannedQuantityMt > 0 ? totals.receivedMt / m.plannedQuantityMt : 0;
  const priceOpen = m.crossesEntityBoundary && !m.transferPriceKnown;

  const advance = async (to: MovementLegState) => {
    const res = await api.advanceMovementLeg(m.id, to);
    if (!res.ok) {
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `${m.legNo} moved to ${humanise(to)}.`);
  };

  const recordReceipt = async (trip: string) => {
    const fieldId = `recv-${trip}`;
    const raw = (receiptDrafts[trip] ?? "").trim();
    if (!raw) {
      setReceiptErrors((e) => ({ ...e, [fieldId]: "Enter the quantity received, in MT." }));
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      setReceiptErrors((e) => ({
        ...e,
        [fieldId]: "Enter the quantity received as a number that is not negative.",
      }));
      return;
    }
    setReceiptErrors((e) => ({ ...e, [fieldId]: "" }));
    const res = await api.recordTripReceipt(m.id, trip, value);
    if (!res.ok) {
      setReceiptErrors((e) => ({ ...e, [fieldId]: res.reason }));
      toast.push("risk", res.reason);
      return;
    }
    setReceiptDrafts((d) => ({ ...d, [trip]: "" }));
    toast.push("ok", `Received quantity recorded against ${isBulk ? "day" : "trip"} ${trip}.`);
  };

  const submitTrip = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const next: Record<string, string> = {};
    if (!tripNo.trim()) next["trip-no"] = isBulk ? "Enter the day reference." : "Enter the trip number.";
    if (!tripDate.trim()) next["trip-date"] = "Enter the date.";
    if (!isBulk && !plateNo.trim())
      next["trip-plate"] =
        "Enter the plate number — movement by truck or rail is tracked by vehicle detail (v2.0 §6.10 activity 2).";
    const loaded = Number(loadedMt.trim());
    if (!loadedMt.trim()) next["trip-loaded"] = "Enter the quantity loaded, in MT.";
    else if (!Number.isFinite(loaded) || loaded <= 0)
      next["trip-loaded"] = "Enter the quantity loaded as a number greater than zero.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const res = await api.addMovementTrip(m.id, {
      tripNo: tripNo.trim(),
      date: tripDate,
      plateNo: plateNo.trim() || undefined,
      waybillNo: waybillNo.trim() || undefined,
      loadedMt: loaded,
    });
    if (!res.ok) {
      setServerError(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `${isBulk ? "Day" : "Trip"} ${tripNo.trim()} added to ${m.legNo}.`);
    setTripNo("");
    setPlateNo("");
    setWaybillNo("");
    setLoadedMt("");
  };

  return (
    <>
      <PageHeader
        moduleLabel="Movement & stuffing requests"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Movement & stuffing requests", to: "/movement" },
          { label: m.legNo },
        ]}
        title={`Movement leg ${m.legNo}`}
        statusChip={
          <>
            <StatusChip tone="info" label={humanise(m.mode)} />
            <StatusChip tone={toneFor(m.state)} label={humanise(m.state)} />
          </>
        }
        meta={
          <>
            {shipment ? `Shipment ${shipment.shipmentNo}` : "No shipment linked"}
            {contract ? ` · ${contract.contractNo}` : ""} · {m.fromLocation} → {m.toLocation} ·{" "}
            {countryName(m.originCountry)} → {m.destinationCountry}
          </>
        }
        recordKey={m.legNo}
        recordDate={formatDate(m.startDate ?? m.arrivalDate)}
        actions={
          <ActionBar
            primary={
              allowed.length > 0
                ? allowed.map((to) => ({
                    label: `Mark as ${humanise(to)}`,
                    onClick: () => void advance(to),
                  }))
                : [
                    {
                      label: "Advance the leg",
                      disabled: true,
                      disabledReason: `"${humanise(m.state)}" is a terminal state — no further transition is permitted (v2.0 §6.10 activities 1–2).`,
                    },
                  ]
            }
            more={[
              ...(shipment
                ? [{ label: `Open shipment ${shipment.shipmentNo}`, to: `/shipments/${shipment.id}` }]
                : []),
              { label: "Open stuffing requests", to: "/movement/requests" },
              { label: "Open stuffing & loading", to: "/stuffing" },
            ]}
          />
        }
      />

      <div className="page">
        {priceOpen ? (
          <Banner tone="warn" title="This leg crosses an entity boundary and has no transfer price">
            {TRANSFER_PRICE_OPEN}
          </Banner>
        ) : null}
        {totals.varianceMt !== 0 ? (
          <Banner tone="warn" title="Quantity loaded and quantity received differ (decision D-19)">
            {D19}
          </Banner>
        ) : null}

        <div className="grid-3">
          <SummaryCard title="Leg">
            <FieldGrid
              columns={1}
              fields={[
                { label: "Leg number", value: m.legNo, behaviour: "readonly" },
                { label: "Mode", value: humanise(m.mode) },
                { label: "From", value: m.fromLocation, behaviour: "required" },
                { label: "To", value: m.toLocation, behaviour: "required" },
                { label: "Origin country", value: countryName(m.originCountry) },
                {
                  label: "Destination country",
                  value: m.destinationCountry,
                  hint: "Free text — Djibouti and Douala are not COTS operating units",
                },
                {
                  label: "Service request number",
                  value: m.serviceRequestNo,
                  hint: "Sudan only — the movement is a service request to the Logistics department, carried in SAP today",
                },
                { label: "Planned quantity", value: formatMt(m.plannedQuantityMt) },
                { label: "Start date", value: formatDate(m.startDate) },
                { label: "Arrival date", value: formatDate(m.arrivalDate) },
              ]}
            />
          </SummaryCard>

          <SummaryCard
            title="Quantities"
            tone={totals.varianceMt !== 0 ? "warn" : totals.awaitingReceipt > 0 ? "accent" : "ok"}
          >
            <QuantityDonut
              fraction={receivedFraction}
              valueLabel={formatMt(totals.receivedMt)}
              ofLabel={formatMt(m.plannedQuantityMt)}
              caption="of the planned quantity received"
              tone={receivedFraction >= 1 ? "ok" : "accent"}
            />
            <FieldGrid
              columns={1}
              fields={[
                { label: "Loaded", value: formatMt(totals.loadedMt), behaviour: "calculated" },
                { label: "Received", value: formatMt(totals.receivedMt), behaviour: "calculated" },
                {
                  label: "Variance",
                  value: <strong>{formatMt(totals.varianceMt)}</strong>,
                  behaviour: "calculated",
                  hint: "Loaded on the trips that have a recorded receipt, less the quantity received",
                },
                {
                  label: isBulk ? "Days awaiting a received figure" : "Trips awaiting a received figure",
                  value: formatNumber(totals.awaitingReceipt),
                  behaviour: "calculated",
                },
              ]}
            />
          </SummaryCard>

          <SummaryCard
            title="Transfer pricing"
            tone={priceOpen ? "warn" : m.crossesEntityBoundary ? "ok" : "na"}
          >
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Crosses an entity boundary",
                  value: m.crossesEntityBoundary ? "Yes" : "No",
                  hint: m.crossesEntityBoundary
                    ? "A transfer price between the source, transit and export countries is required (§6.10 input 3)"
                    : "Movement within one entity — no transfer price arises",
                },
                {
                  label: "Transfer price",
                  value: m.crossesEntityBoundary ? (
                    m.transferPriceKnown ? (
                      "Recorded outside this mock-up"
                    ) : (
                      <StatusChip tone="warn" label="Open — not prepared" size="sm" />
                    )
                  ) : (
                    "Not applicable"
                  ),
                },
              ]}
            />
            {priceOpen ? (
              <p className="small" style={{ marginTop: "0.75rem" }}>
                {TRANSFER_PRICE_OPEN}
              </p>
            ) : null}
          </SummaryCard>
        </div>

        <TotalBanner
          label="Loaded-versus-received variance on this leg"
          value={formatMt(totals.varianceMt)}
          derivation={`loaded on the ${formatNumber(totals.trips - totals.awaitingReceipt)} ${isBulk ? "day(s)" : "trip(s)"} with a recorded receipt, less received ${formatMt(totals.receivedMt)}; ${formatNumber(totals.awaitingReceipt)} ${isBulk ? "day(s)" : "trip(s)"} have no received figure and are excluded`}
        />

        <CollapsibleSection
          title={
            isBulk
              ? `Daily operation — ${formatNumber(totals.trips)} day(s) recorded`
              : `Trips — ${formatNumber(totals.trips)} recorded`
          }
          indicator={
            <StatusChip
              tone={totals.awaitingReceipt > 0 ? "warn" : "ok"}
              label={`${formatNumber(totals.awaitingReceipt)} awaiting a receipt`}
              size="sm"
            />
          }
        >
          {isBulk ? (
            <p className="small muted">
              For bulk, §6.10 activity 2 says the movement is tracked as a daily operation recording the
              number of trips and the quantities loaded and received. Each row below is one day, not one
              vehicle, which is why no plate number is captured.
            </p>
          ) : (
            <p className="small muted">
              §6.10 activity 2 — movement by truck or rail is tracked by vehicle detail, so each row is one
              trip with its plate and waybill.
            </p>
          )}

          {m.trips.length === 0 ? (
            <EmptyState title={isBulk ? "No day recorded yet" : "No trip recorded yet"} glyph="○">
              Cargo is moved before the start of the stuffing operation (§6.10 activity 1). Add the first{" "}
              {isBulk ? "day" : "trip"} below.
            </EmptyState>
          ) : (
            <div className="dtable__scroll">
              <table className="dtable__table">
                <caption className="sr-only">
                  {isBulk ? "Daily loading operation" : "Trips on this movement leg"}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{isBulk ? "Day" : "Trip"}</th>
                    <th scope="col">Date</th>
                    <th scope="col">Plate number</th>
                    <th scope="col">Waybill number</th>
                    <th scope="col" className="text-right">
                      Loaded
                    </th>
                    <th scope="col" className="text-right">
                      Received
                    </th>
                    <th scope="col" className="text-right">
                      Variance
                    </th>
                    <th scope="col">Record received</th>
                  </tr>
                </thead>
                <tbody>
                  {m.trips.map((t) => {
                    const one = movementTotals([t]);
                    const fieldId = `recv-${t.tripNo}`;
                    return (
                      <tr key={t.tripNo}>
                        <th scope="row" className="mono small">
                          {t.tripNo}
                        </th>
                        <td>{formatDate(t.date)}</td>
                        <td className="mono small">{t.plateNo ?? <span className="muted">–</span>}</td>
                        <td className="mono small">{t.waybillNo ?? <span className="muted">–</span>}</td>
                        <td className="text-right">{formatMt(t.loadedMt)}</td>
                        <td className="text-right">
                          {t.receivedMt === undefined ? (
                            <StatusChip tone="warn" label="not received" size="sm" />
                          ) : (
                            formatMt(t.receivedMt)
                          )}
                        </td>
                        <td className="text-right">
                          {t.receivedMt === undefined ? (
                            <span className="muted">–</span>
                          ) : one.varianceMt === 0 ? (
                            <span className="muted">{formatMt(0)}</span>
                          ) : (
                            <StatusChip tone="warn" label={formatMt(one.varianceMt)} size="sm" title={D19} />
                          )}
                        </td>
                        <td>
                          {t.receivedMt === undefined ? (
                            <div className="row">
                              <FormRow
                                label={`Received (MT) — ${isBulk ? "day" : "trip"} ${t.tripNo}`}
                                htmlFor={fieldId}
                                error={receiptErrors[fieldId] || undefined}
                              >
                                <TextInput
                                  id={fieldId}
                                  value={receiptDrafts[t.tripNo] ?? ""}
                                  onChange={(v) => setReceiptDrafts((d) => ({ ...d, [t.tripNo]: v }))}
                                  inputMode="decimal"
                                  error={receiptErrors[fieldId] || undefined}
                                />
                              </FormRow>
                              <button
                                type="button"
                                className="btn btn--sm"
                                onClick={() => void recordReceipt(t.tripNo)}
                              >
                                Record received
                              </button>
                            </div>
                          ) : (
                            <span className="muted small">Recorded</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {m.note ? (
            <p className="small muted" style={{ marginTop: "0.75rem" }}>
              {m.note}
            </p>
          ) : null}
        </CollapsibleSection>

        <CollapsibleSection title={isBulk ? "Add a day" : "Add a trip"} defaultOpen={false}>
          <form className="stack" noValidate onSubmit={submitTrip}>
            {serverError ? (
              <Banner tone="risk" title={`The ${isBulk ? "day" : "trip"} could not be added`}>
                {serverError}
              </Banner>
            ) : null}
            <ErrorSummary errors={Object.entries(errors).map(([field, message]) => ({ field, message }))} />

            <div className="fields">
              <FormRow
                label={isBulk ? "Day reference" : "Trip number"}
                htmlFor="trip-no"
                required
                error={errors["trip-no"]}
                hint="Unique on this leg — the store refuses a duplicate."
              >
                <TextInput
                  id="trip-no"
                  value={tripNo}
                  onChange={setTripNo}
                  required
                  error={errors["trip-no"]}
                />
              </FormRow>

              <FormRow label="Date" htmlFor="trip-date" required error={errors["trip-date"]}>
                <TextInput
                  id="trip-date"
                  type="date"
                  value={tripDate}
                  onChange={setTripDate}
                  required
                  error={errors["trip-date"]}
                />
              </FormRow>

              <FormRow
                label="Plate number"
                htmlFor="trip-plate"
                required={!isBulk}
                error={errors["trip-plate"]}
                hint={
                  isBulk
                    ? "Not required: for bulk the movement is tracked as a daily operation — the number of trips and the quantities loaded and received — not by vehicle (v2.0 §6.10 activity 2)."
                    : "Required: movement by truck or rail is tracked by truck details, so the vehicle must be identified (v2.0 §6.10 activity 2)."
                }
              >
                <TextInput
                  id="trip-plate"
                  value={plateNo}
                  onChange={setPlateNo}
                  required={!isBulk}
                  error={errors["trip-plate"]}
                />
              </FormRow>

              <FormRow
                label="Waybill number"
                htmlFor="trip-waybill"
                error={errors["trip-waybill"]}
                hint="The source does not state that a waybill is mandatory, so it is not enforced."
              >
                <TextInput id="trip-waybill" value={waybillNo} onChange={setWaybillNo} />
              </FormRow>

              <FormRow
                label="Quantity loaded (MT)"
                htmlFor="trip-loaded"
                required
                error={errors["trip-loaded"]}
                hint="The quantity received is recorded separately, against the trip, which is where the variance appears."
              >
                <TextInput
                  id="trip-loaded"
                  value={loadedMt}
                  onChange={setLoadedMt}
                  required
                  error={errors["trip-loaded"]}
                  inputMode="decimal"
                />
              </FormRow>
            </div>

            <RequiredLegend />

            <div className="factions">
              <button type="submit" className="btn btn--primary">
                {isBulk ? "Add day" : "Add trip"}
              </button>
            </div>
          </form>
        </CollapsibleSection>

        <CollapsibleSection
          title="Stuffing request"
          indicator={
            request ? (
              <StatusChip
                tone={request.raisedOn ? (fullyAcknowledged(request) ? "ok" : "warn") : "idle"}
                label={
                  request.raisedOn
                    ? `${ackCount(request)} of ${request.notifications.length} acknowledged`
                    : "Not raised"
                }
                size="sm"
              />
            ) : undefined
          }
        >
          {request ? (
            <>
              <FieldGrid
                fields={[
                  { label: "Request number", value: request.requestNo, behaviour: "readonly" },
                  { label: "Stuffing location", value: request.stuffingLocation },
                  { label: "Quantity", value: formatMt(request.quantityMt) },
                  { label: "Planned start", value: formatDate(request.plannedStartDate) },
                  {
                    label: "Planned containers",
                    value:
                      request.plannedContainerCount === undefined
                        ? undefined
                        : formatNumber(request.plannedContainerCount),
                  },
                  { label: "Raised on", value: formatDate(request.raisedOn) },
                  { label: "Raised by", value: request.raisedBy },
                ]}
              />
              <ul className="doclist" style={{ marginTop: "0.75rem" }}>
                {NOTIFY_ORDER.map((fn) => {
                  const n = request.notifications.find((x) => x.fn === fn);
                  return (
                    <li key={fn} className={n?.acknowledgedOn ? "required" : undefined}>
                      <span className="doclist__name">
                        {NOTIFY_LABEL[fn]}
                        <span className="doclist__sub">
                          {n?.acknowledgedOn
                            ? `Acknowledged by ${n.acknowledgedBy ?? "an unrecorded user"}`
                            : "Outstanding"}
                        </span>
                      </span>
                      <StatusChip
                        tone={n?.acknowledgedOn ? "ok" : "warn"}
                        label={n?.acknowledgedOn ? "Acknowledged" : "Outstanding"}
                        size="sm"
                      />
                      <span className="small">{formatDate(n?.acknowledgedOn)}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="small" style={{ marginTop: "0.75rem" }}>
                {checkStuffingRequestRaised(request).advisory}{" "}
                <Link to="/movement/requests">Open the stuffing requests tab</Link> to raise or acknowledge
                it.
              </p>
            </>
          ) : (
            <EmptyState
              title="No stuffing request for this shipment"
              glyph="○"
              action={
                <Link className="btn btn--primary" to="/movement/requests">
                  Open stuffing requests
                </Link>
              }
            >
              The stuffing request is what initiates the beginning of the stuffing operation (v2.0 §6.10
              activity 3), and it is communicated to Quality, Logistics, Clearance, Warehousing and
              Processing. Until one exists for this shipment there is nothing to notify.
            </EmptyState>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="What the source does not settle" defaultOpen={false}>
          <p className="small muted">
            The three open questions v2.0 §6.10 records, quoted as they stand. Nothing on this screen fills
            any of them in.
          </p>
          <ul className="doclist" style={{ marginTop: "0.5rem" }}>
            {OPEN_QUESTIONS.map((q) => (
              <li key={q.question}>
                <span className="doclist__name">
                  {q.question}
                  <span className="doclist__sub">{q.owner}</span>
                </span>
                <StatusChip tone="warn" label="Open" size="sm" />
                <span className="small muted">v2.0 §6.10</span>
              </li>
            ))}
          </ul>
          <p className="xsmall muted" style={{ marginTop: "0.75rem" }}>
            Also unsettled and therefore not modelled: no state model is given for the stuffing request; local
            shunting movement for the SMA is not covered in SAP, though the number of trips matters for the
            monthly transportation cost allocation; and Odoo integration for logistics data is proposed with
            no decision.
          </p>
        </CollapsibleSection>

        <p className="small muted">
          Signed in as {user?.displayName ?? "an unrecorded user"} — actions on this screen are recorded
          against that name.
        </p>
      </div>
    </>
  );
}
