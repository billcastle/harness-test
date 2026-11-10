import { isAuthed } from "@/lib/auth";
import { cleanCategories } from "@/lib/categories";
import { getCategories, getCurrency, saveCategories } from "@/lib/settings";

export async function GET() {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ currency: getCurrency(), categories: await getCategories() });
}

export async function PUT(req: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const categories = cleanCategories(b.categories);
  if (!categories) return Response.json({ error: "Invalid categories" }, { status: 400 });
  await saveCategories(categories, await getCategories());
  return Response.json({ ok: true });
}
