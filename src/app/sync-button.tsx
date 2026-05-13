"use client";
import { useState } from "react";

export default function SyncButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/sync?days=30", { method: "POST" });
      const j = await r.json();
      if (j.ok) {
        setMsg(`✓ ${j.counts.cycles} cycles, ${j.counts.recovery} recovery, ${j.counts.sleep} sleep, ${j.counts.workouts} workouts`);
        setTimeout(() => location.reload(), 800);
      } else {
        setMsg("error: " + (j.error ?? "unknown"));
      }
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-neutral-400">{msg}</span>}
      <button
        onClick={sync}
        disabled={busy}
        className="rounded bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
      >
        {busy ? "Syncing…" : "Sync 30d"}
      </button>
    </div>
  );
}
