/**
 * HYROX Result API — PURE parsing/formatting helpers (#17), unit-testable.
 *
 * Source: hyroxresultapi.com (official API, Bearer auth, base
 * `https://hyroxresultapi.com/api/v1`). HYROX ONLY — DEKA / Ironman are not
 * covered by this API and stay manual-entry.
 *
 * Flow: search by name → `{ id (race id), person_ref }` hits → fetch each hit's
 * result (splits endpoint) → finish time + station splits. These helpers are
 * defensive about exact field names (the live schema should be confirmed once,
 * then any renames are a one-line change) so a small API shape change degrades
 * gracefully rather than crashing the lookup.
 */

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

/** Read the first present numeric field from a list of candidate keys. */
function pickNum(o: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = num(o[k]);
    if (v != null) return v;
  }
  return null;
}
function pickStr(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = str(o[k]);
    if (v != null) return v;
  }
  return null;
}

/** Milliseconds → "h:mm:ss" (or "m:ss" under an hour). Null-safe → "". */
export function formatMs(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "";
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export interface SearchHit {
  /** Race id (unique per race entry). */
  id: string;
  /** Person reference (stable across an athlete's races). */
  personRef: string | null;
  /** Display name if the search returns it (may be absent → filled by the result fetch). */
  name: string | null;
}

/** Normalize the /athletes/search response into hits. Tolerates `{results:[…]}`,
 *  `{data:[…]}`, `{athletes:[…]}`, or a bare array. */
export function normalizeSearchHits(json: unknown): SearchHit[] {
  const arr = Array.isArray(json)
    ? json
    : Array.isArray((json as { results?: unknown[] })?.results)
      ? (json as { results: unknown[] }).results
      : Array.isArray((json as { data?: unknown[] })?.data)
        ? (json as { data: unknown[] }).data
        : Array.isArray((json as { athletes?: unknown[] })?.athletes)
          ? (json as { athletes: unknown[] }).athletes
          : [];
  const out: SearchHit[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const id = pickStr(o, ["id", "race_id", "raceId"]) ?? (num(o.id) != null ? String(o.id) : null);
    if (!id) continue;
    out.push({
      id,
      personRef: pickStr(o, ["person_ref", "personRef", "athlete_id", "athleteId"]),
      name: pickStr(o, ["name", "full_name", "fullName"]),
    });
  }
  return out;
}

export interface HyroxResult {
  id: string;
  name: string | null;
  division: string | null;
  event: string | null;
  season: string | null;
  /** Total finish time in ms. */
  totalTimeMs: number | null;
  /** Formatted finish, e.g. "1:04:38". */
  finishTime: string;
  splits: { station: string; timeMs: number; time: string }[];
}

/** Human labels for the known HYROX station split keys (best-effort). */
const STATION_LABELS: Record<string, string> = {
  skiErg: "SkiErg",
  ski: "SkiErg",
  sledPush: "Sled Push",
  sled_push: "Sled Push",
  sledPull: "Sled Pull",
  sled_pull: "Sled Pull",
  burpeeBroadJump: "Burpee Broad Jump",
  burpee: "Burpee Broad Jump",
  row: "Row",
  rowErg: "Row",
  farmersCarry: "Farmers Carry",
  farmers: "Farmers Carry",
  sandbagLunge: "Sandbag Lunge",
  lunge: "Sandbag Lunge",
  wallBalls: "Wall Balls",
  wallball: "Wall Balls",
};

/** Extract station splits from a result object's `splits` (or top-level *_time_ms keys). */
function extractSplits(o: Record<string, unknown>): HyroxResult["splits"] {
  const source =
    o.splits && typeof o.splits === "object" ? (o.splits as Record<string, unknown>) : o;
  const out: HyroxResult["splits"] = [];
  for (const [key, val] of Object.entries(source)) {
    const m = /^(.*?)_?time_ms$/i.exec(key);
    if (!m) continue;
    const ms = num(val);
    if (ms == null) continue;
    const base = m[1] ?? key;
    out.push({ station: STATION_LABELS[base] ?? base, timeMs: ms, time: formatMs(ms) });
  }
  return out;
}

/** Normalize an /athletes/{id}/splits (result) response into a HyroxResult. */
export function normalizeResult(id: string, json: unknown): HyroxResult {
  const o = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
  const totalTimeMs = pickNum(o, ["total_time_ms", "totalTimeMs", "finish_time_ms", "total_time"]);
  return {
    id,
    name: pickStr(o, ["name", "full_name", "fullName"]),
    division: pickStr(o, ["division", "division_key", "divisionKey"]),
    event: pickStr(o, ["event", "event_name", "eventName", "race"]),
    season: pickStr(o, ["season", "season_name"]),
    totalTimeMs,
    finishTime: formatMs(totalTimeMs),
    splits: extractSplits(o),
  };
}
