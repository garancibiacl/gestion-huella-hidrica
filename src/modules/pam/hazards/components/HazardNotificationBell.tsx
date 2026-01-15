import { Bell, CheckCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHazardNotifications } from "../hooks/useHazardNotifications";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function HazardNotificationBell() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useHazardNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleNotificationClick = async (
    notificationId: string,
    reportId: string | null
  ) => {
    await markAsRead(notificationId);
    if (reportId) {
      navigate(`/admin/hazards/${reportId}`);
    }
    setOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'report_assigned':
      case 'report_closed':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'report_due_soon':
      case 'report_overdue':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <AlertTriangle className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones de Peligros</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-auto py-1 px-2 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="py-4 text-center text-muted-foreground text-sm">
            Cargando...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground text-sm">
            No hay notificaciones
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.slice(0, 10).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() =>
                  handleNotificationClick(
                    notification.id,
                    notification.hazard_report_id
                  )
                }
                className={cn(
                  "flex flex-col items-start gap-1 cursor-pointer py-3",
                  !notification.is_read && "bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  {getTypeIcon(notification.type)}
                  <span className="font-medium text-sm flex-1 truncate">
                    {notification.title}
                  </span>
                  {!notification.is_read && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground line-clamp-2 pl-6">
                  {notification.message}
                </span>
                <span className="text-xs text-muted-foreground pl-6">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
