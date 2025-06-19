import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, UserPlus, Calendar, MapPin, Users, GraduationCap } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface Student {
  id: number;
  universityId: string;
  user: {
    name: string;
  };
  faculty?: {
    id: number;
    name: string;
  };
  major?: {
    id: number;
    name: string;
  };
  level?: {
    id: number;
    name: string;
  };
  assignments?: Array<{
    id: number;
    status: string;
    group: {
      id: number;
      course: {
        name: string;
      };
      site: {
        name: string;
      };
      startDate: string;
      endDate: string;
    };
  }>;
}

interface CourseGroup {
  id: number;
  capacity: number;
  startDate: string;
  endDate: string;
  course: {
    id: number;
    name: string;
    facultyId?: number;
    majorId?: number;
    levelId?: number;
  };
  site: {
    name: string;
  };
  supervisor: {
    user: {
      name: string;
    };
  };
  _count: {
    assignments: number;
  };
}

const StudentCourseAssignments: React.FC = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState<string>("");
  const [selectedMajor, setSelectedMajor] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);

  // Fetch students with their assignments
  const { data: students = [], isLoading: isLoadingStudents, refetch: refetchStudents } = useQuery({
    queryKey: ["/api/students"],
    queryFn: async () => {
      const response = await fetch("/api/students", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch students");
      return response.json();
    },
  });

  // Fetch faculties
  const { data: faculties = [] } = useQuery({
    queryKey: ["/api/faculties"],
  });

  // Fetch majors based on selected faculty
  const { data: majors = [] } = useQuery({
    queryKey: ["/api/majors", selectedFaculty],
    queryFn: () => fetch(`/api/majors?facultyId=${selectedFaculty}`).then(res => res.json()),
    enabled: !!selectedFaculty && selectedFaculty !== "all",
  });

  // Fetch levels
  const { data: levels = [] } = useQuery({
    queryKey: ["/api/levels"],
  });

  // Fetch available course groups for assignment
  const { data: availableCourseGroups = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ["/api/training-course-groups", "available", selectedStudent?.id],
    queryFn: async () => {
      if (!selectedStudent) return [];
      
      const params = new URLSearchParams({
        availableOnly: 'true',
      });
      
      if (selectedStudent.faculty?.id) {
        params.append('facultyId', selectedStudent.faculty.id.toString());
      }
      if (selectedStudent.major?.id) {
        params.append('majorId', selectedStudent.major.id.toString());
      }
      if (selectedStudent.level?.id) {
        params.append('levelId', selectedStudent.level.id.toString());
      }
      
      const response = await fetch(`/api/training-course-groups?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to fetch available courses");
      return response.json();
    },
    enabled: !!selectedStudent && assignmentDialogOpen,
  });

  // Assignment mutation
  const assignStudentMutation = useMutation({
    mutationFn: async ({ studentId, groupId }: { studentId: number; groupId: number }) => {
      const response = await fetch("/api/training-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          studentId,
          groupId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to assign student to course");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم بنجاح",
        description: "تم تعيين الطالب للدورة التدريبية",
      });
      setAssignmentDialogOpen(false);
      setSelectedStudent(null);
      refetchStudents();
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments"] });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تعيين الطالب للدورة",
        variant: "destructive",
      });
    },
  });

  // Filter students based on search and filters
  const filteredStudents = students.filter((student: Student) => {
    const matchesSearch = 
      student.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.universityId.includes(searchTerm);
    
    const matchesFaculty = !selectedFaculty || selectedFaculty === "all" || 
      student.faculty?.id?.toString() === selectedFaculty;
    
    const matchesMajor = !selectedMajor || selectedMajor === "all" || 
      student.major?.id?.toString() === selectedMajor;
    
    const matchesLevel = !selectedLevel || selectedLevel === "all" || 
      student.level?.id?.toString() === selectedLevel;

    return matchesSearch && matchesFaculty && matchesMajor && matchesLevel;
  });

  const handleAssignToCourse = (groupId: number) => {
    if (selectedStudent) {
      assignStudentMutation.mutate({
        studentId: selectedStudent.id,
        groupId,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "في الانتظار", variant: "secondary" as const },
      confirmed: { label: "مؤكد", variant: "default" as const },
      active: { label: "نشط", variant: "default" as const },
      completed: { label: "مكتمل", variant: "outline" as const },
      cancelled: { label: "ملغي", variant: "destructive" as const },
    };
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            تعيين الطلاب للكورسات التدريبية
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="البحث بالاسم أو الرقم الجامعي..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
              <SelectTrigger>
                <SelectValue placeholder="جميع الكليات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الكليات</SelectItem>
                {(faculties as any[])?.map((faculty: any) => (
                  <SelectItem key={faculty.id} value={faculty.id.toString()}>
                    {faculty.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMajor} onValueChange={setSelectedMajor}>
              <SelectTrigger>
                <SelectValue placeholder="جميع التخصصات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التخصصات</SelectItem>
                {majors.map((major: any) => (
                  <SelectItem key={major.id} value={major.id.toString()}>
                    {major.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger>
                <SelectValue placeholder="جميع المستويات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المستويات</SelectItem>
                {(levels as any[])?.map((level: any) => (
                  <SelectItem key={level.id} value={level.id.toString()}>
                    {level.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="text-sm text-gray-600 flex items-center">
              إجمالي: {filteredStudents.length} طالب
            </div>
          </div>

          {/* Students Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>الرقم الجامعي</TableHead>
                  <TableHead>الكلية</TableHead>
                  <TableHead>التخصص</TableHead>
                  <TableHead>المستوى</TableHead>
                  <TableHead>الكورس الحالي</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingStudents ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </TableCell>
                      <TableCell className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </TableCell>
                      <TableCell className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </TableCell>
                      <TableCell className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </TableCell>
                      <TableCell className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </TableCell>
                      <TableCell className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </TableCell>
                      <TableCell className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <GraduationCap className="h-8 w-8 text-gray-400" />
                        <p className="text-gray-500">لا توجد نتائج</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student: Student) => {
                    const currentAssignment = student.assignments?.find(a => 
                      a.status === 'confirmed' || a.status === 'active'
                    );

                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.user.name}</TableCell>
                        <TableCell>{student.universityId}</TableCell>
                        <TableCell>{student.faculty?.name || "غير محدد"}</TableCell>
                        <TableCell>{student.major?.name || "غير محدد"}</TableCell>
                        <TableCell>{student.level?.name || "غير محدد"}</TableCell>
                        <TableCell>
                          {currentAssignment ? (
                            <div className="space-y-1">
                              <div className="font-medium text-sm">
                                {currentAssignment.group.course.name}
                              </div>
                              <Badge variant={getStatusBadge(currentAssignment.status).variant}>
                                {getStatusBadge(currentAssignment.status).label}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-gray-500">غير معين</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Dialog 
                            open={assignmentDialogOpen && selectedStudent?.id === student.id} 
                            onOpenChange={(open) => {
                              setAssignmentDialogOpen(open);
                              if (!open) setSelectedStudent(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedStudent(student)}
                              >
                                تعيين كورس
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>تعيين كورس تدريبي - {student.user.name}</DialogTitle>
                              </DialogHeader>

                              <div className="space-y-4">
                                {/* Student Info */}
                                <Card>
                                  <CardContent className="p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <span className="font-medium">الرقم الجامعي:</span>
                                        <p>{student.universityId}</p>
                                      </div>
                                      <div>
                                        <span className="font-medium">الكلية:</span>
                                        <p>{student.faculty?.name || "غير محدد"}</p>
                                      </div>
                                      <div>
                                        <span className="font-medium">التخصص:</span>
                                        <p>{student.major?.name || "غير محدد"}</p>
                                      </div>
                                      <div>
                                        <span className="font-medium">المستوى:</span>
                                        <p>{student.level?.name || "غير محدد"}</p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Available Courses */}
                                <div>
                                  <h3 className="text-lg font-semibold mb-4">الكورسات المتاحة</h3>
                                  
                                  {isLoadingCourses ? (
                                    <div className="space-y-4">
                                      {Array.from({ length: 3 }).map((_, i) => (
                                        <Card key={i} className="animate-pulse">
                                          <CardContent className="p-4">
                                            <div className="space-y-2">
                                              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  ) : availableCourseGroups.length === 0 ? (
                                    <Card>
                                      <CardContent className="p-8 text-center">
                                        <p className="text-gray-500">
                                          لا توجد كورسات متاحة لهذا الطالب حالياً.
                                          تأكد من أن هناك كورسات مناسبة لكلية وتخصص ومستوى الطالب.
                                        </p>
                                      </CardContent>
                                    </Card>
                                  ) : (
                                    <div className="space-y-4">
                                      {availableCourseGroups.map((group: CourseGroup) => {
                                        const availableSpots = group.capacity - group._count.assignments;
                                        
                                        return (
                                          <Card key={group.id} className="hover:bg-gray-50">
                                            <CardContent className="p-4">
                                              <div className="flex items-start justify-between">
                                                <div className="space-y-2 flex-1">
                                                  <h4 className="font-semibold text-lg">{group.course.name}</h4>
                                                  
                                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                      <MapPin className="h-4 w-4" />
                                                      <span>{group.site.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                      <Users className="h-4 w-4" />
                                                      <span>{availableSpots} مقاعد متاحة من {group.capacity}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                      <GraduationCap className="h-4 w-4" />
                                                      <span>{group.supervisor.user.name}</span>
                                                    </div>
                                                  </div>

                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                    <div className="flex items-center gap-2">
                                                      <Calendar className="h-4 w-4 text-green-600" />
                                                      <span>البداية: {new Date(group.startDate).toLocaleDateString('ar-SA')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                      <Calendar className="h-4 w-4 text-red-600" />
                                                      <span>النهاية: {new Date(group.endDate).toLocaleDateString('ar-SA')}</span>
                                                    </div>
                                                  </div>
                                                </div>

                                                <div className="mr-4">
                                                  <Button
                                                    onClick={() => handleAssignToCourse(group.id)}
                                                    disabled={availableSpots <= 0 || assignStudentMutation.isPending}
                                                    size="sm"
                                                  >
                                                    {assignStudentMutation.isPending ? "جاري التعيين..." : "تعيين"}
                                                  </Button>
                                                </div>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentCourseAssignments;