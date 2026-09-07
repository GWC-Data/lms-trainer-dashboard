import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute() {
  const { isAuthenticated, user, token } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role?.toUpperCase() !== "TRAINER") {
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
