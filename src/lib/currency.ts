export const DEFAULT_CURRENCY = "PHP";

/** True for any ISO 4217 code the runtime can format, e.g. "PHP", "USD", "THB". */
export const isCurrency = (c: unknown): c is string => typeof c === "string" && Intl.supportedValuesOf("currency").includes(c);

export const formatMoney = (cents: number, currency: string) =>
  (cents / 100).toLocaleString(undefined, { style: "currency", currency });
