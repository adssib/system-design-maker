import { describe, it, expect, beforeEach } from "vitest";
import { createAppStore } from "./store";

let store: ReturnType<typeof createAppStore>;
beforeEach(() => { store = createAppStore(); });

describe("app store", () => {
  it("parses structure text and lays out new nodes", () => {
    store.getState().setStructureText("client -> api");
    const s = store.getState();
    expect(s.structure.edges).toEqual([{ from: "client", to: "api" }]);
    expect(s.positions.client).toBeDefined();
    expect(s.positions.api).toBeDefined();
  });

  it("adds an edge from the canvas and regenerates text", () => {
    store.getState().setStructureText("a -> b\nc");
    store.getState().addEdge("b", "c");
    const s = store.getState();
    expect(s.structure.edges).toContainEqual({ from: "b", to: "c" });
    expect(s.structureText).toContain("b -> c");
  });

  it("preserves positions of surviving nodes when text changes", () => {
    store.getState().setStructureText("a -> b");
    store.getState().moveNode("a", 10, 20);
    store.getState().setStructureText("a -> b\nb -> c");
    expect(store.getState().positions.a).toEqual({ x: 10, y: 20 });
  });

  it("renames a node across nodes, edges, positions and text", () => {
    store.getState().setStructureText("a -> b");
    store.getState().moveNode("a", 5, 5);
    store.getState().renameNode("a", "front");
    const s = store.getState();
    expect(s.structure.nodes.map((n) => n.id)).toContain("front");
    expect(s.structure.edges).toContainEqual({ from: "front", to: "b" });
    expect(s.positions.front).toEqual({ x: 5, y: 5 });
    expect(s.structureText).toContain("front -> b");
  });

  it("validates the flow against the structure", () => {
    store.getState().setStructureText("a -> b");
    store.getState().setFlowText('flow "x":\n  a -> z');
    expect(store.getState().validation).toHaveLength(1);
  });
});
