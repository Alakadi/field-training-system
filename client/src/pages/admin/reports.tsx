import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addDays, subDays, format } from "date-fns";
import { ar } from "date-fns/locale";

const AdminReports: React.FC = () => {
  const [reportType, setReportType] = useState("students");
  const [facultyFilter, setFacultyFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  
  // Fetch faculties for filter
  const { data: faculties, isLoading: isLoadingFaculties } = useQuery({
    queryKey: ["/api/faculties"]
  });
  
  // Fetch report data
  const { data: reportData, isLoading: isLoadingReport } = useQuery({
    queryKey: ["/api/reports", reportType, facultyFilter, startDate, endDate],
    enabled: Boolean(reportType && startDate && endDate)
  });

  const renderReportContent = () => {
    if (isLoadingReport) {
      return (
        <div className="text-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>جاري تحميل البيانات...</p>
        </div>
      );
    }

    if (!reportData || reportData.length === 0) {
      return (
        <div className="text-center p-8">
          <p className="text-neutral-500">لا توجد بيانات للعرض</p>
        </div>
      );
    }

    switch (reportType) {
      case "students":
        return renderStudentsReport();
      case "courses":
        return renderCoursesReport();
      case "supervisors":
        return renderSupervisorsReport();
      default:
        return null;
    }
  };

  const renderStudentsReport = () => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                الرقم الجامعي
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                اسم الطالب
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                الكلية
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                التخصص
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                المستوى
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                المشرف
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                حالة التدريب
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {/* Student rows would be mapped here */}
            <tr className="hover:bg-neutral-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                رقم مثال
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                اسم مثال
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                كلية مثال
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                تخصص مثال
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                المستوى مثال
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                مشرف مثال
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  مكتمل
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderCoursesReport = () => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                اسم الدورة
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                جهة التدريب
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                تاريخ البدء
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                تاريخ الانتهاء
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                عدد الطلاب
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                المشرف
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                الحالة
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {/* Course rows would be mapped here */}
            <tr className="hover:bg-neutral-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                دورة مثال
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                جهة مثال
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                2025/05/01
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                2025/06/01
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                10
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                مشرف مثال
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  جارية
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderSupervisorsReport = () => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                اسم المشرف
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                الكلية
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                القسم
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                عدد الطلاب
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                عدد الدورات
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                عدد التقييمات
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {/* Supervisor rows would be mapped here */}
            <tr className="hover:bg-neutral-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                مشرف مثال
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                كلية مثال
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                قسم مثال
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                25
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                3
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                15
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">التقارير</h1>
          <div className="flex space-x-2 space-x-reverse">
            <Button
              variant="outline"
              className="text-sm"
              onClick={() => {
                // Export functionality
                alert("سيتم تصدير التقرير");
              }}
            >
              <span className="material-icons ml-1 text-sm">file_download</span>
              تصدير
            </Button>
            <Button
              className="bg-primary hover:bg-primary-dark text-white text-sm"
              onClick={() => {
                // Print functionality
                window.print();
              }}
            >
              <span className="material-icons ml-1 text-sm">print</span>
              طباعة
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">نوع التقرير</label>
              <Select 
                value={reportType} 
                onValueChange={setReportType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر نوع التقرير" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="students">تقرير الطلاب</SelectItem>
                    <SelectItem value="courses">تقرير الدورات التدريبية</SelectItem>
                    <SelectItem value="supervisors">تقرير المشرفين</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">الكلية</label>
              <Select 
                value={facultyFilter} 
                onValueChange={setFacultyFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر الكلية" />
                </SelectTrigger>
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
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">من تاريخ</label>
              <DatePicker
                date={startDate}
                onSelect={setStartDate}
                placeholder="اختر تاريخ البدء"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">إلى تاريخ</label>
              <DatePicker
                date={endDate}
                onSelect={setEndDate}
                placeholder="اختر تاريخ الانتهاء"
              />
            </div>
          </div>
        </Card>

        {/* Report Content */}
        <Card className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h2 className="text-lg font-medium">
              {reportType === "students" && "تقرير الطلاب"}
              {reportType === "courses" && "تقرير الدورات التدريبية"}
              {reportType === "supervisors" && "تقرير المشرفين"}
              {" "}
              {startDate && endDate && (
                <span className="text-sm font-normal text-neutral-500">
                  {format(startDate, "yyyy/MM/dd", { locale: ar })} - {format(endDate, "yyyy/MM/dd", { locale: ar })}
                </span>
              )}
            </h2>
          </div>
          {renderReportContent()}
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;