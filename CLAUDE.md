# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server (served at "/")
npm test         # Vitest, whole suite (run, not watch)
npm run test:watch
npm run build    # tsc --noEmit && vite build  -> dist/
npm run preview  # serve the production build locally
```

Run a single test file / test:
```bash
npx vitest run src/engine/interpreter.test.ts
npx vitest run src/dsl/flow.test.ts -t "captures a label"
```

## What this app is

A diagram-as-code tool: a **structure** DSL renders a React Flow diagram, and a **flow** DSL
compiles into timed particles that animate a single request along the edges. Static SPA, **no
backend** — projects persist in the browser (IndexedDB) and share via a URL hash. Deployed to
GitHub Pages.

## Architecture (the big picture)

Data flows one direction through four layers that meet at a single Zustand store:

1. **Pure core — `src/dsl/` + `src/engine/` (DOM-free, fully unit-tested).** This is where the real
   logic lives and where new behavior should be added test-first.
   - `dsl/structure.ts` `parseStructure` — text → `{nodes,edges,errors}`; supports `a -> b`,
     fan-out `a -> [b,c]`, chaining, `id : type` annotations, `#`/`//` comments.
   - `dsl/serialize.ts` `serializeStructure` — the reverse; **round-trips** through `parseStructure`.
   - `dsl/flow.ts` `parseFlow` — text → ordered `FlowStep[]`. **Line order = time order.** Verbs
     `->` (call), `<->` (roundtrip), `~>` (async), plus `(label)`.
   - `dsl/validate.ts` — every flow hop must be a real structure edge, else a line-numbered error
     (the teaching signal).
   - `engine/layout.ts` `layeredPositions` — Kahn + longest-path auto-layout.
   - `engine/interpreter.ts` `compileFlow(steps, durationFor)` — **the heartbeat.** Walks steps
     advancing a clock: `call` advances, `roundtrip` emits out+back and advances by both legs,
     `async` emits without advancing. Output is timed `ParticleEvent[]`.
   - `engine/typeInference.ts` — name → one of 6 `NodeType` categories + color.
2. **Store — `src/store.ts` (Zustand, single source of truth).** Holds the two texts, parsed
   results, positions, selection, validation, and playback state. `createAppStore()` is exported
   for tests; `appStore`/`useAppStore` are the app singletons.
3. **Canvas — `src/canvas/` + `src/engine/Particles.tsx`.** React Flow draws nodes/edges; the
   particle overlay is a separate SVG layer inside React Flow's `ViewportPortal`.
4. **Chrome — `src/App.tsx`, `src/editor/`, `src/components/`.** Sidebar (tabbed editors, project
   Select, transport), shadcn/ui primitives, ⌘K command palette, rename dialog, toasts.

Persistence: `src/projects/storage.ts` (idb-keyval). Sharing: `src/share/url.ts` (URL hash).
Icons: `src/catalog.ts` maps branded names → vendored devicon SVGs in `public/icons/`, with a
Lucide glyph fallback per category.

## Invariants — break these and things subtly fail

- **React Flow node objects must keep their `measured` dimensions.** React Flow renders an
  unmeasured node as `visibility:hidden`. `Canvas.tsx` therefore owns nodes via
  `useNodesState`/`useEdgesState` and syncs the store in through effects *preserving* `measured`.
  Do not go back to deriving fresh node objects from the store every render — that blanks the canvas.
- **No DSL ⇄ canvas feedback loop.** Editing text calls `setStructureText` (reparses). Canvas
  mutations call `applyModel` which sets `structure` + regenerates `structureText` directly — it must
  not route back through `setStructureText`.
- **Edge identity is always `edgeKey(from,to)` (`` `${from}->${to}` ``).** Used by validate,
  interpreter, canvas edge ids, and the particle path map. Never hand-build edge ids.
- **Particle geometry constants must match the node size.** `Particles.tsx` `NODE_W/NODE_H` are used
  to compute edge endpoints; keep them equal to the `.sysnode` width/height in `app.css`.
- **Never emit compiled JS into `src/`.** Type-check is `tsc --noEmit` (not `tsc -b`); `src/**/*.js`
  is gitignored. Stray `.js` next to sources makes Vitest run suites twice.

## Styling

Two systems coexist by design: **Tailwind + shadcn/ui** for the chrome (tokens in `src/index.css`,
dark-only HSL vars matched to the palette, `@/` alias → `src/`), and **plain CSS in `src/app.css`**
for the canvas/node/editor/particle visuals. shadcn components live in `src/components/ui/`.

## Deploy

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`: install → test → build → publish)
deploys to GitHub Pages. Vite `base` is `/system-design-maker/` for the project-page subpath
(in `vite.config.ts`); icons are referenced via `import.meta.env.BASE_URL` so they resolve there.
