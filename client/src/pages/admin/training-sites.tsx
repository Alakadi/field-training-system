import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import AddTrainingSiteForm from "@/components/admin/add-training-site-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon-map";
import { useLocation } from "wouter";

const AdminTrainingSites: React.FC = () => {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Parse query parameters
  const params = new URLSearchParams(location.split("?")[1]);
  const action = params.get("action");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddSiteForm, setShowAddSiteForm] = useState(action === "new");
  
  const itemsPerPage = 10;

  // Fetch training sites
  const { data: trainingSites, isLoading: isLoadingSites } = useQuery({
    queryKey: ["/api/training-sites"]
  });

  // Filter sites by search query
  const filteredSites = trainingSites?.filter((site: any) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      site.name.toLowerCase().includes(query) || 
      (site.address && site.address.toLowerCase().includes(query)) ||
      (site.contactName && site.contactName.toLowerCase().includes(query))
    );
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredSites.length / itemsPerPage);
  const paginatedSites = filteredSites.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDeleteSite = async (siteId: number) => {
    if (window.confirm("هل أنت متأكد من حذف جهة التدريب هذه؟")) {
      try {
        await apiRequest("DELETE", `/api/training-sites/${siteId}`);
        
        toast({
          title: "تم حذف جهة التدريب بنجاح",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/training-sites"] });
      } catch (error) {
        toast({
          title: "فشل حذف جهة التدريب",
          description: error instanceof Error ? error.message : "حدث خطأ أثناء حذف جهة التدريب",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">إدارة جهات التدريب</h1>
          <div className="flex space-x-2 space-x-reverse">
            <Button
              className="bg-primary hover:bg-primary-dark text-white flex items-center text-sm"
              onClick={() => {
                setShowAddSiteForm(true);
                setLocation("/admin/training-sites?action=new");
              }}
            >
              <Icon name="plus" size={16} />
              إضافة جهة تدريب
            </Button>
          </div>
        </div>

        {/* Add Training Site Form */}
        {showAddSiteForm && (
          <AddTrainingSiteForm
            onSuccess={() => {
              setShowAddSiteForm(false);
              setLocation("/admin/training-sites");
            }}
          />
        )}

        {/* Search */}
        <Card className="bg-white p-4 rounded-lg shadow">
          <div className="relative">
            <Input
              type="text"
              placeholder="بحث عن جهة تدريب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2"
            />
            <Icon name="search" size={16} />
          </div>
        </Card>

        {/* Training Sites Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    اسم الجهة
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    العنوان
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    جهة الاتصال
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    البريد الإلكتروني
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    رقم الهاتف
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    عدد الدورات
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {isLoadingSites ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      جاري تحميل البيانات...
                    </td>
                  </tr>
                ) : paginatedSites.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      لا توجد بيانات للعرض
                    </td>
                  </tr>
                ) : (
                  paginatedSites.map((site: any) => (
                    <tr key={site.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                        {site.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {site.address || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {site.contactName || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {site.contactEmail || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {site.contactPhone || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        {site.courseCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark">
                            <Icon name="edit" size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-neutral-600 hover:text-neutral-900">
                            <Icon name="eye" size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error hover:text-red-700"
                            onClick={() => handleDeleteSite(site.id)}
                          >
                            <Icon name="trash" size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {filteredSites.length > 0 && (
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
                      {Math.min(currentPage * itemsPerPage, filteredSites.length)}
                    </span>
                    من أصل
                    <span className="font-medium mx-1">{filteredSites.length}</span>
                    جهة تدريب
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
                      <Icon name="chevron_right" size={16} />
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
                      <Icon name="chevron_left" size={16} />
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

export default AdminTrainingSites;