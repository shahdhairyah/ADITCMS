import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, loading, role, mustChangePassword } = useAuth();

  const hasToken = !!localStorage.getItem('token');
  const authed = isAuthenticated || hasToken;

  if (loading && !hasToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <div className="text-center">
          <LoadingSpinner size="lg" text="Loading..." />
        </div>
      </div>
    );
  }

  if (!authed) {
    return <Navigate to="/login" replace />;
  }

  // While the account still holds the provisioning password the API answers
  // every other endpoint with 403, so send it straight to the one page that
  // works instead of letting it load a dashboard full of failed requests.
  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    const redirectRole = role || (hasToken ? JSON.parse(localStorage.getItem('user') || '{}')?.role : null);
    if (redirectRole) {
      return <Navigate to={`/${redirectRole}/dashboard`} replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}
