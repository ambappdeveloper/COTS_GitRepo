import React, { createContext, useContext, useState } from 'react';
import { CLAIMS, CONTRACTS, SHIPMENTS_DELIVERED_IN_PERIOD, SUBMISSION_REQUIREMENTS, type Claim } from '../mockData/s07';

type Ctx = {
  claims: Claim[];
  addClaim: (c: Claim) => void;
  updateClaim: (id: string, patch: Partial<Claim>) => void;
  submit: (id: string) => void;
  decide: (id: string, decision: 'Approved' | 'Rejected', justification: string, amount: number) => void;
  close: (id: string, patch: Partial<Claim>) => void;

  /** WF-S07-01 / Step 2 branch — configured rule, shown both ways */
  shipmentLinkRequired: boolean;
  setShipmentLinkRequired: (v: boolean) => void;

  /** claim-rate denominator, stated on the report */
  shipmentsDelivered: number;
  contracts: typeof CONTRACTS;
};

const C = createContext<Ctx | null>(null);
export const useS07 = () => {
  const c = useContext(C);
  if (!c) throw new Error('S07Provider missing');
  return c;
};

/** Outstanding submission requirements for a claim — used by the workspace gate. */
export const outstandingRequirements = (c: Claim) =>
  SUBMISSION_REQUIREMENTS(c).filter((r) => !r.provided);

/** Outstanding closure requirements. */
export const outstandingClosure = (c: Claim) => {
  const out: string[] = [];
  if (!c.settlementOutcome) out.push('The settlement outcome has not been recorded.');
  if (c.settlementOutcome && c.settlementOutcome !== 'Closed without settlement' && !c.settledAmount) {
    out.push('The settled amount has not been recorded.');
  }
  if (!c.closureDate) out.push('The closure date has not been recorded.');
  return out;
};

export function S07Provider({ children }: { children: React.ReactNode }) {
  const [claims, setClaims] = useState<Claim[]>(() => JSON.parse(JSON.stringify(CLAIMS)));
  const [shipmentLinkRequired, setShipmentLinkRequired] = useState(false);

  const patch = (id: string, p: Partial<Claim>) =>
    setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, ...p } : c)));

  const value: Ctx = {
    claims,
    addClaim: (c) => setClaims((prev) => [c, ...prev]),
    updateClaim: patch,
    submit: (id) => patch(id, { state: 'Submitted for approval' }),
    decide: (id, decision, justification, amount) =>
      setClaims((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                approval: {
                  approver: 'Head of Commercial — A. Elhassan',
                  decision,
                  justification,
                  approvedAmount: decision === 'Approved' ? amount : 0,
                  date: '19-Aug-2026',
                },
                state: decision === 'Approved' ? 'Approved' : 'Closed without settlement',
                settlementOutcome: decision === 'Rejected' ? 'Closed without settlement' : c.settlementOutcome,
                closureDate: decision === 'Rejected' ? '19-Aug-2026' : c.closureDate,
              }
            : c,
        ),
      ),
    close: (id, p) => patch(id, { ...p, state: 'Closed' }),
    shipmentLinkRequired,
    setShipmentLinkRequired,
    shipmentsDelivered: SHIPMENTS_DELIVERED_IN_PERIOD,
    contracts: CONTRACTS,
  };

  return <C.Provider value={value}>{children}</C.Provider>;
}
