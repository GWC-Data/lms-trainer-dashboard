import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * Route guard for authentication pages (Login, Forgot Password, Reset Password, Set Password, Trainer Email).
 * If the user is already authenticated as a Trainer, they are immediately redirected to the Dashboard (/).
 * This strictly prevents the browser Back button from navigating back to authentication pages once logged in.
 */
export default function PublicOnlyRoute() {
  const { isAuthenticated, token, user } = useAuth();

  if (isAuthenticated && token && user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
