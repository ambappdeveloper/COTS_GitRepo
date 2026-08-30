/**
 * C7 File and Document Management — mock data.
 * Static only. Every field traces to a step in COTS_C7_Workflows.
 *
 * No file is ever stored or transmitted: a document here is a metadata record.
 * The storage approach is itself an open question (WF-C7-01 / Step 6), so the
 * prototype does not pretend to have answered it.
 */

export type Sensitivity = 'Standard' | 'Sensitive';
export type DocStatus = 'Current' | 'Superseded' | 'Archived' | 'Metadata only';
export type ValidityState = 'Valid' | 'Approaching expiry' | 'Expired' | 'No validity period';

/** WF-C7-01 / Step 2 — permitted formats and the maximum size */
export const PERMITTED_FORMATS = ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx'];
export const DEFAULT_MAX_MB = 10;

/** Files whose names contain this are refused by the simulated scan — WF-C7-01 / Step 2 */
export const SCAN_FAIL_HINT = 'infected';

/**
 * WF-C7-01 / Step 3 — the document type is the rule-bearer: it determines the
 * required metadata, the retention rule, the access restriction, whether
 * extraction applies and the notice period before expiry.
 */
export interface DocTypeDef {
  name: string;
  /** metadata the type requires beyond country, module and related record — Step 4 */
  requiredMetadata: string[];
  hasValidity: boolean;
  /** WF-C7-03 / Step 2 — notice period before expiry, in days */
  noticeDays: number;
  sensitivity: Sensitivity;
  /** WF-C7-02 / Step 2 — only these roles may open a sensitive document */
  nominatedRoles: string[];
  /** WF-C7-02 / Step 2 — an external user sees only these types, on their own records */
  externallyVisible: boolean;
  /** WF-C7-01 / Step 5 */
  extraction: boolean;
  extractionFields: string[];
  /** WF-C7-03 / Step 5 — demonstration values; retention is a compliance and legal decision */
  retentionYears: number;
  retentionBasis: string;
  maxMB: number;
  permittedFormats: string[];
  responsibleRole: string;
  escalationRole: string;
}

