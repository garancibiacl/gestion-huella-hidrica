import { supabase } from "@/integrations/supabase/client";
import type { PamNotification } from "../types/notification.types";

export async function getPamNotifications(limit = 50): Promise<PamNotification[]> {
  const { data, error } = await supabase
    .from("pam_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching PLS notifications", error);
    throw new Error("No se pudieron cargar las notificaciones.");
  }

  return (data || []) as unknown as PamNotification[];
}

export async function getUnreadPamNotificationsCount(): Promise<number> {
  const { count, error } = await supabase
    .from("pam_notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) {
    console.error("Error fetching unread notifications count", error);
    return 0;
  }

  return count || 0;
}

export async function markPamNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_pam_notification_read", {
    notification_id: notificationId,
  });

  if (error) {
    console.error("Error marking notification as read", error);
    throw new Error("No se pudo marcar la notificación como leída.");
  }
}

export async function markAllPamNotificationsAsRead(): Promise<void> {
  const { error } = await supabase.rpc("mark_all_pam_notifications_read");

  if (error) {
    console.error("Error marking all notifications as read", error);
    throw new Error("No se pudieron marcar todas las notificaciones como leídas.");
  }
}
