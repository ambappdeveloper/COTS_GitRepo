/**
 * C4 Approval Workflow — mock data.
 * Static only. Every field traces to a step in COTS_C4_Workflows.
 */

export type RouteStatus = 'Draft' | 'Pending Approval' | 'Effective' | 'Superseded';
export type StepType = 'Sequential' | 'Parallel';
export type ParallelRule = 'All required' | 'Any one' | 'Quorum 2 of 3';

/** WF-C4-03 / Step 1 — object types requiring approval */
export const OBJECT_TYPES = [
  'Access request',
  'Role definition or assignment change',
  'Master data change',
  'New warehouse request',
  'Facility request',
  'Master plan',
  'Payment request',
  'Non-conformity resolution',
  'Configuration change'
];

export interface RouteStep {
  seq: number;
  role: string;
  type: StepType;
  parallelRule?: ParallelRule;
  slaValue: number;
  slaUnit: 'working hours' | 'working days';
  commentOnApprove: boolean;
}

export interface RouteVersion {
  version: number;
  status: RouteStatus;
  effectiveFrom: string;
  effectiveTo?: string;
  changed: string;
  reason: string;
  approvedBy?: string;
  approvedAt?: string;
  steps: RouteStep[];
}

export interface RouteDef {
  id: string;
  objectType: string;
  countries: string[];          // empty = every country
  commodities: string[];
  orgUnits: string[];
  thresholdMeasure?: 'Value' | 'Volume' | 'Duration';
  thresholdFrom?: number;
  thresholdTo?: number;
  thresholdUnit?: string;
  /** WF-C4-03 / Step 4 */
  onReturn: 'Restart from the beginning' | 'Restart from the returning step';
  onReject: 'Terminate the request' | 'Return to Draft';
  urgentAvailable: boolean;
  urgentChannels: string[];
  versions: RouteVersion[];
}

const step = (
  seq: number, role: string, slaValue: number, slaUnit: RouteStep['slaUnit'],
  type: StepType = 'Sequential', parallelRule?: ParallelRule, commentOnApprove = false
): RouteStep => ({ seq, role, type, parallelRule, slaValue, slaUnit, commentOnApprove });

