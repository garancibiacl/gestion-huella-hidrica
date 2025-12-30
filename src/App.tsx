import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import WaterDashboard from "./pages/WaterDashboard";
import WaterMeterDashboard from "./pages/WaterMeterDashboard";
import ElectricDashboard from "./pages/ElectricDashboard";
import ImportData from "./pages/ImportData";
import Periods from "./pages/Periods";
import SustainabilityActions from "./pages/SustainabilityActions";
import Settings from "./pages/Settings";
import AdminUsers from "./pages/AdminUsers";
import AdminAnalytics from "./pages/AdminAnalytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard/agua" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Navigate to="/dashboard/agua" replace />} />
              <Route path="/dashboard/agua" element={<WaterDashboard />} />
              <Route path="/dashboard/agua-medidor" element={<WaterMeterDashboard />} />
              <Route path="/dashboard/energia" element={<ElectricDashboard />} />
              <Route path="/importar" element={<ImportData />} />
              <Route path="/periodos" element={<Periods />} />
              <Route path="/medidas" element={<SustainabilityActions />} />
              <Route path="/configuracion" element={<Settings />} />
              <Route path="/admin" element={<Navigate to="/admin/usuarios" replace />} />
              <Route path="/admin/usuarios" element={<AdminUsers />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
