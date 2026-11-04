import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCategories } from "@/lib/settings";
import { FREQUENCIES } from "@/lib/amortize";
import { materializeRecurring } from "@/lib/recurring";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // The client sends its own "today" so recurring charges respect the user's timezone, not the server's.
  const q = new URL(req.url).searchParams.get("today") ?? "";
  await materializeRecurring(ISO.test(q) ? q : new Date().toISOString().slice(0, 10));
  const r = await (await db()).execute("SELECT id, date, description, amount_cents, category FROM expenses ORDER BY date DESC, id DESC");
  return Response.json(r.rows);
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => null);
  const cents = Math.round(Number(b?.amount) * 100);
  const valid =
    ISO.test(b?.date) && Number.isFinite(cents) && cents > 0 && String(b?.description ?? "").trim() !== "" &&
    (await getCategories()).includes(b?.category);
  if (!valid) return Response.json({ error: "Invalid expense" }, { status: 400 });
  const frequency = b.frequency ?? "monthly";
  if (!(FREQUENCIES as readonly string[]).includes(frequency)) return Response.json({ error: "Invalid frequency" }, { status: 400 });
  const description = String(b.description).trim().slice(0, 200);
  const client = await db();
  if (b.recurring) {
    // Stored as a template; the occurrences (including this first one) are generated when due.
    await client.execute({
      sql: "INSERT INTO recurring (description, amount_cents, category, day, start_date, frequency) VALUES (?,?,?,?,?,?)",
      args: [description, cents, b.category, Number(b.date.slice(8)), b.date, frequency],
    });
  } else {
    await client.execute({
      sql: "INSERT INTO expenses (date, description, amount_cents, category) VALUES (?,?,?,?)",
      args: [b.date, description, cents, b.category],
    });
  }
  return Response.json({ ok: true });
}
