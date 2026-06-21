import { createStore, useStore } from "zustand";
import type {
  StructureParseResult, ParsedFlow, ValidationError, ParseError, NodeModel, EdgeModel,
} from "./types";
import { parseStructure } from "./dsl/structure";
import { serializeStructure } from "./dsl/serialize";
import { parseFlows } from "./dsl/flow";
import { validateFlows } from "./dsl/validate";
import { dagreLayout } from "./engine/dagreLayout";
import { typeOf } from "./engine/typeInference";

export interface AppState {
  structureText: string;
  flowText: string;
  positions: Record<string, { x: number; y: number }>;
  selection: string | null;
  renaming: string | null;
  paletteOpen: boolean;
  structure: StructureParseResult;
  flows: ParsedFlow[];
  flow: ParsedFlow;
  flowErrors: ParseError[];
  activeFlowName: string | null;
  validation: ValidationError[];

  playToken: number;
  playAt: number;
  speed: number;
  captureTime: number | null;
  setSpeed: (v: number) => void;
  play: () => void;
  stop: () => void;
  setCaptureTime: (t: number | null) => void;

  setStructureText: (t: string) => void;
  setFlowText: (t: string) => void;
  setActiveFlow: (name: string) => void;
  addNode: (x: number, y: number, base?: string) => string;
  addEdge: (from: string, to: string) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (from: string, to: string) => void;
  renameNode: (oldId: string, nextId: string) => void;
  moveNode: (id: string, x: number, y: number) => void;
  select: (id: string | null) => void;
  setRenaming: (id: string | null) => void;
  setPaletteOpen: (open: boolean) => void;
  autoArrange: () => void;
  load: (structureText: string, flowText: string, positions: Record<string, { x: number; y: number }>) => void;
}

const empty = (): StructureParseResult => ({ nodes: [], edges: [], errors: [] });

export function createAppStore() {
  return createStore<AppState>((set, get) => {
    // recompute positions: keep existing, lay out only the missing ones
    const layoutMissing = (
      nodes: NodeModel[], edges: EdgeModel[], prev: Record<string, { x: number; y: number }>
    ) => {
      const next: Record<string, { x: number; y: number }> = {};
      const missing = nodes.filter((n) => !prev[n.id]).map((n) => n.id);
      const laid = missing.length ? dagreLayout(nodes.map((n) => n.id), edges) : {};
      for (const n of nodes) next[n.id] = prev[n.id] ?? laid[n.id];
      return next;
    };

    const revalidate = (structure: StructureParseResult, flows: ParsedFlow[]) =>
      validateFlows(structure, flows);

    // apply a mutated structure model (canvas path): regenerate text, keep no-loop invariant
    const applyModel = (nodes: NodeModel[], edges: EdgeModel[]) => {
      const structure: StructureParseResult = { nodes, edges, errors: [] };
      const positions = layoutMissing(nodes, edges, get().positions);
      const structureText = serializeStructure(nodes, edges);
      set({ structure, structureText, positions, validation: revalidate(structure, get().flows) });
    };

    return {
      structureText: "",
      flowText: "",
      positions: {},
      selection: null,
      renaming: null,
      paletteOpen: false,
      structure: empty(),
      flows: [],
      flow: { name: "", steps: [] },
      flowErrors: [],
      activeFlowName: null,
      validation: [],

      playToken: 0,
      playAt: 0,
      speed: 240,
      captureTime: null,
      setSpeed: (v) => set({ speed: v }),
      play: () => set({ playToken: get().playToken + 1, playAt: performance.now() }),
      stop: () => set({ playToken: 0 }),
      setCaptureTime: (t) => set({ captureTime: t }),

      setStructureText: (t) => {
        const structure = parseStructure(t);
        const positions = layoutMissing(structure.nodes, structure.edges, get().positions);
        set({ structureText: t, structure, positions, validation: revalidate(structure, get().flows) });
      },

      setFlowText: (t) => {
        const { flows, errors } = parseFlows(t);
        const prev = get().activeFlowName;
        const activeFlowName = prev && flows.some((f) => f.name === prev) ? prev : flows[0]?.name ?? null;
        const flow = flows.find((f) => f.name === activeFlowName) ?? { name: "", steps: [] };
        set({ flowText: t, flows, flow, flowErrors: errors, activeFlowName, validation: revalidate(get().structure, flows) });
      },

      setActiveFlow: (name) => {
        const flow = get().flows.find((f) => f.name === name) ?? { name: "", steps: [] };
        set({ activeFlowName: name, flow });
      },

      addNode: (x, y, base = "service") => {
        const taken = new Set(get().structure.nodes.map((n) => n.id));
        let id = base, i = 1;
        while (taken.has(id)) id = `${base}${++i}`;
        const nodes = [...get().structure.nodes, { id, type: typeOf(id) }];
        const next = { ...get().positions, [id]: { x, y } };
        set({ positions: next });
        applyModel(nodes, get().structure.edges);
        return id;
      },

      addEdge: (from, to) => {
        const edges = get().structure.edges;
        if (edges.some((e) => e.from === from && e.to === to)) return;
        applyModel(get().structure.nodes, [...edges, { from, to }]);
      },

      deleteNode: (id) => {
        const nodes = get().structure.nodes.filter((n) => n.id !== id);
        const edges = get().structure.edges.filter((e) => e.from !== id && e.to !== id);
        const positions = { ...get().positions };
        delete positions[id];
        set({ positions, selection: get().selection === id ? null : get().selection });
        applyModel(nodes, edges);
      },

      deleteEdge: (from, to) => {
        const edges = get().structure.edges.filter((e) => !(e.from === from && e.to === to));
        applyModel(get().structure.nodes, edges);
      },

      renameNode: (oldId, nextId) => {
        if (!nextId || nextId === oldId || get().structure.nodes.some((n) => n.id === nextId)) return;
        const nodes = get().structure.nodes.map((n) =>
          n.id === oldId ? { id: nextId, type: typeOf(nextId) } : n
        );
        const edges = get().structure.edges.map((e) => ({
          from: e.from === oldId ? nextId : e.from,
          to: e.to === oldId ? nextId : e.to,
        }));
        const positions = { ...get().positions };
        if (positions[oldId]) { positions[nextId] = positions[oldId]; delete positions[oldId]; }
        set({ positions, selection: get().selection === oldId ? nextId : get().selection });
        applyModel(nodes, edges);
      },

      moveNode: (id, x, y) => set({ positions: { ...get().positions, [id]: { x, y } } }),

      select: (id) => set({ selection: id }),

      setRenaming: (id) => set({ renaming: id }),

      setPaletteOpen: (open) => set({ paletteOpen: open }),

      autoArrange: () => {
        const { nodes, edges } = get().structure;
        set({ positions: dagreLayout(nodes.map((n) => n.id), edges) });
      },

      load: (structureText, flowText, positions) => {
        const structure = parseStructure(structureText);
        const { flows, errors } = parseFlows(flowText);
        const activeFlowName = flows[0]?.name ?? null;
        const flow = flows[0] ?? { name: "", steps: [] };
        const filled = layoutMissing(structure.nodes, structure.edges, positions);
        set({
          structureText, flowText, positions: filled, structure,
          flows, flow, flowErrors: errors, activeFlowName,
          validation: validateFlows(structure, flows), selection: null,
        });
      },
    };
  });
}

export const appStore = createAppStore();
export const useAppStore = <T>(selector: (s: AppState) => T): T => useStore(appStore, selector);
