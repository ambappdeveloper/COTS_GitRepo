/**
 * C8 Audit Trail and Activity History — mock data.
 * Static only. Every field traces to a step in COTS_C8_Workflows.
 *
 * Thirty inbound hand-offs: every module built so far writes here. This file holds
 * the configuration that governs those writes, not the entries themselves — the
 * entries accumulate in the store as the prototype is used.
 */

export type AuditLevel = 'Field level' | 'Status level' | 'Record level';

/** WF-C8-01 / Step 6 — the sensitive action classes named in the workflow */
export const SENSITIVE_CLASSES = [
  'Permission and role change',
  'Approval route change',
  'Master data approval',
  'Configuration change',
  'Document deletion',
  'Bulk data load',
  'Mass update'
] as const;

export type SensitiveClass = typeof SENSITIVE_CLASSES[number];

export interface SensitiveClassDef {
  cls: SensitiveClass;
  /** the entity and action patterns that put an entry into this class */
  matches: { entity?: string; action?: string }[];
  recipients: string[];
  flagged: boolean;
}

export const seedSensitiveClasses: SensitiveClassDef[] = [
  {
    cls: 'Permission and role change',
    matches: [{ entity: 'Role' }, { entity: 'Assignment' }, { entity: 'Delegation' }, { entity: 'Access review entry' }],
    recipients: ['COMPLIANCE_OFFICER', 'SYSTEM_ADMINISTRATOR'], flagged: true
  },
  {
    cls: 'Approval route change',
    matches: [{ entity: 'Approval route' }],
    recipients: ['COMPLIANCE_OFFICER'], flagged: true
  },
  {
    cls: 'Master data approval',
    matches: [{ entity: 'Master data', action: 'Approved' }, { entity: 'Master data', action: 'Status change' }],
    recipients: ['COMPLIANCE_OFFICER'], flagged: true
  },
  {
    cls: 'Configuration change',
    matches: [{ entity: 'Notification rule' }, { entity: 'Notification template' }, { entity: 'Channel policy' }, { entity: 'Automated job rule' }, { entity: 'Audit configuration' }],
    recipients: ['SYSTEM_ADMINISTRATOR'], flagged: true
  },
  {
    cls: 'Document deletion',
    matches: [{ entity: 'Document', action: 'Deleted' }, { entity: 'Document', action: 'purged' }],
    recipients: ['COMPLIANCE_OFFICER', 'SYSTEM_ADMINISTRATOR'], flagged: true
  },
  {
    cls: 'Bulk data load',
    matches: [{ action: 'Bulk load' }],
    // deliberately empty so the monitor can show "no recipients configured" honestly
    recipients: [], flagged: true
  },
  {
    cls: 'Mass update',
    matches: [{ action: 'Mass update' }],
    recipients: ['SYSTEM_ADMINISTRATOR'], flagged: true
  }
];

/* ------------------------------------------------------------------ *
 * WF-C8-01 / Step 4 — the audit level per entity class
 * ------------------------------------------------------------------ */

export interface AuditLevelDef {
  entity: string;
  level: AuditLevel;
  /** empty at field level means every field */
  fields: string[];
  retainReason: boolean;
  /** WF-C8-01 / Step 7 — the open decision */
  logViewAndExport: boolean;
  /** WF-C8-03 / Step 1 — retention per entity class */
  retentionYears: number;
  retentionBasis: string;
}

