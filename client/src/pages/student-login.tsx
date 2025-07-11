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

const formSchema = z.object({
  username: z.string().min(1, "الرقم الجامعي مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

const StudentLogin: React.FC = () => {
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
      
      // التحقق من أن المستخدم هو طالب
      if (user.role !== "student") {
        throw new Error("ليس لديك صلاحية للدخول كطالب");
      }
      
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: `مرحباً ${user.name}`,
      });
      
      window.location.href = "/student/dashboard";

      // setLocation("/student");
    } catch (error) {
      setError(error instanceof Error ? error.message : "حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100" style={{backgroundColor: '#1e3a8a'}}>
      <div className="w-full max-w-md p-4">
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-6">
              <img 
                src="/logo.png" 
                alt="شعار الجامعة" 
                className="h-24 w-auto object-contain"
                onError={(e) => {
                  console.log('Error loading logo from /logo.png');
                  e.currentTarget.src = '/client/public/logo.png';
                }}
                onLoad={() => console.log('Logo loaded successfully')}
              />
            </div>
            <CardTitle className="text-2xl font-bold" style={{color: '#1e3a8a'}}>تسجيل دخول الطالب</CardTitle>
            <CardDescription className="mt-2" style={{color: '#1e40af'}}>
              قم بتسجيل الدخول للوصول إلى نظام التدريب الميداني
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الرقم الجامعي</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل الرقم الجامعي" {...field} />
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
                  className="w-full text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                  style={{backgroundColor: '#1e3a8a'}}
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
                  <Button variant="link" className="font-medium" style={{color: '#1e3a8a'}}>
                    تسجيل دخول كمسؤول
                  </Button>
                </Link>
                <Link href="/supervisor-login">
                  <Button variant="link" className="font-medium" style={{color: '#1e3a8a'}}>
                    تسجيل دخول كمشرف
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