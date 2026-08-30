/**
 * The export process map — the sixteen phases of workflow v2.0 (24 August 2026) and
 * the screen that serves each one.
 *
 * What this screen serves. §5 of v2.0 (the phase table), §14 (the open decisions),
 * §14.1 (the outstanding master data) and §16 (the phase numbering and the six phases
 * that had no screen). It exists so a reviewer can walk the whole journey on the
 * screen, in order, without the document open beside them.
 *
 * Where the content comes from. Every phase number, name, owner, key output, evidence
 * class, coverage class, P-number cross-reference, screen route and decision id is
 * read from `domain/workflow.ts`. Nothing is restated as a literal here: if the phase
 * model changes, this page changes with it and cannot drift from it.
 *
 * What is deliberately absent.
 *  · The thirty-seven milestones and their day-ranges. Those belong to `PhaseId`
 *    (P1–P14) in `domain/milestones.ts` and are shown on the shipment and dashboard
 *    screens, not here. This page is the sixteen-phase model and its cross-reference.
 *  · Any progress, completion or health figure per phase. v2.0 §5 records what each
 *    phase produces and who owns it; it records no measure of how well any of it is
 *    going, and none is invented.
 *  · Any owner for an open decision beyond the suggested owner v2.0 §14 names, and
 *    any target date for one — the document gives none.
 */

import { Link } from "react-router-dom";
import { PHASE_BY_ID } from "../domain/milestones";
import type { PhaseId, StatusTone } from "../domain/types";
import {
  OPEN_DECISIONS,
  OUTSTANDING_MASTER_DATA,
  WORKFLOW_PHASES,
  type PhaseCoverage,
  type PhaseEvidence,
  type WorkflowPhase,
  workflowPhasesForSourcePhase,
} from "../domain/workflow";
import { Banner, StatusChip } from "../components/feedback";
import { CollapsibleSection, PageHeader, SummaryCard } from "../components/layout";
import { DataTable, type Column } from "../components/table";

/** How far the prototype covers a phase — the three values of `PhaseCoverage`. */
const COVERAGE_LABEL: Record<PhaseCoverage, string> = {
  covered: "Already covered",
  extended: "Extended for v2.0",
  new: "New screen",
};

const COVERAGE_CAPTION: Record<PhaseCoverage, string> = {
  covered:
    "The prototype already served this phase and v2.0 changed nothing about it. The screens are unaltered.",
  extended:
    "An existing screen that gained something in v2.0 — a new field, a new state, a new section — on top of what it already did.",
  new: "A phase that had no screen at all before this version. The route did not exist.",
};

const COVERAGE_TONE: Record<PhaseCoverage, StatusTone> = {
  covered: "ok",
  extended: "accent",
  new: "warn",
};

/** v2.0 §5 "Evidence" column, with the meaning the document gives each value. */
const EVIDENCE_CAPTION: Record<PhaseEvidence, string> = {
  Existing: "documented in the previous documentation workflow",
  New: "from the workshop notes only",
  Both: "reconciled from the two sources",
};

const EVIDENCE_TONE: Record<PhaseEvidence, StatusTone> = {
  Existing: "info",
  New: "warn",
  Both: "ok",
};

const COVERAGE_ORDER: PhaseCoverage[] = ["covered", "extended", "new"];
const EVIDENCE_ORDER: PhaseEvidence[] = ["Existing", "New", "Both"];

/** The v2.0 §16.1 sentence that made the six uncovered phases the work of this version. */
const SECTION_16_1 =
  "Six phases have no screen. Phases 01, 02, 04, 06, 10 and, in part, 05 exist in this document and nowhere in the prototype.";

interface DecisionRow {
  id: string;
  decision: string;
  owner: string;
  phases: WorkflowPhase[];
}

interface MasterDataRow {
  id: string;
  dataSet: string;
  owner: string;
  blocks: string;
}

/** The P-number cross-reference for one phase, or the reason it has none. */
function SourcePhases({ phase }: { phase: WorkflowPhase }) {
  if (phase.sourcePhases.length === 0) {
    return <span className="small muted">No P-number — this phase was never documented.</span>;
  }
  return (
    <span className="small">
      {phase.sourcePhases.map((p: PhaseId, i) => {
        const shared = workflowPhasesForSourcePhase(p).filter((x) => x.id !== phase.id);
        return (
          <span key={p}>
            {i > 0 ? "; " : ""}
            <strong className="mono">{p}</strong> {PHASE_BY_ID[p]?.name ?? "unnamed"}
            {shared.length > 0 ? ` — also serves phase ${shared.map((x) => x.number).join(" and ")}` : ""}
          </span>
        );
      })}
      {phase.sourcePhaseNote ? (
        <span className="fgrid__hint" style={{ display: "block" }}>
          {phase.sourcePhaseNote}
        </span>
      ) : null}
    </span>
  );
}

