/* ------------------------------------------------------------------ *
 * C12 / C12 — Integration Layer
 *
 * The twelfth and last module, and the one where two deferred questions
 * come due. C09 built an exchange log and an error queue, said C12
 * describes the same things, and disclaimed ownership. C09 also found the
 * two source documents disagreeing about whether reprocessing raises a
 * business audit entry. Neither is resolved here either — but each is now
 * stated as a decision with its consequences, which is the most a
 * prototype can honestly do.
 *
 * The module is organised around WF-C12-01 / Step 5:
 *   "the system never creates a master record silently to force a record
 *    through."
 *
 * There is ONE exchange log and ONE error queue, held in the C09 store and
 * read from both modules. Nothing here duplicates them.
 * ------------------------------------------------------------------ */

export const TODAY_C12 = '2026-08-18';

/* ------------------------------------------------------------------ *
 * WF-C12-01 / Step 1 and WF-C12-02 — the interface registry
 * ------------------------------------------------------------------ */

export type Direction = 'Inbound' | 'Outbound' | 'Bidirectional';
export type Trigger = 'Real time' | 'Scheduled' | 'Business event';
export type ConfirmationState = 'Agreed' | 'Access unconfirmed' | 'Scope unconfirmed' | 'Commercially unconfirmed';

export interface FallbackDef {
  whileUnavailable: string;
  maxOutage: string;
  invokedBy: string;
  catchUp: string;
  lastReviewed: string;
}

export interface InterfaceDef {
  id: string;
  name: string;
  externalSystem: string;
  direction: Direction;
  /** true where the direction may not be changed until a business question is answered */
  directionLocked?: string;
  trigger: Trigger;
  scheduleOrEvent: string;
  method: string;
  dataScope: string;
  notExchanged: string[];
  maskedFields: string[];
  businessOwner: string;
  technicalOwner: string;
  retryAttempts: number;
  retryIntervalSeconds: number;
  backoff: 'Fixed' | 'Doubling';
  onExhaustion: 'Hold in the error queue' | 'Alert only';
  queueThreshold: number;
  credentialRef: string;
  rotationDays: number;
  lastRotated: string;
  active: boolean;
  /** WF-C12-02 — what the workflow says this interface is for, in its own terms */
  purpose: string;
  confirmation: ConfirmationState;
  confirmationNote?: string;
  /** which built module already exercises it, where one does */
  exercisedBy?: string;
  fallback?: FallbackDef;
  /** the C09 interface name this maps to, where exchanges already exist */
  c9InterfaceName?: string;
  /** whether it carries quantities or values, so reconciliation applies — WF-C12-03 / Step 1 */
  reconcilable: boolean;
}

