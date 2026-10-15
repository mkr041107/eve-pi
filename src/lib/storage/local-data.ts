import type { ColonyLayout } from "@/lib/esi/types";

export type CachedColony = {
  planetId: number;
  etag?: string;
  payload: ColonyLayout;
  expiresAt?: string;
  fetchedAt: string;
};

export type ManualStock = {
  id: string;
  characterId: number;
  planetId: number | null;
  typeId: number;
  amountAtEntry: number;
  recordedAt: string;
  burnRatePerHour: number;
  emptyAt: string;
  note: string | null;
  createdAt: string;
};

function colonyKey(characterId: number) {
  return `eve_pi_colonies_${characterId}`;
}

function stocksKey(characterId: number) {
  return `eve_pi_stocks_${characterId}`;
}

function horizonKey(characterId: number) {
  return `eve_pi_horizon_${characterId}`;
}

export function getHorizonHours(characterId: number): number {
  const v = localStorage.getItem(horizonKey(characterId));
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 24;
}

export function setHorizonHours(characterId: number, hours: number) {
  localStorage.setItem(horizonKey(characterId), String(hours));
}

export function loadColonyCache(characterId: number): CachedColony[] {
  const raw = localStorage.getItem(colonyKey(characterId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CachedColony[];
  } catch {
    return [];
  }
}

export function saveColonyCache(characterId: number, entries: CachedColony[]) {
  localStorage.setItem(colonyKey(characterId), JSON.stringify(entries));
}

export function loadManualStocks(characterId: number): ManualStock[] {
  const raw = localStorage.getItem(stocksKey(characterId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ManualStock[];
  } catch {
    return [];
  }
}

export function saveManualStocks(characterId: number, items: ManualStock[]) {
  localStorage.setItem(stocksKey(characterId), JSON.stringify(items));
}
