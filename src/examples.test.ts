import { describe, it, expect } from "vitest";
import { EXAMPLES } from "./examples";
import { parseStructure } from "./dsl/structure";
import { parseFlow } from "./dsl/flow";
import { validate } from "./dsl/validate";

describe("EXAMPLES", () => {
  it("are all internally valid (every flow hop is a real structure edge)", () => {
    for (const ex of EXAMPLES) {
      const s = parseStructure(ex.structureText);
      const f = parseFlow(ex.flowText);
      expect(s.errors, `${ex.name} structure`).toEqual([]);
      expect(f.errors, `${ex.name} flow`).toEqual([]);
      expect(validate(s, f), `${ex.name} validation`).toEqual([]);
    }
  });
});
