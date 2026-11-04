"use client";
import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { FREQUENCIES, FREQUENCY_LABEL, type Frequency } from "@/lib/amortize";
import { fmtDate, todayISO } from "@/lib/dates";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/date-picker";
import { CategorySelect } from "./CategorySelect";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  /** Called after data changed. `month` is the yyyy-MM to jump to, if any. */
  onChanged: (month?: string) => void;
};

export default function AddExpenseDialog({ open, onOpenChange, currency, onChanged }: Props) {
  const blank = () => ({ date: todayISO(), amount: "", category: CATEGORIES[0] as string, description: "", recurring: false, frequency: "monthly" as Frequency });
  const frequencyItems = FREQUENCIES.map((f) => ({ value: f, label: FREQUENCY_LABEL[f] }));
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (o: boolean) => { if (o) { setForm(blank()); setError(""); setMsg(""); } onOpenChange(o); };

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/expenses", { method: "POST", body: JSON.stringify(form) });
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
    setMsg(`Added ${j.added} expenses${j.duplicates ? ` (${j.duplicates} already existed)` : ""}.`);
    onChanged();
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add expenses</DialogTitle>
          <DialogDescription>Enter one expense, or upload your credit card statement.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="manual">
          <TabsList className="w-full">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="upload">Upload statement</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <form onSubmit={add} className="mt-3 grid gap-3">
              <div className="grid gap-1.5"><Label>Date</Label><DatePicker value={form.date} onChange={(date) => setForm({ ...form, date })} className="w-full" /></div>
              <div className="grid gap-1.5"><Label htmlFor="cost">Cost ({currency})</Label>
                <Input id="cost" type="number" required min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Category</Label><CategorySelect value={form.category} onChange={(category) => setForm({ ...form, category })} /></div>
              <div className="grid gap-1.5"><Label htmlFor="title">Title</Label>
                <Input id="title" required maxLength={200} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
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
                <div className="grid gap-1.5"><Label>Repeats</Label>
                  <Select items={frequencyItems} value={form.frequency} onValueChange={(v) => v && setForm({ ...form, frequency: v as Frequency })}>
                    <SelectTrigger className="w-full" aria-label="Repeats"><SelectValue /></SelectTrigger>
                    <SelectContent>{frequencyItems.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select></div>
              )}
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <Button type="submit" disabled={busy}>
                {form.recurring ? "Add recurring expense" : form.amount ? `Add ${formatMoney(Math.round(Number(form.amount) * 100), currency)}` : "Add expense"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="upload" className="mt-3 grid gap-2">
            <Input type="file" accept=".csv,.pdf,text/csv,application/pdf" onChange={upload} disabled={busy} aria-label="Statement file" />
            <p className="text-sm text-muted-foreground">CSV works best; text-based PDFs are supported too. Payments and refunds are skipped, and re-uploading a statement won&apos;t add duplicates.</p>
            {msg && <p className="text-sm" role="status">{msg}</p>}
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
