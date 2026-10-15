import type { ColonyLayout, ColonySummary } from "@/lib/esi/types";
import { getTypeName } from "@/lib/sde/load";
import {
  grossFactoryDemand,
  listExtractors,
  netOrbitImports,
  simulateColonyHours,
} from "./simulate";

export type CommodityAmount = {
  typeId: number;
  name: string;
  quantity: number;
};

export type ColonyForecast = {
  planetId: number;
  solarSystemId: number;
  planetType: string;
  lastFetchedAt?: string;
  netImports: CommodityAmount[];
  exports: CommodityAmount[];
  extractors: ReturnType<typeof listExtractors>;
};

export type DashboardForecast = {
  horizonHours: number;
  colonies: ColonyForecast[];
  totals: {
    netImports: CommodityAmount[];
    exports: CommodityAmount[];
  };
  staleWarning: string;
};

function toCommodityList(map: Record<number, number>): CommodityAmount[] {
  return Object.entries(map)
    .map(([typeId, quantity]) => ({
      typeId: Number(typeId),
      name: getTypeName(Number(typeId)),
      quantity: Math.round(quantity),
    }))
    .filter((x) => x.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity);
}

function mergeTotals(items: CommodityAmount[]): CommodityAmount[] {
  const m = new Map<number, CommodityAmount>();
  for (const item of items) {
    const prev = m.get(item.typeId);
    if (prev) prev.quantity += item.quantity;
    else m.set(item.typeId, { ...item });
  }
  return [...m.values()].sort((a, b) => b.quantity - a.quantity);
}

export function buildForecast(
  summaries: ColonySummary[],
  layouts: { planetId: number; layout: ColonyLayout; fetchedAt?: Date }[],
  horizonHours: number,
): DashboardForecast {
  const summaryByPlanet = new Map(summaries.map((s) => [s.planet_id, s]));
  const colonies: ColonyForecast[] = [];

  for (const { planetId, layout, fetchedAt } of layouts) {
    const summary = summaryByPlanet.get(planetId);
    const net = netOrbitImports(layout, horizonHours);
    const sim = simulateColonyHours(layout, horizonHours);
    colonies.push({
      planetId,
      solarSystemId: summary?.solar_system_id ?? 0,
      planetType: summary?.planet_type ?? "unknown",
      lastFetchedAt: fetchedAt?.toISOString(),
      netImports: toCommodityList(net),
      exports: toCommodityList(sim.exportsToPad),
      extractors: listExtractors(layout),
    });
  }

  return {
    horizonHours,
    colonies,
    totals: {
      netImports: mergeTotals(colonies.flatMap((c) => c.netImports)),
      exports: mergeTotals(colonies.flatMap((c) => c.exports)),
    },
    staleWarning:
      "Colony layouts only update after you open each colony in the EVE client. Numbers may be stale until you do.",
  };
}

export function grossDemandAll(
  layouts: ColonyLayout[],
  horizonHours: number,
): Record<number, number> {
  const merged: Record<number, number> = {};
  for (const layout of layouts) {
    const d = grossFactoryDemand(layout, horizonHours);
    for (const [k, v] of Object.entries(d)) {
      const typeId = Number(k);
      merged[typeId] = (merged[typeId] ?? 0) + v;
    }
  }
  return merged;
}
