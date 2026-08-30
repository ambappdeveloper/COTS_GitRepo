/**
 * Phases 01–02 — the seasonal purchase plan and the budget: list and view screens.
 *
 * WHICH PHASES THESE SERVE. Workflow v2.3 §6.1 (Phase 01, seasonal purchase plan) and
 * §6.2 (Phase 02, budget) — the first two phases of the export process, and the two that
 * lead into Phase 03, funds. v2.3 §16.1 recorded that neither had a screen; these are
 * those screens.
 *
 * WHAT THE SOURCE SAYS, AND WHAT IT DOES NOT. Both phases come from a business
 * requirement of 26 August 2026 and appear in neither source document of §3.1, so both
 * are `[PROPOSED]` throughout. Between them the two sections raise eighteen business
 * confirmations. The prototype's rule for those is the same one the rest of this
 * mock-up follows: build exactly what the requirement states, and put every question it
 * leaves open on the screen where it would be answered — never resolve one silently.
 *
 * Accordingly:
 *   · every field on a plan line and a budget line is optional, because §6.1 and §6.2
 *     both state "none stated" for preconditions and both ask outright whether the
 *     record must be complete before the user proceeds;
 *   · a month may carry more than one commodity, because §6.1 asks whether it may and
 *     does not answer — the screen says so where the second line appears;
 *   · nothing reads the budget approval status, because the instruction that added it
 *     names the field and states no values, no owner and no effect;
 *   · the budget-against-plan comparisons are shown and labelled as open questions,
 *     not as rules, because §6.2 asks whether the period must fall inside the seasonal
 *     period and whether the quantities must reconcile, and settles neither.
 *
 * Every figure comes from `domain/planning.ts`, so these screens, the two add forms in
 * `pages/planning-forms.tsx` and the service layer cannot disagree about a total.
 */

import { Link, useParams } from "react-router-dom";
import { commodityById, commodityGroupOf, counterpartyName } from "../data/master";
import { formatDate, formatMoney, formatMt, formatNumber } from "../domain/calc";
import {
  approvalStatusesInUse,
  budgetAgainstPlan,
  budgetGaps,
  budgetTotals,
  budgetByCommodity,
  capacitySummary,
  formatSeasonMonth,
  isPlanActive,
  monthsInSeason,
  planCarriesCommodity,
  plannedForCommodity,
  planGaps,
  planGrid,
  planGridTotals,
  planTotals,
  seasonMonthEndIso,
  seasonMonthKey,
  seasonMonthStartIso,
} from "../domain/planning";
import type { Budget, Money, SeasonalPurchasePlan } from "../domain/types";
import { api } from "../services/store";
import { Banner, EmptyState, ErrorState, StatusChip } from "../components/feedback";
import {
  ActionBar,
  CollapsibleSection,
  FieldGrid,
  PageHeader,
  SummaryCard,
  TotalBanner,
} from "../components/layout";
import { DataTable, type Column } from "../components/table";
import { useAsync } from "./hooks";

/* ------------------------------------------------------------------ *
 * Shared helpers. Nothing here derives a business figure.
 * ------------------------------------------------------------------ */

function commodityName(id?: string): string {
  return (id ? commodityById(id)?.name : undefined) ?? "–";
}

/** One total per currency, because §6.2 states no single currency for Amount. */
function formatAmounts(amounts: Money[]): string {
  if (amounts.length === 0) return "–";
  return amounts.map((m) => formatMoney(m)).join(" + ");
}

/**
 * Completeness is reported, never enforced. The chip says what is outstanding so a
 * reviewer can see the gap; no screen and no service call refuses anything on it.
 */
function planCompletenessChip(plan: SeasonalPurchasePlan) {
  const g = planGaps(plan);
  if (g.complete) return <StatusChip tone="ok" label="Nothing outstanding" size="sm" />;
  const bits: string[] = [];
  if (g.monthsWithNoQuantity.length > 0) bits.push(`${g.monthsWithNoQuantity.length} month(s) empty`);
  if (g.rowsWithoutCommodity > 0) bits.push(`${g.rowsWithoutCommodity} row(s) without commodity`);
  if (g.rowsWithNoQuantity > 0) bits.push(`${g.rowsWithNoQuantity} row(s) without quantity`);
  if (g.rowsWithoutNote > 0) bits.push(`${g.rowsWithoutNote} row(s) without note`);
  if (g.duplicatedCommodities.length > 0) bits.push(`${g.duplicatedCommodities.length} duplicated`);
  if (g.cellsOutsidePeriod.length > 0) bits.push(`${g.cellsOutsidePeriod.length} outside the period`);
  return (
    <StatusChip
      tone="warn"
      label={bits.join(", ")}
      size="sm"
      title="Neither §6.1 nor the Plan sheet states a validation or completeness rule, and §6.1 asks outright whether the plan must be complete before Phase 02. Nothing here refuses an incomplete plan; the gap is shown instead."
    />
  );
}

/**
 * Whether the plan was saved with `Save & share`. The stamp records that sharing was
 * asked for and nothing more: the stakeholders are configured in the system later, so no
 * notification was sent, no recipient is held, and nothing downstream reads it.
 */
function sharedChip(record: Pick<SeasonalPurchasePlan, "sharedOn">) {
  if (!record.sharedOn) return <span className="muted small">not shared</span>;
  return (
    <StatusChip
      tone="info"
      label={`Shared ${formatDate(record.sharedOn)}`}
      size="sm"
      title="Save & share marked this record for notification. Recipients are configured in the system later, so no email was sent and no recipient is recorded."
    />
  );
}

/**
 * Whether a plan's season is still open. Ours: §6.1 defines no status for a plan, so
 * `active` is read as *the seasonal period has not ended*, and the budget screens say so.
 */
function planStatusChip(plan: Pick<SeasonalPurchasePlan, "from" | "to">) {
  const active = isPlanActive(plan);
  return (
    <StatusChip
      tone={active ? "ok" : "idle"}
      label={active ? "active" : "closed"}
      size="sm"
      title="A plan is active while its seasonal period has not ended. §6.1 defines no status model for a plan, so this is a reading and not a stored state."
    />
  );
}

/**
 * The approval status is printed as it was typed. No tone is derived from the text,
 * because the instruction that added the field states no values — so no value can be
 * known to mean approved.
 */
