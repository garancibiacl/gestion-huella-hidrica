import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Hub from "./pages/Hub";
import HubAnalytics from "./pages/HubAnalytics";
import HubUsers from "./pages/HubUsers";
import WaterDashboard from "./pages/WaterDashboard";
import WaterReportPreview from "./pages/WaterReportPreview";
import ElectricDashboard from "./pages/ElectricDashboard";
import PetroleumDashboard from "./pages/PetroleumDashboard";
import ImportData from "./pages/ImportData";
import ImportPetroleum from "./pages/ImportPetroleum";
import Periods from "./pages/Periods";
import SustainabilityActions from "./pages/SustainabilityActions";
import Settings from "./pages/Settings";
import AdminUsers from "./pages/AdminUsers";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminRisk from "./pages/AdminRisk";
import NotFound from "./pages/NotFound";
import PamWorkerTasksPage from "./modules/pam/pages/PamWorkerTasksPage";
import PamAdminWeekUploadPage from "./modules/pam/pages/PamAdminWeekUploadPage";
import PamHazardReportPage from "./modules/pam/pages/PamHazardReportPage";
import PamAdminBoardPage from "./modules/pam/pages/PamAdminBoardPage";
import PamDashboardPage from "./modules/pam/pages/PamDashboardPage";
import PamPerformancePage from "./modules/pam/pages/PamPerformancePage";
import PamReportsPage from "./modules/pam/pages/PamReportsPage";
import HazardDashboardPage from "./modules/pam/hazards/pages/HazardDashboardPage";

// Hazard Report Module
import HazardListPage from "./modules/pam/hazards/pages/HazardListPage";
import HazardCreatePage from "./modules/pam/hazards/pages/HazardCreatePage";
import HazardDetailPage from "./modules/pam/hazards/pages/HazardDetailPage";
import HazardClosePage from "./modules/pam/hazards/pages/HazardClosePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/hub" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/hub" element={<Hub />} />
            <Route path="/hub/analytics" element={<HubAnalytics />} />
            <Route path="/hub/users" element={<HubUsers />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Navigate to="/dashboard/agua" replace />} />
              <Route path="/dashboard/agua" element={<WaterDashboard />} />
              <Route path="/dashboard/energia" element={<ElectricDashboard />} />
              <Route path="/dashboard/petroleo" element={<PetroleumDashboard />} />
              <Route path="/importar" element={<ImportData />} />
              <Route path="/importar/petroleo" element={<ImportPetroleum />} />
              <Route path="/periodos" element={<Periods />} />
              <Route path="/medidas" element={<SustainabilityActions />} />
              <Route path="/configuracion" element={<Settings />} />
              <Route path="/admin" element={<Navigate to="/admin/usuarios" replace />} />
              <Route path="/admin/usuarios" element={<AdminUsers />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/riesgos" element={<AdminRisk />} />
              <Route path="/pls" element={<Navigate to="/admin/pls/hazard-report" replace />} />
              <Route path="/admin/pls" element={<Navigate to="/admin/pls/hazard-report" replace />} />
              <Route path="/pls/my-activities" element={<PamWorkerTasksPage />} />
              <Route path="/pls/dashboard" element={<PamDashboardPage />} />
              <Route path="/pls/performance" element={<PamPerformancePage />} />
              <Route path="/pls/reports" element={<PamReportsPage />} />
              <Route path="/pls/hazard-dashboard" element={<HazardDashboardPage />} />
              <Route path="/admin/pls/upload" element={<PamAdminWeekUploadPage />} />
              
              {/* Hazard Report Module */}
              <Route path="/admin/pls/hazard-report" element={<HazardListPage />} />
              <Route path="/admin/pls/hazard-report/new" element={<HazardCreatePage />} />
              <Route path="/admin/pls/hazard-report/:id" element={<HazardDetailPage />} />
              <Route path="/admin/pls/hazard-report/:id/close" element={<HazardClosePage />} />
              
              <Route path="/admin/pls/board" element={<PamAdminBoardPage />} />
              <Route path="/reportes/agua/preview" element={<WaterReportPreview />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