export const seedInterfaces: InterfaceDef[] = [
  {
    id: 'IF-01', name: 'Active Directory authentication and synchronisation', externalSystem: 'Active Directory',
    direction: 'Inbound', trigger: 'Real time', scheduleOrEvent: 'At login, and scheduled daily at 05:00',
    method: 'Directory query over a secured channel',
    dataScope: 'User authentication, user attributes and group membership, to support provisioning.',
    notExchanged: ['Password or credential material', 'Personal data beyond the attributes provisioning needs'],
    maskedFields: ['Password and secret'],
    businessOwner: 'Nasreen Sayed', technicalOwner: 'Nasreen Sayed',
    retryAttempts: 2, retryIntervalSeconds: 120, backoff: 'Fixed', onExhaustion: 'Alert only',
    queueThreshold: 5, credentialRef: 'SVC-AD-01', rotationDays: 180, lastRotated: '2026-05-02', active: true,
    purpose: 'Authenticates internal users at login, and retrieves user attributes and group membership to support provisioning (C1).',
    confirmation: 'Agreed', exercisedBy: 'C01 sign-in and Active Directory group mapping',
    c9InterfaceName: 'Active Directory synchronisation', reconcilable: false,
    fallback: {
      whileUnavailable: 'Sign-in falls back to the locally held account list for users already provisioned; no new provisioning is performed.',
      maxOutage: '4 hours', invokedBy: 'System Administrator',
      catchUp: 'The scheduled synchronisation is re-run for the outage period; group changes made in the directory during the outage are applied on the next run.',
      lastReviewed: '2026-06-15'
    }
  },
  {
    id: 'IF-02', name: 'SAP purchase and sales order retrieval', externalSystem: 'SAP',
    direction: 'Inbound',
    directionLocked: 'Whether COTS will ever write back to SAP or remain strictly read-only is unconfirmed (WF-C12-02 / Step 3). The direction cannot be set to outbound until that is answered, because setting it either way would be the decision.',
    trigger: 'Scheduled', scheduleOrEvent: 'Daily at 02:00',
    method: 'Read-only service call',
    dataScope: 'Transactional detail such as purchase orders and sales orders, and confirmation that quantities have been posted.',
    notExchanged: ['Financial postings and ledger balances', 'Pricing conditions beyond the order line', 'Any write-back to SAP'],
    maskedFields: ['Price and commercial terms', 'Full request payload'],
    businessOwner: 'Grace Mensah', technicalOwner: 'Nasreen Sayed',
    retryAttempts: 3, retryIntervalSeconds: 30, backoff: 'Fixed', onExhaustion: 'Hold in the error queue',
    queueThreshold: 10, credentialRef: 'SVC-SAP-01', rotationDays: 180, lastRotated: '2026-06-01', active: true,
    purpose: 'Read-only retrieval giving visibility without duplicating the financial system of record. Contracts are issued from SAP by the Dubai execution team, and COTS tracks their operational execution.',
    confirmation: 'Access unconfirmed',
    confirmationNote: 'Confirmation of technical access to SAP and the agreed data scope, which the project plan flags as a key risk to validate early; and whether COTS will ever write back to SAP or remain strictly read-only.',
    exercisedBy: 'C03 mapping tables and C09 exchange log',
    c9InterfaceName: 'SAP purchase order retrieval', reconcilable: true,
    fallback: {
      whileUnavailable: 'The Dubai execution team sends the order schedule by email and it is keyed as a bulk load through C03, marked with the source system.',
      maxOutage: '2 working days', invokedBy: 'Country Manager',
      catchUp: 'The retrieval is re-run for the outage period; records keyed manually are matched on the order reference and duplicates are held in the error queue rather than merged.',
      lastReviewed: '2026-07-02'
    }
  },
  {
    id: 'IF-03', name: 'SAP posting confirmation', externalSystem: 'SAP',
    direction: 'Outbound',
    directionLocked: 'This interface is outbound in the registry as seeded, which itself needs confirming: whether COTS writes to SAP at all is the open question of WF-C12-02 / Step 3.',
    trigger: 'Scheduled', scheduleOrEvent: 'Daily at 02:00',
    method: 'Service call',
    dataScope: 'Journal entries raised from operational activity, for posting confirmation.',
    notExchanged: ['Master data', 'Anything not required for the posting'],
    maskedFields: ['Price and commercial terms'],
    businessOwner: 'Grace Mensah', technicalOwner: 'Nasreen Sayed',
    retryAttempts: 3, retryIntervalSeconds: 60, backoff: 'Doubling', onExhaustion: 'Hold in the error queue',
    queueThreshold: 5, credentialRef: 'SVC-SAP-01', rotationDays: 180, lastRotated: '2026-06-01', active: true,
    purpose: 'Confirms that quantities have been posted. Whether this interface should exist at all depends on the write-back decision.',
    confirmation: 'Access unconfirmed',
    confirmationNote: 'Whether COTS will ever write back to SAP or remain strictly read-only is unconfirmed. This interface is registered so the question is visible, not because it is agreed.',
    exercisedBy: 'C09 exchange log and error queue',
    c9InterfaceName: 'SAP posting', reconcilable: true,
    fallback: {
      whileUnavailable: 'Postings are held in the error queue and released when the interface returns; finance is informed of the backlog daily.',
      maxOutage: '1 working day', invokedBy: 'Country Manager',
      catchUp: 'The queue is released in posting-date order once the interface returns.',
      lastReviewed: '2026-07-02'
    }
  },
  {
    id: 'IF-04', name: 'Odoo logistics retrieval', externalSystem: 'Odoo',
    direction: 'Inbound', trigger: 'Scheduled', scheduleOrEvent: 'Daily at 02:00',
    method: 'Service call',
    dataScope: 'Logistics and stock movement data, to avoid re-entry and keep movement information consistent.',
    notExchanged: ['Warehouse master data, which is governed in C03', 'Costing detail'],
    maskedFields: ['Full request payload'],
    businessOwner: 'Grace Mensah', technicalOwner: 'Nasreen Sayed',
    retryAttempts: 3, retryIntervalSeconds: 30, backoff: 'Fixed', onExhaustion: 'Hold in the error queue',
    queueThreshold: 10, credentialRef: 'SVC-ODOO-01', rotationDays: 180, lastRotated: '2026-02-10', active: true,
    purpose: 'Retrieval of logistics data, to avoid re-entry and to keep movement information consistent.',
    confirmation: 'Scope unconfirmed',
    confirmationNote: 'The scope of the Odoo integration, and which system is authoritative for logistics data, are unconfirmed. A retrieval interface whose authority is undecided is a reconciliation waiting to fail.',
    exercisedBy: 'C03 mapping tables and C09 exchange log',
    c9InterfaceName: 'Odoo movement retrieval', reconcilable: true,
    fallback: {
      whileUnavailable: 'Movements are recorded in COTS directly by the warehouse team and flagged as locally entered.',
      maxOutage: '3 working days', invokedBy: 'Country Logistics',
      catchUp: 'The retrieval is re-run and locally entered movements are reconciled against it; differences go to the interface owner.',
      lastReviewed: '2026-06-20'
    }
  },
  {
    id: 'IF-05', name: 'Freight rate retrieval', externalSystem: 'Freight rate service',
    direction: 'Inbound', trigger: 'Scheduled', scheduleOrEvent: 'Monthly on the 1st at 04:00',
    method: 'Service call',
    dataScope: 'Container freight rates by loading port, destination port and commodity.',
    notExchanged: ['Negotiated contract rates, which are entered by the business'],
    maskedFields: ['Price and commercial terms'],
    businessOwner: 'Grace Mensah', technicalOwner: 'Nasreen Sayed',
    retryAttempts: 2, retryIntervalSeconds: 300, backoff: 'Fixed', onExhaustion: 'Alert only',
    queueThreshold: 5, credentialRef: 'SVC-FRT-01', rotationDays: 365, lastRotated: '2025-09-01', active: false,
    purpose: 'Replaces the current manual monthly update, and supports a bulk entry form for multiple lanes and shipping lines. The bulk entry form belongs to the operational freight rate screens, not to C12.',
    confirmation: 'Commercially unconfirmed',
    confirmationNote: 'The commercial and licensing position for the freight rate service is unconfirmed.',
    reconcilable: false,
    /* deliberately no fallback: the registry marks it incomplete and refuses activation */
  },
  {
    id: 'IF-06', name: 'Vessel tracking', externalSystem: 'Vessel tracking service',
    direction: 'Inbound', trigger: 'Real time', scheduleOrEvent: 'On demand and on position update',
    method: 'Service call',
    dataScope: 'Vessel position and voyage status for shipments in transit.',
    notExchanged: ['Cargo commercial detail'],
    maskedFields: [],
    businessOwner: 'Grace Mensah', technicalOwner: 'Nasreen Sayed',
    retryAttempts: 1, retryIntervalSeconds: 0, backoff: 'Fixed', onExhaustion: 'Alert only',
    queueThreshold: 5, credentialRef: 'SVC-VSL-01', rotationDays: 365, lastRotated: '2025-11-15', active: false,
    purpose: 'Online vessel tracking, identified in the original requirements as a later phase.',
    confirmation: 'Commercially unconfirmed',
    confirmationNote: 'A later phase in the original requirements, and the commercial and licensing position is unconfirmed. No module built so far consumes it.',
    reconcilable: false,
    fallback: {
      whileUnavailable: 'Position is taken from the shipping line’s own portal and recorded manually against the shipment.',
      maxOutage: 'Indefinite — the interface is not operationally critical',
      invokedBy: 'Country Logistics',
      catchUp: 'Positions are not backfilled; only the current position matters.',
      lastReviewed: '2026-03-10'
    }
  },
  {
    id: 'IF-07', name: 'Notification providers', externalSystem: 'Email, SMS and messaging providers',
    direction: 'Outbound', trigger: 'Business event', scheduleOrEvent: 'On every notification dispatch',
    method: 'Provider service call',
    dataScope: 'The composed notification and the recipient address for the channel.',
    notExchanged: ['Record detail beyond what the template renders'],
    maskedFields: ['Personal contact detail'],
    businessOwner: 'Nasreen Sayed', technicalOwner: 'Nasreen Sayed',
    retryAttempts: 3, retryIntervalSeconds: 60, backoff: 'Doubling', onExhaustion: 'Alert only',
    queueThreshold: 10, credentialRef: 'SVC-MSG-01', rotationDays: 90, lastRotated: '2026-04-01', active: true,
    purpose: 'The email, SMS and messaging channels used by C5.',
    confirmation: 'Commercially unconfirmed',
    confirmationNote: 'Agreed in principle; the licensing position for the messaging providers is unconfirmed.',
    exercisedBy: 'C05 delivery log, and C11 scheduled distribution',
    reconcilable: false,
    fallback: {
      whileUnavailable: 'In-app notification continues and is the record of the obligation; email and SMS are suppressed and the delivery log holds them as failed for later review.',
      maxOutage: '8 hours', invokedBy: 'System Administrator',
      catchUp: 'Held deliveries are retried once; anything permanently failed is surfaced to the administrator rather than re-sent in bulk.',
      lastReviewed: '2026-07-30'
    }
  },
  {
    id: 'IF-08', name: 'AI extraction and scenario services', externalSystem: 'AI services',
    direction: 'Bidirectional', trigger: 'Business event', scheduleOrEvent: 'On document upload, and on demand for scenarios',
    method: 'Service call',
    dataScope: 'The uploaded document for extraction, and scenario parameters for modelling.',
    notExchanged: ['Documents classified as sensitive, unless separately agreed', 'Personal data not required for the extraction'],
    maskedFields: ['Identity document number', 'Bank account'],
    businessOwner: 'Nasreen Sayed', technicalOwner: 'Nasreen Sayed',
    retryAttempts: 2, retryIntervalSeconds: 30, backoff: 'Fixed', onExhaustion: 'Alert only',
    queueThreshold: 5, credentialRef: 'SVC-AI-01', rotationDays: 90, lastRotated: '2026-03-20', active: true,
    purpose: 'Document data extraction supporting C7, and scenario modelling supporting costing and planning.',
    confirmation: 'Commercially unconfirmed',
    confirmationNote: 'The commercial and licensing position for the AI services is unconfirmed.',
    exercisedBy: 'C07 extraction, proposed for user confirmation',
    reconcilable: false,
    fallback: {
      whileUnavailable: 'Document metadata is keyed by hand; extraction is a convenience, never a control, so nothing is blocked.',
      maxOutage: '5 working days', invokedBy: 'Country Administration',
      catchUp: 'Documents uploaded during the outage are not re-extracted retrospectively unless a user asks.',
      lastReviewed: '2026-07-12'
    }
  }
];

