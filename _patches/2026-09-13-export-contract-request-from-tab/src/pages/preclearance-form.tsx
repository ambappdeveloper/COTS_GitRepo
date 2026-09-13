/**
 * New export contract request — the create screen pre-clearance never had.
 *
 * "Under Pre-clearance: review all needed fields to be able to produce a new Add/Create
 * form for EX contract or pre-clearance. Add New button on the header right side."
 * — instruction of 6 September 2026.
 *
 * WHAT THE REVIEW FOUND, and it is the same shape as the execution plan a day earlier: the
 * pre-clearance list has rendered export contracts since v1.0 and had no way to raise one.
 * `api` exposed `listExportContracts`, `getExportContract` and mutators that advance a
 * record — issue it, add EX forms, consume them — but nothing that starts one.
 *
 * WHAT THE FIELD SET IS, and why it is smaller than the record. `ExportContract` carries
 * two stages in one row:
 *
 *   · the REQUEST — request number, execution plan, purchase contract, requested quantity,
 *     exporting entity, unit price, large volume, notes;
 *   · the ISSUANCE — export contract number, issuance and expiry dates, actual exporter,
 *     actual bank and branch, actual quantity, the four ministry dates, the scanned file.
 *
 * Only the request is captured here. Everything in the second group is what the Ministry of
 * Trade *returns*; a create screen that asked for it would be asking the user to invent the
 * answer, and the record would then assert an issuance that never happened. It is the same
 * rule that makes a new contract always New PC and a new plan always Draft: a record starts
 * at the beginning and moves on by transition.
 *
 * Three values are read rather than asked for — the request number, the status and the
 * large-volume flag — and two are read from the chosen plan: the purchase contract, and the
 * quantity, which defaults to the plan's planned quantity.
 *
 * COUNTRY. The export contract does not apply everywhere. Tanzania and Mozambique do not use
 * one, and this screen says so and refuses rather than creating a record their process has
 * no place for — the module's existing rule that an inapplicable step is marked
 * *Not applicable*, never left pending.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Banner, ErrorState, useToast } from "../components/feedback";
import { FieldGrid, PageHeader } from "../components/layout";
import {
  ErrorSummary,
  FormActions,
  FormRow,
  RequiredLegend,
  SelectInput,
  TextArea,
  TextInput,
} from "../components/form";
import { bankBranchesFor, bankByName, counterpartiesOfType, counterpartyName } from "../data/master";
import { TODAY, formatDate, formatMoney, formatMt, money, safeNumber } from "../domain/calc";
import { COUNTRY_PROFILES } from "../domain/variants";
import type { CurrencyCode, ExportContract } from "../domain/types";
import { api } from "../services/store";
import { useAsync } from "./hooks";

/**
 * The three the captured requests name. Sudan's country profile lists exactly these as its
 * partner entity — "Invictus / Sayga / Green Zone" — so the list is the country's, and a
 * country that named others would need its own. Recorded as [OPEN] in the workflow.
 */
const EXPORTING_ENTITIES: ExportContract["exportingEntity"][] = ["Invictus", "Sayga", "Green Zone"];

const CURRENCIES: CurrencyCode[] = ["USD", "SDG"];

