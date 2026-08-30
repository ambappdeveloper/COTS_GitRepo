/* ------------------------------------------------------------------ *
 * C09 / C9 — System Logging and Monitoring
 *
 * The other half of the C8/C9 line. C8 records business activity and is
 * evidential, immutable and retained for years. C9 records technical
 * activity — errors, integration exchanges, jobs, health and performance —
 * and is diagnostic, masked, rotated and deliberately disposable.
 *
 * Everything here is mock data held in memory. No logging framework, no
 * monitoring tool, no external service: the module simulates the technical
 * layer visually, exactly as the phase brief requires.
 * ------------------------------------------------------------------ */

export const TODAY_C9 = '2026-08-18';
export const NOW_C9 = '2026-08-18 09:20';

/* ------------------------------------------------------------------ *
 * WF-C9-01 / Step 1 — severity levels and log level per environment
 * ------------------------------------------------------------------ */

export const SEVERITIES = ['Trace', 'Debug', 'Information', 'Warning', 'Error', 'Critical'] as const;
export type Severity = typeof SEVERITIES[number];

/** Ordered, so "Warning and above" is a comparison rather than a list. */
export function severityRank(s: Severity): number {
  return SEVERITIES.indexOf(s);
}

export const SEVERITY_MEANING: Record<Severity, string> = {
  Trace: 'Method entry and exit, loop detail',
  Debug: 'Diagnostic values, resolved parameters',
  Information: 'Normal operations — a save, a dispatch, a job start',
  Warning: 'Recoverable — a retry, a skipped record, a slow response',
  Error: 'An operation failed — an incident is created',
  Critical: 'A classified critical case — an incident is created and support is alerted'
};

export const SEVERITY_COLOUR: Record<Severity, string> = {
  Trace: '#6B6B6B',
  Debug: '#6B6B6B',
  Information: '#0F79C4',
  Warning: '#C77700',
  Error: '#B3261E',
  Critical: '#7A1512'
};

export const ENVIRONMENTS = ['Development', 'Test', 'Production'] as const;
export type Environment = typeof ENVIRONMENTS[number];

export const COMPONENTS = [
  'Web application',
  'Approval engine',
  'Notification engine',
  'Document service',
  'Integration service',
  'Job scheduler',
  'Audit service'
] as const;
export type ComponentName = typeof COMPONENTS[number];

export interface LogLevelDef {
  component: ComponentName;
  Development: Severity;
  Test: Severity;
  Production: Severity;
  changedAt: string;
  changedBy: string;
}

export const seedLogLevels: LogLevelDef[] = [
  { component: 'Web application', Development: 'Debug', Test: 'Information', Production: 'Warning', changedAt: '2026-06-01 08:00', changedBy: 'Nasreen Sayed' },
  { component: 'Approval engine', Development: 'Debug', Test: 'Information', Production: 'Warning', changedAt: '2026-06-01 08:00', changedBy: 'Nasreen Sayed' },
  { component: 'Notification engine', Development: 'Trace', Test: 'Debug', Production: 'Information', changedAt: '2026-08-02 11:15', changedBy: 'Nasreen Sayed' },
  { component: 'Document service', Development: 'Debug', Test: 'Information', Production: 'Warning', changedAt: '2026-06-01 08:00', changedBy: 'Nasreen Sayed' },
  { component: 'Integration service', Development: 'Trace', Test: 'Debug', Production: 'Information', changedAt: '2026-08-10 06:40', changedBy: 'Nasreen Sayed' },
  { component: 'Job scheduler', Development: 'Debug', Test: 'Information', Production: 'Warning', changedAt: '2026-06-01 08:00', changedBy: 'Nasreen Sayed' },
  { component: 'Audit service', Development: 'Debug', Test: 'Information', Production: 'Information', changedAt: '2026-07-14 16:20', changedBy: 'Nasreen Sayed' }
];

export function levelFor(levels: LogLevelDef[], component: string, env: Environment): Severity {
  const row = levels.find((l) => l.component === component);
  return row ? row[env] : 'Information';
}

/* ------------------------------------------------------------------ *
 * WF-C9-01 / Step 2 — masking rules, applied as the entry is written
 * ------------------------------------------------------------------ */

export type MaskMode = 'Full' | 'Partial' | 'Hash';
export const MASK_TARGETS = ['Log message', 'Payload reference', 'Exception detail', 'Stack trace'] as const;

export interface MaskRule {
  id: string;
  name: string;
  pattern: string;
  mode: MaskMode;
  appliesTo: string[];
  active: boolean;
  touched24h: number;
}

export const seedMaskRules: MaskRule[] = [
  {
    id: 'MK-1', name: 'Password and secret', pattern: 'Any value written against a password, secret, token or key field',
    mode: 'Full', appliesTo: ['Log message', 'Exception detail', 'Stack trace'], active: true, touched24h: 12
  },
  {
    id: 'MK-2', name: 'Bank account', pattern: 'A bank account or IBAN written in a payment or supplier payload',
    mode: 'Full', appliesTo: ['Log message', 'Payload reference', 'Exception detail', 'Stack trace'], active: true, touched24h: 31
  },
  {
    id: 'MK-3', name: 'Identity document number', pattern: 'A passport, national identity or trade licence number',
    mode: 'Partial', appliesTo: ['Log message', 'Exception detail'], active: true, touched24h: 8
  },
  {
    id: 'MK-4', name: 'Personal contact detail', pattern: 'A personal telephone number or a private email address',
    mode: 'Partial', appliesTo: ['Log message', 'Exception detail'], active: true, touched24h: 44
  },
  {
    id: 'MK-5', name: 'Price and commercial terms', pattern: 'A unit price, premium or payment term in a contract payload',
    mode: 'Hash', appliesTo: ['Payload reference'], active: true, touched24h: 19
  },
  {
    id: 'MK-6', name: 'Full request payload', pattern: 'The complete inbound or outbound body of an exchange',
    mode: 'Hash', appliesTo: ['Payload reference'], active: false, touched24h: 0
  }
];

/** Applies a mask mode to a value for the demonstration on the log level screen. */
export function applyMask(value: string, mode: MaskMode): string {
  if (mode === 'Full') return '•'.repeat(Math.min(value.replace(/\s/g, '').length, 16));
  if (mode === 'Partial') {
    const clean = value.replace(/\s/g, '');
    const tail = clean.slice(-4);
    return `${'•'.repeat(Math.max(clean.length - 4, 4))} ${tail}`.trim();
  }
  // Hash — a stable, comparable reference that is not the value
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) % 0xffffff;
  return `sha256:${h.toString(16).padStart(6, '0')}…`;
}

/** The worked example on the masking panel — a real bank account never written in clear. */
export const MASK_DEMO = {
  field: 'supplier.bankAccount',
  original: '4417 8820 3391 5502',
  entry: 'Supplier payment instruction written for MD-3 — Nile Cotton Ginners'
};

/* ------------------------------------------------------------------ *
 * The technical log itself
 * ------------------------------------------------------------------ */

