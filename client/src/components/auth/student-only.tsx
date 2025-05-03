import React from "react";
import RoleRedirect from "./role-redirect";

interface StudentOnlyProps {
  children: React.ReactNode;
}

/**
 * مكون للمحتوى المتاح فقط للطلاب
 * يقوم بإعادة توجيه المستخدمين غير الطلاب إلى صفحة تسجيل دخول الطالب
 */
const StudentOnly: React.FC<StudentOnlyProps> = ({ children }) => {
  return (
    <RoleRedirect allowedRoles="student" redirectPath="/student-login">
      {children}
    </RoleRedirect>
  );
};

export default StudentOnly;