export function ExportContractRequestForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();

  const contracts = useAsync(() => api.listContracts());
  const existing = useAsync(() => api.listExportContracts());

  /**
   * `?contract=<id>` — raised from the contract's own Export contract tab, 13 September 2026.
   *
   * "Add a button new request for Export contract related to the Purchase Contract, in the new
   *  Export Contract screen form, it will inherit the Purchase Contract no."
   *
   * WHY IT IS LOCKED AND NOT MERELY PREFILLED. Confirmed in review. The tab is scoped to one
   * contract, so a request raised from it belongs to that contract; leaving the drop-down live
   * would let someone file a request that does not appear on the tab they started from, and the
   * mistake would be invisible. This is the call the new purchase contract already makes with
   * its origin, which is read from the session and stated rather than asked for.
   *
   * The drop-down is not removed — it is what the screen still shows when it is reached from
   * Pre-clearance → New request with no contract in the address, which is the path that has
   * existed since 6 September.
   */
  const requestedContractId = params.get("contract");

  const [contractId, setContractId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [entity, setEntity] = useState<ExportContract["exportingEntity"] | "">("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const contract = (contracts.data ?? []).find((c) => c.id === contractId);
  const profile = contract ? COUNTRY_PROFILES[contract.origin] : undefined;
  const appliesHere = profile ? profile.usesExportContract : true;

  /*
   * Locked only once the id in the address resolves to a contract the session can see. An id
   * that names nothing — a stale link, or a contract in another country now that the lists are
   * country-scoped — falls back to the drop-down and says so, rather than locking the screen to
   * a contract it cannot show.
   */
  const inherited =
    requestedContractId !== null
      ? (contracts.data ?? []).find((c) => c.id === requestedContractId)
      : undefined;
  const lockedToContract = Boolean(inherited);
  const inheritedMissing = requestedContractId !== null && !inherited && !contracts.loading;

  const onContract = useMemo(
    () => (existing.data ?? []).filter((e) => e.contractId === contractId),
    [existing.data, contractId],
  );
  /*
   * `<contract no>-R<n>` since 8 September 2026 — it was `<planning no>-R<n>` until execution
   * planning was removed. The captured requests keep the numbers they were issued with, so the
   * sequence counts the requests already on the contract rather than parsing their numbers.
   */
  const nextRequestNo = contract ? `${contract.contractNo}-R${onContract.length + 1}` : "";

  /**
   * Choosing a contract defaults the quantity to what is still unrequested on it.
   *
   * The plan's planned quantity was the default until execution planning was removed. What is
   * left to request is the nearest equivalent the contract itself can answer, and it stays a
   * default rather than a rule: the captured requests do not all match — PC-2041.1 planned
   * 600 MT and requested 630.
   */
  function chooseContract(next: string) {
    setContractId(next);
    const c = (contracts.data ?? []).find((x) => x.id === next);
    if (!c) return;
    const requested = (existing.data ?? [])
      .filter((e) => e.contractId === next)
      .reduce((a, e) => a + e.requestedQuantityMt, 0);
    const left = Math.max(0, c.quantityMt - requested);
    if (left > 0) setQuantity(String(left));
  }

  /*
   * Applying the inherited contract, once. `useAsync` re-fetches on every store mutation, and a
   * second application would overwrite a quantity that has since been typed. Both lists have to
   * have arrived first: the quantity default is what is still unrequested, which cannot be
   * computed until the existing requests are known.
   */
  const appliedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!inherited || appliedFor.current === inherited.id) return;
    if (contracts.loading || existing.loading) return;
    appliedFor.current = inherited.id;
    chooseContract(inherited.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inherited, contracts.loading, existing.loading, contracts.data, existing.data]);

  const errors: Record<string, string> = {};
  const qty = safeNumber(quantity, -1);
  if (!contractId) errors["ec-contract"] = "Select the purchase contract this request is raised against.";
  if (!quantity.trim() || !(qty > 0))
    errors["ec-qty"] = "Enter the requested quantity in MT, greater than zero.";
  if (!entity) errors["ec-entity"] = "Select the exporting entity.";
  if (price.trim() && !(safeNumber(price, -1) > 0))
    errors["ec-price"] = "The unit price must be a number greater than zero, or left blank.";
  if (contractId && !appliesHere)
    errors["ec-contract"] = `${profile?.name ?? "That country"} does not use an export contract, so no request is raised there.`;

  const shown = (field: string) => (submitted ? errors[field] : undefined);
  const summaryErrors = submitted
    ? Object.entries(errors).map(([field, message]) => ({ field, message }))
    : [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    const res = await api.requestExportContract({
      contractId,
      requestedQuantityMt: qty,
      exportingEntity: entity as ExportContract["exportingEntity"],
      unitPrice: price.trim() ? money(safeNumber(price, 0), currency) : undefined,
      notes,
    });
    setSaving(false);
    if (!res.ok) {
      setServerError(res.reason);
      return;
    }
    toast.push(
      "ok",
      `${res.value.requestNo} raised. The export contract number, its dates and the EX forms come back from the ministry and are recorded on the record itself.`,
    );
    navigate(`/pre-clearance/${res.value.id}`);
  }

  return (
    <>
      <PageHeader
        moduleLabel="Pre-clearance & clearance"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Pre-clearance", to: "/pre-clearance" },
          { label: "New export contract request" },
        ]}
        title="New export contract request"
        meta={`Raised ${formatDate(TODAY)} · the request number is issued on save`}
        recordKey="Phase 16"
        recordDate="pre-clearance"
      />

      <div className="page">
        <Banner tone="info" title="This raises the request, not the contract">
          An export contract record carries two stages, and only the first is captured here. The{" "}
          <strong>request</strong> is what the business sends: the contract it is for, the quantity and
          the exporting entity. The <strong>issuance</strong> — the export contract number, its dates, the actual
          exporter, bank and quantity, and the EX forms — is what the ministry sends back, and is recorded on
          the record once it does. A create screen that asked for it would be asking you to invent the answer.
          Status is therefore always <em>Requested</em>, and moves on by transition.
        </Banner>

        {inheritedMissing ? (
          <Banner tone="warn" title="That purchase contract could not be found">
            The address named a contract this session cannot see. It may have been raised in another
            country — the Export lists are scoped to the country in the header since 9 September 2026 —
            or the link may be stale. Choose the contract below instead.
          </Banner>
        ) : null}

        {contractId && !appliesHere ? (
          <Banner tone="warn" title={`${profile?.name} does not use an export contract`}>
            {profile?.startsFromCommercialInvoice
              ? "Its customs process starts from a commercial invoice instead."
              : "The step does not apply there."}{" "}
            Pre-clearance marks an inapplicable step <em>Not applicable</em> rather than leaving it pending,
            so no request is raised. Choose a contract from a country that uses one.
          </Banner>
        ) : null}

        {serverError ? (
          <Banner tone="risk" title="The request could not be raised">
            {serverError}
          </Banner>
        ) : null}

        <form className="stack" onSubmit={submit} noValidate>
          <ErrorSummary errors={summaryErrors} title="This request could not be raised" />
          <RequiredLegend />

          <div className="fields">
            <FormRow
              label="Request number"
              htmlFor="ec-no"
              behaviour="readonly"
              hint="Issued on save, from the contract's own sequence."
            >
              <div id="ec-no">
                {nextRequestNo ? (
                  <strong>{nextRequestNo}</strong>
                ) : (
                  <span className="muted">– select a purchase contract</span>
                )}
              </div>
            </FormRow>

            {lockedToContract && inherited ? (
              /*
                Inherited from the contract's Export contract tab and stated, not asked for.
                See the note on `requestedContractId` for why it is not merely prefilled.
              */
              <FormRow
                label="Purchase contract"
                htmlFor="ec-contract"
                behaviour="inherited"
                hint={`Raised from ${inherited.contractNo}'s Export contract tab. The request belongs to that contract — open Pre-clearance → New request to choose a different one.`}
              >
                <div id="ec-contract" data-testid="ec-contract-fixed">
                  <strong>{inherited.contractNo}</strong> — {counterpartyName(inherited.buyerId)} —{" "}
                  {formatMt(inherited.quantityMt)}
                </div>
              </FormRow>
            ) : (
              <FormRow
                label="Purchase contract"
                htmlFor="ec-contract"
                required
                error={shown("ec-contract")}
                hint="The request is raised against the contract. It was raised against a planning lot until execution planning was removed on 8 September 2026."
              >
                <SelectInput
                  id="ec-contract"
                  value={contractId}
                  onChange={chooseContract}
                  required
                  error={shown("ec-contract")}
                  options={(contracts.data ?? []).map((c) => ({
                    value: c.id,
                    label: `${c.contractNo} — ${counterpartyName(c.buyerId)} — ${formatMt(c.quantityMt)}`,
                  }))}
                />
              </FormRow>
            )}

            <FormRow
              label="Requested quantity (MT)"
              htmlFor="ec-qty"
              required
              error={shown("ec-qty")}
              behaviour={contractId ? "inherited" : undefined}
              hint={
                contract
                  ? `Defaulted to what is still unrequested against ${contract.contractNo}. The captured requests do not all match, so this is a default and not a rule.`
                  : undefined
              }
            >
              <TextInput
                id="ec-qty"
                value={quantity}
                onChange={setQuantity}
                inputMode="decimal"
                required
                error={shown("ec-qty")}
              />
            </FormRow>

            <FormRow
              label="Exporting entity"
              htmlFor="ec-entity"
              required
              error={shown("ec-entity")}
              hint="The entity the contract is issued to. Sudan's country profile names these three; a country naming others would need its own list — recorded as open."
            >
              <SelectInput
                id="ec-entity"
                value={entity}
                onChange={(v) => setEntity(v)}
                required
                error={shown("ec-entity")}
                options={EXPORTING_ENTITIES.map((e) => ({ value: e, label: e }))}
              />
            </FormRow>

            <FormRow
              label="Unit price"
              htmlFor="ec-price"
              error={shown("ec-price")}
              hint="Optional. Two of the five captured requests carry none."
            >
              <TextInput
                id="ec-price"
                value={price}
                onChange={setPrice}
                inputMode="decimal"
                error={shown("ec-price")}
              />
            </FormRow>

            <FormRow label="Price currency" htmlFor="ec-currency">
              <SelectInput
                id="ec-currency"
                value={currency}
                onChange={(v) => setCurrency(v)}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              />
            </FormRow>

            <FormRow
              label="Large volume"
              htmlFor="ec-lv"
              behaviour="inherited"
              hint="Read from the purchase contract: large volume describes one export contract consumed across several shipments, which is exactly this record."
            >
              {/* The placeholder read "select an execution plan" until 13 September 2026 — a
                  string left behind when execution planning was removed on 8 September, on a
                  screen that has read the contract rather than a plan ever since. */}
              <div id="ec-lv">
                {contract ? (
                  <strong>{contract.isLargeVolume ? "Yes" : "No"}</strong>
                ) : (
                  <span className="muted">– select a purchase contract</span>
                )}
              </div>
            </FormRow>
          </div>

          <FormRow label="Notes" htmlFor="ec-notes">
            <TextArea id="ec-notes" value={notes} onChange={setNotes} rows={3} />
          </FormRow>

          <FormActions>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Raising…" : "Raise the request"}
            </button>
            <Link className="btn" to="/pre-clearance">
              Cancel
            </Link>
          </FormActions>
        </form>
      </div>
    </>
  );
}

