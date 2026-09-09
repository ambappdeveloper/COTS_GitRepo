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

/* ================================================================== *
 * Packing sizes and B/L consignees — two masters added 6 September 2026
 *
 * "The Packing size (kg per unit) change to dropdown list and data will come from
 * master data (50, 25, 10, 5, 1)" and "B/L consignee Consignee field is also dropdown
 * list and data will come from master data (CIM, Sayga, DFI, others)".
 *
 * Both were free text on the legacy form, and both are governed values that only look
 * free: a packing size is a bag or bale specification the plant actually fills, and a
 * consignee is a party the bill of lading is made out to. Held here so the contract
 * screen reads them rather than inviting a typo onto a shipping document.
 *
 * [OPEN] Which governed domain each belongs to in Core's C03 master data, and who
 * maintains it. The values below are the ones the instruction names and no more.
 * ================================================================== */

/**
 * The five sizes the instruction names, largest first, as they read on the form.
 *
 * WHAT THE CAPTURED DATA HOLDS THAT THIS LIST DOES NOT. Two of the six seeded contracts
 * carry a size outside it: PC-2044 is cotton lint in 175 kg bales, and PC-2058-LV is
 * bulk and carries 0. Neither is a data error — a bale is not a bag, and bulk cargo has
 * no packing size at all — so the screen shows such a value as an extra option marked
 * as outside the master rather than blanking the field. That is the lesson of the
 * trader drop-down removed on 5 September, which offered four names and silently
 * dropped the fifth the record actually held.
 */
export const PACKING_SIZES_KG: number[] = [50, 25, 10, 5, 1];

/** Whether a captured packing size is one the master offers. */
export function isMasterPackingSize(kg: number): boolean {
  return PACKING_SIZES_KG.includes(kg);
}

export interface ConsigneeMaster {
  code: string;
  /** How it reads on the form and on the bill of lading. */
  name: string;
  /**
   * `true` for the catch-all entry. It is not a consignee: it is the instruction's
   * "others", and choosing it asks for the party to be named, because a bill of lading
   * cannot be made out to the word "others".
   */
  isOther?: boolean;
  active: boolean;
}

export const CONSIGNEES: ConsigneeMaster[] = [
  { code: "CIM", name: "CIM", active: true },
  { code: "SAYGA", name: "Sayga", active: true },
  { code: "DFI", name: "DFI", active: true },
  { code: "OTHER", name: "Others", isOther: true, active: true },
];

/**
 * The master entry a captured consignee string matches, or `undefined` where it matches
 * none — which is every seeded contract: five carry the shipping term "To order" and one
 * names the buyer. Those are read as "Others" with the captured string kept as the name,
 * so that a contract copied by Retrieve PC No. keeps the consignee it was written with.
 */
export function consigneeByName(name?: string): ConsigneeMaster | undefined {
  if (!name?.trim()) return undefined;
  return CONSIGNEES.find((c) => c.name.toLowerCase() === name.trim().toLowerCase() && !c.isOther);
}

/* ================================================================== *
 * Commodity types — the grade or variety, per commodity
 *
 * "Commodity type field change to dropdown list it will come from master data, based on
 * the selected Commodity field." — 6 September 2026.
 *
 * The field was free text with the placeholder "Grade or variety". It is a governed value
 * *and* a dependent one: a grade belongs to a commodity, so a list that ignored the
 * commodity would offer cotton grades against sesame. Held here as a map from commodity
 * id to its own grades, which is the shape the instruction's "based on the selected
 * Commodity field" describes.
 *
 * WHAT IS REAL. Every grade below is invented, as everywhere else in this prototype
 * (acceptance criterion A31), with one exception held verbatim: `Non-GDP` is the type
 * PC-2041 already carries against white sesame, so the master holds it — otherwise a
 * captured contract would name a grade the master does not have.
 *
 * [OPEN] Whether a commodity type is one governed domain per commodity or a single list
 * with a commodity attribute, and who maintains it. Modelled as the former, because the
 * instruction makes the list depend on the commodity. It collapses to the latter trivially.
 *
 * [OPEN] Whether the field is required once a list exists. It is optional today — the
 * legacy form never required it and five of the six captured contracts leave it blank —
 * so it stays optional and no rule is invented.
 * ================================================================== */

