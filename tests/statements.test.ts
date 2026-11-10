import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getDocumentProxy } from "unpdf";
import { parseBpiSoa, parseMaribank, readPdfItems } from "../src/lib/bank-statements.ts";
import { onlyExpenses } from "../src/lib/parse.ts";

const load = async (name: string) =>
  readPdfItems(await getDocumentProxy(new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)))));
const sum = (rows: { amount_cents: number }[]) => rows.reduce((s, r) => s + r.amount_cents, 0);

test("BPI statement: purchases only, dated with the right year", async () => {
  const pages = await load("bpi-soa.pdf");
  const rows = parseBpiSoa(pages);
  assert.ok(rows);
  assert.equal(rows.length, 14);
  assert.equal(sum(rows), 3549600); // matches "Purchases" on the statement summary: 35,496.00
  assert.ok(rows.every((r) => r.amount_cents > 0));
  assert.ok(!rows.some((r) => /payment - thank you|finance charge/i.test(r.description)));
  assert.deepEqual(rows[0], { date: "2026-09-12", description: "Mercurydrugcorp0250 Mandaluyong", amount_cents: 2475 });
  assert.equal(rows.at(-1)?.date, "2026-10-11");
  assert.equal(parseMaribank(pages), null);
});

test("MariBank statement: outgoing spending only", async () => {
  const pages = await load("maribank.pdf");
  const rows = parseMaribank(pages);
  assert.ok(rows);
  assert.equal(rows.length, 9);
  assert.equal(sum(rows), 959500);
  assert.ok(rows.every((r) => /^Shopee/.test(r.description)));
  assert.deepEqual(rows[0], { date: "2026-10-09", description: "Shopee Payment", amount_cents: 133200 });
  // Left out: incoming transfers, the refund, interest, and the 100,000.00 time deposit placement.
  assert.ok(!rows.some((r) => r.amount_cents >= 1_000_000));
  assert.equal(parseBpiSoa(pages), null);
});

test("onlyExpenses drops credits, zero amounts and interest", () => {
  const rows = onlyExpenses([
    { date: "2026-01-01", description: "Coffee", amount_cents: 500 },
    { date: "2026-01-02", description: "Payment - Thank You", amount_cents: -9000 },
    { date: "2026-01-03", description: "Finance Charge", amount_cents: 300 },
    { date: "2026-01-04", description: "Net Interest", amount_cents: 51 },
    { date: "2026-01-05", description: "Nothing", amount_cents: 0 },
  ]);
  assert.deepEqual(rows.map((r) => r.description), ["Coffee"]);
});
