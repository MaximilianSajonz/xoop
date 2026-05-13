import { sbAdmin } from "@/lib/supabase";
import { loadToken } from "@/lib/whoop";
import SyncButton from "./sync-button";
import Dashboard from "./dashboard";

export const dynamic = "force-dynamic";

const MS = (n: number) => (typeof n === "number" ? n / 3600000 : 0);

export default async function Home() {
  const token = await loadToken().catch(() => null);
  const sb = sbAdmin();

  const [{ data: rec }, { data: slp }, { data: cyc }, { data: wrk }, { data: ann }, { data: profile }] = await Promise.all([
    sb.from("whoop_recovery").select("created_at_ts, recovery_score, hrv_rmssd_milli, resting_heart_rate, spo2_percentage, skin_temp_celsius").order("created_at_ts", { ascending: true }).limit(2000),
    sb.from("whoop_sleep").select("start_ts, nap, sleep_performance_percentage, sleep_efficiency_percentage, sleep_consistency_percentage, total_in_bed_milli, total_rem_sleep_milli, total_slow_wave_sleep_milli, total_light_sleep_milli, total_awake_milli, disturbance_count, respiratory_rate").order("start_ts", { ascending: true }).limit(2000),
    sb.from("whoop_cycle").select("start_ts, strain, average_heart_rate, max_heart_rate, kilojoule, synced_at").order("start_ts", { ascending: true }).limit(2000),
    sb.from("whoop_workout").select("start_ts, end_ts, sport_id, strain, kilojoule, average_heart_rate, max_heart_rate").order("start_ts", { ascending: true }).limit(2000),
    sb.from("whoop_annotation").select("*").order("day", { ascending: false }).limit(2000),
    sb.from("whoop_profile").select("updated_at").limit(1).maybeSingle(),
  ]);

  const recovery = (rec ?? []).map((r: any) => ({
    day: (r.created_at_ts ?? "").slice(0, 10),
    recovery_score: r.recovery_score,
    hrv: r.hrv_rmssd_milli,
    rhr: r.resting_heart_rate,
    spo2: r.spo2_percentage,
    skin_temp: r.skin_temp_celsius,
  }));

  const sleep = (slp ?? []).map((s: any) => ({
    day: (s.start_ts ?? "").slice(0, 10),
    hours_in_bed: Math.round(MS(s.total_in_bed_milli) * 10) / 10,
    rem: Math.round(MS(s.total_rem_sleep_milli) * 100) / 100,
    swp: Math.round(MS(s.total_slow_wave_sleep_milli) * 100) / 100,
    light: Math.round(MS(s.total_light_sleep_milli) * 100) / 100,
    awake: Math.round(MS(s.total_awake_milli) * 100) / 100,
    performance: s.sleep_performance_percentage,
    efficiency: s.sleep_efficiency_percentage,
    consistency: s.sleep_consistency_percentage,
    disturbances: s.disturbance_count,
    respiratory_rate: s.respiratory_rate,
    nap: !!s.nap,
  }));

  const strain = (cyc ?? []).map((c: any) => ({
    day: (c.start_ts ?? "").slice(0, 10),
    strain: c.strain,
    avg_hr: c.average_heart_rate,
    max_hr: c.max_heart_rate,
    kj: c.kilojoule,
  }));

  const workouts = (wrk ?? []).map((w: any) => {
    const startMs = w.start_ts ? new Date(w.start_ts).getTime() : 0;
    const endMs = w.end_ts ? new Date(w.end_ts).getTime() : startMs;
    return {
      day: (w.start_ts ?? "").slice(0, 10),
      start_ts: w.start_ts,
      end_ts: w.end_ts,
      sport_id: w.sport_id,
      strain: w.strain,
      kj: w.kilojoule,
      minutes: Math.round((endMs - startMs) / 60000),
      avg_hr: w.average_heart_rate,
      max_hr: w.max_heart_rate,
    };
  });

  const lastSync = profile?.updated_at ?? null;

  return (
    <main className="mx-auto max-w-6xl px-6 md:px-8 py-6 md:py-8 space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-transparent">xoop</h1>
          <p className="text-xs text-neutral-500">your whoop, your data, your way</p>
        </div>
        {token ? (
          <SyncButton />
        ) : (
          <a className="rounded bg-white px-4 py-2 text-sm font-medium text-black" href="/api/auth/start">
            Connect Whoop
          </a>
        )}
      </header>

      {!token ? (
        <p className="text-sm text-neutral-400">Not connected. Click <em>Connect Whoop</em> to authorize.</p>
      ) : recovery.length === 0 ? (
        <p className="text-sm text-neutral-400">No data yet — click a Sync button above.</p>
      ) : (
        <Dashboard
          recovery={recovery}
          sleep={sleep}
          strain={strain}
          workouts={workouts}
          annotations={(ann ?? []) as any}
          lastSync={lastSync}
        />
      )}
    </main>
  );
}
