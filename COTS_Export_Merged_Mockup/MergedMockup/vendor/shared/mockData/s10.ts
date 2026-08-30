// S10 Team Directory and Organisation Structure demonstration data. Prototype only.
// PROPOSAL STAGE. A proposal was requested from IT.
// No corporate directory integration, no real identity — the external source is SIMULATED and labelled.

export type NodeType = 'Company' | 'Country' | 'Department' | 'Operational area';

export type OrgNode = {
  id: string;
  name: string;
  type: NodeType;
  parent?: string;
  code: string;
  administrator?: string;   // person id — country nodes carry the named administrator
  active: boolean;
  closureDate?: string;
};

export const ORG_NODES: OrgNode[] = [
  { id: 'N-1', name: 'Dal Agriculture', type: 'Company', code: 'DAL-AGR', active: true },

  { id: 'N-10', name: 'Sudan', type: 'Country', parent: 'N-1', code: 'SD', administrator: 'P-1', active: true },
  { id: 'N-11', name: 'Operations', type: 'Department', parent: 'N-10', code: 'SD-OPS', active: true },
  { id: 'N-12', name: 'Gedaref Processing', type: 'Operational area', parent: 'N-11', code: 'SD-PRC-GD', active: true },
  { id: 'N-13', name: 'Port Sudan Execution', type: 'Operational area', parent: 'N-11', code: 'SD-EXE-PS', active: true },
  { id: 'N-14', name: 'Quality and Compliance', type: 'Department', parent: 'N-10', code: 'SD-QC', active: true },
  { id: 'N-15', name: 'Gedaref Quality', type: 'Operational area', parent: 'N-14', code: 'SD-QUA-GD', active: true },
  { id: 'N-16', name: 'Commercial', type: 'Department', parent: 'N-10', code: 'SD-COM', active: true },
  { id: 'N-17', name: 'Kassala Sourcing', type: 'Operational area', parent: 'N-11', code: 'SD-SRC-KS', active: false, closureDate: '30-Jun-2026' },

  { id: 'N-20', name: 'Ethiopia', type: 'Country', parent: 'N-1', code: 'ET', administrator: 'P-8', active: true },
  { id: 'N-21', name: 'Operations', type: 'Department', parent: 'N-20', code: 'ET-OPS', active: true },
  { id: 'N-22', name: 'Humera Processing', type: 'Operational area', parent: 'N-21', code: 'ET-PRC-HU', active: true },
  { id: 'N-23', name: 'Djibouti Execution', type: 'Operational area', parent: 'N-21', code: 'ET-EXE-DJ', active: true },

  // Chad has NO named administrator — a deliberate, visible gap
  { id: 'N-30', name: 'Chad', type: 'Country', parent: 'N-1', code: 'TD', active: true },
  { id: 'N-31', name: 'Operations', type: 'Department', parent: 'N-30', code: 'TD-OPS', active: true },
  { id: 'N-32', name: 'Moundou Processing', type: 'Operational area', parent: 'N-31', code: 'TD-PRC-MO', active: true },
];

export type ContactType = 'Internal' | 'Operational contact' | 'External partner';

export type Person = {
  id: string;
  name: string;
  position: string;
  telephone: string;
  email: string;
  jobDescription: string;
  areaId: string;
  contactType: ContactType;
  /** C1 account, where the person is a system user */
  userAccount?: string;
  active: boolean;
  leftOn?: string;
  initials: string;
};

