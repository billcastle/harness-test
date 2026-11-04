import { CircleEllipsis, Car, Clapperboard, HeartPulse, Plane, Receipt, Repeat, ShoppingBag, ShoppingBasket, Utensils, type LucideIcon } from "lucide-react";
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

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const s = CATEGORY_STYLE[category as Category] ?? CATEGORY_STYLE.Other;
  return (
    <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", s.chip, className)} aria-hidden>
      <s.icon className="size-4" />
    </span>
  );
}
