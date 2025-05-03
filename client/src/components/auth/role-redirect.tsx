import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";

type RoleType = "admin" | "supervisor" | "student";

interface RoleRedirectProps {
  allowedRoles: RoleType[] | RoleType;
  redirectPath: string;
  children: React.ReactNode;
}

/**
 * مكون لتوجيه المستخدمين بناءً على أدوارهم
 * يسمح فقط للمستخدمين ذوي الأدوار المسموح بها بالوصول إلى المحتوى
 * ويعيد توجيه المستخدمين الآخرين إلى المسار المحدد
 */
const RoleRedirect: React.FC<RoleRedirectProps> = ({
  allowedRoles,
  redirectPath,
  children,
}) => {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // تحويل allowedRoles إلى مصفوفة إذا لم تكن بالفعل
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  useEffect(() => {
    // انتظر حتى يتم تحميل معلومات المستخدم
    if (!loading) {
      // إذا لم يكن المستخدم مسجل الدخول أو ليس لديه دور مسموح به، قم بإعادة التوجيه
      if (!user || !roles.includes(user.role as RoleType)) {
        setLocation(redirectPath);
      }
    }
  }, [user, loading, roles, redirectPath, setLocation]);

  // عرض شاشة التحميل أثناء التحقق من المستخدم
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-lg font-medium text-neutral-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // عرض المحتوى فقط إذا كان المستخدم لديه دور مسموح به
  return user && roles.includes(user.role as RoleType) ? (
    <>{children}</>
  ) : null;
};

export default RoleRedirect;