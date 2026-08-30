/* ------------------------------------------------------------------ *
 * C10 / C10 — System Configuration and Administration
 *
 * The module nine other modules have been reading without a screen behind
 * it: the country context (C02), the generated code patterns (C03), the
 * approval value bands (C04), the working calendar and quiet hours (C05),
 * the document checklist (C07), the audit levels (C08) and the log levels
 * (C09) are all configuration, and this is where they are defined.
 *
 * The organising rule is WF-C10-01 / Step 8: a change is effective-dated,
 * and a transaction already in progress continues under the version in
 * force when it was created. Nothing here is a settings page.
 *
 * Mock data held in memory. No backend, no database, no transport between
 * environments — where the workflow leaves the environment model open, the
 * prototype says so rather than choosing.
 * ------------------------------------------------------------------ */

export const TODAY_C10 = '2026-08-18';

/* ------------------------------------------------------------------ *
 * WF-C10-01 / Step 1 — country operating parameters
 * ------------------------------------------------------------------ */

export type CountryStatus = 'Active' | 'Configuration in progress' | 'Not activated';

export interface NumberFormatDef {
  decimal: string;
  thousands: string;
  places: number;
}

export interface CountryConfig {
  code: string;
  country: string;
  iso: string;
  status: CountryStatus;
  version: number;
  effectiveFrom: string;
  pendingVersion?: number;
  pendingEffectiveFrom?: string;
  localCurrency: string;
  reportingCurrency: string;
  workingDays: string;
  holidays: { date: string; name: string }[];
  season: string;
  seasonStart: string;
  seasonEnd: string;
  defaultLanguage: string;
  additionalLanguages: string[];
  dateFormat: string;
  timeFormat: '24-hour' | '12-hour';
  numberFormat: NumberFormatDef;
  currencyDisplay: 'Code before' | 'Symbol before' | 'Code after';
  defaultUnit: string;
  addressFormat: string;
}

export const WORKING_DAY_PATTERNS = [
  'Sunday to Thursday',
  'Monday to Friday',
  'Monday to Saturday'
];

export const DATE_FORMATS = ['dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy', 'd MMM yyyy'];
export const ADDRESS_FORMATS = [
  'Street, district, city, country',
  'PO box, city, country',
  'Building, street, city, postal code, country'
];
export const LANGUAGES = ['English', 'Arabic', 'Portuguese', 'French'];
export const RTL_LANGUAGES = ['Arabic'];

export const seedCountryConfigs: CountryConfig[] = [
  {
    code: 'SD', country: 'Sudan', iso: 'SD', status: 'Active', version: 3, effectiveFrom: '2026-07-01',
    localCurrency: 'SDG', reportingCurrency: 'USD', workingDays: 'Sunday to Thursday',
    holidays: [
      { date: '2026-09-23', name: 'Independence Day observance' },
      { date: '2026-12-25', name: 'Christmas Day' },
      { date: '2027-01-01', name: 'New Year' }
    ],
    season: '26/27', seasonStart: 'October', seasonEnd: 'September',
    defaultLanguage: 'English', additionalLanguages: ['Arabic'],
    dateFormat: 'dd/MM/yyyy', timeFormat: '24-hour',
    numberFormat: { decimal: '.', thousands: ',', places: 2 },
    currencyDisplay: 'Code before', defaultUnit: 'MT',
    addressFormat: 'Street, district, city, country'
  },
  {
    code: 'ET', country: 'Ethiopia', iso: 'ET', status: 'Active', version: 2, effectiveFrom: '2026-05-15',
    localCurrency: 'ETB', reportingCurrency: 'USD', workingDays: 'Monday to Friday',
    holidays: [{ date: '2026-09-11', name: 'Ethiopian New Year' }, { date: '2027-01-07', name: 'Christmas (Genna)' }],
    season: '26/27', seasonStart: 'November', seasonEnd: 'October',
    defaultLanguage: 'English', additionalLanguages: [],
    dateFormat: 'dd/MM/yyyy', timeFormat: '24-hour',
    numberFormat: { decimal: '.', thousands: ',', places: 2 },
    currencyDisplay: 'Code before', defaultUnit: 'MT',
    addressFormat: 'PO box, city, country'
  },
  {
    code: 'TZ', country: 'Tanzania', iso: 'TZ', status: 'Active', version: 2, effectiveFrom: '2026-04-01',
    localCurrency: 'TZS', reportingCurrency: 'USD', workingDays: 'Monday to Friday',
    holidays: [{ date: '2026-12-09', name: 'Independence Day' }, { date: '2026-12-25', name: 'Christmas Day' }],
    season: '26/27', seasonStart: 'June', seasonEnd: 'May',
    defaultLanguage: 'English', additionalLanguages: [],
    dateFormat: 'dd/MM/yyyy', timeFormat: '24-hour',
    numberFormat: { decimal: '.', thousands: ',', places: 0 },
    currencyDisplay: 'Code before', defaultUnit: 'MT',
    addressFormat: 'Street, district, city, country'
  },
  {
    code: 'MZ', country: 'Mozambique', iso: 'MZ', status: 'Active', version: 1, effectiveFrom: '2026-02-01',
    localCurrency: 'MZN', reportingCurrency: 'USD', workingDays: 'Monday to Friday',
    holidays: [{ date: '2026-09-07', name: 'Victory Day' }, { date: '2026-12-25', name: 'Family Day' }],
    season: '26/27', seasonStart: 'April', seasonEnd: 'March',
    defaultLanguage: 'Portuguese', additionalLanguages: ['English'],
    dateFormat: 'dd/MM/yyyy', timeFormat: '24-hour',
    numberFormat: { decimal: ',', thousands: '.', places: 2 },
    currencyDisplay: 'Symbol before', defaultUnit: 'MT',
    addressFormat: 'Street, district, city, country'
  },
  {
    /* Being configured, and blocked by a real consistency conflict — WF-C10-01 / Step 6.
     * Egypt already appears as a country context on C09 incidents and has never been
     * selectable, which is exactly what an unactivated country should look like. */
    code: 'EG', country: 'Egypt', iso: 'EG', status: 'Configuration in progress', version: 0, effectiveFrom: '—',
    localCurrency: 'EGP', reportingCurrency: 'USD', workingDays: 'Sunday to Thursday',
    holidays: [{ date: '2026-10-06', name: 'Armed Forces Day' }],
    season: '26/27', seasonStart: 'October', seasonEnd: 'September',
    defaultLanguage: 'Arabic', additionalLanguages: ['English'],
    dateFormat: 'dd/MM/yyyy', timeFormat: '24-hour',
    numberFormat: { decimal: '.', thousands: ',', places: 2 },
    currencyDisplay: 'Code before', defaultUnit: 'MT',
    addressFormat: 'Building, street, city, postal code, country'
  }
];

