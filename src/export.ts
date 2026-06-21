import { toPng, toCanvas } from "html-to-image";
import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { buildFlowContext } from "./engine/flowContext";
import type { EdgeModel, FlowStep, NodeType } from "./types";

const BG = "#232019";

type Viewport = { x: number; y: number; zoom: number };

function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

// keep canvas chrome (controls, panels, attribution) out of captures
function skipChrome(node: HTMLElement): boolean {
  const c = node.classList;
  if (!c) return true;
  return !(
    c.contains("react-flow__controls") ||
    c.contains("react-flow__panel") ||
    c.contains("react-flow__attribution") ||
    c.contains("react-flow__minimap")
  );
}

const nextFrame = () =>
  new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

/** Static diagram (no particles) framed to the nodes' bounds. */
export async function exportPng(nodes: Node[], filename = "system-diagram.png") {
  if (!nodes.length) return;
  const W = 1600, H = 1000;
  const bounds = getNodesBounds(nodes);
  const vp = getViewportForBounds(bounds, W, H, 0.4, 2.5, 0.15);
  const viewport = document.querySelector(".react-flow__viewport") as HTMLElement | null;
  if (!viewport) return;
  const url = await toPng(viewport, {
    backgroundColor: BG,
    width: W,
    height: H,
    pixelRatio: 2,
    style: { width: `${W}px`, height: `${H}px`, transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` },
  });
  download(url, filename);
}

/**
 * Records the flow into a smooth animated GIF by stepping the particle clock at
 * a fixed fps (deterministic, not real-time screen capture) and framing the whole
 * diagram regardless of the current pan/zoom.
 */
export async function recordGif(opts: {
  nodes: Node[];
  nodeTypes: Map<string, NodeType>;
  edges: EdgeModel[];
  steps: FlowStep[];
  speed: number;
  setCaptureTime: (t: number | null) => void;
  getViewport: () => Viewport;
  setViewport: (vp: Viewport) => void;
  onProgress?: (p: number) => void;
  fps?: number;
}): Promise<number> {
  const target = document.querySelector(".react-flow") as HTMLElement | null;
  if (!target || !opts.nodes.length) return 0;

  const pos = new Map(opts.nodes.map((n) => [n.id, n.position]));
  const ctx = buildFlowContext(pos, opts.nodeTypes, opts.edges, opts.steps, opts.speed);
  const fps = opts.fps ?? 16;
  const frameMs = 1000 / fps;
  const frameCount = Math.min(160, Math.ceil((ctx.totalMs + 500) / frameMs) + 1);

  // frame the whole diagram, independent of the current viewport
  const saved = opts.getViewport();
  const bounds = getNodesBounds(opts.nodes);
  const vp = getViewportForBounds(bounds, target.clientWidth, target.clientHeight, 0.3, 2, 0.16);
  opts.setViewport(vp);
  await nextFrame();

  const scale = Math.min(1, 680 / target.clientWidth);
  const enc = GIFEncoder();
  try {
    for (let i = 0; i < frameCount; i++) {
      opts.setCaptureTime(i * frameMs);
      await nextFrame();
      const canvas = await toCanvas(target, { backgroundColor: BG, pixelRatio: scale, filter: skipChrome });
      const c2d = canvas.getContext("2d");
      if (!c2d) break;
      const { data, width, height } = c2d.getImageData(0, 0, canvas.width, canvas.height);
      const palette = quantize(data, 256);
      const index = applyPalette(data, palette);
      enc.writeFrame(index, width, height, { palette, delay: Math.round(frameMs) });
      opts.onProgress?.((i + 1) / frameCount);
    }
  } finally {
    opts.setCaptureTime(null);
    opts.setViewport(saved);
  }

  enc.finish();
  const blob = new Blob([new Uint8Array(enc.bytes())], { type: "image/gif" });
  download(URL.createObjectURL(blob), "flow.gif");
  return frameCount;
}
