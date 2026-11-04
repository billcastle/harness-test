import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseStatementText, parseDate, parseAmount } from "../src/lib/parse.ts";

test("dates", () => {
  assert.equal(parseDate("2025-03-07"), "2025-03-07");
  assert.equal(parseDate("03/07/2025"), "2025-03-07");
  assert.equal(parseDate("25/03/2025"), "2025-03-25");
  assert.equal(parseDate("05 Jan 2025"), "2025-01-05");
  assert.equal(parseDate("Jan 5, 2025"), "2025-01-05");
});

test("amounts", () => {
  assert.equal(parseAmount("$1,234.56"), 123456);
  assert.equal(parseAmount("(12.00)"), -1200);
  assert.equal(parseAmount("45.10 CR"), -4510);
});

test("csv with charges and a payment", () => {
  const rows = parseCsv('Date,Description,Amount\n2025-03-01,"STARBUCKS, SF",5.50\n2025-03-02,PAYMENT THANK YOU,-200.00\n');
  assert.deepEqual(rows.map((r) => r.amount_cents), [550, -20000]);
  assert.equal(rows[0].description, "STARBUCKS, SF");
});

test("csv with negative charges is flipped", () => {
  const rows = parseCsv("Date,Description,Amount\n2025-03-01,A,-5.50\n2025-03-02,B,-7.00\n2025-03-03,PAYMENT,100.00\n");
  assert.deepEqual(rows.map((r) => r.amount_cents), [550, 700, -10000]);
});

test("pdf text lines", () => {
  const rows = parseStatementText("Statement\n03/01/2025 AMAZON MKTPLACE 29.99\n05 Mar  UBER TRIP  12.40\nTotal due 42.39\n");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].amount_cents, 2999);
  assert.equal(rows[1].description, "UBER TRIP");
});
