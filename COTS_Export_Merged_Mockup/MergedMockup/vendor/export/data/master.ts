/**
 * Synthetic master data.
 *
 * All names, codes and values here are invented for the mock-up. No customer,
 * supplier, bank, contract number, price or personal name from the source documents
 * is reproduced (acceptance criterion A31).
 *
 * The commodity list is modelled on the legacy `Raw Material (Commodities)` list but
 * normalised: it adds the code, category, UOM defaults, quality parameters and the
 * `active` flag that the legacy one-column list lacks (defect §4.3h).
 */

import type {
  AppUser,
  Commodity,
  CommodityGroup,
  Counterparty,
  CountryUnit,
  Port,
  ReceivingLocationKind,
} from "../domain/types";

export const COMMODITIES: Commodity[] = [
  {
    id: "cm-sesame-white",
    code: "SES-WHT",
    name: "White sesame seed",
    category: "oilseed",
    group: "Sesame Category",
    defaultPackingType: "bags",
    qualityParameters: [
      { name: "Moisture", spec: "≤ 6.0 %" },
      { name: "Free fatty acid", spec: "≤ 2.0 %" },
      { name: "Admixture", spec: "≤ 2.0 %" },
      { name: "Oil content", spec: "≥ 50 %" },
    ],
    requiresFumigation: true,
    active: true,
  },
  {
    id: "cm-sesame-red",
    code: "SES-RED",
    name: "Red sesame seed",
    category: "oilseed",
    group: "Sesame Category",
    defaultPackingType: "bags",
    qualityParameters: [
      { name: "Moisture", spec: "≤ 6.5 %" },
      { name: "Admixture", spec: "≤ 2.0 %" },
    ],
    requiresFumigation: true,
    active: true,
  },
  {
    id: "cm-groundnut-hps",
    code: "GNT-HPS",
    name: "Groundnut kernels HPS",
    category: "nut",
    group: "Peanut Category",
    defaultPackingType: "bags",
    qualityParameters: [
      { name: "Moisture", spec: "≤ 8.0 %" },
      { name: "Aflatoxin B1", spec: "≤ 2 ppb" },
      { name: "Count per ounce", spec: "38 – 42" },
    ],
    requiresFumigation: true,
    active: true,
  },
  {
    id: "cm-groundnut-oil",
    code: "GNT-OIL",
    name: "Groundnut oil",
    category: "oil",
    group: "Peanut Category",
    defaultPackingType: "flexi_tank",
    qualityParameters: [
      { name: "Free fatty acid", spec: "≤ 0.5 %" },
      { name: "Moisture & impurities", spec: "≤ 0.2 %" },
    ],
    requiresFumigation: false,
    active: true,
  },
  {
    id: "cm-gum-hashab",
    code: "GUM-HSB",
    name: "Gum arabic (hashab)",
    category: "gum",
    group: "Gum Arabic Category",
    defaultPackingType: "bags",
    qualityParameters: [
      { name: "Moisture", spec: "≤ 15 %" },
      { name: "Ash", spec: "≤ 4 %" },
      { name: "Insoluble matter", spec: "≤ 1 %" },
    ],
    requiresFumigation: false,
    active: true,
  },
  {
    id: "cm-cotton-lint",
    code: "COT-LNT",
    name: "Cotton lint",
    category: "cotton",
    group: "Cotton Category",
    defaultPackingType: "bales",
    qualityParameters: [
      { name: "Staple length", spec: "≥ 28 mm" },
      { name: "Micronaire", spec: "3.8 – 4.6" },
      { name: "Trash", spec: "≤ 3 %" },
    ],
    requiresFumigation: false,
    active: true,
  },
  {
    id: "cm-pigeon-peas",
    code: "PGP-STD",
    name: "Pigeon peas",
    category: "pulse",
    group: "Others",
    defaultPackingType: "bags",
    qualityParameters: [{ name: "Moisture", spec: "≤ 12 %" }],
    requiresFumigation: true,
    active: true,
  },
  {
    id: "cm-watermelon-seed",
    code: "WML-SED",
    name: "Watermelon seed",
    category: "oilseed",
    group: "Others",
    defaultPackingType: "bags",
    qualityParameters: [{ name: "Moisture", spec: "≤ 8 %" }],
    requiresFumigation: true,
    // Reactivated at mock-up v2.2: the Plan sheet writes WM-Seeds into the
    // export plan, so it can no longer be the retired example. The `active`
    // flag the legacy master lacks is still demonstrated by the plan's own
    // commodity list, which offers active commodities only.
    active: true,
  },

  /* ------------------------------------------------------------------ *
   * The commodities the export plan is written against
   *
   * Added from the `Commodity` column of the Plan sheet in
   * `Export Plan V1.xlsx`, so that a seasonal purchase plan on screen can be
   * read against that spreadsheet row for row. Three of the sheet's eleven
   * commodities were already here and are reused rather than duplicated —
   * `Red-Sesame` is `cm-sesame-red`, `Pigeon-Peas` is `cm-pigeon-peas` and
   * `WM-Seeds` is `cm-watermelon-seed`, which is reactivated below because the
   * plan uses it.
   *
   * The `group` on each is the sheet's own `Commodity Group` value, not a
   * reading of ours. Note that the sheet puts WM-Seeds and the peas under
   * `Others` while `category` classifies them as an oilseed and a pulse; both
   * are kept, because they answer different questions.
   * ------------------------------------------------------------------ */
  {
    id: "cm-peanut-shelled",
    code: "PNT-SHL",
    name: "Shelled-Peanut",
    category: "nut",
    group: "Peanut Category",
    defaultPackingType: "bags",
    qualityParameters: [
      { name: "Moisture", spec: "≤ 8.0 %" },
      { name: "Aflatoxin", spec: "≤ 4 ppb" },
    ],
    requiresFumigation: true,
    active: true,
  },
  {
    id: "cm-sesame-gadarif",
    code: "SES-GDF",
    name: "Gadarif Sesame",
    category: "oilseed",
    group: "Sesame Category",
    defaultPackingType: "bags",
    qualityParameters: [
      { name: "Moisture", spec: "≤ 6.0 %" },
      { name: "Oil content", spec: "≥ 50 %" },
    ],
    requiresFumigation: true,
    active: true,
  },
  {
    id: "cm-sesame-ng-eastern",
    code: "SES-NGE",
    name: "NG-Sesame/Eastern",
    category: "oilseed",
    group: "Sesame Category",
    defaultPackingType: "bags",
    qualityParameters: [{ name: "Moisture", spec: "≤ 6.0 %" }],
    requiresFumigation: true,
    active: true,
  },
  {
    id: "cm-sesame-mixed",
    code: "SES-MIX",
    name: "Mixed-Sesame",
    category: "oilseed",
    group: "Sesame Category",
    defaultPackingType: "bags",
    qualityParameters: [{ name: "Moisture", spec: "≤ 6.0 %" }],
    requiresFumigation: true,
    active: true,
  },
  {
    id: "cm-cotton-raw",
    code: "COT-RAW",
    name: "Raw-Cotton",
    category: "cotton",
    group: "Cotton Category",
    defaultPackingType: "bales",
    qualityParameters: [{ name: "Moisture", spec: "≤ 8.5 %" }],
    requiresFumigation: false,
    active: true,
  },
  {
    id: "cm-chick-peas",
    code: "CKP-STD",
    name: "Chick-Peas",
    category: "pulse",
    group: "Others",
    defaultPackingType: "bags",
    qualityParameters: [{ name: "Moisture", spec: "≤ 12 %" }],
    requiresFumigation: true,
    active: true,
  },
  {
    id: "cm-gum-talha-fresh",
    code: "GUM-TLH",
    name: "Fresh-Talha",
    category: "gum",
    group: "Gum Arabic Category",
    defaultPackingType: "bags",
    qualityParameters: [{ name: "Moisture", spec: "≤ 15 %" }],
    requiresFumigation: false,
    active: true,
  },
  {
    id: "cm-sorghum",
    code: "SRG-STD",
    name: "Sorghum",
    category: "cereal",
    group: "Sorghum",
    defaultPackingType: "bulk",
    qualityParameters: [{ name: "Moisture", spec: "≤ 13 %" }],
    requiresFumigation: true,
    active: true,
  },
];

