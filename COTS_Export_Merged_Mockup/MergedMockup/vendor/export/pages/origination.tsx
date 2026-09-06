/**
 * Origination — workflow v2.0 Phase 01 (Opportunity and commercial assessment) and
 * Phase 02 (Deal agreement).
 *
 * v2.0 §16.1 records these two phases as the ones with no screen in the prototype.
 * This file is that screen, and everything on it traces to §6.1 and §6.2:
 *
 *  · The trigger is a trader identifying a selling opportunity, or a long position
 *    becoming visible in the long and short position report [AS-IS]. That report is
 *    the second route in and is derived here from open contracts and stock
 *    (`positionReport`), never stored.
 *  · The cost estimate is [AS-IS] as a practice and [PROPOSED] as a COTS module. The
 *    costing elements configured per country are [PROPOSED] and, per §14.1, have not
 *    been provided, so no element library is offered: the trader revises the lines
 *    that already exist on the snapshot and enters anything calculated outside the
 *    system under other costs (§6.1 activity 4).
 *  · The estimated cost per MT is the raw material price plus every per-MT line.
 *    Per-day and per-bag lines are shown and deliberately NOT converted: the source
 *    says only that "some expenses are per MT, others per day or per bag" and gives
 *    no conversion. That non-inference is stated on the screen, not hidden here.
 *  · The two blocking controls of §6.1 are [PROPOSED] and live in the service layer
 *    (`guardDealAgreement`): a deal cannot be agreed without a costing snapshot, and
 *    a short declaration requires the expected raw purchase price.
 *  · Phase 02 passes twelve named items to Dubai Execution, in full. They are
 *    labelled here exactly as §6.2 lists them. The channel is an [ASSUMPTION] —
 *    e-mail — because the workshop notes say the deal is "communicated" and name no
 *    system.
 *
 * Deliberately absent:
 *  · Any status. §6.1 and §6.2 both record that no status model is defined [OPEN], so
 *    the stage chip is derived from which artefacts exist and is labelled as derived.
 *  · Any approval step. Whether an offer needs review or approval before a deal is
 *    agreed, and to what authority limit, is open in both sources.
 *  · Any create action. The store has no `createOpportunity` mutator, so
 *    `OpportunityForm` validates and previews and says plainly that it does not save.
 *  · Any target or duration. Decision D-18 asks whether the phases before the
 *    document chain need targets at all; none is invented here.
 */

import { useState } from "react";
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
import { DataTable, type Column } from "../components/table";
import {
  COMMODITIES,
  COUNTERPARTIES,
  PORTS,
  commodityById,
  counterpartyName,
  portName,
} from "../data/master";
import { TODAY, formatDate, formatMoney, formatMt, money, round, safeNumber, sum } from "../domain/calc";
import { positionReport } from "../domain/sourcing";
import { guardDealAgreement, humanise, toneFor } from "../domain/status";
import type {
  Contract,
  CostingBasis,
  CostingLine,
  CountryUnit,
  CurrencyCode,
  DealTerms,
  Incoterm,
  Money,
  Opportunity,
  OpportunityCosting,
  OpportunityStage,
  PositionLine,
  StockPosition,
} from "../domain/types";
import { COUNTRY_ORDER, countryName } from "../domain/variants";
import { OPEN_DECISIONS } from "../domain/workflow";
import { api } from "../services/store";
import { useAsync } from "./hooks";

/* ------------------------------------------------------------------ *
 * Local constants and derivations
 * ------------------------------------------------------------------ */

const INCOTERMS: Incoterm[] = ["CNF", "CIF", "FOB", "FCA", "EXW", "DAP"];

/** v2.0 §6.1: "applied per MT, per day or per bag". */
const BASIS_LABEL: Record<CostingBasis, string> = {
  per_mt: "per MT",
  per_day: "per day",
  per_bag: "per bag",
};

const BASES: CostingBasis[] = ["per_mt", "per_day", "per_bag"];

const SOURCE_LABEL: Record<CostingLine["source"], string> = {
  master: "configured costing element",
  other: "other costs — entered by the trader",
};

const POSITIONS: StockPosition[] = ["long", "short"];

/**
 * §6.1 and §6.2 define no status model for an opportunity, so this is presence-derived:
 * it reads which artefacts exist and is never stored or typed on the record.
 */
function stageOf(o: Opportunity): OpportunityStage {
  if (o.lapsedOn) return "lapsed";
  if (o.contractId) return "contracted";
  if (o.dealAgreedOn) return "deal_agreed";
  if (o.costing) return "costed";
  return "identified";
}

interface CostingDerivation {
  currency: CurrencyCode;
  perMt: CostingLine[];
  perDay: CostingLine[];
  perBag: CostingLine[];
  /** Per-MT lines in another currency, which are left out rather than converted. */
  otherCurrency: CostingLine[];
  salesCurrencyDiffers: boolean;
  estimatedCostPerMt: Money;
  marginPerMt: Money;
  /** Undefined where the sales price is zero, because the percentage is of the sales price. */
  marginPct?: number;
}

/**
 * Estimated cost per MT = raw material price + every per-MT line. Per-day and per-bag
 * lines are returned separately and are not folded in: the source gives no conversion
 * from a day or a bag to a tonne, so none is applied.
 */
function costingDerivation(c: OpportunityCosting): CostingDerivation {
  const currency = c.rawMaterialPricePerMt.currency;
  const ofBasis = (b: CostingBasis) => c.lines.filter((l) => l.basis === b);
  const perMt = ofBasis("per_mt");
  const included = perMt.filter((l) => l.amount.currency === currency);
  const estimated = round(c.rawMaterialPricePerMt.amount + sum(included.map((l) => l.amount.amount)), 2);
  const sales = c.salesPricePerMt.amount;
  return {
    currency,
    perMt,
    perDay: ofBasis("per_day"),
    perBag: ofBasis("per_bag"),
    otherCurrency: perMt.filter((l) => l.amount.currency !== currency),
    salesCurrencyDiffers: c.salesPricePerMt.currency !== currency,
    estimatedCostPerMt: money(estimated, currency),
    marginPerMt: money(round(sales - estimated, 2), currency),
    marginPct: sales > 0 ? round(((sales - estimated) / sales) * 100, 1) : undefined,
  };
}

function marginLabel(o: Opportunity): string {
  if (!o.costing) return "not costed";
  const d = costingDerivation(o.costing);
  return d.marginPct === undefined ? "no sales price" : `${d.marginPct.toFixed(1)}%`;
}

const NOT_INFERRED_PER_DAY_PER_BAG =
  'Per-day and per-bag lines are listed but are not included in the estimated cost per MT. The source states only that "some expenses are per MT, others per day or per bag" and gives no conversion from a day or a bag to a tonne, so none is applied here.';

/* ================================================================== *
 * OpportunityList — /origination
 * ================================================================== */

