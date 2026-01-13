import type { Json } from "@/integrations/supabase/types";

export type PamTaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "OVERDUE";

export interface PamTask {
  id: string;
  week_number: number;
  week_year: number;
  date: string;
  assignee_user_id: string;
  assignee_name: string | null;
  description: string;
  location: string | null;
  risk_type: string | null;
  status: PamTaskStatus;
  has_evidence: boolean;
  created_at: string;
  updated_at: string;
}

export interface PamTaskEvidence {
  id: string;
  task_id: string;
  uploaded_by_user_id: string;
  uploaded_at: string;
  file_url: string;
  notes: string | null;
}

export type PamTaskInsert = Omit<PamTask, "id" | "created_at" | "updated_at">;

export type PamTaskEvidenceInsert = Omit<PamTaskEvidence, "id" | "uploaded_at"> & {
  metadata?: Json | null;
};
