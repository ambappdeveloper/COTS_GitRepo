/**
 * The integrated route table — v1.2.
 *
 * v1.2 answers the mock-up review: there is no second navigation bar and no separate integrated home
 * page. **The Core C2 shell is the only shell and the only menu**, and every screen — Core, Shared,
 * the Export bridge and the integration screens — renders inside it. The country-context screen is
 * gone; sign-in lands on the Core home page and the country is switched from the header.
 *
 * This file is configuration, not screens. Every element below is a page component that already
 * exists in the Core prototype or the Shared prototype, imported in place from its own folder — no
 * screen was copied into this project, and neither source tree was modified.
 *
 * Two rules govern the paths:
 *   1. Core screens keep their original paths (`/login`, `/home`, `/c1…/c12`) and Shared screens
 *      keep theirs (`/s01…/s11`), so every internal link inside those two prototypes still resolves.
 *      Their path prefixes do not collide, which is what makes one route table possible.
 *   2. Where both prototypes claim the same path — only `/inbox` does — the integrated screen wins
 *      and both module inboxes are reachable beside it.
 *
 * Everything Core and Shared is behind the Core sign-in, because WF-INT-11 makes the Core session
 * the thing that establishes country, role and permission scope for all module work.
 */

import React from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

/* ---- the integration layer (the only new screens) ------------------------------------------- */
import { ShellBridge } from './shell/ShellBridge';
import { SharedScreenGuard } from './shell/SharedScreenBoundary';
import JourneyMap from './pages/JourneyMap';
import DocumentChain from './pages/DocumentChain';
import IntegratedInbox from './pages/IntegratedInbox';
import ExportModule from './pages/ExportModule';
import { ExportKeyRedirect } from './export/ExportKeyRedirect';
import { ExportPageFrame } from './export/ExportPageFrame';

/* ---- Export prototype, imported in place — v1.4 ---------------------------------------------
   The same treatment Core and Shared have had since v1.2. Every page below comes from the Export
   contribution's own `src`; not one of its files was copied into this project or modified. */
import { Dashboard } from '@export/pages/Dashboard';
import { HomePage } from '@export/pages/HomePage';
import { ProcessMapPage } from '@export/pages/process-map';
import { OpportunityDetail, OpportunityForm, OpportunityList, PositionReport } from '@export/pages/origination';
import { AllocationModule } from '@export/pages/allocation';
import { AdvancePaymentDetail, AdvancePaymentList } from '@export/pages/advance-payments';
import { FreightRatesPage } from '@export/pages/freight-rates';
import { MovementLegDetail, MovementModule } from '@export/pages/movement';
import { CloseOutModule } from '@export/pages/close-out';
import { PurchaseOrderDetail, PurchaseOrderForm } from '@export/pages/procurement';
import { IntakeReceiptDetail, PurchaseAgreementDetail, SourcingModule } from '@export/pages/sourcing';
import { ExecutionPlanForm } from '@export/pages/execution-plan-form';
import { ExportContractRequestForm } from '@export/pages/preclearance-form';
import { BudgetDetail, SeasonalPurchasePlanDetail } from '@export/pages/planning';
import { BudgetForm, SeasonalPurchasePlanForm } from '@export/pages/planning-forms';
import {
  FundForm,
  NewAgentBalanceForm,
  NewMaterialReceiptForm,
  NewReceivingLocationForm,
  NewWarehouseReceiptForm,
  PurchaseAgreementForm,
} from '@export/pages/sourcing-forms';
import { ContractDetail, ContractForm, ContractList } from '@export/pages/contracts';
import { PurchaseContractForm } from '@export/pages/purchase-contract-new';
import {
  ClearanceList,
  ClearanceWorkspace,
  DocumentsList,
  DocumentsWorkspace,
  PostShipmentList,
  PostShipmentWorkspace,
  StuffingList,
  StuffingWorkspace,
} from '@export/pages/execution-modules';
import { MaterialModule, TransportRequestDetail, TransportRequestForm } from '@export/pages/material';
import { ExceptionsQueue, VariantsPage } from '@export/pages/misc';
import { PreclearanceDetail, PreclearanceList } from '@export/pages/preclearance';
import { ShipmentDetail, ShipmentForm, ShipmentList } from '@export/pages/shipments';
import { RequireModule } from './integration/RequireModule';
import { MODULE_EXPORT, MODULE_SHARED } from './integration/session';
import { useExportSessionLifecycle } from './integration/useIdentity';

/* ---- Core prototype, imported in place ------------------------------------------------------ */
import { theme as coreTheme } from '@core/theme';
import { useStore as useCoreStore } from '@core/store';
import { AppShell as CoreShell } from '@core/layouts/AppShell';
import { ExternalLogin, Login, FirstLogin } from '@core/pages/Login';
import { Home, Inbox as CoreInbox } from '@core/pages/Home';
import { CountrySelect } from '@core/pages/C2/CountrySelect';
import { TeamView } from '@core/pages/C2/TeamView';
import { TaskAnalytics } from '@core/pages/C2/TaskAnalytics';
import { Domains } from '@core/pages/C3/Domains';
import { MasterRecordList, MasterRecordForm, MasterRecordDetail } from '@core/pages/C3/MasterRecords';
import { BulkLoad } from '@core/pages/C3/BulkLoad';
import { Mapping } from '@core/pages/C3/Mapping';
import { MyApprovals, ApprovalTask, SubmissionCheck } from '@core/pages/C4/Approvals';
import { SlaMonitor } from '@core/pages/C4/SlaMonitor';
import { RouteList, RouteBuilder } from '@core/pages/C4/Routes';
import { NotificationRules } from '@core/pages/C5/Rules';
import { DeliveryLog } from '@core/pages/C5/DeliveryLog';
import { Templates } from '@core/pages/C5/Templates';
import { Channels } from '@core/pages/C5/Channels';
import { MyPreferences, MySubscriptions } from '@core/pages/C5/Preferences';
import { AutomatedJobs, OverdueUpdates } from '@core/pages/C5/Jobs';
import { Discussions, RecordActivity } from '@core/pages/C6/Discussions';
import { DocumentRegister } from '@core/pages/C7/Register';
import { DocumentExpiry } from '@core/pages/C7/Expiry';
import { Retention } from '@core/pages/C7/Retention';
import { AuditSearch } from '@core/pages/C8/AuditSearch';
import { AuditConfiguration } from '@core/pages/C8/Configuration';
import { SensitiveMonitor } from '@core/pages/C8/Monitor';
import { AuditRetention } from '@core/pages/C8/Retention';
import { HealthDashboard } from '@core/pages/C9/Health';
import { IncidentList, IncidentDetail } from '@core/pages/C9/Incidents';
import { ExchangeLog, ExchangeDetail, ErrorQueue } from '@core/pages/C9/Integration';
import { JobLog } from '@core/pages/C9/Jobs';
import { LogLevels } from '@core/pages/C9/LogLevels';
import { MonitoringThresholds } from '@core/pages/C9/Monitoring';
import { LogRetention } from '@core/pages/C9/Retention';
import { CountryList, CountryParameters } from '@core/pages/C10/Countries';
import { ProcessSteps } from '@core/pages/C10/ProcessSteps';
import {
  NumberingSeriesPage,
  CodingFormulas,
  Thresholds10,
  Translations,
  RegionalFormats,
} from '@core/pages/C10/Rules';
import { ChangeRequests, ChangeRequestForm } from '@core/pages/C10/Changes';
import { ConfigVersions, ConfigurationReport } from '@core/pages/C10/Versions';
import { ReportCatalogue, ReportViewer, SavedViews } from '@core/pages/C11/Reports';
import { CardCatalogue, RoleDashboards } from '@core/pages/C11/Dashboards';
import { ScheduleList, ScheduleForm, DistributionLog } from '@core/pages/C11/Schedules';
import { InterfaceRegistry, InterfaceDefinition, InterfacesInScope } from '@core/pages/C12/Interfaces';
import { ExchangeLogC12, ExchangeDetailC12, ErrorQueueC12 } from '@core/pages/C12/Exchanges';
import {
  Reconciliation as C12Reconciliation,
  DifferenceInvestigation,
  InterfaceHealth,
  Credentials,
} from '@core/pages/C12/Control';
import { AccessRequestList, AccessRequestForm, AccessRequestDetail } from '@core/pages/C1/AccessRequests';
import { UserRegister, UserDetail } from '@core/pages/C1/Users';
import {
  PermissionCatalogue,
  RoleCatalogue,
  RoleDefinition,
  AdGroupMapping,
  EffectivePermissions,
} from '@core/pages/C1/Roles';
import { Delegations } from '@core/pages/C1/Delegations';
import { AccessReviewList, AccessReviewWorksheet, DormantAccounts } from '@core/pages/C1/AccessReviews';

