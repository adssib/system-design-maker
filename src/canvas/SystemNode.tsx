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

function SystemNode({ data, selected }: NodeProps) {
  const d = data as SystemNodeData;
  const color = TYPES[d.type].color;
  const icon = iconFor(d.label, d.type);
  return (
    <div
      className="sysnode"
      style={{ borderColor: color, boxShadow: selected ? `0 0 0 2px ${color}, 0 0 18px -4px ${color}` : undefined }}
    >
      <span className="sysnode-bar" style={{ background: color }} />
      <Handle type="target" position={Position.Left} />
      <span className="sysnode-icon">
        {icon.kind === "img" ? (
          <img src={icon.src} alt={icon.alt} width={22} height={22} draggable={false} />
        ) : (
          <icon.Icon size={19} color={color} strokeWidth={2} />
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