export const seedRoutes: RouteDef[] = [
  {
    id: 'RT-01', objectType: 'Access request', countries: [], commodities: [], orgUnits: [],
    onReturn: 'Restart from the returning step', onReject: 'Terminate the request',
    urgentAvailable: true, urgentChannels: ['SMS', 'Messaging'],
    versions: [
      {
        version: 1, status: 'Superseded', effectiveFrom: '2025-01-01', effectiveTo: '2026-06-30',
        changed: 'Two steps: Country Manager, Administrator', reason: 'Initial route',
        approvedBy: 'Fatima Idris', approvedAt: '2024-12-20 11:00',
        steps: [step(1, 'COUNTRY_MANAGER', 2, 'working days'), step(2, 'SYSTEM_ADMINISTRATOR', 1, 'working days')]
      },
      {
        version: 2, status: 'Effective', effectiveFrom: '2026-07-01',
        changed: 'Compliance step added where an administrative or approval-bearing role is requested',
        reason: 'Audit finding — elevated roles were being granted on a single approval',
        approvedBy: 'Fatima Idris', approvedAt: '2026-06-24 09:40',
        steps: [step(1, 'COUNTRY_MANAGER', 2, 'working days'), step(2, 'COMPLIANCE_OFFICER', 2, 'working days'), step(3, 'SYSTEM_ADMINISTRATOR', 1, 'working days')]
      }
    ]
  },
  {
    id: 'RT-02', objectType: 'Master data change', countries: [], commodities: [], orgUnits: [],
    onReturn: 'Restart from the returning step', onReject: 'Return to Draft',
    urgentAvailable: false, urgentChannels: [],
    versions: [
      {
        version: 1, status: 'Effective', effectiveFrom: '2025-01-01',
        changed: 'Country Manager, then Compliance for parties, commodities and financial domains',
        reason: 'Initial route', approvedBy: 'Fatima Idris', approvedAt: '2024-12-20 11:05',
        steps: [step(1, 'COUNTRY_MANAGER', 2, 'working days'), step(2, 'COMPLIANCE_OFFICER', 2, 'working days')]
      }
    ]
  },
  {
    id: 'RT-03', objectType: 'New warehouse request', countries: ['Sudan', 'Ethiopia'], commodities: [], orgUnits: [],
    onReturn: 'Restart from the beginning', onReject: 'Return to Draft',
    urgentAvailable: true, urgentChannels: ['Messaging'],
    versions: [
      {
        version: 1, status: 'Effective', effectiveFrom: '2025-04-01',
        changed: 'Execution, Logistics and Quality in parallel, then Commercial, then Compliance',
        reason: 'Workshop route for the warehouse request chain',
        approvedBy: 'Grace Mensah', approvedAt: '2025-03-25 14:10',
        steps: [
          step(1, 'EXECUTION_OFFICER', 8, 'working hours', 'Parallel', 'All required'),
          step(1, 'PROCESSING_SUPERVISOR', 8, 'working hours', 'Parallel', 'All required'),
          step(1, 'QUALITY_INSPECTOR', 8, 'working hours', 'Parallel', 'All required'),
          step(2, 'COUNTRY_MANAGER', 2, 'working days'),
          step(3, 'COMPLIANCE_OFFICER', 2, 'working days')
        ]
      }
    ]
  },
  {
    id: 'RT-04', objectType: 'Payment request', countries: [], commodities: [], orgUnits: [],
    thresholdMeasure: 'Value', thresholdFrom: 0, thresholdTo: 50000, thresholdUnit: 'USD',
    onReturn: 'Restart from the returning step', onReject: 'Terminate the request',
    urgentAvailable: true, urgentChannels: ['SMS'],
    versions: [
      {
        version: 1, status: 'Effective', effectiveFrom: '2025-01-01',
        changed: 'Single Country Manager approval below 50,000 USD', reason: 'Initial threshold band',
        approvedBy: 'Fatima Idris', approvedAt: '2024-12-20 11:10',
        steps: [step(1, 'COUNTRY_MANAGER', 1, 'working days')]
      }
    ]
  },
  {
    id: 'RT-05', objectType: 'Payment request', countries: [], commodities: [], orgUnits: [],
    thresholdMeasure: 'Value', thresholdFrom: 50000, thresholdUnit: 'USD',
    onReturn: 'Restart from the beginning', onReject: 'Terminate the request',
    urgentAvailable: true, urgentChannels: ['SMS', 'Messaging'],
    versions: [
      {
        version: 1, status: 'Effective', effectiveFrom: '2025-01-01',
        changed: 'Country Manager, then Compliance, then Group Finance above 50,000 USD',
        reason: 'Initial threshold band', approvedBy: 'Fatima Idris', approvedAt: '2024-12-20 11:12',
        steps: [
          step(1, 'COUNTRY_MANAGER', 1, 'working days'),
          step(2, 'COMPLIANCE_OFFICER', 2, 'working days'),
          step(3, 'COMPLIANCE_OFFICER', 2, 'working days', 'Sequential', undefined, true)
        ]
      }
    ]
  },
  {
    id: 'RT-06', objectType: 'Non-conformity resolution', countries: [], commodities: ['Sesame — Hulled White'], orgUnits: [],
    onReturn: 'Restart from the returning step', onReject: 'Return to Draft',
    urgentAvailable: true, urgentChannels: ['SMS', 'Messaging'],
    versions: [
      {
        version: 1, status: 'Effective', effectiveFrom: '2025-06-01',
        changed: 'Quality and Compliance, quorum of two', reason: 'Quality workshop decision',
        approvedBy: 'Grace Mensah', approvedAt: '2025-05-28 10:00',
        steps: [
          step(1, 'QUALITY_INSPECTOR', 4, 'working hours', 'Parallel', 'Quorum 2 of 3'),
          step(1, 'COMPLIANCE_OFFICER', 4, 'working hours', 'Parallel', 'Quorum 2 of 3'),
          step(1, 'PROCESSING_SUPERVISOR', 4, 'working hours', 'Parallel', 'Quorum 2 of 3')
        ]
      }
    ]
  },
  {
    id: 'RT-07', objectType: 'Configuration change', countries: [], commodities: [], orgUnits: [],
    onReturn: 'Restart from the beginning', onReject: 'Terminate the request',
    urgentAvailable: false, urgentChannels: [],
    versions: [
      {
        version: 1, status: 'Effective', effectiveFrom: '2025-01-01',
        changed: 'Administrator, then Compliance for anything affecting authority',
        reason: 'Initial route', approvedBy: 'Fatima Idris', approvedAt: '2024-12-20 11:15',
        steps: [step(1, 'SYSTEM_ADMINISTRATOR', 1, 'working days'), step(2, 'COMPLIANCE_OFFICER', 2, 'working days', 'Sequential', undefined, true)]
      },
      {
        version: 2, status: 'Draft', effectiveFrom: '2026-10-01',
        changed: 'Country Manager notified in parallel with Compliance',
        reason: 'Country managers asked to see configuration changes affecting their country',
        steps: [
          step(1, 'SYSTEM_ADMINISTRATOR', 1, 'working days'),
          step(2, 'COMPLIANCE_OFFICER', 2, 'working days', 'Parallel', 'All required', true),
          step(2, 'COUNTRY_MANAGER', 2, 'working days', 'Parallel', 'All required')
        ]
      }
    ]
  },
  {
    id: 'RT-08', objectType: 'Master plan', countries: [], commodities: [], orgUnits: [],
    thresholdMeasure: 'Volume', thresholdFrom: 1000, thresholdUnit: 'MT',
    onReturn: 'Restart from the beginning', onReject: 'Return to Draft',
    urgentAvailable: false, urgentChannels: [],
    versions: [
      {
        version: 1, status: 'Effective', effectiveFrom: '2025-09-01',
        changed: 'Sourcing and Execution in parallel, any one, then Country Manager',
        reason: 'Planning workshop decision', approvedBy: 'Grace Mensah', approvedAt: '2025-08-25 09:00',
        steps: [
          step(1, 'SOURCING_OFFICER', 1, 'working days', 'Parallel', 'Any one'),
          step(1, 'EXECUTION_OFFICER', 1, 'working days', 'Parallel', 'Any one'),
          step(2, 'COUNTRY_MANAGER', 2, 'working days')
        ]
      }
    ]
  }
];

