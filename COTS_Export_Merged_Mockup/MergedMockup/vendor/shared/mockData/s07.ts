// S07 Claims demonstration data. Prototype only — resets on refresh.
// The claim field set is a LABELLED PLACEHOLDER drawn from what the source's data list names.
// The storage claim form (process design Appendix A7) has not been supplied.

export type CauseCategory = 'Quality' | 'Service';
export type ClaimType = 'Quality' | 'Service' | 'Demurrage' | 'Storage';
export type ClaimState =
  | 'Registered'
  | 'Valued'
  | 'Submitted for approval'
  | 'Approved'
  | 'Closed without settlement'
  | 'Settled'
  | 'Closed';

export type Contract = {
  id: string;
  buyer: string;
  commodity: string;
  destination: string;
  incoterm: string;
  valueUsd: number;
  shipments: { id: string; qtyMt: number; delivered: string }[];
};

export const CONTRACTS: Contract[] = [
  {
    id: 'S30000942-1', buyer: 'Olam Europe BV', commodity: 'Sesame', destination: 'Mersin', incoterm: 'CFR',
    valueUsd: 1842000,
    shipments: [
      { id: 'SH-0912', qtyMt: 240, delivered: '18-Jul-2026' },
      { id: 'SH-0913', qtyMt: 240, delivered: '26-Jul-2026' },
      { id: 'SH-0918', qtyMt: 220, delivered: '04-Aug-2026' },
      { id: 'SH-0921', qtyMt: 240, delivered: '11-Aug-2026' },
      { id: 'SH-0925', qtyMt: 200, delivered: '15-Aug-2026' },
      { id: 'SH-0929', qtyMt: 240, delivered: '18-Aug-2026' },
    ],
  },
  {
    id: 'P30000718-1', buyer: 'Sunrise Foods Pvt Ltd', commodity: 'Sesame', destination: 'Nhava Sheva', incoterm: 'CIF',
    valueUsd: 1214000,
    shipments: [
      { id: 'SH-0884', qtyMt: 240, delivered: '02-Jul-2026' },
      { id: 'SH-0891', qtyMt: 240, delivered: '12-Jul-2026' },
      { id: 'SH-0902', qtyMt: 200, delivered: '24-Jul-2026' },
      { id: 'SH-0916', qtyMt: 240, delivered: '08-Aug-2026' },
    ],
  },
  {
    id: 'S30000955-1', buyer: 'Kanoo Trading LLC', commodity: 'Gum arabic', destination: 'Jebel Ali', incoterm: 'FOB',
    valueUsd: 604000,
    shipments: [
      { id: 'SH-0907', qtyMt: 120, delivered: '20-Jul-2026' },
      { id: 'SH-0923', qtyMt: 120, delivered: '13-Aug-2026' },
    ],
  },
];

/** Shipments delivered in the reporting period — the claim-rate denominator. */
export const SHIPMENTS_DELIVERED_IN_PERIOD = 48;

/**
 * Approval route bands. PLACEHOLDER — the thresholds and the final authority
 * have not been provided by the business.
 */
export const APPROVAL_BANDS = [
  { band: 'Up to USD 5,000', role: 'Commercial Manager' },
  { band: 'USD 5,001 – 25,000', role: 'Head of Commercial' },
  { band: 'Above USD 25,000', role: 'To be confirmed' },
];

export type ApprovalEntry = {
  approver: string;
  decision: 'Approved' | 'Rejected';
  justification: string;
  approvedAmount: number;
  date: string;
};

export type Claim = {
  id: string;
  buyer: string;
  contract: string;
  shipments: string[];
  cause: CauseCategory;
  type: ClaimType;
  dateRaised: string;
  registeredBy: string;
  registeredOn: string;
  description: string;
  documents: string[];
  claimValue: number;
  currency: string;
  valueBasis: string;
  /** the conclusion the operation team reached OFFLINE — COTS records it, it does not manage it */
  conclusion: string;
  concludedBy: string;
  concludedOn: string;
  recommended: number;
  approval?: ApprovalEntry;
  settlementOutcome?: 'Settled in full' | 'Settled in part' | 'Closed without settlement';
  settledAmount?: number;
  creditNote?: string;
  settlementDate?: string;
  closureDate?: string;
  state: ClaimState;
  /** S03 inspection result or non-conformity — the quality evidence */
  qualityRecord?: string;
  qualityRoute?: string;
  /** S09 complaint that became this claim */
  originatingFeedback?: string;
  /** a related S04 insurance case on the same consignment — linked, never merged */
  relatedInsuranceCase?: string;
  relatedInsuranceRoute?: string;
};

