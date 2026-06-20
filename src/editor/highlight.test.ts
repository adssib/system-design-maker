import { describe, it, expect } from "vitest";
import { highlightDSL } from "./highlight";

// recover the visible text from the highlighted HTML
function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

describe("highlightDSL", () => {
  it("preserves the exact text (overlay must align char-for-char)", () => {
    const samples = [
      "client -> gateway",
      "gateway -> [auth, api]  # comment",
      'flow "GET /x":\n  api <-> db\n  api ~> queue (miss)',
      "load-balancer -> service2",
      "a->b",
      "",
    ];
    for (const s of samples) expect(textOf(highlightDSL(s))).toBe(s);
  });

  it("tags verbs, comments, the flow keyword and strings", () => {
    expect(highlightDSL("a -> b")).toContain("tok-verb");
    expect(highlightDSL("api <-> db")).toContain("tok-verb");
    expect(highlightDSL("# note")).toContain("tok-comment");
    expect(highlightDSL('flow "x":')).toContain("tok-keyword");
    expect(highlightDSL('flow "x":')).toContain("tok-string");
  });
});
