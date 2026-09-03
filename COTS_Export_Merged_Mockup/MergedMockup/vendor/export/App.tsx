import { BrowserRouter, HashRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RedirectIfAuthenticated, RequireAuth } from "./auth/RequireAuth";
import { Shell } from "./components/Shell";
import { ToastProvider } from "./components/feedback";
import { ThemeProvider } from "./theme/ThemeContext";
import { Dashboard } from "./pages/Dashboard";
import { HomePage } from "./pages/HomePage";
import { ProcessMapPage } from "./pages/process-map";
import { OpportunityDetail, OpportunityForm, OpportunityList, PositionReport } from "./pages/origination";
import { AllocationModule } from "./pages/allocation";
import { AdvancePaymentDetail, AdvancePaymentList } from "./pages/advance-payments";
import { FreightRatesPage } from "./pages/freight-rates";
import { MovementLegDetail, MovementModule } from "./pages/movement";
import { CloseOutModule } from "./pages/close-out";
import { PurchaseOrderDetail, PurchaseOrderForm } from "./pages/procurement";
import { IntakeReceiptDetail, PurchaseAgreementDetail, SourcingModule } from "./pages/sourcing";
import { BudgetDetail, SeasonalPurchasePlanDetail } from "./pages/planning";
import { BudgetForm, SeasonalPurchasePlanForm } from "./pages/planning-forms";
import {
  FundForm,
  NewAgentBalanceForm,
  NewMaterialReceiptForm,
  NewReceivingLocationForm,
  NewWarehouseReceiptForm,
  PurchaseAgreementForm,
} from "./pages/sourcing-forms";
import { ContractDetail, ContractForm, ContractList } from "./pages/contracts";
import { PurchaseContractForm } from "./pages/purchase-contract-new";
import {
  ClearanceList,
  ClearanceWorkspace,
  DocumentsList,
  DocumentsWorkspace,
  PostShipmentList,
  PostShipmentWorkspace,
  StuffingList,
  StuffingWorkspace,
} from "./pages/execution-modules";
import { LoginPage } from "./pages/LoginPage";
import { MaterialModule, TransportRequestDetail, TransportRequestForm } from "./pages/material";
import { ExceptionsQueue, NotFoundPage, VariantsPage } from "./pages/misc";
import { PreclearanceDetail, PreclearanceList } from "./pages/preclearance";
import { ShipmentDetail, ShipmentForm, ShipmentList } from "./pages/shipments";
import "./styles/global.css";
import "./pages/pages.css";

/**
 * The portable build is opened straight off a folder (`file://`), where there is no
 * server to rewrite deep links back onto index.html, so it routes on the hash.
 * The hosted/dev build keeps clean paths. Set by `VITE_PORTABLE` at build time.
 */