export const DOC_TYPES: DocTypeDef[] = [
  {
    name: 'Rental agreement',
    requiredMetadata: ['Document date', 'Validity period', 'Issuing party', 'Reference number'],
    hasValidity: true, noticeDays: 60, sensitivity: 'Standard', nominatedRoles: [], externallyVisible: false,
    extraction: true, extractionFields: ['Issuing party', 'Valid from', 'Valid to', 'Reference number', 'Monthly rent'],
    retentionYears: 10, retentionBasis: 'End of the lease term', maxMB: 10, permittedFormats: ['pdf', 'docx'],
    responsibleRole: 'EXECUTION_OFFICER', escalationRole: 'COUNTRY_MANAGER'
  },
  {
    name: 'Company registration',
    requiredMetadata: ['Document date', 'Validity period', 'Issuing party', 'Reference number'],
    hasValidity: true, noticeDays: 45, sensitivity: 'Standard', nominatedRoles: [], externallyVisible: true,
    extraction: true, extractionFields: ['Issuing party', 'Reference number', 'Valid to'],
    retentionYears: 7, retentionBasis: 'End of the trading relationship', maxMB: 10, permittedFormats: ['pdf', 'jpg', 'png'],
    responsibleRole: 'SOURCING_OFFICER', escalationRole: 'COMPLIANCE_OFFICER'
  },
  {
    name: 'Quality specification',
    requiredMetadata: ['Document date', 'Issuing party'],
    hasValidity: false, noticeDays: 0, sensitivity: 'Standard', nominatedRoles: [], externallyVisible: true,
    extraction: false, extractionFields: [],
    retentionYears: 5, retentionBasis: 'Supersession by a later specification', maxMB: 10, permittedFormats: ['pdf', 'docx'],
    responsibleRole: 'QUALITY_INSPECTOR', escalationRole: 'PROCESSING_SUPERVISOR'
  },
  {
    name: 'Fumigation certificate',
    requiredMetadata: ['Document date', 'Validity period', 'Issuing party', 'Reference number'],
    hasValidity: true, noticeDays: 30, sensitivity: 'Standard', nominatedRoles: [], externallyVisible: true,
    extraction: true, extractionFields: ['Issuing party', 'Reference number', 'Valid from', 'Valid to'],
    retentionYears: 3, retentionBasis: 'Expiry of the certificate', maxMB: 10, permittedFormats: ['pdf', 'jpg', 'png'],
    responsibleRole: 'QUALITY_INSPECTOR', escalationRole: 'PROCESSING_SUPERVISOR'
  },
  {
    name: 'Inspection report',
    requiredMetadata: ['Document date', 'Issuing party', 'Reference number'],
    hasValidity: false, noticeDays: 0, sensitivity: 'Standard', nominatedRoles: [], externallyVisible: true,
    extraction: false, extractionFields: [],
    retentionYears: 5, retentionBasis: 'Closure of the batch', maxMB: 10, permittedFormats: ['pdf', 'jpg', 'png'],
    responsibleRole: 'QUALITY_INSPECTOR', escalationRole: 'PROCESSING_SUPERVISOR'
  },
  {
    name: 'Commercial contract',
    requiredMetadata: ['Document date', 'Issuing party', 'Reference number'],
    hasValidity: false, noticeDays: 0, sensitivity: 'Sensitive',
    nominatedRoles: ['COUNTRY_MANAGER', 'COMPLIANCE_OFFICER', 'SYSTEM_ADMINISTRATOR'], externallyVisible: false,
    extraction: true, extractionFields: ['Counterparty', 'Reference number', 'Quantity', 'Price', 'Incoterm'],
    retentionYears: 10, retentionBasis: 'Completion of the contract', maxMB: 20, permittedFormats: ['pdf', 'docx'],
    responsibleRole: 'COUNTRY_MANAGER', escalationRole: 'COMPLIANCE_OFFICER'
  },
  {
    name: 'Pricing agreement',
    requiredMetadata: ['Document date', 'Validity period', 'Issuing party'],
    hasValidity: true, noticeDays: 30, sensitivity: 'Sensitive',
    nominatedRoles: ['COUNTRY_MANAGER', 'COMPLIANCE_OFFICER'], externallyVisible: false,
    extraction: false, extractionFields: [],
    retentionYears: 7, retentionBasis: 'Expiry of the agreement', maxMB: 10, permittedFormats: ['pdf', 'xlsx'],
    responsibleRole: 'COUNTRY_MANAGER', escalationRole: 'COMPLIANCE_OFFICER'
  },
  {
    name: 'Legal correspondence',
    requiredMetadata: ['Document date', 'Issuing party'],
    hasValidity: false, noticeDays: 0, sensitivity: 'Sensitive',
    nominatedRoles: ['COMPLIANCE_OFFICER', 'SYSTEM_ADMINISTRATOR'], externallyVisible: false,
    extraction: false, extractionFields: [],
    retentionYears: 10, retentionBasis: 'Closure of the matter', maxMB: 10, permittedFormats: ['pdf'],
    responsibleRole: 'COMPLIANCE_OFFICER', escalationRole: 'SYSTEM_ADMINISTRATOR'
  },
  {
    name: 'Insurance policy',
    requiredMetadata: ['Document date', 'Validity period', 'Issuing party', 'Reference number'],
    hasValidity: true, noticeDays: 45, sensitivity: 'Standard', nominatedRoles: [], externallyVisible: false,
    extraction: true, extractionFields: ['Issuing party', 'Reference number', 'Valid from', 'Valid to', 'Sum insured'],
    retentionYears: 7, retentionBasis: 'Expiry of the policy', maxMB: 10, permittedFormats: ['pdf'],
    responsibleRole: 'COMPLIANCE_OFFICER', escalationRole: 'COUNTRY_MANAGER'
  },
  {
    name: 'Line manager approval',
    requiredMetadata: ['Document date', 'Issuing party'],
    hasValidity: false, noticeDays: 0, sensitivity: 'Standard', nominatedRoles: [], externallyVisible: false,
    extraction: false, extractionFields: [],
    retentionYears: 3, retentionBasis: 'Deactivation of the account', maxMB: 5, permittedFormats: ['pdf', 'png', 'jpg'],
    responsibleRole: 'SYSTEM_ADMINISTRATOR', escalationRole: 'COMPLIANCE_OFFICER'
  },
  {
    name: 'Identity document',
    requiredMetadata: ['Document date', 'Validity period', 'Reference number'],
    hasValidity: true, noticeDays: 60, sensitivity: 'Sensitive',
    nominatedRoles: ['SYSTEM_ADMINISTRATOR'], externallyVisible: false,
    extraction: false, extractionFields: [],
    retentionYears: 3, retentionBasis: 'Deactivation of the account', maxMB: 5, permittedFormats: ['pdf', 'jpg', 'png'],
    responsibleRole: 'SYSTEM_ADMINISTRATOR', escalationRole: 'COMPLIANCE_OFFICER'
  },
  {
    name: 'Container inspection photograph',
    requiredMetadata: ['Document date'],
    hasValidity: false, noticeDays: 0, sensitivity: 'Standard', nominatedRoles: [], externallyVisible: true,
    extraction: false, extractionFields: [],
    retentionYears: 2, retentionBasis: 'Closure of the shipment', maxMB: 10, permittedFormats: ['jpg', 'jpeg', 'png'],
    responsibleRole: 'EXECUTION_OFFICER', escalationRole: 'COUNTRY_MANAGER'
  },
  {
    name: 'Signed delivery note',
    requiredMetadata: ['Document date', 'Reference number'],
    hasValidity: false, noticeDays: 0, sensitivity: 'Standard', nominatedRoles: [], externallyVisible: true,
    extraction: true, extractionFields: ['Reference number', 'Quantity delivered', 'Received by'],
    retentionYears: 5, retentionBasis: 'Closure of the shipment', maxMB: 10, permittedFormats: ['jpg', 'jpeg', 'png', 'pdf'],
    responsibleRole: 'EXECUTION_OFFICER', escalationRole: 'COUNTRY_MANAGER'
  }
];

