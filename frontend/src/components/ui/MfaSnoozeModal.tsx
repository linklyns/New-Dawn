import { X, Clock } from 'lucide-react';

interface MfaSnoozeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSnooze: (months: number) => void;
  isLoading?: boolean;
}

const snoozeOptions = [
  { months: 1, label: '1 Month' },
  { months: 3, label: '3 Months' },
  { months: 6, label: '6 Months' },
];

export function MfaSnoozeModal({ isOpen, onClose, onSnooze, isLoading }: MfaSnoozeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-slate-navy/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-dark-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-golden-honey" />
            <h3 className="text-lg font-semibold text-slate-navy dark:text-white">
              Snooze MFA Reminder
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-navy/40 transition-colors hover:bg-slate-navy/10 hover:text-slate-navy dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mb-5 text-sm text-slate-navy/60 dark:text-white/60">
          How long would you like to snooze this reminder?
        </p>

        <div className="flex flex-col gap-2">
          {snoozeOptions.map((opt) => (
            <button
              key={opt.months}
              onClick={() => onSnooze(opt.months)}
              disabled={isLoading}
              className="rounded-lg border border-slate-navy/10 px-4 py-3 text-sm font-medium text-slate-navy transition-colors hover:bg-sky-blue/10 hover:border-sky-blue/30 hover:text-sky-blue disabled:opacity-50 dark:border-white/10 dark:text-white dark:hover:bg-sky-blue/10 dark:hover:border-sky-blue/30 dark:hover:text-sky-blue"
            >
              Remind me in {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
