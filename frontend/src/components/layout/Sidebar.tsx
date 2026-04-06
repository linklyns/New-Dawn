import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  ChevronDown,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import logo from '../../assets/favicon.png';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: '',
    items: [{ to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> }],
  },
  {
    label: 'Case Management',
    items: [
      { to: '/admin/residents', label: 'Residents', icon: <Users size={18} /> },
      { to: '/admin/case/recordings', label: 'Process Recordings', icon: <FileText size={18} /> },
      { to: '/admin/case/visits', label: 'Home Visits', icon: <Home size={18} /> },
      { to: '/admin/case/education', label: 'Education', icon: <GraduationCap size={18} /> },
      { to: '/admin/case/health', label: 'Health', icon: <Heart size={18} /> },
      { to: '/admin/case/interventions', label: 'Interventions', icon: <Target size={18} /> },
      { to: '/admin/case/incidents', label: 'Incidents', icon: <AlertTriangle size={18} /> },
    ],
  },
  {
    label: 'Donors',
    items: [
      { to: '/admin/supporters', label: 'Supporters', icon: <UserPlus size={18} /> },
      { to: '/admin/donations', label: 'Donations', icon: <DollarSign size={18} /> },
      { to: '/admin/allocations', label: 'Allocations', icon: <PieChart size={18} /> },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/admin/reports', label: 'Reports', icon: <BarChart3 size={18} /> },
      { to: '/admin/social', label: 'Social Media', icon: <Share2 size={18} /> },
      { to: '/admin/social/editor', label: 'Social Editor', icon: <Sparkles size={18} /> },
    ],
  },
  {
    label: '',
    items: [{ to: '/admin/partners', label: 'Partners', icon: <Handshake size={18} /> }],
  },
];

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleGroup = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (to: string) => {
    if (to === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(to);
  };

  const renderNav = () => (
    <div className="flex flex-col gap-1">
      {navGroups.map((group, gi) => (
        <div key={gi} className="mb-2">
          {group.label && (
            <button
              onClick={() => toggleGroup(group.label)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-warm-gray"
            >
              {group.label}
              {collapsed[group.label] ? (
                <ChevronRight size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
          )}
          {!collapsed[group.label] &&
            group.items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.to)
                    ? 'bg-sky-blue/20 text-sky-blue'
                    : 'text-slate-navy hover:bg-slate-navy/5 dark:text-white dark:hover:bg-white/10'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed left-4 top-3 z-50 rounded-lg bg-white p-2 shadow-md lg:hidden dark:bg-slate-navy"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
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
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-slate-navy/10 bg-white transition-transform dark:border-white/10 dark:bg-slate-navy lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-slate-navy/10 px-4 py-4 dark:border-white/10">
          <img src={logo} alt="New Dawn" className="h-8 w-8" />
          <span className="font-heading text-lg font-bold text-slate-navy dark:text-white">
            New Dawn
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">{renderNav()}</nav>
      </aside>
    </>
  );
}
