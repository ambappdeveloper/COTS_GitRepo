/**
 * C6 Comments and Collaboration on Records — mock data.
 * Static only. Every field traces to a step in COTS_C6_Workflows.
 *
 * C06 is a panel programme: these records feed panels embedded in the records
 * owned by C01, C03, C04 and (later) C07, plus the review page at /c6/discussions.
 */

export type Visibility = 'Internal only' | 'Visible to external parties';

export interface CommentVersion {
  at: string;
  text: string;
  by: string;
}

export interface Comment6 {
  id: string;
  /** WF-C6-01 / Step 3 — a reply sits beneath the comment it answers */
  parentId?: string;
  /** the record the discussion is attached to — Step 2 */
  recordKey: string;
  recordName: string;
  objectType: string;
  route?: string;
  country: string;
  author: string;
  role: string;
  at: string;
  text: string;
  visibility: Visibility;
  /** WF-C6-02 / Steps 1–2 — written by C4, never editable */
  isDecision?: boolean;
  decisionOutcome?: string;
  mention?: string;
  /** WF-C6-01 / Step 6 — stored through C7 and inheriting the record's access rules */
  attachment?: { name: string; docType: string };
  /** WF-C6-01 / Step 7 — every version is retained */
  versions?: CommentVersion[];
  editedAt?: string;
  /** WF-C6-01 / Step 8 — soft delete */
  removed?: { by: string; at: string; originalText: string };
}

/** WF-C6-01 / Step 7 — the edit window is configurable (C10) */
export const EDIT_WINDOW_MINUTES = 15;

/** The prototype's fixed reference time, so the edit window is demonstrable */
export const NOW = '2026-08-18 13:30';

/** WF-C6-01 / Step 4 — the visibility default comes from the record type */
export const VISIBILITY_DEFAULT: { objectType: string; default: Visibility; why: string }[] = [
  { objectType: 'Access request', default: 'Internal only', why: 'An access request concerns a person and their authority; nothing on it is intended for an external party.' },
  { objectType: 'Master data — Supplier', default: 'Visible to external parties', why: 'A supplier transacts against this record through the portal, so discussion of it is expected to be visible unless marked otherwise.' },
  { objectType: 'Master data — Warehouse', default: 'Internal only', why: 'Storage arrangements and costs are internal.' },
  { objectType: 'Master data — Commodity', default: 'Internal only', why: 'Specification discussion is internal until a party is party to it.' },
  { objectType: 'Master data — Exchange rate', default: 'Internal only', why: 'Financial master data is internal.' },
  { objectType: 'Non-conformity', default: 'Visible to external parties', why: 'A non-conformity is normally discussed with the counterparty whose consignment it concerns.' },
  { objectType: 'Quantity variance', default: 'Visible to external parties', why: 'A variance is reconciled with the counterparty.' },
  { objectType: 'Insurance claim', default: 'Internal only', why: 'Claim strategy is internal until it is put to the insurer.' },
  { objectType: 'Shipment delay', default: 'Visible to external parties', why: 'A delay affects the counterparty’s planning.' },
  // the infocard object kinds — WF-C6-01 / Step 1, the same panel on every record
  { objectType: 'Commodity', default: 'Internal only', why: 'Specification discussion is internal until a party is party to it.' },
  { objectType: 'Supplier', default: 'Visible to external parties', why: 'A supplier transacts against this record through the portal.' },
  { objectType: 'Warehouse', default: 'Internal only', why: 'Storage arrangements and costs are internal.' },
  { objectType: 'Facility', default: 'Internal only', why: 'Processing capacity and cost are internal.' },
  { objectType: 'Truck', default: 'Visible to external parties', why: 'Haulage is executed by a third party who needs the discussion.' },
  { objectType: 'Container', default: 'Visible to external parties', why: 'Container movement is coordinated with the line and the agent.' },
  { objectType: 'Vessel', default: 'Visible to external parties', why: 'Vessel operations are coordinated with the agent and the buyer.' },
  { objectType: 'Contract', default: 'Visible to external parties', why: 'A contract is discussed with the counterparty by definition.' },
  { objectType: 'Batch', default: 'Internal only', why: 'Batch quality discussion is internal until a finding is put to a counterparty.' }
];

