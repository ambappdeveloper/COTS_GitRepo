import React, { createContext, useContext, useState } from 'react';
import {
  CLEARANCES, FREIGHT_RATES, MOVEMENTS, SERVICE_REQUESTS, SHUNTING,
  type Clearance, type FreightRate, type Movement, type ServiceRequest, type ShuntingRow,
} from '../mockData/s05';

type Ctx = {
  requests: ServiceRequest[];
  updateRequest: (id: string, patch: Partial<ServiceRequest>) => void;
  addRequest: (r: ServiceRequest) => void;
  // labelled prototype assumption toggle — see S05-uiux §6
  requestInCots: boolean;
  setRequestInCots: (v: boolean) => void;

  movements: Movement[];
  updateMovement: (id: string, patch: Partial<Movement>) => void;

  shunting: ShuntingRow[];
  setShunting: (rows: ShuntingRow[]) => void;

  rates: FreightRate[];
  updateRate: (id: string, patch: Partial<FreightRate>) => void;
  setRates: (rows: FreightRate[]) => void;

  clearances: Clearance[];
  updateClearance: (id: string, patch: Partial<Clearance>) => void;
};

const C = createContext<Ctx | null>(null);
export const useS05 = () => {
  const c = useContext(C);
  if (!c) throw new Error('S05Provider missing');
  return c;
};

export function S05Provider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<ServiceRequest[]>(() => JSON.parse(JSON.stringify(SERVICE_REQUESTS)));
  const [requestInCots, setRequestInCots] = useState(true);
  const [movements, setMovements] = useState<Movement[]>(() => JSON.parse(JSON.stringify(MOVEMENTS)));
  const [shunting, setShunting] = useState<ShuntingRow[]>(() => JSON.parse(JSON.stringify(SHUNTING)));
  const [rates, setRates] = useState<FreightRate[]>(() => JSON.parse(JSON.stringify(FREIGHT_RATES)));
  const [clearances, setClearances] = useState<Clearance[]>(() => JSON.parse(JSON.stringify(CLEARANCES)));

  const value: Ctx = {
    requests,
    updateRequest: (id, patch) => setRequests((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    addRequest: (r) => setRequests((p) => [...p, r]),
    requestInCots,
    setRequestInCots,
    movements,
    updateMovement: (id, patch) => setMovements((p) => p.map((m) => (m.id === id ? { ...m, ...patch } : m))),
    shunting,
    setShunting,
    rates,
    updateRate: (id, patch) => setRates((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    setRates,
    clearances,
    updateClearance: (id, patch) => setClearances((p) => p.map((c2) => (c2.id === id ? { ...c2, ...patch } : c2))),
  };

  return <C.Provider value={value}>{children}</C.Provider>;
}

/** Validity state for a dated record — the shared SM-07 rule. */
export function validityState(validFrom: string, validTo: string, today = '19-Aug-2026') {
  const d = (s: string) => new Date(s.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')).getTime();
  const t = d(today);
  if (t > d(validTo)) return 'Expired' as const;
  if (d(validTo) - t <= 7 * 864e5) return 'Approaching expiry' as const;
  if (t < d(validFrom)) return 'Not yet effective' as const;
  return 'Current' as const;
}
