import { format } from "date-fns";

// Dates are stored and passed around as local "yyyy-MM-dd" strings, and shown as "Nov 4, 2025" everywhere.
export const toISO = (d: Date) => format(d, "yyyy-MM-dd");
export const fromISO = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const fmtDate = (s: string) => format(fromISO(s), "MMM d, yyyy");
export const fmtMonth = (ym: string) => format(fromISO(`${ym}-01`), "MMMM yyyy");
export const todayISO = () => toISO(new Date());
