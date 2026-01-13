import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Droplets, Shield, BarChart3, Settings } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  roles: string[];
}

const MODULES: ModuleCard[] = [
  {
    id: "environmental",
    title: "Gestión Ambiental",
    description: "Monitoreo de huella hídrica, energética y de combustibles",
    icon: <Droplets className="w-8 h-8" />,
    path: "/dashboard/agua",
    roles: ["admin", "prevencionista", "worker"],
  },
  {
    id: "pam",
    title: "Gestión de Seguridad",
    description: "Plan de Acción de Mejora - Tareas y cumplimiento HSE",
    icon: <Shield className="w-8 h-8" />,
    path: "/pam/my-activities",
    roles: ["admin", "prevencionista", "worker"],
  },
];

export default function Hub() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { organizationId, loading: orgLoading } = useOrganization();
  const { profile, loading: profileLoading } = useUserProfile();

  const loading = authLoading || orgLoading || profileLoading;

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  const availableModules = MODULES.filter((module) => {
    if (!profile?.role) return false;
    return module.roles.includes(profile.role);
  });

  useEffect(() => {
    if (!loading && availableModules.length === 1) {
      navigate(availableModules[0].path, { replace: true });
    }
  }, [loading, availableModules, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !organizationId) {
    return null;
  }

  if (availableModules.length === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        <PageHeader
          title={`Bienvenido, ${profile?.full_name || user.email}`}
          description="Selecciona el módulo con el que deseas trabajar"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableModules.map((module) => (
            <Card
              key={module.id}
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate(module.path)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {module.icon}
                  </div>
                </div>
                <CardTitle className="text-xl mt-4">{module.title}</CardTitle>
                <CardDescription className="text-sm">
                  {module.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Acceder
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {profile?.role === "admin" && (
          <Card className="border-dashed">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">Administración</CardTitle>
                  <CardDescription>
                    Gestiona usuarios, configuración y reportes del sistema
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin/usuarios")}
              >
                Usuarios
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin/analytics")}
              >
                Analytics
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/configuracion")}
              >
                Configuración
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
