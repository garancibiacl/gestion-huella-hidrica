import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Corporate colors
const PRIMARY_COLOR: [number, number, number] = [179, 56, 42]; // #b3382a
const SECONDARY_COLOR: [number, number, number] = [56, 161, 105]; // #38a169
const TEXT_COLOR: [number, number, number] = [30, 30, 30];
const MUTED_COLOR: [number, number, number] = [120, 120, 120];
const HEADER_BG: [number, number, number] = [245, 245, 245];

interface TableColumn {
  header: string;
  dataKey: string;
  width?: number;
}

interface KPIData {
  title: string;
  value: string;
  subtitle?: string;
}

interface ChartDataPoint {
  label: string;
  value: number;
  value2?: number;
}

interface PDFExportOptions {
  title: string;
  subtitle?: string;
  dateRange?: string;
  organization?: string;
  kpis?: KPIData[];
  tableData?: Record<string, any>[];
  tableColumns?: TableColumn[];
  chartData?: ChartDataPoint[];
  chartTitle?: string;
  chartType?: 'bar' | 'line';
  alerts?: string[];
  footer?: string;
}

export function generatePDF(options: PDFExportOptions): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Helper functions
  const addText = (text: string, x: number, y: number, options: {
    fontSize?: number;
    fontStyle?: 'normal' | 'bold' | 'italic';
    color?: [number, number, number];
    align?: 'left' | 'center' | 'right';
    maxWidth?: number;
  } = {}) => {
    const { fontSize = 10, fontStyle = 'normal', color = TEXT_COLOR, align = 'left', maxWidth } = options;
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(...color);
    
    if (maxWidth) {
      doc.text(text, x, y, { align, maxWidth });
    } else {
      doc.text(text, x, y, { align });
    }
  };

  const drawLine = (y: number, color: [number, number, number] = [220, 220, 220]) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
  };

  const drawRect = (x: number, y: number, w: number, h: number, color: [number, number, number], filled = true) => {
    if (filled) {
      doc.setFillColor(...color);
      doc.rect(x, y, w, h, 'F');
    } else {
      doc.setDrawColor(...color);
      doc.rect(x, y, w, h, 'S');
    }
  };

  // Header with gradient-like effect
  drawRect(0, 0, pageWidth, 45, [250, 250, 250]);
  drawRect(0, 0, pageWidth, 3, PRIMARY_COLOR);

  // Logo placeholder / Company name
  addText('REPORTE', margin, 20, { fontSize: 24, fontStyle: 'bold', color: PRIMARY_COLOR });
  addText(options.title.toUpperCase(), margin, 30, { fontSize: 12, fontStyle: 'bold', color: TEXT_COLOR });
  
  // Date and organization
  const today = new Date().toLocaleDateString('es-CL', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  addText(`Generado: ${today}`, pageWidth - margin, 20, { fontSize: 8, color: MUTED_COLOR, align: 'right' });
  
  if (options.organization) {
    addText(options.organization, pageWidth - margin, 26, { fontSize: 9, fontStyle: 'bold', color: TEXT_COLOR, align: 'right' });
  }
  
  if (options.dateRange) {
    addText(`Período: ${options.dateRange}`, pageWidth - margin, 32, { fontSize: 8, color: MUTED_COLOR, align: 'right' });
  }

  yPos = 55;

  // Subtitle
  if (options.subtitle) {
    addText(options.subtitle, margin, yPos, { fontSize: 10, color: MUTED_COLOR });
    yPos += 10;
  }

  // KPIs Section
  if (options.kpis && options.kpis.length > 0) {
    const kpiWidth = (pageWidth - margin * 2 - (options.kpis.length - 1) * 5) / Math.min(options.kpis.length, 4);
    const kpiHeight = 30;
    
    options.kpis.slice(0, 4).forEach((kpi, index) => {
      const x = margin + index * (kpiWidth + 5);
      
      // KPI Card background
      drawRect(x, yPos, kpiWidth, kpiHeight, [252, 252, 252]);
      drawRect(x, yPos, kpiWidth, 2, index === 0 ? PRIMARY_COLOR : SECONDARY_COLOR);
      
      // KPI Title
      addText(kpi.title, x + 5, yPos + 10, { fontSize: 7, color: MUTED_COLOR });
      
      // KPI Value
      addText(kpi.value, x + 5, yPos + 20, { fontSize: 14, fontStyle: 'bold', color: TEXT_COLOR });
      
      // KPI Subtitle
      if (kpi.subtitle) {
        addText(kpi.subtitle, x + 5, yPos + 26, { fontSize: 6, color: MUTED_COLOR });
      }
    });
    
    yPos += kpiHeight + 15;
  }

  // Chart visualization (simple bar representation)
  if (options.chartData && options.chartData.length > 0 && options.chartTitle) {
    addText(options.chartTitle, margin, yPos, { fontSize: 11, fontStyle: 'bold', color: TEXT_COLOR });
    yPos += 8;
    
    const chartHeight = 50;
    const chartWidth = pageWidth - margin * 2;
    const barWidth = Math.min((chartWidth - 10) / options.chartData.length - 2, 15);
    const maxValue = Math.max(...options.chartData.map(d => Math.max(d.value, d.value2 || 0)));
    
    // Chart background
    drawRect(margin, yPos, chartWidth, chartHeight, [250, 250, 250]);
    
    // Draw bars
    options.chartData.forEach((point, index) => {
      const x = margin + 5 + index * (barWidth + 4);
      const barHeight = (point.value / maxValue) * (chartHeight - 15);
      
      // Primary bar
      drawRect(x, yPos + chartHeight - barHeight - 10, barWidth / 2, barHeight, PRIMARY_COLOR);
      
      // Secondary bar if exists
      if (point.value2 !== undefined) {
        const bar2Height = (point.value2 / maxValue) * (chartHeight - 15);
        drawRect(x + barWidth / 2, yPos + chartHeight - bar2Height - 10, barWidth / 2, bar2Height, SECONDARY_COLOR);
      }
      
      // Label
      if (index % Math.ceil(options.chartData!.length / 8) === 0) {
        addText(point.label, x + barWidth / 4, yPos + chartHeight - 3, { 
          fontSize: 5, 
          color: MUTED_COLOR,
          align: 'center'
        });
      }
    });
    
    yPos += chartHeight + 15;
  }

  // Table Section
  if (options.tableData && options.tableColumns && options.tableData.length > 0) {
    addText('Detalle de Datos', margin, yPos, { fontSize: 11, fontStyle: 'bold', color: TEXT_COLOR });
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [options.tableColumns.map(col => col.header)],
      body: options.tableData.map(row => 
        options.tableColumns!.map(col => {
          const value = row[col.dataKey];
          if (typeof value === 'number') {
            return value.toLocaleString('es-CL');
          }
          return value ?? '-';
        })
      ),
      theme: 'grid',
      headStyles: {
        fillColor: PRIMARY_COLOR,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: TEXT_COLOR,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: options.tableColumns.reduce((acc, col, index) => {
        if (col.width) {
          acc[index] = { cellWidth: col.width };
        }
        // Right align numeric columns (typically last columns)
        if (index > 0) {
          acc[index] = { ...acc[index], halign: 'right' };
        }
        return acc;
      }, {} as Record<number, any>),
      margin: { left: margin, right: margin },
      tableWidth: 'auto',
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Alerts Section
  if (options.alerts && options.alerts.length > 0) {
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    addText('Alertas y Recomendaciones', margin, yPos, { fontSize: 11, fontStyle: 'bold', color: TEXT_COLOR });
    yPos += 8;

    options.alerts.forEach((alert, index) => {
      const alertHeight = 12;
      
      // Alert background
      drawRect(margin, yPos, pageWidth - margin * 2, alertHeight, [255, 251, 235]);
      drawRect(margin, yPos, 3, alertHeight, [245, 158, 11]);
      
      // Alert icon (triangle)
      doc.setFillColor(245, 158, 11);
      doc.triangle(margin + 8, yPos + alertHeight - 3, margin + 11, yPos + 3, margin + 14, yPos + alertHeight - 3, 'F');
      
      // Alert text
      addText(alert, margin + 20, yPos + 7, { fontSize: 7, color: TEXT_COLOR, maxWidth: pageWidth - margin * 2 - 25 });
      
      yPos += alertHeight + 3;
    });
    
    yPos += 5;
  }

  // Footer
  const footerY = pageHeight - 15;
  drawLine(footerY - 5, [220, 220, 220]);
  
  addText(
    options.footer || 'Documento generado automáticamente - Sistema de Gestión de Recursos',
    pageWidth / 2,
    footerY,
    { fontSize: 7, color: MUTED_COLOR, align: 'center' }
  );
  
  addText(
    `Página 1 de 1`,
    pageWidth - margin,
    footerY,
    { fontSize: 7, color: MUTED_COLOR, align: 'right' }
  );

  // Save the PDF
  const filename = `${options.title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

// Utility functions for common exports
export function exportElectricReport(data: {
  summaries: { period: string; label: string; kwh: number; cost: number; medidores: number }[];
  totalKwh: number;
  totalCost: number;
  variation: number;
  forecastKwh: number;
  forecastCost: number;
  alerts: string[];
  organization?: string;
  dateRange?: string;
}) {
  generatePDF({
    title: 'Reporte de Consumo Eléctrico',
    subtitle: 'Análisis de consumo de energía eléctrica por período',
    organization: data.organization,
    dateRange: data.dateRange,
    kpis: [
      { title: 'kWh Total', value: data.totalKwh.toLocaleString(), subtitle: 'Consumo acumulado' },
      { title: 'Costo Total', value: `$${data.totalCost.toLocaleString()}`, subtitle: 'Gasto acumulado' },
      { title: 'Variación', value: `${(data.variation * 100).toFixed(1)}%`, subtitle: 'vs período anterior' },
      { title: 'Forecast 30d', value: Math.round(data.forecastKwh).toLocaleString(), subtitle: 'kWh proyectados' },
    ],
    chartData: data.summaries.map(s => ({ label: s.label, value: s.kwh, value2: s.cost / 1000 })),
    chartTitle: 'Evolución de Consumo (kWh)',
    tableData: data.summaries,
    tableColumns: [
      { header: 'Período', dataKey: 'label' },
      { header: 'kWh', dataKey: 'kwh' },
      { header: 'Costo ($)', dataKey: 'cost' },
      { header: 'Medidores', dataKey: 'medidores' },
    ],
    alerts: data.alerts,
    footer: 'Reporte de Energía Eléctrica - Sistema de Gestión Ambiental',
  });
}

export function exportWaterReport(data: {
  summaries: { period: string; label: string; m3: number; cost: number }[];
  totalM3: number;
  totalCost: number;
  variation: number;
  forecastM3: number;
  forecastCost: number;
  alerts: string[];
  organization?: string;
  dateRange?: string;
}) {
  generatePDF({
    title: 'Reporte de Consumo Hídrico',
    subtitle: 'Análisis de consumo de agua por período',
    organization: data.organization,
    dateRange: data.dateRange,
    kpis: [
      { title: 'm³ Total', value: data.totalM3.toLocaleString(), subtitle: 'Consumo acumulado' },
      { title: 'Costo Total', value: `$${data.totalCost.toLocaleString()}`, subtitle: 'Gasto acumulado' },
      { title: 'Variación', value: `${(data.variation * 100).toFixed(1)}%`, subtitle: 'vs período anterior' },
      { title: 'Forecast 30d', value: Math.round(data.forecastM3).toLocaleString(), subtitle: 'm³ proyectados' },
    ],
    chartData: data.summaries.map(s => ({ label: s.label, value: s.m3 })),
    chartTitle: 'Evolución de Consumo (m³)',
    tableData: data.summaries,
    tableColumns: [
      { header: 'Período', dataKey: 'label' },
      { header: 'm³', dataKey: 'm3' },
      { header: 'Costo ($)', dataKey: 'cost' },
    ],
    alerts: data.alerts,
    footer: 'Reporte de Consumo Hídrico - Sistema de Gestión Ambiental',
  });
}

export function exportHumanWaterReport(data: {
  periods: { period: string; botellas: number; bidones: number; costo: number }[];
  totalBotellas: number;
  totalBidones: number;
  totalLitros: number;
  totalCosto: number;
  organization?: string;
  dateRange?: string;
}) {
  generatePDF({
    title: 'Reporte de Agua Consumo Humano',
    subtitle: 'Análisis de consumo de agua para consumo humano',
    organization: data.organization,
    dateRange: data.dateRange,
    kpis: [
      { title: 'Botellas', value: data.totalBotellas.toLocaleString(), subtitle: `${(data.totalBotellas * 0.5).toLocaleString()} litros` },
      { title: 'Bidones 20L', value: data.totalBidones.toLocaleString(), subtitle: `${(data.totalBidones * 20).toLocaleString()} litros` },
      { title: 'Litros Totales', value: data.totalLitros.toLocaleString(), subtitle: 'Consumo acumulado' },
      { title: 'Costo Total', value: `$${data.totalCosto.toLocaleString()}`, subtitle: 'Gasto acumulado' },
    ],
    chartData: data.periods.map(p => ({ label: p.period, value: p.botellas, value2: p.bidones })),
    chartTitle: 'Evolución de Consumo (Botellas y Bidones)',
    tableData: data.periods,
    tableColumns: [
      { header: 'Período', dataKey: 'period' },
      { header: 'Botellas', dataKey: 'botellas' },
      { header: 'Bidones', dataKey: 'bidones' },
      { header: 'Costo ($)', dataKey: 'costo' },
    ],
    alerts: [],
    footer: 'Reporte de Agua Consumo Humano - Sistema de Gestión Ambiental',
  });
}

export interface EmissionsCentro {
  centro: string;
  emissions: number;
  percentage: number;
}

export interface ReductionOpportunity {
  centro: string;
  priority: 'alta' | 'media' | 'baja';
  potentialReduction: number;
  actions: string[];
}

export function exportCarbonFootprintReport(data: {
  periodSummaries: { period: string; label: string; emissions: number; kwh: number }[];
  emissionsByCentro: EmissionsCentro[];
  opportunities: ReductionOpportunity[];
  totalEmissions: number;
  totalKwh: number;
  emissionsPerKwh: number;
  variation: number;
  usesDefaultFactor: boolean;
  organization?: string;
  dateRange?: string;
}) {
  const EMERALD: [number, number, number] = [16, 185, 129]; // #10b981
  
  generatePDF({
    title: 'Reporte de Huella de Carbono',
    subtitle: `Emisiones de CO₂ equivalente asociadas al consumo eléctrico${data.usesDefaultFactor ? ' (Factor estándar Chile: 0.4 kgCO₂e/kWh)' : ''}`,
    organization: data.organization,
    dateRange: data.dateRange,
    kpis: [
      { 
        title: 'Emisiones Totales', 
        value: `${Math.round(data.totalEmissions).toLocaleString('es-CL')} kgCO₂e`, 
        subtitle: 'Huella de carbono acumulada' 
      },
      { 
        title: 'Consumo Total', 
        value: `${Math.round(data.totalKwh).toLocaleString('es-CL')} kWh`, 
        subtitle: 'Energía consumida' 
      },
      { 
        title: 'Factor Promedio', 
        value: `${data.emissionsPerKwh.toFixed(3)} kgCO₂e/kWh`, 
        subtitle: 'Intensidad de emisiones' 
      },
      { 
        title: 'Variación', 
        value: `${data.variation >= 0 ? '+' : ''}${(data.variation * 100).toFixed(1)}%`, 
        subtitle: 'vs período anterior' 
      },
    ],
    chartData: data.periodSummaries.map(s => ({ 
      label: s.label, 
      value: s.emissions
    })),
    chartTitle: 'Evolución de Emisiones por Período (kgCO₂e)',
    tableData: data.emissionsByCentro.map(c => ({
      centro: c.centro,
      emissions: Math.round(c.emissions),
      percentage: `${c.percentage.toFixed(1)}%`,
    })),
    tableColumns: [
      { header: 'Centro de Trabajo', dataKey: 'centro' },
      { header: 'Emisiones (kgCO₂e)', dataKey: 'emissions' },
      { header: '% del Total', dataKey: 'percentage' },
    ],
    alerts: [
      ...data.opportunities.slice(0, 3).map((opp, idx) => 
        `[Prioridad ${opp.priority.toUpperCase()}] ${opp.centro}: Potencial reducción de ${Math.round(opp.potentialReduction).toLocaleString('es-CL')} kgCO₂e/año. Acciones: ${opp.actions.slice(0, 2).join(', ')}.`
      ),
      data.usesDefaultFactor 
        ? 'Se utiliza factor de emisión estándar de Chile (0.4 kgCO₂e/kWh). Para mayor precisión, incluir columna "CO₂ Producido" en los datos.'
        : '',
      `Potencial de reducción total estimado: ${Math.round(data.opportunities.reduce((sum, o) => sum + o.potentialReduction, 0)).toLocaleString('es-CL')} kgCO₂e/año implementando las acciones sugeridas.`,
    ].filter(Boolean),
    footer: 'Reporte de Huella de Carbono - Sistema de Gestión Ambiental y Prevención de Riesgos',
  });
}