export function ProcessMapPage() {
  const phases = WORKFLOW_PHASES;

  const byCoverage = (c: PhaseCoverage) => phases.filter((p) => p.coverage === c);
  const byEvidence = (e: PhaseEvidence) => phases.filter((p) => p.evidence === e);

  const decisionRows: DecisionRow[] = Object.entries(OPEN_DECISIONS).map(([id, d]) => ({
    id,
    decision: d.title,
    owner: d.owner,
    phases: phases.filter((p) => p.openDecisions.includes(id)),
  }));

  const masterDataRows: MasterDataRow[] = OUTSTANDING_MASTER_DATA.map((m, i) => ({
    id: `md-${i + 1}`,
    dataSet: m.dataSet,
    owner: m.owner,
    blocks: m.blocks,
  }));

  const newPhases = byCoverage("new");
  const withPNumber = phases.filter((p) => p.sourcePhases.length > 0);

  const decisionColumns: Column<DecisionRow>[] = [
    {
      key: "id",
      header: "Decision",
      cell: (d) => <span className="mono">{d.id}</span>,
      sortValue: (d) => d.id,
    },
    {
      key: "decision",
      header: "What has not been decided",
      cell: (d) => <span className="small">{d.decision}</span>,
      sortValue: (d) => d.decision,
    },
    {
      key: "owner",
      header: "Suggested owner",
      cell: (d) => <span className="small">{d.owner}</span>,
      sortValue: (d) => d.owner,
    },
    {
      key: "phases",
      header: "Shown on phases",
      cell: (d) =>
        d.phases.length === 0 ? (
          <span className="small muted">no phase screen carries it</span>
        ) : (
          <span className="row">
            {d.phases.map((p) => (
              <StatusChip key={p.id} tone="info" label={p.number} title={p.name} size="sm" />
            ))}
          </span>
        ),
      sortValue: (d) => d.phases.length,
    },
  ];

  const masterDataColumns: Column<MasterDataRow>[] = [
    { key: "dataSet", header: "Data set", cell: (m) => m.dataSet, sortValue: (m) => m.dataSet },
    { key: "owner", header: "Owner named", cell: (m) => m.owner, sortValue: (m) => m.owner },
    {
      key: "blocks",
      header: "What it blocks",
      cell: (m) => <span className="small">{m.blocks}</span>,
      sortValue: (m) => m.blocks,
    },
  ];

  return (
    <>
      <PageHeader
        moduleLabel="Overview"
        crumbs={[{ label: "Home", to: "/" }, { label: "Export process map" }]}
        title="Export process map"
        meta="Sixteen phases, from the trader's offer to payment and close-out"
        recordKey={`${phases.length}`}
        recordDate="phases"
      />

      <div className="page">
        <Banner tone="info" title="What the P-numbers are">
          Workflow v2.0 keeps the previous document's P-numbering deliberately, as a cross-reference, so the
          two can be read side by side. {withPNumber.length} of the {phases.length} phases carry a P-number
          and the other {phases.length - withPNumber.length} carry none. A P-number is not a phase number —
          one P-number can serve two v2.0 phases, and the cross-reference on each phase below says when it
          does.
        </Banner>

        <Banner tone="warn" title="A count the source gives two ways">
          §5's prose says &quot;six phases have no P-number because they were not documented&quot;, and §16.1
          names six phases as having no screen — 01, 02, 04, 06, 10 and, in part, 05. But §5's own table
          prints &quot;—&quot; in the source-phase column for {phases.length - withPNumber.length} rows only:{" "}
          {phases
            .filter((p) => p.sourcePhases.length === 0)
            .map((p) => p.number)
            .join(", ")}
          . Phases 05, 06 and 10 each carry one. The table is the harder evidence and is what this screen
          follows; the prose count has not been silently adopted. Separately, §5 gives phase 06 as P3–P7 and
          phase 07 as P6–P8, so P6 and P7 appear against both — the cross-reference on phase 06 says how that
          overlap has been read.
        </Banner>

        <div className="grid-4">
          {COVERAGE_ORDER.map((c) => (
            <SummaryCard key={c} title={COVERAGE_LABEL[c]} tone={COVERAGE_TONE[c]}>
              <p className="page__title">{byCoverage(c).length}</p>
              <p className="small muted">{COVERAGE_CAPTION[c]}</p>
              <p className="xsmall muted" style={{ marginTop: "0.5rem" }}>
                Phases{" "}
                {byCoverage(c)
                  .map((p) => p.number)
                  .join(", ") || "none"}
                .
              </p>
            </SummaryCard>
          ))}
          <SummaryCard title="Evidence behind the sixteen" tone="info">
            <p className="page__title">{EVIDENCE_ORDER.map((e) => byEvidence(e).length).join(" / ")}</p>
            <p className="small muted">
              {EVIDENCE_ORDER.map((e) => `${byEvidence(e).length} ${e}`).join(", ")}. In v2.0 §5,{" "}
              <strong>Existing</strong> means {EVIDENCE_CAPTION.Existing}; <strong>New</strong> means{" "}
              {EVIDENCE_CAPTION.New}; <strong>Both</strong> means {EVIDENCE_CAPTION.Both}.
            </p>
          </SummaryCard>
        </div>

        {phases.map((p, i) => (
          <CollapsibleSection
            key={p.id}
            title={`${p.number} — ${p.name}`}
            defaultOpen={i < 3}
            indicator={
              <StatusChip
                tone={COVERAGE_TONE[p.coverage]}
                label={COVERAGE_LABEL[p.coverage]}
                title={COVERAGE_CAPTION[p.coverage]}
                size="sm"
              />
            }
          >
            <div className="grid-2">
              <div className="stack">
                <p className="small">
                  <span className="muted">Owner</span>
                  <br />
                  <strong>{p.ownerLabel}</strong>
                </p>
                <p className="small">
                  <span className="muted">Key output</span>
                  <br />
                  <strong>{p.keyOutput}</strong>
                </p>
                <p className="small">
                  <span className="muted">Source phase, as a cross-reference</span>
                  <br />
                  <SourcePhases phase={p} />
                </p>
              </div>
              <div className="stack">
                <p className="small">
                  <span className="muted">Evidence (v2.0 §5)</span>
                  <br />
                  <StatusChip
                    tone={EVIDENCE_TONE[p.evidence]}
                    label={p.evidence}
                    title={EVIDENCE_CAPTION[p.evidence]}
                    size="sm"
                  />{" "}
                  <span className="small muted">{EVIDENCE_CAPTION[p.evidence]}</span>
                </p>
                <p className="small">
                  <span className="muted">Screens that serve this phase</span>
                </p>
                <p className="row">
                  {p.screens.map((s) => (
                    <Link key={`${p.id}-${s.to}`} className="btn btn--sm" to={s.to}>
                      {s.label}
                    </Link>
                  ))}
                </p>
                {p.openDecisions.length > 0 ? (
                  <p className="small">
                    <span className="muted">Open decisions shown on those screens</span>
                    <br />
                    <span className="row">
                      {p.openDecisions.map((id) => (
                        <StatusChip
                          key={id}
                          tone="warn"
                          label={id}
                          title={
                            OPEN_DECISIONS[id]
                              ? `${OPEN_DECISIONS[id].title} Suggested owner: ${OPEN_DECISIONS[id].owner}.`
                              : "This decision id is not in v2.0 §14."
                          }
                          size="sm"
                        />
                      ))}
                    </span>
                  </p>
                ) : (
                  <p className="small muted">No open decision from v2.0 §14 bears on this phase.</p>
                )}
              </div>
            </div>
          </CollapsibleSection>
        ))}

        <CollapsibleSection title="Open decisions" defaultOpen={false}>
          <p className="small">
            The decisions of v2.0 §14 that bear on a screen, with the owner the document suggests. Each one is
            also shown on the screens of the phases listed against it, so a reviewer meets it in context and
            not only here. No decision has a date, because the document gives none.
          </p>
          <DataTable
            caption="Open decisions from workflow v2.0 §14"
            rows={decisionRows}
            columns={decisionColumns}
            searchPlaceholder="Search by decision id, wording or owner…"
            searchValue={(d) => `${d.id} ${d.decision} ${d.owner}`}
            savedViews={[
              { key: "all", label: "All decisions" },
              {
                key: "onscreen",
                label: "Carried on a phase screen",
                description: "Shown in context on at least one of the sixteen phases.",
                predicate: (d) => d.phases.length > 0,
              },
              {
                key: "unplaced",
                label: "Not carried on any phase screen",
                description: "In v2.0 §14 but not attached to a phase in the map — stated, not hidden.",
                predicate: (d) => d.phases.length === 0,
              },
            ]}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Master data still outstanding" defaultOpen={false}>
          <p className="small">
            The five master data sets of v2.0 §14.1. None has been provided. Each names the person the
            document names and the phase it blocks; decision D-20 asks which of them are needed for the first
            release, and by when.
          </p>
          <DataTable
            caption="Outstanding master data from workflow v2.0 §14.1"
            rows={masterDataRows}
            columns={masterDataColumns}
            searchPlaceholder="Search by data set, owner or phase…"
            searchValue={(m) => `${m.dataSet} ${m.owner} ${m.blocks}`}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Phases that had no screen before this version" defaultOpen={false}>
          <blockquote className="small" style={{ margin: "0 0 0.75rem", paddingLeft: "1rem" }}>
            <p>"{SECTION_16_1}"</p>
            <p className="xsmall muted">Workflow v2.0 §16.1</p>
          </blockquote>
          <p className="small">
            {newPhases.length} of the {phases.length} phases are recorded as new, and phase 05 is recorded as
            extended because only part of it was missing. The routes now serving each are below.
          </p>
          <ul className="doclist">
            {newPhases.map((p) => (
              <li key={p.id}>
                <span className="doclist__name">
                  {p.number} — {p.name}
                  <span className="doclist__sub">
                    {p.ownerLabel} · {p.keyOutput}
                  </span>
                </span>
                <StatusChip tone={EVIDENCE_TONE[p.evidence]} label={p.evidence} size="sm" />
                <span className="row">
                  {p.screens.map((s) => (
                    <Link key={`${p.id}-new-${s.to}`} className="btn btn--sm" to={s.to}>
                      {s.label}
                    </Link>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      </div>
    </>
  );
}
