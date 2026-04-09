import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useGoogleLogin } from '../../hooks/useGoogleLogin';
import type { AuthResponse } from '../../types/auth';
import logo from '../../assets/logo.png';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const mfaSchema = z.object({
  code: z.string().min(6, 'Enter your 6-digit code').max(6),
});

type MfaForm = z.infer<typeof mfaSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const handleGoogleCredential = async (credential: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/api/auth/google', { credential });
      if (res.requiresMfa) {
        setPendingEmail(res.email);
        setMfaRequired(true);
      } else {
        login(res.token, {
          email: res.email,
          displayName: res.displayName,
          role: res.role,
          has2fa: false,
        });
        navigate('/admin');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  useGoogleLogin({
    onCredential: handleGoogleCredential,
    buttonElementId: 'google-signin-btn',
    buttonText: 'signin_with',
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const {
    register: registerMfa,
    handleSubmit: handleMfaSubmit,
    formState: { errors: mfaErrors },
  } = useForm<MfaForm>({ resolver: zodResolver(mfaSchema) });

  const onLogin = async (data: LoginForm) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/api/auth/login', data);
      if (res.requiresMfa) {
        setPendingEmail(res.email);
        setMfaRequired(true);
      } else {
        login(res.token, {
          email: res.email,
          displayName: res.displayName,
          role: res.role,
          has2fa: false,
        });
        navigate(res.role === 'Donor' ? '/admin/donate' : '/admin');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onMfaVerify = async (data: MfaForm) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/api/auth/mfa/verify', {
        email: pendingEmail,
        code: data.code,
      });
      login(res.token, {
        email: res.email,
        displayName: res.displayName,
        role: res.role,
        has2fa: true,
      });
      navigate(res.role === 'Donor' ? '/admin/donate' : '/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <img src={logo} alt="New Dawn - A Path to Healing and Hope" className="h-16" />
        </div>

        {!mfaRequired ? (
          <form onSubmit={handleSubmit(onLogin)} className="flex flex-col gap-4">
            <h2 className="text-center font-heading text-xl font-bold text-slate-navy dark:text-white">
              Sign In
            </h2>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" loading={loading} className="w-full">
              Sign In
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-navy/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-warm-gray dark:bg-slate-navy">
                  Or continue with
                </span>
              </div>
            </div>

            <div id="google-signin-btn" className="flex justify-center" />

            <p className="text-center text-sm text-warm-gray">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-sky-blue-text dark:text-sky-blue hover:underline"
              >
                Register
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit(onMfaVerify)} className="flex flex-col gap-4">
            <h2 className="text-center font-heading text-xl font-bold text-slate-navy dark:text-white">
              Two-Factor Authentication
            </h2>
            <p className="text-center text-sm text-warm-gray">
              Enter the 6-digit code from your authenticator app.
            </p>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <Input
              label="Code"
              type="text"
              placeholder="000000"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              error={mfaErrors.code?.message}
              {...registerMfa('code', { value: '' })}
            />

            <Button type="submit" loading={loading} className="w-full">
              Verify
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