/* ---------- approval instances for object types whose owning module is not built ---------- */

export interface SeededInstance {
  id: string;
  objectType: string;
  record: string;
  recordDetail: [string, string][];
  sourceModule: string;
  country: string;
  requester: string;
  submitted: string;
  routeId: string;
  routeVersion: number;
  currentStep: number;
  urgent: boolean;
  /** working time already elapsed on the active step */
  elapsedWorking: number;
  decisions: { seq: number; role: string; approver: string; decision: string; comment: string; at: string }[];
  /** WF-C4-01 / Step 5 — no approver could be resolved */
  unresolved?: { role: string; why: string };
  delegatedFrom?: string;
  thresholdValue?: string;
  /** set when the cycle has finished — the instance leaves the pending queue */
  closed?: string;
  /** an approver named for this instance only, after an unresolved-approver hold */
  assignedApprover?: string;
  /** a route version this instance is approving — WF-C4-03 / Step 5 */
  routeChange?: { routeId: string; version: number };
}

export const seedInstances: SeededInstance[] = [
  {
    id: 'AI-2001', objectType: 'Payment request', record: 'PR-26-0441 Accurate Logistics — inland freight',
    recordDetail: [
      ['Payee', 'Accurate Logistics'], ['Amount', 'USD 78,400'], ['Cost element', 'Inland freight'],
      ['Related contract', 'P30000718-1'], ['Period', 'August 2026'], ['Cost centre', 'CC-0104']
    ],
    sourceModule: 'Costing and payments', country: 'Sudan', requester: 'Ahmed Osman',
    submitted: '2026-08-13', routeId: 'RT-05', routeVersion: 1, currentStep: 1, urgent: true,
    elapsedWorking: 3.4, thresholdValue: 'USD 78,400 — above the 50,000 band',
    decisions: [{ seq: 1, role: 'COUNTRY_MANAGER', approver: 'Grace Mensah', decision: 'Approved', comment: 'Rates match the agreed lane card.', at: '2026-08-14 09:12' }]
  },
  {
    id: 'AI-2002', objectType: 'Non-conformity resolution', record: 'NC-26-0118 Batch 26/SES/GDF/0442 — moisture out of specification',
    recordDetail: [
      ['Batch', '26/SES/GDF/0442'], ['Commodity', 'Sesame — Hulled White'], ['Finding', 'Moisture 6.8% against a 6.0% maximum'],
      ['Quantity affected', '118 MT'], ['Proposed resolution', 'Re-dry and re-test before shipment'], ['Raised by', 'Yusuf Kamal']
    ],
    sourceModule: 'Quality', country: 'Sudan', requester: 'Yusuf Kamal',
    submitted: '2026-08-17', routeId: 'RT-06', routeVersion: 1, currentStep: 0, urgent: true,
    elapsedWorking: 5.5,
    decisions: [{ seq: 1, role: 'QUALITY_INSPECTOR', approver: 'Yusuf Kamal', decision: 'Approved', comment: 'Re-drying is the correct remedy at this moisture level.', at: '2026-08-17 15:40' }]
  },
  {
    id: 'AI-2003', objectType: 'New warehouse request', record: 'WR-26-0033 Kassala collection store',
    recordDetail: [
      ['Location', 'Kassala, silo road'], ['Capacity sought', '2,400 MT'], ['Basis', 'Rented, 12 months'],
      ['Monthly cost', 'USD 9,200'], ['Justification', 'Collection point for the eastern buying stations']
    ],
    sourceModule: 'Execution', country: 'Sudan', requester: 'Salma Bakri',
    submitted: '2026-08-16', routeId: 'RT-03', routeVersion: 1, currentStep: 0, urgent: false,
    elapsedWorking: 9.0,
    decisions: [
      { seq: 1, role: 'EXECUTION_OFFICER', approver: 'Meseret Alemu', decision: 'Approved', comment: 'Volumes support a collection point here.', at: '2026-08-17 08:20' },
      { seq: 1, role: 'QUALITY_INSPECTOR', approver: 'Yusuf Kamal', decision: 'Approved', comment: 'Storage conditions acceptable subject to fumigation.', at: '2026-08-17 11:05' }
    ]
  },
  {
    id: 'AI-2004', objectType: 'Configuration change', record: 'CFG-26-0207 Sudan — enable the logistics service request step',
    recordDetail: [
      ['Parameter class', 'Process step applicability'], ['Country', 'Sudan'], ['Current value', 'Logistics service request — not applicable'],
      ['Proposed value', 'Logistics service request — applies, mandatory'], ['Business reason', 'Third-party haulage now used on the Gedaref lane']
    ],
    sourceModule: 'C10 Configuration', country: 'Sudan', requester: 'Nasreen Sayed',
    submitted: '2026-08-18', routeId: 'RT-07', routeVersion: 1, currentStep: 0, urgent: false,
    elapsedWorking: 0.5,
    decisions: []
  },
  {
    id: 'AI-2005', objectType: 'Master plan', record: 'MP-26-Q4 Sudan sesame sourcing plan, Q4 2026',
    recordDetail: [
      ['Season', '2025/26'], ['Commodity', 'Sesame — Hulled White'], ['Volume planned', '4,200 MT'],
      ['Buying stations', 'Gedaref, Kassala, Port Sudan'], ['Indicative cost', 'USD 5.9m']
    ],
    sourceModule: 'Sourcing', country: 'Sudan', requester: 'Ahmed Osman',
    submitted: '2026-08-11', routeId: 'RT-08', routeVersion: 1, currentStep: 1, urgent: false,
    elapsedWorking: 4.8, thresholdValue: '4,200 MT — above the 1,000 MT band',
    decisions: [{ seq: 1, role: 'SOURCING_OFFICER', approver: 'Ahmed Osman', decision: 'Approved', comment: 'Volumes agreed with the buying stations.', at: '2026-08-12 10:30' }],
    delegatedFrom: 'Grace Mensah'
  },
  {
    id: 'AI-2006', objectType: 'Facility request', record: 'FR-26-0009 Gedaref cleaning line — second shift',
    recordDetail: [
      ['Facility', 'Gedaref Cleaning and Grading Plant'], ['Change sought', 'Add a second shift'],
      ['Additional capacity', '120 MT per shift'], ['Cost impact', 'USD 14,600 per month']
    ],
    sourceModule: 'Processing', country: 'Sudan', requester: 'Salma Bakri',
    submitted: '2026-08-14', routeId: 'RT-02', routeVersion: 1, currentStep: 0, urgent: false,
    elapsedWorking: 2.1,
    decisions: [],
    unresolved: { role: 'COUNTRY_MANAGER', why: 'The only holder of this role in Sudan is on the delegation register with no delegate named, and no other active holder exists in this country.' }
  }
];

