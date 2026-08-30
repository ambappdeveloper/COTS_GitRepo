/* ------------------------------------------------------------------ *
 * C11 / C11 — Reporting and Dashboards
 *
 * The first module whose whole purpose is to read. Every other module
 * wrote something; C11 writes a saved view, a schedule and a card
 * definition, and otherwise reads the live stores of C01–C10.
 *
 * Three claims it has to prove, because a client will test each one:
 *   1. A number can always be explained — every figure is computed from a
 *      live store and drills to the records it was computed from. Nothing
 *      here is a hard-coded total, because a hard-coded total cannot be
 *      drilled.
 *   2. A report cannot show what the reader may not see — row-level
 *      security is applied before retrieval, and a scheduled report runs
 *      in the recipient's context, not the scheduler's.
 *   3. A printed copy must still be true — the parameters used travel with
 *      the output.
 *
 * This file holds the report *registry* and the static configuration. The
 * computation lives in the store, because it must read live state.
 * ------------------------------------------------------------------ */

export const TODAY_C11 = '2026-08-18';
export const NOW_C11 = '2026-08-18 09:20';

/* ------------------------------------------------------------------ *
 * WF-C11-01 / Steps 1, 9 — the report registry
 * ------------------------------------------------------------------ */

export const PARAMETERS = ['Country', 'Period', 'Commodity', 'Contract', 'Location', 'Status', 'Party'] as const;
export type ParamName = typeof PARAMETERS[number];

export type ReportSource = 'Transactional — real time' | 'Reporting store — scheduled refresh';

export interface ReportDef {
  id: string;
  name: string;
  module: string;
  /** what it answers, in business language rather than a field list */
  question: string;
  params: ParamName[];
  source: ReportSource;
  heavy: boolean;
  /** the list a figure drills into */
  drillTo: string;
  /** the permission required; empty = any signed-in user */
  roles: string[];
  /** the dimension the figures are grouped by, named for the parameter panel */
  dimension: string;
  /** the interim screen this report takes over from, where there is one */
  inheritedFrom?: { module: string; route: string; note: string };
  /** default period preset for this report — "the defaults appropriate to that report" */
  defaultPeriod: string;
  refreshedAt?: string;
}

export const PERIOD_PRESETS = [
  'This month',
  'Last month',
  'This season',
  'Last twelve months',
  'Custom'
] as const;

