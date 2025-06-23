import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, User, Calendar, Users, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GroupStudent {
  id: number;
  student: {
    id: number;
    userId: number;
    universityId: string;
    gpa: number | null;
    user: {
      id: number;
      name: string;
      email: string;
    };
    faculty: {
      id: number;
      name: string;
    };
    major: {
      id: number;
      name: string;
    };
    level: {
      id: number;
      name: string;
    };
  };
  assignment: {
    id: number;
    status: string;
    assignedAt: string;
  };
  evaluation?: {
    id: number;
    score: number;
    comments: string;
    evaluatorName: string;
    createdAt: string;
  };
}

interface GroupDetails {
  id: number;
  groupName: string;
  capacity: number;
  currentEnrollment: number;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  course: {
    id: number;
    name: string;
    description: string;
    faculty: {
      name: string;
    };
    major: {
      name: string;
    };
    level: {
      name: string;
    };
  };
  site: {
    id: number;
    name: string;
    address: string;
    contactPerson: string;
    contactPhone: string;
  };
  supervisor: {
    id: number;
    user: {
      name: string;
      email: string;
      phone: string;
    };
    specialization: string;
  };
  students: GroupStudent[];
}

export default function ViewGroup() {
  const { groupId } = useParams();

  const { data: groupDetails, isLoading } = useQuery<GroupDetails>({
    queryKey: ['/api/training-course-groups', groupId],
    enabled: !!groupId
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!groupDetails) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">المجموعة غير موجودة</h2>
          <p className="text-neutral-600 mb-4">لم يتم العثور على المجموعة المطلوبة</p>
          <Link href="/admin/courses">
            <Button>العودة للدورات</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">نشطة</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">مكتملة</Badge>;
      case 'upcoming':
        return <Badge className="bg-yellow-100 text-yellow-800">قادمة</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getAssignmentStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">مؤكد</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">في الانتظار</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">ملغي</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-600 mb-6">
        <Link href="/admin/courses" className="hover:text-neutral-900">
          الدورات التدريبية
        </Link>
        <ArrowRight className="h-4 w-4" />
        <Link href={`/admin/view-course/${groupDetails.course.id}`} className="hover:text-neutral-900">
          {groupDetails.course.name}
        </Link>
        <ArrowRight className="h-4 w-4" />
        <span className="text-neutral-900 font-medium">{groupDetails.groupName}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Group Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">{groupDetails.groupName}</CardTitle>
                  <p className="text-neutral-600 mb-4">{groupDetails.course.name}</p>
                  <div className="flex gap-2">
                    {getStatusBadge(groupDetails.status)}
                    <Badge variant="outline">
                      {groupDetails.currentEnrollment}/{groupDetails.capacity} طالب
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium">تاريخ البدء</p>
                    <p className="text-sm text-neutral-600">
                      {new Date(groupDetails.startDate).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium">تاريخ الانتهاء</p>
                    <p className="text-sm text-neutral-600">
                      {new Date(groupDetails.endDate).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium">المكان</p>
                    <p className="text-sm text-neutral-600">{groupDetails.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium">السعة</p>
                    <p className="text-sm text-neutral-600">{groupDetails.capacity} طالب</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Students Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                الطلاب المسجلين ({groupDetails.students.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {groupDetails.students.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-500">لا يوجد طلاب مسجلين في هذه المجموعة</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          الطالب
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          الرقم الجامعي
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          التخصص
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          المعدل
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          حالة التسجيل
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          الدرجة
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                      {groupDetails.students.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-neutral-900">
                                {item.student.user.name}
                              </div>
                              <div className="text-sm text-neutral-500">
                                {item.student.user.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                            {item.student.universityId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm text-neutral-900">{item.student.major.name}</div>
                              <div className="text-sm text-neutral-500">{item.student.level.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                            {item.student.gpa ? item.student.gpa.toFixed(2) : 'غير محدد'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getAssignmentStatusBadge(item.assignment.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.evaluation ? (
                              <div className="flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm font-medium text-neutral-900">
                                  {item.evaluation.score}/100
                                </span>
                              </div>
                            ) : (
                              <Badge variant="outline">لم يتم التقييم</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">معلومات الدورة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-neutral-500">اسم الدورة</p>
                <p className="text-sm">{groupDetails.course.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">الكلية</p>
                <p className="text-sm">{groupDetails.course.faculty.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">التخصص</p>
                <p className="text-sm">{groupDetails.course.major.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">المستوى</p>
                <p className="text-sm">{groupDetails.course.level.name}</p>
              </div>
              {groupDetails.course.description && (
                <div>
                  <p className="text-sm font-medium text-neutral-500">الوصف</p>
                  <p className="text-sm">{groupDetails.course.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Training Site */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                موقع التدريب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-neutral-500">اسم الموقع</p>
                <p className="text-sm">{groupDetails.site.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">العنوان</p>
                <p className="text-sm">{groupDetails.site.address}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">الشخص المسؤول</p>
                <p className="text-sm">{groupDetails.site.contactPerson}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">رقم الاتصال</p>
                <p className="text-sm">{groupDetails.site.contactPhone}</p>
              </div>
            </CardContent>
          </Card>

          {/* Supervisor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                المشرف
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-neutral-500">الاسم</p>
                <p className="text-sm">{groupDetails.supervisor.user.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">البريد الإلكتروني</p>
                <p className="text-sm">{groupDetails.supervisor.user.email}</p>
              </div>
              {groupDetails.supervisor.user.phone && (
                <div>
                  <p className="text-sm font-medium text-neutral-500">رقم الهاتف</p>
                  <p className="text-sm">{groupDetails.supervisor.user.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-neutral-500">التخصص</p>
                <p className="text-sm">{groupDetails.supervisor.specialization}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}