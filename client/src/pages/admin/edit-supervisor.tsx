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
import Icon from "@/components/ui/icon-map";
import { Checkbox } from "@/components/ui/checkbox";

// تعريف مخطط البيانات للتعديل
const editSupervisorSchema = z.object({
  name: z.string()
    .min(1, { message: "الاسم مطلوب" })
    .refine((name) => {
      const trimmedName = name.trim();
      // Check if name contains only Arabic letters and spaces
      const arabicNameRegex = /^[\u0600-\u06FF\s]+$/;
      if (!arabicNameRegex.test(trimmedName)) {
        return false;
      }
      // Check if name has at least 3 words
      const words = trimmedName.split(/\s+/).filter(word => word.length > 0);
      return words.length >= 3;
    }, { 
      message: "الاسم يجب أن يحتوي على 3 أسماء على الأقل وحروف عربية فقط (مثال: محمد عبدالملك عبدالله)" 
    }),
  email: z.string().email({ message: "يرجى إدخال بريد إلكتروني صالح" }).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")).refine((phone) => {
    if (!phone || phone.trim() === "") return true; // Optional field

    let cleanPhone = phone.trim();

    // Remove country code if present
    if (cleanPhone.startsWith("+967")) {
      cleanPhone = cleanPhone.substring(4);
    } else if (cleanPhone.startsWith("967")) {
      cleanPhone = cleanPhone.substring(3);
    }

    // Remove any spaces or dashes
    cleanPhone = cleanPhone.replace(/[\s-]/g, "");

    // Check if it's exactly 9 digits
    if (!/^\d{9}$/.test(cleanPhone)) {
      return false;
    }

    // Check if it starts with valid prefixes
    const validPrefixes = ["73", "77", "78", "71", "70"];
    const prefix = cleanPhone.substring(0, 2);

    return validPrefixes.includes(prefix);
  }, { 
    message: "رقم الهاتف يجب أن يكون 9 أرقام ويبدأ بـ 73 أو 77 أو 78 أو 71 أو 70 (يمكن إضافة رمز البلد +967)" 
  }),
  facultyId: z.string().optional().or(z.literal("")),
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
      // التحقق من تطابق البريد الإلكتروني مع مستخدمين آخرين
      if (data.email && data.email !== supervisor?.user.email) {
        const emailCheckResponse = await fetch(`/api/supervisors/check-email?email=${encodeURIComponent(data.email)}&excludeId=${supervisor?.user.id}`, {
          credentials: "include",
        });
        if (!emailCheckResponse.ok) {
          const emailError = await emailCheckResponse.json();
          throw new Error(emailError.message || "خطأ في التحقق من البريد الإلكتروني");
        }
        const emailExists = await emailCheckResponse.json();
        if (emailExists.exists) {
          throw new Error("البريد الإلكتروني مستخدم بالفعل من قبل مستخدم آخر");
        }
      }

      // التحقق من تطابق رقم الهاتف مع مستخدمين آخرين
      if (data.phone && data.phone !== supervisor?.user.phone) {
        const phoneCheckResponse = await fetch(`/api/supervisors/check-phone?phone=${encodeURIComponent(data.phone)}&excludeId=${supervisor?.user.id}`, {
          credentials: "include",
        });
        if (!phoneCheckResponse.ok) {
          const phoneError = await phoneCheckResponse.json();
          throw new Error(phoneError.message || "خطأ في التحقق من رقم الهاتف");
        }
        const phoneExists = await phoneCheckResponse.json();
        if (phoneExists.exists) {
          throw new Error("رقم الهاتف مستخدم بالفعل من قبل مستخدم آخر");
        }
      }

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
                        <FormLabel>الوصف</FormLabel>
                        <FormControl>
                          <Input placeholder=" أدخل الوصف" {...field} />
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