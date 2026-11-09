# CopánQuest

Web 3D exploration game: Honduran kids walk around the Maya city of Copán as it looked around 800 AD. Spanish first, English second. Must run in mobile browsers (low-end Android) and on desktop.

## Commands

- `npm run dev` — dev server (port 5180 in `.claude/launch.json`)
- `npm run build` — typecheck + production build (`dist/`)
- `npm run typecheck`
- `npm run heightmap` — regenerate `public/terrain/` from the Copernicus DEM
- `npm run icons` — regenerate PWA icons

Node 24 (matches Cloudflare Workers Builds; `.nvmrc` / `.node-version` / `engines`). On this Mac it is
installed keg-only by Homebrew: prefix commands with `PATH="/opt/homebrew/opt/node@24/bin:$PATH"`
(the default `node` is still 22.11). Vite 8 + @vitejs/plugin-react 6. npm 11 install scripts are
allow-listed in package.json (`allowScripts`: esbuild, workerd, fsevents).

Cloudflare: `cloudflare.config.ts` (Worker `copanquest`, domain copanquest.todosenlaweb.com, SPA
fallback) + `wrangler.config.ts` (assets = `dist/`). Not deployed; no Worker/trigger yet. When
connecting Workers Builds, the build command must build the app first: `npm run build && npx cf build`.

## Layout

- `src/world/` — terrain collider, site colliders, boundary, sky. **Site layout lives in `siteData.ts`** (meters; x = east, z = south, origin = Stela C, y = 0 plaza floor; positions from OpenStreetMap). `buildGreybox.ts` turns it into voxel shapes + colliders.
- `src/voxel/` — block engine: block types, procedural pixel textures, voxel world, greedy mesher with AO (Web Worker), block shader. Visuals are voxels; physics uses the smooth invisible colliders.
- `src/player/` — ecctrl character, input bridge (keyboard + ecctrl joystick store → `setMovement`), collision-aware follow camera, `playerState` (mutable per-frame data, never React state).
- `src/poi/` — point-of-interest data and tracker. **Every fact needs a source.**
- `src/ui/` — HUD, minimap, info card, credits, debug overlay.
- `src/i18n/` — `es.json` (source of truth) and `en.json`.

## Rules

- Content must be factual about the real site. Cite the source for each POI text; mark estimates as estimates.
- Visual meshes and colliders stay separate; each staircase gets one invisible ramp wedge.
- Keep draw calls low: voxel chunks are merged into 64 m regions; check the debug panel (F3) for draw calls / triangles / voxel build time.
- Dev console helpers: `cqTeleport(x, y, z)`, `cqView(yaw, pitch, distance)`.
- Player-facing text: Spanish first, add English at the same time.
- Dev tools: `?debug` in the URL (or `npm run dev`) enables the collider view; `F3` toggles the debug panel; `window.cqTeleport(x, y, z)` in dev.