/** WF-C6-01 / Step 9 — whether comments appear in printed or exported output, per record type */
export const EXPORT_INCLUDES_COMMENTS: { objectType: string; included: boolean }[] = [
  { objectType: 'Access request', included: false },
  { objectType: 'Master data — Supplier', included: false },
  { objectType: 'Non-conformity', included: true },
  { objectType: 'Quantity variance', included: true },
  { objectType: 'Insurance claim', included: true },
  { objectType: 'Shipment delay', included: false }
];

/* ------------------------------------------------------------------ *
 * WF-C6-02 / Step 4 — exception threads: the working record of a resolution
 * ------------------------------------------------------------------ */

export interface ExceptionRec {
  key: string;
  type: 'Non-conformity' | 'Quantity variance' | 'Insurance claim' | 'Shipment delay';
  name: string;
  country: string;
  raisedBy: string;
  raisedAt: string;
  detail: [string, string][];
  state: 'Open' | 'Resolved';
  resolvedAt?: string;
  resolvedBy?: string;
  /** the related record elsewhere in the prototype, where there is one */
  relatedRoute?: string;
}

export const seedExceptions: ExceptionRec[] = [
  {
    key: 'NC-26-0118', type: 'Non-conformity',
    name: 'Batch 26/SES/GDF/0442 — moisture out of specification',
    country: 'Sudan', raisedBy: 'Yusuf Kamal', raisedAt: '2026-08-17 15:05',
    detail: [
      ['Batch', '26/SES/GDF/0442'], ['Commodity', 'Sesame — Hulled White'],
      ['Finding', 'Moisture 6.8% against a 6.0% maximum'], ['Quantity affected', '118 MT'],
      ['Proposed resolution', 'Re-dry and re-test before shipment']
    ],
    state: 'Open', relatedRoute: '/c4/approvals/AI-2002'
  },
  {
    key: 'QV-26-0071', type: 'Quantity variance',
    name: 'Gedaref intake 26/GDF/0871 — 4.2 MT short against the weighbridge ticket',
    country: 'Sudan', raisedBy: 'Ahmed Osman', raisedAt: '2026-08-15 09:40',
    detail: [
      ['Intake reference', '26/GDF/0871'], ['Supplier', 'Agrotem Trading LLC'],
      ['Weighbridge quantity', '212.6 MT'], ['Received quantity', '208.4 MT'],
      ['Variance', '4.2 MT (1.98%)'], ['Tolerance', '1.0%']
    ],
    state: 'Open'
  },
  {
    key: 'CL-26-0009', type: 'Insurance claim',
    name: 'Water damage on 60 bags, Port Sudan warehouse 3',
    country: 'Sudan', raisedBy: 'Meseret Alemu', raisedAt: '2026-08-10 11:15',
    detail: [
      ['Location', 'Port Sudan Warehouse 3'], ['Cause', 'Roof leak during unseasonal rain'],
      ['Quantity affected', '3.0 MT (60 bags)'], ['Estimated value', 'USD 4,260'],
      ['Policy', 'GRP-MARINE-2026/114'], ['Surveyor appointed', 'Yes — 2026-08-12']
    ],
    state: 'Resolved', resolvedAt: '2026-08-17 16:20', resolvedBy: 'Fatima Idris',
    relatedRoute: '/c3/records/MD-1'
  },
  {
    key: 'DL-26-0034', type: 'Shipment delay',
    name: 'Vessel berthing delayed four days — S30000942-1',
    country: 'Sudan', raisedBy: 'Meseret Alemu', raisedAt: '2026-08-16 07:30',
    detail: [
      ['Contract', 'S30000942-1'], ['Buyer', 'Agrotem Trading LLC'],
      ['Original laycan', '2026-09-02 to 2026-09-06'], ['Revised berthing', '2026-09-10'],
      ['Cause', 'Port congestion at Port Sudan'], ['Quantity affected', '500 MT']
    ],
    state: 'Open'
  }
];

