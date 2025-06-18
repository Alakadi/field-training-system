import React, { useState, useEffect } from "react";
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
import { Trash2, Plus } from "lucide-react";

// Define schemas
const courseGroupSchema = z.object({
  siteId: z.string().min(1, { message: "يرجى اختيار جهة التدريب" }),
  supervisorId: z.string().min(1, { message: "يرجى اختيار المشرف الأكاديمي" }),
  capacity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "يجب أن يكون عدد الطلاب رقمًا موجبًا",
  }),
  startDate: z.string().min(1, { message: "يرجى تحديد تاريخ البداية" }),
  endDate: z.string().min(1, { message: "يرجى تحديد تاريخ النهاية" }),
});

const addCourseSchema = z.object({
  name: z.string().min(3, { message: "يجب أن يحتوي اسم الدورة على الأقل على 3 أحرف" }),
  facultyId: z.string().min(1, { message: "يرجى اختيار الكلية" }).optional().or(z.literal("")),
  majorId: z.string().min(1, { message: "يرجى اختيار القسم" }).optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  status: z.string().min(1, { message: "يرجى اختيار حالة الدورة" }),
});

type AddCourseFormValues = z.infer<typeof addCourseSchema>;
type CourseGroup = z.infer<typeof courseGroupSchema>;

interface AddCourseFormProps {
  onSuccess?: () => void;
}

