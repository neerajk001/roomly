/**
 * Currency codes offered in V1 pickers. Store the ISO 4217 code on the
 * workspace; money is always integer minor units using that currency's
 * exponent.
 */
export const CURRENCIES: readonly string[] = [
  "USD",
  "EUR",
  "GBP",
  "INR",
  "AUD",
  "CAD",
  "SGD",
  "AED",
  "JPY",
  "CHF",
  "SEK",
  "NZD",
];

export function isSupportedCurrency(code: string): boolean {
  return CURRENCIES.includes(code);
}
