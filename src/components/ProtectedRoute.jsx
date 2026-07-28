import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (user.role === 'pending') return <Navigate to="/pending" replace />;

  if (roles && !roles.includes(user.role)) {
    const dest = user.role === 'parent' ? '/parent' : user.role === 'student' ? '/student' : '/admin';
    return <Navigate to={dest} replace />;
  }

  return children;
}
