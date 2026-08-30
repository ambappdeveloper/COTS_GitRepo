/**
 * Static mock data for the CoreModules prototype.
 * No backend, no persistence. Refreshing the browser resets everything.
 * Every field traces to a step in COTS_C1_Workflows / COTS_Core_Workflows_Integrated.
 */

export type UserType = 'Team Member' | 'Internal Stakeholder' | 'External User';
export type Sensitivity = 'Standard' | 'Elevated' | 'Administrative';
export type Decision = 'Confirm' | 'Amend' | 'Revoke';

export const COUNTRIES = ['Sudan', 'Ethiopia', 'Tanzania', 'Mozambique'];

export const MODULES = [
  'Export',
  'Import and Distribution',
  'Shared Modules',
  'Reports and Dashboards',
  'Administration'
];

export const LANGUAGES = ['English', 'Arabic', 'Portuguese', 'French'];

export const PARTY_TYPES = ['Supplier', 'Customer', 'Agent', 'Transporter', 'Surveyor', 'Laboratory'];

/** C1 / WF-C1-03 / Step 1 — permission = screen or object + action */
export const ACTIONS = ['View', 'Create', 'Edit', 'Delete', 'Submit', 'Approve', 'Export', 'Administer'];

export const OBJECTS = [
  { object: 'Sourcing Plan', module: 'Export' },
  { object: 'Purchase Contract', module: 'Export' },
  { object: 'Shipment', module: 'Export' },
  { object: 'Container Stuffing', module: 'Export' },
  { object: 'Transit Vessel', module: 'Import and Distribution' },
  { object: 'Distribution Order', module: 'Import and Distribution' },
  { object: 'Warehouse Master', module: 'Shared Modules' },
  { object: 'Supplier Master', module: 'Shared Modules' },
  { object: 'Quality Non-conformity', module: 'Shared Modules' },
  { object: 'Report Catalogue', module: 'Reports and Dashboards' },
  { object: 'User Account', module: 'Administration' },
  { object: 'Approval Route', module: 'Administration' }
];

export interface Role {
  code: string;
  description: string;
  sensitivity: Sensitivity;
  owner: string;
  /** "Object|Action" keys */
  permissions: string[];
  status: 'Active' | 'Draft' | 'Pending Approval';
  placeholder: true;
}

export interface Assignment {
  id: string;
  role: string;
  countryScope: string[];
  moduleScope: string[];
  area?: string;
  source: 'Manual' | 'Derived from AD group';
  from: string;
  to?: string;
  status: 'Active' | 'Lapsed';
}

export interface User {
  id: string;
  name: string;
  userType: UserType;
  status: 'Active' | 'Inactive' | 'Expired' | 'Locked' | 'Suspended' | 'Deactivated';
  email: string;
  telephone?: string;
  orgUnit: string;
  language: string;
  defaultCountry: string;
  countryScope: string[];
  moduleScope: string[];
  assignments: Assignment[];
  partyType?: string;
  partyRecord?: string;
  contractExpiry?: string;
  lastLogin?: string;
  firstLogin?: boolean;
  /** demo credential route */
  route: 'Internal' | 'External';
}

export interface ApprovalStep {
  seq: number;
  role: string;
  type: 'Sequential' | 'Parallel';
  approver: string;
  delegate?: string;
  sla: string;
  decision?: 'Approved' | 'Rejected' | 'Returned for Amendment';
  comment?: string;
  at?: string;
}

export interface CommentRec {
  id: string;
  author: string;
  role: string;
  country: string;
  at: string;
  text: string;
  visibility: 'Internal only' | 'Visible to external parties';
  isDecision?: boolean;
  removed?: boolean;
  parentId?: string;
}

export interface DocumentRec {
  id: string;
  name: string;
  docType: string;
  version: number;
  uploadedBy: string;
  uploadedAt: string;
  validFrom?: string;
  validTo?: string;
  sensitive?: boolean;
}

export interface AuditRec {
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
  /* ---- C8 / WF-C8-01 — what the audit module adds to every entry ---- */
  /** Step 3 — named where the source is an integration */
  originatingSystem?: string;
  /** Step 4 — the reason captured with a status change, where one was */
  reason?: string;
  /** Step 4 — the audit level that was applied when the entry was written */
  levelApplied?: 'Field level' | 'Status level' | 'Record level';
  /** Step 5 — technical context, to support investigation */
  session?: string;
  address?: string;
  device?: string;
  /** Step 6 — the sensitive action class, where one applies */
  sensitiveClass?: string;
  /** WF-C8-03 / Step 2 — beyond retention, archived but still retrievable */
  archived?: boolean;
}

