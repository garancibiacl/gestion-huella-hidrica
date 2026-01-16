import { useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { usePamWeekSelector } from "../hooks/usePamWeekSelector";
import { usePamDashboardMetrics } from "../hooks/usePamDashboardMetrics";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, FileDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  title: string;
  value: number;
  total?: number;
  icon: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}

function MetricCard({ title, value, total, icon, variant = "default" }: MetricCardProps) {
  const percentage = total ? Math.round((value / total) * 100) : 0;
  
  const variantStyles = {
    default: "bg-blue-50 text-blue-600 border-blue-200",
    success: "bg-emerald-50 text-emerald-600 border-emerald-200",
    warning: "bg-amber-50 text-amber-600 border-amber-200",
    danger: "bg-red-50 text-red-600 border-red-200",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`p-2 rounded-lg border ${variantStyles[variant]}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {total !== undefined && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>de {total} tareas</span>
              <span className="font-medium">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface BreakdownItemProps {
  name: string;
  total: number;
  completed: number;
  compliance: number;
}

function BreakdownItem({ name, total, completed, compliance }: BreakdownItemProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="space-y-1 flex-1">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">
          {completed} de {total} completadas
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Progress value={compliance} className="w-20 h-2" />
        <Badge variant={compliance >= 80 ? "default" : compliance >= 50 ? "secondary" : "destructive"}>
          {compliance.toFixed(1)}%
        </Badge>
      </div>
    </div>
  );
}

export default function PamDashboardPage() {
  const { organizationId } = useOrganization();
  const week = usePamWeekSelector();
  const { metrics, isLoading, error, refetch } = usePamDashboardMetrics({
    organizationId: organizationId || undefined,
    weekYear: week.weekYear,
    weekNumber: week.weekNumber,
  });

  const [activeTab, setActiveTab] = useState("overview");

  const handleExportExcel = async () => {
    if (!metrics) return;
    
    const { exportPamToExcel } = await import('../services/pamExporter');
    
    // Fetch tasks for export
    const { data: tasks } = await supabase
      .from('pam_tasks')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('week_year', week.weekYear)
      .eq('week_number', week.weekNumber);
    
    exportPamToExcel(
      tasks || [],
      metrics,
      week.weekYear,
      week.weekNumber,
      'Organización'
    );
  };

  const handleExportPDF = async () => {
    if (!metrics) return;
    
    const { exportPamToPDF } = await import('../services/pamExporter');
    
    // Fetch tasks for export
    const { data: tasks } = await supabase
      .from('pam_tasks')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('week_year', week.weekYear)
      .eq('week_number', week.weekNumber);
    
    exportPamToPDF(
      tasks || [],
      metrics,
      week.weekYear,
      week.weekNumber,
      'Organización'
    );
  };

  if (isLoading) {
    return (
      <div className="page-container space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="p-4">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-16 mt-3" />
              <Skeleton className="h-2 w-full mt-4" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} className="p-6">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56 mt-2" />
              <Skeleton className="h-[180px] w-full rounded-xl mt-6" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error al cargar métricas</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refetch} variant="outline">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const compliancePercentage = metrics?.compliance_percentage || 0;
  const isGoodCompliance = compliancePercentage >= 80;

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Dashboard Ejecutivo PLS"
          description={`Semana ${week.weekNumber}, ${week.weekYear}`}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileDown className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileDown className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={week.goToPreviousWeek}>
          Semana anterior
        </Button>
        <Button variant="outline" size="sm" onClick={week.goToCurrentWeek}>
          Semana actual
        </Button>
        <Button variant="outline" size="sm" onClick={week.goToNextWeek}>
          Próxima semana
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total de Tareas"
          value={metrics?.total_tasks || 0}
          icon={<Clock className="w-4 h-4" />}
          variant="default"
        />
        <MetricCard
          title="Completadas"
          value={metrics?.completed_tasks || 0}
          total={metrics?.total_tasks || 0}
          icon={<CheckCircle2 className="w-4 h-4" />}
          variant="success"
        />
        <MetricCard
          title="En Curso"
          value={metrics?.in_progress_tasks || 0}
          total={metrics?.total_tasks || 0}
          icon={<TrendingUp className="w-4 h-4" />}
          variant="warning"
        />
        <MetricCard
          title="Pendientes"
          value={metrics?.pending_tasks || 0}
          total={metrics?.total_tasks || 0}
          icon={<Clock className="w-4 h-4" />}
          variant="default"
        />
        <MetricCard
          title="Vencidas"
          value={metrics?.overdue_tasks || 0}
          total={metrics?.total_tasks || 0}
          icon={<AlertCircle className="w-4 h-4" />}
          variant="danger"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cumplimiento General</CardTitle>
              <CardDescription>Porcentaje de tareas completadas</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isGoodCompliance ? (
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <span className={`text-3xl font-bold ${isGoodCompliance ? 'text-emerald-600' : 'text-red-600'}`}>
                {compliancePercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={compliancePercentage} className="h-3" />
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="contract">Por Contrato</TabsTrigger>
          <TabsTrigger value="area">Por Área</TabsTrigger>
          <TabsTrigger value="location">Por Ubicación</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Por Contrato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {metrics?.by_contract && metrics.by_contract.length > 0 ? (
                  metrics.by_contract.map((item: any, idx: number) => (
                    <BreakdownItem
                      key={idx}
                      name={item.name}
                      total={item.total}
                      completed={item.completed}
                      compliance={item.compliance}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Sin datos</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Por Área</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {metrics?.by_area && metrics.by_area.length > 0 ? (
                  metrics.by_area.map((item: any, idx: number) => (
                    <BreakdownItem
                      key={idx}
                      name={item.name}
                      total={item.total}
                      completed={item.completed}
                      compliance={item.compliance}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Sin datos</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contract" className="space-y-2">
          <Card>
            <CardHeader>
              <CardTitle>Desempeño por Contrato</CardTitle>
              <CardDescription>Detalle de cumplimiento por cada contrato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {metrics?.by_contract && metrics.by_contract.length > 0 ? (
                metrics.by_contract.map((item: any, idx: number) => (
                  <BreakdownItem
                    key={idx}
                    name={item.name}
                    total={item.total}
                    completed={item.completed}
                    compliance={item.compliance}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sin datos de contratos</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="area" className="space-y-2">
          <Card>
            <CardHeader>
              <CardTitle>Desempeño por Área</CardTitle>
              <CardDescription>Detalle de cumplimiento por cada área</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {metrics?.by_area && metrics.by_area.length > 0 ? (
                metrics.by_area.map((item: any, idx: number) => (
                  <BreakdownItem
                    key={idx}
                    name={item.name}
                    total={item.total}
                    completed={item.completed}
                    compliance={item.compliance}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sin datos de áreas</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-2">
          <Card>
            <CardHeader>
              <CardTitle>Desempeño por Ubicación</CardTitle>
              <CardDescription>Detalle de cumplimiento por cada ubicación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {metrics?.by_location && metrics.by_location.length > 0 ? (
                metrics.by_location.map((item: any, idx: number) => (
                  <BreakdownItem
                    key={idx}
                    name={item.name}
                    total={item.total}
                    completed={item.completed}
                    compliance={item.compliance}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sin datos de ubicaciones</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
