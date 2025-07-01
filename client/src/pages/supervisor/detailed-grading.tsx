import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Users, BookOpen, AlertCircle } from "lucide-react";
import SupervisorLayout from "@/components/layout/supervisor-layout";

interface Student {
  id: number;
  user?: { name: string };
  universityId: string;
}

interface Assignment {
  id: number;
  student: Student;
  attendanceGrade?: number;
  behaviorGrade?: number;
  finalExamGrade?: number;
  calculatedFinalGrade?: number;
}

interface CourseGroup {
  id: number;
  groupName: string;
  course: {
    id: number;
    name: string;
  };
  site: {
    name: string;
  };
  assignments: Assignment[];
}

interface GradeUpdate {
  assignmentId: number;
  attendanceGrade: number;
  behaviorGrade: number;
  finalExamGrade: number;
}

const DetailedGradingPage: React.FC = () => {
  const [gradeChanges, setGradeChanges] = useState<Map<number, GradeUpdate>>(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();

  // جلب بيانات المشرف ومجموعاته
  const { data: courseGroups = [], isLoading } = useQuery({
    queryKey: ["/api/supervisor/course-assignments"],
    queryFn: async () => {
      const res = await fetch("/api/supervisor/course-assignments", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch course assignments");
      return res.json();
    },
  });

  // حفظ الدرجات المفصلة
  const saveMutation = useMutation({
    mutationFn: (updates: GradeUpdate[]) =>
      apiRequest("POST", "/api/students/detailed-grades/bulk", { updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisor/course-assignments"] });
      setGradeChanges(new Map());
      setHasUnsavedChanges(false);
      toast({
        title: "تم الحفظ",
        description: "تم حفظ جميع الدرجات بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: error.response?.data?.message || "حدث خطأ أثناء حفظ الدرجات",
      });
    },
  });

  // تحديث الدرجة وحساب الدرجة النهائية
  const updateGrade = (assignmentId: number, field: keyof GradeUpdate, value: number) => {
    const currentChanges = gradeChanges.get(assignmentId) || {
      assignmentId,
      attendanceGrade: 0,
      behaviorGrade: 0,
      finalExamGrade: 0,
    };

    // العثور على التعيين الحالي للحصول على القيم الحالية
    const assignment = courseGroups
      .flatMap((group: CourseGroup) => group.assignments)
      .find((assign: Assignment) => assign.id === assignmentId);

    if (!assignment) return;

    const updatedChanges = {
      ...currentChanges,
      attendanceGrade: field === 'attendanceGrade' ? value : (currentChanges.attendanceGrade || assignment.attendanceGrade || 0),
      behaviorGrade: field === 'behaviorGrade' ? value : (currentChanges.behaviorGrade || assignment.behaviorGrade || 0),
      finalExamGrade: field === 'finalExamGrade' ? value : (currentChanges.finalExamGrade || assignment.finalExamGrade || 0),
    };

    setGradeChanges(new Map(gradeChanges.set(assignmentId, updatedChanges)));
    setHasUnsavedChanges(true);
  };

  // حساب الدرجة النهائية (20% حضور + 30% سلوك + 50% اختبار نهائي)
  const calculateFinalGrade = (attendance: number, behavior: number, finalExam: number): number => {
    return (attendance * 0.2) + (behavior * 0.3) + (finalExam * 0.5);
  };

  // الحصول على الدرجة الحالية أو المحدثة
  const getGradeValue = (assignment: Assignment, field: keyof GradeUpdate): number => {
    const changes = gradeChanges.get(assignment.id);
    if (changes && changes[field] !== undefined) {
      return changes[field];
    }
    return (assignment as any)[field] || 0;
  };

  // حفظ جميع التغييرات
  const handleSaveAll = () => {
    const updates = Array.from(gradeChanges.values());
    if (updates.length === 0) {
      toast({
        title: "لا توجد تغييرات",
        description: "لم يتم إجراء أي تغييرات للحفظ",
      });
      return;
    }
    saveMutation.mutate(updates);
  };

  // إعادة تعيين التغييرات
  const handleResetChanges = () => {
    setGradeChanges(new Map());
    setHasUnsavedChanges(false);
    toast({
      title: "تم الإلغاء",
      description: "تم إلغاء جميع التغييرات غير المحفوظة",
    });
  };

  if (isLoading) {
    return (
      <SupervisorLayout>
        <div className="text-center py-8">جاري التحميل...</div>
      </SupervisorLayout>
    );
  }

  return (
    <SupervisorLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">إدراج الدرجات المفصلة</h1>
          <div className="flex gap-2">
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">
                  {gradeChanges.size} تغيير غير محفوظ
                </span>
              </div>
            )}
            <Button
              variant="outline"
              onClick={handleResetChanges}
              disabled={!hasUnsavedChanges}
            >
              إلغاء التغييرات
            </Button>
            <Button
              onClick={handleSaveAll}
              disabled={!hasUnsavedChanges || saveMutation.isPending}
            >
              <Save className="w-4 h-4 ml-2" />
              حفظ جميع الدرجات
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {courseGroups.map((group: CourseGroup) => (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  {group.course.name} - {group.groupName}
                  <Badge variant="outline">
                    <Users className="w-3 h-3 ml-1" />
                    {group.assignments?.length || 0} طالب
                  </Badge>
                </CardTitle>
                <p className="text-sm text-gray-600">موقع التدريب: {group.site.name}</p>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">نظام التقييم:</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>درجة الحضور: 20% (من 100)</div>
                    <div>درجة السلوك: 30% (من 100)</div>
                    <div>الاختبار النهائي: 50% (من 100)</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 p-2 text-right">الطالب</th>
                        <th className="border border-gray-300 p-2">الرقم الجامعي</th>
                        <th className="border border-gray-300 p-2">الحضور (20%)</th>
                        <th className="border border-gray-300 p-2">السلوك (30%)</th>
                        <th className="border border-gray-300 p-2">الاختبار النهائي (50%)</th>
                        <th className="border border-gray-300 p-2">الدرجة النهائية</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.assignments?.map((assignment: Assignment) => {
                        const attendanceGrade = getGradeValue(assignment, 'attendanceGrade');
                        const behaviorGrade = getGradeValue(assignment, 'behaviorGrade');
                        const finalExamGrade = getGradeValue(assignment, 'finalExamGrade');
                        const calculatedGrade = calculateFinalGrade(attendanceGrade, behaviorGrade, finalExamGrade);
                        const hasChanges = gradeChanges.has(assignment.id);

                        return (
                          <tr key={assignment.id} className={hasChanges ? "bg-yellow-50" : ""}>
                            <td className="border border-gray-300 p-2 font-medium">
                              {assignment.student.user?.name || "غير محدد"}
                              {hasChanges && (
                                <span className="text-amber-600 text-xs block">مُعدل</span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {assignment.student.universityId}
                            </td>
                            <td className="border border-gray-300 p-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={attendanceGrade}
                                onChange={(e) => updateGrade(assignment.id, 'attendanceGrade', parseFloat(e.target.value) || 0)}
                                className="w-20 text-center"
                                placeholder="0"
                              />
                            </td>
                            <td className="border border-gray-300 p-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={behaviorGrade}
                                onChange={(e) => updateGrade(assignment.id, 'behaviorGrade', parseFloat(e.target.value) || 0)}
                                className="w-20 text-center"
                                placeholder="0"
                              />
                            </td>
                            <td className="border border-gray-300 p-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={finalExamGrade}
                                onChange={(e) => updateGrade(assignment.id, 'finalExamGrade', parseFloat(e.target.value) || 0)}
                                className="w-20 text-center"
                                placeholder="0"
                              />
                            </td>
                            <td className="border border-gray-300 p-2 text-center font-medium">
                              <span className={calculatedGrade >= 60 ? "text-green-600" : "text-red-600"}>
                                {calculatedGrade.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {(!group.assignments || group.assignments.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    لا يوجد طلاب مسجلون في هذه المجموعة
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {courseGroups.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">لا توجد مجموعات مُعينة لك حالياً</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </SupervisorLayout>
  );
};

export default DetailedGradingPage;