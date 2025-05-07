import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, ClockIcon, SearchIcon, UserIcon } from "lucide-react";
import { format } from "date-fns";
import { arDZ } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ActivityLog {
  id: number;
  userId: number | null;
  action: string;
  entityType: string;
  entityId: number | null;
  details: any;
  timestamp: string;
  ipAddress: string | null;
  user?: {
    id: number;
    username: string;
    name: string;
    role: string;
  };
}

const actionColors: Record<string, string> = {
  create: "bg-green-500",
  update: "bg-blue-500",
  delete: "bg-red-500",
  login: "bg-purple-500",
  logout: "bg-purple-500",
  import: "bg-amber-500",
  export: "bg-amber-500",
  view: "bg-gray-500",
  default: "bg-gray-500"
};

const entityColors: Record<string, string> = {
  user: "bg-blue-500",
  student: "bg-green-500",
  supervisor: "bg-amber-500",
  course: "bg-purple-500",
  assignment: "bg-red-500",
  evaluation: "bg-pink-500",
  site: "bg-indigo-500",
  default: "bg-gray-500"
};

const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), "dd MMMM yyyy", { locale: arDZ });
  } catch (e) {
    return dateString;
  }
};

const formatTime = (dateString: string): string => {
  try {
    return format(new Date(dateString), "hh:mm a", { locale: arDZ });
  } catch (e) {
    return "";
  }
};

const getActionColor = (action: string): string => {
  return actionColors[action] || actionColors.default;
};

const getEntityColor = (entityType: string): string => {
  return entityColors[entityType] || entityColors.default;
};

const ActivityLogs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ["/api/activity-logs"],
    staleTime: 10000, // 10 seconds
  });

  // Filter logs based on search term and filters
  const filteredLogs = logs ? logs.filter((log: ActivityLog) => {
    const matchesSearch = 
      !searchTerm || 
      (log.user?.name && log.user.name.includes(searchTerm)) ||
      (log.details?.message && log.details.message.includes(searchTerm));
    
    const matchesAction = !actionFilter || actionFilter === "all" || log.action === actionFilter;
    const matchesEntity = !entityFilter || entityFilter === "all" || log.entityType === entityFilter;
    
    return matchesSearch && matchesAction && matchesEntity;
  }) : [];

  // Get unique actions and entities for filters
  const uniqueActions = logs ? Array.from(new Set(logs.map((log: ActivityLog) => log.action))) : [];
  const uniqueEntities = logs ? Array.from(new Set(logs.map((log: ActivityLog) => log.entityType))) : [];

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">سجلات النشاط</CardTitle>
            <CardDescription>
              عرض جميع الأنشطة التي تمت على النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 sm:space-x-reverse mb-6">
              <div className="relative flex-1">
                <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  placeholder="بحث عن نشاط..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              
              <div className="w-full sm:w-48">
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="نوع النشاط" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنشطة</SelectItem>
                    {uniqueActions.map((action) => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full sm:w-48">
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="نوع الكيان" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الكيانات</SelectItem>
                    {uniqueEntities.map((entity) => (
                      <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 space-x-reverse">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-4 text-red-500">
                حدث خطأ في استرجاع سجلات النشاط
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>النشاط</TableHead>
                      <TableHead>الكيان</TableHead>
                      <TableHead>التفاصيل</TableHead>
                      <TableHead>التاريخ والوقت</TableHead>
                      <TableHead>عنوان IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                          لا توجد سجلات نشاط للعرض
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredLogs?.map((log: ActivityLog) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <div className="bg-primary w-8 h-8 rounded-full flex items-center justify-center">
                              <UserIcon size={14} className="text-white" />
                            </div>
                            <div>
                              <div className="font-medium">{log.user?.name || 'غير معروف'}</div>
                              <div className="text-xs text-gray-500">
                                {log.user?.role === 'admin' ? 'مسؤول' : 
                                 log.user?.role === 'supervisor' ? 'مشرف' : 
                                 log.user?.role === 'student' ? 'طالب' : 'غير معروف'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getEntityColor(log.entityType)}>
                            {log.entityType}
                          </Badge>
                          {log.entityId && (
                            <span className="text-xs text-gray-500 mr-1">
                              ({log.entityId})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {log.details?.message || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <div className="flex items-center">
                              <CalendarIcon size={14} className="ml-1 text-gray-500" />
                              {formatDate(log.timestamp)}
                            </div>
                            <div className="flex items-center text-gray-500">
                              <ClockIcon size={14} className="ml-1" />
                              {formatTime(log.timestamp)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono">
                            {log.ipAddress || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ActivityLogs;