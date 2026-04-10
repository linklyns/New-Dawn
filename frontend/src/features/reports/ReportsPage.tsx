import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { useThemeStore } from '../../stores/themeStore';
import { formatSafehouseName } from '../../lib/formatters';
import { useAuthStore } from '../../stores/authStore';
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  formatLocalizedPercent,
  resolveUserPreferences,
} from '../../lib/locale';

/* ── API Response Types ──────────────────────────────────────── */

interface SafehouseResidents {
  safehouseId: number;
  safehouseName: string;
  activeResidents: number;
}

interface DashboardStats {
  activeResidentsBySafehouse: SafehouseResidents[];
  recentDonations: { count: number; total: number };
  openInterventionPlans: number;
}

interface DonationTrend {
  year: number;
  month: number;
  count: number;
  total: number;
}

interface EducationProgressItem {
  safehouseId: number;
  safehouseName: string;
  avgProgressPercent: number;
}

interface HealthTrend {
  year: number;
  month: number;
  avgGeneralHealth: number;
  avgNutrition: number;
  avgSleepQuality: number;
  avgEnergyLevel: number;
}

interface ReintegrationRate {
  safehouseId: number;
  safehouseName: string;
  totalWithStatus: number;
  completed: number;
  completionRate: number;
}

interface IncidentSummary {
  byType: { incidentType: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
}

/* ── Theme Colors ────────────────────────────────────────────── */

const COLORS = {
  skyBlue: '#A2C9E1',
  sageGreen: '#91B191',
  slateNavy: '#2D3A4A',
  goldenHoney: '#FFCC66',
  coralPink: '#FFE6E1',
  energyLevel: '#F7A9A0',
};

const PIE_COLORS = [
  COLORS.skyBlue,
  COLORS.sageGreen,
  COLORS.goldenHoney,
  '#7BC7FF',
  '#FFAB91',
  '#FBD38D',
  '#A3E635',
  '#7C3AED',
];

const INCIDENT_TYPE_COLORS: Record<string, string> = {
  Behavioral: COLORS.sageGreen,
  ConflictWithPeer: '#FB7185',
  Medical: '#60A5FA',
  PropertyDamage: '#F97316',
  RunawayAttempt: COLORS.skyBlue,
  Security: COLORS.goldenHoney,
  SelfHarm: '#DC2626',
};

const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: `1px solid ${COLORS.skyBlue}`,
  borderRadius: 8,
};

const DARK_TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(148, 163, 184, 0.3)',
  borderRadius: 8,
  color: '#e2e8f0',
};

/* ── Stat Card Helper ────────────────────────────────────────── */

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-navy/5 p-4 dark:bg-slate-navy/70 dark:border dark:border-white/10">
      <p className="text-xs font-medium uppercase tracking-wide text-warm-gray dark:text-slate-300">
        {label}
      </p>
      <p className="mt-1 font-heading text-2xl font-bold text-slate-navy dark:text-white">
        {value}
      </p>
    </div>
  );
}

