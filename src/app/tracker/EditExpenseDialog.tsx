"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/date-picker";
import { CategorySelect } from "./CategorySelect";

export type EditableExpense = { id: number; date: string; description: string; amount_cents: number; category: string };

type Props = {
  /** The expense being edited; null keeps the dialog closed. */
  expense: EditableExpense | null;
  onClose: () => void;
  currency: string;
  categories: string[];
  onSaved: () => void;
};

export default function EditExpenseDialog({ expense, onClose, currency, categories, onSaved }: Props) {
  return (
    <Dialog open={expense !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] gap-6 overflow-y-auto p-6 sm:max-w-lg">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-lg">Edit expense</DialogTitle>
          <DialogDescription>Change any detail of this expense.</DialogDescription>
        </DialogHeader>
        {/* Keyed so each expense starts from its own saved values. */}
        {expense && <EditForm key={expense.id} expense={expense} onClose={onClose} currency={currency} categories={categories} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({ expense, onClose, currency, categories, onSaved }: Omit<Props, "expense"> & { expense: EditableExpense }) {
  const [form, setForm] = useState({
    date: expense.date,
    description: expense.description,
    amount: (expense.amount_cents / 100).toFixed(2),
    category: expense.category,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // An expense can sit in a category that was removed meanwhile; offer it too so saving doesn't silently change it.
  const options = categories.includes(form.category) ? categories : [...categories, form.category];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch(`/api/expenses/${expense.id}`, { method: "PATCH", body: JSON.stringify(form) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError("Could not save changes. Check the title and cost, then try again.");
    onSaved();
    onClose();
  }

  return (
    <form onSubmit={save} className="grid gap-5">
      <div className="grid gap-2"><Label>Date</Label><DatePicker value={form.date} onChange={(date) => setForm({ ...form, date })} className="h-11 w-full text-base" /></div>
      <div className="grid gap-2"><Label htmlFor="edit-title">Title</Label>
        <Input id="edit-title" required maxLength={200} className="h-11" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div className="grid gap-2"><Label htmlFor="edit-cost">Cost ({currency})</Label>
        <Input id="edit-cost" type="number" required min="0.01" step="0.01" className="h-11" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
      <div className="grid gap-2"><Label>Category</Label><CategorySelect categories={options} value={form.category} onChange={(category) => setForm({ ...form, category })} className="h-11 text-base" /></div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="mt-1 grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" size="lg" className="h-11 text-base" onClick={onClose}>Cancel</Button>
        <Button type="submit" size="lg" className="h-11 text-base" disabled={busy}>Save changes</Button>
      </div>
    </form>
  );
}
