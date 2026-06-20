import { describe, it, expect } from "vitest";
import { layeredPositions } from "./layout";

describe("layeredPositions", () => {
  it("places later nodes in the chain further right", () => {
    const pos = layeredPositions(
      ["a", "b", "c"],
      [{ from: "a", to: "b" }, { from: "b", to: "c" }]
    );
    expect(pos.a.x).toBeLessThan(pos.b.x);
    expect(pos.b.x).toBeLessThan(pos.c.x);
  });

  it("puts siblings in the same column at different rows", () => {
    const pos = layeredPositions(
      ["a", "b", "c"],
      [{ from: "a", to: "b" }, { from: "a", to: "c" }]
    );
    expect(pos.b.x).toBe(pos.c.x);
    expect(pos.b.y).not.toBe(pos.c.y);
  });

  it("returns a position for every id", () => {
    const pos = layeredPositions(["x", "y"], []);
    expect(Object.keys(pos).sort()).toEqual(["x", "y"]);
  });
});