const AddCourseForm: React.FC<AddCourseFormProps> = ({ onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [groups, setGroups] = useState<CourseGroup[]>([{ 
    siteId: "", 
    supervisorId: "", 
    capacity: "20", 
    startDate: "", 
    endDate: "" 
  }]);

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

  // Fetch majors based on selected faculty
  const { data: majors, isLoading: isLoadingMajors } = useQuery({
    queryKey: ["/api/majors", selectedFacultyId],
    queryFn: () => fetch(`/api/majors?facultyId=${selectedFacultyId}`).then(res => res.json()),
    enabled: !!selectedFacultyId && selectedFacultyId !== "none",
  });

  const form = useForm<AddCourseFormValues>({
    resolver: zodResolver(addCourseSchema),
    defaultValues: {
      name: "",
      facultyId: "",
      majorId: "",
      location: "",
      description: "",
      status: "upcoming",
    },
  });

  const addGroup = () => {
    setGroups([...groups, { 
      siteId: "", 
      supervisorId: "", 
      capacity: "20", 
      startDate: "", 
      endDate: "" 
    }]);
  };

  const removeGroup = (index: number) => {
    if (groups.length > 1) {
      setGroups(groups.filter((_, i) => i !== index));
    }
  };

  const handleFacultyChange = (facultyId: string) => {
    setSelectedFacultyId(facultyId);
    form.setValue("facultyId", facultyId);
    // Reset major when faculty changes
    form.setValue("majorId", "");
  };

  const updateGroup = (index: number, field: keyof CourseGroup, value: string) => {
    const updatedGroups = [...groups];
    updatedGroups[index] = { ...updatedGroups[index], [field]: value };
    setGroups(updatedGroups);
  };

  const validateGroups = (): boolean => {
    try {
      groups.forEach(group => courseGroupSchema.parse(group));
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

  const onSubmit = async (data: AddCourseFormValues) => {
    if (!validateGroups()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // إعداد بيانات الدورة والمجموعات في طلب واحد
      const payload = {
        ...data,
        // Remove empty facultyId if not selected
        facultyId: data.facultyId === "none" || !data.facultyId ? undefined : Number(data.facultyId),
        majorId: data.majorId === "none" || !data.majorId ? undefined : Number(data.majorId),
        groups: groups.map((group, i) => {
          // Validate required fields
          if (!group.siteId || !group.supervisorId || !group.capacity || !group.startDate || !group.endDate) {
            throw new Error(`بيانات المجموعة ${i + 1} غير مكتملة - تأكد من ملء جميع الحقول المطلوبة`);
          }

          return {
            groupName: `مجموعة ${i + 1}`,
            siteId: Number(group.siteId),
            supervisorId: Number(group.supervisorId),
            capacity: Number(group.capacity),
            startDate: group.startDate,
            endDate: group.endDate,
            location: data.location || null
          };
        })
      };

      console.log("Creating course with groups in single request:", payload);

      // إنشاء الدورة والمجموعات في عملية واحدة
      const response = await apiRequest("POST", "/api/training-courses", payload);
      const result = await response.json();

      if (!result || !result.course) {
        throw new Error("فشل في إنشاء الدورة والمجموعات");
      }

      console.log("Course and groups created successfully:", result);

      toast({
        title: "تم إنشاء الدورة التدريبية بنجاح",
        description: `تم إنشاء دورة "${data.name}" مع ${result.groups.length} مجموعة بنجاح`,
      });

      // Reset form and groups
      form.reset();
      setGroups([{ 
        siteId: "", 
        supervisorId: "", 
        capacity: "20", 
        startDate: "", 
        endDate: "" 
      }]);

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/training-courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-course-groups"] });

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Course creation error:", error);
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
                          onValueChange={handleFacultyChange}
                          defaultValue={field.value}
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
                    name="majorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>القسم</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          disabled={!selectedFacultyId || selectedFacultyId === "none" || isLoadingMajors}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                !selectedFacultyId || selectedFacultyId === "none" 
                                  ? "اختر الكلية أولاً" 
                                  : isLoadingMajors 
                                    ? "جاري تحميل الأقسام..." 
                                    : "اختر القسم"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">لا تختر</SelectItem>
                            {(majors as any[])?.map((major: any) => (
                              <SelectItem key={major.id} value={String(major.id)}>
                                {major.name}
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
                        <CardTitle className="text-base">المجموعة {index + 1}</CardTitle>
                        {groups.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeGroup(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
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
                              {Array.isArray(trainingSites) && trainingSites.map((site: any) => (
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
            setGroups([{ 
              siteId: "", 
              supervisorId: "", 
              capacity: "20", 
              startDate: "", 
              endDate: "" 
            }]);
            if (onSuccess) onSuccess();
          }}
        >
          إلغاء
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AddCourseForm;import React, { useState, useEffect } from "react";
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
import { Trash2, Plus } from "lucide-react";

// Define schemas
const courseGroupSchema = z.object({
  siteId: z.string().min(1, { message: "يرجى اختيار جهة التدريب" }),
  supervisorId: z.string().min(1, { message: "يرجى اختيار المشرف الأكاديمي" }),
  capacity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "يجب أن يكون عدد الطلاب رقمًا موجبًا",
  }),
  startDate: z.string().min(1, { message: "يرجى تحديد تاريخ البداية" }),
  endDate: z.string().min(1, { message: "يرجى تحديد تاريخ النهاية" }),
});

const addCourseSchema = z.object({
  name: z.string().min(3, { message: "يجب أن يحتوي اسم الدورة على الأقل على 3 أحرف" }),
  facultyId: z.string().min(1, { message: "يرجى اختيار الكلية" }).optional().or(z.literal("")),
  majorId: z.string().min(1, { message: "يرجى اختيار القسم" }).optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  status: z.string().min(1, { message: "يرجى اختيار حالة الدورة" }),
});

type AddCourseFormValues = z.infer<typeof addCourseSchema>;
type CourseGroup = z.infer<typeof courseGroupSchema>;

interface AddCourseFormProps {
  onSuccess?: () => void;
}

const AddCourseForm: React.FC<AddCourseFormProps> = ({ onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [groups, setGroups] = useState<CourseGroup[]>([{ 
    siteId: "", 
    supervisorId: "", 
    capacity: "20", 
    startDate: "", 
    endDate: "" 
  }]);

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

  // Fetch majors based on selected faculty
  const { data: majors, isLoading: isLoadingMajors } = useQuery({
    queryKey: ["/api/majors", selectedFacultyId],
    queryFn: () => fetch(`/api/majors?facultyId=${selectedFacultyId}`).then(res => res.json()),
    enabled: !!selectedFacultyId && selectedFacultyId !== "none",
  });

  const form = useForm<AddCourseFormValues>({
    resolver: zodResolver(addCourseSchema),
    defaultValues: {
      name: "",
      facultyId: "",
      majorId: "",
      location: "",
      description: "",
      status: "upcoming",
    },
  });

  const addGroup = () => {
    setGroups([...groups, { 
      siteId: "", 
      supervisorId: "", 
      capacity: "20", 
      startDate: "", 
      endDate: "" 
    }]);
  };

  const removeGroup = (index: number) => {
    if (groups.length > 1) {
      setGroups(groups.filter((_, i) => i !== index));
    }
  };

  const handleFacultyChange = (facultyId: string) => {
    setSelectedFacultyId(facultyId);
    form.setValue("facultyId", facultyId);
    // Reset major when faculty changes
    form.setValue("majorId", "");
  };

  const updateGroup = (index: number, field: keyof CourseGroup, value: string) => {
    const updatedGroups = [...groups];
    updatedGroups[index] = { ...updatedGroups[index], [field]: value };
    setGroups(updatedGroups);
  };

  const validateGroups = (): boolean => {
    try {
      groups.forEach(group => courseGroupSchema.parse(group));
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

  const onSubmit = async (data: AddCourseFormValues) => {
    if (!validateGroups()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // إعداد بيانات الدورة والمجموعات في طلب واحد
      const payload = {
        ...data,
        // Remove empty facultyId if not selected
        facultyId: data.facultyId === "none" || !data.facultyId ? undefined : Number(data.facultyId),
        majorId: data.majorId === "none" || !data.majorId ? undefined : Number(data.majorId),
        groups: groups.map((group, i) => {
          // Validate required fields
          if (!group.siteId || !group.supervisorId || !group.capacity || !group.startDate || !group.endDate) {
            throw new Error(`بيانات المجموعة ${i + 1} غير مكتملة - تأكد من ملء جميع الحقول المطلوبة`);
          }

          return {
            groupName: `مجموعة ${i + 1}`,
            siteId: Number(group.siteId),
            supervisorId: Number(group.supervisorId),
            capacity: Number(group.capacity),
            startDate: group.startDate,
            endDate: group.endDate,
            location: data.location || null
          };
        })
      };

      console.log("Creating course with groups in single request:", payload);

      // إنشاء الدورة والمجموعات في عملية واحدة
      const response = await apiRequest("POST", "/api/training-courses", payload);
      const result = await response.json();
      
      if (!result || !result.course) {
        throw new Error("فشل في إنشاء الدورة والمجموعات");
      }

      console.log("Course and groups created successfully:", result);

      toast({
        title: "تم إنشاء الدورة التدريبية بنجاح",
        description: `تم إنشاء دورة "${data.name}" مع ${result.groups.length} مجموعة بنجاح`,
      });

      // Reset form and groups
      form.reset();
      setGroups([{ 
        siteId: "", 
        supervisorId: "", 
        capacity: "20", 
        startDate: "", 
        endDate: "" 
      }]);

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/training-courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-course-groups"] });

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Course creation error:", error);
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
                          onValueChange={handleFacultyChange}
                          defaultValue={field.value}
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
                    name="majorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>القسم</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          disabled={!selectedFacultyId || selectedFacultyId === "none" || isLoadingMajors}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                !selectedFacultyId || selectedFacultyId === "none" 
                                  ? "اختر الكلية أولاً" 
                                  : isLoadingMajors 
                                    ? "جاري تحميل الأقسام..." 
                                    : "اختر القسم"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">لا تختر</SelectItem>
                            {(majors as any[])?.map((major: any) => (
                              <SelectItem key={major.id} value={String(major.id)}>
                                {major.name}
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
                        <CardTitle className="text-base">المجموعة {index + 1}</CardTitle>
                        {groups.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeGroup(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
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
                              {Array.isArray(trainingSites) && trainingSites.map((site: any) => (
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
            setGroups([{ 
              siteId: "", 
              supervisorId: "", 
              capacity: "20", 
              startDate: "", 
              endDate: "" 
            }]);
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