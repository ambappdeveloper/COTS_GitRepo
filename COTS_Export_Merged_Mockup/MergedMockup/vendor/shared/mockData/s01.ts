// S01 Planning demonstration data. Prototype only — resets on refresh.

export type PlanStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Returned for amendment'
  | 'Superseded';

export type PlanRow = {
  id: string;
  city: string;
  location: string;
  commodityGroup: string;
  commodity: string;
  months: Record<string, number>;
  section: string; // commodity group / city — the contribution section
};

export type PlanVersion = {
  version: number;
  status: PlanStatus;
  effectiveFrom?: string;
  effectiveTo?: string;
  approvedBy?: string;
  approvedOn?: string;
  changedBy: string;
  changedOn: string;
  reason: string;
  rows: PlanRow[];
};

export type MasterPlan = {
  ref: string;
  country: string;
  seasonId: string;
  activeVersion: number;
  status: PlanStatus;
  versions: PlanVersion[];
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  // sections held by another contributor — read-only in the grid (WF-S01-01 / Step 4)
  lockedSections: { section: string; by: string; since: string }[];
};

const r = (
  id: string,
  city: string,
  location: string,
  group: string,
  commodity: string,
  months: Record<string, number>,
): PlanRow => ({ id, city, location, commodityGroup: group, commodity, months, section: `${group} / ${city}` });

const V1_ROWS: PlanRow[] = [
  r('1', 'Gedaref', 'Gedaref Central', 'Oilseeds', 'Sesame', { Nov: 1200, Dec: 1400, Jan: 1100, Feb: 900, Mar: 800 }),
  r('2', 'Gedaref', 'Gedaref East', 'Oilseeds', 'Groundnut', { Nov: 600, Dec: 700, Jan: 650, Feb: 500 }),
  r('3', 'El Obeid', 'El Obeid Depot', 'Gum', 'Gum Arabic', { Dec: 400, Jan: 500, Feb: 450, Mar: 300 }),
  r('4', 'El Obeid', 'El Obeid Depot', 'Pulses', 'Chickpea', { Jan: 300, Feb: 350, Mar: 200 }),
];

const V2_ROWS: PlanRow[] = [
  r('1', 'Gedaref', 'Gedaref Central', 'Oilseeds', 'Sesame', { Nov: 1200, Dec: 1600, Jan: 1300, Feb: 900, Mar: 800, Apr: 400 }),
  r('2', 'Gedaref', 'Gedaref East', 'Oilseeds', 'Groundnut', { Nov: 600, Dec: 700, Jan: 650, Feb: 500 }),
  r('3', 'El Obeid', 'El Obeid Depot', 'Gum', 'Gum Arabic', { Dec: 400, Jan: 500, Feb: 450, Mar: 300 }),
  r('4', 'El Obeid', 'El Obeid Depot', 'Pulses', 'Chickpea', { Jan: 300, Feb: 350, Mar: 200 }),
];

export const MASTER_PLANS: MasterPlan[] = [
  {
    ref: 'MP-SD-2526',
    country: 'Sudan',
    seasonId: 'SD-2526',
    activeVersion: 2,
    status: 'Approved',
    lastUpdatedBy: 'A. Osman',
    lastUpdatedAt: '03-Feb-2026 09:12',
    lockedSections: [{ section: 'Gum / El Obeid', by: 'S. Ali', since: '14:20' }],
    versions: [
      {
        version: 1,
        status: 'Superseded',
        effectiveFrom: '12-Nov-2025',
        effectiveTo: '04-Feb-2026',
        approvedBy: 'H. Suleiman (Country Manager)',
        approvedOn: '12-Nov-2025',
        changedBy: 'A. Osman',
        changedOn: '08-Nov-2025',
        reason: 'Initial season baseline',
        rows: V1_ROWS,
      },
      {
        version: 2,
        status: 'Approved',
        effectiveFrom: '04-Feb-2026',
        approvedBy: 'H. Suleiman (Country Manager)',
        approvedOn: '04-Feb-2026',
        changedBy: 'A. Osman',
        changedOn: '03-Feb-2026',
        reason: 'Revised sesame volumes after Gedaref arrivals',
        rows: V2_ROWS,
      },
    ],
  },
  {
    ref: 'MP-ET-2526',
    country: 'Ethiopia',
    seasonId: 'ET-2526',
    activeVersion: 1,
    status: 'Draft',
    lastUpdatedBy: 'T. Bekele',
    lastUpdatedAt: '11-Aug-2026 16:40',
    lockedSections: [],
    versions: [
      {
        version: 1,
        status: 'Draft',
        changedBy: 'T. Bekele',
        changedOn: '11-Aug-2026',
        reason: 'First draft',
        rows: [r('1', 'Addis Ababa', 'Gedaref Central', 'Oilseeds', 'Sesame', { Oct: 500, Nov: 600 })],
      },
    ],
  },
];

// ---------------------------------------------------------------- sourcing ----

