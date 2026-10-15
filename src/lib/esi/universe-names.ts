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

async function fetchNameChunk(ids: number[]): Promise<Record<number, string>> {
  const url = `https://esi.evetech.net/latest/universe/names/?user_agent=${userAgentParam()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Compatibility-Date": compatibilityDate(),
      Accept: "application/json",
      "X-User-Agent":
        process.env.NEXT_PUBLIC_ESI_USER_AGENT ??
        "eve-pi/0.1.0 (github-pages)",
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

export async function resolveUniverseNames(
  ids: number[],
): Promise<Record<number, string>> {
  const unique = [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];
  if (unique.length === 0) return {};

  const cache = readCache();
  const missing = unique.filter((id) => !cache[id]);
  for (let i = 0; i < missing.length; i += 1000) {
    const chunk = missing.slice(i, i + 1000);
    const fetched = await fetchNameChunk(chunk);
    Object.assign(cache, fetched);
  }
  writeCache(cache);

  const result: Record<number, string> = {};
  for (const id of unique) {
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