function approvalChip(budget: Budget) {
  const v = budget.approvalStatus?.trim();
  if (!v) {
    return (
      <StatusChip
        tone="na"
        label="No approval status recorded"
        size="sm"
        title="The field is optional here because the instruction that added it states no values, no owner and no effect."
      />
    );
  }
  return (
    <StatusChip
      tone="info"
      label={v}
      size="sm"
      title="Recorded as typed. No value list is stated by the requirement, so no meaning is attached to this text and nothing downstream reads it."
    />
  );
}

/* ================================================================== *
 * Tab — seasonal purchase plans · /sourcing/plans
 * ================================================================== */

export function SeasonalPlansTab({
  plans,
  budgets,
  loading,
}: {
  plans: SeasonalPurchasePlan[];
  budgets: Budget[];
  loading: boolean;
}) {
  const columns: Column<SeasonalPurchasePlan>[] = [
    {
      key: "ref",
      header: "Plan reference",
      cell: (p) => (
        <Link className="mono" to={`/sourcing/plans/${p.id}`}>
          {p.planRef}
        </Link>
      ),
      sortValue: (p) => p.planRef,
    },
    {
      key: "period",
      header: "Seasonal period",
      cell: (p) => `${formatSeasonMonth(p.from)} – ${formatSeasonMonth(p.to)}`,
      sortValue: (p) => seasonMonthKey(p.from),
    },
    {
      key: "months",
      header: "Months",
      align: "right",
      cell: (p) => formatNumber(planTotals(p).months),
      sortValue: (p) => planTotals(p).months,
    },
    {
      key: "rows",
      header: "Commodity rows",
      align: "right",
      cell: (p) => formatNumber(planTotals(p).rows),
      sortValue: (p) => planTotals(p).rows,
    },
    {
      key: "groups",
      header: "Groups",
      align: "right",
      cell: (p) => formatNumber(planTotals(p).groups),
      sortValue: (p) => planTotals(p).groups,
      optional: true,
    },
    {
      key: "qty",
      header: "Total QTY/MT",
      align: "right",
      cell: (p) => formatMt(planTotals(p).quantityMt),
      sortValue: (p) => planTotals(p).quantityMt,
    },
    {
      key: "capacity",
      header: "Capacity needed MT",
      align: "right",
      cell: (p) => {
        const c = planTotals(p).capacityMt;
        return c > 0 ? formatNumber(c) : <span className="muted">–</span>;
      },
      sortValue: (p) => planTotals(p).capacityMt,
    },
    {
      key: "locations",
      header: "Notes / location",
      cell: (p) => {
        const locs = [...new Set(p.rows.map((r) => r.note?.trim()).filter(Boolean))];
        return locs.length > 0 ? locs.join(", ") : <span className="muted">none recorded</span>;
      },
      sortValue: (p) => p.rows.map((r) => r.note ?? "").join(" "),
    },
    {
      key: "budgets",
      header: "Budgets against it",
      align: "right",
      cell: (p) => {
        const n = budgets.filter((b) => b.lines.some((l) => l.seasonalPlanId === p.id)).length;
        return n > 0 ? formatNumber(n) : <span className="muted">none</span>;
      },
      sortValue: (p) => budgets.filter((b) => b.lines.some((l) => l.seasonalPlanId === p.id)).length,
      optional: true,
    },
    {
      key: "shared",
      header: "Shared",
      cell: (p) => sharedChip(p),
      sortValue: (p) => (p.sharedOn ? "shared" : ""),
    },
    {
      key: "complete",
      header: "Completeness",
      cell: (p) => planCompletenessChip(p),
      sortValue: (p) => (planGaps(p).complete ? "complete" : "outstanding"),
    },
    {
      key: "created",
      header: "Created",
      cell: (p) => (
        <>
          {formatDate(p.createdOn)}
          <br />
          <span className="small muted">{p.createdBy}</span>
        </>
      ),
      sortValue: (p) => p.createdOn,
      optional: true,
    },
  ];

  return (
    <>
      <Banner tone="info" title="Phase 01 — what the requirement states, and what the spreadsheet adds">
        A seasonal purchase plan is a period, given as a From month and year and a To month and year, and a
        quantity in MT for each commodity in each month that falls between them. COTS determines those months
        and presents them in chronological order — the one calculation §6.1 states, and the reason a plan's
        month columns are generated rather than fixed. <em>Total QTY/MT</em> and <em>Capacity needed MT</em>{" "}
        are calculated from the grid, the latter by the formula{" "}
        <span className="mono">=LARGE(row,1)+LARGE(row,2)+LARGE(row,3)</span> that{" "}
        <em>Export Plan V1.xlsx</em> carries — the commodity's three peak months. The plan leads to{" "}
        <Link to="/sourcing/budgets">Phase 02, the budget</Link>.
      </Banner>

      <Banner tone="warn" title="This phase is [PROPOSED], and its two sources do not agree">
        The seasonal purchase plan appears in neither source document of §3.1. It comes from a business
        requirement of 26 August 2026 and from the Plan sheet of <em>Export Plan V1.xlsx</em> of 27 August
        2026, and the two differ: the requirement has the planner enter a capacity per month, the spreadsheet
        derives capacity per commodity row and carries a <em>Notes</em> column the requirement never mentions.
        The spreadsheet is followed as the later and more specific evidence, and the departure is stated on
        every screen that makes it. Every field and figure below is a reading of those two sources rather than
        an established process.
      </Banner>

      <DataTable
        caption="Seasonal purchase plans"
        rows={plans}
        columns={columns}
        loading={loading}
        /*
         * No `rowHref`. It only wraps the first cell of the stacked mobile card in a
         * link, and the plan reference in that cell is already a link — which would nest
         * one anchor inside another. The reference itself is the way in on every layout.
         */
        searchPlaceholder="Search by plan reference, period, commodity or location…"
        searchValue={(p) =>
          `${p.planRef} ${formatSeasonMonth(p.from)} ${formatSeasonMonth(p.to)} ${p.rows
            .map(
              (r) =>
                `${commodityName(r.commodityId)} ${commodityGroupOf(r.commodityId) ?? ""} ${r.note ?? ""}`,
            )
            .join(" ")}`
        }
        savedViews={[
          { key: "all", label: "All plans" },
          {
            key: "incomplete",
            label: "Something outstanding",
            description: "Reported, not enforced — neither source states a completeness rule.",
            predicate: (p) => !planGaps(p).complete,
          },
          { key: "complete", label: "Nothing outstanding", predicate: (p) => planGaps(p).complete },
          { key: "shared", label: "Shared", predicate: (p) => Boolean(p.sharedOn) },
        ]}
        emptyTitle="No seasonal purchase plan yet"
        emptyBody="Phase 01 begins with the seasonal period. Define it and COTS gives you a column per month it spans."
        emptyAction={
          <Link className="btn btn--primary" to="/sourcing/plans/new">
            New seasonal purchase plan
          </Link>
        }
      />
    </>
  );
}