export const CLAIMS: Claim[] = [
  {
    id: 'CL-0187', buyer: 'Olam Europe BV', contract: 'S30000942-1', shipments: ['SH-0929'],
    cause: 'Quality', type: 'Quality', dateRaised: '18-Aug-2026',
    registeredBy: 'Commercial — H. Osman', registeredOn: '19-Aug-2026',
    description: 'Buyer reports caking and off-odour in part of the consignment on arrival, and has asked for a price allowance.',
    documents: ['buyer-letter-18Aug.pdf'],
    claimValue: 0, currency: 'USD', valueBasis: '',
    conclusion: '', concludedBy: '', concludedOn: '', recommended: 0,
    state: 'Registered',
    qualityRecord: 'NC-0087', qualityRoute: '/s03/nc/NC-0087',
  },
  {
    id: 'CL-0184', buyer: 'Olam Europe BV', contract: 'S30000942-1', shipments: ['SH-0912', 'SH-0913'],
    cause: 'Quality', type: 'Quality', dateRaised: '04-Aug-2026',
    registeredBy: 'Commercial — H. Osman', registeredOn: '05-Aug-2026',
    description: 'Moisture above the contract limit on arrival at Mersin. Buyer claims a price allowance on the affected tonnage.',
    documents: ['buyer-claim-letter.pdf', 'destination-survey-report.pdf', 'moisture-certificate.pdf'],
    claimValue: 18400, currency: 'USD', valueBasis: 'Contract price × 22.4 MT affected',
    conclusion: 'Destination survey confirms moisture at 9.1 % against a contract limit of 6.0 %. 22.4 MT affected. Loading certificate was within limit; the deviation is consistent with the non-conformity raised at Gedaref.',
    concludedBy: 'Execution — M. Yousif', concludedOn: '14-Aug-2026',
    recommended: 12000,
    state: 'Valued',
    qualityRecord: 'NC-0087', qualityRoute: '/s03/nc/NC-0087',
  },
  {
    id: 'CL-0181', buyer: 'Sunrise Foods Pvt Ltd', contract: 'P30000718-1', shipments: ['SH-0902'],
    cause: 'Quality', type: 'Quality', dateRaised: '28-Jul-2026',
    registeredBy: 'Commercial — H. Osman', registeredOn: '28-Jul-2026',
    description: 'Foreign matter above the contract specification found on arrival inspection at Nhava Sheva.',
    documents: ['buyer-claim.pdf', 'arrival-inspection.pdf'],
    claimValue: 15500, currency: 'USD', valueBasis: 'Buyer reconditioning cost plus handling',
    conclusion: 'Foreign matter confirmed at 1.4 % against a 1.0 % specification. Reconditioning at destination accepted as the lower-cost outcome against rejection of the consignment.',
    concludedBy: 'Execution — M. Yousif', concludedOn: '06-Aug-2026',
    recommended: 12500,
    approval: {
      approver: 'Head of Commercial — A. Elhassan', decision: 'Approved',
      justification: 'Reconditioning cost evidenced and lower than the cost of rejection and re-sale. Amount reduced to exclude the buyer’s internal handling charge, which is not supported by the contract.',
      approvedAmount: 12000, date: '11-Aug-2026',
    },
    state: 'Approved',
    qualityRecord: 'NC-0085', qualityRoute: '/s03/ncs',
    originatingFeedback: 'FB-0233',
  },
  {
    id: 'CL-0176', buyer: 'Kanoo Trading LLC', contract: 'S30000955-1', shipments: [],
    cause: 'Service', type: 'Service', dateRaised: '22-Jul-2026',
    registeredBy: 'Execution — M. Yousif', registeredOn: '22-Jul-2026',
    description: 'Buyer claims for late presentation of documents across the July programme. The shipment concerned has not yet been identified by the buyer.',
    documents: ['buyer-email-22Jul.pdf'],
    claimValue: 3200, currency: 'USD', valueBasis: 'Bank charges and demurrage passed on by the buyer',
    conclusion: 'Documents presented four days after the contractual window on one of the two shipments. Delay attributable to certificate of origin issuance.',
    concludedBy: 'Execution — M. Yousif', concludedOn: '30-Jul-2026',
    recommended: 3200,
    state: 'Valued',
  },
  {
    id: 'CL-0173', buyer: 'Olam Europe BV', contract: 'S30000942-1', shipments: ['SH-0918'],
    cause: 'Service', type: 'Demurrage', dateRaised: '14-Jul-2026',
    registeredBy: 'Execution — M. Yousif', registeredOn: '15-Jul-2026',
    description: 'Vessel detained beyond laytime at Port Sudan; buyer passes the demurrage on under the charter terms.',
    documents: ['laytime-statement.pdf', 'buyer-demurrage-invoice.pdf'],
    claimValue: 8600, currency: 'USD', valueBasis: 'Laytime statement — 2.6 days at USD 3,300',
    conclusion: 'Laytime statement agreed with the agent. 2.6 days beyond laytime, of which 1.1 days attributable to port congestion outside our control.',
    concludedBy: 'Execution — M. Yousif', concludedOn: '24-Jul-2026',
    recommended: 5000,
    state: 'Valued',
  },
  {
    id: 'CL-0168', buyer: 'Sunrise Foods Pvt Ltd', contract: 'P30000718-1', shipments: ['SH-0884'],
    cause: 'Service', type: 'Storage', dateRaised: '26-Jun-2026',
    registeredBy: 'Execution — M. Yousif', registeredOn: '26-Jun-2026',
    description: 'Storage charges at destination arising from a delayed nomination. Registered on the existing storage claim form pattern.',
    documents: ['storage-claim-form.pdf', 'warehouse-invoice.pdf', 'nomination-correspondence.pdf'],
    claimValue: 6400, currency: 'USD', valueBasis: 'Destination warehouse invoice, 16 days',
    conclusion: 'Delay in nomination confirmed at eleven days of the sixteen invoiced; the balance is the buyer’s own delay in collection.',
    concludedBy: 'Execution — M. Yousif', concludedOn: '04-Jul-2026',
    recommended: 4400,
    approval: {
      approver: 'Head of Commercial — A. Elhassan', decision: 'Approved',
      justification: 'Eleven of sixteen days attributable to our nomination delay and evidenced by the correspondence. The remaining five days are the buyer’s own delay and are not accepted.',
      approvedAmount: 4400, date: '09-Jul-2026',
    },
    settlementOutcome: 'Settled in part', settledAmount: 4400, creditNote: 'CN-0442',
    settlementDate: '17-Jul-2026', closureDate: '18-Jul-2026',
    state: 'Closed',
  },
  {
    id: 'CL-0165', buyer: 'Kanoo Trading LLC', contract: 'S30000955-1', shipments: ['SH-0907'],
    cause: 'Quality', type: 'Quality', dateRaised: '19-Jun-2026',
    registeredBy: 'Commercial — H. Osman', registeredOn: '19-Jun-2026',
    description: 'Buyer claims colour variation against sample. No independent inspection was arranged at destination.',
    documents: ['buyer-letter-19Jun.pdf'],
    claimValue: 9800, currency: 'USD', valueBasis: 'Buyer’s own assessment',
    conclusion: 'Loading inspection certificate is within the contract specification. No independent destination inspection was arranged and the buyer’s photographs are inconclusive.',
    concludedBy: 'Execution — M. Yousif', concludedOn: '01-Jul-2026',
    recommended: 0,
    approval: {
      approver: 'Head of Commercial — A. Elhassan', decision: 'Rejected',
      justification: 'Loading certificate within specification, no independent destination inspection, and the contract provides for the loading certificate to be final in the absence of a destination survey.',
      approvedAmount: 0, date: '07-Jul-2026',
    },
    settlementOutcome: 'Closed without settlement',
    closureDate: '08-Jul-2026',
    state: 'Closed without settlement',
    qualityRecord: 'NC-0079', qualityRoute: '/s03/ncs',
  },
];

