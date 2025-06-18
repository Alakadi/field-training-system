import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const ImportExcel: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success?: number;
    errors?: number;
    messages?: string[];
  } | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    setIsUploading(true);
    setUploadResult(null);

    reader.onload = async (event) => {
      try {
        if (!event.target || typeof event.target.result !== "string") {
          throw new Error("فشل قراءة الملف");
        }

        // Get the base64 data (remove the prefix)
        const base64data = event.target.result.split(",")[1];

        // Send to the server
        const response = await apiRequest("POST", "/api/students/import", {
          excelData: base64data,
        });

        const result = await response.json();
        setUploadResult(result);

        toast({
          title: "تم استيراد البيانات",
          description: `تم استيراد ${result.success} طالب بنجاح (${result.errors} أخطاء)`,
          variant: result.errors > 0 ? "destructive" : "default",
        });

        // Invalidate students query to refresh the data
        queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      } catch (error) {
        console.error("Import failed:", error);
        toast({
          title: "فشل استيراد البيانات",
          description: error instanceof Error ? error.message : "حدث خطأ أثناء استيراد البيانات",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      toast({
        title: "فشل قراءة الملف",
        description: "حدث خطأ أثناء قراءة الملف",
        variant: "destructive",
      });
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold">استيراد بيانات الطلاب</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center">
          <div className="max-w-md mx-auto">
            <span className="material-icons text-neutral-400 text-5xl mb-2">upload_file</span>
            <h3 className="text-lg font-medium mb-2">قم بتحميل ملف Excel</h3>
            <p className="text-neutral-500 mb-4">اسحب الملف هنا أو انقر لاختيار الملف</p>

            <input 
              type="file" 
              id="excel-upload" 
              className="hidden" 
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              disabled={isUploading}
            />

            <Button
              onClick={() => document.getElementById("excel-upload")?.click()}
              disabled={isUploading}
              className="inline-flex items-center"
            >
              <span className="material-icons ml-1 text-sm">file_upload</span>
              {isUploading ? "جاري الرفع..." : "اختيار ملف"}
            </Button>

            <div className="text-xs text-neutral-500 mt-4 space-y-2">
              <p className="font-medium">متطلبات الملف:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>يجب أن يحتوي على عمود "الرقم الجامعي" (مطلوب)</li>
                <li>يجب أن يحتوي على عمود "اسم الطالب" أو "الاسم" (مطلوب)</li>
                <li>عمود "الكلية" (اختياري - يمكن أن يكون اسم أو رقم)</li>
                <li>عمود "التخصص" (اختياري - يمكن أن يكون اسم أو رقم)</li>
                <li>عمود "المستوى" أو "المستوى الدراسي" (اختياري - يمكن أن يكون اسم أو رقم)</li>
              </ul>
              <p className="text-orange-600 font-medium">
                ملاحظة: إذا كان الطالب موجوداً، سيتم تحديث المستوى فقط عند الحاجة
              </p>
            </div>
          </div>
        </div>

        {uploadResult && (
          <div className="mt-6">
            <h4 className="font-bold mb-3">نتيجة الاستيراد:</h4>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-700">{uploadResult.success}</div>
                <div className="text-sm text-green-600">تم بنجاح</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-700">{uploadResult.errors}</div>
                <div className="text-sm text-red-600">أخطاء</div>
              </div>
            </div>

            {uploadResult.messages && uploadResult.messages.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-sm mb-2 flex items-center">
                  <span className="material-icons text-sm ml-1">info</span>
                  تفاصيل العملية:
                </h5>
                <div className="bg-neutral-50 border rounded-lg max-h-60 overflow-y-auto">
                  {uploadResult.messages.map((message, i) => (
                    <div 
                      key={i} 
                      className={`p-2 text-sm border-b border-neutral-200 last:border-b-0 ${
                        message.includes('خطأ') ? 'text-red-700 bg-red-50' :
                        message.includes('تم إنشاء') ? 'text-green-700 bg-green-50' :
                        message.includes('تم تحديث') ? 'text-blue-700 bg-blue-50' :
                        'text-neutral-600'
                      }`}
                    >
                      {message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ImportExcel;
