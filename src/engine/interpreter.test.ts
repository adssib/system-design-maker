import { describe, it, expect } from "vitest";
import { compileFlow } from "./interpreter";
import type { FlowStep } from "../types";

const step = (from: string, to: string, kind: FlowStep["kind"], line = 1, label?: string): FlowStep =>
  ({ from, to, kind, line, label });
const fixed = () => 100;

describe("compileFlow", () => {
  it("advances the clock for sequential calls", () => {
    const ev = compileFlow([step("a", "b", "call"), step("b", "c", "call")], fixed);
    expect(ev.map((e) => e.startMs)).toEqual([0, 100]);
    expect(ev[0].edgeId).toBe("a->b");
  });

  it("emits out then back for a roundtrip and advances by both legs", () => {
    const ev = compileFlow([step("a", "b", "roundtrip"), step("a", "c", "call")], fixed);
    expect(ev[0]).toMatchObject({ edgeId: "a->b", dir: "forward", startMs: 0, durMs: 100 });
    expect(ev[1]).toMatchObject({ edgeId: "a->b", dir: "back", from: "b", to: "a", startMs: 100 });
    expect(ev[2].startMs).toBe(200);
  });

  it("does NOT advance the clock for async", () => {
    const ev = compileFlow([step("a", "b", "async"), step("a", "c", "call")], fixed);
    expect(ev[0]).toMatchObject({ edgeId: "a->b", dir: "forward", startMs: 0 });
    expect(ev[1].startMs).toBe(0);
  });

  it("carries labels onto events", () => {
    const ev = compileFlow([step("api", "cache", "call", 1, "miss")], fixed);
    expect(ev[0].label).toBe("miss");
  });
});
