import React, { createContext, useContext, useState } from 'react';
import {
  ADJUSTMENT_TYPES, INCIDENTS, POLICIES, RECON_CYCLES, VARIANCE_CASES,
  type ActionItem, type Incident, type Policy, type ReconCycle, type ReconRow, type VarianceCase,
} from '../mockData/s04';

type Ctx = {
  cases: VarianceCase[];
  addCase: (c: VarianceCase) => void;
  updateCase: (id: string, patch: Partial<VarianceCase>) => void;
  /** confirm the adjustment type and re-evaluate the required evidence set */
  confirmType: (id: string, type: string) => void;
  advanceApproval: (id: string, decision: 'Approved' | 'Rejected' | 'Returned', comment: string) => void;

  /** labelled prototype control — see S04-uiux §6 */
  thresholdEnabled: boolean;
  setThresholdEnabled: (v: boolean) => void;
  threshold: number;
  setThreshold: (v: number) => void;

  cycles: ReconCycle[];
  updateCycle: (id: string, patch: Partial<ReconCycle>) => void;
  updateReconRow: (cycleId: string, rowId: string, patch: Partial<ReconRow>) => void;
  updateActionItem: (cycleId: string, itemId: string, patch: Partial<ActionItem>) => void;
  addActionItem: (cycleId: string, item: ActionItem) => void;

  incidents: Incident[];
  addIncident: (i: Incident) => void;
  updateIncident: (id: string, patch: Partial<Incident>) => void;
  policies: Policy[];
  updatePolicy: (id: string, patch: Partial<Policy>) => void;
};

const C = createContext<Ctx | null>(null);
export const useS04 = () => {
  const c = useContext(C);
  if (!c) throw new Error('S04Provider missing');
  return c;
};

/** Route steps required for a case, given the threshold assumption. */
export function routeFor(value: number, thresholdEnabled: boolean, threshold: number) {
  if (thresholdEnabled && value < threshold) return ['Compliance Manager'];
  return ['Compliance Manager', 'Head of Department', 'Finance Manager'];
}

export function S04Provider({ children }: { children: React.ReactNode }) {
  const [cases, setCases] = useState<VarianceCase[]>(() => JSON.parse(JSON.stringify(VARIANCE_CASES)));
  const [cycles, setCycles] = useState<ReconCycle[]>(() => JSON.parse(JSON.stringify(RECON_CYCLES)));
  const [incidents, setIncidents] = useState<Incident[]>(() => JSON.parse(JSON.stringify(INCIDENTS)));
  const [policies, setPolicies] = useState<Policy[]>(() => JSON.parse(JSON.stringify(POLICIES)));
  const [thresholdEnabled, setThresholdEnabled] = useState(false);
  const [threshold, setThreshold] = useState(1000);

  const value: Ctx = {
    cases,
    addCase: (c) => setCases((p) => [c, ...p]),
    updateCase: (id, patch) => setCases((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    confirmType: (id, type) =>
      setCases((p) =>
        p.map((c) => {
          if (c.id !== id) return c;
          const required = ADJUSTMENT_TYPES.find((t) => t.type === type)?.requires ?? [];
          // keep what has already been provided; re-evaluate the required set
          const evidence = required.map((item) => {
            const existing = c.evidence.find((e) => e.item === item);
            return existing ?? { item, provided: false };
          });
          return { ...c, confirmedType: type, evidence };
        }),
      ),
    advanceApproval: (id, decision, comment) =>
      setCases((p) =>
        p.map((c) => {
          if (c.id !== id) return c;
          const steps = routeFor(c.value, thresholdEnabled, threshold);
          const nextIndex = c.approvals.length;
          const step = steps[nextIndex] ?? steps[steps.length - 1];
          const approvals = [
            ...c.approvals,
            { step, decision, by: `${step} (demonstration role)`, on: '21-Aug-2026', comment },
          ];
          if (decision !== 'Approved') return { ...c, approvals, status: 'Rejected' as const };
          const done = approvals.length >= steps.length;
          const status = done
            ? ('Awaiting ERP confirmation' as const)
            : (`Pending ${steps[approvals.length]}` as any);
          return { ...c, approvals, status };
        }),
      ),

    thresholdEnabled,
    setThresholdEnabled,
    threshold,
    setThreshold,

    cycles,
    updateCycle: (id, patch) => setCycles((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    updateReconRow: (cycleId, rowId, patch) =>
      setCycles((p) =>
        p.map((c) => (c.id === cycleId ? { ...c, rows: c.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) } : c)),
      ),
    updateActionItem: (cycleId, itemId, patch) =>
      setCycles((p) =>
        p.map((c) => (c.id === cycleId ? { ...c, actions: c.actions.map((a) => (a.id === itemId ? { ...a, ...patch } : a)) } : c)),
      ),
    addActionItem: (cycleId, item) =>
      setCycles((p) => p.map((c) => (c.id === cycleId ? { ...c, actions: [...c.actions, item] } : c))),

    incidents,
    addIncident: (i) => setIncidents((p) => [i, ...p]),
    updateIncident: (id, patch) => setIncidents((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    policies,
    updatePolicy: (id, patch) => setPolicies((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x))),
  };

  return <C.Provider value={value}>{children}</C.Provider>;
}