/* ==================================================================== *
 * Edit — the issuance the Ministry of Trade returns
 * ==================================================================== */

/**
 * Records the issuance against a request that has already been raised — 11 September 2026.
 *
 * WHAT IT CLOSES. Gap 1 of the five in the process-review meeting pack of 7 September: the
 * Issuance card on the pre-clearance record has rendered eight fields since v1.0 and there was
 * no way to write any of them. Steps 3.5, 3.6, 6.1 and 8.2 of the Visio all ended here.
 *
 * WHY THIS IS "EDIT" AND THE REQUEST SCREEN IS "ADD". The record carries two stages and they
 * belong to two parties. The request is what the business sends and `ExportContractRequestForm`
 * captures it. The issuance is what the ministry sends back — the contract number, its dates,
 * the actual exporter, bank and quantity, the scanned document, and in Sudan the EX forms
 * issued against it. A create screen asking for the second group would be asking the user to
 * invent the ministry's answer; an edit screen recording it is the transition the workflow
 * describes.
 *
 * THE REQUEST IS SHOWN AND NOT EDITABLE. Confirmed in review on 11 September: a request is the
 * record of what was sent, so correcting it afterwards would rewrite the thing the ministry
 * answered. It is rendered read-only at the top for context, because someone recording an
 * issuance needs to see what was asked for — most obviously to notice that 630 MT was requested
 * and 620 MT issued, which is the case in the captured data.
 *
 * COUNTRY. Refused where the country does not use an export contract — Tanzania and
 * Mozambique. The EX forms section is shown only where the country uses them — Sudan. Both are
 * read from the country profile, not from a country code on this screen.
 */

