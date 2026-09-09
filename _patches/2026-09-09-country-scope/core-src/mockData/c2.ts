/**
 * C2 Application Shell, Navigation and Task Inbox — mock data.
 * Static only. Every field traces to a step in COTS_C2_Workflows.
 */

/* ---------- WF-C2-01 / Step 1 — country context ---------- */

export interface CountryContext {
  name: string;
  currency: string;
  reportingCurrency: string;
  calendar: string;
  season: string;
  language: string;
  /** C10 / WF-C10-01 / Step 3 — steps that do not apply are hidden */
  stepsNotApplicable: string[];
}

export const COUNTRY_CONTEXT: Record<string, CountryContext> = {
  Sudan: {
    name: 'Sudan', currency: 'SDG', reportingCurrency: 'USD', calendar: 'Sun–Thu, Sudan public holidays',
    season: '2025/26 season, Nov–Apr', language: 'Arabic / English', stepsNotApplicable: []
  },
  Ethiopia: {
    name: 'Ethiopia', currency: 'ETB', reportingCurrency: 'USD', calendar: 'Mon–Fri, Ethiopia public holidays',
    season: '2025/26 season, Oct–Mar', language: 'English', stepsNotApplicable: ['Logistics service request', 'Ex-form']
  },
  /*
   * Chad — added 9 September 2026, with the instruction that the Export screens follow the
   * country in the header and that a user may switch between the countries their access
   * carries.
   *
   * Chad was the one country the Export module operates in that this configuration did not
   * hold: the Export prototype's own country profiles carry five (Sudan, Ethiopia, Chad,
   * Tanzania, Mozambique) and this table carried four. That mismatch was harmless while the
   * header drove only Core and Shared. Once it scopes the Export lists it is not: the header
   * could never be set to Chad, so a Chad contract — PC-2049, with its overland leg to Douala
   * — could not be reached from any session, and the two-country price case would have been
   * demonstrable in Ethiopia only.
   *
   * The values come from the Export profile for Chad and from the Ethiopia and Chad Execution
   * source: Renatus is the partner, the load port is Douala, the export contract applies and
   * the Ex-form and the logistics service request do not.
   *
   * [OPEN] The currency and the season window. XAF is the currency of the CEMAC zone Chad is
   * in and is stated as such; the season window is taken from Ethiopia's because no Chad
   * season is recorded in the workshop notes. Business confirmation required for both.
   */
  Chad: {
    name: 'Chad', currency: 'XAF', reportingCurrency: 'USD', calendar: 'Mon–Fri, Chad public holidays',
    season: '2025/26 season, Oct–Mar', language: 'French / Arabic', stepsNotApplicable: ['Ex-form', 'Logistics service request']
  },
  Tanzania: {
    name: 'Tanzania', currency: 'TZS', reportingCurrency: 'USD', calendar: 'Mon–Fri, Tanzania public holidays',
    season: '2025/26 season, Dec–May', language: 'English', stepsNotApplicable: ['Ex-contract', 'Ex-form', 'Logistics service request']
  },
  Mozambique: {
    name: 'Mozambique', currency: 'MZN', reportingCurrency: 'USD', calendar: 'Mon–Fri, Mozambique public holidays',
    season: '2025/26 season, Dec–May', language: 'Portuguese', stepsNotApplicable: ['Ex-contract', 'Ex-form', 'Logistics service request']
  }
};

/* ---------- WF-C2-02 — dashboard card catalogue ---------- */

export interface CardDef {
  key: string;
  title: string;
  owningModule: string;
  /** roles permitted to see the card; '*' means any role */
  roles: string[];
  drillTo: string;
  /** Internal Stakeholder dashboards are reporting-oriented — Step 4 */
  reportingOriented?: boolean;
}