export const seedAuditLevels: AuditLevelDef[] = [
  { entity: 'Access Request', level: 'Field level', fields: [], retainReason: true, logViewAndExport: false, retentionYears: 7, retentionBasis: 'Legal — employment and access records' },
  { entity: 'User Account', level: 'Field level', fields: ['Status', 'Country scope', 'Module scope', 'Default country'], retainReason: true, logViewAndExport: true, retentionYears: 7, retentionBasis: 'Legal — identity and access evidence' },
  { entity: 'Role', level: 'Field level', fields: [], retainReason: true, logViewAndExport: true, retentionYears: 10, retentionBasis: 'Legal — authority evidence' },
  { entity: 'Assignment', level: 'Field level', fields: [], retainReason: true, logViewAndExport: false, retentionYears: 10, retentionBasis: 'Legal — authority evidence' },
  { entity: 'Delegation', level: 'Status level', fields: [], retainReason: true, logViewAndExport: false, retentionYears: 7, retentionBasis: 'Operational — cover arrangements' },
  { entity: 'Master data', level: 'Field level', fields: [], retainReason: true, logViewAndExport: false, retentionYears: 10, retentionBasis: 'Contractual — counterparty and commodity evidence' },
  { entity: 'Approval route', level: 'Field level', fields: [], retainReason: true, logViewAndExport: true, retentionYears: 10, retentionBasis: 'Legal — who held authority when' },
  { entity: 'Approval', level: 'Status level', fields: [], retainReason: true, logViewAndExport: false, retentionYears: 10, retentionBasis: 'Legal — decision evidence' },
  { entity: 'Notification rule', level: 'Record level', fields: [], retainReason: false, logViewAndExport: false, retentionYears: 5, retentionBasis: 'Operational — configuration history' },
  { entity: 'Notification template', level: 'Record level', fields: [], retainReason: false, logViewAndExport: false, retentionYears: 5, retentionBasis: 'Operational — configuration history' },
  { entity: 'Comment', level: 'Field level', fields: [], retainReason: false, logViewAndExport: false, retentionYears: 7, retentionBasis: 'Contractual — the reasoning behind decisions' },
  { entity: 'Document', level: 'Field level', fields: [], retainReason: true, logViewAndExport: true, retentionYears: 10, retentionBasis: 'Legal — document custody' },
  { entity: 'Session', level: 'Record level', fields: [], retainReason: false, logViewAndExport: false, retentionYears: 2, retentionBasis: 'Operational — sign-in history' },
  { entity: 'Scheduled job', level: 'Record level', fields: [], retainReason: false, logViewAndExport: false, retentionYears: 2, retentionBasis: 'Operational — job history' },
  { entity: 'Audit configuration', level: 'Field level', fields: [], retainReason: true, logViewAndExport: true, retentionYears: 10, retentionBasis: 'Legal — the audit of the audit configuration' }
];

/** WF-C8-01 / Step 5 — technical context. Illustrative: a prototype has no real session. */
export const TECH_CONTEXT = {
  session: 'SES-2026-08-18-4471',
  address: '10.42.7.118',
  device: 'Windows 11 · Edge 141 · desktop',
  mobileDevice: 'Android 15 · COTS mobile capture',
  serviceAddress: '10.42.2.9',
  serviceDevice: 'Integration host · COTS-INT-01'
};

/** WF-C8-01 / Step 3 — the originating systems an integration entry can name */
export const ORIGINATING_SYSTEMS = ['SAP', 'Bank statement service', 'AI extraction service', 'Market price feed'];

/* ------------------------------------------------------------------ *
 * Seeded audit entries beyond those the prototype generates itself:
 * integration and scheduled-job sources, and archived out-of-retention entries.
 * ------------------------------------------------------------------ */

export interface SeedAudit {
  id: string;
  at: string;
  user: string;
  role: string;
  country: string;
  entity: string;
  record: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  source: 'User interface' | 'Integration' | 'Scheduled job';
  sensitive?: boolean;
  originatingSystem?: string;
  archived?: boolean;
}

