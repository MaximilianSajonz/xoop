import { NextRequest, NextResponse } from "next/server";
import { sbAdmin } from "@/lib/supabase";
import { whoop } from "@/lib/whoop";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const days = Number(req.nextUrl.searchParams.get("days") ?? 30);
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400_000);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const sb = sbAdmin();

  try {
    const [profile, body, cycles, recovery, sleep, workouts] = await Promise.all([
      whoop.profile(),
      whoop.bodyMeasurement().catch(() => null),
      whoop.cycles(startISO, endISO),
      whoop.recovery(startISO, endISO),
      whoop.sleep(startISO, endISO),
      whoop.workouts(startISO, endISO),
    ]);

    const b = body ?? {};
    await sb.from("whoop_profile").upsert({
      user_id: profile.user_id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      height_meter: b.height_meter,
      weight_kilogram: b.weight_kilogram,
      max_heart_rate: b.max_heart_rate,
      updated_at: new Date().toISOString(),
    });

    if (cycles.length) {
      await sb.from("whoop_cycle").upsert(cycles.map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        start_ts: c.start,
        end_ts: c.end,
        timezone_offset: c.timezone_offset,
        score_state: c.score_state,
        strain: c.score?.strain,
        kilojoule: c.score?.kilojoule,
        average_heart_rate: c.score?.average_heart_rate,
        max_heart_rate: c.score?.max_heart_rate,
        raw: c,
      })));
    }

    if (recovery.length) {
      await sb.from("whoop_recovery").upsert(recovery.map((r: any) => ({
        cycle_id: r.cycle_id,
        user_id: r.user_id,
        sleep_id: r.sleep_id,
        created_at_ts: r.created_at,
        score_state: r.score_state,
        user_calibrating: r.score?.user_calibrating,
        recovery_score: r.score?.recovery_score,
        resting_heart_rate: r.score?.resting_heart_rate,
        hrv_rmssd_milli: r.score?.hrv_rmssd_milli,
        spo2_percentage: r.score?.spo2_percentage,
        skin_temp_celsius: r.score?.skin_temp_celsius,
        raw: r,
      })));
    }

    if (sleep.length) {
      await sb.from("whoop_sleep").upsert(sleep.map((s: any) => {
        const st = s.score?.stage_summary ?? {};
        return {
          id: s.id,
          user_id: s.user_id,
          start_ts: s.start,
          end_ts: s.end,
          nap: s.nap,
          score_state: s.score_state,
          sleep_performance_percentage: s.score?.sleep_performance_percentage,
          sleep_consistency_percentage: s.score?.sleep_consistency_percentage,
          sleep_efficiency_percentage: s.score?.sleep_efficiency_percentage,
          total_in_bed_milli: st.total_in_bed_time_milli,
          total_awake_milli: st.total_awake_time_milli,
          total_light_sleep_milli: st.total_light_sleep_time_milli,
          total_slow_wave_sleep_milli: st.total_slow_wave_sleep_time_milli,
          total_rem_sleep_milli: st.total_rem_sleep_time_milli,
          disturbance_count: st.disturbance_count,
          respiratory_rate: s.score?.respiratory_rate,
          raw: s,
        };
      }));
    }

    if (workouts.length) {
      await sb.from("whoop_workout").upsert(workouts.map((w: any) => {
        const z = w.score?.zone_duration ?? {};
        return {
          id: w.id,
          user_id: w.user_id,
          start_ts: w.start,
          end_ts: w.end,
          sport_id: w.sport_id,
          score_state: w.score_state,
          strain: w.score?.strain,
          average_heart_rate: w.score?.average_heart_rate,
          max_heart_rate: w.score?.max_heart_rate,
          kilojoule: w.score?.kilojoule,
          distance_meter: w.score?.distance_meter,
          altitude_gain_meter: w.score?.altitude_gain_meter,
          altitude_change_meter: w.score?.altitude_change_meter,
          zone_zero_milli: z.zone_zero_milli,
          zone_one_milli: z.zone_one_milli,
          zone_two_milli: z.zone_two_milli,
          zone_three_milli: z.zone_three_milli,
          zone_four_milli: z.zone_four_milli,
          zone_five_milli: z.zone_five_milli,
          raw: w,
        };
      }));
    }

    return NextResponse.json({
      ok: true,
      counts: { cycles: cycles.length, recovery: recovery.length, sleep: sleep.length, workouts: workouts.length },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
