"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary } from "@/lib/ui";

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
      <button onClick={run} disabled={busy} className={btnPrimary}>
        {busy ? "Running…" : "Run AR Review"}
      </button>
      {summary ? <span className="text-navy-700/60">{summary}</span> : null}
    </div>
  );
}
