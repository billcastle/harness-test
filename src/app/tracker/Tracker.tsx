"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Flame, Lock, Pencil, Plus, Settings, Trash2 } from "lucide-react";
import { fmtDate, fmtMonth, todayISO } from "@/lib/dates";
import { formatMoney } from "@/lib/currency";
import { FREQUENCY_LABEL, periodShareCents, type Frequency } from "@/lib/amortize";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker, RangePicker } from "@/components/date-picker";
import { CategoryIcon, categoryStyle } from "@/components/category-icon";
import AddExpenseDialog from "./AddExpenseDialog";
import SettingsDialog from "./SettingsDialog";
import EditExpenseDialog from "./EditExpenseDialog";

type Expense = { id: number; date: string; description: string; amount_cents: number; category: string };
const UNDO_MS = 6000;
// A weekly or yearly recurring expense's share of the viewed period; it is computed, not stored.
type Row = Expense & { share?: Frequency };
type RecurringItem = { id: number; description: string; amount_cents: number; category: string; start_date: string; frequency: Frequency };
type Mode = "month" | "day" | "range";

export default function Tracker({ initialCurrency, initialCategories }: { initialCurrency: string; initialCategories: string[] }) {
  const router = useRouter();
  const [all, setAll] = useState<Expense[]>([]);
  const [currency, setCurrency] = useState(initialCurrency);
  const [categories, setCategories] = useState(initialCategories);
  const [editing, setEditing] = useState<Expense | null>(null);
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
    <main className="mx-auto grid max-w-3xl gap-6 p-4 pb-24 sm:p-8 sm:pb-24">
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
        <CardHeader className="gap-4">
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
        <CardContent className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1 rounded-lg bg-muted p-5">
              <div className="text-sm text-muted-foreground">Total spent · {periodLabel}</div>
              <div className="text-3xl font-semibold tabular-nums">{money(total)}</div>
              <div className="text-sm text-muted-foreground">{realRows.length} transaction{realRows.length === 1 ? "" : "s"}{shares.length > 0 && ` + ${shares.length} recurring`}</div>
            </div>
            {mode !== "day" && (
              <div className="grid gap-1 rounded-lg bg-muted p-5">
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

          <div className="grid gap-4">
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
                    <div className={`h-full rounded-full ${categoryStyle(cat).bar}`} style={{ width: `${(c / total) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4" aria-labelledby="tx-heading">
        <h2 id="tx-heading" className="flex items-center gap-2 text-base font-medium"><CalendarDays className="size-4" /> Transactions · {periodLabel}</h2>
        <ul className="grid gap-4">
          {rows.map((e) => (
            <li key={e.id} className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1.5 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <span className="text-xs text-muted-foreground">{e.share ? `${FREQUENCY_LABEL[e.share]} share` : fmtDate(e.date)}</span>
              <span className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                <CategoryIcon category={e.category} className="size-5 [&_svg]:size-3" />
                {e.category}
              </span>
              <span className="line-clamp-2 min-w-0 text-base font-semibold" title={e.description}>{e.description}</span>
              <strong className="text-right text-base tabular-nums">{money(e.amount_cents)}</strong>
              <div className="col-span-2 mt-2 flex items-center justify-end gap-1">
                {e.share ? (
                  <span className="text-xs text-muted-foreground">Recurring · edit in Settings</span>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => setEditing(e)} aria-label={`Edit ${e.description}`}><Pencil /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(e)} aria-label={`Delete ${e.description}`}><Trash2 /></Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        {loaded && rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}
      </section>

      {undo && (
        <div role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-foreground p-3 pl-4 text-sm text-background shadow-lg">
          <span className="min-w-0 truncate">Deleted “{undo.description}”</span>
          <Button size="sm" variant="secondary" onClick={undoRemove}>Undo</Button>
        </div>
      )}

      <AddExpenseDialog open={addOpen} onOpenChange={setAddOpen} currency={currency} categories={categories} onChanged={onAdded} />
      <EditExpenseDialog expense={editing} onClose={() => setEditing(null)} currency={currency} categories={categories} onSaved={load} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} currency={currency} onCurrency={setCurrency} categories={categories} onCategories={setCategories} onChanged={load} />
    </main>
  );
}
