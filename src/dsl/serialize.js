import { typeOf } from "../engine/typeInference";
export function serializeStructure(nodes, edges) {
    const lines = [];
    for (const n of nodes) {
        if (n.type !== typeOf(n.id))
            lines.push(`${n.id} : ${n.type}`);
    }
    const bySource = new Map();
    for (const e of edges) {
        const list = bySource.get(e.from) ?? bySource.set(e.from, []).get(e.from);
        list.push(e.to);
    }
    const incoming = new Set(edges.map((e) => e.to));
    for (const n of nodes) {
        const tgts = bySource.get(n.id);
        if (tgts && tgts.length)
            lines.push(tgts.length === 1 ? `${n.id} -> ${tgts[0]}` : `${n.id} -> [${tgts.join(", ")}]`);
    }
    for (const n of nodes) {
        if (!bySource.has(n.id) && !incoming.has(n.id))
            lines.push(n.id);
    }
    return lines.join("\n");
}
