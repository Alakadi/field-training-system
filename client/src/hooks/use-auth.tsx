import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { LoginData } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  name: string;
  role: "admin" | "supervisor" | "student";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginData) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  isSupervisor: () => boolean;
  isStudent: () => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  isAdmin: () => false,
  isSupervisor: () => false,
  isStudent: () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (data: LoginData) => {
    try {
      setLoading(true);
      const res = await apiRequest("POST", "/api/auth/login", data);
      const userData = await res.json();
      
      setUser(userData);
      
      // Redirect based on role
      if (userData.role === "admin") {
        setLocation("/admin");
      } else if (userData.role === "supervisor") {
        setLocation("/supervisor");
      } else if (userData.role === "student") {
        setLocation("/student");
      }
      
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: `مرحباً ${userData.name}`,
      });
    } catch (error) {
      toast({
        title: "فشل تسجيل الدخول",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء تسجيل الدخول",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
      setLocation("/login");
      toast({
        title: "تم تسجيل الخروج بنجاح",
      });
    } catch (error) {
      toast({
        title: "فشل تسجيل الخروج",
        description: "حدث خطأ أثناء تسجيل الخروج",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = () => user?.role === "admin";
  const isSupervisor = () => user?.role === "supervisor";
  const isStudent = () => user?.role === "student";

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isSupervisor, isStudent }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