/* ------------------------------------------------------------------ *
 * Seeded threads — WF-C6-01 / Steps 2–8 and WF-C6-02 / Steps 1–4
 * ------------------------------------------------------------------ */

const c = (
  id: string, recordKey: string, recordName: string, objectType: string, country: string,
  author: string, role: string, at: string, text: string,
  extra: Partial<Comment6> = {}
): Comment6 => ({
  id, recordKey, recordName, objectType, country, author, role, at, text,
  visibility: VISIBILITY_DEFAULT.find((v) => v.objectType === objectType)?.default ?? 'Internal only',
  ...extra
});

export const seedComments: Comment6[] = [
  /* --- an access request: a thread with a reply, an edit and a decision comment --- */
  c('CM-101', 'AR-000141', 'AR-000141 Omar Bashir', 'Access request', 'Sudan',
    'Nasreen Sayed', 'SYSTEM_ADMINISTRATOR', '2026-08-14 09:12',
    'Raised on behalf of the Gedaref buying station. Omar starts on 1 September, so the effective-from date is deliberate.',
    { route: '/c1/access-requests/AR-000141' }),
  c('CM-102', 'AR-000141', 'AR-000141 Omar Bashir', 'Access request', 'Sudan',
    'Grace Mensah', 'COUNTRY_MANAGER', '2026-08-14 10:02',
    'Sourcing officer is right for the station, but should the module scope include Import and Distribution? He will not touch it.',
    { parentId: 'CM-101', route: '/c1/access-requests/AR-000141' }),
  c('CM-103', 'AR-000141', 'AR-000141 Omar Bashir', 'Access request', 'Sudan',
    'Nasreen Sayed', 'SYSTEM_ADMINISTRATOR', '2026-08-14 10:20',
    'Corrected — module scope is now Export and Shared Modules only. Thank you.',
    {
      parentId: 'CM-102', route: '/c1/access-requests/AR-000141',
      editedAt: '2026-08-14 10:26',
      versions: [
        { at: '2026-08-14 10:20', text: 'Corrected — scope reduced.', by: 'Nasreen Sayed' },
        { at: '2026-08-14 10:26', text: 'Corrected — module scope is now Export and Shared Modules only. Thank you.', by: 'Nasreen Sayed' }
      ]
    }),
  c('CM-104', 'AR-000141', 'AR-000141 Omar Bashir', 'Access request', 'Sudan',
    'Ahmed Osman', 'SOURCING_OFFICER', '2026-08-14 11:40',
    'Duplicate of my earlier note.',
    {
      route: '/c1/access-requests/AR-000141',
      removed: { by: 'Ahmed Osman', at: '2026-08-14 11:48', originalText: 'Duplicate of my earlier note.' }
    }),

  /* --- a master data record: attachment, external visibility, mention --- */
  c('CM-201', 'WH-0142', 'WH-0142 Port Sudan Warehouse 3', 'Master data — Warehouse', 'Sudan',
    'Ahmed Osman', 'SOURCING_OFFICER', '2026-08-12 08:30',
    'Capacity increased to 12,000 MT after the second shed was taken on. Rental agreement attached.',
    {
      route: '/c3/records/MD-1',
      attachment: { name: 'kassala-lease-addendum.pdf', docType: 'Rental agreement' }
    }),
  c('CM-202', 'WH-0142', 'WH-0142 Port Sudan Warehouse 3', 'Master data — Warehouse', 'Sudan',
    'Yusuf Kamal', 'QUALITY_INSPECTOR', '2026-08-12 09:05',
    '@Meseret Alemu fumigation is due before the next intake — the certificate on file expires on 30 September.',
    { parentId: 'CM-201', route: '/c3/records/MD-1', mention: 'Meseret Alemu' }),

  c('CM-301', 'SUP-004821', 'SUP-004821 Agrotem Trading LLC', 'Master data — Supplier', 'Sudan',
    'Nasreen Sayed', 'SYSTEM_ADMINISTRATOR', '2026-08-11 14:10',
    'Registration renewed to 2027-06-30. The renewed certificate has been filed against the record.',
    { route: '/c3/records/MD-3', visibility: 'Visible to external parties' }),

  /* --- exception threads: the working record of a resolution --- */
  c('CM-401', 'NC-26-0118', 'NC-26-0118 Batch 26/SES/GDF/0442 — moisture out of specification', 'Non-conformity', 'Sudan',
    'Yusuf Kamal', 'QUALITY_INSPECTOR', '2026-08-17 15:10',
    'Moisture measured at 6.8% on three of eight sub-samples. Recommend re-drying the affected lots rather than rejecting the batch.',
    { attachment: { name: 'lab-report-0442.pdf', docType: 'Inspection report' } }),
  c('CM-402', 'NC-26-0118', 'NC-26-0118 Batch 26/SES/GDF/0442 — moisture out of specification', 'Non-conformity', 'Sudan',
    'Tarig Hassan', 'PROCESSING_SUPERVISOR', '2026-08-17 16:02',
    'Dryer capacity is available on the second shift. Two days for 118 MT, so the vessel window is not affected.',
    { parentId: 'CM-401' }),
  c('CM-403', 'NC-26-0118', 'NC-26-0118 Batch 26/SES/GDF/0442 — moisture out of specification', 'Non-conformity', 'Sudan',
    'Fatima Idris', 'COMPLIANCE_OFFICER', '2026-08-17 16:40',
    'Re-drying is acceptable provided the re-test is recorded against this non-conformity and not against a new batch reference.',
    { parentId: 'CM-401' }),

  c('CM-501', 'QV-26-0071', 'QV-26-0071 Gedaref intake — 4.2 MT short', 'Quantity variance', 'Sudan',
    'Ahmed Osman', 'SOURCING_OFFICER', '2026-08-15 09:45',
    'Weighbridge ticket says 212.6 MT, warehouse received 208.4 MT. Above the 1% tolerance, so raising it here rather than absorbing it.'),
  c('CM-502', 'QV-26-0071', 'QV-26-0071 Gedaref intake — 4.2 MT short', 'Quantity variance', 'Sudan',
    'Meseret Alemu', 'EXECUTION_OFFICER', '2026-08-15 12:30',
    'Two bags were reported split in transit. That accounts for roughly 0.1 MT, not 4.2. Suggest re-weighing the remaining stack before we put this to the supplier.',
    { parentId: 'CM-501' }),

  c('CM-601', 'CL-26-0009', 'CL-26-0009 Water damage on 60 bags', 'Insurance claim', 'Sudan',
    'Meseret Alemu', 'EXECUTION_OFFICER', '2026-08-10 11:20',
    'Sixty bags affected in the north-east corner. Photographs taken before the stack was moved.',
    { attachment: { name: 'damage-photos-portsudan.zip', docType: 'Inspection report' } }),
  c('CM-602', 'CL-26-0009', 'CL-26-0009 Water damage on 60 bags', 'Insurance claim', 'Sudan',
    'Fatima Idris', 'COMPLIANCE_OFFICER', '2026-08-17 16:15',
    'Surveyor’s report accepts 3.0 MT. Claim submitted at USD 4,260 under GRP-MARINE-2026/114; recovery expected within 60 days.',
    { parentId: 'CM-601' }),

  c('CM-701', 'DL-26-0034', 'DL-26-0034 Vessel berthing delayed four days', 'Shipment delay', 'Sudan',
    'Meseret Alemu', 'EXECUTION_OFFICER', '2026-08-16 07:35',
    'Agent reports berthing on 10 September against a laycan closing on the 6th. Buyer notified the same morning.',
    { visibility: 'Visible to external parties' })
];

/** WF-C6-01 / Step 10 — a record deliberately outside the demonstration user's country scope */
export const OUT_OF_SCOPE_COMMENT: Comment6 = c(
  'CM-901', 'WH-0301', 'WH-0301 Beira Transit Store', 'Master data — Warehouse', 'Mozambique',
  'Grace Mensah', 'COUNTRY_MANAGER', '2026-08-13 10:00',
  'Lease renewal negotiation is at a sensitive stage — do not discuss outside the country team.'
);

/* ------------------------------------------------------------------ *
 * Timeline sources — WF-C6-02 / Step 5
 * ------------------------------------------------------------------ */

export type TimelineSource = 'C6 Comments' | 'C7 Documents' | 'C8 Audit';

export interface TimelineEntry {
  at: string;
  source: TimelineSource;
  who: string;
  role?: string;
  what: string;
  detail?: string;
}

/** Document activity for records C07 will own; held here so the timeline is honest about its sources. */
export const DOCUMENT_ACTIVITY: Record<string, TimelineEntry[]> = {
  'WH-0142': [
    { at: '2026-08-12 08:28', source: 'C7 Documents', who: 'Ahmed Osman', role: 'SOURCING_OFFICER', what: 'Rental agreement uploaded, version 2', detail: 'kassala-lease-addendum.pdf · inherits the record’s access rules' },
    { at: '2026-06-02 10:15', source: 'C7 Documents', who: 'Ahmed Osman', role: 'SOURCING_OFFICER', what: 'Fumigation certificate uploaded, version 1', detail: 'Valid to 2026-09-30' }
  ],
  'NC-26-0118': [
    { at: '2026-08-17 15:08', source: 'C7 Documents', who: 'Yusuf Kamal', role: 'QUALITY_INSPECTOR', what: 'Inspection report uploaded, version 1', detail: 'lab-report-0442.pdf' }
  ],
  'CL-26-0009': [
    { at: '2026-08-12 09:00', source: 'C7 Documents', who: 'Meseret Alemu', role: 'EXECUTION_OFFICER', what: 'Surveyor appointment letter uploaded', detail: 'Held for C07' },
    { at: '2026-08-10 11:18', source: 'C7 Documents', who: 'Meseret Alemu', role: 'EXECUTION_OFFICER', what: 'Damage photographs uploaded', detail: 'damage-photos-portsudan.zip' }
  ],
  'AR-000141': [
    { at: '2026-08-14 09:08', source: 'C7 Documents', who: 'Nasreen Sayed', role: 'SYSTEM_ADMINISTRATOR', what: 'Line manager approval email attached', detail: 'Mandatory document for an access request' }
  ]
};

