"use strict";
/* system-design-maker — DSL-first, fully interactive system-design canvas.
   The canvas IS the editor; the DSL text and the canvas stay two-way synced. */

const SVGNS = "http://www.w3.org/2000/svg";
const WORLD_W = 1600, WORLD_H = 900;     // fixed world space; svg viewBox scales it to the stage
const NODE_W = 132, NODE_H = 50;
const COL_GAP = 230, ROW_GAP = 110;
const DRAG_THRESHOLD = 4;                // px (world) before a press counts as a drag, not a click

/* ---------------- node type inference (name -> visual) ---------------- */
const TYPES = {
  client:  { color: "#9b8cff", match: /^(client|user|browser|mobile|app|frontend)/i },
  lb:      { color: "#ffb454", match: /(lb|balancer|gateway|proxy|ingress|cdn|nginx|envoy)/i },
  service: { color: "#5b9dff", match: /(api|service|server|svc|worker|node|micro|backend|fn|lambda)/i },
  cache:   { color: "#ff7eb6", match: /(cache|redis|memcache)/i },
  queue:   { color: "#36e0c0", match: /(queue|kafka|rabbit|sqs|pubsub|stream|topic|bus)/i },
  db:      { color: "#46d369", match: /(db|database|sql|postgres|mysql|mongo|store|dynamo|cassandra|s3|blob)/i },
};
function typeOf(name) {
  for (const [t, def] of Object.entries(TYPES)) if (t !== "service" && def.match.test(name)) return t;
  return "service";
}

/* ---------------- state (single source of truth for the canvas) ---------------- */
const state = {
  nodes: new Map(), // id -> { id, type, x, y, g? }   (x,y = node CENTER in world coords)
  edges: new Map(), // "a→b" -> { from, to, pathEl? }
  selected: null,
};
let speedPxPerSec = 240;

/* ---------------- DOM refs ---------------- */
const svg = document.getElementById("canvas");
const gEdges = document.getElementById("g-edges");
const gNodes = document.getElementById("g-nodes");
const gParts = document.getElementById("g-particles");
const gTemp  = document.getElementById("g-temp");
const dslEl  = document.getElementById("dsl");
const errBox = document.getElementById("error");

svg.setAttribute("viewBox", `0 0 ${WORLD_W} ${WORLD_H}`);

