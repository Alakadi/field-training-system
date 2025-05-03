import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getUniversityLogoUrl } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const Login: React.FC = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // إذا كان المستخدم مسجل الدخول، قم بتوجيهه إلى لوحة التحكم المناسبة
  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        setLocation("/admin");
      } else if (user.role === "supervisor") {
        setLocation("/supervisor");
      } else if (user.role === "student") {
        setLocation("/student");
      }
    }
  }, [user, setLocation]);

  // توجيه المستخدم إلى صفحة تسجيل الدخول المناسبة
  const redirectToLogin = (role: string) => {
    if (role === "admin") {
      setLocation("/admin-login");
    } else if (role === "supervisor") {
      setLocation("/supervisor-login");
    } else if (role === "student") {
      setLocation("/student-login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center p-6">
          <div className="mb-6">
            <img 
              src={getUniversityLogoUrl()} 
              alt="شعار الجامعة" 
              className="mx-auto h-20 w-20 rounded-full shadow-md mb-4" 
            />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">نظام إدارة التدريب الميداني</CardTitle>
          <CardDescription className="text-neutral-600">
            اختر نوع المستخدم للدخول إلى النظام
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-4">
            <Button 
              size="lg"
              className="w-full py-6 text-lg"
              onClick={() => redirectToLogin("student")}
            >
              دخول كطالب
            </Button>
            
            <Button 
              size="lg"
              className="w-full py-6 text-lg"
              onClick={() => redirectToLogin("supervisor")}
            >
              دخول كمشرف
            </Button>
            
            <Button 
              size="lg"
              className="w-full py-6 text-lg"
              onClick={() => redirectToLogin("admin")}
            >
              دخول كمسؤول
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
