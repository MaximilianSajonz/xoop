import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { sbAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const runtime = "nodejs";

type ImportResult = {
  filename: string;
  detected: string;
  rows: number;
  inserted: number;
  errors: string[];
};

function detectType(filename: string, headers: string[]): string {
  const f = filename.toLowerCase();
  if (f.includes("journal")) return "journal";
  if (f.includes("physiological") || f.includes("cycles")) return "cycles_csv";
  if (f.includes("sleep")) return "sleeps_csv";
  if (f.includes("workout")) return "workouts_csv";
  if (f.includes("heart_rate") || f.includes("hr_") || headers.some((h) => /bpm|heart\s*rate/i.test(h))) return "hr_samples";
  return "unknown";
}

function parseTs(v: any): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseNum(v: any): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// Whoop cycle start time is the evening before; we index by wake date to match `whoop_recovery.day`
function cycleToWakeDay(row: any): string | null {
  const end = parseTs(row["Cycle end time"]);
  if (end) return end.slice(0, 10);
  const start = parseTs(row["Cycle start time"]);
  if (!start) return null;
  const d = new Date(start);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function processJournal(rows: any[], sb: ReturnType<typeof sbAdmin>) {
  const errors: string[] = [];
  let inserted = 0;
  const batch: any[] = [];
  for (const r of rows) {
    const day = cycleToWakeDay(r);
    const question = r["Question text"] ?? r["question"];
    const answerRaw = r["Answered yes"] ?? r["answer"];
    if (!day || !question) continue;
    const answer = String(answerRaw ?? "").toLowerCase();
    const id = `${day}|${question}`.toLowerCase().replace(/[^a-z0-9|]/g, "_").slice(0, 200);
    batch.push({ id, day, question, answer, raw: r });
  }
  if (batch.length) {
    for (let i = 0; i < batch.length; i += 500) {
      const chunk = batch.slice(i, i + 500);
      const { error, count } = await sb.from("whoop_journal").upsert(chunk, { count: "exact" });
      if (error) errors.push(error.message);
      else inserted += count ?? chunk.length;
    }
  }
  return { inserted, errors };
}

async function processHrSamples(rows: any[], sb: ReturnType<typeof sbAdmin>) {
  const errors: string[] = [];
  let inserted = 0;
  if (!rows.length) return { inserted: 0, errors: ["empty file"] };
  const sample = rows[0];
  const tsKey = Object.keys(sample).find((k) => /time|ts|date/i.test(k));
  const bpmKey = Object.keys(sample).find((k) => /bpm|heart/i.test(k));
  if (!tsKey || !bpmKey) return { inserted: 0, errors: [`columns not detected: ${Object.keys(sample).join(", ")}`] };

  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
      .map((r) => ({ ts: parseTs(r[tsKey]), bpm: parseNum(r[bpmKey]) }))
      .filter((r): r is { ts: string; bpm: number } => r.ts != null && r.bpm != null);
    if (!chunk.length) continue;
    const { error, count } = await sb.from("whoop_hr_sample").upsert(chunk, { count: "exact" });
    if (error) errors.push(`batch ${i}: ${error.message}`);
    else inserted += count ?? chunk.length;
  }
  return { inserted, errors };
}

async function processRaw(rows: any[], filename: string, sb: ReturnType<typeof sbAdmin>) {
  const errors: string[] = [];
  let inserted = 0;
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH).map((row, j) => ({ filename, row_index: i + j, row }));
    const { error, count } = await sb.from("whoop_import_raw").insert(chunk, { count: "exact" });
    if (error) errors.push(`batch ${i}: ${error.message}`);
    else inserted += count ?? chunk.length;
  }
  return { inserted, errors };
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const files = form.getAll("files") as File[];
  if (!files.length) return NextResponse.json({ error: "no files" }, { status: 400 });
  const sb = sbAdmin();
  const results: ImportResult[] = [];

  for (const file of files) {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, any>>(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
    const headers = parsed.meta.fields ?? [];
    const detected = detectType(file.name, headers);
    const rows = parsed.data.filter((r) => Object.values(r).some((v) => v !== "" && v != null));

    let proc: { inserted: number; errors: string[] };
    if (detected === "journal") proc = await processJournal(rows, sb);
    else if (detected === "hr_samples") proc = await processHrSamples(rows, sb);
    else proc = await processRaw(rows, file.name, sb);

    results.push({ filename: file.name, detected, rows: rows.length, inserted: proc.inserted, errors: proc.errors.slice(0, 5) });
  }

  return NextResponse.json({ ok: true, results });
}
