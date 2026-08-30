// S03 Quality Assurance demonstration data. Prototype only — resets on refresh.
// Parameter sets are a LABELLED PLACEHOLDER: only what the source names is used
// (moisture content is mandatory for sesame). The quality formats and forms are
// still to be supplied by the business.

export type ControlPoint =
  | 'First — at sourcing'
  | 'Second — warehouse or facility receipt'
  | 'Third — after processing'
  | 'Fourth — at stuffing'
  | 'Warehouse check'
  | 'Truck check'
  | 'Quality programme';

export const CONTROL_POINTS: { key: ControlPoint; step: string; note: string; applies: boolean }[] = [
  { key: 'First — at sourcing', step: 'WF-S03-02 / Step 2', note: 'Inspection and sampling at purchase; the laboratory result informs the accept or reject decision.', applies: true },
  { key: 'Second — warehouse or facility receipt', step: 'WF-S03-02 / Step 3', note: 'On receipt of material at the warehouse or processing facility.', applies: true },
  { key: 'Third — after processing', step: 'WF-S03-02 / Step 4', note: 'On the finished product. Where goods are reprocessed, a further check follows that operation.', applies: true },
  { key: 'Fourth — at stuffing', step: 'WF-S03-02 / Step 5', note: 'Before the container is sealed.', applies: true },
  { key: 'Warehouse check', step: 'WF-S03-02 / Step 6', note: 'Condition check before the warehouse handover receipt, so space is not accepted in unsuitable condition.', applies: true },
  { key: 'Truck check', step: 'WF-S03-02 / Step 7', note: 'Condition check before loading, warehouse to warehouse or to customer.', applies: true },
  { key: 'Quality programme', step: 'WF-S03-02 / Step 8', note: 'Scheduled activities such as fumigation and pest control, planned per warehouse.', applies: false },
];

export type QualityParameter = {
  parameter: string;
  unit: string;
  acceptable: string;
  mandatory: boolean;
  max?: number; // used by the prototype to evaluate "within standard"
};

export const QUALITY_STANDARDS: Record<string, QualityParameter[]> = {
  Sesame: [
    { parameter: 'Moisture content', unit: '%', acceptable: '≤ 8.0', mandatory: true, max: 8 },
    { parameter: 'Foreign matter', unit: '%', acceptable: '≤ 2.0', mandatory: false, max: 2 },
    { parameter: 'Oil content', unit: '%', acceptable: '≥ 48.0', mandatory: false },
  ],
  Groundnut: [
    { parameter: 'Moisture content', unit: '%', acceptable: '≤ 9.0', mandatory: true, max: 9 },
    { parameter: 'Aflatoxin', unit: 'ppb', acceptable: '≤ 4.0', mandatory: true, max: 4 },
  ],
  'Gum Arabic': [
    { parameter: 'Moisture content', unit: '%', acceptable: '≤ 15.0', mandatory: true, max: 15 },
    { parameter: 'Ash content', unit: '%', acceptable: '≤ 4.0', mandatory: false, max: 4 },
  ],
  Chickpea: [{ parameter: 'Moisture content', unit: '%', acceptable: '≤ 12.0', mandatory: true, max: 12 }],
};

export type Decision = 'Accepted' | 'Rejected' | 'Report with recommendations' | '';

export type LabRequest = {
  laboratory: string;
  testType: string;
  certificateRequired: boolean;
  status: 'Requested' | 'Result received';
  result?: string;
  certificate?: string;
};

export type Inspection = {
  id: string;
  controlPoint: ControlPoint;
  relatedRecord: string;
  relatedIsReceived: boolean; // drives the report-only rule (WF-S03-01 / Step 7)
  commodity: string;
  supplier: string;
  location: string;
  quantityMt: number;
  batch: string;
  date: string;
  inspector: string;
  inspectorTeam: 'Commercial' | 'Quality';
  contractRef?: string; // where present, the contract quality terms are the standard
  labRequired: boolean;
  lab?: LabRequest;
  sampleRef: string;
  sampleDetails: string;
  results: Record<string, string>;
  decision: Decision;
  grade: string;
  report: string;
  recommendations?: string;
  reportedTo?: string[];
  acknowledged?: boolean;
  documents: string[];
};

