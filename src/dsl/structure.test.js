import { describe, it, expect } from "vitest";
import { parseStructure } from "./structure";
describe("parseStructure", () => {
    it("parses a simple chain", () => {
        const r = parseStructure("client -> gateway -> api");
        expect(r.errors).toEqual([]);
        expect(r.nodes.map((n) => n.id)).toEqual(["client", "gateway", "api"]);
        expect(r.edges).toEqual([
            { from: "client", to: "gateway" },
            { from: "gateway", to: "api" },
        ]);
    });
    it("expands fan-out", () => {
        const r = parseStructure("gateway -> [auth, api]");
        expect(r.edges).toEqual([
            { from: "gateway", to: "auth" },
            { from: "gateway", to: "api" },
        ]);
    });
    it("infers types from names", () => {
        const r = parseStructure("api -> cache");
        expect(r.nodes.find((n) => n.id === "cache").type).toBe("cache");
        expect(r.nodes.find((n) => n.id === "api").type).toBe("service");
    });
    it("honors explicit type annotations", () => {
        const r = parseStructure("primary : postgres\napi -> primary");
        expect(r.nodes.find((n) => n.id === "primary").type).toBe("db");
    });
    it("declares isolated bare nodes", () => {
        const r = parseStructure("loner");
        expect(r.nodes.map((n) => n.id)).toEqual(["loner"]);
        expect(r.edges).toEqual([]);
    });
    it("ignores comments and blanks", () => {
        const r = parseStructure("# title\n\nclient -> api  // hop\n");
        expect(r.errors).toEqual([]);
        expect(r.edges).toEqual([{ from: "client", to: "api" }]);
    });
    it("dedupes repeated edges and nodes", () => {
        const r = parseStructure("a -> b\na -> b");
        expect(r.edges).toEqual([{ from: "a", to: "b" }]);
        expect(r.nodes).toHaveLength(2);
    });
    it("reports empty node names with a line number", () => {
        const r = parseStructure("a -> \n -> b");
        expect(r.errors.length).toBeGreaterThan(0);
        expect(r.errors[0].line).toBe(1);
    });
});