export type SourcingAgreement = {
  id: string;
  agent: string;
  area: string;
  traders: string[];
  tareTerms: string;
  governmentFees: string;
  commissions: string;
  seasonId: string;
};

export const SOURCING_AGREEMENTS: SourcingAgreement[] = [
  {
    id: 'SA-001',
    agent: 'Agent — El Fasher',
    area: 'North Darfur',
    traders: ['A. Bakri Trading', 'Sahel Grain'],
    tareTerms: '0.5 kg per bag',
    governmentFees: '2.5 %',
    commissions: '1.0 %',
    seasonId: 'SD-2526',
  },
  {
    id: 'SA-002',
    agent: 'Agent — Gedaref North',
    area: 'Gedaref',
    traders: ['Nile Commodities'],
    tareTerms: '0.4 kg per bag',
    governmentFees: '2.0 %',
    commissions: '1.25 %',
    seasonId: 'SD-2526',
  },
];

export type SourcingRow = {
  id: string;
  agent: string;
  area: string;
  commodity: string;
  fundsIssued: number;
  expectedPrice: number; // USD / MT
  receivingLocation: string | null;
  deliveredMt: number; // actuals, for the expected-vs-actual report
};

export const SOURCING_ROWS: SourcingRow[] = [
  { id: 'SP-1', agent: 'Agent — El Fasher', area: 'North Darfur', commodity: 'Sesame', fundsIssued: 250000, expectedPrice: 620, receivingLocation: 'Gedaref Central', deliveredMt: 372 },
  { id: 'SP-2', agent: 'Agent — Gedaref North', area: 'Gedaref', commodity: 'Sesame', fundsIssued: 180000, expectedPrice: 610, receivingLocation: 'Gedaref East', deliveredMt: 301 },
  { id: 'SP-3', agent: 'Agent — Kosti', area: 'White Nile', commodity: 'Groundnut', fundsIssued: 90000, expectedPrice: 540, receivingLocation: null, deliveredMt: 0 },
];

// -------------------------------------------------------------- processing ----

export type ProcessingRow = {
  id: string;
  facility: string;
  commodity: string;
  receivedMt: number; // material ACTUALLY RECEIVED — the planning ceiling (firm rule)
  plannedForPurchaseNotReceived: number; // reference only, never plannable
  weeks: Record<string, number>;
  sma: boolean;
};

export const PROCESSING_ROWS: ProcessingRow[] = [
  { id: 'PP-1', facility: 'Gedaref Mill', commodity: 'Sesame', receivedMt: 1860, plannedForPurchaseNotReceived: 940, weeks: { W1: 240, W2: 240, W3: 260, W4: 260 }, sma: true },
  { id: 'PP-2', facility: 'Gedaref Mill', commodity: 'Groundnut', receivedMt: 620, plannedForPurchaseNotReceived: 400, weeks: { W1: 90, W2: 90, W3: 100 }, sma: false },
  { id: 'PP-3', facility: 'El Obeid Cleaning Line', commodity: 'Gum Arabic', receivedMt: 780, plannedForPurchaseNotReceived: 260, weeks: { W2: 120, W3: 120, W4: 120 }, sma: true },
];

export const OUTPUT_YIELD = 0.95; // expected output = planned input × yield

// -------------------------------------------------------------- warehousing ----

export type WarehouseRow = {
  code: string;
  name: string;
  city: string;
  capacityMt: number;
  conversion: number;
  currentMt: number;
  expectedMt: number;
};

export const WAREHOUSE_ROWS: WarehouseRow[] = [
  { code: 'WH-0142', name: 'Gedaref Store 1', city: 'Gedaref', capacityMt: 4500, conversion: 1.5, currentMt: 3900, expectedMt: 5200 },
  { code: 'WH-0143', name: 'Gedaref Store 2', city: 'Gedaref', capacityMt: 2000, conversion: 1.5, currentMt: 1100, expectedMt: 1650 },
  { code: 'WH-0210', name: 'El Obeid Store', city: 'El Obeid', capacityMt: 3000, conversion: 1.4, currentMt: 1800, expectedMt: 2400 },
  { code: 'WH-0301', name: 'Port Sudan Transit', city: 'Port Sudan', capacityMt: 6000, conversion: 1.6, currentMt: 2200, expectedMt: 3100 },
];

// plan-against-actual demonstration figures (WF-S01-01 / Step 11)
export const PLAN_ACTUAL: { commodity: string; month: string; planned: number; actual: number }[] = [
  { commodity: 'Sesame', month: 'Nov', planned: 1200, actual: 1140 },
  { commodity: 'Sesame', month: 'Dec', planned: 1600, actual: 1505 },
  { commodity: 'Sesame', month: 'Jan', planned: 1300, actual: 1352 },
  { commodity: 'Groundnut', month: 'Nov', planned: 600, actual: 540 },
  { commodity: 'Groundnut', month: 'Dec', planned: 700, actual: 690 },
  { commodity: 'Gum Arabic', month: 'Dec', planned: 400, actual: 355 },
];
