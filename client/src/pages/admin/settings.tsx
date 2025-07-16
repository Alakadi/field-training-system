import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Icon from "@/components/ui/icon-map";
// Validation schemas
const passwordSchema = z.object({
  currentPassword: z.string().min(1, { message: "كلمة المرور الحالية مطلوبة" }),
  newPassword: z.string().min(8, { message: "كلمة المرور الجديدة يجب أن تكون على الأقل 8 أحرف" }),
  confirmPassword: z.string().min(1, { message: "تأكيد كلمة المرور مطلوب" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "كلمة المرور الجديدة وتأكيدها غير متطابقتين",
  path: ["confirmPassword"],
});

const profileSchema = z.object({
  name: z.string().min(2, { message: "الاسم مطلوب" }),
  email: z.string().email({ message: "البريد الإلكتروني غير صالح" }).optional().or(z.literal("")),
  phone: z.string().optional(),
});

const systemSchema = z.object({
  enableEmailNotifications: z.boolean(),
  enableSmsNotifications: z.boolean(),
  defaultFacultyId: z.string().optional(),
  academicYear: z.string().min(1, { message: "العام الدراسي مطلوب" }),
  semester: z.string().min(1, { message: "الفصل الدراسي مطلوب" }),
});

const levelSchema = z.object({
  name: z.string().min(1, { message: "اسم المستوى مطلوب" }),
});

const AdminSettings: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [isAddingLevel, setIsAddingLevel] = useState(false);
  
  // Fetch user profile data
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["/api/auth/me"]
  });
  
  // Fetch system settings
  const { data: systemSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/settings"]
  });
  
  // Fetch faculties for settings
  const { data: faculties, isLoading: isLoadingFaculties } = useQuery({
    queryKey: ["/api/faculties"]
  });
  
  // Fetch levels
  const { data: levels, isLoading: isLoadingLevels } = useQuery({
    queryKey: ["/api/levels"]
  });
  
  // Password form
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Profile form
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profileData?.name || "",
      email: profileData?.email || "",
      phone: profileData?.phone || "",
    },
  });
  
  // Settings form
  const systemForm = useForm<z.infer<typeof systemSchema>>({
    resolver: zodResolver(systemSchema),
    defaultValues: {
      enableEmailNotifications: systemSettings?.enableEmailNotifications || false,
      enableSmsNotifications: systemSettings?.enableSmsNotifications || false,
      defaultFacultyId: systemSettings?.defaultFacultyId || "",
      academicYear: systemSettings?.academicYear || "",
      semester: systemSettings?.semester || "1",
    },
  });
  
  // Level form
  const levelForm = useForm<z.infer<typeof levelSchema>>({
    resolver: zodResolver(levelSchema),
    defaultValues: {
      name: "",
    },
  });
  
  // Update profile data when loaded
  React.useEffect(() => {
    if (profileData) {
      profileForm.reset({
        name: profileData.name || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
      });
    }
  }, [profileData, profileForm]);
  
  // Update settings data when loaded
  React.useEffect(() => {
    if (systemSettings) {
      systemForm.reset({
        enableEmailNotifications: systemSettings.enableEmailNotifications || false,
        enableSmsNotifications: systemSettings.enableSmsNotifications || false,
        defaultFacultyId: systemSettings.defaultFacultyId || "",
        academicYear: systemSettings.academicYear || "",
        semester: systemSettings.semester || "1",
      });
    }
  }, [systemSettings, systemForm]);
  
  // Password update mutation
  const updatePasswordMutation = useMutation({
    mutationFn: (data: z.infer<typeof passwordSchema>) => 
      apiRequest("POST", "/api/auth/change-password", data),
    onSuccess: () => {
      toast({
        title: "تم تغيير كلمة المرور بنجاح",
      });
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "فشل تغيير كلمة المرور",
        description: error.message || "حدث خطأ أثناء تغيير كلمة المرور",
        variant: "destructive",
      });
    },
  });
  
  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: z.infer<typeof profileSchema>) => 
      apiRequest("PUT", "/api/auth/profile", data),
    onSuccess: () => {
      toast({
        title: "تم تحديث الملف الشخصي بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: any) => {
      toast({
        title: "فشل تحديث الملف الشخصي",
        description: error.message || "حدث خطأ أثناء تحديث الملف الشخصي",
        variant: "destructive",
      });
    },
  });
  
  // System settings update mutation
  const updateSystemSettingsMutation = useMutation({
    mutationFn: (data: z.infer<typeof systemSchema>) => 
      apiRequest("PUT", "/api/settings", data),
    onSuccess: () => {
      toast({
        title: "تم تحديث إعدادات النظام بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "فشل تحديث إعدادات النظام",
        description: error.message || "حدث خطأ أثناء تحديث إعدادات النظام",
        variant: "destructive",
      });
    },
  });
  
  // Add level mutation
  const addLevelMutation = useMutation({
    mutationFn: (data: z.infer<typeof levelSchema>) => 
      apiRequest("POST", "/api/levels", data),
    onSuccess: () => {
      toast({
        title: "تم إضافة المستوى بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/levels"] });
      levelForm.reset();
      setIsAddingLevel(false);
    },
    onError: (error: any) => {
      toast({
        title: "فشل إضافة المستوى",
        description: error.message || "حدث خطأ أثناء إضافة المستوى",
        variant: "destructive",
      });
    },
  });
  
  // Delete level mutation
  const deleteLevelMutation = useMutation({
    mutationFn: (levelId: number) => 
      apiRequest("DELETE", `/api/levels/${levelId}`),
    onSuccess: () => {
      toast({
        title: "تم حذف المستوى بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/levels"] });
    },
    onError: (error: any) => {
      toast({
        title: "فشل حذف المستوى",
        description: error.message || "حدث خطأ أثناء حذف المستوى",
        variant: "destructive",
      });
    },
  });
  
  // Form submissions
  const onPasswordSubmit = (data: z.infer<typeof passwordSchema>) => {
    updatePasswordMutation.mutate(data);
  };
  
  const onProfileSubmit = (data: z.infer<typeof profileSchema>) => {
    updateProfileMutation.mutate(data);
  };
  
  const onSystemSubmit = (data: z.infer<typeof systemSchema>) => {
    updateSystemSettingsMutation.mutate(data);
  };
  
  const onLevelSubmit = (data: z.infer<typeof levelSchema>) => {
    addLevelMutation.mutate(data);
  };
  
  const handleDeleteLevel = (levelId: number) => {
    deleteLevelMutation.mutate(levelId);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">الإعدادات</h1>
        </div>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="profile">الملف الشخصي</TabsTrigger>
            <TabsTrigger value="password">كلمة المرور</TabsTrigger>
            <TabsTrigger value="system">إعدادات النظام</TabsTrigger>
            <TabsTrigger value="levels">المستويات</TabsTrigger>
            <TabsTrigger value="faculties">الكليات والتخصصات</TabsTrigger>
            <TabsTrigger value="academic-years">السنوات الدراسية</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <Card className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-6">الملف الشخصي</h2>
              
              {isLoadingProfile ? (
                <div className="text-center p-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>جاري تحميل البيانات...</p>
                </div>
              ) : (
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الاسم</FormLabel>
                          <FormControl>
                            <Input placeholder="أدخل الاسم الكامل" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>البريد الإلكتروني</FormLabel>
                          <FormControl>
                            <Input placeholder="أدخل البريد الإلكتروني" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم الهاتف</FormLabel>
                          <FormControl>
                            <Input placeholder="أدخل رقم الهاتف" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        className="bg-primary hover:bg-primary-dark text-white"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </Card>
          </TabsContent>
          
          <TabsContent value="password">
            <Card className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-6">تغيير كلمة المرور</h2>
              
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>كلمة المرور الحالية</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل كلمة المرور الحالية" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>كلمة المرور الجديدة</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل كلمة المرور الجديدة" type="password" {...field} />
                        </FormControl>
                        <FormDescription>
                          يجب أن تكون كلمة المرور على الأقل 8 أحرف.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تأكيد كلمة المرور الجديدة</FormLabel>
                        <FormControl>
                          <Input placeholder="أعد إدخال كلمة المرور الجديدة" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      className="bg-primary hover:bg-primary-dark text-white"
                      disabled={updatePasswordMutation.isPending}
                    >
                      {updatePasswordMutation.isPending ? "جاري التغيير..." : "تغيير كلمة المرور"}
                    </Button>
                  </div>
                </form>
              </Form>
            </Card>
          </TabsContent>
          
          <TabsContent value="system">
            <Card className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-6">إعدادات النظام</h2>
              
              {isLoadingSettings ? (
                <div className="text-center p-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>جاري تحميل البيانات...</p>
                </div>
              ) : (
                <Form {...systemForm}>
                  <form onSubmit={systemForm.handleSubmit(onSystemSubmit)} className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">الإشعارات</h3>
                      <Separator className="mb-4" />
                      
                      <div className="space-y-3">
                        <FormField
                          control={systemForm.control}
                          name="enableEmailNotifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between p-4 rounded-lg border">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">إشعارات البريد الإلكتروني</FormLabel>
                                <FormDescription>
                                  إرسال إشعارات النظام عبر البريد الإلكتروني.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={systemForm.control}
                          name="enableSmsNotifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between p-4 rounded-lg border">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">إشعارات الرسائل النصية</FormLabel>
                                <FormDescription>
                                  إرسال إشعارات النظام عبر الرسائل النصية.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">الإعدادات الأكاديمية</h3>
                      <Separator className="mb-4" />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={systemForm.control}
                          name="defaultFacultyId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>الكلية الافتراضية</FormLabel>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value}
                                onChange={field.onChange}
                              >
                                <option value="">اختر الكلية الافتراضية</option>
                                {faculties?.map((faculty: any) => (
                                  <option key={faculty.id} value={faculty.id.toString()}>
                                    {faculty.name}
                                  </option>
                                ))}
                              </select>
                              <FormDescription>
                                الكلية الافتراضية للطلاب الجدد.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={systemForm.control}
                          name="academicYear"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>العام الدراسي</FormLabel>
                              <FormControl>
                                <Input placeholder="مثال: 2024-2025" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={systemForm.control}
                          name="semester"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>الفصل الدراسي</FormLabel>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={field.value}
                                onChange={field.onChange}
                              >
                                <option value="1">الفصل الأول</option>
                                <option value="2">الفصل الثاني</option>
                                <option value="3">الفصل الصيفي</option>
                              </select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        className="bg-primary hover:bg-primary-dark text-white"
                        disabled={updateSystemSettingsMutation.isPending}
                      >
                        {updateSystemSettingsMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </Card>
          </TabsContent>
          
          <TabsContent value="levels">
            <Card className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">إدارة المستويات الدراسية</h2>
                <Button 
                  onClick={() => setIsAddingLevel(true)}
                  className="bg-primary hover:bg-primary-dark text-white"
                >
                  <Icon name="add" size={16} />
                  إضافة مستوى
                </Button>
              </div>
              
              {isAddingLevel && (
                <Card className="mb-6 p-4 bg-gray-50">
                  <h3 className="text-lg font-medium mb-4">إضافة مستوى جديد</h3>
                  <Form {...levelForm}>
                    <form onSubmit={levelForm.handleSubmit(onLevelSubmit)} className="space-y-4">
                      <FormField
                        control={levelForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>اسم المستوى</FormLabel>
                            <FormControl>
                              <Input placeholder="مثال: المستوى الأول" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end space-x-2 space-x-reverse">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsAddingLevel(false);
                            levelForm.reset();
                          }}
                        >
                          إلغاء
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={addLevelMutation.isPending}
                          className="bg-primary hover:bg-primary-dark text-white"
                        >
                          {addLevelMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </Card>
              )}
              
              {isLoadingLevels ? (
                <div className="text-center p-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>جاري تحميل المستويات...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableCaption>قائمة المستويات الدراسية في النظام</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>اسم المستوى</TableHead>
                        <TableHead className="text-left">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {levels?.map((level: any, index: number) => (
                        <TableRow key={level.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{level.name}</TableCell>
                          <TableCell className="text-left">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  className="text-xs"
                                  disabled={deleteLevelMutation.isPending}
                                >
                                  <Icon name="delete" size={14} />
                                  حذف
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل أنت متأكد من حذف المستوى "{level.name}"؟ 
                                    لا يمكن التراجع عن هذا الإجراء.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteLevel(level.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {levels?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-neutral-500">
                            لا توجد مستويات لعرضها
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>
          
          <TabsContent value="faculties">
            <Card className="bg-white p-6 rounded-lg shadow">
              <iframe 
                src="/admin/faculties" 
                className="w-full h-[600px] border-0"
                title="إدارة الكليات والتخصصات"
              />
            </Card>
          </TabsContent>
          
          <TabsContent value="academic-years">
            <Card className="bg-white p-6 rounded-lg shadow">
              <iframe 
                src="/admin/academic-years" 
                className="w-full h-[600px] border-0"
                title="إدارة السنوات الدراسية"
              />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;