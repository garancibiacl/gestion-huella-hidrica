import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { HazardNotification } from "../types/notification.types";
import {
  getHazardNotifications,
  markHazardNotificationAsRead,
  markAllHazardNotificationsAsRead,
} from "../services/hazardNotificationApi";

export interface UseHazardNotificationsResult {
  notifications: HazardNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useHazardNotifications(): UseHazardNotificationsResult {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<HazardNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      const notifs = await getHazardNotifications({ userId: user.id, limit: 100 });
      // Deduplicar por hazard_report_id + type
      const deduped = new Map<string, HazardNotification>();

      for (const notif of notifs) {
        const key = `${notif.hazard_report_id ?? "no-report"}:${notif.type}`;
        if (!deduped.has(key)) {
          deduped.set(key, notif);
        }
      }

      const uniqueNotifs = Array.from(deduped.values());
      setNotifications(uniqueNotifs);
      setUnreadCount(uniqueNotifs.filter((notif) => !notif.is_read).length);
    } catch (error) {
      console.error("Error loading hazard notifications", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [user, load]);

  // Suscripción en tiempo real a nuevas notificaciones
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("hazard_notifications_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "hazard_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Hazard notification change detected", payload);
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await markHazardNotificationAsRead(notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Error marking hazard notification as read", error);
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllHazardNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all hazard notifications as read", error);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch: load,
  };
}
