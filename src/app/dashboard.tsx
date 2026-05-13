"use client";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { avg, fmt, pearson, rollingAvg, pctDelta } from "@/lib/stats";
import { sportName } from "@/lib/sports";

export type Recovery = { day: string; recovery_score: number | null; hrv: number | null; rhr: number | null; spo2: number | null; skin_temp: number | null };
export type Sleep = {
  day: string;
  hours_in_bed: number;
  rem: number;
  swp: number;
  light: number;
  awake: number;
  performance: number | null;
  efficiency: number | null;
  consistency: number | null;
  disturbances: number | null;
  respiratory_rate: number | null;
  nap: boolean;
};
export type Strain = { day: string; strain: number | null; avg_hr: number | null; max_hr: number | null; kj: number | null };
export type Workout = { day: string; sport_id: number | null; strain: number | null; kj: number | null; minutes: number; avg_hr: number | null; max_hr: number | null };
export type Annotation = { id: string; day: string; tag: string; value: number | null; note: string | null; created_at: string };

const RANGES = [
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
  { label: "All", days: 9999 },
];

const TABS = ["Overview", "Recovery", "Sleep", "Strain", "Workouts", "Correlations", "Annotations"] as const;
type Tab = typeof TABS[number];

const PRESET_TAGS = [
  "smoked",
  "alcohol",
  "caffeine late",
  "late meal",
  "fasted",
  "sick",
  "travel",
  "stressful day",
  "sauna",
  "cold plunge",
  "period",
  "supplement",
  "sex",
  "argument",
  "good day",
];

const TOOLTIP_STYLE = { background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 12 } as const;

export default function Dashboard({
  recovery,
  sleep,
  strain,
  workouts,
  annotations: initialAnnotations,
  lastSync,
}: {
  recovery: Recovery[];
  sleep: Sleep[];
  strain: Strain[];
  workouts: Workout[];
  annotations: Annotation[];
  lastSync: string | null;
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [days, setDays] = useState(90);
  const [annotations, setAnnotations] = useState(initialAnnotations);

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }, [days]);

  const r = recovery.filter((x) => x.day >= cutoff);
  const s = sleep.filter((x) => x.day >= cutoff);
  const st = strain.filter((x) => x.day >= cutoff);
  const w = workouts.filter((x) => x.day >= cutoff);
  const ann = annotations.filter((x) => x.day >= cutoff);

  const annByDay = useMemo(() => {
    const m = new Map<string, Annotation[]>();
    for (const a of ann) {
      const arr = m.get(a.day) ?? [];
      arr.push(a);
      m.set(a.day, arr);
    }
    return m;
  }, [ann]);

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-6 md:-mx-8 border-b border-neutral-900 bg-black/80 px-6 md:px-8 py-3 backdrop-blur">
        <nav className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                tab === t ? "bg-white text-black font-medium" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            {lastSync && (
              <span className="hidden md:inline text-xs text-neutral-500">
                last sync {new Date(lastSync).toLocaleString()}
              </span>
            )}
            {RANGES.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setDays(opt.days)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  days === opt.days
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {tab === "Overview" && <Overview recovery={r} sleep={s} strain={st} workouts={w} annByDay={annByDay} />}
      {tab === "Recovery" && <RecoveryTab recovery={r} annByDay={annByDay} />}
      {tab === "Sleep" && <SleepTab sleep={s} />}
      {tab === "Strain" && <StrainTab strain={st} />}
      {tab === "Workouts" && <WorkoutsTab workouts={w} />}
      {tab === "Correlations" && <CorrelationsTab recovery={r} sleep={s} strain={st} />}
      {tab === "Annotations" && (
        <AnnotationsTab
          annotations={ann}
          allAnnotations={annotations}
          recovery={r}
          sleep={s}
          strain={st}
          onChange={setAnnotations}
        />
      )}
    </div>
  );
}