export type RequestStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Rejected'
  | 'Returned for Amendment'
  | 'Withdrawn';

export interface AccessRequest {
  id: string;
  origin: 'Line manager' | 'HR / Administration' | 'Automatic from AD group';
  adGroup?: string;
  requestedBy: string;
  requestedForName: string;
  employeeRef?: string;
  email: string;
  orgUnit: string;
  language: string;
  userType: UserType;
  roles: string[];
  countryScope: string[];
  moduleScope: string[];
  area?: string;
  defaultCountry: string;
  effectiveFrom: string;
  effectiveTo?: string;
  partyType?: string;
  partyRecord?: string;
  contractExpiry?: string;
  status: RequestStatus;
  raised: string;
  mode: 'New account' | 'Amendment';
  amendmentOf?: string;
  currentStep: number;
  steps: ApprovalStep[];
  comments: CommentRec[];
  documents: DocumentRec[];
  audit: AuditRec[];
  createdUserId?: string;
  mandatoryDocs: string[];
}

export interface Delegation {
  id: string;
  fromUserId: string;
  fromUser: string;
  toUserId: string;
  toUser: string;
  scope: string[];
  start: string;
  end: string;
  status: 'Active' | 'Lapsed' | 'Refused';
  reason?: string;
}

export interface ReviewEntry {
  userId: string;
  userName: string;
  userType: UserType;
  role: string;
  countryScope: string[];
  moduleScope: string[];
  lastLogin?: string;
  decision?: Decision;
  amendedScope?: string[];
  comment?: string;
}

export interface ReviewPack {
  id: string;
  country: string;
  cycle: string;
  generated: string;
  due: string;
  reminderSent: string;
  status: 'Open' | 'Complete';
  entries: ReviewEntry[];
}

export interface Task {
  id: string;
  type: string;
  sourceModule: string;
  relatedRecord: string;
  route: string;
  requester: string;
  raised: string;
  due: string;
  priority: 'Normal' | 'Urgent';
  status: 'Open' | 'Overdue' | 'Closed';
  assigneeId: string;
  onBehalfOf?: string;
}

export interface NotificationRec {
  id: string;
  event: string;
  subject: string;
  recipient: string;
  channels: string[];
  status: 'Delivered' | 'Queued' | 'Permanently failed';
  at: string;
  read: boolean;
  external?: boolean;
  /** C5 / WF-C5-01 — the context the notification engine needs */
  country?: string;
  urgent?: boolean;
  record?: string;
  route?: string;
  requester?: string;
  due?: string;
  decision?: string;
  comment?: string;
}

export interface AdMapping {
  group: string;
  role: string;
  countryScope: string[];
  moduleScope: string[];
  enabled: boolean;
  lastSync: string;
}

/* ----------------------------- seed ----------------------------- */

const perm = (objects: string[], actions: string[]) =>
  objects.flatMap((o) => actions.map((a) => `${o}|${a}`));

