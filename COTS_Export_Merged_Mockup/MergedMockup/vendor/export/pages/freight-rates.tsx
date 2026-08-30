/**
 * Phase 08 — Freight planning and booking: the monthly freight rate table.
 *
 * Source: workflow v2.0 §6.8 activities 1–2. Register G-14 records the gap this
 * screen closes: "Freight rate maintenance, its dimensions and its cadence are
 * absent. The offer is documented; the rate table behind it is not." The freight
 * offer and the booking already have screens (shipments — booking & SI); the rate
 * table they are priced against had none.
 *
 * What the source says, and what this screen therefore shows:
 *  · Trigger [AS-IS] — a shipment needs transport, or the monthly freight rate
 *    maintenance cycle falls due. The second trigger is why this screen leads with
 *    a month, not with a shipment.
 *  · Inputs [AS-IS] — "freight rates maintained monthly for 20-foot and 40-foot
 *    containers, for each loading port, destination port and commodity."
 *  · Activity 1 [AS-IS] — "Freight rate costs are updated monthly for 20-foot and
 *    40-foot containers, by loading port, destination port and commodity."
 *  · Activity 2 [PROPOSED] — "The rate entry form is made practical for all rates
 *    across different loading and destination points and shipping lines. Today the
 *    entry form in Export Direct handles a single option only." That sentence is the
 *    whole reason "Maintain rates for this month" takes many rows at once.
 *  · Outputs [AS-IS] — a maintained monthly rate table.
 *  · Variations [AS-IS] — "Rates are held by container size, loading port,
 *    destination port, commodity and shipping line." Five dimensions, so five
 *    columns identify a lane and nothing else does.
 *  · Systems — [PROPOSED] COTS rate grid; [PROPOSED] integration with the online
 *    platform SeaRates.com; [PROPOSED] integration with Odoo for logistics data.
 *
 * Deliberately absent:
 *  · No approval step on a rate. Who approves a freight offer, a charge and a claim,
 *    and to what authority limit, is decision D-17 and is not decided, so a saved
 *    rate is a maintained figure and never an approved one.
 *  · No SeaRates.com fetch, and no claim that one is agreed. §6.8 records the
 *    integration as an update needed, with no decision. Rows already carrying
 *    `source: "searates"` are labelled as such and nothing more is inferred from it.
 *  · No automated maintenance job. §6.8 asks "whether freight rate maintenance is an
 *    automated job" and records that the workshop lists costing elements, exchange
 *    rates, quality activities and the processing plan as automated jobs, and does
 *    not list freight rates. So the monthly cycle here is a person's action, and the
 *    screen only makes the outstanding lanes visible.
 *  · No rate history beyond the months the table holds, and no forecast. The
 *    month-on-month view compares the selected month with the previous maintained
 *    month and states when a lane was not re-maintained rather than carrying the old
 *    figure forward silently.
 *  · No currency choice. Every maintained rate in this table is in USD, so entry is
 *    in USD; no source states a rate in any other currency.
 */

import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { COMMODITIES, COUNTERPARTIES, PORTS, commodityById, portName } from "../data/master";
import { TODAY, formatDate, formatMoney, formatNumber, money, round } from "../domain/calc";
import { humanise, toneFor } from "../domain/status";
import { OPEN_DECISIONS } from "../domain/workflow";
import type { FreightRate, Money, StatusTone } from "../domain/types";
import { api } from "../services/store";
import { Banner, EmptyState, ErrorState, StatusChip, useToast } from "../components/feedback";
import { CollapsibleSection, FieldGrid, PageHeader, SummaryCard, TotalBanner } from "../components/layout";
import { ErrorSummary, FormRow, RequiredLegend, SelectInput, TextInput } from "../components/form";
import { DataTable, type Column, type SavedView } from "../components/table";
import { useAsync } from "./hooks";

/* ------------------------------------------------------------------ *
 * Lane identity — the five dimensions of §6.8, and nothing else
 * ------------------------------------------------------------------ */

const laneKey = (r: {
  loadingPortId: string;
  destinationPortId: string;
  commodityId: string;
  shippingLine: string;
}) => [r.loadingPortId, r.destinationPortId, r.commodityId, r.shippingLine].join("|");

const commodityName = (id: string) => commodityById(id)?.name ?? id;

const laneLabel = (r: {
  loadingPortId: string;
  destinationPortId: string;
  commodityId: string;
  shippingLine: string;
}) =>
  `${portName(r.loadingPortId)} → ${portName(r.destinationPortId)} · ${commodityName(r.commodityId)} · ${r.shippingLine}`;

