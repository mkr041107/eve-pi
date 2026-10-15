import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characterPrefs } from "@/db/schema";
import {
  fetchColonyLayout,
  fetchColonyList,
  loadCachedColonies,
} from "@/lib/esi/colonies";
import type { ColonyLayout } from "@/lib/esi/types";
import { getValidAccessToken } from "@/lib/sso/tokens";

export async function getHorizonHours(characterId: number): Promise<number> {
  const [row] = await db
    .select()
    .from(characterPrefs)
    .where(eq(characterPrefs.characterId, characterId))
    .limit(1);
  return row?.horizonHours ?? 24;
}

export async function setHorizonHours(characterId: number, hours: number) {
  await db
    .insert(characterPrefs)
    .values({ characterId, horizonHours: hours, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: characterPrefs.characterId,
      set: { horizonHours: hours, updatedAt: new Date() },
    });
}

export async function syncAllColonies(characterId: number) {
  const token = await getValidAccessToken(characterId);
  const listRes = await fetchColonyList(characterId, token);
  const colonies = listRes.data;
  const cached = await loadCachedColonies(characterId);
  const cachedByPlanet = new Map(cached.map((c) => [c.planetId, c]));

  const layouts: {
    planetId: number;
    layout: ColonyLayout;
    fetchedAt: Date;
  }[] = [];

  for (const colony of colonies) {
    const prev = cachedByPlanet.get(colony.planet_id);
    const result = await fetchColonyLayout(characterId, colony.planet_id, token, {
      etag: prev?.etag ?? undefined,
      payload: (prev?.payload as ColonyLayout | undefined) ?? undefined,
      expiresAt: prev?.expiresAt ?? undefined,
    });
    layouts.push({
      planetId: colony.planet_id,
      layout: result.layout,
      fetchedAt: result.fromCache
        ? (prev?.fetchedAt ?? new Date())
        : new Date(),
    });
  }

  return { colonies, layouts };
}
