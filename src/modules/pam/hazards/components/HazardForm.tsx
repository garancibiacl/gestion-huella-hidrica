import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { HazardHierarchySelect } from './HazardHierarchySelect';
import { useHazardCriticalRisks, useHazardResponsibles } from '../hooks/useHazardReports';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { CreateHazardReportPayload } from '../types/hazard.types';

// Schema de validación
const hazardReportSchema = z.object({
  // Jerarquía
  gerencia: z.string().min(1, 'Gerencia es requerida'),
  proceso: z.string().optional(),
  actividad: z.string().optional(),
  tarea: z.string().optional(),
  
  // Ubicación
  faena: z.string().optional(),
  centro_trabajo: z.string().optional(),
  
  // Riesgo
  critical_risk_id: z.string().min(1, 'Riesgo crítico es requerido'),
  
  // Descripción
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  root_cause: z.string().optional(),
  deviation_type: z.enum(['ACCION', 'CONDICION'], {
    required_error: 'Debe seleccionar un tipo de desviación',
  }),
  
  // Responsable y plazo
  closing_responsible_id: z.string().min(1, 'Responsable de cierre es requerido'),
  due_date: z.date({ required_error: 'Plazo de cierre es requerido' }),
  
  // Reportante (autocompletado)
  reporter_name: z.string().min(1, 'Nombre del reportante es requerido'),
  reporter_rut: z.string().optional(),
  reporter_email: z.string().email('Email inválido').optional().or(z.literal('')),
  reporter_company: z.string().optional(),
});

type HazardReportFormValues = z.infer<typeof hazardReportSchema>;

interface HazardFormProps {
  onSubmit: (params: { payload: CreateHazardReportPayload; evidences: File[] }) => void;
  isSubmitting?: boolean;
}