export const CARD_CATALOGUE: CardDef[] = [
  { key: 'pending', title: 'My pending actions', owningModule: 'C2 Shell', roles: ['*'], drillTo: '/inbox' },
  { key: 'requests', title: 'Access requests', owningModule: 'C1 Identity and Access', roles: ['SYSTEM_ADMINISTRATOR', 'COUNTRY_MANAGER'], drillTo: '/c1/access-requests' },
  { key: 'reviews', title: 'Access reviews due', owningModule: 'C1 Identity and Access', roles: ['SYSTEM_ADMINISTRATOR', 'COUNTRY_MANAGER'], drillTo: '/c1/access-reviews' },
  { key: 'delegations', title: 'Delegations in force', owningModule: 'C1 Identity and Access', roles: ['*'], drillTo: '/c1/delegations' },
  { key: 'dormant', title: 'Dormant accounts', owningModule: 'C1 Identity and Access', roles: ['SYSTEM_ADMINISTRATOR'], drillTo: '/c1/dormant-accounts' },
  { key: 'recent', title: 'Recent records', owningModule: 'C2 Shell', roles: ['*'], drillTo: '/inbox' },
  { key: 'alerts', title: 'Alerts and announcements', owningModule: 'C5 Notifications', roles: ['*'], drillTo: '/inbox' },
  { key: 'ageing', title: 'Team task ageing', owningModule: 'C2 Shell', roles: ['SYSTEM_ADMINISTRATOR', 'COUNTRY_MANAGER'], drillTo: '/c2/team' },
  { key: 'throughput', title: 'Task throughput', owningModule: 'C2 Shell', roles: ['SYSTEM_ADMINISTRATOR', 'COUNTRY_MANAGER'], drillTo: '/c2/analytics', reportingOriented: true },
  { key: 'compliance', title: 'Compliance status', owningModule: 'C11 Reporting', roles: ['COMPLIANCE_OFFICER'], drillTo: '/c2/analytics', reportingOriented: true }
];

export const DEFAULT_LAYOUT_BY_ROLE: Record<string, string[]> = {
  SYSTEM_ADMINISTRATOR: ['pending', 'requests', 'reviews', 'delegations', 'dormant', 'recent', 'alerts'],
  COUNTRY_MANAGER: ['pending', 'requests', 'ageing', 'reviews', 'recent', 'alerts'],
  COMPLIANCE_OFFICER: ['compliance', 'throughput', 'alerts'],
  SOURCING_OFFICER: ['pending', 'recent', 'delegations', 'alerts'],
  EXECUTION_OFFICER: ['pending', 'delegations', 'alerts'],
  PROCESSING_SUPERVISOR: ['pending', 'delegations', 'alerts'],
  QUALITY_INSPECTOR: ['pending', 'alerts']
};

/* ---------- WF-C2-03 / Step 7 — manager team view ---------- */

/** direct report → manager */
export const REPORTS_TO: Record<string, string> = {
  'U-002': 'U-001',
  'U-003': 'U-001',
  'U-007': 'U-001',
  'U-009': 'U-001',
  'U-004': 'U-008'
};

/* ---------- WF-C2-03 / Step 8 — task analytics ---------- */

export interface TaskHistoryRec {
  id: string;
  type: string;
  step: string;
  sourceModule: string;
  assignee: string;
  raised: string;
  completed: string;
  days: number;
  slaDays: number;
  country: string;
}

