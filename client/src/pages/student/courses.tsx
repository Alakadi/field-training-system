import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import StudentLayout from "@/components/layout/student-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import CourseCard from "@/components/student/course-card";
import { apiRequest } from "@/lib/queryClient";

const StudentCourses: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("");
  
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

  // Fetch faculties
  const { data: faculties } = useQuery({
    queryKey: ["/api/faculties"]
  });

  // Fetch my training assignments (current and past)
  const { data: myAssignments, isLoading: isLoadingMyAssignments } = useQuery({
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

  // Fetch available courses for enrollment
  const { data: availableCourses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ["/api/training-courses/available"],
    queryFn: async () => {
      if (!studentData?.id) return [];
      // In a real app, this would filter by faculty and other eligibility criteria
      const res = await fetch(`/api/training-courses?status=upcoming`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch available courses");
      return res.json();
    },
    enabled: !!studentData?.id,
  });

  // Filter available courses
  const filteredCourses = availableCourses?.filter((course: any) => {
    // First, exclude courses student is already enrolled in
    const alreadyEnrolled = myAssignments?.some((a: any) => a.courseId === course.id);
    if (alreadyEnrolled) return false;
    
    let matches = true;
    
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matches = course.name.toLowerCase().includes(query) || 
                course.site.name.toLowerCase().includes(query);
    }
    
    // Faculty filter
    if (facultyFilter && matches) {
      matches = course.facultyId === parseInt(facultyFilter);
    }
    
    return matches;
  }) || [];

  const handleEnrollCourse = async (courseId: number) => {
    if (!studentData?.id) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/training-assignments", {
        studentId: studentData.id,
        courseId,
      });

      toast({
        title: "تم التسجيل بنجاح",
        description: "تم التسجيل في الدورة التدريبية بنجاح",
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments/student"] });
    } catch (error) {
      toast({
        title: "فشل التسجيل",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء التسجيل في الدورة",
        variant: "destructive",
      });
    }
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">الدورات التدريبية</h1>
        </div>

        {/* Student Courses */}
        <Card className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-neutral-200">
            <h2 className="text-lg font-bold">دوراتي التدريبية</h2>
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
                {isLoadingMyAssignments ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      جاري تحميل البيانات...
                    </td>
                  </tr>
                ) : myAssignments?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      لا توجد دورات تدريبية مسجلة
                    </td>
                  </tr>
                ) : (
                  myAssignments.map((assignment: any) => (
                    <tr key={assignment.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                        {assignment.course.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {assignment.course.site.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {new Date(assignment.course.startDate).toLocaleDateString('ar-SA')} - 
                        {new Date(assignment.course.endDate).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {assignment.course.supervisor?.user.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-success">
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
                        <Button size="sm" className="bg-primary text-white px-2 py-1 rounded-md text-xs">
                          تفاصيل
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Available Courses */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">دورات متاحة للتسجيل</h2>
            
            {/* Search and Filters */}
            <div className="flex space-x-2 space-x-reverse">
              <div className="relative w-64">
                <Input
                  type="text"
                  placeholder="بحث عن دورة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2"
                />
                <span className="material-icons absolute right-3 top-2 text-neutral-500">search</span>
              </div>
              
              <Select value={facultyFilter} onValueChange={setFacultyFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="كل الكليات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">كل الكليات</SelectItem>
                  {faculties?.map((faculty: any) => (
                    <SelectItem key={faculty.id} value={String(faculty.id)}>
                      {faculty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isLoadingCourses ? (
            <div className="text-center p-12 bg-white rounded-lg shadow">
              جاري تحميل الدورات المتاحة...
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-lg shadow">
              لا توجد دورات متاحة للتسجيل حالياً
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course: any) => (
                <CourseCard 
                  key={course.id}
                  course={course}
                  onEnroll={() => handleEnrollCourse(course.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentCourses;
