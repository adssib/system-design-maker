# React Engine (Foundation + Flow Interpreter) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild system-design-maker as a React + Vite + TypeScript app where a *structure* file renders a React Flow diagram and a *flow* file plays one ordered, timed animated request trace — with local-only multi-project persistence and zero backend.

**Architecture:** A pure, DOM-free core (parsers, validator, layout, flow interpreter) drives a Zustand store that is the single source of truth. React Flow renders nodes/edges; a custom SVG particle overlay (inside React Flow's `ViewportPortal`) animates compiled `ParticleEvent`s via `getPointAtLength` + `requestAnimationFrame`. Projects persist to IndexedDB; designs share via URL hash.

**Tech Stack:** React 18, Vite, TypeScript, `@xyflow/react` (React Flow), Zustand, `idb-keyval`, Vitest (+ `fake-indexeddb` for storage tests).

## Global Constraints

- **No backend.** No server code, no auth service, no network calls. Everything runs client-side and deploys as a static Vite build.
- **TypeScript** for all source; `strict: true` in tsconfig.
- **Node types** are a fixed enum of six categories: `client | lb | service | cache | queue | db`. Default category is `service`.
- **Edge identity** is always `` `${from}->${to}` `` via the shared `edgeKey(from, to)` helper. Never hand-build edge ids.
- **Flow semantics:** line order = time order. `->` call (advance clock), `<->` roundtrip (out then back, advance by both legs), `~>` async (spawn, do NOT advance clock).
- **No-feedback-loop invariant:** programmatically setting editor text must not re-trigger the user-edit reparse path (canvas mutations regenerate text from the model directly).
- **Persistence:** projects in IndexedDB only. Node positions are a sidecar in the `Project` record, never embedded in DSL text.
- One flow per project. No scrubber, no `par:`/`wait`, no branch picking, no catalog/icons, no export (all deferred).
- Commit after every task.

---

## File Structure

```
package.json, vite.config.ts, tsconfig.json, index.html, vitest.config.ts
src/
  main.tsx                 # React entry
  App.tsx                  # layout: sidebar + canvas + transport; boot logic
  app.css                  # global styles (ported palette from prototype)
  types.ts                 # shared types + edgeKey helper
  engine/
    typeInference.ts       # TYPES + typeOf (ported)
    layout.ts              # layeredPositions (ported)
    interpreter.ts         # compileFlow (the heartbeat replacement)
    Particles.tsx          # SVG particle overlay (ViewportPortal)
  dsl/
    structure.ts           # parseStructure
    serialize.ts           # serializeStructure
    flow.ts                # parseFlow
    validate.ts            # validate
  store.ts                 # Zustand store (single source of truth)
  canvas/
    Canvas.tsx             # React Flow wrapper
    SystemNode.tsx         # custom node renderer
  editor/
    Editors.tsx            # tabbed Structure/Flow editors
  projects/
    storage.ts             # idb-keyval CRUD
  share/
    url.ts                 # encode/decode design to URL hash
  seed.ts                  # seed example project
```

Test files are colocated as `*.test.ts` next to the module they cover.

---

### Task 1: Scaffold the Vite + React + TS project with Vitest

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `vitest.config.ts`, `src/main.tsx`, `src/App.tsx`, `src/app.css`
- Create: `src/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a runnable dev server (`npm run dev`) and a passing test runner (`npm test`).

- [ ] **Step 1: Initialize package.json**

Replace the existing `package.json` with:

```json
{
  "name": "system-design-maker",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Diagram-as-code, but the request actually moves.",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@xyflow/react": "^12.3.0",
    "idb-keyval": "^6.2.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "fake-indexeddb": "^6.0.0",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}
```

- [ ] **Step 2: Add tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Add vite.config.ts and vitest.config.ts**

`vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()] });
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { globals: true, environment: "jsdom" },
});
```

- [ ] **Step 4: Add index.html, main.tsx, App.tsx, app.css**

`index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>system-design-maker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@xyflow/react/dist/style.css";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`src/App.tsx`:
```tsx
export default function App() {
  return <div className="app">system-design-maker</div>;
}
```

`src/app.css`:
```css
:root { --bg: #0e1422; --panel: #131a2b; --text: #e6edf7; --muted: #8aa0c0; }
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body { background: var(--bg); color: var(--text); font: 14px/1.4 ui-sans-serif, system-ui, sans-serif; }
.app { display: flex; height: 100%; }
```

- [ ] **Step 5: Write the smoke test**

`src/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("toolchain", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Install and verify**

Run: `npm install && npm test`
Expected: install succeeds; 1 test passes.
Run: `npm run dev` then open the printed URL.
Expected: page shows "system-design-maker".

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite + react + ts + vitest"
```

---

### Task 2: Shared types and edgeKey helper

**Files:**
- Create: `src/types.ts`
- Test: `src/types.test.ts`

**Interfaces:**
- Produces:
  - `type NodeType = "client" | "lb" | "service" | "cache" | "queue" | "db"`
  - `interface NodeModel { id: string; type: NodeType }`
  - `interface EdgeModel { from: string; to: string }`
  - `interface ParseError { line: number; message: string }`
  - `interface StructureParseResult { nodes: NodeModel[]; edges: EdgeModel[]; errors: ParseError[] }`
  - `type StepKind = "call" | "roundtrip" | "async"`
  - `interface FlowStep { from: string; to: string; kind: StepKind; label?: string; line: number }`
  - `interface FlowParseResult { name: string | null; steps: FlowStep[]; errors: ParseError[] }`
  - `interface ValidationError { line: number; message: string }`
  - `type ParticleDir = "forward" | "back"`
  - `interface ParticleEvent { edgeId: string; from: string; to: string; dir: ParticleDir; startMs: number; durMs: number; label?: string }`
  - `interface Project { id: string; name: string; structureText: string; flowText: string; positions: Record<string, { x: number; y: number }>; updatedAt: number }`
  - `const edgeKey: (from: string, to: string) => string`

- [ ] **Step 1: Write the failing test**

`src/types.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { edgeKey } from "./types";

describe("edgeKey", () => {
  it("joins from and to with an arrow", () => {
    expect(edgeKey("api", "db")).toBe("api->db");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types.test.ts`
Expected: FAIL — cannot find module `./types` / `edgeKey` is not exported.

- [ ] **Step 3: Write the implementation**

`src/types.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/types.test.ts
git commit -m "feat: shared types and edgeKey helper"
```

---

### Task 3: Type inference (ported from prototype)

**Files:**
- Create: `src/engine/typeInference.ts`
- Test: `src/engine/typeInference.test.ts`

**Interfaces:**
- Consumes: `NodeType` from `../types`.
- Produces:
  - `const TYPES: Record<NodeType, { color: string; match: RegExp }>`
  - `function typeOf(name: string): NodeType`

- [ ] **Step 1: Write the failing test**

`src/engine/typeInference.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { typeOf, TYPES } from "./typeInference";

describe("typeOf", () => {
  it("infers cache from redis", () => expect(typeOf("redis")).toBe("cache"));
  it("infers db from postgres", () => expect(typeOf("postgres")).toBe("db"));
  it("infers lb from gateway", () => expect(typeOf("api-gateway")).toBe("lb"));
  it("infers queue from sqs", () => expect(typeOf("orders-sqs")).toBe("queue"));
  it("infers client from user", () => expect(typeOf("user")).toBe("client"));
  it("defaults to service", () => expect(typeOf("widgetizer")).toBe("service"));
  it("does not let the service regex pre-empt specific types", () =>
    expect(typeOf("cache")).toBe("cache"));
});

describe("TYPES", () => {
  it("has a color for every category", () => {
    for (const t of ["client", "lb", "service", "cache", "queue", "db"] as const) {
      expect(TYPES[t].color).toMatch(/^#/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/typeInference.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/engine/typeInference.ts`:
