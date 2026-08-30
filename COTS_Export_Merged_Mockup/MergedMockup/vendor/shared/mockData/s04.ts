// S04 Compliance demonstration data. Prototype only — resets on refresh.

/* Adjustment types are PLACEHOLDERS drawn from the trigger points the source names.
   The Adjustments Types Process Document is still to be provided, so the types and
   their required evidence are modelled as configuration rather than hard-coded. */
export const ADJUSTMENT_TYPES: { type: string; requires: string[] }[] = [
  { type: 'Load / receive variance', requires: ['Movement record', 'Weighbridge tickets', 'Transporter liability note'] },
  { type: 'Transit loss', requires: ['Movement record', 'Surveyor report', 'Police report'] },
  { type: 'Reprocessing loss', requires: ['Non-conformity report', 'Repacking record', 'Processing output record'] },
  { type: 'Stock take correction', requires: ['Stock take sheet', 'Warehouse confirmation'] },
];

export const TRIGGER_POINTS = [
  { key: 'Imported shipment discharge operation', module: 'Import' },
  { key: 'Non-conformity with reprocessing or repacking', module: 'S03 Quality' },
  { key: 'Receiving of trucks at final destination', module: 'S05 / Export' },
  { key: 'Warehouse balance reaching zero stock (batch or overall)', module: 'Stock' },
  { key: 'Stock takes and correction requests', module: 'Stock' },
  { key: 'Insurance case at warehouse, facility, stuffing or transportation', module: 'S04' },
];

export type CaseStatus =
  | 'Created'
  | 'Evidence incomplete'
  | 'Pending Compliance Manager'
  | 'Pending Head of Department'
  | 'Pending Finance Manager'
  | 'Approved'
  | 'Rejected'
  | 'Awaiting ERP confirmation'
  | 'Closed';

export const APPROVAL_ROUTE = ['Compliance Manager', 'Head of Department', 'Finance Manager'] as const;

export type ApprovalEntry = { step: string; decision: 'Approved' | 'Rejected' | 'Returned'; by: string; on: string; comment: string };

export type VarianceCase = {
  id: string;
  createdAutomatically: boolean;
  triggerPoint: string;
  triggerRecord: string;
  triggerRoute?: string;
  suggestedType: string;
  suggestionBasis: { doc: string; from: string }[];
  confirmedType: string;
  quantityMt: number;
  value: number;
  currency: string;
  commodity: string;
  batch: string;
  location: string;
  remarks: string;
  recommendation: string;
  evidence: { item: string; provided: boolean; retrievedFrom?: string }[];
  status: CaseStatus;
  approvals: ApprovalEntry[];
  erpConfirmed: boolean;
  erpReference: string;
  raisedOn: string;
  linked: { label: string; value: string; to?: string; note?: string }[];
};

