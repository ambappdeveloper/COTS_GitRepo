/**
 * C3 Master Data Management — mock data.
 * Static only. Every field traces to a step in COTS_C3_Workflows.
 */

export type MasterStatus = 'Draft' | 'Pending Approval' | 'Active' | 'Inactive' | 'Rejected' | 'Returned for Amendment';

export interface DomainDef {
  key: string;
  name: string;
  group: string;
  scope: 'Global' | 'Country';
  /** WF-C3-01 / Step 7 — governed domains require approval; low-risk lists activate immediately */
  governed: boolean;
  owner: string;
  /** WF-C3-01 / Step 2 — automatic formula, or manual validated against a pattern */
  coding: { mode: 'Generated'; formula: string } | { mode: 'Manual'; pattern: string; hint: string };
  /** WF-C3-02 / Step 2 — effective dating on or off per attribute */
  effectiveDated: boolean;
  /** WF-C3-01 / Step 4 */
  duplicateKeys: string[];
  mandatoryDocs: string[];
  /** domains whose attribute set the prototype models in full */
  modelled?: boolean;
}

export const DOMAINS: DomainDef[] = [
  { key: 'country', name: 'Country', group: 'Geography', scope: 'Global', governed: false, owner: 'Group Administration', coding: { mode: 'Manual', pattern: '^[A-Z]{2}$', hint: 'Two-letter ISO code' }, effectiveDated: false, duplicateKeys: ['Code', 'Name'], mandatoryDocs: [] },
  { key: 'city', name: 'City', group: 'Geography', scope: 'Global', governed: false, owner: 'Group Administration', coding: { mode: 'Manual', pattern: '^CTY-[0-9]{4}$', hint: 'CTY-0000' }, effectiveDated: false, duplicateKeys: ['Code', 'Name'], mandatoryDocs: [] },
  { key: 'port', name: 'Port', group: 'Geography', scope: 'Global', governed: false, owner: 'Group Administration', coding: { mode: 'Manual', pattern: '^PRT-[0-9]{4}$', hint: 'PRT-0000' }, effectiveDated: false, duplicateKeys: ['Code', 'Name'], mandatoryDocs: [] },
  { key: 'costcentre', name: 'Cost centre', group: 'Organisation', scope: 'Country', governed: false, owner: 'Country Finance', coding: { mode: 'Manual', pattern: '^CC-[0-9]{4}$', hint: 'CC-0000' }, effectiveDated: false, duplicateKeys: ['Code'], mandatoryDocs: [] },
  { key: 'oparea', name: 'Operational area', group: 'Organisation', scope: 'Country', governed: false, owner: 'Country Manager', coding: { mode: 'Manual', pattern: '^OA-[0-9]{3}$', hint: 'OA-000' }, effectiveDated: false, duplicateKeys: ['Code', 'Name'], mandatoryDocs: [] },
  { key: 'commodity', name: 'Commodity', group: 'Commodity', scope: 'Global', governed: true, owner: 'Group Sourcing', coding: { mode: 'Generated', formula: 'CMD-<sequence 4>' }, effectiveDated: false, duplicateKeys: ['Code', 'Name'], mandatoryDocs: ['Quality specification'], modelled: true },
  { key: 'grade', name: 'Grade', group: 'Commodity', scope: 'Global', governed: true, owner: 'Group Quality', coding: { mode: 'Manual', pattern: '^GRD-[0-9]{3}$', hint: 'GRD-000' }, effectiveDated: false, duplicateKeys: ['Code', 'Name'], mandatoryDocs: [] },
  { key: 'warehouse', name: 'Warehouse', group: 'Facilities', scope: 'Country', governed: true, owner: 'Country Manager', coding: { mode: 'Generated', formula: 'WH-<sequence 4>' }, effectiveDated: false, duplicateKeys: ['Code', 'Name'], mandatoryDocs: [], modelled: true },
  { key: 'facility', name: 'Processing facility', group: 'Facilities', scope: 'Country', governed: true, owner: 'Country Manager', coding: { mode: 'Generated', formula: 'FAC-<sequence 4>' }, effectiveDated: false, duplicateKeys: ['Code', 'Name'], mandatoryDocs: ['Service agreement'] },
  { key: 'supplier', name: 'Supplier', group: 'Parties', scope: 'Country', governed: true, owner: 'Country Sourcing', coding: { mode: 'Generated', formula: 'SUP-<sequence 6>' }, effectiveDated: false, duplicateKeys: ['Code', 'Name', 'Registration or tax identifier'], mandatoryDocs: ['Company registration'], modelled: true },
  { key: 'buyer', name: 'Buyer', group: 'Parties', scope: 'Country', governed: true, owner: 'Country Commercial', coding: { mode: 'Generated', formula: 'CUS-<sequence 6>' }, effectiveDated: false, duplicateKeys: ['Code', 'Name', 'Registration or tax identifier'], mandatoryDocs: ['Company registration'] },
  { key: 'transporter', name: 'Transporter', group: 'Parties', scope: 'Country', governed: true, owner: 'Country Logistics', coding: { mode: 'Generated', formula: 'TRP-<sequence 6>' }, effectiveDated: false, duplicateKeys: ['Code', 'Name', 'Registration or tax identifier'], mandatoryDocs: ['Service agreement'] },
  { key: 'currency', name: 'Currency', group: 'Financial', scope: 'Global', governed: false, owner: 'Group Finance', coding: { mode: 'Manual', pattern: '^[A-Z]{3}$', hint: 'Three-letter ISO code' }, effectiveDated: false, duplicateKeys: ['Code'], mandatoryDocs: [] },
  { key: 'fxrate', name: 'Exchange rate', group: 'Financial', scope: 'Global', governed: true, owner: 'Group Finance', coding: { mode: 'Generated', formula: 'FX-<from><to>-<sequence 3>' }, effectiveDated: true, duplicateKeys: ['Code'], mandatoryDocs: [], modelled: true },
  { key: 'incoterm', name: 'Incoterm', group: 'Financial', scope: 'Global', governed: false, owner: 'Group Commercial', coding: { mode: 'Manual', pattern: '^[A-Z]{3}$', hint: 'Three-letter incoterm' }, effectiveDated: false, duplicateKeys: ['Code'], mandatoryDocs: [] },
  /* Payment instrument and payment term — added 8 September 2026.
     Placed beside `incoterm` because that is what they are: the other half of the commercial
     terms on a contract. The instrument is a five-item closed list and activates immediately;
     the term is governed, because the bank submittal maturity date derives from its tenor and
     an unapproved tenor would move a payment date. See the note above `paymentMasterRecords`. */
  { key: 'paymentinstrument', name: 'Payment instrument', group: 'Financial', scope: 'Global', governed: false, owner: 'Group Commercial', coding: { mode: 'Manual', pattern: '^[A-Z]{2,3}$', hint: 'Short form, e.g. DA' }, effectiveDated: false, duplicateKeys: ['Code', 'Name'], mandatoryDocs: [], modelled: true },
  { key: 'paymentterm', name: 'Payment term', group: 'Financial', scope: 'Global', governed: true, owner: 'Group Commercial', coding: { mode: 'Manual', pattern: '^PT-[0-9]{3}$', hint: 'PT-000' }, effectiveDated: false, duplicateKeys: ['Code', 'Name'], mandatoryDocs: [], modelled: true },
  { key: 'freightrate', name: 'Freight rate', group: 'Financial', scope: 'Country', governed: true, owner: 'Country Logistics', coding: { mode: 'Generated', formula: 'FR-<sequence 5>' }, effectiveDated: true, duplicateKeys: ['Code'], mandatoryDocs: [] },
  { key: 'uom', name: 'Unit of measure', group: 'Operational', scope: 'Global', governed: false, owner: 'Group Administration', coding: { mode: 'Manual', pattern: '^[A-Z]{1,4}$', hint: 'Short code, e.g. MT' }, effectiveDated: false, duplicateKeys: ['Code'], mandatoryDocs: [] },
  { key: 'season', name: 'Season definition', group: 'Operational', scope: 'Country', governed: true, owner: 'Country Manager', coding: { mode: 'Manual', pattern: '^[0-9]{2}/[0-9]{2}$', hint: 'e.g. 25/26' }, effectiveDated: false, duplicateKeys: ['Code'], mandatoryDocs: [] },
  { key: 'batchformula', name: 'Batch code formula', group: 'Operational', scope: 'Country', governed: true, owner: 'Country Processing', coding: { mode: 'Manual', pattern: '^BF-[0-9]{3}$', hint: 'BF-000' }, effectiveDated: false, duplicateKeys: ['Code'], mandatoryDocs: [] },
  { key: 'doctype', name: 'Document type', group: 'Operational', scope: 'Country', governed: false, owner: 'Country Administration', coding: { mode: 'Manual', pattern: '^DT-[0-9]{3}$', hint: 'DT-000' }, effectiveDated: false, duplicateKeys: ['Code', 'Name'], mandatoryDocs: [] },
  { key: 'numbering', name: 'Numbering series', group: 'Operational', scope: 'Country', governed: true, owner: 'Country Administration', coding: { mode: 'Manual', pattern: '^NS-[0-9]{3}$', hint: 'NS-000' }, effectiveDated: false, duplicateKeys: ['Code'], mandatoryDocs: [] },
  { key: 'notiftemplate', name: 'Notification template', group: 'System reference', scope: 'Global', governed: true, owner: 'IT', coding: { mode: 'Manual', pattern: '^NT-[0-9]{3}$', hint: 'NT-000' }, effectiveDated: false, duplicateKeys: ['Code'], mandatoryDocs: [] },
  { key: 'reasoncode', name: 'Reason code', group: 'Operational', scope: 'Country', governed: false, owner: 'Country Administration', coding: { mode: 'Manual', pattern: '^RC-[0-9]{3}$', hint: 'RC-000' }, effectiveDated: false, duplicateKeys: ['Code'], mandatoryDocs: [] }
];

