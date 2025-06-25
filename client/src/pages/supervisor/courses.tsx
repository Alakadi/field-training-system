
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
import { Calendar, MapPin, Users, GraduationCap, Save } from "lucide-react";

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
  const [editingGrades, setEditingGrades] = useState<{ [key: string]: number }>({});
  const [savingGrades, setSavingGrades] = useState(false);

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
      queryClient.invalidateQueries({ queryKey: ["/api/training-course-groups"] });
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

  const handleGradeChange = (studentId: number, grade: string) => {
    const gradeNumber = grade === '' ? undefined : parseFloat(grade);
    if (grade === '' || (!isNaN(gradeNumber!) && gradeNumber! >= 0 && gradeNumber! <= 100)) {
      setEditingGrades(prev => ({ ...prev, [studentId]: gradeNumber }));
    }
  };

  const saveAllGrades = async (groupId: number) => {
    const gradesToSave = Object.entries(editingGrades)
      .filter(([_, grade]) => grade !== undefined && grade >= 0 && grade <= 100)
      .map(([studentId, grade]) => ({ studentId: parseInt(studentId), grade: grade! }));

    if (gradesToSave.length === 0) {
      toast({
        title: "تنبيه",
        description: "لا توجد درجات صالحة للحفظ",
        variant: "destructive",
      });
      return;
    }

    setSavingGrades(true);
    try {
      await updateGradesMutation.mutateAsync({ grades: gradesToSave, groupId });
    } catch (error) {
      console.error("Error saving grades:", error);
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
                          <h4 className="font-medium text-blue-900 mb-2">إدراج الدرجات</h4>
                          <p className="text-sm text-blue-700">
                            يمكنك إدراج درجات الطلاب من 0 إلى 100. اضغط على زر الحفظ بعد إدخال الدرجة.
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                              {hasUnsavedChanges(group.id) && (
                                <span className="text-amber-600 font-medium">
                                  ⚠ يوجد تغييرات غير محفوظة
                                </span>
                              )}
                            </div>
                            <Button
                              onClick={() => saveAllGrades(group.id)}
                              disabled={!hasUnsavedChanges(group.id) || savingGrades}
                              className="flex items-center gap-2"
                            >
                              <Save className="h-4 w-4" />
                              {savingGrades ? "جاري الحفظ..." : "حفظ جميع الدرجات"}
                            </Button>
                          </div>
                          
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  اسم الطالب
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  الدرجة (من 100)
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
                                      {student.user.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {student.universityId}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center space-x-2 space-x-reverse">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        placeholder="أدخل الدرجة"
                                        className="w-24 text-center"
                                        value={editingGrades[student.id] !== undefined ? editingGrades[student.id] : ''}
                                        onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                      />
                                      <span className="text-sm text-gray-500">/100</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {student.grade ? (
                                      <Badge variant="secondary">{student.grade}/100</Badge>
                                    ) : (
                                      <span className="text-gray-400 text-sm">لم يتم التقييم</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
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