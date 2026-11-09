import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/*
 * `rider` was added with the rider system.
 * A guest is sent to the matching sign-in page, and a signed-in user with the
 * wrong role is sent back to that same page instead of seeing the dashboard.
 */
export default function ProtectedRoute({ children, admin = false, rider = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loading">
        <span className="spinner" aria-hidden="true" />
        <p>Checking your session…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={admin ? "/admin/login" : rider ? "/rider/login" : "/login"}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (admin && user.role !== "admin") {
    return <Navigate to="/admin/login" replace />;
  }

  if (rider && user.role !== "rider") {
    return <Navigate to="/rider/login" replace />;
  }

  return children;
}
