import type { ProgramWeek } from "@/lib/schemas";
import { PHASE_COLORS } from "./format";

/**
 * Sticky week-jump nav for long programs. Anchor links only (no JS) — each
 * chip scrolls to the matching `#week-N` section.
 */
export default function WeekNav({ weeks }: { weeks: ProgramWeek[] }) {
  return (
    <nav className="sticky top-0 z-10 -mx-2 border-b border-zinc-100 bg-white/90 px-2 py-2 backdrop-blur print:hidden">
      <div className="flex gap-1.5 overflow-x-auto">
        {weeks.map((w) => (
          <a
            key={w.weekNumber}
            href={`#week-${w.weekNumber}`}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-medium text-zinc-700 hover:bg-zinc-50 ${
              w.raceDay ? "border-red-300 bg-red-50 text-red-700" : PHASE_COLORS[w.phase].border
            }`}
            title={`Week ${w.weekNumber}`}
          >
            {w.weekNumber}
          </a>
        ))}
      </div>
    </nav>
  );
}
