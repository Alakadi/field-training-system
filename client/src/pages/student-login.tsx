import React, { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Alert, AlertDescription } from "../components/ui/alert";
import { useAuth } from "../hooks/use-auth";
import { Link } from "wouter";
import { useToast } from "../hooks/use-toast";
import { GraduationCap, Lock, User, Eye, EyeOff } from "lucide-react";
import JanadLogo from "../assets/JanadLogo1.png";

const formSchema = z.object({
  username: z.string().min(1, "الرقم الجامعي مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

const StudentLogin = () => {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values) => {
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
      
      // التحقق من أن المستخدم هو طالب
      if (user.role !== "student") {
        throw new Error("ليس لديك صلاحية للدخول كطالب");
      }
      
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: `مرحباً ${user.name}`,
      });
      
      window.location.href = "/student/dashboard";

    } catch (error) {
      setError(error instanceof Error ? error.message : "حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen janad-gradient janad-pattern p-4">
      <div className="w-full max-w-md">
        {/* Header with Logo */}
        <div className="text-center mb-8 janad-fade-in">
          <div className="flex justify-center mb-4">
            <img 
              src={JanadLogo} 
              alt="شعار جامعة الجناد" 
              className="h-20 w-auto janad-logo-glow janad-floating"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            جامعة الجناد للعلوم والتكنولوجيا
          </h1>
          <p className="text-white/80">نظام إدارة التعلم الإلكتروني</p>
        </div>

        {/* Login Card */}
        <Card className="janad-glass janad-card-shadow border-0 janad-slide-up">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              تسجيل دخول الطالب
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              قم بتسجيل الدخول للوصول إلى نظام التدريب الميداني
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary font-medium">الرقم الجامعي</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="أدخل الرقم الجامعي" 
                            className="pr-10 janad-input-focus janad-border-gradient"
                            {...field} 
                          />
                        </div>
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
                      <FormLabel className="text-primary font-medium">كلمة المرور</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="أدخل كلمة المرور"
                            className="pr-10 pl-10 janad-input-focus janad-border-gradient"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute left-3 top-3 text-muted-foreground hover:text-primary"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 janad-button-hover"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      جاري تسجيل الدخول...
                    </div>
                  ) : (
                    'تسجيل الدخول'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex justify-center pt-6">
            <div className="text-center text-sm">
              <p className="text-muted-foreground mb-3">أو سجل دخولك كـ</p>
              <div className="flex space-x-2 space-x-reverse justify-center">
                <Link href="/admin-login">
                  <Button variant="outline" size="sm" className="text-xs hover:bg-primary/10">
                    مسؤول
                  </Button>
                </Link>
                <Link href="/supervisor-login">
                  <Button variant="outline" size="sm" className="text-xs hover:bg-primary/10">
                    مشرف
                  </Button>
                </Link>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default StudentLogin;

