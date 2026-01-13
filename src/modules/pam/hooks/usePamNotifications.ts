import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { PamNotification } from "../types/notification.types";
import {
  getPamNotifications,
  getUnreadPamNotificationsCount,
  markPamNotificationAsRead,
  markAllPamNotificationsAsRead,
} from "../services/notificationApi";

export interface UsePamNotificationsResult {
  notifications: PamNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function usePamNotifications(): UsePamNotificationsResult {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<PamNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;

    try {
      const [notifs, count] = await Promise.all([
        getPamNotifications(50),
        getUnreadPamNotificationsCount(),
      ]);

      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading PLS notifications", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  // Suscripción en tiempo real a nuevas notificaciones
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("pls_notifications_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pls_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("PLS notification change detected", payload);
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
        await markPamNotificationAsRead(notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Error marking notification as read", error);
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllPamNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read", error);
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