/* ================================================================== *
 * Tab — budgets · /sourcing/budgets
 * ================================================================== */

export function BudgetsTab({
  budgets,
  plans,
  loading,
}: {
  budgets: Budget[];
  plans: SeasonalPurchasePlan[];
  loading: boolean;
}) {
  const statuses = approvalStatusesInUse(budgets);
  const planRef = (id?: string) => plans.find((p) => p.id === id)?.planRef;

  const columns: Column<Budget>[] = [
    {
      key: "ref",
      header: "Budget reference",
      cell: (b) => (
        <Link className="mono" to={`/sourcing/budgets/${b.id}`}>
          {b.budgetRef}
        </Link>
      ),
      sortValue: (b) => b.budgetRef,
    },
    {
      key: "period",
      header: "Budget period",
      cell: (b) => `${formatDate(b.fromDate)} – ${formatDate(b.toDate)}`,
      sortValue: (b) => b.fromDate,
    },
    {
      key: "plans",
      header: "Plans",
      cell: (b) => {
        const refs = [...new Set(b.lines.map((l) => planRef(l.seasonalPlanId)).filter(Boolean))];
        return refs.length > 0 ? (
          <span className="mono small">{refs.join(", ")}</span>
        ) : (
          <span className="muted">none named</span>
        );
      },
      sortValue: (b) => b.lines.map((l) => planRef(l.seasonalPlanId) ?? "").join(" "),
    },
    {
      key: "commodities",
      header: "Commodities",
      align: "right",
      cell: (b) => formatNumber(budgetTotals(b).commodities),
      sortValue: (b) => budgetTotals(b).commodities,
    },
    {
      key: "lines",
      header: "Lines",
      align: "right",
      cell: (b) => formatNumber(b.lines.length),
      sortValue: (b) => b.lines.length,
      optional: true,
    },
    {
      key: "qty",
      header: "Quantity",
      align: "right",
      cell: (b) => formatMt(budgetTotals(b).quantityMt),
      sortValue: (b) => budgetTotals(b).quantityMt,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (b) => formatAmounts(budgetTotals(b).amounts),
      sortValue: (b) => budgetTotals(b).amounts[0]?.amount ?? 0,
    },
    {
      key: "suppliers",
      header: "Suppliers",
      align: "right",
      cell: (b) => formatNumber(budgetTotals(b).suppliers),
      sortValue: (b) => budgetTotals(b).suppliers,
      optional: true,
    },
    {
      key: "approval",
      header: "Approval status",
      cell: (b) => approvalChip(b),
      sortValue: (b) => b.approvalStatus ?? "",
      filterOptions: statuses.map((s) => ({ value: s, label: s })),
      filterMatch: (b, v) => (b.approvalStatus?.trim() ?? "") === v,
    },
    {
      key: "shared",
      header: "Shared",
      cell: (b) => sharedChip(b),
      sortValue: (b) => (b.sharedOn ? "shared" : ""),
    },
    {
      key: "created",
      header: "Created",
      cell: (b) => (
        <>
          {formatDate(b.createdOn)}
          <br />
          <span className="small muted">{b.createdBy}</span>
        </>
      ),
      sortValue: (b) => b.createdOn,
      optional: true,
    },
  ];

  return (
    <>
      <Banner tone="info" title="Phase 02 — what the requirement states, and what it leaves open">
        A budget is a period, given as a From date and a To date, and a line carrying the plan chosen from a
        drop-down, the quantity in MT, the amount and the supplier. Note the difference the requirement itself
        creates: the budget period is dates, while{" "}
        <Link to="/sourcing/plans">the seasonal period of §6.1</Link> is a month and a year. Whether the one
        must fall inside the other is not stated, and is shown as a comparison on each budget rather than
        enforced. The budget leads to <Link to="/sourcing/funds">Phase 03, funds</Link>.
      </Banner>

      <Banner tone="warn" title="The approval status is a field and nothing more">
        Added by a business instruction of 26 August 2026. The instruction names the field and states no
        values, no owner and no effect, so this prototype stores whatever is typed, attaches no meaning to it,
        derives no tone from it, enforces no sequence between values and gates nothing on it — a budget with
        no approval status can still be read by any later phase, because nothing says otherwise.{" "}
        {statuses.length > 0 ? (
          <>
            The {statuses.length} value(s) present in the data today are{" "}
            {statuses.map((s, i) => (
              <span key={s}>
                {i > 0 ? ", " : ""}
                <em>{s}</em>
              </span>
            ))}
            . That is the only evidence of what the field contains.
          </>
        ) : (
          <>No budget currently records one.</>
        )}
      </Banner>

      <DataTable
        caption="Budgets"
        rows={budgets}
        columns={columns}
        loading={loading}
        /* No `rowHref`, for the same reason as the plans table above. */
        searchPlaceholder="Search by budget reference, plan, supplier or approval status…"
        searchValue={(b) =>
          `${b.budgetRef} ${b.approvalStatus ?? ""} ${b.lines
            .map(
              (l) =>
                `${planRef(l.seasonalPlanId) ?? ""} ${commodityName(l.commodityId)} ${counterpartyName(l.supplierId)}`,
            )
            .join(" ")}`
        }
        savedViews={[
          { key: "all", label: "All budgets" },
          { key: "shared", label: "Shared", predicate: (b) => Boolean(b.sharedOn) },
          {
            key: "recorded",
            label: "Approval status recorded",
            predicate: (b) => Boolean(b.approvalStatus?.trim()),
          },
          {
            key: "not-recorded",
            label: "No approval status",
            description: "Permitted — nothing states the field is required.",
            predicate: (b) => !b.approvalStatus?.trim(),
          },
          {
            key: "incomplete",
            label: "Something outstanding",
            predicate: (b) => !budgetGaps(b).complete,
          },
        ]}
        emptyTitle="No budget yet"
        emptyBody="Phase 02 begins with the budget period, as a From date and a To date."
        emptyAction={
          <Link className="btn btn--primary" to="/sourcing/budgets/new">
            New budget
          </Link>
        }
      />
    </>
  );
}

