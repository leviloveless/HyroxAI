import Link from "next/link";
import type { ProgramData } from "@/lib/schemas";
import PhaseTimeline from "./phase-timeline";
import WeekNav from "./week-nav";
import WeekCard from "./week-card";
import RegenerateButton from "@/app/program/[id]/regenerate-button";

export interface ProgramMeta {
  programId: string;
  name: string;
  durationWeeks: number;
  programType: string;
  startDate: string;
}

const PROGRAM_TYPE_LABEL: Record<string, string> = {
  goal_event: "Goal event",
  fixed_duration: "Fixed duration",
  general_fitness: "General fitness",
};

/** Full program view: header + phase timeline + sticky week nav + all weeks. */
export default function ProgramView({ program, meta }: { program: ProgramData; meta: ProgramMeta }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{meta.name}</h1>
            <p className="text-sm text-zinc-500">
              {meta.durationWeeks} weeks · {PROGRAM_TYPE_LABEL[meta.programType] ?? meta.programType}
            </p>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <RegenerateButton programId={meta.programId} />
            <Link href="/dashboard" className="text-sm underline">
              Dashboard
            </Link>
          </div>
        </div>
        <PhaseTimeline weeks={program.weeks} />
      </header>

      <WeekNav weeks={program.weeks} />

      {/* All weeks, vertically */}
      <div className="flex flex-col gap-6">
        {program.weeks.map((w) => (
          <WeekCard key={w.weekNumber} week={w} startDate={meta.startDate} />
        ))}
      </div>
    </div>
  );
}
