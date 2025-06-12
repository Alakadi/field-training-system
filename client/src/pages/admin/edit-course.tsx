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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// تعريف مخطط البيانات
const editCourseSchema = z.object({
  name: z.string().min(3, { message: "يجب أن يحتوي اسم الدورة على الأقل على 3 أحرف" }),
  code: z.string().min(2, { message: "يجب أن يحتوي رمز الدورة على الأقل على حرفين" }),
  description: z.string().optional(),
  trainingSiteId: z.string().min(1, { message: "يرجى اختيار جهة التدريب" }),
  capacity: z.string().min(1, { message: "يرجى إدخال السعة" }).transform(Number),
  startDate: z.string().min(1, { message: "يرجى إدخال تاريخ البدء" }),
  endDate: z.string().min(1, { message: "يرجى إدخال تاريخ الانتهاء" }),
  supervisorId: z.string().min(1, { message: "يرجى اختيار المشرف" }),
  status: z.string().min(1, { message: "يرجى اختيار الحالة" }),
});

type EditCourseFormValues = z.infer<typeof editCourseSchema>;

const EditCourse: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // الحصول على بيانات الدورة الحالية
  const { data: course, isLoading: isLoadingCourse, error } = useQuery({
    queryKey: [`/api/training-courses/${id}`],
    enabled: !!id,
  });

  // الحصول على قائمة جهات التدريب
  const { data: trainingSites } = useQuery({
    queryKey: ["/api/training-sites"],
  });

  // الحصول على قائمة المشرفين
  const { data: supervisors } = useQuery({
    queryKey: ["/api/supervisors"],
  });

  const form = useForm<EditCourseFormValues>({
    resolver: zodResolver(editCourseSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      trainingSiteId: "",
      capacity: "",
      startDate: "",
      endDate: "",
      supervisorId: "",
      status: "",
    },
  });

  // تحديث قيم النموذج عند الحصول على بيانات الدورة
  useEffect(() => {
    if (course) {
      form.reset({
        name: course.name || "",
        code: course.code || "",
        description: course.description || "",
        trainingSiteId: course.trainingSiteId ? String(course.trainingSiteId) : "",
        capacity: course.capacity ? String(course.capacity) : "",
        startDate: course.startDate ? course.startDate.split("T")[0] : "", // تحويل التاريخ إلى تنسيق YYYY-MM-DD
        endDate: course.endDate ? course.endDate.split("T")[0] : "",
        supervisorId: course.supervisorId ? String(course.supervisorId) : "",
        status: course.status || "",
      });
    }
  }, [course, form]);

  const onSubmit = async (data: EditCourseFormValues) => {
    if (!id) return;

    setIsSubmitting(true);
    try {
      // تحويل البيانات إلى الشكل المطلوب للواجهة البرمجية
      const formattedData = {
        ...data,
        trainingSiteId: parseInt(data.trainingSiteId),
        supervisorId: parseInt(data.supervisorId),
        capacity: parseInt(String(data.capacity)),
      };

      // تحديث الدورة التدريبية
      await apiRequest("PUT", `/api/training-courses/${id}`, formattedData);

      toast({
        title: "تم تحديث الدورة التدريبية بنجاح",
      });

      // تحديث مخزن البيانات المؤقت
      queryClient.invalidateQueries({ queryKey: ["/api/training-courses"] });
      queryClient.invalidateQueries({ queryKey: [`/api/training-courses/${id}`] });

      // الانتقال إلى صفحة قائمة الدورات التدريبية
      setLocation("/admin/courses");
    } catch (error) {
      toast({
        title: "فشل تحديث الدورة التدريبية",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء تحديث الدورة التدريبية",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingCourse) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-lg font-medium text-neutral-500">جاري تحميل بيانات الدورة التدريبية...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !course) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-lg font-medium text-red-500">خطأ في تحميل بيانات الدورة التدريبية</p>
            <Button
              variant="outline"
              onClick={() => setLocation("/admin/courses")}
              className="mt-4"
            >
              العودة إلى القائمة
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">تعديل الدورة التدريبية</h1>
          <Button
            variant="outline"
            onClick={() => setLocation("/admin/courses")}
          >
            <span className="material-icons ml-1 text-sm">arrow_forward</span>
            العودة إلى القائمة
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>تفاصيل الدورة التدريبية</CardTitle>
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
                        <FormLabel>اسم الدورة التدريبية *</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل اسم الدورة التدريبية" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رمز الدورة *</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل رمز الدورة" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="trainingSiteId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>جهة التدريب *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر جهة التدريب" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {trainingSites?.map((site: any) => (
                              <SelectItem key={site.id} value={String(site.id)}>
                                {site.name}
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
                        <FormLabel>المشرف *</FormLabel>
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
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>السعة *</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" placeholder="أدخل سعة الدورة" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الحالة *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر حالة الدورة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">نشطة</SelectItem>
                            <SelectItem value="pending">قيد الإعداد</SelectItem>
                            <SelectItem value="completed">مكتملة</SelectItem>
                            <SelectItem value="cancelled">ملغاة</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ البدء *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ الانتهاء *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>وصف الدورة</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="أدخل وصفًا للدورة التدريبية"
                          className="resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <CardFooter className="flex justify-between px-0 pb-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/admin/courses")}
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

export default EditCourse;