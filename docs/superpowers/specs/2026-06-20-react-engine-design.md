# system-design-maker — React Engine (Foundation + Flow Interpreter)

**Date:** 2026-06-20
**Status:** Approved design, pending spec review → implementation plan
**Supersedes:** the vanilla-JS prototype's single-DSL fan-out model (kept only as reference for ported logic)

> Context: see `SPEC.md` for the full product vision. This design implements the SPEC's
> "MVP heartbeat" (build steps 1–2) on a React foundation, plus the structure/flow split
> and a real flow interpreter. It deliberately defers the timeline scrubber, branch logic,
> `par:` blocks, component catalog, and export.

---

## 1. Goals & non-goals

**Goals**
- Port the prototype's proven mechanics to a React + Vite + React Flow foundation.
- Introduce the SPEC's core idea: **two files** — *structure* (what the system is) and
  *flow* (how one request behaves) — and a **real flow interpreter** that plays one ordered,
  timed trace. This replaces the prototype's `emitFrom` fan-out, the SPEC's "core flaw".
- Local-only persistence with **multiple projects**, surviving refresh, with **zero backend**.
- Static deploy.

**Non-goals (deferred)**
- Timeline scrubber (play/pause/step/seek).
- Branch semantics (`hit`/`miss` picking), `par:` parallel blocks, `wait`.
- Multi-flow files (one flow per project for this build).
- Component catalog with AWS/Azure icons (type is still inferred from the node name).
- GIF/MP4 export.
- Real accounts / cross-device sync (local-only by design; can be added later without rework).

---

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | React 18 + Vite + **TypeScript** | Typed AST/interpreter catches the bugs that hide in parsers. |
| Canvas | `@xyflow/react` (React Flow) | Drag/connect/pan/zoom/selection for free; SPEC's recommendation. |
| State | Zustand | One small shared store; pairs naturally with React Flow; no prop drilling. |
| Persistence | `idb-keyval` (IndexedDB) | Survives refresh, holds many projects, no backend, larger than cookies/localStorage. |
| Tests | Vitest | Fast unit tests for the pure core (parsers, validator, layout, interpreter). |
| Deploy | `vite build` → static host (Vercel default) | Zero-config, no server, no env. |

No backend, no router, no auth service.

---

## 3. Architecture

React Flow renders nodes + edges. **Particles are a separate custom SVG overlay layer on top**
of the edges — React Flow does not animate request flow; the overlay is the product's magic.
A single Zustand store is the source of truth; text editors and the canvas stay two-way synced
through it, preserving the prototype's no-feedback-loop invariant (programmatic value set does
not re-trigger the user-edit path).

### 3.1 Modules

**Pure / DOM-free (the testable core):**

- **`dsl/structure.ts`** — `parseStructure(text) → { nodes: {id,type}[], edges: {from,to}[], errors }`.
  Ports the prototype's `parseTopology`. Adds optional `id : type` annotation; type falls back to
  name inference (`typeOf`) when omitted. Keeps fan-out `[a, b]` and chaining `a -> b -> c`.
  Supports `#` and `//` comments. Errors carry a line number.
- **`dsl/flow.ts`** — `parseFlow(text) → { name, steps: Step[], errors }`.
  New. **Line order = time order.** `Step = { from, to, kind: 'call'|'roundtrip'|'async', label? }`.
  Verbs: `->` (call), `<->` (roundtrip), `~>` (async). `(label)` on a step rides the particle.
  Steps are the indented lines under a `flow "Name":` header. Errors carry a line number.
- **`dsl/validate.ts`** — `validate(structure, flow) → ValidationError[]`. Every flow hop's
  `(from → to)` must correspond to a structure edge (the return leg of a `<->` is allowed
  implicitly). A hop with no matching edge is an error with a line number — the **teaching signal**.
- **`engine/layout.ts`** — ports `layeredPositions` (Kahn topological sort + longest-path layering,
  centered in world space). Produces `{ [id]: {x,y} }`, used only for nodes lacking a saved position.
- **`engine/interpreter.ts`** — `compileFlow(steps, edgeDurations) → ParticleEvent[]`. **The hard part.**
  A scheduler that walks steps advancing a clock:
  - `call`: schedule one forward particle on the edge; advance clock by the edge duration.
  - `roundtrip` (`<->`): schedule a forward particle, then a return particle on the same edge
    starting at arrival; advance clock by both legs.
  - `async` (`~>`): schedule a forward particle but **do not** advance the blocking clock.
  - `label`: attached to the emitted `ParticleEvent`.
  Output: `ParticleEvent = { edgeId, dir: 'forward'|'back', startMs, durMs, label? }`. Pure;
  unit-tested without a DOM. This is the replacement for the prototype's `emitFrom`.

**React / DOM:**

- **`engine/Particles.tsx`** — the SVG overlay. Given compiled `ParticleEvent[]` and a RAF clock,
  positions each active dot via `SVGPathElement.getPointAtLength()`. Edge geometry comes from
  React Flow's bezier path helper rendered into an invisible `<path>` per edge, so the overlay is
  self-contained. Ports `tick` / `spawnParticle`. Pulses the destination node on arrival.
