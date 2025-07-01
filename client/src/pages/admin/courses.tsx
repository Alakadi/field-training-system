import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import AddCourseForm from "@/components/admin/add-course-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatDate } from "@/lib/utils";
import Icon from "@/components/ui/icon-map";

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
  const [academicYearFilter, setAcademicYearFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddCourseForm, setShowAddCourseForm] = useState(action === "new");
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isAddingStudents, setIsAddingStudents] = useState(false);

  const itemsPerPage = 10;

  // Fetch data
  const { data: courses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ["/api/training-courses", academicYearFilter, facultyFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (academicYearFilter) params.append('academicYearId', academicYearFilter);
      if (facultyFilter) params.append('facultyId', facultyFilter);
      if (statusFilter) params.append('status', statusFilter);
      
      const res = await fetch(`/api/training-courses?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    }
  });

  const { data: faculties } = useQuery({
    queryKey: ["/api/faculties"]
  });

  const { data: academicYears } = useQuery({
    queryKey: ["/api/academic-years"]
  });

  const { data: courseGroups } = useQuery({
    queryKey: ["/api/training-course-groups"]
  });

  // Fetch groups for selected course
  const { data: availableCourseGroups = [] } = useQuery({
    queryKey: ["/api/training-course-groups", "course", selectedCourse?.id],
    queryFn: async () => {
      if (!selectedCourse?.id) return [];
      const res = await fetch(`/api/training-course-groups?courseId=${selectedCourse.id}&available=true`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch course groups");
      return res.json();
    },
    enabled: !!selectedCourse?.id,
  });

  // Fetch all students for the selected course with enrollment status
  const { data: eligibleStudents = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ["/api/students", "for-course", selectedCourse?.id],
    queryFn: async () => {
      if (!selectedCourse?.id) return [];
      const res = await fetch(`/api/students/for-course/${selectedCourse.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
    enabled: !!selectedCourse?.id,
  });

  // Filter courses (only client-side search now, other filters are server-side)
  const filteredCourses = Array.isArray(courses) ? courses.filter((course: any) => {
    // Search query (client-side)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return course.name.toLowerCase().includes(query) || 
             (course.faculty?.name || "").toLowerCase().includes(query) ||
             (course.major?.name || "").toLowerCase().includes(query);
    }
    return true;
  }) : [];

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

  const handleAddStudentsToCourse = (course: any) => {
    setSelectedCourse(course);
    setSelectedStudents([]);
    setSelectedGroupId("");
    setShowAddStudentsModal(true);
  };

  const handleStudentSelection = (studentId: string, checked: boolean) => {
    // التحقق من أن الطالب ليس مسجل بالفعل
    const student = eligibleStudents.find((s: any) => String(s.id) === studentId);
    if (student?.isEnrolled) return;

    if (checked) {
      setSelectedStudents([...selectedStudents, studentId]);
    } else {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    }
  };

  const handleSubmitStudents = async () => {
    if (!selectedCourse || selectedStudents.length === 0 || !selectedGroupId) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى اختيار مجموعة وطلاب لإضافتهم",
        variant: "destructive",
      });
      return;
    }

    setIsAddingStudents(true);
    try {
      // العثور على المجموعة المحددة
      const selectedGroup = availableCourseGroups.find((group: any) => String(group.id) === selectedGroupId);
      
      if (!selectedGroup) {
        toast({
          title: "خطأ في المجموعة",
          description: "المجموعة المحددة غير موجودة",
          variant: "destructive",
        });
        return;
      }

      // التحقق من السعة المتاحة
      const availableSpots = selectedGroup.capacity - (selectedGroup.currentEnrollment || 0);
      if (selectedStudents.length > availableSpots) {
        toast({
          title: "تجاوز السعة المتاحة",
          description: `المجموعة تحتوي على ${availableSpots} مقعد متاح فقط`,
          variant: "destructive",
        });
        return;
      }

      // إضافة الطلاب المحددين للمجموعة (استبعاد المسجلين بالفعل)
      const studentsToAdd = selectedStudents.filter(studentId => {
        const student = eligibleStudents.find((s: any) => String(s.id) === studentId);
        return !student?.isEnrolled;
      });

      for (const studentId of studentsToAdd) {
        await apiRequest("POST", "/api/training-assignments", {
          studentId: parseInt(studentId),
          groupId: parseInt(selectedGroupId),
        });
      }

      toast({
        title: "تم إضافة الطلاب بنجاح",
        description: `تم إضافة ${studentsToAdd.length} طالب للدورة`,
      });

      // Refresh data and close modal
      queryClient.invalidateQueries({ queryKey: ["/api/training-courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-course-groups"] });
      setShowAddStudentsModal(false);
      setSelectedStudents([]);
      setSelectedGroupId("");
      setSelectedCourse(null);

    } catch (error) {
      toast({
        title: "فشل إضافة الطلاب",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء إضافة الطلاب",
        variant: "destructive",
      });
    } finally {
      setIsAddingStudents(false);
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
              <Icon name="plus" size={16} />
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="بحث عن دورة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2"
                />
                <Icon name="search" size={16} />
              </div>
            </div>
            <div>
              <Select value={facultyFilter} onValueChange={setFacultyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="كل الكليات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الكليات</SelectItem>
                  {Array.isArray(faculties) && faculties.map((faculty: any) => (
                    <SelectItem key={faculty.id} value={String(faculty.id)}>
                      {faculty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="كل السنوات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل السنوات</SelectItem>
                  {Array.isArray(academicYears) && academicYears.map((year: any) => (
                    <SelectItem key={year.id} value={String(year.id)}>
                      {year.name}
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
                           course.status === 'completed' ? 'مكتمل' : course.status} (تلقائية)
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary hover:text-primary-dark"
                            onClick={() => handleEditCourse(course.id)}
                            title="تعديل الدورة"
                          >
                            <Icon name="edit" size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-green-600 hover:text-green-800"
                            onClick={() => handleAddStudentsToCourse(course)}
                            title="إضافة طلاب للدورة"
                          >
                            <Icon name="user_plus" size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-neutral-600 hover:text-neutral-900"
                            onClick={() => handleViewCourse(course.id)}
                            title="عرض الدورة"
                          >
                            <Icon name="eye" size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error hover:text-red-700"
                            onClick={() => handleDeleteCourse(course.id)}
                            title="حذف الدورة"
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

        {/* Add Students Modal */}
        <Dialog open={showAddStudentsModal} onOpenChange={setShowAddStudentsModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>إضافة طلاب للدورة</DialogTitle>
              <DialogDescription>
                {selectedCourse && (
                  <div className="space-y-3">
                    <div>
                      <p>دورة: <span className="font-medium">{selectedCourse.name}</span></p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{selectedCourse.faculty?.name}</Badge>
                        <Badge variant="outline">{selectedCourse.major?.name}</Badge>
                        <Badge variant="outline">{selectedCourse.level?.name}</Badge>
                      </div>
                    </div>
                    
                    {/* Group Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">اختيار المجموعة:</label>
                      <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="اختر المجموعة لإضافة الطلاب إليها" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCourseGroups.map((group: any) => {
                            const availableSpots = group.capacity - (group.currentEnrollment || 0);
                            return (
                              <SelectItem 
                                key={group.id} 
                                value={String(group.id)}
                                disabled={availableSpots <= 0}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{group.groupName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {group.site?.name} - المشرف: {group.supervisor?.user?.name}
                                  </span>
                                  <span className={`text-xs ${availableSpots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    متاح: {availableSpots} من {group.capacity} مقعد
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {availableCourseGroups.length === 0 && (
                        <p className="text-sm text-red-600">لا توجد مجموعات متاحة لهذه الدورة</p>
                      )}
                    </div>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {isLoadingStudents ? (
                <div className="text-center py-4">جاري تحميل الطلاب المؤهلين...</div>
              ) : eligibleStudents.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  لا يوجد طلاب مؤهلين لهذه الدورة حالياً
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      الطلاب المؤهلين ({eligibleStudents.length} طالب) 
                      <span className="text-green-600 mx-2">
                        • {eligibleStudents.filter((s: any) => s.isEnrolled).length} مُسجل
                      </span>
                      <span className="text-blue-600">
                        • {eligibleStudents.filter((s: any) => !s.isEnrolled).length} متاح
                      </span>
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const availableStudents = eligibleStudents.filter((student: any) => !student.isEnrolled);
                        const allAvailableSelected = availableStudents.every((student: any) =>
                          selectedStudents.includes(String(student.id))
                        );
                        if (allAvailableSelected) {
                          setSelectedStudents([]);
                        } else {
                          setSelectedStudents(availableStudents.map((student: any) => String(student.id)));
                        }
                      }}
                    >
                      {eligibleStudents.filter((student: any) => !student.isEnrolled).every((student: any) =>
                        selectedStudents.includes(String(student.id))
                      ) ? 'إلغاء تحديد الكل' : 'تحديد المتاحين'}
                    </Button>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-3">
                    {eligibleStudents.map((student: any) => (
                      <div
                        key={student.id}
                        className={`flex items-center space-x-2 space-x-reverse p-3 rounded-lg border transition-colors ${
                          student.isEnrolled 
                            ? 'bg-green-50 border-green-200' 
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2 space-x-reverse">
                          {student.isEnrolled ? (
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          ) : (
                            <Checkbox
                              id={`student-${student.id}`}
                              checked={selectedStudents.includes(String(student.id))}
                              onCheckedChange={(checked) =>
                                handleStudentSelection(String(student.id), checked as boolean)
                              }
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor={`student-${student.id}`}
                              className={`text-sm font-medium ${
                                student.isEnrolled ? 'cursor-default' : 'cursor-pointer'
                              }`}
                            >
                              {student.user?.name || student.name}
                            </label>
                            {student.isEnrolled && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                مُسجل في: {student.enrolledGroup}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {student.universityId} - {student.faculty?.name} - {student.major?.name}
                          </p>
                          {student.isEnrolled && (
                            <p className="text-xs text-green-600 mt-1">
                              موقع التدريب: {student.trainingSite} | المشرف: {student.supervisor}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedStudents.length > 0 && selectedGroupId && (
                    <div className="text-sm text-muted-foreground">
                      تم تحديد {selectedStudents.length} طالب لإضافتهم للمجموعة
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddStudentsModal(false);
                  setSelectedStudents([]);
                  setSelectedGroupId("");
                  setSelectedCourse(null);
                }}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSubmitStudents}
                disabled={selectedStudents.length === 0 || !selectedGroupId || isAddingStudents}
              >
                {isAddingStudents ? 'جاري الإضافة...' : 
                 selectedGroupId ? `إضافة ${selectedStudents.length} طالب للمجموعة` : 
                 'اختر مجموعة أولاً'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminCourses;