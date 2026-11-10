import { createHash } from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";
import { isAuthed } from "@/lib/auth";
import { db } from "@/lib/db";
import { categorize, FALLBACK_CATEGORY } from "@/lib/categories";
import { getCategories } from "@/lib/settings";
import { parseCsv, parseStatementText, onlyExpenses, type RawTx } from "@/lib/parse";
import { parseBpiSoa, parseMaribank, readPdfItems } from "@/lib/bank-statements";

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
      // BPI and MariBank statements have their own parsers; any other PDF is read as plain text lines.
      const pages = await readPdfItems(pdf);
      txs = parseBpiSoa(pages) ?? parseMaribank(pages) ?? parseStatementText((await extractText(pdf, { mergePages: true })).text);
    } else {
      txs = parseCsv(await file.text());
    }
  } catch {
    return Response.json({ error: "Could not read the file" }, { status: 400 });
  }

  const charges = onlyExpenses(txs); // skip payments, refunds, credits and interest
  if (!charges.length) {
    return Response.json({ error: "No transactions found. Try the CSV export from your bank." }, { status: 422 });
  }

  // Nothing is saved here: the client shows these for review, then sends the final list to /api/upload/save.
  const categories = await getCategories();
  const seen = new Map<string, number>();
  const parsed = charges.map((t) => {
    const key = `${t.date}|${t.description}|${t.amount_cents}`;
    const n = (seen.get(key) ?? 0) + 1; // identical lines in one file stay distinct
    seen.set(key, n);
    const suggested = categorize(t.description);
    return {
      date: t.date,
      description: t.description,
      amount_cents: t.amount_cents,
      category: categories.includes(suggested) ? suggested : FALLBACK_CATEGORY,
      hash: createHash("sha1").update(`${key}|${n}`).digest("hex"), // from the original values, so edits can't defeat duplicate detection
    };
  });

  const client = await db();
  const existing = new Set<string>();
  for (let i = 0; i < parsed.length; i += 200) {
    const chunk = parsed.slice(i, i + 200);
    const r = await client.execute({ sql: `SELECT hash FROM expenses WHERE hash IN (${chunk.map(() => "?").join(",")})`, args: chunk.map((t) => t.hash) });
    r.rows.forEach((row) => existing.add(String(row.hash)));
  }
  return Response.json({ transactions: parsed.map((t) => ({ ...t, duplicate: existing.has(t.hash) })) });
}
