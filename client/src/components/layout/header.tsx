import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { getUserAvatarUrl } from "@/lib/utils";

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const handleLogout = async () => {
    await logout();
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "مسؤول النظام";
      case "supervisor":
        return "مشرف أكاديمي";
      case "student":
        return "طالب";
      default:
        return role;
    }
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="flex justify-between items-center px-4 py-2">
        <div className="flex items-center space-x-4 space-x-reverse">
          <button 
            onClick={toggleSidebar}
            className="md:hidden text-neutral-700 focus:outline-none"
          >
            <span className="material-icons">menu</span>
          </button>
          <div className="text-xl font-bold text-primary">نظام التدريب الميداني</div>
        </div>
        
        <div className="flex items-center space-x-4 space-x-reverse">
          <div className="relative">
            <button className="text-neutral-700 focus:outline-none">
              <span className="material-icons">notifications</span>
              <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                3
              </span>
            </button>
          </div>
          
          {user && (
            <div className="flex items-center space-x-2 space-x-reverse">
              <img 
                src={getUserAvatarUrl(user.id)} 
                alt="صورة المستخدم" 
                className="h-8 w-8 rounded-full" 
              />
              <div className="text-sm">
                <div className="font-medium">{user.name}</div>
                <div className="text-neutral-500 text-xs">{getRoleText(user.role)}</div>
              </div>
              
              <div className="relative">
                <button 
                  onClick={toggleUserMenu}
                  className="text-neutral-700 focus:outline-none"
                >
                  <span className="material-icons">arrow_drop_down</span>
                </button>
                
                {userMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                    <div className="py-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                      >
                        الملف الشخصي
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                      >
                        الإعدادات
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="w-full justify-start px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                      >
                        تسجيل الخروج
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
