import { describe, it, expect } from "vitest";
import { EXAMPLES } from "./examples";
import { parseStructure } from "./dsl/structure";
import { parseFlows } from "./dsl/flow";
import { validateFlows } from "./dsl/validate";

describe("EXAMPLES", () => {
  it("are all internally valid (every flow hop is a real structure edge)", () => {
    for (const ex of EXAMPLES) {
      const s = parseStructure(ex.structureText);
      const f = parseFlows(ex.flowText);
      expect(s.errors, `${ex.name} structure`).toEqual([]);
      expect(f.errors, `${ex.name} flow`).toEqual([]);
      expect(f.flows.length, `${ex.name} flow count`).toBeGreaterThan(0);
      expect(validateFlows(s, f.flows), `${ex.name} validation`).toEqual([]);
    }
  });
});
