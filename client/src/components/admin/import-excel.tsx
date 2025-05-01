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
            
            <p className="text-xs text-neutral-500 mt-4">
              يجب أن يحتوي الملف على أعمدة: الرقم الجامعي، اسم الطالب، التخصص، الكلية، المستوى الدراسي
            </p>
          </div>
        </div>

        {uploadResult && (
          <div className="mt-6">
            <h4 className="font-bold mb-2">نتيجة الاستيراد:</h4>
            <div className="flex space-x-4 space-x-reverse mb-2">
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm">
                نجاح: {uploadResult.success}
              </div>
              <div className="bg-red-100 text-red-800 px-3 py-1 rounded-md text-sm">
                أخطاء: {uploadResult.errors}
              </div>
            </div>
            
            {uploadResult.messages && uploadResult.messages.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-sm mb-1">تفاصيل:</h5>
                <ul className="text-sm text-neutral-600 space-y-1 bg-neutral-50 p-3 rounded-md max-h-40 overflow-y-auto">
                  {uploadResult.messages.map((message, i) => (
                    <li key={i} className="list-disc list-inside">
                      {message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ImportExcel;
