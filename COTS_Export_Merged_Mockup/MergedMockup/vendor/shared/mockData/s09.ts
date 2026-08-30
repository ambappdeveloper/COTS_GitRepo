// S09 CRM and Customer Feedback demonstration data. Prototype only — resets on refresh.
// PROPOSAL STAGE. The business asked IT to provide the questions and indicators and to prepare
// a proposal for discussion, so everything below is a proposal and is labelled as one.

export type ResponseType = 'Rating 1-5' | 'Yes / No' | 'Single select' | 'Numeric';

export type Question = {
  id: string;
  text: string;
  type: ResponseType;
  options?: string[];
  /** which satisfaction indicator this question feeds, and its weight */
  indicator: string;
  weight: number;
};

/**
 * DRAFT PROPOSAL question set. Deliberately small and unambitious — a starting point for the
 * discussion the business asked for, not an agreed set. The design renders questions from this
 * data, so replacing the set replaces the form without touching the screens.
 */
export const QUESTION_SET: Question[] = [
  { id: 'Q1', text: 'Did the commodity conform to the contract specification on arrival?', type: 'Yes / No', indicator: 'Commodity', weight: 30 },
  { id: 'Q2', text: 'How would you rate the condition of the packaging and marking?', type: 'Rating 1-5', indicator: 'Commodity', weight: 20 },
  { id: 'Q3', text: 'Were the shipping documents presented on time and complete?', type: 'Rating 1-5', indicator: 'Service', weight: 20 },
  { id: 'Q4', text: 'How would you rate our communication and responsiveness?', type: 'Rating 1-5', indicator: 'Service', weight: 15 },
  { id: 'Q5', text: 'Overall, how satisfied are you with this contract?', type: 'Rating 1-5', indicator: 'Overall', weight: 15 },
];

export const CHANNELS = ['Call', 'Meeting', 'Email', 'Site visit'];

/** Escalation rules — CONFIGURATION, and itself a proposal (§S9.4). */
export const ESCALATION_RULES = [
  { when: 'Complaint · Service · documentation or certificate related', route: 'Documentation' },
  { when: 'Complaint · Service · transport, laytime or delivery related', route: 'Logistics' },
  { when: 'Complaint · Service · any other service matter', route: 'Execution' },
  { when: 'Complaint · Commodity · any', route: 'Quality' },
  { when: 'Complaint · any · carrying a financial demand', route: 'Also registered as a commercial claim in S7' },
];

export const AREAS = ['Documentation', 'Logistics', 'Execution', 'Quality', 'Commercial'];

export type FeedbackContract = {
  id: string;
  customer: string;
  commodity: string;
  destination: string;
  country: string;
  incoterm: string;
  quantityMt: number;
  delivered: string;
};

/** Delivered contracts in the period — the coverage population. */
export const FEEDBACK_CONTRACTS: FeedbackContract[] = [
  { id: 'P30000718-1', customer: 'Sunrise Foods Pvt Ltd', commodity: 'Sesame', destination: 'Nhava Sheva', country: 'India', incoterm: 'CIF', quantityMt: 920, delivered: '08-Aug-2026' },
  { id: 'S30000942-1', customer: 'Olam Europe BV', commodity: 'Sesame', destination: 'Mersin', country: 'Turkey', incoterm: 'CFR', quantityMt: 1380, delivered: '18-Aug-2026' },
  { id: 'S30000955-1', customer: 'Kanoo Trading LLC', commodity: 'Gum arabic', destination: 'Jebel Ali', country: 'UAE', incoterm: 'FOB', quantityMt: 240, delivered: '13-Aug-2026' },
  { id: 'S30000961-1', customer: 'Ito Shoji Co Ltd', commodity: 'Sesame', destination: 'Yokohama', country: 'Japan', incoterm: 'CIF', quantityMt: 480, delivered: '05-Aug-2026' },
  { id: 'P30000724-1', customer: 'Sunrise Foods Pvt Ltd', commodity: 'Groundnut', destination: 'Nhava Sheva', country: 'India', incoterm: 'CIF', quantityMt: 360, delivered: '01-Aug-2026' },
  { id: 'S30000948-1', customer: 'Olam Europe BV', commodity: 'Gum arabic', destination: 'Rotterdam', country: 'Netherlands', incoterm: 'CFR', quantityMt: 300, delivered: '28-Jul-2026' },
  { id: 'S30000939-1', customer: 'Mersa Foods SA', commodity: 'Sesame', destination: 'Alexandria', country: 'Egypt', incoterm: 'CFR', quantityMt: 420, delivered: '22-Jul-2026' },
  { id: 'S30000930-1', customer: 'Kanoo Trading LLC', commodity: 'Sesame', destination: 'Jebel Ali', country: 'UAE', incoterm: 'FOB', quantityMt: 240, delivered: '15-Jul-2026' },
];