export const VARIANCE_CASES: VarianceCase[] = [
  {
    id: 'VAR-0051',
    createdAutomatically: true,
    triggerPoint: 'Receiving of trucks at final destination',
    triggerRecord: 'Movement MOV-0552 — loaded 240.0 MT, received 238.8 MT',
    triggerRoute: '/s05/movement/MOV-0552',
    suggestedType: 'Load / receive variance',
    suggestionBasis: [
      { doc: 'Movement record MOV-0552', from: 'S05 Logistics' },
      { doc: 'Weighbridge tickets (2)', from: 'S05 Logistics' },
    ],
    confirmedType: '',
    quantityMt: 1.2,
    value: 744,
    currency: 'USD',
    commodity: 'Sesame',
    batch: 'GD-2026-114',
    location: 'Port Sudan Yard',
    remarks: '',
    recommendation: '',
    evidence: [
      { item: 'Movement record', provided: true, retrievedFrom: 'S05 Logistics' },
      { item: 'Weighbridge tickets', provided: true, retrievedFrom: 'S05 Logistics' },
      { item: 'Transporter liability note', provided: false },
    ],
    status: 'Created',
    approvals: [],
    erpConfirmed: false,
    erpReference: '',
    raisedOn: '21-Aug-2026',
    linked: [
      { label: 'S05 movement', value: 'MOV-0552', to: '/s05/movement/MOV-0552', note: 'Source of the loaded and received quantities' },
    ],
  },
  {
    id: 'VAR-0043',
    createdAutomatically: true,
    triggerPoint: 'Non-conformity with reprocessing or repacking',
    triggerRecord: 'Non-conformity NC-0087 — moisture above contract term, re-drying',
    triggerRoute: '/s03/nc/NC-0087',
    suggestedType: 'Reprocessing loss',
    suggestionBasis: [
      { doc: 'Non-conformity report NC-0087', from: 'S03 Quality' },
      { doc: 'Repacking record RP-0219', from: 'Processing' },
    ],
    confirmedType: 'Reprocessing loss',
    quantityMt: 4.6,
    value: 2852,
    currency: 'USD',
    commodity: 'Sesame',
    batch: 'GD-2026-114',
    location: 'Gedaref Store 1',
    remarks: 'Re-drying loss on the affected stack following the moisture non-conformity.',
    recommendation: 'Adjust the book quantity by the measured re-drying loss.',
    evidence: [
      { item: 'Non-conformity report', provided: true, retrievedFrom: 'S03 Quality' },
      { item: 'Repacking record', provided: true, retrievedFrom: 'Processing' },
      { item: 'Processing output record', provided: true, retrievedFrom: 'Processing' },
    ],
    status: 'Pending Head of Department',
    approvals: [
      { step: 'Compliance Manager', decision: 'Approved', by: 'R. Elhassan', on: '18-Aug-2026', comment: 'Evidence complete, loss consistent with the moisture reading.' },
    ],
    erpConfirmed: false,
    erpReference: '',
    raisedOn: '17-Aug-2026',
    linked: [
      { label: 'S03 non-conformity', value: 'NC-0087', to: '/s03/nc/NC-0087', note: 'Originating quality finding' },
    ],
  },
  {
    id: 'VAR-0038',
    createdAutomatically: false,
    triggerPoint: 'Manual — identified outside the configured trigger points',
    triggerRecord: 'Identified during the W31 reconciliation',
    suggestedType: 'Stock take correction',
    suggestionBasis: [{ doc: 'Stock take sheet ST-0044', from: 'Stock' }],
    confirmedType: 'Stock take correction',
    quantityMt: 0.9,
    value: 486,
    currency: 'USD',
    commodity: 'Groundnut',
    batch: 'EO-2026-051',
    location: 'El Obeid Store',
    remarks: 'Counted quantity below book after the quarterly stock take.',
    recommendation: 'Correct the book quantity.',
    evidence: [
      { item: 'Stock take sheet', provided: true, retrievedFrom: 'Stock' },
      { item: 'Warehouse confirmation', provided: true },
    ],
    status: 'Awaiting ERP confirmation',
    approvals: [
      { step: 'Compliance Manager', decision: 'Approved', by: 'R. Elhassan', on: '05-Aug-2026', comment: '' },
      { step: 'Head of Department', decision: 'Approved', by: 'O. Yousif', on: '06-Aug-2026', comment: '' },
      { step: 'Finance Manager', decision: 'Approved', by: 'L. Abdelrahman', on: '07-Aug-2026', comment: 'Approved for posting.' },
    ],
    erpConfirmed: false,
    erpReference: '',
    raisedOn: '04-Aug-2026',
    linked: [],
  },
];

/* ---------------------------------------------------------- reconciliation --- */

export const MOVEMENT_REPORTS = [
  { name: 'Raw materials receipt', detail: 'By purchase order, warehouse and commodity', template: 'Template A (placeholder)' },
  { name: 'Goods in transit', detail: 'From S05 movements', template: 'Template B (placeholder)' },
  { name: 'Warehouse stocks', detail: 'By warehouse, product and quantity', template: 'Template C (placeholder)' },
  { name: 'Facilities stocks', detail: 'By facility, product and quantity', template: 'Template D (placeholder)' },
];

export type ReconRow = {
  id: string;
  reportType: string;
  location: string;
  commodity: string;
  bookMt: number;
  countedMt: number | null;
  remarks: string;
  caseRef?: string;
};

export type ActionItem = {
  id: string;
  action: string;
  owner: string;
  targetDate: string;
  status: 'Open' | 'In progress' | 'Done';
  note: string;
};

export type ReconCycle = {
  id: string;
  week: string;
  country: string;
  downloaded: string[];
  submittedBy: string;
  rows: ReconRow[];
  actions: ActionItem[];
  status: 'Reports downloaded' | 'Reconciled' | 'Action items open' | 'Closed';
};