export const seedRoles: Role[] = [
  {
    code: 'SOURCING_OFFICER',
    description: 'Sourcing Officer',
    sensitivity: 'Standard',
    owner: 'Country Manager',
    permissions: [
      ...perm(['Sourcing Plan', 'Purchase Contract'], ['View', 'Create', 'Edit', 'Submit']),
      ...perm(['Supplier Master'], ['View'])
    ],
    status: 'Active',
    placeholder: true
  },
  {
    code: 'EXECUTION_OFFICER',
    description: 'Execution Officer',
    sensitivity: 'Standard',
    owner: 'Country Manager',
    permissions: [
      ...perm(['Shipment', 'Container Stuffing'], ['View', 'Create', 'Edit', 'Submit']),
      ...perm(['Purchase Contract'], ['View'])
    ],
    status: 'Active',
    placeholder: true
  },
  {
    code: 'PROCESSING_SUPERVISOR',
    description: 'Processing Supervisor',
    sensitivity: 'Standard',
    owner: 'Country Manager',
    permissions: [...perm(['Warehouse Master'], ['View', 'Edit']), ...perm(['Shipment'], ['View'])],
    status: 'Active',
    placeholder: true
  },
  {
    code: 'QUALITY_INSPECTOR',
    description: 'Quality Inspector',
    sensitivity: 'Standard',
    owner: 'Compliance Officer',
    permissions: [...perm(['Quality Non-conformity'], ['View', 'Create', 'Edit', 'Submit'])],
    status: 'Active',
    placeholder: true
  },
  {
    code: 'COMPLIANCE_OFFICER',
    description: 'Compliance Officer',
    sensitivity: 'Elevated',
    owner: 'Country Manager',
    permissions: [
      ...perm(['Quality Non-conformity'], ['View', 'Approve']),
      ...perm(['Supplier Master'], ['View', 'Approve']),
      ...perm(['Report Catalogue'], ['View', 'Export'])
    ],
    status: 'Active',
    placeholder: true
  },
  {
    code: 'COUNTRY_MANAGER',
    description: 'Country Manager',
    sensitivity: 'Elevated',
    owner: 'Regional Director',
    permissions: [
      ...perm(['Sourcing Plan', 'Purchase Contract', 'Shipment', 'Warehouse Master', 'Supplier Master'], ['View', 'Approve']),
      ...perm(['Report Catalogue'], ['View', 'Export'])
    ],
    status: 'Active',
    placeholder: true
  },
  {
    code: 'SYSTEM_ADMINISTRATOR',
    description: 'System Administrator',
    sensitivity: 'Administrative',
    owner: 'IT',
    permissions: [
      ...perm(['User Account', 'Approval Route'], ACTIONS),
      ...perm(['Report Catalogue'], ['View', 'Export'])
    ],
    status: 'Active',
    placeholder: true
  }
];