export function OpportunityList() {
  const opportunities = useAsync(() => api.listOpportunities());
  const contracts = useAsync(() => api.listContracts());

  if (opportunities.error) {
    return (
      <div className="page">
        <ErrorState detail={opportunities.error} onRetry={opportunities.reload} />
      </div>
    );
  }

  const rows = opportunities.data ?? [];
  const cts = contracts.data ?? [];
  const contractOf = (id?: string): Contract | undefined => cts.find((c) => c.id === id);

  const columns: Column<Opportunity>[] = [
    {
      key: "no",
      header: "Opportunity",
      cell: (o) => <Link to={`/origination/${o.id}`}>{o.opportunityNo}</Link>,
      sortValue: (o) => o.opportunityNo,
    },
    {
      key: "commodity",
      header: "Commodity",
      cell: (o) => commodityById(o.commodityId)?.name ?? o.commodityId,
      sortValue: (o) => commodityById(o.commodityId)?.name ?? o.commodityId,
    },
    {
      key: "origin",
      header: "Origin",
      cell: (o) => countryName(o.origin),
      sortValue: (o) => countryName(o.origin),
      filterOptions: COUNTRY_ORDER.map((c) => ({ value: c, label: countryName(c) })),
      filterMatch: (o, v) => o.origin === v,
    },
    {
      key: "buyer",
      header: "Buyer",
      cell: (o) => (o.buyerId ? counterpartyName(o.buyerId) : <span className="muted">not yet named</span>),
      sortValue: (o) => (o.buyerId ? counterpartyName(o.buyerId) : ""),
    },
    {
      key: "qty",
      header: "Indicative quantity",
      align: "right",
      cell: (o) => formatMt(o.indicativeQuantityMt),
      sortValue: (o) => o.indicativeQuantityMt,
    },
    {
      key: "position",
      header: "Position declared",
      cell: (o) =>
        o.costing ? (
          <StatusChip tone={toneFor(o.costing.position)} label={humanise(o.costing.position)} size="sm" />
        ) : (
          <span className="muted">not declared</span>
        ),
      sortValue: (o) => o.costing?.position ?? "",
      filterOptions: POSITIONS.map((p) => ({ value: p, label: humanise(p) })),
      filterMatch: (o, v) => o.costing?.position === v,
    },
    {
      key: "margin",
      header: "Margin",
      align: "right",
      cell: (o) => <span className={o.costing ? undefined : "muted"}>{marginLabel(o)}</span>,
      sortValue: (o) => (o.costing ? (costingDerivation(o.costing).marginPct ?? 0) : -9999),
    },
    {
      key: "stage",
      header: "Stage (derived)",
      cell: (o) => <StatusChip tone={toneFor(stageOf(o))} label={humanise(stageOf(o))} size="sm" />,
      sortValue: (o) => stageOf(o),
      filterOptions: [...new Set(rows.map(stageOf))].map((s) => ({ value: s, label: humanise(s) })),
      filterMatch: (o, v) => stageOf(o) === v,
    },
    {
      key: "agreed",
      header: "Deal agreed",
      cell: (o) => formatDate(o.dealAgreedOn),
      sortValue: (o) => o.dealAgreedOn ?? "",
    },
    {
      key: "contract",
      header: "Contract raised",
      cell: (o) => {
        const c = contractOf(o.contractId);
        if (!o.contractId) return <span className="muted">–</span>;
        return <Link to={`/contracts/${o.contractId}`}>{c?.contractNo ?? o.contractId}</Link>;
      },
      sortValue: (o) => contractOf(o.contractId)?.contractNo ?? "",
      optional: true,
    },
    {
      key: "trader",
      header: "Trader",
      cell: (o) => o.traderName,
      sortValue: (o) => o.traderName,
      optional: true,
    },
  ];

  return (
    <>
      <PageHeader
        moduleLabel="Origination & deals"
        crumbs={[{ label: "Home", to: "/" }, { label: "Origination" }]}
        title="Opportunities"
        meta="Phases 01 and 02 — the opportunity, the cost estimate, the declared position and the hand-off to Dubai Execution"
        recordKey={`${rows.length}`}
        recordDate="opportunities"
        actions={<ActionBar primary={[{ label: "New opportunity", to: "/origination/new" }]} />}
      />
      <div className="page">
        <Banner tone="info" title="Phase 01 and 02 had no screen in the prototype before v2.0">
          v2.0 §16.1 lists these two phases as the ones no prototype screen served. No status model is defined
          for an opportunity in either source, so the stage column is derived from which artefacts exist — a
          costing snapshot, an agreed deal, a raised contract — and is never typed on the record. The trader's
          other route in is the <Link to="/origination/position">long and short position report</Link>.
        </Banner>
        <DataTable
          caption="Opportunities"
          rows={rows}
          columns={columns}
          loading={opportunities.loading}
          searchPlaceholder="Search by opportunity number, buyer or trader…"
          searchValue={(o) =>
            `${o.opportunityNo} ${o.buyerId ? counterpartyName(o.buyerId) : ""} ${o.traderName} ${
              commodityById(o.commodityId)?.name ?? ""
            }`
          }
          rowHref={(o) => `/origination/${o.id}`}
          savedViews={[
            { key: "all", label: "All opportunities" },
            {
              key: "nocosting",
              label: "Awaiting a costing snapshot",
              description:
                "No cost estimate has been run, so the deal cannot be agreed (proposed control, workshop Costing 1(vi)).",
              predicate: (o) => !o.costing && !o.lapsedOn,
            },
            {
              key: "short",
              label: "Short position",
              description:
                "Declared short — the quantity is still to be purchased, so the opportunity passes to sourcing at Phase 06.",
              predicate: (o) => o.costing?.position === "short",
            },
            {
              key: "agreed",
              label: "Deal agreed and not yet contracted",
              description:
                "The data set has been passed to Dubai Execution; Phase 03 records it as a contract.",
              predicate: (o) => Boolean(o.dealAgreedOn) && !o.contractId,
            },
            {
              key: "lapsed",
              label: "Lapsed",
              predicate: (o) => Boolean(o.lapsedOn),
            },
          ]}
        />
      </div>
    </>
  );
}

/* ================================================================== *
 * OpportunityDetail — /origination/:id
 * ================================================================== */

