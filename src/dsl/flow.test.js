import { describe, it, expect } from "vitest";
import { parseFlow } from "./flow";
describe("parseFlow", () => {
    it("reads the flow name", () => {
        expect(parseFlow('flow "GET /profile":').name).toBe("GET /profile");
    });
    it("parses the three verbs in order", () => {
        const r = parseFlow('flow "x":\n  a -> b\n  b <-> c\n  c ~> d');
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
