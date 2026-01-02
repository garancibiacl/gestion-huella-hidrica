import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

  if (!loading && !isAdmin && !isPrevencionista) {
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
