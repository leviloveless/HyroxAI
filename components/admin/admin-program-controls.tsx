"use client";

import { useState, useTransition } from "react";
import { recalcProgramAsAdmin, renameProgramAsAdmin } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

/**
 * Admin quick controls for a program (#15): rename + recalculate on the athlete's
 * behalf. Recalc re-runs the generation pipeline (service role), so it isn't
 * rate-limited like the athlete's own recalculate.
 */
export default function AdminProgramControls({
  programId,
  currentName,
}: {
  programId: string;
  currentName: string;
}) {
  const [name, setName] = useState(currentName);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function rename() {
    setMsg(null);
    start(async () => {
      const r = await renameProgramAsAdmin(programId, name);
      setMsg(r.ok ? "Renamed." : r.error);
    });
  }

  function recalc() {
    if (!window.confirm("Recalculate this athlete's program? Replaces the current sessions with a freshly generated version.")) return;
    setMsg(null);
    start(async () => {
      const r = await recalcProgramAsAdmin(programId);
      setMsg(r.ok ? "Recalculated." : r.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-800"
      />
      <Button variant="secondary" size="sm" onClick={rename} disabled={pending || name === currentName}>
        Rename
      </Button>
      <Button variant="secondary" size="sm" onClick={recalc} disabled={pending}>
        {pending ? "Working…" : "Recalculate"}
      </Button>
      {msg && <span className="text-xs text-zinc-500">{msg}</span>}
    </div>
  );
}
