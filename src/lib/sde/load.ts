import type { SdeBundle } from "./types";
import { getBasePath } from "@/lib/config/site";

let bundle: SdeBundle | null = null;

export async function ensureSdeBundle(): Promise<SdeBundle> {
  if (bundle) return bundle;
  const base = getBasePath();
  const res = await fetch(`${base}/data/sde/bundle.json`);
  if (!res.ok) {
    throw new Error(
      "SDE bundle missing. Run `npm run sync:sde` before build or deploy.",
    );
  }
  bundle = (await res.json()) as SdeBundle;
  return bundle;
}

function requireBundle(): SdeBundle {
  if (!bundle) {
    throw new Error("SDE not loaded yet. Call ensureSdeBundle() first.");
  }
  return bundle;
}

export function getTypeName(typeId: number): string {
  const b = requireBundle();
  return b.typeNames[typeId] ?? `Type ${typeId}`;
}

export function isLaunchPadType(typeId: number): boolean {
  const b = requireBundle();
  return b.launchPadTypeIds.includes(typeId);
}

export function getSchematic(schematicId: number) {
  const b = requireBundle();
  return b.schematics[schematicId] as SdeBundle["schematics"][number];
}

export function isFactoryTypeId(typeId: number): boolean {
  const b = requireBundle();
  return (b.factoryTypeIds ?? []).includes(typeId);
}

/** Basic = 1×, Advanced = 2×, High-Tech = 4× cycles per hour vs schematic base time. */
export function getFactorySpeedMultiplier(facilityTypeId: number): number {
  const b = requireBundle();
  return b.factorySpeedMultiplier?.[facilityTypeId] ?? 1;
}

export function factoryCyclesPerHour(
  facilityTypeId: number,
  schematicId: number,
): number {
  const schematic = getSchematic(schematicId);
  if (!schematic?.cycleTimeSeconds) return 0;
  const speed = getFactorySpeedMultiplier(facilityTypeId);
  return (3600 / schematic.cycleTimeSeconds) * speed;
}
