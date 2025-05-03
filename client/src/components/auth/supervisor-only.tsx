import React from "react";
import RoleRedirect from "./role-redirect";

interface SupervisorOnlyProps {
  children: React.ReactNode;
}

/**
 * مكون للمحتوى المتاح فقط للمشرفين
 * يقوم بإعادة توجيه المستخدمين غير المشرفين إلى صفحة تسجيل دخول المشرف
 */
const SupervisorOnly: React.FC<SupervisorOnlyProps> = ({ children }) => {
  return (
    <RoleRedirect allowedRoles="supervisor" redirectPath="/supervisor-login">
      {children}
    </RoleRedirect>
  );
};

export default SupervisorOnly;