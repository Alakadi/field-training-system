import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import SupervisorLayout from "@/components/layout/supervisor-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, Users, GraduationCap, Save } from "../../components/ui/icons";

interface Student {
  id: number;
  universityId: string;
  user: {
    name: string;
  };
  faculty?: {
    name: string;
  };
  major?: {
    name: string;
  };
  level?: {
    name: string;
  };
  grade?: number;
  assignment?: {
    id: number;
    attendanceGrade?: number;
    behaviorGrade?: number;
    finalExamGrade?: number;
    calculatedFinalGrade?: number;
  };
}

interface CourseGroup {
  id: number;
  capacity: number;
  currentEnrollment: number;
  startDate: string;
  endDate: string;
  course: {
    id: number;
    name: string;
    description?: string;
    location?: string;
    status: string;
  };
  site: {
    name: string;
    location?: string;
  };
  students: Student[];
}

const SupervisorCourses: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingGrades, setEditingGrades] = useState<{ [key: string]: {
    attendanceGrade?: number;
    behaviorGrade?: number;
    finalExamGrade?: number;
    assignmentId?: number;
  } }>({});
  const [savingGrades, setSavingGrades] = useState(false);

  const [selectedGroups, setSelectedGroups] = useState<CourseGroup[]>([]);

  // Fetch supervisor data
  const { data: supervisorData } = useQuery({
    queryKey: ["/api/supervisors/me"],
    queryFn: async () => {
      const res = await fetch("/api/supervisors/me", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch supervisor data");
      }
      return res.json();
    },
  });

  // Fetch course groups assigned to this supervisor
  const { data: courseGroups, isLoading } = useQuery({
    queryKey: ["/api/training-course-groups", "supervisor", supervisorData?.id],
    queryFn: async () => {
      if (!supervisorData?.id) return [];
      const res = await fetch(`/api/training-course-groups?supervisorId=${supervisorData.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch course groups");
      return res.json();
    },
    enabled: !!supervisorData?.id,
  });

  React.useEffect(() => {
    if (courseGroups) {
      setSelectedGroups(courseGroups);
    }
  }, [courseGroups]);

  // Update student grade mutation
  const updateGradeMutation = useMutation({
    mutationFn: async ({ studentId, groupId, grade }: { studentId: number; groupId: number; grade: number }) => {
      const response = await fetch("/api/students/grade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          studentId,
          groupId,
          grade,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to save grade";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      try {
        return await response.json();
      } catch (e) {
        // If response is not JSON but status is ok, return success
        return { message: "تم حفظ الدرجة بنجاح" };
      }
    },
    onSuccess: () => {
      toast({
        title: "تم الحفظ",
        description: "تم حفظ الدرجة بنجاح وإرسال إشعار للمسؤول",
      });
      // Refresh the groups data to show updated grades
      queryClient.invalidateQueries({ queryKey: ["/api/training-course-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supervisor/course-assignments"] });
      setEditingGrades({});
    },
    onError: (error: any) => {
      console.error("Grade save error:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء حفظ الدرجة",
        variant: "destructive",
      });
    },
  });

  // Update multiple student detailed grades mutation
  const updateDetailedGradesMutation = useMutation({
    mutationFn: async (updates: { assignmentId: number; attendanceGrade: number; behaviorGrade: number; finalExamGrade: number }[]) => {
      console.log("Sending detailed grades request:", updates);

      const response = await fetch("/api/students/detailed-grades/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ updates }),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        let errorMessage = "Failed to save detailed grades";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      try {
        const result = await response.json();
        console.log("Response data:", result);
        return result;
      } catch (e) {
        return { message: "تم حفظ الدرجات المفصلة بنجاح" };
      }
    },
    onSuccess: (data) => {
      console.log("Detailed grades save successful:", data);
      toast({
        title: "تم الحفظ",
        description: "تم حفظ جميع الدرجات المفصلة بنجاح",
      });
      // Refresh the groups data to show updated grades
      queryClient.invalidateQueries({ queryKey: ["/api/training-course-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supervisor/course-assignments"] });
      setEditingGrades({});
    },
    onError: (error: any) => {
      console.error("Detailed grades save error:", error);
      toast({
        title: "خطأ في الحفظ",
        description: error.message || "حدث خطأ أثناء حفظ الدرجات المفصلة",
        variant: "destructive",
      });
    },
  });

  const handleDetailedGradeChange = (studentId: number, field: 'attendanceGrade' | 'behaviorGrade' | 'finalExamGrade', value: string, assignmentId?: number) => {
    const gradeNumber = value === '' ? undefined : parseFloat(value);

    // Check specific ranges for each field
    let maxValue = 100;
    if (field === 'attendanceGrade') maxValue = 20;
    else if (field === 'behaviorGrade') maxValue = 30;
    else if (field === 'finalExamGrade') maxValue = 50;

    // Check if course is upcoming (prevent grade entry for upcoming courses)
    const targetGroup = selectedGroups.find(g => g.students.some(s => s.id === studentId));
    if (targetGroup?.course?.status === 'upcoming') {
      toast({
        title: "لا يمكن إدخال الدرجات",
        description: "لا يمكن إدخال الدرجات للدورات التدريبية التي لم تبدأ بعد",
        variant: "destructive",
      });
      return;
    }

    if (value === '' || (!isNaN(gradeNumber!) && gradeNumber! >= 0 && gradeNumber! <= maxValue)) {
      console.log(`Setting grade for student ${studentId}, field ${field}, value ${gradeNumber}, assignmentId ${assignmentId}`);

      setEditingGrades(prev => {
        // Try to get assignmentId from multiple sources
        let finalAssignmentId = assignmentId;
        
        if (!finalAssignmentId) {
          // Try to get from previous state
          finalAssignmentId = prev[studentId]?.assignmentId;
        }
        
        if (!finalAssignmentId) {
          // Try to get from student assignment data
          const student = targetGroup?.students.find(s => s.id === studentId);
          finalAssignmentId = student?.assignment?.id;
        }

        console.log(`Final assignmentId for student ${studentId}: ${finalAssignmentId}`);

        return {
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [field]: gradeNumber,
            assignmentId: finalAssignmentId
          }
        };
      });
    }
  };

  const getCurrentDetailedGrade = (
    student: Student,
    field: 'attendanceGrade' | 'behaviorGrade' | 'finalExamGrade'
  ): number | '' => {
    // 1. إذا حررتَ الدرجة مؤخرًا، اعرضها:
    const edited = editingGrades[student.id]?.[field];
    if (edited !== undefined) {
      return edited;
    }
    // 2. خلاف ذلك، أرجع الدرجة المحفوظة (بما فيها الصفر)، أو '' إن لم توجد:
    const savedGrade = student.assignment?.[field];
    return savedGrade !== undefined && savedGrade !== null ? Number(savedGrade) : '';
  };

  const getDetailedGradePlaceholder = (student: Student, field: 'attendanceGrade' | 'behaviorGrade' | 'finalExamGrade') => {
    const maxValues = {
      'attendanceGrade': 20,
      'behaviorGrade': 30,
      'finalExamGrade': 50
    };
    
    const fieldNames = {
      'attendanceGrade': 'الحضور',
      'behaviorGrade': 'السلوك', 
      'finalExamGrade': 'الاختبار النهائي'
    };

    return `أدخل درجة ${fieldNames[field]} (من ${maxValues[field]})`;
  };

  const hasDetailedGradeChanged = (student: Student) => {
    const editingGrade = editingGrades[student.id];
    return editingGrade !== undefined && (
      editingGrade.attendanceGrade !== undefined ||
      editingGrade.behaviorGrade !== undefined ||
      editingGrade.finalExamGrade !== undefined
    );
  };

  const calculateFinalGrade = (attendance?: number, behavior?:number, finalExam?: number) => {
    // التأكد من أن كل القيم موجودة
    if (
      attendance !== undefined &&
      behavior !== undefined &&
      finalExam !== undefined
    ) {
      // التحقق من أن القيم ضمن الحدود المسموحة
      if (
        attendance >= 0 && attendance <= 20 &&
        behavior >= 0 && behavior <= 30 &&
        finalExam >= 0 && finalExam <= 50
      ) {
        return attendance + behavior + finalExam;
      } else {
        throw new Error("إحدى الدرجات تتجاوز الحد المسموح به");
      }
    }

    // في حال نقص أي قيمة
    return undefined;
  };

  const saveAllDetailedGrades = async (groupId: number) => {
          console.log("Starting saveAllDetailedGrades for group:", groupId);
          console.log("Current editing grades:", editingGrades);

          const targetGroup = selectedGroups.find(g => g.id === groupId);
          console.log("Target group:", targetGroup);

          if (!targetGroup) {
            toast({
              title: "خطأ",
              description: "لم يتم العثور على المجموعة",
              variant: "destructive",
            });
            return;
          }

          const updates = [];

          // Get assignments for this group to find assignment IDs
          const assignmentsResponse = await fetch(`/api/training-assignments?groupId=${groupId}`, {
            credentials: "include",
          });

          if (!assignmentsResponse.ok) {
            toast({
              title: "خطأ",
              description: "فشل في جلب بيانات التعيينات",
              variant: "destructive",
            });
            return;
          }

          const assignments = await assignmentsResponse.json();

          for (const assignment of assignments) {
            console.log("Processing student:", assignment.studentId, editingGrades[assignment.studentId]);

            if (editingGrades[assignment.studentId]) {
              const grades = editingGrades[assignment.studentId];
              console.log("Found assignment for student", assignment.studentId, ":", assignment);

              // التحقق من وجود جميع الدرجات الثلاث أو أي منها للحفظ الفردي
              const hasAttendance = grades.attendanceGrade !== undefined && grades.attendanceGrade !== null;
              const hasBehavior = grades.behaviorGrade !== undefined && grades.behaviorGrade !== null;
              const hasFinalExam = grades.finalExamGrade !== undefined && grades.finalExamGrade !== null;

              // حفظ إذا كان هناك أي درجة محدثة
              if (assignment && (hasAttendance || hasBehavior || hasFinalExam)) {
                const updateData: any = {
                  assignmentId: assignment.id
                };

                if (hasAttendance) updateData.attendanceGrade = grades.attendanceGrade;
                if (hasBehavior) updateData.behaviorGrade = grades.behaviorGrade;
                if (hasFinalExam) updateData.finalExamGrade = grades.finalExamGrade;

                updates.push(updateData);
              }
            }
          }

          console.log("Detailed grades to save:", updates);

    if (updates.length === 0) {
      toast({
        title: "تنبيه",
        description: "لا توجد تغييرات للحفظ",
        variant: "destructive",
      });
      return;
    }

    setSavingGrades(true);
    try {
      await updateDetailedGradesMutation.mutateAsync(updates);
    } catch (error) {
      console.error("Error saving detailed grades:", error);
    } finally {
      setSavingGrades(false);
    }
  };

  const hasUnsavedChanges = (groupId: number) => {
    return Object.keys(editingGrades).length > 0;
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
  const fieldMax = {
    attendanceGrade: 20,
    behaviorGrade: 30,
    finalExamGrade: 50,
  };

  if (isLoading) {
    return (
      <SupervisorLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">إدارة الكورسات</h1>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </SupervisorLayout>
    );
  }

  if (!courseGroups || courseGroups.length === 0) {
    return (
      <SupervisorLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">إدارة الكورسات</h1>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <GraduationCap className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد كورسات مُسندة</h3>
              <p className="text-gray-500 text-center max-w-md">
                لم يتم تعيينك كمشرف على أي مجموعات تدريبية حتى الآن. 
                سيظهر هنا جميع الكورسات التي تشرف عليها عند إضافتها من قبل الإدارة.
              </p>
            </CardContent>
          </Card>
        </div>
      </SupervisorLayout>
    );
  }

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">إدارة الكورسات</h1>
          <Badge variant="outline" className="text-sm">
            {courseGroups.length} مجموعة تدريبية
          </Badge>
        </div>

        <div className="grid gap-6">
          {courseGroups.map((group: CourseGroup) => (
            <Card key={group.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-xl text-right">{group.course?.name || "دورة غير محددة"}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{group.site?.name || "موقع غير محدد"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{group.currentEnrollment || 0}/{group.capacity || 0} طالب</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={getStatusBadge(group.course?.status || 'upcoming').variant}>
                    {getStatusBadge(group.course?.status || 'upcoming').label}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span className="font-medium">تاريخ البداية:</span>
                    <span>{new Date(group.startDate).toLocaleDateString('ar-SA')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-red-600" />
                    <span className="font-medium">تاريخ الانتهاء:</span>
                    <span>{new Date(group.endDate).toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>

                {group.course?.description && (
                  <p className="text-sm text-gray-600 mt-2 text-right">
                    {group.course.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="p-6">
                <Tabs defaultValue="students" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="students">قائمة الطلاب ({group.students?.length || 0})</TabsTrigger>
                    <TabsTrigger value="grades">إدارة الدرجات</TabsTrigger>
                  </TabsList>

                  <TabsContent value="students" className="mt-4">
                    {group.students && group.students.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                الرقم الجامعي
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                اسم الطالب
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                الكلية
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                التخصص
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                الدرجة الحالية
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {group.students.map((student: Student) => (
                              <tr key={student.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {student.universityId}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {student.user.name}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {student.faculty?.name || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {student.major?.name || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {student.grade ? (
                                      <Badge variant="secondary">{student.grade}/100</Badge>
                                    ) : (
                                      <span className="text-gray-400">لم يتم التقييم</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">لا يوجد طلاب مسجلين في هذه المجموعة</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="grades" className="mt-4">
                    {group.students && group.students.length > 0 ? (
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium text-blue-900 mb-2">إدراج الدرجات المفصلة</h4>
                          <p className="text-sm text-blue-700">
                            الحضور من 20، السلوك من 30، الاختبار النهائي من 50. 
                            سيتم حساب الدرجة النهائية تلقائياً بجمع الدرجات الثلاث (إجمالي من 100).
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                              {hasUnsavedChanges(group.id) && (
                                <div className="flex items-center gap-2">
                                  <span className="text-amber-600 font-medium">
                                    ⚠ يوجد {Object.keys(editingGrades).length} تغييرات غير محفوظة
                                  </span>
                                  <button
                                    onClick={() => setEditingGrades({})}
                                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                                  >
                                    إلغاء التغييرات
                                  </button>
                                </div>
                              )}
                            </div>
                            <Button
                              onClick={() => saveAllDetailedGrades(group.id)}
                              disabled={!hasUnsavedChanges(group.id) || savingGrades}
                              className="flex items-center gap-2"
                            >
                              <Save className="h-4 w-4" />
                              {savingGrades ? "جاري الحفظ..." : "حفظ"}
                            </Button>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  اسم الطالب
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  الحضور<br/><span className="text-blue-600">(من 20)</span>
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  السلوك<br/><span className="text-green-600">(من 30)</span>
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  الاختبار النهائي<br/><span className="text-purple-600">(من 50)</span>
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  الدرجة النهائية<br/><span className="text-orange-600">(محسوبة)</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {group.students.map((student: Student) => {
                                const currentAttendance = getCurrentDetailedGrade(student, 'attendanceGrade');
                                const currentBehavior = getCurrentDetailedGrade(student, 'behaviorGrade');
                                const currentFinalExam = getCurrentDetailedGrade(student, 'finalExamGrade');
                                const calculatedFinal = calculateFinalGrade(
                                  typeof currentAttendance === 'number' ? currentAttendance : undefined,
                                  typeof currentBehavior === 'number' ? currentBehavior : undefined,
                                  typeof currentFinalExam === 'number' ? currentFinalExam : undefined
                                );
                                const hasChanges = hasDetailedGradeChanged(student);

                                return (
                                  <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">
                                        {student.user.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {student.universityId}
                                      </div>
                                    </td>

                                    {/* Attendance Grade */}
                                    <td className="px-3 py-4 whitespace-nowrap text-center">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="20"
                                        step="0.5"
                                        placeholder={getDetailedGradePlaceholder(student, 'attendanceGrade')}
                                        className={`w-20 text-center ${hasChanges ? 'border-blue-400 bg-blue-50' : ''}`}
                                        value={currentAttendance}
                                        onChange={(e) => {
                                          handleDetailedGradeChange(student.id, 'attendanceGrade', e.target.value, student.assignment?.id);
                                        }}
                                      />
                                    </td>

                                    {/* Behavior Grade */}
                                    <td className="px-3 py-4 whitespace-nowrap text-center">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="30"
                                        step="0.5"
                                        placeholder={getDetailedGradePlaceholder(student, 'behaviorGrade')}
                                        className={`w-20 text-center ${hasChanges ? 'border-green-400 bg-green-50' : ''}`}
                                        value={currentBehavior}
                                        onChange={(e) => {
                                          handleDetailedGradeChange(student.id, 'behaviorGrade', e.target.value, student.assignment?.id);
                                        }}
                                      />
                                    </td>

                                    {/* Final Exam Grade */}
                                    <td className="px-3 py-4 whitespace-nowrap text-center">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="50"
                                        step="0.5"
                                        placeholder={getDetailedGradePlaceholder(student, 'finalExamGrade')}
                                        className={`w-20 text-center ${hasChanges ? 'border-purple-400 bg-purple-50' : ''}`}
                                        value={currentFinalExam}
                                        onChange={(e) => {
                                          handleDetailedGradeChange(student.id, 'finalExamGrade', e.target.value, student.assignment?.id);
                                        }}
                                      />
                                    </td>

                                    {/* Calculated Final Grade */}
                                    <td className="px-3 py-4 whitespace-nowrap text-center">
                                      <div className="flex flex-col items-center gap-1">
                                        {calculatedFinal !== undefined ? (
                                          <Badge variant="default" className="bg-orange-500 text-white">
                                            {calculatedFinal.toFixed(1)}/100
                                          </Badge>
                                        ) : student.assignment?.calculatedFinalGrade ? (
                                          <Badge variant="secondary">
                                            {Number(student.assignment.calculatedFinalGrade).toFixed(1)}/100
                                          </Badge>
                                        ) : (
                                          <span className="text-gray-400 text-sm">غير محسوبة</span>
                                        )}
                                        {hasChanges && (
                                          <span className="text-xs text-orange-600 font-medium">
                                            (محدثة)
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">لا يوجد طلاب لإدارة درجاتهم</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SupervisorLayout>
  );
};

export default SupervisorCourses;