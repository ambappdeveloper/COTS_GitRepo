// S02 Costing demonstration data. Prototype only — resets on refresh.
// The element set is a LABELLED PLACEHOLDER built from what the source names.
// The costing calculation sheet and the country cost element definitions are still to be provided.

export type Basis = 'Per MT' | 'Per day' | 'Per bag';
export type Category = 'Raw material' | 'Processing' | 'Execution operation';
export type Structure = 'Owned' | 'Rented' | 'Both';

export type CostElement = {
  id: string;
  code: string;
  description: string;
  category: Category;
  country: string;
  commodity: string;
  location: string;
  structure: Structure;
  basis: Basis;
  valueType: 'Fixed' | 'Range';
  value?: number;
  min?: number;
  max?: number;
  currency: string;
  validityDays: number;
  validFrom: string;
  validTo: string;
  ownerRole: 'Sourcing' | 'Processing' | 'Execution';
  notes: string;
  /** freight elements are fed from the S05 rate grid — the lane they follow */
  s05Lane?: string;
};

export const COST_ELEMENTS: CostElement[] = [
  {
    id: 'CE-1', code: 'RAW-PUR', description: 'Raw material purchase', category: 'Raw material',
    country: 'Sudan', commodity: 'Sesame', location: 'Gedaref', structure: 'Both',
    basis: 'Per MT', valueType: 'Fixed', value: 620, currency: 'USD',
    validityDays: 30, validFrom: '01-Aug-2026', validTo: '31-Aug-2026', ownerRole: 'Sourcing',
    notes: 'Expected purchase price for the current season window.',
  },
  {
    id: 'CE-2', code: 'RAW-FEE', description: 'Government fees and commissions', category: 'Raw material',
    country: 'Sudan', commodity: 'Sesame', location: 'Gedaref', structure: 'Both',
    basis: 'Per MT', valueType: 'Fixed', value: 22, currency: 'USD',
    validityDays: 60, validFrom: '01-Jul-2026', validTo: '29-Aug-2026', ownerRole: 'Sourcing',
    notes: 'Per the sourcing agreement terms.',
  },
  {
    id: 'CE-3', code: 'PRC-CLN', description: 'Cleaning and grading', category: 'Processing',
    country: 'Sudan', commodity: 'Sesame', location: 'Gedaref', structure: 'Owned',
    basis: 'Per MT', valueType: 'Fixed', value: 18, currency: 'USD',
    validityDays: 45, validFrom: '05-Aug-2026', validTo: '19-Sep-2026', ownerRole: 'Processing',
    notes: 'Owned facility cost per tonne processed.',
  },
  {
    id: 'CE-4', code: 'PRC-RENT', description: 'Third-party cleaning line hire', category: 'Processing',
    country: 'Sudan', commodity: 'Sesame', location: 'Gedaref', structure: 'Rented',
    basis: 'Per day', valueType: 'Range', min: 850, max: 1150, currency: 'USD',
    validityDays: 30, validFrom: '01-Aug-2026', validTo: '31-Aug-2026', ownerRole: 'Processing',
    notes: 'Range reflects the two contractors quoted; rate band, not a fixed price.',
  },
  {
    id: 'CE-5', code: 'PRC-BAG', description: 'Bagging and marking', category: 'Processing',
    country: 'Sudan', commodity: 'Sesame', location: 'Gedaref', structure: 'Both',
    basis: 'Per bag', valueType: 'Fixed', value: 0.85, currency: 'USD',
    validityDays: 90, validFrom: '01-Jun-2026', validTo: '24-Aug-2026', ownerRole: 'Processing',
    notes: 'Includes bag, thread and marking. Deliberately close to expiry — it warns, but it does not block.',
  },
  {
    id: 'CE-6', code: 'EXE-INL', description: 'Inland transport to port', category: 'Execution operation',
    country: 'Sudan', commodity: 'Sesame', location: 'Port Sudan', structure: 'Both',
    basis: 'Per MT', valueType: 'Fixed', value: 46, currency: 'USD',
    validityDays: 30, validFrom: '01-Aug-2026', validTo: '31-Aug-2026', ownerRole: 'Execution',
    notes: 'Gedaref to Port Sudan, based on the current haulage contract.',
  },
  {
    id: 'CE-7', code: 'EXE-STF', description: 'Stuffing and port handling', category: 'Execution operation',
    country: 'Sudan', commodity: 'Sesame', location: 'Port Sudan', structure: 'Both',
    basis: 'Per MT', valueType: 'Fixed', value: 14, currency: 'USD',
    validityDays: 30, validFrom: '01-Aug-2026', validTo: '31-Aug-2026', ownerRole: 'Execution',
    notes: '',
  },
  {
    id: 'CE-8', code: 'EXE-FRT', description: 'Ocean freight', category: 'Execution operation',
    country: 'Sudan', commodity: 'Sesame', location: 'Port Sudan', structure: 'Both',
    basis: 'Per MT', valueType: 'Range', min: 0, max: 0, currency: 'USD',
    validityDays: 30, validFrom: '01-Aug-2026', validTo: '31-Aug-2026', ownerRole: 'Execution',
    notes: 'Derived from the S05 freight rate grid for the selected lane; commonly a range across shipping lines.',
    s05Lane: 'auto',
  },
  {
    id: 'CE-9', code: 'EXE-INS', description: 'Marine insurance', category: 'Execution operation',
    country: 'Sudan', commodity: 'Sesame', location: 'Port Sudan', structure: 'Both',
    basis: 'Per MT', valueType: 'Fixed', value: 6, currency: 'USD',
    validityDays: 30, validFrom: '25-Jun-2026', validTo: '25-Jul-2026', ownerRole: 'Execution',
    notes: 'Applies on CIF only. Not updated since July — deliberately expired in the demonstration data, so that switching the incoterm to CIF brings an expired element into scope.',
  },
  {
    id: 'CE-10', code: 'EXE-DOC', description: 'Documentation and certification', category: 'Execution operation',
    country: 'Sudan', commodity: 'Sesame', location: 'Port Sudan', structure: 'Both',
    basis: 'Per MT', valueType: 'Fixed', value: 3.5, currency: 'USD',
    validityDays: 30, validFrom: '01-Aug-2026', validTo: '31-Aug-2026', ownerRole: 'Execution',
    notes: 'Port documentation, phytosanitary and certificate of origin.',
  },
];

