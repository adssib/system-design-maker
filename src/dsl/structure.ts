import type { StructureParseResult, ParseError, NodeType } from "../types";
import { typeOf } from "../engine/typeInference";

function names(segment: string): string[] {
  const seg = segment.trim();
  const inner = seg.startsWith("[") && seg.endsWith("]") ? seg.slice(1, -1) : seg;
  return inner.split(",").map((s) => s.trim()).filter(Boolean);
}

export function parseStructure(text: string): StructureParseResult {
  const order: string[] = [];
  const explicit = new Map<string, NodeType>();
  const seen = new Set<string>();
  const edges: { from: string; to: string }[] = [];
  const edgeSeen = new Set<string>();
  const errors: ParseError[] = [];

  const declare = (id: string) => {
    if (!seen.has(id)) { seen.add(id); order.push(id); }
  };
  const addEdge = (a: string, b: string) => {
    const k = `${a}->${b}`;
    if (!edgeSeen.has(k)) { edgeSeen.add(k); edges.push({ from: a, to: b }); }
  };

  text.split("\n").forEach((raw, i) => {
    const line = raw.replace(/#.*$/, "").replace(/\/\/.*$/, "").trim();
    if (!line) return;
    const ln = i + 1;

    if (!line.includes("->")) {
      const [lhs, rhs] = line.split(":");
      const id = lhs.trim();
      if (!id) { errors.push({ line: ln, message: "missing node name" }); return; }
      declare(id);
      if (rhs !== undefined && rhs.trim()) explicit.set(id, typeOf(rhs.trim()));
      return;
    }

    const groups = line.split("->").map(names);
    if (groups.some((g) => g.length === 0)) {
      errors.push({ line: ln, message: `empty node near "${line}"` });
      return;
    }
    groups.flat().forEach(declare);
    for (let g = 0; g < groups.length - 1; g++)
      for (const a of groups[g]) for (const b of groups[g + 1]) addEdge(a, b);
  });

  const nodes = order.map((id) => ({ id, type: explicit.get(id) ?? typeOf(id) }));
  return { nodes, edges, errors };
}
