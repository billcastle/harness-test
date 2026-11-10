// Parsers for specific bank PDFs: the BPI credit card statement of account and the MariBank savings
// e-statement. They read positioned text items (not flattened text) because both layouts depend on
// where things sit on the page. Only expenses are returned: payments, refunds, credits, incoming
// transfers, interest and fees charged as interest are dropped. Each parser returns null when the
// document isn't its bank's statement, so callers can fall back to the generic parser.
import type { RawTx } from "./parse";

export type PdfItem = { str: string; x: number; y: number; w: number };
export type PdfPages = PdfItem[][];

/** The part of a pdf.js document these parsers need. */
export interface PdfDocLike {
  numPages: number;
  getPage(n: number): Promise<{ getTextContent(): Promise<{ items: readonly unknown[] }> }>;
}

export async function readPdfItems(pdf: PdfDocLike): Promise<PdfPages> {
  const pages: PdfPages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const { items } = await (await pdf.getPage(n)).getTextContent();
    pages.push(items.flatMap((i) => {
      const t = i as { str?: unknown; transform?: unknown; width?: unknown };
      if (typeof t.str !== "string" || !t.str.trim() || !Array.isArray(t.transform)) return [];
      return [{ str: t.str, x: Number(t.transform[4]), y: Number(t.transform[5]), w: Number(t.width) || 0 }];
    }));
  }
  return pages;
}

// BPI's PDF stores text with a space between every character ("S e p t e m b e r 2 8"). Closing those up
// is safe because the gaps between words are separate items, which the line builder turns into spaces.
const closeUp = (s: string) => (/^\S( \S)+$/.test(s.trim()) ? s.replace(/ /g, "") : s.trim());

function pageLines(items: PdfItem[]): string[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PdfItem[][] = [];
  for (const it of sorted) {
    const last = rows.at(-1);
    if (last && Math.abs(last[0].y - it.y) <= 2) last.push(it);
    else rows.push([it]);
  }
  return rows.map((row) => {
    let line = "";
    let end = -Infinity;
    for (const it of row.sort((a, b) => a.x - b.x)) {
      if (line && it.x - end > 1.5) line += " ";
      line += closeUp(it.str);
      end = it.x + it.w;
    }
    return line;
  });
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const monthOf = (name: string) => MONTHS.indexOf(name.slice(0, 3).toUpperCase()) + 1; // 0 when not a month
const pad = (n: number) => String(n).padStart(2, "0");
const cents = (s: string) => Math.round(parseFloat(s.replace(/,/g, "")) * 100);
const isInterest = (s: string) => /\b(interest|finance charge)\b/i.test(s);

/** A date without a year can't be after the statement date, so a later month belongs to the year before. */
const yearFor = (month: number, stmtMonth: number, stmtYear: number) => (month > stmtMonth ? stmtYear - 1 : stmtYear);

/** BPI credit card statement of account (e.g. "BPI Rewards Card"). Dates use the transaction date. */
export function parseBpiSoa(pages: PdfPages): RawTx[] | null {
  const lines = pages.flatMap(pageLines);
  const flat = lines.join("").replace(/\s+/g, "").toUpperCase();
  if (!flat.includes("BPI") || !flat.includes("STATEMENTOFACCOUNT")) return null;

  const sd = flat.match(/STATEMENTDATE([A-Z]+?)(\d{1,2}),(\d{4})/);
  const [stmtMonth, stmtYear] = sd ? [monthOf(sd[1]), Number(sd[3])] : [new Date().getMonth() + 1, new Date().getFullYear()];

  // "<txn month> <day> <post month> <day> <description> <amount>"; credits carry a leading "-" or trailing CR.
  const row = /^([A-Za-z]{3,9}) (\d{1,2}) ([A-Za-z]{3,9}) (\d{1,2}) (.+) (-?[\d,]+\.\d{2})(\s?CR)?$/;
  const out: RawTx[] = [];
  for (const line of lines) {
    const m = line.match(row);
    if (!m) continue;
    const month = monthOf(m[1]);
    if (!month || !monthOf(m[3])) continue;
    const amount = cents(m[6]);
    if (amount <= 0 || m[7] || isInterest(m[5])) continue; // payments, credits, interest
    out.push({ date: `${yearFor(month, stmtMonth, stmtYear)}-${pad(month)}-${pad(Number(m[2]))}`, description: m[5].trim(), amount_cents: amount });
  }
  return out;
}

/**
 * MariBank savings e-statement. Whether a row is money out or in is only visible from which column its
 * amount sits in, so the amount's right edge is compared with the INCOMING column header. Transfers
 * into the account, refunds, interest, and moves of your own money (time deposit placements shown as
 * "Others", transfers to yourself) are not expenses and are skipped.
 */
export function parseMaribank(pages: PdfPages): RawTx[] | null {
  const text = pages.flat().map((i) => i.str).join(" ").toUpperCase();
  if (!text.includes("MARIBANK") || !text.includes("TRANSACTION DETAILS")) return null;

  const period = text.match(/\d{2} [A-Z]{3} \d{4} TO \d{2} ([A-Z]{3}) (\d{4})/);
  const [stmtMonth, stmtYear] = period ? [monthOf(period[1]), Number(period[2])] : [new Date().getMonth() + 1, new Date().getFullYear()];

  // The account holder's name is printed just above the account number.
  const acct = pages.flat().find((i) => i.str.toUpperCase().startsWith("MARIBANK ACCOUNT"));
  const holder = acct && pages.flat().find((i) => Math.abs(i.x - acct.x) < 2 && i.y > acct.y && i.y - acct.y < 25)?.str.toUpperCase();

  const out: RawTx[] = [];
  let inDetails = false; // the transaction table can continue over pages
  for (const items of pages) {
    const start = items.find((i) => /SAVINGS - TRANSACTION DETAILS/i.test(i.str));
    const end = items.find((i) => /SAVINGS - INTEREST & TAX DETAILS/i.test(i.str));
    if (!start && !inDetails) continue;
    const top = start ? start.y : Infinity;
    const bottom = end ? end.y : -Infinity;
    inDetails = !end;
    const incomingX = items.find((i) => i.str.toUpperCase() === "INCOMING")?.x ?? Infinity;

    for (const d of items) {
      if (d.x > 100 || d.y >= top || d.y <= bottom || !/^\d{2} [A-Z]{3}$/.test(d.str)) continue;
      const band = items.filter((i) => i !== d && Math.abs(i.y - d.y) <= 12);
      const amount = band.find((i) => i.x >= 300 && /^[\d,]+\.\d{2}$/.test(i.str));
      if (!amount || amount.x + amount.w >= incomingX) continue; // no amount, or it is in the incoming column
      const title = band.filter((i) => i.x >= 150 && i.x < 340).sort((a, b) => b.y - a.y).map((i) => i.str);
      const first = (title[0] ?? "").toUpperCase();
      const own = holder && first === holder && /transfer/i.test(title.join(" "));
      if (!title.length || first === "OTHERS" || own || /\b(interest|tax)\b/i.test(title.join(" "))) continue;

      const month = monthOf(d.str.slice(3));
      if (!month) continue;
      out.push({
        date: `${yearFor(month, stmtMonth, stmtYear)}-${pad(month)}-${d.str.slice(0, 2)}`,
        description: title.join(" "),
        amount_cents: cents(amount.str),
      });
    }
  }
  return out;
}
