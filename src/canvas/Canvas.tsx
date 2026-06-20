import { useCallback, useEffect } from "react";
import {
  ReactFlow, Background, Controls,
  useNodesState, useEdgesState,
  type Node, type Edge, type NodeChange, type Connection,
} from "@xyflow/react";
import { useAppStore, appStore } from "../store";
import SystemNode from "./SystemNode";
import Particles from "../engine/Particles";
import ExportMenu from "../components/ExportMenu";

const nodeTypes = { system: SystemNode };

export default function Canvas() {
  const structure = useAppStore((s) => s.structure);
  const positions = useAppStore((s) => s.positions);

  // React Flow owns its node/edge objects so it can persist measured dimensions
  // (a node without `measured` renders visibility:hidden). The store stays the
  // source of truth for *structure*; we sync it in via effects below.
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // store structure + positions -> React Flow nodes, preserving `measured`
  // for ids that survive so they stay visible across re-syncs.
  useEffect(() => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return structure.nodes.map((n) => {
        const existing = prevById.get(n.id);
        const node: Node = {
          id: n.id,
          type: "system",
          position: positions[n.id] ?? existing?.position ?? { x: 0, y: 0 },
          data: { label: n.id, type: n.type },
        };
        if (existing?.measured) node.measured = existing.measured;
        return node;
      });
    });
  }, [structure.nodes, positions, setNodes]);

  useEffect(() => {
    setEdges(structure.edges.map((e) => ({
      id: `${e.from}->${e.to}`, source: e.from, target: e.to,
    })));
  }, [structure.edges, setEdges]);

  // apply RF changes (incl. dimensions/selection) into RF state, and mirror
  // selection into the store.
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    for (const c of changes) {
      if (c.type === "select") appStore.getState().select(c.selected ? c.id : null);
    }
  }, [onNodesChange]);

  const onNodeDragStop = useCallback((_: unknown, node: Node) => {
    appStore.getState().moveNode(node.id, node.position.x, node.position.y);
  }, []);

  const onConnect = useCallback((c: Connection) => {
    if (c.source && c.target) appStore.getState().addEdge(c.source, c.target);
  }, []);

  const onNodeDoubleClick = useCallback((_: unknown, node: Node) => {
    appStore.getState().setRenaming(node.id);
  }, []);

  return (
    <div className="canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={() => appStore.getState().select(null)}
        fitView
      >
        <Background />
        <Controls />
        <ExportMenu />
        <Particles />
      </ReactFlow>
    </div>
  );
}