/* ------------------------------------------------------------------ *
 * WF-C7-01 / Step 8 — the checklist per record type and process step
 * ------------------------------------------------------------------ */

export interface ChecklistDef {
  objectType: string;
  step: string;
  mandatory: string[];
  /** the action the record cannot complete while a mandatory document is outstanding */
  blocks: string;
}

export const CHECKLISTS: ChecklistDef[] = [
  { objectType: 'Access request', step: 'Submission for approval', mandatory: ['Line manager approval'], blocks: 'Submit for approval' },
  { objectType: 'Master data — Supplier', step: 'Submission for approval', mandatory: ['Company registration'], blocks: 'Submit for approval' },
  { objectType: 'Master data — Warehouse', step: 'Submission for approval', mandatory: ['Rental agreement'], blocks: 'Submit for approval' },
  { objectType: 'Master data — Commodity', step: 'Submission for approval', mandatory: ['Quality specification'], blocks: 'Submit for approval' },
  { objectType: 'Non-conformity', step: 'Resolution approval', mandatory: ['Inspection report'], blocks: 'Submit the resolution' },
  { objectType: 'Insurance claim', step: 'Claim submission', mandatory: ['Insurance policy', 'Inspection report'], blocks: 'Submit the claim' }
];

/* ------------------------------------------------------------------ *
 * Documents — WF-C7-01 / Step 6 and WF-C7-03
 * ------------------------------------------------------------------ */

export interface AccessEntry {
  at: string;
  who: string;
  role: string;
  action: 'Opened' | 'Downloaded' | 'Exported' | 'Open refused';
}

export interface Doc7 {
  id: string;
  /** WF-C7-01 / Step 6 — the unique system reference */
  systemRef: string;
  name: string;
  docType: string;
  recordKey: string;
  recordName: string;
  objectType: string;
  route?: string;
  country: string;
  module: string;
  documentDate: string;
  validFrom?: string;
  validTo?: string;
  issuingParty?: string;
  referenceNumber?: string;
  uploadedBy: string;
  uploadedAt: string;
  version: number;
  sizeMB: number;
  format: string;
  status: DocStatus;
  extractionUsed?: boolean;
  /** where the document came from a comment attachment — C6 / WF-C6-01 / Step 6 */
  fromComment?: boolean;
  archivedAt?: string;
  purgedAt?: string;
  deletedReason?: string;
  accessLog: AccessEntry[];
}

const d = (
  id: string, systemRef: string, name: string, docType: string,
  recordKey: string, recordName: string, objectType: string, country: string, module: string,
  uploadedBy: string, uploadedAt: string, version: number, status: DocStatus,
  extra: Partial<Doc7> = {}
): Doc7 => ({
  id, systemRef, name, docType, recordKey, recordName, objectType, country, module,
  documentDate: uploadedAt.slice(0, 10), uploadedBy, uploadedAt, version,
  sizeMB: 1.2, format: name.split('.').pop() ?? 'pdf', status, accessLog: [], ...extra
});

