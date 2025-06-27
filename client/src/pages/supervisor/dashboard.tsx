import React from "react";
import { useQuery } from "@tanstack/react-query";
import SupervisorLayout from "@/components/layout/supervisor-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import Icon from "@/components/ui/icon-map";

const SupervisorDashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Fetch supervisor data
  const { data: supervisorData, isLoading: isLoadingSupervisor } = useQuery({
    queryKey: ["/api/supervisors/me"],
    queryFn: async () => {
      const res = await fetch("/api/supervisors/me", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch supervisor data");
      }
      return res.json();
    },
  });

  // Fetch students under supervision through training groups
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["/api/supervisors", supervisorData?.id, "students"],
    queryFn: async () => {
      if (!supervisorData?.id) return [];
      const res = await fetch(`/api/supervisors/${supervisorData.id}/students`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
    enabled: !!supervisorData?.id,
  });

  // Fetch course groups assigned to this supervisor
  const { data: courseGroups, isLoading: isLoadingCourseGroups } = useQuery({
    queryKey: ["/api/training-course-groups", "supervisor", supervisorData?.id],
    queryFn: async () => {
      if (!supervisorData?.id) return [];
      const res = await fetch(`/api/training-course-groups?supervisorId=${supervisorData.id}`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!supervisorData?.id,
  });

  // Fetch evaluations
  const { data: evaluations, isLoading: isLoadingEvaluations } = useQuery({
    queryKey: ["/api/evaluations"],
    queryFn: async () => {
      const res = await fetch("/api/evaluations", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch evaluations");
      return res.json();
    },
  });

  // Calculate statistics
  const studentsCount = students?.length || 0;
  const courseGroupsCount = courseGroups?.length || 0;
  
  // Get completed evaluations count
  const completedEvaluationsCount = evaluations?.length || 0;
  
  // Calculate total students from all course groups
  const totalStudentsInGroups = courseGroups?.reduce((sum: number, group: any) => 
    sum + (group.students?.length || 0), 0) || 0;
  
  // Calculate average performance from evaluations
  const averagePerformance = evaluations?.length > 0 
    ? Math.round(evaluations.reduce((sum: number, evaluation: any) => sum + evaluation.score, 0) / evaluations.length) 
    : 0;

  // Get students that need evaluations from course groups
  const studentsToEvaluate = courseGroups?.flatMap((group: any) => 
    group.students?.filter((student: any) => !student.grade) || []
  ).slice(0, 5) || []; // Get top 5

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">لوحة تحكم المشرف</h1>
          <div className="flex space-x-2 space-x-reverse">
            <Link href="/supervisor/evaluations?action=new">
              <Button className="bg-primary hover:bg-primary-dark text-white flex items-center text-sm">
                <Icon name="plus" size={16} className="ml-1" />
                إضافة تقييم جديد
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="dashboard-card bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-primary ml-4">
                  <Icon name="users" size={24} />
                </div>
                <div>
                  <div className="text-sm text-neutral-500">إجمالي الطلاب</div>
                  <div className="text-2xl font-bold">
                    {isLoadingCourseGroups ? "..." : totalStudentsInGroups}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-neutral-500 flex items-center">
                <span>في {courseGroupsCount} مجموعة تدريبية</span>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-secondary ml-4">
                  <Icon name="graduation_cap" size={24} />
                </div>
                <div>
                  <div className="text-sm text-neutral-500">المجموعات التدريبية</div>
                  <div className="text-2xl font-bold">
                    {isLoadingCourseGroups ? "..." : courseGroupsCount}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-neutral-500 flex items-center">
                <span>المجموعات المسندة إليك</span>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600 ml-4">
                  <Icon name="check_circle" size={24} />
                </div>
                <div>
                  <div className="text-sm text-neutral-500">تقييمات مكتملة</div>
                  <div className="text-2xl font-bold">
                    {isLoadingEvaluations ? "..." : completedEvaluationsCount}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-neutral-500 flex items-center">
                <span>من إجمالي {totalStudentsInGroups} طالب</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Course Groups */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-neutral-200">
            <h2 className="text-lg font-bold">المجموعات التدريبية</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    اسم الكورس
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    المجموعة
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    موقع التدريب
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    عدد الطلاب
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    تاريخ البداية
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {isLoadingCourseGroups ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      جاري تحميل البيانات...
                    </td>
                  </tr>
                ) : courseGroups?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      لا توجد مجموعات تدريبية مسندة إليك حالياً
                    </td>
                  </tr>
                ) : (
                  courseGroups?.slice(0, 5).map((group: any) => (
                    <tr key={group.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                        {group.course?.name || "كورس غير محدد"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {group.groupName || "مجموعة 1"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {group.site?.name || "موقع غير محدد"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {group.students?.length || 0}/{group.capacity || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {group.startDate ? new Date(group.startDate).toLocaleDateString('ar-SA') : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          نشطة
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Link href="/supervisor/courses">
                            <Button size="sm" className="bg-primary text-white px-2 py-1 rounded-md text-xs">
                              إدارة المجموعة
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-white px-4 py-3 border-t border-neutral-200">
            <div className="flex justify-center">
              <Link href="/supervisor/courses">
                <Button variant="link" className="text-primary text-sm">
                  عرض جميع المجموعات
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </SupervisorLayout>
  );
};

export default SupervisorDashboard;
