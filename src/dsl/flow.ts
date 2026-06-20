import type { FlowParseResult, FlowStep, StepKind, ParseError } from "../types";

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
