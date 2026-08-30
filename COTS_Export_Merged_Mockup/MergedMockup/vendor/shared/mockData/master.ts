// Static demonstration master data (Core C3). Prototype only.

export const COUNTRIES = ['Sudan', 'Ethiopia', 'Chad'] as const;

export type Season = {
  id: string;
  country: string;
  label: string;
  start: string;
  end: string;
  status: 'Open' | 'Closed';
  months: string[]; // month columns of the season, in order
};

export const SEASONS: Season[] = [
  {
    id: 'SD-2526',
    country: 'Sudan',
    label: 'Nov 2025 – Aug 2026',
    start: '01-Nov-2025',
    end: '31-Aug-2026',
    status: 'Open',
    months: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
  },
  {
    id: 'SD-2425',
    country: 'Sudan',
    label: 'Nov 2024 – Aug 2025',
    start: '01-Nov-2024',
    end: '31-Aug-2025',
    status: 'Closed',
    months: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
  },
  {
    id: 'ET-2526',
    country: 'Ethiopia',
    label: 'Oct 2025 – Jul 2026',
    start: '01-Oct-2025',
    end: '31-Jul-2026',
    status: 'Open',
    months: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  },
];

export const COMMODITY_GROUPS = ['Oilseeds', 'Pulses', 'Gum'] as const;

export const COMMODITIES: { name: string; group: string }[] = [
  { name: 'Sesame', group: 'Oilseeds' },
  { name: 'Groundnut', group: 'Oilseeds' },
  { name: 'Chickpea', group: 'Pulses' },
  { name: 'Gum Arabic', group: 'Gum' },
];

export const CITIES: { name: string; country: string }[] = [
  { name: 'Gedaref', country: 'Sudan' },
  { name: 'El Obeid', country: 'Sudan' },
  { name: 'Port Sudan', country: 'Sudan' },
  { name: 'Addis Ababa', country: 'Ethiopia' },
];

export const LOCATIONS: { name: string; city: string }[] = [
  { name: 'Gedaref Central', city: 'Gedaref' },
  { name: 'Gedaref East', city: 'Gedaref' },
  { name: 'El Obeid Depot', city: 'El Obeid' },
  { name: 'Port Sudan Yard', city: 'Port Sudan' },
];

export const FACILITIES: { name: string; city: string; ratePerDay: number }[] = [
  { name: 'Gedaref Mill', city: 'Gedaref', ratePerDay: 45 },
  { name: 'El Obeid Cleaning Line', city: 'El Obeid', ratePerDay: 30 },
  { name: 'Port Sudan Packing', city: 'Port Sudan', ratePerDay: 60 },
];

export const WAREHOUSES: {
  code: string;
  name: string;
  city: string;
  capacityMt: number;
  conversion: number; // m² per MT, per commodity and packaging (C10 configuration)
}[] = [
  { code: 'WH-0142', name: 'Gedaref Store 1', city: 'Gedaref', capacityMt: 4500, conversion: 1.5 },
  { code: 'WH-0143', name: 'Gedaref Store 2', city: 'Gedaref', capacityMt: 2000, conversion: 1.5 },
  { code: 'WH-0210', name: 'El Obeid Store', city: 'El Obeid', capacityMt: 3000, conversion: 1.4 },
  { code: 'WH-0301', name: 'Port Sudan Transit', city: 'Port Sudan', capacityMt: 6000, conversion: 1.6 },
];

export const AGENTS = [
  { name: 'Agent — El Fasher', area: 'North Darfur' },
  { name: 'Agent — Gedaref North', area: 'Gedaref' },
  { name: 'Agent — Kosti', area: 'White Nile' },
];

export const TRADERS = ['A. Bakri Trading', 'Nile Commodities', 'Sahel Grain', 'Kordofan Traders'];

export const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];

export const DEMO_USERS = {
  planner: 'A. Osman (Planner)',
  processing: 'M. Idris (Processing)',
  approver: 'H. Suleiman (Country Manager)',
  sourcing: 'F. Ahmed (Sourcing)',
};
