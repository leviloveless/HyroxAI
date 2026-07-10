"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-runs generation for an existing program (Tasks addition #2) — rebuilds the
 * skeleton from the saved inputs and generates fresh session content, without
 * making the user re-enter everything. Asks for confirmation first since it
 * replaces the current program.
 */
export default function RegenerateButton({ programId }: { programId: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function recalculate() {
    if (!window.confirm("Recalculate this program? This replaces the current sessions with a freshly generated version.")) {
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, force: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setError(data?.message ?? "You've reached today's generation limit. Please try again later.");
        setRunning(false);
        return;
      }
      if (!res.ok || data.status === "failed") {
        setError(data?.issues?.join("; ") ?? data?.error ?? "Recalculation failed.");
        setRunning(false);
        return;
      }
      router.refresh();
      setRunning(false);
    } catch (e) {
      setError((e as Error).message);
      setRunning(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={recalculate}
        disabled={running}
        className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
      >
        {running && (
          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {running ? "Recalculating…" : "Recalculate"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
