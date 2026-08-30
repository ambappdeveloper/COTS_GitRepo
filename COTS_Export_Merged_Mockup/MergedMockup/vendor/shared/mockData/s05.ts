// S05 Logistics demonstration data. Prototype only — resets on refresh.

export type CountryModel = { country: string; usesServiceRequest: boolean; model: string; modes: string[] };

export const COUNTRY_MODELS: CountryModel[] = [
  { country: 'Sudan', usesServiceRequest: true, model: 'A service request is raised to the logistics department, which is currently handled in the enterprise system.', modes: ['Truck', 'Container on truck'] },
  { country: 'Chad', usesServiceRequest: false, model: 'Transportation is arranged by the local team, Chad to Douala.', modes: ['Truck', 'Container on truck'] },
  { country: 'Ethiopia', usesServiceRequest: false, model: 'Transportation is arranged by a contracted agent, Ethiopia to Djibouti, by truck or by rail.', modes: ['Truck', 'Rail', 'Container on truck'] },
];

// The source states these information sets remain undesigned — offered but disabled.
export const UNDESIGNED_MODES = ['Road shipment', 'Bulk vessel', 'Air freight'];

export type ServiceRequest = {
  id: string;
  country: string;
  requester: string;
  requirement: string;
  commodity: string;
  quantityMt: number;
  origin: string;
  destination: string;
  dateRequired: string;
  response: string;
  status: 'Raised' | 'Logistics responded' | 'Accepted';
  movementRef?: string;
};

export const SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: 'SR-0187', country: 'Sudan', requester: 'M. Idris (Processing)',
    requirement: '240 MT sesame from Gedaref to Port Sudan for stuffing week 34',
    commodity: 'Sesame', quantityMt: 240, origin: 'Gedaref Central', destination: 'Port Sudan Yard',
    dateRequired: '24-Aug-2026', response: 'Two trucks allocated from Nile Haulage', status: 'Accepted', movementRef: 'MOV-0552',
  },
  {
    id: 'SR-0188', country: 'Sudan', requester: 'F. Ahmed (Sourcing)',
    requirement: '90 MT groundnut, Kosti buying point to El Obeid Store',
    commodity: 'Groundnut', quantityMt: 90, origin: 'El Obeid Depot', destination: 'El Obeid Depot',
    dateRequired: '26-Aug-2026', response: '', status: 'Raised',
  },
];

export type TripDetail = {
  tripRef: string;
  vehicle: string;
  driver: string;
  transporter: string;
  capacityMt: number;
  quantityMt: number;
};

export type BulkDay = { date: string; route: string; trips: number; loadedMt: number; receivedMt: number };

export type Movement = {
  id: string;
  type: 'Supplier receipt' | 'Inter-location transfer' | 'Loading for delivery';
  tracking: 'Truck detail' | 'Bulk daily';
  country: string;
  mode: string;
  origin: string;
  destination: string;
  commodity: string;
  originatingRecord: string;
  originatingRoute?: string;
  loadedMt: number | null;
  receivedMt: number | null;
  loadingDate: string;
  departureDate: string;
  arrivalDate: string;
  status: 'Created' | 'Loaded' | 'In transit' | 'Received' | 'Closed';
  trips: TripDetail[];
  days: BulkDay[];
  varianceCase?: string;
  externalAuthoritative: boolean;
};

