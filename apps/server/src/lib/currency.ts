/**
 * Server-side currency formatting utilities.
 *
 * Mirrors apps/web/lib/currency.ts for use in notification messages
 * and email templates on the server.
 */

export type CurrencyCode = "USD" | "ZAR" | "ZIG";

const CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; space: boolean }> = {
  USD: { symbol: "$", space: false },
  ZAR: { symbol: "R", space: false },
  ZIG: { symbol: "ZiG", space: true },
};

/**
 * Format a number as a currency string.
 *
 * @example
 * fmtServer(1200)          // "$1,200"
 * fmtServer(1200, "ZAR")   // "R1,200"
 * fmtServer(1200, "ZIG")   // "ZiG 1,200"
 */
export function fmtServer(
  value: number | string | null | undefined,
  currency: CurrencyCode = "USD",
): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (Number.isNaN(num)) return `${CURRENCY_CONFIG[currency].symbol}0`;

  const config = CURRENCY_CONFIG[currency];
  const formatted = num.toLocaleString("en-US");
  return config.space ? `${config.symbol} ${formatted}` : `${config.symbol}${formatted}`;
}
