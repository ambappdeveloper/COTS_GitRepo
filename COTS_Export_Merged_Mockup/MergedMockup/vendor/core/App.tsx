import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from './theme';
import { StoreProvider, useStore } from './store';
import { AppShell } from './layouts/AppShell';
import { ExternalLogin, Login, FirstLogin } from './pages/Login';
import { Home, Inbox } from './pages/Home';
import { CountrySelect } from './pages/C2/CountrySelect';
import { TeamView } from './pages/C2/TeamView';
import { TaskAnalytics } from './pages/C2/TaskAnalytics';
import { Domains } from './pages/C3/Domains';
import { MasterRecordList, MasterRecordForm, MasterRecordDetail } from './pages/C3/MasterRecords';
import { BulkLoad } from './pages/C3/BulkLoad';
import { Mapping } from './pages/C3/Mapping';
import { MyApprovals, ApprovalTask, SubmissionCheck } from './pages/C4/Approvals';
import { NotificationRules } from './pages/C5/Rules';
import { DeliveryLog } from './pages/C5/DeliveryLog';
import { Templates } from './pages/C5/Templates';
import { Channels } from './pages/C5/Channels';
import { MyPreferences, MySubscriptions } from './pages/C5/Preferences';
import { AutomatedJobs, OverdueUpdates } from './pages/C5/Jobs';
import { Discussions, RecordActivity } from './pages/C6/Discussions';
import { DocumentRegister } from './pages/C7/Register';
import { DocumentExpiry } from './pages/C7/Expiry';
import { Retention } from './pages/C7/Retention';
import { AuditSearch } from './pages/C8/AuditSearch';
import { AuditConfiguration } from './pages/C8/Configuration';
import { SensitiveMonitor } from './pages/C8/Monitor';
import { AuditRetention } from './pages/C8/Retention';
import { HealthDashboard } from './pages/C9/Health';
import { IncidentList, IncidentDetail } from './pages/C9/Incidents';
import { ExchangeLog, ExchangeDetail, ErrorQueue } from './pages/C9/Integration';
import { JobLog } from './pages/C9/Jobs';
import { LogLevels } from './pages/C9/LogLevels';
import { MonitoringThresholds } from './pages/C9/Monitoring';
import { LogRetention } from './pages/C9/Retention';
import { CountryList, CountryParameters } from './pages/C10/Countries';
import { ProcessSteps } from './pages/C10/ProcessSteps';
import { NumberingSeriesPage, CodingFormulas, Thresholds10, Translations, RegionalFormats } from './pages/C10/Rules';
import { ChangeRequests, ChangeRequestForm } from './pages/C10/Changes';
import { ConfigVersions, ConfigurationReport } from './pages/C10/Versions';
import { ReportCatalogue, ReportViewer, SavedViews } from './pages/C11/Reports';
import { CardCatalogue, RoleDashboards } from './pages/C11/Dashboards';
import { ScheduleList, ScheduleForm, DistributionLog } from './pages/C11/Schedules';
import { InterfaceRegistry, InterfaceDefinition, InterfacesInScope } from './pages/C12/Interfaces';
import { ExchangeLogC12, ExchangeDetailC12, ErrorQueueC12 } from './pages/C12/Exchanges';
import { Reconciliation, DifferenceInvestigation, InterfaceHealth, Credentials } from './pages/C12/Control';
import { SlaMonitor } from './pages/C4/SlaMonitor';
import { RouteList, RouteBuilder } from './pages/C4/Routes';
import { AccessRequestList, AccessRequestForm, AccessRequestDetail } from './pages/C1/AccessRequests';
import { UserRegister, UserDetail } from './pages/C1/Users';
import { PermissionCatalogue, RoleCatalogue, RoleDefinition, AdGroupMapping, EffectivePermissions } from './pages/C1/Roles';
import { Delegations } from './pages/C1/Delegations';
import { AccessReviewList, AccessReviewWorksheet, DormantAccounts } from './pages/C1/AccessReviews';

const RequireSession: React.FC = () => {
  const { currentUser } = useStore();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <Outlet />;
};

const Router: React.FC = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    {/* WF-C1-01 Step 1 — the external route is its own screen rather than a tab on the internal
        one. The two authenticate against different identity stores and collect different
        credentials, and neither links to the other: each audience is given its own address. */}
    <Route path="/login/external" element={<ExternalLogin />} />
    <Route path="/first-login" element={<FirstLogin />} />
    <Route element={<RequireSession />}>
      <Route path="/select-country" element={<CountrySelect />} />
      <Route element={<AppShell />}>
        <Route path="/home" element={<Home />} />
        <Route path="/inbox" element={<Inbox />} />
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

        {/* C9 System Logging and Monitoring */}
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

        {/* C10 System Configuration and Administration */}
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

        {/* C11 Reporting and Dashboards */}
        <Route path="/c11/reports" element={<ReportCatalogue />} />
        <Route path="/c11/reports/:id" element={<ReportViewer />} />
        <Route path="/c11/views" element={<SavedViews />} />
        <Route path="/c11/cards" element={<CardCatalogue />} />
        <Route path="/c11/role-dashboards" element={<RoleDashboards />} />
        <Route path="/c11/schedules" element={<ScheduleList />} />
        <Route path="/c11/schedules/:id" element={<ScheduleForm />} />
        <Route path="/c11/distribution" element={<DistributionLog />} />

        {/* C12 Integration Layer */}
        <Route path="/c12/interfaces" element={<InterfaceRegistry />} />
        <Route path="/c12/interfaces/:id" element={<InterfaceDefinition />} />
        <Route path="/c12/scope" element={<InterfacesInScope />} />
        <Route path="/c12/exchanges" element={<ExchangeLogC12 />} />
        <Route path="/c12/exchanges/:id" element={<ExchangeDetailC12 />} />
        <Route path="/c12/error-queue" element={<ErrorQueueC12 />} />
        <Route path="/c12/reconciliation" element={<Reconciliation />} />
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
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

export const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <StoreProvider>
      <HashRouter>
        <Router />
      </HashRouter>
    </StoreProvider>
  </ThemeProvider>
);

export default App;
