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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Icon from "@/components/ui/icon-map";

// تعريف مخطط البيانات للتعديل
const editTrainingSiteSchema = z.object({
  name: z.string()
    .min(3, { message: "يجب أن يحتوي اسم الجهة على الأقل على 3 أحرف" }),
  address: z.string()
    .min(5, { message: "يجب أن يحتوي العنوان على الأقل على 5 أحرف" }),
  contactName: z.string()
    .min(3, { message: "يجب أن يحتوي اسم جهة الاتصال على الأقل على 3 أحرف" }),
  contactEmail: z.string()
    .email({ message: "يرجى إدخال بريد إلكتروني صالح" })
    .optional().or(z.literal("")),
  contactPhone: z.string()
    .optional()
    .or(z.literal(""))
    .refine((phone) => {
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
});

type EditTrainingSiteFormValues = z.infer<typeof editTrainingSiteSchema>;

const EditTrainingSite: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // تحديد أنواع البيانات
  type TrainingSiteType = {
    id: number;
    name: string;
    address: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  };

  // الحصول على بيانات موقع التدريب
  const { data: trainingSite, isLoading: isLoadingSite } = useQuery<TrainingSiteType>({
    queryKey: [`/api/training-sites/${id}`],
    enabled: !!id,
  });

  const form = useForm<EditTrainingSiteFormValues>({
    resolver: zodResolver(editTrainingSiteSchema),
    defaultValues: {
      name: "",
      address: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  // تحديث قيم النموذج عند الحصول على بيانات موقع التدريب
  useEffect(() => {
    if (trainingSite) {
      form.reset({
        name: trainingSite.name,
        address: trainingSite.address || "",
        contactName: trainingSite.contactName || "",
        contactEmail: trainingSite.contactEmail || "",
        contactPhone: trainingSite.contactPhone || "",
      });
    }
  }, [trainingSite, form]);

  const onSubmit = async (data: EditTrainingSiteFormValues) => {
    if (!id) return;

    setIsSubmitting(true);
    try {
      // Clean and format phone number
      let cleanedPhone = "";
      if (data.contactPhone && data.contactPhone.trim() !== "") {
        let phone = data.contactPhone.trim();

        // Remove country code if present
        if (phone.startsWith("+967")) {
          phone = phone.substring(4);
        } else if (phone.startsWith("967")) {
          phone = phone.substring(3);
        }

        // Remove any spaces or dashes
        phone = phone.replace(/[\s-]/g, "");

        cleanedPhone = phone;
      }

      // تحويل البيانات إلى الشكل المطلوب للواجهة البرمجية
      const formattedData = {
        name: data.name,
        address: data.address,
        contactName: data.contactName,
        contactEmail: data.contactEmail || null,
        contactPhone: cleanedPhone || null,
      };

      // تحديث بيانات موقع التدريب
      await apiRequest("PUT", `/api/training-sites/${id}`, formattedData);

      toast({
        title: "تم تحديث بيانات موقع التدريب بنجاح",
        description: "تم حفظ التغييرات بنجاح",
      });

      // تحديث مخزن البيانات المؤقت
      queryClient.invalidateQueries({ queryKey: ["/api/training-sites"] });
      queryClient.invalidateQueries({ queryKey: [`/api/training-sites/${id}`] });

      // الانتقال إلى صفحة قائمة مواقع التدريب
      setLocation("/admin/training-sites");
    } catch (error) {
      toast({
        title: "فشل تحديث بيانات موقع التدريب",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء تحديث البيانات",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingSite) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-lg font-medium text-neutral-500">جاري تحميل بيانات موقع التدريب...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!trainingSite) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-lg font-medium text-red-500">لم يتم العثور على موقع التدريب</p>
            <Button
              variant="outline"
              onClick={() => setLocation("/admin/training-sites")}
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
          <h1 className="text-2xl font-bold">تعديل موقع التدريب</h1>
          <Button
            variant="outline"
            onClick={() => setLocation("/admin/training-sites")}
          >
            <Icon name="chevron_right" size={16} />
            العودة إلى القائمة
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>معلومات موقع التدريب</CardTitle>
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
                        <FormLabel>اسم الجهة *</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل اسم الجهة" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم جهة الاتصال *</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل اسم جهة الاتصال" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactEmail"
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
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الهاتف</FormLabel>
                        <FormControl>
                          <Input placeholder="مثال: 771234567 أو +967771234567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>العنوان *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="أدخل عنوان الجهة" 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-4 space-x-reverse">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/admin/training-sites")}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Icon name="loader_2" size={16} className="animate-spin ml-2" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Icon name="save" size={16} />
                        حفظ التغييرات
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default EditTrainingSite;