function el(tag, attrs) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
/* screen (mouse) coords -> world (svg) coords, accounting for viewBox scaling */
function toWorld(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function nodeFromEvent(evt) {
  let n = document.elementFromPoint(evt.clientX, evt.clientY);
  while (n && n !== document) {
    if (n.dataset && n.dataset.id) return state.nodes.get(n.dataset.id);
    n = n.parentNode;
  }
  return null;
}

/* ---------------- DSL  <->  graph ---------------- */
// text -> { nodeIds:[...], edges:[{from,to}] }  (throws on malformed line)
function parseTopology(text) {
  const ids = [];
  const seen = new Set();
  const edges = [];
  const edgeSeen = new Set();
  const addId = (n) => { if (!seen.has(n)) { seen.add(n); ids.push(n); } };
  const addEdge = (a, b) => { const k = a + "→" + b; if (!edgeSeen.has(k)) { edgeSeen.add(k); edges.push({ from: a, to: b }); } };

  text.split("\n").forEach((raw, i) => {
    const line = raw.replace(/#.*$/, "").replace(/\/\/.*$/, "").trim();
    if (!line) return;
    const groups = line.split("->").map((seg) => {
      seg = seg.trim();
      let names = (seg.startsWith("[") && seg.endsWith("]")) ? seg.slice(1, -1).split(",") : [seg];
      names = names.map((s) => s.trim()).filter(Boolean);
      if (!names.length) throw new Error(`Line ${i + 1}: empty node near "${raw.trim()}"`);
      return names;
    });
    groups.flat().forEach(addId);
    for (let g = 0; g < groups.length - 1; g++)
      for (const a of groups[g]) for (const b of groups[g + 1]) addEdge(a, b);
  });
  return { nodeIds: ids, edges };
}

// state -> DSL text (round-trips through parseTopology)
function serialize() {
  const bySource = new Map();
  for (const e of state.edges.values())
    (bySource.get(e.from) || bySource.set(e.from, []).get(e.from)).push(e.to);
  const incoming = new Set([...state.edges.values()].map((e) => e.to));

  const lines = [];
  for (const id of state.nodes.keys()) {
    const tgts = bySource.get(id);
    if (tgts && tgts.length) lines.push(tgts.length === 1 ? `${id} -> ${tgts[0]}` : `${id} -> [${tgts.join(", ")}]`);
  }
  // isolated nodes (no edges at all) -> bare line so they persist through a round-trip
  for (const id of state.nodes.keys())
    if (!bySource.has(id) && !incoming.has(id)) lines.push(id);
  return lines.join("\n");
}

// canvas changed -> rewrite the textarea (programmatic .value does NOT fire 'input', so no loop)
function regenerateDSL() { dslEl.value = serialize(); }

// user typed in textarea -> rebuild graph, preserving positions of nodes that still exist
function applyDSL(text) {
  let topo;
  try { topo = parseTopology(text); } catch (err) { errBox.textContent = "⚠ " + err.message; return; }
  errBox.textContent = "";

  const nextNodes = new Map();
  for (const id of topo.nodeIds) {
    const existing = state.nodes.get(id);
    nextNodes.set(id, existing || { id, type: typeOf(id), x: null, y: null });
  }
  const nextEdges = new Map();
  for (const e of topo.edges) nextEdges.set(e.from + "→" + e.to, { from: e.from, to: e.to });

  state.nodes = nextNodes;
  state.edges = nextEdges;
  if (state.selected && !state.nodes.has(state.selected)) state.selected = null;
  layoutMissing();
  renderAll();
}

/* ---------------- layered auto-layout (longest-path, centered in world) ---------------- */
function layeredPositions(ids, edges) {
  const idSet = new Set(ids);
  const incoming = new Map(ids.map((i) => [i, []]));
  const outgoing = new Map(ids.map((i) => [i, []]));
  for (const e of edges)
    if (idSet.has(e.from) && idSet.has(e.to)) { outgoing.get(e.from).push(e.to); incoming.get(e.to).push(e.from); }

  const indeg = new Map(ids.map((i) => [i, incoming.get(i).length]));
  const q = ids.filter((i) => indeg.get(i) === 0);
  const order = [], seen = new Set(q);
  while (q.length) {
    const id = q.shift(); order.push(id);
    for (const t of outgoing.get(id)) { indeg.set(t, indeg.get(t) - 1); if (indeg.get(t) === 0 && !seen.has(t)) { seen.add(t); q.push(t); } }
  }
  ids.forEach((i) => { if (!seen.has(i)) order.push(i); });

  const layer = new Map(ids.map((i) => [i, 0]));
  order.forEach((id) => { for (const t of outgoing.get(id)) layer.set(t, Math.max(layer.get(t), layer.get(id) + 1)); });

  const buckets = {};
  ids.forEach((i) => (buckets[layer.get(i)] ||= []).push(i));
  const pos = new Map();
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  Object.entries(buckets).forEach(([l, arr]) => {
    const totalH = (arr.length - 1) * ROW_GAP;
    arr.forEach((id, i) => {
      const x = +l * COL_GAP, y = -totalH / 2 + i * ROW_GAP;
      pos.set(id, { x, y });
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    });
  });
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  for (const p of pos.values()) { p.x += WORLD_W / 2 - cx; p.y += WORLD_H / 2 - cy; }
  return pos;
}
function layoutMissing() {
  if (![...state.nodes.values()].some((n) => n.x == null)) return;
  const pos = layeredPositions([...state.nodes.keys()], [...state.edges.values()]);
  for (const n of state.nodes.values()) if (n.x == null) { const p = pos.get(n.id); n.x = p.x; n.y = p.y; }
}
function autoArrange() {
  const pos = layeredPositions([...state.nodes.keys()], [...state.edges.values()]);
  for (const n of state.nodes.values()) { const p = pos.get(n.id); n.x = p.x; n.y = p.y; }
  renderAll();
}

/* ---------------- rendering ---------------- */
function edgeD(a, b) {
  const x1 = a.x + NODE_W / 2, y1 = a.y, x2 = b.x - NODE_W / 2, y2 = b.y;
  const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}
const edgesByFrom = new Map(); // id -> [edge] (rebuilt every render, used by particle engine)

function renderAll() {
  gEdges.innerHTML = ""; gNodes.innerHTML = ""; gTemp.innerHTML = "";
  edgesByFrom.clear();

  for (const e of state.edges.values()) {
    const a = state.nodes.get(e.from), b = state.nodes.get(e.to);
    if (!a || !b) continue;
    const path = el("path", { class: "edge", d: edgeD(a, b) });
    gEdges.appendChild(path);
    e.pathEl = path;
    (edgesByFrom.get(e.from) || edgesByFrom.set(e.from, []).get(e.from)).push(e);
  }

  for (const n of state.nodes.values()) renderNode(n);
  buildLegend();
}

function renderNode(n) {
  const color = TYPES[n.type].color;
  const g = el("g", { class: "node", "data-id": n.id, transform: `translate(${n.x - NODE_W / 2},${n.y - NODE_H / 2})` });
  if (state.selected === n.id) g.classList.add("selected");
  g.appendChild(el("rect", { class: "node-rect", x: 0, y: 0, width: NODE_W, height: NODE_H, rx: 11, stroke: color }));
  g.appendChild(el("rect", { x: 0, y: 0, width: 5, height: NODE_H, rx: 2.5, fill: color }));
  const label = el("text", { class: "node-label", x: NODE_W / 2, y: NODE_H / 2 - 5 }); label.textContent = n.id;
  const type  = el("text", { class: "node-type",  x: NODE_W / 2, y: NODE_H / 2 + 12 }); type.textContent = n.type;
  g.appendChild(label); g.appendChild(type);
  const handle = el("circle", { class: "handle", cx: NODE_W, cy: NODE_H / 2, r: 6, stroke: color });
  g.appendChild(handle);

  g.addEventListener("mousedown", (e) => { if (e.target === handle) startConnect(e, n); else startNodeDrag(e, n); });
  g.addEventListener("dblclick", (e) => { e.stopPropagation(); startRename(n.id); });
  gNodes.appendChild(g);
  n.g = g;
}

function updateIncidentEdges(id) {
  for (const e of state.edges.values()) {
    if ((e.from === id || e.to === id) && e.pathEl)
      e.pathEl.setAttribute("d", edgeD(state.nodes.get(e.from), state.nodes.get(e.to)));
  }
}

function buildLegend() {
  const used = [...new Set([...state.nodes.values()].map((n) => n.type))];
  document.getElementById("legend").innerHTML =
    used.map((t) => `<span><i style="background:${TYPES[t].color}"></i>${t}</span>`).join("") || "&nbsp;empty — double-click to add a node";
}

/* ---------------- interactions ---------------- */
function select(id) {
  state.selected = id;
  for (const n of state.nodes.values()) n.g && n.g.classList.toggle("selected", n.id === id);
}

function startNodeDrag(evt, node) {
  evt.preventDefault();
  const start = toWorld(evt);
  const orig = { x: node.x, y: node.y };
  let moved = false;
  node.g.classList.add("dragging");

  function move(e) {
    const p = toWorld(e);
    const dx = p.x - start.x, dy = p.y - start.y;
    if (!moved && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) moved = true;
    if (moved) {
      node.x = orig.x + dx; node.y = orig.y + dy;
      node.g.setAttribute("transform", `translate(${node.x - NODE_W / 2},${node.y - NODE_H / 2})`);
      updateIncidentEdges(node.id);
    }
  }
  function up() {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
    node.g.classList.remove("dragging");
    select(node.id);
    if (!moved) fireRequest(node.id);   // a press without movement = "send a request from here"
  }
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
}

function startConnect(evt, from) {
  evt.preventDefault(); evt.stopPropagation();
  const a = { x: from.x + NODE_W / 2, y: from.y };
  const temp = el("path", { class: "edge temp", d: "" });
  gTemp.appendChild(temp);

  function move(e) {
    const p = toWorld(e);
    const dx = Math.max(40, Math.abs(p.x - a.x) * 0.5);
    temp.setAttribute("d", `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${p.x - dx} ${p.y}, ${p.x} ${p.y}`);
  }
  function up(e) {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
    temp.remove();
    const target = nodeFromEvent(e);
    if (target && target.id !== from.id) addEdge(from.id, target.id);
  }
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
}

function startRename(id) {
  const n = state.nodes.get(id);
  const fo = el("foreignObject", { x: n.x - NODE_W / 2, y: n.y - 12, width: NODE_W, height: 26 });
  const inp = document.createElement("input");
  inp.className = "rename-input"; inp.value = n.id;
  fo.appendChild(inp); gNodes.appendChild(fo);
  inp.focus(); inp.select();
  let done = false;
  const commit = (keep) => {
    if (done) return; done = true;
    const v = inp.value.trim();
    fo.remove();
    if (keep && v && v !== n.id) renameNode(n.id, v); else renderAll();
  };
  inp.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") commit(true);
    else if (e.key === "Escape") commit(false);
  });
  inp.addEventListener("blur", () => commit(true));
}

