import { useState, useCallback } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import {
  parseHierarchySheet,
  parseRisksSheet,
  parseResponsiblesSheet,
  importHazardCatalogs,
} from '../services/hazardImporter';
import type { HazardCatalogSyncResult } from '../types/hazard.types';

// URLs públicas de Google Sheets (CSV)
// TODO: Configurar URLs reales cuando estén disponibles
const HIERARCHY_CSV_URL = 
  'https://docs.google.com/spreadsheets/d/e/YOUR_HIERARCHY_SHEET_ID/pub?output=csv';
const RISKS_CSV_URL = 
  'https://docs.google.com/spreadsheets/d/e/YOUR_RISKS_SHEET_ID/pub?output=csv';
const RESPONSIBLES_CSV_URL = 
  'https://docs.google.com/spreadsheets/d/e/YOUR_RESPONSIBLES_SHEET_ID/pub?output=csv';

const LAST_SYNC_KEY = 'last_hazard_catalog_sync';
const MIN_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutos

interface UseHazardCatalogSyncOptions {
  enabled?: boolean;
  onSyncStart?: () => void;
  onSyncComplete?: (result: HazardCatalogSyncResult) => void;
}

export function useHazardCatalogSync(options: UseHazardCatalogSyncOptions = {}) {
  const { enabled = true, onSyncStart, onSyncComplete } = options;
  const { organizationId } = useOrganization();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncResult, setSyncResult] = useState<HazardCatalogSyncResult | null>(null);

  const syncCatalogs = useCallback(
    async (force: boolean = false): Promise<HazardCatalogSyncResult> => {
      if (!enabled || !organizationId) {
        return {
          success: false,
          hierarchyImported: 0,
          risksImported: 0,
          responsiblesImported: 0,
          errors: ['Organización no disponible'],
        };
      }

      // Verificar intervalo mínimo
      if (!force) {
        const lastSync = localStorage.getItem(LAST_SYNC_KEY);
        if (lastSync) {
          const timeSinceLastSync = Date.now() - parseInt(lastSync, 10);
          if (timeSinceLastSync < MIN_SYNC_INTERVAL) {
            console.log('Hazard catalog sync: skipping (too soon)');
            return syncResult || {
              success: true,
              hierarchyImported: 0,
              risksImported: 0,
              responsiblesImported: 0,
              errors: [],
            };
          }
        }
      }

      setIsSyncing(true);
      onSyncStart?.();

      try {
        console.log('Starting hazard catalog sync...');

        // 1. Fetch CSVs en paralelo
        const [hierarchyResponse, risksResponse, responsiblesResponse] = await Promise.all([
          fetch(HIERARCHY_CSV_URL).catch(() => null),
          fetch(RISKS_CSV_URL).catch(() => null),
          fetch(RESPONSIBLES_CSV_URL).catch(() => null),
        ]);

        // 2. Parse CSVs
        let hierarchyRows: any[] = [];
        let risksRows: any[] = [];
        let responsiblesRows: any[] = [];
        const parseErrors: string[] = [];

        if (hierarchyResponse?.ok) {
          const csvText = await hierarchyResponse.text();
          const { rows, errors } = parseHierarchySheet(csvText);
          hierarchyRows = rows;
          parseErrors.push(...errors);
        } else {
          console.warn('No se pudo cargar el catálogo de jerarquía');
        }

        if (risksResponse?.ok) {
          const csvText = await risksResponse.text();
          const { rows, errors } = parseRisksSheet(csvText);
          risksRows = rows;
          parseErrors.push(...errors);
        } else {
          console.warn('No se pudo cargar el catálogo de riesgos');
        }

        if (responsiblesResponse?.ok) {
          const csvText = await responsiblesResponse.text();
          const { rows, errors } = parseResponsiblesSheet(csvText);
          responsiblesRows = rows;
          parseErrors.push(...errors);
        } else {
          console.warn('No se pudo cargar el catálogo de responsables');
        }

        // 3. Importar a Supabase
        const result = await importHazardCatalogs({
          organizationId: organizationId,
          hierarchy: hierarchyRows,
          risks: risksRows,
          responsibles: responsiblesRows,
        });

        // Agregar errores de parsing
        result.errors.push(...parseErrors);

        console.log('Hazard catalog sync complete:', result);

        // Actualizar estado
        setSyncResult(result);
        setLastSyncTime(new Date());
        localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

        onSyncComplete?.(result);

        return result;
      } catch (error: any) {
        console.error('Error syncing hazard catalogs:', error);
        const errorResult: HazardCatalogSyncResult = {
          success: false,
          hierarchyImported: 0,
          risksImported: 0,
          responsiblesImported: 0,
          errors: [error instanceof Error ? error.message : 'Error desconocido al sincronizar'],
        };

        setSyncResult(errorResult);
        onSyncComplete?.(errorResult);

        return errorResult;
      } finally {
        setIsSyncing(false);
      }
    },
    [enabled, organizationId, onSyncStart, onSyncComplete, syncResult]
  );

  return {
    isSyncing,
    lastSyncTime,
    syncResult,
    syncCatalogs,
  };
}
