import React, { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import ErrorMessage from "@/components/ui/error-message";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast-notification";
import janadLogoPath from "@assets/JanadLogo1_1752368846626.png";

const formSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

const SupervisorLogin: React.FC = () => {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "حدث خطأ أثناء تسجيل الدخول");
      }

      const user = await res.json();
      
      // التحقق من أن المستخدم هو مشرف
      if (user.role !== "supervisor") {
        throw new Error("ليس لديك صلاحية للدخول كمشرف");
      }
      
      showSuccessToast(`مرحباً ${user.name}`, "تم تسجيل الدخول بنجاح");
      window.location.href = "/supervisor/dashboard";
      // setLocation("/supervisor");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء تسجيل الدخول";
      setError(errorMessage);
      showErrorToast(errorMessage, "خطأ في تسجيل الدخول");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-white/5" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '20px 20px'}}></div>
      </div>
      
      {/* Floating elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-green-400/20 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-teal-400/20 rounded-full blur-xl animate-pulse animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-emerald-400/20 rounded-full blur-xl animate-pulse animation-delay-4000"></div>
      
      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* University Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-xl scale-110"></div>
                <div className="relative bg-white/90 backdrop-blur-sm rounded-full p-4 shadow-2xl">
                  <img 
                    src={janadLogoPath} 
                    alt="شعار جامعة الجند" 
                    className="h-24 w-auto object-contain"
                  />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">جامعة الجند</h1>
            <p className="text-green-100 text-lg">نظام إدارة التدريب الميداني</p>
          </div>
          
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-bold text-green-800">تسجيل دخول المشرف</CardTitle>
              <CardDescription className="text-green-600 mt-2">
                قم بتسجيل الدخول للوصول إلى لوحة تحكم المشرف
              </CardDescription>
            </CardHeader>
          <CardContent>
            {error && (
              <ErrorMessage 
                type="error" 
                message={error} 
                className="mb-4"
                onClose={() => setError("")}
              />
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المستخدم</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل اسم المستخدم" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>كلمة المرور</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="أدخل كلمة المرور"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                  disabled={isLoading}
                >
                  {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center pt-6">
            <div className="text-center text-sm">
              <p className="text-gray-600 mb-3">هل تريد تسجيل الدخول بصفة أخرى؟</p>
              <div className="flex space-x-2 space-x-reverse justify-center">
                <Link href="/admin-login">
                  <Button variant="link" className="text-green-600 hover:text-green-800 font-medium">
                    تسجيل دخول كمسؤول
                  </Button>
                </Link>
                <Link href="/student-login">
                  <Button variant="link" className="text-green-600 hover:text-green-800 font-medium">
                    تسجيل دخول كطالب
                  </Button>
                </Link>
              </div>
            </div>
          </CardFooter>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-8 text-white/80">
          <p className="text-sm">© 2025 جامعة الجند - جميع الحقوق محفوظة</p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorLogin;