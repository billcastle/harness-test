import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCategories } from "@/lib/settings";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => null);
  const cents = Math.round(Number(b?.amount) * 100);
  const valid =
    ISO.test(b?.date) && Number.isFinite(cents) && cents > 0 &&
    typeof b?.description === "string" && b.description.trim() !== "" &&
    (await getCategories()).includes(b?.category);
  if (!valid) return Response.json({ error: "Invalid expense" }, { status: 400 });
  await (await db()).execute({
    sql: "UPDATE expenses SET date = ?, description = ?, amount_cents = ?, category = ? WHERE id = ?",
    args: [b.date, b.description.trim().slice(0, 200), cents, b.category, Number((await params).id)],
  });
  return Response.json({ ok: true });
}

export async function DELETE(_: Request, { params }: Ctx) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await (await db()).execute({ sql: "DELETE FROM expenses WHERE id = ?", args: [Number((await params).id)] });
  return Response.json({ ok: true });
}
