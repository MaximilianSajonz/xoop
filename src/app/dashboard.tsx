"use client";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { avg, fmt, pearson, rollingAvg, pctDelta, linearRegression, median } from "@/lib/stats";
import { sportName } from "@/lib/sports";
import { detectIntimacy, detectLateNight, detectMystery, detectRecoveryCliffs, detectHrvCrashes } from "@/lib/insights";

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
export type Workout = {
  day: string;
  start_ts: string;
  end_ts: string | null;
  sport_id: number | null;
  strain: number | null;
  kj: number | null;
  minutes: number;
  avg_hr: number | null;
  max_hr: number | null;
  zones?: { z0: number; z1: number; z2: number; z3: number; z4: number; z5: number };
};

const RANGES = [
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
  { label: "All", days: 9999 },
];

const TABS = ["Overview", "Recovery", "Sleep", "Strain", "Workouts", "Analyse", "Compare", "Insights", "Correlations"] as const;
type Tab = typeof TABS[number];

const TOOLTIP_STYLE = { background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 12 } as const;

export default function Dashboard({
  recovery,
  sleep,
  strain,
  workouts,
  lastSync,
}: {
  recovery: Recovery[];
  sleep: Sleep[];
  strain: Strain[];
  workouts: Workout[];
  lastSync: string | null;
}) {
  const [tab, setTab] = useState<Tab>("Overview");
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

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 border-b border-neutral-900/80 bg-black/70 px-4 sm:px-6 lg:px-8 py-2.5 backdrop-blur-xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <nav className="tabs-scroll -mx-1 flex gap-0.5 overflow-x-auto px-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition ${
                  tab === t
                    ? "bg-white text-black font-medium shadow-lg shadow-white/5"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            {lastSync && (
              <span className="hidden lg:inline text-[11px] text-neutral-600">
                synced {new Date(lastSync).toLocaleDateString([], { month: "short", day: "numeric" })} {new Date(lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <div className="flex items-center gap-0.5 rounded-lg border border-neutral-800/80 bg-neutral-950/50 p-0.5">
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
          </div>
        </div>
      </div>

      {tab === "Overview" && <Overview recovery={r} sleep={s} strain={st} workouts={w} />}
      {tab === "Recovery" && <RecoveryTab recovery={r} />}
      {tab === "Sleep" && <SleepTab sleep={s} />}
      {tab === "Strain" && <StrainTab strain={st} />}
      {tab === "Workouts" && <WorkoutsTab workouts={w} />}
      {tab === "Analyse" && <AnalyseTab recovery={recovery} sleep={sleep} strain={strain} workouts={workouts} />}
      {tab === "Compare" && <CompareTab recovery={recovery} sleep={sleep} strain={strain} workouts={workouts} />}
      {tab === "Insights" && <InsightsTab workouts={w} recovery={r} />}
      {tab === "Correlations" && <CorrelationsTab recovery={r} sleep={s} strain={st} />}
    </div>
  );
}

// ---------- subcomponents ----------

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-neutral-800/60 bg-gradient-to-br from-neutral-900/60 via-neutral-950/40 to-neutral-950/60 p-4 sm:p-5 backdrop-blur-sm transition hover:border-neutral-700/60 ${className}`}>
      {children}
    </div>
  );
}

function Stat({ label, value, suffix = "", trend }: { label: string; value: string; suffix?: string; trend?: number | null }) {
  const trendColor = trend == null ? "text-neutral-500" : trend > 0 ? "text-emerald-400" : "text-red-400";
  const arrow = trend == null ? "" : trend > 0 ? "↗" : "↘";
  return (
    <Card>
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl sm:text-3xl font-semibold tabular-nums">{value}</span>
        <span className="text-sm text-neutral-400">{suffix}</span>
        {trend != null && (
          <span className={`ml-auto text-xs font-medium ${trendColor}`}>
            {arrow} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </Card>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="fade-in">
      <div className="mb-3 flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-baseline">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight">{title}</h2>
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
}: {
  recovery: Recovery[];
  sleep: Sleep[];
  strain: Strain[];
  workouts: Workout[];
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
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </LineChart>
          </ResponsiveContainer>
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

function RecoveryTab({ recovery }: { recovery: Recovery[] }) {
  const rRoll = rollingAvg(recovery, "recovery_score", 7);
  const hrvRoll = rollingAvg(recovery, "hrv", 7);
  const rhrRoll = rollingAvg(recovery, "rhr", 7);

  return (
    <div className="space-y-8">
      <Section title="Recovery score" subtitle="Daily + 7-day rolling avg">
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
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Section>

      <Section title="Recovery heatmap" subtitle="green = recovered, red = depleted · hover any cell">
        <Card>
          <Heatmap
            data={recovery.map((r) => ({ day: r.day, value: r.recovery_score }))}
            colorFn={recoveryColor}
            fmtValue={(v) => (v == null ? "no data" : `${v}%`)}
            legend={RECOVERY_LEGEND}
          />
        </Card>
      </Section>

      <Section title="HRV heatmap" subtitle="brighter blue = higher HRV (better parasympathetic tone)">
        <Card>
          {(() => {
            const vals = recovery.map((r) => r.hrv).filter((v): v is number => typeof v === "number");
            const min = vals.length ? Math.min(...vals) : 0;
            const max = vals.length ? Math.max(...vals) : 100;
            return (
              <Heatmap
                data={recovery.map((r) => ({ day: r.day, value: r.hrv }))}
                colorFn={(v) => hrvGradient(v, min, max)}
                fmtValue={(v) => (v == null ? "no data" : `${v.toFixed(1)} ms`)}
                legend={[
                  { label: `${min.toFixed(0)}`, value: min },
                  { label: "", value: min + (max - min) * 0.25 },
                  { label: "", value: min + (max - min) * 0.5 },
                  { label: "", value: min + (max - min) * 0.75 },
                  { label: `${max.toFixed(0)} ms`, value: max },
                ]}
              />
            );
          })()}
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

      <Section title="Recovery distribution" subtitle="how many days in each band">
        <Card>
          <RecoveryDistribution data={recovery} />
        </Card>
      </Section>

      <Section title="Day-of-week pattern" subtitle="avg recovery by weekday">
        <Card>
          <WeekdayPattern data={recovery} />
        </Card>
      </Section>
    </div>
  );
}

// ---------- Calendar heatmap ----------

function recoveryColor(score: number | null | undefined): string {
  if (score == null) return "#161616";
  if (score >= 67) return `rgba(16, 185, 129, ${0.35 + (score - 67) / 90})`;
  if (score >= 34) return `rgba(245, 158, 11, ${0.35 + (score - 34) / 90})`;
  return `rgba(239, 68, 68, ${0.4 + (34 - score) / 60})`;
}

function intensityColor(rgb: [number, number, number]) {
  return (v: number | null | undefined, min: number, max: number): string => {
    if (v == null) return "#161616";
    const t = Math.max(0, Math.min(1, (v - min) / (max - min)));
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.25 + t * 0.75})`;
  };
}

const sleepPerfColor = (v: number | null | undefined) => {
  if (v == null) return "#161616";
  if (v >= 85) return `rgba(16, 185, 129, ${0.4 + (v - 85) / 60})`;
  if (v >= 70) return `rgba(245, 158, 11, ${0.4 + (v - 70) / 60})`;
  return `rgba(239, 68, 68, ${0.4 + (70 - v) / 100})`;
};

const strainGradient = intensityColor([251, 191, 36]); // amber
const hrvGradient = intensityColor([96, 165, 250]);    // blue
const sleepHoursGradient = intensityColor([124, 58, 237]); // purple
const workoutGradient = intensityColor([52, 211, 153]); // teal

type HeatmapPoint = { day: string; value: number | null };

function Heatmap({
  data,
  colorFn,
  fmtValue = (v) => (v == null ? "no data" : String(v)),
  legend,
  cell = 14,
  gap = 3,
}: {
  data: HeatmapPoint[];
  colorFn: (v: number | null) => string;
  fmtValue?: (v: number | null) => string;
  legend?: { label: string; value: number | null }[];
  cell?: number;
  gap?: number;
}) {
  const byDay = useMemo(() => new Map(data.map((d) => [d.day, d.value])), [data]);
  if (!data.length) return <p className="text-sm text-neutral-500">No data.</p>;

  const sorted = [...data].sort((a, b) => a.day.localeCompare(b.day));
  const firstDay = new Date(sorted[0].day);
  const lastDay = new Date(sorted[sorted.length - 1].day);

  const start = new Date(firstDay);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(lastDay);
  end.setDate(end.getDate() + (7 - ((end.getDay() + 6) % 7)) % 7);

  const weeks: { date: Date; dayStr: string }[][] = [];
  let cur = new Date(start);
  let week: { date: Date; dayStr: string }[] = [];
  while (cur <= end) {
    week.push({ date: new Date(cur), dayStr: cur.toISOString().slice(0, 10) });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    cur.setDate(cur.getDate() + 1);
  }
  if (week.length) weeks.push(week);

  // month label markers: index into weeks where a new month starts in week's first day
  const monthMarkers: { col: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((w, i) => {
    const m = w[0].date.getMonth();
    if (m !== lastMonth) {
      const label = w[0].date.toLocaleDateString("en-US", { month: "short" });
      const yearSwitch = w[0].date.getMonth() === 0 ? ` ${w[0].date.getFullYear()}` : "";
      monthMarkers.push({ col: i, label: label + yearSwitch });
      lastMonth = m;
    }
  });

  const colWidth = cell + gap;
  const weekdayLabels = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
  const labelWidth = 32;
  const gridWidth = weeks.length * colWidth;

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        <div className="relative h-4 text-[10px] text-neutral-400" style={{ marginLeft: labelWidth, width: gridWidth }}>
          {monthMarkers.map((m, i) => (
            <span key={i} className="absolute top-0" style={{ left: m.col * colWidth }}>
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex" style={{ gap }}>
          <div className="flex flex-col text-[10px] text-neutral-500" style={{ gap, width: labelWidth }}>
            {weekdayLabels.map((d, i) => (
              <div key={i} style={{ height: cell, lineHeight: `${cell}px` }}>{d}</div>
            ))}
          </div>
          <div className="flex" style={{ gap }}>
            {weeks.map((w, i) => (
              <div key={i} className="flex flex-col" style={{ gap }}>
                {w.map((d) => {
                  const v = byDay.get(d.dayStr) ?? null;
                  const isFuture = d.date.getTime() > Date.now();
                  return (
                    <div
                      key={d.dayStr}
                      title={`${d.dayStr} — ${isFuture ? "—" : fmtValue(v)}`}
                      className="transition-transform hover:scale-150 hover:ring-1 hover:ring-white/40 hover:z-10 relative"
                      style={{
                        width: cell,
                        height: cell,
                        borderRadius: 3,
                        background: isFuture ? "transparent" : colorFn(v),
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {legend && (
          <div className="mt-3 flex items-center gap-2 text-[10px] text-neutral-500" style={{ marginLeft: labelWidth }}>
            <span>{legend[0]?.label}</span>
            {legend.map((l, i) => (
              <div key={i} style={{ width: cell, height: cell, borderRadius: 3, background: colorFn(l.value) }} />
            ))}
            <span>{legend[legend.length - 1]?.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const RECOVERY_LEGEND = [
  { label: "Low", value: 10 },
  { label: "", value: 30 },
  { label: "", value: 50 },
  { label: "", value: 70 },
  { label: "High", value: 90 },
];

// ---------- Distribution histogram ----------

function RecoveryDistribution({ data }: { data: Recovery[] }) {
  const bins = Array.from({ length: 10 }, (_, i) => ({ range: `${i * 10}-${i * 10 + 9}`, count: 0, mid: i * 10 + 5 }));
  for (const r of data) {
    if (r.recovery_score == null) continue;
    const idx = Math.min(9, Math.floor(r.recovery_score / 10));
    bins[idx].count++;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={bins}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
        <XAxis dataKey="range" stroke="#666" tick={{ fontSize: 11 }} />
        <YAxis stroke="#666" tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="count">
          {bins.map((b, i) => (
            <Cell key={i} fill={recoveryColor(b.mid)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------- Day-of-week pattern ----------

function WeekdayPattern({ data }: { data: Recovery[] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const bins = days.map((d) => ({ day: d, scores: [] as number[], hrvs: [] as number[] }));
  for (const r of data) {
    if (r.recovery_score == null) continue;
    const idx = (new Date(r.day).getDay() + 6) % 7;
    bins[idx].scores.push(r.recovery_score);
    if (r.hrv != null) bins[idx].hrvs.push(r.hrv);
  }
  const chart = bins.map((b) => ({
    day: b.day,
    recovery: b.scores.length ? b.scores.reduce((a, c) => a + c, 0) / b.scores.length : null,
    hrv: b.hrvs.length ? b.hrvs.reduce((a, c) => a + c, 0) / b.hrvs.length : null,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chart}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
        <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" stroke="#10b981" tick={{ fontSize: 11 }} domain={[0, 100]} />
        <YAxis yAxisId="right" orientation="right" stroke="#60a5fa" tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => (v == null ? "—" : Number(v).toFixed(1))} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId="left" dataKey="recovery" fill="#10b981" name="Recovery %" />
        <Bar yAxisId="right" dataKey="hrv" fill="#60a5fa" name="HRV ms" />
      </BarChart>
    </ResponsiveContainer>
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

      <Section title="Sleep performance heatmap" subtitle="green ≥85% · yellow ≥70% · red below">
        <Card>
          <Heatmap
            data={nonNap.map((s) => ({ day: s.day, value: s.performance }))}
            colorFn={sleepPerfColor}
            fmtValue={(v) => (v == null ? "no data" : `${v}%`)}
            legend={[
              { label: "Low", value: 40 },
              { label: "", value: 60 },
              { label: "", value: 75 },
              { label: "", value: 85 },
              { label: "High", value: 95 },
            ]}
          />
        </Card>
      </Section>

      <Section title="Hours in bed heatmap" subtitle="deeper purple = longer night">
        <Card>
          <Heatmap
            data={nonNap.map((s) => ({ day: s.day, value: s.hours_in_bed }))}
            colorFn={(v) => sleepHoursGradient(v, 4, 10)}
            fmtValue={(v) => (v == null ? "no data" : `${v.toFixed(1)} h`)}
            legend={[
              { label: "4h", value: 4 },
              { label: "", value: 6 },
              { label: "", value: 7.5 },
              { label: "", value: 9 },
              { label: "10h+", value: 10 },
            ]}
          />
        </Card>
      </Section>

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

      <Section title="Strain heatmap" subtitle="amber intensity scales with strain (0–21)">
        <Card>
          <Heatmap
            data={strain.map((s) => ({ day: s.day, value: s.strain }))}
            colorFn={(v) => strainGradient(v, 0, 21)}
            fmtValue={(v) => (v == null ? "no data" : v.toFixed(1))}
            legend={[
              { label: "Easy", value: 4 },
              { label: "", value: 8 },
              { label: "", value: 12 },
              { label: "", value: 16 },
              { label: "All out", value: 20 },
            ]}
          />
        </Card>
      </Section>

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

      <Section title="Workout minutes heatmap" subtitle="how much you moved each day">
        <Card>
          <Heatmap
            data={(() => {
              const m = new Map<string, number>();
              for (const w of workouts) m.set(w.day, (m.get(w.day) ?? 0) + w.minutes);
              return [...m.entries()].map(([day, value]) => ({ day, value }));
            })()}
            colorFn={(v) => workoutGradient(v, 0, 120)}
            fmtValue={(v) => (v == null ? "—" : `${v} min`)}
            legend={[
              { label: "0", value: 0 },
              { label: "", value: 30 },
              { label: "", value: 60 },
              { label: "", value: 90 },
              { label: "2h+", value: 120 },
            ]}
          />
        </Card>
      </Section>

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
      <Card className="text-sm text-neutral-300 space-y-2">
        <p><strong className="text-white">How to read these.</strong> Each dot is one day. The number <code className="text-emerald-300">r</code> is Pearson correlation — how tightly the two metrics move together.</p>
        <ul className="ml-5 list-disc space-y-1 text-neutral-400">
          <li><span className="text-emerald-300">+1.0</span> = perfect positive (when X goes up, Y always goes up)</li>
          <li><span className="text-emerald-300">+0.5 to +0.7</span> = strong, clearly visible trend</li>
          <li><span className="text-amber-300">+0.3 to +0.5</span> = moderate, real but noisy</li>
          <li><span className="text-neutral-500">−0.15 to +0.15</span> = basically noise, no relationship</li>
          <li><span className="text-red-300">negative</span> = inverse (more X, less Y)</li>
        </ul>
        <p className="text-neutral-500">Correlation ≠ causation. A strong link is a hypothesis to investigate, not proof.</p>
      </Card>

      <ScatterCard
        title="Sleep performance → next-day recovery"
        xLabel="Sleep perf % (yesterday)"
        yLabel="Recovery % (today)"
        data={sleepVsRecovery}
        corr={corr1}
        interpret={(c) =>
          c == null ? "Not enough overlap to compute."
          : c >= 0.4 ? "Strong: nights you sleep well clearly translate into better recovery the next day. Prioritize sleep quality."
          : c >= 0.2 ? "Moderate link: sleep helps recovery, but other factors (strain, stress, illness) matter too."
          : c > -0.1 ? "Weak: sleep performance doesn't predict next-day recovery much in your data. Maybe the score is too coarse, or other variables dominate."
          : "Negative trend — unusual. Could be a data quirk or compensatory behavior (over-sleeping after rough days)."
        }
      />

      <ScatterCard
        title="Day-before strain → recovery"
        xLabel="Strain (yesterday)"
        yLabel="Recovery % (today)"
        data={strainVsRecovery}
        corr={corr2}
        interpret={(c) =>
          c == null ? "Not enough overlap to compute."
          : c <= -0.3 ? "Clear inverse: high-strain days reliably tank next-day recovery. Plan recovery after big efforts."
          : c <= -0.1 ? "Mild inverse: strain costs you some recovery, but you bounce back well most days."
          : c > 0.2 ? "Counter-intuitive positive — possibly because rest days correlate with non-training stressors."
          : "Essentially flat: your body handles strain without much overnight cost in this range."
        }
      />

      <ScatterCard
        title="Time in bed → next-day HRV"
        xLabel="Hours in bed (yesterday)"
        yLabel="HRV ms (today)"
        data={sleepVsHrv}
        corr={corr3}
        interpret={(c) =>
          c == null ? "Not enough overlap to compute."
          : c >= 0.3 ? "Sleep duration meaningfully boosts your HRV. Longer nights → calmer nervous system."
          : c >= 0.1 ? "Mild positive: more sleep helps HRV a little, but quality probably matters more than raw hours."
          : "Flat: raw hours in bed doesn't move your HRV much. Look at consistency / sleep stages instead."
        }
      />
    </div>
  );
}

// ---------- Insights ----------

function InsightsTab({ workouts, recovery }: { workouts: Workout[]; recovery: Recovery[] }) {
  const intimacy = useMemo(() => detectIntimacy(workouts), [workouts]);
  const lateNight = useMemo(() => detectLateNight(workouts), [workouts]);
  const mystery = useMemo(() => detectMystery(workouts), [workouts]);
  const cliffs = useMemo(() => detectRecoveryCliffs(recovery), [recovery]);
  const hrvCrashes = useMemo(() => detectHrvCrashes(recovery), [recovery]);

  return (
    <div className="space-y-8">
      <Card className="text-sm text-neutral-300 space-y-2">
        <p><strong className="text-white">Auto-detected activities.</strong> These are pattern matches from your raw workouts — not confirmed events. The app looks at duration, time-of-day, sport type, HR, and proximity to other sessions.</p>
        <p className="text-neutral-500">Higher confidence = more signals matched. Always investigate before treating as truth.</p>
      </Card>

      <Section title={`🍑 Possible intimacy sessions (${intimacy.length})`} subtitle="short generic activities, evening/night, elevated HR, often paired">
        <Card>
          {intimacy.length ? (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-neutral-900 text-neutral-400">
                  <tr>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Time</th>
                    <th className="p-2 text-right">Min</th>
                    <th className="p-2 text-right">Avg HR</th>
                    <th className="p-2 text-right">Strain</th>
                    <th className="p-2 text-right">Conf</th>
                    <th className="p-2 text-left">Signals</th>
                  </tr>
                </thead>
                <tbody>
                  {intimacy.map((x, i) => (
                    <tr key={i} className="border-t border-neutral-800">
                      <td className="p-2">{x.day}</td>
                      <td className="p-2 text-neutral-400">{new Date(x.start_ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="p-2 text-right">{x.minutes}</td>
                      <td className="p-2 text-right">{x.avg_hr ?? "—"}</td>
                      <td className="p-2 text-right">{fmt(x.strain, 1)}</td>
                      <td className="p-2 text-right">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${x.confidence >= 8 ? "bg-pink-500/30 text-pink-200" : x.confidence >= 6 ? "bg-violet-500/20 text-violet-300" : "bg-neutral-800 text-neutral-400"}`}>
                          {x.confidence}/10
                        </span>
                      </td>
                      <td className="p-2 text-xs text-neutral-500">{x.reasons.join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No candidates in this range.</p>
          )}
        </Card>
      </Section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Section title={`🌙 Late-night activities (${lateNight.length})`} subtitle="started 22:00 – 05:00">
          <Card className="max-h-80 overflow-auto">
            <ul className="space-y-1 text-sm">
              {lateNight.map((x, i) => (
                <li key={i} className="flex items-baseline justify-between border-b border-neutral-800 py-1">
                  <span>
                    <span className="text-neutral-300">{x.day}</span>
                    <span className="ml-2 text-neutral-500">{new Date(x.start_ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </span>
                  <span className="text-neutral-400">{x.sport_name} · {x.minutes}m · {fmt(x.strain, 1)}</span>
                </li>
              ))}
              {!lateNight.length && <li className="text-neutral-500">None</li>}
            </ul>
          </Card>
        </Section>

        <Section title={`❓ Mystery activities (${mystery.length})`} subtitle="generic sport, elevated HR, ≥ 10 min">
          <Card className="max-h-80 overflow-auto">
            <ul className="space-y-1 text-sm">
              {mystery.map((x, i) => (
                <li key={i} className="flex items-baseline justify-between border-b border-neutral-800 py-1">
                  <span>
                    <span className="text-neutral-300">{x.day}</span>
                    <span className="ml-2 text-neutral-500">{new Date(x.start_ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </span>
                  <span className="text-neutral-400">{x.minutes}m · {x.avg_hr ?? "—"} bpm</span>
                </li>
              ))}
              {!mystery.length && <li className="text-neutral-500">None</li>}
            </ul>
          </Card>
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Section title={`🔻 Recovery cliffs (${cliffs.length})`} subtitle="drop of ≥25 points day-over-day">
          <Card className="max-h-80 overflow-auto">
            <ul className="space-y-1 text-sm">
              {cliffs.map((c, i) => (
                <li key={i} className="flex items-baseline justify-between border-b border-neutral-800 py-1">
                  <span className="text-neutral-300">{c.day}</span>
                  <span className="text-red-400 font-medium">
                    {c.prev}% → {c.recovery_score}% <span className="text-red-300">(−{c.drop})</span>
                  </span>
                </li>
              ))}
              {!cliffs.length && <li className="text-neutral-500">None — steady recovery 🎉</li>}
            </ul>
          </Card>
        </Section>

        <Section title={`💔 HRV crashes (${hrvCrashes.length})`} subtitle="≥25% below 7-day rolling baseline">
          <Card className="max-h-80 overflow-auto">
            <ul className="space-y-1 text-sm">
              {hrvCrashes.map((h, i) => (
                <li key={i} className="flex items-baseline justify-between border-b border-neutral-800 py-1">
                  <span className="text-neutral-300">{h.day}</span>
                  <span className="text-amber-400 font-medium">
                    {fmt(h.hrv, 1)} ms (base {fmt(h.baseline, 1)}, −{h.pctDrop.toFixed(0)}%)
                  </span>
                </li>
              ))}
              {!hrvCrashes.length && <li className="text-neutral-500">None</li>}
            </ul>
          </Card>
        </Section>
      </div>
    </div>
  );
}

function ScatterCard({ title, xLabel, yLabel, data, corr, interpret }: {
  title: string;
  xLabel: string;
  yLabel: string;
  data: { x: number; y: number; day: string }[];
  corr: number | null;
  interpret?: (c: number | null) => string;
}) {
  const strength =
    corr == null ? "—" :
    Math.abs(corr) >= 0.5 ? "strong" :
    Math.abs(corr) >= 0.3 ? "moderate" :
    Math.abs(corr) >= 0.15 ? "weak" : "noise";
  const dir = corr == null ? "" : corr > 0 ? "+" : "−";
  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const reg = linearRegression(xs, ys);
  const xMin = xs.length ? Math.min(...xs) : 0;
  const xMax = xs.length ? Math.max(...xs) : 0;
  const xMed = median(xs);
  const yMed = median(ys);
  const trendColor = corr == null ? "#666" : Math.abs(corr) >= 0.3 ? "#fbbf24" : "#444";
  return (
    <Section title={title} subtitle={`r = ${corr == null ? "—" : dir + Math.abs(corr).toFixed(2)} (${strength}, n=${data.length})`}>
      <Card>
        {interpret && <p className="mb-3 text-sm text-neutral-300">{interpret(corr)}</p>}
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
            {xMed != null && <ReferenceLine x={xMed} stroke="#2a2a2a" strokeDasharray="4 4" />}
            {yMed != null && <ReferenceLine y={yMed} stroke="#2a2a2a" strokeDasharray="4 4" />}
            {reg && (
              <ReferenceLine
                stroke={trendColor}
                strokeWidth={2}
                segment={[
                  { x: xMin, y: reg.m * xMin + reg.b },
                  { x: xMax, y: reg.m * xMax + reg.b },
                ]}
              />
            )}
            <Scatter data={data} fill="#10b981" fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-neutral-500">
          <span><span className="inline-block h-0.5 w-6 align-middle" style={{ background: trendColor }} /> trend line</span>
          <span><span className="inline-block h-0.5 w-6 border-t border-dashed border-neutral-600 align-middle" /> medians (4 quadrants)</span>
        </div>
      </Card>
    </Section>
  );
}


// ---------- Compare tab ----------

function monthsInRange(allDays: string[]): string[] {
  const set = new Set<string>();
  for (const d of allDays) if (d) set.add(d.slice(0, 7));
  return [...set].sort().reverse();
}

function rangeForMonth(month: string): { start: string; end: string; label: string } {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const last = new Date(y, m, 0).getDate();
  const end = `${month}-${String(last).padStart(2, "0")}`;
  const label = new Date(y, m - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { start, end, label };
}

function CompareTab({
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
  const months = useMemo(() => monthsInRange(recovery.map((r) => r.day)), [recovery]);
  const [a, setA] = useState(months[0] ?? "");
  const [b, setB] = useState(months[1] ?? months[0] ?? "");

  if (!months.length) return <p className="text-sm text-neutral-400">No data to compare yet.</p>;

  const ra = rangeForMonth(a);
  const rb = rangeForMonth(b);

  const slice = <T extends { day: string }>(arr: T[], r: { start: string; end: string }) =>
    arr.filter((x) => x.day >= r.start && x.day <= r.end);

  const aRec = slice(recovery, ra);
  const bRec = slice(recovery, rb);
  const aSlp = slice(sleep, ra).filter((s) => !s.nap);
  const bSlp = slice(sleep, rb).filter((s) => !s.nap);
  const aStr = slice(strain, ra);
  const bStr = slice(strain, rb);
  const aWkt = slice(workouts, ra);
  const bWkt = slice(workouts, rb);

  const metrics = [
    { label: "Avg recovery", a: avg(aRec.map((x) => x.recovery_score)), b: avg(bRec.map((x) => x.recovery_score)), suffix: "%", digits: 0 },
    { label: "Avg HRV", a: avg(aRec.map((x) => x.hrv)), b: avg(bRec.map((x) => x.hrv)), suffix: " ms", digits: 1 },
    { label: "Avg RHR", a: avg(aRec.map((x) => x.rhr)), b: avg(bRec.map((x) => x.rhr)), suffix: " bpm", digits: 0 },
    { label: "Avg strain", a: avg(aStr.map((x) => x.strain)), b: avg(bStr.map((x) => x.strain)), suffix: "", digits: 1 },
    { label: "Sleep hours", a: avg(aSlp.map((x) => x.hours_in_bed)), b: avg(bSlp.map((x) => x.hours_in_bed)), suffix: " h", digits: 1 },
    { label: "Sleep perf", a: avg(aSlp.map((x) => x.performance)), b: avg(bSlp.map((x) => x.performance)), suffix: "%", digits: 0 },
    { label: "Workouts", a: aWkt.length, b: bWkt.length, suffix: "", digits: 0 },
    { label: "Workout time", a: aWkt.reduce((s, x) => s + x.minutes, 0) / 60, b: bWkt.reduce((s, x) => s + x.minutes, 0) / 60, suffix: " h", digits: 1 },
  ];

  // build comparison series: day-of-month → value
  const byDayA = new Map(aRec.map((r) => [Number(r.day.slice(-2)), r.recovery_score]));
  const byDayB = new Map(bRec.map((r) => [Number(r.day.slice(-2)), r.recovery_score]));
  const chartData = Array.from({ length: 31 }, (_, i) => ({
    day: i + 1,
    a: byDayA.get(i + 1) ?? null,
    b: byDayB.get(i + 1) ?? null,
  }));

  return (
    <div className="space-y-8">
      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs text-neutral-400">Period A</label>
            <select value={a} onChange={(e) => setA(e.target.value)} className="mt-1 w-full rounded border border-emerald-500/40 bg-black px-2 py-1.5 text-sm">
              {months.map((m) => <option key={m} value={m}>{rangeForMonth(m).label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-400">Period B</label>
            <select value={b} onChange={(e) => setB(e.target.value)} className="mt-1 w-full rounded border border-blue-500/40 bg-black px-2 py-1.5 text-sm">
              {months.map((m) => <option key={m} value={m}>{rangeForMonth(m).label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {metrics.map((m) => {
          const delta = m.a != null && m.b != null ? m.a - m.b : null;
          const pct = m.b != null && m.b !== 0 && delta != null ? (delta / m.b) * 100 : null;
          const better = m.label === "Avg RHR" ? delta != null && delta < 0 : delta != null && delta > 0;
          const arrow = delta == null ? "" : delta > 0 ? "↗" : "↘";
          const color = delta == null ? "text-neutral-500" : better ? "text-emerald-400" : "text-red-400";
          return (
            <Card key={m.label}>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500">{m.label}</div>
              <div className="mt-2 grid grid-cols-3 items-center gap-2">
                <div>
                  <div className="text-[10px] text-emerald-400">A · {ra.label}</div>
                  <div className="text-2xl font-semibold">{fmt(m.a, m.digits)}{m.suffix}</div>
                </div>
                <div className={`text-center text-sm font-medium ${color}`}>
                  {delta == null ? "—" : `${arrow} ${delta > 0 ? "+" : ""}${delta.toFixed(m.digits)}`}
                  {pct != null && <div className="text-[10px] text-neutral-500">{pct > 0 ? "+" : ""}{pct.toFixed(0)}%</div>}
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-blue-400">B · {rb.label}</div>
                  <div className="text-2xl font-semibold">{fmt(m.b, m.digits)}{m.suffix}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <Section title="Recovery by day-of-month" subtitle="Overlay of both periods">
        <Card>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} stroke="#666" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="a" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} name={ra.label} connectNulls />
              <Line type="monotone" dataKey="b" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 2 }} name={rb.label} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Section>
    </div>
  );
}

// ---------- Analyse tab ----------

const ZONE_COLORS = ["#374151", "#60a5fa", "#34d399", "#fbbf24", "#fb923c", "#ef4444"];
const ZONE_LABELS = ["Z0 rest", "Z1 50-60%", "Z2 60-70%", "Z3 70-80%", "Z4 80-90%", "Z5 90-100%"];

function ZoneBar({ zones, totalMs }: { zones: { z0: number; z1: number; z2: number; z3: number; z4: number; z5: number }; totalMs: number }) {
  const arr = [zones.z0, zones.z1, zones.z2, zones.z3, zones.z4, zones.z5];
  const total = totalMs || arr.reduce((a, b) => a + b, 0) || 1;
  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded">
        {arr.map((ms, i) => {
          const pct = (ms / total) * 100;
          if (pct < 0.5) return null;
          return (
            <div
              key={i}
              title={`${ZONE_LABELS[i]} — ${Math.round(ms / 60000)} min (${pct.toFixed(1)}%)`}
              style={{ width: `${pct}%`, background: ZONE_COLORS[i] }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-neutral-400">
        {arr.map((ms, i) => {
          if (ms < 1000) return null;
          return (
            <span key={i}>
              <span className="inline-block h-2 w-2 rounded-sm align-middle" style={{ background: ZONE_COLORS[i] }} />{" "}
              Z{i} {Math.round(ms / 60000)}m
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color = "text-white" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className={`text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function AnalyseTab({
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
  const allDays = useMemo(() => {
    const s = new Set<string>();
    recovery.forEach((x) => s.add(x.day));
    sleep.forEach((x) => s.add(x.day));
    strain.forEach((x) => s.add(x.day));
    return [...s].sort().reverse();
  }, [recovery, sleep, strain]);

  const [day, setDay] = useState(allDays[0] ?? "");
  const idx = allDays.indexOf(day);
  const prevDay = idx >= 0 && idx < allDays.length - 1 ? allDays[idx + 1] : null;
  const nextDay = idx > 0 ? allDays[idx - 1] : null;

  if (!allDays.length) return <p className="text-sm text-neutral-400">No data yet.</p>;

  const rec = recovery.find((x) => x.day === day);
  const slpDay = sleep.filter((x) => x.day === day);
  const cyc = strain.find((x) => x.day === day);
  const wkts = workouts.filter((x) => x.day === day);

  // 7-day surrounding context for mini sparkline-ish chart
  const recIdx = recovery.findIndex((x) => x.day === day);
  const ctx = recIdx >= 0 ? recovery.slice(Math.max(0, recIdx - 6), Math.min(recovery.length, recIdx + 7)) : [];

  const dayDate = new Date(day);
  const dayName = dayDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const recColor = rec?.recovery_score == null ? "text-neutral-400" : rec.recovery_score >= 67 ? "text-emerald-400" : rec.recovery_score >= 34 ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => prevDay && setDay(prevDay)}
            disabled={!prevDay}
            className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-900 disabled:opacity-30"
          >
            ← {prevDay ?? ""}
          </button>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="rounded border border-neutral-700 bg-black px-3 py-1.5 text-sm"
            min={allDays[allDays.length - 1]}
            max={allDays[0]}
          />
          <button
            onClick={() => nextDay && setDay(nextDay)}
            disabled={!nextDay}
            className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-900 disabled:opacity-30"
          >
            {nextDay ?? ""} →
          </button>
          <span className="ml-auto text-neutral-400 text-sm">{dayName}</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-lg font-semibold">Recovery</h3>
            <span className={`text-4xl font-bold ${recColor}`}>{rec?.recovery_score ?? "—"}{rec?.recovery_score != null && "%"}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniStat label="HRV" value={rec?.hrv != null ? `${rec.hrv.toFixed(1)} ms` : "—"} color="text-blue-400" />
            <MiniStat label="RHR" value={rec?.rhr != null ? `${rec.rhr} bpm` : "—"} color="text-red-400" />
            <MiniStat label="SpO₂" value={rec?.spo2 != null ? `${rec.spo2.toFixed(1)}%` : "—"} />
            <MiniStat label="Skin temp" value={rec?.skin_temp != null ? `${rec.skin_temp.toFixed(2)}°C` : "—"} />
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-lg font-semibold">Day strain</h3>
            <span className="text-4xl font-bold text-amber-400">{cyc?.strain != null ? cyc.strain.toFixed(1) : "—"}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniStat label="Avg HR" value={cyc?.avg_hr != null ? `${cyc.avg_hr} bpm` : "—"} />
            <MiniStat label="Max HR" value={cyc?.max_hr != null ? `${cyc.max_hr} bpm` : "—"} />
            <MiniStat label="Energy" value={cyc?.kj != null ? `${(cyc.kj / 4.184).toFixed(0)} kcal` : "—"} />
            <MiniStat label="Workouts" value={String(wkts.length)} />
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-lg font-semibold">Sleep</h3>
          {slpDay.length > 0 && (
            <span className="text-sm text-neutral-400">{slpDay.length} session{slpDay.length > 1 ? "s" : ""}</span>
          )}
        </div>
        {!slpDay.length ? (
          <p className="text-sm text-neutral-500">No sleep data for this day.</p>
        ) : (
          <div className="space-y-4">
            {slpDay.map((s, i) => {
              const totalMs = (s.swp + s.rem + s.light + s.awake) * 3600000;
              const stages = [
                { ms: s.swp * 3600000, color: "#1d4ed8", label: "Deep" },
                { ms: s.rem * 3600000, color: "#7c3aed", label: "REM" },
                { ms: s.light * 3600000, color: "#60a5fa", label: "Light" },
                { ms: s.awake * 3600000, color: "#374151", label: "Awake" },
              ];
              return (
                <div key={i}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-sm text-neutral-300">{s.nap ? "Nap" : "Main sleep"} · {s.hours_in_bed}h in bed</span>
                    <span className="text-sm font-medium">{s.performance ?? "—"}% performance</span>
                  </div>
                  <div className="flex h-4 overflow-hidden rounded">
                    {stages.map((st, j) => {
                      const pct = (st.ms / totalMs) * 100;
                      if (pct < 0.5) return null;
                      return (
                        <div
                          key={j}
                          title={`${st.label} — ${(st.ms / 3600000).toFixed(2)}h (${pct.toFixed(1)}%)`}
                          style={{ width: `${pct}%`, background: st.color }}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-neutral-400 md:grid-cols-4">
                    <span>Deep: <span className="text-white">{s.swp}h</span></span>
                    <span>REM: <span className="text-white">{s.rem}h</span></span>
                    <span>Light: <span className="text-white">{s.light}h</span></span>
                    <span>Awake: <span className="text-white">{s.awake}h</span></span>
                  </div>
                  {!s.nap && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-neutral-400 md:grid-cols-4">
                      <span>Efficiency: <span className="text-white">{s.efficiency ?? "—"}%</span></span>
                      <span>Consistency: <span className="text-white">{s.consistency ?? "—"}%</span></span>
                      <span>Disturbances: <span className="text-white">{s.disturbances ?? "—"}</span></span>
                      <span>Resp rate: <span className="text-white">{s.respiratory_rate != null ? s.respiratory_rate.toFixed(1) : "—"}</span></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-semibold">Workouts ({wkts.length})</h3>
        {!wkts.length ? (
          <p className="text-sm text-neutral-500">No workouts on this day.</p>
        ) : (
          <div className="space-y-4">
            {wkts.map((w, i) => {
              const time = new Date(w.start_ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              const endTime = w.end_ts ? new Date(w.end_ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
              return (
                <div key={i} className="rounded border border-neutral-800 p-3">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                    <div>
                      <span className="font-medium">{sportName(w.sport_id)}</span>
                      <span className="ml-2 text-sm text-neutral-400">{time}{endTime && ` – ${endTime}`} · {w.minutes} min</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:flex sm:gap-4 sm:text-sm">
                      <span className="text-neutral-400">Strain <span className="text-amber-400 font-medium">{fmt(w.strain, 1)}</span></span>
                      <span className="text-neutral-400">Avg HR <span className="text-red-400 font-medium">{w.avg_hr ?? "—"}</span></span>
                      <span className="text-neutral-400">Max HR <span className="text-violet-400 font-medium">{w.max_hr ?? "—"}</span></span>
                      <span className="text-neutral-400">kcal <span className="text-white">{w.kj != null ? Math.round(w.kj / 4.184) : "—"}</span></span>
                    </div>
                  </div>
                  {w.zones && <ZoneBar zones={w.zones} totalMs={w.minutes * 60000} />}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-semibold">Surrounding context</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={ctx}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
            <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} stroke="#666" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <ReferenceLine x={day} stroke="#fbbf24" strokeWidth={2} label={{ value: "today", fill: "#fbbf24", fontSize: 10 }} />
            <Line type="monotone" dataKey="recovery_score" stroke="#10b981" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
