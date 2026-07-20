"use client";

import { useState, useTransition } from "react";
import { addCoachingNote, deleteCoachingNote } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export type AdminNote = { id: string; body: string; created_at: string };

/**
 * Admin coaching-notes panel (#15/#16) — add notes the athlete sees on their
 * program, and remove them. Server actions gate on getAdmin().
 */
export default function CoachingNotes({
  programId,
  notes,
}: {
  programId: string;
  notes: AdminNote[];
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add() {
    setError(null);
    start(async () => {
      const r = await addCoachingNote(programId, body);
      if (r.ok) setBody("");
      else setError(r.error);
    });
  }

  function remove(id: string) {
    start(async () => {
      const r = await deleteCoachingNote(id, programId);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 4000))}
          placeholder="Coaching note for this athlete — they'll see it on their program."
          rows={3}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800"
        />
        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={add} disabled={pending || !body.trim()}>
            {pending ? "Saving…" : "Add note"}
          </Button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>

      {notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-pre-wrap text-sm text-zinc-700">{n.body}</p>
                <button
                  type="button"
                  onClick={() => remove(n.id)}
                  disabled={pending}
                  className="shrink-0 text-xs text-red-500 underline hover:text-red-700"
                >
                  Delete
                </button>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
