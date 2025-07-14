import React, { useState } from "react";
import AdminLayout from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Search, Eye, Users, BookOpen, Trophy } from "lucide-react";
import { ExportDialog } from "@/components/ExportDialog";

interface StudentReport {
  id: number;
  name: string;
  universityId: string;
  faculty: string;
  major: string;
  level: string;
  courseId: number;
  courseName: string;
  grade: number | null;
  calculatedFinal: number | null;
  groupName: string;
  site: string;
  supervisor: string;
  attendanceGrade?: number | null;
  behaviorGrade?: number | null;
  finalExamGrade?: number | null;
  hasDetailedGrades: boolean;
  hasEvaluations: boolean;
  academicYear: string;
  assignmentId: number;
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
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Fetch academic years
  const { data: academicYears } = useQuery({
    queryKey: ["/api/academic-years"],
    queryFn: async () => {
      const res = await fetch("/api/academic-years", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch academic years");
      return res.json();
    },
  });

  // Fetch students with evaluations
  const { data: studentsReport, isLoading: loadingStudents } = useQuery({
    queryKey: ["/api/reports/students", selectedAcademicYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAcademicYear && selectedAcademicYear !== 'all') {
        params.append('academicYearId', selectedAcademicYear);
      }
      const res = await fetch(`/api/reports/students${params.toString() ? '?' + params.toString() : ''}`, { 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to fetch students report");
      return res.json();
    },
  });

  // Fetch completed courses with evaluations
  const { data: coursesReport, isLoading: loadingCourses } = useQuery({
    queryKey: ["/api/reports/courses", selectedAcademicYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAcademicYear && selectedAcademicYear !== 'all') {
        params.append('academicYearId', selectedAcademicYear);
      }
      const res = await fetch(`/api/reports/courses${params.toString() ? '?' + params.toString() : ''}`, { 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to fetch courses report");
      return res.json();
    },
  });

  const filteredStudents = studentsReport?.filter((student: StudentReport) =>
    student.name.includes(searchQuery) || 
    student.universityId.includes(searchQuery) ||
    student.faculty.includes(searchQuery) ||
    student.major.includes(searchQuery) ||
    student.courseName.includes(searchQuery)
  ) || [];

  const filteredCourses = coursesReport?.filter((course: CourseReport) =>
    course.name.includes(searchQuery) ||
    course.faculty.includes(searchQuery) ||
    course.major.includes(searchQuery)
  ) || [];

  // Prepare export data for students - each record is already a student-course combination
  const exportStudentsData = filteredStudents.map((student: StudentReport) => ({
    universityId: student.universityId,
    studentName: student.name,
    courseId: student.courseId,
    courseName: student.courseName,
    grade: student.calculatedFinal || student.grade || 0,
    academicYear: student.academicYear,
    faculty: student.faculty,
    major: student.major,
    level: student.level,
    site: student.site,
    supervisor: student.supervisor,
    attendanceGrade: student.attendanceGrade || 0,
    behaviorGrade: student.behaviorGrade || 0,
    finalExamGrade: student.finalExamGrade || 0,
  }));

  // Define export columns
  const exportColumns = [
    { key: 'universityId', title: 'الرقم الجامعي', width: 15 },
    { key: 'studentName', title: 'اسم الطالب', width: 20 },
    { key: 'courseId', title: 'رقم الكورس', width: 12 },
    { key: 'courseName', title: 'اسم الكورس', width: 25 },
    { key: 'grade', title: 'الدرجة النهائية', width: 15, formatter: (value: any) => `${value}/100` },
    { key: 'academicYear', title: 'السنة الدراسية', width: 18 },
    { key: 'faculty', title: 'الكلية', width: 20 },
    { key: 'major', title: 'التخصص', width: 20 },
    { key: 'level', title: 'المستوى', width: 15 },
    { key: 'site', title: 'موقع التدريب', width: 20 },
    { key: 'supervisor', title: 'المشرف', width: 20 },
    { key: 'attendanceGrade', title: 'درجة الحضور', width: 15, formatter: (value: any) => `${value}/20` },
    { key: 'behaviorGrade', title: 'درجة السلوك', width: 15, formatter: (value: any) => `${value}/30` },
    { key: 'finalExamGrade', title: 'درجة الاختبار', width: 15, formatter: (value: any) => `${value}/50` },
  ];

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

          {/* Filters and Search */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Academic Year Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">السنة الدراسية</label>
              <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر السنة الدراسية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع السنوات</SelectItem>
                  {academicYears?.map((year: any) => (
                    <SelectItem key={year.id} value={year.id.toString()}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Bar */}
            <div className="space-y-2">
              <label className="text-sm font-medium">البحث</label>
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={activeTab === 'students' ? "البحث في الطلاب..." : "البحث في الدورات..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            {/* Export Button */}
            <div className="space-y-2">
              <label className="text-sm font-medium">تصدير البيانات</label>
              <ExportDialog
                data={exportStudentsData}
                columns={exportColumns}
                defaultFilename={`تقرير_${activeTab === 'students' ? 'الطلاب' : 'الدورات'}_${new Date().toISOString().split('T')[0]}`}
                title={`تصدير تقرير ${activeTab === 'students' ? 'الطلاب' : 'الدورات'}`}
              />
            </div>
          </div>

          {/* Students Report */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">سجلات الطلاب والدورات</h2>
                <Badge variant="secondary">
                  {filteredStudents.length} سجل
                </Badge>
              </div>

              {loadingStudents ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : (
                <div className="grid gap-4">
                  {filteredStudents.map((student: StudentReport) => (
                    <Card key={`${student.id}-${student.courseId}`} className="hover:shadow-md transition-shadow">
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
                                    <strong>السنة الدراسية:</strong> {student.academicYear}
                                  </div>
                                </div>

                                <div>
                                  <h3 className="font-semibold mb-3 text-right">تفاصيل الدورة:</h3>
                                  <div className="border rounded-lg p-4">
                                    <div className="flex justify-between items-start">
                                      <div className="text-right flex-1">
                                        <div className="font-medium">{student.courseName}</div>
                                        <div className="text-sm text-gray-600">
                                          {student.groupName} - {student.site}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          المشرف: {student.supervisor}
                                        </div>
                                      </div>
                                      <div className="text-center space-y-2">
                                        {student.calculatedFinal !== null ? (
                                          <div>
                                            <div className="text-xs text-gray-500 mb-1">الدرجة النهائية المحسوبة</div>
                                            <Badge variant={student.calculatedFinal >= 75 ? "default" : student.calculatedFinal >= 60 ? "secondary" : "destructive"}>
                                              {student.calculatedFinal}/100
                                            </Badge>
                                          </div>
                                        ) : student.grade !== null ? (
                                          <div>
                                            <div className="text-xs text-gray-500 mb-1">درجة التقييم</div>
                                            <Badge variant={student.grade >= 75 ? "default" : student.grade >= 60 ? "secondary" : "destructive"}>
                                              {student.grade}/100
                                            </Badge>
                                          </div>
                                        ) : (
                                          <div>
                                            <div className="text-xs text-gray-500 mb-1">الدرجة</div>
                                            <Badge variant="outline">
                                              لم يتم التقييم
                                            </Badge>
                                          </div>
                                        )}

                                        {/* عرض الدرجات المفصلة إذا كانت متوفرة */}
                                        {(student.attendanceGrade || student.behaviorGrade || student.finalExamGrade) && (
                                          <div className="mt-2 text-xs text-gray-600">
                                            <div>الحضور: {student.attendanceGrade || 0}/20</div>
                                            <div>السلوك: {student.behaviorGrade || 0}/30</div>
                                            <div>الاختبار: {student.finalExamGrade || 0}/50</div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
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
                            الدورة: {student.courseName}
                          </div>
                          <div className="text-sm text-gray-600 text-right">
                            المجموعة: {student.groupName} - {student.site}
                          </div>
                          <div className="text-sm text-gray-600 text-right">
                            المشرف: {student.supervisor}
                          </div>
                          <div className="flex flex-wrap gap-2 justify-end">
                            {student.calculatedFinal !== null ? (
                              <Badge variant="default" className="text-xs">
                                الدرجة النهائية: {student.calculatedFinal}/100
                              </Badge>
                            ) : student.grade !== null ? (
                              <Badge variant="secondary" className="text-xs">
                                درجة التقييم: {student.grade}/100
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                لم يتم التقييم
                              </Badge>
                            )}
                            
                            {student.hasDetailedGrades && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                درجات مفصلة
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
       {/* Report Date Footer */}
       <div className="text-center text-gray-500 text-sm">
          تم إنشاء هذا التقرير في: {new Date().toLocaleDateString('en-GB')} - {new Date().toLocaleTimeString('en-GB')}
        </div>
    </AdminLayout>
  );
}