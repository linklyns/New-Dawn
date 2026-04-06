import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/Button';
import logo from '../../assets/logo.png';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/impact', label: 'Impact' },
  { to: '/privacy', label: 'Privacy Policy' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isDark, toggle } = useThemeStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-navy/10 bg-white dark:border-white/10 dark:bg-slate-navy">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="New Dawn - A Path to Healing and Hope" className="h-10" />
        </Link>

        {/* Center: Desktop nav links */}
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors hover:text-golden-honey ${location.pathname === link.to ? 'text-golden-honey' : 'text-slate-navy dark:text-white'}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="rounded-lg p-2 text-slate-navy transition-colors hover:bg-slate-navy/5 dark:text-white dark:hover:bg-white/10"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className="hidden md:block">
            {isAuthenticated ? (
              <Link to="/admin">
                <Button variant="primary" size="sm">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm">
                  Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="rounded-lg p-2 text-slate-navy md:hidden dark:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-navy/10 px-4 pb-4 md:hidden dark:border-white/10">
          <div className="flex flex-col gap-3 pt-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium ${location.pathname === link.to ? 'text-golden-honey' : 'text-slate-navy dark:text-white'}`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <Link to="/admin" onClick={() => setMobileOpen(false)}>
                <Button variant="primary" size="sm" className="w-full">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="primary" size="sm" className="w-full">
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
