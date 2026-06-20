import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { TYPES } from "../engine/typeInference";
function SystemNode({ data, selected }) {
    const d = data;
    const color = TYPES[d.type].color;
    return (_jsxs("div", { className: "sysnode", style: { borderColor: color, boxShadow: selected ? `0 0 0 2px ${color}` : undefined }, children: [_jsx("span", { className: "sysnode-bar", style: { background: color } }), _jsx(Handle, { type: "target", position: Position.Left }), _jsx("div", { className: "sysnode-label", children: d.label }), _jsx("div", { className: "sysnode-type", children: d.type }), _jsx(Handle, { type: "source", position: Position.Right })] }));
}
export default memo(SystemNode);
