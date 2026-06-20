import { describe, it, expect } from "vitest";
import { edgeKey } from "./types";

describe("edgeKey", () => {
  it("joins from and to with an arrow", () => {
    expect(edgeKey("api", "db")).toBe("api->db");
  });
});
