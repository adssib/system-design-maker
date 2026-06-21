import dagre from "@dagrejs/dagre";
import type { EdgeModel } from "../types";

const NODE_W = 150, NODE_H = 52;

/** Auto-layout via dagre: spaces nodes and reserves lanes for edges so long
 *  connections route around boxes instead of overlapping them. Returns the
 *  node TOP-LEFT positions (dagre reports centres). */
export function dagreLayout(
  ids: string[],
  edges: EdgeModel[]
): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 38, ranksep: 96, marginx: 24, marginy: 24, ranker: "network-simplex" });
  g.setDefaultEdgeLabel(() => ({}));

  const idSet = new Set(ids);
  for (const id of ids) g.setNode(id, { width: NODE_W, height: NODE_H });
  for (const e of edges) if (idSet.has(e.from) && idSet.has(e.to)) g.setEdge(e.from, e.to);

  dagre.layout(g);

  const pos: Record<string, { x: number; y: number }> = {};
  for (const id of ids) {
    const n = g.node(id);
    pos[id] = { x: n.x - NODE_W / 2, y: n.y - NODE_H / 2 };
  }
  return pos;
}
