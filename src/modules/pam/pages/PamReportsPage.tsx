import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, TrendingUp, BarChart3, FileSpreadsheet } from "lucide-react";
import { endOfMonth, endOfWeek, endOfYear, format, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { useHazardReports } from "@/modules/pam/hazards/hooks/useHazardReports";
import { exportHazardAnnualReport, exportHazardMonthlyReport, exportHazardWeeklyReport } from "@/lib/pdf-export";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function PamReportsPage() {
  const { toast } = useToast();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const yearStart = startOfYear(new Date());
  const yearEnd = endOfYear(new Date());
  const weekRangeLabel = `${format(weekStart, "dd MMM yyyy", { locale: es })} - ${format(weekEnd, "dd MMM yyyy", { locale: es })}`;
  const monthRangeLabel = `${format(monthStart, "dd MMM yyyy", { locale: es })} - ${format(monthEnd, "dd MMM yyyy", { locale: es })}`;
  const yearRangeLabel = `${format(yearStart, "dd MMM yyyy", { locale: es })} - ${format(yearEnd, "dd MMM yyyy", { locale: es })}`;
  const { data: weeklyReports = [], isLoading: isWeeklyLoading } = useHazardReports({
    date_from: weekStart.toISOString(),
    date_to: weekEnd.toISOString(),
  });
  const { data: monthlyReports = [], isLoading: isMonthlyLoading } = useHazardReports({
    date_from: monthStart.toISOString(),
    date_to: monthEnd.toISOString(),
  });
  const { data: annualReports = [], isLoading: isAnnualLoading } = useHazardReports({
    date_from: yearStart.toISOString(),
    date_to: yearEnd.toISOString(),
  });
  const isLoading = isWeeklyLoading || isMonthlyLoading || isAnnualLoading;

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Reportabilidad / Safety Intelligence"
        description="Generación de reportes y análisis de inteligencia de seguridad"
      />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56 mt-2" />
              <Skeleton className="h-9 w-full mt-6" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Reporte Semanal</CardTitle>
            </div>
            <CardDescription>
              Resumen de actividades y cumplimiento de la semana
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              disabled={isWeeklyLoading}
              onClick={() => {
                if (weeklyReports.length === 0) {
                  toast({
                    title: "Sin reportes en la semana",
                    description: "No hay reportes de peligro registrados en el período seleccionado.",
                  });
                  return;
                }
                exportHazardWeeklyReport({
                  reports: weeklyReports,
                  organization: "Buses JM",
                  dateRange: weekRangeLabel,
                });
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Generar Reporte
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Reporte Mensual</CardTitle>
            </div>
            <CardDescription>
              Análisis consolidado del mes completo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              disabled={isMonthlyLoading}
              onClick={() => {
                if (monthlyReports.length === 0) {
                  toast({
                    title: "Sin reportes para el mes",
                    description: "No hay reportes de peligro registrados en el período seleccionado.",
                  });
                  return;
                }
                exportHazardMonthlyReport({
                  reports: monthlyReports,
                  organization: "Buses JM",
                  dateRange: monthRangeLabel,
                });
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Generar Reporte
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Análisis de Tendencias</CardTitle>
            </div>
            <CardDescription>
              Evolución y proyecciones de indicadores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              <Download className="mr-2 h-4 w-4" />
              Generar Análisis
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Dashboard Ejecutivo</CardTitle>
            </div>
            <CardDescription>
              KPIs y métricas para gerencia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              <Download className="mr-2 h-4 w-4" />
              Exportar Dashboard
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Datos Personalizados</CardTitle>
            </div>
            <CardDescription>
              Exportación de datos con filtros avanzados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              <Download className="mr-2 h-4 w-4" />
              Exportar Datos
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Reporte Anual</CardTitle>
            </div>
            <CardDescription>
              Consolidado anual para auditorías
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              disabled={isAnnualLoading}
              onClick={() => {
                if (annualReports.length === 0) {
                  toast({
                    title: "Sin reportes en el año",
                    description: "No hay reportes de peligro registrados en el período seleccionado.",
                  });
                  return;
                }
                exportHazardAnnualReport({
                  reports: annualReports,
                  organization: "Buses JM",
                  dateRange: yearRangeLabel,
                });
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Generar Reporte
            </Button>
          </CardContent>
        </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Próximamente: Safety Intelligence</CardTitle>
          <CardDescription>
            Sistema avanzado de análisis predictivo y reportabilidad automática
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• Generación automática de reportes programados</p>
            <p>• Análisis predictivo de riesgos con IA</p>
            <p>• Detección de patrones y anomalías</p>
            <p>• Benchmarking con industria</p>
            <p>• Dashboards interactivos en tiempo real</p>
            <p>• Alertas inteligentes y recomendaciones</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
