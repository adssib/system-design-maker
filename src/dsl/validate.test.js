import { describe, it, expect } from "vitest";
import { validate } from "./validate";
import { parseStructure } from "./structure";
import { parseFlow } from "./flow";
describe("validate", () => {
    it("passes when every hop matches a structure edge", () => {
        const s = parseStructure("client -> api\napi -> db");
        const f = parseFlow('flow "x":\n  client -> api\n  api <-> db');
        expect(validate(s, f)).toEqual([]);
    });
    it("flags a hop with no matching structure edge, with its line number", () => {
        const s = parseStructure("client -> api");
        const f = parseFlow('flow "x":\n  client -> api\n  api -> db');
        const errs = validate(s, f);
        expect(errs).toHaveLength(1);
        expect(errs[0].line).toBe(3);
        expect(errs[0].message).toContain("api");
    });
});
