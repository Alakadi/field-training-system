import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import { AuthProvider } from "@/hooks/use-auth";

// Auth components for role-based access
import AdminOnly from "@/components/auth/admin-only";
import SupervisorOnly from "@/components/auth/supervisor-only";
import StudentOnly from "@/components/auth/student-only";

// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminStudents from "@/pages/admin/students";
import AdminCourses from "@/pages/admin/courses";
import AdminSupervisors from "@/pages/admin/supervisors";
import AdminTrainingSites from "@/pages/admin/training-sites";
import AdminReports from "@/pages/admin/reports";
import AdminSettings from "@/pages/admin/settings";
import AdminStudentLevels from "@/pages/admin/student-levels";

// Supervisor pages
import SupervisorDashboard from "@/pages/supervisor/dashboard";
import SupervisorStudents from "@/pages/supervisor/students";
import SupervisorEvaluations from "@/pages/supervisor/evaluations";

// Student pages
import StudentDashboard from "@/pages/student/dashboard";
import StudentCourses from "@/pages/student/courses";
import StudentResults from "@/pages/student/results";

// صفحة للتحويل عند تسجيل الدخول
const RoleRouter: React.FC = () => {
  return (
    <Switch>
      <Route path="/admin">
        <AdminOnly>
          <AdminDashboard />
        </AdminOnly>
      </Route>
      <Route path="/supervisor">
        <SupervisorOnly>
          <SupervisorDashboard />
        </SupervisorOnly>
      </Route>
      <Route path="/student">
        <StudentOnly>
          <StudentDashboard />
        </StudentOnly>
      </Route>
      <Route>
        <Login />
      </Route>
    </Switch>
  );
};

function Router() {
  return (
    <Switch>
      {/* Auth Routes */}
      <Route path="/" component={RoleRouter} />
      <Route path="/login" component={Login} />
      
      {/* Admin Routes */}
      <Route path="/admin/dashboard">
        <AdminOnly>
          <AdminDashboard />
        </AdminOnly>
      </Route>
      <Route path="/admin/students">
        <AdminOnly>
          <AdminStudents />
        </AdminOnly>
      </Route>
      <Route path="/admin/courses">
        <AdminOnly>
          <AdminCourses />
        </AdminOnly>
      </Route>
      <Route path="/admin/supervisors">
        <AdminOnly>
          <AdminSupervisors />
        </AdminOnly>
      </Route>
      <Route path="/admin/training-sites">
        <AdminOnly>
          <AdminTrainingSites />
        </AdminOnly>
      </Route>
      <Route path="/admin/student-levels">
        <AdminOnly>
          <AdminStudentLevels />
        </AdminOnly>
      </Route>
      <Route path="/admin/reports">
        <AdminOnly>
          <AdminReports />
        </AdminOnly>
      </Route>
      <Route path="/admin/settings">
        <AdminOnly>
          <AdminSettings />
        </AdminOnly>
      </Route>
      
      {/* Supervisor Routes */}
      <Route path="/supervisor/dashboard">
        <SupervisorOnly>
          <SupervisorDashboard />
        </SupervisorOnly>
      </Route>
      <Route path="/supervisor/students">
        <SupervisorOnly>
          <SupervisorStudents />
        </SupervisorOnly>
      </Route>
      <Route path="/supervisor/evaluations">
        <SupervisorOnly>
          <SupervisorEvaluations />
        </SupervisorOnly>
      </Route>
      
      {/* Student Routes */}
      <Route path="/student/dashboard">
        <StudentOnly>
          <StudentDashboard />
        </StudentOnly>
      </Route>
      <Route path="/student/courses">
        <StudentOnly>
          <StudentCourses />
        </StudentOnly>
      </Route>
      <Route path="/student/results">
        <StudentOnly>
          <StudentResults />
        </StudentOnly>
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <div dir="rtl" lang="ar" className="font-sans">
            <Toaster />
            <Router />
          </div>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
