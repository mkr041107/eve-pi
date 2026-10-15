import type { ColonyLayout } from "@/lib/esi/types";
import {
  factoryCyclesPerHour,
  getSchematic,
  getTypeName,
} from "@/lib/sde/load";
import { buildColonyGraph, factorySchematicId } from "./graph";

export type InventoryRow = {
  typeId: number;
  name: string;
  amount: number;
};

export type LaunchpadSnapshot = {
  pinId: number;
  typeName: string;
  contents: InventoryRow[];
};

export type FactorySnapshot = {
  pinId: number;
  facilityTypeName: string;
  schematicId: number | null;
  schematicName: string | null;
  cyclesPerHour: number;
  contents: InventoryRow[];
  inputsPerCycle: InventoryRow[];
  outputsPerCycle: InventoryRow[];
};

export type LaunchpadRouteRow = {
  routeId: number;
  direction: "into_launchpad" | "from_launchpad";
  sourcePinId: number;
  destinationPinId: number;
  typeId: number;
  name: string;
  quantityPerHour: number;
};

export type ColonyOperationsReport = {
  launchpads: LaunchpadSnapshot[];
  factories: FactorySnapshot[];
  launchpadRoutes: LaunchpadRouteRow[];
};

function pinContents(pin: { contents?: { type_id: number; amount: number }[] }): InventoryRow[] {
  return (pin.contents ?? [])
    .map((c) => ({
      typeId: c.type_id,
      name: getTypeName(c.type_id),
      amount: c.amount,
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

function schematicRows(
  schematicId: number,
  inputs: boolean,
): InventoryRow[] {
  const schematic = getSchematic(schematicId);
  if (!schematic) return [];
  return schematic.types
    .filter((t) => (inputs ? t.isInput : !t.isInput))
    .map((t) => ({
      typeId: t.typeId,
      name: getTypeName(t.typeId),
      amount: t.quantity,
    }));
}

export function buildColonyOperationsReport(
  layout: ColonyLayout,
): ColonyOperationsReport {
  const { pins, routes, launchPads, factories } = buildColonyGraph(layout);
  const launchpadIds = new Set(launchPads.map((p) => p.pin_id));

  const launchpads: LaunchpadSnapshot[] = launchPads.map((pad) => ({
    pinId: pad.pin_id,
    typeName: getTypeName(pad.type_id),
    contents: pinContents(pad),
  }));

  const factorySnapshots: FactorySnapshot[] = factories.map((pin) => {
    const schematicId = factorySchematicId(pin);
    const schematic = schematicId ? getSchematic(schematicId) : undefined;
    return {
      pinId: pin.pin_id,
      facilityTypeName: getTypeName(pin.type_id),
      schematicId,
      schematicName: schematic?.name ?? (schematicId ? `Schematic ${schematicId}` : null),
      cyclesPerHour:
        schematicId !== null
          ? Math.round(factoryCyclesPerHour(pin.type_id, schematicId) * 100) / 100
          : 0,
      contents: pinContents(pin),
      inputsPerCycle: schematicId ? schematicRows(schematicId, true) : [],
      outputsPerCycle: schematicId ? schematicRows(schematicId, false) : [],
    };
  });

  const launchpadRoutes: LaunchpadRouteRow[] = [];
  for (const route of routes) {
    const toPad = launchpadIds.has(route.destination_pin_id);
    const fromPad = launchpadIds.has(route.source_pin_id);
    if (!toPad && !fromPad) continue;
    launchpadRoutes.push({
      routeId: route.route_id,
      direction: toPad ? "into_launchpad" : "from_launchpad",
      sourcePinId: route.source_pin_id,
      destinationPinId: route.destination_pin_id,
      typeId: route.content_type_id,
      name: getTypeName(route.content_type_id),
      quantityPerHour: Math.round(route.quantity),
    });
  }

  launchpadRoutes.sort((a, b) => b.quantityPerHour - a.quantityPerHour);

  return {
    launchpads,
    factories: factorySnapshots,
    launchpadRoutes,
  };
}
