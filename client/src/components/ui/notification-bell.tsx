import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "./button";
import { Badge } from "./badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { Bell, BellRing } from "lucide-react";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch activity logs as notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["/api/activity-logs"],
    queryFn: async () => {
      const res = await fetch("/api/activity-logs", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Filter for grade entry notifications
  const gradeNotifications = notifications?.filter((log: any) => 
    log.action === "grade_entry"
  ).slice(0, 10) || [];

  const unreadCount = gradeNotifications.filter((notification: any) => 
    new Date(notification.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
  ).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
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
            ) : gradeNotifications.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">
                لا توجد إشعارات جديدة
              </div>
            ) : (
              gradeNotifications.map((log: any) => (
                <div 
                  key={log.id} 
                  className="p-3 border rounded-lg bg-blue-50 border-blue-200"
                >
                  <div className="text-sm font-medium text-blue-900 text-right mb-1">
                    إدخال درجات جديدة
                  </div>
                  <div className="text-xs text-blue-700 text-right">
                    {log.details?.message || log.details}
                  </div>
                  <div className="text-xs text-blue-600 text-right mt-1">
                    {new Date(log.timestamp).toLocaleString('ar-SA')}
                  </div>
                  {log.details?.details && (
                    <div className="mt-2 text-xs space-y-1">
                      <div className="text-right">الطالب: {log.details.details.studentName}</div>
                      <div className="text-right">الدرجة: {log.details.details.grade}/100</div>
                      <div className="text-right">الكلية: {log.details.details.faculty}</div>
                      <div className="text-right">التخصص: {log.details.details.major}</div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};