- **`canvas/Canvas.tsx`** — React Flow wrapper. Custom node type renders label + inferred type + color
  (ports `TYPES`). Handles drag (move), connect (new edge), select, inline rename, add, delete →
  all routed to the store.
- **`editor/Editors.tsx`** — **tabbed** Structure / Flow text panes (one visible at a time, full
  height). Active pane shows its own parse/validation errors inline.
- **`store.ts`** (Zustand) — `{ structureText, flowText, positions, selection, parsedStructure,
  parsedFlow, validationErrors }`. Editing text reparses (debounced ~250ms). Canvas mutations update
  the model + positions and regenerate `structureText` (ports `serialize`/`regenerateDSL`), preserving
  the invariant that a programmatic text set does not re-fire the user-edit handler.
- **`projects/`** — IndexedDB-backed project CRUD + a project switcher. Debounced autosave on change.
- **`share/url.ts`** — encode/decode `{ structureText, flowText }` to/from the URL hash (JSON →
  compressed → base64). On boot, a present hash imports the design as a new project.
- **`App.tsx`** — layout: sidebar (project switcher + tabbed editors + transport controls:
  play / stop / speed) and the main canvas with the particle overlay mounted on top.

### 3.2 Data model

```ts
type Project = {
  id: string;
  name: string;
  structureText: string;
  flowText: string;
  positions: Record<string, { x: number; y: number }>; // sidecar — keeps DSL clean
  updatedAt: number;
};
```

Projects are stored in IndexedDB under a single keyed list. Node positions are a **sidecar**
(not embedded in the DSL text), resolving the SPEC's "where do positions live" open question.

### 3.3 Data flow

1. **Boot:** URL hash present → import shared design as a new project; else load last project
   from IndexedDB; else seed the example project.
2. **Edit structure text** → debounced `parseStructure` → React Flow nodes/edges (+ `layout` for
   nodes without a saved position) → autosave.
3. **Edit flow text** → `parseFlow` → `validate` against the structure → inline errors or ready.
4. **Canvas mutation** (drag/connect/rename/add/delete) → update model + positions → regenerate
   `structureText` (no input-event loop) → autosave.
5. **Play** → `compileFlow` → `ParticleEvent[]` → `Particles` overlay runs the RAF clock → dots
   animate along edges; destination nodes pulse on arrival.

### 3.4 Error handling

- **Parse errors** (either file): shown inline in that editor pane with line numbers (ports the
  prototype's `errBox`). The canvas keeps the last good render.
- **Validation errors** (flow hop with no matching structure edge): highlight the offending hop;
  that flow won't play. Non-fatal — the diagram still renders. This is the intended teaching moment.
- **IndexedDB failure:** fall back to in-memory state and surface a non-blocking warning.

---

## 4. Concrete DSL

**Structure** (`type` optional; inferred from the name when omitted):
```
client  : client
gateway : api-gateway
api     : service
cache   : redis
db      : postgres

client  -> gateway
gateway -> [auth, api]
api     -> [cache, db]
```

**Flow** (exactly one flow per project in this build):
```
flow "GET /profile":
  client  -> gateway
  gateway <-> auth      # round-trip: authenticate
  gateway -> api
  api     <-> db        # fetch
  api     ~> queue      # async, fire-and-forget
  api     -> client     # respond
```

Supported verbs: `->`, `<->`, `~>`, plus `(label)` tags. `par:`, `wait`, branch picking, and
multi-flow files are out of scope (Full v1).

---

## 5. UI layout

- **Sidebar:** project switcher (list + new/rename/delete) · **tabbed** editors (Structure | Flow,
  one visible, full height, inline errors) · transport controls (▶ play, ■ stop, speed slider).
- **Main:** React Flow canvas (pan/zoom, drag, connect, select, rename, delete) with the particle
  overlay on top; a small legend of used types.

---

## 6. Testing

Vitest unit tests for the DOM-free core, where TDD pays off most:
- `parseStructure` — annotations, fan-out, chaining, comments, malformed lines (line numbers).
- `parseFlow` — verbs, labels, ordering, header parsing, malformed lines.
- `validate` — hop-not-in-structure detection; `<->` return leg allowance.
- `layout` — layering of a known graph.
- `compileFlow` — the interpreter: clock advancement for `call`, both legs of `<->`, and
  non-advancement for `~>` (the riskiest, highest-value tests).

Component tests are kept light (canvas/particles are exercised manually).

---

## 7. Deploy

`vite build` → static `dist/`. Deploy to any static host; **Vercel** is the zero-config default
(no env vars, no server). Share links are pure client-side URL state. There is nothing to operate.

---

## 8. Resolved decisions

- Persistence: **local-only, IndexedDB**, no login, URL-encoded share links, static deploy.
- Engine scope: **foundation + real flow interpreter** (SPEC build steps 1–2); scrubber/catalog/
  export deferred.
- Editors: **tabbed**.
- Language: **TypeScript**.
- Positions: **sidecar** in the project record (not in the DSL).
- Catalog: deferred — type still inferred from the node name, with an optional explicit annotation.
