"use client";

import { useState, useTransition } from "react";
import { linkActivityToSession, unlinkActivity } from "@/app/activity/actions";
import { encodeSessionValue, decodeSessionValue } from "@/lib/wearables/link";
import type { LinkableProgram } from "@/lib/wearables/link-data";

const DAY_SHORT: Record<string, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

export type CurrentLink = {
  program_id: string;
  week_number: number;
  day: string;
  session_index: number;
} | null;

/**
 * Per-activity link control on the Activity dashboard (Sync-Linking Increment 2,
 * rules #2.3 manual selection and #2.4 manual placement on any day). Linked
 * activities show their target + an Unlink button; unlinked ones expand a
 * program → session picker with an optional RPE.
 */
export default function ActivityLinker({
  activityId,
  programs,
  link,
}: {
  activityId: string;
  programs: LinkableProgram[];
  link: CurrentLink;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [programId, setProgramId] = useState<string>(programs[0]?.programId ?? "");
  const selectedProgram = programs.find((p) => p.programId === programId) ?? programs[0];
  const [sessionValue, setSessionValue] = useState<string>(
    selectedProgram?.sessions[0] ? encodeSessionValue(selectedProgram.sessions[0]) : "",
  );
  const [rpe, setRpe] = useState<string>("");

  function onProgramChange(id: string) {
    setProgramId(id);
    const prog = programs.find((p) => p.programId === id);
    setSessionValue(prog?.sessions[0] ? encodeSessionValue(prog.sessions[0]) : "");
  }

  function submitLink() {
    setError(null);
    const pos = decodeSessionValue(sessionValue);
    if (!programId || !pos) {
      setError("Pick a program and a session.");
      return;
    }
    const rpeNum = rpe.trim() === "" ? undefined : Number(rpe);
    startTransition(async () => {
      const res = await linkActivityToSession({
        activityId,
        programId,
        weekNumber: pos.weekNumber,
        day: pos.day,
        sessionIndex: pos.sessionIndex,
        rpe: rpeNum,
      });
      if (!res.ok) setError(res.error);
      else setOpen(false);
    });
  }

  function submitUnlink() {
    setError(null);
    startTransition(async () => {
      const res = await unlinkActivity(activityId);
      if (!res.ok) setError(res.error);
    });
  }

  // --- Linked state: show target + Unlink ---
  if (link) {
    return (
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
          Linked · Wk {link.week_number} {DAY_SHORT[link.day] ?? link.day}
        </span>
        <button
          type="button"
          onClick={submitUnlink}
          disabled={pending}
          className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-800 disabled:opacity-50"
        >
          {pending ? "Unlinking…" : "Unlink"}
        </button>
        {error && <span className="max-w-[16rem] text-right text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  // --- No programs to link to ---
  if (programs.length === 0) {
    return (
      <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
        Unlinked
      </span>
    );
  }

  // --- Unlinked state: collapsed button, or expanded picker ---
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-full bg-black px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
      >
        Link
      </button>
    );
  }

  return (
    <div className="flex w-full max-w-sm shrink-0 flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <label className="flex flex-col gap-1 text-xs text-zinc-600">
        Program
        <select
          value={programId}
          onChange={(e) => onProgramChange(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
        >
          {programs.map((p) => (
            <option key={p.programId} value={p.programId}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-600">
        Planned session
        <select
          value={sessionValue}
          onChange={(e) => setSessionValue(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
        >
          {(selectedProgram?.sessions ?? []).map((s) => {
            const value = encodeSessionValue(s);
            return (
              <option key={value} value={value}>
                Wk {s.weekNumber} · {DAY_SHORT[s.day] ?? s.day} · {s.label}
              </option>
            );
          })}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-600">
        RPE (optional, 1–10)
        <input
          type="number"
          min={1}
          max={10}
          value={rpe}
          onChange={(e) => setRpe(e.target.value)}
          placeholder="—"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
        />
      </label>

      {error && <span className="text-xs text-red-600">{error}</span>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submitLink}
          disabled={pending}
          className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Linking…" : "Link workout"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
          className="rounded-md px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
