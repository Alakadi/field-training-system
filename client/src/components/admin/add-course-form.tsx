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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Define schema
const addCourseSchema = z.object({
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

type AddCourseFormValues = z.infer<typeof addCourseSchema>;

interface AddCourseFormProps {
  onSuccess?: () => void;
}

const AddCourseForm: React.FC<AddCourseFormProps> = ({ onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch data
  const { data: trainingSites, isLoading: isLoadingSites } = useQuery({
    queryKey: ["/api/training-sites"],
  });

  const { data: faculties, isLoading: isLoadingFaculties } = useQuery({
    queryKey: ["/api/faculties"],
  });

  const { data: supervisors, isLoading: isLoadingSupervisors } = useQuery({
    queryKey: ["/api/supervisors"],
  });

  const form = useForm<AddCourseFormValues>({
    resolver: zodResolver(addCourseSchema),
    defaultValues: {
      name: "",
      siteId: "",
      startDate: "",
      endDate: "",
      facultyId: "",
      supervisorId: "",
      capacity: "20",
      location: "",
      description: "",
      status: "upcoming",
    },
  });

  const onSubmit = async (data: AddCourseFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Convert startDate and endDate strings to Date objects
      const formattedData = {
        ...data,
        capacity: Number(data.capacity),
      };
      
      await apiRequest("POST", "/api/training-courses", formattedData);
      
      toast({
        title: "تم إنشاء الدورة التدريبية بنجاح",
        description: `تم إنشاء دورة "${data.name}" بنجاح`,
      });
      
      // Reset form
      form.reset();
      
      // Invalidate courses query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/training-courses"] });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "فشل إنشاء الدورة",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء الدورة",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2 space-x-reverse">
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={isSubmitting || isLoading}
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

export default AddCourseForm;