/** WF-C4-02 / Step 5 — audited reassignment log */
export interface ReassignRec {
  id: string;
  instance: string;
  objectType: string;
  from: string;
  to: string;
  reason: string;
  at: string;
  by: string;
}

export const seedReassignments: ReassignRec[] = [
  { id: 'RA-1', instance: 'AI-1990', objectType: 'Access request', from: 'Grace Mensah', to: 'Nasreen Sayed', reason: 'Approver on unplanned absence, no delegation in force.', at: '2026-07-22 09:10', by: 'Nasreen Sayed' },
  { id: 'RA-2', instance: 'AI-1994', objectType: 'Master data change', from: 'Fatima Idris', to: 'Grace Mensah', reason: 'Compliance officer travelling, decision needed before the vessel sailed.', at: '2026-08-04 16:45', by: 'Nasreen Sayed' }
];

/** WF-C4-02 / Step 4 — repeated breaches by step, for the bottleneck chart */
export const BREACHES_BY_STEP: { step: string; breaches: number; decisions: number; slaLabel: string }[] = [
  { step: 'Country Manager approval', breaches: 7, decisions: 14, slaLabel: '2 working days' },
  { step: 'Compliance review', breaches: 3, decisions: 11, slaLabel: '2 working days' },
  { step: 'Administrator approval', breaches: 1, decisions: 16, slaLabel: '1 working day' },
  { step: 'Quality parallel review', breaches: 2, decisions: 6, slaLabel: '4 working hours' },
  { step: 'Group Finance approval', breaches: 4, decisions: 5, slaLabel: '2 working days' }
];

