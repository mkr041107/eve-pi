export type SchematicType = {
  typeId: number;
  isInput: boolean;
  quantity: number;
};

export type PlanetSchematic = {
  schematicId: number;
  cycleTimeSeconds: number;
  name: string;
  types: SchematicType[];
};

export type SdeBundle = {
  buildNumber: number;
  typeNames: Record<number, string>;
  launchPadTypeIds: number[];
  schematics: Record<number, PlanetSchematic>;
};