export function interfaceDef(id: string): InterfaceDef | undefined {
  return seedInterfaces.find((i) => i.id === id);
}

/* ------------------------------------------------------------------ *
 * WF-C12-01 / Steps 2–7 — the six stages of an exchange
 * ------------------------------------------------------------------ */

export const STAGES = [
  { key: 'authenticate', seq: 1, name: 'Authenticate', step: 2, what: 'Authenticate to the external system using the stored service credential' },
  { key: 'correlate', seq: 2, name: 'Correlate', step: 3, what: 'Issue the correlation reference that ties every log entry, error and reprocess attempt to this exchange' },
  { key: 'validate', seq: 3, name: 'Validate', step: 4, what: 'Validate the response for structure and completeness before any processing begins' },
  { key: 'map', seq: 4, name: 'Map codes', step: 5, what: 'Translate codes through the mapping tables held in master data (C3)' },
  { key: 'transform', seq: 5, name: 'Transform and write', step: 6, what: 'Transform into the COTS structure, apply business validation, and write with the source system named' },
  { key: 'log', seq: 6, name: 'Log', step: 7, what: 'Log the exchange with its outcome, duration and record counts (C9)' }
] as const;
export type StageKey = typeof STAGES[number]['key'];

export interface StageResult {
  key: StageKey;
  state: 'Passed' | 'Failed' | 'Not reached';
  detail: string;
}