/** Closed tasks retained for analytics. Volumes, completion times and bottlenecks derive from this plus live tasks. */
export const TASK_HISTORY: TaskHistoryRec[] = [
  { id: 'H-1', type: 'Approval request — access request', step: 'Country Manager approval', sourceModule: 'C1 Identity and Access', assignee: 'Grace Mensah', raised: '2026-07-01', completed: '2026-07-05', days: 4.0, slaDays: 2, country: 'Sudan' },
  { id: 'H-2', type: 'Approval request — access request', step: 'Administrator approval', sourceModule: 'C1 Identity and Access', assignee: 'Nasreen Sayed', raised: '2026-07-05', completed: '2026-07-06', days: 0.8, slaDays: 1, country: 'Sudan' },
  { id: 'H-3', type: 'Approval request — access request', step: 'Country Manager approval', sourceModule: 'C1 Identity and Access', assignee: 'Grace Mensah', raised: '2026-07-08', completed: '2026-07-13', days: 5.2, slaDays: 2, country: 'Mozambique' },
  { id: 'H-4', type: 'Approval request — role change', step: 'Compliance review', sourceModule: 'C1 Identity and Access', assignee: 'Fatima Idris', raised: '2026-07-09', completed: '2026-07-12', days: 3.1, slaDays: 2, country: 'Sudan' },
  { id: 'H-5', type: 'Approval request — role change', step: 'Administrator approval', sourceModule: 'C1 Identity and Access', assignee: 'Nasreen Sayed', raised: '2026-07-12', completed: '2026-07-12', days: 0.4, slaDays: 1, country: 'Sudan' },
  { id: 'H-6', type: 'Access review due', step: 'Country owner review', sourceModule: 'C1 Identity and Access', assignee: 'Grace Mensah', raised: '2026-02-01', completed: '2026-02-24', days: 23.0, slaDays: 28, country: 'Ethiopia' },
  { id: 'H-7', type: 'Amend and resubmit — returned request', step: 'Requester amendment', sourceModule: 'C1 Identity and Access', assignee: 'Nasreen Sayed', raised: '2026-06-14', completed: '2026-06-22', days: 8.0, slaDays: 5, country: 'Sudan' },
  { id: 'H-8', type: 'Amend and resubmit — returned request', step: 'Requester amendment', sourceModule: 'C1 Identity and Access', assignee: 'Ahmed Osman', raised: '2026-06-18', completed: '2026-06-25', days: 7.1, slaDays: 5, country: 'Sudan' },
  { id: 'H-9', type: 'Dormant account review', step: 'Administrator confirmation', sourceModule: 'C1 Identity and Access', assignee: 'Nasreen Sayed', raised: '2026-05-16', completed: '2026-05-18', days: 2.2, slaDays: 7, country: 'Sudan' },
  { id: 'H-10', type: 'Dormant account review', step: 'Administrator confirmation', sourceModule: 'C1 Identity and Access', assignee: 'Nasreen Sayed', raised: '2026-06-16', completed: '2026-06-17', days: 1.1, slaDays: 7, country: 'Ethiopia' },
  { id: 'H-11', type: 'Overdue periodic update', step: 'Responsible role update', sourceModule: 'C5 Notifications', assignee: 'Ahmed Osman', raised: '2026-07-20', completed: '2026-07-31', days: 11.0, slaDays: 5, country: 'Sudan' },
  { id: 'H-12', type: 'Overdue periodic update', step: 'Responsible role update', sourceModule: 'C5 Notifications', assignee: 'Meseret Alemu', raised: '2026-07-22', completed: '2026-07-30', days: 8.3, slaDays: 5, country: 'Ethiopia' },
  { id: 'H-13', type: 'Document renewal', step: 'Responsible role upload', sourceModule: 'C7 Documents', assignee: 'Yusuf Kamal', raised: '2026-06-02', completed: '2026-06-09', days: 7.4, slaDays: 10, country: 'Sudan' },
  { id: 'H-14', type: 'Document renewal', step: 'Responsible role upload', sourceModule: 'C7 Documents', assignee: 'Ahmed Osman', raised: '2026-07-02', completed: '2026-07-06', days: 4.0, slaDays: 10, country: 'Sudan' },
  { id: 'H-15', type: 'Approval request — access request', step: 'Country Manager approval', sourceModule: 'C1 Identity and Access', assignee: 'Grace Mensah', raised: '2026-08-01', completed: '2026-08-07', days: 6.1, slaDays: 2, country: 'Sudan' },
  { id: 'H-16', type: 'Approval request — role change', step: 'Compliance review', sourceModule: 'C1 Identity and Access', assignee: 'Fatima Idris', raised: '2026-08-03', completed: '2026-08-06', days: 2.9, slaDays: 2, country: 'Tanzania' }
];

/* ---------- WF-C2-04 — infocard objects ---------- */

export type ObjectKind =
  | 'Commodity' | 'Supplier' | 'Warehouse' | 'Facility' | 'Truck' | 'Container'
  | 'Vessel' | 'Contract' | 'Batch' | 'User';

export interface InfoObject {
  id: string;
  kind: ObjectKind;
  name: string;
  country: string;
  status: string;
  summary: [string, string][];
  statusDetail: [string, string][];
  documents: { name: string; type: string; validTo?: string; sensitive?: boolean }[];
  activity: { at: string; who: string; what: string }[];
  transactions: { ref: string; what: string; status: string }[];
  comments: { author: string; at: string; text: string; visibility: string }[];
  /** tabs the current user may not see — they are absent, not disabled (Step 4) */
  restrictedTabs?: string[];
}

