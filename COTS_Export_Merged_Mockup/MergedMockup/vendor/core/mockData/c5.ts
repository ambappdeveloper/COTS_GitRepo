/**
 * C5 Notifications and Alerts — mock data.
 * Static only. Every field traces to a step in COTS_C5_Workflows.
 * Nothing here sends a message: the channels are labels and the delivery
 * statuses are state held in the browser.
 */

export type PriorityClass = 'Informational' | 'Operational' | 'Approval' | 'Urgent';
export type Channel = 'In-app' | 'Email' | 'SMS' | 'Messaging';
export type RecipientSource = 'Role' | 'Named user' | 'Subscriber' | 'External contact';
export type DeliveryStatus =
  | 'Delivered'
  | 'Queued'
  | 'Held — quiet hours'
  | 'Transient failure, retrying'
  | 'Permanently failed';

export const CHANNELS: Channel[] = ['In-app', 'Email', 'SMS', 'Messaging'];
export const LANGUAGES = ['English', 'Arabic', 'Portuguese'];

/** WF-C5-01 / Step 1 — the event types the core layer raises */
export const EVENT_TYPES = [
  'Approval request',
  'Approval outcome',
  'Approval progress',
  'Returned for amendment',
  'Approval task cancelled',
  'Approval reassigned',
  'Service level breach',
  'Welcome / activation',
  'Access review reminder',
  'Account lockout',
  'Status change',
  'Document expiry',
  'Threshold breach',
  'Non-conformity reported',
  'Mention',
  'Sensitive action',
  'Job failure',
  'Overdue update',
  'Sales contract created'
];

/* ------------------------------------------------------------------ *
 * WF-C5-03 / Step 1 — templates per event type and per language
 * ------------------------------------------------------------------ */

export interface Template {
  id: string;
  event: string;
  language: string;
  subject: string;
  body: string;
  version: number;
  status: 'Draft' | 'Released';
  lastChanged: string;
  changedBy: string;
}

export const MERGE_FIELDS = [
  '{{record.reference}}', '{{record.name}}', '{{record.status}}', '{{requester}}',
  '{{country}}', '{{due}}', '{{decision}}', '{{comment}}', '{{deepLink}}', '{{recipient.name}}'
];

