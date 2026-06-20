import { describe, it, expect } from "vitest";
import { COMPONENTS, iconFor } from "./catalog";
import { typeOf } from "./engine/typeInference";

describe("COMPONENTS", () => {
  it("has unique ids", () => {
    const ids = COMPONENTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every component id resolves to a usable icon", () => {
    for (const c of COMPONENTS) {
      const icon = iconFor(c.id, typeOf(c.id));
      expect(["img", "lucide"]).toContain(icon.kind);
    }
  });

  it("branded names map to a vendored svg, generic names to a lucide glyph", () => {
    expect(iconFor("redis", typeOf("redis")).kind).toBe("img");
    expect(iconFor("service", typeOf("service")).kind).toBe("lucide");
  });
});
