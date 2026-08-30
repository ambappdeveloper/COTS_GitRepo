/**
 * The two mandated status components.
 *
 *  C4 — LifecycleStepper: compact, one row, on contract and shipment summaries.
 *  C5 — ExecutionFlow: expanded serpentine flow, grouped into phase bands, with
 *       variant branching, interactive milestones and a contextual detail panel.
 *
 * Both are adapted from CTRM (docs/export/ctrm-ui-reference.md C4, C5) with three
 * deliberate departures:
 *   - state is carried by GLYPH + TEXT + COLOUR, never colour alone (anti-pattern A3)
 *   - milestones are real <button>s that update a detail panel, not decoration
 *   - inapplicable milestones render as "Not applicable" rather than pending,
 *     because the COTS process genuinely differs by country and shipment type
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MILESTONE_STATE_GLYPH,
  MILESTONE_STATE_LABEL,
  ROLE_LABEL,
  type MilestoneState,
} from "../domain/types";
import {
  EXECUTION_FLOW_BANDS,
  PHASE_BY_ID,
  type ResolvedMilestone,
  type ResolvedStep,
} from "../domain/milestones";
import { MILESTONE_BY_KEY } from "../domain/milestones";
import { formatDate } from "../domain/calc";
import { StatusChip } from "./feedback";
import "./status-flow.css";

const STATE_TONE: Record<MilestoneState, string> = {
  completed: "ok",
  in_progress: "accent",
  ready: "info",
  not_started: "idle",
  blocked: "risk",
  overdue: "risk",
  not_applicable: "na",
  cancelled: "na",
};

/* ------------------------------------------------------------------ *
 * C4 — compact lifecycle stepper
 * ------------------------------------------------------------------ */