export const seedTemplates: Template[] = [
  {
    id: 'TPL-01', event: 'Approval request', language: 'English', version: 3, status: 'Released',
    subject: '{{record.reference}} awaits your approval',
    body: 'Dear {{recipient.name}},\n\n{{record.reference}} — {{record.name}} — was submitted by {{requester}} in {{country}} and is awaiting your decision by {{due}}.\n\nOpen the record: {{deepLink}}',
    lastChanged: '2026-06-24 09:41', changedBy: 'Nasreen Sayed'
  },
  {
    id: 'TPL-02', event: 'Approval request', language: 'Arabic', version: 2, status: 'Released',
    subject: '{{record.reference}} — بانتظار موافقتك',
    body: 'عزيزي {{recipient.name}}،\n\nالسجل {{record.reference}} — {{record.name}} — مقدم من {{requester}} في {{country}} وينتظر قرارك بحلول {{due}}.\n\nفتح السجل: {{deepLink}}',
    lastChanged: '2026-06-24 09:44', changedBy: 'Nasreen Sayed'
  },
  {
    id: 'TPL-03', event: 'Approval outcome', language: 'English', version: 2, status: 'Released',
    subject: '{{record.reference}} — {{decision}}',
    body: 'Dear {{recipient.name}},\n\n{{record.reference}} — {{record.name}} — was {{decision}} in {{country}}.\n\nComment recorded with the decision: {{comment}}\n\nOpen the record: {{deepLink}}',
    lastChanged: '2026-05-11 14:20', changedBy: 'Nasreen Sayed'
  },
  {
    id: 'TPL-04', event: 'Approval outcome', language: 'Portuguese', version: 1, status: 'Released',
    subject: '{{record.reference}} — {{decision}}',
    body: 'Caro(a) {{recipient.name}},\n\n{{record.reference}} — {{record.name}} — foi {{decision}} em {{country}}.\n\nComentário registado com a decisão: {{comment}}\n\nAbrir o registo: {{deepLink}}',
    lastChanged: '2026-05-11 14:26', changedBy: 'Nasreen Sayed'
  },
  {
    id: 'TPL-05', event: 'Welcome / activation', language: 'English', version: 4, status: 'Released',
    subject: 'Your COTS access for {{country}}',
    body: 'Dear {{recipient.name}},\n\nYour access has been activated for {{country}}. No password is transmitted in this message; use the activation link below.\n\n{{deepLink}}',
    lastChanged: '2026-07-02 08:10', changedBy: 'Nasreen Sayed'
  },
  {
    id: 'TPL-06', event: 'Overdue update', language: 'English', version: 1, status: 'Released',
    subject: '{{record.name}} has not been updated within its period',
    body: 'Dear {{recipient.name}},\n\n{{record.name}} for {{country}} was last updated on {{due}} and is now outside its defined update period.\n\nRecord the update: {{deepLink}}',
    lastChanged: '2026-04-18 07:55', changedBy: 'Nasreen Sayed'
  },
  {
    id: 'TPL-07', event: 'Service level breach', language: 'English', version: 2, status: 'Released',
    subject: '{{record.reference}} has passed its service level',
    body: 'Dear {{recipient.name}},\n\n{{record.reference}} has passed the service level for its current approval step in {{country}}.\n\nOpen the record: {{deepLink}}',
    lastChanged: '2026-08-02 11:00', changedBy: 'Nasreen Sayed'
  },
  {
    id: 'TPL-08', event: 'Sales contract created', language: 'English', version: 1, status: 'Released',
    subject: '{{record.reference}} — confirm readiness to fulfil',
    body: 'Dear {{recipient.name}},\n\nSales contract {{record.reference}} — {{record.name}} — has been created in {{country}}. Please review the contract terms and record your readiness to fulfil them against the task raised in your inbox.\n\nOpen the contract: {{deepLink}}',
    lastChanged: '2026-08-05 09:30', changedBy: 'Nasreen Sayed'
  },
  {
    id: 'TPL-10', event: 'Sensitive action', language: 'English', version: 1, status: 'Released',
    subject: 'Sensitive action recorded — {{record.reference}}',
    body: 'Dear {{recipient.name}},\n\nA sensitive action was recorded in {{country}}: {{record.name}}.\n\nThe audit entry cannot be edited or removed. Review it in the sensitive actions monitor: {{deepLink}}',
    lastChanged: '2026-08-18 09:00', changedBy: 'Nasreen Sayed'
  },
  {
    id: 'TPL-15', event: 'Scheduled report failure', language: 'English', version: 1, status: 'Released',
    subject: 'Scheduled report {{record.reference}} failed to deliver',
    body: 'Dear {{recipient.name}},\n\nA scheduled report you own did not deliver: {{record.name}}.\n\nThe failure is logged and reported to you as the schedule owner. Open the distribution log: {{deepLink}}',
    lastChanged: '2026-08-18 09:00', changedBy: 'Nasreen Sayed'
  },
  {
    id: 'TPL-11', event: 'Critical technical error', language: 'English', version: 1, status: 'Released',
    subject: 'Critical technical error — {{record.reference}}',
    body: 'Dear {{recipient.name}},\n\nA critical technical error has been recorded: {{record.name}}.\n\nQuote the error reference {{record.reference}} when responding. Open the incident: {{deepLink}}',
    lastChanged: '2026-08-18 09:00', changedBy: 'Nasreen Sayed'
  },
  {
    id: 'TPL-12', event: 'Job execution alert', language: 'English', version: 1, status: 'Released',
    subject: 'Scheduled job alert — {{record.reference}}',
    body: 'Dear {{recipient.name}},\n\nA scheduled job did not behave as expected: {{record.name}}.\n\nOpen the job log: {{deepLink}}',
    lastChanged: '2026-08-18 09:00', changedBy: 'Nasreen Sayed'
  },
  {
    id: 'TPL-13', event: 'Monitoring threshold breach', language: 'English', version: 1, status: 'Released',
    subject: 'Monitoring threshold breached — {{record.name}}',
    body: 'Dear {{recipient.name}},\n\nA monitored measure has breached its critical threshold: {{record.name}}.\n\nOpen the monitoring thresholds: {{deepLink}}',
    lastChanged: '2026-08-18 09:00', changedBy: 'Nasreen Sayed'
  },
  {
    id: 'TPL-09', event: 'Document expiry', language: 'English', version: 1, status: 'Draft',
    subject: '{{record.name}} expires on {{due}}',
    body: 'Dear {{recipient.name}},\n\n{{record.name}} attached to {{record.reference}} expires on {{due}}.\n\nOpen the record: {{deepLink}}',
    lastChanged: '2026-08-16 15:12', changedBy: 'Nasreen Sayed'
  }
];

/* ------------------------------------------------------------------ *
 * WF-C5-01 / Steps 1–4 — notification rules
 * ------------------------------------------------------------------ */

export interface NotificationRule {
  id: string;
  event: string;
  countries: string[];          // empty = every country
  scope: string[];              // commodity or operational area; empty = any
  roles: string[];
  namedUsers: string[];
  includeSubscribers: boolean;
  externalContacts: string[];
  channels: Channel[];
  templateEvent: string;
  priority: PriorityClass;
  requiresAcknowledgement: boolean;
  raisesTask: boolean;
  active: boolean;
}

