import React, { useState, startTransition } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import StudentLayout from "@/components/layout/student-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import EnhancedCourseCard from "@/components/student/enhanced-course-card";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import Icon from "@/components/ui/icon-map";

const StudentCourses: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
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

  // Fetch courses with their groups for enhanced display
  const { data: coursesWithGroups, isLoading: isLoadingCourses } = useQuery({
    queryKey: ["/api/courses-with-groups"],
    queryFn: async () => {
      const res = await fetch("/api/courses-with-groups", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch courses with groups");
      return res.json();
    },
  });

  // Filter courses based on search and student eligibility
  const filteredCourses = coursesWithGroups?.filter((course: any) => {
    let matches = true;
    
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matches = course.name.toLowerCase().includes(query) || 
                course.description?.toLowerCase().includes(query) ||
                course.groups.some((group: any) => 
                  group.site?.name?.toLowerCase().includes(query) ||
                  group.supervisor?.user?.name?.toLowerCase().includes(query)
                );
    }
    
    // Faculty filter (if student data is available)
    if (facultyFilter && studentData?.facultyId && matches) {
      matches = course.facultyId === parseInt(facultyFilter);
    }
    
    // Only show courses that match student's academic profile or are general
    if (studentData && matches) {
      matches = (!course.facultyId || course.facultyId === studentData.facultyId) &&
                (!course.majorId || course.majorId === studentData.majorId) &&
                (!course.levelId || course.levelId === studentData.levelId);
    }
    
    return matches;
  }) || [];

  // التحقق من حالة التسجيل
  const isRegisteredInGroup = (groupId: number) => {
    return myAssignments?.some(assignment => assignment.groupId === groupId);
  };

  // التحقق من التسجيل في نفس الكورس
  const isRegisteredInCourse = (courseId: number) => {
    return myAssignments?.some(assignment => {
      const assignmentCourseId = assignment.courseId || assignment.group?.courseId;
      return assignmentCourseId === courseId;
    });
  };

  // الحصول على المجموعة المسجل فيها في نفس الكورس
  const getRegisteredGroupInCourse = (courseId: number) => {
    return myAssignments?.find(assignment => {
      const assignmentCourseId = assignment.courseId || assignment.group?.courseId;
      return assignmentCourseId === courseId;
    });
  };

  // متغير للتسجيل
  const registerMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const response = await fetch('/api/training-assignments/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'فشل التسجيل');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-assignments/student'] });
      queryClient.invalidateQueries({ queryKey: ['/api/courses-with-groups'] });
      toast({
        title: "تم التسجيل بنجاح",
        description: "تم تسجيلك في المجموعة التدريبية",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في التسجيل",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // متغير لإلغاء التسجيل
  const cancelRegistrationMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const response = await fetch(`/api/training-assignments/group/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'فشل إلغاء التسجيل');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-assignments/student'] });
      queryClient.invalidateQueries({ queryKey: ['/api/courses-with-groups'] });
      toast({
        title: "تم إلغاء التسجيل بنجاح",
        description: "تم إلغاء تسجيلك من المجموعة التدريبية",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في إلغاء التسجيل",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // متغير للتحويل بين المجموعات
  const transferMutation = useMutation({
    mutationFn: async ({ fromGroupId, toGroupId }: { fromGroupId: number, toGroupId: number }) => {
      // أولاً إلغاء التسجيل من المجموعة الحالية
      const cancelResponse = await fetch(`/api/training-assignments/group/${fromGroupId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!cancelResponse.ok) {
        const error = await cancelResponse.json();
        throw new Error(error.message || 'فشل إلغاء التسجيل الحالي');
      }

      // ثم التسجيل في المجموعة الجديدة
      const registerResponse = await fetch('/api/training-assignments/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId: toGroupId }),
      });
      
      if (!registerResponse.ok) {
        const error = await registerResponse.json();
        throw new Error(error.message || 'فشل التسجيل في المجموعة الجديدة');
      }
      
      return registerResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-assignments/student'] });
      queryClient.invalidateQueries({ queryKey: ['/api/courses-with-groups'] });
      toast({
        title: "تم التحويل بنجاح",
        description: "تم تحويلك إلى المجموعة الجديدة",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في التحويل",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEnrollCourse = async (groupId: number) => {
    if (!studentData?.id) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/training-assignments/register", {
        groupId,
      });

      toast({
        title: "تم التسجيل بنجاح",
        description: "تم التسجيل في الدورة التدريبية بنجاح",
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments/student"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-course-groups/available", studentData?.facultyId, studentData?.majorId, studentData?.levelId] });
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
                        <button 
                          onClick={() => startTransition(() => setLocation(`/student/courses/${assignment.course.id}`))}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {assignment.course.name}
                        </button>
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
                        <Button 
                          size="sm" 
                          className="bg-primary text-white px-2 py-1 rounded-md text-xs"
                          onClick={() => startTransition(() => setLocation(`/student/courses/${assignment.course.id}`))}
                        >
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
                <Icon name="search" size={16} />
              </div>
              
              {/* <Select value={facultyFilter} onValueChange={setFacultyFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="كل الكليات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الكليات</SelectItem>
                  {faculties && Array.isArray(faculties) && faculties.map((faculty: any) => (
                    <SelectItem key={faculty.id} value={String(faculty.id)}>
                      {faculty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select> */}
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
            <div className="space-y-6">
              {filteredCourses.map((course: any) => (
                <EnhancedCourseCard
                  key={course.id}
                  course={course}
                  groups={course.groups}
                  myAssignments={myAssignments || []}
                  onRegister={(groupId: number) => registerMutation.mutate(groupId)}
                  onCancel={(groupId: number) => cancelRegistrationMutation.mutate(groupId)}
                  onTransfer={(fromGroupId: number, toGroupId: number) => 
                    transferMutation.mutate({ fromGroupId, toGroupId })
                  }
                  isRegistering={registerMutation.isPending || cancelRegistrationMutation.isPending || transferMutation.isPending}
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