export const seedDocuments: Doc7[] = [
  /* --- an access request: the mandated line manager approval --- */
  d('DOC-1', 'DOC-2026-000141-01', 'line-manager-approval-omar-bashir.pdf', 'Line manager approval',
    'AR-000141', 'AR-000141 Omar Bashir', 'Access request', 'Sudan', 'C1 Identity and Access',
    'Nasreen Sayed', '2026-08-14 09:08', 1, 'Current',
    { route: '/c1/access-requests/AR-000141', issuingParty: 'Sourcing, Gedaref', sizeMB: 0.4 }),

  /* --- a warehouse: a versioned rental agreement and an expiring fumigation certificate --- */
  d('DOC-2', 'DOC-2026-WH0142-01', 'portsudan-wh3-lease-2025.pdf', 'Rental agreement',
    'WH-0142', 'WH-0142 Port Sudan Warehouse 3', 'Master data — Warehouse', 'Sudan', 'C3 Master Data',
    'Ahmed Osman', '2025-06-02 10:15', 1, 'Superseded',
    {
      route: '/c3/records/MD-1', issuingParty: 'Port Sudan Port Authority', referenceNumber: 'PSA-L-2025-114',
      validFrom: '2025-07-01', validTo: '2026-06-30', sizeMB: 2.1, extractionUsed: true
    }),
  d('DOC-3', 'DOC-2026-WH0142-02', 'kassala-lease-addendum.pdf', 'Rental agreement',
    'WH-0142', 'WH-0142 Port Sudan Warehouse 3', 'Master data — Warehouse', 'Sudan', 'C3 Master Data',
    'Ahmed Osman', '2026-08-12 08:28', 2, 'Current',
    {
      route: '/c3/records/MD-1', issuingParty: 'Port Sudan Port Authority', referenceNumber: 'PSA-L-2026-233',
      validFrom: '2026-07-01', validTo: '2027-06-30', sizeMB: 2.4, extractionUsed: true, fromComment: true
    }),
  d('DOC-4', 'DOC-2026-WH0142-03', 'fumigation-certificate-june.pdf', 'Fumigation certificate',
    'WH-0142', 'WH-0142 Port Sudan Warehouse 3', 'Master data — Warehouse', 'Sudan', 'C3 Master Data',
    'Yusuf Kamal', '2026-06-02 10:15', 1, 'Current',
    {
      route: '/c3/records/MD-1', issuingParty: 'Sudan Fumigation Services', referenceNumber: 'SFS-26-0771',
      validFrom: '2026-06-01', validTo: '2026-08-31', sizeMB: 0.9, extractionUsed: true
    }),
  d('DOC-5', 'DOC-2026-WH0142-04', 'warehouse-insurance-2026.pdf', 'Insurance policy',
    'WH-0142', 'WH-0142 Port Sudan Warehouse 3', 'Master data — Warehouse', 'Sudan', 'C3 Master Data',
    'Fatima Idris', '2026-01-04 09:00', 1, 'Current',
    {
      route: '/c3/records/MD-1', issuingParty: 'Gulf Insurance', referenceNumber: 'GRP-MARINE-2026/114',
      validFrom: '2026-01-01', validTo: '2026-12-31', sizeMB: 1.6
    }),

  /* --- a supplier: registration lapsed, and a sensitive commercial contract --- */
  d('DOC-6', 'DOC-2026-SUP4821-01', 'agrotem-registration.pdf', 'Company registration',
    'SUP-004821', 'SUP-004821 Agrotem Trading LLC', 'Master data — Supplier', 'Sudan', 'C3 Master Data',
    'Nasreen Sayed', '2025-07-01 11:00', 1, 'Current',
    {
      route: '/c3/records/MD-3', issuingParty: 'Sudan Chamber of Commerce', referenceNumber: 'SCC-2025-88421',
      validFrom: '2025-07-01', validTo: '2026-08-10', sizeMB: 0.7, extractionUsed: true
    }),
  d('DOC-7', 'DOC-2026-SUP4821-02', 'agrotem-supply-contract-2026.pdf', 'Commercial contract',
    'SUP-004821', 'SUP-004821 Agrotem Trading LLC', 'Master data — Supplier', 'Sudan', 'C3 Master Data',
    'Grace Mensah', '2026-03-14 15:20', 1, 'Current',
    {
      route: '/c3/records/MD-3', issuingParty: 'Dal Group', referenceNumber: 'P30000718-1', sizeMB: 3.2,
      extractionUsed: true,
      accessLog: [
        { at: '2026-08-04 09:12', who: 'Fatima Idris', role: 'COMPLIANCE_OFFICER', action: 'Opened' },
        { at: '2026-07-22 14:40', who: 'Ahmed Osman', role: 'SOURCING_OFFICER', action: 'Open refused' }
      ]
    }),
  d('DOC-8', 'DOC-2026-SUP4821-03', 'agrotem-pricing-2026.xlsx', 'Pricing agreement',
    'SUP-004821', 'SUP-004821 Agrotem Trading LLC', 'Master data — Supplier', 'Sudan', 'C3 Master Data',
    'Grace Mensah', '2026-03-14 15:35', 1, 'Current',
    {
      route: '/c3/records/MD-3', issuingParty: 'Dal Group', validFrom: '2026-04-01', validTo: '2026-09-15', sizeMB: 0.3
    }),

  /* --- a commodity: quality specification, no validity period --- */
  d('DOC-9', 'DOC-2026-CMD0007-01', 'sesame-hulled-white-spec-v3.pdf', 'Quality specification',
    'CMD-0007', 'CMD-0007 Sesame — Hulled White', 'Master data — Commodity', 'Sudan', 'C3 Master Data',
    'Yusuf Kamal', '2026-08-12 09:10', 3, 'Current',
    { route: '/c3/records/MD-5', issuingParty: 'Group Sourcing', sizeMB: 0.8 }),
  d('DOC-10', 'DOC-2025-CMD0007-01', 'sesame-hulled-white-spec-v2.pdf', 'Quality specification',
    'CMD-0007', 'CMD-0007 Sesame — Hulled White', 'Master data — Commodity', 'Sudan', 'C3 Master Data',
    'Yusuf Kamal', '2025-04-18 08:40', 2, 'Superseded',
    { route: '/c3/records/MD-5', issuingParty: 'Group Sourcing', sizeMB: 0.8 }),

  /* --- exception records: inspection report, claim documents --- */
  d('DOC-11', 'DOC-2026-NC0118-01', 'lab-report-0442.pdf', 'Inspection report',
    'NC-26-0118', 'NC-26-0118 Batch 26/SES/GDF/0442 — moisture out of specification', 'Non-conformity',
    'Sudan', 'Quality', 'Yusuf Kamal', '2026-08-17 15:08', 1, 'Current',
    { issuingParty: 'Port Sudan Quality Laboratory', referenceNumber: 'LAB-26-4471', sizeMB: 1.1, fromComment: true }),
  d('DOC-12', 'DOC-2026-CL0009-01', 'damage-photos-portsudan.zip', 'Container inspection photograph',
    'CL-26-0009', 'CL-26-0009 Water damage on 60 bags', 'Insurance claim', 'Sudan', 'Execution',
    'Meseret Alemu', '2026-08-10 11:18', 1, 'Current',
    { sizeMB: 8.4, format: 'jpg', fromComment: true }),
  d('DOC-13', 'DOC-2026-CL0009-02', 'surveyor-appointment.pdf', 'Legal correspondence',
    'CL-26-0009', 'CL-26-0009 Water damage on 60 bags', 'Insurance claim', 'Sudan', 'Execution',
    'Fatima Idris', '2026-08-12 09:00', 1, 'Current',
    { issuingParty: 'Marine Surveyors Sudan', sizeMB: 0.5 }),

  /* --- archived, and purged under retention with the metadata retained --- */
  d('DOC-14', 'DOC-2021-WH0142-01', 'portsudan-wh3-lease-2019.pdf', 'Rental agreement',
    'WH-0142', 'WH-0142 Port Sudan Warehouse 3', 'Master data — Warehouse', 'Sudan', 'C3 Master Data',
    'Ahmed Osman', '2019-05-20 10:00', 0, 'Archived',
    {
      route: '/c3/records/MD-1', issuingParty: 'Port Sudan Port Authority', referenceNumber: 'PSA-L-2019-041',
      validFrom: '2019-07-01', validTo: '2025-06-30', sizeMB: 1.9, archivedAt: '2025-07-02 02:00'
    }),
  d('DOC-15', 'DOC-2018-SUP4821-01', 'agrotem-registration-2018.pdf', 'Company registration',
    'SUP-004821', 'SUP-004821 Agrotem Trading LLC', 'Master data — Supplier', 'Sudan', 'C3 Master Data',
    'Nasreen Sayed', '2018-06-11 12:00', 0, 'Metadata only',
    {
      route: '/c3/records/MD-3', issuingParty: 'Sudan Chamber of Commerce', referenceNumber: 'SCC-2018-11902',
      validFrom: '2018-07-01', validTo: '2019-06-30', sizeMB: 0.6,
      purgedAt: '2026-07-01 02:00'
    })
];

