"use client";

import { useState } from "react";
import { renameProgram } from "./actions";

/**
 * Inline "Rename" control for a dashboard program (Tasks addition #1).
 * Toggles to an input; Save calls the renameProgram server action, which
 * revalidates the dashboard.
 */
export default function RenameProgram({
  programId,
  currentName,
}: {
  programId: string;
  currentName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentName);
  const [saving, setSaving] = useState(false);

  async function save() {
    const name = value.trim();
    if (!name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("programId", programId);
    fd.set("name", name);
    await renameProgram(fd);
    setSaving(false);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(currentName);
          setEditing(true);
        }}
        className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
      >
        Rename
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-40 rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-black focus:outline-none"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-md bg-black px-2 py-1 text-xs text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {saving ? "…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
      >
        Cancel
      </button>
    </span>
  );
}
