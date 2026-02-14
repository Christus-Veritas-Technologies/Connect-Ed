/**
 * Shared currency formatting utilities.
 *
 * Supported currencies:
 *  - USD  → "$1,200"
 *  - ZAR  → "R1,200"
 *  - ZIG  → "ZiG 1,200"
 */

export type CurrencyCode = "USD" | "ZAR" | "ZIG";

const CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; prefix: boolean }> = {
  USD: { symbol: "$", prefix: true },
  ZAR: { symbol: "R", prefix: true },
  ZIG: { symbol: "ZiG", prefix: true },
};

/**
 * Format a number as a currency string.
 *
 * @example
 * fmt(1200)             // "$1,200"
 * fmt(1200, "ZAR")      // "R1,200"
 * fmt(1200, "ZIG")      // "ZiG 1,200"
 */
export function fmt(value: number | string | null | undefined, currency: CurrencyCode = "USD"): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (Number.isNaN(num)) return `${CURRENCY_CONFIG[currency].symbol}0`;

  const config = CURRENCY_CONFIG[currency];
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  // ZiG uses a space between symbol and number
  if (currency === "ZIG") return `${config.symbol} ${formatted}`;
  return `${config.symbol}${formatted}`;
}

/**
 * Return the symbol/prefix for a given currency.
 */
export function currencySymbol(currency: CurrencyCode = "USD"): string {
  return CURRENCY_CONFIG[currency].symbol;
}

/**
 * Map country code → default currency.
 */
export function currencyForCountry(country: string | null | undefined): CurrencyCode {
  switch (country) {
    case "ZA":
      return "ZAR";
    case "ZW":
    default:
      return "USD";
  }
}
