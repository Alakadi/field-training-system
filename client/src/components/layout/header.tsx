import React, { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { getUserAvatarUrl } from "@/lib/utils";
import NotificationBell from "@/components/notifications/notification-bell";
import Icon from "@/components/ui/icon-map";

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
            <Icon name="menu" size={24} />
          </button>
          <div className="text-xl font-bold text-primary">نظام التدريب الميداني</div>
        </div>
        
        <div className="flex items-center space-x-4 space-x-reverse">
          {user && (
            <div className="relative">
              <NotificationBell />
            </div>
          )}
          
          {user && (
            <div className="flex items-center space-x-2 space-x-reverse">
              <img 
                src={getUserAvatarUrl(user.name)} 
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
                  <Icon name="chevron_down" size={20} />
                </button>
                
                {userMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                    <div className="py-1">
                      <Link href={`/${user.role}/profile`}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Icon name="user" size={16} className="ml-2" />
                          الملف الشخصي
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="w-full justify-start px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                      >
                        <Icon name="logout" size={16} className="ml-2" />
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
