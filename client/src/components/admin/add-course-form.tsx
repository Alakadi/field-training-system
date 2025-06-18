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

  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Fetch faculties
  const { data: faculties } = useQuery({
    queryKey: ["/api/faculties"],
  });

  // Fetch majors for selected faculty
  const { data: majors } = useQuery({
    queryKey: ["/api/majors", selectedFacultyId],
    queryFn: async () => {
      if (!selectedFacultyId) return [];
      const res = await fetch(`/api/majors?facultyId=${selectedFacultyId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch majors");
      return res.json();
    },
    enabled: !!selectedFacultyId,
  });

  // Fetch training sites
  const { data: trainingSites } = useQuery({
    queryKey: ["/api/training-sites"],
  });

  // Fetch supervisors
  const { data: supervisors } = useQuery({
    queryKey: ["/api/supervisors"],
  });

  const handleFacultyChange = (facultyId: string) => {
    setSelectedFacultyId(facultyId);
    form.setValue("facultyId", facultyId);
    form.setValue("majorId", ""); // Reset major selection
  };

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
    try {
      setIsSubmitting(true);

      // Validate groups
      const validGroups = groups.filter(group => 
        group.siteId && group.supervisorId && group.capacity && group.startDate && group.endDate
      );

      if (validGroups.length === 0) {
        toast({
          title: "خطأ",
          description: "يجب إضافة مجموعة واحدة على الأقل مع جميع البيانات المطلوبة",
          variant: "destructive",
        });
        return;
      }

      // Validate date ranges for each group
      for (const group of validGroups) {
        if (new Date(group.startDate) >= new Date(group.endDate)) {
          toast({
            title: "خطأ في التاريخ",
            description: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية",
            variant: "destructive",
          });
          return;
        }
      }

      const courseData = {
        ...data,
        facultyId: data.facultyId || null,
        majorId: data.majorId || null,
        groups: validGroups.map(group => ({
          ...group,
          capacity: parseInt(group.capacity),
        })),
      };

      await apiRequest("/api/training-courses", {
        method: "POST",
        body: JSON.stringify(courseData),
      });

      toast({
        title: "تم بنجاح",
        description: "تم إضافة الدورة التدريبية بنجاح",
      });

      form.reset();
      setGroups([{ siteId: "", supervisorId: "", capacity: "20", startDate: "", endDate: "" }]);
      setSelectedFacultyId("");
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/training-courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-course-groups"] });
      
      onSuccess?.();
    } catch (error: any) {
      console.error("Error adding course:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إضافة الدورة التدريبية",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>إضافة دورة تدريبية جديدة</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Course Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الدورة التدريبية *</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسم الدورة التدريبية" {...field} />
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
                    <FormLabel>حالة الدورة *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حالة الدورة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="upcoming">قادمة</SelectItem>
                        <SelectItem value="active">نشطة</SelectItem>
                        <SelectItem value="completed">مكتملة</SelectItem>
                        <SelectItem value="cancelled">ملغية</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="facultyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الكلية</FormLabel>
                    <Select onValueChange={handleFacultyChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الكلية" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">جميع الكليات</SelectItem>
                        {faculties?.map((faculty: any) => (
                          <SelectItem key={faculty.id} value={faculty.id.toString()}>
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedFacultyId}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر القسم" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">جميع الأقسام</SelectItem>
                        {majors?.map((major: any) => (
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
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الموقع</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل موقع الدورة التدريبية" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف</FormLabel>
                  <FormControl>
                    <Textarea placeholder="أدخل وصف الدورة التدريبية" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Course Groups */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">مجموعات الدورة التدريبية</h3>
                <Button type="button" onClick={addGroup} variant="outline" size="sm">
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة مجموعة
                </Button>
              </div>

              {groups.map((group, index) => (
                <div key={index} className="border rounded-lg p-4 mb-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">المجموعة {index + 1}</h4>
                    {groups.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeGroup(index)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">جهة التدريب *</label>
                      <Select
                        value={group.siteId}
                        onValueChange={(value) => updateGroup(index, "siteId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر جهة التدريب" />
                        </SelectTrigger>
                        <SelectContent>
                          {trainingSites?.map((site: any) => (
                            <SelectItem key={site.id} value={site.id.toString()}>
                              {site.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">المشرف الأكاديمي *</label>
                      <Select
                        value={group.supervisorId}
                        onValueChange={(value) => updateGroup(index, "supervisorId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المشرف" />
                        </SelectTrigger>
                        <SelectContent>
                          {supervisors?.map((supervisor: any) => (
                            <SelectItem key={supervisor.id} value={supervisor.id.toString()}>
                              {supervisor.user?.name || supervisor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">عدد الطلاب المسموح *</label>
                      <Input
                        type="number"
                        min="1"
                        value={group.capacity}
                        onChange={(e) => updateGroup(index, "capacity", e.target.value)}
                        placeholder="20"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">تاريخ البداية *</label>
                      <Input
                        type="date"
                        value={group.startDate}
                        onChange={(e) => updateGroup(index, "startDate", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">تاريخ النهاية *</label>
                      <Input
                        type="date"
                        value={group.endDate}
                        onChange={(e) => updateGroup(index, "endDate", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "جاري الإضافة..." : "إضافة الدورة التدريبية"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AddCourseForm;