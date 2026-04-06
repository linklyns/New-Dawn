import { Outlet } from 'react-router-dom';
import { Sun, Moon, LogOut } from 'lucide-react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';

interface AppShellProps {
  variant: 'public' | 'admin';
}

export function AppShell({ variant }: AppShellProps) {
  const { isDark, toggle } = useThemeStore();
  const { user, logout } = useAuthStore();

  if (variant === 'public') {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-navy">
      <Sidebar />

      {/* Main content area offset by sidebar */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-end gap-4 border-b border-slate-navy/10 bg-white px-6 py-3 dark:border-white/10 dark:bg-slate-navy">
          {user && (
            <span className="text-sm text-warm-gray">
              {user.displayName}
            </span>
          )}
          <button
            onClick={toggle}
            className="rounded-lg p-2 text-slate-navy hover:bg-slate-navy/5 dark:text-white dark:hover:bg-white/10"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-slate-navy hover:bg-slate-navy/5 dark:text-white dark:hover:bg-white/10"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