/* ---- Shared prototype, imported in place --------------------------------------------------- */
import { theme as sharedTheme } from '@shared/theme';
import Landing from '@shared/pages/S01/Landing';
import MasterPlanList from '@shared/pages/S01/MasterPlanList';
import MasterPlanEditor from '@shared/pages/S01/MasterPlanEditor';
import Sourcing from '@shared/pages/S01/Sourcing';
import Processing from '@shared/pages/S01/Processing';
import Warehouse from '@shared/pages/S01/Warehouse';
import { ExpectedVsActual, PlanVsActual } from '@shared/pages/S01/Reports';
import Stub from '@shared/pages/stubs/Stubs';
import ControlPointBoard from '@shared/pages/S03/ControlPointBoard';
import InspectionList from '@shared/pages/S03/InspectionList';
import InspectionDetail from '@shared/pages/S03/InspectionDetail';
import { NcCase, NcList } from '@shared/pages/S03/NonConformity';
import { ConditionChecks, Programmes } from '@shared/pages/S03/ChecksAndProgrammes';
import ContractTerms from '@shared/pages/S03/ContractTerms';
import { GoodsInTransit, MovementDetail, MovementList } from '@shared/pages/S05/Movements';
import { ServiceRequests, Shunting } from '@shared/pages/S05/ServiceRequestAndShunting';
import { FreightRates, RateHistory } from '@shared/pages/S05/FreightRates';
import Clearance from '@shared/pages/S05/Clearance';
import { ComplianceDashboard, MonitoringDuties } from '@shared/pages/S04/DashboardAndMonitoring';
import { VarianceCaseList, VarianceCaseWorkspace } from '@shared/pages/S04/VarianceCases';
import { Reconciliation as S04Reconciliation } from '@shared/pages/S04/Reconciliation';
import { IncidentWorkspace, InsuranceList } from '@shared/pages/S04/Insurance';
import Position from '@shared/pages/S06/Position';
import Transfer from '@shared/pages/S06/Transfer';
import { Prices, WarehouseStock } from '@shared/pages/S06/StockAndPrices';
import Sales from '@shared/pages/S06/Sales';
import Catalogue from '@shared/pages/S02/Catalogue';
import Calculator from '@shared/pages/S02/Calculator';
import Deal, { Performance } from '@shared/pages/S02/Deal';
import ClaimRegister, { ClaimRegistration } from '@shared/pages/S07/Register';
import ClaimWorkspace from '@shared/pages/S07/ClaimWorkspace';
import { ClaimsReporting, ContractExposure } from '@shared/pages/S07/Reports';
import FeedbackRegister, { FeedbackCapture } from '@shared/pages/S09/Register';
import FeedbackRecord from '@shared/pages/S09/FeedbackRecord';
import { FeedbackCoverage, SatisfactionDashboard, SatisfactionReporting } from '@shared/pages/S09/Reports';
import Structure from '@shared/pages/S10/Structure';
import Directory, { AreaLeadership, PersonRecord } from '@shared/pages/S10/Directory';
import RoleMatrix, { DirectoryReports, ResolutionTrace, RoleGaps } from '@shared/pages/S10/Roles';
import Portfolio, { ProjectRegistration } from '@shared/pages/S08/Portfolio';
import ProjectWorkspace from '@shared/pages/S08/ProjectWorkspace';
import PortfolioReports from '@shared/pages/S08/Reports';
import Library, { ItemDetail, LibrarySearch, PublishMaterial } from '@shared/pages/S11/Library';
import { Announcements, ModuleHelp, Placements } from '@shared/pages/S11/Content';
import ReviewQueue, { LibraryReports } from '@shared/pages/S11/Review';

/* -------------------------------------------------------------------------------------------- */

/**
 * The outermost layout. It renders no chrome of its own — the Core shell below is the only one —
 * and does two things: it keeps the session handed to the Export frame in step with the Core one
 * (v1.1), and it supplies the Core shell with what it needs to be the single menu (v1.2).
 */
const IntegratedLayout: React.FC = () => {
  useExportSessionLifecycle();
  return (
    <ShellBridge>
      <Box sx={{ minHeight: '100vh', bgcolor: '#F4F6F8' }}>
        <Outlet />
      </Box>
    </ShellBridge>
  );
};

/**
 * WF-INT-11: no Shared or Export screen is reachable without the Core session that sets the
 * country and permission scope. Same rule the Core prototype applies to its own screens.
 */
const RequireSession: React.FC = () => {
  const { currentUser } = useCoreStore();
  const loc = useLocation();
  if (!currentUser) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  return <Outlet />;
};

/** Each module set keeps its own MUI theme, so neither prototype's look is changed. */
const CoreArea: React.FC = () => (
  <ThemeProvider theme={coreTheme}>
    <Outlet />
  </ThemeProvider>
);

