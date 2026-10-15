import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import path from "path";
import type { ColonyLayout } from "@/lib/esi/types";
import type { SdeBundle } from "@/lib/sde/types";
import { setSdeBundle } from "@/lib/sde/load";
import { buildColonyOperationsReport } from "./colony-report";

setSdeBundle(
  JSON.parse(
    readFileSync(path.join(process.cwd(), "data", "sde", "bundle.json"), "utf8"),
  ) as SdeBundle,
);

describe("buildColonyOperationsReport", () => {
  it("reads launchpad contents and factory schematic from layout", () => {
    const layout: ColonyLayout = {
      links: [],
      routes: [
        {
          route_id: 10,
          source_pin_id: 1,
          destination_pin_id: 2,
          content_type_id: 2268,
          quantity: 2500,
        },
      ],
      pins: [
        {
          pin_id: 1,
          type_id: 2256,
          latitude: 0,
          longitude: 0,
          contents: [{ type_id: 2268, amount: 12_000 }],
        },
        {
          pin_id: 2,
          type_id: 2481,
          latitude: 0,
          longitude: 0,
          factory_details: { schematic_id: 121 },
          schematic_id: 121,
          contents: [{ type_id: 2268, amount: 500 }],
        },
      ],
    };

    const report = buildColonyOperationsReport(layout);
    assert.equal(report.launchpads.length, 1);
    assert.equal(report.launchpads[0].contents[0].amount, 12_000);
    assert.equal(report.factories.length, 1);
    assert.equal(report.factories[0].schematicId, 121);
    assert.ok(report.factories[0].inputsPerCycle.length > 0);
    assert.equal(report.launchpadRoutes.length, 1);
    assert.equal(report.launchpadRoutes[0].direction, "from_launchpad");
    assert.match(report.launchpadRoutes[0].sourceFacilityName, /Launchpad/i);
    assert.match(report.launchpadRoutes[0].destinationFacilityName, /Industry/i);
  });
});