/** Status history for the seeded exception records, which have no owning module yet. */
export const EXCEPTION_AUDIT: Record<string, TimelineEntry[]> = {
  'NC-26-0118': [
    { at: '2026-08-17 15:05', source: 'C8 Audit', who: 'Yusuf Kamal', role: 'QUALITY_INSPECTOR', what: 'Non-conformity raised', detail: 'Status → Open' },
    { at: '2026-08-17 15:40', source: 'C8 Audit', who: 'Yusuf Kamal', role: 'QUALITY_INSPECTOR', what: 'Resolution proposed and submitted for approval', detail: 'HAND-OFF → C4 / WF-C4-01' }
  ],
  'QV-26-0071': [
    { at: '2026-08-15 09:40', source: 'C8 Audit', who: 'Ahmed Osman', role: 'SOURCING_OFFICER', what: 'Variance raised', detail: 'Status → Open · 4.2 MT above a 1.0% tolerance' }
  ],
  'CL-26-0009': [
    { at: '2026-08-10 11:15', source: 'C8 Audit', who: 'Meseret Alemu', role: 'EXECUTION_OFFICER', what: 'Claim raised', detail: 'Status → Open' },
    { at: '2026-08-12 09:05', source: 'C8 Audit', who: 'Fatima Idris', role: 'COMPLIANCE_OFFICER', what: 'Surveyor appointed', detail: 'Status → Under survey' },
    { at: '2026-08-17 16:20', source: 'C8 Audit', who: 'Fatima Idris', role: 'COMPLIANCE_OFFICER', what: 'Claim submitted to the insurer', detail: 'Status → Resolved · USD 4,260' }
  ],
  'DL-26-0034': [
    { at: '2026-08-16 07:30', source: 'C8 Audit', who: 'Meseret Alemu', role: 'EXECUTION_OFFICER', what: 'Delay recorded', detail: 'Status → Open · revised berthing 2026-09-10' }
  ]
};
