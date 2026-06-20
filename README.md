# system-design-maker

Diagram-as-code, but the request actually moves. Define a system in a **structure** file and
how one request behaves in a **flow** file; watch the request animate through the diagram.

## Develop
- `npm install`
- `npm run dev` — local dev server (served at `/`)
- `npm test` — unit tests (Vitest)
- `npm run build` — type-check + static production build to `dist/`

## Architecture
- **No backend.** Pure static SPA: React + Vite + TypeScript, React Flow for the canvas,
  a custom SVG particle overlay for the animated request flow.
- **Storage is client-side.** Projects live in the visitor's browser via **IndexedDB** — the data
  never touches a server. It is per-browser and per-device; clearing browser data clears it.
- **Sharing** is via a URL hash that encodes the two files (no shared database).

## Deploy — GitHub Pages (CI/CD)
This repo auto-deploys to **GitHub Pages** through GitHub Actions on every push to `main`
(`.github/workflows/deploy.yml`: install → test → build → publish `dist/`).

Live: **https://adssib.github.io/system-design-maker/**

Notes:
- The Vite `base` is `/system-design-maker/` for production builds so asset URLs resolve under the
  project-page subpath (see `vite.config.ts`). For a different repo name, a user/org page, or a
  custom domain, change `base` accordingly (`/` for a root domain).
- One-time repo setting: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### Other static hosts
Because the build is just static files, `dist/` also deploys as-is to Netlify, Cloudflare Pages,
or Vercel — set those to serve from the repo root and they need no `base` override.
