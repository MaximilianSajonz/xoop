export function avg(xs: (number | null | undefined)[]): number | null {
  const v = xs.filter((x): x is number => typeof x === "number" && !isNaN(x));
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function stddev(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = avg(xs)!;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = avg(xs.slice(0, n))!;
  const my = avg(ys.slice(0, n))!;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? null : num / denom;
}

export function rollingAvg<T extends Record<string, any>>(
  rows: T[],
  field: keyof T,
  window: number,
): (T & { rolling: number | null })[] {
  return rows.map((row, i) => {
    const slice = rows.slice(Math.max(0, i - window + 1), i + 1);
    const vals = slice.map((r) => r[field]).filter((v) => typeof v === "number") as number[];
    return { ...row, rolling: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null };
  });
}

export function fmt(n: number | null | undefined, digits = 1) {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(digits);
}

export function pctDelta(current: number | null, prev: number | null): number | null {
  if (current == null || prev == null || prev === 0) return null;
  return ((current - prev) / prev) * 100;
}
