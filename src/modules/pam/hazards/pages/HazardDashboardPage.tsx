import { useMemo, useState } from "react";
import { endOfMonth, endOfYear, startOfMonth, startOfYear, subDays } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHazardReports } from "../hooks/useHazardReports";
import { buildMonthlySeries, countByKey, splitOpenProgress } from "../utils/hazardAnalytics";

type PeriodFilter = "year" | "month" | "last30";

export default function HazardDashboardPage() {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("year");
  const [gerenciaFilter, setGerenciaFilter] = useState("all");
  const { data: reports = [], isLoading, error } = useHazardReports();

  const periodRange = useMemo(() => {
    const now = new Date();
    if (periodFilter === "month") {
      return { start: startOfMonth(now), end: endOfMonth(now) };
    }
    if (periodFilter === "last30") {
      return { start: subDays(now, 30), end: now };
    }
    return { start: startOfYear(now), end: endOfYear(now) };
  }, [periodFilter]);

  const filteredReports = useMemo(() => {
    const byDate = reports.filter((report) => {
      const dueDate = new Date(report.due_date);
      if (Number.isNaN(dueDate.getTime())) return false;
      return dueDate >= periodRange.start && dueDate <= periodRange.end;
    });

    if (gerenciaFilter === "all") return byDate;
    return byDate.filter((report) => report.gerencia === gerenciaFilter);
  }, [reports, periodRange, gerenciaFilter]);

  const { openReports, closedReports } = useMemo(() => {
    const open = filteredReports.filter((report) => report.status === "OPEN");
    const closed = filteredReports.filter((report) => report.status === "CLOSED");
    return { openReports: open, closedReports: closed };
  }, [filteredReports]);

  const statusCounts = useMemo(() => {
    const { open, inProgress } = splitOpenProgress(filteredReports);
    const closed = filteredReports.filter((report) => report.status === "CLOSED").length;
    return [
      { key: "open", label: "Abiertos", value: open },
      { key: "inProgress", label: "En proceso", value: inProgress },
      { key: "closed", label: "Cerrados", value: closed },
    ];
  }, [filteredReports]);

  const openByContract = useMemo(
    () => countByKey(openReports, (report) => report.reporter_company),
    [openReports]
  );
  const openByAdmin = useMemo(
    () => countByKey(openReports, (report) => report.closing_responsible_name),
    [openReports]
  );
  const openByGerencia = useMemo(
    () => countByKey(openReports, (report) => report.gerencia),
    [openReports]
  );
  const closedByGerencia = useMemo(
    () => countByKey(closedReports, (report) => report.gerencia),
    [closedReports]
  );
  const closedByContract = useMemo(
    () => countByKey(closedReports, (report) => report.reporter_company),
    [closedReports]
  );
  const closedByAdmin = useMemo(
    () => countByKey(closedReports, (report) => report.closing_responsible_name),
    [closedReports]
  );

  const monthlySeries = useMemo(
    () =>
      buildMonthlySeries(
        filteredReports,
        periodRange.start.getFullYear(),
        (report) => report.due_date
      ),
    [filteredReports, periodRange]
  );

  const gerenciaOptions = useMemo(() => {
    const unique = Array.from(
      new Set(reports.map((report) => report.gerencia).filter(Boolean))
    );
    return unique.sort((a, b) => a.localeCompare(b, "es"));
  }, [reports]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Dashboard de Peligros Operativo"
        description="Indicadores y tendencias de reportes de peligro"
      />

      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Período (por plazo)</p>
            <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year">Año actual</SelectItem>
                <SelectItem value="month">Mes actual</SelectItem>
                <SelectItem value="last30">Últimos 30 días</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Gerencia</p>
            <Select value={gerenciaFilter} onValueChange={setGerenciaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las gerencias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las gerencias</SelectItem>
                {gerenciaOptions.map((gerencia) => (
                  <SelectItem key={gerencia} value={gerencia}>
                    {gerencia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {isLoading && (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Cargando reportes...</p>
        </Card>
      )}

      {!isLoading && error && (
        <Card className="p-6">
          <p className="text-sm text-destructive">
            No se pudieron cargar los reportes. Intenta nuevamente.
          </p>
        </Card>
      )}

      {!isLoading && !error && filteredReports.length === 0 && (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            No hay reportes registrados para este período.
          </p>
        </Card>
      )}

      {!isLoading && !error && filteredReports.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {statusCounts.map((item) => (
              <Card key={item.key} className="p-4">
                <CardTitle className="text-xs text-muted-foreground">{item.label}</CardTitle>
                <p className="text-2xl font-semibold mt-2">{item.value}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Abiertos por Tipo (Gerencia)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-[240px]"
                  config={{ value: { label: "Reportes", color: "hsl(var(--primary))" } }}
                >
                  <BarChart data={openByGerencia}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} width={32} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={6} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reportabilidad mensual</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-[240px]"
                  config={{ value: { label: "Reportes", color: "hsl(var(--primary))" } }}
                >
                  <LineChart data={monthlySeries}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} width={32} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-value)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Abiertos por Contrato</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openByContract.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell className="text-right">{row.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Abiertos por Administrador</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Administrador</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openByAdmin.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell className="text-right">{row.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cerrados por Gerencia</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gerencia</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closedByGerencia.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell className="text-right">{row.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cerrados por Contrato</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closedByContract.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell className="text-right">{row.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cerrados por Administrador</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Administrador</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closedByAdmin.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell className="text-right">{row.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
