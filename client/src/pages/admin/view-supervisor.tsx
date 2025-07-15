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

const ViewSupervisor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  // الحصول على بيانات المشرف
  const { data: supervisor, isLoading: isLoadingSupervisor } = useQuery({
    queryKey: [`/api/supervisors/${id}`],
    enabled: !!id,
  });

  // الحصول على قائمة طلاب المشرف
  const { data: supervisorStudents, isLoading: isLoadingStudents } = useQuery({
    queryKey: [`/api/supervisors/${id}/students`],
    enabled: !!id,
  });

  // الحصول على قائمة الدورات التدريبية للمشرف
  const { data: supervisorCourses, isLoading: isLoadingCourses } = useQuery({
    queryKey: [`/api/supervisors/${id}/courses`],
    enabled: !!id,
  });

  // الحصول على بيانات الكليات
  const { data: faculties } = useQuery({
    queryKey: ["/api/faculties"],
  });

  if (isLoadingSupervisor) {
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

  const faculty = faculties?.find((f: any) => f.id === supervisor?.facultyId);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">عرض بيانات المشرف</h1>
          <div className="flex space-x-2 space-x-reverse">
            <Button
              variant="outline"
              onClick={() => setLocation(`/admin/supervisors/edit/${id}`)}
            >
              <Icon name="edit" size={16} />
              تعديل
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/admin/supervisors")}
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
                <CardTitle>معلومات المشرف</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="h-24 w-24 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3">
                      <Icon name="user" size={24} />
                    </div>
                    <h3 className="text-xl font-semibold">{supervisor?.user.name}</h3>
                    <Badge className={supervisor?.user.active ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-800"}>
                      {supervisor?.user.active ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-neutral-500">اسم المستخدم</p>
                      <p>{supervisor?.user.username}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">البريد الإلكتروني</p>
                      <p>{supervisor?.user.email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">رقم الهاتف</p>
                      <p>{supervisor?.user.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">الكلية</p>
                      <p>{faculty?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">القسم</p>
                      <p>{supervisor?.department || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">تاريخ التسجيل</p>
                      <p>{new Date(supervisor?.user.createdAt).toLocaleDateString('en-US')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Tabs defaultValue="students">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="students">الطلاب ({supervisorStudents?.length || 0})</TabsTrigger>
                <TabsTrigger value="courses">الدورات التدريبية ({supervisorCourses?.length || 0})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="students" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    {isLoadingStudents ? (
                      <div className="space-y-2 py-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ) : supervisorStudents?.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-neutral-500">لا يوجد طلاب مسجلين مع هذا المشرف</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-neutral-200">
                          <thead className="bg-neutral-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                الاسم
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                الرقم الجامعي
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                التخصص
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                الدورة التدريبية
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-neutral-200">
                            {supervisorStudents?.map((student: any) => (
                              <tr key={student.id} className="hover:bg-neutral-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                                  {student.user.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  {student.universityId}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  {student.major?.name || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  {student.currentCourse?.name || "-"}
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
              
              <TabsContent value="courses" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    {isLoadingCourses ? (
                      <div className="space-y-2 py-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ) : supervisorCourses?.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-neutral-500">لا توجد دورات تدريبية لهذا المشرف</p>
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
                                تاريخ البدء
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                تاريخ الانتهاء
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                عدد الطلاب
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                الحالة
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-neutral-200">
                            {supervisorCourses?.map((course: any) => (
                              <tr key={course.id} className="hover:bg-neutral-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                                  {course.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  {course.trainingSite?.name || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  {new Date(course.startDate).toLocaleDateString('en-US')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  {new Date(course.endDate).toLocaleDateString('en-US')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  {course.studentCount} / {course.capacity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge className={`
                                    ${course.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                                    ${course.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                                    ${course.status === 'completed' ? 'bg-blue-100 text-blue-800' : ''}
                                    ${course.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                                  `}>
                                    {course.status === 'active' ? 'نشطة' : ''}
                                    {course.status === 'pending' ? 'قيد الإعداد' : ''}
                                    {course.status === 'completed' ? 'مكتملة' : ''}
                                    {course.status === 'cancelled' ? 'ملغاة' : ''}
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
            </Tabs>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ViewSupervisor;