export interface LogEntry {
  id: string;
  at: string;
  severity: Severity;
  component: string;
  environment: Environment;
  message: string;
  /** correlation reference, where the entry arose inside an exchange */
  correlation?: string;
  /** error reference, where the entry produced an incident */
  errorRef?: string;
  /** masked values carried by this entry, shown as masked */
  masked?: { field: string; value: string; rule: string }[];
  /** run reference, where the entry belongs to a job run */
  run?: string;
  archived?: boolean;
  logClass: LogClass;
}

export const LOG_CLASSES = [
  'Application log',
  'Integration exchange log',
  'Job log',
  'Incident record',
  'Monitoring measurement'
] as const;
export type LogClass = typeof LOG_CLASSES[number];

export const seedLogEntries: LogEntry[] = [
  { id: 'LG-1', at: '2026-08-18 09:14:02', severity: 'Critical', component: 'Integration service', environment: 'Production', logClass: 'Application log', message: 'SAP purchase order retrieval unreachable after 3 attempts — interface marked in outage', correlation: 'CORR-8f2a41', errorRef: 'ERR-2026-08-18-0004' },
  { id: 'LG-2', at: '2026-08-18 09:14:02', severity: 'Error', component: 'Integration service', environment: 'Production', logClass: 'Integration exchange log', message: 'Attempt 3 of 3 failed — endpoint timed out after 30000 ms', correlation: 'CORR-8f2a41' },
  { id: 'LG-3', at: '2026-08-18 09:13:31', severity: 'Warning', component: 'Integration service', environment: 'Production', logClass: 'Integration exchange log', message: 'Attempt 2 of 3 failed — retrying in 30 seconds', correlation: 'CORR-8f2a41' },
  { id: 'LG-4', at: '2026-08-18 09:13:01', severity: 'Warning', component: 'Integration service', environment: 'Production', logClass: 'Integration exchange log', message: 'Attempt 1 of 3 failed — retrying in 30 seconds', correlation: 'CORR-8f2a41' },
  { id: 'LG-5', at: '2026-08-18 06:00:07', severity: 'Information', component: 'Job scheduler', environment: 'Production', logClass: 'Job log', message: 'Notification evaluation completed — 5 in scope, 2 skipped, 6 notifications issued', run: 'JR-1001' },
  { id: 'LG-6', at: '2026-08-18 02:14:10', severity: 'Warning', component: 'Integration service', environment: 'Production', logClass: 'Integration exchange log', message: '6 records held in exception — external code not mapped', correlation: 'CORR-8f2a41' },
  { id: 'LG-7', at: '2026-08-18 02:14:09', severity: 'Debug', component: 'Integration service', environment: 'Production', logClass: 'Application log', message: 'Resolved 47 of 53 inbound purchase order lines against master data', correlation: 'CORR-8f2a41' },
  { id: 'LG-8', at: '2026-08-18 01:05:44', severity: 'Information', component: 'Document service', environment: 'Production', logClass: 'Application log', message: 'Supplier payment instruction written for MD-3 — Nile Cotton Ginners', masked: [{ field: 'supplier.bankAccount', value: '•••••••••••••••', rule: 'Bank account' }] },
  { id: 'LG-9', at: '2026-08-17 22:00:03', severity: 'Error', component: 'Notification engine', environment: 'Production', logClass: 'Application log', message: 'Dispatch to portal@beiralog.example failed permanently after 3 attempts', errorRef: 'ERR-2026-08-17-0003' },
  { id: 'LG-10', at: '2026-08-17 14:22:51', severity: 'Trace', component: 'Web application', environment: 'Development', logClass: 'Application log', message: 'ApprovalController.Decide entered — instance AI-2, step 2' },
  { id: 'LG-11', at: '2026-08-17 14:22:51', severity: 'Debug', component: 'Approval engine', environment: 'Development', logClass: 'Application log', message: 'Route resolved: RT-1 version 3, 3 steps, 2 required at step 2' },
  { id: 'LG-12', at: '2026-08-17 09:41:12', severity: 'Warning', component: 'Web application', environment: 'Production', logClass: 'Application log', message: '5 failed sign-in attempts for account j.mwangi within 4 minutes — account locked' },
  { id: 'LG-13', at: '2026-08-16 06:00:11', severity: 'Warning', component: 'Job scheduler', environment: 'Production', logClass: 'Job log', message: 'Notification evaluation ran 11 s against an expected window of 10 s — overrun', run: 'JR-1003' },
  { id: 'LG-14', at: '2026-08-16 06:00:10', severity: 'Error', component: 'Notification engine', environment: 'Production', logClass: 'Job log', message: '1 notification failed permanently during the run', run: 'JR-1003' },
  { id: 'LG-15', at: '2026-08-15 03:00:02', severity: 'Information', component: 'Audit service', environment: 'Production', logClass: 'Application log', message: 'Audit retention cycle completed — 0 archived, 0 trimmed', archived: true },
  { id: 'LG-16', at: '2026-08-14 12:31:07', severity: 'Error', component: 'Document service', environment: 'Production', logClass: 'Application log', message: 'Virus scan service returned an unexpected response for upload DOC-load-3', errorRef: 'ERR-2026-08-14-0002' },
  { id: 'LG-17', at: '2026-08-12 08:15:20', severity: 'Information', component: 'Web application', environment: 'Production', logClass: 'Application log', message: 'Identity document number recorded against user account U-9', masked: [{ field: 'user.identityDocument', value: '••••••• 4429', rule: 'Identity document number' }] },
  { id: 'LG-18', at: '2026-07-30 03:00:01', severity: 'Information', component: 'Job scheduler', environment: 'Production', logClass: 'Job log', message: 'Data synchronisation completed — 1 204 records processed, 0 failures', archived: true },
  { id: 'LG-19', at: '2026-07-12 03:00:01', severity: 'Information', component: 'Job scheduler', environment: 'Production', logClass: 'Job log', message: 'Data synchronisation completed — 1 187 records processed, 2 failures', archived: true },
  { id: 'LG-20', at: '2026-06-28 09:02:44', severity: 'Debug', component: 'Web application', environment: 'Production', logClass: 'Application log', message: 'Report parameter panel resolved 4 saved templates for user U-1', archived: true }
];

/* ------------------------------------------------------------------ *
 * WF-C9-01 / Steps 3–7 — incidents
 * ------------------------------------------------------------------ */

export const CRITICAL_CLASSES = [
  'Authentication failure at scale',
  'Integration outage',
  'Job failure',
  'Data integrity violation'
] as const;
export const NON_CRITICAL_CLASS = 'Unclassified — non-critical';
export const CLASSIFICATIONS = [...CRITICAL_CLASSES, NON_CRITICAL_CLASS] as const;
export type Classification = typeof CLASSIFICATIONS[number];

export function isCritical(c: Classification): boolean {
  return (CRITICAL_CLASSES as readonly string[]).includes(c);
}

export type IncidentStatus = 'Open' | 'Investigating' | 'Resolved' | 'Closed' | 'Recurring';

export interface Occurrence {
  at: string;
  user: string;
  country: string;
  screen: string;
}