export const COMMODITY_TYPES: Record<string, string[]> = {
  /* Verbatim: PC-2041 carries "Non-GDP". The rest are invented. */
  "cm-sesame-white": ["Non-GDP", "Whitish", "Sortex 99/1", "Sortex 99.5/0.5", "Hulling grade"],
  "cm-sesame-red": ["Sortex 99/1", "Natural", "Hulling grade"],
  "cm-sesame-gadarif": ["Non-GDP", "Sortex 99/1", "Natural"],
  "cm-sesame-ng-eastern": ["Non-GDP", "Natural"],
  "cm-sesame-mixed": ["Natural", "Feed grade"],
  "cm-groundnut-hps": ["50/60 count", "60/70 count", "70/80 count", "80/90 count"],
  "cm-peanut-shelled": ["Java", "Bold", "Runner", "Split"],
  "cm-groundnut-oil": ["Crude", "Refined", "Cold pressed"],
  "cm-gum-hashab": ["Cleaned", "Siftings", "Dust", "Kibbled"],
  "cm-gum-talha-fresh": ["Cleaned", "Siftings", "Dust"],
  "cm-cotton-lint": ["Barakat", "Acala", "Shambat B"],
  "cm-cotton-raw": ["Seed cotton", "Gin run"],
  "cm-pigeon-peas": ["Lira", "Arusha", "Split"],
  "cm-chick-peas": ["Kabuli 8mm", "Kabuli 9mm", "Desi"],
  "cm-watermelon-seed": ["Sortex", "Natural"],
  "cm-sorghum": ["Feterita", "Dabar", "Wad Ahmed"],
};

/**
 * The grades held for a commodity, or an empty list where the master holds none — which is
 * a real state, not an error: a commodity may simply not be graded, and the screen says so
 * rather than showing an empty drop-down with no explanation.
 */
export function commodityTypesFor(commodityId?: string): string[] {
  if (!commodityId) return [];
  return COMMODITY_TYPES[commodityId] ?? [];
}

/** Whether a captured commodity type is one the master offers for that commodity. */
export function isMasterCommodityType(commodityId: string, type?: string): boolean {
  if (!type?.trim()) return true;
  return commodityTypesFor(commodityId).includes(type.trim());
}

/* ================================================================== *
 * Bank branches — added 6 September 2026
 *
 * "Bank is from master data and its bank branch dropdown list." The bank itself was
 * already governed — `COUNTERPARTIES` carries two of type `bank` — but the execution plan
 * asked for it as free text, and its branch too. A branch belongs to a bank, so the list
 * is keyed by the bank's id: the same dependent shape as the commodity types.
 *
 * WHAT IS REAL. Two names are held verbatim because captured execution plans carry them:
 * `Head office` on Unity Commercial Bank, and `Trade centre` on Savannah Trade Bank. The
 * rest are invented (A31). A test walks every captured plan and fails if the master has
 * lost a branch one of them names — which is how `Trade centre` was found.
 *
 * [OPEN] Whether a branch is a governed record in its own right — with an address and a
 * SWIFT code, which a bank submittal would need — or a name on the bank. Modelled as a
 * name, because that is all any source carries.
 * ================================================================== */

export const BANK_BRANCHES: Record<string, string[]> = {
  /* Verbatim: the captured plans name this one. */
  "cp-bank-unity": ["Head office", "Port Sudan", "Gedaref", "Khartoum North"],
  "cp-bank-savannah": ["Head office", "Trade centre", "Omdurman", "El Obeid"],
};

/** The branches held for a bank, or an empty list where the master holds none. */
export function bankBranchesFor(bankId?: string): string[] {
  if (!bankId) return [];
  return BANK_BRANCHES[bankId] ?? [];
}

/** The counterparties of one type, active first — the shape a drop-down needs. */
export function counterpartiesOfType(type: Counterparty["type"]): Counterparty[] {
  return COUNTERPARTIES.filter((c) => c.type === type && c.active);
}

/** The bank master entry whose name matches a captured string, or undefined. */
export function bankByName(name?: string): Counterparty | undefined {
  if (!name?.trim()) return undefined;
  return COUNTERPARTIES.find((c) => c.type === "bank" && c.name === name.trim());
}

/** The shipper master entry whose name matches a captured string, or undefined. */
export function shipperByName(name?: string): Counterparty | undefined {
  if (!name?.trim()) return undefined;
  return COUNTERPARTIES.find((c) => c.type === "shipper" && c.name === name.trim());
}