export const RECON_CYCLES: ReconCycle[] = [
  {
    id: 'RC-W33',
    week: 'W33 2026',
    country: 'Sudan',
    downloaded: ['Raw materials receipt', 'Goods in transit', 'Warehouse stocks', 'Facilities stocks'],
    submittedBy: 'Compliance — Sudan',
    status: 'Action items open',
    rows: [
      { id: 'R1', reportType: 'Warehouse stocks', location: 'WH-0142 Gedaref Store 1', commodity: 'Sesame', bookMt: 3900, countedMt: 3897.4, remarks: 'Shortfall at the east stack' },
      { id: 'R2', reportType: 'Warehouse stocks', location: 'WH-0210 El Obeid Store', commodity: 'Groundnut', bookMt: 1800, countedMt: 1800, remarks: '' },
      { id: 'R3', reportType: 'Goods in transit', location: 'Kosti → El Obeid', commodity: 'Groundnut', bookMt: 336, countedMt: 334.4, remarks: 'Daily log variance' },
      { id: 'R4', reportType: 'Facilities stocks', location: 'Gedaref Mill', commodity: 'Sesame', bookMt: 1860, countedMt: null, remarks: '' },
    ],
    actions: [
      { id: 'AI-1', action: 'Recount the east stack at WH-0142 with the warehouse team', owner: 'Warehouse — Gedaref', targetDate: '17-Aug-2026', status: 'In progress', note: 'Recount scheduled' },
      { id: 'AI-2', action: 'Confirm the Kosti daily log against the weighbridge tickets', owner: 'Logistics — Sudan', targetDate: '16-Aug-2026', status: 'Open', note: '' },
      { id: 'AI-3', action: 'Submit the facilities stock count for Gedaref Mill', owner: 'M. Idris (Processing)', targetDate: '21-Aug-2026', status: 'Open', note: '' },
    ],
  },
  {
    id: 'RC-W32',
    week: 'W32 2026',
    country: 'Sudan',
    downloaded: ['Raw materials receipt', 'Warehouse stocks'],
    submittedBy: 'Compliance — Sudan',
    status: 'Closed',
    rows: [],
    actions: [],
  },
];

export const WEIGHT_VARIANCE_TREND = [
  { period: 'W29', receiving: 0.18, loading: 0.21 },
  { period: 'W30', receiving: 0.22, loading: 0.25 },
  { period: 'W31', receiving: 0.27, loading: 0.31 },
  { period: 'W32', receiving: 0.34, loading: 0.38 },
  { period: 'W33', receiving: 0.41, loading: 0.47 },
];

/* ------------------------------------------------------------- insurance ---- */

export type Policy = {
  id: string;
  type: 'Marine' | 'Land';
  insurer: string;
  coverage: string;
  validFrom: string;
  validTo: string;
  covered: string[];
  contact: string;
  contactEmail: string;
};

export const POLICIES: Policy[] = [
  {
    id: 'POL-LAND-2026-01', type: 'Land', insurer: 'Blue Nile Insurance',
    coverage: 'Fire, theft, storm damage at warehouses and processing facilities',
    validFrom: '01-Jan-2026', validTo: '31-Dec-2026',
    covered: ['WH-0142 Gedaref Store 1', 'WH-0143 Gedaref Store 2', 'Gedaref Mill'],
    contact: 'A. Siddig (consultant)', contactEmail: 'claims@bluenile-ins.example',
  },
  {
    id: 'POL-MAR-2026-04', type: 'Marine', insurer: 'Red Sea Marine',
    coverage: 'Short landing, damage in transit and at discharge',
    validFrom: '01-Mar-2026', validTo: '28-Aug-2026',
    covered: ['Port Sudan Yard', 'Imported shipments'],
    contact: 'Dubai execution', contactEmail: 'execution.dubai@example',
  },
];

export const INSURER_REQUIREMENTS = ['Surveyor report', 'Photograph report', 'Police report', 'Liability letter', 'Letter of protest'];

export type Incident = {
  id: string;
  type: 'Theft' | 'Fire' | 'Accident' | 'Damage' | 'Short landing';
  date: string;
  reportedBy: string;
  location: string;
  commodity: string;
  quantityMt: number;
  description: string;
  media: string[];
  isImportedDischarge: boolean;
  blQuantity?: number;
  actualReceived?: number;
  shortLanded?: number;
  damaged?: number;
  movementRef?: string;
  policyId: string;
  notified: '' | 'Sent from COTS' | 'Generated for manual sending';
  notifiedOn?: string;
  requirements: { item: string; provided: boolean; documentType: string; coordinatedWith: string }[];
  results: string;
  correctiveAction: string;
  finalDamageMt: number;
  finalLossMt: number;
  productValue: number;
  additionalExpenses: number;
  compensation: number;
  creditNotes: string[];
  status: 'Reported' | 'Policy determined' | 'Notified' | 'Requirements outstanding' | 'Follow-up submitted' | 'Closed and compensated' | 'Closed with no compensation';
  varianceCase?: string;
};

