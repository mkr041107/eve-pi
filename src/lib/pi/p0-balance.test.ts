import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import path from "path";
import type { ColonyLayout } from "@/lib/esi/types";
import type { SdeBundle } from "@/lib/sde/types";
import { setSdeBundle } from "@/lib/sde/load";
import { analyzeP0Extraction, forecastExtractorYieldByType } from "./p0-balance";

const bundle = JSON.parse(
  readFileSync(path.join(process.cwd(), "data", "sde", "bundle.json"), "utf8"),
) as SdeBundle;
setSdeBundle(bundle);

function layoutWithExtractorAndFactory(
  productTypeId: number,
  schematicInputs: { typeId: number; qty: number },
): ColonyLayout {
  const install = new Date(Date.now() - 3600_000).toISOString();
  const expiry = new Date(Date.now() + 7 * 24 * 3600_000).toISOString();
  return {
    links: [],
    routes: [],
    pins: [
      {
        pin_id: 1,
        type_id: 2412,
        latitude: 0,
        longitude: 0,
        install_time: install,
        expiry_time: expiry,
        extractor_details: {
          cycle_time: 1800,
          heads: [],
          product_type_id: productTypeId,
          qty_per_cycle: 1,
        },
      },
      {
        pin_id: 2,
        type_id: 2481,
        latitude: 0,
        longitude: 0,
        factory_details: { schematic_id: 121 },
        schematic_id: 121,
      },
    ],
  };
}

describe("analyzeP0Extraction", () => {
  it("flags when extractor output cannot meet P0 factory demand", () => {
    const layout = layoutWithExtractorAndFactory(2268, { typeId: 2268, qty: 1 });
    const extracted = forecastExtractorYieldByType(layout, 24);
    assert.ok((extracted[2268] ?? 0) > 0);

    const alerts = analyzeP0Extraction(layout, 24 * 14, {});
    assert.ok(alerts.length >= 1);
    assert.equal(alerts[0].typeId, 2268);
    assert.ok(alerts[0].shortfall > 0);
  });
});