/* ---------------- graph mutations (each keeps DSL in sync) ---------------- */
function uniqueName(base) { let id = base, i = 1; while (state.nodes.has(id)) id = base + ++i; return id; }

function addNode(x, y) {
  const id = uniqueName("service");
  state.nodes.set(id, { id, type: typeOf(id), x, y });
  regenerateDSL(); renderAll();
  return id;
}
function addEdge(from, to) {
  const key = from + "→" + to;
  if (state.edges.has(key)) return;
  state.edges.set(key, { from, to });
  regenerateDSL(); renderAll();
}
function deleteNode(id) {
  state.nodes.delete(id);
  for (const [k, e] of state.edges) if (e.from === id || e.to === id) state.edges.delete(k);
  if (state.selected === id) state.selected = null;
  regenerateDSL(); renderAll();
}
function renameNode(oldId, newId) {
  if (!newId || newId === oldId || state.nodes.has(newId)) { renderAll(); return; }
  const order = [...state.nodes.keys()];
  const remapped = new Map();
  for (const id of order) {
    if (id === oldId) { const n = state.nodes.get(oldId); remapped.set(newId, { ...n, id: newId, type: typeOf(newId) }); }
    else remapped.set(id, state.nodes.get(id));
  }
  state.nodes = remapped;
  const nextEdges = new Map();
  for (const e of state.edges.values()) {
    const from = e.from === oldId ? newId : e.from, to = e.to === oldId ? newId : e.to;
    nextEdges.set(from + "→" + to, { from, to });
  }
  state.edges = nextEdges;
  if (state.selected === oldId) state.selected = newId;
  regenerateDSL(); renderAll();
}

