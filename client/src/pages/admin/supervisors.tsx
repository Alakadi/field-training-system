import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import AddSupervisorForm from "@/components/admin/add-supervisor-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const AdminSupervisors: React.FC = () => {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Parse query parameters
  const params = new URLSearchParams(location.split("?")[1]);
  const action = params.get("action");

  const [searchQuery, setSearchQuery] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddSupervisorForm, setShowAddSupervisorForm] = useState(action === "new");

  const itemsPerPage = 10;

  // Fetch data
  const { data: supervisors, isLoading: isLoadingSupervisors } = useQuery({
    queryKey: ["/api/supervisors"]
  });

  const { data: faculties } = useQuery({
    queryKey: ["/api/faculties"]
  });

  // Filter supervisors
  const filteredSupervisors = supervisors?.filter((supervisor: any) => {
    let matches = true;

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matches = supervisor.user.name.toLowerCase().includes(query) || 
                (supervisor.department && supervisor.department.toLowerCase().includes(query));
    }

    // Faculty filter
    if (facultyFilter && matches) {
      matches = supervisor.facultyId === parseInt(facultyFilter);
    }

    return matches;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredSupervisors.length / itemsPerPage);
  const paginatedSupervisors = filteredSupervisors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleViewSupervisor = (supervisorId: number) => {
    setLocation(`/admin/supervisors/${supervisorId}`);
  };

  const handleEditSupervisor = (supervisorId: number) => {
    setLocation(`/admin/supervisors/edit/${supervisorId}`);
  };

  const handleDeleteSupervisor = async (supervisorId: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المشرف؟")) {
      try {
        await apiRequest("DELETE", `/api/supervisors/${supervisorId}`);

        toast({
          title: "تم حذف المشرف بنجاح",
        });

        queryClient.invalidateQueries({ queryKey: ["/api/supervisors"] });
      } catch (error) {
        toast({
          title: "فشل حذف المشرف",
          description: error instanceof Error ? error.message : "حدث خطأ أثناء حذف المشرف",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">إدارة المشرفين</h1>
          <div className="flex space-x-2 space-x-reverse">
            <Button
              className="bg-primary hover:bg-primary-dark text-white flex items-center text-sm"
              onClick={() => {
                setShowAddSupervisorForm(true);
                setLocation("/admin/supervisors?action=new");
              }}
            >
              <span className="material-icons ml-1 text-sm">add</span>
              إضافة مشرف
            </Button>
          </div>
        </div>

        {/* Add Supervisor Form */}
        {showAddSupervisorForm && (
          <AddSupervisorForm
            onSuccess={() => {
              setShowAddSupervisorForm(false);
              setLocation("/admin/supervisors");
            }}
          />
        )}

        {/* Search and Filters */}
        <Card className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="بحث عن مشرف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2"
                />
                <span className="material-icons absolute right-3 top-2 text-neutral-500">search</span>
              </div>
            </div>
            <div>
              <Select value={facultyFilter} onValueChange={setFacultyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="كل الكليات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الكليات</SelectItem>
                  {faculties?.map((faculty: any) => (
                    <SelectItem key={faculty.id} value={String(faculty.id)}>
                      {faculty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Supervisors Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    اسم المشرف
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    البريد الإلكتروني
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    الكلية
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {isLoadingSupervisors ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
                      جاري تحميل البيانات...
                    </td>
                  </tr>
                ) : paginatedSupervisors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
                      لا توجد بيانات للعرض
                    </td>
                  </tr>
                ) : (
                  paginatedSupervisors.map((supervisor: any) => {
                    const faculty = faculties?.find((f: any) => f.id === supervisor.facultyId);

                    return (
                      <tr key={supervisor.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                          {supervisor.user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                          {supervisor.user.email || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                          {faculty?.name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            supervisor.user.active ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-800'
                          }`}>
                            {supervisor.user.active ? 'نشط' : 'غير نشط'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-primary hover:text-primary-dark"
                              onClick={() => handleEditSupervisor(supervisor.id)}
                            >
                              <span className="material-icons text-sm">edit</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-neutral-600 hover:text-neutral-900"
                              onClick={() => handleViewSupervisor(supervisor.id)}
                            >
                              <span className="material-icons text-sm">visibility</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-error hover:text-red-700"
                              onClick={() => handleDeleteSupervisor(supervisor.id)}
                            >
                              <span className="material-icons text-sm">delete</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredSupervisors.length > 0 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-neutral-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  التالي
                </Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-neutral-700">
                    عرض
                    <span className="font-medium mx-1">
                      {(currentPage - 1) * itemsPerPage + 1}
                    </span>
                    إلى
                    <span className="font-medium mx-1">
                      {Math.min(currentPage * itemsPerPage, filteredSupervisors.length)}
                    </span>
                    من أصل
                    <span className="font-medium mx-1">{filteredSupervisors.length}</span>
                    مشرف
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <Button
                      variant="outline"
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-neutral-300 text-sm font-medium"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <span className="sr-only">السابق</span>
                      <span className="material-icons text-sm">chevron_right</span>
                    </Button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        pageNum = currentPage - 3 + i;
                      }
                      if (pageNum <= totalPages) {
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            className="relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                      return null;
                    })}

                    <Button
                      variant="outline"
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-neutral-300 text-sm font-medium"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <span className="sr-only">التالي</span>
                      <span className="material-icons text-sm">chevron_left</span>
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSupervisors;