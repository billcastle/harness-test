export const CURRENCIES = ["PHP", "USD", "EUR", "GBP", "JPY", "SGD", "AUD", "CAD", "HKD", "CNY", "KRW", "INR"] as const;
export const DEFAULT_CURRENCY = "PHP";

export const isCurrency = (c: unknown): c is string => typeof c === "string" && (CURRENCIES as readonly string[]).includes(c);

export const formatMoney = (cents: number, currency: string) =>
  (cents / 100).toLocaleString(undefined, { style: "currency", currency });
