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
        className={`rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/40' : ''} ${className}`}
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
