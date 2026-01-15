import { supabase } from '@/integrations/supabase/client';
import type {
  HazardCatalogImportRow,
  HazardRiskImportRow,
  HazardResponsibleImportRow,
  HazardCatalogSyncResult,
} from '../types/hazard.types';

// =====================================================
// UTILIDADES: Parse CSV
// =====================================================

function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
      if (char === '\r') i++;
    } else if (char !== '\r') {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Elimina tildes
}

function normalizeCell(str: string | undefined): string {
  return (str ?? '').trim();
}

// Hash simple para generar stable_id
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function stableKey(parts: Array<string | undefined | null>): string {
  return parts
    .map((p) => normalizeString(String(p ?? '')))
    .filter((p) => p.length > 0)
    .join('|');
}

// =====================================================
// PARSE: Jerarquía (Gerencia → Proceso → Actividad → Tarea)
// =====================================================

export function parseHierarchySheet(csvText: string): {
  rows: HazardCatalogImportRow[];
  errors: string[];
} {
  const csvRows = parseCSV(csvText);
  if (csvRows.length < 2) {
    return { rows: [], errors: ['El archivo de jerarquía está vacío'] };
  }

  const headers = csvRows[0].map((h) => normalizeString(h));
  const dataRows = csvRows.slice(1);

  const colIdx = {
    gerencia: headers.findIndex((h) => h.includes('gerencia')),
    proceso: headers.findIndex((h) => h.includes('proceso')),
    actividad: headers.findIndex((h) => h.includes('actividad')),
    tarea: headers.findIndex((h) => h.includes('tarea')),
    faena: headers.findIndex((h) => h.includes('faena') || h.includes('centro')),
    centro_trabajo: headers.findIndex((h) => h.includes('centro') && h.includes('trabajo')),
  };

  const rows: HazardCatalogImportRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2;

    const gerencia = colIdx.gerencia >= 0 ? row[colIdx.gerencia]?.trim() : '';
    const proceso = colIdx.proceso >= 0 ? row[colIdx.proceso]?.trim() : '';
    const actividad = colIdx.actividad >= 0 ? row[colIdx.actividad]?.trim() : '';
    const tarea = colIdx.tarea >= 0 ? row[colIdx.tarea]?.trim() : '';
    const faena = colIdx.faena >= 0 ? row[colIdx.faena]?.trim() : '';
    const centro_trabajo = colIdx.centro_trabajo >= 0 ? row[colIdx.centro_trabajo]?.trim() : '';

    if (!gerencia) {
      errors.push(`Fila ${rowNum}: Gerencia es requerida`);
      continue;
    }

    rows.push({
      gerencia,
      proceso: proceso || undefined,
      actividad: actividad || undefined,
      tarea: tarea || undefined,
      faena: faena || undefined,
      centro_trabajo: centro_trabajo || undefined,
    });
  }

  return { rows, errors };
}

// =====================================================
// PARSE: Riesgos Críticos
// =====================================================

export function parseRisksSheet(csvText: string): {
  rows: HazardRiskImportRow[];
  errors: string[];
} {
  const csvRows = parseCSV(csvText);
  if (csvRows.length < 2) {
    return { rows: [], errors: ['El archivo de riesgos está vacío'] };
  }

  const headers = csvRows[0].map((h) => normalizeString(h));
  const dataRows = csvRows.slice(1);

  const colIdx = {
    code: headers.findIndex((h) => h.includes('codigo') || h.includes('code')),
    name: headers.findIndex((h) => h.includes('nombre') || h.includes('name') || h.includes('riesgo')),
    description: headers.findIndex((h) => h.includes('descripcion') || h.includes('description')),
    severity: headers.findIndex((h) => h.includes('severidad') || h.includes('severity') || h.includes('nivel')),
    requires_evidence: headers.findIndex((h) => h.includes('evidencia') || h.includes('evidence')),
  };

  const rows: HazardRiskImportRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2;

    const code = colIdx.code >= 0 ? row[colIdx.code]?.trim() : '';
    const name = colIdx.name >= 0 ? row[colIdx.name]?.trim() : '';
    const description = colIdx.description >= 0 ? row[colIdx.description]?.trim() : '';
    const severityRaw = colIdx.severity >= 0 ? row[colIdx.severity]?.trim().toUpperCase() : '';
    const requiresEvidenceRaw = colIdx.requires_evidence >= 0 ? row[colIdx.requires_evidence]?.trim().toLowerCase() : '';

    if (!code || !name) {
      errors.push(`Fila ${rowNum}: Código y nombre son requeridos`);
      continue;
    }

    const severity = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'].includes(severityRaw)
      ? (severityRaw as any)
      : undefined;

    const requires_evidence = ['si', 'yes', 'true', '1'].includes(requiresEvidenceRaw);

    rows.push({
      code,
      name,
      description: description || undefined,
      severity,
      requires_evidence,
    });
  }

  return { rows, errors };
}