/** The codes an inbound payload carries, so Step 5 can be run against the real C03 mappings. */
export interface PayloadCode {
  domain: string;
  externalCode: string;
  externalSystem: 'SAP' | 'Odoo';
  record: string;
  /** the business record this code belongs to, so a held record has an identity */
  affects: string;
}

export const SIMULATION_PAYLOADS: Record<string, { codes: PayloadCode[]; received: number; note: string }> = {
  'IF-02': {
    received: 53,
    note: 'A daily purchase order retrieval carrying 53 lines. Two codes have no mapping.',
    codes: [
      { domain: 'commodity', externalCode: 'MAT-100482', externalSystem: 'SAP', record: 'PO-4471 line 1', affects: 'Purchase order PO-4471' },
      { domain: 'supplier', externalCode: 'VEND-58120', externalSystem: 'SAP', record: 'PO-4471 header', affects: 'Purchase order PO-4471' },
      { domain: 'uom', externalCode: 'TO', externalSystem: 'SAP', record: 'PO-4471 line 1', affects: 'Purchase order PO-4471' },
      { domain: 'commodity', externalCode: 'MAT-100915', externalSystem: 'SAP', record: 'PO-4472 line 1', affects: 'Purchase order PO-4472' },
      { domain: 'supplier', externalCode: 'VEND-59014', externalSystem: 'SAP', record: 'PO-4472 header', affects: 'Purchase order PO-4472' }
    ]
  },
  'IF-04': {
    received: 210,
    note: 'A daily movement retrieval carrying 210 movements. One location code has no mapping.',
    codes: [
      { domain: 'warehouse', externalCode: 'LOC/PS/03', externalSystem: 'Odoo', record: 'MV-8841', affects: 'Movement MV-8841' },
      { domain: 'warehouse', externalCode: 'LOC/GDF/01', externalSystem: 'Odoo', record: 'MV-8842', affects: 'Movement MV-8842' }
    ]
  },
  'IF-01': {
    received: 128,
    note: 'A scheduled directory synchronisation carrying 128 accounts. No code translation is required.',
    codes: []
  }
};