/* ================================================================== *
 * Container types — added 6 September 2026
 *
 * "Change the Container type to dropdown list and data will come from masterdata and the
 * default container type inherited from the Purchase Contract." It was free text on the
 * shipment screen, with a placeholder — `e.g. 20 FT standard` — that was the only thing
 * telling anyone what the value should look like.
 *
 * WHAT IS REAL. `20 FT standard` and `40 FT standard` are held verbatim: every captured
 * shipment carries one or the other. The rest are invented (A31).
 *
 * WHAT THE CONTRACT INHERITS FROM. The purchase contract's *Loading container size* —
 * 20 ft, 40 ft, or both — is the nearest thing the contract holds, and until this change
 * it was collected on the contract form and then dropped on save, exactly as Actual PC
 * was: `Contract` had no such property. It is stored now, and it is what the shipment's
 * container type defaults from. "20 ft and/or 40 ft" defaults to nothing, deliberately:
 * a contract that permits both settles nothing, and guessing one would be an invention.
 * ================================================================== */

export const CONTAINER_TYPES = [
  { value: "20 FT standard", size: "20ft" as const },
  { value: "20 FT ventilated", size: "20ft" as const },
  { value: "40 FT standard", size: "40ft" as const },
  { value: "40 FT high cube", size: "40ft" as const },
  { value: "40 FT ventilated", size: "40ft" as const },
];

/**
 * The container type a contract's loading container size implies, or `undefined` where it
 * implies none — which is both the unset case and the "20 ft and/or 40 ft" case.
 */
export function defaultContainerTypeFor(
  loadingContainerSize?: "20ft" | "40ft" | "20ft_and_40ft",
): string | undefined {
  if (loadingContainerSize !== "20ft" && loadingContainerSize !== "40ft") return undefined;
  return CONTAINER_TYPES.find((t) => t.size === loadingContainerSize)?.value;
}

/** Whether a captured container type is one the master offers. */
export function isMasterContainerType(value?: string): boolean {
  if (!value?.trim()) return true;
  return CONTAINER_TYPES.some((t) => t.value === value.trim());
}

/* ================================================================== *
 * Payment terms — added 8 September 2026
 *
 * "All payment terms should be a dropdown list, come from master data."
 *
 * Three screens asked for payment terms as free text — the deal agreement (§6.9), the new
 * purchase contract (§6.10) and the new execution plan, whose field is the *export*
 * contract's terms and not the sales contract's. All three are now read from here.
 *
 * WHY THIS IS THE ONE FIELD THAT MOST NEEDED A MASTER. It is not a label: the bank submittal
 * maturity date derives from it (§6.14), which is the reason Phase 10 already proposed making
 * it mandatory. A date cannot be derived from a string somebody typed, and the captured data
 * shows exactly that failure — 865 legacy contracts hold nothing at all, and the eight that
 * do hold something spell it four different ways. Those spellings are the evidence, so they
 * are set out here rather than tidied away:
 *
 *   | Captured on              | Value                        | Reading                 |
 *   | ------------------------ | ---------------------------- | ----------------------- |
 *   | contract PC-2041         | `DA 60 days`                 | D/A, 60-day tenor       |
 *   | contract PC-2044         | `LC at sight`                | L/C, sight              |
 *   | contracts PC-2049/55     | `CAD`, `DP`                  | sight, no tenor named   |
 *   | contracts PC-2052/58-LV  | `TT 30 days`, `LC 90 days`   | instrument plus tenor   |
 *   | deal OPP-2026-014        | `60 days from B/L date, D/A` | `DA 60 days`, in words  |
 *   | deal OPP-2026-011        | `At sight, D/P`              | `DP`, in words          |
 *
 * The last two rows are the argument in two lines. The first is the same term as row one,
 * written unrecognisably differently, on the deal a contract has yet to be raised from — so
 * the prototype's own prefill path carries a term the master cannot recognise, which is why
 * the extra-option rule below is live on the create screen rather than theoretical.
 *
 * The second is worse, and it is a finding rather than a wording problem: OPP-2026-011 is the
 * deal PC-2041 was raised from, and it says D/P at sight where the contract says D/A 60 days.
 * Those are different instruments and different tenors. No screen could have caught it while
 * both were free text. Recorded, not corrected — see the open questions.
 *
 * TWO LEVELS, ONE DOMAIN. A term is an instrument plus a tenor, and the two screens want
 * different halves of it:
 *
 *   · the contract and the deal carry the whole term — `DA 60 days` — because that is what
 *     the maturity date is computed from;
 *   · the execution plan carries the instrument alone — every captured plan holds `DA`,
 *     `LC`, `CAD`, `TT` or `DP` and no tenor, because the export contract's terms are
 *     agreed with the bank and not with the buyer.
 *
 * So `PAYMENT_INSTRUMENTS` is the governed list, and `PAYMENT_TERMS` is the instrument
 * carrying a tenor. The plan's drop-down reads the first, the contract's and the deal's the
 * second. One domain, and the plan's short form is provably a subset of it rather than a
 * second vocabulary that happens to look similar.
 *
 * WHAT IS REAL. Every value the captured records carry is held verbatim, and each is marked
 * below. The rest are invented (A31) and are the ordinary tenors of the instruments already
 * present — no instrument is invented.
 *
 * WHAT THE MASTER DELIBERATELY DOES NOT HOLD. The two long spellings above — `60 days from
 * B/L date, D/A` and `At sight, D/P` — say the same things as `DA 60 days` and `DP at sight`
 * and are not added, because a master that holds two spellings of one term is the problem it
 * was created to solve. They are kept on their records and shown as an extra option marked as
 * outside the master, which is the packing-size rule of 6 September: a list that does not
 * hold the value a record already carries must say so rather than blank the field.
 *
 * [OPEN] Which governed domain in Core's C03 this is, and who maintains it. Payment terms
 * are a treasury matter rather than a commercial one, so the owner is probably neither the
 * trader nor Dubai Execution — but no source names one.
 *
 * [OPEN] Whether the two long spellings are corrected to the canonical term on those two
 * deals, or kept as captured. A cleansing decision, not a screen decision.
 *
 * [OPEN] Which is right on PC-2041 — the contract's `DA 60 days` or its deal's `At sight,
 * D/P`? A commercial question for the trader and Dubai Execution, and the first thing a
 * governed list makes answerable at all.
 *
 * [OPEN] Whether the maturity date should now be computed from the term rather than typed.
 * The bank submittal screen still asks for the date and only *says* it derives from the
 * terms. With a governed tenor it could be derived, and this is what would make the master
 * worth more than tidiness. Not done here — it changes a Phase 14 rule, not a Phase 10 list.
 * ================================================================== */

