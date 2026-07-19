"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, btnSecondary } from "@/lib/ui";

interface QuickBooksConnectProps {
  connected: boolean;
  companyName: string | null;
}

export function QuickBooksConnect({ connected, companyName }: QuickBooksConnectProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"sync" | "disconnect" | null>(null);

  async function sync() {
    setBusy("sync");
    await fetch("/api/quickbooks/sync", { method: "POST" });
    setBusy(null);
    router.refresh();
  }

  async function disconnect() {
    setBusy("disconnect");
    await fetch("/api/quickbooks/disconnect", { method: "POST" });
    setBusy(null);
    router.refresh();
  }

  if (!connected) {
    return (
      <a href="/api/quickbooks/connect" className={btnPrimary}>
        Connect QuickBooks
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-navy-700/60">
        QuickBooks: <span className="text-navy-950 font-medium">{companyName || "Connected"}</span>
      </span>
      <button onClick={sync} disabled={busy !== null} className={btnPrimary}>
        {busy === "sync" ? "Syncing…" : "Sync now"}
      </button>
      <button onClick={disconnect} disabled={busy !== null} className={btnSecondary}>
        {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
      </button>
    </div>
  );
}
