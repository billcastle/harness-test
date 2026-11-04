import { CircleEllipsis, Car, Clapperboard, HeartPulse, Plane, Receipt, Repeat, ShoppingBag, ShoppingBasket, Tag, Utensils, type LucideIcon } from "lucide-react";
import type { Category } from "@/lib/categories";
import { cn } from "@/lib/utils";

// Full class names are spelled out so Tailwind can see them.
export const CATEGORY_STYLE: Record<Category, { icon: LucideIcon; chip: string; bar: string }> = {
  "Food & Dining": { icon: Utensils, chip: "bg-orange-500/15 text-orange-500", bar: "bg-orange-500" },
  Groceries: { icon: ShoppingBasket, chip: "bg-green-500/15 text-green-500", bar: "bg-green-500" },
  Transport: { icon: Car, chip: "bg-blue-500/15 text-blue-500", bar: "bg-blue-500" },
  Shopping: { icon: ShoppingBag, chip: "bg-pink-500/15 text-pink-500", bar: "bg-pink-500" },
  "Bills & Utilities": { icon: Receipt, chip: "bg-amber-500/15 text-amber-500", bar: "bg-amber-500" },
  Entertainment: { icon: Clapperboard, chip: "bg-purple-500/15 text-purple-500", bar: "bg-purple-500" },
  Health: { icon: HeartPulse, chip: "bg-red-500/15 text-red-500", bar: "bg-red-500" },
  Travel: { icon: Plane, chip: "bg-sky-500/15 text-sky-500", bar: "bg-sky-500" },
  Subscriptions: { icon: Repeat, chip: "bg-indigo-500/15 text-indigo-500", bar: "bg-indigo-500" },
  Other: { icon: CircleEllipsis, chip: "bg-slate-500/15 text-slate-400", bar: "bg-slate-400" },
};

type Style = { icon: LucideIcon; chip: string; bar: string };

// User-added categories get a stable colour from this palette, picked by name.
const CUSTOM_PALETTE: Style[] = [
  { icon: Tag, chip: "bg-teal-500/15 text-teal-500", bar: "bg-teal-500" },
  { icon: Tag, chip: "bg-rose-500/15 text-rose-500", bar: "bg-rose-500" },
  { icon: Tag, chip: "bg-lime-500/15 text-lime-600", bar: "bg-lime-500" },
  { icon: Tag, chip: "bg-fuchsia-500/15 text-fuchsia-500", bar: "bg-fuchsia-500" },
  { icon: Tag, chip: "bg-cyan-500/15 text-cyan-500", bar: "bg-cyan-500" },
  { icon: Tag, chip: "bg-yellow-500/15 text-yellow-600", bar: "bg-yellow-500" },
  { icon: Tag, chip: "bg-emerald-500/15 text-emerald-500", bar: "bg-emerald-500" },
  { icon: Tag, chip: "bg-violet-500/15 text-violet-500", bar: "bg-violet-500" },
];

export function categoryStyle(category: string): Style {
  const known = (CATEGORY_STYLE as Record<string, Style | undefined>)[category];
  if (known) return known;
  let h = 0;
  for (const ch of category) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CUSTOM_PALETTE[h % CUSTOM_PALETTE.length];
}

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const s = categoryStyle(category);
  return (
    <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", s.chip, className)} aria-hidden>
      <s.icon className="size-4" />
    </span>
  );
}
