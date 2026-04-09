import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/Button';
import { BrandHomeLink } from './BrandHomeLink';

const navLinks = [
  { to: '/', label: 'nav.home' },
  { to: '/impact', label: 'nav.impact' },
  { to: '/donate', label: 'nav.donate' },
];

export function Navbar() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userRole = useAuthStore((s) => s.user?.role);
  const location = useLocation();

  const getHomeLink = () => {
    if (isAuthenticated) {
      return userRole === 'Donor' ? '/admin/donate' : '/admin';
    }
    return '/';
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-sky-blue/20 bg-white shadow-md transition-all dark:border-white/10 dark:bg-dark-surface">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left: Logo & Brand - Full height, no padding */}
        <BrandHomeLink to={getHomeLink()} />

        {/* Center: Desktop nav links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === link.to
                  ? 'text-golden-honey'
                  : 'text-slate-navy hover:text-golden-honey dark:text-white dark:hover:text-golden-honey'
              }`}
            >
              {t(link.label)}
            </Link>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            {isAuthenticated ? (
              <Link to="/admin" className="transition-opacity hover:opacity-80">
                <Button variant="primary" size="sm">
                  {t('nav.dashboard')}
                </Button>
              </Link>
            ) : (
              <Link to="/login" className="transition-opacity hover:opacity-80">
                <Button variant="primary" size="sm">
                  {t('nav.login')}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="rounded-lg p-2 text-slate-navy transition-colors hover:bg-sky-blue/10 md:hidden dark:text-white dark:hover:bg-sky-blue/20"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={t('nav.toggleMenu')}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-sky-blue/20 px-4 pb-4 md:hidden dark:border-white/10">
          <div className="flex flex-col gap-3 pt-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'text-golden-honey'
                    : 'text-slate-navy hover:text-golden-honey dark:text-white dark:hover:text-golden-honey'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {t(link.label)}
              </Link>
            ))}
            {isAuthenticated ? (
              <Link to="/admin" onClick={() => setMobileOpen(false)} className="mt-2">
                <Button variant="primary" size="sm" className="w-full">
                  {t('nav.dashboard')}
                </Button>
              </Link>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="mt-2">
                <Button variant="primary" size="sm" className="w-full">
                  {t('nav.login')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
