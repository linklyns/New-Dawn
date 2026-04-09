import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
import { Badge } from '../../components/ui/Badge';
import type { ReintegrationFactor } from '../../types/predictions';
import { useAuthStore } from '../../stores/authStore';
import { formatLocalizedCurrency, formatLocalizedNumber, resolveUserPreferences } from '../../lib/locale';

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

const ACRONYM_MAP: Record<string, string> = {
  ngo: 'NGO',
  pwd: 'PWD',
  hiv: 'HIV',
  osaec: 'OSAEC',
  cicl: 'CICL',
  '4ps': '4Ps',
};

function toTitleCase(input: string): string {
  return input
    .split(' ')
    .filter(Boolean)
    .map((part) => {
      const normalized = part.toLowerCase();
      return ACRONYM_MAP[normalized] ?? `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
    })
    .join(' ');
}

function formatReintegrationFeature(feature: string): { label: string; context: string } {
  const definitions: Array<{ prefix: string; context: string }> = [
    { prefix: 'sub_cat_', context: 'Category' },
    { prefix: 'referral_source_', context: 'Referral source' },
    { prefix: 'initial_case_assessment_', context: 'Initial case assessment' },
    { prefix: 'initial_risk_level_', context: 'Initial risk level' },
    { prefix: 'case_category_', context: 'Case category' },
    { prefix: 'birth_status_', context: 'Birth status' },
    { prefix: 'family_', context: 'Family background' },
    { prefix: 'religion_', context: 'Religion' },
  ];

  if (feature === 'risk_improvement') {
    return { label: 'Improving risk over time', context: 'Progress pattern' };
  }

  for (const definition of definitions) {
    if (feature.startsWith(definition.prefix)) {
      const rawLabel = feature.slice(definition.prefix.length).replace(/_/g, ' ');
      return {
        label: toTitleCase(rawLabel),
        context: definition.context,
      };
    }
  }

  return {
    label: toTitleCase(feature.replace(/_/g, ' ')),
    context: 'Resident profile',
  };
}

function describeDirection(effectDirection: string): string {
  if (effectDirection === 'Positive') return 'more likely';
  if (effectDirection === 'Negative') return 'less likely';
  return 'differently likely';
}

function buildReintegrationExplanation(factor: ReintegrationFactor): ReactNode {
  const likelihood = describeDirection(factor.effectDirection);

  if (factor.feature.startsWith('referral_source_')) {
    const value = toTitleCase(factor.feature.slice('referral_source_'.length).replace(/_/g, ' '));
    return (
      <>
        If a resident's <strong>referral source</strong> was <strong>{value}</strong>, they are {likelihood} to reach successful reintegration.
      </>
    );
  }

  if (factor.feature.startsWith('initial_case_assessment_')) {
    const value = toTitleCase(factor.feature.slice('initial_case_assessment_'.length).replace(/_/g, ' '));
    return (
      <>
        If a resident's <strong>initial case assessment</strong> was <strong>{value}</strong>, they are {likelihood} to reach successful reintegration.
      </>
    );
  }

  if (factor.feature.startsWith('initial_risk_level_')) {
    const value = toTitleCase(factor.feature.slice('initial_risk_level_'.length).replace(/_/g, ' '));
    return (
      <>
        If a resident's <strong>initial risk level</strong> was <strong>{value}</strong>, they are {likelihood} to reach successful reintegration.
      </>
    );
  }

  if (factor.feature.startsWith('case_category_')) {
    const value = toTitleCase(factor.feature.slice('case_category_'.length).replace(/_/g, ' '));
    return (
      <>
        If a resident's <strong>case category</strong> was <strong>{value}</strong>, they are {likelihood} to reach successful reintegration.
      </>
    );
  }

  if (factor.feature.startsWith('sub_cat_')) {
    const value = toTitleCase(factor.feature.slice('sub_cat_'.length).replace(/_/g, ' '));
    return (
      <>
        If a resident's <strong>category</strong> included <strong>{value}</strong>, they are {likelihood} to reach successful reintegration.
      </>
    );
  }

  if (factor.feature.startsWith('family_')) {
    const value = toTitleCase(factor.feature.slice('family_'.length).replace(/_/g, ' '));
    return (
      <>
        If a resident's <strong>family background</strong> included <strong>{value}</strong>, they are {likelihood} to reach successful reintegration.
      </>
    );
  }

  if (factor.feature.startsWith('religion_')) {
    const value = toTitleCase(factor.feature.slice('religion_'.length).replace(/_/g, ' '));
    return (
      <>
        If a resident's <strong>religion</strong> was <strong>{value}</strong>, they are {likelihood} to reach successful reintegration.
      </>
    );
  }

  if (factor.feature.startsWith('birth_status_')) {
    const value = toTitleCase(factor.feature.slice('birth_status_'.length).replace(/_/g, ' '));
    return (
      <>
        If a resident's <strong>birth status</strong> was <strong>{value}</strong>, they are {likelihood} to reach successful reintegration.
      </>
    );
  }

  if (factor.feature === 'risk_improvement') {
    return (
      <>
        If a resident showed <strong>improving risk over time</strong>, they are {likelihood} to reach successful reintegration.
      </>
    );
  }

  const formatted = formatReintegrationFeature(factor.feature);
  return (
    <>
      If a resident's <strong>{formatted.context.toLowerCase()}</strong> included <strong>{formatted.label}</strong>, they are {likelihood} to reach successful reintegration.
    </>
  );
}

const quickNavItems = [
  {
    titleKey: 'dashboard.residentsNav',
    descriptionKey: 'dashboard.residentsNavDesc',
    path: '/admin/residents',
    icon: Users,
  },
  {
    titleKey: 'dashboard.supportersNav',
    descriptionKey: 'dashboard.supportersNavDesc',
    path: '/admin/supporters',
    icon: UserPlus,
  },
  {
    titleKey: 'dashboard.donationsNav',
    descriptionKey: 'dashboard.donationsNavDesc',
    path: '/admin/donations',
    icon: DollarSign,
  },
  {
    titleKey: 'dashboard.reportsNav',
    descriptionKey: 'dashboard.reportsNavDesc',
    path: '/admin/reports',
    icon: BarChart3,
  },
  {
    titleKey: 'dashboard.socialMediaNav',
    descriptionKey: 'dashboard.socialMediaNavDesc',
    path: '/admin/social',
    icon: Share2,
  },
  {
    titleKey: 'dashboard.socialEditorNav',
    descriptionKey: 'dashboard.socialEditorNavDesc',
    path: '/admin/social/editor',
    icon: Sparkles,
  },
];

export function AdminDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const preferences = resolveUserPreferences(useAuthStore((s) => s.user));

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/api/reports/dashboard-stats'),
  });

  const { data: reintegrationResp } = useQuery({
    queryKey: ['reintegration-factors'],
    queryFn: () => api.get<{ items: ReintegrationFactor[] }>('/api/predictions/ml/reintegration-factors'),
    staleTime: 5 * 60 * 1000,
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
        <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-navy/10 bg-white p-12 dark:border-white/10 dark:bg-dark-surface">
          <div className="rounded-full bg-golden-honey/20 p-4">
            <BarChart3 size={32} className="text-golden-honey" />
          </div>
          <h2 className="font-heading text-lg font-semibold text-slate-navy dark:text-white">
            {t('dashboard.staffAccessRequired')}
          </h2>
          <p className="text-sm text-warm-gray">
            {t('dashboard.staffAccessDescription')}
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 p-12 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">
            {t('dashboard.failedLoad', { message: (error as Error).message })}
          </p>
          <Button variant="secondary" onClick={() => refetch()}>
            {t('common.retry')}
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
      label: t('dashboard.activeResidents'),
      value: totalActiveResidents,
      subValue: undefined as string | undefined,
      icon: Users,
      accent: 'bg-sky-blue/20 text-sky-blue-text dark:text-sky-blue',
      border: 'border-l-4 border-l-sky-blue',
    },
    {
      label: t('dashboard.donationsLabel'),
      value: formatLocalizedNumber(data?.recentDonations?.count ?? 0, preferences),
      subValue: formatLocalizedCurrency(data?.recentDonations?.total ?? 0, preferences, { maximumFractionDigits: 0 }),
      icon: DollarSign,
      accent: 'bg-sage-green/20 text-sage-green-text dark:text-sage-green',
      border: 'border-l-4 border-l-sage-green',
    },
    {
      label: t('dashboard.openInterventions'),
      value: data?.openInterventionPlans ?? 0,
      subValue: undefined as string | undefined,
      icon: Target,
      accent: 'bg-golden-honey/20 text-golden-honey-text dark:text-golden-honey',
      border: 'border-l-4 border-l-golden-honey',
    },
    {
      label: t('dashboard.safehousesLabel'),
      value: safehouseCount,
      subValue: undefined as string | undefined,
      icon: Home,
      accent: 'bg-coral-pink text-slate-navy',
      border: 'border-l-4 border-l-coral-pink',
    },
  ];

  const reintegrationRate = 34;
  const reintegrationFactors = reintegrationResp?.items ?? [];

  return (
    <div>
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />

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
                      {card.subValue} {t('common.total')}
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
        {t('dashboard.quickNav')}
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
                    {t(item.titleKey)}
                  </h3>
                  <p className="text-xs text-warm-gray">{t(item.descriptionKey)}</p>
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

      {reintegrationFactors.length > 0 && (
        <Card className="mt-6">
          <h3 className="mb-2 font-heading text-base font-semibold text-slate-navy dark:text-white">
            {t('dashboard.reintegrationInsights')}
          </h3>
          <p className="mb-4 text-sm text-warm-gray">
            General patterns from the reintegration model across all residents.
          </p>
          <div className="space-y-2">
            {reintegrationFactors.slice(0, 5).map((factor) => {
              const formatted = formatReintegrationFeature(factor.feature);
              const badgeVariant = factor.effectDirection === 'Positive'
                ? 'success'
                : factor.effectDirection === 'Negative'
                  ? 'danger'
                  : 'neutral';

              return (
                <div
                  key={factor.feature}
                  className="flex items-center justify-between rounded-lg border border-slate-navy/5 px-3 py-2 dark:border-white/5"
                >
                  <div>
                    <span className="text-base font-semibold text-slate-navy dark:text-white">
                      {formatted.context}
                    </span>
                    <p className="text-sm text-warm-gray">{formatted.label}</p>
                    <p className="mt-1 text-sm text-slate-navy/80 dark:text-white/80">
                      {buildReintegrationExplanation(factor)}
                    </p>
                  </div>
                  <Badge variant={badgeVariant}>{factor.effectDirection}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