/* ------------------------------------------------------------------ *
 * WF-C12-01 / Steps 8–10 — the cause classes the correction path follows
 * ------------------------------------------------------------------ */

export const CAUSE_CLASSES = [
  'Missing mapping',
  'Master data gap',
  'Validation failure',
  'External error'
] as const;
export type CauseClass = typeof CAUSE_CLASSES[number];

export const CORRECTION_PATH: Record<CauseClass, { path: string; route: string; label: string }> = {
  'Missing mapping': {
    path: 'Create the mapping in C03 under its own approval, then reprocess. Nothing is created silently to force the record through — WF-C12-01 / Step 5.',
    route: '/c3/mapping', label: 'Open the C03 mapping list'
  },
  'Master data gap': {
    path: 'Create the master record properly in C03, with its duplicate check, mandatory documents and approval route, then reprocess.',
    route: '/c3/domains', label: 'Open master data'
  },
  'Validation failure': {
    path: 'Correct the field on the held payload and reprocess. The correction is recorded with the reason.',
    route: '/c12/error-queue', label: 'Correct here'
  },
  'External error': {
    path: 'Refer to the interface owner: the cause is in the external system and cannot be corrected in COTS.',
    route: '/c12/interfaces', label: 'Open the interface registry'
  }
};

/* ------------------------------------------------------------------ *
 * WF-C12-03 / Steps 1–4 — reconciliation
 * ------------------------------------------------------------------ */

export interface ReconLine {
  ref: string;
  record: string;
  cotsValue: number;
  sourceValue: number | null;
  unit: string;
  correlation?: string;
  /** where the trail shows the stage at which the difference was introduced */
  introducedAt?: string;
  note?: string;
}

export interface ReconRun {
  id: string;
  interfaceId: string;
  period: string;
  ranAt: string;
  matched: ReconLine[];
  cotsOnly: ReconLine[];
  sourceOnly: ReconLine[];
  differing: ReconLine[];
  outcome: 'Clean for the period' | 'Referred to the business owner';
  referredTo?: string;
  referredAt?: string;
}

