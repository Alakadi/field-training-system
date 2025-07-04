import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import Icon from "@/components/ui/icon-map";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// تعريف مخطط البيانات للتعديل
const editStudentSchema = z.object({
  name: z.string().min(3, { message: "يجب أن يحتوي الاسم على الأقل على 3 أحرف" }),
  email: z.string().email({ message: "يرجى إدخال بريد إلكتروني صالح" }).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  facultyId: z.string().min(1, { message: "يرجى اختيار الكلية" }),
  majorId: z.string().min(1, { message: "يرجى اختيار التخصص" }),
  levelId: z.string().min(1, { message: "يرجى اختيار المستوى" }),
  active: z.boolean().default(true),
  assignedCourseGroups: z.array(z.string()).optional(),
});

type EditStudentFormValues = z.infer<typeof editStudentSchema>;

const EditStudent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<string>("");
  const [selectedMajor, setSelectedMajor] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");

  // تحديد أنواع البيانات
  type StudentType = {
    id: number;
    userId: number;
    universityId: string;
    facultyId: number | null;
    majorId: number | null;
    levelId: number | null;
    user: {
      id: number;
      name: string;
      email: string | null;
      phone: string | null;
      active: boolean;
    }
  };

  type FacultyType = { id: number; name: string };
  type MajorType = { id: number; name: string; facultyId: number };
  type LevelType = { id: number; name: string };
  type SupervisorType = { 
    id: number; 
    userId: number; 
    facultyId: number | null; 
    department: string | null;
    user: {
      id: number;
      name: string;
    }
  };

  // الحصول على بيانات الطالب
  const { data: student, isLoading: isLoadingStudent } = useQuery<StudentType>({
    queryKey: [`/api/students/${id}`],
    enabled: !!id,
  });

  // الحصول على البيانات اللازمة
  const { data: faculties } = useQuery<FacultyType[]>({
    queryKey: ["/api/faculties"],
  });

  // الحصول على التخصصات بناءً على الكلية المختارة
  const { data: majors } = useQuery<MajorType[]>({
    queryKey: ["/api/majors", selectedFaculty],
    queryFn: async () => {
      if (!selectedFaculty) return [];
      const params = new URLSearchParams({ facultyId: selectedFaculty });
      const res = await fetch(`/api/majors?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch majors");
      return res.json();
    },
    enabled: !!selectedFaculty,
  });

  // الحصول على المستويات
  const { data: levels } = useQuery<LevelType[]>({
    queryKey: ["/api/levels"],
  });

  // الحصول على المشرفين
  const { data: supervisors } = useQuery<SupervisorType[]>({
    queryKey: ["/api/supervisors"],
  });

  // جلب الدورات المتاحة بناءً على بيانات الطالب
  const { data: availableCourseGroups = [], isLoading: isLoadingCourseGroups } = useQuery({
    queryKey: ["/api/training-course-groups", selectedFaculty, selectedMajor, selectedLevel],
    queryFn: async () => {
      if (!selectedFaculty || !selectedMajor || !selectedLevel) return [];
      const params = new URLSearchParams({
        facultyId: selectedFaculty,
        majorId: selectedMajor,
        levelId: selectedLevel,
        available: "true"
      });
      const res = await fetch(`/api/training-course-groups?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch course groups");
      return res.json();
    },
    enabled: !!(selectedFaculty && selectedMajor && selectedLevel),
  });

  // جلب تعيينات الطالب الحالية
  const { data: currentAssignments = [] } = useQuery({
    queryKey: ["/api/training-assignments/student", id],
    queryFn: async () => {
      if (!id) return [];
      const res = await fetch(`/api/training-assignments?studentId=${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch student assignments");
      return res.json();
    },
    enabled: !!id,
  });

  const form = useForm<EditStudentFormValues>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      facultyId: "",
      majorId: "",
      levelId: "",
      active: true,
      assignedCourseGroups: [],
    },
  });

  // ضبط الكلية والتخصص والمستوى المختارة عند تغييرها في النموذج
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "facultyId" && value.facultyId) {
        setSelectedFaculty(value.facultyId as string);
        setSelectedMajor("");
        setSelectedLevel("");
      }
      if (name === "majorId" && value.majorId) {
        setSelectedMajor(value.majorId as string);
        setSelectedLevel("");
      }
      if (name === "levelId" && value.levelId) {
        setSelectedLevel(value.levelId as string);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // تحديث قيم النموذج عند الحصول على بيانات الطالب
  useEffect(() => {
    if (student) {
      setSelectedFaculty(String(student.facultyId));
      setSelectedMajor(String(student.majorId));
      setSelectedLevel(String(student.levelId));

      form.reset({
        name: student.user.name,
        email: student.user.email || "",
        phone: student.user.phone || "",
        facultyId: String(student.facultyId),
        majorId: String(student.majorId),
        levelId: String(student.levelId),
        active: student.user.active,
        assignedCourseGroups: currentAssignments.map((assignment: any) => String(assignment.groupId)),
      });
    }
  }, [student, form, currentAssignments]);

  const onSubmit = async (data: EditStudentFormValues) => {
    if (!id) return;

    setIsSubmitting(true);
    try {
      // تحويل البيانات إلى الشكل المطلوب للواجهة البرمجية
      const formattedData = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        facultyId: parseInt(data.facultyId),
        majorId: parseInt(data.majorId),
        levelId: parseInt(data.levelId),
        active: data.active,
      };

      // تحديث بيانات الطالب
      await apiRequest("PUT", `/api/students/${id}`, formattedData);

      // معالجة تعيين الدورات التدريبية
      if (data.assignedCourseGroups && data.assignedCourseGroups.length > 0) {
        // إزالة التعيينات الحالية أولاً
        for (const assignment of currentAssignments) {
          if (!data.assignedCourseGroups.includes(String(assignment.groupId))) {
            // إزالة التعيين الذي لم يعد مختاراً
            // يمكن إضافة API لحذف التعيين هنا إذا لزم الأمر
          }
        }

        // إضافة التعيينات الجديدة
        for (const groupId of data.assignedCourseGroups) {
          const existingAssignment = currentAssignments.find(
            (assignment: any) => String(assignment.groupId) === groupId
          );

          if (!existingAssignment) {
            await apiRequest("POST", "/api/training-assignments", {
              studentId: parseInt(id),
              groupId: parseInt(groupId),
            });
          }
        }
      }

      toast({
        title: "تم تحديث بيانات الطالب بنجاح",
        description: "تم تحديث البيانات وتعيينات الدورات التدريبية",
      });

      // تحديث مخزن البيانات المؤقت
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments"] });

      // الانتقال إلى صفحة قائمة الطلاب
      setLocation("/admin/students");
    } catch (error) {
      toast({
        title: "فشل تحديث بيانات الطالب",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء تحديث بيانات الطالب",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingStudent) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-lg font-medium text-neutral-500">جاري تحميل بيانات الطالب...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">تعديل بيانات الطالب</h1>
          <Button
            variant="outline"
            onClick={() => setLocation("/admin/students")}
          >
            <Icon name="chevron_right" size={16} />
            العودة إلى القائمة
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>معلومات الطالب</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم الطالب *</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل اسم الطالب" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>البريد الإلكتروني</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="أدخل البريد الإلكتروني" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الهاتف</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل رقم الهاتف" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>حالة الحساب</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox
                              id="active-checkbox"
                              checked={Boolean(field.value)}
                              onCheckedChange={(checked) => {
                                field.onChange(Boolean(checked));
                              }}
                            />
                            <label
                              htmlFor="active-checkbox"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              حساب نشط
                            </label>
                          </div>
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          إزالة التحديد لتعطيل حساب الطالب
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="facultyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الكلية *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الكلية" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="default" disabled>اختر الكلية</SelectItem>
                            {faculties?.map((faculty: any) => (
                              <SelectItem key={faculty.id} value={String(faculty.id)}>
                                {faculty.name}
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
                    name="majorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>التخصص *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!selectedFaculty}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={selectedFaculty ? "اختر التخصص" : "اختر الكلية أولاً"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="default" disabled>اختر التخصص</SelectItem>
                            {majors?.map((major: any) => (
                              <SelectItem key={major.id} value={String(major.id)}>
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
                        <FormLabel>المستوى *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر المستوى" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="default" disabled>اختر المستوى</SelectItem>
                            {levels?.map((level: any) => (
                              <SelectItem key={level.id} value={String(level.id)}>
                                {level.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Training Course Assignment Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">إسناد الدورات التدريبية</h3>
                  {!selectedFaculty || !selectedMajor || !selectedLevel ? (
                    <p className="text-sm text-muted-foreground">
                      يرجى اختيار الكلية والتخصص والمستوى الدراسي أولاً لعرض الدورات المتاحة
                    </p>
                  ) : isLoadingCourseGroups ? (
                    <p className="text-sm">جاري تحميل الدورات المتاحة...</p>
                  ) : availableCourseGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      لا توجد دورات تدريبية متاحة لهذا التخصص والمستوى حالياً
                    </p>
                  ) : (
                    <FormField
                      control={form.control}
                      name="assignedCourseGroups"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">الدورات التدريبية المتاحة</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              اختر الدورات التدريبية التي تريد تسجيل الطالب فيها
                            </p>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            {availableCourseGroups.map((group: any) => (
                              <FormField
                                key={group.id}
                                control={form.control}
                                name="assignedCourseGroups"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={group.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(String(group.id))}
                                          onCheckedChange={(checked) => {
                                            const currentValue = Array.isArray(field.value) ? field.value : [];
                                            return checked
                                              ? field.onChange([...currentValue, String(group.id)])
                                              : field.onChange(
                                                  currentValue.filter(
                                                    (value) => value !== String(group.id)
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none flex-1">
                                        <FormLabel className="text-sm font-medium">
                                          {group.course?.name} - {group.groupName}
                                        </FormLabel>
                                        <div className="flex flex-wrap gap-2 text-xs">
                                          <Badge variant="outline">{group.site?.name}</Badge>
                                          <Badge variant="outline">
                                            المشرف: {group.supervisor?.user?.name}
                                          </Badge>
                                          <Badge variant="outline">
                                            {group.availableSpots || (group.capacity - (group.currentEnrollment || 0))} أماكن متاحة
                                          </Badge>
                                          <Badge variant="outline">
                                            {group.startDate} - {group.endDate}
                                          </Badge>
                                        </div>
                                      </div>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>



                <CardFooter className="flex justify-between px-0 pt-5 pb-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/admin/students")}
                  >
                    إلغاء
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary-dark text-white"
                  >
                    {isSubmitting ? (
                      <>جاري الحفظ...</>
                    ) : (
                      <>حفظ التغييرات</>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default EditStudent;