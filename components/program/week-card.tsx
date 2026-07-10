import type { ProgramWeek } from "@/lib/schemas";
import SessionCard from "./session-card";
import { DAY_LABEL, MICRO_LABEL, PHASE_COLORS, PHASE_LABEL, dayDateLabel, weekRangeLabel, zoneEntries } from "./format";

function ZoneBars({ week }: { week: ProgramWeek }) {
  const entries = zoneEntries(week.summary.zoneDistribution);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-500">Estimated zone distribution</span>
      <div className="flex h-2.5 overflow-hidden rounded-full">
        {entries.map((e) => (
          <div key={e.zone} className={e.barClass} style={{ width: `${e.pct}%` }} title={`${e.label}: ${e.pct}%`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
        {entries.map((e) => (
          <span key={e.zone}>
            {e.label} {e.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

/** One week: summary block (spec §7) + day cards in training-day order. */
export default function WeekCard({ week, startDate }: { week: ProgramWeek; startDate: string }) {
  const colors = PHASE_COLORS[week.phase];

  return (
    <section id={`week-${week.weekNumber}`} className={`scroll-mt-20 rounded-xl border ${colors.border} bg-white`}>
      {/* Header + summary */}
      <div className="flex flex-col gap-3 border-b border-zinc-100 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Week {week.weekNumber}</h2>
          <span className="text-sm text-zinc-500">{weekRangeLabel(startDate, week.weekNumber)}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.chip}`}>{PHASE_LABEL[week.phase]}</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
            {MICRO_LABEL[week.microWeek]}
          </span>
          {week.raceDay && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
              {week.raceDay.priority} race
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex gap-6 text-sm">
            <span>
              <span className="block text-xs text-zinc-500">Cardio time</span>
              <span className="font-medium">{week.summary.totalCardioMinutes} min</span>
            </span>
            <span>
              <span className="block text-xs text-zinc-500">Running mileage</span>
              <span className="font-medium">{week.summary.totalMileage} mi</span>
            </span>
          </div>
          <ZoneBars week={week} />
        </div>
      </div>

      {/* Days */}
      <div className="grid gap-px bg-zinc-100 sm:grid-cols-2 lg:grid-cols-3">
        {week.days.map((day) => (
          <div key={day.day} className="bg-white p-4">
            <h3 className="mb-2 flex items-baseline justify-between gap-2 text-sm font-semibold text-zinc-900">
              <span>{DAY_LABEL[day.day] ?? day.day}</span>
              <span className="text-xs font-normal text-zinc-400">{dayDateLabel(startDate, week.weekNumber, day.day)}</span>
            </h3>
            {day.sessions.length === 0 ? (
              <p className="text-sm text-zinc-400">Rest day</p>
            ) : (
              <div className="flex flex-col gap-3">
                {day.sessions.map((s, i) => (
                  <SessionCard key={i} session={s} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
