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

// تعريف مخطط البيانات للتعديل
const editStudentSchema = z.object({
  name: z.string().min(3, { message: "يجب أن يحتوي الاسم على الأقل على 3 أحرف" }),
  email: z.string().email({ message: "يرجى إدخال بريد إلكتروني صالح" }).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  facultyId: z.string().min(1, { message: "يرجى اختيار الكلية" }),
  majorId: z.string().min(1, { message: "يرجى اختيار التخصص" }),
  levelId: z.string().min(1, { message: "يرجى اختيار المستوى" }),
  gpa: z.string().min(1, { message: "يرجى إدخال المعدل التراكمي" }),
  supervisorId: z.string().optional().or(z.literal("")),
  active: z.boolean().default(true),
});

type EditStudentFormValues = z.infer<typeof editStudentSchema>;

const EditStudent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<string>("");

  // الحصول على بيانات الطالب
  const { data: student, isLoading: isLoadingStudent } = useQuery({
    queryKey: [`/api/students/${id}`],
    enabled: !!id,
  });

  // الحصول على البيانات اللازمة
  const { data: faculties } = useQuery({
    queryKey: ["/api/faculties"],
  });

  // الحصول على التخصصات بناءً على الكلية المختارة
  const { data: majors } = useQuery({
    queryKey: ["/api/majors", selectedFaculty],
    enabled: !!selectedFaculty,
  });

  // الحصول على المستويات
  const { data: levels } = useQuery({
    queryKey: ["/api/levels"],
  });

  // الحصول على المشرفين
  const { data: supervisors } = useQuery({
    queryKey: ["/api/supervisors"],
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
      gpa: "",
      supervisorId: "",
      active: true,
    },
  });

  // ضبط الكلية المختارة عند تغييرها في النموذج
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "facultyId" && value.facultyId) {
        setSelectedFaculty(value.facultyId as string);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // تحديث قيم النموذج عند الحصول على بيانات الطالب
  useEffect(() => {
    if (student) {
      setSelectedFaculty(String(student.facultyId));
      
      form.reset({
        name: student.user.name,
        email: student.user.email || "",
        phone: student.user.phone || "",
        facultyId: String(student.facultyId),
        majorId: String(student.majorId),
        levelId: String(student.levelId),
        gpa: String(student.gpa || ""),
        supervisorId: student.supervisorId ? String(student.supervisorId) : "",
        active: student.user.active,
      });
    }
  }, [student, form]);

  const onSubmit = async (data: EditStudentFormValues) => {
    if (!id) return;

    setIsSubmitting(true);
    try {
      // تحويل البيانات إلى الشكل المطلوب للواجهة البرمجية
      const formattedData = {
        ...data,
        facultyId: parseInt(data.facultyId),
        majorId: parseInt(data.majorId),
        levelId: parseInt(data.levelId),
        supervisorId: data.supervisorId ? parseInt(data.supervisorId) : null,
        gpa: parseFloat(data.gpa),
      };

      // تحديث بيانات الطالب
      await apiRequest("PUT", `/api/students/${id}`, formattedData);

      toast({
        title: "تم تحديث بيانات الطالب بنجاح",
      });

      // تحديث مخزن البيانات المؤقت
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${id}`] });

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
            <span className="material-icons ml-1 text-sm">arrow_forward</span>
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
                    name="gpa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المعدل التراكمي *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            max="5" 
                            placeholder="أدخل المعدل التراكمي" 
                            {...field} 
                          />
                        </FormControl>
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
                            {majors?.filter((major: any) => major.facultyId === parseInt(selectedFaculty))
                              .map((major: any) => (
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

                  <FormField
                    control={form.control}
                    name="supervisorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المشرف</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر المشرف" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">بدون مشرف</SelectItem>
                            {supervisors?.map((supervisor: any) => (
                              <SelectItem key={supervisor.id} value={String(supervisor.id)}>
                                {supervisor.user.name}
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
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>حساب نشط</FormLabel>
                          <p className="text-sm text-neutral-500">
                            تمكين أو تعطيل حساب الطالب
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
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