/* ================================================================== *
 * View form — one seasonal purchase plan · /sourcing/plans/:id
 *
 * Rendered as the Plan sheet renders it: Commodity Group, Commodity, one column
 * per month of the period, Total QTY/MT, Notes, Capacity needed MT, with a
 * Total footer. Beneath it the Summary sheet's own pivot — capacity by
 * commodity group against the Notes value, which the captured sheet uses as a
 * location.
 * ================================================================== */

/** The business confirmations §6.1 leaves open, plus the two the spreadsheet adds. */
const PLAN_OPEN_QUESTIONS = [
  "Which function owns the seasonal purchase plan, and who may edit it once it is saved? The requirement names only “the user”.",
  "What is Capacity needed MT compared against? The spreadsheet says how it is calculated — the commodity's three peak months — but nothing states what capacity it is measured against, or what happens when the figure exceeds what exists.",
  "Why three peak months, and is three right for every commodity? The formula is the sheet's; no rule behind the number is stated.",
  "Is the plan held once for the export module, per origin country, or per legal entity?",
  "Must every month and every commodity row be filled before the user proceeds to Phase 02? Nothing on this screen requires it, and the sheet's own October column is empty.",
  "What becomes of a saved plan when the seasonal period is afterwards changed?",
  "Is the commodity list the COTS commodity master used at §6.12 and §6.13, or a separate seasonal list? The master is offered, and the Commodity Group is read from it.",
  "Is Notes a location, and if so is there a location master? Every captured row reads “PZU” and the Summary sheet pivots capacity against it as one, but the column is headed Notes and no master is named.",
  "May the same commodity appear on more than one row? The sheet carries each once; nothing forbids two, so two are permitted and reported.",
  "Who are the stakeholders that Save & share notifies? To be configured in the system later, so nothing is sent and no recipient is named here.",
  "How does the seasonal purchase plan relate to the sourcing season process excluded at §2.2? The two plan the same commodity over the same season, and the boundary is not stated.",
];