export const REPORTS: ReportDef[] = [
  {
    id: 'R-01', name: 'Access requests by status and age', module: 'C01',
    question: 'Where are access requests sitting, and how long have they been there?',
    params: ['Country', 'Period', 'Status'], source: 'Transactional — real time', heavy: false,
    drillTo: '/c1/access-requests', roles: [], dimension: 'Status', defaultPeriod: 'Last twelve months'
  },
  {
    id: 'R-02', name: 'User access and role assignment', module: 'C01',
    question: 'Who holds which role, in which countries, and what is delegated?',
    params: ['Country', 'Status'], source: 'Transactional — real time', heavy: false,
    drillTo: '/c1/users', roles: ['SYSTEM_ADMINISTRATOR', 'COMPLIANCE_OFFICER'], dimension: 'Role',
    defaultPeriod: 'This month'
  },
  {
    id: 'R-03', name: 'Master data completeness', module: 'C03',
    question: 'Which master records are incomplete or awaiting approval, by domain?',
    params: ['Country', 'Status', 'Commodity'], source: 'Transactional — real time', heavy: false,
    drillTo: '/c3/domains', roles: [], dimension: 'Domain', defaultPeriod: 'This month'
  },
  {
    id: 'R-04', name: 'Approval service level performance', module: 'C04',
    question: 'Are approvals meeting their service level, and where are they escalating?',
    params: ['Country', 'Period', 'Status'], source: 'Transactional — real time', heavy: false,
    drillTo: '/c4/sla', roles: [], dimension: 'Object type', defaultPeriod: 'This month'
  },
  {
    id: 'R-05', name: 'Notification delivery performance', module: 'C05',
    question: 'Are notifications reaching people, on which channels, and what is failing?',
    params: ['Country', 'Period', 'Status'], source: 'Transactional — real time', heavy: false,
    drillTo: '/c5/deliveries', roles: ['SYSTEM_ADMINISTRATOR', 'COMPLIANCE_OFFICER'], dimension: 'Channel',
    defaultPeriod: 'This month'
  },
  {
    id: 'R-06', name: 'Discussion and exception activity', module: 'C06',
    question: 'Where is discussion concentrated, and which exceptions are still open?',
    params: ['Country', 'Period'], source: 'Transactional — real time', heavy: false,
    drillTo: '/c6/discussions', roles: [], dimension: 'Record', defaultPeriod: 'This month'
  },
  {
    id: 'R-07', name: 'Document expiry exposure', module: 'C07',
    question: 'Which documents have lapsed or are about to, and what do they block?',
    params: ['Country', 'Period', 'Location', 'Party'], source: 'Transactional — real time', heavy: false,
    drillTo: '/c7/expiry', roles: [], dimension: 'Validity state', defaultPeriod: 'This month'
  },
  {
    id: 'R-08', name: 'Audit activity', module: 'C08',
    question: 'What changed, by whom, on which entities, and how much of it was sensitive?',
    params: ['Country', 'Period', 'Status'], source: 'Reporting store — scheduled refresh', heavy: true,
    drillTo: '/c8/search', roles: ['SYSTEM_ADMINISTRATOR', 'COMPLIANCE_OFFICER'], dimension: 'Entity',
    defaultPeriod: 'Last twelve months', refreshedAt: '2026-08-18 06:30'
  },
  {
    id: 'R-09', name: 'System health and incidents', module: 'C09',
    question: 'Is the system healthy, and what is open against it?',
    params: ['Country', 'Period', 'Status'], source: 'Transactional — real time', heavy: false,
    drillTo: '/c9/incidents', roles: ['SYSTEM_ADMINISTRATOR', 'COMPLIANCE_OFFICER'], dimension: 'Classification',
    defaultPeriod: 'This month',
    inheritedFrom: {
      module: 'C09', route: '/c9',
      note: 'The C09 administration health dashboard said on the screen that these five bands belong on the C11 dashboard, and was presented in C09 only because C11 was not built. Both read one store; the C09 screen stays because support wants it where they work.'
    }
  },
  {
    id: 'R-10', name: 'Country configuration statement', module: 'C10',
    question: 'Exactly which steps, fields, routes and rules apply in a country?',
    params: ['Country'], source: 'Transactional — real time', heavy: false,
    drillTo: '/c10/report', roles: [], dimension: 'Module', defaultPeriod: 'This month',
    inheritedFrom: {
      module: 'C10', route: '/c10/report',
      note: 'The C10 configuration report carried a banner saying it belongs in the shared reporting area with a parameter panel and an export. Registering it here is what that banner promised; the C10 screen remains the printable statement.'
    }
  },
  {
    id: 'R-11', name: 'Consolidated multi-country summary', module: 'Shared',
    question: 'How do the countries compare, normalised to the reporting currency and unit?',
    params: ['Country', 'Period'], source: 'Reporting store — scheduled refresh', heavy: true,
    drillTo: '/c11/reports/R-11', roles: [], dimension: 'Country', defaultPeriod: 'Last twelve months',
    refreshedAt: '2026-08-18 06:30',
    inheritedFrom: {
      module: 'C10', route: '/c10/formats',
      note: 'C10 defines a reporting currency and a default unit per country and named them as normalisation targets for C11. This report is the consumer that makes those settings mean something.'
    }
  },
  {
    id: 'R-12', name: 'Interface health and reconciliation', module: 'C12',
    question: 'Which interfaces are failing, how much is stuck in the queue, and did the last reconciliation agree?',
    params: ['Period'], source: 'Transactional — real time', heavy: false,
    drillTo: '/c11/reports/R-12', roles: ['SYSTEM_ADMINISTRATOR', 'COMPLIANCE_OFFICER'], dimension: 'Interface',
    defaultPeriod: 'Last thirty days', refreshedAt: 'Live',
    inheritedFrom: {
      module: 'C12', route: '/c12/health',
      note: 'C12 owns the interface health view. This is the same measure rendered through the C11 engine so it can be scheduled and distributed — one store, read twice, not a second count.'
    }
  }
];

