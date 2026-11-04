"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

function apply(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("theme", dark ? "dark" : "light");
}

/** Icon button, used on the PIN page. */
export default function ThemeToggle() {
  return (
    <Button variant="outline" size="icon" onClick={() => apply(!document.documentElement.classList.contains("dark"))} aria-label="Toggle light/dark theme">
      <Sun className="hidden dark:block" /><Moon className="dark:hidden" />
    </Button>
  );
}

/** Light / Dark choice, used in settings. */
export function ThemeChoice() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const pick = (d: boolean) => { apply(d); setDark(d); };
  return (
    <div className="flex gap-1" role="group" aria-label="Theme">
      <Button size="sm" variant={dark === false ? "default" : "outline"} onClick={() => pick(false)}><Sun /> Light</Button>
      <Button size="sm" variant={dark === true ? "default" : "outline"} onClick={() => pick(true)}><Moon /> Dark</Button>
    </div>
  );
}
