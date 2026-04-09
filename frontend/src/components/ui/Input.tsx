import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className = '', required, ...rest }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-slate-navy dark:text-white"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`rounded-xl border border-slate-navy/15 bg-white/78 px-3 py-2 text-sm text-slate-navy placeholder:text-warm-gray/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/35 dark:border-white/10 dark:bg-[#16212b] dark:text-white dark:placeholder:text-white/45 dark:shadow-none ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/40' : ''} ${className}`}
        aria-describedby={errorId}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        required={required}
        {...rest}
      />
      {error && <p id={errorId} className="text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
