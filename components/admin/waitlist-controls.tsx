"use client";

import { useTransition } from "react";
import { setWaitlistStatus } from "@/app/admin/actions";

/**
 * Approve / decline a coaching-waitlist application (#16). Manual gate — approving
 * just marks intent; Levi onboards the client outside the app (no auto-charge).
 */
export default function WaitlistControls({
  id,
  status,
}: {
  id: string;
  status: "applied" | "approved" | "declined";
}) {
  const [pending, start] = useTransition();

  function set(next: "applied" | "approved" | "declined") {
    start(async () => {
      await setWaitlistStatus(id, next);
    });
  }

  const badge =
    status === "approved"
      ? "bg-emerald-100 text-emerald-800"
      : status === "declined"
        ? "bg-zinc-200 text-zinc-600"
        : "bg-amber-100 text-amber-800";

  return (
    <div className="flex items-center gap-2">
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${badge}`}>
        {status}
      </span>
      {status !== "approved" && (
        <button
          type="button"
          onClick={() => set("approved")}
          disabled={pending}
          className="text-xs text-emerald-700 underline disabled:opacity-50"
        >
          Approve
        </button>
      )}
      {status !== "declined" && (
        <button
          type="button"
          onClick={() => set("declined")}
          disabled={pending}
          className="text-xs text-zinc-500 underline disabled:opacity-50"
        >
          Decline
        </button>
      )}
    </div>
  );
}