export const PORTS: Port[] = [
  { id: "pt-psd", name: "Port Sudan", country: "Sudan", type: "load" },
  { id: "pt-djb", name: "Djibouti", country: "Djibouti", type: "load" },
  { id: "pt-dla", name: "Douala", country: "Cameroon", type: "load" },
  { id: "pt-dar", name: "Dar es Salaam", country: "Tanzania", type: "load" },
  { id: "pt-bei", name: "Beira", country: "Mozambique", type: "load" },
  { id: "pt-qin", name: "Qingdao", country: "China", type: "discharge" },
  { id: "pt-mer", name: "Mersin", country: "Türkiye", type: "discharge" },
  { id: "pt-kar", name: "Port Qasim", country: "Pakistan", type: "discharge" },
  { id: "pt-mun", name: "Mundra", country: "India", type: "discharge" },
  { id: "pt-rtm", name: "Rotterdam", country: "Netherlands", type: "discharge" },
  { id: "pt-jed", name: "Jeddah", country: "Saudi Arabia", type: "both" },
];

export const COUNTERPARTIES: Counterparty[] = [
  // Buyers — invented names
  {
    id: "cp-northharbour",
    name: "North Harbour Foods Ltd",
    nickName: "NorthHarbour",
    address: "18 Marine Parade, Qingdao Free Trade Zone, China",
    country: "China",
    type: "buyer",
    active: true,
  },
  {
    id: "cp-anatolia",
    name: "Anatolia Grain & Seed A.Ş.",
    nickName: "Anatolia",
    address: "Liman Cad. 44, Mersin, Türkiye",
    country: "Türkiye",
    type: "buyer",
    active: true,
  },
  {
    id: "cp-indusmills",
    name: "Indus Valley Mills (Pvt) Ltd",
    nickName: "IndusMills",
    address: "Plot 9, Korangi Industrial Area, Karachi, Pakistan",
    country: "Pakistan",
    type: "buyer",
    active: true,
  },
  {
    id: "cp-kutchagro",
    name: "Kutch Agro Processors Ltd",
    nickName: "KutchAgro",
    address: "Survey 212, Mundra SEZ, Gujarat, India",
    country: "India",
    type: "buyer",
    active: true,
  },
  {
    id: "cp-lowlands",
    name: "Lowlands Commodity B.V.",
    nickName: "Lowlands",
    address: "Havenstraat 7, Rotterdam, Netherlands",
    country: "Netherlands",
    type: "buyer",
    active: true,
  },
  {
    id: "cp-redsea",
    name: "Red Sea Provisions Co.",
    nickName: "RedSea",
    address: "King Fahd Rd 210, Jeddah, Saudi Arabia",
    country: "Saudi Arabia",
    type: "buyer",
    active: true,
  },
  // Shippers / exporting entities — generic placeholders
  {
    id: "cp-shipper-a",
    name: "Riverbend Trading Co.",
    nickName: "Riverbend",
    address: "PO Box 4120, Khartoum North",
    country: "Sudan",
    type: "shipper",
    active: true,
  },
  {
    id: "cp-shipper-b",
    name: "Greenfield Export FZE",
    nickName: "Greenfield",
    address: "PO Box 262000, JAFZA, UAE",
    country: "UAE",
    type: "shipper",
    active: true,
  },
  // Surveyors
  {
    id: "cp-sv-meridian",
    name: "Meridian Inspection Services",
    nickName: "Meridian",
    address: "Port Sudan",
    country: "Sudan",
    type: "surveyor",
    active: true,
  },
  {
    id: "cp-sv-atlas",
    name: "Atlas Cargo Survey",
    nickName: "Atlas",
    address: "Djibouti",
    country: "Djibouti",
    type: "surveyor",
    active: true,
  },
  // Shipping lines
  {
    id: "cp-line-arcticstar",
    name: "Arctic Star Lines",
    nickName: "ArcticStar",
    address: "—",
    country: "—",
    type: "shipping_line",
    active: true,
  },
  {
    id: "cp-line-orionsea",
    name: "Orion Sea Carriers",
    nickName: "OrionSea",
    address: "—",
    country: "—",
    type: "shipping_line",
    active: true,
  },
  {
    id: "cp-line-cedarmar",
    name: "Cedar Maritime",
    nickName: "CedarMar",
    address: "—",
    country: "—",
    type: "shipping_line",
    active: true,
  },
  // Banks
  {
    id: "cp-bank-unity",
    name: "Unity Commercial Bank",
    nickName: "Unity",
    address: "Khartoum",
    country: "Sudan",
    type: "bank",
    active: true,
  },
  {
    id: "cp-bank-savannah",
    name: "Savannah Trade Bank",
    nickName: "Savannah",
    address: "Khartoum",
    country: "Sudan",
    type: "bank",
    active: true,
  },
  // Forwarders
  {
    id: "cp-fw-caravan",
    name: "Caravan Freight Solutions",
    nickName: "Caravan",
    address: "Addis Ababa",
    country: "Ethiopia",
    type: "forwarder",
    active: true,
  },
  {
    id: "cp-fw-sahel",
    name: "Sahel Logistics SARL",
    nickName: "Sahel",
    address: "N'Djamena",
    country: "Chad",
    type: "forwarder",
    active: true,
  },
  /**
   * Sourcing agents and suppliers — the counterparties the origin-side intake chain
   * buys from. Added for the sourcing-intake module: the MMP `Supplier` picker renders
   * name, address and phone together, which is why the address is populated here.
   * v2.0 §2.2 keeps the sourcing season process out of the export workflow; these
   * exist only so the Phase 06 short-position action and the actual-receipts rule have
   * something real behind them.
   */
  {
    id: "cp-sup-gabani",
    name: "Gabani Agro Trading",
    nickName: "Gabani",
    address: "Souq Libya, Omdurman, Sudan · +249 91 220 4471",
    country: "Sudan",
    type: "supplier",
    active: true,
  },
  {
    id: "cp-sup-abakar",
    name: "Mohamed Hamid Abakar",
    nickName: "M. H. Abakar",
    address: "El Obeid market, North Kordofan, Sudan · +249 91 884 1130",
    country: "Sudan",
    type: "supplier",
    active: true,
  },
  {
    id: "cp-sup-mahaseel",
    name: "Mahaseelna Agricultural Co.",
    nickName: "Mahaseelna",
    address: "Gedaref, Sudan · +249 92 551 7702",
    country: "Sudan",
    type: "supplier",
    active: true,
  },
  {
    id: "cp-sup-sahelseeds",
    name: "Sahel Seeds SARL",
    nickName: "Sahel Seeds",
    address: "Route de Massaguet, N'Djamena, Chad",
    country: "Chad",
    type: "supplier",
    active: true,
  },
];

