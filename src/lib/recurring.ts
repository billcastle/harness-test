import { db } from "./db";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Adds the occurrences of every monthly recurring expense (weekly and yearly ones are shown as period shares, not generated) that are due on or before `today` (yyyy-MM-dd).
 * Idempotent: each occurrence has a unique hash, and `generated_through` skips months already handled.
 * A day later than the month's length (e.g. 31) falls on the month's last day.
 */
export async function materializeRecurring(today: string) {
  const c = await db();
  const recs = (await c.execute("SELECT id, description, amount_cents, category, day, start_date, generated_through FROM recurring WHERE frequency = 'monthly'")).rows;
  const [ty, tm] = today.split("-").map(Number);
  const stmts: { sql: string; args: (string | number)[] }[] = [];

  for (const r of recs) {
    const [sy, sm] = String(r.start_date).split("-").map(Number);
    let [y, m] = [sy, sm];
    if (r.generated_through) { // resume after the last month already generated
      [y, m] = String(r.generated_through).split("-").map(Number);
      if (++m > 12) { m = 1; y++; }
    }
    let last: string | null = null;
    for (let i = 0; i < 600 && (y < ty || (y === ty && m <= tm)); i++) {
      const date = `${y}-${pad(m)}-${pad(Math.min(Number(r.day), new Date(y, m, 0).getDate()))}`;
      if (date > today) break; // not due yet; later months aren't either
      if (date >= String(r.start_date)) {
        last = `${y}-${pad(m)}`;
        stmts.push({
          sql: "INSERT OR IGNORE INTO expenses (date, description, amount_cents, category, hash) VALUES (?,?,?,?,?)",
          args: [date, String(r.description), Number(r.amount_cents), String(r.category), `rec:${r.id}:${last}`],
        });
      }
      if (++m > 12) { m = 1; y++; }
    }
    if (last) stmts.push({ sql: "UPDATE recurring SET generated_through = ? WHERE id = ?", args: [last, Number(r.id)] });
  }
  if (stmts.length) await c.batch(stmts, "write");
}
