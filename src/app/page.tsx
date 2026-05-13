import { sbAdmin } from "@/lib/supabase";
import { loadToken } from "@/lib/whoop";
import SyncButton from "./sync-button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const token = await loadToken().catch(() => null);
  const sb = sbAdmin();

  const { data: recent } = await sb
    .from("whoop_recovery")
    .select("created_at_ts, recovery_score, hrv_rmssd_milli, resting_heart_rate")
    .order("created_at_ts", { ascending: false })
    .limit(14);

  const { data: sleep } = await sb
    .from("whoop_sleep")
    .select("start_ts, sleep_performance_percentage, total_in_bed_milli, total_rem_sleep_milli, total_slow_wave_sleep_milli")
    .order("start_ts", { ascending: false })
    .limit(7);

  const { data: strain } = await sb
    .from("whoop_cycle")
    .select("start_ts, strain, average_heart_rate")
    .order("start_ts", { ascending: false })
    .limit(7);

  return (
    <main className="mx-auto max-w-4xl p-8 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">xoop</h1>
        {token ? (
          <SyncButton />
        ) : (
          <a className="rounded bg-white px-4 py-2 text-sm font-medium text-black" href="/api/auth/start">
            Connect Whoop
          </a>
        )}
      </header>

      {!token && (
        <p className="text-sm text-neutral-400">
          Not connected. Click <em>Connect Whoop</em> to authorize.
        </p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recovery (last 14)</h2>
        <div className="rounded-lg border border-neutral-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="text-left p-2">Date</th>
                <th className="text-right p-2">Score</th>
                <th className="text-right p-2">HRV ms</th>
                <th className="text-right p-2">RHR</th>
              </tr>
            </thead>
            <tbody>
              {(recent ?? []).map((r: any) => (
                <tr key={r.created_at_ts} className="border-t border-neutral-800">
                  <td className="p-2">{r.created_at_ts?.slice(0, 10)}</td>
                  <td className="p-2 text-right">{r.recovery_score ?? "—"}</td>
                  <td className="p-2 text-right">{r.hrv_rmssd_milli?.toFixed(1) ?? "—"}</td>
                  <td className="p-2 text-right">{r.resting_heart_rate ?? "—"}</td>
                </tr>
              ))}
              {!recent?.length && (
                <tr><td className="p-3 text-neutral-500" colSpan={4}>No data yet — sync first.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Sleep (7d)</h2>
          <ul className="space-y-1 text-sm">
            {(sleep ?? []).map((s: any) => (
              <li key={s.start_ts} className="flex justify-between border-b border-neutral-800 py-1">
                <span>{s.start_ts?.slice(0, 10)}</span>
                <span>{Math.round((s.total_in_bed_milli ?? 0) / 3600000 * 10) / 10}h · {s.sleep_performance_percentage ?? "—"}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold">Strain (7d)</h2>
          <ul className="space-y-1 text-sm">
            {(strain ?? []).map((c: any) => (
              <li key={c.start_ts} className="flex justify-between border-b border-neutral-800 py-1">
                <span>{c.start_ts?.slice(0, 10)}</span>
                <span>{c.strain?.toFixed(1) ?? "—"} · avg HR {c.average_heart_rate ?? "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
