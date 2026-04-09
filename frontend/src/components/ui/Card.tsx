import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/70 bg-white p-6 shadow-[0_18px_45px_rgba(45,58,74,0.08)] backdrop-blur-sm dark:border-white/10 dark:bg-dark-surface dark:shadow-sm ${onClick ? 'cursor-pointer transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-sky-blue/30 hover:shadow-[0_24px_48px_rgba(46,125,155,0.14)] dark:hover:border-white/15 dark:hover:shadow-md' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