export interface MasterVersion {
  version: number;
  status: 'Current' | 'Superseded' | 'Future';
  validFrom: string;
  validTo?: string;
  changed: string;
  reason: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface Dependency { kind: string; ref: string; detail: string; status: string }

export interface MasterRecord {
  id: string;
  domain: string;
  code: string;
  name: string;
  status: MasterStatus;
  country?: string;
  owner: string;
  /** domain attributes as label → value, so one form renders every domain */
  attrs: Record<string, string>;
  versions: MasterVersion[];
  documents: { id: string; name: string; docType: string; version: number; uploadedBy: string; uploadedAt: string; validTo?: string; sensitive?: boolean }[];
  dependencies: Dependency[];
  lastChanged: string;
  changedBy: string;
  currentStep: number;
  steps: { seq: number; role: string; type: 'Sequential' | 'Parallel'; approver: string; sla: string; decision?: 'Approved' | 'Rejected' | 'Returned for Amendment'; comment?: string; at?: string }[];
  comments: { id: string; author: string; role: string; country: string; at: string; text: string; visibility: 'Internal only' | 'Visible to external parties'; isDecision?: boolean }[];
  /** amendment awaiting approval — WF-C3-02 / Steps 1–4 */
  pendingAmendment?: { patch: Record<string, string>; effectiveFrom?: string; reason: string; critical: boolean };
}

const route = (extra?: boolean) => extra
  ? [
      { seq: 1, role: 'COUNTRY_MANAGER', type: 'Sequential' as const, approver: 'Grace Mensah', sla: '2 working days' },
      { seq: 2, role: 'COMPLIANCE_OFFICER', type: 'Sequential' as const, approver: 'Fatima Idris', sla: '2 working days' }
    ]
  : [{ seq: 1, role: 'COUNTRY_MANAGER', type: 'Sequential' as const, approver: 'Grace Mensah', sla: '2 working days' }];

/* ================================================================== *
 * Payment instruments and payment terms — added 8 September 2026
 *
 * "All payment terms should be a dropdown list, come from master data."
 *
 * The Export prototype asked for payment terms as free text on three screens, and on
 * 8 September was changed to read a list. The list was first held inside Export itself,
 * which is where the five masters added on 6 September also sit — packing sizes, B/L
 * consignees, commodity types, bank branches and container types, each carrying an open
 * question reading *"which governed domain in C03 does this belong to"*. That question is
 * answered here for payment terms: this domain browser already says, in its own banner,
 * that **nothing is entered as free text anywhere in COTS where a master record exists**,
 * and a list living inside one module is a second copy rather than a master.
 *
 * WHY TWO DOMAINS. A term is an instrument plus a tenor, and the two are read at different
 * levels: a purchase contract carries the whole term, because the bank submittal maturity
 * date is computed from its tenor, while an export contract carries the instrument alone.
 * Modelled as a parent list and a child list, which is the shape `commodity` and `grade`
 * already use — not as one flat list, which would force every reader to parse a string.
 *
 * GOVERNANCE. The instrument list activates immediately: five closed values, no risk in
 * adding one. The term is governed, because its tenor moves a payment date — the same
 * argument that makes `fxrate` governed and `currency` not.
 *
 * WHAT IS REAL. Six term names are verbatim from captured Export contracts and are marked;
 * the remaining tenors are invented, as everywhere in these prototypes. All five instruments
 * are verbatim. The `dependencies` on the six show which contract carries each, which is what
 * a real C03 record would show before anyone tried to deactivate one.
 *
 * [OPEN] The owner. Payment terms are arguably a treasury matter rather than a commercial
 * one, and no source names an owner for either domain. `Group Commercial` is shown because it
 * is what `incoterm` carries, and the domain browser already states that the owners are
 * placeholders.
 *
 * [OPEN] Two attribute-level lists elsewhere in C03 now shadow this domain and should be
 * re-pointed at it: `supplier` carries a *Payment terms* select with four options of its own,
 * and `warehouse` carries a *Payment terms* free-text attribute. Neither is changed here —
 * re-pointing an attribute at a domain is a modelling decision for the business, not a
 * side-effect of adding the domain.
 * ================================================================== */

const paymentVersion = (reason: string) => [
  { version: 1, status: 'Current' as const, validFrom: '2024-01-01', changed: 'Initial creation', reason, approvedBy: '—', approvedAt: '2024-01-01 00:00' }
];

const instrument = (code: string, name: string, description: string, seq: number): MasterRecord => ({
  id: `MD-PI-${seq}`, domain: 'paymentinstrument', code, name, status: 'Active',
  owner: 'Group Commercial',
  attrs: { Description: description },
  versions: paymentVersion('Standard payment instrument list'),
  documents: [], dependencies: [],
  lastChanged: '2024-01-01 00:00', changedBy: 'System', currentStep: 1, steps: [], comments: []
});

const term = (seq: number, name: string, instrumentCode: string, tenorDays: number, carriedBy?: string): MasterRecord => ({
  id: `MD-PT-${seq}`, domain: 'paymentterm', code: `PT-${String(seq).padStart(3, '0')}`, name, status: 'Active',
  owner: 'Group Commercial',
  attrs: {
    Instrument: instrumentCode,
    'Tenor (days from B/L date)': String(tenorDays),
    'Payable at sight': tenorDays === 0 ? 'Yes' : 'No'
  },
  versions: paymentVersion(carriedBy ? `Captured on ${carriedBy}` : 'Standard tenor for the instrument'),
  documents: [],
  dependencies: carriedBy
    ? [{ kind: 'Purchase contract', ref: carriedBy, detail: `Payment terms ${name}`, status: 'Confirmed' }]
    : [],
  lastChanged: '2024-01-01 00:00', changedBy: 'System', currentStep: 1, steps: [], comments: []
});

/**
 * The sixteen records the two payment domains hold. Kept in one place rather than scattered
 * through `seedMasterRecords`, because they are one addition and read as one.
 */
export const paymentMasterRecords: MasterRecord[] = [
  instrument('LC', 'Letter of credit', 'Payment undertaken by the buyer’s bank against compliant documents', 1),
  instrument('DA', 'Documents against acceptance', 'Documents released against the buyer’s acceptance of a term draft', 2),
  instrument('DP', 'Documents against payment', 'Documents released only against payment', 3),
  instrument('CAD', 'Cash against documents', 'Payment on presentation of the shipping documents', 4),
  instrument('TT', 'Telegraphic transfer', 'Direct bank transfer, in advance or on terms', 5),

  term(1, 'LC at sight', 'LC', 0, 'PC-2044'),
  term(2, 'LC 60 days', 'LC', 60),
  term(3, 'LC 90 days', 'LC', 90, 'PC-2058-LV'),
  term(4, 'DA 30 days', 'DA', 30),
  term(5, 'DA 60 days', 'DA', 60, 'PC-2041'),
  term(6, 'DA 90 days', 'DA', 90),
  term(7, 'DP', 'DP', 0, 'PC-2055'),
  term(8, 'DP 30 days', 'DP', 30),
  term(9, 'CAD', 'CAD', 0, 'PC-2049'),
  term(10, 'TT in advance', 'TT', 0),
  term(11, 'TT 30 days', 'TT', 30, 'PC-2052')
];

export const seedMasterRecords: MasterRecord[] = [
  {
    id: 'MD-1', domain: 'warehouse', code: 'WH-0142', name: 'Port Sudan Warehouse 3', status: 'Active', country: 'Sudan',
    owner: 'Ahmed Osman',
    attrs: {
      City: 'Port Sudan', Location: 'Free zone, gate 4', GPS: '19.6158, 37.2164',
      'Capacity m²': '6400', 'Capacity MT': '9000', 'Owned or rented': 'Rented',
      'Default product category': 'Oilseeds',
      'Rental start': '2026-07-01', 'Rental end': '2027-06-30', 'Payment terms': 'Monthly in arrears',
      Currency: 'USD', 'Rental amount': '18,500', 'Contact name': 'Osman Hamid', 'Contact email': 'osman.hamid@portsudanfz.example'
    },
    versions: [
      { version: 1, status: 'Superseded', validFrom: '2025-07-01', validTo: '2026-08-14', changed: 'Capacity MT 8,500', reason: 'Initial creation', approvedBy: 'Grace Mensah', approvedAt: '2025-06-28 10:12' },
      { version: 2, status: 'Current', validFrom: '2026-08-15', changed: 'Capacity MT 9,000', reason: 'Re-measured after the mezzanine was removed', approvedBy: 'Grace Mensah', approvedAt: '2026-08-15 14:40' }
    ],
    documents: [{ id: 'MD1-D1', name: 'Rental agreement 2026-27.pdf', docType: 'Rental agreement', version: 1, uploadedBy: 'Ahmed Osman', uploadedAt: '2026-06-20 09:14', validTo: '2027-06-30' }],
    dependencies: [
      { kind: 'Stock lot', ref: 'CF7003166', detail: '2,000 units allocated', status: 'Allocated' },
      { kind: 'Open receipt', ref: 'GRN-26-0881', detail: '118 MT expected', status: 'Open' }
    ],
    lastChanged: '2026-08-15 14:40', changedBy: 'Ahmed Osman', currentStep: 1, steps: route(),
    comments: [{ id: 'MD1-C1', author: 'Grace Mensah', role: 'COUNTRY_MANAGER', country: 'Sudan', at: '2026-08-15 14:40', text: 'Capacity change approved against the surveyor report.', visibility: 'Internal only', isDecision: true }]
  },
  {
    id: 'MD-2', domain: 'warehouse', code: 'WH-0157', name: 'Gedaref Transit Store', status: 'Draft', country: 'Sudan',
    owner: 'Salma Bakri',
    attrs: { City: 'Gedaref', Location: 'Silo road', 'Capacity m²': '1200', 'Capacity MT': '1800', 'Owned or rented': 'Owned', 'Default product category': 'Oilseeds' },
    versions: [], documents: [], dependencies: [],
    lastChanged: '2026-08-17 11:05', changedBy: 'Salma Bakri', currentStep: 0, steps: route(), comments: []
  },
  {
    id: 'MD-3', domain: 'supplier', code: 'SUP-004821', name: 'Agrotem Trading LLC', status: 'Active', country: 'Sudan',
    owner: 'Ahmed Osman',
    attrs: {
      'Party type': 'Supplier', 'Registration number': 'SD-882-114', 'Tax identifier': 'TIN 447 992 118',
      'Contact name': 'Huda Ali', 'Contact email': 'ops@agrotem.example', 'Payment terms': 'Documents against acceptance',
      'Compliance status': 'Cleared 2026-04-02'
    },
    versions: [{ version: 1, status: 'Current', validFrom: '2025-03-02', changed: 'Initial creation', reason: 'Onboarded for the 2025/26 season', approvedBy: 'Grace Mensah', approvedAt: '2025-03-01 08:20' }],
    documents: [
      { id: 'MD3-D1', name: 'Company registration.pdf', docType: 'Company registration', version: 1, uploadedBy: 'Ahmed Osman', uploadedAt: '2025-02-28 15:40', validTo: '2027-01-31' },
      { id: 'MD3-D2', name: 'Supply agreement 2026.pdf', docType: 'Commercial contract', version: 2, uploadedBy: 'Ahmed Osman', uploadedAt: '2026-01-14 10:02', sensitive: true }
    ],
    dependencies: [{ kind: 'Purchase contract', ref: 'P30000718-1', detail: '500 MT sesame, Sep 2026', status: 'Confirmed' }],
    lastChanged: '2026-01-14 10:02', changedBy: 'Ahmed Osman', currentStep: 1, steps: route(true), comments: []
  },
  {
    id: 'MD-4', domain: 'supplier', code: 'SUP-004902', name: 'Gedaref Oilseeds Company', status: 'Pending Approval', country: 'Sudan',
    owner: 'Salma Bakri',
    attrs: {
      'Party type': 'Supplier', 'Registration number': 'SD-901-556', 'Tax identifier': 'TIN 447 992 118',
      'Contact name': 'Mohamed Tahir', 'Contact email': 'sales@gedarefoil.example', 'Payment terms': 'Cash against documents',
      'Compliance status': 'Pending'
    },
    versions: [], documents: [{ id: 'MD4-D1', name: 'Company registration.pdf', docType: 'Company registration', version: 1, uploadedBy: 'Salma Bakri', uploadedAt: '2026-08-16 13:20', validTo: '2028-03-31' }],
    dependencies: [],
    lastChanged: '2026-08-16 13:25', changedBy: 'Salma Bakri', currentStep: 0, steps: route(true), comments: []
  },
  {
    id: 'MD-5', domain: 'commodity', code: 'CMD-0007', name: 'Sesame — Hulled White', status: 'Active',
    owner: 'Group Sourcing',
    attrs: {
      'Commodity group': 'Oilseeds', Grade: 'Hulled White 99/1', 'Packaging type': '50 kg bags',
      'Unit of measure': 'MT', 'Crop year': '2025/26', 'Purity minimum': '99%', 'Moisture maximum': '6%'
    },
    versions: [
      { version: 1, status: 'Superseded', validFrom: '2024-09-01', validTo: '2026-08-31', changed: 'Purity minimum 98%', reason: 'Initial creation', approvedBy: 'Fatima Idris', approvedAt: '2024-08-28 09:00' },
      { version: 2, status: 'Future', validFrom: '2026-09-01', changed: 'Purity minimum 99%', reason: 'Buyer specification tightened for the 2026/27 season', approvedBy: 'Fatima Idris', approvedAt: '2026-08-12 09:15' }
    ],
    documents: [{ id: 'MD5-D1', name: 'Quality specification.pdf', docType: 'Quality specification', version: 2, uploadedBy: 'Yusuf Kamal', uploadedAt: '2026-08-12 09:20', validTo: '2027-03-31' }],
    dependencies: [
      { kind: 'Purchase contract', ref: 'P30000718-1', detail: '500 MT', status: 'Confirmed' },
      { kind: 'Sales contract', ref: 'S30000942-1', detail: '500 MT', status: 'Confirmed' },
      { kind: 'Processing batch', ref: 'BATCH-26-0442', detail: '118 MT', status: 'In Progress' }
    ],
    lastChanged: '2026-08-12 09:15', changedBy: 'Yusuf Kamal', currentStep: 1, steps: route(true),
    comments: [{ id: 'MD5-C1', author: 'Fatima Idris', role: 'COMPLIANCE_OFFICER', country: 'Sudan', at: '2026-08-12 09:15', text: 'Approved. Effective from the new season so existing contracts are unaffected.', visibility: 'Internal only', isDecision: true }]
  },
  {
    id: 'MD-6', domain: 'fxrate', code: 'FX-USDSDG-014', name: 'USD → SDG', status: 'Active',
    owner: 'Group Finance',
    attrs: { 'From currency': 'USD', 'To currency': 'SDG', Rate: '2,410.00', 'Rate type': 'Month-end accounting rate' },
    versions: [
      { version: 12, status: 'Superseded', validFrom: '2026-06-01', validTo: '2026-06-30', changed: 'Rate 2,240.00', reason: 'June month-end rate', approvedBy: 'Fatima Idris', approvedAt: '2026-05-31 16:00' },
      { version: 13, status: 'Superseded', validFrom: '2026-07-01', validTo: '2026-07-31', changed: 'Rate 2,325.00', reason: 'July month-end rate', approvedBy: 'Fatima Idris', approvedAt: '2026-06-30 16:10' },
      { version: 14, status: 'Current', validFrom: '2026-08-01', changed: 'Rate 2,410.00', reason: 'August month-end rate', approvedBy: 'Fatima Idris', approvedAt: '2026-07-31 16:05' }
    ],
    documents: [], dependencies: [{ kind: 'Costing run', ref: 'CST-26-08', detail: 'August costing', status: 'Open' }],
    lastChanged: '2026-07-31 16:05', changedBy: 'Fatima Idris', currentStep: 1, steps: route(), comments: []
  },
  {
    id: 'MD-7', domain: 'incoterm', code: 'FOB', name: 'Free On Board', status: 'Active',
    owner: 'Group Commercial',
    attrs: { Description: 'Seller delivers goods on board the vessel nominated by the buyer', 'Cost transfer point': 'On board at the port of shipment' },
    versions: [{ version: 1, status: 'Current', validFrom: '2024-01-01', changed: 'Initial creation', reason: 'Standard incoterm list', approvedBy: '—', approvedAt: '2024-01-01 00:00' }],
    documents: [], dependencies: [{ kind: 'Purchase contract', ref: 'P30000718-1', detail: 'FOB Port Sudan', status: 'Confirmed' }],
    lastChanged: '2024-01-01 00:00', changedBy: 'System', currentStep: 1, steps: [], comments: []
  },
  {
    id: 'MD-8', domain: 'uom', code: 'MT', name: 'Metric tonne', status: 'Active',
    owner: 'Group Administration',
    attrs: { 'Base unit': 'Kilogram', 'Conversion factor': '1000', 'Decimal places': '3' },
    versions: [{ version: 1, status: 'Current', validFrom: '2024-01-01', changed: 'Initial creation', reason: 'Standard unit list', approvedBy: '—', approvedAt: '2024-01-01 00:00' }],
    documents: [], dependencies: [], lastChanged: '2024-01-01 00:00', changedBy: 'System', currentStep: 1, steps: [], comments: []
  },
  {
    id: 'MD-9', domain: 'warehouse', code: 'WH-0098', name: 'Khartoum Overflow Store', status: 'Inactive', country: 'Sudan',
    owner: 'Ahmed Osman',
    attrs: { City: 'Khartoum', Location: 'Industrial area block 7', 'Capacity m²': '900', 'Capacity MT': '1200', 'Owned or rented': 'Rented', 'Default product category': 'Oilseeds' },
    versions: [{ version: 1, status: 'Current', validFrom: '2024-05-01', changed: 'Initial creation', reason: 'Seasonal overflow', approvedBy: 'Grace Mensah', approvedAt: '2024-04-28 11:00' }],
    documents: [], dependencies: [],
    lastChanged: '2026-03-11 09:30', changedBy: 'Ahmed Osman', currentStep: 1, steps: route(), comments: []
  },
  {
    id: 'MD-10', domain: 'commodity', code: 'CMD-0011', name: 'Sesame — Natural Brown', status: 'Returned for Amendment',
    owner: 'Group Sourcing',
    attrs: { 'Commodity group': 'Oilseeds', Grade: 'Natural Brown', 'Packaging type': 'Bulk', 'Unit of measure': 'MT', 'Crop year': '2025/26' },
    versions: [], documents: [], dependencies: [],
    lastChanged: '2026-08-10 15:22', changedBy: 'Ahmed Osman', currentStep: 0,
    steps: [
      { seq: 1, role: 'COUNTRY_MANAGER', type: 'Sequential', approver: 'Grace Mensah', sla: '2 working days', decision: 'Returned for Amendment', comment: 'Quality parameters are missing. Add purity and moisture before resubmitting.', at: '2026-08-10 15:22' },
      { seq: 2, role: 'COMPLIANCE_OFFICER', type: 'Sequential', approver: 'Fatima Idris', sla: '2 working days' }
    ],
    comments: [{ id: 'MD10-C1', author: 'Grace Mensah', role: 'COUNTRY_MANAGER', country: 'Sudan', at: '2026-08-10 15:22', text: 'Quality parameters are missing. Add purity and moisture before resubmitting.', visibility: 'Internal only', isDecision: true }]
  },
  ...paymentMasterRecords
];

/** Attribute definitions for the domains modelled in full — WF-C3-01 / Step 3 */
export interface AttrDef {
  label: string;
  control: 'text' | 'number' | 'select' | 'date' | 'textarea';
  options?: string[];
  required?: boolean;
  /** becomes mandatory only when another attribute holds a given value */
  requiredWhen?: { label: string; equals: string };
  hint?: string;
}

export const DOMAIN_ATTRS: Record<string, AttrDef[]> = {
  warehouse: [
    { label: 'City', control: 'text', required: true },
    { label: 'Location', control: 'text', required: true },
    { label: 'GPS', control: 'text' },
    { label: 'Capacity m²', control: 'number', required: true },
    { label: 'Capacity MT', control: 'number', required: true },
    { label: 'Owned or rented', control: 'select', options: ['Owned', 'Rented'], required: true },
    { label: 'Default product category', control: 'select', options: ['Oilseeds', 'Grains', 'Pulses', 'Coffee'], required: true },
    { label: 'Rental start', control: 'date', requiredWhen: { label: 'Owned or rented', equals: 'Rented' } },
    { label: 'Rental end', control: 'date', requiredWhen: { label: 'Owned or rented', equals: 'Rented' } },
    { label: 'Payment terms', control: 'text', requiredWhen: { label: 'Owned or rented', equals: 'Rented' } },
    { label: 'Currency', control: 'select', options: ['USD', 'SDG', 'ETB', 'TZS', 'MZN'], requiredWhen: { label: 'Owned or rented', equals: 'Rented' } },
    { label: 'Rental amount', control: 'number', requiredWhen: { label: 'Owned or rented', equals: 'Rented' } },
    { label: 'Contact name', control: 'text', requiredWhen: { label: 'Owned or rented', equals: 'Rented' } },
    { label: 'Contact email', control: 'text', requiredWhen: { label: 'Owned or rented', equals: 'Rented' } }
  ],
  supplier: [
    { label: 'Party type', control: 'select', options: ['Supplier', 'Agent', 'Service provider'], required: true },
    { label: 'Registration number', control: 'text', required: true },
    { label: 'Tax identifier', control: 'text', required: true, hint: 'Part of the duplicate check for parties' },
    { label: 'Contact name', control: 'text', required: true },
    { label: 'Contact email', control: 'text', required: true },
    { label: 'Payment terms', control: 'select', options: ['Cash against documents', 'Documents against acceptance', '30 days net', '60 days net'], required: true },
    { label: 'Compliance status', control: 'select', options: ['Pending', 'Cleared', 'Refused'], required: true }
  ],
  commodity: [
    { label: 'Commodity group', control: 'select', options: ['Oilseeds', 'Grains', 'Pulses', 'Coffee'], required: true },
    { label: 'Grade', control: 'text', required: true },
    { label: 'Packaging type', control: 'select', options: ['50 kg bags', '25 kg bags', 'Bulk', 'Jumbo bags'], required: true },
    { label: 'Unit of measure', control: 'select', options: ['MT', 'KG', 'BAG'], required: true },
    { label: 'Crop year', control: 'text', required: true },
    { label: 'Purity minimum', control: 'text', required: true },
    { label: 'Moisture maximum', control: 'text', required: true }
  ],
  paymentinstrument: [
    { label: 'Description', control: 'textarea', required: true }
  ],
  paymentterm: [
    { label: 'Instrument', control: 'select', options: ['LC', 'DA', 'DP', 'CAD', 'TT'], required: true, hint: 'The payment instrument this term is a tenor of' },
    { label: 'Tenor (days from B/L date)', control: 'number', required: true, hint: 'Zero for a term payable at sight. The bank submittal maturity date derives from this.' },
    { label: 'Payable at sight', control: 'select', options: ['Yes', 'No'], required: true }
  ],
  fxrate: [
    { label: 'From currency', control: 'select', options: ['USD', 'EUR', 'AED'], required: true },
    { label: 'To currency', control: 'select', options: ['SDG', 'ETB', 'TZS', 'MZN'], required: true },
    { label: 'Rate', control: 'number', required: true },
    { label: 'Rate type', control: 'select', options: ['Month-end accounting rate', 'Spot rate', 'Budget rate'], required: true }
  ]
};

/** Generic attribute set for the domains not modelled in full. */
export const GENERIC_ATTRS: AttrDef[] = [
  { label: 'Description', control: 'textarea', required: true },
  { label: 'Notes', control: 'text' }
];

/* ---------- WF-C3-03 — bulk load ---------- */

export interface ValidationRow {
  row: number;
  field: string;
  value: string;
  severity: 'Error' | 'Warning';
  message: string;
}

export const BULK_TEMPLATE_FIELDS: Record<string, string[]> = {
  warehouse: ['Code (leave blank — generated)', 'Name', 'City', 'Location', 'Capacity m²', 'Capacity MT', 'Owned or rented', 'Default product category'],
  supplier: ['Code (leave blank — generated)', 'Name', 'Party type', 'Registration number', 'Tax identifier', 'Contact name', 'Contact email', 'Payment terms'],
  commodity: ['Code (leave blank — generated)', 'Name', 'Commodity group', 'Grade', 'Packaging type', 'Unit of measure', 'Crop year'],
  fxrate: ['From currency', 'To currency', 'Rate', 'Rate type', 'Effective from']
};

/** Simulated upload result — 12 rows read, 9 valid, 3 in error. */
export const BULK_ROWS_READ = 12;
export const BULK_VALIDATION: ValidationRow[] = [
  { row: 3, field: 'Capacity MT', value: 'n/a', severity: 'Error', message: 'Capacity MT must be a number.' },
  { row: 5, field: 'Owned or rented', value: 'Leased', severity: 'Error', message: 'Value is not in the permitted list for this field: Owned, Rented.' },
  { row: 5, field: 'Rental start', value: '(blank)', severity: 'Error', message: 'Mandatory when Owned or rented is Rented.' },
  { row: 8, field: 'Default product category', value: 'Oil seeds', severity: 'Warning', message: 'Did you mean Oilseeds? The value will be loaded as supplied.' },
  { row: 11, field: 'Name', value: 'Port Sudan Warehouse 3', severity: 'Warning', message: 'A record with this name already exists (WH-0142). The duplicate check will run on commit.' }
];

/** Values proposed by extraction when the source is a document rather than a spreadsheet — Step 4 */
export const EXTRACTION_PROPOSAL: { field: string; proposed: string; confidence: string }[] = [
  { field: 'Name', proposed: 'Kassala Collection Store', confidence: 'High' },
  { field: 'City', proposed: 'Kassala', confidence: 'High' },
  { field: 'Capacity MT', proposed: '2,400', confidence: 'Medium' },
  { field: 'Owned or rented', proposed: 'Rented', confidence: 'High' },
  { field: 'Rental start', proposed: '2026-09-01', confidence: 'Medium' },
  { field: 'Rental end', proposed: '2027-08-31', confidence: 'Medium' }
];

/* ---------- WF-C3-03 — external mapping ---------- */

export interface MappingRec {
  id: string;
  domain: string;
  cotsCode: string;
  cotsName: string;
  externalSystem: 'SAP' | 'Odoo';
  externalCode: string;
  validFrom: string;
  validTo?: string;
  status: MasterStatus;
}

export const seedMappings: MappingRec[] = [
  { id: 'MP-1', domain: 'commodity', cotsCode: 'CMD-0007', cotsName: 'Sesame — Hulled White', externalSystem: 'SAP', externalCode: 'MAT-100482', validFrom: '2025-01-01', status: 'Active' },
  { id: 'MP-2', domain: 'supplier', cotsCode: 'SUP-004821', cotsName: 'Agrotem Trading LLC', externalSystem: 'SAP', externalCode: 'VEND-58120', validFrom: '2025-03-02', status: 'Active' },
  { id: 'MP-3', domain: 'warehouse', cotsCode: 'WH-0142', cotsName: 'Port Sudan Warehouse 3', externalSystem: 'Odoo', externalCode: 'LOC/PS/03', validFrom: '2025-07-01', status: 'Active' },
  { id: 'MP-4', domain: 'uom', cotsCode: 'MT', cotsName: 'Metric tonne', externalSystem: 'SAP', externalCode: 'TO', validFrom: '2024-01-01', status: 'Active' },
  { id: 'MP-5', domain: 'supplier', cotsCode: 'SUP-004902', cotsName: 'Gedaref Oilseeds Company', externalSystem: 'SAP', externalCode: 'VEND-58877', validFrom: '2026-09-01', status: 'Pending Approval' }
];

/** WF-C3-03 / Step 8 — codes arriving from an exchange with no mapping. Nothing is created silently. */
export interface UnmappedRec {
  id: string;
  interfaceName: string;
  direction: 'Inbound' | 'Outbound';
  domain: string;
  externalSystem: 'SAP' | 'Odoo';
  externalCode: string;
  correlation: string;
  at: string;
  affected: number;
}

export const seedUnmapped: UnmappedRec[] = [
  { id: 'UM-1', interfaceName: 'SAP purchase order retrieval', direction: 'Inbound', domain: 'commodity', externalSystem: 'SAP', externalCode: 'MAT-100915', correlation: 'CORR-8f2a41', at: '2026-08-18 02:14', affected: 4 },
  { id: 'UM-2', interfaceName: 'SAP purchase order retrieval', direction: 'Inbound', domain: 'supplier', externalSystem: 'SAP', externalCode: 'VEND-59014', correlation: 'CORR-8f2a41', at: '2026-08-18 02:14', affected: 2 },
  { id: 'UM-3', interfaceName: 'Odoo movement retrieval', direction: 'Inbound', domain: 'warehouse', externalSystem: 'Odoo', externalCode: 'LOC/GDF/01', correlation: 'CORR-71c0be', at: '2026-08-17 02:09', affected: 1 }
];
