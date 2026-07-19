"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ActionButtons({ actionId }: { actionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  async function act(action: "approve" | "reject") {
    setBusy(action);
    await fetch(`/api/actions/${actionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="flex gap-2 shrink-0 ml-4">
      <button
        onClick={() => act("approve")}
        disabled={busy !== null}
        className="px-3 py-1.5 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {busy === "approve" ? "Approving…" : "Approve"}
      </button>
      <button
        onClick={() => act("reject")}
        disabled={busy !== null}
        className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50 text-red-600 disabled:opacity-50"
      >
        {busy === "reject" ? "Rejecting…" : "Reject"}
      </button>
    </div>
  );
}