export const seedRules: NotificationRule[] = [
  {
    id: 'NR-01', event: 'Approval request', countries: [], scope: [],
    roles: ['COUNTRY_MANAGER', 'COMPLIANCE_OFFICER', 'SYSTEM_ADMINISTRATOR'], namedUsers: [],
    includeSubscribers: false, externalContacts: [],
    channels: ['In-app', 'Email'], templateEvent: 'Approval request',
    priority: 'Approval', requiresAcknowledgement: false, raisesTask: true, active: true
  },
  {
    id: 'NR-02', event: 'Approval outcome', countries: [], scope: [],
    roles: [], namedUsers: [], includeSubscribers: true, externalContacts: [],
    channels: ['In-app', 'Email'], templateEvent: 'Approval outcome',
    priority: 'Operational', requiresAcknowledgement: false, raisesTask: false, active: true
  },
  {
    id: 'NR-03', event: 'Service level breach', countries: [], scope: [],
    roles: ['COUNTRY_MANAGER'], namedUsers: ['Nasreen Sayed'], includeSubscribers: false, externalContacts: [],
    channels: ['In-app', 'Email', 'SMS'], templateEvent: 'Service level breach',
    priority: 'Urgent', requiresAcknowledgement: true, raisesTask: false, active: true
  },
  {
    id: 'NR-04', event: 'Welcome / activation', countries: [], scope: [],
    roles: [], namedUsers: [], includeSubscribers: false,
    externalContacts: ['Named recipient on the request', 'Beira Logistics (portal)'],
    // In-app is configured here on purpose: the engine drops it for an external recipient and says why
    channels: ['In-app', 'Email'], templateEvent: 'Welcome / activation',
    priority: 'Operational', requiresAcknowledgement: true, raisesTask: false, active: true
  },
  {
    id: 'NR-05', event: 'Overdue update', countries: ['Sudan', 'Ethiopia'], scope: ['Sesame — Hulled White', 'Gedaref buying area'],
    roles: ['SOURCING_OFFICER', 'PROCESSING_SUPERVISOR', 'EXECUTION_OFFICER'], namedUsers: [],
    includeSubscribers: false, externalContacts: [],
    // SMS is configured here on purpose: channel administration reserves it for urgent items, so it is dropped
    channels: ['In-app', 'Email', 'SMS'], templateEvent: 'Overdue update',
    priority: 'Operational', requiresAcknowledgement: false, raisesTask: true, active: true
  },
  {
    id: 'NR-06', event: 'Sales contract created', countries: [], scope: [],
    roles: ['QUALITY_INSPECTOR', 'EXECUTION_OFFICER', 'PROCESSING_SUPERVISOR', 'COMPLIANCE_OFFICER'], namedUsers: [],
    includeSubscribers: false, externalContacts: [],
    channels: ['In-app', 'Email'], templateEvent: 'Sales contract created',
    priority: 'Operational', requiresAcknowledgement: true, raisesTask: true, active: true
  },
  {
    id: 'NR-07', event: 'Access review reminder', countries: [], scope: [],
    roles: ['COUNTRY_MANAGER'], namedUsers: ['Nasreen Sayed'], includeSubscribers: false, externalContacts: [],
    channels: ['In-app', 'Email'], templateEvent: 'Approval request',
    priority: 'Operational', requiresAcknowledgement: false, raisesTask: true, active: true
  },
  {
    id: 'NR-08', event: 'Account lockout', countries: [], scope: [],
    roles: ['SYSTEM_ADMINISTRATOR'], namedUsers: [], includeSubscribers: false, externalContacts: [],
    channels: ['In-app', 'Email'], templateEvent: 'Approval request',
    priority: 'Urgent', requiresAcknowledgement: false, raisesTask: false, active: true
  },
  {
    id: 'NR-09', event: 'Status change', countries: [], scope: [],
    roles: [], namedUsers: [], includeSubscribers: true, externalContacts: [],
    channels: ['In-app'], templateEvent: 'Approval outcome',
    priority: 'Informational', requiresAcknowledgement: false, raisesTask: false, active: true
  },
  {
    id: 'NR-11', event: 'Sensitive action', countries: [], scope: [],
    roles: ['COMPLIANCE_OFFICER', 'SYSTEM_ADMINISTRATOR'], namedUsers: [],
    includeSubscribers: false, externalContacts: [],
    channels: ['In-app', 'Email'], templateEvent: 'Sensitive action',
    priority: 'Urgent', requiresAcknowledgement: true, raisesTask: false, active: true
  },
  {
    id: 'NR-10', event: 'Document expiry', countries: [], scope: [],
    roles: ['SYSTEM_ADMINISTRATOR'], namedUsers: [], includeSubscribers: false, externalContacts: [],
    channels: ['In-app', 'Email'], templateEvent: 'Document expiry',
    priority: 'Operational', requiresAcknowledgement: false, raisesTask: true, active: false
  },
  /* C9 / WF-C9-01 / Step 5, WF-C9-02 / Step 5, WF-C9-03 / Step 2 — the three technical
   * alerts. They are ordinary rules on the ordinary engine, so a technical alert obeys
   * the same channel policy and appears in the same delivery log as everything else.
   * They are Urgent because a system failure does not wait for office hours. */
  {
    id: 'NR-12', event: 'Critical technical error', countries: [], scope: [],
    roles: [], namedUsers: ['Support group (placeholder)'], includeSubscribers: false, externalContacts: [],
    channels: ['In-app', 'Email', 'SMS'], templateEvent: 'Critical technical error',
    priority: 'Urgent', requiresAcknowledgement: true, raisesTask: false, active: true
  },
  {
    id: 'NR-13', event: 'Job execution alert', countries: [], scope: [],
    roles: [], namedUsers: ['Support group (placeholder)'], includeSubscribers: false, externalContacts: [],
    channels: ['In-app', 'Email'], templateEvent: 'Job execution alert',
    priority: 'Urgent', requiresAcknowledgement: false, raisesTask: false, active: true
  },
  /* C11 / WF-C11-02 / Step 7 — the *failure* is an event: it is reported to the schedule
   * owner, whose role is known, so it resolves through the rule engine like any other
   * alert. The delivery of the report itself is directed at a recipient named on the
   * schedule, so it is written to the delivery log directly rather than resolved here. */
  {
    id: 'NR-15', event: 'Scheduled report failure', countries: [], scope: [],
    roles: ['SYSTEM_ADMINISTRATOR'], namedUsers: [], includeSubscribers: false, externalContacts: [],
    channels: ['In-app', 'Email'], templateEvent: 'Scheduled report failure',
    priority: 'Urgent', requiresAcknowledgement: false, raisesTask: false, active: true
  },
  {
    id: 'NR-14', event: 'Monitoring threshold breach', countries: [], scope: [],
    roles: [], namedUsers: ['Support group (placeholder)'], includeSubscribers: false, externalContacts: [],
    channels: ['In-app', 'Email', 'SMS'], templateEvent: 'Monitoring threshold breach',
    priority: 'Urgent', requiresAcknowledgement: true, raisesTask: false, active: true
  }
];

