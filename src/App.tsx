import { HashRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ContentProvider } from "@/context/ContentContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import MyCourses from "@/pages/MyCourses";
import Modules from "@/pages/content/Modules";
import Lessons from "@/pages/content/Lessons";
import Videos from "@/pages/content/Videos";
import Documents from "@/pages/content/Documents";
import Quizzes from "@/pages/Quizzes";
import Assignments from "@/pages/Assignments";
import Attendance from "@/pages/Attendance";
import Trainees from "@/pages/Trainees";
import Reports from "@/pages/Reports";

export default function App() {
  return (
    <AuthProvider>
      <ContentProvider>
        <HashRouter>
          <Toaster richColors position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/courses" element={<MyCourses />} />
                <Route path="/content/modules" element={<Modules />} />
                <Route path="/content/lessons" element={<Lessons />} />
                <Route path="/content/videos" element={<Videos />} />
                <Route path="/content/documents" element={<Documents />} />
                <Route path="/quizzes" element={<Quizzes />} />
                <Route path="/assignments" element={<Assignments />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/trainees" element={<Trainees />} />
                <Route path="/reports" element={<Reports />} />
              </Route>
            </Route>
          </Routes>
        </HashRouter>
      </ContentProvider>
    </AuthProvider>
  );
}
