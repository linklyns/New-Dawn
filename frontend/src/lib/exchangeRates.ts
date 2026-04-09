import type { SupportedCurrency } from './userPreferences';

/**
 * Approximate exchange rates FROM PHP to other currencies.
 * These are hardcoded approximations — update periodically.
 * Last updated: April 2026
 */
const PHP_TO_RATES: Record<SupportedCurrency, number> = {
  PHP: 1,
  USD: 0.0175,   // 1 PHP ≈ $0.0175  (1 USD ≈ 57 PHP)
  EUR: 0.016,    // 1 PHP ≈ €0.016   (1 EUR ≈ 62.5 PHP)
  GBP: 0.014,    // 1 PHP ≈ £0.014   (1 GBP ≈ 71.4 PHP)
};

export function convertFromPhp(amountPhp: number, targetCurrency: SupportedCurrency): number {
  return amountPhp * (PHP_TO_RATES[targetCurrency] ?? 1);
}

export function getExchangeRate(targetCurrency: SupportedCurrency): number {
  return PHP_TO_RATES[targetCurrency] ?? 1;
}