/* ---------------- particle flow engine (the heartbeat: getPointAtLength) ---------------- */
const flow = { particles: [], running: false, loopTimer: 0 };

function sourceNodes() {
  const hasIncoming = new Set([...state.edges.values()].map((e) => e.to));
  const srcs = [...state.nodes.values()].filter((n) => !hasIncoming.has(n.id));
  return srcs.length ? srcs : [...state.nodes.values()].slice(0, 1);
}
function spawnParticle(edge, startTime) {
  const path = edge.pathEl; if (!path) return;
  const len = path.getTotalLength();
  const color = TYPES[state.nodes.get(edge.from).type].color;
  const dot = el("circle", { r: 4.5, fill: "#eaf2ff", stroke: color, "stroke-width": 2.5, cx: -99, cy: -99 });
  gParts.appendChild(dot);
  flow.particles.push({ path, len, to: edge.to, start: startTime, dur: (len / speedPxPerSec) * 1000, el: dot });
}
function emitFrom(id, time) { (edgesByFrom.get(id) || []).forEach((e) => spawnParticle(e, time)); }
function pulseNode(id) {
  const n = state.nodes.get(id); if (!n || !n.g) return;
  n.g.classList.add("lit");
  setTimeout(() => n.g && n.g.classList.remove("lit"), 230);
}
function ensureRunning() { if (!flow.running) { flow.running = true; requestAnimationFrame(tick); } }

