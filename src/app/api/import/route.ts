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
  if (f.includes("heart_rate") || f.includes("hr_") || f.includes("bpm") || headers.includes("heart_rate") || headers.includes("bpm")) return "hr_samples";
  if (f.includes("physiological") || f.includes("cycles")) return "cycles";
  if (f.includes("sleep")) return "sleeps";
  if (f.includes("workout")) return "workouts";
  if (f.includes("journal")) return "journal";
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

async function processHrSamples(rows: any[], sb: ReturnType<typeof sbAdmin>): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;
  const tsKeys = ["timestamp", "time", "ts", "datetime", "Heart Rate Timestamp", "Timestamp"];
  const bpmKeys = ["bpm", "heart_rate", "Heart Rate", "hr"];
  if (!rows.length) return { inserted: 0, errors: ["empty file"] };
  const sample = rows[0];
  const tsKey = tsKeys.find((k) => k in sample) ?? Object.keys(sample).find((k) => /time|ts|date/i.test(k));
  const bpmKey = bpmKeys.find((k) => k in sample) ?? Object.keys(sample).find((k) => /bpm|heart/i.test(k));
  if (!tsKey || !bpmKey) return { inserted: 0, errors: [`could not detect columns. headers: ${Object.keys(sample).join(", ")}`] };

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

async function processJournal(rows: any[], sb: ReturnType<typeof sbAdmin>): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;
  for (const r of rows) {
    const day = parseTs(r["Cycle start time"] ?? r["date"] ?? r["day"] ?? r["Day"])?.slice(0, 10);
    const question = r["Question text"] ?? r["question"] ?? r["Question"];
    const answer = String(r["Answered yes"] ?? r["answer"] ?? r["Answer"] ?? "");
    if (!day || !question) continue;
    const id = `${day}|${question}`.toLowerCase().replace(/\s+/g, "_").slice(0, 200);
    const { error } = await sb.from("whoop_journal").upsert({ id, day, question, answer, raw: r });
    if (error) errors.push(error.message);
    else inserted++;
  }
  return { inserted, errors };
}

async function processRaw(rows: any[], filename: string, sb: ReturnType<typeof sbAdmin>): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  const BATCH = 500;
  let inserted = 0;
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
    if (detected === "hr_samples") proc = await processHrSamples(rows, sb);
    else if (detected === "journal") proc = await processJournal(rows, sb);
    else proc = await processRaw(rows, file.name, sb);

    results.push({
      filename: file.name,
      detected,
      rows: rows.length,
      inserted: proc.inserted,
      errors: proc.errors.slice(0, 5),
    });
  }

  return NextResponse.json({ ok: true, results });
}
