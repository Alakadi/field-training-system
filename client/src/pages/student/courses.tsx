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
import CourseCard from "@/components/student/course-card";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

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

  // Fetch available course groups for enrollment based on student's profile
  const { data: availableCourseGroups, isLoading: isLoadingCourses } = useQuery({
    queryKey: ["/api/training-course-groups/available", studentData?.facultyId, studentData?.majorId, studentData?.levelId],
    queryFn: async () => {
      if (!studentData?.facultyId || !studentData?.majorId || !studentData?.levelId) return [];
      
      const params = new URLSearchParams({
        facultyId: studentData.facultyId.toString(),
        majorId: studentData.majorId.toString(),
        levelId: studentData.levelId.toString(),
        available: "true"
      });
      
      const res = await fetch(`/api/training-course-groups?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch available course groups");
      return res.json();
    },
    enabled: !!studentData?.facultyId && !!studentData?.majorId && !!studentData?.levelId,
  });

  // Filter available course groups
  const filteredCourseGroups = availableCourseGroups?.filter((group: any) => {
    // First, exclude groups student is already enrolled in
    const alreadyEnrolled = myAssignments?.some((a: any) => a.groupId === group.id);
    if (alreadyEnrolled) return false;
    
    let matches = true;
    
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matches = group.course.name.toLowerCase().includes(query) || 
                group.site.name.toLowerCase().includes(query);
    }
    
    // Faculty filter
    if (facultyFilter && matches) {
      matches = group.course.facultyId === parseInt(facultyFilter);
    }
    
    return matches;
  }) || [];

  // التحقق من حالة التسجيل
  const isRegisteredInGroup = (groupId: number) => {
    return myAssignments?.some(assignment => assignment.groupId === groupId);
  };

  // التحقق من التسجيل في نفس الكورس
  const isRegisteredInCourse = (courseId: number) => {
    return myAssignments?.some(assignment => assignment.group?.courseId === courseId);
  };

  // الحصول على المجموعة المسجل فيها في نفس الكورس
  const getRegisteredGroupInCourse = (courseId: number) => {
    return myAssignments?.find(assignment => assignment.group?.courseId === courseId);
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
      queryClient.invalidateQueries({ queryKey: ['/api/training-course-groups/available'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/training-course-groups/available'] });
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
                <span className="material-icons absolute right-3 top-2 text-neutral-500">search</span>
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
          ) : filteredCourseGroups.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-lg shadow">
              لا توجد دورات متاحة للتسجيل حالياً
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourseGroups.map((group: any) => (
                <div key={group.id} className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-2">{group.course.name}</h3>
                  <p className="text-gray-600 mb-3">{group.course.description}</p>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">المجموعة:</span> {group.groupName}</p>
                    <p><span className="font-medium">جهة التدريب:</span> {group.site.name}</p>
                    <p><span className="font-medium">المشرف:</span> {group.supervisor.user.name}</p>
                    <p><span className="font-medium">الأماكن المتاحة:</span> {group.availableSpots} من {group.capacity}</p>
                    <p><span className="font-medium">تاريخ البدء:</span> {new Date(group.startDate).toLocaleDateString('ar-SA')}</p>
                    <p><span className="font-medium">تاريخ الانتهاء:</span> {new Date(group.endDate).toLocaleDateString('ar-SA')}</p>
                  </div>
                  <div className="mt-4">
                    {isRegisteredInGroup(group.id) ? (
                      <div className="flex gap-2">
                        <Badge className="bg-green-100 text-green-800 flex-1 justify-center py-2">
                          مسجل
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelRegistrationMutation.mutate(group.id)}
                          disabled={cancelRegistrationMutation.isPending}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          {cancelRegistrationMutation.isPending ? "جاري الإلغاء..." : "إلغاء التسجيل"}
                        </Button>
                      </div>
                    ) : group.course.status === 'completed' ? (
                      <Button disabled className="w-full">
                        دورة منتهية
                      </Button>
                    ) : group.availableSpots > 0 ? (
                      !isRegisteredInCourse(group.course.id) ? (
                        <Button
                          onClick={() => registerMutation.mutate(group.id)}
                          disabled={registerMutation.isPending}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          {registerMutation.isPending ? "جاري التسجيل..." : "تسجيل"}
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <Badge variant="outline" className="w-full justify-center py-2 text-orange-600 border-orange-600">
                            مسجل في مجموعة أخرى
                          </Badge>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const registeredGroup = getRegisteredGroupInCourse(group.course.id);
                                if (registeredGroup) {
                                  cancelRegistrationMutation.mutate(registeredGroup.groupId);
                                }
                              }}
                              disabled={cancelRegistrationMutation.isPending}
                              className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                            >
                              {cancelRegistrationMutation.isPending ? "جاري الإلغاء..." : "إلغاء الحالي"}
                            </Button>
                            <Button
                              onClick={() => {
                                const registeredGroup = getRegisteredGroupInCourse(group.course.id);
                                if (registeredGroup) {
                                  // إلغاء التسجيل الحالي أولاً ثم التسجيل في المجموعة الجديدة
                                  cancelRegistrationMutation.mutate(registeredGroup.groupId, {
                                    onSuccess: () => {
                                      // تسجيل في المجموعة الجديدة بعد إلغاء التسجيل الحالي
                                      setTimeout(() => {
                                        registerMutation.mutate(group.id);
                                      }, 500);
                                    }
                                  });
                                }
                              }}
                              disabled={registerMutation.isPending || cancelRegistrationMutation.isPending}
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                              size="sm"
                            >
                              {registerMutation.isPending || cancelRegistrationMutation.isPending ? "جاري التحويل..." : "تحويل"}
                            </Button>
                          </div>
                        </div>
                      )
                    ) : (
                      <Badge variant="outline" className="w-full justify-center py-2 text-red-600 border-red-600">
                        مكتملة
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentCourses;