export function reportDef(id: string): ReportDef | undefined {
  return REPORTS.find((r) => r.id === id);
}

/* ------------------------------------------------------------------ *
 * WF-C11-01 / Step 7 — export layouts and mandated templates
 * ------------------------------------------------------------------ */

export type ExportLayout = 'Excel' | 'Formatted document' | 'Mandated external template';
export const EXPORT_LAYOUTS: ExportLayout[] = ['Excel', 'Formatted document', 'Mandated external template'];

export interface MandatedTemplate {
  id: string;
  name: string;
  mandatedBy: string;
  columns: string[];
  /** the layout itself awaits the external specification */
  specificationReceived: boolean;
}

export const MANDATED_TEMPLATES: MandatedTemplate[] = [
  {
    id: 'TPL-CLR-01', name: 'Clearance reporting format — export declaration summary',
    mandatedBy: 'Customs authority', specificationReceived: false,
    columns: ['Declaration reference', 'Exporter', 'Commodity code', 'Net weight (kg)', 'Value (USD)', 'Destination', 'Clearance date']
  },
  {
    id: 'TPL-CLR-02', name: 'Clearance reporting format — quality certificate schedule',
    mandatedBy: 'Standards authority', specificationReceived: false,
    columns: ['Certificate reference', 'Batch code', 'Commodity', 'Parameter', 'Result', 'Specification', 'Inspector']
  },
  {
    id: 'TPL-BNK-01', name: 'Bank facility utilisation return',
    mandatedBy: 'Facility bank', specificationReceived: false,
    columns: ['Facility reference', 'Drawn', 'Available', 'Currency', 'As at date']
  }
];

/* ------------------------------------------------------------------ *
 * WF-C11-01 / Step 8 — saved views, personal and role-published
 * ------------------------------------------------------------------ */

export interface SavedView {
  id: string;
  name: string;
  report: string;
  params: Record<string, string>;
  visibility: 'Personal' | 'Shared';
  publishedForRole?: string;
  owner: string;
  createdAt: string;
}

export const PUBLISH_ROLES = ['COUNTRY_MANAGER', 'COMPLIANCE_OFFICER', 'SYSTEM_ADMINISTRATOR'];

export const seedSavedViews: SavedView[] = [
  {
    id: 'SV-1', name: 'Requests older than five days', report: 'R-01',
    params: { Period: 'Last twelve months', Status: 'Pending Approval' },
    visibility: 'Personal', owner: 'Nasreen Sayed', createdAt: '2026-08-04 08:20'
  },
  {
    id: 'SV-2', name: 'Country manager monthly pack', report: 'R-04',
    params: { Period: 'This month' },
    visibility: 'Shared', publishedForRole: 'COUNTRY_MANAGER',
    owner: 'Nasreen Sayed', createdAt: '2026-07-30 15:05'
  },
  {
    id: 'SV-3', name: 'Sensitive audit activity, twelve months', report: 'R-08',
    params: { Period: 'Last twelve months', Status: 'Sensitive only' },
    visibility: 'Shared', publishedForRole: 'COMPLIANCE_OFFICER',
    owner: 'Fatima Idris', createdAt: '2026-08-01 09:40'
  }
];

