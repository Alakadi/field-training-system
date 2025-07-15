import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, Users, Clock } from "lucide-react";

interface Student {
  id: number;
  universityId: string;
  user: {
    name: string;
  };
  faculty?: {
    id: number;
    name: string;
  };
  major?: {
    id: number;
    name: string;
  };
  level?: {
    id: number;
    name: string;
  };
}

interface CourseAssignmentModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onAssign: (courseGroupId: number) => void;
}

const CourseAssignmentModal: React.FC<CourseAssignmentModalProps> = ({
  student,
  isOpen,
  onClose,
  onAssign
}) => {
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

  // Fetch available course groups for this student based on faculty, major, and level
  const { data: availableCourses, isLoading } = useQuery({
    queryKey: ["/api/training-course-groups", "available", student?.id],
    queryFn: async () => {
      if (!student) return [];
      
      const params = new URLSearchParams({
        availableOnly: 'true',
      });
      
      if (student.major?.id) {
        params.append('majorId', student.major.id.toString());
      }
      
      const res = await fetch(`/api/training-course-groups?${params}`, {
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to fetch available courses");
      return res.json();
    },
    enabled: !!student && isOpen,
  });

  const handleAssign = async () => {
    if (!selectedGroup || !student) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار مجموعة تدريبية",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/training-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          studentId: student.id,
          groupId: selectedGroup,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to assign student to course");
      }

      toast({
        title: "تم بنجاح",
        description: "تم تعيين الطالب للدورة التدريبية",
      });

      onAssign(selectedGroup);
      setSelectedGroup(null);
      onClose();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تعيين الطالب للدورة",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      upcoming: { label: "قادمة", variant: "secondary" as const },
      active: { label: "نشطة", variant: "default" as const },
      completed: { label: "مكتملة", variant: "outline" as const },
      cancelled: { label: "ملغية", variant: "destructive" as const },
    };
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const };
  };

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعيين كورس تدريبي - {student.user.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">معلومات الطالب</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">الرقم الجامعي:</span>
                  <p>{student.universityId}</p>
                </div>
                <div>
                  <span className="font-medium">الكلية:</span>
                  <p>{student.faculty?.name || "غير محدد"}</p>
                </div>
                <div>
                  <span className="font-medium">التخصص:</span>
                  <p>{student.major?.name || "غير محدد"}</p>
                </div>
                <div>
                  <span className="font-medium">المستوى:</span>
                  <p>{student.level?.name || "غير محدد"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Courses */}
          <div>
            <h3 className="text-lg font-semibold mb-4">الكورسات المتاحة</h3>
            
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !availableCourses || availableCourses.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">
                    لا توجد كورسات متاحة لهذا الطالب حالياً.
                    تأكد من أن هناك كورسات مناسبة لكلية وتخصص ومستوى الطالب.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {availableCourses.map((group: any) => (
                  <Card 
                    key={group.id} 
                    className={`cursor-pointer transition-all ${
                      selectedGroup === group.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedGroup(group.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-lg">{group.course?.name}</h4>
                            <Badge variant={getStatusBadge(group.course?.status).variant}>
                              {getStatusBadge(group.course?.status).label}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{group.site?.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{group.availableSpots} مقاعد متاحة من {group.capacity}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{group.supervisor?.user?.name}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-green-600" />
                              <span>البداية: {new Date(group.startDate).toLocaleDateString('en-US')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-red-600" />
                              <span>النهاية: {new Date(group.endDate).toLocaleDateString('en-US')}</span>
                            </div>
                          </div>

                          {group.course?.description && (
                            <p className="text-sm text-gray-600 mt-2">
                              {group.course.description}
                            </p>
                          )}
                        </div>

                        <div className="mr-4">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            selectedGroup === group.id 
                              ? 'bg-primary border-primary' 
                              : 'border-gray-300'
                          }`}>
                            {selectedGroup === group.id && (
                              <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={!selectedGroup || !availableCourses || availableCourses.length === 0}
            >
              تعيين للكورس
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CourseAssignmentModal;