export function directionOf(language: string): 'ltr' | 'rtl' {
  return RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
}

/* ------------------------------------------------------------------ *
 * WF-C10-01 / Step 3 — process step applicability
 *
 * Two kinds of row, never mixed silently: the steps the built modules
 * actually have, which are switchable and have a named consumer, and the
 * four operational steps the workflow documents by name, in modules that
 * do not exist yet.
 * ------------------------------------------------------------------ */

export interface StepDef {
  key: string;
  module: string;
  step: string;
  /** the screen or gate that reads this setting — the honesty column */
  consumedBy: string;
  /** true = switching it changes the running prototype */
  real: boolean;
  documentedPattern?: string;
  /** sub-module menu entries hidden when the step does not apply */
  hidesRoutes?: string[];
  fields: string[];
}

export const STEP_CATALOGUE: StepDef[] = [
  {
    key: 'c1-endorsement', module: 'C01', step: 'Line manager endorsement on an access request',
    consumedBy: 'The access request approval route', real: true,
    fields: ['Line manager', 'Business justification']
  },
  {
    key: 'c3-bulk-load', module: 'C03', step: 'Bulk master data load',
    consumedBy: 'The C03 sub-module menu and the Bulk Load screen', real: true,
    hidesRoutes: ['/c3/bulk-load'], fields: ['Source file', 'Domain']
  },
  {
    key: 'c3-duplicate-check', module: 'C03', step: 'Duplicate control on master record creation',
    consumedBy: 'The C03 create form', real: true, fields: ['Registration or tax identifier']
  },
  {
    key: 'c4-escalation', module: 'C04', step: 'Escalation on service-level breach',
    consumedBy: 'The C04 Service Level Monitor and the escalation action', real: true,
    hidesRoutes: ['/c4/sla'], fields: ['Escalation recipient']
  },
  {
    key: 'c6-attachments', module: 'C06', step: 'Attachments on comments',
    consumedBy: 'The comment thread attach control', real: true, fields: []
  },
  {
    key: 'c7-expiry', module: 'C07', step: 'Document expiry monitoring',
    consumedBy: 'The C07 Document Expiry screen and the expiry job', real: true,
    hidesRoutes: ['/c7/expiry'], fields: ['Valid from', 'Valid to']
  },
  {
    key: 'c7-checklist', module: 'C07', step: 'Mandatory document checklist on submission',
    consumedBy: 'The C07 checklist gate on submission', real: true, fields: []
  },
  {
    key: 'c9-error-queue', module: 'C09', step: 'Integration error queue and reprocessing',
    consumedBy: 'The C09 sub-module menu and the Error Queue screen', real: true,
    hidesRoutes: ['/c9/error-queue'], fields: ['Correctable field', 'Reason for reprocessing']
  },
  /* Documented by name in the workflow, in modules not yet built. Listed with the
   * documented country pattern and never silently invented. */
  {
    key: 'op-ex-contract', module: 'Operational', step: 'Ex-contract',
    consumedBy: 'Not built', real: false,
    documentedPattern: 'Applies in Sudan and Ethiopia, not Tanzania', fields: []
  },
  {
    key: 'op-ex-form', module: 'Operational', step: 'Ex-form',
    consumedBy: 'Not built', real: false,
    documentedPattern: 'Applies mainly in Sudan', fields: []
  },
  {
    key: 'op-commercial-invoice', module: 'Operational', step: 'Execution start — commercial invoice',
    consumedBy: 'Not built', real: false,
    documentedPattern: 'Mozambique execution starts with the commercial invoice', fields: []
  },
  {
    key: 'op-logistics-request', module: 'Operational', step: 'Logistics service request',
    consumedBy: 'Not built', real: false,
    documentedPattern: 'Sudan only', fields: []
  }
];

export interface StepConfig {
  country: string;
  step: string;
  applies: boolean;
  mandatory: boolean;
  requiredFields: string[];
}

