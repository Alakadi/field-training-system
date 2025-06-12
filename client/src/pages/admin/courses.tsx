import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import AddCourseForm from "@/components/admin/add-course-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatDate } from "@/lib/utils";

const AdminCourses: React.FC = () => {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Parse query parameters
  const params = new URLSearchParams(location.split("?")[1]);
  const action = params.get("action");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddCourseForm, setShowAddCourseForm] = useState(action === "new");
  
  const itemsPerPage = 10;

  // Fetch data
  const { data: courses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ["/api/training-courses"]
  });

  const { data: faculties } = useQuery({
    queryKey: ["/api/faculties"]
  });

  // Filter courses
  const filteredCourses = (courses || []).filter((course: any) => {
    let matches = true;
    
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matches = course.name.toLowerCase().includes(query) || 
                (course.faculty?.name || "").toLowerCase().includes(query) ||
                (course.major?.name || "").toLowerCase().includes(query);
    }
    
    // Faculty filter
    if (facultyFilter && matches) {
      matches = course.facultyId === parseInt(facultyFilter);
    }
    
    // Status filter
    if (statusFilter && matches) {
      matches = course.status === statusFilter;
    }
    
    return matches;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleViewCourse = (courseId: number) => {
    setLocation(`/admin/courses/${courseId}`);
  };

  const handleEditCourse = (courseId: number) => {
    setLocation(`/admin/courses/edit/${courseId}`);
  };

  const handleDeleteCourse = async (courseId: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذه الدورة التدريبية؟")) {
      try {
        await apiRequest("DELETE", `/api/training-courses/${courseId}`);
        
        toast({
          title: "تم حذف الدورة التدريبية بنجاح",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/training-courses"] });
      } catch (error) {
        toast({
          title: "فشل حذف الدورة التدريبية",
          description: error instanceof Error ? error.message : "حدث خطأ أثناء حذف الدورة",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">إدارة الدورات التدريبية</h1>
          <div className="flex space-x-2 space-x-reverse">
            <Button
              className="bg-primary hover:bg-primary-dark text-white flex items-center text-sm"
              onClick={() => {
                setShowAddCourseForm(true);
                setLocation("/admin/courses?action=new");
              }}
            >
              <span className="material-icons ml-1 text-sm">add</span>
              إنشاء دورة جديدة
            </Button>
          </div>
        </div>

        {/* Add Course Form */}
        {showAddCourseForm && (
          <AddCourseForm
            onSuccess={() => {
              setShowAddCourseForm(false);
              setLocation("/admin/courses");
            }}
          />
        )}

        {/* Search and Filters */}
        <Card className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="بحث عن دورة..."
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
                  {(faculties || []).map((faculty: any) => (
                    <SelectItem key={faculty.id} value={String(faculty.id)}>
                      {faculty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="كل الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="upcoming">قادم</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Courses Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    اسم الدورة
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    الكلية
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    التخصص
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    عدد المجموعات
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    إجمالي الطلاب
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
                {isLoadingCourses ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center">
                      جاري تحميل البيانات...
                    </td>
                  </tr>
                ) : paginatedCourses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center">
                      لا توجد بيانات للعرض
                    </td>
                  </tr>
                ) : (
                  paginatedCourses.map((course: any) => (
                    <tr key={course.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                        {course.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {course.faculty?.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {course.major?.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {course.groups?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {course.totalStudents || 0} طالب
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          course.status === 'active' ? 'bg-green-100 text-green-800' :
                          course.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                          'bg-neutral-100 text-neutral-800'
                        }`}>
                          {course.status === 'active' ? 'نشط' :
                           course.status === 'upcoming' ? 'قادم' :
                           course.status === 'completed' ? 'مكتمل' : course.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary hover:text-primary-dark"
                            onClick={() => handleEditCourse(course.id)}
                          >
                            <span className="material-icons text-sm">edit</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-neutral-600 hover:text-neutral-900"
                            onClick={() => handleViewCourse(course.id)}
                          >
                            <span className="material-icons text-sm">visibility</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error hover:text-red-700"
                            onClick={() => handleDeleteCourse(course.id)}
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
          {filteredCourses.length > 0 && (
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
                      {Math.min(currentPage * itemsPerPage, filteredCourses.length)}
                    </span>
                    من أصل
                    <span className="font-medium mx-1">{filteredCourses.length}</span>
                    دورة
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

export default AdminCourses;
