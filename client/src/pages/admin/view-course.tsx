import React from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Calendar, MapPin, User, Users, BookOpen, Eye } from "lucide-react";

const ViewCourse: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  // الحصول على بيانات الدورة التدريبية
  const { data: course, isLoading: isLoadingCourse } = useQuery({
    queryKey: [`/api/training-courses/${id}`],
    enabled: !!id,
  });

  // الحصول على بيانات مجموعات الدورة
  const { data: courseGroups, isLoading: isLoadingGroups } = useQuery({
    queryKey: [`/api/training-course-groups?courseId=${id}`],
    enabled: !!id,
  });

  // الحصول على بيانات الطلاب المسجلين في الدورة
  const { data: courseStudents, isLoading: isLoadingStudents } = useQuery({
    queryKey: [`/api/training-courses/${id}/students`],
    enabled: !!id,
  });

  // الحصول على بيانات التقييمات في الدورة
  const { data: courseEvaluations, isLoading: isLoadingEvaluations } = useQuery({
    queryKey: [`/api/training-courses/${id}/evaluations`],
    enabled: !!id,
  });

  if (isLoadingCourse) {
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

  // حساب نسبة امتلاء الدورة
  const occupancyRate = course?.capacity ? (course.studentCount / course.capacity) * 100 : 0;

  // تحويل حالة الدورة إلى عربي
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'نشطة';
      case 'pending': return 'قيد الإعداد';
      case 'completed': return 'مكتملة';
      case 'cancelled': return 'ملغاة';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-neutral-100 text-neutral-800';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">عرض تفاصيل الدورة التدريبية</h1>
          <div className="flex space-x-2 space-x-reverse">
            <Button
              variant="outline"
              onClick={() => setLocation(`/admin/courses/edit/${id}`)}
            >
              <span className="material-icons ml-1 text-sm">edit</span>
              تعديل
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/admin/courses")}
            >
              <span className="material-icons ml-1 text-sm">arrow_forward</span>
              العودة إلى القائمة
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>معلومات الدورة</span>
                  <Badge className={getStatusClass(course?.status)}>
                    {getStatusText(course?.status)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">اسم الدورة</p>
                    <p className="text-lg font-semibold">{course?.name}</p>
                  </div>
                  {(course as any)?.faculty && (
                    <div>
                      <p className="text-sm font-medium text-neutral-500">الكلية</p>
                      <p>{(course as any).faculty.name}</p>
                    </div>
                  )}
                  {(course as any)?.location && (
                    <div>
                      <p className="text-sm font-medium text-neutral-500">الموقع</p>
                      <p>{(course as any).location}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-neutral-500">عدد المجموعات</p>
                    <p>{(courseGroups as any[])?.length || 0} مجموعة</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">إجمالي الطلاب المسجلين</p>
                    <p>{(courseStudents as any[])?.length || 0} طالب</p>
                  </div>
                  {course?.description && (
                    <div>
                      <p className="text-sm font-medium text-neutral-500">الوصف</p>
                      <p className="text-neutral-700 text-sm mt-1">{course?.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Tabs defaultValue="groups">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="groups">المجموعات ({(courseGroups as any[])?.length || 0})</TabsTrigger>
                <TabsTrigger value="students">الطلاب المسجلين ({(courseStudents as any[])?.length || 0})</TabsTrigger>
                <TabsTrigger value="evaluations">التقييمات ({(courseEvaluations as any[])?.length || 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="groups" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    {isLoadingGroups ? (
                      <div className="space-y-2 py-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ) : (courseGroups as any[])?.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-neutral-500">لا توجد مجموعات لهذه الدورة التدريبية</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(courseGroups as any[])?.map((group: any, index: number) => (
                          <Card key={group.id} className="border-l-4 border-l-blue-500">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg">المجموعة {index + 1}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                  <p className="text-sm font-medium text-neutral-500">جهة التدريب</p>
                                  <p className="text-lg">{group.site?.name }</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-neutral-500">المشرف الأكاديمي</p>
                                  <p className="text-lg">{group.supervisorId?.user?.name || "غير محدد"}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-neutral-500">عدد الطلاب</p>
                                  <p className="text-lg">{group.currentEnrollment || 0} / {group.capacity}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-neutral-500">تاريخ البداية</p>
                                  <p className="text-lg">
                                    {group.startDate ? new Date(group.startDate).toLocaleDateString('ar-SA') : "غير محدد"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-neutral-500">تاريخ النهاية</p>
                                  <p className="text-lg">
                                    {group.endDate ? new Date(group.endDate).toLocaleDateString('ar-SA') : "غير محدد"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-neutral-500">المقاعد المتاحة</p>
                                  <p className="text-lg font-semibold text-green-600">
                                    {group.capacity - (group.currentEnrollment || 0)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex justify-end mt-4 pt-4 border-t">
                                <Link href={`/admin/view-group/${group.id}`}>
                                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    <Eye className="h-4 w-4" />
                                    عرض تفاصيل المجموعة
                                  </Button>
                                </Link>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="students" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    {isLoadingStudents ? (
                      <div className="space-y-2 py-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ) : courseStudents?.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-neutral-500">لا يوجد طلاب مسجلين في هذه الدورة التدريبية</p>
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
                                المعدل التراكمي
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                حالة التسجيل
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-neutral-200">
                            {courseStudents?.map((registration: any) => (
                              <tr key={registration.id} className="hover:bg-neutral-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                                  {registration.student?.user.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  {registration.student?.universityId}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  {registration.student?.major?.name || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  {registration.student?.gpa || "-"}
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
                    ) : courseEvaluations?.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-neutral-500">لا توجد تقييمات لهذه الدورة التدريبية</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-neutral-200">
                          <thead className="bg-neutral-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                الطالب
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                الحضور والانضباط
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                المهارات المكتسبة
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                التقرير النهائي
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                المجموع
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                تاريخ التقييم
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-neutral-200">
                            {courseEvaluations?.map((evaluation: any) => (
                              <tr key={evaluation.id} className="hover:bg-neutral-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                                  {evaluation.student?.user.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  {evaluation.attendanceScore} / 30
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  {evaluation.skillsScore} / 40
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  {evaluation.reportScore} / 30
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  <Badge className={`
                                    ${evaluation.totalScore >= 90 ? 'bg-green-100 text-green-800' : ''}
                                    ${evaluation.totalScore >= 80 && evaluation.totalScore < 90 ? 'bg-blue-100 text-blue-800' : ''}
                                    ${evaluation.totalScore >= 70 && evaluation.totalScore < 80 ? 'bg-yellow-100 text-yellow-800' : ''}
                                    ${evaluation.totalScore < 70 ? 'bg-red-100 text-red-800' : ''}
                                  `}>
                                    {evaluation.totalScore} / 100
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                                  {new Date(evaluation.evaluationDate).toLocaleDateString('ar-SA')}
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

export default ViewCourse;