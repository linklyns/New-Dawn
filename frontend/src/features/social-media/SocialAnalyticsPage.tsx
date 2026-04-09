import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { PagedResult } from '../../types/api';
import type { SocialMediaPost } from '../../types/models';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { formatLocalizedDate, formatLocalizedNumber, formatLocalizedPercent, resolveUserPreferences } from '../../lib/locale';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';

/* ── Theme Colors ────────────────────────────────────────────── */

const COLORS = {
  skyBlue: '#A2C9E1',
  sageGreen: '#91B191',
  slateNavy: '#2D3A4A',
  goldenHoney: '#FFCC66',
  coralPink: '#FFE6E1',
};

const PLATFORM_COLORS: Record<string, string> = {
  Facebook: COLORS.skyBlue,
  Instagram: COLORS.coralPink,
  Twitter: COLORS.slateNavy,
  YouTube: '#FF6B6B',
  TikTok: COLORS.goldenHoney,
  LinkedIn: '#0A66C2',
};

const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: `1px solid ${COLORS.skyBlue}`,
  borderRadius: 8,
};

const PLATFORM_BADGE_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  Facebook: 'info',
  Instagram: 'danger',
  Twitter: 'neutral',
  YouTube: 'danger',
  TikTok: 'warning',
  LinkedIn: 'info',
};

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const POST_TYPE_COLORS: Record<string, string> = {
  FundraisingAppeal: COLORS.goldenHoney,
  EducationalContent: COLORS.skyBlue,
  EventPromotion: COLORS.sageGreen,
  ThankYou: COLORS.coralPink,
  StoryHighlight: COLORS.slateNavy,
};

/* ── Component ───────────────────────────────────────────────── */

