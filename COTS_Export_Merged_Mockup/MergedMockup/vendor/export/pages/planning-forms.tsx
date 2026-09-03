/**
 * Phases 01–02 — the add and edit screens for the seasonal purchase plan and the budget.
 *
 * WHAT THESE ARE. One form per phase, each serving both `create` and `edit`, built to the
 * activity sequence its section of workflow v2.3 states and to nothing else.
 *
 * §6.1, in the requirement's own order:
 *   1. COTS presents the seasonal purchase plan.
 *   2. The user defines the seasonal period, as a From month and year and a To month and
 *      year. The period is chosen by month and year, not by calendar date.
 *   3. COTS determines the months that fall between the From and To periods and presents
 *      them in chronological order.
 *   4. For each month the user enters the commodity, the quantity in MT and the capacity
 *      needed.
 *   5-7. The user completes the plan, COTS saves it against the export process record,
 *      and the user proceeds to Phase 02.
 * Step 3 is why the period sits above the grid and the grid is generated rather than
 * typed: change either bound and the month columns change with it.
 *
 * WHERE THE SPREADSHEET SUPERSEDES THE TEXT. `Export Plan V1.xlsx`, received 27 August
 * 2026, is the shape a plan is actually written in, and it differs from §6.1 activity 4
 * in three ways. The sheet is the later and more specific evidence, so the form follows
 * it and says so on screen:
 *   · the layout is commodity down, month across — one row per commodity with a quantity
 *     in each month, not one row per month. Entering more than one commodity for a month
 *     is therefore the normal case rather than an exception;
 *   · `Capacity needed MT` is not entered. It is
 *     `=LARGE(row,1)+LARGE(row,2)+LARGE(row,3)`: the sum of the commodity's three largest
 *     months. So the capacity field is gone from entry and the column is calculated;
 *   · the sheet carries a `Notes` column per commodity row, which every captured row
 *     fills with `PZU` and the Summary sheet pivots capacity against as a location. It is
 *     added after `Total QTY/MT`, where the sheet puts it.
 * `Commodity Group` is likewise not entered: it is read from the commodity master.
 *
 * §6.2, likewise:
 *   1. COTS presents the budget screen.
 *   2. At the top of the screen the user defines the budget period, as a From date and a
 *      To date.
 *   3. The user enters the budget information: the plan, chosen from a drop-down list;
 *      the quantity in MT; the amount; and the supplier.
 *   4-7. The user completes the information, records the approval status, COTS saves the
 *      budget against the export process record, and the user proceeds to Phase 03.
 *
 * EDITING IS OURS, NOT THE REQUIREMENT'S. Neither section describes changing a saved
 * record. Both ask who may edit one once it is saved, and both ask what becomes of it
 * when the period — or, for the budget, the plan — is afterwards changed. So the edit
 * screens are built to answer neither question by accident:
 *   · anyone signed in may edit, and the only thing recorded is that a change happened
 *     and by whom. No version history, no previous values, no approval of the change,
 *     because none of that is stated;
 *   · narrowing a seasonal period would leave lines outside it. Rather than dropping them
 *     silently, the form names the months whose lines will be lost, in a banner, before
 *     the user commits — and widening the period again brings them back, because they are
 *     kept in the form's own state until the save. That is the open question made visible
 *     rather than settled;
 *   · changing a budget's approval status is an edit like any other. It is not a
 *     transition, no value is treated as more advanced than another, and clearing it back
 *     to blank is allowed.
 *
 * SAVE AND SAVE & SHARE. The plan form saves under either button. `Save & share` also
 * stamps the plan as shared and says, on the screen and in the confirmation, that the
 * stakeholders to notify are configured in the system later — so no email is sent and no
 * recipient is named. Nothing downstream reads the shared stamp.
 *
 * WHAT IS DELIBERATELY ABSENT. No required-field rule beyond what a record structurally
 * needs. §6.1 and §6.2 both state "none stated" for preconditions and blocking controls,
 * and both ask outright whether the record must be complete before the next phase — so a
 * month may be left blank, a line may be left part-filled, and the approval status is
 * optional. What the forms do instead is *report* what is outstanding as the user types,
 * so nothing is hidden and nothing is invented. Every refusal below is structural and
 * mirrors a refusal in `api.*`, whose `reason` is shown verbatim if the store still
 * refuses.
 */

import { useEffect, useMemo, useRef, useState } from "react";
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
import { COMMODITIES, COUNTERPARTIES, commodityById, commodityGroupOf } from "../data/master";
import { TODAY, formatDate, formatMoney, formatMt, formatNumber, money, sum } from "../domain/calc";
import {
  approvalStatusesInUse,
  budgetByCommodity,
  budgetGaps,
  budgetIssuedPaymentRate,
  budgetIssuedPaymentRateBasis,
  budgetIssuedPaymentUsd,
  budgetPlanConflict,
  budgetPlanId,
  budgetTotals,
  capacityNeeded,
  formatSeasonMonth,
  isPlanActive,
  monthsInSeason,
  periodFit,
  planCarriesCommodity,
  planCommodities,
  plannedForCommodity,
  planGaps,
  planGrid,
  planGridTotals,
  planTotals,
  seasonMonthKey,
} from "../domain/planning";
import { fxCoverage } from "../data/fx-rates";
import type {
  Budget,
  BudgetLine,
  CurrencyCode,
  SeasonMonth,
  SeasonalPlanRow,
  SeasonalPurchasePlan,
} from "../domain/types";
import { api } from "../services/store";
import { useAsync } from "./hooks";

/** Both forms serve two screens. Nothing else about them differs. */
export type FormMode = "create" | "edit";

/* ------------------------------------------------------------------ *
 * Option lists
 * ------------------------------------------------------------------ */

const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((label, i) => ({ value: String(i + 1), label }));

/**
 * §6.1 gives no year range. A window around today is offered so the control is usable;
 * it is a convenience of this prototype and constrains nothing in the requirement. An
 * existing plan's own years are added when the edit form hydrates, so a plan from an
 * earlier season can always be reopened.
 */
const BASE_YEARS = Array.from({ length: 7 }, (_, i) => Number(TODAY.slice(0, 4)) - 2 + i);

function yearOptions(extra: number[] = []): { value: string; label: string }[] {
  return [...new Set([...BASE_YEARS, ...extra])]
    .sort((a, b) => a - b)
    .map((y) => ({ value: String(y), label: String(y) }));
}

const COMMODITY_OPTIONS = COMMODITIES.filter((c) => c.active).map((c) => ({
  value: c.id,
  label: `${c.name} (${c.code})`,
}));

const SUPPLIER_OPTIONS = COUNTERPARTIES.filter((c) => c.type === "supplier").map((s) => ({
  value: s.id,
  label: s.name,
}));

/**
 * §6.2 asks what currency Amount is in and whether it is one currency or chosen per
 * budget. Until that is answered the currency is chosen per line, and the question is
 * put on the field.
 */
const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = [
  { value: "USD", label: "USD" },
  { value: "SDG", label: "SDG" },
  { value: "AED", label: "AED" },
  { value: "ETB", label: "ETB" },
];

const NOTE_LIMIT = 200;

/**
 * The month column heading. The Plan sheet writes the month name alone; the year is added
 * whenever a period spans more than one, because "January" twice in one header is a trap.
 */