function tick(now) {
  const arrivals = [];
  for (const p of flow.particles) {
    if (p.done) continue;
    let t = (now - p.start) / p.dur;
    if (t >= 1) { t = 1; p.done = true; p.el.remove(); arrivals.push(p.to); }
    const pt = p.path.getPointAtLength(t * p.len);
    p.el.setAttribute("cx", pt.x); p.el.setAttribute("cy", pt.y);
  }
  arrivals.forEach((to) => { pulseNode(to); emitFrom(to, now); });
  flow.particles = flow.particles.filter((p) => !p.done);
  if (flow.particles.length || flow.loopTimer) requestAnimationFrame(tick);
  else flow.running = false;
}
function fireRequest(id) { pulseNode(id); emitFrom(id, performance.now()); ensureRunning(); }
function sendFromSources() { const now = performance.now(); sourceNodes().forEach((n) => { pulseNode(n.id); emitFrom(n.id, now); }); ensureRunning(); }
function stopFlow() {
  flow.running = false; clearInterval(flow.loopTimer); flow.loopTimer = 0;
  flow.particles.forEach((p) => p.el.remove()); flow.particles = [];
  document.getElementById("loop").checked = false;
}

/* ---------------- wire up UI ---------------- */
let dslTimer = 0;
dslEl.addEventListener("input", () => { clearTimeout(dslTimer); dslTimer = setTimeout(() => applyDSL(dslEl.value), 250); });

svg.addEventListener("dblclick", (e) => {
  if (nodeFromEvent(e)) return;            // node dblclick handles rename
  const p = toWorld(e);
  select(addNode(p.x, p.y));
  startRename(state.selected);
});
svg.addEventListener("mousedown", (e) => { if (!nodeFromEvent(e)) select(null); });

window.addEventListener("keydown", (e) => {
  const editing = document.activeElement === dslEl || (document.activeElement && document.activeElement.classList.contains("rename-input"));
  if (editing) return;
  if ((e.key === "Delete" || e.key === "Backspace") && state.selected) { e.preventDefault(); deleteNode(state.selected); }
});

document.getElementById("send").addEventListener("click", sendFromSources);
document.getElementById("stop").addEventListener("click", stopFlow);
document.getElementById("arrange").addEventListener("click", autoArrange);
document.getElementById("clear").addEventListener("click", () => {
  stopFlow(); state.nodes.clear(); state.edges.clear(); state.selected = null; regenerateDSL(); renderAll();
});
document.getElementById("speed").addEventListener("input", (e) => (speedPxPerSec = +e.target.value));
document.getElementById("loop").addEventListener("change", (e) => {
  if (e.target.checked) { flow.loopTimer = setInterval(sendFromSources, 1600); ensureRunning(); }
  else { clearInterval(flow.loopTimer); flow.loopTimer = 0; }
});

/* ---------------- seed example ---------------- */
dslEl.value =
`# build by clicking, or type here — they stay in sync
client -> gateway
gateway -> [auth, api]
api -> cache
cache -> db
api -> queue
queue -> worker
worker -> db`;
applyDSL(dslEl.value);
