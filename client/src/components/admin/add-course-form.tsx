import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, AlertTriangle, Calendar } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
// import { queryClient } from "@/lib/queryClient";
const addCourseSchema = z.object({
  name: z.string().min(1, "اسم الدورة مطلوب"),
  facultyId: z.string().min(1, "الكلية مطلوبة"),
  majorId: z.string().min(1, "التخصص مطلوب"),
  levelId: z.string().min(1, "المستوى مطلوب"),
  description: z.string().optional(),
  // إعدادات النسب والتسميات
  attendancePercentage: z.number().min(0).max(100).default(20),
  behaviorPercentage: z.number().min(0).max(100).default(30),
  finalExamPercentage: z.number().min(0).max(100).default(50),
  attendanceGradeLabel: z.string().default("درجة الحضور"),
  behaviorGradeLabel: z.string().default("درجة السلوك"),
  finalExamGradeLabel: z.string().default("درجة الاختبار النهائي"),
  // إزالة حقل الحالة - سيتم تحديدها تلقائياً بناءً على تواريخ المجموعات
  // إزالة حقل السنة الدراسية - سيتم تحديدها تلقائياً بناءً على تاريخ بدء الكورس
}).refine(
  (data) => data.attendancePercentage + data.behaviorPercentage + data.finalExamPercentage === 100,
  {
    message: "يجب أن يكون مجموع النسب الثلاث 100%",
    path: ["finalExamPercentage"],
  }
);

const courseGroupSchema = z.object({
  siteId: z.string().min(1, "جهة التدريب مطلوبة"),
  supervisorId: z.string().min(1, "المشرف مطلوب"),
  capacity: z.string().min(1, "السعة مطلوبة"),
  startDate: z.string().min(1, "تاريخ البدء مطلوب"),
  endDate: z.string().min(1, "تاريخ الانتهاء مطلوب"),
});

type AddCourseFormValues = z.infer<typeof addCourseSchema>;
type CourseGroup = z.infer<typeof courseGroupSchema>;

interface AddCourseFormProps {
  onSuccess?: () => void;
}

