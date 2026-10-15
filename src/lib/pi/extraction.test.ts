import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateExtractorCycleYield } from "./extraction";

describe("calculateExtractorCycleYield", () => {
  it("matches esi-docs first-cycle scale for default inputs", () => {
    const y = calculateExtractorCycleYield(0, 30 * 60, 6965);
    assert.ok(y > 20_000 && y < 30_000);
  });
});