export const seedUsers: User[] = [
  {
    id: 'U-001',
    name: 'Nasreen Sayed',
    userType: 'Team Member',
    status: 'Active',
    email: 'nasreen.sayed@dalgroup.com',
    telephone: '+249 900 000 001',
    orgUnit: 'IT, Khartoum',
    language: 'English',
    defaultCountry: 'Sudan',
    countryScope: ['Sudan', 'Ethiopia', 'Tanzania'],
    moduleScope: MODULES,
    assignments: [
      { id: 'A-001', role: 'SYSTEM_ADMINISTRATOR', countryScope: ['Sudan', 'Ethiopia', 'Tanzania'], moduleScope: MODULES, source: 'Manual', from: '2025-01-01', status: 'Active' }
    ],
    lastLogin: '2026-08-17 08:12',
    route: 'Internal'
  },
  {
    id: 'U-002',
    name: 'Ahmed Osman',
    userType: 'Team Member',
    status: 'Active',
    email: 'ahmed.osman@dalgroup.com',
    orgUnit: 'Sourcing, Khartoum',
    language: 'English',
    defaultCountry: 'Sudan',
    countryScope: ['Sudan'],
    moduleScope: ['Export', 'Shared Modules', 'Reports and Dashboards'],
    assignments: [
      { id: 'A-002', role: 'SOURCING_OFFICER', countryScope: ['Sudan'], moduleScope: ['Export', 'Shared Modules'], source: 'Manual', from: '2025-03-01', status: 'Active' }
    ],
    lastLogin: '2026-08-15 14:40',
    route: 'Internal'
  },
  {
    id: 'U-003',
    name: 'Meseret Alemu',
    userType: 'Team Member',
    status: 'Active',
    email: 'meseret.alemu@dalgroup.com',
    orgUnit: 'Execution, Addis Ababa',
    language: 'English',
    defaultCountry: 'Ethiopia',
    countryScope: ['Ethiopia'],
    moduleScope: ['Export', 'Shared Modules'],
    assignments: [
      { id: 'A-003', role: 'EXECUTION_OFFICER', countryScope: ['Ethiopia'], moduleScope: ['Export'], source: 'Derived from AD group', from: '2025-05-01', status: 'Active' }
    ],
    lastLogin: '2026-08-18 06:02',
    route: 'Internal'
  },
  {
    id: 'U-004',
    name: 'Joseph Mwangi',
    userType: 'Team Member',
    status: 'Locked',
    email: 'joseph.mwangi@dalgroup.com',
    orgUnit: 'Processing, Dar es Salaam',
    language: 'English',
    defaultCountry: 'Tanzania',
    countryScope: ['Tanzania'],
    moduleScope: ['Export'],
    assignments: [
      { id: 'A-004', role: 'PROCESSING_SUPERVISOR', countryScope: ['Tanzania'], moduleScope: ['Export'], source: 'Manual', from: '2025-02-01', status: 'Active' }
    ],
    lastLogin: '2026-07-02 09:30',
    route: 'Internal'
  },
  {
    id: 'U-005',
    name: 'Fatima Idris',
    userType: 'Internal Stakeholder',
    status: 'Active',
    email: 'fatima.idris@dalgroup.com',
    orgUnit: 'Group Finance, Dubai',
    language: 'English',
    defaultCountry: 'Sudan',
    countryScope: ['Sudan', 'Ethiopia', 'Tanzania', 'Mozambique'],
    moduleScope: ['Reports and Dashboards'],
    assignments: [
      { id: 'A-005', role: 'COMPLIANCE_OFFICER', countryScope: ['Sudan', 'Ethiopia', 'Tanzania', 'Mozambique'], moduleScope: ['Reports and Dashboards'], source: 'Manual', from: '2025-01-15', status: 'Active' }
    ],
    lastLogin: '2026-08-14 11:20',
    route: 'Internal'
  },
  {
    id: 'U-006',
    name: 'Agrotem Trading (portal)',
    userType: 'External User',
    status: 'Active',
    email: 'ops@agrotem.example',
    orgUnit: 'External party',
    language: 'English',
    defaultCountry: 'Sudan',
    countryScope: ['Sudan'],
    moduleScope: ['Export'],
    assignments: [],
    partyType: 'Supplier',
    partyRecord: 'SUP-004821 Agrotem Trading LLC',
    contractExpiry: '2026-12-31',
    lastLogin: '2026-08-10 07:55',
    route: 'External'
  },
  {
    id: 'U-007',
    name: 'Yusuf Kamal',
    userType: 'Team Member',
    status: 'Active',
    email: 'yusuf.kamal@dalgroup.com',
    orgUnit: 'Quality, Port Sudan',
    language: 'Arabic',
    defaultCountry: 'Sudan',
    countryScope: ['Sudan'],
    moduleScope: ['Shared Modules'],
    assignments: [
      { id: 'A-007', role: 'QUALITY_INSPECTOR', countryScope: ['Sudan'], moduleScope: ['Shared Modules'], source: 'Manual', from: '2024-11-01', status: 'Active' }
    ],
    lastLogin: '2026-02-03 10:10',
    route: 'Internal'
  },
  {
    id: 'U-008',
    name: 'Grace Mensah',
    userType: 'Team Member',
    status: 'Active',
    email: 'grace.mensah@dalgroup.com',
    orgUnit: 'Country Management, Maputo',
    language: 'Portuguese',
    defaultCountry: 'Mozambique',
    countryScope: ['Mozambique'],
    moduleScope: MODULES,
    assignments: [
      { id: 'A-008', role: 'COUNTRY_MANAGER', countryScope: ['Mozambique'], moduleScope: MODULES, source: 'Manual', from: '2025-04-01', status: 'Active' }
    ],
    lastLogin: '2026-08-16 13:05',
    route: 'Internal'
  },
  {
    id: 'U-009',
    name: 'Salma Bakri',
    userType: 'Team Member',
    status: 'Active',
    email: 'salma.bakri@dalgroup.com',
    orgUnit: 'Sourcing, Gedaref',
    language: 'English',
    defaultCountry: 'Sudan',
    countryScope: ['Sudan'],
    moduleScope: ['Export'],
    assignments: [
      { id: 'A-009', role: 'SOURCING_OFFICER', countryScope: ['Sudan'], moduleScope: ['Export'], source: 'Manual', from: '2026-08-01', status: 'Active' }
    ],
    firstLogin: true,
    route: 'Internal'
  }
];

const now = '2026-08-18';

