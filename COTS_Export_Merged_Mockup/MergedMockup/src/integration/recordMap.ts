/**
 * The record spine.
 *
 * The three prototypes were built separately and each carries its own demonstration data. This
 * file is the ONLY place where those records are tied together, so that no Core, Shared or Export
 * mock data had to be rewritten to make the integrated journey read as one business record.
 *
 * Every identifier below already exists in one of the three prototypes. Nothing here is invented:
 *   · Export  — `export-process-mockup/src/data/seed.ts`  (contract ct-1 / PC-2041)
 *   · Shared  — `src/mockData/s02.ts` (DEAL-0455, CS-0271), s01/s03/s04/s05/s07/s09
 *   · Core    — `src/mockData/*` (country SD, the governed buyer and commodity domains)
 *
 * Business confirmation required: the three prototypes hold different names for the same
 * commercial document (deal agreement / purchase contract / PC) and different identifier formats.
 * This map states the correspondence used for the demonstration; it is not a data model.
 */

export interface SpineRecord {
  /** what the reviewer follows through the whole journey */
  label: string;
  commodity: string;
  country: string;
  countryCode: string;
  buyer: string;
  quantityMt: number;
  tolerancePct: number;
  /** Export-owned records */
  exportContractId: string;
  exportContractNo: string;
  sapNumber: string;
  /**
   * v1.3 — the origin-side intake records of phases 01–07, added because the process now starts
   * there and a spine that began at the contract would still describe the old order.
   *
   * **They are not tied to the contract, and that is the point.** Every identifier below exists in
   * the Export mock-up v2.4's own seed data, and at v2.4 exactly one link between the two halves of
   * the module exists: a purchase agreement may name a seasonal purchase plan, which narrows its
   * commodity list. Nothing links a plan, a budget, a fund or an agreement to PC-2041, to a deal or
   * to a costing snapshot — the workflow asserts no such relationship, so neither does this map.
   * Whether one should exist at all is G-31 / D-23.
   */
  exportPlanRef: string;
  exportPlanId: string;
  exportBudgetRef: string;
  exportBudgetId: string;
  exportAgreementRef: string;
  exportAgreementId: string;
  exportFundRef: string;
  exportFundId: string;
  /** Shared-owned records */
  dealRef: string;
  costingSnapshot: string;
  masterPlanRef: string;
  nonConformity: string;
  varianceCase: string;
  movement: string;
  claim: string;
  feedback: string;
  /** Core-owned context */
  session: string;
}

export const SPINE: SpineRecord = {
  label: 'PC-2041 · Sesame · Sudan · North Harbour Foods',
  commodity: 'Sesame',
  country: 'Sudan',
  countryCode: 'SD',
  buyer: 'North Harbour Foods Ltd',
  quantityMt: 1300,
  tolerancePct: 5,

  exportContractId: 'ct-1',
  exportContractNo: 'PC-2041',
  sapNumber: 'SAP-88104',

  /* phases 01–07, from the Export mock-up v2.4 seed. Unconnected to PC-2041 — see the type above. */
  exportPlanRef: 'SPP-2026-0002',
  exportPlanId: 'spp-2',
  exportBudgetRef: 'BGT-2026-0001',
  exportBudgetId: 'bg-1',
  exportAgreementRef: '1123_220822514',
  exportAgreementId: 'pa-1',
  exportFundRef: 'FND-2026-0005',
  exportFundId: 'fd-5',

  dealRef: 'DEAL-0455',
  costingSnapshot: 'CS-0271',
  masterPlanRef: 'MP-SD-2526',
  nonConformity: 'NC-0087',
  varianceCase: 'VAR-0051',
  movement: 'MOV-0552',
  claim: 'CL-0181',
  feedback: 'FB-0233',

  session: 'Core session — country and permission scope (WF-INT-11)',
};

/** Which prototype owns a record, for the module badge shown beside every link. */
export type Owner = 'core' | 'shared' | 'export' | 'integration';

export const OWNER_LABEL: Record<Owner, string> = {
  core: 'Core Modules',
  shared: 'Shared Modules',
  export: 'Export Modules',
  integration: 'Integration layer',
};

export const OWNER_COLOUR: Record<Owner, string> = {
  core: '#0B5C8C',
  shared: '#1B7F5A',
  export: '#8A4B1F',
  integration: '#4A4A6A',
};
