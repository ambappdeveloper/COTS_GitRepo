/**
 * Phase 07 — Country-specific execution prerequisites: the advance payment chain.
 *
 * Source: workflow v2.0 §6.7 activity 5 and activity 8, the §8 country matrix row
 * "Advance payment before execution", and decision D-15. Register G-13 records the
 * gap these two screens close: the advance payment chain is a precondition of
 * execution in Ethiopia and is absent from the documented workflow.
 *
 * What the source says, and what these screens therefore show:
 *  · Activity 5 [AS-IS], in substance verbatim — "Advance payments are issued between
 *    parties before execution of the contract starts. In Ethiopia, Invictus issues to
 *    AMROS, AMROS transfers to African Lakes, and execution can then start. FP&A
 *    determines the amount; payments are issued and need to be confirmed. Advance
 *    payments are not applicable in Chad."
 *  · Activity 8 [PROPOSED] — "A flow is created for the issuance of contracts between
 *    Invictus and the origin entity, the amount is then determined by FP&A, and the
 *    payments are issued and confirmed in the system." The request record, its state
 *    model and the per-leg issue and confirm are that flow and nothing more.
 *  · Outputs [AS-IS] — a confirmed advance payment.
 *  · Preconditions [AS-IS] — "Execution cannot start in Ethiopia until the advance
 *    payment chain has been completed and confirmed", stated as sequence in the
 *    workshop notes; whether COTS should block on it is [OPEN].
 *  · Country matrix §8 — Sudan not stated, Ethiopia yes (Invictus → AMROS → African
 *    Lakes), Chad not applicable, Tanzania not stated, Mozambique not stated.
 *    Evidence: "W only. Three cells unstated." Class: [AS-IS] / [OPEN].
 *  · Exceptions [AS-IS] — Chad has no advance payment step; Chad funds are transferred
 *    from Invictus in USD and received locally in local currency, with exchange
 *    differences. The second is sourcing rather than export execution and is recorded
 *    here only because it is the stated reason Chad differs.
 *  · Participants — FP&A determines the amount; the origin and transit entities are
 *    Invictus, AMROS, African Lakes, Renatus and Merek.
 *
 * Deliberately absent:
 *  · No block on execution. The sequence is recorded; a system block is not. Whether
 *    COTS should refuse to start execution without a confirmed chain is [OPEN], so
 *    nothing downstream in this mock-up is blocked and the readiness section says so
 *    in plain words rather than enforcing an order.
 *  · No applicability outside Ethiopia and Chad. Three of the five country cells are
 *    unstated in §8, so Sudan, Tanzania and Mozambique are shown as unstated and are
 *    never defaulted to "yes" or to "not applicable".
 *  · No approval or authority limit on the amount. FP&A determines it; who approves it
 *    and to what limit is not stated for an advance payment.
 *  · No transfer price. The prices between the source, transit and export entities are
 *    to be prepared by Hiba and are not available, so no leg carries an implied one.
 */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { commodityById } from "../data/master";
import { formatDate, formatMoney, formatNumber, sumMoney } from "../domain/calc";
import { ADVANCE_PAYMENT_TRANSITIONS, humanise, nextStates, toneFor } from "../domain/status";
import type { AdvancePayment, AdvancePaymentState, Money } from "../domain/types";
import { COUNTRY_ORDER, countryName } from "../domain/variants";
import { OPEN_DECISIONS, OUTSTANDING_MASTER_DATA } from "../domain/workflow";
import { api } from "../services/store";
import { Banner, EmptyState, ErrorState, StatusChip, useToast } from "../components/feedback";
import {
  ActionBar,
  CollapsibleSection,
  FieldGrid,
  PageHeader,
  QuantityDonut,
  RouteVisual,
  SummaryCard,
  TotalBanner,
} from "../components/layout";
import { FormRow, TextInput } from "../components/form";
import { DataTable, type Column, type SavedView } from "../components/table";
import { useAsync } from "./hooks";

/* ------------------------------------------------------------------ *
 * The §8 country matrix row, as written. Three cells are unstated and stay unstated.
 * ------------------------------------------------------------------ */

