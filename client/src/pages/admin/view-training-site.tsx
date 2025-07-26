import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon-map";
import { MapPin, Phone, Mail, User, Calendar, Users, BookOpen } from "lucide-react";

const ViewTrainingSite: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  
  // فلترة
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [academicYearFilter, setAcademicYearFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // تحديد أنواع البيانات
  type TrainingSiteType = {
    id: number;
    name: string;
    address: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  };

  type TrainingGroupType = {
    id: number;
    groupName: string;
    startDate: string;
    endDate: string;
    capacity: number;
    currentEnrollment: number;
    status: string;
    location: string | null;
    course: {
      id: number;
      name: string;
      description: string | null;
      status: string;
      academicYear: {
        id: number;
        name: string;
      } | null;
      major: {
        id: number;
        name: string;
        faculty: {
          id: number;
          name: string;
        };
      } | null;
      level: {
        id: number;
        name: string;
      } | null;
    };
    supervisor: {
      id: number;
      user: {
        id: number;
        name: string;
      };
      department: string | null;
    } | null;
  };

  // الحصول على بيانات موقع التدريب
  const { data: trainingSite, isLoading: isLoadingSite } = useQuery<TrainingSiteType>({
    queryKey: [`/api/training-sites/${id}`],
    enabled: !!id,
  });

  // الحصول على المجموعات التدريبية في هذا الموقع
  const { data: trainingGroups = [], isLoading: isLoadingGroups } = useQuery<TrainingGroupType[]>({
    queryKey: [`/api/training-course-groups/site/${id}`],
    enabled: !!id,
  });

  // الحصول على السنوات الدراسية للفلترة
  const { data: academicYears = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["/api/academic-years"],
  });

  // تطبيق الفلترة
  const filteredGroups = trainingGroups.filter((group) => {
    const matchesStatus = statusFilter === "all" || group.status === statusFilter;
    const matchesAcademicYear = academicYearFilter === "all" || 
      (group.course.academicYear && String(group.course.academicYear.id) === academicYearFilter);
    const matchesSearch = !searchQuery || 
      group.groupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (group.supervisor?.user.name && group.supervisor.user.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesAcademicYear && matchesSearch;
  });

  // دالة لتحديد لون حالة المجموعة
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "full":
        return "bg-orange-100 text-orange-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // دالة لتحويل حالة المجموعة إلى العربية
  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "نشطة";
      case "completed":
        return "مكتملة";
      case "full":
        return "مكتملة العدد";
      case "cancelled":
        return "ملغية";
      default:
        return status;
    }
  };

  if (isLoadingSite) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-lg font-medium text-neutral-500">جاري تحميل بيانات موقع التدريب...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!trainingSite) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-lg font-medium text-red-500">لم يتم العثور على موقع التدريب</p>
            <Button
              variant="outline"
              onClick={() => setLocation("/admin/training-sites")}
              className="mt-4"
            >
              العودة إلى القائمة
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{trainingSite.name}</h1>
            <p className="text-neutral-600">عرض تفاصيل موقع التدريب والمجموعات</p>
          </div>
          <div className="flex space-x-2 space-x-reverse">
            <Button
              variant="outline"
              onClick={() => setLocation(`/admin/training-sites/${id}/edit`)}
            >
              <Icon name="edit" size={16} />
              تعديل
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/admin/training-sites")}
            >
              <Icon name="chevron_right" size={16} />
              العودة إلى القائمة
            </Button>
          </div>
        </div>

        {/* Site Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              معلومات موقع التدريب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-neutral-500">اسم الموقع</p>
                  <p className="text-base">{trainingSite.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-500">العنوان</p>
                  <p className="text-base">{trainingSite.address || 'غير محدد'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-neutral-500">جهة الاتصال</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-neutral-400" />
                    <p className="text-base">{trainingSite.contactName || 'غير محدد'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-500">البريد الإلكتروني</p>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-neutral-400" />
                    <p className="text-base">{trainingSite.contactEmail || 'غير محدد'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-500">رقم الهاتف</p>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-neutral-400" />
                    <p className="text-base">{trainingSite.contactPhone || 'غير محدد'}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              المجموعات التدريبية ({filteredGroups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium mb-2 block">البحث</label>
                <Input
                  placeholder="بحث في المجموعات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">حالة المجموعة</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="كل الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="completed">مكتملة</SelectItem>
                    <SelectItem value="full">مكتملة العدد</SelectItem>
                    <SelectItem value="cancelled">ملغية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">السنة الدراسية</label>
                <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="كل السنوات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل السنوات</SelectItem>
                    {academicYears.map((year: any) => (
                      <SelectItem key={year.id} value={String(year.id)}>
                        {year.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter("all");
                    setAcademicYearFilter("all");
                    setSearchQuery("");
                  }}
                  className="w-full"
                >
                  <Icon name="refresh_cw" size={16} />
                  إعادة تعيين
                </Button>
              </div>
            </div>

            {/* Groups List */}
            {isLoadingGroups ? (
              <div className="flex justify-center items-center h-32">
                <p className="text-neutral-500">جاري تحميل المجموعات...</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-500">لا توجد مجموعات تدريبية تطابق الفلترة المحددة</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGroups.map((group) => (
                  <Card key={group.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className="font-medium text-base">{group.groupName}</h3>
                          <Badge className={`text-xs ${getStatusColor(group.status)}`}>
                            {getStatusText(group.status)}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-neutral-400" />
                            <span className="font-medium">{group.course.name}</span>
                          </div>
                          
                          {group.course.major && (
                            <div className="text-neutral-600">
                              {group.course.major.faculty.name} - {group.course.major.name}
                            </div>
                          )}
                          
                          {group.course.level && (
                            <div className="text-neutral-600">
                              {group.course.level.name}
                            </div>
                          )}
                          
                          {group.course.academicYear && (
                            <div className="flex items-center gap-2 text-neutral-600">
                              <Calendar className="h-4 w-4" />
                              <span>{group.course.academicYear.name}</span>
                            </div>
                          )}
                          
                          {group.supervisor && (
                            <div className="flex items-center gap-2 text-neutral-600">
                              <User className="h-4 w-4" />
                              <span>{group.supervisor.user.name}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-neutral-600">
                            <Users className="h-4 w-4" />
                            <span>{group.currentEnrollment} / {group.capacity} طالب</span>
                          </div>
                          
                          <div className="text-neutral-600">
                            {new Date(group.startDate).toLocaleDateString('ar')} - {new Date(group.endDate).toLocaleDateString('ar')}
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/admin/groups/${group.id}`)}
                            className="w-full"
                          >
                            عرض التفاصيل
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ViewTrainingSite;