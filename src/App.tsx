import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ContentProvider } from "@/context/ContentContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PublicOnlyRoute from "@/components/auth/PublicOnlyRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Login from "@/pages/Login";
import SetPassword from "@/pages/SetPassword";
import TrainerEmail from "@/pages/TrainerEmail";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import MyCourses from "@/pages/MyCourses";
import Modules from "@/pages/content/Modules";
// import Lessons from "@/pages/content/Lessons"; // Temporarily disabled
// import Videos from "@/pages/content/Videos"; // Temporarily disabled
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
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Toaster richColors position="top-right" />
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/trainer-email" element={<TrainerEmail />} />
              <Route path="/set-password" element={<SetPassword />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/courses" element={<MyCourses />} />
                <Route path="/content/modules" element={<Modules />} />
                {/* <Route path="/content/lessons" element={<Lessons />} /> */} {/* Temporarily disabled */}
                {/* <Route path="/content/videos" element={<Videos />} /> -- Temporarily disabled */}
                <Route path="/content/documents" element={<Documents />} />
                <Route path="/quizzes" element={<Quizzes />} />
                <Route path="/assignments" element={<Assignments />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/trainees" element={<Trainees />} />
                <Route path="/reports" element={<Reports />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ContentProvider>
    </AuthProvider>
  );
}
