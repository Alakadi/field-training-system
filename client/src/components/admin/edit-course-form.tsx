
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import AdminLayout from "@/components/layout/admin-layout";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const editCourseSchema = z.object({
  name: z.string().min(1, { message: "اسم الدورة مطلوب" }),
  siteId: z.string().min(1, { message: "جهة التدريب مطلوبة" }),
  facultyId: z.string().optional(),
  supervisorId: z.string().optional(),
  startDate: z.string().min(1, { message: "تاريخ البداية مطلوب" }),
  endDate: z.string().min(1, { message: "تاريخ النهاية مطلوب" }),
  description: z.string().optional(),
  capacity: z.string().min(1, { message: "السعة مطلوبة" }),
  location: z.string().optional(),
  status: z.string().min(1, { message: "الحالة مطلوبة" })
});

export default function EditCourseForm() {
  const [_, setLocation] = useLocation();
  const courseId = window.location.pathname.split("/").pop();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: [`/api/training-courses/${courseId}`],
  });

  const { data: sites } = useQuery({
    queryKey: ["/api/training-sites"],
  });

  const { data: faculties } = useQuery({
    queryKey: ["/api/faculties"],
  });

  const { data: supervisors } = useQuery({
    queryKey: ["/api/supervisors"],
  });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(editCourseSchema),
  });

  useEffect(() => {
    if (course) {
      setValue("name", course.name);
      setValue("siteId", String(course.siteId));
      setValue("facultyId", course.facultyId ? String(course.facultyId) : "");
      setValue("supervisorId", course.supervisorId ? String(course.supervisorId) : "");
      setValue("startDate", course.startDate.split("T")[0]);
      setValue("endDate", course.endDate.split("T")[0]);
      setValue("description", course.description || "");
      setValue("capacity", String(course.capacity));
      setValue("location", course.location || "");
      setValue("status", course.status);
    }
  }, [course, setValue]);

  const updateCourse = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/training-courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("فشل تحديث الدورة");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-courses"] });
      toast({ title: "تم تحديث الدورة بنجاح" });
      setLocation("/admin/courses");
    },
    onError: (error: Error) => {
      toast({
        title: "فشل تحديث الدورة",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    updateCourse.mutate({
      ...data,
      siteId: parseInt(data.siteId),
      facultyId: data.facultyId ? parseInt(data.facultyId) : null,
      supervisorId: data.supervisorId ? parseInt(data.supervisorId) : null,
      capacity: parseInt(data.capacity),
    });
  };

  if (isLoading) {
    return <div>جاري التحميل...</div>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">تعديل الدورة التدريبية</h1>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">اسم الدورة</label>
                <Input {...register("name")} />
                {errors.name && <p className="text-sm text-red-500">{errors.name.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">جهة التدريب</label>
                <Select defaultValue="" onValueChange={(value) => setValue("siteId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر جهة التدريب" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites?.map((site: any) => (
                      <SelectItem key={site.id} value={String(site.id)}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.siteId && <p className="text-sm text-red-500">{errors.siteId.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">الكلية</label>
                <Select defaultValue="" onValueChange={(value) => setValue("facultyId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الكلية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">بدون كلية</SelectItem>
                    {faculties?.map((faculty: any) => (
                      <SelectItem key={faculty.id} value={String(faculty.id)}>
                        {faculty.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">المشرف</label>
                <Select defaultValue="" onValueChange={(value) => setValue("supervisorId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المشرف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">بدون مشرف</SelectItem>
                    {supervisors?.map((supervisor: any) => (
                      <SelectItem key={supervisor.id} value={String(supervisor.id)}>
                        {supervisor.user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">تاريخ البداية</label>
                <Input type="date" {...register("startDate")} />
                {errors.startDate && <p className="text-sm text-red-500">{errors.startDate.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">تاريخ النهاية</label>
                <Input type="date" {...register("endDate")} />
                {errors.endDate && <p className="text-sm text-red-500">{errors.endDate.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">السعة</label>
                <Input type="number" {...register("capacity")} />
                {errors.capacity && <p className="text-sm text-red-500">{errors.capacity.message as string}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">الموقع</label>
                <Input {...register("location")} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">الحالة</label>
                <Select defaultValue="" onValueChange={(value) => setValue("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="upcoming">قادم</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-sm text-red-500">{errors.status.message as string}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">الوصف</label>
              <Textarea {...register("description")} />
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/admin/courses")}
              >
                إلغاء
              </Button>
              <Button type="submit">
                حفظ التغييرات
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AdminLayout>
  );
}
