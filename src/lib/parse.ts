// Parses credit card statements (CSV or PDF text) into raw transactions.
// Statement formats vary by bank; this handles common layouts and skips lines it can't read.
export type RawTx = { date: string; description: string; amount_cents: number };

const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const pad = (n: number) => String(n).padStart(2, "0");

export function parseDate(s: string, now = new Date()): string | null {
  s = s.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    let [a, b, y] = [+m[1], +m[2], +m[3]];
    if (y < 100) y += 2000;
    const [mo, d] = a > 12 ? [b, a] : [a, b]; // assume MM/DD unless it can't be
    return mo >= 1 && mo <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  // "05 Jan", "05 Jan 2025", "Jan 05", "Jan 5, 2025"
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?(?:,?\s+(\d{4}))?/) ??
      s.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?/);
  if (m) {
    const [dayS, monS] = /^\d/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
    const mo = MONTHS.indexOf(monS.toLowerCase()) + 1;
    if (!mo) return null;
    let y = m[3] ? +m[3] : now.getFullYear();
    if (!m[3] && new Date(y, mo - 1, +dayS) > now) y -= 1; // yearless dates can't be in the future
    return `${y}-${pad(mo)}-${pad(+dayS)}`;
  }
  return null;
}

export function parseAmount(s: string): number | null {
  const t = s.trim();
  if (!/\d/.test(t) || /[A-Za-z]{3,}/.test(t.replace(/\b(CR|DR)\b/i, ""))) return null;
  const neg = /^\(.*\)$/.test(t) || t.includes("-") || /\bCR\b/i.test(t);
  const n = parseFloat(t.replace(/[^0-9.,]/g, "").replace(/,(?=\d{3}\b)/g, ""));
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100) * (neg ? -1 : 1);
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseCsv(text: string): RawTx[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const hi = lines.findIndex((l) => /date/i.test(l) && /(amount|debit|charge|description|merchant|payee)/i.test(l));
  if (hi < 0) return [];
  const head = splitCsvLine(lines[hi]).map((h) => h.toLowerCase());
  const find = (re: RegExp) => head.findIndex((h) => re.test(h));
  const iDate = find(/date/), iDesc = find(/desc|merchant|payee|details|name|memo/);
  const iAmt = find(/^(amount|charge|billing amount)/), iDebit = find(/debit/), iCredit = find(/credit/);
  if (iDate < 0 || iDesc < 0 || (iAmt < 0 && iDebit < 0)) return [];

  const rows: RawTx[] = [];
  for (const line of lines.slice(hi + 1)) {
    const c = splitCsvLine(line);
    const date = parseDate(c[iDate] ?? "");
    if (!date) continue;
    let amt: number | null;
    if (iAmt >= 0) amt = parseAmount(c[iAmt] ?? "");
    else {
      const d = parseAmount(c[iDebit] ?? ""), cr = iCredit >= 0 ? parseAmount(c[iCredit] ?? "") : null;
      amt = d ?? (cr !== null ? -Math.abs(cr) : null);
    }
    if (amt === null || !c[iDesc]) continue;
    rows.push({ date, description: c[iDesc], amount_cents: amt });
  }
  // Some banks export charges as negatives. If most rows are negative, flip so charges are positive.
  if (rows.filter((r) => r.amount_cents < 0).length > rows.length / 2) rows.forEach((r) => (r.amount_cents *= -1));
  return rows;
}

export function parseStatementText(text: string): RawTx[] {
  const rows: RawTx[] = [];
  const dateRe = /^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}[/.-]\d{1,2}(?![/.-]\d)|\d{1,2}\s+[A-Za-z]{3}[a-z]*\.?(?:\s+\d{4})?|[A-Za-z]{3}[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?)\s+(.+)$/;
  const amtRe = /(\(?-?\$?[\d,]+\.\d{2}\)?(?:\s?(?:CR|DR))?)\s*$/i;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const m = line.match(dateRe);
    if (!m) continue;
    const a = m[2].match(amtRe);
    if (!a) continue;
    let ds = m[1];
    if (/^\d{1,2}[/.-]\d{1,2}$/.test(ds)) ds = ds.replace(/[.-]/, "/") + "/" + new Date().getFullYear();
    const date = parseDate(ds);
    const amt = parseAmount(a[1]);
    const description = m[2].slice(0, a.index).replace(/\s{2,}/g, " ").trim();
    if (!date || amt === null || description.length < 2) continue;
    // Skip a posting-date column duplicated before the description
    rows.push({ date, description: description.replace(/^\d{1,2}[/.-]\d{1,2}\s+/, ""), amount_cents: amt });
  }
  return rows;
}
