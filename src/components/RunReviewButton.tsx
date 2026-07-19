"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RunReviewButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setSummary(null);
    const res = await fetch("/api/agent/run", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setSummary(`${data.created} new, ${data.updated} updated`);
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={run}
        disabled={busy}
        className="px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {busy ? "Running…" : "Run AR Review"}
      </button>
      {summary ? <span className="text-slate-500">{summary}</span> : null}
    </div>
  );
}