/** Which elements each incoterm includes (S2.6 configuration). */
export const INCOTERM_INCLUSION: Record<string, string[]> = {
  FOB: ['RAW-PUR', 'RAW-FEE', 'PRC-CLN', 'PRC-RENT', 'PRC-BAG', 'EXE-INL', 'EXE-STF', 'EXE-DOC'],
  CFR: ['RAW-PUR', 'RAW-FEE', 'PRC-CLN', 'PRC-RENT', 'PRC-BAG', 'EXE-INL', 'EXE-STF', 'EXE-DOC', 'EXE-FRT'],
  CIF: ['RAW-PUR', 'RAW-FEE', 'PRC-CLN', 'PRC-RENT', 'PRC-BAG', 'EXE-INL', 'EXE-STF', 'EXE-DOC', 'EXE-FRT', 'EXE-INS'],
};

export const INCOTERMS = ['FOB', 'CFR', 'CIF'] as const;

/** Destination → the S05 lane the freight element follows. */
export const DESTINATION_LANE: Record<string, string> = {
  'Nhava Sheva': 'Port Sudan → Nhava Sheva',
  Mersin: 'Port Sudan → Mersin',
  Shanghai: 'Port Sudan → Shanghai',
  Rotterdam: 'Djibouti → Rotterdam',
};

export type OtherCost = { description: string; amount: number; currency: string };

export type Snapshot = {
  id: string;
  createdBy: string;
  createdOn: string;
  commodity: string;
  origin: string;
  destination: string;
  incoterm: string;
  structure: 'Owned' | 'Rented';
  rawMaterialPrice: number;
  salesPrice: number;
  targetMargin: number;
  quantityMt: number;
  days: number;
  bags: number;
  /** element values as at the snapshot date — this is what makes it reproducible */
  elementsUsed: { code: string; description: string; basis: Basis; multiplier: number; min: number; max: number; validTo: string }[];
  otherCosts: OtherCost[];
  costMin: number;
  costMax: number;
  position?: 'Short' | 'Long';
  dealRef?: string;
  locked: boolean;
  superseded?: boolean;
};

export const SNAPSHOTS: Snapshot[] = [
  {
    id: 'CS-0271', createdBy: 'Trader — A. Bakri', createdOn: '12-Aug-2026',
    commodity: 'Sesame', origin: 'Gedaref', destination: 'Nhava Sheva', incoterm: 'CIF', structure: 'Owned',
    rawMaterialPrice: 620, salesPrice: 940, targetMargin: 12, quantityMt: 240, days: 6, bags: 4800,
    elementsUsed: [
      { code: 'RAW-PUR', description: 'Raw material purchase', basis: 'Per MT', multiplier: 240, min: 620, max: 620, validTo: '31-Aug-2026' },
      { code: 'EXE-FRT', description: 'Ocean freight', basis: 'Per MT', multiplier: 240, min: 7.48, max: 7.83, validTo: '31-Aug-2026' },
    ],
    otherCosts: [{ description: 'Fumigation certificate at destination', amount: 450, currency: 'USD' }],
    costMin: 168500, costMax: 172400,
    position: 'Short', dealRef: 'DEAL-0455', locked: true,
  },
  {
    id: 'CS-0272', createdBy: 'Trader — A. Bakri', createdOn: '18-Aug-2026',
    commodity: 'Sesame', origin: 'Gedaref', destination: 'Nhava Sheva', incoterm: 'CFR', structure: 'Owned',
    rawMaterialPrice: 620, salesPrice: 928, targetMargin: 12, quantityMt: 240, days: 6, bags: 4800,
    elementsUsed: [
      { code: 'RAW-PUR', description: 'Raw material purchase', basis: 'Per MT', multiplier: 240, min: 620, max: 620, validTo: '31-Aug-2026' },
      { code: 'EXE-FRT', description: 'Ocean freight', basis: 'Per MT', multiplier: 240, min: 7.48, max: 7.83, validTo: '31-Aug-2026' },
    ],
    otherCosts: [],
    costMin: 166900, costMax: 170300,
    locked: false,
  },
];

/** Contracts for the estimated-against-actual report. Actual cost is deliberately unpopulated. */
export const CONTRACT_PERFORMANCE = [
  { contract: 'P30000718-1', commodity: 'Sesame', destination: 'Nhava Sheva', incoterm: 'CIF', snapshot: 'CS-0271', estMin: 168500, estMax: 172400, marginEst: 53100 },
  { contract: 'S30000942-1', commodity: 'Sesame', destination: 'Mersin', incoterm: 'CFR', snapshot: 'CS-0258', estMin: 141200, estMax: 143900, marginEst: 47600 },
];
