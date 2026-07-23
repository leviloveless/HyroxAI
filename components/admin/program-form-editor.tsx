"use client";

import { useMemo, useState, useTransition } from "react";
import { updateProgramData } from "@/app/admin/actions";
import { ProgramDataSchema, type ProgramData } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { SessionFields, defaultSession, SESSION_KINDS, inputCls, type Kind } from "./session-fields";

/**
 * Structured (no-code) admin program editor (#15). Renders programs.program_data
 * as a FORM — weeks -> days -> sessions -> movements — so an admin can swap
 * exercises, change sets/reps/weight, add or remove sessions, etc. without
 * touching JSON or code. Saves through the schema-validated `updateProgramData`
 * action. The per-session field editors are shared with the inline athlete-view
 * "Save as Coach" editor (./session-fields).
 */

const DAY_LABEL: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

export default function ProgramFormEditor({ programId, initialData }: { programId: string; initialData: unknown }) {
  const parsed = useMemo(() => ProgramDataSchema.safeParse(initialData), [initialData]);
  const [data, setData] = useState<ProgramData | null>(parsed.success ? parsed.data : null);
  const [weekIdx, setWeekIdx] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function mutate(fn: (d: ProgramData) => void) {
    setData((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
    setDirty(true);
    setMsg(null);
  }

  if (!data) {
    return (
      <p className="text-sm text-amber-600">
        This program&apos;s data does not match the current schema — use the raw JSON editor below to repair it.
      </p>
    );
  }

  const week = data.weeks[weekIdx];

  function save() {
    setMsg(null);
    start(async () => {
      const r = await updateProgramData(programId, JSON.stringify(data));
      if (r.ok) { setDirty(false); setMsg({ kind: "ok", text: "Saved." }); }
      else setMsg({ kind: "err", text: r.error });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500">Week</span>
        <select className={inputCls} value={weekIdx} onChange={(e) => setWeekIdx(Number(e.target.value))}>
          {data.weeks.map((w, i) => (
            <option key={w.weekNumber} value={i}>Week {w.weekNumber} — {w.phase}/{w.microWeek}</option>
          ))}
        </select>
        {week && (
          <span className="text-xs text-zinc-400">
            {Math.round(week.summary.totalMileage)} mi · {Math.round(week.summary.totalCardioMinutes)} cardio min
          </span>
        )}
      </div>

      {week && (
        <div className="flex flex-col gap-4">
          {week.days.map((day, di) => (
            <div key={day.day} className="rounded-xl border border-zinc-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{DAY_LABEL[day.day] ?? day.day}</h3>
                <select
                  className={inputCls}
                  value=""
                  onChange={(e) => { const k = e.target.value as Kind; if (k) mutate((d) => { d.weeks[weekIdx]!.days[di]!.sessions.push(defaultSession(k)); }); }}
                >
                  <option value="">+ Add session…</option>
                  {SESSION_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              {day.sessions.length === 0 ? (
                <p className="text-xs text-zinc-400">Rest day (no sessions).</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {day.sessions.map((s, si) => (
                    <div key={si} className="rounded-lg bg-zinc-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{s.kind}</span>
                        <button type="button" className="text-xs text-red-600 underline" onClick={() => mutate((d) => { d.weeks[weekIdx]!.days[di]!.sessions.splice(si, 1); })}>Remove session</button>
                      </div>
                      <SessionFields session={s} onChange={(ns) => mutate((d) => { d.weeks[weekIdx]!.days[di]!.sessions[si] = ns; })} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="sticky bottom-2 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white/90 p-2 backdrop-blur">
        <Button variant="primary" size="sm" onClick={save} disabled={pending || !dirty}>{pending ? "Saving…" : "Save program"}</Button>
        {dirty && !pending && <span className="text-xs text-amber-600">Unsaved changes</span>}
        {msg && <span className={`text-xs ${msg.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