```ts
import type { NodeType } from "../types";

export const TYPES: Record<NodeType, { color: string; match: RegExp }> = {
  client:  { color: "#9b8cff", match: /^(client|user|browser|mobile|app|frontend)/i },
  lb:      { color: "#ffb454", match: /(lb|balancer|gateway|proxy|ingress|cdn|nginx|envoy)/i },
  service: { color: "#5b9dff", match: /(api|service|server|svc|worker|node|micro|backend|fn|lambda)/i },
  cache:   { color: "#ff7eb6", match: /(cache|redis|memcache)/i },
  queue:   { color: "#36e0c0", match: /(queue|kafka|rabbit|sqs|pubsub|stream|topic|bus)/i },
  db:      { color: "#46d369", match: /(db|database|sql|postgres|mysql|mongo|store|dynamo|cassandra|s3|blob)/i },
};

const ORDER: NodeType[] = ["client", "lb", "cache", "queue", "db", "service"];

export function typeOf(name: string): NodeType {
  for (const t of ORDER) {
    if (t !== "service" && TYPES[t].match.test(name)) return t;
  }
  return "service";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/typeInference.test.ts`
Expected: PASS (all 8).

- [ ] **Step 5: Commit**

```bash
git add src/engine/typeInference.ts src/engine/typeInference.test.ts
git commit -m "feat: port node type inference"
```

---

### Task 4: Structure parser

**Files:**
- Create: `src/dsl/structure.ts`
- Test: `src/dsl/structure.test.ts`

**Interfaces:**
- Consumes: `typeOf` from `../engine/typeInference`; types from `../types`.
- Produces: `function parseStructure(text: string): StructureParseResult`

Behavior:
- Strips `#...` and `//...` comments; ignores blank lines.
- A line with no `->` is a declaration: `id : type` sets the node's category to `typeOf(type)`; a bare `id` declares a node (category `typeOf(id)`).
- A line with `->` is a connection chain: segments split on `->`; a segment is either `name` or `[a, b, c]` (fan-out). Consecutive groups produce the cartesian product of edges. Names appearing here are declared if new (category `typeOf(name)`).
- An explicit `: type` annotation anywhere wins over name inference for that node.
- Empty node name (e.g. `a -> -> b`, or `[]`) → a `ParseError` with the 1-based line number; the line is skipped, parsing continues.

- [ ] **Step 1: Write the failing test**

`src/dsl/structure.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseStructure } from "./structure";

describe("parseStructure", () => {
  it("parses a simple chain", () => {
    const r = parseStructure("client -> gateway -> api");
    expect(r.errors).toEqual([]);
    expect(r.nodes.map((n) => n.id)).toEqual(["client", "gateway", "api"]);
    expect(r.edges).toEqual([
      { from: "client", to: "gateway" },
      { from: "gateway", to: "api" },
    ]);
  });

  it("expands fan-out", () => {
    const r = parseStructure("gateway -> [auth, api]");
    expect(r.edges).toEqual([
      { from: "gateway", to: "auth" },
      { from: "gateway", to: "api" },
    ]);
  });

  it("infers types from names", () => {
    const r = parseStructure("api -> cache");
    expect(r.nodes.find((n) => n.id === "cache")!.type).toBe("cache");
    expect(r.nodes.find((n) => n.id === "api")!.type).toBe("service");
  });

  it("honors explicit type annotations", () => {
    const r = parseStructure("primary : postgres\napi -> primary");
    expect(r.nodes.find((n) => n.id === "primary")!.type).toBe("db");
  });

  it("declares isolated bare nodes", () => {
    const r = parseStructure("loner");
    expect(r.nodes.map((n) => n.id)).toEqual(["loner"]);
    expect(r.edges).toEqual([]);
  });

  it("ignores comments and blanks", () => {
    const r = parseStructure("# title\n\nclient -> api  // hop\n");
    expect(r.errors).toEqual([]);
    expect(r.edges).toEqual([{ from: "client", to: "api" }]);
  });

  it("dedupes repeated edges and nodes", () => {
    const r = parseStructure("a -> b\na -> b");
    expect(r.edges).toEqual([{ from: "a", to: "b" }]);
    expect(r.nodes).toHaveLength(2);
  });

  it("reports empty node names with a line number", () => {
    const r = parseStructure("a -> \n -> b");
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0].line).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/dsl/structure.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/dsl/structure.ts`:
```ts
import type { StructureParseResult, ParseError, NodeType } from "../types";
import { typeOf } from "../engine/typeInference";

function names(segment: string): string[] {
  const seg = segment.trim();
  const inner = seg.startsWith("[") && seg.endsWith("]") ? seg.slice(1, -1) : seg;
  return inner.split(",").map((s) => s.trim()).filter(Boolean);
}

export function parseStructure(text: string): StructureParseResult {
  const order: string[] = [];
  const explicit = new Map<string, NodeType>();
  const seen = new Set<string>();
  const edges: { from: string; to: string }[] = [];
  const edgeSeen = new Set<string>();
  const errors: ParseError[] = [];

  const declare = (id: string) => {
    if (!seen.has(id)) { seen.add(id); order.push(id); }
  };
  const addEdge = (a: string, b: string) => {
    const k = `${a}->${b}`;
    if (!edgeSeen.has(k)) { edgeSeen.add(k); edges.push({ from: a, to: b }); }
  };

  text.split("\n").forEach((raw, i) => {
    const line = raw.replace(/#.*$/, "").replace(/\/\/.*$/, "").trim();
    if (!line) return;
    const ln = i + 1;

    if (!line.includes("->")) {
      const [lhs, rhs] = line.split(":");
      const id = lhs.trim();
      if (!id) { errors.push({ line: ln, message: "missing node name" }); return; }
      declare(id);
      if (rhs !== undefined && rhs.trim()) explicit.set(id, typeOf(rhs.trim()));
      return;
    }

    const groups = line.split("->").map(names);
    if (groups.some((g) => g.length === 0)) {
      errors.push({ line: ln, message: `empty node near "${line}"` });
      return;
    }
    groups.flat().forEach(declare);
    for (let g = 0; g < groups.length - 1; g++)
      for (const a of groups[g]) for (const b of groups[g + 1]) addEdge(a, b);
  });

  const nodes = order.map((id) => ({ id, type: explicit.get(id) ?? typeOf(id) }));
  return { nodes, edges, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/dsl/structure.test.ts`
Expected: PASS (all 8).

- [ ] **Step 5: Commit**

```bash
git add src/dsl/structure.ts src/dsl/structure.test.ts
git commit -m "feat: structure DSL parser with type annotations"
```

---

### Task 5: Structure serializer (canvas → text)

**Files:**
- Create: `src/dsl/serialize.ts`
- Test: `src/dsl/serialize.test.ts`

**Interfaces:**
- Consumes: `NodeModel`, `EdgeModel` from `../types`; `typeOf` from `../engine/typeInference`.
- Produces: `function serializeStructure(nodes: NodeModel[], edges: EdgeModel[]): string`

Behavior:
- Emits a `id : type` declaration line for any node whose `type` differs from `typeOf(id)` (preserves explicit categories across a round-trip).
- Emits connection lines grouped by source: single target `a -> b`, multiple `a -> [b, c]`.
- Emits a bare line for any node with no incident edges (so isolated nodes survive).
- Round-trips: `parseStructure(serializeStructure(nodes, edges))` reproduces the same nodes (ids + types) and edges.

- [ ] **Step 1: Write the failing test**

`src/dsl/serialize.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { serializeStructure } from "./serialize";
import { parseStructure } from "./structure";
import type { NodeModel, EdgeModel } from "../types";

describe("serializeStructure", () => {
  it("groups multiple targets into fan-out", () => {
    const nodes: NodeModel[] = [
      { id: "gateway", type: "lb" },
      { id: "auth", type: "service" },
      { id: "api", type: "service" },
    ];
    const edges: EdgeModel[] = [
      { from: "gateway", to: "auth" },
      { from: "gateway", to: "api" },
    ];
    expect(serializeStructure(nodes, edges)).toContain("gateway -> [auth, api]");
  });

  it("emits an annotation when the type diverges from name inference", () => {
    const nodes: NodeModel[] = [{ id: "primary", type: "db" }];
    expect(serializeStructure(nodes, [])).toContain("primary : db");
  });

  it("round-trips through parseStructure", () => {
    const nodes: NodeModel[] = [
      { id: "client", type: "client" },
      { id: "api", type: "service" },
      { id: "primary", type: "db" },
      { id: "loner", type: "service" },
    ];
    const edges: EdgeModel[] = [
      { from: "client", to: "api" },
      { from: "api", to: "primary" },
    ];
    const text = serializeStructure(nodes, edges);
    const r = parseStructure(text);
    expect(r.errors).toEqual([]);
    expect(new Set(r.nodes.map((n) => n.id))).toEqual(
      new Set(["client", "api", "primary", "loner"])
    );
    expect(r.nodes.find((n) => n.id === "primary")!.type).toBe("db");
    expect(r.edges).toEqual(edges);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/dsl/serialize.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/dsl/serialize.ts`:
```ts
import type { NodeModel, EdgeModel } from "../types";
import { typeOf } from "../engine/typeInference";

export function serializeStructure(nodes: NodeModel[], edges: EdgeModel[]): string {
  const lines: string[] = [];

  for (const n of nodes) {
    if (n.type !== typeOf(n.id)) lines.push(`${n.id} : ${n.type}`);
  }

  const bySource = new Map<string, string[]>();
  for (const e of edges) {
    const list = bySource.get(e.from) ?? bySource.set(e.from, []).get(e.from)!;
    list.push(e.to);
  }
  const incoming = new Set(edges.map((e) => e.to));

  for (const n of nodes) {
    const tgts = bySource.get(n.id);
    if (tgts && tgts.length)
      lines.push(tgts.length === 1 ? `${n.id} -> ${tgts[0]}` : `${n.id} -> [${tgts.join(", ")}]`);
  }
  for (const n of nodes) {
    if (!bySource.has(n.id) && !incoming.has(n.id)) lines.push(n.id);
  }
  return lines.join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/dsl/serialize.test.ts`
Expected: PASS (all 3).

- [ ] **Step 5: Commit**

```bash
git add src/dsl/serialize.ts src/dsl/serialize.test.ts
git commit -m "feat: structure serializer with round-trip fidelity"
```

---

### Task 6: Flow parser

**Files:**
- Create: `src/dsl/flow.ts`
- Test: `src/dsl/flow.test.ts`

**Interfaces:**
- Consumes: `FlowParseResult`, `FlowStep`, `StepKind`, `ParseError` from `../types`.
- Produces: `function parseFlow(text: string): FlowParseResult`

Behavior:
- Strips `#`/`//` comments and blank lines.
- A header line matches `flow "NAME":` and sets `name` (first header wins).
- A step line matches `LHS VERB RHS (LABEL)?` where VERB ∈ `<->`, `~>`, `->` (check longest/most-specific first). `kind`: `->`→`call`, `<->`→`roundtrip`, `~>`→`async`. `from`/`to` trimmed; optional trailing `(label)`.
- Any non-blank, non-comment line that is neither a header nor a valid step → `ParseError` with the line number; skipped.

- [ ] **Step 1: Write the failing test**

`src/dsl/flow.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseFlow } from "./flow";

describe("parseFlow", () => {
  it("reads the flow name", () => {
    expect(parseFlow('flow "GET /profile":').name).toBe("GET /profile");
  });

  it("parses the three verbs in order", () => {
    const r = parseFlow(
      'flow "x":\n  a -> b\n  b <-> c\n  c ~> d'
    );
    expect(r.errors).toEqual([]);
    expect(r.steps.map((s) => s.kind)).toEqual(["call", "roundtrip", "async"]);
    expect(r.steps[0]).toMatchObject({ from: "a", to: "b", line: 2 });
  });

  it("captures a label", () => {
    const r = parseFlow('flow "x":\n  api -> cache (miss)');
    expect(r.steps[0]).toMatchObject({ from: "api", to: "cache", label: "miss" });
  });

  it("does not mistake <-> for ->", () => {
    const r = parseFlow('flow "x":\n  a <-> b');
    expect(r.steps[0].kind).toBe("roundtrip");
    expect(r.steps[0].to).toBe("b");
  });

  it("reports malformed lines with a line number", () => {
    const r = parseFlow('flow "x":\n  this is not a step');
    expect(r.errors[0].line).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/dsl/flow.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/dsl/flow.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/dsl/flow.test.ts`
Expected: PASS (all 5).

- [ ] **Step 5: Commit**

```bash
git add src/dsl/flow.ts src/dsl/flow.test.ts
git commit -m "feat: flow DSL parser (->, <->, ~>, labels)"
```

---

### Task 7: Cross-file validator

**Files:**
- Create: `src/dsl/validate.ts`
- Test: `src/dsl/validate.test.ts`

**Interfaces:**
- Consumes: `StructureParseResult`, `FlowParseResult`, `ValidationError` from `../types`; `edgeKey` from `../types`.
- Produces: `function validate(structure: StructureParseResult, flow: FlowParseResult): ValidationError[]`

Behavior:
- Build a set of `edgeKey(from, to)` from structure edges.
- Each flow step must have a matching structure edge `from -> to`. `roundtrip` reuses the same edge, so only `from -> to` must exist. If missing → `ValidationError` with the step's line number.

- [ ] **Step 1: Write the failing test**

`src/dsl/validate.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { validate } from "./validate";
import { parseStructure } from "./structure";
import { parseFlow } from "./flow";

describe("validate", () => {
  it("passes when every hop matches a structure edge", () => {
    const s = parseStructure("client -> api\napi -> db");
    const f = parseFlow('flow "x":\n  client -> api\n  api <-> db');
    expect(validate(s, f)).toEqual([]);
  });

  it("flags a hop with no matching structure edge, with its line number", () => {
    const s = parseStructure("client -> api");
    const f = parseFlow('flow "x":\n  client -> api\n  api -> db');
    const errs = validate(s, f);
    expect(errs).toHaveLength(1);
    expect(errs[0].line).toBe(3);
    expect(errs[0].message).toContain("api");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/dsl/validate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/dsl/validate.ts`:
```ts
import type { StructureParseResult, FlowParseResult, ValidationError } from "../types";
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/dsl/validate.test.ts`
Expected: PASS (both).

- [ ] **Step 5: Commit**

```bash
git add src/dsl/validate.ts src/dsl/validate.test.ts
git commit -m "feat: validate flow hops against structure edges"
```

---

### Task 8: Layered auto-layout (ported)

**Files:**
- Create: `src/engine/layout.ts`
- Test: `src/engine/layout.test.ts`

**Interfaces:**
- Consumes: `EdgeModel` from `../types`.
- Produces:
  - `const WORLD = { W: 1600, H: 900 }`
  - `const GAP = { COL: 230, ROW: 110 }`
  - `function layeredPositions(ids: string[], edges: EdgeModel[]): Record<string, { x: number; y: number }>`

Behavior: Kahn topological order → longest-path layering → column = layer × COL, rows stacked by ROW, whole graph centered in WORLD. Disconnected/cyclic leftovers fall to the end of the order.

- [ ] **Step 1: Write the failing test**

`src/engine/layout.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { layeredPositions } from "./layout";

describe("layeredPositions", () => {
  it("places later nodes in the chain further right", () => {
    const pos = layeredPositions(
      ["a", "b", "c"],
      [{ from: "a", to: "b" }, { from: "b", to: "c" }]
    );
    expect(pos.a.x).toBeLessThan(pos.b.x);
    expect(pos.b.x).toBeLessThan(pos.c.x);
  });

  it("puts siblings in the same column at different rows", () => {
    const pos = layeredPositions(
      ["a", "b", "c"],
      [{ from: "a", to: "b" }, { from: "a", to: "c" }]
    );
    expect(pos.b.x).toBe(pos.c.x);
    expect(pos.b.y).not.toBe(pos.c.y);
  });

  it("returns a position for every id", () => {
    const pos = layeredPositions(["x", "y"], []);
    expect(Object.keys(pos).sort()).toEqual(["x", "y"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/layout.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/engine/layout.ts`:
```ts
import type { EdgeModel } from "../types";

export const WORLD = { W: 1600, H: 900 };
export const GAP = { COL: 230, ROW: 110 };

export function layeredPositions(
  ids: string[],
  edges: EdgeModel[]
): Record<string, { x: number; y: number }> {
  const idSet = new Set(ids);
  const incoming = new Map(ids.map((i) => [i, [] as string[]]));
  const outgoing = new Map(ids.map((i) => [i, [] as string[]]));
  for (const e of edges) {
    if (idSet.has(e.from) && idSet.has(e.to)) {
      outgoing.get(e.from)!.push(e.to);
      incoming.get(e.to)!.push(e.from);
    }
  }

  const indeg = new Map(ids.map((i) => [i, incoming.get(i)!.length]));
  const q = ids.filter((i) => indeg.get(i) === 0);
  const order: string[] = [];
  const seen = new Set(q);
  while (q.length) {
    const id = q.shift()!;
    order.push(id);
    for (const t of outgoing.get(id)!) {
      indeg.set(t, indeg.get(t)! - 1);
      if (indeg.get(t) === 0 && !seen.has(t)) { seen.add(t); q.push(t); }
    }
  }
  ids.forEach((i) => { if (!seen.has(i)) order.push(i); });

  const layer = new Map(ids.map((i) => [i, 0]));
  order.forEach((id) => {
    for (const t of outgoing.get(id)!) layer.set(t, Math.max(layer.get(t)!, layer.get(id)! + 1));
  });

  const buckets: Record<number, string[]> = {};
  ids.forEach((i) => (buckets[layer.get(i)!] ||= []).push(i));

  const pos: Record<string, { x: number; y: number }> = {};
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [l, arr] of Object.entries(buckets)) {
    const totalH = (arr.length - 1) * GAP.ROW;
    arr.forEach((id, i) => {
      const x = Number(l) * GAP.COL;
      const y = -totalH / 2 + i * GAP.ROW;
      pos[id] = { x, y };
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    });
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  for (const id of Object.keys(pos)) {
    pos[id].x += WORLD.W / 2 - cx;
    pos[id].y += WORLD.H / 2 - cy;
  }
  return pos;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/layout.test.ts`
Expected: PASS (all 3).

- [ ] **Step 5: Commit**

```bash
git add src/engine/layout.ts src/engine/layout.test.ts
git commit -m "feat: port layered auto-layout"
```

---

### Task 9: Flow interpreter (the heartbeat)

**Files:**
- Create: `src/engine/interpreter.ts`
- Test: `src/engine/interpreter.test.ts`

**Interfaces:**
- Consumes: `FlowStep`, `ParticleEvent` from `../types`; `edgeKey` from `../types`.
- Produces: `function compileFlow(steps: FlowStep[], durationFor: (from: string, to: string) => number): ParticleEvent[]`

Behavior (line order = time order, clock starts at 0):
- `call`: one `forward` event at `clock`; `clock += dur`.
- `roundtrip`: a `forward` event at `clock`, then a `back` event (from/to swapped, same `edgeId`) at `clock + dur`; `clock += 2 * dur`.
- `async`: one `forward` event at `clock`; clock unchanged.
- `label` is copied onto the forward event (and the back event for roundtrips).

- [ ] **Step 1: Write the failing test**

`src/engine/interpreter.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { compileFlow } from "./interpreter";
import type { FlowStep } from "../types";

const step = (from: string, to: string, kind: FlowStep["kind"], line = 1, label?: string): FlowStep =>
  ({ from, to, kind, line, label });
const fixed = () => 100;

describe("compileFlow", () => {
  it("advances the clock for sequential calls", () => {
    const ev = compileFlow([step("a", "b", "call"), step("b", "c", "call")], fixed);
    expect(ev.map((e) => e.startMs)).toEqual([0, 100]);
    expect(ev[0].edgeId).toBe("a->b");
  });

  it("emits out then back for a roundtrip and advances by both legs", () => {
    const ev = compileFlow([step("a", "b", "roundtrip"), step("a", "c", "call")], fixed);
    expect(ev[0]).toMatchObject({ edgeId: "a->b", dir: "forward", startMs: 0, durMs: 100 });
    expect(ev[1]).toMatchObject({ edgeId: "a->b", dir: "back", from: "b", to: "a", startMs: 100 });
    // the next call starts after the full round-trip (200), not after one leg
    expect(ev[2].startMs).toBe(200);
  });

  it("does NOT advance the clock for async", () => {
    const ev = compileFlow([step("a", "b", "async"), step("a", "c", "call")], fixed);
    expect(ev[0]).toMatchObject({ edgeId: "a->b", dir: "forward", startMs: 0 });
    expect(ev[1].startMs).toBe(0); // async did not push the clock
  });

  it("carries labels onto events", () => {
    const ev = compileFlow([step("api", "cache", "call", 1, "miss")], fixed);
    expect(ev[0].label).toBe("miss");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/interpreter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/engine/interpreter.ts`:
```ts
import type { FlowStep, ParticleEvent } from "../types";
import { edgeKey } from "../types";

export function compileFlow(
  steps: FlowStep[],
  durationFor: (from: string, to: string) => number
): ParticleEvent[] {
  const events: ParticleEvent[] = [];
  let clock = 0;

  for (const s of steps) {
    const id = edgeKey(s.from, s.to);
    const dur = durationFor(s.from, s.to);

    if (s.kind === "call") {
      events.push({ edgeId: id, from: s.from, to: s.to, dir: "forward", startMs: clock, durMs: dur, label: s.label });
      clock += dur;
    } else if (s.kind === "roundtrip") {
      events.push({ edgeId: id, from: s.from, to: s.to, dir: "forward", startMs: clock, durMs: dur, label: s.label });
      events.push({ edgeId: id, from: s.to, to: s.from, dir: "back", startMs: clock + dur, durMs: dur, label: s.label });
      clock += dur * 2;
    } else {
      // async: spawn but do not advance the blocking clock
      events.push({ edgeId: id, from: s.from, to: s.to, dir: "forward", startMs: clock, durMs: dur, label: s.label });
    }
  }
  return events;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/interpreter.test.ts`
Expected: PASS (all 4).

- [ ] **Step 5: Commit**

```bash
git add src/engine/interpreter.ts src/engine/interpreter.test.ts
git commit -m "feat: flow interpreter compiling timed particle events"
```

---

### Task 10: Zustand store (single source of truth)

**Files:**
- Create: `src/store.ts`
- Test: `src/store.test.ts`

**Interfaces:**
- Consumes: parsers, serializer, validator, `layeredPositions`, `typeOf`, types.
- Produces a Zustand vanilla store via `createAppStore()` returning state with:
  - data: `structureText`, `flowText`, `positions`, `selection`, `structure` (`StructureParseResult`), `flow` (`FlowParseResult`), `validation` (`ValidationError[]`)
  - actions: `setStructureText(t)`, `setFlowText(t)`, `addNode(x,y): string`, `addEdge(from,to)`, `deleteNode(id)`, `renameNode(old,next)`, `moveNode(id,x,y)`, `select(id|null)`, `autoArrange()`, `load(structureText, flowText, positions)`
- Also export `useAppStore` (React hook bound to a module-level store) for components.

Behavior notes:
- `setStructureText` reparses, runs `layoutMissing` (assign layout positions only to nodes lacking one), re-validates.
- Canvas mutations operate on the parsed `structure` model, then set `structureText = serializeStructure(...)` WITHOUT going through `setStructureText`'s "user typed" path — they set `structure` directly and re-validate (preserves the no-feedback-loop invariant).
- `addNode` creates a unique id `service`, `service2`, … and returns it.

- [ ] **Step 1: Write the failing test**

`src/store.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createAppStore } from "./store";

let store: ReturnType<typeof createAppStore>;
beforeEach(() => { store = createAppStore(); });

describe("app store", () => {
  it("parses structure text and lays out new nodes", () => {
    store.getState().setStructureText("client -> api");
    const s = store.getState();
    expect(s.structure.edges).toEqual([{ from: "client", to: "api" }]);
    expect(s.positions.client).toBeDefined();
    expect(s.positions.api).toBeDefined();
  });

  it("adds an edge from the canvas and regenerates text", () => {
    store.getState().setStructureText("a -> b\nc");
    store.getState().addEdge("b", "c");
    const s = store.getState();
    expect(s.structure.edges).toContainEqual({ from: "b", to: "c" });
    expect(s.structureText).toContain("b -> c");
  });

  it("preserves positions of surviving nodes when text changes", () => {
    store.getState().setStructureText("a -> b");
    store.getState().moveNode("a", 10, 20);
    store.getState().setStructureText("a -> b\nb -> c");
    expect(store.getState().positions.a).toEqual({ x: 10, y: 20 });
  });

  it("renames a node across nodes, edges, positions and text", () => {
    store.getState().setStructureText("a -> b");
    store.getState().moveNode("a", 5, 5);
    store.getState().renameNode("a", "front");
    const s = store.getState();
    expect(s.structure.nodes.map((n) => n.id)).toContain("front");
    expect(s.structure.edges).toContainEqual({ from: "front", to: "b" });
    expect(s.positions.front).toEqual({ x: 5, y: 5 });
    expect(s.structureText).toContain("front -> b");
  });

  it("validates the flow against the structure", () => {
    store.getState().setStructureText("a -> b");
    store.getState().setFlowText('flow "x":\n  a -> z');
    expect(store.getState().validation).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/store.ts`:
```ts
import { createStore, useStore } from "zustand";
import type {
  StructureParseResult, FlowParseResult, ValidationError, NodeModel, EdgeModel,
} from "./types";
import { parseStructure } from "./dsl/structure";
import { serializeStructure } from "./dsl/serialize";
import { parseFlow } from "./dsl/flow";
import { validate } from "./dsl/validate";
import { layeredPositions } from "./engine/layout";
import { typeOf } from "./engine/typeInference";

export interface AppState {
  structureText: string;
  flowText: string;
  positions: Record<string, { x: number; y: number }>;
  selection: string | null;
  structure: StructureParseResult;
  flow: FlowParseResult;
  validation: ValidationError[];

  setStructureText: (t: string) => void;
  setFlowText: (t: string) => void;
  addNode: (x: number, y: number) => string;
  addEdge: (from: string, to: string) => void;
  deleteNode: (id: string) => void;
  renameNode: (oldId: string, nextId: string) => void;
  moveNode: (id: string, x: number, y: number) => void;
  select: (id: string | null) => void;
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
      const laid = missing.length ? layeredPositions(nodes.map((n) => n.id), edges) : {};
      for (const n of nodes) next[n.id] = prev[n.id] ?? laid[n.id];
      return next;
    };

    const revalidate = (structure: StructureParseResult, flow: FlowParseResult) =>
      validate(structure, flow);

    // apply a mutated structure model (canvas path): regenerate text, keep no-loop invariant
    const applyModel = (nodes: NodeModel[], edges: EdgeModel[]) => {
      const structure: StructureParseResult = { nodes, edges, errors: [] };
      const positions = layoutMissing(nodes, edges, get().positions);
      const structureText = serializeStructure(nodes, edges);
      set({ structure, structureText, positions, validation: revalidate(structure, get().flow) });
    };

    return {
      structureText: "",
      flowText: "",
      positions: {},
      selection: null,
      structure: empty(),
      flow: { name: null, steps: [], errors: [] },
      validation: [],

      setStructureText: (t) => {
        const structure = parseStructure(t);
        const positions = layoutMissing(structure.nodes, structure.edges, get().positions);
        set({ structureText: t, structure, positions, validation: revalidate(structure, get().flow) });
      },

      setFlowText: (t) => {
        const flow = parseFlow(t);
        set({ flowText: t, flow, validation: revalidate(get().structure, flow) });
      },

      addNode: (x, y) => {
        const taken = new Set(get().structure.nodes.map((n) => n.id));
        let id = "service", i = 1;
        while (taken.has(id)) id = `service${++i}`;
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

      autoArrange: () => {
        const { nodes, edges } = get().structure;
        set({ positions: layeredPositions(nodes.map((n) => n.id), edges) });
      },

      load: (structureText, flowText, positions) => {
        const structure = parseStructure(structureText);
        const flow = parseFlow(flowText);
        const filled = layoutMissing(structure.nodes, structure.edges, positions);
        set({ structureText, flowText, positions: filled, structure, flow, validation: validate(structure, flow), selection: null });
      },
    };
  });
}

export const appStore = createAppStore();
export const useAppStore = <T>(selector: (s: AppState) => T): T => useStore(appStore, selector);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store.test.ts`
Expected: PASS (all 5).

- [ ] **Step 5: Commit**

```bash
git add src/store.ts src/store.test.ts
git commit -m "feat: zustand store as single source of truth"
```

---

### Task 11: IndexedDB project storage

**Files:**
- Create: `src/projects/storage.ts`
- Test: `src/projects/storage.test.ts`

**Interfaces:**
- Consumes: `Project` from `../types`; `get`, `set` from `idb-keyval`.
- Produces:
  - `function newProject(name?: string): Project`
  - `async function listProjects(): Promise<Project[]>`
  - `async function saveProject(p: Project): Promise<void>`
  - `async function deleteProject(id: string): Promise<void>`
  - `async function getLastProjectId(): Promise<string | null>`
  - `async function setLastProjectId(id: string): Promise<void>`

Storage model: one key `"sdm:projects"` holds `Project[]`; one key `"sdm:last"` holds the last-open id.

- [ ] **Step 1: Write the failing test**

`src/projects/storage.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { clear } from "idb-keyval";
import { newProject, listProjects, saveProject, deleteProject, getLastProjectId, setLastProjectId } from "./storage";

beforeEach(async () => { await clear(); });

describe("project storage", () => {
  it("saves and lists projects", async () => {
    const p = newProject("first");
    await saveProject(p);
    const all = await listProjects();
    expect(all.map((x) => x.name)).toEqual(["first"]);
  });

  it("updates an existing project in place", async () => {
    const p = newProject("first");
    await saveProject(p);
    await saveProject({ ...p, name: "renamed" });
    const all = await listProjects();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("renamed");
  });

  it("deletes a project", async () => {
    const p = newProject("first");
    await saveProject(p);
    await deleteProject(p.id);
    expect(await listProjects()).toEqual([]);
  });

  it("tracks the last opened project id", async () => {
    await setLastProjectId("abc");
    expect(await getLastProjectId()).toBe("abc");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/projects/storage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/projects/storage.ts`:
```ts
import { get, set } from "idb-keyval";
import type { Project } from "../types";

const KEY = "sdm:projects";
const LAST = "sdm:last";

export function newProject(name = "Untitled"): Project {
  return {
    id: (globalThis.crypto?.randomUUID?.() ?? `p_${Date.now()}_${Math.random().toString(36).slice(2)}`),
    name,
    structureText: "",
    flowText: "",
    positions: {},
    updatedAt: Date.now(),
  };
}

export async function listProjects(): Promise<Project[]> {
  return (await get<Project[]>(KEY)) ?? [];
}

export async function saveProject(p: Project): Promise<void> {
  const all = await listProjects();
  const idx = all.findIndex((x) => x.id === p.id);
  const next = { ...p, updatedAt: Date.now() };
  if (idx >= 0) all[idx] = next; else all.push(next);
  await set(KEY, all);
}

export async function deleteProject(id: string): Promise<void> {
  const all = await listProjects();
  await set(KEY, all.filter((x) => x.id !== id));
}

export async function getLastProjectId(): Promise<string | null> {
  return (await get<string>(LAST)) ?? null;
}

export async function setLastProjectId(id: string): Promise<void> {
  await set(LAST, id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/projects/storage.test.ts`
Expected: PASS (all 4).

- [ ] **Step 5: Commit**

```bash
git add src/projects/storage.ts src/projects/storage.test.ts
git commit -m "feat: indexeddb project storage"
```

---

### Task 12: URL-hash share encoding

**Files:**
- Create: `src/share/url.ts`
- Test: `src/share/url.test.ts`

**Interfaces:**
- Produces:
  - `function encodeShare(d: { structureText: string; flowText: string }): string` — returns a hash string (no leading `#`).
  - `function decodeShare(hash: string): { structureText: string; flowText: string } | null` — accepts a hash with or without a leading `#`; returns `null` on anything unparseable.

Encoding: JSON → UTF-8-safe base64 (`btoa(unescape(encodeURIComponent(json)))`), prefixed with `d=`.

- [ ] **Step 1: Write the failing test**