/** Built from the documented patterns, so the seeded state is traceable rather than invented. */
export const seedStepConfigs: StepConfig[] = (() => {
  const out: StepConfig[] = [];
  const countries = ['Sudan', 'Ethiopia', 'Tanzania', 'Mozambique', 'Egypt'];
  countries.forEach((country) => {
    STEP_CATALOGUE.forEach((s) => {
      let applies = true;
      let mandatory = true;
      let requiredFields = s.fields;
      if (s.key === 'op-ex-contract') applies = country === 'Sudan' || country === 'Ethiopia';
      if (s.key === 'op-ex-form') applies = country === 'Sudan';
      if (s.key === 'op-commercial-invoice') applies = country === 'Mozambique';
      if (s.key === 'op-logistics-request') applies = country === 'Sudan';
      // Egypt is mid-configuration: the checklist step is off while supplier approval needs it
      if (country === 'Egypt' && s.key === 'c7-checklist') { applies = false; mandatory = false; }
      if (country === 'Mozambique' && s.key === 'c3-bulk-load') { applies = true; mandatory = false; }
      if (s.key === 'c6-attachments') mandatory = false;
      if (!applies) { mandatory = false; requiredFields = []; }
      out.push({ country, step: s.key, applies, mandatory, requiredFields });
    });
  });
  return out;
})();

export function stepDef(key: string): StepDef | undefined {
  return STEP_CATALOGUE.find((s) => s.key === key);
}

/* ------------------------------------------------------------------ *
 * WF-C10-01 / Step 6 — consistency validation
 *
 * One rule: no mandatory step may be disabled where a later step depends
 * on its output. The dependencies are declared, so the validation is a
 * computation rather than a stored list of conflicts.
 * ------------------------------------------------------------------ */

export interface StepDependency {
  dependent: string;
  requires: string;
  because: string;
}

export const STEP_DEPENDENCIES: StepDependency[] = [
  {
    dependent: 'c7-checklist', requires: 'c7-expiry',
    because: 'the checklist reports a document as outstanding when its validity has lapsed, which it can only know from expiry monitoring'
  },
  {
    dependent: 'c9-error-queue', requires: 'c7-checklist',
    because: 'a queued record is corrected against the mandatory document set for its object type'
  },
  {
    dependent: 'c4-escalation', requires: 'c1-endorsement',
    because: 'the escalation recipient is resolved from the endorsement chain recorded on the request'
  }
];

/** The seeded Egypt conflict: supplier approval is mandatory and consumes the checklist. */
export interface MandatoryConsumer {
  country: string;
  consumer: string;
  requires: string;
  because: string;
}

export const MANDATORY_CONSUMERS: MandatoryConsumer[] = [
  {
    country: 'Egypt', consumer: 'Supplier approval', requires: 'c7-checklist',
    because: 'supplier approval is mandatory in Egypt and cannot start without the mandatory document set the checklist step produces'
  }
];

export interface Conflict {
  disabledStep: string;
  disabledStepName: string;
  disabledModule: string;
  dependentName: string;
  dependentModule: string;
  because: string;
}

export function validateConfig(country: string, configs: StepConfig[]): Conflict[] {
  const out: Conflict[] = [];
  const cfgFor = (key: string) => configs.find((c) => c.country === country && c.step === key);

  STEP_DEPENDENCIES.forEach((d) => {
    const dep = cfgFor(d.dependent);
    const req = cfgFor(d.requires);
    if (dep?.applies && dep.mandatory && req && !req.applies) {
      const rs = stepDef(d.requires);
      const ds = stepDef(d.dependent);
      out.push({
        disabledStep: d.requires, disabledStepName: rs?.step ?? d.requires, disabledModule: rs?.module ?? '—',
        dependentName: ds?.step ?? d.dependent, dependentModule: ds?.module ?? '—', because: d.because
      });
    }
  });

  MANDATORY_CONSUMERS.filter((m) => m.country === country).forEach((m) => {
    const req = cfgFor(m.requires);
    if (req && !req.applies) {
      const rs = stepDef(m.requires);
      out.push({
        disabledStep: m.requires, disabledStepName: rs?.step ?? m.requires, disabledModule: rs?.module ?? '—',
        dependentName: m.consumer, dependentModule: 'Operational', because: m.because
      });
    }
  });

  return out;
}

/* ------------------------------------------------------------------ *
 * WF-C10-01 / Step 5 — numbering series per country and document type
 *
 * C03's generated domains have used hard-coded patterns since the third
 * module. They read this now.
 * ------------------------------------------------------------------ */

export interface NumberingSeries {
  id: string;
  country: string;              // or 'All countries'
  documentType: string;
  /** the C03 domain key this series generates for, where it generates one */
  domain?: string;
  prefix: string;
  includeCountryCode: boolean;
  includeYear: 'None' | 'Two-digit' | 'Four-digit';
  sequenceLength: number;
  reset: 'Never' | 'Annually' | 'Per season';
  next: number;
}