export interface Incident {
  id: string;
  errorRef: string;
  severity: 'Error' | 'Critical';
  classification: Classification;
  component: string;
  operation: string;
  screenOrService: string;
  country: string;
  /** the grouping fingerprint — component, operation and error type */
  fingerprint: string;
  firstSeen: string;
  lastSeen: string;
  occurrences: Occurrence[];
  status: IncidentStatus;
  owner?: string;
  cause?: string;
  resolution?: string;
  preventive?: string;
  closedAt?: string;
  reopenedFrom?: string;
  alertRaised?: boolean;
  alertAt?: string;
  alertRecipients?: string[];
  /** the friendly message the user was shown */
  friendly: string;
  /** support-only technical detail, already masked */
  exceptionType: string;
  exceptionMessage: string;
  stackTrace: string[];
  parameters: { field: string; value: string; masked?: string }[];
  correlation?: string;
  run?: string;
  /** technical trail — assignment, reclassification, closure are C9 events, not C8 */
  trail: { at: string; by: string; what: string }[];
}

export const seedIncidents: Incident[] = [
  {
    id: 'IN-1', errorRef: 'ERR-2026-08-18-0004', severity: 'Critical', classification: 'Integration outage',
    component: 'Integration service', operation: 'SAP purchase order retrieval',
    screenOrService: 'Scheduled data synchronisation', country: 'Global',
    fingerprint: 'Integration service · SAP purchase order retrieval · TimeoutException',
    firstSeen: '2026-08-18 09:13:01', lastSeen: '2026-08-18 09:14:02',
    occurrences: [
      { at: '2026-08-18 09:13:01', user: 'Job service identity', country: 'Global', screen: 'Scheduled data synchronisation' },
      { at: '2026-08-18 09:13:31', user: 'Job service identity', country: 'Global', screen: 'Scheduled data synchronisation' },
      { at: '2026-08-18 09:14:02', user: 'Job service identity', country: 'Global', screen: 'Scheduled data synchronisation' }
    ],
    status: 'Investigating', owner: 'Nasreen Sayed',
    alertRaised: true, alertAt: '2026-08-18 09:14', alertRecipients: ['Support group (placeholder)'],
    friendly: 'We could not reach the enterprise resource planning system while bringing in purchase orders. Nothing you entered has been lost.',
    exceptionType: 'System.TimeoutException',
    exceptionMessage: 'The request to the purchase order endpoint did not complete within 30000 ms.',
    stackTrace: [
      'at IntegrationService.Exchange.SendAsync(endpoint, payloadRef) line 214',
      'at IntegrationService.RetryPolicy.ExecuteAsync(attempt: 3 of 3) line 96',
      'at DataSynchronisationJob.RunAsync(correlation: CORR-8f2a41) line 58'
    ],
    parameters: [
      { field: 'endpoint', value: 'https://erp.internal/api/purchase-orders' },
      { field: 'apiKey', value: '••••••••••••••••', masked: 'Password and secret' },
      { field: 'requestedFrom', value: '2026-08-17T00:00:00Z' },
      { field: 'payloadReference', value: 'sha256:a41f09…', masked: 'Full request payload' }
    ],
    correlation: 'CORR-8f2a41', run: 'JR-1005',
    trail: [
      { at: '2026-08-18 09:14:02', by: 'System', what: 'Incident created from an unhandled error, reference ERR-2026-08-18-0004' },
      { at: '2026-08-18 09:14:03', by: 'System', what: 'Classified Integration outage — critical; alert raised to the support group through C05 rule NR-12' },
      { at: '2026-08-18 09:22:10', by: 'Nasreen Sayed', what: 'Assigned to Nasreen Sayed; status set to Investigating' }
    ]
  },
  {
    id: 'IN-2', errorRef: 'ERR-2026-08-17-0003', severity: 'Error', classification: NON_CRITICAL_CLASS,
    component: 'Notification engine', operation: 'External dispatch',
    screenOrService: 'Notification dispatch service', country: 'Mozambique',
    fingerprint: 'Notification engine · External dispatch · SmtpPermanentFailure',
    firstSeen: '2026-08-17 22:00:03', lastSeen: '2026-08-17 22:00:03',
    occurrences: [{ at: '2026-08-17 22:00:03', user: 'Notification service identity', country: 'Mozambique', screen: 'Notification dispatch service' }],
    status: 'Open',
    friendly: 'A message to an external contact could not be delivered. The failure has been recorded and an administrator has been informed.',
    exceptionType: 'Smtp.PermanentFailureException',
    exceptionMessage: 'The recipient address was rejected by the receiving server (550 mailbox unavailable).',
    stackTrace: [
      'at NotificationEngine.Dispatch.SendEmailAsync(recipient) line 143',
      'at NotificationEngine.RetryPolicy.ExecuteAsync(attempt: 3 of 3) line 96'
    ],
    parameters: [
      { field: 'recipient', value: 'portal@beiralog.example' },
      { field: 'templateEvent', value: 'Welcome / activation' },
      { field: 'personalTelephone', value: '•••••••• 7741', masked: 'Personal contact detail' }
    ],
    trail: [
      { at: '2026-08-17 22:00:03', by: 'System', what: 'Incident created from a permanent dispatch failure handed off by C05 / WF-C5-01 / Step 8' }
    ]
  },
  {
    id: 'IN-3', errorRef: 'ERR-2026-08-14-0002', severity: 'Error', classification: NON_CRITICAL_CLASS,
    component: 'Document service', operation: 'Virus scan',
    screenOrService: 'Document upload', country: 'Sudan',
    fingerprint: 'Document service · Virus scan · UnexpectedResponse',
    firstSeen: '2026-08-14 12:31:07', lastSeen: '2026-08-18 08:47:19',
    occurrences: [
      { at: '2026-08-14 12:31:07', user: 'Nasreen Sayed', country: 'Sudan', screen: 'Document upload' },
      { at: '2026-08-15 10:02:44', user: 'Joseph Mwangi', country: 'Sudan', screen: 'Document upload' },
      { at: '2026-08-16 16:18:02', user: 'Amira Hassan', country: 'Egypt', screen: 'Document upload' },
      { at: '2026-08-17 11:55:31', user: 'Nasreen Sayed', country: 'Sudan', screen: 'Document upload' },
      { at: '2026-08-18 08:47:19', user: 'Amira Hassan', country: 'Egypt', screen: 'Document upload' }
    ],
    status: 'Recurring', owner: 'Nasreen Sayed',
    friendly: 'The document could not be checked for viruses just now. Please try the upload again in a few minutes.',
    exceptionType: 'ScanService.UnexpectedResponseException',
    exceptionMessage: 'The scan service returned status 503 with an empty body.',
    stackTrace: [
      'at DocumentService.Upload.ScanAsync(stream, fileName) line 88',
      'at DocumentService.Upload.HandleAsync(request) line 41'
    ],
    parameters: [
      { field: 'fileName', value: 'Trade licence 2026.pdf' },
      { field: 'sizeBytes', value: '1 884 210' }
    ],
    trail: [
      { at: '2026-08-14 12:31:07', by: 'System', what: 'Incident created from an unhandled error, reference ERR-2026-08-14-0002' },
      { at: '2026-08-16 16:18:02', by: 'System', what: 'Third occurrence within 72 hours — grouped and marked Recurring' },
      { at: '2026-08-17 09:00:00', by: 'Nasreen Sayed', what: 'Assigned to Nasreen Sayed' }
    ]
  },
  {
    id: 'IN-4', errorRef: 'ERR-2026-08-11-0001', severity: 'Critical', classification: 'Data integrity violation',
    component: 'Approval engine', operation: 'Decision recording',
    screenOrService: 'Approval decision', country: 'Egypt',
    fingerprint: 'Approval engine · Decision recording · ConcurrencyViolation',
    firstSeen: '2026-08-11 15:44:09', lastSeen: '2026-08-11 15:44:09',
    occurrences: [{ at: '2026-08-11 15:44:09', user: 'Amira Hassan', country: 'Egypt', screen: 'Approval decision' }],
    status: 'Closed', owner: 'Nasreen Sayed',
    cause: 'Two approvers recorded a decision on the same step within the same second, and the second write did not carry the row version, so the step count was recorded twice.',
    resolution: 'The duplicate step count was corrected against the audit trail and the decision write now carries the row version.',
    preventive: 'The same pattern exists on the delegation write and should be reviewed before the next release.',
    closedAt: '2026-08-12 11:30',
    alertRaised: true, alertAt: '2026-08-11 15:44', alertRecipients: ['Support group (placeholder)'],
    friendly: 'Your decision was recorded, but we found a conflict with another approver acting at the same moment. Support has been informed and will confirm the outcome with you.',
    exceptionType: 'Data.ConcurrencyViolationException',
    exceptionMessage: 'The approval instance was modified by another action between read and write.',
    stackTrace: [
      'at ApprovalEngine.Decide.RecordAsync(instance: AI-2, step: 2) line 176',
      'at ApprovalEngine.Instance.SaveAsync(rowVersion: null) line 233'
    ],
    parameters: [
      { field: 'instance', value: 'AI-2' },
      { field: 'step', value: '2' },
      { field: 'decision', value: 'Approve' }
    ],
    trail: [
      { at: '2026-08-11 15:44:09', by: 'System', what: 'Incident created from an unhandled error, reference ERR-2026-08-11-0001' },
      { at: '2026-08-11 15:44:10', by: 'System', what: 'Classified Data integrity violation — critical; alert raised to the support group through C05 rule NR-12' },
      { at: '2026-08-11 16:02:00', by: 'Nasreen Sayed', what: 'Assigned to Nasreen Sayed; status set to Investigating' },
      { at: '2026-08-12 11:30:00', by: 'Nasreen Sayed', what: 'Cause and resolution recorded; incident closed' }
    ]
  }
];

