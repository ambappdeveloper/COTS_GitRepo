/**
 * PROCUREMENT — the purchase order, and its four screens
 * ======================================================
 *
 * Added by the business instruction of 3 September 2026:
 *
 *   · *"Add new tab after the Purchase Agreement tab name Procurement."*
 *   · *"List View: PO Number (clickable to open the details), Total amount in local
 *     currency, total amount in USD."*
 *   · *"New PO button (option to add or insert new PO Details)."*
 *   · *"Add screen: PO Number as header, Purchase Agreement reference field (option to
 *     select multiple purchase agreement)."*
 *   · *"View Screen: PO Number, Card for Purchase Agreement List — columns are Purchase
 *     Agreement Reference, Payment Amount in local currency, usd conversion (read only),
 *     actual payment date — edit button to edit the columns."*
 *   · *"View screen: Add necessary Info card related to PO as summary."*
 *   · *"Add Edit screen to edit PO number and Purchase agreement list."*
 *
 * WHY THE PURCHASE ORDER BECOMES A RECORD. Two records already carried a purchase order
 * before this tab existed, and neither carried it as a record: the fund and the purchase
 * agreement each hold a `purchaseOrderNo` as a plain string, issued after the fact and
 * checked by nothing. The captured data shows what that costs — MMP builds a fund
 * reference out of the purchase order plus a sequence and never checks the result, so two
 * captured funds share `45643123`. This tab makes the purchase order the thing it always
 * was in the business: one order, several agreements beneath it, and a payment recorded
 * against each. The two string fields are deliberately left alone. Nothing is migrated
 * and no join between them and this record is asserted, because the instruction states
 * none — the screens show both readings side by side and say that they are two.
 *
 * WHAT IS DERIVED AND WHAT IS STORED. The instruction marks the USD conversion **read
 * only**, so a line stores the payment amount in local currency and the actual payment
 * date, and the conversion is computed by `purchaseOrderLineUsd()` from the rate in force
 * on that line's own payment date. The line holds no rate. That is the same rule the fund
 * follows and it reads the same FX master through the same one function, so replacing the
 * stand-in rate table with the real rate API changes every screen at once.
 *
 * WHY THE CONVERSION IS PER LINE. Because two payments under one order can be made on
 * different dates, and the rate moves between them — `po-1` is exactly that case. A total
 * converted once, at one rate, would be a different number from the sum of what was
 * actually paid, and would be wrong in a way nobody could see. The list therefore totals
 * the local amounts **per currency** and never across them, and totals the conversions by
 * adding the per-line results.
 *
 * OPEN QUESTIONS, all recorded on the view screen rather than guessed at:
 *   · who issues a PO number, and whether COTS should generate it rather than take it;
 *   · whether an order's agreements must share a supplier, a commodity or a season;
 *   · whether the payment recorded here is the same payment the fund records, and if so
 *     which of the two records it;
 *   · whether an order has a status, and what closes one.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Banner, EmptyState, ErrorState, StatusChip, useToast } from "../components/feedback";
import {
  ErrorSummary,
  FormActions,
  FormRow,
  RequiredLegend,
  SelectInput,
  TextArea,
  TextInput,
} from "../components/form";
import {
  ActionBar,
  CollapsibleSection,
  FieldGrid,
  PageHeader,
  SummaryCard,
  TotalBanner,
} from "../components/layout";
import { type Column, DataTable } from "../components/table";
import { commodityById, counterpartyName } from "../data/master";
import { fxCoverage } from "../data/fx-rates";
import { TODAY, formatDate, formatMoney, formatMt, formatNumber, money } from "../domain/calc";
import {
  purchaseOrderLineRate,
  purchaseOrderLineUsd,
  purchaseOrderTotals,
} from "../domain/sourcing";
import { humanise, toneFor } from "../domain/status";
import type {
  CurrencyCode,
  PurchaseAgreement,
  PurchaseOrder,
  PurchaseOrderLine,
} from "../domain/types";
import { api } from "../services/store";
import { useAsync } from "./hooks";

/** The currencies a payment may be recorded in. The FX master answers for the rest. */
const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = [
  { value: "USD", label: "USD" },
  { value: "SDG", label: "SDG" },
  { value: "ETB", label: "ETB" },
  { value: "TZS", label: "TZS" },
  { value: "AED", label: "AED" },
  { value: "EUR", label: "EUR" },
];

const NOTE_LIMIT = 200;

