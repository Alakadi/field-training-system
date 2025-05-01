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
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

// Define schema
const evaluationSchema = z.object({
  assignmentId: z.string().min(1, { message: "يرجى اختيار الطالب والدورة" }),
  score: z.number().min(0, { message: "يجب أن يكون التقييم بين 0 و 100" }).max(100, { message: "يجب أن يكون التقييم بين 0 و 100" }),
  evaluatorName: z.string().min(1, { message: "يرجى إدخال اسم المقيِّم" }),
  comments: z.string().optional().or(z.literal("")),
});

type EvaluationFormValues = z.infer<typeof evaluationSchema>;

interface EvaluationFormProps {
  assignmentId?: string;
  assignments?: any[];
  evaluationId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const EvaluationForm: React.FC<EvaluationFormProps> = ({ 
  assignmentId, 
  assignments, 
  evaluationId, 
  onSuccess, 
  onCancel 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch evaluation if editing
  const { data: evaluation, isLoading: isLoadingEvaluation } = useQuery({
    queryKey: ["/api/evaluations", evaluationId],
    queryFn: async () => {
      if (!evaluationId) return null;
      const res = await fetch(`/api/evaluations/${evaluationId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch evaluation");
      return res.json();
    },
    enabled: !!evaluationId,
  });

  const form = useForm<EvaluationFormValues>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      assignmentId: assignmentId || "",
      score: 80,
      evaluatorName: "",
      comments: "",
    },
  });

  // Update form when evaluation data is loaded
  useEffect(() => {
    if (evaluation) {
      form.reset({
        assignmentId: String(evaluation.assignmentId),
        score: evaluation.score,
        evaluatorName: evaluation.evaluatorName || "",
        comments: evaluation.comments || "",
      });
    }
  }, [evaluation, form]);

  // Update selected assignment when assignmentId changes
  useEffect(() => {
    if (assignments && assignmentId) {
      const assignment = assignments.find((a) => String(a.id) === assignmentId);
      setSelectedAssignment(assignment);
    }
  }, [assignments, assignmentId]);

  // Handle assignment selection
  const handleAssignmentChange = (value: string) => {
    form.setValue("assignmentId", value);
    if (assignments) {
      const assignment = assignments.find((a) => String(a.id) === value);
      setSelectedAssignment(assignment);
    }
  };

  const onSubmit = async (data: EvaluationFormValues) => {
    try {
      setIsSubmitting(true);
      
      if (evaluationId) {
        // Update existing evaluation
        await apiRequest("PATCH", `/api/evaluations/${evaluationId}`, data);
        toast({
          title: "تم تحديث التقييم بنجاح",
        });
      } else {
        // Create new evaluation
        await apiRequest("POST", "/api/evaluations", data);
        toast({
          title: "تم إضافة التقييم بنجاح",
        });
      }
      
      // Reset form
      form.reset();
      
      // Invalidate evaluations and assignments queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments"] });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "فشل " + (evaluationId ? "تحديث" : "إضافة") + " التقييم",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء " + (evaluationId ? "تحديث" : "إضافة") + " التقييم",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingEvaluation;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{evaluationId ? "تعديل التقييم" : "إضافة تقييم جديد"}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center p-4">جاري تحميل البيانات...</div>
        ) : (
          <Form {...form}>
            <form className="space-y-6">
              <FormField
                control={form.control}
                name="assignmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الطالب والدورة</FormLabel>
                    <Select 
                      onValueChange={handleAssignmentChange}
                      defaultValue={field.value}
                      disabled={!!evaluationId || !!assignmentId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الطالب والدورة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignments?.map((assignment) => (
                          <SelectItem key={assignment.id} value={String(assignment.id)}>
                            {assignment.student.user.name} - {assignment.course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Selected Assignment Details */}
              {selectedAssignment && (
                <div className="p-4 bg-neutral-50 rounded-md border border-neutral-200">
                  <h3 className="font-medium text-primary mb-2">تفاصيل التدريب</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-neutral-500">الطالب:</p>
                      <p className="font-medium">{selectedAssignment.student.user.name}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">الرقم الجامعي:</p>
                      <p className="font-medium">{selectedAssignment.student.universityId}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">الدورة:</p>
                      <p className="font-medium">{selectedAssignment.course.name}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">جهة التدريب:</p>
                      <p className="font-medium">{selectedAssignment.course.site.name}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">المدة:</p>
                      <p className="font-medium">
                        {formatDate(selectedAssignment.course.startDate)} - {formatDate(selectedAssignment.course.endDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500">الحالة:</p>
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${selectedAssignment.status === 'active' ? 'bg-green-100 text-green-800' : 
                          selectedAssignment.status === 'completed' ? 'bg-neutral-100 text-neutral-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {selectedAssignment.status === 'active' ? 'نشط' : 
                         selectedAssignment.status === 'completed' ? 'مكتمل' : 
                         selectedAssignment.status === 'pending' ? 'قيد الانتظار' : selectedAssignment.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <FormField
                control={form.control}
                name="score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التقييم ({field.value}%)</FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        defaultValue={[field.value]}
                        onValueChange={(values) => field.onChange(values[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="evaluatorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المقيِّم</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسم المقيِّم" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الملاحظات والتعليقات</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="أدخل ملاحظات وتعليقات حول أداء الطالب"
                        className="h-32"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            if (onCancel) onCancel();
          }}
        >
          إلغاء
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EvaluationForm;
