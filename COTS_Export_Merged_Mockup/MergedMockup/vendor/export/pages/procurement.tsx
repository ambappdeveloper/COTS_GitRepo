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
import { exchangeRateOn, fxCoverage } from "../data/fx-rates";
import { TODAY, formatDate, formatMoney, formatMt, formatNumber, money, round } from "../domain/calc";
import {
  type FundCandidate,
  agreementsOfferedOnOrder,
  fundCandidatesForAgreement,
  fundIsIssued,
  fundsForOrderScope,
  purchaseOrderFundTotals,
  purchaseOrderLineRate,
  purchaseOrderPriceTotals,
  purchaseOrderLineUsd,
  purchaseOrderTotals,
} from "../domain/sourcing";
import { humanise, toneFor } from "../domain/status";
import type {
  CurrencyCode,
  Fund,
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
  funds,
  loading,
}: {
  orders: PurchaseOrder[];
  agreements: PurchaseAgreement[];
  /** The funds, so the totals can be read from what was issued — 15 September 2026. */
  funds: Fund[];
  loading: boolean;
}) {
  const agreementById = new Map(agreements.map((a) => [a.id, a]));
  /* Computed once per order and reused across the columns, rather than four times a row. */
  const fundViewOf = new Map(
    orders.map((o) => [o.id, purchaseOrderFundTotals(o, agreements, funds)] as const),
  );
  /* `Total Price Amount`, read from the agreements on the order — 15 September 2026. */
  const priceViewOf = new Map(
    orders.map((o) => [o.id, purchaseOrderPriceTotals(o, agreements)] as const),
  );

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
      /*
       * `TOTAL PRICE AMOUNT` — 15 September 2026, *"total price amount under purchase
       * agreement linked to that PO"*. The agreements' own `Price Amount`, added per
       * currency. An agreement with no price contributes nothing and is counted, because a
       * missing price is not a zero — every agreement captured before today has none.
       */
      key: "price",
      header: "Total price amount",
      align: "right",
      cell: (o) => {
        const p = priceViewOf.get(o.id)!;
        if (p.amounts.length === 0) {
          return (
            <>
              <span className="muted">—</span>
              <br />
              <span className="xsmall muted">
                {p.agreementsWithoutPrice > 0
                  ? `${formatNumber(p.agreementsWithoutPrice)} agreement(s) carry no price`
                  : "no agreement on this order"}
              </span>
            </>
          );
        }
        return (
          <>
            <strong>{formatLocalTotals(p.amounts)}</strong>
            {p.agreementsWithoutPrice > 0 ? (
              <>
                <br />
                <StatusChip
                  tone="warn"
                  label={`${p.agreementsWithoutPrice} of ${p.agreements} carry no price`}
                  size="sm"
                  title="An agreement with no Price Amount contributes nothing to this total rather than a zero. The field was added on 15 September 2026, so every agreement captured before then has none."
                />
              </>
            ) : null}
          </>
        );
      },
      sortValue: (o) => priceViewOf.get(o.id)!.amounts[0]?.amount ?? 0,
    },
    {
      /* "Add the selected funds related to the purchase agreement" — 15 September 2026. */
      key: "funds",
      header: "Funds paid",
      cell: (o) => {
        const v = fundViewOf.get(o.id)!;
        const all = [...v.rows.flatMap((r) => r.funds), ...v.unattached];
        if (all.length === 0) return <span className="muted">none</span>;
        return (
          <>
            <span className="mono small">{all.map((f) => f.fundRef).join(", ")}</span>
            {v.fundsWithoutIssued > 0 ? (
              <>
                <br />
                <span className="xsmall muted">
                  {v.fundsWithoutIssued} of {v.fundsOnOrder} carry no issued amount
                </span>
              </>
            ) : null}
          </>
        );
      },
      sortValue: (o) => fundViewOf.get(o.id)!.fundsOnOrder,
    },
    {
      /*
       * `TOTAL FUND VALUE` — 15 September 2026. The value *requested* on the funds this
       * order carries, beside what was actually issued in the next column. The captured data
       * is why both are shown: fund 431_205511220 requested 750,000 SDG and was issued
       * 720,000, and one figure cannot answer for the other.
       */
      key: "fundvalue",
      header: "Total fund value",
      align: "right",
      cell: (o) => {
        const v = fundViewOf.get(o.id)!;
        if (v.fundValueLocal.length === 0) return <span className="muted">—</span>;
        return <span>{formatLocalTotals(v.fundValueLocal)}</span>;
      },
      sortValue: (o) => fundViewOf.get(o.id)!.fundValueLocal[0]?.amount ?? 0,
    },
    {
      key: "local",
      header: "Total amount paid",
      align: "right",
      cell: (o) => {
        const v = fundViewOf.get(o.id)!;
        const line = purchaseOrderTotals(o);
        return (
          <>
            <strong>{formatLocalTotals(v.localAmounts)}</strong>
            {v.fundsOnOrder === 0 ? (
              <>
                <br />
                <span className="xsmall muted">no fund names this PO number</span>
              </>
            ) : null}
            {v.rowsDisagreeing > 0 ? (
              <>
                <br />
                <StatusChip
                  tone="warn"
                  label={`line says ${formatLocalTotals(line.localAmounts)}`}
                  size="sm"
                  title="The order's own line and the funds paid against it hold different figures. Neither is derived from the other, so both are shown rather than one being chosen."
                />
              </>
            ) : null}
          </>
        );
      },
      sortValue: (o) => fundViewOf.get(o.id)!.localAmounts[0]?.amount ?? 0,
    },
    {
      key: "usd",
      header: "Total issued in USD",
      align: "right",
      cell: (o) => {
        const v = fundViewOf.get(o.id)!;
        return (
          <>
            <strong>{formatMoney(v.usdAmount)}</strong>
            {v.fundsWithoutConversion > 0 ? (
              <>
                <br />
                <StatusChip
                  tone="warn"
                  label={`${v.fundsWithoutConversion} fund(s) not converted`}
                  size="sm"
                  title="An issued amount whose fund has no actual payment date, or a date the FX master holds no rate for, has no USD conversion — which is not the same as zero. It is therefore in no total."
                />
              </>
            ) : null}
          </>
        );
      },
      sortValue: (o) => fundViewOf.get(o.id)!.usdAmount.amount,
      /*
       * Switchable from 15 September 2026. The instruction names eight columns and this is not
       * among them, so it becomes the one column a user can turn off — and it is kept rather
       * than deleted, because it is the only figure here that can be added across currencies.
       */
      optional: true,
    },
    {
      key: "paid",
      header: "Latest payment",
      /*
       * READ FROM THE FUNDS, like the totals beside it — 15 September 2026. A payment belongs
       * to a fund, so the latest payment on an order is the latest payment date among the
       * funds it carries. Where no fund names the order, the order's own lines still hold
       * dates and they are shown, labelled, rather than the column reading "none" for an
       * order that plainly paid something.
       */
      cell: (o) => {
        const v = fundViewOf.get(o.id)!;
        if (v.latestFundPaymentDate) return formatDate(v.latestFundPaymentDate);
        const t = purchaseOrderTotals(o);
        if (t.latestPaymentDate) {
          return (
            <>
              {formatDate(t.latestPaymentDate)}
              <br />
              <span className="xsmall muted">from the order's own line</span>
            </>
          );
        }
        return <StatusChip tone="warn" label="no payment recorded" size="sm" />;
      },
      sortValue: (o) =>
        fundViewOf.get(o.id)!.latestFundPaymentDate ?? purchaseOrderTotals(o).latestPaymentDate ?? "",
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

      <Banner tone="info" title="What Total price amount adds">
        <strong>Total price amount</strong> adds the <em>Price Amount</em> recorded on each purchase
        agreement beneath the order, per currency and never across them.{" "}
        <strong>Price Amount is the value of the whole agreement</strong>, not a price per tonne —
        settled by the business on 16 September 2026, the question having been left open by the
        instruction that added the field. So this column is a contract value and can be read as
        one. An agreement carrying no price contributes nothing rather than a zero, and the column
        says how many did so.
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
  /* What this order actually paid, read from the funds that carry its number — 15 Sep 2026. */
  const fundView = purchaseOrderFundTotals(o, agreementRows, funds.data ?? []);
  /* The agreements' own price amounts, for the price column and its total — 15 Sep 2026. */
  const priceView = purchaseOrderPriceTotals(o, agreementRows);
  /**
   * The funds this order paid, in one list — the attributed ones followed by any the
   * attribution could not place. They are one section of their own since 15 September 2026;
   * the attribution to an agreement survives only in the disagreement notice below.
   */
  const fundsOnOrder = [...fundView.rows.flatMap((r) => r.funds), ...fundView.unattached];
  /** Lines whose stored amount and matched funds part company — reported, never reconciled. */
  const disagreeingLines = fundView.rows
    .map((r, i) => ({
      id: o.lines[i]?.id ?? String(i),
      paRef: agreementById.get(r.purchaseAgreementId)?.paRef ?? r.purchaseAgreementId,
      lineAmount: r.lineAmount,
      fundAmounts: r.localAmounts,
      disagrees: r.disagrees,
    }))
    .filter((r) => r.disagrees);
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
                {
                  label: "Commodity",
                  value: o.commodityId ? (commodityById(o.commodityId)?.name ?? o.commodityId) : undefined,
                  hint: "The order's own commodity, captured on the Add screen. It narrows what that screen offers and constrains nothing about the agreements beneath the order. Blank on every order raised before 15 September 2026.",
                },
                {
                  label: "Supplier",
                  value: o.supplierId ? counterpartyName(o.supplierId) : undefined,
                  hint: "The agent the order is raised with — the same party a fund calls its agent.",
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
          value={formatMoney(fundView.usdAmount)}
          derivation={
            `${formatLocalTotals(fundView.localAmounts)} issued across ${fundView.fundsOnOrder} fund(s) naming this PO number, each converted at the rate in force on its own actual payment date` +
            (fundView.fundsWithoutIssued > 0
              ? `; ${fundView.fundsWithoutIssued} fund(s) carry no issued amount and are in no total`
              : "") +
            (fundView.fundsWithoutConversion > 0
              ? `; ${fundView.fundsWithoutConversion} fund(s) have no rate to convert at`
              : "")
          }
        />

        {/*
          TWO SECTIONS, NOT ONE — 15 September 2026, revised: *"separate the purchase agreement
          and funds when the PO is selected for viewing."*

          They answer different questions and were being read as one row: what this order covers,
          and what it paid. Splitting them also lets the agreement list carry the agreements' own
          columns — the price amount among them — instead of borrowing every column from the
          payment.
        */}
        <CollapsibleSection
          title={`Purchase agreement list — ${o.lines.length} agreement(s)`}
          defaultOpen
          indicator={
            <StatusChip
              tone={priceView.agreementsWithoutPrice > 0 ? "warn" : "ok"}
              label={
                priceView.agreementsWithoutPrice > 0
                  ? `${priceView.agreementsWithoutPrice} carry no price`
                  : "all priced"
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
                    The purchase agreements on this order, with the commodity, supplier, agreed
                    quantity and the price amount recorded on each
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Purchase agreement reference</th>
                      <th scope="col">Commodity and supplier</th>
                      <th scope="col" className="text-right">
                        Agreed quantity
                      </th>
                      <th scope="col" className="text-right">
                        Price amount
                      </th>
                      <th scope="col">Flow status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.lines.map((l) => {
                      const a = agreementById.get(l.purchaseAgreementId);
                      return (
                        <tr key={l.id}>
                          <th scope="row">
                            {a ? (
                              <Link className="mono" to={`/sourcing/agreements/${a.id}`}>
                                {a.paRef}
                              </Link>
                            ) : (
                              <span className="muted">
                                the agreement {l.purchaseAgreementId} is no longer held
                              </span>
                            )}
                          </th>
                          <td>
                            {a ? (
                              <>
                                {commodityById(a.commodityId)?.name ?? a.commodityId}
                                <br />
                                <span className="xsmall muted">{counterpartyName(a.supplierId)}</span>
                              </>
                            ) : (
                              <span className="muted">–</span>
                            )}
                          </td>
                          <td className="text-right">{a ? formatMt(a.totalQuantityMt) : "–"}</td>
                          {/* `Price amount`, added to this list on 15 September 2026. */}
                          <td className="text-right">
                            {a?.priceAmount ? (
                              <strong>{formatMoney(a.priceAmount)}</strong>
                            ) : (
                              <StatusChip tone="idle" label="no price recorded" size="sm" />
                            )}
                          </td>
                          <td>
                            {a ? (
                              <StatusChip
                                tone={toneFor(a.flowStatus)}
                                label={humanise(a.flowStatus)}
                                size="sm"
                              />
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">{formatNumber(totals.agreements)} agreement(s)</th>
                      <td />
                      <td />
                      <td className="text-right">
                        <strong>
                          {priceView.amounts.length > 0
                            ? formatLocalTotals(priceView.amounts)
                            : "—"}
                        </strong>
                      </td>
                      <td className="small muted">
                        {priceView.agreementsWithoutPrice > 0
                          ? `${formatNumber(priceView.agreementsWithoutPrice)} carry no price and are in no total`
                          : "every agreement carries a price"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="small muted" style={{ marginTop: "0.5rem" }}>
                <strong>Price amount is the agreement's own figure</strong>, added to the agreement
                screen on 15 September 2026, and it is totalled per currency and never across
                them. An agreement with no price is in no total rather than counted as zero —
                every agreement captured before that date has none.
              </p>
            </>
          )}
        </CollapsibleSection>

        {/*
          WHAT THE ORDER PAID — its own section since 15 September 2026.

          A fund is on this order when it carries the order's PO number. That is the link the
          payment flow writes; nothing else is asserted between a fund and an order, because the
          instruction states nothing else.
        */}
        <CollapsibleSection
          title={`Funds paid — ${fundView.fundsOnOrder} fund(s)`}
          defaultOpen
          indicator={
            <StatusChip
              tone={fundView.fundsWithoutIssued > 0 ? "warn" : "ok"}
              label={
                fundView.fundsWithoutIssued > 0
                  ? `${fundView.fundsWithoutIssued} carry no issued amount`
                  : "all issued"
              }
              size="sm"
            />
          }
          actions={
            <Link className="btn btn--sm" to={`/sourcing/procurement/${o.id}/edit`}>
              Record a payment
            </Link>
          }
        >
          {fundsOnOrder.length === 0 ? (
            <EmptyState title="No fund names this PO number" glyph="○">
              A payment is recorded against a fund, from the{" "}
              <Link to={`/sourcing/procurement/${o.id}/edit`}>Edit screen</Link>. Until one is,
              this order has no payment of its own.
            </EmptyState>
          ) : (
            <>
              {disagreeingLines.length > 0 ? (
                <Banner tone="warn" title="The order's own lines and these funds disagree">
                  {disagreeingLines.map((d) => (
                    <p key={d.id} className="small">
                      <span className="mono">{d.paRef}</span> — the line carries{" "}
                      {d.lineAmount ? formatMoney(d.lineAmount) : "no amount"} and the fund(s)
                      matched to it carry{" "}
                      {d.fundAmounts.length > 0 ? formatLocalTotals(d.fundAmounts) : "nothing"}.
                      Neither figure is derived from the other, so both are shown rather than one
                      being chosen.
                    </p>
                  ))}
                </Banner>
              ) : null}

              <div className="dtable__scroll">
                <table className="dtable__table">
                  <caption className="sr-only">
                    The funds carrying this order's PO number, with the value requested, the issued
                    payment amount, its read-only USD conversion and the actual payment date
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Fund</th>
                      <th scope="col">Agent and commodity</th>
                      <th scope="col">Season</th>
                      <th scope="col" className="text-right">
                        Value requested
                      </th>
                      <th scope="col" className="text-right">
                        Issued payment amount
                      </th>
                      <th scope="col" className="text-right">
                        USD conversion
                      </th>
                      <th scope="col">Actual payment date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundsOnOrder.map((f) => {
                      const rate = exchangeRateOn(f.localCurrency, f.actualPaymentDate);
                      const usd =
                        f.issuedPaymentLocal !== undefined && rate
                          ? money(round(f.issuedPaymentLocal / rate.perUsd, 2), "USD")
                          : undefined;
                      return (
                        <tr key={f.id}>
                          <th scope="row">
                            <Link className="mono" to={`/sourcing/funds/${f.id}/edit`}>
                              {f.fundRef}
                            </Link>
                          </th>
                          <td>
                            {counterpartyName(f.agentId)}
                            <br />
                            <span className="xsmall muted">
                              {commodityById(f.commodityId)?.name ?? f.commodityId}
                            </span>
                          </td>
                          <td>{f.seasonality}</td>
                          <td className="text-right">
                            {formatNumber(f.valueLocal)}{" "}
                            <span className="xsmall muted">{f.localCurrency}</span>
                          </td>
                          <td className="text-right">
                            {f.issuedPaymentLocal === undefined ? (
                              <StatusChip tone="warn" label="no payment issued" size="sm" />
                            ) : (
                              <strong>
                                {formatNumber(f.issuedPaymentLocal)}{" "}
                                <span className="xsmall muted">{f.localCurrency}</span>
                              </strong>
                            )}
                          </td>
                          <td className="text-right">
                            {usd ? (
                              <strong>{formatMoney(usd)}</strong>
                            ) : (
                              <span className="muted">
                                {f.issuedPaymentLocal === undefined
                                  ? "–"
                                  : "no rate applies, so no conversion"}
                              </span>
                            )}
                          </td>
                          <td>
                            {f.actualPaymentDate ? (
                              formatDate(f.actualPaymentDate)
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
                      <th scope="row">{formatNumber(fundView.fundsOnOrder)} fund(s)</th>
                      <td />
                      <td />
                      <td className="text-right">
                        <strong>{formatLocalTotals(fundView.fundValueLocal)}</strong>
                      </td>
                      <td className="text-right">
                        <strong>{formatLocalTotals(fundView.localAmounts)}</strong>
                      </td>
                      <td className="text-right">
                        <strong>{formatMoney(fundView.usdAmount)}</strong>
                      </td>
                      <td className="small muted">
                        {fundView.fundsWithoutConversion > 0
                          ? `${fundView.fundsWithoutConversion} fund(s) have no rate to convert at`
                          : "every issued amount is converted"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="small muted" style={{ marginTop: "0.5rem" }}>
                <strong>The USD conversion is read only, per fund.</strong> Each is the issued
                amount divided by the rate in force on <em>that fund's</em> actual payment date, so
                two payments under one order that fall in different months convert at different
                rates — which is why the total is the sum of the conversions and not the sum of the
                amounts converted once. A fund with an amount and no payment date has no rate, so
                it has no conversion and is in no total; that is different from a conversion of
                zero, and the footer says how many those are.
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
  /**
   * The line's own payment amount and date. NOT COLLECTED FROM 15 SEPTEMBER 2026 — the payment
   * is recorded against the fund instead, and one payment has one home. They are still hydrated
   * from the record and written straight back, so a captured order keeps the figures it has and
   * the list, the view screen and the USD totals go on reading them.
   */
  amount: string;
  currency: CurrencyCode;
  actualPaymentDate: string;
}

/** The payment being entered against one fund, from the purchase order. */
interface DraftFundPayment {
  issued: string;
  actualPaymentDate: string;
  slip: string;
}

export function PurchaseOrderForm({ mode }: { mode: "create" | "edit" }) {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const agreements = useAsync(() => api.listPurchaseAgreements());
  /* The funds the ticked agreements draw on — 15 September 2026. */
  const funds = useAsync(() => api.listFunds());
  const order = useAsync(
    () => (mode === "edit" ? api.getPurchaseOrder(id) : Promise.resolve(undefined)),
    [id, mode],
  );
  const existing = mode === "edit" ? order.data : undefined;

  const [poNumber, setPoNumber] = useState("");
  /**
   * The order's own commodity and supplier — 15 September 2026.
   *
   * *"Aside from existing PO Number add the fields commodities (dropdown), supplier dropdown
   * list."* They are the order's scope and they narrow the agreement list and the fund list
   * beneath them. Neither is required: an order raised before the header is answered is a real
   * state, and the two lists then behave exactly as they did yesterday.
   */
  const [commodityId, setCommodityId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<DraftPoLine[]>([]);
  const [note, setNote] = useState("");
  /**
   * The payment being recorded against each fund, keyed by fund id — 15 September 2026.
   *
   * Held here and not on the line, because a payment belongs to a fund and an agreement may
   * draw on more than one: the seeded gum hashab agreement has no fund at all, and two captured
   * funds share purchase order 45643123. A line-shaped state would have had to pick one.
   */
  const [fundPay, setFundPay] = useState<Record<string, DraftFundPayment>>({});
  /** The funds the team has selected to pay from this order. */
  const [paying, setPaying] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(mode === "create");

  useEffect(() => {
    if (mode !== "edit" || !existing || hydrated) return;
    setPoNumber(existing.poNumber);
    setCommodityId(existing.commodityId ?? "");
    setSupplierId(existing.supplierId ?? "");
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

  /*
   * The fund payments hydrate from the funds themselves rather than from the order, because
   * that is where they live. Runs once the funds have arrived and only for funds not already
   * in draft state, so typing is never overwritten by a re-fetch — `useAsync` re-runs on every
   * store mutation.
   */
  const fundRows = funds.data ?? [];
  useEffect(() => {
    if (fundRows.length === 0) return;
    setFundPay((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const f of fundRows) {
        if (next[f.id]) continue;
        next[f.id] = {
          issued: f.issuedPaymentLocal === undefined ? "" : String(f.issuedPaymentLocal),
          actualPaymentDate: f.actualPaymentDate ?? "",
          slip: f.paymentSlipName ?? "",
        };
        changed = true;
      }
      return changed ? next : prev;
    });
    /* A fund already stamped with this order's number is one this order pays, so it arrives
       selected. Nothing else is: the selection is the team's. */
    const poNow = mode === "edit" ? (existing?.poNumber ?? "") : "";
    if (poNow) {
      setPaying((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const f of fundRows) {
          if (f.purchaseOrderNo === poNow && !next.has(f.id)) {
            next.add(f.id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  }, [fundRows, mode, existing]);

  const agreementRows = agreements.data ?? [];
  const agreementById = new Map(agreementRows.map((a) => [a.id, a]));
  const chosen = new Set(lines.map((l) => l.purchaseAgreementId).filter(Boolean));

  /**
   * The commodity and supplier drop-downs are built from the agreements actually held, not
   * from the whole master — 15 September 2026.
   *
   * Their only job is to narrow the list below, so an option behind which there is no agreement
   * narrows it to nothing and tells the user only that they chose badly. Derived from the
   * scoped agreement list, so a Sudan session offers Sudan's commodities and Sudan's suppliers.
   */
  const commodityOptions = Array.from(new Set(agreementRows.map((a) => a.commodityId)))
    .map((cid) => ({ value: cid, label: commodityById(cid)?.name ?? cid }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const supplierOptions = Array.from(new Set(agreementRows.map((a) => a.supplierId)))
    .map((sid) => ({ value: sid, label: counterpartyName(sid) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const orderScope = { commodityId: commodityId || undefined, supplierId: supplierId || undefined };
  /** The agreements the tick list shows: those in scope, plus anything already ticked. */
  const offeredAgreements = agreementsOfferedOnOrder(agreementRows, orderScope, chosen);
  const narrowedAgreements = agreementRows.length - offeredAgreements.length;

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

  /**
   * Ticking a fund is what makes it payable — 15 September 2026.
   *
   * *"The procurement team will select the fund that they will add payment and issued date."*
   * So the payment inputs belong to the selection, not to the match: an unselected fund is
   * shown as it stands and cannot be typed into, and selecting one is a deliberate act.
   */
  function togglePaying(fund: Fund) {
    const wasOn = paying.has(fund.id);
    setPaying((prev) => {
      const next = new Set(prev);
      if (wasOn) next.delete(fund.id);
      else next.add(fund.id);
      return next;
    });
    /*
     * THE ISSUED AMOUNT ARRIVES FILLED IN — 15 September 2026.
     *
     * *"The Issued Payment Amount field will inherit automatically the value of the value
     * requested once selected and can be modified as well."* So ticking a fund copies its
     * requested value into the amount, and the field stays a plain input: the whole of the
     * instruction's "and can be modified as well" is that nothing here locks it.
     *
     * Only into an empty field. A fund that already carries an issued amount, or one the team
     * has typed into and un-ticked by accident, keeps what it has — an inheritance that
     * overwrote a typed figure would be a default destroying an answer, which is the defect
     * this register calls A6.
     */
    if (wasOn) return;
    setFundPay((prev) => {
      const d = prev[fund.id];
      if (d && d.issued.trim()) return prev;
      return {
        ...prev,
        [fund.id]: {
          issued: String(fund.valueLocal),
          actualPaymentDate: d?.actualPaymentDate ?? fund.actualPaymentDate ?? "",
          slip: d?.slip ?? fund.paymentSlipName ?? "",
        },
      };
    });
  }

  function setFundPayment(fundId: string, patch: Partial<DraftFundPayment>) {
    setFundPay((prev) => ({
      ...prev,
      [fundId]: { ...(prev[fundId] ?? { issued: "", actualPaymentDate: "", slip: "" }), ...patch },
    }));
  }

  /**
   * The funds this order could pay — read from the header, not from the agreements.
   *
   * REVISED 15 SEPTEMBER 2026: *"the funds should no longer [be] dependent [on] the selected
   * purchase agreement. Funds will automatically populate according to the selected commodity
   * and supplier."* So there is one list on this screen instead of one table per ticked
   * agreement, and it is populated before any agreement is ticked at all.
   */
  const fundScope = {
    ...orderScope,
    poNumber: mode === "edit" ? (existing?.poNumber ?? poNumber) : poNumber,
    keepFundIds: paying,
  };
  const offeredFunds = fundsForOrderScope(fundRows, fundScope);
  /** Funds the header matches but that are already paid from somewhere — for saying so. */
  const fundsHiddenAsIssued = fundRows.filter(
    (f) =>
      fundIsIssued(f) &&
      !paying.has(f.id) &&
      f.purchaseOrderNo !== fundScope.poNumber.trim() &&
      (!commodityId || f.commodityId === commodityId) &&
      (!supplierId || f.agentId === supplierId),
  ).length;

  const payableFunds = offeredFunds.filter((f) => paying.has(f.id));

  /** The entries the save will send — only selected funds that carry something to record. */
  const fundPaymentEntries = payableFunds
    .map((f) => {
      const d = fundPay[f.id];
      if (!d) return undefined;
      const issued = parseNumber(d.issued);
      const entry = {
        fundId: f.id,
        issuedPaymentLocal: issued,
        actualPaymentDate: d.actualPaymentDate || undefined,
        paymentSlipName: d.slip.trim() || undefined,
      };
      /* Unchanged from the record means nothing to send. */
      const same =
        entry.issuedPaymentLocal === f.issuedPaymentLocal &&
        entry.actualPaymentDate === f.actualPaymentDate &&
        entry.paymentSlipName === f.paymentSlipName &&
        f.purchaseOrderNo === poNumber.trim();
      return same ? undefined : entry;
    })
    .filter((e): e is NonNullable<typeof e> => e !== undefined);

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
    /* The fund payment, checked where it is now entered. The amount-above-zero rule and the
       rate-coverage message came off the fund's own screen on 15 September when that card went
       read-only: a rule belongs with the field. */
    for (const f of payableFunds) {
      const d = fundPay[f.id];
      if (!d) continue;
      const issued = parseNumber(d.issued);
      if (d.issued.trim() && issued === undefined) {
        next[`po-fund-amt-${f.id}`] = `The issued payment amount on ${f.fundRef} is not a number.`;
      } else if (issued !== undefined && issued <= 0) {
        next[`po-fund-amt-${f.id}`] = `The issued payment amount on ${f.fundRef} must be above zero.`;
      }
      if (d.actualPaymentDate && !exchangeRateOn(f.localCurrency, d.actualPaymentDate)) {
        next[`po-fund-date-${f.id}`] =
          `No exchange rate is held for ${f.localCurrency} on ${formatDate(d.actualPaymentDate)}, so ${f.fundRef} has no value in USD. ` +
          `The rate table runs from ${formatDate(fxCoverage(f.localCurrency).from)}.`;
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
            commodityId: commodityId || undefined,
            supplierId: supplierId || undefined,
            lines: savedLines,
            createdBy: user?.username ?? "unknown",
            note: note.trim() || undefined,
          })
        : await api.updatePurchaseOrder(id, {
            poNumber: poNumber.trim(),
            commodityId: commodityId || undefined,
            supplierId: supplierId || undefined,
            lines: savedLines,
            note: note.trim() || undefined,
            updatedBy: user?.username ?? "unknown",
          });
    if (!res.ok) {
      setSaving(false);
      setRefusal(res.reason);
      toast.push("risk", res.reason);
      return;
    }

    /*
     * The fund payments, applied after the order is saved because a new order has no PO number
     * until then — and the PO number is one of the four things a payment writes onto the fund.
     *
     * A SECOND CALL, AND SAID SO IF IT FAILS. The funds are written all-or-none inside
     * `recordFundPayments`, so they cannot half-apply between themselves; but the order is
     * already saved by the time it runs. If it is refused, the order stands and the message says
     * exactly that, rather than implying the whole save came back.
     */
    if (fundPaymentEntries.length > 0) {
      const paid = await api.recordFundPayments(res.value.poNumber, fundPaymentEntries, {
        updatedBy: user?.username ?? "unknown",
      });
      setSaving(false);
      if (!paid.ok) {
        setRefusal(
          `${res.value.poNumber} was saved, but the fund payment was refused and nothing was recorded against any fund: ${paid.reason}`,
        );
        toast.push("risk", paid.reason);
        return;
      }
      toast.push(
        "ok",
        `${paid.value.length} fund payment(s) recorded against ${res.value.poNumber}.`,
      );
    } else {
      setSaving(false);
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

  const summary = errorList(errors).filter(
    (e) => !e.field.startsWith("po-date-") && !e.field.startsWith("po-fund-date-"),
  );
  const advisories = errorList(errors).filter((e) => e.field.startsWith("po-date-"));
  /*
   * The fund's missing-rate message is NOT an advisory, unlike the order line's. The service
   * layer refuses a fund whose payment date has no rate behind it — `checkFund` has said so
   * since the fund screen owned these fields — so the save is stopped here rather than allowed
   * through to a refusal the user cannot see coming.
   */
  const fundAdvisories = errorList(errors).filter((e) => e.field.startsWith("po-fund-date-"));
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

          <CollapsibleSection title="PO number, commodity and supplier" defaultOpen>
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

              {/*
                COMMODITY AND SUPPLIER — 15 September 2026. They narrow the two lists below and
                are saved on the order. Neither is required: an order raised before they are
                answered offers everything, which is what this screen did yesterday.
              */}
              <FormRow
                label="Commodity"
                htmlFor="po-commodity"
                hint="Narrows the purchase agreement list and the fund list below. Offering the commodities that agreements are actually held for, so no choice narrows the list to nothing."
              >
                <SelectInput
                  id="po-commodity"
                  value={commodityId}
                  onChange={setCommodityId}
                  options={commodityOptions}
                  placeholder="Any commodity"
                />
              </FormRow>

              <FormRow
                label="Supplier"
                htmlFor="po-supplier"
                hint="The agent the order is raised with. Narrows both lists below in the same way; a fund calls the same party its agent."
              >
                <SelectInput
                  id="po-supplier"
                  value={supplierId}
                  onChange={setSupplierId}
                  options={supplierOptions}
                  placeholder="Any supplier"
                />
              </FormRow>
            </div>

            <p className="small muted" style={{ marginTop: "0.5rem" }}>
              <strong>They decide what is offered, not what is allowed.</strong> An agreement
              already ticked stays ticked and stays visible when the header changes, and the
              service layer refuses nothing on their account — no source says the agreements
              beneath one order must share a commodity or a supplier, and a captured order exists
              whose agreements do not.
            </p>
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
            ) : offeredAgreements.length === 0 ? (
              <EmptyState title="No agreement matches the commodity and supplier chosen" glyph="○">
                {formatNumber(agreementRows.length)} agreement(s) are held, and none is for{" "}
                {commodityId ? (commodityById(commodityId)?.name ?? commodityId) : "any commodity"}
                {supplierId ? ` with ${counterpartyName(supplierId)}` : ""}. Change the header
                above, or <Link to="/sourcing/agreements/new">create the agreement</Link>.
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
                      {/* `Price amount`, added to this list on 15 September 2026 — the same
                          column the view screen carries, so the two read alike. */}
                      <th scope="col" className="text-right">
                        Price amount
                      </th>
                      <th scope="col">Flow status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offeredAgreements.map((a) => {
                      const outOfScope =
                        (commodityId && a.commodityId !== commodityId) ||
                        (supplierId && a.supplierId !== supplierId);
                      return (
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
                          {outOfScope ? (
                            <>
                              <br />
                              <span className="xsmall" style={{ color: "var(--tone-warn)" }}>
                                outside the header's commodity or supplier
                              </span>
                            </>
                          ) : null}
                        </th>
                        <td>
                          {commodityById(a.commodityId)?.name ?? a.commodityId}
                          <br />
                          <span className="xsmall muted">{counterpartyName(a.supplierId)}</span>
                        </td>
                        <td className="text-right">{formatMt(a.totalQuantityMt)}</td>
                        <td className="text-right">
                          {a.priceAmount ? (
                            formatMoney(a.priceAmount)
                          ) : (
                            <span className="muted small">no price recorded</span>
                          )}
                        </td>
                        <td>
                          <StatusChip tone={toneFor(a.flowStatus)} label={humanise(a.flowStatus)} size="sm" />
                        </td>
                      </tr>
                      );
                    })}
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

            {narrowedAgreements > 0 ? (
              <p className="small muted">
                <strong>
                  {formatNumber(narrowedAgreements)} agreement(s) are not shown
                </strong>{" "}
                because the commodity or the supplier above does not match them. Clear either
                field to see them again — nothing is hidden that has been ticked.
              </p>
            ) : null}
          </CollapsibleSection>

          {/*
            THE FUNDS THE TICKED AGREEMENTS DRAW ON — 15 September 2026.

            *"Once the purchase agreement is check, list down the fund related to this purchase
            agreement and season. From this screen we could issue the issued payment, actual
            payment date, payment slip — the one we made readonly in the fund screen."*

            This section replaces the per-agreement payment inputs that stood here. The payment
            was never the order's to hold: `COTS_MMS_Processes_Steps_v2.6.xlsx` left the question
            open at row 6.5 — whether the payment on the order is the same payment the fund
            records — and it is. It is recorded once, against the fund, from here.

            On BOTH screens. An order is often raised before the payment is made, so the Edit
            screen is where most payments will be entered; but a payment made the day the order
            is raised should not have to wait for a second visit.
          */}
          {/*
            THE FUNDS THIS ORDER COULD PAY — 15 September 2026, revised the same day.

            *"The funds should no longer [be] dependent [on] the selected purchase agreement.
            Funds will automatically populate according to the selected commodity and supplier."*

            One list, driven by the header above and not by the tick list. A fund is raised for
            an agent and a commodity; which agreements it ends up covering is settled afterwards,
            so the payment does not have to wait for an agreement to be ticked.
          */}
          <CollapsibleSection
            title={`Funds — ${payableFunds.length} selected for payment`}
            defaultOpen
          >
            <Banner tone="info" title="Select the fund this order pays">
              Every fund matching the <strong>commodity and supplier above</strong> is offered —
              the agreements ticked below have no part in this list. Only funds that have{" "}
              <strong>not yet had an amount issued</strong> appear, because a fund carrying an
              issued amount has been paid from somewhere and offering it again is how one payment
              is recorded twice.
              {fundsHiddenAsIssued > 0 ? (
                <>
                  {" "}
                  <strong>
                    {formatNumber(fundsHiddenAsIssued)} fund(s) are held back on that count.
                  </strong>
                </>
              ) : null}{" "}
              Funds this order has already paid stay on the list, so a figure entered here can be
              corrected here. <strong>Ticking a fund fills in its issued amount</strong> with the
              value requested on it, and the field stays editable; an amount already typed is
              never overwritten. Saving writes the PO number onto each fund it pays.
            </Banner>

            {fundAdvisories.length > 0 ? (
              <Banner tone="risk" title="These payment dates have no exchange rate behind them">
                {fundAdvisories.map((a) => (
                  <p key={a.field} className="small">
                    {a.message}
                  </p>
                ))}
              </Banner>
            ) : null}

            {offeredFunds.length === 0 ? (
              <EmptyState title="No fund is offered" glyph="○">
                {commodityId || supplierId
                  ? "No unpaid fund matches the commodity and supplier above. Clear either field, or "
                  : "Every fund held has already had an amount issued against it. "}
                <Link to="/sourcing/budgets">raise a fund from a budget</Link> if one is needed.
              </EmptyState>
            ) : (
              <div className="dtable__scroll">
                <table className="dtable__table">
                  <caption className="sr-only">
                    The funds matching this order's commodity and supplier, with a tick box to pay
                    from one and the issued payment amount, actual payment date and payment slip
                    recorded against it
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Pay from</th>
                      <th scope="col">Fund</th>
                      <th scope="col">Agent and commodity</th>
                      <th scope="col">Season</th>
                      <th scope="col" className="text-right">
                        Value requested
                      </th>
                      <th scope="col">Issued payment amount</th>
                      <th scope="col" className="text-right">
                        USD
                      </th>
                      <th scope="col">Actual payment date</th>
                      <th scope="col">Payment slip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offeredFunds.map((f) => {
                      const on = paying.has(f.id);
                      const d = fundPay[f.id] ?? { issued: "", actualPaymentDate: "", slip: "" };
                      const issued = parseNumber(d.issued);
                      const rate = exchangeRateOn(f.localCurrency, d.actualPaymentDate || undefined);
                      const usd =
                        issued !== undefined && rate
                          ? money(round(issued / rate.perUsd, 2), "USD")
                          : undefined;
                      const otherPo =
                        f.purchaseOrderNo && f.purchaseOrderNo !== poNumber.trim()
                          ? f.purchaseOrderNo
                          : undefined;
                      return (
                        <tr key={f.id}>
                          <td>
                            <input
                              type="checkbox"
                              id={`po-fund-pick-${f.id}`}
                              checked={on}
                              onChange={() => togglePaying(f)}
                            />{" "}
                            <label htmlFor={`po-fund-pick-${f.id}`} className="sr-only">
                              Pay fund {f.fundRef} from this order
                            </label>
                          </td>
                          <th scope="row" className="mono">
                            {f.fundRef}
                            {otherPo ? (
                              <>
                                <br />
                                <span className="xsmall" style={{ color: "var(--tone-warn)" }}>
                                  already on PO {otherPo}
                                </span>
                              </>
                            ) : null}
                          </th>
                          <td>
                            {counterpartyName(f.agentId)}
                            <br />
                            <span className="xsmall muted">
                              {commodityById(f.commodityId)?.name ?? f.commodityId}
                            </span>
                          </td>
                          <td>{f.seasonality}</td>
                          <td className="text-right">
                            {formatNumber(f.valueLocal)}{" "}
                            <span className="xsmall muted">{f.localCurrency}</span>
                          </td>
                          <td>
                            {on ? (
                              <TextInput
                                id={`po-fund-amt-${f.id}`}
                                value={d.issued}
                                onChange={(v) => setFundPayment(f.id, { issued: v })}
                                error={errors[`po-fund-amt-${f.id}`]}
                                inputMode="decimal"
                                placeholder="–"
                              />
                            ) : (
                              <span className="muted small">
                                {f.issuedPaymentLocal === undefined
                                  ? "–"
                                  : formatNumber(f.issuedPaymentLocal)}
                              </span>
                            )}
                          </td>
                          <td className="text-right">
                            {on && usd ? formatMoney(usd) : <span className="muted">–</span>}
                          </td>
                          <td>
                            {on ? (
                              <TextInput
                                id={`po-fund-date-${f.id}`}
                                type="date"
                                value={d.actualPaymentDate}
                                onChange={(v) => setFundPayment(f.id, { actualPaymentDate: v })}
                                error={errors[`po-fund-date-${f.id}`]}
                              />
                            ) : (
                              <span className="muted small">
                                {f.actualPaymentDate ? formatDate(f.actualPaymentDate) : "–"}
                              </span>
                            )}
                          </td>
                          <td>
                            {on ? (
                              <TextInput
                                id={`po-fund-slip-${f.id}`}
                                value={d.slip}
                                onChange={(v) => setFundPayment(f.id, { slip: v })}
                                placeholder="e.g. payment-slip-1123.pdf"
                              />
                            ) : (
                              <span className="muted small">{f.paymentSlipName ?? "–"}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="small muted" style={{ marginTop: "0.5rem" }}>
              <strong>The season is shown, not filtered.</strong> It used to come from the ticked
              agreement, and there is no longer an agreement in this join — so each fund's own
              season is on its row and a fund raised for another year is visible rather than
              quietly offered as though it were not.{" "}
              <strong>The USD conversion is read, never typed</strong>: the issued amount divided
              by the rate in force for that fund's currency on its own payment date. A payment date
              the rate table cannot reach is refused, here and in the service layer, because a fund
              paid on a date with no rate has no value in USD.
            </p>
          </CollapsibleSection>

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
