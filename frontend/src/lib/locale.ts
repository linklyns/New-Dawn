import {
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE,
  getStoredUserPreferences,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  type SupportedCurrency,
  type SupportedLanguage,
  type UserPreferences,
} from './userPreferences';
import { convertFromPhp } from './exchangeRates';

export const LANGUAGE_TO_LOCALE: Record<SupportedLanguage, string> = {
  en: 'en-PH',
  fil: 'fil-PH',
  ceb: 'ceb-PH',
};

export function resolvePreferredLanguage(value?: string | null): SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes((value ?? '').trim().toLowerCase() as SupportedLanguage)
    ? (value ?? '').trim().toLowerCase() as SupportedLanguage
    : DEFAULT_LANGUAGE;
}

export function resolvePreferredCurrency(value?: string | null): SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes((value ?? '').trim().toUpperCase() as SupportedCurrency)
    ? (value ?? '').trim().toUpperCase() as SupportedCurrency
    : DEFAULT_CURRENCY;
}

export function resolveUserPreferences(preferences?: Partial<UserPreferences> | null): UserPreferences {
  const stored = getStoredUserPreferences();

  return {
    preferredLanguage: resolvePreferredLanguage(preferences?.preferredLanguage ?? stored.preferredLanguage),
    preferredCurrency: resolvePreferredCurrency(preferences?.preferredCurrency ?? stored.preferredCurrency),
  };
}

export function resolveLocale(preferredLanguage?: string | null): string {
  return LANGUAGE_TO_LOCALE[resolvePreferredLanguage(preferredLanguage)];
}

type FormatterPreferences = Partial<UserPreferences> | null | undefined;

function getFormatterPreferences(preferences?: FormatterPreferences): UserPreferences {
  return resolveUserPreferences(preferences);
}

export function formatLocalizedNumber(
  value: number,
  preferences?: FormatterPreferences,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(resolveLocale(getFormatterPreferences(preferences).preferredLanguage), options).format(value);
}

export function formatLocalizedPercent(
  value: number,
  preferences?: FormatterPreferences,
  options?: { maximumFractionDigits?: number; minimumFractionDigits?: number },
): string {
  return `${formatLocalizedNumber(value, preferences, {
    minimumFractionDigits: options?.minimumFractionDigits,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  })}%`;
}

export function formatLocalizedCurrency(
  value: number,
  preferences?: FormatterPreferences,
  options?: {
    currency?: string | null;
    sourceCurrency?: SupportedCurrency;
    currencyDisplay?: 'symbol' | 'code' | 'name' | 'narrowSymbol';
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
): string {
  const resolvedPreferences = getFormatterPreferences(preferences);
  const displayCurrency = resolvePreferredCurrency(options?.currency ?? resolvedPreferences.preferredCurrency);
  const sourceCurrency = options?.sourceCurrency ?? 'PHP';

  let converted = value;
  if (sourceCurrency === 'PHP' && displayCurrency !== 'PHP') {
    converted = convertFromPhp(value, displayCurrency);
  }

  return new Intl.NumberFormat(resolveLocale(resolvedPreferences.preferredLanguage), {
    style: 'currency',
    currency: displayCurrency,
    currencyDisplay: options?.currencyDisplay ?? 'symbol',
    minimumFractionDigits: options?.minimumFractionDigits,
    maximumFractionDigits: options?.maximumFractionDigits,
  }).format(converted);
}

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLocalizedDate(
  value: string | Date | null | undefined,
  preferences?: FormatterPreferences,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) {
    return '--';
  }

  const date = toDate(value);
  if (!date) {
    return typeof value === 'string' ? value : '--';
  }

  return new Intl.DateTimeFormat(resolveLocale(getFormatterPreferences(preferences).preferredLanguage), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(date);
}

export function formatLocalizedDateTime(
  value: string | Date | null | undefined,
  preferences?: FormatterPreferences,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) {
    return '--';
  }

  const date = toDate(value);
  if (!date) {
    return typeof value === 'string' ? value : '--';
  }

  return new Intl.DateTimeFormat(resolveLocale(getFormatterPreferences(preferences).preferredLanguage), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...options,
  }).format(date);
}