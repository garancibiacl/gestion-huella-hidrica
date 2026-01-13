export type PamNotificationType = "task_assigned" | "task_due_soon" | "task_overdue";

export interface PamNotification {
  id: string;
  organization_id: string;
  user_id: string;
  task_id: string | null;
  type: PamNotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}
