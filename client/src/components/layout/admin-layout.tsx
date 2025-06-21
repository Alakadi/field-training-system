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
    { href: "/admin/dashboard", icon: "dashboard", text: "الرئيسية" },
    { href: "/admin/students", icon: "groups", text: "الطلاب" },
    { href: "/admin/supervisors", icon: "supervisor_account", text: "المشرفون" },
    { href: "/admin/courses", icon: "school", text: "الدورات التدريبية" },
    { href: "/admin/training-sites", icon: "location_on", text: "جهات التدريب" },
    { href: "/admin/reports", icon: "assessment", text: "التقارير" },
    { href: "/admin/activity-logs", icon: "history", text: "سجل النشاطات" },
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