// =====================================================
// PARSE: Responsables
// =====================================================

export function parseResponsiblesSheet(csvText: string): {
  rows: HazardResponsibleImportRow[];
  errors: string[];
} {
  const csvRows = parseCSV(csvText);
  if (csvRows.length < 2) {
    return { rows: [], errors: ['El archivo de responsables está vacío'] };
  }

  const headers = csvRows[0].map((h) => normalizeString(h));
  const dataRows = csvRows.slice(1);

  const colIdx = {
    name: headers.findIndex((h) => h.includes('nombre') || h.includes('name')),
    rut: headers.findIndex((h) => h.includes('rut') || h.includes('dni')),
    email: headers.findIndex((h) => h.includes('email') || h.includes('correo') || h.includes('mail')),
    company: headers.findIndex((h) => h.includes('empresa') || h.includes('company') || h.includes('contratista')),
    can_close: headers.findIndex((h) => h.includes('cierre') || h.includes('close')),
    can_verify: headers.findIndex((h) => h.includes('verificar') || h.includes('verify')),
  };

  const rows: HazardResponsibleImportRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2;

    const name = colIdx.name >= 0 ? row[colIdx.name]?.trim() : '';
    const rut = colIdx.rut >= 0 ? row[colIdx.rut]?.trim() : '';
    const email = colIdx.email >= 0 ? row[colIdx.email]?.trim() : '';
    const company = colIdx.company >= 0 ? row[colIdx.company]?.trim() : '';
    const canCloseRaw = colIdx.can_close >= 0 ? row[colIdx.can_close]?.trim().toLowerCase() : '';
    const canVerifyRaw = colIdx.can_verify >= 0 ? row[colIdx.can_verify]?.trim().toLowerCase() : '';

    if (!name) {
      errors.push(`Fila ${rowNum}: Nombre es requerido`);
      continue;
    }

    const can_close = ['si', 'yes', 'true', '1'].includes(canCloseRaw);
    const can_verify = ['si', 'yes', 'true', '1'].includes(canVerifyRaw);

    rows.push({
      name,
      rut: rut || undefined,
      email: email || undefined,
      company: company || undefined,
      can_close,
      can_verify,
    });
  }

  return { rows, errors };
}

// =====================================================
// PARSE: Sheet Master (un solo CSV con jerarquía + riesgos + responsables)
//
// Columnas esperadas (según usuario):
// Gerencia | Proceso | Actividad | Tarea | Centro de Trabajo / Faena | Riesgo Crítico | Empresa |
// Responsables (Nombre) | Responsables (RUT) | Responsables (Correo Electrónico)
// =====================================================

