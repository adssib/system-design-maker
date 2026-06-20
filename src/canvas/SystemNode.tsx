import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NodeType } from "../types";
import { TYPES } from "../engine/typeInference";
import { iconFor } from "../catalog";

export interface SystemNodeData {
  label: string;
  type: NodeType;
  [key: string]: unknown;
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function mix(hex: string, target: string, t: number): string {
  const a = rgb(hex), b = rgb(target);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function SystemNode({ data, selected }: NodeProps) {
  const d = data as SystemNodeData;
  const color = TYPES[d.type].color;
  const icon = iconFor(d.label, d.type);
  const bg1 = mix(color, "#ffffff", 0.7);
  const bg2 = mix(color, "#ffffff", 0.54);
  const textCol = mix(color, "#1a0d05", 0.66);
  return (
    <div
      className="sysnode"
      style={{
        background: `linear-gradient(180deg, ${bg1}, ${bg2})`,
        borderColor: color,
        color: textCol,
        boxShadow: selected ? `0 0 0 2px ${color}, 0 0 20px -2px ${color}` : undefined,
      }}
    >
      <span className="sysnode-bar" style={{ background: color }} />
      <Handle type="target" position={Position.Left} />
      <span className="sysnode-icon">
        {icon.kind === "img" ? (
          <img src={icon.src} alt={icon.alt} width={22} height={22} draggable={false} />
        ) : (
          <icon.Icon size={19} color={color} strokeWidth={2.4} />
        )}
      </span>
      <span className="sysnode-text">
        <span className="sysnode-label">{d.label}</span>
        <span className="sysnode-type">{d.type}</span>
      </span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default memo(SystemNode);
