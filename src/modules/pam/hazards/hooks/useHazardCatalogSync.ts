import { useState, useCallback } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import {
  parseHazardMasterSheet,
  importHazardCatalogs,
} from '../services/hazardImporter';
import type { HazardCatalogSyncResult } from '../types/hazard.types';

// Google Sheet entregado por el usuario (link de edición). Lo convertimos a CSV.
// Nuevas columnas: Gerencia | Proceso | Actividad | Tarea | Centro de Trabajo / Faena |
// Riesgo Crítico | Empresa | Responsables (Nombre) | Responsables (RUT) | Responsables (Correo Electrónico)
const HAZARDS_SHEET_PUBHTML_URL =
  'https://docs.google.com/spreadsheets/d/1NYNeMkms3TMiR4xPDPqn9DrzvU8FLR2vFN8QTkGq4Po/edit?usp=sharing';

function toCsvUrlFromPublishedSheet(publishedUrl: string): string {
  // Patrones comunes:
  // - .../edit -> .../export?format=csv
  // - .../pubhtml -> .../pub?output=csv
  // - .../pubhtml?... -> .../pub?output=csv&...
  if (publishedUrl.includes('/edit')) {
    const [base] = publishedUrl.split('/edit');
    return `${base}/export?format=csv`;
  }
  if (publishedUrl.includes('/pubhtml')) {
    const [base, query] = publishedUrl.split('?');
    const pubBase = base.replace('/pubhtml', '/pub');
    return query ? `${pubBase}?output=csv&${query}` : `${pubBase}?output=csv`;
  }
  if (publishedUrl.includes('output=csv')) return publishedUrl;
  return publishedUrl.includes('?') ? `${publishedUrl}&output=csv` : `${publishedUrl}?output=csv`;
}

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

        const csvUrl = toCsvUrlFromPublishedSheet(HAZARDS_SHEET_PUBHTML_URL);
        const response = await fetch(csvUrl);
        if (!response.ok) {
          throw new Error(`Error fetching Google Sheet (CSV): ${response.statusText}`);
        }

        const csvText = await response.text();
        const { hierarchy, risks, responsibles, errors: parseErrors } =
          parseHazardMasterSheet(csvText);

        // 3. Importar a Supabase
        const result = await importHazardCatalogs({
          organizationId,
          hierarchy,
          risks,
          responsibles,
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
