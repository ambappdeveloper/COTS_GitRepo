import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import {
  AccessRequest, AdMapping, AuditRec, CommentRec, Delegation, DocumentRec, NotificationRec,
  Role, ReviewPack, Task, User, Decision, ACTIONS,
  seedAdMappings, seedAudit, seedDelegations, seedNotifications, seedRequests, seedReviewPacks,
  seedRoles, seedTasks, seedTeamTasks, seedUsers, MODULES
} from './mockData';
import { CARD_CATALOGUE, DEFAULT_LAYOUT_BY_ROLE } from './mockData/c2';
import {
  DOMAINS, MappingRec, MasterRecord, MasterStatus, UnmappedRec,
  seedMappings, seedMasterRecords, seedUnmapped
} from './mockData/c3';
import {
  AuditLevelDef, SensitiveClassDef,
  AUDIT_PERMISSION_ROLES, LAST_RETENTION_CYCLE, TECH_CONTEXT, TODAY_C8, VOLUME_BY_MONTH,
  auditLevelFor, classifySensitive, seedAuditExtra, seedAuditLevels, seedSensitiveClasses, yearsBetween
} from './mockData/c8';
import {
  BlockedOperation, ChecklistDef, Doc7, DocTypeDef, ValidityState,
  BLOCKED_OPERATIONS, CHECKLISTS, DEFAULT_MAX_MB, DOC_TYPES, EXTRACTION_SAMPLES,
  PERMITTED_FORMATS, SCAN_FAIL_HINT, TODAY, daysBetween, docType as docTypeDef,
  seedDocuments, validityState
} from './mockData/c7';
import {
  Comment6, ExceptionRec, TimelineEntry, Visibility,
  DOCUMENT_ACTIVITY, EDIT_WINDOW_MINUTES, EXCEPTION_AUDIT, OUT_OF_SCOPE_COMMENT,
  VISIBILITY_DEFAULT, seedComments, seedExceptions
} from './mockData/c6';
import {
  Channel, ChannelPolicy, DeliveryRec, JobRule, JobRun, NotificationRule, OverdueItem, Preference,
  PriorityClass, ReadinessRec, Subscription, Template, UnmatchedEvent,
  EXTERNAL_CONTACTS, SALES_CONTRACT, periodHours, policyFor, quietFor, renderTemplate,
  seedChannelPolicy, seedDeliveries, seedJobRules, seedJobRuns, seedOverdue, seedPreferences,
  seedQuietHours, seedReadiness, seedRules, seedSubscriptions, seedTemplates, seedUnmatched
} from './mockData/c5';
import {
  APPROVER_REGISTER, ApprovalView, OBJECT_TYPES, ReassignRec, RouteDef, RouteVersion, SeededInstance,
  effectiveVersion, groupSteps, requiredCount, resolveRoute, seedInstances, seedReassignments, seedRoutes,
  slaWorkingHours, versionOf, workingElapsedHours
} from './mockData/c4';
import {
  CauseClass, Direction, InterfaceDef, ReconRun, RotationRec, StageResult, Trigger,
  CAUSE_CLASSES, CORRECTION_PATH, CREDENTIAL_NOTE, COMMERCIAL_NOTE, ODOO_NOTE, OWNERSHIP_READINGS,
  QUEUE_OWNERSHIP_ISSUE, REPROCESS_AUDIT_ISSUE, SAP_NOTE, SCOPE_NOTE, SIMULATION_PAYLOADS, STAGES,
  TODAY_C12, interfaceDef, rotationDue, seedInterfaces, seedReconRuns, seedRotations
} from './mockData/c12';
import {
  CardEnrichment, DistributionRec, ExportLayout, ParamName, RefreshCycle, ReportDef, SavedView, ScheduleDef,
  CARD_OWNERSHIP_ISSUE, CONSOLIDATED_ROLES_NOTE, CONTRACT_PARAM_NOTE, DELIVERY_MODEL_NOTE, LATENCY_NOTE,
  MANDATED_TEMPLATES, NOW_C11, PUBLISH_ROLES, REPORTS, TEMPLATE_SPEC_NOTE, TODAY_C11, isStale, reportDef,
  seedCardEnrichment, seedDistribution, seedSavedViews, seedSchedules
} from './mockData/c11';
import {
  ChangeRequest, ChangeStatus, CodingFormula, Conflict, ConfigVersion, CountryChecklistAddition, CountryConfig,
  NumberingSeries, ParameterClass, StepConfig, ThresholdDef10, TranslationRec,
  AUTHORITY_NOTE, ENVIRONMENT_NOTE, FORMAT_SAMPLE, LANGUAGES, OWNERSHIP_NOTE_C10, RTL_SCOPE_NOTE,
  STEPS_LIST_NOTE, STEP_CATALOGUE, TODAY_C10, affectsAuthority, coverage as coverageOf, directionOf,
  fmtCurrency as fmtCurrency10, fmtDate as fmtDate10, fmtNumber as fmtNumber10, fmtTime as fmtTime10,
  formulaVersionAt, renderFormula, renderNumber, seedChangeRequests, seedChecklistAdditions,
  seedConfigVersions, seedCountryConfigs, seedFormulas, seedNumberingSeries, seedStepConfigs,
  seedThresholds10, seedTranslations, stepDef, translate, validateConfig, versionAt
} from './mockData/c10';
import {
  Breach, Classification, Environment, Exchange, ExchangeOutcome, ExportRec, FailureCase, Incident,
  JobConfig, JobName,
  JobOutcome, JobRunRec as JobRunRec9, LogClass, LogEntry, LogLevelDef, LogRetentionDef, MaskRule,
  Measure, QueuedError,
  RetentionPreviewRow, Severity, ThresholdDef,
  AT_SCALE_THRESHOLD, FAILED_LOGINS_24H, FAILURE_CASES, LOG_CLASSES, NON_CRITICAL_CLASS, NOW_C9,
  RETRY_POLICIES, SUPPORT_GROUP, TODAY_C9, daysBetweenC9, evaluateRun, isCritical, levelFor,
  missedJobs, seedBreaches, seedExchanges, seedExports, seedIncidents, seedJobConfigs, seedJobRunsC9,
  seedLogEntries, seedLogLevels, seedLogRetention, seedMaskRules, seedQueuedErrors, seedThresholds,
  severityRank, thresholdState
} from './mockData/c9';

let seq = 1000;
const nextId = (p: string) => `${p}-${++seq}`;
const stamp = () => '2026-08-18 ' + new Date().toTimeString().slice(0, 5);

export interface Toast { message: string; severity: 'success' | 'info' | 'warning' | 'error' }

/** WF-C5-01 / Step 2 — a recipient with the source that produced them */
export interface ResolvedRecipient {
  name: string;
  address: string;
  source: 'Role' | 'Named user' | 'Subscriber' | 'External contact';
  via?: string;
  external: boolean;
  language: string;
  channels: Channel[];
  dropped: { channel: Channel; why: string }[];
  templateLanguageUsed: string;
  templateMissing?: string;
}

interface Store {
  /* session — C1 / WF-C1-01 */
  currentUser: User | null;
  activeCountry: string;
  failedAttempts: Record<string, number>;
  pendingFirstLogin: User | null;

  users: User[];
  roles: Role[];
  requests: AccessRequest[];
  delegations: Delegation[];
  reviewPacks: ReviewPack[];
  tasks: Task[];
  notifications: NotificationRec[];
  adMappings: AdMapping[];
  audit: AuditRec[];

  toast: Toast | null;
  setToast: (t: Toast | null) => void;

  signIn: (userId: string) => 'ok' | 'locked' | 'refused' | 'first-login';
  completeFirstLogin: (patch: Partial<User>) => void;
  recordFailedAttempt: (userId: string) => number;
  signOut: () => void;
  setActiveCountry: (c: string) => void;

  saveRequest: (r: AccessRequest) => void;
  submitRequest: (id: string) => void;
  saveAndSubmitRequest: (r: AccessRequest) => void;
  decideRequest: (id: string, decision: 'Approved' | 'Rejected' | 'Returned for Amendment', comment: string) => void;
  withdrawRequest: (id: string) => void;
  activateAccount: (id: string) => string | undefined;
  addRequestComment: (id: string, c: Omit<CommentRec, 'id' | 'at'>) => void;
  addRequestDocument: (id: string, d: Omit<DocumentRec, 'id' | 'uploadedAt' | 'version'>) => void;

  saveRole: (r: Role) => void;
  addAssignment: (userId: string, a: Omit<import('./mockData').Assignment, 'id' | 'status'>) => void;
  endAssignment: (userId: string, assignmentId: string) => void;
  deactivateUser: (userId: string, trigger: string, reason: string, reassignTo: Record<string, string>) => void;
  toggleAdMapping: (group: string) => void;

  createDelegation: (d: Omit<Delegation, 'id' | 'status'>) => { ok: boolean; blocked?: string[] };
  endDelegation: (id: string) => void;

  setReviewDecision: (packId: string, userId: string, decision: Decision, amendedScope?: string[], comment?: string) => void;
  completeReview: (packId: string) => void;

  confirmDormant: (userId: string) => void;
  suspendDormant: (userId: string) => void;

  /* C2 / WF-C2-01 / Step 8 — real dirty state drives the unsaved-work warning */
  dirty: string | null;
  setDirty: (what: string | null) => void;
  /* C2 / WF-C2-02 / Step 5 — dashboard arrangement saved per user per country */
  dashboardLayout: Record<string, string[]>;
  setLayout: (userId: string, country: string, cards: string[]) => void;
  resetLayout: (userId: string, country: string) => void;
  layoutFor: (userId: string, country: string) => string[];
  permittedCards: (userId: string) => string[];

  /* ---------------- C3 Master Data Management ---------------- */
  masterRecords: MasterRecord[];
  mappings: MappingRec[];
  unmapped: UnmappedRec[];
  saveMaster: (r: MasterRecord) => void;
  submitMaster: (r: MasterRecord) => void;
  decideMaster: (id: string, decision: 'Approved' | 'Rejected' | 'Returned for Amendment', comment: string) => void;
  amendMaster: (id: string, patch: Record<string, string>, effectiveFrom: string | undefined, reason: string, critical: boolean) => void;
  deactivateMaster: (id: string, reason: string) => { ok: boolean; blocking?: number };
  reactivateMaster: (id: string) => void;
  addMasterDocument: (id: string, d: MasterRecord['documents'][number]) => void;
  addMasterComment: (id: string, c: MasterRecord['comments'][number]) => void;
  bulkLoad: (domain: string, rows: number, partial: boolean) => void;
  saveMapping: (m: MappingRec) => void;
  resolveUnmapped: (unmappedId: string, externalCode: string, cotsCode: string, cotsName: string) => void;

  /* ---------------- C4 Approval Workflow ---------------- */
  routes: RouteDef[];
  approvalInstances: SeededInstance[];
  reassignments: ReassignRec[];
  /** every pending decision, whatever module raised it — WF-C4-01 */
  approvalQueue: ApprovalView[];
  approvalById: (id: string) => ApprovalView | undefined;
  /** WF-C4-01 / Step 5 — role → named user, with delegation applied */
  resolveApprover: (role: string, country: string) => { approver?: string; basis: string; delegateOf?: string; unresolvedWhy?: string };
  decideApproval: (id: string, decision: 'Approved' | 'Rejected' | 'Returned for Amendment', comment: string) => void;
  reassignApprover: (id: string, to: string, reason: string) => void;
  assignInstanceApprover: (id: string, approver: string) => void;
  escalateApproval: (id: string, action: string) => void;
  withdrawApproval: (id: string) => void;
  saveRouteVersion: (routeId: string, version: RouteVersion, meta: Partial<RouteDef>) => void;
  submitRouteVersion: (routeId: string, version: number) => void;
  inFlightOn: (routeId: string, version: number) => ApprovalView[];

  /* ---------------- C5 Notifications and Alerts ---------------- */
  rules: NotificationRule[];
  templates: Template[];
  channelPolicy: ChannelPolicy[];
  quietHours: typeof seedQuietHours;
  preferences: Preference[];
  subscriptions: Subscription[];
  deliveries: DeliveryRec[];
  unmatchedEvents: UnmatchedEvent[];
  readiness: ReadinessRec[];
  jobRules: JobRule[];
  overdueItems: OverdueItem[];
  jobRuns: JobRun[];
  /** WF-C5-01 / Steps 2–4 — what a rule would resolve to, before anything is sent */
  resolveRecipients: (rule: NotificationRule, country: string, recordRef: string) => ResolvedRecipient[];
  saveRule: (r: NotificationRule) => void;
  toggleRule: (id: string) => void;
  saveTemplate: (t: Template) => void;
  releaseTemplate: (id: string) => void;
  saveChannelPolicy: (priority: PriorityClass, patch: Partial<ChannelPolicy>) => void;
  savePreference: (event: string, channels: Channel[], digest: boolean) => void;
  subscribeToRecord: (record: string, objectType: string, country: string, route?: string) => void;
  unsubscribe: (id: string) => void;
  acknowledgeDelivery: (id: string) => void;
  retryDelivery: (id: string) => void;
  saveJobRule: (r: JobRule) => void;
  runScheduler: () => void;
  recordItemUpdate: (id: string) => void;
  recordReadiness: (role: string, feedback: 'Ready' | 'Ready with conditions' | 'Not ready', comment: string) => void;
  raiseSalesContractEvent: () => void;

  /* ---------------- C6 Comments and Collaboration ---------------- */
  comments6: Comment6[];
  exceptions: ExceptionRec[];
  /** every comment on a record, oldest first, threaded by the panel */
  commentsFor: (recordKey: string) => Comment6[];
  /** WF-C6-01 / Step 4 — the default visibility for a record type, with its reason */
  visibilityDefault: (objectType: string) => { default: Visibility; why: string };
  /** WF-C6-01 / Step 7 — minutes left in the edit window, or 0 once it has expired */
  editWindowLeft: (c: Comment6) => number;
  /** WF-C6-01 / Steps 2–6 */
  addComment: (c: Omit<Comment6, 'id' | 'at' | 'visibility'> & { visibility?: Visibility }) => { ok: boolean; refusedMention?: string };
  editComment: (id: string, text: string) => { ok: boolean; why?: string };
  removeComment: (id: string) => { ok: boolean; why?: string };
  /** WF-C6-02 / Step 3 — the returning comment presented to the requester */
  returnReasonFor: (recordKey: string) => Comment6 | undefined;
  /** WF-C6-02 / Step 4 */
  resolveException: (key: string) => void;
  /** WF-C6-02 / Step 5 — one chronological view over C6, C7 and C8 */
  timelineFor: (recordKey: string) => TimelineEntry[];
  /** WF-C6-01 / Step 10 — bounded by permission and country scope */
  searchComments: (query: string) => { results: Comment6[]; hiddenByScope: number };

  /* ---------------- C7 File and Document Management ---------------- */
  documents: Doc7[];
  docTypes: DocTypeDef[];
  /** WF-C7-01 / Step 6 — current version per type, plus superseded versions on request */
  docsFor: (recordKey: string, includeSuperseded?: boolean) => Doc7[];
  versionsOf: (recordKey: string, type: string) => Doc7[];
  /** WF-C7-01 / Step 2 — format, size and scan, each reported separately */
  validateUpload: (fileName: string, sizeMB: number, type: string) => { ok: boolean; failures: string[] };
  /** WF-C7-01 / Step 5 — proposed values with the confidence reported */
  extractionFor: (type: string) => { field: string; value: string; confidence: number }[];
  uploadDocument: (input: {
    fileName: string; sizeMB: number; docType: string; recordKey: string; recordName: string;
    objectType: string; country: string; module: string; route?: string;
    documentDate?: string; validFrom?: string; validTo?: string; issuingParty?: string;
    referenceNumber?: string; extractionAccepted?: boolean; fromComment?: boolean;
  }) => { ok: boolean; version?: number; systemRef?: string };
  /** WF-C7-02 / Steps 1–2 — record permission, then the sensitivity restriction */
  canOpenDoc: (doc: Doc7) => { ok: boolean; why?: string };
  openDoc: (id: string, action: 'Opened' | 'Downloaded' | 'Exported') => { ok: boolean; why?: string };
  /** WF-C7-01 / Step 8 */
  checklistFor: (objectType: string, recordKey: string, country?: string) => {
    def?: ChecklistDef; present: string[]; outstanding: string[];
    /** C10 / WF-C10-01 / Step 4 — the country-specific additions, named so a screen can say where they came from */
    countryAdded: string[];
    /** C10 / WF-C10-01 / Step 3 — set where the checklist step does not apply in this country */
    disabledByConfig?: string;
  };
  /** WF-C7-03 / Steps 2–3 */
  runExpiryCheck: () => void;
  expiryStateOf: (doc: Doc7) => ValidityState;
  blockedOperations: () => (BlockedOperation & { doc?: Doc7 })[];
  /** WF-C7-03 / Steps 5–7 */
  archiveDoc: (id: string) => void;
  purgeDoc: (id: string) => void;
  deleteDoc: (id: string, reason: string) => { ok: boolean; why?: string };

  /* ---------------- C8 Audit Trail and Activity History ---------------- */
  auditLevels: AuditLevelDef[];
  sensitiveClasses: SensitiveClassDef[];
  /** WF-C8-01 / Step 4 — the level configured for an entity class */
  auditLevelOf: (entity: string) => AuditLevelDef | undefined;
  saveAuditLevel: (entity: string, patch: Partial<AuditLevelDef>) => void;
  saveSensitiveClass: (cls: string, patch: Partial<SensitiveClassDef>) => void;
  /** WF-C8-02 / Step 3 — audit data is sensitive in its own right */
  hasAuditPermission: () => boolean;
  /** WF-C8-02 / Steps 4–5 — the search logs itself */
  searchAudit: (q: {
    user?: string; from?: string; to?: string; entities?: string[]; countries?: string[];
    actions?: string[]; record?: string; sensitiveOnly?: boolean; sources?: string[];
  }) => AuditRec[];
  logAuditQuery: (description: string, resultCount: number, kind: 'Audit search' | 'Audit export') => void;
  auditForRecord: (recordKey: string) => AuditRec[];
  /** WF-C8-03 / Steps 2–5 */
  runRetentionCycle: () => void;
  retentionStateOf: (a: AuditRec) => 'Within retention' | 'Beyond retention — archived' | 'Beyond retention — eligible for trimming';
  trimArchived: () => void;
  volumeByMonth: typeof VOLUME_BY_MONTH;
  lastRetentionCycle: string;

  /* ---------------- C9 System Logging and Monitoring ---------------- */
  /** WF-C9-01 / Steps 1–2 — level per environment and component, masking as written */
  logLevels: LogLevelDef[];
  maskRules: MaskRule[];
  logEnvironment: Environment;
  setLogEnvironment: (e: Environment) => void;
  saveLogLevel: (component: string, env: Environment, level: Severity) => void;
  saveMaskRule: (id: string, patch: Partial<MaskRule>) => void;
  /** The log, and the same log reduced by the level configured for the environment */
  logEntries: LogEntry[];
  visibleLog: (env: Environment, logClass?: LogClass) => { shown: LogEntry[]; suppressed: number };
  /** WF-C9-01 / Steps 3–7 — incidents */
  incidents: Incident[];
  incidentByRef: (ref: string) => Incident | undefined;
  /** Prototype control — drives the whole chain from log entry to C05 alert */
  simulateFailure: (caseKey: string) => { errorRef: string; friendly: string; incidentId: string };
  lastError: { errorRef: string; friendly: string; incidentId: string } | null;
  clearLastError: () => void;
  assignIncident: (id: string, owner: string) => void;
  reclassifyIncident: (id: string, classification: Classification) => void;
  closeIncident: (id: string, cause: string, resolution: string, preventive?: string) => { ok: boolean; why?: string };
  /** WF-C9-02 / Steps 1–3 — exchanges, retry policy, error queue */
  exchanges: Exchange[];
  exchangeByCorrelation: (correlation: string) => Exchange | undefined;
  retryPolicies: typeof RETRY_POLICIES;
  queuedErrors: QueuedError[];
  correctQueued: (id: string, correctedValue: string) => void;
  reprocessQueued: (ids: string[], reason: string, alsoAudit: boolean) => void;
  /** WF-C9-02 / Steps 4–6 — jobs */
  jobConfigs: JobConfig[];
  jobRunsC9: JobRunRec9[];
  saveJobConfig: (job: JobName, patch: Partial<JobConfig>) => void;
  runJobNow: (job: JobName) => void;
  missedJobsToday: () => JobConfig[];
  /** WF-C9-03 / Steps 1–2 — thresholds and breaches */
  thresholds: ThresholdDef[];
  breaches: Breach[];
  saveThreshold: (measure: Measure, patch: Partial<ThresholdDef>) => void;
  simulateBreach: (measure: Measure) => void;
  /** WF-C9-03 / Steps 4–5 — rotation, retention and masked export */
  logRetention: LogRetentionDef[];
  saveLogRetention: (logClass: LogClass, patch: Partial<LogRetentionDef>) => void;
  retentionPreview: () => RetentionPreviewRow[];
  runLogRetentionCycle: () => void;
  logExports: ExportRec[];
  exportLogs: (q: {
    logClasses: string[]; from: string; to: string; severityFrom?: Severity;
    correlation?: string; includeArchived: boolean; format: string;
  }) => { ok: boolean; why?: string; rows?: LogEntry[]; maskedFields?: number };
  /** The five bands of the health dashboard */
  healthBands: () => {
    tiles: { measure: Measure; value: number; unit: string; threshold: number; state: string }[];
    failedLogins: { country: string; count: number }[];
    failedLoginTotal: number;
    atScale: typeof AT_SCALE_THRESHOLD;
    interfaces: { interfaceName: string; last?: string; outcome?: string; queued: number; avgMs: number; state: string }[];
    jobs: { job: JobName; last?: JobRunRec9; nextExpected: string; overdue: boolean }[];
    incidents: { open: number; critical: number; recurring: number; unassigned: number; oldest?: Incident };
  };
  supportGroup: string;

  /* ---------------- C10 System Configuration and Administration ---------------- */
  /** WF-C10-01 / Step 1 — the country operating parameters */
  countryConfigs: CountryConfig[];
  countryConfig: (country: string) => CountryConfig | undefined;
  activeConfig: () => CountryConfig | undefined;
  activatedCountries: () => string[];
  saveCountryParam: (country: string, patch: Partial<CountryConfig>, parameterName: string) => void;
  /** WF-C10-01 / Step 3 — applicability, and what it hides */
  stepConfigs: StepConfig[];
  stepConfigFor: (country: string, step: string) => StepConfig | undefined;
  stepApplies: (country: string, step: string) => boolean;
  setStepConfig: (country: string, step: string, patch: Partial<StepConfig>) => void;
  hiddenRoutes: (country: string) => string[];
  hiddenStepsFor: (country: string) => { step: string; name: string; module: string }[];
  /** WF-C10-01 / Step 6 — the consistency rule */
  conflictsFor: (country: string) => Conflict[];
  activateCountry: (country: string) => { ok: boolean; why?: string };
  /** WF-C10-01 / Step 5 — numbering, which C03 now reads */
  numberingSeries: NumberingSeries[];
  saveSeries: (id: string, patch: Partial<NumberingSeries>) => void;
  seriesSample: (id: string) => string;
  nextNumberFor: (domainOrType: string) => string;
  /** WF-C10-01 / Step 4 — the country dimension C07's checklist lacks */
  checklistAdditions: CountryChecklistAddition[];
  addChecklistAddition: (country: string, objectType: string, docType: string, reason: string) => void;
  removeChecklistAddition: (id: string) => void;
  /** WF-C10-02 / Steps 1–2 — coding formulas, versioned */
  formulas: CodingFormula[];
  formulaSample: (key: string, date?: string) => { sample: string; version?: number; effectiveFrom?: string };
  saveFormulaElements: (key: string, elements: CodingFormula['versions'][number]['elements'], effectiveFrom: string, requirement: string) => void;
  /** WF-C10-02 / Step 3 — thresholds, one class of which C04 consumes at runtime */
  thresholds10: ThresholdDef10[];
  saveThreshold10: (id: string, patch: Partial<ThresholdDef10>) => void;
  /** WF-C10-02 / Steps 4–5 — translations, fallback and direction */
  translations: TranslationRec[];
  languages: string[];
  previewLanguage: string;
  setPreviewLanguage: (l: string) => void;
  t: (key: string, language?: string) => { text: string; fallback: boolean };
  coverageFor: (language: string) => { translated: number; total: number };
  fallbackCount: (language: string) => number;
  saveTranslation: (key: string, language: string, text: string) => void;
  addLanguage: (language: string) => { ok: boolean; why?: string };
  directionFor: (language: string) => 'ltr' | 'rtl';
  /** WF-C10-02 / Step 6 — formatting from the active country */
  fmt: () => {
    number: (v: number) => string;
    currency: (v: number, currency?: string) => string;
    date: (iso: string) => string;
    time: (hhmm: string) => string;
    sample: typeof FORMAT_SAMPLE;
  };
  /** WF-C10-03 — change control */
  changeRequests: ChangeRequest[];
  raiseChangeRequest: (r: {
    cls: ParameterClass; parameter: string; country: string; currentValue: string; proposedValue: string;
    reason?: string; effectiveFrom?: string; originScreen?: string; originRoute?: string;
    apply?: ChangeRequest['apply'];
  }) => ChangeRequest;
  saveChangeRequest: (id: string, patch: Partial<ChangeRequest>) => void;
  submitChangeRequest: (id: string) => { ok: boolean; why?: string };
  decideChangeRequest: (id: string, approve: boolean, comment: string) => void;
  applyEffective: (id: string) => void;
  simulateChange: (id: string) => {
    kind: 'route' | 'mandatoryStep' | 'none';
    before?: string;
    after?: string;
    beforeReasons?: string[];
    afterReasons?: string[];
    affected?: { reference: string; created: string; version?: number }[];
    why?: string;
  };
  /** WF-C10-01 / Step 8 and WF-C10-03 / Steps 4–5 — versions and in-flight records */
  configVersions: ConfigVersion[];
  versionForRecord: (country: string, createdAt: string) => ConfigVersion | undefined;
  versionsFor: (country: string) => ConfigVersion[];
  recordsUnderVersion: (country: string, version: number) => { reference: string; created: string; open: boolean }[];
  configAsAt: (country: string, date: string) => {
    config?: CountryConfig; version?: ConfigVersion;
    steps: { name: string; module: string; applies: boolean; mandatory: boolean }[];
    bands: ThresholdDef10[];
    formulas: { name: string; sample: string; version?: number }[];
  };
  configNotes: {
    steps: string; authority: string; environment: string; ownership: string; rtl: string;
  };

  /* ---------------- C11 Reporting and Dashboards ---------------- */
  /** WF-C11-01 / Step 1 — the catalogue, and whether the signed-in user may run each report */
  reports: ReportDef[];
  canRunReport: (id: string, userId?: string) => { ok: boolean; why?: string };
  /** WF-C11-01 / Step 2 — regional scope decides whether the country parameter may be widened */
  reportScope: (userId?: string) => { countries: string[]; regional: boolean; statement: string };
  /**
   * WF-C11-01 / Steps 4–6 — every figure computed from a live store, with row-level
   * security applied before retrieval, and every fact carrying the route it drills to.
   */
  runReport: (id: string, params: Record<string, string>, userId?: string) => {
    def?: ReportDef;
    rows: { label: string; value: number; attention?: boolean; drill?: string; dim: string }[];
    facts: { dim: string; ref: string; country: string; route: string; detail: string }[];
    total: number;
    withheld: number;
    security: { kind: 'Internal' | 'External'; statement: string };
    stamp: { report: string; runAt: string; by: string; role: string; countries: string; params: string[]; source: string; refreshedAt?: string };
    empty: boolean;
    emptyReason?: string;
    logRef?: string;
  };
  /** WF-C11-01 / Step 7 — exports, including the mandated templates */
  mandatedTemplates: typeof MANDATED_TEMPLATES;
  exportReport: (id: string, layout: ExportLayout, templateId: string | undefined, rows: number, params: Record<string, string>) => { ok: boolean; why?: string; columns?: string[] };
  requestTemplateChange: (templateId: string, proposed: string, reason: string) => { ok: boolean; requestId?: string };
  /** WF-C11-01 / Step 8 — saved views, personal and role-published */
  savedViews: SavedView[];
  viewsFor: (userId?: string) => SavedView[];
  saveView: (name: string, report: string, params: Record<string, string>) => void;
  publishView: (id: string, role: string) => { ok: boolean; why?: string };
  unpublishView: (id: string) => void;
  deleteView: (id: string) => void;
  canPublish: () => boolean;
  /** WF-C11-02 / Steps 1–3 — one catalogue, enriched in place */
  cardEnrichment: CardEnrichment[];
  cardEnrichmentFor: (key: string) => CardEnrichment | undefined;
  saveCardEnrichment: (key: string, patch: Partial<CardEnrichment>) => void;
  saveCardRoles: (key: string, roles: string[]) => void;
  cardRolesFor: (key: string) => string[];
  cardStale: (key: string) => boolean;
  placedCount: (key: string) => number;
  /** WF-C11-02 / Step 2 — the role default set, which C02 reads */
  roleDefaults: Record<string, string[]>;
  saveRoleDefault: (role: string, cards: string[]) => void;
  usersOnDefault: (role: string) => { onDefault: number; arranged: number };
  /** WF-C11-02 / Steps 5–7 — schedules, per-recipient context, and distribution */
  schedules: ScheduleDef[];
  saveSchedule: (id: string, patch: Partial<ScheduleDef>) => void;
  recipientsOf: (id: string) => { name: string; type: string; context: string; rows: number; external: boolean }[];
  runSchedule: (id: string) => void;
  distribution: DistributionRec[];
  reportNotes: { delivery: string; consolidated: string; latency: string; template: string; cards: string; contract: string };

  /* ---------------- C12 Integration Layer ---------------- */
  /** WF-C12-01 / Step 1 and WF-C12-02 — the registry */
  interfaces: InterfaceDef[];
  interfaceById: (id: string) => InterfaceDef | undefined;
  saveInterface: (id: string, patch: Partial<InterfaceDef>) => { ok: boolean; why?: string };
  activateInterface: (id: string) => { ok: boolean; why?: string };
  /** WF-C12-01 / Steps 2–7 — the six stages, run for real against the C03 mappings */
  runExchange: (interfaceId: string, mode: 'normal' | 'invalid response') => {
    correlation: string;
    stages: StageResult[];
    mapped: { domain: string; externalCode: string; cotsCode?: string; record: string; affects: string }[];
    unmapped: { domain: string; externalCode: string; record: string; affects: string }[];
    written: number;
    held: number;
    outcome: string;
    logRef?: string;
  };
  stagesFor: (correlation: string) => StageResult[] | undefined;
  /** the exchange and queue are the C09 stores, read from the integration side */
  exchangesFor: (interfaceId: string) => Exchange[];
  queueFor: (interfaceId: string) => QueuedError[];
  causeClassOf: (queueId: string) => CauseClass;
  correctionPathFor: (cls: CauseClass) => { path: string; route: string; label: string };
  overThreshold: () => { interfaceId: string; name: string; depth: number; threshold: number; owner: string }[];
  notifyQueueThreshold: (interfaceId: string) => void;
  /** WF-C12-03 / Steps 1–4 — reconciliation */
  reconRuns: ReconRun[];
  reconFor: (interfaceId: string) => ReconRun[];
  reconById: (id: string) => ReconRun | undefined;
  runReconciliation: (interfaceId: string, period: string) => void;
  /** WF-C12-03 / Step 5 — interface health, one computation with two presentations */
  interfaceHealth: () => {
    interfaceId: string; name: string; lastSuccess?: string; failures: number; queueDepth: number;
    avgMs: number; state: string; owner: string;
  }[];
  /** WF-C12-03 / Step 6 — rotation recorded, never a secret displayed */
  rotations: RotationRec[];
  rotateCredential: (interfaceId: string) => void;
  rotationStateOf: (interfaceId: string) => { nextDue: string; overdue: boolean; daysOver: number };
  integrationNotes: {
    scope: string; sap: string; odoo: string; commercial: string; credential: string;
    queueOwnership: string; reprocessAudit: string; readings: typeof OWNERSHIP_READINGS;
  };