`src/share/url.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { encodeShare, decodeShare } from "./url";

describe("share url", () => {
  it("round-trips a design", () => {
    const d = { structureText: "client -> api", flowText: 'flow "x":\n  client -> api' };
    const hash = encodeShare(d);
    expect(decodeShare(hash)).toEqual(d);
  });

  it("accepts a leading #", () => {
    const d = { structureText: "a -> b", flowText: "" };
    expect(decodeShare("#" + encodeShare(d))).toEqual(d);
  });

  it("handles unicode", () => {
    const d = { structureText: "café -> dünya", flowText: "" };
    expect(decodeShare(encodeShare(d))).toEqual(d);
  });

  it("returns null on garbage", () => {
    expect(decodeShare("#nonsense")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/share/url.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/share/url.ts`:
```ts
interface Design { structureText: string; flowText: string; }

export function encodeShare(d: Design): string {
  const json = JSON.stringify({ s: d.structureText, f: d.flowText });
  return "d=" + btoa(unescape(encodeURIComponent(json)));
}

export function decodeShare(hash: string): Design | null {
  try {
    const raw = hash.replace(/^#/, "");
    const m = raw.match(/(?:^|&)d=([^&]+)/);
    if (!m) return null;
    const json = decodeURIComponent(escape(atob(m[1])));
    const obj = JSON.parse(json);
    if (typeof obj.s !== "string" || typeof obj.f !== "string") return null;
    return { structureText: obj.s, flowText: obj.f };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/share/url.test.ts`
Expected: PASS (all 4).

- [ ] **Step 5: Commit**

```bash
git add src/share/url.ts src/share/url.test.ts
git commit -m "feat: url-hash share encode/decode"
```

---

### Task 13: Seed example + custom node component

**Files:**
- Create: `src/seed.ts`
- Create: `src/canvas/SystemNode.tsx`
- Test: `src/seed.test.ts`

**Interfaces:**
- `seed.ts` produces: `const SEED: { structureText: string; flowText: string }`.
- `SystemNode.tsx` produces a React Flow custom node component:
  - `interface SystemNodeData { label: string; type: NodeType; selected?: boolean }`
  - `default export` a memoized component typed `NodeProps`.

- [ ] **Step 1: Write the failing test**

`src/seed.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { SEED } from "./seed";
import { parseStructure } from "./dsl/structure";
import { parseFlow } from "./dsl/flow";
import { validate } from "./dsl/validate";

describe("SEED", () => {
  it("is internally valid (every flow hop exists in the structure)", () => {
    const s = parseStructure(SEED.structureText);
    const f = parseFlow(SEED.flowText);
    expect(s.errors).toEqual([]);
    expect(f.errors).toEqual([]);
    expect(validate(s, f)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/seed.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementations**

`src/seed.ts`:
```ts
export const SEED = {
  structureText: `client  -> gateway
gateway -> [auth, api]
api     -> [cache, db]
api     -> queue
queue   -> worker
worker  -> db`,
  flowText: `flow "GET /profile":
  client  -> gateway
  gateway <-> auth
  gateway -> api
  api     -> cache
  api     <-> db
  api     ~> queue`,
};
```

`src/canvas/SystemNode.tsx`:
```tsx
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NodeType } from "../types";
import { TYPES } from "../engine/typeInference";

export interface SystemNodeData {
  label: string;
  type: NodeType;
  [key: string]: unknown;
}

