"use client";

import { useState, useTransition } from "react";
import { linkActivityToSession, unlinkActivity } from "@/app/activity/actions";
import type { SyncActivitySummary } from "@/lib/wearables/suggest-data";

/**
 * Per-session sync-link control in the program view (link synced workouts
 * directly from the week table). Collapsed it's a small chip: "Synced" when a
 * wearable activity is already linked to this session, or "＋ Sync" to attach
 * one. Opening it shows a compact modal — the linked activity with an Unlink, or
 * a picker of unlinked synced workouts. Reuses the same server actions as the
 * Activity dashboard, so linking writes a workout_log and feeds the engine.
 * Hidden for race sessions and on frozen (already-reviewed) weeks with no link.
 */
export default function SessionLink({
  programId,
  weekNumber,
  day,
  sessionIndex,
  linked,
  activities,
  frozen,
}: {
  programId: string;
  weekNumber: number;
  day: string;
  sessionIndex: number;
  linked: SyncActivitySummary | null;
  activities: SyncActivitySummary[];
  frozen: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<string>(activities[0]?.activityId ?? "");

  // Frozen week with nothing linked: no control (linking is server-blocked anyway).
  if (frozen && !linked) return null;

  function doLink() {
    setError(null);
    if (!choice) {
      setError("Pick a synced workout.");
      return;
    }
    startTransition(async () => {
      const res = await linkActivityToSession({
        activityId: choice,
        programId,
        weekNumber,
        day,
        sessionIndex,
      });
      if (!res.ok) setError(res.error);
      else setOpen(false);
    });
  }

  function doUnlink() {
    if (!linked) return;
    setError(null);
    startTransition(async () => {
      const res = await unlinkActivity(linked.activityId);
      if (!res.ok) setError(res.error);
      else setOpen(false);
    });
  }

  const chip = linked ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      title={`Synced: ${linked.title}`}
      className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800 hover:bg-sky-200"
    >
      <span aria-hidden>⟲</span> Synced
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      title="Link a synced workout"
      className="inline-flex items-center rounded-full border border-zinc-300 px-2 py-0.5 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100"
    >
      ＋ Sync
    </button>
  );

  if (!open) return <span className="print:hidden">{chip}</span>;

  return (
    <span className="print:hidden">
      {chip}
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
        onClick={() => setOpen(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-link-title"
          className="w-full max-w-sm rounded-t-2xl bg-white p-5 text-left shadow-xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id="session-link-title" className="text-sm font-semibold">
            {linked ? "Linked synced workout" : "Link a synced workout"}
          </h3>

          {linked ? (
            <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-sm font-medium text-zinc-800">{linked.title}</p>
              {linked.detail && <p className="text-xs text-zinc-500">{linked.detail}</p>}
            </div>
          ) : activities.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">
              No unlinked synced workouts. Sync a wearable from Settings → Connections, then link it
              here.
            </p>
          ) : (
            <label className="mt-3 flex flex-col gap-1 text-xs text-zinc-500">
              Synced workout
              <select
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-800"
              >
                {activities.map((a) => (
                  <option key={a.activityId} value={a.activityId}>
                    {a.title}
                    {a.detail ? ` — ${a.detail}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="rounded-md px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
            >
              Close
            </button>
            {linked ? (
              <button
                type="button"
                onClick={doUnlink}
                disabled={pending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? "Unlinking…" : "Unlink"}
              </button>
            ) : (
              activities.length > 0 && (
                <button
                  type="button"
                  onClick={doLink}
                  disabled={pending}
                  className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800 disabled:opacity-50"
                >
                  {pending ? "Linking…" : "Link workout"}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </span>
  );
}