/** WF-C5-01 / Step 2 — external contacts held as governed master data (C3) */
export const EXTERNAL_CONTACTS: { name: string; address: string; language: string; masterRecord: string; channels: Channel[] }[] = [
  { name: 'Agrotem Trading LLC — operations', address: 'ops@agrotem.example', language: 'English', masterRecord: 'SUP-004821 Agrotem Trading LLC', channels: ['Email', 'Messaging'] },
  { name: 'Gedaref Oilseeds — quality desk', address: 'quality@gedarefoils.example', language: 'Arabic', masterRecord: 'SUP-004902 Gedaref Oilseeds Company', channels: ['Email'] },
  { name: 'Beira Logistics (portal)', address: 'portal@beiralog.example', language: 'Portuguese', masterRecord: 'SUP-005110 Beira Logistics Lda', channels: ['Email'] },
  { name: 'Named recipient on the request', address: 'the address on the access request', language: 'English', masterRecord: 'Access request — requested-for person', channels: ['Email'] }
];

/* ------------------------------------------------------------------ *
 * WF-C5-03 / Steps 2 and 4 — channel policy, quiet hours
 * ------------------------------------------------------------------ */

export interface ChannelPolicy {
  priority: PriorityClass;
  permitted: Channel[];
  urgentOnly: Channel[];
  userMayRechannel: boolean;
  userMayDisable: boolean;
  digestAvailable: boolean;
}

export const seedChannelPolicy: ChannelPolicy[] = [
  { priority: 'Informational', permitted: ['In-app', 'Email'], urgentOnly: ['SMS', 'Messaging'], userMayRechannel: true, userMayDisable: true, digestAvailable: true },
  { priority: 'Operational', permitted: ['In-app', 'Email'], urgentOnly: ['SMS', 'Messaging'], userMayRechannel: true, userMayDisable: false, digestAvailable: false },
  { priority: 'Approval', permitted: ['In-app', 'Email'], urgentOnly: ['SMS', 'Messaging'], userMayRechannel: true, userMayDisable: false, digestAvailable: false },
  { priority: 'Urgent', permitted: ['In-app', 'Email', 'SMS', 'Messaging'], urgentOnly: [], userMayRechannel: false, userMayDisable: false, digestAvailable: false }
];

/** WF-C5-03 / Step 4 — quiet hours per country, applied with the working calendar */
export interface QuietHours {
  country: string;
  from: string;
  to: string;
  workingCalendar: string;
  /** for the prototype's fixed reference time of 2026-08-18 09:20 local */
  insideWorkingTime: boolean;
  nextWorkingPeriod: string;
}

export const seedQuietHours: QuietHours[] = [
  { country: 'Sudan', from: '17:30', to: '07:30', workingCalendar: 'Sunday to Thursday, Sudan public holidays', insideWorkingTime: true, nextWorkingPeriod: 'Tuesday 2026-08-18 07:30' },
  { country: 'Ethiopia', from: '17:00', to: '08:00', workingCalendar: 'Monday to Friday, Ethiopia public holidays', insideWorkingTime: true, nextWorkingPeriod: 'Tuesday 2026-08-18 08:00' },
  { country: 'Tanzania', from: '17:00', to: '08:00', workingCalendar: 'Monday to Friday, Tanzania public holidays', insideWorkingTime: true, nextWorkingPeriod: 'Tuesday 2026-08-18 08:00' },
  { country: 'Mozambique', from: '16:30', to: '08:00', workingCalendar: 'Monday to Friday, Mozambique public holidays', insideWorkingTime: false, nextWorkingPeriod: 'Wednesday 2026-08-19 08:00' }
];

/* ------------------------------------------------------------------ *
 * WF-C5-03 / Steps 3 and 5 — preferences and subscriptions
 * ------------------------------------------------------------------ */

export interface Preference {
  userId: string;
  event: string;
  channels: Channel[];
  digest: boolean;
}

export const seedPreferences: Preference[] = [
  { userId: 'U-001', event: 'Status change', channels: ['In-app'], digest: true },
  { userId: 'U-001', event: 'Approval request', channels: ['In-app', 'Email'], digest: false }
];

export interface Subscription {
  id: string;
  userId: string;
  userName: string;
  record: string;
  objectType: string;
  country: string;
  since: string;
  received: number;
  route?: string;
}

export const seedSubscriptions: Subscription[] = [
  { id: 'SUB-1', userId: 'U-001', userName: 'Nasreen Sayed', record: 'WH-0142 Port Sudan Warehouse 3', objectType: 'Master data — Warehouse', country: 'Sudan', since: '2026-07-14', received: 3, route: '/c3/records/MD-1' },
  { id: 'SUB-2', userId: 'U-001', userName: 'Nasreen Sayed', record: 'AR-000141 Omar Bashir', objectType: 'Access request', country: 'Sudan', since: '2026-08-14', received: 1, route: '/c1/access-requests/AR-000141' },
  { id: 'SUB-3', userId: 'U-005', userName: 'Fatima Idris', record: 'CMD-0007 Sesame — Hulled White', objectType: 'Master data — Commodity', country: 'Global', since: '2026-06-02', received: 5, route: '/c3/records/MD-5' }
];

