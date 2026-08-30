// S08 Projects demonstration data. Prototype only — resets on refresh.
// PROPOSAL STAGE. The business asked IT to prepare a proposal for discussion.
// Scope guard from §S8: basic planning and follow-up, NOT a full project management system.

export const PROJECT_TYPES = ['Tender', 'Distribution project', 'Special operation', 'New processing line'];

/** §S8.4 — task status values are configuration. */
export const TASK_STATUSES = ['Not started', 'In progress', 'Blocked', 'Complete'];
export const DELIVERABLE_STATUSES = ['Not started', 'In progress', 'Complete'];

/** §S8.4 — whether budget is captured at all is configured PER COUNTRY. */
export const BUDGET_CAPTURED: Record<string, boolean> = {
  Sudan: true,
  Ethiopia: false,
  Chad: true,
};

export type Deliverable = {
  id: string;
  description: string;
  targetDate: string;
  status: string;
};

export type Phase = {
  id: string;
  name: string;
  start: string;
  end: string;
};

export type Task = {
  id: string;
  description: string;
  assigneeId: string;
  phaseId?: string;
  deliverableId?: string;
  start: string;
  end: string;
  status: string;
  inboxRaised?: string;
};

export type TeamMember = {
  personId: string;
  projectRole: string;
};

export type Project = {
  id: string;
  name: string;
  type: string;
  country: string;
  scope: string;
  objective: string;
  ownerId: string;
  status: 'Active' | 'Completed' | 'Pending approval';
  start: string;
  plannedEnd: string;
  actualEnd?: string;
  closingNote?: string;
  budget?: number;
  currency?: string;
  budgetNote?: string;
  team: TeamMember[];
  deliverables: Deliverable[];
  phases: Phase[];
  tasks: Task[];
  documents: string[];
};