/** Working calendars — WF-C4-02 / Step 1 */
export const WORKING_CALENDAR: Record<string, string> = {
  Sudan: 'Sunday to Thursday, Sudan public holidays',
  Ethiopia: 'Monday to Friday, Ethiopia public holidays',
  Tanzania: 'Monday to Friday, Tanzania public holidays',
  Mozambique: 'Monday to Friday, Mozambique public holidays'
};

export const REMINDER_AT_PERCENT = 75;

/* ------------------------------------------------------------------------- *
 * Resolution helpers — WF-C4-01 / Steps 3–5 and WF-C4-03 / Steps 1–2
 * ------------------------------------------------------------------------- */

/**
 * Demonstration approver register: who holds each approver role in each country.
 * In the built system this is derived from C1 role assignment; it is held here so
 * that the C01 user register is not disturbed by the C04 turn.
 */
export const APPROVER_REGISTER: { role: string; country: string; user: string }[] = [
  { role: 'COUNTRY_MANAGER', country: 'Sudan', user: 'Grace Mensah' },
  { role: 'COUNTRY_MANAGER', country: 'Ethiopia', user: 'Grace Mensah' },
  { role: 'COUNTRY_MANAGER', country: 'Tanzania', user: 'Grace Mensah' },
  { role: 'COUNTRY_MANAGER', country: 'Mozambique', user: 'Grace Mensah' },
  { role: 'COMPLIANCE_OFFICER', country: 'Sudan', user: 'Fatima Idris' },
  { role: 'COMPLIANCE_OFFICER', country: 'Ethiopia', user: 'Fatima Idris' },
  { role: 'COMPLIANCE_OFFICER', country: 'Tanzania', user: 'Fatima Idris' },
  { role: 'COMPLIANCE_OFFICER', country: 'Mozambique', user: 'Fatima Idris' },
  { role: 'SYSTEM_ADMINISTRATOR', country: 'Sudan', user: 'Nasreen Sayed' },
  { role: 'SYSTEM_ADMINISTRATOR', country: 'Ethiopia', user: 'Nasreen Sayed' },
  { role: 'SYSTEM_ADMINISTRATOR', country: 'Tanzania', user: 'Nasreen Sayed' },
  { role: 'QUALITY_INSPECTOR', country: 'Sudan', user: 'Yusuf Kamal' },
  { role: 'EXECUTION_OFFICER', country: 'Ethiopia', user: 'Meseret Alemu' },
  { role: 'EXECUTION_OFFICER', country: 'Sudan', user: 'Meseret Alemu' },
  { role: 'SOURCING_OFFICER', country: 'Sudan', user: 'Ahmed Osman' },
  { role: 'PROCESSING_SUPERVISOR', country: 'Tanzania', user: 'Joseph Mwangi' },
  { role: 'PROCESSING_SUPERVISOR', country: 'Sudan', user: 'Tarig Hassan' }
  // Ethiopia has no PROCESSING_SUPERVISOR and no QUALITY_INSPECTOR — a step naming
  // either role in Ethiopia is held rather than skipped, per WF-C4-01 / Step 5.
];

