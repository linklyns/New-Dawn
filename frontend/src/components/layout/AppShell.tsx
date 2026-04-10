import { Link, Outlet } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { useAuthStore } from '../../stores/authStore';
import { NotificationBell } from '../ui/NotificationBell';

interface AppShellProps {
  variant: 'public' | 'admin';
}

export function AppShell({ variant }: AppShellProps) {
  const { user, logout } = useAuthStore();
  const profilePath = user?.role === 'Donor' ? '/app/profile' : '/admin/profile';

  if (variant === 'public') {
    return (
      <div className="flex min-h-screen flex-col bg-transparent">
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
    <div className="min-h-screen bg-transparent">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:bg-golden-honey focus:text-slate-navy focus:p-4 focus:text-lg">
        Skip to main content
      </a>
      <Sidebar />

      {/* Main content area offset by sidebar */}
      <div className="min-w-0 lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-end gap-3 border-b border-white/65 bg-white/90 py-3 pl-14 pr-4 backdrop-blur-sm sm:gap-4 sm:pr-6 lg:pl-6 dark:border-white/10 dark:bg-dark-surface">
          {user?.role === 'Admin' && <NotificationBell />}
          {user && (
            <Link to={profilePath} className="flex min-w-0 items-center gap-2 rounded-xl px-2 py-1 transition-colors hover:bg-sky-blue/10 dark:hover:bg-white/10">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-sky-blue/35 to-sage-green/35 text-sky-blue-text dark:bg-sky-blue/12 dark:text-sky-blue">
                <User size={16} />
              </span>
              <span className="max-w-[8rem] truncate text-sm font-medium text-slate-navy sm:max-w-[12rem] dark:text-white">
                {user.displayName}
              </span>
            </Link>
          )}
          <button
            onClick={logout}
            className="rounded-xl p-2 text-slate-navy hover:bg-sky-blue/10 dark:text-white dark:hover:bg-white/10"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* Page content */}
        <main id="main-content" className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