export const INFO_OBJECTS: InfoObject[] = [
  {
    id: 'CMD-0007', kind: 'Commodity', name: 'Sesame — Hulled White', country: 'Sudan', status: 'Active',
    summary: [['Commodity group', 'Oilseeds'], ['Grade', 'Hulled White 99/1'], ['Packaging', '50 kg bags'], ['Unit of measure', 'MT'], ['Crop year', '2025/26']],
    statusDetail: [['Active in', 'Sudan, Ethiopia'], ['Open contracts', '4'], ['Quality parameters', 'Purity ≥ 99%, moisture ≤ 6%']],
    documents: [{ name: 'Quality specification.pdf', type: 'Certificate', validTo: '2027-03-31' }],
    activity: [{ at: '2026-08-12 09:15', who: 'Ahmed Osman', what: 'Quality parameter range amended (effective 2026-09-01)' }],
    transactions: [{ ref: 'P30000718-1', what: 'Purchase contract, 500 MT', status: 'Confirmed' }, { ref: 'S30000942-1', what: 'Sales contract, 500 MT', status: 'Confirmed' }],
    comments: [{ author: 'Yusuf Kamal', at: '2026-08-12 10:02', text: 'Purity band tightened at the buyer’s request.', visibility: 'Internal only' }]
  },
  {
    id: 'SUP-004821', kind: 'Supplier', name: 'Agrotem Trading LLC', country: 'Sudan', status: 'Active',
    summary: [['Party type', 'Supplier'], ['Registration', 'SD-882-114'], ['Tax identifier', 'TIN 447 992 118'], ['Contact', 'ops@agrotem.example'], ['Payment terms', 'Documents against acceptance']],
    statusDetail: [['Compliance status', 'Cleared 2026-04-02'], ['Portal user', 'Active'], ['Contract expiry', '2026-12-31']],
    documents: [{ name: 'Company registration.pdf', type: 'Company registration', validTo: '2027-01-31' }, { name: 'Supply agreement 2026.pdf', type: 'Commercial contract', sensitive: true }],
    activity: [{ at: '2026-08-10 07:55', who: 'Agrotem Trading (portal)', what: 'Portal sign-in' }],
    transactions: [{ ref: 'P30000718-1', what: 'Purchase contract, 500 MT sesame', status: 'Confirmed' }],
    comments: [],
    restrictedTabs: []
  },
  {
    id: 'WH-0142', kind: 'Warehouse', name: 'Port Sudan Warehouse 3', country: 'Sudan', status: 'Active',
    summary: [['Code', 'WH-0142'], ['City', 'Port Sudan'], ['Owned or rented', 'Rented'], ['Capacity', '6,400 m² / 9,000 MT'], ['Default product category', 'Oilseeds']],
    statusDetail: [['Current utilisation', '71%'], ['Rental agreement', 'Valid to 2027-06-30'], ['Open receipts', '2']],
    documents: [{ name: 'Rental agreement 2026-27.pdf', type: 'Rental agreement', validTo: '2027-06-30' }],
    activity: [{ at: '2026-08-15 14:40', who: 'Ahmed Osman', what: 'Capacity amended from 8,500 to 9,000 MT' }],
    transactions: [{ ref: 'CF7003166', what: 'Stock lot, 2,000 units', status: 'Allocated' }],
    comments: [{ author: 'Ahmed Osman', at: '2026-08-15 14:42', text: 'Capacity re-measured after the mezzanine was removed.', visibility: 'Internal only' }]
  },
  {
    id: 'FAC-0031', kind: 'Facility', name: 'Gedaref Cleaning and Grading Plant', country: 'Sudan', status: 'Active',
    summary: [['Type', 'Cleaning and grading'], ['Capacity per shift', '120 MT'], ['Supervisor', 'Salma Bakri'], ['Default commodity', 'Sesame — Hulled White']],
    statusDetail: [['Shifts running', '2 of 3'], ['Service contract', 'Valid to 2027-03-31']],
    documents: [{ name: 'Service contract.pdf', type: 'Service agreement', validTo: '2027-03-31' }],
    activity: [{ at: '2026-08-05 11:20', who: 'Salma Bakri', what: 'Shift pattern changed to two shifts' }],
    transactions: [{ ref: 'BATCH-26-0442', what: 'Processing batch, 118 MT', status: 'In Progress' }],
    comments: []
  },
  {
    id: 'TRK-2210', kind: 'Truck', name: 'Truck SD-2210 (Accurate Logistics)', country: 'Sudan', status: 'Active',
    summary: [['Registration', 'SD-2210'], ['Transporter', 'Accurate Logistics'], ['Capacity', '32 MT'], ['Axles', '4']],
    statusDetail: [['Current movement', 'Gedaref → Port Sudan'], ['Insurance', 'Valid to 2026-11-30']],
    documents: [{ name: 'Insurance certificate.pdf', type: 'Certificate', validTo: '2026-11-30' }],
    activity: [{ at: '2026-08-17 05:40', who: 'Service identity (Odoo)', what: 'Movement status updated through integration' }],
    transactions: [{ ref: 'MOV-88213', what: 'Inland movement, 30 MT', status: 'In Progress' }],
    comments: []
  },
  {
    id: 'CNT-MSKU4471820', kind: 'Container', name: 'Container MSKU 447182-0', country: 'Sudan', status: 'Confirmed',
    summary: [['Container number', 'MSKU 447182-0'], ['Basis', 'FCL/FCL'], ['Type', "20' dry"], ['Seal number', 'SL-771204'], ['Tare / net', '2.2 MT / 27.8 MT']],
    statusDetail: [['Stuffing', 'Completed 2026-08-14'], ['Port of shipment', 'Port Sudan'], ['Port of discharge', 'Jeddah']],
    documents: [{ name: 'Stuffing photographs.zip', type: 'Inspection report' }, { name: 'Seal record.pdf', type: 'Inspection report' }],
    activity: [{ at: '2026-08-14 16:05', who: 'Meseret Alemu', what: 'Seal number recorded' }],
    transactions: [{ ref: 'SO500675', what: 'Shipment advice', status: 'Invoiced' }],
    comments: []
  },
  {
    id: 'VSL-ALSJUPITER', kind: 'Vessel', name: 'MV ALS Jupiter — Voyage VY1104', country: 'Sudan', status: 'In Progress',
    summary: [['Vessel', 'ALS Jupiter'], ['Voyage', 'VY1104'], ['Shipping line', 'Accurate Logistics'], ['Port of loading', 'Port Sudan'], ['Port of discharge', 'Jeddah']],
    statusDetail: [['ETD', '2026-08-20'], ['ETA', '2026-08-24'], ['Containers booked', '18']],
    documents: [{ name: 'Booking confirmation.pdf', type: 'Commercial contract', sensitive: true }],
    activity: [{ at: '2026-08-18 02:00', who: 'Service identity (vessel tracking)', what: 'Position update — later phase interface' }],
    transactions: [{ ref: 'SO500675', what: 'Shipment advice, 18 containers', status: 'Invoiced' }],
    comments: [],
    restrictedTabs: ['Related documents']
  },
  {
    id: 'P30000718-1', kind: 'Contract', name: 'Purchase Contract P30000718-1', country: 'Sudan', status: 'Confirmed',
    summary: [['Counterparty', 'Agrotem Trading LLC'], ['Commodity', 'Sesame — Hulled White'], ['Quantity', '500 MT'], ['Incoterm', 'FOB Port Sudan'], ['Shipment month', 'Sep 2026']],
    statusDetail: [['Execution status', 'Allocated'], ['Allocated', '500 of 500 MT'], ['Shipped', '0 MT'], ['Invoiced', 'No']],
    documents: [{ name: 'Signed contract.pdf', type: 'Commercial contract', sensitive: true }, { name: 'Quality certificate.pdf', type: 'Certificate', validTo: '2026-12-31' }],
    activity: [{ at: '2026-08-02 08:40', who: 'Ahmed Osman', what: 'Contract confirmed' }, { at: '2026-08-02 09:10', who: 'Ahmed Osman', what: 'Allocation completed' }],
    transactions: [{ ref: 'CF7003166', what: 'Stock allocation, 2,000 units', status: 'Allocated' }, { ref: 'SO500675', what: 'Shipment advice', status: 'Invoiced' }],
    comments: [{ author: 'Grace Mensah', at: '2026-08-02 10:00', text: 'Approved at contract review. Quality band confirmed with the buyer.', visibility: 'Internal only' }],
    restrictedTabs: []
  },
  {
    id: 'BATCH-26-0442', kind: 'Batch', name: 'Batch 26/SES/GDF/0442', country: 'Sudan', status: 'In Progress',
    summary: [['Batch code', '26/SES/GDF/0442'], ['Season', '2025/26'], ['Commodity', 'Sesame — Hulled White'], ['Supplier', 'Agrotem Trading LLC'], ['Quantity', '118 MT']],
    statusDetail: [['Facility', 'Gedaref Cleaning and Grading Plant'], ['Processing stage', 'Grading'], ['Quality reference', 'QC-26-1183']],
    documents: [{ name: 'Grading report.pdf', type: 'Inspection report' }],
    activity: [{ at: '2026-08-16 13:25', who: 'Yusuf Kamal', what: 'Grading result recorded' }],
    transactions: [{ ref: 'P30000718-1', what: 'Purchase contract', status: 'Confirmed' }],
    comments: []
  }
];

