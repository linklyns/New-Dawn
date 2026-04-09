import { useState } from 'react';
import { Bell, Check, CheckCheck, Shield, Users, TrendingDown, Share2, DollarSign, PieChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useMarkRead, useMarkAllRead } from '../../hooks/useNotifications';
import type { Notification } from '../../types';

export function NotificationsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications(page, 20);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const navigate = useNavigate();

  const typeConfig: Record<string, { icon: typeof Bell; label: string; color: string }> = {
    MfaReminder: { icon: Shield, label: t('notifications.mfaReminder'), color: 'bg-golden-honey/10 text-golden-honey' },
    LowLikelihoodDonors: { icon: TrendingDown, label: t('notifications.lowLikelihood'), color: 'bg-coral-pink/10 text-coral-pink' },
    ForgottenParticipants: { icon: Users, label: t('notifications.needsAttention'), color: 'bg-red-100 text-red-500' },
    SocialMediaReminder: { icon: Share2, label: t('notifications.socialMedia'), color: 'bg-sky-blue/10 text-sky-blue' },
    DonationMilestone: { icon: DollarSign, label: t('notifications.milestone'), color: 'bg-sage-green/10 text-sage-green' },
    AllocationBenchmark: { icon: PieChart, label: t('notifications.benchmark'), color: 'bg-sage-green/10 text-sage-green' },
  };

  const notifications = data?.items ?? [];

  function handleClick(n: Notification) {
    if (!n.isRead) markRead.mutate(n.notificationId);
    if (n.link) navigate(n.link);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-navy dark:text-white">{t('notifications.title')}</h1>
          {data && (
            <p className="mt-1 text-sm text-slate-navy/60 dark:text-white/60">
              {t('notifications.unreadOfTotal', { unread: data.unreadCount, total: data.totalCount })}
            </p>
          )}
        </div>
        {data && data.unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-sky-blue/10 px-3 py-2 text-sm font-medium text-sky-blue transition-colors hover:bg-sky-blue/20"
          >
            <CheckCheck size={16} />
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-blue border-t-transparent" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-slate-navy/10 bg-white py-16 text-center dark:border-white/10 dark:bg-dark-surface">
          <Bell size={32} className="mx-auto mb-3 text-slate-navy/20 dark:text-white/20" />
          <p className="text-slate-navy/50 dark:text-white/50">{t('notifications.noNotifications')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-navy/10 bg-white dark:border-white/10 dark:bg-dark-surface">
          {notifications.map((n, i) => {
            const cfg = typeConfig[n.type] ?? { icon: Bell, label: n.type, color: 'bg-slate-navy/10 text-slate-navy dark:text-white' };
            const Icon = cfg.icon;
            return (
              <button
                key={n.notificationId}
                onClick={() => handleClick(n)}
                className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-navy/5 dark:hover:bg-white/5 ${
                  i > 0 ? 'border-t border-slate-navy/5 dark:border-white/5' : ''
                } ${!n.isRead ? 'bg-sky-blue/5 dark:bg-sky-blue/10' : ''}`}
              >
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.color}`}>
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${!n.isRead ? 'text-slate-navy dark:text-white' : 'text-slate-navy/70 dark:text-white/70'}`}>
                      {n.title}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    {!n.isRead && <span className="h-2 w-2 rounded-full bg-sky-blue" />}
                  </div>
                  <p className="mt-1 text-sm text-slate-navy/60 dark:text-white/60">
                    {n.message}
                  </p>
                  <span className="mt-1 block text-xs text-slate-navy/40 dark:text-white/40">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                {!n.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead.mutate(n.notificationId);
                    }}
                    className="mt-1 shrink-0 rounded-lg p-1.5 text-slate-navy/40 transition-colors hover:bg-slate-navy/10 hover:text-slate-navy dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label={t('notifications.markAllRead')}
                  >
                    <Check size={14} />
                  </button>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-navy transition-colors hover:bg-slate-navy/5 disabled:opacity-40 dark:text-white dark:hover:bg-white/10"
          >
            {t('common.previous')}
          </button>
          <span className="text-sm text-slate-navy/60 dark:text-white/60">
            {t('common.pageOf', { page, pages: data.totalPages })}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-navy transition-colors hover:bg-slate-navy/5 disabled:opacity-40 dark:text-white dark:hover:bg-white/10"
          >
            {t('common.next')}
          </button>
        </div>
      )}
    </div>
  );
}