export const seedReconRuns: ReconRun[] = [
  {
    id: 'RC-1', interfaceId: 'IF-04', period: 'July 2026', ranAt: '2026-08-01 06:00',
    matched: [
      { ref: 'MV-8801', record: 'Movement MV-8801 — Port Sudan Warehouse 3', cotsValue: 240, sourceValue: 240, unit: 'MT' },
      { ref: 'MV-8802', record: 'Movement MV-8802 — Port Sudan Warehouse 3', cotsValue: 180, sourceValue: 180, unit: 'MT' },
      { ref: 'MV-8803', record: 'Movement MV-8803 — Gedaref Transit Store', cotsValue: 95, sourceValue: 95, unit: 'MT' }
    ],
    cotsOnly: [], sourceOnly: [], differing: [],
    outcome: 'Clean for the period'
  },
  {
    id: 'RC-2', interfaceId: 'IF-02', period: 'August 2026', ranAt: '2026-08-18 06:00',
    matched: [
      { ref: 'PO-4460', record: 'Purchase order PO-4460 — Agrotem Trading LLC', cotsValue: 500, sourceValue: 500, unit: 'MT' },
      { ref: 'PO-4461', record: 'Purchase order PO-4461 — Agrotem Trading LLC', cotsValue: 320, sourceValue: 320, unit: 'MT' }
    ],
    cotsOnly: [
      {
        ref: 'PO-4455', record: 'Purchase order PO-4455 — keyed during the SAP outage', cotsValue: 150, sourceValue: null,
        unit: 'MT', note: 'Keyed manually under the documented fallback and marked as locally entered; it has no counterpart in SAP because SAP was unavailable.'
      }
    ],
    sourceOnly: [
      {
        ref: 'PO-4472', record: 'Purchase order PO-4472 — Gedaref Oilseeds Company', cotsValue: 0, sourceValue: 275,
        unit: 'MT', correlation: 'CORR-8f2a41', introducedAt: 'Stage 4 — map codes',
        note: 'Present in SAP and absent from COTS: the exchange held it because the commodity and supplier codes were unmapped. This is the direction that usually means a failed exchange.'
      }
    ],
    differing: [
      {
        ref: 'PO-4462', record: 'Purchase order PO-4462 — Agrotem Trading LLC', cotsValue: 400, sourceValue: 425,
        unit: 'MT', correlation: 'CORR-8f2a41', introducedAt: 'Stage 5 — transform and write',
        note: 'A line was amended in SAP after the retrieval ran; COTS holds the figure as at the exchange.'
      },
      {
        ref: 'PO-4463', record: 'Purchase order PO-4463 — Agrotem Trading LLC', cotsValue: 210, sourceValue: 200,
        unit: 'MT', correlation: 'CORR-8f2a41', introducedAt: 'Stage 5 — transform and write',
        note: 'A unit-of-measure rounding difference: the source carries kilogrammes and the mapping converts to metric tonnes.'
      }
    ],
    outcome: 'Referred to the business owner', referredTo: 'Grace Mensah', referredAt: '2026-08-18 07:10'
  }
];

/* ------------------------------------------------------------------ *
 * WF-C12-03 / Step 6 — credential rotation, recorded, never displayed
 * ------------------------------------------------------------------ */

export interface RotationRec {
  id: string;
  credentialRef: string;
  interfaceId: string;
  at: string;
  by: string;
  auditRef?: string;
}

export const seedRotations: RotationRec[] = [
  { id: 'RT-1', credentialRef: 'SVC-SAP-01', interfaceId: 'IF-02', at: '2026-06-01 08:15', by: 'Nasreen Sayed' },
  { id: 'RT-2', credentialRef: 'SVC-AD-01', interfaceId: 'IF-01', at: '2026-05-02 09:40', by: 'Nasreen Sayed' },
  { id: 'RT-3', credentialRef: 'SVC-MSG-01', interfaceId: 'IF-07', at: '2026-04-01 07:05', by: 'Nasreen Sayed' },
  { id: 'RT-4', credentialRef: 'SVC-AI-01', interfaceId: 'IF-08', at: '2026-03-20 11:20', by: 'Nasreen Sayed' },
  { id: 'RT-5', credentialRef: 'SVC-ODOO-01', interfaceId: 'IF-04', at: '2026-02-10 10:00', by: 'Nasreen Sayed' }
];