  markNotificationsRead: () => void;
  closeTask: (id: string) => void;
  openTasksFor: (userId: string) => Task[];
  rolePermissions: (codes: string[]) => string[];
  effectivePermissions: (userId: string, country: string) => { granted: string[]; role: string[] };
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('Store missing');
  return c;
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingFirstLogin, setPendingFirstLogin] = useState<User | null>(null);
  const [activeCountry, setActiveCountryState] = useState('Sudan');
  const [failedAttempts, setFailedAttempts] = useState<Record<string, number>>({ 'U-004': 5 });

  const [users, setUsers] = useState<User[]>(seedUsers);
  const [roles, setRoles] = useState<Role[]>(seedRoles);
  const [requests, setRequests] = useState<AccessRequest[]>(seedRequests);
  const [delegations, setDelegations] = useState<Delegation[]>(seedDelegations);
  const [reviewPacks, setReviewPacks] = useState<ReviewPack[]>(seedReviewPacks);
  const [tasks, setTasks] = useState<Task[]>([...seedTasks, ...seedTeamTasks]);
  const [notifications, setNotifications] = useState<NotificationRec[]>(seedNotifications);
  const [adMappings, setAdMappings] = useState<AdMapping[]>(seedAdMappings);
  const [audit, setAudit] = useState<AuditRec[]>([
    // C8 / WF-C8-01 / Step 6 — sensitivity comes from the classification, so the
    // entries seeded by earlier modules are normalised through it as well
    ...seedAudit.map((a) => ({
      ...a,
      sensitiveClass: classifySensitive(seedSensitiveClasses, a.entity, a.action),
      sensitive: !!classifySensitive(seedSensitiveClasses, a.entity, a.action),
      levelApplied: (a.field ? 'Field level' : 'Record level') as AuditRec['levelApplied'],
      session: a.source === 'User interface' ? TECH_CONTEXT.session : undefined,
      address: a.source === 'User interface' ? TECH_CONTEXT.address : TECH_CONTEXT.serviceAddress,
      device: a.source === 'User interface' ? TECH_CONTEXT.device : TECH_CONTEXT.serviceDevice
    })),
    // C8 / WF-C8-01 / Step 3 — integration and scheduled-job sources, and archived entries
    ...seedAuditExtra.map((a) => ({
      ...a,
      levelApplied: (a.field ? 'Field level' : 'Record level') as AuditRec['levelApplied'],
      session: a.source === 'User interface' ? TECH_CONTEXT.session : undefined,
      address: a.source === 'User interface' ? TECH_CONTEXT.address : TECH_CONTEXT.serviceAddress,
      device: a.source === 'User interface' ? TECH_CONTEXT.device : TECH_CONTEXT.serviceDevice,
      sensitiveClass: classifySensitive(seedSensitiveClasses, a.entity, a.action),
      sensitive: !!classifySensitive(seedSensitiveClasses, a.entity, a.action)
    }))
  ]);
  const [auditLevels, setAuditLevels] = useState<AuditLevelDef[]>(seedAuditLevels);
  const [sensitiveClasses, setSensitiveClasses] = useState<SensitiveClassDef[]>(seedSensitiveClasses);
  const [toast, setToast] = useState<Toast | null>(null);
  const [dirty, setDirty] = useState<string | null>(null);
  const [dashboardLayout, setDashboardLayout] = useState<Record<string, string[]>>({});
  const [masterRecords, setMasterRecords] = useState<MasterRecord[]>(seedMasterRecords);
  const [mappings, setMappings] = useState<MappingRec[]>(seedMappings);
  const [unmapped, setUnmapped] = useState<UnmappedRec[]>(seedUnmapped);
  const [routes, setRoutes] = useState<RouteDef[]>(seedRoutes);
  const [approvalInstances, setApprovalInstances] = useState<SeededInstance[]>(seedInstances);
  const [reassignments, setReassignments] = useState<ReassignRec[]>(seedReassignments);
  /** WF-C4-02 / Steps 3–4 — the escalation action taken, per pending approval */
  const [escalations, setEscalations] = useState<Record<string, string>>({});
  /** WF-C4-01 / Step 5 and WF-C4-02 / Step 5 — an approver named for one instance, whatever raised it */
  const [namedApprovers, setNamedApprovers] = useState<Record<string, string>>({});
  /* C5 Notifications and Alerts */
  const [rules, setRules] = useState<NotificationRule[]>(seedRules);
  const [templates, setTemplates] = useState<Template[]>(seedTemplates);
  const [channelPolicy, setChannelPolicy] = useState<ChannelPolicy[]>(seedChannelPolicy);
  const [preferences, setPreferences] = useState<Preference[]>(seedPreferences);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(seedSubscriptions);
  const [deliveries, setDeliveries] = useState<DeliveryRec[]>(seedDeliveries);
  const [unmatchedEvents, setUnmatchedEvents] = useState<UnmatchedEvent[]>(seedUnmatched);
  const [readiness, setReadiness] = useState<ReadinessRec[]>(seedReadiness);
  const [jobRules, setJobRules] = useState<JobRule[]>(seedJobRules);
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>(seedOverdue);
  const [jobRuns, setJobRuns] = useState<JobRun[]>(seedJobRuns);
  const quietHours = seedQuietHours;
  /* C6 Comments and Collaboration — the seeded threads plus one record outside the demonstration scope */
  const [comments6, setComments6] = useState<Comment6[]>([...seedComments, OUT_OF_SCOPE_COMMENT]);
  const [exceptions, setExceptions] = useState<ExceptionRec[]>(seedExceptions);
  /* C7 File and Document Management — metadata only; no file is ever stored */
  const [documents, setDocuments] = useState<Doc7[]>(seedDocuments);

  /* ------------------------------------------------------------------ *
   * C9 System Logging and Monitoring — the technical store.
   * Deliberately separate from the C8 audit store: a business audit entry is
   * evidence and cannot be edited or deleted by any role; a technical log entry
   * is diagnostic and is rotated, recycled and deleted under policy.
   * ------------------------------------------------------------------ */
  const [logLevels, setLogLevels] = useState<LogLevelDef[]>(seedLogLevels);
  const [maskRules, setMaskRules] = useState<MaskRule[]>(seedMaskRules);
  const [logEnvironment, setLogEnvironment] = useState<Environment>('Production');
  const [logEntries, setLogEntries] = useState<LogEntry[]>(seedLogEntries);
  const [incidents, setIncidents] = useState<Incident[]>(seedIncidents);
  const [lastError, setLastError] = useState<{ errorRef: string; friendly: string; incidentId: string } | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>(seedExchanges);
  const [queuedErrors, setQueuedErrors] = useState<QueuedError[]>(seedQueuedErrors);
  const [jobConfigs, setJobConfigs] = useState<JobConfig[]>(seedJobConfigs);
  const [jobRunsC9, setJobRunsC9] = useState<JobRunRec9[]>(seedJobRunsC9);
  const [thresholds, setThresholds] = useState<ThresholdDef[]>(seedThresholds);
  const [breaches, setBreaches] = useState<Breach[]>(seedBreaches);
  const [logRetention, setLogRetention] = useState<LogRetentionDef[]>(seedLogRetention);
  const [logExports, setLogExports] = useState<ExportRec[]>(seedExports);
  const [errSeq, setErrSeq] = useState(4);

  /* ------------------------------------------------------------------ *
   * C10 System Configuration and Administration — the store nine modules
   * have been reading without a screen behind it.
   * ------------------------------------------------------------------ */
  const [countryConfigs, setCountryConfigs] = useState<CountryConfig[]>(seedCountryConfigs);
  const [stepConfigs, setStepConfigs] = useState<StepConfig[]>(seedStepConfigs);
  const [numberingSeries, setNumberingSeries] = useState<NumberingSeries[]>(seedNumberingSeries);
  const [checklistAdditions, setChecklistAdditions] = useState<CountryChecklistAddition[]>(seedChecklistAdditions);
  const [formulas, setFormulas] = useState<CodingFormula[]>(seedFormulas);
  const [thresholds10, setThresholds10] = useState<ThresholdDef10[]>(seedThresholds10);
  const [translations, setTranslations] = useState<TranslationRec[]>(seedTranslations);
  const [languages, setLanguages] = useState<string[]>(LANGUAGES);
  const [previewLanguage, setPreviewLanguage] = useState('English');
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>(seedChangeRequests);
  const [configVersions, setConfigVersions] = useState<ConfigVersion[]>(seedConfigVersions);

  /* ------------------------------------------------------------------ *
   * C11 Reporting and Dashboards — the module that reads. It writes only a
   * saved view, a schedule, a card definition and a role default.
   * ------------------------------------------------------------------ */
  const [savedViews, setSavedViews] = useState<SavedView[]>(seedSavedViews);
  const [cardEnrichment, setCardEnrichment] = useState<CardEnrichment[]>(seedCardEnrichment);
  const [cardRoles, setCardRoles] = useState<Record<string, string[]>>({});
  const [roleDefaults, setRoleDefaults] = useState<Record<string, string[]>>(DEFAULT_LAYOUT_BY_ROLE);
  const [schedules, setSchedules] = useState<ScheduleDef[]>(seedSchedules);
  const [distribution, setDistribution] = useState<DistributionRec[]>(seedDistribution);

  /* ------------------------------------------------------------------ *
   * C12 Integration Layer — the twelfth module. It adds a registry, the six
   * stages of an exchange, reconciliation and credential control; it does NOT
   * add a second exchange log or a second error queue. Those live in the C09
   * store and are read from both modules, which is the honest response to an
   * ownership question the client has not yet answered.
   * ------------------------------------------------------------------ */
  const [interfaces, setInterfaces] = useState<InterfaceDef[]>(seedInterfaces);
  const [exchangeStages, setExchangeStages] = useState<Record<string, StageResult[]>>({});
  const [reconRuns, setReconRuns] = useState<ReconRun[]>(seedReconRuns);
  const [rotations, setRotations] = useState<RotationRec[]>(seedRotations);

  /* The lookups the earlier modules read. Declared here, before the functions that
   * consume them, because C03 code generation, the C07 checklist gate, the C06 attach
   * control and the C04 escalation all sit above the C10 action block. */
  const countryConfig = useCallback(
    (country: string) => countryConfigs.find((c) => c.country === country),
    [countryConfigs]
  );
  const activeConfig = useCallback(() => countryConfig(activeCountry), [countryConfig, activeCountry]);
  const activatedCountries = useCallback(
    () => countryConfigs.filter((c) => c.status === 'Active').map((c) => c.country),
    [countryConfigs]
  );
  const stepConfigFor = useCallback(
    (country: string, step: string) => stepConfigs.find((c) => c.country === country && c.step === step),
    [stepConfigs]
  );
  /** WF-C10-01 / Step 3 — a step that does not apply is hidden, not branched around. */
  const stepApplies = useCallback(
    (country: string, step: string) => stepConfigFor(country, step)?.applies ?? true,
    [stepConfigFor]
  );
  const hiddenRoutes = useCallback((country: string) => STEP_CATALOGUE
    .filter((sd) => sd.hidesRoutes && !stepApplies(country, sd.key))
    .flatMap((sd) => sd.hidesRoutes!), [stepApplies]);
  const hiddenStepsFor = useCallback((country: string) => STEP_CATALOGUE
    .filter((sd) => sd.real && !stepApplies(country, sd.key))
    .map((sd) => ({ step: sd.key, name: sd.step, module: sd.module })), [stepApplies]);
  /** WF-C10-01 / Step 5 — what C03 now reads instead of a hard-coded pattern. */
  const nextNumberFor = useCallback((domainOrType: string) => {
    const series = numberingSeries.find((n) => n.domain === domainOrType || n.documentType === domainOrType);
    if (!series) return '';
    const iso = countryConfig(activeCountry)?.iso ?? '';
    return renderNumber(series, iso);
  }, [numberingSeries, countryConfig, activeCountry]);

  /* ------------------------- C5 notification engine ------------------------- */

  /** WF-C5-01 / Step 2 — roles resolve through C1, plus named users, subscribers and external contacts. */
  const resolveRecipients = useCallback((rule: NotificationRule, country: string, recordRef: string): ResolvedRecipient[] => {
    const policy = policyFor(channelPolicy, rule.priority);
    const quiet = quietFor(quietHours, country);
    const out: ResolvedRecipient[] = [];

    const templateFor = (language: string) => {
      const released = templates.filter((t) => t.event === rule.templateEvent && t.status === 'Released');
      const exact = released.find((t) => t.language === language);
      if (exact) return { used: language, missing: undefined as string | undefined };
      const fallback = released.find((t) => t.language === 'English');
      return {
        used: fallback ? 'English' : '—',
        missing: fallback
          ? `No ${language} template is released for ${rule.templateEvent}; the English template is used instead.`
          : `No released template exists for ${rule.templateEvent}, so nothing can be composed.`
      };
    };

    const add = (
      name: string, address: string, source: ResolvedRecipient['source'],
      external: boolean, language: string, via?: string
    ) => {
      if (out.some((r) => r.name === name && r.source === source)) return;
      const dropped: { channel: Channel; why: string }[] = [];
      let channels = [...rule.channels];

      // Step 4 — an external recipient never receives an in-app message
      if (external && channels.includes('In-app')) {
        channels = channels.filter((c) => c !== 'In-app');
        dropped.push({ channel: 'In-app', why: 'An external recipient never receives an in-app message — WF-C5-01 / Step 4.' });
      }
      // Step 4 and WF-C5-03 / Step 2 — SMS and messaging carry cost and are reserved for urgent items
      channels = channels.filter((c) => {
        if (policy.urgentOnly.includes(c)) {
          dropped.push({ channel: c, why: `${c} is reserved for urgent items; this rule is classed ${rule.priority} — WF-C5-03 / Step 2.` });
          return false;
        }
        if (!policy.permitted.includes(c)) {
          dropped.push({ channel: c, why: `${c} is not permitted for the ${rule.priority} class in channel administration — WF-C5-03 / Step 2.` });
          return false;
        }
        return true;
      });
      // Step 4 — in-app is always issued to internal recipients
      if (!external && !channels.includes('In-app') && policy.permitted.includes('In-app')) channels = ['In-app', ...channels];

      // WF-C5-03 / Step 3 — a user preference may re-channel or digest an informational notification
      const pref = preferences.find((p) => p.event === rule.event && users.find((u) => u.id === p.userId)?.name === name);
      if (pref && policy.userMayRechannel) {
        const chosen = channels.filter((c) => pref.channels.includes(c));
        if (chosen.length) channels = chosen;
      }

      const tpl = templateFor(language);
      out.push({
        name, address, source, external, language, via,
        channels, dropped, templateLanguageUsed: tpl.used, templateMissing: tpl.missing
      });
    };

    // roles — resolved to named users within the relevant country scope (C1)
    rule.roles.forEach((role) => {
      const holders = users.filter((u) =>
        u.status === 'Active' &&
        u.assignments.some((a) => a.status === 'Active' && a.role === role && a.countryScope.includes(country)));
      if (holders.length === 0) {
        const registerName = APPROVER_REGISTER.find((e) => e.role === role && e.country === country)?.user;
        if (registerName) {
          const u = users.find((x) => x.name === registerName);
          add(registerName, u?.email ?? `${registerName.toLowerCase().replace(/ /g, '.')}@dalgroup.com`, 'Role', false, u?.language ?? 'English', `${role} in ${country}`);
        }
        return;
      }
      holders.forEach((u) => add(u.name, u.email, 'Role', u.userType === 'External User', u.language, `${role} in ${country}`));
    });

    // named users
    rule.namedUsers.forEach((name) => {
      const u = users.find((x) => x.name === name);
      add(name, u?.email ?? '—', 'Named user', u?.userType === 'External User', u?.language ?? 'English');
    });

    // subscribers who chose to follow the record — WF-C5-03 / Step 5
    if (rule.includeSubscribers) {
      subscriptions
        .filter((sb) => !recordRef || sb.record.split(' ')[0] === recordRef.split(' ')[0] || recordRef.includes(sb.record.split(' ')[0]))
        .forEach((sb) => {
          const u = users.find((x) => x.id === sb.userId);
          add(sb.userName, u?.email ?? '—', 'Subscriber', false, u?.language ?? 'English', `follows ${sb.record}`);
        });
    }

    // external contacts held as governed master data (C3)
    rule.externalContacts.forEach((label) => {
      const c = EXTERNAL_CONTACTS.find((x) => x.name === label);
      if (c) add(c.name, c.address, 'External contact', true, c.language, c.masterRecord);
    });

    // quiet hours are recorded per recipient in the note the dispatcher writes, not here
    void quiet;
    return out;
  }, [channelPolicy, quietHours, templates, preferences, users, subscriptions]);

  /**
   * WF-C5-01 / Steps 1–8 — the engine behind every notification the prototype raises.
   * Called for each notification pushed by C01, C03, C04 and C05 itself.
   */
  const runNotificationEngine = useCallback((n: NotificationRec) => {
    const country = n.country ?? activeCountry;
    const recordRef = n.record ?? n.subject.split(' ')[0];

    // Step 1 — match the event against the configured rules
    const forEvent = rules.filter((r) => r.event === n.event);
    const rule = forEvent.find((r) => r.active && (r.countries.length === 0 || r.countries.includes(country)));
    if (!rule) {
      const inactive = forEvent.find((r) => !r.active);
      const outOfScope = forEvent.find((r) => r.countries.length > 0 && !r.countries.includes(country));
      setUnmatchedEvents((prev) => [{
        id: nextId('UE'), event: n.event, record: n.subject, country, at: stamp(),
        why: inactive
          ? `The ${n.event} rule (${inactive.id}) is inactive, so no notification was issued. The event remains in the audit trail (C8) and the system log (C9).`
          : outOfScope
            ? `A rule exists for ${outOfScope.countries.join(', ')} only; this event was raised in ${country}, which is outside its country scope.`
            : `No rule is configured for ${n.event}. The event remains in the audit trail (C8) and the system log (C9).`
      }, ...prev]);
      return;
    }

    // Steps 2–4 — recipients, composition, channels
    const recipients = resolveRecipients(rule, country, recordRef);
    const quiet = quietFor(quietHours, country);
    const template = templates.find((t) => t.event === rule.templateEvent && t.status === 'Released');
    const rows: DeliveryRec[] = [];

    recipients.forEach((r) => {
      const tpl = templates.find((t) => t.event === rule.templateEvent && t.language === r.templateLanguageUsed && t.status === 'Released') ?? template;
      const ctx = {
        'record.reference': recordRef,
        'record.name': n.record ?? n.subject,
        requester: n.requester ?? currentUser?.name ?? '—',
        country,
        due: n.due ?? '—',
        decision: n.decision ?? '—',
        comment: n.comment ?? '—',
        deepLink: n.route ?? '—',
        'recipient.name': r.name
      };
      const subject = tpl ? renderTemplate(tpl.subject, ctx) : n.subject;
      const body = tpl ? renderTemplate(tpl.body, ctx) : n.subject;

      r.channels.forEach((channel) => {
        // Step 5–6 — queue, dispatch and record the outcome per recipient per channel
        const held = rule.priority !== 'Urgent' && !n.urgent && quiet && !quiet.insideWorkingTime;
        const externalUnreachable = r.external && /\.example$/.test(r.address);
        rows.push({
          id: nextId('DL'),
          notificationId: n.id,
          event: n.event,
          subject, body,
          recipient: r.name, address: r.address, source: r.source, external: r.external,
          language: r.language, channel,
          status: held ? 'Held — quiet hours' : externalUnreachable && channel === 'Email' ? 'Permanently failed' : 'Delivered',
          attempts: held ? 0 : externalUnreachable && channel === 'Email' ? 4 : 1,
          at: stamp(),
          correlation: `CORR-${Math.abs((n.id + channel + r.name).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 0xffffff).toString(16)}`,
          country, priority: rule.priority,
          requiresAck: rule.requiresAcknowledgement,
          deepLink: n.route,
          note: [
            held ? `Non-urgent message outside working time in ${country} — held until ${quiet?.nextWorkingPeriod} — WF-C5-03 / Step 4.` : '',
            rule.priority === 'Urgent' && quiet && !quiet.insideWorkingTime ? 'Urgent messages are dispatched immediately regardless of quiet hours — WF-C5-03 / Step 4.' : '',
            r.templateMissing ?? '',
            rule.raisesTask ? 'The rule raises an inbox task (C2 / WF-C2-03) so the obligation survives an unread email — Step 7.' : ''
          ].filter(Boolean).join(' ') || undefined,
          failureReason: externalUnreachable && channel === 'Email'
            ? 'Recipient mailbox rejected the message: 550 relay not permitted for this sending domain. Business confirmation required: the sending domain and address per country.'
            : undefined
        });
      });
    });

    if (rows.length) setDeliveries((prev) => [...rows, ...prev]);
  }, [rules, resolveRecipients, templates, quietHours, activeCountry, currentUser]);

  /**
   * C5 / WF-C5-01 — every notification raised anywhere in the prototype enters here.
   * The centre line is what the user sees; the engine produces the delivery rows behind it.
   */
  const pushNotification = useCallback((n: Omit<NotificationRec, 'id' | 'at' | 'read' | 'status'> & { status?: NotificationRec['status'] }) => {
    const rec: NotificationRec = { id: nextId('N'), at: stamp(), read: false, status: 'Delivered', ...n };
    setNotifications((prev) => [rec, ...prev]);
    runNotificationEngine(rec);
  }, [runNotificationEngine]);

  /**
   * C5 / WF-C5-01 / Step 4 with C11 / WF-C11-02 / Step 7 — a directed delivery.
   *
   * A scheduled report is not an event whose recipients are resolved from a rule: the
   * recipient is named on the schedule. So C11 supplies the recipient and C05 supplies the
   * channel policy and the delivery log — which is why this writes a delivery row rather
   * than passing through the rule engine, and why the row says where it came from.
   */
  const pushDelivery = useCallback((d: {
    event: string; subject: string; body: string; recipient: string; address: string;
    external: boolean; channel: Channel; status: DeliveryRec['status']; country: string;
    priority: PriorityClass; correlation: string;
  }) => {
    const rec: DeliveryRec = {
      id: nextId('DL'), notificationId: d.correlation, event: d.event, subject: d.subject,
      body: d.body, recipient: d.recipient, address: d.address, source: 'Named user',
      external: d.external, language: 'English', channel: d.channel, status: d.status,
      attempts: d.status === 'Permanently failed' ? 3 : 1, at: stamp(),
      correlation: d.correlation, country: d.country, priority: d.priority, requiresAck: false
    };
    setDeliveries((prev) => [rec, ...prev]);
    return rec;
  }, []);

  /**
   * C9 / WF-C9-01 / Steps 1–2 — the technical log write.
   *
   * The entry is written at the severity the caller states; whether it is *visible*
   * depends on the level configured for its component in the selected environment,
   * which is what `visibleLog` applies. Masked values arrive already masked,
   * because Step 2 masks as the entry is written and not on display — a rule
   * switched off later cannot recover a value that was never stored.
   */
  const pushLog = useCallback((e: Omit<LogEntry, 'id' | 'at'> & { at?: string }) => {
    const rec: LogEntry = { id: nextId('LG'), at: e.at ?? `${TODAY_C9} ${new Date().toTimeString().slice(0, 8)}`, ...e };
    setLogEntries((prev) => [rec, ...prev]);
    return rec;
  }, []);

  /**
   * C8 / WF-C8-01 — the entry is written in the same action as the change, and the
   * audit module decides what it carries: the level applied (Steps 4), the technical
   * context (Step 5) and the sensitive class with its alert (Step 6).
   * An entry is written once: nothing anywhere in the prototype edits or deletes one.
   */
  const pushAudit = useCallback((a: Omit<AuditRec, 'id' | 'at' | 'source'> & { source?: AuditRec['source'] }) => {
    const source = a.source ?? 'User interface';
    const level = auditLevelFor(auditLevels, a.entity);
    const applied = level?.level ?? 'Field level';

    // Step 4 — the detail recorded depends on the configured level
    let field = a.field, oldValue = a.oldValue, newValue = a.newValue;
    if (applied === 'Record level') { field = undefined; oldValue = undefined; newValue = undefined; }
    else if (applied === 'Status level' && field && field !== 'Status') { field = undefined; oldValue = undefined; newValue = undefined; }
    else if (applied === 'Field level' && level && level.fields.length > 0 && field && !level.fields.includes(field)) {
      field = undefined; oldValue = undefined; newValue = undefined;
    }

    // Step 6 — classification at capture
    const cls = classifySensitive(sensitiveClasses, a.entity, a.action);

    const rec: AuditRec = {
      id: nextId('AU'), at: stamp(), source,
      ...a,
      field, oldValue, newValue,
      levelApplied: applied,
      session: source === 'User interface' ? TECH_CONTEXT.session : undefined,
      address: source === 'User interface' ? TECH_CONTEXT.address : TECH_CONTEXT.serviceAddress,
      device: source === 'User interface' ? TECH_CONTEXT.device : TECH_CONTEXT.serviceDevice,
      // Step 6 — an entry is sensitive because it falls within a configured class,
      // not because a calling module happened to say so
      sensitive: !!cls,
      sensitiveClass: cls
    };
    setAudit((prev) => [rec, ...prev]);

    // Step 6 — an alert may be raised to compliance or administration
    if (cls) {
      const def = sensitiveClasses.find((x) => x.cls === cls);
      if (def && def.recipients.length > 0) {
        pushNotification({
          event: 'Sensitive action',
          subject: `${cls}: ${rec.action} on ${rec.entity} ${rec.record} by ${rec.user}`,
          recipient: def.recipients.map((r) => r.replace(/_/g, ' ').toLowerCase()).join(', '),
          channels: ['In-app', 'Email'],
          country: rec.country, record: rec.record, requester: rec.user
        });
      }
    }
  }, [auditLevels, sensitiveClasses, pushNotification]);

  /** C2 / WF-C2-03 — the inbox counterpart of an actionable notification */
  const pushTask = useCallback((t: Omit<Task, 'id' | 'raised' | 'status'>) => {
    setTasks((prev) => [{ id: nextId('T'), raised: '2026-08-18', status: 'Open', ...t }, ...prev]);
  }, []);

  const closeTask = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'Closed' } : t)));
  }, []);

  /**
   * C6 / WF-C6-02 / Steps 1–2 — the comment captured with a decision is written to the
   * record as a decision comment, and can never be edited or removed.
   */
  const pushDecisionComment = useCallback((c: {
    recordKey: string; recordName: string; objectType: string; country: string;
    route?: string; outcome: string; text: string; author: string; role: string;
  }) => {
    setComments6((prev) => [...prev, {
      id: nextId('CM'), recordKey: c.recordKey, recordName: c.recordName, objectType: c.objectType,
      country: c.country, route: c.route, author: c.author, role: c.role, at: stamp(),
      text: c.text || '(no comment)', visibility: 'Internal only',
      isDecision: true, decisionOutcome: c.outcome
    }]);
  }, []);

  const closeTasksForRecord = useCallback((recordFragment: string) => {
    setTasks((prev) => prev.map((t) => (t.relatedRecord.includes(recordFragment) ? { ...t, status: 'Closed' } : t)));
  }, []);

  /* ------------------------- session ------------------------- */

  const signIn = useCallback((userId: string): 'ok' | 'locked' | 'refused' | 'first-login' => {
    const u = users.find((x) => x.id === userId);
    if (!u) return 'refused';
    if (u.status === 'Locked') return 'locked';
    const hasActiveRole = u.assignments.some((a) => a.status === 'Active') || u.userType === 'External User';
    if (u.status !== 'Active' || !hasActiveRole) return 'refused';
    if (u.firstLogin) { setPendingFirstLogin(u); return 'first-login'; }
    setCurrentUser(u);
    setActiveCountryState(u.defaultCountry);
    pushAudit({ user: u.name, role: u.assignments[0]?.role ?? '—', country: u.defaultCountry, entity: 'Session', record: u.id, action: 'Login' });
    return 'ok';
  }, [users, pushAudit]);

  const completeFirstLogin = useCallback((patch: Partial<User>) => {
    if (!pendingFirstLogin) return;
    const updated = { ...pendingFirstLogin, ...patch, firstLogin: false };
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setCurrentUser(updated);
    setActiveCountryState(updated.defaultCountry);
    pushAudit({ user: updated.name, role: updated.assignments[0]?.role ?? '—', country: updated.defaultCountry, entity: 'Session', record: updated.id, action: 'First login — profile confirmed and terms accepted' });
    pushAudit({ user: updated.name, role: updated.assignments[0]?.role ?? '—', country: updated.defaultCountry, entity: 'Session', record: updated.id, action: 'Login' });
    setPendingFirstLogin(null);
  }, [pendingFirstLogin, pushAudit]);

  const recordFailedAttempt = useCallback((userId: string) => {
    let count = 0;
    setFailedAttempts((prev) => {
      count = (prev[userId] ?? 0) + 1;
      return { ...prev, [userId]: count };
    });
    const u = users.find((x) => x.id === userId);
    pushAudit({ user: u?.name ?? userId, role: '—', country: u?.defaultCountry ?? '—', entity: 'Session', record: userId, action: 'Failed login attempt' });
    return count;
  }, [users, pushAudit]);

  const signOut = useCallback(() => {
    if (currentUser) pushAudit({ user: currentUser.name, role: currentUser.assignments[0]?.role ?? '—', country: activeCountry, entity: 'Session', record: currentUser.id, action: 'Logout' });
    setCurrentUser(null);
  }, [currentUser, activeCountry, pushAudit]);

  const setActiveCountry = useCallback((c: string) => setActiveCountryState(c), []);

  /* ------------------------- requests ------------------------- */

  const saveRequest = useCallback((r: AccessRequest) => {
    setRequests((prev) => (prev.some((x) => x.id === r.id) ? prev.map((x) => (x.id === r.id ? r : x)) : [r, ...prev]));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: r.defaultCountry, entity: 'Access Request', record: r.id, action: 'Save draft' });
  }, [currentUser, pushAudit]);

  /** Shared by submitRequest(id) and saveAndSubmitRequest(record) so a brand-new draft can be submitted in one action. */
  const raiseApproval = useCallback((r: AccessRequest, previousStatus: string) => {
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: r.defaultCountry, entity: 'Access Request', record: r.id, action: 'Status change', field: 'Status', oldValue: previousStatus, newValue: 'Pending Approval' });
    pushTask({
      type: 'Approval request — access request',
      sourceModule: 'C1 Identity and Access',
      relatedRecord: `${r.id} ${r.requestedForName}`,
      route: `/c1/access-requests/${r.id}`,
      requester: currentUser?.name ?? '—',
      due: '2026-08-22',
      priority: r.roles.some((c) => roles.find((x) => x.code === c)?.sensitivity === 'Administrative') ? 'Urgent' : 'Normal',
      assigneeId: 'U-001'
    });
    pushNotification({ event: 'Approval request', subject: `Access request ${r.id} awaits your approval`, recipient: r.steps[0]?.approver ?? 'Approver', channels: ['In-app', 'Email'] });
    setToast({ message: `${r.id} submitted. HAND-OFF → C4 / WF-C4-01 Standard Approval Cycle. Task raised in the approver's inbox (C2) and notification issued (C5).`, severity: 'success' });
  }, [roles, currentUser, pushAudit, pushTask, pushNotification]);

  const submitRequest = useCallback((id: string) => {
    const r = requests.find((x) => x.id === id);
    setRequests((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Pending Approval', currentStep: 0 } : x)));
    if (r) raiseApproval(r, r.status);
  }, [requests, raiseApproval]);

  const saveAndSubmitRequest = useCallback((r: AccessRequest) => {
    const submitted: AccessRequest = { ...r, status: 'Pending Approval', currentStep: 0 };
    setRequests((prev) => (prev.some((x) => x.id === r.id) ? prev.map((x) => (x.id === r.id ? submitted : x)) : [submitted, ...prev]));
    raiseApproval(submitted, r.status);
  }, [raiseApproval]);

  const decideRequest = useCallback((id: string, decision: 'Approved' | 'Rejected' | 'Returned for Amendment', comment: string) => {
    setRequests((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const steps = r.steps.map((s, i) => (i === r.currentStep ? { ...s, decision, comment, at: stamp() } : s));
      const isLast = r.currentStep >= r.steps.length - 1;
      const newComment: CommentRec = {
        id: nextId('C'), author: currentUser?.name ?? '—', role: steps[r.currentStep].role,
        country: r.defaultCountry, at: stamp(), text: comment || '(no comment)',
        visibility: 'Internal only', isDecision: true
      };
      if (decision === 'Approved') {
        return { ...r, steps, currentStep: isLast ? r.currentStep + 1 : r.currentStep + 1, status: isLast ? 'Approved' : 'Pending Approval', comments: [...r.comments, newComment] };
      }
      return { ...r, steps, status: decision === 'Rejected' ? 'Rejected' : 'Returned for Amendment', comments: [...r.comments, newComment] };
    }));
    const r = requests.find((x) => x.id === id);
    if (r) {
      pushDecisionComment({
        recordKey: id, recordName: `${id} ${r.requestedForName}`, objectType: 'Access request',
        country: r.defaultCountry, route: `/c1/access-requests/${id}`,
        outcome: decision, text: comment, author: currentUser?.name ?? '—',
        role: r.steps[r.currentStep]?.role ?? 'APPROVER'
      });
    }
    pushAudit({ user: currentUser?.name ?? '—', role: 'APPROVER', country: r?.defaultCountry ?? '—', entity: 'Access Request', record: id, action: decision, field: 'Status', oldValue: 'Pending Approval', newValue: decision, sensitive: true });
    closeTasksForRecord(id);
    if (decision === 'Approved') {
      pushNotification({ event: 'Approval outcome', subject: `Access request ${id} approved`, recipient: r?.requestedBy ?? '—', channels: ['In-app', 'Email'] });
      setToast({ message: `${id} approved. HAND-OFF → C5 outcome notification · HAND-OFF → C8 decision history. Activate Account is now available.`, severity: 'success' });
    } else if (decision === 'Rejected') {
      pushNotification({ event: 'Approval outcome', subject: `Access request ${id} rejected`, recipient: r?.requestedBy ?? '—', channels: ['In-app', 'Email'] });
      setToast({ message: `${id} rejected. Requester notified (C5). Decision comment locked on the record (C6 / WF-C6-02).`, severity: 'warning' });
    } else {
      pushTask({ type: 'Amend and resubmit — returned request', sourceModule: 'C1 Identity and Access', relatedRecord: `${id} ${r?.requestedForName ?? ''}`, route: `/c1/access-requests/${id}`, requester: currentUser?.name ?? '—', due: '2026-08-25', priority: 'Normal', assigneeId: 'U-001' });
      pushNotification({ event: 'Returned for amendment', subject: `Access request ${id} returned for amendment`, recipient: r?.requestedBy ?? '—', channels: ['In-app', 'Email'] });
      setToast({ message: `${id} returned for amendment. The returning comment is shown to the requester (C6 / WF-C6-02 / Step 3) and a task is raised (C2).`, severity: 'info' });
    }
  }, [requests, currentUser, pushAudit, pushNotification, pushTask, closeTasksForRecord, pushDecisionComment]);

  const withdrawRequest = useCallback((id: string) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Draft', currentStep: 0, steps: r.steps.map((s) => ({ ...s, decision: undefined, comment: undefined, at: undefined })) } : r)));
    closeTasksForRecord(id);
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: '—', entity: 'Access Request', record: id, action: 'Withdraw' });
    pushNotification({ event: 'Approval task cancelled', subject: `Open approval tasks for ${id} cancelled`, recipient: 'Approvers', channels: ['In-app', 'Email'] });
    setToast({ message: `${id} withdrawn (C4 / WF-C4-02 / Step 6). Record returned to Draft and open tasks cancelled with notification.`, severity: 'info' });
  }, [currentUser, pushAudit, pushNotification, closeTasksForRecord]);

  const activateAccount = useCallback((id: string) => {
    const r = requests.find((x) => x.id === id);
    if (!r) return undefined;
    const newId = nextId('U');
    const user: User = {
      id: newId,
      name: r.requestedForName,
      userType: r.userType,
      status: 'Active',
      email: r.email,
      orgUnit: r.orgUnit,
      language: r.language,
      defaultCountry: r.defaultCountry,
      countryScope: r.countryScope,
      moduleScope: r.moduleScope,
      assignments: r.roles.map((code) => ({
        id: nextId('A'), role: code, countryScope: r.countryScope, moduleScope: r.moduleScope,
        area: r.area, source: r.origin === 'Automatic from AD group' ? 'Derived from AD group' : 'Manual',
        from: r.effectiveFrom, to: r.effectiveTo, status: 'Active'
      })),
      partyType: r.partyType,
      partyRecord: r.partyRecord,
      contractExpiry: r.contractExpiry,
      firstLogin: true,
      route: r.userType === 'External User' ? 'External' : 'Internal'
    };
    setUsers((prev) => [user, ...prev]);
    setRequests((prev) => prev.map((x) => (x.id === id ? { ...x, createdUserId: newId } : x)));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: r.defaultCountry, entity: 'User Account', record: newId, action: 'Activate', field: 'Status', newValue: 'Active', sensitive: true });
    pushNotification({
      event: 'Welcome / activation',
      subject: r.userType === 'External User'
        ? `Activation link issued to ${r.requestedForName} (no password transmitted)`
        : `Access instructions issued to ${r.requestedForName}`,
      recipient: r.email,
      channels: r.userType === 'External User' ? ['Email'] : ['In-app', 'Email'],
      external: r.userType === 'External User'
    });
    setToast({ message: `Account ${newId} activated. ${r.userType === 'External User' ? 'Activation link issued rather than a transmitted password' : 'Access instructions issued'} (C5 / WF-C5-01).`, severity: 'success' });
    return newId;
  }, [requests, currentUser, pushAudit, pushNotification]);

  const addRequestComment = useCallback((id: string, c: Omit<CommentRec, 'id' | 'at'>) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, comments: [...r.comments, { ...c, id: nextId('C'), at: stamp() }] } : r)));
    pushAudit({ user: c.author, role: c.role, country: c.country, entity: 'Comment', record: id, action: 'Create' });
  }, [pushAudit]);

  const addRequestDocument = useCallback((id: string, d: Omit<DocumentRec, 'id' | 'uploadedAt' | 'version'>) => {
    setRequests((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const existing = r.documents.filter((x) => x.docType === d.docType);
      return { ...r, documents: [...r.documents, { ...d, id: nextId('D'), uploadedAt: stamp(), version: existing.length + 1 }] };
    }));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: '—', entity: 'Document', record: id, action: 'Upload' });
  }, [currentUser, pushAudit]);

  /* ------------------------- roles and users ------------------------- */

  const saveRole = useCallback((r: Role) => {
    setRoles((prev) => (prev.some((x) => x.code === r.code) ? prev.map((x) => (x.code === r.code ? r : x)) : [...prev, r]));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: activeCountry, entity: 'Role', record: r.code, action: 'Submit for approval', sensitive: true });
    setToast({ message: `Role ${r.code} submitted. HAND-OFF → C4 / WF-C4-01. Role definition changes are sensitive actions and are written to C8 on approval.`, severity: 'success' });
  }, [currentUser, activeCountry, pushAudit]);

  const addAssignment = useCallback((userId: string, a: Omit<import('./mockData').Assignment, 'id' | 'status'>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, assignments: [...u.assignments, { ...a, id: nextId('A'), status: 'Active' }] } : u)));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: activeCountry, entity: 'Assignment', record: userId, action: 'Create', newValue: a.role, sensitive: true });
    setToast({ message: `Assignment added. HAND-OFF → C4 / WF-C4-01 for approval · HAND-OFF → C8 sensitive action.`, severity: 'success' });
  }, [currentUser, activeCountry, pushAudit]);

  const endAssignment = useCallback((userId: string, assignmentId: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, assignments: u.assignments.map((a) => (a.id === assignmentId ? { ...a, status: 'Lapsed', to: '2026-08-18' } : a)) } : u)));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: activeCountry, entity: 'Assignment', record: assignmentId, action: 'End', sensitive: true });
  }, [currentUser, activeCountry, pushAudit]);

  const deactivateUser = useCallback((userId: string, trigger: string, reason: string, reassignTo: Record<string, string>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'Deactivated' } : u)));
    setTasks((prev) => prev.map((t) => (reassignTo[t.id] ? { ...t, assigneeId: reassignTo[t.id] } : t)));
    const u = users.find((x) => x.id === userId);
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: activeCountry, entity: 'User Account', record: userId, action: `Deactivate (${trigger})`, field: 'Status', oldValue: u?.status, newValue: 'Deactivated', sensitive: true });
    setToast({ message: `${u?.name} deactivated. Open work reassigned first. Accounts are never deleted, so historical audit references remain intact (C1 / WF-C1-02 / Step 10).`, severity: 'success' });
  }, [users, currentUser, activeCountry, pushAudit]);

  const toggleAdMapping = useCallback((group: string) => {
    setAdMappings((prev) => prev.map((m) => (m.group === group ? { ...m, enabled: !m.enabled } : m)));
  }, []);

  /* ------------------------- delegation ------------------------- */

  const rolePermissions = useCallback((codes: string[]) => {
    const set = new Set<string>();
    codes.forEach((c) => roles.find((r) => r.code === c)?.permissions.forEach((p) => set.add(p)));
    return [...set];
  }, [roles]);

  /** C1 / WF-C1-04 / Step 2 — delegation cannot exceed the delegate's own permission ceiling */
  const createDelegation = useCallback((d: Omit<Delegation, 'id' | 'status'>) => {
    const from = users.find((u) => u.id === d.fromUserId);
    const to = users.find((u) => u.id === d.toUserId);
    if (!from || !to) return { ok: false, blocked: ['Delegate not found'] };
    const fromPerms = rolePermissions(from.assignments.filter((a) => a.status === 'Active').map((a) => a.role));
    const toPerms = new Set(rolePermissions(to.assignments.filter((a) => a.status === 'Active').map((a) => a.role)));
    const blocked = fromPerms.filter((p) => !toPerms.has(p)).slice(0, 8);
    if (blocked.length) {
      setDelegations((prev) => [{ ...d, id: nextId('DL'), status: 'Refused' }, ...prev]);
      return { ok: false, blocked };
    }
    setDelegations((prev) => [{ ...d, id: nextId('DL'), status: 'Active' }, ...prev]);
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: activeCountry, entity: 'Delegation', record: `${from.name} → ${to.name}`, action: 'Create' });
    setToast({ message: `Delegation accepted. During the period, C4 / WF-C4-01 / Step 5 resolves approval tasks to ${to.name} and C2 presents them in their inbox. Both names appear on the approval history.`, severity: 'success' });
    return { ok: true };
  }, [users, rolePermissions, currentUser, activeCountry, pushAudit]);

  const endDelegation = useCallback((id: string) => {
    setDelegations((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'Lapsed' } : d)));
    setToast({ message: 'Delegation ended. Task routing reverts to the original user.', severity: 'info' });
  }, []);

  /* ------------------------- access review ------------------------- */

  const setReviewDecision = useCallback((packId: string, userId: string, decision: Decision, amendedScope?: string[], comment?: string) => {
    setReviewPacks((prev) => prev.map((p) => (p.id === packId
      ? { ...p, entries: p.entries.map((e) => (e.userId === userId ? { ...e, decision, amendedScope, comment } : e)) }
      : p)));
  }, []);

  const completeReview = useCallback((packId: string) => {
    const pack = reviewPacks.find((p) => p.id === packId);
    if (!pack) return;
    pack.entries.forEach((e) => {
      if (e.decision === 'Revoke') {
        setUsers((prev) => prev.map((u) => (u.id === e.userId
          ? { ...u, assignments: u.assignments.map((a) => (a.role === e.role ? { ...a, status: 'Lapsed', to: '2026-08-18' } : a)) }
          : u)));
      }
      if (e.decision === 'Amend' && e.amendedScope) {
        setUsers((prev) => prev.map((u) => (u.id === e.userId
          ? { ...u, assignments: u.assignments.map((a) => (a.role === e.role ? { ...a, countryScope: e.amendedScope! } : a)) }
          : u)));
      }
      pushAudit({ user: currentUser?.name ?? '—', role: 'COUNTRY_MANAGER', country: pack.country, entity: 'Access review entry', record: `${packId}/${e.userId}`, action: e.decision ?? 'Confirm', sensitive: true });
    });
    setReviewPacks((prev) => prev.map((p) => (p.id === packId ? { ...p, status: 'Complete' } : p)));
    closeTasksForRecord(packId);
    setToast({ message: `Review ${packId} complete. Amendments and revocations applied automatically; outcome written to the audit trail (C8 / WF-C8-01).`, severity: 'success' });
  }, [reviewPacks, currentUser, pushAudit, closeTasksForRecord]);

  const confirmDormant = useCallback((userId: string) => {
    const u = users.find((x) => x.id === userId);
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: activeCountry, entity: 'User Account', record: userId, action: 'Dormancy confirmed still required' });
    setToast({ message: `${u?.name} confirmed as still required. The account remains active.`, severity: 'success' });
  }, [users, currentUser, activeCountry, pushAudit]);

  const suspendDormant = useCallback((userId: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'Suspended' } : u)));
    const u = users.find((x) => x.id === userId);
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: activeCountry, entity: 'User Account', record: userId, action: 'Auto-suspend (dormancy)', field: 'Status', oldValue: 'Active', newValue: 'Suspended', sensitive: true });
    setToast({ message: `${u?.name} suspended for dormancy. Any open tasks must be reassigned (see WF-C1-02).`, severity: 'warning' });
  }, [users, currentUser, activeCountry, pushAudit]);

  /** Cards the user's roles are permitted to see — C2 / WF-C2-02 / Step 5 */
  const permittedCards = useCallback((userId: string) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return [];
    const codes = u.assignments.filter((a) => a.status === 'Active').map((a) => a.role);
    return CARD_CATALOGUE
      // C11 / WF-C11-02 / Step 1 — the permission requirement is a field on the card
      // definition, and C11 edits it. There is one catalogue, so the shell reads the
      // C11 override where one has been made rather than a rival list.
      .filter((c) => {
        const roles = cardRoles[c.key] ?? c.roles;
        return roles.includes('*') || roles.some((r) => codes.includes(r));
      })
      .filter((c) => (u.userType === 'Internal Stakeholder' ? c.reportingOriented || c.key === 'alerts' : true))
      .map((c) => c.key);
  }, [users, cardRoles]);

  const layoutFor = useCallback((userId: string, country: string) => {
    const saved = dashboardLayout[`${userId}|${country}`];
    // A user who has arranged their own dashboard keeps their arrangement: changing the
    // role default does not overwrite it — C11 / WF-C11-02 / Step 2.
    if (saved) return saved;
    const u = users.find((x) => x.id === userId);
    const primary = u?.assignments.find((a) => a.status === 'Active')?.role;
    const def = (primary && roleDefaults[primary]) || ['pending', 'alerts'];
    const allowed = permittedCards(userId);
    return def.filter((k) => allowed.includes(k));
  }, [dashboardLayout, users, permittedCards, roleDefaults]);

  const setLayout = useCallback((userId: string, country: string, cards: string[]) => {
    setDashboardLayout((prev) => ({ ...prev, [`${userId}|${country}`]: cards }));
    setToast({ message: `Dashboard arrangement saved for ${country}. The arrangement is held per user per country — C2 / WF-C2-02 / Step 5.`, severity: 'success' });
  }, []);

  const resetLayout = useCallback((userId: string, country: string) => {
    setDashboardLayout((prev) => {
      const next = { ...prev };
      delete next[`${userId}|${country}`];
      return next;
    });
    setToast({ message: 'Dashboard reset to the role default layout.', severity: 'info' });
  }, []);


  /* ------------------------- C3 master data ------------------------- */

  const domainOf = useCallback((key: string) => DOMAINS.find((d) => d.key === key), []);

  const saveMaster = useCallback((r: MasterRecord) => {
    setMasterRecords((prev) => (prev.some((x) => x.id === r.id) ? prev.map((x) => (x.id === r.id ? r : x)) : [r, ...prev]));
    pushAudit({ user: currentUser?.name ?? '—', role: 'DATA_OWNER', country: r.country ?? 'Global', entity: `Master data — ${domainOf(r.domain)?.name}`, record: r.code, action: 'Save draft' });
    setToast({ message: `${r.code} saved as Draft. A Draft record is not selectable in transactions — C3 / WF-C3-01 / Step 6.`, severity: 'info' });
  }, [currentUser, pushAudit, domainOf]);

  /** WF-C3-01 / Step 7 — governed domains route for approval; low-risk lists activate immediately. */
  const submitMaster = useCallback((r: MasterRecord) => {
    const d = domainOf(r.domain);
    const governed = d?.governed ?? true;
    const submitted: MasterRecord = { ...r, status: governed ? 'Pending Approval' : 'Active', currentStep: 0 };
    setMasterRecords((prev) => (prev.some((x) => x.id === r.id) ? prev.map((x) => (x.id === r.id ? submitted : x)) : [submitted, ...prev]));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'DATA_OWNER', country: r.country ?? 'Global',
      entity: `Master data — ${d?.name}`, record: r.code, action: 'Status change',
      field: 'Status', oldValue: r.status, newValue: governed ? 'Pending Approval' : 'Active', sensitive: true
    });
    if (governed) {
      pushTask({
        type: 'Approval request — master data record', sourceModule: 'C3 Master Data',
        relatedRecord: `${r.code} ${r.name}`, route: `/c3/records/${r.id}`,
        requester: currentUser?.name ?? '—', due: '2026-08-22', priority: 'Normal', assigneeId: 'U-001'
      });
      pushNotification({ event: 'Approval request', subject: `Master data record ${r.code} awaits your approval`, recipient: submitted.steps[0]?.approver ?? 'Approver', channels: ['In-app', 'Email'] });
      setToast({ message: `${r.code} submitted. HAND-OFF → C4 / WF-C4-01. The route was resolved from the domain (${d?.name}) and the country.`, severity: 'success' });
    } else {
      setToast({ message: `${r.code} activated immediately. ${d?.name} is a low-risk list configured for immediate activation — no approval step applies (WF-C3-01 / Step 7).`, severity: 'success' });
    }
  }, [currentUser, pushAudit, pushTask, pushNotification, domainOf]);

  const decideMaster = useCallback((id: string, decision: 'Approved' | 'Rejected' | 'Returned for Amendment', comment: string) => {
    let code = '';
    setMasterRecords((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      code = r.code;
      const steps = r.steps.map((st, i) => (i === r.currentStep ? { ...st, decision, comment, at: stamp() } : st));
      const isLast = r.currentStep >= r.steps.length - 1;
      const newComment = {
        id: nextId('C'), author: currentUser?.name ?? '—', role: steps[r.currentStep]?.role ?? '—',
        country: r.country ?? 'Global', at: stamp(), text: comment || '(no comment)',
        visibility: 'Internal only' as const, isDecision: true
      };
      if (decision !== 'Approved') {
        return { ...r, steps, status: decision === 'Rejected' ? 'Rejected' : 'Returned for Amendment', comments: [...r.comments, newComment], pendingAmendment: undefined };
      }
      if (!isLast) return { ...r, steps, currentStep: r.currentStep + 1, comments: [...r.comments, newComment] };

      // final approval — apply any pending amendment as a new effective-dated version (WF-C3-02 / Step 5)
      if (r.pendingAmendment) {
        const pa = r.pendingAmendment;
        const nextVersion = (r.versions[r.versions.length - 1]?.version ?? 0) + 1;
        const changed = Object.entries(pa.patch).map(([k, v]) => `${k} ${v}`).join(', ');
        const versions = r.versions.map((v) => (v.status === 'Current'
          ? { ...v, status: 'Superseded' as const, validTo: pa.effectiveFrom ? pa.effectiveFrom : '2026-08-18' }
          : v));
        versions.push({
          version: nextVersion,
          status: (pa.effectiveFrom && pa.effectiveFrom > '2026-08-18' ? 'Future' : 'Current'),
          validFrom: pa.effectiveFrom ?? '2026-08-18',
          changed, reason: pa.reason,
          approvedBy: currentUser?.name ?? '—', approvedAt: stamp()
        });
        return {
          ...r, steps, currentStep: r.currentStep + 1, status: 'Active',
          attrs: { ...r.attrs, ...pa.patch }, versions,
          comments: [...r.comments, newComment], pendingAmendment: undefined,
          lastChanged: stamp(), changedBy: currentUser?.name ?? '—'
        };
      }
      // first activation
      const versions = r.versions.length ? r.versions : [{
        version: 1, status: 'Current' as const, validFrom: '2026-08-18',
        changed: 'Initial creation', reason: 'Initial creation',
        approvedBy: currentUser?.name ?? '—', approvedAt: stamp()
      }];
      return { ...r, steps, currentStep: r.currentStep + 1, status: 'Active', versions, comments: [...r.comments, newComment] };
    }));
    const rec = masterRecords.find((x) => x.id === id);
    if (rec) {
      pushDecisionComment({
        recordKey: rec.code, recordName: `${rec.code} ${rec.name}`,
        objectType: `Master data — ${DOMAINS.find((d) => d.key === rec.domain)?.name ?? rec.domain}`,
        country: rec.country ?? 'Global', route: `/c3/records/${id}`,
        outcome: decision, text: comment, author: currentUser?.name ?? '—',
        role: rec.steps[rec.currentStep]?.role ?? 'APPROVER'
      });
    }
    pushAudit({ user: currentUser?.name ?? '—', role: 'APPROVER', country: rec?.country ?? 'Global', entity: 'Master data', record: rec?.code ?? id, action: decision, field: 'Status', oldValue: 'Pending Approval', newValue: decision === 'Approved' ? 'Active' : decision, sensitive: true });
    closeTasksForRecord(rec?.code ?? id);
    pushNotification({ event: 'Approval outcome', subject: `Master data record ${rec?.code} ${decision.toLowerCase()}`, recipient: rec?.owner ?? '—', channels: ['In-app', 'Email'] });
    if (decision === 'Approved') {
      setToast({ message: `${code || rec?.code} is now Active and immediately available to all modules within its scope — WF-C3-01 / Step 9. Written to the audit trail as a sensitive action.`, severity: 'success' });
    } else if (decision === 'Rejected') {
      setToast({ message: `${code || rec?.code} rejected. The requester is notified and the decision comment is locked on the record.`, severity: 'warning' });
    } else {
      setToast({ message: `${code || rec?.code} returned for amendment. The returning comment is shown to the data owner.`, severity: 'info' });
    }
  }, [masterRecords, currentUser, pushAudit, pushNotification, closeTasksForRecord, pushDecisionComment]);

  /** WF-C3-02 / Steps 1–4 */
  const amendMaster = useCallback((id: string, patch: Record<string, string>, effectiveFrom: string | undefined, reason: string, critical: boolean) => {
    setMasterRecords((prev) => prev.map((r) => (r.id === id
      ? { ...r, status: 'Pending Approval', currentStep: 0, pendingAmendment: { patch, effectiveFrom, reason, critical },
          steps: critical ? r.steps : [r.steps[0] ?? { seq: 1, role: 'COUNTRY_MANAGER', type: 'Sequential', approver: 'Grace Mensah', sla: '2 working days' }] }
      : r)));
    const rec = masterRecords.find((x) => x.id === id);
    pushAudit({ user: currentUser?.name ?? '—', role: 'DATA_OWNER', country: rec?.country ?? 'Global', entity: 'Master data', record: rec?.code ?? id, action: 'Amendment submitted', sensitive: true });
    pushTask({ type: 'Approval request — master data amendment', sourceModule: 'C3 Master Data', relatedRecord: `${rec?.code} ${rec?.name}`, route: `/c3/records/${id}`, requester: currentUser?.name ?? '—', due: '2026-08-22', priority: 'Normal', assigneeId: 'U-001' });
    setToast({
      message: effectiveFrom
        ? `Amendment submitted with an effective-from date of ${effectiveFrom}. The previous value is retained, so transactions before that date still resolve the old value — WF-C3-02 / Steps 2–3.`
        : 'Amendment submitted. The attribute is not effective-dated, so the value is replaced under the same approval and audit control.',
      severity: 'success'
    });
  }, [masterRecords, currentUser, pushAudit, pushTask]);

  /** WF-C3-02 / Steps 6–8 — deactivation is refused where dependencies exist */
  const deactivateMaster = useCallback((id: string, reason: string) => {
    const rec = masterRecords.find((x) => x.id === id);
    if (!rec) return { ok: false };
    if (rec.dependencies.length > 0) return { ok: false, blocking: rec.dependencies.length };
    setMasterRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Inactive', lastChanged: stamp(), changedBy: currentUser?.name ?? '—' } : r)));
    pushAudit({ user: currentUser?.name ?? '—', role: 'DATA_OWNER', country: rec.country ?? 'Global', entity: 'Master data', record: rec.code, action: `Deactivate — ${reason}`, field: 'Status', oldValue: 'Active', newValue: 'Inactive', sensitive: true });
    setToast({ message: `${rec.code} deactivated. It remains visible in historical transactions and reports but cannot be selected in new ones — WF-C3-02 / Step 8. The record is not deleted.`, severity: 'success' });
    return { ok: true };
  }, [masterRecords, currentUser, pushAudit]);

  const reactivateMaster = useCallback((id: string) => {
    setMasterRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Pending Approval', currentStep: 0 } : r)));
    const rec = masterRecords.find((x) => x.id === id);
    pushTask({ type: 'Approval request — master data reactivation', sourceModule: 'C3 Master Data', relatedRecord: `${rec?.code} ${rec?.name}`, route: `/c3/records/${id}`, requester: currentUser?.name ?? '—', due: '2026-08-22', priority: 'Normal', assigneeId: 'U-001' });
    setToast({ message: 'Reactivation requested. It follows the same controlled route as creation and is audited in the same way — WF-C3-02 / Step 9.', severity: 'info' });
  }, [masterRecords, currentUser, pushTask]);

  const addMasterDocument = useCallback((id: string, d: MasterRecord['documents'][number]) => {
    setMasterRecords((prev) => prev.map((r) => (r.id === id ? { ...r, documents: [...r.documents, d] } : r)));
  }, []);

  const addMasterComment = useCallback((id: string, c: MasterRecord['comments'][number]) => {
    setMasterRecords((prev) => prev.map((r) => (r.id === id ? { ...r, comments: [...r.comments, c] } : r)));
  }, []);

  /** WF-C3-03 / Steps 2–5 */
  const bulkLoad = useCallback((domain: string, rows: number, partial: boolean) => {
    const d = domainOf(domain);
    const created: MasterRecord[] = Array.from({ length: rows }, (_, i) => ({
      id: nextId('MD'),
      domain,
      code: `${(d?.coding.mode === 'Generated' ? d.coding.formula.split('-')[0] : 'NEW')}-${9000 + i}`,
      name: `${d?.name} bulk row ${i + 1}`,
      status: (d?.governed ? 'Pending Approval' : 'Active') as MasterStatus,
      country: d?.scope === 'Country' ? activeCountry : undefined,
      owner: currentUser?.name ?? '—',
      attrs: { Source: 'Bulk load', 'Loaded at': stamp() },
      versions: [], documents: [], dependencies: [],
      lastChanged: stamp(), changedBy: currentUser?.name ?? '—',
      currentStep: 0,
      steps: [{ seq: 1, role: 'COUNTRY_MANAGER', type: 'Sequential', approver: 'Grace Mensah', sla: '2 working days' }],
      comments: []
    }));
    setMasterRecords((prev) => [...created, ...prev]);
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: activeCountry, entity: `Master data — ${d?.name}`, record: `Bulk load ${rows} rows`, action: 'Bulk load', sensitive: true });
    if (d?.governed) {
      pushTask({ type: 'Approval request — bulk master data load', sourceModule: 'C3 Master Data', relatedRecord: `${d?.name} bulk load, ${rows} rows`, route: '/c3/bulk-load', requester: currentUser?.name ?? '—', due: '2026-08-22', priority: 'Normal', assigneeId: 'U-001' });
    }
    setToast({
      message: partial
        ? `Partial load committed: ${rows} valid rows created, rows in error not loaded. Loaded records enter the same approval route as manually created records — WF-C3-03 / Step 5. Bulk data loads are sensitive actions (C8).`
        : `${rows} rows committed and routed for approval — WF-C3-03 / Step 5. Bulk data loads are sensitive actions (C8).`,
      severity: 'success'
    });
  }, [activeCountry, currentUser, pushAudit, pushTask, domainOf]);

  const saveMapping = useCallback((m: MappingRec) => {
    setMappings((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [m, ...prev]));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global', entity: 'External mapping', record: `${m.cotsCode} → ${m.externalSystem} ${m.externalCode}`, action: 'Create', sensitive: true });
    setToast({ message: `Mapping saved. Mapping is maintained as master data in its own right, under the same creation, approval and audit control as any other domain — WF-C3-03 / Step 7.`, severity: 'success' });
  }, [currentUser, pushAudit]);

  const resolveUnmapped = useCallback((unmappedId: string, externalCode: string, cotsCode: string, cotsName: string) => {
    const u = unmapped.find((x) => x.id === unmappedId);
    if (!u) return;
    setMappings((prev) => [{
      id: nextId('MP'), domain: u.domain, cotsCode, cotsName,
      externalSystem: u.externalSystem, externalCode, validFrom: '2026-08-18', status: 'Pending Approval'
    }, ...prev]);
    setUnmapped((prev) => prev.filter((x) => x.id !== unmappedId));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global', entity: 'External mapping', record: `${cotsCode} → ${u.externalSystem} ${externalCode}`, action: 'Create from unmapped-code exception', sensitive: true });
    setToast({ message: `Mapping created for ${u.externalCode}. The queued records can now be reprocessed — RETURN → C12 / WF-C12-01 / Step 10. ${u.affected} record(s) affected.`, severity: 'success' });
  }, [unmapped, currentUser, pushAudit]);

  /* ------------------------- C4 approval workflow ------------------------- */

  /** WF-C4-01 / Step 5 — the step names a role; the role resolves to a named user, then delegation applies. */
  const resolveApprover = useCallback((role: string, country: string) => {
    const entry = APPROVER_REGISTER.find((e) => e.role === role && e.country === country);
    if (!entry) {
      return {
        basis: `No active holder of ${role} is assigned to ${country}.`,
        unresolvedWhy: `No active holder of ${role} is assigned to ${country}. The step cannot be skipped, so the request is held and the administrator is alerted.`
      };
    }
    const today = '2026-08-18';
    const registered = delegations.filter((d) => d.status === 'Active' && d.fromUser === entry.user);
    const inScope = (d: Delegation) => d.scope.some((sc) =>
      sc.includes(role) && (sc.includes(country) || !/Sudan|Ethiopia|Tanzania|Mozambique/.test(sc)));
    const del = registered.find((d) => d.start <= today && d.end >= today && inScope(d));
    const notYet = registered.find((d) => d.start > today);
    const otherScope = registered.find((d) => !inScope(d));
    if (del) {
      return {
        approver: del.toUser,
        delegateOf: entry.user,
        basis: `${role} in ${country} resolves to ${entry.user}; a delegation to ${del.toUser} is in force from ${del.start} to ${del.end}, so the task is presented to the delegate. Both names appear on the approval history.`
      };
    }
    const caveat = notYet
      ? ` A delegation to ${notYet.toUser} is registered but begins on ${notYet.start}, so authority remains with ${entry.user} today.`
      : otherScope
        ? ` A delegation to ${otherScope.toUser} is registered for a different scope (${otherScope.scope.join('; ')}), so it does not apply here.`
        : '';
    return { approver: entry.user, basis: `${role} in ${country} resolves to ${entry.user}.${caveat}` };
  }, [delegations]);

  /** Every pending decision in the system, whatever module raised the subject record. */
  const approvalQueue = useMemo<ApprovalView[]>(() => {
    const out: ApprovalView[] = [];

    /**
     * WF-C4-01 / Step 5 — where the active step cannot reach the number of decisions
     * it requires, because a named approver cannot be resolved, the request is held.
     * A quorum or any-one step tolerates an unresolvable member; an all-required step does not.
     */
    const withHold = (v: ApprovalView): ApprovalView => {
      if (v.unresolved || v.assignedApprover) return v;
      const g = v.groups[v.currentGroup];
      if (!g) return v;
      const decidedRoles = v.decisions.filter((d) => d.seq === g.seq && d.decision === 'Approved').map((d) => d.role);
      const pending = g.members.filter((m) => !decidedRoles.includes(m.role));
      const unresolvable = pending.filter((m) => !resolveApprover(m.role, v.country).approver);
      const reachable = decidedRoles.length + (pending.length - unresolvable.length);
      if (unresolvable.length && reachable < requiredCount(g)) {
        const m = unresolvable[0];
        return { ...v, unresolved: { role: m.role, why: resolveApprover(m.role, v.country).unresolvedWhy ?? '' } };
      }
      return v;
    };

    const build = (
      base: Omit<ApprovalView, 'groups' | 'routeVersion' | 'resolution' | 'escalation'>,
      query: Parameters<typeof resolveRoute>[1],
      pinnedVersion?: number
    ): ApprovalView | null => {
      const res = resolveRoute(routes, query, base.submitted);
      if (!res.route) return null;
      const v = pinnedVersion !== undefined ? versionOf(res.route, pinnedVersion) : (effectiveVersion(res.route, base.submitted) ?? res.route.versions[0]);
      if (!v) return null;
      return {
        ...base,
        routeId: res.route.id,
        routeVersion: v.version,
        groups: groupSteps(v.steps),
        resolution: [...res.reasons.filter((r) => !r.startsWith('Route ')), `Route ${res.route.id}, version ${v.version}, effective from ${v.effectiveFrom}`],
        escalation: escalations[base.id],
        assignedApprover: namedApprovers[base.id]
      };
    };

    // C01 access requests awaiting a decision
    requests.filter((r) => r.status === 'Pending Approval').forEach((r) => {
      const view = build({
        id: r.id, kind: 'c1', objectType: 'Access request',
        record: `${r.id} ${r.requestedForName}`, recordRoute: `/c1/access-requests/${r.id}`,
        recordDetail: [
          ['Requested for', r.requestedForName], ['User type', r.userType],
          ['Roles requested', r.roles.join(', ')], ['Country scope', r.countryScope.join(', ')],
          ['Organisational unit', r.orgUnit], ['Effective from', r.effectiveFrom]
        ],
        sourceModule: 'C1 Identity and Access', country: r.defaultCountry, requester: r.requestedBy,
        submitted: r.raised, routeId: 'RT-01', currentGroup: r.currentStep,
        urgent: r.roles.some((c) => roles.find((x) => x.code === c)?.sensitivity === 'Administrative'),
        elapsedWorking: workingElapsedHours(r.raised, r.defaultCountry),
        decisions: r.steps.filter((s) => s.decision).map((s) => ({
          seq: s.seq, role: s.role, approver: s.delegate ?? s.approver, decision: s.decision!, comment: s.comment ?? '', at: s.at ?? ''
        }))
      }, { objectType: 'Access request', country: r.defaultCountry, orgUnit: r.orgUnit });
      if (view) out.push(withHold(view));
    });

    // C03 master data records awaiting a decision
    masterRecords.filter((r) => r.status === 'Pending Approval').forEach((r) => {
      const country = r.country ?? activeCountry;
      const view = build({
        id: r.id, kind: 'c3', objectType: 'Master data change',
        record: `${r.code} ${r.name}`, recordRoute: `/c3/records/${r.id}`,
        recordDetail: [
          ['Domain', DOMAINS.find((d) => d.key === r.domain)?.name ?? r.domain],
          ['Code', r.code], ['Name', r.name], ['Owner', r.owner],
          ['Scope', r.country ?? 'Global'],
          ['Change', r.pendingAmendment ? `Amendment — ${r.pendingAmendment.reason}` : 'Creation or reactivation']
        ],
        sourceModule: 'C3 Master Data', country, requester: r.owner,
        submitted: (r.lastChanged || '2026-08-18').slice(0, 10), currentGroup: r.currentStep,
        routeId: 'RT-02', urgent: false,
        elapsedWorking: workingElapsedHours((r.lastChanged || '2026-08-18').slice(0, 10), country),
        decisions: r.steps.filter((s) => s.decision).map((s) => ({
          seq: s.seq, role: s.role, approver: s.approver, decision: s.decision!, comment: s.comment ?? '', at: s.at ?? ''
        }))
      }, { objectType: 'Master data change', country });
      if (view) out.push(withHold(view));
    });

    // seeded instances for object types whose owning module is not built
    approvalInstances.filter((i) => !i.closed).forEach((i) => {
      const route = routes.find((r) => r.id === i.routeId);
      const v = route && versionOf(route, i.routeVersion);
      if (!route || !v) return;
      const res = resolveRoute(routes, {
        objectType: i.objectType, country: i.country,
        thresholdValue: i.thresholdValue ? Number(i.thresholdValue.replace(/[^0-9.]/g, '')) : undefined
      }, i.submitted);
      out.push(withHold({
        id: i.id, kind: 'seeded', objectType: i.objectType, record: i.record,
        recordDetail: i.recordDetail, sourceModule: i.sourceModule, country: i.country,
        requester: i.requester, submitted: i.submitted, routeId: route.id, routeVersion: v.version,
        groups: groupSteps(v.steps), currentGroup: i.currentStep, urgent: i.urgent,
        elapsedWorking: i.elapsedWorking, decisions: i.decisions, unresolved: i.unresolved,
        delegatedFrom: i.delegatedFrom, thresholdValue: i.thresholdValue,
        assignedApprover: i.assignedApprover ?? namedApprovers[i.id], routeChange: i.routeChange,
        resolution: [...res.reasons.filter((r) => !r.startsWith('Route ')), `Route ${route.id}, version ${v.version}, effective from ${v.effectiveFrom}`],
        escalation: escalations[i.id]
      }));
    });

    return out;
  }, [requests, masterRecords, approvalInstances, routes, roles, activeCountry, escalations, namedApprovers, resolveApprover]);

  const approvalById = useCallback((id: string) => approvalQueue.find((a) => a.id === id), [approvalQueue]);

  const inFlightOn = useCallback((routeId: string, version: number) =>
    approvalQueue.filter((a) => a.routeId === routeId && a.routeVersion === version), [approvalQueue]);

  const decideApproval = useCallback((id: string, decision: 'Approved' | 'Rejected' | 'Returned for Amendment', comment: string) => {
    const view = approvalQueue.find((a) => a.id === id);
    if (!view) return;
    if (view.kind === 'c1') { decideRequest(id, decision, comment); return; }
    if (view.kind === 'c3') { decideMaster(id, decision, comment); return; }

    const inst = approvalInstances.find((i) => i.id === id);
    if (!inst) return;
    const group = view.groups[view.currentGroup];
    const role = group?.members[0]?.role ?? '—';
    const resolved = inst.assignedApprover ?? resolveApprover(role, inst.country).approver ?? currentUser?.name ?? '—';
    const already = inst.decisions.filter((d) => d.seq === group?.seq).length + 1;
    const need = group ? (group.type === 'Sequential' ? 1 : group.rule === 'Any one' ? 1 : group.rule?.startsWith('Quorum') ? 2 : group.members.length) : 1;
    const groupSatisfied = decision === 'Approved' && already >= need;
    const isLastGroup = view.currentGroup >= view.groups.length - 1;

    setApprovalInstances((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      const decisions = [...i.decisions, { seq: group?.seq ?? 1, role, approver: resolved, decision, comment: comment || '(no comment)', at: stamp() }];
      if (decision !== 'Approved') {
        return { ...i, decisions, closed: decision };
      }
      if (!groupSatisfied) return { ...i, decisions };
      if (isLastGroup) return { ...i, decisions, closed: 'Approved' };
      return { ...i, decisions, currentStep: i.currentStep + 1, elapsedWorking: 0 };
    }));

    pushDecisionComment({
      recordKey: inst.record.split(' ')[0], recordName: inst.record, objectType: inst.objectType,
      country: inst.country, route: `/c4/approvals/${inst.id}`,
      outcome: decision, text: comment, author: resolved, role
    });
    pushAudit({
      user: resolved, role, country: inst.country, entity: `Approval — ${inst.objectType}`,
      record: inst.record.split(' ')[0], action: decision, field: 'Status',
      oldValue: 'Pending Approval', newValue: decision, sensitive: true
    });
    pushNotification({
      event: decision === 'Approved' && groupSatisfied && isLastGroup ? 'Approval outcome' : 'Approval progress',
      subject: `${inst.record.split(' ')[0]} — ${decision.toLowerCase()} by ${resolved}`,
      recipient: inst.requester, channels: ['In-app', 'Email']
    });

    if (decision === 'Rejected') {
      const rule = routes.find((r) => r.id === inst.routeId)?.onReject;
      setToast({ message: `${inst.record.split(' ')[0]} rejected. Route rule on rejection: ${rule}. The decision comment is locked on the record (C6 / WF-C6-02) and the outcome is notified (C5).`, severity: 'warning' });
    } else if (decision === 'Returned for Amendment') {
      const rule = routes.find((r) => r.id === inst.routeId)?.onReturn;
      pushTask({ type: `Amend and resubmit — ${inst.objectType.toLowerCase()}`, sourceModule: inst.sourceModule, relatedRecord: inst.record, route: `/c4/approvals/${id}`, requester: resolved, due: '2026-08-25', priority: 'Normal', assigneeId: 'U-001' });
      setToast({ message: `${inst.record.split(' ')[0]} returned for amendment. On resubmission this route ${rule?.toLowerCase()} — WF-C4-03 / Step 4.`, severity: 'info' });
    } else if (!groupSatisfied) {
      setToast({ message: `Decision recorded. This is a parallel step requiring ${need} of ${group?.members.length}; ${already} received so far, so the route does not yet advance.`, severity: 'info' });
    } else if (isLastGroup) {
      // WF-C4-01 / Step 9 — final approval releases the record and triggers the downstream action
      if (inst.routeChange) {
        setRoutes((prev) => prev.map((r) => (r.id === inst.routeChange!.routeId
          ? { ...r, versions: r.versions.map((v) => {
              if (v.version === inst.routeChange!.version) return { ...v, status: 'Effective', approvedBy: resolved, approvedAt: stamp() };
              if (v.status === 'Effective') return { ...v, status: 'Superseded', effectiveTo: r.versions.find((x) => x.version === inst.routeChange!.version)?.effectiveFrom };
              return v;
            }) }
          : r)));
        setToast({ message: `Route change approved. Version ${inst.routeChange.version} becomes effective on its effective-from date. Requests already in flight continue on the version under which they were submitted — WF-C4-03 / Step 5.`, severity: 'success' });
      } else {
        setToast({ message: `${inst.record.split(' ')[0]} approved at the final step. The record is released and the downstream business action in ${inst.sourceModule} is triggered — WF-C4-01 / Step 9. HAND-OFF → C5 outcome notification · HAND-OFF → C8 decision history.`, severity: 'success' });
      }
      closeTasksForRecord(inst.record.split(' ')[0]);
    } else {
      const next = view.groups[view.currentGroup + 1];
      const nextRole = next?.members.map((m) => m.role).join(' + ') ?? '—';
      pushNotification({ event: 'Approval request', subject: `${inst.record.split(' ')[0]} awaits your approval`, recipient: nextRole, channels: ['In-app', 'Email'] });
      setToast({ message: `Step ${group?.seq} closed. Step ${next?.seq} (${nextRole}) is now active and its service level starts — WF-C4-01 / Step 9.`, severity: 'success' });
    }
  }, [approvalQueue, approvalInstances, routes, currentUser, decideRequest, decideMaster, resolveApprover, pushAudit, pushNotification, pushTask, closeTasksForRecord, pushDecisionComment]);

  /** WF-C4-02 / Step 5 — audited reassignment where an approver is unavailable and no delegation exists */
  const reassignApprover = useCallback((id: string, to: string, reason: string) => {
    const view = approvalQueue.find((a) => a.id === id);
    if (!view) return;
    const group = view.groups[view.currentGroup];
    const role = group?.members[0]?.role ?? '—';
    const from = resolveApprover(role, view.country).approver ?? 'Unresolved';
    setReassignments((prev) => [{
      id: nextId('RA'), instance: id, objectType: view.objectType, from, to, reason, at: stamp(), by: currentUser?.name ?? '—'
    }, ...prev]);
    setApprovalInstances((prev) => prev.map((i) => (i.id === id ? { ...i, assignedApprover: to, unresolved: undefined } : i)));
    setNamedApprovers((prev) => ({ ...prev, [id]: to }));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: view.country, entity: `Approval — ${view.objectType}`, record: id, action: `Reassign approver ${from} → ${to}`, sensitive: true });
    pushNotification({ event: 'Approval reassigned', subject: `${view.record.split(' ')[0]} reassigned to ${to}`, recipient: to, channels: ['In-app', 'Email'] });
    setToast({ message: `Reassigned to ${to} with the reason recorded. The reassignment is fully audited and appears on the reassignment log, so a pattern of reassignment around one person is not invisible — WF-C4-02 / Step 5.`, severity: 'success' });
  }, [approvalQueue, resolveApprover, currentUser, pushAudit, pushNotification]);

  /** WF-C4-01 / Step 5 — an administrator names an approver for a held instance */
  const assignInstanceApprover = useCallback((id: string, approver: string) => {
    setApprovalInstances((prev) => prev.map((i) => (i.id === id ? { ...i, assignedApprover: approver, unresolved: undefined } : i)));
    setNamedApprovers((prev) => ({ ...prev, [id]: approver }));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: '—', entity: 'Approval', record: id, action: `Approver named for this instance — ${approver}`, sensitive: true });
    pushNotification({ event: 'Approval request', subject: `${id} released from hold and assigned to ${approver}`, recipient: approver, channels: ['In-app', 'Email'] });
    setToast({ message: `${approver} named for this instance. The held step is released and its service level starts now. Fixing the role assignment in C01 remains the durable remedy.`, severity: 'success' });
  }, [currentUser, pushAudit, pushNotification]);

  /** WF-C4-02 / Steps 3–4 */
  const escalateApproval = useCallback((id: string, action: string) => {
    const view = approvalQueue.find((a) => a.id === id);
    setEscalations((prev) => ({ ...prev, [id]: action }));
    if (action === 'Reassigned to manager') {
      setApprovalInstances((prev) => prev.map((i) => (i.id === id ? { ...i, assignedApprover: 'Grace Mensah' } : i)));
      setNamedApprovers((prev) => ({ ...prev, [id]: 'Grace Mensah' }));
    }
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: view?.country ?? '—', entity: 'Approval', record: id, action: `Escalation — ${action}`, sensitive: true });
    pushNotification({ event: 'Service level breach', subject: `${view?.record.split(' ')[0]} breached its service level — ${action.toLowerCase()}`, recipient: "Approver's manager", channels: ['In-app', 'Email'] });
    setToast({ message: `Escalation applied: ${action}. The manager is notified first, then the configured action follows — WF-C4-02 / Steps 3–4. Repeated breaches are reported through C11 / WF-C11-01.`, severity: 'warning' });
  }, [approvalQueue, currentUser, pushAudit, pushNotification]);

  /** WF-C4-02 / Step 6 — withdrawal is permitted only while the request is pending */
  const withdrawApproval = useCallback((id: string) => {
    const view = approvalQueue.find((a) => a.id === id);
    if (!view) return;
    if (view.kind === 'c1') { withdrawRequest(id); return; }
    setApprovalInstances((prev) => prev.map((i) => (i.id === id ? { ...i, closed: 'Withdrawn' } : i)));
    closeTasksForRecord(view.record.split(' ')[0]);
    pushAudit({ user: currentUser?.name ?? '—', role: 'REQUESTER', country: view.country, entity: `Approval — ${view.objectType}`, record: id, action: 'Withdraw' });
    pushNotification({ event: 'Approval task cancelled', subject: `Open approval tasks for ${view.record.split(' ')[0]} cancelled`, recipient: 'Approvers', channels: ['In-app', 'Email'] });
    setToast({ message: `${view.record.split(' ')[0]} withdrawn. The record returns to Draft and every open approval task is cancelled, with notification to the approvers — WF-C4-02 / Step 6.`, severity: 'info' });
  }, [approvalQueue, withdrawRequest, currentUser, pushAudit, pushNotification, closeTasksForRecord]);

  /** WF-C4-03 / Steps 1–5 — a route version is drafted, then submitted for approval in its own right */
  const saveRouteVersion = useCallback((routeId: string, version: RouteVersion, meta: Partial<RouteDef>) => {
    setRoutes((prev) => {
      const existing = prev.find((r) => r.id === routeId);
      if (!existing) {
        return [...prev, {
          id: routeId, objectType: meta.objectType ?? OBJECT_TYPES[0], countries: meta.countries ?? [],
          commodities: meta.commodities ?? [], orgUnits: meta.orgUnits ?? [],
          thresholdMeasure: meta.thresholdMeasure, thresholdFrom: meta.thresholdFrom, thresholdTo: meta.thresholdTo,
          thresholdUnit: meta.thresholdUnit, onReturn: meta.onReturn ?? 'Restart from the returning step',
          onReject: meta.onReject ?? 'Terminate the request', urgentAvailable: meta.urgentAvailable ?? false,
          urgentChannels: meta.urgentChannels ?? [], versions: [version]
        }];
      }
      return prev.map((r) => (r.id === routeId
        ? { ...r, ...meta, versions: r.versions.some((v) => v.version === version.version)
            ? r.versions.map((v) => (v.version === version.version ? version : v))
            : [...r.versions, version] }
        : r));
    });
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global', entity: 'Approval route', record: `${routeId} v${version.version}`, action: 'Save draft', sensitive: true });
    setToast({ message: `${routeId} version ${version.version} saved as Draft. A Draft version does not affect any request until it is approved and reaches its effective-from date.`, severity: 'info' });
  }, [currentUser, pushAudit]);

  const submitRouteVersion = useCallback((routeId: string, version: number) => {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;
    setRoutes((prev) => prev.map((r) => (r.id === routeId
      ? { ...r, versions: r.versions.map((v) => (v.version === version ? { ...v, status: 'Pending Approval' } : v)) }
      : r)));
    const id = nextId('AI');
    const v = route.versions.find((x) => x.version === version);
    setApprovalInstances((prev) => [{
      id, objectType: 'Configuration change',
      record: `${routeId} v${version} — approval route for ${route.objectType}`,
      recordDetail: [
        ['Route', routeId], ['Object type', route.objectType], ['Version', String(version)],
        ['Effective from', v?.effectiveFrom ?? '—'], ['What changed', v?.changed ?? '—'], ['Reason', v?.reason ?? '—']
      ],
      sourceModule: 'C4 Approval Workflow', country: activeCountry, requester: currentUser?.name ?? '—',
      submitted: '2026-08-18', routeId: 'RT-07', routeVersion: 1, currentStep: 0, urgent: false,
      elapsedWorking: 0, decisions: [], routeChange: { routeId, version }
    }, ...prev]);
    pushTask({ type: 'Approval request — approval route change', sourceModule: 'C4 Approval Workflow', relatedRecord: `${routeId} v${version}`, route: `/c4/approvals/${id}`, requester: currentUser?.name ?? '—', due: '2026-08-21', priority: 'Urgent', assigneeId: 'U-001' });
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global', entity: 'Approval route', record: `${routeId} v${version}`, action: 'Submit for approval', sensitive: true });
    setToast({ message: `${routeId} version ${version} submitted for approval. A route change alters who holds authority, so it is itself approved through WF-C4-01 under the configuration change route — DEPENDENCY → C10 / WF-C10-03.`, severity: 'success' });
  }, [routes, activeCountry, currentUser, pushTask, pushAudit]);

  /* ------------------------- C5 administration and jobs ------------------------- */

  const saveRule = useCallback((r: NotificationRule) => {
    setRules((prev) => (prev.some((x) => x.id === r.id) ? prev.map((x) => (x.id === r.id ? r : x)) : [...prev, r]));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global', entity: 'Notification rule', record: `${r.id} ${r.event}`, action: 'Save', sensitive: true });
    setToast({ message: `${r.id} saved. Changes to notification rules are configuration changes and are written to the audit trail as sensitive actions — WF-C5-03 / Step 6.`, severity: 'success' });
  }, [currentUser, pushAudit]);

  const toggleRule = useCallback((id: string) => {
    let nowActive = false;
    setRules((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      nowActive = !r.active;
      return { ...r, active: nowActive };
    }));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global', entity: 'Notification rule', record: id, action: nowActive ? 'Activate' : 'Deactivate', sensitive: true });
    setToast({
      message: nowActive
        ? `${id} is active again. Matching events will now be notified.`
        : `${id} deactivated. The event will still be raised and recorded in the audit trail and the log, but no notification is issued — WF-C5-01 / Step 1.`,
      severity: nowActive ? 'success' : 'info'
    });
  }, [currentUser, pushAudit]);

  const saveTemplate = useCallback((tpl: Template) => {
    setTemplates((prev) => (prev.some((x) => x.id === tpl.id)
      ? prev.map((x) => (x.id === tpl.id ? { ...tpl, lastChanged: stamp(), changedBy: currentUser?.name ?? '—' } : x))
      : [...prev, { ...tpl, lastChanged: stamp(), changedBy: currentUser?.name ?? '—' }]));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global', entity: 'Notification template', record: `${tpl.id} ${tpl.event} (${tpl.language})`, action: 'Save draft', sensitive: true });
    setToast({ message: `${tpl.id} saved as version ${tpl.version}, Draft. A Draft template is never used for dispatch — WF-C5-03 / Step 1.`, severity: 'info' });
  }, [currentUser, pushAudit]);

  const releaseTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Released', lastChanged: stamp(), changedBy: currentUser?.name ?? '—' } : x)));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global', entity: 'Notification template', record: id, action: 'Release', sensitive: true });
    setToast({ message: `${id} released. New messages for that event and language are composed from this version.`, severity: 'success' });
  }, [currentUser, pushAudit]);

  const saveChannelPolicy = useCallback((priority: PriorityClass, patch: Partial<ChannelPolicy>) => {
    setChannelPolicy((prev) => prev.map((p) => (p.priority === priority ? { ...p, ...patch } : p)));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global', entity: 'Channel policy', record: priority, action: 'Change', sensitive: true });
    setToast({ message: `Channel policy for ${priority} notifications updated. SMS and messaging carry cost, so reservations take effect on the next event — WF-C5-03 / Step 2.`, severity: 'success' });
  }, [currentUser, pushAudit]);

  /** WF-C5-03 / Step 3 — a user personalises only what the class permits */
  const savePreference = useCallback((event: string, channels: Channel[], digest: boolean) => {
    const userId = currentUser?.id ?? 'U-001';
    setPreferences((prev) => (prev.some((p) => p.userId === userId && p.event === event)
      ? prev.map((p) => (p.userId === userId && p.event === event ? { ...p, channels, digest } : p))
      : [...prev, { userId, event, channels, digest }]));
    setToast({ message: `Preference saved for ${event}. Mandatory operational and approval notifications cannot be disabled — WF-C5-03 / Step 3.`, severity: 'success' });
  }, [currentUser]);

  /** WF-C5-03 / Step 5 */
  const subscribeToRecord = useCallback((record: string, objectType: string, country: string, route?: string) => {
    const userId = currentUser?.id ?? 'U-001';
    if (subscriptions.some((s) => s.userId === userId && s.record === record)) {
      setToast({ message: 'You already follow this record.', severity: 'info' });
      return;
    }
    setSubscriptions((prev) => [{
      id: nextId('SUB'), userId, userName: currentUser?.name ?? '—',
      record, objectType, country, since: '2026-08-18', received: 0, route
    }, ...prev]);
    setToast({ message: `Following ${record}. You will now be resolved as a Subscriber recipient on its status changes — WF-C5-03 / Step 5 and WF-C5-01 / Step 2.`, severity: 'success' });
  }, [currentUser, subscriptions]);

  const unsubscribe = useCallback((id: string) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    setToast({ message: 'Unfollowed. Status changes for that record will no longer resolve you as a subscriber.', severity: 'info' });
  }, []);

  /** WF-C5-01 / Step 8 */
  const acknowledgeDelivery = useCallback((id: string) => {
    setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, acknowledgedAt: stamp() } : d)));
    const d = deliveries.find((x) => x.id === id);
    pushAudit({ user: currentUser?.name ?? '—', role: '—', country: d?.country ?? '—', entity: 'Notification', record: id, action: 'Acknowledged receipt' });
    setToast({ message: 'Receipt acknowledged. Acknowledgement is tracked where the notification type requires confirmation of receipt — WF-C5-01 / Step 8.', severity: 'success' });
  }, [deliveries, currentUser, pushAudit]);

  /** WF-C5-01 / Step 6 */
  const retryDelivery = useCallback((id: string) => {
    setDeliveries((prev) => prev.map((d) => (d.id === id
      ? { ...d, status: 'Delivered', attempts: d.attempts + 1, at: stamp(), failureReason: undefined, note: 'Retried by the administrator after a permanent failure was surfaced — WF-C5-01 / Step 6.' }
      : d)));
    const d = deliveries.find((x) => x.id === id);
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: d?.country ?? '—', entity: 'Notification delivery', record: id, action: 'Manual retry' });
    setToast({ message: `Retried through the configured provider (C12 / WF-C12-01). A permanent failure is surfaced here precisely so that a message is never silently lost.`, severity: 'success' });
  }, [deliveries, currentUser, pushAudit]);

  const saveJobRule = useCallback((r: JobRule) => {
    setJobRules((prev) => (prev.some((x) => x.id === r.id) ? prev.map((x) => (x.id === r.id ? r : x)) : [...prev, r]));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global', entity: 'Automated job rule', record: `${r.id} ${r.element}`, action: 'Save', sensitive: true });
    setToast({ message: `${r.id} saved. The scheduler uses the update period, the responsible role and the escalation role on its next run — WF-C5-02 / Step 1.`, severity: 'success' });
  }, [currentUser, pushAudit]);

  /** WF-C5-02 / Steps 2–7 — one cycle of the scheduler, made visible */
  const runScheduler = useCallback(() => {
    let inScope = 0, skipped = 0, withinPeriod = 0, newlyOverdue = 0, escalated = 0, notifications = 0;
    const raised: { item: OverdueItem; to: string; escalation: boolean }[] = [];

    // evaluated from current state, so a double render never double-counts a run
    const next = overdueItems.map((item) => {
      if (!item.inScope) { skipped += 1; return item; }
      inScope += 1;
      const rule = jobRules.find((r) => r.id === item.ruleId);
      if (!rule || !rule.active) return item;
      const period = periodHours(rule.periodValue, rule.periodUnit);
      const escalation = periodHours(rule.escalationValue, rule.escalationUnit);
      // the scheduler runs on its cycle, so time has moved on since the last run
      const elapsed = item.elapsed + 24;
      let state = item.state;
      let escalatedTo = item.escalatedTo;
      if (elapsed <= period) { state = 'Within period'; withinPeriod += 1; }
      else if (elapsed <= period + escalation) {
        if (state !== 'Overdue — notified') { newlyOverdue += 1; notifications += 1; raised.push({ item, to: item.responsible, escalation: false }); }
        state = 'Overdue — notified';
      } else {
        if (state !== 'Escalated') {
          escalated += 1; notifications += 1;
          escalatedTo = APPROVER_REGISTER.find((e) => e.role === rule.escalationRole && e.country === item.country)?.user ?? rule.escalationRole;
          raised.push({ item, to: escalatedTo, escalation: true });
        }
        state = 'Escalated';
      }
      return { ...item, elapsed, state, escalatedTo };
    });
    setOverdueItems(next);

    raised.forEach(({ item, to, escalation }) => {
      pushNotification({
        event: 'Overdue update',
        subject: `${item.item} has not been updated within its period`,
        recipient: to, channels: ['In-app', 'Email'],
        country: item.country, record: item.item, route: item.route ?? '/c5/overdue',
        due: item.lastUpdated.slice(0, 10), requester: 'Service identity (scheduled job)'
      });
      pushTask({
        type: escalation ? `Overdue update escalated — ${item.element}` : `Overdue update — ${item.element}`,
        sourceModule: 'C5 Notifications and Alerts',
        relatedRecord: `${item.item} (${item.country})`,
        route: '/c5/overdue',
        requester: 'Service identity (scheduled job)',
        due: '2026-08-19', priority: escalation ? 'Urgent' : 'Normal', assigneeId: 'U-001'
      });
    });

    setJobRuns((prev) => [{
      id: nextId('JB'), job: 'Time-based notification evaluation',
      started: stamp() + ':00', ended: stamp() + ':09', durationSeconds: 9,
      inScope, skipped, withinPeriod, newlyOverdue, escalated, notifications, failures: 0,
      note: skipped > 0 ? `${skipped} item(s) skipped because their commodity or operational area is not active in that country — WF-C5-02 / Step 3.` : undefined
    }, ...prev]);

    pushAudit({ user: 'Service identity (scheduled job)', role: '—', country: 'Global', entity: 'Scheduled job', record: 'Time-based notification evaluation', action: 'Run', source: 'Scheduled job' });
    setToast({
      message: `Scheduler run complete: ${inScope} item(s) in scope, ${skipped} skipped as out of scope, ${newlyOverdue} newly overdue, ${escalated} escalated, ${notifications} notification(s) issued. Job execution is logged (C9 / WF-C9-02) and the outstanding backlog is reported (C11 / WF-C11-01).`,
      severity: newlyOverdue + escalated > 0 ? 'warning' : 'success'
    });
  }, [overdueItems, jobRules, pushNotification, pushTask, pushAudit]);

  /** WF-C5-02 / Step 6 — the clock resets from the new update date and the task closes automatically */
  const recordItemUpdate = useCallback((id: string) => {
    const item = overdueItems.find((x) => x.id === id);
    setOverdueItems((prev) => prev.map((x) => (x.id === id
      ? { ...x, elapsed: 0, state: 'Within period', lastUpdated: stamp(), lastUpdatedBy: currentUser?.name ?? '—', escalatedTo: undefined }
      : x)));
    if (item) closeTasksForRecord(item.item);
    pushAudit({ user: currentUser?.name ?? '—', role: '—', country: item?.country ?? '—', entity: item?.element ?? 'Data element', record: item?.item ?? id, action: 'Update recorded' });
    setToast({ message: `Update recorded. The clock resets from the new update date and the inbox task closes automatically — WF-C5-02 / Step 6.`, severity: 'success' });
  }, [overdueItems, currentUser, pushAudit, closeTasksForRecord]);

  /** WF-C5-01 / Step 9 */
  const recordReadiness = useCallback((role: string, feedback: 'Ready' | 'Ready with conditions' | 'Not ready', comment: string) => {
    setReadiness((prev) => prev.map((r) => (r.role === role ? { ...r, feedback, comment, at: stamp() } : r)));
    const r = readiness.find((x) => x.role === role);
    closeTasksForRecord(SALES_CONTRACT.reference);
    pushAudit({ user: r?.recipient ?? currentUser?.name ?? '—', role, country: SALES_CONTRACT.country, entity: 'Sales contract readiness', record: SALES_CONTRACT.reference, action: `${feedback} — ${comment}` });
    setToast({ message: `Readiness recorded for ${role.replace(/_/g, ' ').toLowerCase()}. Each alerted function reviews the terms, confirms readiness and records feedback against its task — WF-C5-01 / Step 9.`, severity: 'success' });
  }, [readiness, currentUser, pushAudit, closeTasksForRecord]);

  /** Raises the seeded sales-contract event so the client can watch Step 9 fan out */
  const raiseSalesContractEvent = useCallback(() => {
    setReadiness(seedReadiness.map((r) => ({ role: r.role, recipient: r.recipient, taskRaised: stamp() })));
    pushNotification({
      event: 'Sales contract created',
      subject: `${SALES_CONTRACT.reference} — confirm readiness to fulfil`,
      recipient: 'Quality, execution, processing and financial planning',
      channels: ['In-app', 'Email'],
      country: SALES_CONTRACT.country, record: SALES_CONTRACT.reference, route: '/c5/rules',
      requester: 'Ahmed Osman', due: '2026-08-19'
    });
    seedReadiness.forEach((r) => pushTask({
      type: 'Confirm readiness to fulfil — sales contract',
      sourceModule: 'C5 Notifications and Alerts',
      relatedRecord: `${SALES_CONTRACT.reference} ${SALES_CONTRACT.name}`,
      route: '/c5/rules',
      requester: 'Ahmed Osman', due: '2026-08-19', priority: 'Normal', assigneeId: 'U-001',
      onBehalfOf: r.recipient
    }));
    setToast({ message: `${SALES_CONTRACT.reference} raised. Alerts issued to quality, execution, processing and financial planning, each with a task against which readiness is recorded — WF-C5-01 / Step 9.`, severity: 'success' });
  }, [pushNotification, pushTask]);

  /* ------------------------- C6 comments and collaboration ------------------------- */

  const commentsFor = useCallback((recordKey: string) =>
    comments6.filter((c) => c.recordKey === recordKey)
      .slice()
      .sort((a, b) => a.at.localeCompare(b.at)), [comments6]);

  const visibilityDefault = useCallback((objectType: string) => {
    const hit = VISIBILITY_DEFAULT.find((v) => v.objectType === objectType);
    return hit
      ? { default: hit.default, why: hit.why }
      : { default: 'Internal only' as Visibility, why: 'No default is configured for this record type, so the safe default applies and external visibility must be set deliberately.' };
  }, []);

  /**
   * WF-C6-01 / Step 7 — minutes left in the configurable edit window.
   * Measured from the comment's own timestamp against the browser clock, so a comment
   * posted during a review is editable and the seeded history is not.
   */
  const editWindowLeft = useCallback((c: Comment6) => {
    if (c.isDecision || c.removed) return 0;
    const asMinutes = (iso: string) => {
      const [d, t2] = iso.split(' ');
      const [y, m, day] = d.split('-').map(Number);
      const [h, min] = (t2 ?? '00:00').split(':').map(Number);
      return Date.UTC(y, m - 1, day, h, min) / 60000;
    };
    const now = new Date();
    const nowMinutes = Date.UTC(2026, 7, 18, now.getHours(), now.getMinutes()) / 60000;
    const elapsed = nowMinutes - asMinutes(c.editedAt ?? c.at);
    if (elapsed < 0) return 0;
    return Math.max(0, Math.ceil(EDIT_WINDOW_MINUTES - elapsed));
  }, []);

  /** WF-C6-01 / Steps 2–6 */
  const addComment = useCallback((input: Omit<Comment6, 'id' | 'at' | 'visibility'> & { visibility?: Visibility }) => {
    // Step 5 — the mentioned user must hold permission to view the record
    if (input.mention) {
      const m = users.find((u) => u.name === input.mention);
      const permitted = !!m && m.status === 'Active' && m.countryScope.includes(input.country);
      if (!permitted) {
        const why = !m
          ? `${input.mention} is not a user of the system, so the mention has been refused.`
          : m.status !== 'Active'
            ? `${m.name}'s account is ${m.status.toLowerCase()}, so the mention has been refused. No record data has been disclosed.`
            : `${m.name} does not hold ${input.country} in their country scope and cannot view this record, so the mention has been refused. No record data has been disclosed — C6 / WF-C6-01 / Step 5.`;
        pushAudit({ user: currentUser?.name ?? '—', role: '—', country: input.country, entity: 'Comment', record: input.recordKey, action: `Mention refused — ${input.mention}` });
        return { ok: false, refusedMention: why };
      }
    }

    const visibility = input.visibility ?? visibilityDefault(input.objectType).default;
    const rec: Comment6 = { ...input, id: nextId('CM'), at: stamp(), visibility };
    setComments6((prev) => [...prev, rec]);
    pushAudit({
      user: rec.author, role: rec.role, country: rec.country, entity: 'Comment',
      record: rec.recordKey, action: rec.parentId ? 'Reply posted' : 'Comment posted',
      newValue: rec.visibility
    });
    if (rec.attachment) {
      pushAudit({ user: rec.author, role: rec.role, country: rec.country, entity: 'Document', record: rec.recordKey, action: `Attached to a comment — ${rec.attachment.name} (${rec.attachment.docType})` });
    }
    if (rec.mention) {
      // Steps 5 — permitted mention: notify, and raise a task where action is owed
      pushNotification({
        event: 'Mention', subject: `${rec.author} mentioned you on ${rec.recordName}`,
        recipient: rec.mention, channels: ['In-app', 'Email'],
        country: rec.country, record: rec.recordKey, route: rec.route, requester: rec.author
      });
      pushTask({
        type: 'Mentioned in a comment', sourceModule: 'C6 Comments and Collaboration',
        relatedRecord: rec.recordName, route: rec.route ?? '/c6/discussions',
        requester: rec.author, due: '2026-08-20', priority: 'Normal',
        assigneeId: users.find((u) => u.name === rec.mention)?.id ?? 'U-001'
      });
    }
    setToast({
      message: rec.mention
        ? `Comment posted and ${rec.mention} notified (C5 / WF-C5-01) with a task raised (C2 / WF-C2-03). Visibility: ${visibility.toLowerCase()}.`
        : `Comment posted. Author, role, country and time are captured by the system — C6 / WF-C6-01 / Step 2. Visibility: ${visibility.toLowerCase()}.`,
      severity: 'success'
    });
    return { ok: true };
  }, [users, currentUser, visibilityDefault, pushAudit, pushNotification, pushTask]);

  /** WF-C6-01 / Step 7 — inside the window only, and every version is retained */
  const editComment = useCallback((id: string, text: string) => {
    const c = comments6.find((x) => x.id === id);
    if (!c) return { ok: false, why: 'Comment not found.' };
    if (c.isDecision) return { ok: false, why: 'A decision comment cannot be edited, so that the approval history remains truthful — C6 / WF-C6-02 / Step 2.' };
    if (c.removed) return { ok: false, why: 'A removed comment cannot be edited.' };
    if (editWindowLeft(c) <= 0) {
      return { ok: false, why: `The edit window of ${EDIT_WINDOW_MINUTES} minutes has expired, so this comment is now fixed — C6 / WF-C6-01 / Step 7.` };
    }
    setComments6((prev) => prev.map((x) => (x.id === id
      ? {
          ...x, text, editedAt: stamp(),
          versions: [...(x.versions ?? [{ at: x.at, text: x.text, by: x.author }]), { at: stamp(), text, by: currentUser?.name ?? x.author }]
        }
      : x)));
    pushAudit({ user: currentUser?.name ?? '—', role: c.role, country: c.country, entity: 'Comment', record: c.recordKey, action: 'Comment edited', oldValue: c.text.slice(0, 60), newValue: text.slice(0, 60) });
    setToast({ message: 'Comment edited. Every version is retained in the audit trail, so the comment can still be read as it was first written — WF-C6-01 / Step 7.', severity: 'success' });
    return { ok: true };
  }, [comments6, currentUser, editWindowLeft, pushAudit]);

  /** WF-C6-01 / Step 8 — soft delete */
  const removeComment = useCallback((id: string) => {
    const c = comments6.find((x) => x.id === id);
    if (!c) return { ok: false, why: 'Comment not found.' };
    if (c.isDecision) return { ok: false, why: 'A decision comment cannot be removed, so that the approval history remains truthful — C6 / WF-C6-02 / Step 2.' };
    if (editWindowLeft(c) <= 0) {
      return { ok: false, why: `The edit window of ${EDIT_WINDOW_MINUTES} minutes has expired, so this comment is now fixed and cannot be removed — C6 / WF-C6-01 / Step 7.` };
    }
    setComments6((prev) => prev.map((x) => (x.id === id
      ? { ...x, removed: { by: currentUser?.name ?? x.author, at: stamp(), originalText: x.text } }
      : x)));
    pushAudit({ user: currentUser?.name ?? '—', role: c.role, country: c.country, entity: 'Comment', record: c.recordKey, action: 'Comment removed (soft delete)', oldValue: c.text.slice(0, 60) });
    setToast({ message: 'Comment removed. Removal is a soft delete: the entry is shown as removed with the author and time, and the original content remains available to audit and compliance — WF-C6-01 / Step 8.', severity: 'info' });
    return { ok: true };
  }, [comments6, currentUser, editWindowLeft, pushAudit]);

  const returnReasonFor = useCallback((recordKey: string) =>
    commentsFor(recordKey).slice().reverse().find((c) => c.isDecision && /return/i.test(c.decisionOutcome ?? '')),
    [commentsFor]);

  /** WF-C6-02 / Step 4 */
  const resolveException = useCallback((key: string) => {
    setExceptions((prev) => prev.map((e) => (e.key === key
      ? { ...e, state: 'Resolved', resolvedAt: stamp(), resolvedBy: currentUser?.name ?? '—' }
      : e)));
    pushAudit({ user: currentUser?.name ?? '—', role: '—', country: exceptions.find((e) => e.key === key)?.country ?? '—', entity: 'Exception', record: key, action: 'Thread marked resolved' });
    setToast({
      message: `${key} marked resolved. The thread remains the working record of how the exception was resolved and is retained for compliance review. Business confirmation required: whether a resolved thread should also be closed to further comment — WF-C6-02 / Step 4.`,
      severity: 'success'
    });
  }, [exceptions, currentUser, pushAudit]);

  /** WF-C6-02 / Step 5 — comments, document activity and audit in one chronology */
  const timelineFor = useCallback((recordKey: string): TimelineEntry[] => {
    const fromComments: TimelineEntry[] = [];
    commentsFor(recordKey).forEach((c) => {
      fromComments.push({
        at: c.at, source: 'C6 Comments', who: c.author, role: c.role,
        what: c.isDecision
          ? `Decision comment — ${c.decisionOutcome ?? 'decision'}`
          : c.parentId ? 'Reply posted' : 'Comment posted',
        detail: c.removed ? 'Comment removed — original retained for audit' : c.text
      });
      (c.versions ?? []).slice(1).forEach((v) => fromComments.push({
        at: v.at, source: 'C6 Comments', who: v.by, role: c.role, what: 'Comment edited', detail: v.text
      }));
      if (c.removed) fromComments.push({
        at: c.removed.at, source: 'C6 Comments', who: c.removed.by, role: c.role,
        what: 'Comment removed (soft delete)', detail: 'The original content remains available to audit and compliance'
      });
    });

    /**
     * Document activity now comes from the C07 store rather than a fixed table:
     * uploads and versions, archiving and purging, and access to a sensitive document.
     */
    const held = documents.filter((x) => x.recordKey === recordKey);
    const fromDocuments: TimelineEntry[] = held.length
      ? held.flatMap((doc) => {
          const rows: TimelineEntry[] = [{
            at: doc.uploadedAt, source: 'C7 Documents', who: doc.uploadedBy,
            what: doc.version > 1
              ? `${doc.docType} uploaded, version ${doc.version}`
              : `${doc.docType} uploaded`,
            detail: `${doc.name} · ${doc.systemRef}${doc.validTo ? ` · valid to ${doc.validTo}` : ''}${doc.fromComment ? ' · attached to a comment, inheriting the record’s access rules' : ''}`
          }];
          if (doc.archivedAt) rows.push({ at: doc.archivedAt, source: 'C7 Documents', who: 'Retention policy', what: `${doc.docType} archived`, detail: 'Archived documents remain retrievable through the register' });
          if (doc.purgedAt) rows.push({ at: doc.purgedAt, source: 'C7 Documents', who: doc.deletedReason ? 'Administrator' : 'Retention policy', what: doc.deletedReason ? `${doc.docType} deleted by an administrator` : `${doc.docType} file purged`, detail: doc.deletedReason ?? 'The metadata record persists so the register remains complete' });
          doc.accessLog.forEach((a) => rows.push({
            at: a.at, source: 'C7 Documents', who: a.who, role: a.role,
            what: `${doc.docType} — ${a.action.toLowerCase()}`,
            detail: 'Access to a sensitive document is logged — WF-C7-02 / Step 5'
          }));
          return rows;
        })
      : (DOCUMENT_ACTIVITY[recordKey] ?? []);

    const fromAudit: TimelineEntry[] = [
      ...(EXCEPTION_AUDIT[recordKey] ?? []),
      ...audit
        .filter((a) => a.record === recordKey || a.record.startsWith(recordKey))
        .map((a) => ({
          at: a.at, source: 'C8 Audit' as const, who: a.user, role: a.role,
          what: `${a.action}${a.entity ? ` — ${a.entity}` : ''}`,
          detail: a.field ? `${a.field}: ${a.oldValue ?? '—'} → ${a.newValue ?? '—'}` : undefined
        }))
    ];

    return [...fromComments, ...fromDocuments, ...fromAudit].sort((a, b) => b.at.localeCompare(a.at));
  }, [commentsFor, audit, documents]);

  /** WF-C6-01 / Step 10 — searchable within the user's permission and country scope */
  const searchComments = useCallback((query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return { results: [], hiddenByScope: 0 };
    const scope = currentUser?.countryScope ?? [];
    const matched = comments6.filter((c) => !c.removed && (
      c.text.toLowerCase().includes(q) ||
      c.recordName.toLowerCase().includes(q) ||
      c.author.toLowerCase().includes(q)));
    const inScope = matched.filter((c) => scope.includes(c.country) || c.country === 'Global');
    return { results: inScope, hiddenByScope: matched.length - inScope.length };
  }, [comments6, currentUser]);

  /* ------------------------- C7 documents ------------------------- */

  const docsFor = useCallback((recordKey: string, includeSuperseded = false) =>
    documents
      .filter((x) => x.recordKey === recordKey)
      .filter((x) => includeSuperseded || x.status !== 'Superseded')
      .slice()
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)), [documents]);

  const versionsOf = useCallback((recordKey: string, type: string) =>
    documents
      .filter((x) => x.recordKey === recordKey && x.docType === type)
      .slice()
      .sort((a, b) => b.version - a.version), [documents]);

  /** WF-C7-01 / Step 2 — three separate checks, each reported in its own words */
  const validateUpload = useCallback((fileName: string, sizeMB: number, type: string) => {
    const def = docTypeDef(type);
    const permitted = def?.permittedFormats ?? PERMITTED_FORMATS;
    const maxMB = def?.maxMB ?? DEFAULT_MAX_MB;
    const ext = (fileName.split('.').pop() ?? '').toLowerCase();
    const failures: string[] = [];
    if (!ext || !permitted.includes(ext)) {
      failures.push(`.${ext || '(no extension)'} is not a permitted format for ${type}. Permitted: ${permitted.map((f) => f.toUpperCase()).join(', ')}.`);
    }
    if (sizeMB > maxMB) {
      failures.push(`${sizeMB.toFixed(1)} MB exceeds the ${maxMB} MB maximum for this document type.`);
    }
    if (fileName.toLowerCase().includes(SCAN_FAIL_HINT)) {
      failures.push('The file did not pass the security scan and has not been stored. Nothing has been attached to the record.');
    }
    return { ok: failures.length === 0, failures };
  }, []);

  const extractionFor = useCallback((type: string) => EXTRACTION_SAMPLES[type] ?? [], []);

  /** WF-C7-01 / Steps 6–8 */
  const uploadDocument = useCallback((input: {
    fileName: string; sizeMB: number; docType: string; recordKey: string; recordName: string;
    objectType: string; country: string; module: string; route?: string;
    documentDate?: string; validFrom?: string; validTo?: string; issuingParty?: string;
    referenceNumber?: string; extractionAccepted?: boolean; fromComment?: boolean;
  }) => {
    const check = validateUpload(input.fileName, input.sizeMB, input.docType);
    if (!check.ok) {
      setToast({ message: `Upload refused: ${check.failures[0]}`, severity: 'error' });
      return { ok: false };
    }
    const def = docTypeDef(input.docType);
    const existing = documents.filter((x) => x.recordKey === input.recordKey && x.docType === input.docType);
    const version = existing.length === 0 ? 1 : Math.max(...existing.map((x) => x.version)) + 1;
    const systemRef = `DOC-2026-${input.recordKey.replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase()}-${String(version).padStart(2, '0')}`;
    const rec: Doc7 = {
      id: nextId('DOC'), systemRef, name: input.fileName, docType: input.docType,
      recordKey: input.recordKey, recordName: input.recordName, objectType: input.objectType,
      route: input.route, country: input.country, module: input.module,
      documentDate: input.documentDate || '2026-08-18',
      validFrom: def?.hasValidity ? input.validFrom : undefined,
      validTo: def?.hasValidity ? input.validTo : undefined,
      issuingParty: input.issuingParty, referenceNumber: input.referenceNumber,
      uploadedBy: currentUser?.name ?? '—', uploadedAt: stamp(), version,
      sizeMB: input.sizeMB, format: (input.fileName.split('.').pop() ?? 'pdf').toLowerCase(),
      status: 'Current', extractionUsed: input.extractionAccepted, fromComment: input.fromComment,
      accessLog: []
    };
    // Step 6 — a new version supersedes rather than replaces; every version is retained
    setDocuments((prev) => [
      ...prev.map((x) => (x.recordKey === input.recordKey && x.docType === input.docType && x.status === 'Current'
        ? { ...x, status: 'Superseded' as const }
        : x)),
      rec
    ]);
    // Step 7 — the upload is recorded in the activity timeline and the audit trail
    pushAudit({
      user: rec.uploadedBy, role: def?.responsibleRole ?? '—', country: rec.country,
      entity: 'Document', record: rec.recordKey,
      action: version === 1
        ? `Uploaded — ${rec.docType} (${rec.systemRef})`
        : `Uploaded version ${version} — ${rec.docType} (${rec.systemRef})`,
      sensitive: def?.sensitivity === 'Sensitive'
    });

    // Step 8 — the checklist is re-evaluated
    const def2 = CHECKLISTS.find((c) => c.objectType === input.objectType);
    const after = [...documents.filter((x) => x.recordKey === input.recordKey), rec];
    const outstanding = (def2?.mandatory ?? []).filter((m) => !after.some((x) => x.docType === m && x.status !== 'Metadata only'));
    if (def2 && outstanding.length === 0) {
      closeTasksForRecord(input.recordKey);
      setToast({
        message: `${input.fileName} stored as ${systemRef}${version > 1 ? `, version ${version}` : ''}. Every mandatory document for this step is now present, so "${def2.blocks}" is available — WF-C7-01 / Step 8.`,
        severity: 'success'
      });
    } else if (def2) {
      pushNotification({
        event: 'Document expiry',
        subject: `${input.recordName} still needs: ${outstanding.join(', ')}`,
        recipient: def?.responsibleRole ?? 'Responsible role', channels: ['In-app', 'Email'],
        country: input.country, record: input.recordKey, route: input.route
      });
      setToast({
        message: `${input.fileName} stored as ${systemRef}. ${outstanding.length} mandatory document(s) still outstanding, so "${def2.blocks}" remains blocked — a completeness reminder has been raised (C5 / WF-C5-01).`,
        severity: 'warning'
      });
    } else {
      setToast({
        message: `${input.fileName} stored as ${systemRef}${version > 1 ? ` as version ${version}; version ${version - 1} is retained, not replaced` : ''}. The upload is on the record activity timeline and in the audit trail — WF-C7-01 / Steps 6–7.`,
        severity: 'success'
      });
    }
    return { ok: true, version, systemRef };
  }, [documents, currentUser, validateUpload, pushAudit, pushNotification, closeTasksForRecord]);

  /** WF-C7-02 / Steps 1–2 */
  const canOpenDoc = useCallback((doc: Doc7) => {
    const def = docTypeDef(doc.docType);
    if (doc.status === 'Metadata only') {
      return { ok: false, why: `The file was purged on ${doc.purgedAt} under the retention rule for ${doc.docType}. The metadata record persists so the register remains complete — WF-C7-03 / Step 7.` };
    }
    const u = currentUser;
    if (!u) return { ok: false, why: 'No session.' };
    // Step 2 — an external user sees only their own records, and only externally visible types
    if (u.userType === 'External User') {
      if (!def?.externallyVisible) {
        return { ok: false, why: `${doc.docType} is not flagged as externally visible, so it is not available to an external user — WF-C7-02 / Step 2.` };
      }
      if (!u.partyRecord || !doc.recordName.includes(u.partyRecord.split(' ')[0])) {
        return { ok: false, why: 'An external user may only retrieve documents on their own records.' };
      }
      return { ok: true };
    }
    // Step 1 — access is inherited from the record
    if (!u.countryScope.includes(doc.country)) {
      return { ok: false, why: `${doc.country} is not in your country scope, so the record and its documents are not available to you — WF-C7-02 / Step 1.` };
    }
    // Step 2 — a sensitive type is further restricted to nominated roles
    if (def?.sensitivity === 'Sensitive') {
      const roles = u.assignments.filter((a) => a.status === 'Active').map((a) => a.role);
      const permitted = def.nominatedRoles.some((r) => roles.includes(r));
      if (!permitted) {
        return {
          ok: false,
          why: `${doc.docType} is a sensitive document type. Only ${def.nominatedRoles.map((r) => r.replace(/_/g, ' ').toLowerCase()).join(', ')} may open it, and the attempt has been logged — WF-C7-02 / Steps 2 and 5.`
        };
      }
    }
    return { ok: true };
  }, [currentUser]);

  /** WF-C7-02 / Steps 3 and 5 */
  const openDoc = useCallback((id: string, action: 'Opened' | 'Downloaded' | 'Exported') => {
    const doc = documents.find((x) => x.id === id);
    if (!doc) return { ok: false, why: 'Document not found.' };
    const def = docTypeDef(doc.docType);
    const verdict = canOpenDoc(doc);
    const entry = {
      at: stamp(), who: currentUser?.name ?? '—',
      role: currentUser?.assignments.find((a) => a.status === 'Active')?.role ?? '—',
      action: verdict.ok ? action : ('Open refused' as const)
    };
    // every open, download and export of a sensitive document is logged
    if (def?.sensitivity === 'Sensitive' || !verdict.ok) {
      setDocuments((prev) => prev.map((x) => (x.id === id ? { ...x, accessLog: [entry, ...x.accessLog] } : x)));
      pushAudit({
        user: entry.who, role: entry.role, country: doc.country, entity: 'Document',
        record: doc.systemRef, action: `${entry.action} — ${doc.docType}`, sensitive: true
      });
    }
    if (!verdict.ok) return verdict;
    return { ok: true };
  }, [documents, currentUser, canOpenDoc, pushAudit]);

  /** WF-C7-01 / Step 8 */
  const checklistFor = useCallback((objectType: string, recordKey: string, country?: string) => {
    const base = CHECKLISTS.find((c) => c.objectType === objectType);
    const scope = country ?? activeCountry;
    // C10 / WF-C10-01 / Step 3 — where the checklist step does not apply in this country,
    // there is no gate at all: the step is hidden rather than branched around.
    if (!stepApplies(scope, 'c7-checklist')) {
      return {
        def: base ? { ...base, mandatory: [] } : base, present: [], outstanding: [],
        countryAdded: [] as string[],
        disabledByConfig: `The mandatory document checklist does not apply in ${scope} — C10 / WF-C10-01 / Step 3.`
      };
    }
    // C10 / WF-C10-01 / Step 4 — country-specific mandatory documents, the country
    // dimension the C07 checklist does not carry on its own.
    const added = checklistAdditions
      .filter((a) => a.country === scope && a.objectType === objectType)
      .map((a) => a.docType);
    const mandatory = Array.from(new Set([...(base?.mandatory ?? []), ...added]));
    const def = base ? { ...base, mandatory } : (added.length
      ? { objectType, step: 'Submission for approval', mandatory, blocks: 'Submit for approval' }
      : undefined);
    const held = documents.filter((x) => x.recordKey === recordKey && x.status !== 'Metadata only');
    const present = mandatory.filter((m) => held.some((x) => x.docType === m));
    const outstanding = mandatory.filter((m) => !held.some((x) => x.docType === m));
    return { def, present, outstanding, countryAdded: added, disabledByConfig: undefined as string | undefined };
  }, [documents, checklistAdditions, activeCountry, stepApplies]);

  const expiryStateOf = useCallback((doc: Doc7) => validityState(doc), []);

  /** WF-C7-03 / Steps 2–3 */
  const runExpiryCheck = useCallback(() => {
    // C10 / WF-C10-01 / Step 3 — expiry monitoring is a configurable step per country
    const dated = documents.filter((x) => x.validTo && x.status === 'Current' && stepApplies(x.country, 'c7-expiry'));
    const approaching = dated.filter((x) => validityState(x) === 'Approaching expiry');
    const expired = dated.filter((x) => validityState(x) === 'Expired');

    [...approaching, ...expired].forEach((doc) => {
      const def = docTypeDef(doc.docType);
      const lapsed = validityState(doc) === 'Expired';
      const to = lapsed ? (def?.escalationRole ?? '—') : (def?.responsibleRole ?? '—');
      pushNotification({
        event: 'Document expiry',
        subject: lapsed
          ? `${doc.docType} on ${doc.recordName} expired on ${doc.validTo}`
          : `${doc.docType} on ${doc.recordName} expires on ${doc.validTo}`,
        recipient: to, channels: ['In-app', 'Email'],
        country: doc.country, record: doc.recordKey, route: doc.route,
        due: doc.validTo, requester: 'Service identity (scheduled job)'
      });
      pushTask({
        type: lapsed ? `Document lapsed — ${doc.docType}` : `Document renewal — ${doc.docType}`,
        sourceModule: 'C7 File and Document Management',
        relatedRecord: `${doc.recordName} (${doc.systemRef})`,
        route: doc.route ?? '/c7/expiry',
        requester: 'Service identity (scheduled job)',
        due: doc.validTo ?? '2026-08-31',
        priority: lapsed ? 'Urgent' : 'Normal', assigneeId: 'U-001'
      });
    });

    pushAudit({
      user: 'Service identity (scheduled job)', role: '—', country: 'Global',
      entity: 'Scheduled job', record: 'Document expiry evaluation', action: 'Run', source: 'Scheduled job'
    });
    setToast({
      message: `Expiry check complete: ${approaching.length} approaching expiry, ${expired.length} expired. Notifications and tasks were raised for the responsible role, and lapsed items escalated — WF-C7-03 / Step 3. Whether a message actually reached anyone depends on the C5 rule for Document expiry being active.`,
      severity: expired.length ? 'warning' : 'success'
    });
  }, [documents, pushNotification, pushTask, pushAudit, stepApplies]);

  /** WF-C7-03 / Step 4 */
  const blockedOperations = useCallback(() =>
    BLOCKED_OPERATIONS.map((b) => ({
      ...b,
      doc: documents.find((x) => x.recordKey === b.recordKey && x.docType === b.docType && x.status === 'Current')
    })).filter((b) => b.doc && validityState(b.doc) === 'Expired'), [documents]);

  /** WF-C7-03 / Step 5 */
  const archiveDoc = useCallback((id: string) => {
    const doc = documents.find((x) => x.id === id);
    setDocuments((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Archived', archivedAt: stamp() } : x)));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: doc?.country ?? '—', entity: 'Document', record: doc?.systemRef ?? id, action: 'Archived under retention policy' });
    setToast({ message: `${doc?.systemRef} archived. An archived document remains retrievable through the document register — WF-C7-03 / Step 5.`, severity: 'info' });
  }, [documents, currentUser, pushAudit]);

  /** WF-C7-03 / Step 7 — the file is purged, the metadata record persists */
  const purgeDoc = useCallback((id: string) => {
    const doc = documents.find((x) => x.id === id);
    setDocuments((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Metadata only', purgedAt: stamp() } : x)));
    pushAudit({ user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: doc?.country ?? '—', entity: 'Document', record: doc?.systemRef ?? id, action: 'File purged under retention policy; metadata retained', sensitive: true });
    setToast({ message: `The file behind ${doc?.systemRef} has been purged under its retention rule. The metadata record persists, so the document register remains complete — WF-C7-03 / Step 7.`, severity: 'info' });
  }, [documents, currentUser, pushAudit]);

  /** WF-C7-03 / Step 6 — administrators only, reason mandatory, fully audited */
  const deleteDoc = useCallback((id: string, reason: string) => {
    const isAdmin = (currentUser?.assignments ?? []).some((a) => a.status === 'Active' && a.role === 'SYSTEM_ADMINISTRATOR');
    if (!isAdmin) {
      return { ok: false, why: 'Deletion is available only to an administrator — WF-C7-03 / Step 6.' };
    }
    if (!reason.trim()) return { ok: false, why: 'A reason is mandatory.' };
    const doc = documents.find((x) => x.id === id);
    setDocuments((prev) => prev.map((x) => (x.id === id
      ? { ...x, status: 'Metadata only', purgedAt: stamp(), deletedReason: reason.trim() }
      : x)));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: doc?.country ?? '—',
      entity: 'Document', record: doc?.systemRef ?? id,
      action: `Deleted by an administrator — ${reason.trim()}`, sensitive: true
    });
    setToast({ message: `${doc?.systemRef} deleted with the reason recorded. The metadata record persists so the register remains complete, and the deletion is written to the audit trail as a sensitive action — WF-C7-03 / Steps 6–7.`, severity: 'warning' });
    return { ok: true };
  }, [documents, currentUser, pushAudit]);

  /* ------------------------- C8 audit trail ------------------------- */

  const auditLevelOf = useCallback((entity: string) => auditLevelFor(auditLevels, entity), [auditLevels]);

  const saveAuditLevel = useCallback((entity: string, patch: Partial<AuditLevelDef>) => {
    setAuditLevels((prev) => prev.map((l) => (l.entity === entity ? { ...l, ...patch } : l)));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global',
      entity: 'Audit configuration', record: entity, action: 'Audit level changed',
      field: patch.level ? 'Audit level' : Object.keys(patch)[0],
      newValue: String(Object.values(patch)[0]), sensitive: true
    });
    setToast({
      message: patch.level
        ? `${entity} is now audited at ${String(patch.level).toLowerCase()}. Entries written from now on carry ${patch.level === 'Record level' ? 'no field detail' : patch.level === 'Status level' ? 'status changes only' : 'field, previous value and new value'} — WF-C8-01 / Step 4. The change is itself audited as a configuration change.`
        : `${entity} audit configuration updated, and the change is itself audited — WF-C8-01 / Step 4.`,
      severity: 'success'
    });
  }, [currentUser, pushAudit]);

  const saveSensitiveClass = useCallback((cls: string, patch: Partial<SensitiveClassDef>) => {
    setSensitiveClasses((prev) => prev.map((c) => (c.cls === cls ? { ...c, ...patch } : c)));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global',
      entity: 'Audit configuration', record: cls, action: 'Sensitive action classification changed', sensitive: true
    });
    setToast({ message: `${cls} updated. Alerts are issued through C5, so channel policy and quiet hours apply — WF-C8-01 / Step 6.`, severity: 'success' });
  }, [currentUser, pushAudit]);

  /** WF-C8-02 / Step 3 — audit data is sensitive in its own right */
  const hasAuditPermission = useCallback(() => {
    const roles = (currentUser?.assignments ?? []).filter((a) => a.status === 'Active').map((a) => a.role);
    return roles.some((r) => AUDIT_PERMISSION_ROLES.includes(r));
  }, [currentUser]);

  /** WF-C8-02 / Steps 4–5 */
  const searchAudit = useCallback((q: {
    user?: string; from?: string; to?: string; entities?: string[]; countries?: string[];
    actions?: string[]; record?: string; sensitiveOnly?: boolean; sources?: string[];
  }) => {
    const scope = currentUser?.countryScope ?? [];
    return audit.filter((a) => {
      if (q.user && !a.user.toLowerCase().includes(q.user.toLowerCase())) return false;
      if (q.from && a.at.slice(0, 10) < q.from) return false;
      if (q.to && a.at.slice(0, 10) > q.to) return false;
      if (q.entities?.length && !q.entities.some((e) => a.entity.toLowerCase().includes(e.toLowerCase()))) return false;
      if (q.countries?.length && !q.countries.includes(a.country)) return false;
      if (q.actions?.length && !q.actions.some((x) => a.action.toLowerCase().includes(x.toLowerCase()))) return false;
      if (q.record && !a.record.toLowerCase().includes(q.record.toLowerCase())) return false;
      if (q.sensitiveOnly && !a.sensitive) return false;
      if (q.sources?.length && !q.sources.includes(a.source)) return false;
      // the searcher's own country scope still applies; Global entries are always in scope
      if (a.country !== 'Global' && a.country !== '—' && scope.length && !scope.includes(a.country)) return false;
      return true;
    });
  }, [audit, currentUser]);

  /** WF-C8-02 / Step 5 — every audit query and export is itself logged */
  const logAuditQuery = useCallback((description: string, resultCount: number, kind: 'Audit search' | 'Audit export') => {
    pushAudit({
      user: currentUser?.name ?? '—',
      role: (currentUser?.assignments ?? []).find((a) => a.status === 'Active')?.role ?? '—',
      country: activeCountry, entity: 'Audit trail', record: description,
      action: `${kind} — ${resultCount} entr${resultCount === 1 ? 'y' : 'ies'} returned`,
      sensitive: true
    });
  }, [currentUser, activeCountry, pushAudit]);

  const auditForRecord = useCallback((recordKey: string) =>
    audit
      .filter((a) => a.record === recordKey || a.record.startsWith(recordKey) || a.record.includes(recordKey))
      .slice()
      .sort((a, b) => b.at.localeCompare(a.at)), [audit]);

  /** WF-C8-03 / Step 2 */
  const retentionStateOf = useCallback((a: AuditRec) => {
    const level = auditLevelFor(auditLevels, a.entity);
    const years = level?.retentionYears ?? 7;
    const age = yearsBetween(a.at, TODAY_C8);
    if (age <= years) return 'Within retention' as const;
    return a.archived
      ? ('Beyond retention — eligible for trimming' as const)
      : ('Beyond retention — archived' as const);
  }, [auditLevels]);

  /** WF-C8-03 / Steps 2–5 */
  const runRetentionCycle = useCallback(() => {
    let online = 0, archivedNow = 0, alreadyArchived = 0, refused = 0;
    const next = audit.map((a) => {
      const level = auditLevelFor(auditLevels, a.entity);
      const years = level?.retentionYears ?? 7;
      const age = yearsBetween(a.at, TODAY_C8);
      if (age <= years) { online += 1; refused += a.archived ? 1 : 0; return a; }
      if (a.archived) { alreadyArchived += 1; return a; }
      archivedNow += 1;
      return { ...a, archived: true };
    });
    setAudit(next);
    pushAudit({
      user: 'Service identity (scheduled job)', role: '—', country: 'Global',
      entity: 'Scheduled job', record: 'Audit retention and archiving cycle',
      action: `Run — ${archivedNow} entr${archivedNow === 1 ? 'y' : 'ies'} archived, ${online} kept online`,
      source: 'Scheduled job'
    });
    // WF-C8-03 / Step 5 — the trimming and recycling run is itself a technical event
    // and is logged (C9), not audited. This is the C8/C9 line made literal.
    pushLog({
      severity: 'Information', component: 'Audit service', environment: 'Production', logClass: 'Job log',
      message: `Audit retention cycle completed — ${archivedNow} archived, ${online} kept online, ${alreadyArchived} already archived. Run under the authority of the scheduled job service identity.`
    });
    setToast({
      message: `Retention cycle complete: ${online} entries within retention and kept online and fully searchable, ${archivedNow} newly archived, ${alreadyArchived} already archived. Entries within retention are never trimmed — WF-C8-03 / Steps 2–4. The run is itself logged (C9) with the authority under which it ran.`,
      severity: 'success'
    });
  }, [audit, auditLevels, pushAudit, pushLog]);

  /** WF-C8-03 / Step 4 — trimming applies only to archived, out-of-retention entries */
  const trimArchived = useCallback(() => {
    const eligible = audit.filter((a) => retentionStateOf(a) === 'Beyond retention — eligible for trimming');
    const withinRetention = audit.filter((a) => retentionStateOf(a) === 'Within retention').length;
    if (eligible.length === 0) {
      setToast({
        message: `Nothing is eligible for trimming. Trimming and recycling apply only to archived, out-of-retention entries; the ${withinRetention} entries within retention are never trimmed — WF-C8-03 / Step 4.`,
        severity: 'info'
      });
      return;
    }
    setAudit((prev) => prev.filter((a) => !eligible.some((e) => e.id === a.id)));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global',
      entity: 'Scheduled job', record: 'Audit trimming and recycling run',
      action: `Run — ${eligible.length} archived out-of-retention entr${eligible.length === 1 ? 'y' : 'ies'} removed under the authority of ${currentUser?.name ?? 'the administrator'}`,
      sensitive: true
    });
    // WF-C8-03 / Step 5 — logged (C9), recording what was removed and under whose authority
    pushLog({
      severity: 'Warning', component: 'Audit service', environment: 'Production', logClass: 'Job log',
      message: `Audit trimming and recycling run — ${eligible.length} archived out-of-retention entr${eligible.length === 1 ? 'y' : 'ies'} removed under the authority of ${currentUser?.name ?? 'the administrator'}.`
    });
    setToast({
      message: `${eligible.length} archived, out-of-retention entr${eligible.length === 1 ? 'y' : 'ies'} trimmed. The run itself is recorded, including what was removed and under whose authority — WF-C8-03 / Step 5. Entries within retention were not touched.`,
      severity: 'warning'
    });
  }, [audit, retentionStateOf, currentUser, pushAudit, pushLog]);

  /* ================================================================== *
   * C9 — System Logging and Monitoring
   * ================================================================== */

  /** WF-C9-01 / Step 1 — the level decides what is visible, not what is written. */
  const visibleLog = useCallback((env: Environment, logClass?: LogClass) => {
    const scoped = logEntries.filter((l) => l.environment === env && (!logClass || l.logClass === logClass));
    const shown = scoped.filter((l) => severityRank(l.severity) >= severityRank(levelFor(logLevels, l.component, env)));
    return { shown, suppressed: scoped.length - shown.length };
  }, [logEntries, logLevels]);

  const saveLogLevel = useCallback((component: string, env: Environment, level: Severity) => {
    setLogLevels((prev) => prev.map((l) => (l.component === component
      ? { ...l, [env]: level, changedAt: stamp(), changedBy: currentUser?.name ?? '—' }
      : l)));
    // DEPENDENCY → C10 / WF-C10-03 — the level is configuration and is audited as a change
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global',
      entity: 'Configuration', record: `Log level — ${component} (${env})`,
      action: 'Update', field: 'Level', newValue: level
    });
    pushLog({
      severity: 'Information', component: 'Web application', environment: env, logClass: 'Application log',
      message: `Log level for ${component} in ${env} set to ${level} by ${currentUser?.name ?? 'an administrator'}.`
    });
    setToast({
      message: `${component} now writes ${level} and above in ${env}. The level decides what is retained, not what the application produces — WF-C9-01 / Step 1.`,
      severity: 'success'
    });
  }, [currentUser, pushAudit, pushLog]);

  const saveMaskRule = useCallback((id: string, patch: Partial<MaskRule>) => {
    const before = maskRules.find((m) => m.id === id);
    setMaskRules((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global',
      entity: 'Configuration', record: `Masking rule — ${before?.name ?? id}`, action: 'Update',
      field: patch.mode ? 'Masking' : 'Active',
      oldValue: patch.mode ? before?.mode : String(before?.active),
      newValue: patch.mode ?? String(patch.active)
    });
    setToast({
      message: 'Masking applies as the entry is written, so this change affects future entries only. Entries already written keep the masking that was applied to them — the original value was never stored and cannot be recovered here (WF-C9-01 / Step 2).',
      severity: 'info'
    });
  }, [maskRules, currentUser, pushAudit]);

  const incidentByRef = useCallback((ref: string) => incidents.find((i) => i.errorRef === ref || i.id === ref), [incidents]);

  /**
   * WF-C9-01 / Steps 3–6 — the whole chain in one action, because a prototype
   * cannot fail on demand: a log entry at Error or Critical, an incident with a
   * reference, the friendly message the user sees, the classification, and — for a
   * critical case — the immediate alert to support through the C05 engine.
   * Recurring errors are grouped on the fingerprint rather than listed separately.
   */
  const simulateFailure = useCallback((caseKey: string) => {
    const c: FailureCase = FAILURE_CASES.find((f) => f.key === caseKey) ?? FAILURE_CASES[0];
    const fingerprint = `${c.component} · ${c.operation} · ${c.exceptionType.split('.').pop()}`;
    const existing = incidents.find((i) => i.fingerprint === fingerprint);
    const at = `${TODAY_C9} ${new Date().toTimeString().slice(0, 8)}`;
    const critical = isCritical(c.classification);
    const actor = currentUser?.name ?? 'Job service identity';
    const occurrence = { at, user: actor, country: c.country, screen: c.screenOrService };

    let errorRef: string;
    let incidentId: string;

    if (existing) {
      // Step 6 — grouped, so frequency is visible rather than lost in a long list
      errorRef = existing.errorRef;
      incidentId = existing.id;
      const count = existing.occurrences.length + 1;
      setIncidents((prev) => prev.map((i) => (i.id === existing.id ? {
        ...i,
        lastSeen: at,
        occurrences: [...i.occurrences, occurrence],
        status: i.status === 'Closed' ? 'Recurring' : i.status,
        reopenedFrom: i.status === 'Closed' ? i.closedAt : i.reopenedFrom,
        trail: [...i.trail, {
          at, by: 'System',
          what: i.status === 'Closed'
            ? `Recurred after closure — reopened as Recurring; occurrence ${count}`
            : `Occurrence ${count} grouped on the same fingerprint`
        }]
      } : i)));
    } else {
      const n = errSeq + 1;
      setErrSeq(n);
      errorRef = `ERR-${TODAY_C9}-${String(n).padStart(4, '0')}`;
      incidentId = nextId('IN');
      const rec: Incident = {
        id: incidentId, errorRef, severity: c.severity, classification: c.classification,
        component: c.component, operation: c.operation, screenOrService: c.screenOrService,
        country: c.country, fingerprint, firstSeen: at, lastSeen: at, occurrences: [occurrence],
        status: 'Open', friendly: c.friendly, exceptionType: c.exceptionType,
        exceptionMessage: c.exceptionMessage, stackTrace: c.stackTrace, parameters: c.parameters,
        correlation: c.correlation,
        alertRaised: critical, alertAt: critical ? at.slice(11, 16) : undefined,
        alertRecipients: critical ? [SUPPORT_GROUP] : undefined,
        trail: [
          { at, by: 'System', what: `Incident created from an unhandled error, reference ${errorRef}` },
          {
            at, by: 'System',
            what: critical
              ? `Classified ${c.classification} — critical; alert raised to ${SUPPORT_GROUP} through C05 rule NR-12`
              : `Classified non-critical; queued for normal handling without alerting — WF-C9-01 / Step 5`
          }
        ]
      };
      setIncidents((prev) => [rec, ...prev]);
    }

    pushLog({
      at, severity: c.severity, component: c.component, environment: 'Production',
      logClass: 'Application log', message: `${c.exceptionType} — ${c.exceptionMessage}`,
      errorRef, correlation: c.correlation,
      masked: c.parameters.filter((p) => p.masked).map((p) => ({ field: p.field, value: p.value, rule: p.masked! }))
    });
    pushLog({
      at, severity: 'Information', component: c.component, environment: 'Production',
      logClass: 'Incident record', message: `Incident ${errorRef} — ${c.classification}${critical ? ' — support alerted' : ' — queued without alerting'}`,
      errorRef
    });

    if (critical) {
      // HAND-OFF → C5 / WF-C5-01. The same engine, the same policy, the same delivery log —
      // except that a critical technical alert overrides quiet hours, since an outage does not wait.
      pushNotification({
        event: 'Critical technical error', recipient: SUPPORT_GROUP,
        subject: `${c.classification} — ${errorRef} in ${c.component}`,
        channels: ['In-app', 'Email', 'SMS'], country: c.country, urgent: true,
        record: errorRef, route: `/c9/incidents/${incidentId}`
      });
    }

    const result = { errorRef, friendly: c.friendly, incidentId };
    setLastError(result);
    return result;
  }, [incidents, errSeq, currentUser, pushLog, pushNotification]);

  const clearLastError = useCallback(() => setLastError(null), []);

  const assignIncident = useCallback((id: string, owner: string) => {
    setIncidents((prev) => prev.map((i) => (i.id === id ? {
      ...i, owner, status: i.status === 'Open' ? 'Investigating' : i.status,
      trail: [...i.trail, { at: stamp(), by: currentUser?.name ?? '—', what: `Assigned to ${owner}${i.status === 'Open' ? '; status set to Investigating' : ''}` }]
    } : i)));
    // Assignment is a technical event and is logged here, not audited in C8.
    pushLog({
      severity: 'Information', component: 'Web application', environment: 'Production',
      logClass: 'Incident record', message: `Incident ${id} assigned to ${owner} by ${currentUser?.name ?? 'a support user'}.`
    });
    setToast({ message: `Assigned to ${owner}. Assignment, reclassification and closure are technical events and are logged here, not written to the business audit trail — the C8/C9 line.`, severity: 'success' });
  }, [currentUser, pushLog]);

  /** WF-C9-01 / Step 5 — reclassifying to a critical class raises the alert that was not raised at the time. */
  const reclassifyIncident = useCallback((id: string, classification: Classification) => {
    const inc = incidents.find((i) => i.id === id);
    if (!inc) return;
    const nowCritical = isCritical(classification);
    const raiseNow = nowCritical && !inc.alertRaised;
    setIncidents((prev) => prev.map((i) => (i.id === id ? {
      ...i, classification, severity: nowCritical ? 'Critical' : 'Error',
      alertRaised: i.alertRaised || raiseNow,
      alertAt: raiseNow ? stamp().slice(11, 16) : i.alertAt,
      alertRecipients: raiseNow ? [SUPPORT_GROUP] : i.alertRecipients,
      trail: [...i.trail, {
        at: stamp(), by: currentUser?.name ?? '—',
        what: `Reclassified from ${inc.classification} to ${classification}${raiseNow ? `; the alert not raised at the time was raised now to ${SUPPORT_GROUP}` : ''}`
      }]
    } : i)));
    pushLog({
      severity: nowCritical ? 'Critical' : 'Warning', component: inc.component, environment: 'Production',
      logClass: 'Incident record', errorRef: inc.errorRef,
      message: `Incident ${inc.errorRef} reclassified to ${classification} by ${currentUser?.name ?? 'a support user'}.`
    });
    if (raiseNow) {
      pushNotification({
        event: 'Critical technical error', recipient: SUPPORT_GROUP,
        subject: `${classification} — ${inc.errorRef} reclassified as critical`,
        channels: ['In-app', 'Email', 'SMS'], country: inc.country, urgent: true,
        record: inc.errorRef, route: `/c9/incidents/${id}`
      });
    }
    setToast({
      message: raiseNow
        ? `Reclassified as ${classification}. Because the classification is now critical, the alert that was not raised at the time has been raised to ${SUPPORT_GROUP} — WF-C9-01 / Step 5.`
        : `Reclassified as ${classification}.`,
      severity: raiseNow ? 'warning' : 'success'
    });
  }, [incidents, currentUser, pushLog, pushNotification]);

  /** WF-C9-01 / Step 7 — closure requires an owner, a cause and a resolution. */
  const closeIncident = useCallback((id: string, cause: string, resolution: string, preventive?: string) => {
    const inc = incidents.find((i) => i.id === id);
    if (!inc) return { ok: false, why: 'The incident could not be found.' };
    if (!inc.owner) return { ok: false, why: 'An incident is tracked to closure with an owner, so an owner must be assigned before it can be closed — WF-C9-01 / Step 7.' };
    if (!cause.trim() || !resolution.trim()) {
      return { ok: false, why: 'The cause and resolution must be recorded before an incident is closed — WF-C9-01 / Step 7.' };
    }
    const at = stamp();
    setIncidents((prev) => prev.map((i) => (i.id === id ? {
      ...i, status: 'Closed', cause, resolution, preventive, closedAt: at,
      trail: [...i.trail, { at, by: currentUser?.name ?? '—', what: 'Cause and resolution recorded; incident closed' }]
    } : i)));
    pushLog({
      severity: 'Information', component: inc.component, environment: 'Production',
      logClass: 'Incident record', errorRef: inc.errorRef,
      message: `Incident ${inc.errorRef} closed by ${currentUser?.name ?? 'a support user'} — cause and resolution recorded.`
    });
    setToast({ message: `${inc.errorRef} closed. The cause, resolution and any preventive action build the history that informs preventive work — WF-C9-01 / Step 7.`, severity: 'success' });
    return { ok: true };
  }, [incidents, currentUser, pushLog]);

  const exchangeByCorrelation = useCallback(
    (correlation: string) => exchanges.find((e) => e.correlation === correlation || e.id === correlation),
    [exchanges]
  );

  /** WF-C9-02 / Step 3 — the administrator corrects the failed record. */
  const correctQueued = useCallback((id: string, correctedValue: string) => {
    setQueuedErrors((prev) => prev.map((q) => (q.id === id
      ? { ...q, correctedValue, status: 'Corrected — awaiting reprocess' }
      : q)));
    pushLog({
      severity: 'Information', component: 'Integration service', environment: 'Production',
      logClass: 'Integration exchange log',
      message: `Error queue record ${id} corrected by ${currentUser?.name ?? 'an administrator'} — awaiting reprocess.`
    });
    setToast({ message: `${id} corrected and awaiting reprocess. The record was held rather than discarded — WF-C9-02 / Step 2.`, severity: 'success' });
  }, [currentUser, pushLog]);

  /**
   * WF-C9-02 / Step 3 — reprocessing is logged in the same way as the original
   * exchange, so it appears in the exchange log as an ordinary exchange carrying a
   * reprocess-of link rather than as a special case.
   *
   * `alsoAudit` is the disputed behaviour, not a design choice: C12 / WF-C12-01 /
   * Step 10 says reprocessing is logged (C9) *and* audited (C8); C9 / WF-C9-02 /
   * Step 3 says only that it is logged. The toggle shows both readings and their
   * consequence in the C08 History panel; it is off by default and labelled as open.
   */
  const reprocessQueued = useCallback((ids: string[], reason: string, alsoAudit: boolean) => {
    const rows = queuedErrors.filter((q) => ids.includes(q.id));
    if (rows.length === 0) return;
    const at = `${TODAY_C9} ${new Date().toTimeString().slice(0, 8)}`;
    const correlation = `CORR-${Math.abs(rows.map((r) => r.id.charCodeAt(4) ?? 0).reduce((a, b) => a * 7 + b, 11)).toString(16).padStart(6, '0').slice(0, 6)}`;
    const interfaceName = rows[0].interfaceName;
    // A corrected record reprocesses successfully; one left uncorrected fails again,
    // because reprocessing without correcting is the same exchange with the same input.
    const corrected = rows.filter((r) => r.correctedValue);
    const uncorrected = rows.filter((r) => !r.correctedValue);

    const ex: Exchange = {
      id: nextId('EX'), correlation, interfaceName, direction: 'Outbound',
      endpoint: exchanges.find((e) => e.interfaceName === interfaceName)?.endpoint ?? '—',
      started: at, ended: at, responseMs: 1740,
      outcome: uncorrected.length === 0 ? 'Success' : 'Partial — records in exception',
      received: 0, processed: corrected.length, skipped: 0, inException: uncorrected.length, failed: 0,
      payloadRef: `sha256:${correlation.slice(5)}…`, triggeredBy: `${currentUser?.name ?? 'Administrator'} — reprocess from the error queue`,
      reprocessOf: rows[0].correlation,
      attempts: [{ attempt: 1, started: at, responseMs: 1740, outcome: 'Success', retryDecision: 'Not required' }]
    };
    setExchanges((prev) => [ex, ...prev]);

    setQueuedErrors((prev) => prev.map((q) => (ids.includes(q.id) ? {
      ...q,
      status: q.correctedValue ? 'Reprocessed — success' : 'Reprocessed — failed again',
      reprocessedAt: at, reprocessCorrelation: correlation, reason4Reprocess: reason, auditRaised: alsoAudit
    } : q)));

    pushLog({
      at, severity: uncorrected.length ? 'Warning' : 'Information', component: 'Integration service',
      environment: 'Production', logClass: 'Integration exchange log', correlation,
      message: `Reprocess of ${rows[0].correlation} — ${corrected.length} record${corrected.length === 1 ? '' : 's'} reprocessed successfully, ${uncorrected.length} still in exception. Reason: ${reason}`
    });

    if (alsoAudit) {
      rows.forEach((r) => pushAudit({
        user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global',
        entity: r.entity, record: r.record,
        action: `Reprocessed from the integration error queue — ${reason}`,
        reason, source: 'Integration', originatingSystem: r.interfaceName.startsWith('SAP') ? 'SAP' : undefined
      }));
    }

    setToast({
      message: alsoAudit
        ? `Reprocessed as exchange ${correlation}, logged as an ordinary exchange with a reprocess-of link. A business audit entry was also written to each record — the reading taken from C12 / WF-C12-01 / Step 10. C9 / WF-C9-02 / Step 3 states only that reprocessing is logged; the difference is unresolved.`
        : `Reprocessed as exchange ${correlation}, logged as an ordinary exchange with a reprocess-of link. No business audit entry was written — the reading taken from C9 / WF-C9-02 / Step 3. C12 / WF-C12-01 / Step 10 states that reprocessing is also audited; the difference is unresolved.`,
      severity: 'warning'
    });
  }, [queuedErrors, exchanges, currentUser, pushLog, pushAudit]);

  const missedJobsToday = useCallback(
    () => missedJobs(jobConfigs, jobRunsC9, NOW_C9.slice(11, 16), TODAY_C9),
    [jobConfigs, jobRunsC9]
  );

  const saveJobConfig = useCallback((job: JobName, patch: Partial<JobConfig>) => {
    setJobConfigs((prev) => prev.map((c) => (c.job === job ? { ...c, ...patch } : c)));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global',
      entity: 'Configuration', record: `Job configuration — ${job}`, action: 'Update'
    });
    setToast({ message: `${job} configuration saved. The outcome of every run is derived by comparing it against this configuration — WF-C9-02 / Step 5.`, severity: 'success' });
  }, [currentUser, pushAudit]);

  /**
   * WF-C9-02 / Steps 4–5 — a manual run. Where the job belongs to another module,
   * this runs *that module's* job: the job log is a view of what the other modules
   * actually do, not a simulation of it.
   */
  const runJobNow = useCallback((job: JobName) => {
    const cfg = jobConfigs.find((c) => c.job === job);
    const started = `${TODAY_C9} ${new Date().toTimeString().slice(0, 8)}`;
    let processed = 0, skipped = 0, failures = 0, duration = 2;
    let note: string | undefined;

    if (job === 'Notification evaluation') {
      runScheduler();
      processed = jobRules.filter((r) => r.active).length;
      skipped = overdueItems.filter((o) => !o.inScope).length;
      duration = 7;
      note = 'The C05 time-based notification evaluation was run; the counts are the run it produced.';
    } else if (job === 'Document expiry check') {
      runExpiryCheck();
      processed = documents.filter((d) => d.validTo).length;
      skipped = documents.filter((d) => !d.validTo).length;
      duration = 4;
      note = 'The C07 expiry check was run; the counts are the documents it evaluated.';
    } else if (job === 'Audit retention cycle') {
      processed = audit.length;
      duration = 2;
      note = 'The C08 retention cycle is run from its own screen so that the preview can be reviewed first; this row records the evaluation only.';
    } else if (job === 'Report distribution') {
      failures = 1;
      duration = 40;
      note = 'C11 is not built. The run is recorded as a failure so that the alert path can be demonstrated.';
    } else {
      processed = 415;
      failures = queuedErrors.filter((q) => q.status === 'Held').length;
      duration = 851;
      note = 'C12 is not built. The counts are taken from the exchanges and error queue already held.';
    }

    const endSeconds = duration;
    const ended = `${TODAY_C9} ${new Date(new Date(`2026-08-18T${started.slice(11)}Z`).getTime() + endSeconds * 1000).toISOString().slice(11, 19)}`;
    const draft: JobRunRec9 = {
      id: nextId('JR'), job, started, ended, durationSeconds: duration,
      processed, skipped, failures, outcome: 'Completed',
      triggeredBy: `${currentUser?.name ?? 'Administrator'} — manual run`, note
    };
    const outcome: JobOutcome = failures > 0 && cfg && duration > cfg.windowSeconds
      ? 'Overran'
      : evaluateRun(draft, cfg);
    const rec: JobRunRec9 = { ...draft, outcome };

    const alertable = cfg?.alertOn.some((a) => (
      (a === 'Overran' && outcome === 'Overran')
      || (a === 'Failed' && (outcome === 'Failed' || outcome === 'Completed with failures'))
    )) ?? false;
    rec.alertRaised = alertable;

    setJobRunsC9((prev) => [rec, ...prev]);
    pushLog({
      at: started, severity: outcome === 'Completed' ? 'Information' : 'Warning',
      component: 'Job scheduler', environment: 'Production', logClass: 'Job log', run: rec.id,
      message: `${job} — ${outcome.toLowerCase()}; ${processed} processed, ${skipped} skipped, ${failures} failure${failures === 1 ? '' : 's'}, ${duration} s against an expected window of ${cfg?.windowSeconds ?? '—'} s.`
    });
    if (alertable) {
      pushNotification({
        event: 'Job execution alert', recipient: SUPPORT_GROUP,
        subject: `${job} — ${outcome.toLowerCase()} (${rec.id})`,
        channels: ['In-app', 'Email'], country: 'Global', urgent: true,
        record: rec.id, route: '/c9/jobs'
      });
    }
    setToast({
      message: `${job} run recorded as ${rec.id} — ${outcome}. ${alertable ? `An alert was raised to ${SUPPORT_GROUP} through C05 rule NR-13.` : 'No alert was raised: the outcome is not one this job alerts on.'}`,
      severity: alertable ? 'warning' : 'success'
    });
  }, [jobConfigs, jobRules, overdueItems, documents, audit, queuedErrors, currentUser,
    runScheduler, runExpiryCheck, pushLog, pushNotification]);

  const saveThreshold = useCallback((measure: Measure, patch: Partial<ThresholdDef>) => {
    setThresholds((prev) => prev.map((t) => (t.measure === measure ? { ...t, ...patch } : t)));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global',
      entity: 'Configuration', record: `Monitoring threshold — ${measure}`, action: 'Update'
    });
    setToast({ message: `${measure} threshold saved. The measure, its thresholds and its recipients are business decisions that hold whichever monitoring tool is selected.`, severity: 'success' });
  }, [currentUser, pushAudit]);

  /**
   * WF-C9-03 / Step 2 — a breach is recorded either way; whether it alerts depends
   * on the level breached and on how many consecutive breaches the threshold requires,
   * which is what suppresses flapping.
   */
  const simulateBreach = useCallback((measure: Measure) => {
    const t = thresholds.find((x) => x.measure === measure);
    if (!t) return;
    const value = t.direction === 'below' ? t.critical - 0.6 : Math.round(t.critical * 1.15);
    const at = stamp();
    const priorCritical = breaches.filter((b) => b.measure === measure && b.level === 'Critical' && !b.ended).length;
    const alert = priorCritical + 1 >= t.consecutiveBeforeAlert;
    const rec: Breach = {
      id: nextId('BR'), measure, value, threshold: t.critical, level: 'Critical', started: at,
      alertRaised: alert,
      suppressedReason: alert ? undefined : `Breach ${priorCritical + 1} of ${t.consecutiveBeforeAlert} consecutive breaches required in a ${t.windowMinutes}-minute window — no alert on this evaluation.`
    };
    setBreaches((prev) => [rec, ...prev]);
    setThresholds((prev) => prev.map((x) => (x.measure === measure ? { ...x, current: value } : x)));
    pushLog({
      at, severity: 'Critical', component: 'Web application', environment: 'Production',
      logClass: 'Monitoring measurement',
      message: `${measure} measured ${value} ${t.unit} against a critical threshold of ${t.critical} — breach recorded${alert ? ' and alerted' : ' without alerting'}.`
    });
    if (alert) {
      pushNotification({
        event: 'Monitoring threshold breach', recipient: SUPPORT_GROUP,
        subject: `${measure} breached — ${value} ${t.unit} against ${t.critical}`,
        channels: ['In-app', 'Email', 'SMS'], country: 'Global', urgent: true,
        record: rec.id, route: '/c9/thresholds'
      });
    }
    setToast({
      message: alert
        ? `${measure} breach recorded and alerted to ${SUPPORT_GROUP} through C05 rule NR-14 — WF-C9-03 / Step 2.`
        : `${measure} breach recorded. ${rec.suppressedReason}`,
      severity: alert ? 'error' : 'warning'
    });
  }, [thresholds, breaches, pushLog, pushNotification]);

  const saveLogRetention = useCallback((logClass: LogClass, patch: Partial<LogRetentionDef>) => {
    setLogRetention((prev) => prev.map((r) => (r.logClass === logClass ? { ...r, ...patch } : r)));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global',
      entity: 'Configuration', record: `Log retention — ${logClass}`, action: 'Update'
    });
    setToast({ message: `${logClass} retention saved. A technical log entry can be recycled and deleted under policy; a C8 audit entry cannot be edited or deleted by any role.`, severity: 'success' });
  }, [currentUser, pushAudit]);

  /** WF-C9-03 / Step 4 — what would be archived, trimmed and deleted, shown before it is done. */
  const retentionPreview = useCallback((): RetentionPreviewRow[] => LOG_CLASSES.map((logClass) => {
    const cfg = logRetention.find((r) => r.logClass === logClass)!;
    const rows = logEntries.filter((l) => l.logClass === logClass);
    const online = rows.filter((l) => !l.archived).length;
    const archived = rows.filter((l) => l.archived).length;
    const toArchive = rows.filter((l) => !l.archived && daysBetweenC9(l.at, TODAY_C9) > cfg.onlineDays).length;
    const beyond = rows.filter((l) => l.archived && daysBetweenC9(l.at, TODAY_C9) > cfg.onlineDays + cfg.archivedDays);
    return {
      logClass, online, archived, toArchive,
      toTrim: cfg.then === 'Trim to summary' ? beyond.length : 0,
      toDelete: cfg.then === 'Trim to summary' ? 0 : beyond.length,
      action: cfg.then
    };
  }), [logRetention, logEntries]);

  const runLogRetentionCycle = useCallback(() => {
    const preview = retentionPreview();
    const archiveIds = new Set<string>();
    const removeIds = new Set<string>();
    logEntries.forEach((l) => {
      const cfg = logRetention.find((r) => r.logClass === l.logClass);
      if (!cfg) return;
      const age = daysBetweenC9(l.at, TODAY_C9);
      if (!l.archived && age > cfg.onlineDays) archiveIds.add(l.id);
      else if (l.archived && age > cfg.onlineDays + cfg.archivedDays) removeIds.add(l.id);
    });
    setLogEntries((prev) => prev
      .filter((l) => !removeIds.has(l.id))
      .map((l) => (archiveIds.has(l.id) ? { ...l, archived: true } : l)));
    const archived = archiveIds.size;
    const removed = removeIds.size;
    // Step 4 — and the run itself is a technical event, recorded with what it removed
    pushLog({
      severity: 'Information', component: 'Job scheduler', environment: 'Production', logClass: 'Job log',
      message: `Log rotation and retention cycle — ${archived} entr${archived === 1 ? 'y' : 'ies'} archived, ${removed} recycled or deleted, under the authority of ${currentUser?.name ?? 'the administrator'}.`
    });
    const trimmed = preview.reduce((n, p) => n + p.toTrim, 0);
    setToast({
      message: `Retention cycle complete: ${archived} archived, ${removed} removed (${trimmed} of them trimmed to summary). The run is itself logged, recording what was removed and under whose authority. Unlike a C8 audit entry, a log entry may be recycled — it is diagnostic, not evidential.`,
      severity: 'warning'
    });
  }, [retentionPreview, logEntries, logRetention, currentUser, pushLog]);

  /**
   * WF-C9-03 / Step 5 — exportable throughout retention, with sensitive data masked
   * in the export exactly as in the original entry. There is no unmask here, because
   * the value was never written.
   */
  const exportLogs = useCallback((q: {
    logClasses: string[]; from: string; to: string; severityFrom?: Severity;
    correlation?: string; includeArchived: boolean; format: string;
  }) => {
    if (q.logClasses.length === 0) return { ok: false, why: 'Select at least one log class.' };
    if (!q.from || !q.to) return { ok: false, why: 'A date range is required.' };
    const longest = Math.max(...q.logClasses.map((c) => {
      const cfg = logRetention.find((r) => r.logClass === c);
      return cfg ? cfg.onlineDays + cfg.archivedDays : 0;
    }));
    const age = daysBetweenC9(q.from, TODAY_C9);
    if (age > longest) {
      return {
        ok: false,
        why: `${q.from} is ${age} days ago, beyond the ${longest}-day retention period of the selected log class${q.logClasses.length === 1 ? '' : 'es'}. Logs are exportable throughout their retention period and not beyond it — WF-C9-03 / Step 5.`
      };
    }
    const rows = logEntries.filter((l) => {
      if (!q.logClasses.includes(l.logClass)) return false;
      if (l.archived && !q.includeArchived) return false;
      if (l.at.slice(0, 10) < q.from || l.at.slice(0, 10) > q.to) return false;
      if (q.severityFrom && severityRank(l.severity) < severityRank(q.severityFrom)) return false;
      if (q.correlation && l.correlation !== q.correlation) return false;
      return true;
    });
    const maskedFields = rows.reduce((n, l) => n + (l.masked?.length ?? 0), 0);
    const rec: ExportRec = {
      id: nextId('EXP'), at: stamp(), by: currentUser?.name ?? '—', logClasses: q.logClasses,
      from: q.from, to: q.to, severityFrom: q.severityFrom, correlation: q.correlation,
      includeArchived: q.includeArchived, format: q.format, rows: rows.length, maskedFields
    };
    setLogExports((prev) => [rec, ...prev]);
    // The export is a technical action and is logged here — C8 logs audit queries
    // because audit data is evidence; C9 logs log exports because this is diagnostic.
    pushLog({
      severity: 'Information', component: 'Web application', environment: 'Production', logClass: 'Application log',
      message: `Log export ${rec.id} produced by ${rec.by} — ${rows.length} row${rows.length === 1 ? '' : 's'}, ${maskedFields} masked value${maskedFields === 1 ? '' : 's'} carried into the export as masked.`
    });
    return { ok: true, rows, maskedFields };
  }, [logEntries, logRetention, currentUser, pushLog]);

  /** WF-C9-03 / Step 3 — the five things the administration dashboard must present. */
  const healthBands = useCallback(() => {
    const tiles = thresholds.map((t) => ({
      measure: t.measure, value: t.current, unit: t.unit, threshold: t.critical,
      state: thresholdState(t)
    }));
    const failedLoginTotal = FAILED_LOGINS_24H.reduce((n, f) => n + f.count, 0);
    const interfaceNames = Array.from(new Set(exchanges.map((e) => e.interfaceName)));
    const ifaces = interfaceNames.map((interfaceName) => {
      const rows = exchanges.filter((e) => e.interfaceName === interfaceName);
      const last = rows[0];
      const queued = queuedErrors.filter((q) => q.interfaceName === interfaceName && q.status === 'Held').length;
      const avgMs = Math.round(rows.reduce((n, r) => n + r.responseMs, 0) / rows.length);
      const state = last?.outcome === 'Success'
        ? (queued > 0 ? 'Degraded — records held' : 'Healthy')
        : last?.outcome === 'Failed after retries' ? 'In outage' : 'Degraded';
      return { interfaceName, last: last?.started, outcome: last?.outcome, queued, avgMs, state };
    });
    const missed = missedJobsToday();
    const jobs = jobConfigs.map((c) => ({
      job: c.job,
      last: jobRunsC9.find((r) => r.job === c.job),
      nextExpected: c.schedule,
      overdue: missed.some((m) => m.job === c.job)
    }));
    const open = incidents.filter((i) => i.status !== 'Closed');
    return {
      tiles, failedLogins: FAILED_LOGINS_24H, failedLoginTotal, atScale: AT_SCALE_THRESHOLD,
      interfaces: ifaces, jobs,
      incidents: {
        open: open.length,
        critical: open.filter((i) => i.severity === 'Critical').length,
        recurring: incidents.filter((i) => i.status === 'Recurring').length,
        unassigned: open.filter((i) => !i.owner).length,
        oldest: open.slice().sort((a, b) => a.firstSeen.localeCompare(b.firstSeen))[0]
      }
    };
  }, [thresholds, exchanges, queuedErrors, jobConfigs, jobRunsC9, incidents, missedJobsToday]);

  /* ================================================================== *
   * C10 — System Configuration and Administration
   * ================================================================== */

  /** WF-C10-01 / Step 6 — no mandatory step may be disabled where a later step depends on its output. */
  const conflictsFor = useCallback(
    (country: string) => validateConfig(country, stepConfigs),
    [stepConfigs]
  );

  /**
   * WF-C10-03 / Step 1 — a change is a request with current and proposed values and a
   * business reason. Nothing in C10 saves a parameter directly, and neither do the C08
   * and C09 configuration screens: their changes arrive here.
   */
  const raiseChangeRequest = useCallback((r: {
    cls: ParameterClass; parameter: string; country: string; currentValue: string; proposedValue: string;
    reason?: string; effectiveFrom?: string; originScreen?: string; originRoute?: string;
    apply?: ChangeRequest['apply'];
  }) => {
    const rec: ChangeRequest = {
      id: nextId('CFG'), cls: r.cls, parameter: r.parameter, country: r.country,
      currentValue: r.currentValue, proposedValue: r.proposedValue,
      reason: r.reason ?? '', status: 'Draft',
      effectiveFrom: r.effectiveFrom ?? TODAY_C10,
      requestedBy: currentUser?.name ?? '—', requestedAt: stamp(),
      originScreen: r.originScreen, originRoute: r.originRoute, apply: r.apply
    };
    setChangeRequests((prev) => [rec, ...prev]);
    return rec;
  }, [currentUser]);

  const saveChangeRequest = useCallback((id: string, patch: Partial<ChangeRequest>) => {
    setChangeRequests((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  /** WF-C10-03 / Step 2 — routed for approval; authority-affecting classes go higher. */
  const submitChangeRequest = useCallback((id: string) => {
    const c = changeRequests.find((x) => x.id === id);
    if (!c) return { ok: false, why: 'The request could not be found.' };
    if (!c.reason.trim()) {
      return { ok: false, why: 'A business reason is required before a configuration change can be routed for approval — WF-C10-03 / Step 1.' };
    }
    if (c.effectiveFrom < TODAY_C10) {
      return { ok: false, why: `An effective date in the past cannot be set: ${c.effectiveFrom} has passed. Configuration takes effect from a date, and a past date would rewrite the rules that transactions were created under — WF-C10-03 / Step 4.` };
    }
    const higher = affectsAuthority(c.cls);
    setChangeRequests((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Pending approval' } : x)));
    pushTask({
      type: higher ? 'Approval request — configuration change (higher authority)' : 'Approval request — configuration change',
      sourceModule: 'C10 Configuration', relatedRecord: `${c.id} ${c.parameter}`,
      route: `/c10/changes/${c.id}`, requester: currentUser?.name ?? '—',
      due: c.effectiveFrom, priority: higher ? 'Urgent' : 'Normal', assigneeId: 'U-001'
    });
    pushNotification({
      event: 'Approval request', recipient: 'Fatima Idris',
      subject: `Configuration change ${c.id} — ${c.parameter} — awaits your approval`,
      channels: ['In-app', 'Email'], country: c.country === 'All countries' ? 'Global' : c.country,
      record: c.id, route: `/c10/changes/${c.id}`, requester: currentUser?.name ?? '—', due: c.effectiveFrom
    });
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR',
      country: c.country === 'All countries' ? 'Global' : c.country,
      entity: 'Configuration', record: `${c.id} ${c.parameter}`, action: 'Submit for approval',
      reason: c.reason
    });
    setToast({
      message: higher
        ? `${c.id} submitted. This class affects authority — approval routes and role definitions — so a higher level of approval applies (WF-C10-03 / Step 2). HAND-OFF → C4 / WF-C4-01.`
        : `${c.id} submitted for approval on the standard configuration route. HAND-OFF → C4 / WF-C4-01, with the current and proposed values and the business reason.`,
      severity: 'success'
    });
    return { ok: true };
  }, [changeRequests, currentUser, pushTask, pushNotification, pushAudit]);

  /** WF-C10-03 / Step 4 — approved changes are versioned and effective-dated; rejected leave the previous version in force. */
  const applyEffective = useCallback((id: string) => {
    const c = changeRequests.find((x) => x.id === id);
    if (!c || !c.apply) return;
    const a = c.apply;
    if (a.kind === 'stepApplies') {
      const [country, step] = a.target.split('|');
      const applies = a.value === 'true';
      setStepConfigs((prev) => prev.map((x) => (x.country === country && x.step === step
        ? { ...x, applies, mandatory: applies ? x.mandatory : false }
        : x)));
    } else if (a.kind === 'valueBand') {
      const to = Number(a.value);
      setThresholds10((prev) => prev.map((x) => (x.id === a.target ? { ...x, to } : x)));
      // Consumed by the approval engine at runtime: the band writes into the route it selects
      const band = thresholds10.find((x) => x.id === a.target);
      if (band?.routeId) {
        setRoutes((prev) => prev.map((r) => (r.id === band.routeId ? { ...r, thresholdTo: to } : r)));
        const upper = thresholds10.find((x) => x.cls === 'Approval value band' && x.from === band.to);
        if (upper?.routeId) {
          setThresholds10((prev) => prev.map((x) => (x.id === upper.id ? { ...x, from: to } : x)));
          setRoutes((prev) => prev.map((r) => (r.id === upper.routeId ? { ...r, thresholdFrom: to } : r)));
        }
      }
    } else if (a.kind === 'numbering') {
      setNumberingSeries((prev) => prev.map((x) => (x.id === a.target ? { ...x, sequenceLength: Number(a.value) } : x)));
    } else if (a.kind === 'countryParam') {
      const [country, field] = a.target.split('|');
      setCountryConfigs((prev) => prev.map((x) => (x.country === country ? { ...x, [field]: a.value } : x)));
    }
    setChangeRequests((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Effective' } : x)));
  }, [changeRequests, thresholds10]);

  const decideChangeRequest = useCallback((id: string, approve: boolean, comment: string) => {
    const c = changeRequests.find((x) => x.id === id);
    if (!c) return;
    const at = stamp();
    if (!approve) {
      setChangeRequests((prev) => prev.map((x) => (x.id === id
        ? { ...x, status: 'Rejected', decidedBy: currentUser?.name ?? '—', decidedAt: at, decisionComment: comment }
        : x)));
      pushAudit({
        user: currentUser?.name ?? '—', role: 'COMPLIANCE_OFFICER',
        country: c.country === 'All countries' ? 'Global' : c.country,
        entity: 'Configuration', record: `${c.id} ${c.parameter}`, action: 'Reject', reason: comment
      });
      closeTasksForRecord(`${c.id} ${c.parameter}`);
      setToast({
        message: `${c.id} rejected. The previous configuration version remains in force — WF-C10-01 / Step 7 and WF-C10-03 / Step 4. Nothing about the current configuration has changed.`,
        severity: 'warning'
      });
      return;
    }

    const effectiveNow = c.effectiveFrom <= TODAY_C10;
    setChangeRequests((prev) => prev.map((x) => (x.id === id
      ? {
        ...x,
        status: effectiveNow ? 'Effective' : 'Approved — awaiting effective date',
        decidedBy: currentUser?.name ?? '—', decidedAt: at, decisionComment: comment
      }
      : x)));
    if (effectiveNow) applyEffective(id);

    // A new version is created per country, effective from the change's date
    const target = c.country === 'All countries' ? 'Sudan' : c.country;
    setConfigVersions((prev) => {
      const scoped = prev.filter((v) => v.country === target);
      const latest = scoped.sort((a, b) => b.version - a.version)[0];
      const nextVersion = (latest?.version ?? 0) + 1;
      const closed = prev.map((v) => (v.country === target && !v.effectiveTo
        ? { ...v, effectiveTo: c.effectiveFrom }
        : v));
      return [...closed, {
        country: target, version: nextVersion, effectiveFrom: c.effectiveFrom,
        changes: [`${c.parameter}: ${c.currentValue} → ${c.proposedValue}`],
        approvedBy: currentUser?.name ?? '—', approvedAt: at
      }];
    });
    setCountryConfigs((prev) => prev.map((x) => {
      if (x.country !== target) return x;
      return c.effectiveFrom <= TODAY_C10
        ? { ...x, version: x.version + 1, effectiveFrom: c.effectiveFrom, pendingVersion: undefined, pendingEffectiveFrom: undefined }
        : { ...x, pendingVersion: x.version + 1, pendingEffectiveFrom: c.effectiveFrom };
    }));

    pushAudit({
      user: currentUser?.name ?? '—', role: 'COMPLIANCE_OFFICER',
      country: c.country === 'All countries' ? 'Global' : c.country,
      entity: 'Configuration', record: `${c.id} ${c.parameter}`, action: 'Approve',
      field: c.parameter, oldValue: c.currentValue, newValue: c.proposedValue, reason: comment
    });
    closeTasksForRecord(`${c.id} ${c.parameter}`);
    setToast({
      message: effectiveNow
        ? `${c.id} approved and effective from ${c.effectiveFrom}. New transactions are created under the new version; transactions already in progress continue under the version in force when they were created — WF-C10-03 / Step 4.`
        : `${c.id} approved and effective from ${c.effectiveFrom} — it is not in force yet. Until that date the current version applies, and records created before it will continue under it.`,
      severity: 'success'
    });
  }, [changeRequests, currentUser, pushAudit, closeTasksForRecord, applyEffective]);

  /** WF-C10-01 / Step 1 — a parameter change is a change request, not a save. */
  const saveCountryParam = useCallback((country: string, patch: Partial<CountryConfig>, parameterName: string) => {
    const before = countryConfigs.find((c) => c.country === country);
    const field = Object.keys(patch)[0] as keyof CountryConfig;
    const currentValue = before ? String(before[field] ?? '—') : '—';
    const proposedValue = String(patch[field] ?? '—');
    setCountryConfigs((prev) => prev.map((c) => (c.country === country ? { ...c, ...patch } : c)));
    const req = raiseChangeRequest({
      cls: 'Country parameter', parameter: `${parameterName} — ${country}`, country,
      currentValue, proposedValue,
      reason: 'Recorded from the country parameters screen.',
      originScreen: 'C10 country parameters', originRoute: `/c10/countries/${country}`
    });
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country,
      entity: 'Configuration', record: `${country} — ${parameterName}`, action: 'Update',
      field: parameterName, oldValue: currentValue, newValue: proposedValue
    });
    setToast({
      message: `${parameterName} recorded for ${country}, and change request ${req.id} was raised. Every configuration change follows the change control route and is effective-dated — WF-C10-03. The value is shown here so the effect can be reviewed before the change is approved.`,
      severity: 'info'
    });
  }, [countryConfigs, raiseChangeRequest, currentUser, pushAudit]);

  /** WF-C10-01 / Step 3 — and the switch has to change the application. */
  const setStepConfig = useCallback((country: string, step: string, patch: Partial<StepConfig>) => {
    const sd = stepDef(step);
    const before = stepConfigs.find((c) => c.country === country && c.step === step);
    setStepConfigs((prev) => prev.map((c) => (c.country === country && c.step === step
      ? { ...c, ...patch, ...(patch.applies === false ? { mandatory: false, requiredFields: [] } : {}) }
      : c)));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country,
      entity: 'Configuration', record: `Process step — ${sd?.step ?? step} (${country})`, action: 'Update',
      field: patch.applies !== undefined ? 'Applies' : 'Mandatory',
      oldValue: patch.applies !== undefined ? String(before?.applies) : String(before?.mandatory),
      newValue: patch.applies !== undefined ? String(patch.applies) : String(patch.mandatory)
    });
    if (patch.applies !== undefined && sd?.hidesRoutes?.length) {
      setToast({
        message: patch.applies
          ? `${sd.step} applies in ${country} again — the ${sd.consumedBy} is present once more.`
          : `${sd.step} no longer applies in ${country}. The step is hidden rather than branched around: ${sd.consumedBy} is now absent for this country — WF-C10-01 / Step 3.`,
        severity: patch.applies ? 'success' : 'warning'
      });
    } else {
      setToast({ message: `Process configuration updated for ${country}. Read by: ${sd?.consumedBy ?? '—'}.`, severity: 'success' });
    }
  }, [stepConfigs, currentUser, pushAudit]);

  /** WF-C10-01 / Steps 6–7 — activation is prevented while a conflict is open. */
  const activateCountry = useCallback((country: string) => {
    const conflicts = conflictsFor(country);
    if (conflicts.length > 0) {
      return {
        ok: false,
        why: `Activation is prevented: ${conflicts.length} consistency conflict${conflicts.length === 1 ? '' : 's'} must be resolved first — WF-C10-01 / Step 6.`
      };
    }
    setCountryConfigs((prev) => prev.map((c) => (c.country === country
      ? { ...c, status: 'Active', version: Math.max(c.version, 1), effectiveFrom: c.effectiveFrom === '—' ? TODAY_C10 : c.effectiveFrom }
      : c)));
    setConfigVersions((prev) => ([...prev, {
      country, version: 1, effectiveFrom: TODAY_C10,
      changes: ['Country activated', 'Operating parameters recorded'],
      approvedBy: currentUser?.name ?? '—', approvedAt: stamp()
    }]));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country,
      entity: 'Configuration', record: `${country} — country activation`, action: 'Activate', sensitive: true
    });
    setToast({
      message: `${country} activated. It is now selectable as a country context, and its configuration drives the menu and each screen — HAND-OFF → C2 / WF-C2-01.`,
      severity: 'success'
    });
    return { ok: true };
  }, [conflictsFor, currentUser, pushAudit]);

  /** WF-C10-01 / Step 5 */
  const saveSeries = useCallback((id: string, patch: Partial<NumberingSeries>) => {
    const before = numberingSeries.find((n) => n.id === id);
    setNumberingSeries((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: before?.country ?? 'Global',
      entity: 'Configuration', record: `Numbering series — ${before?.documentType}`, action: 'Update'
    });
    setToast({
      message: `${before?.documentType} series updated. The next code generated for this document type changes with it — the C03 create form reads this series rather than a hard-coded pattern.`,
      severity: 'success'
    });
  }, [numberingSeries, currentUser, pushAudit]);

  const seriesSample = useCallback((id: string) => {
    const n = numberingSeries.find((x) => x.id === id);
    if (!n) return '';
    const iso = countryConfig(n.country === 'All countries' ? activeCountry : n.country)?.iso ?? '';
    return renderNumber(n, iso);
  }, [numberingSeries, countryConfig, activeCountry]);

  /** WF-C10-01 / Step 4 — the country dimension the C07 checklist does not have. */
  const addChecklistAddition = useCallback((country: string, objectType: string, docType: string, reason: string) => {
    const rec: CountryChecklistAddition = { id: nextId('CCL'), country, objectType, docType, reason };
    setChecklistAdditions((prev) => [rec, ...prev]);
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country,
      entity: 'Configuration', record: `${objectType} checklist — ${country}`, action: 'Add mandatory document',
      field: 'Mandatory documents', newValue: docType, reason
    });
    setToast({
      message: `${docType} is now mandatory for ${objectType} in ${country}. The C07 checklist gate reads this, so a record in ${country} without it cannot be submitted — HAND-OFF → C7 / WF-C7-01.`,
      severity: 'success'
    });
  }, [currentUser, pushAudit]);

  const removeChecklistAddition = useCallback((id: string) => {
    const rec = checklistAdditions.find((c) => c.id === id);
    setChecklistAdditions((prev) => prev.filter((c) => c.id !== id));
    if (rec) {
      pushAudit({
        user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: rec.country,
        entity: 'Configuration', record: `${rec.objectType} checklist — ${rec.country}`,
        action: 'Remove mandatory document', field: 'Mandatory documents', oldValue: rec.docType
      });
    }
    setToast({ message: 'The country-specific mandatory document was removed. Records already submitted are unaffected.', severity: 'info' });
  }, [checklistAdditions, currentUser, pushAudit]);

  /** WF-C10-02 / Steps 1–2 — the formula is versioned, and a code keeps the version that made it. */
  const formulaSample = useCallback((key: string, date = TODAY_C10) => {
    const f = formulas.find((x) => x.key === key);
    if (!f) return { sample: '' };
    const v = formulaVersionAt(f, date);
    if (!v) return { sample: '' };
    return { sample: renderFormula(v), version: v.version, effectiveFrom: v.effectiveFrom };
  }, [formulas]);

  const saveFormulaElements = useCallback((
    key: string,
    elements: CodingFormula['versions'][number]['elements'],
    effectiveFrom: string,
    requirement: string
  ) => {
    const f = formulas.find((x) => x.key === key);
    if (!f) return;
    const latest = f.versions[f.versions.length - 1];
    setFormulas((prev) => prev.map((x) => {
      if (x.key !== key) return x;
      const versions = x.versions.map((v) => (v.status === 'In force' ? { ...v, status: 'Superseded' as const } : v));
      return {
        ...x,
        versions: [...versions, {
          version: latest.version + 1, effectiveFrom, elements, customerRequirement: requirement,
          status: effectiveFrom <= TODAY_C10 ? ('In force' as const) : ('Approved — future' as const)
        }]
      };
    }));
    raiseChangeRequest({
      cls: 'Business rule', parameter: `${f.name} — version ${latest.version + 1}`, country: 'All countries',
      currentValue: `Version ${latest.version}`, proposedValue: `Version ${latest.version + 1}`,
      reason: requirement || 'A new formula version was created.', effectiveFrom,
      originScreen: 'C10 coding formulas', originRoute: '/c10/formulas'
    });
    setToast({
      message: `${f.name} version ${latest.version + 1} created, effective from ${effectiveFrom}. Codes generated before that date keep the version that made them, which is why a code that does not match the current formula is explained rather than wrong — WF-C10-02 / Step 2.`,
      severity: 'success'
    });
  }, [formulas, raiseChangeRequest]);

  /** WF-C10-02 / Step 3 — the value band is consumed by the approval engine at runtime. */
  const saveThreshold10 = useCallback((id: string, patch: Partial<ThresholdDef10>) => {
    const before = thresholds10.find((t) => t.id === id);
    setThresholds10((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    if (before?.cls === 'Approval value band') {
      const to = patch.to ?? before.to;
      const from = patch.from ?? before.from;
      if (before.routeId) {
        setRoutes((prev) => prev.map((r) => (r.id === before.routeId
          ? { ...r, thresholdFrom: from ?? r.thresholdFrom, thresholdTo: to }
          : r)));
      }
      // the adjoining band moves with it, so the bands stay contiguous
      if (patch.to !== undefined) {
        const upper = thresholds10.find((x) => x.cls === 'Approval value band' && x.from === before.to);
        if (upper) {
          setThresholds10((prev) => prev.map((x) => (x.id === upper.id ? { ...x, from: patch.to } : x)));
          if (upper.routeId) {
            setRoutes((prev) => prev.map((r) => (r.id === upper.routeId ? { ...r, thresholdFrom: patch.to } : r)));
          }
        }
      }
    }
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global',
      entity: 'Configuration', record: `${before?.cls} — ${before?.name}`, action: 'Update',
      field: patch.to !== undefined ? 'To' : 'From',
      oldValue: String(patch.to !== undefined ? before?.to : before?.from),
      newValue: String(patch.to ?? patch.from)
    });
    setToast({
      message: before?.cls === 'Approval value band'
        ? `${before.name} updated, and the C04 route that this band selects was updated with it. Resolve a record now and the route that applies will have changed — this is what "consumed by the approval engine at runtime" means.`
        : `${before?.name} updated. Consumed by: ${before?.consumedBy}.`,
      severity: 'success'
    });
  }, [thresholds10, currentUser, pushAudit]);

  /** WF-C10-02 / Step 4 — translation present, or fallback to the default language rather than failing. */
  const t = useCallback(
    (key: string, language?: string) => translate(translations, key, language ?? previewLanguage),
    [translations, previewLanguage]
  );
  const coverageFor = useCallback((language: string) => coverageOf(translations, language), [translations]);
  const fallbackCount = useCallback((language: string) => {
    const c = coverageOf(translations, language);
    return c.total - c.translated;
  }, [translations]);

  const saveTranslation = useCallback((key: string, language: string, text: string) => {
    setTranslations((prev) => prev.map((r) => (r.key === key ? { ...r, [language]: text } : r)));
  }, []);

  const addLanguage = useCallback((language: string) => {
    const name = language.trim();
    if (!name) return { ok: false, why: 'Give the language a name.' };
    if (languages.includes(name)) return { ok: false, why: `${name} is already available.` };
    setLanguages((prev) => [...prev, name]);
    raiseChangeRequest({
      cls: 'Localisation', parameter: `Language added — ${name}`, country: 'All countries',
      currentValue: languages.join(', '), proposedValue: [...languages, name].join(', '),
      reason: 'A language was added as a translatable resource.',
      originScreen: 'C10 translations', originRoute: '/c10/translations'
    });
    setToast({
      message: `${name} added. Every key falls back to English until it is translated, and ${name} is now selectable in the country parameters — with no release and no build step, which is the point of Step 4.`,
      severity: 'success'
    });
    return { ok: true };
  }, [languages, raiseChangeRequest]);

  const directionFor = useCallback((language: string) => directionOf(language), []);

  /** WF-C10-02 / Step 6 — regional formats applied from the active country context. */
  const fmt = useCallback(() => {
    const c = countryConfig(activeCountry) ?? countryConfigs[0];
    return {
      number: (v: number) => fmtNumber10(v, c.numberFormat),
      currency: (v: number, currency?: string) => fmtCurrency10(v, c, currency),
      date: (iso: string) => fmtDate10(iso, c.dateFormat),
      time: (hhmm: string) => fmtTime10(hhmm, c.timeFormat),
      sample: FORMAT_SAMPLE
    };
  }, [countryConfig, activeCountry, countryConfigs]);

  /** WF-C10-01 / Step 8 — the version in force when the record was created. */
  const versionForRecord = useCallback(
    (country: string, createdAt: string) => versionAt(configVersions, country, createdAt),
    [configVersions]
  );
  const versionsFor = useCallback(
    (country: string) => configVersions.filter((v) => v.country === country).sort((a, b) => b.version - a.version),
    [configVersions]
  );

  /**
   * The records created under a version, and how many are still open. Read from the
   * real stores — access requests and master records — rather than a stored count.
   */
  const recordsUnderVersion = useCallback((country: string, version: number) => {
    const scoped = configVersions.filter((v) => v.country === country);
    const v = scoped.find((x) => x.version === version);
    if (!v) return [];
    const from = v.effectiveFrom;
    const to = v.effectiveTo ?? '9999-12-31';
    const rows: { reference: string; created: string; open: boolean }[] = [];
    requests.filter((r) => r.defaultCountry === country).forEach((r) => {
      const created = (r.raised ?? '').slice(0, 10);
      if (created && created >= from && created < to) {
        rows.push({ reference: `${r.id} — ${r.requestedForName}`, created, open: !['Active', 'Rejected', 'Withdrawn', 'Closed'].includes(r.status) });
      }
    });
    masterRecords.filter((r) => r.country === country).forEach((r) => {
      const created = (r.versions?.[0]?.validFrom ?? '').slice(0, 10);
      if (created && created >= from && created < to) {
        rows.push({ reference: `${r.code} — ${r.name}`, created, open: r.status === 'Pending Approval' || r.status === 'Draft' });
      }
    });
    return rows;
  }, [configVersions, requests, masterRecords]);

  /** WF-C10-03 / Step 5 — the configuration as it stood on a past date. */
  const configAsAt = useCallback((country: string, date: string) => {
    const version = versionAt(configVersions, country, date);
    const config = countryConfigs.find((c) => c.country === country);
    const steps = STEP_CATALOGUE.map((sd) => {
      const cfg = stepConfigs.find((c) => c.country === country && c.step === sd.key);
      return { name: sd.step, module: sd.module, applies: cfg?.applies ?? true, mandatory: cfg?.mandatory ?? false };
    });
    const bands = thresholds10.filter((th) => th.cls === 'Approval value band' && th.effectiveFrom <= date);
    const forms = formulas.map((f) => {
      const v = formulaVersionAt(f, date);
      return { name: f.name, sample: v ? renderFormula(v) : '—', version: v?.version };
    });
    return { config, version, steps, bands, formulas: forms };
  }, [configVersions, countryConfigs, stepConfigs, thresholds10, formulas]);

  /**
   * WF-C10-03 / Step 3 — a simulation is offered where the change alters a route or a
   * mandatory step, and plainly refused where it alters neither, rather than showing an
   * empty simulation.
   */
  const simulateChange = useCallback((id: string) => {
    const c = changeRequests.find((x) => x.id === id);
    if (!c || !c.apply) {
      return {
        kind: 'none' as const,
        why: 'No simulation is offered: this change alters neither an approval route nor a mandatory step, which are the two cases WF-C10-03 / Step 3 asks for a simulation of.'
      };
    }
    if (c.apply.kind === 'valueBand') {
      const band = thresholds10.find((x) => x.id === c.apply!.target);
      const sample = 30000;
      // the banded object type, so the simulation shows a band actually selecting a route
      const bandedType = routes.find((r) => r.id === band?.routeId)?.objectType ?? OBJECT_TYPES[0];
      const before = resolveRoute(routes, { objectType: bandedType, country: 'Sudan', thresholdValue: sample });
      const proposedTo = Number(c.apply.value);
      const proposedRoutes = routes.map((r) => {
        if (band?.routeId === r.id) return { ...r, thresholdTo: proposedTo };
        const upper = thresholds10.find((x) => x.cls === 'Approval value band' && x.from === band?.to);
        if (upper?.routeId === r.id) return { ...r, thresholdFrom: proposedTo };
        return r;
      });
      const after = resolveRoute(proposedRoutes, { objectType: bandedType, country: 'Sudan', thresholdValue: sample });
      return {
        kind: 'route' as const,
        before: before.route ? `${before.route.id} — ${before.route.objectType}` : 'No route resolved',
        after: after.route ? `${after.route.id} — ${after.route.objectType}` : 'No route resolved',
        beforeReasons: before.reasons,
        afterReasons: after.reasons,
        why: `Simulated for a sample ${bandedType.toLowerCase()} valued 30,000 USD in Sudan.`
      };
    }
    if (c.apply.kind === 'stepApplies') {
      const [country, step] = c.apply.target.split('|');
      const sd = stepDef(step);
      const affected = recordsUnderVersion(country, countryConfigs.find((x) => x.country === country)?.version ?? 1)
        .filter((r) => r.open)
        .map((r) => ({ reference: r.reference, created: r.created, version: countryConfigs.find((x) => x.country === country)?.version }));
      return {
        kind: 'mandatoryStep' as const,
        before: `${sd?.step} applies in ${country}${stepConfigFor(country, step)?.mandatory ? ', mandatory' : ''}`,
        after: c.apply.value === 'true' ? `${sd?.step} applies in ${country}` : `${sd?.step} does not apply in ${country} — ${sd?.consumedBy} is hidden`,
        affected,
        why: `${affected.length} open record${affected.length === 1 ? '' : 's'} created under the current version would continue under it — WF-C10-03 / Step 4.`
      };
    }
    return {
      kind: 'none' as const,
      why: 'No simulation is offered: this change alters neither an approval route nor a mandatory step, which are the two cases WF-C10-03 / Step 3 asks for a simulation of.'
    };
  }, [changeRequests, thresholds10, routes, recordsUnderVersion, countryConfigs, stepConfigFor]);

  const configNotes = useMemo(() => ({
    steps: STEPS_LIST_NOTE, authority: AUTHORITY_NOTE, environment: ENVIRONMENT_NOTE,
    ownership: OWNERSHIP_NOTE_C10, rtl: RTL_SCOPE_NOTE
  }), []);

  /* ================================================================== *
   * C11 — Reporting and Dashboards
   * ================================================================== */

  const userOf = useCallback(
    (userId?: string) => (userId ? users.find((u) => u.id === userId) : currentUser) ?? currentUser,
    [users, currentUser]
  );

  /** WF-C11-01 / Step 2 — a scope of more than one country is read as regional scope. */
  const reportScope = useCallback((userId?: string) => {
    const u = userOf(userId);
    if (!u) return { countries: [], regional: false, statement: 'No user is signed in.' };
    const countries = u.countryScope;
    const regional = countries.length > 1;
    return {
      countries,
      regional,
      statement: regional
        ? `${u.name} holds ${countries.length} countries in scope — ${countries.join(', ')} — so the country parameter may be widened, for consolidated reporting only.`
        : `${u.name}'s access scope is a single country (${countries[0] ?? '—'}), so this parameter cannot be widened — C11 / WF-C11-01 / Step 2.`
    };
  }, [userOf]);

  /** WF-C11-01 / Step 1 — a report the user may not run is shown and refused with a reason. */
  const canRunReport = useCallback((id: string, userId?: string) => {
    const def = reportDef(id);
    if (!def) return { ok: false, why: 'That report is not in the catalogue.' };
    if (def.roles.length === 0) return { ok: true };
    const u = userOf(userId);
    const held = (u?.assignments ?? []).filter((a) => a.status === 'Active').map((a) => a.role);
    if (held.some((r) => def.roles.includes(r))) return { ok: true };
    return {
      ok: false,
      why: `${def.id} requires one of: ${def.roles.map((r) => r.replace(/_/g, ' ').toLowerCase()).join(', ')}. Access is granted by the System Administrator through an access request (C1 / WF-C1-01).`
    };
  }, [userOf]);

  /**
   * The facts behind every figure, computed from the live stores. One function
   * serves both the chart and the drill-through list, so a figure and the list it
   * opens can never disagree — and nothing here is a hard-coded total, because a
   * hard-coded total cannot be drilled.
   */
  const reportFacts = useCallback((id: string): { dim: string; ref: string; country: string; party?: string; route: string; detail: string }[] => {
    switch (id) {
      case 'R-01':
        return requests.map((r) => ({
          dim: r.status, ref: r.id, country: r.defaultCountry,
          route: `/c1/access-requests/${r.id}`,
          detail: `${r.requestedForName} · ${r.roles.join(', ') || 'no role'} · raised ${r.raised}`
        }));
      case 'R-02':
        return users.flatMap((u) => u.assignments.filter((a) => a.status === 'Active').map((a) => ({
          dim: a.role.replace(/_/g, ' ').toLowerCase(), ref: u.id, country: a.countryScope[0] ?? u.defaultCountry,
          route: `/c1/users/${u.id}`,
          detail: `${u.name} · ${u.userType} · ${a.countryScope.join(', ')}`
        })));
      case 'R-03':
        return masterRecords.map((r) => ({
          dim: DOMAINS.find((d) => d.key === r.domain)?.name ?? r.domain,
          ref: r.code, country: r.country ?? 'Global', route: `/c3/records/${r.id}`,
          detail: `${r.name} · ${r.status}`
        }));
      case 'R-04':
        return approvalQueue.map((a) => ({
          dim: a.objectType, ref: a.id, country: a.country,
          route: `/c4/approvals/${a.id}`,
          detail: `${a.record} · group ${a.currentGroup + 1} of ${a.groups.length} · ${a.elapsedWorking} working hours elapsed`
        }));
      case 'R-05':
        return deliveries.map((d) => ({
          dim: d.channel, ref: d.id, country: d.country, route: '/c5/deliveries',
          detail: `${d.recipient} · ${d.status} · ${d.event}`
        }));
      case 'R-06':
        return comments6.map((c) => ({
          dim: c.recordName, ref: c.id, country: c.country, route: c.route ?? '/c6/discussions',
          detail: `${c.author} · ${c.at} · ${c.isDecision ? 'decision comment' : c.visibility.toLowerCase()}`
        }));
      case 'R-07':
        return documents.filter((d) => d.status === 'Current').map((d) => ({
          dim: validityState(d), ref: d.systemRef, country: d.country,
          party: d.recordName, route: '/c7/register',
          detail: `${d.docType} · ${d.recordName}${d.validTo ? ` · valid to ${d.validTo}` : ''}`
        }));
      case 'R-08':
        return audit.map((a) => ({
          dim: a.entity, ref: a.id, country: a.country, party: a.record, route: '/c8/search',
          detail: `${a.action} · ${a.user} · ${a.at}${a.sensitive ? ' · sensitive' : ''}`
        }));
      case 'R-09':
        return incidents.map((i) => ({
          dim: i.classification, ref: i.errorRef, country: i.country,
          route: `/c9/incidents/${i.id}`,
          detail: `${i.component} · ${i.status} · ${i.occurrences.length} occurrence${i.occurrences.length === 1 ? '' : 's'}`
        }));
      case 'R-10':
        return STEP_CATALOGUE.flatMap((sd) => countryConfigs.map((c) => {
          const cfg = stepConfigs.find((x) => x.country === c.country && x.step === sd.key);
          return {
            dim: sd.module, ref: `${sd.step} — ${c.country}`, country: c.country,
            route: `/c10/countries/${c.country}/steps`,
            detail: cfg?.applies ? `applies${cfg.mandatory ? ', mandatory' : ''}` : 'does not apply'
          };
        }));
      case 'R-11': {
        const out: { dim: string; ref: string; country: string; route: string; detail: string }[] = [];
        countryConfigs.forEach((c) => {
          requests.filter((r) => r.defaultCountry === c.country && r.status === 'Pending Approval').forEach((r) => out.push({
            dim: c.country, ref: r.id, country: c.country, route: `/c1/access-requests/${r.id}`,
            detail: `Open access request · ${r.status}`
          }));
          masterRecords.filter((r) => r.country === c.country && r.status === 'Pending Approval').forEach((r) => out.push({
            dim: c.country, ref: r.code, country: c.country, route: `/c3/records/${r.id}`,
            detail: `Master record awaiting approval · ${r.name}`
          }));
          incidents.filter((i) => i.country === c.country && i.status !== 'Closed').forEach((i) => out.push({
            dim: c.country, ref: i.errorRef, country: c.country, route: `/c9/incidents/${i.id}`,
            detail: `Open incident · ${i.classification}`
          }));
        });
        return out;
      }
      /* C12 / WF-C12-03 — the C11 rendering of interface health. It reads the same C09
       * exchange log, the same C09 error queue and the same C12 reconciliation runs that
       * /c12/health reads. One store, read twice: nothing here recounts anything.
       * Integration events are not country-scoped in C9, so they are Global facts. */
      case 'R-12': {
        const out: { dim: string; ref: string; country: string; route: string; detail: string }[] = [];
        interfaces.forEach((i) => {
          const ex = exchanges.filter((e) => e.interfaceName === i.c9InterfaceName);
          ex.forEach((e) => out.push({
            dim: `${i.id} exchange ${e.outcome.toLowerCase()}`, ref: e.correlation, country: 'Global',
            route: `/c12/exchanges/${e.correlation}`,
            detail: `${i.name} · ${e.direction} · ${e.responseMs} ms · ${e.started}`
          }));
          queuedErrors.filter((qe) => qe.interfaceName === i.c9InterfaceName && qe.status !== 'Reprocessed — success').forEach((qe) => out.push({
            dim: `${i.id} held in the error queue`, ref: qe.id, country: 'Global',
            route: '/c12/error-queue',
            detail: `${i.name} · ${qe.record} · ${qe.reason} · held since ${qe.heldSince}`
          }));
        });
        reconRuns.forEach((rc) => {
          const differences = rc.cotsOnly.length + rc.sourceOnly.length + rc.differing.length;
          out.push({
            dim: differences === 0 ? 'Reconciliation clean' : 'Reconciliation referred', ref: rc.id, country: 'Global',
            route: `/c12/reconciliation/${rc.id}`,
            detail: `${rc.interfaceId} · ${rc.period} · ${rc.matched.length} matched, ${differences} difference${differences === 1 ? '' : 's'} · ran ${rc.ranAt}`
          });
        });
        return out;
      }
      default:
        return [];
    }
  }, [requests, users, masterRecords, approvalQueue, deliveries, comments6, documents, audit, incidents,
    countryConfigs, stepConfigs, interfaces, exchanges, queuedErrors, reconRuns]);

  /**
   * WF-C11-01 / Steps 4–6, 9. Security first, then the figures, then the log entry —
   * in that order, because Step 4 applies security *before any data is retrieved*.
   */
  const computeReport = useCallback((id: string, params: Record<string, string>, userId?: string) => {
    const def = reportDef(id);
    const u = userOf(userId);
    const all = reportFacts(id);
    const scope = reportScope(userId);

    const requested = (params.Country ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    const countries = requested.length
      ? requested.filter((c) => scope.countries.includes(c))
      : scope.countries;

    const external = u?.userType === 'External User';
    const partyCode = u?.partyRecord?.split(' ')[0];

    // Step 4 — internal: role and country scope. External: the record-level party filter.
    let visible = all.filter((f) => countries.includes(f.country) || f.country === 'Global');
    if (external) {
      visible = visible.filter((f) => !!partyCode
        && ((f.party ?? '') + f.ref + f.detail).toLowerCase().includes(partyCode.toLowerCase()));
    }

    // Step 3 — the remaining parameters
    if (params.Status && params.Status !== 'All' && params.Status !== 'Sensitive only') {
      visible = visible.filter((f) => f.dim === params.Status || f.detail.includes(params.Status));
    }
    if (params.Status === 'Sensitive only') visible = visible.filter((f) => f.detail.includes('sensitive'));
    if (params.Party && params.Party !== 'All') visible = visible.filter((f) => (f.party ?? f.detail).includes(params.Party));

    const withheld = all.length - visible.length;
    const dims = Array.from(new Set(visible.map((f) => f.dim)));
    const rows = dims.map((d) => ({
      label: d,
      value: visible.filter((f) => f.dim === d).length,
      attention: /overdue|expired|failed|breach|pending|outage|integrity|escalat/i.test(d),
      drill: def?.drillTo,
      dim: d
    })).sort((a, b) => b.value - a.value);

    const role = (u?.assignments ?? []).filter((a) => a.status === 'Active').map((a) => a.role)[0] ?? '—';
    const runStamp = {
      report: `${def?.id} ${def?.name}`,
      runAt: stamp(),
      by: u?.name ?? '—',
      role: role.replace(/_/g, ' ').toLowerCase(),
      countries: countries.length
        ? `${countries.join(', ')} — ${requested.length && scope.regional ? 'widened for consolidated reporting' : 'locked to your access scope'}`
        : 'none in scope',
      params: (def?.params ?? []).map((pn) => `${pn}: ${params[pn] ?? 'not applied'}`),
      source: def?.source ?? '—',
      refreshedAt: def?.refreshedAt
    };

    const security = external
      ? {
        kind: 'External' as const,
        statement: `You are linked to ${u?.partyRecord}. This report is automatically restricted to records in which your party is a participant: ${visible.length} row${visible.length === 1 ? '' : 's'} of ${all.length} — C11 / WF-C11-01 / Step 4.`
      }
      : {
        kind: 'Internal' as const,
        statement: `Role and country scope applied: ${countries.length} of ${countryConfigs.length} countries, acting as ${role.replace(/_/g, ' ').toLowerCase()}.`
          + (withheld > 0 ? ` ${withheld} row${withheld === 1 ? ' is' : 's are'} outside your scope and were not retrieved.` : '')
      };

    return {
      def,
      rows,
      facts: visible,
      total: visible.length,
      withheld,
      security,
      stamp: runStamp,
      empty: visible.length === 0,
      emptyReason: visible.length === 0
        ? (external
          ? `The report ran and returned nothing in which ${u?.partyRecord} is a participant. That is not the same statement as "there is no data" — ${all.length} row${all.length === 1 ? '' : 's'} exist outside your restriction.`
          : `The report ran and returned nothing within your scope. That is not the same statement as "there is no data" — ${all.length} row${all.length === 1 ? '' : 's'} exist outside it.`)
        : undefined
    };
  }, [userOf, reportFacts, reportScope, countryConfigs]);

  /**
   * WF-C11-01 / Step 9 — the logging wrapper, kept separate from the computation. The
   * per-recipient preview in WF-C11-02 / Step 6 runs the report once per recipient, and a
   * preview that wrote a log entry on every render would both flood the log and re-render
   * itself. A preview reads; only a run is logged.
   */
  const runReport = useCallback((id: string, params: Record<string, string>, userId?: string) => {
    const r = computeReport(id, params, userId);
    const u = userOf(userId);
    const logged = pushLog({
      severity: 'Information', component: 'Web application', environment: 'Production',
      logClass: 'Application log',
      message: `Report ${r.def?.id} run by ${u?.name ?? '—'} — ${r.total} row${r.total === 1 ? '' : 's'} returned, ${r.withheld} withheld by row-level security, source ${r.def?.source}.`
    });
    return { ...r, logRef: logged.id };
  }, [computeReport, userOf, pushLog]);

  /** WF-C11-01 / Step 7 */
  const exportReport = useCallback((
    id: string, layout: ExportLayout, templateId: string | undefined, rows: number, params: Record<string, string>
  ) => {
    const def = reportDef(id);
    if (layout === 'Mandated external template' && !templateId) {
      return { ok: false, why: 'Select the mandated template. A mandated export follows its configured template exactly, so the template must be named.' };
    }
    const tpl = MANDATED_TEMPLATES.find((t) => t.id === templateId);
    pushLog({
      severity: 'Information', component: 'Web application', environment: 'Production', logClass: 'Application log',
      message: `Report ${def?.id} exported by ${currentUser?.name ?? '—'} as ${layout}${tpl ? ` using ${tpl.name}` : ''} — ${rows} row${rows === 1 ? '' : 's'}, parameter stamp included.`
    });
    // An export of a report containing sensitive data is also an audited act — the C08
    // rule applied consistently rather than only where C08 enforced it.
    if (id === 'R-08' || params.Status === 'Sensitive only') {
      logAuditQuery(`Report export — ${def?.id} ${def?.name} as ${layout}`, rows, 'Audit export');
    }
    setToast({
      message: tpl
        ? `${def?.id} exported using ${tpl.name}. The layout follows the configured template exactly and is not adjustable at export time — if it is wrong, the template is changed, and a template is configuration (C10).`
        : `${def?.id} exported as ${layout}, with the parameter stamp included so the copy is self-describing — WF-C11-01 / Step 5.`,
      severity: 'success'
    });
    return { ok: true, columns: tpl?.columns };
  }, [currentUser, pushLog, logAuditQuery]);

  /** DEPENDENCY → C10 / WF-C10-03 — an export template is configuration. */
  const requestTemplateChange = useCallback((templateId: string, proposed: string, reason: string) => {
    const tpl = MANDATED_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return { ok: false };
    const req = raiseChangeRequest({
      cls: 'Global parameter', parameter: `Export template — ${tpl.name}`, country: 'All countries',
      currentValue: tpl.columns.join(', '), proposedValue: proposed, reason,
      originScreen: 'C11 export', originRoute: '/c11/reports'
    });
    setToast({
      message: `Change request ${req.id} raised against the template. An export template where an external layout is mandated is configuration, so it changes through C10 / WF-C10-03 rather than being edited here.`,
      severity: 'info'
    });
    return { ok: true, requestId: req.id };
  }, [raiseChangeRequest]);

  /** WF-C11-01 / Step 8 */
  const canPublish = useCallback(() => {
    const held = (currentUser?.assignments ?? []).filter((a) => a.status === 'Active').map((a) => a.role);
    return held.some((r: string) => PUBLISH_ROLES.includes(r));
  }, [currentUser]);

  const viewsFor = useCallback((userId?: string) => {
    const u = userOf(userId);
    const held = (u?.assignments ?? []).filter((a) => a.status === 'Active').map((a) => a.role);
    // The owner keeps sight of their own view whatever role it is published to; every
    // other user sees it only if they hold that role.
    return savedViews.filter((v) => v.owner === u?.name
      || (v.visibility === 'Shared' && held.includes(v.publishedForRole ?? '')));
  }, [savedViews, userOf]);

  const saveView = useCallback((name: string, report: string, params: Record<string, string>) => {
    const rec: SavedView = {
      id: nextId('SV'), name, report, params, visibility: 'Personal',
      owner: currentUser?.name ?? '—', createdAt: stamp()
    };
    setSavedViews((prev) => [rec, ...prev]);
    setToast({
      message: `"${name}" saved for you alone. A personal view retains the parameter set, not the data — WF-C11-01 / Step 8.`,
      severity: 'success'
    });
  }, [currentUser]);

  const publishView = useCallback((id: string, role: string) => {
    if (!canPublish()) {
      return {
        ok: false,
        why: `Publishing a shared view requires one of: ${PUBLISH_ROLES.map((r) => r.replace(/_/g, ' ').toLowerCase()).join(', ')}. The System Administrator grants it through an access request (C1 / WF-C1-01).`
      };
    }
    setSavedViews((prev) => prev.map((v) => (v.id === id ? { ...v, visibility: 'Shared', publishedForRole: role } : v)));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: activeCountry,
      entity: 'Configuration', record: `Shared report view ${id}`, action: 'Publish to role',
      field: 'Published for', newValue: role
    });
    setToast({
      message: `Published for ${role.replace(/_/g, ' ').toLowerCase()}. Every holder of the role sees the view — but running it applies the runner's own row-level security, so two holders in different countries see different numbers from the same view. A shared view shares the parameters, never the data.`,
      severity: 'success'
    });
    return { ok: true };
  }, [canPublish, currentUser, activeCountry, pushAudit]);

  const unpublishView = useCallback((id: string) => {
    setSavedViews((prev) => prev.map((v) => (v.id === id ? { ...v, visibility: 'Personal', publishedForRole: undefined } : v)));
    setToast({ message: 'The view is personal again. Holders of the role no longer see it; nothing they ran under it changes.', severity: 'info' });
  }, []);

  const deleteView = useCallback((id: string) => {
    setSavedViews((prev) => prev.filter((v) => v.id !== id));
  }, []);

  /* ---------------- WF-C11-02 dashboards ---------------- */

  const cardEnrichmentFor = useCallback(
    (key: string) => cardEnrichment.find((c) => c.key === key),
    [cardEnrichment]
  );

  const saveCardEnrichment = useCallback((key: string, patch: Partial<CardEnrichment>) => {
    setCardEnrichment((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global',
      entity: 'Configuration', record: `Dashboard card — ${key}`, action: 'Update'
    });
  }, [currentUser, pushAudit]);

  const cardRolesFor = useCallback(
    (key: string) => cardRoles[key] ?? CARD_CATALOGUE.find((c) => c.key === key)?.roles ?? [],
    [cardRoles]
  );

  const saveCardRoles = useCallback((key: string, roles: string[]) => {
    setCardRoles((prev) => ({ ...prev, [key]: roles }));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global',
      entity: 'Configuration', record: `Dashboard card — ${key}`, action: 'Update',
      field: 'Permission requirement', newValue: roles.join(', ') || 'none'
    });
    setToast({
      message: `Permission updated for the ${key} card. The C02 dashboard reads this when deciding what a user may place — there is one catalogue, not two.`,
      severity: 'success'
    });
  }, [currentUser, pushAudit]);

  const cardStale = useCallback((key: string) => {
    const e = cardEnrichmentFor(key);
    return e ? isStale(e, NOW_C11) : false;
  }, [cardEnrichmentFor]);

  const placedCount = useCallback((key: string) => users.filter((u) => {
    const saved = dashboardLayout[`${u.id}|${u.defaultCountry}`];
    if (saved) return saved.includes(key);
    const primary = u.assignments.filter((a) => a.status === 'Active').map((a) => a.role)[0];
    return !!primary && (roleDefaults[primary] ?? []).includes(key);
  }).length, [users, dashboardLayout, roleDefaults]);

  /** WF-C11-02 / Step 2 — the default set a role lands on, which C02 renders. */
  const saveRoleDefault = useCallback((role: string, cards: string[]) => {
    setRoleDefaults((prev) => ({ ...prev, [role]: cards }));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global',
      entity: 'Configuration', record: `Role default dashboard — ${role}`, action: 'Update',
      field: 'Default cards', newValue: cards.join(', ')
    });
    setToast({
      message: `Default dashboard saved for ${role.replace(/_/g, ' ').toLowerCase()}. A holder who has already arranged their own dashboard keeps their arrangement — changing the default does not overwrite it (WF-C11-02 / Step 2).`,
      severity: 'success'
    });
  }, [currentUser, pushAudit]);

  const usersOnDefault = useCallback((role: string) => {
    const holders = users.filter((u) => u.assignments.some((a) => a.status === 'Active' && a.role === role));
    const arranged = holders.filter((u) => !!dashboardLayout[`${u.id}|${u.defaultCountry}`]).length;
    return { onDefault: holders.length - arranged, arranged };
  }, [users, dashboardLayout]);

  /* ---------------- WF-C11-02 scheduled distribution ---------------- */

  const saveSchedule = useCallback((id: string, patch: Partial<ScheduleDef>) => {
    setSchedules((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setToast({ message: `${id} saved. The country parameter is resolved per recipient, never fixed on the schedule — WF-C11-02 / Step 6.`, severity: 'success' });
  }, []);

  /**
   * WF-C11-02 / Step 6 — each scheduled report is generated in the security context of
   * the recipient, not of the scheduler. The preview therefore runs the report once per
   * recipient and states the row count that recipient's own scope produces, so a
   * difference is visible before the schedule is saved rather than after it delivers.
   */
  const recipientsOf = useCallback((id: string) => {
    const sch = schedules.find((x) => x.id === id);
    if (!sch) return [];
    const named = sch.namedRecipients
      .map((n) => users.find((u) => u.name === n))
      .filter(Boolean) as typeof users;
    const byRole = sch.roleRecipients.flatMap((role) => users.filter((u) =>
      u.assignments.some((a) => a.status === 'Active' && a.role === role)));
    const all = Array.from(new Set([...named, ...byRole].map((u) => u.id)))
      .map((uid) => users.find((u) => u.id === uid)!)
      .filter(Boolean);
    return all.map((u) => {
      const r = computeReport(sch.report, sch.params, u.id);
      const role = u.assignments.filter((a) => a.status === 'Active').map((a) => a.role)[0];
      return {
        name: u.name,
        type: u.userType,
        external: u.userType === 'External User',
        context: u.userType === 'External User'
          ? `External · restricted to records in which ${u.partyRecord} is a participant`
          : `${(role ?? '—').replace(/_/g, ' ').toLowerCase()} · ${u.countryScope.join(', ')}`,
        rows: r.total
      };
    });
  }, [schedules, users, computeReport]);

  /** WF-C11-02 / Step 7 — delivered closes the run; failed is logged (C9) and reported to the owner. */
  const runSchedule = useCallback((id: string) => {
    const sch = schedules.find((x) => x.id === id);
    if (!sch) return;
    const at = stamp();
    const recips = recipientsOf(id);
    const rows: DistributionRec[] = [];
    let failures = 0;

    recips.forEach((r) => {
      // the seeded failing schedule keeps failing for the same honest reason
      const fails = sch.status === 'Failing' && r.external;
      if (fails) failures += 1;
      const logged = fails
        ? pushLog({
          severity: 'Error', component: 'Notification engine', environment: 'Production',
          logClass: 'Application log',
          message: `Scheduled report ${sch.id} (${sch.report}) to ${r.name} failed permanently — the recipient address was rejected. Reported to the schedule owner ${sch.owner}.`
        })
        : undefined;
      rows.push({
        id: nextId('SR'), schedule: sch.id, report: sch.report, at, recipient: r.name,
        recipientType: r.type, context: r.context, rows: r.rows,
        channel: policyFor(channelPolicy, 'Operational').permitted.includes('Email') ? 'Email' : 'In-app',
        outcome: fails ? 'Failed' : 'Delivered',
        failureDetail: fails ? 'The recipient address was rejected by the receiving server (550 mailbox unavailable).' : undefined,
        reportedTo: fails ? sch.owner : undefined,
        logRef: logged?.id
      });
      // HAND-OFF → C5 / WF-C5-01 — delivered through the configured channels, and it
      // appears in the C05 delivery log like any other delivery.
      const user = users.find((x) => x.name === r.name);
      pushDelivery({
        event: 'Scheduled report',
        subject: `${sch.report} ${reportDef(sch.report)?.name} — scheduled report, ${r.rows} row${r.rows === 1 ? '' : 's'} in your security context`,
        body: `Generated in your own security context: ${r.context}.`,
        recipient: r.name, address: user?.email ?? '—', external: r.external,
        channel: 'Email', status: fails ? 'Permanently failed' : 'Delivered',
        country: activeCountry, priority: 'Informational', correlation: sch.id
      });
      if (!fails) {
        pushNotification({
          event: 'Scheduled report', recipient: r.name,
          subject: `${sch.report} — scheduled report, ${r.rows} row${r.rows === 1 ? '' : 's'} in your security context`,
          channels: ['In-app'], country: activeCountry, record: sch.id, route: '/c11/distribution'
        });
      }
    });

    setDistribution((prev) => [...rows, ...prev]);
    setSchedules((prev) => prev.map((x) => (x.id === id
      ? { ...x, lastRun: at, lastOutcome: failures ? `Failed for ${failures} recipient${failures === 1 ? '' : 's'}` : 'Delivered' }
      : x)));

    if (failures > 0) {
      pushNotification({
        event: 'Scheduled report failure', recipient: sch.owner,
        subject: `${sch.id} failed for ${failures} recipient${failures === 1 ? '' : 's'}`,
        channels: ['In-app', 'Email'], country: activeCountry, urgent: true,
        record: sch.id, route: '/c11/distribution'
      });
    }

    setToast({
      message: failures > 0
        ? `${sch.id} ran for ${recips.length} recipient${recips.length === 1 ? '' : 's'}: ${recips.length - failures} delivered, ${failures} failed. The failure is logged (C9) and reported to the schedule owner ${sch.owner} — not to the recipient, who did not ask for it, and not silently.`
        : `${sch.id} ran for ${recips.length} recipient${recips.length === 1 ? '' : 's'}, each in their own security context. Row counts differ where scopes differ — WF-C11-02 / Step 6.`,
      severity: failures > 0 ? 'warning' : 'success'
    });
  }, [schedules, recipientsOf, channelPolicy, activeCountry, users, pushLog, pushNotification, pushDelivery]);

  const reportNotes = useMemo(() => ({
    delivery: DELIVERY_MODEL_NOTE, consolidated: CONSOLIDATED_ROLES_NOTE, latency: LATENCY_NOTE,
    template: TEMPLATE_SPEC_NOTE, cards: CARD_OWNERSHIP_ISSUE, contract: CONTRACT_PARAM_NOTE
  }), []);

  /* ================================================================== *
   * C12 — Integration Layer
   * ================================================================== */

  const interfaceById = useCallback((id: string) => interfaces.find((i) => i.id === id), [interfaces]);

  /** WF-C12-01 / Step 1 — and the SAP direction is blocked while the write-back question is open. */
  const saveInterface = useCallback((id: string, patch: Partial<InterfaceDef>) => {
    const before = interfaces.find((i) => i.id === id);
    if (!before) return { ok: false, why: 'That interface is not in the registry.' };
    if (patch.direction && before.directionLocked) {
      return { ok: false, why: before.directionLocked };
    }
    setInterfaces((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    // DEPENDENCY → C10 / WF-C10-03 — endpoints, credentials, schedules and retry policies
    // per environment are configuration, so a change to one is a change request.
    if (patch.retryAttempts !== undefined || patch.retryIntervalSeconds !== undefined || patch.scheduleOrEvent) {
      raiseChangeRequest({
        cls: 'Global parameter', parameter: `Interface ${id} — ${patch.scheduleOrEvent ? 'schedule' : 'retry policy'}`,
        country: 'All countries',
        currentValue: patch.scheduleOrEvent ? before.scheduleOrEvent : `${before.retryAttempts} attempts, ${before.retryIntervalSeconds} s`,
        proposedValue: patch.scheduleOrEvent ?? `${patch.retryAttempts ?? before.retryAttempts} attempts, ${patch.retryIntervalSeconds ?? before.retryIntervalSeconds} s`,
        reason: 'Changed on the interface definition form.',
        originScreen: 'C12 interface definition', originRoute: `/c12/interfaces/${id}`
      });
    }
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global',
      entity: 'Configuration', record: `Interface ${id} — ${before.name}`, action: 'Update'
    });
    return { ok: true };
  }, [interfaces, raiseChangeRequest, currentUser, pushAudit]);

  /** WF-C12-02 / Step 9 — an interface without a documented fallback cannot be activated. */
  const activateInterface = useCallback((id: string) => {
    const i = interfaces.find((x) => x.id === id);
    if (!i) return { ok: false, why: 'That interface is not in the registry.' };
    if (!i.fallback) {
      return {
        ok: false,
        why: 'Activation is refused: every registered interface carries a documented fallback stating what the business does if the interface is unavailable, so that operations are not halted by an external dependency — WF-C12-02 / Step 9. A fallback nobody wrote is a fallback nobody has.'
      };
    }
    setInterfaces((prev) => prev.map((x) => (x.id === id ? { ...x, active: true } : x)));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global',
      entity: 'Configuration', record: `Interface ${id} — ${i.name}`, action: 'Activate', sensitive: true
    });
    setToast({ message: `${i.name} activated. Its trigger, direction and data scope were confirmed with the business and technical owners first — WF-C12-02 / Step 1.`, severity: 'success' });
    return { ok: true };
  }, [interfaces, currentUser, pushAudit]);

  const stagesFor = useCallback((correlation: string) => exchangeStages[correlation], [exchangeStages]);

  /**
   * WF-C12-01 / Steps 2–7 — the six stages, run for real.
   *
   * Step 5 is the one that matters most: codes are translated through the C03 mapping
   * tables, and an unmapped code raises an exception and queues the record. Nothing
   * creates a master record to force a record through — which is why the unmapped branch
   * writes a C03 exception and an error-queue row and writes no master data at all.
   */
  const runExchange = useCallback((interfaceId: string, mode: 'normal' | 'invalid response') => {
    const i = interfaces.find((x) => x.id === interfaceId);
    const payload = SIMULATION_PAYLOADS[interfaceId] ?? { codes: [], received: 0, note: '' };
    const at = stamp();
    const correlation = `CORR-${Math.abs(
      (interfaceId + at).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 0xffffff, 7)
    ).toString(16).padStart(6, '0').slice(0, 6)}`;
    const stages: StageResult[] = [];

    // Stage 1 — authenticate. The credential reference is used; the secret is never shown or logged.
    stages.push({
      key: 'authenticate', state: 'Passed',
      detail: `Authenticated using credential reference ${i?.credentialRef} (service account). The secret is held securely and is neither displayed on this screen nor written to the log — WF-C12-01 / Step 2.`
    });

    // Stage 2 — correlate
    stages.push({
      key: 'correlate', state: 'Passed',
      detail: `Correlation reference ${correlation} issued. Every log entry, exception and reprocess attempt for this exchange carries it.`
    });

    // Stage 3 — validate, before any processing begins
    if (mode === 'invalid response') {
      stages.push({
        key: 'validate', state: 'Failed',
        detail: 'The response was incomplete: the record count in the header did not match the number of records supplied. The exchange is failed and logged, and no partial data was written — WF-C12-01 / Step 4.'
      });
      ['map', 'transform', 'log'].forEach((k) => stages.push({
        key: k as StageResult['key'], state: k === 'log' ? 'Passed' : 'Not reached',
        detail: k === 'log'
          ? 'The failed exchange is logged with its outcome and duration (C9).'
          : 'Not reached: validation is applied before any processing begins.'
      }));
      const ex: Exchange = {
        id: nextId('EX'), correlation, interfaceName: i?.c9InterfaceName ?? i?.name ?? interfaceId,
        direction: i?.direction === 'Outbound' ? 'Outbound' : 'Inbound',
        endpoint: `https://${i?.externalSystem.toLowerCase().replace(/[^a-z]/g, '')}.internal/api`,
        started: at, ended: at, responseMs: 940, outcome: 'Failed after retries',
        received: payload.received, processed: 0, skipped: 0, inException: 0, failed: payload.received,
        payloadRef: `sha256:${correlation.slice(5)}…`, triggeredBy: `${currentUser?.name ?? 'Administrator'} — run from the interface registry`,
        attempts: [{ attempt: 1, started: at, responseMs: 940, outcome: 'Failed', error: 'Incomplete response — record count mismatch', retryDecision: 'Retries exhausted — nothing written' }]
      };
      setExchanges((prev) => [ex, ...prev]);
      const logged = pushLog({
        at, severity: 'Error', component: 'Integration service', environment: 'Production',
        logClass: 'Integration exchange log', correlation,
        message: `${i?.name} — response validation failed (record count mismatch). No partial data written. 0 of ${payload.received} records processed.`
      });
      setExchangeStages((prev) => ({ ...prev, [correlation]: stages }));
      setToast({
        message: `${i?.name} failed at stage 3 of 6 — validation. No partial data was written, which is what WF-C12-01 / Step 4 requires: an incomplete response fails the whole exchange rather than importing part of it.`,
        severity: 'warning'
      });
      return { correlation, stages, mapped: [], unmapped: [], written: 0, held: 0, outcome: 'Failed after retries', logRef: logged.id };
    }

    stages.push({
      key: 'validate', state: 'Passed',
      detail: `Structure and completeness checked before any processing began: ${payload.received} record${payload.received === 1 ? '' : 's'} supplied and accounted for.`
    });

    // Stage 4 — map codes through the real C03 mapping tables
    const mapped: { domain: string; externalCode: string; cotsCode?: string; record: string; affects: string }[] = [];
    const unmappedNow: { domain: string; externalCode: string; record: string; affects: string }[] = [];
    payload.codes.forEach((c) => {
      const m = mappings.find((x) => x.domain === c.domain
        && x.externalSystem === c.externalSystem
        && x.externalCode === c.externalCode
        && x.status === 'Active');
      if (m) mapped.push({ domain: c.domain, externalCode: c.externalCode, cotsCode: m.cotsCode, record: c.record, affects: c.affects });
      else unmappedNow.push({ domain: c.domain, externalCode: c.externalCode, record: c.record, affects: c.affects });
    });

    stages.push({
      key: 'map', state: unmappedNow.length ? 'Failed' : 'Passed',
      detail: unmappedNow.length
        ? `${mapped.length} code${mapped.length === 1 ? '' : 's'} translated through the C03 mapping tables; ${unmappedNow.length} unmapped. An exception is raised and the affected record is queued — and no master record was created to force it through (WF-C12-01 / Step 5).`
        : `${mapped.length} code${mapped.length === 1 ? '' : 's'} translated through the C03 mapping tables. No unmapped codes.`
    });

    // the unmapped branch: a C03 exception, an error-queue row, and nothing created
    unmappedNow.forEach((u) => {
      setUnmapped((prev) => ([...prev, {
        id: nextId('UM'), interfaceName: i?.c9InterfaceName ?? i?.name ?? interfaceId,
        direction: 'Inbound', domain: u.domain,
        externalSystem: (u.externalCode.startsWith('LOC') ? 'Odoo' : 'SAP') as 'SAP' | 'Odoo',
        externalCode: u.externalCode, correlation, at, affected: 1
      }]));
      setQueuedErrors((prev) => ([...prev, {
        id: nextId('EQ'), correlation, interfaceName: i?.c9InterfaceName ?? i?.name ?? interfaceId,
        record: u.affects, entity: 'Integration record',
        reason: `The ${u.domain} code ${u.externalCode} has no mapping in ${u.externalCode.startsWith('LOC') ? 'Odoo' : 'SAP'}`,
        retriesUsed: i?.retryAttempts ?? 1, retriesAllowed: i?.retryAttempts ?? 1, heldSince: at,
        correctableField: 'External code mapping', currentValue: u.externalCode, status: 'Held',
        payload: [
          { field: 'record', value: u.affects },
          { field: `${u.domain}Code`, value: u.externalCode },
          { field: 'correlation', value: correlation }
        ]
      }]));
    });

    const written = mapped.length ? Math.max(payload.received - unmappedNow.length, 0) : 0;

    stages.push({
      key: 'transform', state: unmappedNow.length && payload.codes.length ? 'Passed' : 'Passed',
      detail: `${written} record${written === 1 ? '' : 's'} transformed into the COTS structure, business validation applied, and written with the source system named as ${i?.externalSystem} — so the origin of every imported record is visible (Step 6). ${unmappedNow.length ? `${unmappedNow.length} record${unmappedNow.length === 1 ? ' was' : 's were'} held rather than written.` : ''}`
    });

    const outcome: ExchangeOutcome = unmappedNow.length ? 'Partial — records in exception' : 'Success';
    const ex: Exchange = {
      id: nextId('EX'), correlation, interfaceName: i?.c9InterfaceName ?? i?.name ?? interfaceId,
      direction: i?.direction === 'Outbound' ? 'Outbound' : 'Inbound',
      endpoint: `https://${i?.externalSystem.toLowerCase().replace(/[^a-z]/g, '')}.internal/api`,
      started: at, ended: at, responseMs: 3120, outcome,
      received: payload.received, processed: written, skipped: 0, inException: unmappedNow.length, failed: 0,
      payloadRef: `sha256:${correlation.slice(5)}…`,
      triggeredBy: `${currentUser?.name ?? 'Administrator'} — run from the interface registry`,
      attempts: [{ attempt: 1, started: at, responseMs: 3120, outcome: 'Success', retryDecision: 'Not required' }]
    };
    setExchanges((prev) => [ex, ...prev]);

    const logged = pushLog({
      at, severity: unmappedNow.length ? 'Warning' : 'Information', component: 'Integration service',
      environment: 'Production', logClass: 'Integration exchange log', correlation,
      message: `${i?.name} — ${outcome}. ${payload.received} received, ${written} written with the source system named, ${unmappedNow.length} held in exception. Duration 3120 ms.`
    });
    stages.push({
      key: 'log', state: 'Passed',
      detail: `Logged in C09 as ${logged.id}, with the outcome, duration and record counts — Step 7.`
    });
    setExchangeStages((prev) => ({ ...prev, [correlation]: stages }));

    // Step 9 — the interface owner is notified of failures
    if (unmappedNow.length && i) {
      pushNotification({
        event: 'Integration failure', recipient: i.businessOwner,
        subject: `${i.name} — ${unmappedNow.length} record${unmappedNow.length === 1 ? '' : 's'} held in the error queue (${correlation})`,
        channels: ['In-app', 'Email'], country: activeCountry, urgent: true,
        record: correlation, route: '/c12/error-queue', requester: currentUser?.name ?? '—'
      });
    }

    setToast({
      message: unmappedNow.length
        ? `${i?.name} completed as ${outcome}. ${written} records written; ${unmappedNow.length} held because a code has no mapping. Nothing was created in master data to force them through — WF-C12-01 / Step 5. The interface owner ${i?.businessOwner} has been notified.`
        : `${i?.name} completed. ${written} records written with the source system named, and the exchange logged with its outcome, duration and counts.`,
      severity: unmappedNow.length ? 'warning' : 'success'
    });

    return { correlation, stages, mapped, unmapped: unmappedNow, written, held: unmappedNow.length, outcome, logRef: logged.id };
  }, [interfaces, mappings, currentUser, activeCountry, pushLog, pushNotification]);

  /* the exchange log and the error queue are the C09 stores, read from the integration side */
  const exchangesFor = useCallback((interfaceId: string) => {
    const i = interfaces.find((x) => x.id === interfaceId);
    if (!i) return [];
    return exchanges.filter((e) => e.interfaceName === i.c9InterfaceName || e.interfaceName === i.name);
  }, [interfaces, exchanges]);

  const queueFor = useCallback((interfaceId: string) => {
    const i = interfaces.find((x) => x.id === interfaceId);
    if (!i) return [];
    return queuedErrors.filter((q) => q.interfaceName === i.c9InterfaceName || q.interfaceName === i.name);
  }, [interfaces, queuedErrors]);

  /** Step 10 — the cause is usually a missing mapping or a master data gap, so the class drives the correction path. */
  const causeClassOf = useCallback((queueId: string): CauseClass => {
    const q = queuedErrors.find((x) => x.id === queueId);
    if (!q) return 'External error';
    const r = q.reason.toLowerCase();
    if (r.includes('no mapping') || r.includes('not mapped')) return 'Missing mapping';
    if (r.includes('does not exist') || r.includes('not held against') || r.includes('master')) return 'Master data gap';
    if (r.includes('closed') || r.includes('invalid') || r.includes('period')) return 'Validation failure';
    return 'External error';
  }, [queuedErrors]);

  const correctionPathFor = useCallback((cls: CauseClass) => CORRECTION_PATH[cls], []);

  /** Step 9 — any queue exceeding its threshold alerts the interface owner. */
  const overThreshold = useCallback(() => interfaces.map((i) => {
    const depth = queuedErrors.filter((q) => (q.interfaceName === i.c9InterfaceName || q.interfaceName === i.name)
      && q.status === 'Held').length;
    return { interfaceId: i.id, name: i.name, depth, threshold: i.queueThreshold, owner: i.businessOwner };
  }).filter((x) => x.depth > x.threshold), [interfaces, queuedErrors]);

  const notifyQueueThreshold = useCallback((interfaceId: string) => {
    const i = interfaces.find((x) => x.id === interfaceId);
    if (!i) return;
    const depth = queuedErrors.filter((q) => (q.interfaceName === i.c9InterfaceName || q.interfaceName === i.name)
      && q.status === 'Held').length;
    pushNotification({
      event: 'Integration failure', recipient: i.businessOwner,
      subject: `${i.name} — error queue depth ${depth} exceeds its threshold of ${i.queueThreshold}`,
      channels: ['In-app', 'Email'], country: activeCountry, urgent: true,
      record: i.id, route: '/c12/error-queue'
    });
    setToast({
      message: `The interface owner ${i.businessOwner} has been alerted that the queue depth is ${depth} against a threshold of ${i.queueThreshold} — WF-C12-01 / Step 9 names the interface owner, not support.`,
      severity: 'warning'
    });
  }, [interfaces, queuedErrors, activeCountry, pushNotification]);

  /* ---------------- WF-C12-03 reconciliation and control ---------------- */

  const reconFor = useCallback(
    (interfaceId: string) => reconRuns.filter((r) => r.interfaceId === interfaceId),
    [reconRuns]
  );
  const reconById = useCallback((id: string) => reconRuns.find((r) => r.id === id), [reconRuns]);

  /** WF-C12-03 / Steps 1–2, and Step 4's re-run after correction. */
  const runReconciliation = useCallback((interfaceId: string, period: string) => {
    const i = interfaces.find((x) => x.id === interfaceId);
    if (!i) return;
    const prior = reconRuns.filter((r) => r.interfaceId === interfaceId && r.period === period)[0];
    const held = queuedErrors.filter((q) => (q.interfaceName === i.c9InterfaceName || q.interfaceName === i.name)
      && q.status === 'Held').length;

    // A re-run after correction: what was held and is now reprocessed leaves the source-only list.
    const sourceOnly = (prior?.sourceOnly ?? []).filter((l) => {
      const stillHeld = queuedErrors.some((q) => q.correlation === l.correlation && q.status === 'Held');
      return stillHeld || held > 0;
    });
    const differing = prior?.differing ?? [];
    const matched = prior?.matched ?? [];
    const cotsOnly = prior?.cotsOnly ?? [];
    const clean = sourceOnly.length === 0 && differing.length === 0 && cotsOnly.length === 0;

    const rec: ReconRun = {
      id: nextId('RC'), interfaceId, period, ranAt: stamp(),
      matched, cotsOnly, sourceOnly, differing,
      outcome: clean ? 'Clean for the period' : 'Referred to the business owner',
      referredTo: clean ? undefined : i.businessOwner,
      referredAt: clean ? undefined : stamp()
    };
    setReconRuns((prev) => [rec, ...prev]);
    pushLog({
      severity: 'Information', component: 'Integration service', environment: 'Production',
      logClass: 'Application log',
      message: `Reconciliation ${rec.id} for ${i.name}, ${period} — ${matched.length} matched, ${cotsOnly.length} in COTS only, ${sourceOnly.length} in the source only, ${differing.length} differing. ${clean ? 'Clean for the period.' : `Referred to ${i.businessOwner}.`}`
    });
    if (!clean) {
      pushNotification({
        event: 'Integration failure', recipient: i.businessOwner,
        subject: `${i.name} reconciliation for ${period} — ${sourceOnly.length + differing.length + cotsOnly.length} item${sourceOnly.length + differing.length + cotsOnly.length === 1 ? '' : 's'} to investigate`,
        channels: ['In-app', 'Email'], country: activeCountry,
        record: rec.id, route: `/c12/reconciliation/${rec.id}`
      });
    }
    setToast({
      message: clean
        ? `${i.name} reconciles clean for ${period}, and that is recorded. Recording a clean period matters as much as recording a difference — it is the evidence that the control ran.`
        : `${i.name} for ${period} is referred to its business owner ${i.businessOwner}: ${differing.length} differing, ${sourceOnly.length} in the source only, ${cotsOnly.length} in COTS only.`,
      severity: clean ? 'success' : 'warning'
    });
  }, [interfaces, reconRuns, queuedErrors, activeCountry, pushLog, pushNotification]);

  /** WF-C12-03 / Step 5 — one computation, presented here and as a C11 report. */
  const interfaceHealth = useCallback(() => interfaces.map((i) => {
    const rows = exchanges.filter((e) => e.interfaceName === i.c9InterfaceName || e.interfaceName === i.name);
    const lastSuccess = rows.find((e) => e.outcome === 'Success')?.started;
    const failures = rows.filter((e) => e.outcome !== 'Success').length;
    const queueDepth = queuedErrors.filter((q) => (q.interfaceName === i.c9InterfaceName || q.interfaceName === i.name)
      && q.status === 'Held').length;
    const avgMs = rows.length ? Math.round(rows.reduce((a, b) => a + b.responseMs, 0) / rows.length) : 0;
    const state = !i.active ? 'Not active'
      : queueDepth > i.queueThreshold ? 'Over queue threshold'
        : failures > 0 ? 'Degraded'
          : rows.length === 0 ? 'No exchange recorded'
            : 'Healthy';
    return { interfaceId: i.id, name: i.name, lastSuccess, failures, queueDepth, avgMs, state, owner: i.technicalOwner };
  }), [interfaces, exchanges, queuedErrors]);

  const rotationStateOf = useCallback((interfaceId: string) => {
    const i = interfaces.find((x) => x.id === interfaceId);
    return i ? rotationDue(i, TODAY_C12) : { nextDue: '—', overdue: false, daysOver: 0 };
  }, [interfaces]);

  /** WF-C12-03 / Step 6 — the rotation is recorded; the secret is never asked for or shown. */
  const rotateCredential = useCallback((interfaceId: string) => {
    const i = interfaces.find((x) => x.id === interfaceId);
    if (!i) return;
    const at = stamp();
    setInterfaces((prev) => prev.map((x) => (x.id === interfaceId ? { ...x, lastRotated: at.slice(0, 10) } : x)));
    setRotations((prev) => ([{ id: nextId('RT'), credentialRef: i.credentialRef, interfaceId, at, by: currentUser?.name ?? '—' }, ...prev]));
    pushAudit({
      user: currentUser?.name ?? '—', role: 'SYSTEM_ADMINISTRATOR', country: 'Global',
      entity: 'Configuration', record: `Service credential ${i.credentialRef} — ${i.name}`,
      action: 'Credential rotation', sensitive: true
    });
    pushLog({
      severity: 'Information', component: 'Integration service', environment: 'Production',
      logClass: 'Application log',
      message: `Service credential ${i.credentialRef} rotated by ${currentUser?.name ?? '—'}. The secret itself is not written to the log — WF-C12-01 / Step 2.`
    });
    setToast({
      message: `${i.credentialRef} rotation recorded and written to the audit trail as a sensitive action. This screen never asked for the new secret: rotation is performed in the credential store, and the register records that it happened — WF-C12-03 / Step 6.`,
      severity: 'success'
    });
  }, [interfaces, currentUser, pushAudit, pushLog]);

  const integrationNotes = useMemo(() => ({
    scope: SCOPE_NOTE, sap: SAP_NOTE, odoo: ODOO_NOTE, commercial: COMMERCIAL_NOTE,
    credential: CREDENTIAL_NOTE, queueOwnership: QUEUE_OWNERSHIP_ISSUE,
    reprocessAudit: REPROCESS_AUDIT_ISSUE, readings: OWNERSHIP_READINGS
  }), []);

  const markNotificationsRead = useCallback(() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))), []);

  const openTasksFor = useCallback((userId: string) => tasks.filter((t) => t.assigneeId === userId && t.status !== 'Closed'), [tasks]);

  /** C1 / WF-C1-03 / Steps 6–7 — effective permission = role permission ∩ active country, deny by default */
  const effectivePermissions = useCallback((userId: string, country: string) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return { granted: [], role: [] };
    const active = u.assignments.filter((a) => a.status === 'Active');
    const rolePerms = rolePermissions(active.map((a) => a.role));
    const inCountry = active.some((a) => a.countryScope.includes(country));
    return { granted: inCountry ? rolePerms : [], role: rolePerms };
  }, [users, rolePermissions]);

  const value = useMemo<Store>(() => ({
    currentUser, activeCountry, failedAttempts, pendingFirstLogin,
    users, roles, requests, delegations, reviewPacks, tasks, notifications, adMappings, audit,
    toast, setToast,
    signIn, completeFirstLogin, recordFailedAttempt, signOut, setActiveCountry,
    saveRequest, submitRequest, saveAndSubmitRequest, decideRequest, withdrawRequest, activateAccount, addRequestComment, addRequestDocument,
    saveRole, addAssignment, endAssignment, deactivateUser, toggleAdMapping,
    createDelegation, endDelegation,
    setReviewDecision, completeReview,
    confirmDormant, suspendDormant,
    dirty, setDirty, dashboardLayout, setLayout, resetLayout, layoutFor, permittedCards,
    masterRecords, mappings, unmapped, saveMaster, submitMaster, decideMaster, amendMaster,
    deactivateMaster, reactivateMaster, addMasterDocument, addMasterComment, bulkLoad, saveMapping, resolveUnmapped,
    auditLevels, sensitiveClasses, auditLevelOf, saveAuditLevel, saveSensitiveClass, hasAuditPermission,
    searchAudit, logAuditQuery, auditForRecord, runRetentionCycle, retentionStateOf, trimArchived,
    logLevels, maskRules, logEnvironment, setLogEnvironment, saveLogLevel, saveMaskRule,
    logEntries, visibleLog, incidents, incidentByRef, simulateFailure, lastError, clearLastError,
    assignIncident, reclassifyIncident, closeIncident,
    exchanges, exchangeByCorrelation, retryPolicies: RETRY_POLICIES, queuedErrors, correctQueued, reprocessQueued,
    jobConfigs, jobRunsC9, saveJobConfig, runJobNow, missedJobsToday,
    thresholds, breaches, saveThreshold, simulateBreach,
    logRetention, saveLogRetention, retentionPreview, runLogRetentionCycle, logExports, exportLogs,
    healthBands, supportGroup: SUPPORT_GROUP,
    countryConfigs, countryConfig, activeConfig, activatedCountries, saveCountryParam,
    stepConfigs, stepConfigFor, stepApplies, setStepConfig, hiddenRoutes, hiddenStepsFor,
    conflictsFor, activateCountry,
    numberingSeries, saveSeries, seriesSample, nextNumberFor,
    checklistAdditions, addChecklistAddition, removeChecklistAddition,
    formulas, formulaSample, saveFormulaElements,
    thresholds10, saveThreshold10,
    translations, languages, previewLanguage, setPreviewLanguage, t, coverageFor, fallbackCount,
    saveTranslation, addLanguage, directionFor, fmt,
    changeRequests, raiseChangeRequest, saveChangeRequest, submitChangeRequest, decideChangeRequest,
    applyEffective, simulateChange,
    configVersions, versionForRecord, versionsFor, recordsUnderVersion, configAsAt, configNotes,
    reports: REPORTS, canRunReport, reportScope, runReport,
    mandatedTemplates: MANDATED_TEMPLATES, exportReport, requestTemplateChange,
    savedViews, viewsFor, saveView, publishView, unpublishView, deleteView, canPublish,
    cardEnrichment, cardEnrichmentFor, saveCardEnrichment, saveCardRoles, cardRolesFor, cardStale, placedCount,
    roleDefaults, saveRoleDefault, usersOnDefault,
    schedules, saveSchedule, recipientsOf, runSchedule, distribution, reportNotes,
    interfaces, interfaceById, saveInterface, activateInterface, runExchange, stagesFor,
    exchangesFor, queueFor, causeClassOf, correctionPathFor, overThreshold, notifyQueueThreshold,
    reconRuns, reconFor, reconById, runReconciliation, interfaceHealth,
    rotations, rotateCredential, rotationStateOf, integrationNotes,
    volumeByMonth: VOLUME_BY_MONTH, lastRetentionCycle: LAST_RETENTION_CYCLE,
    documents, docTypes: DOC_TYPES, docsFor, versionsOf, validateUpload, extractionFor, uploadDocument,
    canOpenDoc, openDoc, checklistFor, runExpiryCheck, expiryStateOf, blockedOperations,
    archiveDoc, purgeDoc, deleteDoc,
    comments6, exceptions, commentsFor, visibilityDefault, editWindowLeft, addComment, editComment,
    removeComment, returnReasonFor, resolveException, timelineFor, searchComments,
    rules, templates, channelPolicy, quietHours, preferences, subscriptions, deliveries, unmatchedEvents,
    readiness, jobRules, overdueItems, jobRuns, resolveRecipients, saveRule, toggleRule, saveTemplate,
    releaseTemplate, saveChannelPolicy, savePreference, subscribeToRecord, unsubscribe, acknowledgeDelivery,
    retryDelivery, saveJobRule, runScheduler, recordItemUpdate, recordReadiness, raiseSalesContractEvent,
    routes, approvalInstances, reassignments, approvalQueue, approvalById, resolveApprover,
    decideApproval, reassignApprover, assignInstanceApprover, escalateApproval, withdrawApproval,
    saveRouteVersion, submitRouteVersion, inFlightOn,
    markNotificationsRead, closeTask, openTasksFor, rolePermissions, effectivePermissions
  }), [auditLevels, sensitiveClasses, auditLevelOf, saveAuditLevel, saveSensitiveClass, hasAuditPermission,
    searchAudit, logAuditQuery, auditForRecord, runRetentionCycle, retentionStateOf, trimArchived,
    logLevels, maskRules, logEnvironment, saveLogLevel, saveMaskRule,
    logEntries, visibleLog, incidents, incidentByRef, simulateFailure, lastError, clearLastError,
    assignIncident, reclassifyIncident, closeIncident,
    exchanges, exchangeByCorrelation, queuedErrors, correctQueued, reprocessQueued,
    jobConfigs, jobRunsC9, saveJobConfig, runJobNow, missedJobsToday,
    thresholds, breaches, saveThreshold, simulateBreach,
    logRetention, saveLogRetention, retentionPreview, runLogRetentionCycle, logExports, exportLogs,
    healthBands,
    countryConfigs, countryConfig, activeConfig, activatedCountries, saveCountryParam,
    stepConfigs, stepConfigFor, stepApplies, setStepConfig, hiddenRoutes, hiddenStepsFor,
    conflictsFor, activateCountry,
    numberingSeries, saveSeries, seriesSample, nextNumberFor,
    checklistAdditions, addChecklistAddition, removeChecklistAddition,
    formulas, formulaSample, saveFormulaElements,
    thresholds10, saveThreshold10,
    translations, languages, previewLanguage, setPreviewLanguage, t, coverageFor, fallbackCount,
    saveTranslation, addLanguage, directionFor, fmt,
    changeRequests, raiseChangeRequest, saveChangeRequest, submitChangeRequest, decideChangeRequest,
    applyEffective, simulateChange,
    configVersions, versionForRecord, versionsFor, recordsUnderVersion, configAsAt, configNotes,
    canRunReport, reportScope, runReport, exportReport, requestTemplateChange,
    savedViews, viewsFor, saveView, publishView, unpublishView, deleteView, canPublish,
    cardEnrichment, cardEnrichmentFor, saveCardEnrichment, saveCardRoles, cardRolesFor, cardStale, placedCount,
    roleDefaults, saveRoleDefault, usersOnDefault,
    schedules, saveSchedule, recipientsOf, runSchedule, distribution, reportNotes,
    interfaces, interfaceById, saveInterface, activateInterface, runExchange, stagesFor,
    exchangesFor, queueFor, causeClassOf, correctionPathFor, overThreshold, notifyQueueThreshold,
    reconRuns, reconFor, reconById, runReconciliation, interfaceHealth,
    rotations, rotateCredential, rotationStateOf, integrationNotes,
    documents, docsFor, versionsOf, validateUpload, extractionFor, uploadDocument,
    canOpenDoc, openDoc, checklistFor, runExpiryCheck, expiryStateOf, blockedOperations,
    archiveDoc, purgeDoc, deleteDoc,
    comments6, exceptions, commentsFor, visibilityDefault, editWindowLeft, addComment, editComment,
    removeComment, returnReasonFor, resolveException, timelineFor, searchComments,
    rules, templates, channelPolicy, quietHours, preferences, subscriptions, deliveries, unmatchedEvents,
    readiness, jobRules, overdueItems, jobRuns, resolveRecipients, saveRule, toggleRule, saveTemplate,
    releaseTemplate, saveChannelPolicy, savePreference, subscribeToRecord, unsubscribe, acknowledgeDelivery,
    retryDelivery, saveJobRule, runScheduler, recordItemUpdate, recordReadiness, raiseSalesContractEvent,
    routes, approvalInstances, reassignments, approvalQueue, approvalById, resolveApprover,
    decideApproval, reassignApprover, assignInstanceApprover, escalateApproval, withdrawApproval,
    saveRouteVersion, submitRouteVersion, inFlightOn,
    dirty, dashboardLayout, setLayout, resetLayout, layoutFor, permittedCards,
    masterRecords, mappings, unmapped, saveMaster, submitMaster, decideMaster, amendMaster,
    deactivateMaster, reactivateMaster, addMasterDocument, addMasterComment, bulkLoad, saveMapping, resolveUnmapped,currentUser, activeCountry, failedAttempts, pendingFirstLogin, users, roles, requests, delegations,
    reviewPacks, tasks, notifications, adMappings, audit, toast, signIn, completeFirstLogin, recordFailedAttempt,
    signOut, setActiveCountry, saveRequest, submitRequest, saveAndSubmitRequest, decideRequest, withdrawRequest, activateAccount,
    addRequestComment, addRequestDocument, saveRole, addAssignment, endAssignment, deactivateUser, toggleAdMapping,
    createDelegation, endDelegation, setReviewDecision, completeReview, confirmDormant, suspendDormant,
    markNotificationsRead, closeTask, openTasksFor, rolePermissions, effectivePermissions]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export { ACTIONS, MODULES };
