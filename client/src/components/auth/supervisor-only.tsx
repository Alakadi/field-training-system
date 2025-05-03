import RoleRedirect from "./role-redirect";

interface SupervisorOnlyProps {
  children: React.ReactNode;
  redirectPath?: string;
}

/**
 * مكون للتحقق من أن المستخدم هو مشرف فقط
 */
const SupervisorOnly: React.FC<SupervisorOnlyProps> = ({ 
  children, 
  redirectPath = "/login" 
}) => {
  return (
    <RoleRedirect allowedRoles="supervisor" redirectPath={redirectPath}>
      {children}
    </RoleRedirect>
  );
};

export default SupervisorOnly;