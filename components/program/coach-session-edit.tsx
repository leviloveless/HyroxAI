"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@/lib/schemas";
import { saveCoachSession } from "@/app/admin/actions";
import { SessionFields } from "@/components/admin/session-fields";
import { Button } from "@/components/ui/button";

/**
 * Coach-only inline session editor on the athlete program view. A small "Edit"
 * button opens a modal with the shared SessionFields editor; "Save as Coach"
 * persists just this session and recomputes the week's mileage/cardio totals
 * server-side, then refreshes so the updated weekly numbers show immediately.
 */
export default function CoachSessionEdit({
  programId,
  weekNumber,
  day,
  sessionIndex,
  session,
}: {
  programId: string;
  weekNumber: number;
  day: string;
  sessionIndex: number;
  session: Session;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Session>(session);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function openEditor() {
    setDraft(structuredClone(session));
    setMsg(null);
    setOpen(true);
  }

  function save() {
    setMsg(null);
    start(async () => {
      const r = await saveCoachSession(programId, weekNumber, day, sessionIndex, JSON.stringify(draft));
      if (r.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setMsg(r.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        className="rounded border border-indigo-200 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50 print:hidden"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Coach edit — Week {weekNumber}, {day} · {session.kind}
              </h3>
              <button type="button" className="text-sm text-zinc-500" onClick={() => setOpen(false)}>✕</button>
            </div>

            <SessionFields session={draft} onChange={setDraft} />

            <div className="mt-4 flex items-center gap-3 border-t border-zinc-100 pt-3">
              <Button variant="primary" size="sm" onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save as Coach"}
              </Button>
              <button type="button" className="text-sm text-zinc-500" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </button>
              {msg && <span className="text-xs text-red-600">{msg}</span>}
              <span className="ml-auto text-[11px] text-zinc-400">Weekly totals recompute on save</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
