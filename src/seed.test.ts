import { describe, it, expect } from "vitest";
import { SEED } from "./seed";
import { parseStructure } from "./dsl/structure";
import { parseFlow } from "./dsl/flow";
import { validate } from "./dsl/validate";

describe("SEED", () => {
  it("is internally valid (every flow hop exists in the structure)", () => {
    const s = parseStructure(SEED.structureText);
    const f = parseFlow(SEED.flowText);
    expect(s.errors).toEqual([]);
    expect(f.errors).toEqual([]);
    expect(validate(s, f)).toEqual([]);
  });
});
