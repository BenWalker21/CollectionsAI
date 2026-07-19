"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface ReviewCandidate {
  id: string;
  candidateName: string;
  candidateEmail: string | null;
  confidence: number;
  matchedCustomerName: string;
}

export function MatchReviewQueue({ candidates }: { candidates: ReviewCandidate[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: "confirm" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/customers/match-candidates/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mb-10">
      <h2 className="text-lg font-medium text-slate-900 mb-4">Needs Review ({candidates.length})</h2>
      <p className="text-sm text-slate-500 mb-4">
        These imported customers look similar to existing ones, but not similar enough to link automatically.
      </p>
      {error ? <p className="text-sm text-red-600 mb-4">{error}</p> : null}
      <div className="space-y-3">
        {candidates.map((c) => (
          <div key={c.id} className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Imported: <span className="font-medium text-slate-900">{c.candidateName}</span>
                {c.candidateEmail ? ` (${c.candidateEmail})` : ""}
              </p>
              <p className="text-sm text-slate-500">
                Might be: <span className="font-medium text-slate-900">{c.matchedCustomerName}</span>{" "}
                <span className="text-xs">({Math.round(c.confidence)}% similar)</span>
              </p>
            </div>
            <div className="flex gap-2 shrink-0 ml-4">
              <button
                onClick={() => act(c.id, "confirm")}
                disabled={busyId !== null}
                className="px-3 py-1.5 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
              >
                Same customer
              </button>
              <button
                onClick={() => act(c.id, "reject")}
                disabled={busyId !== null}
                className="px-3 py-1.5 text-sm rounded-md border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                Different customer
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
