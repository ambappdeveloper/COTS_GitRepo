// S06 SMA demonstration data. Prototype only — resets on refresh.
// DESIGN RULE: SMA is an attribute on the existing stock line. There is no separate
// SMA inventory record anywhere in this file — `sma` is one field on StockLine.

export type StockLine = {
  id: string;
  warehouse: string;
  city: string;
  commodity: string;
  batch: string;
  quantityMt: number;
  status: string;           // the line's own status — never replaced by the SMA flag
  statusNote?: string;      // e.g. blocked by an open S03 non-conformity
  grade: string;            // from S03
  allocation: string;       // contract allocation, where allocated
  goodsInTransit?: string;  // from S05, where applicable
  sma: boolean;             // the SMA ATTRIBUTE
  transferRef?: string;
  ncRef?: string;
  inspectionRef?: string;
};

export const STOCK_LINES: StockLine[] = [
  {
    id: 'SL-1', warehouse: 'WH-0142 Gedaref Store 1', city: 'Gedaref', commodity: 'Sesame', batch: 'GD-2026-114',
    quantityMt: 240, status: 'Blocked', statusNote: 'Allocation and dispatch blocked by open non-conformity NC-0087',
    grade: 'Grade 2', allocation: 'P30000718-1', sma: false, ncRef: 'NC-0087', inspectionRef: 'INS-00412',
  },
  {
    id: 'SL-2', warehouse: 'WH-0142 Gedaref Store 1', city: 'Gedaref', commodity: 'Sesame', batch: 'GD-2026-118',
    quantityMt: 210, status: 'In store', grade: 'Grade 1', allocation: '', sma: true, transferRef: 'TRF-0021',
    inspectionRef: 'INS-00415',
  },
  {
    id: 'SL-3', warehouse: 'WH-0143 Gedaref Store 2', city: 'Gedaref', commodity: 'Sesame', batch: 'GD-2026-121',
    quantityMt: 180, status: 'In store', grade: 'Grade 1', allocation: '', sma: false,
  },
  {
    id: 'SL-4', warehouse: 'WH-0143 Gedaref Store 2', city: 'Gedaref', commodity: 'Groundnut', batch: 'GD-2026-125',
    quantityMt: 120, status: 'In store', grade: 'Grade 2', allocation: 'S30000942-1', sma: false,
  },
  {
    id: 'SL-5', warehouse: 'WH-0210 El Obeid Store', city: 'El Obeid', commodity: 'Gum Arabic', batch: 'EO-2026-070',
    quantityMt: 90, status: 'In store', grade: 'Grade 2', allocation: '', sma: true, transferRef: 'TRF-0019',
  },
  {
    id: 'SL-6', warehouse: 'WH-0210 El Obeid Store', city: 'El Obeid', commodity: 'Groundnut', batch: 'EO-2026-051',
    quantityMt: 150, status: 'In store', grade: 'Grade 3', allocation: '', sma: false,
  },
  {
    id: 'SL-7', warehouse: 'WH-0301 Port Sudan Transit', city: 'Port Sudan', commodity: 'Sesame', batch: 'GD-2026-114',
    quantityMt: 238.8, status: 'In store', grade: 'Grade 2', allocation: 'P30000718-1',
    goodsInTransit: 'Received from MOV-0552', sma: false,
  },
];

/* Whether allocated stock may be transferred is a configuration point (S6.5). */
export const ALLOCATED_TRANSFER_ALLOWED = true;
export const ALLOCATED_TRANSFER_CONDITION =
  'Allocated stock may be transferred where the allocation is not yet dispatched and the contract permits substitution.';

export type SmaPrice = {
  id: string;
  country: string;
  commodity: string;
  price: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string;
  updatedBy: string;
};

export const SMA_PRICES: SmaPrice[] = [
  { id: 'PR-1', country: 'Sudan', commodity: 'Sesame', price: 640, currency: 'USD', effectiveFrom: '01-Aug-2026', effectiveTo: '31-Aug-2026', updatedBy: 'Price owner · 30-Jul-2026' },
  { id: 'PR-2', country: 'Sudan', commodity: 'Sesame', price: 615, currency: 'USD', effectiveFrom: '01-Jul-2026', effectiveTo: '31-Jul-2026', updatedBy: 'Price owner · 29-Jun-2026' },
  { id: 'PR-3', country: 'Sudan', commodity: 'Gum Arabic', price: 1450, currency: 'USD', effectiveFrom: '01-Aug-2026', effectiveTo: '31-Aug-2026', updatedBy: 'Price owner · 30-Jul-2026' },
  { id: 'PR-4', country: 'Sudan', commodity: 'Groundnut', price: 560, currency: 'USD', effectiveFrom: '01-Aug-2026', effectiveTo: '31-Aug-2026', updatedBy: 'Price owner · 30-Jul-2026' },
];