/* ---------- WF-C2-04 / Step 7 — module help content ---------- */

export interface ModuleHelp {
  code: string;
  title: string;
  description: string;
  functions: string[];
  updated: string;
}

export const MODULE_HELP: ModuleHelp[] = [
  { code: 'C1', title: 'Identity and Access Management', updated: '2026-08-18', description: 'Establishes who the user is, confirms they are entitled to use the system, and determines precisely what they may see and do — across three user types, multiple countries and all modules.', functions: ['WF-C1-01 Login and Session Establishment', 'WF-C1-02 User Provisioning and Lifecycle', 'WF-C1-03 Role, Permission and Access Scope Management', 'WF-C1-04 Delegation and Absence Cover', 'WF-C1-05 Periodic Access Review'] },
  { code: 'C2', title: 'Application Shell, Navigation and Task Inbox', updated: '2026-08-18', description: 'Provides the consistent frame within which every module operates: country-first navigation, role-based home page, the personal action inbox, the reusable infocard, global search and in-context help.', functions: ['WF-C2-01 Country Context and Navigation', 'WF-C2-02 Home Page and Dashboards', 'WF-C2-03 Actions Inbox and Task Management', 'WF-C2-04 Infocard, Global Search and Help'] },
  { code: 'C3', title: 'Master Data Management', updated: '2026-08-18', description: 'Provides governed, consistent reference data that every other module points to, so that operational records, costing, reporting and integration all describe the same things in the same way.', functions: ['WF-C3-01 Create and Approve Master Data', 'WF-C3-02 Amend, Effective-Date and Deactivate', 'WF-C3-03 Bulk Load and External Mapping'] },
  { code: 'C4', title: 'Approval Workflow', updated: '2026-08-18', description: 'One reusable approval engine used by every module, covering the simple approve-or-reject decision and multi-step, multi-department routes, with escalation and a complete decision history.', functions: ['WF-C4-01 Standard Approval Cycle', 'WF-C4-02 Escalation and Exception Handling', 'WF-C4-03 Approval Route Configuration'] },
  { code: 'C5', title: 'Notifications and Alerts', updated: '2026-08-18', description: 'Delivers the right message to the right person through the right channel, for both event-driven and time-driven triggers, including recipients outside the group directory.', functions: ['WF-C5-01 Event-Driven Notifications', 'WF-C5-02 Time-Based Notifications and Automated Jobs', 'WF-C5-03 Template, Preference and Channel Administration'] },
  { code: 'C6', title: 'Comments and Collaboration on Records', updated: '2026-08-18', description: 'Provides a single consistent way to hold a discussion against any record, so that context, decisions and clarifications stay attached to the transaction rather than living in email.', functions: ['WF-C6-01 Commenting on Records', 'WF-C6-02 Comments within Approvals and Exceptions'] },
  { code: 'C7', title: 'File and Document Management', updated: '2026-08-18', description: 'Captures, classifies, stores, versions and controls access to every file the operation depends on, and makes document completeness a controllable part of each process step.', functions: ['WF-C7-01 Upload, Classification and Extraction', 'WF-C7-02 Access, Retrieval and Document Register', 'WF-C7-03 Validity, Expiry and Retention'] },
  { code: 'C8', title: 'Audit Trail and Activity History', updated: '2026-08-18', description: 'Maintains a complete, immutable record of who did what, when and from where, so that any transaction can be reconstructed and any dispute investigated. Business activity only — technical events are in C9.', functions: ['WF-C8-01 Capturing an Audit Entry', 'WF-C8-02 Using the Audit Trail', 'WF-C8-03 Retention, Archiving and Trimming'] },
  { code: 'C9', title: 'System Logging and Monitoring', updated: '2026-08-18', description: 'Captures technical events — errors, integration exchanges and scheduled job execution — so the system can be supported, diagnosed and kept available. Distinct from C8, which records business data changes.', functions: ['WF-C9-01 Logging and Error Handling', 'WF-C9-02 Integration and Job Logging', 'WF-C9-03 Monitoring and Retention'] },
  { code: 'C10', title: 'System Configuration and Administration', updated: '2026-08-18', description: 'Makes the system configuration-driven, so that country and business variation is handled by configuration under change control rather than by code changes or parallel screens.', functions: ['WF-C10-01 Configuring a Country', 'WF-C10-02 Business Rules, Formulas and Localisation', 'WF-C10-03 Configuration Change Control'] },
  { code: 'C11', title: 'Reporting and Dashboards', updated: '2026-08-18', description: 'Provides the reporting engine as a core capability, while the reports and dashboards themselves are owned and delivered by each module, plus a shared reporting area.', functions: ['WF-C11-01 Running a Report', 'WF-C11-02 Dashboards and Scheduled Distribution'] },
  { code: 'C12', title: 'Integration Layer', updated: '2026-08-18', description: 'Manages every connection to systems outside COTS in a consistent, logged and recoverable way, so that integration failures are visible, correctable and never silent.', functions: ['WF-C12-01 Standard Integration Exchange', 'WF-C12-02 Interfaces in Scope', 'WF-C12-03 Reconciliation and Control'] }
];

