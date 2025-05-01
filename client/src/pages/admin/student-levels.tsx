import React from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import UpdateLevelsForm from "@/components/admin/update-levels-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const StudentLevelsPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState("levels");
  
  // Fetch all levels
  const { data: levels, isLoading: isLoadingLevels } = useQuery({
    queryKey: ["/api/levels"]
  });
  
  // Fetch student count per level
  const { data: studentStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/students/stats-by-level"]
  });
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">إدارة مستويات الطلاب</h1>
        </div>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="levels">المستويات</TabsTrigger>
            <TabsTrigger value="update">تحديث المستويات</TabsTrigger>
          </TabsList>
          
          <TabsContent value="levels">
            <Card className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-6">قائمة المستويات</h2>
              
              {isLoadingLevels || isLoadingStats ? (
                <div className="text-center p-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>جاري تحميل البيانات...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableCaption>قائمة المستويات الدراسية في النظام</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>اسم المستوى</TableHead>
                        <TableHead>رمز المستوى</TableHead>
                        <TableHead>عدد الطلاب</TableHead>
                        <TableHead className="text-left">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {levels?.map((level: any, index: number) => (
                        <TableRow key={level.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{level.name}</TableCell>
                          <TableCell>{level.code || "-"}</TableCell>
                          <TableCell>
                            {studentStats?.find((stat: any) => stat.levelId === level.id)?.count || 0}
                          </TableCell>
                          <TableCell className="text-left">
                            <Button variant="outline" size="sm" className="text-xs">
                              تعديل
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {levels?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-neutral-500">
                            لا توجد مستويات لعرضها
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <Button className="bg-primary hover:bg-primary-dark text-white">
                  إضافة مستوى جديد
                </Button>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="update">
            <UpdateLevelsForm 
              onSuccess={() => {
                // Revalidate student stats on successful update
                // This will update the student count per level
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default StudentLevelsPage;