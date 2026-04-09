import { Link, Outlet } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { useAuthStore } from '../../stores/authStore';

interface AppShellProps {
  variant: 'public' | 'admin';
}

export function AppShell({ variant }: AppShellProps) {
  const { user, logout } = useAuthStore();

  if (variant === 'public') {
    return (
      <div className="flex min-h-screen flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:bg-golden-honey focus:text-slate-navy focus:p-4 focus:text-lg">
          Skip to main content
        </a>
        <Navbar />
        <main id="main-content" className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-dark-navy">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:bg-golden-honey focus:text-slate-navy focus:p-4 focus:text-lg">
        Skip to main content
      </a>
      <Sidebar />

      {/* Main content area offset by sidebar */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-end gap-4 border-b border-slate-navy/10 bg-white pl-16 pr-6 py-3 lg:pl-6 dark:border-white/10 dark:bg-dark-surface">
          {user && (
            <Link to="/admin/profile" className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-slate-navy/5 dark:hover:bg-white/10">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-blue/20 text-sky-blue">
                <User size={16} />
              </span>
              <span className="text-sm font-medium text-slate-navy dark:text-white">
                {user.displayName}
              </span>
            </Link>
          )}
          <button
            onClick={logout}
            className="rounded-lg p-2 text-slate-navy hover:bg-slate-navy/5 dark:text-white dark:hover:bg-white/10"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* Page content */}
        <main id="main-content" className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
