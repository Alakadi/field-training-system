import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "./button";
import { Badge } from "./badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { Bell, BellRing, Users } from "lucide-react";

interface SupervisorAssignment {
  id: number;
  supervisorId: number;
  course: {
    name: string;
    faculty: string;
    major: string;
  };
  groupName: string;
  site: {
    name: string;
  };
  assignedAt: string;
  assignedBy: string;
}

export const SupervisorNotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch supervisor's course assignments (when admin assigns supervisor to courses)
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["/api/supervisor/course-assignments"],
    queryFn: async () => {
      const res = await fetch("/api/supervisor/course-assignments", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Filter for new course assignments (last 7 days)
  const newAssignments = assignments?.filter((assignment: SupervisorAssignment) => 
    new Date(assignment.assignedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).slice(0, 10) || [];

  const unreadCount = newAssignments.length;

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
          <h3 className="font-semibold text-right">تعييناتك الجديدة كمشرف</h3>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-4 text-sm text-gray-500">
                جاري التحميل...
              </div>
            ) : newAssignments.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">
                لا توجد تعيينات جديدة كمشرف
              </div>
            ) : (
              newAssignments.map((assignment: SupervisorAssignment) => (
                <div 
                  key={assignment.id} 
                  className="p-3 border rounded-lg bg-green-50 border-green-200"
                >
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 mt-1 text-green-600" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-right mb-1">
                        تم تعيينك كمشرف لكورس جديد
                      </div>
                      <div className="text-xs text-gray-700 text-right space-y-1">
                        <div>الكورس: {assignment.course?.name || 'غير محدد'}</div>
                        <div>المجموعة: {assignment.groupName || 'غير محدد'}</div>
                        <div>موقع التدريب: {assignment.site?.name || 'غير محدد'}</div>
                        <div>الكلية: {assignment.course?.faculty || 'غير محدد'}</div>
                        <div>التخصص: {assignment.course?.major || 'غير محدد'}</div>
                        <div className="flex items-center justify-between">
                          <span>تم التعيين بواسطة: {assignment.assignedBy || 'المسؤول'}</span>
                          <span>{new Date(assignment.assignedAt).toLocaleDateString('ar-SA')}</span>
                        </div>
                      </div>
                    </div>
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