export const MOVEMENTS: Movement[] = [
  {
    id: 'MOV-0552', type: 'Loading for delivery', tracking: 'Truck detail', country: 'Sudan', mode: 'Truck',
    origin: 'Gedaref Central', destination: 'Port Sudan Yard', commodity: 'Sesame',
    originatingRecord: 'Service request SR-0187', originatingRoute: '/s05/requests',
    loadedMt: 240, receivedMt: 238.8,
    loadingDate: '19-Aug-2026', departureDate: '19-Aug-2026', arrivalDate: '21-Aug-2026', status: 'Received',
    trips: [
      { tripRef: 'TRP-1188', vehicle: 'SD-4471', driver: 'A. Hamid', transporter: 'Nile Haulage', capacityMt: 30, quantityMt: 28 },
      { tripRef: 'TRP-1189', vehicle: 'SD-5120', driver: 'Y. Bashir', transporter: 'Nile Haulage', capacityMt: 30, quantityMt: 29 },
    ],
    days: [],
    varianceCase: 'VAR-0051',
    externalAuthoritative: false,
  },
  {
    id: 'MOV-0553', type: 'Supplier receipt', tracking: 'Bulk daily', country: 'Sudan', mode: 'Truck',
    origin: 'Kosti buying point', destination: 'El Obeid Depot', commodity: 'Groundnut',
    originatingRecord: 'Purchase delivery PD-0774',
    loadedMt: 336, receivedMt: null,
    loadingDate: '18-Aug-2026', departureDate: '18-Aug-2026', arrivalDate: '', status: 'In transit',
    trips: [],
    days: [
      { date: '18-Aug-2026', route: 'Kosti → El Obeid', trips: 6, loadedMt: 168, receivedMt: 166.4 },
      { date: '19-Aug-2026', route: 'Kosti → El Obeid', trips: 6, loadedMt: 168, receivedMt: 0 },
    ],
    externalAuthoritative: false,
  },
  {
    id: 'MOV-0554', type: 'Inter-location transfer', tracking: 'Truck detail', country: 'Ethiopia', mode: 'Rail',
    origin: 'Addis Ababa', destination: 'Djibouti', commodity: 'Sesame',
    originatingRecord: 'Stock transfer TR-0231',
    loadedMt: 500, receivedMt: null,
    loadingDate: '17-Aug-2026', departureDate: '17-Aug-2026', arrivalDate: '', status: 'In transit',
    trips: [{ tripRef: 'TRP-2001', vehicle: 'Rail wagon set 12', driver: '—', transporter: 'Contracted agent — ETH', capacityMt: 500, quantityMt: 500 }],
    days: [],
    externalAuthoritative: true,
  },
];

export type ShuntingRow = {
  id: string;
  period: string;
  date: string;
  origin: string;
  destination: string;
  trips: number;
  commodity: string;
  quantityMt: number;
  sma: boolean;
};

export const SHUNTING: ShuntingRow[] = [
  { id: 'SH-1', period: 'Aug 2026', date: '18-Aug-2026', origin: 'Gedaref Store 1', destination: 'Gedaref Mill', trips: 4, commodity: 'Sesame', quantityMt: 96, sma: true },
  { id: 'SH-2', period: 'Aug 2026', date: '18-Aug-2026', origin: 'Gedaref Mill', destination: 'Gedaref Store 2', trips: 3, commodity: 'Sesame', quantityMt: 72, sma: true },
  { id: 'SH-3', period: 'Aug 2026', date: '19-Aug-2026', origin: 'Gedaref Store 2', destination: 'Gedaref Mill', trips: 2, commodity: 'Groundnut', quantityMt: 48, sma: false },
];

/* ------------------------------------------------------------ freight rates -- */

export const LOADING_PORTS = ['Port Sudan', 'Douala', 'Djibouti'];
export const DESTINATION_PORTS = ['Nhava Sheva', 'Shanghai', 'Mersin', 'Rotterdam'];
export const SHIPPING_LINES = ['Maersk', 'MSC', 'CMA CGM'];
export const CONTAINER_SIZES = ['20 ft', '40 ft'] as const;

export type FreightRate = {
  id: string;
  loadingPort: string;
  destinationPort: string;
  commodity: string;
  // rate cell keyed by `${size}|${line}`
  rates: Record<string, number>;
  currency: string;
  validFrom: string;
  validTo: string;
  source: 'Manual' | 'Rate service';
};