const AddCourseForm: React.FC<AddCourseFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groups, setGroups] = useState<CourseGroup[]>([
    { 
      siteId: "", 
      supervisorId: "", 
      capacity: "20", 
      startDate: "", 
      endDate: "" 
    }
  ]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  
  // حالة حوار تأكيد السنة الدراسية
  const [showAcademicYearDialog, setShowAcademicYearDialog] = useState(false);
  const [pendingCourseData, setPendingCourseData] = useState<any>(null);
  const [academicYearOptions, setAcademicYearOptions] = useState<any[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | null>(null);
  const [suggestedAcademicYear, setSuggestedAcademicYear] = useState<any>(null);

  // Fetch training sites
  const { data: trainingSites, isLoading: isLoadingSites } = useQuery({
    queryKey: ["/api/training-sites"],
  });

  const { data: faculties, isLoading: isLoadingFaculties } = useQuery({
    queryKey: ["/api/faculties"],
    // queryFn: getQueryFn({ on401: "throw" })// هذا ما كان ناقصًا فقط
  });

  const { data: supervisors, isLoading: isLoadingSupervisors } = useQuery({
    queryKey: ["/api/supervisors"],
  });

  // Fetch levels
  const { data: levels } = useQuery({
    queryKey: ["/api/levels"],
  });

  // Fetch academic years
  const { data: academicYears } = useQuery({
    queryKey: ["/api/academic-years"],
  });



  // Fetch majors based on selected faculty
  const { data: majors, isLoading: isLoadingMajors } = useQuery({
    queryKey: ["/api/majors", selectedFacultyId],
    queryFn: () => fetch(`/api/majors?facultyId=${selectedFacultyId}`).then(res => res.json()),
    enabled: !!selectedFacultyId && selectedFacultyId !== "none",
  });

  const form = useForm<AddCourseFormValues>({
    resolver: zodResolver(addCourseSchema),
    defaultValues: {
      name: "",
      facultyId: "",
      majorId: "",
      levelId: "",
      description: "",
      attendancePercentage: 20,
      behaviorPercentage: 30,
      finalExamPercentage: 50,
      attendanceGradeLabel: "درجة الحضور",
      behaviorGradeLabel: "درجة السلوك",
      finalExamGradeLabel: "درجة الاختبار النهائي",
    },
  });

  const addGroup = () => {
    setGroups([...groups, { 
      siteId: "", 
      supervisorId: "", 
      capacity: "20", 
      startDate: "", 
      endDate: "" 
    }]);
  };

  const removeGroup = (index: number) => {
    if (groups.length > 1) {
      setGroups(groups.filter((_, i) => i !== index));
    }
  };

  const updateGroup = (index: number, field: keyof CourseGroup, value: string) => {
    const updatedGroups = [...groups];
    updatedGroups[index] = { ...updatedGroups[index], [field]: value };
    setGroups(updatedGroups);
  };

  // دالة للتحقق من السنوات الدراسية واقتراح الأقرب
  const checkAcademicYears = (courseData: any, validatedGroups: any[]) => {
    // إذا لم تكن هناك سنوات دراسية في النظام
    if (!academicYears || academicYears.length === 0) {
      setShowAcademicYearDialog(true);
      setPendingCourseData({ ...courseData, groups: validatedGroups });
      setAcademicYearOptions([]);
      setSuggestedAcademicYear(null);
      return false;
    }

    // تحديد تاريخ بداية الكورس من أقرب مجموعة
    const groupDates = validatedGroups.map(group => new Date(group.startDate));
    const earliestStartDate = new Date(Math.min(...groupDates.map(d => d.getTime())));

    // البحث عن السنة الدراسية المناسبة
    let suggestedYear = null;
    let matchingYears = [];

    for (const year of academicYears) {
      const yearStart = new Date(year.startDate);
      const yearEnd = new Date(year.endDate);
      
      if (earliestStartDate >= yearStart && earliestStartDate <= yearEnd) {
        suggestedYear = year;
        break;
      }
      matchingYears.push(year);
    }

    // إذا لم توجد سنة مناسبة، اعرض الحوار
    if (!suggestedYear) {
      setShowAcademicYearDialog(true);
      setPendingCourseData({ ...courseData, groups: validatedGroups });
      setAcademicYearOptions(academicYears);
      setSuggestedAcademicYear(null);
      return false;
    }

    // إذا وجدت سنة مناسبة، استخدمها مباشرة
    return { ...courseData, academicYearId: suggestedYear.id, groups: validatedGroups };
  };

  const onSubmit = async (data: AddCourseFormValues) => {
    setIsSubmitting(true);

    try {
      // Validate groups
      const validatedGroups = groups.map(group => {
        const result = courseGroupSchema.safeParse(group);
        if (!result.success) {
          throw new Error("جميع بيانات المجموعات مطلوبة");
        }
        return {
          ...result.data,
          capacity: parseInt(result.data.capacity),
        };
      });

      // التحقق من السنوات الدراسية
      const finalCourseData = checkAcademicYears(data, validatedGroups);
      
      // إذا كانت النتيجة false، فهذا يعني أن الحوار سيظهر
      if (finalCourseData === false) {
        setIsSubmitting(false);
        return;
      }

      // إنشاء الدورة مباشرة إذا كانت هناك سنة دراسية مناسبة
      await createCourse(finalCourseData);
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء الدورة",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  // دالة إنشاء الدورة
  const createCourse = async (courseData: any) => {
    try {
      const courseResponse = await fetch("/api/training-courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(courseData),
      });

      if (!courseResponse.ok) {
        throw new Error("فشل في إنشاء الدورة");
      }

      const courseResult = await courseResponse.json();

      toast({
        title: "تم بنجاح",
        description: courseResult.message || "تم إنشاء الدورة التدريبية والمجموعات بنجاح",
      });

      // Reset form
      form.reset();
      setGroups([{ 
        siteId: "", 
        supervisorId: "", 
        capacity: "20", 
        startDate: "", 
        endDate: "" 
      }]);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/training-courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-course-groups"] });

      if (onSuccess) onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  // دالة للتأكيد من حوار السنة الدراسية
  const handleAcademicYearConfirm = async () => {
    if (!pendingCourseData) return;

    const finalData = {
      ...pendingCourseData,
      academicYearId: selectedAcademicYearId ? Number(selectedAcademicYearId) : null
    };

    setShowAcademicYearDialog(false);
    await createCourse(finalData);
  };

  const isLoading = isLoadingSites || isLoadingFaculties || isLoadingSupervisors;

  return (
    <Card>
      <CardHeader>
        <CardTitle>إنشاء دورة تدريبية جديدة</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center p-4">جاري تحميل البيانات...</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Course Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم الدورة</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل اسم الدورة التدريبية" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* تم إزالة حقل الموقع - سيتم تحديده من خلال مواقع التدريب في المجموعات */}
              </div>

              {/* Academic Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="facultyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الكلية</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedFacultyId(value);
                          form.setValue("majorId", "");
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الكلية" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(faculties) ? faculties.map((faculty: any) => (
                            <SelectItem key={faculty.id} value={faculty.id.toString()}>
                              {faculty.name}
                            </SelectItem>
                          )) : null}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="majorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>التخصص</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !selectedFacultyId ? "اختر الكلية أولاً" : 
                              isLoadingMajors ? "جاري التحميل..." : 
                              "اختر التخصص"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {majors && Array.isArray(majors) && majors.map((major: any) => (
                            <SelectItem key={major.id} value={major.id.toString()}>
                              {major.name}
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
                  name="levelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المستوى</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المستوى" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {levels && Array.isArray(levels) && levels.map((level: any) => (
                            <SelectItem key={level.id} value={level.id.toString()}>
                              <span>{level.name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              {/* Description */}
              <div className="w-full">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>وصف الدورة</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="أدخل وصفاً تفصيلياً للدورة التدريبية (اختياري) - سيتم تحديد حالة الدورة تلقائياً بناءً على تواريخ المجموعات"
                          className="h-24"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Grade Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">إعدادات الدرجات</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Attendance Grade */}
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="attendanceGradeLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تسمية درجة الحضور</FormLabel>
                          <FormControl>
                            <Input placeholder="درجة الحضور" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="attendancePercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نسبة درجة الحضور (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100" 
                              placeholder="20"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Behavior Grade */}
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="behaviorGradeLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تسمية درجة السلوك</FormLabel>
                          <FormControl>
                            <Input placeholder="درجة السلوك" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="behaviorPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نسبة درجة السلوك (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100" 
                              placeholder="30"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Final Exam Grade */}
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="finalExamGradeLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تسمية درجة الاختبار النهائي</FormLabel>
                          <FormControl>
                            <Input placeholder="درجة الاختبار النهائي" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="finalExamPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نسبة درجة الاختبار النهائي (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100" 
                              placeholder="50"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Total Percentage Display */}
                  <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-sm text-gray-600">المجموع</div>
                      <div className={`text-xl font-bold ${
                        (form.watch("attendancePercentage") + form.watch("behaviorPercentage") + form.watch("finalExamPercentage")) === 100
                          ? "text-green-600" 
                          : "text-red-600"
                      }`}>
                        {(form.watch("attendancePercentage") + form.watch("behaviorPercentage") + form.watch("finalExamPercentage")) || 0}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Groups */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold border-b pb-2">مجموعات الدورة</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addGroup}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة مجموعة
                  </Button>
                </div>

                {groups.map((group, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">المجموعة {index + 1}</h4>
                        {groups.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeGroup(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">جهة التدريب</label>
                          <Select 
                            value={group.siteId} 
                            onValueChange={(value) => updateGroup(index, "siteId", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر جهة التدريب" />
                            </SelectTrigger>
                            <SelectContent>
                              {trainingSites && Array.isArray(trainingSites) && trainingSites.map((site: any) => (
                                <SelectItem key={site.id} value={site.id.toString()}>
                                  <span>{site.name}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">المشرف</label>
                          <Select 
                            value={group.supervisorId} 
                            onValueChange={(value) => updateGroup(index, "supervisorId", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر المشرف" />
                            </SelectTrigger>
                            <SelectContent>
                              {supervisors && Array.isArray(supervisors) && supervisors.map((supervisor: any) => (
                                <SelectItem key={supervisor.id} value={supervisor.id.toString()}>
                                  <span>{supervisor.user?.name || supervisor.name}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">السعة</label>
                          <Input
                            type="number"
                            placeholder="20"
                            value={group.capacity}
                            onChange={(e) => updateGroup(index, "capacity", e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium">تاريخ البدء</label>
                          <Input
                            type="date"
                            value={group.startDate}
                            onChange={(e) => updateGroup(index, "startDate", e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium">تاريخ الانتهاء</label>
                          <Input
                            type="date"
                            value={group.endDate}
                            onChange={(e) => updateGroup(index, "endDate", e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end space-x-2 space-x-reverse">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "جاري الحفظ..." : "حفظ"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setGroups([{ 
                      siteId: "", 
                      supervisorId: "", 
                      capacity: "20", 
                      startDate: "", 
                      endDate: "" 
                    }]);
                    if (onSuccess) onSuccess();
                  }}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>

      {/* حوار تأكيد السنة الدراسية */}
      <Dialog open={showAcademicYearDialog} onOpenChange={setShowAcademicYearDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <DialogTitle>تحديد السنة الدراسية</DialogTitle>
            </div>
            <DialogDescription className="text-right">
              {academicYearOptions.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-red-600 font-medium">لم يتم العثور على سنوات دراسية في النظام</p>
                  <p>هل تريد إنشاء هذه الدورة بدون سنة دراسية؟</p>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 يمكنك إضافة السنوات الدراسية من قائمة "إدارة السنوات الدراسية" ثم ربط الدورات بها لاحقاً
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p>لم يتم العثور على سنة دراسية مناسبة لتاريخ بداية هذه الدورة.</p>
                  
                  {suggestedAcademicYear && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-800">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        السنة المقترحة: {suggestedAcademicYear.name}
                      </p>
                    </div>
                  )}
                  
                  <p>يرجى اختيار إحدى الخيارات التالية:</p>
                  
                  {academicYearOptions.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">تعيين لسنة دراسية:</label>
                      <Select 
                        value={selectedAcademicYearId || ""} 
                        onValueChange={setSelectedAcademicYearId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر السنة الدراسية" />
                        </SelectTrigger>
                        <SelectContent>
                          {academicYearOptions.map((year: any) => (
                            <SelectItem key={year.id} value={year.id.toString()}>
                              {year.name} ({year.startDate} - {year.endDate})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="space-x-2 space-x-reverse">
            <Button onClick={handleAcademicYearConfirm} disabled={isSubmitting}>
              {academicYearOptions.length === 0 ? "المتابعة بدون سنة دراسية" : "تأكيد الإنشاء"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAcademicYearDialog(false);
                setIsSubmitting(false);
              }}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AddCourseForm;