export function LifecycleStepper({
  steps,
  caption,
  onSelect,
  selectedKey,
}: {
  steps: ResolvedStep[];
  caption: string;
  onSelect?: (step: ResolvedStep) => void;
  selectedKey?: string;
}) {
  return (
    <div className="stepper">
      <p className="sr-only">{caption}</p>
      <ol className="stepper__list">
        {steps.map((s, i) => {
          const tone = STATE_TONE[s.state];
          const isLast = i === steps.length - 1;
          return (
            <li
              key={s.key}
              className={`stepper__item stepper__item--${tone} ${selectedKey === s.key ? "stepper__item--selected" : ""}`}
            >
              <button
                type="button"
                className="stepper__btn"
                onClick={() => onSelect?.(s)}
                aria-pressed={selectedKey === s.key}
                aria-label={`${s.label} — ${MILESTONE_STATE_LABEL[s.state]}${s.date ? `, ${formatDate(s.date)}` : ""}`}
              >
                <span className="stepper__node" aria-hidden="true">
                  {MILESTONE_STATE_GLYPH[s.state]}
                </span>
                <span className="stepper__label">{s.label}</span>
                <span className="stepper__state">{MILESTONE_STATE_LABEL[s.state]}</span>
                <span className="stepper__date">{s.date ? formatDate(s.date) : "–"}</span>
              </button>
              {!isLast ? <span className="stepper__link" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * C5 — expanded execution flow
 * ------------------------------------------------------------------ */

export function ExecutionFlow({
  milestones,
  shipmentId,
  variantSummary,
}: {
  milestones: ResolvedMilestone[];
  shipmentId?: string;
  variantSummary?: string;
}) {
  const [selected, setSelected] = useState<string | null>(
    milestones.find((m) => m.state === "blocked" || m.state === "overdue")?.def.key ??
      milestones.find((m) => m.state === "in_progress")?.def.key ??
      milestones[0]?.def.key ??
      null,
  );
  const [showNa, setShowNa] = useState(false);

  const chosen = milestones.find((m) => m.def.key === selected) ?? null;

  const counts = milestones.reduce<Record<MilestoneState, number>>(
    (acc, m) => {
      acc[m.state] = (acc[m.state] ?? 0) + 1;
      return acc;
    },
    {} as Record<MilestoneState, number>,
  );

  return (
    <div className="eflow">
      <div className="eflow__toolbar">
        <div className="row">
          {(
            [
              "completed",
              "in_progress",
              "ready",
              "not_started",
              "blocked",
              "overdue",
              "not_applicable",
            ] as MilestoneState[]
          )
            .filter((s) => counts[s])
            .map((s) => (
              <StatusChip
                key={s}
                tone={STATE_TONE[s] as never}
                glyph={MILESTONE_STATE_GLYPH[s]}
                label={`${MILESTONE_STATE_LABEL[s]} · ${counts[s]}`}
                size="sm"
              />
            ))}
        </div>
        <label className="eflow__natoggle">
          <input type="checkbox" checked={showNa} onChange={(e) => setShowNa(e.target.checked)} />
          Show milestones that do not apply to this variant
        </label>
      </div>

      {variantSummary ? <p className="eflow__variant">{variantSummary}</p> : null}

      <div className="eflow__bands">
        {EXECUTION_FLOW_BANDS.map((band) => {
          const inBand = milestones.filter(
            (m) => m.def.band === band && (showNa || m.state !== "not_applicable"),
          );
          if (inBand.length === 0) return null;
          const bandId = `band-${band.replace(/\W+/g, "-").toLowerCase()}`;
          return (
            <section className="eflow__band" key={band} role="group" aria-labelledby={bandId}>
              <h4 className="eflow__bandtitle" id={bandId}>
                {band}
                <span className="eflow__bandcount">
                  {inBand.filter((m) => m.state === "completed").length}/
                  {inBand.filter((m) => m.state !== "not_applicable").length}
                </span>
              </h4>
              <ol className="eflow__nodes">
                {inBand.map((m) => {
                  const tone = STATE_TONE[m.state];
                  const isSel = selected === m.def.key;
                  return (
                    <li key={m.def.key} className="eflow__nodewrap">
                      <button
                        type="button"
                        className={`eflow__node eflow__node--${tone} ${isSel ? "eflow__node--selected" : ""}`}
                        onClick={() => setSelected(m.def.key)}
                        aria-pressed={isSel}
                        aria-describedby="eflow-detail"
                      >
                        <span className="eflow__glyph" aria-hidden="true">
                          {MILESTONE_STATE_GLYPH[m.state]}
                        </span>
                        <span className="eflow__nodebody">
                          <span className="eflow__name">{m.def.name}</span>
                          <span className="eflow__nodemeta">
                            {MILESTONE_STATE_LABEL[m.state]}
                            {m.actualDate
                              ? ` · ${formatDate(m.actualDate)}`
                              : m.targetDate
                                ? ` · target ${formatDate(m.targetDate)}`
                                : ""}
                          </span>
                          {m.documentCompleteness !== undefined ? (
                            <span className="eflow__docs" title="Document completeness for this milestone">
                              <span className="eflow__docbar" aria-hidden="true">
                                <span style={{ width: `${Math.round(m.documentCompleteness * 100)}%` }} />
                              </span>
                              <span className="xsmall">{Math.round(m.documentCompleteness * 100)}% docs</span>
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>

      <div className="eflow__detail card" id="eflow-detail" aria-live="polite">
        {chosen ? (
          <MilestoneDetail m={chosen} shipmentId={shipmentId} />
        ) : (
          <p className="muted">Select a milestone to see its detail.</p>
        )}
      </div>
    </div>
  );
}

function MilestoneDetail({ m, shipmentId }: { m: ResolvedMilestone; shipmentId?: string }) {
  const phase = PHASE_BY_ID[m.def.phase];
  const tone = STATE_TONE[m.state];
  /**
   * Where the milestone's phase is worked. Phases whose module is a list rather than a
   * per-shipment workspace link to the list; the rest link to this shipment's own
   * workspace. `/origination`, `/allocation` and `/movement` are new in workflow v2.0
   * and are lists, not per-shipment workspaces — except movement, which is filtered by
   * shipment on its own screen.
   */
  const workspaceLink =
    shipmentId && phase
      ? phase.module === "/shipments"
        ? `/shipments/${shipmentId}/planning`
        : phase.module === "/clearance"
          ? `/clearance/${shipmentId}`
          : phase.module === "/stuffing"
            ? m.def.band === "Movement & stuffing request"
              ? `/movement`
              : `/stuffing/${shipmentId}`
            : phase.module === "/documents"
              ? `/documents/${shipmentId}`
              : phase.module === "/post-shipment"
                ? m.def.key === "customer_feedback_logged"
                  ? `/close-out`
                  : `/post-shipment/${shipmentId}`
                : phase.module === "/pre-clearance"
                  ? m.def.key === "advance_payment_confirmed"
                    ? `/pre-clearance/advance-payments`
                    : `/pre-clearance`
                  : phase.module
      : undefined;

  return (
    <div className="mdetail">
      <div className="mdetail__head">
        <div>
          <h4 className="mdetail__title">{m.def.name}</h4>
          <p className="muted small">
            {m.def.phase} · {phase?.name} · band: {m.def.band}
          </p>
        </div>
        <StatusChip
          tone={tone as never}
          glyph={MILESTONE_STATE_GLYPH[m.state]}
          label={MILESTONE_STATE_LABEL[m.state]}
        />
      </div>

      <dl className="mdetail__grid">
        <div>
          <dt>Responsible</dt>
          <dd>{m.ownerName ?? ROLE_LABEL[m.def.owner]}</dd>
        </div>
        <div>
          <dt>{m.state === "completed" ? "Completed" : "Target date"}</dt>
          <dd>
            {formatDate(m.actualDate ?? m.targetDate)}
            {m.daysToTarget !== undefined && m.state !== "completed" ? (
              <span className={m.daysToTarget < 0 ? "mdetail__late" : "muted small"}>
                {" "}
                (
                {m.daysToTarget < 0
                  ? `${Math.abs(m.daysToTarget)} day(s) late`
                  : `${m.daysToTarget} day(s) left`}
                )
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>Prerequisites</dt>
          <dd>
            {m.def.prerequisites.length === 0 ? (
              <span className="muted">None</span>
            ) : (
              <ul className="mdetail__prereqs">
                {m.def.prerequisites.map((p) => (
                  <li key={p} className={m.unmetPrerequisites.includes(p) ? "unmet" : "met"}>
                    <span aria-hidden="true">{m.unmetPrerequisites.includes(p) ? "○" : "✓"}</span>{" "}
                    {MILESTONE_BY_KEY[p]?.name ?? p}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        {m.def.slaDays ? (
          <div>
            <dt>Target duration</dt>
            <dd>
              {m.def.slaDays} day{m.def.slaDays === 1 ? "" : "s"}
              {m.def.slaSource ? <span className="mdetail__src">{m.def.slaSource}</span> : null}
            </dd>
          </div>
        ) : null}
        {m.documentCompleteness !== undefined ? (
          <div>
            <dt>Document completeness</dt>
            <dd>
              {Math.round(m.documentCompleteness * 100)}% of the documents this milestone owns are at original
            </dd>
          </div>
        ) : null}
        {m.def.documents?.length ? (
          <div>
            <dt>Documents</dt>
            <dd>{m.def.documents.join(", ")}</dd>
          </div>
        ) : null}
      </dl>

      {m.blockingReason ? (
        <div className="mdetail__block" role="alert">
          <strong>Blocked.</strong> {m.blockingReason}
        </div>
      ) : null}
      {m.state === "not_applicable" ? (
        <div className="mdetail__na">
          <strong>Not applicable</strong> to this shipment's country or shipment-type variant, so it is
          neither pending nor overdue.
        </div>
      ) : null}
      {m.note ? <p className="mdetail__note">{m.note}</p> : null}

      <div className="mdetail__foot">
        {workspaceLink ? (
          <Link className="btn btn--primary btn--sm" to={workspaceLink}>
            Open {phase?.name}
          </Link>
        ) : null}
        <span className="mdetail__evidence" title="Source evidence for this milestone">
          Evidence: {m.def.evidence}
        </span>
      </div>
    </div>
  );
}
