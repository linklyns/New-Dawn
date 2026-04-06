import { useQuery } from '@tanstack/react-query';
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
};

const PIE_COLORS = [
  COLORS.skyBlue,
  COLORS.sageGreen,
  COLORS.goldenHoney,
  COLORS.slateNavy,
  COLORS.coralPink,
  '#8884d8',
  '#82ca9d',
  '#ffc658',
];

const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: `1px solid ${COLORS.skyBlue}`,
  borderRadius: 8,
};

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/* ── Stat Card Helper ────────────────────────────────────────── */

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-navy/5 p-4 dark:bg-white/5">
      <p className="text-xs font-medium uppercase tracking-wide text-warm-gray">
        {label}
      </p>
      <p className="mt-1 font-heading text-2xl font-bold text-slate-navy dark:text-white">
        {value}
      </p>
    </div>
  );
}

/* ── Component ───────────────────────────────────────────────── */

export function ReportsPage() {
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

  const safehouseData = dashboard.data?.activeResidentsBySafehouse ?? [];
  const totalResidents = safehouseData.reduce((s, sh) => s + sh.activeResidents, 0);

  const donationChartData = (donationTrends.data ?? []).map((d) => ({
    label: `${MONTH_NAMES[d.month]} ${d.year}`,
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
    label: `${MONTH_NAMES[h.month]} ${h.year}`,
    'General Health': +h.avgGeneralHealth.toFixed(1),
    Nutrition: +h.avgNutrition.toFixed(1),
    'Sleep Quality': +h.avgSleepQuality.toFixed(1),
    'Energy Level': +h.avgEnergyLevel.toFixed(1),
  }));
  const latestHealth = healthTrends.data?.at(-1);
  const firstHealth = healthTrends.data?.at(0);
  const healthImprovement =
    latestHealth && firstHealth
      ? (latestHealth.avgGeneralHealth - firstHealth.avgGeneralHealth).toFixed(1)
      : '—';

  const eduData = educationProgress.data ?? [];
  const avgProgress =
    eduData.length > 0
      ? (eduData.reduce((s, e) => s + e.avgProgressPercent, 0) / eduData.length).toFixed(1)
      : '—';

  const reintData = reintegrationRates.data ?? [];

  const incidentByType = incidentSummary.data?.byType ?? [];

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
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
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={safehouseData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2D3A4A20" />
                      <XAxis
                        dataKey="safehouseName"
                        tick={{ fill: '#2D3A4A', fontSize: 12 }}
                      />
                      <YAxis tick={{ fill: '#2D3A4A', fontSize: 12 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar
                        dataKey="activeResidents"
                        name="Active Residents"
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
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={healthChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2D3A4A20" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#2D3A4A', fontSize: 12 }}
                      />
                      <YAxis
                        domain={[0, 10]}
                        tick={{ fill: '#2D3A4A', fontSize: 12 }}
                      />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="General Health"
                        stroke={COLORS.sageGreen}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="Nutrition"
                        stroke={COLORS.skyBlue}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="Sleep Quality"
                        stroke={COLORS.goldenHoney}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="Energy Level"
                        stroke={COLORS.slateNavy}
                        strokeWidth={2}
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
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eduData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2D3A4A20" />
                      <XAxis
                        dataKey="safehouseName"
                        tick={{ fill: '#2D3A4A', fontSize: 12 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: '#2D3A4A', fontSize: 12 }}
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(v) => `${v}%`}
                      />
                      <Bar
                        dataKey="avgProgressPercent"
                        name="Avg Progress"
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
              Donation Trends
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={donationChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2D3A4A20" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#2D3A4A', fontSize: 12 }}
                      />
                      <YAxis tick={{ fill: '#2D3A4A', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(v) => `₱${v}`}
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
                  value={`₱${Math.round(totalDonationsThisYear).toLocaleString()}`}
                />
                <StatBox
                  label="Avg Per Donation"
                  value={`₱${Math.round(avgDonation).toLocaleString()}`}
                />
              </div>
            </div>
          </Card>

          {/* ── Program Outcomes ─────────────────────────────── */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Reintegration Rates */}
            <Card>
              <h2 className="mb-6 font-heading text-xl font-semibold text-slate-navy dark:text-white">
                Reintegration Rates
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reintData}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D3A4A20" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fill: '#2D3A4A', fontSize: 12 }}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="safehouseName"
                      tick={{ fill: '#2D3A4A', fontSize: 12 }}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v) => `${v}%`}
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
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
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
                      label={({ name, percent }) =>
                        `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {incidentByType.map((item, index) => (
                        <Cell
                          key={item.incidentType}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend />
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