const getDarkMode = (mode: string) => {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/* ── Component ───────────────────────────────────────────────── */

export function ReportsPage() {
  const { t } = useTranslation();
  const themeMode = useThemeStore((s) => s.mode);
  const preferences = resolveUserPreferences(useAuthStore((s) => s.user));
  const isDark = getDarkMode(themeMode);
  const chartTheme = useMemo(
    () => ({
      textColor: isDark ? '#e2e8f0' : '#2D3A4A',
      gridStroke: isDark ? '#ffffff1a' : '#2D3A4A20',
      tooltipStyle: isDark ? DARK_TOOLTIP_STYLE : TOOLTIP_STYLE,
    }),
    [isDark],
  );

  const dashboard = useQuery({
    queryKey: ['reports', 'dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/api/reports/dashboard-stats'),
  });

  const donationTrends = useQuery({
    queryKey: ['reports', 'donation-trends'],
    queryFn: () => api.get<DonationTrend[]>('/api/reports/donation-trends?months=12'),
  });

  const educationProgress = useQuery({
    queryKey: ['reports', 'education-progress'],
    queryFn: () => api.get<EducationProgressItem[]>('/api/reports/education-progress'),
  });

  const healthTrends = useQuery({
    queryKey: ['reports', 'health-trends'],
    queryFn: () => api.get<HealthTrend[]>('/api/reports/health-trends'),
  });

  const reintegrationRates = useQuery({
    queryKey: ['reports', 'reintegration-rates'],
    queryFn: () => api.get<ReintegrationRate[]>('/api/reports/reintegration-rates'),
  });

  const incidentSummary = useQuery({
    queryKey: ['reports', 'incident-summary'],
    queryFn: () => api.get<IncidentSummary>('/api/reports/incident-summary'),
  });

  const isLoading =
    dashboard.isLoading ||
    donationTrends.isLoading ||
    educationProgress.isLoading ||
    healthTrends.isLoading ||
    reintegrationRates.isLoading ||
    incidentSummary.isLoading;

  /* ── Computed values ─────────────────────────────────────── */

  const safehouseData = (dashboard.data?.activeResidentsBySafehouse ?? []).map((sh) => ({
    ...sh,
    safehouseName: formatSafehouseName(sh.safehouseName),
  }));
  const totalResidents = safehouseData.reduce((s, sh) => s + sh.activeResidents, 0);

  const donationChartData = (donationTrends.data ?? []).map((d) => ({
    label: formatLocalizedDate(new Date(d.year, d.month - 1, 1), preferences, { month: 'short', year: 'numeric' }),
    total: Math.round(d.total),
    count: d.count,
  }));
  const totalDonationsThisYear = (donationTrends.data ?? []).reduce(
    (s, d) => s + d.total,
    0,
  );
  const totalDonationCount = (donationTrends.data ?? []).reduce(
    (s, d) => s + d.count,
    0,
  );
  const avgDonation = totalDonationCount > 0 ? totalDonationsThisYear / totalDonationCount : 0;

  const healthChartData = (healthTrends.data ?? []).map((h) => ({
    label: formatLocalizedDate(new Date(h.year, h.month - 1, 1), preferences, { month: 'short', year: 'numeric' }),
    [t('reports.generalHealth')]: +h.avgGeneralHealth.toFixed(1),
    [t('reports.nutrition')]: +h.avgNutrition.toFixed(1),
    [t('reports.sleepQuality')]: +h.avgSleepQuality.toFixed(1),
    [t('reports.energyLevel')]: +h.avgEnergyLevel.toFixed(1),
  }));
  const latestHealth = healthTrends.data?.at(-1);
  const firstHealth = healthTrends.data?.at(0);
  const healthImprovement =
    latestHealth && firstHealth
      ? (latestHealth.avgGeneralHealth - firstHealth.avgGeneralHealth).toFixed(1)
      : '—';

  const eduData = (educationProgress.data ?? []).map((e) => ({
    ...e,
    safehouseName: formatSafehouseName(e.safehouseName),
  }));
  const avgProgress =
    eduData.length > 0
      ? (eduData.reduce((s, e) => s + e.avgProgressPercent, 0) / eduData.length).toFixed(1)
      : '—';

  const reintData = (reintegrationRates.data ?? []).map((r) => ({
    ...r,
    safehouseName: formatSafehouseName(r.safehouseName),
  }));

  const incidentByType = incidentSummary.data?.byType ?? [];

  return (
    <div>
      <PageHeader
        title={t('reports.title')}
        subtitle="Organizational performance insights"
      />

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      )}

      {!isLoading && (
        <div className="space-y-8">
          {/* ── Caring Section ───────────────────────────────── */}
          <Card>
            <h2 className="mb-6 font-heading text-xl font-semibold text-slate-navy dark:text-white">
              Caring &mdash; Safehouse Operations
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="h-72 min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={safehouseData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                      <XAxis
                        dataKey="safehouseName"
                        tick={{ fill: chartTheme.textColor, fontSize: 12 }}
                      />
                      <YAxis tick={{ fill: chartTheme.textColor, fontSize: 12 }} />
                      <Tooltip
                        contentStyle={chartTheme.tooltipStyle}
                        labelStyle={{ color: chartTheme.textColor }}
                        itemStyle={{ color: chartTheme.textColor }}
                      />
                      <Bar
                        dataKey="activeResidents"
                        name={t('dashboard.activeResidents')}
                        fill={COLORS.skyBlue}
                        radius={[4, 4, 0, 0]}
                        barSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <StatBox label="Total Residents Served" value={totalResidents} />
                <StatBox label="Safehouses Active" value={safehouseData.length} />
              </div>
            </div>
          </Card>

          {/* ── Healing Section ──────────────────────────────── */}
          <Card>
            <h2 className="mb-6 font-heading text-xl font-semibold text-slate-navy dark:text-white">
              Healing &mdash; Health &amp; Wellbeing
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="h-72 min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={healthChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: chartTheme.textColor, fontSize: 12 }}
                      />
                      <YAxis
                        domain={[0, 10]}
                        tick={{ fill: chartTheme.textColor, fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={chartTheme.tooltipStyle}
                        labelStyle={{ color: chartTheme.textColor }}
                        itemStyle={{ color: chartTheme.textColor }}
                      />
                      <Legend wrapperStyle={{ color: chartTheme.textColor }} />
                      <Line
                        type="monotone"
                        dataKey={t('reports.generalHealth')}
                        stroke={COLORS.sageGreen}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey={t('reports.nutrition')}
                        stroke={COLORS.skyBlue}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey={t('reports.sleepQuality')}
                        stroke={COLORS.goldenHoney}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey={t('reports.energyLevel')}
                        stroke={COLORS.energyLevel}
                        strokeWidth={3}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <StatBox label="Health Data Points" value={healthChartData.length} />
                <StatBox
                  label="Avg Health Change"
                  value={healthImprovement === '—' ? '—' : `+${healthImprovement}`}
                />
              </div>
            </div>
          </Card>

          {/* ── Teaching Section ─────────────────────────────── */}
          <Card>
            <h2 className="mb-6 font-heading text-xl font-semibold text-slate-navy dark:text-white">
              Teaching &mdash; Education Progress
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="h-72 min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={eduData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                      <XAxis
                        dataKey="safehouseName"
                        tick={{ fill: chartTheme.textColor, fontSize: 12 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: chartTheme.textColor, fontSize: 12 }}
                        tickFormatter={(v: number) => formatLocalizedPercent(v, preferences)}
                      />
                      <Tooltip
                        contentStyle={chartTheme.tooltipStyle}
                        labelStyle={{ color: chartTheme.textColor }}
                        itemStyle={{ color: chartTheme.textColor }}
                        formatter={(v) => formatLocalizedPercent(Number(v), preferences)}
                      />
                      <Bar
                        dataKey="avgProgressPercent"
                        name={t('reports.averageProgress')}
                        fill={COLORS.sageGreen}
                        radius={[4, 4, 0, 0]}
                        barSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <StatBox label="Safehouses Tracked" value={eduData.length} />
                <StatBox label="Avg Progress" value={`${avgProgress}%`} />
              </div>
            </div>
          </Card>

          {/* ── Donation Trends ──────────────────────────────── */}
          <Card>
            <h2 className="mb-6 font-heading text-xl font-semibold text-slate-navy dark:text-white">
              {t('reports.donationTrends')}
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="h-72 min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={donationChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: chartTheme.textColor, fontSize: 12 }}
                      />
                      <YAxis tick={{ fill: chartTheme.textColor, fontSize: 12 }} />
                      <Tooltip
                        contentStyle={chartTheme.tooltipStyle}
                        labelStyle={{ color: chartTheme.textColor }}
                        itemStyle={{ color: chartTheme.textColor }}
                        formatter={(v) => formatLocalizedCurrency(Number(v), preferences, { maximumFractionDigits: 0 })}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Monthly Total"
                        stroke={COLORS.goldenHoney}
                        fill={COLORS.goldenHoney}
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <StatBox
                  label="Total (12 Months)"
                  value={formatLocalizedCurrency(Math.round(totalDonationsThisYear), preferences, { maximumFractionDigits: 0 })}
                />
                <StatBox
                  label="Avg Per Donation"
                  value={formatLocalizedCurrency(Math.round(avgDonation), preferences, { maximumFractionDigits: 0 })}
                />
              </div>
            </div>
          </Card>

          {/* ── Program Outcomes ─────────────────────────────── */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Reintegration Rates */}
            <Card>
              <h2 className="mb-6 font-heading text-xl font-semibold text-slate-navy dark:text-white">
                {t('reports.reintegrationRates')}
              </h2>
              <div className="h-72 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart
                    data={reintData}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fill: chartTheme.textColor, fontSize: 12 }}
                      tickFormatter={(v: number) => formatLocalizedPercent(v, preferences)}
                    />
                    <YAxis
                      type="category"
                      dataKey="safehouseName"
                      tick={{ fill: chartTheme.textColor, fontSize: 12 }}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={chartTheme.tooltipStyle}
                      labelStyle={{ color: chartTheme.textColor }}
                      itemStyle={{ color: chartTheme.textColor }}
                      formatter={(v) => formatLocalizedPercent(Number(v), preferences)}
                    />
                    <Bar
                      dataKey="completionRate"
                      name="Completion Rate"
                      fill={COLORS.sageGreen}
                      radius={[0, 4, 4, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Incident Summary */}
            <Card>
              <h2 className="mb-6 font-heading text-xl font-semibold text-slate-navy dark:text-white">
                Incident Summary By Type
              </h2>
              <div className="h-72 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={incidentByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="incidentType"
                      label={({ name, percent }) => (
                        <text
                          fill={chartTheme.textColor}
                          fontSize={12}
                          textAnchor="middle"
                        >
                          {`${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        </text>
                      )}
                    >
                      {incidentByType.map((item, index) => (
                        <Cell
                          key={item.incidentType}
                          fill={INCIDENT_TYPE_COLORS[item.incidentType] ?? PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={chartTheme.tooltipStyle}
                      labelStyle={{ color: chartTheme.textColor }}
                      itemStyle={{ color: chartTheme.textColor }}
                    />
                    <Legend wrapperStyle={{ color: chartTheme.textColor }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