export const LABORATORIES = ['Gedaref Lab', 'Khartoum Central Lab', 'SGS Port Sudan'];
export const LAB_TESTS = ['Aflatoxin', 'Moisture', 'Oil content', 'Pesticide residue'];
export const GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Off-grade'];

export const INSPECTIONS: Inspection[] = [
  {
    id: 'INS-00410',
    controlPoint: 'First — at sourcing',
    relatedRecord: 'PO-2261 (supplier location)',
    relatedIsReceived: false,
    commodity: 'Groundnut',
    supplier: 'Agent — Kosti',
    location: 'Kosti buying point',
    quantityMt: 180,
    batch: '—',
    date: '10-Aug-2026',
    inspector: 'K. Musa',
    inspectorTeam: 'Commercial',
    labRequired: true,
    lab: { laboratory: 'Gedaref Lab', testType: 'Aflatoxin', certificateRequired: true, status: 'Requested' },
    sampleRef: 'SMP-0908',
    sampleDetails: '5 samples, 20 bags',
    results: { 'Moisture content': '8.4' },
    decision: '',
    grade: '',
    report: '',
    documents: ['sampling-photo-1.jpg'],
  },
  {
    id: 'INS-00412',
    controlPoint: 'Second — warehouse or facility receipt',
    relatedRecord: 'GRN-1183 (received)',
    relatedIsReceived: true,
    commodity: 'Sesame',
    supplier: 'A. Bakri Trading',
    location: 'Gedaref Store 1',
    quantityMt: 240,
    batch: 'GD-2026-114',
    date: '12-Aug-2026',
    inspector: 'S. Ali',
    inspectorTeam: 'Quality',
    contractRef: 'P30000718-1',
    labRequired: false,
    sampleRef: 'SMP-0912',
    sampleDetails: '5 samples, 20 bags',
    results: { 'Moisture content': '9.1', 'Foreign matter': '1.4' },
    decision: '',
    grade: '',
    report: '',
    documents: ['moisture-reading.jpg', 'bag-condition.jpg'],
  },
  {
    id: 'INS-00415',
    controlPoint: 'Third — after processing',
    relatedRecord: 'PRD-0338',
    relatedIsReceived: false,
    commodity: 'Sesame',
    supplier: '—',
    location: 'Gedaref Mill',
    quantityMt: 210,
    batch: 'GD-2026-118',
    date: '14-Aug-2026',
    inspector: 'S. Ali',
    inspectorTeam: 'Quality',
    labRequired: false,
    sampleRef: 'SMP-0921',
    sampleDetails: '3 samples',
    results: { 'Moisture content': '6.8', 'Foreign matter': '0.6', 'Oil content': '49.2' },
    decision: 'Accepted',
    grade: 'Grade 1',
    report: 'Finished product within contract terms. Released for allocation.',
    documents: [],
  },
  {
    id: 'INS-00418',
    controlPoint: 'Fourth — at stuffing',
    relatedRecord: 'STF-0091',
    relatedIsReceived: false,
    commodity: 'Gum Arabic',
    supplier: '—',
    location: 'Port Sudan Yard',
    quantityMt: 90,
    batch: 'EO-2026-070',
    date: '15-Aug-2026',
    inspector: 'H. Tahir',
    inspectorTeam: 'Quality',
    labRequired: false,
    sampleRef: 'SMP-0930',
    sampleDetails: '2 samples per container',
    results: { 'Moisture content': '13.2' },
    decision: 'Accepted',
    grade: 'Grade 2',
    report: 'Container inspected before sealing. Within standard.',
    documents: ['container-seal.jpg'],
  },
];

/* ------------------------------------------------------- condition checks ---- */

export type ConditionCheck = {
  id: string;
  type: 'Warehouse check' | 'Truck check';
  subject: string;
  related: string;
  items: { item: string; outcome: 'Pass' | 'Fail' | ''; note: string }[];
  outcome: 'Suitable' | 'Not suitable' | '';
  date: string;
};

export const CONDITION_ITEMS_WAREHOUSE = ['Cleanliness', 'Roof and walls sound', 'Pest activity', 'Pallets and dunnage', 'Ventilation'];
export const CONDITION_ITEMS_TRUCK = ['Cleanliness', 'Odour', 'Tarpaulin condition', 'Previous cargo compatible', 'Floor free of residue'];

