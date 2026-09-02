/**
 * Export's contribution to the one Actions Inbox — WF-INT-14 / Step 6.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Until now `/inbox` read the Core and Shared task stores and linked *out* to Export's own two
 * queues. That left the Export module operating a worklist of its own, which is the one thing the
 * inbox screen says no module does. This file closes that gap by deriving Export rows for the same
 * list, so the inbox is one list and Export keeps no separate task queue.
 *
 * WHAT AN EXPORT TASK IS, AND WHY IT IS A MILESTONE
 * ------------------------------------------------
 * Export has no task table. What it has is the execution flow: `EXECUTION_FLOW` in
 * `domain/milestones.ts` defines every step of the process, and each definition already carries
 * the three things a task needs — a name, an owning function (`owner: Role`), and, through the
 * shipment record, a target date. An actionable milestone *is* a task; nothing had to be invented
 * to make one, and no Export mock data was rewritten.
 *
 * The routing rule this file applies (and the reason risks are absent):
 *
 *   · A milestone is a **task** — a named function must take one discrete action, and it is
 *     finished when the action is taken. Those become rows here.
 *   · A `RiskItem` is a **risk** — a rule breaching against a record, owned by a standing team,
 *     re-evaluated continuously, and answered by acknowledgement rather than completion. Those
 *     stay in `/exceptions`, which is the register built for them.
 *
 * So this file does not merge the exceptions queue into the inbox. Merging them would lose the
 * severity scale, the evidence paragraph and the acknowledgement state that make a risk usable,
 * and would put items in a task list that no one person can complete.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * -----------------------------
 * *Business confirmation required:* the origin-side records of phases 01–07 — seasonal purchase
 * plan, budget, purchase agreement, fund — carry **no approval state at all** in the Export model.
 * `Budget.approvalStatus` is free text added by the business instruction of 26 August 2026, which
 * names no values, no owner and no effect, and gates nothing downstream. The permission catalogue
 * does hold `SOURCING_PLAN.APPROVE`, so the permission exists and the workflow step does not.
 * No approval task is emitted for those phases here, because emitting one would assert a gate the
 * workflow has not defined. The same applies to charge and claim approval, where the Export
 * workflow's own open question is who approves and to what authority limit.
 */

import React from 'react';
import { api, resolvedMilestonesFor } from '@export/services/store';
import { TODAY } from '@export/domain/calc';
import { PHASE_BY_ID } from '@export/domain/milestones';
import { ROLE_LABEL, type Role, type Shipment } from '@export/domain/types';

/**
 * One task vocabulary for every module — see `KIND_ORDER` in the inbox.
 *
 * `Kind` is urgency, never category. The Export milestone states carry category information too
 * (`blocked`, `ready`), and that belongs in the task title or the owning screen, not in this column.
 */
export type TaskKind = 'Overdue' | 'Urgent' | 'Open' | 'Job';

export interface ExportTask {
  id: string;
  /** what must be done */
  title: string;
  /** the phase that raised it, in the phase's own words */
  raisedIn: string;
  /** the business record — `shipmentNo` is the `PC.n` key the rest of the process uses */
  record: string;
  /** ISO 8601. One date format for the whole inbox; formatting happens at render. */
  raised: string;
  due?: string;
  kind: TaskKind;
  /** the owning function. Export work is owned by a team, not by whoever is looking at the screen. */
  owner: Role;
  ownerLabel: string;
  /** the shipment detail screen — the record that owns the milestone */
  route: string;
  /** shown in the row's tooltip, so an approver can judge without leaving the list */
  evidence: string;
}

/** Milestone states that still need someone to act. */
function isActionable(state: string): boolean {
  return state !== 'completed' && state !== 'not_applicable';
}

/**
 * Urgency from the dates the shipment already carries.
 *
 * `blocked` counts as Urgent even when its target date is comfortable: a blocked milestone is
 * work that has stopped, and the owning team is the only one who can unblock it.
 */
function kindOf(state: string, targetDate: string | undefined, today: string): TaskKind {
  if (targetDate && targetDate < today) return 'Overdue';
  if (state === 'blocked') return 'Urgent';
  if (targetDate === today) return 'Urgent';
  return 'Open';
}

/**
 * Derive the Export rows for one shipment.
 *
 * Only milestones with a target date are emitted. An undated milestone has nothing to be late
 * against and no basis for a position in a work list; it stays visible on the shipment's own
 * execution flow, where the sequence explains it.
 */
function tasksForShipment(shipment: Shipment, today: string): ExportTask[] {
  return resolvedMilestonesFor(shipment)
    .filter((m) => isActionable(m.state) && m.targetDate)
    .map((m) => {
      const phase = PHASE_BY_ID[m.def.phase];
      const owner = (m.def.owner ?? 'logistics') as Role;
      return {
        id: `export-${shipment.id}-${m.def.key}`,
        title: m.def.name,
        raisedIn: `${m.def.phase} ${phase?.name ?? ''}`.trim(),
        record: shipment.shipmentNo,
        raised: shipment.createdDate,
        due: m.targetDate,
        kind: kindOf(m.state, m.targetDate, today),
        owner,
        ownerLabel: ROLE_LABEL[owner] ?? owner,
        route: `/shipments/${shipment.id}`,
        evidence:
          m.blockingReason ??
          (m.unmetPrerequisites.length
            ? `Waiting on ${m.unmetPrerequisites.length} earlier milestone(s)`
            : m.def.evidence),
      };
    });
}

export interface ExportTaskState {
  tasks: ExportTask[];
  loading: boolean;
  /** set when the Export store could not be read, so the inbox can say so instead of showing zero */
  error: string | null;
}

/**
 * Read the Export store and derive the inbox rows.
 *
 * The Export store is promise-based with a simulated latency, unlike the Core and Shared stores
 * which are synchronous. That is why the inbox has a real loading state: Export rows arrive a
 * moment after the others, and a list that silently rendered without them would be wrong rather
 * than merely slow.
 */
export function useExportTasks(): ExportTaskState {
  const [tasks, setTasks] = React.useState<ExportTask[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let live = true;
    api
      .listShipments()
      .then((shipments: Shipment[]) => {
        if (!live) return;
        const open = shipments.filter((s) => s.status !== 'closed' && s.status !== 'cancelled');
        setTasks(open.flatMap((s) => tasksForShipment(s, TODAY)));
        setLoading(false);
      })
      .catch(() => {
        if (!live) return;
        setError('The Export module’s shipments could not be read, so its tasks are not listed.');
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  return { tasks, loading, error };
}

/** The owning functions present in a set of tasks, for the owner filter. */
export function ownersOf(tasks: ExportTask[]): { role: Role; label: string; count: number }[] {
  const counts = new Map<Role, number>();
  for (const t of tasks) counts.set(t.owner, (counts.get(t.owner) ?? 0) + 1);
  return [...counts.entries()]
    .map(([role, count]) => ({ role, label: ROLE_LABEL[role] ?? role, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
