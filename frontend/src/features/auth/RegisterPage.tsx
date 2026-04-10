import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Check, X } from 'lucide-react';
import { useGoogleLogin } from '../../hooks/useGoogleLogin';
import type { AuthResponse } from '../../types/auth';
import logoSymbol from '../../assets/favicon.png';
import {
  CURRENCY_OPTIONS,
  getStoredUserPreferences,
  LANGUAGE_OPTIONS,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
} from '../../lib/userPreferences';

const createRegisterSchema = (t: (key: string) => string) => z
  .object({
    email: z.string().email(t('auth.emailInvalid')),
    displayName: z.string().min(2, t('auth.displayNameMin')),
    phoneNumber: z.string().min(7, 'Phone number is required'),
    preferredLanguage: z.enum(SUPPORTED_LANGUAGES),
    preferredCurrency: z.enum(SUPPORTED_CURRENCIES),
    password: z
      .string()
      .min(16, t('auth.passwordMin')),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: t('auth.passwordsMismatch'),
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<ReturnType<typeof createRegisterSchema>>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const storedPreferences = getStoredUserPreferences();
  const selectClass = 'rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white';
  const registerSchema = createRegisterSchema(t);
  const requirements = [
    { label: t('auth.passwordLength'), test: (v: string) => v.length >= 16 },
  ];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      preferredLanguage: storedPreferences.preferredLanguage as RegisterForm['preferredLanguage'],
      preferredCurrency: storedPreferences.preferredCurrency as RegisterForm['preferredCurrency'],
    },
  });

  const passwordValue = watch('password', '');
  const preferredLanguage = watch('preferredLanguage');
  const preferredCurrency = watch('preferredCurrency');

  const handleGoogleCredential = async (credential: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/api/auth/google', {
        credential,
        preferredLanguage,
        preferredCurrency,
      });
      login(res.token, {
        email: res.email,
        displayName: res.displayName,
        role: res.role,
        has2fa: false,
        preferredLanguage: res.preferredLanguage,
        preferredCurrency: res.preferredCurrency,
      });
      navigate(redirectTo || (res.role === 'Donor' ? '/app/donate' : '/admin'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.googleSignUpFailed'));
    } finally {
      setLoading(false);
    }
  };

  useGoogleLogin({
    onCredential: handleGoogleCredential,
    buttonElementId: 'google-signup-btn',
    buttonText: 'signup_with',
  });

  const onRegister = async (data: RegisterForm) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/api/auth/register', {
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        phoneNumber: data.phoneNumber,
        preferredLanguage: data.preferredLanguage,
        preferredCurrency: data.preferredCurrency,
      });
      login(res.token, {
        email: res.email,
        displayName: res.displayName,
        role: res.role,
        has2fa: false,
        preferredLanguage: res.preferredLanguage,
        preferredCurrency: res.preferredCurrency,
      });
      navigate(redirectTo || (res.role === 'Donor' ? '/app/donate' : '/admin'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <img src={logoSymbol} alt={t('brand.newDawn')} className="h-14 w-14" />
        </div>

        <form onSubmit={handleSubmit(onRegister)} className="flex flex-col gap-4">
          <h2 className="text-center font-heading text-xl font-bold text-slate-navy dark:text-white">
            {t('auth.createAccount')}
          </h2>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <Input
            label={t('auth.email')}
            type="email"
            placeholder={t('auth.emailPlaceholder')}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label={t('auth.displayName')}
            type="text"
            placeholder={t('auth.displayNamePlaceholder')}
            error={errors.displayName?.message}
            {...register('displayName')}
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="09xx xxx xxxx"
            error={errors.phoneNumber?.message}
            {...register('phoneNumber')}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="preferredLanguage" className="text-sm font-medium text-slate-navy dark:text-white">
                {t('auth.language')}
              </label>
              <select id="preferredLanguage" className={selectClass} {...register('preferredLanguage')}>
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errors.preferredLanguage && <p className="text-xs text-red-600">{errors.preferredLanguage.message}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="preferredCurrency" className="text-sm font-medium text-slate-navy dark:text-white">
                {t('auth.currency')}
              </label>
              <select id="preferredCurrency" className={selectClass} {...register('preferredCurrency')}>
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errors.preferredCurrency && <p className="text-xs text-red-600">{errors.preferredCurrency.message}</p>}
            </div>
          </div>

          <Input
            label={t('auth.password')}
            type="password"
            placeholder={t('auth.createPassword')}
            error={errors.password?.message}
            {...register('password')}
          />

          {/* Password requirements */}
          <div className="rounded-lg bg-slate-navy/5 p-3 dark:bg-white/5">
            <p className="mb-2 text-xs font-medium text-warm-gray">
              {t('auth.passwordRequirements')}
            </p>
            <ul className="space-y-1">
              {requirements.map((req) => {
                const met = req.test(passwordValue);
                return (
                  <li
                    key={req.label}
                    className={`flex items-center gap-2 text-xs ${met ? 'text-sage-green-text dark:text-sage-green' : 'text-warm-gray'}`}
                  >
                    {met ? <Check size={12} /> : <X size={12} />}
                    {req.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <Input
            label={t('auth.confirmPassword')}
            type="password"
            placeholder={t('auth.confirmPasswordPlaceholder')}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button type="submit" loading={loading} className="w-full">
            {t('auth.createAccount')}
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-navy/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-warm-gray dark:bg-slate-navy">
                {t('auth.orSignUpWith')}
              </span>
            </div>
          </div>

          <div id="google-signup-btn" className="mx-auto flex w-full max-w-[280px] justify-center" />

          <p className="text-center text-sm text-warm-gray">
            {t('auth.hasAccount')}{' '}
            <Link
              to="/login"
              className="font-medium text-sky-blue-text dark:text-sky-blue hover:underline"
            >
              {t('auth.signIn')}
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