export const CONDITION_CHECKS: ConditionCheck[] = [
  {
    id: 'CHK-0231',
    type: 'Truck check',
    subject: 'Truck SD-4471',
    related: 'MOV-0552',
    items: CONDITION_ITEMS_TRUCK.map((i) => ({ item: i, outcome: '', note: '' })),
    outcome: '',
    date: '19-Aug-2026',
  },
  {
    id: 'CHK-0229',
    type: 'Warehouse check',
    subject: 'WH-0143 Gedaref Store 2',
    related: 'Handover receipt HR-0088',
    items: CONDITION_ITEMS_WAREHOUSE.map((i, n) => ({ item: i, outcome: n === 2 ? 'Fail' : 'Pass', note: n === 2 ? 'Rodent droppings at the east wall' : '' })),
    outcome: 'Not suitable',
    date: '16-Aug-2026',
  },
];

/* ------------------------------------------------------ quality programmes --- */

export type Programme = {
  id: string;
  type: string;
  location: string;
  schedule: string;
  nextDue: string;
  status: 'Scheduled' | 'Due' | 'Overdue' | 'Performed';
  lastPerformed?: string;
  lastResult?: string;
  prompted?: string;
  performedDate?: string;
  performedBy?: string;
  result?: string;
};

export const PROGRAMMES: Programme[] = [
  { id: 'QP-011', type: 'Fumigation', location: 'WH-0142 Gedaref Store 1', schedule: 'Quarterly', nextDue: '22-Aug-2026', status: 'Due', lastPerformed: '20-May-2026', lastResult: 'Satisfactory', prompted: '15-Aug-2026' },
  { id: 'QP-012', type: 'Pest control', location: 'WH-0143 Gedaref Store 2', schedule: 'Monthly', nextDue: '05-Aug-2026', status: 'Overdue', lastPerformed: '04-Jul-2026', lastResult: 'Satisfactory', prompted: '05-Aug-2026' },
  { id: 'QP-013', type: 'Fumigation', location: 'WH-0210 El Obeid Store', schedule: 'Quarterly', nextDue: '12-Sep-2026', status: 'Scheduled', lastPerformed: '10-Jun-2026', lastResult: 'Satisfactory' },
];

/* --------------------------------------------------------- non-conformity ---- */

export type CorrectiveAction = {
  id: string;
  action: string;
  owner: string;
  targetDate: string;
  status: 'Open' | 'In progress' | 'Done';
  note: string;
};

export type NonConformity = {
  id: string;
  source: string;
  sourceRoute?: string;
  raisedBy: string;
  raisedOn: string;
  description: string;
  commodity: string;
  quantityMt: number;
  location: string;
  linked: { label: string; value: string }[];
  actions: CorrectiveAction[];
  blockScope: 'Allocation' | 'Dispatch' | 'Allocation and dispatch';
  status: 'Open' | 'Actions in progress' | 'Closed';
  resolution: string;
  migratedRef?: string;
  varianceCase?: string;
  claimRef?: string;
  reprocessInspection?: string;
};

