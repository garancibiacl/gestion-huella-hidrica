import { Navigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { useRole } from "@/hooks/useRole";

export default function PamAdminWeekUploadPage() {
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
        title="Planificación semanal PAM"
        description="Carga la planificación semanal de tareas PAM desde un archivo Excel."
      />
      <Card className="p-6 text-sm text-muted-foreground">
        Esta sección permitirá cargar archivos Excel con la planificación semanal PAM.
      </Card>
    </div>
  );
}
