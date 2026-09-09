/**
 * New execution plan — the create screen the Execution planning tab never had.
 *
 * "Review the existing execution plan details inside the mock then add new button in the
 * header of execution planning to create new execution plan." — instruction of 6 September
 * 2026.
 *
 * WHAT THE REVIEW FOUND. The planning tab has rendered plans since v1.0 and had no way to
 * make one: `api` exposed `listExecutionPlans` and nothing else, so a contract raised in the
 * mock-up reached the tab and stopped at "No execution plan yet" for good. Downstream that
 * mattered more than it looks — a shipment cannot be raised without an execution plan, so a
 * newly created contract could not reach Phase 15 at all.
 *
 * The field set below is exactly the one the detail view already displays and the captured
 * plans already carry. Nothing has been added to the record, and three things are read from
 * the contract rather than asked for, because the contract already settles them:
 *
 *   · the planning number  — `<contract no>.<n>`, issued on save (rule R1);
 *   · the status           — always draft; a plan moves on by transition;
 *   · large volume         — a property of the contract, not of a planning lot.
 *
 * Three more are *defaulted* from the contract and stay editable, each saying so on the row:
 * the port of loading, the date to be shipped before, and the planned quantity, which
 * defaults to what the contract still has unplanned.
 *
 * AMENDED 6 September 2026, second pass. Shipper and bank are chosen from the counterparty
 * master rather than typed, the shipper's address follows from the shipper and the bank's
 * branch list from the bank; and two more fields are read rather than asked for — the
 * seasonality, derived from the contract's shipment period, and the assigned owner, read
 * from the contract. See the note beside each in the body.
 *
 * AMENDED 8 September 2026. The export contract payment terms are chosen from the payment-terms
 * master rather than typed. This field takes the *instrument* half of that master — LC, DA, DP,
 * CAD, TT — because every captured plan holds exactly that and no tenor, while the contract's
 * own field takes the whole term. One governed domain, read at the level each record uses.
 *
 * WHAT IS DELIBERATELY NOT ENFORCED. No source states that the planning lots must sum to the
 * contract quantity — rule R1 says a contract may carry several lots and stops there. The
 * screen shows what is planned and what remains and warns when a plan would take the total
 * past the contract quantity, but it does not block, in the same way the Phase 11 review does
 * not block (decision D-10). It is recorded as open rather than decided here.
 */

import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Banner, ErrorState, StatusChip, useToast } from "../components/feedback";
import { PageHeader } from "../components/layout";
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
  PORTS,
  bankBranchesFor,
  counterpartiesOfType,
  counterpartyById,
  paymentInstruments,
  paymentTermsSourceName,
  portName,
} from "../data/master";
import { TODAY, cropYearOf, formatDate, formatMt, safeNumber } from "../domain/calc";
import { api } from "../services/store";
import { useAsync } from "./hooks";

const CARGO_SOURCES = [
  { value: "CIM" as const, label: "CIM" },
  { value: "JV" as const, label: "JV" },
];

const URGENCIES = [
  { value: "low" as const, label: "Low" },
  { value: "medium" as const, label: "Medium" },
  { value: "high" as const, label: "High" },
];