export function OpportunityDetail() {
  const { id = "" } = useParams();
  const opportunity = useAsync(() => api.getOpportunity(id), [id]);
  const contracts = useAsync(() => api.listContracts());

  if (opportunity.error) {
    return (
      <div className="page">
        <ErrorState detail={opportunity.error} onRetry={opportunity.reload} />
      </div>
    );
  }
  // Only the first load blanks the page. A re-fetch after a save keeps the record on
  // screen, because unmounting it would throw away whatever the trader has half typed
  // into the other form on the page.
  if (opportunity.loading && !opportunity.data) {
    return (
      <div className="page">
        <div className="card card__body muted" aria-live="polite">
          Loading…
        </div>
      </div>
    );
  }
  const o = opportunity.data;
  if (!o) {
    return (
      <div className="page">
        <EmptyState
          title="Opportunity not found"
          action={
            <Link className="btn btn--primary" to="/origination">
              Back to opportunities
            </Link>
          }
        />
      </div>
    );
  }

  const stage = stageOf(o);
  const derived = o.costing ? costingDerivation(o.costing) : undefined;
  const gate = guardDealAgreement(o.costing);
  const contract = (contracts.data ?? []).find((c) => c.id === o.contractId);
  const readyToContract = Boolean(o.dealAgreedOn) && !o.contractId;

  return (
    <>
      <PageHeader
        moduleLabel="Origination & deals"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Origination", to: "/origination" },
          { label: o.opportunityNo },
        ]}
        title={o.opportunityNo}
        statusChip={<StatusChip tone={toneFor(stage)} label={`${humanise(stage)} (derived)`} />}
        meta={
          <>
            {o.traderName} · {commodityById(o.commodityId)?.name ?? o.commodityId} · {countryName(o.origin)} ·{" "}
            {o.buyerId ? counterpartyName(o.buyerId) : "buyer not yet named"}
          </>
        }
        recordKey={o.opportunityNo}
        recordDate={formatDate(o.createdDate)}
        actions={
          readyToContract ? (
            <ActionBar
              primary={[
                {
                  label: "Raise the purchase contract",
                  // The opportunity travels with the link, so P2 can carry in the twelve-item
                  // data set of §6.2 activity 2 and link the two records (§6.3).
                  to: `/contracts/new?opportunity=${o.id}`,
                },
              ]}
            />
          ) : undefined
        }
      />

      <div className="page">
        <Banner tone="info" title="What this screen is, and what it does not claim">
          Phase 01 (opportunity and commercial assessment) and Phase 02 (deal agreement), the two phases v2.0
          §16.1 records as having no prototype screen. Neither §6.1 nor §6.2 defines a status model, so the
          chip above is derived from which artefacts exist. The owner is the trader (commercial); the
          receiving party at Phase 02 is Dubai Execution. No participant, reviewer or approver is stated in
          either source.
        </Banner>

        {o.lapsedOn ? (
          <Banner tone="na" title={`Lapsed on ${formatDate(o.lapsedOn)}`}>
            No source defines a lapsed state for an opportunity; the date is recorded on the record and shown
            as it stands.
          </Banner>
        ) : null}

        <div className="grid-3">
          <SummaryCard title="Opportunity">
            <FieldGrid
              columns={1}
              fields={[
                { label: "Opportunity number", value: o.opportunityNo, behaviour: "readonly" },
                { label: "Trader", value: o.traderName },
                { label: "Commodity", value: commodityById(o.commodityId)?.name ?? o.commodityId },
                { label: "Origin", value: countryName(o.origin) },
                {
                  label: "Indicative quantity",
                  value: formatMt(o.indicativeQuantityMt),
                },
                { label: "Created", value: formatDate(o.createdDate) },
              ]}
            />
          </SummaryCard>

          <SummaryCard title="Costing snapshot" tone={o.costing ? undefined : "warn"}>
            {o.costing && derived ? (
              <>
                <FieldGrid
                  columns={1}
                  fields={[
                    { label: "Taken on", value: formatDate(o.costing.takenOn) },
                    { label: "Incoterm", value: o.costing.incoterm },
                    {
                      label: "Raw material price per MT",
                      value: formatMoney(o.costing.rawMaterialPricePerMt),
                    },
                    { label: "Sales price per MT", value: formatMoney(o.costing.salesPricePerMt) },
                  ]}
                />
                <div className="dtable__scroll" style={{ marginTop: "0.75rem" }}>
                  <table className="dtable__table">
                    <caption className="sr-only">Costing lines with their basis and source</caption>
                    <thead>
                      <tr>
                        <th scope="col">Costing element</th>
                        <th scope="col">Basis</th>
                        <th scope="col">Source</th>
                        <th scope="col" className="text-right">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.costing.lines.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="muted small">
                            No costing element on the snapshot.
                          </td>
                        </tr>
                      ) : (
                        o.costing.lines.map((l) => (
                          <tr key={l.key}>
                            <td>{l.label}</td>
                            <td className="small">{BASIS_LABEL[l.basis]}</td>
                            <td className="small">{SOURCE_LABEL[l.source]}</td>
                            <td className="text-right">{formatMoney(l.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <FieldGrid
                  columns={1}
                  fields={[
                    {
                      label: "Estimated cost per MT",
                      value: <strong>{formatMoney(derived.estimatedCostPerMt)}</strong>,
                      behaviour: "calculated",
                      hint: "Raw material price plus every per-MT line. Per-day and per-bag lines are excluded.",
                    },
                    {
                      label: "Margin",
                      value:
                        derived.marginPct === undefined ? (
                          <span className="muted">no sales price</span>
                        ) : (
                          `${derived.marginPct.toFixed(1)}%`
                        ),
                      behaviour: "calculated",
                      hint: "(sales price − estimated cost) ÷ sales price",
                    },
                    {
                      label: "Snapshot locked",
                      value: o.costing.locked
                        ? `Yes — locked ${formatDate(o.costing.lockedOn)} at deal agreement`
                        : "No — the deal has not been agreed, so the snapshot can still be revised",
                    },
                  ]}
                />
              </>
            ) : (
              <EmptyState title="No costing snapshot" glyph="▲">
                A deal cannot be agreed without one — the costing snapshot is a mandatory input to the deal
                agreement step (proposed control, workshop Costing 1(vi)). Run the cost estimate below.
              </EmptyState>
            )}
          </SummaryCard>

          <SummaryCard title="Declared position">
            {o.costing ? (
              <>
                <FieldGrid
                  columns={1}
                  fields={[
                    {
                      label: "Position",
                      value: (
                        <StatusChip
                          tone={toneFor(o.costing.position)}
                          label={humanise(o.costing.position)}
                          size="sm"
                        />
                      ),
                      hint:
                        o.costing.position === "long"
                          ? "Long — sold against allocated stock."
                          : "Short — the quantity is still to be purchased.",
                    },
                    {
                      label: "Expected raw purchase price per MT",
                      value:
                        o.costing.position === "short"
                          ? formatMoney(o.costing.expectedRawPricePerMt)
                          : "Not applicable on a long position",
                      behaviour: o.costing.position === "short" ? "required" : undefined,
                    },
                  ]}
                />
                {o.costing.position === "short" ? (
                  <Banner tone="warn" title="Short position — passes to sourcing at Phase 06">
                    There is no stock and no sourcing cover for the quantity, so the opportunity is a short
                    position and passes to sourcing (v2.0 §6.1 exception, §6.6 exception 1).{" "}
                    <Link to="/allocation/position">Open the long and short position in allocation</Link>
                  </Banner>
                ) : null}
              </>
            ) : (
              <EmptyState title="No position declared" glyph="▲">
                The long / short declaration is mandatory (proposed control, v2.0 §6.1), and a short
                declaration requires the expected raw purchase price.
              </EmptyState>
            )}
          </SummaryCard>
        </div>

        {o.costing && derived ? (
          <>
            <TotalBanner
              label="Estimated margin per MT"
              value={formatMoney(derived.marginPerMt)}
              derivation={`sales price ${formatMoney(o.costing.salesPricePerMt)} − estimated cost ${formatMoney(
                derived.estimatedCostPerMt,
              )} (raw material price plus every per-MT line)`}
            />
            <Banner tone="info" title="Not inferred — per-day and per-bag costs">
              {NOT_INFERRED_PER_DAY_PER_BAG}
              {derived.perDay.length > 0 || derived.perBag.length > 0 ? (
                <>
                  {" "}
                  On this snapshot that leaves out{" "}
                  {[...derived.perDay, ...derived.perBag]
                    .map((l) => `${l.label} at ${formatMoney(l.amount)} ${BASIS_LABEL[l.basis]}`)
                    .join(", ")}
                  .
                </>
              ) : (
                <> This snapshot has no per-day or per-bag line.</>
              )}
              {derived.otherCurrency.length > 0 ? (
                <>
                  {" "}
                  {derived.otherCurrency.length} per-MT line(s) are held in another currency and are also left
                  out: no exchange rate is stated for a costing element.
                </>
              ) : null}
              {derived.salesCurrencyDiffers ? (
                <>
                  {" "}
                  The sales price is in a different currency from the raw material price, so the margin
                  compares two currencies and is shown for information only.
                </>
              ) : null}
            </Banner>
          </>
        ) : null}

        <CollapsibleSection
          title="Deal agreement (Phase 02)"
          indicator={
            o.dealAgreedOn ? (
              <StatusChip tone="ok" label={`Agreed ${formatDate(o.dealAgreedOn)}`} size="sm" />
            ) : (
              <StatusChip tone="idle" label="Not agreed" size="sm" />
            )
          }
        >
          {o.deal ? (
            <>
              <p className="small muted">
                v2.0 §6.2 activity 2: the agreed data set is passed in full — the twelve items below — from
                the trader to Dubai Execution so the contract can be created with the buyer. This data set is
                what Phase 03 records as a contract.
              </p>
              <FieldGrid
                fields={[
                  { label: "Buyer", value: counterpartyName(o.deal.buyerId) },
                  {
                    label: "Commodity",
                    value: commodityById(o.deal.commodityId)?.name ?? o.deal.commodityId,
                  },
                  { label: "Price", value: formatMoney(o.deal.pricePerMt) },
                  { label: "Incoterms", value: o.deal.incoterm },
                  { label: "Origin country", value: countryName(o.deal.origin) },
                  { label: "Loading port", value: portName(o.deal.portOfLoadingId) },
                  { label: "Port of discharge", value: portName(o.deal.portOfDischargeId) },
                  { label: "Quantity", value: formatMt(o.deal.quantityMt) },
                  { label: "Shipping period start date", value: formatDate(o.deal.shipmentPeriodStart) },
                  { label: "Shipping period end date", value: formatDate(o.deal.shipmentPeriodEnd) },
                  { label: "Payment terms", value: o.deal.paymentTerms },
                  { label: "Notes", value: o.deal.notes },
                  {
                    label: "Channel of the hand-off",
                    value: o.dealChannel,
                    hint: "[ASSUMPTION] e-mail, inferred because the workshop notes describe the deal as communicated from the traders to Dubai Execution with no system named.",
                  },
                ]}
              />
              <Banner tone="info" title="No state, and amendment is open">
                §6.2 records no state model for a deal [OPEN]. Whether a deal can be amended after it has been
                communicated, and what that does to the locked snapshot, is an open question in the source.
              </Banner>
              {readyToContract ? (
                <div className="row" style={{ marginTop: "0.75rem" }}>
                  <Link className="btn btn--primary" to={`/contracts/new?opportunity=${o.id}`}>
                    Raise the purchase contract
                  </Link>
                  <span className="small muted">
                    Phase 03 records this data set as a contract in SAP; the costing snapshot travels with it.
                  </span>
                </div>
              ) : null}
              {contract ? (
                <p className="small" style={{ marginTop: "0.75rem" }}>
                  Contract raised: <Link to={`/contracts/${contract.id}`}>{contract.contractNo}</Link>
                </p>
              ) : null}
            </>
          ) : gate.allowed ? (
            <DealAgreementForm key={o.id} opportunity={o} />
          ) : (
            <>
              <Banner tone="warn" title="The deal cannot be agreed yet">
                {gate.reason}
              </Banner>
              <EmptyState title="Costing snapshot and declared position first" glyph="▲">
                Both controls are [PROPOSED] in v2.0 §6.1: the costing snapshot is a mandatory input to the
                deal agreement step, and the long / short declaration is mandatory, with a short declaration
                requiring the expected raw purchase price.
              </EmptyState>
            </>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Cost estimate (Phase 01)" defaultOpen={!o.costing}>
          <CostingForm key={o.id} opportunity={o} />
        </CollapsibleSection>

        {o.note ? (
          <div className="card card__body">
            <h3 className="card__title">Note</h3>
            <p className="small" style={{ marginTop: "0.5rem" }}>
              {o.note}
            </p>
          </div>
        ) : null}

        <CollapsibleSection title="Open questions on this phase" defaultOpen={false}>
          <p className="small muted">
            The questions v2.0 §6.1 and §6.2 record against these phases, as the source writes them.
          </p>
          <h4 className="card__title" style={{ marginTop: "0.75rem" }}>
            Phase 01 — opportunity and commercial assessment (§6.1)
          </h4>
          <ul className="reviewlist">
            <li>
              <StatusChip tone="warn" label="OPEN" size="sm" />
              <div>
                <p className="small">
                  Does an offer need an approval before a deal is committed, and to what authority limit?
                </p>
                <p className="xsmall muted">
                  Participants: none stated in either source. Whether an offer requires review or approval
                  before a deal is agreed, and by whom, is open.
                </p>
              </div>
            </li>
            <li>
              <StatusChip tone="warn" label="OPEN" size="sm" />
              <div>
                <p className="small">
                  The costing elements per country are to be provided by Siedahmed — not yet available.
                </p>
              </div>
            </li>
            <li>
              <StatusChip tone="warn" label="OPEN" size="sm" />
              <div>
                <p className="small">
                  The workshop text "The costing elements are assigned and configured for each?? (commodity,
                  country, )" is incomplete; the configuration dimensions are not settled.
                </p>
              </div>
            </li>
            <li>
              <StatusChip tone="warn" label="OPEN" size="sm" />
              <div>
                <p className="small">
                  Whether the costing module described is an existing tool or a COTS module still to be built.
                </p>
              </div>
            </li>
            <li>
              <StatusChip tone="warn" label="OPEN" size="sm" />
              <div>
                <p className="small">No status model is defined for an opportunity in either source.</p>
              </div>
            </li>
          </ul>
          <h4 className="card__title" style={{ marginTop: "0.75rem" }}>
            Phase 02 — deal agreement (§6.2)
          </h4>
          <ul className="reviewlist">
            <li>
              <StatusChip tone="warn" label="OPEN" size="sm" />
              <div>
                <p className="small">The channel and format of the hand-off.</p>
                <p className="xsmall muted">
                  [ASSUMPTION] e-mail, inferred because the workshop notes describe the deal as communicated
                  from the traders to Dubai Execution with no system named.
                </p>
              </div>
            </li>
            <li>
              <StatusChip tone="warn" label="OPEN" size="sm" />
              <div>
                <p className="small">
                  Whether a deal can be amended after it has been communicated, and what that does to the
                  snapshot.
                </p>
              </div>
            </li>
            <li>
              <StatusChip tone="warn" label="OPEN" size="sm" />
              <div>
                <p className="small">No state is defined for a deal.</p>
              </div>
            </li>
          </ul>
          <Banner tone="warn" title={`Decision D-20 — ${OPEN_DECISIONS["D-20"].title}`}>
            Owner: {OPEN_DECISIONS["D-20"].owner}. The costing elements per country, with their units, are one
            of the five outstanding master data sets (v2.0 §14.1) and block Phase 01's cost estimate and
            therefore the deal gate. Until they arrive, no configured element library is offered here: the
            lines on a snapshot are revised in place and anything calculated outside the system is entered
            under other costs.
          </Banner>
          <Banner tone="warn" title={`Decision D-18 — ${OPEN_DECISIONS["D-18"].title}`}>
            Owner: {OPEN_DECISIONS["D-18"].owner}. No target exists for any phase before the document chain,
            so this screen shows no target date, no ageing and no duration.
          </Banner>
        </CollapsibleSection>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Phase 01 — the cost estimate and the declared position
 * ------------------------------------------------------------------ */

interface LineDraft {
  key: string;
  label: string;
  basis: CostingBasis;
  amount: string;
  source: CostingLine["source"];
}

function CostingForm({ opportunity }: { opportunity: Opportunity }) {
  const toast = useToast();
  const existing = opportunity.costing;
  const currency: CurrencyCode = existing?.rawMaterialPricePerMt.currency ?? "USD";
  const locked = Boolean(existing?.locked);
  const contracted = Boolean(opportunity.contractId);
  const disabled = locked || contracted;

  const [takenOn, setTakenOn] = useState(existing?.takenOn ?? TODAY);
  const [incoterm, setIncoterm] = useState<Incoterm | "">(existing?.incoterm ?? "");
  const [rawPrice, setRawPrice] = useState(existing ? String(existing.rawMaterialPricePerMt.amount) : "");
  const [salesPrice, setSalesPrice] = useState(existing ? String(existing.salesPricePerMt.amount) : "");
  const [lines, setLines] = useState<LineDraft[]>(
    () =>
      existing?.lines.map((l) => ({
        key: l.key,
        label: l.label,
        basis: l.basis,
        amount: String(l.amount.amount),
        source: l.source,
      })) ?? [],
  );
  const [otherLabel, setOtherLabel] = useState("");
  const [otherAmount, setOtherAmount] = useState("");
  const [otherBasis, setOtherBasis] = useState<CostingBasis | "">("per_mt");
  const [position, setPosition] = useState<StockPosition | "">(existing?.position ?? "");
  const [expectedRaw, setExpectedRaw] = useState(
    existing?.expectedRawPricePerMt ? String(existing.expectedRawPricePerMt.amount) : "",
  );
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errors: Record<string, string> = {};
  if (!incoterm) errors["cost-incoterm"] = "Select the Incoterm the estimate is priced on.";
  if (!rawPrice.trim() || !(safeNumber(rawPrice, -1) > 0))
    errors["cost-raw"] = "Enter the raw material price per MT as a number greater than zero.";
  if (!salesPrice.trim() || !(safeNumber(salesPrice, -1) > 0))
    errors["cost-sales"] =
      "Enter the sales price per MT as a number greater than zero — the margin is expressed as a percentage of it.";
  for (const [i, l] of lines.entries()) {
    if (!l.amount.trim() || !Number.isFinite(Number(l.amount)))
      errors[`cost-line-${i}`] = `Enter an amount for ${l.label} as a number.`;
  }
  if (otherAmount.trim() && !Number.isFinite(Number(otherAmount)))
    errors["cost-other-amount"] = "Enter the other cost as a number, or leave it empty.";
  if (otherAmount.trim() && !otherLabel.trim())
    errors["cost-other-label"] = "Name the cost that was calculated outside the system.";
  if (otherLabel.trim() && !otherAmount.trim())
    errors["cost-other-amount"] = "Enter the amount for the other cost, or clear its name.";
  if (otherAmount.trim() && !otherBasis)
    errors["cost-other-basis"] = "Choose whether the other cost applies per MT, per day or per bag.";
  if (!position) errors["cost-position"] = "Declare whether the sale is against a long or a short position.";
  if (position === "short" && !(safeNumber(expectedRaw, -1) > 0))
    errors["cost-expected-raw"] =
      "A short position requires the expected raw purchase price (v2.0 §6.1 control 2).";

  const summaryErrors = submitted
    ? Object.entries(errors).map(([field, message]) => ({ field, message }))
    : [];

  const previewLines: CostingLine[] = [
    ...lines
      .filter((l) => Number.isFinite(Number(l.amount)))
      .map((l) => ({
        key: l.key,
        label: l.label,
        basis: l.basis,
        amount: money(safeNumber(l.amount, 0), currency),
        source: l.source,
      })),
    ...(otherAmount.trim() && otherLabel.trim() && otherBasis
      ? [
          {
            key: `other-${lines.length + 1}`,
            label: otherLabel.trim(),
            basis: otherBasis,
            amount: money(safeNumber(otherAmount, 0), currency),
            source: "other" as const,
          },
        ]
      : []),
  ];
  const previewEstimate = round(
    safeNumber(rawPrice, 0) +
      sum(previewLines.filter((l) => l.basis === "per_mt").map((l) => l.amount.amount)),
    2,
  );
  const previewSales = safeNumber(salesPrice, 0);
  const previewMarginPct =
    previewSales > 0 ? round(((previewSales - previewEstimate) / previewSales) * 100, 1) : undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    const snapshot: OpportunityCosting = {
      takenOn,
      incoterm: incoterm as Incoterm,
      rawMaterialPricePerMt: money(safeNumber(rawPrice, 0), currency),
      salesPricePerMt: money(safeNumber(salesPrice, 0), currency),
      lines: previewLines,
      position: position as StockPosition,
      expectedRawPricePerMt: position === "short" ? money(safeNumber(expectedRaw, 0), currency) : undefined,
      locked: false,
    };
    const res = await api.setOpportunityCosting(opportunity.id, snapshot);
    setSaving(false);
    if (!res.ok) {
      setServerError(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    // The other-costs row has become a line on the snapshot, so it moves into the line
    // list rather than staying in the entry row where a second save would duplicate it.
    setLines(
      previewLines.map((l) => ({
        key: l.key,
        label: l.label,
        basis: l.basis,
        amount: String(l.amount.amount),
        source: l.source,
      })),
    );
    setOtherLabel("");
    setOtherAmount("");
    setSubmitted(false);
    toast.push(
      "ok",
      `Costing snapshot retained against ${opportunity.opportunityNo}. It is carried into the deal agreement.`,
    );
  }

  return (
    <>
      <p className="small muted">
        v2.0 §6.1 activities 3 to 6: the trader runs the cost estimate with the values he has at hand, enters
        any cost calculated outside the system under other costs, states whether the sale is against a long
        (allocated) or a short (still to be purchased) position, and the exercise is retained as a snapshot
        against the opportunity to be carried into the deal agreement. The cost estimate itself is [AS-IS] as
        a practice and [PROPOSED] as a COTS module; whether the costing module is an existing tool or one
        still to be built is an open question.
      </p>

      {disabled ? (
        <Banner
          tone="info"
          title={
            locked
              ? "The snapshot is locked and cannot be revised here"
              : "A contract has already been raised from this deal"
          }
        >
          {locked
            ? `The snapshot was locked on ${formatDate(
                opportunity.costing?.lockedOn,
              )} when the deal was agreed, so that the basis on which the deal was priced can later be compared with what the shipment actually cost (v2.0 §6.2 activity 3). Whether a deal — and therefore its snapshot — can be amended after the hand-off is an open question in the source.`
            : "The service layer refuses a change to the snapshot once a purchase contract exists against the deal."}
        </Banner>
      ) : null}

      {serverError ? (
        <Banner tone="risk" title="The service layer refused this snapshot">
          {serverError}
        </Banner>
      ) : null}

      <form className="stack" onSubmit={submit} noValidate>
        <ErrorSummary errors={summaryErrors} title="The costing snapshot could not be saved" />
        <RequiredLegend />

        <div className="fields">
          <FormRow label="Costing date" htmlFor="cost-taken-on">
            <TextInput
              id="cost-taken-on"
              type="date"
              value={takenOn}
              onChange={setTakenOn}
              disabled={disabled}
            />
          </FormRow>
          <FormRow
            label="Incoterm"
            htmlFor="cost-incoterm"
            required
            error={submitted ? errors["cost-incoterm"] : undefined}
            hint="The intended terms of sale the estimate is priced on."
          >
            <SelectInput
              id="cost-incoterm"
              value={incoterm}
              onChange={setIncoterm}
              options={INCOTERMS.map((i) => ({ value: i, label: i }))}
              required
              disabled={disabled}
              error={submitted ? errors["cost-incoterm"] : undefined}
            />
          </FormRow>
          <FormRow
            label={`Raw material price per MT (${currency})`}
            htmlFor="cost-raw"
            required
            error={submitted ? errors["cost-raw"] : undefined}
            hint="Trader-entered. The currency of an existing snapshot is preserved; a new one is captured in USD, because no currency is stated for a costing element."
          >
            <TextInput
              id="cost-raw"
              value={rawPrice}
              onChange={setRawPrice}
              inputMode="decimal"
              required
              disabled={disabled}
              error={submitted ? errors["cost-raw"] : undefined}
            />
          </FormRow>
          <FormRow
            label={`Sales price per MT (${currency})`}
            htmlFor="cost-sales"
            required
            error={submitted ? errors["cost-sales"] : undefined}
            hint="Trader-entered. The indicative price at the selling location."
          >
            <TextInput
              id="cost-sales"
              value={salesPrice}
              onChange={setSalesPrice}
              inputMode="decimal"
              required
              disabled={disabled}
              error={submitted ? errors["cost-sales"] : undefined}
            />
          </FormRow>
        </div>

        {lines.length > 0 ? (
          <div className="fields">
            {lines.map((l, i) => (
              <FormRow
                key={l.key}
                label={`${l.label} (${BASIS_LABEL[l.basis]}, ${currency})`}
                htmlFor={`cost-line-${i}`}
                error={submitted ? errors[`cost-line-${i}`] : undefined}
                hint={SOURCE_LABEL[l.source]}
              >
                <TextInput
                  id={`cost-line-${i}`}
                  value={l.amount}
                  onChange={(v) =>
                    setLines((ls) => ls.map((x, idx) => (idx === i ? { ...x, amount: v } : x)))
                  }
                  inputMode="decimal"
                  disabled={disabled}
                  error={submitted ? errors[`cost-line-${i}`] : undefined}
                />
              </FormRow>
            ))}
          </div>
        ) : (
          <Banner tone="warn" title="No configured costing element is available">
            v2.0 §6.1 proposes costing elements configured per country — raw material, processing and
            execution operation costs, as a fixed amount or a range, applied per MT, per day or per bag. Those
            elements have not been provided (decision D-20), so none is offered for selection. Use other costs
            below for anything calculated outside the system.
          </Banner>
        )}

        <div className="fields">
          <FormRow
            label="Other costs — what it is"
            htmlFor="cost-other-label"
            error={submitted ? errors["cost-other-label"] : undefined}
            hint="v2.0 §6.1 activity 4: where a cost has been calculated outside the system, the trader enters it under other costs. [PROPOSED]"
          >
            <TextInput
              id="cost-other-label"
              value={otherLabel}
              onChange={setOtherLabel}
              disabled={disabled}
              error={submitted ? errors["cost-other-label"] : undefined}
            />
          </FormRow>
          <FormRow
            label={`Other costs — amount (${currency})`}
            htmlFor="cost-other-amount"
            error={submitted ? errors["cost-other-amount"] : undefined}
          >
            <TextInput
              id="cost-other-amount"
              value={otherAmount}
              onChange={setOtherAmount}
              inputMode="decimal"
              disabled={disabled}
              error={submitted ? errors["cost-other-amount"] : undefined}
            />
          </FormRow>
          <FormRow
            label="Other costs — basis"
            htmlFor="cost-other-basis"
            error={submitted ? errors["cost-other-basis"] : undefined}
            hint="Only a per-MT entry reaches the estimated cost per MT; the source gives no conversion for a day or a bag."
          >
            <SelectInput
              id="cost-other-basis"
              value={otherBasis}
              onChange={setOtherBasis}
              options={BASES.map((b) => ({ value: b, label: BASIS_LABEL[b] }))}
              disabled={disabled}
              error={submitted ? errors["cost-other-basis"] : undefined}
            />
          </FormRow>
        </div>

        <div className="fields">
          <FormRow
            label="Position declared"
            htmlFor="cost-position"
            required
            error={submitted ? errors["cost-position"] : undefined}
            hint="Long — sold against allocated stock. Short — the quantity is still to be purchased, and the opportunity passes to sourcing at Phase 06."
          >
            <SelectInput
              id="cost-position"
              value={position}
              onChange={setPosition}
              options={POSITIONS.map((p) => ({ value: p, label: humanise(p) }))}
              required
              disabled={disabled}
              error={submitted ? errors["cost-position"] : undefined}
            />
          </FormRow>
          <FormRow
            label={`Expected raw purchase price per MT (${currency})`}
            htmlFor="cost-expected-raw"
            required={position === "short"}
            error={submitted ? errors["cost-expected-raw"] : undefined}
            hint="Mandatory on a short declaration (proposed control, v2.0 §6.1)."
          >
            <TextInput
              id="cost-expected-raw"
              value={expectedRaw}
              onChange={setExpectedRaw}
              inputMode="decimal"
              disabled={disabled || position !== "short"}
              error={submitted ? errors["cost-expected-raw"] : undefined}
            />
          </FormRow>
        </div>

        <FieldGrid
          fields={[
            {
              label: "Estimated cost per MT (as entered)",
              value: formatMoney(money(previewEstimate, currency)),
              behaviour: "calculated",
              hint: "Raw material price plus every per-MT line above.",
            },
            {
              label: "Margin (as entered)",
              value: previewMarginPct === undefined ? undefined : `${previewMarginPct.toFixed(1)}%`,
              behaviour: "calculated",
              hint: "(sales price − estimated cost) ÷ sales price",
            },
          ]}
        />

        <FormActions>
          <button type="submit" className="btn btn--primary" disabled={disabled || saving}>
            {saving ? "Saving…" : existing ? "Revise the costing snapshot" : "Retain the costing snapshot"}
          </button>
          <Link className="btn" to="/origination">
            Back to opportunities
          </Link>
        </FormActions>
      </form>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Phase 02 — the twelve-item data set passed to Dubai Execution
 * ------------------------------------------------------------------ */

function DealAgreementForm({ opportunity }: { opportunity: Opportunity }) {
  const toast = useToast();
  const costing = opportunity.costing;
  const currency: CurrencyCode = costing?.salesPricePerMt.currency ?? "USD";

  const [buyerId, setBuyerId] = useState(opportunity.buyerId ?? "");
  const [commodityId, setCommodityId] = useState(opportunity.commodityId);
  const [price, setPrice] = useState(costing ? String(costing.salesPricePerMt.amount) : "");
  const [incoterm, setIncoterm] = useState<Incoterm | "">(costing?.incoterm ?? "");
  const [origin, setOrigin] = useState<CountryUnit | "">(opportunity.origin);
  const [portOfLoadingId, setPortOfLoadingId] = useState("");
  const [portOfDischargeId, setPortOfDischargeId] = useState("");
  const [quantity, setQuantity] = useState(String(opportunity.indicativeQuantityMt));
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const buyers = COUNTERPARTIES.filter((c) => c.type === "buyer");
  const commodities = COMMODITIES.filter((c) => c.active);
  const loadPorts = PORTS.filter((p) => p.type === "load" || p.type === "both");
  const dischargePorts = PORTS.filter((p) => p.type === "discharge" || p.type === "both");

  // §6.2 activity 2: the agreed data set is passed IN FULL, so every item is required
  // here as well as in the service layer. Notes is the twelfth item and is optional —
  // the source lists it, and states no rule that it must be filled.
  const errors: Record<string, string> = {};
  if (!buyerId) errors["deal-buyer"] = "Name the buyer the general agreement was reached with.";
  if (!commodityId) errors["deal-commodity"] = "Select the commodity.";
  if (!price.trim() || !(safeNumber(price, -1) > 0)) errors["deal-price"] = "Enter the agreed price per MT.";
  if (!incoterm) errors["deal-incoterm"] = "Select the agreed Incoterms.";
  if (!origin) errors["deal-origin"] = "Select the origin country.";
  if (!portOfLoadingId) errors["deal-pol"] = "Select the loading port.";
  if (!portOfDischargeId) errors["deal-pod"] = "Select the port of discharge.";
  if (!quantity.trim() || !(safeNumber(quantity, -1) > 0))
    errors["deal-quantity"] = "Enter the agreed quantity in metric tonnes.";
  if (!periodStart) errors["deal-period-start"] = "Enter the shipping period start date.";
  if (!periodEnd) errors["deal-period-end"] = "Enter the shipping period end date.";
  if (!paymentTerms.trim()) errors["deal-payment"] = "Enter the agreed payment terms.";

  const summaryErrors = submitted
    ? Object.entries(errors).map(([field, message]) => ({ field, message }))
    : [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    const terms: DealTerms = {
      buyerId,
      commodityId,
      pricePerMt: money(safeNumber(price, 0), currency),
      incoterm: incoterm as Incoterm,
      origin: origin as CountryUnit,
      portOfLoadingId,
      portOfDischargeId,
      quantityMt: safeNumber(quantity, 0),
      shipmentPeriodStart: periodStart,
      shipmentPeriodEnd: periodEnd,
      paymentTerms: paymentTerms.trim(),
      notes: notes.trim() || undefined,
    };
    const res = await api.agreeDeal(opportunity.id, terms);
    setSaving(false);
    if (!res.ok) {
      setServerError(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    toast.push(
      "ok",
      `Deal agreed on ${opportunity.opportunityNo} and passed to Dubai Execution. The costing snapshot is now locked.`,
    );
  }

  return (
    <>
      <p className="small muted">
        v2.0 §6.2: the trigger is the trader and the buyer reaching a general agreement. The trader
        communicates that agreement to Dubai Execution so the contract can be created with the buyer, the data
        set below is passed in full, and the costing snapshot is attached to the deal and locked so that the
        basis on which the deal was priced can later be compared with what the shipment actually cost. The
        channel is not stated in either source; e-mail is recorded as an [ASSUMPTION] on save.
      </p>

      {serverError ? (
        <Banner tone="risk" title="The service layer refused this deal">
          {serverError}
        </Banner>
      ) : null}

      <form className="stack" onSubmit={submit} noValidate>
        <ErrorSummary errors={summaryErrors} title="The deal could not be agreed" />
        <RequiredLegend />

        <div className="fields">
          <FormRow
            label="Buyer"
            htmlFor="deal-buyer"
            required
            error={submitted ? errors["deal-buyer"] : undefined}
          >
            <SelectInput
              id="deal-buyer"
              value={buyerId}
              onChange={setBuyerId}
              options={buyers.map((b) => ({ value: b.id, label: b.name, disabled: !b.active }))}
              required
              error={submitted ? errors["deal-buyer"] : undefined}
            />
          </FormRow>
          <FormRow
            label="Commodity"
            htmlFor="deal-commodity"
            required
            error={submitted ? errors["deal-commodity"] : undefined}
          >
            <SelectInput
              id="deal-commodity"
              value={commodityId}
              onChange={setCommodityId}
              options={commodities.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
              required
              error={submitted ? errors["deal-commodity"] : undefined}
            />
          </FormRow>
          <FormRow
            label={`Price per MT (${currency})`}
            htmlFor="deal-price"
            required
            error={submitted ? errors["deal-price"] : undefined}
            hint="Defaulted from the sales price on the costing snapshot."
          >
            <TextInput
              id="deal-price"
              value={price}
              onChange={setPrice}
              inputMode="decimal"
              required
              error={submitted ? errors["deal-price"] : undefined}
            />
          </FormRow>
          <FormRow
            label="Incoterms"
            htmlFor="deal-incoterm"
            required
            error={submitted ? errors["deal-incoterm"] : undefined}
          >
            <SelectInput
              id="deal-incoterm"
              value={incoterm}
              onChange={setIncoterm}
              options={INCOTERMS.map((i) => ({ value: i, label: i }))}
              required
              error={submitted ? errors["deal-incoterm"] : undefined}
            />
          </FormRow>
          <FormRow
            label="Origin country"
            htmlFor="deal-origin"
            required
            error={submitted ? errors["deal-origin"] : undefined}
          >
            <SelectInput
              id="deal-origin"
              value={origin}
              onChange={setOrigin}
              options={COUNTRY_ORDER.map((c) => ({ value: c, label: countryName(c) }))}
              required
              error={submitted ? errors["deal-origin"] : undefined}
            />
          </FormRow>
          <FormRow
            label="Loading port"
            htmlFor="deal-pol"
            required
            error={submitted ? errors["deal-pol"] : undefined}
          >
            <SelectInput
              id="deal-pol"
              value={portOfLoadingId}
              onChange={setPortOfLoadingId}
              options={loadPorts.map((p) => ({ value: p.id, label: `${p.name} — ${p.country}` }))}
              required
              error={submitted ? errors["deal-pol"] : undefined}
            />
          </FormRow>
          <FormRow
            label="Port of discharge"
            htmlFor="deal-pod"
            required
            error={submitted ? errors["deal-pod"] : undefined}
          >
            <SelectInput
              id="deal-pod"
              value={portOfDischargeId}
              onChange={setPortOfDischargeId}
              options={dischargePorts.map((p) => ({ value: p.id, label: `${p.name} — ${p.country}` }))}
              required
              error={submitted ? errors["deal-pod"] : undefined}
            />
          </FormRow>
          <FormRow
            label="Quantity in MT"
            htmlFor="deal-quantity"
            required
            error={submitted ? errors["deal-quantity"] : undefined}
            hint={`Indicative quantity on the opportunity: ${formatMt(opportunity.indicativeQuantityMt)}.`}
          >
            <TextInput
              id="deal-quantity"
              value={quantity}
              onChange={setQuantity}
              inputMode="decimal"
              required
              error={submitted ? errors["deal-quantity"] : undefined}
            />
          </FormRow>
          <FormRow
            label="Shipping period start date"
            htmlFor="deal-period-start"
            required
            error={submitted ? errors["deal-period-start"] : undefined}
          >
            <TextInput
              id="deal-period-start"
              type="date"
              value={periodStart}
              onChange={setPeriodStart}
              required
              error={submitted ? errors["deal-period-start"] : undefined}
            />
          </FormRow>
          <FormRow
            label="Shipping period end date"
            htmlFor="deal-period-end"
            required
            error={submitted ? errors["deal-period-end"] : undefined}
          >
            <TextInput
              id="deal-period-end"
              type="date"
              value={periodEnd}
              onChange={setPeriodEnd}
              required
              error={submitted ? errors["deal-period-end"] : undefined}
            />
          </FormRow>
          <FormRow
            label="Payment terms"
            htmlFor="deal-payment"
            required
            error={submitted ? errors["deal-payment"] : undefined}
          >
            <TextInput
              id="deal-payment"
              value={paymentTerms}
              onChange={setPaymentTerms}
              required
              error={submitted ? errors["deal-payment"] : undefined}
            />
          </FormRow>
        </div>

        <FormRow
          label="Notes"
          htmlFor="deal-notes"
          hint="The twelfth item of the data set. The source lists it and states no rule that it must be filled."
        >
          <TextArea id="deal-notes" value={notes} onChange={setNotes} rows={3} />
        </FormRow>

        <FormActions>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Saving…" : "Agree the deal and lock the snapshot"}
          </button>
          <Link className="btn" to="/origination">
            Back to opportunities
          </Link>
        </FormActions>
      </form>
    </>
  );
}

/* ================================================================== *
 * OpportunityForm — /origination/new
 * ================================================================== */

export function OpportunityForm() {
  /**
   * The trader, read and not asked for.
   *
   * "Remove the trader field in add new opportunity as the trader will be automatically
   * captured by the system (the trader/user who is currently login in COTS)." — instruction
   * of 6 September 2026.
   *
   * This is the clean case of the pattern, and it is worth saying why it is cleaner than the
   * purchase contract's trader removed the day before. Phase 01 has exactly one participant,
   * and this screen's own hint has always said so: *owner of Phase 01 — trader (commercial);
   * no other participant is stated in either source*. The person identifying the opportunity
   * IS the trader, so the session is not a fallback here, it is the source. There is nothing
   * to inherit from and nothing to copy, because an opportunity is where the chain starts.
   *
   * That matters downstream: the trader captured here is what §6.2 activity 2 later carries
   * onto the purchase contract, which as of yesterday no longer asks for one either. So the
   * name is now entered nowhere and read everywhere, from a single point of capture — the
   * sign-in — instead of being retyped at Phase 01 and again at Phase 10 with two chances to
   * disagree.
   */
  const { user } = useAuth();
  const traderName = user?.displayName ?? "";
  const [commodityId, setCommodityId] = useState("");
  const [origin, setOrigin] = useState<CountryUnit | "">("");
  const [quantity, setQuantity] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [previewed, setPreviewed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const errors: Record<string, string> = {};
  /* Not a field left blank — a session with no display name to read. It cannot happen from
     these screens, which is why the message explains rather than instructs. */
  if (!traderName.trim())
    errors["opp-trader"] =
      "The signed-in session carries no display name, so there is no trader to record. The trader is " +
      "read from the session rather than entered.";
  if (!commodityId) errors["opp-commodity"] = "Select the commodity.";
  if (!origin) errors["opp-origin"] = "Select the origin country.";
  if (!quantity.trim() || !(safeNumber(quantity, -1) > 0))
    errors["opp-quantity"] = "Enter the indicative quantity in metric tonnes as a number greater than zero.";

  const summaryErrors = submitted
    ? Object.entries(errors).map(([field, message]) => ({ field, message }))
    : [];

  /**
   * "Add save function in the Add Opportunity screen." — 6 September 2026.
   *
   * Until now this screen validated and previewed and wrote nothing, because the service
   * layer had no create-opportunity operation. It has one now (`api.createOpportunity`),
   * which re-checks these same rules — the service layer is the third check by design, as
   * it is for the purchase contract.
   *
   * Checking without saving is kept as its own button rather than dropped. It is the only
   * screen in the module that previews what a record would hold before writing it, and a
   * trader sizing up an opportunity has a real use for that; removing it to make room for
   * Save would take away something the screen already did.
   */
  function save(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (Object.keys(errors).length > 0) {
      setPreviewed(false);
      return;
    }
    setSaving(true);
    void api
      .createOpportunity({
        traderName,
        commodityId,
        origin: origin as CountryUnit,
        indicativeQuantityMt: safeNumber(quantity, 0),
        buyerId: buyerId || undefined,
        note,
      })
      .then((res) => {
        setSaving(false);
        if (!res.ok) {
          setServerError(res.reason);
          return;
        }
        toast.push(
          "ok",
          `${res.value.opportunityNo} created. Next is the cost estimate, and the deal cannot be agreed without it (v2.0 §6.1 activity 6).`,
        );
        navigate(`/origination/${res.value.id}`);
      });
  }

  function preview(e: React.MouseEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    setPreviewed(Object.keys(errors).length === 0);
  }

  return (
    <>
      <PageHeader
        moduleLabel="Origination & deals"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Origination", to: "/origination" },
          { label: "New opportunity" },
        ]}
        title="New opportunity"
        meta="Phase 01 — a trader identifies a potential selling opportunity, or a long position becomes visible in the position report"
        recordKey="Phase 01"
        recordDate="opportunity and commercial assessment"
      />
      <div className="page">
        <Banner tone="info" title="What saving an opportunity does, and what it does not">
          <strong>Save opportunity</strong> writes the record and takes you to it. What it writes is the
          opportunity and nothing else: no cost estimate, because §6.1 activity 6 makes the estimate a
          separate step against a saved opportunity; no deal, because §6.2 is a separate gate that cannot be
          passed without a locked snapshot; and no status, because neither source defines a status model for
          an opportunity — the list shows a stage derived from which artefacts exist. So a saved opportunity
          is <em>identified</em> and no more, which is what Phase 01 produces.{" "}
          <strong>Check this opportunity</strong> applies the same rules and shows what would be recorded,
          without writing anything. <Link to="/origination">Opportunities</Link>
        </Banner>

        {serverError ? (
          <Banner tone="risk" title="The opportunity could not be saved">
            {serverError}
          </Banner>
        ) : null}

        <form className="stack" onSubmit={save} noValidate>
          <ErrorSummary errors={summaryErrors} title="This opportunity could not be previewed" />
          <RequiredLegend />

          <div className="fields">
            <FormRow
              label="Trader"
              htmlFor="opp-trader"
              required
              error={submitted ? errors["opp-trader"] : undefined}
              hint="Read from the session. Owner of Phase 01 — trader (commercial); no other participant is stated in either source, so the person raising the opportunity is the trader."
            >
              <div id="opp-trader">
                {traderName ? (
                  <strong>{traderName}</strong>
                ) : (
                  <span className="muted">– no display name on the session</span>
                )}
              </div>
            </FormRow>
            <FormRow
              label="Commodity"
              htmlFor="opp-commodity"
              required
              error={submitted ? errors["opp-commodity"] : undefined}
            >
              <SelectInput
                id="opp-commodity"
                value={commodityId}
                onChange={setCommodityId}
                options={COMMODITIES.filter((c) => c.active).map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.code})`,
                }))}
                required
                error={submitted ? errors["opp-commodity"] : undefined}
              />
            </FormRow>
            <FormRow
              label="Origin country"
              htmlFor="opp-origin"
              required
              error={submitted ? errors["opp-origin"] : undefined}
            >
              <SelectInput
                id="opp-origin"
                value={origin}
                onChange={setOrigin}
                options={COUNTRY_ORDER.map((c) => ({ value: c, label: countryName(c) }))}
                required
                error={submitted ? errors["opp-origin"] : undefined}
              />
            </FormRow>
            <FormRow
              label="Indicative quantity in MT"
              htmlFor="opp-quantity"
              required
              error={submitted ? errors["opp-quantity"] : undefined}
            >
              <TextInput
                id="opp-quantity"
                value={quantity}
                onChange={setQuantity}
                inputMode="decimal"
                required
                error={submitted ? errors["opp-quantity"] : undefined}
              />
            </FormRow>
            <FormRow
              label="Buyer"
              htmlFor="opp-buyer"
              hint="Optional at Phase 01 — the trader may be looking for an offer before a buyer is named."
            >
              <SelectInput
                id="opp-buyer"
                value={buyerId}
                onChange={setBuyerId}
                options={COUNTERPARTIES.filter((c) => c.type === "buyer").map((b) => ({
                  value: b.id,
                  label: b.name,
                  disabled: !b.active,
                }))}
                placeholder="Not yet named"
              />
            </FormRow>
          </div>

          <FormRow label="Note" htmlFor="opp-note">
            <TextArea id="opp-note" value={note} onChange={setNote} rows={3} />
          </FormRow>

          <FormActions>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Saving…" : "Save opportunity"}
            </button>
            <button type="button" className="btn" onClick={preview} disabled={saving}>
              Check this opportunity
            </button>
            <Link className="btn" to="/origination">
              Back to opportunities
            </Link>
          </FormActions>
        </form>

        {previewed ? (
          <>
            <Banner tone="info" title="Nothing has been saved yet — this is a check, not a save">
              The entries below pass every check this screen applies, and every one the service layer
              applies. Nothing has been written: use <strong>Save opportunity</strong> above to create the
              record, which will then carry its own reference and be the thing the cost estimate is taken
              against.
            </Banner>
            <div className="card card__body">
              <h3 className="card__title">What would be recorded</h3>
              <FieldGrid
                fields={[
                  {
                    label: "Trader",
                    value: traderName.trim(),
                    behaviour: "inherited",
                    hint: "Read from the signed-in session, not entered. It is the same name §6.2 activity 2 later carries onto the purchase contract.",
                  },
                  { label: "Commodity", value: commodityById(commodityId)?.name ?? commodityId },
                  { label: "Origin country", value: origin ? countryName(origin) : undefined },
                  { label: "Indicative quantity", value: formatMt(safeNumber(quantity, 0)) },
                  { label: "Buyer", value: buyerId ? counterpartyName(buyerId) : "not yet named" },
                  { label: "Note", value: note.trim() },
                  {
                    label: "Stage",
                    value: (
                      <StatusChip tone={toneFor("identified")} label={humanise("identified")} size="sm" />
                    ),
                    behaviour: "calculated",
                    hint: "Derived from which artefacts exist — no status model is defined for an opportunity.",
                  },
                ]}
              />
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

/* ================================================================== *
 * PositionReport — /origination/position
 * ================================================================== */

interface PositionRow extends PositionLine {
  id: string;
}

export function PositionReport() {
  const contracts = useAsync(() => api.listContracts());
  const lots = useAsync(() => api.listStockLots());

  if (contracts.error || lots.error) {
    return (
      <div className="page">
        <ErrorState
          detail={contracts.error ?? lots.error ?? undefined}
          onRetry={() => {
            contracts.reload();
            lots.reload();
          }}
        />
      </div>
    );
  }

  const rows: PositionRow[] = positionReport(contracts.data ?? [], lots.data ?? []).map((l) => ({
    ...l,
    id: `${l.commodityId}|${l.origin}`,
  }));
  const shortLines = rows.filter((r) => r.positionMt < 0);
  const longLines = rows.filter((r) => r.positionMt >= 0);
  const loading = contracts.loading || lots.loading;

  const columns: Column<PositionRow>[] = [
    {
      key: "commodity",
      header: "Commodity",
      cell: (r) => commodityById(r.commodityId)?.name ?? r.commodityId,
      sortValue: (r) => commodityById(r.commodityId)?.name ?? r.commodityId,
    },
    {
      key: "origin",
      header: "Origin",
      cell: (r) => countryName(r.origin),
      sortValue: (r) => countryName(r.origin),
      filterOptions: COUNTRY_ORDER.map((c) => ({ value: c, label: countryName(c) })),
      filterMatch: (r, v) => r.origin === v,
    },
    {
      key: "contracted",
      header: "Contracted",
      align: "right",
      cell: (r) => formatMt(r.contractedMt),
      sortValue: (r) => r.contractedMt,
    },
    {
      key: "allocated",
      header: "Allocated",
      align: "right",
      cell: (r) => formatMt(r.allocatedMt),
      sortValue: (r) => r.allocatedMt,
    },
    {
      key: "ready",
      header: "Ready",
      align: "right",
      cell: (r) => formatMt(r.readyMt),
      sortValue: (r) => r.readyMt,
    },
    {
      key: "underprocess",
      header: "Under process",
      align: "right",
      cell: (r) => formatMt(r.underProcessMt),
      sortValue: (r) => r.underProcessMt,
      optional: true,
    },
    {
      key: "position",
      header: "Position",
      align: "right",
      cell: (r) => (
        <>
          <strong>{formatMt(r.positionMt)}</strong>{" "}
          <StatusChip
            tone={r.positionMt < 0 ? "risk" : "ok"}
            label={r.positionMt < 0 ? "short" : "long"}
            size="sm"
          />
        </>
      ),
      sortValue: (r) => r.positionMt,
    },
  ];

  return (
    <>
      <PageHeader
        moduleLabel="Origination & deals"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Origination", to: "/origination" },
          { label: "Long & short position" },
        ]}
        title="Long and short position"
        meta="v2.0 §6.1 input 1 and §6.6 output 2 — the reference for the traders' selling activities, by commodity and origin"
        recordKey={`${rows.length}`}
        recordDate="commodity and origin lines"
      />
      <div className="page">
        <Banner tone="info" title="Derived, never stored">
          Every figure here is computed from open purchase contracts and from stock — allocated (reserved),
          ready as finished good and under process — and nothing on this screen is held as a value. A negative
          position is short and passes to the sourcing team (v2.0 §6.6 exception 1):{" "}
          <Link to="/sourcing">sourcing</Link>. Closed and cancelled contracts are excluded, because they no
          longer demand cargo.
        </Banner>

        <div className="grid-2">
          <SummaryCard title="Short lines" tone={shortLines.length > 0 ? "risk" : "ok"}>
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Commodity and origin lines short",
                  value: <strong>{shortLines.length}</strong>,
                  behaviour: "calculated",
                },
                {
                  label: "Total shortfall",
                  value: formatMt(round(sum(shortLines.map((r) => Math.abs(r.positionMt))), 3)),
                  behaviour: "calculated",
                  hint: "Contracted quantity with no allocated or ready stock behind it.",
                },
              ]}
            />
          </SummaryCard>
          <SummaryCard title="Long lines" tone="ok">
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Commodity and origin lines long or level",
                  value: <strong>{longLines.length}</strong>,
                  behaviour: "calculated",
                },
                {
                  label: "Total uncommitted",
                  value: formatMt(round(sum(longLines.map((r) => r.positionMt)), 3)),
                  behaviour: "calculated",
                  hint: "Allocated and ready stock beyond what open contracts demand — what a trader can sell against.",
                },
              ]}
            />
          </SummaryCard>
        </div>

        <DataTable
          caption="Long and short position by commodity and origin"
          rows={rows}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search by commodity or origin…"
          searchValue={(r) =>
            `${commodityById(r.commodityId)?.name ?? r.commodityId} ${countryName(r.origin)}`
          }
          savedViews={[
            { key: "all", label: "Every line" },
            {
              key: "short",
              label: "Short only",
              description: "Contracted quantity with no cover — these pass to sourcing at Phase 06.",
              predicate: (r) => r.positionMt < 0,
            },
            {
              key: "long",
              label: "Long or level only",
              description: "Uncommitted stock a trader can sell against (v2.0 §6.1 trigger).",
              predicate: (r) => r.positionMt >= 0,
            },
          ]}
          emptyTitle="No position to report"
          emptyBody="No open contract and no stock lot exists for any commodity and origin."
        />

        <CollapsibleSection
          title="Short lines in detail"
          indicator={
            <StatusChip
              tone={shortLines.length > 0 ? "risk" : "ok"}
              label={`${shortLines.length} short`}
              size="sm"
            />
          }
        >
          {shortLines.length === 0 ? (
            <EmptyState title="Nothing short" glyph="✓">
              Every commodity and origin line has allocated or ready stock at least equal to what open
              contracts demand.
            </EmptyState>
          ) : (
            <ul className="doclist">
              {shortLines.map((r) => (
                <li key={r.id} className="required">
                  <span className="doclist__name">
                    {commodityById(r.commodityId)?.name ?? r.commodityId} — {countryName(r.origin)}
                    <span className="doclist__sub">
                      contracted {formatMt(r.contractedMt)} · allocated {formatMt(r.allocatedMt)} · ready{" "}
                      {formatMt(r.readyMt)} · under process {formatMt(r.underProcessMt)}
                    </span>
                  </span>
                  <StatusChip tone="risk" label={`short ${formatMt(Math.abs(r.positionMt))}`} size="sm" />
                  <Link className="btn btn--sm" to="/allocation">
                    Open stock
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="small muted" style={{ marginTop: "0.5rem" }}>
            v2.0 §6.1 exception: with no stock and no sourcing cover for the quantity, the opportunity is a
            short position and passes to sourcing (Phase 06). Under-process quantity is shown but is not
            counted as cover — "raw material cannot be allocated until processing is complete" (§6.6).
          </p>
        </CollapsibleSection>
      </div>
    </>
  );
}
