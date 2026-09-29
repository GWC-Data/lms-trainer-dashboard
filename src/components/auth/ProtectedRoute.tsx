import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute() {
  const { isAuthenticated, user, token } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user.role?.toUpperCase();
  if (role !== "TRAINER" && role !== "ADMIN") {
    return (
      <Navigate
        to="/login"
        state={{ from: location, error: "Access restricted to Trainer accounts." }}
        replace
      />
    );
  }

  return <Outlet />;
}