export const PEOPLE: Person[] = [
  { id: 'P-1', name: 'Ahmed Elhassan', position: 'Country Manager', telephone: '+249 912 004 118', email: 'a.elhassan@dalgroup.com', jobDescription: 'Accountable for the Sudan operation and the country approval authority.', areaId: 'N-10', contactType: 'Internal', userAccount: 'aelhassan', active: true, initials: 'AE' },
  { id: 'P-2', name: 'Mohamed Yousif', position: 'Execution Manager', telephone: '+249 912 774 902', email: 'm.yousif@dalgroup.com', jobDescription: 'Manages port execution, stuffing and vessel operations at Port Sudan.', areaId: 'N-13', contactType: 'Internal', userAccount: 'myousif', active: true, initials: 'MY' },
  { id: 'P-3', name: 'Sara Ali', position: 'Quality Manager', telephone: '+249 900 331 447', email: 's.ali@dalgroup.com', jobDescription: 'Owns inspection programmes, non-conformities and quality release at Gedaref.', areaId: 'N-15', contactType: 'Internal', userAccount: 'sali', active: true, initials: 'SA' },
  { id: 'P-4', name: 'Hala Osman', position: 'Commercial Manager', telephone: '+249 918 220 165', email: 'h.osman@dalgroup.com', jobDescription: 'Commercial contracts, buyer relationships and claim registration.', areaId: 'N-16', contactType: 'Internal', userAccount: 'hosman', active: true, initials: 'HO' },
  { id: 'P-5', name: 'Musa Idris', position: 'Processing Supervisor', telephone: '+249 915 887 003', email: 'm.idris@dalgroup.com', jobDescription: 'Runs the cleaning and grading lines at Gedaref.', areaId: 'N-12', contactType: 'Internal', userAccount: 'midris', active: true, initials: 'MI' },
  // an operational contact who is NOT a system user — matters where not every contact has an account
  { id: 'P-6', name: 'Osman Bakheit', position: 'Gedaref Store Keeper', telephone: '+249 911 452 780', email: 'o.bakheit@dalgroup.com', jobDescription: 'Day-to-day custody of Gedaref Store 1; not a COTS user.', areaId: 'N-12', contactType: 'Operational contact', active: true, initials: 'OB' },
  { id: 'P-7', name: 'Nadia Salih', position: 'Compliance Manager', telephone: '+249 900 776 512', email: 'n.salih@dalgroup.com', jobDescription: 'Variance cases, reconciliation and the monitoring duties.', areaId: 'N-14', contactType: 'Internal', userAccount: 'nsalih', active: true, initials: 'NS' },
  { id: 'P-8', name: 'Tesfaye Bekele', position: 'Country Manager', telephone: '+251 911 220 447', email: 't.bekele@dalgroup.com', jobDescription: 'Accountable for the Ethiopia operation.', areaId: 'N-20', contactType: 'Internal', userAccount: 'tbekele', active: true, initials: 'TB' },
  { id: 'P-9', name: 'Meron Haile', position: 'Execution Manager', telephone: '+251 913 664 209', email: 'm.haile@dalgroup.com', jobDescription: 'Djibouti corridor execution and clearance.', areaId: 'N-23', contactType: 'Internal', userAccount: 'mhaile', active: true, initials: 'MH' },
  // a leaver still assigned to a role — a deliberate risk-report case
  { id: 'P-10', name: 'Kamal Nour', position: 'Finance Manager', telephone: '+249 912 118 664', email: 'k.nour@dalgroup.com', jobDescription: 'Left the business on 31-Jul-2026.', areaId: 'N-10', contactType: 'Internal', userAccount: 'knour', active: false, leftOn: '31-Jul-2026', initials: 'KN' },
  // an external partner — included so the unresolved question is visible
  { id: 'P-11', name: 'Yusuf Kanoo', position: 'Clearing Agent — Port Sudan', telephone: '+249 900 118 224', email: 'yusuf@kanooclearing.example', jobDescription: 'Third-party clearing agent used at Port Sudan.', areaId: 'N-13', contactType: 'External partner', active: true, initials: 'YK' },
  { id: 'P-12', name: 'Amir Deby', position: 'Processing Supervisor', telephone: '+235 660 118 002', email: 'a.deby@dalgroup.com', jobDescription: 'Runs the Moundou processing line.', areaId: 'N-32', contactType: 'Operational contact', active: true, initials: 'AD' },
];

/** C1 accounts with no directory entry — they cannot be resolved from a role. */
export const UNLINKED_ACCOUNTS = ['fahmed', 'rosman'];

export type Role = {
  id: string;
  name: string;
  scope: 'Country' | 'Operational area';
  /** what actually stops when this role does not resolve */
  usedBy: { label: string; to?: string }[];
};

