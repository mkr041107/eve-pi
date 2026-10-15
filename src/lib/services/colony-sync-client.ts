import { esiFetch } from "@/lib/esi/client-browser";
import type { ColonyLayout, ColonySummary } from "@/lib/esi/types";
import { getValidAccessToken } from "@/lib/sso/client-auth";
import {
  getHorizonHours,
  loadColonyCache,
  saveColonyCache,
  setHorizonHours,
  type CachedColony,
} from "@/lib/storage/local-data";
import { buildForecast } from "@/lib/pi/forecast";
import { ensureSdeBundle } from "@/lib/sde/load";

export { getHorizonHours, setHorizonHours };

async function fetchColonyList(characterId: number, accessToken: string) {
  return esiFetch<ColonySummary[]>(`/characters/${characterId}/planets/`, accessToken);
}

async function fetchColonyLayout(
  characterId: number,
  planetId: number,
  accessToken: string,
  cached?: CachedColony,
) {
  const now = Date.now();
  if (
    cached?.payload &&
    cached.expiresAt &&
    new Date(cached.expiresAt).getTime() > now
  ) {
    return { layout: cached.payload, fromCache: true, fetchedAt: new Date(cached.fetchedAt) };
  }

  const res = await esiFetch<ColonyLayout>(
    `/characters/${characterId}/planets/${planetId}/`,
    accessToken,
    { etag: cached?.etag },
  );

  if (res.notModified && cached?.payload) {
    return {
      layout: cached.payload,
      fromCache: true,
      fetchedAt: new Date(cached.fetchedAt),
    };
  }

  const entry: CachedColony = {
    planetId,
    etag: res.etag,
    payload: res.data,
    expiresAt: res.expiresAt?.toISOString(),
    fetchedAt: new Date().toISOString(),
  };

  const all = loadColonyCache(characterId).filter((c) => c.planetId !== planetId);
  all.push(entry);
  saveColonyCache(characterId, all);

  return { layout: res.data, fromCache: false, fetchedAt: new Date(entry.fetchedAt) };
}

export async function syncAllColonies(characterId: number) {
  await ensureSdeBundle();
  const accessToken = await getValidAccessToken(characterId);
  const listRes = await fetchColonyList(characterId, accessToken);
  const colonies = listRes.data;
  const cached = loadColonyCache(characterId);
  const byPlanet = new Map(cached.map((c) => [c.planetId, c]));

  const layouts: {
    planetId: number;
    layout: ColonyLayout;
    fetchedAt: Date;
  }[] = [];

  for (const colony of colonies) {
    const prev = byPlanet.get(colony.planet_id);
    const result = await fetchColonyLayout(
      characterId,
      colony.planet_id,
      accessToken,
      prev,
    );
    layouts.push({
      planetId: colony.planet_id,
      layout: result.layout,
      fetchedAt: result.fetchedAt,
    });
  }

  return { colonies, layouts };
}

export async function loadForecast(characterId: number, characterName: string, hours?: number) {
  await ensureSdeBundle();
  let horizon = getHorizonHours(characterId);
  if (hours !== undefined && hours > 0 && hours <= 24 * 14) {
    horizon = hours;
    setHorizonHours(characterId, horizon);
  }

  const { colonies, layouts } = await syncAllColonies(characterId);
  const forecast = buildForecast(colonies, layouts, horizon);

  return {
    character: { characterId, characterName },
    forecast,
    lastSync: layouts.map((l) => ({
      planetId: l.planetId,
      fetchedAt: l.fetchedAt.toISOString(),
    })),
  };
}