function parseNumber(v: string): number | undefined {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function errorList(errors: Record<string, string>): { field: string; message: string }[] {
  return Object.entries(errors).map(([field, message]) => ({ field, message }));
}

/** How the local totals of an order read on one line of text. */
function formatLocalTotals(amounts: { amount: number; currency: CurrencyCode }[]): string {
  return amounts.length > 0 ? amounts.map((m) => formatMoney(m)).join(" + ") : "–";
}

/* ================================================================== *
 * LIST — the Procurement tab of /sourcing
 * ================================================================== */

export function ProcurementTab({
  orders,
  agreements,
  loading,
}: {
  orders: PurchaseOrder[];
  agreements: PurchaseAgreement[];
  loading: boolean;
}) {
  const agreementById = new Map(agreements.map((a) => [a.id, a]));

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "po",
      header: "PO number",
      /* Clickable, as the instruction states: the PO number is what opens the details. */
      cell: (o) => (
        <Link className="mono" to={`/sourcing/procurement/${o.id}`}>
          {o.poNumber}
        </Link>
      ),
      sortValue: (o) => o.poNumber,
    },
    {
      key: "agreements",
      header: "Purchase agreements",
      cell: (o) => {
        const refs = o.lines
          .map((l) => agreementById.get(l.purchaseAgreementId)?.paRef)
          .filter((r): r is string => Boolean(r));
        return refs.length > 0 ? (
          <span className="mono small">{refs.join(", ")}</span>
        ) : (
          <span className="muted">none</span>
        );
      },
      sortValue: (o) => o.lines.length,
    },
    {
      key: "local",
      header: "Total amount in local currency",
      align: "right",
      cell: (o) => {
        const t = purchaseOrderTotals(o);
        return (
          <>
            <strong>{formatLocalTotals(t.localAmounts)}</strong>
            {t.linesWithoutPayment > 0 ? (
              <>
                <br />
                <span className="xsmall muted">
                  {t.linesWithoutPayment} of {t.lines} line(s) carry no payment
                </span>
              </>
            ) : null}
          </>
        );
      },
      sortValue: (o) => purchaseOrderTotals(o).localAmounts[0]?.amount ?? 0,
    },
    {
      key: "usd",
      header: "Total amount in USD",
      align: "right",
      cell: (o) => {
        const t = purchaseOrderTotals(o);
        return (
          <>
            <strong>{formatMoney(t.usdAmount)}</strong>
            {t.linesWithoutConversion > 0 ? (
              <>
                <br />
                <StatusChip
                  tone="warn"
                  label={`${t.linesWithoutConversion} line(s) not converted`}
                  size="sm"
                  title="A payment amount with no actual payment date has no rate to read, so it has no USD conversion — and that is not the same as zero. It is therefore in no total."
                />
              </>
            ) : null}
          </>
        );
      },
      sortValue: (o) => purchaseOrderTotals(o).usdAmount.amount,
    },
    {
      key: "paid",
      header: "Latest payment",
      cell: (o) => {
        const t = purchaseOrderTotals(o);
        return t.latestPaymentDate ? (
          formatDate(t.latestPaymentDate)
        ) : (
          <StatusChip tone="warn" label="no payment recorded" size="sm" />
        );
      },
      sortValue: (o) => purchaseOrderTotals(o).latestPaymentDate ?? "",
    },
    {
      key: "created",
      header: "Created",
      cell: (o) => (
        <>
          {formatDate(o.createdOn)}
          <br />
          <span className="small muted">{o.createdBy}</span>
        </>
      ),
      sortValue: (o) => o.createdOn,
      optional: true,
    },
  ];

  return (
    <>
      <Banner tone="info" title="Procurement — the purchase order as a record of its own">
        Added by the instruction of 3 September 2026. Two records already carried a purchase order before
        this tab existed and neither carried it as a record: <Link to="/sourcing">a fund</Link> and{" "}
        <Link to="/sourcing/agreements">a purchase agreement</Link> each hold a PO number as a plain string,
        issued after the fact and checked by nothing — which is how two captured funds come to share the
        reference <span className="mono">45643123</span>. Here an order is one PO number, the purchase
        agreements beneath it, and the payment made against each.
        <br />
        <br />
        <strong>The USD conversion is read, never entered</strong>, exactly as on a fund: the payment amount
        divided by the rate in force on that line's own actual payment date. It is calculated per line and
        not per order, because two payments under one order can fall on different dates and the rate moves
        between them — <span className="mono">1123</span> below is that case. Local amounts are totalled per
        currency and never added across currencies.
      </Banner>

      <Banner tone="warn" title="What this tab does not decide">
        The instruction names the four screens and their fields and states no rules beyond them. So: the PO
        number is <strong>entered</strong> rather than generated, because nothing says COTS issues it — it is
        checked for uniqueness only, since the list identifies a row by it. Nothing requires the agreements
        on one order to share a supplier, a commodity or a season. Nothing connects the payment recorded here
        to the payment recorded on a fund, so both exist and neither is derived from the other. And an order
        has no status, because none is named — what closes an order is an open question.
      </Banner>

      <DataTable
        caption="Purchase orders"
        rows={orders}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by PO number or purchase agreement reference…"
        searchValue={(o) =>
          `${o.poNumber} ${o.lines
            .map((l) => agreementById.get(l.purchaseAgreementId)?.paRef ?? "")
            .join(" ")}`
        }
        savedViews={[
          { key: "all", label: "All purchase orders" },
          {
            key: "unpaid",
            label: "Something unpaid",
            description: "At least one agreement on the order carries no payment amount.",
            predicate: (o) => purchaseOrderTotals(o).linesWithoutPayment > 0,
          },
          {
            key: "unconverted",
            label: "Something unconverted",
            description:
              "A payment amount with no actual payment date. There is no rate to read, so there is no USD conversion.",
            predicate: (o) => purchaseOrderTotals(o).linesWithoutConversion > 0,
          },
          {
            key: "multi",
            label: "More than one agreement",
            predicate: (o) => o.lines.length > 1,
          },
        ]}
        emptyTitle="No purchase order yet"
        emptyBody="An order is a PO number and the purchase agreements beneath it. New PO captures both."
        emptyAction={
          <Link className="btn btn--primary" to="/sourcing/procurement/new">
            New PO
          </Link>
        }
      />
    </>
  );
}

/* ================================================================== *
 * VIEW — /sourcing/procurement/:id
 * ================================================================== */

