import { useState, FormEvent } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { uploadPamEvidenceFile } from "../../services/pamApi";

interface PamEvidenceUploadDialogProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEvidenceSaved: (params: { taskId: string; fileUrl: string; notes?: string }) => Promise<void>;
}

export function PamEvidenceUploadDialog({
  taskId,
  open,
  onOpenChange,
  onEvidenceSaved,
}: PamEvidenceUploadDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { organizationId } = useOrganization();

  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (isSubmitting) return;
    setFile(null);
    setNotes("");
    onOpenChange(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!taskId || !file || !user?.id || !organizationId) {
      toast({
        title: "Datos incompletos",
        description: "Selecciona un archivo y asegúrate de tener organización asignada.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const fileUrl = await uploadPamEvidenceFile({
        organizationId,
        taskId,
        file,
      });

      await onEvidenceSaved({ taskId, fileUrl, notes: notes.trim() || undefined });

      toast({
        title: "Evidencia subida",
        description: "La evidencia se guardó correctamente.",
      });

      handleClose();
    } catch (error: any) {
      console.error("Error al subir evidencia PLS", error);
      toast({
        title: "Error al subir evidencia",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo subir la evidencia. Inténtalo nuevamente.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir evidencia</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="pls-evidence-file">Archivo</Label>
            <Input
              id="pls-evidence-file"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const selected = e.target.files?.[0] ?? null;
                setFile(selected);
              }}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pls-evidence-notes">Notas (opcional)</Label>
            <Textarea
              id="pls-evidence-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Describe brevemente la evidencia adjunta"
              disabled={isSubmitting}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !file}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Subir evidencia
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
