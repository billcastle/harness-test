"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Props = {
  categories: string[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
  size?: "sm" | "default";
  /** Accessible name; say which expense it changes when several are on screen. */
  label?: string;
};

export function CategorySelect({ categories, value, onChange, className, size = "default", label = "Category" }: Props) {
  const items = categories.includes(value) ? categories : [...categories, value];
  const options = items.map((c) => ({ value: c, label: c }));
  return (
    <Select items={options} value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger size={size} className={cn("w-full", className)} aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}
