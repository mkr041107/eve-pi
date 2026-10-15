import type { ColonyLayout } from "@/lib/esi/types";
import { getTypeName } from "@/lib/sde/load";
import {
  calculateExtractorCycleYield,
  extractorCyclesRemaining,
} from "./extraction";
import { grossFactoryDemand, onHandByType } from "./simulate";

export type P0ExtractionAlert = {
  typeId: number;
  name: string;
  factoryDemand: number;
  projectedExtraction: number;
  onHand: number;
  shortfall: number;
  netOrbitImport: number;
};

/** Project raw extractor output by product type for the next `horizonHours`. */
export function forecastExtractorYieldByType(
  layout: ColonyLayout,
  horizonHours: number,
): Record<number, number> {
  const totals: Record<number, number> = {};
  const horizonEndMs = Date.now() + horizonHours * 3600 * 1000;

  for (const pin of layout.pins) {
    const ex = pin.extractor_details;
    if (!ex?.product_type_id || !ex.qty_per_cycle || !ex.cycle_time) continue;
    if (!pin.install_time || !pin.expiry_time) continue;

    const install = new Date(pin.install_time);
    const expiry = new Date(pin.expiry_time);
    if (expiry.getTime() <= Date.now()) continue;

    const effectiveEndMs = Math.min(expiry.getTime(), horizonEndMs);
    if (effectiveEndMs <= Date.now()) continue;

    const cycleTime = ex.cycle_time;
    const durationSec = (expiry.getTime() - install.getTime()) / 1000;
    const totalCycles = Math.max(0, Math.floor(durationSec / cycleTime));
    const endElapsedSec = (effectiveEndMs - install.getTime()) / 1000;
    const endCycleIndex = Math.min(
      totalCycles,
      Math.max(0, Math.floor(endElapsedSec / cycleTime)),
    );

    const { completedCycles } = extractorCyclesRemaining(
      install,
      expiry,
      cycleTime,
    );

    let sum = 0;
    for (let i = completedCycles; i < endCycleIndex; i++) {
      sum += calculateExtractorCycleYield(i, cycleTime, ex.qty_per_cycle);
    }

    const typeId = ex.product_type_id;
    totals[typeId] = (totals[typeId] ?? 0) + sum;
  }

  return totals;
}

function extractorProductTypes(layout: ColonyLayout): Set<number> {
  const types = new Set<number>();
  for (const pin of layout.pins) {
    const typeId = pin.extractor_details?.product_type_id;
    if (!typeId) continue;
    if (!pin.expiry_time || new Date(pin.expiry_time).getTime() <= Date.now()) {
      continue;
    }
    types.add(typeId);
  }
  return types;
}

/**
 * Flag P0 raw materials that have active extractors but projected extraction
 * (plus on-planet stock) is below factory demand for the horizon.
 */
export function analyzeP0Extraction(
  layout: ColonyLayout,
  horizonHours: number,
  netImports: Record<number, number>,
): P0ExtractionAlert[] {
  const demand = grossFactoryDemand(layout, horizonHours);
  const extracted = forecastExtractorYieldByType(layout, horizonHours);
  const onHand = onHandByType(layout);
  const extractedTypes = extractorProductTypes(layout);
  const alerts: P0ExtractionAlert[] = [];

  for (const typeId of extractedTypes) {
    const factoryDemand = demand[typeId] ?? 0;
    if (factoryDemand <= 0) continue;

    const projectedExtraction = Math.round(extracted[typeId] ?? 0);
    const stock = Math.round(onHand[typeId] ?? 0);
    const available = projectedExtraction + stock;
    const shortfall = Math.max(0, Math.round(factoryDemand) - available);
    if (shortfall <= 0) continue;

    alerts.push({
      typeId,
      name: getTypeName(typeId),
      factoryDemand: Math.round(factoryDemand),
      projectedExtraction,
      onHand: stock,
      shortfall,
      netOrbitImport: Math.round(netImports[typeId] ?? 0),
    });
  }

  return alerts.sort((a, b) => b.shortfall - a.shortfall);
}
