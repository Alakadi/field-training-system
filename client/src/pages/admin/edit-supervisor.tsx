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
const editSupervisorSchema = z.object({
  name: z.string().min(3, { message: "يجب أن يحتوي الاسم على الأقل على 3 أحرف" }),
  email: z.string().email({ message: "يرجى إدخال بريد إلكتروني صالح" }).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  // facultyId: z.string().min(1, { message: "يرجى اختيار الكلية" }),
  department: z.string().optional().or(z.literal("")),
  active: z.boolean().default(true),
});

type EditSupervisorFormValues = z.infer<typeof editSupervisorSchema>;

const EditSupervisor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // الحصول على بيانات المشرف الحالي
  const { data: supervisor, isLoading: isLoadingSupervisor } = useQuery({
    queryKey: [`/api/supervisors/${id}`],
    enabled: !!id,
  });

  // الحصول على قائمة الكليات
  const { data: faculties } = useQuery({
    queryKey: ["/api/faculties"],
  });

  const form = useForm<EditSupervisorFormValues>({
    resolver: zodResolver(editSupervisorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      facultyId: "",
      department: "",
      active: true,
    },
  });

  // تحديث قيم النموذج عند الحصول على بيانات المشرف
  useEffect(() => {
    if (supervisor) {
      form.reset({
        name: supervisor.user.name,
        email: supervisor.user.email || "",
        phone: supervisor.user.phone || "",
        facultyId: String(supervisor.facultyId),
        department: supervisor.department || "",
        active: supervisor.user.active,
      });
    }
  }, [supervisor, form]);

  const onSubmit = async (data: EditSupervisorFormValues) => {
    if (!id) return;

    setIsSubmitting(true);
    try {
      // تحويل البيانات إلى الشكل المطلوب للواجهة البرمجية
      const formattedData = {
        ...data,
        facultyId: parseInt(data.facultyId),
      };

      // تحديث بيانات المشرف
      await apiRequest("PUT", `/api/supervisors/${id}`, formattedData);

      toast({
        title: "تم تحديث بيانات المشرف بنجاح",
      });

      // تحديث مخزن البيانات المؤقت
      queryClient.invalidateQueries({ queryKey: ["/api/supervisors"] });
      queryClient.invalidateQueries({ queryKey: [`/api/supervisors/${id}`] });

      // الانتقال إلى صفحة قائمة المشرفين
      setLocation("/admin/supervisors");
    } catch (error) {
      toast({
        title: "فشل تحديث بيانات المشرف",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء تحديث بيانات المشرف",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingSupervisor) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-lg font-medium text-neutral-500">جاري تحميل بيانات المشرف...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">تعديل بيانات المشرف</h1>
          <Button
            variant="outline"
            onClick={() => setLocation("/admin/supervisors")}
          >
            <Icon name="chevron_right" size={16} />
            العودة إلى القائمة
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>معلومات المشرف</CardTitle>
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
                        <FormLabel>الاسم *</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل اسم المشرف" {...field} />
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
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>القسم</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل اسم القسم" {...field} />
                        </FormControl>
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
                            تمكين أو تعطيل حساب المشرف
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
                    onClick={() => setLocation("/admin/supervisors")}
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

export default EditSupervisor;