export const FREIGHT_RATES: FreightRate[] = [
  {
    id: 'FR-1', loadingPort: 'Port Sudan', destinationPort: 'Nhava Sheva', commodity: 'Sesame',
    rates: { '20 ft|Maersk': 1850, '40 ft|Maersk': 2650, '20 ft|MSC': 1795, '40 ft|MSC': 2590, '20 ft|CMA CGM': 1880 },
    currency: 'USD', validFrom: '01-Aug-2026', validTo: '31-Aug-2026', source: 'Manual',
  },
  {
    id: 'FR-2', loadingPort: 'Port Sudan', destinationPort: 'Mersin', commodity: 'Sesame',
    rates: { '20 ft|Maersk': 1250, '40 ft|Maersk': 1780, '20 ft|MSC': 1210 },
    currency: 'USD', validFrom: '01-Aug-2026', validTo: '31-Aug-2026', source: 'Manual',
  },
  {
    id: 'FR-3', loadingPort: 'Port Sudan', destinationPort: 'Shanghai', commodity: 'Gum Arabic',
    rates: { '20 ft|MSC': 2050, '40 ft|MSC': 2980 },
    currency: 'USD', validFrom: '01-Jul-2026', validTo: '31-Jul-2026', source: 'Rate service',
  },
  {
    id: 'FR-4', loadingPort: 'Djibouti', destinationPort: 'Rotterdam', commodity: 'Sesame',
    rates: { '40 ft|CMA CGM': 3120 },
    currency: 'USD', validFrom: '10-Aug-2026', validTo: '22-Aug-2026', source: 'Manual',
  },
];

// Retrieved by the online rate service — review and confirmation only (WF-S05-04 / Step 3)
export const RETRIEVED_RATES: { lane: string; size: string; line: string; retrieved: number; current: number }[] = [
  { lane: 'Port Sudan → Nhava Sheva', size: '20 ft', line: 'Maersk', retrieved: 1910, current: 1850 },
  { lane: 'Port Sudan → Nhava Sheva', size: '40 ft', line: 'Maersk', retrieved: 2705, current: 2650 },
  { lane: 'Port Sudan → Mersin', size: '20 ft', line: 'MSC', retrieved: 1185, current: 1210 },
  { lane: 'Port Sudan → Shanghai', size: '20 ft', line: 'MSC', retrieved: 2120, current: 2050 },
];

/* --------------------------------------------------------------- clearance --- */

export type Clearance = {
  id: string;
  shipment: string;
  declarationRef: string;
  additionalRefs: string[];
  lodgedDate: string;
  clearedDate: string;
  status: 'In progress' | 'Documents attached' | 'Cleared';
  documents: string[];
  lastUpdated: string;
};

export const CLEARANCES: Clearance[] = [
  {
    id: 'CLR-0121', shipment: 'SHP-0244', declarationRef: 'SD-CUS-88421',
    additionalRefs: ['Manifest 4471'], lodgedDate: '17-Aug-2026', clearedDate: '19-Aug-2026',
    status: 'Cleared', documents: ['customs-declaration.pdf', 'phyto-certificate.pdf', 'port-release.pdf'],
    lastUpdated: 'N. Adam (Clearance) · 19-Aug-2026',
  },
  {
    id: 'CLR-0122', shipment: 'SHP-0247', declarationRef: 'SD-CUS-88510',
    additionalRefs: [], lodgedDate: '19-Aug-2026', clearedDate: '',
    status: 'In progress', documents: ['customs-declaration.pdf'],
    lastUpdated: 'N. Adam (Clearance) · 19-Aug-2026',
  },
];

// Placeholder templates — the country templates are to be confirmed with logistics.
export const CLEARANCE_TEMPLATES = [
  { name: 'Customs authority summary (placeholder)', party: 'Customs authority', fields: ['Shipment', 'Declaration reference', 'Lodged date', 'Commodity', 'Quantity'] },
  { name: 'Port agent handover (placeholder)', party: 'Port agent', fields: ['Shipment', 'Container numbers', 'Cleared date', 'Documents attached'] },
];