/** The six cases the prototype failure simulator offers. */
export interface FailureCase {
  key: string;
  label: string;
  classification: Classification;
  severity: 'Error' | 'Critical';
  component: ComponentName;
  operation: string;
  screenOrService: string;
  country: string;
  friendly: string;
  exceptionType: string;
  exceptionMessage: string;
  stackTrace: string[];
  parameters: { field: string; value: string; masked?: string }[];
  correlation?: string;
}

export const FAILURE_CASES: FailureCase[] = [
  {
    key: 'auth', label: 'Authentication failure at scale', classification: 'Authentication failure at scale', severity: 'Critical',
    component: 'Web application', operation: 'Sign-in', screenOrService: 'Sign-in', country: 'Global',
    friendly: 'We could not sign you in just now. Please try again shortly.',
    exceptionType: 'Security.DirectoryUnavailableException',
    exceptionMessage: 'Active Directory did not respond to 41 authentication requests in 5 minutes.',
    stackTrace: ['at Security.Authenticate.ValidateAsync(userName) line 61', 'at Security.DirectoryClient.BindAsync() line 118'],
    parameters: [
      { field: 'attemptsInWindow', value: '41' },
      { field: 'password', value: '••••••••••••••••', masked: 'Password and secret' }
    ]
  },
  {
    key: 'outage', label: 'Integration outage', classification: 'Integration outage', severity: 'Critical',
    component: 'Integration service', operation: 'Odoo movement retrieval', screenOrService: 'Scheduled data synchronisation', country: 'Global',
    friendly: 'We could not reach the logistics system while bringing in stock movements. Nothing you entered has been lost.',
    exceptionType: 'System.Net.HttpRequestException',
    exceptionMessage: 'No route to the movement endpoint (connection refused).',
    stackTrace: ['at IntegrationService.Exchange.SendAsync(endpoint, payloadRef) line 214', 'at IntegrationService.RetryPolicy.ExecuteAsync(attempt: 3 of 3) line 96'],
    parameters: [
      { field: 'endpoint', value: 'https://logistics.internal/api/movements' },
      { field: 'payloadReference', value: 'sha256:c19b77…', masked: 'Full request payload' }
    ],
    correlation: 'CORR-71c0be'
  },
  {
    key: 'job', label: 'Job failure', classification: 'Job failure', severity: 'Critical',
    component: 'Job scheduler', operation: 'Report distribution', screenOrService: 'Scheduled report distribution', country: 'Global',
    friendly: 'A scheduled report could not be produced. Support has been informed.',
    exceptionType: 'Jobs.JobFailedException',
    exceptionMessage: 'The report distribution job terminated after 2 consecutive failures.',
    stackTrace: ['at Jobs.ReportDistribution.RunAsync() line 74', 'at Jobs.Scheduler.ExecuteAsync(job: Report distribution) line 39'],
    parameters: [{ field: 'consecutiveFailures', value: '2' }, { field: 'schedule', value: 'daily at 07:00' }]
  },
  {
    key: 'integrity', label: 'Data integrity violation', classification: 'Data integrity violation', severity: 'Critical',
    component: 'Audit service', operation: 'Audit write', screenOrService: 'Audit service', country: 'Global',
    friendly: 'Your change was saved, but a consistency check did not pass. Support has been informed and will confirm the outcome with you.',
    exceptionType: 'Data.IntegrityViolationException',
    exceptionMessage: 'An audit entry was written without a matching business record.',
    stackTrace: ['at AuditService.Write.PersistAsync(entry) line 92'],
    parameters: [{ field: 'entity', value: 'Approval instance' }, { field: 'record', value: 'AI-4' }]
  },
  {
    key: 'scan', label: 'Virus scan service unavailable (non-critical)', classification: NON_CRITICAL_CLASS, severity: 'Error',
    component: 'Document service', operation: 'Virus scan', screenOrService: 'Document upload', country: 'Sudan',
    friendly: 'The document could not be checked for viruses just now. Please try the upload again in a few minutes.',
    exceptionType: 'ScanService.UnexpectedResponseException',
    exceptionMessage: 'The scan service returned status 503 with an empty body.',
    stackTrace: ['at DocumentService.Upload.ScanAsync(stream, fileName) line 88'],
    parameters: [{ field: 'fileName', value: 'Trade licence 2026.pdf' }]
  },
  {
    key: 'render', label: 'Report rendering error (non-critical)', classification: NON_CRITICAL_CLASS, severity: 'Error',
    component: 'Web application', operation: 'Report rendering', screenOrService: 'Report viewer', country: 'Egypt',
    friendly: 'This report could not be produced. Your parameters have been kept — please try again or choose a shorter period.',
    exceptionType: 'Reporting.RenderException',
    exceptionMessage: 'The report exceeded the row limit for interactive rendering.',
    stackTrace: ['at Reporting.Render.BuildAsync(report, parameters) line 155'],
    parameters: [{ field: 'report', value: 'Stock position by warehouse' }, { field: 'rows', value: '412 900' }]
  }
];

