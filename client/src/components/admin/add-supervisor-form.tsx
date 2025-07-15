import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Define schema
const addSupervisorSchema = z.object({
  name: z.string().min(3, { message: "يجب أن يحتوي الاسم على الأقل على 3 أحرف" }),
  username: z.string().min(4, { message: "يجب أن يحتوي اسم المستخدم على الأقل على 4 أحرف" }),
  password: z.string().min(6, { message: "يجب أن تحتوي كلمة المرور على الأقل على 6 أحرف" }),
  email: z.string().email({ message: "يرجى إدخال بريد إلكتروني صالح" }).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  facultyId: z.string().min(1, { message: "يرجى اختيار الكلية" }).optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
});

type AddSupervisorFormValues = z.infer<typeof addSupervisorSchema>;

interface AddSupervisorFormProps {
  onSuccess?: () => void;
}

const AddSupervisorForm: React.FC<AddSupervisorFormProps> = ({ onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch faculties
  const { data: faculties, isLoading: isLoadingFaculties } = useQuery({
    queryKey: ["/api/faculties"],
  });

  const form = useForm<AddSupervisorFormValues>({
    resolver: zodResolver(addSupervisorSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      email: "",
      phone: "",
      facultyId: "",
      department: "",
    },
  });

  const onSubmit = async (data: AddSupervisorFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Check for email uniqueness if email is provided
      if (data.email && data.email.trim() !== "") {
        const emailCheckResponse = await fetch(`/api/supervisors/check-email?email=${encodeURIComponent(data.email)}`, {
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

      // Check for phone uniqueness if phone is provided
      if (data.phone && data.phone.trim() !== "") {
        const phoneCheckResponse = await fetch(`/api/supervisors/check-phone?phone=${encodeURIComponent(data.phone)}`, {
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

      await apiRequest("POST", "/api/supervisors", data);

      toast({
        title: "تم إضافة المشرف بنجاح",
        description: `تم إضافة المشرف ${data.name} بنجاح`,
      });

      // Reset form
      form.reset();

      // Invalidate supervisors query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/supervisors"] });

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "فشل إضافة المشرف",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء إضافة المشرف",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>إضافة مشرف جديد</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingFaculties ? (
          <div className="text-center p-4">جاري تحميل البيانات...</div>
        ) : (
          <Form {...form}>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المشرف</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل الاسم الكامل" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المستخدم</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل اسم المستخدم" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>كلمة المرور</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="أدخل كلمة المرور" {...field} />
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
                          <SelectItem value="none">لا يوجد</SelectItem>
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
              </div>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2 space-x-reverse">
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={isSubmitting || isLoadingFaculties}
        >
          {isSubmitting ? "جاري الحفظ..." : "حفظ"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            form.reset();
            if (onSuccess) onSuccess();
          }}
        >
          إلغاء
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AddSupervisorForm;
