import { useState } from 'react';
import QRCodeLib from 'react-qr-code';
// react-qr-code CJS build exports the component as .QRCode, not as the default
const QRCode = (QRCodeLib as any).QRCode ?? QRCodeLib;
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore, type ThemeMode } from '../../stores/themeStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { User, Shield, Mail, KeyRound, Smartphone, ScanLine, CheckCircle2, KeySquare } from 'lucide-react';
import { api } from '../../lib/api';

export function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { mode, setMode } = useThemeStore();
  const [mfaSetup, setMfaSetup] = useState<{ sharedKey: string; authenticatorUri: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [disabling, setDisabling] = useState(false);

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
            Theme Mode
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
              <option value="auto">Auto</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </Card>

      {/* MFA Section */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <KeyRound size={20} className="text-slate-navy dark:text-white" />
          <h2 className="text-lg font-semibold text-slate-navy dark:text-white">
            Multi-Factor Authentication
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
            {/* Step-by-step instructions */}
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-golden-honey/20 text-xs font-bold text-golden-honey">1</span>
                <div>
                  <p className="text-sm font-medium text-slate-navy dark:text-white flex items-center gap-1">
                    <Smartphone size={14} /> Download an authenticator app
                  </p>
                  <p className="text-xs text-warm-gray dark:text-white/60 mt-0.5">
                    Google Authenticator, Authy, or Microsoft Authenticator all work. Install one from your app store if you don't have one.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-golden-honey/20 text-xs font-bold text-golden-honey">2</span>
                <div>
                  <p className="text-sm font-medium text-slate-navy dark:text-white flex items-center gap-1">
                    <ScanLine size={14} /> Scan the QR code
                  </p>
                  <p className="text-xs text-warm-gray dark:text-white/60 mt-0.5">
                    Open your app, tap <strong>+</strong> or <strong>Add account</strong>, then choose <strong>Scan QR code</strong> and point your camera at the code below.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-golden-honey/20 text-xs font-bold text-golden-honey">3</span>
                <div>
                  <p className="text-sm font-medium text-slate-navy dark:text-white flex items-center gap-1">
                    <CheckCircle2 size={14} /> Enter the 6-digit code
                  </p>
                  <p className="text-xs text-warm-gray dark:text-white/60 mt-0.5">
                    Your app will display a rotating 6-digit code. Type it in the field below and click <strong>Verify &amp; Enable</strong>.
                  </p>
                </div>
              </li>
            </ol>

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
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-navy dark:text-white">
                Verification Code
              </label>
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

            {mfaError && <p className="text-sm text-red-600">{mfaError}</p>}

            <div className="flex gap-3">
              <Button variant="primary" size="sm" onClick={handleEnableMfa} disabled={mfaLoading}>
                {mfaLoading ? 'Verifying...' : 'Verify & Enable'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setMfaSetup(null); setMfaCode(''); setMfaError(''); }}>
                Cancel
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
              Add an extra layer of security to your account with authenticator-based MFA.
            </p>
            {mfaError && (
              <p className="mb-3 text-sm text-red-600">{mfaError}</p>
            )}
            <Button variant="primary" size="sm" onClick={handleSetupMfa} disabled={mfaLoading}>
              {mfaLoading ? 'Setting up...' : 'Enable MFA'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