export const PROJECTS: Project[] = [
  {
    id: 'PRJ-0042',
    name: 'Gedaref second cleaning line',
    type: 'New processing line',
    country: 'Sudan',
    scope: 'Supply, install and commission a second cleaning and grading line at Gedaref Store 1, including the civil works for the foundation and the electrical connection.',
    objective: 'Raise Gedaref cleaning throughput from 40 to 70 MT per day before the peak of the 2026/27 season.',
    ownerId: 'P-5',
    status: 'Active',
    start: '01-Jun-2026',
    plannedEnd: '30-Sep-2026',
    budget: 180000,
    currency: 'USD',
    budgetNote: 'Approved capital allocation for the 2026 programme.',
    team: [
      { personId: 'P-5', projectRole: 'Project owner' },
      { personId: 'P-2', projectRole: 'Execution and logistics' },
      { personId: 'P-3', projectRole: 'Quality sign-off' },
      // an operational contact with NO system account — on the team, but cannot be a task assignee
      { personId: 'P-6', projectRole: 'Site custodian' },
    ],
    deliverables: [
      { id: 'D-1', description: 'Civil works and foundation completed', targetDate: '15-Jul-2026', status: 'Complete' },
      { id: 'D-2', description: 'Cleaning line commissioned and handed over', targetDate: '15-Sep-2026', status: 'In progress' },
    ],
    phases: [
      { id: 'PH-1', name: 'Site preparation', start: '01-Jun-2026', end: '15-Jul-2026' },
      { id: 'PH-2', name: 'Installation', start: '16-Jul-2026', end: '31-Aug-2026' },
      { id: 'PH-3', name: 'Commissioning and handover', start: '01-Sep-2026', end: '30-Sep-2026' },
    ],
    tasks: [
      { id: 'T-1', description: 'Site survey and foundation check', assigneeId: 'P-2', phaseId: 'PH-1', deliverableId: 'D-1', start: '01-Jun-2026', end: '20-Jun-2026', status: 'Complete', inboxRaised: '01-Jun-2026' },
      { id: 'T-2', description: 'Civil works contractor appointed', assigneeId: 'P-5', phaseId: 'PH-1', deliverableId: 'D-1', start: '10-Jun-2026', end: '30-Jun-2026', status: 'Complete', inboxRaised: '10-Jun-2026' },
      { id: 'T-3', description: 'Foundation poured and cured', assigneeId: 'P-2', phaseId: 'PH-1', deliverableId: 'D-1', start: '01-Jul-2026', end: '15-Jul-2026', status: 'Complete', inboxRaised: '01-Jul-2026' },
      { id: 'T-4', description: 'Line delivered to site and unloaded', assigneeId: 'P-2', phaseId: 'PH-2', deliverableId: 'D-2', start: '16-Jul-2026', end: '31-Jul-2026', status: 'Complete', inboxRaised: '16-Jul-2026' },
      // overdue — end date passed, status not complete
      { id: 'T-5', description: 'Electrical connection and switchgear', assigneeId: 'P-2', phaseId: 'PH-2', deliverableId: 'D-2', start: '01-Aug-2026', end: '13-Aug-2026', status: 'In progress', inboxRaised: '01-Aug-2026' },
      { id: 'T-6', description: 'Mechanical installation of the line', assigneeId: 'P-5', phaseId: 'PH-2', deliverableId: 'D-2', start: '05-Aug-2026', end: '31-Aug-2026', status: 'In progress', inboxRaised: '05-Aug-2026' },
      // overdue and blocked
      { id: 'T-7', description: 'Spare parts order placed with the supplier', assigneeId: 'P-5', phaseId: 'PH-2', start: '01-Aug-2026', end: '10-Aug-2026', status: 'Blocked', inboxRaised: '01-Aug-2026' },
      { id: 'T-8', description: 'Commissioning trial run and throughput test', assigneeId: 'P-3', phaseId: 'PH-3', deliverableId: 'D-2', start: '01-Sep-2026', end: '15-Sep-2026', status: 'Not started' },
      { id: 'T-9', description: 'Operator training and handover pack', assigneeId: 'P-3', phaseId: 'PH-3', deliverableId: 'D-2', start: '10-Sep-2026', end: '30-Sep-2026', status: 'Not started' },
    ],
    documents: ['line-specification.pdf', 'civil-works-contract.pdf', 'supplier-quotation.pdf'],
  },
  {
    id: 'PRJ-0044',
    name: 'Port Sudan bagged sesame supply tender',
    type: 'Tender',
    country: 'Sudan',
    scope: 'Prepare and submit the tender for the twelve-month bagged sesame supply programme, including specification, pricing and the compliance pack.',
    objective: 'Secure the supply programme at a margin consistent with the current costing basis.',
    ownerId: 'P-4',
    status: 'Active',
    start: '15-Jul-2026',
    plannedEnd: '31-Oct-2026',
    // NO budget recorded — and that is a neutral fact, not a warning
    team: [
      { personId: 'P-4', projectRole: 'Project owner' },
      { personId: 'P-1', projectRole: 'Country sign-off' },
    ],
    deliverables: [
      { id: 'D-3', description: 'Tender specification and pricing pack submitted', targetDate: '30-Sep-2026', status: 'In progress' },
      { id: 'D-4', description: 'Compliance and quality annexes submitted', targetDate: '30-Sep-2026', status: 'Not started' },
    ],
    phases: [
      { id: 'PH-4', name: 'Preparation', start: '15-Jul-2026', end: '15-Sep-2026' },
      { id: 'PH-5', name: 'Submission and follow-up', start: '16-Sep-2026', end: '31-Oct-2026' },
    ],
    tasks: [
      { id: 'T-10', description: 'Costing basis agreed with the trader', assigneeId: 'P-4', phaseId: 'PH-4', deliverableId: 'D-3', start: '15-Jul-2026', end: '05-Aug-2026', status: 'Complete', inboxRaised: '15-Jul-2026' },
      // overdue
      { id: 'T-11', description: 'Draft specification circulated for review', assigneeId: 'P-1', phaseId: 'PH-4', deliverableId: 'D-3', start: '01-Aug-2026', end: '15-Aug-2026', status: 'In progress', inboxRaised: '01-Aug-2026' },
      { id: 'T-12', description: 'Compliance annexes assembled', assigneeId: 'P-4', phaseId: 'PH-4', deliverableId: 'D-4', start: '20-Aug-2026', end: '15-Sep-2026', status: 'Not started' },
    ],
    documents: ['tender-invitation.pdf'],
  },
  {
    id: 'PRJ-0045',
    name: 'Humera distribution pilot',
    type: 'Distribution project',
    country: 'Ethiopia',
    scope: 'Pilot direct distribution from Humera to two regional buyers, to test the corridor and the handling arrangement.',
    objective: 'Establish whether direct distribution is viable before committing to the corridor for the full season.',
    ownerId: 'P-9',
    status: 'Active',
    start: '01-Aug-2026',
    plannedEnd: '30-Nov-2026',
    // Ethiopia does not capture budget — the panel is ABSENT, not empty
    team: [{ personId: 'P-9', projectRole: 'Project owner' }, { personId: 'P-8', projectRole: 'Country sign-off' }],
    deliverables: [
      { id: 'D-5', description: 'Corridor trial completed with two buyers', targetDate: '31-Oct-2026', status: 'In progress' },
    ],
    phases: [{ id: 'PH-6', name: 'Trial', start: '01-Aug-2026', end: '31-Oct-2026' }],
    tasks: [
      { id: 'T-13', description: 'Buyer agreements for the pilot', assigneeId: 'P-9', phaseId: 'PH-6', deliverableId: 'D-5', start: '01-Aug-2026', end: '31-Aug-2026', status: 'In progress', inboxRaised: '01-Aug-2026' },
    ],
    documents: [],
  },
  {
    id: 'PRJ-0039',
    name: 'Kassala warehouse refurbishment',
    type: 'Special operation',
    country: 'Sudan',
    scope: 'Refurbish two stores at Kassala, including roof repair, floor sealing and pest-proofing.',
    objective: 'Restore 1,200 MT of usable, compliant storage capacity.',
    ownerId: 'P-2',
    status: 'Completed',
    start: '01-Mar-2026',
    plannedEnd: '30-Jun-2026',
    actualEnd: '12-Jul-2026',
    closingNote: 'Roof materials arrived three weeks late, which carried the handover past the planned end date.',
    budget: 95000,
    currency: 'USD',
    team: [{ personId: 'P-2', projectRole: 'Project owner' }, { personId: 'P-6', projectRole: 'Site custodian' }],
    deliverables: [
      { id: 'D-6', description: 'Roof repaired and watertight', targetDate: '31-May-2026', status: 'Complete' },
      { id: 'D-7', description: 'Floors sealed and stores pest-proofed', targetDate: '30-Jun-2026', status: 'Complete' },
    ],
    phases: [{ id: 'PH-7', name: 'Refurbishment', start: '01-Mar-2026', end: '30-Jun-2026' }],
    tasks: [
      { id: 'T-14', description: 'Roof materials procured', assigneeId: 'P-2', phaseId: 'PH-7', deliverableId: 'D-6', start: '01-Mar-2026', end: '15-Apr-2026', status: 'Complete', inboxRaised: '01-Mar-2026' },
      { id: 'T-15', description: 'Roof repair completed', assigneeId: 'P-2', phaseId: 'PH-7', deliverableId: 'D-6', start: '16-Apr-2026', end: '31-May-2026', status: 'Complete', inboxRaised: '16-Apr-2026' },
      { id: 'T-16', description: 'Floor sealing and pest-proofing', assigneeId: 'P-2', phaseId: 'PH-7', deliverableId: 'D-7', start: '01-Jun-2026', end: '10-Jul-2026', status: 'Complete', inboxRaised: '01-Jun-2026' },
    ],
    documents: ['refurbishment-scope.pdf', 'handover-certificate.pdf'],
  },
];

