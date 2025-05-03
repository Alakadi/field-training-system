import React from "react";
import { useQuery } from "@tanstack/react-query";
import StudentLayout from "@/components/layout/student-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Fetch student data
  const { data: studentData, isLoading: isLoadingStudent } = useQuery({
    queryKey: ["/api/students/me"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/students/me", {
          credentials: "include",
        });
        if (!res.ok) {
          if (res.status === 404) {
            return null;
          }
          console.error("Failed to fetch student data:", res.status, res.statusText);
          return null;
        }
        return res.json();
      } catch (error) {
        console.error("Error fetching student data:", error);
        return null;
      }
    },
  });

  // Fetch training assignments
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["/api/training-assignments/student"],
    queryFn: async () => {
      if (!studentData?.id) return [];
      try {
        const res = await fetch(`/api/training-assignments?studentId=${studentData.id}`, {
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
    enabled: !!studentData?.id,
  });

  // Get current training - with type safety
  const currentTraining = Array.isArray(assignments) && assignments.length > 0 ? 
    assignments.find((a: any) => a.status === "active") : undefined;

  // Get completed assignments - with type safety
  const completedAssignments = Array.isArray(assignments) ? 
    assignments.filter((a: any) => a.status === "completed") : [];

  const isLoading = isLoadingStudent || isLoadingAssignments;

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">الصفحة الرئيسية</h1>
        </div>

        {/* Student Info */}
        <Card className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-neutral-200">
            <h2 className="text-lg font-bold">المعلومات الشخصية</h2>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="text-center p-4">جاري تحميل البيانات...</div>
            ) : !studentData ? (
              <div className="text-center p-4">لم يتم العثور على بيانات الطالب</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">الرقم الجامعي</p>
                      <p className="font-medium">{studentData.universityId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">الاسم</p>
                      <p className="font-medium">{studentData.user.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">الكلية</p>
                      <p className="font-medium">{studentData.faculty?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">التخصص</p>
                      <p className="font-medium">{studentData.major?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">المستوى</p>
                      <p className="font-medium">{studentData.level?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">المشرف</p>
                      <p className="font-medium">{studentData.supervisor?.user.name || "-"}</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t md:border-t-0 md:border-r border-neutral-200 md:pr-6 pt-6 md:pt-0">
                  <p className="text-sm text-neutral-500 mb-3">التدريب الحالي</p>
                  {currentTraining ? (
                    <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                      <h3 className="font-bold text-primary mb-2">{currentTraining.course.name}</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-neutral-500">جهة التدريب:</p>
                          <p className="font-medium">{currentTraining.course.site.name}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500">المدة:</p>
                          <p className="font-medium">
                            {formatDate(currentTraining.course.startDate)} - {formatDate(currentTraining.course.endDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-500">الموقع:</p>
                          <p className="font-medium">{currentTraining.course.location || "-"}</p>
                        </div>
                        <div>
                          <p className="text-neutral-500">الحالة:</p>
                          <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            نشط
                          </span>
                        </div>
                      </div>
                      
                      {!currentTraining.confirmed && (
                        <div className="mt-4">
                          <Button
                            className="w-full"
                            onClick={async () => {
                              try {
                                await fetch(`/api/training-assignments/${currentTraining.id}/confirm`, {
                                  method: "POST",
                                  credentials: "include",
                                });
                                // Refetch assignments
                                window.location.reload();
                              } catch (error) {
                                console.error("Failed to confirm assignment:", error);
                              }
                            }}
                          >
                            تأكيد المشاركة في التدريب
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 text-center">
                      <p className="text-neutral-500">لا يوجد تدريب حالي</p>
                      <Link href="/student/courses">
                        <Button className="mt-2">استعراض الدورات المتاحة</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Student Courses */}
        <Card className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-neutral-200">
            <h2 className="text-lg font-bold">الدورات التدريبية</h2>
          </div>
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
                    المدة
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    المشرف
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    النتيجة
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
                {isLoadingAssignments ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      جاري تحميل البيانات...
                    </td>
                  </tr>
                ) : assignments?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      لا توجد دورات تدريبية مسجلة
                    </td>
                  </tr>
                ) : (
                  assignments.map((assignment: any) => (
                    <tr key={assignment.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                        {assignment.course.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {assignment.course.site.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {formatDate(assignment.course.startDate)} - {formatDate(assignment.course.endDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {assignment.course.supervisor?.user.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {assignment.evaluation?.score ? `${assignment.evaluation.score}%` : "--"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${assignment.status === 'active' ? 'bg-green-100 text-green-800' : 
                            assignment.status === 'completed' ? 'bg-neutral-100 text-neutral-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                          {assignment.status === 'active' ? 'نشط' : 
                           assignment.status === 'completed' ? 'مكتمل' : 
                           assignment.status === 'pending' ? 'قيد الانتظار' : assignment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        <Link href={`/student/courses/${assignment.course.id}`}>
                          <Button size="sm" className="bg-primary text-white px-2 py-1 rounded-md text-xs">
                            تفاصيل
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default StudentDashboard;
