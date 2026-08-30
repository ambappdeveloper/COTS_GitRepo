import React, { createContext, useContext, useState } from 'react';
import { COST_ELEMENTS, SNAPSHOTS, type CostElement, type Snapshot } from '../mockData/s02';
import { validityState } from './s05store';

type Ctx = {
  elements: CostElement[];
  addElement: (e: CostElement) => void;
  updateElement: (id: string, patch: Partial<CostElement>) => void;
  /** update requests raised against an expired element's owner */
  updateRequests: string[];
  requestUpdate: (code: string) => void;

  snapshots: Snapshot[];
  addSnapshot: (s: Snapshot) => void;
  updateSnapshot: (id: string, patch: Partial<Snapshot>) => void;

  // deal state (Export stub)
  position: 'Short' | 'Long';
  setPosition: (p: 'Short' | 'Long') => void;
  expectedRawPrice: string;
  setExpectedRawPrice: (v: string) => void;
  attachedSnapshot: string;
  setAttachedSnapshot: (v: string) => void;
  dealCreated: boolean;
  createDeal: () => void;
  reviseDeal: (newSnapshotId: string) => void;

  /** labelled prototype assumption — see S02-uiux §6 */
  longMandatory: boolean;
  setLongMandatory: (v: boolean) => void;
};

const C = createContext<Ctx | null>(null);
export const useS02 = () => {
  const c = useContext(C);
  if (!c) throw new Error('S02Provider missing');
  return c;
};

export const elementState = (e: CostElement) => validityState(e.validFrom, e.validTo);

export function S02Provider({ children }: { children: React.ReactNode }) {
  const [elements, setElements] = useState<CostElement[]>(() => JSON.parse(JSON.stringify(COST_ELEMENTS)));
  const [updateRequests, setUpdateRequests] = useState<string[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => JSON.parse(JSON.stringify(SNAPSHOTS)));
  const [position, setPosition] = useState<'Short' | 'Long'>('Short');
  const [expectedRawPrice, setExpectedRawPrice] = useState('');
  const [attachedSnapshot, setAttachedSnapshot] = useState('');
  const [dealCreated, setDealCreated] = useState(false);
  const [longMandatory, setLongMandatory] = useState(false);

  const value: Ctx = {
    elements,
    addElement: (e) => setElements((p) => [e, ...p]),
    updateElement: (id, patch) => setElements((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e))),
    updateRequests,
    requestUpdate: (code) => setUpdateRequests((p) => (p.includes(code) ? p : [...p, code])),
    snapshots,
    addSnapshot: (s) => setSnapshots((p) => [s, ...p]),
    updateSnapshot: (id, patch) => setSnapshots((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s))),
    position,
    setPosition,
    expectedRawPrice,
    setExpectedRawPrice,
    attachedSnapshot,
    setAttachedSnapshot,
    dealCreated,
    createDeal: () => {
      setDealCreated(true);
      setSnapshots((p) =>
        p.map((s) => (s.id === attachedSnapshot ? { ...s, locked: true, position, dealRef: 'DEAL-0461' } : s)),
      );
    },
    reviseDeal: (newSnapshotId) => {
      setSnapshots((p) =>
        p.map((s) =>
          s.id === attachedSnapshot
            ? { ...s, superseded: true }
            : s.id === newSnapshotId
              ? { ...s, locked: true, position, dealRef: 'DEAL-0461 (revised)' }
              : s,
        ),
      );
      setAttachedSnapshot(newSnapshotId);
    },
    longMandatory,
    setLongMandatory,
  };

  return <C.Provider value={value}>{children}</C.Provider>;
}
