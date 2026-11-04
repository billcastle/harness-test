"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function PinForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/login", { method: "POST", body: JSON.stringify({ pin }) });
    if (res.ok) return router.replace("/tracker");
    setError("Wrong PIN"); setPin(""); setBusy(false);
  }

  return (
    <Card className="w-full max-w-xs">
      <CardHeader><CardTitle className="text-center text-lg">Expense Tracker</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3">
          <Input type="password" inputMode="numeric" autoComplete="current-password" autoFocus
            placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} aria-label="PIN"
            className="h-10 text-center text-lg tracking-[0.3em]" />
          <Button type="submit" size="lg" disabled={busy || !pin}>Unlock</Button>
          {error && <p className="text-center text-sm text-destructive" role="alert">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
