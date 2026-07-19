"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnDanger, btnPrimary } from "@/lib/ui";

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
      <button onClick={() => act("approve")} disabled={busy !== null} className={btnPrimary}>
        {busy === "approve" ? "Approving…" : "Approve"}
      </button>
      <button onClick={() => act("reject")} disabled={busy !== null} className={btnDanger}>
        {busy === "reject" ? "Rejecting…" : "Reject"}
      </button>
    </div>
  );
}
