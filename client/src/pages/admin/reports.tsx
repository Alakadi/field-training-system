import React, { useState } from "react";
import AdminLayout from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Search, Eye, Users, BookOpen, Trophy } from "lucide-react";

interface StudentReport {
  id: number;
  name: string;
  universityId: string;
  faculty: string;
  major: string;
  level: string;
  courses: {
    id: number;
    name: string;
    grade: number;
    groupName: string;
    site: string;
    supervisor: string;
  }[];
}

interface CourseReport {
  id: number;
  name: string;
  faculty: string;
  major: string;
  level: string;
  status: string;
  groups: {
    id: number;
    name: string;
    site: string;
    supervisor: string;
    studentsCount: number;
    averageGrade: number;
    completedEvaluations: number;
  }[];
}

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState<'students' | 'courses'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentReport | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CourseReport | null>(null);

  // Fetch students with evaluations
  const { data: studentsReport, isLoading: loadingStudents } = useQuery({
    queryKey: ["/api/reports/students"],
    queryFn: async () => {
      const res = await fetch("/api/reports/students", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch students report");
      return res.json();
    },
  });

  // Fetch completed courses with evaluations
  const { data: coursesReport, isLoading: loadingCourses } = useQuery({
    queryKey: ["/api/reports/courses"],
    queryFn: async () => {
      const res = await fetch("/api/reports/courses", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch courses report");
      return res.json();
    },
  });

  const filteredStudents = studentsReport?.filter((student: StudentReport) =>
    student.name.includes(searchQuery) || 
    student.universityId.includes(searchQuery) ||
    student.faculty.includes(searchQuery) ||
    student.major.includes(searchQuery)
  ) || [];

  const filteredCourses = coursesReport?.filter((course: CourseReport) =>
    course.name.includes(searchQuery) ||
    course.faculty.includes(searchQuery) ||
    course.major.includes(searchQuery)
  ) || [];

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">التقارير الشاملة</h1>
            <p className="text-gray-600">تقارير مفصلة حول الطلاب والدورات التدريبية</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-4 space-x-reverse border-b">
            <Button
              variant={activeTab === 'students' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('students')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              تقرير الطلاب
            </Button>
            <Button
              variant={activeTab === 'courses' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('courses')}
              className="flex items-center gap-2"
            >
              <BookOpen className="h-4 w-4" />
              تقرير الدورات
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder={activeTab === 'students' ? "البحث في الطلاب..." : "البحث في الدورات..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Students Report */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">الطلاب المقيّمون</h2>
                <Badge variant="secondary">
                  {filteredStudents.length} طالب
                </Badge>
              </div>

              {loadingStudents ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : (
                <div className="grid gap-4">
                  {filteredStudents.map((student: StudentReport) => (
                    <Card key={student.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-right">{student.name}</CardTitle>
                            <CardDescription className="text-right">
                              {student.universityId} - {student.faculty} - {student.major}
                            </CardDescription>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setSelectedStudent(student)}>
                                <Eye className="h-4 w-4 ml-2" />
                                عرض التفاصيل
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="text-right">تفاصيل الطالب: {student.name}</DialogTitle>
                                <DialogDescription className="text-right">
                                  الرقم الجامعي: {student.universityId}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-right">
                                  <div>
                                    <strong>الكلية:</strong> {student.faculty}
                                  </div>
                                  <div>
                                    <strong>التخصص:</strong> {student.major}
                                  </div>
                                  <div>
                                    <strong>المستوى:</strong> {student.level}
                                  </div>
                                  <div>
                                    <strong>عدد الدورات:</strong> {student.courses.length}
                                  </div>
                                </div>
                                
                                <div>
                                  <h3 className="font-semibold mb-3 text-right">الدورات والدرجات:</h3>
                                  <div className="space-y-3">
                                    {student.courses.map((course) => (
                                      <div key={course.id} className="border rounded-lg p-4">
                                        <div className="flex justify-between items-center">
                                          <div className="text-right">
                                            <div className="font-medium">{course.name}</div>
                                            <div className="text-sm text-gray-600">
                                              {course.groupName} - {course.site}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                              المشرف: {course.supervisor}
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <Badge variant={course.grade >= 75 ? "default" : course.grade >= 60 ? "secondary" : "destructive"}>
                                              {course.grade}/100
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-sm text-gray-600 text-right">
                            الدورات المكتملة: {student.courses.length}
                          </div>
                          <div className="flex flex-wrap gap-2 justify-end">
                            {student.courses.slice(0, 3).map((course) => (
                              <Badge key={course.id} variant="outline" className="text-xs">
                                {course.name}: {course.grade}/100
                              </Badge>
                            ))}
                            {student.courses.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{student.courses.length - 3} أخرى
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Courses Report */}
          {activeTab === 'courses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">الدورات المكتملة</h2>
                <Badge variant="secondary">
                  {filteredCourses.length} دورة
                </Badge>
              </div>

              {loadingCourses ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : (
                <div className="grid gap-4">
                  {filteredCourses.map((course: CourseReport) => (
                    <Card key={course.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-right">{course.name}</CardTitle>
                            <CardDescription className="text-right">
                              {course.faculty} - {course.major} - {course.level}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={course.status === 'completed' ? 'default' : 'secondary'}>
                              {course.status === 'completed' ? 'مكتملة' : course.status}
                            </Badge>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => setSelectedCourse(course)}>
                                  <Eye className="h-4 w-4 ml-2" />
                                  عرض التفاصيل
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle className="text-right">تفاصيل الدورة: {course.name}</DialogTitle>
                                  <DialogDescription className="text-right">
                                    {course.faculty} - {course.major}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-3 gap-4 text-right">
                                    <div>
                                      <strong>المجموعات:</strong> {course.groups.length}
                                    </div>
                                    <div>
                                      <strong>إجمالي الطلاب:</strong> {course.groups.reduce((sum, group) => sum + group.studentsCount, 0)}
                                    </div>
                                    <div>
                                      <strong>التقييمات المكتملة:</strong> {course.groups.reduce((sum, group) => sum + group.completedEvaluations, 0)}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h3 className="font-semibold mb-3 text-right">مجموعات الدورة:</h3>
                                    <div className="space-y-3">
                                      {course.groups.map((group) => (
                                        <div key={group.id} className="border rounded-lg p-4">
                                          <div className="grid grid-cols-2 gap-4 text-right">
                                            <div>
                                              <div className="font-medium">{group.name}</div>
                                              <div className="text-sm text-gray-600">موقع التدريب: {group.site}</div>
                                              <div className="text-sm text-gray-600">المشرف: {group.supervisor}</div>
                                            </div>
                                            <div className="space-y-1">
                                              <div className="flex justify-between">
                                                <span>عدد الطلاب:</span>
                                                <Badge variant="outline">{group.studentsCount}</Badge>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>التقييمات المكتملة:</span>
                                                <Badge variant="outline">{group.completedEvaluations}</Badge>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>متوسط الدرجات:</span>
                                                <Badge variant={group.averageGrade >= 75 ? "default" : group.averageGrade >= 60 ? "secondary" : "destructive"}>
                                                  {group.averageGrade.toFixed(1)}/100
                                                </Badge>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-blue-600">
                              {course.groups.length}
                            </div>
                            <div className="text-sm text-gray-600">مجموعات</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              {course.groups.reduce((sum, group) => sum + group.studentsCount, 0)}
                            </div>
                            <div className="text-sm text-gray-600">طلاب</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-600">
                              {(course.groups.reduce((sum, group) => sum + group.averageGrade, 0) / course.groups.length).toFixed(1)}
                            </div>
                            <div className="text-sm text-gray-600">متوسط عام</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}