import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Hub from "./pages/Hub";
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
import PamAdminBoardPage from "./modules/pam/pages/PamAdminBoardPage";
import PamDashboardPage from "./modules/pam/pages/PamDashboardPage";

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
              <Route path="/pam/my-activities" element={<PamWorkerTasksPage />} />
              <Route path="/pam/dashboard" element={<PamDashboardPage />} />
              <Route path="/admin/pam/upload" element={<PamAdminWeekUploadPage />} />
              <Route path="/admin/pam/board" element={<PamAdminBoardPage />} />
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
