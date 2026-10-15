import type { ColonySummary } from "@/lib/esi/types";

const CACHE_KEY = "eve_pi_universe_names_v1";

function compatibilityDate(): string {
  const fixed = process.env.NEXT_PUBLIC_ESI_COMPATIBILITY_DATE;
  if (fixed) return fixed;
  const shifted = new Date(Date.now() - 11 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function userAgentParam(): string {
  const ua =
    process.env.NEXT_PUBLIC_ESI_USER_AGENT ??
    "eve-pi/0.1.0 (github-pages; +https://github.com/eve-pi)";
  return encodeURIComponent(ua);
}

function esiHeaders(): Record<string, string> {
  return {
    "X-Compatibility-Date": compatibilityDate(),
    Accept: "application/json",
    "X-User-Agent":
      process.env.NEXT_PUBLIC_ESI_USER_AGENT ??
      "eve-pi/0.1.0 (github-pages)",
  };
}

function readCache(): Record<number, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    const out: Record<number, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const id = Number(k);
      if (Number.isFinite(id) && v) out[id] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function writeCache(cache: Record<number, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

/** POST /universe/names — solar systems, stations, etc. (not planets). */
async function fetchSystemNamesChunk(
  ids: number[],
): Promise<Record<number, string>> {
  if (ids.length === 0) return {};
  const url = `https://esi.evetech.net/latest/universe/names/?datasource=tranquility&user_agent=${userAgentParam()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...esiHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ids),
  });
  if (!res.ok) {
    throw new Error(`ESI universe/names failed: ${res.status}`);
  }
  const rows = (await res.json()) as { id: number; name: string }[];
  const out: Record<number, string> = {};
  for (const row of rows) out[row.id] = row.name;
  return out;
}

async function fetchPlanetName(planetId: number): Promise<string | null> {
  const url = `https://esi.evetech.net/latest/universe/planets/${planetId}/?datasource=tranquility&user_agent=${userAgentParam()}`;
  const res = await fetch(url, { headers: esiHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`ESI universe/planets/${planetId} failed: ${res.status}`);
  }
  const data = (await res.json()) as { name?: string };
  return data.name ?? null;
}

/**
 * Resolve planet and solar system names for PI colonies.
 * Planets must use GET /universe/planets/{id}/ — they are not valid for POST /universe/names/.
 */
export async function resolveColonyLocationNames(
  colonies: Pick<ColonySummary, "planet_id" | "solar_system_id">[],
): Promise<Record<number, string>> {
  const systemIds = [
    ...new Set(
      colonies
        .map((c) => c.solar_system_id)
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
  const planetIds = [
    ...new Set(
      colonies
        .map((c) => c.planet_id)
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];

  if (systemIds.length === 0 && planetIds.length === 0) return {};

  const cache = readCache();

  const missingSystems = systemIds.filter((id) => !cache[id]);
  for (let i = 0; i < missingSystems.length; i += 1000) {
    const chunk = missingSystems.slice(i, i + 1000);
    try {
      Object.assign(cache, await fetchSystemNamesChunk(chunk));
    } catch {
      for (const id of chunk) {
        try {
          Object.assign(cache, await fetchSystemNamesChunk([id]));
        } catch {
          /* keep fallback label */
        }
      }
    }
  }

  const missingPlanets = planetIds.filter((id) => !cache[id]);
  for (const planetId of missingPlanets) {
    try {
      const name = await fetchPlanetName(planetId);
      if (name) cache[planetId] = name;
    } catch {
      /* keep fallback label */
    }
  }

  writeCache(cache);

  const result: Record<number, string> = {};
  for (const id of [...systemIds, ...planetIds]) {
    result[id] = cache[id] ?? `ID ${id}`;
  }
  return result;
}

export function formatPlanetType(planetType: string): string {
  if (!planetType || planetType === "unknown") return "Unknown";
  return planetType
    .split(/[_\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
