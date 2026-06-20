import { toPng, toCanvas } from "html-to-image";
import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";
import { GIFEncoder, quantize, applyPalette } from "gifenc";

const BG = "#232019";

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

/** Records the currently-playing flow into an animated GIF (real-time capture). */
export async function recordGif(opts: { durationMs: number; filename?: string }): Promise<number> {
  const target = document.querySelector(".react-flow") as HTMLElement | null;
  if (!target) return 0;
  const scale = Math.min(1, 760 / target.clientWidth);
  const enc = GIFEncoder();
  const start = performance.now();
  let last = start;
  let frames = 0;
  while (performance.now() - start < opts.durationMs) {
    const canvas = await toCanvas(target, { backgroundColor: BG, pixelRatio: scale, filter: skipChrome });
    const now = performance.now();
    const delay = Math.min(220, Math.max(20, Math.round(now - last)));
    last = now;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    enc.writeFrame(index, width, height, { palette, delay });
    frames++;
  }
  enc.finish();
  const blob = new Blob([new Uint8Array(enc.bytes())], { type: "image/gif" });
  download(URL.createObjectURL(blob), opts.filename ?? "flow.gif");
  return frames;
}
