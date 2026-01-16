import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Target, Award } from "lucide-react";

export default function PamPerformancePage() {
  return (
    <div className="bg-[#F4F5F7]">
      <div className="page-container space-y-6">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:flex-row sm:items-center">
          <PageHeader
            title="Desempeño del PLS"
            description="Análisis de rendimiento y métricas de desempeño del programa de seguridad"
          />
        </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento Global</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">+5% vs mes anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participación</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <p className="text-xs text-muted-foreground">Personal activo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objetivos Alcanzados</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12/15</div>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mejora Continua</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+18%</div>
            <p className="text-xs text-muted-foreground">Mejora anual</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
          <CardDescription>
            Esta sección mostrará análisis detallado de desempeño, tendencias históricas,
            comparativas por área y rankings de cumplimiento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• Gráficos de tendencias de cumplimiento</p>
            <p>• Comparativas por contrato y área</p>
            <p>• Rankings de mejores desempeños</p>
            <p>• Análisis de brechas y oportunidades</p>
            <p>• Proyecciones y metas</p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
