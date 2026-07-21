import type { ProjectedTimes } from "@/lib/engine/progression";

/**
 * Projected-times card (#17 projection follow-on). Shows where the athlete's most
 * recent HYROX result should land by the end of this program — a per-event and
 * finish projection scaled by program length, experience, and each event's room
 * to improve. Read-only; computed from the build snapshot.
 */
export default function ProjectionCard({ projection }: { projection: ProjectedTimes }) {
  const { perEvent, finishCurrent, finishProjected, note } = projection;
  const hasFinish = !!finishCurrent && !!finishProjected;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Projected times</h2>
        {hasFinish && (
          <p className="text-sm text-zinc-600">
            Finish <span className="text-zinc-400 line-through tabular-nums">{finishCurrent}</span>{" "}
            <span className="font-semibold tabular-nums text-emerald-700">{finishProjected}</span>
          </p>
        )}
      </div>

      <p className="mt-1 text-sm text-zinc-600">
        Where your most recent result should land by the end of this program — scaled by its length,
        your experience, and how much room each event has to improve.
      </p>

      {perEvent.length > 0 && (
        <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {perEvent.map((e) => (
            <li key={e.key} className="flex items-baseline justify-between gap-2">
              <span className="text-zinc-600">{e.label}</span>
              <span className="tabular-nums">
                <span className="text-zinc-400 line-through">{e.current}</span>{" "}
                <span className="font-medium text-zinc-900">{e.projected}</span>
                <span className="ml-1 text-xs text-emerald-600">
                  −{e.improvementPct.toFixed(1)}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {note && <p className="mt-3 text-xs text-amber-700">{note}</p>}

      <p className="mt-3 text-xs text-zinc-400">
        Estimates anchored to public HYROX benchmarks — treat them as a realistic target, not a
        guarantee.
      </p>
    </section>
  );
}
