import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  FileText,
  Home,
  GraduationCap,
  Heart,
  Target,
  AlertTriangle,
  UserPlus,
  DollarSign,
  PieChart,
  BarChart3,
  Share2,
  Sparkles,
  Handshake,
  Building2,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import logo from '../../assets/favicon.png';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  exactMatch?: boolean;
  secondaryAction?: {
    to: string;
    label: string;
    icon: React.ReactNode;
    badgeText?: string;
  };
}

interface NavGroup {
  label: string;
  roles?: string[];
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: '',
    roles: ['Admin', 'Staff'],
    items: [{ to: '/admin', label: 'nav.dashboard', icon: <LayoutDashboard size={18} /> }],
  },
  {
    label: '',
    roles: ['Donor'],
    items: [
      { to: '/admin/impact', label: 'nav.impact', icon: <Heart size={18} /> },
      { to: '/admin/donate', label: 'nav.donate', icon: <DollarSign size={18} /> },
    ],
  },
  {
    label: 'nav.caseManagement',
    roles: ['Admin', 'Staff'],
    items: [
      { to: '/admin/residents', label: 'nav.residents', icon: <Users size={18} /> },
      { to: '/admin/case/recordings', label: 'nav.processRecordings', icon: <FileText size={18} /> },
      { to: '/admin/case/visits', label: 'nav.homeVisitations', icon: <Home size={18} /> },
      { to: '/admin/case/education', label: 'nav.education', icon: <GraduationCap size={18} /> },
      { to: '/admin/case/health', label: 'nav.health', icon: <Heart size={18} /> },
      { to: '/admin/case/interventions', label: 'nav.interventions', icon: <Target size={18} /> },
      { to: '/admin/case/incidents', label: 'nav.incidents', icon: <AlertTriangle size={18} /> },
    ],
  },
  {
    label: 'nav.donors',
    items: [
      { to: '/admin/supporters', label: 'nav.supporters', icon: <UserPlus size={18} />, roles: ['Admin'] },
      { to: '/admin/donations', label: 'nav.donations', icon: <DollarSign size={18} /> },
      { to: '/admin/allocations', label: 'nav.allocations', icon: <PieChart size={18} /> },
    ],
  },
  {
    label: 'nav.analytics',
    roles: ['Admin', 'Staff'],
    items: [
      { to: '/admin/reports', label: 'nav.reports', icon: <BarChart3 size={18} /> },
      {
        to: '/admin/social',
        label: 'nav.socialMedia',
        icon: <Share2 size={18} />,
        exactMatch: true,
        secondaryAction: {
          to: '/admin/social/editor',
          label: 'nav.openSocialEditor',
          icon: <Sparkles size={16} />,
          badgeText: 'AI',
        },
      },
    ],
  },
  {
    label: '',
    roles: ['Admin'],
    items: [
      { to: '/admin/partners', label: 'nav.partners', icon: <Handshake size={18} /> },
      { to: '/admin/safehouses', label: 'nav.safehouses', icon: <Building2 size={18} /> },
      { to: '/admin/users', label: 'nav.userManagement', icon: <ShieldCheck size={18} /> },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const { t } = useTranslation();
  const userRole = useAuthStore((s) => s.user?.role ?? '');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);

  const hasAccess = (roles?: string[]) => !roles || roles.some(r => r.toLowerCase() === userRole.toLowerCase());

  const toggleGroup = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (item: NavItem) => {
    if (item.exactMatch || item.to === '/admin') {
      return location.pathname === item.to;
    }

    return location.pathname.startsWith(item.to);
  };

  const renderNav = () => (
    <div className="flex flex-col gap-1">
      {navGroups.filter(g => hasAccess(g.roles)).map((group, gi) => {
        const visibleItems = group.items.filter(i => hasAccess(i.roles));
        if (visibleItems.length === 0) return null;
        return (
          <div key={gi} className="mb-2">
            {group.label && (
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-warm-gray"
              >
                {t(group.label)}
                {collapsed[group.label] ? (
                  <ChevronRight size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
            )}
            {!collapsed[group.label] &&
              visibleItems.map((item) => {
                const active = isActive(item);
                const secondaryActive = item.secondaryAction?.to === location.pathname;

                return (
                  <div key={item.to} className="flex items-center gap-2">
                    <Link
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? 'border border-sky-blue/20 bg-linear-to-r from-sky-blue/28 via-white/70 to-coral-pink/30 text-sky-blue-text shadow-[0_8px_20px_rgba(162,201,225,0.22)] dark:border-sky-blue/25 dark:bg-none dark:bg-sky-blue/12 dark:text-sky-blue dark:shadow-none'
                          : 'text-slate-navy hover:bg-sky-blue/10 dark:text-white dark:hover:bg-white/10'
                      }`}
                    >
                      {item.icon}
                      <span className="truncate">{t(item.label)}</span>
                    </Link>
                    {item.secondaryAction && (
                      <Link
                        to={item.secondaryAction.to}
                        onClick={() => setMobileOpen(false)}
                        aria-label={t(item.secondaryAction.label)}
                        title={t(item.secondaryAction.label)}
                        className={`flex h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 transition-all lg:h-9 lg:min-w-9 lg:px-2 ${
                          secondaryActive
                            ? 'border-golden-honey/70 bg-golden-honey text-slate-navy shadow-sm'
                            : 'border-golden-honey/35 bg-golden-honey/10 text-golden-honey-text hover:border-golden-honey/60 hover:bg-golden-honey/20 dark:border-golden-honey/30 dark:bg-golden-honey/10 dark:text-golden-honey'
                        }`}
                      >
                        {item.secondaryAction.icon}
                        {item.secondaryAction.badgeText && (
                          <span className="font-heading text-[10px] font-semibold uppercase tracking-[0.18em] lg:text-[9px]">
                            {item.secondaryAction.badgeText}
                          </span>
                        )}
                      </Link>
                    )}
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed left-4 top-3 z-50 rounded-xl border border-white/70 bg-white p-2 shadow-[0_10px_24px_rgba(45,58,74,0.14)] backdrop-blur-sm lg:hidden dark:border-white/10 dark:bg-dark-surface"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={t('nav.toggleMenu')}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-white/60 bg-linear-to-b from-white via-white to-sky-blue/12 backdrop-blur-sm transition-transform dark:border-white/10 dark:bg-none dark:bg-dark-surface dark:backdrop-blur-none lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <Link to={userRole === 'Donor' ? '/admin/donate' : '/admin'} className="flex items-center gap-3 border-b border-sky-blue/20 px-4 py-4 dark:border-white/10">
          <img src={logo} alt={t('brand.newDawn')} className="h-8 w-8" />
          <span className="font-heading text-lg font-bold text-slate-navy dark:text-white">
            {t('brand.newDawn')}
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">{renderNav()}</nav>
      </aside>
    </>
  );
}
