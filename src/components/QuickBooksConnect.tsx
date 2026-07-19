"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      <a
        href="/api/quickbooks/connect"
        className="px-3 py-1.5 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-700"
      >
        Connect QuickBooks
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-500">
        QuickBooks: <span className="text-slate-900 font-medium">{companyName || "Connected"}</span>
      </span>
      <button
        onClick={sync}
        disabled={busy !== null}
        className="px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {busy === "sync" ? "Syncing…" : "Sync now"}
      </button>
      <button
        onClick={disconnect}
        disabled={busy !== null}
        className="px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
      >
        {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
      </button>
    </div>
  );
}
