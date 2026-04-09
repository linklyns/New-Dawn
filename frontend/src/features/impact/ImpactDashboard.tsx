import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { api } from '../../lib/api';
import { formatLocalizedCurrency, formatLocalizedPercent, resolveUserPreferences } from '../../lib/locale';

interface DashboardData {
  residentsOverTime: { year: string; count: number }[];
  donationByProgram: { name: string; value: number }[];
  safehouseRegions: { region: string; count: number; occupancy: number }[];
}

const PIE_COLORS = ['#A2C9E1', '#91B191', '#FFCC66', '#2D3A4A', '#E85D75'];

export function ImpactDashboard() {
  const { t } = useTranslation();
  const preferences = resolveUserPreferences();
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['impact-dashboard'],
    queryFn: () => api.get('/api/public-impact/dashboard'),
  });

  const outcomesData = [
    { name: t('impact.educationCompletion'), value: 78 },
    { name: t('impact.healthImprovement'), value: 85 },
    { name: t('impact.successfulReintegration'), value: 34 },
    { name: t('impact.counselingSessions'), value: 100 },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        title={t('impact.title')}
        subtitle={t('impact.subtitle')}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* Residents Served Over Time */}
          <Card className="mb-8">
            <h2 className="mb-6 font-heading text-xl font-semibold text-slate-navy dark:text-white">
              {t('impact.residentsServed')}
            </h2>
            <div className="h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.residentsOverTime ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D3A4A20" />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: '#2D3A4A', fontSize: 13 }}
                  />
                  <YAxis tick={{ fill: '#2D3A4A', fontSize: 13 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #A2C9E1',
                      borderRadius: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name={t('impact.girlsServed')}
                    stroke="#A2C9E1"
                    fill="#A2C9E1"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Two-column layout for bar + pie */}
          <div className="mb-8 grid gap-8 lg:grid-cols-2">
            {/* Program Outcomes */}
            <Card>
              <h2 className="mb-6 font-heading text-xl font-semibold text-slate-navy dark:text-white">
                {t('impact.programOutcomes')}
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={outcomesData}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D3A4A20" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fill: '#2D3A4A', fontSize: 12 }}
                      tickFormatter={(v) => formatLocalizedPercent(Number(v), preferences)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: '#2D3A4A', fontSize: 12 }}
                      width={150}
                    />
                    <Tooltip
                      formatter={(v) => formatLocalizedPercent(Number(v), preferences)}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #91B191',
                        borderRadius: 8,
                      }}
                    />
                    <Bar
                      dataKey="value"
                      name={t('impact.percentage')}
                      fill="#91B191"
                      radius={[0, 4, 4, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 text-xs text-warm-gray">
                {t('impact.counselingNote')}
              </p>
            </Card>

            {/* Donation Impact */}
            <Card>
              <h2 className="mb-6 font-heading text-xl font-semibold text-slate-navy dark:text-white">
                {t('impact.donationImpact')}
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.donationByProgram ?? []}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {(data?.donationByProgram ?? []).map((_, index) => (
                        <Cell
                          key={index}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => formatLocalizedCurrency(Number(v), preferences, { maximumFractionDigits: 0 })}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #FFCC66',
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Safehouse Network */}
          <h2 className="mb-6 font-heading text-xl font-semibold text-slate-navy dark:text-white">
            {t('impact.safehouseNetwork')}
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {(data?.safehouseRegions ?? []).map((r) => (
              <Card key={r.region}>
                <h3 className="font-heading text-lg font-semibold text-slate-navy dark:text-white">
                  {r.region}
                </h3>
                <p className="mt-1 text-sm text-warm-gray dark:text-white/70">
                  {r.count} safehouse{r.count > 1 ? 's' : ''}
                </p>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-warm-gray dark:text-white/70">{t('impact.occupancy')}</span>
                    <span className="font-medium text-slate-navy dark:text-white">
                      {formatLocalizedPercent(Math.round(r.occupancy), preferences)}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-navy/10 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-golden-honey transition-all"
                      style={{ width: `${Math.round(r.occupancy)}%` }}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