export const seedNumberingSeries: NumberingSeries[] = [
  { id: 'NS-1', country: 'All countries', documentType: 'Supplier master record', domain: 'supplier', prefix: 'SUP-', includeCountryCode: false, includeYear: 'None', sequenceLength: 6, reset: 'Never', next: 4930 },
  { id: 'NS-2', country: 'All countries', documentType: 'Warehouse master record', domain: 'warehouse', prefix: 'WH-', includeCountryCode: false, includeYear: 'None', sequenceLength: 4, reset: 'Never', next: 158 },
  { id: 'NS-3', country: 'All countries', documentType: 'Processing facility', domain: 'facility', prefix: 'FAC-', includeCountryCode: false, includeYear: 'None', sequenceLength: 4, reset: 'Never', next: 21 },
  { id: 'NS-4', country: 'All countries', documentType: 'Buyer master record', domain: 'buyer', prefix: 'CUS-', includeCountryCode: false, includeYear: 'None', sequenceLength: 6, reset: 'Never', next: 1204 },
  { id: 'NS-5', country: 'All countries', documentType: 'Transporter master record', domain: 'transporter', prefix: 'TRP-', includeCountryCode: false, includeYear: 'None', sequenceLength: 6, reset: 'Never', next: 331 },
  { id: 'NS-6', country: 'All countries', documentType: 'Commodity master record', domain: 'commodity', prefix: 'CMD-', includeCountryCode: false, includeYear: 'None', sequenceLength: 4, reset: 'Never', next: 12 },
  { id: 'NS-7', country: 'All countries', documentType: 'Access request', prefix: 'AR-', includeCountryCode: false, includeYear: 'None', sequenceLength: 6, reset: 'Never', next: 142 },
  { id: 'NS-8', country: 'Sudan', documentType: 'Journal entry', prefix: 'JE-', includeCountryCode: false, includeYear: 'Four-digit', sequenceLength: 4, reset: 'Annually', next: 814 },
  { id: 'NS-9', country: 'Sudan', documentType: 'Logistics service request', prefix: 'LSR-', includeCountryCode: true, includeYear: 'Two-digit', sequenceLength: 4, reset: 'Per season', next: 37 }
];

export function renderNumber(s: NumberingSeries, iso: string, year = 2026): string {
  const parts = [s.prefix.replace(/-$/, '')];
  if (s.includeCountryCode) parts.push(iso);
  if (s.includeYear === 'Two-digit') parts.push(String(year).slice(-2));
  if (s.includeYear === 'Four-digit') parts.push(String(year));
  parts.push(String(s.next).padStart(s.sequenceLength, '0'));
  return parts.join('-');
}

/* ------------------------------------------------------------------ *
 * WF-C10-02 / Steps 1–2 — coding formulas, versioned and effective-dated
 * ------------------------------------------------------------------ */

export interface FormulaElement {
  element: string;
  source: string;
  length: number;
  separator: string;
}

export interface FormulaVersion {
  version: number;
  effectiveFrom: string;
  elements: FormulaElement[];
  customerRequirement?: string;
  status: 'Superseded' | 'In force' | 'Approved — future';
}

export interface CodingFormula {
  key: 'raw' | 'finished';
  name: string;
  versions: FormulaVersion[];
}

export const AVAILABLE_ELEMENTS: { element: string; source: string; sample: string }[] = [
  { element: 'Season', source: 'C03 season domain, per country', sample: '2627' },
  { element: 'Commodity', source: 'C03 commodity record code', sample: 'CMD0007' },
  { element: 'Supplier', source: 'C03 supplier record code', sample: 'SUP004821' },
  { element: 'Production year', source: 'The production date', sample: '2026' },
  { element: 'Production month', source: 'The production date', sample: '08' },
  { element: 'Facility', source: 'C03 facility record code', sample: 'FAC0003' },
  { element: 'Quality reference', source: 'The quality result on the batch', sample: 'Q1' },
  { element: 'Sequence', source: 'Generated within the formula scope', sample: '0041' }
];

export const seedFormulas: CodingFormula[] = [
  {
    key: 'raw', name: 'Raw goods batch code',
    versions: [
      {
        version: 1, effectiveFrom: '2025-10-01', status: 'Superseded',
        elements: [
          { element: 'Season', source: 'C03 season domain', length: 4, separator: '-' },
          { element: 'Commodity', source: 'C03 commodity record code', length: 7, separator: '-' },
          { element: 'Sequence', source: 'Generated within the formula scope', length: 4, separator: '' }
        ]
      },
      {
        version: 2, effectiveFrom: '2026-07-01', status: 'In force',
        customerRequirement: 'A European buyer requires the supplier to be identifiable from the batch code without a lookup.',
        elements: [
          { element: 'Season', source: 'C03 season domain', length: 4, separator: '-' },
          { element: 'Commodity', source: 'C03 commodity record code', length: 7, separator: '-' },
          { element: 'Supplier', source: 'C03 supplier record code', length: 9, separator: '-' },
          { element: 'Sequence', source: 'Generated within the formula scope', length: 4, separator: '' }
        ]
      }
    ]
  },
  {
    key: 'finished', name: 'Finished goods batch code',
    versions: [
      {
        version: 1, effectiveFrom: '2025-10-01', status: 'In force',
        elements: [
          { element: 'Production year', source: 'The production date', length: 4, separator: '' },
          { element: 'Production month', source: 'The production date', length: 2, separator: '-' },
          { element: 'Facility', source: 'C03 facility record code', length: 7, separator: '-' },
          { element: 'Quality reference', source: 'The quality result on the batch', length: 2, separator: '-' },
          { element: 'Sequence', source: 'Generated within the formula scope', length: 4, separator: '' }
        ]
      }
    ]
  }
];

export function renderFormula(v: FormulaVersion): string {
  return v.elements
    .map((e, i) => {
      const sample = AVAILABLE_ELEMENTS.find((a) => a.element === e.element)?.sample ?? e.element;
      const sep = i < v.elements.length - 1 ? e.separator : '';
      return sample.slice(0, e.length) + sep;
    })
    .join('');
}

