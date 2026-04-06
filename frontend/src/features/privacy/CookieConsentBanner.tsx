import { useState, useCallback } from 'react';
import Cookies from 'js-cookie';
import { AnimatePresence, motion } from 'framer-motion';
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
  label: string;
  description: string;
  locked: boolean;
}[] = [
  {
    key: 'essential',
    label: 'Essential Cookies',
    description: 'Required for the website to function.',
    locked: true,
  },
  {
    key: 'preferences',
    label: 'Preference Cookies',
    description: 'Remembers your settings like dark/light mode.',
    locked: false,
  },
  {
    key: 'analytics',
    label: 'Analytics Cookies',
    description: 'Helps us understand how visitors use our site.',
    locked: false,
  },
];

export function CookieConsentBanner() {
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
                We use cookies to enhance your experience. We use a functional
                cookie to remember your theme preference.
              </p>
              <div className="flex shrink-0 gap-2">
                <Button variant="primary" size="sm" onClick={acceptAll}>
                  Accept All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModal(true)}
                >
                  Manage Preferences
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Cookie Preferences"
        onConfirm={savePreferences}
        confirmText="Save Preferences"
      >
        <div className="space-y-5">
          {toggles.map((t) => (
            <div
              key={t.key}
              className="flex items-start justify-between gap-4"
            >
              <div>
                <p className="text-sm font-medium text-slate-navy dark:text-white">
                  {t.label}
                </p>
                <p className="text-xs text-warm-gray dark:text-white/60">
                  {t.description}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[t.key]}
                disabled={t.locked}
                onClick={() =>
                  setPrefs((p) => ({ ...p, [t.key]: !p[t.key] }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-golden-honey/50 disabled:cursor-not-allowed disabled:opacity-70 ${
                  prefs[t.key] ? 'bg-golden-honey' : 'bg-slate-navy/20 dark:bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    prefs[t.key] ? 'translate-x-6' : 'translate-x-1'
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
