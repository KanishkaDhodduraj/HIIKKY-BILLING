import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-xs text-muted">Loading workspace…</div>;
  return user ? (children || <Outlet/>) : <Navigate to="/owner/login" replace/>;
}