/**
 * v1.5 — and one boundary above every Shared screen.
 *
 * Several Shared pages read a country-keyed table with a non-null assertion in their component body.
 * Standalone that is safe: the Shared prototype's own selector only offers countries its tables
 * cover. Here the country comes from the Core session, which offers four, and an unguarded
 * `undefined` in a render does not fail politely — it unmounts the whole React tree, so one missing
 * table row produced a white page and left every screen visited afterwards blank until reload.
 *
 * The known cases are answered rather than caught (`SharedCountryModels.ts` supplies S05's missing
 * row from the C10 configuration; `CountrySync` stops a country inheriting the previous one's
 * season). This is for the rest: the failure stays in the one screen, the shell and session survive,
 * and the reviewer is told which country could not be rendered instead of being shown another one's
 * data. It is here rather than in `SharedPageFrame` because the throws happen before a page reaches
 * its frame.
 */
const SharedArea: React.FC = () => (
  <ThemeProvider theme={sharedTheme}>
    <SharedScreenGuard>
      <Outlet />
    </SharedScreenGuard>
  </ThemeProvider>
);

const NotFound: React.FC = () => (
  <Box sx={{ p: 4 }}>
    <Typography sx={{ fontSize: 20, fontWeight: 500, mb: 1 }}>That address is not part of the demonstration</Typography>
    <Alert severity="info" sx={{ maxWidth: 800, mb: 2 }}>
      The integrated mockup carries the Core routes (<code>/home</code>, <code>/c1…/c12</code>), the Shared routes (
      <code>/s01…/s11</code>) and the Export bridge (<code>/export/…</code>). Anything else has no screen.
    </Alert>
    <Stack direction="row" spacing={1}>
      <Button variant="contained" component={Link} to="/">Integrated home</Button>
      <Button variant="outlined" component={Link} to="/journey">Journey map</Button>
    </Stack>
  </Box>
);

