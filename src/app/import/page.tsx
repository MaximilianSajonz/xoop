"use client";
import { useState } from "react";

type ImportResult = {
  filename: string;
  detected: string;
  rows: number;
  inserted: number;
  errors: string[];
};

export default function ImportPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function add(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).filter((f) => f.name.toLowerCase().endsWith(".csv"));
    setFiles((prev) => [...prev, ...arr]);
  }

  async function upload() {
    if (!files.length) return;
    setBusy(true);
    setError(null);
    setResults(null);
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    try {
      const r = await fetch("/api/import", { method: "POST", body: fd });
      const j = await r.json();
      if (j.ok) {
        setResults(j.results);
        setFiles([]);
      } else {
        setError(j.error ?? "failed");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 fade-in">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-br from-white via-emerald-200 to-emerald-500 bg-clip-text text-transparent">Import</h1>
        <a href="/" className="text-sm text-neutral-400 transition hover:text-white">← dashboard</a>
      </header>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-5 text-sm text-neutral-300 space-y-2">
        <p><strong className="text-white">Whoop data export.</strong> Drop the CSVs from your Whoop data ZIP here.</p>
        <p>Request the export at <code className="text-emerald-300">account.whoop.com</code> → Profile → Privacy → Request a copy of my data, or in the Whoop app under More → App Settings → Privacy.</p>
        <p className="text-neutral-500">Files matched by name and headers. <em>heart_rate.csv</em> goes into a samples table. <em>journal_entries.csv</em> goes into behavior logs. Anything unknown is stored raw for inspection.</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          add(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-10 text-center transition ${
          dragOver ? "border-emerald-400 bg-emerald-500/5" : "border-neutral-700 bg-neutral-900/20"
        }`}
      >
        <p className="mb-3 text-neutral-300">Drag CSV files here</p>
        <p className="mb-4 text-xs text-neutral-500">or</p>
        <label className="inline-block cursor-pointer rounded bg-white px-4 py-2 text-sm font-medium text-black">
          Choose files
          <input
            type="file"
            accept=".csv"
            multiple
            className="hidden"
            onChange={(e) => add(e.target.files)}
          />
        </label>
      </div>

      {files.length > 0 && (
        <div className="rounded-xl border border-neutral-800 p-4">
          <h2 className="mb-3 text-sm font-medium text-neutral-400">Selected ({files.length})</h2>
          <ul className="space-y-1 text-sm">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between border-b border-neutral-800 py-1">
                <span className="text-neutral-200">{f.name}</span>
                <span className="text-xs text-neutral-500">{(f.size / 1024).toFixed(1)} KB</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <button
              onClick={upload}
              disabled={busy}
              className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {busy ? "Uploading…" : `Import ${files.length} file${files.length > 1 ? "s" : ""}`}
            </button>
            <button onClick={() => setFiles([])} disabled={busy} className="rounded border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-900 disabled:opacity-50">
              Clear
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded border border-red-800 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {results && (
        <div className="rounded-xl border border-emerald-800 bg-emerald-950/20 p-4">
          <h2 className="mb-3 text-sm font-medium text-emerald-300">Results</h2>
          <table className="w-full text-sm">
            <thead className="text-neutral-400">
              <tr>
                <th className="text-left p-1">File</th>
                <th className="text-left p-1">Type</th>
                <th className="text-right p-1">Rows</th>
                <th className="text-right p-1">Inserted</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-t border-neutral-800">
                  <td className="p-1">{r.filename}</td>
                  <td className="p-1"><code className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs">{r.detected}</code></td>
                  <td className="p-1 text-right">{r.rows.toLocaleString()}</td>
                  <td className="p-1 text-right text-emerald-300">{r.inserted.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.some((r) => r.errors.length) && (
            <div className="mt-3 space-y-1 text-xs text-amber-300">
              {results.flatMap((r) => r.errors.map((e, j) => <div key={`${r.filename}-${j}`}>{r.filename}: {e}</div>))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