export interface PaymentInstrument {
  /** The short form the export contract and every captured execution plan carry. */
  code: string;
  /** How it reads in full, for the drop-down and for anyone who does not know the initials. */
  name: string;
  active: boolean;
}

export const DEFAULT_PAYMENT_INSTRUMENTS: PaymentInstrument[] = [
  /* All five are verbatim: each is the instrument of a captured contract or plan. */
  { code: "LC", name: "Letter of credit", active: true },
  { code: "DA", name: "Documents against acceptance", active: true },
  { code: "DP", name: "Documents against payment", active: true },
  { code: "CAD", name: "Cash against documents", active: true },
  { code: "TT", name: "Telegraphic transfer", active: true },
];

export interface PaymentTermMaster {
  /** The instrument's code — the join to `PAYMENT_INSTRUMENTS`. */
  instrument: string;
  /**
   * The term as it reads on a contract, and the value stored on the record. The label is the
   * key deliberately: the captured contracts hold this string and nothing else, so a code
   * would have to be back-fitted onto them before the field could be a list at all.
   */
  label: string;
  /**
   * Days from the bill of lading date, or `0` for a term payable at sight. Held so the bank
   * submittal maturity date can one day be derived rather than typed — see the third open
   * question above. Nothing reads it yet.
   */
  tenorDays: number;
  active: boolean;
}

export const DEFAULT_PAYMENT_TERMS: PaymentTermMaster[] = [
  { instrument: "LC", label: "LC at sight", tenorDays: 0, active: true } /* verbatim — PC-2044 */,
  { instrument: "LC", label: "LC 60 days", tenorDays: 60, active: true },
  { instrument: "LC", label: "LC 90 days", tenorDays: 90, active: true } /* verbatim — PC-2058-LV */,
  { instrument: "DA", label: "DA 30 days", tenorDays: 30, active: true },
  { instrument: "DA", label: "DA 60 days", tenorDays: 60, active: true } /* verbatim — PC-2041 */,
  { instrument: "DA", label: "DA 90 days", tenorDays: 90, active: true },
  { instrument: "DP", label: "DP", tenorDays: 0, active: true } /* verbatim — PC-2055 */,
  { instrument: "DP", label: "DP 30 days", tenorDays: 30, active: true },
  { instrument: "CAD", label: "CAD", tenorDays: 0, active: true } /* verbatim — PC-2049 */,
  { instrument: "TT", label: "TT in advance", tenorDays: 0, active: true },
  { instrument: "TT", label: "TT 30 days", tenorDays: 30, active: true } /* verbatim — PC-2052 */,
];