/* ------------------------------------------------------------------ *
 * WF-C5-01 / Steps 5–6 and 8 — one delivery row per recipient per channel
 * ------------------------------------------------------------------ */

export interface DeliveryRec {
  id: string;
  notificationId: string;
  event: string;
  subject: string;
  body: string;
  recipient: string;
  address: string;
  source: RecipientSource;
  external: boolean;
  language: string;
  channel: Channel;
  status: DeliveryStatus;
  attempts: number;
  at: string;
  correlation: string;
  country: string;
  priority: PriorityClass;
  requiresAck: boolean;
  acknowledgedAt?: string;
  deepLink?: string;
  /** why a channel was dropped or a message held, in words */
  note?: string;
  failureReason?: string;
}

export const seedDeliveries: DeliveryRec[] = [
  {
    id: 'DL-9001', notificationId: 'N-5001', event: 'Approval request',
    subject: 'AR-000141 awaits your approval',
    body: 'Dear Nasreen Sayed,\n\nAR-000141 — Omar Bashir — was submitted by Nasreen Sayed in Sudan and is awaiting your decision by 2026-08-22.',
    recipient: 'Nasreen Sayed', address: 'nasreen.sayed@dalgroup.com', source: 'Role', external: false,
    language: 'English', channel: 'In-app', status: 'Delivered', attempts: 1, at: '2026-08-14 09:05',
    correlation: 'CORR-a1c930', country: 'Sudan', priority: 'Approval', requiresAck: false,
    deepLink: '/c1/access-requests/AR-000141'
  },
  {
    id: 'DL-9002', notificationId: 'N-5001', event: 'Approval request',
    subject: 'AR-000141 awaits your approval',
    body: 'Dear Nasreen Sayed,\n\nAR-000141 — Omar Bashir — was submitted by Nasreen Sayed in Sudan and is awaiting your decision by 2026-08-22.',
    recipient: 'Nasreen Sayed', address: 'nasreen.sayed@dalgroup.com', source: 'Role', external: false,
    language: 'English', channel: 'Email', status: 'Delivered', attempts: 1, at: '2026-08-14 09:05',
    correlation: 'CORR-a1c931', country: 'Sudan', priority: 'Approval', requiresAck: false,
    deepLink: '/c1/access-requests/AR-000141'
  },
  {
    id: 'DL-9003', notificationId: 'N-5002', event: 'Access review reminder',
    subject: 'Access review pack for Sudan 2026 H2 is due 31 Aug',
    body: 'Dear Nasreen Sayed,\n\nThe access review pack for Sudan 2026 H2 is due on 2026-08-31.',
    recipient: 'Nasreen Sayed', address: 'nasreen.sayed@dalgroup.com', source: 'Named user', external: false,
    language: 'English', channel: 'Email', status: 'Delivered', attempts: 1, at: '2026-08-01 06:00',
    correlation: 'CORR-77b210', country: 'Sudan', priority: 'Operational', requiresAck: false,
    deepLink: '/c1/access-reviews'
  },
  {
    id: 'DL-9004', notificationId: 'N-5003', event: 'Account lockout',
    subject: 'Account for Joseph Mwangi has been locked after 5 failed attempts',
    body: 'Dear administrator,\n\nThe account for Joseph Mwangi in Tanzania has been locked after five failed sign-in attempts.',
    recipient: 'Nasreen Sayed', address: 'nasreen.sayed@dalgroup.com', source: 'Role', external: false,
    language: 'English', channel: 'SMS', status: 'Delivered', attempts: 1, at: '2026-08-12 11:41',
    correlation: 'CORR-3f0d55', country: 'Tanzania', priority: 'Urgent', requiresAck: false,
    note: 'SMS is reserved for urgent items; this rule is classed Urgent, so the channel is permitted.',
    deepLink: '/c1/users/U-004'
  },
  {
    id: 'DL-9005', notificationId: 'N-5004', event: 'Welcome / activation',
    subject: 'Your COTS access for Mozambique',
    body: 'Caro(a) Beira Logistics,\n\nO seu acesso foi activado para Mozambique. Nenhuma senha é transmitida nesta mensagem.',
    recipient: 'Beira Logistics (portal)', address: 'portal@beiralog.example', source: 'External contact', external: true,
    language: 'Portuguese', channel: 'Email', status: 'Permanently failed', attempts: 4, at: '2026-08-17 10:30',
    correlation: 'CORR-91ee02', country: 'Mozambique', priority: 'Operational', requiresAck: true,
    failureReason: 'Recipient mailbox rejected the message: 550 relay not permitted for this sending domain.',
    note: 'An external recipient never receives an in-app row — WF-C5-01 / Step 4.',
    deepLink: '/c1/users/U-006'
  },
  {
    id: 'DL-9006', notificationId: 'N-5005', event: 'Approval outcome',
    subject: 'WH-0142 — Approved',
    body: 'Dear Fatima Idris,\n\nWH-0142 — Port Sudan Warehouse 3 — was Approved in Sudan.',
    recipient: 'Fatima Idris', address: 'fatima.idris@dalgroup.com', source: 'Subscriber', external: false,
    language: 'English', channel: 'Email', status: 'Transient failure, retrying', attempts: 2, at: '2026-08-18 07:15',
    correlation: 'CORR-6ab418', country: 'Sudan', priority: 'Operational', requiresAck: false,
    failureReason: 'Provider returned a temporary error (451). Retry 3 of 5 is scheduled.',
    deepLink: '/c3/records/MD-1'
  },
  {
    id: 'DL-9007', notificationId: 'N-5006', event: 'Status change',
    subject: 'CMD-0011 — Returned for Amendment',
    body: 'Caro(a) Beira Logistics,\n\nCMD-0011 — Sesame — Natural Brown — mudou de estado.',
    recipient: 'Beira Logistics (portal)', address: 'portal@beiralog.example', source: 'External contact', external: true,
    language: 'Portuguese', channel: 'Email', status: 'Held — quiet hours', attempts: 0, at: '2026-08-18 06:40',
    correlation: 'CORR-2c77a9', country: 'Mozambique', priority: 'Informational', requiresAck: false,
    note: 'Non-urgent message outside working time in Mozambique — held until Wednesday 2026-08-19 08:00 — WF-C5-03 / Step 4.',
    deepLink: '/c3/records/MD-10'
  },
  {
    id: 'DL-9008', notificationId: 'N-5007', event: 'Service level breach',
    subject: 'AR-000141 has passed its service level',
    body: 'Dear Grace Mensah,\n\nAR-000141 has passed the service level for its current approval step in Sudan.',
    recipient: 'Grace Mensah', address: 'grace.mensah@dalgroup.com', source: 'Role', external: false,
    language: 'Portuguese', channel: 'SMS', status: 'Delivered', attempts: 1, at: '2026-08-18 08:05',
    correlation: 'CORR-55aa10', country: 'Sudan', priority: 'Urgent', requiresAck: true,
    note: 'Urgent messages are dispatched immediately regardless of quiet hours — WF-C5-03 / Step 4.',
    deepLink: '/c4/approvals/AR-000141'
  },
  {
    id: 'DL-9009', notificationId: 'N-5007', event: 'Service level breach',
    subject: 'AR-000141 has passed its service level',
    body: 'Dear Grace Mensah,\n\nAR-000141 has passed the service level for its current approval step in Sudan.',
    recipient: 'Grace Mensah', address: 'grace.mensah@dalgroup.com', source: 'Role', external: false,
    language: 'Portuguese', channel: 'Email', status: 'Delivered', attempts: 1, at: '2026-08-18 08:05',
    correlation: 'CORR-55aa11', country: 'Sudan', priority: 'Urgent', requiresAck: true,
    acknowledgedAt: '2026-08-18 08:22',
    deepLink: '/c4/approvals/AR-000141'
  }
];

