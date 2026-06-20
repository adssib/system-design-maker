import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NodeType } from "../types";
import { TYPES } from "../engine/typeInference";

export interface SystemNodeData {
  label: string;
  type: NodeType;
  [key: string]: unknown;
}

function SystemNode({ data, selected }: NodeProps) {
  const d = data as SystemNodeData;
  const color = TYPES[d.type].color;
  return (
    <div className="sysnode" style={{ borderColor: color, boxShadow: selected ? `0 0 0 2px ${color}` : undefined }}>
      <span className="sysnode-bar" style={{ background: color }} />
      <Handle type="target" position={Position.Left} />
      <div className="sysnode-label">{d.label}</div>
      <div className="sysnode-type">{d.type}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default memo(SystemNode);
