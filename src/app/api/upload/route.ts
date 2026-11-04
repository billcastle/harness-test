import { createHash } from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";
import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";
import { categorize } from "@/lib/categories";
import { parseCsv, parseStatementText, type RawTx } from "@/lib/parse";

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return Response.json({ error: "File too large (max 4 MB)" }, { status: 413 });

  let txs: RawTx[];
  try {
    if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
      const { text } = await extractText(pdf, { mergePages: true });
      txs = parseStatementText(text);
    } else {
      txs = parseCsv(await file.text());
    }
  } catch {
    return Response.json({ error: "Could not read the file" }, { status: 400 });
  }

  const charges = txs.filter((t) => t.amount_cents > 0); // skip payments/refunds
  if (!charges.length) {
    return Response.json({ error: "No transactions found. Try the CSV export from your bank." }, { status: 422 });
  }

  const client = await db();
  const seen = new Map<string, number>();
  let added = 0;
  for (const t of charges) {
    const key = `${t.date}|${t.description}|${t.amount_cents}`;
    const n = (seen.get(key) ?? 0) + 1; // identical lines in one file stay distinct
    seen.set(key, n);
    const hash = createHash("sha1").update(`${key}|${n}`).digest("hex");
    const r = await client.execute({
      sql: "INSERT OR IGNORE INTO expenses (date, description, amount_cents, category, hash) VALUES (?,?,?,?,?)",
      args: [t.date, t.description, t.amount_cents, categorize(t.description), hash],
    });
    added += r.rowsAffected;
  }
  return Response.json({ found: charges.length, added, duplicates: charges.length - added });
}