export function formulaVersionAt(f: CodingFormula, date: string): FormulaVersion | undefined {
  const eligible = f.versions.filter((v) => v.effectiveFrom <= date);
  return eligible.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}

/* ------------------------------------------------------------------ *
 * WF-C10-02 / Step 3 — thresholds and tolerances
 * ------------------------------------------------------------------ */

export const THRESHOLD_CLASSES = [
  'Approval value band',
  'Variance tolerance',
  'Capacity utilisation limit',
  'Quality parameter range'
] as const;
export type ThresholdClass = typeof THRESHOLD_CLASSES[number];

export interface ThresholdDef10 {
  id: string;
  cls: ThresholdClass;
  name: string;
  scope: string;                // 'All countries' or a country
  commodity?: string;
  from?: number;
  to?: number;
  unit: string;
  consumedBy: string;
  /** the C04 route this band selects, where it selects one */
  routeId?: string;
  effectiveFrom: string;
}

export const seedThresholds10: ThresholdDef10[] = [
  {
    id: 'TH-1', cls: 'Approval value band', name: 'Single-approver band', scope: 'All countries',
    from: 0, to: 50000, unit: 'USD', consumedBy: 'C04 route resolution, at runtime', routeId: 'RT-04',
    effectiveFrom: '2024-12-20'
  },
  {
    id: 'TH-2', cls: 'Approval value band', name: 'Two-approver band', scope: 'All countries',
    from: 50000, unit: 'USD', consumedBy: 'C04 route resolution, at runtime', routeId: 'RT-05',
    effectiveFrom: '2024-12-20'
  },
  {
    id: 'TH-3', cls: 'Variance tolerance', name: 'Weight variance on receipt', scope: 'All countries',
    from: 0, to: 0.5, unit: '%', consumedBy: 'Operational modules — not built', effectiveFrom: '2025-01-10'
  },
  {
    id: 'TH-4', cls: 'Variance tolerance', name: 'Price variance against contract', scope: 'All countries',
    from: 0, to: 2, unit: '%', consumedBy: 'Operational modules — not built', effectiveFrom: '2025-01-10'
  },
  {
    id: 'TH-5', cls: 'Variance tolerance', name: 'Quality variance against specification', scope: 'All countries',
    from: 0, to: 1, unit: '%', consumedBy: 'Operational modules — not built', effectiveFrom: '2025-01-10'
  },
  {
    id: 'TH-6', cls: 'Capacity utilisation limit', name: 'Warehouse utilisation warning', scope: 'All countries',
    from: 85, unit: '%', consumedBy: 'C03 warehouse records; operational modules', effectiveFrom: '2025-03-01'
  },
  {
    id: 'TH-7', cls: 'Capacity utilisation limit', name: 'Warehouse utilisation maximum', scope: 'All countries',
    from: 98, unit: '%', consumedBy: 'C03 warehouse records; operational modules', effectiveFrom: '2025-03-01'
  },
  {
    id: 'TH-8', cls: 'Quality parameter range', name: 'Moisture', scope: 'All countries', commodity: 'Sesame — Hulled White',
    from: 0, to: 8, unit: '%', consumedBy: 'C03 commodity specification', effectiveFrom: '2025-06-01'
  },
  {
    id: 'TH-9', cls: 'Quality parameter range', name: 'Purity', scope: 'All countries', commodity: 'Sesame — Hulled White',
    from: 99, to: 100, unit: '%', consumedBy: 'C03 commodity specification', effectiveFrom: '2026-09-01'
  },
  {
    id: 'TH-10', cls: 'Quality parameter range', name: 'Oil content', scope: 'All countries', commodity: 'Groundnut — Runner',
    from: 44, to: 52, unit: '%', consumedBy: 'C03 commodity specification', effectiveFrom: '2025-06-01'
  }
];

/* ------------------------------------------------------------------ *
 * WF-C10-02 / Steps 4–5 — translatable resources with fallback and RTL
 * ------------------------------------------------------------------ */

export interface TranslationRec {
  key: string;
  group: string;
  English: string;
  Arabic?: string;
  Portuguese?: string;
  French?: string;
  [lang: string]: string | undefined;
}