const EC_EMPTY_FORM = { formNo: "", quantityMt: "", issuedOn: "", psFileNo: "" };

export function ExportContractIssuanceForm() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const ec = useAsync(() => api.getExportContract(id), [id]);
  const contracts = useAsync(() => api.listContracts());

  const e = ec.data;
  const contract = (contracts.data ?? []).find((c) => c.id === e?.contractId);
  const profile = contract ? COUNTRY_PROFILES[contract.origin] : undefined;
  const appliesHere = profile ? profile.usesExportContract : true;
  const usesForms = profile ? profile.usesExportForms : false;

  const [no, setNo] = useState("");
  const [issuance, setIssuance] = useState("");
  const [expiry, setExpiry] = useState("");
  const [exporter, setExporter] = useState("");
  const [bankId, setBankId] = useState("");
  const [branch, setBranch] = useState("");
  const [actualQty, setActualQty] = useState("");
  const [scanned, setScanned] = useState("");
  const [notes, setNotes] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  /* EX form being added, and the refusal from the last attempt. */
  const [form, setForm] = useState(EC_EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);

  /* Hydrate once. `useAsync` re-fetches on every store mutation — adding an EX form is one —
     and a second hydrate would throw away whatever has since been typed into the issuance
     fields above. */
  if (e && !hydrated) {
    setNo(e.exportContractNo ?? "");
    setIssuance(e.issuanceDate ?? "");
    setExpiry(e.expiryDate ?? "");
    setExporter(e.actualExporterName ?? "");
    setBankId(bankByName(e.actualBank)?.id ?? "");
    setBranch(e.actualBankBranch ?? "");
    setActualQty(e.actualQuantityMt !== undefined ? String(e.actualQuantityMt) : "");
    setScanned(e.scannedContractName ?? "");
    setNotes(e.notes ?? "");
    setHydrated(true);
  }

  const branches = bankBranchesFor(bankId);
  function chooseBank(next: string) {
    setBankId(next);
    setBranch((b) => (bankBranchesFor(next).includes(b) ? b : ""));
  }

  if (ec.error) {
    return (
      <div className="page">
        <ErrorState detail={ec.error} onRetry={ec.reload} />
      </div>
    );
  }
  if (ec.loading || !e) {
    return (
      <div className="page">
        <div className="card card__body muted">Loading…</div>
      </div>
    );
  }

  const qty = actualQty.trim() ? safeNumber(actualQty, -1) : undefined;
  const errors: Record<string, string> = {};
  if (!no.trim()) errors["ei-no"] = "Enter the export contract number the ministry issued.";
  if (!issuance) errors["ei-issuance"] = "Enter the issuance date.";
  if (!expiry) errors["ei-expiry"] = "Enter the expiry date.";
  if (issuance && expiry && expiry <= issuance)
    errors["ei-expiry"] = "The expiry date must be after the issuance date.";
  if (qty !== undefined && !(qty > 0))
    errors["ei-qty"] = "The actual quantity must be a number greater than zero, or left blank.";
  if (branch && !bankId) errors["ei-bank"] = "Select the bank, or clear the branch.";

  const shown = (field: string) => (submitted ? errors[field] : undefined);
  const summaryErrors = submitted
    ? Object.entries(errors).map(([field, message]) => ({ field, message }))
    : [];

  /* Reported, never blocking — see `addExportForm` on rule R5 and decision D-10. */
  const formsTotal = e.exportForms.reduce((a, f) => a + f.quantityMt, 0);
  const contractTotal = qty ?? e.actualQuantityMt ?? e.requestedQuantityMt;
  const formsReconcile = e.exportForms.length === 0 || Math.abs(formsTotal - contractTotal) < 0.005;

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    const res = await api.issueExportContract(id, {
      exportContractNo: no,
      issuanceDate: issuance,
      expiryDate: expiry,
      actualExporterName: exporter,
      actualBankId: bankId || undefined,
      actualBankBranch: branch || undefined,
      actualQuantityMt: qty,
      scannedContractName: scanned,
      notes,
    });
    setSaving(false);
    if (!res.ok) {
      setServerError(res.reason);
      return;
    }
    toast.push("ok", `${res.value.exportContractNo} recorded as issued.`);
    navigate(`/pre-clearance/${id}`);
  }

  async function addForm() {
    setFormError(null);
    const q = safeNumber(form.quantityMt, -1);
    if (!form.formNo.trim()) {
      setFormError("Enter the EX form number.");
      return;
    }
    if (!(q > 0)) {
      setFormError("Enter the form quantity in MT, greater than zero.");
      return;
    }
    setFormBusy(true);
    const res = await api.addExportForm(id, {
      formNo: form.formNo,
      quantityMt: q,
      issuedOn: form.issuedOn || undefined,
      psFileNo: form.psFileNo,
    });
    setFormBusy(false);
    if (!res.ok) {
      setFormError(res.reason);
      return;
    }
    toast.push("ok", `EX form ${form.formNo.trim()} issued.`);
    setForm(EC_EMPTY_FORM);
    ec.reload();
  }

  async function dropForm(formNo: string) {
    setFormError(null);
    const res = await api.removeExportForm(id, formNo);
    if (!res.ok) {
      setFormError(res.reason);
      return;
    }
    toast.push("ok", `EX form ${formNo} removed.`);
    ec.reload();
  }

  return (
    <>
      <PageHeader
        moduleLabel="Pre-clearance & clearance"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Pre-clearance", to: "/pre-clearance" },
          { label: e.exportContractNo ?? e.requestNo, to: `/pre-clearance/${id}` },
          { label: "Record the issuance" },
        ]}
        title={e.exportContractNo ? `Edit ${e.exportContractNo}` : `Record the issuance · ${e.requestNo}`}
        meta="What the Ministry of Trade returns against the request"
        recordKey="Phase 14"
        recordDate="§6.14"
      />

      <div className="page">
        <Banner tone="info" title="This records the issuance, not the request">
          The request — {e.requestNo}, {formatMt(e.requestedQuantityMt)}, {e.exportingEntity} — is what the
          business sent, and it is shown below read-only. This screen records what comes back: the{" "}
          <strong>export contract number</strong>, its <strong>issuance and expiry dates</strong>, the actual
          exporter, bank and quantity, and the scanned document. Saving moves the record to{" "}
          <em>Issued</em> — the status follows the action rather than being picked, so the record cannot say
          issued with nothing issued.
        </Banner>

        {!appliesHere ? (
          <Banner tone="warn" title={`${profile?.name} does not use an export contract`}>
            {profile?.startsFromCommercialInvoice
              ? "Its customs process starts from a commercial invoice instead."
              : "The step does not apply there."}{" "}
            No issuance is recorded. This record exists against a {profile?.name} contract, which is itself
            worth raising with the business.
          </Banner>
        ) : null}

        {serverError ? (
          <Banner tone="risk" title="The issuance could not be recorded">
            {serverError}
          </Banner>
        ) : null}

        <div className="card card__body">
          <h3 className="card__title">The request</h3>
          <FieldGrid
            fields={[
              { label: "Request number", value: e.requestNo, behaviour: "readonly" },
              { label: "Requested on", value: formatDate(e.requestedOn), behaviour: "readonly" },
              {
                label: "Requested quantity",
                value: formatMt(e.requestedQuantityMt),
                behaviour: "readonly",
              },
              { label: "Exporting entity", value: e.exportingEntity, behaviour: "readonly" },
              { label: "Unit price", value: formatMoney(e.unitPrice), behaviour: "readonly" },
              {
                label: "Purchase contract",
                value: contract ? (
                  <Link to={`/contracts/${contract.id}`}>{contract.contractNo}</Link>
                ) : undefined,
                behaviour: "readonly",
              },
              { label: "Origin country", value: profile?.name, behaviour: "readonly" },
            ]}
          />
          <p className="xsmall muted" style={{ marginTop: "0.5rem" }}>
            Not editable. A request is the record of what the business sent; correcting it after the ministry
            has answered would rewrite the thing that was answered. Raise a new request instead — a second
            request against one contract is allowed.
          </p>
        </div>

        <form className="stack" onSubmit={submit} noValidate>
          <ErrorSummary errors={summaryErrors} title="The issuance could not be recorded" />
          <RequiredLegend />

          <div className="fields">
            <FormRow
              label="Export contract number"
              htmlFor="ei-no"
              required
              error={shown("ei-no")}
              hint="As issued by the Ministry of Trade. One number identifies one contract — a number already recorded against another request is refused."
            >
              <TextInput id="ei-no" value={no} onChange={setNo} required error={shown("ei-no")} />
            </FormRow>

            <FormRow
              label="Issuance date"
              htmlFor="ei-issuance"
              required
              error={shown("ei-issuance")}
              hint="The date on the ministry's document."
            >
              <TextInput
                id="ei-issuance"
                type="date"
                value={issuance}
                onChange={setIssuance}
                required
                error={shown("ei-issuance")}
              />
            </FormRow>

            <FormRow
              label="Expiry date"
              htmlFor="ei-expiry"
              required
              error={shown("ei-expiry")}
              hint="§6.14: an issued export contract carries an expiry. The validity check (rule R13) and the shipment's own expiry warning both measure against it."
            >
              <TextInput
                id="ei-expiry"
                type="date"
                value={expiry}
                onChange={setExpiry}
                required
                error={shown("ei-expiry")}
              />
            </FormRow>

            <FormRow
              label="Actual exporter"
              htmlFor="ei-exporter"
              hint="The exporter named on the issued contract, which need not be the entity that requested it."
            >
              <TextInput id="ei-exporter" value={exporter} onChange={setExporter} />
            </FormRow>

            <FormRow
              label="Actual bank"
              htmlFor="ei-bank"
              error={shown("ei-bank")}
              hint="From the counterparty master — free text until 11 September 2026."
            >
              <SelectInput
                id="ei-bank"
                value={bankId}
                onChange={chooseBank}
                error={shown("ei-bank")}
                placeholder="Not recorded"
                options={counterpartiesOfType("bank").map((b) => ({ value: b.id, label: b.name }))}
              />
            </FormRow>

            <FormRow
              label="Actual bank branch"
              htmlFor="ei-branch"
              behaviour={!bankId ? "conditional" : undefined}
              hint={
                !bankId
                  ? "Select the bank first"
                  : branches.length === 0
                    ? "Master data holds no branch for this bank"
                    : "Legacy: this value was written into the column named Goods Desc (defect D14)"
              }
            >
              <SelectInput
                id="ei-branch"
                value={branch}
                onChange={setBranch}
                disabled={!bankId || branches.length === 0}
                options={branches.map((b) => ({ value: b, label: b }))}
              />
            </FormRow>

            <FormRow
              label="Actual quantity (MT)"
              htmlFor="ei-qty"
              error={shown("ei-qty")}
              hint={`The quantity actually contracted, which need not equal the ${formatMt(e.requestedQuantityMt)} requested. It is what the consumption balance is measured against.`}
            >
              <TextInput
                id="ei-qty"
                value={actualQty}
                onChange={setActualQty}
                inputMode="decimal"
                error={shown("ei-qty")}
              />
            </FormRow>

            <FormRow
              label="Scanned contract"
              htmlFor="ei-scanned"
              hint="A file name, not a file — this prototype stores names."
            >
              <TextInput id="ei-scanned" value={scanned} onChange={setScanned} />
            </FormRow>
          </div>

          {qty !== undefined && qty > e.requestedQuantityMt ? (
            <Banner tone="info" title="The issued quantity is above the quantity requested">
              {formatMt(qty)} issued against {formatMt(e.requestedQuantityMt)} requested. Recorded as given —
              no source makes the request a ceiling on the issuance, so this is reported rather than refused.
            </Banner>
          ) : null}

          <FormRow label="Notes" htmlFor="ei-notes">
            <TextArea id="ei-notes" value={notes} onChange={setNotes} rows={3} />
          </FormRow>

          <FormActions>
            <button type="submit" className="btn btn--primary" disabled={saving || !appliesHere}>
              {saving ? "Recording…" : e.exportContractNo ? "Save the issuance" : "Record the issuance"}
            </button>
            <Link className="btn" to={`/pre-clearance/${id}`}>
              Cancel
            </Link>
          </FormActions>
        </form>

        {/*
          EX forms — Sudan only, and issued here rather than only consumed.

          The second half of meeting-pack gap 1. `consumeExportForm` has marked a form Used since
          v1.0; nothing issued one, so only the seeded forms could ever be consumed. Outside
          Sudan the section states the rule instead of vanishing, the way the shipment's bank
          card does: a reviewer comparing two countries should be able to see why one asks.
        */}
        <div className="card card__body">
          <h3 className="card__title">EX forms</h3>
          {!usesForms ? (
            <p className="small muted">
              EX forms do not apply in {profile?.name ?? "this country"}. The workshop notes record them as
              “not applicable in all counties. Mainly in Sudan”, and both sources agree, so none is issued
              here. The requirement is read from the country profile rather than from a country code.
            </p>
          ) : (
            <>
              <p className="small">
                The bank issues EX forms in specific quantities against the export contract. Issuing one here
                puts it at <em>Issued</em>; it becomes <em>Used</em> when it is consumed on a clearance
                declaration, which is done on the record screen.
              </p>

              {formError ? (
                <p className="frow__error" role="alert">
                  <span aria-hidden="true">!</span> {formError}
                </p>
              ) : null}

              {e.exportForms.length > 0 ? (
                <table className="dash__table">
                  <caption className="sr-only">EX forms issued against this export contract</caption>
                  <thead>
                    <tr>
                      <th scope="col">Form number</th>
                      <th scope="col" className="text-right">
                        Quantity
                      </th>
                      <th scope="col">Status</th>
                      <th scope="col">Issued</th>
                      <th scope="col">PS file</th>
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.exportForms.map((f) => (
                      <tr key={f.formNo}>
                        <td className="mono">{f.formNo}</td>
                        <td className="text-right">{formatMt(f.quantityMt)}</td>
                        <td>{f.status === "used" ? "Used" : f.status === "issued" ? "Issued" : "Under processing"}</td>
                        <td>{formatDate(f.issuedOn)}</td>
                        <td className="small">{f.psFileNo ?? "–"}</td>
                        <td>
                          {f.status === "used" ? (
                            <span className="xsmall muted">Used — cannot be removed</span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn--sm"
                              onClick={() => void dropForm(f.formNo)}
                            >
                              Remove<span className="sr-only"> EX form {f.formNo}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="small muted">No EX form issued against this contract yet.</p>
              )}

              {!formsReconcile ? (
                <Banner tone="warn" title="EX form quantities do not sum to the contract (rule R5)">
                  {formatMt(formsTotal)} issued against {formatMt(contractTotal)} contracted. Reported, not
                  refused — no source makes the total blocking, and the legacy estate saved three different
                  totals for one shipment.
                </Banner>
              ) : null}

              <div className="fields" style={{ marginTop: "0.75rem" }}>
                <FormRow label="EX form number" htmlFor="ef-no">
                  <TextInput
                    id="ef-no"
                    value={form.formNo}
                    onChange={(v) => setForm((f) => ({ ...f, formNo: v }))}
                  />
                </FormRow>
                <FormRow label="Quantity (MT)" htmlFor="ef-qty">
                  <TextInput
                    id="ef-qty"
                    value={form.quantityMt}
                    onChange={(v) => setForm((f) => ({ ...f, quantityMt: v }))}
                    inputMode="decimal"
                  />
                </FormRow>
                <FormRow label="Issued on" htmlFor="ef-issued" hint="Defaults to today.">
                  <TextInput
                    id="ef-issued"
                    type="date"
                    value={form.issuedOn}
                    onChange={(v) => setForm((f) => ({ ...f, issuedOn: v }))}
                  />
                </FormRow>
                <FormRow label="PS file number" htmlFor="ef-ps">
                  <TextInput
                    id="ef-ps"
                    value={form.psFileNo}
                    onChange={(v) => setForm((f) => ({ ...f, psFileNo: v }))}
                  />
                </FormRow>
              </div>

              <FormActions>
                <button type="button" className="btn" onClick={() => void addForm()} disabled={formBusy}>
                  {formBusy ? "Issuing…" : "Issue EX form"}
                </button>
              </FormActions>

              <p className="xsmall muted">
                An unbounded child collection. The legacy chain flattens this into 41 numbered columns with a
                ceiling of 20 forms, and slot 1 is typed differently from slots 2–20 (defect §4.3a).
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