export const ROLES: Role[] = [
  {
    id: 'R-1', name: 'Compliance Manager', scope: 'Country',
    usedBy: [{ label: 'S04 adjustment approval — first approver', to: '/s04/cases' }, { label: 'S04 reconciliation sign-off', to: '/s04/reconciliation' }],
  },
  {
    id: 'R-2', name: 'Head of Department', scope: 'Country',
    usedBy: [{ label: 'S04 adjustment approval — second approver', to: '/s04/cases' }, { label: 'S01 warehouse request approval', to: '/s01/warehouse' }],
  },
  {
    id: 'R-3', name: 'Finance Manager', scope: 'Country',
    usedBy: [{ label: 'S04 adjustment approval — final approver', to: '/s04/cases' }, { label: 'S07 claims approval above USD 25,000', to: '/s07' }],
  },
  {
    id: 'R-4', name: 'Head of Commercial', scope: 'Country',
    usedBy: [{ label: 'S07 claims approval USD 5,001 – 25,000', to: '/s07' }],
  },
  {
    id: 'R-5', name: 'Quality Manager', scope: 'Operational area',
    usedBy: [{ label: 'S03 non-conformity resolution', to: '/s03/ncs' }, { label: 'S03 quality release', to: '/s03' }],
  },
  {
    id: 'R-6', name: 'Execution Manager', scope: 'Operational area',
    usedBy: [{ label: 'S05 service request approval', to: '/s05/requests' }, { label: 'S05 clearance follow-up', to: '/s05/clearance' }],
  },
  {
    id: 'R-7', name: 'Warehouse Custodian', scope: 'Operational area',
    usedBy: [{ label: 'S01 warehouse request — notification only', to: '/s01/warehouse' }, { label: 'S06 stock condition notification', to: '/s06/stock' }],
  },
];

export type Assignment = {
  roleId: string;
  country: string;
  areaId?: string;
  personId: string;
  effectiveFrom: string;
  effectiveTo?: string;
};

export const ASSIGNMENTS: Assignment[] = [
  { roleId: 'R-1', country: 'Sudan', personId: 'P-7', effectiveFrom: '01-Jan-2026' },
  { roleId: 'R-2', country: 'Sudan', personId: 'P-1', effectiveFrom: '01-Jan-2026' },
  // Finance Manager Sudan is assigned to a LEAVER — condition three on the risk report
  { roleId: 'R-3', country: 'Sudan', personId: 'P-10', effectiveFrom: '01-Jan-2026' },
  { roleId: 'R-4', country: 'Sudan', personId: 'P-4', effectiveFrom: '01-Jan-2026' },
  { roleId: 'R-5', country: 'Sudan', areaId: 'N-15', personId: 'P-3', effectiveFrom: '01-Jan-2026' },
  { roleId: 'R-6', country: 'Sudan', areaId: 'N-13', personId: 'P-2', effectiveFrom: '01-Feb-2026' },
  // Warehouse Custodian Gedaref is held by a person with NO system account — condition two
  { roleId: 'R-7', country: 'Sudan', areaId: 'N-12', personId: 'P-6', effectiveFrom: '01-Mar-2026' },

  { roleId: 'R-1', country: 'Ethiopia', personId: 'P-8', effectiveFrom: '01-Mar-2026' },
  { roleId: 'R-2', country: 'Ethiopia', personId: 'P-8', effectiveFrom: '01-Mar-2026' },
  { roleId: 'R-6', country: 'Ethiopia', areaId: 'N-23', personId: 'P-9', effectiveFrom: '01-Mar-2026' },
  // Ethiopia has no Finance Manager and no Head of Commercial — condition one

  // Chad has nothing at all, and no country administrator either
];

/** A superseded assignment, so "who held the role in July" is answerable. */
export const HISTORIC_ASSIGNMENTS: Assignment[] = [
  { roleId: 'R-1', country: 'Sudan', personId: 'P-1', effectiveFrom: '01-Jul-2025', effectiveTo: '31-Dec-2025' },
  { roleId: 'R-6', country: 'Sudan', areaId: 'N-13', personId: 'P-5', effectiveFrom: '01-Jan-2026', effectiveTo: '31-Jan-2026' },
];

export type Leadership = {
  id: string;
  areaId: string;
  team: string;
  contactPersonId: string;
  deputyPersonId?: string;
  effectiveFrom: string;
  superseded?: boolean;
};

