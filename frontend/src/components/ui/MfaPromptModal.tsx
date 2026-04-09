import { Shield, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

interface MfaPromptModalProps {
  isOpen: boolean;
  onSetupNow: () => void;
  onRemindLater: () => void;
}

export default function MfaPromptModal({ isOpen, onSetupNow, onRemindLater }: MfaPromptModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-navy/50 backdrop-blur-sm" onClick={onRemindLater} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <button
          onClick={onRemindLater}
          className="absolute right-4 top-4 rounded-full p-1 text-warm-gray hover:bg-slate-navy/10 dark:text-white/50 dark:hover:bg-white/10"
          aria-label={t('mfa.dismiss')}
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-golden-honey/15">
            <Shield size={28} className="text-golden-honey" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-navy dark:text-white">
              {t('mfa.protectAccount')}
            </h2>
            <p className="mt-2 text-sm text-warm-gray dark:text-white/60 leading-relaxed">
              {t('mfa.enableDescription')}
            </p>
          </div>

          <ul className="w-full space-y-2 text-left">
            {[
              t('mfa.benefitBlock'),
              t('mfa.benefitProtect'),
              t('mfa.benefitTime'),
            ].map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-slate-navy/80 dark:text-white/70">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sage-green/20 text-sage-green">
                  ✓
                </span>
                {point}
              </li>
            ))}
          </ul>

          <div className="flex w-full flex-col gap-2 pt-1">
            <Button variant="primary" className="w-full justify-center" onClick={onSetupNow}>
              {t('mfa.setup')}
            </Button>
            <button
              onClick={onRemindLater}
              className="text-sm text-warm-gray hover:text-slate-navy dark:text-white/50 dark:hover:text-white py-1"
            >
              {t('mfa.remindLater')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