export const seedTranslations: TranslationRec[] = [
  { key: 'nav.home', group: 'Navigation', English: 'Home', Arabic: 'الرئيسية', Portuguese: 'Início', French: 'Accueil' },
  { key: 'nav.inbox', group: 'Navigation', English: 'My Actions', Arabic: 'مهامي', Portuguese: 'As minhas ações', French: 'Mes actions' },
  { key: 'nav.masterData', group: 'Navigation', English: 'Master Data', Arabic: 'البيانات الرئيسية', Portuguese: 'Dados mestre' },
  { key: 'nav.approvals', group: 'Navigation', English: 'Approvals', Arabic: 'الموافقات', Portuguese: 'Aprovações' },
  { key: 'nav.documents', group: 'Navigation', English: 'Documents', Arabic: 'المستندات' },
  { key: 'nav.configuration', group: 'Navigation', English: 'Configuration', Arabic: 'الإعدادات' },
  { key: 'status.draft', group: 'Statuses', English: 'Draft', Arabic: 'مسودة', Portuguese: 'Rascunho', French: 'Brouillon' },
  { key: 'status.pendingApproval', group: 'Statuses', English: 'Pending Approval', Arabic: 'بانتظار الموافقة', Portuguese: 'Aguarda aprovação' },
  { key: 'status.active', group: 'Statuses', English: 'Active', Arabic: 'نشط', Portuguese: 'Ativo', French: 'Actif' },
  { key: 'status.rejected', group: 'Statuses', English: 'Rejected', Arabic: 'مرفوض', Portuguese: 'Rejeitado' },
  { key: 'action.submit', group: 'Actions', English: 'Submit for approval', Arabic: 'إرسال للموافقة', Portuguese: 'Submeter para aprovação' },
  { key: 'action.approve', group: 'Actions', English: 'Approve', Arabic: 'موافقة', Portuguese: 'Aprovar', French: 'Approuver' },
  { key: 'action.return', group: 'Actions', English: 'Return for amendment', Arabic: 'إرجاع للتعديل' },
  { key: 'field.country', group: 'Field labels', English: 'Country', Arabic: 'الدولة', Portuguese: 'País', French: 'Pays' },
  { key: 'field.commodity', group: 'Field labels', English: 'Commodity', Arabic: 'المحصول', Portuguese: 'Mercadoria' },
  { key: 'field.supplier', group: 'Field labels', English: 'Supplier', Arabic: 'المورد' },
  { key: 'field.validTo', group: 'Field labels', English: 'Valid to', Arabic: 'صالح حتى' },
  { key: 'template.approvalRequest', group: 'Notification templates', English: 'awaits your approval', Arabic: 'بانتظار موافقتك', Portuguese: 'aguarda a sua aprovação' },
  { key: 'template.outcome', group: 'Notification templates', English: 'has been decided', Arabic: 'تم اتخاذ القرار' },
  { key: 'report.configuration', group: 'Reports', English: 'Country configuration report', Arabic: 'تقرير إعدادات الدولة' }
];

export function translate(rows: TranslationRec[], key: string, language: string): { text: string; fallback: boolean } {
  const row = rows.find((r) => r.key === key);
  if (!row) return { text: key, fallback: true };
  const v = row[language];
  if (typeof v === 'string' && v.trim() !== '') return { text: v, fallback: false };
  // Step 4 — the content falls back to the default language rather than failing
  return { text: row.English, fallback: true };
}

export function coverage(rows: TranslationRec[], language: string): { translated: number; total: number } {
  const total = rows.length;
  const translated = rows.filter((r) => typeof r[language] === 'string' && (r[language] as string).trim() !== '').length;
  return { translated, total };
}

/* ------------------------------------------------------------------ *
 * WF-C10-03 — change requests and versions
 * ------------------------------------------------------------------ */

export const PARAMETER_CLASSES = [
  'Global parameter',
  'Country parameter',
  'Process step',
  'Business rule',
  'Localisation',
  'Numbering series',
  'Audit level (C8)',
  'Log level (C9)',
  'Approval route (C4)',
  'Role definition (C1)'
] as const;
export type ParameterClass = typeof PARAMETER_CLASSES[number];

/** WF-C10-03 / Step 2 — the classes the workflow names as affecting authority. */
export const AUTHORITY_CLASSES: string[] = ['Approval route (C4)', 'Role definition (C1)'];

export function affectsAuthority(cls: string): boolean {
  return AUTHORITY_CLASSES.includes(cls);
}

export type ChangeStatus =
  | 'Draft'
  | 'Pending approval'
  | 'Approved — awaiting effective date'
  | 'Effective'
  | 'Rejected'
  | 'Withdrawn';

export interface ChangeRequest {
  id: string;
  cls: ParameterClass;
  parameter: string;
  country: string;
  currentValue: string;
  proposedValue: string;
  reason: string;
  status: ChangeStatus;
  effectiveFrom: string;
  requestedBy: string;
  requestedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  decisionComment?: string;
  /** where the change originated, so a C08 or C09 change is traceable to its screen */
  originScreen?: string;
  originRoute?: string;
  /** what the change writes back into when it becomes effective */
  apply?: { kind: 'stepApplies' | 'valueBand' | 'numbering' | 'countryParam'; target: string; value: string };
}

