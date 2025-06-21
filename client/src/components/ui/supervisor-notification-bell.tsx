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

interface Assignment {
  id: number;
  student: {
    name: string;
    universityId: string;
  };
  group: {
    course: {
      name: string;
    };
    groupName: string;
  };
  status: string;
  assignedAt: string;
}

export const SupervisorNotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch supervisor's assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["/api/training-assignments"],
    queryFn: async () => {
      const res = await fetch("/api/training-assignments", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Filter for new assignments (last 24 hours)
  const newAssignments = assignments?.filter((assignment: Assignment) => 
    assignment.status === 'pending' || 
    new Date(assignment.assignedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).slice(0, 10) || [];

  const unreadCount = newAssignments.filter((assignment: Assignment) => 
    assignment.status === 'pending'
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
          <h3 className="font-semibold text-right">التعيينات الجديدة</h3>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-4 text-sm text-gray-500">
                جاري التحميل...
              </div>
            ) : newAssignments.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">
                لا توجد تعيينات جديدة
              </div>
            ) : (
              newAssignments.map((assignment: Assignment) => (
                <div 
                  key={assignment.id} 
                  className={`p-3 border rounded-lg ${
                    assignment.status === 'pending' 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 mt-1 text-blue-600" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-right mb-1">
                        تعيين طالب جديد
                      </div>
                      <div className="text-xs text-gray-700 text-right space-y-1">
                        <div>الطالب: {assignment.student.name}</div>
                        <div>الرقم الجامعي: {assignment.student.universityId}</div>
                        <div>الكورس: {assignment.group.course.name}</div>
                        <div>المجموعة: {assignment.group.groupName}</div>
                        <div className="flex items-center justify-between">
                          <span>الحالة: {assignment.status === 'pending' ? 'في الانتظار' : 'نشط'}</span>
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