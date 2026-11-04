import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const r = await (await db()).execute("SELECT id, description, amount_cents, category, day, start_date, frequency FROM recurring ORDER BY day, id");
  return Response.json(r.rows);
}