/* ------------------------------------------------------------------ *
 * WF-C9-02 / Steps 1–3 — exchanges, retry policy, error queue
 * ------------------------------------------------------------------ */

export const INTERFACES = [
  'SAP purchase order retrieval',
  'SAP posting',
  'Active Directory synchronisation',
  'Odoo movement retrieval',
  'Bank statement retrieval',
  'Market price feed'
] as const;
export type InterfaceName = typeof INTERFACES[number];

export interface RetryPolicyDef {
  interfaceName: InterfaceName;
  attempts: number;
  intervalSeconds: number;
  backoff: 'Fixed' | 'Doubling';
  onExhaustion: 'Hold in error queue' | 'Alert only';
}

/**
 * Read-only in C09. The retry policy per interface is named as a configuration
 * point in both C9 / WF-C9-02 / Step 2 and C12 / WF-C12-01 — see the
 * consistency note on the exchange log and the error queue.
 */
export const RETRY_POLICIES: RetryPolicyDef[] = [
  { interfaceName: 'SAP purchase order retrieval', attempts: 3, intervalSeconds: 30, backoff: 'Fixed', onExhaustion: 'Hold in error queue' },
  { interfaceName: 'SAP posting', attempts: 3, intervalSeconds: 60, backoff: 'Doubling', onExhaustion: 'Hold in error queue' },
  { interfaceName: 'Active Directory synchronisation', attempts: 2, intervalSeconds: 120, backoff: 'Fixed', onExhaustion: 'Alert only' },
  { interfaceName: 'Odoo movement retrieval', attempts: 3, intervalSeconds: 30, backoff: 'Fixed', onExhaustion: 'Hold in error queue' },
  { interfaceName: 'Bank statement retrieval', attempts: 2, intervalSeconds: 300, backoff: 'Fixed', onExhaustion: 'Hold in error queue' },
  { interfaceName: 'Market price feed', attempts: 1, intervalSeconds: 0, backoff: 'Fixed', onExhaustion: 'Alert only' }
];

export type ExchangeOutcome = 'Success' | 'Failed — retrying' | 'Failed after retries' | 'Partial — records in exception';

export interface Attempt {
  attempt: number;
  started: string;
  responseMs: number;
  outcome: 'Success' | 'Failed';
  error?: string;
  retryDecision: string;
}

export interface Exchange {
  id: string;
  correlation: string;
  interfaceName: string;
  direction: 'Inbound' | 'Outbound';
  endpoint: string;
  started: string;
  ended: string;
  responseMs: number;
  outcome: ExchangeOutcome;
  received?: number;
  processed?: number;
  skipped?: number;
  inException?: number;
  failed?: number;
  payloadRef: string;
  attempts: Attempt[];
  triggeredBy: string;
  /** set on a reprocessing exchange — Step 3, logged in the same way as the original */
  reprocessOf?: string;
  incident?: string;
  run?: string;
  archived?: boolean;
}

export const seedExchanges: Exchange[] = [
  {
    id: 'EX-1', correlation: 'CORR-8f2a41', interfaceName: 'SAP purchase order retrieval', direction: 'Inbound',
    endpoint: 'https://erp.internal/api/purchase-orders', started: '2026-08-18 02:14:02', ended: '2026-08-18 02:14:11',
    responseMs: 8940, outcome: 'Partial — records in exception', received: 53, processed: 47, skipped: 0, inException: 6, failed: 0,
    payloadRef: 'sha256:a41f09…', triggeredBy: 'Scheduled data synchronisation', run: 'JR-1005',
    attempts: [{ attempt: 1, started: '2026-08-18 02:14:02', responseMs: 8940, outcome: 'Success', retryDecision: 'Not required' }]
  },
  {
    id: 'EX-2', correlation: 'CORR-71c0be', interfaceName: 'Odoo movement retrieval', direction: 'Inbound',
    endpoint: 'https://logistics.internal/api/movements', started: '2026-08-17 02:09:00', ended: '2026-08-17 02:09:04',
    responseMs: 4120, outcome: 'Partial — records in exception', received: 210, processed: 209, skipped: 0, inException: 1, failed: 0,
    payloadRef: 'sha256:c19b77…', triggeredBy: 'Scheduled data synchronisation',
    attempts: [{ attempt: 1, started: '2026-08-17 02:09:00', responseMs: 4120, outcome: 'Success', retryDecision: 'Not required' }]
  },
  {
    id: 'EX-3', correlation: 'CORR-9d3e18', interfaceName: 'SAP posting', direction: 'Outbound',
    endpoint: 'https://erp.internal/api/journal-entries', started: '2026-08-18 09:13:01', ended: '2026-08-18 09:14:02',
    responseMs: 30000, outcome: 'Failed after retries', received: 0, processed: 0, skipped: 0, inException: 0, failed: 12,
    payloadRef: 'sha256:7b2c40…', triggeredBy: 'Scheduled data synchronisation', incident: 'IN-1', run: 'JR-1005',
    attempts: [
      { attempt: 1, started: '2026-08-18 09:13:01', responseMs: 30000, outcome: 'Failed', error: 'Endpoint timed out after 30000 ms', retryDecision: 'Retry 1 of 3 in 30 s' },
      { attempt: 2, started: '2026-08-18 09:13:31', responseMs: 30000, outcome: 'Failed', error: 'Endpoint timed out after 30000 ms', retryDecision: 'Retry 2 of 3 in 30 s' },
      { attempt: 3, started: '2026-08-18 09:14:02', responseMs: 30000, outcome: 'Failed', error: 'Endpoint timed out after 30000 ms', retryDecision: 'Retries exhausted — 12 records held in the error queue' }
    ]
  },
  {
    id: 'EX-4', correlation: 'CORR-4a7712', interfaceName: 'Active Directory synchronisation', direction: 'Inbound',
    endpoint: 'ldaps://ad.internal/OU=Dalgroup', started: '2026-08-18 05:00:00', ended: '2026-08-18 05:00:03',
    responseMs: 2880, outcome: 'Success', received: 128, processed: 128, skipped: 0, inException: 0, failed: 0,
    payloadRef: 'sha256:1f9042…', triggeredBy: 'Scheduled data synchronisation',
    attempts: [{ attempt: 1, started: '2026-08-18 05:00:00', responseMs: 2880, outcome: 'Success', retryDecision: 'Not required' }]
  },
  {
    id: 'EX-5', correlation: 'CORR-b6f003', interfaceName: 'Bank statement retrieval', direction: 'Inbound',
    endpoint: 'https://bankfeed.internal/api/statements', started: '2026-08-18 04:30:00', ended: '2026-08-18 04:35:12',
    responseMs: 312000, outcome: 'Failed — retrying', received: 0, processed: 0, skipped: 0, inException: 0, failed: 0,
    payloadRef: 'sha256:5e8a11…', triggeredBy: 'Scheduled data synchronisation',
    attempts: [
      { attempt: 1, started: '2026-08-18 04:30:00', responseMs: 12000, outcome: 'Failed', error: 'The statement service returned status 429 — too many requests', retryDecision: 'Retry 1 of 2 in 300 s' },
      { attempt: 2, started: '2026-08-18 04:35:00', responseMs: 12000, outcome: 'Failed', error: 'The statement service returned status 429 — too many requests', retryDecision: 'Awaiting the next scheduled window' }
    ]
  },
  {
    id: 'EX-6', correlation: 'CORR-c02f55', interfaceName: 'Market price feed', direction: 'Inbound',
    endpoint: 'https://prices.example/api/quotes', started: '2026-08-18 08:00:00', ended: '2026-08-18 08:00:01',
    responseMs: 640, outcome: 'Success', received: 24, processed: 24, skipped: 0, inException: 0, failed: 0,
    payloadRef: 'sha256:9c4411…', triggeredBy: 'Scheduled data synchronisation',
    attempts: [{ attempt: 1, started: '2026-08-18 08:00:00', responseMs: 640, outcome: 'Success', retryDecision: 'Not required' }]
  },
  {
    id: 'EX-7', correlation: 'CORR-2e8b90', interfaceName: 'SAP posting', direction: 'Outbound',
    endpoint: 'https://erp.internal/api/journal-entries', started: '2026-08-15 09:12:00', ended: '2026-08-15 09:12:02',
    responseMs: 1980, outcome: 'Success', received: 0, processed: 34, skipped: 0, inException: 0, failed: 0,
    payloadRef: 'sha256:44ba18…', triggeredBy: 'Scheduled data synchronisation', archived: true,
    attempts: [{ attempt: 1, started: '2026-08-15 09:12:00', responseMs: 1980, outcome: 'Success', retryDecision: 'Not required' }]
  }
];

