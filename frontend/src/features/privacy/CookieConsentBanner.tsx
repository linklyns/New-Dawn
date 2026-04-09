import { useState, useCallback } from 'react';
import Cookies from 'js-cookie';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

interface CookiePreferences {
  essential: boolean;
  preferences: boolean;
  analytics: boolean;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  preferences: true,
  analytics: false,
};

function readConsent(): CookiePreferences | null {
  const raw = Cookies.get('nd_cookie_consent');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CookiePreferences;
  } catch {
    return null;
  }
}

function saveConsent(prefs: CookiePreferences) {
  Cookies.set('nd_cookie_consent', JSON.stringify(prefs), { expires: 365 });
}

const toggles: {
  key: keyof CookiePreferences;
  labelKey: string;
  descriptionKey: string;
  locked: boolean;
}[] = [
  {
    key: 'essential',
    labelKey: 'cookies.essential',
    descriptionKey: 'cookies.essentialDesc',
    locked: true,
  },
  {
    key: 'preferences',
    labelKey: 'cookies.preference',
    descriptionKey: 'cookies.preferenceDesc',
    locked: false,
  },
  {
    key: 'analytics',
    labelKey: 'cookies.analyticsLabel',
    descriptionKey: 'cookies.analyticsDesc',
    locked: false,
  },
];

export function CookieConsentBanner() {
  const { t } = useTranslation();
  const [consented, setConsented] = useState(() => readConsent() !== null);
  const [showModal, setShowModal] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  const acceptAll = useCallback(() => {
    const all: CookiePreferences = {
      essential: true,
      preferences: true,
      analytics: true,
    };
    saveConsent(all);
    setConsented(true);
  }, []);

  const savePreferences = useCallback(() => {
    saveConsent({ ...prefs, essential: true });
    setShowModal(false);
    setConsented(true);
  }, [prefs]);

  if (consented) return null;

  return (
    <>
      <AnimatePresence>
        {!consented && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-navy/10 bg-white p-4 shadow-lg dark:border-white/10 dark:bg-slate-navy"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-warm-gray dark:text-white/70">
                {t('cookies.bannerMessage')}
              </p>
              <div className="flex shrink-0 gap-2">
                <Button variant="primary" size="sm" onClick={acceptAll}>
                  {t('cookies.acceptAll')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModal(true)}
                >
                  {t('cookies.customize')}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t('cookies.preferencesTitle')}
        onConfirm={savePreferences}
        confirmText={t('cookies.savePreferences')}
      >
        <div className="space-y-5">
          {toggles.map((toggle) => (
            <div
              key={toggle.key}
              className="flex items-start justify-between gap-4"
            >
              <div>
                <p className="text-sm font-medium text-slate-navy dark:text-white">
                  {t(toggle.labelKey)}
                </p>
                <p className="text-xs text-warm-gray dark:text-white/60">
                  {t(toggle.descriptionKey)}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[toggle.key]}
                disabled={toggle.locked}
                onClick={() =>
                  setPrefs((p) => ({ ...p, [toggle.key]: !p[toggle.key] }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-golden-honey/50 disabled:cursor-not-allowed disabled:opacity-70 ${
                  prefs[toggle.key] ? 'bg-golden-honey' : 'bg-slate-navy/20 dark:bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    prefs[toggle.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
