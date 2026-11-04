import { db } from "./db";
import { DEFAULT_CURRENCY, isCurrency } from "./currency";
import { CATEGORIES, FALLBACK_CATEGORY, cleanCategories } from "./categories";

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

export async function getCategories(): Promise<string[]> {
  const r = await (await db()).execute("SELECT value FROM settings WHERE key = 'categories'");
  try {
    return cleanCategories(JSON.parse(String(r.rows[0]?.value))) ?? [...CATEGORIES];
  } catch {
    return [...CATEGORIES]; // never saved, or unreadable: use the defaults
  }
}

/** Saves the list; expenses and recurring items in a removed category move to "Other". */
export async function saveCategories(next: string[], previous: string[]) {
  const stmts: { sql: string; args: string[] }[] = [{
    sql: "INSERT INTO settings (key, value) VALUES ('categories', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: [JSON.stringify(next)],
  }];
  for (const removed of previous.filter((c) => !next.includes(c))) {
    for (const table of ["expenses", "recurring"]) {
      stmts.push({ sql: `UPDATE ${table} SET category = ? WHERE category = ?`, args: [FALLBACK_CATEGORY, removed] });
    }
  }
  await (await db()).batch(stmts, "write");
}
