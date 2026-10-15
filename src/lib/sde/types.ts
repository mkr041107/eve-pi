export type SchematicType = {
  typeId: number;
  isInput: boolean;
  quantity: number;
};

export type PlanetSchematic = {
  schematicId: number;
  cycleTimeSeconds: number;
  name: string;
  pinTypeIds?: number[];
  types: SchematicType[];
};

export type SdeBundle = {
  buildNumber: number;
  typeNames: Record<number, string>;
  launchPadTypeIds: number[];
  factoryTypeIds: number[];
  factorySpeedMultiplier: Record<number, number>;
  schematics: Record<number, PlanetSchematic>;
};