export const seedAuditExtra: SeedAudit[] = [
  {
    id: 'GA-100', at: '2026-08-18 02:14', user: 'Service identity (SAP interface)', role: '—', country: 'Sudan',
    entity: 'Master data', record: 'CMD-0011', action: 'Update', field: 'External code', oldValue: '—', newValue: 'MAT-100915',
    source: 'Integration', originatingSystem: 'SAP'
  },
  {
    id: 'GA-101', at: '2026-08-18 02:15', user: 'Service identity (SAP interface)', role: '—', country: 'Sudan',
    entity: 'Master data', record: 'SUP-004902', action: 'Create', source: 'Integration', originatingSystem: 'SAP'
  },
  {
    id: 'GA-102', at: '2026-08-17 23:05', user: 'Service identity (AI extraction service)', role: '—', country: 'Sudan',
    entity: 'Document', record: 'DOC-2026-WH0142-02', action: 'Extraction proposed', source: 'Integration',
    originatingSystem: 'AI extraction service'
  },
  {
    id: 'GA-103', at: '2026-08-18 06:00', user: 'Service identity (scheduled job)', role: '—', country: 'Global',
    entity: 'Scheduled job', record: 'Time-based notification evaluation', action: 'Run', source: 'Scheduled job'
  },
  {
    id: 'GA-104', at: '2026-08-18 02:00', user: 'Service identity (scheduled job)', role: '—', country: 'Global',
    entity: 'Scheduled job', record: 'Document expiry evaluation', action: 'Run', source: 'Scheduled job'
  },
  {
    id: 'GA-105', at: '2026-08-15 14:20', user: 'Nasreen Sayed', role: 'SYSTEM_ADMINISTRATOR', country: 'Sudan',
    entity: 'Role', record: 'COUNTRY_MANAGER', action: 'Permission added', field: 'Permissions',
    oldValue: 'Approve access request', newValue: 'Approve access request, Approve payment request',
    source: 'User interface', sensitive: true
  },
  {
    id: 'GA-106', at: '2026-08-11 09:35', user: 'Nasreen Sayed', role: 'SYSTEM_ADMINISTRATOR', country: 'Ethiopia',
    entity: 'Master data', record: 'Bulk load 42 rows', action: 'Bulk load', source: 'User interface', sensitive: true
  },
  {
    id: 'GA-107', at: '2026-06-30 18:40', user: 'Nasreen Sayed', role: 'SYSTEM_ADMINISTRATOR', country: 'Sudan',
    entity: 'Master data', record: 'Mass update — 118 warehouse records', action: 'Mass update',
    field: 'Operational area', oldValue: 'OA-001', newValue: 'OA-004', source: 'User interface', sensitive: true
  },
  /* --- entries beyond retention for their entity class, held archived --- */
  {
    id: 'GA-200', at: '2023-02-11 08:12', user: 'Ahmed Osman', role: 'SOURCING_OFFICER', country: 'Sudan',
    entity: 'Session', record: 'U-002', action: 'Login', source: 'User interface', archived: true
  },
  {
    id: 'GA-201', at: '2023-02-11 17:44', user: 'Ahmed Osman', role: 'SOURCING_OFFICER', country: 'Sudan',
    entity: 'Session', record: 'U-002', action: 'Logout', source: 'User interface', archived: true
  },
  {
    id: 'GA-202', at: '2022-11-03 06:00', user: 'Service identity (scheduled job)', role: '—', country: 'Global',
    entity: 'Scheduled job', record: 'Overnight synchronisation', action: 'Run', source: 'Scheduled job', archived: true
  },
  {
    id: 'GA-203', at: '2019-05-20 10:02', user: 'Ahmed Osman', role: 'SOURCING_OFFICER', country: 'Sudan',
    entity: 'Document', record: 'DOC-2021-WH0142-01', action: 'Uploaded — Rental agreement', source: 'User interface',
    archived: true
  }
];

/** WF-C8-03 / Step 6 — audit volume by month, for the growth trend */
export const VOLUME_BY_MONTH: { month: string; entries: number }[] = [
  { month: '2026-03', entries: 1840 },
  { month: '2026-04', entries: 2110 },
  { month: '2026-05', entries: 2260 },
  { month: '2026-06', entries: 2540 },
  { month: '2026-07', entries: 2980 },
  { month: '2026-08', entries: 3420 }
];

/** The month in which the last retention cycle ran, marked on the trend */
export const LAST_RETENTION_CYCLE = '2026-07';

export const TODAY_C8 = '2026-08-18';

export function auditLevelFor(levels: AuditLevelDef[], entity: string): AuditLevelDef | undefined {
  // entity strings from the modules are sometimes qualified, e.g. "Master data — Warehouse"
  return levels.find((l) => entity === l.entity)
    ?? levels.find((l) => entity.startsWith(l.entity))
    ?? levels.find((l) => entity.toLowerCase().includes(l.entity.toLowerCase()));
}

export function classifySensitive(defs: SensitiveClassDef[], entity: string, action: string): SensitiveClass | undefined {
  const hit = defs.find((d) => d.flagged && d.matches.some((m) =>
    (!m.entity || entity.toLowerCase().includes(m.entity.toLowerCase())) &&
    (!m.action || action.toLowerCase().includes(m.action.toLowerCase()))));
  return hit?.cls;
}

export function yearsBetween(from: string, to: string): number {
  const a = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${to.slice(0, 10)}T00:00:00Z`);
  return (b - a) / (365.25 * 86400000);
}

/**
 * WF-C8-02 / Step 3 — the roles that hold audit permission.
 * The definitive role catalogue is deferred by workshop decision (C1 / WF-C1-03 / Step 8),
 * so these are the demonstration holders.
 */
export const AUDIT_PERMISSION_ROLES = ['COMPLIANCE_OFFICER', 'SYSTEM_ADMINISTRATOR'];

export const ACTION_TYPES = [
  'Create', 'Update', 'Status change', 'Approved', 'Rejected', 'Returned for Amendment',
  'Delete', 'Uploaded', 'Opened', 'Downloaded', 'Login', 'Logout', 'Run', 'Bulk load', 'Mass update',
  'Audit search', 'Audit export'
];
