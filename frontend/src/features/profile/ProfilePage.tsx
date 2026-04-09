import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import QRCodeLib from 'react-qr-code';
// react-qr-code CJS build exports the component as .QRCode, not as the default
const QRCode = (QRCodeLib as any).QRCode ?? QRCodeLib;
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore, type ThemeMode } from '../../stores/themeStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { User, Shield, Mail, KeyRound, Smartphone, ScanLine, CheckCircle2, KeySquare } from 'lucide-react';
import { api } from '../../lib/api';
import { CURRENCY_OPTIONS, LANGUAGE_OPTIONS, SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES } from '../../lib/userPreferences';

/* ── Brand SVG logos (20×20) ────────────────────────────────── */
const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" className="shrink-0">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.06 24.06 0 0 0 0 21.56l7.98-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const MicrosoftLogo = () => (
  <svg width="20" height="20" viewBox="0 0 21 21" className="shrink-0">
    <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
  </svg>
);

const AppleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 384 512" className="shrink-0 text-slate-navy dark:text-white" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-62.1 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
  </svg>
);

const AuthyLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
    <circle cx="12" cy="12" r="11" fill="#EC1C24"/>
    <path d="M12 5.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm0 10.5a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" fill="#fff"/>
  </svg>
);

const OnePasswordLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
    <rect width="24" height="24" rx="5" fill="#0572EC"/>
    <text x="12" y="17" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#fff" fontFamily="system-ui">1</text>
  </svg>
);

const BitwardenLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
    <path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v3.8c0 7.3 4.2 12.4 9.7 14.6a.8.8 0 0 0 .6 0C17.8 19.7 22 14.6 22 7.3V3.5A1.5 1.5 0 0 0 20.5 2h-17z" fill="#175DDC"/>
    <path d="M5.5 4.5h13a.5.5 0 0 1 .5.5v2.3c0 5.8-3.3 10-7.5 11.9a.3.3 0 0 1-.3 0C7.8 17.3 5 13.1 5 7.3V5a.5.5 0 0 1 .5-.5z" fill="#fff" fillOpacity=".25"/>
  </svg>
);

type AuthApp = 'google' | 'microsoft' | 'apple' | 'authy' | 'onepassword' | 'bitwarden' | null;

const appInstructions: Record<Exclude<AuthApp, null>, { name: string; logo: ReactNode; steps: string[] }> = {
  google: {
    name: 'Google Authenticator',
    logo: <GoogleLogo />,
    steps: [
      'Open Google Authenticator on your phone.',
      'Tap the colored "+" button in the bottom-right corner.',
      'Select "Scan a QR code" and point your camera at the code below.',
      'The app will add a "New Dawn" entry automatically — you\'ll see a 6-digit code that refreshes every 30 seconds.',
      'Type that 6-digit code into the verification field below and tap Verify & Enable.',
    ],
  },
  microsoft: {
    name: 'Microsoft Authenticator',
    logo: <MicrosoftLogo />,
    steps: [
      'Open Microsoft Authenticator on your phone.',
      'Tap the "+" icon at the top-right, then choose "Other account" (not personal or work).',
      'The camera will open — point it at the QR code below.',
      'A "New Dawn" entry will appear in your account list showing a 6-digit code that refreshes every 30 seconds.',
      'Type that 6-digit code into the verification field below and tap Verify & Enable.',
    ],
  },
  apple: {
    name: 'Apple Passwords',
    logo: <AppleLogo />,
    steps: [
      'On your iPhone, go to Settings → Passwords (or open the Passwords app on iOS 18+/macOS Sequoia+).',
      'Find the New Dawn entry, or tap "+" to create one — enter the website and your login info.',
      'Tap the entry, then tap "Set Up Verification Code…".',
      'Choose "Scan QR Code" and point your camera at the code below (or tap "Enter Setup Key" and paste the manual key).',
      'A 6-digit code will appear under "Verification Code" — type it into the field below and tap Verify & Enable.',
    ],
  },
  authy: {
    name: 'Authy',
    logo: <AuthyLogo />,
    steps: [
      'Open Authy on your phone (or desktop app).',
      'Tap the "⋮" menu or "+" button, then tap "Add Account".',
      'Choose "Scan QR Code" and point your camera at the code below.',
      'Give the account a name like "New Dawn" and pick an icon, then tap Save.',
      'Authy will show a 6-digit code that refreshes every 30 seconds — type it into the verification field below and tap Verify & Enable.',
    ],
  },
  onepassword: {
    name: '1Password',
    logo: <OnePasswordLogo />,
    steps: [
      'Open 1Password on your phone or computer.',
      'Find your New Dawn login entry (or create one with "+" → Login).',
      'Tap "Edit", then scroll down and tap "Add More" → "One-Time Password".',
      'A camera will open — scan the QR code below. (Or paste the manual key into the field.)',
      '1Password will show a rotating 6-digit code — type it into the verification field below and tap Verify & Enable.',
    ],
  },
  bitwarden: {
    name: 'Bitwarden',
    logo: <BitwardenLogo />,
    steps: [
      'Open Bitwarden on your phone or computer.',
      'Find your New Dawn login entry (or create one with "+").',
      'Tap "Edit", scroll to "Authenticator Key (TOTP)" and tap the camera icon.',
      'Scan the QR code below. (Or tap the field and paste the manual key from the section below the QR code.)',
      'Save the entry — Bitwarden will now show a rotating 6-digit code. Type it into the verification field below and tap Verify & Enable.',
    ],
  },
};