export type Transfer = {
  id: string;
  date: string;
  warehouse: string;
  commodity: string;
  batch: string;
  quantityMt: number;
  price: number;
  value: number;
  invoiceRef: string;
  performedBy: string;
  approval: 'Not required' | 'Pending approval' | 'Approved';
};

export const TRANSFERS: Transfer[] = [
  { id: 'TRF-0021', date: '14-Aug-2026', warehouse: 'WH-0142 Gedaref Store 1', commodity: 'Sesame', batch: 'GD-2026-118', quantityMt: 210, price: 640, value: 134400, invoiceRef: 'INV-SMA-0398', performedBy: 'SMA operator', approval: 'Not required' },
  { id: 'TRF-0019', date: '08-Aug-2026', warehouse: 'WH-0210 El Obeid Store', commodity: 'Gum Arabic', batch: 'EO-2026-070', quantityMt: 90, price: 1450, value: 130500, invoiceRef: 'INV-SMA-0381', performedBy: 'SMA operator', approval: 'Not required' },
];

export type SmaSale = {
  id: string;
  date: string;
  counterparty: string;
  commodity: string;
  batch: string;
  countedMt: number;
  soldMt: number;
  value: number;
  invoiceRef: string;
  invoiceDate: string;
  invoiceValue: number;
  invoiceSource: 'Enterprise system (reference)' | 'COTS';
};

export const SMA_SALES: SmaSale[] = [
  {
    id: 'SMA-S-0088', date: '20-Aug-2026', counterparty: 'Trading company', commodity: 'Sesame', batch: 'GD-2026-118',
    countedMt: 210, soldMt: 208, value: 133120, invoiceRef: 'INV-TC-2211', invoiceDate: '20-Aug-2026',
    invoiceValue: 133120, invoiceSource: 'Enterprise system (reference)',
  },
  {
    id: 'SMA-S-0084', date: '11-Aug-2026', counterparty: 'Trading company', commodity: 'Gum Arabic', batch: 'EO-2026-070',
    countedMt: 90, soldMt: 90, value: 130500, invoiceRef: 'INV-TC-2190', invoiceDate: '12-Aug-2026',
    invoiceValue: 130500, invoiceSource: 'Enterprise system (reference)',
  },
];

export type DebitNote = {
  id: string;
  reason: 'Short' | 'Damage';
  relatedTo: string;
  quantityMt: number;
  value: number;
  reference: string;
  documents: string[];
};

export const DEBIT_NOTES: DebitNote[] = [
  { id: 'DN-1', reason: 'Short', relatedTo: 'SMA-S-0088', quantityMt: 2, value: 1280, reference: 'DN-0031', documents: ['count-sheet.pdf'] },
];

/* Expected position: purchase side from the S01 plans (static here), production side
   derived live from the S01 processing plan SMA flags (see useExpectedSma). */
export const EXPECTED_PURCHASE_BY_MONTH: { month: string; purchaseMt: number; allocatedAddedMt: number }[] = [
  { month: 'Nov', purchaseMt: 1200, allocatedAddedMt: 0 },
  { month: 'Dec', purchaseMt: 1600, allocatedAddedMt: 0 },
  { month: 'Jan', purchaseMt: 1300, allocatedAddedMt: 0 },
  { month: 'Feb', purchaseMt: 900, allocatedAddedMt: 120 },
  { month: 'Mar', purchaseMt: 800, allocatedAddedMt: 0 },
  { month: 'Apr', purchaseMt: 400, allocatedAddedMt: 0 },
];

/* Actual sold by month, for the plan-against-actual comparison. */
export const ACTUAL_BY_MONTH: Record<string, { soldMt: number; invoicedValue: number }> = {
  Nov: { soldMt: 980, invoicedValue: 602000 },
  Dec: { soldMt: 1510, invoicedValue: 966400 },
  Jan: { soldMt: 1180, invoicedValue: 755200 },
  Feb: { soldMt: 940, invoicedValue: 601600 },
};

/* Which countries and commodities operate under the agreement (S6.5 configuration). */
export const SMA_COUNTRIES = ['Sudan'];