function monthLabel(m: SeasonMonth): string {
  return formatSeasonMonth(m);
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function parseNumber(v: string): number | undefined {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function errorList(errors: Record<string, string>): { field: string; message: string }[] {
  return Object.entries(errors).map(([field, message]) => ({ field, message }));
}

function commodityName(id?: string): string {
  return (id ? commodityById(id)?.name : undefined) ?? "the commodity";
}

/** The shared loading / not-found frame both edit screens need before they can hydrate. */
function EditGate({
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
 * 1 — Seasonal purchase plan · /sourcing/plans/new
 *                            · /sourcing/plans/:id/edit
 *
 * Laid out as the Plan sheet of `Export Plan V1.xlsx` lays it out: commodity
 * down, month across, quantities typed straight into the cells. The month
 * columns are generated from the period, so changing either bound changes the
 * columns — §6.1 activity 3 made visible.
 *
 * Three columns are not entered:
 *   · `Commodity Group` fills itself from the commodity chosen, out of the
 *     master, so a plan can never disagree with the master;
 *   · `Total QTY/MT` is the row's SUM;
 *   · `Capacity needed MT` is the sheet's own
 *     `LARGE(row,1)+LARGE(row,2)+LARGE(row,3)` — the three peak months.
 * ================================================================== */

/**
 * One row of the grid as the planner is filling it in: a commodity, a note, and one text
 * value per month keyed by `YYYY-MM`.
 *
 * The key is stable for the life of the form, so a row keeps its identity while the period
 * around it changes — which is what lets a quantity survive a period being narrowed and
 * then widened again, and lets the form name what a narrowing would cost.
 */
interface DraftPlanRow {
  key: string;
  commodityId: string;
  note: string;
  /** `YYYY-MM` → the quantity as typed. A key absent or blank is an empty cell. */
  cells: Record<string, string>;
}

function emptyPlanRow(key: string): DraftPlanRow {
  return { key, commodityId: "", note: "", cells: {} };
}

function planRowHasContent(r: DraftPlanRow): boolean {
  return Boolean(r.commodityId || r.note.trim() || Object.values(r.cells).some((v) => v.trim()));
}

export function SeasonalPurchasePlanForm({ mode }: { mode: FormMode }) {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const plan = useAsync(
    () => (mode === "edit" ? api.getSeasonalPurchasePlan(id) : Promise.resolve(undefined)),
    [id, mode],
  );
  const existing = mode === "edit" ? plan.data : undefined;

  const [fromMonth, setFromMonth] = useState("");
  const [fromYear, setFromYear] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [toYear, setToYear] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<DraftPlanRow[]>([emptyPlanRow("row-1")]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const [saving, setSaving] = useState<false | "save" | "share">(false);
  const [hydrated, setHydrated] = useState(mode === "create");
  const nextKey = useRef(0);

  // Hydrate the edit form once, when the record arrives.
  useEffect(() => {
    if (mode !== "edit" || !existing || hydrated) return;
    setFromMonth(String(existing.from.month));
    setFromYear(String(existing.from.year));
    setToMonth(String(existing.to.month));
    setToYear(String(existing.to.year));
    setNote(existing.note ?? "");
    setRows(
      existing.rows.length > 0
        ? existing.rows.map((r) => ({
            key: `saved-${r.id}`,
            commodityId: r.commodityId ?? "",
            note: r.note ?? "",
            cells: Object.fromEntries(
              r.cells
                .filter((c) => c.quantityMt !== undefined)
                .map((c) => [seasonMonthKey(c), String(c.quantityMt)]),
            ),
          }))
        : [emptyPlanRow("row-1")],
    );
    setHydrated(true);
  }, [mode, existing, hydrated]);

  const from: SeasonMonth | undefined =
    fromMonth && fromYear ? { month: Number(fromMonth), year: Number(fromYear) } : undefined;
  const to: SeasonMonth | undefined =
    toMonth && toYear ? { month: Number(toMonth), year: Number(toYear) } : undefined;

  /** §6.1 activity 3 — the months COTS determines, live, as the two bounds are set. */
  const months = useMemo(() => monthsInSeason(from, to), [fromMonth, fromYear, toMonth, toYear]); // eslint-disable-line react-hooks/exhaustive-deps
  const monthKeys = useMemo(() => months.map(seasonMonthKey), [months]);
  const inPeriod = useMemo(() => new Set(monthKeys), [monthKeys]);

  const periodBackwards = Boolean(from && to && to.year * 12 + to.month < from.year * 12 + from.month);

  function setRow(key: string, patch: Partial<DraftPlanRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function setCell(key: string, monthKey: string, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, cells: { ...r.cells, [monthKey]: value } } : r)),
    );
  }

  function addRow() {
    nextKey.current += 1;
    setRows((prev) => [...prev, emptyPlanRow(`row-added-${nextKey.current}`)]);
  }

  /** The record's rows: only cells inside the period, and only those carrying a number. */
  const planRows: SeasonalPlanRow[] = rows.filter(planRowHasContent).map((r, i) => ({
    id: `spr-${i + 1}`,
    commodityId: r.commodityId || undefined,
    note: r.note.trim() || undefined,
    cells: monthKeys
      .map((mk, idx) => ({ mk, m: months[idx] }))
      .filter(({ mk }) => (r.cells[mk] ?? "").trim() !== "")
      .map(({ mk, m }) => ({ year: m.year, month: m.month, quantityMt: parseNumber(r.cells[mk]) })),
  }));

  const draftPlan = {
    from: from ?? { year: 0, month: 0 },
    to: to ?? { year: 0, month: 0 },
    rows: planRows,
  };
  const grid = planGrid(draftPlan);
  const totals = planGridTotals(grid, months.length);
  const planned = planTotals(draftPlan);
  const gaps = planGaps(draftPlan);

  /**
   * Quantities typed against a month the period no longer spans. §6.1 asks what becomes
   * of a saved plan when the period is changed and does not answer, so these are neither
   * saved nor discarded: they are named on screen and widening the period brings them back.
   */
  const orphanMonths = useMemo(() => {
    const out = new Set<string>();
    for (const r of rows) {
      for (const [mk, v] of Object.entries(r.cells)) {
        if (v.trim() !== "" && !inPeriod.has(mk)) out.add(mk);
      }
    }
    return [...out].sort();
  }, [rows, inPeriod]);
  const orphanLabels = orphanMonths.map((mk) => {
    const [y, m] = mk.split("-");
    return formatSeasonMonth({ year: Number(y), month: Number(m) });
  });

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!fromMonth || !fromYear) next["spp-from-month"] = "Define the From month and year of the period.";
    if (!toMonth || !toYear) next["spp-to-month"] = "Define the To month and year of the period.";
    if (periodBackwards) {
      next["spp-to-month"] =
        "The To period must be the same month as the From period or later. COTS determines the months that fall between the two, and a period that runs backwards determines none.";
    }
    for (const r of rows) {
      for (const mk of monthKeys) {
        const raw = r.cells[mk] ?? "";
        if (!raw.trim()) continue;
        const n = parseNumber(raw);
        const [y, m] = mk.split("-");
        const label = formatSeasonMonth({ year: Number(y), month: Number(m) });
        if (n === undefined) {
          next[`spp-cell-${r.key}-${mk}`] = `The quantity for ${label} is not a number.`;
        } else if (n < 0) {
          next[`spp-cell-${r.key}-${mk}`] = `The quantity for ${label} cannot be negative.`;
        }
      }
    }
    if (note.length > NOTE_LIMIT) {
      next["spp-note"] = `The note is limited to ${NOTE_LIMIT} characters; this one is ${note.length}.`;
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
        ? await api.createSeasonalPurchasePlan({
            from: from as SeasonMonth,
            to: to as SeasonMonth,
            rows: planRows,
            createdBy: user?.username ?? "unknown",
            note: note.trim() || undefined,
            share,
          })
        : await api.updateSeasonalPurchasePlan(id, {
            from: from as SeasonMonth,
            to: to as SeasonMonth,
            rows: planRows,
            updatedBy: user?.username ?? "unknown",
            note: note.trim() || undefined,
            share,
          });
    setSaving(false);
    if (!res.ok) {
      setRefusal(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    const saved = planTotals(res.value);
    const dropped = orphanLabels.length;
    const head =
      mode === "create"
        ? `Seasonal purchase plan ${res.value.planRef} saved`
        : `${res.value.planRef} updated`;
    toast.push(
      "ok",
      `${head} — ${formatSeasonMonth(res.value.from)} to ${formatSeasonMonth(res.value.to)}, ` +
        `${formatMt(saved.quantityMt)} planned across ${saved.rows} commodity row(s), ` +
        `${formatNumber(saved.capacityMt)} MT of capacity needed.` +
        (dropped > 0 ? ` Quantities outside the new period were dropped: ${orphanLabels.join(", ")}.` : "") +
        (share
          ? " Marked as shared — the stakeholders to notify are configured in the system later, so no email was sent."
          : ""),
    );
    navigate(`/sourcing/plans/${res.value.id}`);
  }

  const summary = errorList(errors);
  const listTo = "/sourcing/plans";
  const cancelTo = mode === "edit" && existing ? `/sourcing/plans/${existing.id}` : listTo;

  const body = (
    <>
      <PageHeader
        moduleLabel="Sourcing intake"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Sourcing intake", to: "/sourcing" },
          { label: "Seasonal purchase plan", to: listTo },
          ...(mode === "edit" && existing
            ? [{ label: existing.planRef, to: `/sourcing/plans/${existing.id}` }, { label: "Edit" }]
            : [{ label: "New seasonal purchase plan" }]),
        ]}
        title={
          mode === "create" ? "New seasonal purchase plan" : `Edit ${existing?.planRef ?? "seasonal plan"}`
        }
        meta={
          <>
            {mode === "create" ? (
              <>
                {user ? `${user.displayName} · ${user.unit}` : ""} · created {formatDate(TODAY)} · the plan
                reference is issued on save
              </>
            ) : (
              <>
                {user ? `${user.displayName} · ${user.unit}` : ""} · created {formatDate(existing?.createdOn)}{" "}
                by {existing?.createdBy}
                {existing?.updatedOn
                  ? ` · last changed ${formatDate(existing.updatedOn)} by ${existing.updatedBy ?? "unknown"}`
                  : " · not changed since it was created"}
              </>
            )}{" "}
            · workflow v2.3 §6.1, Phase 01 · <strong>[PROPOSED]</strong>
          </>
        }
        recordKey={mode === "create" ? "Phase 01" : (existing?.planRef ?? "Phase 01")}
        recordDate={mode === "create" ? "seasonal purchase plan" : "editing this plan"}
      />

      <div className="page">
        <Banner tone="info" title="The layout of the Plan sheet, with three columns derived">
          The period comes first, as a From month and year and a To month and year — by month and year, not by
          calendar date. COTS then determines the months that fall between the two and presents them in
          chronological order, which is why the month columns below appear once both bounds are set and change
          with them. Add a commodity row and fill across the months. <em>Commodity Group</em> fills itself
          from the commodity you choose, and <em>Total QTY/MT</em> and <em>Capacity needed MT</em> are
          calculated — the latter by the spreadsheet's own formula, the sum of the commodity's three largest
          months.
        </Banner>

        {mode === "create" ? (
          <Banner tone="warn" title="Nothing on this form is required except the period">
            §6.1 defines no validation, no approval and no blocking rule, and asks outright whether the plan
            must be complete before Phase 02. Neither does the Plan sheet. Until that is answered this form
            requires only the period — a blank cell means no quantity planned, exactly as the sheet's{" "}
            <span className="mono">-</span> does, and what is outstanding is reported below rather than
            refused.
          </Banner>
        ) : null}

        {mode === "edit" ? (
          <Banner tone="warn" title="Editing a saved plan is our design, and §6.1 does not describe it">
            The requirement describes saving a plan and says nothing about changing one. Two of its business
            confirmations bear on this screen and neither is answered by it:{" "}
            <em>who may edit a plan once it is saved</em> — so anyone signed in may, and the only thing
            recorded is that a change happened and by whom, with no version history and no approval of the
            change — and <em>what becomes of a saved plan when the seasonal period is afterwards changed</em>,
            which is why narrowing the period below names the quantities it would cost you rather than quietly
            discarding them. Nothing here is required except the period.
          </Banner>
        ) : null}

        {orphanLabels.length > 0 ? (
          <Banner
            tone="risk"
            title={`Quantities in ${orphanLabels.length} month(s) now fall outside the period and will be dropped on save`}
          >
            The period no longer covers {orphanLabels.join(", ")}. Those quantities are still held by this
            form and are <strong>not</strong> saved as they stand — widen the period again and they return to
            the grid untouched; save as it is and they are gone. §6.1 asks what should become of them and
            states no answer, so this screen puts the choice in front of you instead of making it for you.
          </Banner>
        ) : null}

        {refusal ? (
          <Banner tone="risk" title="The service layer refused this plan">
            {refusal}
          </Banner>
        ) : null}

        <form className="stack" onSubmit={(e) => submit(e, false)} noValidate>
          <ErrorSummary
            errors={summary}
            title={
              mode === "create"
                ? "This seasonal purchase plan could not be saved"
                : "These changes could not be saved"
            }
          />
          <RequiredLegend />

          <CollapsibleSection title="Seasonal period" defaultOpen>
            <div className="fields">
              <FormRow
                label="From month"
                htmlFor="spp-from-month"
                required
                error={errors["spp-from-month"]}
                hint="The period is chosen by month and year, not by calendar date."
              >
                <SelectInput
                  id="spp-from-month"
                  value={fromMonth}
                  onChange={setFromMonth}
                  required
                  error={errors["spp-from-month"]}
                  placeholder="Select a month…"
                  options={MONTH_OPTIONS}
                />
              </FormRow>

              <FormRow label="From year" htmlFor="spp-from-year" required>
                <SelectInput
                  id="spp-from-year"
                  value={fromYear}
                  onChange={setFromYear}
                  required
                  placeholder="Select a year…"
                  options={yearOptions(existing ? [existing.from.year, existing.to.year] : [])}
                />
              </FormRow>

              <FormRow label="To month" htmlFor="spp-to-month" required error={errors["spp-to-month"]}>
                <SelectInput
                  id="spp-to-month"
                  value={toMonth}
                  onChange={setToMonth}
                  required
                  error={errors["spp-to-month"]}
                  placeholder="Select a month…"
                  options={MONTH_OPTIONS}
                />
              </FormRow>

              <FormRow label="To year" htmlFor="spp-to-year" required>
                <SelectInput
                  id="spp-to-year"
                  value={toYear}
                  onChange={setToYear}
                  required
                  placeholder="Select a year…"
                  options={yearOptions(existing ? [existing.from.year, existing.to.year] : [])}
                />
              </FormRow>

              <FormRow
                label="Months in the period"
                htmlFor="spp-months"
                behaviour="calculated"
                hint="§6.1 activity 3 — COTS determines the months that fall between the From and To periods and presents them in chronological order. They are the columns of the grid."
              >
                <div id="spp-months" aria-live="polite">
                  {months.length > 0 ? (
                    <strong>
                      {months.length} column(s): {formatSeasonMonth(months[0])} to{" "}
                      {formatSeasonMonth(months[months.length - 1])}
                    </strong>
                  ) : (
                    <span className="muted">
                      {periodBackwards
                        ? "The To period falls before the From period, so the period spans no months."
                        : "Set both bounds and the month columns appear below."}
                    </span>
                  )}
                </div>
              </FormRow>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title={
              months.length > 0
                ? `Purchase plan — ${rows.length} commodity row(s) × ${months.length} month(s)`
                : "Purchase plan"
            }
            defaultOpen
            indicator={
              gaps.duplicatedCommodities.length > 0 ? (
                <StatusChip
                  tone="warn"
                  label={`${gaps.duplicatedCommodities.length} commodity(ies) on more than one row`}
                  size="sm"
                  title="The Plan sheet carries each commodity once. Nothing in §6.1 forbids two rows for the same commodity, so it is permitted and reported rather than refused."
                />
              ) : undefined
            }
          >
            {months.length === 0 ? (
              <p className="muted">
                COTS presents the month columns once the seasonal period is set. Choose the From and To month
                and year above.
              </p>
            ) : (
              <>
                <div className="dtable__scroll plan-grid">
                  <table className="dtable__table">
                    <caption className="sr-only">
                      The purchase plan: one row per commodity, one column per month of the seasonal period
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Commodity Group</th>
                        <th scope="col">Commodity</th>
                        {months.map((m) => (
                          <th scope="col" key={seasonMonthKey(m)} className="text-right">
                            {monthLabel(m)}
                          </th>
                        ))}
                        <th scope="col" className="text-right">
                          Total QTY/MT
                        </th>
                        <th scope="col">Notes</th>
                        <th scope="col" className="text-right">
                          Capacity needed MT
                        </th>
                        <th scope="col">
                          <span className="sr-only">Row actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => {
                        const g = grid.find((x) => x.row.id === `spr-${i + 1}`);
                        const group = commodityGroupOf(r.commodityId);
                        const rowQuantities = monthKeys.map((mk) => parseNumber(r.cells[mk] ?? ""));
                        const rowTotal = sum(rowQuantities.map((q) => q ?? 0));
                        const rowCapacity = capacityNeeded(rowQuantities);
                        return (
                          <tr key={r.key}>
                            <th scope="row">
                              {group ? (
                                <span className="small">{group}</span>
                              ) : (
                                <span className="muted xsmall">from the commodity</span>
                              )}
                            </th>
                            <td>
                              <SelectInput
                                id={`spp-com-${r.key}`}
                                value={r.commodityId}
                                onChange={(v) => setRow(r.key, { commodityId: v })}
                                placeholder="Select a commodity…"
                                options={COMMODITY_OPTIONS}
                              />
                            </td>
                            {monthKeys.map((mk) => (
                              <td key={mk}>
                                <TextInput
                                  id={`spp-cell-${r.key}-${mk}`}
                                  value={r.cells[mk] ?? ""}
                                  onChange={(v) => setCell(r.key, mk, v)}
                                  error={errors[`spp-cell-${r.key}-${mk}`]}
                                  inputMode="decimal"
                                  placeholder="–"
                                />
                              </td>
                            ))}
                            <td className="text-right">
                              <strong>{rowTotal > 0 ? formatMt(rowTotal) : "–"}</strong>
                            </td>
                            <td>
                              <TextInput
                                id={`spp-rownote-${r.key}`}
                                value={r.note}
                                onChange={(v) => setRow(r.key, { note: v })}
                                placeholder="e.g. PZU"
                              />
                            </td>
                            <td className="text-right">
                              <strong>{rowCapacity > 0 ? formatNumber(rowCapacity) : "–"}</strong>
                              {g && rowCapacity > 0 ? (
                                <>
                                  <br />
                                  <span className="xsmall muted">3 peak months</span>
                                </>
                              ) : null}
                            </td>
                            <td>
                              {rows.length > 1 ? (
                                <button
                                  type="button"
                                  className="btn btn--sm"
                                  onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                                >
                                  Remove
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        {/* Two cells, to line up with the two frozen columns. */}
                        <th scope="row">Total</th>
                        <td />
                        {totals.perMonth.map((v, i) => (
                          <td key={monthKeys[i]} className="text-right">
                            <strong>{v > 0 ? formatNumber(v) : "–"}</strong>
                          </td>
                        ))}
                        <td className="text-right">
                          <strong>{formatMt(totals.totalMt)}</strong>
                        </td>
                        <td />
                        <td className="text-right">
                          <strong>{formatNumber(totals.capacityMt)}</strong>
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div style={{ marginTop: "0.75rem" }}>
                  <button type="button" className="btn" onClick={addRow}>
                    Add a commodity row
                  </button>
                </div>

                <div style={{ marginTop: "1rem" }} />
                <FieldGrid
                  columns={3}
                  fields={[
                    {
                      label: "Months with nothing planned",
                      value:
                        gaps.monthsWithNoQuantity.length === 0
                          ? "none"
                          : gaps.monthsWithNoQuantity.map((m) => formatSeasonMonth(m)).join(", "),
                      hint: "Permitted — the Plan sheet's own October column is empty on every row.",
                    },
                    {
                      label: "Rows still incomplete",
                      value: formatNumber(
                        gaps.rowsWithoutCommodity + gaps.rowsWithNoQuantity + gaps.rowsWithoutNote,
                      ),
                      hint: "Rows with no commodity, no quantity anywhere, or no note. Reported, not refused.",
                    },
                    {
                      label: "Capacity needed across the plan",
                      value: <strong>{formatNumber(planned.capacityMt)} MT</strong>,
                      behaviour: "calculated",
                      hint: "The sum of each commodity row's own three-peak-month figure — the sheet's =SUM(N19:N29), not the formula re-applied to the monthly totals.",
                    },
                  ]}
                />
                <p className="small muted" style={{ marginTop: "0.5rem" }}>
                  <strong>Where this departs from §6.1, and why.</strong> The workflow text has the planner
                  enter "the commodity, the quantity in MT and the capacity needed" for each month.{" "}
                  <em>Export Plan V1.xlsx</em> does not: capacity is a formula over the commodity's whole row
                  — <span className="mono">=LARGE(row,1)+LARGE(row,2)+LARGE(row,3)</span> — and the sheet
                  carries a <em>Notes</em> column that the workflow text never mentions. The sheet is the
                  later and more specific evidence, so the capacity field has been removed from entry and the
                  note added. What capacity is measured against is still not stated anywhere, and is still
                  open.
                </p>
              </>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Plan notes" defaultOpen={false}>
            <FormRow
              label="Notes on the plan as a whole"
              htmlFor="spp-note"
              error={errors["spp-note"]}
              hint="Separate from the per-commodity Notes column in the grid, which the sheet uses as a location."
            >
              <TextArea id="spp-note" value={note} onChange={setNote} rows={3} error={errors["spp-note"]} />
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
            <Link className="btn" to={cancelTo}>
              Cancel
            </Link>
            <p className="muted small">
              {summary.length > 0
                ? `${summary.length} field${summary.length === 1 ? "" : "s"} need attention.`
                : "Save records the plan. Save & share records it and marks it for notification — the stakeholders to notify are configured in the system later, so this prototype sends no email and names no recipient."}
            </p>
          </FormActions>
        </form>
      </div>
    </>
  );

  if (mode === "create") return body;
  return (
    <EditGate
      // `!hydrated` only counts as loading while a record actually exists — otherwise an
      // id that matches nothing never hydrates and the screen spins for ever instead of
      // saying so.
      loading={plan.loading || (Boolean(existing) && !hydrated)}
      error={plan.error}
      reload={plan.reload}
      missing={!plan.loading && !existing}
      missingTitle="Seasonal purchase plan not found"
      backTo={listTo}
      backLabel="Back to seasonal purchase plans"
    >
      {body}
    </EditGate>
  );
}

/* ================================================================== *
 * 2 — Budget · /sourcing/budgets/new
 *            · /sourcing/budgets/:id/edit
 *
 * A business instruction of 27 August 2026 narrows this screen in three ways,
 * and they are the first *stated* rules the budget has been given:
 *   · the Plan drop-down offers **only active plans** — which needed a
 *     definition, because §6.1 states that no status model is defined for a
 *     plan. The reading, stated on the screen: a plan is active while its
 *     seasonal period has not ended;
 *   · a budget line names a **commodity**;
 *   · the Commodity drop-down offers **only the commodities the selected plan
 *     carries**, so it fills from the plan and empties when the plan changes.
 *
 * The Edit screen departs from the first in one place, deliberately: a saved
 * line may name a plan whose season has since closed, so the drop-down keeps
 * offering that plan, marked closed. Dropping it would silently strip the line.
 * ================================================================== */

/**
 * One drafted budget line.
 *
 * `seasonalPlanId` is gone from here as of the instruction of 3 September 2026: a budget
 * is written against **one** plan, chosen above the budget period, and every line belongs
 * to that plan. The line grid therefore carries the commodity and no plan of its own —
 * and, with the plan the same on every line, the *Planned on the plan* column that used
 * to sit beside it goes too, because it read from the line's plan.
 */
interface DraftBudgetRow {
  key: string;
  commodityId: string;
  quantityMt: string;
  amount: string;
  currency: CurrencyCode;
  supplierId: string;
}

function emptyBudgetRow(key: string): DraftBudgetRow {
  return {
    key,
    commodityId: "",
    quantityMt: "",
    amount: "",
    currency: "USD",
    supplierId: "",
  };
}

export function BudgetForm({ mode }: { mode: FormMode }) {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const plans = useAsync(() => api.listSeasonalPurchasePlans());
  const budgets = useAsync(() => api.listBudgets());
  const budget = useAsync(
    () => (mode === "edit" ? api.getBudget(id) : Promise.resolve(undefined)),
    [id, mode],
  );
  const existing = mode === "edit" ? budget.data : undefined;

  /* The one plan the budget is written against — above the period, as of 3 September 2026. */
  const [seasonalPlanId, setSeasonalPlanId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  /* Issued Payment Amount — Edit screen only, as the instruction places it. */
  const [issuedPayment, setIssuedPayment] = useState("");
  const [issuedCurrency, setIssuedCurrency] = useState<CurrencyCode>("SDG");
  /* Payment Date, added 3 September 2026 — and the date the conversion reads its rate on. */
  const [issuedPaymentDate, setIssuedPaymentDate] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<DraftBudgetRow[]>([emptyBudgetRow("bgl-new-1")]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const [saving, setSaving] = useState<false | "save" | "share">(false);
  const [hydrated, setHydrated] = useState(mode === "create");
  const nextKey = useRef(0);

  useEffect(() => {
    if (mode !== "edit" || !existing || hydrated) return;
    /* The budget's own plan where it has one; otherwise the plan its lines name, which is
       where the field lived before 3 September 2026. */
    setSeasonalPlanId(budgetPlanId(existing) ?? "");
    setFromDate(existing.fromDate);
    setToDate(existing.toDate);
    setIssuedPayment(
      existing.issuedPaymentLocal === undefined ? "" : String(existing.issuedPaymentLocal),
    );
    setIssuedCurrency(existing.issuedPaymentCurrency ?? "SDG");
    setIssuedPaymentDate(existing.issuedPaymentDate ?? "");
    setApprovalStatus(existing.approvalStatus ?? "");
    setNote(existing.note ?? "");
    setRows(
      existing.lines.length > 0
        ? existing.lines.map((l) => ({
            key: `saved-${l.id}`,
            commodityId: l.commodityId ?? "",
            quantityMt: l.quantityMt === undefined ? "" : String(l.quantityMt),
            amount: l.amount ? String(l.amount.amount) : "",
            currency: l.amount?.currency ?? "USD",
            supplierId: l.supplierId ?? "",
          }))
        : [emptyBudgetRow("bgl-new-1")],
    );
    setHydrated(true);
  }, [mode, existing, hydrated]);

  const allPlans = plans.data ?? [];

  /**
   * The Plan drop-down. Active plans, plus — on the edit screen only — any plan this
   * budget already names even if its season has closed, so a saved line keeps its plan.
   */
  const grandfathered = useMemo(
    () =>
      new Set(
        [
          existing?.seasonalPlanId,
          ...(existing?.lines ?? []).map((l) => l.seasonalPlanId),
        ].filter((x): x is string => Boolean(x)),
      ),
    [existing],
  );
  // Not memoised: `allPlans` comes from a fresh array each render, so a dependency list
  // on it would be either wrong or useless. The filter is over a handful of records.
  const offeredPlans = allPlans.filter((p) => isPlanActive(p) || grandfathered.has(p.id));
  const planOptions = offeredPlans.map((p) => {
    const closed = !isPlanActive(p);
    return {
      value: p.id,
      label:
        `${p.planRef} — ${formatSeasonMonth(p.from)} to ${formatSeasonMonth(p.to)}` +
        ` (${formatMt(planTotals(p).quantityMt)} planned, ${planCommodities(p).length} commodity(ies))` +
        (closed ? " · CLOSED — already on this budget" : ""),
    };
  });
  /** Active plans the screen is hiding nothing from — used to explain an empty list. */
  const excludedPlans = allPlans.filter((p) => !offeredPlans.some((o) => o.id === p.id));

  const planById = (pid: string) => allPlans.find((p) => p.id === pid);
  const statusesInUse = approvalStatusesInUse([...(budgets.data ?? []), ...(existing ? [existing] : [])]);

  function setRow(key: string, patch: Partial<DraftBudgetRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  /**
   * Changing the budget's plan clears, on every line, a commodity the new plan does not
   * carry. Leaving a stale selection in place would show a commodity that is not on the
   * plan, and the service layer would refuse the save with a message the user could not
   * act on. This used to be a per-line operation; now the plan is the budget's, so
   * changing it reaches every line at once and the screen says which commodities it
   * cleared rather than emptying the grid quietly.
   */
  function setBudgetPlan(planId: string) {
    setSeasonalPlanId(planId);
    const p = allPlans.find((x) => x.id === planId);
    setRows((prev) =>
      prev.map((r) => {
        const keep = Boolean(r.commodityId && p && planCarriesCommodity(p, r.commodityId));
        return keep ? r : { ...r, commodityId: "" };
      }),
    );
  }

  function addRow() {
    nextKey.current += 1;
    setRows((prev) => [...prev, emptyBudgetRow(`bgl-added-${nextKey.current}`)]);
  }

  /**
   * The lines as they will be saved.
   *
   * Every line carries the **budget's** plan. The line still holds a `seasonalPlanId`
   * because every derivation and every service check reads it, but it is no longer an
   * input — it is written from the field above the period, so a saved budget's lines can
   * never name a plan the budget does not.
   */
  const lines: BudgetLine[] = rows
    .filter((r) => r.commodityId || r.quantityMt.trim() || r.amount.trim() || r.supplierId)
    .map((r, i) => {
      const amt = parseNumber(r.amount);
      return {
        id: `bgl-${i + 1}`,
        seasonalPlanId: seasonalPlanId || undefined,
        commodityId: r.commodityId || undefined,
        quantityMt: parseNumber(r.quantityMt),
        amount: amt === undefined ? undefined : money(amt, r.currency),
        supplierId: r.supplierId || undefined,
      };
    });

  const draft: Pick<Budget, "fromDate" | "toDate" | "lines" | "approvalStatus"> = {
    fromDate,
    toDate,
    lines,
    approvalStatus,
  };
  const totals = budgetTotals(draft);
  const gaps = budgetGaps(draft);
  const selectedPlan = allPlans.find((p) => p.id === seasonalPlanId);
  const planCommodityList = selectedPlan ? planCommodities(selectedPlan) : [];
  /**
   * The plans a saved budget's lines name that this budget's own plan is not.
   *
   * Only ever non-empty on a record saved before one plan per budget was the rule. Saving
   * rewrites those lines to the plan above, so the screen says so first.
   */
  const displacedPlans = existing
    ? budgetPlanConflict({ ...existing, seasonalPlanId: seasonalPlanId || undefined })
        .map((pid) => allPlans.find((p) => p.id === pid))
        .filter((p): p is SeasonalPurchasePlan => Boolean(p))
    : [];

  /* The issued payment amount and its read-only conversion — Edit screen only. */
  const issued = parseNumber(issuedPayment);
  const issuedDraft = {
    toDate,
    issuedPaymentLocal: issued,
    issuedPaymentCurrency: issuedCurrency,
    issuedPaymentDate: issuedPaymentDate || undefined,
  };
  const issuedRate = budgetIssuedPaymentRate(issuedDraft);
  const issuedUsd = budgetIssuedPaymentUsd(issuedDraft);
  /* Which date the rate was read on — the payment date, or the period end as a fallback. */
  const issuedRateBasis = budgetIssuedPaymentRateBasis(issuedDraft);
  const issuedRateDate = issuedPaymentDate || toDate;
  const issuedCoverage = fxCoverage(issuedCurrency);

  /**
   * The comparison §6.2 raises and does not settle, per commodity of the one plan this
   * budget is written against. Computed on every render rather than memoised: `lines` is
   * derived from the form's own state and so is a new array each time.
   */
  const fits = (selectedPlan ? [selectedPlan] : []).map((x) => ({
    plan: x,
    fit: periodFit(fromDate || undefined, toDate || undefined, x),
    byCommodity: budgetByCommodity({ lines }, x).filter((c) => c.budgetedMt !== 0 || c.plannedMt !== 0),
  }));

  /** On the edit screen, what the approval status was before this edit. */
  const statusChanged =
    mode === "edit" && existing ? (existing.approvalStatus ?? "") !== approvalStatus.trim() : false;

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!fromDate) next["bg-from"] = "Define the From date of the budget period.";
    if (!toDate) next["bg-to"] = "Define the To date of the budget period.";
    if (fromDate && toDate && toDate < fromDate) {
      next["bg-to"] = "The To date cannot fall before the From date.";
    }
    if (lines.length === 0) {
      next[`bg-com-${rows[0]?.key ?? "bgl-new-1"}`] =
        "A budget records at least one line — the commodity, the quantity, the amount and the supplier.";
    }
    if (issuedPayment.trim() && issued === undefined) {
      next["bg-issued"] = "The issued payment amount is not a number.";
    } else if (issued !== undefined && issued < 0) {
      next["bg-issued"] = "The issued payment amount cannot be negative.";
    } else if (issued !== undefined && issuedCurrency !== "USD" && !issuedRate) {
      next[issuedPaymentDate ? "bg-issued-date" : "bg-issued"] =
        `No exchange rate is held for ${issuedCurrency} on ${formatDate(issuedRateDate) || "that date"}. ` +
        `The rate table runs from ${formatDate(issuedCoverage.from)}, and the USD conversion is read from it on ` +
        `${issuedPaymentDate ? "the payment date" : "the To date of the budget period, this budget recording no payment date"}.`;
    }
    if (issuedPaymentDate && fromDate && issuedPaymentDate < fromDate) {
      /* Reported as an error rather than refused by the service: a payment before the
         period it belongs to is far more likely a typo than a business event, and the
         message says which two dates disagree. Nothing downstream depends on it. */
      next["bg-issued-date"] =
        `The payment date ${formatDate(issuedPaymentDate)} falls before the budget period begins on ${formatDate(fromDate)}.`;
    }
    if (issuedPaymentDate && !issued) {
      next["bg-issued"] =
        "A payment date is recorded with no issued payment amount. Enter the amount, or clear the date.";
    }
    for (const r of rows) {
      // The one stated rule this form can check before the service layer does. The plan
      // is the budget's now, so the check is against that one plan rather than the row's.
      if (r.commodityId && selectedPlan && !planCarriesCommodity(selectedPlan, r.commodityId)) {
        next[`bg-com-${r.key}`] = `${commodityName(r.commodityId)} is not on ${selectedPlan.planRef}.`;
      }
      const q = parseNumber(r.quantityMt);
      const a = parseNumber(r.amount);
      if (r.quantityMt.trim() && q === undefined) {
        next[`bg-qty-${r.key}`] = "The quantity is not a number.";
      } else if (q !== undefined && q < 0) {
        next[`bg-qty-${r.key}`] = "The quantity cannot be negative.";
      }
      if (r.amount.trim() && a === undefined) {
        next[`bg-amt-${r.key}`] = "The amount is not a number.";
      } else if (a !== undefined && a < 0) {
        next[`bg-amt-${r.key}`] = "The amount cannot be negative.";
      }
    }
    if (note.length > NOTE_LIMIT) {
      next["bg-note"] = `The note is limited to ${NOTE_LIMIT} characters; this one is ${note.length}.`;
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
        ? await api.createBudget({
            seasonalPlanId: seasonalPlanId || undefined,
            fromDate,
            toDate,
            lines,
            approvalStatus: approvalStatus.trim() || undefined,
            createdBy: user?.username ?? "unknown",
            note: note.trim() || undefined,
            share,
          })
        : await api.updateBudget(id, {
            seasonalPlanId: seasonalPlanId || undefined,
            fromDate,
            toDate,
            lines,
            /* The issued payment amount is stored; its USD conversion is not — that is
               read from the FX master, which is what makes it read only on the screen. */
            issuedPaymentLocal: issued,
            issuedPaymentCurrency: issued === undefined ? undefined : issuedCurrency,
            issuedPaymentDate: issued === undefined ? undefined : issuedPaymentDate || undefined,
            approvalStatus: approvalStatus.trim() || undefined,
            updatedBy: user?.username ?? "unknown",
            note: note.trim() || undefined,
            share,
          });
    setSaving(false);
    if (!res.ok) {
      setRefusal(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    const saved = budgetTotals(res.value);
    const amountText = saved.amounts.map((m) => formatMoney(m)).join(" + ") || "no amount";
    const head = mode === "create" ? `Budget ${res.value.budgetRef} saved` : `${res.value.budgetRef} updated`;
    toast.push(
      "ok",
      `${head} — ${formatMt(saved.quantityMt)} and ${amountText} across ${res.value.lines.length} line(s), ` +
        `${saved.commodities} commodity(ies) on ${saved.plans} plan(s).` +
        (mode === "create" ? " Phase 03 is funds." : "") +
        (statusChanged
          ? ` Approval status is now ${res.value.approvalStatus ? `“${res.value.approvalStatus}”` : "blank"} — which changes nothing downstream.`
          : "") +
        (share
          ? " Marked as shared — the stakeholders to notify are configured in the system later, so no email was sent."
          : ""),
    );
    navigate(`/sourcing/budgets/${res.value.id}`);
  }

  const summary = errorList(errors);
  const listTo = "/sourcing/budgets";
  const cancelTo = mode === "edit" && existing ? `/sourcing/budgets/${existing.id}` : listTo;

  const body = (
    <>
      <PageHeader
        moduleLabel="Sourcing intake"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Sourcing intake", to: "/sourcing" },
          { label: "Budget", to: listTo },
          ...(mode === "edit" && existing
            ? [{ label: existing.budgetRef, to: `/sourcing/budgets/${existing.id}` }, { label: "Edit" }]
            : [{ label: "New budget" }]),
        ]}
        title={mode === "create" ? "New budget" : `Edit ${existing?.budgetRef ?? "budget"}`}
        meta={
          <>
            {mode === "create" ? (
              <>
                {user ? `${user.displayName} · ${user.unit}` : ""} · created {formatDate(TODAY)} · the budget
                reference is issued on save
              </>
            ) : (
              <>
                {user ? `${user.displayName} · ${user.unit}` : ""} · created {formatDate(existing?.createdOn)}{" "}
                by {existing?.createdBy}
                {existing?.updatedOn
                  ? ` · last changed ${formatDate(existing.updatedOn)} by ${existing.updatedBy ?? "unknown"}`
                  : " · not changed since it was created"}
              </>
            )}{" "}
            · workflow v2.3 §6.2, Phase 02 · <strong>[PROPOSED]</strong>
          </>
        }
        recordKey={mode === "create" ? "Phase 02" : (existing?.budgetRef ?? "Phase 02")}
        recordDate={mode === "create" ? "budget" : "editing this budget"}
      />

      <div className="page">
        <Banner tone="info" title="How this screen follows §6.2, and the two instructions that narrow it">
          <strong>The Plan now comes first.</strong> The instruction of 3 September 2026 moves it above the
          budget period — <em>Plan, then From date, then To date</em> — because a budget is written against{" "}
          <strong>one</strong> plan and carries a line per commodity beneath it. So the plan is no longer a
          column of the line grid: it is chosen once, at the top, and every line belongs to it.
          <br />
          <br />
          Below it the budget period, as a From date and a To date — dates here, where{" "}
          <Link to="/sourcing/plans">the seasonal period of §6.1</Link> is a month and a year. That difference
          is the requirement's own. Then the budget information, one line at a time: the{" "}
          <strong>commodity</strong>, the quantity in MT, the amount and the supplier. The Commodity list is
          still filled from the plan and still offers only the commodities that plan carries — the cascade is
          unchanged, it simply reads from one plan instead of one per line. The approval status is recorded
          last, as the requirement sequences it.
        </Banner>

        <Banner tone="warn" title="“Active plan” is a reading, because §6.1 defines no status for a plan">
          The instruction says the Plan list shows only active plans. §6.1 states in as many words that{" "}
          <em>no status model is defined</em> for a seasonal purchase plan, so there is no flag to read. The
          reading taken here is the least presumptuous one:{" "}
          <strong>a plan is active while its seasonal period has not ended</strong> — a season still to start
          is active, because that is the season a budget is written for, and a season whose last month has
          passed is closed.{" "}
          {excludedPlans.length > 0 ? (
            <>
              {excludedPlans.length} plan(s) are hidden on that basis:{" "}
              {excludedPlans.map((p, i) => (
                <span key={p.id}>
                  {i > 0 ? ", " : ""}
                  <span className="mono">{p.planRef}</span> (ended {formatSeasonMonth(p.to)})
                </span>
              ))}
              .
            </>
          ) : (
            <>No plan is hidden on that basis today.</>
          )}{" "}
          If the business means an explicit flag, an approval, or one active plan per country, that is one
          definition to change — it is recorded as an open question on every budget's own view.
        </Banner>

        <Banner tone="warn" title="The approval status is stored and nothing more">
          The instruction of 26 August 2026 names the field and states no values, no owner and no effect. So
          it is free text rather than a list, no value is treated as meaning approved, no sequence between
          values is enforced, and nothing downstream is gated on it.{" "}
          {statusesInUse.length > 0 ? (
            <>
              The values already in the data are{" "}
              {statusesInUse.map((s, i) => (
                <span key={s}>
                  {i > 0 ? ", " : ""}
                  <em>{s}</em>
                </span>
              ))}
              , offered below only as a convenience.
            </>
          ) : null}
        </Banner>

        {mode === "edit" ? (
          <Banner tone="warn" title="Editing a saved budget is our design, and §6.2 does not describe it">
            The requirement describes saving a budget and says nothing about changing one. Three of its
            business confirmations bear on this screen and none is answered by it:{" "}
            <em>who may edit a budget once it is saved</em>,{" "}
            <em>what becomes of a saved budget when the period or the plan is afterwards changed</em>, and{" "}
            <em>who approves a budget</em>. So anyone signed in may edit any field including the approval
            status; changing that status is an ordinary edit rather than a transition, clearing it back to
            blank is allowed, and nothing is versioned or re-approved.
            {grandfathered.size > 0 &&
            [...grandfathered].some((pid) => {
              const p = planById(pid);
              return p && !isPlanActive(p);
            }) ? (
              <>
                {" "}
                This budget already names a plan whose season has closed, so the Plan list still offers it,
                marked <strong>CLOSED</strong>. Hiding it would strip the plan off a saved line without saying
                so.
              </>
            ) : null}
          </Banner>
        ) : null}

        {refusal ? (
          <Banner tone="risk" title="The service layer refused this budget">
            {refusal}
          </Banner>
        ) : null}

        <form className="stack" onSubmit={(e) => submit(e, false)} noValidate>
          <ErrorSummary
            errors={summary}
            title={mode === "create" ? "This budget could not be saved" : "These changes could not be saved"}
          />
          <RequiredLegend />

          <CollapsibleSection title="Plan" defaultOpen>
            {planOptions.length === 0 ? (
              <Banner tone="risk" title="No plan is available to budget against">
                Every seasonal purchase plan held has a season that has already ended, so none is active.{" "}
                <Link to="/sourcing/plans/new">Create a seasonal purchase plan</Link> for the coming season
                first — a budget is written against one.
              </Banner>
            ) : null}

            <div className="fields">
              <FormRow
                label="Plan"
                htmlFor="bg-plan"
                error={errors["bg-plan"]}
                hint="One plan for the whole budget, chosen before the period. Active plans only. Every budget line below is written against it, and the Commodity list on each line offers only the commodities this plan carries."
              >
                <SelectInput
                  id="bg-plan"
                  value={seasonalPlanId}
                  onChange={setBudgetPlan}
                  error={errors["bg-plan"]}
                  placeholder="Select an active plan…"
                  options={planOptions}
                />
              </FormRow>
            </div>

            {selectedPlan ? (
              <FieldGrid
                columns={3}
                fields={[
                  {
                    label: "Seasonal period",
                    value: `${formatSeasonMonth(selectedPlan.from)} – ${formatSeasonMonth(selectedPlan.to)}`,
                    behaviour: "readonly",
                  },
                  {
                    label: "Planned on the plan",
                    value: formatMt(planTotals(selectedPlan).quantityMt),
                    behaviour: "readonly",
                    hint: "Read from the plan. This is the figure the per-commodity comparison further down is read against — it used to be a column of the line grid, and the instruction of 3 September 2026 removes that column.",
                  },
                  {
                    label: "Commodities it carries",
                    value: `${formatNumber(planCommodityList.length)} commodity(ies)`,
                    behaviour: "readonly",
                  },
                ]}
              />
            ) : null}

            {displacedPlans.length > 0 ? (
              <Banner tone="warn" title="This saved budget names more than one plan, and saving will change that">
                {existing?.budgetRef} was saved before a budget was one plan, and its lines name{" "}
                {displacedPlans.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 ? ", " : ""}
                    <span className="mono">{p.planRef}</span>
                  </span>
                ))}{" "}
                as well as the plan chosen above. Saving writes the plan above to{" "}
                <strong>every line</strong>. Nothing is deleted and no quantity changes — but the budget will
                afterwards be against one plan, which is what the instruction of 3 September 2026 asks for.
                This is said here rather than done quietly, because it is the one thing on this screen that
                changes a saved record without the user having typed it.
                <br />
                <br />
                One consequence has to be dealt with by hand, and the screen will not do it for you: a line
                whose commodity the plan above does <strong>not</strong> carry cannot move onto it, because a
                budget line may only name a commodity its plan carries. Such a line is flagged in the grid
                below and the save is refused until its commodity is changed or the line is removed. Dropping
                the commodity to make the plan fit would lose a figure somebody entered.
              </Banner>
            ) : null}

            <p className="small muted" style={{ marginTop: "0.5rem" }}>
              <strong>"Active plan" is still a reading.</strong> §6.1 states in as many words that{" "}
              <em>no status model is defined</em> for a seasonal purchase plan, so there is no flag to read.
              The reading is the least presumptuous one — a plan is active while its seasonal period has not
              ended.{" "}
              {excludedPlans.length > 0 ? (
                <>
                  {excludedPlans.length} plan(s) are hidden on that basis:{" "}
                  {excludedPlans.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 ? ", " : ""}
                      <span className="mono">{p.planRef}</span> (ended {formatSeasonMonth(p.to)})
                    </span>
                  ))}
                  .
                </>
              ) : (
                <>No plan is hidden on that basis today.</>
              )}
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="Budget period" defaultOpen>
            <div className="fields">
              <FormRow
                label="From date"
                htmlFor="bg-from"
                required
                error={errors["bg-from"]}
                hint="A calendar date. §6.2 gives the budget period as dates, unlike the seasonal period of §6.1."
              >
                <TextInput
                  id="bg-from"
                  type="date"
                  value={fromDate}
                  onChange={setFromDate}
                  required
                  error={errors["bg-from"]}
                />
              </FormRow>

              <FormRow label="To date" htmlFor="bg-to" required error={errors["bg-to"]}>
                <TextInput
                  id="bg-to"
                  type="date"
                  value={toDate}
                  onChange={setToDate}
                  required
                  error={errors["bg-to"]}
                />
              </FormRow>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={`Budget information — ${rows.length} line(s)`} defaultOpen>
            <div className="dtable__scroll">
              <table className="dtable__table">
                <caption className="sr-only">
                  Budget lines: the commodity, the quantity in MT, the amount and the supplier. The plan is
                  the budget's own and is chosen above the period.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Commodity</th>
                    <th scope="col">Quantity (MT)</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Currency</th>
                    <th scope="col">Supplier</th>
                    <th scope="col">
                      <span className="sr-only">Row actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    return (
                      <tr key={r.key}>
                        <td>
                          <SelectInput
                            id={`bg-com-${r.key}`}
                            value={r.commodityId}
                            onChange={(v) => setRow(r.key, { commodityId: v })}
                            error={errors[`bg-com-${r.key}`]}
                            disabled={!selectedPlan}
                            placeholder={selectedPlan ? "Select a commodity…" : "Choose the plan above first"}
                            options={planCommodityList.map((c) => ({
                              value: c.commodityId,
                              label: `${c.name}${c.group ? ` — ${c.group}` : ""} (${formatMt(c.plannedMt)} planned)`,
                            }))}
                          />
                          {selectedPlan && planCommodityList.length === 0 ? (
                            <p className="xsmall muted">
                              {selectedPlan.planRef} carries no commodity yet — nothing to budget against.
                            </p>
                          ) : null}
                        </td>
                        <td>
                          <TextInput
                            id={`bg-qty-${r.key}`}
                            value={r.quantityMt}
                            onChange={(v) => setRow(r.key, { quantityMt: v })}
                            error={errors[`bg-qty-${r.key}`]}
                            inputMode="decimal"
                            placeholder="–"
                          />
                        </td>
                        <td>
                          <TextInput
                            id={`bg-amt-${r.key}`}
                            value={r.amount}
                            onChange={(v) => setRow(r.key, { amount: v })}
                            error={errors[`bg-amt-${r.key}`]}
                            inputMode="decimal"
                            placeholder="–"
                          />
                        </td>
                        <td>
                          <SelectInput
                            id={`bg-cur-${r.key}`}
                            value={r.currency}
                            onChange={(v) => setRow(r.key, { currency: v })}
                            options={CURRENCY_OPTIONS}
                          />
                        </td>
                        <td>
                          <SelectInput
                            id={`bg-sup-${r.key}`}
                            value={r.supplierId}
                            onChange={(v) => setRow(r.key, { supplierId: v })}
                            placeholder="Select a supplier…"
                            options={SUPPLIER_OPTIONS}
                          />
                        </td>
                        <td>
                          {rows.length > 1 ? (
                            <button
                              type="button"
                              className="btn btn--sm"
                              onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                            >
                              Remove
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">{formatNumber(totals.commodities)} commodity(ies)</th>
                    <td>
                      <strong>{formatMt(totals.quantityMt)}</strong>
                    </td>
                    <td colSpan={2}>
                      <strong>
                        {totals.amounts.length > 0
                          ? totals.amounts.map((m) => formatMoney(m)).join(" + ")
                          : "–"}
                      </strong>
                    </td>
                    <td>{formatNumber(totals.suppliers)} supplier(s)</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style={{ marginTop: "0.75rem" }}>
              <button type="button" className="btn" onClick={addRow}>
                Add a budget line
              </button>
            </div>

            <p className="small muted" style={{ marginTop: "0.5rem" }}>
              <strong>Two columns have gone from this grid</strong>, both by the instruction of 3 September
              2026. <em>Plan</em> has gone because there is one plan for the budget and it is chosen above the
              period — a column that held the same value on every row was a column asking to disagree with
              itself. <em>Planned on the plan</em> has gone with it: it read from the line's plan, and the
              figure it showed is now on the Plan card above, where it is stated once. The comparison it
              existed for is still made, per commodity, in{" "}
              <em>Against the plan named</em> further down — that is where the planned quantity is read
              against the budgeted one.
              <br />
              <br />
              The <em>Commodity</em> list still offers only the commodities the plan carries — stated by the
              instruction of 27 August 2026, and enforced by the service layer as well as by the drop-down,
              so changing the plan cannot leave a commodity behind that does not belong to it. More than one
              line is permitted — §6.2 asks whether the budget is one line or several and does not answer, and
              the instruction of 3 September 2026 answers it for the commodity: <em>one plan, and a budget
              per commodity under it</em>. Amounts are totalled per currency, never added across currencies.
            </p>
          </CollapsibleSection>

          {fits.length > 0 ? (
            <CollapsibleSection title="Against the plan named" defaultOpen>
              {fits.map((f) => (
                <div key={f.plan.id} style={{ marginBottom: "1rem" }}>
                  <FieldGrid
                    fields={[
                      { label: "Plan", value: f.plan.planRef },
                      {
                        label: "Seasonal period",
                        value: `${formatSeasonMonth(f.plan.from)} – ${formatSeasonMonth(f.plan.to)}`,
                      },
                      {
                        label: "Budget period against it",
                        value: (
                          <StatusChip
                            tone={f.fit === "inside" ? "ok" : "warn"}
                            label={f.fit}
                            size="sm"
                            title="Whether the budget period must fall inside the seasonal period is a business confirmation §6.2 raises and does not answer. Nothing is refused on this."
                          />
                        ),
                        behaviour: "calculated",
                      },
                      {
                        label: "Plan status",
                        value: (
                          <StatusChip
                            tone={isPlanActive(f.plan) ? "ok" : "idle"}
                            label={isPlanActive(f.plan) ? "active" : "closed"}
                            size="sm"
                          />
                        ),
                        behaviour: "calculated",
                      },
                    ]}
                  />
                  <div className="dtable__scroll">
                    <table className="dtable__table">
                      <caption className="sr-only">
                        Budgeted against planned, per commodity, for {f.plan.planRef}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Commodity</th>
                          <th scope="col" className="text-right">
                            Budgeted
                          </th>
                          <th scope="col" className="text-right">
                            Planned
                          </th>
                          <th scope="col" className="text-right">
                            Variance
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {f.byCommodity.map((c) => (
                          <tr key={c.commodityId}>
                            <th scope="row">{c.name}</th>
                            <td className="text-right">{formatMt(c.budgetedMt)}</td>
                            <td className="text-right">{formatMt(c.plannedMt)}</td>
                            <td className="text-right">
                              <strong>
                                {c.varianceMt > 0 ? "+" : ""}
                                {formatMt(c.varianceMt)}
                              </strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              <p className="small muted">
                Now that a line names a commodity, the comparison can be made at the level the plan is written
                at. It is still shown and not enforced: §6.2 asks whether the budget quantity must reconcile
                with the quantity planned and does not answer. A commodity the plan carries but this budget
                does not mention appears with a zero, because a gap is the interesting case.
              </p>
            </CollapsibleSection>
          ) : null}

          {mode === "edit" ? (
            <CollapsibleSection title="Issued payment" defaultOpen>
              <div className="fields">
                <FormRow
                  label="Issued payment amount"
                  htmlFor="bg-issued"
                  error={errors["bg-issued"]}
                  hint="In the local currency, as it was issued. Added to this screen by the instruction of 3 September 2026; it is not on the Add screen, because nothing has been issued against a budget that has just been written."
                >
                  <TextInput
                    id="bg-issued"
                    value={issuedPayment}
                    onChange={setIssuedPayment}
                    error={errors["bg-issued"]}
                    inputMode="decimal"
                    placeholder="–"
                  />
                </FormRow>

                {/* Payment Date, added 3 September 2026, immediately after the amount —
                    and it is the field that decides which rate the conversion reads. */}
                <FormRow
                  label="Payment date"
                  htmlFor="bg-issued-date"
                  error={errors["bg-issued-date"]}
                  hint="The date the issued payment was made. Recording it is what gives the conversion below a rate of its own: it is read on this date, exactly as a fund's is read on its actual payment date."
                >
                  <TextInput
                    id="bg-issued-date"
                    type="date"
                    value={issuedPaymentDate}
                    onChange={setIssuedPaymentDate}
                    error={errors["bg-issued-date"]}
                  />
                </FormRow>

                <FormRow
                  label="Local currency"
                  htmlFor="bg-issued-cur"
                  hint="Which local currency the amount above is held in. The USD conversion reads this currency's rate."
                >
                  <SelectInput
                    id="bg-issued-cur"
                    value={issuedCurrency}
                    onChange={setIssuedCurrency}
                    options={CURRENCY_OPTIONS}
                  />
                </FormRow>

                <FormRow
                  label="Exchange rate"
                  htmlFor="bg-issued-rate"
                  behaviour="readonly"
                  hint="Read only, from the master data. The rate in force for this currency on the payment date above — never typed, and not stored on the budget. Where no payment date is recorded it is read on the To date of the budget period instead, which is what a budget saved before the payment date existed leaves."
                >
                  <div id="bg-issued-rate" aria-live="polite">
                    {issuedCurrency === "USD" ? (
                      <span className="muted">
                        the amount is already in USD, so no rate applies and none is read
                      </span>
                    ) : issuedRate ? (
                      <>
                        <strong>{formatNumber(issuedRate.perUsd)}</strong>{" "}
                        <span className="small muted">
                          {issuedCurrency} per USD · in force from {formatDate(issuedRate.effectiveFrom)}
                        </span>
                        <br />
                        <span className="xsmall muted">
                          read on {formatDate(issuedRateDate)} —{" "}
                          {issuedRateBasis === "payment-date"
                            ? "the payment date"
                            : "the To date of the budget period, no payment date being recorded"}
                        </span>
                      </>
                    ) : (
                      <span className="muted">
                        {issuedRateDate
                          ? `No rate is held for ${issuedCurrency} on ${formatDate(issuedRateDate)}.`
                          : "No payment date and no To date yet, so there is no date to read a rate on."}
                      </span>
                    )}
                  </div>
                </FormRow>

                <FormRow
                  label="USD conversion"
                  htmlFor="bg-issued-usd"
                  behaviour="calculated"
                  hint="Issued payment amount ÷ the rate above. Read only, as the instruction states — the budget stores the amount and never the conversion."
                >
                  <div id="bg-issued-usd" aria-live="polite">
                    {issuedUsd ? (
                      <strong>{formatMoney(issuedUsd)}</strong>
                    ) : (
                      <span className="muted">
                        {issued === undefined
                          ? "no issued payment amount recorded"
                          : "no rate applies, so there is no conversion"}
                      </span>
                    )}
                  </div>
                </FormRow>
              </div>

              <p className="small muted" style={{ marginTop: "0.5rem" }}>
                <strong>The conversion is read, not entered</strong> — the same rule{" "}
                <Link to="/sourcing/funds">the fund</Link> follows, and it reads the same FX master through
                the same one function, so replacing that table with the real rate API changes both screens at
                once.
                <br />
                <br />
                <strong>Which date governs the rate is now settled, and it is the payment date above.</strong>{" "}
                It was the one thing this card could not answer when the issued amount was added: a fund
                reads its rate on the actual payment date, a budget had no payment date, so this screen read
                the rate on the To date of the budget period and said so. The <em>Payment date</em> field,
                added on 3 September 2026, replaces that reading with the record's own date — one rule for
                the budget and the fund instead of one rule and one reading. The To date remains the
                fallback, and only for a budget saved before the field existed: the rate row above always
                names the date it read and which of the two it is.
              </p>
            </CollapsibleSection>
          ) : null}

          <CollapsibleSection title="Approval status" defaultOpen>
            <div className="fields">
              <FormRow
                label="Approval status"
                htmlFor="bg-approval"
                hint="Free text. The instruction that added this field states no values, no owner and no effect, so no value list is asserted and nothing downstream reads what is typed here."
              >
                <TextInput
                  id="bg-approval"
                  value={approvalStatus}
                  onChange={setApprovalStatus}
                  placeholder="e.g. Approved, Pending finance review — or leave blank"
                />
              </FormRow>
            </div>
            {statusesInUse.length > 0 ? (
              <p className="small">
                Values already recorded on other budgets:{" "}
                {statusesInUse.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="btn btn--sm"
                    style={{ marginRight: "0.35rem" }}
                    onClick={() => setApprovalStatus(s)}
                  >
                    {s}
                  </button>
                ))}
                {approvalStatus ? (
                  <button
                    type="button"
                    className="btn btn--sm"
                    style={{ marginRight: "0.35rem" }}
                    onClick={() => setApprovalStatus("")}
                  >
                    Clear it
                  </button>
                ) : null}
              </p>
            ) : null}
            {statusChanged && existing ? (
              <p className="small">
                <StatusChip tone="info" label="changed on this screen" size="sm" /> was{" "}
                {existing.approvalStatus ? <em>{existing.approvalStatus}</em> : <em>blank</em>}, now{" "}
                {approvalStatus.trim() ? <em>{approvalStatus.trim()}</em> : <em>blank</em>}. This is an
                ordinary field edit, not a transition: no sequence between values is enforced and nothing
                downstream reads the result.
              </p>
            ) : null}
            <p className="small muted">
              Leaving this blank is permitted — §6.2 does not state that the field is required, and{" "}
              {gaps.approvalStatusRecorded
                ? "recording it changes nothing downstream."
                : "an unrecorded status blocks nothing downstream."}
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="Notes" defaultOpen={false}>
            <FormRow label="Notes" htmlFor="bg-note" error={errors["bg-note"]}>
              <TextArea id="bg-note" value={note} onChange={setNote} rows={3} error={errors["bg-note"]} />
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
            <Link className="btn" to={cancelTo}>
              Cancel
            </Link>
            <p className="muted small">
              {summary.length > 0
                ? `${summary.length} field${summary.length === 1 ? "" : "s"} need attention.`
                : `${formatNumber(
                    gaps.linesWithoutCommodity +
                      gaps.linesWithoutQuantity +
                      gaps.linesWithoutAmount +
                      gaps.linesWithoutSupplier,
                  )} field(s) across the lines are unfilled, which is permitted. Save records the budget; Save & share records it and marks it for notification — the stakeholders to notify are configured in the system later, so this prototype sends no email and names no recipient.`}
            </p>
          </FormActions>
        </form>
      </div>
    </>
  );

  if (mode === "create") return body;
  return (
    <EditGate
      // As on the plan form: an id that matches nothing must reach the not-found state.
      loading={budget.loading || (Boolean(existing) && !hydrated)}
      error={budget.error}
      reload={budget.reload}
      missing={!budget.loading && !existing}
      missingTitle="Budget not found"
      backTo={listTo}
      backLabel="Back to budgets"
    >
      {body}
    </EditGate>
  );
}
