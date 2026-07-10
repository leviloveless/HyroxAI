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
        className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
      >
        {running ? "Recalculating…" : "Recalculate"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
