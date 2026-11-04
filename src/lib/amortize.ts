export const FREQUENCIES = ["weekly", "monthly", "yearly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const FREQUENCY_LABEL: Record<Frequency, string> = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

const PER_YEAR: Record<Frequency, number> = { weekly: 52, monthly: 12, yearly: 1 };
const dayNumber = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d) / 86_400_000; };

/**
 * The part of a recurring expense that belongs to the period [from, to] (yyyy-MM-dd, inclusive).
 * A whole-month view shows exactly 1/12 of the yearly cost (12,000 a year is 1,000 a month); any other
 * period is prorated by days over a 365-day year. Nothing before `startDate` counts.
 */
export function periodShareCents(amountCents: number, frequency: Frequency, startDate: string, from: string, to: string, wholeMonth: boolean): number {
  if (startDate > to) return 0;
  const yearly = amountCents * PER_YEAR[frequency];
  if (wholeMonth) return Math.round(yearly / 12);
  const days = dayNumber(to) - dayNumber(from > startDate ? from : startDate) + 1;
  return days > 0 ? Math.round((yearly * days) / 365) : 0;
}
