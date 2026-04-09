import { useState } from 'react';
import { Bell, CheckCircle2, Circle, CheckCheck, Shield, TrendingDown, Share2, DollarSign, PieChart, AlertTriangle } from 'lucide-react';
import { Bell, Check, CheckCheck, Shield, Users, TrendingDown, Share2, DollarSign, PieChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useMarkRead, useMarkAllRead, useMarkUnread, useSnoozeNotification } from '../../hooks/useNotifications';
import { MfaSnoozeModal } from '../../components/ui/MfaSnoozeModal';
import { NotificationListModal } from '../../components/ui/NotificationListModal';
import type { Notification } from '../../types';

const typeConfig: Record<string, { icon: typeof Bell; label: string; color: string }> = {
  MfaReminder: { icon: Shield, label: 'MFA Reminder', color: 'bg-golden-honey/10 text-golden-honey' },
  LowLikelihoodDonors: { icon: TrendingDown, label: 'Low Likelihood', color: 'bg-coral-pink/10 text-coral-pink' },
  HighRiskResidents: { icon: AlertTriangle, label: 'High Risk', color: 'bg-red-100 text-red-500' },
  SocialMediaReminder: { icon: Share2, label: 'Social Media', color: 'bg-sky-blue/10 text-sky-blue' },
  DonationMilestone: { icon: DollarSign, label: 'Milestone', color: 'bg-sage-green/10 text-sage-green' },
  AllocationBenchmark: { icon: PieChart, label: 'Benchmark', color: 'bg-sage-green/10 text-sage-green' },
};

const navigateTypes = new Set(['SocialMediaReminder']);
const listModalTypes = new Set(['LowLikelihoodDonors', 'HighRiskResidents']);

export function NotificationsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications(page, 20);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const markUnread = useMarkUnread();
  const snooze = useSnoozeNotification();
  const navigate = useNavigate();

  const [snoozeNotification, setSnoozeNotification] = useState<Notification | null>(null);
  const [listModal, setListModal] = useState<Notification | null>(null);
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

    if (n.type === 'MfaReminder') {
      setSnoozeNotification(n);
      return;
    }

    if (listModalTypes.has(n.type) && n.listData) {
      setListModal(n);
      return;
    }

    if (navigateTypes.has(n.type) && n.link) {
      navigate(n.link);
    }
  }

  function handleSnooze(months: number) {
    if (!snoozeNotification) return;
    snooze.mutate(
      { id: snoozeNotification.notificationId, months },
      { onSuccess: () => setSnoozeNotification(null) }
    );
  }

  function toggleRead(e: React.MouseEvent, n: Notification) {
    e.stopPropagation();
    if (n.isRead) {
      markUnread.mutate(n.notificationId);
    } else {
      markRead.mutate(n.notificationId);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-navy dark:text-white">{t('notifications.title')}</h1>
          {data && (
            <p className="mt-1 text-sm text-slate-navy/70 dark:text-white/60">
              {data.unreadCount} unread of {data.totalCount} total
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
              <div
                key={n.notificationId}
                className={`flex w-full items-start gap-4 px-5 py-4 transition-colors ${
                  i > 0 ? 'border-t border-slate-navy/10 dark:border-white/10' : ''
                } ${!n.isRead ? 'bg-sky-blue/5 dark:bg-sky-blue/10' : ''}`}
              >
                {/* Read/unread toggle */}
                <button
                  onClick={(e) => toggleRead(e, n)}
                  className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                    n.isRead
                      ? 'text-sage-green hover:bg-sage-green/10'
                      : 'text-slate-navy/40 hover:bg-sky-blue/10 hover:text-sky-blue dark:text-white/40'
                  }`}
                  title={n.isRead ? 'Mark as unread (returns to bell)' : 'Mark as read'}
                >
                  {n.isRead ? <CheckCircle2 size={22} /> : <Circle size={22} strokeWidth={2} />}
                </button>

                {/* Clickable content */}
                <button
                  onClick={() => handleClick(n)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.color}`}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[15px] font-semibold leading-tight ${
                          !n.isRead
                            ? 'text-slate-navy dark:text-white'
                            : 'text-slate-navy dark:text-white/90'
                        }`}>
                          {n.title}
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-blue" />}
                      </div>
                      <p className={`mt-1 text-[14px] leading-relaxed ${
                        !n.isRead
                          ? 'text-slate-navy/90 dark:text-white/80'
                          : 'text-slate-navy/70 dark:text-white/60'
                      }`}>
                        {n.message}
                      </p>
                      <span className={`mt-1.5 block text-xs ${
                        !n.isRead
                          ? 'text-slate-navy/60 dark:text-white/50'
                          : 'text-slate-navy/50 dark:text-white/40'
                      }`}>
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
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

      {/* MFA Snooze Modal */}
      <MfaSnoozeModal
        isOpen={snoozeNotification !== null}
        onClose={() => setSnoozeNotification(null)}
        onSnooze={handleSnooze}
        isLoading={snooze.isPending}
      />

      {/* List Modal for donors / residents */}
      {listModal && listModal.listData && (
        <NotificationListModal
          isOpen={true}
          onClose={() => setListModal(null)}
          title={listModal.title}
          type={listModal.type as 'LowLikelihoodDonors' | 'HighRiskResidents'}
          listData={listModal.listData}
        />
      )}
    </div>
  );
}
