import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PamTask {
  id: string;
  date: string;
  description: string;
  assignee_name: string | null;
  location: string | null;
  risk_type: string | null;
  status: string;
  has_evidence: boolean;
}

interface PamMetrics {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  compliance_percentage: number;
}

export function exportPamToExcel(
  tasks: PamTask[],
  metrics: PamMetrics,
  weekYear: number,
  weekNumber: number,
  organizationName: string
) {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['Reporte PLS - Gestión de Seguridad'],
    ['Organización', organizationName],
    ['Semana', `${weekNumber}, ${weekYear}`],
    ['Fecha de generación', new Date().toLocaleDateString()],
    [],
    ['RESUMEN EJECUTIVO'],
    ['Total de tareas', metrics.total_tasks],
    ['Completadas', metrics.completed_tasks],
    ['En curso', metrics.in_progress_tasks],
    ['Pendientes', metrics.pending_tasks],
    ['Vencidas', metrics.overdue_tasks],
    ['% Cumplimiento', `${metrics.compliance_percentage.toFixed(1)}%`],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  const tasksData = tasks.map(task => ({
    Fecha: task.date,
    Descripción: task.description,
    Responsable: task.assignee_name || 'Sin asignar',
    Ubicación: task.location || '-',
    'Tipo de Riesgo': task.risk_type || '-',
    Estado: task.status,
    Evidencia: task.has_evidence ? 'Sí' : 'No',
  }));

  const wsTasks = XLSX.utils.json_to_sheet(tasksData);
  XLSX.utils.book_append_sheet(wb, wsTasks, 'Tareas');

  XLSX.writeFile(wb, `PLS_Semana_${weekNumber}_${weekYear}.xlsx`);
}

export function exportPamToPDF(
  tasks: PamTask[],
  metrics: PamMetrics,
  weekYear: number,
  weekNumber: number,
  organizationName: string
) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Reporte PLS - Gestión de Seguridad', 14, 20);

  doc.setFontSize(11);
  doc.text(`Organización: ${organizationName}`, 14, 30);
  doc.text(`Semana: ${weekNumber}, ${weekYear}`, 14, 36);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 42);

  doc.setFontSize(14);
  doc.text('Resumen Ejecutivo', 14, 55);

  const summaryData = [
    ['Métrica', 'Valor'],
    ['Total de tareas', metrics.total_tasks.toString()],
    ['Completadas', metrics.completed_tasks.toString()],
    ['En curso', metrics.in_progress_tasks.toString()],
    ['Pendientes', metrics.pending_tasks.toString()],
    ['Vencidas', metrics.overdue_tasks.toString()],
    ['% Cumplimiento', `${metrics.compliance_percentage.toFixed(1)}%`],
  ];

  autoTable(doc, {
    startY: 60,
    head: [summaryData[0]],
    body: summaryData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 120;

  doc.addPage();
  doc.setFontSize(14);
  doc.text('Detalle de Tareas', 14, 20);

  const tasksTableData = tasks.map(task => [
    task.date.slice(0, 10),
    task.description.slice(0, 40),
    task.assignee_name || 'Sin asignar',
    task.location || '-',
    task.status,
    task.has_evidence ? 'Sí' : 'No',
  ]);

  autoTable(doc, {
    startY: 25,
    head: [['Fecha', 'Descripción', 'Responsable', 'Ubicación', 'Estado', 'Evidencia']],
    body: tasksTableData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 8 },
    columnStyles: {
      1: { cellWidth: 50 },
    },
  });

  doc.save(`PLS_Semana_${weekNumber}_${weekYear}.pdf`);
}