export const seedRequests: AccessRequest[] = [
  {
    id: 'AR-000141',
    origin: 'Line manager',
    requestedBy: 'Nasreen Sayed',
    requestedForName: 'Omar Bashir',
    employeeRef: 'EMP-10871',
    email: 'omar.bashir@dalgroup.com',
    orgUnit: 'Execution, Port Sudan',
    language: 'English',
    userType: 'Team Member',
    roles: ['EXECUTION_OFFICER'],
    countryScope: ['Sudan'],
    moduleScope: ['Export', 'Shared Modules'],
    defaultCountry: 'Sudan',
    effectiveFrom: '2026-09-01',
    status: 'Pending Approval',
    raised: '2026-08-14',
    mode: 'New account',
    currentStep: 0,
    steps: [
      { seq: 1, role: 'COUNTRY_MANAGER', type: 'Sequential', approver: 'Grace Mensah', sla: '2 working days' },
      { seq: 2, role: 'SYSTEM_ADMINISTRATOR', type: 'Sequential', approver: 'Nasreen Sayed', sla: '1 working day' }
    ],
    comments: [],
    documents: [],
    audit: [
      { id: 'AU-1', at: '2026-08-14 09:02', user: 'Nasreen Sayed', role: 'SYSTEM_ADMINISTRATOR', country: 'Sudan', entity: 'Access Request', record: 'AR-000141', action: 'Create', source: 'User interface' },
      { id: 'AU-2', at: '2026-08-14 09:04', user: 'Nasreen Sayed', role: 'SYSTEM_ADMINISTRATOR', country: 'Sudan', entity: 'Access Request', record: 'AR-000141', action: 'Status change', field: 'Status', oldValue: 'Draft', newValue: 'Pending Approval', source: 'User interface' }
    ],
    mandatoryDocs: []
  },
  {
    id: 'AR-000142',
    origin: 'HR / Administration',
    requestedBy: 'Nasreen Sayed',
    requestedForName: 'Beira Logistics (portal)',
    email: 'portal@beiralog.example',
    orgUnit: 'External party',
    language: 'Portuguese',
    userType: 'External User',
    roles: ['EXECUTION_OFFICER'],
    countryScope: ['Mozambique'],
    moduleScope: ['Export'],
    defaultCountry: 'Mozambique',
    effectiveFrom: '2026-09-01',
    partyType: 'Transporter',
    partyRecord: 'TRP-000913 Beira Logistics SA',
    contractExpiry: '2027-06-30',
    status: 'Draft',
    raised: '2026-08-17',
    mode: 'New account',
    currentStep: 0,
    steps: [
      { seq: 1, role: 'COUNTRY_MANAGER', type: 'Sequential', approver: 'Grace Mensah', sla: '2 working days' },
      { seq: 2, role: 'COMPLIANCE_OFFICER', type: 'Sequential', approver: 'Fatima Idris', sla: '2 working days' },
      { seq: 3, role: 'SYSTEM_ADMINISTRATOR', type: 'Sequential', approver: 'Nasreen Sayed', sla: '1 working day' }
    ],
    comments: [],
    documents: [
      { id: 'D-1', name: 'Transport service agreement.pdf', docType: 'Service agreement', version: 1, uploadedBy: 'Nasreen Sayed', uploadedAt: '2026-08-17 10:22', validFrom: '2026-01-01', validTo: '2027-06-30' }
    ],
    audit: [
      { id: 'AU-3', at: '2026-08-17 10:20', user: 'Nasreen Sayed', role: 'SYSTEM_ADMINISTRATOR', country: 'Mozambique', entity: 'Access Request', record: 'AR-000142', action: 'Create', source: 'User interface' }
    ],
    mandatoryDocs: ['Service agreement', 'Company registration']
  },
  {
    id: 'AR-000139',
    origin: 'Automatic from AD group',
    adGroup: 'COTS-ET-Execution',
    requestedBy: 'System (scheduled job)',
    requestedForName: 'Dawit Girma',
    email: 'dawit.girma@dalgroup.com',
    orgUnit: 'Execution, Addis Ababa',
    language: 'English',
    userType: 'Team Member',
    roles: ['EXECUTION_OFFICER'],
    countryScope: ['Ethiopia'],
    moduleScope: ['Export'],
    defaultCountry: 'Ethiopia',
    effectiveFrom: '2026-08-01',
    status: 'Approved',
    raised: '2026-07-28',
    mode: 'New account',
    currentStep: 2,
    steps: [
      { seq: 1, role: 'COUNTRY_MANAGER', type: 'Sequential', approver: 'Grace Mensah', sla: '2 working days', decision: 'Approved', comment: 'Confirmed against the AD group.', at: '2026-07-29 08:40' },
      { seq: 2, role: 'SYSTEM_ADMINISTRATOR', type: 'Sequential', approver: 'Nasreen Sayed', sla: '1 working day', decision: 'Approved', at: '2026-07-29 11:15' }
    ],
    comments: [
      { id: 'C-1', author: 'Grace Mensah', role: 'COUNTRY_MANAGER', country: 'Ethiopia', at: '2026-07-29 08:40', text: 'Confirmed against the AD group.', visibility: 'Internal only', isDecision: true }
    ],
    documents: [],
    audit: [
      { id: 'AU-4', at: '2026-07-28 02:00', user: 'Service identity (Active Directory)', role: '—', country: 'Ethiopia', entity: 'Access Request', record: 'AR-000139', action: 'Create', source: 'Scheduled job' },
      { id: 'AU-5', at: '2026-07-29 11:15', user: 'Nasreen Sayed', role: 'SYSTEM_ADMINISTRATOR', country: 'Ethiopia', entity: 'Access Request', record: 'AR-000139', action: 'Approve', field: 'Status', oldValue: 'Pending Approval', newValue: 'Approved', source: 'User interface' }
    ],
    mandatoryDocs: []
  },
  {
    id: 'AR-000138',
    origin: 'Line manager',
    requestedBy: 'Grace Mensah',
    requestedForName: 'Paulo Chissano',
    email: 'paulo.chissano@dalgroup.com',
    orgUnit: 'Processing, Maputo',
    language: 'Portuguese',
    userType: 'Team Member',
    roles: ['PROCESSING_SUPERVISOR', 'SYSTEM_ADMINISTRATOR'],
    countryScope: ['Mozambique'],
    moduleScope: MODULES,
    defaultCountry: 'Mozambique',
    effectiveFrom: '2026-08-01',
    status: 'Returned for Amendment',
    raised: '2026-07-20',
    mode: 'New account',
    currentStep: 0,
    steps: [
      { seq: 1, role: 'COUNTRY_MANAGER', type: 'Sequential', approver: 'Grace Mensah', sla: '2 working days', decision: 'Returned for Amendment', comment: 'The administrative role is not justified for this position. Please resubmit with the processing role only.', at: '2026-07-21 15:10' },
      { seq: 2, role: 'SYSTEM_ADMINISTRATOR', type: 'Sequential', approver: 'Nasreen Sayed', sla: '1 working day' }
    ],
    comments: [
      { id: 'C-2', author: 'Grace Mensah', role: 'COUNTRY_MANAGER', country: 'Mozambique', at: '2026-07-21 15:10', text: 'The administrative role is not justified for this position. Please resubmit with the processing role only.', visibility: 'Internal only', isDecision: true }
    ],
    documents: [],
    audit: [
      { id: 'AU-6', at: '2026-07-21 15:10', user: 'Grace Mensah', role: 'COUNTRY_MANAGER', country: 'Mozambique', entity: 'Access Request', record: 'AR-000138', action: 'Return for amendment', source: 'User interface', sensitive: true }
    ],
    mandatoryDocs: []
  }
];

