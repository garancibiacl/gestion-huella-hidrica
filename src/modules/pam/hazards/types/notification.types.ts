export interface HazardNotification {
  id: string;
  organization_id: string;
  user_id: string;
  hazard_report_id: string | null;
  type: 'report_assigned' | 'report_closed' | 'report_due_soon' | 'report_overdue';
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
