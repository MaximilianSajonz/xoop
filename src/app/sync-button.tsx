"use client";
import { useState } from "react";

const OPTIONS = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
  { label: "All", days: 500 },
];

export default function SyncButton() {
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function sync(days: number) {
    setBusy(days);
    setMsg(null);
    try {
      const r = await fetch(`/api/sync?days=${days}`, { method: "POST" });
      const j = await r.json();
      if (j.ok) {
        setMsg(`✓ ${j.counts.cycles}c / ${j.counts.recovery}r / ${j.counts.sleep}s / ${j.counts.workouts}w`);
        setTimeout(() => location.reload(), 600);
      } else {
        setMsg("error: " + (j.error ?? "unknown"));
      }
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="mr-2 text-xs text-neutral-400">{msg}</span>}
      {OPTIONS.map((o) => (
        <button
          key={o.days}
          onClick={() => sync(o.days)}
          disabled={busy !== null}
          className="rounded border border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-900 disabled:opacity-40"
        >
          {busy === o.days ? "…" : `Sync ${o.label}`}
        </button>
      ))}
    </div>
  );
}
