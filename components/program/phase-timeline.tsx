import type { ProgramWeek } from "@/lib/schemas";
import { PHASE_COLORS, phaseBands, raceMarkers } from "./format";

/** Base/Build/Peak/Taper colour bands sized by week count, with race markers. */
export default function PhaseTimeline({ weeks }: { weeks: ProgramWeek[] }) {
  const bands = phaseBands(weeks);
  const total = weeks.length || 1;
  const races = raceMarkers(weeks);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-8 w-full overflow-hidden rounded-lg">
        {bands.map((b, i) => (
          <div
            key={i}
            className={`flex items-center justify-center ${PHASE_COLORS[b.phase].band} text-[11px] font-semibold text-white`}
            style={{ width: `${(b.weeks / total) * 100}%` }}
            title={`${b.label}: weeks ${b.startWeek}–${b.endWeek}`}
          >
            {b.weeks >= 2 ? b.label : ""}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-zinc-500">
        <span>Week 1</span>
        <span>Week {weeks.length}</span>
      </div>
      {races.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {races.map((r) => (
            <span key={r.weekNumber} className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800">
              {r.priority} race · week {r.weekNumber}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