export default function App() {
  return (
    <Routes>
      <Route element={<IntegratedLayout />}>
        {/* the sign-in, and the two paths the review removed, kept as redirects so no link dies */}
        <Route element={<CoreArea />}>
          <Route path="/login" element={<Login />} />
          {/* WF-C1-01 Step 1 — the external login is its own screen, not a tab on the internal
              one. Both come from Core unchanged by this layer; the integrated app simply routes
              to both, as the Core prototype does. */}
          <Route path="/login/external" element={<ExternalLogin />} />
          <Route path="/first-login" element={<FirstLogin />} />
        </Route>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/select-country" element={<Navigate to="/home" replace />} />

        {/* everything else runs inside the one Core session and the one Core shell */}
        <Route element={<RequireSession />}>
          <Route element={<CoreArea />}>
            <Route element={<CoreShell />}>
              {/* ---- Core modules ------------------------------------------------------- */}

              <Route path="/home" element={<Home />} />
              {/* the Core C2 inbox on its own; /inbox is the integrated list across modules */}
              <Route path="/c2/inbox" element={<CoreInbox />} />
              <Route path="/c2/team" element={<TeamView />} />
              <Route path="/c2/analytics" element={<TaskAnalytics />} />

              <Route path="/c3/domains" element={<Domains />} />
              <Route path="/c3/domains/:domain" element={<MasterRecordList />} />
              <Route path="/c3/domains/:domain/new" element={<MasterRecordForm />} />
              <Route path="/c3/records/:id" element={<MasterRecordDetail />} />
              <Route path="/c3/bulk-load" element={<BulkLoad />} />
              <Route path="/c3/mapping" element={<Mapping />} />

              <Route path="/c4/approvals" element={<MyApprovals />} />
              <Route path="/c4/approvals/:id" element={<ApprovalTask />} />
              <Route path="/c4/submission-check" element={<SubmissionCheck />} />
              <Route path="/c4/sla" element={<SlaMonitor />} />
              <Route path="/c4/routes" element={<RouteList />} />
              <Route path="/c4/routes/:id" element={<RouteBuilder />} />

              <Route path="/c5/rules" element={<NotificationRules />} />
              <Route path="/c5/deliveries" element={<DeliveryLog />} />
              <Route path="/c5/templates" element={<Templates />} />
              <Route path="/c5/channels" element={<Channels />} />
              <Route path="/c5/preferences" element={<MyPreferences />} />
              <Route path="/c5/subscriptions" element={<MySubscriptions />} />
              <Route path="/c5/jobs" element={<AutomatedJobs />} />
              <Route path="/c5/overdue" element={<OverdueUpdates />} />

              <Route path="/c6/discussions" element={<Discussions />} />
              <Route path="/c6/activity/:key" element={<RecordActivity />} />

              <Route path="/c7/register" element={<DocumentRegister />} />
              <Route path="/c7/expiry" element={<DocumentExpiry />} />
              <Route path="/c7/retention" element={<Retention />} />

              <Route path="/c8/search" element={<AuditSearch />} />
              <Route path="/c8/configuration" element={<AuditConfiguration />} />
              <Route path="/c8/monitor" element={<SensitiveMonitor />} />
              <Route path="/c8/retention" element={<AuditRetention />} />

              <Route path="/c9" element={<HealthDashboard />} />
              <Route path="/c9/incidents" element={<IncidentList />} />
              <Route path="/c9/incidents/:id" element={<IncidentDetail />} />
              <Route path="/c9/exchanges" element={<ExchangeLog />} />
              <Route path="/c9/exchanges/:id" element={<ExchangeDetail />} />
              <Route path="/c9/error-queue" element={<ErrorQueue />} />
              <Route path="/c9/jobs" element={<JobLog />} />
              <Route path="/c9/levels" element={<LogLevels />} />
              <Route path="/c9/thresholds" element={<MonitoringThresholds />} />
              <Route path="/c9/retention" element={<LogRetention />} />

              <Route path="/c10/countries" element={<CountryList />} />
              <Route path="/c10/countries/:code" element={<CountryParameters />} />
              <Route path="/c10/countries/:code/steps" element={<ProcessSteps />} />
              <Route path="/c10/numbering" element={<NumberingSeriesPage />} />
              <Route path="/c10/formulas" element={<CodingFormulas />} />
              <Route path="/c10/thresholds" element={<Thresholds10 />} />
              <Route path="/c10/translations" element={<Translations />} />
              <Route path="/c10/formats" element={<RegionalFormats />} />
              <Route path="/c10/changes" element={<ChangeRequests />} />
              <Route path="/c10/changes/:id" element={<ChangeRequestForm />} />
              <Route path="/c10/versions" element={<ConfigVersions />} />
              <Route path="/c10/report" element={<ConfigurationReport />} />

              <Route path="/c11/reports" element={<ReportCatalogue />} />
              <Route path="/c11/reports/:id" element={<ReportViewer />} />
              <Route path="/c11/views" element={<SavedViews />} />
              <Route path="/c11/cards" element={<CardCatalogue />} />
              <Route path="/c11/role-dashboards" element={<RoleDashboards />} />
              <Route path="/c11/schedules" element={<ScheduleList />} />
              <Route path="/c11/schedules/:id" element={<ScheduleForm />} />
              <Route path="/c11/distribution" element={<DistributionLog />} />

              <Route path="/c12/interfaces" element={<InterfaceRegistry />} />
              <Route path="/c12/interfaces/:id" element={<InterfaceDefinition />} />
              <Route path="/c12/scope" element={<InterfacesInScope />} />
              <Route path="/c12/exchanges" element={<ExchangeLogC12 />} />
              <Route path="/c12/exchanges/:id" element={<ExchangeDetailC12 />} />
              <Route path="/c12/error-queue" element={<ErrorQueueC12 />} />
              <Route path="/c12/reconciliation" element={<C12Reconciliation />} />
              <Route path="/c12/reconciliation/:id" element={<DifferenceInvestigation />} />
              <Route path="/c12/health" element={<InterfaceHealth />} />
              <Route path="/c12/credentials" element={<Credentials />} />

              <Route path="/c1/access-requests" element={<AccessRequestList />} />
              <Route path="/c1/access-requests/new" element={<AccessRequestForm mode="new" />} />
              <Route path="/c1/access-requests/:id" element={<AccessRequestDetail />} />
              <Route path="/c1/access-requests/:id/edit" element={<AccessRequestForm mode="edit" />} />
              <Route path="/c1/access-requests/:id/amend" element={<AccessRequestForm mode="amend" />} />
              <Route path="/c1/users" element={<UserRegister />} />
              <Route path="/c1/users/:id" element={<UserDetail />} />
              <Route path="/c1/permissions" element={<PermissionCatalogue />} />
              <Route path="/c1/roles" element={<RoleCatalogue />} />
              <Route path="/c1/roles/:code" element={<RoleDefinition />} />
              <Route path="/c1/ad-mapping" element={<AdGroupMapping />} />
              <Route path="/c1/effective-permissions" element={<EffectivePermissions />} />
              <Route path="/c1/delegations" element={<Delegations />} />
              <Route path="/c1/access-reviews" element={<AccessReviewList />} />
              <Route path="/c1/access-reviews/:id" element={<AccessReviewWorksheet />} />
              <Route path="/c1/dormant-accounts" element={<DormantAccounts />} />

              {/* ---- the integration screens, inside the same shell ---------------------- */}
              <Route path="/journey" element={<JourneyMap />} />
              <Route path="/document-chain" element={<DocumentChain />} />
              <Route path="/inbox" element={<IntegratedInbox />} />

              {/* ---- Export modules, imported in place — v1.4 ----------------------------
                  Until v1.3 Export was the one contribution this application did not compile: it was
                  loaded as a portable build inside an iframe, with the Core session handed over
                  between two origins so the reviewer was not asked to sign in twice. That is gone.
                  Export's pages are imported from its own `src` exactly as Core's and Shared's are,
                  and they render inside the one Core shell.

                  **Export keeps its own paths**, which is rule 1 at the head of this file applied to
                  the third prototype: `/contracts`, `/shipments`, `/sourcing/plans` and the rest are
                  the addresses the Export prototype itself uses, so every internal link inside that
                  prototype still resolves without a single Export file being changed. None of them
                  collides with Core's `/c1…/c12` or Shared's `/s01…/s11`.

                  Two addresses are this layer's own. `/export` is the module landing page — the
                  twenty-three phases in order — and `/export/:key` is kept as a redirect, so every
                  destination key any earlier version linked to still arrives somewhere real. */}
              <Route element={<RequireModule module={MODULE_EXPORT} />}>
                <Route path="/export" element={<ExportModule />} />
                <Route path="/export/:key" element={<ExportKeyRedirect />} />

                <Route element={<ExportPageFrame />}>
                  {/* the springboard. Export calls it `/`, which this application's own home owns. */}
                  <Route path="/export/springboard" element={<HomePage />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/process-map" element={<ProcessMapPage />} />

                  {/* Origination — phases 08–09. `new` and `position` precede `:id` */}
                  <Route path="/origination" element={<OpportunityList />} />
                  <Route path="/origination/new" element={<OpportunityForm />} />
                  <Route path="/origination/position" element={<PositionReport />} />
                  <Route path="/origination/:id" element={<OpportunityDetail />} />

                  {/* Contracts — phase 10, and the review and quality tabs at 11 and 12 */}
                  <Route path="/contracts" element={<ContractList />} />
                  <Route path="/contracts/new" element={<PurchaseContractForm />} />
                  <Route path="/contracts/:id" element={<ContractDetail />} />
                  <Route path="/contracts/:id/edit" element={<ContractForm />} />
                  <Route path="/contracts/:id/:tab" element={<ContractDetail />} />
                  {/* Four segments, so it does not collide with `/contracts/:id/:tab` above.
                      Declared here as well as in vendor/export/App.tsx — see the route-table
                      drift guard; a route in only one table falls through to the catch-all. */}
                  <Route path="/contracts/:id/planning/new" element={<ExecutionPlanForm />} />

                  {/* Shipments — phases 15 and 19 */}
                  <Route path="/shipments" element={<ShipmentList />} />
                  <Route path="/shipments/new" element={<ShipmentForm mode="create" />} />
                  <Route path="/shipments/:id" element={<ShipmentDetail />} />
                  <Route path="/shipments/:id/edit" element={<ShipmentForm mode="edit" />} />
                  <Route path="/shipments/:id/:tab" element={<ShipmentDetail />} />

                  {/* Allocation and readiness — phase 13 */}
                  <Route path="/allocation" element={<AllocationModule />} />
                  <Route path="/allocation/:tab" element={<AllocationModule />} />

                  {/* Country prerequisites — phase 14. The advance-payment routes precede `:id` */}
                  <Route path="/pre-clearance" element={<PreclearanceList />} />
                  {/* Before `/pre-clearance/:id`, which would otherwise match "new". Declared
                      here as well as in vendor/export/App.tsx — see the route-table guard. */}
                  <Route path="/pre-clearance/new" element={<ExportContractRequestForm />} />
                  <Route path="/pre-clearance/advance-payments" element={<AdvancePaymentList />} />
                  <Route path="/pre-clearance/advance-payments/:id" element={<AdvancePaymentDetail />} />
                  <Route path="/pre-clearance/:id" element={<PreclearanceDetail />} />

                  {/* Clearance and regulatory — phase 16 */}
                  <Route path="/clearance" element={<ClearanceList />} />
                  <Route path="/clearance/:id" element={<ClearanceWorkspace />} />

                  {/* Movement and stuffing request — phase 17. `leg/:id` precedes `:tab` */}
                  <Route path="/movement" element={<MovementModule />} />
                  <Route path="/movement/leg/:id" element={<MovementLegDetail />} />
                  <Route path="/movement/:tab" element={<MovementModule />} />

                  {/* Container inspection and stuffing — phase 18 */}
                  <Route path="/stuffing" element={<StuffingList />} />
                  <Route path="/stuffing/:id" element={<StuffingWorkspace />} />

                  {/* Documents and charges — phases 20 and 21 */}
                  <Route path="/documents" element={<DocumentsList />} />
                  <Route path="/documents/:id" element={<DocumentsWorkspace />} />

                  {/* Bank submission and payment — phase 22 */}
                  <Route path="/post-shipment" element={<PostShipmentList />} />
                  <Route path="/post-shipment/:id" element={<PostShipmentWorkspace />} />

                  {/* Close-out, claims and insurance — phase 23 */}
                  <Route path="/close-out" element={<CloseOutModule />} />
                  <Route path="/close-out/:tab" element={<CloseOutModule />} />

                  {/* Freight rate table — serves phase 15 */}
                  <Route path="/freight-rates" element={<FreightRatesPage />} />

                  {/* Sourcing intake — phases 01–07. Order matters twice over: every `…/new` add
                      screen must precede `sourcing/agreements/:id`, or "new" is read as an id, and
                      all of them must precede `sourcing/:tab`. Kept exactly as Export declares it. */}
                  <Route path="/sourcing" element={<SourcingModule />} />
                  <Route path="/sourcing/plans/new" element={<SeasonalPurchasePlanForm mode="create" />} />
                  <Route path="/sourcing/budgets/new" element={<BudgetForm mode="create" />} />
                  <Route path="/sourcing/plans/:id" element={<SeasonalPurchasePlanDetail />} />
                  <Route path="/sourcing/plans/:id/edit" element={<SeasonalPurchasePlanForm mode="edit" />} />
                  <Route path="/sourcing/budgets/:id" element={<BudgetDetail />} />
                  <Route path="/sourcing/budgets/:id/edit" element={<BudgetForm mode="edit" />} />
                  <Route path="/sourcing/funds/new" element={<FundForm mode="create" />} />
                  <Route path="/sourcing/funds/:id/edit" element={<FundForm mode="edit" />} />
                  <Route path="/sourcing/agreements/new" element={<PurchaseAgreementForm mode="create" />} />
                  {/*
                    Procurement — the purchase order, added 3 September 2026.

                    These three have to be declared HERE as well as in Export's own route
                    table, and the reason is worth stating because it has bitten once. This
                    application does not mount Export's `App`: it re-declares every Export
                    route against its own router, so a route added to Export and not added
                    here resolves inside the standalone Export prototype and falls through
                    to this application's catch-all — "That address is not part of the
                    demonstration". `/sourcing/procurement` appeared to work while the
                    detail and edit screens did not, because the list matches
                    `/sourcing/:tab` below and needs no route of its own.

                    `…/new` precedes `…/:id`, or "new" is read as a purchase-order id, and
                    all three precede `/sourcing/:tab`. A test in Export's suite now reads
                    both route tables and fails when one carries a `/sourcing` route the
                    other does not, so this cannot drift again unnoticed.
                  */}
                  <Route path="/sourcing/procurement/new" element={<PurchaseOrderForm mode="create" />} />
                  <Route path="/sourcing/procurement/:id" element={<PurchaseOrderDetail />} />
                  <Route
                    path="/sourcing/procurement/:id/edit"
                    element={<PurchaseOrderForm mode="edit" />}
                  />
                  <Route path="/sourcing/locations/new" element={<NewReceivingLocationForm />} />
                  <Route path="/sourcing/intake/new" element={<NewMaterialReceiptForm />} />
                  <Route path="/sourcing/warehouse/new" element={<NewWarehouseReceiptForm />} />
                  <Route path="/sourcing/balances/new" element={<NewAgentBalanceForm />} />
                  <Route path="/sourcing/agreements/:id" element={<PurchaseAgreementDetail />} />
                  <Route path="/sourcing/agreements/:id/edit" element={<PurchaseAgreementForm mode="edit" />} />
                  <Route path="/sourcing/receipts/:id" element={<IntakeReceiptDetail />} />
                  <Route path="/sourcing/:tab" element={<SourcingModule />} />

                  {/* Material and transport, and the two cross-cutting queues */}
                  <Route path="/material" element={<MaterialModule />} />
                  <Route path="/material/transport/:id" element={<TransportRequestDetail />} />
                  <Route path="/material/transport/:id/edit" element={<TransportRequestForm />} />
                  <Route path="/material/:tab" element={<MaterialModule />} />
                  <Route path="/exceptions" element={<ExceptionsQueue />} />
                  <Route path="/variants" element={<VariantsPage />} />
                </Route>
              </Route>
              <Route path="/stub/export" element={<Navigate to="/shipments" replace />} />

              {/* ---- Shared modules, gated on the same rule ------------------------------ */}
              <Route element={<RequireModule module={MODULE_SHARED} />}>
                <Route element={<SharedArea />}>

              <Route path="/s01" element={<Landing />} />
              <Route path="/s01/plans" element={<MasterPlanList />} />
              <Route path="/s01/plan/:ref" element={<MasterPlanEditor />} />
              <Route path="/s01/sourcing" element={<Sourcing />} />
              <Route path="/s01/processing" element={<Processing />} />
              <Route path="/s01/warehouse" element={<Warehouse />} />
              <Route path="/s01/plan-actual" element={<PlanVsActual />} />
              <Route path="/s01/expected-actual" element={<ExpectedVsActual />} />

              <Route path="/s02" element={<Catalogue />} />
              <Route path="/s02/calculator" element={<Calculator />} />
              <Route path="/s02/deal" element={<Deal />} />
              <Route path="/s02/performance" element={<Performance />} />

              <Route path="/s03" element={<ControlPointBoard />} />
              <Route path="/s03/inspections" element={<InspectionList />} />
              <Route path="/s03/inspection/:id" element={<InspectionDetail />} />
              <Route path="/s03/ncs" element={<NcList />} />
              <Route path="/s03/nc/:id" element={<NcCase />} />
              <Route path="/s03/checks" element={<ConditionChecks />} />
              <Route path="/s03/programmes" element={<Programmes />} />
              <Route path="/s03/contracts" element={<ContractTerms />} />

              <Route path="/s04" element={<ComplianceDashboard />} />
              <Route path="/s04/cases" element={<VarianceCaseList />} />
              <Route path="/s04/case/:id" element={<VarianceCaseWorkspace />} />
              <Route path="/s04/reconciliation" element={<S04Reconciliation />} />
              <Route path="/s04/insurance" element={<InsuranceList />} />
              <Route path="/s04/incident/:id" element={<IncidentWorkspace />} />
              <Route path="/s04/monitoring" element={<MonitoringDuties />} />

              <Route path="/s05" element={<MovementList />} />
              <Route path="/s05/movement/:id" element={<MovementDetail />} />
              <Route path="/s05/transit" element={<GoodsInTransit />} />
              <Route path="/s05/requests" element={<ServiceRequests />} />
              <Route path="/s05/shunting" element={<Shunting />} />
              <Route path="/s05/rates" element={<FreightRates />} />
              <Route path="/s05/rate-history" element={<RateHistory />} />
              <Route path="/s05/clearance" element={<Clearance />} />

              <Route path="/s06" element={<Position />} />
              <Route path="/s06/transfer" element={<Transfer />} />
              <Route path="/s06/stock" element={<WarehouseStock />} />
              <Route path="/s06/prices" element={<Prices />} />
              <Route path="/s06/sales" element={<Sales />} />

              <Route path="/s07" element={<ClaimRegister />} />
              <Route path="/s07/register" element={<ClaimRegistration />} />
              <Route path="/s07/claim/:id" element={<ClaimWorkspace />} />
              <Route path="/s07/exposure" element={<ContractExposure />} />
              <Route path="/s07/reports" element={<ClaimsReporting />} />

              <Route path="/s08" element={<Portfolio />} />
              <Route path="/s08/register" element={<ProjectRegistration />} />
              <Route path="/s08/project/:id" element={<ProjectWorkspace />} />
              <Route path="/s08/reports" element={<PortfolioReports />} />

              <Route path="/s09" element={<FeedbackRegister />} />
              <Route path="/s09/capture" element={<FeedbackCapture />} />
              <Route path="/s09/feedback/:id" element={<FeedbackRecord />} />
              <Route path="/s09/satisfaction" element={<SatisfactionDashboard />} />
              <Route path="/s09/coverage" element={<FeedbackCoverage />} />
              <Route path="/s09/reports" element={<SatisfactionReporting />} />

              <Route path="/s10" element={<Structure />} />
              <Route path="/s10/directory" element={<Directory />} />
              <Route path="/s10/person/:id" element={<PersonRecord />} />
              <Route path="/s10/leadership" element={<AreaLeadership />} />
              <Route path="/s10/roles" element={<RoleMatrix />} />
              <Route path="/s10/resolution" element={<ResolutionTrace />} />
              <Route path="/s10/gaps" element={<RoleGaps />} />
              <Route path="/s10/reports" element={<DirectoryReports />} />

              <Route path="/s11" element={<Library />} />
              <Route path="/s11/publish" element={<PublishMaterial />} />
              <Route path="/s11/item/:id" element={<ItemDetail />} />
              <Route path="/s11/search" element={<LibrarySearch />} />
              <Route path="/s11/placements" element={<Placements />} />
              <Route path="/s11/help" element={<ModuleHelp />} />
              <Route path="/s11/announcements" element={<Announcements />} />
              <Route path="/s11/review" element={<ReviewQueue />} />
              <Route path="/s11/reports" element={<LibraryReports />} />

              <Route path="/stub/:which" element={<Stub />} />
                </Route>
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
