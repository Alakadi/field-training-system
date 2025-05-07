import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import AddStudentForm from "@/components/admin/add-student-form";
import ImportExcel from "@/components/admin/import-excel";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const AdminStudents: React.FC = () => {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Parse query parameters
  const params = new URLSearchParams(location.split("?")[1]);
  const action = params.get("action");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("");
  const [majorFilter, setMajorFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddStudentForm, setShowAddStudentForm] = useState(action === "new");
  const [showImportForm, setShowImportForm] = useState(action === "import");
  
  const itemsPerPage = 10;

  // Fetch data
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["/api/students"]
  });

  const { data: faculties } = useQuery({
    queryKey: ["/api/faculties"]
  });

  const { data: majors } = useQuery({
    queryKey: ["/api/majors", facultyFilter],
    queryFn: async () => {
      if (!facultyFilter) return [];
      const res = await fetch(`/api/majors?facultyId=${facultyFilter}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch majors");
      return res.json();
    },
    enabled: !!facultyFilter,
  });

  // Filter students
  const filteredStudents = students?.filter((student: any) => {
    let matches = true;
    
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nameMatches = student.user.name.toLowerCase().includes(query);
      const idMatches = student.universityId.toLowerCase().includes(query);
      matches = nameMatches || idMatches;
    }
    
    // Faculty filter
    if (facultyFilter && matches) {
      matches = student.facultyId === parseInt(facultyFilter);
    }
    
    // Major filter
    if (majorFilter && matches) {
      matches = student.majorId === parseInt(majorFilter);
    }
    
    return matches;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleViewStudent = (studentId: number) => {
    setLocation(`/admin/students/${studentId}`);
  };

  const handleEditStudent = (studentId: number) => {
    setLocation(`/admin/students/edit/${studentId}`);
  };
  
  const handleDeleteStudent = async (studentId: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الطالب؟")) {
      try {
        await apiRequest("DELETE", `/api/students/${studentId}`);
        
        toast({
          title: "تم حذف الطالب بنجاح",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      } catch (error) {
        toast({
          title: "فشل حذف الطالب",
          description: error instanceof Error ? error.message : "حدث خطأ أثناء حذف الطالب",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">إدارة الطلاب</h1>
          <div className="flex space-x-2 space-x-reverse">
            <Button
              className="bg-primary hover:bg-primary-dark text-white flex items-center text-sm"
              onClick={() => {
                setShowAddStudentForm(true);
                setShowImportForm(false);
                setLocation("/admin/students?action=new");
              }}
            >
              <span className="material-icons ml-1 text-sm">add</span>
              إضافة طالب
            </Button>
            <Button
              variant="outline"
              className="flex items-center text-sm"
              onClick={() => {
                setShowImportForm(true);
                setShowAddStudentForm(false);
                setLocation("/admin/students?action=import");
              }}
            >
              <span className="material-icons ml-1 text-sm">file_upload</span>
              استيراد
            </Button>
            <Button variant="outline" className="flex items-center text-sm">
              <span className="material-icons ml-1 text-sm">file_download</span>
              تصدير
            </Button>
          </div>
        </div>

        {/* Add Student Form */}
        {showAddStudentForm && (
          <AddStudentForm
            onSuccess={() => {
              setShowAddStudentForm(false);
              setLocation("/admin/students");
            }}
          />
        )}

        {/* Import Form */}
        {showImportForm && (
          <div className="mb-6">
            <ImportExcel />
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportForm(false);
                  setLocation("/admin/students");
                }}
              >
                إغلاق
              </Button>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <Card className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="بحث عن طالب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2"
                />
                <span className="material-icons absolute right-3 top-2 text-neutral-500">search</span>
              </div>
            </div>
            <div>
              <Select value={facultyFilter} onValueChange={setFacultyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="كل الكليات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الكليات</SelectItem>
                  {faculties?.map((faculty: any) => (
                    <SelectItem key={faculty.id} value={String(faculty.id)}>
                      {faculty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select 
                value={majorFilter} 
                onValueChange={setMajorFilter}
                disabled={!facultyFilter || !majors?.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder="كل التخصصات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل التخصصات</SelectItem>
                  {majors?.map((major: any) => (
                    <SelectItem key={major.id} value={String(major.id)}>
                      {major.name}
                    </SelectItem>
                  ))}
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
                    الكلية
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    التخصص
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    المستوى
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    المشرف
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
                {isLoadingStudents ? (
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
                  paginatedStudents.map((student: any) => (
                    <tr key={student.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                        {student.universityId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {student.user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {student.faculty?.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {student.major?.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {student.level?.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {student.supervisor?.user?.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {student.user.active ? "نشط" : "غير نشط"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary hover:text-primary-dark"
                            onClick={() => handleEditStudent(student.id)}
                          >
                            <span className="material-icons text-sm">edit</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-neutral-600 hover:text-neutral-900"
                            onClick={() => handleViewStudent(student.id)}
                          >
                            <span className="material-icons text-sm">visibility</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error hover:text-red-700"
                            onClick={() => handleDeleteStudent(student.id)}
                          >
                            <span className="material-icons text-sm">delete</span>
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
          {filteredStudents.length > 0 && (
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
                      {Math.min(currentPage * itemsPerPage, filteredStudents.length)}
                    </span>
                    من أصل
                    <span className="font-medium mx-1">{filteredStudents.length}</span>
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
                      <span className="material-icons text-sm">chevron_right</span>
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
                      <span className="material-icons text-sm">chevron_left</span>
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminStudents;
