import { useEffect, useRef, useState } from "react";
import { ViewportPortal, getBezierPath, Position, useNodes } from "@xyflow/react";
import { useAppStore, appStore } from "../store";
import { compileFlow } from "./interpreter";
import { TYPES } from "./typeInference";
import type { ParticleEvent } from "../types";

const NODE_W = 132, NODE_H = 50;

function centerRight(p: { x: number; y: number }) { return { x: p.x + NODE_W, y: p.y + NODE_H / 2 }; }
function centerLeft(p: { x: number; y: number }) { return { x: p.x, y: p.y + NODE_H / 2 }; }

export default function Particles() {
  const playToken = useAppStore((s) => s.playToken);
  const nodes = useNodes();
  const [dots, setDots] = useState<{ x: number; y: number; color: string; label?: string }[]>([]);
  const raf = useRef(0);

  useEffect(() => {
    if (!playToken) { setDots([]); return; }
    const st = appStore.getState();
    const posOf = (id: string) => nodes.find((n) => n.id === id)?.position;

    // build a measurable path per edge
    const paths = new Map<string, SVGPathElement>();
    const lengthOf = new Map<string, number>();
    for (const e of st.structure.edges) {
      const a = posOf(e.from), b = posOf(e.to);
      if (!a || !b) continue;
      const s = centerRight(a), t = centerLeft(b);
      const [d] = getBezierPath({ sourceX: s.x, sourceY: s.y, sourcePosition: Position.Right, targetX: t.x, targetY: t.y, targetPosition: Position.Left });
      const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
      el.setAttribute("d", d);
      paths.set(`${e.from}->${e.to}`, el);
      lengthOf.set(`${e.from}->${e.to}`, el.getTotalLength());
    }

    const durationFor = (from: string, to: string) => {
      const len = lengthOf.get(`${from}->${to}`) ?? 200;
      return Math.max(300, (len / st.speed) * 1000);
    };
    const events: ParticleEvent[] = compileFlow(st.flow.steps, durationFor);

    const colorOf = (from: string) =>
      TYPES[st.structure.nodes.find((n) => n.id === from)?.type ?? "service"].color;

    const lit = new Set<string>();
    const start = st.playAt;
    const loop = (now: number) => {
      const elapsed = now - start;
      const live: typeof dots = [];
      let anyPending = false;
      for (const ev of events) {
        const path = paths.get(ev.edgeId);
        if (!path) continue;
        const local = elapsed - ev.startMs;
        if (local < 0) { anyPending = true; continue; }
        const len = lengthOf.get(ev.edgeId)!;
        const t = local / ev.durMs;
        if (t >= 1) {
          if (!lit.has(ev.edgeId + ev.startMs)) {
            lit.add(ev.edgeId + ev.startMs);
            const el = document.querySelector(`.react-flow__node[data-id="${ev.to}"] .sysnode`);
            el?.classList.add("lit");
            setTimeout(() => el?.classList.remove("lit"), 230);
          }
          continue;
        }
        anyPending = true;
        const at = ev.dir === "back" ? (1 - t) * len : t * len;
        const pt = path.getPointAtLength(at);
        live.push({ x: pt.x, y: pt.y, color: colorOf(ev.from), label: ev.label });
      }
      setDots(live);
      if (anyPending) raf.current = requestAnimationFrame(loop);
      else { setDots([]); appStore.getState().stop(); }
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
    // re-run whenever a new play is triggered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playToken]);

  return (
    <ViewportPortal>
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
        {dots.map((d, i) => (
          <g key={i} transform={`translate(${d.x},${d.y})`}>
            <circle r={5} fill="#eaf2ff" stroke={d.color} strokeWidth={2.5} />
            {d.label && <text x={8} y={4} fontSize={11} fill={d.color}>{d.label}</text>}
          </g>
        ))}
      </svg>
    </ViewportPortal>
  );
}
