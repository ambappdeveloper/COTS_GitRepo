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

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { COMMODITIES, COUNTERPARTIES, commodityById, counterpartyById } from "../data/master";
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
import { humanise, toneFor } from "../domain/status";
import {
  LB_PER_MT,
  LEGACY_LB_PER_MT_DIVISOR,
  allocationBalance,
  checkAllocationHeadroom,
  fundValueLocal,
  fundValueUsd,
  packagingWeight,
  totalBags,
} from "../domain/sourcing";
import {
  activePlans,
  formatSeasonMonth,
  planCarriesCommodity,
  planCommodities,
  planTotals,
} from "../domain/planning";
import type {
  CurrencyCode,
  FundMode,
  IntakeBagCounts,
  PurchaseAgreementAttachment,
  PurchaseAgreementFlowStatus,
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

/** MMP `Flow Status`. The source spells the last one `Cancled`; normalised once here. */
const FLOW_STATUSES: { value: PurchaseAgreementFlowStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "on_going", label: "On going" },
  { value: "hold", label: "Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
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

  /* --- Create captures these five --- */
  const [seasonality, setSeasonality] = useState("");
  const [agentId, setAgentId] = useState("");
  const [commodityId, setCommodityId] = useState("");
  const [valueLocal, setValueLocal] = useState("");
  const [localCurrency, setLocalCurrency] = useState<CurrencyCode>("SDG");
  const [requiredPaymentDate, setRequiredPaymentDate] = useState<string>(TODAY);
  /* --- Update adds these --- */
  const [purchaseOrderNo, setPurchaseOrderNo] = useState("");
  const [actualPaymentDate, setActualPaymentDate] = useState("");
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
    setPurchaseOrderNo(existing.purchaseOrderNo ?? "");
    setActualPaymentDate(existing.actualPaymentDate ?? "");
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
  const contact = agentContact(agentId);
  const value = parseNumber(valueLocal);

  /** Read, never entered — the rate in force on the actual payment date. */
  const rate = exchangeRateOn(localCurrency, actualPaymentDate || undefined);
  const usd = value !== undefined && rate ? money(round(value / rate.perUsd, 2), "USD") : undefined;
  const coverage = fxCoverage(localCurrency);
  const delayDays =
    actualPaymentDate && requiredPaymentDate
      ? daysBetween(requiredPaymentDate, actualPaymentDate)
      : undefined;

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!seasonality) next["fd-season"] = "Select the seasonality.";
    if (!agentId) next["fd-agent"] = "Select an agent.";
    if (!commodityId) next["fd-commodity"] = "Select the commodity.";
    if (!requiredPaymentDate) next["fd-required-date"] = "Enter the required payment date.";
    if (value === undefined) next["fd-value"] = "Enter the value in local currency.";
    else if (value <= 0) next["fd-value"] = "The value in local currency must be above zero.";
    if (mode === "edit") {
      if (actualPaymentDate && !rate) {
        next["fd-actual-date"] =
          `No exchange rate is held for ${localCurrency} on that date. The rate table runs from ${formatDate(coverage.from)}, and the rate is read from it on the actual payment date.`;
      }
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
            purchaseOrderNo: purchaseOrderNo.trim() || undefined,
            requiredPaymentDate,
            actualPaymentDate: actualPaymentDate || undefined,
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

          <CollapsibleSection title="The request" defaultOpen>
            <div className="fields">
              <FormRow
                label="Seasonality"
                htmlFor="fd-season"
                required
                error={errors["fd-season"]}
                hint="No seasonality master exists in the source, so the options are the seasons already held on funds, agreements and balances."
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
                <div className="fields">
                  <FormRow
                    label="PO number"
                    htmlFor="fd-po"
                    hint="Issued after the fund is requested, which is why it is on this screen and not on Create."
                  >
                    <TextInput id="fd-po" value={purchaseOrderNo} onChange={setPurchaseOrderNo} />
                  </FormRow>

                  <FormRow
                    label="Actual payment date"
                    htmlFor="fd-actual-date"
                    error={errors["fd-actual-date"]}
                    hint="The date payment was made. Recording it is what gives the fund an exchange rate and a value in USD."
                  >
                    <TextInput
                      id="fd-actual-date"
                      type="date"
                      value={actualPaymentDate}
                      onChange={setActualPaymentDate}
                      error={errors["fd-actual-date"]}
                    />
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
                    hint="Value in local currency ÷ the rate above. The division is the legacy module's own formula; what changed is where the divisor comes from."
                  >
                    <div id="fd-usd" aria-live="polite">
                      {usd ? (
                        <strong>{formatMoney(usd)}</strong>
                      ) : (
                        <span className="muted">not until the fund is paid</span>
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
  const [purchaser, setPurchaser] = useState(user?.displayName ?? "");
  const [totalQuantityMt, setTotalQuantityMt] = useState("");
  /* Open by default, as the instruction states. */
  const [flowStatus, setFlowStatus] = useState<PurchaseAgreementFlowStatus>("open");
  /* Today by default, as the instruction states. */
  const [agreementDate, setAgreementDate] = useState<string>(TODAY);
  const [bagWeightApplicable, setBagWeightApplicable] = useState(false);
  const [bpBagWeightLb, setBpBagWeightLb] = useState("");
  const [spBagWeightLb, setSpBagWeightLb] = useState("");
  const [juteBagWeightLb, setJuteBagWeightLb] = useState("");
  const [purchaseOrderNo, setPurchaseOrderNo] = useState("");
  const [attachments, setAttachments] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const [saving, setSaving] = useState<false | "save" | "share">(false);
  const [hydrated, setHydrated] = useState(mode === "create");

  useEffect(() => {
    if (mode !== "edit" || !existing || hydrated) return;
    setSeasonality(existing.seasonality);
    setSeasonalPlanId(existing.seasonalPlanId ?? "");
    setCommodityId(existing.commodityId);
    setSupplierId(existing.supplierId);
    setPurchaser(existing.purchaser);
    setTotalQuantityMt(String(existing.totalQuantityMt));
    setFlowStatus(existing.flowStatus);
    setAgreementDate(existing.agreementDate);
    setBagWeightApplicable(existing.bagWeightApplicable);
    setBpBagWeightLb(existing.bpBagWeightLb === undefined ? "" : String(existing.bpBagWeightLb));
    setSpBagWeightLb(existing.spBagWeightLb === undefined ? "" : String(existing.spBagWeightLb));
    setJuteBagWeightLb(existing.juteBagWeightLb === undefined ? "" : String(existing.juteBagWeightLb));
    setPurchaseOrderNo(existing.purchaseOrderNo ?? "");
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

  const bp = parseNumber(bpBagWeightLb);
  const sp = parseNumber(spBagWeightLb);
  const jute = parseNumber(juteBagWeightLb);
  const quantity = parseNumber(totalQuantityMt);

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
    if (!purchaser.trim()) next["pa-purchaser"] = "Name the purchaser.";
    if (!agreementDate) next["pa-date"] = "Enter the agreement date.";
    if (quantity === undefined) next["pa-quantity"] = "Enter the agreed quantity.";
    else if (quantity <= 0) {
      next["pa-quantity"] =
        "The agreed quantity must be above zero — receiving locations allocate against it.";
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
            flowStatus,
            agreementDate,
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
            purchaser: purchaser.trim(),
            totalQuantityMt: quantity as number,
            flowStatus,
            agreementDate,
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
        `${counterpartyById(res.value.supplierId)?.name ?? "the supplier"}, ${humanise(res.value.flowStatus)}. ` +
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

              <FormRow
                label="Purchaser"
                htmlFor="pa-purchaser"
                required
                error={errors["pa-purchaser"]}
                hint="MMP renders a username in the grid and a display name on the detail views. The display name is captured."
              >
                <TextInput
                  id="pa-purchaser"
                  value={purchaser}
                  onChange={setPurchaser}
                  required
                  error={errors["pa-purchaser"]}
                />
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
  facility: string;
  quantityMt: number;
  assignedTo: string;
}

export function NewReceivingLocationForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const agreements = useAsync(() => api.listPurchaseAgreements());
  const plans = useAsync(() => api.listReceivingLocationPlans());

  const [agreementId, setAgreementId] = useState("");
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

  const facilityOptions = optionsFrom(planRows.map((p) => p.facility));
  const assigneeOptions = optionsFrom([
    ...planRows.map((p) => p.assignedTo),
    ...agreementRows.map((a) => a.createdBy),
    user?.username,
  ]);

  function addRow() {
    const next: Record<string, string> = {};
    if (!agreementId) next["rln-agreement"] = "Select the agreement the allocation belongs to.";
    if (!facility) next["rln-facility"] = "Select a receiving facility.";
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
      staged.map((s) => ({ facility: s.facility, quantityMt: s.quantityMt, assignedTo: s.assignedTo })),
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
              <FormRow
                label="Facility"
                htmlFor="rln-facility"
                required
                error={errors["rln-facility"]}
                hint="There is no facility master in the source, so the options are the facility codes already on plan lines."
              >
                <SelectInput
                  id="rln-facility"
                  value={facility}
                  onChange={setFacility}
                  required
                  error={errors["rln-facility"]}
                  placeholder="Select a facility…"
                  options={facilityOptions}
                />
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
                      Staged receiving location plan lines: facility, quantity and assignee
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Facility</th>
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
                        <td>
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