/** A parallel group, or a single sequential step, in route order. */
export interface StepGroup {
  seq: number;
  type: StepType;
  rule?: ParallelRule;
  members: RouteStep[];
}

export function groupSteps(steps: RouteStep[]): StepGroup[] {
  const out: StepGroup[] = [];
  steps.forEach((s) => {
    const g = out.find((x) => x.seq === s.seq);
    if (g) { g.members.push(s); if (s.parallelRule) g.rule = s.parallelRule; g.type = 'Parallel'; }
    else out.push({ seq: s.seq, type: s.type, rule: s.parallelRule, members: [s] });
  });
  return out.sort((a, b) => a.seq - b.seq);
}

/** How many decisions a group needs before the route may advance. */
export function requiredCount(g: StepGroup): number {
  if (g.type === 'Sequential') return 1;
  if (g.rule === 'Any one') return 1;
  if (g.rule && g.rule.startsWith('Quorum')) return 2;
  return g.members.length;
}

export function effectiveVersion(r: RouteDef, asOf = '2026-08-18'): RouteVersion | undefined {
  const live = r.versions.filter((v) => v.status === 'Effective' && v.effectiveFrom <= asOf);
  if (live.length) return live[live.length - 1];
  return r.versions.find((v) => v.status === 'Effective');
}

export function versionOf(r: RouteDef, version: number): RouteVersion | undefined {
  return r.versions.find((v) => v.version === version);
}

export interface RouteQuery {
  objectType: string;
  country?: string;
  commodity?: string;
  orgUnit?: string;
  thresholdValue?: number;
}

export interface RouteResolution {
  route?: RouteDef;
  version?: RouteVersion;
  /** the resolution strip, in words — WF-C4-01 / Step 3 */
  reasons: string[];
}

