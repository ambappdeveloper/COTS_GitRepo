// S11 Knowledge Portal demonstration data. Prototype only — resets on refresh.
// PROPOSAL STAGE, and the least defined module in the layer: §S11 records that it was listed in the
// workshop module structure but never described in detail. The material below is drawn ONLY from what
// the requirement documents already name — nothing has been invented to fill the library.

export type MaterialType = 'Protocol' | 'Procedure' | 'Matrix' | 'Template' | 'Form' | 'Report format' | 'Help content';

/** §S11.4 — material types, which require approval, and the review cycle per type. */
export const MATERIAL_TYPES: {
  type: MaterialType;
  requiresApproval: boolean;
  reviewMonths: number;
  reason: string;
}[] = [
  { type: 'Protocol', requiresApproval: true, reviewMonths: 12, reason: 'Governs how work is performed' },
  { type: 'Procedure', requiresApproval: true, reviewMonths: 12, reason: 'Governs how work is performed' },
  { type: 'Matrix', requiresApproval: true, reviewMonths: 6, reason: 'Governs a decision at the point of work' },
  { type: 'Template', requiresApproval: false, reviewMonths: 24, reason: 'A format, not a rule' },
  { type: 'Form', requiresApproval: false, reviewMonths: 24, reason: 'A format, not a rule' },
  { type: 'Report format', requiresApproval: false, reviewMonths: 24, reason: 'A format, not a rule' },
  { type: 'Help content', requiresApproval: true, reviewMonths: 12, reason: 'Shown in the application as guidance' },
];

/** §S11.4 — where each material type is surfaced. The three the source names are LIVE in this prototype. */
export const PLACEMENTS: {
  type: MaterialType;
  placement: string;
  route: string;
  filter: string;
  live: boolean;
}[] = [
  { type: 'Protocol', placement: 'S05 stuffing and service request screen', route: '/s05/requests', filter: 'By country and commodity', live: true },
  { type: 'Matrix', placement: 'S05 clearance and execution screen', route: '/s05/clearance', filter: 'By country', live: true },
  { type: 'Procedure', placement: 'S04 variance case workspace', route: '/s04/cases', filter: 'By country and module', live: true },
  { type: 'Form', placement: 'S03 inspection screens', route: '/s03/inspections', filter: 'By country and control point', live: true },
  { type: 'Template', placement: 'S05 clearance screen', route: '/s05/clearance', filter: 'By country', live: true },
  { type: 'Report format', placement: 'Not configured — library only', route: '', filter: '—', live: false },
];

export type ItemStatus = 'Published' | 'Pending approval' | 'Returned to owner' | 'Superseded' | 'Withdrawn';

export type ReferenceItem = {
  id: string;
  code: string;          // stable across versions
  title: string;
  type: MaterialType;
  country: string;       // 'All countries' or a country name
  module: string;
  ownerId: string;       // S10 person
  version: string;
  effectiveFrom: string;
  effectiveTo?: string;  // set when superseded
  reviewDate: string;
  status: ItemStatus;
  file: string;
  commodity?: string;    // used by the placement filter
  approval?: { approver: string; decision: 'Approved' | 'Returned'; date: string; justification: string };
  consultations: number;
  withdrawnOn?: string;
  withdrawnReason?: string;
};