export function PurchaseOrderDetail() {
  const { id = "" } = useParams();
  const order = useAsync(() => api.getPurchaseOrder(id), [id]);
  const agreements = useAsync(() => api.listPurchaseAgreements());
  const funds = useAsync(() => api.listFunds());

  if (order.error) {
    return (
      <div className="page">
        <ErrorState detail={order.error} onRetry={order.reload} />
      </div>
    );
  }
  if (order.loading) {
    return (
      <div className="page">
        <div className="card card__body muted">Loading…</div>
      </div>
    );
  }
  const o = order.data;
  if (!o) {
    return (
      <div className="page">
        <EmptyState
          title="Purchase order not found"
          action={
            <Link className="btn btn--primary" to="/sourcing/procurement">
              Back to procurement
            </Link>
          }
        />
      </div>
    );
  }

  const agreementRows = agreements.data ?? [];
  const agreementById = new Map(agreementRows.map((a) => [a.id, a]));
  const totals = purchaseOrderTotals(o);
  const myAgreements = o.lines
    .map((l) => agreementById.get(l.purchaseAgreementId))
    .filter((a): a is PurchaseAgreement => Boolean(a));
  const agreedMt = myAgreements.reduce((t, a) => t + a.totalQuantityMt, 0);
  const suppliers = [...new Set(myAgreements.map((a) => a.supplierId))];
  const commodities = [...new Set(myAgreements.map((a) => a.commodityId))];
  const seasons = [...new Set(myAgreements.map((a) => a.seasonality))];
  /**
   * The other reading of this PO number — the funds and agreements that hold it as a
   * plain string. Shown so the two readings can be compared; no join is asserted.
   */
  const fundsNamingIt = (funds.data ?? []).filter((f) => f.purchaseOrderNo === o.poNumber);
  const agreementsNamingIt = agreementRows.filter((a) => a.purchaseOrderNo === o.poNumber);

  return (
    <>
      <PageHeader
        moduleLabel="Sourcing intake"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Sourcing intake", to: "/sourcing" },
          { label: "Procurement", to: "/sourcing/procurement" },
          { label: o.poNumber },
        ]}
        /* The PO number is the header, as the instruction states. */
        title={o.poNumber}
        meta={
          <>
            {formatNumber(totals.agreements)} purchase agreement(s) · {formatLocalTotals(totals.localAmounts)}{" "}
            · {formatMoney(totals.usdAmount)} converted ·{" "}
            {totals.latestPaymentDate
              ? `latest payment ${formatDate(totals.latestPaymentDate)}`
              : "no payment recorded"}
          </>
        }
        recordKey={o.poNumber}
        recordDate={
          o.updatedOn
            ? `changed ${formatDate(o.updatedOn)} by ${o.updatedBy ?? "unknown"}`
            : `created ${formatDate(o.createdOn)}`
        }
        actions={
          <ActionBar
            primary={[
              {
                label: "Edit this purchase order",
                to: `/sourcing/procurement/${o.id}/edit`,
                tone: "primary",
              },
            ]}
          />
        }
      />

      <div className="page">
        {/* "Add necessary Info card related to PO as summary." Three cards: what the order
            is, what has been paid against it, and what it covers. */}
        <div className="grid-3">
          <SummaryCard title="Purchase order">
            <FieldGrid
              columns={1}
              fields={[
                { label: "PO number", value: <span className="mono">{o.poNumber}</span>, behaviour: "required" },
                {
                  label: "Purchase agreements",
                  value: formatNumber(totals.agreements),
                  hint: "The Add screen selects one or several. One agreement appears once on one order, so a payment against it is recorded in one place.",
                },
                { label: "Created on", value: formatDate(o.createdOn), behaviour: "readonly" },
                { label: "Created by", value: o.createdBy, behaviour: "readonly" },
                {
                  label: "Last changed",
                  value: o.updatedOn ? `${formatDate(o.updatedOn)} by ${o.updatedBy ?? "unknown"}` : undefined,
                  behaviour: "readonly",
                  hint: "Not versioned. Who may edit a purchase order once it is saved is not stated, so anyone signed in may.",
                },
                {
                  label: "Status",
                  value: undefined,
                  hint: "The instruction names no status for a purchase order and nothing states what closes one, so none is asserted here.",
                },
              ]}
            />
          </SummaryCard>

          <SummaryCard title="Paid against it" tone={totals.linesWithoutPayment > 0 ? "warn" : "accent"}>
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Total in local currency",
                  value: <strong>{formatLocalTotals(totals.localAmounts)}</strong>,
                  behaviour: "calculated",
                  hint: "One total per currency. Amounts are never added across currencies.",
                },
                {
                  label: "Total in USD",
                  value: <strong>{formatMoney(totals.usdAmount)}</strong>,
                  behaviour: "calculated",
                  hint: "The sum of the per-line conversions, each read at the rate in force on that line's own payment date. Read only — the order stores no rate and no conversion.",
                },
                {
                  label: "Lines with no payment",
                  value: formatNumber(totals.linesWithoutPayment),
                  hint: "Permitted: the Add screen captures the PO number and the agreements, and a payment is recorded afterwards on the Edit screen.",
                },
                {
                  label: "Lines with no conversion",
                  value: formatNumber(totals.linesWithoutConversion),
                  hint: "A payment amount with no actual payment date, or a currency the FX master holds no rate for on that date. There is no USD figure, which is not the same as zero — so the line is in no total.",
                },
                {
                  label: "Latest payment",
                  value: totals.latestPaymentDate ? formatDate(totals.latestPaymentDate) : undefined,
                },
              ]}
            />
          </SummaryCard>

          <SummaryCard title="What it covers">
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Agreed quantity",
                  value: agreedMt > 0 ? formatMt(agreedMt) : undefined,
                  behaviour: "calculated",
                  hint: "The agreed quantity of every agreement on this order, added. Ours — the instruction does not ask for it, and it is the figure that says what the order is for.",
                },
                {
                  label: "Suppliers",
                  value:
                    suppliers.length > 0
                      ? suppliers.map((sid) => counterpartyName(sid)).join(", ")
                      : undefined,
                  hint: "Nothing requires the agreements on one order to share a supplier, so more than one is permitted and reported.",
                },
                {
                  label: "Commodities",
                  value:
                    commodities.length > 0
                      ? commodities.map((cid) => commodityById(cid)?.name ?? cid).join(", ")
                      : undefined,
                },
                { label: "Seasons", value: seasons.length > 0 ? seasons.join(", ") : undefined },
                {
                  label: "Also naming this PO number",
                  value:
                    fundsNamingIt.length + agreementsNamingIt.length > 0
                      ? `${formatNumber(fundsNamingIt.length)} fund(s), ${formatNumber(agreementsNamingIt.length)} agreement(s)`
                      : undefined,
                  hint: "The fund and the purchase agreement each hold a PO number as a plain string. Shown so the two readings can be compared; no join between them and this record is asserted, because the instruction states none.",
                },
              ]}
            />
          </SummaryCard>
        </div>

        <TotalBanner
          label="Total amount in USD"
          value={formatMoney(totals.usdAmount)}
          derivation={
            `${formatLocalTotals(totals.localAmounts)} across ${totals.lines} line(s), each converted at the rate in force on its own actual payment date` +
            (totals.linesWithoutConversion > 0
              ? `; ${totals.linesWithoutConversion} line(s) have no rate and are in no total`
              : "")
          }
        />

        {/* "Card for Purchase Agreement List … edit button to edit the columns." The four
            columns the instruction names, and one Edit button over the card — the columns
            are edited on the Edit screen, which is where the whole list is edited. */}
        <CollapsibleSection
          title={`Purchase agreement list — ${o.lines.length} agreement(s)`}
          defaultOpen
          indicator={
            <StatusChip
              tone={totals.linesWithoutPayment > 0 ? "warn" : "ok"}
              label={
                totals.linesWithoutPayment > 0
                  ? `${totals.linesWithoutPayment} unpaid`
                  : "all paid"
              }
              size="sm"
            />
          }
          actions={
            <Link className="btn btn--sm" to={`/sourcing/procurement/${o.id}/edit`}>
              Edit these columns
            </Link>
          }
        >
          {o.lines.length === 0 ? (
            <EmptyState title="No purchase agreement on this order" glyph="○">
              An order records at least one. This one cannot have been saved by either screen.
            </EmptyState>
          ) : (
            <>
              <div className="dtable__scroll">
                <table className="dtable__table">
                  <caption className="sr-only">
                    The purchase agreements on this order, with the payment amount in local currency, its
                    read-only USD conversion and the actual payment date
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Purchase agreement reference</th>
                      <th scope="col" className="text-right">
                        Payment amount in local currency
                      </th>
                      <th scope="col" className="text-right">
                        USD conversion
                      </th>
                      <th scope="col">Actual payment date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.lines.map((l) => {
                      const a = agreementById.get(l.purchaseAgreementId);
                      const usd = purchaseOrderLineUsd(l);
                      const rate = purchaseOrderLineRate(l);
                      return (
                        <tr key={l.id}>
                          <th scope="row">
                            {a ? (
                              <>
                                <Link className="mono" to={`/sourcing/agreements/${a.id}`}>
                                  {a.paRef}
                                </Link>
                                <br />
                                <span className="xsmall muted">
                                  {commodityById(a.commodityId)?.name ?? a.commodityId} ·{" "}
                                  {counterpartyName(a.supplierId)} · {formatMt(a.totalQuantityMt)} agreed
                                </span>
                                <br />
                                <StatusChip
                                  tone={toneFor(a.flowStatus)}
                                  label={humanise(a.flowStatus)}
                                  size="sm"
                                />
                              </>
                            ) : (
                              <span className="muted">
                                the agreement {l.purchaseAgreementId} is no longer held
                              </span>
                            )}
                          </th>
                          <td className="text-right">
                            {l.paymentAmount ? (
                              formatMoney(l.paymentAmount)
                            ) : (
                              <StatusChip tone="warn" label="no payment recorded" size="sm" />
                            )}
                          </td>
                          <td className="text-right">
                            {usd ? (
                              <>
                                <strong>{formatMoney(usd)}</strong>
                                <br />
                                <span className="xsmall muted">
                                  {rate
                                    ? `÷ ${formatNumber(rate.perUsd)} ${l.paymentAmount?.currency}/USD from ${formatDate(rate.effectiveFrom)}`
                                    : "already in USD, so no rate applies"}
                                </span>
                              </>
                            ) : (
                              <span className="muted">
                                {l.paymentAmount
                                  ? "no rate applies, so no conversion"
                                  : "–"}
                              </span>
                            )}
                          </td>
                          <td>
                            {l.actualPaymentDate ? (
                              formatDate(l.actualPaymentDate)
                            ) : (
                              <StatusChip tone="warn" label="not paid yet" size="sm" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">{formatNumber(totals.agreements)} agreement(s)</th>
                      <td className="text-right">
                        <strong>{formatLocalTotals(totals.localAmounts)}</strong>
                      </td>
                      <td className="text-right">
                        <strong>{formatMoney(totals.usdAmount)}</strong>
                      </td>
                      <td className="small muted">
                        {totals.linesWithoutPaymentDate > 0
                          ? `${totals.linesWithoutPaymentDate} line(s) carry no payment date`
                          : "every line is dated"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="small muted" style={{ marginTop: "0.5rem" }}>
                <strong>The USD conversion is read only, per line.</strong> Each is the payment amount
                divided by the rate in force on <em>that line's</em> actual payment date, so two payments
                under one order that fall in different months convert at different rates — which is why the
                total is the sum of the conversions and not the sum of the amounts converted once. A line
                with an amount and no payment date has no rate, so it has no conversion and is in no total;
                that is different from a conversion of zero, and the footer says which lines those are.
              </p>
            </>
          )}
        </CollapsibleSection>

        {fundsNamingIt.length > 0 || agreementsNamingIt.length > 0 ? (
          <CollapsibleSection
            title={`Elsewhere in COTS, ${formatNumber(fundsNamingIt.length + agreementsNamingIt.length)} record(s) name this PO number`}
            defaultOpen={false}
          >
            <ul className="doclist">
              {fundsNamingIt.map((f) => (
                <li key={f.id}>
                  <span className="doclist__name">
                    Fund {f.fundRef}
                    <span className="doclist__sub">
                      {counterpartyName(f.agentId)} · {f.seasonality} ·{" "}
                      {f.actualPaymentDate ? `paid ${formatDate(f.actualPaymentDate)}` : "not paid yet"}
                    </span>
                  </span>
                  <StatusChip tone="info" label="holds the PO as a string" size="sm" />
                </li>
              ))}
              {agreementsNamingIt.map((a) => (
                <li key={a.id}>
                  <span className="doclist__name">
                    Agreement {a.paRef}
                    <span className="doclist__sub">
                      {commodityById(a.commodityId)?.name ?? a.commodityId} ·{" "}
                      {counterpartyName(a.supplierId)} · {formatMt(a.totalQuantityMt)} agreed
                    </span>
                  </span>
                  <StatusChip tone="info" label="holds the PO as a string" size="sm" />
                </li>
              ))}
            </ul>
            <p className="xsmall muted" style={{ marginTop: "0.5rem" }}>
              These are matched on the PO number as text and nothing more. <strong>[OPEN]</strong> Whether
              the payment recorded on this order is the same payment a fund records, and if so which of the
              two records it. Until that is answered both exist, neither is derived from the other, and this
              list is shown rather than a link asserted.
            </p>
          </CollapsibleSection>
        ) : null}

        {o.note ? (
          <div className="card card__body">
            <h3 className="card__title">Notes</h3>
            <p className="small" style={{ marginTop: "0.5rem" }}>
              {o.note}
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}

/* ================================================================== *
 * ADD and EDIT — /sourcing/procurement/new and /:id/edit
 *
 * One component for both, as everywhere else in this prototype, because the two
 * screens differ in exactly two ways and stating them once is clearer than
 * maintaining two copies that drift:
 *
 *   · **Add** captures the PO number and the purchase agreements beneath it, and
 *     nothing else — that is all the instruction puts on it. A payment has not been
 *     made when an order is raised, so there is nothing to record about one.
 *   · **Edit** carries the same two things plus the payment columns the view screen's
 *     Edit button points at: the payment amount in local currency and the actual
 *     payment date, per agreement. The USD conversion appears beside them and is not
 *     an input, because the instruction marks it read only.
 * ================================================================== */

interface DraftPoLine {
  key: string;
  purchaseAgreementId: string;
  amount: string;
  currency: CurrencyCode;
  actualPaymentDate: string;
}

export function PurchaseOrderForm({ mode }: { mode: "create" | "edit" }) {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const agreements = useAsync(() => api.listPurchaseAgreements());
  const order = useAsync(
    () => (mode === "edit" ? api.getPurchaseOrder(id) : Promise.resolve(undefined)),
    [id, mode],
  );
  const existing = mode === "edit" ? order.data : undefined;

  const [poNumber, setPoNumber] = useState("");
  const [lines, setLines] = useState<DraftPoLine[]>([]);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(mode === "create");

  useEffect(() => {
    if (mode !== "edit" || !existing || hydrated) return;
    setPoNumber(existing.poNumber);
    setLines(
      existing.lines.map((l) => ({
        key: `saved-${l.id}`,
        purchaseAgreementId: l.purchaseAgreementId,
        amount: l.paymentAmount ? String(l.paymentAmount.amount) : "",
        currency: l.paymentAmount?.currency ?? "SDG",
        actualPaymentDate: l.actualPaymentDate ?? "",
      })),
    );
    setNote(existing.note ?? "");
    setHydrated(true);
  }, [mode, existing, hydrated]);

  const agreementRows = agreements.data ?? [];
  const agreementById = new Map(agreementRows.map((a) => [a.id, a]));
  const chosen = new Set(lines.map((l) => l.purchaseAgreementId).filter(Boolean));

  /**
   * The agreements offered for selection.
   *
   * "Option to select multiple purchase agreement" — so this is a multi-select, built as
   * a tick list rather than a native multiple-select: a native one hides what has been
   * chosen behind a scroll box and is unusable with a keyboard, and the CTRM anti-pattern
   * register (A1) rules out controls whose state cannot be read at a glance. An agreement
   * already on this order is ticked; ticking another adds a line, unticking removes it.
   */
  function toggleAgreement(agreementId: string) {
    setLines((prev) => {
      const found = prev.find((l) => l.purchaseAgreementId === agreementId);
      if (found) return prev.filter((l) => l.purchaseAgreementId !== agreementId);
      return [
        ...prev,
        {
          key: `line-${agreementId}`,
          purchaseAgreementId: agreementId,
          amount: "",
          currency: "SDG",
          actualPaymentDate: "",
        },
      ];
    });
  }

  function setLine(key: string, patch: Partial<DraftPoLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  /** The lines as they will be saved, and the live totals read off them. */
  const savedLines: Omit<PurchaseOrderLine, "id">[] = lines.map((l) => {
    const amt = parseNumber(l.amount);
    return {
      purchaseAgreementId: l.purchaseAgreementId,
      paymentAmount: amt === undefined ? undefined : money(amt, l.currency),
      actualPaymentDate: l.actualPaymentDate || undefined,
    };
  });
  const totals = purchaseOrderTotals({ lines: savedLines.map((l, i) => ({ ...l, id: `draft-${i}` })) });

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!poNumber.trim()) {
      next["po-number"] = "Enter the PO number. It is the order's reference, and the list identifies a row by it.";
    }
    if (lines.length === 0) {
      next["po-agreements"] =
        "Select at least one purchase agreement. An order with none is a PO number and nothing else.";
    }
    for (const l of lines) {
      const amt = parseNumber(l.amount);
      if (l.amount.trim() && amt === undefined) {
        next[`po-amt-${l.key}`] = "The payment amount is not a number.";
      } else if (amt !== undefined && amt < 0) {
        next[`po-amt-${l.key}`] = "The payment amount cannot be negative.";
      }
      /* A rate that the FX master cannot answer for is reported here rather than at save,
         because the conversion is what the columns exist to show. It is not refused: the
         instruction states no rule, and the amount and the date are both real. */
      if (amt !== undefined && l.currency !== "USD" && l.actualPaymentDate) {
        const line: PurchaseOrderLine = {
          id: "check",
          purchaseAgreementId: l.purchaseAgreementId,
          paymentAmount: money(amt, l.currency),
          actualPaymentDate: l.actualPaymentDate,
        };
        if (!purchaseOrderLineUsd(line)) {
          next[`po-date-${l.key}`] =
            `No exchange rate is held for ${l.currency} on ${formatDate(l.actualPaymentDate)}, so this line has no USD conversion. ` +
            `The rate table runs from ${formatDate(fxCoverage(l.currency).from)}. Nothing is refused — the line is simply in no USD total.`;
        }
      }
    }
    if (note.length > NOTE_LIMIT) {
      next["po-note"] = `The note is limited to ${NOTE_LIMIT} characters; this one is ${note.length}.`;
    }
    return next;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setRefusal(null);
    const next = validate();
    setErrors(next);
    /* The rate-coverage messages are advisory: they explain a blank conversion and do not
       stop a save. Only the field errors do. */
    const blocking = Object.entries(next).filter(([k]) => !k.startsWith("po-date-"));
    if (blocking.length > 0) return;

    setSaving(true);
    const res =
      mode === "create"
        ? await api.createPurchaseOrder({
            poNumber: poNumber.trim(),
            lines: savedLines,
            createdBy: user?.username ?? "unknown",
            note: note.trim() || undefined,
          })
        : await api.updatePurchaseOrder(id, {
            poNumber: poNumber.trim(),
            lines: savedLines,
            note: note.trim() || undefined,
            updatedBy: user?.username ?? "unknown",
          });
    setSaving(false);
    if (!res.ok) {
      setRefusal(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    const saved = purchaseOrderTotals(res.value);
    toast.push(
      "ok",
      `${mode === "create" ? "Purchase order" : ""} ${res.value.poNumber} ${mode === "create" ? "saved" : "updated"} — ` +
        `${saved.agreements} purchase agreement(s), ${formatLocalTotals(saved.localAmounts)}` +
        (saved.usdAmount.amount > 0 ? `, ${formatMoney(saved.usdAmount)} converted.` : ".") +
        (saved.linesWithoutConversion > 0
          ? ` ${saved.linesWithoutConversion} line(s) carry an amount with no rate to convert it, so they are in no USD total.`
          : ""),
    );
    navigate(`/sourcing/procurement/${res.value.id}`);
  }

  const summary = errorList(errors).filter((e) => !e.field.startsWith("po-date-"));
  const advisories = errorList(errors).filter((e) => e.field.startsWith("po-date-"));
  const listTo = "/sourcing/procurement";
  const cancelTo = mode === "edit" && existing ? `/sourcing/procurement/${existing.id}` : listTo;

  const body = (
    <>
      <PageHeader
        moduleLabel="Sourcing intake"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Sourcing intake", to: "/sourcing" },
          { label: "Procurement", to: listTo },
          ...(mode === "edit" && existing
            ? [{ label: existing.poNumber, to: `/sourcing/procurement/${existing.id}` }, { label: "Edit" }]
            : [{ label: "New PO" }]),
        ]}
        /* On Add the PO number is the header field itself, so the title says what is being
           captured; on Edit the order already has a number and it is the title. */
        title={mode === "create" ? "New purchase order" : `Edit ${existing?.poNumber ?? "purchase order"}`}
        meta={
          <>
            {user ? `${user.displayName} · ${user.unit}` : ""} ·{" "}
            {mode === "create" ? (
              <>created {formatDate(TODAY)} · the PO number is entered, not generated</>
            ) : (
              <>
                created {formatDate(existing?.createdOn)} by {existing?.createdBy}
                {existing?.updatedOn
                  ? ` · last changed ${formatDate(existing.updatedOn)} by ${existing.updatedBy ?? "unknown"}`
                  : " · not changed since it was created"}
              </>
            )}
          </>
        }
        recordKey={mode === "create" ? "Procurement" : (existing?.poNumber ?? "PO")}
        recordDate={mode === "create" ? "new purchase order" : "editing this purchase order"}
      />

      <div className="page">
        <Banner
          tone="info"
          title={
            mode === "create"
              ? "An order is raised here, and paid on the Edit screen"
              : "The Edit screen carries the PO number and the whole purchase agreement list"
          }
        >
          {mode === "create" ? (
            <>
              The instruction of 3 September 2026 puts two things on this screen and no more: the{" "}
              <strong>PO number</strong> as the header, and a <strong>purchase agreement reference</strong>{" "}
              field with the option to select several. Nothing about a payment is captured here, because no
              payment has been made when an order is raised — the payment amount and the actual payment date
              are on the Edit screen, which is where the view screen's Edit button leads.
            </>
          ) : (
            <>
              This screen edits the two things the instruction names — the <strong>PO number</strong> and the{" "}
              <strong>purchase agreement list</strong> — and the list includes the payment columns the view
              screen shows: the payment amount in local currency and the actual payment date, per agreement.
              The <strong>USD conversion is not an input</strong>: the instruction marks it read only, so it
              is shown beside each amount and read from the FX master on that line's own payment date.
            </>
          )}
        </Banner>

        <Banner tone="warn" title="The PO number is entered, and it must be unique">
          Nothing states that COTS issues a purchase order number, so it is not generated — unlike the plan,
          budget, fund and agreement references, which are. What is enforced is uniqueness: the list makes the
          PO number the row identity and the link that opens the details, so two orders sharing one number
          would give two rows that are both right and neither findable. That is not hypothetical — MMP builds
          a fund reference from the purchase order and never checks it, and two captured funds share{" "}
          <span className="mono">45643123</span>.
        </Banner>

        {refusal ? (
          <Banner tone="risk" title="The service layer refused this purchase order">
            {refusal}
          </Banner>
        ) : null}

        <form className="stack" onSubmit={submit} noValidate>
          <ErrorSummary
            errors={summary}
            title={
              mode === "create"
                ? "This purchase order could not be saved"
                : "These changes could not be saved"
            }
          />
          <RequiredLegend />

          <CollapsibleSection title="PO number" defaultOpen>
            <div className="fields">
              <FormRow
                label="PO number"
                htmlFor="po-number"
                required
                error={errors["po-number"]}
                hint="The header of this screen, as the instruction states. Entered rather than generated, and checked for uniqueness because the list identifies an order by it."
              >
                <TextInput
                  id="po-number"
                  value={poNumber}
                  onChange={setPoNumber}
                  required
                  error={errors["po-number"]}
                  placeholder="e.g. 1330"
                />
              </FormRow>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title={`Purchase agreement reference — ${lines.length} selected`}
            defaultOpen
          >
            {errors["po-agreements"] ? (
              <Banner tone="risk" title="Select at least one purchase agreement">
                {errors["po-agreements"]}
              </Banner>
            ) : null}

            {agreementRows.length === 0 ? (
              <EmptyState title="No purchase agreement is held" glyph="○">
                An order is raised against agreements.{" "}
                <Link to="/sourcing/agreements/new">Create a purchase agreement</Link> first.
              </EmptyState>
            ) : (
              <div className="dtable__scroll">
                <table className="dtable__table">
                  <caption className="sr-only">
                    Every purchase agreement held, with a tick box to put it on this order
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">On this order</th>
                      <th scope="col">Purchase agreement reference</th>
                      <th scope="col">Commodity and supplier</th>
                      <th scope="col" className="text-right">
                        Agreed quantity
                      </th>
                      <th scope="col">Flow status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agreementRows.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <input
                            type="checkbox"
                            id={`po-ag-${a.id}`}
                            checked={chosen.has(a.id)}
                            onChange={() => toggleAgreement(a.id)}
                          />{" "}
                          <label htmlFor={`po-ag-${a.id}`} className="sr-only">
                            Put {a.paRef} on this order
                          </label>
                        </td>
                        <th scope="row" className="mono">
                          {a.paRef}
                        </th>
                        <td>
                          {commodityById(a.commodityId)?.name ?? a.commodityId}
                          <br />
                          <span className="xsmall muted">{counterpartyName(a.supplierId)}</span>
                        </td>
                        <td className="text-right">{formatMt(a.totalQuantityMt)}</td>
                        <td>
                          <StatusChip tone={toneFor(a.flowStatus)} label={humanise(a.flowStatus)} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="small muted" style={{ marginTop: "0.5rem" }}>
              <strong>Several agreements per order</strong>, as the instruction states. It is a tick list
              rather than a native multiple-select, because a native one hides what has been chosen behind a
              scroll box and cannot be read at a glance — anti-pattern A1. An agreement may appear on this
              order once: the service layer refuses a duplicate, so a payment against one agreement is
              recorded in one place. Nothing requires the agreements on one order to share a supplier, a
              commodity or a season, so nothing here checks that.
            </p>
          </CollapsibleSection>

          {mode === "edit" ? (
            <CollapsibleSection title={`Payment against each agreement — ${lines.length} line(s)`} defaultOpen>
              {lines.length === 0 ? (
                <EmptyState title="No agreement selected" glyph="○">
                  Tick an agreement above to record a payment against it.
                </EmptyState>
              ) : (
                <>
                  {advisories.length > 0 ? (
                    <Banner tone="warn" title="Some lines will show no USD conversion">
                      {advisories.map((a) => (
                        <p key={a.field} className="small">
                          {a.message}
                        </p>
                      ))}
                    </Banner>
                  ) : null}

                  <div className="dtable__scroll">
                    <table className="dtable__table">
                      <caption className="sr-only">
                        The payment amount in local currency, its read-only USD conversion and the actual
                        payment date, per purchase agreement
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Purchase agreement reference</th>
                          <th scope="col">Payment amount in local currency</th>
                          <th scope="col">Currency</th>
                          <th scope="col" className="text-right">
                            USD conversion
                          </th>
                          <th scope="col">Actual payment date</th>
                          <th scope="col">
                            <span className="sr-only">Row actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((l) => {
                          const a = agreementById.get(l.purchaseAgreementId);
                          const amt = parseNumber(l.amount);
                          const preview: PurchaseOrderLine = {
                            id: l.key,
                            purchaseAgreementId: l.purchaseAgreementId,
                            paymentAmount: amt === undefined ? undefined : money(amt, l.currency),
                            actualPaymentDate: l.actualPaymentDate || undefined,
                          };
                          const usd = purchaseOrderLineUsd(preview);
                          const rate = purchaseOrderLineRate(preview);
                          return (
                            <tr key={l.key}>
                              <th scope="row" className="mono">
                                {a?.paRef ?? l.purchaseAgreementId}
                              </th>
                              <td>
                                <TextInput
                                  id={`po-amt-${l.key}`}
                                  value={l.amount}
                                  onChange={(v) => setLine(l.key, { amount: v })}
                                  error={errors[`po-amt-${l.key}`]}
                                  inputMode="decimal"
                                  placeholder="–"
                                />
                              </td>
                              <td>
                                <SelectInput
                                  id={`po-cur-${l.key}`}
                                  value={l.currency}
                                  onChange={(v) => setLine(l.key, { currency: v as CurrencyCode })}
                                  options={CURRENCY_OPTIONS}
                                />
                              </td>
                              <td className="text-right" aria-live="polite">
                                {usd ? (
                                  <>
                                    <strong>{formatMoney(usd)}</strong>
                                    <br />
                                    <span className="xsmall muted">
                                      {rate
                                        ? `÷ ${formatNumber(rate.perUsd)} ${l.currency}/USD`
                                        : "already in USD"}
                                    </span>
                                  </>
                                ) : (
                                  <span className="muted">
                                    {amt === undefined
                                      ? "–"
                                      : l.actualPaymentDate
                                        ? "no rate applies"
                                        : "needs a payment date"}
                                  </span>
                                )}
                              </td>
                              <td>
                                <TextInput
                                  id={`po-date-${l.key}`}
                                  type="date"
                                  value={l.actualPaymentDate}
                                  onChange={(v) => setLine(l.key, { actualPaymentDate: v })}
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn--sm"
                                  onClick={() => toggleAgreement(l.purchaseAgreementId)}
                                >
                                  Remove
                                  <span className="sr-only"> {a?.paRef ?? "this agreement"} from this order</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th scope="row">{formatNumber(totals.agreements)} agreement(s)</th>
                          <td colSpan={2}>
                            <strong>{formatLocalTotals(totals.localAmounts)}</strong>
                          </td>
                          <td className="text-right">
                            <strong>{formatMoney(totals.usdAmount)}</strong>
                          </td>
                          <td colSpan={2} className="small muted">
                            {totals.linesWithoutConversion > 0
                              ? `${totals.linesWithoutConversion} line(s) in no USD total`
                              : "every amount converted"}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <p className="small muted" style={{ marginTop: "0.5rem" }}>
                    <strong>The USD conversion column is read only</strong> and updates as you type, so what
                    the view screen will show is visible before the save. It is the amount divided by the rate
                    in force on that line's own actual payment date, which is why a line needs a date before
                    it converts — and why two lines paid in different months convert differently. The FX table
                    behind it is a <strong>dummy stand-in</strong>: in the real application the rate comes from
                    an API, and every screen reads it through one function so that swap is a one-place change.
                  </p>
                </>
              )}
            </CollapsibleSection>
          ) : null}

          <CollapsibleSection title="Notes" defaultOpen={false}>
            <FormRow label="Notes" htmlFor="po-note" error={errors["po-note"]}>
              <TextArea id="po-note" value={note} onChange={setNote} rows={3} error={errors["po-note"]} />
            </FormRow>
            <p className="xsmall muted" aria-live="polite">
              {note.length} of {NOTE_LIMIT} characters used.
            </p>
          </CollapsibleSection>

          <FormActions>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? "Save" : "Save changes"}
            </button>
            <Link className="btn" to={cancelTo}>
              Cancel
            </Link>
            <p className="muted small">
              {summary.length > 0
                ? `${summary.length} field${summary.length === 1 ? "" : "s"} need attention.`
                : mode === "create"
                  ? "Save records the PO number and the agreements beneath it. The payment against each is recorded afterwards, on the Edit screen."
                  : "Save records the PO number and the whole agreement list, including the payment amounts and dates. The USD conversion is never stored — it is read."}
            </p>
          </FormActions>
        </form>
      </div>
    </>
  );

  if (mode === "create") return body;

  if (order.error) {
    return (
      <div className="page">
        <ErrorState detail={order.error} onRetry={order.reload} />
      </div>
    );
  }
  if (order.loading || (existing && !hydrated)) {
    return (
      <div className="page">
        <div className="card card__body muted">Loading…</div>
      </div>
    );
  }
  if (!existing) {
    return (
      <div className="page">
        <EmptyState
          title="Purchase order not found"
          action={
            <Link className="btn btn--primary" to={listTo}>
              Back to procurement
            </Link>
          }
        />
      </div>
    );
  }
  return body;
}