const MATRIX: Record<string, { cell: string; stated: boolean }> = {
  SD: { cell: "Not stated", stated: false },
  ET: { cell: "Yes — Invictus → AMROS → African Lakes", stated: true },
  TD: { cell: "Not applicable", stated: true },
  TZ: { cell: "Not stated", stated: false },
  MZ: { cell: "Not stated", stated: false },
};

const UNSTATED_COUNTRIES = COUNTRY_ORDER.filter((c) => !MATRIX[c].stated);

const CHAD_REASON =
  "Chad funds are transferred from Invictus in USD and received locally in local currency, with exchange differences. [AS-IS]";

const BLOCK_OPEN =
  "Execution cannot start in Ethiopia until the advance payment chain has been completed and confirmed. [AS-IS] — stated as sequence in the workshop notes; whether COTS should block on it is [OPEN]. Nothing downstream in this mock-up is blocked on it.";

const OPEN_POINTS: string[] = [
  "Whether advance payments apply outside Ethiopia and Chad. The §8 matrix leaves Sudan, Tanzania and Mozambique unstated — the evidence line reads: W only. Three cells unstated.",
  BLOCK_OPEN,
];

const confirmedLegs = (a: AdvancePayment) => a.legs.filter((l) => l.confirmedOn).length;

const chainLabel = (a: AdvancePayment) =>
  `${formatNumber(confirmedLegs(a))} of ${formatNumber(a.legs.length)} legs confirmed`;

const fmtTotals = (totals: Money[]) =>
  totals.length === 0 ? "–" : totals.map((t) => formatMoney(t)).join(" + ");

/* ================================================================== *
 * List
 * ================================================================== */