export function HazardForm({ onSubmit, isSubmitting }: HazardFormProps) {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const { data: criticalRisks = [] } = useHazardCriticalRisks();
  const { data: responsibles = [] } = useHazardResponsibles();
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const evidenceSectionRef = useRef<HTMLDivElement | null>(null);
  const [findingPhotos, setFindingPhotos] = useState<File[]>([]);
  const [findingFiles, setFindingFiles] = useState<File[]>([]);

  const form = useForm<HazardReportFormValues>({
    resolver: zodResolver(hazardReportSchema),
    defaultValues: {
      gerencia: '',
      proceso: '',
      actividad: '',
      tarea: '',
      faena: '',
      centro_trabajo: '',
      critical_risk_id: '',
      description: '',
      root_cause: '',
      deviation_type: 'CONDICION',
      closing_responsible_id: '',
      // Autocompletar desde perfil
      reporter_name: profile?.full_name || user?.email || '',
      reporter_email: profile?.email || user?.email || '',
      reporter_company: profile?.organization_id || '',
    },
  });

  const handleSubmit = (values: HazardReportFormValues) => {
    setEvidenceError(null);

    const selectedRisk = criticalRisks.find((r) => r.id === values.critical_risk_id);
    const requiresEvidence =
      !!selectedRisk?.requires_evidence ||
      selectedRisk?.severity === 'ALTA' ||
      selectedRisk?.severity === 'CRITICA';

    const evidences = [...findingPhotos, ...findingFiles];
    if (requiresEvidence && evidences.length === 0) {
      setEvidenceError(
        'Este riesgo requiere evidencia. Adjunta al menos 1 foto (recomendado) o archivo.'
      );
      evidenceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const payload: CreateHazardReportPayload = {
      ...values,
      due_date: format(values.due_date, 'yyyy-MM-dd'),
      reporter_email: values.reporter_email || undefined,
    };
    onSubmit({ payload, evidences });
  };

  const criticalRiskHint = useMemo(() => {
    const selectedId = form.watch('critical_risk_id');
    const selected = criticalRisks.find((r) => r.id === selectedId);
    if (!selected) return null;
    const requires =
      !!selected.requires_evidence ||
      selected.severity === 'ALTA' ||
      selected.severity === 'CRITICA';
    return {
      requiresEvidence: requires,
      label:
        selected.severity || selected.requires_evidence
          ? `Severidad: ${selected.severity ?? '—'}${selected.requires_evidence ? ' · Evidencia obligatoria' : ''}`
          : null,
    };
  }, [criticalRisks, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Jerarquía */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Jerarquía Organizacional</h3>
          <HazardHierarchySelect
            gerencia={form.watch('gerencia')}
            proceso={form.watch('proceso')}
            actividad={form.watch('actividad')}
            tarea={form.watch('tarea')}
            onGerenciaChange={(value) => form.setValue('gerencia', value)}
            onProcesoChange={(value) => form.setValue('proceso', value)}
            onActividadChange={(value) => form.setValue('actividad', value)}
            onTareaChange={(value) => form.setValue('tarea', value)}
          />
          {form.formState.errors.gerencia && (
            <p className="text-sm text-destructive">{form.formState.errors.gerencia.message}</p>
          )}
        </div>

        {/* Ubicación */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Ubicación</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="faena"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Faena / Centro de Trabajo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Faena Norte" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="centro_trabajo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Centro de Trabajo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Área de producción" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Riesgo y Responsable */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Riesgo y Responsable</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="critical_risk_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Riesgo Crítico <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione riesgo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {criticalRisks.map((risk) => (
                        <SelectItem key={risk.id} value={risk.id}>
                          {risk.name}
                          {risk.severity && ` (${risk.severity})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="closing_responsible_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Responsable de Cierre <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione responsable" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {responsibles
                        .filter((r) => r.can_close)
                        .map((resp) => (
                          <SelectItem key={resp.id} value={resp.id}>
                            {resp.name}
                            {resp.company && ` - ${resp.company}`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>
                  Plazo de Cierre <span className="text-destructive">*</span>
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full md:w-[240px] pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP', { locale: es })
                        ) : (
                          <span>Seleccione fecha</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>Fecha límite para cerrar el reporte</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Descripción del Peligro */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Descripción del Peligro</h3>

          <FormField
            control={form.control}
            name="deviation_type"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>
                  Tipo de Desviación <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="CONDICION" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Condición (estado inseguro del entorno)
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="ACCION" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Acción (comportamiento inseguro)
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Descripción del Peligro <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describa detalladamente el peligro identificado..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Detalle qué observó, dónde, cuándo y las condiciones relevantes
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="root_cause"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Causa Raíz (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="¿Cuál es la causa que originó este peligro?"
                    className="min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Evidencias (foto primero) */}
        <div ref={evidenceSectionRef} className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Evidencias</h3>
              <p className="text-sm text-muted-foreground">
                Foto primero (ideal en terreno). Luego puedes adjuntar archivos si hace falta.
              </p>
              {criticalRiskHint?.label && (
                <p className="text-xs text-muted-foreground">{criticalRiskHint.label}</p>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {findingPhotos.length + findingFiles.length} adjunto(s)
            </div>
          </div>

          {evidenceError && (
            <div className="text-sm text-destructive">{evidenceError}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Fotos (recomendado)
                {criticalRiskHint?.requiresEvidence && (
                  <span className="text-destructive"> *</span>
                )}
              </label>
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                disabled={isSubmitting}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (!files.length) return;
                  setFindingPhotos((prev) => [...prev, ...files]);
                  e.currentTarget.value = '';
                }}
              />
              {findingPhotos.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-1">
                  {findingPhotos.map((f, idx) => (
                    <li
                      key={`${f.name}-${f.size}-${idx}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{f.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() =>
                          setFindingPhotos((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        Quitar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Archivos (opcional)</label>
              <Input
                type="file"
                accept="application/pdf,.pdf,.doc,.docx"
                multiple
                disabled={isSubmitting}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (!files.length) return;
                  setFindingFiles((prev) => [...prev, ...files]);
                  e.currentTarget.value = '';
                }}
              />
              {findingFiles.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-1">
                  {findingFiles.map((f, idx) => (
                    <li
                      key={`${f.name}-${f.size}-${idx}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{f.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() =>
                          setFindingFiles((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        Quitar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Datos del Reportante */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Datos del Reportante</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="reporter_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nombre <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reporter_rut"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RUT</FormLabel>
                  <FormControl>
                    <Input placeholder="12.345.678-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reporter_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reporter_company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre de la empresa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Reporte
          </Button>
        </div>
      </form>
    </Form>
  );
}
