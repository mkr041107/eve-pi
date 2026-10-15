import type { ColonyLayout, ColonyPin } from "@/lib/esi/types";
import {
  getSchematic,
  isFactoryTypeId,
  isLaunchPadType,
} from "@/lib/sde/load";

export type PinKind = "launchpad" | "factory" | "extractor" | "storage" | "other";

export type ClassifiedPin = ColonyPin & { kind: PinKind };

export function classifyPin(pin: ColonyPin): PinKind {
  if (pin.extractor_details) return "extractor";
  if (isLaunchPadType(pin.type_id)) return "launchpad";
  const schematicId =
    pin.factory_details?.schematic_id ?? pin.schematic_id ?? null;
  if (
    schematicId &&
    (getSchematic(schematicId) || isFactoryTypeId(pin.type_id))
  ) {
    return "factory";
  }
  return "storage";
}

export function buildColonyGraph(layout: ColonyLayout) {
  const pins = new Map<number, ClassifiedPin>();
  for (const pin of layout.pins) {
    pins.set(pin.pin_id, { ...pin, kind: classifyPin(pin) });
  }
  const routes = layout.routes;
  const launchPads = [...pins.values()].filter((p) => p.kind === "launchpad");
  const factories = [...pins.values()].filter((p) => p.kind === "factory");
  return { pins, routes, launchPads, factories };
}

export function factorySchematicId(pin: ClassifiedPin): number | null {
  return pin.factory_details?.schematic_id ?? pin.schematic_id ?? null;
}
