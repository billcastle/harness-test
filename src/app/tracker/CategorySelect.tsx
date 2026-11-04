"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function CategorySelect({ categories, value, onChange, className }: { categories: string[]; value: string; onChange: (v: string) => void; className?: string }) {
  const items = categories.map((c) => ({ value: c, label: c }));
  return (
    <Select items={items} value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className={cn("w-full", className)} aria-label="Category"><SelectValue /></SelectTrigger>
      <SelectContent>{items.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}