export type QueueStatus = 'Held' | 'Corrected — awaiting reprocess' | 'Reprocessed — success' | 'Reprocessed — failed again';

export interface QueuedError {
  id: string;
  correlation: string;
  interfaceName: string;
  record: string;
  /** the business entity the record belongs to, so a business audit entry has somewhere to land */
  entity: string;
  reason: string;
  retriesUsed: number;
  retriesAllowed: number;
  heldSince: string;
  correctableField?: string;
  currentValue?: string;
  correctedValue?: string;
  status: QueueStatus;
  reprocessedAt?: string;
  reprocessCorrelation?: string;
  reason4Reprocess?: string;
  auditRaised?: boolean;
  /** payload shown in the correction drawer, masked where the rules apply */
  payload: { field: string; value: string; masked?: string }[];
}

export const seedQueuedErrors: QueuedError[] = [
  {
    id: 'EQ-1001', correlation: 'CORR-9d3e18', interfaceName: 'SAP posting', record: 'Journal entry JE-2026-0812',
    entity: 'Integration posting', reason: 'The cost centre on the entry does not exist in the enterprise resource planning system',
    retriesUsed: 3, retriesAllowed: 3, heldSince: '2026-08-18 09:14:02', correctableField: 'Cost centre', currentValue: 'SD-1190',
    status: 'Held',
    payload: [
      { field: 'entryReference', value: 'JE-2026-0812' },
      { field: 'costCentre', value: 'SD-1190' },
      { field: 'amount', value: 'sha256:0a71c2…', masked: 'Price and commercial terms' },
      { field: 'currency', value: 'SDG' },
      { field: 'postingDate', value: '2026-08-17' }
    ]
  },
  {
    id: 'EQ-1002', correlation: 'CORR-9d3e18', interfaceName: 'SAP posting', record: 'Journal entry JE-2026-0813',
    entity: 'Integration posting', reason: 'The cost centre on the entry does not exist in the enterprise resource planning system',
    retriesUsed: 3, retriesAllowed: 3, heldSince: '2026-08-18 09:14:02', correctableField: 'Cost centre', currentValue: 'SD-1190',
    status: 'Held',
    payload: [
      { field: 'entryReference', value: 'JE-2026-0813' },
      { field: 'costCentre', value: 'SD-1190' },
      { field: 'amount', value: 'sha256:be3319…', masked: 'Price and commercial terms' },
      { field: 'currency', value: 'SDG' },
      { field: 'postingDate', value: '2026-08-17' }
    ]
  },
  {
    id: 'EQ-1003', correlation: 'CORR-b6f003', interfaceName: 'Bank statement retrieval', record: 'Statement line ST-4471-08',
    entity: 'Bank statement line', reason: 'The account on the statement line is not held against any registered supplier',
    retriesUsed: 2, retriesAllowed: 2, heldSince: '2026-08-18 04:35:12', correctableField: 'Supplier account', currentValue: '—',
    status: 'Held',
    payload: [
      { field: 'statementLine', value: 'ST-4471-08' },
      { field: 'bankAccount', value: '••••••••••••••••', masked: 'Bank account' },
      { field: 'amount', value: 'sha256:71f0aa…', masked: 'Price and commercial terms' },
      { field: 'valueDate', value: '2026-08-16' }
    ]
  },
  {
    id: 'EQ-0998', correlation: 'CORR-2e8b90', interfaceName: 'SAP posting', record: 'Journal entry JE-2026-0770',
    entity: 'Integration posting', reason: 'The posting period was closed at the time of the exchange',
    retriesUsed: 3, retriesAllowed: 3, heldSince: '2026-08-15 09:12:02', correctableField: 'Posting date', currentValue: '2026-07-31',
    correctedValue: '2026-08-01', status: 'Reprocessed — success', reprocessedAt: '2026-08-15 11:40:00',
    reprocessCorrelation: 'CORR-3f9a02', reason4Reprocess: 'Posting date moved into the open period after confirmation with finance.',
    auditRaised: false,
    payload: [
      { field: 'entryReference', value: 'JE-2026-0770' },
      { field: 'postingDate', value: '2026-08-01' },
      { field: 'amount', value: 'sha256:2d90fb…', masked: 'Price and commercial terms' }
    ]
  }
];

/* ------------------------------------------------------------------ *
 * WF-C9-02 / Steps 4–6 — jobs
 * ------------------------------------------------------------------ */

export const JOB_NAMES = [
  'Notification evaluation',
  'Document expiry check',
  'Report distribution',
  'Data synchronisation',
  'Audit retention cycle'
] as const;
export type JobName = typeof JOB_NAMES[number];

export type JobOutcome = 'Completed' | 'Completed with failures' | 'Overran' | 'Failed' | 'Did not start';