export const LEADERSHIP: Leadership[] = [
  { id: 'L-1', areaId: 'N-13', team: 'Port Execution Team', contactPersonId: 'P-2', deputyPersonId: 'P-11', effectiveFrom: '01-Jul-2026' },
  { id: 'L-0', areaId: 'N-13', team: 'Port Execution Team', contactPersonId: 'P-5', effectiveFrom: '01-Jan-2026', superseded: true },
  { id: 'L-2', areaId: 'N-15', team: 'Gedaref Quality Team', contactPersonId: 'P-3', effectiveFrom: '01-Jan-2026' },
  { id: 'L-3', areaId: 'N-12', team: 'Gedaref Processing Team', contactPersonId: 'P-5', deputyPersonId: 'P-6', effectiveFrom: '01-Jan-2026' },
  { id: 'L-4', areaId: 'N-23', team: 'Djibouti Corridor Team', contactPersonId: 'P-9', effectiveFrom: '01-Mar-2026' },
  // N-22 Humera Processing and N-32 Moundou Processing have NO leading team — shown as rows, not omitted
];

export type AuditEntry = {
  when: string;
  who: string;
  record: string;
  change: string;
  affectsResolution: string;
};

export const STRUCTURE_AUDIT: AuditEntry[] = [
  { when: '14-Aug-2026 09:12', who: 'Ahmed Elhassan (Sudan administrator)', record: 'Area: Port Sudan Execution', change: 'Leading team contact: Musa Idris → Mohamed Yousif', affectsResolution: 'Yes — Execution Manager, Port Sudan Execution' },
  { when: '31-Jul-2026 16:40', who: 'Ahmed Elhassan (Sudan administrator)', record: 'Person: Kamal Nour', change: 'Active indicator: Active → Inactive (left 31-Jul-2026)', affectsResolution: 'Yes — Finance Manager, Sudan is now held by an inactive person' },
  { when: '30-Jun-2026 11:05', who: 'Ahmed Elhassan (Sudan administrator)', record: 'Area: Kassala Sourcing', change: 'Active: Yes → No, closure date 30-Jun-2026', affectsResolution: 'No — no role was assigned at that area' },
  { when: '01-Mar-2026 08:30', who: 'System administrator', record: 'Country: Ethiopia', change: 'Named administrator set to Tesfaye Bekele', affectsResolution: 'Yes — country administrator for Ethiopia' },
  { when: '01-Feb-2026 10:15', who: 'Ahmed Elhassan (Sudan administrator)', record: 'Assignment: Execution Manager, Port Sudan Execution', change: 'Holder: Musa Idris → Mohamed Yousif, effective 01-Feb-2026', affectsResolution: 'Yes — Execution Manager, Port Sudan Execution' },
];

/** Which attributes are mandatory — §S10.4 configuration point. */
export const MANDATORY_ATTRIBUTES = [
  { attribute: 'Name', mandatory: true, fixed: true },
  { attribute: 'Position', mandatory: true, fixed: true },
  { attribute: 'Telephone', mandatory: true, fixed: false },
  { attribute: 'Email', mandatory: true, fixed: false },
  { attribute: 'Job description', mandatory: false, fixed: false },
  { attribute: 'Profile picture', mandatory: false, fixed: false },
];

/** Structure depth — §S10.4 configuration point. */
export const CONFIGURED_DEPTH = 4;

export const personById = (id?: string) => PEOPLE.find((p) => p.id === id);
export const nodeById = (id?: string) => ORG_NODES.find((n) => n.id === id);

/** The country a node sits in, walking up the parents. */
export const countryOf = (nodeId?: string): string => {
  let n = nodeById(nodeId);
  const guard = new Set<string>();
  while (n && n.type !== 'Country') {
    if (guard.has(n.id)) break;
    guard.add(n.id);
    n = nodeById(n.parent);
  }
  return n?.name ?? '—';
};

/** The path from the node up to the company — used by the resolution trace. */
export const pathOf = (nodeId?: string): string[] => {
  const out: string[] = [];
  let n = nodeById(nodeId);
  const guard = new Set<string>();
  while (n) {
    if (guard.has(n.id)) break;
    guard.add(n.id);
    out.push(`${n.type}: ${n.name}`);
    n = nodeById(n.parent);
  }
  return out;
};
