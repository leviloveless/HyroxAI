import { env } from "@/lib/env";
import { normalizeSearchHits, normalizeResult, type SearchHit, type HyroxResult } from "./hyrox-results";

/**
 * HYROX Result API network client (#17). Bearer auth against
 * `https://hyroxresultapi.com/api/v1` (override with HYRESULT_API_BASE). SERVER
 * ONLY — the API key must never reach the browser, so all calls go through the
 * `/api/hyrox-lookup` route, not the client.
 */

function base(): string {
  return (env.HYRESULT_API_BASE ?? "https://hyroxresultapi.com/api/v1").replace(/\/+$/, "");
}

export function hyresultConfigured(): boolean {
  return !!env.HYRESULT_API_KEY;
}

async function apiGet(path: string): Promise<unknown> {
  if (!env.HYRESULT_API_KEY) throw new Error("hyresult_not_configured");
  const res = await fetch(`${base()}${path}`, {
    headers: { Authorization: `Bearer ${env.HYRESULT_API_KEY}`, Accept: "application/json" },
  });
  if (res.status === 429) throw new Error("hyresult_rate_limited");
  if (!res.ok) throw new Error(`hyresult_error_${res.status}`);
  return res.json();
}

// Paths are relative to the base, which ALREADY includes `/api/v1`
// (e.g. https://hyroxresultapi.com/api/v1) — so the endpoint is `/athletes/search`,
// NOT `/v1/athletes/search`, which would double the version segment (→ 404).

/** Search athletes by given name + surname. */
export async function searchAthletes(first: string, last: string): Promise<SearchHit[]> {
  const p = new URLSearchParams();
  if (last.trim()) p.set("q", last.trim());
  if (first.trim()) p.set("first", first.trim());
  const json = await apiGet(`/athletes/search?${p.toString()}`);
  return normalizeSearchHits(json);
}

/** Fetch one athlete's race result (splits endpoint accepts race id / person ref). */
export async function getAthleteResult(id: string): Promise<HyroxResult> {
  const json = await apiGet(`/athletes/${encodeURIComponent(id)}/splits`);
  return normalizeResult(id, json);
}
