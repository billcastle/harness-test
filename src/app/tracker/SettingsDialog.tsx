"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import type { Frequency } from "@/lib/amortize";
import { fmtDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryIcon } from "@/components/category-icon";
import { FALLBACK_CATEGORY } from "@/lib/categories";
import { ThemeChoice } from "../ThemeToggle";
import { CategorySelect } from "./CategorySelect";

type Rec = { id: number; description: string; amount_cents: number; category: string; day: number; start_date: string; frequency: Frequency };
type Draft = { description: string; amount: string; category: string; day: string };

const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  categories: string[];
  onCategories: (categories: string[]) => void;
  /** Called when a recurring expense was edited or deleted. */
  onChanged: () => void;
};

export default function SettingsDialog({ open, onOpenChange, currency, categories, onCategories, onChanged }: Props) {
  const [recs, setRecs] = useState<Rec[] | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>({ description: "", amount: "", category: "Other", day: "1" });
  const [confirming, setConfirming] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [removingCategory, setRemovingCategory] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadRecs = useCallback(async () => {
    const res = await fetch("/api/recurring");
    if (res.ok) setRecs(await res.json());
  }, []);
  useEffect(() => { if (open) { setEditing(null); setConfirming(null); setRemovingCategory(null); setError(""); loadRecs(); } }, [open, loadRecs]);

  async function saveCategories(next: string[]) {
    const res = await fetch("/api/settings", { method: "PUT", body: JSON.stringify({ categories: next }) }).catch(() => null);
    if (!res?.ok) return setError("Could not save categories. Names must be 1–30 characters and unique.");
    setError("");
    onCategories(next);
    onChanged(); // expenses of a removed category moved to Other, so reload them
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCategory.trim().replace(/\s+/g, " ");
    if (!name) return;
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) return setError(`"${name}" already exists.`);
    await saveCategories([...categories, name]);
    setNewCategory("");
  }

  async function removeCategory(name: string) {
    setRemovingCategory(null);
    await saveCategories(categories.filter((c) => c !== name));
  }

  const startEdit = (r: Rec) => {
    setEditing(r.id); setError("");
    setDraft({ description: r.description, amount: String(r.amount_cents / 100), category: r.category, day: String(r.day) });
  };

  async function save(id: number) {
    const res = await fetch(`/api/recurring/${id}`, { method: "PATCH", body: JSON.stringify(draft) });
    if (!res.ok) return setError("Check the values: description, amount above 0, and a day from 1 to 31.");
    setEditing(null); setError(""); loadRecs(); onChanged();
  }

  async function remove(r: Rec) {
    const res = await fetch(`/api/recurring/${r.id}`, { method: "DELETE" }).catch(() => null);
    setConfirming(null);
    if (!res?.ok) return setError("Could not delete the recurring expense");
    setError(""); loadRecs(); onChanged();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-6 overflow-y-auto p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Appearance, categories and recurring expenses.</DialogDescription>
        </DialogHeader>

        <section className="flex items-center justify-between gap-3">
          <Label>Theme</Label>
          <ThemeChoice />
        </section>

        <section className="grid gap-3">
          <div>
            <h3 className="text-sm font-medium">Categories</h3>
            <p className="text-sm text-muted-foreground">Removing a category moves its expenses to &ldquo;{FALLBACK_CATEGORY}&rdquo;.</p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <li key={c} className="flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-2.5 text-sm">
                <CategoryIcon category={c} className="size-5 [&_svg]:size-3" />
                {c}
                {c === FALLBACK_CATEGORY ? <span className="size-7" /> : removingCategory === c ? (
                  <span className="flex items-center gap-1">
                    <Button size="xs" variant="outline" onClick={() => setRemovingCategory(null)}>Keep</Button>
                    <Button size="xs" variant="destructive" onClick={() => removeCategory(c)}>Remove</Button>
                  </span>
                ) : (
                  <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => setRemovingCategory(c)} aria-label={`Remove category ${c}`}><X /></Button>
                )}
              </li>
            ))}
          </ul>
          <form onSubmit={addCategory} className="flex gap-2">
            <Input aria-label="New category name" placeholder="New category" maxLength={30} className="h-10" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <Button type="submit" className="h-10" disabled={!newCategory.trim()}><Plus /> Add</Button>
          </form>
        </section>

        <section className="grid gap-3">
          <div>
            <h3 className="text-sm font-medium">Recurring expenses</h3>
            <p className="text-sm text-muted-foreground">Monthly ones are added automatically each month, and edits apply to future months only. Weekly and yearly ones are shown as a share of whatever period you view, so edits apply to all of it.</p>
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {recs === null && <p className="text-sm text-muted-foreground">Loading…</p>}
          {recs?.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No recurring expenses yet. Turn on &ldquo;Recurring&rdquo; when adding an expense.</p>}
          {recs?.map((r) =>
            editing === r.id ? (
              <div key={r.id} className="grid gap-2 rounded-lg border p-3">
                <Input aria-label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                <div className={r.frequency === "monthly" ? "grid grid-cols-2 gap-2" : "grid gap-2"}>
                  <Input aria-label={`Amount (${currency})`} type="number" min="0.01" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
                  {r.frequency === "monthly" && <Input aria-label="Day of month" type="number" min="1" max="31" value={draft.day} onChange={(e) => setDraft({ ...draft, day: e.target.value })} />}
                </div>
                <CategorySelect categories={categories} value={draft.category} onChange={(category) => setDraft({ ...draft, category })} />
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(null); setError(""); }}><X /> Cancel</Button>
                  <Button size="sm" onClick={() => save(r.id)}><Check /> Save</Button>
                </div>
              </div>
            ) : (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border p-3">
                <CategoryIcon category={r.category} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium" title={r.description}>{r.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {confirming === r.id ? "Delete this? Expenses already added stay in your list." : `${formatMoney(r.amount_cents, currency)} · ${r.frequency === "monthly" ? `every month on the ${ordinal(r.day)}` : `every ${r.frequency === "weekly" ? "week" : "year"}, from ${fmtDate(r.start_date)}`}`}
                  </div>
                </div>
                {confirming === r.id ? (
                  <div className="flex items-center gap-1" role="group" aria-label={`Confirm deleting ${r.description}`}>
                    <Button size="sm" variant="outline" onClick={() => setConfirming(null)}>Keep</Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(r)}>Delete</Button>
                  </div>
                ) : (
                  <>
                    <Button variant="ghost" size="icon-sm" onClick={() => startEdit(r)} aria-label={`Edit ${r.description}`}><Pencil /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setConfirming(r.id)} aria-label={`Delete ${r.description}`}><Trash2 /></Button>
                  </>
                )}
              </div>
            ),
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