export const NON_CONFORMITIES: NonConformity[] = [
  {
    id: 'NC-0087',
    source: 'Inspection INS-00412',
    sourceRoute: '/s03/inspection/INS-00412',
    raisedBy: 'S. Ali (Quality)',
    raisedOn: '12-Aug-2026',
    description: 'Moisture content 9.1 % against a contract term of ≤ 6 %. Bags in the east stack show caking.',
    commodity: 'Sesame',
    quantityMt: 240,
    location: 'Gedaref Store 1',
    linked: [
      { label: 'Batch', value: 'GD-2026-114' },
      { label: 'Receipt', value: 'GRN-1183' },
      { label: 'Contract', value: 'P30000718-1' },
    ],
    actions: [
      { id: 'CA-1', action: 'Re-dry the affected stack and re-test moisture', owner: 'M. Idris (Processing)', targetDate: '18-Aug-2026', status: 'In progress', note: 'Drying started 14-Aug' },
      { id: 'CA-2', action: 'Segregate the affected bags from allocatable stock', owner: 'Warehouse — Gedaref', targetDate: '13-Aug-2026', status: 'Done', note: '' },
      { id: 'CA-3', action: 'Report the supplier deviation to sourcing', owner: 'F. Ahmed (Sourcing)', targetDate: '15-Aug-2026', status: 'Open', note: '' },
    ],
    blockScope: 'Allocation and dispatch',
    status: 'Actions in progress',
    resolution: '',
    varianceCase: 'VAR-0043',
  },
  {
    id: 'NC-0085',
    source: 'Warehouse condition check CHK-0229',
    raisedBy: 'H. Tahir (Quality)',
    raisedOn: '16-Aug-2026',
    description: 'Rodent activity at the east wall of WH-0143. Space not accepted for handover.',
    commodity: '—',
    quantityMt: 0,
    location: 'WH-0143 Gedaref Store 2',
    linked: [{ label: 'Handover receipt', value: 'HR-0088' }],
    actions: [
      { id: 'CA-4', action: 'Bring forward the pest control programme for WH-0143', owner: 'Quality — Gedaref', targetDate: '18-Aug-2026', status: 'Open', note: '' },
    ],
    blockScope: 'Allocation',
    status: 'Open',
    resolution: '',
    migratedRef: 'Legacy NC register ref 2026/114',
  },
  {
    id: 'NC-0079',
    source: 'Customer feedback FB-0031 (S09)',
    raisedBy: 'Compliance',
    raisedOn: '02-Aug-2026',
    description: 'Buyer reported foreign matter above specification on shipment SHP-0244.',
    commodity: 'Sesame',
    quantityMt: 120,
    location: 'Port Sudan Yard',
    linked: [
      { label: 'Shipment', value: 'SHP-0244' },
      { label: 'Contract', value: 'S30000942-1' },
    ],
    actions: [{ id: 'CA-5', action: 'Review cleaning line settings before the next stuffing', owner: 'M. Idris (Processing)', targetDate: '10-Aug-2026', status: 'Done', note: 'Settings adjusted' },],
    blockScope: 'Dispatch',
    status: 'Closed',
    resolution: 'Cleaning line adjusted and verified at the next stuffing inspection.',
    claimRef: 'CLM-0021',
  },
];

/* ---------------------------------------------------- contract quality terms - */

export type ContractTerm = {
  parameter: string;
  unit: string;
  standardValue: string;
  agreedValue: string;
  mandatory: boolean;
  variationReason: string;
};

export type ContractQuality = {
  contract: string;
  buyer: string;
  commodity: string;
  terms: ContractTerm[];
  alertRaised: string;
  reviewedBy?: string;
  setupConfirmed?: 'Confirmed' | 'Not confirmed' | '';
  feedback: string;
  tagsRequired: boolean;
  tags: { option: string; note: string }[];
};

export const CONTRACT_QUALITY: ContractQuality[] = [
  {
    contract: 'P30000718-1',
    buyer: 'GRAIN TRADING COMPANY AGROTEM LLC',
    commodity: 'Sesame',
    terms: [
      { parameter: 'Moisture content', unit: '%', standardValue: '≤ 8.0', agreedValue: '≤ 6.0', mandatory: true, variationReason: 'Buyer specification' },
      { parameter: 'Foreign matter', unit: '%', standardValue: '≤ 2.0', agreedValue: '≤ 2.0', mandatory: false, variationReason: '' },
      { parameter: 'Oil content', unit: '%', standardValue: '≥ 48.0', agreedValue: '≥ 48.0', mandatory: false, variationReason: '' },
    ],
    alertRaised: '02-Aug-2026',
    reviewedBy: '',
    setupConfirmed: '',
    feedback: '',
    tagsRequired: true,
    tags: [{ option: 'Buyer logo tag on each bag', note: 'Two colours' }],
  },
  {
    contract: 'S30000942-1',
    buyer: 'Cofco International',
    commodity: 'Sesame',
    terms: [
      { parameter: 'Moisture content', unit: '%', standardValue: '≤ 8.0', agreedValue: '≤ 8.0', mandatory: true, variationReason: '' },
      { parameter: 'Foreign matter', unit: '%', standardValue: '≤ 2.0', agreedValue: '≤ 1.0', mandatory: false, variationReason: 'Buyer specification after prior complaint' },
    ],
    alertRaised: '20-Jul-2026',
    reviewedBy: 'S. Ali (Quality)',
    setupConfirmed: 'Confirmed',
    feedback: 'Cleaning line capable of 1.0 % foreign matter with a second pass.',
    tagsRequired: false,
    tags: [],
  },
];