export function SocialAnalyticsPage() {
  const { t } = useTranslation();
  const preferences = resolveUserPreferences(useAuthStore((s) => s.user));
  const [platformFilter, setPlatformFilter] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 10;

  const translatePlatform = (platform: string) => {
    const key = {
      Facebook: 'social.facebook',
      Instagram: 'social.instagram',
      Twitter: 'social.twitter',
      YouTube: 'social.youtube',
      TikTok: 'social.tiktok',
      LinkedIn: 'social.linkedin',
      X: 'social.xTwitter',
      WhatsApp: 'social.whatsapp',
    }[platform];

    return key ? t(key, { defaultValue: platform }) : platform;
  };

  const translatePostType = (postType: string) => {
    const key = {
      FundraisingAppeal: 'social.fundraisingAppeal',
      EducationalContent: 'social.educationalContent',
      EventPromotion: 'social.eventPromotion',
      ThankYou: 'social.thankYou',
      StoryHighlight: 'social.storyHighlight',
    }[postType];

    return key ? t(key, { defaultValue: postType }) : postType;
  };

  const translateMediaType = (mediaType: string) => {
    const key = {
      Photo: 'social.photo',
      Video: 'social.video',
      Carousel: 'social.carousel',
      Text: 'social.text',
      Reel: 'social.reel',
    }[mediaType];

    return key ? t(key, { defaultValue: mediaType }) : mediaType;
  };

  const translateDay = (day: string, fallback: string) => {
    const key = {
      Monday: 'social.monday',
      Tuesday: 'social.tuesday',
      Wednesday: 'social.wednesday',
      Thursday: 'social.thursday',
      Friday: 'social.friday',
      Saturday: 'social.saturday',
      Sunday: 'social.sunday',
      Mon: 'social.mon',
      Tue: 'social.tue',
      Wed: 'social.wed',
      Thu: 'social.thu',
      Fri: 'social.fri',
      Sat: 'social.sat',
      Sun: 'social.sun',
    }[day];

    return key ? t(key, { defaultValue: fallback }) : fallback;
  };

  const { data, isLoading } = useQuery({
    queryKey: ['social-media-posts', 'all'],
    queryFn: () =>
      api.get<PagedResult<SocialMediaPost>>('/api/social-media-posts?pageSize=1000'),
  });

  const allPosts = data?.items ?? [];

  /* ── Filtered posts for table ──────────────────────────── */

  const filteredPosts = useMemo(
    () =>
      platformFilter
        ? allPosts.filter((p) => p.platform === platformFilter)
        : allPosts,
    [allPosts, platformFilter],
  );

  const platforms = useMemo(
    () => [...new Set(allPosts.map((p) => p.platform))].sort(),
    [allPosts],
  );

  const tablePageCount = Math.max(1, Math.ceil(filteredPosts.length / TABLE_PAGE_SIZE));
  const pagedPosts = filteredPosts.slice(
    (tablePage - 1) * TABLE_PAGE_SIZE,
    tablePage * TABLE_PAGE_SIZE,
  );

  /* ── Platform Comparison ───────────────────────────────── */

  const platformComparison = useMemo(() => {
    const grouped = new Map<string, number[]>();
    for (const p of allPosts) {
      const arr = grouped.get(p.platform) ?? [];
      arr.push(p.engagementRate);
      grouped.set(p.platform, arr);
    }
    return [...grouped.entries()]
      .map(([platform, rates]) => ({
        platform,
        avgEngagement: +(rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(2),
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);
  }, [allPosts]);

  /* ── Content Type Performance ──────────────────────────── */

  const contentTypePerformance = useMemo(() => {
    const grouped = new Map<string, number[]>();
    for (const p of allPosts) {
      const arr = grouped.get(p.postType) ?? [];
      arr.push(p.engagementRate);
      grouped.set(p.postType, arr);
    }
    return [...grouped.entries()]
      .map(([postType, rates]) => ({
        postType,
        avgEngagement: +(rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(2),
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);
  }, [allPosts]);

  /* ── Best Posting Times Heatmap ────────────────────────── */

  const heatmapData = useMemo(() => {
    const grid: Record<string, Record<number, number[]>> = {};
    for (const day of DAYS_ORDER) {
      grid[day] = {};
      for (let h = 0; h < 24; h++) {
        grid[day][h] = [];
      }
    }
    for (const p of allPosts) {
      if (grid[p.dayOfWeek]) {
        grid[p.dayOfWeek][p.postHour]?.push(p.engagementRate);
      }
    }

    let maxAvg = 0;
    const cells: { day: string; hour: number; avg: number; count: number }[] = [];
    for (const day of DAYS_ORDER) {
      for (let h = 0; h < 24; h++) {
        const rates = grid[day][h];
        const avg = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
        if (avg > maxAvg) maxAvg = avg;
        cells.push({ day, hour: h, avg, count: rates.length });
      }
    }
    return { cells, maxAvg };
  }, [allPosts]);

  /* ── Top Donation Referral Posts ────────────────────────── */

  const topDonationPosts = useMemo(
    () =>
      [...allPosts]
        .sort((a, b) => b.donationReferrals - a.donationReferrals)
        .slice(0, 10)
        .map((p) => ({
          label: t('social.postLabel', {
            defaultValue: '{{platform}} - {{postType}}',
            platform: translatePlatform(p.platform),
            postType: translatePostType(p.postType),
          }),
          donationReferrals: p.donationReferrals,
          postId: p.postId,
        })),
    [allPosts, t],
  );

  /* ── Campaign Effectiveness ────────────────────────────── */

  const campaignData = useMemo(() => {
    const grouped = new Map<
      string,
      { posts: number; impressions: number; reach: number; referrals: number; engagementRates: number[] }
    >();
    for (const p of allPosts) {
      const name = p.campaignName ?? t('social.uncategorizedCampaign', { defaultValue: 'Uncategorized' });
      const existing = grouped.get(name) ?? {
        posts: 0,
        impressions: 0,
        reach: 0,
        referrals: 0,
        engagementRates: [],
      };
      existing.posts += 1;
      existing.impressions += p.impressions;
      existing.reach += p.reach;
      existing.referrals += p.donationReferrals;
      existing.engagementRates.push(p.engagementRate);
      grouped.set(name, existing);
    }
    return [...grouped.entries()]
      .map(([campaignName, stats]) => ({
        campaignName,
        totalPosts: stats.posts,
        totalImpressions: stats.impressions,
        totalReach: stats.reach,
        totalReferrals: stats.referrals,
        avgEngagement: +(
          stats.engagementRates.reduce((a, b) => a + b, 0) / stats.engagementRates.length
        ).toFixed(2),
      }))
      .sort((a, b) => b.totalImpressions - a.totalImpressions);
  }, [allPosts]);

  /* ── Table columns ─────────────────────────────────────── */

  const postColumns = [
    {
      key: 'createdAt',
      header: t('common.date'),
      render: (row: Record<string, unknown>) => formatLocalizedDate(row.createdAt as string, preferences),
    },
    {
      key: 'platform',
      header: t('social.platform'),
      render: (row: Record<string, unknown>) => (
        <Badge variant={PLATFORM_BADGE_VARIANT[row.platform as string] ?? 'neutral'}>
          {translatePlatform(row.platform as string)}
        </Badge>
      ),
    },
    {
      key: 'postType',
      header: t('social.postType'),
      render: (row: Record<string, unknown>) => translatePostType(row.postType as string),
    },
    {
      key: 'mediaType',
      header: t('social.mediaType'),
      render: (row: Record<string, unknown>) => translateMediaType(row.mediaType as string),
    },
    {
      key: 'impressions',
      header: t('social.impressions'),
      render: (row: Record<string, unknown>) => formatLocalizedNumber(row.impressions as number, preferences),
    },
    {
      key: 'reach',
      header: t('social.reach'),
      render: (row: Record<string, unknown>) => formatLocalizedNumber(row.reach as number, preferences),
    },
    {
      key: 'engagementRate',
      header: t('social.engagement', { defaultValue: 'Engagement' }),
      render: (row: Record<string, unknown>) => formatLocalizedPercent(row.engagementRate as number, preferences, { maximumFractionDigits: 2 }),
    },
    {
      key: 'donationReferrals',
      header: t('social.referrals', { defaultValue: 'Referrals' }),
      render: (row: Record<string, unknown>) => formatLocalizedNumber(row.donationReferrals as number, preferences),
    },
  ];

  const campaignColumns = [
    { key: 'campaignName', header: t('social.campaignName') },
    { key: 'totalPosts', header: t('social.posts') },
    {
      key: 'totalImpressions',
      header: t('social.impressions'),
      render: (row: Record<string, unknown>) => formatLocalizedNumber(row.totalImpressions as number, preferences),
    },
    {
      key: 'totalReach',
      header: t('social.reach'),
      render: (row: Record<string, unknown>) => formatLocalizedNumber(row.totalReach as number, preferences),
    },
    {
      key: 'totalReferrals',
      header: t('social.donationReferrals'),
      render: (row: Record<string, unknown>) => formatLocalizedNumber(row.totalReferrals as number, preferences),
    },
    {
      key: 'avgEngagement',
      header: t('social.avgEngagement'),
      render: (row: Record<string, unknown>) => formatLocalizedPercent(row.avgEngagement as number, preferences, { maximumFractionDigits: 2 }),
    },
  ];

  /* ── Render ────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title={t('social.analyticsTitle')}
          subtitle={t('social.analyticsPageSubtitle', { defaultValue: 'Content performance and engagement insights' })}
        />
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('social.analyticsTitle')}
        subtitle={t('social.analyticsPageSubtitle', { defaultValue: 'Content performance and engagement insights' })}
        action={
          <Link to="/admin/social/editor">
            <Button variant="primary">{t('social.createPost', { defaultValue: 'Create Post' })}</Button>
          </Link>
        }
      />

      <div className="space-y-8">
        {/* ── Section 1: Post Performance Table ──────────── */}
        <Card>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-heading text-xl font-semibold text-slate-navy dark:text-white">
              {t('social.postPerformance', { defaultValue: 'Post Performance' })}
            </h2>
            <div className="flex items-center gap-2">
              <label
                htmlFor="platform-filter"
                className="text-sm font-medium text-warm-gray"
              >
                {t('social.platform')}:
              </label>
              <select
                id="platform-filter"
                value={platformFilter}
                onChange={(e) => {
                  setPlatformFilter(e.target.value);
                  setTablePage(1);
                }}
                className="rounded-lg border border-slate-navy/20 bg-white px-3 py-1.5 text-sm text-slate-navy dark:border-white/20 dark:bg-slate-navy dark:text-white"
              >
                <option value="">{t('social.allPlatforms', { defaultValue: 'All Platforms' })}</option>
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {translatePlatform(p)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Table
            columns={postColumns}
            data={pagedPosts as unknown as Record<string, unknown>[]}
            page={tablePage}
            pageSize={TABLE_PAGE_SIZE}
            totalPages={tablePageCount}
            onPageChange={setTablePage}
            emptyMessage={t('social.noPostsFound', { defaultValue: 'No social media posts found.' })}
          />
        </Card>

        {/* ── Section 2 + 3: Platform + Content Type ─────── */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Platform Comparison */}
          <Card>
            <h2 className="mb-6 font-heading text-xl font-semibold text-slate-navy dark:text-white">
              {t('social.platformComparison')}
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D3A4A20" />
                  <XAxis
                    dataKey="platform"
                    tick={{ fill: '#2D3A4A', fontSize: 12 }}
                    tickFormatter={(value: string) => translatePlatform(value)}
                  />
                  <YAxis
                    tick={{ fill: '#2D3A4A', fontSize: 12 }}
                    tickFormatter={(v: number) => formatLocalizedPercent(v, preferences, { maximumFractionDigits: 2 })}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v) => formatLocalizedPercent(Number(v), preferences, { maximumFractionDigits: 2 })}
                  />
                  <Bar
                    dataKey="avgEngagement"
                    name={t('social.avgEngagementRate', { defaultValue: 'Avg Engagement Rate' })}
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  >
                    {platformComparison.map((entry) => (
                      <Cell
                        key={entry.platform}
                        fill={PLATFORM_COLORS[entry.platform] ?? COLORS.sageGreen}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Content Type Performance */}
          <Card>
            <h2 className="mb-6 font-heading text-xl font-semibold text-slate-navy dark:text-white">
              {t('social.contentTypePerformance')}
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contentTypePerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D3A4A20" />
                  <XAxis
                    dataKey="postType"
                    tick={{ fill: '#2D3A4A', fontSize: 11 }}
                    tickFormatter={(value: string) => translatePostType(value)}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fill: '#2D3A4A', fontSize: 12 }}
                    tickFormatter={(v: number) => formatLocalizedPercent(v, preferences, { maximumFractionDigits: 2 })}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v) => formatLocalizedPercent(Number(v), preferences, { maximumFractionDigits: 2 })}
                  />
                  <Bar
                    dataKey="avgEngagement"
                    name={t('social.avgEngagementRate', { defaultValue: 'Avg Engagement Rate' })}
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  >
                    {contentTypePerformance.map((entry) => (
                      <Cell
                        key={entry.postType}
                        fill={POST_TYPE_COLORS[entry.postType] ?? COLORS.sageGreen}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* ── Section 4: Best Posting Times Heatmap ──────── */}
        <Card>
          <h2 className="mb-6 font-heading text-xl font-semibold text-slate-navy dark:text-white">
            {t('social.bestPostingTimes')}
          </h2>
          <p className="mb-4 text-sm text-warm-gray">
            {t('social.bestPostingTimesHelper', {
              defaultValue: 'Average engagement rate by day and hour. Darker cells indicate higher engagement.',
            })}
          </p>
          <div className="overflow-x-auto">
            {/* Hour labels */}
            <div className="flex">
              <div className="w-12 shrink-0" />
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className="flex h-6 w-8 shrink-0 items-center justify-center text-[10px] text-warm-gray"
                >
                  {h}
                </div>
              ))}
            </div>
            {/* Grid rows */}
            {DAYS_ORDER.map((day, dayIdx) => (
              <div key={day} className="flex">
                <div className="flex w-12 shrink-0 items-center text-xs font-medium text-warm-gray">
                  {translateDay(DAY_LABELS[dayIdx], DAY_LABELS[dayIdx])}
                </div>
                {Array.from({ length: 24 }, (_, h) => {
                  const cell = heatmapData.cells.find(
                    (c) => c.day === day && c.hour === h,
                  );
                  const intensity =
                    cell && heatmapData.maxAvg > 0
                      ? cell.avg / heatmapData.maxAvg
                      : 0;
                  return (
                    <div
                      key={h}
                      className="m-[1px] h-7 w-7 shrink-0 rounded-sm"
                      style={{
                        backgroundColor: COLORS.sageGreen,
                        opacity: Math.max(0.08, intensity),
                      }}
                      title={t('social.heatmapCellTitle', {
                        defaultValue: '{{day}} {{hour}}:00 - Avg: {{avg}} ({{count}} posts)',
                        day: translateDay(day, day),
                        hour: h,
                        avg: formatLocalizedPercent(cell?.avg ?? 0, preferences, { maximumFractionDigits: 2 }),
                        count: formatLocalizedNumber(cell?.count ?? 0, preferences),
                      })}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </Card>

        {/* ── Section 5: Donation Referral Tracking ──────── */}
        <Card>
          <h2 className="mb-6 font-heading text-xl font-semibold text-slate-navy dark:text-white">
            {t('social.topPostsByDonationReferrals', { defaultValue: 'Top Posts By Donation Referrals' })}
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topDonationPosts}
                layout="vertical"
                margin={{ left: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3A4A20" />
                <XAxis
                  type="number"
                  tick={{ fill: '#2D3A4A', fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: '#2D3A4A', fontSize: 11 }}
                  width={160}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend />
                <Bar
                  dataKey="donationReferrals"
                  name={t('social.donationReferrals')}
                  fill={COLORS.goldenHoney}
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ── Section 6: Campaign Effectiveness ──────────── */}
        <Card>
          <h2 className="mb-6 font-heading text-xl font-semibold text-slate-navy dark:text-white">
            {t('social.campaignEffectiveness')}
          </h2>
          <Table
            columns={campaignColumns}
            data={campaignData as unknown as Record<string, unknown>[]}
            emptyMessage={t('social.noCampaignData', { defaultValue: 'No campaign data available.' })}
          />
        </Card>
      </div>
    </div>
  );
}
