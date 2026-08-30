import React, { createContext, useContext, useMemo, useState } from 'react';
import { SEASONS } from '../mockData/master';
import {
  MASTER_PLANS,
  PROCESSING_ROWS,
  SOURCING_AGREEMENTS,
  SOURCING_ROWS,
  WAREHOUSE_ROWS,
  type MasterPlan,
  type PlanRow,
  type PlanStatus,
  type ProcessingRow,
  type SourcingAgreement,
  type SourcingRow,
  type WarehouseRow,
} from '../mockData/s01';

export type Task = {
  id: string;
  title: string;
  module: string;
  workflow: string;
  route: string;
  raisedOn: string;
  kind: 'approval' | 'job' | 'action';
};

type Ctx = {
  country: string;
  setCountry: (c: string) => void;
  seasonId: string;
  setSeasonId: (s: string) => void;

  plans: MasterPlan[];
  plan: MasterPlan | undefined; // plan for active country + season
  createPlan: () => string | null;
  updateRows: (ref: string, rows: PlanRow[]) => void;
  setPlanStatus: (ref: string, status: PlanStatus, note?: string) => void;
  newVersionFrom: (ref: string, reason: string) => void;

  agreements: SourcingAgreement[];
  addAgreement: (a: SourcingAgreement) => void;
  sourcing: SourcingRow[];
  updateSourcing: (rows: SourcingRow[]) => void;

  processing: ProcessingRow[];
  updateProcessing: (rows: ProcessingRow[]) => void;

  warehouses: WarehouseRow[];
  confirmedStorage: string[];
  confirmStorage: (code: string) => void;
  warehouseRequests: { code: string; capacity: number; outcome: 'Pending' | 'Approved' | 'Not approved' }[];
  raiseWarehouseRequest: (code: string, capacity: number) => void;
  resolveWarehouseRequest: (code: string, outcome: 'Approved' | 'Not approved') => void;

  tasks: Task[];
  removeTask: (id: string) => void;

  toast: string | null;
  say: (m: string) => void;
  clearToast: () => void;
};

const StoreContext = createContext<Ctx | null>(null);

export const useStore = () => {
  const c = useContext(StoreContext);
  if (!c) throw new Error('StoreProvider missing');
  return c;
};