export const seedChangeRequests: ChangeRequest[] = [
  {
    id: 'CFG-0001', cls: 'Process step', parameter: 'Document expiry monitoring — Tanzania',
    country: 'Tanzania', currentValue: 'Applies, mandatory', proposedValue: 'Does not apply',
    reason: 'Tanzania holds no validity-dated documents in the current operating model; monitoring produces only noise.',
    status: 'Pending approval', effectiveFrom: '2026-09-01', requestedBy: 'Nasreen Sayed', requestedAt: '2026-08-15 10:20',
    apply: { kind: 'stepApplies', target: 'Tanzania|c7-expiry', value: 'false' }
  },
  {
    id: 'CFG-0002', cls: 'Approval route (C4)', parameter: 'Single-approver band ceiling',
    country: 'All countries', currentValue: '50,000 USD', proposedValue: '25,000 USD',
    reason: 'Group finance has tightened the single-approver limit following the annual control review.',
    status: 'Pending approval', effectiveFrom: '2026-09-01', requestedBy: 'Nasreen Sayed', requestedAt: '2026-08-16 09:05',
    apply: { kind: 'valueBand', target: 'TH-1', value: '25000' }
  },
  {
    id: 'CFG-0003', cls: 'Audit level (C8)', parameter: 'Audit level — Master data',
    country: 'All countries', currentValue: 'Field level', proposedValue: 'Status level',
    reason: 'Field-level capture on master data has produced volume without evidential value; compliance accepts status level.',
    status: 'Effective', effectiveFrom: '2026-08-01', requestedBy: 'Nasreen Sayed', requestedAt: '2026-07-24 14:40',
    decidedBy: 'Fatima Idris', decidedAt: '2026-07-28 11:02',
    originScreen: 'C08 audit configuration', originRoute: '/c8/configuration'
  },
  {
    id: 'CFG-0004', cls: 'Log level (C9)', parameter: 'Log level — Integration service, Production',
    country: 'All countries', currentValue: 'Warning', proposedValue: 'Information',
    reason: 'Integration diagnosis needed more detail in production during the SAP posting investigation.',
    status: 'Effective', effectiveFrom: '2026-08-10', requestedBy: 'Nasreen Sayed', requestedAt: '2026-08-09 16:30',
    decidedBy: 'Fatima Idris', decidedAt: '2026-08-10 06:40',
    originScreen: 'C09 log levels', originRoute: '/c9/levels'
  },
  {
    id: 'CFG-0005', cls: 'Localisation', parameter: 'Additional language — Mozambique',
    country: 'Mozambique', currentValue: 'Portuguese only', proposedValue: 'Portuguese and English',
    reason: 'Regional reporting is produced in English and the Mozambique team reads both.',
    status: 'Effective', effectiveFrom: '2026-02-01', requestedBy: 'Nasreen Sayed', requestedAt: '2026-01-20 08:10',
    decidedBy: 'Grace Mensah', decidedAt: '2026-01-25 09:00'
  },
  {
    id: 'CFG-0006', cls: 'Role definition (C1)', parameter: 'Sourcing Officer — add master data create permission',
    country: 'All countries', currentValue: 'View only on master data', proposedValue: 'Create and submit master data',
    reason: 'Sourcing officers currently ask a data owner to key records they have already gathered.',
    status: 'Rejected', effectiveFrom: '2026-08-01', requestedBy: 'Ahmed Osman', requestedAt: '2026-07-18 11:15',
    decidedBy: 'Fatima Idris', decidedAt: '2026-07-22 15:40',
    decisionComment: 'Segregation of duties: the role that gathers a record should not also submit it. Revisit with a maker–checker split.'
  },
  {
    id: 'CFG-0007', cls: 'Numbering series', parameter: 'Supplier master record — sequence length',
    country: 'All countries', currentValue: '6 digits', proposedValue: '7 digits',
    reason: 'The six-digit series is projected to exhaust within two seasons at the current onboarding rate.',
    status: 'Draft', effectiveFrom: '2026-10-01', requestedBy: 'Nasreen Sayed', requestedAt: '2026-08-18 08:45',
    apply: { kind: 'numbering', target: 'NS-1', value: '7' }
  }
];

/* ------------------------------------------------------------------ *
 * WF-C10-01 / Steps 7–8 and WF-C10-03 / Steps 4–5 — versions
 * ------------------------------------------------------------------ */

export interface ConfigVersion {
  country: string;
  version: number;
  effectiveFrom: string;
  effectiveTo?: string;
  changes: string[];
  approvedBy?: string;
  approvedAt?: string;
}

export const seedConfigVersions: ConfigVersion[] = [
  {
    country: 'Sudan', version: 1, effectiveFrom: '2025-01-01', effectiveTo: '2026-03-31',
    changes: ['Country activated', 'Local currency SDG, reporting USD', 'Working calendar Sunday to Thursday', 'Season 24/25'],
    approvedBy: 'Fatima Idris', approvedAt: '2024-12-20 11:12'
  },
  {
    country: 'Sudan', version: 2, effectiveFrom: '2026-04-01', effectiveTo: '2026-06-30',
    changes: ['Season moved to 25/26', 'Logistics service request enabled', 'Arabic added as an additional language'],
    approvedBy: 'Fatima Idris', approvedAt: '2026-03-24 09:30'
  },
  {
    country: 'Sudan', version: 3, effectiveFrom: '2026-07-01',
    changes: ['Season moved to 26/27', 'Raw goods batch code formula version 2 — supplier element added', 'Public holiday calendar updated'],
    approvedBy: 'Fatima Idris', approvedAt: '2026-06-26 10:05'
  },
  {
    country: 'Ethiopia', version: 1, effectiveFrom: '2025-06-01', effectiveTo: '2026-05-14',
    changes: ['Country activated', 'Local currency ETB, reporting USD'], approvedBy: 'Fatima Idris', approvedAt: '2025-05-28 08:40'
  },
  {
    country: 'Ethiopia', version: 2, effectiveFrom: '2026-05-15',
    changes: ['Ex-contract enabled', 'Season 26/27'], approvedBy: 'Fatima Idris', approvedAt: '2026-05-11 14:20'
  },
  {
    country: 'Tanzania', version: 1, effectiveFrom: '2025-09-01', effectiveTo: '2026-03-31',
    changes: ['Country activated', 'Local currency TZS, reporting USD'], approvedBy: 'Grace Mensah', approvedAt: '2025-08-27 12:00'
  },
  {
    country: 'Tanzania', version: 2, effectiveFrom: '2026-04-01',
    changes: ['Number format set to zero decimal places', 'Ex-contract confirmed as not applicable'],
    approvedBy: 'Grace Mensah', approvedAt: '2026-03-28 09:15'
  },
  {
    country: 'Mozambique', version: 1, effectiveFrom: '2026-02-01',
    changes: ['Country activated', 'Portuguese as default language', 'Comma decimal separator', 'Execution starts with the commercial invoice'],
    approvedBy: 'Grace Mensah', approvedAt: '2026-01-25 09:00'
  }
];