/**
 * Demo users. Local mock authentication only — no identity provider, no real
 * credentials, no production security. Documented on the login page and in the README.
 */
export const DEMO_USERS: (AppUser & { password: string })[] = [
  /* Every demo account works in Sudan, because the seeded intake, funds, agreements and
     receipts are all Sudanese. `country` is what a screen reads instead of asking — see
     `activeCountryOf()`. Inside the merged mock-up the Core session overwrites it with
     whatever country the user has selected there. */
  {
    id: "u-1",
    username: "execution",
    password: "demo1234",
    displayName: "Amara Osei",
    role: "partner_execution",
    unit: "Port Sudan Execution",
    country: "SD",
  },
  {
    id: "u-2",
    username: "dubai",
    password: "demo1234",
    displayName: "Rania Haddad",
    role: "dubai_execution",
    unit: "Dubai Execution",
    country: "SD",
  },
  {
    id: "u-3",
    username: "trader",
    password: "demo1234",
    displayName: "Tomás Ferreira",
    role: "trader",
    unit: "Trading Desk",
    country: "SD",
  },
  {
    id: "u-4",
    username: "finance",
    password: "demo1234",
    displayName: "Priya Nadar",
    role: "trade_finance",
    unit: "Trade Finance",
    country: "SD",
  },
  {
    id: "u-5",
    username: "logistics",
    password: "demo1234",
    displayName: "Kwame Boateng",
    role: "logistics",
    unit: "Logistics & Clearance",
    country: "SD",
  },
];

