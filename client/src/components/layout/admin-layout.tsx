import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Header from "./header";
import Sidebar, { SidebarLink } from "./sidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Admin sidebar links
  const adminLinks: SidebarLink[] = [
    { href: "/admin/dashboard", icon: "home", text: "الرئيسية" },
    { href: "/admin/students", icon: "users", text: "الطلاب" },
    { href: "/admin/supervisors", icon: "user", text: "المشرفون" },
    { href: "/admin/courses", icon: "graduation_cap", text: "الدورات التدريبية" },
    { href: "/admin/student-group-assignments", icon: "file_text", text: "تعيين الطلاب للمجموعات" },
    { href: "/admin/training-sites", icon: "map_pin", text: "جهات التدريب" },
    { href: "/admin/faculties", icon: "building", text: "الكليات والتخصصات" },
    { href: "/admin/reports", icon: "bar_chart", text: "التقارير" },
    { href: "/admin/activity-logs", icon: "activity", text: "سجل النشاطات" },
    { href: "/admin/settings", icon: "settings", text: "الإعدادات" },
  ];

  // Check if user is admin
  useEffect(() => {
    if (user && !isAdmin()) {
      // Redirect to login if not admin
      setLocation("/login");
    }
  }, [user, isAdmin, setLocation]);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header toggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          links={adminLinks} 
          title="لوحة التحكم"
          isVisible={sidebarVisible}
        />
        
        <main className="flex-1 overflow-y-auto bg-neutral-100 p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
