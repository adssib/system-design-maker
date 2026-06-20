import { describe, it, expect } from "vitest";
import { serializeStructure } from "./serialize";
import { parseStructure } from "./structure";
import type { NodeModel, EdgeModel } from "../types";

describe("serializeStructure", () => {
  it("groups multiple targets into fan-out", () => {
    const nodes: NodeModel[] = [
      { id: "gateway", type: "lb" },
      { id: "auth", type: "service" },
      { id: "api", type: "service" },
    ];
    const edges: EdgeModel[] = [
      { from: "gateway", to: "auth" },
      { from: "gateway", to: "api" },
    ];
    expect(serializeStructure(nodes, edges)).toContain("gateway -> [auth, api]");
  });

  it("emits an annotation when the type diverges from name inference", () => {
    const nodes: NodeModel[] = [{ id: "primary", type: "db" }];
    expect(serializeStructure(nodes, [])).toContain("primary : db");
  });

  it("round-trips through parseStructure", () => {
    const nodes: NodeModel[] = [
      { id: "client", type: "client" },
      { id: "api", type: "service" },
      { id: "primary", type: "db" },
      { id: "loner", type: "service" },
    ];
    const edges: EdgeModel[] = [
      { from: "client", to: "api" },
      { from: "api", to: "primary" },
    ];
    const text = serializeStructure(nodes, edges);
    const r = parseStructure(text);
    expect(r.errors).toEqual([]);
    expect(new Set(r.nodes.map((n) => n.id))).toEqual(
      new Set(["client", "api", "primary", "loner"])
    );
    expect(r.nodes.find((n) => n.id === "primary")!.type).toBe("db");
    expect(r.edges).toEqual(edges);
  });
});
