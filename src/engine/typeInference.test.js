import { describe, it, expect } from "vitest";
import { typeOf, TYPES } from "./typeInference";
describe("typeOf", () => {
    it("infers cache from redis", () => expect(typeOf("redis")).toBe("cache"));
    it("infers db from postgres", () => expect(typeOf("postgres")).toBe("db"));
    it("infers lb from gateway", () => expect(typeOf("api-gateway")).toBe("lb"));
    it("infers queue from sqs", () => expect(typeOf("orders-sqs")).toBe("queue"));
    it("infers client from user", () => expect(typeOf("user")).toBe("client"));
    it("defaults to service", () => expect(typeOf("widgetizer")).toBe("service"));
    it("does not let the service regex pre-empt specific types", () => expect(typeOf("cache")).toBe("cache"));
});
describe("TYPES", () => {
    it("has a color for every category", () => {
        for (const t of ["client", "lb", "service", "cache", "queue", "db"]) {
            expect(TYPES[t].color).toMatch(/^#/);
        }
    });
});
