"use client";

import { useState } from "react";
import ResultCardStudio from "./result-card-studio";
import type { CardData } from "./result-card";

/**
 * Tiny client trigger for the result-card studio. Lives in the (server) program
 * view and week cards: renders a launch button and owns the modal's open state.
 * `label`/`className` let callers render either the header "Result card" button
 * or a compact inline "Share" link next to a logged session.
 */
export default function ResultCardLauncher({
  initial,
  label = "Result card",
  className,
}: {
  initial?: Partial<CardData>;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "rounded-full border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
        }
      >
        {label}
      </button>
      <ResultCardStudio open={open} onClose={() => setOpen(false)} initial={initial} />
    </>
  );
}
