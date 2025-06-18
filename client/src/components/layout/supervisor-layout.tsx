import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Header from "./header";
import Sidebar, { SidebarLink } from "./sidebar";

interface SupervisorLayoutProps {
  children: React.ReactNode;
}

const SupervisorLayout: React.FC<SupervisorLayoutProps> = ({ children }) => {
  const { user, isSupervisor } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Supervisor sidebar links
  const supervisorLinks: SidebarLink[] = [
    { href: "/supervisor/dashboard", icon: "dashboard", text: "الرئيسية" },
    { href: "/supervisor/courses", icon: "school", text: "إدارة الكورسات" },
    { href: "/supervisor/evaluations", icon: "grading", text: "التقييمات" },
    { href: "/supervisor/reports", icon: "description", text: "التقارير" },
  ];

  // Check if user is supervisor
  useEffect(() => {
    if (user && !isSupervisor()) {
      // Redirect to login if not supervisor
      setLocation("/login");
    }
  }, [user, isSupervisor, setLocation]);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header toggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          links={supervisorLinks} 
          title="منطقة المشرف"
          isVisible={sidebarVisible}
        />
        
        <main className="flex-1 overflow-y-auto bg-neutral-100 p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SupervisorLayout;