export const seedDelegations: Delegation[] = [
  {
    id: 'DL-0021',
    fromUserId: 'U-008',
    fromUser: 'Grace Mensah',
    toUserId: 'U-003',
    toUser: 'Meseret Alemu',
    scope: ['COUNTRY_MANAGER — approvals, Mozambique'],
    start: '2026-08-20',
    end: '2026-09-03',
    status: 'Active',
    reason: 'Annual leave'
  },
  {
    id: 'DL-0018',
    fromUserId: 'U-001',
    fromUser: 'Nasreen Sayed',
    toUserId: 'U-002',
    toUser: 'Ahmed Osman',
    scope: ['SYSTEM_ADMINISTRATOR — approvals, Sudan'],
    start: '2026-06-01',
    end: '2026-06-14',
    status: 'Lapsed'
  }
];

export const seedReviewPacks: ReviewPack[] = [
  {
    id: 'AR-REV-2026-H2-SD',
    country: 'Sudan',
    cycle: '2026 H2',
    generated: '2026-08-01',
    due: '2026-08-31',
    reminderSent: '2026-08-01',
    status: 'Open',
    entries: [
      { userId: 'U-002', userName: 'Ahmed Osman', userType: 'Team Member', role: 'SOURCING_OFFICER', countryScope: ['Sudan'], moduleScope: ['Export', 'Shared Modules'], lastLogin: '2026-08-15 14:40' },
      { userId: 'U-007', userName: 'Yusuf Kamal', userType: 'Team Member', role: 'QUALITY_INSPECTOR', countryScope: ['Sudan'], moduleScope: ['Shared Modules'], lastLogin: '2026-02-03 10:10' },
      { userId: 'U-009', userName: 'Salma Bakri', userType: 'Team Member', role: 'SOURCING_OFFICER', countryScope: ['Sudan'], moduleScope: ['Export'] },
      { userId: 'U-006', userName: 'Agrotem Trading (portal)', userType: 'External User', role: '—', countryScope: ['Sudan'], moduleScope: ['Export'], lastLogin: '2026-08-10 07:55' },
      { userId: 'U-001', userName: 'Nasreen Sayed', userType: 'Team Member', role: 'SYSTEM_ADMINISTRATOR', countryScope: ['Sudan', 'Ethiopia', 'Tanzania'], moduleScope: MODULES, lastLogin: '2026-08-17 08:12' }
    ]
  },
  {
    id: 'AR-REV-2026-H1-ET',
    country: 'Ethiopia',
    cycle: '2026 H1',
    generated: '2026-02-01',
    due: '2026-02-28',
    reminderSent: '2026-02-01',
    status: 'Complete',
    entries: [
      { userId: 'U-003', userName: 'Meseret Alemu', userType: 'Team Member', role: 'EXECUTION_OFFICER', countryScope: ['Ethiopia'], moduleScope: ['Export'], lastLogin: '2026-08-18 06:02', decision: 'Confirm' }
    ]
  }
];