export interface JobConfig {
  job: JobName;
  module: string;
  schedule: string;
  expectedStart: string;
  windowSeconds: number;
  repeatedFailureThreshold: number;
  alertOn: string[];
  owner: string;
}

export const seedJobConfigs: JobConfig[] = [
  { job: 'Notification evaluation', module: 'C05', schedule: 'daily at 06:00', expectedStart: '06:00', windowSeconds: 10, repeatedFailureThreshold: 2, alertOn: ['Did not start', 'Overran', 'Failed', 'Failed repeatedly'], owner: 'Nasreen Sayed' },
  { job: 'Document expiry check', module: 'C07', schedule: 'daily at 05:30', expectedStart: '05:30', windowSeconds: 20, repeatedFailureThreshold: 2, alertOn: ['Did not start', 'Failed', 'Failed repeatedly'], owner: 'Nasreen Sayed' },
  { job: 'Report distribution', module: 'C11', schedule: 'daily at 07:00', expectedStart: '07:00', windowSeconds: 120, repeatedFailureThreshold: 2, alertOn: ['Did not start', 'Overran', 'Failed', 'Failed repeatedly'], owner: 'Amira Hassan' },
  { job: 'Data synchronisation', module: 'C12', schedule: 'daily at 02:00', expectedStart: '02:00', windowSeconds: 900, repeatedFailureThreshold: 3, alertOn: ['Overran', 'Failed', 'Failed repeatedly'], owner: 'Nasreen Sayed' },
  { job: 'Audit retention cycle', module: 'C08', schedule: 'monthly on the 1st at 03:00', expectedStart: '03:00', windowSeconds: 600, repeatedFailureThreshold: 2, alertOn: ['Failed', 'Failed repeatedly'], owner: 'Nasreen Sayed' }
];

export interface JobRunRec {
  id: string;
  job: JobName;
  started: string;
  ended?: string;
  durationSeconds?: number;
  processed: number;
  skipped: number;
  failures: number;
  outcome: JobOutcome;
  alertRaised?: boolean;
  triggeredBy: string;
  note?: string;
  archived?: boolean;
}

export const seedJobRunsC9: JobRunRec[] = [
  { id: 'JR-1005', job: 'Data synchronisation', started: '2026-08-18 02:00:00', ended: '2026-08-18 02:14:11', durationSeconds: 851, processed: 415, skipped: 0, failures: 12, outcome: 'Completed with failures', alertRaised: false, triggeredBy: 'Schedule', note: '12 records held in the error queue from the SAP posting exchange.' },
  { id: 'JR-1004', job: 'Document expiry check', started: '2026-08-18 05:30:00', ended: '2026-08-18 05:30:04', durationSeconds: 4, processed: 9, skipped: 3, failures: 0, outcome: 'Completed', alertRaised: false, triggeredBy: 'Schedule' },
  { id: 'JR-1001', job: 'Notification evaluation', started: '2026-08-18 06:00:00', ended: '2026-08-18 06:00:07', durationSeconds: 7, processed: 5, skipped: 2, failures: 0, outcome: 'Completed', alertRaised: false, triggeredBy: 'Schedule' },
  { id: 'JR-1002', job: 'Notification evaluation', started: '2026-08-17 06:00:00', ended: '2026-08-17 06:00:06', durationSeconds: 6, processed: 5, skipped: 2, failures: 0, outcome: 'Completed', alertRaised: false, triggeredBy: 'Schedule' },
  { id: 'JR-1003', job: 'Notification evaluation', started: '2026-08-16 06:00:00', ended: '2026-08-16 06:00:11', durationSeconds: 11, processed: 5, skipped: 2, failures: 1, outcome: 'Overran', alertRaised: true, triggeredBy: 'Schedule', note: 'Ran 11 s against an expected window of 10 s. One notification failed permanently and was surfaced to the administrator.' },
  { id: 'JR-1000', job: 'Audit retention cycle', started: '2026-08-15 03:00:00', ended: '2026-08-15 03:00:02', durationSeconds: 2, processed: 0, skipped: 0, failures: 0, outcome: 'Completed', alertRaised: false, triggeredBy: 'Schedule', note: 'Nothing was outside retention.' },
  { id: 'JR-0996', job: 'Data synchronisation', started: '2026-07-30 02:00:00', ended: '2026-07-30 02:11:40', durationSeconds: 700, processed: 1204, skipped: 0, failures: 0, outcome: 'Completed', alertRaised: false, triggeredBy: 'Schedule', archived: true }
];

/**
 * WF-C9-02 / Step 5 — the outcome is derived by comparing the run against its
 * configuration, not asserted on the row.
 */
export function evaluateRun(run: JobRunRec, cfg?: JobConfig): JobOutcome {
  if (!run.ended) return 'Failed';
  if (cfg && run.durationSeconds !== undefined && run.durationSeconds > cfg.windowSeconds) return 'Overran';
  if (run.failures > 0) return 'Completed with failures';
  return 'Completed';
}

/**
 * A job that should have run today and has not is the silent failure Step 6
 * refers to. Derived from the configuration and the runs, never seeded.
 */
export function missedJobs(configs: JobConfig[], runs: JobRunRec[], nowHHMM: string, today: string): JobConfig[] {
  return configs.filter((c) => {
    if (c.schedule.startsWith('monthly')) return false;
    if (c.expectedStart > nowHHMM) return false;
    return !runs.some((r) => r.job === c.job && r.started.startsWith(today));
  });
}

/* ------------------------------------------------------------------ *
 * WF-C9-03 / Steps 1–2 — monitoring thresholds and breaches
 * ------------------------------------------------------------------ */

export const MEASURES = ['Availability', 'Response time', 'Error rate', 'Queue depth'] as const;
export type Measure = typeof MEASURES[number];

export type ThresholdState = 'Within threshold' | 'Warning' | 'Breached';

export interface ThresholdDef {
  measure: Measure;
  scope: string;
  unit: string;
  /** availability breaches when the value falls below; the others when it rises above */
  direction: 'below' | 'above';
  warning: number;
  critical: number;
  windowMinutes: number;
  consecutiveBeforeAlert: number;
  recipients: string[];
  current: number;
}

export const seedThresholds: ThresholdDef[] = [
  { measure: 'Availability', scope: 'System-wide', unit: '%', direction: 'below', warning: 99.5, critical: 99.0, windowMinutes: 15, consecutiveBeforeAlert: 1, recipients: ['Support group (placeholder)'], current: 99.82 },
  { measure: 'Response time', scope: 'Per component — Web application', unit: 'ms (95th percentile)', direction: 'above', warning: 1200, critical: 2500, windowMinutes: 15, consecutiveBeforeAlert: 2, recipients: ['Support group (placeholder)'], current: 1340 },
  { measure: 'Error rate', scope: 'System-wide', unit: '% of operations', direction: 'above', warning: 1.0, critical: 3.0, windowMinutes: 60, consecutiveBeforeAlert: 2, recipients: ['Support group (placeholder)'], current: 0.42 },
  { measure: 'Queue depth', scope: 'Per interface — SAP posting', unit: 'records held', direction: 'above', warning: 10, critical: 25, windowMinutes: 5, consecutiveBeforeAlert: 1, recipients: ['Support group (placeholder)'], current: 12 }
];

