import type { FlowParseResult, FlowsParseResult, ParsedFlow, FlowStep, StepKind, ParseError } from "../types";

const HEADER = /^flow\s+"([^"]*)"\s*:\s*$/;
const STEP = /^(\S+)\s*(<->|~>|->)\s*([^(]+?)\s*(?:\(([^)]*)\))?\s*$/;
const KIND: Record<string, StepKind> = { "->": "call", "<->": "roundtrip", "~>": "async" };

export function parseFlow(text: string): FlowParseResult {
  let name: string | null = null;
  const steps: FlowStep[] = [];
  const errors: ParseError[] = [];

  text.split("\n").forEach((raw, i) => {
    const line = raw.replace(/#.*$/, "").replace(/\/\/.*$/, "").trim();
    if (!line) return;
    const ln = i + 1;

    const header = line.match(HEADER);
    if (header) { if (name === null) name = header[1]; return; }

    const m = line.match(STEP);
    if (!m) { errors.push({ line: ln, message: `not a valid step: "${line}"` }); return; }

    const [, from, verb, to, label] = m;
    steps.push({ from, to: to.trim(), kind: KIND[verb], label: label?.trim() || undefined, line: ln });
  });

  return { name, steps, errors };
}

// Parses one flow file containing one or more `flow "Name":` blocks.
export function parseFlows(text: string): FlowsParseResult {
  const flows: ParsedFlow[] = [];
  const errors: ParseError[] = [];
  let current: ParsedFlow | null = null;

  text.split("\n").forEach((raw, i) => {
    const line = raw.replace(/#.*$/, "").replace(/\/\/.*$/, "").trim();
    if (!line) return;
    const ln = i + 1;

    const header = line.match(HEADER);
    if (header) { current = { name: header[1], steps: [] }; flows.push(current); return; }

    const m = line.match(STEP);
    if (!m) { errors.push({ line: ln, message: `not a valid step: "${line}"` }); return; }
    if (!current) { errors.push({ line: ln, message: `step before any flow header` }); return; }

    const [, from, verb, to, label] = m;
    current.steps.push({ from, to: to.trim(), kind: KIND[verb], label: label?.trim() || undefined, line: ln });
  });

  return { flows, errors };
}
