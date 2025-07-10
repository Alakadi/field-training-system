import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "./button";
import { Badge } from "./badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { Bell } from "./icons";

interface ActivityNotification {
  id: number;
  notificationTitle: string;
  notificationMessage: string;
  notificationType: string;
  isRead: boolean;
  timestamp: string;
}

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [lastReadTime, setLastReadTime] = useState<string | null>(
    localStorage.getItem('notifications-last-read')
  );

  const markAsRead = async () => {
    // Mark notifications as read when bell is clicked
    try {
      const currentTime = new Date().toISOString();
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        credentials: "include",
      });
      
      // Update local storage with current time
      localStorage.setItem('notifications-last-read', currentTime);
      setLastReadTime(currentTime);
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  // Fetch notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Use all notifications (limit to 10 most recent)
  const recentNotifications = notifications?.slice(0, 10) || [];

  // Count unread notifications
  const unreadCount = recentNotifications.filter((notification: ActivityNotification) => 
    !notification.isRead
  ).length;

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) {
        markAsRead();
      }
    }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-2">
          <h3 className="font-semibold text-right">الإشعارات</h3>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-4 text-sm text-gray-500">
                جاري التحميل...
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">
                لا توجد إشعارات جديدة
              </div>
            ) : (
              recentNotifications.map((notification: ActivityNotification) => (
                <div 
                  key={notification.id} 
                  className={`p-3 border rounded-lg ${
                    notification.isRead 
                      ? 'bg-gray-50 border-gray-200' 
                      : notification.notificationType === 'success' 
                        ? 'bg-green-50 border-green-200'
                        : notification.notificationType === 'warning'
                          ? 'bg-yellow-50 border-yellow-200'
                          : notification.notificationType === 'error'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className={`text-sm font-medium text-right mb-1 ${
                    notification.isRead 
                      ? 'text-gray-700' 
                      : notification.notificationType === 'success' 
                        ? 'text-green-900'
                        : notification.notificationType === 'warning'
                          ? 'text-yellow-900'
                          : notification.notificationType === 'error'
                            ? 'text-red-900'
                            : 'text-blue-900'
                  }`}>
                    {notification.notificationTitle}
                    {!notification.isRead && (
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    )}
                  </div>
                  <div className={`text-xs text-right mb-1 ${
                    notification.isRead 
                      ? 'text-gray-600' 
                      : notification.notificationType === 'success' 
                        ? 'text-green-700'
                        : notification.notificationType === 'warning'
                          ? 'text-yellow-700'
                          : notification.notificationType === 'error'
                            ? 'text-red-700'
                            : 'text-blue-700'
                  }`}>
                    {notification.notificationMessage}
                  </div>
                  <div className={`text-xs text-right ${
                    notification.isRead 
                      ? 'text-gray-500' 
                      : notification.notificationType === 'success' 
                        ? 'text-green-600'
                        : notification.notificationType === 'warning'
                          ? 'text-yellow-600'
                          : notification.notificationType === 'error'
                            ? 'text-red-600'
                            : 'text-blue-600'
                  }`}>
                    {new Date(notification.timestamp).toLocaleString('ar-SA')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};