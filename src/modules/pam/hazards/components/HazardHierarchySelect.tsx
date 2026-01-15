import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useHazardHierarchy } from '../hooks/useHazardReports';

interface HazardHierarchySelectProps {
  gerencia?: string;
  proceso?: string;
  actividad?: string;
  tarea?: string;
  onGerenciaChange: (value: string) => void;
  onProcesoChange: (value: string) => void;
  onActividadChange: (value: string) => void;
  onTareaChange: (value: string) => void;
}

export function HazardHierarchySelect({
  gerencia,
  proceso,
  actividad,
  tarea,
  onGerenciaChange,
  onProcesoChange,
  onActividadChange,
  onTareaChange,
}: HazardHierarchySelectProps) {
  const { data: hierarchyData = [], isLoading } = useHazardHierarchy();

  // Procesar datos para cascada
  const { gerencias, procesos, actividades, tareas } = useMemo(() => {
    const gerenciasSet = new Set<string>();
    const procesosMap = new Map<string, Set<string>>();
    const actividadesMap = new Map<string, Set<string>>();
    const tareasMap = new Map<string, Set<string>>();

    hierarchyData.forEach((item) => {
      gerenciasSet.add(item.gerencia);

      if (item.proceso) {
        if (!procesosMap.has(item.gerencia)) {
          procesosMap.set(item.gerencia, new Set());
        }
        procesosMap.get(item.gerencia)!.add(item.proceso);
      }

      if (item.actividad && item.proceso) {
        const key = `${item.gerencia}|${item.proceso}`;
        if (!actividadesMap.has(key)) {
          actividadesMap.set(key, new Set());
        }
        actividadesMap.get(key)!.add(item.actividad);
      }

      if (item.tarea && item.actividad && item.proceso) {
        const key = `${item.gerencia}|${item.proceso}|${item.actividad}`;
        if (!tareasMap.has(key)) {
          tareasMap.set(key, new Set());
        }
        tareasMap.get(key)!.add(item.tarea);
      }
    });

    return {
      gerencias: Array.from(gerenciasSet).sort(),
      procesos: procesosMap,
      actividades: actividadesMap,
      tareas: tareasMap,
    };
  }, [hierarchyData]);

  // Opciones dependientes
  const procesosOptions = gerencia
    ? Array.from(procesos.get(gerencia) || []).sort()
    : [];

  const actividadesOptions =
    gerencia && proceso
      ? Array.from(actividades.get(`${gerencia}|${proceso}`) || []).sort()
      : [];

  const tareasOptions =
    gerencia && proceso && actividad
      ? Array.from(tareas.get(`${gerencia}|${proceso}|${actividad}`) || []).sort()
      : [];

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Cargando jerarquía...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Gerencia */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Gerencia <span className="text-destructive">*</span>
        </label>
        <Select
          value={gerencia}
          onValueChange={(value) => {
            onGerenciaChange(value);
            // Reset cascada
            onProcesoChange('');
            onActividadChange('');
            onTareaChange('');
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione gerencia" />
          </SelectTrigger>
          <SelectContent>
            {gerencias.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Proceso */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Proceso</label>
        <Select
          value={proceso}
          onValueChange={(value) => {
            onProcesoChange(value);
            // Reset cascada
            onActividadChange('');
            onTareaChange('');
          }}
          disabled={!gerencia || procesosOptions.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione proceso" />
          </SelectTrigger>
          <SelectContent>
            {procesosOptions.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actividad */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Actividad</label>
        <Select
          value={actividad}
          onValueChange={(value) => {
            onActividadChange(value);
            // Reset cascada
            onTareaChange('');
          }}
          disabled={!proceso || actividadesOptions.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione actividad" />
          </SelectTrigger>
          <SelectContent>
            {actividadesOptions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tarea */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Tarea</label>
        <Select
          value={tarea}
          onValueChange={onTareaChange}
          disabled={!actividad || tareasOptions.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione tarea" />
          </SelectTrigger>
          <SelectContent>
            {tareasOptions.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
