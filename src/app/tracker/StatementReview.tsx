"use client";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategorySelect } from "./CategorySelect";

export type ReviewRow = {
  key: number;
  include: boolean;
  /** Already saved from an earlier upload; shown but can't be added again. */
  duplicate: boolean;
  date: string;
  description: string;
  amount: string;
  category: string;
  /** From the originally parsed values, so editing a row can't defeat duplicate detection. */
  hash: string;
};

const cents = (r: ReviewRow) => Math.round(Number(r.amount) * 100);
export const rowIssue = (r: ReviewRow) =>
  !r.description.trim() ? "Add a title" : !(cents(r) > 0) ? "Amount must be above 0" : !/^\d{4}-\d{2}-\d{2}$/.test(r.date) ? "Pick a date" : "";

type Props = {
  rows: ReviewRow[];
  onChange: (rows: ReviewRow[]) => void;
  categories: string[];
  currency: string;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSave: () => void;
};

export default function StatementReview({ rows, onChange, categories, currency, saving, error, onCancel, onSave }: Props) {
  const update = (key: number, patch: Partial<ReviewRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const selectable = rows.filter((r) => !r.duplicate);
  const chosen = rows.filter((r) => r.include && !r.duplicate);
  const allOn = selectable.length > 0 && chosen.length === selectable.length;
  const invalid = chosen.filter((r) => rowIssue(r)).length;
  const total = chosen.reduce((s, r) => s + (cents(r) > 0 ? cents(r) : 0), 0);
  const dupes = rows.length - selectable.length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2.5 text-sm font-medium">
          <input type="checkbox" className="size-5 accent-primary" checked={allOn} disabled={selectable.length === 0}
            onChange={(e) => onChange(rows.map((r) => (r.duplicate ? r : { ...r, include: e.target.checked })))} />
          Select all
        </label>
        <p className="text-sm text-muted-foreground">
          {rows.length} found{dupes > 0 && ` · ${dupes} already added`}
        </p>
      </div>

      <ul className="grid max-h-[45vh] gap-3 overflow-y-auto pr-1">
        {rows.map((r) => {
          const issue = r.include && !r.duplicate ? rowIssue(r) : "";
          return (
            <li key={r.key} className={`grid gap-3 rounded-xl border p-3 ${r.include && !r.duplicate ? "" : "opacity-60"}`}>
              <div className="flex items-center gap-3">
                <input type="checkbox" className="size-5 shrink-0 accent-primary" checked={r.include && !r.duplicate} disabled={r.duplicate}
                  aria-label={`Include ${r.description}`} onChange={(e) => update(r.key, { include: e.target.checked })} />
                <Input aria-label="Title" className="h-10 text-base font-medium" value={r.description} aria-invalid={issue === "Add a title"}
                  disabled={r.duplicate} onChange={(e) => update(r.key, { description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2 pl-8 sm:grid-cols-[9.5rem_8rem_1fr]">
                <Input aria-label="Date" type="date" className="h-10" value={r.date} aria-invalid={issue === "Pick a date"}
                  disabled={r.duplicate} onChange={(e) => update(r.key, { date: e.target.value })} />
                <Input aria-label={`Amount (${currency})`} type="number" min="0.01" step="0.01" className="h-10" value={r.amount} aria-invalid={issue === "Amount must be above 0"}
                  disabled={r.duplicate} onChange={(e) => update(r.key, { amount: e.target.value })} />
                <CategorySelect className="col-span-2 h-10 sm:col-span-1" label={`Category of ${r.description}`} categories={categories} value={r.category}
                  onChange={(category) => update(r.key, { category })} />
              </div>
              {r.duplicate && <p className="pl-8 text-xs text-muted-foreground">Already added from an earlier upload.</p>}
              {issue && <p className="pl-8 text-xs text-destructive" role="alert">{issue}</p>}
            </li>
          );
        })}
      </ul>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-sm" aria-live="polite">
          <span className="font-medium">{chosen.length} selected</span>
          <span className="text-muted-foreground"> · {formatMoney(total, currency)}</span>
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="lg" className="h-11 text-base" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="button" size="lg" className="h-11 text-base" onClick={onSave} disabled={saving || chosen.length === 0 || invalid > 0}>
            {saving ? "Saving…" : `Save ${chosen.length} expense${chosen.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
