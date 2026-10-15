import type { ColonyLayout } from "@/lib/esi/types";
import { factoryCyclesPerHour, getSchematic } from "@/lib/sde/load";
import { buildColonyGraph, factorySchematicId } from "./graph";
import {
  calculateExtractorCycleYield,
  extractorCyclesRemaining,
} from "./extraction";

type Inventory = Map<number, Map<number, number>>;

function getInv(inv: Inventory, pinId: number, typeId: number): number {
  return inv.get(pinId)?.get(typeId) ?? 0;
}

function addInv(inv: Inventory, pinId: number, typeId: number, delta: number) {
  if (!inv.has(pinId)) inv.set(pinId, new Map());
  const m = inv.get(pinId)!;
  m.set(typeId, Math.max(0, (m.get(typeId) ?? 0) + delta));
}

function initInventory(layout: ColonyLayout): Inventory {
  const inv: Inventory = new Map();
  for (const pin of layout.pins) {
    for (const c of pin.contents ?? []) {
      addInv(inv, pin.pin_id, c.type_id, c.amount);
    }
  }
  return inv;
}

/** Route quantity is treated as units moved per hourly planet tick (v1 assumption). */
export function simulateColonyHours(layout: ColonyLayout, hours: number) {
  const { pins, routes, launchPads } = buildColonyGraph(layout);
  const inv = initInventory(layout);
  const launchPadIds = new Set(launchPads.map((p) => p.pin_id));
  const exportsToPad: Record<number, number> = {};
  const factoryInputUsed: Record<number, number> = {};

  const tickExtractorProduction = () => {
    for (const pin of pins.values()) {
      if (pin.kind !== "extractor" || !pin.extractor_details) continue;
      const ex = pin.extractor_details;
      if (!ex.qty_per_cycle || !ex.cycle_time || !ex.product_type_id) continue;
      if (!pin.install_time || !pin.expiry_time) continue;
      const install = new Date(pin.install_time);
      const expiry = new Date(pin.expiry_time);
      const { totalCycles, completedCycles, remainingCycles } =
        extractorCyclesRemaining(install, expiry, ex.cycle_time);
      if (remainingCycles <= 0 || totalCycles <= 0) continue;
      const yieldThisCycle = calculateExtractorCycleYield(
        completedCycles,
        ex.cycle_time,
        ex.qty_per_cycle,
      );
      addInv(inv, pin.pin_id, ex.product_type_id, yieldThisCycle);
    }
  };

  const runFactoryCycles = () => {
    for (const pin of pins.values()) {
      if (pin.kind !== "factory") continue;
      const schematicId = factorySchematicId(pin);
      if (!schematicId) continue;
      const schematic = getSchematic(schematicId);
      if (!schematic) continue;
      const inputs = schematic.types.filter((t) => t.isInput);
      const outputs = schematic.types.filter((t) => !t.isInput);
      const maxCycles = factoryCyclesPerHour(pin.type_id, schematicId);
      let ran = 0;
      while (ran < maxCycles) {
        const canRun = inputs.every(
          (input) =>
            getInv(inv, pin.pin_id, input.typeId) >= input.quantity,
        );
        if (!canRun) break;
        for (const input of inputs) {
          addInv(inv, pin.pin_id, input.typeId, -input.quantity);
          factoryInputUsed[input.typeId] =
            (factoryInputUsed[input.typeId] ?? 0) + input.quantity;
        }
        for (const output of outputs) {
          addInv(inv, pin.pin_id, output.typeId, output.quantity);
        }
        ran += 1;
      }
    }
  };

  const runRoutes = () => {
    for (const route of routes) {
      const available = getInv(inv, route.source_pin_id, route.content_type_id);
      const moved = Math.min(route.quantity, available);
      if (moved <= 0) continue;
      addInv(inv, route.source_pin_id, route.content_type_id, -moved);
      addInv(inv, route.destination_pin_id, route.content_type_id, moved);
      if (launchPadIds.has(route.destination_pin_id)) {
        exportsToPad[route.content_type_id] =
          (exportsToPad[route.content_type_id] ?? 0) + moved;
      }
    }
  };

  for (let h = 0; h < hours; h++) {
    tickExtractorProduction();
    runRoutes();
    runFactoryCycles();
    runRoutes();
  }

  return { exportsToPad, factoryInputUsed, inventory: inv };
}

export function grossFactoryDemand(
  layout: ColonyLayout,
  hours: number,
): Record<number, number> {
  const { factories } = buildColonyGraph(layout);
  const demand: Record<number, number> = {};
  for (const pin of factories) {
    const schematicId = factorySchematicId(pin);
    if (!schematicId) continue;
    const schematic = getSchematic(schematicId);
    if (!schematic) continue;
    const cycles =
      factoryCyclesPerHour(pin.type_id, schematicId) * hours;
    for (const input of schematic.types.filter((t) => t.isInput)) {
      demand[input.typeId] =
        (demand[input.typeId] ?? 0) + input.quantity * cycles;
    }
  }
  return demand;
}

export function onHandByType(layout: ColonyLayout): Record<number, number> {
  const totals: Record<number, number> = {};
  for (const pin of layout.pins) {
    for (const c of pin.contents ?? []) {
      totals[c.type_id] = (totals[c.type_id] ?? 0) + c.amount;
    }
  }
  return totals;
}

export function internalSupplyFromSimulation(
  layout: ColonyLayout,
  hours: number,
): Record<number, number> {
  const gross = grossFactoryDemand(layout, hours);
  const sim = simulateColonyHours(layout, hours);
  const onHand = onHandByType(layout);
  const internal: Record<number, number> = {};
  for (const typeId of Object.keys(gross).map(Number)) {
    const required = gross[typeId] ?? 0;
    const used = sim.factoryInputUsed[typeId] ?? 0;
    const stock = onHand[typeId] ?? 0;
    internal[typeId] = Math.min(required, used + stock);
  }
  return internal;
}

export function netOrbitImports(
  layout: ColonyLayout,
  hours: number,
): Record<number, number> {
  const gross = grossFactoryDemand(layout, hours);
  const internal = internalSupplyFromSimulation(layout, hours);
  const net: Record<number, number> = {};
  for (const typeId of Object.keys(gross).map(Number)) {
    const n = Math.max(0, (gross[typeId] ?? 0) - (internal[typeId] ?? 0));
    if (n > 0) net[typeId] = n;
  }
  return net;
}

export function listExtractors(layout: ColonyLayout) {
  return layout.pins
    .filter((p) => p.extractor_details)
    .map((p) => {
      const expiry = p.expiry_time ? new Date(p.expiry_time) : null;
      const remainingMs = expiry ? expiry.getTime() - Date.now() : null;
      return {
        pinId: p.pin_id,
        expiryTime: p.expiry_time,
        remainingHours:
          remainingMs !== null ? remainingMs / (1000 * 60 * 60) : null,
        status:
          remainingMs === null
            ? "missing_expiry"
            : remainingMs <= 0
              ? "expired"
              : "active",
        productTypeId: p.extractor_details?.product_type_id,
      };
    });
}
