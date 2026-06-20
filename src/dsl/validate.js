import { edgeKey } from "../types";
export function validate(structure, flow) {
    const edges = new Set(structure.edges.map((e) => edgeKey(e.from, e.to)));
    const errors = [];
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
