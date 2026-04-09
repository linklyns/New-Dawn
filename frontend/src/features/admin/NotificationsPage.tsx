import { useState } from 'react';
import { Bell, CheckCircle2, Circle, CheckCheck, Shield, TrendingDown, Share2, DollarSign, PieChart, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useMarkRead, useMarkAllRead, useMarkUnread, useSnoozeNotification } from '../../hooks/useNotifications';
import { MfaSnoozeModal } from '../../components/ui/MfaSnoozeModal';
import { NotificationListModal } from '../../components/ui/NotificationListModal';
import type { Notification } from '../../types';

const navigateTypes = new Set(['SocialMediaReminder']);
const listModalTypes = new Set(['LowLikelihoodDonors', 'HighRiskResidents']);

export function NotificationsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [snoozeNotification, setSnoozeNotification] = useState<Notification | null>(null);
  const [listModal, setListModal] = useState<Notification | null>(null);
  const { data, isLoading } = useNotifications(page, 20);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const markUnread = useMarkUnread();
  const snooze = useSnoozeNotification();
  const navigate = useNavigate();

  const typeConfig: Record<string, { icon: typeof Bell; label: string; color: string }> = {
    MfaReminder: { icon: Shield, label: t('notifications.mfaReminder'), color: 'bg-golden-honey/10 text-golden-honey' },
    LowLikelihoodDonors: { icon: TrendingDown, label: t('notifications.lowLikelihood'), color: 'bg-coral-pink/10 text-coral-pink' },
    HighRiskResidents: { icon: AlertTriangle, label: 'High Risk', color: 'bg-red-100 text-red-500 dark:bg-red-500/15 dark:text-red-300' },
    SocialMediaReminder: { icon: Share2, label: t('notifications.socialMedia'), color: 'bg-sky-blue/10 text-sky-blue' },
    DonationMilestone: { icon: DollarSign, label: t('notifications.milestone'), color: 'bg-sage-green/10 text-sage-green' },
    AllocationBenchmark: { icon: PieChart, label: t('notifications.benchmark'), color: 'bg-sage-green/10 text-sage-green' },
  };

  const notifications = data?.items ?? [];

  function handleClick(notification: Notification) {
    if (!notification.isRead) markRead.mutate(notification.notificationId);

    if (notification.type === 'MfaReminder') {
      setSnoozeNotification(notification);
      return;
    }

    if (listModalTypes.has(notification.type) && notification.listData) {
      setListModal(notification);
      return;
    }

    if (navigateTypes.has(notification.type) && notification.link) {
      navigate(notification.link);
      return;
    }

    if (notification.link) {
      navigate(notification.link);
    }
  }

  function handleSnooze(months: number) {
    if (!snoozeNotification) return;

    snooze.mutate(
      { id: snoozeNotification.notificationId, months },
      { onSuccess: () => setSnoozeNotification(null) },
    );
  }

  function toggleRead(event: React.MouseEvent, notification: Notification) {
    event.stopPropagation();
    if (notification.isRead) {
      markUnread.mutate(notification.notificationId);
      return;
    }

    markRead.mutate(notification.notificationId);
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
            className="flex items-center gap-1.5 rounded-lg bg-sky-blue/15 px-3 py-2 text-sm font-semibold text-slate-navy transition-colors hover:bg-sky-blue/25 dark:bg-sky-blue/20 dark:text-white dark:hover:bg-sky-blue/30"
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
          {notifications.map((notification, index) => {
            const cfg = typeConfig[notification.type] ?? { icon: Bell, label: notification.type, color: 'bg-slate-navy/10 text-slate-navy dark:text-white' };
            const Icon = cfg.icon;

            return (
              <div
                key={notification.notificationId}
                className={`flex w-full items-start gap-4 px-5 py-4 transition-colors ${
                  index > 0 ? 'border-t border-slate-navy/5 dark:border-white/5' : ''
                } ${!notification.isRead ? 'bg-sky-blue/5 dark:bg-sky-blue/10' : ''}`}
              >
                <button
                  onClick={(event) => toggleRead(event, notification)}
                  className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                    notification.isRead
                      ? 'text-sage-green hover:bg-sage-green/10'
                      : 'text-slate-navy/40 hover:bg-sky-blue/10 hover:text-sky-blue dark:text-white/40'
                  }`}
                  title={notification.isRead ? 'Mark as unread' : 'Mark as read'}
                >
                  {notification.isRead ? <CheckCircle2 size={22} /> : <Circle size={22} strokeWidth={2} />}
                </button>

                <button onClick={() => handleClick(notification)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-start gap-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.color}`}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[15px] font-semibold leading-tight ${
                          !notification.isRead ? 'text-slate-navy dark:text-white' : 'text-slate-navy dark:text-white/90'
                        }`}>
                          {notification.title}
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {!notification.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-blue" />}
                      </div>
                      <p className={`mt-1 text-[14px] leading-relaxed ${
                        !notification.isRead ? 'text-slate-navy/90 dark:text-white/80' : 'text-slate-navy/70 dark:text-white/60'
                      }`}>
                        {notification.message}
                      </p>
                      <span className={`mt-1.5 block text-xs ${
                        !notification.isRead ? 'text-slate-navy/60 dark:text-white/50' : 'text-slate-navy/50 dark:text-white/40'
                      }`}>
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            disabled={page === 1}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-navy transition-colors hover:bg-slate-navy/5 disabled:opacity-40 dark:text-white dark:hover:bg-white/10"
          >
            {t('common.previous')}
          </button>
          <span className="text-sm text-slate-navy/60 dark:text-white/60">
            {t('common.pageOf', { page, pages: data.totalPages })}
          </span>
          <button
            onClick={() => setPage((currentPage) => Math.min(data.totalPages, currentPage + 1))}
            disabled={page === data.totalPages}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-navy transition-colors hover:bg-slate-navy/5 disabled:opacity-40 dark:text-white dark:hover:bg-white/10"
          >
            {t('common.next')}
          </button>
        </div>
      )}

      <MfaSnoozeModal
        isOpen={snoozeNotification !== null}
        onClose={() => setSnoozeNotification(null)}
        onSnooze={handleSnooze}
        isLoading={snooze.isPending}
      />

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