/* ------------------------------------------------------------------ *
 * WF-C11-02 / Steps 1, 3 — the card fields C02's catalogue does not carry
 *
 * There is ONE catalogue. C11 enriches the C02 CARD_CATALOGUE in place
 * rather than publishing a rival list that would drift from the one the
 * shell actually renders — the same decision taken when the C06 comments
 * and C07 documents placeholders were retired.
 * ------------------------------------------------------------------ */

export const REFRESH_CYCLES = ['On load', '5 minutes', 'Hourly', 'Daily'] as const;
export type RefreshCycle = typeof REFRESH_CYCLES[number];

export interface CardEnrichment {
  key: string;
  measure: string;
  filters: string;
  refreshCycle: RefreshCycle;
  lastRefreshed: string;
}

export const seedCardEnrichment: CardEnrichment[] = [
  { key: 'pending', measure: 'Count of open tasks assigned to the signed-in user', filters: 'Assignee = me; status ≠ Closed', refreshCycle: 'On load', lastRefreshed: '2026-08-18 09:20' },
  { key: 'requests', measure: 'Count of access requests by status', filters: 'Country = active context', refreshCycle: '5 minutes', lastRefreshed: '2026-08-18 09:18' },
  { key: 'reviews', measure: 'Count of access review packs due within 30 days', filters: 'Country = active context; status = Open', refreshCycle: 'Daily', lastRefreshed: '2026-08-18 06:00' },
  { key: 'delegations', measure: 'Count of delegations in force today', filters: 'Delegator or delegate = me', refreshCycle: 'On load', lastRefreshed: '2026-08-18 09:20' },
  { key: 'dormant', measure: 'Count of accounts with no sign-in for 90 days', filters: 'Status = Active', refreshCycle: 'Daily', lastRefreshed: '2026-08-17 06:00' },
  { key: 'recent', measure: 'The last ten records the user opened', filters: 'User = me; country = active context', refreshCycle: 'On load', lastRefreshed: '2026-08-18 09:20' },
  { key: 'alerts', measure: 'Unread notifications and announcements', filters: 'Recipient = me', refreshCycle: '5 minutes', lastRefreshed: '2026-08-18 09:15' },
  { key: 'ageing', measure: 'Open team tasks by ageing bucket', filters: 'Country = active context; team = my team', refreshCycle: 'Hourly', lastRefreshed: '2026-08-18 08:00' },
  { key: 'throughput', measure: 'Tasks closed per week, last eight weeks', filters: 'Country = active context', refreshCycle: 'Daily', lastRefreshed: '2026-08-16 06:00' },
  { key: 'compliance', measure: 'Sensitive actions and open compliance items', filters: 'Country ∈ my scope', refreshCycle: 'Hourly', lastRefreshed: '2026-08-18 07:00' }
];

/** Step 3 — the last refresh time exists so that staleness can be judged, not merely displayed. */
export function cycleMinutes(c: RefreshCycle): number {
  if (c === 'On load') return 0;
  if (c === '5 minutes') return 5;
  if (c === 'Hourly') return 60;
  return 1440;
}

export function minutesBetween(from: string, to: string): number {
  const a = new Date(`${from.slice(0, 10)}T${from.slice(11, 16) || '00:00'}:00Z`).getTime();
  const b = new Date(`${to.slice(0, 10)}T${to.slice(11, 16) || '00:00'}:00Z`).getTime();
  return Math.round((b - a) / 60000);
}

export function isStale(e: CardEnrichment, now = NOW_C11): boolean {
  const cycle = cycleMinutes(e.refreshCycle);
  if (cycle === 0) return false;
  return minutesBetween(e.lastRefreshed, now) > cycle;
}

/* ------------------------------------------------------------------ *
 * WF-C11-02 / Steps 5–7 — schedules and distribution
 * ------------------------------------------------------------------ */

export type ScheduleTrigger = 'Daily' | 'Weekly' | 'Monthly' | 'Business event';

