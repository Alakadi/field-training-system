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
  facultyId: z.string().min(1, { message: "يرجى اختيار الكلية" }),
  majorId: z.string().min(1, { message: "يرجى اختيار التخصص" }),
  levelId: z.string().min(1, { message: "يرجى اختيار المستوى الدراسي" }),
  assignedCourseGroups: z.array(z.string()).optional().default([]),
});

type AddStudentFormValues = z.infer<typeof addStudentSchema>;

interface AddStudentFormProps {
  onSuccess?: () => void;
}

const AddStudentForm: React.FC<AddStudentFormProps> = ({ onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State for selected values to filter data
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [selectedMajorId, setSelectedMajorId] = useState<string>("");
  const [selectedLevelId, setSelectedLevelId] = useState<string>("");

  // Fetch data
  const { data: faculties = [], isLoading: isLoadingFaculties } = useQuery<any[]>({
    queryKey: ["/api/faculties"],
  });

  const { data: levels = [], isLoading: isLoadingLevels } = useQuery<any[]>({
    queryKey: ["/api/levels"],
  });

  // Fetch majors based on selected faculty
  const { data: majors = [], isLoading: isLoadingMajors } = useQuery({
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

  // Fetch available course groups based on student's faculty, major, and level
  const { data: availableCourseGroups = [], isLoading: isLoadingCourseGroups } = useQuery({
    queryKey: ["/api/training-course-groups", selectedFacultyId, selectedMajorId, selectedLevelId],
    queryFn: async () => {
      if (!selectedFacultyId || !selectedMajorId || !selectedLevelId) return [];
      const params = new URLSearchParams({
        facultyId: selectedFacultyId,
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
    enabled: !!(selectedFacultyId && selectedMajorId && selectedLevelId),
  });

  const form = useForm<AddStudentFormValues>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      name: "",
      universityId: "",
      email: "",
      phone: "",
      facultyId: "",
      majorId: "",
      levelId: "",
      assignedCourseGroups: [],
    },
  });

  const onSubmit = async (data: AddStudentFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Create student first
      const studentResponse = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          universityId: data.universityId,
          email: data.email,
          phone: data.phone,
          facultyId: data.facultyId,
          majorId: data.majorId,
          levelId: data.levelId,
        }),
      });

      if (!studentResponse.ok) {
        const errorData = await studentResponse.json();
        throw new Error(errorData.message || "خطأ في إنشاء الطالب");
      }

      const student = await studentResponse.json();

      // If there are assigned course groups, register student to them
      if (data.assignedCourseGroups && data.assignedCourseGroups.length > 0) {
        for (const groupId of data.assignedCourseGroups) {
          await apiRequest("POST", "/api/training-assignments", {
            studentId: student.id,
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

  // Handle changes to filter available courses
  const handleFacultyChange = (value: string) => {
    setSelectedFacultyId(value);
    setSelectedMajorId("");
    setSelectedLevelId("");
    form.setValue("facultyId", value);
    form.setValue("majorId", "");
    form.setValue("levelId", "");
    form.setValue("assignedCourseGroups", []);
  };

  const handleMajorChange = (value: string) => {
    setSelectedMajorId(value);
    setSelectedLevelId("");
    form.setValue("majorId", value);
    form.setValue("levelId", "");
    form.setValue("assignedCourseGroups", []);
  };

  const handleLevelChange = (value: string) => {
    setSelectedLevelId(value);
    form.setValue("levelId", value);
    form.setValue("assignedCourseGroups", []);
  };

  const isLoading = isLoadingFaculties || isLoadingLevels;

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
            <form className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">المعلومات الأساسية</h3>
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
                        <FormLabel>اسم الطالب</FormLabel>
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
                        <FormLabel>البريد الإلكتروني</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل البريد الإلكتروني" {...field} />
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
                </div>
              </div>

              <Separator />

              {/* Academic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">المعلومات الأكاديمية</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="facultyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الكلية</FormLabel>
                        <Select 
                          onValueChange={handleFacultyChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الكلية" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(faculties) && faculties.map((faculty: any) => (
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
                        <FormLabel>التخصص</FormLabel>
                        <Select 
                          onValueChange={handleMajorChange}
                          value={field.value}
                          disabled={!selectedFacultyId || isLoadingMajors}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر التخصص" />
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
                          onValueChange={handleLevelChange}
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

                  
                </div>
              </div>

              <Separator />

              {/* Training Course Assignment */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">إسناد الدورات التدريبية</h3>
                {!selectedFacultyId || !selectedMajorId || !selectedLevelId ? (
                  <p className="text-sm text-muted-foreground">
                    يرجى اختيار الكلية والتخصص والمستوى الدراسي أولاً لعرض الدورات المتاحة
                  </p>
                ) : isLoadingCourseGroups ? (
                  <p className="text-sm">جاري تحميل الدورات المتاحة...</p>
                ) : availableCourseGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    لا توجد دورات تدريبية متاحة لهذا التخصص والمستوى حالياً
                  </p>
                ) : (
                  <FormField
                    control={form.control}
                    name="assignedCourseGroups"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">الدورات التدريبية المتاحة</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            اختر الدورات التدريبية التي تريد تسجيل الطالب فيها
                          </p>
                        </div>
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
                                    className="flex flex-row items-start space-x-3 space-y-0"
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
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none flex-1">
                                      <FormLabel className="text-sm font-medium">
                                        {group.course?.name} - {group.groupName}
                                      </FormLabel>
                                      <div className="flex flex-wrap gap-2 text-xs">
                                        <Badge variant="outline">{group.site?.name}</Badge>
                                        <Badge variant="outline">
                                          المشرف: {group.supervisor?.user?.name}
                                        </Badge>
                                        <Badge variant="outline">
                                          {group.availableSpots || (group.capacity - group.currentEnrollment)} أماكن متاحة
                                        </Badge>
                                        <Badge variant="outline">
                                          {group.startDate} - {group.endDate}
                                        </Badge>
                                      </div>
                                    </div>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
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
            setSelectedFacultyId("");
            setSelectedMajorId("");
            setSelectedLevelId("");
            if (onSuccess) onSuccess();
          }}
        >
          إلغاء
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AddStudentForm;