/** WF-C10-01 / Step 8 — the version in force when a record was created. */
export function versionAt(versions: ConfigVersion[], country: string, date: string): ConfigVersion | undefined {
  const day = date.slice(0, 10);
  const scoped = versions.filter((v) => v.country === country && v.effectiveFrom <= day);
  return scoped.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}

/* ------------------------------------------------------------------ *
 * WF-C10-01 / Step 4 — the country dimension C07's checklist does not have
 * ------------------------------------------------------------------ */

export interface CountryChecklistAddition {
  id: string;
  country: string;
  objectType: string;
  docType: string;
  reason: string;
}

export const seedChecklistAdditions: CountryChecklistAddition[] = [
  {
    id: 'CCL-1', country: 'Sudan', objectType: 'Master data — Supplier', docType: 'Trade licence',
    reason: 'Sudanese suppliers must hold a current trade licence before they can be approved.'
  }
];

/* ------------------------------------------------------------------ *
 * WF-C10-02 / Step 6 — formatting, applied from the active country
 * ------------------------------------------------------------------ */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtNumber(value: number, f: NumberFormatDef): string {
  const fixed = Math.abs(value).toFixed(f.places);
  const [whole, frac] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, f.thousands);
  const sign = value < 0 ? '-' : '';
  return sign + grouped + (frac ? f.decimal + frac : '');
}

export function fmtCurrency(value: number, c: CountryConfig, currency?: string): string {
  const code = currency ?? c.localCurrency;
  const n = fmtNumber(value, c.numberFormat);
  if (c.currencyDisplay === 'Code after') return `${n} ${code}`;
  if (c.currencyDisplay === 'Symbol before') return `${symbolFor(code)}${n}`;
  return `${code} ${n}`;
}

export function symbolFor(code: string): string {
  const map: Record<string, string> = { USD: '$', SDG: 'ج.س ', ETB: 'Br ', TZS: 'TSh ', MZN: 'MT ', EGP: 'E£ ' };
  return map[code] ?? `${code} `;
}

export function fmtDate(iso: string, f: string): string {
  const day = iso.slice(0, 10);
  const [y, m, d] = day.split('-');
  if (!y || !m || !d) return iso;
  if (f === 'yyyy-MM-dd') return `${y}-${m}-${d}`;
  if (f === 'MM/dd/yyyy') return `${m}/${d}/${y}`;
  if (f === 'd MMM yyyy') return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
  return `${d}/${m}/${y}`;
}

export function fmtTime(hhmm: string, f: '24-hour' | '12-hour'): string {
  if (f === '24-hour') return hhmm;
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** The one value, four renderings demonstration on the formats screen. */
export const FORMAT_SAMPLE = { quantity: 1234567.891, amount: 48500.5, date: '2026-08-18', time: '14:30' };

/* ------------------------------------------------------------------ *
 * Open points and notes carried on the screens
 * ------------------------------------------------------------------ */

export const STEPS_LIST_NOTE =
  'The definitive list of configurable steps is unconfirmed and emerges as each module’s processes are finalised '
  + '(WF-C10-01 / Step 3). The matrix therefore carries two kinds of row: the steps the built core modules actually '
  + 'have, which are switchable and name the screen that reads them, and the four operational steps the workflow '
  + 'documents by name, which are listed with their documented country pattern and marked as not built. The list is provisional.';

export const AUTHORITY_NOTE =
  'How much configuration authority is granted to business administrators versus retained by the technical team is '
  + 'unconfirmed (WF-C10-03 / Step 2). The classes the workflow names as affecting authority — approval routes and '
  + 'role definitions — are marked as requiring a higher level of approval; who holds each class is not settled.';

export const ENVIRONMENT_NOTE =
  'Whether configuration must be promoted between environments through a controlled transport, or maintained '
  + 'directly in production under approval, is unconfirmed (WF-C10-03 / Step 3). The prototype has one environment '
  + 'and therefore behaves as the second model. No transport is simulated, because simulating one would be a decision.';

export const OWNERSHIP_NOTE_C10 =
  'No flagged inconsistency lands inside C10’s own workflows. Two flagged elsewhere are nevertheless configuration '
  + 'ownership questions, and a configuration module is exactly where a reader expects them resolved: the urgent-flag '
  + 'channel setting appears in both C04 route configuration and C05 channel administration, and the dashboard card '
  + 'catalogue with its role default layouts appears in both C02 and C11. C10 adopts neither and resolves neither.';

export const RTL_SCOPE_NOTE =
  'The preview panel is mirrored to show the intent. Applying right-to-left to the whole application is a '
  + 'theme-level change made once, not a per-screen exercise, so it is stated here rather than mocked screen by screen.';

export const CONFIG_ADMIN_ROLES = ['SYSTEM_ADMINISTRATOR'];
export const CONFIG_READ_ROLES = ['SYSTEM_ADMINISTRATOR', 'COMPLIANCE_OFFICER', 'COUNTRY_MANAGER'];