export const seedTasks: Task[] = [
  {
    id: 'T-9001',
    type: 'Approval request — access request',
    sourceModule: 'C1 Identity and Access',
    relatedRecord: 'AR-000141 Omar Bashir',
    route: '/c1/access-requests/AR-000141',
    requester: 'Nasreen Sayed',
    raised: '2026-08-14',
    due: '2026-08-18',
    priority: 'Urgent',
    status: 'Open',
    assigneeId: 'U-001',
    onBehalfOf: 'Grace Mensah (delegated)'
  },
  {
    id: 'T-9002',
    type: 'Access review due',
    sourceModule: 'C1 Identity and Access',
    relatedRecord: 'AR-REV-2026-H2-SD Sudan 2026 H2',
    route: '/c1/access-reviews/AR-REV-2026-H2-SD',
    requester: 'System (scheduled job)',
    raised: '2026-08-01',
    due: '2026-08-31',
    priority: 'Normal',
    status: 'Open',
    assigneeId: 'U-001'
  },
  {
    id: 'T-9003',
    type: 'Amend and resubmit — returned request',
    sourceModule: 'C1 Identity and Access',
    relatedRecord: 'AR-000138 Paulo Chissano',
    route: '/c1/access-requests/AR-000138',
    requester: 'Grace Mensah',
    raised: '2026-07-21',
    due: '2026-07-28',
    priority: 'Normal',
    status: 'Overdue',
    assigneeId: 'U-001'
  },
  {
    id: 'T-9004',
    type: 'Dormant account review',
    sourceModule: 'C1 Identity and Access',
    relatedRecord: 'Yusuf Kamal — 196 days dormant',
    route: '/c1/dormant-accounts',
    requester: 'System (scheduled job)',
    raised: '2026-08-16',
    due: '2026-08-23',
    priority: 'Normal',
    status: 'Open',
    assigneeId: 'U-001'
  }
];

/** Tasks held by the manager's direct reports, so the C2 team view and ageing buckets are populated. */
export const seedTeamTasks: Task[] = [
  { id: 'T-9101', type: 'Approval request — master data change', sourceModule: 'C3 Master Data', relatedRecord: 'WH-0142 Port Sudan Warehouse 3', route: '/c1/users/U-002', requester: 'Nasreen Sayed', raised: '2026-08-17', due: '2026-08-21', priority: 'Normal', status: 'Open', assigneeId: 'U-002' },
  { id: 'T-9102', type: 'Overdue periodic update', sourceModule: 'C5 Notifications', relatedRecord: 'Freight rate — Port Sudan to Jeddah', route: '/c1/users/U-002', requester: 'System (scheduled job)', raised: '2026-08-04', due: '2026-08-11', priority: 'Urgent', status: 'Overdue', assigneeId: 'U-002' },
  { id: 'T-9103', type: 'Document renewal', sourceModule: 'C7 Documents', relatedRecord: 'Insurance certificate — Truck SD-2210', route: '/c1/users/U-002', requester: 'System (scheduled job)', raised: '2026-08-12', due: '2026-08-26', priority: 'Normal', status: 'Open', assigneeId: 'U-002' },
  { id: 'T-9104', type: 'Request for confirmation — sales contract terms', sourceModule: 'C5 Notifications', relatedRecord: 'S30000942-1 Cofco International', route: '/c1/users/U-003', requester: 'Ahmed Osman', raised: '2026-08-15', due: '2026-08-19', priority: 'Normal', status: 'Open', assigneeId: 'U-003' },
  { id: 'T-9105', type: 'Non-conformity requiring action', sourceModule: 'C6 Comments', relatedRecord: 'QC-26-1183 Batch 26/SES/GDF/0442', route: '/c1/users/U-007', requester: 'Yusuf Kamal', raised: '2026-08-06', due: '2026-08-13', priority: 'Urgent', status: 'Overdue', assigneeId: 'U-007' },
  { id: 'T-9106', type: 'Required data entry', sourceModule: 'C3 Master Data', relatedRecord: 'CMD-0007 Sesame — Hulled White', route: '/c1/users/U-007', requester: 'Nasreen Sayed', raised: '2026-07-30', due: '2026-08-06', priority: 'Normal', status: 'Overdue', assigneeId: 'U-007' },
  { id: 'T-9107', type: 'Approval request — access request', sourceModule: 'C1 Identity and Access', relatedRecord: 'AR-000142 Beira Logistics (portal)', route: '/c1/access-requests/AR-000142', requester: 'Nasreen Sayed', raised: '2026-08-18', due: '2026-08-22', priority: 'Normal', status: 'Open', assigneeId: 'U-009' }
];

