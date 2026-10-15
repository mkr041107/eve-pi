import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { colonyCache } from "@/db/schema";
import { esiFetch } from "./client";
import type { ColonyLayout, ColonySummary } from "./types";

export async function fetchColonyList(characterId: number, accessToken: string) {
  const res = await esiFetch<ColonySummary[]>(
    `/characters/${characterId}/planets/`,
    accessToken,
  );
  return res;
}

export async function fetchColonyLayout(
  characterId: number,
  planetId: number,
  accessToken: string,
  cached?: { etag?: string; payload?: ColonyLayout; expiresAt?: Date | null },
): Promise<{
  layout: ColonyLayout;
  etag?: string;
  expiresAt?: Date;
  fromCache: boolean;
}> {
  const now = new Date();
  if (
    cached?.payload &&
    cached.expiresAt &&
    cached.expiresAt.getTime() > now.getTime()
  ) {
    return {
      layout: cached.payload,
      etag: cached.etag,
      expiresAt: cached.expiresAt,
      fromCache: true,
    };
  }

  const res = await esiFetch<ColonyLayout>(
    `/characters/${characterId}/planets/${planetId}/`,
    accessToken,
    { etag: cached?.etag },
  );

  if (res.status === 304 && cached?.payload) {
    return {
      layout: cached.payload,
      etag: cached.etag,
      expiresAt: cached.expiresAt ?? undefined,
      fromCache: true,
    };
  }

  await db
    .insert(colonyCache)
    .values({
      characterId,
      planetId,
      etag: res.etag,
      payload: res.data,
      expiresAt: res.expiresAt,
      fetchedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [colonyCache.characterId, colonyCache.planetId],
      set: {
        etag: res.etag,
        payload: res.data,
        expiresAt: res.expiresAt,
        fetchedAt: new Date(),
      },
    });

  return {
    layout: res.data,
    etag: res.etag,
    expiresAt: res.expiresAt,
    fromCache: false,
  };
}

export async function loadCachedColonies(characterId: number) {
  return db
    .select()
    .from(colonyCache)
    .where(eq(colonyCache.characterId, characterId));
}

export async function getCachedColony(
  characterId: number,
  planetId: number,
) {
  const [row] = await db
    .select()
    .from(colonyCache)
    .where(
      and(
        eq(colonyCache.characterId, characterId),
        eq(colonyCache.planetId, planetId),
      ),
    )
    .limit(1);
  return row;
}
