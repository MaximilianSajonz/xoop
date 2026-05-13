import { sportName } from "./sports";

export type WorkoutLike = {
  day: string;
  start_ts: string;
  end_ts: string | null;
  sport_id: number | null;
  strain: number | null;
  kj: number | null;
  minutes: number;
  avg_hr: number | null;
  max_hr: number | null;
};

export type WorkoutInsight = WorkoutLike & {
  sport_name: string;
  hour: number;
  confidence: number;
  reasons: string[];
};

const GENERIC_SPORTS = new Set([-1, 71, 0]);

function decorate(w: WorkoutLike, confidence: number, reasons: string[]): WorkoutInsight {
  return {
    ...w,
    sport_name: sportName(w.sport_id),
    hour: new Date(w.start_ts).getHours(),
    confidence,
    reasons,
  };
}

export function detectIntimacy(workouts: WorkoutLike[]): WorkoutInsight[] {
  const out: WorkoutInsight[] = [];

  for (let i = 0; i < workouts.length; i++) {
    const w = workouts[i];
    const minutes = w.minutes;
    const hour = new Date(w.start_ts).getHours();
    const reasons: string[] = [];
    let score = 0;

    if (minutes >= 5 && minutes <= 30) {
      score += 2;
      reasons.push(`short (${minutes} min)`);
    } else if (minutes > 30 && minutes <= 45) {
      score += 1;
      reasons.push(`mid-length (${minutes} min)`);
    } else {
      continue;
    }

    if (hour >= 21 || hour < 6) {
      score += 2;
      reasons.push(`late (${hour}h)`);
    } else if (hour >= 18 && hour < 21) {
      score += 1;
      reasons.push(`evening (${hour}h)`);
    } else if (hour >= 6 && hour < 11) {
      score += 1;
      reasons.push(`morning (${hour}h)`);
    }

    if (w.sport_id == null || GENERIC_SPORTS.has(w.sport_id)) {
      score += 2;
      reasons.push("generic activity");
    } else {
      score -= 3;
    }

    if (w.avg_hr != null) {
      if (w.avg_hr >= 90 && w.avg_hr <= 140) {
        score += 2;
        reasons.push(`HR ${w.avg_hr}`);
      } else if (w.avg_hr > 140) {
        score -= 1;
      }
    }

    if (w.strain != null && w.strain >= 2 && w.strain <= 8) {
      score += 1;
      reasons.push(`light strain ${w.strain.toFixed(1)}`);
    }

    for (let j = 0; j < workouts.length; j++) {
      if (j === i) continue;
      const o = workouts[j];
      const diffMin = Math.abs(new Date(o.start_ts).getTime() - new Date(w.start_ts).getTime()) / 60000;
      if (diffMin > 0 && diffMin <= 240) {
        if (o.minutes <= 35 && (o.sport_id == null || GENERIC_SPORTS.has(o.sport_id))) {
          score += 2;
          reasons.push("paired nearby");
          break;
        }
      }
    }

    if (score >= 5) {
      out.push(decorate(w, Math.min(10, score), reasons));
    }
  }

  return out.sort((a, b) => b.confidence - a.confidence);
}

export function detectLateNight(workouts: WorkoutLike[]): WorkoutInsight[] {
  return workouts
    .filter((w) => {
      const h = new Date(w.start_ts).getHours();
      return h >= 22 || h < 5;
    })
    .map((w) => decorate(w, 5, ["late night"]));
}

export function detectMystery(workouts: WorkoutLike[]): WorkoutInsight[] {
  return workouts
    .filter((w) => {
      const generic = w.sport_id == null || GENERIC_SPORTS.has(w.sport_id);
      return generic && w.minutes >= 10 && (w.avg_hr ?? 0) >= 100;
    })
    .map((w) => decorate(w, 5, ["generic + elevated HR"]));
}

export function detectRecoveryCliffs(
  recovery: { day: string; recovery_score: number | null }[],
): { day: string; recovery_score: number; prev: number; drop: number }[] {
  const out = [];
  for (let i = 1; i < recovery.length; i++) {
    const cur = recovery[i].recovery_score;
    const prev = recovery[i - 1].recovery_score;
    if (cur != null && prev != null && prev - cur >= 25) {
      out.push({ day: recovery[i].day, recovery_score: cur, prev, drop: prev - cur });
    }
  }
  return out.sort((a, b) => b.drop - a.drop);
}

export function detectHrvCrashes(
  recovery: { day: string; hrv: number | null }[],
): { day: string; hrv: number; baseline: number; pctDrop: number }[] {
  const out = [];
  for (let i = 7; i < recovery.length; i++) {
    const cur = recovery[i].hrv;
    if (cur == null) continue;
    const window = recovery.slice(i - 7, i).map((r) => r.hrv).filter((v): v is number => typeof v === "number");
    if (window.length < 3) continue;
    const baseline = window.reduce((a, b) => a + b, 0) / window.length;
    const pctDrop = ((baseline - cur) / baseline) * 100;
    if (pctDrop >= 25) {
      out.push({ day: recovery[i].day, hrv: cur, baseline, pctDrop });
    }
  }
  return out.sort((a, b) => b.pctDrop - a.pctDrop);
}
