import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { User, Shield, Mail, KeyRound } from 'lucide-react';
import { api } from '../../lib/api';

export function ProfilePage() {
  const { user, setUser } = useAuthStore();
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
          <div className="space-y-4">
            <p className="text-sm text-warm-gray dark:text-white/60">
              Scan this code with your authenticator app (Google Authenticator, Authy, etc.):
            </p>
            <div className="rounded-lg bg-slate-navy/5 p-4 dark:bg-white/5">
              <p className="text-xs font-mono text-warm-gray dark:text-white/60 break-all">
                {mfaSetup.sharedKey}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-navy dark:text-white">
                Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-40 rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-center text-lg tracking-widest dark:border-white/20 dark:bg-slate-navy dark:text-white"
              />
            </div>
            {mfaError && (
              <p className="text-sm text-red-600">{mfaError}</p>
            )}
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