const Router = import.meta.env.VITE_PORTABLE === "1" ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* Public */}
              <Route
                path="/login"
                element={
                  <RedirectIfAuthenticated>
                    <LoginPage />
                  </RedirectIfAuthenticated>
                }
              />

              {/* Protected */}
              <Route element={<RequireAuth />}>
                <Route element={<Shell />}>
                  {/* v1.1: "/" is the springboard; the dashboard is a module of its own. */}
                  <Route index element={<HomePage />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  {/* v2.0: the sixteen-phase process map, one screen per phase */}
                  <Route path="process-map" element={<ProcessMapPage />} />

                  {/* Origination — v2.0 phases 01-02. `new` and `position` precede `:id` */}
                  <Route path="origination" element={<OpportunityList />} />
                  <Route path="origination/new" element={<OpportunityForm />} />
                  <Route path="origination/position" element={<PositionReport />} />
                  <Route path="origination/:id" element={<OpportunityDetail />} />

                  {/* Contracts */}
                  <Route path="contracts" element={<ContractList />} />
                  {/* `new` must precede `:id`, as with shipments */}
                  <Route path="contracts/new" element={<PurchaseContractForm />} />
                  <Route path="contracts/:id" element={<ContractDetail />} />
                  <Route path="contracts/:id/edit" element={<ContractForm />} />
                  <Route path="contracts/:id/:tab" element={<ContractDetail />} />

                  {/* Shipments — `new` must precede `:id` */}
                  <Route path="shipments" element={<ShipmentList />} />
                  <Route path="shipments/new" element={<ShipmentForm mode="create" />} />
                  <Route path="shipments/:id" element={<ShipmentDetail />} />
                  <Route path="shipments/:id/edit" element={<ShipmentForm mode="edit" />} />
                  <Route path="shipments/:id/:tab" element={<ShipmentDetail />} />

                  {/* Allocation & readiness — v2.0 phase 06 */}
                  <Route path="allocation" element={<AllocationModule />} />
                  <Route path="allocation/:tab" element={<AllocationModule />} />

                  {/* Pre-clearance — the advance-payment routes must precede `:id` */}
                  <Route path="pre-clearance" element={<PreclearanceList />} />
                  <Route path="pre-clearance/advance-payments" element={<AdvancePaymentList />} />
                  <Route path="pre-clearance/advance-payments/:id" element={<AdvancePaymentDetail />} />
                  <Route path="pre-clearance/:id" element={<PreclearanceDetail />} />

                  {/* Clearance */}
                  <Route path="clearance" element={<ClearanceList />} />
                  <Route path="clearance/:id" element={<ClearanceWorkspace />} />

                  {/* Movement & stuffing request — v2.0 phase 10. `leg/:id` precedes `:tab` */}
                  <Route path="movement" element={<MovementModule />} />
                  <Route path="movement/leg/:id" element={<MovementLegDetail />} />
                  <Route path="movement/:tab" element={<MovementModule />} />

                  {/* Stuffing & loading */}
                  <Route path="stuffing" element={<StuffingList />} />
                  <Route path="stuffing/:id" element={<StuffingWorkspace />} />

                  {/* Documents & charges */}
                  <Route path="documents" element={<DocumentsList />} />
                  <Route path="documents/:id" element={<DocumentsWorkspace />} />

                  {/* Post-shipment & bank */}
                  <Route path="post-shipment" element={<PostShipmentList />} />
                  <Route path="post-shipment/:id" element={<PostShipmentWorkspace />} />

                  {/* Close-out, claims & insurance — v2.0 phase 16 */}
                  <Route path="close-out" element={<CloseOutModule />} />
                  <Route path="close-out/:tab" element={<CloseOutModule />} />

                  {/* Freight rate table — v2.0 phase 08 */}
                  <Route path="freight-rates" element={<FreightRatesPage />} />

                  {/*
                    Sourcing intake (MMP). Order matters twice over: every `…/new` add
                    screen must precede `sourcing/agreements/:id`, or "new" is read as an
                    agreement id, and all of them must precede `sourcing/:tab`.
                  */}
                  <Route path="sourcing" element={<SourcingModule />} />
                  {/*
                    Workflow v2.3 phases 01-02 — the seasonal purchase plan and the
                    budget, which the workflow runs before funds. Same ordering rule as
                    the MMP screens below: `…/new` before `…/:id`, and both before
                    `sourcing/:tab`.
                  */}
                  <Route path="sourcing/plans/new" element={<SeasonalPurchasePlanForm mode="create" />} />
                  <Route path="sourcing/budgets/new" element={<BudgetForm mode="create" />} />
                  <Route path="sourcing/plans/:id" element={<SeasonalPurchasePlanDetail />} />
                  <Route path="sourcing/plans/:id/edit" element={<SeasonalPurchasePlanForm mode="edit" />} />
                  <Route path="sourcing/budgets/:id" element={<BudgetDetail />} />
                  <Route path="sourcing/budgets/:id/edit" element={<BudgetForm mode="edit" />} />
                  <Route path="sourcing/funds/new" element={<FundForm mode="create" />} />
                  <Route path="sourcing/funds/:id/edit" element={<FundForm mode="edit" />} />
                  <Route path="sourcing/agreements/new" element={<PurchaseAgreementForm mode="create" />} />
                  {/*
                    Procurement — the purchase order, added 3 September 2026. Same
                    ordering rule as everything above: `new` before `:id`, and both
                    before `sourcing/:tab`, or "new" is read as a purchase-order id.
                  */}
                  <Route path="sourcing/procurement/new" element={<PurchaseOrderForm mode="create" />} />
                  <Route path="sourcing/procurement/:id" element={<PurchaseOrderDetail />} />
                  <Route path="sourcing/procurement/:id/edit" element={<PurchaseOrderForm mode="edit" />} />
                  <Route path="sourcing/locations/new" element={<NewReceivingLocationForm />} />
                  <Route path="sourcing/intake/new" element={<NewMaterialReceiptForm />} />
                  <Route path="sourcing/warehouse/new" element={<NewWarehouseReceiptForm />} />
                  <Route path="sourcing/balances/new" element={<NewAgentBalanceForm />} />
                  <Route path="sourcing/agreements/:id" element={<PurchaseAgreementDetail />} />
                  <Route
                    path="sourcing/agreements/:id/edit"
                    element={<PurchaseAgreementForm mode="edit" />}
                  />
                  <Route path="sourcing/receipts/:id" element={<IntakeReceiptDetail />} />
                  <Route path="sourcing/:tab" element={<SourcingModule />} />

                  {/* Material & transport */}
                  <Route path="material" element={<MaterialModule />} />
                  <Route path="material/transport/:id" element={<TransportRequestDetail />} />
                  <Route path="material/transport/:id/edit" element={<TransportRequestForm />} />
                  <Route path="material/:tab" element={<MaterialModule />} />

                  {/* Cross-cutting */}
                  <Route path="exceptions" element={<ExceptionsQueue />} />
                  <Route path="variants" element={<VariantsPage />} />

                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}
