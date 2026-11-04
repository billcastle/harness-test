"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Flame, Lock, Plus, Settings, Trash2 } from "lucide-react";
import { fmtDate, fmtMonth, todayISO } from "@/lib/dates";
import { formatMoney } from "@/lib/currency";
import { FREQUENCY_LABEL, periodShareCents, type Frequency } from "@/lib/amortize";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker, RangePicker } from "@/components/date-picker";
import { CATEGORY_STYLE, CategoryIcon } from "@/components/category-icon";
import type { Category } from "@/lib/categories";
import AddExpenseDialog from "./AddExpenseDialog";
import SettingsDialog from "./SettingsDialog";
import { CategorySelect } from "./CategorySelect";

type Expense = { id: number; date: string; description: string; amount_cents: number; category: string };
const UNDO_MS = 6000;
// A weekly or yearly recurring expense's share of the viewed period; it is computed, not stored.
type Row = Expense & { share?: Frequency };
type RecurringItem = { id: number; description: string; amount_cents: number; category: string; start_date: string; frequency: Frequency };
type Mode = "month" | "day" | "range";

export default function Tracker({ initialCurrency }: { initialCurrency: string }) {
  const router = useRouter();
  const [all, setAll] = useState<Expense[]>([]);
  const [currency, setCurrency] = useState(initialCurrency);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recs, setRecs] = useState<RecurringItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const money = useCallback((c: number) => formatMoney(c, currency), [currency]);

  // Summary period. Defaults to the monthly view.
  const [mode, setMode] = useState<Mode>("month");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState(todayISO());
  const [range, setRange] = useState({ from: `${todayISO().slice(0, 8)}01`, to: todayISO() });

  // One delete at a time waits here for UNDO_MS before it is sent to the server.
  const pendingRef = useRef<Expense | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [undo, setUndo] = useState<Expense | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/expenses?today=${todayISO()}`);
      if (res.status === 401) return router.replace("/");
      if (!res.ok) throw new Error("load failed");
      const data: Expense[] = await res.json();
      // A delete awaiting its undo window must not reappear on a reload.
      setAll(data.filter((x) => x.id !== pendingRef.current?.id));
      const rr = await fetch("/api/recurring");
      if (rr.ok) setRecs(await rr.json());
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoaded(true);
    }
  }, [router]);
  useEffect(() => { load(); }, [load]);

  const commitDelete = useCallback(async (e: Expense) => {
    const res = await fetch(`/api/expenses/${e.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) load(); // resync so a failed delete reappears
  }, [load]);
  // Leaving the page flushes a delete still inside its undo window.
  useEffect(() => () => {
    clearTimeout(undoTimer.current);
    if (pendingRef.current) fetch(`/api/expenses/${pendingRef.current.id}`, { method: "DELETE", keepalive: true });
  }, []);

  const months = useMemo(() => [...new Set(all.map((e) => e.date.slice(0, 7)))].sort().reverse(), [all]);
  const activeMonth = month || months[0] || todayISO().slice(0, 7);
  const [from, to] =
    mode === "month" ? [`${activeMonth}-01`, `${activeMonth}-31`] : mode === "day" ? [day, day] : [range.from, range.to];

  const realRows = useMemo(() => all.filter((e) => e.date >= from && e.date <= to), [all, from, to]);
  const shares = useMemo<Row[]>(() => recs.filter((r) => r.frequency !== "monthly").flatMap((r) => {
    const cents = periodShareCents(r.amount_cents, r.frequency, r.start_date, from, to, mode === "month");
    return cents > 0 ? [{ id: -r.id, date: from, description: r.description, amount_cents: cents, category: r.category, share: r.frequency }] : [];
  }), [recs, from, to, mode]);
  const rows = useMemo<Row[]>(() => [...realRows, ...shares], [realRows, shares]);
  const total = rows.reduce((s, e) => s + e.amount_cents, 0);
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + e.amount_cents));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const topDay = useMemo(() => {
    const m = new Map<string, { cents: number; n: number }>();
    realRows.forEach((e) => { const d = m.get(e.date) ?? { cents: 0, n: 0 }; m.set(e.date, { cents: d.cents + e.amount_cents, n: d.n + 1 }); });
    return [...m.entries()].sort((a, b) => b[1].cents - a[1].cents)[0];
  }, [realRows]);

  const periodLabel = mode === "month" ? fmtMonth(activeMonth) : mode === "day" ? fmtDate(day) : from === to ? fmtDate(from) : `${fmtDate(from)} – ${fmtDate(to)}`;
  const monthItems = (months.length ? months : [activeMonth]).map((m) => ({ value: m, label: fmtMonth(m) }));

  const onAdded = (ym?: string) => { if (ym) { setMode("month"); setMonth(ym); } load(); };
  const setCategory = async (id: number, category: string) => {
    setAll((a) => a.map((x) => (x.id === id ? { ...x, category } : x)));
    const res = await fetch(`/api/expenses/${id}`, { method: "PATCH", body: JSON.stringify({ category }) }).catch(() => null);
    if (!res?.ok) load(); // resync so the UI doesn't show a change that wasn't saved
  };
  const remove = (e: Expense) => {
    if (pendingRef.current) { clearTimeout(undoTimer.current); commitDelete(pendingRef.current); }
    pendingRef.current = e;
    setUndo(e);
    setAll((a) => a.filter((x) => x.id !== e.id));
    undoTimer.current = setTimeout(() => { pendingRef.current = null; setUndo(null); commitDelete(e); }, UNDO_MS);
  };
  const undoRemove = () => {
    const e = pendingRef.current;
    if (!e) return;
    clearTimeout(undoTimer.current);
    pendingRef.current = null;
    setUndo(null);
    setAll((a) => [...a, e].sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : y.id - x.id)));
  };
  const logout = async () => { await fetch("/api/logout", { method: "POST" }); router.replace("/"); };

  return (
    <main className="mx-auto grid max-w-3xl gap-4 p-4 pb-16">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Expense Tracker</h1>
        <div className="flex gap-2">
          <Button onClick={() => setAddOpen(true)}><Plus /> Add expense</Button>
          <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Settings"><Settings /></Button>
          <Button variant="outline" size="icon" onClick={logout} aria-label="Lock"><Lock /></Button>
        </div>
      </header>

      {loadError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
          Couldn&apos;t load your expenses.
          <Button size="sm" variant="outline" onClick={load}>Try again</Button>
        </div>
      )}

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1" role="group" aria-label="Summary period">
              {(["month", "day", "range"] as Mode[]).map((m) => (
                <Button key={m} size="sm" variant={mode === m ? "default" : "outline"} aria-pressed={mode === m} onClick={() => setMode(m)}>
                  {m === "month" ? "Month" : m === "day" ? "Day" : "Range"}
                </Button>
              ))}
            </div>
            {mode === "month" && (
              <Select items={monthItems} value={activeMonth} onValueChange={(v) => v && setMonth(v)}>
                <SelectTrigger size="sm" className="w-40" aria-label="Month"><SelectValue /></SelectTrigger>
                <SelectContent>{monthItems.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {mode === "day" && <DatePicker value={day} onChange={setDay} />}
            {mode === "range" && <RangePicker from={range.from} to={range.to} onChange={(f, t) => setRange({ from: f, to: t })} />}
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-muted p-4">
              <div className="text-sm text-muted-foreground">Total spent · {periodLabel}</div>
              <div className="text-3xl font-semibold tabular-nums">{money(total)}</div>
              <div className="text-sm text-muted-foreground">{realRows.length} transaction{realRows.length === 1 ? "" : "s"}{shares.length > 0 && ` + ${shares.length} recurring`}</div>
            </div>
            {mode !== "day" && (
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Flame className="size-4 text-primary" /> Most expensive day</div>
                {topDay ? (
                  <>
                    <div className="text-3xl font-semibold tabular-nums">{money(topDay[1].cents)}</div>
                    <div className="text-sm text-muted-foreground">{fmtDate(topDay[0])} · {topDay[1].n} transaction{topDay[1].n === 1 ? "" : "s"}</div>
                  </>
                ) : <div className="text-sm text-muted-foreground">No data</div>}
              </div>
            )}
          </div>

          <div className="grid gap-3">
            {loaded && byCat.length === 0 && <p className="text-sm text-muted-foreground">No expenses for this period. Use “Add expense” to upload a statement or enter one.</p>}
            {byCat.map(([cat, c]) => (
              <div key={cat} className="flex items-center gap-3">
                <CategoryIcon category={cat} className="size-9" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span>{cat}</span>
                    <span className="tabular-nums">{money(c)} <span className="text-muted-foreground">· {Math.round((c / total) * 100)}%</span></span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${CATEGORY_STYLE[cat as Category]?.bar ?? "bg-primary"}`} style={{ width: `${(c / total) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="max-sm:bg-transparent max-sm:py-0 max-sm:ring-0 sm:py-(--card-spacing)">
        <CardHeader className="max-sm:px-0"><CardTitle className="flex items-center gap-2"><CalendarDays className="size-4" /> Transactions · {periodLabel}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 max-sm:px-0 sm:gap-0">
          {rows.map((e) => (
            <div key={e.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:grid-cols-[6.5rem_1fr_auto_auto] sm:gap-y-1 sm:rounded-none sm:bg-transparent sm:p-0 sm:py-2 sm:ring-0 sm:border-t sm:first:border-t-0">
              <span className="order-3 text-sm text-muted-foreground sm:order-none">{e.share ? `${FREQUENCY_LABEL[e.share]} share` : fmtDate(e.date)}</span>
              <span className="order-1 flex min-w-0 items-center gap-2.5 sm:order-none" title={e.description}>
                <CategoryIcon category={e.category} className="size-8 shrink-0 sm:size-6 [&_svg]:size-4 sm:[&_svg]:size-3.5" />
                <span className="line-clamp-2 text-base font-semibold sm:truncate sm:text-sm sm:font-normal">{e.description}</span>
              </span>
              <strong className="order-2 text-base tabular-nums sm:order-none sm:text-sm">{money(e.amount_cents)}</strong>
              <div className="order-4 flex items-center justify-end gap-1 sm:order-none">
                {e.share ? (
                  <span className="text-sm text-muted-foreground">{e.category} · edit in Settings</span>
                ) : (
                  <>
                    <CategorySelect small value={e.category} onChange={(c) => setCategory(e.id, c)} />
                    <Button variant="ghost" size="icon-sm" onClick={() => remove(e)} aria-label={`Delete ${e.description}`}><Trash2 /></Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {loaded && rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}
        </CardContent>
      </Card>

      {undo && (
        <div role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-foreground p-3 pl-4 text-sm text-background shadow-lg">
          <span className="min-w-0 truncate">Deleted “{undo.description}”</span>
          <Button size="sm" variant="secondary" onClick={undoRemove}>Undo</Button>
        </div>
      )}

      <AddExpenseDialog open={addOpen} onOpenChange={setAddOpen} currency={currency} onChanged={onAdded} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} currency={currency} onCurrency={setCurrency} onChanged={load} />
    </main>
  );
}
