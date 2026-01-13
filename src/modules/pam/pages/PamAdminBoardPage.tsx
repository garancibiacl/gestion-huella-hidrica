import { Navigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { useRole } from "@/hooks/useRole";

export default function PamAdminBoardPage() {
  const { isAdmin, isPrevencionista, loading } = useRole();

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center text-sm text-muted-foreground">
        Cargando permisos...
      </div>
    );
  }

  if (!isAdmin && !isPrevencionista) {
    return <Navigate to="/dashboard/agua" replace />;
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader
        title="Seguimiento PAM"
        description="Visualiza el estado de avance de las tareas PAM por responsable y estado."
      />
      <Card className="p-6 text-sm text-muted-foreground">
        Esta sección mostrará un tablero de seguimiento por responsable, estado y tareas vencidas.
      </Card>
    </div>
  );
}
