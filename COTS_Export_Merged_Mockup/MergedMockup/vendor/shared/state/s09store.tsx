import React, { createContext, useContext, useState } from 'react';
import {
  ESCALATION_RULES, FEEDBACK, FEEDBACK_CONTRACTS, QUESTION_SET, type Feedback,
} from '../mockData/s09';

type Ctx = {
  feedback: Feedback[];
  addFeedback: (f: Feedback) => void;
  updateFeedback: (id: string, patch: Partial<Feedback>) => void;
  resolve: (id: string) => void;

  contracts: typeof FEEDBACK_CONTRACTS;
  questions: typeof QUESTION_SET;
  rules: typeof ESCALATION_RULES;

  /** WF-S09-03 / Step 3 — the unresolved every-contract-or-sample question */
  coverageBasis: 'Every contract' | 'Sample basis';
  setCoverageBasis: (v: 'Every contract' | 'Sample basis') => void;
};

const C = createContext<Ctx | null>(null);
export const useS09 = () => {
  const c = useContext(C);
  if (!c) throw new Error('S09Provider missing');
  return c;
};

/**
 * The configured route for a classification. Rules are CONFIGURATION and are themselves
 * a proposal — §S9.4 lists the escalation rules as a point still to be decided.
 */
export const routeFor = (
  satisfaction: string,
  subject: string,
  narrative: string,
): string => {
  if (satisfaction !== 'Complaint') return '';
  if (subject === 'Commodity') return 'Quality';
  const n = narrative.toLowerCase();
  if (/document|certificate|invoice|bill of lading/.test(n)) return 'Documentation';
  if (/transport|laytime|demurrage|deliver|vessel|freight/.test(n)) return 'Logistics';
  return 'Execution';
};

/** Outstanding items that block resolution of a complaint. */
export const outstandingResolution = (f: Feedback) => {
  const out: string[] = [];
  if (!f.assignedArea) out.push('The complaint has not been routed to an area.');
  if (!f.response) out.push('No response has been recorded by the assigned area.');
  if (!f.resolutionDate) out.push('The resolution date has not been recorded.');
  return out;
};

export function S09Provider({ children }: { children: React.ReactNode }) {
  const [feedback, setFeedback] = useState<Feedback[]>(() => JSON.parse(JSON.stringify(FEEDBACK)));
  const [coverageBasis, setCoverageBasis] = useState<'Every contract' | 'Sample basis'>('Every contract');

  const value: Ctx = {
    feedback,
    addFeedback: (f) => setFeedback((p) => [f, ...p]),
    updateFeedback: (id, patch) => setFeedback((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f))),
    resolve: (id) => setFeedback((p) => p.map((f) => (f.id === id ? { ...f, state: 'Resolved' } : f))),
    contracts: FEEDBACK_CONTRACTS,
    questions: QUESTION_SET,
    rules: ESCALATION_RULES,
    coverageBasis,
    setCoverageBasis,
  };

  return <C.Provider value={value}>{children}</C.Provider>;
}
