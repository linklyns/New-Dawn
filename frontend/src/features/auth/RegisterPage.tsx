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
import { Check, X } from 'lucide-react';
import type { AuthResponse } from '../../types/auth';
import logo from '../../assets/logo.png';

const registerSchema = z
  .object({
    email: z.string().email('Please enter a valid email'),
    displayName: z.string().min(2, 'Display name must be at least 2 characters'),
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a digit')
      .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const requirements = [
  { label: 'At least 10 characters', test: (v: string) => v.length >= 10 },
  { label: 'Uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'Digit', test: (v: string) => /[0-9]/.test(v) },
  { label: 'Special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
  {
    label: '4 unique characters',
    test: (v: string) => new Set(v).size >= 4,
  },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const passwordValue = watch('password', '');

  const onRegister = async (data: RegisterForm) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/api/auth/register', {
        email: data.email,
        password: data.password,
        displayName: data.displayName,
      });
      login(res.token, {
        email: res.email,
        displayName: res.displayName,
        role: res.role,
        has2fa: false,
      });
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <img src={logo} alt="New Dawn - A Path to Healing and Hope" className="h-16" />
        </div>

        <form onSubmit={handleSubmit(onRegister)} className="flex flex-col gap-4">
          <h2 className="text-center font-heading text-xl font-bold text-slate-navy dark:text-white">
            Create Account
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
            label="Display Name"
            type="text"
            placeholder="Your name"
            error={errors.displayName?.message}
            {...register('displayName')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Create a password"
            error={errors.password?.message}
            {...register('password')}
          />

          {/* Password requirements */}
          <div className="rounded-lg bg-slate-navy/5 p-3 dark:bg-white/5">
            <p className="mb-2 text-xs font-medium text-warm-gray">
              Password Requirements
            </p>
            <ul className="space-y-1">
              {requirements.map((req) => {
                const met = req.test(passwordValue);
                return (
                  <li
                    key={req.label}
                    className={`flex items-center gap-2 text-xs ${met ? 'text-sage-green' : 'text-warm-gray'}`}
                  >
                    {met ? <Check size={12} /> : <X size={12} />}
                    {req.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button type="submit" loading={loading} className="w-full">
            Create Account
          </Button>

          <p className="text-center text-sm text-warm-gray">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-sky-blue hover:underline"
            >
              Sign In
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