const preferencesSchema = z.object({
  preferredLanguage: z.enum(SUPPORTED_LANGUAGES),
  preferredCurrency: z.enum(SUPPORTED_CURRENCIES),
});

type PreferencesForm = z.infer<typeof preferencesSchema>;

export function ProfilePage() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const { mode, setMode } = useThemeStore();
  const [mfaSetup, setMfaSetup] = useState<{ sharedKey: string; authenticatorUri: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AuthApp>(null);
  const [preferencesError, setPreferencesError] = useState('');
  const [preferencesSuccess, setPreferencesSuccess] = useState('');
  const [preferencesSaving, setPreferencesSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PreferencesForm>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      preferredLanguage: (user?.preferredLanguage ?? LANGUAGE_OPTIONS[0].value) as PreferencesForm['preferredLanguage'],
      preferredCurrency: (user?.preferredCurrency ?? CURRENCY_OPTIONS[0].value) as PreferencesForm['preferredCurrency'],
    },
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    reset({
      preferredLanguage: user.preferredLanguage as PreferencesForm['preferredLanguage'],
      preferredCurrency: user.preferredCurrency as PreferencesForm['preferredCurrency'],
    });
  }, [reset, user]);

  const handleSetupMfa = async () => {
    setMfaLoading(true);
    setMfaError('');
    try {
      const data = await api.post<{ sharedKey: string; authenticatorUri: string }>('/api/auth/mfa/setup', {});
      setMfaSetup(data);
    } catch {
      setMfaError('Failed to initialize MFA setup.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleEnableMfa = async () => {
    if (mfaCode.length !== 6) {
      setMfaError('Enter a 6-digit code.');
      return;
    }
    setMfaLoading(true);
    setMfaError('');
    try {
      await api.post('/api/auth/mfa/enable', { code: mfaCode });
      setUser({ ...user!, has2fa: true });
      setMfaSetup(null);
      setMfaCode('');
    } catch {
      setMfaError('Invalid code. Please try again.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    setDisabling(true);
    setMfaError('');
    try {
      await api.post('/api/auth/mfa/disable', {});
      setUser({ ...user!, has2fa: false });
    } catch {
      setMfaError('Failed to disable MFA.');
    } finally {
      setDisabling(false);
    }
  };

  const handleSavePreferences = handleSubmit(async (values) => {
    if (!user) {
      return;
    }

    setPreferencesSaving(true);
    setPreferencesError('');
    setPreferencesSuccess('');

    try {
      const response = await api.put<{ data: PreferencesForm }>('/api/auth/preferences', values);
      setUser({
        ...user,
        preferredLanguage: response.data.preferredLanguage,
        preferredCurrency: response.data.preferredCurrency,
      });
      setPreferencesSuccess('Preferences updated.');
    } catch (error) {
      setPreferencesError(error instanceof Error ? error.message : 'Unable to update preferences.');
    } finally {
      setPreferencesSaving(false);
    }
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-heading text-2xl font-bold text-slate-navy dark:text-white">
        My Profile
      </h1>

      {/* User Info */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-blue/20 text-sky-blue">
            <User size={28} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-navy dark:text-white">
              {user.displayName}
            </h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-warm-gray dark:text-white/60">
              <Mail size={14} />
              {user.email}
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-warm-gray dark:text-white/60">
              <Shield size={14} />
              <span className="capitalize">{user.role}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Theme Mode */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <KeyRound size={20} className="text-slate-navy dark:text-white" />
          <h2 className="text-lg font-semibold text-slate-navy dark:text-white">
            {t('profile.theme')}
          </h2>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-warm-gray dark:text-white/60">
            Choose whether the app follows your system preference, always stays light, or always stays dark.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="text-sm font-medium text-slate-navy dark:text-white">Appearance</label>
            <select
              className="max-w-xs rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white"
              value={mode}
              onChange={(e) => setMode(e.target.value as ThemeMode)}
            >
              <option value="auto">{t('profile.system')}</option>
              <option value="light">{t('profile.light')}</option>
              <option value="dark">{t('profile.dark')}</option>
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <form className="space-y-4" onSubmit={handleSavePreferences}>
          <div className="flex items-center gap-3">
            <User size={20} className="text-slate-navy dark:text-white" />
            <h2 className="text-lg font-semibold text-slate-navy dark:text-white">
              {t('profile.preferences')}
            </h2>
          </div>

          <p className="text-sm text-warm-gray dark:text-white/60">
            These preferences are saved to your account and mirrored into browser cookies so the frontend can apply them immediately.
          </p>

          {preferencesError && <p className="text-sm text-red-600">{preferencesError}</p>}
          {preferencesSuccess && <p className="text-sm text-sage-green-text dark:text-sage-green">{preferencesSuccess}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="profile-preferred-language" className="text-sm font-medium text-slate-navy dark:text-white">
                {t('profile.language')}
              </label>
              <select
                id="profile-preferred-language"
                className="rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white"
                {...register('preferredLanguage')}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errors.preferredLanguage && <p className="text-xs text-red-600">{errors.preferredLanguage.message}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="profile-preferred-currency" className="text-sm font-medium text-slate-navy dark:text-white">
                {t('profile.currency')}
              </label>
              <select
                id="profile-preferred-currency"
                className="rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white"
                {...register('preferredCurrency')}
              >
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errors.preferredCurrency && <p className="text-xs text-red-600">{errors.preferredCurrency.message}</p>}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!isDirty || preferencesSaving}>
              {preferencesSaving ? 'Saving...' : t('profile.savePreferences')}
            </Button>
          </div>
        </form>
      </Card>

      {/* MFA Section */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <KeyRound size={20} className="text-slate-navy dark:text-white" />
          <h2 className="text-lg font-semibold text-slate-navy dark:text-white">
            {t('profile.twoFactorAuth')}
          </h2>
        </div>

        {user.has2fa ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-sage-green/20 px-3 py-1 text-sm font-medium text-sage-green">
                <Shield size={14} /> Enabled
              </span>
            </div>
            <p className="text-sm text-warm-gray dark:text-white/60 mb-4">
              Your account is protected with authenticator-based two-factor authentication.
            </p>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDisableMfa}
              disabled={disabling}
            >
              {disabling ? 'Disabling...' : 'Disable MFA'}
            </Button>
          </div>
        ) : mfaSetup ? (
          <div className="space-y-5">
            {/* Step 1: Choose your app */}
            <div>
              <div className="flex items-start gap-3 mb-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-golden-honey/20 text-xs font-bold text-golden-honey">1</span>
                <div>
                  <p className="text-sm font-medium text-slate-navy dark:text-white flex items-center gap-1">
                    <Smartphone size={14} /> Choose your authenticator app
                  </p>
                  <p className="text-xs text-warm-gray dark:text-white/60 mt-0.5">
                    Select the app you have (or will install). We'll show you exactly what to do.
                  </p>
                </div>
              </div>

              <div className="ml-9 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(appInstructions) as Exclude<AuthApp, null>[]).map((key) => {
                  const app = appInstructions[key];
                  const isSelected = selectedApp === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedApp(isSelected ? null : key)}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all ${
                        isSelected
                          ? 'border-golden-honey bg-golden-honey/10 text-slate-navy dark:text-white ring-2 ring-golden-honey/40'
                          : 'border-slate-navy/15 bg-white text-warm-gray hover:border-golden-honey/50 hover:bg-golden-honey/5 dark:border-white/15 dark:bg-slate-navy/40 dark:text-white/70 dark:hover:border-golden-honey/50'
                      }`}
                    >
                      {app.logo}
                      <span className="text-xs font-medium leading-tight">{app.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* App-specific instructions */}
              {selectedApp && (
                <div className="ml-9 mt-3 rounded-lg border border-golden-honey/20 bg-golden-honey/5 p-4 dark:border-golden-honey/15 dark:bg-golden-honey/5">
                  <p className="text-sm font-semibold text-slate-navy dark:text-white mb-2 flex items-center gap-2">
                    {appInstructions[selectedApp].logo} {appInstructions[selectedApp].name} — Step by step
                  </p>
                  <ol className="space-y-1.5">
                    {appInstructions[selectedApp].steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-navy/80 dark:text-white/70">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-golden-honey/20 text-xs font-bold text-golden-honey">
                          {String.fromCharCode(97 + i)}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Step 2: QR Code */}
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-golden-honey/20 text-xs font-bold text-golden-honey">2</span>
              <p className="text-sm font-medium text-slate-navy dark:text-white flex items-center gap-1">
                <ScanLine size={14} /> Scan the QR code below with your app
              </p>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-navy/10 bg-white p-5 dark:border-white/10 dark:bg-slate-navy/40">
              <p className="text-xs font-medium text-slate-navy dark:text-white flex items-center gap-1">
                <ScanLine size={13} /> Scan with your authenticator app
              </p>
              <div className="rounded-lg bg-white p-3 shadow-sm">
                <QRCode value={mfaSetup.authenticatorUri} size={180} />
              </div>
            </div>

            {/* Manual fallback */}
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-1 text-xs text-warm-gray hover:text-slate-navy dark:text-white/60 dark:hover:text-white">
                <KeySquare size={13} />
                Can't scan the QR code? Enter the key manually
              </summary>
              <div className="mt-2 rounded-lg bg-slate-navy/5 p-3 dark:bg-white/5">
                <p className="mb-1 text-xs text-warm-gray dark:text-white/50">In your app, choose "Enter setup key" and type:</p>
                <p className="font-mono text-sm tracking-widest text-slate-navy dark:text-white break-all">
                  {mfaSetup.sharedKey}
                </p>
              </div>
            </details>

            {/* Code entry */}
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-golden-honey/20 text-xs font-bold text-golden-honey">3</span>
              <div>
                <p className="text-sm font-medium text-slate-navy dark:text-white flex items-center gap-1 mb-2">
                  <CheckCircle2 size={14} /> Enter the 6-digit code from your app
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  autoComplete="one-time-code"
                  className="w-40 rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-center text-lg tracking-widest focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white"
                />
              </div>
            </div>

            {mfaError && <p className="text-sm text-red-600">{mfaError}</p>}

            <div className="flex gap-3">
              <Button variant="primary" size="sm" onClick={handleEnableMfa} disabled={mfaLoading}>
                {mfaLoading ? 'Verifying...' : 'Verify & Enable'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setMfaSetup(null); setMfaCode(''); setMfaError(''); setSelectedApp(null); }}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-golden-honey/20 px-3 py-1 text-sm font-medium text-golden-honey">
                Disabled
              </span>
            </div>
            <p className="text-sm text-warm-gray dark:text-white/60 mb-4">
              {t('profile.enableTwoFactor')}
            </p>
            {mfaError && (
              <p className="mb-3 text-sm text-red-600">{mfaError}</p>
            )}
            <Button variant="primary" size="sm" onClick={handleSetupMfa} disabled={mfaLoading}>
              {mfaLoading ? 'Setting up...' : t('profile.setupTwoFactor')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
