import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import path from "path";

// Load SDE bundle for multiplier tests (same data as production).
const bundlePath = path.join(process.cwd(), "data", "sde", "bundle.json");

describe("factory speed multipliers", () => {
  it("advanced and high-tech facilities run more cycles per hour", () => {
    const bundle = JSON.parse(readFileSync(bundlePath, "utf8")) as {
      factorySpeedMultiplier: Record<number, number>;
      schematics: Record<string, { cycleTimeSeconds: number }>;
    };
    const schematic = bundle.schematics["65"];
    assert.ok(schematic);
    const basic = 2473;
    const advanced = 2474;
    const highTech = 2475;
    const basePerHour = 3600 / schematic.cycleTimeSeconds;
    const basicRate =
      basePerHour * (bundle.factorySpeedMultiplier[basic] ?? 1);
    const advancedRate =
      basePerHour * (bundle.factorySpeedMultiplier[advanced] ?? 1);
    const highTechRate =
      basePerHour * (bundle.factorySpeedMultiplier[highTech] ?? 1);
    assert.equal(advancedRate, basicRate * 2);
    assert.equal(highTechRate, basicRate * 4);
  });
});