/* ------------------------------------------------------------------ *
 * WF-C7-03 / Step 4 — operations blocked by an expired document
 * ------------------------------------------------------------------ */

export interface BlockedOperation {
  docType: string;
  recordKey: string;
  operation: string;
  why: string;
  renewRoute?: string;
}

export const BLOCKED_OPERATIONS: BlockedOperation[] = [
  {
    docType: 'Fumigation certificate', recordKey: 'WH-0142',
    operation: 'Record a commodity intake at Port Sudan Warehouse 3',
    why: 'An intake cannot be recorded against a warehouse whose fumigation certificate has expired, because the treated status of the store cannot be evidenced.',
    renewRoute: '/c3/records/MD-1'
  },
  {
    docType: 'Company registration', recordKey: 'SUP-004821',
    operation: 'Raise a new purchase contract with Agrotem Trading LLC',
    why: 'A supplier whose registration has lapsed cannot be contracted with until a current registration is on file.',
    renewRoute: '/c3/records/MD-3'
  },
  {
    docType: 'Pricing agreement', recordKey: 'SUP-004821',
    operation: 'Apply the agreed price list to a new purchase contract',
    why: 'Prices cannot be taken from an expired pricing agreement; the contract must be priced explicitly or the agreement renewed.',
    renewRoute: '/c3/records/MD-3'
  }
];