export function parseHazardMasterSheet(csvText: string): {
  hierarchy: HazardCatalogImportRow[];
  risks: HazardRiskImportRow[];
  responsibles: HazardResponsibleImportRow[];
  errors: string[];
} {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    return { hierarchy: [], risks: [], responsibles: [], errors: ['El sheet está vacío'] };
  }

  const headers = rows[0].map((h) => normalizeString(h));
  const dataRows = rows.slice(1);

  const colIdx = {
    gerencia: headers.findIndex((h) => h === 'gerencia' || h.includes('gerencia')),
    proceso: headers.findIndex((h) => h === 'proceso' || h.includes('proceso')),
    actividad: headers.findIndex((h) => h === 'actividad' || h.includes('actividad')),
    tarea: headers.findIndex((h) => h === 'tarea' || h.includes('tarea')),
    faena: headers.findIndex(
      (h) =>
        h.includes('centro de trabajo') ||
        h.includes('centro trabajo') ||
        h.includes('faena') ||
        h.includes('ubicacion')
    ),
    riesgo: headers.findIndex((h) => h.includes('riesgo') && h.includes('critico')),
    empresa: headers.findIndex((h) => h === 'empresa' || h.includes('empresa')),
    resp_nombre: headers.findIndex((h) => h.includes('responsables') && h.includes('nombre')),
    resp_rut: headers.findIndex((h) => h.includes('responsables') && h.includes('rut')),
    resp_email: headers.findIndex(
      (h) =>
        (h.includes('responsables') && (h.includes('correo') || h.includes('email') || h.includes('mail'))) ||
        h === 'correo electronico'
    ),
  };

  const errors: string[] = [];
  const hierarchyMap = new Map<string, HazardCatalogImportRow>();
  const risksMap = new Map<string, HazardRiskImportRow>();
  const responsiblesMap = new Map<string, HazardResponsibleImportRow>();

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2;

    const gerencia = normalizeCell(colIdx.gerencia >= 0 ? row[colIdx.gerencia] : '');
    const proceso = normalizeCell(colIdx.proceso >= 0 ? row[colIdx.proceso] : '');
    const actividad = normalizeCell(colIdx.actividad >= 0 ? row[colIdx.actividad] : '');
    const tarea = normalizeCell(colIdx.tarea >= 0 ? row[colIdx.tarea] : '');
    const faena = normalizeCell(colIdx.faena >= 0 ? row[colIdx.faena] : '');
    const riesgo = normalizeCell(colIdx.riesgo >= 0 ? row[colIdx.riesgo] : '');
    const empresa = normalizeCell(colIdx.empresa >= 0 ? row[colIdx.empresa] : '');
    const respNombre = normalizeCell(colIdx.resp_nombre >= 0 ? row[colIdx.resp_nombre] : '');
    const respRut = normalizeCell(colIdx.resp_rut >= 0 ? row[colIdx.resp_rut] : '');
    const respEmailRaw = normalizeCell(colIdx.resp_email >= 0 ? row[colIdx.resp_email] : '');
    const respEmail = respEmailRaw ? respEmailRaw.toLowerCase() : '';

    if (!gerencia) {
      errors.push(`Fila ${rowNum}: falta Gerencia`);
      continue;
    }

    // Jerarquía
    const hKey = stableKey([gerencia, proceso, actividad, tarea, faena]);
    if (hKey) {
      hierarchyMap.set(hKey, {
        gerencia,
        proceso: proceso || undefined,
        actividad: actividad || undefined,
        tarea: tarea || undefined,
        // En el sheet viene una sola columna "Centro de Trabajo / Faena"
        // La guardamos como faena (y dejamos centro_trabajo vacío por ahora).
        faena: faena || undefined,
        centro_trabajo: undefined,
      });
    }

    // Riesgo crítico (no trae código: generamos un code estable por nombre)
    if (riesgo) {
      const riskKey = stableKey([riesgo]);
      const code = `HR-${simpleHash(riskKey)}`;
      if (!risksMap.has(code)) {
        risksMap.set(code, {
          code,
          name: riesgo,
          description: undefined,
          severity: undefined,
          requires_evidence: false,
        });
      }
    }

    // Responsable
    // (para MVP lo tratamos como responsable de cierre y verificación)
    if (respNombre || respEmail) {
      if (!respEmail) {
        // Si no hay email, no podremos upsert por constraint (organization_id,email). Registramos warning.
        errors.push(`Fila ${rowNum}: responsable sin correo (no se importará): "${respNombre}"`);
      } else {
        responsiblesMap.set(respEmail, {
          name: respNombre || respEmail,
          rut: respRut || undefined,
          email: respEmail,
          company: empresa || undefined,
          can_close: true,
          can_verify: true,
        });
      }
    }
  }

  return {
    hierarchy: Array.from(hierarchyMap.values()),
    risks: Array.from(risksMap.values()),
    responsibles: Array.from(responsiblesMap.values()),
    errors,
  };
}

