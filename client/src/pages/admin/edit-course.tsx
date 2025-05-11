
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const editCourseSchema = z.object({
  name: z.string().min(3, { message: "يجب أن يحتوي اسم الدورة على الأقل على 3 أحرف" }),
  siteId: z.string().min(1, { message: "يرجى اختيار جهة التدريب" }),
  startDate: z.string().min(1, { message: "يرجى تحديد تاريخ البداية" }),
  endDate: z.string().min(1, { message: "يرجى تحديد تاريخ النهاية" }),
  facultyId: z.string().min(1, { message: "يرجى اختيار الكلية" }).optional().or(z.literal("")),
  supervisorId: z.string().min(1, { message: "يرجى اختيار المشرف الأكاديمي" }).optional().or(z.literal("")),
  capacity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "يجب أن يكون عدد المقاعد رقمًا موجبًا",
  }),
  location: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  status: z.string().min(1, { message: "يرجى اختيار حالة الدورة" }),
});

type EditCourseFormValues = z.infer<typeof editCourseSchema>;

const EditCourse: React.FC = () => {
  const [, params] = useRoute("/admin/courses/edit/:id");
  const courseId = params?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch course data
  const { data: course, isLoading: isLoadingCourse } = useQuery({
    queryKey: [`/api/training-courses/${courseId}`],
  });

  // Fetch additional data
  const { data: trainingSites } = useQuery({ queryKey: ["/api/training-sites"] });
  const { data: faculties } = useQuery({ queryKey: ["/api/faculties"] });
  const { data: supervisors } = useQuery({ queryKey: ["/api/supervisors"] });

  const form = useForm<EditCourseFormValues>({
    resolver: zodResolver(editCourseSchema),
    defaultValues: {
      name: course?.name || "",
      siteId: String(course?.siteId) || "",
      startDate: course?.startDate?.split("T")[0] || "",
      endDate: course?.endDate?.split("T")[0] || "",
      facultyId: course?.facultyId ? String(course.facultyId) : "",
      supervisorId: course?.supervisorId ? String(course.supervisorId) : "",
      capacity: String(course?.capacity) || "20",
      location: course?.location || "",
      description: course?.description || "",
      status: course?.status || "upcoming",
    },
  });

  const onSubmit = async (data: EditCourseFormValues) => {
    try {
      setIsSubmitting(true);
      
      const formattedData = {
        ...data,
        capacity: Number(data.capacity),
      };
      
      await apiRequest("PUT", `/api/training-courses/${courseId}`, formattedData);
      
      toast({
        title: "تم تحديث الدورة التدريبية بنجاح",
        description: `تم تحديث دورة "${data.name}" بنجاح`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/training-courses"] });
      window.history.back();
    } catch (error) {
      toast({
        title: "فشل تحديث الدورة",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء تحديث الدورة",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingCourse) {
    return (
      <AdminLayout>
        <div className="text-center p-4">جاري تحميل البيانات...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <CardTitle>تعديل الدورة التدريبية</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-4">
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
                
                <FormField
                  control={form.control}
                  name="siteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>جهة التدريب</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ البداية</FormLabel>
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
                      <FormLabel>تاريخ النهاية</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                      <FormLabel>الكلية</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الكلية" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">لا تختر</SelectItem>
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
                  name="supervisorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المشرف الأكاديمي</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المشرف الأكاديمي" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">لا تختر</SelectItem>
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
                      <FormLabel>عدد المقاعد</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" placeholder="أدخل عدد المقاعد" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الموقع</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل موقع التدريب" {...field} />
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
                      <FormLabel>حالة الدورة</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر حالة الدورة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="upcoming">قادمة</SelectItem>
                          <SelectItem value="active">نشطة</SelectItem>
                          <SelectItem value="completed">مكتملة</SelectItem>
                        </SelectContent>
                      </Select>
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
                        placeholder="أدخل وصفاً تفصيلياً للدورة التدريبية"
                        className="h-32"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 space-x-reverse">
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
          >
            إلغاء
          </Button>
        </CardFooter>
      </Card>
    </AdminLayout>
  );
};

export default EditCourse;