/** WF-C4-01 / Step 3 — the route is resolved from object type, country, organisational unit and threshold. */
export function resolveRoute(routes: RouteDef[], q: RouteQuery, asOf = '2026-08-18'): RouteResolution {
  const reasons: string[] = [`Object type: ${q.objectType}`];
  let candidates = routes.filter((r) => r.objectType === q.objectType);
  if (!candidates.length) return { reasons: [...reasons, 'No route is configured for this object type.'] };

  if (q.country) {
    const scoped = candidates.filter((r) => r.countries.includes(q.country!));
    const global = candidates.filter((r) => r.countries.length === 0);
    if (scoped.length) { candidates = scoped; reasons.push(`Country: ${q.country} — a country-specific route applies`); }
    else { candidates = global.length ? global : candidates; reasons.push(`Country: ${q.country} — no country-specific route, the all-country route applies`); }
  }
  if (q.commodity) {
    const byCommodity = candidates.filter((r) => r.commodities.includes(q.commodity!));
    if (byCommodity.length) { candidates = byCommodity; reasons.push(`Commodity: ${q.commodity} — a commodity-specific route applies`); }
    else reasons.push(`Commodity: ${q.commodity} — no commodity condition applies`);
  }
  if (q.orgUnit) {
    const byUnit = candidates.filter((r) => r.orgUnits.includes(q.orgUnit!));
    if (byUnit.length) { candidates = byUnit; reasons.push(`Organisational unit: ${q.orgUnit} — a unit-specific route applies`); }
    else reasons.push(`Organisational unit: ${q.orgUnit} — no unit condition applies`);
  }
  const banded = candidates.filter((r) => r.thresholdMeasure);
  if (banded.length && q.thresholdValue !== undefined) {
    const hit = banded.find((r) =>
      (r.thresholdFrom === undefined || q.thresholdValue! >= r.thresholdFrom) &&
      (r.thresholdTo === undefined || q.thresholdValue! < r.thresholdTo));
    if (hit) {
      candidates = [hit];
      const band = hit.thresholdTo === undefined
        ? `at or above ${hit.thresholdFrom?.toLocaleString()} ${hit.thresholdUnit}`
        : `below ${hit.thresholdTo.toLocaleString()} ${hit.thresholdUnit}`;
      reasons.push(`Threshold: ${hit.thresholdMeasure} ${q.thresholdValue.toLocaleString()} ${hit.thresholdUnit} — the band ${band} applies`);
    }
  } else if (banded.length) {
    reasons.push('Threshold: no value supplied, so the lowest band applies');
    candidates = [banded[0]];
  }
  const route = candidates[0];
  const version = effectiveVersion(route, asOf);
  if (version) reasons.push(`Route ${route.id}, version ${version.version}, effective from ${version.effectiveFrom}`);
  return { route, version, reasons };
}

/** WF-C4-02 / Step 1 — service levels are measured in working time, not calendar time. */
export const WEEKEND: Record<string, number[]> = {
  Sudan: [5, 6],          // Friday, Saturday
  Ethiopia: [6, 0],       // Saturday, Sunday
  Tanzania: [6, 0],
  Mozambique: [6, 0]
};

export function slaWorkingHours(step: RouteStep): number {
  return step.slaUnit === 'working days' ? step.slaValue * 8 : step.slaValue;
}

export function slaLabel(step: RouteStep): string {
  return `${step.slaValue} ${step.slaUnit}`;
}

/** Working hours elapsed between a submission date and the reference date, on the country calendar. */
export function workingElapsedHours(from: string, country: string, asOf = '2026-08-18'): number {
  const weekend = WEEKEND[country] ?? [6, 0];
  let hours = 0;
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${asOf}T00:00:00Z`);
  while (d < end) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!weekend.includes(d.getUTCDay())) hours += 8;
  }
  return hours;
}

export type SlaState = 'Within service level' | 'Reminder sent' | 'Breached';

export function slaState(elapsed: number, sla: number): SlaState {
  if (elapsed > sla) return 'Breached';
  if (elapsed >= (sla * REMINDER_AT_PERCENT) / 100) return 'Reminder sent';
  return 'Within service level';
}

/* ------------------------------------------------------------------------- *
 * The unified approval view — every pending decision, whatever raised it
 * ------------------------------------------------------------------------- */

export interface ApprovalDecision {
  seq: number; role: string; approver: string; decision: string; comment: string; at: string;
}

export interface ApprovalView {
  id: string;
  /** where the subject record lives: a real C01/C03 record, or a seeded instance */
  kind: 'c1' | 'c3' | 'seeded';
  objectType: string;
  record: string;
  recordRoute?: string;
  recordDetail: [string, string][];
  sourceModule: string;
  country: string;
  requester: string;
  submitted: string;
  routeId: string;
  routeVersion: number;
  groups: StepGroup[];
  /** index into groups */
  currentGroup: number;
  urgent: boolean;
  elapsedWorking: number;
  decisions: ApprovalDecision[];
  unresolved?: { role: string; why: string };
  delegatedFrom?: string;
  thresholdValue?: string;
  resolution: string[];
  escalation?: string;
  /** an approver named for this instance after an unresolved-approver hold or a reassignment */
  assignedApprover?: string;
  /** the route version this instance is approving — WF-C4-03 / Step 5 */
  routeChange?: { routeId: string; version: number };
}
