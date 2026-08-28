import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
    return (_jsx(AuthProvider, { children: _jsx(ContentProvider, { children: _jsxs(BrowserRouter, { children: [_jsx(Toaster, { richColors: true, position: "top-right" }), _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { element: _jsx(ProtectedRoute, {}), children: _jsxs(Route, { element: _jsx(DashboardLayout, {}), children: [_jsx(Route, { path: "/", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/courses", element: _jsx(MyCourses, {}) }), _jsx(Route, { path: "/content/modules", element: _jsx(Modules, {}) }), _jsx(Route, { path: "/content/lessons", element: _jsx(Lessons, {}) }), _jsx(Route, { path: "/content/videos", element: _jsx(Videos, {}) }), _jsx(Route, { path: "/content/documents", element: _jsx(Documents, {}) }), _jsx(Route, { path: "/quizzes", element: _jsx(Quizzes, {}) }), _jsx(Route, { path: "/assignments", element: _jsx(Assignments, {}) }), _jsx(Route, { path: "/attendance", element: _jsx(Attendance, {}) }), _jsx(Route, { path: "/trainees", element: _jsx(Trainees, {}) }), _jsx(Route, { path: "/reports", element: _jsx(Reports, {}) })] }) })] })] }) }) }));
}
