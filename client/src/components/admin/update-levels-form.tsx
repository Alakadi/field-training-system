import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Validation schema
const updateLevelsSchema = z.object({
  fromLevelId: z.string().min(1, { message: "يجب تحديد المستوى الحالي" }),
  toLevelId: z.string().min(1, { message: "يجب تحديد المستوى الجديد" }),
  facultyId: z.string().optional(),
  majorId: z.string().optional(),
});

type UpdateLevelsFormValues = z.infer<typeof updateLevelsSchema>;

interface UpdateLevelsFormProps {
  onSuccess?: () => void;
}

const UpdateLevelsForm: React.FC<UpdateLevelsFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [studentsToUpdate, setStudentsToUpdate] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [previewShown, setPreviewShown] = useState(false);
  
  // Form initialization
  const form = useForm<UpdateLevelsFormValues>({
    resolver: zodResolver(updateLevelsSchema),
    defaultValues: {
      fromLevelId: "",
      toLevelId: "",
      facultyId: "",
      majorId: "",
    },
  });
  
  // Fetch faculties, majors and levels
  const { data: faculties } = useQuery({
    queryKey: ["/api/faculties"]
  });
  
  const { data: levels } = useQuery({
    queryKey: ["/api/levels"]
  });
  
  const { data: majors, isLoading: isLoadingMajors } = useQuery({
    queryKey: ["/api/majors", form.watch("facultyId")],
    enabled: Boolean(form.watch("facultyId"))
  });
  
  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: (data: UpdateLevelsFormValues) => 
      apiRequest("POST", "/api/students/preview-level-update", data),
    onSuccess: (data) => {
      setStudentsToUpdate(data);
      setSelectedStudents(data.map((student: any) => student.id));
      setPreviewShown(true);
    },
    onError: (error: any) => {
      toast({
        title: "فشل تحميل معاينة الطلاب",
        description: error.message || "حدث خطأ أثناء تحميل معاينة الطلاب",
        variant: "destructive",
      });
    },
  });
  
  // Update levels mutation
  const updateLevelsMutation = useMutation({
    mutationFn: (data: { studentIds: number[], toLevelId: string }) => 
      apiRequest("POST", "/api/students/update-levels", data),
    onSuccess: () => {
      toast({
        title: "تم تحديث مستويات الطلاب بنجاح",
      });
      setStudentsToUpdate([]);
      setSelectedStudents([]);
      setPreviewShown(false);
      form.reset();
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "فشل تحديث مستويات الطلاب",
        description: error.message || "حدث خطأ أثناء تحديث مستويات الطلاب",
        variant: "destructive",
      });
    },
  });
  
  // Handle preview submission
  const onPreviewSubmit = (data: UpdateLevelsFormValues) => {
    previewMutation.mutate(data);
  };
  
  // Handle update submission
  const handleUpdate = () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "لم يتم تحديد أي طالب",
        description: "يرجى تحديد طالب واحد على الأقل للتحديث",
        variant: "destructive",
      });
      return;
    }
    
    updateLevelsMutation.mutate({
      studentIds: selectedStudents,
      toLevelId: form.getValues("toLevelId")
    });
  };
  
  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(studentsToUpdate.map((student) => student.id));
    } else {
      setSelectedStudents([]);
    }
  };
  
  // Handle single student selection
  const handleStudentSelect = (studentId: number, checked: boolean) => {
    if (checked) {
      setSelectedStudents([...selectedStudents, studentId]);
    } else {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    }
  };

  return (
    <Card className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-6">تحديث مستويات الطلاب</h2>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onPreviewSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="facultyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الكلية</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("majorId", "");
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الكلية" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">جميع الكليات</SelectItem>
                        {faculties?.map((faculty: any) => (
                          <SelectItem key={faculty.id} value={faculty.id.toString()}>
                            {faculty.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    اختر الكلية لتصفية الطلاب حسب الكلية (اختياري)
                  </FormDescription>
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
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!form.watch("facultyId") || form.watch("facultyId") === "all" || isLoadingMajors}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingMajors ? "جاري التحميل..." : "اختر التخصص"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">جميع التخصصات</SelectItem>
                        {majors?.map((major: any) => (
                          <SelectItem key={major.id} value={major.id.toString()}>
                            {major.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    اختر التخصص لتصفية الطلاب حسب التخصص (اختياري)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fromLevelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المستوى الحالي</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المستوى الحالي" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        {levels?.map((level: any) => (
                          <SelectItem key={level.id} value={level.id.toString()}>
                            {level.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    اختر المستوى الحالي للطلاب المراد تحديثهم
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="toLevelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المستوى الجديد</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المستوى الجديد" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        {levels?.map((level: any) => (
                          <SelectItem key={level.id} value={level.id.toString()}>
                            {level.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    اختر المستوى الجديد الذي سيتم تحديث الطلاب إليه
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="flex justify-end">
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary-dark text-white"
              disabled={previewMutation.isPending}
            >
              {previewMutation.isPending ? "جاري البحث..." : "معاينة الطلاب"}
            </Button>
          </div>
        </form>
      </Form>
      
      {previewShown && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">معاينة الطلاب ({studentsToUpdate.length})</h3>
          
          {studentsToUpdate.length === 0 ? (
            <Alert className="mb-4">
              <AlertTitle>لا يوجد طلاب</AlertTitle>
              <AlertDescription>
                لم يتم العثور على طلاب مطابقين للمعايير المحددة.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="mb-4 flex items-center">
                <Checkbox
                  id="selectAll"
                  checked={selectedStudents.length === studentsToUpdate.length}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="selectAll" className="mr-2 text-sm">
                  تحديد الكل ({studentsToUpdate.length})
                </label>
                <span className="mr-4 text-sm text-muted-foreground">
                  تم تحديد {selectedStudents.length} من {studentsToUpdate.length}
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableCaption>قائمة الطلاب المراد تحديث مستوياتهم</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>الرقم الجامعي</TableHead>
                      <TableHead>اسم الطالب</TableHead>
                      <TableHead>الكلية</TableHead>
                      <TableHead>التخصص</TableHead>
                      <TableHead>المستوى الحالي</TableHead>
                      <TableHead>المستوى الجديد</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsToUpdate.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={(checked) => 
                              handleStudentSelect(student.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>{student.universityId}</TableCell>
                        <TableCell>{student.user.name}</TableCell>
                        <TableCell>{student.faculty?.name || "-"}</TableCell>
                        <TableCell>{student.major?.name || "-"}</TableCell>
                        <TableCell>{student.level?.name || "-"}</TableCell>
                        <TableCell>
                          {levels?.find((level: any) => level.id.toString() === form.getValues("toLevelId"))?.name || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="ml-2"
                  onClick={() => setPreviewShown(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  className="bg-primary hover:bg-primary-dark text-white"
                  disabled={updateLevelsMutation.isPending || selectedStudents.length === 0}
                  onClick={handleUpdate}
                >
                  {updateLevelsMutation.isPending ? "جاري التحديث..." : "تحديث المستويات"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
};

export default UpdateLevelsForm;