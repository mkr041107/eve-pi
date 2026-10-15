import type { ColonyLayout } from "@/lib/esi/types";
import { buildColonyGraph, factorySchematicId } from "./graph";
import { factoryCyclesPerHour, getSchematic } from "@/lib/sde/load";

export function computeBurnRatePerHour(
  layouts: ColonyLayout[],
  typeId: number,
): number {
  let rate = 0;
  for (const layout of layouts) {
    const { factories } = buildColonyGraph(layout);
    for (const pin of factories) {
      const schematicId = factorySchematicId(pin);
      if (!schematicId) continue;
      const schematic = getSchematic(schematicId);
      if (!schematic) continue;
      const cyclesPerHour = factoryCyclesPerHour(pin.type_id, schematicId);
      for (const input of schematic.types.filter((t) => t.isInput)) {
        if (input.typeId === typeId) {
          rate += input.quantity * cyclesPerHour;
        }
      }
    }
  }
  return rate;
}
