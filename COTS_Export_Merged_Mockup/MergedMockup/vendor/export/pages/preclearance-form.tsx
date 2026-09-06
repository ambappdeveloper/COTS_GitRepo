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

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Banner, useToast } from "../components/feedback";
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
import { counterpartyName } from "../data/master";
import { TODAY, formatDate, formatMt, money, safeNumber } from "../domain/calc";
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

  const plans = useAsync(() => api.listExecutionPlans());
  const contracts = useAsync(() => api.listContracts());
  const existing = useAsync(() => api.listExportContracts());

  const [planId, setPlanId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [entity, setEntity] = useState<ExportContract["exportingEntity"] | "">("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const plan = (plans.data ?? []).find((p) => p.id === planId);
  const contract = (contracts.data ?? []).find((c) => c.id === plan?.contractId);
  const profile = contract ? COUNTRY_PROFILES[contract.origin] : undefined;
  const appliesHere = profile ? profile.usesExportContract : true;

  const onPlan = useMemo(
    () => (existing.data ?? []).filter((e) => e.executionPlanId === planId),
    [existing.data, planId],
  );
  const nextRequestNo = plan ? `${plan.planningNo}-R${onPlan.length + 1}` : "";

  /**
   * Choosing a plan settles the contract and defaults the quantity to what that plan plans.
   * Both stay visible: the contract because it is what the request is ultimately for, and
   * the quantity because the captured requests do not all match their plan — PC-2041.1
   * plans 600 MT and requested 630 — so it is a default and not a rule.
   */
  function choosePlan(next: string) {
    setPlanId(next);
    const p = (plans.data ?? []).find((x) => x.id === next);
    if (p) setQuantity(String(p.plannedQuantityMt));
  }

  const errors: Record<string, string> = {};
  const qty = safeNumber(quantity, -1);
  if (!planId) errors["ec-plan"] = "Select the execution plan this request is raised against.";
  if (!quantity.trim() || !(qty > 0))
    errors["ec-qty"] = "Enter the requested quantity in MT, greater than zero.";
  if (!entity) errors["ec-entity"] = "Select the exporting entity.";
  if (price.trim() && !(safeNumber(price, -1) > 0))
    errors["ec-price"] = "The unit price must be a number greater than zero, or left blank.";
  if (planId && !appliesHere)
    errors["ec-plan"] = `${profile?.name ?? "That country"} does not use an export contract, so no request is raised there.`;

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
      executionPlanId: planId,
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
          <strong>request</strong> is what the business sends: the plan it is for, the quantity and the
          exporting entity. The <strong>issuance</strong> — the export contract number, its dates, the actual
          exporter, bank and quantity, and the EX forms — is what the ministry sends back, and is recorded on
          the record once it does. A create screen that asked for it would be asking you to invent the answer.
          Status is therefore always <em>Requested</em>, and moves on by transition.
        </Banner>

        {planId && !appliesHere ? (
          <Banner tone="warn" title={`${profile?.name} does not use an export contract`}>
            {profile?.startsFromCommercialInvoice
              ? "Its customs process starts from a commercial invoice instead."
              : "The step does not apply there."}{" "}
            Pre-clearance marks an inapplicable step <em>Not applicable</em> rather than leaving it pending,
            so no request is raised. Choose a plan on a contract from a country that uses one.
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
              hint="Issued on save, from the plan's own sequence."
            >
              <div id="ec-no">
                {nextRequestNo ? (
                  <strong>{nextRequestNo}</strong>
                ) : (
                  <span className="muted">– select an execution plan</span>
                )}
              </div>
            </FormRow>

            <FormRow
              label="Execution plan"
              htmlFor="ec-plan"
              required
              error={shown("ec-plan")}
              hint="The request is raised against a planning lot, which is what carries the exporter, the bank and the port."
            >
              <SelectInput
                id="ec-plan"
                value={planId}
                onChange={choosePlan}
                required
                error={shown("ec-plan")}
                options={(plans.data ?? []).map((p) => ({
                  value: p.id,
                  label: `${p.planningNo} — ${formatMt(p.plannedQuantityMt)} — ${p.shipperName}`,
                }))}
              />
            </FormRow>

            <FormRow
              label="Purchase contract"
              htmlFor="ec-contract"
              behaviour="readonly"
              hint="Read from the plan — a plan belongs to one contract, so it is not asked for."
            >
              <div id="ec-contract">
                {contract ? (
                  <>
                    <strong>{contract.contractNo}</strong>{" "}
                    <span className="muted small">
                      · {counterpartyName(contract.buyerId)} · {COUNTRY_PROFILES[contract.origin].name}
                    </span>
                  </>
                ) : (
                  <span className="muted">– select an execution plan</span>
                )}
              </div>
            </FormRow>

            <FormRow
              label="Requested quantity (MT)"
              htmlFor="ec-qty"
              required
              error={shown("ec-qty")}
              behaviour={planId ? "inherited" : undefined}
              hint={
                plan
                  ? `Defaulted from the plan's ${formatMt(plan.plannedQuantityMt)}. The captured requests do not all match their plan, so this is a default and not a rule.`
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
              <div id="ec-lv">
                {contract ? (
                  <strong>{contract.isLargeVolume ? "Yes" : "No"}</strong>
                ) : (
                  <span className="muted">– select an execution plan</span>
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
