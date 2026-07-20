"use client";

import { useState, useTransition } from "react";
import { updateProgramData } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

/**
 * Admin program editor (#15) — full manual edit of a program's `program_data`.
 * A schema-validated JSON editor: the admin can change ANY aspect of the plan,
 * but the server re-validates against ProgramDataSchema on save, so a bad edit is
 * rejected with a precise error rather than corrupting the athlete's program.
 */
export default function ProgramEditor({
  programId,
  initialJson,
}: {
  programId: string;
  initialJson: string;
}) {
  const [json, setJson] = useState(initialJson);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = json !== initialJson;

  function prettify() {
    try {
      setJson(JSON.stringify(JSON.parse(json), null, 2));
      setMsg(null);
    } catch {
      setMsg({ kind: "err", text: "Can't format — invalid JSON." });
    }
  }

  function save() {
    setMsg(null);
    start(async () => {
      const r = await updateProgramData(programId, json);
      setMsg(r.ok ? { kind: "ok", text: "Saved." } : { kind: "err", text: r.error });
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          Edit any aspect of the plan. Validated against the program schema on save.
        </p>
        <button type="button" onClick={prettify} className="text-xs text-zinc-500 underline">
          Format JSON
        </button>
      </div>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        spellCheck={false}
        rows={20}
        className="w-full rounded-lg border border-zinc-300 p-3 font-mono text-xs leading-relaxed text-zinc-800"
      />
      <div className="flex items-center gap-3">
        <Button variant="primary" size="sm" onClick={save} disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save program"}
        </Button>
        {dirty && !pending && <span className="text-xs text-amber-600">Unsaved changes</span>}
        {msg && (
          <span className={`text-xs ${msg.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
