import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { arEG } from "date-fns/locale";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const AdminActivityLogs = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // States for filters
  const [searchQuery, setSearchQuery] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [actionTypeFilter, setActionTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch logs data
  const { data: activityLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["/api/activity-logs"],
    retry: 1,
  });

  // Filtered and paginated logs
  const filteredLogs = activityLogs
    ? activityLogs.filter((log: any) => {
        // Search query filter
        const matchesSearch =
          !searchQuery ||
          log.details?.entityName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());

        // User type filter
        const matchesUserType =
          userTypeFilter === "all" ||
          (log.user?.role === userTypeFilter);

        // Action type filter
        const matchesActionType =
          actionTypeFilter === "all" ||
          log.action === actionTypeFilter;

        // Date filter
        const logDate = new Date(log.timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const matchesDate =
          dateFilter === "all" ||
          (dateFilter === "today" &&
            logDate.toDateString() === today.toDateString()) ||
          (dateFilter === "yesterday" &&
            logDate.toDateString() === yesterday.toDateString()) ||
          (dateFilter === "last-week" &&
            logDate >= lastWeek) ||
          (dateFilter === "last-month" &&
            logDate >= lastMonth);

        return matchesSearch && matchesUserType && matchesActionType && matchesDate;
      })
    : [];

  // Calculate total pages
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  // Get current page data
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPpp", { locale: arEG });
    } catch (e) {
      return dateString;
    }
  };

  // Helper function to get action color class
  const getActionColorClass = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
        return "bg-green-100 text-green-800";
      case "update":
        return "bg-blue-100 text-blue-800";
      case "delete":
        return "bg-red-100 text-red-800";
      case "login":
        return "bg-purple-100 text-purple-800";
      case "logout":
        return "bg-neutral-100 text-neutral-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  // Helper function to translate entity types
  const translateEntityType = (type: string) => {
    const translations: {[key: string]: string} = {
      "user": "مستخدم",
      "student": "طالب",
      "supervisor": "مشرف",
      "course": "دورة تدريبية",
      "assignment": "تكليف تدريب",
      "evaluation": "تقييم",
      "faculty": "كلية",
      "major": "تخصص",
      "level": "مستوى",
      "site": "جهة تدريب"
    };
    return translations[type] || type;
  };

  // Helper function to translate actions
  const translateAction = (action: string) => {
    const translations: {[key: string]: string} = {
      "create": "إنشاء",
      "update": "تعديل",
      "delete": "حذف",
      "login": "تسجيل دخول",
      "logout": "تسجيل خروج",
      "confirm": "تأكيد"
    };
    return translations[action] || action;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">سجل النشاطات</h1>
        </div>

        {/* Search and Filters */}
        <Card className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2"
                />
                <span className="material-icons absolute right-3 top-2 text-neutral-500">search</span>
              </div>
            </div>
            <div>
              <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="نوع المستخدم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المستخدمين</SelectItem>
                  <SelectItem value="admin">الإدارة</SelectItem>
                  <SelectItem value="supervisor">المشرفين</SelectItem>
                  <SelectItem value="student">الطلاب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="نوع الإجراء" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الإجراءات</SelectItem>
                  <SelectItem value="create">إنشاء</SelectItem>
                  <SelectItem value="update">تعديل</SelectItem>
                  <SelectItem value="delete">حذف</SelectItem>
                  <SelectItem value="login">تسجيل دخول</SelectItem>
                  <SelectItem value="logout">تسجيل خروج</SelectItem>
                  <SelectItem value="confirm">تأكيد</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="التاريخ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الفترات</SelectItem>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="yesterday">الأمس</SelectItem>
                  <SelectItem value="last-week">الأسبوع الأخير</SelectItem>
                  <SelectItem value="last-month">الشهر الأخير</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Activity Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    التاريخ والوقت
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    المستخدم
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    الإجراء
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    نوع السجل
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    التفاصيل
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    عنوان IP
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      جاري تحميل البيانات...
                    </td>
                  </tr>
                ) : paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      لا توجد بيانات للعرض
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {log.user?.name || "غير معروف"}
                        {log.user?.role && (
                          <span className={`mr-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            log.user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                            log.user.role === 'supervisor' ? 'bg-blue-100 text-blue-800' : 
                            'bg-green-100 text-green-800'
                          }`}>
                            {log.user.role === 'admin' ? 'إدارة' : 
                             log.user.role === 'supervisor' ? 'مشرف' : 'طالب'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColorClass(log.action)}`}>
                          {translateAction(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {translateEntityType(log.entityType)}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-800">
                        {log.details?.entityName || 
                         log.details?.message || 
                         (log.entityId ? `رقم ${log.entityId}` : "-")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {log.ipAddress || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {filteredLogs.length > 0 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-neutral-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  التالي
                </Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-neutral-700">
                    عرض
                    <span className="font-medium mx-1">
                      {(currentPage - 1) * itemsPerPage + 1}
                    </span>
                    إلى
                    <span className="font-medium mx-1">
                      {Math.min(currentPage * itemsPerPage, filteredLogs.length)}
                    </span>
                    من أصل
                    <span className="font-medium mx-1">{filteredLogs.length}</span>
                    سجل
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <Button
                      variant="outline"
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-neutral-300 text-sm font-medium"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <span className="sr-only">السابق</span>
                      <span className="material-icons text-sm">chevron_right</span>
                    </Button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        pageNum = currentPage - 3 + i;
                      }
                      if (pageNum <= totalPages) {
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            className="relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                      return null;
                    })}
                    
                    <Button
                      variant="outline"
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-neutral-300 text-sm font-medium"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <span className="sr-only">التالي</span>
                      <span className="material-icons text-sm">chevron_left</span>
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminActivityLogs;