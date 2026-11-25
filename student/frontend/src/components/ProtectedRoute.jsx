import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function StudentRouteGate() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center text-xs text-muted">Loading student portal…</div>;
  if (user?.passwordChangeRequired && location.pathname !== '/student/change-password') return <Navigate to="/student/change-password" replace />;
  if (location.pathname === '/student/change-password') {
    if (!user) return <Navigate to="/student/login" replace />;
    if (!user.passwordChangeRequired) return <Navigate to="/student/dashboard" replace />;
  }
  return <Outlet />;
}

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-xs text-muted">Loading student portal…</div>;
  if (!user) return <Navigate to="/student/login" replace />;
  if (user.passwordChangeRequired) return <Navigate to="/student/change-password" replace />;
  return <Outlet />;
}
