"use client";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmtDate, fromISO, toISO } from "@/lib/dates";
import { cn } from "@/lib/utils";


export function DatePicker({ value, onChange, className }: { value: string; onChange: (iso: string) => void; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className={cn("justify-start font-normal", className)} aria-label="Date" />}>
        <CalendarIcon /> {fmtDate(value)}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={fromISO(value)} defaultMonth={fromISO(value)} onSelect={(d) => d && onChange(toISO(d))} />
      </PopoverContent>
    </Popover>
  );
}

export function RangePicker({ from, to, onChange, className }: { from: string; to: string; onChange: (from: string, to: string) => void; className?: string }) {
  const selected: DateRange = { from: fromISO(from), to: fromISO(to) };
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className={cn("justify-start font-normal", className)} aria-label="Date range" />}>
        <CalendarIcon /> {from === to ? fmtDate(from) : `${fmtDate(from)} – ${fmtDate(to)}`}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={selected} defaultMonth={fromISO(from)} numberOfMonths={1}
          onSelect={(r) => r?.from && onChange(toISO(r.from), toISO(r.to ?? r.from))} />
      </PopoverContent>
    </Popover>
  );
}
