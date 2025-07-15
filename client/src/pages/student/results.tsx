import React from "react";
import { useQuery } from "@tanstack/react-query";
import StudentLayout from "@/components/layout/student-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/utils";
import Icon from "@/components/ui/icon-map";

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

  // Fetch training assignments with detailed grades
  const { data: assignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["/api/training-assignments/student"],
    queryFn: async () => {
      const res = await fetch(`/api/training-assignments/student`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json();
    },
  });

  // Fetch evaluations/grades for student
  const { data: evaluations, isLoading: isLoadingEvaluations } = useQuery({
    queryKey: ["/api/students/me/evaluations"],
    queryFn: async () => {
      if (!studentData?.id) return [];
      const res = await fetch(`/api/students/${studentData.id}/evaluations`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!studentData?.id,
  });
  
  const isLoading = isLoadingStudent || isLoadingAssignments || isLoadingEvaluations;
  
  // Calculate statistics
  const totalCourses = assignments?.length || 0;
  const completedCourses = assignments?.filter((a: any) => a.status === "completed")?.length || 0;
  const coursesWithGrades = evaluations?.filter((e: any) => e.hasGrades)?.length || 0;
  
  // Calculate average from detailed grades
  const gradesWithCalculated = evaluations?.filter((e: any) => e.assignment?.calculatedFinalGrade) || [];
  const averageScore = gradesWithCalculated.length > 0
    ? Math.round(gradesWithCalculated.reduce((sum: number, evaluation: any) => 
        sum + parseFloat(evaluation.assignment.calculatedFinalGrade), 0) / gradesWithCalculated.length) 
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
                  <Icon name="graduation_cap" size={24} />
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
                <div className="p-3 rounded-full bg-green-100 text-green-600 ml-4">
                  <Icon name="check_circle" size={24} />
                </div>
                <div>
                  <div className="text-sm text-neutral-500">الدورات المكتملة</div>
                  <div className="text-2xl font-bold">
                    {isLoading ? "..." : completedCourses}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600 ml-4">
                  <Icon name="star" size={24} />
                </div>
                <div>
                  <div className="text-sm text-neutral-500">مع درجات</div>
                  <div className="text-2xl font-bold">
                    {isLoading ? "..." : coursesWithGrades}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-orange-100 text-orange-600 ml-4">
                  <Icon name="trending_up" size={24} />
                </div>
                <div>
                  <div className="text-sm text-neutral-500">المتوسط العام</div>
                  <div className="text-2xl font-bold">
                    {isLoading ? "..." : `${averageScore}%`}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course Results */}
        <Card className="bg-white rounded-lg shadow overflow-hidden">
          <CardHeader>
            <CardTitle>تفاصيل النتائج</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">جاري تحميل النتائج...</div>
            ) : evaluations?.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-neutral-500">لا توجد نتائج متاحة حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-6">
                {evaluations?.map((evaluation: any) => (
                  <Card key={evaluation.id} className="border shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">{evaluation.course.name}</CardTitle>
                        <div className="flex gap-2">
                          {evaluation.hasGrades && (
                            <Badge className="bg-green-100 text-green-800">
                              مُقيم
                            </Badge>
                          )}
                          {evaluation.evaluationDate && (
                            <Badge variant="outline">
                              {new Date(evaluation.evaluationDate).toLocaleDateString('en-US')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-neutral-500 mb-2">معلومات الدورة</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-neutral-600">تاريخ البدء:</span> {new Date(evaluation.course.startDate).toLocaleDateString('en-US')}
                            </div>
                            <div>
                              <span className="text-neutral-600">تاريخ الانتهاء:</span> {new Date(evaluation.course.endDate).toLocaleDateString('en-US')}
                            </div>
                          </div>
                        </div>
                        
                        {evaluation.hasGrades && evaluation.assignment && (
                          <>
                            {/* الدرجات المفصلة */}
                            <div>
                              <p className="text-sm font-medium text-neutral-500 mb-3">الدرجات المفصلة</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                  <p className="text-sm font-medium text-blue-600">درجة الحضور</p>
                                  <p className="text-2xl font-bold text-blue-700">
                                    {evaluation.assignment.attendanceGrade || 0} / 20
                                  </p>
                                  <p className="text-xs text-blue-500">(20%)</p>
                                </div>
                                <div className="text-center p-3 bg-green-50 rounded-lg">
                                  <p className="text-sm font-medium text-green-600">درجة السلوك</p>
                                  <p className="text-2xl font-bold text-green-700">
                                    {evaluation.assignment.behaviorGrade || 0} / 30
                                  </p>
                                  <p className="text-xs text-green-500">(30%)</p>
                                </div>
                                <div className="text-center p-3 bg-purple-50 rounded-lg">
                                  <p className="text-sm font-medium text-purple-600">الاختبار النهائي</p>
                                  <p className="text-2xl font-bold text-purple-700">
                                    {evaluation.assignment.finalExamGrade || 0} / 50
                                  </p>
                                  <p className="text-xs text-purple-500">(50%)</p>
                                </div>
                              </div>
                            </div>

                            {/* الدرجة النهائية المحسوبة */}
                            <div className="bg-orange-50 p-4 rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-medium text-orange-600">الدرجة النهائية المحسوبة</p>
                                <div className="text-2xl font-bold text-orange-700">
                                  {evaluation.assignment.calculatedFinalGrade ? 
                                    parseFloat(evaluation.assignment.calculatedFinalGrade).toFixed(1) : 0} / 100
                                </div>
                              </div>
                              <div className="w-full bg-orange-200 rounded-full h-3">
                                <div 
                                  className="bg-orange-500 h-3 rounded-full transition-all duration-300" 
                                  style={{ 
                                    width: `${evaluation.assignment.calculatedFinalGrade || 0}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                          </>
                        )}

                        {/* التقييم التقليدي إن وجد */}
                        {evaluation.score && (
                          <div className="bg-neutral-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-sm font-medium text-neutral-600">تقييم المشرف</p>
                              <div className="text-xl font-bold text-neutral-700">
                                {evaluation.score}/100
                              </div>
                            </div>
                            {evaluation.comments && (
                              <p className="text-sm text-neutral-600 mt-2">{evaluation.comments}</p>
                            )}
                          </div>
                        )}

                        {!evaluation.hasGrades && !evaluation.score && (
                          <div className="text-center py-4 text-neutral-500">
                            لم يتم إدخال الدرجات بعد
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
      </div>
    </StudentLayout>
  );
};

export default StudentResults;