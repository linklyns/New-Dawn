import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Circle, ExternalLink, Shield, TrendingDown, Share2, DollarSign, PieChart, AlertTriangle } from 'lucide-react';
import { Bell, Check, CheckCheck, ExternalLink, Shield, Users, TrendingDown, Share2, DollarSign, PieChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead, useSnoozeNotification } from '../../hooks/useNotifications';
import { MfaSnoozeModal } from './MfaSnoozeModal';
import { NotificationListModal } from './NotificationListModal';
import type { Notification } from '../../types';

const typeConfig: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  MfaReminder: { icon: Shield, color: 'text-golden-honey', label: 'MFA' },
  LowLikelihoodDonors: { icon: TrendingDown, color: 'text-coral-pink', label: 'Donors' },
  HighRiskResidents: { icon: AlertTriangle, color: 'text-red-500', label: 'Risk' },
  SocialMediaReminder: { icon: Share2, color: 'text-sky-blue', label: 'Social' },
  DonationMilestone: { icon: DollarSign, color: 'text-sage-green', label: 'Milestone' },
  AllocationBenchmark: { icon: PieChart, color: 'text-sage-green', label: 'Benchmark' },
};

const navigateTypes = new Set(['MfaReminder', 'SocialMediaReminder']);
const listModalTypes = new Set(['LowLikelihoodDonors', 'HighRiskResidents']);
const informTypes = new Set(['DonationMilestone', 'AllocationBenchmark']);

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [snoozeNotification, setSnoozeNotification] = useState<Notification | null>(null);
  const [listModal, setListModal] = useState<Notification | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const { data: unreadCount } = useUnreadCount();
  const { data, isLoading } = useNotifications(1, 15, true);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const snooze = useSnoozeNotification();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const notifications = data?.items ?? [];
  const count = typeof unreadCount === 'number' ? unreadCount : 0;

  function handleNotificationClick(n: Notification) {
    if (!n.isRead) markRead.mutate(n.notificationId);

    if (n.type === 'MfaReminder') {
      setSnoozeNotification(n);
      setOpen(false);
      return;
    }

    if (listModalTypes.has(n.type) && n.listData) {
      setListModal(n);
      setOpen(false);
      return;
    }

    if (navigateTypes.has(n.type) && n.link) {
      navigate(n.link);
      setOpen(false);
      return;
    }

    if (informTypes.has(n.type)) {
      return;
    }

    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  }

  function handleSnooze(months: number) {
    if (!snoozeNotification) return;
    snooze.mutate(
      { id: snoozeNotification.notificationId, months },
      { onSuccess: () => setSnoozeNotification(null) }
    );
  }

  function handleMarkRead(e: React.MouseEvent, n: Notification) {
    e.stopPropagation();
    markRead.mutate(n.notificationId);
  }

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setOpen(!open)}
          className="relative rounded-lg p-2 text-slate-navy transition-colors hover:bg-slate-navy/5 dark:text-white dark:hover:bg-white/10"
          aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
        >
          <Bell size={18} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white shadow-sm">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>

        {open && (
          <div
            ref={panelRef}
            className="absolute right-0 top-full mt-2 w-[26rem] max-h-[32rem] overflow-hidden rounded-xl border border-slate-navy/10 bg-white shadow-xl dark:border-white/10 dark:bg-dark-surface"
            role="dialog"
            aria-label="Notifications"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-navy/10 px-4 py-3 dark:border-white/10">
              <h3 className="text-base font-semibold text-slate-navy dark:text-white">
                Notifications {count > 0 && <span className="text-sm font-normal text-slate-navy/60 dark:text-white/60">({count} unread)</span>}
              </h3>
              {count > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1.5 text-xs font-medium text-sky-blue transition-colors hover:text-sky-blue/80"
                >
                  <CheckCheck size={14} />
                  Clear all
                </button>
              )}
            </div>

            {/* List - unread only */}
            <div className="max-h-[25rem] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-blue border-t-transparent" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell size={24} className="mx-auto mb-2 text-slate-navy/30 dark:text-white/30" />
                  <p className="text-sm text-slate-navy/50 dark:text-white/50">
                    All caught up!
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const cfg = typeConfig[n.type] ?? { icon: Bell, color: 'text-slate-navy dark:text-white', label: n.type };
                  const Icon = cfg.icon;
                  const isClickable = navigateTypes.has(n.type) || listModalTypes.has(n.type) || n.type === 'MfaReminder';
                  return (
                    <div
                      key={n.notificationId}
                      className="flex w-full items-start gap-3 border-b border-slate-navy/5 bg-sky-blue/5 px-4 py-3.5 transition-colors last:border-b-0 dark:border-white/5 dark:bg-sky-blue/10"
                    >
                      {/* Mark as read button */}
                      <button
                        onClick={(e) => handleMarkRead(e, n)}
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sky-blue transition-colors hover:bg-sky-blue/10 hover:text-sky-blue/80"
                        title="Mark as read (removes from bell)"
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-slate-navy transition-colors hover:bg-slate-navy/5 dark:text-white dark:hover:bg-white/10"
        aria-label={count > 0 ? t('notifications.unreadOfTotal', { unread: count, total: count }) : t('notifications.title')}
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-pink px-1 text-[10px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-96 max-h-[28rem] overflow-hidden rounded-xl border border-slate-navy/10 bg-white shadow-xl dark:border-white/10 dark:bg-dark-surface"
          role="dialog"
          aria-label={t('notifications.title')}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-navy/10 px-4 py-3 dark:border-white/10">
            <h3 className="text-sm font-semibold text-slate-navy dark:text-white">
              {t('notifications.title')}
            </h3>
            {count > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs font-medium text-sky-blue transition-colors hover:text-sky-blue/80"
              >
                <CheckCheck size={14} />
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[22rem] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-blue border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="mx-auto mb-2 text-slate-navy/30 dark:text-white/30" />
                <p className="text-sm text-slate-navy/50 dark:text-white/50">
                  {t('notifications.noNotifications')}
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = typeConfig[n.type] ?? { icon: Bell, color: 'text-slate-navy dark:text-white' };
                const Icon = cfg.icon;
                return (
                  <button
                    key={n.notificationId}
                    onClick={() => handleNotificationClick(n)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-navy/5 dark:hover:bg-white/5 ${
                      !n.isRead ? 'bg-sky-blue/5 dark:bg-sky-blue/10' : ''
                    }`}
                  >
                    <span className={`mt-0.5 shrink-0 ${cfg.color}`}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${!n.isRead ? 'text-slate-navy dark:text-white' : 'text-slate-navy/70 dark:text-white/70'}`}>
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-sky-blue" />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-navy/60 dark:text-white/60">
                        {n.message}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] text-slate-navy/40 dark:text-white/40">
                          {timeAgo(n.createdAt)}
                        </span>
                        {n.link && (
                          <ExternalLink size={10} className="text-slate-navy/30 dark:text-white/30" />
                        )}
                      </div>
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead.mutate(n.notificationId);
                        }}
                        className="shrink-0 rounded p-1 text-slate-navy/40 transition-colors hover:bg-slate-navy/10 hover:text-slate-navy dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label={t('notifications.markAsRead')}
                      >
                        <Circle size={18} strokeWidth={2} />
                      </button>

                      {/* Clickable content area */}
                      <button
                        onClick={() => handleNotificationClick(n)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`shrink-0 ${cfg.color}`}>
                            <Icon size={16} />
                          </span>
                          <span className="text-sm font-semibold leading-tight text-slate-navy dark:text-white">
                            {n.title}
                          </span>
                          <span className="h-2 w-2 shrink-0 rounded-full bg-sky-blue" />
                        </div>
                        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-slate-navy/90 dark:text-white/80">
                          {n.message}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-xs text-slate-navy/70 dark:text-white/60">
                            {timeAgo(n.createdAt)}
                          </span>
                          {isClickable && (
                            <ExternalLink size={11} className="text-slate-navy/60 dark:text-white/50" />
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-navy/10 px-4 py-2.5 dark:border-white/10">
              <button
                onClick={() => {
                  navigate('/admin/notifications');
                  setOpen(false);
                }}
                className="w-full text-center text-sm font-medium text-sky-blue transition-colors hover:text-sky-blue/80"
              >
                {t('notifications.viewAll')}
              </button>
            </div>
          </div>
        )}
      </div>

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
    </>
  );
}