export type Feedback = {
  id: string;
  contract: string;
  customer: string;
  dateObtained: string;
  obtainedBy: string;
  channel: string;
  responses: Record<string, string>;
  /** dimension one */
  satisfaction: 'Satisfaction' | 'Complaint' | '';
  /** dimension two */
  subject: 'Service' | 'Commodity' | '';
  narrative: string;
  financialDemand: boolean;
  financialDemandNote?: string;

  // routing and response
  assignedArea?: string;
  routedOn?: string;
  rerouteReason?: string;
  response?: string;
  correctiveAction?: string;
  resolutionDate?: string;

  // consequences — three linked but SEPARATE records
  nonConformity?: string;
  nonConformityRoute?: string;
  claim?: string;
  claimRoute?: string;

  state: 'Recorded' | 'Routed' | 'Response recorded' | 'Resolved';
};

export const FEEDBACK: Feedback[] = [
  {
    id: 'FB-0233', contract: 'P30000718-1', customer: 'Sunrise Foods Pvt Ltd',
    dateObtained: '12-Aug-2026', obtainedBy: 'Trader — A. Bakri', channel: 'Call',
    responses: { Q1: 'No', Q2: '3', Q3: '4', Q4: '3', Q5: '2' },
    satisfaction: 'Complaint', subject: 'Commodity',
    narrative: 'Buyer reports foreign matter above the specification on arrival inspection and has asked for a reconditioning allowance.',
    financialDemand: true, financialDemandNote: 'Reconditioning cost plus handling, approximately USD 15,500',
    assignedArea: 'Quality', routedOn: '12-Aug-2026',
    nonConformity: 'NC-0085', nonConformityRoute: '/s03/ncs',
    claim: 'CL-0181', claimRoute: '/s07/claim/CL-0181',
    response: 'Foreign matter confirmed against the arrival inspection. Cleaning line screen mesh changed and the pre-shipment check tightened.',
    correctiveAction: 'Screen mesh specification changed at Gedaref; additional pre-shipment check added.',
    resolutionDate: '21-Aug-2026',
    state: 'Resolved',
  },
  {
    id: 'FB-0231', contract: 'S30000955-1', customer: 'Kanoo Trading LLC',
    dateObtained: '10-Aug-2026', obtainedBy: 'Trader — A. Bakri', channel: 'Email',
    responses: { Q1: 'Yes', Q2: '4', Q3: '2', Q4: '3', Q5: '3' },
    satisfaction: 'Complaint', subject: 'Service',
    narrative: 'Documents presented late on the July programme, causing bank charges at the buyer’s end.',
    financialDemand: false,
    assignedArea: 'Documentation', routedOn: '10-Aug-2026',
    state: 'Routed',
  },
  {
    id: 'FB-0229', contract: 'S30000961-1', customer: 'Ito Shoji Co Ltd',
    dateObtained: '07-Aug-2026', obtainedBy: 'Trader — N. Salih', channel: 'Meeting',
    responses: { Q1: 'Yes', Q2: '5', Q3: '5', Q4: '5', Q5: '5' },
    satisfaction: 'Satisfaction', subject: 'Service',
    narrative: 'Buyer noted that the documentation pack was the cleanest they had received this season.',
    financialDemand: false,
    state: 'Recorded',
  },
  {
    id: 'FB-0226', contract: 'S30000948-1', customer: 'Olam Europe BV',
    dateObtained: '30-Jul-2026', obtainedBy: 'Trader — A. Bakri', channel: 'Call',
    responses: { Q1: 'Yes', Q2: '4', Q3: '4', Q4: '4', Q5: '4' },
    satisfaction: 'Satisfaction', subject: 'Commodity',
    narrative: '',
    financialDemand: false,
    state: 'Recorded',
  },
  {
    id: 'FB-0224', contract: 'S30000939-1', customer: 'Mersa Foods SA',
    dateObtained: '26-Jul-2026', obtainedBy: 'Trader — N. Salih', channel: 'Call',
    responses: { Q1: 'Yes', Q2: '2', Q3: '3', Q4: '2', Q5: '2' },
    satisfaction: 'Complaint', subject: 'Commodity',
    narrative: 'Buyer unhappy with bag condition on arrival, but the consignment was within specification. No allowance requested.',
    financialDemand: false,
    assignedArea: 'Quality', routedOn: '26-Jul-2026',
    response: 'Arrival photographs reviewed against the loading inspection. Consignment within specification; bag scuffing attributed to destination handling. Explained to the buyer with the loading survey attached.',
    correctiveAction: '',
    resolutionDate: '04-Aug-2026',
    state: 'Resolved',
  },
  {
    id: 'FB-0221', contract: 'S30000930-1', customer: 'Kanoo Trading LLC',
    dateObtained: '19-Jul-2026', obtainedBy: 'Trader — A. Bakri', channel: 'Site visit',
    responses: { Q1: 'Yes', Q2: '4', Q3: '3', Q4: '4', Q5: '4' },
    satisfaction: 'Satisfaction', subject: 'Service',
    narrative: '',
    financialDemand: false,
    state: 'Recorded',
  },
];

