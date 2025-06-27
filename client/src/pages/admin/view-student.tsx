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

  const faculty = faculties?.find((f: any) => f.id === student?.facultyId);
  const major = majors?.find((m: any) => m.id === student?.majorId);
  const level = levels?.find((l: any) => l.id === student?.levelId);

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
                    <h3 className="text-xl font-semibold">{student?.user.name}</h3>
                    <Badge className={student?.user.active ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-800"}>
                      {student?.user.active ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-neutral-500">الرقم الجامعي</p>
                      <p>{student?.universityId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">اسم المستخدم</p>
                      <p>{student?.user.username}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">البريد الإلكتروني</p>
                      <p>{student?.user.email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">رقم الهاتف</p>
                      <p>{student?.user.phone || "-"}</p>
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
                      <p>{new Date(student?.user.createdAt).toLocaleDateString('ar-SA')}</p>
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
                                  {new Date(registration.course.startDate).toLocaleDateString('ar-SA')}
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
              
              <TabsContent value="evaluations" className="mt-4">
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
                                <Badge className="bg-blue-100 text-blue-800">
                                  {new Date(evaluation.evaluationDate).toLocaleDateString('ar-SA')}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-sm font-medium text-neutral-500">المشرف</p>
                                  <p>{evaluation.supervisor?.user?.name || "-"}</p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="text-center p-3 bg-neutral-50 rounded-lg">
                                    <p className="text-sm font-medium text-neutral-500">الحضور والانضباط</p>
                                    <p className="text-2xl font-bold text-primary">{evaluation.attendanceScore} / 30</p>
                                  </div>
                                  <div className="text-center p-3 bg-neutral-50 rounded-lg">
                                    <p className="text-sm font-medium text-neutral-500">المهارات المكتسبة</p>
                                    <p className="text-2xl font-bold text-primary">{evaluation.skillsScore} / 40</p>
                                  </div>
                                  <div className="text-center p-3 bg-neutral-50 rounded-lg">
                                    <p className="text-sm font-medium text-neutral-500">التقرير النهائي</p>
                                    <p className="text-2xl font-bold text-primary">{evaluation.reportScore} / 30</p>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-sm font-medium text-neutral-500">التقييم الإجمالي ({evaluation.totalScore} / 100)</p>
                                  <div className="w-full bg-neutral-200 rounded-full h-2.5 mt-2">
                                    <div 
                                      className="bg-primary h-2.5 rounded-full" 
                                      style={{ width: `${evaluation.totalScore}%` }}
                                    ></div>
                                  </div>
                                </div>

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