import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { useHazardCriticalRisks, useHazardResponsibles } from '../hooks/useHazardReports';
import type { HazardReportFilters } from '../types/hazard.types';

interface HazardFiltersProps {
  filters: HazardReportFilters;
  onFiltersChange: (filters: HazardReportFilters) => void;
}

export function HazardFilters({ filters, onFiltersChange }: HazardFiltersProps) {
  const [searchText, setSearchText] = useState(filters.search || '');

  const { data: criticalRisks = [] } = useHazardCriticalRisks();
  const { data: responsibles = [] } = useHazardResponsibles();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ ...filters, search: searchText });
  };

  const handleClearFilters = () => {
    setSearchText('');
    onFiltersChange({});
  };

  const hasActiveFilters = 
    filters.status || 
    filters.gerencia || 
    filters.critical_risk_id || 
    filters.closing_responsible_id || 
    filters.faena || 
    filters.assigned_to_me || 
    filters.search;

  return (
    <div className="space-y-4">
      {/* Búsqueda */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por descripción o reportante..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit">Buscar</Button>
        {hasActiveFilters && (
          <Button type="button" variant="outline" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
        )}
      </form>

      {/* Filtros avanzados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estado */}
        <Select
          value={filters.status?.[0] || 'all'}
          onValueChange={(value) => {
            if (value === 'all') {
              onFiltersChange({ ...filters, status: undefined });
            } else {
              onFiltersChange({ ...filters, status: [value as any] });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="OPEN">Abierto</SelectItem>
            <SelectItem value="CLOSED">Cerrado</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        {/* Riesgo crítico */}
        <Select
          value={filters.critical_risk_id || 'all'}
          onValueChange={(value) => {
            onFiltersChange({
              ...filters,
              critical_risk_id: value === 'all' ? undefined : value,
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Riesgo crítico" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los riesgos</SelectItem>
            {criticalRisks.map((risk) => (
              <SelectItem key={risk.id} value={risk.id}>
                {risk.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Responsable */}
        <Select
          value={filters.closing_responsible_id || 'all'}
          onValueChange={(value) => {
            onFiltersChange({
              ...filters,
              closing_responsible_id: value === 'all' ? undefined : value,
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Responsable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los responsables</SelectItem>
            {responsibles.map((resp) => (
              <SelectItem key={resp.id} value={resp.id}>
                {resp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Asignados a mí */}
        <Button
          variant={filters.assigned_to_me ? 'default' : 'outline'}
          onClick={() =>
            onFiltersChange({
              ...filters,
              assigned_to_me: !filters.assigned_to_me,
            })
          }
          className="w-full"
        >
          {filters.assigned_to_me ? 'Asignados a mí ✓' : 'Asignados a mí'}
        </Button>
      </div>
    </div>
  );
}
