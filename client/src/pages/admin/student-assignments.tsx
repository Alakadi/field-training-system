import React, { useState } from "react";
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
import { Search, UserPlus, Users, BookOpen, AlertTriangle } from "lucide-react";
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
  groups: {
    id: number;
    groupName: string;
    capacity: number;
    currentStudents: number;
    site: {
      name: string;
    };
    supervisor: {
      user: {
        name: string;
      };
    };
  }[];
}

interface Assignment {
  id: number;
  student: {
    id: number;
    universityId: string;
    user: {
      name: string;
    };
  };
  group: {
    id: number;
    groupName: string;
    course: {
      name: string;
    };
  };
  status: string;
  assignedAt: string;
}

export default function AdminStudentAssignments() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('all');
  const [selectedMajor, setSelectedMajor] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      studentId: 0,
      groupId: 0,
    },
  });

  // Fetch data
  const { data: faculties } = useQuery({ queryKey: ["/api/faculties"] });
  const { data: majors } = useQuery({ queryKey: ["/api/majors"] });
  const { data: levels } = useQuery({ queryKey: ["/api/levels"] });
  const { data: students } = useQuery({ queryKey: ["/api/students"] });
  const { data: courses } = useQuery({ queryKey: ["/api/training-courses"] });
  const { data: assignments } = useQuery({ queryKey: ["/api/training-assignments"] });

  // Filter options
  const filteredMajors = selectedFaculty === 'all' 
    ? majors 
    : majors?.filter((major: any) => major.facultyId === parseInt(selectedFaculty));

  // Filter students
  const filteredStudents = students?.filter((student: Student) => {
    const matchesSearch = student.user.name.includes(searchQuery) || 
                         student.universityId.includes(searchQuery);
    const matchesFaculty = selectedFaculty === 'all' || 
                          student.faculty?.name === faculties?.find((f: any) => f.id === parseInt(selectedFaculty))?.name;
    const matchesMajor = selectedMajor === 'all' || 
                        student.major?.name === majors?.find((m: any) => m.id === parseInt(selectedMajor))?.name;
    const matchesLevel = selectedLevel === 'all' || 
                        student.level?.name === levels?.find((l: any) => l.id === parseInt(selectedLevel))?.name;
    
    return matchesSearch && matchesFaculty && matchesMajor && matchesLevel;
  }) || [];

  // Filter courses with groups
  const coursesWithGroups = courses?.filter((course: any) => {
    return course.groups && course.groups.length > 0;
  }).map((course: any) => ({
    ...course,
    groups: course.groups.map((group: any) => ({
      ...group,
      currentStudents: assignments?.filter((a: Assignment) => a.group.id === group.id).length || 0
    }))
  })) || [];

  // Check if student is already assigned to any group in the course
  const isStudentAssignedToCourse = (studentId: number, courseId: number) => {
    return assignments?.some((assignment: Assignment) => 
      assignment.student.id === studentId && 
      assignment.group.course.id === courseId
    ) || false;
  };

  // Get available students for assignment (not already in the course)
  const availableStudents = filteredStudents.filter((student: Student) => 
    !isStudentAssignedToCourse(student.id, selectedCourse?.id || 0)
  );

  // Assignment mutation
  const assignMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const res = await fetch("/api/training-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
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
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments"] });
      setIsAssignDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في التعيين",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAssign = (data: AssignmentFormData) => {
    assignMutation.mutate(data);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">تعيين الطلاب للكورسات</h1>
            <p className="text-gray-600">إدارة تعيين الطلاب للمجموعات التدريبية</p>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="البحث في الطلاب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الكلية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الكليات</SelectItem>
                {faculties?.map((faculty: any) => (
                  <SelectItem key={faculty.id} value={faculty.id.toString()}>
                    {faculty.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMajor} onValueChange={setSelectedMajor}>
              <SelectTrigger>
                <SelectValue placeholder="اختر التخصص" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التخصصات</SelectItem>
                {filteredMajors?.map((major: any) => (
                  <SelectItem key={major.id} value={major.id.toString()}>
                    {major.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المستوى" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المستويات</SelectItem>
                {levels?.map((level: any) => (
                  <SelectItem key={level.id} value={level.id.toString()}>
                    {level.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  تعيين طالب
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-right">تعيين طالب لمجموعة تدريبية</DialogTitle>
                  <DialogDescription className="text-right">
                    اختر الطالب والكورس والمجموعة المطلوبة
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleAssign)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="studentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-right">الطالب</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر الطالب" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableStudents.map((student: Student) => (
                                  <SelectItem key={student.id} value={student.id.toString()}>
                                    {student.user.name} - {student.universityId}
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
                            <FormLabel className="text-right">المجموعة</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر المجموعة" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {selectedCourse?.groups?.map((group: any) => (
                                  <SelectItem 
                                    key={group.id} 
                                    value={group.id.toString()}
                                    disabled={group.currentStudents >= group.capacity}
                                  >
                                    {group.groupName} - {group.site.name} 
                                    ({group.currentStudents}/{group.capacity})
                                    {group.currentStudents >= group.capacity && " - ممتلئة"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsAssignDialogOpen(false)}
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

          {/* Course Selection */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">اختر الكورس التدريبي</h2>
            <div className="grid gap-4">
              {coursesWithGroups.map((course: Course) => (
                <Card 
                  key={course.id} 
                  className={`cursor-pointer transition-all ${
                    selectedCourse?.id === course.id 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => {
                    setSelectedCourse(course);
                    form.setValue('groupId', 0);
                  }}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-right">{course.name}</CardTitle>
                        <CardDescription className="text-right">
                          {course.faculty.name} - {course.major.name}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {course.groups.length} مجموعات
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {course.groups.map((group: any) => (
                        <div key={group.id} className="border rounded-lg p-3">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-right">{group.groupName}</span>
                              <Badge 
                                variant={group.currentStudents >= group.capacity ? "destructive" : "outline"}
                              >
                                {group.currentStudents}/{group.capacity}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 text-right">
                              <div>موقع التدريب: {group.site.name}</div>
                              <div>المشرف: {group.supervisor.user.name}</div>
                            </div>
                            {group.currentStudents >= group.capacity && (
                              <div className="flex items-center gap-1 text-orange-600 text-xs">
                                <AlertTriangle className="h-3 w-3" />
                                المجموعة ممتلئة
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Current Assignments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">التعيينات الحالية</h2>
              <Badge variant="secondary">
                {assignments?.length || 0} تعيين
              </Badge>
            </div>
            
            <div className="grid gap-4">
              {assignments?.slice(0, 10).map((assignment: Assignment) => (
                <Card key={assignment.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="text-right">
                        <div className="font-medium">{assignment.student.user.name}</div>
                        <div className="text-sm text-gray-600">
                          {assignment.student.universityId} - {assignment.group.course.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          المجموعة: {assignment.group.groupName}
                        </div>
                      </div>
                      <div className="text-center">
                        <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'}>
                          {assignment.status === 'active' ? 'نشط' : assignment.status}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(assignment.assignedAt).toLocaleDateString('ar-SA')}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}