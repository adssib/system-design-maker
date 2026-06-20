# system-design-maker — Design Spec (v1)

> Seed document for a fresh build session. Captures the vision, the core model,
> the DSL design, scope, and what to reuse from the throwaway prototype.
> Read this first; the prototype in this folder is a proof-of-mechanic, not the product.

---

## 1. One-liner

**Infrastructure diagrams as code — where the request actually moves.**

A website where you define a system in code and watch animated requests travel through it.
Two files: one for the **structure** (what the system *is*), one for the **flow** (how a request *behaves*).
Rich catalog of real components (Redis, Postgres, AWS, Azure…). Read the code → understand the system at a high level, both its shape *and* its runtime behavior.

## 2. Why this exists (positioning)

The space has tools, but each misses the wedge:

| Tool | What it does | What it misses |
|---|---|---|
| GravelGraph, ByteDiagram | drag-drop catalog + animated "press play" flow | not code-defined; flow is decoration, not a first-class authored trace |
| Mermaid / D2 / PlantUML | diagram-as-code (static) | no animation, no request *behavior* |
| Structurizr (C4-as-code) | architecture-as-code, multiple views | static; no animated request lifecycle |
| Excalidraw / draw.io | freeform canvas | manual, no code, weak animation |

**Our wedge:** diagram-as-code **with the request lifecycle as a first-class, animated, authored thing** — and the clean split of **structure vs flow** into two files. Nobody does that split. It mirrors how engineers actually think: architecture diagram *and* sequence diagram, fused and animated.

It also plays to a DevOps story: these two files live in version control, in a PR, generated from config.

## 3. The core model — TWO files

This is the heart of the product. Do not collapse them into one.

### 3a. Structure file — *what the system is*
Declares components (typed from a catalog → icon + defaults) and the connections that are *possible*.

```
# system.sdl  (syntax is a proposal — finalize in the build session)

# component : catalog-type
client   : client
gateway  : api-gateway
auth     : service
api      : service
cache    : redis
db       : postgres
queue    : sqs
worker   : service

# connections — what CAN talk to what (the static architecture)
client  -> gateway
gateway -> auth, api
api     -> cache, db, queue
queue   -> worker
worker  -> db
```

The structure file renders the diagram (nodes + edges + icons + layout). Nothing animates from this alone.

### 3b. Flow file — *how a request behaves*
Declares one or more named flows. **A flow is an ordered trace** of a single request's journey. **Line order = time order.** Returns, branches, async, and parallelism are explicit.

```
# flows.sdl  (syntax is a proposal)

flow "GET /profile":
  client  ->  gateway
  gateway <-> auth          # round-trip: authenticate, returns a token
  gateway ->  api
  api     ->  cache
  cache   ->  api  (miss)   # branch: cache miss
  api     <-> db            # fetch from db
  api     ->  cache         # populate cache
  api     ~>  queue         # async / fire-and-forget (no wait)
  api     ->  client        # respond

flow "DDoS spike":
  par:                       # parallel scatter
    client -> gateway
    client -> gateway
    client -> gateway
```

