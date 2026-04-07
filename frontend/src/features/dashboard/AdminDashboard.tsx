import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  DollarSign,
  Target,
  Home,
  UserPlus,
  BarChart3,
  Share2,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';

interface SafehouseResidentCount {
  safehouseId: number;
  safehouseName: string;
  activeResidents: number;
}

interface DashboardStats {
  activeResidentsBySafehouse: SafehouseResidentCount[];
  recentDonations: { count: number; total: number };
  openInterventionPlans: number;
}

const quickNavItems = [
  {
    title: 'Residents',
    description: 'View and manage resident caseload',
    path: '/admin/residents',
    icon: Users,
  },
  {
    title: 'Supporters',
    description: 'Manage donors and supporters',
    path: '/admin/supporters',
    icon: UserPlus,
  },
  {
    title: 'Donations',
    description: 'Track donations and allocations',
    path: '/admin/donations',
    icon: DollarSign,
  },
  {
    title: 'Reports',
    description: 'View analytics and reports',
    path: '/admin/reports',
    icon: BarChart3,
  },
  {
    title: 'Social Media',
    description: 'Social media analytics dashboard',
    path: '/admin/social',
    icon: Share2,
  },
  {
    title: 'Social Editor',
    description: 'Create and schedule posts',
    path: '/admin/social/editor',
    icon: Sparkles,
  },
];

export function AdminDashboard() {
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/api/reports/dashboard-stats'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const isForbidden = isError && (error as Error).message?.includes('403');

  if (isError && isForbidden) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Overview of operations" />
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-navy/10 bg-white p-12 dark:border-white/10 dark:bg-dark-surface">
          <div className="rounded-full bg-golden-honey/20 p-4">
            <BarChart3 size={32} className="text-golden-honey" />
          </div>
          <h2 className="font-heading text-lg font-semibold text-slate-navy dark:text-white">
            Staff or Admin Access Required
          </h2>
          <p className="text-sm text-warm-gray">
            The operations dashboard is available to staff and admin users.
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Overview of operations" />
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 p-12 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">
            Failed to load dashboard data: {(error as Error).message}
          </p>
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const totalActiveResidents = data
    ? data.activeResidentsBySafehouse.reduce((sum, s) => sum + s.activeResidents, 0)
    : 0;
  const safehouseCount = data
    ? data.activeResidentsBySafehouse.length
    : 0;

  const summaryCards = [
    {
      label: 'Active Residents',
      value: totalActiveResidents,
      subValue: undefined as string | undefined,
      icon: Users,
      accent: 'bg-sky-blue/20 text-sky-blue-text dark:text-sky-blue',
      border: 'border-l-4 border-l-sky-blue',
    },
    {
      label: 'Donations',
      value: data?.recentDonations?.count ?? 0,
      subValue: `$${(data?.recentDonations?.total ?? 0).toLocaleString()}`,
      icon: DollarSign,
      accent: 'bg-sage-green/20 text-sage-green-text dark:text-sage-green',
      border: 'border-l-4 border-l-sage-green',
    },
    {
      label: 'Open Interventions',
      value: data?.openInterventionPlans ?? 0,
      subValue: undefined as string | undefined,
      icon: Target,
      accent: 'bg-golden-honey/20 text-golden-honey-text dark:text-golden-honey',
      border: 'border-l-4 border-l-golden-honey',
    },
    {
      label: 'Safehouses',
      value: safehouseCount,
      subValue: undefined as string | undefined,
      icon: Home,
      accent: 'bg-coral-pink text-slate-navy',
      border: 'border-l-4 border-l-coral-pink',
    },
  ];

  const reintegrationRate = 34;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of operations" />

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className={card.border}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-warm-gray">{card.label}</p>
                  <p className="mt-1 font-heading text-3xl font-bold text-slate-navy dark:text-white">
                    {card.value}
                  </p>
                  {card.subValue && (
                    <p className="mt-0.5 text-sm font-medium text-warm-gray">
                      {card.subValue} total
                    </p>
                  )}
                </div>
                <div className={`rounded-lg p-2.5 ${card.accent}`}>
                  <Icon size={22} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Navigation */}
      <h2 className="mb-4 font-heading text-lg font-semibold text-slate-navy dark:text-white">
        Quick Navigation
      </h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.path} onClick={() => navigate(item.path)}>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-golden-honey/20 p-2.5 text-golden-honey-text dark:text-golden-honey">
                  <Icon size={22} />
                </div>
                <div>
                  <h3 className="font-heading text-sm font-semibold text-slate-navy dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-xs text-warm-gray">{item.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* OKR Metric */}
      <h2 className="mb-4 font-heading text-lg font-semibold text-slate-navy dark:text-white">
        Key Result
      </h2>
      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm font-semibold text-slate-navy dark:text-white">
              Reintegration Completion Rate
            </h3>
            <span className="font-heading text-2xl font-bold text-golden-honey-text dark:text-golden-honey">
              {reintegrationRate}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-navy/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-golden-honey transition-all"
              style={{ width: `${reintegrationRate}%` }}
            />
          </div>
          <p className="text-xs text-warm-gray">Target: 50% by end of year</p>
        </div>
      </Card>
    </div>
  );
}