export function commodityById(id: string): Commodity | undefined {
  return COMMODITIES.find((c) => c.id === id);
}

/**
 * The `Commodity Group` for a commodity. Read from the master, never typed on a plan, so
 * the plan and the master cannot disagree about which group a commodity belongs to.
 */
export function commodityGroupOf(id?: string): CommodityGroup | undefined {
  return id ? commodityById(id)?.group : undefined;
}

/** The groups present in the master, in the Plan sheet's own order. */
export const COMMODITY_GROUPS: CommodityGroup[] = [
  "Peanut Category",
  "Sesame Category",
  "Cotton Category",
  "Others",
  "Gum Arabic Category",
  "Sorghum",
];
export function portById(id: string): Port | undefined {
  return PORTS.find((p) => p.id === id);
}
export function portName(id?: string): string {
  if (!id) return "–";
  return PORTS.find((p) => p.id === id)?.name ?? id;
}
export function counterpartyById(id?: string): Counterparty | undefined {
  return COUNTERPARTIES.find((c) => c.id === id);
}
export function counterpartyName(id?: string): string {
  if (!id) return "–";
  return counterpartyById(id)?.name ?? id;
}

/* ================================================================== *
 * RECEIVING LOCATION MASTER — facilities and warehouses, by country
 *
 * WHY THIS EXISTS. The instruction of 3 September 2026 gives the receiving-location
 * plan line a Warehouse-or-Facility drop-down, and then makes the location list a
 * master lookup: *"If warehouse all warehouse listed under that country (as per
 * master data) else if Facility all Facility available in that country as per master
 * data."* Before this, the Add screen offered the distinct facility names already
 * present in the plan data — which meant a location could only ever be chosen if
 * some earlier row had already used it, and a warehouse and a facility were the same
 * kind of thing. This is the master those two lists come from.
 *
 * WHAT IS REAL AND WHAT IS NOT. Every code and name below is invented, as everywhere
 * else in this prototype (acceptance criterion A31). Two of them are not free
 * inventions: `FC31 - Mahaseelna`, `FC22 - HMA` and `WH22 - Khartoum2` are the
 * strings the captured plan and receipt rows already carry, so they are held here
 * verbatim and classified by their own prefix — otherwise a saved row would name a
 * location the master does not have, and the Edit screen would silently blank it.
 *
 * [OPEN] Whether COTS holds one receiving-location master per country or one master
 * with a country attribute. Modelled as the latter, because that is what the
 * instruction's "listed under that country" describes and it collapses to the former
 * by filtering.
 * ================================================================== */

