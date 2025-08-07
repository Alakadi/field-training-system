import React from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/ui/icon-map";

const ViewStudent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  // الحصول على بيانات الطالب
  const { data: student, isLoading: isLoadingStudent } = useQuery({
    queryKey: [`/api/students/${id}`],
    enabled: !!id,
  });

  // الحصول على بيانات الدورات التدريبية للطالب
  const { data: studentCourses, isLoading: isLoadingCourses } = useQuery({
    queryKey: [`/api/students/${id}/courses`],
    enabled: !!id,
  });

  // الحصول على بيانات تقييمات الطالب
  const { data: studentEvaluations, isLoading: isLoadingEvaluations } = useQuery({
    queryKey: [`/api/students/${id}/evaluations`],
    enabled: !!id,
  });

  // بيانات الكليات والتخصصات والمستويات
  const { data: faculties } = useQuery({
    queryKey: ["/api/faculties"],
  });

  const { data: majors } = useQuery({
    queryKey: ["/api/majors"],
  });

  const { data: levels } = useQuery({
    queryKey: ["/api/levels"],
  });

  if (isLoadingStudent) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const faculty = (faculties as any)?.find((f: any) => f.id === (student as any)?.facultyId);
  const major = (majors as any)?.find((m: any) => m.id === (student as any)?.majorId);
  const level = (levels as any)?.find((l: any) => l.id === (student as any)?.levelId);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">عرض بيانات الطالب</h1>
          <div className="flex space-x-2 space-x-reverse">
            <Button
              variant="outline"
              onClick={() => setLocation(`/admin/students/edit/${id}`)}
            >
              <Icon name="edit" size={16} />
              تعديل
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/admin/students")}
            >
              <Icon name="chevron_right" size={16} />
              العودة إلى القائمة
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>معلومات الطالب</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="h-24 w-24 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3">
                      <Icon name="user" size={24} />
                    </div>
                    <h3 className="text-xl font-semibold">{(student as any)?.user?.name}</h3>
                    <Badge className={(student as any)?.user?.active ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-800"}>
                      {(student as any)?.user?.active ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-neutral-500">الرقم الجامعي</p>
                      <p>{(student as any)?.universityId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">اسم المستخدم</p>
                      <p>{(student as any)?.user?.username}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">البريد الإلكتروني</p>
                      <p>{(student as any)?.user?.email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">رقم الهاتف</p>
                      <p>{(student as any)?.user?.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">الكلية</p>
                      <p>{faculty?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">التخصص</p>
                      <p>{major?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">المستوى</p>
                      <p>{level?.name || "-"}</p>
                    </div>
                    {/* <div>
                      <p className="text-sm font-medium text-neutral-500">المعدل التراكمي</p>
                      <p>{student?.gpa || "-"}</p>
                    </div> */}
                    {/* <div>
                      <p className="text-sm font-medium text-neutral-500">المشرف الحالي</p>
                      <p>{student?.supervisor?.user?.name || "-"}</p>
                    </div> */}
                    <div>
                      <p className="text-sm font-medium text-neutral-500">تاريخ التسجيل</p>
                      <p>{new Date(student?.user.createdAt).toLocaleDateString('en-GB')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Tabs defaultValue="courses">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="courses">الدورات التدريبية ({studentCourses?.length || 0})</TabsTrigger>
                <TabsTrigger value="evaluations">التقييمات ({studentEvaluations?.length || 0})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="courses" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    {isLoadingCourses ? (
                      <div className="space-y-2 py-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ) : studentCourses?.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-neutral-500">لم يتم تسجيل الطالب في أي دورة تدريبية</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-neutral-200">
                          <thead className="bg-neutral-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                اسم الدورة
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                جهة التدريب
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                المشرف
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                تاريخ البدء
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                الحالة
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-neutral-200">
                            {studentCourses?.map((registration: any) => (
                              <tr key={registration.id} className="hover:bg-neutral-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                                  {registration.course.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  {registration.course.trainingSite?.name || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  {registration.course.supervisor?.user?.name || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  {new Date(registration.course.startDate).toLocaleDateString('en-GB')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge className={`
                                    ${registration.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' : ''}
                                    ${registration.status === 'confirmed' ? 'bg-green-100 text-green-800' : ''}
                                    ${registration.status === 'completed' ? 'bg-blue-100 text-blue-800' : ''}
                                    ${registration.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                                  `}>
                                    {registration.status === 'assigned' ? 'معين' : ''}
                                    {registration.status === 'confirmed' ? 'مؤكد' : ''}
                                    {registration.status === 'completed' ? 'مكتمل' : ''}
                                    {registration.status === 'cancelled' ? 'ملغى' : ''}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent dir="rtl" value="evaluations" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    {isLoadingEvaluations ? (
                      <div className="space-y-2 py-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ) : studentEvaluations?.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-neutral-500">لا توجد تقييمات للطالب</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {studentEvaluations?.map((evaluation: any) => (
                          <Card key={evaluation.id} className="border shadow-sm">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-lg">{evaluation.course.name}</CardTitle>
                                {/* <Badge className="bg-blue-100 text-blue-800">
                                  {new Date(evaluation.evaluationDate).toLocaleDateString('en-GB')}
                                </Badge> */}
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {/* <div>
                                  <p className="text-sm font-medium text-neutral-500">المشرف</p>
                                  <p>{evaluation.supervisor?.user?.name || "-"}</p>
                                </div> */}
                                
                                {/* الدرجات المفصلة */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm font-medium text-blue-600">درجة الحضور</p>
                                    <p className="text-2xl font-bold text-blue-700">
                                      {evaluation.assignment?.attendanceGrade || 0} / 20
                                    </p>
                                    <p className="text-xs text-blue-500">(20%)</p>
                                  </div>
                                  <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <p className="text-sm font-medium text-green-600">درجة السلوك</p>
                                    <p className="text-2xl font-bold text-green-700">
                                      {evaluation.assignment?.behaviorGrade || 0} / 30
                                    </p>
                                    <p className="text-xs text-green-500">(30%)</p>
                                  </div>
                                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                                    <p className="text-sm font-medium text-purple-600">الاختبار النهائي</p>
                                    <p className="text-2xl font-bold text-purple-700">
                                      {evaluation.assignment?.finalExamGrade || 0} / 50
                                    </p>
                                    <p className="text-xs text-purple-500">(50%)</p>
                                  </div>
                                </div>

                                {/* الدرجة النهائية المحسوبة */}
                                <div className="bg-orange-50 p-4 rounded-lg">
                                  <div className="flex justify-between items-center mb-2">
                                    <p className="text-sm font-medium text-orange-600">الدرجة النهائية المحسوبة</p>
                                    <div className="text-2xl font-bold text-orange-700">
                                      {evaluation.assignment?.calculatedFinalGrade ? 
                                        parseFloat(evaluation.assignment.calculatedFinalGrade).toFixed(1) : 0} / 100
                                    </div>
                                  </div>
                                  <div className="w-full bg-orange-200 rounded-full h-3">
                                    <div 
                                      className="bg-orange-500 h-3 rounded-full transition-all duration-300" 
                                      style={{ 
                                        width: `${evaluation.assignment?.calculatedFinalGrade || 0}%` 
                                      }}
                                    ></div>
                                  </div>
                                </div>

                                {/* التقييم التقليدي (إن وجد) */}
                                {evaluation.score && (
                                  <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm font-medium text-gray-600 mb-2">تقييم المشرف التقليدي</p>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-700">النتيجة</span>
                                      <div className="text-xl font-bold text-gray-800">
                                        {evaluation.score} / 100
                                      </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                      <div 
                                        className="bg-gray-500 h-2 rounded-full" 
                                        style={{ width: `${evaluation.score}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                )}

                                {evaluation.notes && (
                                  <div>
                                    <p className="text-sm font-medium text-neutral-500">ملاحظات</p>
                                    <p className="mt-1 text-neutral-700">{evaluation.notes}</p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ViewStudent;