/** WF-C2-01 / Step 6 — sub-module tier. Only C1 is built; the rest declare their tier without screens. */
export const SUB_MODULES: Record<string, { label: string; route?: string }[]> = {
  C1: [
    { label: 'Access Requests', route: '/c1/access-requests' },
    { label: 'User Register', route: '/c1/users' },
    { label: 'Permission Catalogue', route: '/c1/permissions' },
    { label: 'Role Catalogue', route: '/c1/roles' },
    { label: 'Active Directory Group Mapping', route: '/c1/ad-mapping' },
    { label: 'Effective Permission Viewer', route: '/c1/effective-permissions' },
    { label: 'Delegations', route: '/c1/delegations' },
    { label: 'Access Reviews', route: '/c1/access-reviews' },
    { label: 'Dormant Accounts', route: '/c1/dormant-accounts' }
  ],
  C2: [
    { label: 'Home', route: '/home' },
    { label: 'Actions Inbox', route: '/inbox' },
    { label: 'Team View', route: '/c2/team' },
    { label: 'Task Analytics', route: '/c2/analytics' }
  ],
  C3: [
    { label: 'Domains', route: '/c3/domains' },
    { label: 'Warehouses', route: '/c3/domains/warehouse' },
    { label: 'Suppliers', route: '/c3/domains/supplier' },
    { label: 'Commodities', route: '/c3/domains/commodity' },
    { label: 'Exchange rates', route: '/c3/domains/fxrate' },
    /* Added 8 September 2026 with the two payment domains. This strip is a shortcut list, not
       the domain list — every domain is reachable through Domains, and only the ones modelled
       in full have a chip here. Both new domains are modelled in full, so both get one, and
       payment terms are now where someone looking for them under Master Data would look. */
    { label: 'Payment terms', route: '/c3/domains/paymentterm' },
    { label: 'Payment instruments', route: '/c3/domains/paymentinstrument' },
    { label: 'Bulk load', route: '/c3/bulk-load' },
    { label: 'External mapping', route: '/c3/mapping' }
  ],
  C4: [
    { label: 'My Approvals', route: '/c4/approvals' },
    { label: 'Submission Check', route: '/c4/submission-check' },
    { label: 'Service Levels and Escalation', route: '/c4/sla' },
    { label: 'Approval Routes', route: '/c4/routes' }
  ],
  C5: [
    { label: 'Notification Rules', route: '/c5/rules' },
    { label: 'Delivery Log', route: '/c5/deliveries' },
    { label: 'Templates', route: '/c5/templates' },
    { label: 'Channels and Quiet Hours', route: '/c5/channels' },
    { label: 'Automated Jobs', route: '/c5/jobs' },
    { label: 'Overdue Updates', route: '/c5/overdue' },
    { label: 'My Notification Preferences', route: '/c5/preferences' },
    { label: 'My Subscriptions', route: '/c5/subscriptions' }
  ],
  C6: [
    { label: 'Discussions', route: '/c6/discussions' },
    { label: 'Exception Threads', route: '/c6/discussions' },
    { label: 'Comment Search', route: '/c6/discussions' }
  ],
  C7: [
    { label: 'Document Register', route: '/c7/register' },
    { label: 'Document Expiry', route: '/c7/expiry' },
    { label: 'Retention and Archive', route: '/c7/retention' }
  ],
  C8: [
    { label: 'Audit Search', route: '/c8/search' },
    { label: 'Sensitive Actions Monitor', route: '/c8/monitor' },
    { label: 'Audit Configuration', route: '/c8/configuration' },
    { label: 'Retention and Volume', route: '/c8/retention' }
  ],
  C9: [
    { label: 'System Health', route: '/c9' },
    { label: 'Incidents', route: '/c9/incidents' },
    { label: 'Exchange Log', route: '/c9/exchanges' },
    { label: 'Error Queue', route: '/c9/error-queue' },
    { label: 'Job Log', route: '/c9/jobs' },
    { label: 'Log Levels', route: '/c9/levels' },
    { label: 'Monitoring Thresholds', route: '/c9/thresholds' },
    { label: 'Log Retention and Export', route: '/c9/retention' }
  ],
  C10: [
    { label: 'Countries', route: '/c10/countries' },
    { label: 'Numbering Series', route: '/c10/numbering' },
    { label: 'Coding Formulas', route: '/c10/formulas' },
    { label: 'Thresholds and Tolerances', route: '/c10/thresholds' },
    { label: 'Translations', route: '/c10/translations' },
    { label: 'Regional Formats', route: '/c10/formats' },
    { label: 'Configuration Changes', route: '/c10/changes' },
    { label: 'Version History', route: '/c10/versions' },
    { label: 'Configuration Report', route: '/c10/report' }
  ],
  C11: [
    { label: 'Reports', route: '/c11/reports' },
    { label: 'Saved Views', route: '/c11/views' },
    { label: 'Dashboard Cards', route: '/c11/cards' },
    { label: 'Role Default Dashboards', route: '/c11/role-dashboards' },
    { label: 'Schedules', route: '/c11/schedules' },
    { label: 'Distribution Log', route: '/c11/distribution' }
  ],
  C12: [
    { label: 'Interface Register', route: '/c12/interfaces' },
    { label: 'Interfaces in Scope', route: '/c12/scope' },
    { label: 'Exchange Log', route: '/c12/exchanges' },
    { label: 'Error Queue', route: '/c12/error-queue' },
    { label: 'Reconciliation', route: '/c12/reconciliation' },
    { label: 'Interface Health', route: '/c12/health' },
    { label: 'Credentials', route: '/c12/credentials' }
  ]
};

/** Ageing buckets for the manager view — WF-C2-03 / Step 7 */
export const AGEING_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: '0–2 days', min: 0, max: 2 },
  { label: '3–5 days', min: 3, max: 5 },
  { label: '6–10 days', min: 6, max: 10 },
  { label: 'Over 10 days', min: 11, max: 9999 }
];

/** Chart status palette — validated in both light and dark mode. Overdue first so green never sits beside orange. */
export const CHART_STATUS = [
  { key: 'Overdue', colour: '#D9660B' },
  { key: 'Open', colour: '#0F79C4' },
  { key: 'Closed', colour: '#1E7B4F' }
];