export const BUSINESS_EVENTS = [
  'Sales contract created',
  'Approval passed its service level',
  'Monitoring threshold breached',
  'Document expired',
  'Master data record approved'
];

export interface ScheduleDef {
  id: string;
  report: string;
  params: Record<string, string>;
  trigger: ScheduleTrigger;
  timeOrEvent: string;
  namedRecipients: string[];
  roleRecipients: string[];
  format: ExportLayout;
  templateId?: string;
  owner: string;
  status: 'Active' | 'Paused' | 'Failing';
  lastRun?: string;
  lastOutcome?: string;
  nextRun: string;
}

export const seedSchedules: ScheduleDef[] = [
  {
    id: 'SCH-1', report: 'R-04', params: { Period: 'This month' }, trigger: 'Weekly',
    timeOrEvent: 'Monday at 07:00', namedRecipients: ['Fatima Idris'], roleRecipients: ['COUNTRY_MANAGER'],
    format: 'Formatted document', owner: 'Nasreen Sayed', status: 'Active',
    lastRun: '2026-08-17 07:00', lastOutcome: 'Delivered', nextRun: '2026-08-24 07:00'
  },
  {
    id: 'SCH-2', report: 'R-07', params: { Period: 'This month' }, trigger: 'Daily',
    timeOrEvent: '06:30', namedRecipients: ['Ahmed Osman'], roleRecipients: [],
    format: 'Excel', owner: 'Nasreen Sayed', status: 'Active',
    lastRun: '2026-08-18 06:30', lastOutcome: 'Delivered', nextRun: '2026-08-19 06:30'
  },
  {
    id: 'SCH-3', report: 'R-08', params: { Period: 'Last twelve months', Status: 'Sensitive only' },
    trigger: 'Monthly', timeOrEvent: 'First day at 05:00', namedRecipients: ['Fatima Idris'],
    roleRecipients: ['COMPLIANCE_OFFICER'], format: 'Excel', owner: 'Fatima Idris', status: 'Active',
    lastRun: '2026-08-01 05:00', lastOutcome: 'Delivered', nextRun: '2026-09-01 05:00'
  },
  {
    /* The business-event trigger, and the branch that fails — Step 7 */
    id: 'SCH-4', report: 'R-09', params: { Period: 'This month' }, trigger: 'Business event',
    timeOrEvent: 'Monitoring threshold breached', namedRecipients: ['Agrotem Trading (portal)'],
    roleRecipients: [], format: 'Excel', owner: 'Nasreen Sayed', status: 'Failing',
    lastRun: '2026-08-18 09:15', lastOutcome: 'Failed — the recipient address was rejected',
    nextRun: 'On the next threshold breach'
  },
  {
    id: 'SCH-5', report: 'R-01', params: { Period: 'This month', Status: 'Pending Approval' },
    trigger: 'Business event', timeOrEvent: 'Approval passed its service level',
    namedRecipients: ['Grace Mensah'], roleRecipients: [], format: 'Formatted document',
    owner: 'Grace Mensah', status: 'Active', nextRun: 'On the next service level breach'
  }
];

export interface DistributionRec {
  id: string;
  schedule: string;
  report: string;
  at: string;
  recipient: string;
  recipientType: string;
  /** the security context the report was generated in — the recipient's, never the scheduler's */
  context: string;
  rows: number;
  channel: string;
  outcome: 'Delivered' | 'Failed';
  failureDetail?: string;
  reportedTo?: string;
  logRef?: string;
}

