"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * HYROX result lookup + confirm flow (#17). Search by name → pick the result
 * that's yours → get your finish time (and splits) to use as a benchmark. HYROX
 * only. `onPick` lets a parent (e.g. onboarding) auto-fill a field; standalone it
 * just shows the confirmed result.
 */

export interface HyroxCandidate {
  id: string;
  name: string | null;
  division: string | null;
  event: string | null;
  season: string | null;
  totalTimeMs: number | null;
  finishTime: string;
  splits: { station: string; timeMs: number; time: string }[];
}

export default function HyroxLookup({
  onPick,
  defaultFirst = "",
  defaultLast = "",
}: {
  onPick?: (result: HyroxCandidate) => void;
  defaultFirst?: string;
  defaultLast?: string;
}) {
  const [first, setFirst] = useState(defaultFirst);
  const [last, setLast] = useState(defaultLast);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [candidates, setCandidates] = useState<HyroxCandidate[]>([]);
  const [picked, setPicked] = useState<HyroxCandidate | null>(null);

  async function search() {
    if (!last.trim()) {
      setError("Enter your surname to search.");
      return;
    }
    setError(null);
    setLoading(true);
    setPicked(null);
    try {
      const res = await fetch("/api/hyrox-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first, last }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error === "rate_limited"
            ? "Too many lookups right now — try again in a minute."
            : data.error === "not_configured"
              ? "Result lookup isn't available yet."
              : "Couldn't search results — try again.",
        );
        setCandidates([]);
      } else {
        setCandidates((data.candidates as HyroxCandidate[]) ?? []);
      }
      setSearched(true);
    } catch {
      setError("Couldn't search results — try again.");
    } finally {
      setLoading(false);
    }
  }

  function pick(c: HyroxCandidate) {
    setPicked(c);
    onPick?.(c);
  }

  if (picked) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm font-semibold text-emerald-900">✓ Result confirmed</p>
        <p className="mt-1 text-sm text-emerald-800">
          {picked.name ?? "You"}
          {picked.event ? ` · ${picked.event}` : ""}
          {picked.division ? ` · ${picked.division}` : ""}
        </p>
        <p className="mt-2 text-3xl font-bold text-emerald-900">{picked.finishTime}</p>
        {picked.splits.length > 0 && (
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-emerald-800 sm:grid-cols-3">
            {picked.splits.map((s) => (
              <li key={s.station} className="flex justify-between">
                <span>{s.station}</span>
                <span className="tabular-nums">{s.time}</span>
              </li>
            ))}
          </ul>
        )}
        {!onPick && (
          <p className="mt-3 text-xs text-emerald-700">
            Use this as your HYROX goal / benchmark finish time in your profile.
          </p>
        )}
        <button
          type="button"
          onClick={() => setPicked(null)}
          className="mt-3 text-xs text-emerald-700 underline"
        >
          Not you? Search again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          placeholder="First name"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          value={last}
          onChange={(e) => setLast(e.target.value)}
          placeholder="Surname"
          onKeyDown={(e) => e.key === "Enter" && void search()}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button variant="primary" size="sm" onClick={() => void search()} disabled={loading}>
          {loading ? "Searching…" : "Find my HYROX result"}
        </Button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {searched && !loading && candidates.length === 0 && !error && (
        <p className="text-sm text-zinc-500">
          No results found for that name. Check the spelling, or enter your time manually.
        </p>
      )}

      {candidates.length > 0 && (
        <ul className="flex flex-col gap-2">
          {candidates.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-800">
                  {c.name ?? "HYROX result"}
                  {c.division ? <span className="font-normal text-zinc-500"> · {c.division}</span> : null}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {[c.event, c.season].filter(Boolean).join(" · ") || "HYROX"} · {c.finishTime}
                </p>
              </div>
              <button
                type="button"
                onClick={() => pick(c)}
                className="shrink-0 rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
              >
                This is me
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
