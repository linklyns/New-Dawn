import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Show access denied message instead of silent redirect
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-dark-navy">
        <div className="rounded-lg border border-slate-navy/10 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-dark-surface">
          <h2 className="mb-4 font-heading text-xl font-semibold text-slate-navy dark:text-white">
            Access Denied
          </h2>
          <p className="mb-6 text-warm-gray dark:text-white/70">
            You need {requiredRole} role to access this page. Your current role: {user?.role || 'None'}
          </p>
          <a
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-blue px-4 py-2 font-semibold text-slate-navy transition-colors hover:bg-sky-blue/90"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-dark-navy">
        <div className="rounded-lg border border-slate-navy/10 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-dark-surface">
          <h2 className="mb-4 font-heading text-xl font-semibold text-slate-navy dark:text-white">
            Access Denied
          </h2>
          <p className="mb-6 text-warm-gray dark:text-white/70">
            You don't have permission to access this page. Your current role: {user?.role || 'None'}
          </p>
          <a
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-blue px-4 py-2 font-semibold text-slate-navy transition-colors hover:bg-sky-blue/90"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
