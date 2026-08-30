import React, { createContext, useContext, useState } from 'react';
import {
  ANNOUNCEMENTS, HELP, ITEMS, TODAY, addMonths, reviewStatus, typeConfig, versionInForce,
  type Announcement, type HelpContent, type ReferenceItem,
} from '../mockData/s11';

type Ctx = {
  items: ReferenceItem[];
  addItem: (i: ReferenceItem) => void;
  updateItem: (id: string, patch: Partial<ReferenceItem>) => void;

  /** WF-S11-01 / Step 3 — approve or return; a returned item is NOT published */
  decide: (id: string, decision: 'Approved' | 'Returned', justification: string) => void;
  /** WF-S11-05 / Step 2 — the three review outcomes */
  confirmReview: (id: string) => void;
  withdraw: (id: string, reason: string) => void;

  announcements: Announcement[];
  addAnnouncement: (a: Announcement) => void;
  help: HelpContent[];

  /** WF-S11-02 — usage is recorded when material is consulted at the point of work */
  consult: (id: string) => void;

  /** the version IN FORCE on a date for a given code */
  inForce: (code: string, date?: string) => ReferenceItem | undefined;

  /** published material visible in the library, search and at the point of work */
  published: ReferenceItem[];
};

const C = createContext<Ctx | null>(null);
export const useS11 = () => {
  const c = useContext(C);
  if (!c) throw new Error('S11Provider missing');
  return c;
};

/** Live announcements for a country and the roles a user holds. */
export const liveAnnouncements = (all: Announcement[], country: string, today = TODAY) => {
  const ms = (s: string) => new Date(s.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')).getTime();
  const t = ms(today);
  return all.filter(
    (a) => (a.country === country || a.country === 'All countries') && ms(a.publishFrom) <= t && ms(a.expiresOn) >= t,
  );
};

export function S11Provider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ReferenceItem[]>(() => JSON.parse(JSON.stringify(ITEMS)));
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => JSON.parse(JSON.stringify(ANNOUNCEMENTS)));
  const [help] = useState<HelpContent[]>(() => JSON.parse(JSON.stringify(HELP)));

  const patch = (id: string, p: Partial<ReferenceItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const value: Ctx = {
    items,
    addItem: (i) =>
      setItems((prev) => {
        // publishing a new version supersedes the previous one, which is RETAINED and marked
        const superseded = prev.map((x) =>
          x.code === i.code && x.status === 'Published'
            ? { ...x, status: 'Superseded' as const, effectiveTo: i.effectiveFrom }
            : x,
        );
        return [i, ...superseded];
      }),
    updateItem: patch,
    decide: (id, decision, justification) =>
      setItems((prev) => {
        const target = prev.find((x) => x.id === id);
        if (!target) return prev;
        if (decision === 'Returned') {
          return prev.map((x) => (x.id === id
            ? { ...x, status: 'Returned to owner' as const, approval: { approver: 'Ahmed Elhassan', decision, date: TODAY, justification } }
            : x));
        }
        return prev.map((x) => {
          if (x.id === id) {
            return { ...x, status: 'Published' as const, approval: { approver: 'Ahmed Elhassan', decision, date: TODAY, justification } };
          }
          if (x.code === target.code && x.status === 'Published') {
            return { ...x, status: 'Superseded' as const, effectiveTo: target.effectiveFrom };
          }
          return x;
        });
      }),
    confirmReview: (id) =>
      setItems((prev) => prev.map((x) => {
        if (x.id !== id) return x;
        // the new review date comes FROM THE CONFIGURED CYCLE, not from a date the owner picks
        return { ...x, reviewDate: addMonths(TODAY, typeConfig(x.type).reviewMonths) };
      })),
    withdraw: (id, reason) =>
      patch(id, { status: 'Withdrawn', withdrawnOn: TODAY, withdrawnReason: reason }),
    announcements,
    addAnnouncement: (a) => setAnnouncements((p) => [a, ...p]),
    help,
    consult: (id) => patch(id, { consultations: (items.find((i) => i.id === id)?.consultations ?? 0) + 1 }),
    inForce: (code, date) => versionInForce(items, code, date),
    published: items.filter((i) => i.status === 'Published'),
  };

  return <C.Provider value={value}>{children}</C.Provider>;
}

export { reviewStatus };
