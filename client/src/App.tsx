import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import { AuthProvider } from "@/hooks/use-auth";

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

function Router() {
  return (
    <Switch>
      {/* Auth Routes */}
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      
      {/* Admin Routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/students" component={AdminStudents} />
      <Route path="/admin/courses" component={AdminCourses} />
      <Route path="/admin/supervisors" component={AdminSupervisors} />
      <Route path="/admin/training-sites" component={AdminTrainingSites} />
      <Route path="/admin/student-levels" component={AdminStudentLevels} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/settings" component={AdminSettings} />
      
      {/* Supervisor Routes */}
      <Route path="/supervisor" component={SupervisorDashboard} />
      <Route path="/supervisor/dashboard" component={SupervisorDashboard} />
      <Route path="/supervisor/students" component={SupervisorStudents} />
      <Route path="/supervisor/evaluations" component={SupervisorEvaluations} />
      
      {/* Student Routes */}
      <Route path="/student" component={StudentDashboard} />
      <Route path="/student/dashboard" component={StudentDashboard} />
      <Route path="/student/courses" component={StudentCourses} />
      <Route path="/student/results" component={StudentResults} />
      
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