export const ITEMS: ReferenceItem[] = [
  // ---- stuffing protocol, with a superseded previous version
  {
    id: 'I-1', code: 'KB-0031', title: 'Sesame stuffing protocol', type: 'Protocol',
    country: 'Sudan', module: 'S5 Logistics', ownerId: 'P-2', commodity: 'Sesame',
    version: 'v3.0', effectiveFrom: '01-Jul-2026', reviewDate: '01-Jul-2027',
    status: 'Published', file: 'stuffing-protocol-sesame-v3.pdf',
    approval: { approver: 'Ahmed Elhassan', decision: 'Approved', date: '28-Jun-2026', justification: 'Bag stacking pattern revised after the June container damage; approved for the 2026/27 season.' },
    consultations: 47,
  },
  {
    id: 'I-2', code: 'KB-0031', title: 'Sesame stuffing protocol', type: 'Protocol',
    country: 'Sudan', module: 'S5 Logistics', ownerId: 'P-2', commodity: 'Sesame',
    version: 'v2.0', effectiveFrom: '01-Feb-2026', effectiveTo: '30-Jun-2026', reviewDate: '01-Feb-2027',
    status: 'Superseded', file: 'stuffing-protocol-sesame-v2.pdf',
    approval: { approver: 'Ahmed Elhassan', decision: 'Approved', date: '30-Jan-2026', justification: 'Annual revision.' },
    consultations: 112,
  },
  // ---- country requirement matrix
  {
    id: 'I-3', code: 'KB-0018', title: 'Country matrix of execution contract requirements', type: 'Matrix',
    country: 'Sudan', module: 'S5 Logistics', ownerId: 'P-1',
    version: 'v2.1', effectiveFrom: '01-Jun-2026', reviewDate: '01-Dec-2026',
    status: 'Published', file: 'execution-requirement-matrix-sd-v2-1.pdf',
    approval: { approver: 'Ahmed Elhassan', decision: 'Approved', date: '29-May-2026', justification: 'Certificate of origin requirement added for the Turkish lane.' },
    consultations: 31,
  },
  // ---- adjustment types document — DELIBERATELY OVERDUE FOR REVIEW
  {
    id: 'I-4', code: 'KB-0024', title: 'Adjustment types process document', type: 'Procedure',
    country: 'All countries', module: 'S4 Compliance', ownerId: 'P-7',
    version: 'v1.4', effectiveFrom: '15-May-2026', reviewDate: '01-Aug-2026',
    status: 'Published', file: 'adjustment-types-process-v1-4.pdf',
    approval: { approver: 'Ahmed Elhassan', decision: 'Approved', date: '12-May-2026', justification: 'Evidence requirements aligned to the insurance case pack.' },
    consultations: 23,
  },
  // ---- quality formats and forms
  {
    id: 'I-5', code: 'KB-0009', title: 'Quality formats and forms', type: 'Form',
    country: 'Sudan', module: 'S3 Quality Assurance', ownerId: 'P-3',
    version: 'v5.0', effectiveFrom: '01-Apr-2026', reviewDate: '01-Apr-2028',
    status: 'Published', file: 'quality-formats-and-forms-v5.pdf',
    consultations: 68,
  },
  // ---- clearance report templates
  {
    id: 'I-6', code: 'KB-0036', title: 'Clearance report templates', type: 'Template',
    country: 'Sudan', module: 'S5 Logistics', ownerId: 'P-2',
    version: 'v1.2', effectiveFrom: '20-Jul-2026', reviewDate: '20-Jul-2028',
    status: 'Published', file: 'clearance-report-templates-v1-2.xlsx',
    consultations: 12,
  },
  // ---- published but NEVER CONSULTED, and with no configured placement
  {
    id: 'I-7', code: 'KB-0040', title: 'Shipment and document follow-up report formats', type: 'Report format',
    country: 'All countries', module: 'S5 Logistics', ownerId: 'P-2',
    version: 'v1.0', effectiveFrom: '01-Aug-2026', reviewDate: '01-Aug-2028',
    status: 'Published', file: 'shipment-follow-up-formats-v1.xlsx',
    consultations: 0,
  },
  // ---- awaiting approval: NOT in the library, NOT in search, NOT at the point of work
  {
    id: 'I-8', code: 'KB-0044', title: 'Groundnut stuffing protocol', type: 'Protocol',
    country: 'Sudan', module: 'S5 Logistics', ownerId: 'P-2', commodity: 'Groundnut',
    version: 'v1.0', effectiveFrom: '01-Sep-2026', reviewDate: '01-Sep-2027',
    status: 'Pending approval', file: 'stuffing-protocol-groundnut-v1.pdf',
    consultations: 0,
  },
  // ---- withdrawn, retained and marked
  {
    id: 'I-9', code: 'KB-0012', title: 'Gum arabic stuffing protocol (Chad)', type: 'Protocol',
    country: 'Chad', module: 'S5 Logistics', ownerId: 'P-2', commodity: 'Gum arabic',
    version: 'v1.1', effectiveFrom: '01-Jan-2026', reviewDate: '01-Jan-2027',
    status: 'Withdrawn', file: 'stuffing-protocol-gum-chad-v1-1.pdf',
    withdrawnOn: '30-Jun-2026',
    withdrawnReason: 'The Chad gum arabic lane was suspended for the season; retained so past decisions remain explainable.',
    consultations: 9,
  },
];

