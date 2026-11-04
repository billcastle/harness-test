import { isAuthed } from "@/lib/auth";
import { isCurrency } from "@/lib/currency";
import { getCurrency, setCurrency } from "@/lib/settings";

export async function GET() {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ currency: await getCurrency() });
}

export async function PUT(req: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { currency } = await req.json().catch(() => ({}));
  if (!isCurrency(currency)) return Response.json({ error: "Invalid currency" }, { status: 400 });
  await setCurrency(currency);
  return Response.json({ ok: true });
}
