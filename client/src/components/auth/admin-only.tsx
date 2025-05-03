import RoleRedirect from "./role-redirect";

interface AdminOnlyProps {
  children: React.ReactNode;
  redirectPath?: string;
}

/**
 * مكون للتحقق من أن المستخدم هو مسؤول النظام فقط
 */
const AdminOnly: React.FC<AdminOnlyProps> = ({ 
  children, 
  redirectPath = "/login" 
}) => {
  return (
    <RoleRedirect allowedRoles="admin" redirectPath={redirectPath}>
      {children}
    </RoleRedirect>
  );
};

export default AdminOnly;