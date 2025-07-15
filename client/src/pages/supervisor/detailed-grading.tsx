import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import SupervisorLayout from "@/components/layout/supervisor-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import Icon from "@/components/ui/icon-map";

interface DetailedGrades {
  assignmentId: number;
  attendanceGrade: number;
  behaviorGrade: number;
  finalExamGrade: number;
}

const SupervisorDetailedGrading: React.FC = () => {
  const { toast } = useToast();
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [grades, setGrades] = useState<{ [key: number]: DetailedGrades }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [changesCount, setChangesCount] = useState(0);

  // Fetch supervisor's course assignments
  const { data: courseAssignments = [] } = useQuery({
    queryKey: ["/api/supervisor/course-assignments"],
  });

  // Fetch students for selected course
  const { data: studentsData = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ["/api/training-courses", selectedCourseId, "students"],
    queryFn: async () => {
      if (!selectedCourseId) return [];
      const res = await fetch(`/api/training-courses/${selectedCourseId}/students`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
    enabled: !!selectedCourseId,
  });

  // Get selected course details
  const selectedCourseData = courseAssignments.find((assignment: any) => 
    String(assignment.course?.id) === selectedCourseId
  );

  // Check if group is upcoming (not started yet) - use group status not course status
  const selectedGroupData = courseAssignments.find((assignment: any) => 
    String(assignment.course?.id) === selectedCourseId
  );
  
  // Get group status from the actual group data
  const isCourseUpcoming = selectedGroupData?.groupStatus === 'upcoming';
  const isCourseCompleted = selectedGroupData?.groupStatus === 'completed';

  // Save detailed grades mutation
  const saveGradesMutation = useMutation({
    mutationFn: (updates: DetailedGrades[]) =>
      apiRequest("POST", "/api/students/detailed-grades/bulk", { updates }),
    onSuccess: () => {
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ جميع الدرجات المفصلة بنجاح",
      });
      setHasUnsavedChanges(false);
      setChangesCount(0);
      setGrades({});
      queryClient.invalidateQueries({ queryKey: ["/api/training-courses", selectedCourseId, "students"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الحفظ",
        description: error.message || "حدث خطأ أثناء حفظ الدرجات",
        variant: "destructive",
      });
    },
  });

  const handleGradeChange = (assignmentId: number, field: keyof DetailedGrades, value: number) => {
    if (value < 0 || value > 100) return;
    
    // التحقق من حالة المجموعة المحددة بدلاً من الدورة العامة
    const currentDate = new Date().toISOString().split('T')[0];
    const selectedGroup = courseAssignments.find((assignment: any) => 
      String(assignment.course?.id) === selectedCourseId
    );
    
    // منع إدخال الدرجات للمجموعات التي لم تبدأ بعد فقط
    if (selectedGroup?.groupStatus === 'upcoming') {
      toast({
        title: "لا يمكن إدخال الدرجات",
        description: "لا يمكن إدخال الدرجات للمجموعات التي لم تبدأ بعد",
        variant: "destructive",
      });
      return;
    }

    setGrades(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        assignmentId,
        [field]: value
      }
    }));

    setHasUnsavedChanges(true);
    setChangesCount(Object.keys({
      ...grades,
      [assignmentId]: {
        ...grades[assignmentId],
        assignmentId,
        [field]: value
      }
    }).length);
  };

  const calculateFinalGrade = (attendance: number, behavior: number, finalExam: number) => {
    return (attendance * 0.2) + (behavior * 0.3) + (finalExam * 0.5);
  };

  const handleSaveAllGrades = () => {
    const updates = Object.values(grades).filter(grade => 
      grade.attendanceGrade !== undefined && 
      grade.behaviorGrade !== undefined && 
      grade.finalExamGrade !== undefined
    );

    if (updates.length === 0) {
      toast({
        title: "لا توجد تغييرات",
        description: "لا توجد درجات جديدة للحفظ",
        variant: "destructive",
      });
      return;
    }

    saveGradesMutation.mutate(updates);
  };

  const handleResetChanges = () => {
    setGrades({});
    setHasUnsavedChanges(false);
    setChangesCount(0);
  };



  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">الدرجات المفصلة</h1>
            <p className="text-neutral-600 mt-2">إدارة الدرجات المفصلة للطلاب (حضور 20% + سلوك 30% + اختبار نهائي 50%)</p>
          </div>
        </div>

        {/* Course Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="book" size={20} />
              اختيار الدورة التدريبية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="اختر الدورة التدريبية..." />
              </SelectTrigger>
              <SelectContent>
                {courseAssignments.map((assignment: any) => (
                  <SelectItem key={assignment.course?.id} value={String(assignment.course?.id)}>
                    {assignment.course?.name} - {assignment.group?.groupName || `المجموعة ${assignment.groupId}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Unsaved Changes Alert */}
        {hasUnsavedChanges && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="alert_triangle" size={20} className="text-orange-600" />
                  <span className="text-orange-800">
                    لديك {changesCount} تغيير غير محفوظ
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetChanges}
                    className="text-gray-600"
                  >
                    إلغاء التغييرات
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveAllGrades}
                    disabled={saveGradesMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {saveGradesMutation.isPending ? "جاري الحفظ..." : "حفظ جميع التغييرات"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Group Status Alert */}
        {selectedCourseId && isCourseUpcoming && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Icon name="alert_triangle" size={20} className="text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">مجموعة لم تبدأ بعد</p>
                  <p className="text-sm text-yellow-700">
                    لا يمكن إدخال الدرجات للمجموعات التي لم تبدأ بعد. يرجى الانتظار حتى تبدأ المجموعة.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Students Grading Table */}
        {selectedCourseId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="users" size={20} />
                الطلاب المسجلين - {selectedCourseData?.course?.name}
                <Badge variant={isCourseUpcoming ? "secondary" : isCourseCompleted ? "outline" : "default"}>
                  {isCourseUpcoming ? "قادمة" : isCourseCompleted ? "منتهية" : "جارية"}
                </Badge>
              </CardTitle>
              <div className="text-sm text-gray-600">
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>درجة الحضور (20%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>درجة السلوك (30%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    <span>الاختبار النهائي (50%)</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingStudents ? (
                <div className="text-center py-8">
                  <Icon name="spinner" size={24} className="animate-spin mx-auto mb-2" />
                  <p>جاري تحميل بيانات الطلاب...</p>
                </div>
              ) : studentsData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Icon name="users" size={48} className="mx-auto mb-4 opacity-50" />
                  <p>لا توجد طلاب مسجلين في هذه الدورة</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-right p-3 font-medium">#</th>
                        <th className="text-right p-3 font-medium">اسم الطالب</th>
                        <th className="text-right p-3 font-medium">الرقم الجامعي</th>
                        <th className="text-right p-3 font-medium text-blue-600">
                          درجة الحضور
                          <br />
                          <span className="text-xs font-normal">(20%)</span>
                        </th>
                        <th className="text-right p-3 font-medium text-green-600">
                          درجة السلوك
                          <br />
                          <span className="text-xs font-normal">(30%)</span>
                        </th>
                        <th className="text-right p-3 font-medium text-purple-600">
                          الاختبار النهائي
                          <br />
                          <span className="text-xs font-normal">(50%)</span>
                        </th>
                        <th className="text-right p-3 font-medium text-orange-600">
                          الدرجة النهائية
                          <br />
                          <span className="text-xs font-normal">(المجموع)</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsData.map((student: any, index: number) => {
                        const currentGrades = grades[student.assignmentId] || {};
                        const attendanceGrade = currentGrades.attendanceGrade ?? (student.attendanceGrade ? parseFloat(student.attendanceGrade) : 0);
                        const behaviorGrade = currentGrades.behaviorGrade ?? (student.behaviorGrade ? parseFloat(student.behaviorGrade) : 0);
                        const finalExamGrade = currentGrades.finalExamGrade ?? (student.finalExamGrade ? parseFloat(student.finalExamGrade) : 0);
                        const calculatedFinal = calculateFinalGrade(attendanceGrade, behaviorGrade, finalExamGrade);
                        const hasChanges = !!grades[student.assignmentId];

                        return (
                          <tr key={student.assignmentId} className={`border-b hover:bg-gray-50 ${hasChanges ? 'bg-blue-50' : ''}`}>
                            <td className="p-3">{index + 1}</td>
                            <td className="p-3 font-medium">{student.studentName}</td>
                            <td className="p-3 text-gray-600">{student.universityId}</td>
                            <td className="p-3">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={attendanceGrade}
                                onChange={(e) => handleGradeChange(student.assignmentId, 'attendanceGrade', parseFloat(e.target.value) || 0)}
                                className="w-20 text-center border-blue-300 focus:border-blue-500"
                                placeholder="0-100"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={behaviorGrade}
                                onChange={(e) => handleGradeChange(student.assignmentId, 'behaviorGrade', parseFloat(e.target.value) || 0)}
                                className="w-20 text-center border-green-300 focus:border-green-500"
                                placeholder="0-100"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={finalExamGrade}
                                onChange={(e) => handleGradeChange(student.assignmentId, 'finalExamGrade', parseFloat(e.target.value) || 0)}
                                className="w-20 text-center border-purple-300 focus:border-purple-500"
                                placeholder="0-100"
                              />
                            </td>
                            <td className="p-3">
                              <Badge 
                                variant={calculatedFinal >= 60 ? "default" : "destructive"}
                                className="px-3 py-1"
                              >
                                {calculatedFinal.toFixed(1)}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        {hasUnsavedChanges && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={handleSaveAllGrades}
              disabled={saveGradesMutation.isPending}
              className="bg-primary hover:bg-primary-dark text-white shadow-lg"
              size="lg"
            >
              <Icon name="save" size={16} className="ml-2" />
              {saveGradesMutation.isPending ? "جاري الحفظ..." : `حفظ ${changesCount} تغيير`}
            </Button>
          </div>
        )}
      </div>
    </SupervisorLayout>
  );
};

export default SupervisorDetailedGrading;