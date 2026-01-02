import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import RiskPanel from "@/components/admin/RiskPanel";
import { useRole } from "@/hooks/useRole";

export default function AdminRisk() {
  const navigate = useNavigate();
  const { isAdmin, isPrevencionista, loading } = useRole();

  useEffect(() => {
    if (!loading && !isAdmin && !isPrevencionista) {
      navigate("/dashboard");
    }
  }, [loading, isAdmin, isPrevencionista, navigate]);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin && !isPrevencionista) {
    return null;
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Capa predictiva"
        description="Señales de riesgo, forecast de consumo y alertas inteligentes."
      />
      <RiskPanel />
    </div>
  );
}
