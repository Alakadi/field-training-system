import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Header from "./header";
import Sidebar, { SidebarLink } from "./sidebar";

interface StudentLayoutProps {
  children: React.ReactNode;
}

const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  const { user, isStudent } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Student sidebar links
  const studentLinks: SidebarLink[] = [
    { href: "/student/dashboard", icon: "dashboard", text: "الرئيسية" },
    { href: "/student/courses", icon: "menu_book", text: "دوراتي" },
    { href: "/student/results", icon: "star", text: "نتائجي" },
    // { href: "/student/profile", icon: "person", text: "الملف الشخصي" },
  ];

  // Check if user is student
  useEffect(() => {
    if (user && !isStudent()) {
      // Redirect to login if not student
      setLocation("/login");
    }
  }, [user, isStudent, setLocation]);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header toggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          links={studentLinks} 
          title="منطقة الطالب"
          isVisible={sidebarVisible}
        />
        
        <main className="flex-1 overflow-y-auto bg-neutral-100 p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