export const seedNotifications: NotificationRec[] = [
  { id: 'N-5001', event: 'Approval request', subject: 'Access request AR-000141 awaits your approval', recipient: 'Nasreen Sayed', channels: ['In-app', 'Email', 'SMS'], status: 'Delivered', at: '2026-08-14 09:05', read: false },
  { id: 'N-5002', event: 'Access review reminder', subject: 'Access review pack for Sudan 2026 H2 is due 31 Aug', recipient: 'Nasreen Sayed', channels: ['In-app', 'Email'], status: 'Delivered', at: '2026-08-01 06:00', read: false },
  { id: 'N-5003', event: 'Account lockout', subject: 'Account for Joseph Mwangi has been locked after 5 failed attempts', recipient: 'System Administrator', channels: ['In-app', 'Email'], status: 'Delivered', at: '2026-08-12 11:41', read: true },
  { id: 'N-5004', event: 'Welcome / activation', subject: 'Activation link issued to Beira Logistics (portal)', recipient: 'portal@beiralog.example', channels: ['Email'], status: 'Permanently failed', at: '2026-08-17 10:30', read: true, external: true }
];

export const seedAdMappings: AdMapping[] = [
  { group: 'COTS-SD-Sourcing', role: 'SOURCING_OFFICER', countryScope: ['Sudan'], moduleScope: ['Export'], enabled: true, lastSync: '2026-08-18 02:00' },
  { group: 'COTS-ET-Execution', role: 'EXECUTION_OFFICER', countryScope: ['Ethiopia'], moduleScope: ['Export'], enabled: true, lastSync: '2026-08-18 02:00' },
  { group: 'COTS-TZ-Processing', role: 'PROCESSING_SUPERVISOR', countryScope: ['Tanzania'], moduleScope: ['Export'], enabled: false, lastSync: '2026-08-11 02:00' },
  { group: 'COTS-GRP-Reporting', role: 'COMPLIANCE_OFFICER', countryScope: COUNTRIES, moduleScope: ['Reports and Dashboards'], enabled: true, lastSync: '2026-08-18 02:00' }
];

export const seedAudit: AuditRec[] = [
  { id: 'GA-1', at: '2026-08-18 06:02', user: 'Meseret Alemu', role: 'EXECUTION_OFFICER', country: 'Ethiopia', entity: 'Session', record: 'U-003', action: 'Login', source: 'User interface' },
  { id: 'GA-2', at: '2026-08-17 08:12', user: 'Nasreen Sayed', role: 'SYSTEM_ADMINISTRATOR', country: 'Sudan', entity: 'Session', record: 'U-001', action: 'Login', source: 'User interface' },
  { id: 'GA-3', at: '2026-08-12 11:41', user: 'Joseph Mwangi', role: '—', country: 'Tanzania', entity: 'Session', record: 'U-004', action: 'Lockout', field: 'Status', oldValue: 'Active', newValue: 'Locked', source: 'User interface', sensitive: true },
  { id: 'GA-4', at: '2026-08-01 06:00', user: 'Service identity (scheduled job)', role: '—', country: 'Sudan', entity: 'Access review pack', record: 'AR-REV-2026-H2-SD', action: 'Create', source: 'Scheduled job' }
];

export const DORMANCY_THRESHOLD_DAYS = 90;
export const FAILED_LOGIN_THRESHOLD = 5;
export const SESSION_TIMEOUT_MINUTES = 30;
export const REVIEW_CYCLE = 'Six-monthly';
export const TODAY = now;