export function daysBetweenC12(from: string, to: string): number {
  const a = new Date(`${from.slice(0, 10)}T00:00:00Z`).getTime();
  const b = new Date(`${to.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

export function rotationDue(i: InterfaceDef, today = TODAY_C12): { nextDue: string; overdue: boolean; daysOver: number } {
  const last = new Date(`${i.lastRotated}T00:00:00Z`).getTime();
  const next = new Date(last + i.rotationDays * 86400000).toISOString().slice(0, 10);
  const over = daysBetweenC12(next, today);
  return { nextDue: next, overdue: over > 0, daysOver: Math.max(over, 0) };
}

/* ------------------------------------------------------------------ *
 * The two decisions that come due in this module
 * ------------------------------------------------------------------ */

export const QUEUE_OWNERSHIP_ISSUE =
  'Integration consistency issue: the integration error queue and its reprocessing are described in both '
  + 'C9 / WF-C9-02 / Steps 2–3 and C12 / WF-C12-01 / Steps 8–10, and the retry policy per interface appears as a '
  + 'configuration point in both modules. Confirm which module owns the error queue, the retry policy and the '
  + 'reprocessing action. C09 placed them provisionally and disclaimed ownership; this is the module those notes '
  + 'point at, and the decision is still the client’s. There is one queue in this prototype, read from both modules.';

export const REPROCESS_AUDIT_ISSUE =
  'Integration consistency issue: C12 / WF-C12-01 / Step 10 states that reprocessing is logged (C9) and audited (C8), '
  + 'whereas C9 / WF-C9-02 / Step 3 states only that it is logged. Confirm whether reprocessing raises a business audit '
  + 'entry as well as a technical log entry. C12’s wording is the fuller one: the integrated document says the business '
  + 'data written by the reprocessing is audited *against the service identity*, which also answers who the actor is.';

export const OWNERSHIP_READINGS = [
  {
    reading: 'C09 owns it — the queue is a technical facility',
    consequence: 'Support owns correction; the retry policy sits with the log level and the masking rules; an interface owner reads the queue but does not administer it.'
  },
  {
    reading: 'C12 owns it — the queue is part of the exchange',
    consequence: 'The interface owner owns correction, which matches Step 9’s "the interface owner is notified"; the retry policy sits on the interface definition beside the endpoint; support reads the queue through the technical log.'
  },
  {
    reading: 'Both, split — the queue in C12, the log in C09',
    consequence: 'Where this prototype’s behaviour already sits, and therefore the reading it would take by default if nobody decides.'
  }
];

export const SCOPE_NOTE =
  'The scope, sequencing and feasibility of each interface remain subject to confirmation of technical access, as '
  + 'recorded in the project plan risks (WF-C12-02 / Step 1). Every row therefore carries its own confirmation state, '
  + 'so a reader sees which interfaces are agreed and which are still assumptions.';

export const SAP_NOTE =
  'Confirmation of technical access to SAP and the agreed data scope is unconfirmed, and the project plan flags it as a '
  + 'key risk to validate early; and whether COTS will ever write back to SAP or remain strictly read-only is undecided.';

export const ODOO_NOTE =
  'The scope of the Odoo integration, and which system is authoritative for logistics data, are unconfirmed.';

export const COMMERCIAL_NOTE =
  'The commercial and licensing position for the freight rate service, vessel tracking, the messaging providers and the '
  + 'AI services is unconfirmed. No vendor is named on any of those four rows.';

export const CREDENTIAL_NOTE =
  'Service credentials are held securely and are never exposed in the interface or in the logs (WF-C12-01 / Step 2). No '
  + 'screen in this module accepts or displays a secret: the registry shows a reference and a rotation date, and rotation '
  + 'is performed in the credential store while this register records that it happened.';

export const INTEGRATION_ROLES = ['SYSTEM_ADMINISTRATOR', 'COMPLIANCE_OFFICER', 'COUNTRY_MANAGER'];
