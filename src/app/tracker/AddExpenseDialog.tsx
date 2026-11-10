"use client";
import { useState } from "react";
import { FREQUENCIES, FREQUENCY_LABEL, type Frequency } from "@/lib/amortize";
import { fmtDate, todayISO } from "@/lib/dates";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/date-picker";
import { CategorySelect } from "./CategorySelect";
import StatementReview, { type ReviewRow } from "./StatementReview";

type ParsedTx = { date: string; description: string; amount_cents: number; category: string; hash: string; duplicate: boolean };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  categories: string[];
  /** Called after data changed. `month` is the yyyy-MM to jump to, if any. */
  onChanged: (month?: string) => void;
};

export default function AddExpenseDialog({ open, onOpenChange, currency, categories, onChanged }: Props) {
  const blank = () => ({ date: todayISO(), amount: "", category: categories[0] ?? "Other", description: "", recurring: false, frequency: "monthly" as Frequency });
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<ReviewRow[] | null>(null);
  // The category list can change in Settings while this form is kept in memory.
  const category = categories.includes(form.category) ? form.category : (categories[0] ?? "Other");

  const change = (o: boolean) => { if (o) { setForm(blank()); setError(""); setMsg(""); setReview(null); } onOpenChange(o); };

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/expenses", { method: "POST", body: JSON.stringify({ ...form, category }) });
    setBusy(false);
    if (!res.ok) return setError("Could not add expense");
    onChanged(form.date.slice(0, 7));
    setForm(blank()); setMsg("");
    onOpenChange(false);
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(""); setMsg("Reading statement…");
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const j = await res.json().catch(() => ({}));
    e.target.value = ""; setBusy(false);
    if (!res.ok) { setMsg(""); return setError(j.error || "Upload failed"); }
    // Nothing is saved yet: the parsed transactions are shown for review first.
    setMsg("");
    setReview((j.transactions as ParsedTx[]).map((t, key) => ({
      key, include: !t.duplicate, duplicate: t.duplicate, date: t.date, description: t.description,
      amount: (t.amount_cents / 100).toFixed(2), category: t.category, hash: t.hash,
    })));
  }

  async function saveReview() {
    const chosen = (review ?? []).filter((r) => r.include && !r.duplicate);
    if (!chosen.length) return;
    setBusy(true); setError("");
    const res = await fetch("/api/upload/save", {
      method: "POST",
      body: JSON.stringify({ transactions: chosen.map(({ date, description, amount, category, hash }) => ({ date, description, amount, category, hash })) }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError("Could not save these expenses. Check the rows and try again.");
    onChanged(chosen.map((r) => r.date).sort().at(-1)?.slice(0, 7));
    setReview(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className={`max-h-[90vh] gap-6 overflow-y-auto p-6 ${review ? "sm:max-w-2xl" : "sm:max-w-lg"}`}>
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-lg">Add expenses</DialogTitle>
          <DialogDescription>Enter one expense, or upload a statement and review it before saving.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="manual" className="gap-6">
          <TabsList className="w-full group-data-horizontal/tabs:h-11">
            <TabsTrigger value="manual" className="text-base">Manual</TabsTrigger>
            <TabsTrigger value="upload" className="text-base">Upload statement</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <form onSubmit={add} className="grid gap-5">
              <div className="grid gap-2"><Label>Date</Label><DatePicker value={form.date} onChange={(date) => setForm({ ...form, date })} className="h-11 w-full text-base" /></div>
              <div className="grid gap-2"><Label htmlFor="title">Title</Label>
                <Input id="title" required maxLength={200} className="h-11" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid gap-2"><Label htmlFor="cost">Cost ({currency})</Label>
                <Input id="cost" type="number" required min="0.01" step="0.01" placeholder="0.00" className="h-11" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Category</Label><CategorySelect categories={categories} value={category} onChange={(category) => setForm({ ...form, category })} className="h-11 text-base" /></div>
              <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="grid gap-1">
                  <Label htmlFor="recurring">Recurring</Label>
                  <p className="text-sm text-muted-foreground">
                    {!form.recurring ? "Repeat this expense on a schedule."
                      : form.frequency === "monthly" ? `Added every month on day ${Number(form.date.slice(8))}, starting ${fmtDate(form.date)}.`
                      : `Starting ${fmtDate(form.date)}. The dashboard shows its share of each period you view.`}
                  </p>
                </div>
                <Switch id="recurring" checked={form.recurring} onCheckedChange={(recurring) => setForm({ ...form, recurring })} />
              </div>
              {form.recurring && (
                <fieldset className="grid gap-2">
                  <legend className="mb-2 text-sm font-medium">Repeats</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {FREQUENCIES.map((f) => (
                      <label key={f} className="relative flex h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
                        <input type="radio" name="frequency" value={f} checked={form.frequency === f} onChange={() => setForm({ ...form, frequency: f })} className="peer sr-only" />
                        <span aria-hidden className="size-4 shrink-0 rounded-full border border-input peer-checked:border-[5px] peer-checked:border-primary" />
                        {FREQUENCY_LABEL[f]}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <Button type="submit" size="lg" className="mt-1 h-11 text-base" disabled={busy}>
                {form.recurring ? "Add recurring expense" : form.amount ? `Add ${formatMoney(Math.round(Number(form.amount) * 100), currency)}` : "Add expense"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="upload" className="grid gap-3">
            {review ? (
              <StatementReview rows={review} onChange={setReview} categories={categories} currency={currency} saving={busy} error={error}
                onCancel={() => { setReview(null); setError(""); }} onSave={saveReview} />
            ) : (<>
            <Input type="file" accept=".csv,.pdf,text/csv,application/pdf" className="h-11 py-2" onChange={upload} disabled={busy} aria-label="Statement file" />
            <p className="text-sm text-muted-foreground">CSV works best; text-based PDFs are supported too. Payments, refunds and interest are skipped. You&apos;ll review the transactions before anything is added, and ones you&apos;ve already uploaded are flagged.</p>
            {msg && <p className="text-sm" role="status">{msg}</p>}
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            </>)}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
