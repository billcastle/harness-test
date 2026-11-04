import { pinMatches, startSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { pin } = await req.json().catch(() => ({ pin: "" }));
  if (typeof pin !== "string" || !pinMatches(pin)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return Response.json({ error: "Wrong PIN" }, { status: 401 });
  }
  await startSession();
  return Response.json({ ok: true });
}
