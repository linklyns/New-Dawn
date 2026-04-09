import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<string, string> = {
  primary:
    'border border-golden-honey/60 bg-linear-to-r from-golden-honey via-[#ffd77f] to-[#ffc95f] text-slate-navy shadow-[0_10px_24px_rgba(255,204,102,0.28)] hover:brightness-[1.03] focus:ring-golden-honey/50 dark:border-golden-honey/20 dark:bg-golden-honey dark:shadow-none',
  secondary:
    'border border-sky-blue/50 bg-linear-to-r from-sky-blue/90 to-sage-green/70 text-slate-navy shadow-[0_10px_24px_rgba(145,177,145,0.18)] hover:brightness-[1.03] focus:ring-sky-blue/50 dark:border-sky-blue/18 dark:bg-sky-blue/85 dark:shadow-none',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/50',
  ghost:
    'border border-transparent bg-white/55 text-slate-navy hover:border-sky-blue/25 hover:bg-sky-blue/12 focus:ring-sky-blue/30 dark:bg-white/[0.04] dark:text-white dark:hover:border-white/8 dark:hover:bg-white/[0.08]',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[background-color,border-color,box-shadow,filter] duration-200 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
