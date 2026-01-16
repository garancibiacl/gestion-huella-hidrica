import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Upload, FileIcon, ImageIcon, Loader2, X, ExternalLink, ZoomIn } from 'lucide-react';
import { useAddHazardEvidence } from '../hooks/useHazardReports';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { HazardReportEvidence, EvidenceType } from '../types/hazard.types';

const HAZARD_EVIDENCE_BUCKET = 'hazard-evidence';

interface HazardEvidenceSectionProps {
  reportId: string;
  evidences: HazardReportEvidence[];
  canAddEvidence?: boolean;
  defaultEvidenceType?: EvidenceType;
  hideEvidenceTypeSelect?: boolean;
  acceptFileTypes?: string;
}

export function HazardEvidenceSection({
  reportId,
  evidences,
  canAddEvidence = true,
  defaultEvidenceType = 'FINDING',
  hideEvidenceTypeSelect = false,
  acceptFileTypes = 'image/*,.pdf,.doc,.docx',
}: HazardEvidenceSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState<EvidenceType>(defaultEvidenceType);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addEvidenceMutation = useAddHazardEvidence();
  const { toast } = useToast();

  const needsSignedUrls = useMemo(
    () => evidences.some((e) => e.file_url && !e.file_url.startsWith('http')),
    [evidences]
  );
  const [signedUrlByEvidenceId, setSignedUrlByEvidenceId] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function hydrateSignedUrls() {
      if (!needsSignedUrls) return;

      const entries = await Promise.all(
        evidences.map(async (e) => {
          if (!e.file_url || e.file_url.startsWith('http')) {
            return [e.id, e.file_url] as const;
          }
          const { data, error } = await supabase.storage
            .from(HAZARD_EVIDENCE_BUCKET)
            .createSignedUrl(e.file_url, 60 * 60); // 1h

          if (error || !data?.signedUrl) return [e.id, ''] as const;
          return [e.id, data.signedUrl] as const;
        })
      );

      if (cancelled) return;
      setSignedUrlByEvidenceId(Object.fromEntries(entries));
    }

    hydrateSignedUrls();
    return () => {
      cancelled = true;
    };
  }, [evidences, needsSignedUrls]);

  useEffect(() => {
    setEvidenceType(defaultEvidenceType);
  }, [defaultEvidenceType]);

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
                {!hideEvidenceTypeSelect && (
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
                )}

                {/* Archivo */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Archivo</label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptFileTypes}
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
          {evidences.map((evidence) => {
            const isImage = evidence.mime_type?.startsWith('image/');
            const signedUrl = signedUrlByEvidenceId[evidence.id];

            return (
              <div
                key={evidence.id}
                className="group relative border rounded-lg overflow-hidden hover:shadow-lg transition-all bg-white"
              >
                {/* Vista previa de imagen o ícono de archivo */}
                {isImage && signedUrl ? (
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative aspect-video bg-gray-100 overflow-hidden"
                  >
                    <img
                      src={signedUrl}
                      alt={evidence.file_name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* Overlay al hacer hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <div className="bg-white rounded-full p-2">
                          <ZoomIn className="h-5 w-5 text-gray-800" />
                        </div>
                        <div className="bg-white rounded-full p-2">
                          <ExternalLink className="h-4 w-4 text-gray-800" />
                        </div>
                      </div>
                    </div>
                    {/* Badge de tipo de evidencia */}
                    <div className="absolute top-2 left-2">
                      <span className="text-xs bg-black/70 text-white px-2 py-1 rounded-md backdrop-blur-sm">
                        {evidence.evidence_type === 'FINDING' && 'Hallazgo'}
                        {evidence.evidence_type === 'CLOSURE' && 'Cierre'}
                        {evidence.evidence_type === 'OTHER' && 'Otro'}
                      </span>
                    </div>
                  </a>
                ) : (
                  <div className="aspect-video bg-gray-50 flex flex-col items-center justify-center p-4 border-b">
                    {getEvidenceIcon(evidence.mime_type)}
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {evidence.mime_type?.includes('pdf') && 'Documento PDF'}
                      {evidence.mime_type?.includes('word') && 'Documento Word'}
                      {!evidence.mime_type?.includes('pdf') && !evidence.mime_type?.includes('word') && 'Archivo'}
                    </p>
                  </div>
                )}

                {/* Información del archivo */}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate flex-1" title={evidence.file_name}>
                      {evidence.file_name}
                    </p>
                    {!isImage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-7 px-2 flex-shrink-0"
                      >
                        <a
                          href={signedUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-disabled={!signedUrl}
                          onClick={(ev) => {
                            if (!signedUrl) {
                              ev.preventDefault();
                              toast({
                                title: 'Cargando evidencia…',
                                description: 'Intenta nuevamente en unos segundos.',
                              });
                            }
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Abrir
                        </a>
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(evidence.size_bytes)}
                  </p>

                  {evidence.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 pt-1 border-t">
                      {evidence.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

