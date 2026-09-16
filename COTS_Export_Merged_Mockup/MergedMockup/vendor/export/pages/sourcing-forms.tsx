/**
 * Sourcing intake — the six add screens, one per sub-screen of the module.
 *
 * WHAT THESE ARE. The Material Management Portal documents an Add form for every one of
 * the six sourcing sub-screens — `New Fund Form` (`/Funds/Create`), `New Purchase
 * Agreement`, Receiving Locations with its `+ Add Plan` basket, Material Receipt,
 * Warehouse Receipt and `/AgentBalances/Create`. These are those six forms, in the same
 * order and with the same business words, so the people who fill them in every day
 * recognise them. Where the legacy behaviour differs it is named on the screen rather
 * than silently corrected — a replacement that quietly fixes a number teaches nobody
 * what changed.
 *
 * WHICH PHASE THIS SERVES. None of the sixteen. Workflow v2.0 §2.2 excludes the sourcing
 * season process and supplier funding from the export workflow by name. The module exists
 * because v2.0 §6.6 input 4 (with register C-24) builds the weekly production plan on raw
 * materials actually received, and §6.6 exception 1 sends a short position to sourcing.
 *
 * THE FOUR LEGACY DEFECTS THESE FORMS FIX, each stated on the form that fixes it:
 *   1. `Fund Ref` is not unique. MMP builds it from the purchase order and never checks
 *      it, so the captured data holds two records sharing `45643123`.
 *   2. The three per-bag weights are not on the MMP required list, yet every receipt
 *      booked against the agreement derives its packaging tare from them — a zero
 *      silently zeroes the tare on all of them.
 *   3. No allocation balance anywhere on Receiving Locations — no total, no agreed
 *      quantity, no remainder, so 10,000 + 15,700 MT sit against a 17,777 MT agreement
 *      with a third row's quantity blank.
 *   4. A receipt is saveable with no quantities, because the legacy form requires only
 *      the location and the receipt date.
 *
 * WHAT IS DELIBERATELY ABSENT. No derivation for either agent balance, no sign
 * convention and no `Flow Status` transition map: the source states none, so none is
 * asserted. Uploads are file names only — this prototype stores names, not files. Every
 * client-side rule below mirrors a refusal in `api.*`, and the store's `reason` is shown
 * verbatim whenever it still refuses.
 */

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Banner, EmptyState, ErrorState, StatusChip, useToast } from "../components/feedback";
import { CollapsibleSection, FieldGrid, PageHeader } from "../components/layout";
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
  COMMODITIES,
  COUNTERPARTIES,
  commodityById,
  commodityGroupOf,
  counterpartyById,
  deliveryLocationLabel,
  deliveryLocationsIn,
  receivingLocationCountries,
  receivingLocationLabel,
  receivingLocationsIn,
} from "../data/master";
import {
  TODAY,
  daysBetween,
  formatDate,
  formatMoney,
  formatMt,
  formatNumber,
  money,
  round,
  sum,
} from "../domain/calc";
import { exchangeRateOn, fxCoverage, fxCurrencies } from "../data/fx-rates";
import { budgetPlanId } from "../domain/planning";
import { humanise, toneFor } from "../domain/status";
import { COUNTRY_PROFILES, activeCountryOf } from "../domain/variants";
import {
  LB_PER_MT,
  LEGACY_LB_PER_MT_DIVISOR,
  allocationBalance,
  checkAllocationHeadroom,
  fundValueLocal,
  fundValueUsd,
  packagingWeight,
  qualityInspectionSummary,
  totalBags,
} from "../domain/sourcing";
import {
  activePlans,
  formatSeasonMonth,
  planCarriesCommodity,
  planCommodities,
  planTotals,
} from "../domain/planning";
import { AGREEMENT_QUALITY_TERMS_LABEL, DELIVERY_TERMS_LABEL } from "../domain/types";
import type {
  AgreementQualityTerms,
  CountryUnit,
  CurrencyCode,
  DeliveryTerms,
  FundMode,
  IntakeBagCounts,
  PurchaseAgreementAttachment,
  PurchaseAgreementFlowStatus,
  PurchaseAgreementType,
  QualityInspection,
  QualityInspectionResult,
  QualityInspectionUnit,
  ReceivingLocationKind,
  Seasonality,
} from "../domain/types";
import { api } from "../services/store";
import { useAsync } from "./hooks";

/* ------------------------------------------------------------------ *
 * Option lists the source states, and the ones it has no master for
 * ------------------------------------------------------------------ */

const FUND_MODES: { value: FundMode; label: string }[] = [
  { value: "finance", label: "Finance" },
  { value: "cash", label: "Cash" },
  { value: "barter", label: "Barter" },
];

/** MMP `Bank Name`, shown only when the mode is Finance. Three options, no master. */
const FUND_BANKS = ["Khartoum", "QNB", "Khaleeg"] as const;

/**
 * MMP `Flow Status`. The source spells the last one `Cancled`; normalised once here.
 *
 * `For Quality Inspection` is added by the instruction of 3 September 2026. It sits after
 * `On going` and before `Hold`, which is where the agreement is in the business — the
 * quantity is being inspected rather than paused or finished. Nothing sets it
 * automatically: no rule connects an inspection row to the flow status, so a user chooses
 * it, exactly as with every other value in this list. The source contains no transition
 * evidence at all, so no transition map is asserted for any of them.
 */
const FLOW_STATUSES: { value: PurchaseAgreementFlowStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "on_going", label: "On going" },
  { value: "for_quality_inspection", label: "For Quality Inspection" },
  { value: "hold", label: "Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

/**
 * `Agreement Type` — Fixed or Collection, added to the Edit screen's agreement card by
 * the instruction of 3 September 2026, which gives the default and the owner: *"by
 * default Fixed can be modified by Procurement Team"*.
 */
const AGREEMENT_TYPES: { value: PurchaseAgreementType; label: string }[] = [
  { value: "fixed", label: "Fixed" },
  { value: "collection", label: "Collection" },
];

/** `Results` on a quality inspection. The three values the instruction names. */
const INSPECTION_RESULTS: { value: QualityInspectionResult; label: string }[] = [
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "re_test", label: "Re-Test" },
];

const INSPECTION_UNITS: { value: QualityInspectionUnit; label: string }[] = [
  { value: "mt", label: "MT" },
  { value: "bags", label: "Bags" },
];

const RECEIPT_FROM: { value: "supplier" | "warehouse"; label: string }[] = [
  { value: "supplier", label: "Supplier" },
  { value: "warehouse", label: "Warehouse" },
];

const ATTACHMENT_SLOTS: { slot: PurchaseAgreementAttachment["slot"]; label: string }[] = [
  { slot: "pa_document", label: "Purchase agreement document" },
  { slot: "contract_document", label: "Contract document" },
  { slot: "delivery_note", label: "Delivery note" },
  { slot: "other", label: "Other attachment" },
];

/** MMP labels the field `Notes, Max 200 Letters` and does not enforce it. */
const NOTE_LIMIT = 200;

/** The agents and suppliers of the sourcing chain are the supplier counterparties. */
const SUPPLIERS = COUNTERPARTIES.filter((c) => c.type === "supplier");

const COMMODITY_OPTIONS = COMMODITIES.filter((c) => c.active).map((c) => ({
  value: c.id,
  label: `${c.name} (${c.code})`,
}));

const SUPPLIER_OPTIONS = SUPPLIERS.map((s) => ({ value: s.id, label: s.name }));

/* ------------------------------------------------------------------ *
 * Small local helpers. Nothing here derives a business figure — every
 * derivation comes from domain/sourcing.ts.
 * ------------------------------------------------------------------ */

function parseNumber(v: string): number | undefined {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** `ErrorSummary` takes a list; the record is keyed by the control's literal DOM id. */
function errorList(errors: Record<string, string>): { field: string; message: string }[] {
  return Object.entries(errors).map(([field, message]) => ({ field, message }));
}

/** Distinct, sorted, non-empty values from existing records — used where no master exists. */
function optionsFrom(values: (string | undefined)[]): { value: string; label: string }[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))]
    .sort()
    .map((v) => ({ value: v, label: v }));
}

/**
 * The counterparty master holds one `address` column with the telephone appended after
 * " · ", so MMP's read-only `Address` and `Phone` are both read out of it. There is no
 * separate phone column and none is invented.
 */
function agentContact(id: string): { address?: string; phone?: string } {
  const raw = id ? counterpartyById(id)?.address : undefined;
  if (!raw) return {};
  const parts = raw.split(" · ");
  return { address: parts[0], phone: parts[1] };
}

function commodityName(id?: string): string {
  return (id ? commodityById(id)?.name : undefined) ?? "–";
}

/** The two sourcing forms that now serve an Add and an Update screen. */
export type SourcingFormMode = "create" | "edit";

/** The loading / not-found frame both sourcing edit screens need before they hydrate. */
function SourcingEditGate({
  loading,
  error,
  reload,
  missing,
  missingTitle,
  backTo,
  backLabel,
  children,
}: {
  loading: boolean;
  error: string | null;
  reload: () => void;
  missing: boolean;
  missingTitle: string;
  backTo: string;
  backLabel: string;
  children: React.ReactNode;
}) {
  if (error) {
    return (
      <div className="page">
        <ErrorState detail={error} onRetry={reload} />
      </div>
    );
  }
  if (loading) {
    return (
      <div className="page">
        <div className="card card__body muted">Loading…</div>
      </div>
    );
  }
  if (missing) {
    return (
      <div className="page">
        <EmptyState
          title={missingTitle}
          action={
            <Link className="btn btn--primary" to={backTo}>
              {backLabel}
            </Link>
          }
        />
      </div>
    );
  }
  return <>{children}</>;
}

/* ================================================================== *
 * 1 — Fund · /sourcing/funds/new
 *          · /sourcing/funds/:id/edit
 *
 * Reshaped by the business instruction of 27 August 2026, which splits the
 * record across the two screens because a fund is **requested** before it is
 * **paid**:
 *
 *   Create   Seasonality · Agent (with its details) · Commodity ·
 *            Value in local currency · Required payment date
 *   Update   the above, plus PO number · Actual payment date ·
 *            Exchange rate (read only) · Mode of fund · Fund document
 *
 * `Purchase Order` is gone from Create entirely — it does not exist yet — and
 * `Payment Date` is now `Required payment date`, with the date payment was
 * actually made captured on Update beside it.
 *
 * The exchange rate is the interesting one. It is **not entered on either
 * screen**: it is read from `data/fx-rates.ts` for the fund's local currency on
 * its actual payment date. So a fund that has been requested and not paid has
 * no rate and no value in USD — and the screen says that rather than showing a
 * zero, because those are not the same thing.
 * ================================================================== */