// ---------- subcomponents ----------

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-neutral-800 bg-gradient-to-b from-neutral-900/50 to-neutral-900/20 p-4 ${className}`}>{children}</div>;
}

function Stat({ label, value, suffix = "", trend }: { label: string; value: string; suffix?: string; trend?: number | null }) {
  const trendColor = trend == null ? "text-neutral-500" : trend > 0 ? "text-emerald-400" : "text-red-400";
  const arrow = trend == null ? "" : trend > 0 ? "↗" : "↘";
  return (
    <Card>
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold">{value}</span>
        <span className="text-base text-neutral-400">{suffix}</span>
        {trend != null && (
          <span className={`ml-auto text-xs ${trendColor}`}>
            {arrow} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </Card>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <span className="text-xs text-neutral-500">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

// ---------- Overview ----------

function Overview({
  recovery,
  sleep,
  strain,
  workouts,
  annByDay,
}: {
  recovery: Recovery[];
  sleep: Sleep[];
  strain: Strain[];
  workouts: Workout[];
  annByDay: Map<string, Annotation[]>;
}) {
  const half = Math.floor(recovery.length / 2);
  const currentAvg = avg(recovery.slice(half).map((x) => x.recovery_score));
  const prevAvg = avg(recovery.slice(0, half).map((x) => x.recovery_score));

  const stats = {
    recovery: avg(recovery.map((x) => x.recovery_score)),
    recoveryTrend: pctDelta(currentAvg, prevAvg),
    hrv: avg(recovery.map((x) => x.hrv)),
    rhr: avg(recovery.map((x) => x.rhr)),
    sleepHours: avg(sleep.filter((x) => !x.nap).map((x) => x.hours_in_bed)),
    sleepPerf: avg(sleep.filter((x) => !x.nap).map((x) => x.performance)),
    strain: avg(strain.map((x) => x.strain)),
    workouts: workouts.length,
    workoutMinutes: workouts.reduce((a, x) => a + x.minutes, 0),
  };

  const recWithRolling = rollingAvg(recovery, "recovery_score", 7);

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Avg recovery" value={fmt(stats.recovery, 0)} suffix="%" trend={stats.recoveryTrend} />
        <Stat label="Avg HRV" value={fmt(stats.hrv, 1)} suffix=" ms" />
        <Stat label="Avg RHR" value={fmt(stats.rhr, 0)} suffix=" bpm" />
        <Stat label="Avg strain" value={fmt(stats.strain, 1)} />
        <Stat label="Avg sleep" value={fmt(stats.sleepHours, 1)} suffix=" h" />
        <Stat label="Sleep perf" value={fmt(stats.sleepPerf, 0)} suffix="%" />
        <Stat label="Workouts" value={String(stats.workouts)} />
        <Stat label="Workout time" value={fmt(stats.workoutMinutes / 60, 1)} suffix=" h" />
      </section>

      <Section title="Recovery (7-day rolling)">
        <Card>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={recWithRolling}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} stroke="#666" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <ReferenceLine y={67} stroke="#10b981" strokeDasharray="3 3" />
              <ReferenceLine y={34} stroke="#f59e0b" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="recovery_score" stroke="#10b981" strokeWidth={1.5} dot={false} name="Daily" />
              <Line type="monotone" dataKey="rolling" stroke="#fbbf24" strokeWidth={2.5} dot={false} name="7d avg" />
              {[...annByDay.entries()].map(([day, anns]) => {
                const row = recWithRolling.find((x) => x.day === day);
                if (!row?.recovery_score) return null;
                return <ReferenceDot key={day} x={day} y={row.recovery_score} r={4} fill="#a78bfa" stroke="#fff" strokeWidth={1} />;
              })}
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-neutral-500">Purple dots = annotated days. Switch to <em>Annotations</em> tab to add.</p>
        </Card>
      </Section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Section title="Sleep stages">
          <Card>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sleep.filter((x) => !x.nap)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 10 }} />
                <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="swp" stackId="a" fill="#1d4ed8" name="Deep" />
                <Bar dataKey="rem" stackId="a" fill="#7c3aed" name="REM" />
                <Bar dataKey="light" stackId="a" fill="#60a5fa" name="Light" />
                <Bar dataKey="awake" stackId="a" fill="#374151" name="Awake" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>
        <Section title="Daily strain">
          <Card>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={strain}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 21]} stroke="#666" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="strain" fill="#fbbf24" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>
      </div>
    </div>
  );
}

// ---------- Recovery tab ----------

function RecoveryTab({ recovery, annByDay }: { recovery: Recovery[]; annByDay: Map<string, Annotation[]> }) {
  const rRoll = rollingAvg(recovery, "recovery_score", 7);
  const hrvRoll = rollingAvg(recovery, "hrv", 7);
  const rhrRoll = rollingAvg(recovery, "rhr", 7);

  const lowDays = recovery.filter((x) => (x.recovery_score ?? 100) < 34).sort((a, b) => b.day.localeCompare(a.day));
  const highDays = recovery.filter((x) => (x.recovery_score ?? 0) >= 67).sort((a, b) => b.day.localeCompare(a.day));

  const hrvAvg = avg(recovery.map((x) => x.hrv));
  const hrvAnomalies = recovery.filter((x) => x.hrv != null && hrvAvg != null && x.hrv < hrvAvg * 0.7);

  return (
    <div className="space-y-8">
      <Section title="Recovery score" subtitle="Daily + 7-day rolling avg + annotations">
        <Card>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={rRoll}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} stroke="#666" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <ReferenceLine y={67} stroke="#10b981" strokeDasharray="3 3" label={{ value: "green", fill: "#10b981", fontSize: 10 }} />
              <ReferenceLine y={34} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "yellow", fill: "#f59e0b", fontSize: 10 }} />
              <Line type="monotone" dataKey="recovery_score" stroke="#10b981" strokeWidth={1.5} dot={false} name="Daily" />
              <Line type="monotone" dataKey="rolling" stroke="#fbbf24" strokeWidth={2.5} dot={false} name="7d avg" />
              {[...annByDay.entries()].map(([day]) => {
                const row = rRoll.find((x) => x.day === day);
                if (!row?.recovery_score) return null;
                return <ReferenceDot key={day} x={day} y={row.recovery_score} r={4} fill="#a78bfa" stroke="#fff" strokeWidth={1} />;
              })}
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Section title="HRV (RMSSD)">
          <Card>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={hrvRoll}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 11 }} />
                <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="hrv" stroke="#60a5fa" strokeWidth={1.5} dot={false} name="Daily" />
                <Line type="monotone" dataKey="rolling" stroke="#fbbf24" strokeWidth={2} dot={false} name="7d avg" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Section>
        <Section title="Resting HR">
          <Card>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={rhrRoll}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 11 }} />
                <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="rhr" stroke="#f87171" strokeWidth={1.5} dot={false} name="Daily" />
                <Line type="monotone" dataKey="rolling" stroke="#fbbf24" strokeWidth={2} dot={false} name="7d avg" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Section title={`🔴 Low recovery (${lowDays.length})`} subtitle="< 34%">
          <Card className="max-h-72 overflow-auto">
            <ul className="space-y-1 text-sm">
              {lowDays.map((d) => (
                <li key={d.day} className="flex items-baseline justify-between border-b border-neutral-800 py-1">
                  <span className="text-neutral-300">{d.day}</span>
                  <span className="text-red-400 font-medium">{d.recovery_score}%</span>
                </li>
              ))}
              {!lowDays.length && <li className="text-neutral-500">None 🎉</li>}
            </ul>
          </Card>
        </Section>
        <Section title={`🟢 High recovery (${highDays.length})`} subtitle="≥ 67%">
          <Card className="max-h-72 overflow-auto">
            <ul className="space-y-1 text-sm">
              {highDays.map((d) => (
                <li key={d.day} className="flex items-baseline justify-between border-b border-neutral-800 py-1">
                  <span className="text-neutral-300">{d.day}</span>
                  <span className="text-emerald-400 font-medium">{d.recovery_score}%</span>
                </li>
              ))}
              {!highDays.length && <li className="text-neutral-500">—</li>}
            </ul>
          </Card>
        </Section>
        <Section title={`⚠️ HRV anomalies (${hrvAnomalies.length})`} subtitle={`< 70% of avg (${fmt(hrvAvg)} ms)`}>
          <Card className="max-h-72 overflow-auto">
            <ul className="space-y-1 text-sm">
              {hrvAnomalies.map((d) => (
                <li key={d.day} className="flex items-baseline justify-between border-b border-neutral-800 py-1">
                  <span className="text-neutral-300">{d.day}</span>
                  <span className="text-amber-400 font-medium">{fmt(d.hrv, 1)} ms</span>
                </li>
              ))}
              {!hrvAnomalies.length && <li className="text-neutral-500">None</li>}
            </ul>
          </Card>
        </Section>
      </div>
    </div>
  );
}

// ---------- Sleep tab ----------

function SleepTab({ sleep }: { sleep: Sleep[] }) {
  const nonNap = sleep.filter((x) => !x.nap);
  const naps = sleep.filter((x) => x.nap);

  const stats = {
    perf: avg(nonNap.map((x) => x.performance)),
    eff: avg(nonNap.map((x) => x.efficiency)),
    consistency: avg(nonNap.map((x) => x.consistency)),
    inBed: avg(nonNap.map((x) => x.hours_in_bed)),
    deep: avg(nonNap.map((x) => x.swp)),
    rem: avg(nonNap.map((x) => x.rem)),
    disturbances: avg(nonNap.map((x) => x.disturbances)),
    rr: avg(nonNap.map((x) => x.respiratory_rate)),
  };

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Sleep perf" value={fmt(stats.perf, 0)} suffix="%" />
        <Stat label="Efficiency" value={fmt(stats.eff, 0)} suffix="%" />
        <Stat label="Consistency" value={fmt(stats.consistency, 0)} suffix="%" />
        <Stat label="In bed" value={fmt(stats.inBed, 1)} suffix=" h" />
        <Stat label="Deep" value={fmt(stats.deep, 2)} suffix=" h" />
        <Stat label="REM" value={fmt(stats.rem, 2)} suffix=" h" />
        <Stat label="Disturbances" value={fmt(stats.disturbances, 1)} />
        <Stat label="Resp rate" value={fmt(stats.rr, 1)} />
      </section>

      <Section title="Sleep stages">
        <Card>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={nonNap}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 11 }} />
              <YAxis stroke="#666" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="swp" stackId="a" fill="#1d4ed8" name="Deep" />
              <Bar dataKey="rem" stackId="a" fill="#7c3aed" name="REM" />
              <Bar dataKey="light" stackId="a" fill="#60a5fa" name="Light" />
              <Bar dataKey="awake" stackId="a" fill="#374151" name="Awake" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Section title="Sleep performance %">
          <Card>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={nonNap}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} stroke="#666" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="performance" stroke="#a78bfa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Section>
        <Section title="Disturbances / night">
          <Card>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={nonNap}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 10 }} />
                <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="disturbances" fill="#f87171" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>
      </div>

      <Section title={`Naps (${naps.length})`}>
        <Card>
          {naps.length ? (
            <ul className="space-y-1 text-sm">
              {naps.slice().reverse().map((n, i) => (
                <li key={i} className="flex justify-between border-b border-neutral-800 py-1">
                  <span>{n.day}</span>
                  <span className="text-neutral-400">{fmt(n.hours_in_bed, 1)}h · {fmt(n.performance, 0)}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-neutral-500 text-sm">No naps in range.</p>
          )}
        </Card>
      </Section>
    </div>
  );
}

// ---------- Strain tab ----------

function StrainTab({ strain }: { strain: Strain[] }) {
  const stats = {
    avg: avg(strain.map((x) => x.strain)),
    avgHr: avg(strain.map((x) => x.avg_hr)),
    maxHr: avg(strain.map((x) => x.max_hr)),
    totalKj: strain.reduce((a, x) => a + (x.kj ?? 0), 0),
  };

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Avg strain" value={fmt(stats.avg, 1)} />
        <Stat label="Avg HR" value={fmt(stats.avgHr, 0)} suffix=" bpm" />
        <Stat label="Avg max HR" value={fmt(stats.maxHr, 0)} suffix=" bpm" />
        <Stat label="Total kJ" value={fmt(stats.totalKj, 0)} />
      </section>

      <Section title="Daily strain">
        <Card>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={strain}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 21]} stroke="#666" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="strain" fill="#fbbf24" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Section>

      <Section title="Heart rate trend">
        <Card>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={strain}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 11 }} />
              <YAxis stroke="#666" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="avg_hr" stroke="#fb7185" strokeWidth={2} dot={false} name="avg HR" />
              <Line type="monotone" dataKey="max_hr" stroke="#a78bfa" strokeWidth={2} dot={false} name="max HR" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Section>
    </div>
  );
}

// ---------- Workouts tab ----------

function WorkoutsTab({ workouts }: { workouts: Workout[] }) {
  const bySport = useMemo(() => {
    const m = new Map<number, { count: number; minutes: number; strain: number }>();
    for (const w of workouts) {
      if (w.sport_id == null) continue;
      const cur = m.get(w.sport_id) ?? { count: 0, minutes: 0, strain: 0 };
      cur.count++;
      cur.minutes += w.minutes;
      cur.strain += w.strain ?? 0;
      m.set(w.sport_id, cur);
    }
    return [...m.entries()]
      .map(([id, v]) => ({ name: sportName(id), ...v, avgStrain: v.strain / v.count }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [workouts]);

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Workouts" value={String(workouts.length)} />
        <Stat label="Total time" value={fmt(workouts.reduce((a, x) => a + x.minutes, 0) / 60, 1)} suffix=" h" />
        <Stat label="Avg strain" value={fmt(avg(workouts.map((x) => x.strain)), 1)} />
        <Stat label="Sports" value={String(bySport.length)} />
      </section>

      <Section title="Time by sport">
        <Card>
          <ResponsiveContainer width="100%" height={Math.max(240, bySport.length * 32)}>
            <BarChart data={bySport} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis type="number" stroke="#666" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" stroke="#aaa" tick={{ fontSize: 11 }} width={120} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="minutes" fill="#34d399" name="minutes" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Section>

      <Section title={`All workouts (${workouts.length})`}>
        <Card>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Sport</th>
                  <th className="p-2 text-right">Strain</th>
                  <th className="p-2 text-right">Min</th>
                  <th className="p-2 text-right">Avg HR</th>
                  <th className="p-2 text-right">Max HR</th>
                  <th className="p-2 text-right">kJ</th>
                </tr>
              </thead>
              <tbody>
                {workouts.slice().reverse().map((x, i) => (
                  <tr key={i} className="border-t border-neutral-800">
                    <td className="p-2">{x.day}</td>
                    <td className="p-2 text-neutral-300">{sportName(x.sport_id)}</td>
                    <td className="p-2 text-right">{fmt(x.strain, 1)}</td>
                    <td className="p-2 text-right">{x.minutes}</td>
                    <td className="p-2 text-right">{x.avg_hr ?? "—"}</td>
                    <td className="p-2 text-right">{x.max_hr ?? "—"}</td>
                    <td className="p-2 text-right">{fmt(x.kj, 0)}</td>
                  </tr>
                ))}
                {!workouts.length && <tr><td colSpan={7} className="p-3 text-neutral-500">No workouts in range.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>
    </div>
  );
}

// ---------- Correlations ----------

function CorrelationsTab({ recovery, sleep, strain }: { recovery: Recovery[]; sleep: Sleep[]; strain: Strain[] }) {
  const recByDay = new Map(recovery.map((r) => [r.day, r]));
  const slpByDay = new Map(sleep.filter((s) => !s.nap).map((s) => [s.day, s]));
  const strByDay = new Map(strain.map((s) => [s.day, s]));

  // sleep perf vs next-day recovery
  const sleepVsRecovery = [...slpByDay.entries()]
    .map(([day, s]) => {
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const nextDay = next.toISOString().slice(0, 10);
      const r = recByDay.get(nextDay);
      if (!r || r.recovery_score == null || s.performance == null) return null;
      return { x: s.performance, y: r.recovery_score, day };
    })
    .filter((x): x is { x: number; y: number; day: string } => x != null);

  // previous-day strain vs recovery
  const strainVsRecovery = [...strByDay.entries()]
    .map(([day, s]) => {
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const nextDay = next.toISOString().slice(0, 10);
      const r = recByDay.get(nextDay);
      if (!r || r.recovery_score == null || s.strain == null) return null;
      return { x: s.strain, y: r.recovery_score, day };
    })
    .filter((x): x is { x: number; y: number; day: string } => x != null);

  // sleep hours vs HRV
  const sleepVsHrv = [...slpByDay.entries()]
    .map(([day, s]) => {
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const nextDay = next.toISOString().slice(0, 10);
      const r = recByDay.get(nextDay);
      if (!r || r.hrv == null || s.hours_in_bed == null) return null;
      return { x: s.hours_in_bed, y: r.hrv, day };
    })
    .filter((x): x is { x: number; y: number; day: string } => x != null);

  const corr1 = pearson(sleepVsRecovery.map((x) => x.x), sleepVsRecovery.map((x) => x.y));
  const corr2 = pearson(strainVsRecovery.map((x) => x.x), strainVsRecovery.map((x) => x.y));
  const corr3 = pearson(sleepVsHrv.map((x) => x.x), sleepVsHrv.map((x) => x.y));

  return (
    <div className="space-y-8">
      <p className="text-sm text-neutral-400">Pearson correlation — closer to +1 means strong positive, −1 strong negative. Below ~0.2 is noise.</p>

      <ScatterCard title="Sleep performance → next-day recovery" xLabel="Sleep perf %" yLabel="Recovery %" data={sleepVsRecovery} corr={corr1} />
      <ScatterCard title="Day-before strain → recovery" xLabel="Strain" yLabel="Recovery %" data={strainVsRecovery} corr={corr2} />
      <ScatterCard title="Time in bed → next-day HRV" xLabel="Hours in bed" yLabel="HRV (ms)" data={sleepVsHrv} corr={corr3} />
    </div>
  );
}

function ScatterCard({ title, xLabel, yLabel, data, corr }: {
  title: string;
  xLabel: string;
  yLabel: string;
  data: { x: number; y: number; day: string }[];
  corr: number | null;
}) {
  const strength =
    corr == null ? "—" :
    Math.abs(corr) >= 0.5 ? "strong" :
    Math.abs(corr) >= 0.3 ? "moderate" :
    Math.abs(corr) >= 0.15 ? "weak" : "noise";
  const dir = corr == null ? "" : corr > 0 ? "+" : "−";
  return (
    <Section title={title} subtitle={`r = ${corr == null ? "—" : dir + Math.abs(corr).toFixed(2)} (${strength}, n=${data.length})`}>
      <Card>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
            <XAxis type="number" dataKey="x" stroke="#666" tick={{ fontSize: 11 }} name={xLabel} label={{ value: xLabel, fill: "#666", fontSize: 11, position: "insideBottom", offset: -5 }} />
            <YAxis type="number" dataKey="y" stroke="#666" tick={{ fontSize: 11 }} name={yLabel} label={{ value: yLabel, fill: "#666", fontSize: 11, angle: -90, position: "insideLeft" }} />
            <ZAxis range={[40, 40]} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: any) => Number(v).toFixed(1)}
              labelFormatter={() => ""}
              cursor={{ strokeDasharray: "3 3" }}
            />
            <Scatter data={data} fill="#10b981" />
          </ScatterChart>
        </ResponsiveContainer>
      </Card>
    </Section>
  );
}

// ---------- Annotations ----------

function AnnotationsTab({
  annotations,
  allAnnotations,
  recovery,
  sleep,
  strain,
  onChange,
}: {
  annotations: Annotation[];
  allAnnotations: Annotation[];
  recovery: Recovery[];
  sleep: Sleep[];
  strain: Strain[];
  onChange: (next: Annotation[]) => void;
}) {
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [tag, setTag] = useState(PRESET_TAGS[0]);
  const [customTag, setCustomTag] = useState("");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const finalTag = (customTag.trim() || tag).toLowerCase();
      const r = await fetch("/api/annotations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          day,
          tag: finalTag,
          value: value ? Number(value) : null,
          note: note || null,
        }),
      });
      const j = await r.json();
      if (j.annotation) {
        onChange([j.annotation, ...allAnnotations]);
        setCustomTag("");
        setValue("");
        setNote("");
      } else {
        alert(j.error ?? "failed");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this annotation?")) return;
    await fetch(`/api/annotations?id=${id}`, { method: "DELETE" });
    onChange(allAnnotations.filter((a) => a.id !== id));
  }

  // tag impact: avg recovery on tagged days vs all
  const recByDay = new Map(recovery.map((r) => [r.day, r]));
  const overallRec = avg(recovery.map((r) => r.recovery_score));
  const overallHrv = avg(recovery.map((r) => r.hrv));

  const tagsSeen = [...new Set(annotations.map((a) => a.tag))].sort();
  const impact = tagsSeen.map((t) => {
    const days = annotations.filter((a) => a.tag === t).map((a) => a.day);
    const recs = days.map((d) => recByDay.get(d)?.recovery_score).filter((x): x is number => typeof x === "number");
    const hrvs = days.map((d) => recByDay.get(d)?.hrv).filter((x): x is number => typeof x === "number");
    return {
      tag: t,
      count: days.length,
      avgRec: avg(recs),
      avgHrv: avg(hrvs),
      delta: avg(recs) != null && overallRec != null ? avg(recs)! - overallRec : null,
      hrvDelta: avg(hrvs) != null && overallHrv != null ? avg(hrvs)! - overallHrv : null,
    };
  });

  return (
    <div className="space-y-8">
      <Section title="Add annotation" subtitle="Tag a day with a life event to correlate with biometrics">
        <Card>
          <form onSubmit={add} className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <div className="md:col-span-1">
              <label className="block text-xs text-neutral-400">Date</label>
              <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 w-full rounded border border-neutral-700 bg-black px-2 py-1.5 text-sm" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs text-neutral-400">Tag</label>
              <select value={tag} onChange={(e) => setTag(e.target.value)} className="mt-1 w-full rounded border border-neutral-700 bg-black px-2 py-1.5 text-sm">
                {PRESET_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs text-neutral-400">Custom tag</label>
              <input value={customTag} onChange={(e) => setCustomTag(e.target.value)} placeholder="overrides preset" className="mt-1 w-full rounded border border-neutral-700 bg-black px-2 py-1.5 text-sm" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs text-neutral-400">Value (optional)</label>
              <input type="number" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 3 units" className="mt-1 w-full rounded border border-neutral-700 bg-black px-2 py-1.5 text-sm" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs text-neutral-400">Note</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded border border-neutral-700 bg-black px-2 py-1.5 text-sm" />
            </div>
            <div className="md:col-span-1 flex items-end">
              <button disabled={busy} className="w-full rounded bg-white px-3 py-1.5 text-sm font-medium text-black disabled:opacity-50">
                {busy ? "…" : "Add"}
              </button>
            </div>
          </form>
        </Card>
      </Section>

      <Section title="Tag impact" subtitle="Avg recovery / HRV on tagged days vs overall">
        <Card>
          {impact.length ? (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-neutral-400">
                  <tr>
                    <th className="p-2 text-left">Tag</th>
                    <th className="p-2 text-right">N</th>
                    <th className="p-2 text-right">Avg recovery</th>
                    <th className="p-2 text-right">Δ vs overall</th>
                    <th className="p-2 text-right">Avg HRV</th>
                    <th className="p-2 text-right">Δ HRV</th>
                  </tr>
                </thead>
                <tbody>
                  {impact.map((i) => (
                    <tr key={i.tag} className="border-t border-neutral-800">
                      <td className="p-2 font-medium">{i.tag}</td>
                      <td className="p-2 text-right">{i.count}</td>
                      <td className="p-2 text-right">{fmt(i.avgRec, 0)}%</td>
                      <td className={`p-2 text-right font-medium ${i.delta != null && i.delta < 0 ? "text-red-400" : i.delta != null && i.delta > 0 ? "text-emerald-400" : "text-neutral-500"}`}>
                        {i.delta == null ? "—" : (i.delta > 0 ? "+" : "") + i.delta.toFixed(1)}
                      </td>
                      <td className="p-2 text-right">{fmt(i.avgHrv, 1)}</td>
                      <td className={`p-2 text-right ${i.hrvDelta != null && i.hrvDelta < 0 ? "text-red-400" : i.hrvDelta != null && i.hrvDelta > 0 ? "text-emerald-400" : "text-neutral-500"}`}>
                        {i.hrvDelta == null ? "—" : (i.hrvDelta > 0 ? "+" : "") + i.hrvDelta.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-neutral-500">Overall avg recovery: {fmt(overallRec, 0)}% · HRV {fmt(overallHrv, 1)} ms · range: current filter</p>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No annotations in range yet. Add some above.</p>
          )}
        </Card>
      </Section>

      <Section title={`All annotations (${allAnnotations.length})`}>
        <Card>
          {allAnnotations.length ? (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-neutral-900 text-neutral-400">
                  <tr>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Tag</th>
                    <th className="p-2 text-right">Value</th>
                    <th className="p-2 text-left">Note</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {allAnnotations.map((a) => (
                    <tr key={a.id} className="border-t border-neutral-800">
                      <td className="p-2">{a.day}</td>
                      <td className="p-2"><span className="rounded bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">{a.tag}</span></td>
                      <td className="p-2 text-right">{a.value ?? "—"}</td>
                      <td className="p-2 text-neutral-400">{a.note ?? ""}</td>
                      <td className="p-2 text-right">
                        <button onClick={() => remove(a.id)} className="text-xs text-red-400 hover:text-red-300">delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No annotations yet.</p>
          )}
        </Card>
      </Section>
    </div>
  );
}