export function AdvancePaymentList() {
  const payments = useAsync(() => api.listAdvancePayments());
  const contracts = useAsync(() => api.listContracts());

  if (payments.error) {
    return (
      <div className="page">
        <ErrorState detail={payments.error} onRetry={payments.reload} />
      </div>
    );
  }

  const rows = payments.data ?? [];
  const cts = contracts.data ?? [];
  const contractOf = (id: string) => cts.find((c) => c.id === id);

  const confirmedTotals = sumMoney(rows.filter((a) => a.state === "confirmed").map((a) => a.totalAmount));
  const issuedTotals = sumMoney(rows.filter((a) => a.state === "issued").map((a) => a.totalAmount));
  const unstatedContracts = cts.filter((c) => UNSTATED_COUNTRIES.includes(c.origin));

  const columns: Column<AdvancePayment>[] = [
    {
      key: "requestNo",
      header: "Request",
      cell: (a) => <Link to={`/pre-clearance/advance-payments/${a.id}`}>{a.requestNo}</Link>,
      sortValue: (a) => a.requestNo,
    },
    {
      key: "contract",
      header: "Purchase contract",
      cell: (a) => {
        const c = contractOf(a.contractId);
        return c ? <Link to={`/contracts/${c.id}`}>{c.contractNo}</Link> : <span className="muted">–</span>;
      },
      sortValue: (a) => contractOf(a.contractId)?.contractNo ?? "",
    },
    {
      key: "country",
      header: "Country",
      cell: (a) => countryName(a.country),
      sortValue: (a) => countryName(a.country),
      filterOptions: [...new Set(rows.map((a) => a.country))].map((c) => ({
        value: c,
        label: countryName(c),
      })),
      filterMatch: (a, v) => a.country === v,
    },
    {
      key: "state",
      header: "State",
      cell: (a) => <StatusChip tone={toneFor(a.state)} label={humanise(a.state)} size="sm" />,
      sortValue: (a) => a.state,
      filterOptions: [...new Set(rows.map((a) => a.state))].map((s) => ({ value: s, label: humanise(s) })),
      filterMatch: (a, v) => a.state === v,
    },
    {
      key: "total",
      header: "Total amount",
      align: "right",
      cell: (a) =>
        a.totalAmount ? (
          formatMoney(a.totalAmount)
        ) : a.state === "not_applicable" ? (
          <span className="muted">–</span>
        ) : (
          <StatusChip tone="warn" label="awaiting the FP&A amount" size="sm" />
        ),
      sortValue: (a) => a.totalAmount?.amount ?? 0,
    },
    {
      key: "determinedBy",
      header: "Determined by",
      cell: (a) => a.determinedBy ?? <span className="muted">–</span>,
      sortValue: (a) => a.determinedBy ?? "",
      optional: true,
    },
    {
      key: "determinedOn",
      header: "Determined on",
      cell: (a) => formatDate(a.determinedOn),
      sortValue: (a) => a.determinedOn ?? "",
      optional: true,
    },
    {
      key: "chain",
      header: "Chain progress",
      cell: (a) =>
        a.legs.length === 0 ? (
          <StatusChip
            tone="na"
            label="Not applicable"
            size="sm"
            title={a.note ?? "Advance payments are not applicable in Chad (v2.0 §6.7)."}
          />
        ) : (
          <StatusChip
            tone={confirmedLegs(a) === a.legs.length ? "ok" : "warn"}
            label={chainLabel(a)}
            size="sm"
          />
        ),
      sortValue: (a) => (a.legs.length === 0 ? -1 : confirmedLegs(a) / a.legs.length),
    },
  ];

  const savedViews: SavedView<AdvancePayment>[] = [
    { key: "all", label: "All requests" },
    {
      key: "pending",
      label: "Awaiting an FP&A amount",
      description: "FP&A determines the amount (v2.0 §6.7 activity 5); these requests have no amount yet.",
      predicate: (a) => a.state === "amount_pending",
    },
    {
      key: "issued",
      label: "Issued and not confirmed",
      description: '"Payments are issued and need to be confirmed" — v2.0 §6.7 activity 5.',
      predicate: (a) => a.state === "issued",
    },
    { key: "confirmed", label: "Confirmed", predicate: (a) => a.state === "confirmed" },
    {
      key: "na",
      label: "Not applicable",
      description: "Advance payments are not applicable in Chad (v2.0 §6.7 exception).",
      predicate: (a) => a.state === "not_applicable",
    },
  ];

  return (
    <>
      <PageHeader
        moduleLabel="Pre-clearance"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Pre-clearance", to: "/pre-clearance" },
          { label: "Advance payments" },
        ]}
        title="Advance payments"
        meta="Issued between parties before execution of the contract starts — FP&A determines the amount, the payments are issued and need to be confirmed (v2.0 §6.7 activity 5)"
        recordKey={`${rows.length}`}
        recordDate="requests"
      />

      <div className="page">
        <Banner tone="info" title="Country applicability — v2.0 §8, row: advance payment before execution">
          Sudan <strong>not stated</strong>; Ethiopia <strong>yes</strong> — Invictus issues to AMROS, AMROS
          transfers to African Lakes, and execution can then start; Chad <strong>not applicable</strong>;
          Tanzania <strong>not stated</strong>; Mozambique <strong>not stated</strong>. The evidence line
          reads "W only. Three cells unstated." Those three cells have not been filled in, so this screen
          shows them as unstated rather than assuming either answer.
        </Banner>

        <Banner tone="warn" title="Open decision D-15">
          {OPEN_DECISIONS["D-15"].title} Owner: {OPEN_DECISIONS["D-15"].owner}.
        </Banner>

        <Banner tone="warn" title="Whether COTS should block execution is [OPEN]">
          {BLOCK_OPEN}
        </Banner>

        <div className="grid-3">
          <SummaryCard title="Confirmed" tone="ok">
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Total confirmed",
                  value: <strong>{fmtTotals(confirmedTotals.totals)}</strong>,
                  behaviour: "calculated",
                  hint: "Only same-currency amounts are added; nothing is converted",
                },
                {
                  label: "Requests",
                  value: formatNumber(rows.filter((a) => a.state === "confirmed").length),
                },
                {
                  label: "Requests with no amount",
                  value: formatNumber(confirmedTotals.skipped),
                  hint: "Excluded from the total because no amount is recorded",
                },
              ]}
            />
          </SummaryCard>

          <SummaryCard title="Issued and unconfirmed" tone={issuedTotals.totals.length > 0 ? "warn" : "ok"}>
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Total issued, not confirmed",
                  value: <strong>{fmtTotals(issuedTotals.totals)}</strong>,
                  behaviour: "calculated",
                },
                {
                  label: "Requests",
                  value: formatNumber(rows.filter((a) => a.state === "issued").length),
                },
              ]}
            />
            <p className="small muted" style={{ marginTop: "0.5rem" }}>
              "Payments are issued and need to be confirmed" (§6.7 activity 5). An issued payment is not an
              output; the output is a confirmed advance payment.
            </p>
          </SummaryCard>

          <SummaryCard title="Applicability unstated" tone={unstatedContracts.length > 0 ? "warn" : "na"}>
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Contracts in an unstated country",
                  value: <strong>{formatNumber(unstatedContracts.length)}</strong>,
                  behaviour: "calculated",
                },
                {
                  label: "Countries",
                  value: UNSTATED_COUNTRIES.map((c) => countryName(c)).join(", "),
                },
              ]}
            />
            <p className="small muted" style={{ marginTop: "0.5rem" }}>
              Whether an advance payment is required on these contracts is decision D-15. No request is raised
              for them here, and their absence is not evidence that none is needed.
            </p>
          </SummaryCard>
        </div>

        <TotalBanner
          label="Confirmed advance payments"
          value={fmtTotals(confirmedTotals.totals)}
          derivation={`${formatNumber(rows.filter((a) => a.state === "confirmed").length)} confirmed request(s) · ${fmtTotals(issuedTotals.totals)} issued and not yet confirmed · same-currency amounts only`}
        />

        <DataTable
          caption="Advance payment requests"
          rows={rows}
          columns={columns}
          loading={payments.loading}
          searchPlaceholder="Search by request number, contract or country…"
          searchValue={(a) =>
            `${a.requestNo} ${contractOf(a.contractId)?.contractNo ?? ""} ${countryName(a.country)} ${a.legs
              .map((l) => `${l.fromEntity} ${l.toEntity}`)
              .join(" ")}`
          }
          rowHref={(a) => `/pre-clearance/advance-payments/${a.id}`}
          savedViews={savedViews}
          emptyTitle="No advance payment request"
          emptyBody="Advance payments are issued between parties before execution of the contract starts (v2.0 §6.7 activity 5)."
        />

        <CollapsibleSection title="Why Chad differs" defaultOpen={false}>
          <p className="small">
            v2.0 §6.7 exceptions, as written: "Chad has no advance payment step. [AS-IS]" and "{CHAD_REASON}"
          </p>
          <p className="small muted">
            The second sentence is <strong>sourcing rather than export execution</strong>. It is recorded here
            because it is the stated reason Chad differs, and for no other purpose — no exchange difference is
            calculated, shown or implied anywhere in this module.
          </p>
          <div className="dtable__scroll">
            <table className="dash__table">
              <caption className="sr-only">
                Advance payment before execution, by country — v2.0 §8 country matrix
              </caption>
              <thead>
                <tr>
                  <th scope="col">Country</th>
                  <th scope="col">Advance payment before execution</th>
                  <th scope="col">Evidence class</th>
                </tr>
              </thead>
              <tbody>
                {COUNTRY_ORDER.map((c) => (
                  <tr key={c}>
                    <th scope="row">{countryName(c)}</th>
                    <td>{MATRIX[c].cell}</td>
                    <td>
                      {MATRIX[c].stated ? (
                        <StatusChip tone="info" label="Stated — [AS-IS]" size="sm" />
                      ) : (
                        <StatusChip tone="warn" label="Unstated — [OPEN]" size="sm" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      </div>
    </>
  );
}

/* ================================================================== *
 * Detail
 * ================================================================== */

export function AdvancePaymentDetail() {
  const { id = "" } = useParams();
  const toast = useToast();
  const { user } = useAuth();

  const payment = useAsync(() => api.getAdvancePayment(id), [id]);
  const contracts = useAsync(() => api.listContracts());
  const plans = useAsync(() => api.listExecutionPlans());
  const shipments = useAsync(() => api.listShipments());

  const [references, setReferences] = useState<Record<number, string>>({});

  if (payment.error) {
    return (
      <div className="page">
        <ErrorState detail={payment.error} onRetry={payment.reload} />
      </div>
    );
  }
  if (payment.loading)
    return (
      <div className="page">
        <div className="card card__body muted">Loading…</div>
      </div>
    );
  const a = payment.data;
  if (!a) {
    return (
      <div className="page">
        <EmptyState
          title="Advance payment request not found"
          action={
            <Link className="btn btn--primary" to="/pre-clearance/advance-payments">
              Back to advance payments
            </Link>
          }
        />
      </div>
    );
  }

  const contract = (contracts.data ?? []).find((c) => c.id === a.contractId);
  const plan = a.executionPlanId ? (plans.data ?? []).find((p) => p.id === a.executionPlanId) : undefined;
  const contractPlans = (plans.data ?? []).filter((p) => p.contractId === a.contractId);
  const contractShipments = (shipments.data ?? []).filter((s) => s.contractId === a.contractId);
  const confirmed = confirmedLegs(a);
  const fraction = a.legs.length > 0 ? confirmed / a.legs.length : 0;
  const allowed = nextStates(ADVANCE_PAYMENT_TRANSITIONS, a.state);
  const lastConfirmedOn = a.legs
    .map((l) => l.confirmedOn)
    .filter((d): d is string => Boolean(d))
    .sort()
    .pop();
  const hibaTransferPrices = OUTSTANDING_MASTER_DATA.find((m) => m.owner === "Hiba");

  const advance = async (to: AdvancePaymentState) => {
    const res = await api.advanceAdvancePayment(a.id, to, {
      determinedBy: user?.displayName ?? "FP&A",
    });
    if (!res.ok) {
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `${a.requestNo} moved to ${humanise(to)}.`);
  };

  const recordLeg = async (index: number, patch: { issued?: boolean; confirmed?: boolean }) => {
    const reference = (references[index] ?? "").trim();
    const res = await api.recordAdvancePaymentLeg(a.id, index, {
      ...patch,
      ...(reference ? { reference } : {}),
    });
    if (!res.ok) {
      toast.push("risk", res.reason);
      return;
    }
    const leg = a.legs[index];
    toast.push(
      "ok",
      `${leg.fromEntity} to ${leg.toEntity} recorded as ${patch.confirmed ? "confirmed" : "issued"}.`,
    );
  };

  /** §6.7 sequence — leg n is not touched while leg n−1 is unconfirmed. */
  const blockedReason = (index: number): string | undefined => {
    if (index === 0) return undefined;
    const prior = a.legs[index - 1];
    if (prior.confirmedOn) return undefined;
    return `${a.legs[index].fromEntity} transfers to ${a.legs[index].toEntity} only after ${prior.fromEntity} to ${prior.toEntity} is confirmed (v2.0 §6.7).`;
  };

  return (
    <>
      <PageHeader
        moduleLabel="Pre-clearance"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Pre-clearance", to: "/pre-clearance" },
          { label: "Advance payments", to: "/pre-clearance/advance-payments" },
          { label: a.requestNo },
        ]}
        title={`Advance payment ${a.requestNo}`}
        statusChip={
          <>
            <StatusChip tone="info" label={countryName(a.country)} />
            <StatusChip tone={toneFor(a.state)} label={humanise(a.state)} />
          </>
        }
        meta={
          <>
            {contract
              ? `${contract.contractNo} · ${commodityById(contract.commodityId)?.name}`
              : "No contract linked"}
            {plan ? ` · execution plan ${plan.planningNo}` : ""}
            {" · "}
            {MATRIX[a.country].cell}
          </>
        }
        recordKey={a.requestNo}
        recordDate={formatDate(a.determinedOn)}
        actions={
          <ActionBar
            primary={
              allowed.length > 0
                ? allowed.map((to) => ({
                    label: `Mark as ${humanise(to)}`,
                    tone: "primary" as const,
                    onClick: () => void advance(to),
                  }))
                : [
                    {
                      label: "Advance the request",
                      tone: "primary" as const,
                      disabled: true,
                      disabledReason:
                        a.state === "not_applicable"
                          ? "Advance payments are not applicable in Chad (v2.0 §6.7) — there is nothing to advance."
                          : `"${humanise(a.state)}" is a terminal state — no further transition is permitted (v2.0 §6.7).`,
                    },
                  ]
            }
            more={[
              ...(contract
                ? [{ label: `Open ${contract.contractNo}`, to: `/contracts/${contract.id}` }]
                : []),
              { label: "All advance payments", to: "/pre-clearance/advance-payments" },
            ]}
          />
        }
      />

      <div className="page">
        <Banner tone="warn" title="Open decision D-15">
          {OPEN_DECISIONS["D-15"].title} Owner: {OPEN_DECISIONS["D-15"].owner}.
        </Banner>
        {a.state === "not_applicable" ? (
          <Banner tone="info" title="Not applicable in this country">
            "Advance payments are not applicable in Chad." [AS-IS, v2.0 §6.7 activity 5]. The request is kept
            as an explicit <em>Not applicable</em> record rather than left pending.
          </Banner>
        ) : null}

        <div className="grid-3">
          <SummaryCard title="Request">
            <FieldGrid
              columns={1}
              fields={[
                { label: "Request number", value: a.requestNo, behaviour: "readonly" },
                {
                  label: "Purchase contract",
                  value: contract ? (
                    <Link to={`/contracts/${contract.id}`}>{contract.contractNo}</Link>
                  ) : undefined,
                  behaviour: "inherited",
                },
                { label: "Country", value: countryName(a.country) },
                {
                  label: "Execution plan",
                  value: plan ? plan.planningNo : undefined,
                  hint: plan ? undefined : "No execution plan is named on this request",
                },
                {
                  label: "State",
                  value: <StatusChip tone={toneFor(a.state)} label={humanise(a.state)} size="sm" />,
                },
                {
                  label: "Applicability (§8)",
                  value: MATRIX[a.country].cell,
                  hint: MATRIX[a.country].stated ? undefined : "The matrix cell is unstated — decision D-15",
                },
              ]}
            />
          </SummaryCard>

          <SummaryCard title="Amount" tone={a.totalAmount ? undefined : "warn"}>
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Total amount",
                  value: a.totalAmount ? <strong>{formatMoney(a.totalAmount)}</strong> : undefined,
                  behaviour: "required",
                  hint: a.totalAmount ? undefined : "No amount has been determined yet",
                },
                { label: "Determined by", value: a.determinedBy },
                { label: "Determined on", value: formatDate(a.determinedOn) },
              ]}
            />
            <p className="small muted" style={{ marginTop: "0.5rem" }}>
              FP&A determines the amount (v2.0 §6.7 activity 5). Who approves it, and to what authority limit,
              is not stated for an advance payment in either source.
            </p>
          </SummaryCard>

          <SummaryCard
            title="Chain"
            tone={a.legs.length === 0 ? "na" : confirmed === a.legs.length ? "ok" : "warn"}
          >
            {a.legs.length === 0 ? (
              <p className="small muted">
                No leg is defined. Chad has no advance payment step, so there is no chain to complete.
              </p>
            ) : (
              <>
                <QuantityDonut
                  fraction={fraction}
                  valueLabel={`${formatNumber(confirmed)} leg(s)`}
                  ofLabel={`${formatNumber(a.legs.length)} leg(s)`}
                  caption="of the payment chain confirmed"
                  tone={fraction >= 1 ? "ok" : "warn"}
                />
                <FieldGrid
                  columns={1}
                  fields={[
                    {
                      label: "Legs confirmed",
                      value: <strong>{chainLabel(a)}</strong>,
                      behaviour: "calculated",
                    },
                    { label: "Last confirmation", value: formatDate(lastConfirmedOn) },
                  ]}
                />
              </>
            )}
          </SummaryCard>
        </div>

        <TotalBanner
          label="Advance payment chain"
          value={a.legs.length === 0 ? "Not applicable" : chainLabel(a)}
          derivation={
            a.legs.length === 0
              ? "Chad has no advance payment step (v2.0 §6.7)"
              : `${a.legs.map((l) => `${l.fromEntity} → ${l.toEntity}`).join(", ")} · the output is a confirmed advance payment`
          }
        />

        {a.legs.length > 0 ? (
          <div className="card card__body">
            <h3 className="card__title">Payment chain</h3>
            <RouteVisual
              ariaLabel={`Advance payment chain for ${a.requestNo} in ${countryName(a.country)}: ${a.legs
                .map(
                  (l) =>
                    `${l.fromEntity} to ${l.toEntity}, ${
                      l.confirmedOn ? "confirmed" : l.issuedOn ? "issued and not confirmed" : "not issued"
                    }`,
                )
                .join("; ")}.`}
              nodes={a.legs.map((l) => ({
                label: `${l.fromEntity} → ${l.toEntity}`,
                sub: l.confirmedOn
                  ? `confirmed ${formatDate(l.confirmedOn)}`
                  : l.issuedOn
                    ? `issued ${formatDate(l.issuedOn)}, not confirmed`
                    : "not issued",
                glyph: l.confirmedOn ? "✓" : l.issuedOn ? "▲" : "○",
                reached: Boolean(l.confirmedOn),
              }))}
              leftCaption={{ label: "Chain starts at", value: a.legs[0].fromEntity }}
              rightCaption={{
                label: "Execution can start after",
                value: a.legs[a.legs.length - 1].toEntity,
              }}
            />
            <p className="small muted" style={{ marginTop: "0.75rem" }}>
              In Ethiopia, Invictus issues to AMROS, AMROS transfers to African Lakes, and execution can then
              start (v2.0 §6.7 activity 5). A node counts as reached when that leg is confirmed, not when it
              is issued — the output is a confirmed advance payment.
            </p>
          </div>
        ) : null}

        <CollapsibleSection
          title="Legs"
          indicator={
            a.legs.length === 0 ? (
              <StatusChip tone="na" label="Not applicable" size="sm" />
            ) : (
              <StatusChip
                tone={confirmed === a.legs.length ? "ok" : "warn"}
                label={chainLabel(a)}
                size="sm"
              />
            )
          }
        >
          {a.legs.length === 0 ? (
            <EmptyState title="No payment leg" glyph="–">
              "Advance payments are not applicable in Chad." [AS-IS, v2.0 §6.7 activity 5]. No leg is defined
              and none is expected.
            </EmptyState>
          ) : (
            <>
              <p className="small muted">
                The legs run in order. A payment cannot be confirmed before it has been issued, and a later
                leg is not touched while the one before it is unconfirmed (v2.0 §6.7) — a later leg's controls
                are disabled with the reason given, and any refusal from the store is reported as it is
                worded.
              </p>
              <div className="dtable__scroll">
                <table className="dtable__table">
                  <caption className="sr-only">Advance payment legs</caption>
                  <thead>
                    <tr>
                      <th scope="col">From</th>
                      <th scope="col">To</th>
                      <th scope="col" className="text-right">
                        Amount
                      </th>
                      <th scope="col">Issued on</th>
                      <th scope="col">Confirmed on</th>
                      <th scope="col">Reference</th>
                      <th scope="col">Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.legs.map((l, i) => {
                      const blocked = blockedReason(i);
                      const refId = `ap-leg-${i}-reference`;
                      return (
                        <tr key={`${l.fromEntity}-${l.toEntity}-${i}`}>
                          <th scope="row">{l.fromEntity}</th>
                          <td>{l.toEntity}</td>
                          <td className="text-right">{formatMoney(l.amount)}</td>
                          <td>
                            {l.issuedOn ? (
                              formatDate(l.issuedOn)
                            ) : (
                              <StatusChip tone="idle" label="not issued" size="sm" />
                            )}
                          </td>
                          <td>
                            {l.confirmedOn ? (
                              <StatusChip
                                tone="ok"
                                label={`confirmed ${formatDate(l.confirmedOn)}`}
                                size="sm"
                              />
                            ) : (
                              <StatusChip tone="warn" label="not confirmed" size="sm" />
                            )}
                          </td>
                          <td className="mono small">{l.reference ?? <span className="muted">–</span>}</td>
                          <td>
                            <div className="row">
                              <FormRow
                                label={`Reference — ${l.fromEntity} to ${l.toEntity}`}
                                htmlFor={refId}
                                hint="Optional. Recorded with the issue or the confirmation."
                              >
                                <TextInput
                                  id={refId}
                                  value={references[i] ?? ""}
                                  onChange={(v) => setReferences((r) => ({ ...r, [i]: v }))}
                                  disabled={Boolean(blocked)}
                                />
                              </FormRow>
                              <button
                                type="button"
                                className="btn btn--sm"
                                disabled={Boolean(blocked) || Boolean(l.issuedOn)}
                                title={
                                  blocked ??
                                  (l.issuedOn ? `Already issued on ${formatDate(l.issuedOn)}.` : undefined)
                                }
                                onClick={() => void recordLeg(i, { issued: true })}
                              >
                                Issue
                              </button>
                              <button
                                type="button"
                                className="btn btn--sm"
                                disabled={Boolean(blocked) || Boolean(l.confirmedOn)}
                                title={
                                  blocked ??
                                  (l.confirmedOn
                                    ? `Already confirmed on ${formatDate(l.confirmedOn)}.`
                                    : undefined)
                                }
                                onClick={() => void recordLeg(i, { confirmed: true })}
                              >
                                Confirm
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {a.note ? (
                <p className="small muted" style={{ marginTop: "0.75rem" }}>
                  {a.note}
                </p>
              ) : null}
            </>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Execution readiness">
          <Banner tone="info" title="The sequence is recorded; a system block is not">
            {BLOCK_OPEN}
          </Banner>
          {contractShipments.length === 0 && contractPlans.length === 0 ? (
            <EmptyState title="No execution record on this contract yet" glyph="○">
              Nothing has been planned or shipped against {contract?.contractNo ?? "this contract"}.
            </EmptyState>
          ) : (
            <>
              {contractPlans.length > 0 ? (
                <div className="dtable__scroll">
                  <table className="dash__table">
                    <caption className="sr-only">Execution plans on this contract</caption>
                    <thead>
                      <tr>
                        <th scope="col">Execution plan</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="text-right">
                          Planned quantity
                        </th>
                        <th scope="col">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractPlans.map((p) => (
                        <tr key={p.id}>
                          <th scope="row">
                            {p.planningNo}
                            {p.id === a.executionPlanId ? (
                              <>
                                {" "}
                                <StatusChip tone="accent" label="named on this request" size="sm" />
                              </>
                            ) : null}
                          </th>
                          <td>
                            <StatusChip tone={toneFor(p.status)} label={humanise(p.status)} size="sm" />
                          </td>
                          <td className="text-right">{formatNumber(p.plannedQuantityMt)} MT</td>
                          <td>{formatDate(p.createdDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {contractShipments.length > 0 ? (
                <ul className="doclist" style={{ marginTop: "0.75rem" }}>
                  {contractShipments.map((s) => {
                    const startedBeforeConfirmation =
                      lastConfirmedOn !== undefined && s.createdDate < lastConfirmedOn;
                    return (
                      <li key={s.id}>
                        <span className="doclist__name">
                          {s.shipmentNo}
                          <span className="doclist__sub">
                            created {formatDate(s.createdDate)} ·{" "}
                            {a.legs.length === 0
                              ? "no advance payment applies in this country"
                              : confirmed === a.legs.length
                                ? "the chain on this request is confirmed"
                                : `${chainLabel(a)} on this request`}
                          </span>
                        </span>
                        <StatusChip tone={toneFor(s.status)} label={humanise(s.status)} size="sm" />
                        {startedBeforeConfirmation ? (
                          <StatusChip
                            tone="warn"
                            label="record created before the chain was confirmed"
                            size="sm"
                            title="An observation on the dates held, not a breach of any stated rule — no source says COTS must refuse this."
                          />
                        ) : null}
                        <Link className="btn btn--sm" to={`/shipments/${s.id}`}>
                          Open
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              <p className="small muted" style={{ marginTop: "0.75rem" }}>
                v2.0 §6.7 records the sequence — execution cannot start in Ethiopia until the chain has been
                completed and confirmed — but it does not record a system block. This mock-up therefore
                refuses nothing on this basis: the records above are shown as they stand, and no shipment or
                plan is prevented, hidden or reordered because of the state of this request.
              </p>
            </>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="What the source does not settle" defaultOpen={false}>
          <ul className="small stack">
            {OPEN_POINTS.map((p) => (
              <li key={p}>{p}</li>
            ))}
            <li>
              {hibaTransferPrices
                ? `${hibaTransferPrices.dataSet} — to be prepared by ${hibaTransferPrices.owner}; outstanding master data blocking ${hibaTransferPrices.blocks}.`
                : "Transfer prices, source → transit → export entity — to be prepared by Hiba."}{" "}
              The transfer prices between the source, transit and export entities are not yet available, so no
              leg here carries or implies one.
            </li>
          </ul>
          <p className="small muted">
            Decision D-15: {OPEN_DECISIONS["D-15"].title} Owner: {OPEN_DECISIONS["D-15"].owner}. Participants
            named by §6.7 are FP&A, for the amount, and the origin and transit entities — Invictus, AMROS,
            African Lakes, Renatus and Merek.
          </p>
        </CollapsibleSection>
      </div>
    </>
  );
}
