import { sbAdmin } from "@/lib/supabase";
import { loadToken } from "@/lib/whoop";
import SyncButton from "./sync-button";
import Dashboard from "./dashboard";

export const dynamic = "force-dynamic";

const MS = (n: number) => (typeof n === "number" ? n / 3600000 : 0);

export default async function Home() {
  const token = await loadToken().catch(() => null);
  const sb = sbAdmin();

  const [{ data: rec }, { data: slp }, { data: cyc }, { data: wrk }] = await Promise.all([
    sb.from("whoop_recovery").select("created_at_ts, recovery_score, hrv_rmssd_milli, resting_heart_rate").order("created_at_ts", { ascending: true }).limit(2000),
    sb.from("whoop_sleep").select("start_ts, nap, sleep_performance_percentage, total_in_bed_milli, total_rem_sleep_milli, total_slow_wave_sleep_milli, total_light_sleep_milli, total_awake_milli").order("start_ts", { ascending: true }).limit(2000),
    sb.from("whoop_cycle").select("start_ts, strain, average_heart_rate, max_heart_rate").order("start_ts", { ascending: true }).limit(2000),
    sb.from("whoop_workout").select("start_ts, end_ts, sport_id, strain, kilojoule").order("start_ts", { ascending: true }).limit(2000),
  ]);

  const recovery = (rec ?? []).map((r: any) => ({
    day: (r.created_at_ts ?? "").slice(0, 10),
    recovery_score: r.recovery_score,
    hrv: r.hrv_rmssd_milli,
    rhr: r.resting_heart_rate,
  }));

  const sleep = (slp ?? []).map((s: any) => ({
    day: (s.start_ts ?? "").slice(0, 10),
    hours_in_bed: Math.round(MS(s.total_in_bed_milli) * 10) / 10,
    rem: Math.round(MS(s.total_rem_sleep_milli) * 10) / 10,
    swp: Math.round(MS(s.total_slow_wave_sleep_milli) * 10) / 10,
    light: Math.round(MS(s.total_light_sleep_milli) * 10) / 10,
    awake: Math.round(MS(s.total_awake_milli) * 10) / 10,
    performance: s.sleep_performance_percentage,
    nap: !!s.nap,
  }));

  const strain = (cyc ?? []).map((c: any) => ({
    day: (c.start_ts ?? "").slice(0, 10),
    strain: c.strain,
    avg_hr: c.average_heart_rate,
    max_hr: c.max_heart_rate,
  }));

  const workouts = (wrk ?? []).map((w: any) => {
    const startMs = w.start_ts ? new Date(w.start_ts).getTime() : 0;
    const endMs = w.end_ts ? new Date(w.end_ts).getTime() : startMs;
    return {
      day: (w.start_ts ?? "").slice(0, 10),
      sport_id: w.sport_id,
      strain: w.strain,
      kj: w.kilojoule,
      minutes: Math.round((endMs - startMs) / 60000),
    };
  });

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-8 space-y-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">xoop</h1>
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
        <Dashboard recovery={recovery} sleep={sleep} strain={strain} workouts={workouts} />
      )}
    </main>
  );
}
