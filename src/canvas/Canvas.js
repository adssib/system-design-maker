import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo } from "react";
import { ReactFlow, Background, Controls, applyNodeChanges, } from "@xyflow/react";
import { useAppStore, appStore } from "../store";
import SystemNode from "./SystemNode";
import Particles from "../engine/Particles";
const nodeTypes = { system: SystemNode };
export default function Canvas() {
    const structure = useAppStore((s) => s.structure);
    const positions = useAppStore((s) => s.positions);
    const selection = useAppStore((s) => s.selection);
    const nodes = useMemo(() => structure.nodes.map((n) => ({
        id: n.id,
        type: "system",
        position: positions[n.id] ?? { x: 0, y: 0 },
        selected: selection === n.id,
        data: { label: n.id, type: n.type },
    })), [structure.nodes, positions, selection]);
    const edges = useMemo(() => structure.edges.map((e) => ({
        id: `${e.from}->${e.to}`,
        source: e.from,
        target: e.to,
        type: "default",
    })), [structure.edges]);
    const onNodesChange = useCallback((changes) => {
        // we only care about position + selection; apply against current nodes then push back
        const next = applyNodeChanges(changes, nodes);
        for (const n of next) {
            const p = n.position;
            appStore.getState().moveNode(n.id, p.x, p.y);
            if (n.selected)
                appStore.getState().select(n.id);
        }
    }, [nodes]);
    const onConnect = useCallback((c) => {
        if (c.source && c.target)
            appStore.getState().addEdge(c.source, c.target);
    }, []);
    const onNodeDoubleClick = useCallback((_, node) => {
        const next = window.prompt("Rename node", node.id);
        if (next)
            appStore.getState().renameNode(node.id, next.trim());
    }, []);
    return (_jsx("div", { className: "canvas", children: _jsxs(ReactFlow, { nodes: nodes, edges: edges, nodeTypes: nodeTypes, onNodesChange: onNodesChange, onConnect: onConnect, onNodeDoubleClick: onNodeDoubleClick, onPaneClick: () => appStore.getState().select(null), fitView: true, children: [_jsx(Background, {}), _jsx(Controls, {}), _jsx(Particles, {})] }) }));
}
