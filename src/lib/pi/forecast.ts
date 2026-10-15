import type { ColonyLayout, ColonySummary } from "@/lib/esi/types";
import { getTypeName } from "@/lib/sde/load";
import { formatPlanetType } from "@/lib/esi/universe-names";
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
  planetName: string;
  solarSystemId: number;
  solarSystemName: string;
  planetType: string;
  planetTypeLabel: string;
  lastFetchedAt?: string;
  grossFactoryInputs: CommodityAmount[];
  netImports: CommodityAmount[];
  exports: CommodityAmount[];
  extractors: ReturnType<typeof listExtractors>;
};

export type DashboardForecast = {
  horizonHours: number;
  colonies: ColonyForecast[];
  totals: {
    grossFactoryInputs: CommodityAmount[];
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
  names?: Record<number, string>,
): DashboardForecast {
  const summaryByPlanet = new Map(summaries.map((s) => [s.planet_id, s]));
  const colonies: ColonyForecast[] = [];

  for (const { planetId, layout, fetchedAt } of layouts) {
    const summary = summaryByPlanet.get(planetId);
    const solarSystemId = summary?.solar_system_id ?? 0;
    const planetType = summary?.planet_type ?? "unknown";
    const gross = grossFactoryDemand(layout, horizonHours);
    const net = netOrbitImports(layout, horizonHours);
    const sim = simulateColonyHours(layout, horizonHours);
    colonies.push({
      planetId,
      planetName: names?.[planetId] ?? `Planet ${planetId}`,
      solarSystemId,
      solarSystemName: names?.[solarSystemId] ?? `System ${solarSystemId}`,
      planetType,
      planetTypeLabel: formatPlanetType(planetType),
      lastFetchedAt: fetchedAt?.toISOString(),
      grossFactoryInputs: toCommodityList(gross),
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
      grossFactoryInputs: mergeTotals(
        colonies.flatMap((c) => c.grossFactoryInputs),
      ),
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
