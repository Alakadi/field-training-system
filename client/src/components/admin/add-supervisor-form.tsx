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
  username: z.string().min(4, { message: "يجب أن يحتوي اسم المستخدم على الأقل على 4 أحرف" }),
  password: z.string().min(6, { message: "يجب أن تحتوي كلمة المرور على الأقل على 6 أحرف" }),
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
      
      // Clean and format phone number
      let cleanedPhone = "";
      if (data.phone && data.phone.trim() !== "") {
        let phone = data.phone.trim();
        
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
      
      // Check for email uniqueness if email is provided
      if (data.email && data.email.trim() !== "") {
        try {
          const emailCheckResponse = await fetch(`/api/supervisors/check-email?email=${encodeURIComponent(data.email)}`, {
            credentials: "include",
          });
          if (emailCheckResponse.ok) {
            const emailResult = await emailCheckResponse.json();
            if (emailResult.exists) {
              throw new Error("البريد الإلكتروني مستخدم بالفعل من قبل مستخدم آخر");
            }
          } else {
            console.warn("Email check failed, continuing with submission");
          }
        } catch (emailError) {
          console.warn("Email validation error:", emailError);
          // لا نوقف العملية إذا فشل التحقق من البريد الإلكتروني
        }
      }

      // Check for phone uniqueness if phone is provided
      if (cleanedPhone !== "") {
        try {
          const phoneCheckResponse = await fetch(`/api/supervisors/check-phone?phone=${encodeURIComponent(cleanedPhone)}`, {
            credentials: "include",
          });
          if (phoneCheckResponse.ok) {
            const phoneResult = await phoneCheckResponse.json();
            if (phoneResult.exists) {
              throw new Error("رقم الهاتف مستخدم بالفعل من قبل مستخدم آخر");
            }
          } else {
            console.warn("Phone check failed, continuing with submission");
          }
        } catch (phoneError) {
          console.warn("Phone validation error:", phoneError);
          // لا نوقف العملية إذا فشل التحقق من رقم الهاتف
        }
      }

      // Prepare data with cleaned phone
      const submitData = {
        ...data,
        phone: cleanedPhone || null
      };

      await apiRequest("POST", "/api/supervisors", submitData);

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
                        <Input placeholder="مثال: 771234567 أو +967771234567" {...field} />
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
