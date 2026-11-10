import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCategories } from "@/lib/settings";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HASH = /^[0-9a-f]{40}$/;

// Saves the transactions a user reviewed after a statement upload. Rows whose hash is already stored are skipped.
export async function POST(req: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => null);
  const list: unknown = b?.transactions;
  if (!Array.isArray(list) || list.length === 0 || list.length > 2000) return Response.json({ error: "Nothing to save" }, { status: 400 });

  const categories = await getCategories();
  const stmts: { sql: string; args: (string | number)[] }[] = [];
  for (const t of list) {
    const cents = Math.round(Number(t?.amount) * 100);
    const description = typeof t?.description === "string" ? t.description.trim().slice(0, 200) : "";
    if (!ISO.test(t?.date) || !Number.isFinite(cents) || cents <= 0 || !description || !categories.includes(t?.category) || !HASH.test(t?.hash)) {
      return Response.json({ error: "A transaction has an invalid date, title, amount or category" }, { status: 400 });
    }
    stmts.push({
      sql: "INSERT OR IGNORE INTO expenses (date, description, amount_cents, category, hash) VALUES (?,?,?,?,?)",
      args: [t.date, description, cents, t.category, t.hash],
    });
  }
  const results = await (await db()).batch(stmts, "write");
  const added = results.reduce((n, r) => n + r.rowsAffected, 0);
  return Response.json({ added, duplicates: stmts.length - added });
}
