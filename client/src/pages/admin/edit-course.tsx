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
import Icon from "@/components/ui/icon-map";
import { Trash2, Plus, Edit2 } from "lucide-react";

// Define schemas
const courseGroupSchema = z.object({
  id: z.number().optional(),
  siteId: z.string().min(1, { message: "يرجى اختيار جهة التدريب" }),
  supervisorId: z.string().min(1, { message: "يرجى اختيار المشرف الأكاديمي" }),
  capacity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "يجب أن يكون عدد الطلاب رقمًا موجبًا",
  }),
  startDate: z.string().min(1, { message: "يرجى تحديد تاريخ البداية" }),
  endDate: z.string().min(1, { message: "يرجى تحديد تاريخ النهاية" }),
  location: z.string().optional(),
  groupName: z.string().optional(),
});

const editCourseSchema = z.object({
  name: z.string().min(3, { message: "يجب أن يحتوي اسم الدورة على الأقل على 3 أحرف" }),
  facultyId: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  status: z.string().min(1, { message: "يرجى اختيار حالة الدورة" }),
});

type EditCourseFormValues = z.infer<typeof editCourseSchema>;
type CourseGroup = z.infer<typeof courseGroupSchema>;

const EditCourse: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [deletedGroups, setDeletedGroups] = useState<number[]>([]);

  // Fetch course data
  const { data: course, isLoading: isLoadingCourse, error } = useQuery({
    queryKey: [`/api/training-courses/${id}`],
    enabled: !!id,
  });

  // Fetch course groups
  const { data: courseGroups, isLoading: isLoadingGroups } = useQuery({
    queryKey: [`/api/training-course-groups?courseId=${id}`],
    enabled: !!id,
  });

  // Fetch related data
  const { data: trainingSites } = useQuery({
    queryKey: ["/api/training-sites"],
  });

  const { data: faculties } = useQuery({
    queryKey: ["/api/faculties"],
  });

  const { data: supervisors } = useQuery({
    queryKey: ["/api/supervisors"],
  });

  const form = useForm<EditCourseFormValues>({
    resolver: zodResolver(editCourseSchema),
    defaultValues: {
      name: "",
      facultyId: "",
      location: "",
      description: "",
      status: "upcoming",
    },
  });

  // Initialize form when course data is loaded
  useEffect(() => {
    if (course) {
      form.reset({
        name: (course as any).name || "",
        facultyId: (course as any).facultyId ? String((course as any).facultyId) : "",
        location: (course as any).location || "",
        description: (course as any).description || "",
        status: (course as any).status || "upcoming",
      });
    }
  }, [course, form]);

  // Initialize groups when course groups data is loaded
  useEffect(() => {
    if (courseGroups && (courseGroups as any[]).length > 0) {
      const formattedGroups = (courseGroups as any[]).map((group: any) => ({
        id: group.id,
        siteId: String(group.siteId),
        supervisorId: String(group.supervisorId),
        capacity: String(group.capacity),
        startDate: group.startDate ? group.startDate.split('T')[0] : "",
        endDate: group.endDate ? group.endDate.split('T')[0] : "",
        location: group.location || "",
        groupName: group.groupName || "",
      }));
      setGroups(formattedGroups);
    } else if (!isLoadingGroups && groups.length === 0) {
      // If no groups exist, add one empty group
      setGroups([{ 
        siteId: "", 
        supervisorId: "", 
        capacity: "20", 
        startDate: "", 
        endDate: "",
        location: "",
        groupName: ""
      }]);
    }
  }, [courseGroups, isLoadingGroups]);

  const addGroup = () => {
    setGroups([...groups, { 
      siteId: "", 
      supervisorId: "", 
      capacity: "20", 
      startDate: "", 
      endDate: "",
      location: "",
      groupName: ""
    }]);
  };

  const removeGroup = (index: number) => {
    const group = groups[index];
    if (group.id) {
      // Mark existing group for deletion
      setDeletedGroups([...deletedGroups, group.id]);
    }
    setGroups(groups.filter((_, i) => i !== index));
  };

  const updateGroup = (index: number, field: keyof CourseGroup, value: string) => {
    const updatedGroups = [...groups];
    updatedGroups[index] = { ...updatedGroups[index], [field]: value };
    setGroups(updatedGroups);
  };

  const validateGroups = (): boolean => {
    try {
      groups.forEach(group => {
        const { id, ...groupData } = group;
        courseGroupSchema.omit({ id: true }).parse(groupData);
      });
      return true;
    } catch (error) {
      toast({
        title: "خطأ في بيانات المجموعات",
        description: "يرجى التأكد من إكمال جميع بيانات المجموعات بشكل صحيح",
        variant: "destructive",
      });
      return false;
    }
  };

  const onSubmit = async (data: EditCourseFormValues) => {
    if (!validateGroups()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Update the course
      const courseData = {
        ...data,
        facultyId: data.facultyId === "none" || !data.facultyId ? undefined : Number(data.facultyId),
      };

      await apiRequest("PUT", `/api/training-courses/${id}`, courseData);

      // Delete removed groups
      for (const groupId of deletedGroups) {
        await apiRequest("DELETE", `/api/training-course-groups/${groupId}`);
      }

      // Update or create groups
      const groupPromises = groups.map(async (group, index) => {
        const groupData = {
          courseId: Number(id),
          groupName: group.groupName || `المجموعة ${index + 1}`,
          siteId: Number(group.siteId),
          supervisorId: Number(group.supervisorId),
          capacity: Number(group.capacity),
          location: group.location,
          startDate: group.startDate,
          endDate: group.endDate
        };

        console.log("Processing group:", { id: group.id, groupData });

        if (group.id) {
          // Update existing group
          return await apiRequest("PUT", `/api/training-course-groups/${group.id}`, groupData);
        } else {
          // Create new group
          return await apiRequest("POST", "/api/training-course-groups", groupData);
        }
      });

      await Promise.all(groupPromises);

      toast({
        title: "تم تحديث الدورة التدريبية بنجاح",
        description: `تم تحديث دورة "${data.name}" مع ${groups.length} مجموعة بنجاح`,
      });

      // Reset deleted groups
      setDeletedGroups([]);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/training-courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-course-groups"] });

      // Navigate back to courses list
      setLocation("/admin/courses");

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
        <div className="flex justify-center items-center h-64">
          <p className="text-lg">جاري تحميل بيانات الدورة...</p>
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
            <Icon name="chevron_right" size={16} />
            العودة إلى القائمة
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              تفاصيل الدورة التدريبية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                {/* Course Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">معلومات الدورة الأساسية</h3>
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
                      name="facultyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الكلية</FormLabel>
                          <Select 
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الكلية" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">لا تختر</SelectItem>
                              {(faculties as any[])?.map((faculty: any) => (
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
                            value={field.value}
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
                </div>

                {/* Course Groups */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold border-b pb-2">مجموعات الدورة</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addGroup}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة مجموعة
                    </Button>
                  </div>

                  {groups.map((group, index) => (
                    <Card key={index} className="border-2 border-dashed">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            المجموعة {index + 1}
                            {group.id && <span className="text-sm text-gray-500 font-normal"> (موجودة)</span>}
                          </CardTitle>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeGroup(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">جهة التدريب</label>
                            <Select 
                              value={group.siteId}
                              onValueChange={(value) => updateGroup(index, 'siteId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="اختر جهة التدريب" />
                              </SelectTrigger>
                              <SelectContent>
                                {(trainingSites as any[])?.map((site: any) => (
                                  <SelectItem key={site.id} value={String(site.id)}>
                                    {site.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="text-sm font-medium">المشرف الأكاديمي</label>
                            <Select 
                              value={group.supervisorId}
                              onValueChange={(value) => updateGroup(index, 'supervisorId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="اختر المشرف الأكاديمي" />
                              </SelectTrigger>
                              <SelectContent>
                                {(supervisors as any[])?.map((supervisor: any) => (
                                  <SelectItem key={supervisor.id} value={String(supervisor.id)}>
                                    {supervisor.user.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="text-sm font-medium">عدد الطلاب</label>
                            <Input 
                              type="number" 
                              min="1" 
                              placeholder="أدخل عدد الطلاب" 
                              value={group.capacity}
                              onChange={(e) => updateGroup(index, 'capacity', e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium">تاريخ البداية</label>
                            <Input 
                              type="date" 
                              value={group.startDate}
                              onChange={(e) => updateGroup(index, 'startDate', e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium">تاريخ النهاية</label>
                            <Input 
                              type="date" 
                              value={group.endDate}
                              onChange={(e) => updateGroup(index, 'endDate', e.target.value)}
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="text-sm font-medium">الموقع (اختياري)</label>
                            <Input 
                              placeholder="أدخل موقع التدريب" 
                              value={group.location || ""}
                              onChange={(e) => updateGroup(index, 'location', e.target.value)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
              onClick={() => setLocation("/admin/courses")}
            >
              إلغاء
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default EditCourse;