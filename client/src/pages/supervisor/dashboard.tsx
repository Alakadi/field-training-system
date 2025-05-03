import React from "react";
import { useQuery } from "@tanstack/react-query";
import SupervisorLayout from "@/components/layout/supervisor-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

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

  // Fetch students under supervision
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["/api/students", supervisorData?.id],
    queryFn: async () => {
      if (!supervisorData?.id) return [];
      const res = await fetch(`/api/students?supervisorId=${supervisorData.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
    enabled: !!supervisorData?.id,
  });

  // Fetch training assignments
  const { data: assignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["/api/training-assignments"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/training-assignments", {
          credentials: "include",
        });
        if (!res.ok) {
          console.error("Failed to fetch assignments:", res.status, res.statusText);
          return []; // Return empty array instead of throwing error
        }
        return res.json();
      } catch (error) {
        console.error("Error fetching assignments:", error);
        return []; // Return empty array in case of error
      }
    },
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
  
  // Get completed evaluations count
  const completedEvaluationsCount = evaluations?.length || 0;
  
  // Get remaining evaluations count
  const activeAssignments = assignments?.filter((a: any) => a.status === "active") || [];
  const remainingEvaluationsCount = activeAssignments.length - completedEvaluationsCount;
  
  // Calculate average performance
  const averagePerformance = evaluations?.length > 0 
    ? Math.round(evaluations.reduce((sum: number, evaluation: any) => sum + evaluation.score, 0) / evaluations.length) 
    : 0;

  // Filter students that need evaluations
  const studentsToEvaluate = activeAssignments
    .filter((assignment: any) => {
      const hasEvaluation = evaluations?.some((evaluation: any) => evaluation.assignmentId === assignment.id);
      return !hasEvaluation;
    })
    .map((assignment: any) => assignment.student)
    .slice(0, 3); // Get top 3

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">لوحة تحكم المشرف</h1>
          <div className="flex space-x-2 space-x-reverse">
            <Link href="/supervisor/evaluations?action=new">
              <Button className="bg-primary hover:bg-primary-dark text-white flex items-center text-sm">
                <span className="material-icons ml-1 text-sm">add</span>
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
                  <span className="material-icons">groups</span>
                </div>
                <div>
                  <div className="text-sm text-neutral-500">الطلاب المشرف عليهم</div>
                  <div className="text-2xl font-bold">
                    {isLoadingStudents ? "..." : studentsCount}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-neutral-500 flex items-center">
                <span>موزعين على عدة دورات تدريبية</span>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-secondary ml-4">
                  <span className="material-icons">checklist</span>
                </div>
                <div>
                  <div className="text-sm text-neutral-500">تقييمات مكتملة</div>
                  <div className="text-2xl font-bold">
                    {isLoadingEvaluations ? "..." : completedEvaluationsCount}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-warning flex items-center">
                <span className="material-icons text-sm">warning</span>
                <span>{remainingEvaluationsCount} تقييم متبقي</span>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600 ml-4">
                  <span className="material-icons">school</span>
                </div>
                <div>
                  <div className="text-sm text-neutral-500">متوسط الأداء</div>
                  <div className="text-2xl font-bold">
                    {isLoadingEvaluations ? "..." : `${averagePerformance}%`}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-success flex items-center">
                <span className="material-icons text-sm">arrow_upward</span>
                <span>3% أعلى من الفصل السابق</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Students List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-neutral-200">
            <h2 className="text-lg font-bold">الطلاب تحت الإشراف</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    الرقم الجامعي
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    اسم الطالب
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    الدورة التدريبية
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    جهة التدريب
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    تاريخ البداية
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    التقييم
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
                {isLoadingStudents || isLoadingAssignments ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center">
                      جاري تحميل البيانات...
                    </td>
                  </tr>
                ) : studentsToEvaluate.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center">
                      لا يوجد طلاب بحاجة للتقييم حالياً
                    </td>
                  </tr>
                ) : (
                  studentsToEvaluate.map((student: any) => {
                    const assignment = activeAssignments.find((a: any) => a.student.id === student.id);
                    return (
                      <tr key={student.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                          {student.universityId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                          {student.user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                          {assignment?.course.name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                          {assignment?.course.site.name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                          {assignment ? formatDate(assignment.course.startDate) : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                          --
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            قيد التدريب
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <Link href={`/supervisor/evaluations?action=new&assignmentId=${assignment?.id}`}>
                              <Button size="sm" className="bg-primary text-white px-2 py-1 rounded-md text-xs">
                                إضافة تقييم
                              </Button>
                            </Link>
                            <Button variant="ghost" size="sm" className="text-neutral-600 hover:text-neutral-900">
                              <span className="material-icons text-sm">visibility</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-white px-4 py-3 border-t border-neutral-200">
            <div className="flex justify-center">
              <Link href="/supervisor/students">
                <Button variant="link" className="text-primary text-sm">
                  عرض كل الطلاب
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
