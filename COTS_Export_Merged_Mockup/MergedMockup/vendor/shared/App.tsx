import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/S01/Landing';
import MasterPlanList from './pages/S01/MasterPlanList';
import MasterPlanEditor from './pages/S01/MasterPlanEditor';
import Sourcing from './pages/S01/Sourcing';
import Processing from './pages/S01/Processing';
import Warehouse from './pages/S01/Warehouse';
import { ExpectedVsActual, PlanVsActual } from './pages/S01/Reports';
import Stub, { Inbox } from './pages/stubs/Stubs';
import ControlPointBoard from './pages/S03/ControlPointBoard';
import InspectionList from './pages/S03/InspectionList';
import InspectionDetail from './pages/S03/InspectionDetail';
import { NcCase, NcList } from './pages/S03/NonConformity';
import { ConditionChecks, Programmes } from './pages/S03/ChecksAndProgrammes';
import ContractTerms from './pages/S03/ContractTerms';
import { GoodsInTransit, MovementDetail, MovementList } from './pages/S05/Movements';
import { ServiceRequests, Shunting } from './pages/S05/ServiceRequestAndShunting';
import { FreightRates, RateHistory } from './pages/S05/FreightRates';
import Clearance from './pages/S05/Clearance';
import { ComplianceDashboard, MonitoringDuties } from './pages/S04/DashboardAndMonitoring';
import { VarianceCaseList, VarianceCaseWorkspace } from './pages/S04/VarianceCases';
import { Reconciliation } from './pages/S04/Reconciliation';
import { IncidentWorkspace, InsuranceList } from './pages/S04/Insurance';
import Position from './pages/S06/Position';
import Transfer from './pages/S06/Transfer';
import { Prices, WarehouseStock } from './pages/S06/StockAndPrices';
import Sales from './pages/S06/Sales';
import Catalogue from './pages/S02/Catalogue';
import Calculator from './pages/S02/Calculator';
import Deal, { Performance } from './pages/S02/Deal';
import ClaimRegister, { ClaimRegistration } from './pages/S07/Register';
import ClaimWorkspace from './pages/S07/ClaimWorkspace';
import { ClaimsReporting, ContractExposure } from './pages/S07/Reports';
import FeedbackRegister, { FeedbackCapture } from './pages/S09/Register';
import FeedbackRecord from './pages/S09/FeedbackRecord';
import { FeedbackCoverage, SatisfactionDashboard, SatisfactionReporting } from './pages/S09/Reports';
import Structure from './pages/S10/Structure';
import Directory, { AreaLeadership, PersonRecord } from './pages/S10/Directory';
import RoleMatrix, { DirectoryReports, ResolutionTrace, RoleGaps } from './pages/S10/Roles';
import Portfolio, { ProjectRegistration } from './pages/S08/Portfolio';
import ProjectWorkspace from './pages/S08/ProjectWorkspace';
import PortfolioReports from './pages/S08/Reports';
import Library, { ItemDetail, LibrarySearch, PublishMaterial } from './pages/S11/Library';
import { Announcements, ModuleHelp, Placements } from './pages/S11/Content';
import ReviewQueue, { LibraryReports } from './pages/S11/Review';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/s01" replace />} />
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
      <Route path="/s05" element={<MovementList />} />
      <Route path="/s05/movement/:id" element={<MovementDetail />} />
      <Route path="/s05/transit" element={<GoodsInTransit />} />
      <Route path="/s05/requests" element={<ServiceRequests />} />
      <Route path="/s05/shunting" element={<Shunting />} />
      <Route path="/s05/rates" element={<FreightRates />} />
      <Route path="/s05/rate-history" element={<RateHistory />} />
      <Route path="/s05/clearance" element={<Clearance />} />
      <Route path="/s04" element={<ComplianceDashboard />} />
      <Route path="/s04/cases" element={<VarianceCaseList />} />
      <Route path="/s04/case/:id" element={<VarianceCaseWorkspace />} />
      <Route path="/s04/reconciliation" element={<Reconciliation />} />
      <Route path="/s04/insurance" element={<InsuranceList />} />
      <Route path="/s04/incident/:id" element={<IncidentWorkspace />} />
      <Route path="/s04/monitoring" element={<MonitoringDuties />} />
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
      <Route path="/s08" element={<Portfolio />} />
      <Route path="/s08/register" element={<ProjectRegistration />} />
      <Route path="/s08/project/:id" element={<ProjectWorkspace />} />
      <Route path="/s08/reports" element={<PortfolioReports />} />
      <Route path="/s11" element={<Library />} />
      <Route path="/s11/publish" element={<PublishMaterial />} />
      <Route path="/s11/item/:id" element={<ItemDetail />} />
      <Route path="/s11/search" element={<LibrarySearch />} />
      <Route path="/s11/placements" element={<Placements />} />
      <Route path="/s11/help" element={<ModuleHelp />} />
      <Route path="/s11/announcements" element={<Announcements />} />
      <Route path="/s11/review" element={<ReviewQueue />} />
      <Route path="/s11/reports" element={<LibraryReports />} />
      <Route path="/inbox" element={<Inbox />} />
      <Route path="/stub/:which" element={<Stub />} />
      <Route path="*" element={<Navigate to="/s01" replace />} />
    </Routes>
  );
}
