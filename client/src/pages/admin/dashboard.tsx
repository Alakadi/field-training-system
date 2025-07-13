import React from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ImportExcel from "@/components/admin/import-excel";
import { Link } from "wouter";
import { formatDate } from "@/lib/utils";
import Icon from "@/components/ui/icon-map";
const AdminDashboard: React.FC = () => {
  // Fetch statistics
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["/api/students"]
  });

  const { data: courses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ["/api/training-courses"]
  });

  const { data: supervisors, isLoading: isLoadingSupervisors } = useQuery({
    queryKey: ["/api/supervisors"]
  });

  const { data: trainingSites, isLoading: isLoadingTrainingSites } = useQuery({
    queryKey: ["/api/training-sites"]
  });

  // Placeholder for recent activities - in a real app, this would be fetched from an API
  const recentActivities = [
    {
      icon: "person_add",
      iconClass: "bg-blue-100 text-primary",
      title: "تم إضافة 24 طالب جديد من كلية الهندسة",
      actor: "أحمد المشرف",
      time: "منذ 2 ساعة"
    },
    {
      icon: "update",
      iconClass: "bg-green-100 text-success",
      title: 'تم تحديث بيانات الدورة "أساسيات الشبكات"',
      actor: "عبدالله المدير",
      time: "منذ 5 ساعات"
    },
    {
      icon: "school",
      iconClass: "bg-purple-100 text-purple-600",
      title: 'تم إضافة دورة تدريبية جديدة "مهارات التسويق الرقمي"',
      actor: "خالد المشرف",
      time: "منذ يوم واحد"
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">لوحة التحكم الرئيسية</h1>
          <div className="flex space-x-2 space-x-reverse">
            <Link href="/admin/courses?action=new">
              <Button className="bg-primary hover:bg-primary-dark text-white flex items-center text-sm">
                <Icon name="plus" size={16} className="ml-1" />
                إنشاء دورة تدريبية
              </Button>
            </Link>
            <Button variant="outline" className="flex items-center text-sm">
              <Icon name="download" size={16} className="ml-1" />
              تصدير البيانات
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="dashboard-card bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-primary ml-4">
                  <Icon name="users" size={24} />
                </div>
                <div>
                  <div className="text-sm text-neutral-500">إجمالي الطلاب</div>
                  <div className="text-2xl font-bold">
                    {isLoadingStudents ? "..." : students?.length || 0}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-success flex items-center">
                <Icon name="chevron_up" size={16} />
                <span>12% زيادة هذا الفصل</span>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-secondary ml-4">
                  <Icon name="book_open" size={24} />
                </div>
                <div>
                  <div className="text-sm text-neutral-500">الدورات النشطة</div>
                  <div className="text-2xl font-bold">
                    {isLoadingCourses
                      ? "..."
                      : courses?.filter((c: any) => c.status === "active").length || 0}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-success flex items-center">
                <Icon name="chevron_up" size={16} />
                <span>5 دورات جديدة هذا الأسبوع</span>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600 ml-4">
                  <Icon name="user" size={24} />
                </div>
                <div>
                  <div className="text-sm text-neutral-500">المشرفون</div>
                  <div className="text-2xl font-bold">
                    {isLoadingSupervisors ? "..." : supervisors?.length || 0}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-neutral-500 flex items-center">
                <span>من عدة كليات</span>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-accent-dark ml-4">
                  <Icon name="building" size={24} />
                </div>
                <div>
                  <div className="text-sm text-neutral-500">جهات التدريب</div>
                  <div className="text-2xl font-bold">
                    {isLoadingTrainingSites ? "..." : trainingSites?.length || 0}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-success flex items-center">
                <Icon name="plus" size={16} />
                <span>6 جهات جديدة</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities & Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-lg font-bold">آخر النشاطات</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start pb-4 border-b border-neutral-200"
                  >
                    <div className={`p-2 ${activity.iconClass} rounded-full ml-4`}>
                      <Icon name={activity.icon === "person_add" ? "user_plus" : activity.icon === "update" ? "edit" : "graduation_cap"} size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-neutral-500 text-sm">قام بها: {activity.actor}</p>
                      <p className="text-neutral-400 text-xs mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Button variant="link" className="text-primary text-sm">
                  عرض كل النشاطات
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Links & To-Do */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-lg font-bold">مهام سريعة</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <Link href="/admin/students?action=import">
                  <a className="block p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition">
                    <div className="flex items-center">
                      <Icon name="upload" size={20} className="text-primary ml-3" />
                      <div>
                        <h3 className="font-medium">استيراد بيانات الطلاب</h3>
                        <p className="text-neutral-500 text-sm">تحميل ملف Excel للطلاب الجدد</p>
                      </div>
                    </div>
                  </a>
                </Link>
                <Link href="/admin/students?action=assignSupervisors">
                  <a className="block p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition">
                    <div className="flex items-center">
                      <Icon name="user_plus" size={20} className="text-secondary ml-3" />
                      <div>
                        <h3 className="font-medium">تعيين مشرفين</h3>
                        <p className="text-neutral-500 text-sm">إسناد طلاب إلى مشرفين أكاديميين</p>
                      </div>
                    </div>
                  </a>
                </Link>
                <Link href="/admin/courses">
                  <a className="block p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition">
                    <div className="flex items-center">
                      <Icon name="file_text" size={20} className="text-accent ml-3" />
                      <div>
                        <h3 className="font-medium">مراجعة الدورات</h3>
                        <p className="text-neutral-500 text-sm">
                          هناك دورات تدريبية بحاجة للمراجعة
                        </p>
                      </div>
                    </div>
                  </a>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Import Students Section */}
        <ImportExcel />
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