/** WF-C5-01 / Step 1 — events raised where no rule matched */
export interface UnmatchedEvent {
  id: string;
  event: string;
  record: string;
  country: string;
  at: string;
  why: string;
}

export const seedUnmatched: UnmatchedEvent[] = [
  {
    id: 'UE-1', event: 'Document expiry', record: 'Lease agreement on WH-0155 Kassala collection store',
    country: 'Sudan', at: '2026-08-18 02:05',
    why: 'The Document expiry rule (NR-10) is inactive, so no notification was issued. The event remains in the audit trail (C8) and the system log (C9).'
  },
  {
    id: 'UE-2', event: 'Threshold breach', record: 'Moisture 6.8% on batch 26/SES/GDF/0442',
    country: 'Sudan', at: '2026-08-17 15:10',
    why: 'No rule is configured for Threshold breach. The event remains in the audit trail (C8) and the system log (C9).'
  },
  {
    id: 'UE-3', event: 'Non-conformity reported', record: 'NC-26-0118 batch 26/SES/GDF/0442',
    country: 'Ethiopia', at: '2026-08-16 11:48',
    why: 'A rule exists for Sudan only; this event was raised in Ethiopia, which is outside its country scope.'
  }
];

/* ------------------------------------------------------------------ *
 * WF-C5-01 / Step 9 — sales contract readiness
 * ------------------------------------------------------------------ */

export interface ReadinessRec {
  role: string;
  recipient: string;
  taskRaised: string;
  feedback?: 'Ready' | 'Ready with conditions' | 'Not ready';
  comment?: string;
  at?: string;
}

export const SALES_CONTRACT = {
  reference: 'S30000942-1',
  name: 'Agrotem Trading — 500 MT Sesame Hulled White, FOB Port Sudan',
  country: 'Sudan',
  created: '2026-08-17 14:05',
  detail: [
    ['Buyer', 'Agrotem Trading LLC'], ['Commodity', 'Sesame — Hulled White'], ['Quantity', '500 MT'],
    ['Terms', 'FOB Port Sudan'], ['Shipment', 'September 2026'], ['Price', 'USD 1,420 per MT']
  ] as [string, string][]
};

export const seedReadiness: ReadinessRec[] = [
  { role: 'QUALITY_INSPECTOR', recipient: 'Yusuf Kamal', taskRaised: '2026-08-17 14:06', feedback: 'Ready with conditions', comment: 'Purity band achievable; requires re-drying of two lots before loading.', at: '2026-08-17 16:40' },
  { role: 'EXECUTION_OFFICER', recipient: 'Meseret Alemu', taskRaised: '2026-08-17 14:06', feedback: 'Ready', comment: 'Vessel space confirmed for the September window.', at: '2026-08-18 07:02' },
  { role: 'PROCESSING_SUPERVISOR', recipient: 'Tarig Hassan', taskRaised: '2026-08-17 14:06' },
  { role: 'COMPLIANCE_OFFICER', recipient: 'Fatima Idris', taskRaised: '2026-08-17 14:06' }
];

