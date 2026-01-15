import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, FileIcon, ImageIcon, Loader2, X } from 'lucide-react';
import { useAddHazardEvidence } from '../hooks/useHazardReports';
import { useToast } from '@/hooks/use-toast';
import type { HazardReportEvidence, EvidenceType } from '../types/hazard.types';

interface HazardEvidenceSectionProps {
  reportId: string;
  evidences: HazardReportEvidence[];
  canAddEvidence?: boolean;
}

export function HazardEvidenceSection({
  reportId,
  evidences,
  canAddEvidence = true,
}: HazardEvidenceSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('FINDING');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addEvidenceMutation = useAddHazardEvidence();
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamaño (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Archivo demasiado grande',
          description: 'El archivo no debe superar los 10MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await addEvidenceMutation.mutateAsync({
        reportId,
        file: selectedFile,
        evidenceType,
        description: description || undefined,
      });

      toast({
        title: 'Evidencia agregada',
        description: 'La evidencia se ha subido correctamente',
      });

      // Reset
      setSelectedFile(null);
      setDescription('');
      setIsDialogOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast({
        title: 'Error al subir evidencia',
        description: error.message || 'No se pudo subir el archivo',
        variant: 'destructive',
      });
    }
  };

  const getEvidenceIcon = (mimeType?: string) => {
    if (mimeType?.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5" />;
    }
    return <FileIcon className="h-5 w-5" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Desconocido';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Evidencias</h3>
        {canAddEvidence && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Agregar Evidencia
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Subir Evidencia</DialogTitle>
                <DialogDescription>
                  Sube fotos o archivos relacionados con el reporte
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Tipo de evidencia */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Evidencia</label>
                  <Select value={evidenceType} onValueChange={(v) => setEvidenceType(v as EvidenceType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FINDING">Hallazgo</SelectItem>
                      <SelectItem value="CLOSURE">Cierre</SelectItem>
                      <SelectItem value="OTHER">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Archivo */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Archivo</label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                  />
                  {selectedFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {getEvidenceIcon(selectedFile.type)}
                      <span>
                        {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Descripción */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descripción (opcional)</label>
                  <Textarea
                    placeholder="Describe brevemente la evidencia..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={addEvidenceMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || addEvidenceMutation.isPending}
                >
                  {addEvidenceMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Subir
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Lista de evidencias */}
      {evidences.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Upload className="mx-auto h-12 w-12 opacity-20 mb-2" />
          <p>No hay evidencias cargadas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {evidences.map((evidence) => (
            <div
              key={evidence.id}
              className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start gap-2">
                {getEvidenceIcon(evidence.mime_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{evidence.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(evidence.size_bytes)}
                  </p>
                </div>
              </div>

              {evidence.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {evidence.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  {evidence.evidence_type === 'FINDING' && 'Hallazgo'}
                  {evidence.evidence_type === 'CLOSURE' && 'Cierre'}
                  {evidence.evidence_type === 'OTHER' && 'Otro'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8"
                >
                  <a href={evidence.file_url} target="_blank" rel="noopener noreferrer">
                    Ver
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
