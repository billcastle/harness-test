import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import type { Frequency } from "./amortize";

let client: Client | null = null;
let ready: Promise<unknown> | null = null;

export async function db(): Promise<Client> {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (url) {
      client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
    } else {
      mkdirSync("data", { recursive: true });
      client = createClient({ url: "file:data/expenses.db" });
    }
    ready = client.batch([
      `CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        category TEXT NOT NULL,
        hash TEXT UNIQUE
      )`,
      "CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)",
      `CREATE TABLE IF NOT EXISTS recurring (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        category TEXT NOT NULL,
        day INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        generated_through TEXT,
        frequency TEXT NOT NULL DEFAULT 'monthly'
      )`,
      "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
    ], "write").then(() =>
      // Databases created before `frequency` existed need the column; "duplicate column" on later runs is expected.
      client!.execute("ALTER TABLE recurring ADD COLUMN frequency TEXT NOT NULL DEFAULT 'monthly'").catch(() => undefined),
    );
  }
  await ready;
  return client;
}

export type Expense = { id: number; date: string; description: string; amount_cents: number; category: string };

export type Recurring = { id: number; description: string; amount_cents: number; category: string; day: number; start_date: string; frequency: Frequency };
