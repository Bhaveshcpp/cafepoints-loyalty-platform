import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps a page and enforces:
 *  - user must be logged in
 *  - if `allowedRoles` is given, user.role must be in that list
 *
 * Usage: <ProtectedRoute allowedRoles={["staff"]}><StaffDashboard /></ProtectedRoute>
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    // Session check (GET /auth/me) is still in flight — avoid a flash-redirect to /login
    return <p style={{ textAlign: "center", marginTop: 80 }}>Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in, but wrong role for this page — send them to their own dashboard
    // instead of a generic error, since we already know where they belong.
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
}