function SystemNode({ data, selected }: NodeProps) {
  const d = data as SystemNodeData;
  const color = TYPES[d.type].color;
  return (
    <div className="sysnode" style={{ borderColor: color, boxShadow: selected ? `0 0 0 2px ${color}` : undefined }}>
      <span className="sysnode-bar" style={{ background: color }} />
      <Handle type="target" position={Position.Left} />
      <div className="sysnode-label">{d.label}</div>
      <div className="sysnode-type">{d.type}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default memo(SystemNode);
```

Append to `src/app.css`:
```css
.sysnode { position: relative; width: 132px; height: 50px; padding: 6px 10px; border-radius: 11px;
  background: #131a2b; border: 1px solid #3a465f; color: var(--text); display: flex;
  flex-direction: column; justify-content: center; }
.sysnode-bar { position: absolute; left: 0; top: 6px; bottom: 6px; width: 5px; border-radius: 3px; }
.sysnode-label { font-weight: 600; }
.sysnode-type { font-size: 11px; color: var(--muted); }
.sysnode.lit { filter: brightness(1.6); }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/seed.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/seed.ts src/canvas/SystemNode.tsx src/seed.test.ts src/app.css
git commit -m "feat: seed example and custom React Flow node"
```

---

### Task 14: Canvas (React Flow wired to the store)

**Files:**
- Create: `src/canvas/Canvas.tsx`

**Interfaces:**
- Consumes: `useAppStore`, `appStore`; `SystemNode`; `@xyflow/react`.
- Produces: `default export function Canvas()` rendering `<ReactFlow>` from store state, plus a `forwardRef`-free exported helper `useFlowNodesEdges()` is NOT needed — derive inline.

This task has no unit test (React Flow needs a real layout/DOM; verified manually in Task 17). Keep the component small and declarative.

- [ ] **Step 1: Write the component**

`src/canvas/Canvas.tsx`:
```tsx
import { useCallback, useMemo } from "react";
import {
  ReactFlow, Background, Controls, type Node, type Edge,
  type NodeChange, applyNodeChanges, type Connection,
} from "@xyflow/react";
import { useAppStore, appStore } from "../store";
import SystemNode from "./SystemNode";
import Particles from "../engine/Particles";

const nodeTypes = { system: SystemNode };

export default function Canvas() {
  const structure = useAppStore((s) => s.structure);
  const positions = useAppStore((s) => s.positions);
  const selection = useAppStore((s) => s.selection);

  const nodes: Node[] = useMemo(
    () =>
      structure.nodes.map((n) => ({
        id: n.id,
        type: "system",
        position: positions[n.id] ?? { x: 0, y: 0 },
        selected: selection === n.id,
        data: { label: n.id, type: n.type },
      })),
    [structure.nodes, positions, selection]
  );

  const edges: Edge[] = useMemo(
    () =>
      structure.edges.map((e) => ({
        id: `${e.from}->${e.to}`,
        source: e.from,
        target: e.to,
        type: "default",
      })),
    [structure.edges]
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // we only care about position + selection; apply against current nodes then push back
    const next = applyNodeChanges(changes, nodes);
    for (const n of next) {
      const p = n.position;
      appStore.getState().moveNode(n.id, p.x, p.y);
      if (n.selected) appStore.getState().select(n.id);
    }
  }, [nodes]);

  const onConnect = useCallback((c: Connection) => {
    if (c.source && c.target) appStore.getState().addEdge(c.source, c.target);
  }, []);

  const onNodeDoubleClick = useCallback((_: unknown, node: Node) => {
    const next = window.prompt("Rename node", node.id);
    if (next) appStore.getState().renameNode(node.id, next.trim());
  }, []);

  return (
    <div className="canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={() => appStore.getState().select(null)}
        fitView
      >
        <Background />
        <Controls />
        <Particles />
      </ReactFlow>
    </div>
  );
}
```

Append to `src/app.css`:
```css
.canvas { flex: 1; height: 100%; }
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors. (`Particles` is created in the next task; if checking now, temporarily stub it — but Task 15 lands before any full app run, so prefer doing Tasks 14–15 back to back, then type-check at the end of Task 15.)

- [ ] **Step 3: Commit**

```bash
git add src/canvas/Canvas.tsx src/app.css
git commit -m "feat: react flow canvas wired to store"
```

---

### Task 15: Particle overlay (getPointAtLength + RAF, in ViewportPortal)

**Files:**
- Create: `src/engine/Particles.tsx`

**Interfaces:**
- Consumes: `useAppStore`, `appStore`; `compileFlow`; `getBezierPath`, `ViewportPortal`, `useStore` (React Flow's internal node store) from `@xyflow/react`; `TYPES`.
- Produces: `default export function Particles()` — renders animated dots over edges when a "play" tick is active.
- Adds a play trigger to the app store via a tiny companion module is NOT used; instead Particles exposes play through a module-level event. To keep the store the source of truth, ADD `playToken: number` and `play()` / `stop()` to the store in this task (extend `AppState`).

Animation model: when `play()` is called, the store bumps `playToken` and records `playAt = performance.now()`. Particles, on `playToken` change, measures each edge's bezier path length (build an `SVGPathElement` from `getBezierPath`), defines `durationFor(from,to) = max(300, length / speedPxPerSec * 1000)`, compiles events with `compileFlow`, and runs a RAF loop positioning one dot per active event via `getPointAtLength` (reversed for `dir === "back"`). On arrival, briefly add the `lit` class to the destination node element.

- [ ] **Step 1: Extend the store with play/stop**

In `src/store.ts`, add to the `AppState` interface:
```ts
  playToken: number;
  playAt: number;
  speed: number;
  setSpeed: (v: number) => void;
  play: () => void;
  stop: () => void;
```
And in the store body initial state + actions:
```ts
      playToken: 0,
      playAt: 0,
      speed: 240,
      setSpeed: (v) => set({ speed: v }),
      play: () => set({ playToken: get().playToken + 1, playAt: performance.now() }),
      stop: () => set({ playToken: 0 }),
```

- [ ] **Step 2: Write the Particles component**

`src/engine/Particles.tsx`:
```tsx
import { useEffect, useRef, useState } from "react";
import { ViewportPortal, getBezierPath, Position, useNodes } from "@xyflow/react";
import { useAppStore, appStore } from "../store";
import { compileFlow } from "./interpreter";
import { TYPES } from "./typeInference";
import type { ParticleEvent } from "../types";

const NODE_W = 132, NODE_H = 50;

function centerRight(p: { x: number; y: number }) { return { x: p.x + NODE_W, y: p.y + NODE_H / 2 }; }
function centerLeft(p: { x: number; y: number }) { return { x: p.x, y: p.y + NODE_H / 2 }; }

export default function Particles() {
  const playToken = useAppStore((s) => s.playToken);
  const nodes = useNodes();
  const [dots, setDots] = useState<{ x: number; y: number; color: string; label?: string }[]>([]);
  const raf = useRef(0);

  useEffect(() => {
    if (!playToken) { setDots([]); return; }
    const st = appStore.getState();
    const posOf = (id: string) => nodes.find((n) => n.id === id)?.position;

    // build a measurable path per edge
    const paths = new Map<string, SVGPathElement>();
    const lengthOf = new Map<string, number>();
    for (const e of st.structure.edges) {
      const a = posOf(e.from), b = posOf(e.to);
      if (!a || !b) continue;
      const s = centerRight(a), t = centerLeft(b);
      const [d] = getBezierPath({ sourceX: s.x, sourceY: s.y, sourcePosition: Position.Right, targetX: t.x, targetY: t.y, targetPosition: Position.Left });
      const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
      el.setAttribute("d", d);
      paths.set(`${e.from}->${e.to}`, el);
      lengthOf.set(`${e.from}->${e.to}`, el.getTotalLength());
    }

    const durationFor = (from: string, to: string) => {
      const len = lengthOf.get(`${from}->${to}`) ?? 200;
      return Math.max(300, (len / st.speed) * 1000);
    };
    const events: ParticleEvent[] = compileFlow(st.flow.steps, durationFor);

    const colorOf = (from: string) =>
      TYPES[st.structure.nodes.find((n) => n.id === from)?.type ?? "service"].color;

    const lit = new Set<string>();
    const start = st.playAt;
    const loop = (now: number) => {
      const elapsed = now - start;
      const live: typeof dots = [];
      let anyPending = false;
      for (const ev of events) {
        const path = paths.get(ev.edgeId);
        if (!path) continue;
        const local = elapsed - ev.startMs;
        if (local < 0) { anyPending = true; continue; }
        const len = lengthOf.get(ev.edgeId)!;
        let t = local / ev.durMs;
        if (t >= 1) {
          if (!lit.has(ev.edgeId + ev.startMs)) {
            lit.add(ev.edgeId + ev.startMs);
            const el = document.querySelector(`.react-flow__node[data-id="${ev.to}"] .sysnode`);
            el?.classList.add("lit");
            setTimeout(() => el?.classList.remove("lit"), 230);
          }
          continue;
        }
        anyPending = true;
        const at = ev.dir === "back" ? (1 - t) * len : t * len;
        const pt = path.getPointAtLength(at);
        live.push({ x: pt.x, y: pt.y, color: colorOf(ev.from), label: ev.label });
      }
      setDots(live);
      if (anyPending) raf.current = requestAnimationFrame(loop);
      else { setDots([]); appStore.getState().stop(); }
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
    // re-run whenever a new play is triggered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playToken]);

  return (
    <ViewportPortal>
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
        {dots.map((d, i) => (
          <g key={i} transform={`translate(${d.x},${d.y})`}>
            <circle r={5} fill="#eaf2ff" stroke={d.color} strokeWidth={2.5} />
            {d.label && <text x={8} y={4} fontSize={11} fill={d.color}>{d.label}</text>}
          </g>
        ))}
      </svg>
    </ViewportPortal>
  );
}
```

- [ ] **Step 3: Type-check the canvas + overlay together**

Run: `npx tsc -b`
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/engine/Particles.tsx src/store.ts
git commit -m "feat: particle overlay with flow interpreter playback"
```

---

### Task 16: Tabbed editors

**Files:**
- Create: `src/editor/Editors.tsx`

**Interfaces:**
- Consumes: `useAppStore`, `appStore`.
- Produces: `default export function Editors()` — a tab switch (Structure | Flow), a `<textarea>` bound to the active text, and an inline error list (parse errors for the active file; validation errors shown under the Flow tab).

No unit test (DOM/UI; verified in Task 17).

- [ ] **Step 1: Write the component**

`src/editor/Editors.tsx`:
```tsx
import { useState } from "react";
import { useAppStore, appStore } from "../store";

export default function Editors() {
  const [tab, setTab] = useState<"structure" | "flow">("structure");
  const structureText = useAppStore((s) => s.structureText);
  const flowText = useAppStore((s) => s.flowText);
  const structure = useAppStore((s) => s.structure);
  const flow = useAppStore((s) => s.flow);
  const validation = useAppStore((s) => s.validation);

  const isStructure = tab === "structure";
  const value = isStructure ? structureText : flowText;
  const onChange = (v: string) =>
    isStructure ? appStore.getState().setStructureText(v) : appStore.getState().setFlowText(v);

  const errors = isStructure ? structure.errors : [...flow.errors, ...validation];

  return (
    <div className="editors">
      <div className="tabs">
        <button className={isStructure ? "active" : ""} onClick={() => setTab("structure")}>Structure</button>
        <button className={!isStructure ? "active" : ""} onClick={() => setTab("flow")}>Flow</button>
      </div>
      <textarea spellCheck={false} value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="errors">
        {errors.map((er, i) => (
          <div key={i} className="error">⚠ line {er.line}: {er.message}</div>
        ))}
      </div>
    </div>
  );
}
```

Append to `src/app.css`:
```css
.editors { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.tabs { display: flex; gap: 4px; }
.tabs button { flex: 1; padding: 6px; background: var(--panel); color: var(--muted); border: 0; cursor: pointer; }
.tabs button.active { color: var(--text); border-bottom: 2px solid #5b9dff; }
.editors textarea { flex: 1; min-height: 0; resize: none; background: #0b1120; color: var(--text);
  border: 1px solid #243049; border-radius: 8px; padding: 10px; font: 13px/1.5 ui-monospace, monospace; margin-top: 6px; }
.errors { max-height: 120px; overflow: auto; }
.error { color: #ff9b9b; font-size: 12px; padding: 2px 0; }
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/editor/Editors.tsx src/app.css
git commit -m "feat: tabbed structure/flow editors with inline errors"
```

---

### Task 17: App assembly — sidebar, projects, transport, boot, autosave

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: everything — `useAppStore`, `appStore`, storage CRUD, `decodeShare`, `SEED`, `Canvas`, `Editors`.
- Produces the full app: sidebar (project switcher + new/delete, tabbed editors, transport controls play/stop/speed/auto-arrange) and the canvas; boot logic (URL hash → import; else last project; else seed) and debounced autosave.

No unit test (integration; verified by manual checklist in Step 3).

- [ ] **Step 1: Write App.tsx**

`src/App.tsx`:
```tsx
import { useEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useAppStore, appStore } from "./store";
import Canvas from "./canvas/Canvas";
import Editors from "./editor/Editors";
import { SEED } from "./seed";
import {
  newProject, listProjects, saveProject, deleteProject,
  getLastProjectId, setLastProjectId, type,
} from "./projects/storage";
import type { Project } from "./types";
import { decodeShare } from "./share/url";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const speed = useAppStore((s) => s.speed);
  const structureText = useAppStore((s) => s.structureText);
  const flowText = useAppStore((s) => s.flowText);
  const positions = useAppStore((s) => s.positions);
  const saveTimer = useRef(0);

  // boot
  useEffect(() => {
    (async () => {
      const shared = decodeShare(location.hash);
      let all = await listProjects();
      let active: Project;
      if (shared) {
        active = { ...newProject("Shared design"), ...shared };
        await saveProject(active);
        history.replaceState(null, "", location.pathname);
        all = await listProjects();
      } else {
        const lastId = await getLastProjectId();
        const found = all.find((p) => p.id === lastId);
        if (found) active = found;
        else if (all.length) active = all[0];
        else {
          active = { ...newProject("Example"), ...SEED };
          await saveProject(active);
          all = await listProjects();
        }
      }
      setProjects(all);
      setCurrentId(active.id);
      appStore.getState().load(active.structureText, active.flowText, active.positions);
      await setLastProjectId(active.id);
    })();
  }, []);

  // debounced autosave on any design change
  useEffect(() => {
    if (!currentId) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const cur = projects.find((p) => p.id === currentId);
      if (!cur) return;
      const updated: Project = { ...cur, structureText, flowText, positions };
      await saveProject(updated);
      setProjects((ps) => ps.map((p) => (p.id === currentId ? updated : p)));
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [structureText, flowText, positions, currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTo = async (p: Project) => {
    setCurrentId(p.id);
    appStore.getState().load(p.structureText, p.flowText, p.positions);
    await setLastProjectId(p.id);
  };

  const createProject = async () => {
    const p = { ...newProject(`Project ${projects.length + 1}`), ...SEED };
    await saveProject(p);
    setProjects(await listProjects());
    await switchTo(p);
  };

  const removeProject = async (id: string) => {
    await deleteProject(id);
    const all = await listProjects();
    setProjects(all);
    if (id === currentId && all.length) await switchTo(all[0]);
  };

  return (
    <ReactFlowProvider>
      <div className="app">
        <aside className="sidebar">
          <h1>system-design-maker</h1>

          <div className="projects">
            <select value={currentId ?? ""} onChange={(e) => {
              const p = projects.find((x) => x.id === e.target.value);
              if (p) switchTo(p);
            }}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={createProject}>+ New</button>
            {currentId && projects.length > 1 && (
              <button onClick={() => removeProject(currentId)}>🗑</button>
            )}
          </div>

          <Editors />

          <div className="transport">
            <button className="primary" onClick={() => appStore.getState().play()}>▶ Send request</button>
            <button onClick={() => appStore.getState().stop()}>■ Stop</button>
            <button onClick={() => appStore.getState().autoArrange()}>⤢ Arrange</button>
          </div>
          <div className="row">
            <label>Speed</label>
            <input type="range" min={60} max={600} value={speed}
              onChange={(e) => appStore.getState().setSpeed(Number(e.target.value))} />
          </div>
        </aside>

        <Canvas />
      </div>
    </ReactFlowProvider>
  );
}
```

Note: remove the stray `type` from the storage import line — the correct import is:
```ts
import {
  newProject, listProjects, saveProject, deleteProject,
  getLastProjectId, setLastProjectId,
} from "./projects/storage";
```

Append to `src/app.css`:
```css
.sidebar { width: 360px; background: var(--panel); padding: 14px; display: flex; flex-direction: column; gap: 10px; height: 100%; }
.sidebar h1 { font-size: 15px; margin: 0; }
.projects { display: flex; gap: 6px; }
.projects select { flex: 1; background: #0b1120; color: var(--text); border: 1px solid #243049; border-radius: 6px; padding: 4px; }
.transport { display: flex; gap: 6px; }
.transport button, .projects button { background: #1b2740; color: var(--text); border: 1px solid #2c3a59; border-radius: 6px; padding: 6px 10px; cursor: pointer; }
.transport .primary { background: #2a5bd7; border-color: #2a5bd7; }
.row { display: flex; align-items: center; gap: 8px; }
.row input[type=range] { flex: 1; }
```

- [ ] **Step 2: Build and type-check**

Run: `npx tsc -b && npm run build`
Expected: build succeeds, no type errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open the URL, and confirm:
- The Example project loads with a diagram (nodes laid out left→right, colored by type).
- Editing **Structure** text updates the canvas; dragging a node persists (refresh keeps position).
- Switching to **Flow** tab and clicking **▶ Send request** animates one trace: `gateway <-> auth` goes out and comes back; `api <-> db` round-trips; `api ~> queue` fires without blocking; nodes flash on arrival.
- Introduce a bad hop in the Flow file (e.g. `api -> nowhere`) → an inline validation error appears at that line.
- **+ New** creates a project; switching the dropdown swaps designs; refresh reopens the last project.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/app.css
git commit -m "feat: app shell, projects, transport, boot and autosave"
```

---

### Task 18: Full test run + deploy notes

**Files:**
- Create: `README.md` (or update existing)

**Interfaces:** none.

- [ ] **Step 1: Run the whole suite**

Run: `npm test`
Expected: all unit suites pass (types, typeInference, structure, serialize, flow, validate, layout, interpreter, store, storage, url, seed).

- [ ] **Step 2: Production build**

Run: `npm run build && npm run preview`
Expected: build emits `dist/`; preview serves the working app.

- [ ] **Step 3: Write README deploy notes**

`README.md`:
```markdown
# system-design-maker

Diagram-as-code, but the request actually moves. Define a system in a **structure** file and
how one request behaves in a **flow** file; watch the request animate through the diagram.

## Develop
- `npm install`
- `npm run dev` — local dev server
- `npm test` — unit tests
- `npm run build` — static production build to `dist/`

## Deploy
Static site, **no backend**. Deploy `dist/` to any static host:
- **Vercel** (zero-config): import the repo; framework preset "Vite"; done.
- Netlify / Cloudflare Pages / GitHub Pages all work identically.

Projects are stored in the browser (IndexedDB) — they survive refresh, per device.
Share a design via the **URL hash** (copied from `encodeShare`); opening that link imports it
as a new local project.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: readme with develop and deploy notes"
```

---

## Self-Review

**Spec coverage:**
- Stack (React+Vite+TS+React Flow+Zustand+idb-keyval+Vitest) → Task 1, deps; used throughout. ✓
- Two-file structure/flow split → structure parser (T4), flow parser (T6), tabbed editors (T16). ✓
- Real flow interpreter replacing `emitFrom` → interpreter (T9) + overlay playback (T15). ✓
- `->`, `<->`, `~>`, `(label)` semantics → T6 (parse) + T9 (compile, with clock rules tested). ✓
- Validation (hop not in structure) as teaching signal → T7 + surfaced in editors (T16). ✓
- Type inference with optional explicit annotation → T3 + T4. ✓
- Layered auto-layout (ported) → T8; layout-missing + auto-arrange in store (T10). ✓
- Two-way sync + no-feedback-loop invariant → store `applyModel` vs `setStructureText` (T10). ✓
- Local-only multi-project persistence (IndexedDB), positions as sidecar → T11 + Project type (T2) + autosave (T17). ✓
- URL-hash share → T12 + boot import (T17). ✓
- Particle overlay via getPointAtLength + RAF, in flow coordinates → T15 (ViewportPortal). ✓
- Static deploy, no backend → T18 README; no server code anywhere. ✓
- Deferred items (scrubber, par/wait, branch picking, catalog, export, multi-flow) → not present. ✓

**Placeholder scan:** No TBD/TODO; every code step contains real code. The only inline caveat is the deliberate import-typo correction note in Task 17 Step 1 (the corrected import is shown explicitly).

**Type consistency:** `edgeKey` id format `from->to` is consistent across types (T2), validate (T7), interpreter (T9), Canvas edge ids (T14), Particles path map (T15). `ParticleEvent` fields match between T2, T9, T15. Store action names referenced by components (T14 `moveNode/select/addEdge/renameNode`, T17 `play/stop/autoArrange/setSpeed/load`) all exist in T10/T15 store definitions. `NodeType` enum identical across typeInference (T3), types (T2), SystemNode (T13).
