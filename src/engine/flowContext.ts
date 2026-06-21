import { getBezierPath, Position } from "@xyflow/react";
import { compileFlow } from "./interpreter";
import { TYPES } from "./typeInference";
import { edgeKey } from "../types";
import type { EdgeModel, FlowStep, NodeType, ParticleEvent } from "../types";

const NODE_W = 150, NODE_H = 52;

export interface Dot { x: number; y: number; color: string; label?: string; }

export interface FlowContext {
  events: ParticleEvent[];
  totalMs: number;
  paths: Map<string, SVGPathElement>;
  lengthOf: Map<string, number>;
  colorOf: (from: string) => string;
}

/** Builds edge geometry + compiled particle events for a flow. Browser-only
 *  (uses getTotalLength). Shared by live playback and GIF capture so both agree. */
export function buildFlowContext(
  pos: Map<string, { x: number; y: number }>,
  type: Map<string, NodeType>,
  edges: EdgeModel[],
  steps: FlowStep[],
  speed: number
): FlowContext {
  const paths = new Map<string, SVGPathElement>();
  const lengthOf = new Map<string, number>();
  for (const e of edges) {
    const a = pos.get(e.from), b = pos.get(e.to);
    if (!a || !b) continue;
    const [d] = getBezierPath({
      sourceX: a.x + NODE_W, sourceY: a.y + NODE_H / 2, sourcePosition: Position.Right,
      targetX: b.x, targetY: b.y + NODE_H / 2, targetPosition: Position.Left,
    });
    const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
    el.setAttribute("d", d);
    const k = edgeKey(e.from, e.to);
    paths.set(k, el);
    lengthOf.set(k, el.getTotalLength());
  }
  const durationFor = (from: string, to: string) =>
    Math.max(300, ((lengthOf.get(edgeKey(from, to)) ?? 200) / speed) * 1000);
  const events = compileFlow(steps, durationFor);
  const totalMs = events.reduce((m, e) => Math.max(m, e.startMs + e.durMs), 0);
  const colorOf = (from: string) => TYPES[type.get(from) ?? "service"].color;
  return { events, totalMs, paths, lengthOf, colorOf };
}

/** Particle positions at a given elapsed time. */
export function dotsAt(elapsed: number, ctx: FlowContext): Dot[] {
  const live: Dot[] = [];
  for (const ev of ctx.events) {
    const path = ctx.paths.get(ev.edgeId);
    if (!path) continue;
    const local = elapsed - ev.startMs;
    if (local < 0 || local > ev.durMs) continue;
    const len = ctx.lengthOf.get(ev.edgeId)!;
    const t = local / ev.durMs;
    const at = ev.dir === "back" ? (1 - t) * len : t * len;
    const pt = path.getPointAtLength(at);
    live.push({ x: pt.x, y: pt.y, color: ctx.colorOf(ev.from), label: ev.label });
  }
  return live;
}
