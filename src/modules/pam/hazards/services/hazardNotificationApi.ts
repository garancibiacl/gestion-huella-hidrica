import { supabase } from "@/integrations/supabase/client";
import type { HazardNotification } from "../types/notification.types";

export async function getHazardNotifications(params: {
  userId: string;
  limit?: number;
}): Promise<HazardNotification[]> {
  const { userId, limit = 50 } = params;
  const { data, error } = await supabase
    .from("hazard_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching hazard notifications", error);
    throw new Error("No se pudieron cargar las notificaciones de peligros.");
  }

  return (data || []) as unknown as HazardNotification[];
}

export async function getUnreadHazardNotificationsCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("hazard_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("Error fetching unread hazard notifications count", error);
    return 0;
  }

  return count || 0;
}

export async function markHazardNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_hazard_notification_read", {
    notification_id: notificationId,
  });

  if (error) {
    console.error("Error marking hazard notification as read", error);
    throw new Error("No se pudo marcar la notificación como leída.");
  }
}

export async function markAllHazardNotificationsAsRead(): Promise<void> {
  const { error } = await supabase.rpc("mark_all_hazard_notifications_read");

  if (error) {
    console.error("Error marking all hazard notifications as read", error);
    throw new Error("No se pudieron marcar todas las notificaciones como leídas.");
  }
}
