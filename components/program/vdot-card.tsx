import { formatPace, type RunPaces } from "@/lib/engine/paces";

/**
 * VDOT / VO₂max + training-pace card (#13). Surfaces the Jack Daniels VDOT the
 * engine already computes from the athlete's race times (mile / 5K / 10K, best
 * performance wins) — its VO₂max estimate plus the individual training paces the
 * plan runs on. Display only: the paces here are exactly what the engine uses for
 * run sessions, just made visible so the athlete understands where their paces
 * come from. Running-only; nothing about station/zone output changes.
 */

function Pace({ label, secPerMile, hint }: { label: string; secPerMile: number; hint: string }) {
  return (
    <div className="flex flex-col rounded-lg bg-zinc-50 px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="text-lg font-semibold tabular-nums text-zinc-900">
        {formatPace(secPerMile)}
        <span className="ml-1 text-xs font-normal text-zinc-400">/mi</span>
      </span>
      <span className="text-[11px] text-zinc-500">{hint}</span>
    </div>
  );
}

export default function VdotCard({ paces }: { paces: RunPaces }) {
  const vo2max = Math.round(paces.vdot);
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Your running fitness (VDOT)</h2>
          <p className="text-xs text-zinc-500">
            From your best race time. Your run paces are set from this — the Jack Daniels model.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-semibold tabular-nums text-zinc-900">{paces.vdot}</div>
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">VDOT</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold tabular-nums text-zinc-900">
              {vo2max}
              <span className="ml-0.5 text-xs font-normal text-zinc-400">ml/kg/min</span>
            </div>
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">≈ VO₂max</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Pace label="Easy" secPerMile={paces.easy} hint="aerobic base · long runs" />
        <Pace label="Tempo" secPerMile={paces.tempo} hint="cruise · ~HM effort" />
        <Pace label="Threshold" secPerMile={paces.threshold} hint="comfortably hard" />
        <Pace label="Interval" secPerMile={paces.interval} hint="~5K · VO₂max" />
      </div>

      <p className="mt-3 text-[11px] text-zinc-400">
        Predicted 5K pace ≈ {formatPace(paces.fiveKSecPerMile)}/mi. Add a faster mile, 5K, or 10K time
        in your profile and this updates automatically.
      </p>
    </section>
  );
}
