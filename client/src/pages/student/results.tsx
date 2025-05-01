import React from "react";
import { useQuery } from "@tanstack/react-query";
import StudentLayout from "@/components/layout/student-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/utils";

const StudentResults: React.FC = () => {
  const { user } = useAuth();
  
  // Fetch student data
  const { data: studentData, isLoading: isLoadingStudent } = useQuery({
    queryKey: ["/api/students/me"],
    queryFn: async () => {
      const res = await fetch("/api/students/me", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch student data");
      }
      return res.json();
    },
  });

  // Fetch training assignments
  const { data: assignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["/api/training-assignments/student"],
    queryFn: async () => {
      if (!studentData?.id) return [];
      const res = await fetch(`/api/training-assignments?studentId=${studentData.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json();
    },
    enabled: !!studentData?.id,
  });

  // Fetch evaluations
  const { data: evaluations, isLoading: isLoadingEvaluations } = useQuery({
    queryKey: ["/api/evaluations/student"],
    queryFn: async () => {
      if (!assignments) return [];
      
      // Fetch all evaluations for student's assignments
      const assignmentIds = assignments.map((a: any) => a.id);
      if (assignmentIds.length === 0) return [];
      
      // In a real app, you'd have an API endpoint to fetch all evaluations for a student
      // Here we're simulating that with the existing data
      const evals = [];
      for (const assignment of assignments) {
        if (assignment.evaluation) {
          evals.push({
            ...assignment.evaluation,
            assignment: assignment,
            course: assignment.course
          });
        }
      }
      return evals;
    },
    enabled: !!assignments,
  });
  
  const isLoading = isLoadingStudent || isLoadingAssignments || isLoadingEvaluations;
  
  // Calculate statistics
  const totalCourses = assignments?.length || 0;
  const completedCourses = assignments?.filter((a: any) => a.status === "completed")?.length || 0;
  const coursesWithEvaluations = evaluations?.length || 0;
  
  // Calculate average score
  const averageScore = evaluations?.length 
    ? Math.round(evaluations.reduce((sum: number, evaluation: any) => sum + evaluation.score, 0) / evaluations.length) 
    : 0;

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">نتائجي</h1>
        </div>

        {/* Results Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="dashboard-card bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-primary ml-4">
                  <span className="material-icons">school</span>
                </div>
                <div>
                  <div className="text-sm text-neutral-500">إجمالي الدورات</div>
                  <div className="text-2xl font-bold">
                    {isLoading ? "..." : totalCourses}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-success ml-4">
                  <span className="material-icons">check_circle</span>
                </div>
                <div>
                  <div className="text-sm text-neutral-500">الدورات المكتملة</div>
                  <div className="text-2xl font-bold">
                    {isLoading ? "..." : completedCourses}
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <Progress value={(completedCourses / Math.max(1, totalCourses)) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600 ml-4">
                  <span className="material-icons">grading</span>
                </div>
                <div>
                  <div className="text-sm text-neutral-500">التقييمات</div>
                  <div className="text-2xl font-bold">
                    {isLoading ? "..." : coursesWithEvaluations}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-accent-dark ml-4">
                  <span className="material-icons">star</span>
                </div>
                <div>
                  <div className="text-sm text-neutral-500">متوسط التقييم</div>
                  <div className="text-2xl font-bold">
                    {isLoading ? "..." : `${averageScore}%`}
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <Progress value={averageScore} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Evaluations List */}
        <Card className="bg-white rounded-lg shadow overflow-hidden">
          <CardHeader>
            <CardTitle>تقييمات الدورات</CardTitle>
          </CardHeader>
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
                    التقييم
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    تاريخ التقييم
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    المقيِّم
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      جاري تحميل البيانات...
                    </td>
                  </tr>
                ) : evaluations?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      لا توجد تقييمات بعد
                    </td>
                  </tr>
                ) : (
                  evaluations.map((evaluation: any) => (
                    <tr key={evaluation.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                        {evaluation.course.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {evaluation.course.site.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {formatDate(evaluation.course.startDate)} - {formatDate(evaluation.course.endDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {evaluation.course.supervisor?.user.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-success mr-2">{evaluation.score}%</div>
                          <Progress value={evaluation.score} className="h-2 w-20" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {formatDate(evaluation.evaluationDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {evaluation.evaluatorName || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Evaluation Comments */}
        {evaluations?.length > 0 && (
          <Card className="bg-white rounded-lg shadow">
            <CardHeader>
              <CardTitle>ملاحظات المقيمين</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {evaluations.map((evaluation: any) => (
                evaluation.comments && (
                  <div key={evaluation.id} className="p-4 border rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-medium text-primary">{evaluation.course.name}</h3>
                        <p className="text-sm text-neutral-500">
                          تقييم من: {evaluation.evaluatorName || "غير معروف"} | {formatDate(evaluation.evaluationDate)}
                        </p>
                      </div>
                      <div className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm font-medium">
                        {evaluation.score}%
                      </div>
                    </div>
                    <p className="text-neutral-700 mt-2">{evaluation.comments}</p>
                  </div>
                )
              ))}
              
              {evaluations.every((e: any) => !e.comments) && (
                <p className="text-center text-neutral-500">لا توجد ملاحظات متاحة</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentResults;
