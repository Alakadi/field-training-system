import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Validation schema
const trainingSiteSchema = z.object({
  name: z.string().min(2, { message: "يجب أن يكون اسم الجهة أكثر من حرفين" }),
  address: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email({ message: "البريد الإلكتروني غير صالح" }).optional().or(z.literal("")),
  contactPhone: z.string().optional(),
});

type TrainingSiteFormValues = z.infer<typeof trainingSiteSchema>;

interface AddTrainingSiteFormProps {
  onSuccess: () => void;
}

const AddTrainingSiteForm: React.FC<AddTrainingSiteFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form initialization
  const form = useForm<TrainingSiteFormValues>({
    resolver: zodResolver(trainingSiteSchema),
    defaultValues: {
      name: "",
      address: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  // Form submission
  const onSubmit = async (data: TrainingSiteFormValues) => {
    try {
      await apiRequest("POST", "/api/training-sites", data);
      
      // Show success message
      toast({
        title: "تم إضافة جهة التدريب بنجاح",
      });
      
      // Reset form
      form.reset();
      
      // Invalidate query cache to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/training-sites"] });
      
      // Call success callback
      onSuccess();
    } catch (error) {
      toast({
        title: "فشل إضافة جهة التدريب",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء إضافة جهة التدريب",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-6">إضافة جهة تدريب جديدة</h2>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>اسم جهة التدريب</FormLabel>
                <FormControl>
                  <Input placeholder="أدخل اسم جهة التدريب" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>العنوان</FormLabel>
                <FormControl>
                  <Textarea placeholder="أدخل عنوان جهة التدريب" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم جهة الاتصال</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل اسم الشخص المسؤول" {...field} />
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
                  <FormLabel>البريد الإلكتروني للتواصل</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل البريد الإلكتروني" type="email" {...field} />
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
                  <FormLabel>رقم الهاتف للتواصل</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل رقم الهاتف" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="flex justify-end space-x-2 space-x-reverse">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onSuccess}
            >
              إلغاء
            </Button>
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary-dark text-white"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "جاري الإضافة..." : "إضافة جهة التدريب"}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
};

export default AddTrainingSiteForm;