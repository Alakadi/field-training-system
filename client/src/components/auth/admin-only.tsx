import React from "react";
import RoleRedirect from "./role-redirect";

interface AdminOnlyProps {
  children: React.ReactNode;
}

/**
 * مكون للمحتوى المتاح فقط للمسؤولين
 * يقوم بإعادة توجيه المستخدمين غير المسؤولين إلى صفحة تسجيل دخول المسؤول
 */
const AdminOnly: React.FC<AdminOnlyProps> = ({ children }) => {
  return (
    <RoleRedirect allowedRoles="admin" redirectPath="/admin-login">
      {children}
    </RoleRedirect>
  );
};

export default AdminOnly;