/** What the module deliberately does not have — the scope guard, made visible. */
export const NOT_BUILT = [
  ['Percent-complete entry', 'Progress is derived from task and deliverable completion; a subjective figure is explicitly excluded.'],
  ['Task dependencies and critical path', 'Not asked for. This is basic planning and follow-up, not a project management system.'],
  ['Effort estimates, timesheets, resource levelling', 'Same — none of it appears in the nineteen steps.'],
  ['Actual spend against budget', 'Unresolved, and it would significantly increase the scope of this module.'],
  ['Risk and issue registers, change control', 'Not in the nineteen steps.'],
];

const d = (s: string) => new Date(s.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')).getTime();
export const TODAY = '19-Aug-2026';

export const daysBetween = (from: string, to: string) => Math.round((d(to) - d(from)) / 864e5);

/** Overdue is CALCULATED — there is no flag a user can set or clear. */
export const isOverdue = (endDate: string, status: string) =>
  status !== 'Complete' && d(TODAY) > d(endDate);

export const overdueBy = (endDate: string) => daysBetween(endDate, TODAY);

/** Progress derived from task AND deliverable completion — the arithmetic is printed on screen. */
export const progressOf = (p: Project) => {
  const tasksComplete = p.tasks.filter((t) => t.status === 'Complete').length;
  const delsComplete = p.deliverables.filter((x) => x.status === 'Complete').length;
  const total = p.tasks.length + p.deliverables.length;
  const complete = tasksComplete + delsComplete;
  return {
    tasksComplete, tasksTotal: p.tasks.length,
    delsComplete, delsTotal: p.deliverables.length,
    complete, total,
    percent: total ? Math.round((complete / total) * 100) : 0,
  };
};

export const openItems = (p: Project) => ({
  tasks: p.tasks.filter((t) => t.status !== 'Complete'),
  deliverables: p.deliverables.filter((x) => x.status !== 'Complete'),
  overdueTasks: p.tasks.filter((t) => isOverdue(t.end, t.status)),
  overdueDeliverables: p.deliverables.filter((x) => isOverdue(x.targetDate, x.status)),
});

export const timelinePosition = (p: Project) => {
  const planned = daysBetween(p.start, p.plannedEnd);
  const elapsed = Math.min(daysBetween(p.start, TODAY), planned);
  return { planned, elapsed, percent: planned ? Math.round((elapsed / planned) * 100) : 0 };
};