export type Announcement = {
  id: string;
  title: string;
  content: string;
  country: string;      // 'All countries' or a country
  roleId?: string;      // S10 role
  publishFrom: string;
  expiresOn: string;
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'AN-0021',
    title: 'Port Sudan berth congestion — revised laytime guidance',
    content: 'Berth waiting at Port Sudan is running at three to four days. Record actual laytime against every vessel and raise the demurrage exposure to commercial before the vessel sails.',
    country: 'Sudan', roleId: 'R-6',
    publishFrom: '12-Aug-2026', expiresOn: '12-Sep-2026',
  },
  {
    id: 'AN-0019',
    title: 'Season close — Gedaref stock count window',
    content: 'The physical count window for Gedaref opens on 01-Sep-2026. Reconciliation worksheets must be submitted within five working days of the count.',
    country: 'Sudan',
    publishFrom: '01-Sep-2026', expiresOn: '30-Sep-2026',
  },
  {
    id: 'AN-0014',
    title: 'July moisture testing protocol reminder',
    content: 'Moisture testing frequency was raised to every second lot for July only.',
    country: 'Sudan',
    publishFrom: '01-Jul-2026', expiresOn: '31-Jul-2026',
  },
];

export type HelpContent = {
  id: string;
  module: string;
  section: string;
  language: string;
  content: string;
  version: string;
  effectiveFrom: string;
  reviewDate: string;
  status: ItemStatus;
};

export const HELP: HelpContent[] = [
  {
    id: 'H-1', module: 'S4 Compliance', section: 'Variance case', language: 'English',
    content: 'A variance case is raised where a counted quantity differs from the book quantity. The case records the difference, the adjustment type and the evidence required for that type. The reconciliation itself stops at the point the case is raised — the case then follows its own approval route.',
    version: 'v2.0', effectiveFrom: '01-Aug-2026', reviewDate: '01-Aug-2027', status: 'Published',
  },
  {
    id: 'H-2', module: 'S5 Logistics', section: 'Service request', language: 'English',
    content: 'A service request is raised for a movement that requires a third-party service. The stuffing protocol for the commodity is shown on this screen and must be followed as published.',
    version: 'v1.1', effectiveFrom: '15-Jul-2026', reviewDate: '15-Jul-2027', status: 'Published',
  },
];

export const TODAY = '19-Aug-2026';

const ms = (s: string) => new Date(s.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')).getTime();

export const daysBetween = (from: string, to: string) => Math.round((ms(to) - ms(from)) / 864e5);

/** Review status — the SM-07 pattern applied to content. */
export const reviewStatus = (reviewDate: string, today = TODAY) => {
  const diff = daysBetween(today, reviewDate);
  if (diff < 0) return { state: 'Overdue for review' as const, days: -diff };
  if (diff <= 30) return { state: 'Due for review' as const, days: diff };
  return { state: 'Current' as const, days: diff };
};

/**
 * The version IN FORCE on a date — never simply the latest.
 * This is the behaviour that stops people working from an out-of-date attachment.
 */
export const versionInForce = (items: ReferenceItem[], code: string, date = TODAY) => {
  const t = ms(date);
  return items
    .filter((i) => i.code === code && (i.status === 'Published' || i.status === 'Superseded'))
    .find((i) => ms(i.effectiveFrom) <= t && (!i.effectiveTo || ms(i.effectiveTo) >= t));
};

export const typeConfig = (type: MaterialType) => MATERIAL_TYPES.find((m) => m.type === type)!;
export const placementFor = (type: MaterialType) => PLACEMENTS.find((p) => p.type === type);

/** Add months to a date string, for the review cycle. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const addMonths = (date: string, months: number) => {
  const d = new Date(ms(date));
  d.setMonth(d.getMonth() + months);
  // fixed month names — toLocaleString yields "Sept" in some ICU builds, which is inconsistent
  // with every other date in the prototype and with this file's own parser
  return `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};
