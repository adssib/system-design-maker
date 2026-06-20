export type NodeType = "client" | "lb" | "service" | "cache" | "queue" | "db";

export interface NodeModel { id: string; type: NodeType; }
export interface EdgeModel { from: string; to: string; }

export interface ParseError { line: number; message: string; }

export interface StructureParseResult {
  nodes: NodeModel[];
  edges: EdgeModel[];
  errors: ParseError[];
}

export type StepKind = "call" | "roundtrip" | "async";
export interface FlowStep {
  from: string;
  to: string;
  kind: StepKind;
  label?: string;
  line: number;
}
export interface FlowParseResult {
  name: string | null;
  steps: FlowStep[];
  errors: ParseError[];
}

export interface ValidationError { line: number; message: string; }

export type ParticleDir = "forward" | "back";
export interface ParticleEvent {
  edgeId: string;
  from: string;
  to: string;
  dir: ParticleDir;
  startMs: number;
  durMs: number;
  label?: string;
}

export interface Project {
  id: string;
  name: string;
  structureText: string;
  flowText: string;
  positions: Record<string, { x: number; y: number }>;
  updatedAt: number;
}

export const edgeKey = (from: string, to: string): string => `${from}->${to}`;
