import type { StructureParseResult, FlowParseResult, ParsedFlow, ValidationError } from "../types";
import { edgeKey } from "../types";

export function validate(
  structure: StructureParseResult,
  flow: FlowParseResult
): ValidationError[] {
  const edges = new Set(structure.edges.map((e) => edgeKey(e.from, e.to)));
  const errors: ValidationError[] = [];
  for (const step of flow.steps) {
    if (!edges.has(edgeKey(step.from, step.to))) {
      errors.push({
        line: step.line,
        message: `no connection ${step.from} -> ${step.to} in the structure file`,
      });
    }
  }
  return errors;
}

export function validateFlows(
  structure: StructureParseResult,
  flows: ParsedFlow[]
): ValidationError[] {
  const edges = new Set(structure.edges.map((e) => edgeKey(e.from, e.to)));
  const errors: ValidationError[] = [];
  for (const flow of flows) {
    for (const step of flow.steps) {
      if (!edges.has(edgeKey(step.from, step.to))) {
        errors.push({
          line: step.line,
          message: `no connection ${step.from} -> ${step.to} in the structure file`,
        });
      }
    }
  }
  return errors;
}
