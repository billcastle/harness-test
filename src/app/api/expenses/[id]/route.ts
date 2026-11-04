import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { category } = await req.json().catch(() => ({}));
  if (!(CATEGORIES as readonly string[]).includes(category)) return Response.json({ error: "Invalid category" }, { status: 400 });
  await (await db()).execute({ sql: "UPDATE expenses SET category = ? WHERE id = ?", args: [category, Number((await params).id)] });
  return Response.json({ ok: true });
}

export async function DELETE(_: Request, { params }: Ctx) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await (await db()).execute({ sql: "DELETE FROM expenses WHERE id = ?", args: [Number((await params).id)] });
  return Response.json({ ok: true });
}
