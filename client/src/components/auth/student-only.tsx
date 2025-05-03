import RoleRedirect from "./role-redirect";

interface StudentOnlyProps {
  children: React.ReactNode;
  redirectPath?: string;
}

/**
 * مكون للتحقق من أن المستخدم هو طالب فقط
 */
const StudentOnly: React.FC<StudentOnlyProps> = ({ 
  children, 
  redirectPath = "/login" 
}) => {
  return (
    <RoleRedirect allowedRoles="student" redirectPath={redirectPath}>
      {children}
    </RoleRedirect>
  );
};

export default StudentOnly;