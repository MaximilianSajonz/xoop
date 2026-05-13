"use client";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";

type Recovery = { day: string; recovery_score: number | null; hrv: number | null; rhr: number | null };
type Sleep = {
  day: string;
  hours_in_bed: number;
  rem: number;
  swp: number;
  light: number;
  awake: number;
  performance: number | null;
  nap: boolean;
};
type Strain = { day: string; strain: number | null; avg_hr: number | null; max_hr: number | null };
type Workout = { day: string; sport_id: number | null; strain: number | null; kj: number | null; minutes: number };

const RANGES = [
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
  { label: "All", days: 9999 },
];

function avg(xs: (number | null | undefined)[]): number | null {
  const v = xs.filter((x): x is number => typeof x === "number");
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function fmt(n: number | null | undefined, digits = 1) {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(digits);
}

export default function Dashboard({
  recovery,
  sleep,
  strain,
  workouts,
}: {
  recovery: Recovery[];
  sleep: Sleep[];
  strain: Strain[];
  workouts: Workout[];
}) {
  const [days, setDays] = useState(90);

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }, [days]);

  const r = recovery.filter((x) => x.day >= cutoff);
  const s = sleep.filter((x) => x.day >= cutoff);
  const st = strain.filter((x) => x.day >= cutoff);
  const w = workouts.filter((x) => x.day >= cutoff);

  const stats = {
    recovery: avg(r.map((x) => x.recovery_score)),
    hrv: avg(r.map((x) => x.hrv)),
    rhr: avg(r.map((x) => x.rhr)),
    sleepHours: avg(s.filter((x) => !x.nap).map((x) => x.hours_in_bed)),
    sleepPerf: avg(s.filter((x) => !x.nap).map((x) => x.performance)),
    strain: avg(st.map((x) => x.strain)),
    workouts: w.length,
    workoutMinutes: w.reduce((a, x) => a + x.minutes, 0),
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 text-sm text-neutral-400">Range:</span>
        {RANGES.map((opt) => (
          <button
            key={opt.days}
            onClick={() => setDays(opt.days)}
            className={`rounded border px-3 py-1 text-xs font-medium ${
              days === opt.days
                ? "border-white bg-white text-black"
                : "border-neutral-700 hover:bg-neutral-900"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Avg recovery" value={fmt(stats.recovery, 0)} suffix="%" />
        <Stat label="Avg HRV" value={fmt(stats.hrv, 1)} suffix=" ms" />
        <Stat label="Avg RHR" value={fmt(stats.rhr, 0)} suffix=" bpm" />
        <Stat label="Avg strain" value={fmt(stats.strain, 1)} />
        <Stat label="Avg sleep" value={fmt(stats.sleepHours, 1)} suffix=" h" />
        <Stat label="Avg sleep perf" value={fmt(stats.sleepPerf, 0)} suffix="%" />
        <Stat label="Workouts" value={String(stats.workouts)} />
        <Stat label="Workout time" value={fmt(stats.workoutMinutes / 60, 1)} suffix=" h" />
      </section>

      <Section title="Recovery score">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={r}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} stroke="#666" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
            <ReferenceLine y={67} stroke="#10b981" strokeDasharray="3 3" label={{ value: "green", fill: "#10b981", fontSize: 10 }} />
            <ReferenceLine y={34} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "yellow", fill: "#f59e0b", fontSize: 10 }} />
            <Line type="monotone" dataKey="recovery_score" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      <Section title="HRV (RMSSD)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={r}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 11 }} />
            <YAxis stroke="#666" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
            <Line type="monotone" dataKey="hrv" stroke="#60a5fa" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Resting heart rate">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={r}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 11 }} />
            <YAxis stroke="#666" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
            <Line type="monotone" dataKey="rhr" stroke="#f87171" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Sleep stages (hours)">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={s.filter((x) => !x.nap)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 11 }} />
            <YAxis stroke="#666" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="swp" stackId="a" fill="#1d4ed8" name="Deep" />
            <Bar dataKey="rem" stackId="a" fill="#7c3aed" name="REM" />
            <Bar dataKey="light" stackId="a" fill="#60a5fa" name="Light" />
            <Bar dataKey="awake" stackId="a" fill="#374151" name="Awake" />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Daily strain">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={st}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 21]} stroke="#666" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
            <Bar dataKey="strain" fill="#fbbf24" />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Avg heart rate (cycle)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={st}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 11 }} />
            <YAxis stroke="#666" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
            <Line type="monotone" dataKey="avg_hr" stroke="#fb7185" strokeWidth={2} dot={false} name="avg HR" />
            <Line type="monotone" dataKey="max_hr" stroke="#a78bfa" strokeWidth={2} dot={false} name="max HR" />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      <Section title={`Workouts (${w.length})`}>
        <div className="max-h-80 overflow-auto rounded border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-neutral-900 text-neutral-400">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-right">Strain</th>
                <th className="p-2 text-right">Minutes</th>
                <th className="p-2 text-right">kJ</th>
                <th className="p-2 text-right">Sport</th>
              </tr>
            </thead>
            <tbody>
              {w.slice().reverse().map((x, i) => (
                <tr key={i} className="border-t border-neutral-800">
                  <td className="p-2">{x.day}</td>
                  <td className="p-2 text-right">{fmt(x.strain, 1)}</td>
                  <td className="p-2 text-right">{x.minutes}</td>
                  <td className="p-2 text-right">{fmt(x.kj, 0)}</td>
                  <td className="p-2 text-right text-neutral-400">{x.sport_id ?? "—"}</td>
                </tr>
              ))}
              {!w.length && (
                <tr><td colSpan={5} className="p-3 text-neutral-500">No workouts in range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function Stat({ label, value, suffix = "" }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">
        {value}
        <span className="text-base text-neutral-400">{suffix}</span>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