/** "2026-08" → "August 2026". The stored value stays the key; this is display only. */
function monthLabel(m: string): string {
  const parsed = Date.parse(`${m}-01T00:00:00Z`);
  if (!Number.isFinite(parsed)) return m;
  return new Date(parsed).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/**
 * Month-on-month movement. The direction is carried in the label text as well as in
 * the chip tone, so colour is never the only signal (CTRM anti-pattern A3).
 */
function rateChange(
  prev: Money | undefined,
  cur: Money | undefined,
): { dir: "up" | "down" | "same" | "unknown"; label: string; tone: StatusTone } {
  if (!prev || !cur) {
    return {
      dir: "unknown",
      label: "no comparison — one of the two months has no rate on this lane",
      tone: "na",
    };
  }
  if (prev.currency !== cur.currency) {
    return {
      dir: "unknown",
      label: `no comparison — ${prev.currency} against ${cur.currency}`,
      tone: "na",
    };
  }
  const delta = round(cur.amount - prev.amount, 2);
  if (delta === 0) return { dir: "same", label: "no change", tone: "idle" };
  const abs = formatMoney(money(Math.abs(delta), cur.currency));
  return delta > 0
    ? { dir: "up", label: `up ${abs}`, tone: "warn" }
    : { dir: "down", label: `down ${abs}`, tone: "ok" };
}

/* ------------------------------------------------------------------ *
 * Staged entry rows — §6.8 activity 2 [PROPOSED]
 * ------------------------------------------------------------------ */

interface DraftRow {
  /** Stable across re-renders; the control ids use the row index, as the errors do. */
  key: string;
  pol: string;
  pod: string;
  commodity: string;
  line: string;
  rate20: string;
  rate40: string;
}

let draftSeq = 0;
const emptyRow = (prefill: Partial<DraftRow> = {}): DraftRow => ({
  key: `d${++draftSeq}`,
  pol: "",
  pod: "",
  commodity: "",
  line: "",
  rate20: "",
  rate40: "",
  ...prefill,
});

const LOAD_PORTS = PORTS.filter((p) => p.type === "load" || p.type === "both");
const DISCHARGE_PORTS = PORTS.filter((p) => p.type === "discharge" || p.type === "both");
const ACTIVE_COMMODITIES = COMMODITIES.filter((c) => c.active);
const MASTER_LINES = COUNTERPARTIES.filter((c) => c.type === "shipping_line" && c.active).map((c) => c.name);

/** §6.8 open question, quoted rather than paraphrased. */
const AUTOMATED_JOB_QUESTION =
  "Whether freight rate maintenance is an automated job. The workshop lists costing elements, exchange rates, quality activities and the processing plan as automated jobs, and does not list freight rates.";

const SEARATES_QUESTION =
  "Whether the SeaRates.com integration is approved or only proposed. The workshop records it as an update needed, with no decision.";

const LEGACY_FORM =
  "Today the entry form in Export Direct handles a single option only (v2.0 §6.8 activity 2). This form takes many rows at once because one option per save cannot maintain a five-dimension table monthly.";

/* ================================================================== *
 * Freight rate table
 * ================================================================== */

export function FreightRatesPage() {
  const rates = useAsync(() => api.listFreightRates());
  const shipments = useAsync(() => api.listShipments());
  const contracts = useAsync(() => api.listContracts());
  const toast = useToast();
  const { user } = useAuth();

  const [month, setMonth] = useState("");
  const [drafts, setDrafts] = useState<DraftRow[]>([emptyRow()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [copySource, setCopySource] = useState("");
  const [saving, setSaving] = useState(false);

  if (rates.error) {
    return (
      <div className="page">
        <ErrorState detail={rates.error} onRetry={rates.reload} />
      </div>
    );
  }

  const all = rates.data ?? [];
  const months = [...new Set(all.map((r) => r.effectiveMonth))].sort();
  const latest = months[months.length - 1] ?? "";
  const selectedMonth = month && months.includes(month) ? month : latest;
  const previousMonth = [...months].reverse().find((m) => m < selectedMonth);

  const current = all.filter((r) => r.effectiveMonth === selectedMonth);
  const previous = previousMonth ? all.filter((r) => r.effectiveMonth === previousMonth) : [];

  const currentKeys = new Set(current.map(laneKey));
  const carriedOver = previous.filter((r) => !currentKeys.has(laneKey(r)));
  const fromSeaRates = current.filter((r) => r.source === "searates");
  const missing40 = current.filter((r) => !r.rate40ft);

  /* ---------------- the month's rate table ---------------- */

  const distinctPols = [...new Set(current.map((r) => r.loadingPortId))];
  const distinctCommodities = [...new Set(current.map((r) => r.commodityId))];

  const columns: Column<FreightRate>[] = [
    {
      key: "pol",
      header: "Loading port",
      cell: (r) => portName(r.loadingPortId),
      sortValue: (r) => portName(r.loadingPortId),
      filterOptions: distinctPols.map((id) => ({ value: id, label: portName(id) })),
      filterMatch: (r, v) => r.loadingPortId === v,
    },
    {
      key: "pod",
      header: "Destination port",
      cell: (r) => portName(r.destinationPortId),
      sortValue: (r) => portName(r.destinationPortId),
    },
    {
      key: "commodity",
      header: "Commodity",
      cell: (r) => commodityName(r.commodityId),
      sortValue: (r) => commodityName(r.commodityId),
      filterOptions: distinctCommodities.map((id) => ({ value: id, label: commodityName(id) })),
      filterMatch: (r, v) => r.commodityId === v,
    },
    {
      key: "line",
      header: "Shipping line",
      cell: (r) => r.shippingLine,
      sortValue: (r) => r.shippingLine,
    },
    {
      key: "rate20",
      header: "20-foot rate",
      align: "right",
      cell: (r) =>
        r.rate20ft ? (
          formatMoney(r.rate20ft)
        ) : (
          <StatusChip tone="warn" label="not maintained on this lane" size="sm" />
        ),
      sortValue: (r) => r.rate20ft?.amount ?? 0,
    },
    {
      key: "rate40",
      header: "40-foot rate",
      align: "right",
      cell: (r) =>
        r.rate40ft ? (
          formatMoney(r.rate40ft)
        ) : (
          <StatusChip tone="warn" label="not maintained on this lane" size="sm" />
        ),
      sortValue: (r) => r.rate40ft?.amount ?? 0,
    },
    {
      key: "source",
      header: "Source",
      cell: (r) => (
        <StatusChip
          tone={toneFor(r.source)}
          label={humanise(r.source)}
          size="sm"
          title={
            r.source === "searates"
              ? `Held as coming from SeaRates.com. ${SEARATES_QUESTION}`
              : "Entered by a person in the rate entry form."
          }
        />
      ),
      sortValue: (r) => r.source,
    },
    {
      key: "updatedOn",
      header: "Updated on",
      cell: (r) => formatDate(r.updatedOn),
      sortValue: (r) => r.updatedOn,
    },
    {
      key: "updatedBy",
      header: "Updated by",
      cell: (r) => r.updatedBy,
      sortValue: (r) => r.updatedBy,
      optional: true,
    },
  ];

  const savedViews: SavedView<FreightRate>[] = [
    { key: "all", label: "All lanes this month" },
    {
      key: "no40",
      label: "Missing a 40-foot rate",
      description:
        "§6.8 maintains 20-foot and 40-foot rates on every lane. These lanes carry one container size only.",
      predicate: (r) => !r.rate40ft,
    },
    {
      key: "searates",
      label: "From SeaRates",
      description: SEARATES_QUESTION,
      predicate: (r) => r.source === "searates",
    },
    {
      key: "manual",
      label: "Maintained manually",
      predicate: (r) => r.source === "manual",
    },
  ];

  /* ---------------- staged entry ---------------- */

  const setRow = (index: number, patch: Partial<DraftRow>) =>
    setDrafts((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const addRow = (prefill?: Partial<DraftRow>) => {
    setErrors({});
    setDrafts((rows) => [...rows, emptyRow(prefill)]);
  };

  const removeRow = (index: number) => {
    setErrors({});
    setDrafts((rows) => (rows.length === 1 ? [emptyRow()] : rows.filter((_, i) => i !== index)));
  };

  const copyFromPreviousMonth = (key: string) => {
    setCopySource("");
    const source = previous.find((r) => r.id === key);
    if (!source) return;
    addRow({
      pol: source.loadingPortId,
      pod: source.destinationPortId,
      commodity: source.commodityId,
      line: source.shippingLine,
      rate20: source.rate20ft ? String(source.rate20ft.amount) : "",
      rate40: source.rate40ft ? String(source.rate40ft.amount) : "",
    });
  };

  const parseRate = (raw: string): { value?: number; error?: string } => {
    const t = raw.trim();
    if (!t) return {};
    const n = Number(t);
    if (!Number.isFinite(n) || n <= 0) return { error: "Enter the rate as a number greater than zero." };
    return { value: n };
  };

  const submitRates = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const next: Record<string, string> = {};
    const seen = new Map<string, number>();

    drafts.forEach((row, i) => {
      if (!row.pol) next[`fr-${i}-pol`] = `Row ${i + 1}: select the loading port.`;
      if (!row.pod) next[`fr-${i}-pod`] = `Row ${i + 1}: select the destination port.`;
      if (!row.commodity) next[`fr-${i}-commodity`] = `Row ${i + 1}: select the commodity.`;
      if (!row.line) next[`fr-${i}-line`] = `Row ${i + 1}: select the shipping line.`;

      const r20 = parseRate(row.rate20);
      const r40 = parseRate(row.rate40);
      if (r20.error) next[`fr-${i}-rate20`] = `Row ${i + 1}: ${r20.error}`;
      if (r40.error) next[`fr-${i}-rate40`] = `Row ${i + 1}: ${r40.error}`;
      if (!r20.error && !r40.error && r20.value === undefined && r40.value === undefined) {
        next[`fr-${i}-rate20`] =
          `Row ${i + 1}: enter a 20-foot rate, a 40-foot rate, or both. §6.8 maintains rates by container size, so a lane with neither carries nothing.`;
      }

      if (row.pol && row.pod && row.commodity && row.line) {
        const key = laneKey({
          loadingPortId: row.pol,
          destinationPortId: row.pod,
          commodityId: row.commodity,
          shippingLine: row.line,
        });
        const first = seen.get(key);
        if (first !== undefined) {
          next[`fr-${i}-pol`] =
            `Row ${i + 1}: the same lane is already staged in row ${first + 1}. The five dimensions identify one rate, so two rows for one lane would overwrite each other.`;
        } else {
          seen.set(key, i);
        }
      }
    });

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const rows: FreightRate[] = drafts.map((row) => {
      const r20 = parseRate(row.rate20).value;
      const r40 = parseRate(row.rate40).value;
      return {
        id: "",
        effectiveMonth: selectedMonth,
        loadingPortId: row.pol,
        destinationPortId: row.pod,
        commodityId: row.commodity,
        shippingLine: row.line,
        rate20ft: r20 === undefined ? undefined : money(r20, "USD"),
        rate40ft: r40 === undefined ? undefined : money(r40, "USD"),
        updatedOn: TODAY,
        updatedBy: user?.displayName ?? "Logistics",
        source: "manual",
      };
    });

    setSaving(true);
    const res = await api.upsertFreightRates(rows);
    setSaving(false);
    if (!res.ok) {
      setServerError(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    toast.push(
      "ok",
      `${res.value.length} rate row(s) saved for ${monthLabel(selectedMonth)}. The cadence is monthly (v2.0 §6.8 activity 1).`,
    );
    setDrafts([emptyRow()]);
  };

  /* ---------------- where the rates are used ---------------- */

  const cts = contracts.data ?? [];
  const usage = (shipments.data ?? []).flatMap((s) => {
    const contract = cts.find((c) => c.id === s.contractId);
    if (!contract) return [];
    return s.freightOffers.flatMap((o) => {
      const key = laneKey({
        loadingPortId: s.portOfLoadingId,
        destinationPortId: o.destinationPortId,
        commodityId: contract.commodityId,
        shippingLine: o.shippingLine,
      });
      const rate = current.find((r) => laneKey(r) === key);
      if (!rate) return [];
      return [{ shipment: s, offer: o, rate, contractNo: contract.contractNo }];
    });
  });

  return (
    <>
      <PageHeader
        moduleLabel="Support"
        crumbs={[{ label: "Home", to: "/" }, { label: "Freight rate table" }]}
        title="Freight rate table"
        meta="Rates are held by container size, loading port, destination port, commodity and shipping line — five dimensions, maintained monthly (v2.0 §6.8)"
        recordKey={`${current.length}`}
        recordDate={`lanes in ${monthLabel(selectedMonth)}`}
      />

      <div className="page">
        <Banner tone="info" title="Scope and cadence (v2.0 §6.8 activities 1–2)">
          Freight rate costs are updated monthly for 20-foot and 40-foot containers, by loading port,
          destination port and commodity; the shipping line is the fifth dimension the country and shipment
          variations add. The rate grid, the SeaRates.com integration and the Odoo integration for logistics
          data are all recorded as <em>[PROPOSED]</em>. Register G-14: the offer is documented, the rate table
          behind it is not — which is what this screen is.
        </Banner>

        <Banner tone="warn" title="Open decision D-17">
          {OPEN_DECISIONS["D-17"].title} Owner: {OPEN_DECISIONS["D-17"].owner}. Nothing on this screen
          approves a rate; a saved row is a maintained figure only.
        </Banner>

        <Banner tone="warn" title="Open question — is this an automated job?">
          {AUTOMATED_JOB_QUESTION} So the monthly cycle here is a person's action, and the only thing this
          screen automates is showing which lanes are outstanding.
        </Banner>

        <div className="card card__body">
          <div className="fields">
            <FormRow
              label="Rate month"
              htmlFor="fr-month"
              hint={`${formatNumber(current.length)} lane(s) maintained in ${monthLabel(selectedMonth)}. The cadence is monthly — one rate table per month, per §6.8 activity 1.`}
            >
              <SelectInput
                id="fr-month"
                value={selectedMonth}
                onChange={setMonth}
                placeholder="Select a month…"
                options={[...months].reverse().map((m) => ({ value: m, label: monthLabel(m) }))}
              />
            </FormRow>
          </div>
          {months.length === 0 ? (
            <p className="small muted">No rate month is held yet.</p>
          ) : (
            <p className="small muted">
              Previous maintained month:{" "}
              {previousMonth ? monthLabel(previousMonth) : "none held before this one"}. Months are compared
              against the previous month the table actually holds, not the previous calendar month.
            </p>
          )}
        </div>

        <div className="grid-3">
          <SummaryCard
            title="Lanes maintained this month"
            tone={current.length > 0 ? "ok" : "warn"}
            footer={
              <span className="xsmall muted">
                Monthly cadence — v2.0 §6.8 activity 1, [AS-IS]. Output: a maintained monthly rate table.
              </span>
            }
          >
            <FieldGrid
              columns={1}
              fields={[
                { label: "Month", value: monthLabel(selectedMonth), behaviour: "readonly" },
                {
                  label: "Lanes maintained",
                  value: <strong>{formatNumber(current.length)}</strong>,
                  behaviour: "calculated",
                },
                {
                  label: "Without a 40-foot rate",
                  value: formatNumber(missing40.length),
                  behaviour: "calculated",
                  hint: "§6.8 maintains both container sizes; these lanes carry one",
                },
              ]}
            />
          </SummaryCard>

          <SummaryCard
            title="Carried over, not re-maintained"
            tone={carriedOver.length > 0 ? "warn" : "ok"}
            footer={
              <span className="xsmall muted">
                Lanes present in {previousMonth ? monthLabel(previousMonth) : "the previous month"} and absent
                from {monthLabel(selectedMonth)}. This is the maintenance cycle made visible.
              </span>
            }
          >
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Lanes not re-maintained",
                  value: <strong>{formatNumber(carriedOver.length)}</strong>,
                  behaviour: "calculated",
                },
                {
                  label: "Compared against",
                  value: previousMonth ? monthLabel(previousMonth) : undefined,
                  hint: "The previous month the table holds, not the previous calendar month",
                },
              ]}
            />
            {carriedOver.length === 0 ? (
              <p className="small muted">
                {previousMonth
                  ? "Every lane held last month has been re-maintained this month."
                  : "No earlier month is held, so nothing can be carried over."}
              </p>
            ) : (
              <ul className="small">
                {carriedOver.map((r) => (
                  <li key={r.id}>{laneLabel(r)}</li>
                ))}
              </ul>
            )}
          </SummaryCard>

          <SummaryCard
            title="Rates sourced from SeaRates"
            tone={fromSeaRates.length > 0 ? "accent" : "na"}
            footer={<span className="xsmall muted">{SEARATES_QUESTION}</span>}
          >
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Rows held from SeaRates",
                  value: <strong>{formatNumber(fromSeaRates.length)}</strong>,
                  behaviour: "calculated",
                },
                {
                  label: "Integration status",
                  value: <StatusChip tone="warn" label="Proposed, no decision" size="sm" />,
                },
              ]}
            />
            <p className="small muted" style={{ marginTop: "0.5rem" }}>
              The integration with the online platform SeaRates.com is <em>[PROPOSED]</em> with no decision.
              These rows are labelled as held from that source; no fetch happens here and none is implied.
            </p>
          </SummaryCard>
        </div>

        <TotalBanner
          label={`Lanes maintained in ${monthLabel(selectedMonth)}`}
          value={formatNumber(current.length)}
          derivation={`${formatNumber(carriedOver.length)} lane(s) carried over from ${previousMonth ? monthLabel(previousMonth) : "an earlier month"} and not re-maintained · ${formatNumber(missing40.length)} without a 40-foot rate · ${formatNumber(fromSeaRates.length)} held from SeaRates`}
        />

        <DataTable
          caption={`Freight rates for ${monthLabel(selectedMonth)}`}
          rows={current}
          columns={columns}
          loading={rates.loading}
          searchPlaceholder="Search by port, commodity or shipping line…"
          searchValue={(r) => `${laneLabel(r)} ${r.effectiveMonth} ${r.updatedBy}`}
          savedViews={savedViews}
          emptyTitle={`No rate maintained for ${monthLabel(selectedMonth)}`}
          emptyBody="The monthly maintenance cycle has not been run for this month. Stage the lanes below."
        />

        <CollapsibleSection
          title="Month-on-month movement"
          indicator={
            <StatusChip
              tone={carriedOver.length > 0 ? "warn" : "ok"}
              label={`${formatNumber(carriedOver.length)} not re-maintained`}
              size="sm"
            />
          }
        >
          {!previousMonth ? (
            <EmptyState title="No earlier month to compare against" glyph="–">
              The table holds one month only, so there is no movement to show. §6.8 states the cadence as
              monthly; it does not state how much history is kept.
            </EmptyState>
          ) : (
            <>
              <p className="small muted">
                Every lane held in {monthLabel(previousMonth)}, against {monthLabel(selectedMonth)}. The
                direction is written out as well as coloured. A lane with no row this month has not been
                re-maintained; the previous figure is shown for reference and is not treated as current.
              </p>
              <div className="dtable__scroll">
                <table className="dtable__table">
                  <caption className="sr-only">
                    Month-on-month freight rate movement, {monthLabel(previousMonth)} to{" "}
                    {monthLabel(selectedMonth)}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Lane</th>
                      <th scope="col" className="text-right">
                        20 ft, {monthLabel(previousMonth)}
                      </th>
                      <th scope="col" className="text-right">
                        20 ft, {monthLabel(selectedMonth)}
                      </th>
                      <th scope="col">20 ft change</th>
                      <th scope="col" className="text-right">
                        40 ft, {monthLabel(previousMonth)}
                      </th>
                      <th scope="col" className="text-right">
                        40 ft, {monthLabel(selectedMonth)}
                      </th>
                      <th scope="col">40 ft change</th>
                      <th scope="col">This month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previous.map((p) => {
                      const cur = current.find((c) => laneKey(c) === laneKey(p));
                      const c20 = rateChange(p.rate20ft, cur?.rate20ft);
                      const c40 = rateChange(p.rate40ft, cur?.rate40ft);
                      return (
                        <tr key={p.id}>
                          <th scope="row" className="small">
                            {laneLabel(p)}
                          </th>
                          <td className="text-right">{formatMoney(p.rate20ft)}</td>
                          <td className="text-right">{formatMoney(cur?.rate20ft)}</td>
                          <td>
                            {c20.dir === "same" || c20.dir === "unknown" ? (
                              <span className="muted small">{c20.label}</span>
                            ) : (
                              <StatusChip tone={c20.tone} label={c20.label} size="sm" />
                            )}
                          </td>
                          <td className="text-right">{formatMoney(p.rate40ft)}</td>
                          <td className="text-right">{formatMoney(cur?.rate40ft)}</td>
                          <td>
                            {c40.dir === "same" || c40.dir === "unknown" ? (
                              <span className="muted small">{c40.label}</span>
                            ) : (
                              <StatusChip tone={c40.tone} label={c40.label} size="sm" />
                            )}
                          </td>
                          <td>
                            {cur ? (
                              <StatusChip
                                tone="ok"
                                label={`re-maintained ${formatDate(cur.updatedOn)}`}
                                size="sm"
                              />
                            ) : (
                              <StatusChip
                                tone="warn"
                                label="carried over, not re-maintained"
                                size="sm"
                                title={`This lane was last maintained on ${formatDate(p.updatedOn)} by ${p.updatedBy}, for ${monthLabel(previousMonth)}.`}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Maintain rates for this month"
          indicator={
            <StatusChip tone="info" label={`${formatNumber(drafts.length)} row(s) staged`} size="sm" />
          }
        >
          <Banner tone="info" title="Why this form takes many rows (v2.0 §6.8 activity 2, [PROPOSED])">
            {LEGACY_FORM} The proposed change is worded as making the rate entry form practical for all rates
            across different loading and destination points and shipping lines.
          </Banner>

          <form className="stack" noValidate onSubmit={submitRates}>
            {serverError ? (
              <Banner tone="risk" title="The rates could not be saved">
                {serverError}
              </Banner>
            ) : null}
            <ErrorSummary
              errors={Object.entries(errors)
                .filter(([, message]) => Boolean(message))
                .map(([field, message]) => ({ field, message }))}
              title="These rate rows could not be saved"
            />

            <div className="fields">
              <FormRow
                label="Copy a lane from the previous month"
                htmlFor="fr-copy"
                hint={
                  previousMonth
                    ? `Adds a staged row prefilled from ${monthLabel(previousMonth)}, so the monthly cycle is one action rather than nine.`
                    : "No earlier month is held, so there is nothing to copy from."
                }
              >
                <SelectInput
                  id="fr-copy"
                  value={copySource}
                  onChange={copyFromPreviousMonth}
                  disabled={previous.length === 0}
                  placeholder={previous.length === 0 ? "Nothing to copy" : "Select a lane…"}
                  options={previous.map((r) => ({ value: r.id, label: laneLabel(r) }))}
                />
              </FormRow>
            </div>

            <p className="small muted">
              Every staged row is saved against {monthLabel(selectedMonth)} as a manual entry, in USD — the
              currency every rate this table holds is stated in. Saving a lane that already exists for this
              month replaces its figures.
            </p>

            {drafts.map((row, i) => (
              <div className="card card__body" key={row.key}>
                <h4 className="card__title">
                  Row {i + 1}
                  {row.pol && row.pod ? (
                    <span className="muted small">
                      {" "}
                      — {portName(row.pol)} → {portName(row.pod)}
                    </span>
                  ) : null}
                </h4>
                <div className="fields">
                  <FormRow
                    label="Loading port"
                    htmlFor={`fr-${i}-pol`}
                    required
                    error={errors[`fr-${i}-pol`]}
                  >
                    <SelectInput
                      id={`fr-${i}-pol`}
                      value={row.pol}
                      onChange={(v) => setRow(i, { pol: v })}
                      required
                      error={errors[`fr-${i}-pol`]}
                      options={LOAD_PORTS.map((p) => ({ value: p.id, label: p.name }))}
                    />
                  </FormRow>

                  <FormRow
                    label="Destination port"
                    htmlFor={`fr-${i}-pod`}
                    required
                    error={errors[`fr-${i}-pod`]}
                  >
                    <SelectInput
                      id={`fr-${i}-pod`}
                      value={row.pod}
                      onChange={(v) => setRow(i, { pod: v })}
                      required
                      error={errors[`fr-${i}-pod`]}
                      options={DISCHARGE_PORTS.map((p) => ({ value: p.id, label: p.name }))}
                    />
                  </FormRow>

                  <FormRow
                    label="Commodity"
                    htmlFor={`fr-${i}-commodity`}
                    required
                    error={errors[`fr-${i}-commodity`]}
                  >
                    <SelectInput
                      id={`fr-${i}-commodity`}
                      value={row.commodity}
                      onChange={(v) => setRow(i, { commodity: v })}
                      required
                      error={errors[`fr-${i}-commodity`]}
                      options={ACTIVE_COMMODITIES.map((c) => ({ value: c.id, label: c.name }))}
                    />
                  </FormRow>

                  <FormRow
                    label="Shipping line"
                    htmlFor={`fr-${i}-line`}
                    required
                    error={errors[`fr-${i}-line`]}
                    hint="The fifth dimension — §6.8 holds rates by line as well as by size, ports and commodity."
                  >
                    <SelectInput
                      id={`fr-${i}-line`}
                      value={row.line}
                      onChange={(v) => setRow(i, { line: v })}
                      required
                      error={errors[`fr-${i}-line`]}
                      options={[...new Set([...MASTER_LINES, ...all.map((r) => r.shippingLine)])].map(
                        (n) => ({ value: n, label: n }),
                      )}
                    />
                  </FormRow>

                  <FormRow
                    label="20-foot rate (USD)"
                    htmlFor={`fr-${i}-rate20`}
                    error={errors[`fr-${i}-rate20`]}
                    hint="Leave empty if this lane is not quoted for a 20-foot container."
                  >
                    <TextInput
                      id={`fr-${i}-rate20`}
                      value={row.rate20}
                      onChange={(v) => setRow(i, { rate20: v })}
                      inputMode="decimal"
                      error={errors[`fr-${i}-rate20`]}
                    />
                  </FormRow>

                  <FormRow
                    label="40-foot rate (USD)"
                    htmlFor={`fr-${i}-rate40`}
                    error={errors[`fr-${i}-rate40`]}
                    hint="Leave empty if this lane is not quoted for a 40-foot container."
                  >
                    <TextInput
                      id={`fr-${i}-rate40`}
                      value={row.rate40}
                      onChange={(v) => setRow(i, { rate40: v })}
                      inputMode="decimal"
                      error={errors[`fr-${i}-rate40`]}
                    />
                  </FormRow>
                </div>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => removeRow(i)}
                    disabled={drafts.length === 1 && !row.pol && !row.pod && !row.commodity && !row.line}
                    title={
                      drafts.length === 1 ? "Clears the only staged row rather than removing it." : undefined
                    }
                  >
                    Remove row {i + 1}
                  </button>
                </div>
              </div>
            ))}

            <RequiredLegend />

            <div className="row">
              <button type="button" className="btn" onClick={() => addRow()}>
                + Add row
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? "Saving…" : `Save all rates for ${monthLabel(selectedMonth)}`}
              </button>
            </div>
          </form>
        </CollapsibleSection>

        <CollapsibleSection title="Where these rates are used" defaultOpen={false}>
          <p className="small muted">
            Freight offers on live shipments whose lane — loading port, destination port, commodity and
            shipping line — matches a rate maintained for {monthLabel(selectedMonth)}. The offer is the
            documented record (§6.8 outputs); the maintained rate is what it is being read against. No rule
            states that an offer must equal the maintained rate, so no variance here is a breach of anything.
          </p>
          {usage.length === 0 ? (
            <EmptyState title="No freight offer names a lane maintained this month" glyph="–">
              Offers are held per shipment by line and destination port; the rate table is held by the five
              dimensions of §6.8. On the current data nothing matches on all four identifying values for{" "}
              {monthLabel(selectedMonth)}, so there is nothing to compare. This is stated rather than shown as
              an empty table.
            </EmptyState>
          ) : (
            <div className="dtable__scroll">
              <table className="dtable__table">
                <caption className="sr-only">Freight offers matched to a maintained rate</caption>
                <thead>
                  <tr>
                    <th scope="col">Shipment</th>
                    <th scope="col">Lane</th>
                    <th scope="col">Offer</th>
                    <th scope="col" className="text-right">
                      Offer 20 ft
                    </th>
                    <th scope="col" className="text-right">
                      Maintained 20 ft
                    </th>
                    <th scope="col">20 ft difference</th>
                    <th scope="col" className="text-right">
                      Offer 40 ft
                    </th>
                    <th scope="col" className="text-right">
                      Maintained 40 ft
                    </th>
                    <th scope="col">40 ft difference</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map(({ shipment, offer, rate, contractNo }) => {
                    const d20 = rateChange(rate.rate20ft, offer.rate20ft);
                    const d40 = rateChange(rate.rate40ft, offer.rate40ft);
                    return (
                      <tr key={`${shipment.id}-${offer.id}`}>
                        <th scope="row" className="small">
                          <Link to={`/shipments/${shipment.id}/booking`}>{shipment.shipmentNo}</Link>
                          <span className="muted xsmall"> · {contractNo}</span>
                        </th>
                        <td className="small">{laneLabel(rate)}</td>
                        <td className="small">
                          {offer.offerNo}
                          {offer.selected ? (
                            <>
                              {" "}
                              <StatusChip tone="ok" label="selected offer" size="sm" />
                            </>
                          ) : (
                            <>
                              {" "}
                              <StatusChip tone="idle" label="not selected" size="sm" />
                            </>
                          )}
                        </td>
                        <td className="text-right">{formatMoney(offer.rate20ft)}</td>
                        <td className="text-right">{formatMoney(rate.rate20ft)}</td>
                        <td>
                          {d20.dir === "same" || d20.dir === "unknown" ? (
                            <span className="muted small">{d20.label}</span>
                          ) : (
                            <StatusChip
                              tone={d20.tone}
                              label={`offer ${d20.label} on the maintained rate`}
                              size="sm"
                            />
                          )}
                        </td>
                        <td className="text-right">{formatMoney(offer.rate40ft)}</td>
                        <td className="text-right">{formatMoney(rate.rate40ft)}</td>
                        <td>
                          {d40.dir === "same" || d40.dir === "unknown" ? (
                            <span className="muted small">{d40.label}</span>
                          ) : (
                            <StatusChip
                              tone={d40.tone}
                              label={`offer ${d40.label} on the maintained rate`}
                              size="sm"
                            />
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
