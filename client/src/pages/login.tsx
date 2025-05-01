import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginData } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { getUniversityLogoUrl } from "@/lib/utils";

const Login: React.FC = () => {
  const { login, loading } = useAuth();
  const [activeRole, setActiveRole] = useState<"student" | "supervisor" | "admin">("student");

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginData) => {
    try {
      await login(data);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-100">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <img 
              src={getUniversityLogoUrl()} 
              alt="شعار الجامعة" 
              className="mx-auto h-20 w-20 rounded-full shadow-md mb-4" 
            />
            <h1 className="text-2xl font-bold text-primary">نظام إدارة التدريب الميداني</h1>
            <p className="text-neutral-600">تسجيل الدخول للوصول إلى المنصة</p>
          </div>
          
          <div className="mb-6 flex justify-center space-x-2 space-x-reverse">
            <Button
              type="button"
              onClick={() => setActiveRole("student")}
              variant={activeRole === "student" ? "default" : "outline"}
              className="px-4 py-2 text-sm"
            >
              طالب
            </Button>
            <Button
              type="button"
              onClick={() => setActiveRole("supervisor")}
              variant={activeRole === "supervisor" ? "default" : "outline"}
              className="px-4 py-2 text-sm"
            >
              مشرف
            </Button>
            <Button
              type="button"
              onClick={() => setActiveRole("admin")}
              variant={activeRole === "admin" ? "default" : "outline"}
              className="px-4 py-2 text-sm"
            >
              مسؤول
            </Button>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {activeRole === "student" ? "الرقم الجامعي" : "اسم المستخدم"}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={activeRole === "student" ? "أدخل الرقم الجامعي" : "أدخل اسم المستخدم"} {...field} />
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
                        <Input type="password" placeholder="أدخل كلمة المرور" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "جاري تسجيل الدخول..." : "دخول"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
