import Cookies from 'js-cookie';

export const DEFAULT_LANGUAGE = 'en';
export const DEFAULT_CURRENCY = 'PHP';

export const SUPPORTED_LANGUAGES = ['en', 'fil', 'ceb'] as const;
export const SUPPORTED_CURRENCIES = ['PHP', 'USD', 'EUR', 'GBP'] as const;

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fil', label: 'Filipino' },
  { value: 'ceb', label: 'Cebuano' },
] as const;

export const CURRENCY_OPTIONS = [
  { value: 'PHP', label: 'Philippine Peso (PHP)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export interface UserPreferences {
  preferredLanguage: string;
  preferredCurrency: string;
}

export function getStoredUserPreferences(): UserPreferences {
  return {
    preferredLanguage: Cookies.get('nd_language') ?? DEFAULT_LANGUAGE,
    preferredCurrency: Cookies.get('nd_currency') ?? DEFAULT_CURRENCY,
  };
}

export function syncUserPreferenceCookies(preferences: UserPreferences) {
  Cookies.set('nd_language', preferences.preferredLanguage, { expires: 365 });
  Cookies.set('nd_currency', preferences.preferredCurrency, { expires: 365 });
}