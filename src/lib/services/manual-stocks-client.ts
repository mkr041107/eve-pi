import type { ColonyLayout } from "@/lib/esi/types";
import { computeBurnRatePerHour } from "@/lib/pi/burn-rate";
import { ensureSdeBundle } from "@/lib/sde/load";
import {
  loadColonyCache,
  loadManualStocks,
  saveManualStocks,
  type ManualStock,
} from "@/lib/storage/local-data";

export function listManualStocks(characterId: number) {
  const now = Date.now();
  return loadManualStocks(characterId).map((row) => {
    const emptyAt = new Date(row.emptyAt).getTime();
    const hoursLeft = (emptyAt - now) / (1000 * 60 * 60);
    return {
      ...row,
      hoursLeft,
      status: hoursLeft <= 0 ? "needs_attention" : "ok",
    };
  });
}

export async function createManualStock(
  characterId: number,
  input: {
    typeId: number;
    amount: number;
    planetId?: number;
    recordedAt?: string;
    note?: string;
  },
) {
  await ensureSdeBundle();
  const cached = loadColonyCache(characterId);
  const layouts: ColonyLayout[] = cached
    .filter((c) => (input.planetId ? c.planetId === input.planetId : true))
    .map((c) => c.payload);

  const burnRate = computeBurnRatePerHour(layouts, input.typeId);
  if (burnRate <= 0) {
    throw new Error(
      "No factory consumption detected for this commodity. Sync colonies or pick another type.",
    );
  }

  const recordedAt = input.recordedAt ? new Date(input.recordedAt) : new Date();
  const emptyAt = new Date(
    recordedAt.getTime() + (input.amount / burnRate) * 60 * 60 * 1000,
  );

  const item: ManualStock = {
    id: crypto.randomUUID(),
    characterId,
    planetId: input.planetId ?? null,
    typeId: input.typeId,
    amountAtEntry: input.amount,
    recordedAt: recordedAt.toISOString(),
    burnRatePerHour: burnRate,
    emptyAt: emptyAt.toISOString(),
    note: input.note ?? null,
    createdAt: new Date().toISOString(),
  };

  const items = loadManualStocks(characterId);
  items.unshift(item);
  saveManualStocks(characterId, items);
  return item;
}

export function deleteManualStock(characterId: number, id: string) {
  const items = loadManualStocks(characterId).filter((i) => i.id !== id);
  saveManualStocks(characterId, items);
}
