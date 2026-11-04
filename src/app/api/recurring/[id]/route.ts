import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCategories } from "@/lib/settings";

type Ctx = { params: Promise<{ id: string }> };

// Edits apply to future months only; expenses already generated are left as they are.
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => null);
  const cents = Math.round(Number(b?.amount) * 100);
  const day = Number(b?.day);
  const valid =
    typeof b?.description === "string" && b.description.trim() && Number.isFinite(cents) && cents > 0 &&
    Number.isInteger(day) && day >= 1 && day <= 31 && (await getCategories()).includes(b?.category);
  if (!valid) return Response.json({ error: "Invalid recurring expense" }, { status: 400 });
  await (await db()).execute({
    sql: "UPDATE recurring SET description = ?, amount_cents = ?, category = ?, day = ? WHERE id = ?",
    args: [b.description.trim().slice(0, 200), cents, b.category, day, Number((await params).id)],
  });
  return Response.json({ ok: true });
}

export async function DELETE(_: Request, { params }: Ctx) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await (await db()).execute({ sql: "DELETE FROM recurring WHERE id = ?", args: [Number((await params).id)] });
  return Response.json({ ok: true });
}