export const INCIDENTS: Incident[] = [
  {
    id: 'INC-0034', type: 'Damage', date: '16-Aug-2026', reportedBy: 'Warehouse — Gedaref',
    location: 'WH-0142 Gedaref Store 1', commodity: 'Sesame', quantityMt: 18,
    description: 'Roof leak after an overnight storm; bags in the north stack wetted.',
    media: ['roof-leak-1.jpg', 'roof-leak-2.jpg', 'stack-damage.mp4'],
    isImportedDischarge: false,
    policyId: 'POL-LAND-2026-01',
    notified: '', requirements: INSURER_REQUIREMENTS.map((i, n) => ({ item: i, provided: n < 2, documentType: n < 2 ? 'Insurance evidence' : '', coordinatedWith: n < 2 ? 'Warehouse — Gedaref' : '' })),
    results: '', correctiveAction: '', finalDamageMt: 0, finalLossMt: 0, productValue: 0, additionalExpenses: 0,
    compensation: 0, creditNotes: [], status: 'Policy determined',
  },
  {
    id: 'INC-0031', type: 'Short landing', date: '02-Aug-2026', reportedBy: 'Execution — Port Sudan',
    location: 'Port Sudan Yard', commodity: 'Sesame', quantityMt: 26,
    description: 'Discharge survey shows quantity received below the bill of lading.',
    media: ['discharge-survey.pdf'],
    isImportedDischarge: true, blQuantity: 1000, actualReceived: 974, shortLanded: 26, damaged: 0,
    policyId: 'POL-MAR-2026-04',
    notified: 'Sent from COTS', notifiedOn: '03-Aug-2026',
    requirements: INSURER_REQUIREMENTS.map((i) => ({ item: i, provided: true, documentType: 'Insurance evidence', coordinatedWith: 'Execution — Port Sudan' })),
    results: 'Surveyor confirmed 26 MT short landed against the bill of lading.',
    correctiveAction: 'Claim lodged with the marine insurer; no local sale required.',
    finalDamageMt: 0, finalLossMt: 26, productValue: 16120, additionalExpenses: 900,
    compensation: 0, creditNotes: [], status: 'Follow-up submitted',
    varianceCase: 'VAR-0038',
  },
];

/* ------------------------------------------------------- monitoring duties --- */

export type Duty = {
  id: string;
  duty: string;
  source: string;
  owner: string;
  cycle: string;
  lastPerformed: string;
  state: 'On cycle' | 'Due' | 'Overdue';
  step: string;
  panel?: 'loadReceive' | 'nonConformity';
};

export const DUTIES: Duty[] = [
  { id: 'D1', duty: 'Transit warehouse reconciliation in the ERP', source: 'C12 / S05 goods in transit', owner: 'Compliance — Sudan', cycle: 'Weekly', lastPerformed: '14-Aug-2026', state: 'Due', step: 'WF-S04-04 / Step 2' },
  { id: 'D2', duty: 'Load-receive variance monitoring', source: 'S05 movements — loaded and received quantities and trip records', owner: 'Compliance — Sudan', cycle: 'Weekly', lastPerformed: '18-Aug-2026', state: 'On cycle', step: 'WF-S04-04 / Step 3', panel: 'loadReceive' },
  { id: 'D3', duty: 'Incident management and reporting', source: 'S04 incidents', owner: 'Compliance — Sudan', cycle: 'Continuous', lastPerformed: '16-Aug-2026', state: 'On cycle', step: 'WF-S04-04 / Step 4' },
  { id: 'D4', duty: 'Warehouse stock reconciliation and variance analysis', source: 'Receiving and loading reports', owner: 'Compliance — Sudan', cycle: 'Weekly', lastPerformed: '15-Aug-2026', state: 'Due', step: 'WF-S04-04 / Step 5' },
  { id: 'D5', duty: 'Non-conformity resolution follow-up', source: 'S03 non-conformities — status only', owner: 'Compliance — Sudan', cycle: 'Weekly', lastPerformed: '12-Aug-2026', state: 'Overdue', step: 'WF-S04-04 / Step 6', panel: 'nonConformity' },
  { id: 'D6', duty: 'Packaging material variance monitoring', source: 'Stuffing reports — loaded against sold quantity', owner: 'Execution — Port Sudan', cycle: 'Per stuffing', lastPerformed: '15-Aug-2026', state: 'On cycle', step: 'WF-S04-04 / Step 7' },
];