/** Rating and yes/no responses converted to a 0-5 scale for the indicator. */
export const scoreOf = (f: Feedback) => {
  let weighted = 0;
  let weight = 0;
  for (const q of QUESTION_SET) {
    const v = f.responses[q.id];
    if (!v) continue;
    const n = q.type === 'Yes / No' ? (v === 'Yes' ? 5 : 1) : Number(v);
    if (Number.isNaN(n)) continue;
    weighted += n * q.weight;
    weight += q.weight;
  }
  return weight ? weighted / weight : 0;
};

export const indicatorScores = (f: Feedback) => {
  const groups = ['Commodity', 'Service', 'Overall'];
  return groups.map((g) => {
    const qs = QUESTION_SET.filter((q) => q.indicator === g);
    let weighted = 0;
    let weight = 0;
    for (const q of qs) {
      const v = f.responses[q.id];
      if (!v) continue;
      const n = q.type === 'Yes / No' ? (v === 'Yes' ? 5 : 1) : Number(v);
      if (Number.isNaN(n)) continue;
      weighted += n * q.weight;
      weight += q.weight;
    }
    return { indicator: g, score: weight ? weighted / weight : 0, questions: qs.map((q) => q.id).join(', ') };
  });
};

/** Monthly trend — the source asks for movement to be visible, not only the current position. */
export const SATISFACTION_TREND = [
  { month: 'Apr 2026', score: 3.4, responses: 5 },
  { month: 'May 2026', score: 3.6, responses: 7 },
  { month: 'Jun 2026', score: 3.3, responses: 6 },
  { month: 'Jul 2026', score: 3.5, responses: 3 },
  { month: 'Aug 2026', score: 3.7, responses: 3 },
];

/** A sample target, used ONLY by the sample-basis presentation of the coverage report. */
export const SAMPLE_TARGET_PERCENT = 50;
