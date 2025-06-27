import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SupervisorLayout from "@/components/layout/supervisor-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import EvaluationForm from "@/components/supervisor/evaluation-form";
import { ExportDialog } from "@/components/ExportDialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatDate } from "@/lib/utils";
import { formatGrade } from "@/lib/export-utils";
import Icon from "@/components/ui/icon-map";

const SupervisorEvaluations: React.FC = () => {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Parse query parameters
  const params = new URLSearchParams(location.split("?")[1]);
  const action = params.get("action");
  const assignmentId = params.get("assignmentId");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showEvaluationForm, setShowEvaluationForm] = useState(action === "new");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(assignmentId || "");
  
  const itemsPerPage = 10;

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

  // Fetch assignments
  const { data: assignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["/api/training-assignments"],
    queryFn: async () => {
      const res = await fetch("/api/training-assignments", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json();
    },
  });

  // Filter evaluations
  const filteredEvaluations = evaluations?.filter((evaluation: any) => {
    const assignment = assignments?.find((a: any) => a.id === evaluation.assignmentId);
    if (!assignment) return false;
    
    // Filter by supervisor
    if (supervisorData && assignment.assignedBySupervisorId !== supervisorData.id) {
      return false;
    }
    
    let matches = true;
    
    // Search query
    if (searchQuery && assignment) {
      const query = searchQuery.toLowerCase();
      const studentNameMatches = assignment.student?.user.name.toLowerCase().includes(query);
      const courseNameMatches = assignment.course?.name.toLowerCase().includes(query);
      matches = studentNameMatches || courseNameMatches;
    }
    
    return matches;
  }) || [];

  // Get details for each evaluation
  const enhancedEvaluations = filteredEvaluations.map((evaluation: any) => {
    const assignment = assignments?.find((a: any) => a.id === evaluation.assignmentId);
    return {
      ...evaluation,
      student: assignment?.student,
      course: assignment?.course
    };
  });

  // Pagination
  const totalPages = Math.ceil(enhancedEvaluations.length / itemsPerPage);
  const paginatedEvaluations = enhancedEvaluations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get list of assignments that need evaluation (for the form)
  const assignmentsToEvaluate = assignments?.filter((assignment: any) => {
    // Only include assignments for this supervisor
    if (supervisorData && assignment.assignedBySupervisorId !== supervisorData.id) {
      return false;
    }
    
    // Only active assignments
    if (assignment.status !== "active") {
      return false;
    }
    
    // Check if assignment already has evaluation
    const hasEvaluation = evaluations?.some((e: any) => e.assignmentId === assignment.id);
    return !hasEvaluation;
  }) || [];

  const handleDeleteEvaluation = async (evaluationId: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذا التقييم؟")) {
      try {
        await apiRequest("DELETE", `/api/evaluations/${evaluationId}`);
        
        toast({
          title: "تم حذف التقييم بنجاح",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/evaluations"] });
      } catch (error) {
        toast({
          title: "فشل حذف التقييم",
          description: error instanceof Error ? error.message : "حدث خطأ أثناء حذف التقييم",
          variant: "destructive",
        });
      }
    }
  };

  // Define export columns for evaluations
  const exportColumns = [
    { key: 'student.user.name', title: 'اسم الطالب', width: 20 },
    { key: 'student.universityId', title: 'الرقم الجامعي', width: 15 },
    { key: 'course.name', title: 'الدورة التدريبية', width: 25 },
    { key: 'attendanceScore', title: 'درجة الحضور', width: 15, formatter: (value: any) => `${value || 0} / 30` },
    { key: 'skillsScore', title: 'درجة المهارات', width: 15, formatter: (value: any) => `${value || 0} / 40` },
    { key: 'reportScore', title: 'درجة التقرير', width: 15, formatter: (value: any) => `${value || 0} / 30` },
    { key: 'totalScore', title: 'المجموع', width: 12, formatter: formatGrade },
    { key: 'feedback', title: 'الملاحظات', width: 30 },
    { key: 'createdAt', title: 'تاريخ التقييم', width: 15, formatter: formatDate }
  ];

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">إدارة التقييمات</h1>
          <div className="flex space-x-2 space-x-reverse">
            <Button
              className="bg-primary hover:bg-primary-dark text-white flex items-center text-sm"
              onClick={() => {
                setShowEvaluationForm(true);
                setSelectedAssignmentId("");
                setLocation("/supervisor/evaluations?action=new");
              }}
            >
              <Icon name="plus" size={16} />
              إضافة تقييم جديد
            </Button>
            <ExportDialog
              data={enhancedEvaluations || []}
              columns={exportColumns}
              defaultFilename="تقييمات_الطلاب"
              title="تصدير تقييمات الطلاب"
            />
          </div>
        </div>

        {/* Add Evaluation Form */}
        {showEvaluationForm && (
          <EvaluationForm
            assignmentId={selectedAssignmentId}
            assignments={assignmentsToEvaluate}
            onSuccess={() => {
              setShowEvaluationForm(false);
              setSelectedAssignmentId("");
              setLocation("/supervisor/evaluations");
            }}
            onCancel={() => {
              setShowEvaluationForm(false);
              setSelectedAssignmentId("");
              setLocation("/supervisor/evaluations");
            }}
          />
        )}

        {/* Search */}
        <Card className="bg-white p-4 rounded-lg shadow">
          <div className="relative">
            <Input
              type="text"
              placeholder="بحث عن تقييم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full md:w-1/2"
            />
            <Icon name="search" size={16} />
          </div>
        </Card>

        {/* Evaluations Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    رقم التقييم
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
                    التقييم
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    تاريخ التقييم
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    المقيِّم
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {isLoadingEvaluations || isLoadingAssignments ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center">
                      جاري تحميل البيانات...
                    </td>
                  </tr>
                ) : paginatedEvaluations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center">
                      لا توجد بيانات للعرض
                    </td>
                  </tr>
                ) : (
                  paginatedEvaluations.map((evaluation: any) => (
                    <tr key={evaluation.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                        {evaluation.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {evaluation.student?.user.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                        {evaluation.course?.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {evaluation.course?.site.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-success">
                        {evaluation.score}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {formatDate(evaluation.evaluationDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {evaluation.evaluatorName || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary-dark"
                            onClick={() => {
                              setSelectedAssignmentId(String(evaluation.assignmentId));
                              setShowEvaluationForm(true);
                              setLocation(`/supervisor/evaluations?action=edit&id=${evaluation.id}`);
                            }}
                          >
                            <Icon name="edit" size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-neutral-600 hover:text-neutral-900">
                            <Icon name="eye" size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error hover:text-red-700"
                            onClick={() => handleDeleteEvaluation(evaluation.id)}
                          >
                            <Icon name="trash" size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {enhancedEvaluations.length > 0 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-neutral-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  التالي
                </Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-neutral-700">
                    عرض
                    <span className="font-medium mx-1">
                      {(currentPage - 1) * itemsPerPage + 1}
                    </span>
                    إلى
                    <span className="font-medium mx-1">
                      {Math.min(currentPage * itemsPerPage, enhancedEvaluations.length)}
                    </span>
                    من أصل
                    <span className="font-medium mx-1">{enhancedEvaluations.length}</span>
                    تقييم
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <Button
                      variant="outline"
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-neutral-300 text-sm font-medium"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <span className="sr-only">السابق</span>
                      <Icon name="chevron_right" size={16} />
                    </Button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        pageNum = currentPage - 3 + i;
                      }
                      if (pageNum <= totalPages) {
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            className="relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                      return null;
                    })}
                    
                    <Button
                      variant="outline"
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-neutral-300 text-sm font-medium"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <span className="sr-only">التالي</span>
                      <Icon name="chevron_left" size={16} />
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SupervisorLayout>
  );
};

export default SupervisorEvaluations;
