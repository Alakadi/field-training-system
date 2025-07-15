import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, UserPlus, Users, BookOpen, AlertTriangle, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const assignmentSchema = z.object({
  studentId: z.number().min(1, "يجب اختيار طالب"),
  groupId: z.number().min(1, "يجب اختيار مجموعة"),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

interface Student {
  id: number;
  universityId: string;
  user: {
    name: string;
  };
  faculty: {
    name: string;
  };
  major: {
    name: string;
  };
  level: {
    name: string;
  };
}

interface Course {
  id: number;
  name: string;
  faculty: {
    name: string;
  };
  major: {
    name: string;
  };
  level?: {
    name: string;
  };
}

interface Group {
  id: number;
  groupName: string;
  capacity: number;
  currentEnrollment: number;
  startDate: string;
  endDate: string;
  site: {
    name: string;
  };
  supervisor: {
    user: {
      name: string;
    };
  };
  course: Course;
  availableSpots: number;
}

const StudentGroupAssignments: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("");
  const [majorFilter, setMajorFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      studentId: 0,
      groupId: 0,
    },
  });

  // Fetch faculties
  const { data: faculties } = useQuery({
    queryKey: ["/api/faculties"]
  });

  // Fetch majors based on selected faculty
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

  // Fetch levels
  const { data: levels } = useQuery({
    queryKey: ["/api/levels"]
  });

  // Fetch filtered students
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["/api/students", facultyFilter, majorFilter, levelFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (facultyFilter) params.append("facultyId", facultyFilter);
      if (majorFilter) params.append("majorId", majorFilter);
      if (levelFilter) params.append("levelId", levelFilter);
      if (searchQuery) params.append("search", searchQuery);
      
      const res = await fetch(`/api/students?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
  });

  // Fetch course groups based on filters
  const { data: courseGroups, isLoading: isLoadingGroups } = useQuery({
    queryKey: ["/api/training-course-groups", facultyFilter, majorFilter, levelFilter],
    queryFn: async () => {
      if (!facultyFilter || !majorFilter || !levelFilter) return [];
      
      const params = new URLSearchParams({
        facultyId: facultyFilter,
        majorId: majorFilter,
        levelId: levelFilter,
        available: "true"
      });
      
      const res = await fetch(`/api/training-course-groups?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch course groups");
      return res.json();
    },
    enabled: !!facultyFilter && !!majorFilter && !!levelFilter,
  });

  // Get unique courses from groups
  const uniqueCourses = React.useMemo(() => {
    if (!courseGroups) return [];
    const courseMap = new Map();
    courseGroups.forEach((group: Group) => {
      if (!courseMap.has(group.course.id)) {
        courseMap.set(group.course.id, {
          id: group.course.id,
          name: group.course.name,
          faculty: group.course.faculty,
          major: group.course.major,
          level: group.course.level
        });
      }
    });
    return Array.from(courseMap.values());
  }, [courseGroups]);

  // Get groups for selected course
  const availableGroups = React.useMemo(() => {
    if (!courseGroups || !selectedCourse) return [];
    return courseGroups.filter((group: Group) => 
      group.course.id === parseInt(selectedCourse) && group.availableSpots > 0
    );
  }, [courseGroups, selectedCourse]);

  // Assignment mutation
  const assignMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const res = await fetch("/api/training-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          studentId: data.studentId,
          groupId: data.groupId,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "فشل في تعيين الطالب");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم التعيين بنجاح",
        description: "تم تعيين الطالب للمجموعة بنجاح",
      });
      setIsDialogOpen(false);
      form.reset();
      setSelectedCourse("");
      setSelectedGroup("");
      queryClient.invalidateQueries({ queryKey: ["/api/training-course-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في التعيين",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AssignmentFormData) => {
    assignMutation.mutate(data);
  };

  // Reset dependent filters when parent filter changes
  useEffect(() => {
    setMajorFilter("");
    setLevelFilter("");
    setSelectedCourse("");
    setSelectedGroup("");
  }, [facultyFilter]);

  useEffect(() => {
    setLevelFilter("");
    setSelectedCourse("");
    setSelectedGroup("");
  }, [majorFilter]);

  useEffect(() => {
    setSelectedCourse("");
    setSelectedGroup("");
  }, [levelFilter]);

  useEffect(() => {
    setSelectedGroup("");
    form.setValue("groupId", 0);
  }, [selectedCourse]);

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">تعيين الطلاب للمجموعات التدريبية</h1>
            <p className="text-muted-foreground mt-2">
              إدارة تعيين الطلاب للمجموعات التدريبية حسب التخصص والمستوى
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 ml-2" />
                تعيين طالب جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>تعيين طالب لمجموعة تدريبية</DialogTitle>
                <DialogDescription>
                  اختر الطالب والمجموعة التدريبية المناسبة له
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الطالب</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الطالب" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {students?.map((student: Student) => (
                              <SelectItem key={student.id} value={student.id.toString()}>
                                {student.user.name} - {student.universityId}
                                <span className="text-sm text-muted-foreground mr-2">
                                  ({student.faculty.name} - {student.major.name} - {student.level.name})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="groupId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المجموعة التدريبية</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString() || ""}
                          disabled={!selectedCourse}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر المجموعة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableGroups?.map((group: Group) => (
                              <SelectItem key={group.id} value={group.id.toString()}>
                                <div className="flex flex-col">
                                  <span>{group.groupName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {group.site.name} - المشرف: {group.supervisor.user.name}
                                  </span>
                                  <span className="text-xs text-green-600">
                                    متاح: {group.availableSpots} من {group.capacity} مقعد
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 space-x-reverse">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      إلغاء
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={assignMutation.isPending}
                    >
                      {assignMutation.isPending ? "جاري التعيين..." : "تعيين الطالب"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">البحث والفلترة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">البحث</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="ابحث بالاسم أو الرقم الجامعي..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">الكلية</label>
                <Select value={facultyFilter} onValueChange={setFacultyFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الكلية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">جميع الكليات</SelectItem>
                    {faculties?.map((faculty: any) => (
                      <SelectItem key={faculty.id} value={faculty.id.toString()}>
                        {faculty.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">التخصص</label>
                <Select value={majorFilter} onValueChange={setMajorFilter} disabled={!facultyFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التخصص" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">جميع التخصصات</SelectItem>
                    {majors?.map((major: any) => (
                      <SelectItem key={major.id} value={major.id.toString()}>
                        {major.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">المستوى الدراسي</label>
                <Select value={levelFilter} onValueChange={setLevelFilter} disabled={!majorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المستوى" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">جميع المستويات</SelectItem>
                    {levels?.map((level: any) => (
                      <SelectItem key={level.id} value={level.id.toString()}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Course Selection */}
            {facultyFilter && majorFilter && levelFilter && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">الدورة التدريبية</label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الدورة التدريبية" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueCourses?.map((course: any) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        <div className="flex flex-col">
                          <span>{course.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {course.faculty.name} - {course.major.name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Course Groups Display */}
        {selectedCourse && availableGroups && availableGroups.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>المجموعات المتاحة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableGroups.map((group: Group) => (
                  <Card 
                    key={group.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedGroup === group.id.toString() ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => {
                      setSelectedGroup(group.id.toString());
                      form.setValue("groupId", group.id);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{group.groupName}</h3>
                        <Badge variant={group.availableSpots > 0 ? "default" : "secondary"}>
                          {group.availableSpots > 0 ? "متاح" : "مكتمل"}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p><span className="font-medium">الموقع:</span> {group.site.name}</p>
                        <p><span className="font-medium">المشرف:</span> {group.supervisor.user.name}</p>
                        <p><span className="font-medium">السعة:</span> {group.currentEnrollment}/{group.capacity}</p>
                        <p><span className="font-medium">المقاعد المتاحة:</span> {group.availableSpots}</p>
                        <p><span className="font-medium">تاريخ البدء:</span> {new Date(group.startDate).toLocaleDateString('en-US')}</p>
                        <p><span className="font-medium">تاريخ الانتهاء:</span> {new Date(group.endDate).toLocaleDateString('en-US')}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Students List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              الطلاب المتاحون للتعيين
              <Badge variant="secondary">{students?.length || 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStudents ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">جاري تحميل الطلاب...</p>
              </div>
            ) : !students || students.length === 0 ? (
              <div className="text-center py-8">
                <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {!facultyFilter || !majorFilter || !levelFilter 
                    ? "يرجى اختيار الكلية والتخصص والمستوى الدراسي لعرض الطلاب"
                    : "لا يوجد طلاب متاحون للتعيين في هذا التخصص والمستوى"
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((student: Student) => (
                  <Card key={student.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{student.user.name}</h3>
                          <p className="text-sm text-muted-foreground">{student.universityId}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            form.setValue("studentId", student.id);
                            setIsDialogOpen(true);
                          }}
                          disabled={!selectedGroup}
                        >
                          تعيين
                        </Button>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">الكلية:</span> {student.faculty.name}</p>
                        <p><span className="font-medium">التخصص:</span> {student.major.name}</p>
                        <p><span className="font-medium">المستوى:</span> {student.level.name}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default StudentGroupAssignments;