Proposed edge verbs (decide final set in build session):
- `->`  one-way call
- `<->` call **and** response (particle travels out, then back)
- `~>`  async / fire-and-forget (don't block the trace)
- `(label)` branch/condition annotation shown on the particle (`hit`, `miss`, `429`, …)
- `par: { … }` parallel block (scatter-gather); `[a, b]` simultaneous targets
- `wait 200ms` explicit delay (optional)

**Validation:** every hop in a flow must correspond to a connection that exists in the structure file. A flow that references a missing edge is an error → great teaching signal.

## 4. Component catalog

Data-driven registry (JSON), so it's extensible without code changes.

```jsonc
{
  "redis":       { "name": "Redis",        "category": "cache",   "color": "#ff7eb6", "icon": "redis.svg" },
  "postgres":    { "name": "PostgreSQL",   "category": "db",      "color": "#46d369", "icon": "postgres.svg" },
  "aws-lambda":  { "name": "AWS Lambda",   "category": "compute", "color": "#ff9900", "icon": "aws/lambda.svg" },
  "aws-s3":      { "name": "Amazon S3",    "category": "storage", "color": "#46d369", "icon": "aws/s3.svg" },
  "api-gateway": { "name": "API Gateway",  "category": "network", "color": "#ffb454", "icon": "gateway.svg" }
  // …client, service, sqs, dynamodb, cloudfront, azure-functions, cosmos-db, service-bus, …
}
```

Launch tiers:
1. **Generic primitives** (ship first): client, service, api-gateway/lb, cache, db, queue, worker.
2. **AWS**: Lambda, EC2, S3, DynamoDB, RDS, SQS, API Gateway, CloudFront, ELB.
3. **Azure**: Functions, Blob, Cosmos DB, Service Bus, App Service, Front Door.
4. GCP (optional, later).

**Icon licensing — decide early:** AWS & Azure publish official Architecture Icon sets (free, with usage terms). GravelGraph uses official icons. Confirm terms or fall back to a permissive set (e.g., simple-icons, devicon). This is a real gating decision, not an afterthought.

## 5. Rendering & animation engine

- **Layout:** auto-layout via `dagre` or `elk` (React Flow ships integrations). Allow saved manual positions (annotations in the structure file or a sidecar layout file).
- **Particles (the heartbeat):** keep the proven `SVGPathElement.getPointAtLength()` + `requestAnimationFrame` approach from the prototype. React Flow draws the graph; **particles are a custom SVG overlay layer on top of the edges** — React Flow does not do this, it's your magic.
- **Flow interpreter (the hard, important part):** a scheduler that turns a flow trace into timed particle events:
  - sequential hops advance a clock
  - `<->` schedules an outbound particle, then a return particle along the same edge
  - `~>` spawns without advancing the blocking clock
  - `par`/`[ ]` spawn concurrently
  - `(label)` rides along on the particle as a small tag
  - branches pick a path; later: probabilistic branches for "traffic mix"
- **Timeline scrubber:** play / pause / step / seek through a flow — *step through your request like a debugger*. This is a killer feature; design it in from the start.

## 6. Interaction (this project is "all about interaction")

- **Code-first AND click-to-build.** Edit the structure file ↔ canvas (two-way sync, as the prototype proved is feasible). Drag components from the catalog onto the canvas; it writes back to the structure file.
- **Flow authored as code**, played/scrubbed on the canvas.
- Click a node to fire an ad-hoc request; hover to inspect; select + delete; rename inline.
- Later, Server-Survival energy (optional, big differentiator): **node capacity** → nodes choke, requests queue / reroute / drop under load.

## 7. Recommended tech stack (scope has outgrown vanilla)

The prototype proved the mechanic in vanilla JS. The product needs a framework — adopt now:

- **React + Vite** (or SvelteKit) — fast, portfolio-friendly.
- **React Flow** (`@xyflow/react`) — node/edge canvas: drag, connect, pan/zoom, selection, dagre/elk auto-layout, all free. Saves weeks.
- **Particles:** custom layer, raw `requestAnimationFrame` + `getPointAtLength` (reuse prototype logic).
- **DSL parser:** start hand-rolled (the prototype's parser is ~40 lines); graduate to `chevrotain`/`peggy` if grammar grows.
- **Catalog:** JSON registry + bundled SVG icon assets.
- **Export:** `gif.js` (client) or `ffmpeg.wasm` for GIF/MP4 — the "share on LinkedIn" feature.
- **Persistence/sharing:** the two files + shareable link (URL-encode or a tiny backend).

## 8. MVP — build order for the fresh session

The heartbeat to nail first, then expand:

1. **Structure file → rendered diagram** with catalog icons (generic primitives + 2–3 AWS types). Auto-layout.
2. **Flow file → one animated trace** with one `<->` request/response round-trip. ← *MVP heartbeat.*
3. **Timeline scrubber** (play/pause/step) + branches (`hit`/`miss`) + async (`~>`).
4. Catalog expansion (AWS/Azure), drag-to-build + two-way sync, parallel/`par`, export.

## 9. Reuse from the prototype in this folder

Don't re-derive these — they're written and verified here:
- `app.js` — the `getPointAtLength` + RAF **particle engine** (`spawnParticle`/`emitFrom`/`tick`), the **layered layout** (`layeredPositions`, Kahn + longest-path), **type inference** (`typeOf`/`TYPES`), and the **two-way-sync** round-trip pattern (`parseTopology` ↔ `serialize`, proven stable).
- `server.js` — zero-dep static server pattern (if not using Vite's dev server).
- The DSL parser handling `->` and `[a, b]` is a starting point for the structure file.

What to **discard / redesign:** the current `emitFrom` fans a particle down *every* outgoing edge at once — this models topology, not behavior, and is the core flaw. Replace it with the **flow interpreter** (§5) driven by the separate flow file.

## 10. Open decisions for the build session

- **DSL syntax:** custom DSL (shown above) vs YAML vs TypeScript-as-config. Custom reads best; YAML is easiest to parse.
- **Icon set + licensing** (§4) — gate before building catalog.
- **One flow file with many flows**, or one file per flow.
- **Where layout/positions live** — annotations in structure file, or sidecar layout file.
- **How far to push click-to-build** vs pure code-first.
- **Catalog breadth at launch** — how many AWS/Azure types for v1.
- **Branch semantics** — manual pick, labeled, or probabilistic (for "traffic mix" / load scenarios).

---

### How to start the fresh session
Point the new session at this file. The project background (positioning, competitive analysis, prior decisions) is also saved in Claude memory under `project-system-design-maker`. Start with §8 step 1.