const today = '19-Aug-2026';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountry] = useState('Sudan');
  const [seasonId, setSeasonId] = useState('SD-2526');
  const [plans, setPlans] = useState<MasterPlan[]>(() => JSON.parse(JSON.stringify(MASTER_PLANS)));
  const [agreements, setAgreements] = useState<SourcingAgreement[]>(SOURCING_AGREEMENTS);
  const [sourcing, setSourcing] = useState<SourcingRow[]>(SOURCING_ROWS);
  const [processing, setProcessing] = useState<ProcessingRow[]>(PROCESSING_ROWS);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>(WAREHOUSE_ROWS);
  const [confirmedStorage, setConfirmedStorage] = useState<string[]>([]);
  const [warehouseRequests, setWarehouseRequests] = useState<Ctx['warehouseRequests']>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'T-1',
      title: 'Processing plan update due — Gedaref Mill',
      module: 'S01',
      workflow: 'WF-S01-03 / Step 7 (C5 automated job)',
      route: '/s01/processing',
      raisedOn: today,
      kind: 'job',
    },
  ]);

  const plan = useMemo(
    () => plans.find((p) => p.country === country && p.seasonId === seasonId),
    [plans, country, seasonId],
  );

  const say = (m: string) => setToast(m);

  const mutatePlan = (ref: string, fn: (p: MasterPlan) => void) =>
    setPlans((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as MasterPlan[];
      const p = next.find((x) => x.ref === ref);
      if (p) fn(p);
      return next;
    });

  const updateRows = (ref: string, rows: PlanRow[]) =>
    mutatePlan(ref, (p) => {
      const v = p.versions.find((x) => x.version === p.activeVersion);
      if (v) v.rows = rows;
      p.lastUpdatedBy = 'A. Osman';
      p.lastUpdatedAt = `${today} (this session)`;
    });

  const setPlanStatus = (ref: string, status: PlanStatus, note?: string) =>
    mutatePlan(ref, (p) => {
      p.status = status;
      const v = p.versions.find((x) => x.version === p.activeVersion);
      if (v) v.status = status;
      if (status === 'Approved' && v) {
        v.approvedBy = 'H. Suleiman (Country Manager)';
        v.approvedOn = today;
        v.effectiveFrom = today;
      }
      if (note && v) v.reason = note;
    });

  const newVersionFrom = (ref: string, reason: string) =>
    mutatePlan(ref, (p) => {
      const current = p.versions.find((x) => x.version === p.activeVersion);
      if (!current) return;
      current.status = 'Superseded';
      current.effectiveTo = today;
      const nv = p.activeVersion + 1;
      p.versions.push({
        version: nv,
        status: 'Draft',
        changedBy: 'A. Osman',
        changedOn: today,
        reason,
        rows: JSON.parse(JSON.stringify(current.rows)),
      });
      p.activeVersion = nv;
      p.status = 'Draft';
    });

  const raiseWarehouseRequest = (code: string, capacity: number) => {
    setWarehouseRequests((prev) => [...prev, { code, capacity, outcome: 'Pending' }]);
    setTasks((prev) => [
      ...prev,
      {
        id: `T-WH-${code}`,
        title: `New warehouse request — ${code} (${capacity} MT)`,
        module: 'S01',
        workflow: 'WF-S01-04 / Step 5 → multi-department approval (C4)',
        route: '/s01/warehouse',
        raisedOn: today,
        kind: 'approval',
      },
    ]);
  };

  const resolveWarehouseRequest = (code: string, outcome: 'Approved' | 'Not approved') => {
    setWarehouseRequests((prev) => prev.map((r) => (r.code === code ? { ...r, outcome } : r)));
    if (outcome === 'Approved') {
      const req = warehouseRequests.find((r) => r.code === code);
      if (req) {
        setWarehouses((prev) =>
          prev.map((w) => (w.code === code ? { ...w, capacityMt: w.capacityMt + req.capacity } : w)),
        );
      }
    }
    setTasks((prev) => prev.filter((t) => t.id !== `T-WH-${code}`));
  };

  const value: Ctx = {
    country,
    setCountry: (c) => {
      setCountry(c);
      const s = SEASONS.find((x) => x.country === c && x.status === 'Open');
      if (s) setSeasonId(s.id);
    },
    seasonId,
    setSeasonId,
    plans,
    plan,
    createPlan: () => {
      if (plan) return null; // one master plan per country and season
      const ref = `MP-${country.slice(0, 2).toUpperCase()}-${seasonId.split('-')[1] ?? 'NEW'}`;
      setPlans((prev) => [
        ...prev,
        {
          ref,
          country,
          seasonId,
          activeVersion: 1,
          status: 'Draft',
          lastUpdatedBy: 'A. Osman',
          lastUpdatedAt: `${today} (this session)`,
          lockedSections: [],
          versions: [
            { version: 1, status: 'Draft', changedBy: 'A. Osman', changedOn: today, reason: 'New season baseline', rows: [] },
          ],
        },
      ]);
      return ref;
    },
    updateRows,
    setPlanStatus: (ref, status, note) => {
      setPlanStatus(ref, status, note);
      if (status === 'Pending Approval') {
        setTasks((prev) => [
          ...prev,
          {
            id: `T-AP-${ref}`,
            title: `Approve master season plan — ${ref}`,
            module: 'S01',
            workflow: 'WF-S01-01 / Step 7 (C4 approval)',
            route: `/s01/plan/${ref}?tab=approval`,
            raisedOn: today,
            kind: 'approval',
          },
        ]);
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== `T-AP-${ref}`));
      }
    },
    newVersionFrom,
    agreements,
    addAgreement: (a) => setAgreements((prev) => [...prev, a]),
    sourcing,
    updateSourcing: setSourcing,
    processing,
    updateProcessing: setProcessing,
    warehouses,
    confirmedStorage,
    confirmStorage: (code) => setConfirmedStorage((prev) => (prev.includes(code) ? prev : [...prev, code])),
    warehouseRequests,
    raiseWarehouseRequest,
    resolveWarehouseRequest,
    tasks,
    removeTask: (id) => setTasks((prev) => prev.filter((t) => t.id !== id)),
    toast,
    say,
    clearToast: () => setToast(null),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// Derived: the production side of the expected SMA position (WF-S01-03 / Step 6 → WF-S06-01)
export function useExpectedSma() {
  const { processing } = useStore();
  return useMemo(() => {
    const flagged = processing.filter((p) => p.sma);
    const byCommodity = new Map<string, number>();
    flagged.forEach((p) => {
      const total = Object.values(p.weeks).reduce((a, b) => a + b, 0);
      byCommodity.set(p.commodity, (byCommodity.get(p.commodity) ?? 0) + total);
    });
    const rows = Array.from(byCommodity.entries()).map(([commodity, mt]) => ({ commodity, mt }));
    return { rows, total: rows.reduce((a, b) => a + b.mt, 0), flaggedCount: flagged.length };
  }, [processing]);
}