// =====================================================
// IMPORT: Upsert a Supabase
// =====================================================

export async function importHazardCatalogs(params: {
  organizationId: string;
  hierarchy?: HazardCatalogImportRow[];
  risks?: HazardRiskImportRow[];
  responsibles?: HazardResponsibleImportRow[];
}): Promise<HazardCatalogSyncResult> {
  const { organizationId, hierarchy = [], risks = [], responsibles = [] } = params;

  const errors: string[] = [];
  let hierarchyImported = 0;
  let risksImported = 0;
  let responsiblesImported = 0;

  try {
    // 1. Importar jerarquía
    if (hierarchy.length > 0) {
      const hierarchyRecords = hierarchy.map((row) => {
        const stableId = simpleHash(
          [row.gerencia, row.proceso, row.actividad, row.tarea, row.faena]
            .filter(Boolean)
            .join('|')
        );

        return {
          organization_id: organizationId,
          gerencia: row.gerencia,
          proceso: row.proceso || null,
          actividad: row.actividad || null,
          tarea: row.tarea || null,
          faena: row.faena || null,
          centro_trabajo: row.centro_trabajo || null,
          stable_id: stableId,
          is_active: true,
        };
      });

      const { error: hierarchyError } = await supabase
        .from('hazard_catalog_hierarchy')
        .upsert(hierarchyRecords, {
          onConflict: 'organization_id,stable_id',
          ignoreDuplicates: false,
        });

      if (hierarchyError) {
        errors.push(`Error importando jerarquía: ${hierarchyError.message}`);
      } else {
        hierarchyImported = hierarchyRecords.length;
      }
    }

    // 2. Importar riesgos críticos
    if (risks.length > 0) {
      const riskRecords = risks.map((row) => ({
        organization_id: organizationId,
        code: row.code,
        name: row.name,
        description: row.description || null,
        severity: row.severity || null,
        requires_evidence: row.requires_evidence || false,
        is_active: true,
      }));

      const { error: risksError } = await supabase
        .from('hazard_critical_risks')
        .upsert(riskRecords, {
          onConflict: 'organization_id,code',
          ignoreDuplicates: false,
        });

      if (risksError) {
        errors.push(`Error importando riesgos: ${risksError.message}`);
      } else {
        risksImported = riskRecords.length;
      }
    }

    // 3. Importar responsables
    if (responsibles.length > 0) {
      const responsibleRecords = responsibles
        .filter((r) => r.email) // Solo si tiene email (unique constraint)
        .map((row) => ({
          organization_id: organizationId,
          name: row.name,
          rut: row.rut || null,
          email: row.email!,
          company: row.company || null,
          can_close: row.can_close || false,
          can_verify: row.can_verify || false,
          is_active: true,
        }));

      if (responsibleRecords.length > 0) {
        const { error: responsiblesError } = await supabase
          .from('hazard_responsibles')
          .upsert(responsibleRecords, {
            onConflict: 'organization_id,email',
            ignoreDuplicates: false,
          });

        if (responsiblesError) {
          errors.push(`Error importando responsables: ${responsiblesError.message}`);
        } else {
          responsiblesImported = responsibleRecords.length;
        }
      }
    }

    return {
      success: errors.length === 0,
      hierarchyImported,
      risksImported,
      responsiblesImported,
      errors,
    };
  } catch (error: any) {
    console.error('Error importando catálogos de hazards:', error);
    return {
      success: false,
      hierarchyImported: 0,
      risksImported: 0,
      responsiblesImported: 0,
      errors: [error instanceof Error ? error.message : 'Error desconocido'],
    };
  }
}