/** Causes that belong to S04 Compliance as insurance incidents, not here. */
export const INCIDENT_CAUSES = ['Theft', 'Fire', 'Accident', 'Damage in store or in transit', 'Short landing'];

/** The submission requirement set — S07-SC-08 checklist. */
export const SUBMISSION_REQUIREMENTS = (c: Claim) => [
  { item: 'Claim value and currency recorded', provided: c.claimValue > 0, note: c.claimValue > 0 ? `${c.currency} ${c.claimValue.toLocaleString()}` : 'Not recorded' },
  { item: 'Investigation conclusion recorded', provided: !!c.conclusion, note: c.conclusion ? `Recorded by ${c.concludedBy}` : 'The operation team’s conclusion has not been entered' },
  { item: 'Amount recommended for acceptance', provided: c.recommended > 0, note: c.recommended > 0 ? `${c.currency} ${c.recommended.toLocaleString()}` : 'Not recorded' },
  { item: 'Supporting correspondence and documents attached', provided: c.documents.length > 0, note: `${c.documents.length} document${c.documents.length === 1 ? '' : 's'}` },
  {
    item: 'Quality record linked (required where the cause is quality)',
    provided: c.cause !== 'Quality' || !!c.qualityRecord,
    note: c.cause !== 'Quality' ? 'Not applicable — the cause is service' : c.qualityRecord ?? 'No S03 record linked',
  },
];
