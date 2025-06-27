import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SupervisorLayout from "@/components/layout/supervisor-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const SupervisorStudents: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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

  // Fetch training assignments
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

  // Filter students
  const filteredStudents = students?.filter((student: any) => {
    // First, check if student has assignment
    const studentAssignments = assignments?.filter((a: any) => a.studentId === student.id) || [];
    
    let matches = true;
    
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nameMatches = student.user.name.toLowerCase().includes(query);
      const idMatches = student.universityId.toLowerCase().includes(query);
      matches = nameMatches || idMatches;
    }
    
    // Status filter - we'll filter based on training status
    if (statusFilter && matches) {
      if (statusFilter === "active") {
        matches = studentAssignments.some((a: any) => a.status === "active");
      } else if (statusFilter === "completed") {
        matches = studentAssignments.some((a: any) => a.status === "completed");
      } else if (statusFilter === "pending") {
        matches = studentAssignments.some((a: any) => a.status === "pending");
      } else if (statusFilter === "noEvaluation") {
        // Students with active assignments but no evaluations
        matches = studentAssignments.some((a: any) => {
          const hasEvaluation = evaluations?.some((e: any) => e.assignmentId === a.id);
          return a.status === "active" && !hasEvaluation;
        });
      }
    }
    
    return matches;
  }) || [];

  // Enhance students with their assignments and evaluations
  const enhancedStudents = filteredStudents.map((student: any) => {
    const studentAssignments = assignments?.filter((a: any) => a.studentId === student.id) || [];
    const currentAssignment = studentAssignments.find((a: any) => a.status === "active");
    
    let evaluation = null;
    if (currentAssignment) {
      evaluation = evaluations?.find((e: any) => e.assignmentId === currentAssignment.id);
    }
    
    return {
      ...student,
      currentAssignment,
      evaluation
    };
  });

  // Pagination
  const totalPages = Math.ceil(enhancedStudents.length / itemsPerPage);
  const paginatedStudents = enhancedStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">الطلاب تحت الإشراف</h1>
          <Link href="/supervisor/evaluations?action=new">
            <Button className="bg-primary hover:bg-primary-dark text-white flex items-center text-sm">
              <Icon name="plus" size={16} />
              إضافة تقييم جديد
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <Card className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="بحث عن طالب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2"
                />
                <Icon name="search" size={16} />
              </div>
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">قيد التدريب</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="noEvaluation">بحاجة للتقييم</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Students Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                ) : paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center">
                      لا توجد بيانات للعرض
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student: any) => {
                    const currentCourse = assignments?.find(
                      (a: any) => a.id === student.currentAssignment?.id
                    )?.course;
                    
                    return (
                      <tr key={student.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                          {student.universityId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                          {student.user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                          {currentCourse?.name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                          {currentCourse?.site.name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                          {currentCourse ? formatDate(currentCourse.startDate) : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800 font-medium">
                          {student.evaluation ? `${student.evaluation.score}%` : "--"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${student.currentAssignment?.status === 'active' ? 'bg-yellow-100 text-yellow-800' : 
                              student.currentAssignment?.status === 'completed' ? 'bg-green-100 text-green-800' : 
                              'bg-blue-100 text-blue-800'}`}>
                            {student.currentAssignment?.status === 'active' ? 'قيد التدريب' : 
                             student.currentAssignment?.status === 'completed' ? 'مكتمل' : 
                             student.currentAssignment?.status === 'pending' ? 'قيد الانتظار' : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            {student.currentAssignment && !student.evaluation && (
                              <Link href={`/supervisor/evaluations?action=new&assignmentId=${student.currentAssignment.id}`}>
                                <Button size="sm" className="bg-primary text-white px-2 py-1 rounded-md text-xs">
                                  إضافة تقييم
                                </Button>
                              </Link>
                            )}
                            <Button variant="ghost" size="sm" className="text-neutral-600 hover:text-neutral-900">
                              <Icon name="eye" size={16} />
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
          
          {/* Pagination */}
          {enhancedStudents.length > 0 && (
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
                      {Math.min(currentPage * itemsPerPage, enhancedStudents.length)}
                    </span>
                    من أصل
                    <span className="font-medium mx-1">{enhancedStudents.length}</span>
                    طالب
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

export default SupervisorStudents;