/* ------------------------------------------------------------------ *
 * WF-C5-02 — time-based rules, the scheduler and overdue items
 * ------------------------------------------------------------------ */

export const DATA_ELEMENTS = [
  'Exchange rate', 'Market price', 'Freight rate', 'Scheduled quality activity',
  'Expiring document', 'Expiring contract'
];

export interface JobRule {
  id: string;
  element: string;
  periodValue: number;
  periodUnit: 'hours' | 'days';
  responsibleRole: string;
  escalationValue: number;
  escalationUnit: 'hours' | 'days';
  escalationRole: string;
  countries: string[];
  commodities: string[];
  areas: string[];
  active: boolean;
  lastRun: string;
}

export const seedJobRules: JobRule[] = [
  {
    id: 'JR-01', element: 'Exchange rate', periodValue: 24, periodUnit: 'hours',
    responsibleRole: 'COMPLIANCE_OFFICER', escalationValue: 12, escalationUnit: 'hours', escalationRole: 'COUNTRY_MANAGER',
    countries: ['Sudan', 'Ethiopia', 'Tanzania', 'Mozambique'], commodities: [], areas: [], active: true, lastRun: '2026-08-18 06:00'
  },
  {
    id: 'JR-02', element: 'Market price', periodValue: 3, periodUnit: 'days',
    responsibleRole: 'SOURCING_OFFICER', escalationValue: 2, escalationUnit: 'days', escalationRole: 'COUNTRY_MANAGER',
    countries: ['Sudan', 'Ethiopia'], commodities: ['Sesame — Hulled White', 'Sesame — Natural Brown'], areas: ['Gedaref buying area', 'Kassala buying area'],
    active: true, lastRun: '2026-08-18 06:00'
  },
  {
    id: 'JR-03', element: 'Freight rate', periodValue: 7, periodUnit: 'days',
    responsibleRole: 'EXECUTION_OFFICER', escalationValue: 3, escalationUnit: 'days', escalationRole: 'COUNTRY_MANAGER',
    countries: ['Sudan'], commodities: [], areas: ['Gedaref buying area', 'Port Sudan corridor'], active: true, lastRun: '2026-08-18 06:00'
  },
  {
    id: 'JR-04', element: 'Scheduled quality activity', periodValue: 14, periodUnit: 'days',
    responsibleRole: 'QUALITY_INSPECTOR', escalationValue: 5, escalationUnit: 'days', escalationRole: 'PROCESSING_SUPERVISOR',
    countries: ['Sudan'], commodities: ['Sesame — Hulled White'], areas: [], active: true, lastRun: '2026-08-18 06:00'
  },
  {
    id: 'JR-05', element: 'Expiring document', periodValue: 30, periodUnit: 'days',
    responsibleRole: 'SYSTEM_ADMINISTRATOR', escalationValue: 10, escalationUnit: 'days', escalationRole: 'COMPLIANCE_OFFICER',
    countries: [], commodities: [], areas: [], active: true, lastRun: '2026-08-18 06:00'
  }
];

export interface OverdueItem {
  id: string;
  ruleId: string;
  element: string;
  item: string;
  country: string;
  scope: string;
  lastUpdated: string;
  lastUpdatedBy: string;
  /** hours elapsed since the last user update */
  elapsed: number;
  state: 'Within period' | 'Overdue — notified' | 'Escalated';
  responsible: string;
  escalatedTo?: string;
  /** WF-C5-02 / Step 3 — items outside scope are never prompted */
  inScope: boolean;
  outOfScopeReason?: string;
  route?: string;
}

