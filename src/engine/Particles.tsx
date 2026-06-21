import { useCallback, useEffect, useRef, useState } from "react";
import { ViewportPortal, useNodes } from "@xyflow/react";
import { useAppStore, appStore } from "../store";
import { buildFlowContext, dotsAt, type Dot, type FlowContext } from "./flowContext";
import type { NodeType } from "../types";

export default function Particles() {
  const playToken = useAppStore((s) => s.playToken);
  const captureTime = useAppStore((s) => s.captureTime);
  const nodes = useNodes();
  const [dots, setDots] = useState<Dot[]>([]);
  const raf = useRef(0);
  const captureCtx = useRef<FlowContext | null>(null);

  const buildCtx = useCallback((): FlowContext => {
    const st = appStore.getState();
    const pos = new Map(nodes.map((n) => [n.id, n.position]));
    const type = new Map<string, NodeType>(st.structure.nodes.map((n) => [n.id, n.type]));
    return buildFlowContext(pos, type, st.structure.edges, st.flow.steps, st.speed);
  }, [nodes]);

  // Live playback (RAF clock). Also pulses destination nodes on arrival.
  useEffect(() => {
    if (!playToken) { setDots([]); return; }
    const ctx = buildCtx();
    const start = appStore.getState().playAt;
    const lit = new Set<string>();
    const loop = (now: number) => {
      const elapsed = now - start;
      setDots(dotsAt(elapsed, ctx));
      for (const ev of ctx.events) {
        const key = ev.edgeId + ev.startMs + ev.dir;
        if (elapsed >= ev.startMs + ev.durMs && !lit.has(key)) {
          lit.add(key);
          const el = document.querySelector(`.react-flow__node[data-id="${ev.to}"] .sysnode`);
          el?.classList.add("lit");
          setTimeout(() => el?.classList.remove("lit"), 230);
        }
      }
      if (elapsed < ctx.totalMs + 250) raf.current = requestAnimationFrame(loop);
      else { setDots([]); appStore.getState().stop(); }
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playToken]);

  // Capture mode: render deterministically at an explicit time (for GIF export).
  useEffect(() => {
    if (captureTime === null) { captureCtx.current = null; if (!playToken) setDots([]); return; }
    if (!captureCtx.current) captureCtx.current = buildCtx();
    setDots(dotsAt(captureTime, captureCtx.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureTime]);

  return (
    <ViewportPortal>
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
        {dots.map((d, i) => (
          <g key={i} transform={`translate(${d.x},${d.y})`}>
            <circle r={5} fill="#fff6e6" stroke={d.color} strokeWidth={2.5} />
            {d.label && <text x={8} y={4} fontSize={11} fill={d.color}>{d.label}</text>}
          </g>
        ))}
      </svg>
    </ViewportPortal>
  );
}
