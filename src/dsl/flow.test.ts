import { describe, it, expect } from "vitest";
import { parseFlow, parseFlows } from "./flow";

describe("parseFlows", () => {
  it("parses multiple flow blocks", () => {
    const r = parseFlows(
      'flow "GET /profile":\n  a -> b\n  b <-> c\n\nflow "POST /order":\n  a -> b\n  a ~> d'
    );
    expect(r.errors).toEqual([]);
    expect(r.flows.map((f) => f.name)).toEqual(["GET /profile", "POST /order"]);
    expect(r.flows[0].steps).toHaveLength(2);
    expect(r.flows[1].steps.map((s) => s.kind)).toEqual(["call", "async"]);
  });

  it("flags a step before any flow header", () => {
    const r = parseFlows("a -> b");
    expect(r.flows).toEqual([]);
    expect(r.errors[0].line).toBe(1);
  });
});

describe("parseFlow", () => {
  it("reads the flow name", () => {
    expect(parseFlow('flow "GET /profile":').name).toBe("GET /profile");
  });

  it("parses the three verbs in order", () => {
    const r = parseFlow(
      'flow "x":\n  a -> b\n  b <-> c\n  c ~> d'
    );
    expect(r.errors).toEqual([]);
    expect(r.steps.map((s) => s.kind)).toEqual(["call", "roundtrip", "async"]);
    expect(r.steps[0]).toMatchObject({ from: "a", to: "b", line: 2 });
  });

  it("captures a label", () => {
    const r = parseFlow('flow "x":\n  api -> cache (miss)');
    expect(r.steps[0]).toMatchObject({ from: "api", to: "cache", label: "miss" });
  });

  it("does not mistake <-> for ->", () => {
    const r = parseFlow('flow "x":\n  a <-> b');
    expect(r.steps[0].kind).toBe("roundtrip");
    expect(r.steps[0].to).toBe("b");
  });

  it("reports malformed lines with a line number", () => {
    const r = parseFlow('flow "x":\n  this is not a step');
    expect(r.errors[0].line).toBe(2);
  });
});
