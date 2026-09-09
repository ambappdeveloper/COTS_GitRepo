/**
 * New purchase contract (P2) — the target-state version of the legacy `Purchase Contract`
 * InfoPath form, added in v1.1.
 *
 * The layout follows the legacy form section by section, in the same order, using the same
 * business words, so the people who fill it in every day recognise it: contract details,
 * quantity, shipping period, lots, inco term, packing, cargo instruction, the operational
 * fields, document instruction, and artwork. What differs is listed on the page itself and in
 * `domain/purchase-contract.ts`: lots are an unbounded collection, totals are computed, and the
 * rules that the legacy form printed but did not enforce now block the save.
 *
 * Validation runs live once a field has been touched, and again on submit; the service layer
 * validates a third time (see `api.createContract`). Errors are summarised in a focusable
 * region that links to each control.
 *
 * Reached two ways. From the Contracts tile with no query string, it is a blank form, which is
 * every legacy record. Reached from an agreed deal as `?opportunity=<id>`, it carries in the
 * twelve-item data set v2.0 §6.2 activity 2 names, marks each field it filled as inherited, and
 * passes the opportunity to `api.createContract`, which links the two records and copies the
 * locked costing snapshot onto the contract (§6.2 activity 3, §6.3). A query string that does
 * not resolve, or whose deal is not agreed, degrades to the blank form rather than blocking.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Banner, StatusChip, useToast } from "../components/feedback";
import { CollapsibleSection, PageHeader } from "../components/layout";
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
  CONSIGNEES,
  COUNTERPARTIES,
  PACKING_SIZES_KG,
  PORTS,
  commodityById,
  commodityTypesFor,
  consigneeByName,
  counterpartyById,
  isMasterPaymentTerm,
  paymentTerms,
  paymentTermsSourceName,
} from "../data/master";
import { TODAY, formatDate, formatMoney, formatMt } from "../domain/calc";
import {
  CONTAINER_SIZE_OPTIONS,
  DEFAULT_DOCUMENT_REQUIREMENTS,
  FUMIGATION_OPTIONS,
  PARTIAL_SHIPMENT_OPTIONS,
  emptyDraft,
  emptyLot,
  errorList,
  lotTotals,
  validatePurchaseContractDraft,
  type LotDraft,
  type PurchaseContractDraft,
} from "../domain/purchase-contract";
import {
  DOCUMENT_REQUIREMENT_LABEL,
  SHIPMENT_TYPE_LABEL,
  type Contract,
  type DocumentRequirementKey,
  type FieldBehaviour,
} from "../domain/types";
import { COUNTRY_PROFILES } from "../domain/variants";
import { api } from "../services/store";
import { useAsync } from "./hooks";
import "./purchase-contract.css";

const INCOTERMS = ["CNF", "CIF", "FOB", "FCA", "EXW", "DAP"] as const;
const PACKING_TYPES = ["bags", "bales", "bulk", "flexi_tank", "drums"] as const;
const PACKING_TYPE_LABEL: Record<(typeof PACKING_TYPES)[number], string> = {
  bags: "Bags",
  bales: "Bales",
  bulk: "Bulk",
  flexi_tank: "Flexi-tank",
  drums: "Drums",
};
const METHODS_OF_SHIPPING = [
  "Container",
  "Break bulk",
  "Bulk vessel",
  "Road transport",
  "Air freight",
] as const;
const COMMUNICATED_FROM = ["Trader", "Dubai Execution", "Country Execution", "Customer"] as const;
const DUBAI_EXECUTION = ["Amara Osei", "Kwame Boateng", "Leila Haddad"] as const;
const ARTWORK_TYPES = [
  { value: "standard" as const, label: "Standard" },
  { value: "buyer_option" as const, label: "Buyer option" },
];
const DOCUMENT_ORDER: DocumentRequirementKey[] = [
  "bl_awb_roadwb",
  "commercial_invoice",
  "coo_normal",
  "packing_list",
  "fumigation_certificate",
  "export_health_certificate",
  "phytosanitary_certificate",
  "certificate_of_analysis",
  "quality_certificate_surveyor",
  "weight_certificate_surveyor",
  "dft",
  "ldc",
  "coo_arabic",
  "invoice_arabic",
  "ssmo_certificate",
  "other",
];

export function PurchaseContractForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const opportunityId = searchParams.get("opportunity") ?? "";
  const opportunity = useAsync(
    () => (opportunityId ? api.getOpportunity(opportunityId) : Promise.resolve(undefined)),
    [opportunityId],
  );
  /**
   * The trader, read and not asked for.
   *
   * "Under Add screen, remove the trader name field in this screen." — instruction of
   * 5 September 2026. The field it removes was wrong in a way the screenshot shows: it was
   * marked *inherited*, because the agreed deal had supplied a trader, and it was still
   * empty and still blocking the save, because the name the deal supplied — Tomás Ferreira,
   * the trader on OPP-2026-014 and on every seeded contract — was not one of the four names
   * in the drop-down's own hard-coded list. The list was a constant in this file rather than
   * master data, so the form asked the user to overwrite the real trader with a name that
   * was not the trader.
   *
   * The trader is therefore derived, and there are exactly two places it can come from:
   *
   *   1. the agreed deal, when the contract is raised from one — v2.0 §6.2 activity 2 already
   *      passes it, and origination requires it, so on this path it is always present;
   *   2. the session, but only when the signed-in user *is* a trader.
   *
   * There were three until 6 September 2026, when the instruction removed "Retrieve PC No."
   * and with it the copied contract's trader. That narrows the blank-form path: a contract
   * not raised from a deal now needs a trader to be signed in, and there is no longer a way
   * to borrow one from an existing contract.
   *
   * The second is deliberately narrow. Unlike the purchaser at Phase 04, the person filling
   * this form is usually not the person the field names — the legacy form's own "Communicated
   * from" offers Dubai Execution, Country Execution and Customer beside Trader — so defaulting
   * to the signed-in user would put an execution clerk's name in a trader's field. Where
   * neither applies the contract has no trader and the save is refused, with the reason
   * stated, rather than a name being invented. See the open question in CHANGES.md.
   */
  const sessionTrader = user?.role === "trader" ? user.displayName : "";
  const [draft, setDraft] = useState<PurchaseContractDraft>(() => ({
    ...emptyDraft(TODAY),
    // A blank form raised by a trader records that trader. Raised from a deal, the deal's
    // trader arrives in the prefill below and is not pre-empted here.
    traderName: opportunityId ? "" : sessionTrader,
  }));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [lotSeq, setLotSeq] = useState(1);
  /** Control ids the deal filled in, so each one can say so on screen. */
  const [carriedIn, setCarriedIn] = useState<string[]>([]);
  const prefilledFor = useRef<string | null>(null);

  const errors = useMemo(() => validatePurchaseContractDraft(draft), [draft]);
  const totals = useMemo(() => lotTotals(draft), [draft]);
  const shown = (field: string) => (submitted || touched[field] ? errors[field] : undefined);
  /** `inherited` is the badge the rest of this form uses for a value that came from elsewhere. */
  const from = (field: string): FieldBehaviour | undefined =>
    carriedIn.includes(field) ? "inherited" : undefined;

  /** The deal is only linkable once it has been agreed — the store refuses otherwise. */
  const deal = opportunity.data?.dealAgreedOn ? opportunity.data : undefined;
  const dealTerms = deal?.deal;

  /**
   * The commodity's own grades, from the commodity-type master.
   *
   * "Commodity type field change to dropdown list it will come from master data, based on
   * the selected Commodity field." — 6 September 2026. Dependent, not merely governed: a
   * grade belongs to a commodity, so one flat list would offer cotton grades against
   * sesame. Empty is a real answer — not every commodity is graded — and the hint says so
   * rather than leaving an empty list unexplained.
   */
  const commodityTypes = commodityTypesFor(draft.commodityId);

  /**
   * Packing size and B/L consignee, both moved from free text to the master on
   * 6 September 2026.
   *
   * The interesting part of both is the same, and it is the lesson of the trader drop-down
   * removed the day before: a list that does not contain the value the record already holds
   * must say so rather than blank the field. The captured contracts hold three values these
   * masters do not — a 175 kg cotton bale, a 0 for bulk cargo, and the shipping term
   * "To order".
   *
   *   · Packing size keeps such a value as an extra option, marked as outside the master.
   *   · Consignee reads such a value as "Others" with the captured string kept as the name,
   *     which is what "Others" is for.
   *
   * The consignee path is live from the first render, because the blank draft's own legacy
   * default is "To order". The packing-size path is not reachable from this screen any more:
   * "Retrieve PC No." was the only thing that put a captured size into this draft, and the
   * instruction of 6 September removed it. It is kept rather than deleted because the value
   * it protects still exists on the records — an Edit screen, or any future prefill, meets
   * it immediately — and because deleting it is how the trader defect happened.
   */
  const packingSizeOutsideMaster =
    draft.packingSizeKg.trim() !== "" && !PACKING_SIZES_KG.includes(Number(draft.packingSizeKg));
  const packingSizeOptions = [
    ...PACKING_SIZES_KG.map((kg) => ({ value: String(kg), label: `${kg} kg` })),
    ...(packingSizeOutsideMaster
      ? [
          {
            value: draft.packingSizeKg,
            label: `${draft.packingSizeKg} kg — not in the master`,
          },
        ]
      : []),
  ];

  /**
   * Payment terms, moved from free text to the master on 8 September 2026.
   *
   * The same extra-option rule as the packing size, and here it is live rather than defensive:
   * the deal on OPP-2026-014 carries "60 days from B/L date, D/A", which is `DA 60 days`
   * written in words, and §6.2 activity 2 copies it onto this draft. Blanking it would throw
   * away a term the trader agreed; silently accepting it would let the fifth spelling of the
   * same term onto a contract. So it is kept, offered, and marked.
   */
  const paymentTermsOutsideMaster = !isMasterPaymentTerm(draft.paymentTerms);
  const paymentTermOptions = [
    ...paymentTerms()
      .filter((t) => t.active)
      .map((t) => ({ value: t.label, label: t.label })),
    ...(paymentTermsOutsideMaster
      ? [{ value: draft.paymentTerms, label: `${draft.paymentTerms} — not in the master` }]
      : []),
  ];

  /** The master entry the draft's consignee matches, or the catch-all where it matches none. */
  const consigneeCode = draft.consignee.trim()
    ? (consigneeByName(draft.consignee)?.code ?? "OTHER")
    : "";
  const consigneeIsOther = consigneeCode === "OTHER";

  function chooseConsignee(code: string) {
    const entry = CONSIGNEES.find((c) => c.code === code);
    setDraft((d) => ({
      ...d,
      /* Picking a named consignee writes its name; picking Others clears the box so the
         party is named deliberately, unless what is there already is a free-text name. */
      consignee: !entry || entry.isOther ? (consigneeByName(d.consignee) ? "" : d.consignee) : entry.name,
    }));
    mark("pc-consignee");
  }

  /** Which of the two sources the trader on this draft actually came from. */
  const traderSource = !draft.traderName
    ? ""
    : carriedIn.includes("pc-trader")
      ? `Read from the agreed deal on ${deal?.opportunityNo ?? "the opportunity"} — the trader who struck it.`
      : `Read from the session — you are signed in as a trader.`;

  /**
   * v2.0 §6.2 activity 2 — the data set passed in full from the trader to Dubai Execution.
   * Applied once per opportunity: `useAsync` re-fetches on every store mutation, and a
   * second application would overwrite whatever has since been typed.
   */
  useEffect(() => {
    if (!deal || prefilledFor.current === deal.id) return;
    prefilledFor.current = deal.id;
    const t = deal.deal;
    const patch: Partial<PurchaseContractDraft> = {};
    const ids: string[] = [];

    const buyerId = t?.buyerId ?? deal.buyerId;
    if (buyerId) {
      const b = counterpartyById(buyerId);
      patch.buyerId = buyerId;
      ids.push("pc-buyer");
      if (b?.address) {
        patch.buyerAddress = b.address;
        ids.push("pc-buyer-address");
      }
      if (b?.nickName) {
        patch.buyerNickName = b.nickName;
        ids.push("pc-buyer-nick");
      }
    }
    const commodityId = t?.commodityId ?? deal.commodityId;
    if (commodityId) {
      patch.commodityId = commodityId;
      ids.push("pc-commodity");
    }
    const origin = t?.origin ?? deal.origin;
    if (origin) {
      patch.origin = origin;
      ids.push("pc-origin");
    }
    if (deal.traderName) {
      patch.traderName = deal.traderName;
      ids.push("pc-trader");
    }
    if (t?.incoterm) {
      patch.incoterm = t.incoterm;
      ids.push("pc-incoterm");
    }
    if (t?.portOfLoadingId) {
      patch.portOfLoadingId = t.portOfLoadingId;
      ids.push("pc-port-loading");
    }
    if (t?.portOfDischargeId) {
      patch.portOfDischargeId = t.portOfDischargeId;
      ids.push("pc-port-discharge");
    }
    // Every draft field is a string, a string union or a boolean — never a number.
    if (t?.quantityMt !== undefined) {
      patch.quantityMt = String(t.quantityMt);
      ids.push("pc-quantity");
    }
    if (t?.shipmentPeriodStart) {
      patch.shipmentPeriodStart = t.shipmentPeriodStart;
      ids.push("pc-period-start");
    }
    if (t?.shipmentPeriodEnd) {
      patch.shipmentPeriodEnd = t.shipmentPeriodEnd;
      ids.push("pc-period-end");
    }
    if (t?.paymentTerms) {
      patch.paymentTerms = t.paymentTerms;
      ids.push("pc-payment-terms");
    }
    const note = t?.notes ?? deal.note;
    if (note) {
      patch.note = note;
      ids.push("pc-note");
    }

    setDraft((d) => ({ ...d, ...patch }));
    setCarriedIn(ids);
  }, [deal]);

  const set = <K extends keyof PurchaseContractDraft>(key: K, value: PurchaseContractDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const mark = (field: string) => setTouched((t) => ({ ...t, [field]: true }));

  const buyers = COUNTERPARTIES.filter((c) => c.type === "buyer" && c.active);
  const surveyors = COUNTERPARTIES.filter((c) => c.type === "surveyor" && c.active);
  const notifyParties = COUNTERPARTIES.filter((c) => ["buyer", "bank", "forwarder"].includes(c.type));
  const loadPorts = PORTS.filter((p) => p.type === "load" || p.type === "both");
  const dischargePorts = PORTS.filter((p) => p.type === "discharge" || p.type === "both");
  const commodity = commodityById(draft.commodityId);

  /** Buyer drives address and nick name — legacy required both and then left them blank. */
  function chooseBuyer(id: string) {
    const b = counterpartyById(id);
    setDraft((d) => ({
      ...d,
      buyerId: id,
      buyerAddress: b?.address ?? d.buyerAddress,
      buyerNickName: b?.nickName ?? d.buyerNickName,
      notifyParty: d.notifyParty || id,
      notifyPartyAddress: d.notifyPartyAddress || (b?.address ?? ""),
    }));
  }

  /** Commodity defaults packing type and fumigation, per its master record. */
  function chooseCommodity(id: string) {
    const c = commodityById(id);
    setDraft((d) => ({
      ...d,
      commodityId: id,
      /* A grade belongs to a commodity, so changing the commodity drops a grade the new one
         does not have. Kept where it survives the change — several sesames share "Non-GDP",
         and silently clearing it would be a value lost to a change that did not affect it. */
      commodityType: commodityTypesFor(id).includes(d.commodityType) ? d.commodityType : "",
      packingType: d.packingType || (c?.defaultPackingType ?? ""),
      fumigationType: d.fumigationType || (c && !c.requiresFumigation ? "none" : d.fumigationType),
    }));
  }

  function updateLot(i: number, patch: Partial<LotDraft>) {
    setDraft((d) => ({ ...d, lots: d.lots.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }));
  }
  function addLot() {
    const next = lotSeq + 1;
    setLotSeq(next);
    setDraft((d) => ({ ...d, lots: [...d.lots, emptyLot(`lot-${next}`)] }));
  }
  function removeLot(i: number) {
    setDraft((d) => ({ ...d, lots: d.lots.filter((_, idx) => idx !== i) }));
  }

  function toggleDocument(key: DocumentRequirementKey) {
    setDraft((d) => ({
      ...d,
      documentRequirements: d.documentRequirements.includes(key)
        ? d.documentRequirements.filter((k) => k !== key)
        : [...d.documentRequirements, key],
    }));
    mark("pc-doc-bl_awb_roadwb");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    // No manual focus call: ErrorSummary takes focus itself once it has rendered.
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    // The second argument is what links the deal to the contract. Without it the contract is
    // an orphan, which is what every legacy record is.
    const res = await api.createContract(draft, deal ? { opportunityId: deal.id } : {});
    setSaving(false);
    if (!res.ok) {
      setServerError(res.reason);
      return;
    }
    const created = res.value as Contract;
    toast.push(
      "ok",
      deal
        ? `${created.contractNo} raised from the agreed deal on ${deal.opportunityNo}, with the locked costing snapshot carried onto it. Status is New PC and the P3 review is pending.`
        : `${created.contractNo} created. Status is New PC and the P3 review is pending.`,
    );
    navigate(`/contracts/${created.id}`);
  }

  const summaryErrors = submitted ? errorList(errors) : [];

  return (
    <>
      <PageHeader
        moduleLabel="Contracts"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Contracts", to: "/contracts" },
          { label: "New purchase contract" },
        ]}
        title="New purchase contract"
        meta={
          <>
            {user ? `${user.displayName} · ${user.unit}` : ""} · created {formatDate(TODAY)} · contract number
            is issued on save
          </>
        }
        recordKey="P2"
        recordDate="contract creation"
      />

      <div className="page">
        <Banner tone="info" title="What this screen changes">
          The field set matches the legacy <code>Purchase Contract</code> form. The differences are that lots
          are an unbounded list with a computed total, quantities and dates are typed, and the rules the
          legacy form displayed but did not enforce — the tolerance ceiling, the fumigation choice and the
          document minimum — now block the save. Since 6 September 2026 the packing size and the B/L
          consignee are chosen from master data rather than typed, the commodity type is chosen from the grades held
          for the commodity, and two fields have gone: <em>Actual PC</em>, which was captured here and then
          dropped on save because the contract record has no such field, and <em>Retrieve PC No.</em> Since
          8 September the payment terms are chosen from master data too — the field the bank submittal
          maturity date derives from, and the one the captured records spell four different ways.{" "}
          <Link to="/contracts">Contract list</Link>
        </Banner>

        {!draft.traderName ? (
          <Banner tone="warn" title="This contract has no trader, and the trader is no longer entered here">
            The instruction of 5 September 2026 removed the Trader name control from this screen, and the
            trader is read instead — from the agreed deal the contract is raised from, or from the session
            when a trader is signed in. Neither applies here: this is a blank form and you are signed in as{" "}
            {user ? `${user.displayName}, ${user.unit}` : "a user with no trading desk"}. Raise the contract
            from its <Link to="/origination">agreed deal</Link>, or have the trader raise it. There was a
            third source until 6 September, when <em>Retrieve PC No.</em> was removed and the copied
            contract's trader went with it. The save is refused rather than recording the name of whoever
            happened to fill the form in, which is what the removed drop-down invited.
          </Banner>
        ) : null}

        {deal ? (
          <Banner
            tone="info"
            title={`Carried in from ${deal.opportunityNo} — deal agreed ${formatDate(deal.dealAgreedOn)}`}
          >
            The twelve-item data set of v2.0 §6.2 activity 2 has been carried in from the agreed deal, and
            every control it filled is marked <em>inherited</em>. The locked costing snapshot travels with the
            contract on save (v2.0 §6.2 activity 3), which is what lets the basis the deal was priced on be
            compared later with what the shipment cost.{" "}
            {dealTerms ? (
              <>
                The agreed price of {formatMoney(dealTerms.pricePerMt)} per MT has no field on this form and
                is carried only in that snapshot.{" "}
              </>
            ) : null}
            <Link to={`/origination/${deal.id}`}>Back to {deal.opportunityNo}</Link>
          </Banner>
        ) : null}

        {opportunityId && !opportunity.loading && !deal ? (
          <Banner tone="warn" title="This form was opened from a deal it could not use">
            {!opportunity.data
              ? `No opportunity with the id ${opportunityId} was found, so nothing has been carried in.`
              : `The deal on ${opportunity.data.opportunityNo} has not been agreed, so a contract cannot be raised from it (v2.0 §6.2 then §6.3) and nothing has been carried in.`}{" "}
            The form is a blank contract, which is how it is reached from the Contracts tile, and the contract
            it creates will carry no link to an opportunity.
          </Banner>
        ) : null}

        {deal?.contractId ? (
          <Banner tone="warn" title="A contract has already been raised from this deal">
            {deal.opportunityNo} already links to a contract, so the service layer will refuse a second one.
            Only one purchase contract is raised from a deal.
          </Banner>
        ) : null}

        {serverError ? (
          <Banner tone="risk" title="The service layer refused this contract">
            {serverError}
          </Banner>
        ) : null}

        <form className="pcform stack" onSubmit={submit} noValidate>
          <ErrorSummary errors={summaryErrors} title="This purchase contract could not be created" />
          <RequiredLegend />

          {/* ---------------- Purchase contract details ---------------- */}
          <CollapsibleSection title="Purchase contract details" defaultOpen>
            <div className="pcform__grid">
              <FormRow
                label="Status"
                htmlFor="pc-status"
                behaviour="readonly"
                hint="A new contract is always New PC. Status moves on by allowed transition, not by picking from a list."
              >
                <div id="pc-status" className="pcform__static">
                  <StatusChip tone="info" label="New PC" size="sm" />
                </div>
              </FormRow>

              <FormRow
                label="Business confirmation date"
                htmlFor="pc-confirmation-date"
                required
                error={shown("pc-confirmation-date")}
              >
                <TextInput
                  id="pc-confirmation-date"
                  type="date"
                  value={draft.businessConfirmationDate}
                  onChange={(v) => set("businessConfirmationDate", v)}
                  required
                  error={shown("pc-confirmation-date")}
                />
              </FormRow>

              <FormRow
                label="Buyer"
                htmlFor="pc-buyer"
                required
                error={shown("pc-buyer")}
                behaviour={from("pc-buyer")}
              >
                <SelectInput
                  id="pc-buyer"
                  value={draft.buyerId}
                  onChange={(v) => {
                    chooseBuyer(v);
                    mark("pc-buyer");
                  }}
                  required
                  error={shown("pc-buyer")}
                  options={buyers.map((b) => ({ value: b.id, label: b.name }))}
                />
              </FormRow>

              <FormRow
                label="Buyer address"
                htmlFor="pc-buyer-address"
                required
                error={shown("pc-buyer-address")}
                behaviour={from("pc-buyer-address")}
                hint="Defaulted from the buyer master; editable for a one-off delivery address."
              >
                <TextInput
                  id="pc-buyer-address"
                  value={draft.buyerAddress}
                  onChange={(v) => set("buyerAddress", v)}
                  required
                  error={shown("pc-buyer-address")}
                />
              </FormRow>

              <FormRow
                label="Buyer nick name"
                htmlFor="pc-buyer-nick"
                required
                error={shown("pc-buyer-nick")}
                behaviour={from("pc-buyer-nick")}
              >
                <TextInput
                  id="pc-buyer-nick"
                  value={draft.buyerNickName}
                  onChange={(v) => set("buyerNickName", v)}
                  required
                  error={shown("pc-buyer-nick")}
                />
              </FormRow>

              <FormRow
                label="Commodity"
                htmlFor="pc-commodity"
                required
                error={shown("pc-commodity")}
                behaviour={from("pc-commodity")}
              >
                <SelectInput
                  id="pc-commodity"
                  value={draft.commodityId}
                  onChange={(v) => {
                    chooseCommodity(v);
                    mark("pc-commodity");
                  }}
                  required
                  error={shown("pc-commodity")}
                  options={COMMODITIES.filter((c) => c.active).map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.code})`,
                  }))}
                  hint="Retired commodities are hidden — the legacy master had no active flag."
                />
              </FormRow>

              <FormRow
                label="Commodity type"
                htmlFor="pc-commodity-type"
                hint={
                  !draft.commodityId
                    ? "Select the commodity first — the grades on offer are its own."
                    : commodityTypes.length === 0
                      ? `The master holds no grades for ${commodity?.name ?? "this commodity"}. Not an error: not every commodity is graded.`
                      : `Grades held for ${commodity?.name ?? "this commodity"}. ${
                          commodity?.qualityParameters.length
                            ? `Quality parameters: ${commodity.qualityParameters.map((q) => q.name).join(", ")}`
                            : "No quality parameters are recorded."
                        }`
                }
              >
                <SelectInput
                  id="pc-commodity-type"
                  value={draft.commodityType}
                  onChange={(v) => set("commodityType", v)}
                  disabled={!draft.commodityId || commodityTypes.length === 0}
                  placeholder={draft.commodityId ? "No grade specified" : "Select a commodity first"}
                  options={commodityTypes.map((t) => ({ value: t, label: t }))}
                />
              </FormRow>

              <FormRow
                label="Origin"
                htmlFor="pc-origin"
                required
                error={shown("pc-origin")}
                behaviour={from("pc-origin")}
              >
                <SelectInput
                  id="pc-origin"
                  value={draft.origin}
                  onChange={(v) => {
                    set("origin", v);
                    mark("pc-origin");
                  }}
                  required
                  error={shown("pc-origin")}
                  options={Object.entries(COUNTRY_PROFILES).map(([code, p]) => ({
                    value: code as PurchaseContractDraft["origin"] & string,
                    label: p.name,
                  }))}
                />
              </FormRow>

              <FormRow
                label="Trader name"
                htmlFor="pc-trader"
                required
                error={submitted ? errors["pc-trader"] : undefined}
                behaviour={from("pc-trader")}
                hint={
                  draft.traderName
                    ? traderSource
                    : "No source — the trader is read, not entered. See the note above."
                }
              >
                <div id="pc-trader">
                  {draft.traderName ? (
                    <strong>{draft.traderName}</strong>
                  ) : (
                    <span className="muted">– none to read</span>
                  )}
                </div>
              </FormRow>

              <FormRow
                label="Payment terms"
                htmlFor="pc-payment-terms"
                required
                error={shown("pc-payment-terms")}
                behaviour={from("pc-payment-terms")}
                hint={
                  paymentTermsOutsideMaster
                    ? `From ${paymentTermsSourceName()}. The deal carries “${draft.paymentTerms}”, which the master does not hold — it is kept and marked rather than blanked, and choosing the equivalent term from the list is what settles it.`
                    : `From ${paymentTermsSourceName()}. Required here because it is null on 865 legacy records and drives the bank submittal maturity date.`
                }
              >
                <SelectInput
                  id="pc-payment-terms"
                  value={draft.paymentTerms}
                  onChange={(v) => {
                    set("paymentTerms", v);
                    mark("pc-payment-terms");
                  }}
                  required
                  error={shown("pc-payment-terms")}
                  options={paymentTermOptions}
                />
              </FormRow>
            </div>
          </CollapsibleSection>

          {/* ---------------- Quantity, period, lots ---------------- */}
          <CollapsibleSection title="Quantity, shipment period and lots" defaultOpen>
            <div className="pcform__grid">
              <FormRow
                label="Quantity (MT)"
                htmlFor="pc-quantity"
                required
                error={shown("pc-quantity")}
                behaviour={from("pc-quantity")}
                hint="A number, not text — the legacy column was Text, so 414.6 sorted before 5."
              >
                <TextInput
                  id="pc-quantity"
                  value={draft.quantityMt}
                  onChange={(v) => set("quantityMt", v)}
                  inputMode="decimal"
                  required
                  error={shown("pc-quantity")}
                />
              </FormRow>

              <FormRow
                label="Tolerance (%)"
                htmlFor="pc-tolerance"
                required
                error={shown("pc-tolerance")}
                hint="More or less at sellers' option at contract price. Sets the ceiling every downstream quantity is checked against."
              >
                <TextInput
                  id="pc-tolerance"
                  value={draft.tolerancePct}
                  onChange={(v) => set("tolerancePct", v)}
                  inputMode="decimal"
                  required
                  error={shown("pc-tolerance")}
                />
              </FormRow>

              <FormRow
                label="Shipment period start"
                htmlFor="pc-period-start"
                required
                error={shown("pc-period-start")}
                behaviour={from("pc-period-start")}
              >
                <TextInput
                  id="pc-period-start"
                  type="date"
                  value={draft.shipmentPeriodStart}
                  onChange={(v) => set("shipmentPeriodStart", v)}
                  required
                  error={shown("pc-period-start")}
                />
              </FormRow>

              <FormRow
                label="Shipment period end"
                htmlFor="pc-period-end"
                required
                error={shown("pc-period-end")}
                behaviour={from("pc-period-end")}
              >
                <TextInput
                  id="pc-period-end"
                  type="date"
                  value={draft.shipmentPeriodEnd}
                  onChange={(v) => set("shipmentPeriodEnd", v)}
                  required
                  error={shown("pc-period-end")}
                />
              </FormRow>
            </div>

            <div className="pclots">
              <div className="pclots__head">
                <h4 className="pclots__title">Shipment lots</h4>
                <p className="pclots__note">
                  A child collection with no ceiling. The legacy form offered a fixed grid of numbered slots,
                  and its <code>Total QTY</code> column was stored — and showed 0.
                </p>
              </div>

              <table className="pclots__table">
                <caption className="sr-only">
                  Shipment lots: lot number, quantity in metric tonnes and number of containers
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Lot no.</th>
                    <th scope="col">Quantity (MT)</th>
                    <th scope="col">No. of containers</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {draft.lots.map((lot, i) => (
                    <tr key={lot.key}>
                      <th scope="row">{i + 1}</th>
                      <td>
                        <label className="sr-only" htmlFor={`pc-lot-qty-${i}`}>
                          Lot {i + 1} quantity in metric tonnes
                        </label>
                        <TextInput
                          id={`pc-lot-qty-${i}`}
                          value={lot.quantityMt}
                          onChange={(v) => updateLot(i, { quantityMt: v })}
                          inputMode="decimal"
                          required
                          error={shown(`pc-lot-qty-${i}`)}
                        />
                        {shown(`pc-lot-qty-${i}`) ? (
                          <p className="frow__error" id={`pc-lot-qty-${i}-error`}>
                            <span aria-hidden="true">!</span> {shown(`pc-lot-qty-${i}`)}
                          </p>
                        ) : null}
                      </td>
                      <td>
                        <label className="sr-only" htmlFor={`pc-lot-containers-${i}`}>
                          Lot {i + 1} number of containers
                        </label>
                        <TextInput
                          id={`pc-lot-containers-${i}`}
                          value={lot.containerCount}
                          onChange={(v) => updateLot(i, { containerCount: v })}
                          inputMode="numeric"
                          error={shown(`pc-lot-containers-${i}`)}
                        />
                        {shown(`pc-lot-containers-${i}`) ? (
                          <p className="frow__error" id={`pc-lot-containers-${i}-error`}>
                            <span aria-hidden="true">!</span> {shown(`pc-lot-containers-${i}`)}
                          </p>
                        ) : null}
                      </td>
                      <td className="pclots__actions">
                        <button
                          type="button"
                          className="btn btn--sm"
                          onClick={() => removeLot(i)}
                          disabled={draft.lots.length === 1}
                        >
                          Remove<span className="sr-only"> lot {i + 1}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    <td>
                      <strong>{formatMt(totals.totalQtyMt)}</strong>
                      <span className="frow__badge">calculated</span>
                    </td>
                    <td>
                      <strong>{totals.totalContainers}</strong>
                      <span className="frow__badge">calculated</span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>

              <div className="pclots__foot">
                <button type="button" id="pc-lot-add" className="btn btn--sm" onClick={addLot}>
                  Insert lot
                </button>
                {totals.contractQtyMt > 0 ? (
                  <p
                    className={`pclots__balance ${totals.overCeiling ? "pclots__balance--over" : ""}`}
                    id="pc-lot-total"
                    role={totals.overCeiling ? "alert" : undefined}
                  >
                    {totals.overCeiling ? (
                      <>
                        <span aria-hidden="true">!</span> {errors["pc-lot-total"]}
                      </>
                    ) : (
                      <>
                        Ceiling {formatMt(totals.ceilingMt)} ({formatMt(totals.contractQtyMt)} +{" "}
                        {draft.tolerancePct}% tolerance) · headroom {formatMt(totals.headroomMt)}
                      </>
                    )}
                  </p>
                ) : null}
              </div>
            </div>
          </CollapsibleSection>

          {/* ---------------- Inco term and packing ---------------- */}
          <CollapsibleSection title="Inco term and packing" defaultOpen>
            <div className="pcform__grid">
              <FormRow
                label="Inco term"
                htmlFor="pc-incoterm"
                required
                error={shown("pc-incoterm")}
                behaviour={from("pc-incoterm")}
              >
                <SelectInput
                  id="pc-incoterm"
                  value={draft.incoterm}
                  onChange={(v) => {
                    set("incoterm", v);
                    mark("pc-incoterm");
                  }}
                  required
                  error={shown("pc-incoterm")}
                  options={INCOTERMS.map((i) => ({ value: i, label: i }))}
                  hint="Drives the charge-allocation default; a non-CNF term flags the charge split for review."
                />
              </FormRow>

              <FormRow
                label="Shipping type"
                htmlFor="pc-shipping-type"
                required
                error={shown("pc-shipping-type")}
              >
                <SelectInput
                  id="pc-shipping-type"
                  value={draft.shipmentType}
                  onChange={(v) => {
                    set("shipmentType", v);
                    mark("pc-shipping-type");
                  }}
                  required
                  error={shown("pc-shipping-type")}
                  options={(Object.keys(SHIPMENT_TYPE_LABEL) as (keyof typeof SHIPMENT_TYPE_LABEL)[]).map(
                    (k) => ({ value: k, label: SHIPMENT_TYPE_LABEL[k] }),
                  )}
                />
              </FormRow>

              <FormRow
                label="Method of shipping"
                htmlFor="pc-method-of-shipping"
                required
                error={shown("pc-method-of-shipping")}
                hint="One spelling, one column. The legacy estate holds Method Of Shipping and Mehod Of Shipping in the same chain."
              >
                <SelectInput
                  id="pc-method-of-shipping"
                  value={draft.methodOfShipping}
                  onChange={(v) => {
                    set("methodOfShipping", v);
                    mark("pc-method-of-shipping");
                  }}
                  required
                  error={shown("pc-method-of-shipping")}
                  options={METHODS_OF_SHIPPING.map((m) => ({ value: m, label: m }))}
                />
              </FormRow>

              <FormRow
                label="Packing type"
                htmlFor="pc-packing-type"
                required
                error={shown("pc-packing-type")}
              >
                <SelectInput
                  id="pc-packing-type"
                  value={draft.packingType}
                  onChange={(v) => {
                    set("packingType", v);
                    mark("pc-packing-type");
                  }}
                  required
                  error={shown("pc-packing-type")}
                  options={PACKING_TYPES.map((p) => ({ value: p, label: PACKING_TYPE_LABEL[p] }))}
                />
              </FormRow>

              <FormRow
                label="Packing size (kg per unit)"
                htmlFor="pc-packing-size"
                required
                error={shown("pc-packing-size")}
                hint={
                  packingSizeOutsideMaster
                    ? "This size is not one the master offers. It is kept rather than blanked, so nothing is lost silently — change it if it is wrong."
                    : "From the packing-size master."
                }
              >
                <SelectInput
                  id="pc-packing-size"
                  value={draft.packingSizeKg}
                  onChange={(v) => {
                    set("packingSizeKg", v);
                    mark("pc-packing-size");
                  }}
                  required
                  error={shown("pc-packing-size")}
                  options={packingSizeOptions}
                />
              </FormRow>

              {draft.packingType === "bulk" ? (
                <p className="pcfield__warn">
                  <span aria-hidden="true">!</span> Bulk cargo has no packing size, and the master offers
                  none — PC-2058-LV, the one bulk contract in the data, carries 0. The size is still
                  required here, so a bulk contract cannot yet be raised on this form. Recorded as open.
                </p>
              ) : null}

              <FormRow
                label="Tolerance % per unit"
                htmlFor="pc-packing-tolerance"
                error={shown("pc-packing-tolerance")}
              >
                <TextInput
                  id="pc-packing-tolerance"
                  value={draft.tolerancePctPerUnit}
                  onChange={(v) => set("tolerancePctPerUnit", v)}
                  inputMode="decimal"
                  error={shown("pc-packing-tolerance")}
                />
              </FormRow>

              <FormRow label="Packing instruction" htmlFor="pc-packing-instruction">
                <TextInput
                  id="pc-packing-instruction"
                  value={draft.packingInstruction}
                  onChange={(v) => set("packingInstruction", v)}
                />
              </FormRow>
            </div>

            <FormRow label="Cargo instruction" htmlFor="pc-cargo-instruction">
              <TextArea
                id="pc-cargo-instruction"
                value={draft.cargoInstruction}
                onChange={(v) => set("cargoInstruction", v)}
                rows={3}
              />
            </FormRow>
          </CollapsibleSection>

          {/* ---------------- Operational fields ---------------- */}
          <CollapsibleSection title="Surveyor, port days and hand-offs" defaultOpen={false}>
            <div className="pcform__grid">
              <FormRow label="Nominated surveyor (buyer)" htmlFor="pc-surveyor">
                <SelectInput
                  id="pc-surveyor"
                  value={draft.nominatedSurveyorId}
                  onChange={(v) => set("nominatedSurveyorId", v)}
                  options={surveyors.map((s) => ({ value: s.id, label: s.name }))}
                />
              </FormRow>

              <FormRow
                label="Free days at port"
                htmlFor="pc-free-days"
                error={shown("pc-free-days")}
                hint="Feeds the detention and demurrage exposure on every shipment under this contract."
              >
                <TextInput
                  id="pc-free-days"
                  value={draft.freeDaysAtPort}
                  onChange={(v) => set("freeDaysAtPort", v)}
                  inputMode="numeric"
                  error={shown("pc-free-days")}
                />
              </FormRow>

              <FormRow label="SAP number" htmlFor="pc-sap">
                <TextInput id="pc-sap" value={draft.sapNumber} onChange={(v) => set("sapNumber", v)} />
              </FormRow>

              <FormRow label="Contract communicated from" htmlFor="pc-communicated-from">
                <SelectInput
                  id="pc-communicated-from"
                  value={draft.communicatedFrom}
                  onChange={(v) => set("communicatedFrom", v)}
                  options={COMMUNICATED_FROM.map((c) => ({ value: c, label: c }))}
                />
              </FormRow>

              <FormRow
                label="Assigned person, Dubai execution"
                htmlFor="pc-assigned"
                required
                error={shown("pc-assigned")}
              >
                <SelectInput
                  id="pc-assigned"
                  value={draft.assignedDubaiExecution}
                  onChange={(v) => {
                    set("assignedDubaiExecution", v);
                    mark("pc-assigned");
                  }}
                  required
                  error={shown("pc-assigned")}
                  options={DUBAI_EXECUTION.map((d) => ({ value: d, label: d }))}
                />
              </FormRow>
            </div>
          </CollapsibleSection>

          {/* ---------------- Document instruction ---------------- */}
          <CollapsibleSection title="Document instruction" defaultOpen>
            <div className="pcform__grid">
              <FormRow
                label="Port of loading"
                htmlFor="pc-port-loading"
                required
                error={shown("pc-port-loading")}
                behaviour={from("pc-port-loading")}
              >
                <SelectInput
                  id="pc-port-loading"
                  value={draft.portOfLoadingId}
                  onChange={(v) => {
                    set("portOfLoadingId", v);
                    mark("pc-port-loading");
                  }}
                  required
                  error={shown("pc-port-loading")}
                  options={loadPorts.map((p) => ({ value: p.id, label: `${p.name}, ${p.country}` }))}
                />
              </FormRow>

              <FormRow
                label="Port of discharge"
                htmlFor="pc-port-discharge"
                required
                error={shown("pc-port-discharge")}
                behaviour={from("pc-port-discharge")}
              >
                <SelectInput
                  id="pc-port-discharge"
                  value={draft.portOfDischargeId}
                  onChange={(v) => {
                    set("portOfDischargeId", v);
                    mark("pc-port-discharge");
                  }}
                  required
                  error={shown("pc-port-discharge")}
                  options={dischargePorts.map((p) => ({ value: p.id, label: `${p.name}, ${p.country}` }))}
                />
              </FormRow>

              <FormRow
                label="B/L consignee"
                htmlFor="pc-consignee"
                required
                error={consigneeIsOther ? undefined : shown("pc-consignee")}
                hint="From the consignee master. Choose Others to name a party it does not hold."
              >
                <SelectInput
                  id="pc-consignee"
                  value={consigneeCode}
                  onChange={chooseConsignee}
                  required
                  error={consigneeIsOther ? undefined : shown("pc-consignee")}
                  options={CONSIGNEES.filter((c) => c.active).map((c) => ({
                    value: c.code,
                    label: c.name,
                  }))}
                />
              </FormRow>

              {consigneeIsOther ? (
                <FormRow
                  label="Consignee name"
                  htmlFor="pc-consignee-other"
                  required
                  error={shown("pc-consignee")}
                  hint="The party the bill of lading is made out to. Required, because a B/L cannot be consigned to the word “others”."
                >
                  <TextInput
                    id="pc-consignee-other"
                    value={draft.consignee}
                    onChange={(v) => set("consignee", v)}
                    required
                    error={shown("pc-consignee")}
                    placeholder="e.g. To order"
                  />
                </FormRow>
              ) : null}

              <FormRow
                label="Notify party"
                htmlFor="pc-notify-party"
                required
                error={shown("pc-notify-party")}
              >
                <SelectInput
                  id="pc-notify-party"
                  value={draft.notifyParty}
                  onChange={(v) => {
                    setDraft((d) => ({
                      ...d,
                      notifyParty: v,
                      notifyPartyAddress: counterpartyById(v)?.address ?? d.notifyPartyAddress,
                    }));
                    mark("pc-notify-party");
                  }}
                  required
                  error={shown("pc-notify-party")}
                  options={notifyParties.map((c) => ({ value: c.id, label: c.name }))}
                />
              </FormRow>

              <FormRow
                label="Notify party address"
                htmlFor="pc-notify-address"
                required
                error={shown("pc-notify-address")}
              >
                <TextInput
                  id="pc-notify-address"
                  value={draft.notifyPartyAddress}
                  onChange={(v) => set("notifyPartyAddress", v)}
                  required
                  error={shown("pc-notify-address")}
                />
              </FormRow>

              <FormRow label="Partial shipment" htmlFor="pc-partial" required error={shown("pc-partial")}>
                <SelectInput
                  id="pc-partial"
                  value={draft.partialShipment}
                  onChange={(v) => {
                    set("partialShipment", v);
                    mark("pc-partial");
                  }}
                  required
                  error={shown("pc-partial")}
                  options={PARTIAL_SHIPMENT_OPTIONS}
                />
              </FormRow>

              <FormRow
                label="Loading in 20 ft or/and 40 ft"
                htmlFor="pc-container-size"
                required={draft.shipmentType === "container"}
                error={shown("pc-container-size")}
                hint={
                  draft.shipmentType && draft.shipmentType !== "container"
                    ? "Not applicable to this shipping type — recorded as not applicable rather than left blank."
                    : undefined
                }
              >
                <SelectInput
                  id="pc-container-size"
                  value={draft.loadingContainerSize}
                  onChange={(v) => {
                    set("loadingContainerSize", v);
                    mark("pc-container-size");
                  }}
                  disabled={Boolean(draft.shipmentType) && draft.shipmentType !== "container"}
                  required={draft.shipmentType === "container"}
                  error={shown("pc-container-size")}
                  options={CONTAINER_SIZE_OPTIONS}
                />
              </FormRow>
            </div>

            <fieldset className="pcfield">
              <legend className="pcfield__legend">
                Required documents{" "}
                <span className="frow__req" aria-hidden="true">
                  *
                </span>
                <span className="pcfield__count">{draft.documentRequirements.length} selected</span>
              </legend>
              <p className="pcfield__hint" id="pc-doc-hint">
                One canonical list. <code>SSMO certificate</code> appears here rather than only on the service
                request, which is where the legacy chain kept it. At least one document is required.
              </p>
              <div className="pcfield__checks" aria-describedby="pc-doc-hint">
                {DOCUMENT_ORDER.map((key) => (
                  <label className="pccheck" key={key} htmlFor={`pc-doc-${key}`}>
                    <input
                      type="checkbox"
                      id={`pc-doc-${key}`}
                      checked={draft.documentRequirements.includes(key)}
                      onChange={() => toggleDocument(key)}
                      aria-describedby={
                        key === "bl_awb_roadwb" && shown("pc-doc-bl_awb_roadwb")
                          ? "pc-doc-bl_awb_roadwb-error"
                          : undefined
                      }
                    />
                    <span>
                      {DOCUMENT_REQUIREMENT_LABEL[key]}
                      {DEFAULT_DOCUMENT_REQUIREMENTS.includes(key) ? (
                        <span className="frow__badge">default</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
              {shown("pc-doc-bl_awb_roadwb") ? (
                <p className="frow__error" id="pc-doc-bl_awb_roadwb-error">
                  <span aria-hidden="true">!</span> {shown("pc-doc-bl_awb_roadwb")}
                </p>
              ) : null}
              {draft.documentRequirements.includes("other") ? (
                <FormRow
                  label="Describe the other document"
                  htmlFor="pc-doc-other-text"
                  required
                  error={shown("pc-doc-other-text")}
                >
                  <TextInput
                    id="pc-doc-other-text"
                    value={draft.otherDocumentText}
                    onChange={(v) => set("otherDocumentText", v)}
                    required
                    error={shown("pc-doc-other-text")}
                  />
                </FormRow>
              ) : null}
            </fieldset>

            <fieldset className="pcfield">
              <legend className="pcfield__legend">
                Fumigation{" "}
                <span className="frow__req" aria-hidden="true">
                  *
                </span>
              </legend>
              <p className="pcfield__hint" id="pc-fum-hint">
                One required choice. The legacy form offered three independent checkboxes, printed “Fumigation
                Value is Required” in red, and saved regardless.
              </p>
              <div className="pcfield__checks" aria-describedby="pc-fum-hint">
                {FUMIGATION_OPTIONS.map((o) => (
                  <label className="pccheck" key={o.value} htmlFor={`pc-fumigation-${o.value}`}>
                    <input
                      type="radio"
                      name="pc-fumigation"
                      id={`pc-fumigation-${o.value}`}
                      value={o.value}
                      checked={draft.fumigationType === o.value}
                      onChange={() => {
                        set("fumigationType", o.value);
                        mark("pc-fumigation-methyl_bromide");
                      }}
                      aria-describedby={
                        shown("pc-fumigation-methyl_bromide") ? "pc-fumigation-error" : undefined
                      }
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
              {commodity?.requiresFumigation && draft.fumigationType === "none" ? (
                <p className="pcfield__warn">
                  <span aria-hidden="true">!</span> {commodity.name} normally requires fumigation. Recording
                  “none” is allowed but will be visible on the contract.
                </p>
              ) : null}
              {shown("pc-fumigation-methyl_bromide") ? (
                <p className="frow__error" id="pc-fumigation-error">
                  <span aria-hidden="true">!</span> {shown("pc-fumigation-methyl_bromide")}
                </p>
              ) : null}
            </fieldset>

            <FormRow label="Note" htmlFor="pc-note" behaviour={from("pc-note")}>
              <TextArea id="pc-note" value={draft.note} onChange={(v) => set("note", v)} rows={3} />
            </FormRow>
          </CollapsibleSection>

          {/* ---------------- Artwork ---------------- */}
          <CollapsibleSection title="Artwork" defaultOpen={false}>
            <div className="pcform__grid">
              <FormRow label="Artwork type" htmlFor="pc-artwork-type">
                <SelectInput
                  id="pc-artwork-type"
                  value={draft.artworkType}
                  onChange={(v) => set("artworkType", v)}
                  options={ARTWORK_TYPES}
                  placeholder="No artwork"
                />
              </FormRow>
            </div>

            <fieldset className="pcfield">
              <legend className="pcfield__legend">Artwork details</legend>
              <div className="pcfield__checks">
                <label className="pccheck" htmlFor="pc-artwork-printed-bags">
                  <input
                    type="checkbox"
                    id="pc-artwork-printed-bags"
                    checked={draft.artworkPrintedBags}
                    onChange={(e) => {
                      set("artworkPrintedBags", e.target.checked);
                      mark("pc-artwork-printed-bags");
                    }}
                  />
                  <span>Printed bags</span>
                </label>
                <label className="pccheck" htmlFor="pc-artwork-tags">
                  <input
                    type="checkbox"
                    id="pc-artwork-tags"
                    checked={draft.artworkTags}
                    onChange={(e) => {
                      set("artworkTags", e.target.checked);
                      mark("pc-artwork-printed-bags");
                    }}
                  />
                  <span>Tags</span>
                </label>
              </div>
              {shown("pc-artwork-printed-bags") ? (
                <p className="frow__error" id="pc-artwork-printed-bags-error">
                  <span aria-hidden="true">!</span> {shown("pc-artwork-printed-bags")}
                </p>
              ) : null}
            </fieldset>

            <div className="pcform__grid">
              <FormRow
                label="Artwork design"
                htmlFor="pc-artwork-design"
                hint="A file name only — this prototype stores names, not files. Optional: the design may follow the contract."
              >
                <TextInput
                  id="pc-artwork-design"
                  value={draft.artworkDesignFileName}
                  onChange={(v) => set("artworkDesignFileName", v)}
                  placeholder="e.g. anatolia-bag-artwork-v3.pdf"
                />
              </FormRow>
            </div>
          </CollapsibleSection>

          <FormActions>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Creating…" : "Create purchase contract"}
            </button>
            <Link className="btn" to="/contracts">
              Cancel
            </Link>
            <p className="pcform__pending muted small">
              {submitted && summaryErrors.length
                ? `${summaryErrors.length} field${summaryErrors.length === 1 ? "" : "s"} need attention.`
                : "The contract is created as New PC with the P3 review pending for all four teams."}
            </p>
          </FormActions>
        </form>
      </div>
    </>
  );
}
