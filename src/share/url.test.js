import { describe, it, expect } from "vitest";
import { encodeShare, decodeShare } from "./url";
describe("share url", () => {
    it("round-trips a design", () => {
        const d = { structureText: "client -> api", flowText: 'flow "x":\n  client -> api' };
        const hash = encodeShare(d);
        expect(decodeShare(hash)).toEqual(d);
    });
    it("accepts a leading #", () => {
        const d = { structureText: "a -> b", flowText: "" };
        expect(decodeShare("#" + encodeShare(d))).toEqual(d);
    });
    it("handles unicode", () => {
        const d = { structureText: "café -> dünya", flowText: "" };
        expect(decodeShare(encodeShare(d))).toEqual(d);
    });
    it("returns null on garbage", () => {
        expect(decodeShare("#nonsense")).toBeNull();
    });
});