/* ------------------------------------------------------------------ *
 * Where the two lists actually come from — 8 September 2026, second pass
 *
 * The lists above are this prototype's own, and the first version of this change stopped
 * there. It should not have: C03's domain browser states that nothing is entered as free text
 * anywhere in COTS where a master record exists, and a list held inside one module is a second
 * copy rather than a master. Payment terms are now a governed C03 domain — `paymentterm`, with
 * `paymentinstrument` beside it, both in the Financial group next to `incoterm`.
 *
 * WHY THIS IS A SEAM AND NOT AN IMPORT. This prototype builds and runs on its own, where there
 * is no Core and `@core/*` does not resolve. It cannot import C03. So the arrays above become
 * the *default*, and an integrator may replace them at start-up through
 * `setPaymentTermsSource`. Standalone, nothing calls it and the defaults stand. Integrated,
 * `src/integration/MasterDataSync.tsx` reads the active C03 records and pushes them in — the
 * same direction of travel as `CountrySync`, which pushes the Core session's country into the
 * Shared store: the owning module publishes, the consuming module subscribes, and the consumer
 * is not patched.
 *
 * READ THROUGH THE ACCESSORS. `paymentTerms()` and `paymentInstruments()`, never the arrays.
 * A screen reading `DEFAULT_PAYMENT_TERMS` directly would show this prototype's list while its
 * neighbour showed C03's, which is the two-copies problem again one level down.
 * ------------------------------------------------------------------ */

let instrumentSource: PaymentInstrument[] | null = null;
let termSource: PaymentTermMaster[] | null = null;
let sourceName = "the Export prototype's own list";

/**
 * Replace the payment-terms master for the life of the session. Called by the integrated
 * mock-up with the active C03 records; never called when this prototype runs on its own.
 *
 * `name` is shown on the screens that read the list, so a reviewer can see which master they
 * are looking at without being told.
 */
export function setPaymentTermsSource(next: {
  instruments: PaymentInstrument[];
  terms: PaymentTermMaster[];
  name: string;
}): void {
  instrumentSource = next.instruments;
  termSource = next.terms;
  sourceName = next.name;
}

/** Back to the prototype's own list. Exists for tests; nothing in the app calls it. */
export function clearPaymentTermsSource(): void {
  instrumentSource = null;
  termSource = null;
  sourceName = "the Export prototype's own list";
}

/** The payment instruments in force — C03's where an integrator supplied them. */
export function paymentInstruments(): PaymentInstrument[] {
  return instrumentSource ?? DEFAULT_PAYMENT_INSTRUMENTS;
}

/** The payment terms in force — C03's where an integrator supplied them. */
export function paymentTerms(): PaymentTermMaster[] {
  return termSource ?? DEFAULT_PAYMENT_TERMS;
}

/** What to call the master on screen. */
export function paymentTermsSourceName(): string {
  return sourceName;
}

/** The master entry a captured term matches, or `undefined` where it matches none. */
export function paymentTermByLabel(label?: string): PaymentTermMaster | undefined {
  if (!label?.trim()) return undefined;
  return paymentTerms().find((t) => t.label.toLowerCase() === label.trim().toLowerCase());
}

/**
 * Whether a captured term is one the master offers. Blank counts as inside it: an empty field
 * is the 865 legacy records' state and is caught by the required rule, not by this one.
 */
export function isMasterPaymentTerm(label?: string): boolean {
  if (!label?.trim()) return true;
  return !!paymentTermByLabel(label);
}

/** The instrument a code names, or `undefined` where the master holds none. */
export function paymentInstrumentByCode(code?: string): PaymentInstrument | undefined {
  if (!code?.trim()) return undefined;
  return paymentInstruments().find((i) => i.code.toLowerCase() === code.trim().toLowerCase());
}

/** Whether a captured export-contract payment term is an instrument the master holds. */
export function isMasterPaymentInstrument(code?: string): boolean {
  if (!code?.trim()) return true;
  return !!paymentInstrumentByCode(code);
}
