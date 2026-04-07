import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: ReactNode;
}

const variantClasses: Record<string, string> = {
  success: 'bg-sage-green/20 text-sage-green-text dark:text-sage-green',
  warning: 'bg-golden-honey/20 text-golden-honey-text dark:text-golden-honey',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-sky-blue/20 text-sky-blue-text dark:text-sky-blue',
  neutral: 'bg-warm-gray/15 text-warm-gray dark:text-white/70',
};

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
