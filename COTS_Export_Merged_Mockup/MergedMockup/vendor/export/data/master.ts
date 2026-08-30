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

import type { AppUser, Commodity, CommodityGroup, Counterparty, Port } from "../domain/types";

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
  {
    id: "u-1",
    username: "execution",
    password: "demo1234",
    displayName: "Amara Osei",
    role: "partner_execution",
    unit: "Port Sudan Execution",
  },
  {
    id: "u-2",
    username: "dubai",
    password: "demo1234",
    displayName: "Rania Haddad",
    role: "dubai_execution",
    unit: "Dubai Execution",
  },
  {
    id: "u-3",
    username: "trader",
    password: "demo1234",
    displayName: "Tomás Ferreira",
    role: "trader",
    unit: "Trading Desk",
  },
  {
    id: "u-4",
    username: "finance",
    password: "demo1234",
    displayName: "Priya Nadar",
    role: "trade_finance",
    unit: "Trade Finance",
  },
  {
    id: "u-5",
    username: "logistics",
    password: "demo1234",
    displayName: "Kwame Boateng",
    role: "logistics",
    unit: "Logistics & Clearance",
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
