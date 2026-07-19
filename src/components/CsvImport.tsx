"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CsvImport() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/customers/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setSummary(`${data.created} new, ${data.matched} matched, ${data.queuedForReview} need review`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 cursor-pointer">
        {busy ? "Importing…" : "Import customers (CSV)"}
        <input
          type="file"
          accept=".csv"
          className="hidden"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>
      {summary ? <span className="text-slate-500">{summary}</span> : null}
      {error ? <span className="text-red-600">{error}</span> : null}
    </div>
  );
}
