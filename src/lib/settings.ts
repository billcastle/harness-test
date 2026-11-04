import { db } from "./db";
import { DEFAULT_CURRENCY, isCurrency } from "./currency";

export async function getCurrency(): Promise<string> {
  const r = await (await db()).execute("SELECT value FROM settings WHERE key = 'currency'");
  const v = r.rows[0]?.value;
  return isCurrency(v) ? v : DEFAULT_CURRENCY;
}

export async function setCurrency(currency: string) {
  await (await db()).execute({
    sql: "INSERT INTO settings (key, value) VALUES ('currency', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: [currency],
  });
}
