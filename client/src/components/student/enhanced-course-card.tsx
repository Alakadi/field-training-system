import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, User, Users, Clock, CheckCircle } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface GroupData {
  id: number;
  groupName: string;
  capacity: number;
  currentEnrollment: number;
  startDate: string;
  endDate: string;
  site?: {
    id: number;
    name: string;
  };
  supervisor?: {
    id: number;
    user: {
      id: number;
      name: string;
    };
  };
}

interface Course {
  id: number;
  name: string;
  description?: string;
  status: string;
  faculty?: {
    name: string;
  };
  major?: {
    name: string;
  };
  level?: {
    name: string;
  };
}

interface EnhancedCourseCardProps {
  course: Course;
  groups: GroupData[];
  myAssignments: any[];
  onRegister: (groupId: number) => void;
  onCancel: (groupId: number) => void;
  onTransfer: (fromGroupId: number, toGroupId: number) => void;
  isRegistering: boolean;
}

const EnhancedCourseCard: React.FC<EnhancedCourseCardProps> = ({
  course,
  groups,
  myAssignments,
  onRegister,
  onCancel,
  onTransfer,
  isRegistering
}) => {
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="secondary">قادمة</Badge>;
      case 'active':
        return <Badge variant="default">نشطة</Badge>;
      case 'completed':
        return <Badge variant="outline">مكتملة</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getMyAssignmentForCourse = () => {
    return myAssignments?.find(assignment => {
      // Check direct courseId or nested course.id
      const assignmentCourseId = assignment.courseId || assignment.course?.id;
      return assignmentCourseId === course.id;
    });
  };

  const isRegisteredInGroup = (groupId: number) => {
    const assignment = getMyAssignmentForCourse();
    return assignment?.groupId === groupId;
  };

  const isRegisteredInCourse = () => {
    return getMyAssignmentForCourse() !== undefined;
  };

  const canRegisterInCourse = () => {
    return course.status === 'active';
  };
  
  const isUpcomingCourse = () => {
    return course.status === 'upcoming';
  };

  return (
    <Card className="w-full border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold text-gray-900">
              {course.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge(course.status)}
              {isRegisteredInCourse() && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  مسجل
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {course.description && (
          <p className="text-gray-600 text-sm mt-2">{course.description}</p>
        )}
        
        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-2">
          {course.faculty && (
            <span className="bg-gray-100 px-2 py-1 rounded">
              {course.faculty.name}
            </span>
          )}
          {course.major && (
            <span className="bg-gray-100 px-2 py-1 rounded">
              {course.major.name}
            </span>
          )}
          {course.level && (
            <span className="bg-gray-100 px-2 py-1 rounded">
              {course.level.name}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4" />
            المجموعات المتاحة ({groups.length})
          </h4>
          
          {groups.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              لا توجد مجموعات متاحة لهذه الدورة
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => {
                const availableSeats = group.capacity - group.currentEnrollment;
                const isMyGroup = isRegisteredInGroup(group.id);
                const canRegister = !isRegisteredInCourse() && availableSeats > 0 && canRegisterInCourse();
                const canSwitchToThisGroup = isRegisteredInCourse() && !isMyGroup && availableSeats > 0;
                
                return (
                  <div
                    key={group.id}
                    className={`border rounded-lg p-4 ${
                      isMyGroup ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium">{group.groupName}</h5>
                        {isMyGroup && (
                          <Badge variant="default" className="bg-green-600 text-xs">
                            مجموعتي
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {group.currentEnrollment}/{group.capacity}
                        </Badge>
                        {availableSeats <= 0 && (
                          <Badge variant="destructive" className="text-xs">
                            ممتلئة
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm mb-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        <CalendarDays className="w-4 h-4" />
                        <span>
                          {group.startDate && group.endDate
                            ? `${formatDate(group.startDate)} - ${formatDate(group.endDate)}`
                            : 'التواريخ غير محددة'
                          }
                        </span>
                      </div>
                      
                      {group.site && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{group.site.name}</span>
                        </div>
                      )}
                      
                      {group.supervisor && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <User className="w-4 h-4" />
                          <span>{group.supervisor.user.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {isMyGroup ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onCancel(group.id)}
                          disabled={isRegistering}
                          className="text-xs"
                        >
                          إلغاء التسجيل
                        </Button>
                      ) : isUpcomingCourse() ? (
                        <Button variant="secondary" size="sm" disabled className="text-xs bg-blue-100 text-blue-800">
                          الدورة قادمة
                        </Button>
                      ) : canRegister ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onRegister(group.id)}
                          disabled={isRegistering}
                          className="text-xs"
                        >
                          {isRegistering ? "جاري التسجيل..." : "التسجيل"}
                        </Button>
                      ) : canSwitchToThisGroup ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentAssignment = getMyAssignmentForCourse();
                            if (currentAssignment?.groupId) {
                              onTransfer(currentAssignment.groupId, group.id);
                            }
                          }}
                          disabled={isRegistering}
                          className="text-xs"
                        >
                          {isRegistering ? "جاري التحويل..." : "التحويل لهذه المجموعة"}
                        </Button>
                      ) : availableSeats <= 0 ? (
                        <Button variant="secondary" size="sm" disabled className="text-xs">
                          ممتلئة
                        </Button>
                      ) : !canRegisterInCourse() ? (
                        <Button variant="secondary" size="sm" disabled className="text-xs">
                          التسجيل غير متاح
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedCourseCard;