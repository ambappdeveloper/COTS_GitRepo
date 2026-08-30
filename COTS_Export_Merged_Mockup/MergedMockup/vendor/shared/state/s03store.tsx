import React, { createContext, useContext, useState } from 'react';
import {
  CONDITION_CHECKS, CONTRACT_QUALITY, INSPECTIONS, NON_CONFORMITIES, PROGRAMMES,
  type ConditionCheck, type ContractQuality, type CorrectiveAction, type Inspection,
  type NonConformity, type Programme,
} from '../mockData/s03';

type Ctx = {
  inspections: Inspection[];
  updateInspection: (id: string, patch: Partial<Inspection>) => void;
  checks: ConditionCheck[];
  updateCheck: (id: string, patch: Partial<ConditionCheck>) => void;
  programmes: Programme[];
  updateProgramme: (id: string, patch: Partial<Programme>) => void;
  ncs: NonConformity[];
  addNc: (nc: NonConformity) => void;
  updateNc: (id: string, patch: Partial<NonConformity>) => void;
  updateAction: (ncId: string, actionId: string, patch: Partial<CorrectiveAction>) => void;
  contracts: ContractQuality[];
  updateContract: (ref: string, patch: Partial<ContractQuality>) => void;
};

const C = createContext<Ctx | null>(null);
export const useS03 = () => {
  const c = useContext(C);
  if (!c) throw new Error('S03Provider missing');
  return c;
};

export function S03Provider({ children }: { children: React.ReactNode }) {
  const [inspections, setInspections] = useState<Inspection[]>(() => JSON.parse(JSON.stringify(INSPECTIONS)));
  const [checks, setChecks] = useState<ConditionCheck[]>(() => JSON.parse(JSON.stringify(CONDITION_CHECKS)));
  const [programmes, setProgrammes] = useState<Programme[]>(() => JSON.parse(JSON.stringify(PROGRAMMES)));
  const [ncs, setNcs] = useState<NonConformity[]>(() => JSON.parse(JSON.stringify(NON_CONFORMITIES)));
  const [contracts, setContracts] = useState<ContractQuality[]>(() => JSON.parse(JSON.stringify(CONTRACT_QUALITY)));

  const value: Ctx = {
    inspections,
    updateInspection: (id, patch) =>
      setInspections((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    checks,
    updateCheck: (id, patch) => setChecks((prev) => prev.map((c2) => (c2.id === id ? { ...c2, ...patch } : c2))),
    programmes,
    updateProgramme: (id, patch) => setProgrammes((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    ncs,
    addNc: (nc) => setNcs((prev) => [nc, ...prev]),
    updateNc: (id, patch) => setNcs((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n))),
    updateAction: (ncId, actionId, patch) =>
      setNcs((prev) =>
        prev.map((n) =>
          n.id === ncId
            ? { ...n, actions: n.actions.map((a) => (a.id === actionId ? { ...a, ...patch } : a)) }
            : n,
        ),
      ),
    contracts,
    updateContract: (ref, patch) => setContracts((prev) => prev.map((c2) => (c2.contract === ref ? { ...c2, ...patch } : c2))),
  };

  return <C.Provider value={value}>{children}</C.Provider>;
}
