export const WORLD = { W: 1600, H: 900 };
export const GAP = { COL: 230, ROW: 110 };
export function layeredPositions(ids, edges) {
    const idSet = new Set(ids);
    const incoming = new Map(ids.map((i) => [i, []]));
    const outgoing = new Map(ids.map((i) => [i, []]));
    for (const e of edges) {
        if (idSet.has(e.from) && idSet.has(e.to)) {
            outgoing.get(e.from).push(e.to);
            incoming.get(e.to).push(e.from);
        }
    }
    const indeg = new Map(ids.map((i) => [i, incoming.get(i).length]));
    const q = ids.filter((i) => indeg.get(i) === 0);
    const order = [];
    const seen = new Set(q);
    while (q.length) {
        const id = q.shift();
        order.push(id);
        for (const t of outgoing.get(id)) {
            indeg.set(t, indeg.get(t) - 1);
            if (indeg.get(t) === 0 && !seen.has(t)) {
                seen.add(t);
                q.push(t);
            }
        }
    }
    ids.forEach((i) => { if (!seen.has(i))
        order.push(i); });
    const layer = new Map(ids.map((i) => [i, 0]));
    order.forEach((id) => {
        for (const t of outgoing.get(id))
            layer.set(t, Math.max(layer.get(t), layer.get(id) + 1));
    });
    const buckets = {};
    ids.forEach((i) => (buckets[layer.get(i)] ||= []).push(i));
    const pos = {};
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [l, arr] of Object.entries(buckets)) {
        const totalH = (arr.length - 1) * GAP.ROW;
        arr.forEach((id, i) => {
            const x = Number(l) * GAP.COL;
            const y = -totalH / 2 + i * GAP.ROW;
            pos[id] = { x, y };
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        });
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    for (const id of Object.keys(pos)) {
        pos[id].x += WORLD.W / 2 - cx;
        pos[id].y += WORLD.H / 2 - cy;
    }
    return pos;
}
