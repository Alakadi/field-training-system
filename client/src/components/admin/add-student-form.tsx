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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// Define schema
const addStudentSchema = z.object({
  name: z.string().min(3, { message: "يجب أن يحتوي الاسم على الأقل على 3 أحرف" }),
  universityId: z.string().min(4, { message: "يجب أن يحتوي الرقم الجامعي على الأقل على 4 أرقام" }),
  email: z.string().email({ message: "يرجى إدخال بريد إلكتروني صالح" }).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  majorId: z.string().min(1, { message: "يرجى اختيار التخصص" }),
  levelId: z.string().min(1, { message: "يرجى اختيار المستوى الدراسي" }),
  supervisorId: z.string().min(1, { message: "يرجى اختيار المشرف الأكاديمي" }).optional().or(z.literal("")),
  assignedCourseGroups: z.array(z.string()).optional(),
});

type AddStudentFormValues = z.infer<typeof addStudentSchema>;

interface AddStudentFormProps {
  onSuccess?: () => void;
}

const AddStudentForm: React.FC<AddStudentFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [selectedMajorId, setSelectedMajorId] = useState<string>("");
  const [selectedLevelId, setSelectedLevelId] = useState<string>("");

  // Fetch required data
  const { data: faculties = [], isLoading: isLoadingFaculties } = useQuery({
    queryKey: ["/api/faculties"],
  });

  // Fetch majors filtered by selected faculty
  const { data: majors = [] } = useQuery({
    queryKey: ["/api/majors", selectedFacultyId],
    queryFn: async () => {
      if (!selectedFacultyId) return [];
      const params = new URLSearchParams({ facultyId: selectedFacultyId });
      const res = await fetch(`/api/majors?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch majors");
      return res.json();
    },
    enabled: !!selectedFacultyId,
  });

  const { data: levels = [], isLoading: isLoadingLevels } = useQuery({
    queryKey: ["/api/levels"],
  });

  const { data: supervisors = [], isLoading: isLoadingSupervisors } = useQuery({
    queryKey: ["/api/supervisors"],
  });

  // Fetch available course groups based on student's major and level
  const { data: availableCourseGroups = [], isLoading: isLoadingCourseGroups } = useQuery({
    queryKey: ["/api/training-course-groups", selectedMajorId, selectedLevelId],
    queryFn: async () => {
      if (!selectedMajorId || !selectedLevelId) return [];
      const params = new URLSearchParams({
        majorId: selectedMajorId,
        levelId: selectedLevelId,
        available: "true"
      });
      const res = await fetch(`/api/training-course-groups?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch course groups");
      return res.json();
    },
    enabled: !!(selectedMajorId && selectedLevelId),
  });

  const form = useForm<AddStudentFormValues>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      name: "",
      universityId: "",
      email: "",
      phone: "",
      majorId: "",
      levelId: "",
      supervisorId: "",
      assignedCourseGroups: [],
    },
  });

  const onSubmit = async (data: AddStudentFormValues) => {
    try {
      setIsSubmitting(true);

      // Create student first
      const response: any = await apiRequest("POST", "/api/students", {
        name: data.name,
        universityId: data.universityId,
        email: data.email,
        phone: data.phone,
        majorId: data.majorId,
        levelId: data.levelId,
        supervisorId: data.supervisorId,
      });

      // If there are assigned course groups, register student to them
      if (data.assignedCourseGroups && data.assignedCourseGroups.length > 0) {
        for (const groupId of data.assignedCourseGroups) {
          await apiRequest("POST", "/api/training-assignments", {
            studentId: response.id,
            groupId: parseInt(groupId),
          });
        }
      }

      toast({
        title: "تم إضافة الطالب بنجاح",
        description: `تم إضافة الطالب ${data.name} بنجاح${data.assignedCourseGroups?.length ? ` وتسجيله في ${data.assignedCourseGroups.length} مجموعة تدريبية` : ''}`,
      });

      // Reset form
      form.reset();
      setSelectedFacultyId("");
      setSelectedMajorId("");
      setSelectedLevelId("");

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments"] });

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "فشل إضافة الطالب",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء إضافة الطالب",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle faculty change to filter majors
  const handleFacultyChange = (value: string) => {
    setSelectedFacultyId(value);
    setSelectedMajorId("");
    setSelectedLevelId("");
    form.setValue("majorId", "");
    form.setValue("levelId", "");
    form.setValue("assignedCourseGroups", []);
  };

  // Handle major change to filter courses
  const handleMajorChange = (value: string) => {
    setSelectedMajorId(value);
    setSelectedLevelId("");
    form.setValue("levelId", "");
    form.setValue("assignedCourseGroups", []);
  };

  const handleLevelChange = (value: string) => {
    setSelectedLevelId(value);
    form.setValue("levelId", value);
    form.setValue("assignedCourseGroups", []);
  };

  const isLoading = isLoadingFaculties || isLoadingLevels || isLoadingSupervisors;

  return (
    <Card>
      <CardHeader>
        <CardTitle>إضافة طالب جديد</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center p-4">جاري تحميل البيانات...</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="universityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الرقم الجامعي</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل الرقم الجامعي" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل اسم الطالب" {...field} />
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
                      <FormLabel>البريد الإلكتروني (اختياري)</FormLabel>
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
                      <FormLabel>رقم الهاتف (اختياري)</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل رقم الهاتف" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Faculty Selection for UI filtering only */}
                <div className="col-span-full">
                  <label className="text-sm font-medium">الكلية (لتصفية التخصصات)</label>
                  <Select
                    value={selectedFacultyId}
                    onValueChange={handleFacultyChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الكلية لعرض التخصصات" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(faculties) && faculties.map((faculty: any) => (
                        <SelectItem key={faculty.id} value={String(faculty.id)}>
                          {faculty.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <FormField
                  control={form.control}
                  name="majorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>التخصص</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleMajorChange(value);
                        }}
                        value={field.value}
                        disabled={!selectedFacultyId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedFacultyId ? "اختر التخصص" : "اختر الكلية أولاً"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(majors) && majors.map((major: any) => (
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
                  name="levelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المستوى الدراسي</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleLevelChange(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المستوى" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(levels) && levels.map((level: any) => (
                            <SelectItem key={level.id} value={String(level.id)}>
                              {level.name}
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
                      <FormLabel>المشرف الأكاديمي (اختياري)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المشرف" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(supervisors) && supervisors.map((supervisor: any) => (
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
              </div>

              {/* Course Groups Assignment */}
              {selectedMajorId && selectedLevelId && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="text-lg font-medium mb-4">تسجيل في مجموعات تدريبية</h3>
                    <FormField
                      control={form.control}
                      name="assignedCourseGroups"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">المجموعات المتاحة:</FormLabel>
                          </div>
                          {isLoadingCourseGroups ? (
                            <div className="text-center p-4">جاري تحميل المجموعات...</div>
                          ) : availableCourseGroups.length === 0 ? (
                            <div className="text-center p-4 text-muted-foreground">
                              لا توجد مجموعات تدريبية متاحة لهذا التخصص والمستوى
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-4">
                              {availableCourseGroups.map((group: any) => (
                                <FormField
                                  key={group.id}
                                  control={form.control}
                                  name="assignedCourseGroups"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={group.id}
                                        className="flex flex-row items-start space-x-3 space-y-0 border rounded-lg p-4"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(String(group.id))}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, String(group.id)])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value) => value !== String(group.id)
                                                    )
                                                  );
                                            }}
                                          />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                          <FormLabel className="font-medium">
                                            {group.course?.name || 'دورة غير محددة'}
                                          </FormLabel>
                                          <div className="flex gap-2 flex-wrap">
                                            <Badge variant="outline">
                                              {group.site?.name || 'موقع غير محدد'}
                                            </Badge>
                                            <Badge variant="outline">
                                              السعة: {group.capacity}
                                            </Badge>
                                            <Badge variant="outline">
                                              المسجلين: {group._count?.students || 0}
                                            </Badge>
                                          </div>
                                        </div>
                                      </FormItem>
                                    );
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              <CardFooter className="flex justify-end gap-2 p-0 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setSelectedFacultyId("");
                    setSelectedMajorId("");
                    setSelectedLevelId("");
                  }}
                  disabled={isSubmitting}
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "جاري الإضافة..." : "إضافة الطالب"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};

export default AddStudentForm;