export interface ReceivingLocationMaster {
  code: string;
  name: string;
  kind: ReceivingLocationKind;
  country: CountryUnit;
  active: boolean;
}

export const RECEIVING_LOCATIONS: ReceivingLocationMaster[] = [
  /* Sudan — the two facilities and the warehouse the captured data already names. */
  { code: "FC31", name: "Mahaseelna", kind: "facility", country: "SD", active: true },
  { code: "FC22", name: "HMA", kind: "facility", country: "SD", active: true },
  { code: "FC18", name: "Gedaref Cleaning Line", kind: "facility", country: "SD", active: true },
  { code: "WH22", name: "Khartoum2", kind: "warehouse", country: "SD", active: true },
  { code: "WH31", name: "Port Sudan Transit", kind: "warehouse", country: "SD", active: true },
  { code: "WH14", name: "Gedaref Store", kind: "warehouse", country: "SD", active: true },
  /* Ethiopia */
  { code: "FC41", name: "Humera Processing", kind: "facility", country: "ET", active: true },
  { code: "FC44", name: "Metema Line", kind: "facility", country: "ET", active: true },
  { code: "WH41", name: "Modjo Dry Port Store", kind: "warehouse", country: "ET", active: true },
  { code: "WH45", name: "Addis Central Store", kind: "warehouse", country: "ET", active: true },
  /* Chad */
  { code: "FC51", name: "Moundou Facility", kind: "facility", country: "TD", active: true },
  { code: "WH51", name: "N'Djamena Store", kind: "warehouse", country: "TD", active: true },
  /* Tanzania */
  { code: "FC61", name: "Singida Facility", kind: "facility", country: "TZ", active: true },
  { code: "WH61", name: "Dar es Salaam Store", kind: "warehouse", country: "TZ", active: true },
  /* Mozambique */
  { code: "FC71", name: "Nampula Facility", kind: "facility", country: "MZ", active: true },
  { code: "WH71", name: "Beira Store", kind: "warehouse", country: "MZ", active: true },
];

/** How a receiving location reads on a plan line and on a receipt: `<code> - <name>`. */
export function receivingLocationLabel(loc: ReceivingLocationMaster): string {
  return `${loc.code} - ${loc.name}`;
}

/**
 * The active locations of one kind in one country — the two lists the plan line's
 * drop-down switches between.
 */
export function receivingLocationsIn(
  country: CountryUnit,
  kind: ReceivingLocationKind,
): ReceivingLocationMaster[] {
  return RECEIVING_LOCATIONS.filter((l) => l.active && l.country === country && l.kind === kind);
}

/** Find a master location by the `<code> - <name>` string a saved row carries. */
export function receivingLocationByLabel(label?: string): ReceivingLocationMaster | undefined {
  if (!label) return undefined;
  return RECEIVING_LOCATIONS.find((l) => receivingLocationLabel(l) === label);
}

/**
 * Which kind a location string describes, for classifying a row saved before the field
 * existed. The master is asked first; the legacy `WH…` / `FC…` prefix is the fallback,
 * and a string that matches neither is read as a facility, because every captured
 * receipt location that is not a warehouse is one.
 */
export function receivingLocationKindOf(label?: string): ReceivingLocationKind {
  const known = receivingLocationByLabel(label);
  if (known) return known.kind;
  return label?.trim().toUpperCase().startsWith("WH") ? "warehouse" : "facility";
}

/** The countries the receiving-location master holds anything for. */
export function receivingLocationCountries(): CountryUnit[] {
  return [...new Set(RECEIVING_LOCATIONS.filter((l) => l.active).map((l) => l.country))];
}
