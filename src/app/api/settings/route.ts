import { isAuthed } from "@/lib/auth";
import { isCurrency } from "@/lib/currency";
import { cleanCategories } from "@/lib/categories";
import { getCategories, getCurrency, saveCategories, setCurrency } from "@/lib/settings";

export async function GET() {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ currency: await getCurrency(), categories: await getCategories() });
}

export async function PUT(req: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  // Validate everything before writing anything.
  if (b.currency !== undefined && !isCurrency(b.currency)) return Response.json({ error: "Invalid currency" }, { status: 400 });
  const categories = b.categories === undefined ? undefined : cleanCategories(b.categories);
  if (categories === null) return Response.json({ error: "Invalid categories" }, { status: 400 });
  if (b.currency !== undefined) await setCurrency(b.currency);
  if (categories) await saveCategories(categories, await getCategories());
  return Response.json({ ok: true });
}
