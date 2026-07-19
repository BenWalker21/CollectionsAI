"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnSecondary } from "@/lib/ui";

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
      const skippedNote = data.skippedArtifacts > 0 ? `, ${data.skippedArtifacts} skipped (looked like report text, not customers)` : "";
      setSummary(`${data.created} new, ${data.matched} matched, ${data.queuedForReview} need review${skippedNote}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <label className={`${btnSecondary} cursor-pointer`}>
        {busy ? "Importing…" : "Import customers (CSV)"}
        <input
          type="file"
          accept=".csv"
          className="hidden"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>
      {summary ? <span className="text-navy-700/60">{summary}</span> : null}
      {error ? <span className="text-rust-600">{error}</span> : null}
    </div>
  );
}
