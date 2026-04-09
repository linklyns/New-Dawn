import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, ExternalLink, Shield, Users, TrendingDown, Share2, DollarSign, PieChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from '../../hooks/useNotifications';
import type { Notification } from '../../types';

export function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const { data: unreadCount } = useUnreadCount();
  const { data, isLoading } = useNotifications(1, 15);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const typeConfig: Record<string, { icon: typeof Bell; label: string; color: string }> = {
    MfaReminder: { icon: Shield, label: t('notifications.mfaReminder'), color: 'bg-golden-honey/10 text-golden-honey' },
    LowLikelihoodDonors: { icon: TrendingDown, label: t('notifications.lowLikelihood'), color: 'bg-coral-pink/10 text-coral-pink' },
    ForgottenParticipants: { icon: Users, label: t('notifications.needsAttention'), color: 'bg-red-100 text-red-500 dark:bg-red-500/15 dark:text-red-300' },
    SocialMediaReminder: { icon: Share2, label: t('notifications.socialMedia'), color: 'bg-sky-blue/10 text-sky-blue' },
    DonationMilestone: { icon: DollarSign, label: t('notifications.milestone'), color: 'bg-sage-green/10 text-sage-green' },
    AllocationBenchmark: { icon: PieChart, label: t('notifications.benchmark'), color: 'bg-sage-green/10 text-sage-green' },
  };

  // Close on outside click
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

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const notifications = data?.items ?? [];
  const unreadNotifications = notifications.filter((notification) => !notification.isRead);
  const count = typeof unreadCount === 'number' ? unreadCount : 0;

  function handleNotificationClick(n: Notification) {
    if (!n.isRead) markRead.mutate(n.notificationId);
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-slate-navy transition-colors hover:bg-slate-navy/5 dark:text-white dark:hover:bg-white/10"
        aria-label={count > 0 ? `${t('notifications.title')} (${count} unread)` : t('notifications.title')}
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral-pink px-1 text-[11px] font-bold text-white shadow-sm">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-[26rem] max-h-[32rem] overflow-hidden rounded-xl border border-slate-navy/10 bg-white shadow-xl dark:border-white/10 dark:bg-dark-surface"
          role="dialog"
          aria-label={t('notifications.title')}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-navy/10 px-4 py-3 dark:border-white/10">
            <h3 className="text-base font-semibold text-slate-navy dark:text-white">
              {t('notifications.title')}{' '}
              {count > 0 && (
                <span className="text-sm font-normal text-slate-navy/60 dark:text-white/60">
                  ({count} unread)
                </span>
              )}
            </h3>
            {count > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1.5 text-xs font-medium text-sky-blue transition-colors hover:text-sky-blue/80"
              >
                <CheckCheck size={14} />
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[25rem] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-blue border-t-transparent" />
              </div>
            ) : unreadNotifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="mx-auto mb-2 text-slate-navy/30 dark:text-white/30" />
                <p className="text-sm text-slate-navy/50 dark:text-white/50">
                  All caught up!
                </p>
              </div>
            ) : (
              unreadNotifications.map((n) => {
                const cfg = typeConfig[n.type] ?? { icon: Bell, label: n.type, color: 'bg-slate-navy/10 text-slate-navy dark:bg-white/10 dark:text-white' };
                const Icon = cfg.icon;
                return (
                  <div
                    key={n.notificationId}
                    className="flex items-start gap-3 border-b border-slate-navy/5 bg-sky-blue/5 px-4 py-3.5 transition-colors last:border-b-0 dark:border-white/5 dark:bg-sky-blue/10"
                  >
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.color}`}>
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-navy dark:text-white">
                            {n.title}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-navy/60 dark:text-white/60">
                          {n.message}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[10px] text-slate-navy/40 dark:text-white/40">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                          {n.link && (
                            <ExternalLink size={10} className="text-slate-navy/30 dark:text-white/30" />
                          )}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead.mutate(n.notificationId);
                      }}
                      className="mt-1 shrink-0 rounded-lg p-1.5 text-slate-navy/40 transition-colors hover:bg-slate-navy/10 hover:text-slate-navy dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                      aria-label={t('notifications.markAsRead')}
                    >
                      <Check size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-navy/10 px-4 py-2 dark:border-white/10">
              <button
                onClick={() => {
                  navigate('/admin/notifications');
                  setOpen(false);
                }}
                className="w-full text-center text-xs font-medium text-sky-blue transition-colors hover:text-sky-blue/80"
              >
                {t('notifications.viewAll')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
