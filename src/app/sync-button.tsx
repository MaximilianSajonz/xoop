"use client";
import { useEffect, useRef, useState } from "react";

const OPTIONS = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last year", days: 365 },
  { label: "All available", days: 500 },
];

export default function SyncButton() {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function sync(days: number) {
    setOpen(false);
    setBusy(true);
    setMsg("Syncing…");
    try {
      const r = await fetch(`/api/sync?days=${days}`, { method: "POST" });
      const j = await r.json();
      if (j.ok) {
        setMsg(`✓ ${j.counts.cycles}c · ${j.counts.recovery}r · ${j.counts.sleep}s · ${j.counts.workouts}w`);
        setTimeout(() => location.reload(), 700);
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
    <div className="relative flex items-center gap-3" ref={ref}>
      {msg && <span className="hidden text-xs text-neutral-400 sm:inline">{msg}</span>}
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-sm font-medium text-black shadow-sm shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-50"
      >
        <span className={busy ? "animate-spin" : ""}>{busy ? "↻" : "⟳"}</span>
        <span>Sync</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition ${open ? "rotate-180" : ""}`}>
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="fade-in absolute right-0 top-full z-30 mt-2 min-w-[180px] overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950/95 shadow-2xl backdrop-blur">
          {OPTIONS.map((o) => (
            <button
              key={o.days}
              onClick={() => sync(o.days)}
              className="block w-full px-4 py-2 text-left text-sm text-neutral-300 transition hover:bg-emerald-500/10 hover:text-emerald-300"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