export function ExecutionPlanForm() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  /**
   * `?return=shipment` — the New shipment screen needs an execution plan and cannot make one,
   * so a contract with no plan was a dead end there: leave, find the contract, open its
   * planning tab, create the plan, come back. The link beside that screen's plan field sends
   * the user here and this brings them back, with the new plan already selected. Anything
   * other than the one value we recognise is ignored, so a stray query string cannot redirect
   * the save anywhere unexpected.
   */
  const returnToShipment = params.get("return") === "shipment";

  const contract = useAsync(() => api.getContract(id), [id]);
  const plans = useAsync(() => api.listExecutionPlans());
  const c = contract.data;

  const onContract = useMemo(
    () => (plans.data ?? []).filter((p) => p.contractId === id),
    [plans.data, id],
  );
  const plannedElsewhere = onContract.reduce((a, p) => a + p.plannedQuantityMt, 0);
  const unplanned = c ? Math.max(0, c.quantityMt - plannedElsewhere) : 0;

  const [hydrated, setHydrated] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [portOfLoadingId, setPortOfLoadingId] = useState("");
  /* Shipper and bank are chosen from the counterparty master since 6 September 2026, so the
     draft holds their ids and the names are read from the master on save. */
  const [shipperId, setShipperId] = useState("");
  const [shipperAddress, setShipperAddress] = useState("");
  const [shipperOnBehalfOf, setShipperOnBehalfOf] = useState("");
  const [bankId, setBankId] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [cargoSource, setCargoSource] = useState<"CIM" | "JV" | "">("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [urgency, setUrgency] = useState<"low" | "medium" | "high">("medium");
  const [rawQuantity, setRawQuantity] = useState("");
  const [finishedQuantity, setFinishedQuantity] = useState("");
  const [needProcessing, setNeedProcessing] = useState("");
  const [receivingAt, setReceivingAt] = useState("");
  const [shipBefore, setShipBefore] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  /**
   * The four values the contract settles, applied once the contract has loaded. They are
   * defaults and not rules: each row says where it came from and every one stays editable.
   */
  const [defaulted, setDefaulted] = useState<string[]>([]);
  if (c && !hydrated) {
    setHydrated(true);
    const filled: string[] = [];
    if (unplanned > 0) {
      setQuantity(String(unplanned));
      filled.push("ep-qty");
    }
    if (c.portOfLoadingId) {
      setPortOfLoadingId(c.portOfLoadingId);
      filled.push("ep-port");
    }
    if (c.shipmentPeriodEnd) {
      setShipBefore(c.shipmentPeriodEnd);
      filled.push("ep-ship-before");
    }
    setDefaulted(filled);
  }

  const from = (field: string) => (defaulted.includes(field) ? ("inherited" as const) : undefined);

  /**
   * Three values the instruction of 6 September 2026 took off this screen, and where each
   * is read from instead.
   *
   *   · Seasonality — "already inherited based on the purchase contract". It is, in the
   *     sense that the contract is the right place for it to come from; it is not, in the
   *     sense that the contract record carries no season. Derived from the contract's
   *     shipment period by `cropYearOf`, whose convention is an [ASSUMPTION] stated in full
   *     there and on the row below. The open question is whether a contract should carry a
   *     season of its own rather than have one inferred.
   *
   *   · Assigned to — read from the contract's assigned Dubai Execution owner, which was
   *     already this field's default. Removing the control makes it what it always was.
   *
   *   · Shipper address — read from the shipper's master record when a shipper is chosen,
   *     and still editable, exactly as the contract's buyer address is: a one-off address
   *     is a real case, and the master value is the default rather than the only answer.
   */
  const seasonality = cropYearOf(c?.shipmentPeriodStart);
  const assignedTo = c?.assignedDubaiExecution ?? "";
  const shippers = counterpartiesOfType("shipper");
  const banks = counterpartiesOfType("bank");
  const branches = bankBranchesFor(bankId);

  function chooseShipper(next: string) {
    setShipperId(next);
    /* The address follows the shipper, and replaces one that came from another shipper —
       but never overwrites something typed against no shipper at all. */
    const m = counterpartyById(next);
    if (m) setShipperAddress(m.address);
  }

  function chooseBank(next: string) {
    setBankId(next);
    /* A branch belongs to a bank, so changing the bank drops a branch the new one has not
       got and keeps one it has — "Head office" survives the change, which is the common case. */
    setBankBranch((b) => (bankBranchesFor(next).includes(b) ? b : ""));
  }

  const errors: Record<string, string> = {};
  const qty = safeNumber(quantity, -1);
  if (!quantity.trim() || !(qty > 0)) errors["ep-qty"] = "Enter the planned quantity in MT, greater than zero.";
  if (!portOfLoadingId) errors["ep-port"] = "Select the port of loading.";
  if (!shipperId) errors["ep-shipper"] = "Select the shipper.";
  if (!bankId) errors["ep-bank"] = "Select the bank.";
  if (!cargoSource) errors["ep-cargo-source"] = "Select the cargo source.";
  if (!paymentTerms.trim()) errors["ep-payment-terms"] = "Select the export contract payment terms.";
  /* Neither of these is a field any more, so neither message asks for input: each says what
     the value is read from and why it is missing. Both are unreachable from this screen. */
  if (!seasonality)
    errors["ep-season"] =
      "No season could be derived: the contract has no shipment period to read one from. Seasonality is " +
      "no longer entered here.";
  if (!assignedTo.trim())
    errors["ep-assigned"] =
      "The contract names no assigned Dubai Execution owner, so there is none to record on the plan. " +
      "It is read from the contract rather than entered.";
  if (receivingAt && shipBefore && receivingAt > shipBefore)
    errors["ep-receiving"] = "Cargo cannot be received at the facility after the date it must ship before.";

  const shown = (field: string) => (submitted ? errors[field] : undefined);
  const summaryErrors = submitted
    ? Object.entries(errors).map(([field, message]) => ({ field, message }))
    : [];

  /** Advisory, not a rule — see the note at the top of this file. */
  const overPlans = c !== undefined && qty > 0 && plannedElsewhere + qty > c.quantityMt;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    const res = await api.createExecutionPlan({
      contractId: id,
      plannedQuantityMt: qty,
      portOfLoadingId,
      shipperName: counterpartyById(shipperId)?.name ?? "",
      shipperAddress,
      shipperOnBehalfOf,
      bank: counterpartyById(bankId)?.name ?? "",
      bankBranch,
      seasonality,
      cargoSource: cargoSource as "CIM" | "JV",
      exportContractPaymentTerms: paymentTerms,
      urgency,
      assignedTo,
      rawQuantityMt: rawQuantity.trim() ? safeNumber(rawQuantity, 0) : undefined,
      finishedQuantityMt: finishedQuantity.trim() ? safeNumber(finishedQuantity, 0) : undefined,
      needProcessingMt: needProcessing.trim() ? safeNumber(needProcessing, 0) : undefined,
      receivingAtFacilityDate: receivingAt,
      toBeShippedBefore: shipBefore,
      note,
    });
    setSaving(false);
    if (!res.ok) {
      setServerError(res.reason);
      return;
    }
    if (returnToShipment) {
      toast.push("ok", `${res.value.planningNo} created as a draft, and selected on the shipment.`);
      navigate(`/shipments/new?contract=${id}&plan=${res.value.id}`);
      return;
    }
    toast.push(
      "ok",
      `${res.value.planningNo} created as a draft. A shipment can now be raised against it (Phase 15).`,
    );
    navigate(`/contracts/${id}/planning`);
  }

  if (contract.loading) return null;
  if (!c) {
    return (
      <ErrorState
        title="That contract is not part of the demonstration"
        detail="An execution plan is always raised against a contract, so this screen cannot open without one."
      />
    );
  }

  return (
    <>
      <PageHeader
        moduleLabel="Contract to cargo"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Contracts", to: "/contracts" },
          { label: c.contractNo, to: `/contracts/${c.id}` },
          { label: "New execution plan" },
        ]}
        title="New execution plan"
        meta={`${c.contractNo} · ${formatMt(c.quantityMt)} · ${formatMt(plannedElsewhere)} already planned across ${onContract.length} lot(s) · created ${formatDate(TODAY)}`}
        recordKey="Phase 13"
        recordDate="execution planning"
      />

      <div className="page">
        {returnToShipment ? (
          <Banner tone="info" title="Raised from the New shipment screen">
            A shipment cannot be raised without an execution plan, and that screen cannot create one — the
            plan belongs to the contract, not to the shipment. Creating it here returns you to{" "}
            <Link to={`/shipments/new?contract=${c.id}`}>the new shipment</Link> with this plan selected.
          </Banner>
        ) : null}

        <Banner tone="info" title="What is issued, and what is read from the contract">
          The <strong>planning number</strong> is issued on save as{" "}
          <code>
            {c.contractNo}.{onContract.length + 1}
          </code>{" "}
          — the contract's own sequence, rule R1 — and the <strong>status</strong> is always Draft, because a
          plan moves on by transition rather than by being created in a later state. <strong>Large volume</strong>{" "}
          is read from the contract: it describes one export contract consumed across several shipments, which
          is a property of the contract and not of a planning lot. Four more values are <em>defaulted</em> from
          the contract and stay editable — the port of loading, the assigned owner, the date to ship before,
          and the quantity, which starts at what the contract still has unplanned. Four values are
          <em> read</em> rather than asked for: the shipper's address follows the shipper, the branch list
          follows the bank, the assigned owner comes from the contract, and the season is derived from the
          contract's shipment period — the contract carries no season of its own, so that derivation is an
          assumption and is stated on the row.
        </Banner>

        {overPlans ? (
          <Banner tone="warn" title="This would plan more than the contract carries">
            {formatMt(plannedElsewhere)} is already planned on {c.contractNo} and this lot adds{" "}
            {formatMt(qty)}, against a contract quantity of {formatMt(c.quantityMt)}. Nothing blocks it: rule
            R1 says a contract may carry several planning lots and states no total, so no ceiling is invented
            here. The same question is open for the business as the one on the cross-functional review.
          </Banner>
        ) : null}

        {serverError ? (
          <Banner tone="risk" title="The execution plan could not be created">
            {serverError}
          </Banner>
        ) : null}

        <form className="stack" onSubmit={submit} noValidate>
          <ErrorSummary errors={summaryErrors} title="This execution plan could not be created" />
          <RequiredLegend />

          <div className="fields">
            <FormRow label="Planning number" htmlFor="ep-no" behaviour="readonly" hint="Issued on save.">
              <div id="ep-no">
                <strong>
                  {c.contractNo}.{onContract.length + 1}
                </strong>
              </div>
            </FormRow>

            <FormRow
              label="Status"
              htmlFor="ep-status"
              behaviour="readonly"
              hint="A new plan is always a draft; it moves on by allowed transition."
            >
              <div id="ep-status">
                <StatusChip tone="info" label="Draft" size="sm" />
              </div>
            </FormRow>

            <FormRow
              label="Planned quantity (MT)"
              htmlFor="ep-qty"
              required
              error={shown("ep-qty")}
              behaviour={from("ep-qty")}
              hint={`${formatMt(unplanned)} of ${formatMt(c.quantityMt)} is still unplanned.`}
            >
              <TextInput
                id="ep-qty"
                value={quantity}
                onChange={setQuantity}
                inputMode="decimal"
                required
                error={shown("ep-qty")}
              />
            </FormRow>

            <FormRow
              label="Port of loading"
              htmlFor="ep-port"
              required
              error={shown("ep-port")}
              behaviour={from("ep-port")}
              hint={`The contract loads at ${portName(c.portOfLoadingId)}.`}
            >
              <SelectInput
                id="ep-port"
                value={portOfLoadingId}
                onChange={setPortOfLoadingId}
                required
                error={shown("ep-port")}
                options={PORTS.filter((p) => p.type === "load" || p.type === "both").map((p) => ({
                  value: p.id,
                  label: `${p.name}, ${p.country}`,
                }))}
              />
            </FormRow>

            <FormRow
              label="Shipper"
              htmlFor="ep-shipper"
              required
              error={shown("ep-shipper")}
              hint="From the counterparty master."
            >
              <SelectInput
                id="ep-shipper"
                value={shipperId}
                onChange={chooseShipper}
                required
                error={shown("ep-shipper")}
                options={shippers.map((sp) => ({ value: sp.id, label: sp.name }))}
              />
            </FormRow>

            <FormRow
              label="Shipper address"
              htmlFor="ep-shipper-address"
              behaviour={shipperId ? "inherited" : undefined}
              hint={
                shipperId
                  ? "Defaulted from the shipper master; editable for a one-off address, as the contract's buyer address is."
                  : "Filled in from the shipper master once a shipper is chosen."
              }
            >
              <TextInput id="ep-shipper-address" value={shipperAddress} onChange={setShipperAddress} />
            </FormRow>

            <FormRow
              label="Shipper on behalf of"
              htmlFor="ep-on-behalf"
              hint="The party the shipper acts for, where they differ."
            >
              <TextInput id="ep-on-behalf" value={shipperOnBehalfOf} onChange={setShipperOnBehalfOf} />
            </FormRow>

            <FormRow
              label="Bank"
              htmlFor="ep-bank"
              required
              error={shown("ep-bank")}
              hint="From the counterparty master."
            >
              <SelectInput
                id="ep-bank"
                value={bankId}
                onChange={chooseBank}
                required
                error={shown("ep-bank")}
                options={banks.map((b) => ({ value: b.id, label: b.name }))}
              />
            </FormRow>

            <FormRow
              label="Bank branch"
              htmlFor="ep-bank-branch"
              hint={
                !bankId
                  ? "Select the bank first — the branches on offer are its own."
                  : branches.length === 0
                    ? "The master holds no branches for this bank."
                    : "From the bank's own branch list."
              }
            >
              <SelectInput
                id="ep-bank-branch"
                value={bankBranch}
                onChange={setBankBranch}
                disabled={!bankId || branches.length === 0}
                placeholder={bankId ? "No branch specified" : "Select a bank first"}
                options={branches.map((b) => ({ value: b, label: b }))}
              />
            </FormRow>

            <FormRow
              label="Seasonality"
              htmlFor="ep-season"
              behaviour="calculated"
              error={shown("ep-season")}
              hint="Read from the contract's shipment period, which begins before October and therefore draws on the previous crop. The contract itself carries no season — this convention is an assumption, and whether a contract should carry one is open."
            >
              <div id="ep-season">
                {seasonality ? (
                  <strong>{seasonality}</strong>
                ) : (
                  <span className="muted">– no shipment period to read one from</span>
                )}
              </div>
            </FormRow>

            <FormRow
              label="Cargo source"
              htmlFor="ep-cargo-source"
              required
              error={shown("ep-cargo-source")}
            >
              <SelectInput
                id="ep-cargo-source"
                value={cargoSource}
                onChange={(v) => setCargoSource(v)}
                required
                error={shown("ep-cargo-source")}
                options={CARGO_SOURCES}
              />
            </FormRow>

            <FormRow
              label="Export contract payment terms"
              htmlFor="ep-payment-terms"
              required
              error={shown("ep-payment-terms")}
              hint={`From ${paymentTermsSourceName()} since 8 September 2026 — the instrument on its own, which is what every captured plan holds. These are the export contract's terms and not the sales contract's: ${c.contractNo} carries "${c.paymentTerms}", a term with a tenor, and it is not defaulted here because the two are agreed with different parties.`}
            >
              <SelectInput
                id="ep-payment-terms"
                value={paymentTerms}
                onChange={setPaymentTerms}
                required
                error={shown("ep-payment-terms")}
                options={paymentInstruments()
                  .filter((i) => i.active)
                  .map((i) => ({
                    value: i.code,
                    label: `${i.code} — ${i.name}`,
                  }))}
              />
            </FormRow>

            <FormRow label="Urgency" htmlFor="ep-urgency">
              <SelectInput id="ep-urgency" value={urgency} onChange={(v) => setUrgency(v)} options={URGENCIES} />
            </FormRow>

            <FormRow
              label="Assigned to"
              htmlFor="ep-assigned"
              behaviour="inherited"
              error={shown("ep-assigned")}
              hint="Read from the contract's assigned Dubai Execution owner, not entered."
            >
              <div id="ep-assigned">
                {assignedTo ? (
                  <strong>{assignedTo}</strong>
                ) : (
                  <span className="muted">– the contract names none</span>
                )}
              </div>
            </FormRow>

            <FormRow
              label="Raw quantity (MT)"
              htmlFor="ep-raw"
              hint="Optional. Left blank on most captured plans."
            >
              <TextInput id="ep-raw" value={rawQuantity} onChange={setRawQuantity} inputMode="decimal" />
            </FormRow>

            <FormRow label="Finished quantity (MT)" htmlFor="ep-finished">
              <TextInput
                id="ep-finished"
                value={finishedQuantity}
                onChange={setFinishedQuantity}
                inputMode="decimal"
              />
            </FormRow>

            <FormRow
              label="Needs processing (MT)"
              htmlFor="ep-need-processing"
              hint="Entered, not calculated: no source states that it is raw less finished, and the captured plans do not bear that out."
            >
              <TextInput
                id="ep-need-processing"
                value={needProcessing}
                onChange={setNeedProcessing}
                inputMode="decimal"
              />
            </FormRow>

            <FormRow
              label="Receiving at facility"
              htmlFor="ep-receiving"
              error={shown("ep-receiving")}
            >
              <TextInput
                id="ep-receiving"
                type="date"
                value={receivingAt}
                onChange={setReceivingAt}
                error={shown("ep-receiving")}
              />
            </FormRow>

            <FormRow
              label="To be shipped before"
              htmlFor="ep-ship-before"
              behaviour={from("ep-ship-before")}
              hint={`Defaulted from the end of the contracted shipment period, ${formatDate(c.shipmentPeriodEnd)}.`}
            >
              <TextInput id="ep-ship-before" type="date" value={shipBefore} onChange={setShipBefore} />
            </FormRow>
          </div>

          <FormRow label="Note" htmlFor="ep-note">
            <TextArea id="ep-note" value={note} onChange={setNote} rows={3} />
          </FormRow>

          <FormActions>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Creating…" : "Create execution plan"}
            </button>
            <Link
              className="btn"
              to={returnToShipment ? `/shipments/new?contract=${c.id}` : `/contracts/${c.id}/planning`}
            >
              Cancel
            </Link>
          </FormActions>
        </form>
      </div>
    </>
  );
}
