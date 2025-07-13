import { useQuery } from "@tanstack/react-query";
import { ProfileSettings } from "@/components/profile/profile-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, User, Shield } from "lucide-react";

export default function AdminProfile() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        throw new Error("فشل في جلب بيانات المستخدم");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">خطأ في جلب بيانات المستخدم</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            معلومات الحساب
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">الاسم</p>
              <p className="font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">اسم المستخدم</p>
              <p className="font-medium">{user.username}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الدور</p>
              <Badge variant="default" className="flex items-center gap-1 w-fit">
                <Shield className="h-3 w-3" />
                مسؤول النظام
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">حالة الحساب</p>
              <Badge variant={user.active ? "default" : "destructive"}>
                {user.active ? "نشط" : "غير نشط"}
              </Badge>
            </div>
            {user.email && (
              <div>
                <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                <p className="font-medium">{user.email}</p>
              </div>
            )}
            {user.phone && (
              <div>
                <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                <p className="font-medium">{user.phone}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <ProfileSettings user={user} />
    </div>
  );
}