export function SeasonalPurchasePlanDetail() {
  const { id = "" } = useParams();
  const plan = useAsync(() => api.getSeasonalPurchasePlan(id), [id]);
  const budgets = useAsync(() => api.listBudgets());

  if (plan.error) {
    return (
      <div className="page">
        <ErrorState detail={plan.error} onRetry={plan.reload} />
      </div>
    );
  }
  if (plan.loading) {
    return (
      <div className="page">
        <div className="card card__body muted">Loading…</div>
      </div>
    );
  }
  const p = plan.data;
  if (!p) {
    return (
      <div className="page">
        <EmptyState
          title="Seasonal purchase plan not found"
          action={
            <Link className="btn btn--primary" to="/sourcing/plans">
              Back to seasonal purchase plans
            </Link>
          }
        />
      </div>
    );
  }

  const months = monthsInSeason(p.from, p.to);
  const grid = planGrid(p);
  const footer = planGridTotals(grid, months.length);
  const totals = planTotals(p);
  const gaps = planGaps(p);
  const summary = capacitySummary(grid);
  const against = (budgets.data ?? []).filter((b) => b.lines.some((l) => l.seasonalPlanId === p.id));

  return (
    <>
      <PageHeader
        moduleLabel="Sourcing intake"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Sourcing intake", to: "/sourcing" },
          { label: "Seasonal purchase plan", to: "/sourcing/plans" },
          { label: p.planRef },
        ]}
        title={p.planRef}
        statusChip={planCompletenessChip(p)}
        meta={
          <>
            Phase 01 · {formatSeasonMonth(p.from)} – {formatSeasonMonth(p.to)} · {totals.months} month(s) ·{" "}
            {formatMt(totals.quantityMt)} planned · {formatNumber(totals.capacityMt)} MT capacity needed ·{" "}
            <strong>[PROPOSED]</strong>
          </>
        }
        recordKey={p.planRef}
        recordDate={
          p.updatedOn
            ? `changed ${formatDate(p.updatedOn)} by ${p.updatedBy ?? "unknown"}`
            : `created ${formatDate(p.createdOn)}`
        }
        actions={
          <ActionBar
            primary={[{ label: "Edit this plan", to: `/sourcing/plans/${p.id}/edit`, tone: "primary" }]}
          />
        }
      />

      <div className="page">
        {p.sharedOn ? (
          <Banner tone="info" title={`Shared on ${formatDate(p.sharedOn)} by ${p.sharedBy ?? "unknown"}`}>
            The plan was saved with <em>Save &amp; share</em>. The stakeholders to notify are to be configured
            in the system later, so <strong>no notification was sent and no recipient is recorded</strong> —
            this stamp says only that sharing was asked for. Nothing downstream reads it.
          </Banner>
        ) : null}

        <Banner
          tone="info"
          title="No status, no approval and no validation — because neither source defines one"
        >
          §6.1 states outright that no status model is defined for a seasonal purchase plan, that there is no
          validation, no approval and no blocking rule, and that no integration or notification is asserted.
          The Plan sheet adds no rule either. This view therefore carries no status beyond a report of what is
          outstanding, and no action that approves or submits anything. The two calculated columns are the
          sheet's own formulas; the completeness figures are a reading, shown so the gaps are visible.
        </Banner>

        <div className="grid-3">
          <SummaryCard title="Seasonal period">
            <FieldGrid
              columns={1}
              fields={[
                { label: "From", value: formatSeasonMonth(p.from), behaviour: "required" },
                { label: "To", value: formatSeasonMonth(p.to), behaviour: "required" },
                {
                  label: "Months in the period",
                  value: formatNumber(totals.months),
                  behaviour: "calculated",
                  hint: "§6.1 activity 3 — COTS determines the months that fall between the two bounds and presents them in chronological order. They are the columns below.",
                },
                {
                  label: "As calendar dates",
                  value:
                    months.length > 0
                      ? `${formatDate(seasonMonthStartIso(months[0]))} – ${formatDate(
                          seasonMonthEndIso(months[months.length - 1]),
                        )}`
                      : undefined,
                  behaviour: "calculated",
                  hint: "Ours, not the requirement's. Shown only so the period can be compared with a budget, which is given as dates.",
                },
              ]}
            />
          </SummaryCard>

          <SummaryCard title="Planned across the season">
            <FieldGrid
              columns={1}
              fields={[
                { label: "Total QTY/MT", value: formatMt(totals.quantityMt), behaviour: "calculated" },
                {
                  label: "Capacity needed MT",
                  value: totals.capacityMt > 0 ? formatNumber(totals.capacityMt) : undefined,
                  behaviour: "calculated",
                  hint: "The sum of each commodity row's own three-peak-month figure — the sheet's =SUM(N19:N29). Not the formula re-applied to the monthly totals, which would give a different number.",
                },
                { label: "Commodity rows", value: formatNumber(totals.rows), behaviour: "calculated" },
                { label: "Commodities", value: formatNumber(totals.commodities), behaviour: "calculated" },
                { label: "Commodity groups", value: formatNumber(totals.groups), behaviour: "calculated" },
              ]}
            />
          </SummaryCard>

          <SummaryCard
            title="What is outstanding"
            tone={gaps.complete ? "ok" : "warn"}
            footer={
              <span className="small muted">
                Reported, not enforced. Neither §6.1 nor the Plan sheet states a completeness rule, and §6.1
                asks whether the plan must be complete before Phase 02.
              </span>
            }
          >
            <FieldGrid
              columns={1}
              fields={[
                {
                  label: "Months with nothing planned",
                  value:
                    gaps.monthsWithNoQuantity.length === 0 ? (
                      <span className="muted">none</span>
                    ) : (
                      gaps.monthsWithNoQuantity.map((m) => formatSeasonMonth(m)).join(", ")
                    ),
                },
                { label: "Rows without a commodity", value: formatNumber(gaps.rowsWithoutCommodity) },
                { label: "Rows with no quantity at all", value: formatNumber(gaps.rowsWithNoQuantity) },
                { label: "Rows without a note", value: formatNumber(gaps.rowsWithoutNote) },
                {
                  label: "Commodities on more than one row",
                  value:
                    gaps.duplicatedCommodities.length === 0 ? (
                      <span className="muted">none</span>
                    ) : (
                      gaps.duplicatedCommodities.map((c) => commodityName(c)).join(", ")
                    ),
                },
              ]}
            />
          </SummaryCard>
        </div>

        <CollapsibleSection
          title={`Purchase plan — ${totals.rows} commodity row(s) × ${totals.months} month(s)`}
          defaultOpen
          indicator={
            <StatusChip
              tone="info"
              label="Export Plan V1.xlsx layout"
              size="sm"
              title="Commodity down, month across, with Total QTY/MT and Capacity needed MT as formulas — the shape of the Plan sheet."
            />
          }
        >
          <div className="dtable__scroll plan-grid">
            <table className="dtable__table">
              <caption className="sr-only">
                The seasonal purchase plan: one row per commodity, one column per month of the period, with
                the row total, the note and the derived capacity
              </caption>
              <thead>
                <tr>
                  <th scope="col">Commodity Group</th>
                  <th scope="col">Commodity</th>
                  {months.map((m) => (
                    <th scope="col" key={seasonMonthKey(m)} className="text-right">
                      {formatSeasonMonth(m)}
                    </th>
                  ))}
                  <th scope="col" className="text-right">
                    Total QTY/MT
                  </th>
                  <th scope="col">Notes</th>
                  <th scope="col" className="text-right">
                    Capacity needed MT
                  </th>
                </tr>
              </thead>
              <tbody>
                {grid.length === 0 ? (
                  <tr>
                    <td colSpan={months.length + 5}>
                      <span className="muted">No commodity row on this plan yet.</span>
                    </td>
                  </tr>
                ) : (
                  grid.map((g) => (
                    <tr key={g.row.id}>
                      <th scope="row">{g.group ?? <span className="muted">no commodity chosen</span>}</th>
                      <td>
                        {g.commodityId ? (
                          g.commodityName
                        ) : (
                          <span className="muted">no commodity recorded</span>
                        )}
                      </td>
                      {g.quantities.map((q, i) => (
                        <td key={seasonMonthKey(months[i])} className="text-right">
                          {q === undefined ? <span className="muted">–</span> : formatNumber(q)}
                        </td>
                      ))}
                      <td className="text-right">
                        <strong>{formatMt(g.totalMt)}</strong>
                      </td>
                      <td>{g.note ?? <span className="muted">–</span>}</td>
                      <td className="text-right">
                        <strong>{formatNumber(g.capacityMt)}</strong>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  {/*
                    Two cells rather than one spanning both, so they line up with the two
                    frozen columns above them — a colSpan would slide under the sticky edge.
                  */}
                  <th scope="row">Total</th>
                  <td />
                  {footer.perMonth.map((v, i) => (
                    <td key={seasonMonthKey(months[i])} className="text-right">
                      <strong>{v > 0 ? formatNumber(v) : "–"}</strong>
                    </td>
                  ))}
                  <td className="text-right">
                    <strong>{formatMt(footer.totalMt)}</strong>
                  </td>
                  <td />
                  <td className="text-right">
                    <strong>{formatNumber(footer.capacityMt)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="small muted" style={{ marginTop: "0.5rem" }}>
            <strong>Two columns are calculated, and both are the spreadsheet's own.</strong>{" "}
            <em>Total QTY/MT</em> is <span className="mono">=SUM(row)</span>. <em>Capacity needed MT</em> is{" "}
            <span className="mono">=LARGE(row,1)+LARGE(row,2)+LARGE(row,3)</span> — the sum of the commodity's
            three largest months, which is why it is not a field anyone types. The <em>Total</em> row's
            capacity is the sum of the rows' own figures, as the sheet has it, rather than the formula applied
            again to the monthly totals; the two are not the same number. <em>Commodity Group</em> is read
            from the commodity master, never entered here.
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          title={`Capacity needed by commodity group — ${formatNumber(summary.grandTotal)} MT`}
          defaultOpen
        >
          <div className="dtable__scroll">
            <table className="dtable__table">
              <caption className="sr-only">
                Capacity needed summed by commodity group against the notes value the sheet uses as a location
              </caption>
              <thead>
                <tr>
                  <th scope="col">Commodity group</th>
                  {summary.locations.map((loc) => (
                    <th scope="col" key={loc} className="text-right">
                      {loc}
                    </th>
                  ))}
                  <th scope="col" className="text-right">
                    Grand total
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((r) => (
                  <tr key={r.group}>
                    <th scope="row">{r.group}</th>
                    {r.perLocation.map((v, i) => (
                      <td key={summary.locations[i]} className="text-right">
                        {v > 0 ? formatNumber(v) : <span className="muted">–</span>}
                      </td>
                    ))}
                    <td className="text-right">
                      <strong>{formatNumber(r.total)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Grand total</th>
                  {summary.perLocation.map((v, i) => (
                    <td key={summary.locations[i]} className="text-right">
                      <strong>{formatNumber(v)}</strong>
                    </td>
                  ))}
                  <td className="text-right">
                    <strong>{formatNumber(summary.grandTotal)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="small muted" style={{ marginTop: "0.5rem" }}>
            This is the Summary sheet of <em>Export Plan V1.xlsx</em> — <em>Sum of Capacity needed</em> by{" "}
            <em>Category</em> against the <em>Notes</em> value, which the captured sheet uses as a location
            and fills with <span className="mono">PZU</span> on every row. It is reproduced because it is the
            one place the spreadsheet says what the capacity figure is <em>for</em>. Whether <em>Notes</em> is
            formally a location, and whether there is a location master behind it, is not stated and is left
            open.
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          title={`Budgets written against this plan — ${against.length}`}
          defaultOpen={against.length > 0}
        >
          {against.length === 0 ? (
            <p className="muted">
              No budget names this plan. Nothing requires one — §6.2 asks what the Plan drop-down contains and
              does not state that every plan must be budgeted.
            </p>
          ) : (
            <>
              <div className="dtable__scroll">
                <table className="dtable__table">
                  <caption className="sr-only">
                    Budgets naming this plan, with the quantity comparison
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Budget</th>
                      <th scope="col">Budget period</th>
                      <th scope="col" className="text-right">
                        Budgeted against this plan
                      </th>
                      <th scope="col" className="text-right">
                        Planned
                      </th>
                      <th scope="col" className="text-right">
                        Variance
                      </th>
                      <th scope="col">Period fit</th>
                      <th scope="col">Approval status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {against.map((b) => {
                      const cmp = budgetAgainstPlan(b, p);
                      return (
                        <tr key={b.id}>
                          <td>
                            <Link className="mono" to={`/sourcing/budgets/${b.id}`}>
                              {b.budgetRef}
                            </Link>
                          </td>
                          <td>
                            {formatDate(b.fromDate)} – {formatDate(b.toDate)}
                          </td>
                          <td className="text-right">{formatMt(cmp.budgetQuantityMt)}</td>
                          <td className="text-right">{formatMt(cmp.plannedQuantityMt)}</td>
                          <td className="text-right">
                            <strong>
                              {cmp.varianceMt > 0 ? "+" : ""}
                              {formatMt(cmp.varianceMt)}
                            </strong>
                          </td>
                          <td>
                            <StatusChip
                              tone={cmp.periodFit === "inside" ? "ok" : "warn"}
                              label={cmp.periodFit}
                              size="sm"
                              title="Whether a budget period must fall inside the seasonal period is a business confirmation §6.2 raises and does not answer. This is the comparison, not a rule."
                            />
                          </td>
                          <td>{approvalChip(b)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="small muted" style={{ marginTop: "0.5rem" }}>
                <strong>Both comparisons are open questions, not rules.</strong> §6.2 asks whether the budget
                period must fall inside the seasonal period of §6.1, and whether the budget quantity in MT
                must reconcile with the quantity planned here. Neither is answered, so both are computed and
                displayed and neither refuses anything.
              </p>
            </>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Open questions on this phase" defaultOpen={false}>
          <p className="small">
            §6.1 is <strong>[PROPOSED]</strong> throughout, and the Plan sheet adds questions of its own.
            Nothing on this screen answers one of them.
          </p>
          <ul className="small">
            {PLAN_OPEN_QUESTIONS.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </CollapsibleSection>

        {p.note ? (
          <CollapsibleSection title="Notes" defaultOpen>
            <p>{p.note}</p>
          </CollapsibleSection>
        ) : null}
      </div>
    </>
  );
}

/* ================================================================== *
 * View form — one budget · /sourcing/budgets/:id
 * ================================================================== */

/** The eleven business confirmations §6.2 leaves open. */
const BUDGET_OPEN_QUESTIONS = [
  "Which function owns the budget, and who may edit it once it is saved? The requirement names only “the user”.",
  "What makes a seasonal purchase plan “active”? The instruction of 27 August 2026 says the Plan list shows only active plans, but §6.1 states that no status model is defined for a plan. Read here as: the seasonal period has not ended. An explicit flag, an approval, or one active plan per country would all be different answers.",
  "What currency is Amount in, and is it one currency or chosen per budget? The currency is carried per line and amounts are never added across currencies.",
  "Is the budget one line for the period, or several — one per plan, per commodity or per supplier? Several are permitted, and a line now names one plan and one commodity.",
  "May two lines name the same plan and commodity, with different suppliers? Nothing forbids it, so it is permitted and not reported.",
  "Is Supplier the COTS supplier master, the same one the sourcing intake uses, or free text? The master is offered here.",
  "Must the budget period fall inside the seasonal period of §6.1? The comparison is shown and nothing is refused on it.",
  "Must the budget quantity in MT reconcile with the quantity planned at §6.1 — in total, or now per commodity? Both variances are shown and nothing is refused on either.",
  "Who are the stakeholders that Save & share notifies? To be configured in the system later, so nothing is sent and no recipient is named here.",
  "What becomes of a saved budget when the period or the plan is afterwards changed?",
  "How does the budget relate to the costing module and the costing snapshot of §6.8? Both carry money against a commodity and the boundary is not stated.",
  "What values does the budget approval status take, and is any sequence between them enforced?",
  "Who approves a budget, and does the field record an approval made elsewhere or perform it in COTS?",
  "Does an unapproved budget block anything downstream — funds, the purchase agreement, or the commercial phases? Nothing here is gated on it.",
];

export function BudgetDetail() {
  const { id = "" } = useParams();
  const budget = useAsync(() => api.getBudget(id), [id]);
  const plans = useAsync(() => api.listSeasonalPurchasePlans());

  if (budget.error) {
    return (
      <div className="page">
        <ErrorState detail={budget.error} onRetry={budget.reload} />
      </div>
    );
  }
  if (budget.loading) {
    return (
      <div className="page">
        <div className="card card__body muted">Loading…</div>
      </div>
    );
  }
  const b = budget.data;
  if (!b) {
    return (
      <div className="page">
        <EmptyState
          title="Budget not found"
          action={
            <Link className="btn btn--primary" to="/sourcing/budgets">
              Back to budgets
            </Link>
          }
        />
      </div>
    );
  }

  const totals = budgetTotals(b);
  const gaps = budgetGaps(b);
  const planRows = plans.data ?? [];
  const namedPlans = planRows.filter((p) => b.lines.some((l) => l.seasonalPlanId === p.id));

  return (
    <>
      <PageHeader
        moduleLabel="Sourcing intake"
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Sourcing intake", to: "/sourcing" },
          { label: "Budget", to: "/sourcing/budgets" },
          { label: b.budgetRef },
        ]}
        title={b.budgetRef}
        statusChip={approvalChip(b)}
        meta={
          <>
            Phase 02 · {formatDate(b.fromDate)} – {formatDate(b.toDate)} · {b.lines.length} line(s) ·{" "}
            {formatMt(totals.quantityMt)} · {formatAmounts(totals.amounts)} · <strong>[PROPOSED]</strong>
          </>
        }
        recordKey={b.budgetRef}
        recordDate={
          b.updatedOn
            ? `changed ${formatDate(b.updatedOn)} by ${b.updatedBy ?? "unknown"}`
            : `created ${formatDate(b.createdOn)}`
        }
        actions={
          <ActionBar
            primary={[{ label: "Edit this budget", to: `/sourcing/budgets/${b.id}/edit`, tone: "primary" }]}
          />
        }
      />

      <div className="page">
        {b.sharedOn ? (
          <Banner tone="info" title={`Shared on ${formatDate(b.sharedOn)} by ${b.sharedBy ?? "unknown"}`}>
            The budget was saved with <em>Save &amp; share</em>. The stakeholders to notify are to be
            configured in the system later, so{" "}
            <strong>no notification was sent and no recipient is recorded</strong> — this stamp says only that
            sharing was asked for. Nothing downstream reads it.
          </Banner>
        ) : null}

        <Banner tone="warn" title="The approval status shown above carries no meaning in this prototype">
          It is printed exactly as it was typed. The business instruction of 26 August 2026 that added the
          field states no values, no owner and no effect, so no tone is derived from the text, no sequence
          between values is enforced, and no screen or service call reads it. In particular a budget with no
          approval status, or one whose status is not <em>approved</em> by any reading, is still visible to{" "}
          <Link to="/sourcing/funds">Phase 03, funds</Link> and to every later phase — because §6.2 states
          that nothing is gated on it and this prototype does not invent the gate.
        </Banner>

        <div className="grid-3">
          <SummaryCard title="Budget period">
            <FieldGrid
              columns={1}
              fields={[
                { label: "From date", value: formatDate(b.fromDate), behaviour: "required" },
                { label: "To date", value: formatDate(b.toDate), behaviour: "required" },
                {
                  label: "Given as",
                  value: "calendar dates",
                  hint: "§6.2's own note: the budget period is dates, while the seasonal period of §6.1 is a month and a year. The difference is the requirement's, not ours.",
                },
                { label: "Approval status", value: b.approvalStatus },
              ]}
            />
          </SummaryCard>

          <SummaryCard title="Budgeted">
            <FieldGrid
              columns={1}
              fields={[
                { label: "Quantity", value: formatMt(totals.quantityMt), behaviour: "calculated" },
                {
                  label: "Amount",
                  value: totals.amounts.length > 0 ? formatAmounts(totals.amounts) : undefined,
                  behaviour: "calculated",
                  hint: "One total per currency. §6.2 asks what currency Amount is in, so nothing is added across currencies.",
                },
                { label: "Lines", value: formatNumber(totals.lines), behaviour: "calculated" },
                { label: "Plans named", value: formatNumber(totals.plans), behaviour: "calculated" },
                { label: "Suppliers named", value: formatNumber(totals.suppliers), behaviour: "calculated" },
              ]}
            />
          </SummaryCard>

          <SummaryCard
            title="What is outstanding"
            tone={gaps.complete ? "ok" : "warn"}
            footer={
              <span className="small muted">
                Reported, not enforced. §6.2 states no validation and no blocking control.
              </span>
            }
          >
            <FieldGrid
              columns={1}
              fields={[
                { label: "Lines without a plan", value: formatNumber(gaps.linesWithoutPlan) },
                { label: "Lines without a quantity", value: formatNumber(gaps.linesWithoutQuantity) },
                { label: "Lines without an amount", value: formatNumber(gaps.linesWithoutAmount) },
                { label: "Lines without a supplier", value: formatNumber(gaps.linesWithoutSupplier) },
                {
                  label: "Approval status",
                  value: gaps.approvalStatusRecorded ? "recorded" : "not recorded",
                },
              ]}
            />
          </SummaryCard>
        </div>

        <CollapsibleSection title={`Budget information — ${b.lines.length} line(s)`} defaultOpen>
          <div className="dtable__scroll">
            <table className="dtable__table">
              <caption className="sr-only">
                Every budget line, with the plan, the commodity, the quantity, the amount and the supplier
              </caption>
              <thead>
                <tr>
                  <th scope="col">Plan</th>
                  <th scope="col">Commodity</th>
                  <th scope="col" className="text-right">
                    Planned on the plan
                  </th>
                  <th scope="col" className="text-right">
                    Quantity (MT)
                  </th>
                  <th scope="col" className="text-right">
                    Amount
                  </th>
                  <th scope="col">Supplier</th>
                </tr>
              </thead>
              <tbody>
                {b.lines.map((l) => {
                  const p = planRows.find((x) => x.id === l.seasonalPlanId);
                  const planned = p ? plannedForCommodity(p, l.commodityId) : undefined;
                  const offPlan = Boolean(p && l.commodityId && !planCarriesCommodity(p, l.commodityId));
                  return (
                    <tr key={l.id}>
                      <th scope="row">
                        {p ? (
                          <>
                            <Link className="mono" to={`/sourcing/plans/${p.id}`}>
                              {p.planRef}
                            </Link>
                            <br />
                            {planStatusChip(p)}
                          </>
                        ) : (
                          <span className="muted">no plan recorded</span>
                        )}
                      </th>
                      <td>
                        {l.commodityId ? (
                          <>
                            {commodityName(l.commodityId)}
                            {commodityGroupOf(l.commodityId) ? (
                              <>
                                <br />
                                <span className="xsmall muted">{commodityGroupOf(l.commodityId)}</span>
                              </>
                            ) : null}
                            {offPlan ? (
                              <>
                                {" "}
                                <StatusChip
                                  tone="risk"
                                  label="not on this plan"
                                  size="sm"
                                  title="A budget line may only name a commodity the selected plan carries. This one predates that rule or its plan has changed since."
                                />
                              </>
                            ) : null}
                          </>
                        ) : (
                          <span className="muted">no commodity recorded</span>
                        )}
                      </td>
                      <td className="text-right">
                        {planned ? formatMt(planned.plannedMt) : <span className="muted">–</span>}
                      </td>
                      <td className="text-right">
                        {l.quantityMt === undefined ? (
                          <span className="muted">–</span>
                        ) : (
                          formatMt(l.quantityMt)
                        )}
                      </td>
                      <td className="text-right">
                        {l.amount ? formatMoney(l.amount) : <span className="muted">–</span>}
                      </td>
                      <td>
                        {l.supplierId ? (
                          counterpartyName(l.supplierId)
                        ) : (
                          <span className="muted">no supplier recorded</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td>{formatNumber(totals.commodities)} commodity(ies)</td>
                  <td />
                  <td className="text-right">
                    <strong>{formatMt(totals.quantityMt)}</strong>
                  </td>
                  <td className="text-right">
                    <strong>{formatAmounts(totals.amounts)}</strong>
                  </td>
                  <td>
                    {totals.linesWithoutAmount > 0 ? (
                      <span className="small muted">
                        {totals.linesWithoutAmount} line(s) carry no amount and are in no total
                      </span>
                    ) : null}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="small muted" style={{ marginTop: "0.5rem" }}>
            A business instruction of 27 August 2026 gives a budget line its <em>commodity</em>, and narrows
            both of the Create screen's drop-downs: only <strong>active</strong> plans are offered, and only
            the commodities <strong>the selected plan carries</strong>. <em>Planned on the plan</em> is read
            from the plan and is ours, shown so the budgeted quantity has something to be read against.
          </p>
        </CollapsibleSection>

        {namedPlans.map((p) => {
          const cmp = budgetAgainstPlan(b, p);
          return (
            <CollapsibleSection
              key={p.id}
              title={`Against ${p.planRef} — ${formatSeasonMonth(p.from)} to ${formatSeasonMonth(p.to)}`}
              defaultOpen
              indicator={
                <StatusChip
                  tone={cmp.periodFit === "inside" ? "ok" : "warn"}
                  label={`budget period ${cmp.periodFit}`}
                  size="sm"
                />
              }
            >
              <FieldGrid
                fields={[
                  {
                    label: "Budgeted against this plan",
                    value: formatMt(cmp.budgetQuantityMt),
                    behaviour: "calculated",
                  },
                  {
                    label: "Planned on the plan",
                    value: formatMt(cmp.plannedQuantityMt),
                    behaviour: "calculated",
                  },
                  {
                    label: "Variance",
                    value: (
                      <strong>
                        {cmp.varianceMt > 0 ? "+" : ""}
                        {formatMt(cmp.varianceMt)}
                      </strong>
                    ),
                    behaviour: "calculated",
                    hint: "Budget minus plan. Whether the two must reconcile is a business confirmation §6.2 raises and does not answer.",
                  },
                  {
                    label: "Budget period against the seasonal period",
                    value: cmp.periodFit,
                    behaviour: "calculated",
                    hint: "Whether the budget period must fall inside the seasonal period is likewise open.",
                  },
                ]}
              />
              <TotalBanner
                label={`Variance against ${p.planRef}`}
                value={`${cmp.varianceMt > 0 ? "+" : ""}${formatMt(cmp.varianceMt)}`}
                derivation={`${formatMt(cmp.budgetQuantityMt)} budgeted − ${formatMt(
                  cmp.plannedQuantityMt,
                )} planned · shown, not enforced`}
              />

              <div className="dtable__scroll" style={{ marginTop: "0.75rem" }}>
                <table className="dtable__table">
                  <caption className="sr-only">
                    Budgeted against planned, per commodity, for {p.planRef}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Commodity</th>
                      <th scope="col">Group</th>
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
                    {budgetByCommodity(b, p).map((c) => (
                      <tr key={c.commodityId}>
                        <th scope="row">{c.name}</th>
                        <td>{c.group ?? <span className="muted">–</span>}</td>
                        <td className="text-right">
                          {c.budgetedMt === 0 ? (
                            <span className="muted">not budgeted</span>
                          ) : (
                            formatMt(c.budgetedMt)
                          )}
                        </td>
                        <td className="text-right">
                          {c.plannedMt === 0 ? (
                            <span className="muted">nothing planned</span>
                          ) : (
                            formatMt(c.plannedMt)
                          )}
                        </td>
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
              <p className="small muted" style={{ marginTop: "0.5rem" }}>
                Now that a line names a commodity, §6.2's reconciliation question can be asked at the level
                the plan is written at rather than only in total. Every commodity{" "}
                <span className="mono">{p.planRef}</span> carries is listed, including those this budget does
                not mention — a gap is the interesting case. Still shown, still not enforced.
              </p>
            </CollapsibleSection>
          );
        })}

        <CollapsibleSection title="Open questions on this phase" defaultOpen={false}>
          <p className="small">
            §6.2 is <strong>[PROPOSED]</strong> throughout, and carries these business confirmations — three
            of them on the approval status alone. Nothing on this screen answers one of them.
          </p>
          <ul className="small">
            {BUDGET_OPEN_QUESTIONS.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <p className="small muted">
            One further boundary question stands from v2.2 and is not resolved here: how the budget relates to
            the costing module and the costing snapshot of §6.8. No relationship is asserted between the
            budget amount and that snapshot, because the requirement states none.
          </p>
        </CollapsibleSection>

        {b.note ? (
          <CollapsibleSection title="Notes" defaultOpen>
            <p>{b.note}</p>
          </CollapsibleSection>
        ) : null}
      </div>
    </>
  );
}
