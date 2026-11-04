"use client";
import { CATEGORIES } from "@/lib/categories";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const items = CATEGORIES.map((c) => ({ value: c, label: c }));

export function CategorySelect({ value, onChange, small }: { value: string; onChange: (v: string) => void; small?: boolean }) {
  return (
    <Select items={items} value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger size={small ? "sm" : "default"} className={small ? "w-36" : "w-full"} aria-label="Category"><SelectValue /></SelectTrigger>
      <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
    </Select>
  );
}