export const seedOverdue: OverdueItem[] = [
  {
    id: 'OD-1', ruleId: 'JR-01', element: 'Exchange rate', item: 'USD / SDG month-end rate', country: 'Sudan',
    scope: 'All commodities', lastUpdated: '2026-08-16 09:00', lastUpdatedBy: 'Fatima Idris', elapsed: 48,
    state: 'Escalated', responsible: 'Fatima Idris', escalatedTo: 'Grace Mensah', inScope: true, route: '/c3/records/MD-6'
  },
  {
    id: 'OD-2', ruleId: 'JR-02', element: 'Market price', item: 'Sesame Hulled White — Gedaref spot', country: 'Sudan',
    scope: 'Sesame — Hulled White · Gedaref buying area', lastUpdated: '2026-08-13 08:30', lastUpdatedBy: 'Ahmed Osman', elapsed: 120,
    state: 'Overdue — notified', responsible: 'Ahmed Osman', inScope: true
  },
  {
    id: 'OD-3', ruleId: 'JR-03', element: 'Freight rate', item: 'Gedaref → Port Sudan inland haulage', country: 'Sudan',
    scope: 'Gedaref buying area', lastUpdated: '2026-08-14 10:00', lastUpdatedBy: 'Meseret Alemu', elapsed: 96,
    state: 'Within period', responsible: 'Meseret Alemu', inScope: true
  },
  {
    id: 'OD-4', ruleId: 'JR-04', element: 'Scheduled quality activity', item: 'Fumigation check — Port Sudan Warehouse 3', country: 'Sudan',
    scope: 'Sesame — Hulled White', lastUpdated: '2026-07-28 07:45', lastUpdatedBy: 'Yusuf Kamal', elapsed: 504,
    state: 'Escalated', responsible: 'Yusuf Kamal', escalatedTo: 'Tarig Hassan', inScope: true, route: '/c3/records/MD-1'
  },
  {
    id: 'OD-5', ruleId: 'JR-02', element: 'Market price', item: 'Sesame Natural Brown — Humera spot', country: 'Ethiopia',
    scope: 'Sesame — Natural Brown · Humera buying area', lastUpdated: '2026-05-02 09:15', lastUpdatedBy: 'Meseret Alemu', elapsed: 2600,
    state: 'Within period', responsible: 'Meseret Alemu', inScope: false,
    outOfScopeReason: 'Sesame — Natural Brown is not an active commodity in Ethiopia, so the item is outside scope and no prompt is raised — WF-C5-02 / Step 3.'
  },
  {
    id: 'OD-6', ruleId: 'JR-03', element: 'Freight rate', item: 'Beira corridor — inland haulage', country: 'Mozambique',
    scope: 'Beira corridor', lastUpdated: '2026-03-11 12:00', lastUpdatedBy: 'Grace Mensah', elapsed: 3800,
    state: 'Within period', responsible: 'Grace Mensah', inScope: false,
    outOfScopeReason: 'The Beira corridor is not an active operational area, so historical records are never prompted — WF-C5-02 / Step 3.'
  },
  {
    id: 'OD-7', ruleId: 'JR-05', element: 'Expiring document', item: 'Rental agreement — Port Sudan Warehouse 3 (expires 2026-09-30)', country: 'Sudan',
    scope: 'All commodities', lastUpdated: '2026-07-20 11:00', lastUpdatedBy: 'Ahmed Osman', elapsed: 700,
    state: 'Overdue — notified', responsible: 'Nasreen Sayed', inScope: true, route: '/c3/records/MD-1'
  }
];

export interface JobRun {
  id: string;
  job: string;
  started: string;
  ended: string;
  durationSeconds: number;
  inScope: number;
  skipped: number;
  withinPeriod: number;
  newlyOverdue: number;
  escalated: number;
  notifications: number;
  failures: number;
  note?: string;
}

export const seedJobRuns: JobRun[] = [
  {
    id: 'JB-1', job: 'Time-based notification evaluation', started: '2026-08-18 06:00:00', ended: '2026-08-18 06:00:07',
    durationSeconds: 7, inScope: 5, skipped: 2, withinPeriod: 1, newlyOverdue: 2, escalated: 2, notifications: 6, failures: 0
  },
  {
    id: 'JB-2', job: 'Time-based notification evaluation', started: '2026-08-17 06:00:00', ended: '2026-08-17 06:00:06',
    durationSeconds: 6, inScope: 5, skipped: 2, withinPeriod: 3, newlyOverdue: 1, escalated: 1, notifications: 3, failures: 0
  },
  {
    id: 'JB-3', job: 'Time-based notification evaluation', started: '2026-08-16 06:00:00', ended: '2026-08-16 06:00:11',
    durationSeconds: 11, inScope: 5, skipped: 2, withinPeriod: 4, newlyOverdue: 0, escalated: 0, notifications: 1, failures: 1,
    note: 'One notification failed permanently and was surfaced to the administrator — see the delivery log.'
  }
];

/** Delivery status counts for the C05 chart, computed by the store from live rows. */
export const DELIVERY_STATUS_ORDER: DeliveryStatus[] = [
  'Permanently failed', 'Transient failure, retrying', 'Held — quiet hours', 'Queued', 'Delivered'
];

export const STATUS_COLOUR: Record<DeliveryStatus, string> = {
  'Permanently failed': '#B3261E',
  'Transient failure, retrying': '#D9660B',
  'Held — quiet hours': '#C77700',
  Queued: '#0F79C4',
  Delivered: '#1E7B4F'
};

/* ------------------------------------------------------------------ *
 * Composition helpers — WF-C5-01 / Step 3, WF-C5-03 / Step 1
 * ------------------------------------------------------------------ */

export interface MergeContext {
  'record.reference'?: string;
  'record.name'?: string;
  'record.status'?: string;
  requester?: string;
  country?: string;
  due?: string;
  decision?: string;
  comment?: string;
  deepLink?: string;
  'recipient.name'?: string;
}

/** Replaces {{field}} with its value; an unknown field is left visible rather than blanked. */
export function renderTemplate(text: string, ctx: MergeContext): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (whole, field: string) => {
    const key = field.trim() as keyof MergeContext;
    const v = ctx[key];
    return v === undefined || v === '' ? whole : String(v);
  });
}

/** Merge fields present in a template that the event payload cannot supply. */
export function unknownFields(text: string): string[] {
  const used = [...text.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => `{{${m[1].trim()}}}`);
  return [...new Set(used.filter((f) => !MERGE_FIELDS.includes(f)))];
}

export function policyFor(policy: ChannelPolicy[], priority: PriorityClass): ChannelPolicy {
  return policy.find((p) => p.priority === priority) ?? policy[0];
}

export function quietFor(quiet: QuietHours[], country: string): QuietHours | undefined {
  return quiet.find((q) => q.country === country);
}

export function periodHours(value: number, unit: 'hours' | 'days'): number {
  return unit === 'days' ? value * 24 : value;
}