export function thresholdState(t: ThresholdDef, value = t.current): ThresholdState {
  if (t.direction === 'below') {
    if (value < t.critical) return 'Breached';
    if (value < t.warning) return 'Warning';
    return 'Within threshold';
  }
  if (value > t.critical) return 'Breached';
  if (value > t.warning) return 'Warning';
  return 'Within threshold';
}

export interface Breach {
  id: string;
  measure: Measure;
  value: number;
  threshold: number;
  level: 'Warning' | 'Critical';
  started: string;
  ended?: string;
  durationMinutes?: number;
  alertRaised: boolean;
  suppressedReason?: string;
}

export const seedBreaches: Breach[] = [
  {
    id: 'BR-1', measure: 'Queue depth', value: 12, threshold: 10, level: 'Warning', started: '2026-08-18 09:14',
    alertRaised: false, suppressedReason: 'The warning threshold was breached; only a critical breach alerts.'
  },
  {
    id: 'BR-2', measure: 'Response time', value: 1340, threshold: 1200, level: 'Warning', started: '2026-08-18 08:45',
    ended: '2026-08-18 09:00', durationMinutes: 15, alertRaised: false,
    suppressedReason: 'The warning threshold was breached; only a critical breach alerts.'
  },
  {
    id: 'BR-3', measure: 'Response time', value: 2740, threshold: 2500, level: 'Critical', started: '2026-08-16 13:20',
    ended: '2026-08-16 13:35', durationMinutes: 15, alertRaised: false,
    suppressedReason: 'First of 2 consecutive breaches required in a 15-minute window — no alert on this evaluation.'
  },
  {
    id: 'BR-4', measure: 'Response time', value: 3010, threshold: 2500, level: 'Critical', started: '2026-08-16 13:35',
    ended: '2026-08-16 13:50', durationMinutes: 15, alertRaised: true
  },
  {
    id: 'BR-5', measure: 'Availability', value: 98.4, threshold: 99.0, level: 'Critical', started: '2026-08-11 15:30',
    ended: '2026-08-11 16:10', durationMinutes: 40, alertRaised: true
  }
];

/* ------------------------------------------------------------------ *
 * WF-C9-03 / Steps 4–5 — rotation, retention, export
 * ------------------------------------------------------------------ */

export type RotationMode = 'Daily' | 'Weekly' | 'By size';
export type RetentionAction = 'Recycle' | 'Trim to summary' | 'Delete';

export interface LogRetentionDef {
  logClass: LogClass;
  rotation: RotationMode;
  sizeMb?: number;
  onlineDays: number;
  archivedDays: number;
  then: RetentionAction;
  estimatedMbPerMonth: number;
}

export const seedLogRetention: LogRetentionDef[] = [
  { logClass: 'Application log', rotation: 'Daily', onlineDays: 30, archivedDays: 90, then: 'Recycle', estimatedMbPerMonth: 4200 },
  { logClass: 'Integration exchange log', rotation: 'Daily', onlineDays: 60, archivedDays: 365, then: 'Trim to summary', estimatedMbPerMonth: 1800 },
  { logClass: 'Job log', rotation: 'Weekly', onlineDays: 90, archivedDays: 365, then: 'Trim to summary', estimatedMbPerMonth: 90 },
  { logClass: 'Incident record', rotation: 'Weekly', onlineDays: 365, archivedDays: 1095, then: 'Trim to summary', estimatedMbPerMonth: 40 },
  { logClass: 'Monitoring measurement', rotation: 'By size', sizeMb: 512, onlineDays: 14, archivedDays: 90, then: 'Delete', estimatedMbPerMonth: 2600 }
];

export const EXPORT_FORMATS = ['CSV', 'JSON'] as const;

export interface ExportRec {
  id: string;
  at: string;
  by: string;
  logClasses: string[];
  from: string;
  to: string;
  severityFrom?: string;
  correlation?: string;
  includeArchived: boolean;
  format: string;
  rows: number;
  maskedFields: number;
}

export const seedExports: ExportRec[] = [
  {
    id: 'EXP-1', at: '2026-08-12 14:05', by: 'Nasreen Sayed', logClasses: ['Integration exchange log'],
    from: '2026-08-01', to: '2026-08-12', includeArchived: false, format: 'CSV', rows: 1841, maskedFields: 212
  }
];

/** The retention cycle preview — computed from the live stores, never seeded. */
export interface RetentionPreviewRow {
  logClass: LogClass;
  online: number;
  archived: number;
  toArchive: number;
  toTrim: number;
  toDelete: number;
  action: RetentionAction;
}

export function daysBetweenC9(from: string, to: string): number {
  const a = new Date(`${from.slice(0, 10)}T00:00:00Z`).getTime();
  const b = new Date(`${to.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

/* ------------------------------------------------------------------ *
 * The five bands of the health dashboard — failed sign-in counts.
 * The one C01 signal that is a technical measure (WF-C9-03 / Step 3).
 * ------------------------------------------------------------------ */

export const FAILED_LOGINS_24H = [
  { country: 'Sudan', count: 9 },
  { country: 'Egypt', count: 3 },
  { country: 'UAE', count: 1 },
  { country: 'Mozambique', count: 5 }
];

/** The "at scale" definition behind the Authentication failure at scale classification. */
export const AT_SCALE_THRESHOLD = { attempts: 25, windowMinutes: 5 };

export const SUPPORT_GROUP = 'Support group (placeholder)';

export const SUPPORT_MODEL_NOTE =
  'The support model and alert routing — who receives technical alerts, in which time zone, and under what response '
  + 'expectation — are unconfirmed (WF-C9-01 / Step 5). A recipient is required to demonstrate the alert at all, so the '
  + 'prototype uses a named placeholder support group and labels it as one wherever it appears.';

export const MONITORING_TOOLING_NOTE =
  'Selection of the monitoring and analytics tooling depends on the hosting decision. The measures, thresholds, evaluation windows and recipients are business decisions that hold whichever tool is chosen; the collection mechanism is not specified and no tool is named.';

export const OWNERSHIP_ISSUE =
  'Integration consistency issue: the integration error queue and its reprocessing are described in both C9 / WF-C9-02 / Steps 2–3 and C12 / WF-C12-01 / Steps 8–10, and the retry policy per interface appears as a configuration point in both modules. Confirm which module owns the error queue, the retry policy and the reprocessing action.';

export const AUDIT_ISSUE =
  'Integration consistency issue: C12 / WF-C12-01 / Step 10 states that reprocessing is logged (C9) and audited (C8), whereas C9 / WF-C9-02 / Step 3 states only that it is logged. Confirm whether reprocessing raises a business audit entry as well as a technical log entry.';

export const SUPPORT_ROLES = ['SYSTEM_ADMINISTRATOR', 'COMPLIANCE_OFFICER'];
export const ADMIN_ONLY_ROLES = ['SYSTEM_ADMINISTRATOR'];
