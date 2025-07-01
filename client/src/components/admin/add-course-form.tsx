import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
// import { queryClient } from "@/lib/queryClient";
const addCourseSchema = z.object({
  name: z.string().min(1, "اسم الدورة مطلوب"),
  facultyId: z.string().min(1, "الكلية مطلوبة"),
  majorId: z.string().min(1, "التخصص مطلوب"),
  levelId: z.string().min(1, "المستوى مطلوب"),
  description: z.string().optional(),
  // إزالة حقل الحالة - سيتم تحديدها تلقائياً بناءً على تواريخ المجموعات
  // إزالة حقل السنة الدراسية - سيتم تحديدها تلقائياً بناءً على تاريخ بدء الكورس
});

const courseGroupSchema = z.object({
  siteId: z.string().min(1, "جهة التدريب مطلوبة"),
  supervisorId: z.string().min(1, "المشرف مطلوب"),
  capacity: z.string().min(1, "السعة مطلوبة"),
  startDate: z.string().min(1, "تاريخ البدء مطلوب"),
  endDate: z.string().min(1, "تاريخ الانتهاء مطلوب"),
});

type AddCourseFormValues = z.infer<typeof addCourseSchema>;
type CourseGroup = z.infer<typeof courseGroupSchema>;

interface AddCourseFormProps {
  onSuccess?: () => void;
}

const AddCourseForm: React.FC<AddCourseFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groups, setGroups] = useState<CourseGroup[]>([
    { 
      siteId: "", 
      supervisorId: "", 
      capacity: "20", 
      startDate: "", 
      endDate: "" 
    }
  ]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");

  // Fetch training sites
  const { data: trainingSites, isLoading: isLoadingSites } = useQuery({
    queryKey: ["/api/training-sites"],
  });

  const { data: faculties, isLoading: isLoadingFaculties } = useQuery({
    queryKey: ["/api/faculties"],
    // queryFn: getQueryFn({ on401: "throw" })// هذا ما كان ناقصًا فقط
  });

  const { data: supervisors, isLoading: isLoadingSupervisors } = useQuery({
    queryKey: ["/api/supervisors"],
  });

  // Fetch levels
  const { data: levels } = useQuery({
    queryKey: ["/api/levels"],
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
      levelId: "",
      description: "",
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

  const updateGroup = (index: number, field: keyof CourseGroup, value: string) => {
    const updatedGroups = [...groups];
    updatedGroups[index] = { ...updatedGroups[index], [field]: value };
    setGroups(updatedGroups);
  };

  const onSubmit = async (data: AddCourseFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Validate groups
      const validatedGroups = groups.map(group => {
        const result = courseGroupSchema.safeParse(group);
        if (!result.success) {
          throw new Error("جميع بيانات المجموعات مطلوبة");
        }
        return {
          ...result.data,
          capacity: parseInt(result.data.capacity),
        };
      });

      // Create the course with groups
      const courseResponse = await fetch("/api/training-courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          groups: validatedGroups,
        }),
      });

      if (!courseResponse.ok) {
        throw new Error("فشل في إنشاء الدورة");
      }

      const courseResult = await courseResponse.json();
      
      // Extract course from result (the API returns { course, groups })
      const course = courseResult.course || courseResult;

      toast({
        title: "تم بنجاح",
        description: "تم إنشاء الدورة التدريبية والمجموعات بنجاح",
      });

      // Reset form
      form.reset();
      setGroups([{ 
        siteId: "", 
        supervisorId: "", 
        capacity: "20", 
        startDate: "", 
        endDate: "" 
      }]);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/training-courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-course-groups"] });

      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: "خطأ",
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Course Information */}
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

                {/* تم إزالة حقل الموقع - سيتم تحديده من خلال مواقع التدريب في المجموعات */}
              </div>

              {/* Academic Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="facultyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الكلية</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedFacultyId(value);
                          form.setValue("majorId", "");
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الكلية" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(faculties) ? faculties.map((faculty: any) => (
                            <SelectItem key={faculty.id} value={faculty.id.toString()}>
                              {faculty.name}
                            </SelectItem>
                          )) : null}
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
                      <FormLabel>التخصص</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !selectedFacultyId ? "اختر الكلية أولاً" : 
                              isLoadingMajors ? "جاري التحميل..." : 
                              "اختر التخصص"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {majors && Array.isArray(majors) && majors.map((major: any) => (
                            <SelectItem key={major.id} value={major.id.toString()}>
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
                  name="levelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المستوى</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المستوى" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {levels && Array.isArray(levels) && levels.map((level: any) => (
                            <SelectItem key={level.id} value={level.id.toString()}>
                              <span>{level.name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              {/* Description */}
              <div className="w-full">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>وصف الدورة</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="أدخل وصفاً تفصيلياً للدورة التدريبية (اختياري) - سيتم تحديد حالة الدورة تلقائياً بناءً على تواريخ المجموعات"
                          className="h-24"
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
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">المجموعة {index + 1}</h4>
                        {groups.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeGroup(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">جهة التدريب</label>
                          <Select 
                            value={group.siteId} 
                            onValueChange={(value) => updateGroup(index, "siteId", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر جهة التدريب" />
                            </SelectTrigger>
                            <SelectContent>
                              {trainingSites && Array.isArray(trainingSites) && trainingSites.map((site: any) => (
                                <SelectItem key={site.id} value={site.id.toString()}>
                                  <span>{site.name}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">المشرف</label>
                          <Select 
                            value={group.supervisorId} 
                            onValueChange={(value) => updateGroup(index, "supervisorId", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر المشرف" />
                            </SelectTrigger>
                            <SelectContent>
                              {supervisors && Array.isArray(supervisors) && supervisors.map((supervisor: any) => (
                                <SelectItem key={supervisor.id} value={supervisor.id.toString()}>
                                  <span>{supervisor.user?.name || supervisor.name}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">السعة</label>
                          <Input
                            type="number"
                            placeholder="20"
                            value={group.capacity}
                            onChange={(e) => updateGroup(index, "capacity", e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium">تاريخ البدء</label>
                          <Input
                            type="date"
                            value={group.startDate}
                            onChange={(e) => updateGroup(index, "startDate", e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium">تاريخ الانتهاء</label>
                          <Input
                            type="date"
                            value={group.endDate}
                            onChange={(e) => updateGroup(index, "endDate", e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end space-x-2 space-x-reverse">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "جاري الحفظ..." : "حفظ"}
                </Button>
                <Button
                  type="button"
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
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};

export default AddCourseForm;