import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Calendar } from "lucide-react";

interface AcademicYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  createdAt: string;
}

const academicYearSchema = z.object({
  name: z.string().min(1, "يرجى إدخال اسم السنة الدراسية"),
  startDate: z.string().min(1, "يرجى اختيار تاريخ البداية"),
  endDate: z.string().min(1, "يرجى اختيار تاريخ النهاية"),
  isCurrent: z.boolean().default(false),
}).refine((data) => {
  // Extract years from the academic year name (e.g., "2024/2025")
  const yearMatch = data.name.match(/(\d{4})\/(\d{4})/);
  if (!yearMatch) {
    return true; // Skip validation if name format is not recognized
  }

  const startYear = parseInt(yearMatch[1]);
  const endYear = parseInt(yearMatch[2]);
  
  const startDateYear = new Date(data.startDate).getFullYear();
  const endDateYear = new Date(data.endDate).getFullYear();

  // Validate start date year
  if (startDateYear !== startYear) {
    return false;
  }

  // Validate end date year
  if (endDateYear !== endYear) {
    return false;
  }

  // Ensure start date is before end date
  if (new Date(data.startDate) >= new Date(data.endDate)) {
    return false;
  }

  return true;
}, {
  message: "التواريخ لا تتطابق مع السنة الدراسية المحددة",
  path: ["startDate"], // This will show the error on the start date field
});

type AcademicYearFormData = z.infer<typeof academicYearSchema>;

export default function AcademicYearsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const { toast } = useToast();

  const form = useForm<AcademicYearFormData>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
    },
  });

  // جلب السنوات الدراسية
  const { data: academicYears = [], isLoading } = useQuery({
    queryKey: ["/api/academic-years"],
  });

  // إنشاء سنة دراسية جديدة
  const createMutation = useMutation({
    mutationFn: (data: AcademicYearFormData) =>
      apiRequest("POST", "/api/academic-years", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academic-years"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "تم الحفظ",
        description: "تم إنشاء السنة الدراسية بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: error.response?.data?.message || "حدث خطأ أثناء الحفظ",
      });
    },
  });

  // تحديث سنة دراسية
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AcademicYearFormData }) =>
      apiRequest("PUT", `/api/academic-years/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academic-years"] });
      setIsDialogOpen(false);
      setEditingYear(null);
      form.reset();
      toast({
        title: "تم التحديث",
        description: "تم تحديث السنة الدراسية بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: error.response?.data?.message || "حدث خطأ أثناء التحديث",
      });
    },
  });

  // Custom validation function for academic year dates
  const validateAcademicYearDates = (data: AcademicYearFormData) => {
    const yearMatch = data.name.match(/(\d{4})\/(\d{4})/);
    if (!yearMatch) {
      return { isValid: true, error: null };
    }

    const startYear = parseInt(yearMatch[1]);
    const endYear = parseInt(yearMatch[2]);
    
    const startDateYear = new Date(data.startDate).getFullYear();
    const endDateYear = new Date(data.endDate).getFullYear();

    // Check start date year
    if (startDateYear !== startYear) {
      return {
        isValid: false,
        error: `تاريخ البداية يجب أن يكون في سنة ${startYear}، التاريخ المدخل في سنة ${startDateYear}`
      };
    }

    // Check end date year
    if (endDateYear !== endYear) {
      return {
        isValid: false,
        error: `تاريخ النهاية يجب أن يكون في سنة ${endYear}، التاريخ المدخل في سنة ${endDateYear}`
      };
    }

    // Check that start date is before end date
    if (new Date(data.startDate) >= new Date(data.endDate)) {
      return {
        isValid: false,
        error: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية"
      };
    }

    return { isValid: true, error: null };
  };

  const onSubmit = (data: AcademicYearFormData) => {
    // Perform custom validation
    const validation = validateAcademicYearDates(data);
    
    if (!validation.isValid) {
      toast({
        variant: "destructive",
        title: "خطأ في التواريخ",
        description: validation.error,
      });
      return;
    }

    if (editingYear) {
      updateMutation.mutate({ id: editingYear.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreateDialog = () => {
    setEditingYear(null);
    form.reset({
      name: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (year: AcademicYear) => {
    setEditingYear(year);
    form.reset({
      name: year.name,
      startDate: year.startDate,
      endDate: year.endDate,
      isCurrent: year.isCurrent,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">إدارة السنوات الدراسية</h1>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة سنة دراسية
        </Button>
      </div>

      <div className="grid gap-6">
        {academicYears.map((year: AcademicYear) => (
          <Card key={year.id}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {year.name}
                  {year.isCurrent && (
                    <Badge variant="default">السنة الحالية</Badge>
                  )}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(year)}
                >
                  <Edit className="w-4 h-4 ml-2" />
                  تعديل
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">تاريخ البداية</p>
                  <p className="font-medium">{formatDate(year.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">تاريخ النهاية</p>
                  <p className="font-medium">{formatDate(year.endDate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {academicYears.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">لا توجد سنوات دراسية مسجلة</p>
              <Button className="mt-4" onClick={openCreateDialog}>
                إضافة السنة الدراسية الأولى
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingYear ? "تعديل السنة الدراسية" : "إضافة سنة دراسية جديدة"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم السنة الدراسية</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="مثال: 2024/2025"
                        {...field}
                      />
                    </FormControl>
                    <div className="text-sm text-gray-500 mt-1">
                      يجب أن يكون تاريخ البداية في السنة الأولى وتاريخ النهاية في السنة الثانية
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => {
                  const nameValue = form.watch("name");
                  const dateValue = field.value;
                  
                  // Real-time validation for start date
                  let dateError = "";
                  if (nameValue && dateValue) {
                    const yearMatch = nameValue.match(/(\d{4})\/(\d{4})/);
                    if (yearMatch) {
                      const expectedYear = parseInt(yearMatch[1]);
                      const actualYear = new Date(dateValue).getFullYear();
                      if (actualYear !== expectedYear) {
                        dateError = `هذا التاريخ في سنة ${actualYear}، يجب أن يكون في سنة ${expectedYear}`;
                      }
                    }
                  }

                  return (
                    <FormItem>
                      <FormLabel>تاريخ بداية السنة الدراسية</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className={dateError ? "border-red-500" : ""}
                        />
                      </FormControl>
                      {dateError && (
                        <p className="text-sm text-red-500 mt-1">{dateError}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => {
                  const nameValue = form.watch("name");
                  const dateValue = field.value;
                  
                  // Real-time validation for end date
                  let dateError = "";
                  if (nameValue && dateValue) {
                    const yearMatch = nameValue.match(/(\d{4})\/(\d{4})/);
                    if (yearMatch) {
                      const expectedYear = parseInt(yearMatch[2]);
                      const actualYear = new Date(dateValue).getFullYear();
                      if (actualYear !== expectedYear) {
                        dateError = `هذا التاريخ في سنة ${actualYear}، يجب أن يكون في سنة ${expectedYear}`;
                      }
                    }
                  }

                  return (
                    <FormItem>
                      <FormLabel>تاريخ نهاية السنة الدراسية</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className={dateError ? "border-red-500" : ""}
                        />
                      </FormControl>
                      {dateError && (
                        <p className="text-sm text-red-500 mt-1">{dateError}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="isCurrent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">السنة الدراسية الحالية</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        تحديد هذه السنة كالسنة الدراسية الحالية
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingYear ? "تحديث" : "إضافة"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}