/** WF-C7-01 / Step 5 — proposed values, with the confidence the service reports */
export const EXTRACTION_SAMPLES: Record<string, { field: string; value: string; confidence: number }[]> = {
  'Rental agreement': [
    { field: 'Issuing party', value: 'Port Sudan Port Authority', confidence: 0.96 },
    { field: 'Valid from', value: '2026-09-01', confidence: 0.93 },
    { field: 'Valid to', value: '2027-08-31', confidence: 0.91 },
    { field: 'Reference number', value: 'PSA-L-2026-318', confidence: 0.88 },
    { field: 'Monthly rent', value: 'USD 9,200', confidence: 0.72 }
  ],
  'Company registration': [
    { field: 'Issuing party', value: 'Sudan Chamber of Commerce', confidence: 0.94 },
    { field: 'Reference number', value: 'SCC-2026-90114', confidence: 0.9 },
    { field: 'Valid to', value: '2027-08-31', confidence: 0.86 }
  ],
  'Fumigation certificate': [
    { field: 'Issuing party', value: 'Sudan Fumigation Services', confidence: 0.95 },
    { field: 'Reference number', value: 'SFS-26-0912', confidence: 0.89 },
    { field: 'Valid from', value: '2026-09-01', confidence: 0.92 },
    { field: 'Valid to', value: '2026-11-30', confidence: 0.9 }
  ],
  'Commercial contract': [
    { field: 'Counterparty', value: 'Agrotem Trading LLC', confidence: 0.93 },
    { field: 'Reference number', value: 'P30000902-1', confidence: 0.87 },
    { field: 'Quantity', value: '500 MT', confidence: 0.84 },
    { field: 'Price', value: 'USD 1,420 per MT', confidence: 0.68 },
    { field: 'Incoterm', value: 'FOB Port Sudan', confidence: 0.79 }
  ],
  'Insurance policy': [
    { field: 'Issuing party', value: 'Gulf Insurance', confidence: 0.95 },
    { field: 'Reference number', value: 'GRP-MARINE-2027/002', confidence: 0.88 },
    { field: 'Valid from', value: '2027-01-01', confidence: 0.94 },
    { field: 'Valid to', value: '2027-12-31', confidence: 0.94 },
    { field: 'Sum insured', value: 'USD 1,250,000', confidence: 0.7 }
  ],
  'Signed delivery note': [
    { field: 'Reference number', value: 'DN-26-11842', confidence: 0.9 },
    { field: 'Quantity delivered', value: '31.4 MT', confidence: 0.81 },
    { field: 'Received by', value: 'Gedaref store keeper', confidence: 0.64 }
  ]
};

/** The reference date the prototype measures validity against */
export const TODAY = '2026-08-18';

export function docType(name: string): DocTypeDef | undefined {
  return DOC_TYPES.find((t) => t.name === name);
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

export function validityState(doc: Doc7): ValidityState {
  if (!doc.validTo) return 'No validity period';
  const left = daysBetween(TODAY, doc.validTo);
  if (left < 0) return 'Expired';
  const notice = docType(doc.docType)?.noticeDays ?? 30;
  return left <= notice ? 'Approaching expiry' : 'Valid';
}