export function FundForm({ mode }: { mode: SourcingFormMode }) {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const funds = useAsync(() => api.listFunds());
  const agreements = useAsync(() => api.listPurchaseAgreements());
  const balances = useAsync(() => api.listAgentBalances());
  const fund = useAsync(() => (mode === "edit" ? api.getFund(id) : Promise.resolve(undefined)), [id, mode]);
  const existing = mode === "edit" ? fund.data : undefined;

  /**
   * `?budget=<id>` — the New fund action the instruction of 3 September 2026 adds to the
   * Budget list, and the mechanism behind *"this will capture automatically the necessary
   * fields needed in creating new Fund screen."*
   *
   * A query parameter is how a prototype with no server session carries context between
   * two screens. In the real application this would be a server-side handoff; the point
   * that matters either way is stated on the screen: every prefilled field remains
   * editable, and nothing checks the fund back against the budget afterwards, because no
   * rule ties a fund's value to a budget line's amount.
   */
  const [searchParams] = useSearchParams();
  const fromBudgetId = mode === "create" ? (searchParams.get("budget") ?? "") : "";
  const budgets = useAsync(() => api.listBudgets());
  const seasonalPlans = useAsync(() => api.listSeasonalPurchasePlans());
  const sourceBudget = fromBudgetId ? (budgets.data ?? []).find((b) => b.id === fromBudgetId) : undefined;
  /** Which line of that budget the fund is being raised against. */
  const [sourceLineId, setSourceLineId] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  /* --- Create captures these five --- */
  const [seasonality, setSeasonality] = useState("");
  const [agentId, setAgentId] = useState("");
  const [commodityId, setCommodityId] = useState("");
  const [valueLocal, setValueLocal] = useState("");
  const [localCurrency, setLocalCurrency] = useState<CurrencyCode>("SDG");
  const [requiredPaymentDate, setRequiredPaymentDate] = useState<string>(TODAY);
  /* --- Update adds these --- */
  /*
   * THE PAYMENT IS NO LONGER CAPTURED HERE — 15 September 2026.
   *
   * *"The Payment card should be read only. The fund payment will be done in the screen of
   * Procurement tab."*
   *
   * So the four fields that make up a payment — the PO number, the issued amount, the actual
   * payment date and the payment slip — are held in no form state at all. They are read
   * straight off the record and rendered read-only. Keeping them in state and merely
   * disabling the inputs would leave this screen still able to send them, which is the
   * difference between a field a user cannot type in and a field this screen cannot write.
   *
   * The record is unchanged and so is `api.updateFund`, which still accepts all four: the
   * Procurement screen is where they will be written, and that screen is not touched here.
   */
  const purchaseOrderNo = existing?.purchaseOrderNo ?? "";
  const issuedPayment =
    existing?.issuedPaymentLocal === undefined ? "" : String(existing.issuedPaymentLocal);
  const actualPaymentDate = existing?.actualPaymentDate ?? "";
  const paymentSlipName = existing?.paymentSlipName ?? "";
  const [fundMode, setFundMode] = useState<FundMode | "">("");
  const [bankName, setBankName] = useState("");
  const [barterCommodityId, setBarterCommodityId] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [note, setNote] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const [saving, setSaving] = useState<false | "save" | "share">(false);
  const [hydrated, setHydrated] = useState(mode === "create");

  useEffect(() => {
    if (mode !== "edit" || !existing || hydrated) return;
    setSeasonality(existing.seasonality);
    setAgentId(existing.agentId);
    setCommodityId(existing.commodityId);
    setValueLocal(String(existing.valueLocal));
    setLocalCurrency(existing.localCurrency);
    setRequiredPaymentDate(existing.requiredPaymentDate);
    /* The four payment fields are not hydrated: they are read from the record where they are
       displayed, because this screen no longer writes them. */
    setFundMode(existing.mode ?? "");
    setBankName(existing.bankName ?? "");
    setBarterCommodityId(existing.barterCommodityId ?? "");
    setDocumentName(existing.documentName ?? "");
    setNote(existing.note ?? "");
    setHydrated(true);
  }, [mode, existing, hydrated]);

  const seasonOptions = optionsFrom([
    ...(funds.data ?? []).map((f) => f.seasonality),
    ...(agreements.data ?? []).map((a) => a.seasonality),
    ...(balances.data ?? []).map((b) => b.seasonality),
  ]);

  /**
   * What the budget says about the fund.
   *
   * `budgetLine` is the line the fund is being raised against — the one chosen on this
   * screen where the budget has several, and its only line where it has one.
   */
  const budgetLine =
    sourceBudget && sourceLineId
      ? sourceBudget.lines.find((l) => l.id === sourceLineId)
      : sourceBudget?.lines[0];
  const budgetPlan = sourceBudget
    ? (seasonalPlans.data ?? []).find((p) => p.id === budgetPlanId(sourceBudget))
    : undefined;

  /**
   * The seasonality, derived rather than asked for.
   *
   * The instruction of 3 September 2026 takes the Seasonality field off this screen: it is
   * already on the budget the fund is raised from, so asking for it again is asking the
   * user to restate something COTS knows — and to get it wrong. It is therefore read from
   * the budget, in this order of preference:
   *
   *   · the seasonal purchase plan the budget is written against, whose period is a From
   *     and a To month-and-year: `2026-2027`, or `2026` where the season does not cross a
   *     year boundary. This is the season in the business sense — the plan *is* the season;
   *   · failing that, the budget's own period dates, for a captured budget that names no
   *     plan. Less precise, always present, and honest about which of the two it used.
   *
   * §6.3 records that no seasonality master exists, so a fund's season has always been a
   * free string. That is what makes this derivation safe: there is no master to disagree
   * with. `seasonIsKnown` says only whether the derived string is one the held data
   * already uses, which the screen reports — a first fund in a new season is expected, not
   * an error.
   */
  const derivedSeason: Seasonality | undefined = (() => {
    if (budgetPlan) {
      return budgetPlan.from.year === budgetPlan.to.year
        ? String(budgetPlan.from.year)
        : `${budgetPlan.from.year}-${budgetPlan.to.year}`;
    }
    if (sourceBudget) {
      const from = sourceBudget.fromDate.slice(0, 4);
      const to = sourceBudget.toDate.slice(0, 4);
      return from === to ? from : `${from}-${to}`;
    }
    return undefined;
  })();
  const seasonFrom: "plan" | "period" | undefined = budgetPlan
    ? "plan"
    : sourceBudget
      ? "period"
      : undefined;
  const seasonIsKnown = Boolean(derivedSeason && seasonOptions.some((o) => o.value === derivedSeason));

  /**
   * The prefill, applied once, only on Create, and only when the list handed over a
   * budget. It never overwrites something the user has since typed — `prefilled` is the
   * latch that guarantees it. The seasonality is the one value here that is not a
   * convenience: with the field gone from the screen, this is where it comes from.
   */
  useEffect(() => {
    if (mode !== "create" || prefilled || !sourceBudget || !budgetLine) return;
    if (derivedSeason) setSeasonality(derivedSeason);
    if (budgetLine.supplierId) setAgentId(budgetLine.supplierId);
    if (budgetLine.commodityId) setCommodityId(budgetLine.commodityId);
    if (budgetLine.amount) {
      setValueLocal(String(budgetLine.amount.amount));
      setLocalCurrency(budgetLine.amount.currency);
    }
    setPrefilled(true);
  }, [mode, prefilled, sourceBudget, budgetLine, derivedSeason]);

  const contact = agentContact(agentId);
  const value = parseNumber(valueLocal);

  /** Read, never entered — the rate in force on the actual payment date. */
  const rate = exchangeRateOn(localCurrency, actualPaymentDate || undefined);
  const issued = parseNumber(issuedPayment);
  /**
   * The amount the conversion divides. The instruction of 3 September 2026 is explicit —
   * *"the calculation of usd conversion is based on the Issued Payment amount"* — so the
   * issued amount governs where one has been entered, and the value requested on the
   * Create screen is the fallback where it has not.
   */
  const convertedFrom = issued ?? value;
  const usd =
    convertedFrom !== undefined && rate ? money(round(convertedFrom / rate.perUsd, 2), "USD") : undefined;
  /** What the issued amount differs from the value requested by. Reported, never refused. */
  const issuedVariance =
    issued !== undefined && value !== undefined ? round(issued - value, 2) : undefined;
  const coverage = fxCoverage(localCurrency);
  const delayDays =
    actualPaymentDate && requiredPaymentDate
      ? daysBetween(requiredPaymentDate, actualPaymentDate)
      : undefined;

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!seasonality) {
      /* On Create there is no Seasonality field to point at, so the message names what
         actually has to be fixed: the budget this fund is being raised from. */
      next["fd-season"] =
        mode === "create"
          ? "This fund has no seasonality, because none could be read from the budget it is being raised from. A fund's season comes from the budget's seasonal purchase plan, or failing that from the budget period. Raise the fund from a budget that has one."
          : "Select the seasonality.";
    }
    if (!agentId) next["fd-agent"] = "Select an agent.";
    if (!commodityId) next["fd-commodity"] = "Select the commodity.";
    if (!requiredPaymentDate) next["fd-required-date"] = "Enter the required payment date.";
    if (value === undefined) next["fd-value"] = "Enter the value in local currency.";
    else if (value <= 0) next["fd-value"] = "The value in local currency must be above zero.";
    if (mode === "edit") {
      /* The issued-amount and payment-date checks went with the inputs on 15 September 2026.
         Neither can be typed on this screen any more, so a message here would be telling the
         user to fix something they cannot reach; the missing-rate case is stated on the
         read-only Exchange rate row instead. Both rules still belong with the fields, which
         means they belong on the Procurement screen when that screen takes the payment. */
      if (fundMode === "finance" && !bankName.trim()) {
        next["fd-bank"] = "A fund settled under Finance records the bank that provided it.";
      }
      if (fundMode === "barter" && !barterCommodityId) {
        next["fd-barter"] = "A barter fund records the commodity being bartered.";
      }
    }
    if (note.length > NOTE_LIMIT) {
      next["fd-note"] = `The note is limited to ${NOTE_LIMIT} characters; this one is ${note.length}.`;
    }
    return next;
  }

  async function submit(e: React.FormEvent, share: boolean) {
    e.preventDefault();
    setRefusal(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(share ? "share" : "save");
    const res =
      mode === "create"
        ? await api.createFund({
            seasonality: seasonality as Seasonality,
            agentId,
            commodityId,
            requiredPaymentDate,
            valueLocal: value as number,
            localCurrency,
            note: note.trim() || undefined,
            updatedBy: user?.username ?? "unknown",
            share,
          })
        : await api.updateFund(id, {
            seasonality: seasonality as Seasonality,
            agentId,
            commodityId,
            /* purchaseOrderNo, issuedPaymentLocal, actualPaymentDate and paymentSlipName are
               deliberately absent. `updateFund` takes a partial and assigns only the keys it
               is given, so leaving them out means this screen cannot touch them — including
               cannot blank them. */
            requiredPaymentDate,
            valueLocal: value as number,
            localCurrency,
            mode: fundMode || undefined,
            bankName: fundMode === "finance" ? bankName.trim() : undefined,
            barterCommodityId: fundMode === "barter" ? barterCommodityId : undefined,
            documentName: documentName.trim() || undefined,
            note: note.trim() || undefined,
            updatedBy: user?.username ?? "unknown",
            share,
          });
    setSaving(false);
    if (!res.ok) {
      setRefusal(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    const savedUsd = fundValueUsd(res.value);
    toast.push(
      "ok",
      `${mode === "create" ? `Fund ${res.value.fundRef} requested` : `${res.value.fundRef} updated`} — ` +
        `${formatMoney(fundValueLocal(res.value))} for ${counterpartyById(res.value.agentId)?.name ?? "the agent"}, ` +
        `required by ${formatDate(res.value.requiredPaymentDate)}. ` +
        (savedUsd
          ? `Paid ${formatDate(res.value.actualPaymentDate)} at the rate in force that day — ${formatMoney(savedUsd)}.`
          : "Not yet paid, so no exchange rate applies and there is no value in USD.") +
        (share
          ? " Marked as shared — the stakeholders to notify are configured in the system later, so no email was sent."
          : ""),
    );
    navigate("/sourcing/funds");
  }

  const summary = errorList(errors);
  const listTo = "/sourcing/funds";

  const body = (
    <>
      <PageHeader
        moduleLabel="Sourcing intake"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Sourcing intake", to: "/sourcing" },
          { label: "Funds", to: listTo },
          { label: mode === "create" ? "New fund" : `Edit ${existing?.fundRef ?? ""}` },
        ]}
        title={mode === "create" ? "New fund" : `Edit ${existing?.fundRef ?? "fund"}`}
        meta={
          <>
            {user ? `${user.displayName} · ${user.unit}` : ""} ·{" "}
            {mode === "create" ? (
              <>created {formatDate(TODAY)} · the fund reference is issued on save</>
            ) : (
              <>
                {existing?.actualPaymentDate
                  ? `paid ${formatDate(existing.actualPaymentDate)}`
                  : "requested, not yet paid"}
                {existing?.updatedOn
                  ? ` · last changed ${formatDate(existing.updatedOn)} by ${existing.updatedBy ?? "unknown"}`
                  : ""}
              </>
            )}
          </>
        }
        recordKey={mode === "create" ? "MMP" : (existing?.fundRef ?? "fund")}
        recordDate={mode === "create" ? "new fund form" : "editing this fund"}
      />

      <div className="page">
        <Banner
          tone="info"
          title={
            mode === "create"
              ? "A fund is requested here, and paid on the Update screen"
              : "The Update screen carries what happened after the fund was requested"
          }
        >
          The instruction of 27 August 2026 splits the fund across its two screens. Create captures the
          request — the seasonality, the agent, the commodity, the value in local currency and the date
          payment is <em>required</em> by. Update adds what only exists afterwards: the{" "}
          <strong>PO number</strong>, the <strong>actual payment date</strong>, the{" "}
          <strong>mode of fund</strong> and the <strong>fund document</strong>.{" "}
          {mode === "create" ? (
            <>
              <em>Purchase Order</em> is not on this screen at all, because it has not been issued yet.
            </>
          ) : (
            <>
              <em>Purchase Order</em> appears here and not on Create, for the same reason.
            </>
          )}
        </Banner>

        <Banner tone="warn" title="The exchange rate is read, not entered">
          It is the rate in force for the fund's local currency <strong>on its actual payment date</strong>,
          read from the rate table — so it is a read-only field on the Update screen and does not appear on
          Create at all. Until a payment date is recorded there is no rate and{" "}
          <strong>no value in USD</strong>, which the screen shows as such rather than as zero.{" "}
          <strong>The rates behind this are dummy figures.</strong> In the real application they will come
          from an API; the prototype holds a small monthly table instead, purely to show the behaviour. Every
          screen reads it through one function, so replacing it is a one-place change. What the API contract
          will still need to settle: whether the rate is daily or monthly (this stand-in is monthly, read
          forward, so a payment on the 18th uses the 1st's rate), which published rate it is, and what a
          payment dated outside what the source can answer for should do — refused here, rather than quietly
          falling back to the nearest rate held. The stand-in runs from {formatDate(coverage.from)} to{" "}
          {formatDate(coverage.to)} for {localCurrency}.
        </Banner>

        {refusal ? (
          <Banner tone="risk" title="The service layer refused this fund">
            {refusal}
          </Banner>
        ) : null}

        <form className="stack" onSubmit={(e) => submit(e, false)} noValidate>
          <ErrorSummary
            errors={summary}
            title={mode === "create" ? "This fund could not be created" : "These changes could not be saved"}
          />
          <RequiredLegend />

          {mode === "create" && !fromBudgetId ? (
            <Banner
              tone="warn"
              title="This screen is reached from a budget, and no budget was named"
            >
              The instruction of 3 September 2026 removed the New Fund button from{" "}
              <Link to="/sourcing">the funds list</Link> and put a{" "}
              <strong>New fund</strong> action on each row of{" "}
              <Link to="/sourcing/budgets">the Budget list</Link> instead, so that the fund arrives
              knowing the season, the agent, the commodity and the value it is being raised for. Opened
              without a budget — by typing the address, or from a saved link — this form has none of
              that, and in particular it has <strong>no seasonality</strong>: that field is no longer on
              this screen, because the budget already carries it.
              <br />
              <br />
              You can still fill the rest in by hand, but the fund cannot be saved without a season, so{" "}
              <Link to="/sourcing/budgets">start from the budget</Link> the fund is for. The route is
              deliberately left working rather than blocked: it is the address the Budget list itself
              uses, and a form that refuses to render is harder to diagnose than one that says what is
              missing.
            </Banner>
          ) : null}

          {mode === "create" && fromBudgetId && !sourceBudget && !budgets.loading ? (
            <Banner tone="risk" title={`Budget ${fromBudgetId} is not held`}>
              The address names a budget that does not exist — most likely a link kept after the record
              was removed. Nothing has been prefilled and no season could be read.{" "}
              <Link to="/sourcing/budgets">Choose a budget from the list</Link> and raise the fund from
              there.
            </Banner>
          ) : null}

          {mode === "create" && sourceBudget ? (
            <CollapsibleSection
              title={`Started from budget ${sourceBudget.budgetRef}`}
              defaultOpen
              indicator={<StatusChip tone="info" label="fields prefilled" size="sm" />}
            >
              <Banner tone="info" title="Where the values below came from, and what they oblige">
                You arrived here from the <strong>New fund</strong> action on{" "}
                <Link to={`/sourcing/budgets/${sourceBudget.id}`}>{sourceBudget.budgetRef}</Link>, which the
                instruction of 3 September 2026 adds so that the fund screen opens with the fields it can
                know already filled in. <strong>Every one of them is editable</strong>, and nothing checks
                the fund back against the budget after it is saved: no rule ties a fund's value to a budget
                line's amount, so this is a starting point and not a constraint.
              </Banner>

              {sourceBudget.lines.length > 1 ? (
                <div className="fields">
                  <FormRow
                    label="Budget line to raise this fund against"
                    htmlFor="fd-budget-line"
                    hint="The budget carries a line per commodity, and a line names the supplier and the amount. Choose the one this fund is for; the fields below follow it."
                  >
                    <SelectInput
                      id="fd-budget-line"
                      value={sourceLineId || (sourceBudget.lines[0]?.id ?? "")}
                      onChange={(v) => {
                        setSourceLineId(v);
                        /* Choosing another line re-runs the prefill from it. */
                        setPrefilled(false);
                      }}
                      options={sourceBudget.lines.map((l) => ({
                        value: l.id,
                        label:
                          `${commodityName(l.commodityId)} — ` +
                          `${l.quantityMt === undefined ? "no quantity" : formatMt(l.quantityMt)}, ` +
                          `${l.amount ? formatMoney(l.amount) : "no amount"}, ` +
                          `${l.supplierId ? counterpartyById(l.supplierId)?.name ?? l.supplierId : "no supplier"}`,
                      }))}
                    />
                  </FormRow>
                </div>
              ) : null}

              <FieldGrid
                columns={3}
                fields={[
                  {
                    label: "Budget",
                    value: (
                      <Link className="mono" to={`/sourcing/budgets/${sourceBudget.id}`}>
                        {sourceBudget.budgetRef}
                      </Link>
                    ),
                    behaviour: "inherited",
                  },
                  {
                    label: "Budget period",
                    value: `${formatDate(sourceBudget.fromDate)} – ${formatDate(sourceBudget.toDate)}`,
                    behaviour: "inherited",
                  },
                  {
                    label: "Plan it is written against",
                    value: budgetPlan?.planRef,
                    behaviour: "inherited",
                  },
                  {
                    label: "Seasonality",
                    value: derivedSeason ? (
                      <>
                        {derivedSeason}{" "}
                        {seasonIsKnown ? null : (
                          <StatusChip
                            tone="info"
                            label="first fund in this season"
                            size="sm"
                            title="No fund, agreement or agent balance held today uses this season. That is expected at the start of a season, not an error — §6.3 records that no seasonality master exists, so a season is a free string."
                          />
                        )}
                      </>
                    ) : undefined,
                    behaviour: "inherited",
                    hint:
                      seasonFrom === "plan"
                        ? `Read from ${budgetPlan?.planRef ?? "the plan"}, whose seasonal period runs ${formatSeasonMonth(budgetPlan?.from)} to ${formatSeasonMonth(budgetPlan?.to)}. The Seasonality field has been taken off this screen — the season is already on the budget, and asking for it again is asking for it to be got wrong.`
                        : seasonFrom === "period"
                          ? "Read from the budget period, because this budget names no seasonal purchase plan to read a season from. Less precise than a plan's own period, and it is stated here rather than asked for again."
                          : "No budget to read a season from.",
                  },
                  {
                    label: "Agent, from the budget line",
                    value: budgetLine?.supplierId
                      ? counterpartyById(budgetLine.supplierId)?.name
                      : undefined,
                    behaviour: "inherited",
                    hint: "The budget line's supplier. A fund is raised for an agent, and the budget line names one.",
                  },
                  {
                    label: "Commodity, from the budget line",
                    value: budgetLine?.commodityId ? commodityName(budgetLine.commodityId) : undefined,
                    behaviour: "inherited",
                  },
                  {
                    label: "Amount, from the budget line",
                    value: budgetLine?.amount ? formatMoney(budgetLine.amount) : undefined,
                    behaviour: "inherited",
                    hint: "Prefilled as the value in local currency. Nothing requires the fund to be raised for the whole budgeted amount, or for the currency to stay as the budget holds it.",
                  },
                  {
                    label: "Required payment date",
                    value: undefined,
                    hint: "Not prefilled: a budget holds a period, not a date payment is required by, and reading one off the period would be an invention. It defaults to today below.",
                  },
                ]}
              />
            </CollapsibleSection>
          ) : null}

          <CollapsibleSection title="The request" defaultOpen>
            <div className="fields">
              {/* Seasonality is not on this screen as of 3 September 2026. On Create it is
                  read from the budget the fund is raised from — see the card above, which
                  shows it and says which part of the budget it came from. On Update it
                  stays, because a captured fund may carry a season that needs correcting
                  and the instruction names the new-fund screen only. */}
              {mode === "edit" ? (
                <FormRow
                  label="Seasonality"
                  htmlFor="fd-season"
                  required
                  error={errors["fd-season"]}
                  hint="No seasonality master exists in the source, so the options are the seasons already held on funds, agreements and balances. This field is on the Update screen only: a new fund takes its season from the budget it is raised from."
                >
                  <SelectInput
                    id="fd-season"
                    value={seasonality}
                    onChange={setSeasonality}
                    required
                    error={errors["fd-season"]}
                    placeholder="Select a season…"
                    options={seasonOptions}
                  />
                </FormRow>
              ) : null}

              <FormRow label="Agent" htmlFor="fd-agent" required error={errors["fd-agent"]}>
                <SelectInput
                  id="fd-agent"
                  value={agentId}
                  onChange={setAgentId}
                  required
                  error={errors["fd-agent"]}
                  placeholder="Select an agent…"
                  options={SUPPLIER_OPTIONS}
                />
              </FormRow>

              <FormRow
                label="Address"
                htmlFor="fd-address"
                behaviour="readonly"
                hint="Filled from the agent record — the “agent details” the instruction names."
              >
                <TextInput id="fd-address" value={contact.address ?? ""} onChange={() => {}} disabled />
              </FormRow>

              <FormRow
                label="Phone"
                htmlFor="fd-phone"
                behaviour="readonly"
                hint="The counterparty master holds one address column with the telephone appended, so the phone is read out of it. There is no separate phone column and none is invented."
              >
                <TextInput id="fd-phone" value={contact.phone ?? ""} onChange={() => {}} disabled />
              </FormRow>

              <FormRow label="Commodity" htmlFor="fd-commodity" required error={errors["fd-commodity"]}>
                <SelectInput
                  id="fd-commodity"
                  value={commodityId}
                  onChange={setCommodityId}
                  required
                  error={errors["fd-commodity"]}
                  placeholder="Select a commodity…"
                  options={COMMODITY_OPTIONS}
                />
              </FormRow>

              <FormRow
                label="Value in local currency"
                htmlFor="fd-value"
                required
                error={errors["fd-value"]}
                hint="The amount as the agent is paid it. The value in USD is derived from it and the rate on the actual payment date."
              >
                <TextInput
                  id="fd-value"
                  value={valueLocal}
                  onChange={setValueLocal}
                  required
                  error={errors["fd-value"]}
                  inputMode="decimal"
                />
              </FormRow>

              <FormRow
                label="Local currency"
                htmlFor="fd-currency"
                hint="SDG throughout the captured data. Held explicitly so an operating unit with another currency needs no new field."
              >
                <SelectInput
                  id="fd-currency"
                  value={localCurrency}
                  onChange={setLocalCurrency}
                  options={fxCurrencies().map((c) => ({ value: c, label: c }))}
                />
              </FormRow>

              <FormRow
                label="Required payment date"
                htmlFor="fd-required-date"
                required
                error={errors["fd-required-date"]}
                hint="The date payment is required by. This replaces the legacy Payment Date, which did not distinguish the date asked for from the date paid."
              >
                <TextInput
                  id="fd-required-date"
                  type="date"
                  value={requiredPaymentDate}
                  onChange={setRequiredPaymentDate}
                  required
                  error={errors["fd-required-date"]}
                />
              </FormRow>

              {mode === "create" ? (
                <FormRow
                  label="Fund ref"
                  htmlFor="fd-ref"
                  behaviour="readonly"
                  hint="Issued on save as FND-<year>-<sequence>. MMP built it from the purchase order, which this screen no longer captures."
                >
                  <div id="fd-ref" className="muted small">
                    Issued on save
                  </div>
                </FormRow>
              ) : null}
            </div>
          </CollapsibleSection>

          {mode === "edit" ? (
            <>
              <CollapsibleSection title="The payment" defaultOpen>
                {/*
                  READ ONLY FROM 15 SEPTEMBER 2026.

                  *"The Payment card should be read only. The fund payment will be done in the
                  screen of Procurement tab."* The card still shows the payment, because the
                  fund is where a person looks for it and the four derived rows beneath depend
                  on it — but nothing in it can be typed, and the form no longer sends any of
                  the four values.

                  One home per fact: until today the PO number, the issued amount, the payment
                  date and the slip could be written from here AND from Procurement, and the
                  workbook of 3 September had already raised the question this settles —
                  "whether the payment recorded on the order is the same payment the fund
                  records, and if so which of the two is the record". The order is the record.
                */}
                <Banner tone="info" title="Recorded on the purchase order, not here">
                  The payment against this fund is captured on the{" "}
                  <strong>Procurement</strong> screen, which records it against the purchase
                  order. Everything below is shown as it stands on the record.
                  {purchaseOrderNo ? (
                    <>
                      {" "}
                      <Link to={`/sourcing/procurement?po=${encodeURIComponent(purchaseOrderNo)}`}>
                        Open {purchaseOrderNo}
                      </Link>
                      .
                    </>
                  ) : (
                    " No purchase order has been issued against it yet."
                  )}
                </Banner>
                <div className="fields">
                  <FormRow
                    label="PO number"
                    htmlFor="fd-po"
                    behaviour="readonly"
                    hint="Issued after the fund is requested. Recorded on the purchase order."
                  >
                    <div id="fd-po">
                      {purchaseOrderNo ? (
                        <strong>{purchaseOrderNo}</strong>
                      ) : (
                        <span className="muted">not issued yet</span>
                      )}
                    </div>
                  </FormRow>

                  {/* Issued Payment Amount sits immediately before the actual payment
                      date, exactly where the instruction of 3 September 2026 places it —
                      and it is the amount the conversion below divides. */}
                  <FormRow
                    label="Issued payment amount"
                    htmlFor="fd-issued"
                    behaviour="readonly"
                    hint={`In ${localCurrency}, as it was actually issued — the figure the USD conversion below divides, not the value requested on the Create screen. The two can differ and nothing requires them to agree.`}
                  >
                    <div id="fd-issued">
                      {issued !== undefined ? (
                        <>
                          <strong>{formatNumber(issued)}</strong>{" "}
                          <span className="small muted">{localCurrency}</span>
                        </>
                      ) : (
                        <span className="muted">not recorded yet</span>
                      )}
                    </div>
                  </FormRow>

                  <FormRow
                    label="Actual payment date"
                    htmlFor="fd-actual-date"
                    behaviour="readonly"
                    hint="The date payment was made. Recording it is what gives the fund an exchange rate and a value in USD."
                  >
                    <div id="fd-actual-date">
                      {actualPaymentDate ? (
                        <strong>{formatDate(actualPaymentDate)}</strong>
                      ) : (
                        <span className="muted">not paid yet</span>
                      )}
                    </div>
                  </FormRow>

                  <FormRow
                    label="Payment slip"
                    htmlFor="fd-slip"
                    behaviour="readonly"
                    hint="The slip evidencing the payment. Separate from the Fund document below, which evidences the fund rather than the payment."
                  >
                    <div id="fd-slip">
                      {paymentSlipName ? (
                        <strong>{paymentSlipName}</strong>
                      ) : (
                        <span className="muted">none attached</span>
                      )}
                    </div>
                  </FormRow>

                  <FormRow
                    label="Exchange rate"
                    htmlFor="fd-rate"
                    behaviour="readonly"
                    hint="Read only. The rate in force for this currency on the actual payment date, taken from the rate table — never typed."
                  >
                    <div id="fd-rate" aria-live="polite">
                      {rate ? (
                        <>
                          <strong>{formatNumber(rate.perUsd)}</strong>{" "}
                          <span className="small muted">
                            {localCurrency} per USD · in force from {formatDate(rate.effectiveFrom)}
                          </span>
                        </>
                      ) : (
                        <span className="muted">
                          {actualPaymentDate
                            ? `No rate is held for ${localCurrency} on ${formatDate(actualPaymentDate)}.`
                            : "No actual payment date yet, so no rate applies."}
                        </span>
                      )}
                    </div>
                  </FormRow>

                  <FormRow
                    label="Value in USD"
                    htmlFor="fd-usd"
                    behaviour="calculated"
                    hint="The issued payment amount ÷ the rate above, as the instruction of 3 September 2026 states. Where no issued amount has been entered the value requested is divided instead, so a captured fund that predates the field still converts."
                  >
                    <div id="fd-usd" aria-live="polite">
                      {usd ? (
                        <>
                          <strong>{formatMoney(usd)}</strong>{" "}
                          <span className="small muted">
                            from the{" "}
                            {issued !== undefined ? "issued payment amount" : "value requested"} of{" "}
                            {formatNumber(convertedFrom)} {localCurrency}
                          </span>
                        </>
                      ) : (
                        <span className="muted">not until the fund is paid</span>
                      )}
                    </div>
                  </FormRow>

                  <FormRow
                    label="Issued against the value requested"
                    htmlFor="fd-issued-variance"
                    behaviour="calculated"
                    hint="Ours, and an observation only: nothing states that the amount issued must match the value requested, so nothing is refused, escalated or flagged."
                  >
                    <div id="fd-issued-variance" aria-live="polite">
                      {issuedVariance === undefined ? (
                        <span className="muted">no issued payment amount recorded</span>
                      ) : issuedVariance === 0 ? (
                        <StatusChip tone="ok" label="issued in full" size="sm" />
                      ) : issuedVariance < 0 ? (
                        <StatusChip
                          tone="warn"
                          label={`${formatNumber(Math.abs(issuedVariance))} ${localCurrency} short`}
                          size="sm"
                        />
                      ) : (
                        <StatusChip
                          tone="warn"
                          label={`${formatNumber(issuedVariance)} ${localCurrency} over`}
                          size="sm"
                        />
                      )}
                    </div>
                  </FormRow>

                  <FormRow
                    label="Paid against the required date"
                    htmlFor="fd-delay"
                    behaviour="calculated"
                    hint="Ours, and an observation only: the instruction states no rule for a late payment, so nothing is refused, escalated or flagged."
                  >
                    <div id="fd-delay" aria-live="polite">
                      {delayDays === undefined ? (
                        <span className="muted">not yet paid</span>
                      ) : delayDays === 0 ? (
                        <StatusChip tone="ok" label="paid on the required date" size="sm" />
                      ) : delayDays < 0 ? (
                        <StatusChip tone="ok" label={`${Math.abs(delayDays)} day(s) early`} size="sm" />
                      ) : (
                        <StatusChip tone="warn" label={`${delayDays} day(s) late`} size="sm" />
                      )}
                    </div>
                  </FormRow>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Mode of fund and document" defaultOpen>
                <div className="fields">
                  <FormRow
                    label="Mode of fund"
                    htmlFor="fd-mode"
                    error={errors["fd-mode"]}
                    hint="Finance, Cash or Barter — how the fund was settled, which is not known when it is requested. The mode decides which of the two fields below applies."
                  >
                    <SelectInput
                      id="fd-mode"
                      value={fundMode}
                      onChange={setFundMode}
                      error={errors["fd-mode"]}
                      placeholder="Not recorded yet"
                      options={FUND_MODES}
                    />
                  </FormRow>

                  {fundMode === "finance" ? (
                    <FormRow
                      label="Bank name"
                      htmlFor="fd-bank"
                      required
                      error={errors["fd-bank"]}
                      hint="Khartoum, QNB or Khaleeg — the three options the legacy dropdown offers. There is no bank master."
                    >
                      <SelectInput
                        id="fd-bank"
                        value={bankName}
                        onChange={setBankName}
                        required
                        error={errors["fd-bank"]}
                        placeholder="Select a bank…"
                        options={FUND_BANKS.map((x) => ({ value: x, label: x }))}
                      />
                    </FormRow>
                  ) : null}

                  {fundMode === "barter" ? (
                    <FormRow
                      label='Commodities "Barter"'
                      htmlFor="fd-barter"
                      required
                      error={errors["fd-barter"]}
                      hint="The commodity given in exchange. Required for a barter fund; the service layer refuses one without it."
                    >
                      <SelectInput
                        id="fd-barter"
                        value={barterCommodityId}
                        onChange={setBarterCommodityId}
                        required
                        error={errors["fd-barter"]}
                        placeholder="Select a commodity…"
                        options={COMMODITY_OPTIONS}
                      />
                    </FormRow>
                  ) : null}

                  <FormRow
                    label="Fund document"
                    htmlFor="fd-doc"
                    hint="A file name only. This prototype stores names, not files, so nothing is uploaded — the legacy limit is 5 MB."
                  >
                    <TextInput
                      id="fd-doc"
                      value={documentName}
                      onChange={setDocumentName}
                      placeholder="e.g. fund-transfer.pdf"
                    />
                  </FormRow>
                </div>
                {fundMode ? (
                  <p className="small" style={{ marginTop: "0.5rem" }}>
                    <StatusChip tone={toneFor(fundMode)} label={humanise(fundMode)} size="sm" />{" "}
                    {fundMode === "cash"
                      ? "The source never says which fields apply when the mode is Cash, so neither conditional field is shown and neither is required."
                      : "Only the field the mode calls for is shown; the other is not stored."}
                  </p>
                ) : null}
              </CollapsibleSection>
            </>
          ) : null}

          <CollapsibleSection title="Notes" defaultOpen={false}>
            <FormRow
              label="Notes"
              htmlFor="fd-note"
              error={errors["fd-note"]}
              hint={`The legacy label reads "Notes, Max 200 Letters" and the form does not enforce it. It is enforced here.`}
            >
              <TextArea id="fd-note" value={note} onChange={setNote} rows={3} error={errors["fd-note"]} />
            </FormRow>
            <p className="xsmall muted" aria-live="polite">
              {note.length} of {NOTE_LIMIT} characters used.
            </p>
          </CollapsibleSection>

          <FormActions>
            <button type="submit" className="btn btn--primary" disabled={Boolean(saving)}>
              {saving === "save" ? "Saving…" : mode === "create" ? "Save" : "Save changes"}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={Boolean(saving)}
              onClick={(e) => submit(e, true)}
            >
              {saving === "share" ? "Saving & sharing…" : "Save & share"}
            </button>
            <Link className="btn" to={listTo}>
              Cancel
            </Link>
            <p className="muted small">
              {summary.length > 0
                ? `${summary.length} field${summary.length === 1 ? "" : "s"} need attention.`
                : "Save records the fund. Save & share records it and marks it for notification — the stakeholders to notify are configured in the system later, so this prototype sends no email and names no recipient."}
            </p>
          </FormActions>
        </form>
      </div>
    </>
  );

  if (mode === "create") return body;
  return (
    <SourcingEditGate
      loading={fund.loading || (Boolean(existing) && !hydrated)}
      error={fund.error}
      reload={fund.reload}
      missing={!fund.loading && !existing}
      missingTitle="Fund not found"
      backTo={listTo}
      backLabel="Back to funds"
    >
      {body}
    </SourcingEditGate>
  );
}

/* ================================================================== *
 * 2 — Purchase agreement · /sourcing/agreements/new
 *                        · /sourcing/agreements/:id/edit
 *
 * Reshaped by the business instruction of 27 August 2026:
 *   · **no Purchase Order on Add.** It is issued after the agreement is struck,
 *     so it moves to a new Update screen — MMP had no edit form for an
 *     agreement at all — and the reference becomes `PA-<year>-<sequence>`;
 *   · **the commodity comes from a seasonal purchase plan.** Choose an active
 *     plan and the Commodity list offers only the commodities that plan
 *     carries. This is the first link between the origin-side intake chain and
 *     phases 01–02;
 *   · **Flow Status defaults to Open** where nothing is chosen;
 *   · **Agreement date defaults to today**;
 *   · **the three per-bag weights sit behind an `Is Applicable` checkbox.**
 *     Ticked, they are mandatory; unticked, they are not captured at all.
 *
 * That last one fixes something the captured MMP data demonstrates. The weights
 * were always required-ish and never checked, so "no per-bag tare applies" and
 * "somebody left it at zero" were the same record — and a zero silently zeroed
 * the packaging tare on every receipt booked against the agreement. With the
 * flag, a zero tare is a statement rather than an accident.
 * ================================================================== */

/**
 * One drafted quality-inspection row.
 *
 * Held as strings, like every other draft in this file, so a half-typed number or an
 * unchosen result is a state the form can be in without the record being able to be.
 */
interface DraftInspection {
  key: string;
  commodityTypeId: string;
  supplierLocation: string;
  estimatedQuantity: string;
  estimatedQuantityUnit: QualityInspectionUnit;
  actualTestDate: string;
  result: QualityInspectionResult | "";
  note: string;
  recordedOn?: string;
  recordedBy?: string;
}

export function PurchaseAgreementForm({ mode }: { mode: SourcingFormMode }) {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const agreements = useAsync(() => api.listPurchaseAgreements());
  const funds = useAsync(() => api.listFunds());
  const balances = useAsync(() => api.listAgentBalances());
  const plans = useAsync(() => api.listSeasonalPurchasePlans());
  const agreement = useAsync(
    () => (mode === "edit" ? api.getPurchaseAgreement(id) : Promise.resolve(undefined)),
    [id, mode],
  );
  const existing = mode === "edit" ? agreement.data : undefined;

  const [seasonality, setSeasonality] = useState("");
  const [seasonalPlanId, setSeasonalPlanId] = useState("");
  const [commodityId, setCommodityId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  /**
   * The purchaser, read and not asked for.
   *
   * The instruction of 3 September 2026 removes the field from the Add and Update screens.
   * On Add it was already pre-filled with the signed-in user's display name, so the field
   * was offering to let somebody record an agreement as though another person had struck
   * it — which is the one thing a purchaser field should not allow. It is now read from
   * the session, exactly as the receiving-location country is.
   *
   * On Update the **captured** purchaser is kept, not the editor's name: editing an
   * agreement is not taking it over, and overwriting the name would quietly rewrite who
   * struck the deal. That is why this is state hydrated from the record rather than
   * simply `user.displayName` everywhere.
   */
  const [purchaser, setPurchaser] = useState(user?.displayName ?? "");
  const [totalQuantityMt, setTotalQuantityMt] = useState("");
  /* --- The five fields of 15 September 2026 --- */
  const [priceAmount, setPriceAmount] = useState("");
  const [sourcingLocation, setSourcingLocation] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState<DeliveryTerms | "">("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [qualityTerms, setQualityTerms] = useState<AgreementQualityTerms | "">("");
  /* Open by default, as the instruction states. */
  const [flowStatus, setFlowStatus] = useState<PurchaseAgreementFlowStatus>("open");
  /* Today by default, as the instruction states. */
  const [agreementDate, setAgreementDate] = useState<string>(TODAY);
  const [bagWeightApplicable, setBagWeightApplicable] = useState(false);
  const [bpBagWeightLb, setBpBagWeightLb] = useState("");
  const [spBagWeightLb, setSpBagWeightLb] = useState("");
  const [juteBagWeightLb, setJuteBagWeightLb] = useState("");
  const [purchaseOrderNo, setPurchaseOrderNo] = useState("");
  /* Agreement Type — Fixed by default, as the instruction of 3 September 2026 states. */
  const [agreementType, setAgreementType] = useState<PurchaseAgreementType>("fixed");
  /* The quality inspections, entered on the Edit screen. Several per agreement. */
  const [inspections, setInspections] = useState<DraftInspection[]>([]);
  const [attachments, setAttachments] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const [saving, setSaving] = useState<false | "save" | "share">(false);
  const [hydrated, setHydrated] = useState(mode === "create");
  const inspectionKey = useRef(0);

  useEffect(() => {
    if (mode !== "edit" || !existing || hydrated) return;
    setSeasonality(existing.seasonality);
    setSeasonalPlanId(existing.seasonalPlanId ?? "");
    setCommodityId(existing.commodityId);
    setSupplierId(existing.supplierId);
    setPurchaser(existing.purchaser);
    setTotalQuantityMt(String(existing.totalQuantityMt));
    setPriceAmount(existing.priceAmount === undefined ? "" : String(existing.priceAmount.amount));
    setSourcingLocation(existing.sourcingLocation ?? "");
    setDeliveryTerms(existing.deliveryTerms ?? "");
    setDeliveryLocation(existing.deliveryLocation ?? "");
    setQualityTerms(existing.qualityTerms ?? "");
    setFlowStatus(existing.flowStatus);
    setAgreementDate(existing.agreementDate);
    setBagWeightApplicable(existing.bagWeightApplicable);
    setBpBagWeightLb(existing.bpBagWeightLb === undefined ? "" : String(existing.bpBagWeightLb));
    setSpBagWeightLb(existing.spBagWeightLb === undefined ? "" : String(existing.spBagWeightLb));
    setJuteBagWeightLb(existing.juteBagWeightLb === undefined ? "" : String(existing.juteBagWeightLb));
    setPurchaseOrderNo(existing.purchaseOrderNo ?? "");
    setAgreementType(existing.agreementType ?? "fixed");
    setInspections(
      existing.qualityInspections.map((qi) => ({
        key: `saved-${qi.id}`,
        commodityTypeId: qi.commodityTypeId,
        supplierLocation: qi.supplierLocation,
        estimatedQuantity: qi.estimatedQuantity === undefined ? "" : String(qi.estimatedQuantity),
        estimatedQuantityUnit: qi.estimatedQuantityUnit,
        actualTestDate: qi.actualTestDate ?? "",
        result: qi.result ?? "",
        note: qi.note ?? "",
        recordedOn: qi.recordedOn,
        recordedBy: qi.recordedBy,
      })),
    );
    setAttachments(Object.fromEntries(existing.attachments.map((a) => [a.slot, a.fileName])));
    setNote(existing.note ?? "");
    setHydrated(true);
  }, [mode, existing, hydrated]);

  const seasonOptions = optionsFrom([
    ...(agreements.data ?? []).map((a) => a.seasonality),
    ...(funds.data ?? []).map((f) => f.seasonality),
    ...(balances.data ?? []).map((b) => b.seasonality),
  ]);

  const allPlans = plans.data ?? [];
  /* Active plans, plus — on Edit — the plan this agreement already names. */
  const offeredPlans = allPlans.filter(
    (p) => activePlans([p]).length > 0 || p.id === existing?.seasonalPlanId,
  );
  const selectedPlan = allPlans.find((p) => p.id === seasonalPlanId);
  const planCommodityList = selectedPlan ? planCommodities(selectedPlan) : [];
  /**
   * The commodity list. Driven by the plan when one is chosen; the full active master
   * otherwise, because the instruction narrows the list *given a plan* and does not say
   * an agreement must have one — five of the captured agreements have none.
   */
  const commodityOptions = selectedPlan
    ? planCommodityList.map((c) => ({
        value: c.commodityId,
        label: `${c.name}${c.group ? ` — ${c.group}` : ""} (${formatMt(c.plannedMt)} planned)`,
      }))
    : COMMODITY_OPTIONS;

  function setPlan(planId: string) {
    setSeasonalPlanId(planId);
    const p = allPlans.find((x) => x.id === planId);
    // A commodity the newly chosen plan does not carry cannot stay selected.
    if (commodityId && p && !planCarriesCommodity(p, commodityId)) setCommodityId("");
  }

  /**
   * The Commodity Type list on an inspection row.
   *
   * The instruction says the commodity type is *"based on the commodity requested on the
   * purchase agreement"*. The reading taken is the agreement's own commodity first, then
   * the rest of the active master **in the same commodity group** — a sesame agreement is
   * inspected against a sesame, not against a gum. If the business means the agreement's
   * single commodity and nothing else, this list narrows to one entry and no other code
   * changes; the screen says so beneath the grid.
   */
  const inspectionCommodityOptions = (() => {
    const own = commodityId ? commodityById(commodityId) : undefined;
    const group = commodityGroupOf(commodityId);
    const rest = COMMODITIES.filter(
      (c) => c.active && c.id !== own?.id && group !== undefined && c.group === group,
    );
    return [...(own ? [own] : []), ...rest].map((c) => ({
      value: c.id,
      label: `${c.name} (${c.code})${c.id === own?.id ? " — the agreement's own commodity" : ""}`,
    }));
  })();

  function setInspection(key: string, patch: Partial<DraftInspection>) {
    setInspections((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addInspection() {
    inspectionKey.current += 1;
    setInspections((prev) => [
      ...prev,
      {
        key: `qi-new-${inspectionKey.current}`,
        /* Defaulted to the agreement's own commodity, which is what "based on the
           commodity requested on the purchase agreement" makes the obvious first choice. */
        commodityTypeId: commodityId || "",
        supplierLocation: "",
        estimatedQuantity: "",
        estimatedQuantityUnit: "mt",
        actualTestDate: "",
        result: "",
        note: "",
      },
    ]);
  }

  /** The inspections as they will be saved. A row with nothing typed in it is dropped. */
  const savedInspections: QualityInspection[] = inspections
    .filter(
      (r) =>
        r.commodityTypeId ||
        r.supplierLocation.trim() ||
        r.estimatedQuantity.trim() ||
        r.actualTestDate ||
        r.result,
    )
    .map((r, i) => ({
      id: `qi-${i + 1}`,
      commodityTypeId: r.commodityTypeId,
      supplierLocation: r.supplierLocation.trim(),
      estimatedQuantity: parseNumber(r.estimatedQuantity),
      estimatedQuantityUnit: r.estimatedQuantityUnit,
      actualTestDate: r.actualTestDate || undefined,
      result: r.result || undefined,
      recordedOn: r.recordedOn ?? TODAY,
      recordedBy: r.recordedBy ?? user?.username ?? "unknown",
      note: r.note.trim() || undefined,
    }));
  const inspectionTotals = qualityInspectionSummary(savedInspections);

  const bp = parseNumber(bpBagWeightLb);
  const sp = parseNumber(spBagWeightLb);
  const jute = parseNumber(juteBagWeightLb);
  const quantity = parseNumber(totalQuantityMt);
  /* The unit the agreement belongs to, and the two lists that depend on it. */
  const agreementCountry = activeCountryOf(user).code;
  const agreementCurrency = COUNTRY_PROFILES[agreementCountry].localCurrency;
  const deliveryLocations = deliveryLocationsIn(agreementCountry);
  const price = parseNumber(priceAmount);

  /** What one bag of each type would tare at, so the flag's effect is visible live. */
  const tarePreview = packagingWeight(
    { bpBags: 1, spBags: 1, juteBags: 1 },
    {
      bagWeightApplicable,
      bpBagWeightLb: bp,
      spBagWeightLb: sp,
      juteBagWeightLb: jute,
    },
  );

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!seasonality) next["pa-season"] = "Select the seasonality.";
    if (!commodityId) next["pa-commodity"] = "Select the commodity.";
    if (selectedPlan && commodityId && !planCarriesCommodity(selectedPlan, commodityId)) {
      next["pa-commodity"] = `${commodityName(commodityId)} is not on ${selectedPlan.planRef}.`;
    }
    if (!supplierId) next["pa-supplier"] = "Select the supplier.";
    if (!purchaser.trim()) {
      /* No field to fix, so the message names what is actually wrong: the session has no
         display name to record as the purchaser. It cannot happen from these screens —
         every route behind them is authenticated — and it is checked because the service
         layer checks it too, and a refusal a user cannot read is worse than one they can. */
      next["pa-purchaser"] =
        mode === "create"
          ? "The signed-in session carries no display name, so there is no purchaser to record. The purchaser is read from the session rather than entered."
          : "This agreement records no purchaser, and the field is no longer captured on this screen. It has to be corrected in the data.";
    }
    if (!agreementDate) next["pa-date"] = "Enter the agreement date.";
    if (quantity === undefined) next["pa-quantity"] = "Enter the agreed quantity.";
    else if (quantity <= 0) {
      next["pa-quantity"] =
        "The agreed quantity must be above zero — receiving locations allocate against it.";
    }
    /* The quality-inspection card. The instruction states no validation, so a row may
       carry no quantity, no test date and no result — what is checked is what the record
       cannot represent, and that a row a user has started is not half-identified. */
    for (const r of inspections) {
      const started =
        r.commodityTypeId ||
        r.supplierLocation.trim() ||
        r.estimatedQuantity.trim() ||
        r.actualTestDate ||
        r.result;
      if (!started) continue;
      if (!r.commodityTypeId) next[`qi-com-${r.key}`] = "Select the commodity type inspected.";
      if (!r.supplierLocation.trim()) next[`qi-loc-${r.key}`] = "Enter the supplier location.";
      const q = parseNumber(r.estimatedQuantity);
      if (r.estimatedQuantity.trim() && q === undefined) {
        next[`qi-qty-${r.key}`] = "The estimated quantity is not a number.";
      } else if (q !== undefined && q < 0) {
        next[`qi-qty-${r.key}`] = "The estimated quantity cannot be negative.";
      }
      if (r.note.length > NOTE_LIMIT) {
        next[`qi-note-${r.key}`] = `An inspection note is limited to ${NOTE_LIMIT} characters.`;
      }
    }
    if (bagWeightApplicable) {
      for (const [key, label, weight] of [
        ["pa-bp", "big-pack", bp],
        ["pa-sp", "small-pack", sp],
        ["pa-jute", "jute", jute],
      ] as const) {
        if (weight === undefined || weight <= 0) {
          next[key] =
            `The ${label} bag weight must be above zero while per-bag weights are marked applicable. Every receipt on this agreement derives its packaging tare from these three.`;
        }
      }
    }
    if (note.length > NOTE_LIMIT) {
      next["pa-note"] = `The note is limited to ${NOTE_LIMIT} characters; this one is ${note.length}.`;
    }
    return next;
  }

  async function submit(e: React.FormEvent, share: boolean) {
    e.preventDefault();
    setRefusal(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const attachmentList: PurchaseAgreementAttachment[] = ATTACHMENT_SLOTS.filter(
      (s) => (attachments[s.slot] ?? "").trim() !== "",
    ).map((s) => ({ slot: s.slot, fileName: attachments[s.slot].trim() }));

    const weights = bagWeightApplicable
      ? { bpBagWeightLb: bp, spBagWeightLb: sp, juteBagWeightLb: jute }
      : { bpBagWeightLb: undefined, spBagWeightLb: undefined, juteBagWeightLb: undefined };

    setSaving(share ? "share" : "save");
    const res =
      mode === "create"
        ? await api.createPurchaseAgreement({
            seasonality: seasonality as Seasonality,
            seasonalPlanId: seasonalPlanId || undefined,
            commodityId,
            supplierId,
            purchaser: purchaser.trim(),
            totalQuantityMt: quantity as number,
            /* The five of 15 September 2026. The price carries the unit's own currency —
               "Price Amount (in local currency)" — which is read, never asked for. */
            priceAmount: price === undefined ? undefined : money(price, agreementCurrency),
            sourcingLocation: sourcingLocation.trim() || undefined,
            deliveryTerms: deliveryTerms || undefined,
            deliveryLocation:
              deliveryTerms === "delivered_at_place" ? deliveryLocation || undefined : undefined,
            qualityTerms: qualityTerms || undefined,
            flowStatus,
            agreementDate,
            /* Captured on Add as of 3 September 2026. The store still defaults it to Fixed
               for any caller that does not send it. */
            agreementType,
            createdBy: user?.username ?? "unknown",
            bagWeightApplicable,
            ...weights,
            attachments: attachmentList,
            note: note.trim() || undefined,
            share,
          })
        : await api.updatePurchaseAgreement(id, {
            purchaseOrderNo: purchaseOrderNo.trim() || undefined,
            seasonality: seasonality as Seasonality,
            seasonalPlanId: seasonalPlanId || undefined,
            commodityId,
            supplierId,
            /* The purchaser is deliberately not sent. It is no longer captured on this
               screen, and `updatePurchaseAgreement` takes a partial patch, so omitting it
               leaves the name the agreement was struck under exactly as it is. Sending
               `purchaser` here would rewrite it to whoever happened to be editing. */
            totalQuantityMt: quantity as number,
            /* The five of 15 September 2026. The price carries the unit's own currency —
               "Price Amount (in local currency)" — which is read, never asked for. */
            priceAmount: price === undefined ? undefined : money(price, agreementCurrency),
            sourcingLocation: sourcingLocation.trim() || undefined,
            deliveryTerms: deliveryTerms || undefined,
            deliveryLocation:
              deliveryTerms === "delivered_at_place" ? deliveryLocation || undefined : undefined,
            qualityTerms: qualityTerms || undefined,
            flowStatus,
            agreementDate,
            /* Added 3 September 2026, both Edit-screen fields. */
            agreementType,
            qualityInspections: savedInspections,
            bagWeightApplicable,
            ...weights,
            attachments: attachmentList,
            note: note.trim() || undefined,
            updatedBy: user?.username ?? "unknown",
            share,
          });
    setSaving(false);
    if (!res.ok) {
      setRefusal(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    toast.push(
      "ok",
      `${mode === "create" ? `Purchase agreement ${res.value.paRef} created` : `${res.value.paRef} updated`} — ` +
        `${commodityName(res.value.commodityId)}, ${formatMt(res.value.totalQuantityMt)} with ` +
        `${counterpartyById(res.value.supplierId)?.name ?? "the supplier"}, ${humanise(res.value.flowStatus)}, ` +
        `${humanise(res.value.agreementType)}. ` +
        (res.value.bagWeightApplicable
          ? "Per-bag weights apply and every receipt will derive its tare from them."
          : "No per-bag tare applies, so receipts on it carry a packaging tare of zero by design.") +
        (share
          ? " Marked as shared — the stakeholders to notify are configured in the system later, so no email was sent."
          : ""),
    );
    navigate(`/sourcing/agreements/${res.value.id}`);
  }

  const summary = errorList(errors);
  const listTo = "/sourcing/agreements";

  const body = (
    <>
      <PageHeader
        moduleLabel="Sourcing intake"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Sourcing intake", to: "/sourcing" },
          { label: "Purchase agreement", to: listTo },
          ...(mode === "edit" && existing
            ? [{ label: existing.paRef, to: `/sourcing/agreements/${existing.id}` }, { label: "Edit" }]
            : [{ label: "New purchase agreement" }]),
        ]}
        title={mode === "create" ? "New purchase agreement" : `Edit ${existing?.paRef ?? "agreement"}`}
        meta={
          <>
            {user ? `${user.displayName} · ${user.unit}` : ""} ·{" "}
            {mode === "create" ? (
              <>created {formatDate(TODAY)} · the agreement reference is issued on save</>
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
        recordKey={mode === "create" ? "MMP" : (existing?.paRef ?? "agreement")}
        recordDate={mode === "create" ? "new purchase agreement" : "editing this agreement"}
      />

      <div className="page">
        <Banner tone="info" title="What this screen captures, and what the Update screen adds">
          The instruction of 27 August 2026 takes <em>Purchase Order</em> off the Add screen — it is issued
          after the agreement is struck — and puts it on an Update screen, which MMP never had. So a new
          agreement is referenced <span className="mono">PA-&lt;year&gt;-&lt;sequence&gt;</span> rather than
          by a purchase order it does not yet have.{" "}
          {mode === "edit" ? (
            <>
              <strong>PO number</strong> appears below, as the field this screen adds.
            </>
          ) : (
            <>
              <strong>Flow Status</strong> starts at <em>Open</em> and <strong>Agreement date</strong> at
              today, as the instruction specifies.
            </>
          )}
        </Banner>

        <Banner tone="info" title="The commodity comes from a seasonal purchase plan">
          Choose an active plan and the <em>Commodity</em> list offers only the commodities that plan carries
          — the same cascade the <Link to="/sourcing/budgets">budget</Link> uses, and the first link between
          this intake chain and <Link to="/sourcing/plans">Phase 01</Link>. Leaving the plan blank is
          permitted and then the full commodity master is offered: the instruction narrows the list{" "}
          <em>given a plan</em> and does not say an agreement must have one, and five of the captured
          agreements have none. The service layer enforces the rule wherever a plan is named.
        </Banner>

        {refusal ? (
          <Banner tone="risk" title="The service layer refused this agreement">
            {refusal}
          </Banner>
        ) : null}

        <form className="stack" onSubmit={(e) => submit(e, false)} noValidate>
          <ErrorSummary
            errors={summary}
            title={
              mode === "create"
                ? "This purchase agreement could not be created"
                : "These changes could not be saved"
            }
          />
          <RequiredLegend />

          <CollapsibleSection title="The agreement" defaultOpen>
            <div className="fields">
              {mode === "edit" ? (
                <FormRow
                  label="PO number"
                  htmlFor="pa-po"
                  hint="Added by the instruction of 27 August 2026 as a field this screen carries and the Add screen does not, because the purchase order is issued after the agreement is struck."
                >
                  <TextInput id="pa-po" value={purchaseOrderNo} onChange={setPurchaseOrderNo} />
                </FormRow>
              ) : null}

              {/* On both screens as of the follow-up instruction of 3 September 2026. It was
                  briefly Edit-only, on the reading that "modifiable by Procurement" meant
                  the field belonged to the update; the instruction settles it — the type
                  is chosen when the agreement is struck and changed afterwards, so it is
                  captured on Add, shown in the list and on the view, and editable here. */}
              <FormRow
                label="Agreement type"
                htmlFor="pa-type"
                required
                hint={
                  mode === "create"
                    ? "Fixed or Collection, defaulted to Fixed. Chosen when the agreement is struck; the Procurement team can change it afterwards on the Update screen. The instruction names the field, the two values, the default and the owner, and states no effect — so nothing downstream reads what is chosen."
                    : "Fixed or Collection, changed here by the Procurement team. The instruction states no effect for either value, so nothing downstream reads what is chosen."
                }
              >
                <SelectInput
                  id="pa-type"
                  value={agreementType}
                  onChange={setAgreementType}
                  required
                  options={AGREEMENT_TYPES}
                />
              </FormRow>

              <FormRow
                label="Seasonality"
                htmlFor="pa-season"
                required
                error={errors["pa-season"]}
                hint="No seasonality master exists in the source, so the options are the seasons already held on agreements, funds and balances."
              >
                <SelectInput
                  id="pa-season"
                  value={seasonality}
                  onChange={setSeasonality}
                  required
                  error={errors["pa-season"]}
                  placeholder="Select a season…"
                  options={seasonOptions}
                />
              </FormRow>

              <FormRow
                label="Seasonal purchase plan"
                htmlFor="pa-plan"
                hint="Active plans only. The commodity below is chosen from the commodities this plan carries."
              >
                <SelectInput
                  id="pa-plan"
                  value={seasonalPlanId}
                  onChange={setPlan}
                  placeholder="No plan — offer the full commodity master"
                  options={offeredPlans.map((p) => ({
                    value: p.id,
                    label:
                      `${p.planRef} — ${formatSeasonMonth(p.from)} to ${formatSeasonMonth(p.to)}` +
                      ` (${formatMt(planTotals(p).quantityMt)} planned, ${planCommodities(p).length} commodity(ies))` +
                      (activePlans([p]).length === 0 ? " · CLOSED — already on this agreement" : ""),
                  }))}
                />
              </FormRow>

              <FormRow label="Commodity" htmlFor="pa-commodity" required error={errors["pa-commodity"]}>
                <SelectInput
                  id="pa-commodity"
                  value={commodityId}
                  onChange={setCommodityId}
                  required
                  error={errors["pa-commodity"]}
                  placeholder={selectedPlan ? "Select a commodity from the plan…" : "Select a commodity…"}
                  options={commodityOptions}
                />
                {selectedPlan && planCommodityList.length === 0 ? (
                  <p className="xsmall muted">
                    {selectedPlan.planRef} carries no commodity yet — nothing to agree against.
                  </p>
                ) : null}
              </FormRow>

              <FormRow label="Supplier" htmlFor="pa-supplier" required error={errors["pa-supplier"]}>
                <SelectInput
                  id="pa-supplier"
                  value={supplierId}
                  onChange={setSupplierId}
                  required
                  error={errors["pa-supplier"]}
                  placeholder="Select a supplier…"
                  options={SUPPLIER_OPTIONS}
                />
              </FormRow>

              {/* Not a field as of 3 September 2026. On Add it is the signed-in user; on
                  Update it is whoever the agreement already records, because editing an
                  agreement is not taking it over. Shown, because the purchaser is on the
                  record being saved and a value saved without being seen is a value
                  nobody checked. */}
              <FormRow
                label="Purchaser"
                htmlFor="pa-purchaser"
                behaviour="readonly"
                error={errors["pa-purchaser"]}
                hint={
                  mode === "create"
                    ? "Read from the session — the purchaser is the person striking the agreement, and that is who is signed in. MMP renders a username in the grid and a display name on the detail views; the display name is captured."
                    : "The purchaser this agreement was struck by, as captured. Editing an agreement does not transfer it, so this is not changed to the name of whoever is editing."
                }
              >
                <div id="pa-purchaser">
                  {purchaser ? (
                    <>
                      <strong>{purchaser}</strong>{" "}
                      <StatusChip
                        tone="info"
                        label={mode === "create" ? "from the session" : "as captured"}
                        size="sm"
                        title={
                          mode === "create"
                            ? "The signed-in user. Recording an agreement as though somebody else had struck it is the one thing a purchaser field should not allow, which is why it is no longer a field."
                            : "Kept from the record. Editing an agreement is not taking it over."
                        }
                      />
                    </>
                  ) : (
                    <span className="muted">
                      no purchaser on the session — see the message above
                    </span>
                  )}
                </div>
              </FormRow>

              <FormRow
                label="Total agreed quantity (MT)"
                htmlFor="pa-quantity"
                required
                error={errors["pa-quantity"]}
                hint="Receiving locations allocate against this figure, and the allocation balance is measured from it."
              >
                <TextInput
                  id="pa-quantity"
                  value={totalQuantityMt}
                  onChange={setTotalQuantityMt}
                  required
                  error={errors["pa-quantity"]}
                  inputMode="decimal"
                />
              </FormRow>

              {/*
                THE FIVE FIELDS OF 15 SEPTEMBER 2026, placed together after the quantity because
                they describe the same bargain: what it costs, where the crop comes from, who
                moves it where, and who inspects it.
              */}
              <FormRow
                label={`Price amount (${agreementCurrency})`}
                htmlFor="pa-price"
                error={errors["pa-price"]}
                hint={`In the operating unit's own currency, read from ${COUNTRY_PROFILES[agreementCountry].name} rather than asked for. This is the figure the agent account's Agreed Purchases and Value Received columns need — until today it had none, and reconstructed the price from the agreement's own priced receipts instead.`}
              >
                <TextInput
                  id="pa-price"
                  value={priceAmount}
                  onChange={setPriceAmount}
                  error={errors["pa-price"]}
                  inputMode="decimal"
                  placeholder="–"
                />
              </FormRow>

              <FormRow
                label="Sourcing location"
                htmlFor="pa-sourcing-loc"
                hint="Free text, as the instruction states — where the crop was bought. Not a master list: an agent buys from villages and markets that no register holds."
              >
                <TextInput
                  id="pa-sourcing-loc"
                  value={sourcingLocation}
                  onChange={setSourcingLocation}
                  placeholder="e.g. Gedaref rural markets"
                />
              </FormRow>

              <FormRow
                label="Delivery terms"
                htmlFor="pa-delivery-terms"
                hint="Collection at the supplier's own location, or the supplier delivering to a named place."
              >
                <SelectInput
                  id="pa-delivery-terms"
                  value={deliveryTerms}
                  onChange={(v) => {
                    const next = v as DeliveryTerms | "";
                    setDeliveryTerms(next);
                    /* Collection names no delivery location, and the service layer refuses one,
                       so the field is cleared rather than left to be refused on save. */
                    if (next !== "delivered_at_place") setDeliveryLocation("");
                  }}
                  placeholder="Not recorded yet"
                  options={(Object.keys(DELIVERY_TERMS_LABEL) as DeliveryTerms[]).map((k) => ({
                    value: k,
                    label: DELIVERY_TERMS_LABEL[k],
                  }))}
                />
              </FormRow>

              <FormRow
                label="Delivery location"
                htmlFor="pa-delivery-loc"
                required={deliveryTerms === "delivered_at_place"}
                error={errors["pa-delivery-loc"]}
                hint={
                  deliveryTerms === "delivered_at_place"
                    ? `The area or city it is delivered to — the master's ${COUNTRY_PROFILES[agreementCountry].name} entries, because a delivery location belongs to the unit the agreement does.`
                    : deliveryTerms === "supplier_location"
                      ? "Not asked for: collection at the supplier's own location names no delivery place."
                      : "Select the delivery terms first. It applies to Delivered at place."
                }
              >
                <SelectInput
                  id="pa-delivery-loc"
                  value={deliveryLocation}
                  onChange={setDeliveryLocation}
                  disabled={deliveryTerms !== "delivered_at_place"}
                  required={deliveryTerms === "delivered_at_place"}
                  error={errors["pa-delivery-loc"]}
                  placeholder="Select the area or city"
                  options={deliveryLocations.map((l) => ({
                    value: deliveryLocationLabel(l),
                    label: deliveryLocationLabel(l),
                  }))}
                />
              </FormRow>

              <FormRow
                label="Quality terms"
                htmlFor="pa-quality-terms"
                hint="Who inspects, and whether anyone does. Recorded and read by nothing downstream — the instruction names the field and states no effect, as with the agreement type."
              >
                <SelectInput
                  id="pa-quality-terms"
                  value={qualityTerms}
                  onChange={(v) => setQualityTerms(v as AgreementQualityTerms | "")}
                  placeholder="Not recorded yet"
                  options={(Object.keys(AGREEMENT_QUALITY_TERMS_LABEL) as AgreementQualityTerms[]).map(
                    (k) => ({ value: k, label: AGREEMENT_QUALITY_TERMS_LABEL[k] }),
                  )}
                />
              </FormRow>

              <FormRow
                label="Flow status"
                htmlFor="pa-flow"
                required
                hint="Open by default. The source gives five values, no default and no transition evidence of any kind, so no transition map is asserted — only the default the instruction states."
              >
                <SelectInput
                  id="pa-flow"
                  value={flowStatus}
                  onChange={setFlowStatus}
                  required
                  options={FLOW_STATUSES}
                />
              </FormRow>

              <FormRow
                label="Agreement date"
                htmlFor="pa-date"
                required
                error={errors["pa-date"]}
                hint="Today by default, as the instruction states."
              >
                <TextInput
                  id="pa-date"
                  type="date"
                  value={agreementDate}
                  onChange={setAgreementDate}
                  required
                  error={errors["pa-date"]}
                />
              </FormRow>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Per-bag weights"
            defaultOpen
            indicator={
              <StatusChip
                tone={bagWeightApplicable ? "warn" : "idle"}
                label={bagWeightApplicable ? "applicable — the three weights are required" : "not applicable"}
                size="sm"
              />
            }
          >
            <div className="frow">
              <label className="frow__label" htmlFor="pa-bag-applicable">
                Is Applicable
              </label>
              <div>
                <input
                  id="pa-bag-applicable"
                  type="checkbox"
                  checked={bagWeightApplicable}
                  onChange={(e) => setBagWeightApplicable(e.target.checked)}
                />{" "}
                <label htmlFor="pa-bag-applicable">A per-bag tare applies to this agreement</label>
              </div>
              <p className="frow__hint">
                Added by the instruction of 27 August 2026. Ticked, the three weights below are mandatory;
                unticked, they are not captured and every receipt on this agreement carries a packaging tare
                of zero — <em>by statement</em>, which is the point. MMP had no such flag, so "no tare
                applies" and "somebody left it at zero" were the same record.
              </p>
            </div>

            {bagWeightApplicable ? (
              <>
                <div className="fields">
                  <FormRow
                    label="Big-pack bag weight (lb)"
                    htmlFor="pa-bp"
                    required
                    error={errors["pa-bp"]}
                    hint="MMP `BP_Bag_Weight`. Carried onto every receipt booked against this agreement."
                  >
                    <TextInput
                      id="pa-bp"
                      value={bpBagWeightLb}
                      onChange={setBpBagWeightLb}
                      required
                      error={errors["pa-bp"]}
                      inputMode="decimal"
                    />
                  </FormRow>

                  <FormRow
                    label="Small-pack bag weight (lb)"
                    htmlFor="pa-sp"
                    required
                    error={errors["pa-sp"]}
                    hint="MMP `SP_Bag_Weight`."
                  >
                    <TextInput
                      id="pa-sp"
                      value={spBagWeightLb}
                      onChange={setSpBagWeightLb}
                      required
                      error={errors["pa-sp"]}
                      inputMode="decimal"
                    />
                  </FormRow>

                  <FormRow
                    label="Jute bag weight (lb)"
                    htmlFor="pa-jute"
                    required
                    error={errors["pa-jute"]}
                    hint="MMP `Jute`."
                  >
                    <TextInput
                      id="pa-jute"
                      value={juteBagWeightLb}
                      onChange={setJuteBagWeightLb}
                      required
                      error={errors["pa-jute"]}
                      inputMode="decimal"
                    />
                  </FormRow>
                </div>

                <FieldGrid
                  columns={2}
                  fields={[
                    {
                      label: "Tare on one bag of each type",
                      value:
                        tarePreview.totalLb > 0
                          ? `${formatNumber(tarePreview.totalLb)} lb · ${formatMt(tarePreview.totalMt)}`
                          : undefined,
                      behaviour: "calculated",
                      hint: `Divided by ${LB_PER_MT} lb per MT. The legacy field named NetWeight divided by ${LEGACY_LB_PER_MT_DIVISOR} instead, mixing MT and lb.`,
                    },
                    {
                      label: "What the legacy NetWeight would have held",
                      value: tarePreview.legacyMt > 0 ? `${formatNumber(tarePreview.legacyMt)}` : undefined,
                      hint: "Shown for comparison only. It is not a weight in any unit.",
                    },
                  ]}
                />
              </>
            ) : (
              <p className="small muted">
                No per-bag weight is captured, and receipts on this agreement will show a packaging tare of
                zero. That is the intended reading of an unticked box, not a missing value.
              </p>
            )}
          </CollapsibleSection>

          {mode === "edit" ? (
            <CollapsibleSection
              title={`Quality inspection — ${inspections.length} inspection(s)`}
              defaultOpen
              indicator={
                inspectionTotals.count > 0 ? (
                  <StatusChip
                    tone={
                      inspectionTotals.rejected > 0
                        ? "risk"
                        : inspectionTotals.reTest > 0
                          ? "warn"
                          : inspectionTotals.pending > 0
                            ? "info"
                            : "ok"
                    }
                    label={
                      inspectionTotals.rejected > 0
                        ? `${inspectionTotals.rejected} rejected`
                        : inspectionTotals.reTest > 0
                          ? `${inspectionTotals.reTest} for re-test`
                          : inspectionTotals.pending > 0
                            ? `${inspectionTotals.pending} not yet tested`
                            : "all approved"
                    }
                    size="sm"
                  />
                ) : undefined
              }
            >
              <Banner tone="info" title="Who fills this in, and what it changes">
                Added by the instruction of 3 September 2026, which places the card here — before
                Attachments and notes — and says who uses it: <em>"This section will be filled out by
                the trader or the Quality team and they enter multiple Inspection."</em> So there is no
                single row: add as many as were carried out.
                <br />
                <br />
                <strong>Nothing is gated on a result.</strong> A rejected inspection does not stop a
                receipt being booked, does not change the flow status and does not refuse a save,
                because no rule states that it should. The related flow status{" "}
                <em>For Quality Inspection</em>, added by the same instruction, is likewise chosen by
                hand — no inspection row sets it.
              </Banner>

              {inspections.length === 0 ? (
                <EmptyState title="No inspection recorded" glyph="○">
                  Nothing requires one. Add a row when the trader or the Quality team has inspected a
                  quantity against this agreement.
                </EmptyState>
              ) : (
                <div className="dtable__scroll">
                  <table className="dtable__table">
                    <caption className="sr-only">
                      Quality inspections: the commodity type, the supplier location, the estimated
                      quantity, the actual test date and the result
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Commodity type</th>
                        <th scope="col">Supplier location</th>
                        <th scope="col">Estimated quantity</th>
                        <th scope="col">Unit</th>
                        <th scope="col">Actual test date</th>
                        <th scope="col">Results</th>
                        <th scope="col">
                          <span className="sr-only">Row actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspections.map((r) => (
                        <tr key={r.key}>
                          <td>
                            <SelectInput
                              id={`qi-com-${r.key}`}
                              value={r.commodityTypeId}
                              onChange={(v) => setInspection(r.key, { commodityTypeId: v })}
                              error={errors[`qi-com-${r.key}`]}
                              placeholder={commodityId ? "Select a commodity type…" : "Choose the agreement's commodity first"}
                              disabled={!commodityId}
                              options={inspectionCommodityOptions}
                            />
                          </td>
                          <td>
                            <TextInput
                              id={`qi-loc-${r.key}`}
                              value={r.supplierLocation}
                              onChange={(v) => setInspection(r.key, { supplierLocation: v })}
                              error={errors[`qi-loc-${r.key}`]}
                              placeholder="e.g. Gedaref collection yard"
                            />
                          </td>
                          <td>
                            <TextInput
                              id={`qi-qty-${r.key}`}
                              value={r.estimatedQuantity}
                              onChange={(v) => setInspection(r.key, { estimatedQuantity: v })}
                              error={errors[`qi-qty-${r.key}`]}
                              inputMode="decimal"
                              placeholder="–"
                            />
                          </td>
                          <td>
                            <SelectInput
                              id={`qi-unit-${r.key}`}
                              value={r.estimatedQuantityUnit}
                              onChange={(v) =>
                                setInspection(r.key, {
                                  estimatedQuantityUnit: v as QualityInspectionUnit,
                                })
                              }
                              options={INSPECTION_UNITS}
                            />
                          </td>
                          <td>
                            <TextInput
                              id={`qi-date-${r.key}`}
                              type="date"
                              value={r.actualTestDate}
                              onChange={(v) => setInspection(r.key, { actualTestDate: v })}
                            />
                          </td>
                          <td>
                            <SelectInput
                              id={`qi-res-${r.key}`}
                              value={r.result}
                              onChange={(v) =>
                                setInspection(r.key, { result: v as QualityInspectionResult | "" })
                              }
                              placeholder="Not tested yet"
                              options={INSPECTION_RESULTS}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn--sm"
                              onClick={() =>
                                setInspections((prev) => prev.filter((x) => x.key !== r.key))
                              }
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th scope="row">{formatNumber(inspectionTotals.count)} inspection(s)</th>
                        <td />
                        <td colSpan={2}>
                          <strong>
                            {inspectionTotals.estimatedMt > 0
                              ? formatMt(inspectionTotals.estimatedMt)
                              : "–"}
                          </strong>
                          {inspectionTotals.estimatedBags > 0 ? (
                            <>
                              <br />
                              <strong>{formatNumber(inspectionTotals.estimatedBags)} bags</strong>
                            </>
                          ) : null}
                        </td>
                        <td className="small muted">
                          {inspectionTotals.latestTestDate
                            ? `latest ${formatDate(inspectionTotals.latestTestDate)}`
                            : "no test date recorded"}
                        </td>
                        <td className="small muted">
                          {inspectionTotals.approved} approved · {inspectionTotals.rejected} rejected ·{" "}
                          {inspectionTotals.reTest} re-test · {inspectionTotals.pending} untested
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div style={{ marginTop: "0.75rem" }}>
                <button type="button" className="btn" onClick={addInspection} disabled={!commodityId}>
                  Add an inspection
                </button>
              </div>

              <p className="small muted" style={{ marginTop: "0.5rem" }}>
                <strong>Two readings are taken here, and both are one change away.</strong>{" "}
                <em>Commodity Type</em> is "based on the commodity requested on the purchase agreement",
                so the list offers this agreement's own commodity first and then the rest of the master{" "}
                <strong>in the same commodity group</strong> — a sesame agreement is inspected against a
                sesame. If the business means the agreement's single commodity and nothing else, the list
                narrows to one entry. <em>Estimated Quantity (mt/bags)</em> is captured as a number plus
                the unit it was given in, rather than as free text, so the rows can be totalled — and the
                two units are totalled <strong>separately</strong> and never added, because the per-bag
                figure on this agreement is a tare, the weight of the empty packaging, and cannot turn a
                bag count into a tonnage.
              </p>
            </CollapsibleSection>
          ) : null}

          <CollapsibleSection title="Attachments and notes" defaultOpen={false}>
            <div className="fields">
              {ATTACHMENT_SLOTS.map((s) => (
                <FormRow
                  key={s.slot}
                  label={s.label}
                  htmlFor={`pa-att-${s.slot}`}
                  hint="A file name only. This prototype stores names, not files."
                >
                  <TextInput
                    id={`pa-att-${s.slot}`}
                    value={attachments[s.slot] ?? ""}
                    onChange={(v) => setAttachments((prev) => ({ ...prev, [s.slot]: v }))}
                    placeholder="e.g. PA-signed.pdf"
                  />
                </FormRow>
              ))}
            </div>
            <FormRow label="Notes" htmlFor="pa-note" error={errors["pa-note"]}>
              <TextArea id="pa-note" value={note} onChange={setNote} rows={3} error={errors["pa-note"]} />
            </FormRow>
            <p className="xsmall muted" aria-live="polite">
              {note.length} of {NOTE_LIMIT} characters used.
            </p>
          </CollapsibleSection>

          <FormActions>
            <button type="submit" className="btn btn--primary" disabled={Boolean(saving)}>
              {saving === "save" ? "Saving…" : mode === "create" ? "Save" : "Save changes"}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={Boolean(saving)}
              onClick={(e) => submit(e, true)}
            >
              {saving === "share" ? "Saving & sharing…" : "Save & share"}
            </button>
            <Link className="btn" to={listTo}>
              Cancel
            </Link>
            <p className="muted small">
              {summary.length > 0
                ? `${summary.length} field${summary.length === 1 ? "" : "s"} need attention.`
                : "Save records the agreement. Save & share records it and marks it for notification — the stakeholders to notify are configured in the system later, so this prototype sends no email and names no recipient."}
            </p>
          </FormActions>
        </form>
      </div>
    </>
  );

  if (mode === "create") return body;
  return (
    <SourcingEditGate
      loading={agreement.loading || (Boolean(existing) && !hydrated)}
      error={agreement.error}
      reload={agreement.reload}
      missing={!agreement.loading && !existing}
      missingTitle="Purchase agreement not found"
      backTo={listTo}
      backLabel="Back to purchase agreements"
    >
      {body}
    </SourcingEditGate>
  );
}

/* ================================================================== *
 * 3 — New receiving location · /sourcing/locations/new
 * ================================================================== */

interface StagedPlanRow {
  key: string;
  /** Which master the location came from — added 3 September 2026. */
  locationKind: ReceivingLocationKind;
  country: CountryUnit;
  facility: string;
  quantityMt: number;
  assignedTo: string;
}

/**
 * The Warehouse-or-Facility drop-down, added to the plan line by the instruction of
 * 3 September 2026. Choosing one decides which master the location list is read from.
 */
const LOCATION_KINDS: { value: ReceivingLocationKind; label: string }[] = [
  { value: "facility", label: "Facility" },
  { value: "warehouse", label: "Warehouse" },
];

export function NewReceivingLocationForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const agreements = useAsync(() => api.listPurchaseAgreements());
  const plans = useAsync(() => api.listReceivingLocationPlans());

  const [agreementId, setAgreementId] = useState("");
  /* The kind of location is asked for. The country is not — see below. */
  const [locationKind, setLocationKind] = useState<ReceivingLocationKind>("facility");
  const [facility, setFacility] = useState("");
  const [quantity, setQuantity] = useState("");
  const [assignee, setAssignee] = useState("");
  const [staged, setStaged] = useState<StagedPlanRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const agreementRows = agreements.data ?? [];
  const planRows = plans.data ?? [];
  const agreement = agreementRows.find((a) => a.id === agreementId);
  const plansFor = planRows.filter((p) => p.purchaseAgreementId === agreementId);
  const balance = agreement ? allocationBalance(agreement, plansFor) : undefined;
  const stagedTotal = sum(staged.map((s) => s.quantityMt));
  const headroom = agreement ? checkAllocationHeadroom(agreement, plansFor, stagedTotal) : undefined;

  /**
   * The operating country, read and not asked for.
   *
   * The instruction of 3 September 2026 removed the drop-down that used to sit here:
   * *"country is automatically read in the core module once the user is login to COTS the
   * settings of country is already available."* So it is read from the session — see
   * `activeCountryOf()`, which takes it from the signed-in user and reports whether it
   * found one or fell back to the first configured country. A screen that asked for
   * something the system already knew allowed two answers to one question; this has one.
   */
  const activeCountry = activeCountryOf(user);
  const country = activeCountry.code;

  /**
   * The location list, read from the receiving-location master and no longer from the
   * names already present in the data.
   *
   * The instruction of 3 September 2026: choose Warehouse or Facility, *"then if warehouse
   * all warehouse listed under that country (as per master data) else if Facility all
   * Facility available in that country as per master data"*. Before this the list was the
   * distinct facility names other plan rows happened to carry, which meant a location
   * could only ever be chosen once some earlier row had used it — a master lookup
   * masquerading as an autocomplete.
   */
  const locationOptions = receivingLocationsIn(country, locationKind).map((l) => ({
    value: receivingLocationLabel(l),
    label: receivingLocationLabel(l),
  }));
  /**
   * Locations this agreement's saved rows name that the chosen country and kind do not
   * offer — a row captured before the master existed, or one under another country.
   * Listed beneath the field rather than silently absent from the list.
   */
  const unmasteredLocations = [
    ...new Set(
      plansFor
        .map((p) => p.facility)
        .filter((f) => !locationOptions.some((o) => o.value === f)),
    ),
  ];
  /**
   * Whether the receiving-location master holds anything at all for the session's
   * country. Not the same as the two lists being empty for a *kind* — this is the case
   * where the whole country is unseeded, and it needs saying differently.
   */
  const countryIsInMaster = receivingLocationCountries().includes(country);
  const assigneeOptions = optionsFrom([
    ...planRows.map((p) => p.assignedTo),
    ...agreementRows.map((a) => a.createdBy),
    user?.username,
  ]);

  function addRow() {
    const next: Record<string, string> = {};
    if (!agreementId) next["rln-agreement"] = "Select the agreement the allocation belongs to.";
    if (!facility) {
      next["rln-facility"] =
        locationKind === "warehouse"
          ? "Select a receiving warehouse."
          : "Select a receiving facility.";
    }
    if (!assignee) next["rln-assignee"] = "Select the user responsible for the allocation.";
    const qty = parseNumber(quantity);
    if (qty === undefined) next["rln-quantity"] = "Enter the quantity to allocate, in MT.";
    else if (qty <= 0) {
      next["rln-quantity"] =
        "Every plan row needs a quantity above zero. Four of ten live legacy rows are blank despite the field being required on the add form.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setStaged((rows) => [
      ...rows,
      {
        key: `${facility}-${assignee}-${rows.length}-${Date.now()}`,
        locationKind,
        country,
        facility,
        quantityMt: qty as number,
        assignedTo: assignee,
      },
    ]);
    setFacility("");
    setQuantity("");
    setAssignee("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setRefusal(null);
    const next: Record<string, string> = {};
    if (!agreementId) next["rln-agreement"] = "Select the agreement the allocation belongs to.";
    if (staged.length === 0) next["rln-facility"] = "Add at least one plan row before submitting.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    const res = await api.addReceivingLocationPlans(
      agreementId,
      staged.map((s) => ({
        facility: s.facility,
        quantityMt: s.quantityMt,
        assignedTo: s.assignedTo,
        locationKind: s.locationKind,
        country: s.country,
      })),
    );
    setSaving(false);
    if (!res.ok) {
      setRefusal(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    toast.push(
      "ok",
      `${res.value.plans.length} plan line(s) saved against ${agreement?.paRef ?? "the agreement"}.`,
    );
    // Reported, never refused: no source states that over-allocation is blocked, and the
    // captured data proves it is not. The receiving-location list flags the same agreement.
    if (res.value.warning) toast.push("warn", res.value.warning);
    navigate("/sourcing/locations");
  }

  const summary = errorList(errors);

  return (
    <>
      <PageHeader
        moduleLabel="Sourcing intake"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Sourcing intake", to: "/sourcing" },
          { label: "Receiving location", to: "/sourcing/locations" },
          { label: "New receiving location" },
        ]}
        title="New receiving location"
        meta={
          <>
            {user ? `${user.displayName} · ${user.unit}` : ""} · created {formatDate(TODAY)} · MMP Receiving
            Locations, the one form in the module that stages rows before saving
          </>
        }
        recordKey="MMP"
        recordDate="add plan basket"
      />

      <div className="page">
        <Banner tone="info" title="Why this is a basket, and what has been added to it">
          The legacy add form stages rows: <em>+ Add Plan</em> appends the current field values to a table on
          the page rather than saving, so several facilities can be allocated in one visit, then a single
          submit posts them all. That pattern is kept. What is added is the allocation balance and the running
          headroom, which the legacy basket does not show — its grid has a footer row with an empty{" "}
          <em>Quantity</em> cell, so it computes no sum. The legacy agreement dropdown offered only three of
          the seven agreements in the system and the source never states the filter criterion, so every
          agreement is offered here and the gap is recorded rather than guessed.
        </Banner>

        <Banner tone="warn" title="The single largest gap in the legacy module">
          The stated purpose of Receiving Locations is to allocate the contracted quantity of an agreement
          across facilities, yet no screen in the module shows the agreed quantity, the sum allocated so far
          or the unallocated remainder. The captured case is agreement{" "}
          <span className="mono">321_2009374</span>: plan lines of 10,000 MT and 15,700 MT — 25,700 MT in
          total — against an agreed quantity of 17,777 MT, with a third row's quantity blank and no total
          anywhere on the legacy grid, so the excess of 7,923 MT appears nowhere. The three figures below come
          from <code>allocationBalance()</code> and a proposed allocation is checked with{" "}
          <code>checkAllocationHeadroom()</code>, which reports and never refuses: no source states that
          over-allocation is blocked.
        </Banner>

        {refusal ? (
          <Banner tone="risk" title="The plan lines could not be saved">
            {refusal}
          </Banner>
        ) : null}

        <form className="stack" onSubmit={submit} noValidate>
          <ErrorSummary errors={summary} title="These plan lines could not be saved" />
          <RequiredLegend />

          <CollapsibleSection title="Agreement and its allocation balance" defaultOpen>
            <div className="fields">
              <FormRow
                label="Agreement reference"
                htmlFor="rln-agreement"
                required
                error={errors["rln-agreement"]}
                hint="Selecting an agreement is what makes the allocation balance meaningful."
              >
                <SelectInput
                  id="rln-agreement"
                  value={agreementId}
                  onChange={(v) => {
                    setAgreementId(v);
                    setStaged([]);
                  }}
                  required
                  error={errors["rln-agreement"]}
                  placeholder="Select an agreement…"
                  options={agreementRows.map((a) => ({
                    value: a.id,
                    label: `${a.paRef} — ${commodityName(a.commodityId)} — ${formatMt(a.totalQuantityMt)} agreed`,
                  }))}
                />
              </FormRow>
            </div>

            <FieldGrid
              fields={[
                {
                  label: "Agreed quantity",
                  value: balance ? formatMt(balance.agreedMt) : undefined,
                  behaviour: "inherited",
                },
                {
                  label: "Already allocated",
                  value: balance ? formatMt(balance.allocatedMt) : undefined,
                  behaviour: "calculated",
                  hint: balance
                    ? `Across ${formatNumber(plansFor.length)} existing plan line(s).`
                    : undefined,
                },
                {
                  label: "Remaining",
                  value: balance ? <strong>{formatMt(balance.remainingMt)}</strong> : undefined,
                  behaviour: "calculated",
                  hint: "Shown on no legacy screen at all.",
                },
              ]}
            />
            {balance && balance.rowsWithNoQuantity > 0 ? (
              <p className="small" style={{ marginTop: "0.5rem" }}>
                <StatusChip
                  tone="risk"
                  label={`${balance.rowsWithNoQuantity} existing row(s) with no quantity`}
                  size="sm"
                />{" "}
                Quantity is marked required on the legacy add form and is blank on those rows, so the
                allocated figure above understates what was intended. This form refuses a row with no
                quantity.
              </p>
            ) : null}
          </CollapsibleSection>

          <CollapsibleSection title="Add a plan line" defaultOpen>
            <div className="fields">
              {/* Warehouse or Facility first, then the country, then the location — the
                  order the instruction of 3 September 2026 implies, because each field
                  decides what the next one may offer. */}
              <FormRow
                label="Location type"
                htmlFor="rln-kind"
                required
                hint="Warehouse or Facility. Added by the instruction of 3 September 2026: this choice decides which master the location list below is read from."
              >
                <SelectInput
                  id="rln-kind"
                  value={locationKind}
                  onChange={(v) => {
                    setLocationKind(v as ReceivingLocationKind);
                    /* A location chosen from the other master cannot stay selected. */
                    setFacility("");
                  }}
                  required
                  options={LOCATION_KINDS}
                />
              </FormRow>

              {/* The country drop-down that used to sit here is gone, by the instruction of
                  3 September 2026: Core reads the country when the user signs in, so this
                  screen reads it too rather than asking. It is still shown, because the
                  list below depends on it and a filter nobody can see is a filter nobody
                  can account for. */}
              <FormRow
                label="Country"
                htmlFor="rln-country"
                behaviour="readonly"
                hint={
                  activeCountry.resolved
                    ? "Read from the session, not asked for — Core holds the operating country from the moment the user signs in to COTS. The location list below is the master for this country."
                    : "The session names no operating country, so the first configured country is being used and the location list below is that country's. Inside COTS this is read from the Core session; standalone, it is the demo account's own."
                }
              >
                <div id="rln-country">
                  <strong>{activeCountry.name}</strong>{" "}
                  <span className="small muted">({country})</span>{" "}
                  {activeCountry.resolved ? (
                    <StatusChip
                      tone="info"
                      label={
                        activeCountry.source === "session" ? "from the session" : "from the session unit"
                      }
                      size="sm"
                      title="The signed-in user's operating country. Changing it is a Core setting, not a field on this screen."
                    />
                  ) : (
                    <StatusChip
                      tone="warn"
                      label="default, not from the session"
                      size="sm"
                      title="No operating country was found on the session, so the first configured country is used. Said rather than presented as a confirmed scope."
                    />
                  )}
                </div>
              </FormRow>

              <FormRow
                label={locationKind === "warehouse" ? "Warehouse" : "Facility"}
                htmlFor="rln-facility"
                required
                error={errors["rln-facility"]}
                hint={`Read from the receiving-location master: every active ${locationKind} held under ${activeCountry.name}, the session\u2019s own country. Until 3 September 2026 this list was the location names other plan rows happened to carry, so a location could only be chosen once some earlier row had used it.`}
              >
                <SelectInput
                  id="rln-facility"
                  value={facility}
                  onChange={setFacility}
                  required
                  error={errors["rln-facility"]}
                  placeholder={
                    locationOptions.length === 0
                      ? `No ${locationKind} is held under ${activeCountry.name}`
                      : `Select a ${locationKind}…`
                  }
                  disabled={locationOptions.length === 0}
                  options={locationOptions}
                />
                {unmasteredLocations.length > 0 ? (
                  <p className="xsmall muted">
                    This agreement's saved rows also name {unmasteredLocations.join(", ")}, which the
                    chosen country and location type do not offer. Those rows are untouched — the master
                    governs what may be <em>added</em>, and a captured row that predates it is not
                    rewritten.
                  </p>
                ) : null}
              </FormRow>

              <FormRow
                label="Quantity (MT)"
                htmlFor="rln-quantity"
                required
                error={errors["rln-quantity"]}
                hint="The source never states the unit of measure for this field. MT is used throughout this mock-up and the unit is on the label."
              >
                <TextInput
                  id="rln-quantity"
                  value={quantity}
                  onChange={setQuantity}
                  required
                  error={errors["rln-quantity"]}
                  inputMode="decimal"
                />
              </FormRow>

              <FormRow
                label="Assigned to"
                htmlFor="rln-assignee"
                required
                error={errors["rln-assignee"]}
                hint="No user master is exposed, so the options are the assignees already on plan lines. What Assigned To confers is not documented anywhere and nothing here claims it."
              >
                <SelectInput
                  id="rln-assignee"
                  value={assignee}
                  onChange={setAssignee}
                  required
                  error={errors["rln-assignee"]}
                  placeholder="Select an assignee…"
                  options={assigneeOptions}
                />
              </FormRow>
            </div>

            <div className="factions">
              <button type="button" className="btn" onClick={addRow}>
                Add plan
              </button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={`Basket — ${staged.length} plan line(s) staged`} defaultOpen>
            {staged.length === 0 ? (
              <EmptyState title="No plan line staged yet" glyph="○">
                Stage one line per facility, then submit them together.
              </EmptyState>
            ) : (
              <>
                <div className="dtable__scroll">
                  <table className="dtable__table">
                    <caption className="sr-only">
                      Staged receiving location plan lines: location type, country, location, quantity and
                      assignee
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Location type</th>
                        <th scope="col">Location</th>
                        <th scope="col" className="text-right">
                          Quantity
                        </th>
                        <th scope="col">Assigned to</th>
                        <th scope="col">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staged.map((s) => (
                        <tr key={s.key}>
                          <td>
                            <StatusChip tone="info" label={humanise(s.locationKind)} size="sm" />{" "}
                            <span className="xsmall muted">{s.country}</span>
                          </td>
                          <td>{s.facility}</td>
                          <td className="text-right">{formatMt(s.quantityMt)}</td>
                          <td>{s.assignedTo}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn--sm"
                              onClick={() => setStaged((rows) => rows.filter((r) => r.key !== s.key))}
                            >
                              Remove line<span className="sr-only"> for {s.facility}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={2}>
                          <strong>Staged total</strong>
                        </td>
                        <td className="text-right">
                          <strong>{formatMt(stagedTotal)}</strong>
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="small" aria-live="polite" style={{ marginTop: "0.5rem" }}>
                  {headroom ? (
                    headroom.withinAgreement ? (
                      <>
                        Headroom after these {staged.length} staged line(s):{" "}
                        <strong>{formatMt(headroom.headroomMt)}</strong> of the agreed quantity would remain
                        unallocated.
                      </>
                    ) : (
                      <StatusChip
                        tone="risk"
                        label={`exceeds the agreement by ${formatMt(Math.abs(headroom.headroomMt))}`}
                        size="sm"
                      />
                    )
                  ) : (
                    <span className="muted">Select an agreement to see the headroom.</span>
                  )}
                </p>

                {headroom && !headroom.withinAgreement ? (
                  <Banner tone="warn" title="This would over-allocate the agreement">
                    {headroom.message} Nothing here refuses the save, because no source states that
                    over-allocation is blocked. It is reported so the person entering it can see it, the
                    service layer returns the same warning on success, and the{" "}
                    <Link to="/sourcing/locations">receiving location list</Link> flags the agreement as
                    over-allocated once the lines are saved.
                  </Banner>
                ) : null}
              </>
            )}
          </CollapsibleSection>

          <FormActions>
            <button type="submit" className="btn btn--primary" disabled={saving || staged.length === 0}>
              {saving ? "Saving…" : `Submit ${staged.length} plan line(s)`}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setStaged([])}
              disabled={staged.length === 0}
            >
              Clear the basket
            </button>
            <Link className="btn" to="/sourcing/locations">
              Cancel
            </Link>
            <p className="muted small">
              Saved plan lines cannot be deleted in the legacy module at all, and there is no delete here
              either, because no source establishes what deleting one would mean.
            </p>
          </FormActions>
        </form>
      </div>
    </>
  );
}

/* ================================================================== *
 * 4 and 5 — material receipt and warehouse receipt
 *
 * The same field set, a different `kind` and a different location list.
 * ================================================================== */

export function NewMaterialReceiptForm() {
  return <ReceiptForm kind="facility" />;
}

export function NewWarehouseReceiptForm() {
  return <ReceiptForm kind="warehouse" />;
}

function ReceiptForm({ kind }: { kind: "facility" | "warehouse" }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const agreements = useAsync(() => api.listPurchaseAgreements());
  const plans = useAsync(() => api.listReceivingLocationPlans());
  const receipts = useAsync(() => api.listIntakeReceipts());

  const [agreementId, setAgreementId] = useState("");
  const [location, setLocation] = useState("");
  const [receiptDate, setReceiptDate] = useState<string>(TODAY);
  const [receiptFrom, setReceiptFrom] = useState<"supplier" | "warehouse">(
    kind === "warehouse" ? "warehouse" : "supplier",
  );
  const [plateNo, setPlateNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [weighBridge, setWeighBridge] = useState("");
  const [bpBags, setBpBags] = useState("");
  const [spBags, setSpBags] = useState("");
  const [juteBags, setJuteBags] = useState("");
  const [gross, setGross] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isFacility = kind === "facility";
  const label = isFacility ? "material receipt" : "warehouse receipt";
  const listPath = isFacility ? "/sourcing/intake" : "/sourcing/warehouse";
  const agreementRows = agreements.data ?? [];
  const agreement = agreementRows.find((a) => a.id === agreementId);

  /** What the store enforces: a facility receipt is booked against an allocated facility. */
  const allocatedFacilities = optionsFrom(
    (plans.data ?? []).filter((p) => p.purchaseAgreementId === agreementId).map((p) => p.facility),
  );
  const warehouseCodes = optionsFrom(
    (receipts.data ?? []).filter((r) => r.kind === "warehouse").map((r) => r.location),
  );
  const locationOptions = isFacility ? allocatedFacilities : warehouseCodes;

  // Derived live from the bag counts, by the same functions the receipt detail uses.
  const bags: IntakeBagCounts = {
    bpBags: parseNumber(bpBags) ?? 0,
    spBags: parseNumber(spBags) ?? 0,
    juteBags: parseNumber(juteBags) ?? 0,
  };
  const bagTotal = totalBags(bags);
  const packaging = agreement ? packagingWeight(bags, agreement) : undefined;
  const grossMt = parseNumber(gross);

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!agreementId) next["rc-agreement"] = "Select the purchase agreement the receipt is booked against.";
    if (!location) {
      next["rc-location"] = isFacility
        ? "Select the receiving facility. Only a facility allocated on the agreement can receive against it."
        : "Select the warehouse the goods were received at.";
    }
    if (!receiptDate) next["rc-date"] = "Enter the receipt date.";
    if (!weighBridge.trim()) {
      next["rc-bridge"] =
        "Name the weighbridge the gross weight was read from. The legacy form requires neither the weighbridge nor the weight.";
    }
    if (grossMt === undefined) {
      next["rc-gross"] =
        "A receipt must record the weighbridge gross weight. The legacy form requires only the location and the date, which is how a receipt with zero quantities was saved.";
    } else if (grossMt <= 0) next["rc-gross"] = "The gross weight must be greater than zero.";
    return next;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setRefusal(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    const res = await api.createIntakeReceipt({
      kind,
      purchaseAgreementId: agreementId,
      location,
      receiptDate,
      receiptFrom,
      plateNo: plateNo.trim() || undefined,
      driverName: driverName.trim() || undefined,
      driverPhone: driverPhone.trim() || undefined,
      weighBridge: weighBridge.trim() || undefined,
      bags,
      grossWeightWithDirtMt: grossMt as number,
      note: note.trim() || undefined,
    });
    setSaving(false);
    if (!res.ok) {
      setRefusal(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    toast.push(
      "ok",
      `Receipt ${res.value.referenceNo} booked at ${res.value.location} — ${formatMt(res.value.grossWeightWithDirtMt)} gross with dirt, ${formatNumber(bagTotal)} bag(s). It carries no net weight, no value and no status until it is priced.`,
    );
    navigate(`/sourcing/receipts/${res.value.id}`);
  }

  const summary = errorList(errors);

  return (
    <>
      <PageHeader
        moduleLabel="Sourcing intake"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Sourcing intake", to: "/sourcing" },
          { label: isFacility ? "Material receipt" : "Warehouse receipt", to: listPath },
          { label: isFacility ? "New material receipt" : "New warehouse receipt" },
        ]}
        title={isFacility ? "New material receipt" : "New warehouse receipt"}
        meta={
          <>
            {user ? `${user.displayName} · ${user.unit}` : ""} · created {formatDate(TODAY)} · MMP{" "}
            {isFacility ? "Material Receipt" : "Warehouse Receipt"} · one physical delivery, priced in a
            separate step
          </>
        }
        recordKey="MMP"
        recordDate={`new ${label}`}
      />

      <div className="page">
        <Banner tone="info" title="What the legacy add form requires, and what this one requires">
          The legacy form requires only the location and the receipt date, which is how a receipt with no
          quantities came to be saved — zero bags of every type and a gross weight of zero. This form requires
          the weighbridge gross weight as well, and the service layer refuses the receipt without it. The bag
          total and the packaging tare below are derived as they are typed, by <code>totalBags()</code> and{" "}
          <code>packagingWeight()</code>; the legacy screen string-concatenated its bag total, printing 13,
          123 and 123 as 13123123 instead of 259.
        </Banner>

        <Banner tone="info" title="Pricing is a separate step, reached from the receipt once it exists">
          Nothing on this form prices the delivery. The price per pound, the dirt deduction, the agent's
          declared net weight, the commission and the receipt status all belong to MMP{" "}
          <code>Add Receipt Price</code>, which is reached from the agreement in the legacy system and from
          the receipt itself here. Until it runs, the receipt has no net weight, no value and no status, and
          no tonnage reaches the <Link to="/allocation/production-plan">weekly production plan</Link>.{" "}
          {isFacility
            ? "A facility receipt is priced and then confirmed, and only a confirmed receipt counts towards the plan (v2.0 §6.6 input 4, register C-24)."
            : "A warehouse receipt cannot be priced at all in the legacy system — both /WarehouseReceipts/Edit/{id} and /WarehouseReceipts/AddReceiptPrice/{id} return HTTP 500 — so the source states it can never be priced or confirmed through the UI. Here it can."}
        </Banner>

        {refusal ? (
          <Banner tone="risk" title={`The service layer refused this ${label}`}>
            {refusal}
          </Banner>
        ) : null}

        {isFacility && agreementId && allocatedFacilities.length === 0 ? (
          <Banner tone="warn" title="No facility is allocated on this agreement">
            {agreement?.paRef ?? "The agreement"} has no receiving location allocated, so nothing can be
            received against it. Allocate a facility on{" "}
            <Link to="/sourcing/locations/new">receiving locations</Link> first — that is the rule the store
            enforces.
          </Banner>
        ) : null}

        {!isFacility && warehouseCodes.length === 0 ? (
          <Banner tone="warn" title="No warehouse code is on file">
            Warehouse codes are taken from the warehouse receipts already held, and there are none. The source
            gives no warehouse master, so no code is invented here.
          </Banner>
        ) : null}

        <form className="stack" onSubmit={submit} noValidate>
          <ErrorSummary errors={summary} title={`This ${label} could not be booked`} />
          <RequiredLegend />

          <CollapsibleSection title="Agreement, location and date" defaultOpen>
            <div className="fields">
              <FormRow
                label="Purchase agreement"
                htmlFor="rc-agreement"
                required
                error={errors["rc-agreement"]}
                hint="The agreement carries the per-bag tare used for the packaging weight."
              >
                <SelectInput
                  id="rc-agreement"
                  value={agreementId}
                  onChange={(v) => {
                    setAgreementId(v);
                    setLocation("");
                  }}
                  required
                  error={errors["rc-agreement"]}
                  placeholder="Select an agreement…"
                  options={agreementRows.map((a) => ({
                    value: a.id,
                    label: `${a.paRef} — ${commodityName(a.commodityId)} — ${formatMt(a.totalQuantityMt)} agreed`,
                  }))}
                />
              </FormRow>

              <FormRow
                label={isFacility ? "Receiving facility" : "Warehouse"}
                htmlFor="rc-location"
                required
                error={errors["rc-location"]}
                hint={
                  isFacility
                    ? "Only facilities allocated as receiving locations on the chosen agreement are offered, because that is the rule the store enforces — a receipt is booked against a facility the agreement allocates to."
                    : "Taken from the warehouse codes on the warehouse receipts already held. The source gives no warehouse master."
                }
              >
                <SelectInput
                  id="rc-location"
                  value={location}
                  onChange={setLocation}
                  required
                  error={errors["rc-location"]}
                  placeholder={isFacility ? "Select a facility…" : "Select a warehouse…"}
                  options={locationOptions}
                  disabled={isFacility && !agreementId}
                />
              </FormRow>

              <FormRow label="Receipt date" htmlFor="rc-date" required error={errors["rc-date"]}>
                <TextInput
                  id="rc-date"
                  type="date"
                  value={receiptDate}
                  onChange={setReceiptDate}
                  required
                  error={errors["rc-date"]}
                />
              </FormRow>

              <FormRow label="Receipt from" htmlFor="rc-from" required>
                <SelectInput
                  id="rc-from"
                  value={receiptFrom}
                  onChange={setReceiptFrom}
                  required
                  options={RECEIPT_FROM}
                />
              </FormRow>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Truck and weighbridge" defaultOpen>
            <div className="fields">
              <FormRow label="Plate number" htmlFor="rc-plate">
                <TextInput id="rc-plate" value={plateNo} onChange={setPlateNo} />
              </FormRow>

              <FormRow label="Driver name" htmlFor="rc-driver">
                <TextInput id="rc-driver" value={driverName} onChange={setDriverName} />
              </FormRow>

              <FormRow label="Driver phone" htmlFor="rc-phone">
                <TextInput id="rc-phone" value={driverPhone} onChange={setDriverPhone} inputMode="tel" />
              </FormRow>

              <FormRow
                label="Weighbridge"
                htmlFor="rc-bridge"
                required
                error={errors["rc-bridge"]}
                hint="Where the gross weight was read. Optional on the legacy form, required here because the weight it produces is the only quantity the receipt is trusted for."
              >
                <TextInput
                  id="rc-bridge"
                  value={weighBridge}
                  onChange={setWeighBridge}
                  required
                  error={errors["rc-bridge"]}
                />
              </FormRow>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Bags and gross weight" defaultOpen>
            <div className="fields">
              <FormRow label="BP bags" htmlFor="rc-bp">
                <TextInput id="rc-bp" value={bpBags} onChange={setBpBags} inputMode="numeric" />
              </FormRow>

              <FormRow label="SP bags" htmlFor="rc-sp">
                <TextInput id="rc-sp" value={spBags} onChange={setSpBags} inputMode="numeric" />
              </FormRow>

              <FormRow label="Jute bags" htmlFor="rc-jute">
                <TextInput id="rc-jute" value={juteBags} onChange={setJuteBags} inputMode="numeric" />
              </FormRow>

              <FormRow
                label="Gross weight with dirt (MT)"
                htmlFor="rc-gross"
                required
                error={errors["rc-gross"]}
                hint="The weighbridge figure. Required here; optional on the legacy form."
              >
                <TextInput
                  id="rc-gross"
                  value={gross}
                  onChange={setGross}
                  required
                  error={errors["rc-gross"]}
                  inputMode="decimal"
                />
              </FormRow>
            </div>

            <div aria-live="polite">
              <FieldGrid
                fields={[
                  {
                    label: "Total bags",
                    value: formatNumber(bagTotal),
                    behaviour: "calculated",
                    hint: "The three counts added, not joined as text.",
                  },
                  {
                    label: "Packaging weight",
                    value: packaging ? formatMt(packaging.totalMt) : undefined,
                    behaviour: "calculated",
                    hint: agreement
                      ? `Per-bag tare on ${agreement.paRef}: BP ${agreement.bpBagWeightLb} lb, SP ${agreement.spBagWeightLb} lb, jute ${agreement.juteBagWeightLb} lb — ${formatNumber(packaging?.totalLb)} lb in total.`
                      : "Select an agreement — the per-bag tare is carried on it.",
                  },
                  {
                    label: "Packaging weight as the legacy field held it",
                    value: packaging
                      ? `${formatNumber(packaging.legacyMt)} in the field named NetWeight`
                      : undefined,
                    hint: `MMP divides the pound total by ${LEGACY_LB_PER_MT_DIVISOR} while one tonne is ${formatNumber(LB_PER_MT)} lb, so the legacy column mixes MT and LB.`,
                  },
                ]}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Note" defaultOpen={false}>
            <FormRow label="Note" htmlFor="rc-note">
              <TextArea id="rc-note" value={note} onChange={setNote} rows={3} />
            </FormRow>
          </CollapsibleSection>

          <FormActions>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Booking…" : `Book the ${label}`}
            </button>
            <Link className="btn" to={listPath}>
              Cancel
            </Link>
            <p className="muted small">
              {summary.length > 0
                ? `${summary.length} field${summary.length === 1 ? "" : "s"} need attention.`
                : "The receipt opens on save, where the separate pricing step is reached."}
            </p>
          </FormActions>
        </form>
      </div>
    </>
  );
}

/* ================================================================== *
 * 6 — New agent balance · /sourcing/balances/new
 * ================================================================== */

export function NewAgentBalanceForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const balances = useAsync(() => api.listAgentBalances());
  const funds = useAsync(() => api.listFunds());
  const agreements = useAsync(() => api.listPurchaseAgreements());

  const [supplierId, setSupplierId] = useState("");
  const [seasonality, setSeasonality] = useState("");
  const [actual, setActual] = useState("");
  const [estimated, setEstimated] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const balanceRows = balances.data ?? [];
  const seasonOptions = optionsFrom([
    ...balanceRows.map((b) => b.seasonality),
    ...(funds.data ?? []).map((f) => f.seasonality),
    ...(agreements.data ?? []).map((a) => a.seasonality),
  ]);
  const actualAmount = parseNumber(actual);
  const estimatedAmount = parseNumber(estimated);
  const clash = balanceRows.find((b) => b.supplierId === supplierId && b.seasonality === seasonality);

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!supplierId) next["ab-agent"] = "Select an agent.";
    if (!seasonality) next["ab-season"] = "Select the seasonality.";
    if (actualAmount === undefined) next["ab-actual"] = "Enter the actual balance, in SDG.";
    else if (actualAmount < 0) next["ab-actual"] = "A balance cannot be negative.";
    if (estimatedAmount === undefined) next["ab-estimated"] = "Enter the estimated balance, in SDG.";
    else if (estimatedAmount < 0) next["ab-estimated"] = "A balance cannot be negative.";
    if (clash) {
      next["ab-season"] =
        "That agent already has a balance for that season. MMP states no uniqueness rule, which is how a list can show two rows for one position.";
    }
    return next;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setRefusal(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    const res = await api.createAgentBalance({
      supplierId,
      seasonality: seasonality as Seasonality,
      actualBalance: money(actualAmount as number, "SDG"),
      estimatedBalance: money(estimatedAmount as number, "SDG"),
    });
    setSaving(false);
    if (!res.ok) {
      setRefusal(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    toast.push(
      "ok",
      `Balance recorded for ${counterpartyById(res.value.supplierId)?.name ?? "the agent"}, season ${res.value.seasonality} — actual ${formatMoney(res.value.actualBalance)}, estimated ${formatMoney(res.value.estimatedBalance)}.`,
    );
    navigate("/sourcing/balances");
  }

  const summary = errorList(errors);

  return (
    <>
      <PageHeader
        moduleLabel="Sourcing intake"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Sourcing intake", to: "/sourcing" },
          { label: "Agent balance list", to: "/sourcing/balances" },
          { label: "New agent balance" },
        ]}
        title="New agent balance"
        meta={
          <>
            {user ? `${user.displayName} · ${user.unit}` : ""} · created {formatDate(TODAY)} · MMP{" "}
            <code>/AgentBalances/Create</code> · one balance per agent per season
          </>
        }
        recordKey="MMP"
        recordDate="new agent balance"
      />

      <div className="page">
        <Banner tone="warn" title="What the legacy scaffold does, and what this form does instead">
          <code>/AgentBalances/Create</code> is an unstyled MVC scaffold that is unreachable by navigation:
          nothing in the legacy UI links to it. It asks for <code>BalanceID</code> as an editable required
          primary key, takes both balances as plain text inputs, and its <code>Details</code> and{" "}
          <code>Edit</code> routes return HTTP 404, so a balance created through it can never be opened or
          corrected. Here the id is generated on save, both balances are money in SDG, and one balance per
          agent per season is enforced — MMP states no uniqueness rule at all, which is how a list can show
          two rows for one position and neither be wrong.
        </Banner>

        <Banner tone="warn" title="Neither balance has a stated derivation, and none has been invented">
          The source gives no derivation, no source and no refresh mechanism for either{" "}
          <em>Actual Balance</em> or <em>Estimated Balance</em>, does not explain how the two are meant to
          differ, and shows them equal on both live records — so neither is computed here and both are typed.
          No sign convention is stated either, so whether a positive balance is owed <em>by</em> the agent or{" "}
          <em>to</em> the agent is unknown and not asserted. No currency is declared anywhere on the legacy
          grid; the magnitudes are SDG-scale by comparison with the Funds page, and that inference is labelled
          rather than hidden. The funding and drawdown either balance would have to reconcile against are on
          the <Link to="/sourcing/balances">agent balance list</Link>.
        </Banner>

        {refusal ? (
          <Banner tone="risk" title="The service layer refused this balance">
            {refusal}
          </Banner>
        ) : null}

        <form className="stack" onSubmit={submit} noValidate>
          <ErrorSummary errors={summary} title="This agent balance could not be created" />
          <RequiredLegend />

          <CollapsibleSection title="Agent, season and the two balances" defaultOpen>
            <div className="fields">
              <FormRow
                label="Balance id"
                htmlFor="ab-id"
                behaviour="readonly"
                hint="Generated on save. The legacy scaffold asks for it as an editable required primary key."
              >
                <div id="ab-id" className="muted small">
                  Issued on save
                </div>
              </FormRow>

              <FormRow label="Agent" htmlFor="ab-agent" required error={errors["ab-agent"]}>
                <SelectInput
                  id="ab-agent"
                  value={supplierId}
                  onChange={setSupplierId}
                  required
                  error={errors["ab-agent"]}
                  placeholder="Select an agent…"
                  options={SUPPLIER_OPTIONS}
                />
              </FormRow>

              <FormRow
                label="Seasonality"
                htmlFor="ab-season"
                required
                error={errors["ab-season"]}
                hint="No seasonality master exists in the source, so the options are the seasons already held."
              >
                <SelectInput
                  id="ab-season"
                  value={seasonality}
                  onChange={setSeasonality}
                  required
                  error={errors["ab-season"]}
                  placeholder="Select a season…"
                  options={seasonOptions}
                />
              </FormRow>

              <FormRow
                label="Actual balance (SDG)"
                htmlFor="ab-actual"
                required
                error={errors["ab-actual"]}
                hint="Money, not text. The legacy scaffold takes it as a plain text input."
              >
                <TextInput
                  id="ab-actual"
                  value={actual}
                  onChange={setActual}
                  required
                  error={errors["ab-actual"]}
                  inputMode="decimal"
                />
              </FormRow>

              <FormRow
                label="Estimated balance (SDG)"
                htmlFor="ab-estimated"
                required
                error={errors["ab-estimated"]}
                hint="Money, not text, and not derived from the actual balance — the source states no relationship between them."
              >
                <TextInput
                  id="ab-estimated"
                  value={estimated}
                  onChange={setEstimated}
                  required
                  error={errors["ab-estimated"]}
                  inputMode="decimal"
                />
              </FormRow>
            </div>

            <FieldGrid
              columns={2}
              fields={[
                {
                  label: "Actual balance",
                  value: actualAmount !== undefined ? formatMoney(money(actualAmount, "SDG")) : undefined,
                },
                {
                  label: "Estimated balance",
                  value:
                    estimatedAmount !== undefined ? formatMoney(money(estimatedAmount, "SDG")) : undefined,
                },
              ]}
            />
            {actualAmount !== undefined && estimatedAmount !== undefined ? (
              <p className="small" aria-live="polite" style={{ marginTop: "0.5rem" }}>
                {actualAmount === estimatedAmount ? (
                  <>
                    <StatusChip tone="info" label="equal, as on every captured row" size="sm" /> Both live
                    legacy records hold the two figures equal, and the source states no derivation for either,
                    so nothing here treats that as an error.
                  </>
                ) : (
                  <>
                    Divergence: <strong>{formatMoney(money(actualAmount - estimatedAmount, "SDG"))}</strong>.
                    No captured legacy row is in this state.
                  </>
                )}
              </p>
            ) : null}
          </CollapsibleSection>

          <FormActions>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Creating…" : "Create agent balance"}
            </button>
            <Link className="btn" to="/sourcing/balances">
              Cancel
            </Link>
            <p className="muted small">
              {summary.length > 0
                ? `${summary.length} field${summary.length === 1 ? "" : "s"} need attention.`
                : "Transfer and refund are reached from the balance list, where the legacy left both dialogs unbuilt."}
            </p>
          </FormActions>
        </form>
      </div>
    </>
  );
}