export const seedDistribution: DistributionRec[] = [
  {
    id: 'SR-1', schedule: 'SCH-1', report: 'R-04', at: '2026-08-17 07:00', recipient: 'Fatima Idris',
    recipientType: 'Internal Stakeholder', context: 'Compliance Officer · Sudan, Ethiopia, Tanzania, Mozambique',
    rows: 12, channel: 'Email', outcome: 'Delivered'
  },
  {
    id: 'SR-2', schedule: 'SCH-1', report: 'R-04', at: '2026-08-17 07:00', recipient: 'Grace Mensah',
    recipientType: 'Team Member', context: 'Country Manager · Mozambique',
    rows: 3, channel: 'Email', outcome: 'Delivered'
  },
  {
    id: 'SR-3', schedule: 'SCH-2', report: 'R-07', at: '2026-08-18 06:30', recipient: 'Ahmed Osman',
    recipientType: 'Team Member', context: 'Sourcing Officer · Sudan',
    rows: 5, channel: 'Email', outcome: 'Delivered'
  },
  {
    id: 'SR-4', schedule: 'SCH-4', report: 'R-09', at: '2026-08-18 09:15',
    recipient: 'Agrotem Trading (portal)', recipientType: 'External User',
    context: 'External · restricted to records in which SUP-004821 Agrotem Trading LLC is a participant',
    rows: 0, channel: 'Email', outcome: 'Failed',
    failureDetail: 'The recipient address was rejected by the receiving server (550 mailbox unavailable).',
    reportedTo: 'Nasreen Sayed', logRef: 'LG-9'
  }
];

/* ------------------------------------------------------------------ *
 * Notes carried on the screens
 * ------------------------------------------------------------------ */

export const DELIVERY_MODEL_NOTE =
  'Whether reporting is delivered in-application, through a business intelligence tool, or both — and the licensing '
  + 'implication — is unconfirmed, as is the definitive report inventory per module, which is to be compiled with the '
  + 'module owners (WF-C11-01 / Step 1). The eleven reports registered here are the ones the built modules can honestly '
  + 'answer, and no business intelligence tool is named, because naming one would be a decision with a licence attached.';

export const CONSOLIDATED_ROLES_NOTE =
  'Which roles may see consolidated multi-country data is unconfirmed (WF-C11-01 / Step 2). To show the branch at all '
  + 'the prototype treats a user whose access scope contains more than one country as holding regional scope — a reading '
  + 'of the C01 data that already exists rather than a new rule — and the role list remains open.';

export const LATENCY_NOTE =
  'The data latency acceptable per report — real time against the transactional store, or scheduled refresh against a '
  + 'reporting store — is unconfirmed (WF-C11-01 / Step 9). Each report therefore carries its own source rather than one '
  + 'global setting, with the heavy reports on the reporting store so that operational performance is protected.';

export const TEMPLATE_SPEC_NOTE =
  'The mandated export layouts themselves await the external specification. The clearance reporting formats are named in '
  + 'the workflow but not specified, so the columns listed here are placeholders: the point being demonstrated is that a '
  + 'mandated export follows its configured template exactly and is not adjustable at export time.';

export const CARD_OWNERSHIP_ISSUE =
  'Integration consistency issue: the dashboard card catalogue and role default layouts appear as configuration in both '
  + 'C2 and C11 — C2 / WF-C2-02 / Step 3 has cards supplied by the owning module, while C11 / WF-C11-02 / Step 1 has each '
  + 'module publish the catalogue. Confirm which module owns the card catalogue and the role default layout '
  + 'configuration. C10 is a third candidate, since it holds every other piece of configuration. This prototype takes '
  + 'the one honest position available — there is one catalogue, enriched in place, not two that would silently diverge — '
  + 'and resolves nothing.';

export const CONTRACT_PARAM_NOTE =
  'The contract parameter is named in WF-C11-01 / Step 3, but the operational modules that hold contracts are not built, '
  + 'so it accepts a reference and filters nothing yet. It is shown rather than omitted so the parameter set matches the '
  + 'workflow.';

export const REPORT_ADMIN_ROLES = ['SYSTEM_ADMINISTRATOR'];
export const SCHEDULE_ROLES = ['SYSTEM_ADMINISTRATOR', 'COUNTRY_MANAGER', 'COMPLIANCE_OFFICER'];
