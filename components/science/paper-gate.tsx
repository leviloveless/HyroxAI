"use client";

import { useState } from "react";

/**
 * Email gate for the methodology PDF. Captures the email (best-effort, via
 * /api/leads/science) then reveals the download. The full white paper is free
 * to read on-site; only the PDF is gated — a low-friction lead magnet.
 */

const PDF_URL = "/duravel-training-science.pdf";

export default function PaperGate({ sport }: { sport?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/leads/science", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "science_pdf", sport }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center">
        <p className="text-sm font-medium text-zinc-800">Thanks — your copy is ready.</p>
        <a
          href={PDF_URL}
          download
          className="mt-3 inline-block rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Download the PDF
        </a>
        <p className="mt-3 text-xs text-zinc-400">
          Didn&apos;t start automatically? Use the button above.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <label className="block text-sm font-medium text-zinc-800" htmlFor="paper-gate-email">
        Get the full methodology as a PDF
      </label>
      <p className="mt-1 text-sm text-zinc-500">
        Enter your email and we&apos;ll unlock the download.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="paper-gate-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          {status === "loading" ? "…" : "Get the PDF"}
        </button>
      </div>
      {status === "error" && (
        <p className="mt-2 text-sm text-red-600">Enter a valid email and try again.</p>
      )}
      <p className="mt-3 text-xs text-zinc-400">
        We&apos;ll send occasional Duravel training science. Unsubscribe anytime.
      </p>
    </form>
  );
}
